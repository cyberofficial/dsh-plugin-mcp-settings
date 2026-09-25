/**
 * Browser-half smoke test.
 *
 * The client bundle is a `window.__ModuleLoader__.load({ id, factory })`
 * contribution. Loading it with a stub loader, a stub `require`, and a stub
 * cordis context proves the artifact parses, registers exactly one Settings
 * section, and calls this plugin's own host route with the contract the host
 * half answers (`POST { action: ... }` on the exact path).
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const clientUrl = new URL('../lib/client.js', import.meta.url)
if (!existsSync(fileURLToPath(clientUrl))) {
  throw new Error(`${fileURLToPath(clientUrl)} is missing - run "npm run build" first`)
}

/** Every property read returns the same callable stub, so any import shape works. */
const anyStub = new Proxy(function stub() {}, {
  get: (target, property) => property === 'then' ? undefined : anyStub,
  apply: () => anyStub,
  construct: () => anyStub,
})

/** Load the contribution with a stub module loader (once: ESM caches by URL). */
let contribution
{
  globalThis.window = { __ModuleLoader__: { load: value => { contribution = value } } }
  await import(clientUrl.href)
  assert.ok(contribution !== undefined, 'the bundle never called __ModuleLoader__.load')
  assert.equal(contribution.id, 'dsh-plugin-mcp-settings')
}

/** A cordis-shaped browser context recording what the plugin registers. */
function stubClientContext() {
  const sections = []
  const ctx = {
    effect: callback => callback(),
    locale: { register: () => () => {}, bind: () => key => key },
    remote: {
      pluginManager: {
        listPlugins: async () => ({ ok: true, value: [] }),
        setPluginEnabled: async () => ({ ok: true, value: { changed: true } }),
      },
    },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, component) => { sections.push({ options, component }); return () => {} },
    },
  }
  return { ctx, sections }
}

test('the client bundle registers one Settings section over its own route', async () => {
  const client = contribution.factory(anyStub)
  assert.deepEqual([...client.inject], ['slots', 'locale', 'remote', 'remote.pluginInventory', 'remote.pluginManager'])
  assert.equal(typeof client.apply, 'function')

  const { ctx, sections } = stubClientContext()
  client.apply(ctx)
  assert.equal(sections.length, 1)
  const [section] = sections
  assert.equal(section.options.name, 'settings.section')
  assert.equal(section.options.id, 'mcp-servers')
  assert.equal(section.options.locale, 'settings.mcp')
  assert.equal(typeof section.component, 'function')

  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ ok: true, value: { rows: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    const face = section.options.inject()
    assert.deepEqual(await face.list(), [])
    await face.setEnabled('include:mcp-ghidra', false)
    await face.manage.snapshot()
    await face.manage.add({ serverName: 'exa' })
    await face.manage.remove('mcp-exa')

    assert.deepEqual(calls.map(call => call.url), [
      '/api/plugins/mcp-settings/servers',
      '/api/plugins/mcp-settings/servers',
      '/api/plugins/mcp-settings/servers',
    ])
    assert.equal(calls[0].init.method, 'GET')
    assert.equal(calls[0].init.body, undefined)
    assert.deepEqual(JSON.parse(calls[1].init.body), { action: 'add', server: { serverName: 'exa' } })
    assert.deepEqual(JSON.parse(calls[2].init.body), { action: 'remove', id: 'mcp-exa' })
    assert.equal(calls[1].init.headers['content-type'], 'application/json')
  } finally {
    delete globalThis.fetch
  }
})

test('an unreachable host becomes a refusal, not a throw', async () => {
  const client = contribution.factory(anyStub)
  const { ctx, sections } = stubClientContext()
  client.apply(ctx)

  globalThis.fetch = async () => new Response('unauthorized', { status: 401 })
  try {
    const result = await sections[0].options.inject().manage.snapshot()
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'io-error')
    assert.match(result.error.detail, /401/)
  } finally {
    delete globalThis.fetch
  }
})
