/**
 * Wire contract shared by the host half and the browser half of the MCP
 * Servers section.
 *
 * The Add dialog collects one flat *draft* (every field a string, exactly as
 * typed); this module validates that draft, normalizes it into the config
 * `@deepseek-ai/dsh-mcp-client` accepts, and derives the Loader row id. Both
 * halves call {@link validateDraft}, so the browser refuses a bad form before
 * sending it and the host still refuses anything that arrives another way.
 *
 * @module dsh-plugin-mcp-settings/shared/spec
 */
/** Exact fetch route the host half registers on the shared `/api` channel. */
export const SERVERS_PATH = '/api/plugins/mcp-settings/servers';
/** Loader module every row this panel writes names. */
export const MCP_CLIENT_MODULE = '@deepseek-ai/dsh-mcp-client';
/** Prefix of every Loader row id this panel writes. */
export const ROW_ID_PREFIX = 'mcp-';
/** `serverName` budget `@deepseek-ai/dsh-mcp-client` itself enforces. */
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
/** Highest per-call timeout worth storing (2^31 - 1 ms, Node's timer ceiling). */
export const MAX_TOOL_CALL_TIMEOUT_MS = 2_147_483_647;
/** Environment variable names `mcp-client` configs may carry. */
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** HTTP header field names (RFC 7230 tokens). */
const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
/** Characters no stored scalar may contain: YAML indentation and diagnostics stay readable. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
/** The Loader row id one server name owns. */
export function rowIdFor(serverName) {
    return `${ROW_ID_PREFIX}${serverName}`;
}
/** Read a draft field as a trimmed string (empty for anything not a string). */
function field(draft, name) {
    const value = draft[name];
    return typeof value === 'string' ? value.trim() : '';
}
/** Split a textarea value into trimmed, non-blank, non-comment lines. */
function textLines(text) {
    const lines = [];
    for (const [index, raw] of text.split(/\r?\n/).entries()) {
        const value = raw.trim();
        if (value === '' || value.startsWith('#'))
            continue;
        lines.push({ line: index + 1, text: value });
    }
    return lines;
}
/**
 * Strip one pair of matching surrounding quotes from a pasted value.
 *
 * The natural thing to paste into these fields is a block copied out of a
 * YAML config or a shell command line, where values carry `'...'` or `"..."`.
 * Nothing here runs a shell or a YAML parser, so one matching pair around a
 * whole value or argument is dropped; every other quote stays literal.
 */
function unquote(value) {
    if (value.length < 2)
        return value;
    const first = value[0];
    return (first === "'" || first === '"') && value.endsWith(first) ? value.slice(1, -1) : value;
}
/**
 * Split one textarea line into its key and its value.
 *
 * `=` lines (environment) also accept the YAML `KEY: value` shape, because the
 * natural paste into that field is an `env:` block; the colon form applies
 * only when the text before the `=` is not a variable name, so `PATH=C:\bin`
 * keeps splitting on the `=`. A YAML colon is followed by a space or ends the
 * line, which is what tells `KEY: value` apart from a wrapped bare `C:\path`
 * continuation line — the latter stays a problem.
 *
 * @param text - one trimmed, non-blank, non-comment line.
 * @param separator - the character the field's lines split on.
 * @param pattern - the shape the key must satisfy.
 * @returns the pair, or undefined when the line fits neither form.
 */
function splitTextLine(text, separator, pattern) {
    const at = text.indexOf(separator);
    if (at !== -1) {
        const key = text.slice(0, at).trim();
        if (pattern.test(key))
            return { key, value: text.slice(at + 1).trim() };
    }
    if (separator === '=') {
        const space = text.indexOf(': ');
        const bare = text.endsWith(':') ? text.length - 1 : -1;
        const colon = space === -1 ? bare : bare === -1 ? space : Math.min(space, bare);
        if (colon !== -1) {
            const key = text.slice(0, colon).trim();
            if (pattern.test(key))
                return { key, value: text.slice(colon + 1).trim() };
        }
    }
    return undefined;
}
/**
 * Parse `KEY=VALUE` lines (environment) or `Name: value` lines (headers).
 *
 * Environment lines also accept the YAML `KEY: value` shape, and one matching
 * pair of surrounding quotes on a value is dropped (see {@link unquote}).
 * @param text - the textarea value.
 * @param separator - the character splitting each line.
 * @param kind - which pattern the key must satisfy.
 * @returns the parsed pairs and the lines that did not fit.
 */
