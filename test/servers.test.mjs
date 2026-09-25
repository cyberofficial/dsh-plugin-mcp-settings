/**
 * Host service tests: the exact fetch route's contract (snapshot, add, remove),
 * driven through real `Request`/`Response` objects over an in-memory patch
 * store, with the produced files re-parsed as the harness would read them.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { insertedConfigs, loadYaml, memoryStore, parsePatch } from './helpers.mjs'

const serversUrl = new URL('../lib/host/servers.js', import.meta.url)
if (!existsSync(fileURLToPath(serversUrl))) {
  throw new Error(`${fileURLToPath(serversUrl)} is missing - run "npm run build" first`)
}
const { createServersService } = await import(serversUrl.href)

const yaml = await loadYaml()
const skip = yaml === undefined ? 'the harness checkout provides no yaml parser' : false

const FILES = { profile: 'C:\\profile\\cordis.patch.yml', home: 'C:\\home\\cordis.patch.yml' }

const PROFILE = `# profile patch
- insert:
    - id: mcp-ghidra
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: ghidra
        transport: stdio
        command: node
- id: mcp-ghidra
  disabled: false
`

/** One live-row reader with everything a conflict check, an edit prefill, or a removal needs. */
function liveRows({ ids = [], names = {}, configs = {}, failed = [] } = {}) {
  return {
    ids,
    serverNames: new Map(Object.entries(names)),
    configs: new Map(Object.entries(configs)),
    failed: new Set(failed),
  }
}

/** One service over an in-memory store. */
function service({ profile = PROFILE, home, live = liveRows() } = {}) {
  const memory = memoryStore({
    ...profile === undefined ? {} : { [FILES.profile]: profile },
    ...home === undefined ? {} : { [FILES.home]: home },
  })
  return {
    memory,
    host: createServersService({ files: FILES, store: memory.store, live: () => live }),
  }
}

/** Call the route and read its JSON answer. */
async function call(host, method, body) {
  const request = new Request('http://127.0.0.1:3080/api/plugins/mcp-settings/servers', {
    method,
    ...body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  })
  const response = await host.request(request)
  return { status: response.status, body: await response.json() }
}

/** A draft for `add`; overridable per test. */
function stdioDraft(overrides = {}) {
  return {
    serverName: 'exa',
    transport: 'stdio',
    command: 'npx',
    argsText: '-y\nexa-mcp-server',
    envText: '# key for Exa\nEXA_API_KEY=secret value',
    cwd: 'C:\\work dir',
    url: '',
    headersText: '',
    toolCallTimeoutMs: '300000',
    failOnStartupError: false,
    ...overrides,
  }
}

test('GET reports every patch-file row with its layer', async () => {
  const { host } = service({ home: '- insert:\n    - id: mcp-home\n      name: \'@deepseek-ai/dsh-mcp-client\'\n      config:\n        serverName: home\n        transport: stdio\n        command: node\n' })
  const { status, body } = await call(host, 'GET')
  assert.equal(status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.value.patchPath, FILES.profile)
  assert.equal(body.value.live, false)
  assert.deepEqual(body.value.rows, [
    { id: 'mcp-ghidra', file: 'profile', managed: false },
    { id: 'mcp-home', file: 'home', managed: false },
  ])
})

test('GET reports whether a patch write applies without a restart', async () => {
  const memory = memoryStore({ [FILES.profile]: PROFILE })
  const host = createServersService({
    files: FILES,
    store: memory.store,
    live: () => liveRows(),
    hotReload: () => true,
  })
  const { body } = await call(host, 'GET')
  assert.equal(body.value.live, true)
})

test('POST add writes one canonical row and reports it', { skip }, async () => {
  const { host, memory } = service()
  const { status, body } = await call(host, 'POST', { action: 'add', server: stdioDraft() })
  assert.equal(status, 200)
  assert.deepEqual(body.value, { id: 'mcp-exa', file: 'profile', removed: [] })

  const text = memory.files.get(FILES.profile)
  const rows = insertedConfigs(parsePatch(yaml, text))
  assert.deepEqual(rows.map(row => row.id), ['mcp-ghidra', 'mcp-exa'])
  assert.deepEqual(rows[1].config, {
    serverName: 'exa',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    env: { EXA_API_KEY: 'secret value' },
    cwd: 'C:\\work dir',
    toolCallTimeoutMs: 300000,
  })
  // The commented patch file kept its original head.
  assert.ok(text.startsWith('# profile patch'))
})

