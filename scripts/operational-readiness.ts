import { loadEnvFile } from 'node:process'
import { PrismaClient } from '@prisma/client'
import { getEnv, type Environment } from '../server/env'
import { collectDatabaseReadinessChecks, deriveReadinessStatus } from '../server/readiness/database'
import { evaluateStagingEnvironment } from '../server/readiness/staging'
import { collectSystemRuntimeSnapshot } from '../server/system/runtime-state'

type ReadinessMode = 'local' | 'staging'

interface CommandOptions {
  envFile?: string
  mode: ReadinessMode
  skipDatabaseChecks: boolean
}

function tryLoadEnvFile(path: string) {
  try {
    loadEnvFile(path)
    return true
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error
    }

    return false
  }
}

function logStatus(level: 'ok' | 'warn' | 'fail', message: string) {
  const labels = {
    ok: '[ok]',
    warn: '[warn]',
    fail: '[fail]',
  } as const

  console.log(`${labels[level]} ${message}`)
}

function parseCommandOptions(argv: string[]): CommandOptions {
  const options: CommandOptions = {
    mode: 'local',
    skipDatabaseChecks: false,
  }

  for (const argument of argv) {
    if (argument === '--skip-db') {
      options.skipDatabaseChecks = true
      continue
    }

    if (argument.startsWith('--mode=')) {
      const mode = argument.slice('--mode='.length)

      if (mode === 'local' || mode === 'staging') {
        options.mode = mode
        continue
      }

      throw new Error(`Unsupported readiness mode: ${mode}`)
    }

    if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length)
      continue
    }

    throw new Error(`Unsupported argument: ${argument}`)
  }

  return options
}

function resolveEnvFiles(options: CommandOptions) {
  if (options.envFile) {
    return [options.envFile]
  }

  if (options.mode === 'staging') {
    return ['.env.staging', '.env.production', '.env']
  }

  return ['.env.local', '.env']
}

function loadEnvironmentFiles(options: CommandOptions) {
  const candidates = resolveEnvFiles(options)
  const loadedFiles: string[] = []

  for (const candidate of candidates) {
    if (tryLoadEnvFile(candidate)) {
      loadedFiles.push(candidate)
      break
    }
  }

  if (loadedFiles.length === 0 && options.envFile) {
    throw new Error(`Environment file not found: ${options.envFile}`)
  }

  return loadedFiles
}

async function main() {
  const options = parseCommandOptions(process.argv.slice(2))
  const loadedFiles = loadEnvironmentFiles(options)

  if (loadedFiles.length > 0) {
    logStatus('ok', `Loaded environment from ${loadedFiles[0]}.`)
  } else {
    logStatus('warn', 'No environment file was loaded. Falling back to process environment only.')
  }

  let environment: Environment

  try {
    environment = getEnv()
    logStatus('ok', `Environment parsed for ${environment.APP_NAME}.`)
  } catch (error) {
    logStatus('fail', 'Environment variables are missing or invalid.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  if (options.mode === 'staging') {
    const issues = evaluateStagingEnvironment(environment)

    for (const issue of issues) {
      logStatus(issue.level, issue.message)
    }

    if (issues.some((issue) => issue.level === 'fail')) {
      process.exitCode = 1
      return
    }
  }

  if (options.skipDatabaseChecks) {
    logStatus('ok', 'Database checks skipped by explicit flag.')
    return
  }

  const prisma = new PrismaClient()

  try {
    const checks = await collectDatabaseReadinessChecks(prisma)
    const runtime = await collectSystemRuntimeSnapshot(prisma, environment)

    for (const check of checks) {
      logStatus(check.status === 'fail' ? 'fail' : 'ok', check.message)
    }

    if (runtime.lifecycleState === 'UNKNOWN') {
      logStatus('warn', 'System lifecycle could not be determined because the database runtime state is unavailable.')
    } else {
      const lifecycleLogLevel =
        runtime.lifecycleState === 'INSTALLED'
          ? 'ok'
          : runtime.lifecycleState === 'NOT_INSTALLED'
            ? 'warn'
            : 'fail'

      if (lifecycleLogLevel === 'fail') {
        process.exitCode = 1
      }

      logStatus(
        lifecycleLogLevel,
        `System lifecycle detected as ${runtime.lifecycleState} (${runtime.lifecycleSource}).`,
      )
    }

    if (deriveReadinessStatus(checks) !== 'ok') {
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(async (error) => {
  logStatus('fail', 'Operational readiness check crashed unexpectedly.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
