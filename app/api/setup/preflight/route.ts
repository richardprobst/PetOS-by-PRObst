import { ok, routeErrorResponse } from '@/server/http/responses'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { collectInstallerPreflightSnapshot } from '@/server/readiness/installer'
import { assertInstallerPreflightAccess } from '@/server/system/runtime-state'

const noStoreHeaders = {
  'cache-control': 'no-store',
} as const

export async function GET(request: Request) {
  try {
    const environment = getEnv()
    assertInstallerPreflightAccess(request, environment)

    return ok(await collectInstallerPreflightSnapshot(prisma, environment), {
      headers: noStoreHeaders,
    })
  } catch (error) {
    return routeErrorResponse(error, { operation: 'setup.preflight', request }, { headers: noStoreHeaders })
  }
}
