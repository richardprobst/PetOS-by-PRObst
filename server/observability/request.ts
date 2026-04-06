import { randomUUID } from 'node:crypto'

export function resolveRequestId(request?: Request) {
  const requestId = request?.headers.get('x-request-id')?.trim()

  if (requestId) {
    return requestId
  }

  return randomUUID()
}

export function buildHttpRequestContext(request?: Request) {
  if (!request) {
    return {}
  }

  const url = new URL(request.url)

  return {
    method: request.method,
    path: url.pathname,
  }
}
