import { Prisma } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { hashPassword } from '@/server/auth/password'
import { normalizeEmailAddress } from '@/server/auth/user-access'
import { resolveScopedUnitId } from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from '@/features/employees/schemas'

const employeeDetailsInclude = Prisma.validator<Prisma.EmployeeInclude>()({
  user: {
    include: {
      profiles: {
        include: {
          profile: true,
        },
      },
    },
  },
  unit: true,
})

async function getProfilesByName(profileNames: string[]) {
  const profiles = await prisma.accessProfile.findMany({
    where: {
      name: {
        in: profileNames,
      },
    },
  })

  if (profiles.length !== profileNames.length) {
    throw new AppError('CONFLICT', 409, 'One or more employee profiles were not found.')
  }

  return profiles
}

export async function listEmployees(actor: AuthenticatedUserData, query: ListEmployeesQuery) {
  return prisma.employee.findMany({
    where: {
      ...(actor.unitId ? { unitId: actor.unitId } : {}),
      ...(query.active !== undefined ? { user: { active: query.active } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                user: {
                  name: {
                    contains: query.search,
                  },
                },
              },
              {
                role: {
                  contains: query.search,
                },
              },
            ],
          }
        : {}),
    },
    include: employeeDetailsInclude,
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })
}

export async function getEmployeeById(actor: AuthenticatedUserData, employeeUserId: string) {
  const employee = await prisma.employee.findUnique({
    where: {
      userId: employeeUserId,
    },
    include: employeeDetailsInclude,
  })

  if (!employee) {
    throw new AppError('NOT_FOUND', 404, 'Employee not found.')
  }

  if (actor.unitId && employee.unitId !== actor.unitId) {
    throw new AppError('FORBIDDEN', 403, 'User is not allowed to access this employee.')
  }

  return employee
}

export async function createEmployee(actor: AuthenticatedUserData, input: CreateEmployeeInput) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)
  const profileNames = input.profileNames ?? ['Tosador']
  const passwordHash = await hashPassword(input.password)
  const profiles = await getProfilesByName(profileNames)

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        unitId,
        name: input.name,
        email: normalizeEmailAddress(input.email),
        passwordHash,
        phone: input.phone,
        userType: 'EMPLOYEE',
        active: input.active ?? true,
        employee: {
          create: {
            unitId,
            role: input.role,
            specialty: input.specialty,
            commissionPercentage: input.commissionPercentage,
            payrollMode: input.payrollMode,
            baseCompensationAmount: input.baseCompensationAmount,
            defaultDailyWorkMinutes: input.defaultDailyWorkMinutes,
          },
        },
        profiles: {
          create: profiles.map((profile) => ({
            profileId: profile.id,
          })),
        },
      },
      include: {
        employee: {
          include: employeeDetailsInclude,
        },
      },
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'employee.create',
      entityName: 'Employee',
      entityId: user.id,
      details: {
        profileNames,
      },
    })

    return user.employee
  })
}

export async function updateEmployee(
  actor: AuthenticatedUserData,
  employeeUserId: string,
  input: UpdateEmployeeInput,
) {
  const existingEmployee = await getEmployeeById(actor, employeeUserId)
  const unitId = resolveScopedUnitId(actor, input.unitId ?? existingEmployee.unitId)
  const passwordHash = input.password ? await hashPassword(input.password) : undefined

  return prisma.$transaction(async (tx) => {
    if (input.profileNames) {
      const nextProfiles = await getProfilesByName(input.profileNames)

      await tx.userProfile.deleteMany({
        where: {
          userId: employeeUserId,
        },
      })

      await tx.userProfile.createMany({
        data: nextProfiles.map((profile) => ({
          userId: employeeUserId,
          profileId: profile.id,
        })),
      })
    }

    await tx.user.update({
      where: {
        id: employeeUserId,
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

    const employee = await tx.employee.update({
      where: {
        userId: employeeUserId,
      },
      data: {
        unitId,
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
        ...(input.commissionPercentage !== undefined
          ? { commissionPercentage: input.commissionPercentage }
          : {}),
        ...(input.payrollMode !== undefined ? { payrollMode: input.payrollMode } : {}),
        ...(input.baseCompensationAmount !== undefined
          ? { baseCompensationAmount: input.baseCompensationAmount }
          : {}),
        ...(input.defaultDailyWorkMinutes !== undefined
          ? { defaultDailyWorkMinutes: input.defaultDailyWorkMinutes }
          : {}),
      },
      include: employeeDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'employee.update',
      entityName: 'Employee',
      entityId: employeeUserId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return employee
  })
}
