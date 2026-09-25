/**
 * The host half's MCP server manager: snapshot, inspect, add, edit, and remove.
 *
 * Every mutation is a read-modify-write of one patch file through
 * {@link PatchStore} (the filesystem in production, a Map in tests), performed
 * one at a time so two clicks can never interleave. The composed Loader tree
 * follows from the file: `patchReload: live` makes the HMR watcher recompose
 * the profile when the patch file changes.
 *
 * @module dsh-plugin-mcp-settings/host/servers
 */
import { draftOfConfig, emptyDraft, MCP_CLIENT_MODULE, rowIdFor, validateDraft, } from '../shared/spec.js';
import { appendServerBlock, blockBeginMarker, blockEndMarker, findMcpRow, listMcpRows, PatchShapeError, removeMcpRow, rewriteMcpRow, yamlScalar, } from './patch-text.js';
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
/** One `key: value` line at the given indent. */
function entry(indent, key, value) {
    return `${' '.repeat(indent)}${key}: ${yamlScalar(value)}`;
}
/** The `config:` mapping of one server, as lines indented from the given base. */
function configLines(spec, indent) {
    const pad = ' '.repeat(indent);
    const lines = [
        entry(indent, 'serverName', spec.serverName),
        entry(indent, 'transport', spec.transport),
    ];
    if (spec.transport === 'stdio') {
        lines.push(entry(indent, 'command', spec.command));
        if (spec.args.length > 0) {
            lines.push(`${pad}args:`);
            for (const argument of spec.args)
                lines.push(`${' '.repeat(indent + 2)}- ${yamlScalar(argument)}`);
        }
        const env = Object.entries(spec.env);
        if (env.length > 0) {
            lines.push(`${pad}env:`);
            for (const [key, value] of env)
                lines.push(entry(indent + 2, key, value));
        }
        if (spec.cwd !== '')
            lines.push(entry(indent, 'cwd', spec.cwd));
    }
    else {
        lines.push(entry(indent, 'url', spec.url));
        const headers = Object.entries(spec.headers);
        if (headers.length > 0) {
            lines.push(`${pad}headers:`);
            for (const [key, value] of headers)
                lines.push(entry(indent + 2, key, value));
        }
    }
    const timeout = spec.toolCallTimeoutMs;
    if (timeout !== undefined)
        lines.push(`${pad}toolCallTimeoutMs: ${String(timeout)}`);
    if (spec.failOnStartupError)
        lines.push(`${pad}failOnStartupError: true`);
    return lines;
}
/** The `config:` body of one server at zero base indent, for an in-place row rewrite. */
export function configBodyLines(spec) {
    return configLines(spec, 0);
}
/** The canonical, marker-delimited `insert` block for one server. */
export function renderServerBlock(spec) {
    const id = rowIdFor(spec.serverName);
    return [
        blockBeginMarker(id),
        '# Added by the MCP Servers settings panel. Edit or delete this whole block there.',
        '- insert:',
        `    - id: ${id}`,
        `      name: '${MCP_CLIENT_MODULE}'`,
        '      config:',
        ...configLines(spec, 8),
        blockEndMarker(id),
    ].join('\n');
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
    /** Find the layer that declares one row, with its location and `!!js` usage. */
    async function locate(id) {
        for (const layer of layers()) {
            const text = await readLayer(layer.path);
            if (text === undefined)
                continue;
            const location = findMcpRow(text, id);
            if (location === undefined)
                continue;
            const span = location.block ?? location.item;
            const lines = text.split(/\r?\n/);
            return {
                layer,
                text,
                location,
                // A `!!js` value would be written back as its interpolated result, so
                // such a row is reported as uneditable from here.
                jsExpression: lines.slice(span.start, span.end + 1).some(line => line.includes('!!js')),
            };
        }
        return undefined;
    }
    /** Read one row id from the request body. */
    function requireId(id, action) {
        if (typeof id !== 'string' || id.trim() === '') {
            throw new ServersFault('bad-request', undefined, `expected { "action": "${action}", "id": string }`);
        }
        return id.trim();
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
    /** Read the values the edit form opens with, from the running entry. */
    async function inspect(rawId) {
        const id = requireId(rawId, 'inspect');
        const found = await locate(id);
        if (found === undefined)
            throw new ServersFault('not-found', undefined, id);
        const base = { id, file: found.layer.kind, managed: found.location.block !== undefined };
        if (found.jsExpression)
            return { ...base, draft: emptyDraft(), blocked: 'js-expression' };
        const draft = draftOfConfig(options.live().configs.get(id));
        if (draft === undefined)
            return { ...base, draft: emptyDraft(), blocked: 'unknown-config' };
        return { ...base, draft };
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
        if ([...live.serverNames.values()].includes(spec.serverName)) {
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
    /** Rewrite one server row in place, renaming it when the name changed. */
    async function edit(rawId, server) {
        const id = requireId(rawId, 'edit');
        const result = validateDraft(server);
        if (!result.ok)
            throw new ServersFault('invalid-spec', result.problems);
        const spec = result.spec;
        const newId = rowIdFor(spec.serverName);
        const found = await locate(id);
        if (found === undefined)
            throw new ServersFault('not-found', undefined, id);
        if (found.jsExpression)
            throw new ServersFault('unsupported', undefined, 'js-expression');
        if (found.location.block === undefined && found.location.config === undefined) {
            throw new ServersFault('unsupported', undefined, 'no-config');
        }
        const live = options.live();
        if (newId !== id) {
            if ((await declaredIds()).has(newId))
                throw new ServersFault('duplicate-id', undefined, newId);
            if (live.ids.includes(newId))
                throw new ServersFault('duplicate-id', undefined, newId);
        }
        // The row being edited keeps its own name; every other live row must not use the new one.
        for (const [rowId, name] of live.serverNames) {
            if (rowId !== id && name === spec.serverName) {
                throw new ServersFault('duplicate-name', undefined, spec.serverName);
            }
        }
        const rewritten = rewriteMcpRow(found.text, id, {
            id: newId,
            block: renderServerBlock(spec),
            configBody: configBodyLines(spec),
        });
        if (rewritten === undefined)
            throw new ServersFault('not-found', undefined, id);
        await writeLayer(found.layer.path, rewritten);
        return { id: newId, file: found.layer.kind, removed: [] };
    }
    async function remove(rawId) {
        const target = requireId(rawId, 'remove');
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
            if (action === 'edit') {
                const request = body;
                return answer(() => exclusive(() => edit(request.id, request.server)));
            }
            if (action === 'remove')
                return answer(() => exclusive(() => remove(body.id)));
            if (action === 'inspect')
                return answer(() => inspect(body.id));
            return answer(() => { throw new ServersFault('bad-request', undefined, 'expected { "action": "add" | "edit" | "remove" | "inspect" }'); });
        },
    };
}
/** Exact diagnostic of anything thrown. */
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=servers.js.map