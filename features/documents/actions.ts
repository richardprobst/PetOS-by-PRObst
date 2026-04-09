'use server'

import { SignatureMethod } from '@prisma/client'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  archiveDocumentInputSchema,
  archiveMediaAssetInputSchema,
  createDocumentInputSchema,
  createMediaAssetInputSchema,
  signDocumentInputSchema,
} from '@/features/documents/schemas'
import {
  archiveDocument,
  archiveMediaAsset,
  createDocument,
  createMediaAsset,
  signDocument,
} from '@/features/documents/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser, requireTutorAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFile, getOptionalFormValue, hasCheckedFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const adminRedirectPath = '/admin/documentos'
const tutorRedirectPath = '/tutor'

async function resolveRequestIpAddress() {
  const headerStore = await headers()
  const forwardedFor = headerStore.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || undefined
  }

  return headerStore.get('x-real-ip') ?? undefined
}

export async function uploadDocumentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(adminRedirectPath)
  assertPermission(actor, 'documento.editar')
  enforceMutationRateLimit(actor, 'admin.documents.create')
  const file = getOptionalFile(formData, 'file')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const title = getOptionalFormValue(formData, 'title')
    const type = getOptionalFormValue(formData, 'type')

    if (!title || !type) {
      throw new Error('Titulo e tipo do documento sao obrigatorios.')
    }

    const input = createDocumentInputSchema.parse({
      accessLevel: getOptionalFormValue(formData, 'accessLevel'),
      appointmentId: getOptionalFormValue(formData, 'appointmentId'),
      clientId: getOptionalFormValue(formData, 'clientId'),
      expiresAt: getOptionalFormValue(formData, 'expiresAt'),
      formPayload: getOptionalFormValue(formData, 'formPayload'),
      metadataJson: getOptionalFormValue(formData, 'metadataJson'),
      petId: getOptionalFormValue(formData, 'petId'),
      requiresSignature: hasCheckedFormValue(formData, 'requiresSignature'),
      title,
      type,
    })

    await createDocument(actor, input, file)
    revalidatePath(adminRedirectPath)
    revalidatePath(tutorRedirectPath)
    destination = buildActionRedirectPath(adminRedirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(adminRedirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function uploadMediaAssetAction(formData: FormData) {
  const actor = await requireInternalAreaUser(adminRedirectPath)
  assertPermission(actor, 'midia.editar')
  enforceMutationRateLimit(actor, 'admin.media-assets.create')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    const file = getOptionalFile(formData, 'file')

    if (!file) {
      throw new Error('Selecione um arquivo de midia para upload.')
    }

    const input = createMediaAssetInputSchema.parse({
      accessLevel: getOptionalFormValue(formData, 'accessLevel'),
      appointmentId: getOptionalFormValue(formData, 'appointmentId'),
      captureStage: getOptionalFormValue(formData, 'captureStage'),
      clientId: getOptionalFormValue(formData, 'clientId'),
      description: getOptionalFormValue(formData, 'description'),
      galleryLabel: getOptionalFormValue(formData, 'galleryLabel'),
      metadataJson: getOptionalFormValue(formData, 'metadataJson'),
      petId: getOptionalFormValue(formData, 'petId'),
      type: getOptionalFormValue(formData, 'type'),
    })

    await createMediaAsset(actor, input, file)
    revalidatePath(adminRedirectPath)
    revalidatePath(tutorRedirectPath)
    destination = buildActionRedirectPath(adminRedirectPath, 'created')
  } catch (error) {
    destination = buildActionRedirectPath(adminRedirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function signDocumentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(adminRedirectPath)
  assertPermission(actor, 'documento.assinar')
  enforceMutationRateLimit(actor, 'admin.documents.sign')
  const documentId = getOptionalFormValue(formData, 'documentId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (!documentId) {
      throw new Error('Selecione um documento para assinatura.')
    }

    const signerName = getOptionalFormValue(formData, 'signerName')

    if (!signerName) {
      throw new Error('Informe o nome do assinante.')
    }

    const input = signDocumentInputSchema.parse({
      method: getOptionalFormValue(formData, 'method'),
      payloadJson: getOptionalFormValue(formData, 'payloadJson'),
      signerEmail: getOptionalFormValue(formData, 'signerEmail'),
      signerName,
    })

    await signDocument(actor, documentId, input, {
      signerIp: await resolveRequestIpAddress(),
    })
    revalidatePath(adminRedirectPath)
    revalidatePath(tutorRedirectPath)
    destination = buildActionRedirectPath(adminRedirectPath, 'saved')
  } catch (error) {
    destination = buildActionRedirectPath(adminRedirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function archiveDocumentAction(formData: FormData) {
  const actor = await requireInternalAreaUser(adminRedirectPath)
  assertPermission(actor, 'documento.editar')
  enforceMutationRateLimit(actor, 'admin.documents.archive')
  const documentId = getOptionalFormValue(formData, 'documentId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (!documentId) {
      throw new Error('Selecione um documento para arquivar.')
    }

    const input = archiveDocumentInputSchema.parse({
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await archiveDocument(actor, documentId, input)
    revalidatePath(adminRedirectPath)
    revalidatePath(tutorRedirectPath)
    destination = buildActionRedirectPath(adminRedirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(adminRedirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function archiveMediaAssetAction(formData: FormData) {
  const actor = await requireInternalAreaUser(adminRedirectPath)
  assertPermission(actor, 'midia.editar')
  enforceMutationRateLimit(actor, 'admin.media-assets.archive')
  const mediaAssetId = getOptionalFormValue(formData, 'mediaAssetId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (!mediaAssetId) {
      throw new Error('Selecione uma midia para arquivar.')
    }

    const input = archiveMediaAssetInputSchema.parse({
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await archiveMediaAsset(actor, mediaAssetId, input)
    revalidatePath(adminRedirectPath)
    revalidatePath(tutorRedirectPath)
    destination = buildActionRedirectPath(adminRedirectPath, 'updated')
  } catch (error) {
    destination = buildActionRedirectPath(adminRedirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}

export async function signTutorDocumentAction(formData: FormData) {
  const tutor = await requireTutorAreaUser(tutorRedirectPath)
  assertPermission(tutor, 'documento.assinar_proprio')
  enforceMutationRateLimit(tutor, 'tutor.documents.sign')
  const documentId = getOptionalFormValue(formData, 'documentId')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (!documentId) {
      throw new Error('Selecione um documento para assinatura.')
    }

    const signerName = getOptionalFormValue(formData, 'signerName')

    if (!signerName) {
      throw new Error('Informe o nome para assinatura.')
    }

    const input = signDocumentInputSchema.parse({
      method: SignatureMethod.DIGITAL_TYPED,
      payloadJson: getOptionalFormValue(formData, 'payloadJson'),
      signerEmail: getOptionalFormValue(formData, 'signerEmail'),
      signerName,
    })

    await signDocument(tutor, documentId, input, {
      signerIp: await resolveRequestIpAddress(),
    })
    revalidatePath(adminRedirectPath)
    revalidatePath(tutorRedirectPath)
    destination = buildActionRedirectPath(tutorRedirectPath, 'saved')
  } catch (error) {
    destination = buildActionRedirectPath(tutorRedirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
