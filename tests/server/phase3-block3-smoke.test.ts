import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { createAiInferenceRequest } from '../../features/ai/domain'
import { executeAiProviderAdapter } from '../../server/integrations/ai/adapter'
import { buildGalleryVisionInputSummary } from '../../features/ai/vision/domain'
import { createInternalAssistiveVisionAdapter } from '../../features/ai/vision/adapter'
import {
  imageAnalysisKindSchema,
} from '../../features/ai/vision/schemas'
import { resolveImageAnalysisReadUnitId } from '../../features/ai/vision/services'

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'block3.local@petos.app',
  id: 'user_block3_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Block 3 Local Operator',
  permissions: ['ai.imagem.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalActor: AuthenticatedUserData = {
  ...localActor,
  email: 'block3.global@petos.app',
  id: 'user_block3_global',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  permissions: [...localActor.permissions, 'multiunidade.global.visualizar'],
}

test('phase 3 block 3 smoke keeps image-analysis reads scoped to the active unit context', () => {
  assert.equal(resolveImageAnalysisReadUnitId(localActor), 'unit_local')
  assert.equal(resolveImageAnalysisReadUnitId(globalActor), 'unit_branch')
})

test('phase 3 block 3 smoke keeps the first cut restricted to gallery metadata and assistive pre/post flows', () => {
  assert.equal(imageAnalysisKindSchema.safeParse('GALLERY_METADATA').success, true)
  assert.equal(imageAnalysisKindSchema.safeParse('PRE_POST_ASSISTED').success, true)
  assert.equal(imageAnalysisKindSchema.safeParse('HEALTH_PRELIMINARY').success, false)
})

test('phase 3 block 3 smoke keeps completed image-analysis results assistive and under human review', async () => {
  const request = createAiInferenceRequest({
    inferenceKey: 'vision.gallery.metadata.v1',
    inputSummary: buildGalleryVisionInputSummary({
      accessLevel: 'PROTECTED',
      appointmentId: null,
      archivedAt: null,
      clientId: 'client_smoke',
      createdAt: new Date('2026-04-09T14:00:00.000Z'),
      description: 'Smoke gallery capture',
      id: 'media_smoke',
      metadata: {
        captureStage: 'GALLERY',
        galleryLabel: 'vitrine',
        imageHeight: 800,
        imageWidth: 1200,
      },
      mimeType: 'image/jpeg',
      originalFileName: 'smoke.jpg',
      petId: 'pet_smoke',
      sizeBytes: BigInt(4096),
      type: 'IMAGE',
      unitId: 'unit_local',
    }),
    module: 'IMAGE_ANALYSIS',
    origin: 'ADMIN_API',
    requestedAt: new Date('2026-04-09T14:00:00.000Z'),
    requestedByUserId: 'user_block3_smoke',
    requestId: 'req_block3_smoke',
    subject: {
      entityId: 'pet_smoke',
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
  assert.match(result.outcome.interpretedResult.summary, /assistiva|galeria/i)
})
