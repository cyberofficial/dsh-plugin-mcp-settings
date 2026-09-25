/**
 * MCP Servers settings section.
 *
 * One card per `@deepseek-ai/dsh-mcp-client` Loader entry, with a live phase
 * dot, an enable/disable switch, and a retry action that restarts the entry
 * (disable, then enable), which re-establishes the MCP connection. The list and
 * those two actions come from the mounted `pluginManager` Remote; adding,
 * editing, and removing a server change the patch file itself and go through
 * this plugin's own host route (`manage`), because no Remote writes Loader rows.
 *
 * A patch write is applied by the harness's own patch watcher, so an added,
 * edited, or removed row appears a moment later rather than synchronously. The
 * section therefore re-reads the list on a slow tick while any row is still
 * settling, and for a short window after a mutation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginInfo } from '@deepseek-ai/dsh-plugin-manager/types'
import {
  Button,
  IconEditOutlineRegular,
  IconPlusOutlineRegular,
  IconRefreshOutlineMedium,
  IconTrashOutlineRegular,
  Modal,
  StateDot,
  Switch,
  Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  MCP_CLIENT_MODULE,
  type EditableServer,
  type McpServerDraft,
  type ServersMutation,
  type ServersResponse,
  type ServersSnapshot,
} from '../shared/spec.ts'
import { ServerDialog } from './ServerDialog.tsx'
import { blockMessage, serverErrorMessage } from './messages.ts'
import type { McpSettingsLocaleKey } from './locales.ts'
import css from './McpServersSection.module.css'

/** Registration-side business face for the section. */
export interface McpServersSectionInjected {
  /** Read current plugin rows, including patch addressability. */
  list: () => Promise<readonly PluginInfo[]>
  /** Persist one row's enablement and reload it live. Throws on failure. */
  setEnabled: (entryId: PluginInfo['entryId'], enabled: boolean) => Promise<void>
  /** Add, edit, and remove servers in the patch, through the plugin's host route. */
  manage: {
    /** Read which patch-file rows exist and where. */
    snapshot: () => Promise<ServersResponse<ServersSnapshot>>
    /** Read one row's current configuration, for the edit form. */
    inspect: (id: string) => Promise<ServersResponse<EditableServer>>
    /** Write one new server row. */
    add: (draft: McpServerDraft) => Promise<ServersResponse<ServersMutation>>
    /** Rewrite one existing server row, renaming it when the name changed. */
    edit: (id: string, draft: McpServerDraft) => Promise<ServersResponse<ServersMutation>>
    /** Delete one server row and its enablement override. */
    remove: (id: string) => Promise<ServersResponse<ServersMutation>>
  }
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

/** How often a settling section re-reads the live row list. */
const POLL_MS = 1500

/** How long after a mutation the section keeps polling, even with nothing settling. */
const SETTLE_MS = 20_000

/** Exact diagnostic of anything thrown. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** One server row's presentation facts derived from its inventory entry. */
interface RowView {
  readonly entry: PluginInfo
  readonly dot: StateDotState
  readonly label: string
  readonly tone: 'neutral' | 'success' | 'danger'
  readonly tag: string
}

function rowView(entry: PluginInfo, t: Translate): RowView {
  if (!entry.enabled) {
    return { entry, dot: 'idle', label: t('statusOff'), tone: 'neutral', tag: t('disabledTag') }
  }
  const phase = entry.fiberPhase
  return {
    entry,
    dot: phase === null ? 'idle' : PHASE_DOT[phase],
    label: phase === null ? t('statusPending') : t(PHASE_KEY[phase]),
    tone: phase === 'failed' ? 'danger' : 'success',
    tag: t('enabledTag'),
  }
}

/** Display name for one server row: the patch entry id, without its `include:` marker. */
function displayName(entry: PluginInfo): string {
  return entry.entryId.replace(/^include:/, '')
}

/** Whether a row is mid-flight in the Loader. */
function settling(entry: PluginInfo): boolean {
  return entry.fiberPhase === 'pending' || entry.fiberPhase === 'loading' || entry.fiberPhase === 'unloading'
}

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly servers: readonly PluginInfo[] }

/** Which dialog is open: the add form, or the edit form for one row id. */
type DialogState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'add' }
  | {
    readonly kind: 'edit'
    readonly id: string
    readonly loading: boolean
    readonly draft?: McpServerDraft
    /** A rename target the host refused, or why this row cannot be rewritten. */
    readonly blocked?: string
    /** One extra sentence under the fields (the hand-written note). */
    readonly note?: string
  }

