import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import type { ListCommissionsQuery } from '@/features/commissions/schemas'

export async function listCommissionSummaries(
  actor: AuthenticatedUserData,
  query: ListCommissionsQuery,
) {
  const items = await prisma.appointmentService.findMany({
    where: {
      ...(query.employeeUserId ? { employeeUserId: query.employeeUserId } : {}),
      appointment: {
        ...(actor.unitId ? { unitId: actor.unitId } : {}),
      },
    },
    include: {
      employee: {
        include: {
          user: true,
        },
      },
      appointment: {
        include: {
          pet: true,
          operationalStatus: true,
        },
      },
      service: true,
    },
    orderBy: {
      appointment: {
        startAt: 'desc',
      },
    },
  })

  const totalsByEmployee = new Map<
    string,
    {
      employeeUserId: string
      employeeName: string
      totalCommissionAmount: number
      itemCount: number
    }
  >()

  for (const item of items) {
    if (!item.employeeUserId || !item.employee) {
      continue
    }

    const existingSummary = totalsByEmployee.get(item.employeeUserId) ?? {
      employeeUserId: item.employeeUserId,
      employeeName: item.employee.user.name,
      totalCommissionAmount: 0,
      itemCount: 0,
    }

    existingSummary.totalCommissionAmount += Number(item.calculatedCommissionAmount)
    existingSummary.itemCount += 1
    totalsByEmployee.set(item.employeeUserId, existingSummary)
  }

  return {
    summaries: Array.from(totalsByEmployee.values()).sort(
      (left, right) => right.totalCommissionAmount - left.totalCommissionAmount,
    ),
    items,
  }
}
