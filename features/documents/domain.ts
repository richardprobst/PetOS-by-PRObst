import { AssetAccessLevel, MediaType, SignatureMethod } from '@prisma/client'
import { AppError } from '@/server/http/errors'

interface LinkedOwnershipSnapshot {
  appointmentClientId?: string | null
  clientId?: string | null
  petClientId?: string | null
}

function collectLinkedClientIds(snapshot: LinkedOwnershipSnapshot) {
  return Array.from(
    new Set(
      [snapshot.clientId, snapshot.petClientId, snapshot.appointmentClientId].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  )
}

export function assertLinkedOwnershipConsistency(snapshot: LinkedOwnershipSnapshot) {
  const ownerIds = collectLinkedClientIds(snapshot)

  if (ownerIds.length > 1) {
    throw new AppError(
      'CONFLICT',
      409,
      'Linked document or media references must resolve to the same client.',
    )
  }
}

export function canTutorReadAsset(
  accessLevel: AssetAccessLevel,
  snapshot: LinkedOwnershipSnapshot,
  tutorId: string,
) {
  if (accessLevel === 'PRIVATE') {
    return false
  }

  return collectLinkedClientIds(snapshot).includes(tutorId)
}

export function parseAllowedMimeTypes(rawValue: string) {
  return new Set(
    rawValue
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function assertAllowedMimeType(
  mimeType: string,
  allowedMimeTypes: ReadonlySet<string>,
) {
  if (!allowedMimeTypes.has(mimeType.toLowerCase())) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, `File type ${mimeType} is not allowed.`)
  }
}

export function assertAllowedFileSize(sizeBytes: number, maxSizeMb: number) {
  const maxBytes = maxSizeMb * 1024 * 1024

  if (sizeBytes > maxBytes) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      `File exceeds the maximum allowed size of ${maxSizeMb} MB.`,
    )
  }
}

export function resolveMediaTypeFromMimeType(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return MediaType.IMAGE
  }

  if (mimeType.startsWith('video/')) {
    return MediaType.VIDEO
  }

  if (mimeType === 'application/pdf') {
    return MediaType.PDF
  }

  return MediaType.OTHER
}

export function parseJsonText(value: string, errorMessage: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new AppError('BAD_REQUEST', 400, errorMessage)
  }
}

export function asMetadataObject(value: unknown) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return value === undefined ? {} : { value }
  }

  return { ...value } as Record<string, unknown>
}

export function buildGeneratedFormDocument(rawPayload: string, title: string) {
  const parsedPayload = parseJsonText(rawPayload, 'Generated form payload must be valid JSON.')
  const now = new Date().toISOString()
  const normalizedTitle = title
    .normalize('NFKD')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

  return {
    content: Buffer.from(
      JSON.stringify(
        {
          generatedAt: now,
          payload: parsedPayload,
          title,
        },
        null,
        2,
      ),
      'utf8',
    ),
    metadata: {
      formPayload: parsedPayload,
      generatedFromForm: true,
    },
    mimeType: 'application/json',
    originalFileName: `${normalizedTitle || 'documento'}.json`,
  }
}

export function assertTutorSignatureMethod(method: SignatureMethod) {
  if (method === SignatureMethod.MANUAL) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Tutors cannot register manual signatures through the portal.',
    )
  }
}

export function documentRequiresSignature(metadata: unknown) {
  return Boolean(
    metadata &&
      typeof metadata === 'object' &&
      !Array.isArray(metadata) &&
      'requiresSignature' in metadata &&
      (metadata as Record<string, unknown>).requiresSignature === true,
  )
}
