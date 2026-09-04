import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CurrencyConfigRecord,
  DailyExchangeRateRecord,
  ExchangeRateAlertRecord,
  ExchangeRateSourceRecord,
  ExchangeRateUpdateLog,
  FinanceRoundingRule,
  SettlementRuleConfig
} from '@/types/game-provider'

const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)

const currencySeeds: Array<[string, string, string, string, number, number]> = [
  ['USD', '美元', '$', '840', 2, 1],
  ['USDT', '泰達幣', '₮', '—', 6, 1.001],
  ['TWD', '新臺幣', 'NT$', '901', 0, 0.0312],
  ['PHP', '菲律賓披索', '₱', '608', 2, 0.0175],
  ['JPY', '日圓', '¥', '392', 0, 0.0068],
  ['VND', '越南盾', '₫', '704', 0, 0.000038],
  ['THB', '泰銖', '฿', '764', 2, 0.028],
  ['IDR', '印尼盾', 'Rp', '360', 0, 0.000061],
  ['MYR', '馬來西亞令吉', 'RM', '458', 2, 0.236],
  ['KRW', '韓圜', '₩', '410', 0, 0.00072],
  ['CNY', '人民幣', '¥', '156', 2, 0.14]
]

export const defaultExchangeRate = (from: string, to: string) => {
  if (from === to) return 1
  const fromValue = currencySeeds.find(([code]) => code === from)?.[5]
  const toValue = currencySeeds.find(([code]) => code === to)?.[5]
  if (!fromValue || !toValue) return 1
  return Number((fromValue / toValue).toFixed(6))
}

export const applyFinancePrecision = (
  value: number,
  precision: number,
  rule: FinanceRoundingRule
) => {
  const factor = 10 ** precision
  if (rule === '無條件捨去') return Math.trunc(value * factor) / factor
  if (rule === '無條件進位') return Math.ceil(value * factor) / factor
  if (rule === '銀行家捨入') {
    const scaled = value * factor
    const floor = Math.floor(scaled)
    const fraction = scaled - floor
    if (Math.abs(fraction - 0.5) < Number.EPSILON * Math.abs(scaled))
      return (floor % 2 === 0 ? floor : floor + 1) / factor
  }
  const scaled = value * factor
  return Math.round(scaled + Number.EPSILON * Math.abs(scaled)) / factor
}

