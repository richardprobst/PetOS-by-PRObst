import { AppError } from '@/server/http/errors'
import { getEnv } from '@/server/env'

interface RateLimitBucket {
  resetAt: number
  count: number
}

interface RateLimitOptions {
  scope: string
  identifier: string
  maxRequests?: number
  windowMs?: number
}

const buckets = new Map<string, RateLimitBucket>()

function buildBucketKey(scope: string, identifier: string) {
  return `${scope}:${identifier}`
}

function consumeRateLimit({
  scope,
  identifier,
  maxRequests,
  windowMs,
}: Required<RateLimitOptions>) {
  const now = Date.now()
  const bucketKey = buildBucketKey(scope, identifier)
  const existingBucket = buckets.get(bucketKey)

  if (!existingBucket || existingBucket.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    })
    return
  }

  if (existingBucket.count >= maxRequests) {
    throw new AppError(
      'TOO_MANY_REQUESTS',
      429,
      'Too many requests for this operation. Please try again later.',
    )
  }

  existingBucket.count += 1
}

export function enforceConfiguredRateLimit(options: RateLimitOptions) {
  const environment = getEnv()

  if (!environment.RATE_LIMIT_ENABLED) {
    return
  }

  consumeRateLimit({
    scope: options.scope,
    identifier: options.identifier,
    maxRequests: options.maxRequests ?? environment.RATE_LIMIT_MAX_REQUESTS,
    windowMs: options.windowMs ?? environment.RATE_LIMIT_WINDOW_MS,
  })
}

export function resetRateLimitBucketsForTests() {
  buckets.clear()
}
