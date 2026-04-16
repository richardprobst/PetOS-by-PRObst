import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'

const runtimeBootstrap = require('../../../server.js') as {
  attachRuntimeChildLifecycle: (
    child: EventEmitter & {
      kill: (signal?: string) => void
      killed?: boolean
    },
    processRef?: {
      exit: (code?: number) => void
      kill: (pid: number, signal?: string) => void
      once: (event: string, listener: (...args: unknown[]) => void) => void
      pid: number
    },
    options?: { forwardSignals?: boolean },
  ) => EventEmitter
  bootstrapRuntimeEnvironment: (
    projectRoot?: string,
    targetEnv?: Record<string, string | undefined>,
  ) => Record<string, string | undefined>
  loadRuntimeEnvFile: (filePath: string, targetEnv?: Record<string, string | undefined>) => boolean
  resolveNextRuntimeEnvCandidates: (projectRoot?: string) => string[]
  resolveRuntimeEntrypoint: (projectRoot?: string) => string
  resolveRuntimeEnvCandidates: (projectRoot?: string) => string[]
  startRuntime: (
    projectRoot?: string,
    targetEnv?: Record<string, string | undefined>,
    options?: {
      attachLifecycleHandlers?: boolean
      ensureCompilerArtifact?: (projectRoot?: string) => void
      processRef?: {
        execPath: string
      }
      resolveEntrypoint?: (projectRoot?: string) => string
      spawnProcess?: (
        file: string,
        args: string[],
        options: {
          cwd: string
          env: Record<string, string | undefined>
          stdio: 'inherit'
        },
      ) => EventEmitter
    },
  ) => EventEmitter
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

test('resolveNextRuntimeEnvCandidates follows Next production precedence for runtime boot', () => {
  const projectRoot = createTempProjectRoot()

  assert.deepEqual(runtimeBootstrap.resolveNextRuntimeEnvCandidates(projectRoot), [
    path.join(projectRoot, '.env.production.local'),
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env.production'),
    path.join(projectRoot, '.env'),
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

test('bootstrapRuntimeEnvironment also syncs .env.local values into a custom target environment object', () => {
  const projectRoot = createTempProjectRoot()
  const originalCwd = process.cwd()
  const targetEnv: Record<string, string | undefined> = {}

  fs.writeFileSync(
    path.join(projectRoot, '.env.local'),
    [
      'APP_NAME=PetOS',
      'NEXTAUTH_URL=http://localhost:3000',
      'EMAIL_FROM_NAME=PetOS',
    ].join('\n'),
  )

  try {
    runtimeBootstrap.bootstrapRuntimeEnvironment(projectRoot, targetEnv)
  } finally {
    process.chdir(originalCwd)
  }

  assert.equal(targetEnv.APP_NAME, 'PetOS')
  assert.equal(targetEnv.NEXTAUTH_URL, 'http://localhost:3000')
  assert.equal(targetEnv.EMAIL_FROM_NAME, 'PetOS')
})

test('startRuntime spawns the standalone entrypoint instead of requiring it inline', () => {
  const projectRoot = createTempProjectRoot()
  const targetEnv: Record<string, string | undefined> = {
    APP_NAME: 'PetOS',
    APP_URL: 'http://localhost:3000',
    NEXTAUTH_URL: 'http://localhost:3000',
  }
  const child = new EventEmitter()
  let compilerProjectRoot: string | undefined
  let spawned:
    | {
        args: string[]
        cwd: string
        env: Record<string, string | undefined>
        file: string
        stdio: 'inherit'
      }
    | undefined

  const result = runtimeBootstrap.startRuntime(projectRoot, targetEnv, {
    attachLifecycleHandlers: false,
    ensureCompilerArtifact: (root) => {
      compilerProjectRoot = root
    },
    processRef: {
      execPath: 'node.exe',
    },
    resolveEntrypoint: () => path.join(projectRoot, 'server-standalone.js'),
    spawnProcess: (file, args, options) => {
      spawned = {
        args,
        cwd: options.cwd,
        env: options.env,
        file,
        stdio: options.stdio,
      }
      return child
    },
  })

  assert.equal(result, child)
  assert.equal(compilerProjectRoot, projectRoot)
  assert.deepEqual(spawned, {
    args: [path.join(projectRoot, 'server-standalone.js')],
    cwd: projectRoot,
    env: targetEnv,
    file: 'node.exe',
    stdio: 'inherit',
  })
})

test('attachRuntimeChildLifecycle mirrors child exit codes and signals to the parent process', () => {
  const child = new EventEmitter() as EventEmitter & {
    kill: (signal?: string) => void
    killed?: boolean
  }
  const receivedSignals: string[] = []
  let exitCode: number | undefined
  let killedSignal:
    | {
        pid: number
        signal: string | undefined
      }
    | undefined

  child.kill = (signal) => {
    receivedSignals.push(signal ?? 'SIGTERM')
  }
  child.killed = false

  const signalListeners = new Map<string, (...args: unknown[]) => void>()

  runtimeBootstrap.attachRuntimeChildLifecycle(
    child,
    {
      exit: (code?: number) => {
        exitCode = code
      },
      kill: (pid: number, signal?: string) => {
        killedSignal = {
          pid,
          signal,
        }
      },
      once: (event: string, listener: (...args: unknown[]) => void) => {
        signalListeners.set(event, listener)
      },
      pid: 321,
    },
    {
      forwardSignals: true,
    },
  )

  signalListeners.get('SIGINT')?.()
  assert.deepEqual(receivedSignals, ['SIGINT'])

  child.emit('exit', 0, null)
  assert.equal(exitCode, 0)

  child.emit('exit', null, 'SIGTERM')
  assert.deepEqual(killedSignal, {
    pid: 321,
    signal: 'SIGTERM',
  })
})
