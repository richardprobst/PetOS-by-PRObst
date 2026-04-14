import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTutorAssistantAdminDiagnosticsFromAuditLogs,
  buildTutorAssistantUsageSnapshotFromAuditLogs,
} from '../../../features/assistant/usage'

function createAssistantAuditLog(input: {
  action?: 'ai.execution.blocked' | 'ai.execution.completed' | 'ai.execution.failed'
  channel?: 'TEXT' | 'VOICE'
  id: string
  inferenceKey: string
  intent?: string
  occurredAt: string
  replyPreview?: string | null
  responseStatus?: 'ANSWERED' | 'BLOCKED' | 'NEEDS_CLARIFICATION' | 'NEEDS_CONFIRMATION'
  unitId?: string | null
  userId?: string | null
}) {
  const action = input.action ?? 'ai.execution.completed'
  const signals = [
    ...(input.channel
      ? [
          {
            key: 'assistant_channel',
            value: input.channel,
          },
        ]
      : []),
    ...(input.intent
      ? [
          {
            key: 'assistant_intent',
            value: input.intent,
          },
        ]
      : []),
    ...(input.responseStatus
      ? [
          {
            key: 'assistant_response_status',
            value: input.responseStatus,
          },
        ]
      : []),
  ]

  return {
    action,
    details: {
      outcome:
        action === 'ai.execution.completed'
          ? {
              interpretedResult: {
                signals,
                summary: input.replyPreview ?? null,
              },
            }
          : null,
      request: {
        inferenceKey: input.inferenceKey,
        module: 'VIRTUAL_ASSISTANT',
      },
    },
    id: input.id,
    occurredAt: new Date(input.occurredAt),
    unitId: input.unitId ?? 'unit_tutor',
    userId: input.userId ?? 'user_tutor',
  }
}

test('buildTutorAssistantUsageSnapshotFromAuditLogs derives minimum tutor history and counts from audit logs', () => {
  const snapshot = buildTutorAssistantUsageSnapshotFromAuditLogs(
    [
      createAssistantAuditLog({
        channel: 'TEXT',
        id: 'log_report_cards',
        inferenceKey: 'voice.tutor.query.report-cards.interpret.v1',
        intent: 'QUERY_REPORT_CARDS',
        occurredAt: '2026-04-08T15:00:00.000Z',
        replyPreview: 'Seus report cards mais recentes: Thor em 08/04/2026 12:00.',
        responseStatus: 'ANSWERED',
      }),
      createAssistantAuditLog({
        channel: 'VOICE',
        id: 'log_schedule',
        inferenceKey: 'voice.tutor.schedule.interpret.v1',
        intent: 'SCHEDULE_APPOINTMENT',
        occurredAt: '2026-04-07T15:00:00.000Z',
        replyPreview:
          'Montei um rascunho de agendamento: Banho para Thor em 13/04/2026 09:00.',
      }),
      createAssistantAuditLog({
        action: 'ai.execution.blocked',
        id: 'log_blocked',
        inferenceKey: 'voice.tutor.query.finance.interpret.v1',
        intent: 'QUERY_FINANCE_SUMMARY',
        occurredAt: '2026-04-06T15:00:00.000Z',
      }),
      createAssistantAuditLog({
        channel: 'VOICE',
        id: 'log_unknown',
        inferenceKey: 'voice.tutor.unknown.interpret.v1',
        intent: 'UNKNOWN',
        occurredAt: '2026-03-20T15:00:00.000Z',
        replyPreview: 'Ainda nao consegui interpretar esse pedido com seguranca.',
      }),
    ],
    {
      now: new Date('2026-04-09T12:00:00.000Z'),
      recentLimit: 6,
    },
  )

  assert.equal(snapshot.summary.totalLast7Days, 3)
  assert.equal(snapshot.summary.totalLast30Days, 4)
  assert.equal(snapshot.summary.blockedLast30Days, 1)
  assert.equal(snapshot.summary.confirmationsLast30Days, 1)
  assert.equal(snapshot.summary.needsClarificationLast30Days, 1)
  assert.equal(snapshot.summary.textInteractionsLast30Days, 1)
  assert.equal(snapshot.summary.voiceInteractionsLast30Days, 2)
  assert.equal(
    snapshot.summary.lastInteractionAt?.toISOString(),
    '2026-04-08T15:00:00.000Z',
  )
  assert.equal(snapshot.recentInteractions[0]?.intent, 'QUERY_REPORT_CARDS')
  assert.equal(snapshot.recentInteractions[0]?.intentLabel, 'Report cards')
  assert.equal(snapshot.recentInteractions[0]?.statusLabel, 'Respondida')
  assert.equal(snapshot.recentInteractions[1]?.status, 'NEEDS_CONFIRMATION')
  assert.equal(
    snapshot.recentInteractions[1]?.statusLabel,
    'Aguardando confirmacao',
  )
  assert.equal(snapshot.recentInteractions[1]?.channelLabel, 'Voz')
})

