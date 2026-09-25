/**
 * MCP Servers settings section — browser half: registers one localized
 * `settings.section` contribution so "MCP Servers" appears in the Settings
 * navigation. Collaboration goes through cordis services (`remote`, `locale`,
 * `slots`); no cross-plugin value imports.
 *
 * The list, the enable/disable switch, and the retry action ride the mounted
 * `pluginManager` Remote. Adding and removing a server cannot: no Remote writes
 * Loader rows, so those two go through this plugin's own host route on the
 * shared `/api` channel (see `src/index.ts`).
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.remote merge and the mounted namespace vocabulary.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls ctx.locale and ctx.slots into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  SERVERS_PATH,
  type EditableServer,
  type McpServerDraft,
  type ServersMutation,
  type ServersResponse,
  type ServersSnapshot,
} from '../shared/spec.ts'
import { McpServersSection, type McpServersSectionInjected } from './McpServersSection.tsx'
import { en, zh, type McpSettingsLocaleKey } from './locales.ts'

export type { McpServersSectionInjected, McpServersSectionProps } from './McpServersSection.tsx'
export type { McpSettingsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** MCP Servers section copy. */
    'settings.mcp': McpSettingsLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.mcp'

/**
 * Required services: the slot/locale faces plus the mounted Host Remote this
 * section reads and enables through. The host route needs no injected service
 * of its own — it is reached with a plain same-origin fetch.
 */
export const inject = [
  'slots', 'locale', 'remote', 'remote.pluginInventory', 'remote.pluginManager',
] as const

/**
 * Call this plugin's own host route and read its structured answer.
 * @param method - `GET` for the snapshot, `POST` for a mutation.
 * @param body - the mutation body, absent for `GET`.
 * @returns the host's answer; transport failures become an `io-error` refusal.
 */
async function send<T>(method: 'GET' | 'POST', body?: unknown): Promise<ServersResponse<T>> {
  const headers: Record<string, string> = { accept: 'application/json' }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let response: Response
  try {
    response = await fetch(SERVERS_PATH, init)
  } catch (error) {
    return { ok: false, error: { code: 'io-error', detail: error instanceof Error ? error.message : String(error) } }
  }
  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    return { ok: false, error: { code: 'io-error', detail: `HTTP ${String(response.status)}` } }
  }
  if (typeof parsed !== 'object' || parsed === null || typeof (parsed as { ok?: unknown }).ok !== 'boolean') {
    return { ok: false, error: { code: 'io-error', detail: `HTTP ${String(response.status)}` } }
  }
  return parsed as ServersResponse<T>
}

/**
 * Register the MCP Servers section into Settings.
 * @param ctx - browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'mcp-settings: dictionaries')

  const t = ctx.locale.bind(NS)

  const injected = (): McpServersSectionInjected => ({
    list: async () => {
      const result = await ctx.remote.pluginManager.listPlugins()
      if (!result.ok) {
        throw new Error(`pluginManager.listPlugins failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    },
    setEnabled: async (entryId, enabled) => {
      const result = await ctx.remote.pluginManager.setPluginEnabled(entryId, enabled)
      if (!result.ok) {
        throw new Error(`pluginManager.setPluginEnabled failed: ${result.error.code}: ${result.error.message}`)
      }
    },
    manage: {
      snapshot: () => send<ServersSnapshot>('GET'),
      inspect: (id: string) => send<EditableServer>('POST', { action: 'inspect', id }),
      add: (draft: McpServerDraft) => send<ServersMutation>('POST', { action: 'add', server: draft }),
      edit: (id: string, draft: McpServerDraft) => send<ServersMutation>('POST', { action: 'edit', id, server: draft }),
      remove: (id: string) => send<ServersMutation>('POST', { action: 'remove', id }),
    },
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'mcp-servers',
    order: 25, // after Built-in plugins (15) and Agent presets (20)
    label: () => t('nav'),
    locale: NS,
    inject: injected,
  }, McpServersSection))
}
