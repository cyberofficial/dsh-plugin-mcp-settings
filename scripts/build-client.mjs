/**
 * Build script for the MCP Settings plugin.
 *
 * Both halves are staged into one temporary directory *inside the harness
 * checkout* (`.mcp-settings-build`), because that is the only place from which
 * `node:`, `@types/node`, and the client's externals resolve — this package
 * deliberately installs no dependency of its own.
 *
 * 1. Host half: `tsc` over the staged copy of `src` → `lib/index.js` plus
 *    `lib/host/*`, `lib/shared/*` (ESM, relative `.js` specifiers).
 * 2. Client half: `tsdown` over the staged `src/client` + `src/shared` →
 *    `lib/client.js`, a closure factory the browser module loader mounts:
 *    `window.__ModuleLoader__.load({ id, factory: (require) => { ... } })`.
 * 3. Post-process: splice the compiled stylesheet into the factory as a style
 *    injector (the tsdown CSS pipeline emits the class map inline but leaves
 *    the sheet as an asset nobody loads).
 */

import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pluginDir = resolve(here, '..')
const repoRoot = 'D:\\github\\deepseek-harness'
const libDir = resolve(pluginDir, 'lib')
/** Where a build lands before it is swapped in; a sibling keeps the rename on one volume. */
const stagingDir = resolve(pluginDir, '.lib-next')
/** Where the previous lib is moved aside during the swap, then deleted. */
const previousDir = resolve(pluginDir, '.lib-prev')
const tempDir = resolve(repoRoot, '.mcp-settings-build')

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

/** Read a JSON template and substitute a real output directory. */
async function template(name, outDir) {
  return (await readFile(resolve(here, name), 'utf8')).replace('"LIB_OUT_DIR"', JSON.stringify(outDir))
}

/**
 * Replace `lib/` with the finished staging directory.
 *
 * A build never writes into the live directory: a harness that boots while one
 * is running must never import a half-written host module (which is exactly the
 * `failed to import` a mid-build restart used to produce). The swap is two
 * renames — the only window where `lib/` is absent measures microseconds, and a
 * failed swap puts the previous directory back.
 */
async function swapIn() {
  await rm(previousDir, { recursive: true, force: true })
  const hadLib = existsSync(libDir)
  if (hadLib) await rename(libDir, previousDir)
  try {
    await rename(stagingDir, libDir)
  } catch (error) {
    if (hadLib) await rename(previousDir, libDir).catch(() => {})
    throw error
  }
  await rm(previousDir, { recursive: true, force: true })
}

async function main() {
  const hostTsconfig = await template('tsconfig.host.json', stagingDir)
  const clientTsconfig = await readFile(resolve(here, 'tsconfig.standalone.json'), 'utf8')
  const tsdownConfig = await template('tsdown.client.json', stagingDir)

  console.log('[1/6] cleaning staging directories')
  await rm(stagingDir, { recursive: true, force: true })
  await rm(previousDir, { recursive: true, force: true })
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })

  console.log('[2/6] staging sources')
  // Host: the whole of src/, so index.ts keeps its own relative layout.
  await cp(resolve(pluginDir, 'src'), resolve(tempDir, 'host'), { recursive: true })
  await writeFile(resolve(tempDir, 'host/tsconfig.json'), hostTsconfig)
  // Client: the browser half plus the wire contract it shares with the host.
  await cp(resolve(pluginDir, 'src/client'), resolve(tempDir, 'client'), { recursive: true })
  await cp(resolve(pluginDir, 'src/shared'), resolve(tempDir, 'shared'), { recursive: true })
  await writeFile(resolve(tempDir, 'tsconfig.json'), clientTsconfig)
  await writeFile(resolve(tempDir, 'tsdown.config.json'), tsdownConfig)

  console.log('[3/6] host half: tsc')
  await run(bin('tsc'), ['-p', resolve(tempDir, 'host/tsconfig.json')], tempDir)

  console.log('[4/6] client half: tsdown')
  await run(bin('tsdown'), ['--config', 'tsdown.config.json'], tempDir)

  console.log('[5/6] splicing stylesheet into the client bundle')
  const clientPath = resolve(stagingDir, 'client.js')
  const cssPath = resolve(stagingDir, 'style.css')
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

  console.log('[6/6] swapping the finished build into lib/')
  await swapIn()

  await rm(tempDir, { recursive: true, force: true })
  console.log('MCP Settings plugin built: lib/index.js (host) + lib/client.js (browser)')
}

main().catch(async (error) => {
  // A failed build leaves the live lib/ exactly as it was; only the staging
  // directory is discarded, so the next run starts clean.
  await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
  await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  console.error('Build failed:', error)
  process.exit(1)
})
