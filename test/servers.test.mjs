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

/** One service over an in-memory store. */
function service({ profile = PROFILE, home, live = { ids: [], serverNames: [] } } = {}) {
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
    live: () => ({ ids: [], serverNames: [] }),
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

  const live = service({ live: { ids: ['mcp-other'], serverNames: ['exa'] } })
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

  const missing = createServersService({ store: memoryStore().store, live: () => ({ ids: [], serverNames: [] }) })
  const answer = await call(missing, 'GET')
  assert.equal(answer.status, 503)
  assert.equal(answer.body.error.code, 'no-profile')
})

test('an unreadable or unwritable layer becomes a structured io error', async () => {
  const store = {
    async read() { throw new Error('EACCES: permission denied') },
    async write() { throw new Error('EACCES: permission denied') },
  }
  const host = createServersService({ files: FILES, store, live: () => ({ ids: [], serverNames: [] }) })
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
