import {
  getAiFoundationDiagnostics,
  type AiFoundationDiagnosticsSnapshot,
} from '@/features/ai/admin-diagnostics'
import type { AiQuotaEnvironment } from '@/features/ai/policy'
import { getMultiUnitFoundationDiagnostics } from '@/features/multiunit/admin-diagnostics'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'

type GovernanceAlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
type GovernanceAlertSource =
  | 'CONFIGURATION'
  | 'IMAGE_ANALYSIS'
  | 'PREDICTIVE_INSIGHTS'
  | 'AUDIT'
  | 'MULTIUNIT'
  | 'FALLBACK'

export interface Phase3GovernanceModuleSummary {
  currentStatus: string
  fallbackStatus: string
  gateReasonCode: string | null
  module: 'IMAGE_ANALYSIS' | 'PREDICTIVE_INSIGHTS'
  policyReasonCode: string | null
  quotaStatus: string | null
}

export interface Phase3GovernanceImageSummary {
  approvedReviews: number
  blockedExecutions: number
  failedExecutions: number
  latestCreatedAt: Date | null
  latestReviewedAt: Date | null
  pendingHumanReview: number
  rejectedReviews: number
  totalSnapshots: number
}

export interface Phase3GovernancePredictiveSummary {
  acknowledgedFeedback: number
  actionPlannedFeedback: number
  blockedExecutions: number
  failedExecutions: number
  latestFeedbackAt: Date | null
  latestSnapshotDate: Date | null
  notUsefulFeedback: number
  pendingFeedback: number
  totalSnapshots: number
}

export interface Phase3GovernanceAuditSummary {
  aiExecutionEventsLast30Days: number
  fallbackEventsLast30Days: number
  humanDecisionEventsLast30Days: number
  imageAuditEventsLast30Days: number
  lastAiAuditAt: Date | null
  lastImageAuditAt: Date | null
  lastPredictiveAuditAt: Date | null
  predictiveAuditEventsLast30Days: number
}

export interface Phase3GovernanceAlert {
  actionRequired: boolean
  key:
    | 'AI_GLOBAL_FAIL_CLOSED'
    | 'IMAGE_MODULE_GUARD_ACTIVE'
    | 'PREDICTIVE_MODULE_GUARD_ACTIVE'
    | 'IMAGE_REVIEW_BACKLOG'
    | 'IMAGE_FAILURES_PRESENT'
    | 'PREDICTIVE_SNAPSHOT_MISSING'
    | 'PREDICTIVE_NOT_USEFUL'
    | 'PREDICTIVE_PENDING_FEEDBACK'
    | 'MULTIUNIT_SESSION_UNRESOLVED'
    | 'FALLBACK_CONCEPTUAL_ONLY'
  nextStep: string
  severity: GovernanceAlertSeverity
  source: GovernanceAlertSource
  summary: string
  title: string
}

export interface Phase3GovernancePhaseSummary {
  completedBlocks: readonly ['BLOCK1', 'BLOCK2', 'BLOCK3', 'BLOCK4']
  currentBlock: 'BLOCK5'
  criticalAlertCount: number
  openAlertCount: number
  status: 'ATTENTION_REQUIRED' | 'READY' | 'READY_WITH_GUARDRAILS'
  warningAlertCount: number
}

export interface Phase3GovernanceSnapshot {
  alerts: Phase3GovernanceAlert[]
  audit: Phase3GovernanceAuditSummary
  currentState: {
    failClosed: true
    globalFlagStatus: string | null
    imageFlagStatus: string | null
    modules: Phase3GovernanceModuleSummary[]
    multiUnitFailClosed: boolean
    multiUnitSessionStatus: string
    predictiveFlagStatus: string | null
  }
  foundationGeneratedAt: Date
  generatedAt: Date
  imageAnalysis: Phase3GovernanceImageSummary
  phase: Phase3GovernancePhaseSummary
  predictiveInsights: Phase3GovernancePredictiveSummary
}

interface GetPhase3GovernanceSnapshotOptions {
  now?: Date
}

function subtractDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() - days)
  return next
}

