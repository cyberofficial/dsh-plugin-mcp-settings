/**
 * Wire contract shared by the host half and the browser half of the MCP
 * Servers section.
 *
 * The Add dialog collects one flat *draft* (every field a string, exactly as
 * typed); this module validates that draft, normalizes it into the config
 * `@deepseek-ai/dsh-mcp-client` accepts, and derives the Loader row id. Both
 * halves call {@link validateDraft}, so the browser refuses a bad form before
 * sending it and the host still refuses anything that arrives another way.
 *
 * @module dsh-plugin-mcp-settings/shared/spec
 */

/** Exact fetch route the host half registers on the shared `/api` channel. */
export const SERVERS_PATH = '/api/plugins/mcp-settings/servers'

/** Loader module every row this panel writes names. */
export const MCP_CLIENT_MODULE = '@deepseek-ai/dsh-mcp-client'

/** Prefix of every Loader row id this panel writes. */
export const ROW_ID_PREFIX = 'mcp-'

/** `serverName` budget `@deepseek-ai/dsh-mcp-client` itself enforces. */
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/** Highest per-call timeout worth storing (2^31 - 1 ms, Node's timer ceiling). */
export const MAX_TOOL_CALL_TIMEOUT_MS = 2_147_483_647

/** Environment variable names `mcp-client` configs may carry. */
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/** HTTP header field names (RFC 7230 tokens). */
const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/

/** Characters no stored scalar may contain: YAML indentation and diagnostics stay readable. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/** Which transport one server uses. */
export type McpTransport = 'stdio' | 'streamable-http'

/** The patch file a row lives in: the profile's own layer, or the home layer. */
export type PatchFileKind = 'profile' | 'home'

/** One `KEY=VALUE` (environment) or `Name: value` (header) textarea line. */
export interface McpTextLine {
  readonly key: string
  readonly value: string
  /** One-based line number in the textarea, for messages. */
  readonly line: number
}

/** The Add dialog's flat state, and the shape the host validates. */
export interface McpServerDraft {
  readonly serverName: string
  readonly transport: McpTransport
  readonly command: string
  /** One argument per line. */
  readonly argsText: string
  /** One `KEY=VALUE` per line; blank and `#` lines are ignored. */
  readonly envText: string
  readonly cwd: string
  readonly url: string
  /** One `Name: value` per line; blank and `#` lines are ignored. */
  readonly headersText: string
  /** Whole milliseconds; empty uses the `mcp-client` default. */
  readonly toolCallTimeoutMs: string
  readonly failOnStartupError: boolean
}

/** A validated stdio server, ready to render as a Loader row. */
export interface McpStdioSpec {
  readonly transport: 'stdio'
  readonly serverName: string
  readonly command: string
  readonly args: readonly string[]
  readonly env: Readonly<Record<string, string>>
  readonly cwd: string
  readonly toolCallTimeoutMs?: number
  readonly failOnStartupError: boolean
}

/** A validated Streamable HTTP server, ready to render as a Loader row. */
export interface McpStreamableHttpSpec {
  readonly transport: 'streamable-http'
  readonly serverName: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly toolCallTimeoutMs?: number
  readonly failOnStartupError: boolean
}

/** One validated server configuration. */
export type McpServerSpec = McpStdioSpec | McpStreamableHttpSpec

/** The draft field a problem belongs to. */
export type SpecField =
  | 'serverName' | 'transport' | 'command' | 'args' | 'env' | 'cwd' | 'url' | 'headers' | 'toolCallTimeoutMs'

/** Why a draft was refused. */
export type SpecProblemReason =
  | 'required'
  | 'pattern'
  | 'invalid'
  | 'control'
  | 'env-line'
  | 'header-line'
  | 'timeout'

/** One refusal, with the field that owns it and (for text blocks) the line. */
export interface SpecProblem {
  readonly field: SpecField
  readonly reason: SpecProblemReason
  readonly line?: number
}

/** Validation outcome: the normalized spec, or every problem found. */
export type SpecResult =
  | { readonly ok: true; readonly spec: McpServerSpec }
  | { readonly ok: false; readonly problems: readonly SpecProblem[] }

/** The Loader row id one server name owns. */
export function rowIdFor(serverName: string): string {
  return `${ROW_ID_PREFIX}${serverName}`
}

