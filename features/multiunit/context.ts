import type { AuthenticatedUserData } from '@/server/auth/types'
import { hasPermission } from '@/server/authorization/access-control'
import {
  MULTIUNIT_GLOBAL_READ_PERMISSION,
  MULTIUNIT_GLOBAL_WRITE_PERMISSION,
  multiUnitOwnershipBindingSchema,
  multiUnitScopeDecisionSchema,
  multiUnitSessionContextSchema,
  type MultiUnitOwnershipBinding,
  type MultiUnitScopeDecision,
  type MultiUnitOperation,
  type MultiUnitSessionContext,
} from './schemas'

export interface ResolveMultiUnitSessionContextOptions {
  requestedUnitId?: string | null
  sessionActiveUnitId?: string | null
}

export interface EvaluateMultiUnitScopeInput
  extends ResolveMultiUnitSessionContextOptions {
  actor: AuthenticatedUserData
  operation: MultiUnitOperation
  ownership?: MultiUnitOwnershipBinding | null
}

export function createMultiUnitOwnershipBinding(
  input: MultiUnitOwnershipBinding,
): MultiUnitOwnershipBinding {
  const linkedUnitIds = Array.from(
    new Set(
      input.linkedUnitIds
        .map((unitId) => unitId.trim())
        .filter((unitId) => unitId.length > 0 && unitId !== input.primaryUnitId),
    ),
  )

  return multiUnitOwnershipBindingSchema.parse({
    ...input,
    linkedUnitIds,
  })
}

export function resolveMultiUnitSessionContext(
  actor: AuthenticatedUserData,
  options: ResolveMultiUnitSessionContextOptions = {},
): MultiUnitSessionContext {
  const homeUnitId = normalizeUnitId(actor.unitId)
  const sessionActiveUnitId = normalizeUnitId(
    options.sessionActiveUnitId ?? actor.multiUnitContext?.activeUnitId ?? null,
  )
  const requestedUnitId = normalizeUnitId(options.requestedUnitId)
  const selectedUnitId = requestedUnitId ?? sessionActiveUnitId ?? homeUnitId
  const globalReadAccess = hasPermission(actor, MULTIUNIT_GLOBAL_READ_PERMISSION)
  const globalWriteAccess = hasPermission(actor, MULTIUNIT_GLOBAL_WRITE_PERMISSION)
  const crossUnitRequested =
    selectedUnitId !== null && homeUnitId !== null
      ? selectedUnitId !== homeUnitId
      : selectedUnitId !== null && (requestedUnitId !== null || sessionActiveUnitId !== null)

  if (!selectedUnitId) {
    return multiUnitSessionContextSchema.parse({
      activeUnitId: null,
      contextOrigin: null,
      contextType: null,
      crossUnitAccess: false,
      crossUnitRequested,
      globalReadAccess,
      globalWriteAccess,
      homeUnitId,
      requestedUnitId,
      status: 'UNRESOLVED',
    })
  }

  if (crossUnitRequested && !globalReadAccess) {
    return multiUnitSessionContextSchema.parse({
      activeUnitId: selectedUnitId,
      contextOrigin: resolveContextOrigin(requestedUnitId, sessionActiveUnitId),
      contextType: null,
      crossUnitAccess: false,
      crossUnitRequested: true,
      globalReadAccess,
      globalWriteAccess,
      homeUnitId,
      requestedUnitId,
      status: 'UNRESOLVED',
    })
  }

  return multiUnitSessionContextSchema.parse({
    activeUnitId: selectedUnitId,
    contextOrigin: resolveContextOrigin(requestedUnitId, sessionActiveUnitId),
    contextType: crossUnitRequested ? 'GLOBAL_AUTHORIZED' : 'LOCAL',
    crossUnitAccess: crossUnitRequested && globalReadAccess,
    crossUnitRequested,
    globalReadAccess,
    globalWriteAccess,
    homeUnitId,
    requestedUnitId,
    status: 'RESOLVED',
  })
}

