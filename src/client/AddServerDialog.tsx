/**
 * The Add-server dialog: one flat draft validated by the shared spec module
 * before anything leaves the browser, rendered as exactly the fields
 * `@deepseek-ai/dsh-mcp-client` accepts for the chosen transport.
 *
 * The host validates the same draft again, so this form is convenience, never
 * the guarantee.
 */

import { useState } from 'react'
import { Button, Checkbox, Input, Modal, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import { emptyDraft, validateDraft, type McpServerDraft } from '../shared/spec.ts'
import type { McpTranslate } from './locales.ts'
import { fieldMessages } from './messages.ts'
import css from './McpServersSection.module.css'

/** Props the section binds for the dialog. */
export interface AddServerDialogProps {
  /** Send the draft; resolves with a refusal sentence, or undefined when it was added. */
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

/** Render the Add-server dialog. */
export function AddServerDialog({ onSubmit, onClose, t }: AddServerDialogProps): React.ReactNode {
  const [draft, setDraft] = useState<McpServerDraft>(emptyDraft)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const [failure, setFailure] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

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
      title={t('addTitle')}
      closeLabel={t('close')}
      description={t('addIntro')}
      className={css.dialog}
      contentClassName={css.dialogBody}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={busy} onClick={() => { void submit() }}>
            {busy ? t('adding') : t('save')}
          </Button>
        </>
      )}
    >
      {failure === undefined ? null : (
        <p className={css.dialogFailure} role="alert">{failure}</p>
      )}
      <Field label={t('fieldName')} hint={t('fieldNameHint')} error={errors['serverName']}>
        <Input
          value={draft.serverName}
          placeholder="github"
          spellCheck={false}
          autoComplete="off"
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
              placeholder={'GITHUB_TOKEN=ghp_...'}
              onChange={(event) => { update({ envText: event.target.value }) }}
            />
          </Field>
          <Field label={t('fieldCwd')} error={errors['cwd']}>
            <Input
              value={draft.cwd}
              spellCheck={false}
              autoComplete="off"
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
          aria-invalid={errors['toolCallTimeoutMs'] !== undefined}
          onChange={(event) => { update({ toolCallTimeoutMs: event.target.value }) }}
        />
      </Field>
      <div className={css.checkboxRow}>
        <Checkbox
          checked={draft.failOnStartupError}
          label={t('fieldFailOnStartup')}
          onChange={(next) => { update({ failOnStartupError: next }) }}
        />
      </div>
    </Modal>
  )
}
