import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { writeAuditLog } from '@/server/audit/logging'
import type { CreatePetInput, ListPetsQuery, UpdatePetInput } from '@/features/pets/schemas'
import {
  assertActorCanAccessOwnershipBinding,
  assertActorCanStructurallyWriteOwnershipBinding,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'

const petDetailsInclude = Prisma.validator<Prisma.PetInclude>()({
  client: {
    include: {
      user: true,
    },
  },
})

async function assertClientAccess(
  actor: AuthenticatedUserData,
  clientId: string,
  operation: 'READ' | 'STRUCTURAL_WRITE' = 'READ',
) {
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

  const ownership = buildClientOwnershipBinding(client.user.unitId)

  if (operation === 'STRUCTURAL_WRITE') {
    assertActorCanStructurallyWriteOwnershipBinding(actor, ownership, {
      requestedUnitId: client.user.unitId,
    })
  } else {
    assertActorCanAccessOwnershipBinding(actor, ownership, {
      requestedUnitId: client.user.unitId,
    })
  }

  return client
}

export async function listPets(actor: AuthenticatedUserData, query: ListPetsQuery) {
  const unitId = resolveScopedUnitId(actor)

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
      ...(unitId
        ? {
            client: {
              user: {
                unitId,
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

  const ownership = buildClientOwnershipBinding(pet.client.user.unitId)
  assertActorCanAccessOwnershipBinding(actor, ownership, {
    requestedUnitId: pet.client.user.unitId,
  })

  return pet
}

export async function createPet(actor: AuthenticatedUserData, input: CreatePetInput) {
  const client = await assertClientAccess(actor, input.clientId, 'STRUCTURAL_WRITE')

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
  assertActorCanStructurallyWriteOwnershipBinding(
    actor,
    buildClientOwnershipBinding(existingPet.client.user.unitId),
    {
      requestedUnitId: existingPet.client.user.unitId,
    },
  )
  const targetClientId = input.clientId ?? existingPet.clientId
  const client = await assertClientAccess(actor, targetClientId, 'STRUCTURAL_WRITE')

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