test('POST add carries custom headers for a hosted HTTP server', { skip }, async () => {
  const { host, memory } = service()
  const { status } = await call(host, 'POST', {
    action: 'add',
    server: stdioDraft({
      serverName: 'exa',
      transport: 'streamable-http',
      url: 'https://mcp.exa.ai/mcp?tools=web_search_exa,agent_run',
      headersText: '# Exa API key\nx-api-key: YOUR_EXA_API_KEY\nAuthorization: Bearer YOUR_EXA_API_KEY',
    }),
  })
  assert.equal(status, 200)
  const [row] = insertedConfigs(parsePatch(yaml, memory.files.get(FILES.profile))).filter(entry => entry.id === 'mcp-exa')
  assert.deepEqual(row.config, {
    serverName: 'exa',
    transport: 'streamable-http',
    url: 'https://mcp.exa.ai/mcp?tools=web_search_exa,agent_run',
    headers: { 'x-api-key': 'YOUR_EXA_API_KEY', Authorization: 'Bearer YOUR_EXA_API_KEY' },
    toolCallTimeoutMs: 300000,
  })
})

test('POST add validates the draft and reports the offending field', async () => {
  const { host, memory } = service()
  const before = memory.files.get(FILES.profile)
  const { status, body } = await call(host, 'POST', {
    action: 'add',
    server: stdioDraft({ serverName: 'bad name', envText: 'NOT A LINE' }),
  })
  assert.equal(status, 400)
  assert.equal(body.error.code, 'invalid-spec')
  assert.deepEqual(body.error.problems.map(problem => [problem.field, problem.reason]), [
    ['serverName', 'pattern'],
    ['env', 'env-line'],
  ])
  assert.equal(memory.files.get(FILES.profile), before)
})

test('POST add refuses an id or a server name that already exists', async () => {
  const existing = service()
  const duplicate = await call(existing.host, 'POST', { action: 'add', server: stdioDraft({ serverName: 'ghidra' }) })
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.body.error.code, 'duplicate-id')
  assert.equal(duplicate.body.error.detail, 'mcp-ghidra')

  const live = service({ live: liveRows({ ids: ['mcp-other'], names: { 'mcp-other': 'exa' } }) })
  const named = await call(live.host, 'POST', { action: 'add', server: stdioDraft() })
  assert.equal(named.status, 409)
  assert.equal(named.body.error.code, 'duplicate-name')
  assert.equal(named.body.error.detail, 'exa')
})

test('POST remove deletes the row and its override, then reports not-found', { skip }, async () => {
  const { host, memory } = service()
  const { status, body } = await call(host, 'POST', { action: 'remove', id: 'mcp-ghidra' })
  assert.equal(status, 200)
  assert.deepEqual(body.value, { id: 'mcp-ghidra', file: 'profile', removed: ['row', 'override'] })
  const text = memory.files.get(FILES.profile)
  assert.deepEqual(insertedConfigs(parsePatch(yaml, text)), [])
  assert.deepEqual(parsePatch(yaml, text), [])
  assert.equal(text, '[]\n')

  const again = await call(host, 'POST', { action: 'remove', id: 'mcp-ghidra' })
  assert.equal(again.status, 404)
  assert.equal(again.body.error.code, 'not-found')
})

