import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canBypassRuntimeLock,
  resolveRuntimeHoldingRoute,
} from '../../../server/system/access'
import type { SystemRuntimeSnapshot } from '../../../server/system/runtime-state'

function createRuntimeSnapshot(
  overrides: Partial<SystemRuntimeSnapshot> = {},
): SystemRuntimeSnapshot {
  return {
    buildVersion: '0.2.0',
    coreSeedAvailable: true,
    currentInstalledVersion: '0.2.0',
    databaseAvailable: true,
    installerEnabled: false,
    installerLocked: true,
    installerTokenConfigured: false,
    lastTransitionAt: new Date('2026-04-05T12:00:00.000Z'),
    lifecycleSource: 'persisted',
    lifecycleState: 'INSTALLED',
    maintenanceActive: false,
    maintenanceReason: null,
    manifestHash: null,
    migrationsTableAvailable: true,
    previousVersion: '0.2.0',
    recordExists: true,
    ...overrides,
  }
}

test('resolveRuntimeHoldingRoute sends maintenance-like states to /manutencao', () => {
  assert.equal(
    resolveRuntimeHoldingRoute(createRuntimeSnapshot({ lifecycleState: 'MAINTENANCE' })),
    '/manutencao',
  )
  assert.equal(
    resolveRuntimeHoldingRoute(createRuntimeSnapshot({ lifecycleState: 'UPDATING' })),
    '/manutencao',
  )
})

test('resolveRuntimeHoldingRoute sends repair-like states to /reparo', () => {
  assert.equal(
    resolveRuntimeHoldingRoute(createRuntimeSnapshot({ lifecycleState: 'REPAIR' })),
    '/reparo',
  )
  assert.equal(
    resolveRuntimeHoldingRoute(createRuntimeSnapshot({ lifecycleState: 'UPDATE_FAILED' })),
    '/reparo',
  )
  assert.equal(
    resolveRuntimeHoldingRoute(createRuntimeSnapshot({ lifecycleState: 'INSTALL_FAILED' })),
    '/reparo',
  )
})

test('canBypassRuntimeLock only allows operators with runtime-control permissions', () => {
  assert.equal(
    canBypassRuntimeLock({
      active: true,
      email: 'admin@petos.local',
      id: 'user_admin',
      name: 'Admin',
      permissions: ['sistema.manutencao.operar'],
      profiles: ['Administrador'],
      unitId: 'unit_1',
      userType: 'ADMIN',
    }),
    true,
  )

  assert.equal(
    canBypassRuntimeLock({
      active: true,
      email: 'recepcao@petos.local',
      id: 'user_recepcao',
      name: 'Recepcao',
      permissions: ['cliente.visualizar', 'agendamento.visualizar'],
      profiles: ['Recepcionista'],
      unitId: 'unit_1',
      userType: 'ADMIN',
    }),
    false,
  )
})
