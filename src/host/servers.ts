/**
 * The host half's MCP server manager: snapshot, inspect, add, edit, and remove.
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
  draftOfConfig,
  emptyDraft,
  MCP_CLIENT_MODULE,
  rowIdFor,
  validateDraft,
  type EditableServer,
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
  appendDisabledOverride,
  appendServerBlock,
  blockBeginMarker,
  blockEndMarker,
  findMcpRow,
  listMcpRows,
  PatchShapeError,
  removeMcpRow,
  rewriteMcpRow,
  yamlScalar,
  type McpRowLocation,
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

/** Live Loader facts that make a row's identity safe and its config editable. */
export interface LiveRows {
  /** Patch row id every live entry declares. */
  readonly ids: readonly string[]
  /** `serverName` per live `mcp-client` row id, for duplicate detection and renames. */
  readonly serverNames: ReadonlyMap<string, string>
  /** Resolved `config` per live `mcp-client` row id, for the edit form. */
  readonly configs: ReadonlyMap<string, unknown>
  /**
   * Row ids whose entry's fiber is currently failed.
   *
   * The Loader does not drop a failed child when its patch row disappears, so a
   * removal has to dispose such an entry first; see {@link appendDisabledOverride}.
   */
  readonly failed: ReadonlySet<string>
}

/** How long a removal waits for a switched-off entry to actually dispose. */
const DISPOSE_BUDGET_MS = 8_000

/** How often that wait re-reads the Loader. */
const DISPOSE_POLL_MS = 200

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

/** One `key: value` line at the given indent. */
function entry(indent: number, key: string, value: string): string {
  return `${' '.repeat(indent)}${key}: ${yamlScalar(value)}`
}

/** The `config:` mapping of one server, as lines indented from the given base. */
function configLines(spec: McpServerSpec, indent: number): string[] {
  const pad = ' '.repeat(indent)
  const lines: string[] = [
    entry(indent, 'serverName', spec.serverName),
    entry(indent, 'transport', spec.transport),
  ]
  if (spec.transport === 'stdio') {
    lines.push(entry(indent, 'command', spec.command))
    if (spec.args.length > 0) {
      lines.push(`${pad}args:`)
      for (const argument of spec.args) lines.push(`${' '.repeat(indent + 2)}- ${yamlScalar(argument)}`)
    }
    const env = Object.entries(spec.env)
    if (env.length > 0) {
      lines.push(`${pad}env:`)
      for (const [key, value] of env) lines.push(entry(indent + 2, key, value))
    }
    if (spec.cwd !== '') lines.push(entry(indent, 'cwd', spec.cwd))
  } else {
    lines.push(entry(indent, 'url', spec.url))
    const headers = Object.entries(spec.headers)
    if (headers.length > 0) {
      lines.push(`${pad}headers:`)
      for (const [key, value] of headers) lines.push(entry(indent + 2, key, value))
    }
  }
  const timeout = spec.toolCallTimeoutMs
  if (timeout !== undefined) lines.push(`${pad}toolCallTimeoutMs: ${String(timeout)}`)
  if (spec.failOnStartupError) lines.push(`${pad}failOnStartupError: true`)
  return lines
}

/** The `config:` body of one server at zero base indent, for an in-place row rewrite. */
export function configBodyLines(spec: McpServerSpec): string[] {
  return configLines(spec, 0)
}

