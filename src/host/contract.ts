/**
 * The two host-side contract surfaces the MCP Servers host half uses, declared
 * structurally.
 *
 * The host half deliberately imports no `@deepseek-ai/*` types: cordis is
 * resolved by the running harness, not by this package's own dependency tree,
 * and the plugin is built (and linked) without it. Declaring the small surface
 * that matters keeps the host build self-contained while still naming exactly
 * what this plugin expects from its context.
 *
 * @module dsh-plugin-mcp-settings/host/contract
 */

/** The logger face cordis exposes on every context. */
export interface HostLogger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
}

/**
 * The Context members this host half reads.
 *
 * `inject` waits for a service and runs the callback on a context that declares
 * it — the pattern for a service (`connection`) contributed by a later bundle
 * layer. `get` reads a service without the inject requirement.
 */
export interface HostContext {
  readonly logger: HostLogger
  /** Run `callback` once every named service is available, scoped to this plugin's fiber. */
  inject(names: readonly string[], callback: (ctx: HostContext) => void): unknown
  /** Read a service by name, or undefined when nothing provides it. */
  get(name: string): unknown
}

/** One exact Fetch route on the shared `/api` channel. */
export interface ConnectionFetchRoute {
  /** Absolute path below `/api`; query parameters stay available on the request URL. */
  readonly path: string
  /** Methods this route owns; only `GET`, `HEAD`, and `POST` may be claimed. */
  readonly methods: readonly ('GET' | 'HEAD' | 'POST')[]
  /** How the transport presents the request body to {@link ConnectionFetchRoute.fetch}. */
  readonly requestBody: 'buffered' | 'streaming'
  /** Handle one request after the carrier applied its trust and authentication policy. */
  readonly fetch: (request: Request) => Promise<Response>
}

/** The `connection` service face this plugin registers routes on. */
export interface ConnectionService {
  readonly fetch: {
    /** Register one exact route; the returned disposer removes it. */
    register(route: ConnectionFetchRoute): unknown
  }
}

/** Profile locations the launcher provides; absent outside a profile launch. */
export interface ProfileLocation {
  readonly dir?: string
  readonly patchPath?: string
  readonly home?: string
}