/** Read a draft field as a trimmed string (empty for anything not a string). */
function field(draft: Record<string, unknown>, name: string): string {
  const value = draft[name]
  return typeof value === 'string' ? value.trim() : ''
}

/** Split a textarea value into trimmed, non-blank, non-comment lines. */
function textLines(text: string): { readonly line: number; readonly text: string }[] {
  const lines: { line: number; text: string }[] = []
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const value = raw.trim()
    if (value === '' || value.startsWith('#')) continue
    lines.push({ line: index + 1, text: value })
  }
  return lines
}

/**
 * Parse `KEY=VALUE` lines (environment) or `Name: value` lines (headers).
 * @param text - the textarea value.
 * @param separator - the character splitting each line.
 * @param kind - which pattern the key must satisfy.
 * @returns the parsed pairs and the lines that did not fit.
 */
export function parseKeyValueLines(
  text: string,
  separator: '=' | ':',
  kind: 'env' | 'header',
): { readonly entries: readonly McpTextLine[]; readonly problems: readonly SpecProblem[] } {
  const pattern = kind === 'env' ? ENV_KEY_PATTERN : HEADER_NAME_PATTERN
  const reason: SpecProblemReason = kind === 'env' ? 'env-line' : 'header-line'
  const seen = new Set<string>()
  const entries: McpTextLine[] = []
  const problems: SpecProblem[] = []
  for (const { line, text: value } of textLines(text)) {
    const at = value.indexOf(separator)
    const key = at === -1 ? '' : value.slice(0, at).trim()
    const rest = at === -1 ? '' : value.slice(at + 1).trim()
    if (key === '' || !pattern.test(key) || seen.has(key)) {
      problems.push({ field: kind === 'env' ? 'env' : 'headers', reason, line })
      continue
    }
    if (CONTROL_CHARACTERS.test(rest)) {
      problems.push({ field: kind === 'env' ? 'env' : 'headers', reason: 'control', line })
      continue
    }
    seen.add(key)
    entries.push({ key, value: rest, line })
  }
  return { entries, problems }
}

/** Parse the one-argument-per-line textarea. */
function parseArguments(text: string): { readonly args: readonly string[]; readonly problems: readonly SpecProblem[] } {
  const args: string[] = []
  const problems: SpecProblem[] = []
  for (const { line, text: value } of textLines(text)) {
    if (CONTROL_CHARACTERS.test(value)) {
      problems.push({ field: 'args', reason: 'control', line })
      continue
    }
    args.push(value)
  }
  return { args, problems }
}

/** Read the optional per-call timeout. */
function parseTimeout(
  value: string,
): { readonly timeout?: number; readonly problems: readonly SpecProblem[] } {
  if (value === '') return { problems: [] }
  if (!/^[0-9]+$/.test(value) || Number(value) < 1 || Number(value) > MAX_TOOL_CALL_TIMEOUT_MS) {
    return { problems: [{ field: 'toolCallTimeoutMs', reason: 'timeout' }] }
  }
  return { timeout: Number(value), problems: [] }
}

/**
 * Validate one Add-dialog draft and normalize it into a `mcp-client` config.
 * @param input - the untrusted draft (form state on the browser, JSON body on the host).
 * @returns the normalized spec, or every problem the draft has.
 */
