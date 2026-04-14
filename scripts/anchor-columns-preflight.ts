import {
  buildAnchorColumnsPreflightReport,
  disconnectPrisma,
  formatAnchorColumnsStage1MissingMessage,
  isAnchorColumnsStage1MissingError,
  loadEnvironment,
  printAnchorColumnsPreflightSummary,
} from './anchor-columns-ops'

interface CommandOptions {
  assertClean: boolean
  envFile?: string
  json: boolean
}

function parseOptions(argv: string[]): CommandOptions {
  const options: CommandOptions = {
    assertClean: false,
    json: false,
  }

  for (const argument of argv) {
    if (argument === '--assert-clean') {
      options.assertClean = true
      continue
    }

    if (argument === '--json') {
      options.json = true
      continue
    }

    if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length)
      continue
    }

    throw new Error(`Unsupported argument: ${argument}`)
  }

  return options
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const loadedEnvironment = loadEnvironment(options.envFile)

  try {
    const result = await buildAnchorColumnsPreflightReport()

    if (options.json) {
      console.log(JSON.stringify({
        loadedEnvironment,
        ...result,
      }, null, 2))
    } else {
      printAnchorColumnsPreflightSummary(loadedEnvironment, result)
    }

    if (options.assertClean && !result.readyForUnique) {
      process.exitCode = 1
    }
  } catch (error) {
    if (isAnchorColumnsStage1MissingError(error)) {
      const message = formatAnchorColumnsStage1MissingMessage(loadedEnvironment)

      if (options.json) {
        console.log(JSON.stringify({
          loadedEnvironment,
          status: 'NO_GO',
          readyForBackfill: false,
          readyForUnique: false,
          reason: 'STAGE1_SCHEMA_MISSING',
          message,
        }, null, 2))
      } else {
        console.error(`[no-go] ${message}`)
      }

      process.exitCode = 1
      return
    }

    throw error
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma()
  })
