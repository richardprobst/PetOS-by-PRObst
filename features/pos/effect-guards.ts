import { Prisma } from '@prisma/client'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'

type PosEffectGuardClient = Prisma.TransactionClient | typeof prisma

export async function ensurePosSaleHasNoRegisteredEffects(
  client: PosEffectGuardClient,
  saleId: string,
) {
  const [financialEffect, inventoryEffect] = await Promise.all([
    client.financialTransaction.findFirst({
      where: {
        OR: [
          {
            posSaleId: saleId,
          },
          {
            revenuePosSaleId: saleId,
          },
        ],
      },
      select: {
        id: true,
      },
    }),
    client.inventoryMovement.findFirst({
      where: {
        posSaleId: saleId,
      },
      select: {
        id: true,
      },
    }),
  ])

  if (financialEffect || inventoryEffect) {
    throw new AppError(
      'CONFLICT',
      409,
      'This POS sale already has registered inventory or financial effects and cannot be processed again.',
    )
  }
}

export async function ensurePosSaleRevenueEffectIsUnique(
  client: PosEffectGuardClient,
  saleId: string,
) {
  const revenueEffect = await client.financialTransaction.findFirst({
    where: {
      transactionType: 'REVENUE',
      OR: [
        {
          posSaleId: saleId,
        },
        {
          revenuePosSaleId: saleId,
        },
      ],
    },
    select: {
      id: true,
    },
  })

  if (revenueEffect) {
    throw new AppError(
      'CONFLICT',
      409,
      'This POS sale already has a registered revenue effect and cannot be processed again.',
    )
  }
}

export async function ensurePosSaleItemSaleOutEffectIsUnique(
  client: PosEffectGuardClient,
  posSaleItemId: string,
) {
  const existingSaleOutMovement = await client.inventoryMovement.findFirst({
    where: {
      movementType: 'SALE_OUT',
      OR: [
        {
          posSaleItemId,
        },
        {
          saleOutPosSaleItemId: posSaleItemId,
        },
      ],
    },
    select: {
      id: true,
    },
  })

  if (existingSaleOutMovement) {
    throw new AppError(
      'CONFLICT',
      409,
      'This POS sale item already has a recorded SALE_OUT inventory movement and cannot be processed again.',
    )
  }
}
