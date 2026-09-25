/**
 * Patch-file editing tests.
 *
 * These run against the built host half (`lib/host/patch-text.js`) and check
 * three promises: an appended block leaves every existing line alone, a removal
 * cuts exactly one server's lines (its `insert` row and its enablement
 * override), and the result still parses as the harness's patch dialect.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { commentLines, insertedConfigs, loadYaml, parsePatch } from './helpers.mjs'

const libUrl = new URL('../lib/host/patch-text.js', import.meta.url)
if (!existsSync(fileURLToPath(libUrl))) {
  throw new Error(`${fileURLToPath(libUrl)} is missing - run "npm run build" first`)
}
const { appendServerBlock, listMcpRows, PatchShapeError, removeMcpRow } = await import(libUrl.href)
const { renderServerBlock } = await import(new URL('../lib/host/servers.js', import.meta.url).href)

const yaml = await loadYaml()
const skip = yaml === undefined ? 'the harness checkout provides no yaml parser' : false

/** A profile patch shaped like a real one: banner comments, a hand-written row, overrides. */
const FIXTURE = `# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries.

# ---------------------------------------------------------------------------
# ghidra-mcp - Ghidra reverse-engineering tools
# ---------------------------------------------------------------------------
- insert:
    - id: mcp-ghidra
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: ghidra
        transport: stdio
        command: 'D:\\tools\\ghidra-mcp\\.venv\\Scripts\\python.exe'
        args: [ '-m', 'bridge_mcp_ghidra', '--transport', 'stdio' ]
        cwd: 'D:\\tools\\ghidra-mcp'
        env:
          GHIDRA_MCP_URL: 'http://127.0.0.1:8089'
        # The bridge's own per-endpoint budgets reach 300s.
        toolCallTimeoutMs: 300000
# A comment between two items.
- id: plugin-provider-disable
  disabled: false
- id: ui-theme
  name: "@deepseek-ai/dsh-client-ui-theme"
  config:
    preference: dark
- id: mcp-ghidra
  disabled: false
`

/** The two-row insert a bundle-style patch may carry. */
const SHARED_INSERT = `- insert:
    - id: mcp-one
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: one
        transport: stdio
        command: node
    # keep this comment with the second row
    - id: mcp-two
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: two
        transport: stdio
        command: node
- id: plugin-mcp-settings
  disabled: false
`

/** Strip trailing blank lines so two texts can be compared without noise. */
function normalize(text) {
  return `${text.replace(/(\r?\n)+$/, '').replace(/\r\n/g, '\n')}\n`
}

test('listMcpRows finds inserted mcp-client rows and nothing else', () => {
  assert.deepEqual(listMcpRows(FIXTURE), [{ id: 'mcp-ghidra', managed: false }])
  assert.deepEqual(listMcpRows('[]\n'), [])
  assert.deepEqual(listMcpRows('- id: mcp-alone\n  disabled: true\n'), [])
})

test('an appended block keeps every existing line and parses', { skip }, () => {
  const block = renderServerBlock({
    transport: 'stdio',
    serverName: 'exa',
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    env: { EXA_API_KEY: 'key with spaces # and: colons' },
    cwd: 'C:\\work dir',
    toolCallTimeoutMs: 300000,
    failOnStartupError: true,
  })
  const appended = appendServerBlock(FIXTURE, block)
  // Nothing already in the file moved.
  assert.ok(appended.startsWith(FIXTURE.trimEnd()))
  assert.deepEqual(commentLines(appended).slice(0, commentLines(FIXTURE).length), commentLines(FIXTURE))

  const parsed = parsePatch(yaml, appended)
  const rows = insertedConfigs(parsed)
  assert.deepEqual(rows.map(row => row.id), ['mcp-ghidra', 'mcp-exa'])
  const exa = rows[1].config
  assert.equal(exa.transport, 'stdio')
  assert.equal(exa.command, 'npx')
  assert.deepEqual(exa.args, ['-y', 'exa-mcp-server'])
  assert.equal(exa.env.EXA_API_KEY, 'key with spaces # and: colons')
  assert.equal(exa.cwd, 'C:\\work dir')
  assert.equal(exa.toolCallTimeoutMs, 300000)
  assert.equal(exa.failOnStartupError, true)
  assert.equal(listMcpRows(appended).find(row => row.id === 'mcp-exa').managed, true)
})

test('an appended HTTP block carries custom headers, the Exa API-key case', { skip }, () => {
  const block = renderServerBlock({
    transport: 'streamable-http',
    serverName: 'exa',
    url: 'https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,agent_run',
    headers: { 'x-api-key': 'YOUR_EXA_API_KEY', Authorization: 'Bearer YOUR_EXA_API_KEY' },
    failOnStartupError: false,
  })
  const parsed = parsePatch(yaml, appendServerBlock(undefined, block))
  const [row] = insertedConfigs(parsed)
  assert.equal(row.id, 'mcp-exa')
  assert.equal(row.config.transport, 'streamable-http')
  assert.equal(row.config.url, 'https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,agent_run')
  assert.deepEqual(row.config.headers, {
    'x-api-key': 'YOUR_EXA_API_KEY',
    Authorization: 'Bearer YOUR_EXA_API_KEY',
  })
})

