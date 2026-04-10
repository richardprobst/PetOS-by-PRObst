import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { getPhase3GovernanceSnapshot } from '../../features/phase3/governance'
import type { AuthenticatedUserData } from '../../server/auth/types'
import { prisma } from '../../server/db/prisma'
import { AppError } from '../../server/http/errors'

const restorers: Array<() => void> = []

const phase3Operator: AuthenticatedUserData = {
  active: true,
  email: 'phase3.governance@petos.app',
  id: 'user_phase3_governance',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Phase 3 Governance Operator',
  permissions: ['sistema.update.operar'],
  profiles: ['Administrador'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

function createSchemaCompatibilityError(code: 'P2021' | 'P2022' = 'P2021') {
  return Object.assign(new Error('Schema compatibility error'), { code })
}

async function withAiEnvironment(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<void>,
) {
  const previous = {
    AI_ENABLED: process.env.AI_ENABLED,
    AI_IMAGE_ANALYSIS_BASE_QUOTA: process.env.AI_IMAGE_ANALYSIS_BASE_QUOTA,
    AI_IMAGE_ANALYSIS_ENABLED: process.env.AI_IMAGE_ANALYSIS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_BASE_QUOTA:
      process.env.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
    AI_PREDICTIVE_INSIGHTS_ENABLED:
      process.env.AI_PREDICTIVE_INSIGHTS_ENABLED,
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    await callback()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

function installGovernancePrismaStubs(overrides?: {
  audit?: Partial<{
    aiExecutionEventsLast30Days: number
    fallbackEventsLast30Days: number
    humanDecisionEventsLast30Days: number
    imageAuditEventsLast30Days: number
    lastAiAuditAt: Date | null
    lastImageAuditAt: Date | null
    lastPredictiveAuditAt: Date | null
    predictiveAuditEventsLast30Days: number
  }>
  image?: Partial<{
    approvedReviews: number
    blockedExecutions: number
    failedExecutions: number
    latestCreatedAt: Date | null
    latestReviewedAt: Date | null
    pendingHumanReview: number
    rejectedReviews: number
    totalSnapshots: number
  }>
  predictive?: Partial<{
    acknowledgedFeedback: number
    actionPlannedFeedback: number
    blockedExecutions: number
    failedExecutions: number
    latestFeedbackAt: Date | null
    latestSnapshotDate: Date | null
    notUsefulFeedback: number
    pendingFeedback: number
    totalSnapshots: number
  }>
}) {
  const image = {
    approvedReviews: 1,
    blockedExecutions: 1,
    failedExecutions: 1,
    latestCreatedAt: new Date('2026-04-09T11:00:00.000Z'),
    latestReviewedAt: new Date('2026-04-09T12:00:00.000Z'),
    pendingHumanReview: 2,
    rejectedReviews: 1,
    totalSnapshots: 6,
    ...overrides?.image,
  }

  const predictive = {
    acknowledgedFeedback: 1,
    actionPlannedFeedback: 2,
    blockedExecutions: 0,
    failedExecutions: 1,
    latestFeedbackAt: new Date('2026-04-09T13:00:00.000Z'),
    latestSnapshotDate: new Date('2026-04-09T00:00:00.000Z'),
    notUsefulFeedback: 1,
    pendingFeedback: 2,
    totalSnapshots: 5,
    ...overrides?.predictive,
  }

  const audit = {
    aiExecutionEventsLast30Days: 10,
    fallbackEventsLast30Days: 1,
    humanDecisionEventsLast30Days: 2,
    imageAuditEventsLast30Days: 4,
    lastAiAuditAt: new Date('2026-04-09T14:00:00.000Z'),
    lastImageAuditAt: new Date('2026-04-09T12:00:00.000Z'),
    lastPredictiveAuditAt: new Date('2026-04-09T13:00:00.000Z'),
    predictiveAuditEventsLast30Days: 3,
    ...overrides?.audit,
  }

  replaceMethod(prisma as object, 'imageAnalysis', {
    count: async ({ where }: any = {}) => {
      if (!where) {
        return image.totalSnapshots
      }

      if (where.executionStatus === 'BLOCKED') {
        return image.blockedExecutions
      }

      if (where.executionStatus === 'FAILED') {
        return image.failedExecutions
      }

      if (where.reviewStatus === 'PENDING_REVIEW') {
        return image.pendingHumanReview
      }

      if (where.reviewStatus === 'APPROVED') {
        return image.approvedReviews
      }

      if (where.reviewStatus === 'REJECTED') {
        return image.rejectedReviews
      }

      return image.totalSnapshots
    },
    findFirst: async ({ where }: any = {}) => {
      if (where?.reviewedAt) {
        return image.latestReviewedAt
          ? { reviewedAt: image.latestReviewedAt }
          : null
      }

      return image.latestCreatedAt ? { createdAt: image.latestCreatedAt } : null
    },
  })

  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    count: async ({ where }: any = {}) => {
      if (!where) {
        return predictive.totalSnapshots
      }

      if (where.executionStatus === 'BLOCKED') {
        return predictive.blockedExecutions
      }

      if (where.executionStatus === 'FAILED') {
        return predictive.failedExecutions
      }

      if (where.feedbackStatus === 'PENDING') {
        return predictive.pendingFeedback
      }

      if (where.feedbackStatus === 'ACKNOWLEDGED') {
        return predictive.acknowledgedFeedback
      }

      if (where.feedbackStatus === 'ACTION_PLANNED') {
        return predictive.actionPlannedFeedback
      }

      if (where.feedbackStatus === 'NOT_USEFUL') {
        return predictive.notUsefulFeedback
      }

      return predictive.totalSnapshots
    },
    findFirst: async ({ where }: any = {}) => {
      if (where?.feedbackAt) {
        return predictive.latestFeedbackAt
          ? { feedbackAt: predictive.latestFeedbackAt }
          : null
      }

      return predictive.latestSnapshotDate
        ? { snapshotDate: predictive.latestSnapshotDate }
        : null
    },
  })

  replaceMethod(prisma as object, 'auditLog', {
    count: async ({ where }: any = {}) => {
      if (where?.action?.startsWith === 'ai.') {
        return audit.aiExecutionEventsLast30Days
      }

      if (where?.action === 'ai.fallback.evaluated') {
        return audit.fallbackEventsLast30Days
      }

      if (where?.action === 'ai.decision.recorded') {
        return audit.humanDecisionEventsLast30Days
      }

      if (
        Array.isArray(where?.action?.in) &&
        where.action.in.includes('image_analysis.create')
      ) {
        return audit.imageAuditEventsLast30Days
      }

      if (
        Array.isArray(where?.action?.in) &&
        where.action.in.includes('predictive_insight.snapshot.generated')
      ) {
        return audit.predictiveAuditEventsLast30Days
      }

      return 0
    },
    findFirst: async ({ where }: any = {}) => {
      if (where?.action?.startsWith === 'ai.') {
        return audit.lastAiAuditAt ? { occurredAt: audit.lastAiAuditAt } : null
      }

      if (
        Array.isArray(where?.action?.in) &&
        where.action.in.includes('image_analysis.create')
      ) {
        return audit.lastImageAuditAt
          ? { occurredAt: audit.lastImageAuditAt }
          : null
      }

      if (
        Array.isArray(where?.action?.in) &&
        where.action.in.includes('predictive_insight.snapshot.generated')
      ) {
        return audit.lastPredictiveAuditAt
          ? { occurredAt: audit.lastPredictiveAuditAt }
          : null
      }

      return null
    },
  })
}

test('getPhase3GovernanceSnapshot enforces the same high system permission used by the phase 3 diagnostics', async () => {
  installGovernancePrismaStubs()

  await assert.rejects(
    () =>
      withAiEnvironment(
        {
          AI_ENABLED: 'true',
          AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
          AI_IMAGE_ANALYSIS_ENABLED: 'true',
          AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
          AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
        },
        async () => {
          await getPhase3GovernanceSnapshot({
            ...phase3Operator,
            permissions: ['agendamento.visualizar'],
          })
        },
      ),
    (error) => error instanceof AppError && error.status === 403,
  )
})

test('getPhase3GovernanceSnapshot consolidates observability and governance signals for the phase baseline', async () => {
  installGovernancePrismaStubs()

  await withAiEnvironment(
    {
      AI_ENABLED: 'true',
      AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
      AI_IMAGE_ANALYSIS_ENABLED: 'true',
      AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
      AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
    },
    async () => {
      const snapshot = await getPhase3GovernanceSnapshot(phase3Operator, {
        now: new Date('2026-04-09T15:00:00.000Z'),
      })
      const alertKeys = new Set(snapshot.alerts.map((alert) => alert.key))

      assert.deepEqual(snapshot.phase.completedBlocks, [
        'BLOCK1',
        'BLOCK2',
        'BLOCK3',
        'BLOCK4',
      ])
      assert.equal(snapshot.phase.currentBlock, 'BLOCK5')
      assert.equal(snapshot.phase.status, 'READY_WITH_GUARDRAILS')
      assert.equal(snapshot.currentState.globalFlagStatus, 'ENABLED')
      assert.equal(snapshot.currentState.multiUnitSessionStatus, 'RESOLVED')
      assert.equal(snapshot.imageAnalysis.pendingHumanReview, 2)
      assert.equal(snapshot.predictiveInsights.actionPlannedFeedback, 2)
      assert.equal(snapshot.audit.aiExecutionEventsLast30Days, 10)
      assert.equal(alertKeys.has('IMAGE_REVIEW_BACKLOG'), true)
      assert.equal(alertKeys.has('PREDICTIVE_NOT_USEFUL'), true)
      assert.equal(alertKeys.has('FALLBACK_CONCEPTUAL_ONLY'), true)
    },
  )
})

test('getPhase3GovernanceSnapshot reflects fail-closed governance when AI flags are missing', async () => {
  installGovernancePrismaStubs({
    audit: {
      aiExecutionEventsLast30Days: 0,
      fallbackEventsLast30Days: 0,
      humanDecisionEventsLast30Days: 0,
      imageAuditEventsLast30Days: 0,
      lastAiAuditAt: null,
      lastImageAuditAt: null,
      lastPredictiveAuditAt: null,
      predictiveAuditEventsLast30Days: 0,
    },
    image: {
      approvedReviews: 0,
      blockedExecutions: 0,
      failedExecutions: 0,
      latestCreatedAt: null,
      latestReviewedAt: null,
      pendingHumanReview: 0,
      rejectedReviews: 0,
      totalSnapshots: 0,
    },
    predictive: {
      acknowledgedFeedback: 0,
      actionPlannedFeedback: 0,
      blockedExecutions: 0,
      failedExecutions: 0,
      latestFeedbackAt: null,
      latestSnapshotDate: null,
      notUsefulFeedback: 0,
      pendingFeedback: 0,
      totalSnapshots: 0,
    },
  })

  await withAiEnvironment(
    {
      AI_ENABLED: undefined,
      AI_IMAGE_ANALYSIS_BASE_QUOTA: undefined,
      AI_IMAGE_ANALYSIS_ENABLED: undefined,
      AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: undefined,
      AI_PREDICTIVE_INSIGHTS_ENABLED: undefined,
    },
    async () => {
      const snapshot = await getPhase3GovernanceSnapshot(phase3Operator, {
        now: new Date('2026-04-09T15:00:00.000Z'),
      })

      assert.equal(snapshot.phase.status, 'ATTENTION_REQUIRED')
      assert.equal(snapshot.currentState.globalFlagStatus, 'MISSING')
      assert.equal(
        snapshot.alerts.some((alert) => alert.key === 'AI_GLOBAL_FAIL_CLOSED'),
        true,
      )
      assert.equal(
        snapshot.alerts.some(
          (alert) => alert.key === 'PREDICTIVE_SNAPSHOT_MISSING',
        ),
        true,
      )
    },
  )
})

test('getPhase3GovernanceSnapshot surfaces migration-pending storage as an explicit governance alert instead of crashing', async () => {
  replaceMethod(prisma as object, 'imageAnalysis', {
    count: async () => {
      throw createSchemaCompatibilityError()
    },
    findFirst: async () => {
      throw createSchemaCompatibilityError()
    },
  })

  replaceMethod(prisma as object, 'predictiveInsightSnapshot', {
    count: async () => {
      throw createSchemaCompatibilityError()
    },
    findFirst: async () => {
      throw createSchemaCompatibilityError()
    },
  })

  replaceMethod(prisma as object, 'auditLog', {
    count: async () => 0,
    findFirst: async () => null,
  })

  await withAiEnvironment(
    {
      AI_ENABLED: 'true',
      AI_IMAGE_ANALYSIS_BASE_QUOTA: '10',
      AI_IMAGE_ANALYSIS_ENABLED: 'true',
      AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: '5',
      AI_PREDICTIVE_INSIGHTS_ENABLED: 'true',
    },
    async () => {
      const snapshot = await getPhase3GovernanceSnapshot(phase3Operator, {
        now: new Date('2026-04-09T15:00:00.000Z'),
      })
      const alertKeys = new Set(snapshot.alerts.map((alert) => alert.key))

      assert.equal(snapshot.imageAnalysis.storageStatus, 'MIGRATION_PENDING')
      assert.equal(snapshot.predictiveInsights.storageStatus, 'MIGRATION_PENDING')
      assert.equal(snapshot.phase.status, 'ATTENTION_REQUIRED')
      assert.equal(alertKeys.has('IMAGE_STORAGE_UNAVAILABLE'), true)
      assert.equal(alertKeys.has('PREDICTIVE_STORAGE_UNAVAILABLE'), true)
      assert.equal(alertKeys.has('PREDICTIVE_SNAPSHOT_MISSING'), false)
    },
  )
})
