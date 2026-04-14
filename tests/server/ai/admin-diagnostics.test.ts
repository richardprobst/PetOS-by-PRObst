import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAiFoundationDiagnostics,
  getAiFoundationDiagnosticPermissions,
} from '../../../features/ai/admin-diagnostics'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { AppError } from '../../../server/http/errors'

const enabledEnvironment = {
  AI_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_ENABLED: 'true',
  AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
  AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
} as const

const updateOperator: AuthenticatedUserData = {
  active: true,
  email: 'diagnostics@petos.app',
  id: 'user_diagnostics',
  name: 'Diagnostics Operator',
  permissions: ['sistema.update.operar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

test('getAiFoundationDiagnostics enforces high system permission before exposing the foundation snapshot', () => {
  assert.throws(
    () =>
      getAiFoundationDiagnostics(
        {
          ...updateOperator,
          permissions: ['sistema.runtime.visualizar'],
        },
        {
          environment: enabledEnvironment,
        },
      ),
    (error) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message.includes('Missing high permission'),
  )
})

test('getAiFoundationDiagnostics exposes current flags, module states and lifecycle reference for an authorized operator', () => {
  const diagnostics = getAiFoundationDiagnostics(updateOperator, {
    environment: enabledEnvironment,
  })

  assert.deepEqual(getAiFoundationDiagnosticPermissions(), [
    'sistema.manutencao.operar',
    'sistema.reparo.operar',
    'sistema.update.operar',
  ])
  assert.equal(diagnostics.flags.length, 3)
  assert.equal(diagnostics.flags[0]?.status, 'ENABLED')
  assert.equal(diagnostics.flags[0]?.statusLabel, 'Habilitada')
  assert.equal(diagnostics.modules.length, 2)
  assert.equal(diagnostics.modules[0]?.module, 'IMAGE_ANALYSIS')
  assert.equal(diagnostics.modules[0]?.moduleLabel, 'Analise de imagem')
  assert.equal(diagnostics.modules[0]?.current.status, 'ACCEPTED')
  assert.equal(diagnostics.modules[0]?.current.statusLabel, 'Admitido')
  assert.equal(diagnostics.modules[0]?.current.policyReasonCode, 'ENABLED')
  assert.equal(
    diagnostics.modules[0]?.current.policyReasonLabel,
    'Politica habilitada',
  )
  assert.equal(
    diagnostics.modules[0]?.current.events.some(
      (event) => event.eventCode === 'COST_ESTIMATE_AVAILABLE',
    ),
    true,
  )
  assert.equal(
    diagnostics.modules[0]?.current.events[0]?.eventLabel,
    'Estimativa de custo disponivel',
  )
  assert.equal(diagnostics.modules[1]?.module, 'PREDICTIVE_INSIGHTS')
  assert.equal(diagnostics.modules[1]?.current.consentDecisionStatus, 'NOT_APPLICABLE')
  assert.equal(
    diagnostics.modules[1]?.current.consentDecisionStatusLabel,
    'Consentimento nao exigido',
  )
  assert.equal(diagnostics.lifecycleReference.accepted.status, 'ACCEPTED')
  assert.equal(diagnostics.lifecycleReference.accepted.statusLabel, 'Admitido')
  assert.equal(diagnostics.lifecycleReference.queued.status, 'QUEUED')
  assert.equal(diagnostics.lifecycleReference.running.status, 'RUNNING')
  assert.equal(diagnostics.lifecycleReference.completed.status, 'COMPLETED')
  assert.equal(diagnostics.lifecycleReference.failed.status, 'FAILED')
})

test('getAiFoundationDiagnostics keeps distinct administrative scenarios for flag, quota, consent, unavailability and not supported', () => {
  const diagnostics = getAiFoundationDiagnostics(updateOperator, {
    environment: enabledEnvironment,
  })
  const scenarios = new Map(
    diagnostics.scenarios.map((scenario) => [scenario.key, scenario.envelope]),
  )

  assert.equal(scenarios.get('FLAG_BLOCK')?.policyReasonCode, 'DISABLED_BY_POLICY')
  assert.equal(
    scenarios.get('FLAG_BLOCK')?.policyReasonLabel,
    'Bloqueado por politica',
  )
  assert.equal(
    scenarios.get('FLAG_BLOCK')?.events.some(
      (event) => event.eventCode === 'RAPID_SHUTDOWN_ACTIVE',
    ),
    true,
  )
  assert.equal(scenarios.get('QUOTA_BLOCK')?.policyReasonCode, 'QUOTA_EXCEEDED')
  assert.equal(scenarios.get('CONSENT_BLOCK')?.consentReasonCode, 'CONSENT_MISSING')
  assert.equal(
    scenarios.get('CONSENT_BLOCK')?.consentReasonLabel,
    'Consentimento ausente',
  )
  assert.equal(
    scenarios.get('TEMPORARY_UNAVAILABLE')?.policyReasonCode,
    'TEMPORARILY_UNAVAILABLE',
  )
  assert.equal(
    scenarios.get('TEMPORARY_UNAVAILABLE')?.policyReasonLabel,
    'Indisponibilidade temporaria',
  )
  assert.equal(scenarios.get('NOT_SUPPORTED')?.gateReasonCode, 'NOT_SUPPORTED')
  assert.equal(
    scenarios.get('NOT_SUPPORTED')?.gateReasonLabel,
    'Gating nao suportado',
  )
  assert.equal(scenarios.get('CONTROLLED_FAILURE')?.status, 'FAILED')
  assert.equal(scenarios.get('CONTROLLED_FAILURE')?.statusLabel, 'Falhou')
})

test('getAiFoundationDiagnostics keeps the multiunit snapshot fail-closed and avoids cross-unit leakage for unresolved local context', () => {
  const diagnostics = getAiFoundationDiagnostics(
    {
      ...updateOperator,
      multiUnitContext: {
        activeUnitId: 'unit_other',
        contextOrigin: 'SESSION_OVERRIDE',
        contextType: 'LOCAL',
      },
    },
    {
      environment: enabledEnvironment,
    },
  )

  assert.equal(diagnostics.multiUnit.status, 'UNRESOLVED')
  assert.equal(diagnostics.multiUnit.crossUnitAccess, false)
  assert.equal(diagnostics.multiUnit.diagnosticUnitId, 'unit_local')
  assert.equal(diagnostics.multiUnit.activeUnitId, 'unit_other')
})
