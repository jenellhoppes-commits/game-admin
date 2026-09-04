import { defineStore } from 'pinia'
import { useBusinessPartnerStore } from './businessPartner'
import { useFinanceCenterStore } from './financeCenter'
import { useFinanceSettingsStore } from './financeSettings'
import { useGameCatalogStore } from './gameCatalog'
import { useJackpotCenterStore } from './jackpotCenter'
import { useMemberCenterStore } from './memberCenter'
import { useTransactionCenterStore } from './transactionCenter'
import type { ReportMetricRow, ReportMode, ReportRowStatus } from '@/types/game-provider'

const reportTime = '2026-09-04 23:30'
const round = (value: number) => Number(value.toFixed(2))

const getStatus = (attention: boolean, pending = false): ReportRowStatus =>
  pending ? 'Pending' : attention ? 'Attention' : 'Normal'

export const useReportCenterStore = defineStore('reportCenterStore', () => {
  const businessStore = useBusinessPartnerStore()
  const gameStore = useGameCatalogStore()
  const memberStore = useMemberCenterStore()
  const transactionStore = useTransactionCenterStore()
  const jackpotStore = useJackpotCenterStore()
  const financeStore = useFinanceCenterStore()
  const financeSettingsStore = useFinanceSettingsStore()

  const buildOverviewRows = (): ReportMetricRow[] => {
    const currencies = [...new Set(transactionStore.bets.map((item) => item.currency))]
    return currencies.map((currency, index) => {
      const bets = transactionStore.bets.filter((item) => item.currency === currency)
      const betAmount = round(bets.reduce((total, item) => total + item.betAmount, 0))
      const payoutAmount = round(bets.reduce((total, item) => total + item.payoutAmount, 0))
      const ggr = round(betAmount - payoutAmount)
      const actualRtp = betAmount ? round((payoutAmount / betAmount) * 100) : 0
      const activeMembers = new Set(bets.map((item) => item.memberId)).size
      return {
        id: `OVERVIEW-${currency}`,
        primary: `${currency} 營運彙總`,
        secondary: '依交易幣別獨立呈現',
        period: '2026-09-01 ～ 2026-09-04',
        currency,
        betCount: bets.length,
        rounds: bets.length,
        activeMembers,
        betAmount,
        validBetAmount: round(betAmount * 0.96),
        payoutAmount,
        ggr,
        actualRtp,
        status: getStatus(Math.abs(actualRtp - 96) > 3, index === currencies.length - 1),
        updatedAt: reportTime
      }
    })
  }

  const buildGameRows = (rtpOnly = false): ReportMetricRow[] =>
    gameStore.games.map((game, index) => {
      const theoreticalRtp = game.defaultRtp || 96
      const rtpDeviation = round(((index % 7) - 3) * 0.38)
      const actualRtp = round(theoreticalRtp + rtpDeviation)
      const betAmount = 780000 + index * 84650
      const payoutAmount = round(betAmount * (actualRtp / 100))
      return {
        id: `${rtpOnly ? 'RTP' : 'GAME'}-${game.id}`,
        primary: game.displayName,
        secondary: `${game.code} · ${game.englishName}`,
        category: game.typeId,
        currency: ['TWD', 'USD', 'USDT'][index % 3],
        gameId: game.id,
        gameName: game.displayName,
        merchantCount: game.merchantCount,
        rounds: 16420 + index * 1370,
        activeMembers: 820 + index * 63,
        betAmount,
        validBetAmount: round(betAmount * 0.972),
        payoutAmount,
        ggr: round(betAmount - payoutAmount),
        theoreticalRtp,
        actualRtp,
        rtpDeviation,
        status: getStatus(Math.abs(rtpDeviation) >= 1),
        updatedAt: game.updatedAt || reportTime
      }
    })

  const buildMerchantRows = (lineMode = false): ReportMetricRow[] => {
    if (lineMode) {
      return businessStore.merchants.flatMap((merchant, merchantIndex) =>
        merchant.lines.map((line, lineIndex) => {
          const seed = merchantIndex * 4 + lineIndex
          const betAmount = 425000 + seed * 32850
          const actualRtp = round(94.2 + (seed % 6) * 0.58)
          const payoutAmount = round(betAmount * (actualRtp / 100))
          return {
            id: `LINE-${line.uid}`,
            primary: line.uid,
            secondary: `${merchant.name} · ${line.walletMode}`,
            category: line.environment,
            currency: line.currency,
            agentId: merchant.agentId,
            agentName: merchant.agentName,
            merchantId: merchant.id,
            merchantName: merchant.name,
            lineUid: line.uid,
            rounds: 6020 + seed * 411,
            activeMembers: 235 + seed * 17,
            betAmount,
            validBetAmount: round(betAmount * 0.968),
            payoutAmount,
            ggr: round(betAmount - payoutAmount),
            actualRtp,
            successRate: round(99.91 - (seed % 5) * 0.18),
            status: getStatus(line.status !== 'Active' || seed % 9 === 0),
            updatedAt: line.updatedAt
          }
        })
      )
    }

    return businessStore.merchants.map((merchant, index) => {
      const betAmount = 1080000 + index * 94750
      const actualRtp = round(94.8 + (index % 5) * 0.64)
      const payoutAmount = round(betAmount * (actualRtp / 100))
      return {
        id: `MERCHANT-${merchant.id}`,
        primary: merchant.name,
        secondary: `${merchant.code} · ${merchant.walletMode}`,
        category: merchant.country,
        currency: merchant.settlementCurrency,
        agentId: merchant.agentId,
        agentName: merchant.agentName,
        merchantId: merchant.id,
        merchantName: merchant.name,
        rounds: 18900 + index * 1230,
        activeMembers: 670 + index * 49,
        betAmount,
        validBetAmount: round(betAmount * 0.965),
        payoutAmount,
        ggr: round(betAmount - payoutAmount),
        actualRtp,
        successRate: round(99.82 - (index % 4) * 0.11),
        status: getStatus(merchant.status !== 'Active'),
        updatedAt: merchant.updatedAt
      }
    })
  }

  const buildAgentRows = (merchantMode = false): ReportMetricRow[] => {
    if (merchantMode) {
      return buildMerchantRows().map((row) => ({
        ...row,
        id: `AGENT-MERCHANT-${row.merchantId}`,
        primary: row.merchantName || row.primary,
        secondary: `${row.agentName} · ${row.secondary}`
      }))
    }

    return businessStore.agents.map((agent, index) => {
      const betAmount = 2850000 + index * 184000
      const actualRtp = round(95.1 + (index % 5) * 0.42)
      const payoutAmount = round(betAmount * (actualRtp / 100))
      return {
        id: `AGENT-${agent.id}`,
        primary: agent.name,
        secondary: `${agent.code} · ${agent.level}`,
        category: agent.parentAgent,
        currency: agent.currency,
        agentId: agent.id,
        agentName: agent.name,
        merchantCount: agent.merchantCount,
        rounds: 38200 + index * 2150,
        activeMembers: 1320 + index * 92,
        betAmount,
        validBetAmount: round(betAmount * 0.969),
        payoutAmount,
        ggr: round(betAmount - payoutAmount),
        actualRtp,
        status: getStatus(agent.status !== 'Active'),
        updatedAt: agent.updatedAt || agent.createdAt
      }
    })
  }

  const buildMemberRows = (): ReportMetricRow[] =>
    memberStore.members.map((member) => {
      const activities = memberStore.getGameActivities(member.id)
      const betAmount = round(activities.reduce((total, item) => total + item.betAmount, 0))
      const payoutAmount = round(activities.reduce((total, item) => total + item.payoutAmount, 0))
      return {
        id: `MEMBER-${member.id}`,
        primary: member.externalId,
        secondary: `${member.id} · ${member.merchantName}`,
        category: member.tags.includes('Test') ? '測試會員' : '一般會員',
        currency: member.currency,
        agentId: member.agentId,
        agentName: member.agentName,
        merchantId: member.merchantId,
        merchantName: member.merchantName,
        lineUid: member.lineUid,
        memberId: member.id,
        memberName: member.externalId,
        rounds: activities.reduce((total, item) => total + item.rounds, 0),
        betAmount,
        payoutAmount,
        ggr: round(betAmount - payoutAmount),
        actualRtp: betAmount ? round((payoutAmount / betAmount) * 100) : 0,
        status: getStatus(member.riskStatus !== 'Normal' || member.restrictionStatus !== 'None'),
        updatedAt: member.lastPlayedAt
      }
    })

  const buildBetRows = (): ReportMetricRow[] => {
    const rows = new Map<string, ReportMetricRow>()
    transactionStore.bets.forEach((bet) => {
      const key = `${bet.gameId}-${bet.currency}`
      const current = rows.get(key) || {
        id: `BET-${key}`,
        primary: bet.gameName,
        secondary: `${bet.gameCode} · ${bet.currency}`,
        category: bet.gameType,
        currency: bet.currency,
        gameId: bet.gameId,
        gameName: bet.gameName,
        betCount: 0,
        rounds: 0,
        betAmount: 0,
        validBetAmount: 0,
        payoutAmount: 0,
        ggr: 0,
        actualRtp: 0,
        status: 'Normal' as const,
        updatedAt: bet.time
      }
      current.betCount = (current.betCount || 0) + 1
      current.rounds = current.betCount
      current.betAmount = round((current.betAmount || 0) + bet.betAmount)
      current.validBetAmount = round((current.validBetAmount || 0) + bet.betAmount)
      current.payoutAmount = round((current.payoutAmount || 0) + bet.payoutAmount)
      current.ggr = round((current.betAmount || 0) - (current.payoutAmount || 0))
      current.actualRtp = current.betAmount
        ? round(((current.payoutAmount || 0) / current.betAmount) * 100)
        : 0
      if (bet.riskStatus !== 'Normal') current.status = 'Attention'
      rows.set(key, current)
    })
    return [...rows.values()]
  }

  const buildTransactionRows = (): ReportMetricRow[] => {
    const groups = new Map<string, typeof transactionStore.transactions>()
    transactionStore.transactions.forEach((item) => {
      const key = `${item.type}-${item.currency}`
      groups.set(key, [...(groups.get(key) || []), item])
    })
    return [...groups.entries()].map(([key, records]) => {
      const [type, currency] = key.split('-')
      const successCount = records.filter((item) => item.status === 'Success').length
      const amount = round(records.reduce((total, item) => total + Math.abs(item.amount), 0))
      const attention = records.some((item) => item.riskStatus !== 'Normal')
      return {
        id: `TRANSACTION-${key}`,
        primary: type,
        secondary: `${currency} · 交易類型彙總`,
        category: type,
        currency,
        transactionCount: records.length,
        betAmount: amount,
        successRate: records.length ? round((successCount / records.length) * 100) : 0,
        status: getStatus(attention),
        updatedAt: records[0]?.time || reportTime
      }
    })
  }

  const buildJackpotRows = (): ReportMetricRow[] =>
    jackpotStore.pools.map((pool) => {
      const ledger = jackpotStore.getLedgerRecords(pool.id)
      const payouts = jackpotStore.getPayouts(pool.id)
      const contribution = round(
        ledger
          .filter((item) => item.type === 'Contribution')
          .reduce((total, item) => total + item.amount, 0)
      )
      const payoutAmount = round(payouts.reduce((total, item) => total + item.amount, 0))
      return {
        id: `JACKPOT-${pool.id}`,
        primary: pool.nameZh,
        secondary: `${pool.code} · ${pool.type}`,
        category: pool.type,
        currency: pool.baseCurrency,
        transactionCount: ledger.length,
        jackpotContribution: contribution,
        jackpotPayout: payoutAmount,
        currentBalance: pool.currentBalance,
        status: getStatus(pool.status !== 'Active'),
        updatedAt: pool.updatedAt
      }
    })

  const buildSettlementRows = (agentMode = false): ReportMetricRow[] => {
    if (agentMode) {
      return financeStore.agentReconciliations.map((record) => ({
        id: `AGENT-SETTLEMENT-${record.id}`,
        primary: record.agentName,
        secondary: `${record.agentCode} · ${record.period}`,
        period: record.period,
        currency: record.currency,
        agentId: record.agentId,
        agentName: record.agentName,
        merchantCount: record.merchantCount,
        betCount: record.betCount,
        betAmount: record.betAmount,
        payoutAmount: record.payoutAmount,
        ggr: record.ggr,
        adjustmentAmount: record.adjustmentAmount,
        settlementAmount: record.finalSettlementAmount,
        status:
          record.status === 'Locked' ? 'Completed' : getStatus(record.differenceCount > 0, true),
        updatedAt: record.updatedAt
      }))
    }

    return financeStore.merchantReconciliations.map((record) => ({
      id: `MERCHANT-SETTLEMENT-${record.id}`,
      primary: record.merchantName,
      secondary: `${record.merchantCode} · ${record.lineUid}`,
      period: record.period,
      currency: record.currency,
      agentId: record.agentId,
      agentName: record.agentName,
      merchantId: record.merchantId,
      merchantName: record.merchantName,
      lineUid: record.lineUid,
      betCount: record.betCount,
      betAmount: record.betAmount,
      payoutAmount: record.payoutAmount,
      ggr: record.ggr,
      adjustmentAmount: record.adjustmentAmount,
      settlementAmount: record.finalSettlementAmount,
      status:
        record.status === 'Locked' ? 'Completed' : getStatus(record.differenceCount > 0, true),
      updatedAt: record.updatedAt
    }))
  }

  const getRows = (mode: ReportMode): ReportMetricRow[] => {
    const rowsByMode: Record<ReportMode, () => ReportMetricRow[]> = {
      overview: buildOverviewRows,
      'game-performance': () => buildGameRows(false),
      rtp: () => buildGameRows(true),
      merchant: () => buildMerchantRows(false),
      'merchant-line': () => buildMerchantRows(true),
      agent: () => buildAgentRows(false),
      'agent-merchant': () => buildAgentRows(true),
      member: buildMemberRows,
      bet: buildBetRows,
      transaction: buildTransactionRows,
      jackpot: buildJackpotRows,
      'merchant-settlement': () => buildSettlementRows(false),
      'agent-settlement': () => buildSettlementRows(true)
    }
    return rowsByMode[mode]()
  }

  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string) =>
    round(amount * financeSettingsStore.getExchangeRate(fromCurrency, toCurrency))

  return { getRows, convertAmount, reportTime }
})