export const useFinanceSettingsStore = defineStore('financeSettingsStore', () => {
  const currencies = ref<CurrencyConfigRecord[]>(
    currencySeeds.map(([code, name, symbol, numericCode, decimalPlaces], index) => ({
      code,
      name,
      symbol,
      numericCode,
      transactionEnabled: true,
      settlementEnabled: ['USD', 'USDT', 'TWD', 'PHP'].includes(code),
      decimalPlaces,
      minimumUnit: 1 / 10 ** decimalPlaces,
      status: 'Active',
      sort: index + 1,
      updatedAt: '2026-09-03 15:20'
    }))
  )

  const sources = ref<ExchangeRateSourceRecord[]>([
    {
      id: 'FXS-001',
      name: '平台每日匯率',
      type: 'Internal',
      priority: 1,
      refreshMinutes: 1440,
      status: 'Active',
      health: 'Normal',
      lastSyncedAt: '2026-09-04 02:00'
    },
    {
      id: 'FXS-002',
      name: '主要市場匯率 API',
      type: 'API',
      priority: 2,
      refreshMinutes: 60,
      status: 'Active',
      health: 'Normal',
      lastSyncedAt: '2026-09-04 10:00'
    },
    {
      id: 'FXS-003',
      name: '財務人工匯率',
      type: 'Manual',
      priority: 3,
      refreshMinutes: 0,
      status: 'Active',
      health: 'Normal',
      lastSyncedAt: '2026-09-03 16:40'
    },
    {
      id: 'FXS-004',
      name: '備援市場匯率 API',
      type: 'API',
      priority: 4,
      refreshMinutes: 120,
      status: 'Inactive',
      health: 'Delayed',
      lastSyncedAt: '2026-09-03 08:00'
    }
  ])

  const basePairs = [
    'USD/TWD',
    'USD/PHP',
    'USD/JPY',
    'USD/VND',
    'USD/THB',
    'USD/IDR',
    'USD/MYR',
    'USD/KRW',
    'USD/CNY',
    'USD/USDT'
  ]
  const dailyRates = ref<DailyExchangeRateRecord[]>(
    basePairs.flatMap((pair, pairIndex) =>
      ['2026-09-04', '2026-09-03', '2026-09-02'].map((date, dateIndex) => {
        const [fromCurrency, toCurrency] = pair.split('/')
        const baseRate = defaultExchangeRate(fromCurrency, toCurrency) * (1 + dateIndex * 0.0012)
        const adjustmentPercent = pairIndex % 4 === 0 ? 0.15 : 0
        const status = dateIndex === 0 ? 'Published' : 'Locked'
        return {
          id: `FXR-${date.replaceAll('-', '')}-${String(pairIndex + 1).padStart(3, '0')}`,
          date,
          fromCurrency,
          toCurrency,
          baseRate: Number(baseRate.toFixed(6)),
          adjustmentPercent,
          finalRate: Number((baseRate * (1 + adjustmentPercent / 100)).toFixed(6)),
          sourceId: 'FXS-001',
          status,
          publishedAt: `${date} 02:05`,
          lockedAt: dateIndex ? `${date} 23:59` : undefined,
          updatedAt: `${date} 02:05`
        } as DailyExchangeRateRecord
      })
    )
  )

  const alerts = ref<ExchangeRateAlertRecord[]>(
    basePairs.slice(0, 7).map((pair, index) => ({
      id: `FXA-${String(index + 1).padStart(3, '0')}`,
      currencyPair: pair,
      thresholdPercent: index < 3 ? 2 : 3,
      currentChangePercent: index === 1 ? 2.46 : Number((0.3 + index * 0.18).toFixed(2)),
      status: index === 1 ? 'Triggered' : 'Normal',
      enabled: true,
      lastTriggeredAt: index === 1 ? '2026-09-04 09:20' : undefined,
      updatedAt: '2026-09-04 09:20'
    }))
  )

  const logs = ref<ExchangeRateUpdateLog[]>([
    {
      id: 'FXL-0004',
      target: 'USD/PHP',
      action: '觸發匯率預警',
      beforeValue: '0.82%',
      afterValue: '2.46%',
      operator: '系統',
      createdAt: '2026-09-04 09:20',
      note: '超過 2% 預警門檻'
    },
    {
      id: 'FXL-0003',
      target: '2026-09-04 每日匯率',
      action: '發布匯率',
      beforeValue: '草稿',
      afterValue: '已發布',
      operator: '財務主管',
      createdAt: '2026-09-04 02:05',
      note: '套用於當日交易及結算快照'
    },
    {
      id: 'FXL-0002',
      target: 'USD/TWD',
      action: '調整匯率',
      beforeValue: '32.051282',
      afterValue: '32.099359',
      operator: '財務專員',
      createdAt: '2026-09-04 01:58',
      note: '加成 0.15%'
    },
    {
      id: 'FXL-0001',
      target: '平台每日匯率',
      action: '同步來源',
      beforeValue: '2026-09-03',
      afterValue: '2026-09-04',
      operator: '系統',
      createdAt: '2026-09-04 01:50',
      note: '同步完成'
    }
  ])

  const settlementRule = ref<SettlementRuleConfig>({
    defaultCurrency: 'USD',
    cycle: 'Monthly',
    rateTiming: 'Period End',
    rateSourceId: 'FXS-001',
    amountPrecision: 2,
    roundingRule: '四捨五入',
    effectiveFrom: '2026-09-01',
    status: 'Active',
    updatedAt: '2026-09-03 16:00'
  })

  const transactionCurrencies = computed(() =>
    currencies.value.filter((item) => item.status === 'Active' && item.transactionEnabled)
  )
  const settlementCurrencies = computed(() =>
    currencies.value.filter((item) => item.status === 'Active' && item.settlementEnabled)
  )
  const publishedRates = computed(() =>
    dailyRates.value.filter((item) => item.status === 'Published')
  )

  const addLog = (
    target: string,
    action: string,
    beforeValue: string,
    afterValue: string,
    note: string
  ) => {
    logs.value.unshift({
      id: `FXL-${String(logs.value.length + 1).padStart(4, '0')}`,
      target,
      action,
      beforeValue,
      afterValue,
      operator: 'Super Admin',
      createdAt: now(),
      note
    })
  }

  const getExchangeRate = (from: string, to: string) => {
    if (from === to) return 1
    const direct = dailyRates.value.find(
      (item) => item.fromCurrency === from && item.toCurrency === to && item.status === 'Published'
    )
    if (direct) return direct.finalRate
    const reverse = dailyRates.value.find(
      (item) => item.fromCurrency === to && item.toCurrency === from && item.status === 'Published'
    )
    if (reverse) return Number((1 / reverse.finalRate).toFixed(6))
    return defaultExchangeRate(from, to)
  }

  const updateCurrency = (code: string, changes: Partial<CurrencyConfigRecord>) => {
    const item = currencies.value.find((row) => row.code === code)
    if (!item) return
    const before = JSON.stringify({
      transactionEnabled: item.transactionEnabled,
      settlementEnabled: item.settlementEnabled,
      decimalPlaces: item.decimalPlaces,
      status: item.status
    })
    Object.assign(item, changes, { updatedAt: now() })
    addLog(code, '更新幣別設定', before, JSON.stringify(changes), '幣別主檔已更新')
  }

  const updateSource = (id: string, changes: Partial<ExchangeRateSourceRecord>) => {
    const item = sources.value.find((row) => row.id === id)
    if (!item) return
    const before = `${item.status} / 優先 ${item.priority}`
    Object.assign(item, changes)
    addLog(
      item.name,
      '更新匯率來源',
      before,
      `${item.status} / 優先 ${item.priority}`,
      '來源設定已更新'
    )
  }

  const createRate = (
    payload: Omit<DailyExchangeRateRecord, 'id' | 'finalRate' | 'status' | 'updatedAt'>
  ) => {
    const id = `FXR-${payload.date.replaceAll('-', '')}-${String(dailyRates.value.length + 1).padStart(3, '0')}`
    dailyRates.value.unshift({
      ...payload,
      id,
      finalRate: Number((payload.baseRate * (1 + payload.adjustmentPercent / 100)).toFixed(6)),
      status: 'Draft',
      updatedAt: now()
    })
    addLog(
      `${payload.fromCurrency}/${payload.toCurrency}`,
      '建立每日匯率',
      '無',
      '草稿',
      '等待發布'
    )
    return id
  }

  const updateRateAdjustment = (id: string, adjustmentPercent: number) => {
    const item = dailyRates.value.find((row) => row.id === id)
    if (!item || item.status === 'Locked') return false
    const before = item.finalRate.toString()
    item.adjustmentPercent = adjustmentPercent
    item.finalRate = Number((item.baseRate * (1 + adjustmentPercent / 100)).toFixed(6))
    item.updatedAt = now()
    addLog(
      `${item.fromCurrency}/${item.toCurrency}`,
      '調整匯率',
      before,
      item.finalRate.toString(),
      `調整比例 ${adjustmentPercent}%`
    )
    return true
  }

  const publishRate = (id: string) => {
    const item = dailyRates.value.find((row) => row.id === id)
    if (!item || item.status !== 'Draft') return false
    item.status = 'Published'
    item.publishedAt = now()
    item.updatedAt = now()
    addLog(
      `${item.fromCurrency}/${item.toCurrency}`,
      '發布匯率',
      '草稿',
      '已發布',
      '正式提供交易與結算使用'
    )
    return true
  }

  const acknowledgeAlert = (id: string) => {
    const item = alerts.value.find((row) => row.id === id)
    if (!item || item.status !== 'Triggered') return false
    item.status = 'Acknowledged'
    item.updatedAt = now()
    addLog(item.currencyPair, '確認匯率預警', '已觸發', '已確認', '財務人員已確認異常波動')
    return true
  }

  const updateAlert = (id: string, changes: Partial<ExchangeRateAlertRecord>) => {
    const item = alerts.value.find((row) => row.id === id)
    if (!item) return
    Object.assign(item, changes, { updatedAt: now() })
    addLog(item.currencyPair, '更新預警規則', '原設定', '新設定', `門檻 ${item.thresholdPercent}%`)
  }

  const updateSettlementRule = (changes: Partial<SettlementRuleConfig>) => {
    const before = JSON.stringify(settlementRule.value)
    Object.assign(settlementRule.value, changes, { updatedAt: now() })
    addLog(
      '結算規則',
      '更新結算設定',
      before,
      JSON.stringify(changes),
      `自 ${settlementRule.value.effectiveFrom} 生效`
    )
  }

  const roundSettlementAmount = (value: number) =>
    applyFinancePrecision(
      value,
      settlementRule.value.amountPrecision,
      settlementRule.value.roundingRule
    )

  return {
    currencies,
    sources,
    dailyRates,
    alerts,
    logs,
    settlementRule,
    transactionCurrencies,
    settlementCurrencies,
    publishedRates,
    getExchangeRate,
    updateCurrency,
    updateSource,
    createRate,
    updateRateAdjustment,
    publishRate,
    acknowledgeAlert,
    updateAlert,
    updateSettlementRule,
    roundSettlementAmount
  }
})
