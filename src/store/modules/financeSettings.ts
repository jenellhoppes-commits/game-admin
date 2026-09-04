import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CurrencyConfigRecord,
  DailyExchangeRateRecord,
  ExchangeAdjustmentMode,
  ExchangeAdjustmentUnit,
  ExchangeRateAlertRecord,
  ExchangeRateConfigRecord,
  ExchangeRateSourceRecord,
  ExchangeRateType,
  ExchangeRateUpdateLog,
  FinanceRoundingRule,
  SettlementRuleConfig
} from '@/types/game-provider'

const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)

const adjustedRate = (
  rate: number,
  mode: ExchangeAdjustmentMode,
  value: number,
  unit: ExchangeAdjustmentUnit = 'Percent'
) => {
  const direction = mode === 'Add' ? 1 : mode === 'Subtract' ? -1 : 0
  return unit === 'Fixed' ? rate + direction * value : rate * (1 + (direction * value) / 100)
}

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
  ['CNY', '人民幣', '¥', '156', 2, 0.14],
  ['HKD', '港幣', 'HK$', '344', 2, 0.128],
  ['SGD', '新加坡元', 'S$', '702', 2, 0.78],
  ['INR', '印度盧比', '₹', '356', 2, 0.0114],
  ['AUD', '澳幣', 'A$', '036', 2, 0.65],
  ['EUR', '歐元', '€', '978', 2, 1.08],
  ['ASGU', '平台系統幣', 'A', '—', 6, 1.001]
]

