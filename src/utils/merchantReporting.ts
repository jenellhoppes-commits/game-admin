export interface MerchantReportBet {
  id: string
  lineUid: string
  gameId: string
  gameName: string
  memberId: string
  roundId: string
  currency: string
  time: string
  status: string
  test: boolean
  betAmount: number
  payoutAmount: number
}

export interface MerchantReportFilters {
  range: string[]
  line: string
  currency: string
  excludeTest: boolean
}

export function filterMerchantReport(rows: MerchantReportBet[], filters: MerchantReportFilters) {
  if (filters.range.length !== 2 || filters.range[0] > filters.range[1]) return []
  return rows.filter(
    (row) =>
      row.status === 'Settled' &&
      row.time.slice(0, 10) >= filters.range[0] &&
      row.time.slice(0, 10) <= filters.range[1] &&
      (!filters.line || row.lineUid === filters.line) &&
      (!filters.currency || row.currency === filters.currency) &&
      (!filters.excludeTest || !row.test)
  )
}

export interface MerchantReportSummary {
  id: string
  name: string
  currency: string
  rounds: number
  members: number
  betAmount: number
  payoutAmount: number
  ggr: number
}

export function aggregateMerchantReport(
  rows: MerchantReportBet[],
  dimension: string
): MerchantReportSummary[] {
  const groups = new Map<
    string,
    MerchantReportSummary & { memberIds: Set<string>; roundIds: Set<string> }
  >()
  const seen = new Set<string>()
  for (const bet of rows) {
    if (seen.has(bet.id)) continue
    seen.add(bet.id)
    const entity =
      dimension === '線路' ? bet.lineUid : dimension === '遊戲' ? bet.gameId : bet.currency
    const id = JSON.stringify([entity, bet.currency])
    const row = groups.get(id) || {
      id,
      name: dimension === '遊戲' ? bet.gameName : entity,
      currency: bet.currency,
      rounds: 0,
      members: 0,
      betAmount: 0,
      payoutAmount: 0,
      ggr: 0,
      memberIds: new Set<string>(),
      roundIds: new Set<string>()
    }
    row.memberIds.add(JSON.stringify([bet.lineUid, bet.memberId]))
    row.roundIds.add(JSON.stringify([bet.lineUid, bet.gameId, bet.roundId]))
    row.betAmount += bet.betAmount
    row.payoutAmount += bet.payoutAmount
    row.ggr += bet.betAmount - bet.payoutAmount
    row.rounds = row.roundIds.size
    row.members = row.memberIds.size
    groups.set(id, row)
  }
  return [...groups.values()].map(
    ({ id, name, currency, rounds, members, betAmount, payoutAmount, ggr }) => ({
      id,
      name,
      currency,
      rounds,
      members,
      betAmount,
      payoutAmount,
      ggr
    })
  )
}

export function formatMerchantAmount(value: number, precision: number, grouping = true) {
  return new Intl.NumberFormat('zh-TW', {
    useGrouping: grouping,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(value)
}

export function merchantReportCsv(
  rows: MerchantReportSummary[],
  totals: MerchantReportSummary[],
  filters: MerchantReportFilters,
  precision: (currency: string) => number
) {
  const escape = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`
  const safeName = (name: string) => (/^[=+\-@\t\r]/.test(name) ? `'${name}` : name)
  const headers = [
    '類型',
    '維度',
    '原幣',
    '局數',
    '線路會員數',
    '投注',
    '派彩',
    '遊戲輸贏',
    '開始日期',
    '結束日期',
    '時區',
    '測試範圍'
  ]
  const records = [
    ...rows.map((row) => ({ ...row, kind: '列表' })),
    ...totals.map((row) => ({ ...row, kind: '分幣總計' }))
  ].map((row) => [
    row.kind,
    safeName(row.name),
    row.currency,
    row.rounds,
    row.members,
    ...[row.betAmount, row.payoutAmount, row.ggr].map((value) =>
      formatMerchantAmount(value, precision(row.currency), false)
    ),
    ...filters.range,
    'Asia/Taipei',
    filters.excludeTest ? '排除測試會員' : '包含測試會員'
  ])
  return '\uFEFF' + [headers, ...records].map((row) => row.map(escape).join(',')).join('\r\n')
}
