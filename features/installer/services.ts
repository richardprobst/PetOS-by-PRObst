import type { PrismaClient } from '@prisma/client'
import type { Environment } from '@/server/env'
import { writeAuditLog } from '@/server/audit/logging'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import { collectInstallerPreflightSnapshot } from '@/server/readiness/installer'
import { bootstrapCorePetOS } from '@/server/system/bootstrap-core'
import { runPrismaMigrateDeploy } from '@/server/system/prisma-runtime'
import { upsertSystemRuntimeState } from '@/server/system/runtime-state'
import { getBuildVersion } from '@/server/system/version'
import type { InstallerDraftSummary } from './action-state'
import type { InstallerSetupDraftInput } from './schemas'

type InstallerServicesDatabaseClient = Pick<
  PrismaClient,
  | '$queryRaw'
  | '$queryRawUnsafe'
  | 'accessProfile'
  | 'auditLog'
  | 'client'
  | 'clientCommunicationPreference'
  | 'messageTemplate'
  | 'operationalStatus'
  | 'permission'
  | 'profilePermission'
  | 'systemRuntimeState'
  | 'unit'
  | 'unitSetting'
  | 'user'
  | 'userProfile'
  | '$transaction'
>

export interface InstallerFinalizeResult {
  adminEmail: string
  unitName: string
  version: string
}

function normalizeOptionalValue(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function resolveDatabaseHostLabel(connectionString: string) {
  try {
    return new URL(connectionString).host
  } catch {
    return 'invalid-database-url'
  }
}

function describeStorageMode(environment: Environment) {
  if (environment.STORAGE_ACCESS_KEY && environment.STORAGE_SECRET_KEY) {
    return `Storage protegido configurado em ${environment.STORAGE_BUCKET}/${environment.STORAGE_REGION}`
  }

  if (environment.STORAGE_PUBLIC_BASE_URL) {
    return `Storage com base publica configurada em ${environment.STORAGE_PUBLIC_BASE_URL}`
  }

  return 'Storage ainda depende apenas do contrato base do ambiente'
}

function describeEmailMode(environment: Environment) {
  if (environment.EMAIL_PROVIDER) {
    return `Provider ${environment.EMAIL_PROVIDER} configurado`
  }

  if (environment.SMTP_HOST) {
    return `SMTP configurado em ${environment.SMTP_HOST}:${environment.SMTP_PORT}`
  }

  return 'E-mail transacional ainda nao configurado'
}

export function buildInstallerDraftSummary(
  input: InstallerSetupDraftInput,
  environment: Environment = getEnv(),
): InstallerDraftSummary {
  const warnings: string[] = []

  if (!environment.STORAGE_ACCESS_KEY && !environment.STORAGE_PUBLIC_BASE_URL) {
    warnings.push(
      'Storage externo ainda nao parece completamente configurado no ambiente. O finalize deve bloquear binarios sensiveis se isso continuar pendente.',
    )
  }

  if (!environment.EMAIL_PROVIDER && !environment.SMTP_HOST) {
    warnings.push(
      'Envio transacional de e-mail ainda nao esta configurado. Isso pode ser feito depois da instalacao inicial.',
    )
  }

  if (!environment.FISCAL_PROVIDER) {
    warnings.push(
      'Integracao fiscal segue opcional neste momento e pode permanecer desabilitada na instalacao inicial.',
    )
  }

  return {
    admin: {
      email: input.adminEmail.trim().toLowerCase(),
      name: input.adminName.trim(),
    },
    environment: {
      appUrl: environment.APP_URL,
      databaseHost: resolveDatabaseHostLabel(environment.DATABASE_URL),
      emailMode: describeEmailMode(environment),
      nextAuthUrl: environment.NEXTAUTH_URL,
      storageMode: describeStorageMode(environment),
    },
    organization: {
      companyName: input.companyName.trim(),
      unitEmail: normalizeOptionalValue(input.unitEmail),
      unitName: input.unitName.trim(),
      unitPhone: normalizeOptionalValue(input.unitPhone),
      unitTimezone: input.unitTimezone.trim(),
    },
    warnings,
  }
}

export async function validateInstallerSetupDraft(
  prisma: InstallerServicesDatabaseClient,
  input: InstallerSetupDraftInput,
  environment: Environment = getEnv(),
) {
  const preflight = await collectInstallerPreflightSnapshot(prisma, environment)

  if (!preflight.canProceed) {
    throw new AppError(
      'CONFLICT',
      409,
      'Installer preflight is not ready. Resolve the blocked diagnostics before reviewing the setup draft.',
    )
  }

  const normalizedEmail = input.adminEmail.trim().toLowerCase()
  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  })

  if (existingUser) {
    throw new AppError(
      'CONFLICT',
      409,
      'Ja existe um usuario com esse e-mail administrativo nesta base. Use outro e-mail ou revise o ambiente antes de instalar.',
    )
  }

  return buildInstallerDraftSummary(input, environment)
}

