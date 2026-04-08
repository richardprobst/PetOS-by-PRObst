import { createMultiUnitOwnershipBinding } from '@/features/multiunit/context'
import type { MultiUnitOwnershipBinding } from '@/features/multiunit/schemas'
import { AppError } from '@/server/http/errors'

export function buildClientOwnershipBinding(
  unitId: string | null | undefined,
): MultiUnitOwnershipBinding {
  if (!unitId) {
    throw new AppError(
      'UNPROCESSABLE_ENTITY',
      422,
      'Client does not have an owning unit.',
    )
  }

  return createMultiUnitOwnershipBinding({
    kind: 'MASTER_RECORD_WITH_UNIT_LINK',
    primaryUnitId: unitId,
    linkedUnitIds: [],
    reassignmentAuditRequired: true,
  })
}
