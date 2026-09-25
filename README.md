# dsh-plugin-mcp-settings

**MCP Servers settings section for DeepSeek Harness** — a client-only plugin that adds a dedicated "MCP Servers" entry to the Settings navigation, letting you view status, enable/disable, and retry connections for any `@deepseek-ai/dsh-mcp-client` Loader entries.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Settings nav entry** | "MCP Servers" appears in the left sidebar (after *Agent presets*, order 25) |
| **Live status** | Each MCP server card shows a phase dot (pending / loading / active / failed / unloading / off) |
| **Enable / Disable** | Toggle switch persists to the profile patch and triggers a live reload of the entry |
| **Retry connection** | One-click **Retry** button disables then re-enables the server, re-establishing the MCP connection |
| **Read-only awareness** | Entries that came from a bundle patch (not the profile patch) show a hint and lock the controls — they're not addressable in your profile |
| **Fully localized** | English & Chinese dictionaries, auto-switched via `dsh-client-locale` |
| **Zero host logic** | The host half is an empty `apply()` — all work happens in the browser bundle via the already-mounted `pluginManager` Remote |

---

## 📦 Installation

The plugin is designed to be linked into a DSH profile as a **junction** (so edits are live):

```bash
# From your DSH profile directory (e.g. %USERPROFILE%\.dsh\profiles\web)
mklink /J node_modules\dsh-plugin-mcp-settings D:\github\dsh-plugins\dsh-plugin-mcp-settings
```

Then add it to your profile's `package.json`:

```json
{
  "dependencies": {
    "dsh-plugin-mcp-settings": "link:D:/github/dsh-plugins/dsh-plugin-mcp-settings"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "...",
        "dsh-plugin-mcp-settings"
      ],
      "patchReload": "live"
    }
  }
}
```

Restart the harness (`run.bat`). The plugin will compose via its own `cordis.patch.yml` (single bare-name row) and appear in Settings.

---

## 🖥️ Usage

1. Open **Settings** → left nav → **MCP Servers**
2. Each row = one `@deepseek-ai/dsh-mcp-client` Loader entry
3. **Switch** — enables/disables the server (writes to profile patch, live reloads the fiber)
4. **Retry** — disables then re-enables in sequence, forcing a fresh MCP handshake
5. **Phase dot** — live fiber state:
   - ⚪ `pending` / `loading` / `unloading` — transitional
   - 🟢 `active` — connected & healthy
   - 🔴 `failed` — connection error
   - ⚪ `off` — explicitly disabled
6. **Read-only badge** — if shown, the entry originated from a bundle patch; you must edit the bundle patch to change it (or install the plugin into your profile instead)

---

## ⚙️ Configuration

No configuration file. Behavior is derived from the live plugin inventory:

- **Filter** — only rows with `moduleName === '@deepseek-ai/dsh-mcp-client'` are shown
- **Order** — nav order is `25` (after *Built-in plugins* `15`, *Models* `20`, *Agent presets* `25`)
- **Locale namespace** — `settings.mcp` (merged into `dsh-client-ui-slots`)

---

## 🛠️ Development

### Prerequisites
- Node.js (via corepack shims set up by `run.bat` in the DSH repo)
- `@tsdown/css` installed at repo root: `pnpm add -w @tsdown/css`

### Build

```bash
cd D:\github\dsh-plugins\dsh-plugin-mcp-settings
node scripts/build-client.mjs
```

Output:
- `lib/index.js` — host half (ESM, empty `apply`, exports `name`/`inject`/`apply`)
- `lib/client.js` — browser bundle (lazy-CJS factory, CSS inlined, `window.__ModuleLoader__.load` wrapper)

### Build script internals (`scripts/build-client.mjs`)

1. Clean `lib/` + temp dir `.mcp-settings-client-build` under the DSH repo root
2. `tsc -p tsconfig.json` (host-only, excludes `src/client`)
3. Copy `src/client` → temp dir, write standalone `tsconfig.json` + `tsdown.config.json` (with real lib path), run `tsdown`
4. Splice generated `style.css` into `lib/client.js` after the two-tab factory intro, delete standalone `style.css`

