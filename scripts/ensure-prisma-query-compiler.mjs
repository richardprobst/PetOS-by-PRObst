import { createRequire } from 'node:module'
import process from 'node:process'

const require = createRequire(import.meta.url)

const {
  ensurePrismaQueryCompilerArtifact,
} = require('../server/db/prisma-query-compiler.js')

const result = ensurePrismaQueryCompilerArtifact(process.cwd())

if (result.status === 'restored') {
  console.log(
    `Restored Prisma query_compiler_bg.wasm from ${result.fallback} to ${result.destination}.`,
  )
}