function getCurrentAiQuotaEnvironment() {
  return {
    AI_ENABLED: process.env.AI_ENABLED,
    AI_IMAGE_ANALYSIS_BASE_QUOTA: process.env.AI_IMAGE_ANALYSIS_BASE_QUOTA,
    AI_IMAGE_ANALYSIS_ENABLED: process.env.AI_IMAGE_ANALYSIS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_BASE_QUOTA:
      process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
    AI_PREDICTIVE_INSIGHTS_ENABLED:
      process.env.AI_PREDICTIVE_INSIGHTS_ENABLED,
    AI_VIRTUAL_ASSISTANT_BASE_QUOTA:
      process.env.AI_VIRTUAL_ASSISTANT_BASE_QUOTA,
    AI_VIRTUAL_ASSISTANT_ENABLED:
      process.env.AI_VIRTUAL_ASSISTANT_ENABLED,
  } as AiQuotaEnvironment
}

function findFlagStatus(
  diagnostics: AiFoundationDiagnosticsSnapshot,
  flagKey: string,
) {
  return (
    diagnostics.flags.find((flag) => flag.flagKey === flagKey)?.status ?? null
  )
}

function isPhase3GovernanceModuleSummary(
  moduleDiagnostic: AiFoundationDiagnosticsSnapshot['modules'][number],
): moduleDiagnostic is AiFoundationDiagnosticsSnapshot['modules'][number] & {
  module: 'IMAGE_ANALYSIS' | 'PREDICTIVE_INSIGHTS'
} {
  return (
    moduleDiagnostic.module === 'IMAGE_ANALYSIS' ||
    moduleDiagnostic.module === 'PREDICTIVE_INSIGHTS'
  )
}

function createModuleSummaries(
  diagnostics: AiFoundationDiagnosticsSnapshot,
): Phase3GovernanceModuleSummary[] {
  return diagnostics.modules
    .filter(isPhase3GovernanceModuleSummary)
    .map((moduleDiagnostic) => ({
      currentStatus: moduleDiagnostic.current.status,
      fallbackStatus: moduleDiagnostic.current.fallbackStatus,
      gateReasonCode: moduleDiagnostic.current.gateReasonCode,
      module: moduleDiagnostic.module,
      policyReasonCode: moduleDiagnostic.current.policyReasonCode,
      quotaStatus: moduleDiagnostic.current.moduleQuota?.status ?? null,
    }))
}

function createPhaseSummary(
  alerts: Phase3GovernanceAlert[],
): Phase3GovernancePhaseSummary {
  const criticalAlertCount = alerts.filter(
    (alert) => alert.severity === 'CRITICAL' || alert.severity === 'ERROR',
  ).length
  const warningAlertCount = alerts.filter(
    (alert) => alert.severity === 'WARNING',
  ).length

  return {
    completedBlocks: ['BLOCK1', 'BLOCK2', 'BLOCK3', 'BLOCK4'],
    criticalAlertCount,
    currentBlock: 'BLOCK5',
    openAlertCount: alerts.length,
    status:
      criticalAlertCount > 0
        ? 'ATTENTION_REQUIRED'
        : warningAlertCount > 0
          ? 'READY_WITH_GUARDRAILS'
          : 'READY',
    warningAlertCount,
  }
}

