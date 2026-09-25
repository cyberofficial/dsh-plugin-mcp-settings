/**
 * The server dialog, in both of its modes.
 *
 * Add starts from an empty draft; Edit starts from the draft the host read out
 * of the running Loader entry, and refuses to save when that read was blocked
 * (`!!js` row text, or a config this form cannot round-trip). Either way the
 * draft is one flat object validated by the shared spec module before anything
 * leaves the browser, and the host validates it again — this form is
 * convenience, never the guarantee.
 */

import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  IconLoadingOutlineRegular,
  Input,
  Modal,
  SegmentedControl,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { emptyDraft, validateDraft, type McpServerDraft } from '../shared/spec.ts'
import type { McpTranslate } from './locales.ts'
import { fieldMessages } from './messages.ts'
import css from './McpServersSection.module.css'

/** Props the section binds for the dialog. */
export interface ServerDialogProps {
  /** Which copy and which action the dialog presents. */
  readonly mode: 'add' | 'edit'
  /** Values the form opens with; Edit supplies them once the host answers. */
  readonly draft?: McpServerDraft
  /** True while Edit is still reading the row's current values. */
  readonly loading?: boolean
  /** A refusal sentence that disables saving (a blocked read, or a failure). */
  readonly blocked?: string
  /** One extra sentence under the fields, e.g. the hand-written note. */
  readonly note?: string
  /** Send the draft; resolves with a refusal sentence, or undefined when it was saved. */
  readonly onSubmit: (draft: McpServerDraft) => Promise<string | undefined>
  readonly onClose: () => void
  readonly t: McpTranslate
}

/** Draft keys whose validation problem is reported under another field name. */
const ERROR_FIELD_OF: Readonly<Record<string, string>> = {
  argsText: 'args',
  envText: 'env',
  headersText: 'headers',
}

/** One labelled form row with its hint and inline error. */
function Field({
  label, hint, error, as = 'label', children,
}: {
  readonly label: string
  readonly hint?: string
  readonly error?: string
  /** `div` for grouped controls (a segmented control is not a label target). */
  readonly as?: 'label' | 'div'
  readonly children: React.ReactNode
}): React.ReactNode {
  const Wrapper = as
  return (
    <Wrapper className={css.field}>
      <span className={css.fieldLabel}>{label}</span>
      {children}
      {hint === undefined ? null : <span className={css.fieldHint}>{hint}</span>}
      {error === undefined ? null : <span className={css.fieldError} role="alert">{error}</span>}
    </Wrapper>
  )
}

