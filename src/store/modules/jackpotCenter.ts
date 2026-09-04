import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useBusinessPartnerStore } from './businessPartner'
import { useGameCatalogStore } from './gameCatalog'
import { useMemberCenterStore } from './memberCenter'
import type {
  JackpotAuditRecord,
  JackpotGameBinding,
  JackpotLedgerRecord,
  JackpotLevelRecord,
  JackpotMerchantSetting,
  JackpotPayoutRecord,
  JackpotPoolRecord,
  JackpotStatus,
  JackpotType,
  MerchantLine,
  MerchantRecord
} from '@/types/game-provider'

export interface NewJackpotPayload {
  code: string
  nameZh: string
  nameEn: string
  type: JackpotType
  baseCurrency: string
  timezone: string
  description: string
  note?: string
  levels: Array<{
    code: string
    name: string
    initialDisplayAmount: number
    minimumDisplayAmount: number
    color: string
  }>
  gameIds: string[]
  merchantLineUids: string[]
}

export interface JackpotEligibleMerchantLine {
  merchant: MerchantRecord
  line: MerchantLine
  eligibleGameIds: string[]
  eligibleGameNames: string[]
}

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

export const useJackpotCenterStore = defineStore('jackpotCenterStore', () => {
  const businessStore = useBusinessPartnerStore()
  const gameStore = useGameCatalogStore()
  const memberStore = useMemberCenterStore()
  const poolNames = [
    ['龍之寶庫共享獎池', 'Dragon Vault Shared Pool'],
    ['亞洲幸運累積獎池', 'Asia Fortune Progressive'],
    ['黃金老虎活動獎池', 'Golden Tiger Campaign'],
    ['熊貓歡樂累積獎池', 'Panda Joy Progressive'],
    ['皇家娛樂共享獎池', 'Royal Entertainment Pool'],
    ['財富之牛獎池', 'Fortune Ox Jackpot'],
    ['週末驚喜活動獎池', 'Weekend Surprise Campaign'],
    ['全球經典共享獎池', 'Global Classic Pool']
  ] as const
  const currencies = ['USD', 'TWD', 'USDT', 'JPY', 'EUR', 'THB', 'SGD', 'HKD']
  const levelSeeds = [
    ['MINI', 'Mini', '#67c23a'],
    ['MINOR', 'Minor', '#409eff'],
    ['MAJOR', 'Major', '#e6a23c'],
    ['GRAND', 'Grand', '#f56c6c']
  ] as const
  const jackpotCapableGames = computed(() =>
    gameStore.games.filter((game) => game.featureTagIds.includes('FT003'))
  )

  const pools = ref<JackpotPoolRecord[]>(
    poolNames.map(([nameZh, nameEn], index) => ({
      id: `JP${String(index + 1).padStart(5, '0')}`,
      code: `JP_${String(index + 1).padStart(3, '0')}`,
      nameZh,
      nameEn,
      type: (index % 3 === 0
        ? 'Single Game'
        : index % 3 === 1
          ? 'Shared Games'
          : 'Campaign') as JackpotType,
      baseCurrency: currencies[index],
      timezone: index % 2 === 0 ? 'Asia/Taipei' : 'UTC',
      description: '提供指定遊戲與商戶使用的累積獎池展示與派發追查。',
      note: index % 3 === 0 ? '重點營運獎池' : '',
      currentBalance: 125000 + index * 87650,
      status: ([
        'Active',
        'Active',
        'Maintenance',
        'Draft',
        'Active',
        'Pending',
        'Disabled',
        'Closed'
      ][index] || 'Draft') as JackpotStatus,
      createdBy: index % 2 === 0 ? 'Jackpot Admin' : 'Operations Admin',
      createdAt: `2026-0${(index % 6) + 1}-${String(index + 3).padStart(2, '0')} 10:00`,
      updatedAt: `2026-09-0${(index % 3) + 1} ${String(9 + index).padStart(2, '0')}:20`
    }))
  )

  const levels = ref<JackpotLevelRecord[]>(
    pools.value.flatMap((pool, poolIndex) =>
      levelSeeds.slice(0, 2 + (poolIndex % 3)).map(([code, name, color], index) => {
        const currentBalance = Math.round(pool.currentBalance * (0.1 + index * 0.18))
        return {
          id: `JPLV-${pool.id}-${String(index + 1).padStart(2, '0')}`,
          poolId: pool.id,
          code,
          name,
          sort: index + 1,
          initialDisplayAmount: 1000 * 10 ** index,
          minimumDisplayAmount: 500 * 10 ** index,
          currentBalance,
          color,
          status: index === 3 && pool.status !== 'Active' ? 'Disabled' : 'Active',
          note: index === 0 ? '基本獎池級別' : '',
          updatedAt: pool.updatedAt
        }
      })
    )
  )

  const gameBindings = ref<JackpotGameBinding[]>(
    pools.value.flatMap((pool, poolIndex) =>
      [
        jackpotCapableGames.value[poolIndex % jackpotCapableGames.value.length],
        jackpotCapableGames.value[(poolIndex + 1) % jackpotCapableGames.value.length]
      ].map((game) => ({
        id: `JPGB-${pool.id}-${game.id}`,
        poolId: pool.id,
        gameId: game.id,
        gameName: game.displayName,
        gameType: game.typeId,
        rtpPlan:
          game.rtpStatus === 'Configured' ? `${game.defaultRtp || 96}% 預設方案` : '尚未設定',
        limitPlan: game.limitStatus === 'Configured' ? '預設限紅方案' : '尚未設定',
        status: pool.status === 'Draft' ? 'Scheduled' : 'Active',
        effectiveAt: pool.createdAt,
        updatedAt: pool.updatedAt
      }))
    )
  )

  const merchantSettings = ref<JackpotMerchantSetting[]>(
    pools.value.flatMap((pool) => {
      const poolGameIds = gameBindings.value
        .filter((binding) => binding.poolId === pool.id && binding.status !== 'Disabled')
        .map((binding) => binding.gameId)
      return businessStore.merchants
        .flatMap((merchant) =>
          merchant.lines.map((line) => ({
            merchant,
            line,
            gameConfigurations: businessStore
              .getMerchantLineGameConfigurations(line.uid)
              .filter(
                (config) =>
                  poolGameIds.includes(config.gameId) &&
                  config.enabled &&
                  config.jackpotMode !== 'Excluded'
              )
          }))
        )
        .filter(
          ({ line, gameConfigurations }) =>
            line.status === 'Active' &&
            line.currency === pool.baseCurrency &&
            gameConfigurations.length > 0
        )
        .slice(0, 3)
        .map(({ merchant, line }) => ({
          id: `JPMS-${pool.id}-${line.uid}`,
          poolId: pool.id,
          merchantId: merchant.id,
          merchantName: merchant.name,
          agentId: merchant.agentId,
          agentName: merchant.agentName,
          lineUid: line.uid,
          currency: line.currency,
          walletMode: line.walletMode,
          displayName: pool.nameZh,
          status: pool.status === 'Active' ? 'Active' : 'Disabled',
          effectiveAt: pool.createdAt,
          updatedAt: pool.updatedAt
        }))
    })
  )

  const ledgerRecords = ref<JackpotLedgerRecord[]>(
    pools.value.flatMap((pool, poolIndex) => {
      const poolLevels = levels.value.filter((item) => item.poolId === pool.id)
      const poolGames = gameBindings.value.filter((item) => item.poolId === pool.id)
      const poolMerchants = merchantSettings.value.filter((item) => item.poolId === pool.id)
      return Array.from({ length: 10 }, (_, index) => {
        const member = memberStore.members[(poolIndex * 2 + index) % memberStore.members.length]
        const level = poolLevels[index % poolLevels.length]
        const game = poolGames[index % poolGames.length]
        const merchant = poolMerchants[index % poolMerchants.length]
        const type = index === 0 ? 'Payout' : index === 7 ? 'Rollback' : 'Contribution'
        const amount =
          type === 'Payout'
            ? -(25000 + poolIndex * 5000)
            : type === 'Rollback'
              ? -350
              : 120 + index * 48
        const beforeBalance = pool.currentBalance - amount * (index + 1)
        return {
          id: `JPLE-${String(poolIndex * 10 + index + 1).padStart(6, '0')}`,
          poolId: pool.id,
          levelId: level.id,
          levelName: level.name,
          type,
          memberId: member.id,
          externalMemberId: member.externalId,
          merchantId: merchant?.merchantId || member.merchantId,
          merchantName: merchant?.merchantName || member.merchantName,
          gameId: game.gameId,
          gameName: game.gameName,
          roundId: `RND-JP-${String(poolIndex * 10 + index + 1).padStart(6, '0')}`,
          beforeBalance,
          amount,
          afterBalance: beforeBalance + amount,
          currency: pool.baseCurrency,
          status: index === 8 ? 'Rolled Back' : 'Success',
          occurredAt: `2026-09-0${(index % 3) + 1} ${String(18 - (index % 8)).padStart(2, '0')}:20`
        }
      })
    })
  )

  const payouts = ref<JackpotPayoutRecord[]>(
    pools.value.flatMap((pool, poolIndex) => {
      const poolLevels = levels.value.filter((item) => item.poolId === pool.id)
      const poolGames = gameBindings.value.filter((item) => item.poolId === pool.id)
      return Array.from({ length: 3 }, (_, index) => {
        const member = memberStore.members[(poolIndex * 3 + index) % memberStore.members.length]
        const level = poolLevels[(index + 1) % poolLevels.length]
        const game = poolGames[index % poolGames.length]
        const status =
          index === 1 && poolIndex % 3 === 0
            ? 'Pending'
            : index === 2 && poolIndex % 4 === 0
              ? 'Failed'
              : 'Paid'
        return {
          id: `JPP${String(poolIndex * 3 + index + 1).padStart(6, '0')}`,
          poolId: pool.id,
          levelId: level.id,
          levelName: level.name,
          memberId: member.id,
          externalMemberId: member.externalId,
          merchantId: member.merchantId,
          merchantName: member.merchantName,
          gameId: game.gameId,
          gameName: game.gameName,
          roundId: `RND-JP-${String(poolIndex * 3 + index + 1).padStart(6, '0')}`,
          amount: 18000 + poolIndex * 3500 + index * 12500,
          currency: pool.baseCurrency,
          status,
          transactionId:
            status === 'Paid'
              ? `TX${String(poolIndex * 6 + index + 2).padStart(5, '0')}`
              : undefined,
          failureReason: status === 'Failed' ? '錢包回應逾時，已轉交人工確認' : undefined,
          payoutAt: `2026-09-0${index + 1} ${String(20 - index).padStart(2, '0')}:30`
        }
      })
    })
  )

  const auditRecords = ref<JackpotAuditRecord[]>(
    pools.value.flatMap((pool, index) => [
      {
        id: `JPA-${pool.id}-002`,
        poolId: pool.id,
        action: '更新獎池設定',
        target: pool.nameZh,
        before: '前一版設定',
        after: `${pool.status}｜${pool.baseCurrency}`,
        reason: '例行營運設定確認',
        operator: 'Jackpot Admin',
        approver: index % 2 === 0 ? 'Risk Manager' : undefined,
        status: pool.status === 'Pending' ? 'Pending' : 'Success',
        time: pool.updatedAt
      },
      {
        id: `JPA-${pool.id}-001`,
        poolId: pool.id,
        action: '建立獎池',
        target: pool.nameZh,
        before: '無',
        after: '草稿',
        reason: '建立獎池主檔',
        operator: pool.createdBy,
        status: 'Success',
        time: pool.createdAt
      }
    ])
  )

  const findPool = (id: string) => pools.value.find((item) => item.id === id)
  const getLevels = (poolId: string) =>
    levels.value.filter((item) => item.poolId === poolId).sort((a, b) => a.sort - b.sort)
  const getGameBindings = (poolId: string) =>
    gameBindings.value.filter((item) => item.poolId === poolId)
  const getMerchantSettings = (poolId: string) =>
    merchantSettings.value.filter((item) => item.poolId === poolId)
  const getLedgerRecords = (poolId: string) =>
    ledgerRecords.value.filter((item) => item.poolId === poolId)
  const getPayouts = (poolId: string) => payouts.value.filter((item) => item.poolId === poolId)
  const getAuditRecords = (poolId: string) =>
    auditRecords.value.filter((item) => item.poolId === poolId)
  const pendingPayoutCount = computed(
    () => payouts.value.filter((item) => ['Pending', 'Processing'].includes(item.status)).length
  )

  const getEligibleMerchantLines = (
    baseCurrency: string,
    gameIds: string[]
  ): JackpotEligibleMerchantLine[] => {
    const eligibleGameMap = new Map(
      gameIds
        .map((gameId) => gameStore.findGame(gameId))
        .filter((game) => game?.featureTagIds.includes('FT003'))
        .map((game) => [game!.id, game!] as const)
    )
    return businessStore.merchants.flatMap((merchant) =>
      merchant.lines.flatMap((line) => {
        if (line.status !== 'Active' || line.currency !== baseCurrency) return []
        const eligibleConfigurations = businessStore
          .getMerchantLineGameConfigurations(line.uid)
          .filter(
            (config) =>
              eligibleGameMap.has(config.gameId) &&
              config.enabled &&
              config.jackpotMode !== 'Excluded'
          )
        return eligibleConfigurations.length
          ? [
              {
                merchant,
                line,
                eligibleGameIds: eligibleConfigurations.map((config) => config.gameId),
                eligibleGameNames: eligibleConfigurations.map(
                  (config) => eligibleGameMap.get(config.gameId)?.displayName || config.gameId
                )
              }
            ]
          : []
      })
    )
  }

  const validateMerchantLine = (poolId: string, lineUid: string) => {
    const pool = findPool(poolId)
    if (!pool) return { valid: false, reason: '找不到獎池資料' }
    const merchant = businessStore.merchants.find((item) =>
      item.lines.some((line) => line.uid === lineUid)
    )
    const line = merchant?.lines.find((item) => item.uid === lineUid)
    if (!merchant || !line) return { valid: false, reason: '找不到商戶線路' }
    if (line.status !== 'Active') return { valid: false, reason: '商戶線路尚未啟用' }
    if (line.currency !== pool.baseCurrency)
      return { valid: false, reason: `線路幣別必須為 ${pool.baseCurrency}` }
    const poolGameIds = getGameBindings(poolId)
      .filter((binding) => binding.status !== 'Disabled')
      .map((binding) => binding.gameId)
    if (!poolGameIds.some((gameId) => gameStore.findGame(gameId)?.featureTagIds.includes('FT003')))
      return { valid: false, reason: '獎池尚未綁定支援 Jackpot 的遊戲' }
    const eligible = getEligibleMerchantLines(pool.baseCurrency, poolGameIds).some(
      (item) => item.line.uid === lineUid
    )
    if (!eligible) return { valid: false, reason: '遊戲尚未開放至此線路或線路已排除 Jackpot' }
    return { valid: true, reason: '' }
  }

  const addAudit = (
    poolId: string,
    action: string,
    before: string,
    after: string,
    reason: string
  ) => {
    auditRecords.value.unshift({
      id: `JPA-${poolId}-${Date.now()}`,
      poolId,
      action,
      target: findPool(poolId)?.nameZh || poolId,
      before,
      after,
      reason,
      operator: 'Jackpot Admin',
      status: 'Success',
      time: formatNow()
    })
  }
  const createPool = (payload: NewJackpotPayload) => {
    const nextId = `JP${String(Math.max(...pools.value.map((item) => Number(item.id.slice(2)))) + 1).padStart(5, '0')}`
    const now = formatNow()
    pools.value.unshift({
      id: nextId,
      code: payload.code.trim().toUpperCase(),
      nameZh: payload.nameZh.trim(),
      nameEn: payload.nameEn.trim(),
      type: payload.type,
      baseCurrency: payload.baseCurrency,
      timezone: payload.timezone,
      description: payload.description,
      note: payload.note,
      currentBalance: payload.levels.reduce((sum, item) => sum + item.initialDisplayAmount, 0),
      status: 'Draft',
      createdBy: 'Jackpot Admin',
      createdAt: now,
      updatedAt: now
    })
    payload.levels.forEach((level, index) =>
      levels.value.push({
        id: `JPLV-${nextId}-${String(index + 1).padStart(2, '0')}`,
        poolId: nextId,
        code: level.code.toUpperCase(),
        name: level.name,
        sort: index + 1,
        initialDisplayAmount: level.initialDisplayAmount,
        minimumDisplayAmount: level.minimumDisplayAmount,
        currentBalance: level.initialDisplayAmount,
        color: level.color,
        status: 'Active',
        updatedAt: now
      })
    )
    bindGames(nextId, payload.gameIds)
    payload.merchantLineUids.forEach((lineUid) => addMerchantLine(nextId, lineUid))
    addAudit(nextId, '建立獎池', '無', '草稿', '建立獎池主檔與初始設定')
    return nextId
  }
  const updateStatus = (poolId: string, status: JackpotStatus, reason: string) => {
    const pool = findPool(poolId)
    if (!pool) return
    const before = pool.status
    pool.status = status
    pool.updatedAt = formatNow()
    if (status === 'Active') {
      gameBindings.value
        .filter((item) => item.poolId === poolId && item.status === 'Scheduled')
        .forEach((item) => {
          item.status = 'Active'
          item.updatedAt = pool.updatedAt
        })
    }
    addAudit(poolId, '變更獎池狀態', before, status, reason)
  }
  const addLevel = (
    poolId: string,
    input: Omit<
      JackpotLevelRecord,
      'id' | 'poolId' | 'sort' | 'currentBalance' | 'status' | 'updatedAt'
    >
  ) => {
    const poolLevels = getLevels(poolId)
    levels.value.push({
      ...input,
      id: `JPLV-${poolId}-${Date.now()}`,
      poolId,
      sort: poolLevels.length + 1,
      currentBalance: input.initialDisplayAmount,
      status: 'Active',
      updatedAt: formatNow()
    })
    addAudit(poolId, '新增獎池級別', '無', input.name, '補充獎池級別')
  }
  const toggleLevel = (levelId: string, reason: string) => {
    const level = levels.value.find((item) => item.id === levelId)
    if (!level) return
    const before = level.status
    level.status = level.status === 'Active' ? 'Disabled' : 'Active'
    level.updatedAt = formatNow()
    addAudit(level.poolId, '變更級別狀態', before, level.status, reason)
  }
  function bindGames(poolId: string, gameIds: string[]) {
    const now = formatNow()
    gameIds.forEach((gameId) => {
      if (gameBindings.value.some((item) => item.poolId === poolId && item.gameId === gameId))
        return
      const game = gameStore.findGame(gameId)
      if (!game || !game.featureTagIds.includes('FT003')) return
      gameBindings.value.push({
        id: `JPGB-${poolId}-${gameId}`,
        poolId,
        gameId,
        gameName: game.displayName,
        gameType: game.typeId,
        rtpPlan:
          game.rtpStatus === 'Configured' ? `${game.defaultRtp || 96}% 預設方案` : '尚未設定',
        limitPlan: game.limitStatus === 'Configured' ? '預設限紅方案' : '尚未設定',
        status: 'Active',
        effectiveAt: now,
        updatedAt: now
      })
    })
    if (gameIds.length)
      addAudit(poolId, '綁定遊戲', '未綁定', `${gameIds.length} 款遊戲`, '新增獎池適用遊戲')
  }
  const unbindGame = (bindingId: string, reason: string) => {
    const binding = gameBindings.value.find((item) => item.id === bindingId)
    if (!binding) return
    binding.status = 'Disabled'
    binding.updatedAt = formatNow()
    addAudit(binding.poolId, '解除遊戲綁定', binding.gameName, '已停用', reason)
  }
  function addMerchantLine(poolId: string, lineUid: string) {
    const validation = validateMerchantLine(poolId, lineUid)
    if (!validation.valid) return { success: false, reason: validation.reason }
    const merchant = businessStore.merchants.find((item) =>
      item.lines.some((line) => line.uid === lineUid)
    )
    const line = merchant?.lines.find((item) => item.uid === lineUid)
    if (
      !merchant ||
      !line ||
      merchantSettings.value.some((item) => item.poolId === poolId && item.lineUid === lineUid)
    )
      return { success: false, reason: '此商戶線路已存在於獎池設定' }
    const pool = findPool(poolId)
    const now = formatNow()
    merchantSettings.value.push({
      id: `JPMS-${poolId}-${line.uid}`,
      poolId,
      merchantId: merchant.id,
      merchantName: merchant.name,
      agentId: merchant.agentId,
      agentName: merchant.agentName,
      lineUid: line.uid,
      currency: line.currency,
      walletMode: line.walletMode,
      displayName: pool?.nameZh || '',
      status: 'Active',
      effectiveAt: now,
      updatedAt: now
    })
    addAudit(
      poolId,
      '新增商戶線路',
      '未綁定',
      `${line.uid}｜${line.currency}`,
      '新增符合獎池幣別與遊戲開放條件的線路'
    )
    return { success: true, reason: '' }
  }
  const updateMerchantStatus = (settingId: string, enabled: boolean) => {
    const setting = merchantSettings.value.find((item) => item.id === settingId)
    if (!setting) return
    const before = setting.status
    setting.status = enabled ? 'Active' : 'Disabled'
    setting.updatedAt = formatNow()
    addAudit(setting.poolId, '變更商戶獎池狀態', before, setting.status, '調整商戶適用範圍')
  }

  return {
    pools,
    levels,
    gameBindings,
    merchantSettings,
    ledgerRecords,
    payouts,
    auditRecords,
    pendingPayoutCount,
    findPool,
    getLevels,
    getGameBindings,
    getMerchantSettings,
    getLedgerRecords,
    getPayouts,
    getAuditRecords,
    getEligibleMerchantLines,
    validateMerchantLine,
    createPool,
    updateStatus,
    addLevel,
    toggleLevel,
    bindGames,
    unbindGame,
    addMerchantLine,
    updateMerchantStatus
  }
})