function buildAlerts(input: {
  audit: Phase3GovernanceAuditSummary
  foundation: AiFoundationDiagnosticsSnapshot
  imageAnalysis: Phase3GovernanceImageSummary
  predictiveInsights: Phase3GovernancePredictiveSummary
  multiUnit: ReturnType<typeof getMultiUnitFoundationDiagnostics>
}) {
  const alerts: Phase3GovernanceAlert[] = []
  const globalFlagStatus = findFlagStatus(input.foundation, 'ai.enabled')
  const imageFlagStatus = findFlagStatus(
    input.foundation,
    'ai.imageAnalysis.enabled',
  )
  const predictiveFlagStatus = findFlagStatus(
    input.foundation,
    'ai.predictiveInsights.enabled',
  )
  const imageModule = input.foundation.modules.find(
    (module) => module.module === 'IMAGE_ANALYSIS',
  )
  const predictiveModule = input.foundation.modules.find(
    (module) => module.module === 'PREDICTIVE_INSIGHTS',
  )

  if (globalFlagStatus !== 'ENABLED') {
    alerts.push({
      actionRequired: true,
      key: 'AI_GLOBAL_FAIL_CLOSED',
      nextStep: 'Revisar se a IA deve permanecer desligada ou corrigir a configuracao de flags.',
      severity: 'CRITICAL',
      source: 'CONFIGURATION',
      summary:
        'A flag global da IA esta fora do estado ENABLED e a Fase 3 esta operando em fail-closed.',
      title: 'IA global desligada ou bloqueada',
    })
  }

  if (
    imageFlagStatus !== 'ENABLED' ||
    imageModule?.current.status === 'BLOCKED'
  ) {
    alerts.push({
      actionRequired: imageFlagStatus !== 'ENABLED',
      key: 'IMAGE_MODULE_GUARD_ACTIVE',
      nextStep: 'Validar gating, quota e consentimento antes de reabrir o fluxo assistivo de imagem.',
      severity: imageFlagStatus !== 'ENABLED' ? 'WARNING' : 'INFO',
      source: 'CONFIGURATION',
      summary:
        'O modulo de imagem nao esta livre para admissao no snapshot atual da fundacao.',
      title: 'Guardrail ativo no modulo de imagem',
    })
  }

  if (
    predictiveFlagStatus !== 'ENABLED' ||
    predictiveModule?.current.status === 'BLOCKED'
  ) {
    alerts.push({
      actionRequired: predictiveFlagStatus !== 'ENABLED',
      key: 'PREDICTIVE_MODULE_GUARD_ACTIVE',
      nextStep: 'Validar gating e quota do modulo preditivo antes de depender do insight como rotina operacional.',
      severity: predictiveFlagStatus !== 'ENABLED' ? 'WARNING' : 'INFO',
      source: 'CONFIGURATION',
      summary:
        'O modulo preditivo nao esta livre para admissao no snapshot atual da fundacao.',
      title: 'Guardrail ativo no modulo preditivo',
    })
  }

  if (input.imageAnalysis.pendingHumanReview > 0) {
    alerts.push({
      actionRequired: true,
      key: 'IMAGE_REVIEW_BACKLOG',
      nextStep: 'Esvaziar a fila de revisao humana antes de ampliar o uso interno do fluxo de imagem.',
      severity: 'WARNING',
      source: 'IMAGE_ANALYSIS',
      summary: `Existem ${input.imageAnalysis.pendingHumanReview} analises de imagem aguardando revisao humana.`,
      title: 'Backlog de revisao humana em imagem',
    })
  }

  if (
    input.imageAnalysis.failedExecutions > 0 ||
    input.imageAnalysis.blockedExecutions > 0
  ) {
    alerts.push({
      actionRequired: true,
      key: 'IMAGE_FAILURES_PRESENT',
      nextStep: 'Inspecionar auditoria e eventos operacionais do fluxo de imagem antes de ampliar o volume.',
      severity: 'WARNING',
      source: 'IMAGE_ANALYSIS',
      summary: `O fluxo de imagem acumula ${input.imageAnalysis.failedExecutions} falhas e ${input.imageAnalysis.blockedExecutions} bloqueios persistidos.`,
      title: 'Falhas ou bloqueios no fluxo de imagem',
    })
  }

  if (input.predictiveInsights.totalSnapshots === 0) {
    alerts.push({
      actionRequired: true,
      key: 'PREDICTIVE_SNAPSHOT_MISSING',
      nextStep: 'Gerar ao menos um snapshot valido de demanda antes de tratar o bloco como rotina operacional.',
      severity: 'WARNING',
      source: 'PREDICTIVE_INSIGHTS',
      summary:
        'Nenhum snapshot preditivo foi persistido ainda para o primeiro corte da demanda de agenda.',
      title: 'Sem snapshot preditivo persistido',
    })
  }

  if (input.predictiveInsights.notUsefulFeedback > 0) {
    alerts.push({
      actionRequired: true,
      key: 'PREDICTIVE_NOT_USEFUL',
      nextStep: 'Revisar a qualidade do insight e a janela usada antes de expandir o recorte preditivo.',
      severity: 'WARNING',
      source: 'PREDICTIVE_INSIGHTS',
      summary: `${input.predictiveInsights.notUsefulFeedback} snapshots receberam retorno de baixa utilidade operacional.`,
      title: 'Insight preditivo marcado como nao util',
    })
  }

  if (input.predictiveInsights.pendingFeedback > 0) {
    alerts.push({
      actionRequired: false,
      key: 'PREDICTIVE_PENDING_FEEDBACK',
      nextStep: 'Registrar retorno operacional dos snapshots ja gerados para melhorar a trilha de utilidade minima.',
      severity: 'INFO',
      source: 'PREDICTIVE_INSIGHTS',
      summary: `${input.predictiveInsights.pendingFeedback} snapshots continuam sem retorno do operador.`,
      title: 'Feedback preditivo pendente',
    })
  }

  if (input.multiUnit.access.failClosed) {
    alerts.push({
      actionRequired: true,
      key: 'MULTIUNIT_SESSION_UNRESOLVED',
      nextStep: 'Corrigir o contexto de unidade da sessao antes de usar o diagnostico como referencia administrativa.',
      severity: 'ERROR',
      source: 'MULTIUNIT',
      summary:
        'O diagnostico multiunidade caiu em fail-closed e nao conseguiu resolver contexto administrativo valido.',
      title: 'Sessao multiunidade sem contexto resolvido',
    })
  }

  if (
    input.audit.fallbackEventsLast30Days > 0 ||
    [imageModule, predictiveModule].some(
      (module) =>
        module?.current.fallbackStatus === 'NOT_CONFIGURED' ||
        module?.current.fallbackStatus === 'DECLARED',
    )
  ) {
    alerts.push({
      actionRequired: false,
      key: 'FALLBACK_CONCEPTUAL_ONLY',
      nextStep: 'Manter o fallback documentado e tratar qualquer fallback real como passo posterior, nao como baseline atual.',
      severity: 'INFO',
      source: 'FALLBACK',
      summary:
        'A Fase 3 continua com fallback conceitual e auditavel, sem troca real entre vendors ou automacao de recovery.',
      title: 'Fallback segue conceitual na baseline',
    })
  }

  return alerts
}