export function validateDraft(input: unknown): SpecResult {
  const draft = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const problems: SpecProblem[] = []

  const serverName = field(draft, 'serverName')
  if (serverName === '') problems.push({ field: 'serverName', reason: 'required' })
  else if (!SERVER_NAME_PATTERN.test(serverName)) problems.push({ field: 'serverName', reason: 'pattern' })

  const transport = draft.transport === 'streamable-http' ? 'streamable-http'
    : draft.transport === 'stdio' ? 'stdio' : undefined
  if (transport === undefined) problems.push({ field: 'transport', reason: 'invalid' })

  const timeout = parseTimeout(field(draft, 'toolCallTimeoutMs'))
  problems.push(...timeout.problems)

  const failOnStartupError = draft.failOnStartupError === true

  // Both transports share the name and the timeout; only the transport-specific
  // fields differ, and only the selected transport's fields are read.
  if (transport === 'stdio') {
    const command = field(draft, 'command')
    if (command === '') problems.push({ field: 'command', reason: 'required' })
    else if (CONTROL_CHARACTERS.test(command)) problems.push({ field: 'command', reason: 'control' })
    const cwd = field(draft, 'cwd')
    if (CONTROL_CHARACTERS.test(cwd)) problems.push({ field: 'cwd', reason: 'control' })
    const args = parseArguments(typeof draft.argsText === 'string' ? draft.argsText : '')
    problems.push(...args.problems)
    const env = parseKeyValueLines(typeof draft.envText === 'string' ? draft.envText : '', '=', 'env')
    problems.push(...env.problems)
    if (problems.length > 0) return { ok: false, problems }
    return {
      ok: true,
      spec: {
        transport: 'stdio',
        serverName,
        command,
        args: args.args,
        env: Object.fromEntries(env.entries.map(entry => [entry.key, entry.value])),
        cwd,
        ...timeout.timeout === undefined ? {} : { toolCallTimeoutMs: timeout.timeout },
        failOnStartupError,
      },
    }
  }

  if (transport === 'streamable-http') {
    const url = field(draft, 'url')
    if (url === '') problems.push({ field: 'url', reason: 'required' })
    else if (CONTROL_CHARACTERS.test(url) || !isHttpUrl(url)) problems.push({ field: 'url', reason: 'invalid' })
    const headers = parseKeyValueLines(typeof draft.headersText === 'string' ? draft.headersText : '', ':', 'header')
    problems.push(...headers.problems)
    if (problems.length > 0) return { ok: false, problems }
    return {
      ok: true,
      spec: {
        transport: 'streamable-http',
        serverName,
        url,
        headers: Object.fromEntries(headers.entries.map(entry => [entry.key, entry.value])),
        ...timeout.timeout === undefined ? {} : { toolCallTimeoutMs: timeout.timeout },
        failOnStartupError,
      },
    }
  }

  return { ok: false, problems }
}

/** Whether a value parses as an absolute http(s) URL. */
export function isHttpUrl(value: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

// ---------------------------------------------------------------------------
// Fetch-route vocabulary
// ---------------------------------------------------------------------------

/** HTTP status the host reports each refusal with. */
export type ServerErrorCode =
  /** The Loader row id is already declared somewhere in the profile's layers. */
  | 'duplicate-id'
  /** Another live row already reserves this `serverName`. */
  | 'duplicate-name'
  /** No patch-file row carries the requested id. */
  | 'not-found'
  /** More than one patch-file row carries the requested id. */
  | 'ambiguous'
  /** The row exists, but not in a layer this panel may rewrite. */
  | 'unsupported'
  /** The submitted draft failed validation. */
  | 'invalid-spec'
  /** The request body was not one of this route's actions. */
  | 'bad-request'
  /** No dsh profile could be located, so there is nothing to edit. */
  | 'no-profile'
  /** Reading or writing a patch file failed. */
  | 'io-error'

/** Structured refusal body. */
export interface ServerError {
  readonly code: ServerErrorCode
  /** Present when the refusal came from validation. */
  readonly problems?: readonly SpecProblem[]
  /** Free-form host detail (a filesystem message, an id, a conflict name). */
  readonly detail?: string
}

/** One patch-file row that names the `mcp-client` module. */
export interface PatchRowInfo {
  readonly id: string
  readonly file: PatchFileKind
  /** True when the row sits between this panel's own marker comments. */
  readonly managed: boolean
}

/** What the browser reads before rendering the section's management affordances. */
export interface ServersSnapshot {
  /** Absolute path of the profile's own patch layer. */
  readonly patchPath: string
  /** Absolute path of the home patch layer, edited only when it already holds the row. */
  readonly homePatchPath: string
  /**
   * Whether the running profile applies a patch write without a restart. False
   * means the harness has no patch watcher, so a change made here is persisted
   * but only composes on the next launch.
   */
  readonly live: boolean
  readonly rows: readonly PatchRowInfo[]
}

/** What one successful mutation reports. */
export interface ServersMutation {
  /** The row id after the operation: an edit that renames the server reports the new one. */
  readonly id: string
  readonly file: PatchFileKind
  /** What the operation removed: the row, its enablement override, or both. */
  readonly removed: readonly ('row' | 'override')[]
}

/** Why this panel cannot rewrite one row in place. */
export type EditBlock =
  /** The row's lines carry `!!js` expressions a form would flatten into values. */
  | 'js-expression'
  /** The live entry exposes no config this form can round-trip. */
  | 'unknown-config'

/** What the edit form opens with, read on demand so secrets stay out of the list. */
export interface EditableServer {
  readonly id: string
  readonly file: PatchFileKind
  /** True when this panel's own marker block wraps the row. */
  readonly managed: boolean
  /** The configuration the form opens with; empty while {@link EditableServer.blocked} is set. */
  readonly draft: McpServerDraft
  /** Set when the row cannot be rewritten from here; the form refuses to save. */
  readonly blocked?: EditBlock
}

/** Wire answer of every request on {@link SERVERS_PATH}. */
export type ServersResponse<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ServerError }

