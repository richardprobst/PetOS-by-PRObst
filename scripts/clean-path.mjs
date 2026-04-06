import { rmSync } from 'node:fs'

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

const targetPath = process.argv[2]

if (!targetPath) {
  throw new Error('A target path is required.')
}

await removePath(targetPath)
