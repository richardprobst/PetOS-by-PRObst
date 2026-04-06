import { buildHttpRequestContext, resolveRequestId } from '@/server/observability/request'
import { logError, logWarn, serializeErrorForLogs } from '@/server/observability/logger'
import { NextResponse } from 'next/server'
import { AppError, mapUnknownToAppError, serializeAppError, type SerializedAppError } from './errors'

export interface ApiSuccessResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: SerializedAppError
}

interface RouteErrorContext {
  operation?: string
  request?: Request
}

export function ok<T>(data: T, init?: Omit<ResponseInit, 'status'>) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { data },
    {
      status: 200,
      ...init,
    },
  )
}

export function created<T>(data: T, init?: Omit<ResponseInit, 'status'>) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { data },
    {
      status: 201,
      ...init,
    },
  )
}

export function noContent(init?: Omit<ResponseInit, 'status'>) {
  return new NextResponse(null, {
    status: 204,
    ...init,
  })
}

export function fail(
  error: AppError,
  init?: Omit<ResponseInit, 'status'>,
  options?: {
    requestId?: string
  },
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: serializeAppError(error, options),
    },
    {
      status: error.status,
      ...init,
    },
  )
}

export function routeErrorResponse(
  error: unknown,
  context?: RouteErrorContext,
  init?: Omit<ResponseInit, 'status'>,
) {
  const appError = mapUnknownToAppError(error)
  const requestId = resolveRequestId(context?.request)
  const requestContext = buildHttpRequestContext(context?.request)
  const logContext = {
    requestId,
    status: appError.status,
    code: appError.code,
    ...requestContext,
    ...(context?.operation ? { operation: context.operation } : {}),
    ...(appError.status >= 500 ? { error: serializeErrorForLogs(error) } : {}),
  }

  if (appError.status >= 500) {
    logError('Unhandled route error.', logContext)
  } else {
    logWarn('Handled route error.', logContext)
  }

  const headers = new Headers(init?.headers)
  headers.set('cache-control', 'no-store')
  headers.set('x-request-id', requestId)

  return fail(
    appError,
    {
      ...init,
      headers,
    },
    {
      requestId,
    },
  )
}
