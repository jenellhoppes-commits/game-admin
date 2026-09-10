import { defineStore } from 'pinia'
import { calculateDelivery } from '@/utils/reconciliationDelivery'
import { computed, ref } from 'vue'
import { useBusinessPartnerStore } from './businessPartner'
import { useGameCatalogStore } from './gameCatalog'
import { useTransactionCenterStore } from './transactionCenter'
import { defaultExchangeRate, useFinanceSettingsStore } from './financeSettings'
import type {
  AgentReconciliationRecord,
  AgentSettlementStatement,
  FinanceActionLog,
  FinanceCalculationSnapshot,
  FinanceReconciliationStatus,
  MerchantReconciliationRecord,
  MerchantSettlementStatement,
  ReconciliationDailyRow,
  ReconciliationDifferenceRecord,
  ReconciliationDifferenceStatus,
  ReconciliationGameRow,
  SettlementAdjustmentRecord,
  SettlementBatchRecord,
  SettlementCycle,
  SettlementExchangeSnapshot
} from '@/types/game-provider'

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

let roundMoney = (value: number) => Number(value.toFixed(2))
let getExchangeRate: (from: string, to: string, date?: string) => number = defaultExchangeRate
let getExchangeRateSnapshotIds: (from: string, to: string, date?: string) => string[] = () => []
let resolveExchangeRate: (
  from: string,
  to: string,
  date?: string
) =>
  | {
      ok: true
      rate: number
      rateDate?: string
      snapshotIds: string[]
      missingCurrencies: string[]
    }
  | { ok: false; snapshotIds: string[]; missingCurrencies: string[]; message: string } = (
  from,
  to,
  date
) => {
  const rate = defaultExchangeRate(from, to)
  return Number.isFinite(rate)
    ? { ok: true, rate, rateDate: date, snapshotIds: [], missingCurrencies: [] }
    : { ok: false, snapshotIds: [], missingCurrencies: [from, to], message: '缺少匯率' }
}
let getExchangeRateSource = () => '平台每日匯率'
let getAmountPrecision = () => 2
let getRoundingRule: () => FinanceCalculationSnapshot['roundingRule'] = () => '四捨五入'

const periodEndDate = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return `${period}-${String(lastDay).padStart(2, '0')}`
}

const periodRange = (period: string) => ({
  periodStart: `${period}-01 00:00:00`,
  periodEnd: `${periodEndDate(period)} 23:59:59`
})

const buildSnapshot = (
  settlementBasis: FinanceCalculationSnapshot['settlementBasis'],
  ratePercent: number,
  transactionCurrency: string,
  settlementCurrency: string,
  period: string,
  locked: boolean
): FinanceCalculationSnapshot => ({
  settlementBasis,
  ratePercent,
  transactionCurrency,
  settlementCurrency,
  exchangeRate: getExchangeRate(transactionCurrency, settlementCurrency, periodEndDate(period)),
  exchangeRateSource:
    transactionCurrency === settlementCurrency ? '同幣別' : getExchangeRateSource(),
  exchangeRateSnapshotIds: getExchangeRateSnapshotIds(
    transactionCurrency,
    settlementCurrency,
    periodEndDate(period)
  ),
  exchangeRateTime: `${periodEndDate(period)} 23:59:59`,
  amountPrecision: getAmountPrecision(),
  roundingRule: getRoundingRule(),
  formulaVersion: 'SETTLEMENT-V1.2',
  calculatedAt: locked ? '2026-09-01 02:15' : '2026-09-03 09:30'
})

