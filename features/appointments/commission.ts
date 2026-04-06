export function calculateCommissionAmountFromBilledValue(
  billedAmount: number,
  commissionPercentage?: number | null,
) {
  if (!commissionPercentage || billedAmount <= 0) {
    return 0
  }

  return Number(((billedAmount * commissionPercentage) / 100).toFixed(2))
}