/** Render the add/edit server dialog. */
export function ServerDialog({
  mode, draft: initial, loading = false, blocked, note, onSubmit, onClose, t,
}: ServerDialogProps): React.ReactNode {
  const [draft, setDraft] = useState<McpServerDraft>(() => initial ?? emptyDraft())
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const [failure, setFailure] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  // Edit mounts immediately and fills in when the host answers; adopting the
  // later draft must not fight the user, so it only replaces the form once.
  const [adopted, setAdopted] = useState(initial !== undefined)
  useEffect(() => {
    if (initial === undefined || adopted) return
    setDraft(initial)
    setAdopted(true)
  }, [initial, adopted])

  const locked = busy || loading || blocked !== undefined

  const update = (patch: Partial<McpServerDraft>): void => {
    setDraft(current => ({ ...current, ...patch }))
    setErrors(current => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[ERROR_FIELD_OF[key] ?? key]
      return next
    })
    setFailure(undefined)
  }

  const submit = async (): Promise<void> => {
    const result = validateDraft(draft)
    if (!result.ok) {
      setErrors(fieldMessages(result.problems, t))
      setFailure(undefined)
      return
    }
    setErrors({})
    setBusy(true)
    try {
      const refusal = await onSubmit(draft)
      if (refusal === undefined) onClose()
      else setFailure(refusal)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'add' ? t('addTitle') : t('editTitle')}
      closeLabel={t('close')}
      description={mode === 'add' ? t('addIntro') : t('editIntro')}
      className={css.dialog}
      contentClassName={css.dialogBody}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={locked} onClick={() => { void submit() }}>
            {busy ? (mode === 'add' ? t('adding') : t('editing')) : mode === 'add' ? t('save') : t('edit')}
          </Button>
        </>
      )}
    >
      {loading ? (
        <p className={css.dialogNotice} role="status">
          <IconLoadingOutlineRegular size={14} aria-hidden="true" /> {t('loadingConfig')}
        </p>
      ) : null}
      {blocked === undefined ? null : (
        <p className={css.dialogFailure} role="alert">{blocked}</p>
      )}
      {failure === undefined ? null : (
        <p className={css.dialogFailure} role="alert">{failure}</p>
      )}
      {loading ? null : (
        <>
          <Field label={t('fieldName')} hint={t('fieldNameHint')} error={errors['serverName']}>
            <Input
              value={draft.serverName}
              placeholder="github"
              spellCheck={false}
              autoComplete="off"
              disabled={blocked !== undefined}
              data-modal-autofocus
              aria-invalid={errors['serverName'] !== undefined}
              onChange={(event) => { update({ serverName: event.target.value }) }}
            />
          </Field>
          <Field label={t('fieldTransport')} error={errors['transport']} as="div">
            <SegmentedControl
              id="mcp-server-transport"
              value={draft.transport}
              label={t('fieldTransport')}
              disabled={blocked !== undefined}
              options={[
                { value: 'stdio', label: t('transportStdio') },
                { value: 'streamable-http', label: t('transportHttp') },
              ]}
              onChange={(next) => { update({ transport: next }) }}
            />
          </Field>
          {draft.transport === 'stdio' ? (
            <>
              <Field label={t('fieldCommand')} hint={t('fieldCommandHint')} error={errors['command']}>
                <Input
                  value={draft.command}
                  placeholder="npx"
                  spellCheck={false}
                  autoComplete="off"
                  disabled={blocked !== undefined}
                  aria-invalid={errors['command'] !== undefined}
                  onChange={(event) => { update({ command: event.target.value }) }}
                />
              </Field>
              <Field label={t('fieldArgs')} error={errors['args']}>
                <textarea
                  className={css.textarea}
                  value={draft.argsText}
                  rows={3}
                  spellCheck={false}
                  disabled={blocked !== undefined}
                  placeholder={'-y\n@modelcontextprotocol/server-github'}
                  onChange={(event) => { update({ argsText: event.target.value }) }}
                />
              </Field>
              <Field label={t('fieldEnv')} hint={t('fieldEnvHint')} error={errors['env']}>
                <textarea
                  className={css.textarea}
                  value={draft.envText}
                  rows={3}
                  spellCheck={false}
                  disabled={blocked !== undefined}
                  placeholder={'GITHUB_TOKEN=ghp_...'}
                  onChange={(event) => { update({ envText: event.target.value }) }}
                />
              </Field>
              <Field label={t('fieldCwd')} error={errors['cwd']}>
                <Input
                  value={draft.cwd}
                  spellCheck={false}
                  autoComplete="off"
                  disabled={blocked !== undefined}
                  aria-invalid={errors['cwd'] !== undefined}
                  onChange={(event) => { update({ cwd: event.target.value }) }}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label={t('fieldUrl')} error={errors['url']}>
                <Input
                  value={draft.url}
                  placeholder="https://example.com/mcp"
                  spellCheck={false}
                  autoComplete="off"
                  disabled={blocked !== undefined}
                  aria-invalid={errors['url'] !== undefined}
                  onChange={(event) => { update({ url: event.target.value }) }}
                />
              </Field>
              <Field label={t('fieldHeaders')} hint={t('fieldHeadersHint')} error={errors['headers']}>
                <textarea
                  className={css.textarea}
                  value={draft.headersText}
                  rows={3}
                  spellCheck={false}
                  disabled={blocked !== undefined}
                  placeholder={'Authorization: Bearer ...'}
                  onChange={(event) => { update({ headersText: event.target.value }) }}
                />
              </Field>
            </>
          )}
          <p className={css.fieldHint}>{t('fieldSecretNotice')}</p>
          <Field label={t('fieldTimeout')} hint={t('fieldTimeoutHint')} error={errors['toolCallTimeoutMs']}>
            <Input
              value={draft.toolCallTimeoutMs}
              inputMode="numeric"
              placeholder="60000"
              spellCheck={false}
              autoComplete="off"
              disabled={blocked !== undefined}
              aria-invalid={errors['toolCallTimeoutMs'] !== undefined}
              onChange={(event) => { update({ toolCallTimeoutMs: event.target.value }) }}
            />
          </Field>
          <div className={css.checkboxRow}>
            <Checkbox
              checked={draft.failOnStartupError}
              label={t('fieldFailOnStartup')}
              disabled={blocked !== undefined}
              onChange={(next) => { update({ failOnStartupError: next }) }}
            />
          </div>
          {note === undefined ? null : <p className={css.fieldHint}>{note}</p>}
        </>
      )}
    </Modal>
  )
}
