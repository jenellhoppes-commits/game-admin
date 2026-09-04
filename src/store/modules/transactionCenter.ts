import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMemberCenterStore } from './memberCenter'
import { useGameCatalogStore } from './gameCatalog'
import type {
  BetBoardStage,
  BetCenterRecord,
  BetReplayEvent,
  BetReplayStatus,
  BetResultAccessLog,
  BetVersionSnapshot,
  MemberAnomalyRecord,
  TransactionCenterRecord,
  TransactionHistoryEntry
} from '@/types/game-provider'

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

const symbolSeeds = [
  ['SYM01', '金幣', '🪙'],
  ['SYM02', '寶石', '💎'],
  ['SYM03', '皇冠', '👑'],
  ['WILD', '百搭', '🃏'],
  ['BONUS', '獎勵', '🎁'],
  ['SCATTER', '免費遊戲', '⭐'],
  ['SYM07', '金牛', '🐂'],
  ['SYM08', '火焰', '🔥']
] as const

const buildBoardStage = (
  stageId: string,
  sequence: number,
  type: BetBoardStage['type'],
  label: string,
  seed: number,
  multiplier: number,
  payoutAmount: number,
  feature?: string
): BetBoardStage => {
  const rows = 3
  const columns = 5
  const winningSymbolIndex = (seed + sequence) % symbolSeeds.length
  return {
    id: stageId,
    sequence,
    type,
    label,
    rows,
    columns,
    cells: Array.from({ length: rows * columns }, (_, position) => {
      const symbol = symbolSeeds[(seed + position * 3 + sequence) % symbolSeeds.length]
      const row = Math.floor(position / columns)
      const column = position % columns
      const winning = row === 1 && column >= 1 && column <= 3
      const displayedSymbol = winning ? symbolSeeds[winningSymbolIndex] : symbol
      return {
        position,
        row,
        column,
        symbolId: displayedSymbol[0],
        symbolName: displayedSymbol[1],
        icon: displayedSymbol[2],
        winning,
        winLineIds: winning ? [`LINE-${sequence}`] : []
      }
    }),
    winMultiplier: multiplier,
    payoutAmount,
    feature
  }
}

