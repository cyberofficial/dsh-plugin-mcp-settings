# dsh-plugin-mcp-settings

**MCP Servers settings section for DeepSeek Harness** — a Settings page that lists every `@deepseek-ai/dsh-mcp-client` Loader entry and lets you **add, remove, enable, disable, and restart** servers without hand-editing `cordis.patch.yml`.

---

## Features

| Feature | Description |
|---------|-------------|
| **Settings nav entry** | "MCP Servers" appears in the left sidebar (order 25, after *Agent presets*) |
| **Add a server** | A dialog writes one canonical `insert` row into your profile patch: stdio (`command`, `args`, `env`, `cwd`) or Streamable HTTP (`url`, **custom headers**) |
| **Edit a server** | **Edit** opens the same dialog on the running entry's *current* values (read from the live Loader, not from the file) and writes them back in place — including renaming the server and switching its transport |
| **Remove a server** | Per-row **Remove** with confirmation; deletes the row *and* the enable/disable override the switch wrote, leaving every other line — and every comment — of your patch file untouched |
| **Live status** | Each card shows a phase dot (pending / loading / active / failed / unloading / off) |
| **Enable / Disable** | Toggle persists to the profile patch and reloads the entry live |
| **Retry connection** | Disables then re-enables the server, re-establishing the MCP handshake |
| **API keys** | Headers (`x-api-key: …`, `Authorization: Bearer …`) and env vars (`EXA_API_KEY=…`) are first-class fields; the host hands them straight to `mcp-client` |
| **Read-only awareness** | Rows that come from a bundle patch or a `--patch` overlay are labelled and keep their controls locked |
| **Fully localized** | English & Chinese dictionaries, auto-switched via `dsh-client-locale` |

---

## Installation

The plugin is designed to be linked into a DSH profile as a **junction** (so edits are live):

```bash
# From your DSH profile directory (e.g. %USERPROFILE%\.dsh\profiles\web)
mklink /J node_modules\dsh-plugin-mcp-settings D:\path\to\dsh-plugin-mcp-settings
```

Then add it to your profile's `package.json`:

```json
{
  "dependencies": {
    "dsh-plugin-mcp-settings": "link:D:/path/to/dsh-plugin-mcp-settings"
  },
  "dsh": {
    "profile": {
      "bundles": ["...", "dsh-plugin-mcp-settings"],
      "patchReload": "live"
    }
  }
}
```

Restart the harness. The plugin composes via its own `cordis.patch.yml` (single bare-name row) and appears in Settings.

> `patchReload: "live"` is what makes an added or removed server appear immediately. Without a patch watcher the plugin still writes the row and the page says so: the change lands on the next harness restart.

---

## Usage

1. Open **Settings → MCP Servers**.
2. **Add server** opens a dialog:
   - **Name** — the `serverName` namespace; tools reach the model as `mcp__<name>__<tool>`.
   - **Transport** — `stdio` or `HTTP`.
   - *stdio*: **Command**, **Arguments** (one per line), **Environment** (`KEY=VALUE` per line), **Working directory**.
   - *HTTP*: **URL**, **Headers** (`Name: value` per line).
   - **Tool call timeout (ms)** — empty uses the `mcp-client` default (60000).
   - **Fail activation when the first connection fails** — maps to `failOnStartupError`.
3. Each row card offers **Retry**, **Edit**, **Remove**, and the enable/disable **switch**.

### Editing a server

**Edit** reopens the same dialog on the values the *running entry* is using — the host reads them from the live Loader, which has already interpolated `!!js` expressions and filled in the schema defaults, so no YAML is parsed and nothing is guessed from the file text. Saving:

- replaces a row this panel added (the whole marker block) at its existing position, and renames its marker and its `- id:` override when the server name changed;
- rewrites only the `config:` block of a hand-written row, keeping the row's own lines, its banners, and everything around it.

Two rows refuse to open instead of risking a wrong write, and the dialog says why:

| Blocked when | Why |
|---|---|
| The row's text contains `!!js` | A form would save the *interpolated* value back over the expression — for a token, that writes the secret into the file |
| The live entry exposes no config this form can round-trip | Nothing to prefill from; edit the file by hand |

### Authentication examples

