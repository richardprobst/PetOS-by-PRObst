import { ZodError } from 'zod'

export type AppErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR'

export interface SerializedAppError {
  code: AppErrorCode
  message: string
  details?: unknown
  requestId?: string
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(code: AppErrorCode, status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function serializeAppError(
  error: AppError,
  options?: {
    requestId?: string
  },
): SerializedAppError {
  return {
    code: error.code,
    message: error.message,
    ...(error.details !== undefined ? { details: error.details } : {}),
    ...(options?.requestId ? { requestId: options.requestId } : {}),
  }
}

export function mapUnknownToAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof ZodError) {
    return new AppError('BAD_REQUEST', 400, 'Invalid request payload.', error.flatten())
  }

  return new AppError('INTERNAL_SERVER_ERROR', 500, 'Internal server error.')
}
