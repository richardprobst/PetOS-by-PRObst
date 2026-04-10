const fs = require('node:fs')
const path = require('node:path')
const { loadEnvConfig } = require('@next/env')

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function loadRuntimeEnvFile(filePath, targetEnv = process.env) {
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

    if (!key || targetEnv[key] !== undefined) {
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

function bootstrapRuntimeEnvironment(projectRoot = __dirname, targetEnv = process.env) {
  process.chdir(projectRoot)

  for (const candidate of resolveRuntimeEnvCandidates(projectRoot)) {
    loadRuntimeEnvFile(candidate, targetEnv)
  }

  loadEnvConfig(projectRoot, false)

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

function startRuntime(projectRoot = __dirname) {
  bootstrapRuntimeEnvironment(projectRoot, process.env)
  const runtimeEntrypoint = resolveRuntimeEntrypoint(projectRoot)

  require(runtimeEntrypoint)
}

if (require.main === module) {
  startRuntime()
}

module.exports = {
  bootstrapRuntimeEnvironment,
  loadRuntimeEnvFile,
  resolveRuntimeEntrypoint,
  resolveRuntimeEnvCandidates,
  startRuntime,
  stripWrappingQuotes,
}
