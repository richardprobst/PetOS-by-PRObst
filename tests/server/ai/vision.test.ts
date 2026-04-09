import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'
import { prisma } from '../../../server/db/prisma'
import { createAiInferenceRequest } from '../../../features/ai/domain'
import { executeAiProviderAdapter } from '../../../server/integrations/ai/adapter'
import {
  buildGalleryVisionInputSummary,
  buildPrePostVisionInputSummary,
  createVisionEnvelopeSnapshot,
} from '../../../features/ai/vision/domain'
import { createInternalAssistiveVisionAdapter } from '../../../features/ai/vision/adapter'
import {
  createImageAnalysis,
  resolveImageAnalysisReadUnitId,
  reviewImageAnalysis,
} from '../../../features/ai/vision/services'
import { createMediaAssetInputSchema } from '../../../features/documents/schemas'

const restorers: Array<() => void> = []

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'vision.local@petos.app',
  id: 'user_vision_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Vision Local Operator',
  permissions: ['ai.imagem.executar', 'ai.imagem.revisar', 'ai.imagem.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  email: 'vision.global@petos.app',
  id: 'user_vision_global',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  permissions: [...localActor.permissions, 'multiunidade.global.visualizar'],
}

async function withEnabledAiEnvironment<T>(callback: () => Promise<T> | T) {
  const previous = {
    AI_ENABLED: process.env.AI_ENABLED,
    AI_IMAGE_ANALYSIS_ENABLED: process.env.AI_IMAGE_ANALYSIS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_ENABLED: process.env.AI_PREDICTIVE_INSIGHTS_ENABLED,
    AI_IMAGE_ANALYSIS_BASE_QUOTA: process.env.AI_IMAGE_ANALYSIS_BASE_QUOTA,
    AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
  }

  Object.assign(process.env, enabledEnvironment)

  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }

  try {
    return await callback()
  } finally {
    restore()
  }
}

function createMediaAsset(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    accessLevel: 'PROTECTED',
    appointment: {
      id: 'appointment_1',
      unitId: 'unit_local',
    },
    appointmentId: 'appointment_1',
    archivedAt: null,
    client: {
      id: 'client_1',
    },
    clientId: 'client_1',
    createdAt: new Date('2026-04-09T12:00:00.000Z'),
    description: 'Assistive image capture',
    id: 'media_1',
    metadata: {
      captureStage: 'GALLERY',
      galleryLabel: 'banho-final',
      imageHeight: 900,
      imageWidth: 1200,
    },
    mimeType: 'image/jpeg',
    originalFileName: 'pet.jpg',
    pet: {
      id: 'pet_1',
    },
    petId: 'pet_1',
    sizeBytes: BigInt(2048),
    type: 'IMAGE',
    unitId: 'unit_local',
    ...overrides,
  } as any
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

test(
  'createMediaAssetInputSchema requires an appointment for PRE_SERVICE and POST_SERVICE captures',
  { concurrency: false },
  () => {
  const preWithoutAppointment = createMediaAssetInputSchema.safeParse({
    captureStage: 'PRE_SERVICE',
  })

  assert.equal(preWithoutAppointment.success, false)
  assert.match(preWithoutAppointment.error.issues[0]?.message ?? '', /linked to an appointment/)

  const galleryWithoutAppointment = createMediaAssetInputSchema.safeParse({
    captureStage: 'GALLERY',
  })

  assert.equal(galleryWithoutAppointment.success, true)
  },
)

test(
  'internal assistive vision adapter returns a completed assistive gallery result with human review required',
  { concurrency: false },
  async () => {
  const request = createAiInferenceRequest({
    inferenceKey: 'vision.gallery.metadata.v1',
    inputSummary: buildGalleryVisionInputSummary(createMediaAsset()),
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-09T13:00:00.000Z'),
    requestedByUserId: 'user_vision_adapter',
    requestId: 'req_vision_gallery',
    subject: {
      entityId: 'pet_1',
      entityName: 'Pet',
    },
    unitId: 'unit_local',
  })

  const result = await executeAiProviderAdapter(
    request,
    createInternalAssistiveVisionAdapter(),
    {
      consent: {
        grantedPurposes: ['IMAGE_GALLERY_METADATA'],
        origin: 'TUTOR_FLOW_OPT_IN',
      },
      environment: enabledEnvironment,
    },
  )

  assert.equal(result.envelope.status, 'COMPLETED')
  assert.equal(result.outcome.status, 'COMPLETED')
  assert.equal(result.outcome.interpretedResult.humanReviewRequired, true)
  assert.match(result.outcome.interpretedResult.summary, /galeria|assistiva/i)
  assert.equal(
    result.envelope.retention.artifacts.find(
      (artifact) => artifact.artifactCategory === 'RAW_PROVIDER_PAYLOAD',
    )?.status,
    'DISCARD_BY_DEFAULT',
  )
  },
)