async function buildImageAnalysisSummary(): Promise<Phase3GovernanceImageSummary> {
  const [
    totalSnapshots,
    blockedExecutions,
    failedExecutions,
    pendingHumanReview,
    approvedReviews,
    rejectedReviews,
    latestCreated,
    latestReviewed,
  ] = await Promise.all([
    prisma.imageAnalysis.count(),
    prisma.imageAnalysis.count({
      where: {
        executionStatus: 'BLOCKED',
      },
    }),
    prisma.imageAnalysis.count({
      where: {
        executionStatus: 'FAILED',
      },
    }),
    prisma.imageAnalysis.count({
      where: {
        reviewStatus: 'PENDING_REVIEW',
      },
    }),
    prisma.imageAnalysis.count({
      where: {
        reviewStatus: 'APPROVED',
      },
    }),
    prisma.imageAnalysis.count({
      where: {
        reviewStatus: 'REJECTED',
      },
    }),
    prisma.imageAnalysis.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.imageAnalysis.findFirst({
      where: {
        reviewedAt: {
          not: null,
        },
      },
      orderBy: {
        reviewedAt: 'desc',
      },
      select: {
        reviewedAt: true,
      },
    }),
  ])

  return {
    approvedReviews,
    blockedExecutions,
    failedExecutions,
    latestCreatedAt: latestCreated?.createdAt ?? null,
    latestReviewedAt: latestReviewed?.reviewedAt ?? null,
    pendingHumanReview,
    rejectedReviews,
    totalSnapshots,
  }
}

async function buildPredictiveInsightSummary(): Promise<Phase3GovernancePredictiveSummary> {
  const [
    totalSnapshots,
    blockedExecutions,
    failedExecutions,
    pendingFeedback,
    acknowledgedFeedback,
    actionPlannedFeedback,
    notUsefulFeedback,
    latestSnapshot,
    latestFeedback,
  ] = await Promise.all([
    prisma.predictiveInsightSnapshot.count(),
    prisma.predictiveInsightSnapshot.count({
      where: {
        executionStatus: 'BLOCKED',
      },
    }),
    prisma.predictiveInsightSnapshot.count({
      where: {
        executionStatus: 'FAILED',
      },
    }),
    prisma.predictiveInsightSnapshot.count({
      where: {
        feedbackStatus: 'PENDING',
      },
    }),
    prisma.predictiveInsightSnapshot.count({
      where: {
        feedbackStatus: 'ACKNOWLEDGED',
      },
    }),
    prisma.predictiveInsightSnapshot.count({
      where: {
        feedbackStatus: 'ACTION_PLANNED',
      },
    }),
    prisma.predictiveInsightSnapshot.count({
      where: {
        feedbackStatus: 'NOT_USEFUL',
      },
    }),
    prisma.predictiveInsightSnapshot.findFirst({
      orderBy: {
        snapshotDate: 'desc',
      },
      select: {
        snapshotDate: true,
      },
    }),
    prisma.predictiveInsightSnapshot.findFirst({
      where: {
        feedbackAt: {
          not: null,
        },
      },
      orderBy: {
        feedbackAt: 'desc',
      },
      select: {
        feedbackAt: true,
      },
    }),
  ])

  return {
    acknowledgedFeedback,
    actionPlannedFeedback,
    blockedExecutions,
    failedExecutions,
    latestFeedbackAt: latestFeedback?.feedbackAt ?? null,
    latestSnapshotDate: latestSnapshot?.snapshotDate ?? null,
    notUsefulFeedback,
    pendingFeedback,
    totalSnapshots,
  }
}

