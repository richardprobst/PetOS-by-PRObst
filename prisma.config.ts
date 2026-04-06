import { loadEnvFile } from 'node:process'
import { defineConfig } from 'prisma/config'

function tryLoadEnvFile(path: string) {
  try {
    loadEnvFile(path)
    return true
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error
    }

    return false
  }
}

// Prisma CLI does not load custom env files automatically when a custom config is present.
// Prefer environment-specific files first, then fall back to `.env`.
const prismaEnvCandidates = ['.env.local', '.env.staging', '.env.production', '.env']

for (const candidate of prismaEnvCandidates) {
  if (tryLoadEnvFile(candidate)) {
    break
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
