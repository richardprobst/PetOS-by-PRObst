import { Prisma, type ImageAnalysisReviewStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import { writeAiExecutionAuditLogs } from '@/server/audit/ai'
import { assertPermission } from '@/server/authorization/access-control'
import { prisma } from '@/server/db/prisma'
import {
  createStorageUnavailableAppError,
  isPrismaSchemaCompatibilityError,
  withPrismaSchemaCompatibilityFallback,
} from '@/server/db/prisma-schema-compat'
import { AppError } from '@/server/http/errors'
import { createAiInferenceRequest } from '@/features/ai/domain'
import type { AiExecutionEnvelope } from '@/features/ai/schemas'
import { createInternalAssistiveVisionAdapter } from '@/features/ai/vision/adapter'
import {
  buildGalleryVisionInputSummary,
  buildPrePostVisionInputSummary,
  createVisionEnvelopeSnapshot,
  normalizeVisionMediaMetadata,
  parseVisionEnvelopeSnapshot,
  type VisionMediaAssetSnapshot,
} from '@/features/ai/vision/domain'
import type {
  CreateImageAnalysisInput,
  ImageAnalysisKind,
  ListImageAnalysesQuery,
  ReviewImageAnalysisInput,
} from '@/features/ai/vision/schemas'
import {
  assertActorCanReadDocumentInScope,
  resolveDocumentReadUnitId,
} from '@/features/documents/services'
import { getReportCardById } from '@/features/report-cards/services'
import { executeAiProviderAdapter } from '@/server/integrations/ai/adapter'

const imageAnalysisDetailsInclude = Prisma.validator<Prisma.ImageAnalysisInclude>()({
  appointment: {
    include: {
      client: {
        include: {
          user: true,
        },
      },
      pet: true,
    },
  },
  client: {
    include: {
      user: true,
    },
  },
  comparisonMediaAsset: true,
  mediaAsset: true,
  pet: true,
  requestedBy: true,
  reviewedBy: true,
})

type ImageAnalysisDetails = Prisma.ImageAnalysisGetPayload<{
  include: typeof imageAnalysisDetailsInclude
}>

type MediaAssetForAnalysis = Prisma.MediaAssetGetPayload<{
  include: {
    appointment: true
    client: true
    pet: true
  }
}>

type ImageAnalysisOrigin = 'ADMIN_API' | 'SERVER_ACTION'

const internalVisionAdapter = createInternalAssistiveVisionAdapter()

function createImageAnalysisStorageUnavailableError() {
  return createStorageUnavailableAppError('assistive image analysis')
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
}

function buildInferenceKey(kind: ImageAnalysisKind) {
  return kind === 'GALLERY_METADATA'
    ? 'vision.gallery.metadata.v1'
    : 'vision.prepost.assisted.v1'
}

function buildGrantedPurposes(kind: ImageAnalysisKind, granted: boolean) {
  if (!granted) {
    return [] as const
  }

  return [
    kind === 'GALLERY_METADATA'
      ? 'IMAGE_GALLERY_METADATA'
      : 'IMAGE_OPERATIONAL_ASSISTED',
  ] as const
}

export function resolveImageAnalysisReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveDocumentReadUnitId(actor, requestedUnitId)
}

function assertImageLikeMedia(mediaAsset: MediaAssetForAnalysis) {
  if (mediaAsset.archivedAt) {
    throw new AppError('CONFLICT', 409, 'Archived media assets cannot be analyzed.')
  }

  if (mediaAsset.type !== 'IMAGE' || !mediaAsset.mimeType.startsWith('image/')) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Only image media assets can be used in the assistive image analysis flow.',
    )
  }
}

async function loadMediaAssetForAnalysis(
  actor: AuthenticatedUserData,
  mediaAssetId: string,
): Promise<MediaAssetForAnalysis> {
  const mediaAsset = await prisma.mediaAsset.findUnique({
    where: {
      id: mediaAssetId,
    },
    include: {
      appointment: true,
      client: true,
      pet: true,
    },
  })

  if (!mediaAsset) {
    throw new AppError('NOT_FOUND', 404, 'Media asset not found.')
  }

  assertActorCanReadDocumentInScope(actor, mediaAsset.unitId)
  assertImageLikeMedia(mediaAsset)

  return mediaAsset
}

function toVisionMediaSnapshot(mediaAsset: MediaAssetForAnalysis): VisionMediaAssetSnapshot {
  return {
    accessLevel: mediaAsset.accessLevel,
    appointmentId: mediaAsset.appointmentId,
    archivedAt: mediaAsset.archivedAt,
    clientId: mediaAsset.clientId,
    createdAt: mediaAsset.createdAt,
    description: mediaAsset.description,
    id: mediaAsset.id,
    metadata: mediaAsset.metadata,
    mimeType: mediaAsset.mimeType,
    originalFileName: mediaAsset.originalFileName,
    petId: mediaAsset.petId,
    sizeBytes: mediaAsset.sizeBytes,
    type: mediaAsset.type,
    unitId: mediaAsset.unitId,
  }
}

