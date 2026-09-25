/**
 * Text-level editing of a dsh profile patch file (`cordis.patch.yml`).
 *
 * The profile patch is a top-level YAML sequence the person owns: it carries
 * their comments, their hand-written rows, and the `disabled` overrides the
 * built-in Plugins page writes. This module therefore never re-serializes the
 * file. It appends one canonical, marker-delimited `insert` block for a server
 * this panel adds, and removes a server by cutting exactly the lines that
 * belong to it:
 *
 * 1. the marker block, when the row was added from this panel;
 * 2. otherwise the `insert` inner item whose `id` and `name` match, so a
 *    hand-written row stays removable;
 * 3. any top-level `- id: <row>` override item the enablement switch wrote.
 *
 * Every other line — comments, blank lines, sibling rows — is copied through
 * unchanged. Spans are computed from indentation, which is all the structure a
 * sequence of mapping items needs.
 *
 * @module dsh-plugin-mcp-settings/host/patch-text
 */
import { MCP_CLIENT_MODULE } from '../shared/spec.js';
/** Marker line opening the block this panel owns for one row id. */
const BLOCK_BEGIN = '# >>> dsh-plugin-mcp-settings:';
/** Marker line closing the block this panel owns for one row id. */
const BLOCK_END = '# <<< dsh-plugin-mcp-settings:';
/** A patch file whose top level is not the sequence this editor can append to. */
export class PatchShapeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PatchShapeError';
    }
}
/** The dominant line ending of a patch file, preserved on every edit. */
function eolOf(text) {
    return text.includes('\r\n') ? '\r\n' : '\n';
}
/** Whether a line carries no content. */
function isBlank(line) {
    return line.trim() === '';
}
/** A column-zero comment, which YAML may attach to either neighbouring item. */
function isOuterComment(line) {
    return line.startsWith('#');
}
/** Indentation width of one line. */
function indentOf(line) {
    return /^[ \t]*/.exec(line)?.[0].length ?? 0;
}
/** A dash starting a sequence item, capturing the indentation before it. */
const ITEM_START = /^([ \t]*)-(?:[ \t]|$)/;
/** The end line of the item starting at `start`, as defined by indentation. */
function itemEnd(lines, start) {
    let end = start;
    for (let index = start + 1; index < lines.length; index++) {
        const line = lines[index];
        if (isBlank(line))
            continue;
        if (/^[ \t]/.test(line)) {
            end = index;
            continue;
        }
        if (!isOuterComment(line))
            break;
        // A column-zero comment is interior to this item when indented content
        // follows it before the next item; otherwise it belongs to the next one.
        let next = index + 1;
        while (next < lines.length && isBlank(lines[next]))
            next++;
        if (next < lines.length && /^[ \t]/.test(lines[next]))
            continue;
        break;
    }
    return end;
}
/** Every top-level sequence item of the document. */
function topLevelItems(lines) {
    const starts = [];
    for (let index = 0; index < lines.length; index++) {
        if (/^-(?:[ \t]|$)/.test(lines[index]))
            starts.push(index);
    }
    return starts.map(start => ({ start, end: itemEnd(lines, start) }));
}
/** The absolute column where an item's own mapping keys start. */
function keyColumn(lines, item) {
    return keyColumnAt(lines, item, item.start);
}
/** Render one YAML scalar: plain when that is unambiguous, single-quoted otherwise. */
export function yamlScalar(value) {
    const plain = /^[A-Za-z0-9_][A-Za-z0-9_./\\-]*$/.test(value);
    const reserved = /^(?:true|false|null|yes|no|on|off|y|n|~)$/i.test(value)
        || /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value);
    if (value !== '' && plain && !reserved)
        return value;
    return `'${value.replace(/'/g, "''")}'`;
}
/** One `name: value` line of an item's own mapping level. */
function mappingEntry(line) {
    const match = /^([A-Za-z0-9_$@-]+)[ \t]*:[ \t]*(.*)$/.exec(line.trim());
    if (match === null)
        return undefined;
    return { name: match[1], value: match[2] };
}
/** The mapping entry one line contributes at its item's own level, if any. */
function entryAt(lines, item, index) {
    if (index === item.start) {
        const dash = ITEM_START.exec(lines[index]);
        return dash === null ? undefined : mappingEntry(lines[index].slice(dash[0].length));
    }
    return indentOf(lines[index]) === keyColumn(lines, item) ? mappingEntry(lines[index]) : undefined;
}
/** The `insert:` value of one item: the line that declares it and its sequence indent. */
function insertValue(lines, item) {
    for (let index = item.start; index <= item.end; index++) {
        const entry = entryAt(lines, item, index);
        if (entry?.name !== 'insert' || entry.value.trim() !== '')
            continue;
        for (let inner = index + 1; inner <= item.end; inner++) {
            const match = ITEM_START.exec(lines[inner]);
            if (match !== null)
                return { line: index, indent: match[1].length };
            if (!isBlank(lines[inner]) && !lines[inner].trimStart().startsWith('#'))
                break;
        }
        return undefined;
    }
    return undefined;
}
/** YAML scalar text without quotes or a trailing comment. */
function scalarOf(raw) {
    const value = raw.trim();
    if (value.startsWith("'")) {
        let out = '';
        for (let index = 1; index < value.length; index++) {
            const character = value[index];
            if (character !== "'") {
                out += character;
                continue;
            }
            if (value[index + 1] === "'") {
                out += "'";
                index++;
                continue;
            }
            return out;
        }
        return out;
    }
    if (value.startsWith('"')) {
        let out = '';
        for (let index = 1; index < value.length; index++) {
            const character = value[index];
            if (character === '\\' && index + 1 < value.length) {
                const escaped = value[index + 1];
                out += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
                index++;
                continue;
            }
            if (character === '"')
                return out;
            out += character;
        }
        return out;
    }
    const comment = value.search(/[ \t]#/);
    return (comment === -1 ? value : value.slice(0, comment)).trim();
}
/** The `id` and `name` one item declares at its own mapping level. */
function itemKeys(lines, item) {
    let id;
    let name;
    for (let index = item.start; index <= item.end; index++) {
        const entry = entryAt(lines, item, index);
        if (entry === undefined)
            continue;
        if (entry.name === 'id' && id === undefined)
            id = scalarOf(entry.value);
        if (entry.name === 'name' && name === undefined)
            name = scalarOf(entry.value);
    }
    return { ...id === undefined ? {} : { id }, ...name === undefined ? {} : { name } };
}
/** Inner items of an `insert:` sequence, one span per inserted row. */
function insertItems(lines, value, item) {
    const starts = [];
    for (let index = value.line + 1; index <= item.end; index++) {
        const match = ITEM_START.exec(lines[index]);
        if (match !== null && match[1].length === value.indent)
            starts.push(index);
    }
    return starts.map((start, position) => {
        const limit = position + 1 < starts.length ? starts[position + 1] : item.end + 1;
        let end = start;
        for (let index = start + 1; index < limit; index++) {
            const line = lines[index];
            if (isBlank(line))
                continue;
            if (indentOf(line) < value.indent)
                break;
            end = index;
        }
        // A comment block right before the next row documents that row, not this one.
        while (end > start && lines[end].trimStart().startsWith('#'))
            end -= 1;
        return { start, end };
    });
}
/** Marker block lines for one row id, when both markers are present in order. */
function markerBlock(lines, id) {
    const begin = `${BLOCK_BEGIN} ${id}`;
    const end = `${BLOCK_END} ${id}`;
    for (let index = 0; index < lines.length; index++) {
        if (lines[index].trim() !== begin)
            continue;
        for (let scan = index + 1; scan < lines.length; scan++) {
            if (lines[scan].trim() === end)
                return { start: index, end: scan };
        }
        return undefined;
    }
    return undefined;
}
/**
 * List every `mcp-client` row an `insert` block declares in one patch file.
 * @param text - the patch file's text.
 * @returns the row ids, each with whether this panel owns its block.
 */
export function listMcpRows(text) {
    const lines = text.split(/\r?\n/);
    const rows = [];
    for (const item of topLevelItems(lines)) {
        const value = insertValue(lines, item);
        if (value === undefined)
            continue;
        for (const inner of insertItems(lines, value, item)) {
            const keys = itemKeys(lines, inner);
            if (keys.id === undefined || keys.name !== MCP_CLIENT_MODULE)
                continue;
            rows.push({ id: keys.id, managed: markerBlock(lines, keys.id) !== undefined });
        }
    }
    return rows;
}
/** The column where the key of one item line starts. */
function keyColumnAt(lines, item, index) {
    if (index !== item.start)
        return indentOf(lines[index]);
    const dash = ITEM_START.exec(lines[index]);
    if (dash === null)
        return 0;
    const rest = lines[index].slice(dash[0].length);
    return dash[0].length + (/^[ \t]*/.exec(rest)?.[0].length ?? 0);
}
/**
 * Locate one `mcp-client` row and the parts an edit replaces.
 * @param text - the patch file's text.
 * @param id - the Loader row id.
 * @returns the location, or undefined when the file declares no such row.
 */
export function findMcpRow(text, id) {
    const lines = text.split(/\r?\n/);
    const block = markerBlock(lines, id);
    for (const item of topLevelItems(lines)) {
        const value = insertValue(lines, item);
        if (value === undefined)
            continue;
        for (const inner of insertItems(lines, value, item)) {
            const keys = itemKeys(lines, inner);
            if (keys.id !== id || keys.name !== MCP_CLIENT_MODULE)
                continue;
            let config;
            let idAt;
            for (let index = inner.start; index <= inner.end; index++) {
                const entry = entryAt(lines, inner, index);
                if (entry === undefined)
                    continue;
                const column = keyColumnAt(lines, inner, index);
                if (entry.name === 'id' && idAt === undefined)
                    idAt = { line: index, column };
                if (entry.name !== 'config' || config !== undefined)
                    continue;
                // The config value is every following line indented deeper than its key.
                let end = index;
                for (let scan = index + 1; scan <= inner.end; scan++) {
                    if (isBlank(lines[scan]))
                        continue;
                    if (indentOf(lines[scan]) <= column)
                        break;
                    end = scan;
                }
                config = { line: index, column, end };
            }
            return {
                ...block === undefined ? {} : { block },
                item: inner,
                ...config === undefined ? {} : { config },
                ...idAt === undefined ? {} : { idAt },
            };
        }
    }
    return undefined;
}
/**
 * Rewrite one server row in place, keeping every other line of the file.
 *
 * A managed row is replaced by a fresh canonical block at the same position. A
 * hand-written row keeps its own lines: only its `config:` body is substituted
 * (and its `id:` line when the server was renamed), so comments above and below
 * the row survive. An enablement override for the old id is renamed with it.
 *
 * @param text - the patch file's text.
 * @param id - the row id to rewrite.
 * @param rewrite - the replacement block and config body.
 * @returns the rewritten text, or undefined when the file declares no such row.
 */
export function rewriteMcpRow(text, id, rewrite) {
    const lines = text.split(/\r?\n/);
    const location = findMcpRow(text, id);
    if (location === undefined)
        return undefined;
    const managed = location.block !== undefined;
    if (!managed && location.config === undefined)
        return undefined;
    const replacements = [];
    if (managed) {
        replacements.push({ start: location.block?.start ?? 0, end: location.block?.end ?? 0, lines: rewrite.block.split('\n') });
    }
    else if (location.config !== undefined) {
        const pad = ' '.repeat(location.config.column + 2);
        replacements.push({
            start: location.config.line + 1,
            end: location.config.end,
            lines: rewrite.configBody.map(line => (line === '' ? '' : `${pad}${line}`)),
        });
    }
    const newId = rewrite.id;
    if (newId !== id) {
        // The block carries its own new id; a bare override item outside it does not.
        if (!managed && location.idAt !== undefined) {
            const line = lines[location.idAt.line];
            replacements.push({
                start: location.idAt.line,
                end: location.idAt.line,
                lines: [`${line.slice(0, location.idAt.column)}id: ${yamlScalar(newId)}`],
            });
        }
        for (const item of topLevelItems(lines)) {
            if (insertValue(lines, item) !== undefined)
                continue;
            if (itemKeys(lines, item).id !== id)
                continue;
            for (let index = item.start; index <= item.end; index++) {
                if (entryAt(lines, item, index)?.name !== 'id')
                    continue;
                const line = lines[index];
                replacements.push({
                    start: index,
                    end: index,
                    lines: [`${line.slice(0, keyColumnAt(lines, item, index))}id: ${yamlScalar(newId)}`],
                });
                break;
            }
        }
    }
    for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
        lines.splice(replacement.start, replacement.end - replacement.start + 1, ...replacement.lines);
    }
    return lines.join(eolOf(text));
}
/**
 * Remove one server row from a patch file's text.
 * @param text - the patch file's text.
 * @param id - the Loader row id to remove.
 * @returns the rewritten text and what was cut, or undefined when the file declares no such row.
 */
