/** Calendar dates in the report timezone; current periods end today. */
export function reportDateRange(kind: string, now = new Date()): [Date, Date] {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now)
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value)
  const today = new Date(part('year'), part('month') - 1, part('day'), 12)
  const start = new Date(today), end = new Date(today)
  const mondayOffset = (today.getDay() + 6) % 7
  if (kind === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1) }
  if (kind === 'week') start.setDate(start.getDate() - mondayOffset)
  if (kind === 'lastWeek') {
    start.setDate(start.getDate() - mondayOffset - 7)
    end.setDate(end.getDate() - mondayOffset - 1)
  }
  if (kind === 'month') start.setDate(1)
  if (kind === 'lastMonth') { start.setDate(1); start.setMonth(start.getMonth() - 1); end.setDate(0) }
  return [start, end]
}

export const reportDateShortcuts = [
  ['本日', 'today'], ['昨日', 'yesterday'], ['本周', 'week'],
  ['上週', 'lastWeek'], ['本月', 'month'], ['上月', 'lastMonth']
].map(([text, kind]) => ({ text, value: () => reportDateRange(kind) }))
