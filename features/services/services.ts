import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { writeAuditLog } from '@/server/audit/logging'
import { resolveScopedUnitId } from '@/server/authorization/scope'
import type {
  CreateServiceInput,
  ListServicesQuery,
  UpdateServiceInput,
} from '@/features/services/schemas'

export async function listServices(actor: AuthenticatedUserData, query: ListServicesQuery) {
  return prisma.service.findMany({
    where: {
      ...(actor.unitId ? { OR: [{ unitId: actor.unitId }, { unitId: null }] } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search,
            },
          }
        : {}),
    },
    orderBy: {
      name: 'asc',
    },
  })
}

export async function getServiceById(actor: AuthenticatedUserData, serviceId: string) {
  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
  })

  if (!service) {
    throw new AppError('NOT_FOUND', 404, 'Service not found.')
  }

  if (actor.unitId && service.unitId && actor.unitId !== service.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this service.')
  }

  return service
}

export async function createService(actor: AuthenticatedUserData, input: CreateServiceInput) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        unitId,
        name: input.name,
        description: input.description,
        basePrice: input.basePrice,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        active: input.active ?? true,
      },
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'service.create',
      entityName: 'Service',
      entityId: service.id,
    })

    return service
  })
}

export async function updateService(
  actor: AuthenticatedUserData,
  serviceId: string,
  input: UpdateServiceInput,
) {
  const existingService = await getServiceById(actor, serviceId)
  const unitId = resolveScopedUnitId(actor, input.unitId ?? existingService.unitId ?? null)

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.update({
      where: {
        id: serviceId,
      },
      data: {
        unitId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
        ...(input.estimatedDurationMinutes !== undefined
          ? { estimatedDurationMinutes: input.estimatedDurationMinutes }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'service.update',
      entityName: 'Service',
      entityId: serviceId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return service
  })
}