### Key source files

| File | Purpose |
|------|---------|
| `src/index.ts` | Host half — empty `apply`, exports plugin metadata |
| `src/client/index.ts` | Client `apply` — registers `settings.section` with injected `list`/`setEnabled` via `remote.pluginManager` |
| `src/client/McpServersSection.tsx` | Section component — cards, phase dots, switches, retry buttons |
| `src/client/McpServersSection.module.css` | Styles using `--dsw-alias-*` design tokens |
| `src/client/locales.ts` | `en`/`zh` dictionaries + `McpSettingsLocaleKey` type |
| `scripts/tsdown.client.json` | tsdown template (browser, CJS, externals: `react`, `react/jsx-runtime`, `@deepseek-ai/dsh-client-ui-primitives`) |
| `scripts/tsconfig.standalone.json` | Self-contained tsconfig for temp dir (`jsx: "react-jsx"`) |
| `cordis.patch.yml` | Composition row: `- insert: - id: plugin-mcp-settings, name: dsh-plugin-mcp-settings` |

---

## 🏗️ Architecture Notes

### Why client-only?
- The Settings left nav is populated by **`settings.section` slot registrations** — a browser-side slot.
- The required data (`listPlugins`, `setPluginEnabled`) is already exposed by the **mounted `pluginManager` Remote** (`remote.pluginManager`).
- Typert remotes have a **static namespace mount list** in `packages/api/remotes/src/client/index.ts` — external plugins **cannot** add new namespaces.
- Reusing the existing Remote avoids codegen, custom remotes, and host↔client RPC plumbing.

### Remote methods used
```ts
// From @deepseek-ai/dsh-plugin-manager (mounted as pluginManager)
listPlugins(): Promise<Result<PluginInfo[]>>
setPluginEnabled(entryId: string, enabled: boolean): Promise<Result<ChangeResult>>

// PluginInfo fields used:
{ entryId, moduleName, enabled, fiberPhase, readOnlyReason, patchId }
```

### Slot contract (`settings.section`)
```ts
// Owner props (from ui-settings contract):
interface SettingsSectionOwnerProps { close: () => void }

// Registration options:
{ id: 'mcp-servers', order: 25, label: () => t('nav'), locale: 'settings.mcp', inject: injectedFace }
```

### Design tokens
All CSS uses `--dsw-alias-*` variables (no hard-coded colors):
- `--dsw-alias-bg-l1`, `--dsw-alias-border-l2`, `--dsw-alias-border-l3`
- `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, `--dsw-alias-label-tertiary`

---

## 🐛 Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `failed to import` on startup | Corrupted `lib/index.js` (PowerShell error text appended) | Rebuild: `node scripts/build-client.mjs` |
| JSX parse error in client bundle | tsdown resolved `.tsx` sources instead of compiling | Build uses isolated temp dir with standalone tsconfig (`jsx: "react-jsx"`) |
| `@tsdown/css not installed` | Missing peer dep | `pnpm add -w @tsdown/css` at repo root |
| Client bundle missing factory intro | Emitted intro uses **two tabs** (`\t\t`) | Splice matcher expects exact two-tab string |
| "MCP Servers" nav missing | Plugin not loaded / client bundle not served | Restart harness; hard-refresh browser (Ctrl+Shift+R) |
| Retry does nothing | Entry has `readOnlyReason: 'unaddressable'` (bundle patch origin) | Install the MCP server into your profile instead of the bundle |
| Toggle doesn't persist | Profile patch not writable / junction broken | Verify `C:\Users\<you>\.dsh\profiles\web\node_modules\dsh-plugin-mcp-settings` points to source |

### Logs
- Harness startup: `C:\Users\<you>\.dsh\logs\startup-*.log`
- Profile: `C:\Users\<you>\.dsh\profiles\web\` (cordis.yml, package.json, node_modules junction)

---

## 📄 License

MIT — part of the DeepSeek Harness plugin ecosystem.