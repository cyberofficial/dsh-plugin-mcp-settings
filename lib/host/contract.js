/**
 * The two host-side contract surfaces the MCP Servers host half uses, declared
 * structurally.
 *
 * The host half deliberately imports no `@deepseek-ai/*` types: cordis is
 * resolved by the running harness, not by this package's own dependency tree,
 * and the plugin is built (and linked) without it. Declaring the small surface
 * that matters keeps the host build self-contained while still naming exactly
 * what this plugin expects from its context.
 *
 * @module dsh-plugin-mcp-settings/host/contract
 */
export {};
//# sourceMappingURL=contract.js.map