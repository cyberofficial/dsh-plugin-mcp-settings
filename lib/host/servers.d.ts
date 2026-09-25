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
import { type McpServerSpec, type ServerErrorCode, type SpecProblem } from '../shared/spec.js';
/** Absolute paths of the two patch layers this panel may rewrite. */
export interface PatchFiles {
    /** The profile's own layer, where new servers are written. */
    readonly profile: string;
    /** The home layer, rewritten only when it already declares the row. */
    readonly home: string;
}
/** Filesystem face the service needs, injected so tests can supply a fake. */
export interface PatchStore {
    /** Read one file, or undefined when it does not exist. */
    read(path: string): Promise<string | undefined>;
    /** Replace one file's contents. */
    write(path: string, text: string): Promise<void>;
}
/** Live Loader facts that make a row's identity safe and its config editable. */
export interface LiveRows {
    /** Patch row id every live entry declares. */
    readonly ids: readonly string[];
    /** `serverName` per live `mcp-client` row id, for duplicate detection and renames. */
    readonly serverNames: ReadonlyMap<string, string>;
    /** Resolved `config` per live `mcp-client` row id, for the edit form. */
    readonly configs: ReadonlyMap<string, unknown>;
}
/** An expected refusal, carried to the browser as a structured error. */
export declare class ServersFault extends Error {
    readonly code: ServerErrorCode;
    readonly problems?: readonly SpecProblem[] | undefined;
    readonly detail?: string | undefined;
    constructor(code: ServerErrorCode, problems?: readonly SpecProblem[] | undefined, detail?: string | undefined);
}
/** The HTTP status one refusal is reported with. */
export declare function statusOf(code: ServerErrorCode): number;
/** Options one service instance is built from. */
export interface ServersServiceOptions {
    /** The layers to edit; undefined when no dsh profile could be located. */
    readonly files?: PatchFiles;
    readonly store: PatchStore;
    /** Live Loader rows, read fresh for every mutation. */
    readonly live: () => LiveRows;
    /** Whether the running profile applies a patch write without a restart. */
    readonly hotReload?: () => boolean;
}
/** What the host half exposes to the browser over one exact fetch route. */
export interface ServersService {
    /** Answer one request on the plugin's own `/api` route. */
    request(request: Request): Promise<Response>;
}
/** The `config:` body of one server at zero base indent, for an in-place row rewrite. */
export declare function configBodyLines(spec: McpServerSpec): string[];
/** The canonical, marker-delimited `insert` block for one server. */
export declare function renderServerBlock(spec: McpServerSpec): string;
/**
 * Build the host half's manager over one profile.
 * @param options - patch layers, store, and the live-row reader.
 * @returns the service answering the plugin's exact fetch route.
 */
export declare function createServersService(options: ServersServiceOptions): ServersService;
//# sourceMappingURL=servers.d.ts.map