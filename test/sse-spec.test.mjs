/**
 * SSE transport: draft validation, the bridged stdio rendering, the
 * transport-badge derivation, and the edit round-trip of a bridged row.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { validateDraft, draftOfConfig, transportOfConfig } from '../lib/shared/spec.js'
import { createServersService, renderServerBlock } from '../lib/host/servers.js'
import { insertedConfigs, loadYaml, memoryStore, parsePatch } from './helpers.mjs'

/** A bridge shape the tests control, standing in for the bundled script. */
const bridge = {
  command: 'C:\\Program Files\\nodejs\\node.exe',
  script: 'D:\\github\\dsh-plugins\\dsh-plugin-mcp-settings\\bridge\\sse-bridge.mjs',
}

/** A minimal sse draft, with per-case overrides. */
function sseDraft(overrides = {}) {
  return {
    serverName: 'x64dbg',
    transport: 'sse',
    command: '',
    argsText: '',
    envText: '',
    cwd: '',
    url: 'http://127.0.0.1:50300/sse',
    headersText: '',
    toolCallTimeoutMs: '',
    failOnStartupError: false,
    ...overrides,
  }
}

/** The live config dsh-mcp-client would resolve for one bridged row. */
function bridgedConfig(overrides = {}) {
  return {
    serverName: 'x64dbg',
    transport: 'stdio',
    command: bridge.command,
    args: [bridge.script, 'http://127.0.0.1:50300/sse', '-H', 'x-api-key: k'],
    env: {},
    cwd: '',
    toolCallTimeoutMs: 360000,
    failOnStartupError: false,
    ...overrides,
  }
}

test('an sse draft validates to the sse spec', () => {
  const result = validateDraft(sseDraft({ headersText: 'x-api-key: k' }))
  assert.ok(result.ok)
  assert.equal(result.spec.transport, 'sse')
  assert.equal(result.spec.url, 'http://127.0.0.1:50300/sse')
  assert.deepEqual(result.spec.headers, { 'x-api-key': 'k' })
})

test('an sse draft without a URL is refused', () => {
  const result = validateDraft(sseDraft({ url: '' }))
  assert.ok(!result.ok)
  assert.deepEqual(result.problems, [{ field: 'url', reason: 'required' }])
})

test('an sse draft with a non-HTTP URL is refused', () => {
  const result = validateDraft(sseDraft({ url: 'ftp://127.0.0.1:50300/sse' }))
  assert.ok(!result.ok)
  assert.deepEqual(result.problems, [{ field: 'url', reason: 'invalid' }])
})

test('rendering an sse spec without the bridge fails loudly', () => {
  const { spec } = validateDraft(sseDraft())
  assert.throws(() => renderServerBlock(spec), /bundled bridge/)
})

test('an sse spec renders as the bridged stdio row the harness accepts', async (t) => {
  const yaml = await loadYaml()
  if (yaml === undefined) return t.skip('harness checkout not present')
  const { spec } = validateDraft(sseDraft({
    headersText: 'x-api-key: k',
    toolCallTimeoutMs: '360000',
    failOnStartupError: true,
  }))
  const [row] = insertedConfigs(parsePatch(yaml, renderServerBlock(spec, bridge)))
  assert.equal(row.id, 'mcp-x64dbg')
  assert.equal(row.config.serverName, 'x64dbg')
  assert.equal(row.config.transport, 'stdio')
  assert.equal(row.config.command, bridge.command)
  assert.deepEqual(row.config.args, [bridge.script, 'http://127.0.0.1:50300/sse', '-H', 'x-api-key: k'])
  assert.equal(row.config.toolCallTimeoutMs, 360000)
  assert.equal(row.config.failOnStartupError, true)
})

test('a bridged row reopens as the SSE form', () => {
  const draft = draftOfConfig(bridgedConfig(), bridge)
  assert.deepEqual(draft, {
    serverName: 'x64dbg',
    transport: 'sse',
    toolCallTimeoutMs: '360000',
    failOnStartupError: false,
    command: '',
    argsText: '',
    envText: '',
    cwd: '',
    url: 'http://127.0.0.1:50300/sse',
    headersText: 'x-api-key: k',
  })
})