export const useFinanceCenterStore = defineStore('financeCenterStore', () => {
  const partnerStore = useBusinessPartnerStore()
  const gameStore = useGameCatalogStore()
  const transactionStore = useTransactionCenterStore()
  const financeSettingsStore = useFinanceSettingsStore()
  getExchangeRate = financeSettingsStore.getExchangeRate
  getExchangeRateSnapshotIds = financeSettingsStore.getExchangeRateSnapshotIds
  resolveExchangeRate = financeSettingsStore.resolveExchangeRate
  roundMoney = financeSettingsStore.roundSettlementAmount
  getExchangeRateSource = () =>
    financeSettingsStore.sources.find(
      (item) => item.id === financeSettingsStore.settlementRule.rateSourceId
    )?.name || '平台每日匯率'
  getAmountPrecision = () => financeSettingsStore.settlementRule.amountPrecision
  getRoundingRule = () => financeSettingsStore.settlementRule.roundingRule

  const merchantReconciliations = ref<MerchantReconciliationRecord[]>(
    partnerStore.merchants.flatMap((merchant, merchantIndex) =>
      merchant.lines.slice(0, Math.min(2, merchant.lines.length)).flatMap((line, lineIndex) =>
        ['2026-08', '2026-07'].map((period, periodIndex) => {
          const term = partnerStore.getCurrentMerchantTerm(merchant.id)
          const seed = merchantIndex * 3 + lineIndex * 2 + periodIndex
          const betAmount = 880000 + seed * 53400
          const validBet = roundMoney(betAmount * (0.9 + (seed % 3) * 0.012))
          const payoutAmount = roundMoney(betAmount * (0.925 + (seed % 5) * 0.006))
          const ggr = roundMoney(betAmount - payoutAmount)
          const ratePercent = term?.merchantTermPercent ?? merchant.merchantTermPercent
          const settlementBasis = term?.settlementBasis ?? 'GGR'
          const baseValue =
            settlementBasis === 'GGR' ? ggr : settlementBasis === 'Valid Bet' ? validBet : betAmount
          const adjustmentAmount = seed % 7 === 0 ? 1250 : 0
          const settlementCurrency = term?.settlementCurrency ?? merchant.settlementCurrency
          const exchangeRate = getExchangeRate(
            line.currency,
            settlementCurrency,
            periodEndDate(period)
          )
          const hasDifference = false // 差異於交付時手動記錄，不再建立獨立案件
          const status: FinanceReconciliationStatus =
            periodIndex === 1 ? 'Locked' : hasDifference ? 'Difference' : 'Pending Confirmation'
          const id = `MRC-${period.replace('-', '')}-${String(merchantIndex * 2 + lineIndex + 1).padStart(4, '0')}`
          return {
            id,
            period,
            ...periodRange(period),
            merchantId: merchant.id,
            merchantCode: merchant.code,
            merchantName: merchant.name,
            agentId: merchant.agentId,
            agentName: merchant.agentName,
            lineUid: line.uid,
            currency: line.currency,
            memberCount: 320 + seed * 17,
            betCount: 1280 + seed * 83,
            betAmount,
            validBet,
            payoutAmount,
            jackpotContribution: roundMoney(betAmount * 0.004),
            jackpotPayout: seed % 6 === 0 ? 36000 : 0,
            cancelledAmount: seed % 5 === 0 ? 2200 : 650,
            refundAmount: seed % 4 === 0 ? 1800 : 0,
            ggr,
            initialSettlementAmount: roundMoney(baseValue * (ratePercent / 100) * exchangeRate),
            adjustmentAmount,
            finalSettlementAmount: roundMoney(
              baseValue * (ratePercent / 100) * exchangeRate + adjustmentAmount
            ),
            differenceCount: hasDifference ? 2 : 0,
            unresolvedDifferenceCount: hasDifference ? 2 : 0,
            status,
            snapshot: buildSnapshot(
              settlementBasis,
              ratePercent,
              line.currency,
              settlementCurrency,
              period,
              periodIndex === 1
            ),
            createdAt: periodIndex === 1 ? '2026-08-01 02:00' : '2026-09-01 02:00',
            updatedAt: periodIndex === 1 ? '2026-08-03 16:20' : '2026-09-03 09:30',
            confirmedAt: periodIndex === 1 ? '2026-08-02 14:10' : undefined,
            lockedAt: periodIndex === 1 ? '2026-08-03 16:20' : undefined,
            actualSettlementAmount:
              periodIndex === 1
                ? roundMoney(baseValue * (ratePercent / 100) * exchangeRate + adjustmentAmount)
                : undefined,
            roundingAdjustment: periodIndex === 1 ? 0 : undefined,
            confirmationNote: periodIndex === 1 ? '已依實際入帳金額完成確認' : undefined
          }
        })
      )
    )
  )

  const differences = ref<ReconciliationDifferenceRecord[]>(
    merchantReconciliations.value
      .filter((item) => item.status === 'Difference')
      .flatMap((item, recordIndex) =>
        ['Bet Amount', recordIndex % 2 === 0 ? 'Jackpot' : 'Refund'].map((type, index) => {
          const differenceAmount = index === 0 ? 3280 + recordIndex * 120 : 800 + recordIndex * 55
          const stateSeed = (recordIndex * 2 + index) % 7
          const status = [
            'Investigating',
            'Open',
            'Waiting Partner',
            'Waiting Internal',
            'Resolved',
            'Accepted',
            'Open'
          ][stateSeed] as ReconciliationDifferenceStatus
          const completed = ['Resolved', 'Accepted'].includes(status)
          return {
            id: `DIF-${String(recordIndex * 2 + index + 1).padStart(6, '0')}`,
            reconciliationType: 'Merchant' as const,
            reconciliationId: item.id,
            period: item.period,
            merchantId: item.merchantId,
            merchantName: item.merchantName,
            agentId: item.agentId,
            agentName: item.agentName,
            lineUid: item.lineUid,
            type: type as ReconciliationDifferenceRecord['type'],
            systemValue: index === 0 ? item.betAmount : item.jackpotContribution,
            partnerValue:
              (index === 0 ? item.betAmount : item.jackpotContribution) - differenceAmount,
            differenceAmount,
            currency: item.currency,
            status,
            assignee: status === 'Open' ? undefined : 'Finance Ops',
            description:
              index === 0
                ? '合作方回傳投注彙總與平台帳務明細不一致。'
                : '獎池或退款事件尚未被合作方納入本期彙總。',
            relatedBetIds: transactionStore.bets
              .slice(recordIndex, recordIndex + 2)
              .map((bet) => bet.id),
            relatedTransactionIds: transactionStore.transactions
              .slice(recordIndex, recordIndex + 2)
              .map((transaction) => transaction.id),
            resolution: completed ? '已完成帳務來源核對並記錄處理依據。' : undefined,
            resolutionType: completed
              ? status === 'Accepted'
                ? ('Use Partner Value' as const)
                : ('Use System Value' as const)
              : undefined,
            detectedAt: `2026-09-0${1 + (recordIndex % 2)} ${10 + index}:20`,
            dueAt: `2026-09-0${4 + (recordIndex % 2)} 18:00`,
            updatedAt: `2026-09-0${2 + (recordIndex % 2)} 11:30`
          }
        })
      )
  )

  merchantReconciliations.value.forEach((record) => {
    const related = differences.value.filter((item) => item.reconciliationId === record.id)
    if (!related.length) return
    record.differenceCount = related.length
    record.unresolvedDifferenceCount = related.filter(
      (item) => !['Resolved', 'Accepted', 'Closed'].includes(item.status)
    ).length
    if (record.unresolvedDifferenceCount === 0) record.status = 'Pending Confirmation'
  })

  const buildAgentReconciliations = (): AgentReconciliationRecord[] =>
    partnerStore.agents.flatMap((agent, agentIndex) =>
      ['2026-08', '2026-07'].map((period, periodIndex) => {
        const included = merchantReconciliations.value.filter(
          (record) => record.agentId === agent.id && record.period === period
        )
        const term = partnerStore.getCurrentTerm(agent.id)
        const settlementCurrency = term?.settlementCurrency ?? 'USDT'
        const sumCount = (field: 'memberCount' | 'betCount') =>
          included.reduce((total, record) => total + Number(record[field] || 0), 0)
        const sumAmount = (
          field:
            | 'betAmount'
            | 'validBet'
            | 'payoutAmount'
            | 'jackpotContribution'
            | 'jackpotPayout'
            | 'cancelledAmount'
            | 'refundAmount'
        ) =>
          roundMoney(
            included.reduce(
              (total, record) =>
                total +
                Number(record[field] || 0) *
                  getExchangeRate(record.currency, settlementCurrency, periodEndDate(period)),
              0
            )
          )
        const fallback = 760000 + agentIndex * 42000
        const betAmount = included.length ? sumAmount('betAmount') : fallback
        const validBet = included.length ? sumAmount('validBet') : roundMoney(fallback * 0.91)
        const payoutAmount = included.length
          ? sumAmount('payoutAmount')
          : roundMoney(fallback * 0.94)
        const ggr = roundMoney(betAmount - payoutAmount)
        const ratePercent = term?.ratePercent ?? 8
        const settlementBasis = term?.settlementBasis ?? 'GGR'
        const baseValue =
          settlementBasis === 'GGR' ? ggr : settlementBasis === 'Valid Bet' ? validBet : betAmount
        const unresolvedDifferenceCount = included.reduce(
          (total, record) => total + record.unresolvedDifferenceCount,
          0
        )
        return {
          id: `ARC-${period.replace('-', '')}-${String(agentIndex + 1).padStart(4, '0')}`,
          period,
          ...periodRange(period),
          agentId: agent.id,
          agentCode: agent.code,
          agentName: agent.name,
          merchantCount: new Set(included.map((record) => record.merchantId)).size,
          currency: settlementCurrency,
          memberCount: sumCount('memberCount') || 680 + agentIndex * 30,
          betCount: sumCount('betCount') || 2400 + agentIndex * 120,
          betAmount,
          validBet,
          payoutAmount,
          jackpotContribution: sumAmount('jackpotContribution'),
          jackpotPayout: sumAmount('jackpotPayout'),
          cancelledAmount: sumAmount('cancelledAmount'),
          refundAmount: sumAmount('refundAmount'),
          ggr,
          initialSettlementAmount: roundMoney(baseValue * (ratePercent / 100)),
          adjustmentAmount: 0,
          finalSettlementAmount: roundMoney(baseValue * (ratePercent / 100)),
          differenceCount: unresolvedDifferenceCount,
          unresolvedDifferenceCount,
          includedMerchantReconciliationIds: included.map((record) => record.id),
          status:
            periodIndex === 1
              ? 'Locked'
              : unresolvedDifferenceCount
                ? 'Difference'
                : 'Pending Confirmation',
          snapshot: buildSnapshot(
            settlementBasis,
            ratePercent,
            settlementCurrency,
            settlementCurrency,
            period,
            periodIndex === 1
          ),
          createdAt: periodIndex === 1 ? '2026-08-01 03:00' : '2026-09-01 03:00',
          updatedAt: periodIndex === 1 ? '2026-08-03 17:20' : '2026-09-03 10:00',
          confirmedAt: periodIndex === 1 ? '2026-08-02 15:00' : undefined,
          lockedAt: periodIndex === 1 ? '2026-08-03 17:20' : undefined,
          actualSettlementAmount:
            periodIndex === 1 ? roundMoney(baseValue * (ratePercent / 100)) : undefined,
          roundingAdjustment: periodIndex === 1 ? 0 : undefined,
          confirmationNote: periodIndex === 1 ? '旗下商戶款項彙總已確認' : undefined
        }
      })
    )

  const agentReconciliations = ref<AgentReconciliationRecord[]>(buildAgentReconciliations())

  const settlementCurrencyList = Array.from(
    new Set(
      merchantReconciliations.value
        .filter((record) => record.period === '2026-07')
        .map((record) => record.snapshot.settlementCurrency)
    )
  ).slice(0, 3)

  const settlementBatches = ref<SettlementBatchRecord[]>(
    settlementCurrencyList.map((currency, index) => ({
      id: `STB-202607-${String(index + 1).padStart(3, '0')}`,
      name: `2026-07 ${currency} 月結批次`,
      period: '2026-07',
      ...periodRange('2026-07'),
      cycle: 'Monthly',
      settlementCurrency: currency,
      merchantStatementCount: 0,
      agentStatementCount: 0,
      totalAmount: 0,
      adjustmentAmount: 0,
      finalAmount: 0,
      unresolvedDifferenceCount: 0,
      exchangeSnapshotCount: 0,
      status: index === 0 ? 'Completed' : 'Pending Review',
      createdBy: 'Finance Scheduler',
      createdAt: '2026-08-01 04:00',
      updatedAt: index === 0 ? '2026-08-05 16:30' : '2026-08-03 11:20',
      approvedBy: index === 0 ? 'Finance Manager' : undefined,
      approvedAt: index === 0 ? '2026-08-03 10:00' : undefined,
      completedAt: index === 0 ? '2026-08-05 16:30' : undefined
    }))
  )

  const merchantStatements = ref<MerchantSettlementStatement[]>(
    settlementBatches.value.flatMap((batch, batchIndex) =>
      merchantReconciliations.value
        .filter(
          (record) =>
            record.period === batch.period &&
            record.snapshot.settlementCurrency === batch.settlementCurrency
        )
        .slice(0, 5)
        .map((record, index) => ({
          id: `MST-${batch.period.replace('-', '')}-${String(batchIndex * 20 + index + 1).padStart(4, '0')}`,
          batchId: batch.id,
          reconciliationId: record.id,
          settlementMode: record.settlementMode,
          previousAccumulatedAmount: record.previousAccumulatedAmount,
          period: record.period,
          merchantId: record.merchantId,
          merchantCode: record.merchantCode,
          merchantName: record.merchantName,
          agentId: record.agentId,
          agentName: record.agentName,
          lineUid: record.lineUid,
          transactionCurrency: record.currency,
          settlementCurrency: record.snapshot.settlementCurrency,
          exchangeRate: record.snapshot.exchangeRate,
          grossAmount: record.initialSettlementAmount,
          adjustmentAmount: record.adjustmentAmount,
          finalAmount: record.finalSettlementAmount,
          status:
            batch.status === 'Completed'
              ? ('Paid' as const)
              : batch.status === 'Approved'
                ? ('Approved' as const)
                : ('Pending Review' as const),
          dueDate: '2026-08-10',
          createdAt: batch.createdAt,
          paidAt: batch.status === 'Completed' ? batch.completedAt : undefined
        }))
    )
  )

  const agentStatements = ref<AgentSettlementStatement[]>(
    settlementBatches.value.flatMap((batch, batchIndex) =>
      agentReconciliations.value
        .filter(
          (record) => record.period === batch.period && record.currency === batch.settlementCurrency
        )
        .slice(0, 5)
        .map((record, index) => ({
          id: `AST-${batch.period.replace('-', '')}-${String(batchIndex * 10 + index + 1).padStart(4, '0')}`,
          batchId: batch.id,
          reconciliationId: record.id,
          settlementMode: record.settlementMode,
          previousAccumulatedAmount: record.previousAccumulatedAmount,
          period: record.period,
          agentId: record.agentId,
          agentCode: record.agentCode,
          agentName: record.agentName,
          settlementCurrency: record.currency,
          merchantStatementCount: record.includedMerchantReconciliationIds.length,
          grossAmount: record.initialSettlementAmount,
          adjustmentAmount: record.adjustmentAmount,
          finalAmount: record.finalSettlementAmount,
          status:
            batch.status === 'Completed'
              ? ('Paid' as const)
              : batch.status === 'Approved'
                ? ('Approved' as const)
                : ('Pending Review' as const),
          dueDate: '2026-08-12',
          createdAt: batch.createdAt,
          paidAt: batch.status === 'Completed' ? batch.completedAt : undefined
        }))
    )
  )

  const exchangeSnapshots = ref<SettlementExchangeSnapshot[]>(
    settlementBatches.value.flatMap((batch, batchIndex) => {
      const pairs = Array.from(
        new Set(
          merchantStatements.value
            .filter((statement) => statement.batchId === batch.id)
            .map((statement) => `${statement.transactionCurrency}-${statement.settlementCurrency}`)
        )
      )
      return pairs.map((pair, index) => {
        const [fromCurrency, toCurrency] = pair.split('-')
        return {
          id: `FXS-${String(batchIndex * 10 + index + 1).padStart(5, '0')}`,
          batchId: batch.id,
          fromCurrency,
          toCurrency,
          rate: getExchangeRate(fromCurrency, toCurrency, periodEndDate(batch.period)),
          source: fromCurrency === toCurrency ? '同幣別' : getExchangeRateSource(),
          sourceRateSnapshotIds: getExchangeRateSnapshotIds(
            fromCurrency,
            toCurrency,
            periodEndDate(batch.period)
          ),
          rateTime: `${periodEndDate(batch.period)} 23:59:59`,
          status: 'Locked' as const,
          lockedBy: 'Finance Scheduler',
          lockedAt: '2026-08-01 04:00'
        }
      })
    })
  )

  const settlementAdjustments = ref<SettlementAdjustmentRecord[]>(
    merchantStatements.value
      .filter(
        (statement) =>
          settlementBatches.value.find((batch) => batch.id === statement.batchId)?.status !==
          'Completed'
      )
      .slice(0, 8)
      .map((statement, index) => ({
        id: `ADJ-${String(index + 1).padStart(6, '0')}`,
        batchId: statement.batchId,
        targetType: 'Merchant',
        statementId: statement.id,
        targetId: statement.merchantId,
        targetName: statement.merchantName,
        type: index % 3 === 0 ? 'Reconciliation Difference' : index % 3 === 1 ? 'Fee' : 'Manual',
        direction: index % 4 === 0 ? 'Debit' : 'Credit',
        currency: statement.settlementCurrency,
        amount: 500 + index * 175,
        reason: index % 3 === 0 ? '承接前期差異調整' : '依合約與財務覆核結果調整',
        evidence: `FIN-EVIDENCE-${String(index + 1).padStart(4, '0')}`,
        status: index < 1 ? 'Applied' : index < 2 ? 'Approved' : 'Pending Review',
        requester: 'Finance Ops',
        requestedAt: `2026-08-0${1 + (index % 3)} 09:30`,
        reviewer: index < 5 ? 'Finance Manager' : undefined,
        reviewedAt: index < 5 ? `2026-08-0${2 + (index % 3)} 14:20` : undefined,
        appliedAt: index < 3 ? `2026-08-0${3 + (index % 3)} 10:10` : undefined
      }))
  )

  const refreshBatchTotals = (batchId: string) => {
    const batch = settlementBatches.value.find((item) => item.id === batchId)
    if (!batch) return
    const merchantRows = merchantStatements.value.filter((item) => item.batchId === batchId)
    const agentRows = agentStatements.value.filter((item) => item.batchId === batchId)
    batch.merchantStatementCount = merchantRows.length
    batch.agentStatementCount = agentRows.length
    batch.totalAmount = roundMoney(
      [...merchantRows, ...agentRows].reduce((sum, item) => sum + item.grossAmount, 0)
    )
    batch.adjustmentAmount = roundMoney(
      [...merchantRows, ...agentRows].reduce((sum, item) => sum + item.adjustmentAmount, 0)
    )
    batch.finalAmount = roundMoney(batch.totalAmount + batch.adjustmentAmount)
    batch.exchangeSnapshotCount = exchangeSnapshots.value.filter(
      (item) => item.batchId === batchId
    ).length
  }

  settlementAdjustments.value
    .filter((adjustment) => adjustment.status === 'Applied')
    .forEach((adjustment) => {
      const statement = merchantStatements.value.find((item) => item.id === adjustment.statementId)
      if (!statement) return
      const signedAmount =
        adjustment.direction === 'Credit' ? adjustment.amount : -adjustment.amount
      statement.adjustmentAmount = roundMoney(statement.adjustmentAmount + signedAmount)
      statement.finalAmount = roundMoney(statement.grossAmount + statement.adjustmentAmount)
    })

  settlementBatches.value.forEach((batch) => refreshBatchTotals(batch.id))

  const actionLogs = ref<FinanceActionLog[]>([
    ...agentReconciliations.value.slice(0, 12).map((record, index) => ({
      id: `FLOG-AGT-${String(index + 1).padStart(4, '0')}`,
      entityType: 'Agent Reconciliation' as const,
      entityId: record.id,
      action: '產生代理對帳',
      before: '無',
      after: record.status,
      reason: '彙總旗下商戶已確認對帳結果',
      operator: 'Finance Scheduler',
      time: record.createdAt
    })),
    ...merchantReconciliations.value.slice(0, 24).map((record, index) => ({
      id: `FLOG-${String(index + 1).padStart(6, '0')}`,
      entityType: 'Merchant Reconciliation' as const,
      entityId: record.id,
      action: '產生對帳資料',
      before: '無',
      after: record.status,
      reason: '依結算週期自動彙總平台帳務資料',
      operator: 'Finance Scheduler',
      time: record.createdAt
    })),
    ...settlementBatches.value.map((batch, index) => ({
      id: `FLOG-STB-${String(index + 1).padStart(4, '0')}`,
      entityType: 'Settlement Batch' as const,
      entityId: batch.id,
      action: batch.status === 'Completed' ? '完成結算' : '建立結算批次',
      before: '無',
      after: batch.status,
      reason: '依已確認對帳產生結算批次並鎖定匯率',
      operator: batch.createdBy,
      time: batch.updatedAt
    })),
    ...settlementAdjustments.value.map((adjustment, index) => ({
      id: `FLOG-ADJ-${String(index + 1).padStart(4, '0')}`,
      entityType: 'Settlement Adjustment' as const,
      entityId: adjustment.id,
      action: adjustment.status === 'Applied' ? '套用調整項目' : '建立調整項目',
      before: '無',
      after: adjustment.status,
      reason: adjustment.reason,
      operator: adjustment.reviewer || adjustment.requester,
      time: adjustment.reviewedAt || adjustment.requestedAt
    }))
  ])

  const unresolvedDifferences = computed(() =>
    differences.value.filter((item) => !['Resolved', 'Accepted', 'Closed'].includes(item.status))
  )

  const findMerchantReconciliation = (id: string) =>
    merchantReconciliations.value.find((record) => record.id === id)
  const findAgentReconciliation = (id: string) =>
    agentReconciliations.value.find((record) => record.id === id)
  const findDifference = (id: string) => differences.value.find((record) => record.id === id)
  const getDifferences = (reconciliationId: string) =>
    differences.value.filter((record) => record.reconciliationId === reconciliationId)
  const getLogs = (entityId: string) =>
    actionLogs.value.filter((record) => record.entityId === entityId)
  const getIncludedMerchantReconciliations = (record: AgentReconciliationRecord) =>
    merchantReconciliations.value.filter((item) =>
      record.includedMerchantReconciliationIds.includes(item.id)
    )

  const getDailyRows = (record: MerchantReconciliationRecord): ReconciliationDailyRow[] =>
    Array.from({ length: 7 }, (_, index) => {
      const ratio = [0.13, 0.15, 0.14, 0.16, 0.12, 0.17, 0.13][index]
      const betAmount = roundMoney(record.betAmount * ratio)
      const validBet = roundMoney(record.validBet * ratio)
      const payoutAmount = roundMoney(record.payoutAmount * ratio)
      const ggr = roundMoney(betAmount - payoutAmount)
      return {
        date: `${record.period}-${String(25 + index).padStart(2, '0')}`,
        betCount: Math.round(record.betCount * ratio),
        betAmount,
        validBet,
        payoutAmount,
        ggr,
        settlementAmount: roundMoney(
          ggr * (record.snapshot.ratePercent / 100) * record.snapshot.exchangeRate
        )
      }
    })

  const getGameRows = (record: MerchantReconciliationRecord): ReconciliationGameRow[] =>
    gameStore.games.slice(0, 5).map((game, index) => {
      const ratio = [0.3, 0.24, 0.19, 0.15, 0.12][index]
      const validBet = roundMoney(record.validBet * ratio)
      const payoutAmount = roundMoney(record.payoutAmount * ratio)
      const ggr = roundMoney(record.betAmount * ratio - payoutAmount)
      return {
        gameId: game.id,
        gameCode: game.code,
        gameName: game.displayName,
        betCount: Math.round(record.betCount * ratio),
        validBet,
        payoutAmount,
        ggr,
        settlementAmount: roundMoney(
          ggr * (record.snapshot.ratePercent / 100) * record.snapshot.exchangeRate
        )
      }
    })

  const addLog = (
    entityType: FinanceActionLog['entityType'],
    entityId: string,
    action: string,
    before: string,
    after: string,
    reason: string
  ) =>
    actionLogs.value.unshift({
      id: `FLOG-${Date.now()}`,
      entityType,
      entityId,
      action,
      before,
      after,
      reason,
      operator: 'Super Admin',
      time: formatNow()
    })

  const findSettlementBatch = (id: string) =>
    settlementBatches.value.find((record) => record.id === id)
  const findMerchantStatement = (id: string) =>
    merchantStatements.value.find((record) => record.id === id)
  const findAgentStatement = (id: string) =>
    agentStatements.value.find((record) => record.id === id)
  const findSettlementAdjustment = (id: string) =>
    settlementAdjustments.value.find((record) => record.id === id)
  const getMerchantStatements = (batchId: string) =>
    merchantStatements.value.filter((record) => record.batchId === batchId)
  const getAgentStatements = (batchId: string) =>
    agentStatements.value.filter((record) => record.batchId === batchId)
  const getExchangeSnapshots = (batchId: string) =>
    exchangeSnapshots.value.filter((record) => record.batchId === batchId)
  const getSettlementAdjustments = (batchId: string) =>
    settlementAdjustments.value.filter((record) => record.batchId === batchId)

  const createSettlementBatch = (payload: {
    period: string
    cycle: SettlementCycle
    settlementCurrency: string
    name: string
  }) => {
    if (
      !financeSettingsStore.settlementCurrencies.some(
        (currency) => currency.code === payload.settlementCurrency
      )
    ) {
      return { ok: false, message: '此幣別未啟用為結算幣別，請先至平台管理的幣別管理開啟。' }
    }
    const usedMerchantIds = new Set(merchantStatements.value.map((item) => item.reconciliationId))
    const usedAgentIds = new Set(agentStatements.value.map((item) => item.reconciliationId))
    const eligibleMerchants = merchantReconciliations.value.filter(
      (record) =>
        record.period === payload.period &&
        record.snapshot.settlementCurrency === payload.settlementCurrency &&
        ['Confirmed', 'Locked'].includes(record.status) &&
        !usedMerchantIds.has(record.id)
    )
    const eligibleAgents = agentReconciliations.value.filter(
      (record) =>
        record.period === payload.period &&
        record.currency === payload.settlementCurrency &&
        ['Confirmed', 'Locked'].includes(record.status) &&
        !usedAgentIds.has(record.id)
    )
    if (!eligibleMerchants.length && !eligibleAgents.length) {
      return { ok: false, message: '目前沒有符合期間、幣別且尚未納入批次的已確認對帳。' }
    }
    const rateDate = periodEndDate(payload.period)
    const requiredPairs = Array.from(
      new Set(
        eligibleMerchants.map(
          (record) => `${record.currency}-${record.snapshot.settlementCurrency}`
        )
      )
    )
    const unresolvedRate = requiredPairs
      .map((pair) => {
        const [fromCurrency, toCurrency] = pair.split('-')
        return resolveExchangeRate(fromCurrency, toCurrency, rateDate)
      })
      .find((result) => !result.ok)
    if (unresolvedRate && !unresolvedRate.ok) {
      return {
        ok: false,
        message: `${unresolvedRate.message} 請先至匯率管理完成當日匯率鎖定。`
      }
    }
    const id = `STB-${payload.period.replace('-', '')}-${String(settlementBatches.value.length + 1).padStart(3, '0')}`
    const now = formatNow()
    const batch: SettlementBatchRecord = {
      id,
      name: payload.name,
      period: payload.period,
      ...periodRange(payload.period),
      cycle: payload.cycle,
      settlementCurrency: payload.settlementCurrency,
      merchantStatementCount: 0,
      agentStatementCount: 0,
      totalAmount: 0,
      adjustmentAmount: 0,
      finalAmount: 0,
      unresolvedDifferenceCount: 0,
      exchangeSnapshotCount: 0,
      status: 'Draft',
      createdBy: 'Super Admin',
      createdAt: now,
      updatedAt: now
    }
    settlementBatches.value.unshift(batch)
    eligibleMerchants.forEach((record, index) =>
      merchantStatements.value.unshift({
        id: `MST-${payload.period.replace('-', '')}-${String(merchantStatements.value.length + index + 1).padStart(4, '0')}`,
        batchId: id,
        reconciliationId: record.id,
        settlementMode: record.settlementMode,
        previousAccumulatedAmount: record.previousAccumulatedAmount,
        period: record.period,
        merchantId: record.merchantId,
        merchantCode: record.merchantCode,
        merchantName: record.merchantName,
        agentId: record.agentId,
        agentName: record.agentName,
        lineUid: record.lineUid,
        transactionCurrency: record.currency,
        settlementCurrency: record.snapshot.settlementCurrency,
        exchangeRate: record.snapshot.exchangeRate,
        grossAmount: record.initialSettlementAmount,
        adjustmentAmount: record.adjustmentAmount,
        finalAmount: record.finalSettlementAmount,
        status: 'Draft',
        dueDate: '2026-09-10',
        createdAt: now
      })
    )
    eligibleAgents.forEach((record, index) =>
      agentStatements.value.unshift({
        id: `AST-${payload.period.replace('-', '')}-${String(agentStatements.value.length + index + 1).padStart(4, '0')}`,
        batchId: id,
        reconciliationId: record.id,
        settlementMode: record.settlementMode,
        previousAccumulatedAmount: record.previousAccumulatedAmount,
        period: record.period,
        agentId: record.agentId,
        agentCode: record.agentCode,
        agentName: record.agentName,
        settlementCurrency: record.currency,
        merchantStatementCount: record.includedMerchantReconciliationIds.length,
        grossAmount: record.initialSettlementAmount,
        adjustmentAmount: record.adjustmentAmount,
        finalAmount: record.finalSettlementAmount,
        status: 'Draft',
        dueDate: '2026-09-12',
        createdAt: now
      })
    )
    requiredPairs.forEach((pair, index) => {
      const [fromCurrency, toCurrency] = pair.split('-')
      const resolved = resolveExchangeRate(fromCurrency, toCurrency, rateDate)
      if (!resolved.ok) return
      exchangeSnapshots.value.unshift({
        id: `FXS-${String(exchangeSnapshots.value.length + index + 1).padStart(5, '0')}`,
        batchId: id,
        fromCurrency,
        toCurrency,
        rate: resolved.rate,
        source: fromCurrency === toCurrency ? '同幣別' : getExchangeRateSource(),
        sourceRateSnapshotIds: resolved.snapshotIds,
        rateTime: `${rateDate} 23:59:59`,
        status: 'Locked',
        lockedBy: 'Super Admin',
        lockedAt: now
      })
      resolved.snapshotIds.forEach((snapshotId) => {
        const dailyRate = financeSettingsStore.dailyRates.find((item) => item.id === snapshotId)
        if (!dailyRate) return
        dailyRate.settlementUsed = true
        dailyRate.settlementIds = [...new Set([...(dailyRate.settlementIds || []), id])]
      })
    })
    refreshBatchTotals(id)
    addLog('Settlement Batch', id, '建立結算批次', '無', 'Draft', '納入已確認對帳並鎖定匯率快照')
    return { ok: true, batch }
  }

  const submitSettlementBatch = (id: string) => {
    const batch = findSettlementBatch(id)
    if (!batch || batch.status !== 'Draft' || batch.unresolvedDifferenceCount > 0) return false
    const before = batch.status
    batch.status = 'Pending Review'
    batch.updatedAt = formatNow()
    getMerchantStatements(id).forEach((item) => (item.status = 'Pending Review'))
    getAgentStatements(id).forEach((item) => (item.status = 'Pending Review'))
    addLog('Settlement Batch', id, '送出審核', before, batch.status, '批次資料與匯率快照已完成檢查')
    return true
  }

  const approveSettlementBatch = (id: string) => {
    const batch = findSettlementBatch(id)
    if (!batch || batch.status !== 'Pending Review') return false
    const before = batch.status
    batch.status = 'Approved'
    batch.approvedBy = 'Finance Manager'
    batch.approvedAt = formatNow()
    batch.updatedAt = batch.approvedAt
    getMerchantStatements(id).forEach((item) => (item.status = 'Approved'))
    getAgentStatements(id).forEach((item) => (item.status = 'Approved'))
    addLog(
      'Settlement Batch',
      id,
      '核准結算批次',
      before,
      batch.status,
      '金額、匯率與調整項目覆核完成'
    )
    return true
  }

  const completeSettlementBatch = (id: string) => {
    const batch = findSettlementBatch(id)
    if (!batch || batch.status !== 'Approved') return false
    const before = batch.status
    batch.status = 'Completed'
    batch.completedAt = formatNow()
    batch.updatedAt = batch.completedAt
    getMerchantStatements(id).forEach((item) => {
      item.status = 'Paid'
      item.paidAt = batch.completedAt
      const reconciliation = findMerchantReconciliation(item.reconciliationId)
      if (reconciliation) {
        reconciliation.status = 'Locked'
        reconciliation.lockedAt = batch.completedAt
      }
    })
    getAgentStatements(id).forEach((item) => {
      item.status = 'Paid'
      item.paidAt = batch.completedAt
      const reconciliation = findAgentReconciliation(item.reconciliationId)
      if (reconciliation) {
        reconciliation.status = 'Locked'
        reconciliation.lockedAt = batch.completedAt
      }
    })
    addLog(
      'Settlement Batch',
      id,
      '完成結算',
      before,
      batch.status,
      '所有結算單已標記為已付款並鎖定對帳'
    )
    return true
  }

  const createSettlementAdjustment = (payload: {
    statementId: string
    targetType: 'Merchant' | 'Agent'
    type: SettlementAdjustmentRecord['type']
    direction: SettlementAdjustmentRecord['direction']
    amount: number
    reason: string
    evidence?: string
  }) => {
    const merchantStatement =
      payload.targetType === 'Merchant' ? findMerchantStatement(payload.statementId) : undefined
    const agentStatement =
      payload.targetType === 'Agent' ? findAgentStatement(payload.statementId) : undefined
    const statement = merchantStatement || agentStatement
    if (!statement) return undefined
    const batch = findSettlementBatch(statement.batchId)
    if (!batch || batch.status === 'Completed' || batch.status === 'Cancelled') return undefined
    const adjustment: SettlementAdjustmentRecord = {
      id: `ADJ-${String(settlementAdjustments.value.length + 1).padStart(6, '0')}`,
      batchId: statement.batchId,
      targetType: payload.targetType,
      statementId: payload.statementId,
      targetId: merchantStatement?.merchantId || agentStatement!.agentId,
      targetName: merchantStatement?.merchantName || agentStatement!.agentName,
      type: payload.type,
      direction: payload.direction,
      currency: statement.settlementCurrency,
      amount: roundMoney(payload.amount),
      reason: payload.reason,
      evidence: payload.evidence,
      status: 'Pending Review',
      requester: 'Super Admin',
      requestedAt: formatNow()
    }
    settlementAdjustments.value.unshift(adjustment)
    addLog(
      'Settlement Adjustment',
      adjustment.id,
      '建立調整項目',
      '無',
      adjustment.status,
      payload.reason
    )
    return adjustment
  }

  const reviewSettlementAdjustment = (id: string, approved: boolean) => {
    const adjustment = findSettlementAdjustment(id)
    if (!adjustment || adjustment.status !== 'Pending Review') return false
    const before = adjustment.status
    adjustment.status = approved ? 'Applied' : 'Rejected'
    adjustment.reviewer = 'Finance Manager'
    adjustment.reviewedAt = formatNow()
    if (approved) {
      adjustment.appliedAt = adjustment.reviewedAt
      const statement =
        adjustment.targetType === 'Merchant'
          ? findMerchantStatement(adjustment.statementId)
          : findAgentStatement(adjustment.statementId)
      if (statement) {
        const signedAmount =
          adjustment.direction === 'Credit' ? adjustment.amount : -adjustment.amount
        statement.adjustmentAmount = roundMoney(statement.adjustmentAmount + signedAmount)
        statement.finalAmount = roundMoney(statement.grossAmount + statement.adjustmentAmount)
      }
      refreshBatchTotals(adjustment.batchId)
    }
    addLog(
      'Settlement Adjustment',
      id,
      approved ? '核准並套用調整' : '駁回調整',
      before,
      adjustment.status,
      approved ? '調整金額已回寫結算單' : '覆核結果不通過'
    )
    return true
  }

  const recalculateMerchant = (id: string) => {
    const record = findMerchantReconciliation(id)
    if (!record || ['Confirmed', 'Locked', 'Cancelled'].includes(record.status)) return false
    record.updatedAt = formatNow()
    record.snapshot.calculatedAt = record.updatedAt
    addLog(
      'Merchant Reconciliation',
      id,
      '重新計算',
      record.status,
      record.status,
      '依目前有效的帳務明細重新產生計算結果'
    )
    return true
  }

  const applyActualAmount = (
    record: MerchantReconciliationRecord | AgentReconciliationRecord,
    reconciliationType: ReconciliationDifferenceRecord['reconciliationType'],
    actualAmount: number,
    note: string
  ) => {
    if (!Number.isFinite(actualAmount) || actualAmount < 0) return false
    const expectedAmount = record.finalSettlementAmount
    const roundingAdjustment = roundMoney(actualAmount - expectedAmount)
    if (roundingAdjustment !== 0 && !note.trim()) return false
    record.actualSettlementAmount = actualAmount
    record.roundingAdjustment = roundingAdjustment
    record.confirmationNote = note.trim()
    record.adjustmentAmount = roundMoney(record.adjustmentAmount + roundingAdjustment)
    record.finalSettlementAmount = actualAmount
    if (roundingAdjustment !== 0) {
      differences.value.unshift({
        id: `DIF-ROUND-${String(differences.value.length + 1).padStart(6, '0')}`,
        reconciliationType,
        reconciliationId: record.id,
        period: record.period,
        merchantId: 'merchantId' in record ? record.merchantId : undefined,
        merchantName: 'merchantName' in record ? record.merchantName : undefined,
        agentId: 'agentId' in record ? record.agentId : '',
        agentName: 'agentName' in record ? record.agentName : '',
        lineUid: 'lineUid' in record ? record.lineUid : undefined,
        type: 'Other',
        systemValue: expectedAmount,
        partnerValue: actualAmount,
        differenceAmount: roundingAdjustment,
        currency: record.snapshot.settlementCurrency,
        status: 'Resolved',
        assignee: 'Super Admin',
        description: '確認對帳時依實收／實付金額建立尾差調整。',
        resolution: note.trim(),
        resolutionType: 'Create Adjustment',
        relatedBetIds: [],
        relatedTransactionIds: [],
        detectedAt: formatNow(),
        dueAt: formatNow(),
        updatedAt: formatNow()
      })
      record.differenceCount += 1
    }
    return true
  }

  const confirmMerchant = (id: string, actualAmount?: number, note = '') => {
    const record = findMerchantReconciliation(id)
    if (!record || record.status !== 'Pending Confirmation' || record.unresolvedDifferenceCount > 0)
      return false
    if (!applyActualAmount(record, 'Merchant', actualAmount ?? record.finalSettlementAmount, note))
      return false
    const before = record.status
    record.status = 'Confirmed'
    record.confirmedAt = formatNow()
    record.updatedAt = record.confirmedAt
    addLog('Merchant Reconciliation', id, '確認對帳', before, record.status, '帳務與差異均已核對')
    refreshAgent(record.agentId, record.period)
    return true
  }

  const updateDifference = (
    id: string,
    status: ReconciliationDifferenceStatus,
    assignee?: string
  ) => {
    const record = findDifference(id)
    if (!record) return false
    const parent =
      findMerchantReconciliation(record.reconciliationId) ||
      findAgentReconciliation(record.reconciliationId)
    if (parent?.status === 'Locked') return false
    const before = record.status
    record.status = status
    record.assignee = assignee ?? record.assignee
    record.updatedAt = formatNow()
    addLog('Difference', id, '更新差異狀態', before, status, '依差異處理流程更新')
    syncDifferenceCount(record.reconciliationId)
    return true
  }

  const resolveDifference = (
    id: string,
    resolutionType: NonNullable<ReconciliationDifferenceRecord['resolutionType']>,
    resolution: string
  ) => {
    const difference = findDifference(id)
    if (!difference) return false
    const lockedParent =
      findMerchantReconciliation(difference.reconciliationId) ||
      findAgentReconciliation(difference.reconciliationId)
    if (lockedParent?.status === 'Locked') return false
    const before = difference.status
    difference.status = resolutionType === 'Use Partner Value' ? 'Accepted' : 'Resolved'
    difference.resolutionType = resolutionType
    difference.resolution = resolution
    difference.updatedAt = formatNow()
    if (resolutionType === 'Create Adjustment') {
      const parent =
        findMerchantReconciliation(difference.reconciliationId) ||
        findAgentReconciliation(difference.reconciliationId)
      if (parent) {
        parent.adjustmentAmount = roundMoney(parent.adjustmentAmount + difference.differenceAmount)
        parent.finalSettlementAmount = roundMoney(
          parent.initialSettlementAmount + parent.adjustmentAmount
        )
      }
    }
    addLog('Difference', id, '完成差異處理', before, difference.status, resolution)
    syncDifferenceCount(difference.reconciliationId)
    return true
  }

  function syncDifferenceCount(reconciliationId: string) {
    const merchantParent = findMerchantReconciliation(reconciliationId)
    const parent = merchantParent || findAgentReconciliation(reconciliationId)
    if (!parent) return
    parent.unresolvedDifferenceCount = getDifferences(reconciliationId).filter(
      (item) => !['Resolved', 'Accepted', 'Closed'].includes(item.status)
    ).length
    if (parent.unresolvedDifferenceCount === 0 && parent.status === 'Difference') {
      parent.status = 'Pending Confirmation'
    }
    parent.updatedAt = formatNow()
    if (merchantParent) refreshAgent(merchantParent.agentId, merchantParent.period)
  }

  function refreshAgent(agentId: string, period: string) {
    const record = agentReconciliations.value.find(
      (item) => item.agentId === agentId && item.period === period
    )
    if (!record || ['Confirmed', 'Locked'].includes(record.status)) return
    const included = getIncludedMerchantReconciliations(record)
    record.unresolvedDifferenceCount = included.reduce(
      (total, item) => total + item.unresolvedDifferenceCount,
      0
    )
    record.differenceCount = record.unresolvedDifferenceCount
    record.status = record.unresolvedDifferenceCount ? 'Difference' : 'Pending Confirmation'
    record.updatedAt = formatNow()
  }

  const confirmAgent = (id: string, actualAmount?: number, note = '') => {
    const record = findAgentReconciliation(id)
    if (!record || record.status !== 'Pending Confirmation' || record.unresolvedDifferenceCount > 0)
      return false
    const included = getIncludedMerchantReconciliations(record)
    if (included.some((item) => !['Confirmed', 'Locked'].includes(item.status))) return false
    if (!applyActualAmount(record, 'Agent', actualAmount ?? record.finalSettlementAmount, note))
      return false
    const before = record.status
    record.status = 'Confirmed'
    record.confirmedAt = formatNow()
    record.updatedAt = record.confirmedAt
    addLog(
      'Agent Reconciliation',
      id,
      '確認代理對帳',
      before,
      record.status,
      '旗下商戶對帳均已確認'
    )
    return true
  }

  const retainReconciliation = (id: string, note = '') => {
    const merchant = findMerchantReconciliation(id)
    const record = merchant || findAgentReconciliation(id)
    if (!record || record.status !== 'Pending Confirmation' || record.unresolvedDifferenceCount > 0)
      return false
    if (
      !merchant &&
      getIncludedMerchantReconciliations(record as AgentReconciliationRecord).some(
        (item) => !['Confirmed', 'Locked'].includes(item.status)
      )
    )
      return false
    if (!Number.isFinite(record.finalSettlementAmount)) return false
    const before = record.status
    // Retention is not a zero-payment rounding adjustment: preserve the original bill.
    record.retainedForNextPeriod = true
    record.retainedSettlementAmount = record.finalSettlementAmount
    record.actualSettlementAmount = 0
    record.confirmationNote = note.trim()
    record.status = 'Confirmed'
    record.confirmedAt = formatNow()
    record.updatedAt = record.confirmedAt
    addLog(
      merchant ? 'Merchant Reconciliation' : 'Agent Reconciliation',
      id,
      '保留至下期',
      before,
      record.status,
      `本期未交收；保留 ${record.snapshot.settlementCurrency} ${record.finalSettlementAmount}。${note.trim()}`
    )
    if (merchant) refreshAgent(merchant.agentId, merchant.period)
    return true
  }

  const addPriorCorrection = (
    sourceId: string,
    targetId: string,
    amount: number,
    reason: string
  ) => {
    const sourceMerchant = findMerchantReconciliation(sourceId)
    const targetMerchant = findMerchantReconciliation(targetId)
    const source = sourceMerchant || findAgentReconciliation(sourceId)
    const target = targetMerchant || findAgentReconciliation(targetId)
    if (
      !source ||
      !target ||
      source.status !== 'Locked' ||
      ['Locked', 'Cancelled', 'Confirmed'].includes(target.status)
    )
      throw new Error('請選擇已鎖定來源與後續未確認單據')
    if (
      Boolean(sourceMerchant) !== Boolean(targetMerchant) ||
      source.agentId !== target.agentId ||
      sourceMerchant?.merchantId !== targetMerchant?.merchantId ||
      sourceMerchant?.lineUid !== targetMerchant?.lineUid ||
      source.currency !== target.currency ||
      source.snapshot.settlementCurrency !== target.snapshot.settlementCurrency ||
      target.periodStart <= source.periodEnd
    )
      throw new Error('回調僅限同一對象、線路及幣別的後續期間')
    if (!Number.isFinite(amount) || amount === 0 || !reason.trim())
      throw new Error('請填寫非零回調金額與原因')
    const value = Number(amount.toFixed(target.snapshot.amountPrecision))
    if (!value) throw new Error('回調金額小於幣別精度')
    target.priorCorrections ||= []
    target.priorCorrections.push({
      sourceId,
      amount: value,
      reason: reason.trim(),
      createdAt: formatNow()
    })
    addLog(
      targetMerchant ? 'Merchant Reconciliation' : 'Agent Reconciliation',
      targetId,
      '上期退款／回調',
      target.status,
      target.status,
      `來源 ${sourceId}；金額 ${value}；${reason.trim()}`
    )
    return true
  }

  const setCollectionMode = (id: string, mode: 'AgentCollect' | 'PlatformCollect') => {
    const record = findMerchantReconciliation(id) || findAgentReconciliation(id)
    if (!record?.collection || ['Locked', 'Cancelled'].includes(record.status))
      throw new Error('已鎖定單據不可更改模式')
    if (!['AgentCollect', 'PlatformCollect'].includes(mode)) throw new Error('收付模式無效')
    const before = record.collection.mode
    record.collection.mode = mode
    record.collection.effectiveFrom = record.periodStart
    addLog(
      'merchantId' in record ? 'Merchant Reconciliation' : 'Agent Reconciliation',
      id,
      '設定本期收付模式',
      before,
      mode,
      `平台操作；適用起日 ${record.periodStart}`
    )
  }
  const deliverReconciliation = (
    id: string,
    adjustment: number,
    actual: number,
    reason: string,
    retain: boolean,
    collectorId = 'PLATFORM',
    actualCollectorId = collectorId
  ) => {
    const merchant = findMerchantReconciliation(id)
    const record = merchant || findAgentReconciliation(id)
    if (!record || ['Locked', 'Cancelled'].includes(record.status))
      throw new Error('此單據不可交付')
    if (
      !record.collection ||
      (collectorId !== 'PLATFORM' &&
        (record.collection.mode !== 'AgentCollect' || record.collection.payeeId !== collectorId))
    )
      throw new Error('代理僅可操作本代理的代理統收單據')
    if (
      !['PLATFORM', record.collection.payeeId].includes(actualCollectorId) ||
      (collectorId !== 'PLATFORM' && actualCollectorId !== collectorId)
    )
      throw new Error('實際收款方不在允許範圍')
    if (record.ggr < 0 && !['累積', '清零'].includes(record.settlementMode || ''))
      throw new Error('負 GGR 尚未設定累積／清零方式，請先確認合約')
    const result = calculateDelivery(
      record.finalSettlementAmount +
        (record.priorCorrections || []).reduce((sum, item) => sum + item.amount, 0),
      adjustment,
      actual,
      reason,
      retain,
      record.snapshot.amountPrecision
    )
    const before = record.status
    const time = formatNow()
    actual = Math.trunc(actual)
    record.delivery = {
      operatorId: collectorId,
      actualCollectorId,
      actualCollectorName:
        actualCollectorId === 'PLATFORM' ? '遊戲商平台' : record.collection.payeeName,
      ...result,
      systemAmount:
        record.finalSettlementAmount +
        (record.priorCorrections || []).reduce((sum, item) => sum + item.amount, 0),
      adjustment,
      actual,
      reason: reason.trim(),
      deliveredAt: time,
      nextGgr:
        record.settlementMode === '累積'
          ? Math.min(0, record.ggr)
          : record.settlementMode === '清零'
            ? 0
            : undefined
    }
    record.actualSettlementAmount = actual
    record.retainedForNextPeriod = retain
    record.retainedSettlementAmount = result.carried
    record.confirmationNote = reason.trim()
    record.status = 'Locked'
    record.confirmedAt = time
    record.lockedAt = time
    record.updatedAt = time
    addLog(
      merchant ? 'Merchant Reconciliation' : 'Agent Reconciliation',
      id,
      '確認交付並鎖定',
      before,
      'Locked',
      `系統 ${record.finalSettlementAmount}；差異 ${adjustment}；實收／實付 ${actual}；剩餘 ${result.remaining}；結轉 ${result.carried}。${reason.trim()}`
    )
    if (merchant) refreshAgent(merchant.agentId, merchant.period)
    return true
  }

  for (const record of merchantReconciliations.value) {
    record.collection ||= {
      mode:
        partnerStore.merchants.find((item) => item.id === record.merchantId)?.collectionMode ||
        'AgentCollect',
      payerId: record.merchantId,
      payerName: record.merchantName,
      payeeId: record.agentId,
      payeeName: record.agentName,
      platformReceivable: false
    }
  }
  for (const record of agentReconciliations.value) {
    const agent = partnerStore.agents.find((item) => item.id === record.agentId)
    const parent = partnerStore.agents.find((item) => item.id === agent?.parentAgentId)
    record.collection ||= {
      mode: 'AgentCollect',
      payerId: record.agentId,
      payerName: record.agentName,
      payeeId: agent ? agent.parentAgentId || 'PLATFORM' : 'UNRESOLVED',
      payeeName: parent?.name || (agent && !agent.parentAgentId ? '遊戲商平台' : '收款對象待確認'),
      platformReceivable: Boolean(agent && !agent.parentAgentId)
    }
  }

  return {
    merchantReconciliations,
    agentReconciliations,
    differences,
    actionLogs,
    settlementBatches,
    merchantStatements,
    agentStatements,
    exchangeSnapshots,
    settlementAdjustments,
    unresolvedDifferences,
    findMerchantReconciliation,
    findAgentReconciliation,
    findDifference,
    getDifferences,
    getLogs,
    getIncludedMerchantReconciliations,
    getDailyRows,
    getGameRows,
    findSettlementBatch,
    findMerchantStatement,
    findAgentStatement,
    findSettlementAdjustment,
    getMerchantStatements,
    getAgentStatements,
    getExchangeSnapshots,
    getSettlementAdjustments,
    createSettlementBatch,
    submitSettlementBatch,
    approveSettlementBatch,
    completeSettlementBatch,
    createSettlementAdjustment,
    reviewSettlementAdjustment,
    recalculateMerchant,
    confirmMerchant,
    confirmAgent,
    retainReconciliation,
    deliverReconciliation,
    setCollectionMode,
    addPriorCorrection,
    updateDifference,
    resolveDifference
  }
})
