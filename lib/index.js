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
import { join } from 'node:path';
import { MCP_CLIENT_MODULE, SERVERS_PATH } from './shared/spec.js';
import { createFsPatchStore } from './host/fs-store.js';
import { createServersService } from './host/servers.js';
/** File name of the profile patch layer this plugin writes. */
const PATCH_FILENAME = 'cordis.patch.yml';
export const name = 'dsh-plugin-mcp-settings';
/** No hard service deps: `connection` arrives via web-app layers. */
export const inject = [];
/** Resolve the patch layers to edit, or undefined when no profile is running. */
function locatePatchFiles(ctx) {
    const profile = ctx.get('profileContext');
    const directory = profile?.dir ?? process.env.DSH_PROFILE_DIR;
    const home = profile?.home ?? process.env.DSH_HOME;
    const patchPath = profile?.patchPath
        ?? (directory === undefined || directory === '' ? undefined : join(directory, PATCH_FILENAME));
    if (patchPath === undefined || patchPath === '' || home === undefined || home === '')
        return undefined;
    return { profile: patchPath, home: join(home, PATCH_FILENAME) };
}
/** Read the live Loader rows the manager needs to keep identities unique and to prefill an edit. */
function liveRows(ctx) {
    const loader = ctx.get('loader');
    const ids = [];
    const serverNames = new Map();
    const configs = new Map();
    for (const entry of loader?.entries() ?? []) {
        const id = entry.options?.id;
        if (typeof id !== 'string')
            continue;
        ids.push(id);
        if (entry.options?.name !== MCP_CLIENT_MODULE)
            continue;
        const config = entry.options.config;
        // A disabled row keeps its entry (and so its config), which is what lets a
        // switched-off server still open in the edit form.
        configs.set(id, config);
        const serverName = typeof config === 'object' && config !== null
            ? config.serverName
            : undefined;
        if (typeof serverName === 'string')
            serverNames.set(id, serverName);
    }
    return { ids, serverNames, configs };
}
/**
 * Mount the plugin.
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
    // `connection` belongs to a later bundle layer, so wait for it through
    // ctx.inject — which also supplies the Context that declares the service.
    ctx.inject(['connection'], (connCtx) => {
        const connection = connCtx.get('connection');
        if (connection === null || connection === undefined)
            return;
        const files = locatePatchFiles(connCtx);
        const service = createServersService({
            ...files === undefined ? {} : { files },
            store: createFsPatchStore(),
            live: () => liveRows(connCtx),
            // The patch watcher is what turns a written row into a live entry.
            hotReload: () => connCtx.get('hmr') !== undefined,
        });
        const route = {
            path: SERVERS_PATH,
            methods: ['GET', 'POST'],
            requestBody: 'buffered',
            fetch: request => service.request(request),
        };
        connection.fetch.register(route);
        ctx.logger.info(`mcp-settings: server management live at ${SERVERS_PATH}`);
    });
}
//# sourceMappingURL=index.js.map