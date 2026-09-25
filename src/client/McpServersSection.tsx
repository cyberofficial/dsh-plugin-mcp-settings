/**
 * MCP Servers settings section: one card per `@deepseek-ai/dsh-mcp-client`
 * Loader entry, with a live phase dot, an enable/disable switch, and a retry
 * action that restarts the entry (disable → enable), which re-establishes the
 * MCP connection. Data comes from the mounted `pluginManager` Remote — its
 * `listPlugins` carries the same inventory facts plus each row's patch
 * addressability, and `setPluginEnabled` persists the switch and reloads the
 * entry live.
 */

import { useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginInfo } from '@deepseek-ai/dsh-plugin-manager/types'
import {
  Button,
  IconRefreshOutlineMedium,
  StateDot,
  Switch,
  Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState, TagTone } from '@deepseek-ai/dsh-client-ui-primitives'
import type { McpSettingsLocaleKey } from './locales.ts'
import css from './McpServersSection.module.css'

/** The Loader module every MCP server row runs. */
const MCP_CLIENT_MODULE = '@deepseek-ai/dsh-mcp-client'

/** Registration-side business face for the section. */
export interface McpServersSectionInjected {
  /** Read current plugin rows, including patch addressability. */
  list: () => Promise<readonly PluginInfo[]>
  /** Persist one row's enablement and reload it live. Throws on failure. */
  setEnabled: (entryId: PluginInfo['entryId'], enabled: boolean) => Promise<void>
}

/** Props the renderer binds for the section. */
export type McpServersSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.mcp'>
  & InjectFace<McpServersSectionInjected>

type Translate = McpServersSectionProps['t']

type Phase = PluginInfo['fiberPhase']

const PHASE_DOT: Record<NonNullable<Phase>, StateDotState> = {
  pending: 'idle',
  loading: 'ongoing',
  active: 'success',
  failed: 'error',
  unloading: 'ongoing',
}

const PHASE_KEY: Record<NonNullable<Phase>, McpSettingsLocaleKey> = {
  pending: 'statusPending',
  loading: 'statusLoading',
  active: 'statusActive',
  failed: 'statusFailed',
  unloading: 'statusUnloading',
}

/** One server row's presentation facts derived from its inventory entry. */
interface RowView {
  readonly entry: PluginInfo
  readonly dot: StateDotState
  readonly label: string
  readonly tone: TagTone
  readonly tag: string
}

function rowView(entry: PluginInfo, t: Translate): RowView {
  if (!entry.enabled) {
    return { entry, dot: 'idle', label: t('statusOff'), tone: 'neutral', tag: t('disabled') }
  }
  const phase = entry.fiberPhase
  return {
    entry,
    dot: phase === null ? 'idle' : PHASE_DOT[phase],
    label: phase === null ? t('statusPending') : t(PHASE_KEY[phase]),
    tone: phase === 'failed' ? 'danger' : 'success',
    tag: t('enabled'),
  }
}

/** Display name for one server row: the patch entry id, without its `include:` marker. */
function displayName(entry: PluginInfo): string {
  return entry.entryId.replace(/^include:/, '')
}

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly servers: readonly PluginInfo[] }

