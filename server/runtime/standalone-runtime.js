const fs = require('node:fs')
const path = require('node:path')

function createRuntimeLauncherScript() {
  return `#!/bin/sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

resolve_node_bin() {
  for candidate in \
    "\${HOSTINGER_NODE_BIN:-}" \
    "/opt/alt/alt-nodejs24/root/bin/node" \
    "/opt/alt/alt-nodejs22/root/bin/node" \
    "/opt/alt/alt-nodejs20/root/bin/node" \
    "/usr/bin/node" \
    "/bin/node"
  do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  printf '%s\n' "PetOS runtime launcher could not find a usable Node.js binary." >&2
  exit 1
}

NODE_BIN="\$(resolve_node_bin)"
exec "$NODE_BIN" "$PROJECT_ROOT/server.js"
`
}

function rewriteStandalonePackageJson(standaloneRoot) {
  const packageJsonPath = path.join(standaloneRoot, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    return packageJsonPath
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  packageJson.scripts = {
    start: 'sh ./start-server.sh',
    'start:standalone': 'sh ./start-server.sh',
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

  return packageJsonPath
}

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
    runtimeLauncherDestination: path.join(standaloneRoot, 'start-server.sh'),
    standalonePackageJson: path.join(standaloneRoot, 'package.json'),
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
  fs.writeFileSync(paths.runtimeLauncherDestination, createRuntimeLauncherScript())
  fs.chmodSync(paths.runtimeLauncherDestination, 0o755)
  rewriteStandalonePackageJson(paths.standaloneRoot)

  return paths
}

module.exports = {
  createRuntimeLauncherScript,
  prepareStandaloneRuntime,
  rewriteStandalonePackageJson,
  resolveStandaloneRuntimePaths,
}
