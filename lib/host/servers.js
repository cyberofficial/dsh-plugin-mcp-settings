/**
 * The host half's MCP server manager: snapshot, add, and remove.
 *
 * Every mutation is a read-modify-write of one patch file through
 * {@link PatchStore} (the filesystem in production, a Map in tests), performed
 * one at a time so two clicks can never interleave. The composed Loader tree
 * follows from the file: `patchReload: live` makes the HMR watcher recompose
 * the profile when the patch file changes.
 *
 * @module dsh-plugin-mcp-settings/host/servers
 */
import { MCP_CLIENT_MODULE, rowIdFor, validateDraft, } from '../shared/spec.js';
import { appendServerBlock, blockBeginMarker, blockEndMarker, listMcpRows, PatchShapeError, removeMcpRow, } from './patch-text.js';
/** An expected refusal, carried to the browser as a structured error. */
export class ServersFault extends Error {
    code;
    problems;
    detail;
    constructor(code, problems, detail) {
        super(detail ?? code);
        this.code = code;
        this.problems = problems;
        this.detail = detail;
        this.name = 'ServersFault';
    }
}
/** The HTTP status one refusal is reported with. */
export function statusOf(code) {
    switch (code) {
        case 'invalid-spec':
        case 'bad-request': return 400;
        case 'not-found': return 404;
        case 'duplicate-id':
        case 'duplicate-name':
        case 'ambiguous':
        case 'unsupported': return 409;
        case 'no-profile': return 503;
        case 'io-error': return 500;
    }
}
/** Render one YAML scalar, single-quoted unless plainly safe. */
function scalar(value) {
    const plain = /^[A-Za-z0-9_][A-Za-z0-9_./\\-]*$/.test(value);
    const reserved = /^(?:true|false|null|yes|no|on|off|y|n|~)$/i.test(value) || /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value);
    if (value !== '' && plain && !reserved)
        return value;
    return `'${value.replace(/'/g, "''")}'`;
}
/** One `key: value` line at the given indent. */
function entry(indent, key, value) {
    return `${' '.repeat(indent)}${key}: ${scalar(value)}`;
}
/** The canonical, marker-delimited `insert` block for one server. */
export function renderServerBlock(spec) {
    const id = rowIdFor(spec.serverName);
    const lines = [
        blockBeginMarker(id),
        '# Added by the MCP Servers settings panel. Edit or delete this whole block there.',
        '- insert:',
        `    - id: ${id}`,
        `      name: '${MCP_CLIENT_MODULE}'`,
        '      config:',
        entry(8, 'serverName', spec.serverName),
        entry(8, 'transport', spec.transport),
    ];
    if (spec.transport === 'stdio') {
        lines.push(entry(8, 'command', spec.command));
        if (spec.args.length > 0) {
            lines.push('        args:');
            for (const argument of spec.args)
                lines.push(`          - ${scalar(argument)}`);
        }
        const env = Object.entries(spec.env);
        if (env.length > 0) {
            lines.push('        env:');
            for (const [key, value] of env)
                lines.push(entry(10, key, value));
        }
        if (spec.cwd !== '')
            lines.push(entry(8, 'cwd', spec.cwd));
    }
    else {
        lines.push(entry(8, 'url', spec.url));
        const headers = Object.entries(spec.headers);
        if (headers.length > 0) {
            lines.push('        headers:');
            for (const [key, value] of headers)
                lines.push(entry(10, key, value));
        }
    }
    const timeout = spec.toolCallTimeoutMs;
    if (timeout !== undefined)
        lines.push(`        toolCallTimeoutMs: ${String(timeout)}`);
    if (spec.failOnStartupError)
        lines.push('        failOnStartupError: true');
    lines.push(blockEndMarker(id));
    return lines.join('\n');
}
/**
 * Build the host half's manager over one profile.
 * @param options - patch layers, store, and the live-row reader.
 * @returns the service answering the plugin's exact fetch route.
 */
