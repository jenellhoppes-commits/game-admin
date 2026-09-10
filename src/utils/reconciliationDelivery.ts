export function calculateDelivery(
  systemAmount: number,
  adjustment: number,
  actual: number,
  reason: string,
  retain: boolean,
  precision = 2
) {
  if (![systemAmount, adjustment, actual].every(Number.isFinite) || actual < 0)
    throw new Error('請輸入有效金額，實收／實付不可為負數')
  if (adjustment !== 0 && !reason.trim()) throw new Error('差異調整必須填寫原因')
  actual = Math.trunc(actual)
  const round = (n: number) => Number(n.toFixed(precision))
  const adjusted = round(systemAmount + adjustment)
  const payable = Math.max(0, adjusted)
  if (actual > payable) throw new Error('實收／實付不可超過調整後可交付金額')
  const remaining = round(payable - actual)
  return {
    adjusted,
    remaining,
    carried: retain ? remaining : 0,
    paymentStatus:
      retain && remaining > 0
        ? 'Carried'
        : actual === 0
          ? 'Unpaid'
          : remaining > 0
            ? 'Partial'
            : 'Paid'
  }
}
