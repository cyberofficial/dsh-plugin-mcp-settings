/**
 * The host half's MCP server manager: snapshot, add, and remove.
 *
 * Every mutation is a read-modify-write of one patch file through
 * {@link PatchStore} (the filesystem in production, a Map in tests), performed
 * one at a time so two clicks can never interleave. The composed Loader tree
 * follows from the file: `patchReload: live` makes the HMR watcher recompose
 * the profile when the patch file changes.
 *
 * @module dsh-plugin-mcp-settings/host/servers
 */

import {
  MCP_CLIENT_MODULE,
  rowIdFor,
  validateDraft,
  type McpServerSpec,
  type PatchFileKind,
  type PatchRowInfo,
  type ServerError,
  type ServerErrorCode,
  type ServersMutation,
  type ServersResponse,
  type ServersSnapshot,
  type SpecProblem,
} from '../shared/spec.js'
import {
  appendServerBlock,
  blockBeginMarker,
  blockEndMarker,
  listMcpRows,
  PatchShapeError,
  removeMcpRow,
} from './patch-text.js'

/** Absolute paths of the two patch layers this panel may rewrite. */
export interface PatchFiles {
  /** The profile's own layer, where new servers are written. */
  readonly profile: string
  /** The home layer, rewritten only when it already declares the row. */
  readonly home: string
}

/** Filesystem face the service needs, injected so tests can supply a fake. */
export interface PatchStore {
  /** Read one file, or undefined when it does not exist. */
  read(path: string): Promise<string | undefined>
  /** Replace one file's contents. */
  write(path: string, text: string): Promise<void>
}

/** Live Loader facts that make a new row's identity safe. */
export interface LiveRows {
  /** Patch row id every live entry declares. */
  readonly ids: readonly string[]
  /** `serverName` every live `mcp-client` entry reserves. */
  readonly serverNames: readonly string[]
}

/** An expected refusal, carried to the browser as a structured error. */
export class ServersFault extends Error {
  constructor(
    readonly code: ServerErrorCode,
    readonly problems?: readonly SpecProblem[],
    readonly detail?: string,
  ) {
    super(detail ?? code)
    this.name = 'ServersFault'
  }
}

/** The HTTP status one refusal is reported with. */
export function statusOf(code: ServerErrorCode): number {
  switch (code) {
    case 'invalid-spec':
    case 'bad-request': return 400
    case 'not-found': return 404
    case 'duplicate-id':
    case 'duplicate-name':
    case 'ambiguous':
    case 'unsupported': return 409
    case 'no-profile': return 503
    case 'io-error': return 500
  }
}

/** Options one service instance is built from. */
export interface ServersServiceOptions {
  /** The layers to edit; undefined when no dsh profile could be located. */
  readonly files?: PatchFiles
  readonly store: PatchStore
  /** Live Loader rows, read fresh for every mutation. */
  readonly live: () => LiveRows
  /** Whether the running profile applies a patch write without a restart. */
  readonly hotReload?: () => boolean
}

/** What the host half exposes to the browser over one exact fetch route. */
export interface ServersService {
  /** Answer one request on the plugin's own `/api` route. */
  request(request: Request): Promise<Response>
}

/** Render one YAML scalar, single-quoted unless plainly safe. */
function scalar(value: string): string {
  const plain = /^[A-Za-z0-9_][A-Za-z0-9_./\\-]*$/.test(value)
  const reserved = /^(?:true|false|null|yes|no|on|off|y|n|~)$/i.test(value) || /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)
  if (value !== '' && plain && !reserved) return value
  return `'${value.replace(/'/g, "''")}'`
}

/** One `key: value` line at the given indent. */
function entry(indent: number, key: string, value: string): string {
  return `${' '.repeat(indent)}${key}: ${scalar(value)}`
}

/** The canonical, marker-delimited `insert` block for one server. */
export function renderServerBlock(spec: McpServerSpec): string {
  const id = rowIdFor(spec.serverName)
  const lines: string[] = [
    blockBeginMarker(id),
    '# Added by the MCP Servers settings panel. Edit or delete this whole block there.',
    '- insert:',
    `    - id: ${id}`,
    `      name: '${MCP_CLIENT_MODULE}'`,
    '      config:',
    entry(8, 'serverName', spec.serverName),
    entry(8, 'transport', spec.transport),
  ]
  if (spec.transport === 'stdio') {
    lines.push(entry(8, 'command', spec.command))
    if (spec.args.length > 0) {
      lines.push('        args:')
      for (const argument of spec.args) lines.push(`          - ${scalar(argument)}`)
    }
    const env = Object.entries(spec.env)
    if (env.length > 0) {
      lines.push('        env:')
      for (const [key, value] of env) lines.push(entry(10, key, value))
    }
    if (spec.cwd !== '') lines.push(entry(8, 'cwd', spec.cwd))
  } else {
    lines.push(entry(8, 'url', spec.url))
    const headers = Object.entries(spec.headers)
    if (headers.length > 0) {
      lines.push('        headers:')
      for (const [key, value] of headers) lines.push(entry(10, key, value))
    }
  }
  const timeout = spec.toolCallTimeoutMs
  if (timeout !== undefined) lines.push(`        toolCallTimeoutMs: ${String(timeout)}`)
  if (spec.failOnStartupError) lines.push('        failOnStartupError: true')
  lines.push(blockEndMarker(id))
  return lines.join('\n')
}

/**
 * Build the host half's manager over one profile.
 * @param options - patch layers, store, and the live-row reader.
 * @returns the service answering the plugin's exact fetch route.
 */
