import { NextResponse } from 'next/server'
import { prisma } from '../../../server/db/prisma'
import { getEnv } from '../../../server/env'
import { collectDatabaseReadinessChecks } from '../../../server/readiness/database'
import { collectOperationalHealthSnapshot } from '../../../server/readiness/health'
import { collectSystemRuntimeSnapshot } from '../../../server/system/runtime-state'
import { deployFingerprint } from '../../../server/system/deploy-fingerprint'
import { logError, logWarn } from '../../../server/observability/logger'
import { buildHttpRequestContext, resolveRequestId } from '../../../server/observability/request'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'cache-control': 'no-store',
} as const

export async function GET(request: Request) {
  const requestId = resolveRequestId(request)
  const snapshot = await collectOperationalHealthSnapshot({
    databaseCollector: () => collectDatabaseReadinessChecks(prisma),
    environmentLoader: getEnv,
    runtimeCollector: (environment) =>
      collectSystemRuntimeSnapshot(prisma, environment),
  })

  if (snapshot.failureStage) {
    logError('Operational health check failed unexpectedly.', {
      requestId,
      ...buildHttpRequestContext(request),
      failureStage: snapshot.failureStage,
    })
  } else if (snapshot.status !== 'ok') {
    logWarn('Operational health check is degraded.', {
      requestId,
      ...buildHttpRequestContext(request),
      checks: snapshot.checks,
    })
  }

  return NextResponse.json(
    {
      checks: snapshot.checks,
      deployment: deployFingerprint,
      ...(snapshot.lifecycle ? { lifecycle: snapshot.lifecycle } : {}),
      requestId,
      ...(snapshot.service ? { service: snapshot.service } : {}),
      status: snapshot.status,
    },
    {
      headers: {
        ...noStoreHeaders,
        'x-petos-deploy-fingerprint': deployFingerprint.id,
        'x-request-id': requestId,
      },
      status: snapshot.status === 'ok' ? 200 : 503,
    },
  )
}
