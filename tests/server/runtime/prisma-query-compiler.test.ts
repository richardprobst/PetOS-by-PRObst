import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, test } from 'node:test'

const prismaQueryCompiler = require('../../../server/db/prisma-query-compiler.js') as {
  ensurePrismaQueryCompilerArtifact: (
    projectRoot?: string,
  ) => {
    destination: string
    fallback: string
    status: 'present' | 'restored'
  }
  resolvePrismaQueryCompilerPaths: (projectRoot?: string) => {
    destination: string
    fallback: string
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
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'petos-prisma-wasm-'))
  tempDirectories.push(projectRoot)
  return projectRoot
}

test('ensurePrismaQueryCompilerArtifact restores the wasm from the vendored fallback when missing', () => {
  const projectRoot = createTempProjectRoot()
  const { destination, fallback } =
    prismaQueryCompiler.resolvePrismaQueryCompilerPaths(projectRoot)

  fs.mkdirSync(path.dirname(fallback), { recursive: true })
  fs.writeFileSync(fallback, Buffer.from('petos-wasm'))

  const result = prismaQueryCompiler.ensurePrismaQueryCompilerArtifact(projectRoot)

  assert.equal(result.status, 'restored')
  assert.equal(fs.readFileSync(destination).toString('utf8'), 'petos-wasm')
})

test('ensurePrismaQueryCompilerArtifact keeps an existing generated wasm untouched', () => {
  const projectRoot = createTempProjectRoot()
  const { destination, fallback } =
    prismaQueryCompiler.resolvePrismaQueryCompilerPaths(projectRoot)

  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.mkdirSync(path.dirname(fallback), { recursive: true })
  fs.writeFileSync(destination, Buffer.from('generated-wasm'))
  fs.writeFileSync(fallback, Buffer.from('vendored-wasm'))

  const result = prismaQueryCompiler.ensurePrismaQueryCompilerArtifact(projectRoot)

  assert.equal(result.status, 'present')
  assert.equal(fs.readFileSync(destination).toString('utf8'), 'generated-wasm')
})
