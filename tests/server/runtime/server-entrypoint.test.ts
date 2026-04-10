import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'

const runtimeBootstrap = require('../../../server.js') as {
  bootstrapRuntimeEnvironment: (
    projectRoot?: string,
    targetEnv?: Record<string, string | undefined>,
  ) => Record<string, string | undefined>
  loadRuntimeEnvFile: (filePath: string, targetEnv?: Record<string, string | undefined>) => boolean
  resolveRuntimeEntrypoint: (projectRoot?: string) => string
  resolveRuntimeEnvCandidates: (projectRoot?: string) => string[]
  stripWrappingQuotes: (value: string) => string
}

const tempDirectories: string[] = []

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop()

    if (directory) {
      fs.rmSync(directory, {
        force: true,
        recursive: true,
      })
    }
  }
})

function createTempProjectRoot() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'petos-runtime-'))
  tempDirectories.push(projectRoot)
  return projectRoot
}

test('stripWrappingQuotes removes matching single or double quotes only', () => {
  assert.equal(runtimeBootstrap.stripWrappingQuotes('"PetOS"'), 'PetOS')
  assert.equal(runtimeBootstrap.stripWrappingQuotes("'PetOS'"), 'PetOS')
  assert.equal(runtimeBootstrap.stripWrappingQuotes('PetOS'), 'PetOS')
})

test('loadRuntimeEnvFile loads quoted values without overwriting existing environment keys', () => {
  const projectRoot = createTempProjectRoot()
  const envFile = path.join(projectRoot, 'runtime.env')
  const targetEnv: Record<string, string | undefined> = {
    APP_NAME: 'Existing App',
  }

  fs.writeFileSync(
    envFile,
    [
      "APP_NAME='PetOS Hostinger'",
      'NEXTAUTH_URL="https://petos.desi.pet"',
      'export DATABASE_URL=mysql://root:secret@127.0.0.1:3306/petos',
    ].join('\n'),
  )

  const loaded = runtimeBootstrap.loadRuntimeEnvFile(envFile, targetEnv)

  assert.equal(loaded, true)
  assert.equal(targetEnv.APP_NAME, 'Existing App')
  assert.equal(targetEnv.NEXTAUTH_URL, 'https://petos.desi.pet')
  assert.equal(targetEnv.DATABASE_URL, 'mysql://root:secret@127.0.0.1:3306/petos')
})

test('resolveRuntimeEntrypoint prefers a colocated server-standalone shim and falls back to .next output', () => {
  const projectRoot = createTempProjectRoot()
  const colocatedEntrypoint = path.join(projectRoot, 'server-standalone.js')
  const standaloneEntrypoint = path.join(projectRoot, '.next', 'standalone', 'server.js')

  fs.mkdirSync(path.dirname(standaloneEntrypoint), { recursive: true })
  fs.writeFileSync(standaloneEntrypoint, 'module.exports = {}')

  assert.equal(
    runtimeBootstrap.resolveRuntimeEntrypoint(projectRoot),
    standaloneEntrypoint,
  )

  fs.writeFileSync(colocatedEntrypoint, 'module.exports = {}')

  assert.equal(
    runtimeBootstrap.resolveRuntimeEntrypoint(projectRoot),
    colocatedEntrypoint,
  )
})

test('resolveRuntimeEnvCandidates includes Hostinger build env and local nodejs sibling path', () => {
  const projectRoot = createTempProjectRoot()

  assert.deepEqual(runtimeBootstrap.resolveRuntimeEnvCandidates(projectRoot), [
    path.join(projectRoot, '.builds', 'config', '.env'),
    path.join(projectRoot, '..', 'public_html', '.builds', 'config', '.env'),
  ])
})

test('bootstrapRuntimeEnvironment lets the Hostinger runtime env file override stale injected values', () => {
  const projectRoot = createTempProjectRoot()
  const runtimeEnv = path.join(projectRoot, '.builds', 'config', '.env')
  const originalCwd = process.cwd()
  const targetEnv: Record<string, string | undefined> = {
    DATABASE_URL: 'mysql://stale-user:stale-pass@stale-host:3306/stale_db',
    NEXTAUTH_URL: 'https://stale.example.com',
  }

  fs.mkdirSync(path.dirname(runtimeEnv), { recursive: true })
  fs.writeFileSync(
    runtimeEnv,
    [
      "DATABASE_URL='mysql://fresh-user:fresh-pass@127.0.0.1:3306/petos'",
      "NEXTAUTH_URL='https://petos.desi.pet'",
    ].join('\n'),
  )

  try {
    runtimeBootstrap.bootstrapRuntimeEnvironment(projectRoot, targetEnv)
  } finally {
    process.chdir(originalCwd)
  }

  assert.equal(targetEnv.DATABASE_URL, 'mysql://fresh-user:fresh-pass@127.0.0.1:3306/petos')
  assert.equal(targetEnv.NEXTAUTH_URL, 'https://petos.desi.pet')
})