async function buildAuditSummary(
  recentWindowStart: Date,
): Promise<Phase3GovernanceAuditSummary> {
  const [
    aiExecutionEventsLast30Days,
    fallbackEventsLast30Days,
    humanDecisionEventsLast30Days,
    imageAuditEventsLast30Days,
    predictiveAuditEventsLast30Days,
    lastAiAudit,
    lastImageAudit,
    lastPredictiveAudit,
  ] = await Promise.all([
    prisma.auditLog.count({
      where: {
        action: {
          startsWith: 'ai.',
        },
        occurredAt: {
          gte: recentWindowStart,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: 'ai.fallback.evaluated',
        occurredAt: {
          gte: recentWindowStart,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: 'ai.decision.recorded',
        occurredAt: {
          gte: recentWindowStart,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: {
          in: ['image_analysis.create', 'image_analysis.review'],
        },
        occurredAt: {
          gte: recentWindowStart,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: {
          in: [
            'predictive_insight.snapshot.generated',
            'predictive_insight.feedback.recorded',
          ],
        },
        occurredAt: {
          gte: recentWindowStart,
        },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: {
          startsWith: 'ai.',
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      select: {
        occurredAt: true,
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: {
          in: ['image_analysis.create', 'image_analysis.review'],
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      select: {
        occurredAt: true,
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        action: {
          in: [
            'predictive_insight.snapshot.generated',
            'predictive_insight.feedback.recorded',
          ],
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      select: {
        occurredAt: true,
      },
    }),
  ])

  return {
    aiExecutionEventsLast30Days,
    fallbackEventsLast30Days,
    humanDecisionEventsLast30Days,
    imageAuditEventsLast30Days,
    lastAiAuditAt: lastAiAudit?.occurredAt ?? null,
    lastImageAuditAt: lastImageAudit?.occurredAt ?? null,
    lastPredictiveAuditAt: lastPredictiveAudit?.occurredAt ?? null,
    predictiveAuditEventsLast30Days,
  }
}

export async function getPhase3GovernanceSnapshot(
  actor: AuthenticatedUserData,
  options: GetPhase3GovernanceSnapshotOptions = {},
): Promise<Phase3GovernanceSnapshot> {
  const foundation = getAiFoundationDiagnostics(actor, {
    environment: getCurrentAiQuotaEnvironment(),
  })
  const multiUnit = getMultiUnitFoundationDiagnostics(actor)
  const recentWindowStart = subtractDays(options.now ?? new Date(), 30)
  const [imageAnalysis, predictiveInsights, audit] = await Promise.all([
    buildImageAnalysisSummary(),
    buildPredictiveInsightSummary(),
    buildAuditSummary(recentWindowStart),
  ])
  const alerts = buildAlerts({
    audit,
    foundation,
    imageAnalysis,
    multiUnit,
    predictiveInsights,
  })

  return {
    alerts,
    audit,
    currentState: {
      failClosed: true,
      globalFlagStatus: findFlagStatus(foundation, 'ai.enabled'),
      imageFlagStatus: findFlagStatus(foundation, 'ai.imageAnalysis.enabled'),
      modules: createModuleSummaries(foundation),
      multiUnitFailClosed: multiUnit.access.failClosed,
      multiUnitSessionStatus: multiUnit.session.status,
      predictiveFlagStatus: findFlagStatus(
        foundation,
        'ai.predictiveInsights.enabled',
      ),
    },
    foundationGeneratedAt: foundation.generatedAt,
    generatedAt: options.now ?? new Date(),
    imageAnalysis,
    phase: createPhaseSummary(alerts),
    predictiveInsights,
  }
}