export function parseKeyValueLines(text, separator, kind) {
    const pattern = kind === 'env' ? ENV_KEY_PATTERN : HEADER_NAME_PATTERN;
    const reason = kind === 'env' ? 'env-line' : 'header-line';
    const seen = new Set();
    const entries = [];
    const problems = [];
    for (const { line, text: value } of textLines(text)) {
        const split = splitTextLine(value, separator, pattern);
        if (split === undefined || seen.has(split.key)) {
            problems.push({ field: kind === 'env' ? 'env' : 'headers', reason, line });
            continue;
        }
        const rest = unquote(split.value);
        if (CONTROL_CHARACTERS.test(rest)) {
            problems.push({ field: kind === 'env' ? 'env' : 'headers', reason: 'control', line });
            continue;
        }
        seen.add(split.key);
        entries.push({ key: split.key, value: rest, line });
    }
    return { entries, problems };
}
/** Parse the one-argument-per-line textarea, dropping one pair of surrounding quotes. */
function parseArguments(text) {
    const args = [];
    const problems = [];
    for (const { line, text: value } of textLines(text)) {
        const argument = unquote(value);
        if (CONTROL_CHARACTERS.test(argument)) {
            problems.push({ field: 'args', reason: 'control', line });
            continue;
        }
        args.push(argument);
    }
    return { args, problems };
}
/** Read the optional per-call timeout. */
function parseTimeout(value) {
    if (value === '')
        return { problems: [] };
    if (!/^[0-9]+$/.test(value) || Number(value) < 1 || Number(value) > MAX_TOOL_CALL_TIMEOUT_MS) {
        return { problems: [{ field: 'toolCallTimeoutMs', reason: 'timeout' }] };
    }
    return { timeout: Number(value), problems: [] };
}
/**
 * Validate one Add-dialog draft and normalize it into a `mcp-client` config.
 * @param input - the untrusted draft (form state on the browser, JSON body on the host).
 * @returns the normalized spec, or every problem the draft has.
 */
