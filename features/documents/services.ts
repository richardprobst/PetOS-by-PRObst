import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import {
  assertActorCanAccessLocalUnitRecord,
  assertActorCanAccessOwnershipBinding,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { assertPermission, isTutorUser } from '@/server/authorization/access-control'
import { AppError } from '@/server/http/errors'
import { deleteBinaryObject, readBinaryObject, storeBinaryObject } from '@/server/storage/service'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'
import {
  asMetadataObject,
  assertAllowedFileSize,
  assertAllowedMimeType,
  assertLinkedOwnershipConsistency,
  assertTutorSignatureMethod,
  buildGeneratedFormDocument,
  canTutorReadAsset,
  documentRequiresSignature,
  parseAllowedMimeTypes,
  parseJsonText,
  resolveMediaTypeFromMimeType,
} from '@/features/documents/domain'
import type {
  ArchiveDocumentInput,
  ArchiveMediaAssetInput,
  CreateDocumentInput,
  CreateMediaAssetInput,
  ListDocumentsQuery,
  ListMediaAssetsQuery,
  SignDocumentInput,
} from '@/features/documents/schemas'

const documentDetailsInclude = Prisma.validator<Prisma.DocumentInclude>()({
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
  archivedBy: true,
  client: {
    include: {
      user: true,
    },
  },
  pet: {
    include: {
      client: {
        include: {
          user: true,
        },
      },
    },
  },
  signatures: {
    include: {
      signerUser: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  uploadedBy: true,
})

const mediaAssetDetailsInclude = Prisma.validator<Prisma.MediaAssetInclude>()({
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
  archivedBy: true,
  client: {
    include: {
      user: true,
    },
  },
  pet: {
    include: {
      client: {
        include: {
          user: true,
        },
      },
    },
  },
  uploadedBy: true,
})

const tutorDocumentSelect = Prisma.validator<Prisma.DocumentSelect>()({
  id: true,
  unitId: true,
  appointmentId: true,
  clientId: true,
  petId: true,
  type: true,
  title: true,
  originalFileName: true,
  mimeType: true,
  sizeBytes: true,
  accessLevel: true,
  expiresAt: true,
  metadata: true,
  createdAt: true,
  appointment: {
    select: {
      clientId: true,
    },
  },
  pet: {
    select: {
      clientId: true,
    },
  },
  signatures: {
    select: {
      signerUserId: true,
      status: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
})

const tutorMediaAssetSelect = Prisma.validator<Prisma.MediaAssetSelect>()({
  id: true,
  unitId: true,
  appointmentId: true,
  clientId: true,
  petId: true,
  type: true,
  originalFileName: true,
  mimeType: true,
  sizeBytes: true,
  accessLevel: true,
  description: true,
  metadata: true,
  createdAt: true,
  appointment: {
    select: {
      clientId: true,
    },
  },
  pet: {
    select: {
      clientId: true,
    },
  },
})

type DocumentDetails = Prisma.DocumentGetPayload<{
  include: typeof documentDetailsInclude
}>

type MediaAssetDetails = Prisma.MediaAssetGetPayload<{
  include: typeof mediaAssetDetailsInclude
}>

type TutorDocumentSummary = Prisma.DocumentGetPayload<{
  select: typeof tutorDocumentSelect
}>

type TutorMediaAssetSummary = Prisma.MediaAssetGetPayload<{
  select: typeof tutorMediaAssetSelect
}>

interface TutorReadableDocumentLike {
  accessLevel: DocumentDetails['accessLevel']
  appointment: {
    clientId: string
  } | null
  archivedAt: Date | null
  clientId: string | null
  pet: {
    clientId: string
  } | null
  unitId: string
}

interface TutorReadableMediaLike {
  accessLevel: MediaAssetDetails['accessLevel']
  appointment: {
    clientId: string
  } | null
  archivedAt: Date | null
  clientId: string | null
  pet: {
    clientId: string
  } | null
  unitId: string
}

interface TutorSignaturePendingDocument {
  metadata: unknown
  signatures: Array<{
    signerUserId: string | null
    status: string
  }>
}

type DocumentScopeQuery = {
  unitId?: string | null
}

export function resolveDocumentReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId)
}

export function assertActorCanReadDocumentInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: DocumentScopeQuery,
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, {
    requestedUnitId: options?.unitId,
  })
}

function toInputJsonObject(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(asMetadataObject(value))) as Prisma.InputJsonObject
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

interface AssetBindingInput {
  appointmentId?: string
  clientId?: string
  petId?: string
}

function buildDocumentOwnerSnapshot(document: TutorReadableDocumentLike) {
  return {
    appointmentClientId: document.appointment?.clientId,
    clientId: document.clientId,
    petClientId: document.pet?.clientId,
  }
}

function buildMediaOwnerSnapshot(mediaAsset: TutorReadableMediaLike) {
  return {
    appointmentClientId: mediaAsset.appointment?.clientId,
    clientId: mediaAsset.clientId,
    petClientId: mediaAsset.pet?.clientId,
  }
}

function deriveDocumentFileName(document: DocumentDetails) {
  return document.originalFileName ?? `${document.title}.bin`
}

function deriveMediaFileName(mediaAsset: MediaAssetDetails) {
  return mediaAsset.originalFileName ?? `${mediaAsset.id}.bin`
}

function resolveTutorAssetUnitId(tutor: AuthenticatedUserData) {
  return resolveScopedUnitId(tutor, null)
}

function sanitizeTutorDocumentMetadata(metadata: unknown) {
  return {
    requiresSignature: documentRequiresSignature(metadata),
  }
}

function sanitizeTutorMediaMetadata(metadata: unknown) {
  const parsedMetadata = asMetadataObject(metadata)

  return {
    captureStage:
      typeof parsedMetadata.captureStage === 'string'
        ? parsedMetadata.captureStage
        : null,
    galleryLabel:
      typeof parsedMetadata.galleryLabel === 'string'
        ? parsedMetadata.galleryLabel
        : null,
  }
}

function sanitizeTutorDocument(document: TutorDocumentSummary) {
  return {
    id: document.id,
    unitId: document.unitId,
    appointmentId: document.appointmentId,
    clientId: document.clientId,
    petId: document.petId,
    type: document.type,
    title: document.title,
    originalFileName: document.originalFileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    accessLevel: document.accessLevel,
    expiresAt: document.expiresAt,
    metadata: sanitizeTutorDocumentMetadata(document.metadata),
    createdAt: document.createdAt,
    signatures: document.signatures.map((signature) => ({
      signerUserId: signature.signerUserId,
      status: signature.status,
    })),
  }
}

function sanitizeTutorMediaAsset(mediaAsset: TutorMediaAssetSummary) {
  return {
    id: mediaAsset.id,
    unitId: mediaAsset.unitId,
    appointmentId: mediaAsset.appointmentId,
    clientId: mediaAsset.clientId,
    petId: mediaAsset.petId,
    type: mediaAsset.type,
    originalFileName: mediaAsset.originalFileName,
    mimeType: mediaAsset.mimeType,
    sizeBytes: mediaAsset.sizeBytes,
    accessLevel: mediaAsset.accessLevel,
    description: mediaAsset.description,
    metadata: sanitizeTutorMediaMetadata(mediaAsset.metadata),
    createdAt: mediaAsset.createdAt,
  }
}

async function resolveAssetBindings(
  actor: AuthenticatedUserData,
  input: AssetBindingInput,
) {
  const [client, pet, appointment] = await Promise.all([
    input.clientId
      ? prisma.client.findUnique({
          where: {
            userId: input.clientId,
          },
          include: {
            user: true,
          },
        })
      : Promise.resolve(null),
    input.petId
      ? prisma.pet.findUnique({
          where: {
            id: input.petId,
          },
          include: {
            client: {
              include: {
                user: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    input.appointmentId
      ? prisma.appointment.findUnique({
          where: {
            id: input.appointmentId,
          },
          include: {
            client: {
              include: {
                user: true,
              },
            },
            pet: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (input.clientId && !client) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for document or media binding.')
  }

  if (input.petId && !pet) {
    throw new AppError('NOT_FOUND', 404, 'Pet not found for document or media binding.')
  }

  if (input.appointmentId && !appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for document or media binding.')
  }

  if (client && pet && pet.clientId !== client.userId) {
    throw new AppError('CONFLICT', 409, 'Selected pet does not belong to the selected client.')
  }

  if (appointment && client && appointment.clientId !== client.userId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Selected appointment does not belong to the selected client.',
    )
  }

  if (appointment && pet && appointment.petId !== pet.id) {
    throw new AppError(
      'CONFLICT',
      409,
      'Selected appointment does not belong to the selected pet.',
    )
  }

  assertLinkedOwnershipConsistency({
    appointmentClientId: appointment?.clientId,
    clientId: client?.userId,
    petClientId: pet?.clientId,
  })

  const ownershipUnitId =
    appointment?.unitId ?? client?.user.unitId ?? pet?.client.user.unitId ?? null

  if (ownershipUnitId) {
    assertActorCanAccessOwnershipBinding(
      actor,
      buildClientOwnershipBinding(ownershipUnitId),
      {
        requestedUnitId: ownershipUnitId,
      },
    )
  }

  const unitId = resolveScopedUnitId(actor, ownershipUnitId)

  if (!unitId) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Documents and media must be scoped to a unit through the actor or linked entity.',
    )
  }

  return {
    appointment,
    client,
    pet,
    unitId,
  }
}

function parseMetadataJson(metadataJson: string | undefined, fieldName: string) {
  if (!metadataJson) {
    return {} as Prisma.InputJsonObject
  }

  return toInputJsonObject(parseJsonText(metadataJson, `${fieldName} must be valid JSON.`))
}

async function prepareDocumentBinary(input: CreateDocumentInput, file: File | undefined) {
  const environment = getEnv()

  if (file) {
    const allowedMimeTypes = parseAllowedMimeTypes(environment.UPLOAD_ALLOWED_MIME_TYPES)
    assertAllowedMimeType(file.type, allowedMimeTypes)
    assertAllowedFileSize(file.size, environment.UPLOAD_MAX_FILE_SIZE_MB)

    return {
      content: Buffer.from(await file.arrayBuffer()),
      metadata: {},
      mimeType: file.type,
      originalFileName: file.name,
    }
  }

  if (!input.formPayload) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Upload a file or provide a generated form payload for the document.',
    )
  }

  return buildGeneratedFormDocument(input.formPayload, input.title)
}

async function loadDocumentForInternalRead(actor: AuthenticatedUserData, documentId: string) {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
    include: documentDetailsInclude,
  })

  if (!document) {
    throw new AppError('NOT_FOUND', 404, 'Document not found.')
  }

  assertActorCanReadDocumentInScope(actor, document.unitId)

  return document
}

async function loadMediaForInternalRead(actor: AuthenticatedUserData, mediaAssetId: string) {
  const mediaAsset = await prisma.mediaAsset.findUnique({
    where: {
      id: mediaAssetId,
    },
    include: mediaAssetDetailsInclude,
  })

  if (!mediaAsset) {
    throw new AppError('NOT_FOUND', 404, 'Media asset not found.')
  }

  assertActorCanReadDocumentInScope(actor, mediaAsset.unitId)

  return mediaAsset
}

function assertTutorCanReadDocument(
  tutor: AuthenticatedUserData,
  document: TutorReadableDocumentLike,
) {
  assertPermission(tutor, 'documento.visualizar_proprio')
  assertActorCanAccessLocalUnitRecord(tutor, document.unitId)

  if (document.archivedAt) {
    throw new AppError('NOT_FOUND', 404, 'Document not found.')
  }

  if (!canTutorReadAsset(document.accessLevel, buildDocumentOwnerSnapshot(document), tutor.id)) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to access this document.')
  }
}

function assertTutorCanReadMedia(
  tutor: AuthenticatedUserData,
  mediaAsset: TutorReadableMediaLike,
) {
  assertPermission(tutor, 'midia.visualizar_propria')
  assertActorCanAccessLocalUnitRecord(tutor, mediaAsset.unitId)

  if (mediaAsset.archivedAt) {
    throw new AppError('NOT_FOUND', 404, 'Media asset not found.')
  }

  if (!canTutorReadAsset(mediaAsset.accessLevel, buildMediaOwnerSnapshot(mediaAsset), tutor.id)) {
    throw new AppError('FORBIDDEN', 403, 'Tutor is not allowed to access this media asset.')
  }
}

export async function listDocuments(actor: AuthenticatedUserData, query: ListDocumentsQuery) {
  const unitId = resolveDocumentReadUnitId(actor, query.unitId ?? null)

  return prisma.document.findMany({
    where: {
      unitId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.petId ? { petId: query.petId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.includeArchived ? {} : { archivedAt: null }),
    },
    include: documentDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function listTutorDocuments(tutor: AuthenticatedUserData) {
  const unitId = resolveTutorAssetUnitId(tutor)
  const documents = await prisma.document.findMany({
    where: {
      unitId,
      archivedAt: null,
      accessLevel: {
        not: 'PRIVATE',
      },
      OR: [
        { clientId: tutor.id },
        { pet: { clientId: tutor.id } },
        { appointment: { clientId: tutor.id } },
      ],
    },
    select: tutorDocumentSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return documents.map((document) => sanitizeTutorDocument(document as TutorDocumentSummary))
}

export async function createDocument(
  actor: AuthenticatedUserData,
  input: CreateDocumentInput,
  file?: File,
) {
  const bindings = await resolveAssetBindings(actor, input)
  const preparedBinary = await prepareDocumentBinary(input, file)
  const metadata = toInputJsonObject({
    ...parseMetadataJson(input.metadataJson, 'Document metadata'),
    ...preparedBinary.metadata,
    requiresSignature: input.requiresSignature,
  })
  const storedBinary = await storeBinaryObject({
    content: preparedBinary.content,
    kind: 'documents',
    mimeType: preparedBinary.mimeType,
    originalFileName: preparedBinary.originalFileName,
  })

  try {
    return await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          unitId: bindings.unitId,
          clientId: bindings.client?.userId ?? null,
          petId: bindings.pet?.id ?? null,
          appointmentId: bindings.appointment?.id ?? null,
          uploadedByUserId: actor.id,
          type: input.type,
          title: input.title,
          storageKey: storedBinary.storageKey,
          originalFileName: preparedBinary.originalFileName,
          mimeType: preparedBinary.mimeType,
          sizeBytes: BigInt(preparedBinary.content.length),
          checksum: storedBinary.checksum,
          accessLevel: input.accessLevel,
          expiresAt: input.expiresAt ?? null,
          metadata,
        },
        include: documentDetailsInclude,
      })

      await writeAuditLog(tx, {
        unitId: bindings.unitId,
        userId: actor.id,
        action: 'document.create',
        entityName: 'Document',
        entityId: document.id,
        details: {
          accessLevel: document.accessLevel,
          appointmentId: document.appointmentId,
          clientId: document.clientId,
          generatedFromForm:
            'generatedFromForm' in preparedBinary.metadata &&
            preparedBinary.metadata.generatedFromForm === true,
          petId: document.petId,
          requiresSignature: metadata.requiresSignature === true,
          type: document.type,
        },
      })

      return document
    })
  } catch (error) {
    await deleteBinaryObject(storedBinary.storageKey)
    throw error
  }
}

export async function archiveDocument(
  actor: AuthenticatedUserData,
  documentId: string,
  input: ArchiveDocumentInput,
) {
  const document = await loadDocumentForInternalRead(actor, documentId)

  if (document.archivedAt) {
    throw new AppError('CONFLICT', 409, 'Document is already archived.')
  }

  return prisma.$transaction(async (tx) => {
    const archivedDocument = await tx.document.update({
      where: {
        id: documentId,
      },
      data: {
        archivedAt: new Date(),
        archivedByUserId: actor.id,
        archiveReason: input.reason ?? null,
      },
      include: documentDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: archivedDocument.unitId,
      userId: actor.id,
      action: 'document.archive',
      entityName: 'Document',
      entityId: archivedDocument.id,
      details: {
        reason: input.reason ?? null,
      },
    })

    return archivedDocument
  })
}

export async function signDocument(
  actor: AuthenticatedUserData,
  documentId: string,
  input: SignDocumentInput,
  options?: {
    signerIp?: string
  },
) {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
    include: documentDetailsInclude,
  })

  if (!document) {
    throw new AppError('NOT_FOUND', 404, 'Document not found.')
  }

  if (document.archivedAt) {
    throw new AppError('CONFLICT', 409, 'Archived documents cannot receive new signatures.')
  }

  if (document.expiresAt && document.expiresAt < new Date()) {
    throw new AppError('CONFLICT', 409, 'Expired documents cannot receive new signatures.')
  }

  if (isTutorUser(actor)) {
    assertPermission(actor, 'documento.assinar_proprio')
    assertTutorSignatureMethod(input.method)
    assertTutorCanReadDocument(actor, document)
    if (!documentRequiresSignature(document.metadata)) {
      throw new AppError(
        'CONFLICT',
        409,
        'This document is not pending a tutor signature.',
      )
    }
  } else {
    assertPermission(actor, 'documento.assinar')
    assertActorCanReadDocumentInScope(actor, document.unitId)
  }

  const signerUserId = isTutorUser(actor) || input.method !== 'MANUAL' ? actor.id : null

  if (signerUserId) {
    const existingSignature = await prisma.signature.findFirst({
      where: {
        documentId,
        signerUserId,
        status: 'SIGNED',
      },
    })

    if (existingSignature) {
      throw new AppError('CONFLICT', 409, 'This user has already signed the document.')
    }
  }

  const payload = input.payloadJson
    ? parseJsonText(input.payloadJson, 'Signature payload must be valid JSON.')
    : null
  const signerEmail = input.signerEmail ?? actor.email

  return prisma.$transaction(async (tx) => {
    const signature = await tx.signature.create({
      data: {
        documentId,
        signerUserId,
        signerName: input.signerName,
        signerEmail,
        signerIp: options?.signerIp ?? null,
        method: input.method,
        status: 'SIGNED',
        ...(payload !== null ? { payload: toInputJsonValue(payload) } : {}),
        signedAt: new Date(),
      },
      include: {
        signerUser: true,
        document: true,
      },
    })

    await writeAuditLog(tx, {
      unitId: document.unitId,
      userId: actor.id,
      action: 'document.sign',
      entityName: 'Signature',
      entityId: signature.id,
      details: {
        documentId,
        method: input.method,
        signerEmail,
        signerName: input.signerName,
      },
    })

    return signature
  })
}