export function evaluateMultiUnitScope(
  input: EvaluateMultiUnitScopeInput,
): MultiUnitScopeDecision {
  const context = resolveMultiUnitSessionContext(input.actor, input)
  const ownership = input.ownership
    ? createMultiUnitOwnershipBinding(input.ownership)
    : null

  if (context.status === 'UNRESOLVED') {
    return createBlockedDecision(
      input.operation,
      context.crossUnitRequested
        ? 'CROSS_UNIT_CONTEXT_FORBIDDEN'
        : 'MISSING_UNIT_CONTEXT',
      context,
      ownership,
    )
  }

  if (!ownership) {
    return multiUnitScopeDecisionSchema.parse({
      accessMode:
        context.contextType === 'GLOBAL_AUTHORIZED' ? 'GLOBAL_AUTHORIZED' : 'LOCAL',
      allowed: true,
      context,
      operation: input.operation,
      ownership: null,
      reasonCode:
        context.contextType === 'GLOBAL_AUTHORIZED'
          ? 'ALLOWED_GLOBAL_SCOPE'
          : 'ALLOWED_LOCAL_SCOPE',
    })
  }

  const activeUnitId = context.activeUnitId

  if (!activeUnitId) {
    return createBlockedDecision(
      input.operation,
      'MISSING_UNIT_CONTEXT',
      context,
      ownership,
    )
  }

  const accessibleInContext =
    ownership.primaryUnitId === activeUnitId ||
    ownership.linkedUnitIds.includes(activeUnitId)

  if (!accessibleInContext) {
    return createBlockedDecision(
      input.operation,
      'RECORD_OUTSIDE_CONTEXT_SCOPE',
      context,
      ownership,
    )
  }

  if (
    input.operation === 'STRUCTURAL_WRITE' &&
    context.contextType === 'LOCAL' &&
    ownership.primaryUnitId !== activeUnitId
  ) {
    return createBlockedDecision(
      input.operation,
      'STRUCTURAL_WRITE_FORBIDDEN',
      context,
      ownership,
    )
  }

  if (
    input.operation === 'STRUCTURAL_WRITE' &&
    context.contextType === 'GLOBAL_AUTHORIZED' &&
    !context.globalWriteAccess
  ) {
    return createBlockedDecision(
      input.operation,
      'STRUCTURAL_WRITE_FORBIDDEN',
      context,
      ownership,
    )
  }

  return multiUnitScopeDecisionSchema.parse({
    accessMode:
      context.contextType === 'GLOBAL_AUTHORIZED' ? 'GLOBAL_AUTHORIZED' : 'LOCAL',
    allowed: true,
    context,
    operation: input.operation,
    ownership,
    reasonCode:
      context.contextType === 'GLOBAL_AUTHORIZED'
        ? 'ALLOWED_GLOBAL_SCOPE'
        : 'ALLOWED_LOCAL_SCOPE',
  })
}

function createBlockedDecision(
  operation: MultiUnitOperation,
  reasonCode:
    | 'MISSING_UNIT_CONTEXT'
    | 'CROSS_UNIT_CONTEXT_FORBIDDEN'
    | 'RECORD_OUTSIDE_CONTEXT_SCOPE'
    | 'STRUCTURAL_WRITE_FORBIDDEN',
  context: MultiUnitSessionContext,
  ownership: MultiUnitOwnershipBinding | null,
) {
  return multiUnitScopeDecisionSchema.parse({
    accessMode: 'BLOCKED',
    allowed: false,
    context,
    operation,
    ownership,
    reasonCode,
  })
}

function normalizeUnitId(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function resolveContextOrigin(
  requestedUnitId: string | null,
  sessionActiveUnitId: string | null,
) {
  if (requestedUnitId) {
    return 'REQUEST_OVERRIDE'
  }

  if (sessionActiveUnitId) {
    return 'SESSION_OVERRIDE'
  }

  return 'SESSION_DEFAULT'
}
