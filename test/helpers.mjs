/**
 * Test helpers: the harness's own YAML reader and a tiny in-memory store.
 *
 * The plugin ships no runtime dependency, so the tests borrow the parser the
 * harness itself composes patches with (`yaml` inside the harness checkout) by
 * absolute path. Every structural assertion still runs without it; the tests
 * that prove the produced file *parses* skip when the checkout is absent.
 */

import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Checkout-relative locations the harness's `yaml` install may live at. */
const CANDIDATES = [
  'D:\\github\\deepseek-harness\\node_modules\\.pnpm\\node_modules\\yaml\\dist\\index.js',
  'D:\\github\\deepseek-harness\\node_modules\\yaml\\dist\\index.js',
]

/**
 * Import the harness's `yaml` module.
 * @returns the module, or undefined when no checkout provides one.
 */
export async function loadYaml() {
  for (const candidate of CANDIDATES) {
    if (!existsSync(candidate)) continue
    const loaded = await import(pathToFileURL(candidate).href)
    return loaded.default ?? loaded
  }
  return undefined
}

/**
 * Parse a patch file exactly as the harness does, `!!js` tags included.
 * @param yaml - the module from {@link loadYaml}.
 * @param text - the patch file's text.
 * @returns the parsed document.
 */
export function parsePatch(yaml, text) {
  const document = yaml.parseDocument(text, {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => value }],
  })
  if (document.errors.length > 0) throw document.errors[0]
  return document.toJS()
}

/** A {@link PatchStore} over an in-memory map, for the service tests. */
export function memoryStore(initial = {}) {
  const files = new Map(Object.entries(initial))
  return {
    files,
    store: {
      async read(path) { return files.get(path) },
      async write(path, text) { files.set(path, text) },
    },
  }
}

/** Every `config` of the inserted rows the parsed patch declares. */
export function insertedConfigs(parsed, moduleName = '@deepseek-ai/dsh-mcp-client') {
  const rows = []
  for (const item of parsed) {
    for (const inner of item?.insert ?? []) {
      if (inner?.name === moduleName) rows.push({ id: inner.id, config: inner.config })
    }
  }
  return rows
}

/** Comment lines of a patch file, for "nothing else moved" assertions. */
export function commentLines(text) {
  return text.split(/\r?\n/).filter(line => line.trimStart().startsWith('#'))
}