test('a bridged row with extra environment stays a stdio form', () => {
  const draft = draftOfConfig(bridgedConfig({ env: { EXTRA: '1' } }), bridge)
  assert.equal(draft.transport, 'stdio')
  assert.equal(draft.command, bridge.command)
  assert.ok(draft.argsText.includes(bridge.script))
})

test('a plain stdio row is not presented as SSE', () => {
  const draft = draftOfConfig(bridgedConfig({ args: ['other.mjs', 'http://127.0.0.1:50300/sse'] }), bridge)
  assert.equal(draft.transport, 'stdio')
})

test('transportOfConfig classifies live configs', () => {
  assert.equal(transportOfConfig(bridgedConfig(), bridge), 'sse')
  assert.equal(transportOfConfig(bridgedConfig({ args: ['other.mjs', 'http://x/sse'] }), bridge), 'stdio')
  assert.equal(transportOfConfig(bridgedConfig()), 'stdio', 'without a bridge a bridged row reads as plain stdio')
  assert.equal(
    transportOfConfig({ transport: 'streamable-http', serverName: 'a', url: 'http://x', headers: {} }),
    'streamable-http',
  )
  assert.equal(transportOfConfig(undefined, bridge), undefined)
})

test('the route stores an sse draft as a bridged row, badges it, and reopens it as SSE', async (t) => {
  const yaml = await loadYaml()
  if (yaml === undefined) return t.skip('harness checkout not present')
  const { files, store } = memoryStore({ 'profile.yml': '[]' })
  let live = { ids: [], serverNames: new Map(), configs: new Map(), failed: new Set() }
  const service = createServersService({
    files: { profile: 'profile.yml', home: 'home.yml' },
    store,
    live: () => live,
    bridge,
  })

  const added = await (await service.request(new Request('http://host', {
    method: 'POST',
    body: JSON.stringify({ action: 'add', server: sseDraft({ headersText: 'x-api-key: k' }) }),
  }))).json()
  assert.ok(added.ok, 'the add must succeed')

  // The stored row is the bridged stdio shape dsh-mcp-client accepts.
  const [row] = insertedConfigs(parsePatch(yaml, files.get('profile.yml')))
  assert.equal(row.config.transport, 'stdio')
  assert.deepEqual(row.config.args, [bridge.script, 'http://127.0.0.1:50300/sse', '-H', 'x-api-key: k'])

  // Before the row mounts there is nothing to derive a transport from.
  const before = await (await service.request(new Request('http://host'))).json()
  assert.ok(before.ok)
  assert.equal(before.value.rows[0].transport, undefined)

  // Once dsh-mcp-client would resolve the bridged config, the card badges SSE.
  live = {
    ids: ['mcp-x64dbg'],
    serverNames: new Map([['mcp-x64dbg', 'x64dbg']]),
    configs: new Map([['mcp-x64dbg', bridgedConfig()]]),
    failed: new Set(),
  }
  const snapshot = await (await service.request(new Request('http://host'))).json()
  assert.ok(snapshot.ok)
  assert.equal(snapshot.value.rows[0].id, 'mcp-x64dbg')
  assert.equal(snapshot.value.rows[0].transport, 'sse')

  // The edit form reopens on the SSE the user chose, not the bridge command line.
  const inspected = await (await service.request(new Request('http://host', {
    method: 'POST',
    body: JSON.stringify({ action: 'inspect', id: 'mcp-x64dbg' }),
  }))).json()
  assert.ok(inspected.ok)
  assert.equal(inspected.value.draft.transport, 'sse')
  assert.equal(inspected.value.draft.url, 'http://127.0.0.1:50300/sse')
  assert.equal(inspected.value.draft.headersText, 'x-api-key: k')
})
