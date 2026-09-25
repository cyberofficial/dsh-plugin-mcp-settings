/**
 * Host wiring test: `apply()` registers exactly one exact fetch route on the
 * `connection` service, and that route edits the real patch file on disk
 * through the atomic store — the whole host half, minus cordis itself.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const libUrl = new URL('../lib/index.js', import.meta.url)
if (!existsSync(fileURLToPath(libUrl))) {
  throw new Error(`${fileURLToPath(libUrl)} is missing - run "npm run build" first`)
}
const { apply, inject, name } = await import(libUrl.href)

const PROFILE_PATCH = `# profile patch
- insert:
    - id: mcp-ghidra
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: ghidra
        transport: stdio
        command: node
`

/**
 * A cordis-shaped context that records the fetch route the host half registers.
 * @param services - service values `ctx.get` answers with, `connection` included.
 * @param options.withConnection - false to model a tree where Connection never loaded.
 */
function stubContext(services, { withConnection = true } = {}) {
  const registered = []
  const connection = { fetch: { register(route) { registered.push(route); return () => {} } } }
  const ctx = {
    logger: { info() {}, warn() {} },
    get: serviceName => serviceName === 'connection' && !withConnection ? undefined : serviceName === 'connection' ? connection : services[serviceName],
    inject(names, callback) {
      assert.deepEqual([...names], ['connection'], 'the host half waits only for connection')
      callback(ctx)
    },
  }
  return { ctx, registered, connection }
}

/** One request against the registered route. */
async function call(route, method, body) {
  const response = await route.fetch(new Request(`http://127.0.0.1:3080${route.path}`, {
    method,
    ...body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  }))
  return { status: response.status, body: await response.json() }
}

test('the plugin names itself and waits for no service at load', () => {
  assert.equal(name, 'dsh-plugin-mcp-settings')
  assert.deepEqual([...inject], [])
})

test('apply registers one buffered GET/POST route and edits the profile patch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-settings-test-'))
  const home = join(directory, 'home')
  try {
    const patchPath = join(directory, 'cordis.patch.yml')
    await writeFile(patchPath, PROFILE_PATCH, 'utf8')
    await mkdir(home, { recursive: true })
    const { ctx, registered } = stubContext({
      profileContext: { dir: directory, patchPath, home },
      loader: { entries: () => [] },
    })

    apply(ctx)

    assert.equal(registered.length, 1)
    const [route] = registered
    assert.equal(route.path, '/api/plugins/mcp-settings/servers')
    assert.deepEqual([...route.methods], ['GET', 'POST'])
    assert.equal(route.requestBody, 'buffered')

    const snapshot = await call(route, 'GET')
    assert.equal(snapshot.status, 200)
    assert.deepEqual(snapshot.body.value.rows, [{ id: 'mcp-ghidra', file: 'profile', managed: false }])
    assert.equal(snapshot.body.value.patchPath, patchPath)
    assert.equal(snapshot.body.value.homePatchPath, join(home, 'cordis.patch.yml'))
    // The stub provides no `hmr` service, so the route reports a restart.
    assert.equal(snapshot.body.value.live, false)

    const added = await call(route, 'POST', {
      action: 'add',
      server: {
        serverName: 'exa',
        transport: 'streamable-http',
        command: '',
        argsText: '',
        envText: '',
        cwd: '',
        url: 'https://mcp.exa.ai/mcp',
        headersText: 'x-api-key: YOUR_EXA_API_KEY',
        toolCallTimeoutMs: '',
        failOnStartupError: false,
      },
    })
    assert.equal(added.status, 200)
    assert.deepEqual(added.body.value, { id: 'mcp-exa', file: 'profile', removed: [] })
    const written = await readFile(patchPath, 'utf8')
    assert.ok(written.includes('mcp-exa'))
    assert.ok(written.includes("x-api-key: YOUR_EXA_API_KEY"))

    const removed = await call(route, 'POST', { action: 'remove', id: 'mcp-exa' })
    assert.equal(removed.status, 200)
    assert.equal(await readFile(patchPath, 'utf8'), PROFILE_PATCH)
    // No temporary write file is left beside the patch.
    assert.deepEqual(await readdir(directory).then(names => names.filter(name => name !== 'home')), ['cordis.patch.yml'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('a missing connection or profile leaves the plugin inert and honest', async () => {
  const withoutConnection = stubContext(
    { profileContext: { dir: 'C:\\nowhere' }, loader: { entries: () => [] } },
    { withConnection: false },
  )
  // ctx.get('connection') answers undefined: nothing is registered, nothing throws.
  apply(withoutConnection.ctx)
  assert.equal(withoutConnection.registered.length, 0)

  // The environment carries a real profile into a test process; blank both names
  // so this case exercises "no profileContext and no fallback" alone.
  const previousDirectory = process.env.DSH_PROFILE_DIR
  const previousHome = process.env.DSH_HOME
  process.env.DSH_PROFILE_DIR = ''
  process.env.DSH_HOME = ''
  try {
    const { ctx, registered } = stubContext({ loader: { entries: () => [] } })
    apply(ctx)
    const answer = await call(registered[0], 'GET')
    assert.equal(answer.status, 503)
    assert.equal(answer.body.error.code, 'no-profile')
  } finally {
    process.env.DSH_PROFILE_DIR = previousDirectory
    process.env.DSH_HOME = previousHome
  }
})