export async function listMediaAssets(actor: AuthenticatedUserData, query: ListMediaAssetsQuery) {
  const unitId = resolveDocumentReadUnitId(actor, query.unitId ?? null)

  return prisma.mediaAsset.findMany({
    where: {
      unitId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.petId ? { petId: query.petId } : {}),
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.includeArchived ? {} : { archivedAt: null }),
    },
    include: mediaAssetDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function listTutorMediaAssets(tutor: AuthenticatedUserData) {
  const unitId = resolveTutorAssetUnitId(tutor)
  const mediaAssets = await prisma.mediaAsset.findMany({
    where: {
      unitId,
      archivedAt: null,
      accessLevel: {
        not: 'PRIVATE',
      },
      OR: [
        { clientId: tutor.id },
        { pet: { clientId: tutor.id } },
        { appointment: { clientId: tutor.id } },
      ],
    },
    select: tutorMediaAssetSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return mediaAssets.map((mediaAsset) =>
    sanitizeTutorMediaAsset(mediaAsset as TutorMediaAssetSummary),
  )
}

export async function createMediaAsset(
  actor: AuthenticatedUserData,
  input: CreateMediaAssetInput,
  file: File,
) {
  const environment = getEnv()
  const bindings = await resolveAssetBindings(actor, input)
  const allowedMimeTypes = parseAllowedMimeTypes(environment.UPLOAD_ALLOWED_MIME_TYPES)
  assertAllowedMimeType(file.type, allowedMimeTypes)
  assertAllowedFileSize(file.size, environment.UPLOAD_MAX_FILE_SIZE_MB)
  const content = Buffer.from(await file.arrayBuffer())
  const metadata = toInputJsonObject({
    ...parseMetadataJson(input.metadataJson, 'Media metadata'),
    ...(input.captureStage ? { captureStage: input.captureStage } : {}),
    ...(input.galleryLabel ? { galleryLabel: input.galleryLabel } : {}),
  })
  const storedBinary = await storeBinaryObject({
    content,
    kind: 'media',
    mimeType: file.type,
    originalFileName: file.name,
  })

  try {
    return await prisma.$transaction(async (tx) => {
      const mediaAsset = await tx.mediaAsset.create({
        data: {
          unitId: bindings.unitId,
          clientId: bindings.client?.userId ?? null,
          petId: bindings.pet?.id ?? null,
          appointmentId: bindings.appointment?.id ?? null,
          uploadedByUserId: actor.id,
          type: input.type ?? resolveMediaTypeFromMimeType(file.type),
          storageKey: storedBinary.storageKey,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: BigInt(content.length),
          accessLevel: input.accessLevel,
          description: input.description ?? null,
          metadata,
        },
        include: mediaAssetDetailsInclude,
      })

      await writeAuditLog(tx, {
        unitId: bindings.unitId,
        userId: actor.id,
        action: 'media_asset.create',
        entityName: 'MediaAsset',
        entityId: mediaAsset.id,
        details: {
          accessLevel: mediaAsset.accessLevel,
          appointmentId: mediaAsset.appointmentId,
          captureStage:
            typeof metadata.captureStage === 'string' ? metadata.captureStage : null,
          clientId: mediaAsset.clientId,
          galleryLabel:
            typeof metadata.galleryLabel === 'string' ? metadata.galleryLabel : null,
          petId: mediaAsset.petId,
          type: mediaAsset.type,
        },
      })

      return mediaAsset
    })
  } catch (error) {
    await deleteBinaryObject(storedBinary.storageKey)
    throw error
  }
}

export async function archiveMediaAsset(
  actor: AuthenticatedUserData,
  mediaAssetId: string,
  input: ArchiveMediaAssetInput,
) {
  const mediaAsset = await loadMediaForInternalRead(actor, mediaAssetId)

  if (mediaAsset.archivedAt) {
    throw new AppError('CONFLICT', 409, 'Media asset is already archived.')
  }

  return prisma.$transaction(async (tx) => {
    const archivedMediaAsset = await tx.mediaAsset.update({
      where: {
        id: mediaAssetId,
      },
      data: {
        archivedAt: new Date(),
        archivedByUserId: actor.id,
        archiveReason: input.reason ?? null,
      },
      include: mediaAssetDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: archivedMediaAsset.unitId,
      userId: actor.id,
      action: 'media_asset.archive',
      entityName: 'MediaAsset',
      entityId: archivedMediaAsset.id,
      details: {
        reason: input.reason ?? null,
      },
    })

    return archivedMediaAsset
  })
}

export async function getDocumentBinaryForActor(
  actor: AuthenticatedUserData,
  documentId: string,
) {
  const document = isTutorUser(actor)
    ? await prisma.document.findUnique({
        where: {
          id: documentId,
        },
        include: documentDetailsInclude,
      })
    : await loadDocumentForInternalRead(actor, documentId)

  if (!document) {
    throw new AppError('NOT_FOUND', 404, 'Document not found.')
  }

  if (isTutorUser(actor)) {
    assertTutorCanReadDocument(actor, document)
  } else {
    assertPermission(actor, 'documento.visualizar')
  }

  return {
    content: await readBinaryObject(document.storageKey),
    document,
    fileName: deriveDocumentFileName(document),
  }
}

export async function getMediaBinaryForActor(
  actor: AuthenticatedUserData,
  mediaAssetId: string,
) {
  const mediaAsset = isTutorUser(actor)
    ? await prisma.mediaAsset.findUnique({
        where: {
          id: mediaAssetId,
        },
        include: mediaAssetDetailsInclude,
      })
    : await loadMediaForInternalRead(actor, mediaAssetId)

  if (!mediaAsset) {
    throw new AppError('NOT_FOUND', 404, 'Media asset not found.')
  }

  if (isTutorUser(actor)) {
    assertTutorCanReadMedia(actor, mediaAsset)
  } else {
    assertPermission(actor, 'midia.visualizar')
  }

  return {
    content: await readBinaryObject(mediaAsset.storageKey),
    fileName: deriveMediaFileName(mediaAsset),
    mediaAsset,
  }
}

export function isDocumentSignaturePendingForTutor(
  tutor: AuthenticatedUserData,
  document: TutorSignaturePendingDocument,
) {
  return (
    documentRequiresSignature(document.metadata) &&
    !document.signatures.some(
      (signature) => signature.signerUserId === tutor.id && signature.status === 'SIGNED',
    )
  )
}