export function removeMcpRow(text, id) {
    const eol = eolOf(text);
    const lines = text.split(/\r?\n/);
    const spans = [];
    const removed = [];
    const block = markerBlock(lines, id);
    if (block !== undefined) {
        spans.push(block);
        removed.push('row');
    }
    for (const item of topLevelItems(lines)) {
        const value = insertValue(lines, item);
        if (value === undefined) {
            // An override item the enablement switch wrote survives the row's own block.
            if (itemKeys(lines, item).id === id) {
                spans.push(item);
                removed.push('override');
            }
            continue;
        }
        if (block !== undefined)
            continue;
        const siblings = insertItems(lines, value, item);
        for (const inner of siblings) {
            const keys = itemKeys(lines, inner);
            if (keys.id !== id || keys.name !== MCP_CLIENT_MODULE)
                continue;
            // Removing the only inserted row removes the item wrapping it, so no
            // empty `insert: []` and no orphaned block header is left behind.
            spans.push(siblings.length === 1 ? item : inner);
            removed.push('row');
        }
    }
    if (spans.length === 0)
        return undefined;
    for (const span of [...spans].sort((left, right) => right.start - left.start))
        cut(lines, span);
    // A patch file that lost its last row still has to parse: an empty document
    // is not a sequence, so the empty patch array stands in for it.
    const empty = lines.every(line => isBlank(line) || isOuterComment(line));
    return { text: empty ? `[]${eol}` : lines.join(eol), removed };
}
/** Delete one span, taking the blank line before it when that avoids a double gap. */
function cut(lines, span) {
    let from = span.start;
    const before = from > 0 ? lines[from - 1] : undefined;
    const after = span.end + 1 < lines.length ? lines[span.end + 1] : undefined;
    if (before !== undefined && isBlank(before) && (after === undefined || isBlank(after)))
        from -= 1;
    lines.splice(from, span.end - from + 1);
}
/**
 * Append one rendered, marker-delimited server block to a patch file's text.
 * @param text - the patch file's text, or undefined when it does not exist yet.
 * @param block - the block, without a trailing newline.
 * @returns the rewritten text, ending in a line break.
 * @throws PatchShapeError when the existing file is not a top-level sequence.
 */
