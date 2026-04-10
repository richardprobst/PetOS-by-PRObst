const fs = require('node:fs')
const path = require('node:path')

function resolvePrismaQueryCompilerPaths(projectRoot = process.cwd()) {
  return {
    destination: path.join(
      projectRoot,
      'node_modules',
      '.prisma',
      'client',
      'query_compiler_bg.wasm',
    ),
    fallback: path.join(projectRoot, 'vendor', 'prisma', 'query_compiler_bg.wasm'),
  }
}

function ensurePrismaQueryCompilerArtifact(projectRoot = process.cwd()) {
  const { destination, fallback } = resolvePrismaQueryCompilerPaths(projectRoot)

  if (fs.existsSync(destination)) {
    return {
      destination,
      fallback,
      status: 'present',
    }
  }

  if (!fs.existsSync(fallback)) {
    throw new Error(
      `PetOS runtime bootstrap could not restore Prisma query_compiler_bg.wasm because the vendored fallback is missing at ${fallback}.`,
    )
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(fallback, destination)

  return {
    destination,
    fallback,
    status: 'restored',
  }
}

module.exports = {
  ensurePrismaQueryCompilerArtifact,
  resolvePrismaQueryCompilerPaths,
}
