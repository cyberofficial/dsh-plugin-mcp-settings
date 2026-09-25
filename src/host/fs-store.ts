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

import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { PatchStore } from './servers.js'

/** Permission bits a profile-owned patch file is written with. */
const MODE = 0o600

/**
 * Build the production patch store.
 * @returns a store reading and atomically replacing profile patch files.
 */
export function createFsPatchStore(): PatchStore {
  return {
    async read(path: string): Promise<string | undefined> {
      try {
        return await readFile(path, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
        throw error
      }
    },

    async write(path: string, text: string): Promise<void> {
      // The temporary file shares the target's directory, so the rename stays
      // on one volume; its own name is never one the watcher reports on.
      const temporary = `${path}.mcp-settings-${process.pid}-${randomUUID()}.tmp`
      await writeFile(temporary, text, { encoding: 'utf8', mode: MODE })
      try {
        await rename(temporary, path)
      } catch (error) {
        await rm(temporary, { force: true })
        throw error
      }
    },
  }
}
