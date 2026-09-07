export interface PublishedRate {
  fromCurrency: string
  toCurrency: string
  finalRate: number
  date: string
  status: string
  lockedAt?: string
}

export function referenceConversion(
  rows: { currency: string; betAmount: number; payoutAmount: number; ggr: number }[],
  target: string,
  rates: PublishedRate[],
  today: string
) {
  const latest = new Map<string, PublishedRate>()
  for (const rate of rates) {
    if (rate.status !== 'Locked' || rate.fromCurrency !== 'USDT' || rate.date > today ||
      !Number.isFinite(rate.finalRate) || rate.finalRate <= 0) continue
    const previous = latest.get(rate.toCurrency)
    if (!previous || rate.date > previous.date ||
      (rate.date === previous.date && (rate.lockedAt ?? '') > (previous.lockedAt ?? ''))) {
      latest.set(rate.toCurrency, rate)
    }
  }
  const missing = new Set<string>()
  const used = new Map<string, PublishedRate>()
  const amounts = { betAmount: 0, payoutAmount: 0, ggr: 0 }
  for (const row of rows) {
    let factor = 1
    if (row.currency !== target) {
      for (const currency of [row.currency, target]) {
        if (currency === 'USDT') continue
        const rate = latest.get(currency)
        if (!rate) missing.add(currency)
        else used.set(currency, rate)
      }
      const sourceRate = row.currency === 'USDT' ? 1 : latest.get(row.currency)?.finalRate
      const targetRate = target === 'USDT' ? 1 : latest.get(target)?.finalRate
      if (!sourceRate || !targetRate) continue
      factor = targetRate / sourceRate
    }
    amounts.betAmount += row.betAmount * factor
    amounts.payoutAmount += row.payoutAmount * factor
    amounts.ggr += row.ggr * factor
  }
  return { amounts: missing.size ? null : amounts, missing: [...missing], rates: [...used.values()] }
}