export function createServersService(options) {
    const { files, store } = options;
    let queue = Promise.resolve();
    /** Run one mutation after every earlier one settled. */
    function exclusive(task) {
        const run = queue.then(task, task);
        queue = run.then(() => undefined, () => undefined);
        return run;
    }
    /** Read one layer, mapping a missing file to undefined. */
    async function readLayer(path) {
        try {
            return await store.read(path);
        }
        catch (error) {
            throw new ServersFault('io-error', undefined, `${path}: ${messageOf(error)}`);
        }
    }
    /** Write one layer, mapping a filesystem failure to a structured refusal. */
    async function writeLayer(path, text) {
        try {
            await store.write(path, text);
        }
        catch (error) {
            throw new ServersFault('io-error', undefined, `${path}: ${messageOf(error)}`);
        }
    }
    /** The layers in edit order: the profile's own first, the home layer second. */
    function layers() {
        if (files === undefined)
            throw new ServersFault('no-profile');
        return [{ kind: 'profile', path: files.profile }, { kind: 'home', path: files.home }];
    }
    /** Every row id either layer declares, whether inserted or overridden. */
    async function declaredIds() {
        const ids = new Set();
        for (const layer of layers()) {
            const text = await readLayer(layer.path);
            if (text === undefined)
                continue;
            for (const row of listMcpRows(text))
                ids.add(row.id);
        }
        return ids;
    }
    async function snapshot() {
        const [profileLayer, homeLayer] = layers();
        const rows = [];
        for (const layer of [profileLayer, homeLayer]) {
            const text = await readLayer(layer.path);
            if (text === undefined)
                continue;
            for (const row of listMcpRows(text))
                rows.push({ id: row.id, file: layer.kind, managed: row.managed });
        }
        return {
            patchPath: profileLayer.path,
            homePatchPath: homeLayer.path,
            live: options.hotReload?.() ?? false,
            rows,
        };
    }
    async function add(server) {
        const result = validateDraft(server);
        if (!result.ok)
            throw new ServersFault('invalid-spec', result.problems);
        const spec = result.spec;
        const id = rowIdFor(spec.serverName);
        const [profileLayer] = layers();
        const existing = await readLayer(profileLayer.path);
        if ((await declaredIds()).has(id)) {
            throw new ServersFault('duplicate-id', undefined, id);
        }
        const live = options.live();
        if (live.ids.includes(id))
            throw new ServersFault('duplicate-id', undefined, id);
        if (live.serverNames.includes(spec.serverName)) {
            throw new ServersFault('duplicate-name', undefined, spec.serverName);
        }
        try {
            await writeLayer(profileLayer.path, appendServerBlock(existing, renderServerBlock(spec)));
        }
        catch (error) {
            if (error instanceof PatchShapeError)
                throw new ServersFault('unsupported', undefined, error.message);
            throw error;
        }
        return { id, file: profileLayer.kind, removed: [] };
    }
    async function remove(id) {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new ServersFault('bad-request', undefined, 'expected { "action": "remove", "id": string }');
        }
        const target = id.trim();
        for (const layer of layers()) {
            const text = await readLayer(layer.path);
            if (text === undefined)
                continue;
            const removal = removeMcpRow(text, target);
            if (removal === undefined)
                continue;
            await writeLayer(layer.path, removal.text);
            return { id: target, file: layer.kind, removed: removal.removed };
        }
        throw new ServersFault('not-found', undefined, target);
    }
    /** The refusal body one fault reports. */
    function bodyOf(error) {
        return {
            code: error.code,
            ...error.problems === undefined ? {} : { problems: error.problems },
            ...error.detail === undefined ? {} : { detail: error.detail },
        };
    }
    /** Fold one operation into the wire answer, keeping unexpected errors visible. */
    async function answer(operation) {
        try {
            return Response.json({ ok: true, value: await operation() });
        }
        catch (error) {
            if (error instanceof ServersFault) {
                return Response.json({ ok: false, error: bodyOf(error) }, { status: statusOf(error.code) });
            }
            const detail = messageOf(error);
            return Response.json({ ok: false, error: { code: 'io-error', detail } }, { status: statusOf('io-error') });
        }
    }
    return {
        async request(request) {
            if (request.method === 'GET')
                return answer(snapshot);
            if (request.method !== 'POST') {
                return Response.json({ ok: false, error: { code: 'bad-request', detail: `${request.method} is not supported` } }, { status: statusOf('bad-request') });
            }
            let body;
            try {
                body = await request.json();
            }
            catch {
                return answer(() => { throw new ServersFault('bad-request', undefined, 'the request body must be JSON'); });
            }
            const action = typeof body === 'object' && body !== null ? body.action : undefined;
            if (action === 'add')
                return answer(() => exclusive(() => add(body.server)));
            if (action === 'remove')
                return answer(() => exclusive(() => remove(body.id)));
            return answer(() => { throw new ServersFault('bad-request', undefined, 'expected { "action": "add" | "remove" }'); });
        },
    };
}
/** Exact diagnostic of anything thrown. */
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=servers.js.map