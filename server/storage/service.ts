import { createHash, randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'

type StorageObjectKind = 'documents' | 'media'

interface StoreBinaryInput {
  content: Buffer
  kind: StorageObjectKind
  mimeType: string
  originalFileName?: string
}

function getStorageRoot() {
  return path.join(process.cwd(), 'storage', getEnv().STORAGE_BUCKET)
}

function normalizeStorageKey(storageKey: string) {
  const normalized = path.posix.normalize(storageKey.replace(/\\/g, '/'))

  if (
    normalized === '.' ||
    normalized.startsWith('/') ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new AppError('BAD_REQUEST', 400, 'Invalid storage key.')
  }

  return normalized
}

function resolveStoragePath(storageKey: string) {
  const bucketRoot = getStorageRoot()
  const normalizedStorageKey = normalizeStorageKey(storageKey)
  const absolutePath = path.join(bucketRoot, ...normalizedStorageKey.split('/'))

  if (!absolutePath.startsWith(bucketRoot)) {
    throw new AppError('BAD_REQUEST', 400, 'Invalid storage key path.')
  }

  return absolutePath
}

function inferExtensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case 'application/json':
      return '.json'
    case 'application/pdf':
      return '.pdf'
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'text/plain':
      return '.txt'
    case 'video/mp4':
      return '.mp4'
    default:
      return ''
  }
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

function buildStorageKey(
  kind: StorageObjectKind,
  originalFileName: string | undefined,
  mimeType: string,
) {
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const originalExtension = originalFileName ? path.extname(originalFileName).toLowerCase() : ''
  const extension = originalExtension || inferExtensionFromMimeType(mimeType) || '.bin'
  const safeBaseName = sanitizeFileName(
    originalFileName ? path.basename(originalFileName, originalExtension || extension) : kind,
  )

  return `${kind}/${year}/${month}/${randomUUID()}-${safeBaseName || kind}${extension}`
}

export async function storeBinaryObject(input: StoreBinaryInput) {
  const storageKey = buildStorageKey(input.kind, input.originalFileName, input.mimeType)
  const absolutePath = resolveStoragePath(storageKey)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, input.content)

  return {
    checksum: createHash('sha256').update(input.content).digest('hex'),
    storageKey,
  }
}

export async function readBinaryObject(storageKey: string) {
  try {
    return await fs.readFile(resolveStoragePath(storageKey))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new AppError('NOT_FOUND', 404, 'Stored binary was not found.')
    }

    throw error
  }
}

export async function deleteBinaryObject(storageKey: string) {
  try {
    await fs.unlink(resolveStoragePath(storageKey))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}
