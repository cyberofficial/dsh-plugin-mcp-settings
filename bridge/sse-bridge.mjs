#!/usr/bin/env node
/**
 * stdio <-> SSE bridge for legacy MCP HTTP+SSE servers.
 *
 * The DeepSeek Harness MCP client speaks stdio and Streamable HTTP only. This
 * bridge lets it use a server that still speaks the deprecated HTTP+SSE
 * transport: the client GETs the SSE URL, the stream announces the POST target
 * with an `event: endpoint` event, and every JSON-RPC message is POSTed there.
 *
 * Both directions:
 * - stdio -> SSE: every stdin JSON-RPC line is POSTed to the announced message
 *   endpoint as `application/json`. A reply delivered on the POST body (some
 *   servers do this as well as the stream) is forwarded to stdout; per the
 *   transport spec the reply normally arrives later as a default SSE `data:`
 *   event.
 * - SSE -> stdio: default (unnamed) `data:` events are written to stdout as
 *   JSON lines. The `endpoint` event sets the POST target. Named events and
 *   comment keepalive lines are ignored, so nothing but JSON-RPC ever reaches
 *   the stdio channel.
 *
 * Messages that arrive on stdin before the endpoint event are queued and
 * flushed the moment it arrives, so a client that sends `initialize`
 * immediately on spawn loses nothing.
 *
 * Usage: node sse-bridge.mjs <sse-url> [-H 'Name: value']...
 *   <sse-url>  the full SSE endpoint URL, e.g. http://127.0.0.1:50300/sse
 *   -H         extra HTTP header attached to both the SSE GET and every POST;
 *              repeatable
 *
 * Exit codes: 0 when stdin closes (the parent is shutting the transport
 * down), 1 when the SSE stream ends or fails (the harness's mcp-client
 * reconnect policy then respawns the bridge, which opens a fresh session).
 */

/** Terminate the bridge, aborting the SSE stream exactly once. */
let settled = false
function die(code, reason) {
  if (settled) return
  settled = true
  process.stderr.write(`sse-bridge: ${reason}\n`)
  controller.abort()
  process.exit(code)
}

process.title = 'dsh-sse-bridge'

// ---- Argument parsing -------------------------------------------------------

const raw = process.argv.slice(2)
if (raw.length === 0 || raw[0].startsWith('-')) {
  process.stderr.write('usage: node sse-bridge.mjs <sse-url> [-H \'Name: value\']...\n')
  process.exit(2)
}
const sseUrl = raw[0]

const headerEntries = []
for (let at = 1; at < raw.length; at += 2) {
  if (raw[at] !== '-H' || at + 1 >= raw.length) {
    process.stderr.write('usage: node sse-bridge.mjs <sse-url> [-H \'Name: value\']...\n')
    process.exit(2)
  }
  const header = raw[at + 1]
  const colon = header.indexOf(':')
  if (colon <= 0) {
    process.stderr.write(`sse-bridge: -H expects 'Name: value', got: ${header}\n`)
    process.exit(2)
  }
  headerEntries.push([header.slice(0, colon).trim(), header.slice(colon + 1).trim()])
}
const headers = Object.fromEntries(headerEntries)

// ---- stdio side: stdin JSON-RPC lines -> POSTs ------------------------------

const pending = []
let endpoint

/** Whether one JSON-RPC line is a request (its response would be lost if the POST failed). */
function isRequest(line) {
  try {
    const message = JSON.parse(line)
    return typeof message === 'object' && message !== null && message.id !== undefined
  } catch {
    return false
  }
}

let postQueue = Promise.resolve()

/** POST one line to the message endpoint, serializing concurrent sends. */
function deliver(line) {
  postQueue = postQueue.then(async () => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: line,
      })
      if (!response.ok) {
        process.stderr.write(`sse-bridge: POST ${endpoint} -> HTTP ${response.status}\n`)
        if (isRequest(line)) die(1, `request rejected with HTTP ${response.status}; its response can never arrive`)
        return
      }
      // Some SSE servers also deliver the reply on the POST body; forward it
      // when it is a JSON-RPC message so both styles work.
      const body = await response.text()
      if (body !== '') {
        try {
          const message = JSON.parse(body)
          if (typeof message === 'object' && message !== null && message.jsonrpc === '2.0') {
            process.stdout.write(`${JSON.stringify(message)}\n`)
          }
        } catch {
          /* a non-JSON body is not a JSON-RPC reply; the stream owns the answer */
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      process.stderr.write(`sse-bridge: POST failed: ${reason}\n`)
      if (isRequest(line)) die(1, `POST failed: ${reason}; its response can never arrive`)
    }
  })
}

let stdinBuffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => {
  stdinBuffer += chunk
  let at
  while ((at = stdinBuffer.indexOf('\n')) !== -1) {
    const line = stdinBuffer.slice(0, at).replace(/\r$/, '')
    stdinBuffer = stdinBuffer.slice(at + 1)
    if (line.trim() === '') continue
    if (endpoint === undefined) pending.push(line)
    else deliver(line)
  }
})
process.stdin.on('end', () => die(0, 'stdin closed'))
process.stdin.on('error', error => die(1, `stdin: ${error instanceof Error ? error.message : String(error)}`))

// ---- SSE side: the event stream -> stdout ------------------------------------

const controller = new AbortController()

/** Apply one complete SSE event: the endpoint announcement, or a JSON-RPC line. */
function dispatch(eventName, dataLines) {
  if (dataLines.length === 0) return
  const data = dataLines.join('\n')
  if (eventName === 'endpoint') {
    endpoint = new URL(data, sseUrl).toString()
    process.stderr.write(`sse-bridge: message endpoint ${endpoint}\n`)
    const queued = pending.splice(0)
    for (const line of queued) deliver(line)
  } else if (eventName === '') {
    process.stdout.write(`${data}\n`)
  }
  /* other named events are not JSON-RPC; ignoring them keeps stdout clean */
}

try {
  const response = await fetch(sseUrl, {
    headers: { Accept: 'text/event-stream', ...headers },
    signal: controller.signal,
  })
  if (!response.ok) die(1, `SSE GET ${sseUrl} -> HTTP ${response.status}`)
  if (response.body === null) die(1, `SSE GET ${sseUrl} returned no body`)
  process.stderr.write(`sse-bridge: connected to ${sseUrl}\n`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let streamText = ''
  let eventName = ''
  let dataLines = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) die(1, 'SSE stream ended')
    streamText += decoder.decode(value, { stream: true })
    let at
    while ((at = streamText.indexOf('\n')) !== -1) {
      const line = streamText.slice(0, at).replace(/\r$/, '')
      streamText = streamText.slice(at + 1)
      if (line === '') {
        dispatch(eventName, dataLines)
        eventName = ''
        dataLines = []
        continue
      }
      if (line.startsWith(':')) continue // comment / keepalive
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).replace(/^ /, '')
        continue
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).replace(/^ /, ''))
        continue
      }
      /* any other field (id:, retry:) is not part of the MCP transport */
    }
  }
} catch (error) {
  if (!settled) {
    const reason = error instanceof Error ? error.message : String(error)
    die(1, `SSE stream failed: ${reason}`)
  }
}

process.on('unhandledRejection', reason => {
  die(1, `unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`)
})
