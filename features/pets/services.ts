import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { writeAuditLog } from '@/server/audit/logging'
import type { CreatePetInput, ListPetsQuery, UpdatePetInput } from '@/features/pets/schemas'

const petDetailsInclude = Prisma.validator<Prisma.PetInclude>()({
  client: {
    include: {
      user: true,
    },
  },
})

async function assertClientAccess(actor: AuthenticatedUserData, clientId: string) {
  const client = await prisma.client.findUnique({
    where: {
      userId: clientId,
    },
    include: {
      user: true,
    },
  })

  if (!client) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for pet operation.')
  }

  if (actor.unitId && client.user.unitId && actor.unitId !== client.user.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this client.')
  }

  return client
}

export async function listPets(actor: AuthenticatedUserData, query: ListPetsQuery) {
  return prisma.pet.findMany({
    where: {
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                },
              },
              {
                breed: {
                  contains: query.search,
                },
              },
            ],
          }
        : {}),
      ...(actor.unitId
        ? {
            client: {
              user: {
                unitId: actor.unitId,
              },
            },
          }
        : {}),
    },
    include: petDetailsInclude,
    orderBy: {
      name: 'asc',
    },
  })
}

export async function getPetById(actor: AuthenticatedUserData, petId: string) {
  const pet = await prisma.pet.findUnique({
    where: {
      id: petId,
    },
    include: petDetailsInclude,
  })

  if (!pet) {
    throw new AppError('NOT_FOUND', 404, 'Pet not found.')
  }

  if (actor.unitId && pet.client.user.unitId && actor.unitId !== pet.client.user.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this pet.')
  }

  return pet
}

export async function createPet(actor: AuthenticatedUserData, input: CreatePetInput) {
  const client = await assertClientAccess(actor, input.clientId)

  return prisma.$transaction(async (tx) => {
    const pet = await tx.pet.create({
      data: {
        clientId: client.userId,
        name: input.name,
        species: input.species,
        breed: input.breed,
        birthDate: input.birthDate,
        weightKg: input.weightKg,
        healthNotes: input.healthNotes,
        allergies: input.allergies,
        primaryPhotoUrl: input.primaryPhotoUrl,
      },
      include: petDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: client.user.unitId,
      userId: actor.id,
      action: 'pet.create',
      entityName: 'Pet',
      entityId: pet.id,
      details: {
        clientId: client.userId,
      },
    })

    return pet
  })
}

export async function updatePet(actor: AuthenticatedUserData, petId: string, input: UpdatePetInput) {
  const existingPet = await getPetById(actor, petId)
  const targetClientId = input.clientId ?? existingPet.clientId
  const client = await assertClientAccess(actor, targetClientId)

  return prisma.$transaction(async (tx) => {
    const pet = await tx.pet.update({
      where: {
        id: petId,
      },
      data: {
        clientId: client.userId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.species !== undefined ? { species: input.species } : {}),
        ...(input.breed !== undefined ? { breed: input.breed } : {}),
        ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
        ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
        ...(input.healthNotes !== undefined ? { healthNotes: input.healthNotes } : {}),
        ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
        ...(input.primaryPhotoUrl !== undefined ? { primaryPhotoUrl: input.primaryPhotoUrl } : {}),
      },
      include: petDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: client.user.unitId,
      userId: actor.id,
      action: 'pet.update',
      entityName: 'Pet',
      entityId: petId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return pet
  })
}