export function appendServerBlock(text, block) {
    const current = text ?? '';
    const eol = eolOf(current);
    const lines = current.split(/\r?\n/);
    const meaningful = lines.filter(line => !isBlank(line) && !isOuterComment(line));
    const body = [...lines];
    if (meaningful.length === 0) {
        // Blank and comment-only content is kept: those comments are the person's.
        while (body.length > 0 && isBlank(body[body.length - 1]))
            body.pop();
        if (body.length === 0)
            return `${block}${eol}`;
        body.push('', ...block.split('\n'));
    }
    else if (meaningful.length === 1 && meaningful[0].trim() === '[]') {
        body.splice(body.findIndex(line => line.trim() === '[]'), 1, ...block.split('\n'));
    }
    else {
        if (!/^-(?:[ \t]|$)/.test(meaningful[0])) {
            throw new PatchShapeError('the profile patch file is not a top-level YAML sequence');
        }
        while (body.length > 0 && isBlank(body[body.length - 1]))
            body.pop();
        body.push('', ...block.split('\n'));
    }
    if (body[body.length - 1] !== '')
        body.push('');
    return body.join(eol);
}
/** The marker comment that opens the block this panel owns for one row id. */
export function blockBeginMarker(id) {
    return `${BLOCK_BEGIN} ${id}`;
}
/** The marker comment that closes the block this panel owns for one row id. */
export function blockEndMarker(id) {
    return `${BLOCK_END} ${id}`;
}
//# sourceMappingURL=patch-text.js.map