import { buildClientOwnershipBinding } from '@/features/clients/ownership'
import type { AuthenticatedUserData } from '@/server/auth/types'
import {
  evaluateActorMultiUnitScope,
  resolveActorUnitSessionContext,
} from '@/server/authorization/scope'
import { createMultiUnitOwnershipBinding } from './context'
import type {
  MultiUnitOwnershipBinding,
  MultiUnitScopeDecision,
} from './schemas'

export interface MultiUnitFoundationSessionDiagnostic {
  activeUnitId: string | null
  contextOrigin: string | null
  contextType: string | null
  crossUnitAccess: boolean
  crossUnitRequested: boolean
  globalReadAccess: boolean
  globalWriteAccess: boolean
  homeUnitId: string | null
  requestedUnitId: string | null
  status: string
}

export interface MultiUnitFoundationAccessDiagnostic {
  failClosed: boolean
  hasGlobalReadRole: boolean
  hasGlobalWriteRole: boolean
  hasResolvedLocalScope: boolean
}

export interface MultiUnitFoundationOwnershipDiagnostic {
  appliesTo: 'CLIENT_AND_PET'
  kind: 'MASTER_RECORD_WITH_UNIT_LINK'
  linkedUnitIds: string[]
  primaryUnitId: string | null
  reassignmentAuditRequired: boolean
}

export interface MultiUnitFoundationProbeDiagnostic {
  accessMode: string
  allowed: boolean
  contextStatus: string
  contextType: string | null
  key:
    | 'SESSION_CONTEXT_READ'
    | 'FOREIGN_UNIT_READ'
    | 'LINKED_OWNERSHIP_READ'
    | 'FOREIGN_STRUCTURAL_WRITE'
  label: string
  operation: 'READ' | 'STRUCTURAL_WRITE'
  ownershipKind: string | null
  ownershipPrimaryUnitId: string | null
  reasonCode: string
  requestedUnitId: string | null
}

export interface MultiUnitFoundationDiagnosticsSnapshot {
  access: MultiUnitFoundationAccessDiagnostic
  generatedAt: Date
  ownershipBase: MultiUnitFoundationOwnershipDiagnostic | null
  probes: MultiUnitFoundationProbeDiagnostic[]
  session: MultiUnitFoundationSessionDiagnostic
}

export function getMultiUnitFoundationDiagnostics(
  actor: AuthenticatedUserData,
): MultiUnitFoundationDiagnosticsSnapshot {
  const session = resolveActorUnitSessionContext(actor)
  const referenceUnitId = session.homeUnitId ?? session.activeUnitId
  const probePrimaryUnitId = referenceUnitId ?? 'unit_scope_probe_home'
  const foreignUnitId = createForeignProbeUnitId(probePrimaryUnitId)
  const ownershipBase = referenceUnitId
    ? buildClientOwnershipBinding(referenceUnitId)
    : null
  const linkedOwnershipProbe = createMultiUnitOwnershipBinding({
    kind: 'MASTER_RECORD_WITH_UNIT_LINK',
    linkedUnitIds: [foreignUnitId],
    primaryUnitId: probePrimaryUnitId,
    reassignmentAuditRequired: true,
  })

  return {
    access: {
      failClosed: session.status === 'UNRESOLVED',
      hasGlobalReadRole: session.globalReadAccess,
      hasGlobalWriteRole: session.globalWriteAccess,
      hasResolvedLocalScope:
        session.status === 'RESOLVED' && session.contextType === 'LOCAL',
    },
    generatedAt: new Date(),
    ownershipBase: ownershipBase
      ? createOwnershipDiagnostic(ownershipBase)
      : null,
    probes: [
      createProbeDiagnostic(
        'SESSION_CONTEXT_READ',
        'Leitura no contexto atual',
        evaluateActorMultiUnitScope(actor, {
          operation: 'READ',
          ownership: ownershipBase,
        }),
      ),
      createProbeDiagnostic(
        'FOREIGN_UNIT_READ',
        'Leitura direta em unidade externa',
        evaluateActorMultiUnitScope(actor, {
          operation: 'READ',
          requestedUnitId: foreignUnitId,
        }),
      ),
      createProbeDiagnostic(
        'LINKED_OWNERSHIP_READ',
        'Leitura cross-unit sobre ownership vinculado',
        evaluateActorMultiUnitScope(actor, {
          operation: 'READ',
          ownership: linkedOwnershipProbe,
          requestedUnitId: foreignUnitId,
        }),
      ),
      createProbeDiagnostic(
        'FOREIGN_STRUCTURAL_WRITE',
        'Edicao estrutural cross-unit',
        evaluateActorMultiUnitScope(actor, {
          operation: 'STRUCTURAL_WRITE',
          ownership: linkedOwnershipProbe,
          requestedUnitId: foreignUnitId,
        }),
      ),
    ],
    session: {
      activeUnitId: session.activeUnitId,
      contextOrigin: session.contextOrigin,
      contextType: session.contextType,
      crossUnitAccess: session.crossUnitAccess,
      crossUnitRequested: session.crossUnitRequested,
      globalReadAccess: session.globalReadAccess,
      globalWriteAccess: session.globalWriteAccess,
      homeUnitId: session.homeUnitId,
      requestedUnitId: session.requestedUnitId,
      status: session.status,
    },
  }
}

function createOwnershipDiagnostic(
  ownership: MultiUnitOwnershipBinding,
): MultiUnitFoundationOwnershipDiagnostic {
  return {
    appliesTo: 'CLIENT_AND_PET',
    kind: 'MASTER_RECORD_WITH_UNIT_LINK',
    linkedUnitIds: ownership.linkedUnitIds,
    primaryUnitId: ownership.primaryUnitId,
    reassignmentAuditRequired: ownership.reassignmentAuditRequired,
  }
}

function createProbeDiagnostic(
  key: MultiUnitFoundationProbeDiagnostic['key'],
  label: string,
  decision: MultiUnitScopeDecision,
): MultiUnitFoundationProbeDiagnostic {
  return {
    accessMode: decision.accessMode,
    allowed: decision.allowed,
    contextStatus: decision.context.status,
    contextType: decision.context.contextType,
    key,
    label,
    operation: decision.operation,
    ownershipKind: decision.ownership?.kind ?? null,
    ownershipPrimaryUnitId: decision.ownership?.primaryUnitId ?? null,
    reasonCode: decision.reasonCode,
    requestedUnitId: decision.context.requestedUnitId,
  }
}

function createForeignProbeUnitId(primaryUnitId: string) {
  return primaryUnitId === 'unit_branch'
    ? 'unit_scope_probe_hq'
    : 'unit_scope_probe_branch'
}
