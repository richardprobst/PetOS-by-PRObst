'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createPredictiveInsightInputSchema,
  recordPredictiveInsightFeedbackInputSchema,
} from './schemas'
import {
  createPredictiveInsight,
  recordPredictiveInsightFeedback,
} from './services'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import {
  buildActionRedirectPath,
  getActionErrorMessage,
} from '@/server/http/action-feedback'
import {
  getOptionalFormValue,
  getRequiredFormValue,
} from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/agenda'

function revalidatePredictiveInsightSurfaces() {
  revalidatePath(redirectPath)
}

export async function createPredictiveInsightAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  enforceMutationRateLimit(actor, 'admin.predictive-insights.create')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const input = createPredictiveInsightInputSchema.parse({
      kind:
        getOptionalFormValue(formData, 'kind') ?? 'APPOINTMENT_DEMAND_FORECAST',
      snapshotDate: getOptionalFormValue(formData, 'snapshotDate'),
      unitId: getOptionalFormValue(formData, 'unitId'),
    })

    await createPredictiveInsight(actor, input)
    revalidatePredictiveInsightSurfaces()
    destination = buildActionRedirectPath(redirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(
      redirectPath,
      'error',
      getActionErrorMessage(error),
    )
  }

  redirect(destination)
}

export async function recordPredictiveInsightFeedbackAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  enforceMutationRateLimit(actor, 'admin.predictive-insights.feedback')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const predictiveInsightId = getRequiredFormValue(formData, 'predictiveInsightId')
    const input = recordPredictiveInsightFeedbackInputSchema.parse({
      feedbackNotes: getOptionalFormValue(formData, 'feedbackNotes'),
      feedbackStatus: getRequiredFormValue(formData, 'feedbackStatus'),
    })

    await recordPredictiveInsightFeedback(actor, predictiveInsightId, input)
    revalidatePredictiveInsightSurfaces()
    destination = buildActionRedirectPath(redirectPath, 'saved')
  } catch (error) {
    destination = buildActionRedirectPath(
      redirectPath,
      'error',
      getActionErrorMessage(error),
    )
  }

  redirect(destination)
}
