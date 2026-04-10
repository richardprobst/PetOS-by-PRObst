import { AppError } from '@/server/http/errors'

const prismaSchemaCompatibilityCodes = new Set(['P2021', 'P2022'])

export function isPrismaSchemaCompatibilityError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = 'code' in error ? (error as { code?: unknown }).code : undefined
  return typeof code === 'string' && prismaSchemaCompatibilityCodes.has(code)
}

export function createStorageUnavailableAppError(surface: string) {
  return new AppError(
    'SERVICE_UNAVAILABLE',
    503,
    `The ${surface} storage is unavailable in the current database schema. Apply Prisma migrations before retrying.`,
  )
}

export async function withPrismaSchemaCompatibilityFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T> | T,
) {
  try {
    return await operation()
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      return fallback()
    }

    throw error
  }
}