test(
  'internal assistive vision adapter surfaces unsupported image-analysis inference keys as NOT_SUPPORTED',
  { concurrency: false },
  async () => {
  const request = createAiInferenceRequest({
    inferenceKey: 'vision.health.preliminary.v1',
    inputSummary: '{}',
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-09T13:05:00.000Z'),
    requestedByUserId: 'user_vision_adapter',
    requestId: 'req_vision_unsupported',
    subject: {
      entityId: 'pet_1',
      entityName: 'Pet',
    },
    unitId: 'unit_local',
  })

  const result = await executeAiProviderAdapter(
    request,
    createInternalAssistiveVisionAdapter(),
    {
      consent: {
        grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
        origin: 'TUTOR_FLOW_OPT_IN',
      },
      environment: enabledEnvironment,
    },
  )

  assert.equal(result.envelope.status, 'BLOCKED')
  assert.equal(result.outcome.status, 'BLOCKED')
  assert.equal(result.outcome.error.code, 'NOT_SUPPORTED')
  },
)

test(
  'createImageAnalysis persists a gallery analysis terminal record with audit trail and internal visibility',
  { concurrency: false },
  async () => {
  const auditEntries: string[] = []
  const mediaAsset = createMediaAsset()

  replaceMethod(prisma as object, 'mediaAsset', {
    findUnique: async () => mediaAsset,
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      auditLog: {
        create: async ({ data }: any) => {
          auditEntries.push(data.action)
          return data
        },
      },
      imageAnalysis: {
        create: async ({ data }: any) => ({
          appointment: mediaAsset.appointment,
          appointmentId: data.appointmentId,
          client: mediaAsset.client,
          clientId: data.clientId,
          comparisonMediaAsset: null,
          comparisonMediaAssetId: null,
          createdAt: new Date('2026-04-09T13:10:00.000Z'),
          envelopeSnapshot: data.envelopeSnapshot,
          executionId: data.executionId,
          executionStatus: data.executionStatus,
          id: 'analysis_gallery_1',
          inferenceKey: data.inferenceKey,
          kind: data.kind,
          mediaAsset,
          mediaAssetId: data.mediaAssetId,
          pet: mediaAsset.pet,
          petId: data.petId,
          recommendations: data.recommendations ?? null,
          requestId: data.requestId,
          requestedBy: { id: localActor.id },
          requestedByUserId: data.requestedByUserId,
          resultSummary: data.resultSummary,
          reviewNotes: null,
          reviewStatus: data.reviewStatus,
          reviewedAt: null,
          reviewedBy: null,
          reviewedByUserId: null,
          signals: data.signals ?? null,
          unitId: data.unitId,
          updatedAt: new Date('2026-04-09T13:10:00.000Z'),
          visibility: data.visibility,
        }),
      },
    }),
  )

  const analysis = await withEnabledAiEnvironment(() =>
    createImageAnalysis(localActor, {
      consentGranted: true,
      consentOrigin: 'TUTOR_FLOW_OPT_IN',
      kind: 'GALLERY_METADATA',
      mediaAssetId: mediaAsset.id,
    }),
  )

  assert.equal(
    ['COMPLETED', 'FAILED', 'BLOCKED'].includes(analysis.executionStatus),
    true,
  )
  assert.equal(analysis.kind, 'GALLERY_METADATA')
  assert.equal(analysis.mediaAssetId, mediaAsset.id)
  assert.equal(analysis.visibility, 'INTERNAL_OPERATOR_AND_AUDIT')
  assert.equal(typeof analysis.resultSummary, 'string')
  assert.equal(auditEntries[0], 'image_analysis.create')
  assert.match(auditEntries[1] ?? '', /^ai\.execution\./)
  },
)