/** Request body of `POST` on {@link SERVERS_PATH}. */
export type ServersRequest =
  | { readonly action: 'add'; readonly server: unknown }
  | { readonly action: 'edit'; readonly id: unknown; readonly server: unknown }
  | { readonly action: 'remove'; readonly id: unknown }
  | { readonly action: 'inspect'; readonly id: unknown }

/** An empty draft, for the Add dialog's initial state. */
export function emptyDraft(): McpServerDraft {
  return {
    serverName: '',
    transport: 'stdio',
    command: '',
    argsText: '',
    envText: '',
    cwd: '',
    url: '',
    headersText: '',
    toolCallTimeoutMs: '',
    failOnStartupError: false,
  }
}

/** Render one string record as a textarea body. */
function recordLines(record: Readonly<Record<string, string>>, separator: '=' | ':'): string {
  return Object.entries(record)
    .map(([key, value]) => (separator === '=' ? `${key}=${value}` : `${key}: ${value}`))
    .join('\n')
}

/** A string record, or undefined when the value is not one this form can round-trip. */
function recordOf(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  const record: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== 'string' || CONTROL_CHARACTERS.test(entry) || CONTROL_CHARACTERS.test(key)) return undefined
    record[key] = entry
  }
  return record
}

/**
 * Turn one resolved `mcp-client` config back into the dialog's flat draft.
 *
 * The host reads this from the live Loader entry rather than from the patch
 * file: the loader has already interpolated `!!js` expressions and applied the
 * schema's defaults, so the form opens on the values the running server uses.
 * (A row whose *file text* carries `!!js` is refused before this is called,
 * because writing the interpolated value back would flatten the expression.)
 *
 * @param config - the entry's resolved `config`, of unknown shape.
 * @returns the draft, or undefined when the shape is not one this form can edit.
 */
export function draftOfConfig(config: unknown): McpServerDraft | undefined {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) return undefined
  const value = config as Record<string, unknown>
  const serverName = typeof value.serverName === 'string' ? value.serverName : undefined
  if (serverName === undefined) return undefined
  const transport = value.transport === 'streamable-http' ? 'streamable-http'
    : value.transport === 'stdio' ? 'stdio' : undefined
  if (transport === undefined) return undefined
  const timeout = typeof value.toolCallTimeoutMs === 'number' && Number.isSafeInteger(value.toolCallTimeoutMs)
    ? String(value.toolCallTimeoutMs)
    : ''
  const base = {
    serverName,
    transport,
    toolCallTimeoutMs: timeout,
    failOnStartupError: value.failOnStartupError === true,
  } as const

  if (transport === 'stdio') {
    const command = value.command
    if (typeof command !== 'string' || CONTROL_CHARACTERS.test(command)) return undefined
    const args = value.args === undefined
      ? []
      : Array.isArray(value.args)
        && value.args.every(argument => typeof argument === 'string' && !CONTROL_CHARACTERS.test(argument))
        ? value.args as string[]
        : undefined
    if (args === undefined) return undefined
    const env = recordOf(value.env)
    if (env === undefined) return undefined
    return {
      ...base,
      command,
      argsText: args.join('\n'),
      envText: recordLines(env, '='),
      cwd: typeof value.cwd === 'string' && !CONTROL_CHARACTERS.test(value.cwd) ? value.cwd : '',
      url: '',
      headersText: '',
    }
  }

  const url = typeof value.url === 'string' ? value.url : undefined
  if (url === undefined) return undefined
  const headers = recordOf(value.headers)
  if (headers === undefined) return undefined
  return {
    ...base,
    command: '',
    argsText: '',
    envText: '',
    cwd: '',
    url,
    headersText: recordLines(headers, ':'),
  }
}
