/**
 * Build script for the MCP Settings plugin.
 *
 * 1. Host half: plain `tsc` over `src/index.ts` → `lib/index.js` (ESM, no
 *    imports, so it builds standalone with zero dependency resolution).
 * 2. Client half: tsdown inside an isolated temp directory under the harness
 *    repo root (so `tsdown`/`@tsdown/css` resolve from the workspace install)
 *    — compiles `src/client` TSX directly with JSX transformed, and emits the
 *    closure-factory artifact `lib/client.js`:
 *    `window.__ModuleLoader__.load({ id, factory: (require) => { ... } })`.
 * 3. Post-process: splice the compiled stylesheet into the factory as a style
 *    injector (the tsdown CSS pipeline emits the class map inline but leaves
 *    the sheet as an asset nobody loads).
 */

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pluginDir = resolve(here, '..')
const repoRoot = 'D:\\github\\deepseek-harness'
const libDir = resolve(pluginDir, 'lib')
const tempDir = resolve(repoRoot, '.mcp-settings-client-build')

const WIN = process.platform === 'win32'
const bin = (name) => resolve(repoRoot, 'node_modules/.bin', WIN ? `${name}.CMD` : name)

function run(cmd, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: WIN })
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const outDirPlaceholder = JSON.stringify(libDir)
  const configText = (await readFile(resolve(here, 'tsdown.client.json'), 'utf8'))
    .replace('"LIB_OUT_DIR"', outDirPlaceholder)
  const tsconfigText = await readFile(resolve(here, 'tsconfig.standalone.json'), 'utf8')

  console.log('[1/4] cleaning lib/ and temp build dir')
  await rm(libDir, { recursive: true, force: true })
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })

  console.log('[2/4] host half: tsc')
  await run(bin('tsc'), ['-p', resolve(pluginDir, 'tsconfig.json')], pluginDir)

  console.log('[3/4] client half: tsdown (isolated temp dir)')
  await mkdir(resolve(tempDir, 'client'), { recursive: true })
  await cp(resolve(pluginDir, 'src/client'), resolve(tempDir, 'client'), { recursive: true })
  await writeFile(resolve(tempDir, 'tsdown.config.json'), configText)
  await writeFile(resolve(tempDir, 'tsconfig.json'), tsconfigText)
  await run(bin('tsdown'), ['--config', 'tsdown.config.json'], tempDir)

  console.log('[4/4] splicing stylesheet into the client bundle')
  const clientPath = resolve(libDir, 'client.js')
  const cssPath = resolve(libDir, 'style.css')
  if (!existsSync(clientPath)) throw new Error('client.js was not emitted')
  const bundle = await readFile(clientPath, 'utf8')
  const intro = '\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;'
  if (!bundle.includes(intro)) throw new Error('client.js is missing the factory intro; wrapper contract changed')
  const injection = [
    intro,
    `\t\tvar css = ${JSON.stringify(await readFile(cssPath, 'utf8'))};`,
    '\t\tvar tagId = "dsh-plugin-mcp-settings/client";',
    "\t\tif (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=\"' + tagId + '\"]') === null) {",
    "\t\t\tvar tag = document.createElement('style');",
    '\t\t\ttag.dataset.plugin = "dsh-plugin-mcp-settings";',
    '\t\t\ttag.dataset.pluginCss = tagId;',
    '\t\t\ttag.textContent = css;',
    '\t\t\tdocument.head.appendChild(tag);',
    '\t\t}',
  ].join('\n')
  await writeFile(clientPath, bundle.replace(intro, injection))
  if (existsSync(cssPath)) await rm(cssPath)

  await rm(tempDir, { recursive: true, force: true })
  console.log('MCP Settings plugin built: lib/index.js (host) + lib/client.js (browser)')
}

main().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
