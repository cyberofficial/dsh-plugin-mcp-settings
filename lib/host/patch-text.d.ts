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
/** One contiguous run of lines. */
interface Span {
    readonly start: number;
    readonly end: number;
}
/** One `mcp-client` row this module found in a patch file. */
export interface PatchRow {
    readonly id: string;
    /** True when the row sits inside this panel's marker block. */
    readonly managed: boolean;
}
/** What one removal cut out of the file. */
export interface Removal {
    readonly text: string;
    readonly removed: readonly ('row' | 'override')[];
}
/** A patch file whose top level is not the sequence this editor can append to. */
export declare class PatchShapeError extends Error {
    constructor(message: string);
}
/** Render one YAML scalar: plain when that is unambiguous, single-quoted otherwise. */
export declare function yamlScalar(value: string): string;
/**
 * List every `mcp-client` row an `insert` block declares in one patch file.
 * @param text - the patch file's text.
 * @returns the row ids, each with whether this panel owns its block.
 */
export declare function listMcpRows(text: string): PatchRow[];
/** One `mcp-client` row located in a patch file, with the pieces an in-place edit rewrites. */
export interface McpRowLocation {
    /** The marker block wrapping the row, when this panel wrote it. */
    readonly block?: Span;
    /** The inner `insert` item carrying the row. */
    readonly item: Span;
    /** The `config:` key line and the column its value is indented from. */
    readonly config?: {
        readonly line: number;
        readonly column: number;
        readonly end: number;
    };
    /** The line carrying the item's `id:` key and the column that key starts at. */
    readonly idAt?: {
        readonly line: number;
        readonly column: number;
    };
}
/**
 * Locate one `mcp-client` row and the parts an edit replaces.
 * @param text - the patch file's text.
 * @param id - the Loader row id.
 * @returns the location, or undefined when the file declares no such row.
 */
export declare function findMcpRow(text: string, id: string): McpRowLocation | undefined;
/** What an in-place row rewrite replaces. */
export interface RowRewrite {
    /** The row id after the rewrite; a different one renames the row and its override. */
    readonly id: string;
    /** The marker block to substitute when the row is managed: already laid out, markers included. */
    readonly block: string;
    /** The config body for a hand-written row, at zero base indent; nested lines keep their own indentation. */
    readonly configBody: readonly string[];
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
export declare function rewriteMcpRow(text: string, id: string, rewrite: RowRewrite): string | undefined;
/**
 * Remove one server row from a patch file's text.
 * @param text - the patch file's text.
 * @param id - the Loader row id to remove.
 * @returns the rewritten text and what was cut, or undefined when the file declares no such row.
 */
export declare function removeMcpRow(text: string, id: string): Removal | undefined;
/**
 * Append one rendered, marker-delimited server block to a patch file's text.
 * @param text - the patch file's text, or undefined when it does not exist yet.
 * @param block - the block, without a trailing newline.
 * @returns the rewritten text, ending in a line break.
 * @throws PatchShapeError when the existing file is not a top-level sequence.
 */
export declare function appendServerBlock(text: string | undefined, block: string): string;
/** The marker comment that opens the block this panel owns for one row id. */
export declare function blockBeginMarker(id: string): string;
/** The marker comment that closes the block this panel owns for one row id. */
export declare function blockEndMarker(id: string): string;
export {};
//# sourceMappingURL=patch-text.d.ts.map