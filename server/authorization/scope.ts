import type { AuthenticatedUserData } from '@/server/auth/types'
import {
  createMultiUnitOwnershipBinding,
  evaluateMultiUnitScope,
  resolveMultiUnitSessionContext,
} from '@/features/multiunit/context'
import type {
  MultiUnitOwnershipBinding,
  MultiUnitScopeDecision,
} from '@/features/multiunit/schemas'
import { AppError } from '@/server/http/errors'

export function resolveScopedUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): string {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'READ',
    requestedUnitId,
  })

  if (!decision.allowed || !decision.context.activeUnitId) {
    throw toScopeAppError(decision)
  }

  return decision.context.activeUnitId
}

export function assertActorCanAccessUnit(
  actor: AuthenticatedUserData,
  unitId?: string | null,
): void {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'READ',
    requestedUnitId: unitId,
  })

  if (!decision.allowed) {
    throw toScopeAppError(decision)
  }
}

export function evaluateActorMultiUnitScope(
  actor: AuthenticatedUserData,
  options?: {
    operation?: 'READ' | 'STRUCTURAL_WRITE'
    ownership?: MultiUnitOwnershipBinding | null
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  return evaluateMultiUnitScope({
    actor,
    operation: options?.operation ?? 'READ',
    ownership: options?.ownership ?? null,
    requestedUnitId: options?.requestedUnitId,
    sessionActiveUnitId: options?.sessionActiveUnitId,
  })
}

export function resolveActorUnitSessionContext(
  actor: AuthenticatedUserData,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  return resolveMultiUnitSessionContext(actor, options)
}

export function assertActorCanAccessOwnershipBinding(
  actor: AuthenticatedUserData,
  ownership: MultiUnitOwnershipBinding,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'READ',
    ownership: createMultiUnitOwnershipBinding(ownership),
    requestedUnitId: options?.requestedUnitId,
    sessionActiveUnitId: options?.sessionActiveUnitId,
  })

  if (!decision.allowed) {
    throw toScopeAppError(decision)
  }
}

export function createLocalUnitOwnershipBinding(unitId: string): MultiUnitOwnershipBinding {
  return {
    kind: 'LOCAL_RECORD',
    primaryUnitId: unitId,
    linkedUnitIds: [],
    reassignmentAuditRequired: true,
  }
}

export function assertActorCanAccessLocalUnitRecord(
  actor: AuthenticatedUserData,
  unitId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  assertActorCanAccessOwnershipBinding(actor, createLocalUnitOwnershipBinding(unitId), options)
}

export function assertActorCanStructurallyWriteOwnershipBinding(
  actor: AuthenticatedUserData,
  ownership: MultiUnitOwnershipBinding,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'STRUCTURAL_WRITE',
    ownership: createMultiUnitOwnershipBinding(ownership),
    requestedUnitId: options?.requestedUnitId,
    sessionActiveUnitId: options?.sessionActiveUnitId,
  })

  if (!decision.allowed) {
    throw toScopeAppError(decision)
  }
}

function toScopeAppError(decision: MultiUnitScopeDecision) {
  switch (decision.reasonCode) {
    case 'MISSING_UNIT_CONTEXT':
      return new AppError(
        'UNPROCESSABLE_ENTITY',
        422,
        'A target unit is required for this operation.',
      )
    case 'CROSS_UNIT_CONTEXT_FORBIDDEN':
      return new AppError(
        'FORBIDDEN',
        403,
        'User is not allowed to operate on another unit.',
      )
    case 'RECORD_OUTSIDE_CONTEXT_SCOPE':
      return new AppError(
        'FORBIDDEN',
        403,
        'User is not allowed to access this record in the current unit context.',
      )
    case 'STRUCTURAL_WRITE_FORBIDDEN':
      return new AppError(
        'FORBIDDEN',
        403,
        'User is not allowed to perform a structural cross-unit update.',
      )
    case 'ALLOWED_LOCAL_SCOPE':
    case 'ALLOWED_GLOBAL_SCOPE':
      return new AppError(
        'INTERNAL_SERVER_ERROR',
        500,
        'Unexpected multi-unit scope failure.',
      )
  }
}