export const defaultExchangeRate = (from: string, to: string) => {
  if (from === to) return 1
  const fromValue = currencySeeds.find(([code]) => code === from)?.[5]
  const toValue = currencySeeds.find(([code]) => code === to)?.[5]
  if (!fromValue || !toValue) return Number.NaN
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
      currencyType: code === 'ASGU' ? 'System' : code === 'USDT' ? 'Crypto' : 'Fiat',
      transactionEnabled: true,
      settlementEnabled: true,
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
    },
    {
      id: 'FXS-005',
      name: '固定錨定匯率',
      type: 'Internal',
      priority: 1,
      refreshMinutes: 0,
      status: 'Active',
      health: 'Normal',
      lastSyncedAt: '2026-09-04 00:00'
    }
  ])

  const basePairs = [
    'USDT/USD',
    'USDT/TWD',
    'USDT/PHP',
    'USDT/JPY',
    'USDT/VND',
    'USDT/THB',
    'USDT/IDR',
    'USDT/MYR',
    'USDT/KRW',
    'USDT/CNY',
    'USDT/HKD',
    'USDT/SGD',
    'USDT/INR',
    'USDT/AUD',
    'USDT/EUR',
    'USDT/ASGU'
  ]

  const rateConfigs = ref<ExchangeRateConfigRecord[]>(
    basePairs.map((pair, index) => {
      const [fromCurrency, toCurrency] = pair.split('/')
      const rateType: ExchangeRateType = toCurrency === 'ASGU' ? 'Pegged' : 'Market'
      const configuredRate = rateType === 'Pegged' ? 1 : undefined
      const todaySourceRate = configuredRate ?? defaultExchangeRate(fromCurrency, toCurrency)
      const adjustmentMode: ExchangeAdjustmentMode =
        rateType === 'Market' && index % 4 === 0 ? 'Add' : 'None'
      const adjustmentValue = adjustmentMode === 'Add' ? 0.15 : 0
      return {
        id: `FXC-${String(index + 1).padStart(3, '0')}`,
        fromCurrency,
        toCurrency,
        rateType,
        configuredRate,
        sourceId: rateType === 'Pegged' ? 'FXS-005' : index < 7 ? 'FXS-001' : 'FXS-002',
        dailyFetchTime: rateType === 'Market' ? '02:00' : '00:00',
        adjustmentMode,
        adjustmentUnit: 'Percent',
        adjustmentValue,
        precision: 6,
        roundingRule: '四捨五入',
        effectiveVersion: `v2026.07.01-${String(index + 1).padStart(2, '0')}`,
        effectiveFrom: '2026-07-01',
        status: 'Active',
        todaySourceRate,
        todayFinalRate: Number(
          adjustedRate(todaySourceRate, adjustmentMode, adjustmentValue, 'Percent').toFixed(6)
        ),
        lockedAt: `2026-09-04 ${rateType === 'Market' ? '02:05' : '00:00'}`,
        updatedAt: '2026-09-03 16:00'
      }
    })
  )
  const dailyRates = ref<DailyExchangeRateRecord[]>(
    basePairs.flatMap((pair, pairIndex) =>
      ['2026-09-04', '2026-09-03', '2026-09-02', '2026-08-31', '2026-07-31'].map(
        (date, dateIndex) => {
          const [fromCurrency, toCurrency] = pair.split('/')
          const config = rateConfigs.value[pairIndex]
          const baseRate =
            config.rateType === 'Market'
              ? defaultExchangeRate(fromCurrency, toCurrency) * (1 + dateIndex * 0.0012)
              : config.configuredRate || 1
          const adjustmentPercent =
            config.adjustmentMode === 'Add'
              ? config.adjustmentValue
              : config.adjustmentMode === 'Subtract'
                ? -config.adjustmentValue
                : 0
          const status = 'Locked' as const
          return {
            id: `FXR-${date.replaceAll('-', '')}-${String(pairIndex + 1).padStart(3, '0')}`,
            date,
            fromCurrency,
            toCurrency,
            rateType: config.rateType,
            baseRate: Number(baseRate.toFixed(6)),
            adjustmentPercent,
            adjustmentMode: config.adjustmentMode,
            adjustmentUnit: config.adjustmentUnit,
            adjustmentValue: config.adjustmentValue,
            finalRate: applyFinancePrecision(
              adjustedRate(
                baseRate,
                config.adjustmentMode,
                config.adjustmentValue,
                config.adjustmentUnit
              ),
              config.precision,
              config.roundingRule
            ),
            sourceId: config.sourceId,
            status,
            fetchedAt: `${date} ${config.rateType === 'Market' ? '02:00' : '00:00'}`,
            publishedAt: `${date} ${config.rateType === 'Market' ? '02:05' : '00:00'}`,
            lockedAt: `${date} ${config.rateType === 'Market' ? '02:05' : '00:00'}`,
            settingVersion: config.effectiveVersion,
            settlementUsed: dateIndex > 0 && pairIndex % 3 !== 2,
            settlementIds:
              dateIndex > 0 && pairIndex % 3 !== 2
                ? [`STL-${date.replaceAll('-', '')}-${String(pairIndex + 1).padStart(3, '0')}`]
                : [],
            fetchStatus:
              config.rateType === 'Market' && pairIndex === 7 && dateIndex === 2
                ? 'Failed'
                : config.rateType === 'Market' && pairIndex === 1 && dateIndex === 1
                  ? 'Corrected'
                  : 'Success',
            failureReason:
              config.rateType === 'Market' && pairIndex === 7 && dateIndex === 2
                ? '主要來源逾時，當日改採前一日鎖定值'
                : undefined,
            correctionNote:
              config.rateType === 'Market' && pairIndex === 1 && dateIndex === 1
                ? '來源商補發資料後於 08:30 完成更正'
                : undefined,
            updatedAt: `${date} 02:05`
          } as DailyExchangeRateRecord
        }
      )
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
      target: 'USDT/PHP',
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
      target: 'USDT/TWD',
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
  const enabledCurrencies = computed(() =>
    currencies.value.filter((item) => item.status === 'Active')
  )
  const publishedRates = computed(() => dailyRates.value.filter((item) => item.status === 'Locked'))
  const rateConfigVersions = ref<ExchangeRateConfigRecord[]>([])

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

  const resolveExchangeRate = (from: string, to: string, requestedDate?: string) => {
    const activeCurrency = (code: string) =>
      code === 'USDT' ||
      currencies.value.some((item) => item.code === code && item.status === 'Active')
    const activeConfig = (code: string) =>
      code === 'USDT' ||
      rateConfigs.value.some((item) => item.toCurrency === code && item.status === 'Active')
    const lockedRows = (code: string) =>
      code === 'USDT'
        ? []
        : dailyRates.value
            .filter(
              (item) =>
                item.fromCurrency === 'USDT' &&
                item.toCurrency === code &&
                item.status === 'Locked' &&
                (!requestedDate || item.date === requestedDate)
            )
            .sort((a, b) => b.date.localeCompare(a.date))

    const missing = [from, to].filter(
      (code, index, all) =>
        all.indexOf(code) === index && (!activeCurrency(code) || !activeConfig(code))
    )
    if (missing.length) {
      return {
        ok: false as const,
        snapshotIds: [] as string[],
        missingCurrencies: missing,
        message: `幣別 ${missing.join('、')} 尚未啟用，或缺少啟用中的匯率設定。`
      }
    }
    if (from === to) {
      return {
        ok: true as const,
        rate: 1,
        rateDate: requestedDate,
        snapshotIds: [] as string[],
        missingCurrencies: [] as string[]
      }
    }

    const fromRows = lockedRows(from)
    const toRows = lockedRows(to)
    const candidateDates =
      from === 'USDT'
        ? toRows.map((item) => item.date)
        : to === 'USDT'
          ? fromRows.map((item) => item.date)
          : fromRows
              .map((item) => item.date)
              .filter((date) => toRows.some((item) => item.date === date))
    const rateDate = requestedDate || candidateDates[0]
    const fromRow = from === 'USDT' ? undefined : fromRows.find((item) => item.date === rateDate)
    const toRow = to === 'USDT' ? undefined : toRows.find((item) => item.date === rateDate)
    const missingSnapshots = [
      from !== 'USDT' && !fromRow ? from : '',
      to !== 'USDT' && !toRow ? to : ''
    ].filter(Boolean)
    if (!rateDate || missingSnapshots.length) {
      const dateText = requestedDate ? `${requestedDate} ` : ''
      return {
        ok: false as const,
        snapshotIds: [] as string[],
        missingCurrencies: missingSnapshots,
        message: `${dateText}缺少 ${missingSnapshots.join('、') || `${from}／${to}`} 的已鎖定匯率快照。`
      }
    }
    const fromRate = fromRow?.finalRate ?? 1
    const toRate = toRow?.finalRate ?? 1
    return {
      ok: true as const,
      rate: toRate / fromRate,
      rateDate,
      snapshotIds: [...new Set([fromRow?.id, toRow?.id].filter((id): id is string => Boolean(id)))],
      missingCurrencies: [] as string[]
    }
  }

  const getExchangeRate = (from: string, to: string, date?: string) =>
    resolveExchangeRate(from, to, date).rate ?? Number.NaN

  const getExchangeRateSnapshotIds = (from: string, to: string, date?: string) =>
    resolveExchangeRate(from, to, date).snapshotIds

  const createCurrency = (
    payload: Omit<CurrencyConfigRecord, 'sort' | 'updatedAt' | 'minimumUnit'>
  ) => {
    const code = payload.code.trim().toUpperCase()
    if (!code || currencies.value.some((item) => item.code === code)) return false
    currencies.value.push({
      ...payload,
      code,
      minimumUnit: 1 / 10 ** payload.decimalPlaces,
      sort: currencies.value.length + 1,
      updatedAt: now()
    })
    addLog(code, '新增幣別', '無', payload.status === 'Active' ? '啟用' : '停用', '幣別主檔已建立')
    return true
  }

  const updateCurrency = (code: string, changes: Partial<CurrencyConfigRecord>) => {
    const item = currencies.value.find((row) => row.code === code)
    if (!item) return false
    if (
      code === 'USDT' &&
      (changes.status === 'Inactive' ||
        changes.transactionEnabled === false ||
        changes.settlementEnabled === false ||
        (changes.currencyType && changes.currencyType !== 'Crypto'))
    )
      return false
    const before = JSON.stringify({
      transactionEnabled: item.transactionEnabled,
      settlementEnabled: item.settlementEnabled,
      decimalPlaces: item.decimalPlaces,
      status: item.status
    })
    Object.assign(item, changes, { updatedAt: now() })
    if (changes.status === 'Inactive') {
      rateConfigs.value
        .filter((config) => config.toCurrency === code)
        .forEach((config) => {
          config.status = 'Inactive'
          config.updatedAt = now()
        })
    }
    addLog(code, '更新幣別設定', before, JSON.stringify(changes), '幣別主檔已更新')
    return true
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

  const createRateConfig = (
    payload: Omit<
      ExchangeRateConfigRecord,
      'id' | 'todaySourceRate' | 'todayFinalRate' | 'lockedAt' | 'updatedAt'
    >
  ) => {
    const targetCurrency = enabledCurrencies.value.find((item) => item.code === payload.toCurrency)
    if (!targetCurrency || payload.fromCurrency !== 'USDT' || payload.toCurrency === 'USDT')
      return false
    if (rateConfigs.value.some((item) => item.toCurrency === payload.toCurrency)) return false
    if (payload.rateType !== 'Market' && (!payload.configuredRate || payload.configuredRate <= 0))
      return false

    const todaySourceRate =
      payload.rateType === 'Market'
        ? defaultExchangeRate('USDT', payload.toCurrency)
        : payload.configuredRate || 1
    if (!Number.isFinite(todaySourceRate) || todaySourceRate <= 0) return false
    const effectiveVersion = `v${payload.effectiveFrom.replaceAll('-', '.')}-01`
    const todayFinalRate = Number(
      applyFinancePrecision(
        adjustedRate(
          todaySourceRate,
          payload.adjustmentMode,
          payload.adjustmentValue,
          payload.adjustmentUnit
        ),
        payload.precision,
        payload.roundingRule
      )
    )
    const id = `FXC-${String(rateConfigs.value.length + 1).padStart(3, '0')}`
    rateConfigs.value.unshift({
      ...payload,
      effectiveVersion,
      id,
      todaySourceRate,
      todayFinalRate,
      lockedAt:
        payload.status === 'Active'
          ? `${payload.effectiveFrom} ${payload.rateType === 'Market' ? payload.dailyFetchTime : '00:00'}`
          : undefined,
      updatedAt: now()
    })
    addLog(
      `USDT/${payload.toCurrency}`,
      '新增匯率設定',
      '無',
      effectiveVersion,
      '等待每日排程取得並鎖定匯率'
    )
    return id
  }

  const updateRateConfig = (id: string, changes: Partial<ExchangeRateConfigRecord>) => {
    const item = rateConfigs.value.find((row) => row.id === id)
    if (!item) return false
    if (
      changes.status === 'Active' &&
      !currencies.value.some(
        (currency) => currency.code === item.toCurrency && currency.status === 'Active'
      )
    )
      return false
    const before = `${item.effectiveVersion} / ${item.status}`
    rateConfigVersions.value.unshift({
      ...item,
      id: `${item.id}-REV-${rateConfigVersions.value.length + 1}`
    })
    const versionDate = changes.effectiveFrom || new Date().toISOString().slice(0, 10)
    const versionSequence =
      rateConfigVersions.value.filter((version) => version.toCurrency === item.toCurrency).length +
      1
    Object.assign(item, changes, {
      fromCurrency: 'USDT',
      toCurrency: item.toCurrency,
      effectiveVersion: `v${versionDate.replaceAll('-', '.')}-${String(versionSequence).padStart(2, '0')}`
    })
    if (item.toCurrency === 'ASGU') {
      item.rateType = 'Pegged'
      item.configuredRate = 1
      item.sourceId = 'FXS-005'
    }
    item.todaySourceRate =
      item.rateType === 'Market'
        ? defaultExchangeRate('USDT', item.toCurrency)
        : item.configuredRate || item.todaySourceRate
    if (item.rateType !== 'Market') {
      item.adjustmentMode = 'None'
      item.adjustmentValue = 0
    }
    item.todayFinalRate = Number(
      applyFinancePrecision(
        adjustedRate(
          item.todaySourceRate,
          item.adjustmentMode,
          item.adjustmentValue,
          item.adjustmentUnit
        ),
        item.precision,
        item.roundingRule
      )
    )
    item.updatedAt = now()
    addLog(
      `USDT/${item.toCurrency}`,
      '更新匯率設定',
      before,
      `${item.effectiveVersion} / ${item.status}`,
      '新版本只影響生效日後的每日匯率'
    )
    return true
  }

  const createRate = (
    payload: Omit<DailyExchangeRateRecord, 'id' | 'finalRate' | 'status' | 'updatedAt'>
  ) => {
    const id = `FXR-${payload.date.replaceAll('-', '')}-${String(dailyRates.value.length + 1).padStart(3, '0')}`
    dailyRates.value.unshift({
      ...payload,
      id,
      finalRate: applyFinancePrecision(
        adjustedRate(
          payload.baseRate,
          payload.adjustmentMode || (payload.adjustmentPercent >= 0 ? 'Add' : 'Subtract'),
          payload.adjustmentValue ?? Math.abs(payload.adjustmentPercent),
          payload.adjustmentUnit || 'Percent'
        ),
        rateConfigs.value.find((item) => item.toCurrency === payload.toCurrency)?.precision || 6,
        rateConfigs.value.find((item) => item.toCurrency === payload.toCurrency)?.roundingRule ||
          '四捨五入'
      ),
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
    const config = rateConfigs.value.find((row) => row.toCurrency === item.toCurrency)
    item.finalRate = applyFinancePrecision(
      item.baseRate * (1 + adjustmentPercent / 100),
      config?.precision || 6,
      config?.roundingRule || '四捨五入'
    )
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
    item.status = 'Locked'
    item.publishedAt = now()
    item.lockedAt = now()
    item.updatedAt = now()
    addLog(
      `${item.fromCurrency}/${item.toCurrency}`,
      '發布匯率',
      '草稿',
      '已鎖定',
      '正式提供交易與結算使用，鎖定後不可修改'
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
    rateConfigs,
    dailyRates,
    alerts,
    logs,
    settlementRule,
    transactionCurrencies,
    settlementCurrencies,
    enabledCurrencies,
    publishedRates,
    rateConfigVersions,
    resolveExchangeRate,
    getExchangeRate,
    getExchangeRateSnapshotIds,
    createCurrency,
    updateCurrency,
    updateSource,
    createRateConfig,
    updateRateConfig,
    createRate,
    updateRateAdjustment,
    publishRate,
    acknowledgeAlert,
    updateAlert,
    updateSettlementRule,
    roundSettlementAmount
  }
})