function buildSubject(
  kind: ImageAnalysisKind,
  primaryMediaAsset: MediaAssetForAnalysis,
  comparisonMediaAsset?: MediaAssetForAnalysis | null,
) {
  if (kind === 'PRE_POST_ASSISTED' && primaryMediaAsset.appointmentId) {
    return {
      entityId: primaryMediaAsset.appointmentId,
      entityName: 'Appointment',
    }
  }

  if (primaryMediaAsset.petId) {
    return {
      entityId: primaryMediaAsset.petId,
      entityName: 'Pet',
    }
  }

  return {
    entityId: comparisonMediaAsset?.id ?? primaryMediaAsset.id,
    entityName: 'MediaAsset',
  }
}

function buildReferences(
  primaryMediaAsset: MediaAssetForAnalysis,
  comparisonMediaAsset?: MediaAssetForAnalysis | null,
) {
  const references = [
    {
      kind: 'mediaAsset',
      value: primaryMediaAsset.id,
    },
  ]

  if (comparisonMediaAsset) {
    references.push({
      kind: 'comparisonMediaAsset',
      value: comparisonMediaAsset.id,
    })
  }

  if (primaryMediaAsset.appointmentId) {
    references.push({
      kind: 'appointment',
      value: primaryMediaAsset.appointmentId,
    })
  }

  if (primaryMediaAsset.petId) {
    references.push({
      kind: 'pet',
      value: primaryMediaAsset.petId,
    })
  }

  if (primaryMediaAsset.clientId) {
    references.push({
      kind: 'client',
      value: primaryMediaAsset.clientId,
    })
  }

  return references
}

function assertPrePostAnalysisInput(
  primaryMediaAsset: MediaAssetForAnalysis,
  comparisonMediaAsset: MediaAssetForAnalysis,
) {
  if (primaryMediaAsset.id === comparisonMediaAsset.id) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Pre and post assistive analysis requires two distinct media assets.',
    )
  }

  if (!primaryMediaAsset.appointmentId || !comparisonMediaAsset.appointmentId) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Pre and post assistive analysis requires both images to be linked to the same appointment.',
    )
  }

  if (primaryMediaAsset.appointmentId !== comparisonMediaAsset.appointmentId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Pre and post assistive analysis only supports images from the same appointment.',
    )
  }

  if (!primaryMediaAsset.petId || primaryMediaAsset.petId !== comparisonMediaAsset.petId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Pre and post assistive analysis only supports images from the same pet.',
    )
  }

  if (primaryMediaAsset.unitId !== comparisonMediaAsset.unitId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Pre and post assistive analysis cannot cross unit boundaries.',
    )
  }

  const primaryMetadata = normalizeVisionMediaMetadata(primaryMediaAsset.metadata)
  const comparisonMetadata = normalizeVisionMediaMetadata(comparisonMediaAsset.metadata)
  const stages = new Set([
    primaryMetadata.captureStage,
    comparisonMetadata.captureStage,
  ])

  if (!stages.has('PRE_SERVICE') || !stages.has('POST_SERVICE')) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Pre and post assistive analysis requires one PRE_SERVICE image and one POST_SERVICE image.',
    )
  }
}

function mapEnvelopeToReviewStatus(
  envelope: AiExecutionEnvelope,
): ImageAnalysisReviewStatus {
  if (envelope.status !== 'COMPLETED') {
    return 'NOT_REQUIRED'
  }

  return envelope.outcome?.interpretedResult.humanReviewRequired
    ? 'PENDING_REVIEW'
    : 'NOT_REQUIRED'
}

function mapEnvelopeStatusToExecutionStatus(envelope: AiExecutionEnvelope) {
  switch (envelope.status) {
    case 'COMPLETED':
    case 'BLOCKED':
    case 'FAILED':
      return envelope.status
    default:
      throw new Error(
        `Image analysis persistence only accepts terminal envelopes, received "${envelope.status}".`,
      )
  }
}

function createResultSummary(envelope: AiExecutionEnvelope) {
  const outcome = envelope.outcome

  if (!outcome) {
    throw new Error('Terminal image analysis envelopes must include an outcome.')
  }

  if (outcome.status === 'COMPLETED') {
    return outcome.interpretedResult.summary
  }

  return outcome.error.message
}

function createSignalsPayload(envelope: AiExecutionEnvelope) {
  const outcome = envelope.outcome

  if (!outcome || outcome.status !== 'COMPLETED') {
    return undefined
  }

  return toJsonValue(outcome.interpretedResult.signals)
}