test(
  'createImageAnalysis blocks invalid pre/post comparisons before persistence',
  { concurrency: false },
  async () => {
  const primaryMedia = createMediaAsset({
    id: 'media_pre_1',
    metadata: {
      captureStage: 'PRE_SERVICE',
      imageHeight: 900,
      imageWidth: 1200,
    },
  })
  const comparisonMedia = createMediaAsset({
    id: 'media_pre_2',
    metadata: {
      captureStage: 'PRE_SERVICE',
      imageHeight: 900,
      imageWidth: 1200,
    },
  })

  replaceMethod(prisma as object, 'mediaAsset', {
    findUnique: async ({ where }: any) =>
      where.id === primaryMedia.id ? primaryMedia : comparisonMedia,
  })

  await assert.rejects(
    withEnabledAiEnvironment(() =>
      createImageAnalysis(localActor, {
        comparisonMediaAssetId: comparisonMedia.id,
        consentGranted: true,
        consentOrigin: 'TUTOR_FLOW_OPT_IN',
        kind: 'PRE_POST_ASSISTED',
        mediaAssetId: primaryMedia.id,
      }),
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'UNPROCESSABLE_ENTITY' &&
      /one PRE_SERVICE image and one POST_SERVICE image/.test(error.message),
  )
  },
)

test(
  'reviewImageAnalysis resolves a pending review and records the human decision audit',
  { concurrency: false },
  async () => {
  const auditEntries: string[] = []
  const primaryMedia = createMediaAsset({
    metadata: {
      captureStage: 'PRE_SERVICE',
      imageHeight: 900,
      imageWidth: 1200,
    },
  })
  const comparisonMedia = createMediaAsset({
    id: 'media_post_1',
    metadata: {
      captureStage: 'POST_SERVICE',
      imageHeight: 920,
      imageWidth: 1180,
    },
  })
  const request = createAiInferenceRequest({
    inferenceKey: 'vision.prepost.assisted.v1',
    inputSummary: buildPrePostVisionInputSummary(primaryMedia, comparisonMedia),
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-09T13:15:00.000Z'),
    requestedByUserId: localActor.id,
    requestId: 'req_vision_review',
    subject: {
      entityId: 'appointment_1',
      entityName: 'Appointment',
    },
    unitId: 'unit_local',
  })

  const executed = await executeAiProviderAdapter(
    request,
    createInternalAssistiveVisionAdapter(),
    {
      consent: {
        grantedPurposes: ['IMAGE_OPERATIONAL_ASSISTED'],
        origin: 'TUTOR_FLOW_OPT_IN',
      },
      environment: enabledEnvironment,
    },
  )

  const storedAnalysis = {
    appointment: primaryMedia.appointment,
    appointmentId: 'appointment_1',
    client: primaryMedia.client,
    clientId: 'client_1',
    comparisonMediaAsset: comparisonMedia,
    comparisonMediaAssetId: comparisonMedia.id,
    createdAt: new Date('2026-04-09T13:16:00.000Z'),
    envelopeSnapshot: createVisionEnvelopeSnapshot(
      'PRE_POST_ASSISTED',
      executed.envelope,
      primaryMedia,
      comparisonMedia,
    ),
    executionId: executed.envelope.execution.executionId,
    executionStatus: 'COMPLETED',
    id: 'analysis_review_1',
    inferenceKey: executed.envelope.request.inferenceKey,
    kind: 'PRE_POST_ASSISTED',
    mediaAsset: primaryMedia,
    mediaAssetId: primaryMedia.id,
    pet: primaryMedia.pet,
    petId: 'pet_1',
    recommendations: null,
    requestId: executed.envelope.request.requestId,
    requestedBy: { id: localActor.id },
    requestedByUserId: localActor.id,
    resultSummary: executed.outcome.status === 'COMPLETED' ? executed.outcome.interpretedResult.summary : null,
    reviewNotes: null,
    reviewStatus: 'PENDING_REVIEW',
    reviewedAt: null,
    reviewedBy: null,
    reviewedByUserId: null,
    signals: null,
    unitId: 'unit_local',
    updatedAt: new Date('2026-04-09T13:16:00.000Z'),
    visibility: 'INTERNAL_OPERATOR_AND_AUDIT',
  } as any

  replaceMethod(prisma as object, 'imageAnalysis', {
    findUnique: async () => storedAnalysis,
  })
  replaceMethod(prisma as object, '$transaction', async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      auditLog: {
        create: async ({ data }: any) => {
          auditEntries.push(data.action)
          return data
        },
      },
      imageAnalysis: {
        update: async ({ data }: any) => ({
          ...storedAnalysis,
          reviewNotes: data.reviewNotes,
          reviewStatus: data.reviewStatus,
          reviewedAt: data.reviewedAt,
          reviewedBy: { id: localActor.id },
          reviewedByUserId: data.reviewedByUserId,
        }),
      },
    }),
  )

  const reviewed = await reviewImageAnalysis(localActor, storedAnalysis.id, {
    decision: 'APPROVED',
  })

  assert.equal(reviewed.reviewStatus, 'APPROVED')
  assert.equal(reviewed.reviewedByUserId, localActor.id)
  assert.deepEqual(auditEntries, [
    'image_analysis.review',
    'ai.execution.completed',
    'ai.decision.recorded',
  ])
  },
)

test(
  'resolveImageAnalysisReadUnitId keeps local scope by default and honors the global authorized context',
  { concurrency: false },
  () => {
  assert.equal(resolveImageAnalysisReadUnitId(localActor), 'unit_local')
  assert.equal(resolveImageAnalysisReadUnitId(globalReadActor), 'unit_branch')
  },
)
