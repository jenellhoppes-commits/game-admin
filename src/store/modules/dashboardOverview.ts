import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApprovalCenterStore } from './approvalCenter'
import { useBusinessPartnerStore } from './businessPartner'
import { useFinanceCenterStore } from './financeCenter'
import { useFinanceSettingsStore } from './financeSettings'
import { useGameCatalogStore } from './gameCatalog'
import { useJackpotCenterStore } from './jackpotCenter'
import { useMemberCenterStore } from './memberCenter'
import { usePlatformSystemStore } from './platformSystem'
import { useReportCenterStore } from './reportCenter'
import { useRiskCenterStore } from './riskCenter'
import { useTransactionCenterStore } from './transactionCenter'
import type { ReportMetricRow } from '@/types/game-provider'

export interface DashboardSummary {
  betAmount: number
  payoutAmount: number
  ggr: number
  actualRtp: number
  betCount: number
  activeMembers: number
}

export interface DashboardTrendPoint {
  date: string
  betAmount: number
  payoutAmount: number
  ggr: number
}

export interface DashboardTask {
  id: string
  title: string
  count: number
  note: string
  tone: 'primary' | 'warning' | 'danger' | 'info'
  path: string
}

const round = (value: number) => Number(value.toFixed(2))

export const useDashboardOverviewStore = defineStore('dashboardOverviewStore', () => {
  const transactionStore = useTransactionCenterStore()
  const memberStore = useMemberCenterStore()
  const gameStore = useGameCatalogStore()
  const businessStore = useBusinessPartnerStore()
  const jackpotStore = useJackpotCenterStore()
  const riskStore = useRiskCenterStore()
  const approvalStore = useApprovalCenterStore()
  const financeStore = useFinanceCenterStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const platformSystemStore = usePlatformSystemStore()
  const reportStore = useReportCenterStore()
  const refreshedAt = ref('2026-09-04 23:30')

  const currencies = computed(() => [
    ...new Set(transactionStore.bets.map((record) => record.currency))
  ])

  const getSummary = (currency: string, excludeTest: boolean): DashboardSummary => {
    const testMembers = new Set(
      memberStore.members
        .filter((member) => member.tags.includes('Test'))
        .map((member) => member.id)
    )
    const bets = transactionStore.bets.filter(
      (record) =>
        record.currency === currency && (!excludeTest || !testMembers.has(record.memberId))
    )
    const betAmount = round(bets.reduce((total, record) => total + record.betAmount, 0))
    const payoutAmount = round(bets.reduce((total, record) => total + record.payoutAmount, 0))
    return {
      betAmount,
      payoutAmount,
      ggr: round(betAmount - payoutAmount),
      actualRtp: betAmount ? round((payoutAmount / betAmount) * 100) : 0,
      betCount: bets.length,
      activeMembers: new Set(bets.map((record) => record.memberId)).size
    }
  }

  const getTrend = (currency: string, excludeTest: boolean): DashboardTrendPoint[] => {
    const summary = getSummary(currency, excludeTest)
    const weights = [0.11, 0.13, 0.12, 0.16, 0.14, 0.18, 0.16]
    return weights.map((weight, index) => {
      const dailyBet = round(summary.betAmount * weight)
      const payoutWeight = weight + ((index % 3) - 1) * 0.008
      const dailyPayout = round(summary.payoutAmount * payoutWeight)
      return {
        date: `09/${String(index + 1).padStart(2, '0')}`,
        betAmount: dailyBet,
        payoutAmount: dailyPayout,
        ggr: round(dailyBet - dailyPayout)
      }
    })
  }

  const getTopGames = (currency: string): ReportMetricRow[] =>
    reportStore
      .getRows('game-performance')
      .filter((row) => row.currency === currency)
      .sort((a, b) => (b.betAmount || 0) - (a.betAmount || 0))
      .slice(0, 5)

  const getTopMerchants = (currency: string): ReportMetricRow[] =>
    reportStore
      .getRows('merchant-line')
      .filter((row) => row.currency === currency)
      .sort((a, b) => (b.ggr || 0) - (a.ggr || 0))
      .slice(0, 5)

  const getJackpotBalance = (currency: string) =>
    round(
      jackpotStore.pools
        .filter((pool) => pool.baseCurrency === currency)
        .reduce((total, pool) => total + pool.currentBalance, 0)
    )

  const tasks = computed<DashboardTask[]>(() => [
    {
      id: 'approval',
      title: '待審核申請',
      count: approvalStore.pendingItems.length,
      note: `${approvalStore.overdueItems.length} 筆已逾期`,
      tone: approvalStore.overdueItems.length ? 'danger' : 'warning',
      path: '/approvals/pending'
    },
    {
      id: 'risk',
      title: '風控告警',
      count: riskStore.openAlerts.length,
      note: `${riskStore.criticalAlertCount} 筆重大`,
      tone: riskStore.criticalAlertCount ? 'danger' : 'warning',
      path: '/risk/alerts'
    },
    {
      id: 'difference',
      title: '對帳差異',
      count: financeStore.unresolvedDifferences.length,
      note: '需完成差異確認',
      tone: financeStore.unresolvedDifferences.length ? 'warning' : 'info',
      path: '/finance/reconciliation/differences'
    },
    {
      id: 'system',
      title: '系統異常',
      count: platformSystemStore.openErrorCount,
      note: `${platformSystemStore.criticalErrorCount} 筆重大未結`,
      tone: platformSystemStore.criticalErrorCount ? 'danger' : 'warning',
      path: '/platform/logs/errors'
    }
  ])

  const operations = computed(() => ({
    activeGames: gameStore.games.filter((game) => game.status === 'Active').length,
    incompleteGames: gameStore.games.filter(
      (game) => game.rtpStatus !== 'Configured' || game.limitStatus !== 'Configured'
    ).length,
    activeMerchants: businessStore.merchants.filter((merchant) => merchant.status === 'Active')
      .length,
    activeAgents: businessStore.agents.filter((agent) => agent.status === 'Active').length,
    restrictedMembers: memberStore.restrictedCount,
    activeJackpots: jackpotStore.pools.filter((pool) => pool.status === 'Active').length,
    triggeredRateAlerts: financeSettingsStore.alerts.filter((alert) => alert.status === 'Triggered')
      .length
  }))

  const exchangeRates = computed(() =>
    financeSettingsStore.dailyRates
      .filter((rate) => rate.status === 'Published')
      .slice(0, 5)
      .map((rate) => ({
        id: rate.id,
        pair: `${rate.fromCurrency}/${rate.toCurrency}`,
        rate: rate.finalRate,
        adjustment: rate.adjustmentPercent,
        updatedAt: rate.updatedAt
      }))
  )

  const refresh = () => {
    const now = new Date()
    const part = (value: number) => String(value).padStart(2, '0')
    refreshedAt.value = `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
  }

  return {
    currencies,
    refreshedAt,
    tasks,
    operations,
    exchangeRates,
    getSummary,
    getTrend,
    getTopGames,
    getTopMerchants,
    getJackpotBalance,
    refresh
  }
})