export function validateDraft(input) {
    const draft = (typeof input === 'object' && input !== null ? input : {});
    const problems = [];
    const serverName = field(draft, 'serverName');
    if (serverName === '')
        problems.push({ field: 'serverName', reason: 'required' });
    else if (!SERVER_NAME_PATTERN.test(serverName))
        problems.push({ field: 'serverName', reason: 'pattern' });
    const transport = draft.transport === 'streamable-http' ? 'streamable-http'
        : draft.transport === 'stdio' ? 'stdio'
            : draft.transport === 'sse' ? 'sse'
                : undefined;
    if (transport === undefined)
        problems.push({ field: 'transport', reason: 'invalid' });
    const timeout = parseTimeout(field(draft, 'toolCallTimeoutMs'));
    problems.push(...timeout.problems);
    const failOnStartupError = draft.failOnStartupError === true;
    // Both transports share the name and the timeout; only the transport-specific
    // fields differ, and only the selected transport's fields are read.
    if (transport === 'stdio') {
        const command = field(draft, 'command');
        if (command === '')
            problems.push({ field: 'command', reason: 'required' });
        else if (CONTROL_CHARACTERS.test(command))
            problems.push({ field: 'command', reason: 'control' });
        const cwd = field(draft, 'cwd');
        if (CONTROL_CHARACTERS.test(cwd))
            problems.push({ field: 'cwd', reason: 'control' });
        const args = parseArguments(typeof draft.argsText === 'string' ? draft.argsText : '');
        problems.push(...args.problems);
        const env = parseKeyValueLines(typeof draft.envText === 'string' ? draft.envText : '', '=', 'env');
        problems.push(...env.problems);
        if (problems.length > 0)
            return { ok: false, problems };
        return {
            ok: true,
            spec: {
                transport: 'stdio',
                serverName,
                command,
                args: args.args,
                env: Object.fromEntries(env.entries.map(entry => [entry.key, entry.value])),
                cwd,
                ...timeout.timeout === undefined ? {} : { toolCallTimeoutMs: timeout.timeout },
                failOnStartupError,
            },
        };
    }
    // HTTP and SSE collect the same fields; an SSE row becomes bridged stdio
    // when the host renders it, not here, so both halves validate identically.
    if (transport === 'streamable-http' || transport === 'sse') {
        const url = field(draft, 'url');
        if (url === '')
            problems.push({ field: 'url', reason: 'required' });
        else if (CONTROL_CHARACTERS.test(url) || !isHttpUrl(url))
            problems.push({ field: 'url', reason: 'invalid' });
        const headers = parseKeyValueLines(typeof draft.headersText === 'string' ? draft.headersText : '', ':', 'header');
        problems.push(...headers.problems);
        if (problems.length > 0)
            return { ok: false, problems };
        return {
            ok: true,
            spec: {
                transport,
                serverName,
                url,
                headers: Object.fromEntries(headers.entries.map(entry => [entry.key, entry.value])),
                ...timeout.timeout === undefined ? {} : { toolCallTimeoutMs: timeout.timeout },
                failOnStartupError,
            },
        };
    }
    return { ok: false, problems };
}
/** Whether a value parses as an absolute http(s) URL. */
export function isHttpUrl(value) {
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        return false;
    }
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}
/** An empty draft, for the Add dialog's initial state. */
export function emptyDraft() {
    return {
        serverName: '',
        transport: 'stdio',
        command: '',
        argsText: '',
        envText: '',
        cwd: '',
        url: '',
        headersText: '',
        toolCallTimeoutMs: '',
        failOnStartupError: false,
    };
}
/** Render one string record as a textarea body. */
function recordLines(record, separator) {
    return Object.entries(record)
        .map(([key, value]) => (separator === '=' ? `${key}=${value}` : `${key}: ${value}`))
        .join('\n');
}
/** A string record, or undefined when the value is not one this form can round-trip. */
function recordOf(value) {
    if (value === undefined || value === null)
        return {};
    if (typeof value !== 'object' || Array.isArray(value))
        return undefined;
    const record = {};
    for (const [key, entry] of Object.entries(value)) {
        if (typeof entry !== 'string' || CONTROL_CHARACTERS.test(entry) || CONTROL_CHARACTERS.test(key))
            return undefined;
        record[key] = entry;
    }
    return record;
}
/**
 * The SSE facts of one live `mcp-client` config, when it is a bridged SSE row.
 *
 * Identity is the bridge script as the first argument; the command is not
 * compared, so a row written under an older Node still reads as SSE.
 *
 * @param config - the entry's resolved config, of unknown shape.
 * @param bridge - the bridge the host would launch; without it nothing matches.
 * @returns the URL and headers, or undefined when the config is not a bridged
 *   SSE row this form can present.
 */
