import { NextResponse } from 'next/server'
import { prisma } from '../../../server/db/prisma'
import { getEnv } from '../../../server/env'
import {
  collectDatabaseReadinessChecks,
  deriveReadinessStatus,
} from '../../../server/readiness/database'
import { collectSystemRuntimeSnapshot } from '../../../server/system/runtime-state'
import { deployFingerprint } from '../../../server/system/deploy-fingerprint'
import { logError, logWarn, serializeErrorForLogs } from '../../../server/observability/logger'
import { buildHttpRequestContext, resolveRequestId } from '../../../server/observability/request'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'cache-control': 'no-store',
} as const

function buildRuntimeReadinessCheck(runtime: Awaited<ReturnType<typeof collectSystemRuntimeSnapshot>>) {
  if (runtime.lifecycleState === 'INSTALLED') {
    return {
      message: `System runtime is operational at version ${runtime.currentInstalledVersion ?? runtime.buildVersion}.`,
      name: 'runtime',
      status: 'ok',
    } as const
  }

  if (runtime.lifecycleState === 'NOT_INSTALLED') {
    return {
      message: 'System runtime is not installed yet. Complete the integrated setup before considering this environment healthy.',
      name: 'runtime',
      status: 'fail',
    } as const
  }

  if (runtime.lifecycleState === 'UNKNOWN') {
    return {
      message: 'System runtime could not be determined because the database runtime state is unavailable.',
      name: 'runtime',
      status: 'fail',
    } as const
  }

  return {
    message: `System runtime is currently held at ${runtime.lifecycleState}. Public traffic should stay blocked until operators finish the controlled operation.`,
    name: 'runtime',
    status: 'fail',
  } as const
}

export async function GET(request: Request) {
  const requestId = resolveRequestId(request)

  try {
    const environment = getEnv()
    const runtime = await collectSystemRuntimeSnapshot(prisma, environment)
    const checks = [
      {
        message: 'Environment parsed successfully.',
        name: 'environment',
        status: 'ok',
      } as const,
      buildRuntimeReadinessCheck(runtime),
      ...(await collectDatabaseReadinessChecks(prisma)),
    ]
    const status = deriveReadinessStatus(checks)

    if (status !== 'ok') {
      logWarn('Operational health check is degraded.', {
        requestId,
        ...buildHttpRequestContext(request),
        checks,
      })
    }

    return NextResponse.json(
      {
        checks,
        deployment: deployFingerprint,
        lifecycle: {
          currentInstalledVersion: runtime.currentInstalledVersion,
          installerEnabled: runtime.installerEnabled,
          installerLocked: runtime.installerLocked,
          maintenanceActive: runtime.maintenanceActive,
          source: runtime.lifecycleSource,
          state: runtime.lifecycleState,
        },
        service: environment.APP_NAME,
        status,
      },
      {
        headers: {
          ...noStoreHeaders,
          'x-petos-deploy-fingerprint': deployFingerprint.id,
          'x-request-id': requestId,
        },
        status: status === 'ok' ? 200 : 503,
      },
    )
  } catch (error) {
    logError('Operational health check failed unexpectedly.', {
      requestId,
      ...buildHttpRequestContext(request),
      error: serializeErrorForLogs(error),
    })

    return NextResponse.json(
      {
        checks: [
          {
            message: 'Environment variables are missing or invalid.',
            name: 'environment',
            status: 'fail',
          },
        ],
        requestId,
        status: 'degraded',
      },
      {
        headers: {
          ...noStoreHeaders,
          'x-petos-deploy-fingerprint': deployFingerprint.id,
          'x-request-id': requestId,
        },
        status: 503,
      },
    )
  }
}
