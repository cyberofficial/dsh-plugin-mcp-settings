/**
 * Localized text for the section's validation problems and host refusals.
 *
 * The host reports refusals as stable codes plus, for validation, the exact
 * field and reason; this module is the one place that turns that vocabulary
 * into the reader's language.
 *
 * @module dsh-plugin-mcp-settings/client/messages
 */

import type { ServerError, SpecProblem } from '../shared/spec.ts'
import type { McpTranslate } from './locales.ts'

/** Message for one validation problem, including the offending line when known. */
export function problemMessage(problem: SpecProblem, t: McpTranslate): string {
  const line = problem.line === undefined ? '' : ` (line ${String(problem.line)})`
  switch (problem.field) {
    case 'serverName':
      return problem.reason === 'required' ? t('problemNameRequired') : t('problemNamePattern')
    case 'transport':
      return t('problemTransport')
    case 'command':
      return problem.reason === 'required' ? t('problemCommandRequired') : t('problemControl')
    case 'url':
      return problem.reason === 'required' ? t('problemUrlRequired') : t('problemUrlInvalid')
    case 'toolCallTimeoutMs':
      return t('problemTimeout')
    case 'env':
      return `${t('problemEnvLine')}${line}`
    case 'headers':
      return `${t('problemHeaderLine')}${line}`
    case 'args':
    case 'cwd':
      return `${t('problemControl')}${line}`
  }
}

/** The first message per field, for inline form errors. */
export function fieldMessages(
  problems: readonly SpecProblem[],
  t: McpTranslate,
): Readonly<Record<string, string>> {
  const messages: Record<string, string> = {}
  for (const problem of problems) {
    if (messages[problem.field] !== undefined) continue
    messages[problem.field] = problemMessage(problem, t)
  }
  return messages
}

/** One sentence for a host refusal. */
export function serverErrorMessage(error: ServerError, t: McpTranslate): string {
  switch (error.code) {
    case 'duplicate-id': return t('errorDuplicateId', { id: error.detail ?? '' })
    case 'duplicate-name': return t('errorDuplicateName', { name: error.detail ?? '' })
    case 'not-found': return t('errorNotFound', { id: error.detail ?? '' })
    case 'ambiguous': return t('errorAmbiguous', { id: error.detail ?? '' })
    case 'unsupported': return t('errorUnsupported', { detail: error.detail ?? '' })
    case 'invalid-spec':
      return error.problems === undefined || error.problems.length === 0
        ? t('errorInvalidSpec')
        : error.problems.map(problem => problemMessage(problem, t)).join(' ')
    case 'bad-request': return t('errorBadRequest')
    case 'no-profile': return t('errorNoProfile')
    case 'io-error': return t('errorIoError', { detail: error.detail ?? '' })
  }
}
