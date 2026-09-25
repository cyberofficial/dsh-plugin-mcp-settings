/**
 * MCP Servers settings section — Host half.
 *
 * Empty `apply`, present only so the package holds a Loader row: the client
 * module system attaches this package's browser half to the row whose module
 * specifier is the bare package name. All work (server list, toggle, retry)
 * happens in `./client`, driven by the already-mounted `pluginInventory` and
 * `pluginManager` Remotes.
 *
 * @module dsh-plugin-mcp-settings
 */
export declare const name = "dsh-plugin-mcp-settings";
export declare const inject: readonly [];
/** Host half is inert; see src/client for the browser half. */
export declare function apply(): void;
//# sourceMappingURL=index.d.ts.map