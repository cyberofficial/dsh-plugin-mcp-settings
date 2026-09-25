/**
 * MCP Servers settings section — browser half: registers one localized
 * `settings.section` contribution so "MCP Servers" appears in the Settings
 * navigation. Collaboration goes through cordis services (`remote`,
 * `locale`, `slots`); no cross-plugin value imports.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.remote merge and the mounted namespace vocabulary.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls ctx.locale and ctx.slots into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
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
 * Required services: the slot/locale faces plus the two mounted Host Remotes
 * this section reads and writes through.
 */
export const inject = [
  'slots', 'locale', 'remote', 'remote.pluginInventory', 'remote.pluginManager',
] as const

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
