const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { loadEnvConfig } = require('@next/env')
const {
  ensurePrismaQueryCompilerArtifact,
} = require('./server/db/prisma-query-compiler.js')

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function loadRuntimeEnvFile(
  filePath,
  targetEnv = process.env,
  options = { overrideExisting: false },
) {
  if (!fs.existsSync(filePath)) {
    return false
  }

  const content = fs.readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const withoutExport = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed
    const separatorIndex = withoutExport.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const key = withoutExport.slice(0, separatorIndex).trim()
    const rawValue = withoutExport.slice(separatorIndex + 1).trim()

    if (!key) {
      continue
    }

    if (!options.overrideExisting && targetEnv[key] !== undefined) {
      continue
    }

    targetEnv[key] = stripWrappingQuotes(rawValue)
  }

  return true
}

function resolveRuntimeEnvCandidates(projectRoot = __dirname) {
  return [
    path.join(projectRoot, '.builds', 'config', '.env'),
    path.join(projectRoot, '..', 'public_html', '.builds', 'config', '.env'),
  ]
}

function resolveNextRuntimeEnvCandidates(projectRoot = __dirname) {
  return [
    path.join(projectRoot, '.env.production.local'),
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env.production'),
    path.join(projectRoot, '.env'),
  ]
}

function bootstrapRuntimeEnvironment(projectRoot = __dirname, targetEnv = process.env) {
  process.chdir(projectRoot)

  for (const candidate of resolveRuntimeEnvCandidates(projectRoot)) {
    loadRuntimeEnvFile(candidate, targetEnv, {
      overrideExisting: true,
    })
  }

  loadEnvConfig(projectRoot, false, undefined, true)

  if (targetEnv !== process.env) {
    for (const candidate of resolveNextRuntimeEnvCandidates(projectRoot)) {
      loadRuntimeEnvFile(candidate, targetEnv)
    }
  }

  if (!targetEnv.NODE_ENV) {
    targetEnv.NODE_ENV = 'production'
  }

  if (!targetEnv.PORT) {
    targetEnv.PORT = '3000'
  }

  if (!targetEnv.HOSTNAME) {
    targetEnv.HOSTNAME = '0.0.0.0'
  }

  return targetEnv
}

function resolveRuntimeEntrypoint(projectRoot = __dirname) {
  const candidates = [
    path.join(projectRoot, 'server-standalone.js'),
    path.join(projectRoot, '.next', 'standalone', 'server.js'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    'PetOS runtime bootstrap could not find a standalone entrypoint. Build the app before starting the server.',
  )
}

function attachRuntimeChildLifecycle(
  child,
  processRef = process,
  options = { forwardSignals: true },
) {
  if (options.forwardSignals) {
    const forwardSignal = (signal) => {
      if (!child.killed) {
        child.kill(signal)
      }
    }

    for (const signal of ['SIGINT', 'SIGTERM']) {
      processRef.once(signal, () => forwardSignal(signal))
    }
  }

  child.on('exit', (code, signal) => {
    if (signal) {
      processRef.kill(processRef.pid, signal)
      return
    }

    processRef.exit(code ?? 0)
  })

  return child
}

function startRuntime(
  projectRoot = __dirname,
  targetEnv = process.env,
  options = {},
) {
  const spawnProcess = options.spawnProcess ?? spawn
  const ensureCompilerArtifact =
    options.ensureCompilerArtifact ?? ensurePrismaQueryCompilerArtifact
  const resolveEntrypoint =
    options.resolveEntrypoint ?? resolveRuntimeEntrypoint
  const processRef = options.processRef ?? process
  const attachLifecycleHandlers = options.attachLifecycleHandlers ?? true
  const originalCwd = process.cwd()

  try {
    bootstrapRuntimeEnvironment(projectRoot, targetEnv)
  } finally {
    process.chdir(originalCwd)
  }

  ensureCompilerArtifact(projectRoot)
  const runtimeEntrypoint = resolveEntrypoint(projectRoot)
  const child = spawnProcess(processRef.execPath, [runtimeEntrypoint], {
    cwd: projectRoot,
    env: targetEnv,
    stdio: 'inherit',
  })

  if (attachLifecycleHandlers) {
    attachRuntimeChildLifecycle(child, processRef)
  }

  return child
}

if (require.main === module) {
  startRuntime()
}

module.exports = {
  bootstrapRuntimeEnvironment,
  attachRuntimeChildLifecycle,
  loadRuntimeEnvFile,
  resolveRuntimeEntrypoint,
  resolveRuntimeEnvCandidates,
  resolveNextRuntimeEnvCandidates,
  startRuntime,
  stripWrappingQuotes,
}
