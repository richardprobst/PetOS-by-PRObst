import type { AiProviderAdapter } from '@/server/integrations/ai/contract'

type VisionMediaContext = {
  appointmentId: string | null
  captureStage: 'GALLERY' | 'PRE_SERVICE' | 'POST_SERVICE'
  clientId: string | null
  description: string | null
  galleryLabel: string | null
  id: string
  imageHeight: number | null
  imageOrientation: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE' | null
  imageWidth: number | null
  mimeType: string
  originalFileName: string | null
  petId: string | null
  sizeBytes: number
  type: string
  unitId: string
}

type GalleryInputSummary = {
  analysisKind: 'GALLERY_METADATA'
  media: VisionMediaContext
}

type PrePostInputSummary = {
  analysisKind: 'PRE_POST_ASSISTED'
  comparison: VisionMediaContext
  primary: VisionMediaContext
}

function parseJsonObject(input: string | null | undefined) {
  if (!input) {
    return null
  }

  try {
    const parsed = JSON.parse(input) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function asMediaContext(value: unknown): VisionMediaContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>

  if (typeof record.id !== 'string' || typeof record.mimeType !== 'string') {
    return null
  }

  return {
    appointmentId:
      typeof record.appointmentId === 'string' ? record.appointmentId : null,
    captureStage:
      record.captureStage === 'PRE_SERVICE' || record.captureStage === 'POST_SERVICE'
        ? record.captureStage
        : 'GALLERY',
    clientId: typeof record.clientId === 'string' ? record.clientId : null,
    description:
      typeof record.description === 'string' ? record.description : null,
    galleryLabel:
      typeof record.galleryLabel === 'string' ? record.galleryLabel : null,
    id: record.id,
    imageHeight:
      typeof record.imageHeight === 'number' ? record.imageHeight : null,
    imageOrientation:
      record.imageOrientation === 'LANDSCAPE' ||
      record.imageOrientation === 'PORTRAIT' ||
      record.imageOrientation === 'SQUARE'
        ? record.imageOrientation
        : null,
    imageWidth: typeof record.imageWidth === 'number' ? record.imageWidth : null,
    mimeType: record.mimeType,
    originalFileName:
      typeof record.originalFileName === 'string' ? record.originalFileName : null,
    petId: typeof record.petId === 'string' ? record.petId : null,
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : 0,
    type: typeof record.type === 'string' ? record.type : 'IMAGE',
    unitId: typeof record.unitId === 'string' ? record.unitId : '',
  }
}

function parseGallerySummary(input: string | null | undefined) {
  const parsed = parseJsonObject(input)

  if (!parsed || parsed.analysisKind !== 'GALLERY_METADATA') {
    return null
  }

  const media = asMediaContext(parsed.media)

  if (!media) {
    return null
  }

  return {
    analysisKind: 'GALLERY_METADATA',
    media,
  } satisfies GalleryInputSummary
}

function parsePrePostSummary(input: string | null | undefined) {
  const parsed = parseJsonObject(input)

  if (!parsed || parsed.analysisKind !== 'PRE_POST_ASSISTED') {
    return null
  }

  const primary = asMediaContext(parsed.primary)
  const comparison = asMediaContext(parsed.comparison)

  if (!primary || !comparison) {
    return null
  }

  return {
    analysisKind: 'PRE_POST_ASSISTED',
    comparison,
    primary,
  } satisfies PrePostInputSummary
}

function buildGalleryResult(input: GalleryInputSummary) {
  const { media } = input
  const orientation = media.imageOrientation ?? 'NOT_INFORMED'
  const hasAppointmentLink = media.appointmentId !== null
  const suggestedLabel =
    media.galleryLabel ??
    (media.captureStage === 'PRE_SERVICE'
      ? 'pre-service'
      : media.captureStage === 'POST_SERVICE'
        ? 'post-service'
        : 'gallery')

  return {
    humanReviewRequired: true,
    recommendations: [
      'Confirmar o rotulo operacional da captura antes de reutilizar esta imagem.',
      hasAppointmentLink
        ? 'Manter a vinculacao desta midia ao atendimento antes de qualquer uso em report card.'
        : 'Se a imagem fizer parte de um atendimento, vincule-a ao agendamento correspondente.',
      'Nao usar esta leitura assistiva como diagnostico veterinario.',
    ],
    signals: [
      {
        key: 'captureStage',
        label: 'Capture stage',
        value: media.captureStage,
      },
      {
        key: 'galleryLabel',
        label: 'Suggested gallery label',
        value: suggestedLabel,
      },
      {
        key: 'orientation',
        label: 'Image orientation',
        value: orientation,
      },
      {
        key: 'appointmentLinked',
        label: 'Appointment linked',
        value: hasAppointmentLink,
      },
    ],
    summary:
      media.captureStage === 'GALLERY'
        ? 'Imagem classificada para organizacao assistiva da galeria. Revisao humana continua obrigatoria.'
        : 'Imagem classificada como captura operacional assistiva. Revisao humana continua obrigatoria.',
  }
}

function buildPrePostResult(input: PrePostInputSummary) {
  const sameAppointment =
    input.primary.appointmentId !== null &&
    input.primary.appointmentId === input.comparison.appointmentId
  const samePet =
    input.primary.petId !== null && input.primary.petId === input.comparison.petId
  const stageCoverage =
    new Set([input.primary.captureStage, input.comparison.captureStage]).size === 2 &&
    [input.primary.captureStage, input.comparison.captureStage].includes('PRE_SERVICE') &&
    [input.primary.captureStage, input.comparison.captureStage].includes('POST_SERVICE')

  return {
    humanReviewRequired: true,
    recommendations: [
      stageCoverage && sameAppointment && samePet
        ? 'Comparar manualmente estado inicial e resultado final antes de concluir o report card.'
        : 'Registrar capturas PRE_SERVICE e POST_SERVICE do mesmo atendimento para uma revisao assistiva completa.',
      'Registrar no report card apenas o que for confirmado por operador humano.',
      'Nao usar esta leitura assistiva como diagnostico veterinario.',
    ],
    signals: [
      {
        key: 'sameAppointment',
        label: 'Same appointment',
        value: sameAppointment,
      },
      {
        key: 'samePet',
        label: 'Same pet',
        value: samePet,
      },
      {
        key: 'stageCoverage',
        label: 'Pre/post stage coverage',
        value: stageCoverage,
      },
      {
        key: 'primaryStage',
        label: 'Primary capture stage',
        value: input.primary.captureStage,
      },
      {
        key: 'comparisonStage',
        label: 'Comparison capture stage',
        value: input.comparison.captureStage,
      },
    ],
    summary:
      sameAppointment && samePet && stageCoverage
        ? 'Comparacao assistiva pre/post pronta para revisao humana do atendimento.'
        : 'Comparacao assistiva incompleta. Revise contexto, pet e estagios antes de usar no atendimento.',
  }
}

export function createInternalAssistiveVisionAdapter(): AiProviderAdapter {
  return {
    adapterId: 'internal-assistive-vision-adapter',
    contractVersion: 'phase3-block3-internal-v1',
    modelId: 'metadata-review-v1',
    providerId: 'internal-assistive-vision',
    supportedModules: ['IMAGE_ANALYSIS'],
    async execute({ request }) {
      const handledAt = new Date()

      if (request.inferenceKey.startsWith('vision.gallery.')) {
        const parsed = parseGallerySummary(request.inputSummary)

        if (!parsed) {
          return {
            error: {
              code: 'OPERATIONAL_FAILURE',
              message:
                'The assistive gallery analysis could not parse the normalized media summary.',
              retryable: false,
            },
            status: 'FAILED',
            technicalMetadata: {
              handledAt,
              latencyMs: 5,
              modelId: null,
              providerId: null,
              providerRequestId: null,
            },
          }
        }

        return {
          interpretedResult: buildGalleryResult(parsed),
          status: 'COMPLETED',
          technicalMetadata: {
            handledAt,
            latencyMs: 8,
            modelId: null,
            providerId: null,
            providerRequestId: null,
          },
        }
      }

      if (request.inferenceKey.startsWith('vision.prepost.')) {
        const parsed = parsePrePostSummary(request.inputSummary)

        if (!parsed) {
          return {
            error: {
              code: 'OPERATIONAL_FAILURE',
              message:
                'The assistive pre/post analysis could not parse the normalized comparison summary.',
              retryable: false,
            },
            status: 'FAILED',
            technicalMetadata: {
              handledAt,
              latencyMs: 5,
              modelId: null,
              providerId: null,
              providerRequestId: null,
            },
          }
        }

        return {
          interpretedResult: buildPrePostResult(parsed),
          status: 'COMPLETED',
          technicalMetadata: {
            handledAt,
            latencyMs: 9,
            modelId: null,
            providerId: null,
            providerRequestId: null,
          },
        }
      }

      return {
        error: {
          code: 'NOT_SUPPORTED',
          message:
            'The internal assistive vision adapter does not support the requested inference key.',
          retryable: false,
        },
        status: 'NOT_SUPPORTED',
        technicalMetadata: {
          handledAt,
          latencyMs: 1,
          modelId: null,
          providerId: null,
          providerRequestId: null,
        },
      }
    },
  }
}