export function sseOfStdioConfig(config, bridge) {
    if (bridge === undefined)
        return undefined;
    const args = config.args;
    if (!Array.isArray(args) || args.length < 2)
        return undefined;
    const [script, url, ...rest] = args;
    if (script !== bridge.script)
        return undefined;
    if (typeof url !== 'string' || !isHttpUrl(url))
        return undefined;
    // Extra environment or a working directory would be lost by the SSE form,
    // so such a row stays a plain stdio one.
    const env = config.env;
    if (env !== undefined
        && (typeof env !== 'object' || env === null || Array.isArray(env) || Object.keys(env).length > 0)) {
        return undefined;
    }
    const cwd = config.cwd;
    if (typeof cwd === 'string' && cwd !== '')
        return undefined;
    const headers = {};
    for (let at = 0; at < rest.length; at += 2) {
        if (rest[at] !== '-H' || at + 1 >= rest.length)
            return undefined;
        const header = rest[at + 1];
        if (typeof header !== 'string')
            return undefined;
        const colon = header.indexOf(':');
        if (colon <= 0)
            return undefined;
        headers[header.slice(0, colon).trim()] = header.slice(colon + 1).trim();
    }
    return { url, headers };
}
/** Which transport one live `mcp-client` config effectively uses. */
export function transportOfConfig(config, bridge) {
    if (typeof config !== 'object' || config === null || Array.isArray(config))
        return undefined;
    const value = config;
    if (value.transport === 'streamable-http')
        return 'streamable-http';
    if (value.transport === 'stdio') {
        return sseOfStdioConfig(value, bridge) !== undefined ? 'sse' : 'stdio';
    }
    return undefined;
}
/**
 * Turn one resolved `mcp-client` config back into the dialog's flat draft.
 *
 * The host reads this from the live Loader entry rather than from the patch
 * file: the loader has already interpolated `!!js` expressions and applied the
 * schema's defaults, so the form opens on the values the running server uses.
 * (A row whose *file text* carries `!!js` is refused before this is called,
 * because writing the interpolated value back would flatten the expression.)
 *
 * @param config - the entry's resolved `config`, of unknown shape.
 * @returns the draft, or undefined when the shape is not one this form can edit.
 */
export function draftOfConfig(config, bridge) {
    if (typeof config !== 'object' || config === null || Array.isArray(config))
        return undefined;
    const value = config;
    const serverName = typeof value.serverName === 'string' ? value.serverName : undefined;
    if (serverName === undefined)
        return undefined;
    const transport = value.transport === 'streamable-http' ? 'streamable-http'
        : value.transport === 'stdio' ? 'stdio' : undefined;
    if (transport === undefined)
        return undefined;
    const timeout = typeof value.toolCallTimeoutMs === 'number' && Number.isSafeInteger(value.toolCallTimeoutMs)
        ? String(value.toolCallTimeoutMs)
        : '';
    const base = {
        serverName,
        transport,
        toolCallTimeoutMs: timeout,
        failOnStartupError: value.failOnStartupError === true,
    };
    if (transport === 'stdio') {
        // A bridged SSE row keeps presenting as the transport the user chose, not
        // as the bridge's command line; anything the SSE form cannot carry falls
        // through to the plain stdio shape below, which round-trips it verbatim.
        const sse = sseOfStdioConfig(value, bridge);
        if (sse !== undefined) {
            return {
                ...base,
                transport: 'sse',
                command: '',
                argsText: '',
                envText: '',
                cwd: '',
                url: sse.url,
                headersText: recordLines(sse.headers, ':'),
            };
        }
        const command = value.command;
        if (typeof command !== 'string' || CONTROL_CHARACTERS.test(command))
            return undefined;
        const args = value.args === undefined
            ? []
            : Array.isArray(value.args)
                && value.args.every(argument => typeof argument === 'string' && !CONTROL_CHARACTERS.test(argument))
                ? value.args
                : undefined;
        if (args === undefined)
            return undefined;
        const env = recordOf(value.env);
        if (env === undefined)
            return undefined;
        return {
            ...base,
            command,
            argsText: args.join('\n'),
            envText: recordLines(env, '='),
            cwd: typeof value.cwd === 'string' && !CONTROL_CHARACTERS.test(value.cwd) ? value.cwd : '',
            url: '',
            headersText: '',
        };
    }
    const url = typeof value.url === 'string' ? value.url : undefined;
    if (url === undefined)
        return undefined;
    const headers = recordOf(value.headers);
    if (headers === undefined)
        return undefined;
    return {
        ...base,
        command: '',
        argsText: '',
        envText: '',
        cwd: '',
        url,
        headersText: recordLines(headers, ':'),
    };
}
//# sourceMappingURL=spec.js.map