function createRecommendationsPayload(envelope: AiExecutionEnvelope) {
  const outcome = envelope.outcome

  if (!outcome || outcome.status !== 'COMPLETED') {
    return undefined
  }

  return toJsonValue(outcome.interpretedResult.recommendations)
}

async function persistImageAnalysis(
  actor: AuthenticatedUserData,
  input: {
    comparisonMediaAsset?: MediaAssetForAnalysis | null
    envelope: AiExecutionEnvelope
    kind: ImageAnalysisKind
    primaryMediaAsset: MediaAssetForAnalysis
  },
) {
  const envelopeSnapshot = createVisionEnvelopeSnapshot(
    input.kind,
    input.envelope,
    toVisionMediaSnapshot(input.primaryMediaAsset),
    input.comparisonMediaAsset
      ? toVisionMediaSnapshot(input.comparisonMediaAsset)
      : null,
  )

  return prisma.$transaction(async (tx) => {
    const recommendations = createRecommendationsPayload(input.envelope)
    const signals = createSignalsPayload(input.envelope)
    const imageAnalysis = await tx.imageAnalysis.create({
      data: {
        appointmentId: input.primaryMediaAsset.appointmentId,
        clientId: input.primaryMediaAsset.clientId,
        comparisonMediaAssetId: input.comparisonMediaAsset?.id ?? null,
        envelopeSnapshot: toJsonObject(envelopeSnapshot),
        executionId: input.envelope.execution.executionId,
        executionStatus: mapEnvelopeStatusToExecutionStatus(input.envelope),
        inferenceKey: input.envelope.request.inferenceKey,
        kind: input.kind,
        mediaAssetId: input.primaryMediaAsset.id,
        petId: input.primaryMediaAsset.petId,
        ...(recommendations !== undefined
          ? { recommendations }
          : {}),
        requestId: input.envelope.request.requestId,
        requestedByUserId: actor.id,
        resultSummary: createResultSummary(input.envelope),
        reviewStatus: mapEnvelopeToReviewStatus(input.envelope),
        ...(signals !== undefined
          ? { signals }
          : {}),
        unitId: input.primaryMediaAsset.unitId,
        visibility: 'INTERNAL_OPERATOR_AND_AUDIT',
      },
      include: imageAnalysisDetailsInclude,
    })

    await writeAuditLog(tx, {
      action: 'image_analysis.create',
      details: {
        appointmentId: imageAnalysis.appointmentId,
        comparisonMediaAssetId: imageAnalysis.comparisonMediaAssetId,
        executionStatus: imageAnalysis.executionStatus,
        inferenceKey: imageAnalysis.inferenceKey,
        kind: imageAnalysis.kind,
        mediaAssetId: imageAnalysis.mediaAssetId,
        petId: imageAnalysis.petId,
        reviewStatus: imageAnalysis.reviewStatus,
      },
      entityId: imageAnalysis.id,
      entityName: 'ImageAnalysis',
      unitId: imageAnalysis.unitId,
      userId: actor.id,
    })

    await writeAiExecutionAuditLogs(tx, {
      actor,
      envelope: input.envelope,
    })

    return imageAnalysis
  })
}