/** Render the MCP Servers section. */
export function McpServersSection({
  t, list, setEnabled, manage,
}: McpServersSectionProps): React.ReactNode {
  const [view, setView] = useState<ViewState>({ status: 'loading' })
  const [patch, setPatch] = useState<ServersSnapshot | undefined>()
  const [patchError, setPatchError] = useState<string | undefined>()
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set())
  const [actionError, setActionError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | undefined>()
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [removeTarget, setRemoveTarget] = useState<PluginInfo | undefined>()
  const [removeError, setRemoveError] = useState<string | undefined>()
  const [removing, setRemoving] = useState(false)
  const [mutatedAt, setMutatedAt] = useState(0)

  const reload = useCallback((): void => {
    list().then(
      snapshot => { setView({ status: 'ready', servers: snapshot.filter(row => row.moduleName === MCP_CLIENT_MODULE) }) },
      error => { setView({ status: 'error', message: messageOf(error) }) },
    )
  }, [list])

  const loadPatch = useCallback((): void => {
    manage.snapshot().then(
      result => {
        if (result.ok) {
          setPatch(result.value)
          setPatchError(undefined)
        } else {
          setPatch(undefined)
          setPatchError(serverErrorMessage(result.error, t))
        }
      },
      error => {
        setPatch(undefined)
        setPatchError(messageOf(error))
      },
    )
  }, [manage, t])

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
        setView({ status: 'error', message: messageOf(error) })
      },
    )
    return () => { current = false }
  }, [list])

  useEffect(() => { loadPatch() }, [loadPatch])

  // One slow tick for the whole section: rows that are still settling (a fresh
  // row, a restart, a toggle) and the window after a patch write both need the
  // list re-read, and nothing else does.
  const live = useRef({ settling: false, mutatedAt: 0, reload: () => {} })
  const settlingNow = view.status === 'ready' && view.servers.some(settling)
  useEffect(() => {
    live.current = { settling: settlingNow, mutatedAt, reload }
  })
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = live.current
      if (current.settling || Date.now() - current.mutatedAt < SETTLE_MS) current.reload()
    }, POLL_MS)
    return () => { window.clearInterval(timer) }
  }, [])

  const reloadAll = useCallback((): void => {
    reload()
    loadPatch()
  }, [reload, loadPatch])

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
      setMutatedAt(Date.now())
      reloadAll()
    } catch (error) {
      setActionError(`${t('actionFailed')}: ${messageOf(error)}`)
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

  /** Add the dialog's draft; the answer is the refusal text, or undefined when added. */
  const addServer = async (draft: McpServerDraft): Promise<string | undefined> => {
    const result = await manage.add(draft)
    if (!result.ok) return serverErrorMessage(result.error, t)
    setActionError(undefined)
    setNotice(t('added', { name: draft.serverName }))
    setMutatedAt(Date.now())
    reloadAll()
    return undefined
  }

  /** Open the edit form: show it at once, then fill it from the host's answer. */
  const openEdit = async (entry: PluginInfo): Promise<void> => {
    const id = entry.patchId
    if (id === undefined) return
    setDialog({ kind: 'edit', id, loading: true })
    const result = await manage.inspect(id)
    setDialog((current) => {
      if (current.kind !== 'edit' || current.id !== id) return current
      if (!result.ok) return { ...current, loading: false, blocked: serverErrorMessage(result.error, t) }
      return {
        ...current,
        loading: false,
        draft: result.value.draft,
        ...result.value.blocked === undefined ? {} : { blocked: blockMessage(result.value.blocked, t) },
        ...result.value.managed ? {} : { note: t('handWrittenNote') },
      }
    })
  }

  /** Save the edit form's draft back over the row it opened from. */
  const editServer = async (id: string, draft: McpServerDraft): Promise<string | undefined> => {
    const result = await manage.edit(id, draft)
    if (!result.ok) return serverErrorMessage(result.error, t)
    setDialog({ kind: 'closed' })
    setActionError(undefined)
    setNotice(t('edited', { name: draft.serverName }))
    setMutatedAt(Date.now())
    reloadAll()
    return undefined
  }

  const confirmRemove = async (entry: PluginInfo): Promise<void> => {
    const id = entry.patchId
    if (id === undefined) return
    setRemoving(true)
    setRemoveError(undefined)
    setActionError(undefined)
    try {
      const result = await manage.remove(id)
      if (!result.ok) {
        setRemoveError(serverErrorMessage(result.error, t))
        return
      }
      setRemoveTarget(undefined)
      setNotice(t('removed', { name: displayName(entry) }))
      setMutatedAt(Date.now())
      reloadAll()
    } finally {
      setRemoving(false)
    }
  }

  /** Patch-file rows this profile declares, keyed for the cards' remove affordance. */
  const patchRows = useMemo(
    () => new Map((patch?.rows ?? []).map(row => [row.id, row])),
    [patch],
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

  const header = (
    <div className={css.header}>
      <div className={css.headerText}>
        <h2 className={css.heading}>{t('title')}</h2>
        <p className={css.intro}>{t('intro')}</p>
      </div>
      <Button variant="outline" className={css.headerAction} onClick={() => { setDialog({ kind: 'add' }) }}>
        <IconPlusOutlineRegular size={14} aria-hidden="true" />
        {t('add')}
      </Button>
    </div>
  )

  if (view.status === 'error') {
    return (
      <div className={css.section}>
        {header}
        <div className={css.failure} role="alert">
          <StateDot state="error" /> <span>{view.message}</span>
          <Button variant="outline" onClick={reload}>{t('retry')}</Button>
        </div>
      </div>
    )
  }

  const servers = view.servers
  // A patch write lands a moment before the live list shows its row and the
  // patch snapshot lists it; that gap must not read as "defined elsewhere".
  const settled = Date.now() - mutatedAt >= SETTLE_MS

  return (
    <div className={css.section}>
      {header}

      {actionError !== undefined ? (
        <div className={css.failure} role="alert">
          <StateDot state="error" /> <span>{actionError}</span>
        </div>
      ) : notice !== undefined ? (
        <p className={css.notice} role="status">{notice}</p>
      ) : null}

      {patchError === undefined ? null : (
        <p className={css.hint} role="status">{t('snapshotFailed')} {patchError}</p>
      )}

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
            const patchRow = entry.patchId === undefined ? undefined : patchRows.get(entry.patchId)
            // A row the patch files do not declare comes from a bundle patch or
            // an overlay: addressable for enablement, not editable from here.
            const outside = entry.patchId !== undefined && patch !== undefined && patchRow === undefined && settled
            const manageable = entry.patchId !== undefined && !outside
            return (
              <li key={entry.entryId} className={css.card} data-phase={entry.fiberPhase ?? 'off'}>
                <div className={css.cardMain}>
                  <div className={css.cardText}>
                    <span className={css.cardTitle} title={displayName(entry)}>{displayName(entry)}</span>
                    <span className={css.cardMeta}>
                      <code className={css.cardModule} title={entry.moduleName}>{entry.moduleName}</code>
                      {patchRow?.managed === true ? <Tag tone="quiet">{t('managedTag')}</Tag> : null}
                    </span>
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
                    {!locked && manageable ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => { void openEdit(entry) }}
                      >
                        <IconEditOutlineRegular size={14} aria-hidden="true" />
                        {t('edit')}
                      </Button>
                    ) : null}
                    {!locked && manageable ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setRemoveError(undefined)
                          setRemoveTarget(entry)
                        }}
                      >
                        <IconTrashOutlineRegular size={14} aria-hidden="true" />
                        {t('remove')}
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
                {outside ? <p className={css.hint}>{t('outsideHint')}</p> : null}
              </li>
            )
          })}
        </ul>
      )}

      {patch === undefined ? null : (
        <p className={css.hint}>{t('patchHint', { path: patch.patchPath })}</p>
      )}
      {patch?.live === false ? (
        <p className={css.hint} role="status">{t('restartHint')}</p>
      ) : null}
      <p className={css.hint}>{t('configHint')}</p>

      {dialog.kind === 'add' ? (
        <ServerDialog
          mode="add"
          t={t}
          onClose={() => { setDialog({ kind: 'closed' }) }}
          onSubmit={addServer}
        />
      ) : null}

      {dialog.kind === 'edit' ? (
        <ServerDialog
          mode="edit"
          t={t}
          loading={dialog.loading}
          draft={dialog.draft}
          blocked={dialog.blocked}
          note={dialog.note}
          onClose={() => { setDialog({ kind: 'closed' }) }}
          onSubmit={draft => editServer(dialog.id, draft)}
        />
      ) : null}

      {removeTarget === undefined ? null : (
        <Modal
          open
          onClose={() => { setRemoveTarget(undefined) }}
          title={t('removeTitle')}
          closeLabel={t('close')}
          footer={(
            <>
              <Button variant="outline" onClick={() => { setRemoveTarget(undefined) }}>{t('cancel')}</Button>
              <Button
                variant="primary"
                disabled={removing}
                onClick={() => { void confirmRemove(removeTarget) }}
              >
                {removing ? t('removing') : t('remove')}
              </Button>
            </>
          )}
        >
          <p className={css.dialogText}>
            {t('removeConfirm', {
              name: displayName(removeTarget),
              path: patchRows.get(removeTarget.patchId ?? '')?.file === 'home'
                ? patch?.homePatchPath ?? ''
                : patch?.patchPath ?? '',
            })}
          </p>
          {removeError === undefined ? null : (
            <p className={css.dialogFailure} role="alert">{removeError}</p>
          )}
        </Modal>
      )}
    </div>
  )
}