export async function finalizeInstallerSetup(
  prisma: InstallerServicesDatabaseClient,
  input: InstallerSetupDraftInput,
  environment: Environment = getEnv(),
): Promise<InstallerFinalizeResult> {
  const installationSummary = await validateInstallerSetupDraft(prisma, input, environment)
  const preflight = await collectInstallerPreflightSnapshot(prisma, environment)

  if (!preflight.canProceed || preflight.runtime.lifecycleState !== 'NOT_INSTALLED') {
    throw new AppError(
      'CONFLICT',
      409,
      'Installer preflight is not ready. Resolve the blocked diagnostics before finishing the setup.',
    )
  }

  if (!preflight.runtime.migrationsTableAvailable) {
    await runPrismaMigrateDeploy()
  }

  const refreshedPreflight = await collectInstallerPreflightSnapshot(prisma, environment)

  if (!refreshedPreflight.canProceed || !refreshedPreflight.runtime.migrationsTableAvailable) {
    throw new AppError(
      'CONFLICT',
      409,
      'The installer could not confirm a ready schema after migrate deploy. Review the runtime diagnostics before retrying.',
    )
  }

  const buildVersion = getBuildVersion()
  const now = new Date()

  await upsertSystemRuntimeState(prisma, {
    currentVersion: null,
    installationCompletedAt: null,
    installerLockedAt: null,
    lifecycleState: 'INSTALLING',
    previousVersion: refreshedPreflight.runtime.currentInstalledVersion,
  })

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const { adminUser, unit } = await bootstrapCorePetOS(transaction, environment, {
        admin: {
          email: input.adminEmail,
          name: input.adminName,
          password: input.adminPassword,
        },
        unit: {
          companyName: input.companyName,
          unitEmail: input.unitEmail,
          unitName: input.unitName,
          unitPhone: input.unitPhone,
          unitTimezone: input.unitTimezone,
        },
      })

      if (!adminUser) {
        throw new AppError(
          'INTERNAL_SERVER_ERROR',
          500,
          'The installer did not produce the initial administrator user.',
        )
      }

      await upsertSystemRuntimeState(transaction, {
        currentVersion: buildVersion,
        installationCompletedAt: now,
        installerLockedAt: now,
        lifecycleState: 'INSTALLED',
        previousVersion: refreshedPreflight.runtime.currentInstalledVersion,
        updatedByUserId: adminUser.id,
      })

      await writeAuditLog(transaction, {
        action: 'setup.installation_completed',
        details: {
          installer: {
            completedAt: now.toISOString(),
            currentVersion: buildVersion,
            source: 'integrated_setup',
          },
          summary: installationSummary,
        },
        entityId: 'default',
        entityName: 'SystemRuntimeState',
        unitId: unit.id,
        userId: adminUser.id,
      })

      return {
        adminEmail: adminUser.email,
        unitName: unit.name,
        version: buildVersion,
      } satisfies InstallerFinalizeResult
    })

    return result
  } catch (error) {
    await upsertSystemRuntimeState(prisma, {
      currentVersion: refreshedPreflight.runtime.currentInstalledVersion,
      installationCompletedAt: null,
      installerLockedAt: null,
      lifecycleState: 'INSTALL_FAILED',
      previousVersion: refreshedPreflight.runtime.currentInstalledVersion,
    }).catch(() => undefined)

    await writeAuditLog(prisma, {
      action: 'setup.installation_failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
        summary: installationSummary,
      },
      entityId: 'default',
      entityName: 'SystemRuntimeState',
      userId: null,
    }).catch(() => undefined)

    throw error
  }
}
