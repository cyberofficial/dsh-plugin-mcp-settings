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
/**
 * List every `mcp-client` row an `insert` block declares in one patch file.
 * @param text - the patch file's text.
 * @returns the row ids, each with whether this panel owns its block.
 */
export declare function listMcpRows(text: string): PatchRow[];
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
//# sourceMappingURL=patch-text.d.ts.map