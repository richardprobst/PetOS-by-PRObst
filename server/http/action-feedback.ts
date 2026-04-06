import type { Route } from 'next'
import { mapUnknownToAppError } from '@/server/http/errors'

export function buildActionRedirectPath(
  pathname: Route,
  status: 'saved' | 'updated' | 'created' | 'sent' | 'scheduled' | 'error',
  message?: string,
): Route {
  const searchParams = new URLSearchParams({
    status,
  })

  if (message) {
    searchParams.set('message', message)
  }

  return `${pathname}?${searchParams.toString()}` as Route
}

export function getActionErrorMessage(error: unknown) {
  return mapUnknownToAppError(error).message
}