export async function listImageAnalyses(
  actor: AuthenticatedUserData,
  query: ListImageAnalysesQuery,
) {
  assertPermission(actor, 'ai.imagem.visualizar')
  const unitId = resolveImageAnalysisReadUnitId(actor, query.unitId ?? null)

  return withPrismaSchemaCompatibilityFallback(
    () =>
      prisma.imageAnalysis.findMany({
        where: {
          ...(unitId ? { unitId } : {}),
          ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
          ...(query.kind ? { kind: query.kind } : {}),
          ...(query.mediaAssetId
            ? {
                OR: [
                  { mediaAssetId: query.mediaAssetId },
                  { comparisonMediaAssetId: query.mediaAssetId },
                ],
              }
            : {}),
          ...(query.petId ? { petId: query.petId } : {}),
          ...(query.reviewStatus ? { reviewStatus: query.reviewStatus } : {}),
        },
        include: imageAnalysisDetailsInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    () => [] as ImageAnalysisDetails[],
  )
}

export async function createImageAnalysis(
  actor: AuthenticatedUserData,
  input: CreateImageAnalysisInput,
  origin: ImageAnalysisOrigin = 'SERVER_ACTION',
) {
  assertPermission(actor, 'ai.imagem.executar')

  const primaryMediaAsset = await loadMediaAssetForAnalysis(actor, input.mediaAssetId)
  const comparisonMediaAsset =
    input.kind === 'PRE_POST_ASSISTED'
      ? await loadMediaAssetForAnalysis(actor, input.comparisonMediaAssetId)
      : null

  if (comparisonMediaAsset) {
    assertPrePostAnalysisInput(primaryMediaAsset, comparisonMediaAsset)
  }

  if (input.kind === 'PRE_POST_ASSISTED' && input.reportCardId) {
    const reportCard = await getReportCardById(actor, input.reportCardId)

    if (reportCard.appointmentId !== primaryMediaAsset.appointmentId) {
      throw new AppError(
        'CONFLICT',
        409,
        'The selected report card does not belong to the appointment used in the assistive pre/post analysis.',
      )
    }
  }

  const request = createAiInferenceRequest({
    flagKeys: undefined,
    inferenceKey: buildInferenceKey(input.kind),
    inputSummary:
      input.kind === 'GALLERY_METADATA'
        ? buildGalleryVisionInputSummary(toVisionMediaSnapshot(primaryMediaAsset))
        : buildPrePostVisionInputSummary(
            toVisionMediaSnapshot(primaryMediaAsset),
            toVisionMediaSnapshot(comparisonMediaAsset as MediaAssetForAnalysis),
          ),
    module: 'IMAGE_ANALYSIS',
    origin,
    references: buildReferences(primaryMediaAsset, comparisonMediaAsset),
    requestedAt: new Date(),
    requestedByUserId: actor.id,
    requestId: `img_analysis_${randomUUID()}`,
    subject: buildSubject(input.kind, primaryMediaAsset, comparisonMediaAsset),
    unitId: primaryMediaAsset.unitId,
  })

  const executionResult = await executeAiProviderAdapter(request, internalVisionAdapter, {
    consent: {
      grantedPurposes: [...buildGrantedPurposes(input.kind, input.consentGranted)],
      origin: input.consentOrigin,
      purpose:
        input.kind === 'GALLERY_METADATA'
          ? 'IMAGE_GALLERY_METADATA'
          : 'IMAGE_OPERATIONAL_ASSISTED',
      scope: 'PET',
    },
  })

  try {
    return await persistImageAnalysis(actor, {
      comparisonMediaAsset,
      envelope: executionResult.envelope,
      kind: input.kind,
      primaryMediaAsset,
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createImageAnalysisStorageUnavailableError()
    }

    throw error
  }
}

export async function reviewImageAnalysis(
  actor: AuthenticatedUserData,
  imageAnalysisId: string,
  input: ReviewImageAnalysisInput,
) {
  assertPermission(actor, 'ai.imagem.revisar')
  let imageAnalysis: ImageAnalysisDetails | null

  try {
    imageAnalysis = await prisma.imageAnalysis.findUnique({
      where: {
        id: imageAnalysisId,
      },
      include: imageAnalysisDetailsInclude,
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createImageAnalysisStorageUnavailableError()
    }

    throw error
  }

  if (!imageAnalysis) {
    throw new AppError('NOT_FOUND', 404, 'Image analysis not found.')
  }

  assertActorCanReadDocumentInScope(actor, imageAnalysis.unitId)

  if (imageAnalysis.executionStatus !== 'COMPLETED') {
    throw new AppError(
      'CONFLICT',
      409,
      'Only completed assistive image analyses can go through human review.',
    )
  }

  if (imageAnalysis.reviewStatus !== 'PENDING_REVIEW') {
    throw new AppError(
      'CONFLICT',
      409,
      'This assistive image analysis has already been resolved or does not require review.',
    )
  }

  const reviewedAt = new Date()
  let updated: ImageAnalysisDetails

  try {
    updated = await prisma.$transaction(async (tx) => {
      const updatedImageAnalysis = await tx.imageAnalysis.update({
        where: {
          id: imageAnalysisId,
        },
        data: {
          reviewNotes: input.reviewNotes ?? null,
          reviewStatus: input.decision,
          reviewedAt,
          reviewedByUserId: actor.id,
        },
        include: imageAnalysisDetailsInclude,
      })

      await writeAuditLog(tx, {
        action: 'image_analysis.review',
        details: {
          decision: input.decision,
          reviewNotes: input.reviewNotes ?? null,
        },
        entityId: updatedImageAnalysis.id,
        entityName: 'ImageAnalysis',
        unitId: updatedImageAnalysis.unitId,
        userId: actor.id,
      })

      const envelope = parseVisionEnvelopeSnapshot(imageAnalysis.envelopeSnapshot)
        .envelope as AiExecutionEnvelope

      await writeAiExecutionAuditLogs(tx, {
        actor,
        envelope,
        humanDecision: {
          decidedAt: reviewedAt,
          decidedByUserId: actor.id,
          decisionReasonCode: input.decision,
          decisionType: 'IMAGE_ANALYSIS_REVIEW',
          justificationSummary:
            input.reviewNotes ??
            `Assistive image analysis ${input.decision.toLowerCase()} by operator review.`,
        },
      })

      return updatedImageAnalysis
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createImageAnalysisStorageUnavailableError()
    }

    throw error
  }

  return updated
}