/** The canonical, marker-delimited `insert` block for one server. */
export function renderServerBlock(spec: McpServerSpec): string {
  const id = rowIdFor(spec.serverName)
  return [
    blockBeginMarker(id),
    '# Added by the MCP Servers settings panel. Edit or delete this whole block there.',
    '- insert:',
    `    - id: ${id}`,
    `      name: '${MCP_CLIENT_MODULE}'`,
    '      config:',
    ...configLines(spec, 8),
    blockEndMarker(id),
  ].join('\n')
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

  /** Find the layer that declares one row, with its location and `!!js` usage. */
  async function locate(id: string): Promise<{
    readonly layer: { readonly kind: PatchFileKind; readonly path: string }
    readonly text: string
    readonly location: McpRowLocation
    readonly jsExpression: boolean
  } | undefined> {
    for (const layer of layers()) {
      const text = await readLayer(layer.path)
      if (text === undefined) continue
      const location = findMcpRow(text, id)
      if (location === undefined) continue
      const span = location.block ?? location.item
      const lines = text.split(/\r?\n/)
      return {
        layer,
        text,
        location,
        // A `!!js` value would be written back as its interpolated result, so
        // such a row is reported as uneditable from here.
        jsExpression: lines.slice(span.start, span.end + 1).some(line => line.includes('!!js')),
      }
    }
    return undefined
  }

  /** Read one row id from the request body. */
  function requireId(id: unknown, action: 'remove' | 'edit' | 'inspect'): string {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new ServersFault('bad-request', undefined, `expected { "action": "${action}", "id": string }`)
    }
    return id.trim()
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

  /** Read the values the edit form opens with, from the running entry. */
  async function inspect(rawId: unknown): Promise<EditableServer> {
    const id = requireId(rawId, 'inspect')
    const found = await locate(id)
    if (found === undefined) throw new ServersFault('not-found', undefined, id)
    const base = { id, file: found.layer.kind, managed: found.location.block !== undefined }
    if (found.jsExpression) return { ...base, draft: emptyDraft(), blocked: 'js-expression' }
    const draft = draftOfConfig(options.live().configs.get(id))
    if (draft === undefined) return { ...base, draft: emptyDraft(), blocked: 'unknown-config' }
    return { ...base, draft }
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
    if ([...live.serverNames.values()].includes(spec.serverName)) {
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

  /** Rewrite one server row in place, renaming it when the name changed. */
  async function edit(rawId: unknown, server: unknown): Promise<ServersMutation> {
    const id = requireId(rawId, 'edit')
    const result = validateDraft(server)
    if (!result.ok) throw new ServersFault('invalid-spec', result.problems)
    const spec = result.spec
    const newId = rowIdFor(spec.serverName)
    const found = await locate(id)
    if (found === undefined) throw new ServersFault('not-found', undefined, id)
    if (found.jsExpression) throw new ServersFault('unsupported', undefined, 'js-expression')
    if (found.location.block === undefined && found.location.config === undefined) {
      throw new ServersFault('unsupported', undefined, 'no-config')
    }

    const live = options.live()
    if (newId !== id) {
      if ((await declaredIds()).has(newId)) throw new ServersFault('duplicate-id', undefined, newId)
      if (live.ids.includes(newId)) throw new ServersFault('duplicate-id', undefined, newId)
    }
    // The row being edited keeps its own name; every other live row must not use the new one.
    for (const [rowId, name] of live.serverNames) {
      if (rowId !== id && name === spec.serverName) {
        throw new ServersFault('duplicate-name', undefined, spec.serverName)
      }
    }

    const rewritten = rewriteMcpRow(found.text, id, {
      id: newId,
      block: renderServerBlock(spec),
      configBody: configBodyLines(spec),
    })
    if (rewritten === undefined) throw new ServersFault('not-found', undefined, id)
    await writeLayer(found.layer.path, rewritten)
    return { id: newId, file: found.layer.kind, removed: [] }
  }

  /**
   * Wait for a switched-off entry to leave the `failed` state.
   *
   * The wait is best-effort and bounded: a removal that cannot confirm disposal
   * still proceeds, because leaving the row in place would be worse than a
   * leftover the panel can explain.
   */
  async function waitForDisposal(id: string): Promise<boolean> {
    const deadline = Date.now() + DISPOSE_BUDGET_MS
    while (Date.now() < deadline) {
      if (!options.live().failed.has(id)) return true
      await delay(DISPOSE_POLL_MS)
    }
    return !options.live().failed.has(id)
  }

  async function remove(rawId: unknown): Promise<ServersMutation> {
    const target = requireId(rawId, 'remove')
    for (const layer of layers()) {
      const text = await readLayer(layer.path)
      if (text === undefined) continue
      if (findMcpRow(text, target) === undefined && removeMcpRow(text, target) === undefined) continue

      // A failed entry is not dropped when its row disappears, so switch it off
      // first (which disposes its fiber) and only then cut the row.
      if (options.live().failed.has(target)) {
        await writeLayer(layer.path, appendDisabledOverride(text, target))
        await waitForDisposal(target)
      }

      const current = await readLayer(layer.path) ?? text
      const removal = removeMcpRow(current, target)
      if (removal === undefined) {
        /* v8 ignore next -- the row was just located in this same file */
        continue
      }
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
      if (action === 'edit') {
        const request = body as { id?: unknown; server?: unknown }
        return answer(() => exclusive(() => edit(request.id, request.server)))
      }
      if (action === 'remove') return answer(() => exclusive(() => remove((body as { id?: unknown }).id)))
      if (action === 'inspect') return answer(() => inspect((body as { id?: unknown }).id))
      return answer(() => { throw new ServersFault('bad-request', undefined, 'expected { "action": "add" | "edit" | "remove" | "inspect" }') })
    },
  }
}

/** Exact diagnostic of anything thrown. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Wait one interval, for the disposal poll. */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, ms) })
}
