'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createGalleryImageAnalysisInputSchema,
  createPrePostImageAnalysisInputSchema,
  reviewImageAnalysisInputSchema,
} from '@/features/ai/vision/schemas'
import {
  createImageAnalysis,
  reviewImageAnalysis,
} from '@/features/ai/vision/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import {
  buildActionRedirectPath,
  getActionErrorMessage,
} from '@/server/http/action-feedback'
import {
  getOptionalFormValue,
  hasCheckedFormValue,
} from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const documentsRedirectPath = '/admin/documentos'
const reportCardsRedirectPath = '/admin/report-cards'
const petsRedirectPath = '/admin/pets'

function revalidateImageAnalysisSurfaces() {
  revalidatePath(documentsRedirectPath)
  revalidatePath(reportCardsRedirectPath)
  revalidatePath(petsRedirectPath)
}

export async function createGalleryImageAnalysisAction(formData: FormData) {
  const actor = await requireInternalAreaUser(documentsRedirectPath)
  assertPermission(actor, 'ai.imagem.executar')
  enforceMutationRateLimit(actor, 'admin.image-analysis.gallery')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const mediaAssetId = getOptionalFormValue(formData, 'mediaAssetId')

    if (!mediaAssetId) {
      throw new Error('Selecione uma midia para a analise assistiva de galeria.')
    }

    const input = createGalleryImageAnalysisInputSchema.parse({
      consentGranted: hasCheckedFormValue(formData, 'consentGranted'),
      consentOrigin: getOptionalFormValue(formData, 'consentOrigin'),
      kind: 'GALLERY_METADATA',
      mediaAssetId,
    })

    await createImageAnalysis(actor, input)
    revalidateImageAnalysisSurfaces()
    destination = buildActionRedirectPath(documentsRedirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(
      documentsRedirectPath,
      'error',
      getActionErrorMessage(error),
    )
  }

  redirect(destination)
}

export async function createPrePostImageAnalysisAction(formData: FormData) {
  const actor = await requireInternalAreaUser(documentsRedirectPath)
  assertPermission(actor, 'ai.imagem.executar')
  enforceMutationRateLimit(actor, 'admin.image-analysis.prepost')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const mediaAssetId = getOptionalFormValue(formData, 'mediaAssetId')
    const comparisonMediaAssetId = getOptionalFormValue(
      formData,
      'comparisonMediaAssetId',
    )

    if (!mediaAssetId || !comparisonMediaAssetId) {
      throw new Error(
        'Selecione as capturas principal e de comparacao para a analise assistiva pre e pos-servico.',
      )
    }

    const input = createPrePostImageAnalysisInputSchema.parse({
      comparisonMediaAssetId,
      consentGranted: hasCheckedFormValue(formData, 'consentGranted'),
      consentOrigin: getOptionalFormValue(formData, 'consentOrigin'),
      kind: 'PRE_POST_ASSISTED',
      mediaAssetId,
      reportCardId: getOptionalFormValue(formData, 'reportCardId'),
    })

    await createImageAnalysis(actor, input)
    revalidateImageAnalysisSurfaces()
    destination = buildActionRedirectPath(documentsRedirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(
      documentsRedirectPath,
      'error',
      getActionErrorMessage(error),
    )
  }

  redirect(destination)
}

export async function reviewImageAnalysisAction(formData: FormData) {
  const actor = await requireInternalAreaUser(documentsRedirectPath)
  assertPermission(actor, 'ai.imagem.revisar')
  enforceMutationRateLimit(actor, 'admin.image-analysis.review')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const imageAnalysisId = getOptionalFormValue(formData, 'imageAnalysisId')

    if (!imageAnalysisId) {
      throw new Error('Selecione uma analise assistiva para revisao humana.')
    }

    const input = reviewImageAnalysisInputSchema.parse({
      decision: getOptionalFormValue(formData, 'decision'),
      reviewNotes: getOptionalFormValue(formData, 'reviewNotes'),
    })

    await reviewImageAnalysis(actor, imageAnalysisId, input)
    revalidateImageAnalysisSurfaces()
    destination = buildActionRedirectPath(documentsRedirectPath, 'saved')
  } catch (error) {
    destination = buildActionRedirectPath(
      documentsRedirectPath,
      'error',
      getActionErrorMessage(error),
    )
  }

  redirect(destination)
}
