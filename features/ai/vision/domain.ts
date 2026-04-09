import type { AiExecutionEnvelope } from '@/features/ai/schemas'
import type {
  ImageAnalysisKind,
  MediaCaptureStage,
} from '@/features/ai/vision/schemas'

export interface VisionMediaAssetSnapshot {
  accessLevel: string
  appointmentId: string | null
  archivedAt: Date | null
  clientId: string | null
  createdAt: Date
  description: string | null
  id: string
  metadata: unknown
  mimeType: string
  originalFileName: string | null
  petId: string | null
  sizeBytes: bigint
  type: string
  unitId: string
}

export interface NormalizedVisionMediaMetadata {
  captureStage: MediaCaptureStage
  galleryLabel: string | null
  imageHeight: number | null
  imageOrientation: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE' | null
  imageWidth: number | null
}

export interface VisionMediaAnalysisContext {
  accessLevel: string
  appointmentId: string | null
  captureStage: MediaCaptureStage
  clientId: string | null
  createdAt: string
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

type VisionEnvelopeSnapshot = {
  comparisonMedia: VisionMediaAnalysisContext | null
  envelope: AiExecutionEnvelope
  kind: ImageAnalysisKind
  primaryMedia: VisionMediaAnalysisContext
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, unknown>
  }

  return value as Record<string, unknown>
}

function readPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function inferOrientation(width: number | null, height: number | null) {
  if (!width || !height) {
    return null
  }

  if (width === height) {
    return 'SQUARE' as const
  }

  return width > height ? ('LANDSCAPE' as const) : ('PORTRAIT' as const)
}

export function normalizeVisionMediaMetadata(
  metadata: unknown,
): NormalizedVisionMediaMetadata {
  const source = asRecord(metadata)
  const imageWidth = readPositiveNumber(source.imageWidth)
  const imageHeight = readPositiveNumber(source.imageHeight)
  const captureStageValue =
    typeof source.captureStage === 'string' ? source.captureStage : null
  const galleryLabel =
    typeof source.galleryLabel === 'string' && source.galleryLabel.trim() !== ''
      ? source.galleryLabel.trim()
      : null

  return {
    captureStage:
      captureStageValue === 'PRE_SERVICE' || captureStageValue === 'POST_SERVICE'
        ? captureStageValue
        : 'GALLERY',
    galleryLabel,
    imageHeight,
    imageOrientation: inferOrientation(imageWidth, imageHeight),
    imageWidth,
  }
}

export function createVisionMediaAnalysisContext(
  mediaAsset: VisionMediaAssetSnapshot,
): VisionMediaAnalysisContext {
  const normalizedMetadata = normalizeVisionMediaMetadata(mediaAsset.metadata)

  return {
    accessLevel: mediaAsset.accessLevel,
    appointmentId: mediaAsset.appointmentId,
    captureStage: normalizedMetadata.captureStage,
    clientId: mediaAsset.clientId,
    createdAt: mediaAsset.createdAt.toISOString(),
    description: mediaAsset.description,
    galleryLabel: normalizedMetadata.galleryLabel,
    id: mediaAsset.id,
    imageHeight: normalizedMetadata.imageHeight,
    imageOrientation: normalizedMetadata.imageOrientation,
    imageWidth: normalizedMetadata.imageWidth,
    mimeType: mediaAsset.mimeType,
    originalFileName: mediaAsset.originalFileName,
    petId: mediaAsset.petId,
    sizeBytes: Number(mediaAsset.sizeBytes),
    type: mediaAsset.type,
    unitId: mediaAsset.unitId,
  }
}

export function buildGalleryVisionInputSummary(
  mediaAsset: VisionMediaAssetSnapshot,
) {
  return JSON.stringify(
    {
      analysisKind: 'GALLERY_METADATA',
      media: createVisionMediaAnalysisContext(mediaAsset),
    },
    null,
    2,
  )
}

export function buildPrePostVisionInputSummary(
  primaryMediaAsset: VisionMediaAssetSnapshot,
  comparisonMediaAsset: VisionMediaAssetSnapshot,
) {
  return JSON.stringify(
    {
      analysisKind: 'PRE_POST_ASSISTED',
      comparison: createVisionMediaAnalysisContext(comparisonMediaAsset),
      primary: createVisionMediaAnalysisContext(primaryMediaAsset),
    },
    null,
    2,
  )
}

export function createVisionEnvelopeSnapshot(
  kind: ImageAnalysisKind,
  envelope: AiExecutionEnvelope,
  primaryMediaAsset: VisionMediaAssetSnapshot,
  comparisonMediaAsset?: VisionMediaAssetSnapshot | null,
) {
  return JSON.parse(
    JSON.stringify({
      comparisonMedia: comparisonMediaAsset
        ? createVisionMediaAnalysisContext(comparisonMediaAsset)
        : null,
      envelope,
      kind,
      primaryMedia: createVisionMediaAnalysisContext(primaryMediaAsset),
    } satisfies VisionEnvelopeSnapshot),
  ) as VisionEnvelopeSnapshot
}

export function parseVisionEnvelopeSnapshot(input: unknown) {
  return JSON.parse(JSON.stringify(input)) as VisionEnvelopeSnapshot
}
