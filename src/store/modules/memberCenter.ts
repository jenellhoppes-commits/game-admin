import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useBusinessPartnerStore } from './businessPartner'
import type {
  MemberAnomalyRecord,
  MemberBetRecord,
  MemberGameActivity,
  MemberJackpotRecord,
  MemberRecord,
  MemberRestrictionRecord,
  MemberTagKind,
  MemberTagRecord,
  MemberTransactionRecord
} from '@/types/game-provider'

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

export const useMemberCenterStore = defineStore('memberCenterStore', () => {
  const businessStore = useBusinessPartnerStore()
  const games = [
    ['G00001', 'Dragon Vault'],
    ['G00002', 'Neon Tiger'],
    ['G00003', 'Lucky Panda'],
    ['G00004', 'Royal Baccarat'],
    ['G00005', 'Fortune Ox']
  ] as const
  const sourceLines = businessStore.merchants.flatMap((merchant) =>
    merchant.lines.map((line) => ({ merchant, line }))
  )

  const members = ref<MemberRecord[]>(
    Array.from({ length: 20 }, (_, index) => {
      const { merchant, line } = sourceLines[index % sourceLines.length]
      const [latestGameId, latestGameName] = games[index % games.length]
      const tags: MemberTagKind[] =
        index % 7 === 0
          ? ['Test']
          : index % 9 === 0
            ? ['Whitelist']
            : index % 5 === 0
              ? ['Watch']
              : index % 11 === 0
                ? ['Risk']
                : []
      const restrictionStatus = index % 8 === 0 ? 'Active' : index % 13 === 0 ? 'Scheduled' : 'None'
      const riskStatus = tags.includes('Risk')
        ? 'High'
        : tags.includes('Watch')
          ? 'Attention'
          : 'Normal'
      const balance = 1280 + index * 317.45
      return {
        id: `P${String(index + 1).padStart(5, '0')}`,
        externalId: `${merchant.code}-USER-${1001 + (index % 12)}`,
        merchantId: merchant.id,
        merchantName: merchant.name,
        agentId: merchant.agentId,
        agentName: merchant.agentName,
        lineUid: line.uid,
        currency: line.currency,
        walletMode: line.walletMode,
        merchantStatus: index % 10 === 0 ? 'Inactive' : 'Active',
        restrictionStatus,
        riskStatus,
        tags,
        latestGameId,
        latestGameName,
        firstPlayedAt: `2026-0${(index % 7) + 1}-${String((index % 20) + 1).padStart(2, '0')} 10:20`,
        lastPlayedAt: `2026-08-${String(31 - (index % 12)).padStart(2, '0')} ${String(18 - (index % 8)).padStart(2, '0')}:20`,
        createdAt: `2026-0${(index % 7) + 1}-${String((index % 20) + 1).padStart(2, '0')} 09:00`,
        wallet: {
          balance,
          availableBalance: line.walletMode === 'Transfer' ? balance - 120 : undefined,
          frozenBalance: line.walletMode === 'Transfer' ? 120 : undefined,
          source: line.walletMode === 'Seamless' ? 'Merchant' : 'Game Wallet',
          updatedAt: `2026-08-${String(31 - (index % 12)).padStart(2, '0')} 18:18`
        }
      } satisfies MemberRecord
    })
  )

  const tagRecords = ref<MemberTagRecord[]>(
    members.value.flatMap((member) =>
      member.tags.map((tag, index) => ({
        id: `MTAG-${member.id}-${index + 1}`,
        memberId: member.id,
        tag,
        reason:
          tag === 'Test' ? '商戶串接測試帳號' : tag === 'Whitelist' ? '已核准白名單' : '營運標記',
        operator: 'Operations Admin',
        createdAt: member.createdAt,
        status: 'Active'
      }))
    )
  )

  const restrictionRecords = ref<MemberRestrictionRecord[]>(
    members.value
      .filter((member) => member.restrictionStatus !== 'None')
      .map((member, index) => ({
        id: `MRST-${member.id}-001`,
        memberId: member.id,
        scope: 'All Games',
        reason: index % 2 === 0 ? '高頻投注行為待人工確認' : '商戶提出暫時限制需求',
        startAt: member.restrictionStatus === 'Scheduled' ? '2026-09-05 00:00' : '2026-08-30 12:00',
        status: member.restrictionStatus === 'Scheduled' ? 'Scheduled' : 'Active',
        operator: 'Risk Admin',
        createdAt: '2026-08-30 11:55'
      }))
  )

  const gameActivities = ref<MemberGameActivity[]>(
    members.value.flatMap((member, memberIndex) =>
      Array.from({ length: 3 + (memberIndex % 3) }, (_, index) => {
        const [gameId, gameName] = games[(memberIndex + index) % games.length]
        const betAmount = 4280 + memberIndex * 211 + index * 860
        return {
          id: `MGA-${member.id}-${gameId}`,
          memberId: member.id,
          gameId,
          gameName,
          firstPlayedAt: member.firstPlayedAt,
          lastPlayedAt: `2026-08-${String(31 - ((memberIndex + index) % 12)).padStart(2, '0')} ${String(18 - (index % 5)).padStart(2, '0')}:20`,
          rounds: 24 + memberIndex * 3 + index * 11,
          betAmount,
          payoutAmount: Number(
            (betAmount * (0.82 + ((memberIndex + index) % 7) * 0.025)).toFixed(2)
          ),
          status: index === 4 ? 'Inactive' : 'Active'
        }
      })
    )
  )

  const betRecords = ref<MemberBetRecord[]>(
    members.value.flatMap((member, memberIndex) =>
      Array.from({ length: 7 }, (_, index) => {
        const [gameId, gameName] = games[(memberIndex + index) % games.length]
        const betAmount = 20 + (((memberIndex + 2) * (index + 3) * 7) % 480)
        const status =
          index === 0 && memberIndex % 6 === 0
            ? 'Exception'
            : index === 1
              ? 'In Progress'
              : 'Settled'
        const payoutAmount =
          status === 'In Progress'
            ? 0
            : (memberIndex + index) % 3 === 0
              ? betAmount * 1.8
              : betAmount * 0.45
        const sequence = memberIndex * 7 + index + 1
        return {
          id: `B${String(sequence).padStart(5, '0')}`,
          memberId: member.id,
          roundId: `RND-202608-${String(sequence).padStart(6, '0')}`,
          gameId,
          gameName,
          betAmount,
          payoutAmount: Number(payoutAmount.toFixed(2)),
          playerNet: Number((payoutAmount - betAmount).toFixed(2)),
          currency: member.currency,
          status,
          time: `2026-08-${String(31 - (index % 10)).padStart(2, '0')} ${String(18 - (index % 8)).padStart(2, '0')}:${String(10 + memberIndex).slice(-2)}`
        }
      })
    )
  )

  const transactionRecords = ref<MemberTransactionRecord[]>(
    betRecords.value.flatMap((bet, index) => {
      const betTransaction: MemberTransactionRecord = {
        id: `TX${String(index * 2 + 1).padStart(5, '0')}`,
        memberId: bet.memberId,
        type: 'Bet',
        gameId: bet.gameId,
        gameName: bet.gameName,
        roundId: bet.roundId,
        amount: -bet.betAmount,
        currency: bet.currency,
        status: bet.status === 'Exception' ? 'Exception' : 'Success',
        time: bet.time
      }
      const payoutTransaction: MemberTransactionRecord = {
        id: `TX${String(index * 2 + 2).padStart(5, '0')}`,
        memberId: bet.memberId,
        type: 'Payout',
        gameId: bet.gameId,
        gameName: bet.gameName,
        roundId: bet.roundId,
        amount: bet.payoutAmount,
        currency: bet.currency,
        status: bet.status === 'In Progress' ? 'Processing' : 'Success',
        time: bet.time
      }
      return [betTransaction, payoutTransaction]
    })
  )

  const jackpotRecords = ref<MemberJackpotRecord[]>(
    members.value
      .filter((_, index) => index % 4 === 0)
      .map((member, index) => {
        const [gameId, gameName] = games[index % games.length]
        return {
          id: `MJP-${String(index + 1).padStart(4, '0')}`,
          memberId: member.id,
          poolId: `JP${String((index % 5) + 1).padStart(5, '0')}`,
          poolName: `${gameName} 累積獎池`,
          level: index % 2 === 0 ? 'Grand' : 'Major',
          gameId,
          gameName,
          amount: 28000 + index * 13850,
          currency: member.currency,
          roundId: `RND-JP-${String(index + 1).padStart(5, '0')}`,
          payoutAt: `2026-08-${String(27 - index).padStart(2, '0')} 21:36`,
          status: index === 3 ? 'Pending' : 'Paid'
        }
      })
  )

  const anomalyRecords = ref<MemberAnomalyRecord[]>(
    members.value
      .filter((member) => member.riskStatus !== 'Normal' || member.restrictionStatus !== 'None')
      .map((member, index) => {
        const bet = betRecords.value.find((record) => record.memberId === member.id)
        const transaction = transactionRecords.value.find((record) => record.memberId === member.id)
        return {
          id: `MA-${String(index + 1).padStart(5, '0')}`,
          memberId: member.id,
          type: index % 2 === 0 ? '短時間高頻投注' : '交易金額偏離基準',
          gameId: bet?.gameId,
          gameName: bet?.gameName,
          betId: bet?.id,
          transactionId: transaction?.id,
          riskLevel: member.riskStatus === 'High' ? 'High' : 'Medium',
          occurredAt: bet?.time ?? member.lastPlayedAt,
          status: index % 3 === 0 ? 'Investigating' : 'Open',
          riskCaseId: `R${String(index + 1).padStart(5, '0')}`
        }
      })
  )

  const totalCount = computed(() => members.value.length)
  const restrictedCount = computed(
    () => members.value.filter((member) => member.restrictionStatus === 'Active').length
  )
  const riskCount = computed(
    () => members.value.filter((member) => member.riskStatus !== 'Normal').length
  )
  const excludedCount = computed(
    () =>
      members.value.filter((member) =>
        member.tags.some((tag) => ['Test', 'Whitelist'].includes(tag))
      ).length
  )

  const findMember = (id: string) => members.value.find((member) => member.id === id)
  const getTagRecords = (memberId: string) =>
    tagRecords.value.filter((record) => record.memberId === memberId)
  const getRestrictionRecords = (memberId: string) =>
    restrictionRecords.value.filter((record) => record.memberId === memberId)
  const getGameActivities = (memberId: string) =>
    gameActivities.value.filter((record) => record.memberId === memberId)
  const getBetRecords = (memberId: string) =>
    betRecords.value.filter((record) => record.memberId === memberId)
  const getTransactionRecords = (memberId: string) =>
    transactionRecords.value.filter((record) => record.memberId === memberId)
  const getJackpotRecords = (memberId: string) =>
    jackpotRecords.value.filter((record) => record.memberId === memberId)
  const getAnomalyRecords = (memberId: string) =>
    anomalyRecords.value.filter((record) => record.memberId === memberId)

  const addTag = (memberIds: string[], tag: MemberTagKind, reason: string, note?: string) => {
    const now = formatNow()
    memberIds.forEach((memberId) => {
      const member = findMember(memberId)
      if (!member || member.tags.includes(tag)) return
      member.tags.push(tag)
      if (tag === 'Risk') member.riskStatus = 'High'
      if (tag === 'Watch' && member.riskStatus === 'Normal') member.riskStatus = 'Attention'
      tagRecords.value.unshift({
        id: `MTAG-${memberId}-${Date.now()}`,
        memberId,
        tag,
        reason,
        note,
        operator: 'Operations Admin',
        createdAt: now,
        status: 'Active'
      })
    })
  }

  const removeTag = (memberId: string, recordId: string, reason: string) => {
    const record = tagRecords.value.find(
      (item) => item.id === recordId && item.memberId === memberId
    )
    const member = findMember(memberId)
    if (!record || !member || record.status !== 'Active') return
    record.status = 'Removed'
    record.removedAt = formatNow()
    record.removalReason = reason
    const hasOtherActiveTag = tagRecords.value.some(
      (item) => item.memberId === memberId && item.tag === record.tag && item.status === 'Active'
    )
    if (!hasOtherActiveTag) member.tags = member.tags.filter((tag) => tag !== record.tag)
    if (record.tag === 'Risk' && !member.tags.includes('Risk')) {
      member.riskStatus = member.tags.includes('Watch') ? 'Attention' : 'Normal'
    }
    if (record.tag === 'Watch' && !member.tags.includes('Watch') && !member.tags.includes('Risk')) {
      member.riskStatus = 'Normal'
    }
  }

  const restrictMember = (
    memberId: string,
    input: { reason: string; note?: string; startAt?: string; endAt?: string }
  ) => {
    const member = findMember(memberId)
    if (!member) return
    const startAt = input.startAt || formatNow()
    const status = startAt > formatNow() ? 'Scheduled' : 'Active'
    member.restrictionStatus = status
    restrictionRecords.value.unshift({
      id: `MRST-${memberId}-${Date.now()}`,
      memberId,
      scope: 'All Games',
      reason: input.reason,
      note: input.note,
      startAt,
      endAt: input.endAt,
      status,
      operator: 'Risk Admin',
      createdAt: formatNow()
    })
  }

  const releaseRestriction = (memberId: string, reason: string) => {
    const member = findMember(memberId)
    if (!member) return
    const record = restrictionRecords.value.find(
      (item) => item.memberId === memberId && ['Active', 'Scheduled'].includes(item.status)
    )
    if (record) {
      record.status = 'Cancelled'
      record.releasedAt = formatNow()
      record.releaseReason = reason
    }
    member.restrictionStatus = 'None'
  }

  return {
    members,
    tagRecords,
    restrictionRecords,
    gameActivities,
    betRecords,
    transactionRecords,
    jackpotRecords,
    anomalyRecords,
    totalCount,
    restrictedCount,
    riskCount,
    excludedCount,
    findMember,
    getTagRecords,
    getRestrictionRecords,
    getGameActivities,
    getBetRecords,
    getTransactionRecords,
    getJackpotRecords,
    getAnomalyRecords,
    addTag,
    removeTag,
    restrictMember,
    releaseRestriction
  }
})
