import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { hashPassword } from '@/server/auth/password'
import { normalizeEmailAddress } from '@/server/auth/user-access'
import { resolveScopedUnitId } from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from '@/features/clients/schemas'

const clientDetailsInclude = Prisma.validator<Prisma.ClientInclude>()({
  user: true,
  pets: true,
})

function buildClientSearchWhere(
  actor: AuthenticatedUserData,
  query: ListClientsQuery,
): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {}
  const userWhere: Prisma.UserWhereInput = {}

  if (actor.unitId) {
    userWhere.unitId = actor.unitId
  }

  if (query.active !== undefined) {
    userWhere.active = query.active
  }

  if (Object.keys(userWhere).length > 0) {
    where.user = {
      is: userWhere,
    }
  }

  if (query.search) {
    where.OR = [
      {
        user: {
          is: {
            name: {
              contains: query.search,
            },
          },
        },
      },
      {
        user: {
          is: {
            email: {
              contains: query.search,
            },
          },
        },
      },
      {
        city: {
          contains: query.search,
        },
      },
    ]
  }

  return where
}

export async function listClients(actor: AuthenticatedUserData, query: ListClientsQuery) {
  return prisma.client.findMany({
    where: buildClientSearchWhere(actor, query),
    include: clientDetailsInclude,
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })
}

export async function getClientById(actor: AuthenticatedUserData, clientId: string) {
  const client = await prisma.client.findUnique({
    where: {
      userId: clientId,
    },
    include: clientDetailsInclude,
  })

  if (!client) {
    throw new AppError('NOT_FOUND', 404, 'Client not found.')
  }

  if (actor.unitId && client.user.unitId && actor.unitId !== client.user.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this client.')
  }

  return client
}

export async function createClient(actor: AuthenticatedUserData, input: CreateClientInput) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  const tutorProfile = await prisma.accessProfile.findUnique({
    where: {
      name: 'Tutor',
    },
  })

  if (!tutorProfile) {
    throw new AppError('CONFLICT', 409, 'Tutor profile is not seeded in the database.')
  }

  const passwordHash = input.password ? await hashPassword(input.password) : null

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        unitId,
        name: input.name,
        email: normalizeEmailAddress(input.email),
        passwordHash,
        phone: input.phone,
        userType: 'CLIENT',
        active: input.active ?? true,
        client: {
          create: {
            address: input.address,
            city: input.city,
            state: input.state,
            zipCode: input.zipCode,
            contactPreference: input.contactPreference,
            generalNotes: input.generalNotes,
            communicationPreference: {
              create: {
                emailOptIn: true,
                whatsappOptIn: Boolean(input.phone),
                marketingOptIn: false,
                reviewOptIn: true,
                postServiceOptIn: true,
                source: 'client_create_default',
                updatedByUserId: actor.id,
              },
            },
          },
        },
        profiles: {
          create: {
            profileId: tutorProfile.id,
          },
        },
      },
      include: {
        client: {
          include: clientDetailsInclude,
        },
      },
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'client.create',
      entityName: 'Client',
      entityId: user.id,
      details: {
        email: user.email,
      },
    })

    return user.client
  })
}

export async function updateClient(
  actor: AuthenticatedUserData,
  clientId: string,
  input: UpdateClientInput,
) {
  const existingClient = await getClientById(actor, clientId)
  const unitId = resolveScopedUnitId(actor, input.unitId ?? existingClient.user.unitId ?? null)
  const passwordHash = input.password ? await hashPassword(input.password) : undefined

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: clientId,
      },
      data: {
        unitId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: normalizeEmailAddress(input.email) } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
    })

    const client = await tx.client.update({
      where: {
        userId: clientId,
      },
      data: {
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.zipCode !== undefined ? { zipCode: input.zipCode } : {}),
        ...(input.contactPreference !== undefined ? { contactPreference: input.contactPreference } : {}),
        ...(input.generalNotes !== undefined ? { generalNotes: input.generalNotes } : {}),
      },
      include: clientDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'client.update',
      entityName: 'Client',
      entityId: clientId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return client
  })
}
