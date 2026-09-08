import type { SettlementBasis, SettlementCycle } from '@/types/game-provider'

export const TERM_TIMEZONE = 'Asia/Taipei'
export const businessDate = (date = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: TERM_TIMEZONE }).format(date)

export interface PartnerTermInput {
  basis: string
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