test('POST remove switches a failed row off before cutting it', { skip }, async () => {
  // A failed entry is not dropped when its row disappears, so the removal has to
  // dispose it first: write the disabled override, wait for the fiber to leave
  // `failed`, then cut. The store records both writes, in order.
  const writes = []
  const memory = memoryStore({ [FILES.profile]: PROFILE })
  const phases = [{ failed: new Set(['mcp-ghidra']) }, { failed: new Set() }]
  let read = 0
  const store = {
    async read(path) { return memory.store.read(path) },
    async write(path, text) {
      writes.push(text)
      await memory.store.write(path, text)
    },
  }
  const host = createServersService({
    files: FILES,
    store,
    live: () => phases[Math.min(read++, phases.length - 1)],
  })

  const { status, body } = await call(host, 'POST', { action: 'remove', id: 'mcp-ghidra' })
  assert.equal(status, 200)
  assert.deepEqual(body.value.removed, ['row', 'override'])
  assert.equal(writes.length, 2)
  // First write: the row stays, switched off the way the switch writes it.
  assert.ok(writes[0].includes('mcp-ghidra'))
  assert.ok(writes[0].includes('  disabled: true'))
  assert.ok(writes[0].includes('serverName: ghidra'))
  // Second write: the row and the override are gone.
  assert.equal(writes[1], '[]\n')
  assert.equal(memory.files.get(FILES.profile), '[]\n')
})

test('POST remove cuts a healthy row in one write', async () => {
  const writes = []
  const memory = memoryStore({ [FILES.profile]: PROFILE })
  const host = createServersService({
    files: FILES,
    store: {
      async read(path) { return memory.store.read(path) },
      async write(path, text) { writes.push(text); await memory.store.write(path, text) },
    },
    live: () => liveRows({ ids: ['mcp-ghidra'], names: { 'mcp-ghidra': 'ghidra' } }),
  })
  const { status } = await call(host, 'POST', { action: 'remove', id: 'mcp-ghidra' })
  assert.equal(status, 200)
  assert.equal(writes.length, 1)
})

test('POST remove edits the home layer when that is where the row lives', async () => {
  const home = '- insert:\n    - id: mcp-home\n      name: \'@deepseek-ai/dsh-mcp-client\'\n      config:\n        serverName: home\n        transport: stdio\n        command: node\n'
  const { host, memory } = service({ home })
  const { status, body } = await call(host, 'POST', { action: 'remove', id: 'mcp-home' })
  assert.equal(status, 200)
  assert.deepEqual(body.value, { id: 'mcp-home', file: 'home', removed: ['row'] })
  assert.equal(memory.files.get(FILES.profile), PROFILE)
  assert.ok(!memory.files.get(FILES.home).includes('mcp-home'))
})

test('the route refuses malformed requests and answers without a profile', async () => {
  const { host } = service()
  assert.equal((await call(host, 'POST', { action: 'rename', id: 'mcp-ghidra' })).status, 400)
  assert.equal((await call(host, 'POST', { action: 'add' })).status, 400)
  assert.equal((await call(host, 'POST', { action: 'remove', id: '' })).status, 400)

  const request = new Request('http://127.0.0.1:3080/api/plugins/mcp-settings/servers', { method: 'POST', body: 'not json' })
  assert.equal((await host.request(request)).status, 400)

  const missing = createServersService({ store: memoryStore().store, live: () => liveRows() })
  const answer = await call(missing, 'GET')
  assert.equal(answer.status, 503)
  assert.equal(answer.body.error.code, 'no-profile')
})

test('an unreadable or unwritable layer becomes a structured io error', async () => {
  const store = {
    async read() { throw new Error('EACCES: permission denied') },
    async write() { throw new Error('EACCES: permission denied') },
  }
  const host = createServersService({ files: FILES, store, live: () => liveRows() })
  const { status, body } = await call(host, 'GET')
  assert.equal(status, 500)
  assert.equal(body.error.code, 'io-error')
  assert.match(body.error.detail, /permission denied/)
})

test('a non-sequence patch file is refused instead of corrupted', async () => {
  const { host, memory } = service({ profile: 'preference: dark\n' })
  const { status, body } = await call(host, 'POST', { action: 'add', server: stdioDraft() })
  assert.equal(status, 409)
  assert.equal(body.error.code, 'unsupported')
  assert.equal(memory.files.get(FILES.profile), 'preference: dark\n')
})

