import type { z } from 'zod'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'

function buildAllowedMutationOrigins(request: Request) {
  const environment = getEnv()
  const runtimeOrigin = new URL(request.url).origin

  return new Set(
    [environment.APP_URL, environment.NEXT_PUBLIC_APP_URL, environment.NEXTAUTH_URL, runtimeOrigin].map(
      (url) => new URL(url).origin,
    ),
  )
}

function resolveRequestOrigin(request: Request) {
  const origin = request.headers.get('origin')

  if (origin) {
    return origin
  }

  const referer = request.headers.get('referer')

  if (!referer) {
    return null
  }

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

export function assertTrustedMutationOrigin(request: Request) {
  const requestOrigin = resolveRequestOrigin(request)

  if (!requestOrigin) {
    throw new AppError('FORBIDDEN', 403, 'Untrusted request origin.')
  }

  if (!buildAllowedMutationOrigins(request).has(requestOrigin)) {
    throw new AppError('FORBIDDEN', 403, 'Untrusted request origin.')
  }
}

export async function readValidatedJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  assertTrustedMutationOrigin(request)

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    throw new AppError('BAD_REQUEST', 400, 'Invalid JSON payload.')
  }

  return schema.parse(payload)
}

export function readValidatedSearchParams<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): z.output<TSchema> {
  const { searchParams } = new URL(request.url)

  return schema.parse(Object.fromEntries(searchParams))
}