test('removal cuts the hand-written row and its override, leaving comments', { skip }, () => {
  const removal = removeMcpRow(FIXTURE, 'mcp-ghidra')
  assert.deepEqual(removal.removed, ['row', 'override'])
  assert.ok(!removal.text.includes('mcp-ghidra'))
  assert.ok(removal.text.includes('plugin-provider-disable'))
  assert.ok(removal.text.includes('ui-theme'))
  // Every comment the file carried survives; only the removed row's own
  // indented note goes with the row.
  assert.deepEqual(
    commentLines(removal.text),
    commentLines(FIXTURE).filter(line => !line.includes('per-endpoint budgets')),
  )
  assert.deepEqual(insertedConfigs(parsePatch(yaml, removal.text)), [])
  assert.ok(removal.text.includes('preference: dark'))
})

test('removing the last row of a file leaves a valid empty patch array', { skip }, () => {
  const removal = removeMcpRow(SHARED_INSERT.replace(/- id: plugin-mcp-settings\n  disabled: false\n/, ''), 'mcp-one')
  assert.deepEqual(removal.removed, ['row'])
  const both = removeMcpRow(removal.text, 'mcp-two')
  assert.equal(both.text, '[]\n')
  assert.deepEqual(parsePatch(yaml, both.text), [])
})

test('a managed block round-trips: append then remove restores the file', { skip }, () => {
  const block = renderServerBlock({
    transport: 'stdio',
    serverName: 'round-trip',
    command: 'node',
    args: [],
    env: {},
    cwd: '',
    failOnStartupError: false,
  })
  const appended = appendServerBlock(FIXTURE, block)
  const removal = removeMcpRow(appended, 'mcp-round-trip')
  assert.deepEqual(removal.removed, ['row'])
  assert.equal(normalize(removal.text), normalize(FIXTURE))
  assert.deepEqual(listMcpRows(removal.text), listMcpRows(FIXTURE))
  parsePatch(yaml, removal.text)
})

test('removing one row of a shared insert keeps its sibling and the wrapper', { skip }, () => {
  const removal = removeMcpRow(SHARED_INSERT, 'mcp-two')
  assert.deepEqual(removal.removed, ['row'])
  const parsed = parsePatch(yaml, removal.text)
  assert.deepEqual(insertedConfigs(parsed).map(row => row.id), ['mcp-one'])
  assert.ok(removal.text.includes('# keep this comment with the second row'))
  assert.ok(removal.text.includes('plugin-mcp-settings'))

  // Removing the last inserted row removes the wrapper item as well.
  const both = removeMcpRow(removal.text, 'mcp-one')
  assert.ok(!both.text.includes('insert:'))
  assert.deepEqual(parsePatch(yaml, both.text), [{ id: 'plugin-mcp-settings', disabled: false }])
})

test('removal reports an override-only row and refuses an unknown id', () => {
  const onlyOverride = '- id: mcp-gone\n  disabled: true\n- id: other\n'
  const removal = removeMcpRow(onlyOverride, 'mcp-gone')
  assert.deepEqual(removal.removed, ['override'])
  assert.equal(normalize(removal.text), normalize('- id: other\n'))
  assert.equal(removeMcpRow(FIXTURE, 'mcp-absent'), undefined)
})

test('CRLF files keep CRLF line endings through both edits', () => {
  const crlf = FIXTURE.replace(/\n/g, '\r\n')
  const block = renderServerBlock({
    transport: 'stdio',
    serverName: 'crlf',
    command: 'node',
    args: [],
    env: {},
    cwd: '',
    failOnStartupError: false,
  })
  const appended = appendServerBlock(crlf, block)
  assert.ok(appended.includes('\r\n'))
  assert.equal(appended.split('\r\n').length > 1, true)
  assert.ok(!/[^\r]\n/.test(appended), 'a bare LF appeared in a CRLF file')
  const removal = removeMcpRow(appended, 'mcp-crlf')
  assert.ok(!/[^\r]\n/.test(removal.text))
  assert.equal(normalize(removal.text), normalize(FIXTURE))
})

test('an empty or placeholder patch file accepts the first block', { skip }, () => {
  const block = renderServerBlock({
    transport: 'stdio',
    serverName: 'first',
    command: 'node',
    args: [],
    env: {},
    cwd: '',
    failOnStartupError: false,
  })
  for (const text of [undefined, '', '\n', '# only a comment\n', '[]\n', '[]']) {
    const parsed = parsePatch(yaml, appendServerBlock(text, block))
    assert.deepEqual(insertedConfigs(parsed).map(row => row.id), ['mcp-first'], `input: ${String(text)}`)
  }
  assert.throws(() => appendServerBlock('preference: dark\n', block), PatchShapeError)
})

test('a comment between the insert key and its row is treated as part of the item', () => {
  const text = '- insert:\n  # the row follows\n    - id: mcp-after-comment\n      name: \'@deepseek-ai/dsh-mcp-client\'\n      config:\n        serverName: after\n'
  assert.deepEqual(listMcpRows(text), [{ id: 'mcp-after-comment', managed: false }])
  const removal = removeMcpRow(text, 'mcp-after-comment')
  assert.ok(!removal.text.includes('mcp-after-comment'))
})
