import { PrismaClient } from '@prisma/client'
import { bootstrapCorePetOS } from '../server/system/bootstrap-core'
import { getEnv } from '../server/env'
import { upsertSystemRuntimeState } from '../server/system/runtime-state'
import { getBuildVersion } from '../server/system/version'

const prisma = new PrismaClient()

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase()
}

function readAdminSeedConfiguration() {
  const name = process.env.ADMIN_SEED_NAME?.trim() || 'Administrador PetOS'
  const email = process.env.ADMIN_SEED_EMAIL?.trim()
  const password = process.env.ADMIN_SEED_PASSWORD

  if (!email && !password) {
    return null
  }

  if (!email || !password) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be provided together.')
  }

  if (password.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must have at least 8 characters.')
  }

  return {
    email: normalizeEmailAddress(email),
    name,
    password,
  }
}

async function main() {
  const environment = getEnv()
  const adminSeedConfiguration = readAdminSeedConfiguration()

  await bootstrapCorePetOS(prisma, environment, {
    admin: adminSeedConfiguration ?? undefined,
    includeClientCommunicationPreferences: true,
    unit: {
      companyName: 'PetOS',
      unitEmail: undefined,
      unitName: 'Matriz',
      unitPhone: undefined,
      unitTimezone: environment.DEFAULT_TIMEZONE,
    },
  })

  await upsertSystemRuntimeState(prisma, {
    currentVersion: getBuildVersion(),
    installationCompletedAt: new Date(),
    installerLockedAt: new Date(),
    lifecycleState: 'INSTALLED',
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Failed to seed Prisma data for the PetOS MVP foundation.', error)
    await prisma.$disconnect()
    process.exit(1)
  })
