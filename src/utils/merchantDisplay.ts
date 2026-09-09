import { formatMerchantAmount } from './merchantReporting'

const amountKeys = new Set([
  'amount',
  'betAmount',
  'payoutAmount',
  'ggr',
  'balance',
  'differenceAmount'
])

const statusLabels: Record<string, string> = {
  Scheduled: '已排程',
  'Rolled Back': '已回滾',
  'Pending Confirmation': '待確認',
  'Waiting Partner': '待合作方回覆',
  'Waiting Internal': '待內部處理',
  Accepted: '已接受',
  Active: '啟用',
  Inactive: '未啟用',
  Blocked: '已封鎖',
  Maintenance: '維護中',
  Pending: '待處理',
  Suspended: '已暫停',
  Disabled: '已停用',
  Draft: '草稿',
  Configuring: '設定中',
  'Sandbox Enabled': 'Sandbox 已啟用',
  Testing: '測試中',
  'Not Started': '尚未測試',
  Passed: '已通過',
  Failed: '失敗',
  'Production Pending': '正式環境待審',
  Closed: '已關閉',
  Terminated: '已終止',
  Published: '已發布',
  'Not Issued': '尚未核發',
  Rotating: '輪替中',
  Revoked: '已撤銷',
  Expired: '已過期',
  'In Progress': '進行中',
  Settled: '已結算',
  Cancelled: '已取消',
  Refunded: '已退款',
  Exception: '異常',
  Success: '成功',
  Processing: '處理中',
  'Pending Review': '待審核',
  Approved: '已核准',
  Rejected: '已拒絕',
  Paid: '已付款',
  Voided: '已作廢',
  Locked: '已鎖定',
  Difference: '有差異',
  Confirmed: '已確認',
  Resolved: '已處理',
  Completed: '已完成',
  Open: '待處理',
  Investigating: '調查中',
  Available: '可用',
  Partial: '部分可用',
  Unsupported: '不支援',
  'Missing Data': '資料缺失'
}

/** Unknown states remain neutral; labels, not color alone, convey the state. */
export function merchantStatusType(value: unknown): 'success' | 'warning' | 'danger' | 'info' {
  const status = String(value)
  if (
    [
      'Active',
      'Passed',
      'Published',
      'Settled',
      'Success',
      'Approved',
      'Paid',
      'Locked',
      'Confirmed',
      'Resolved',
      'Completed',
      'Available',
      'Accepted'
    ].includes(status)
  )
    return 'success'
  if (
    [
      'Blocked',
      'Failed',
      'Exception',
      'Rejected',
      'Difference',
      'Revoked',
      'Missing Data'
    ].includes(status)
  )
    return 'danger'
  if (
    [
      'Pending',
      'Maintenance',
      'Configuring',
      'Testing',
      'Production Pending',
      'Rotating',
      'In Progress',
      'Processing',
      'Pending Review',
      'Pending Confirmation',
      'Waiting Partner',
      'Waiting Internal',
      'Investigating',
      'Partial',
      'Scheduled',
      'Open',
      '已送出'
    ].includes(status)
  )
    return 'warning'
  return 'info'
}

/** Display only: never round or overwrite source transactions or historical snapshots. */
export function merchantField(row: object, key: string, precision: (currency: string) => number) {
  const record = row as Record<string, unknown>
  const value = record[key]
  if (key === 'previousAccumulatedAmount') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '待定'
    const currency = String(record.settlementCurrency || record.currency || '')
    return currency
      ? `${formatMerchantAmount(value, precision(currency))} ${currency}`
      : String(value)
  }
  if (key === 'payoutAmount' && record.gameName && record.status === 'In Progress') return '待結算'
  if (value === undefined || value === null || value === '') return '未提供'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (key === 'restriction')
    return (
      (
        { None: '無限制', Scheduled: '已排程', Active: '限制中', Expired: '已到期' } as Record<
          string,
          string
        >
      )[String(value)] || value
    )
  if (key === 'status' || key === 'credentialStatus') return statusLabels[String(value)] || value
  if (typeof value === 'number' && amountKeys.has(key)) {
    if (!Number.isFinite(value)) return '未提供'
    const currency = String(record.currency || '')
    if (!currency) return String(value)
    const formatted = formatMerchantAmount(value, precision(currency))
    return key === 'payoutAmount' && record.gameName && record.status === 'Exception'
      ? `${formatted}（異常，未確認）`
      : formatted
  }
  return value
}