test('buildTutorAssistantAdminDiagnosticsFromAuditLogs preserves scope and filters the assistant recorte only', () => {
  const diagnostics = buildTutorAssistantAdminDiagnosticsFromAuditLogs(
    [
      createAssistantAuditLog({
        channel: 'TEXT',
        id: 'log_report_cards_a',
        inferenceKey: 'voice.tutor.query.report-cards.interpret.v1',
        intent: 'QUERY_REPORT_CARDS',
        occurredAt: '2026-04-08T15:00:00.000Z',
        replyPreview: 'Seus report cards mais recentes.',
        responseStatus: 'ANSWERED',
      }),
      createAssistantAuditLog({
        channel: 'TEXT',
        id: 'log_report_cards_b',
        inferenceKey: 'voice.tutor.query.report-cards.interpret.v1',
        intent: 'QUERY_REPORT_CARDS',
        occurredAt: '2026-04-07T15:00:00.000Z',
        replyPreview: 'Seus report cards mais recentes.',
        responseStatus: 'ANSWERED',
      }),
      {
        action: 'ai.execution.completed',
        details: {
          request: {
            inferenceKey: 'vision.precheck.assistive',
            module: 'IMAGE_ANALYSIS',
          },
        },
        id: 'log_other_module',
        occurredAt: new Date('2026-04-06T15:00:00.000Z'),
        unitId: 'unit_tutor',
        userId: 'user_tutor',
      },
    ],
    {
      activeUnitId: 'unit_tutor',
      contextType: 'LOCAL',
      diagnosticUnitId: 'unit_tutor',
      globalReadAccess: false,
      status: 'RESOLVED',
    },
    {
      now: new Date('2026-04-09T12:00:00.000Z'),
    },
  )

  assert.equal(diagnostics.scope.diagnosticUnitId, 'unit_tutor')
  assert.equal(diagnostics.summary.totalLast30Days, 2)
  assert.equal(diagnostics.summary.answeredLast30Days, 2)
  assert.equal(diagnostics.operationalValidation.status, 'EARLY_USAGE')
  assert.equal(diagnostics.operationalValidation.statusLabel, 'Uso inicial')
  assert.equal(
    diagnostics.operationalValidation.voiceCoverageStatus,
    'NOT_OBSERVED',
  )
  assert.equal(
    diagnostics.operationalValidation.voiceCoverageStatusLabel,
    'Voz nao observada',
  )
  assert.equal(
    diagnostics.operationalValidation.alerts.some(
      (alert) => alert.key === 'assistant.voice-not-observed',
    ),
    true,
  )
  assert.deepEqual(diagnostics.topIntents, [
    {
      count: 2,
      intent: 'QUERY_REPORT_CARDS',
      label: 'Report cards',
    },
  ])
  assert.equal(diagnostics.recentInteractions.every((item) => item.intent === 'QUERY_REPORT_CARDS'), true)
  assert.equal(
    diagnostics.recentInteractions.every(
      (item) =>
        item.intentLabel === 'Report cards' &&
        item.statusLabel === 'Respondida' &&
        item.channelLabel === 'Texto',
    ),
    true,
  )
})

test('buildTutorAssistantAdminDiagnosticsFromAuditLogs raises attention when block and clarification rates are too high', () => {
  const diagnostics = buildTutorAssistantAdminDiagnosticsFromAuditLogs(
    [
      createAssistantAuditLog({
        action: 'ai.execution.blocked',
        id: 'log_blocked_a',
        inferenceKey: 'voice.tutor.query.finance.interpret.v1',
        intent: 'QUERY_FINANCE_SUMMARY',
        occurredAt: '2026-04-08T15:00:00.000Z',
      }),
      createAssistantAuditLog({
        action: 'ai.execution.blocked',
        id: 'log_blocked_b',
        inferenceKey: 'voice.tutor.query.documents.interpret.v1',
        intent: 'QUERY_PENDING_DOCUMENTS',
        occurredAt: '2026-04-07T15:00:00.000Z',
      }),
      createAssistantAuditLog({
        channel: 'TEXT',
        id: 'log_unknown_a',
        inferenceKey: 'voice.tutor.unknown.interpret.v1',
        intent: 'UNKNOWN',
        occurredAt: '2026-04-06T15:00:00.000Z',
        replyPreview: 'Ainda nao consegui interpretar esse pedido com seguranca.',
      }),
      createAssistantAuditLog({
        channel: 'TEXT',
        id: 'log_unknown_b',
        inferenceKey: 'voice.tutor.unknown.interpret.v1',
        intent: 'UNKNOWN',
        occurredAt: '2026-04-05T15:00:00.000Z',
        replyPreview: 'Ainda nao consegui interpretar esse pedido com seguranca.',
      }),
      createAssistantAuditLog({
        channel: 'TEXT',
        id: 'log_help',
        inferenceKey: 'voice.tutor.help.interpret.v1',
        intent: 'HELP',
        occurredAt: '2026-04-04T15:00:00.000Z',
        replyPreview: 'Posso ajudar com agenda, financeiro e documentos.',
        responseStatus: 'ANSWERED',
      }),
    ],
    {
      activeUnitId: 'unit_tutor',
      contextType: 'LOCAL',
      diagnosticUnitId: 'unit_tutor',
      globalReadAccess: false,
      status: 'RESOLVED',
    },
    {
      now: new Date('2026-04-09T12:00:00.000Z'),
    },
  )

  assert.equal(diagnostics.operationalValidation.status, 'ATTENTION_REQUIRED')
  assert.equal(
    diagnostics.operationalValidation.statusLabel,
    'Atencao necessaria',
  )
  assert.equal(diagnostics.operationalValidation.blockRatePercent, 40)
  assert.equal(diagnostics.operationalValidation.clarificationRatePercent, 40)
  assert.equal(
    diagnostics.operationalValidation.alerts.some(
      (alert) => alert.key === 'assistant.high-block-rate',
    ),
    true,
  )
  assert.equal(
    diagnostics.operationalValidation.alerts.some(
      (alert) => alert.key === 'assistant.high-clarification-rate',
    ),
    true,
  )
})