test('POST inspect returns the running values, not the file text', async () => {
  const live = liveRows({
    ids: ['mcp-ghidra'],
    names: { 'mcp-ghidra': 'ghidra' },
    configs: {
      'mcp-ghidra': {
        transport: 'stdio',
        serverName: 'ghidra',
        command: 'D:\\tools\\ghidra-mcp\\python.exe',
        args: ['-m', 'bridge_mcp_ghidra', '--transport', 'stdio'],
        env: { GHIDRA_MCP_URL: 'http://127.0.0.1:8089' },
        cwd: 'D:\\tools\\ghidra-mcp',
        // Schema defaults arrive filled in; the form shows them as they are.
        toolCallTimeoutMs: 60000,
        failOnStartupError: false,
      },
    },
  })
  const { host } = service({ live })
  const { status, body } = await call(host, 'POST', { action: 'inspect', id: 'mcp-ghidra' })
  assert.equal(status, 200)
  assert.equal(body.value.managed, false)
  assert.equal(body.value.file, 'profile')
  assert.equal(body.value.blocked, undefined)
  assert.deepEqual(body.value.draft, {
    serverName: 'ghidra',
    transport: 'stdio',
    command: 'D:\\tools\\ghidra-mcp\\python.exe',
    argsText: '-m\nbridge_mcp_ghidra\n--transport\nstdio',
    envText: 'GHIDRA_MCP_URL=http://127.0.0.1:8089',
    cwd: 'D:\\tools\\ghidra-mcp',
    url: '',
    headersText: '',
    toolCallTimeoutMs: '60000',
    failOnStartupError: false,
  })
})

test('POST inspect reports a row it cannot rewrite rather than guessing', async () => {
  const jsRow = PROFILE.replace('command: node', 'command: !!js process.env.MCP_BIN')
  const { host } = service({ profile: jsRow, live: liveRows({ configs: { 'mcp-ghidra': { serverName: 'ghidra', transport: 'stdio', command: 'node' } } }) })
  const blocked = await call(host, 'POST', { action: 'inspect', id: 'mcp-ghidra' })
  assert.equal(blocked.status, 200)
  assert.equal(blocked.body.value.blocked, 'js-expression')

  const noConfig = service({ live: liveRows() })
  const unknown = await call(noConfig.host, 'POST', { action: 'inspect', id: 'mcp-ghidra' })
  assert.equal(unknown.status, 200)
  assert.equal(unknown.body.value.blocked, 'unknown-config')

  const missing = await call(noConfig.host, 'POST', { action: 'inspect', id: 'mcp-absent' })
  assert.equal(missing.status, 404)
  assert.equal(missing.body.error.code, 'not-found')
})

test('POST edit rewrites a managed row in place and renames its override', { skip }, async () => {
  const { host, memory } = service()
  const added = await call(host, 'POST', { action: 'add', server: stdioDraft({ serverName: 'keep' }) })
  assert.equal(added.status, 200)
  // The enablement switch writes an override for the row it toggles.
  const withOverride = `${memory.files.get(FILES.profile)}- id: mcp-keep\n  disabled: true\n`
  memory.files.set(FILES.profile, withOverride)

  const edited = await call(host, 'POST', {
    action: 'edit',
    id: 'mcp-keep',
    server: stdioDraft({ serverName: 'renamed', command: 'uvx', toolCallTimeoutMs: '', failOnStartupError: true }),
  })
  assert.equal(edited.status, 200)
  assert.equal(edited.body.value.id, 'mcp-renamed')

  const text = memory.files.get(FILES.profile)
  const rows = insertedConfigs(parsePatch(yaml, text))
  assert.deepEqual(rows.map(row => row.id), ['mcp-ghidra', 'mcp-renamed'])
  assert.deepEqual(rows[1].config, {
    serverName: 'renamed',
    transport: 'stdio',
    command: 'uvx',
    args: ['-y', 'exa-mcp-server'],
    env: { EXA_API_KEY: 'secret value' },
    cwd: 'C:\\work dir',
    failOnStartupError: true,
  })
  assert.deepEqual(parsePatch(yaml, text).at(-1), { id: 'mcp-renamed', disabled: true })
  assert.ok(!text.includes('mcp-keep'))
  assert.ok(text.startsWith('# profile patch'))
})

