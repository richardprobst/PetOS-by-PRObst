import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'

const standaloneRuntime = require('../../../server/runtime/standalone-runtime.js') as {
  prepareStandaloneRuntime: (projectRoot?: string) => {
    generatedEntrypoint: string
    helperDestination: string
    helperSource: string
    standaloneEntrypoint: string
    standaloneRoot: string
    vendorDestination: string
    vendorSource: string
    wrapperSource: string
  }
  resolveStandaloneRuntimePaths: (projectRoot?: string) => {
    generatedEntrypoint: string
    helperDestination: string
    helperSource: string
    standaloneEntrypoint: string
    standaloneRoot: string
    vendorDestination: string
    vendorSource: string
    wrapperSource: string
  }
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
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'petos-standalone-'))
  tempDirectories.push(projectRoot)
  return projectRoot
}

test('prepareStandaloneRuntime replaces the standalone server entrypoint with the PetOS wrapper', () => {
  const projectRoot = createTempProjectRoot()
  const paths = standaloneRuntime.resolveStandaloneRuntimePaths(projectRoot)

  fs.mkdirSync(path.dirname(paths.generatedEntrypoint), { recursive: true })
  fs.mkdirSync(path.dirname(paths.helperSource), { recursive: true })
  fs.mkdirSync(path.dirname(paths.vendorSource), { recursive: true })
  fs.writeFileSync(paths.generatedEntrypoint, 'module.exports = "generated"')
  fs.writeFileSync(paths.wrapperSource, 'module.exports = "wrapper"')
  fs.writeFileSync(paths.helperSource, 'module.exports = { ensure: true }')
  fs.writeFileSync(paths.vendorSource, Buffer.from('petos-wasm'))

  const prepared = standaloneRuntime.prepareStandaloneRuntime(projectRoot)

  assert.equal(fs.readFileSync(prepared.standaloneEntrypoint, 'utf8'), 'module.exports = "generated"')
  assert.equal(fs.readFileSync(prepared.generatedEntrypoint, 'utf8'), 'module.exports = "wrapper"')
  assert.equal(
    fs.readFileSync(prepared.helperDestination, 'utf8'),
    'module.exports = { ensure: true }',
  )
  assert.equal(fs.readFileSync(prepared.vendorDestination).toString('utf8'), 'petos-wasm')
})
