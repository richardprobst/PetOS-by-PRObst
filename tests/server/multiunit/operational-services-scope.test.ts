import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'
import {
  resolveCommissionReadUnitId,
} from '../../../features/commissions/services'
import {
  assertActorCanReadCrmResourceInScope,
  resolveCrmReadUnitId,
} from '../../../features/crm/services'
import {
  assertActorCanReadDocumentInScope,
  resolveDocumentReadUnitId,
} from '../../../features/documents/services'
import {
  assertActorCanReadEmployeeInScope,
  resolveEmployeeReadUnitId,
} from '../../../features/employees/services'
import {
  assertActorCanReadFinanceRecordInScope,
  resolveFinanceReadUnitId,
} from '../../../features/finance/services'
import {
  assertActorCanReadFiscalDocumentInScope,
  resolveFiscalReadUnitId,
} from '../../../features/fiscal/services'
import {
  assertActorCanReadInventoryRecordInScope,
  resolveInventoryReadUnitId,
} from '../../../features/inventory/services'
import { resolveIntegrationEventReadUnitId } from '../../../features/integrations/services'
import {
  assertActorCanReadMessageTemplateInScope,
  resolveMessageReadUnitId,
} from '../../../features/messages/services'
import {
  assertActorCanReadPosSaleInScope,
  resolvePosReadUnitId,
} from '../../../features/pos/services'
import {
  assertActorCanReadReportCardInScope,
  resolveReportCardReadUnitId,
} from '../../../features/report-cards/services'
import {
  assertActorCanReadServiceInScope,
  resolveServiceReadUnitId,
} from '../../../features/services/services'
import {
  assertActorCanReadTaxiDogRecordInScope,
  resolveTaxiDogReadUnitId,
} from '../../../features/taxi-dog/services'
import {
  assertActorCanReadTeamOperationsRecordInScope,
  resolveTeamOperationsReadUnitId,
} from '../../../features/team-operations/services'
import {
  assertActorCanReadWaitlistEntryInScope,
  resolveWaitlistReadUnitId,
} from '../../../features/waitlist/services'

const localActor: AuthenticatedUserData = {
  active: true,
  email: 'multiunit.local@petos.app',
  id: 'user_multiunit_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Multiunit Local Operator',
  permissions: ['financeiro.visualizar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

const globalReadActorWithSessionOverride: AuthenticatedUserData = {
  ...localActor,
  email: 'multiunit.global@petos.app',
  id: 'user_multiunit_global',
  multiUnitContext: {
    activeUnitId: 'unit_branch',
    contextOrigin: 'SESSION_OVERRIDE',
    contextType: 'GLOBAL_AUTHORIZED',
  },
  permissions: ['financeiro.visualizar', 'multiunidade.global.visualizar'],
}

test('finance reads preserve the local single-unit default', () => {
  assert.equal(resolveFinanceReadUnitId(localActor), 'unit_local')
})

test('finance reads block local actors from switching to another unit', () => {
  assert.throws(
    () => resolveFinanceReadUnitId(localActor, 'unit_branch'),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('finance records allow global-authorized access only inside the active cross-unit context', () => {
  assert.doesNotThrow(() =>
    assertActorCanReadFinanceRecordInScope(
      globalReadActorWithSessionOverride,
      'unit_branch',
      {
        requestedUnitId: 'unit_branch',
      },
    ),
  )
})

test('fiscal reads preserve the local single-unit default', () => {
  assert.equal(resolveFiscalReadUnitId(localActor), 'unit_local')
})

test('fiscal documents allow global-authorized access only inside the active cross-unit context', () => {
  assert.doesNotThrow(() =>
    assertActorCanReadFiscalDocumentInScope(
      globalReadActorWithSessionOverride,
      'unit_branch',
      {
        unitId: 'unit_branch',
      },
    ),
  )
})

test('inventory reads block foreign records when the context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadInventoryRecordInScope(localActor, 'unit_branch', {
        requestedUnitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('inventory reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveInventoryReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('message templates with shared scope remain readable without unit binding', () => {
  assert.doesNotThrow(() =>
    assertActorCanReadMessageTemplateInScope(localActor, null),
  )
})

test('message templates with local scope block foreign reads outside the selected unit context', () => {
  assert.throws(
    () =>
      assertActorCanReadMessageTemplateInScope(localActor, 'unit_branch', {
        requestedUnitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('message reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveMessageReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('CRM reads block foreign records when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadCrmResourceInScope(localActor, 'unit_branch', {
        unitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('CRM reads honor the active global-authorized session context', () => {
  assert.equal(resolveCrmReadUnitId(globalReadActorWithSessionOverride), 'unit_branch')
})

test('documents block foreign assets when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadDocumentInScope(localActor, 'unit_branch', {
        unitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('documents honor the active global-authorized session context', () => {
  assert.equal(
    resolveDocumentReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('employee reads allow foreign records only in the active globally authorized unit context', () => {
  assert.doesNotThrow(() =>
    assertActorCanReadEmployeeInScope(
      globalReadActorWithSessionOverride,
      'unit_branch',
      {
        requestedUnitId: 'unit_branch',
      },
    ),
  )
})

test('POS reads block foreign sales when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadPosSaleInScope(localActor, 'unit_branch', {
        unitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('POS reads honor the active global-authorized session context', () => {
  assert.equal(resolvePosReadUnitId(globalReadActorWithSessionOverride), 'unit_branch')
})

test('report card reads block foreign appointments when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadReportCardInScope(localActor, 'unit_branch', {
        unitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('report card reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveReportCardReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('team operations reads block foreign records when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadTeamOperationsRecordInScope(localActor, 'unit_branch', {
        requestedUnitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('team operations reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveTeamOperationsReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('service catalog reads keep shared services visible without unit binding', () => {
  assert.doesNotThrow(() => assertActorCanReadServiceInScope(localActor, null))
})

test('service catalog reads honor the active global-authorized session context for local services', () => {
  assert.equal(
    resolveServiceReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('waitlist reads block foreign records when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadWaitlistEntryInScope(localActor, 'unit_branch', {
        requestedUnitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('waitlist reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveWaitlistReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('taxi dog reads block foreign records when the current context remains local', () => {
  assert.throws(
    () =>
      assertActorCanReadTaxiDogRecordInScope(localActor, 'unit_branch', {
        requestedUnitId: 'unit_branch',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.message === 'User is not allowed to operate on another unit.',
  )
})

test('taxi dog reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveTaxiDogReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('integration-event reads preserve the local single-unit default', () => {
  assert.equal(resolveIntegrationEventReadUnitId(localActor), 'unit_local')
})

test('integration-event reads honor the active global-authorized session context', () => {
  assert.equal(
    resolveIntegrationEventReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})

test('commission summaries preserve the local single-unit default', () => {
  assert.equal(resolveCommissionReadUnitId(localActor), 'unit_local')
})

test('commission summaries honor the active global-authorized session context', () => {
  assert.equal(
    resolveCommissionReadUnitId(globalReadActorWithSessionOverride),
    'unit_branch',
  )
})
