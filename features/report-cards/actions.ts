'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createReportCardInputSchema,
  updateReportCardInputSchema,
} from '@/features/report-cards/schemas'
import { createReportCard, updateReportCard } from '@/features/report-cards/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/report-cards'

export async function saveReportCardAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'report_card.editar')
  enforceMutationRateLimit(actor, 'admin.report-cards.form')

  const reportCardId = getOptionalFormValue(formData, 'reportCardId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (reportCardId) {
      const input = updateReportCardInputSchema.parse({
        generalNotes: getOptionalFormValue(formData, 'generalNotes'),
        petBehavior: getOptionalFormValue(formData, 'petBehavior'),
        productsUsed: getOptionalFormValue(formData, 'productsUsed'),
        nextReturnRecommendation: getOptionalFormValue(formData, 'nextReturnRecommendation'),
      })

      await updateReportCard(actor, reportCardId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createReportCardInputSchema.parse({
        appointmentId: getOptionalFormValue(formData, 'appointmentId'),
        generalNotes: getOptionalFormValue(formData, 'generalNotes'),
        petBehavior: getOptionalFormValue(formData, 'petBehavior'),
        productsUsed: getOptionalFormValue(formData, 'productsUsed'),
        nextReturnRecommendation: getOptionalFormValue(formData, 'nextReturnRecommendation'),
      })

      await createReportCard(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
