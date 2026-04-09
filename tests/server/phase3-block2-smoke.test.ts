import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveAppointmentReadUnitId,
} from '../../features/appointments/services'
import { resolveCommissionReadUnitId } from '../../features/commissions/services'
import { resolveCrmReadUnitId } from '../../features/crm/services'
import { resolveDocumentReadUnitId } from '../../features/documents/services'
import { resolveEmployeeReadUnitId } from '../../features/employees/services'
import { resolveFinanceReadUnitId } from '../../features/finance/services'
import { resolveFiscalReadUnitId } from '../../features/fiscal/services'
import { resolveIntegrationEventReadUnitId } from '../../features/integrations/services'
import { resolveInventoryReadUnitId } from '../../features/inventory/services'
import { resolveMessageReadUnitId } from '../../features/messages/services'
import { resolvePosReadUnitId } from '../../features/pos/services'
import { resolveReportCardReadUnitId } from '../../features/report-cards/services'
import { resolveServiceReadUnitId } from '../../features/services/services'
import { resolveTaxiDogReadUnitId } from '../../features/taxi-dog/services'
import { resolveTeamOperationsReadUnitId } from '../../features/team-operations/services'
import { deriveTutorPortalAlerts } from '../../features/tutor/domain'
import { resolveWaitlistReadUnitId } from '../../features/waitlist/services'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { AppError } from '../../server/http/errors'
import { assertActorCanStructurallyWriteOwnershipBinding } from '../../server/authorization/scope'
import { buildClientOwnershipBinding } from '../../features/clients/ownership'

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'block2.local@petos.app',
  id: 'user_block2_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Block 2 Local Operator',
  permissions: ['multiunidade.global.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadActor: AuthenticatedUserData = {
  ...localActor,
  email: 'block2.global@petos.app',
  id: 'user_block2_global',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
}

test('phase 3 block 2 smoke keeps operational reads on the local home unit by default', () => {
  const resolvedUnits = [
    resolveAppointmentReadUnitId(localActor),
    resolveFinanceReadUnitId(localActor),
    resolveInventoryReadUnitId(localActor),
    resolveMessageReadUnitId(localActor),
    resolveCrmReadUnitId(localActor),
    resolveDocumentReadUnitId(localActor),
    resolveFiscalReadUnitId(localActor),
    resolveIntegrationEventReadUnitId(localActor),
    resolvePosReadUnitId(localActor),
    resolveReportCardReadUnitId(localActor),
    resolveEmployeeReadUnitId(localActor),
    resolveTeamOperationsReadUnitId(localActor),
    resolveCommissionReadUnitId(localActor),
    resolveServiceReadUnitId(localActor),
    resolveWaitlistReadUnitId(localActor),
    resolveTaxiDogReadUnitId(localActor),
  ]

  assert.deepEqual(new Set(resolvedUnits), new Set(['unit_local']))
})

test('phase 3 block 2 smoke lets a global-authorized operator inspect another unit across the operational stack', () => {
  const resolvedUnits = [
    resolveAppointmentReadUnitId(globalReadActor),
    resolveFinanceReadUnitId(globalReadActor),
    resolveInventoryReadUnitId(globalReadActor),
    resolveMessageReadUnitId(globalReadActor),
    resolveCrmReadUnitId(globalReadActor),
    resolveDocumentReadUnitId(globalReadActor),
    resolveFiscalReadUnitId(globalReadActor),
    resolveIntegrationEventReadUnitId(globalReadActor),
    resolvePosReadUnitId(globalReadActor),
    resolveReportCardReadUnitId(globalReadActor),
    resolveEmployeeReadUnitId(globalReadActor),
    resolveTeamOperationsReadUnitId(globalReadActor),
    resolveCommissionReadUnitId(globalReadActor),
    resolveServiceReadUnitId(globalReadActor),
    resolveWaitlistReadUnitId(globalReadActor),
    resolveTaxiDogReadUnitId(globalReadActor),
  ]

  assert.deepEqual(new Set(resolvedUnits), new Set(['unit_branch']))
})

test('phase 3 block 2 smoke keeps cross-unit structural writes blocked for read-only global operators', () => {
  assert.throws(
    () =>
      assertActorCanStructurallyWriteOwnershipBinding(
        globalReadActor,
        buildClientOwnershipBinding('unit_branch'),
        {
          requestedUnitId: 'unit_branch',
        },
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to perform a structural cross-unit update.',
  )
})

test('phase 3 block 2 smoke keeps the tutor portal scoped to tutor-owned operational signals only', () => {
  const alerts = deriveTutorPortalAlerts({
    appointments: [
      {
        operationalStatusId: 'CONFIRMED',
        startAt: new Date('2026-04-10T18:00:00.000Z'),
        taxiDogRide: {
          status: 'SCHEDULED',
        },
        tutorPreCheckIn: null,
      },
    ],
    documents: [
      {
        metadata: {
          requiresSignature: true,
        },
        signatures: [],
      },
    ],
    now: new Date('2026-04-10T12:00:00.000Z'),
    pendingDepositAmount: 25,
    preCheckInWindowHours: 24,
    tutorId: 'tutor-block2',
    waitlistPendingCount: 1,
  })

  assert.deepEqual(
    alerts.map((alert) => alert.code),
    [
      'DOCUMENT_SIGNATURE_PENDING',
      'PRE_CHECK_IN_PENDING',
      'DEPOSIT_PENDING',
      'WAITLIST_PENDING',
      'TAXI_DOG_ACTIVE',
    ],
  )
})