test('POST edit keeps a hand-written row\'s own lines and comments', { skip }, async () => {
  const handWritten = `# banner for ghidra
# second banner line
- insert:
    - id: mcp-ghidra
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: ghidra
        transport: stdio
        command: node
        args: [ '-m', 'bridge_mcp_ghidra' ]
# a comment between items
- id: plugin-provider-disable
  disabled: false
- id: mcp-ghidra
  disabled: false
`
  const { host, memory } = service({ profile: handWritten })
  const { status, body } = await call(host, 'POST', {
    action: 'edit',
    id: 'mcp-ghidra',
    server: stdioDraft({ serverName: 'ghidra', command: 'uvx', argsText: 'bridge', envText: '', cwd: '', toolCallTimeoutMs: '' }),
  })
  assert.equal(status, 200)
  assert.deepEqual(body.value, { id: 'mcp-ghidra', file: 'profile', removed: [] })

  const text = memory.files.get(FILES.profile)
  assert.ok(text.startsWith('# banner for ghidra\n# second banner line\n'))
  assert.ok(text.includes('# a comment between items'))
  assert.deepEqual(insertedConfigs(parsePatch(yaml, text)), [{
    id: 'mcp-ghidra',
    config: { serverName: 'ghidra', transport: 'stdio', command: 'uvx', args: ['bridge'] },
  }])
  // The override for the unchanged id stays where it was.
  assert.deepEqual(parsePatch(yaml, text).at(-1), { id: 'mcp-ghidra', disabled: false })
})

test('POST edit refuses conflicts, unknown rows, and uneditable rows', async () => {
  // A second row in the same file makes a rename collide on the row id.
  const twoRows = `${PROFILE}- insert:
    - id: mcp-other
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: other
        transport: stdio
        command: node
`
  const taken = service({ profile: twoRows })
  const collision = await call(taken.host, 'POST', { action: 'edit', id: 'mcp-ghidra', server: stdioDraft({ serverName: 'other' }) })
  assert.equal(collision.status, 409)
  assert.equal(collision.body.error.code, 'duplicate-id')

  const { host, memory } = service()
  const before = memory.files.get(FILES.profile)

  const live = service({ live: liveRows({ names: { 'mcp-other': 'exa' } }) })
  const named = await call(live.host, 'POST', { action: 'edit', id: 'mcp-ghidra', server: stdioDraft() })
  assert.equal(named.status, 409)
  assert.equal(named.body.error.code, 'duplicate-name')

  const invalid = await call(host, 'POST', { action: 'edit', id: 'mcp-ghidra', server: stdioDraft({ serverName: '' }) })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.error.code, 'invalid-spec')

  const missing = await call(host, 'POST', { action: 'edit', id: 'mcp-absent', server: stdioDraft() })
  assert.equal(missing.status, 404)

  const jsRow = PROFILE.replace('command: node', 'command: !!js process.env.MCP_BIN')
  const blocked = service({ profile: jsRow })
  const refused = await call(blocked.host, 'POST', { action: 'edit', id: 'mcp-ghidra', server: stdioDraft() })
  assert.equal(refused.status, 409)
  assert.equal(refused.body.error.code, 'unsupported')
  assert.equal(refused.body.error.detail, 'js-expression')

  assert.equal(memory.files.get(FILES.profile), before)
})

test('POST edit renames the row into another layer only when that layer holds it', async () => {
  const home = '- insert:\n    - id: mcp-home\n      name: \'@deepseek-ai/dsh-mcp-client\'\n      config:\n        serverName: home\n        transport: stdio\n        command: node\n'
  const { host, memory } = service({ home })
  const { status, body } = await call(host, 'POST', {
    action: 'edit',
    id: 'mcp-home',
    server: stdioDraft({ serverName: 'home-two', transport: 'streamable-http', url: 'https://example.com/mcp', headersText: 'x-api-key: KEY' }),
  })
  assert.equal(status, 200)
  assert.deepEqual(body.value, { id: 'mcp-home-two', file: 'home', removed: [] })
  assert.equal(memory.files.get(FILES.profile), PROFILE)
  assert.ok(memory.files.get(FILES.home).includes('mcp-home-two'))
  assert.ok(!memory.files.get(FILES.home).includes('mcp-home\n'))
})
