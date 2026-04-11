const fs = require('node:fs')
const path = require('node:path')

function resolveStandaloneRuntimePaths(projectRoot = process.cwd()) {
  const standaloneRoot = path.join(projectRoot, '.next', 'standalone')

  return {
    generatedEntrypoint: path.join(standaloneRoot, 'server.js'),
    helperDestination: path.join(
      standaloneRoot,
      'server',
      'db',
      'prisma-query-compiler.js',
    ),
    helperSource: path.join(projectRoot, 'server', 'db', 'prisma-query-compiler.js'),
    standaloneEntrypoint: path.join(standaloneRoot, 'server-standalone.js'),
    standaloneRoot,
    vendorDestination: path.join(
      standaloneRoot,
      'vendor',
      'prisma',
      'query_compiler_bg.wasm',
    ),
    vendorSource: path.join(projectRoot, 'vendor', 'prisma', 'query_compiler_bg.wasm'),
    wrapperSource: path.join(projectRoot, 'server.js'),
  }
}

function copyFile(sourcePath, destinationPath) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
  fs.copyFileSync(sourcePath, destinationPath)
}

function prepareStandaloneRuntime(projectRoot = process.cwd()) {
  const paths = resolveStandaloneRuntimePaths(projectRoot)

  if (!fs.existsSync(paths.generatedEntrypoint)) {
    throw new Error(
      `PetOS standalone runtime preparation could not find ${paths.generatedEntrypoint}. Run the Next.js build before preparing the standalone runtime.`,
    )
  }

  for (const requiredPath of [
    paths.wrapperSource,
    paths.helperSource,
    paths.vendorSource,
  ]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(
        `PetOS standalone runtime preparation is missing a required source file at ${requiredPath}.`,
      )
    }
  }

  copyFile(paths.generatedEntrypoint, paths.standaloneEntrypoint)
  copyFile(paths.wrapperSource, paths.generatedEntrypoint)
  copyFile(paths.helperSource, paths.helperDestination)
  copyFile(paths.vendorSource, paths.vendorDestination)

  return paths
}

module.exports = {
  prepareStandaloneRuntime,
  resolveStandaloneRuntimePaths,
}
