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
export declare const SERVERS_PATH = "/api/plugins/mcp-settings/servers";
/** Loader module every row this panel writes names. */
export declare const MCP_CLIENT_MODULE = "@deepseek-ai/dsh-mcp-client";
/** Prefix of every Loader row id this panel writes. */
export declare const ROW_ID_PREFIX = "mcp-";
/** `serverName` budget `@deepseek-ai/dsh-mcp-client` itself enforces. */
export declare const SERVER_NAME_PATTERN: RegExp;
/** Highest per-call timeout worth storing (2^31 - 1 ms, Node's timer ceiling). */
export declare const MAX_TOOL_CALL_TIMEOUT_MS = 2147483647;
/** Which transport one server uses. */
export type McpTransport = 'stdio' | 'streamable-http';
/** The patch file a row lives in: the profile's own layer, or the home layer. */
export type PatchFileKind = 'profile' | 'home';
/** One `KEY=VALUE` (environment) or `Name: value` (header) textarea line. */
export interface McpTextLine {
    readonly key: string;
    readonly value: string;
    /** One-based line number in the textarea, for messages. */
    readonly line: number;
}
/** The Add dialog's flat state, and the shape the host validates. */
export interface McpServerDraft {
    readonly serverName: string;
    readonly transport: McpTransport;
    readonly command: string;
    /** One argument per line. */
    readonly argsText: string;
    /** One `KEY=VALUE` per line; blank and `#` lines are ignored. */
    readonly envText: string;
    readonly cwd: string;
    readonly url: string;
    /** One `Name: value` per line; blank and `#` lines are ignored. */
    readonly headersText: string;
    /** Whole milliseconds; empty uses the `mcp-client` default. */
    readonly toolCallTimeoutMs: string;
    readonly failOnStartupError: boolean;
}
/** A validated stdio server, ready to render as a Loader row. */
export interface McpStdioSpec {
    readonly transport: 'stdio';
    readonly serverName: string;
    readonly command: string;
    readonly args: readonly string[];
    readonly env: Readonly<Record<string, string>>;
    readonly cwd: string;
    readonly toolCallTimeoutMs?: number;
    readonly failOnStartupError: boolean;
}
/** A validated Streamable HTTP server, ready to render as a Loader row. */
export interface McpStreamableHttpSpec {
    readonly transport: 'streamable-http';
    readonly serverName: string;
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly toolCallTimeoutMs?: number;
    readonly failOnStartupError: boolean;
}
/** One validated server configuration. */
export type McpServerSpec = McpStdioSpec | McpStreamableHttpSpec;
/** The draft field a problem belongs to. */
export type SpecField = 'serverName' | 'transport' | 'command' | 'args' | 'env' | 'cwd' | 'url' | 'headers' | 'toolCallTimeoutMs';
/** Why a draft was refused. */
export type SpecProblemReason = 'required' | 'pattern' | 'invalid' | 'control' | 'env-line' | 'header-line' | 'timeout';
/** One refusal, with the field that owns it and (for text blocks) the line. */
export interface SpecProblem {
    readonly field: SpecField;
    readonly reason: SpecProblemReason;
    readonly line?: number;
}
/** Validation outcome: the normalized spec, or every problem found. */
export type SpecResult = {
    readonly ok: true;
    readonly spec: McpServerSpec;
} | {
    readonly ok: false;
    readonly problems: readonly SpecProblem[];
};
/** The Loader row id one server name owns. */
export declare function rowIdFor(serverName: string): string;
/**
 * Parse `KEY=VALUE` lines (environment) or `Name: value` lines (headers).
 * @param text - the textarea value.
 * @param separator - the character splitting each line.
 * @param kind - which pattern the key must satisfy.
 * @returns the parsed pairs and the lines that did not fit.
 */
export declare function parseKeyValueLines(text: string, separator: '=' | ':', kind: 'env' | 'header'): {
    readonly entries: readonly McpTextLine[];
    readonly problems: readonly SpecProblem[];
};
/**
 * Validate one Add-dialog draft and normalize it into a `mcp-client` config.
 * @param input - the untrusted draft (form state on the browser, JSON body on the host).
 * @returns the normalized spec, or every problem the draft has.
 */
export declare function validateDraft(input: unknown): SpecResult;
/** Whether a value parses as an absolute http(s) URL. */
export declare function isHttpUrl(value: string): boolean;
/** HTTP status the host reports each refusal with. */
export type ServerErrorCode = 
/** The Loader row id is already declared somewhere in the profile's layers. */
'duplicate-id'
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
 | 'io-error';
/** Structured refusal body. */
export interface ServerError {
    readonly code: ServerErrorCode;
    /** Present when the refusal came from validation. */
    readonly problems?: readonly SpecProblem[];
    /** Free-form host detail (a filesystem message, an id, a conflict name). */
    readonly detail?: string;
}
/** One patch-file row that names the `mcp-client` module. */
export interface PatchRowInfo {
    readonly id: string;
    readonly file: PatchFileKind;
    /** True when the row sits between this panel's own marker comments. */
    readonly managed: boolean;
}
/** What the browser reads before rendering the section's management affordances. */
export interface ServersSnapshot {
    /** Absolute path of the profile's own patch layer. */
    readonly patchPath: string;
    /** Absolute path of the home patch layer, edited only when it already holds the row. */
    readonly homePatchPath: string;
    /**
     * Whether the running profile applies a patch write without a restart. False
     * means the harness has no patch watcher, so a change made here is persisted
     * but only composes on the next launch.
     */
    readonly live: boolean;
    readonly rows: readonly PatchRowInfo[];
}
/** What one successful mutation reports. */
export interface ServersMutation {
    readonly id: string;
    readonly file: PatchFileKind;
    /** What the edit removed: the row, its enablement override, or both. */
    readonly removed: readonly ('row' | 'override')[];
}
/** Wire answer of every request on {@link SERVERS_PATH}. */
export type ServersResponse<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: ServerError;
};
/** Request body of `POST` on {@link SERVERS_PATH}. */
export type ServersRequest = {
    readonly action: 'add';
    readonly server: unknown;
} | {
    readonly action: 'remove';
    readonly id: unknown;
};
/** An empty draft, for the Add dialog's initial state. */
export declare function emptyDraft(): McpServerDraft;
//# sourceMappingURL=spec.d.ts.map