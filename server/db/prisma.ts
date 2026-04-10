import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

function createPrismaClientOptions() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  const adapter = databaseUrl ? new PrismaMariaDb(databaseUrl) : undefined

  return {
    ...(adapter ? { adapter } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  } satisfies ConstructorParameters<typeof PrismaClient>[0]
}

function createPrismaClient() {
  const options = createPrismaClientOptions()

  if (!('adapter' in options)) {
    throw new Error(
      'Prisma database adapter is unavailable because DATABASE_URL is not configured.',
    )
  }

  // Shared hosts like Hostinger can choke on the Rust query engine thread model.
  // The JS adapter keeps Prisma operational without depending on Tokio worker threads.
  return new PrismaClient(options)
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(target, property, receiver) {
    if (Reflect.has(target, property)) {
      return Reflect.get(target, property, receiver)
    }

    const client = getPrismaClient()
    const value = Reflect.get(client, property, receiver)

    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
