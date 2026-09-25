/**
 * Filesystem-backed patch storage.
 *
 * Writes go to a temporary file beside the target and are renamed into place,
 * so the HMR watcher (which watches the patch path exactly) never reads a
 * half-written patch. A missing file reads as `undefined`, which is what an
 * append-only first write needs.
 *
 * @module dsh-plugin-mcp-settings/host/fs-store
 */
import type { PatchStore } from './servers.js';
/**
 * Build the production patch store.
 * @returns a store reading and atomically replacing profile patch files.
 */
export declare function createFsPatchStore(): PatchStore;
//# sourceMappingURL=fs-store.d.ts.map