/** Render the MCP Servers section. */
export function McpServersSection({ t, list, setEnabled }: McpServersSectionProps): React.ReactNode {
  const [view, setView] = useState<ViewState>({ status: 'loading' })
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set())
  const [actionError, setActionError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | undefined>()

  useEffect(() => {
    let current = true
    setView({ status: 'loading' })
    list().then(
      snapshot => {
        if (!current) return
        setView({ status: 'ready', servers: snapshot.filter(row => row.moduleName === MCP_CLIENT_MODULE) })
      },
      error => {
        if (!current) return
        setView({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      },
    )
    return () => { current = false }
  }, [list])

  const reload = (): void => {
    list().then(
      snapshot => { setView({ status: 'ready', servers: snapshot.filter(row => row.moduleName === MCP_CLIENT_MODULE) }) },
      error => { setView({ status: 'error', message: error instanceof Error ? error.message : String(error) }) },
    )
  }

  const run = async (
    entry: PluginInfo,
    action: (id: PluginInfo['entryId']) => Promise<void>,
    busyLabel: string,
    done: string,
  ): Promise<void> => {
    setBusyIds(previous => new Set([...previous, entry.entryId]))
    setActionError(undefined)
    setNotice(busyLabel)
    try {
      await action(entry.entryId)
      setNotice(done)
      reload()
    } catch (error) {
      setActionError(`${t('actionFailed')}: ${error instanceof Error ? error.message : String(error)}`)
      setNotice(undefined)
    } finally {
      setBusyIds(previous => {
        const next = new Set(previous)
        next.delete(entry.entryId)
        return next
      })
    }
  }

  const toggle = (entry: PluginInfo): Promise<void> =>
    run(entry, id => setEnabled(id, !entry.enabled), t('toggling'), t('toggled'))

  const retry = (entry: PluginInfo): Promise<void> =>
    run(
      entry,
      async id => {
        await setEnabled(id, false)
        await setEnabled(id, true)
      },
      t('retrying'),
      t('retried'),
    )

  if (view.status === 'loading') {
    return (
      <div className={css.section}>
        <h2 className={css.heading}>{t('title')}</h2>
        <p className={css.intro}>{t('intro')}</p>
        <p className={css.hint} role="status">{t('loading')}</p>
      </div>
    )
  }

  if (view.status === 'error') {
    return (
      <div className={css.section}>
        <h2 className={css.heading}>{t('title')}</h2>
        <p className={css.intro}>{t('intro')}</p>
        <div className={css.failure} role="alert">
          <StateDot state="error" /> <span>{view.message}</span>
          <Button variant="outline" onClick={reload}>{t('retry')}</Button>
        </div>
      </div>
    )
  }

  const servers = view.servers

  return (
    <div className={css.section}>
      <h2 className={css.heading}>{t('title')}</h2>
      <p className={css.intro}>{t('intro')}</p>

      {actionError !== undefined ? (
        <div className={css.failure} role="alert">
          <StateDot state="error" /> <span>{actionError}</span>
        </div>
      ) : notice !== undefined ? (
        <p className={css.notice} role="status">{notice}</p>
      ) : null}

      {servers.length === 0 ? (
        <div className={css.empty}>
          <p>{t('empty')}</p>
          <p className={css.hint}>{t('emptyDesc')}</p>
        </div>
      ) : (
        <ul className={css.cards}>
          {servers.map(entry => {
            const row = rowView(entry, t)
            const busy = busyIds.has(entry.entryId)
            const locked = entry.readOnlyReason !== undefined
            return (
              <li key={entry.entryId} className={css.card} data-phase={entry.fiberPhase ?? 'off'}>
                <div className={css.cardMain}>
                  <div className={css.cardText}>
                    <span className={css.cardTitle}>{displayName(entry)}</span>
                    <code className={css.cardModule}>{entry.moduleName}</code>
                  </div>
                  <div className={css.cardStatus}>
                    <span className={css.phase} role="img" aria-label={row.label} title={row.label}>
                      <StateDot state={row.dot} />
                    </span>
                    <span className={css.phaseLabel}>{row.label}</span>
                    <Tag tone={row.tone}>{row.tag}</Tag>
                  </div>
                  <div className={css.cardControls}>
                    {!locked && entry.enabled && entry.fiberPhase !== 'loading' && entry.fiberPhase !== 'unloading' ? (
                      <Button variant="outline" disabled={busy} onClick={() => { void retry(entry) }}>
                        <IconRefreshOutlineMedium size={14} aria-hidden="true" />
                        {busy ? t('retrying') : t('retry')}
                      </Button>
                    ) : null}
                    <Switch
                      checked={entry.enabled}
                      disabled={busy || locked}
                      label={`${displayName(entry)}: ${row.tag}`}
                      onChange={() => { void toggle(entry) }}
                    />
                  </div>
                </div>
                {locked && entry.readOnlyReason !== undefined ? (
                  <p className={css.hint}>{entry.readOnlyReason}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <p className={css.hint}>{t('configHint')}</p>
    </div>
  )
}
