/**
 * The bundled stdio<->SSE bridge against a fake SSE MCP server: the endpoint
 * handshake, reply routing (both stream and POST-body styles), named-event
 * filtering, header forwarding, and the exit contract.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const BRIDGE = fileURLToPath(new URL('../bridge/sse-bridge.mjs', import.meta.url))

/**
 * Start one fake SSE MCP server.
 *
 * @param options - `replyOnPost` answers requests on the POST body instead of
 *   the event stream, covering servers that do both styles.
 * @returns the server's control face.
 */
function startFakeSse({ replyOnPost = false } = {}) {
  return new Promise(resolve => {
    let stream = null
    const seen = []
    const server = createServer((request, response) => {
      if (request.method === 'GET' && request.url === '/sse') {
        seen.push({ kind: 'get', headers: request.headers })
        response.writeHead(200, { 'Content-Type': 'text/event-stream' })
        response.write('event: endpoint\ndata: /message?sessionId=t1\n\n')
        response.write(': keepalive\n\n')
        // A named event whose payload is not JSON-RPC: it must never be
        // forwarded, or the stdio channel would carry junk.
        response.write('event: ping\ndata: {"not":"json-rpc"}\n\n')
        stream = response
        return
      }
      if (request.method === 'POST' && request.url === '/message?sessionId=t1') {
        let body = ''
        request.on('data', chunk => { body += chunk })
        request.on('end', () => {
          const message = JSON.parse(body)
          seen.push({ kind: 'post', headers: request.headers, message })
          if (replyOnPost) {
            response.writeHead(200, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { via: 'post' } }))
          } else {
            response.writeHead(202)
            response.end()
            if (message.id !== undefined) {
              stream.write(`data: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { via: 'stream' } })}\n\n`)
            }
          }
        })
        return
      }
      response.writeHead(404)
      response.end()
    })
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        seen,
        close: () => new Promise(done => server.close(done)),
        destroyStream: () => { stream?.socket?.destroy() },
      })
    })
  })
}

/** Spawn the bridge and return a driver over its stdio. */
function spawnBridge(port, extraArgs = []) {
  const child = spawn(process.execPath, [BRIDGE, `http://127.0.0.1:${port}/sse`, ...extraArgs])
  const state = { stdout: '', stderr: '', exited: undefined }
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', chunk => { state.stdout += chunk })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', chunk => { state.stderr += chunk })
  child.on('exit', code => { state.exited = code })
  return {
    state,
    send: message => { child.stdin.write(`${JSON.stringify(message)}\n`) },
    end: () => { child.stdin.end() },
  }
}

/** Wait until one assertion over the driver state holds, or fail with it. */
async function waitFor(assertion, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      assertion()
      return
    } catch {
      /* not yet */
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  assertion()
}

test('bridge: handshake, stream replies, named events stay out, headers ride along, stdin close exits 0', async () => {
  const fake = await startFakeSse()
  const bridge = spawnBridge(fake.port, ['-H', 'x-test: yes'])
  try {
    bridge.send({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '0' } },
    })
    await waitFor(() => assert.match(bridge.state.stdout, /"id":1/))
    bridge.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    bridge.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    await waitFor(() => assert.match(bridge.state.stdout, /"id":2/))

    assert.ok(!bridge.state.stdout.includes('"not":"json-rpc"'), 'named events must not reach stdout')
    assert.ok(bridge.state.stderr.includes('message endpoint'), 'the handshake must be logged')

    const get = fake.seen.find(entry => entry.kind === 'get')
    assert.equal(get.headers.accept, 'text/event-stream')
    assert.equal(get.headers['x-test'], 'yes')
    const posts = fake.seen.filter(entry => entry.kind === 'post')
    assert.equal(posts.length, 3, 'every stdin line is POSTed exactly once, in order')
    assert.deepEqual(posts.map(entry => entry.message.id), [1, undefined, 2])
    assert.equal(posts[0].headers['content-type'], 'application/json')
    assert.equal(posts[0].headers['x-test'], 'yes')

    bridge.end()
    await waitFor(() => assert.equal(bridge.state.exited, 0))
  } finally {
    await fake.close()
  }
})

test('bridge: a server that answers on the POST body still reaches stdout', async () => {
  const fake = await startFakeSse({ replyOnPost: true })
  const bridge = spawnBridge(fake.port)
  try {
    bridge.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    await waitFor(() => assert.match(bridge.state.stdout, /"via":"post"/))
    bridge.end()
    await waitFor(() => assert.equal(bridge.state.exited, 0))
  } finally {
    await fake.close()
  }
})

test('bridge: a dead SSE stream exits non-zero so the harness respawns it', async () => {
  const fake = await startFakeSse()
  const bridge = spawnBridge(fake.port)
  try {
    await waitFor(() => assert.ok(bridge.state.stderr.includes('message endpoint')))
    fake.destroyStream()
    await waitFor(() => assert.equal(bridge.state.exited, 1))
  } finally {
    await fake.close()
  }
})

test('bridge: an unreachable SSE URL exits non-zero', async () => {
  const bridge = spawnBridge(1)
  await waitFor(() => assert.equal(bridge.state.exited, 1))
})