export function createServersService(options: ServersServiceOptions): ServersService {
  const { files, store } = options
  let queue: Promise<unknown> = Promise.resolve()

  /** Run one mutation after every earlier one settled. */
  function exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task)
    queue = run.then(() => undefined, () => undefined)
    return run
  }

  /** Read one layer, mapping a missing file to undefined. */
  async function readLayer(path: string): Promise<string | undefined> {
    try {
      return await store.read(path)
    } catch (error) {
      throw new ServersFault('io-error', undefined, `${path}: ${messageOf(error)}`)
    }
  }

  /** Write one layer, mapping a filesystem failure to a structured refusal. */
  async function writeLayer(path: string, text: string): Promise<void> {
    try {
      await store.write(path, text)
    } catch (error) {
      throw new ServersFault('io-error', undefined, `${path}: ${messageOf(error)}`)
    }
  }

  /** The layers in edit order: the profile's own first, the home layer second. */
  function layers(): { readonly kind: PatchFileKind; readonly path: string }[] {
    if (files === undefined) throw new ServersFault('no-profile')
    return [{ kind: 'profile', path: files.profile }, { kind: 'home', path: files.home }]
  }

  /** Every row id either layer declares, whether inserted or overridden. */
  async function declaredIds(): Promise<Set<string>> {
    const ids = new Set<string>()
    for (const layer of layers()) {
      const text = await readLayer(layer.path)
      if (text === undefined) continue
      for (const row of listMcpRows(text)) ids.add(row.id)
    }
    return ids
  }

  async function snapshot(): Promise<ServersSnapshot> {
    const [profileLayer, homeLayer] = layers()
    const rows: PatchRowInfo[] = []
    for (const layer of [profileLayer, homeLayer]) {
      const text = await readLayer(layer.path)
      if (text === undefined) continue
      for (const row of listMcpRows(text)) rows.push({ id: row.id, file: layer.kind, managed: row.managed })
    }
    return {
      patchPath: profileLayer.path,
      homePatchPath: homeLayer.path,
      live: options.hotReload?.() ?? false,
      rows,
    }
  }

  async function add(server: unknown): Promise<ServersMutation> {
    const result = validateDraft(server)
    if (!result.ok) throw new ServersFault('invalid-spec', result.problems)
    const spec = result.spec
    const id = rowIdFor(spec.serverName)
    const [profileLayer] = layers()
    const existing = await readLayer(profileLayer.path)
    if ((await declaredIds()).has(id)) {
      throw new ServersFault('duplicate-id', undefined, id)
    }
    const live = options.live()
    if (live.ids.includes(id)) throw new ServersFault('duplicate-id', undefined, id)
    if (live.serverNames.includes(spec.serverName)) {
      throw new ServersFault('duplicate-name', undefined, spec.serverName)
    }
    try {
      await writeLayer(profileLayer.path, appendServerBlock(existing, renderServerBlock(spec)))
    } catch (error) {
      if (error instanceof PatchShapeError) throw new ServersFault('unsupported', undefined, error.message)
      throw error
    }
    return { id, file: profileLayer.kind, removed: [] }
  }

  async function remove(id: unknown): Promise<ServersMutation> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new ServersFault('bad-request', undefined, 'expected { "action": "remove", "id": string }')
    }
    const target = id.trim()
    for (const layer of layers()) {
      const text = await readLayer(layer.path)
      if (text === undefined) continue
      const removal = removeMcpRow(text, target)
      if (removal === undefined) continue
      await writeLayer(layer.path, removal.text)
      return { id: target, file: layer.kind, removed: removal.removed }
    }
    throw new ServersFault('not-found', undefined, target)
  }

  /** The refusal body one fault reports. */
  function bodyOf(error: ServersFault): ServerError {
    return {
      code: error.code,
      ...error.problems === undefined ? {} : { problems: error.problems },
      ...error.detail === undefined ? {} : { detail: error.detail },
    }
  }

  /** Fold one operation into the wire answer, keeping unexpected errors visible. */
  async function answer<T>(operation: () => Promise<T>): Promise<Response> {
    try {
      return Response.json({ ok: true, value: await operation() } satisfies ServersResponse<T>)
    } catch (error) {
      if (error instanceof ServersFault) {
        return Response.json({ ok: false, error: bodyOf(error) } satisfies ServersResponse<never>, { status: statusOf(error.code) })
      }
      const detail = messageOf(error)
      return Response.json(
        { ok: false, error: { code: 'io-error', detail } } satisfies ServersResponse<never>,
        { status: statusOf('io-error') },
      )
    }
  }

  return {
    async request(request: Request): Promise<Response> {
      if (request.method === 'GET') return answer(snapshot)
      if (request.method !== 'POST') {
        return Response.json(
          { ok: false, error: { code: 'bad-request', detail: `${request.method} is not supported` } } satisfies ServersResponse<never>,
          { status: statusOf('bad-request') },
        )
      }
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return answer(() => { throw new ServersFault('bad-request', undefined, 'the request body must be JSON') })
      }
      const action = typeof body === 'object' && body !== null ? (body as { action?: unknown }).action : undefined
      if (action === 'add') return answer(() => exclusive(() => add((body as { server?: unknown }).server)))
      if (action === 'remove') return answer(() => exclusive(() => remove((body as { id?: unknown }).id)))
      return answer(() => { throw new ServersFault('bad-request', undefined, 'expected { "action": "add" | "remove" }') })
    },
  }
}

/** Exact diagnostic of anything thrown. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
