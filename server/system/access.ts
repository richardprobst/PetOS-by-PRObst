import type { Route } from 'next'
import { redirect } from 'next/navigation'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { hasAnyPermission } from '@/server/authorization/access-control'
import { AppError } from '@/server/http/errors'
import { collectSystemRuntimeSnapshot, type SystemRuntimeSnapshot } from '@/server/system/runtime-state'
import { getEnv } from '@/server/env'
import { prisma } from '@/server/db/prisma'
import { isMaintenanceLifecycleState, isRepairLifecycleState } from './lifecycle'

const runtimeOperatorPermissions = [
  'sistema.manutencao.operar',
  'sistema.reparo.operar',
  'sistema.update.operar',
] as const

export function canBypassRuntimeLock(user: AuthenticatedUserData | null | undefined) {
  if (!user) {
    return false
  }

  return hasAnyPermission(user, [...runtimeOperatorPermissions])
}

export function resolveRuntimeHoldingRoute(runtime: SystemRuntimeSnapshot): Route | null {
  if (isRepairLifecycleState(runtime.lifecycleState)) {
    return '/reparo'
  }

  if (isMaintenanceLifecycleState(runtime.lifecycleState)) {
    return '/manutencao'
  }

  return null
}

export async function enforceUiRuntimeAccess(
  surface: 'internal' | 'public' | 'tutor',
  user?: AuthenticatedUserData | null,
) {
  const runtime = await collectSystemRuntimeSnapshot(prisma, getEnv())
  const holdingRoute = resolveRuntimeHoldingRoute(runtime)

  if (!holdingRoute) {
    return runtime
  }

  if (surface === 'internal' && canBypassRuntimeLock(user)) {
    return runtime
  }

  redirect(holdingRoute)
}

export async function assertApiRuntimeAccess(
  surface: 'internal' | 'tutor',
  user?: AuthenticatedUserData | null,
) {
  const runtime = await collectSystemRuntimeSnapshot(prisma, getEnv())

  if (surface === 'internal' && canBypassRuntimeLock(user)) {
    return runtime
  }

  if (isRepairLifecycleState(runtime.lifecycleState)) {
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      503,
      'The system is currently in repair mode. Retry after an authorized operator resolves the incident.',
    )
  }

  if (isMaintenanceLifecycleState(runtime.lifecycleState)) {
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      503,
      'The system is currently in maintenance mode. Retry after the maintenance window ends.',
    )
  }

  return runtime
}