Hosted HTTP server with an API-key header (`x-api-key` is what Exa's hosted MCP server reads):

```
Transport:  HTTP
URL:        https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,agent_run
Headers:    x-api-key: YOUR_EXA_API_KEY
```

Local stdio server with an API key in the environment:

```
Transport:  stdio
Command:    npx
Arguments:  -y
            exa-mcp-server
Environment:
            EXA_API_KEY=your_api_key
```

Both land in the patch file as `config.headers` / `config.env`, which `mcp-client` forwards to the MCP transport (`requestInit.headers` for HTTP, the child process environment for stdio).

> **Secrets are stored in your patch file in plain text**, exactly as you type them. That file already holds your provider configuration; treat it accordingly.

### What the plugin writes

Added rows are wrapped in marker comments so the panel can rewrite or delete the whole block later, and so your hand-written rows stay recognisable:

```yaml
# >>> dsh-plugin-mcp-settings: mcp-exa
# Added by the MCP Servers settings panel. Edit or delete this whole block there.
- insert:
    - id: mcp-exa
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: exa
        transport: streamable-http
        url: 'https://mcp.exa.ai/mcp?tools=web_search_exa,agent_run'
        headers:
          x-api-key: YOUR_EXA_API_KEY
# <<< dsh-plugin-mcp-settings: mcp-exa
```

Rows you wrote by hand (no markers) are listed and removable too: removal cuts exactly the `insert` inner item whose `id` and `name` match, plus any `- id: <row>` override item. Comments elsewhere are never rewritten.

---

## Development

### Prerequisites
- The DSH checkout at `D:\github\deepseek-harness` (the build stages into it so `node:`, `@types/node`, and the client's externals resolve)
- `@tsdown/css` installed in the checkout: `pnpm add -w @tsdown/css`

### Build

```bash
cd dsh-plugin-mcp-settings
node scripts/build-client.mjs
```

Output:
- `lib/index.js` (plus `lib/host/*`, `lib/shared/*`) — host half: reads and edits the profile patch, registers the `/api/plugins/mcp-settings/servers` route
- `lib/client.js` — browser bundle (lazy-CJS factory, CSS inlined, `window.__ModuleLoader__.load` wrapper)

Both halves are staged into `D:\github\deepseek-harness\.mcp-settings-build`, compiled there, then removed. The compiler writes into `.lib-next/`, never into `lib/`: the finished directory is swapped in with two renames at the very end, so a harness that boots *while* a build runs never imports a half-written host module (a failed build leaves `lib/` exactly as it was, and a failed swap puts the previous directory back).

### Test

```bash
npm test          # build first: the tests import lib/
```

38 tests cover the patch-file editor (append, marker removal, hand-written removal, shared inserts, in-place rewrites and id renames, CRLF, empty files — each result re-parsed with the harness's own `yaml`), the host route contract over an in-memory store (including `inspect` and the edit refusals), the host wiring against a real temporary patch file, and the browser bundle's registration and fetch contract.

### Verify composition end to end

`_verify/mcp-settings-compose-probe.mjs` (in the workspace) builds a throwaway profile and drives the host half's own route through add → inspect → edit on real files, so the harness composes the result for real:

```powershell
$out = node _verify\mcp-settings-compose-probe.mjs
$lines = $out -split "`n"; $env:DSH_HOME = $lines[[Array]::IndexOf($lines,'---') - 1].Trim()
node D:\github\deepseek-harness\apps\cli\lib\bin.js --profile mcp-probe --dump-config
```

### Key source files

| File | Purpose |
|------|---------|
| `src/index.ts` | Host half: registers the exact fetch route, locates the profile patch, reads live Loader rows and their resolved configs |
| `src/host/contract.ts` | The two host contracts (ctx surface, `connection.fetch`) declared structurally — no harness type imports |
| `src/host/patch-text.ts` | Comment-preserving patch editing: marker blocks, `insert` item spans, override items, in-place rewrites, CRLF |
| `src/host/servers.ts` | Snapshot / inspect / add / edit / remove over a `PatchStore`, canonical YAML rendering, refuse-and-report errors |
| `src/host/fs-store.ts` | Atomic patch writes (temp file + rename) the HMR watcher never sees half-written |
| `src/shared/spec.ts` | Wire contract, draft validation, and `draftOfConfig` (the resolved-config inverse) shared by both halves |
| `src/client/index.ts` | Client `apply` — registers `settings.section`, injects `list`/`setEnabled` (Remote) and `manage` (own route) |
| `src/client/McpServersSection.tsx` | Section: header + Add, server cards, edit and remove flows, settling poll |
| `src/client/ServerDialog.tsx` | The add/edit form, per-transport fields, inline validation, blocked-row states |
| `src/client/messages.ts` | Validation problems, blocked reasons, and host refusals turned into localized sentences |
| `src/client/locales.ts` | `en`/`zh` dictionaries plus `McpSettingsLocaleKey` |
| `cordis.patch.yml` | Composition row: `- insert: - id: plugin-mcp-settings, name: dsh-plugin-mcp-settings` |

---

## Architecture Notes

### Two transports for two kinds of work

- **The mounted `pluginManager` Remote** already handles the list, the enable/disable switch, and the retry action: `listPlugins` (with each row's patch addressability) and `setPluginEnabled`.
- **Nothing in the harness exposes "write a Loader row"**, so adding, editing, and removing go through this plugin's own host half: one exact route on the shared `/api` channel (`connection.fetch.register`), which already applies the Host/Origin fence and browser authentication. Typert remotes have a static namespace mount list that external plugins cannot extend, which is why the plugin uses a fetch route rather than a remote namespace.

### Editing someone else's YAML

The profile patch is a person's file: comments, hand-written rows, and the `disabled` overrides the built-in Plugins page appends. The host half therefore never re-serializes it — it appends one canonical block, removes exact line spans computed from indentation, and rewrites a row by substituting its own block (managed) or just its `config:` body (hand-written). An edit that cannot identify a unique span, or that would flatten a `!!js` expression, changes nothing and reports why.

### Where the edit form's values come from

`inspect` reads the row's configuration out of the *live Loader entry* (`entry.options.config`), not out of the file. The loader has already interpolated `!!js` and applied the schema's defaults, so the form opens on what the running server actually uses; the `!!js` guard exists precisely because that is the wrong thing to write back into a file that holds an expression. Disabled rows keep their entry, so a switched-off server still opens for editing.

### Applying a change

The patch file *is* the interface: with `patchReload: "live"`, the harness's HMR watcher recomposes the profile when the file changes, so a written row becomes a live `mcp-client` entry with no second mechanism. The section re-reads the live list on a slow tick while rows are settling and for a short window after a mutation, because that recomposition is asynchronous.

### Slot contract (`settings.section`)

```ts
{ id: 'mcp-servers', order: 25, label: () => t('nav'), locale: 'settings.mcp', inject: injectedFace }
```

### Design tokens

All CSS uses `--dsw-alias-*` variables (no hard-coded colors):
`--dsw-alias-bg-layer-1`, `--dsw-alias-border-l2`, `--dsw-alias-border-l3`, `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, `--dsw-alias-label-tertiary`, `--dsw-alias-label-error`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Add server" or "Edit" reports a refusal, or the patch hint is missing | The host half is not loaded yet | Restart the harness after building: host-module changes are not hot-reloaded |
| Edit opens but says the row carries `!!js` | The row's text holds an expression a form must not flatten | Edit that row in your patch file |
| Edit opens but says the entry exposes no configuration | Nothing to prefill from (an unusual or failed compose) | Edit that row in your patch file |
| Server added but no row appears | The profile has no patch watcher, or the entry failed to start | The page says so when there is no watcher; otherwise check the phase dot and `C:\Users\<you>\.dsh\logs\` |
| `The patch file could not be edited` | The patch file is not a top-level YAML sequence | Repair the file (`[]` is valid and empty); nothing was written |
| `A row named … already exists` | The id or `serverName` is taken | Pick another name, or remove the existing row first |
| Remove is unavailable on a row | The row comes from a bundle patch or `--patch` overlay | Edit that patch instead; only your profile and home layers are editable |
| "MCP Servers" nav missing | Plugin not loaded / client bundle not served | Restart the harness; hard-refresh the browser (Ctrl+Shift+R) |
| Retry does nothing | Entry has `readOnlyReason: 'unaddressable'` (bundle patch origin) | Install the MCP server into your profile instead of the bundle |
| Toggle doesn't persist | Profile patch not writable / junction broken | Verify `node_modules\dsh-plugin-mcp-settings` points to the source |
| `failed to import` on startup | Either a build older than this README's atomic swap, or a genuinely broken `lib/index.js` | Rebuild: `node scripts/build-client.mjs` (it now compiles aside and swaps in, so a mid-build restart is safe), then restart |
| `@tsdown/css not installed` | Missing build peer dep | `pnpm add -w @tsdown/css` at the checkout root |

### Logs
- Harness startup and warnings: `C:\Users\<you>\.dsh\logs\startup-*.log`
- Profile: `C:\Users\<you>\.dsh\profiles\web\` (`cordis.yml`, `cordis.patch.yml`, `node_modules` junctions)

---

## License

MIT — part of the DeepSeek Harness plugin ecosystem.
