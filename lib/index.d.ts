/**
 * MCP Servers settings section — Host half.
 *
 * The plugin exists so a Loader row (this package's `cordis.patch.yml`) mounts
 * its browser half into Settings. The browser half reads, toggles, and restarts
 * servers through the already-mounted `pluginManager` Remote; the two things
 * that Remote cannot do — adding a server and removing one — need the patch file
 * itself, so this half registers one exact route on the shared `/api` channel
 * (`connection.fetch.register`, which applies the Host/Origin fence and browser
 * authentication before the handler runs) and edits `cordis.patch.yml` there.
 *
 * The file is the whole interface: `patchReload: live` makes the HMR watcher
 * recompose the profile the moment the patch changes, so an added row becomes a
 * live `mcp-client` entry with no restart and no second mechanism.
 *
 * @module dsh-plugin-mcp-settings
 */
import type { HostContext } from './host/contract.js';
export declare const name = "dsh-plugin-mcp-settings";
/** No hard service deps: `connection` arrives via web-app layers. */
export declare const inject: readonly [];
/**
 * Mount the plugin.
 * @param ctx - host plugin context.
 */
export declare function apply(ctx: HostContext): void;
//# sourceMappingURL=index.d.ts.map