export const useTransactionCenterStore = defineStore('transactionCenterStore', () => {
  const memberStore = useMemberCenterStore()
  const gameStore = useGameCatalogStore()

  const bets = ref<BetCenterRecord[]>(
    memberStore.betRecords.map((record, index) => {
      const member = memberStore.findMember(record.memberId)!
      const game = gameStore.findGame(record.gameId)
      const anomaly = memberStore.anomalyRecords.find((item) => item.betId === record.id)
      const transactionIds = memberStore.transactionRecords
        .filter((item) => item.memberId === record.memberId && item.roundId === record.roundId)
        .map((item) => item.id)
      const isSlot = game?.typeId === 'GT001'
      const hasFinalResult = record.status !== 'In Progress'
      const replayStatus: BetReplayStatus = !hasFinalResult
        ? 'Missing Data'
        : index % 13 === 0
          ? 'Unsupported'
          : isSlot && index % 7 === 0
            ? 'Partial'
            : 'Available'
      const supportsBoardDisplay =
        Boolean(game?.supportsBoardDisplay ?? isSlot) &&
        replayStatus !== 'Unsupported' &&
        replayStatus !== 'Missing Data'
      const supportsResultReplay =
        Boolean(game?.supportsResultReplay ?? isSlot) &&
        (replayStatus === 'Available' || replayStatus === 'Partial')
      const supportsEventReplay =
        Boolean(game?.supportsEventReplay ?? true) &&
        hasFinalResult &&
        replayStatus !== 'Unsupported' &&
        replayStatus !== 'Missing Data'
      const version: BetVersionSnapshot = {
        gameVersion: `1.${(index % 9) + 1}.${index % 4}`,
        resultFormatVersion: index % 5 === 0 ? 'V1' : 'V2',
        rtpPlan: `${game?.defaultRtp || 96}%｜RTP-${String((index % 3) + 1).padStart(2, '0')}`,
        limitPlan: `${record.currency} Standard v${(index % 4) + 1}`,
        replayAssetVersion: supportsBoardDisplay ? `1.${(index % 9) + 1}.${index % 4}` : '不適用'
      }
      const jackpotAmount =
        index % 9 === 0 && hasFinalResult ? Math.round(record.payoutAmount * 0.2) : 0
      const stages: BetBoardStage[] = supportsBoardDisplay
        ? [
            buildBoardStage(
              `${record.roundId}-MAIN`,
              1,
              'Base Game',
              '主遊戲',
              index,
              Math.min(5, Math.max(0, record.payoutAmount / Math.max(record.betAmount, 1))),
              Math.round(record.payoutAmount * 0.25)
            ),
            ...(index % 3 === 0
              ? [
                  buildBoardStage(
                    `${record.roundId}-CASCADE-01`,
                    2,
                    'Cascade' as const,
                    '連消 1',
                    index + 2,
                    5,
                    Math.round(record.payoutAmount * 0.25),
                    'Cascading'
                  )
                ]
              : []),
            ...(index % 4 === 0
              ? [
                  buildBoardStage(
                    `${record.roundId}-FREE-01`,
                    index % 3 === 0 ? 3 : 2,
                    'Free Game' as const,
                    '免費遊戲 1',
                    index + 4,
                    Math.max(
                      1,
                      Number((record.payoutAmount / Math.max(record.betAmount, 1)).toFixed(2))
                    ),
                    Math.round(record.payoutAmount * 0.5),
                    'Free Game'
                  )
                ]
              : [])
          ]
        : []
      const events: BetReplayEvent[] = supportsEventReplay
        ? [
            {
              id: `${record.roundId}-EV01`,
              sequence: 1,
              offsetSeconds: 0,
              type: 'Bet' as const,
              title: `投注 ${record.betAmount} ${record.currency}`,
              detail: '錢包完成投注扣款並建立遊戲局',
              amount: -record.betAmount,
              currency: record.currency,
              transactionId: transactionIds[0]
            },
            {
              id: `${record.roundId}-EV02`,
              sequence: 2,
              offsetSeconds: 1,
              type: 'Game Start' as const,
              title: isSlot ? '開始 Spin' : '遊戲事件開始',
              detail: `${game?.displayName || record.gameName} 使用版本 ${version.gameVersion}`
            },
            ...stages.flatMap((stage, stageIndex) => [
              {
                id: `${record.roundId}-BOARD-${stageIndex + 1}`,
                sequence: 3 + stageIndex * 2,
                offsetSeconds: 3 + stageIndex * 3,
                type: 'Board Result' as const,
                title: stage.label,
                detail: `盤面 ${stage.rows}×${stage.columns}，本盤倍率 ×${stage.winMultiplier}`,
                stageId: stage.id,
                riskAlert: anomaly && stageIndex === stages.length - 1 ? anomaly.type : undefined
              },
              {
                id: `${record.roundId}-WIN-${stageIndex + 1}`,
                sequence: 4 + stageIndex * 2,
                offsetSeconds: 4 + stageIndex * 3,
                type: stage.feature ? ('Feature' as const) : ('Win Evaluation' as const),
                title: stage.feature || '中獎判定',
                detail: `${stage.label} 派彩 ${stage.payoutAmount} ${record.currency}`,
                stageId: stage.id,
                amount: stage.payoutAmount,
                currency: record.currency
              }
            ]),
            ...(jackpotAmount > 0
              ? [
                  {
                    id: `${record.roundId}-JACKPOT`,
                    sequence: 90,
                    offsetSeconds: 12,
                    type: 'Jackpot' as const,
                    title: 'Jackpot Trigger',
                    detail: `觸發獎池派彩 ${jackpotAmount} ${record.currency}`,
                    amount: jackpotAmount,
                    currency: record.currency,
                    riskAlert: anomaly?.type
                  }
                ]
              : []),
            {
              id: `${record.roundId}-PAYOUT`,
              sequence: 98,
              offsetSeconds: 15,
              type: 'Payout' as const,
              title: `派彩 ${record.payoutAmount} ${record.currency}`,
              detail: '派彩結果送交錢包服務',
              amount: record.payoutAmount,
              currency: record.currency,
              transactionId: transactionIds[1]
            },
            {
              id: `${record.roundId}-END`,
              sequence: 99,
              offsetSeconds: 16,
              type: 'Round End' as const,
              title: 'Round End',
              detail: '歷史結果已封存，不允許重新計算'
            }
          ].sort((a, b) => a.sequence - b.sequence)
        : []
      const outcome =
        record.status === 'In Progress'
          ? '等待遊戲結果'
          : record.payoutAmount > record.betAmount
            ? '會員獲勝'
            : record.payoutAmount === 0
              ? '未派彩'
              : '部分派彩'
      return {
        ...record,
        externalMemberId: member.externalId,
        gameCode: game?.code || record.gameId,
        gameName: game?.displayName || record.gameName,
        gameType: game?.typeId || 'GT008',
        merchantId: member.merchantId,
        merchantName: member.merchantName,
        agentId: member.agentId,
        agentName: member.agentName,
        lineUid: member.lineUid,
        walletMode: member.walletMode,
        settledAt: record.status === 'In Progress' ? undefined : record.time,
        transactionIds,
        riskStatus: anomaly
          ? anomaly.riskLevel === 'High'
            ? 'Exception'
            : 'Attention'
          : record.status === 'Exception'
            ? 'Exception'
            : 'Normal',
        result: {
          resultType:
            record.status === 'In Progress'
              ? 'Pending'
              : record.status === 'Cancelled'
                ? 'Cancelled'
                : record.payoutAmount > 0
                  ? 'Win'
                  : 'Loss',
          outcome,
          multiplier:
            record.betAmount > 0 ? Number((record.payoutAmount / record.betAmount).toFixed(2)) : 0,
          feature: index % 4 === 0 ? '免費旋轉' : index % 5 === 0 ? '倍數加成' : '一般局',
          resultCode: `RESULT-${record.roundId.slice(-6)}`,
          jackpotAmount,
          summary: `${outcome}；投注 ${record.betAmount} ${record.currency}，派彩 ${record.payoutAmount} ${record.currency}`,
          version,
          replay: {
            status: replayStatus,
            supportsBoardDisplay,
            supportsResultReplay,
            supportsEventReplay,
            stages,
            events
          },
          rawPayload: JSON.stringify(
            {
              round_id: record.roundId,
              game_code: game?.code || record.gameId,
              game_version: version.gameVersion,
              result_format_version: version.resultFormatVersion,
              rtp_plan: version.rtpPlan,
              limit_plan: version.limitPlan,
              bet: record.betAmount,
              result: {
                outcome,
                payout: record.payoutAmount,
                multiplier:
                  record.betAmount > 0
                    ? Number((record.payoutAmount / record.betAmount).toFixed(2))
                    : 0
              },
              symbols: stages.map((stage) => ({
                stage: stage.label,
                rows: stage.rows,
                columns: stage.columns,
                cells: stage.cells.map((cell) => ({
                  position: cell.position,
                  symbol_id: cell.symbolId,
                  winning: cell.winning
                }))
              })),
              features: stages.filter((stage) => stage.feature).map((stage) => stage.feature),
              jackpot: jackpotAmount || null,
              events
            },
            null,
            2
          )
        }
      }
    })
  )

  const resultAccessLogs = ref<BetResultAccessLog[]>([])

  const transactions = ref<TransactionCenterRecord[]>(
    memberStore.transactionRecords.map((record, index) => {
      const member = memberStore.findMember(record.memberId)!
      const bet = bets.value.find(
        (item) => item.memberId === record.memberId && item.roundId === record.roundId
      )
      const anomaly = memberStore.anomalyRecords.find(
        (item) => item.transactionId === record.id || item.betId === bet?.id
      )
      const beforeBalance = member.wallet.balance + ((index % 9) + 1) * 100
      const history: TransactionHistoryEntry[] = [
        {
          id: `${record.id}-H01`,
          status: 'Processing',
          action: '接收交易請求',
          note: `外部請求已通過格式驗證，來源線路 ${member.lineUid}`,
          operator: 'System',
          time: record.time
        }
      ]
      if (record.status !== 'Processing') {
        history.push({
          id: `${record.id}-H02`,
          status: record.status,
          action: record.status === 'Success' ? '交易完成' : '交易狀態更新',
          note:
            record.status === 'Success'
              ? '錢包回應成功，交易結果已寫入帳務紀錄'
              : '交易進入例外處理流程',
          operator: record.status === 'Success' ? 'Wallet Service' : 'Risk Service',
          time: record.time
        })
      }
      return {
        ...record,
        gameName: bet?.gameName || record.gameName,
        externalMemberId: member.externalId,
        merchantId: member.merchantId,
        merchantName: member.merchantName,
        agentId: member.agentId,
        agentName: member.agentName,
        lineUid: member.lineUid,
        walletMode: member.walletMode,
        betId: bet?.id,
        externalReference: `EXT-${member.merchantId}-${record.id}`,
        beforeBalance,
        afterBalance: Number((beforeBalance + record.amount).toFixed(2)),
        completedAt: record.status === 'Processing' ? undefined : record.time,
        riskStatus: anomaly
          ? anomaly.riskLevel === 'High'
            ? 'Exception'
            : 'Attention'
          : record.status === 'Exception'
            ? 'Exception'
            : 'Normal',
        history
      }
    })
  )

  const totalBetAmount = computed(() =>
    bets.value.reduce((sum, record) => sum + record.betAmount, 0)
  )
  const totalPayoutAmount = computed(() =>
    bets.value.reduce((sum, record) => sum + record.payoutAmount, 0)
  )
  const unsettledBetCount = computed(
    () => bets.value.filter((record) => record.status === 'In Progress').length
  )
  const exceptionBetCount = computed(
    () => bets.value.filter((record) => record.riskStatus === 'Exception').length
  )
  const successfulTransactionCount = computed(
    () => transactions.value.filter((record) => record.status === 'Success').length
  )
  const exceptionTransactionCount = computed(
    () => transactions.value.filter((record) => record.riskStatus === 'Exception').length
  )

  const findBet = (id: string) => bets.value.find((record) => record.id === id)
  const findTransaction = (id: string) => transactions.value.find((record) => record.id === id)
  const getTransactionsByBet = (betId: string) =>
    transactions.value.filter((record) => record.betId === betId)
  const getBetAnomalies = (betId: string): MemberAnomalyRecord[] =>
    memberStore.anomalyRecords.filter((record) => record.betId === betId)
  const getTransactionAnomalies = (transactionId: string): MemberAnomalyRecord[] =>
    memberStore.anomalyRecords.filter((record) => record.transactionId === transactionId)
  const getBetResultAccessLogs = (betId: string) =>
    resultAccessLogs.value.filter((record) => record.betId === betId)
  const logBetResultAccess = (
    betId: string,
    action: BetResultAccessLog['action'],
    detail: string
  ) => {
    const latest = resultAccessLogs.value[0]
    if (latest?.betId === betId && latest.action === action && latest.detail === detail) return
    resultAccessLogs.value.unshift({
      id: `BRLOG-${Date.now()}`,
      betId,
      action,
      detail,
      operator: 'Super Admin',
      time: formatNow()
    })
  }

  return {
    bets,
    transactions,
    resultAccessLogs,
    totalBetAmount,
    totalPayoutAmount,
    unsettledBetCount,
    exceptionBetCount,
    successfulTransactionCount,
    exceptionTransactionCount,
    findBet,
    findTransaction,
    getTransactionsByBet,
    getBetAnomalies,
    getTransactionAnomalies,
    getBetResultAccessLogs,
    logBetResultAccess
  }
})
