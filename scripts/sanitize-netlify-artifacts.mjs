import { promises as fs } from 'node:fs'
import path from 'node:path'

const roots = [
  path.join(process.cwd(), '.netlify', 'functions'),
  path.join(process.cwd(), '.netlify', 'functions-internal'),
]

const envArtifactPattern = /^\.env(\..+)?$/

async function walk(directory, removedFiles) {
  let entries = []

  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      await walk(absolutePath, removedFiles)
      continue
    }

    if (!envArtifactPattern.test(entry.name)) {
      continue
    }

    await fs.rm(absolutePath, { force: true })
    removedFiles.push(absolutePath)
  }
}

async function main() {
  const removedFiles = []

  for (const root of roots) {
    await walk(root, removedFiles)
  }

  if (removedFiles.length === 0) {
    console.log('[ok] No bundled .env artifacts found in Netlify functions.')
    return
  }

  console.log('[ok] Removed bundled .env artifacts from Netlify functions:')
  for (const file of removedFiles) {
    console.log(` - ${path.relative(process.cwd(), file)}`)
  }
}

main().catch((error) => {
  console.error('[fail] Failed to sanitize Netlify function artifacts.')
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exitCode = 1
})
