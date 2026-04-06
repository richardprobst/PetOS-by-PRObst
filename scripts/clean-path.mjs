import { existsSync, readdirSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function removePath(targetPath) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      rmSync(targetPath, {
        force: true,
        maxRetries: 5,
        recursive: true,
        retryDelay: 100,
      })
      return
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      const errorCode = 'code' in error ? error.code : undefined

      if ((errorCode === 'EPERM' || errorCode === 'ENOTEMPTY') && tryRenameLockedPath(targetPath, attempt)) {
        return
      }

      if (attempt === 4) {
        if (errorCode === 'EPERM') {
          throw new Error(
            `Failed to remove ${targetPath} because another process is still using it. Stop any local PetOS server that is holding .next and try the build again.`,
            { cause: error },
          )
        }

        throw error
      }

      if (errorCode !== 'ENOTEMPTY' && errorCode !== 'EPERM') {
        throw error
      }

      await sleep(200 * (attempt + 1))
    }
  }
}

function buildCleanupPrefix(targetPath) {
  return `${path.basename(targetPath)}.__cleanup__`
}

function clearStaleCleanupPaths(targetPath) {
  const parentPath = path.dirname(targetPath)
  const cleanupPrefix = buildCleanupPrefix(targetPath)

  if (!existsSync(parentPath)) {
    return
  }

  for (const entry of readdirSync(parentPath, { withFileTypes: true })) {
    if (!entry.name.startsWith(cleanupPrefix)) {
      continue
    }

    rmSync(path.join(parentPath, entry.name), {
      force: true,
      maxRetries: 5,
      recursive: true,
      retryDelay: 100,
    })
  }
}

function tryRenameLockedPath(targetPath, attempt) {
  if (!existsSync(targetPath)) {
    return true
  }

  const renamedPath = path.join(
    path.dirname(targetPath),
    `${buildCleanupPrefix(targetPath)}${Date.now()}-${attempt}`,
  )

  try {
    // Free the original path so a new Next build can recreate .next even if Windows still holds a stale handle.
    renameSync(targetPath, renamedPath)
  } catch {
    return false
  }

  try {
    rmSync(renamedPath, {
      force: true,
      maxRetries: 5,
      recursive: true,
      retryDelay: 100,
    })
  } catch {
    console.warn(
      `Deferred cleanup for ${renamedPath}. The next build will retry removing this stale directory.`,
    )
  }

  return true
}

const targetPath = process.argv[2]

if (!targetPath) {
  throw new Error('A target path is required.')
}

clearStaleCleanupPaths(targetPath)
await removePath(targetPath)
