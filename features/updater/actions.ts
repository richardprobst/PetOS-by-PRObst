'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getBooleanFormValue, getRequiredFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'
import { retryUpdateExecution, startUpdateExecution } from './engine'
import { retryUpdateExecutionInputSchema, updateExecutionInputSchema } from './schemas'

const redirectPath = '/admin/sistema'

export async function startUpdateExecutionAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'sistema.update.operar')
  enforceMutationRateLimit(actor, 'admin.system.update.start')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = updateExecutionInputSchema.parse({
      backupConfirmed: getBooleanFormValue(formData, 'backupConfirmed'),
    })

    const result = await startUpdateExecution(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(
      redirectPath,
      'updated',
      result?.status === 'FAILED'
        ? 'Update executado com falha controlada. Revise os passos e o recovery no painel.'
        : 'Update executado com sucesso.',
    )
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function retryUpdateExecutionAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'sistema.update.operar')
  enforceMutationRateLimit(actor, 'admin.system.update.retry')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = retryUpdateExecutionInputSchema.parse({
      backupConfirmed: getBooleanFormValue(formData, 'backupConfirmed'),
      executionId: getRequiredFormValue(formData, 'executionId'),
    })

    const result = await retryUpdateExecution(actor, input)
    revalidatePath(redirectPath)
    destination = buildActionRedirectPath(
      redirectPath,
      'updated',
      result?.status === 'FAILED'
        ? 'Retentativa executada com falha controlada. Revise o painel antes de insistir novamente.'
        : 'Retentativa concluida com sucesso.',
    )
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
