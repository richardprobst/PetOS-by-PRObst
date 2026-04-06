import { execFile as execFileCallback } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { AppError } from '@/server/http/errors'

const execFile = promisify(execFileCallback)

export interface PrismaRuntimeCapabilities {
  canRunMigrateDeploy: boolean
  prismaCliPath: string | null
  projectRoot: string
  reason?: string
  schemaPath: string | null
}

export function getPrismaRuntimeCapabilities(projectRoot = process.cwd()): PrismaRuntimeCapabilities {
  const prismaCliPath = join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js')
  const schemaPath = join(projectRoot, 'prisma', 'schema.prisma')

  if (!existsSync(schemaPath)) {
    return {
      canRunMigrateDeploy: false,
      prismaCliPath: null,
      projectRoot,
      reason: 'Prisma schema file was not found in this runtime.',
      schemaPath: null,
    }
  }

  if (!existsSync(prismaCliPath)) {
    return {
      canRunMigrateDeploy: false,
      prismaCliPath: null,
      projectRoot,
      reason:
        'Prisma CLI is not available in this runtime. Run prisma migrate deploy manually or ship the CLI alongside the installer runtime.',
      schemaPath,
    }
  }

  return {
    canRunMigrateDeploy: true,
    prismaCliPath,
    projectRoot,
    schemaPath,
  }
}

export async function runPrismaMigrateDeploy(
  capabilities = getPrismaRuntimeCapabilities(),
  options?: {
    operation?: string
  },
) {
  const operation = options?.operation ?? 'runtime operation'

  if (!capabilities.canRunMigrateDeploy || !capabilities.prismaCliPath || !capabilities.schemaPath) {
    throw new AppError(
      'CONFLICT',
      409,
      capabilities.reason ??
        `Runtime migrations are not available for ${operation}. Apply Prisma migrations manually before retrying.`,
    )
  }

  try {
    await execFile(
      process.execPath,
      [
        capabilities.prismaCliPath,
        'migrate',
        'deploy',
        '--schema',
        capabilities.schemaPath,
      ],
      {
        cwd: capabilities.projectRoot,
        env: process.env,
      },
    )
  } catch (error) {
    const details =
      error instanceof Error && 'stderr' in error && typeof error.stderr === 'string'
        ? error.stderr.trim()
        : undefined

    throw new AppError(
      'CONFLICT',
      409,
      `Prisma migrate deploy failed during ${operation}. Review the database connectivity and migration logs before retrying.`,
      details,
    )
  }
}
