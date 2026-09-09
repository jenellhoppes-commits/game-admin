import { gameTypeMockData } from '@/mock/game-provider'
import type { SettlementBasis, SettlementCycle } from '@/types/game-provider'

export const TERM_TIMEZONE = 'Asia/Taipei'
export const businessDate = (date = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: TERM_TIMEZONE }).format(date)

export interface PartnerTermInput {
  settlementMode?: string
  basis: string
  gameTypeRates?: import('@/types/game-provider').GameTypeRate[]
  percent: number
  settlementCurrency: string
  settlementCycle: string
  effectiveFrom: string
}

export const termBasisLabels: Record<SettlementBasis, string> = {
  GGR: '遊戲輸贏',
  'Valid Bet': '有效投注',
  Turnover: '投注總額'
}
export const termCycleLabels: Record<SettlementCycle, string> = {
  Daily: '日結',
  Weekly: '週結',
  Semimonthly: '半月結',
  Monthly: '月結'
}
export const termStatusLabels: Record<string, string> = {
  Active: '生效中',
  Scheduled: '待生效',
  Draft: '草稿',
  Expired: '已到期',
  Disabled: '已停用'
}
export function validatePartnerTerm(
  input: PartnerTermInput,
  currencies: string[],
  today = businessDate()
) {
  if (
    input.basis !== 'GGR' ||
    !Number.isFinite(input.percent) ||
    input.percent < 0 ||
    input.percent > 100
  )
    return '請填寫有效計算基礎與 0 至 100 的比例'
  if (input.gameTypeRates && !['累積', '清零'].includes(input.settlementMode || ''))
    return '請選擇累積或清零'
  if (input.gameTypeRates && validateGameTypeRates(input.gameTypeRates))
    return validateGameTypeRates(input.gameTypeRates)
  if (!currencies.includes(input.settlementCurrency)) return '請選擇可用結算幣別'
  if (!Object.hasOwn(termCycleLabels, input.settlementCycle)) return '請選擇對帳週期'
  const date = new Date(input.effectiveFrom + 'T00:00:00Z')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom || '') ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.effectiveFrom
  )
    return '請選擇有效的生效日'
  if (input.effectiveFrom < today) return '生效日不可早於本日（Asia/Taipei）'
  return ''
}

interface DatedTerm {
  id: string
  status: string
  effectiveFrom: string
  effectiveTo?: string
  autoEffective?: boolean
}
// End dates are exclusive. Process in date order when a browser was closed across several dates.
export function advancePartnerTerms<T extends DatedTerm>(terms: T[], today = businessDate()): T[] {
  const activated: T[] = []
  const due = terms
    .filter((t) => t.autoEffective && t.status === 'Scheduled' && t.effectiveFrom <= today)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
  for (const term of due) {
    for (const previous of terms.filter((t) => t.status === 'Active')) {
      previous.status = 'Expired'
      previous.effectiveTo = term.effectiveFrom
    }
    term.status = 'Active'
    activated.push(term)
  }
  return activated
}

export function validateGameTypeRates(rates: import('@/types/game-provider').GameTypeRate[]) {
  if (rates.some((r) => !gameTypeMockData.some((t) => t.id === r.typeId && t.status === 'Active')))
    return '請選擇總後台有效的遊戲類型'
  if (!rates.length) return '請至少設定一個遊戲類型的 GGR 比例'
  if (new Set(rates.map((r) => r.typeId)).size !== rates.length) return '遊戲類型不可重複'
  if (
    rates.some(
      (r) =>
        !r.typeId ||
        !Number.isFinite(r.percent) ||
        r.percent < 0 ||
        r.percent > 100 ||
        Math.abs(r.percent * 100 - Math.round(r.percent * 100)) > 0.000001
    )
  )
    return '各類型比例需為 0 至 100，最多兩位小數'
  return ''
}
export function describeGameTypeRates(term: {
  gameTypeRates?: import('@/types/game-provider').GameTypeRate[]
  ratePercent?: number
  merchantTermPercent?: number
}) {
  if (term.gameTypeRates)
    return (
      term.gameTypeRates.map((r) => r.code + ' ' + r.name + ' ' + r.percent + '%').join('；') ||
      '未設定'
    )
  return '歷史全域條件 ' + (term.ratePercent ?? term.merchantTermPercent ?? '—') + '%'
}

export function costRatesAt(
  terms: import('@/types/game-provider').AgentCommercialTerm[],
  date: string
) {
  const term = terms
    .filter(
      (t) =>
        ['Active', 'Scheduled'].includes(t.status) &&
        t.effectiveFrom <= date &&
        (!t.effectiveTo || date < t.effectiveTo)
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version)[0]
  return term?.gameTypeRates || []
}
export function validateCostFloor(
  rates: import('@/types/game-provider').GameTypeRate[],
  costs: import('@/types/game-provider').GameTypeRate[]
) {
  for (const rate of rates) {
    const cost = costs.find((c) => c.typeId === rate.typeId)
    if (!cost) return rate.code + ' 尚無上級類型成本，請先由上級設定'
    if (rate.percent < cost.percent)
      return rate.code + ' 下開比例不得低於上級成本 ' + cost.percent + '%'
  }
  return ''
}
