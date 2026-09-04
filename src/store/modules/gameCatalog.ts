import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { gameRecords } from '@/mock/game-provider'
import type { AuditEntry, GameLimitPlan, GameRecord, GameRtpPlan } from '@/types/game-provider'

type NewGameRecord = Omit<GameRecord, 'id' | 'updatedAt'>

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

export const useGameCatalogStore = defineStore('gameCatalogStore', () => {
  const games = ref<GameRecord[]>(
    structuredClone(gameRecords).map((game) => ({
      ...game,
      supportsBoardDisplay: game.supportsBoardDisplay ?? game.typeId === 'GT001',
      supportsResultReplay: game.supportsResultReplay ?? game.typeId === 'GT001',
      supportsEventReplay: game.supportsEventReplay ?? true
    }))
  )
  const auditLogs = ref<Record<string, AuditEntry[]>>(
    Object.fromEntries(
      gameRecords.map((game) => [
        game.id,
        [
          {
            id: `AUD-${game.id}-001`,
            action: '更新遊戲資料',
            operator: 'Game Ops',
            reason: '例行資料維護',
            time: game.updatedAt,
            result: 'Success' as const,
            before: '前一版遊戲主檔',
            after: `${game.displayName}｜${game.status}`
          },
          {
            id: `AUD-${game.id}-000`,
            action: '建立遊戲主檔',
            operator: 'Super Admin',
            reason: '建立遊戲目錄資料',
            time: '2026-08-20 10:00',
            result: 'Success' as const,
            before: '無',
            after: game.code
          }
        ]
      ])
    )
  )
  const rtpPlans = ref<GameRtpPlan[]>(
    gameRecords.flatMap((game) =>
      game.rtpStatus === 'Configured' && game.defaultRtp
        ? Array.from({ length: Math.max(1, game.rtpPlanCount) }, (_, index) => ({
            id: `RTP-${game.id}-${index + 1}`,
            gameId: game.id,
            code: `${game.code}_RTP_${String(index + 1).padStart(2, '0')}`,
            name: `RTP ${(game.defaultRtp! - index * 0.5).toFixed(1)}%`,
            rtpValue: Number((game.defaultRtp! - index * 0.5).toFixed(2)),
            configKey: `${game.code.toLowerCase()}.rtp.${index + 1}`,
            isDefault: index === 0,
            status: 'Active' as const,
            version: 1,
            note: index === 0 ? '目前預設方案' : '商戶差異化方案',
            updatedAt: game.updatedAt
          }))
        : []
    )
  )
  const limitPlans = ref<GameLimitPlan[]>(
    gameRecords.flatMap((game) =>
      game.limitStatus === 'Configured'
        ? Array.from({ length: Math.max(1, game.limitPlanCount) }, (_, index) => ({
            id: `LIMIT-${game.id}-${index + 1}`,
            gameId: game.id,
            code: `${game.code}_${index === 0 ? 'TWD' : index === 1 ? 'USD' : `PLAN_${index + 1}`}`,
            name: `${index === 0 ? 'TWD' : index === 1 ? 'USD' : '通用'}標準限紅`,
            currency: index === 0 ? 'TWD' : index === 1 ? 'USD' : 'USDT',
            model:
              game.typeId === 'GT001'
                ? ('Slot Bet Levels' as const)
                : game.typeId === 'GT003'
                  ? ('Fishing Hall BetX' as const)
                  : game.typeId === 'GT004'
                    ? ('Arcade Level Currency' as const)
                    : ('Generic Bet Range' as const),
            dimension:
              game.typeId === 'GT003'
                ? '經典廳 × Bet X 1–10'
                : game.typeId === 'GT004'
                  ? 'Level 1–5'
                  : '標準投注檔位',
            minBet: index === 0 ? 10 : 1,
            maxBet: index === 0 ? 10000 : 1000,
            defaultBet: index === 0 ? 50 : 5,
            betLevels: index === 0 ? [10, 20, 50, 100, 500, 1000] : [1, 5, 10, 50, 100],
            buyFeatureMax: game.featureTagIds.includes('FT001') ? 50000 : undefined,
            superBuyMax: game.featureTagIds.includes('FT002') ? 100000 : undefined,
            status: 'Active' as const,
            note: '既有啟用方案',
            updatedAt: game.updatedAt
          }))
        : []
    )
  )

  const gameCount = computed(() => games.value.length)
  const findGame = (id: string) => games.value.find((game) => game.id === id)

  const isCodeAvailable = (code: string, excludeId?: string) => {
    const normalizedCode = code.trim().toUpperCase()
    return !games.value.some(
      (game) => game.id !== excludeId && game.code.toUpperCase() === normalizedCode
    )
  }

  const nextGameId = () => {
    const maxId = games.value.reduce((max, game) => {
      const numericId = Number(game.id.replace(/\D/g, ''))
      return Number.isNaN(numericId) ? max : Math.max(max, numericId)
    }, 0)
    return `G${String(maxId + 1).padStart(5, '0')}`
  }

  const addAudit = (gameId: string, entry: Omit<AuditEntry, 'id' | 'time'>) => {
    const records = auditLogs.value[gameId] || []
    records.unshift({
      ...entry,
      id: `AUD-${gameId}-${String(records.length + 1).padStart(3, '0')}`,
      time: formatNow()
    })
    auditLogs.value[gameId] = records
  }

  const createGame = (input: NewGameRecord) => {
    const game: GameRecord = {
      ...structuredClone(input),
      id: nextGameId(),
      code: input.code.trim().toUpperCase(),
      status: 'Draft',
      rtpStatus: 'Not Configured',
      limitStatus: 'Not Configured',
      rtpPlanCount: 0,
      limitPlanCount: 0,
      merchantCount: 0,
      updatedAt: formatNow()
    }
    games.value.unshift(game)
    addAudit(game.id, {
      action: '新增遊戲',
      operator: 'Super Admin',
      reason: '建立遊戲主檔',
      result: 'Success',
      before: '無',
      after: JSON.stringify({
        code: game.code,
        displayName: game.displayName,
        typeId: game.typeId,
        status: game.status
      })
    })
    return game
  }

  const updateGame = (id: string, updates: Partial<GameRecord>, reason = '更新遊戲主檔') => {
    const game = findGame(id)
    if (!game) return undefined
    const before = JSON.stringify(game)
    Object.assign(game, structuredClone(updates), { updatedAt: formatNow() })
    addAudit(id, {
      action: '編輯遊戲',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(game)
    })
    return game
  }

  const getAuditLogs = (gameId: string) => auditLogs.value[gameId] || []

  const getRtpPlans = (gameId: string) => rtpPlans.value.filter((plan) => plan.gameId === gameId)
  const getLimitPlans = (gameId: string) =>
    limitPlans.value.filter((plan) => plan.gameId === gameId)

  const syncPlanStatus = (gameId: string) => {
    const game = findGame(gameId)
    if (!game) return
    const gameRtpPlans = getRtpPlans(gameId)
    const gameLimitPlans = getLimitPlans(gameId)
    game.rtpPlanCount = gameRtpPlans.length
    game.limitPlanCount = gameLimitPlans.length
    game.rtpStatus = gameRtpPlans.some((plan) => plan.status === 'Active')
      ? 'Configured'
      : 'Not Configured'
    game.limitStatus = gameLimitPlans.some((plan) => plan.status === 'Active')
      ? 'Configured'
      : 'Not Configured'
    game.defaultRtp = gameRtpPlans.find(
      (plan) => plan.isDefault && plan.status === 'Active'
    )?.rtpValue
    game.updatedAt = formatNow()
  }

  const createRtpPlan = (input: Omit<GameRtpPlan, 'id' | 'updatedAt' | 'version'>) => {
    const plan: GameRtpPlan = {
      ...structuredClone(input),
      id: `RTP-${input.gameId}-${Date.now()}`,
      version: 1,
      updatedAt: formatNow()
    }
    if (plan.isDefault) {
      rtpPlans.value.forEach((item) => {
        if (item.gameId === plan.gameId) item.isDefault = false
      })
    }
    rtpPlans.value.unshift(plan)
    syncPlanStatus(plan.gameId)
    addAudit(plan.gameId, {
      action: '新增 RTP 方案',
      operator: 'Super Admin',
      reason: `建立固定 RTP ${plan.rtpValue}%`,
      result: 'Success',
      before: '無',
      after: `${plan.code}｜${plan.status}`
    })
    return plan
  }

  const updateRtpPlan = (id: string, updates: Partial<GameRtpPlan>, reason: string) => {
    const plan = rtpPlans.value.find((item) => item.id === id)
    if (!plan) return
    const before = JSON.stringify(plan)
    if (updates.isDefault) {
      rtpPlans.value.forEach((item) => {
        if (item.gameId === plan.gameId) item.isDefault = false
      })
    }
    Object.assign(plan, structuredClone(updates), { updatedAt: formatNow() })
    syncPlanStatus(plan.gameId)
    addAudit(plan.gameId, {
      action: '更新 RTP 方案',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(plan)
    })
  }

  const cloneRtpPlan = (id: string) => {
    const source = rtpPlans.value.find((item) => item.id === id)
    if (!source) return
    return createRtpPlan({
      ...JSON.parse(JSON.stringify(source)),
      code: `${source.code}_V${source.version + 1}`,
      name: `${source.name} V${source.version + 1}`,
      status: 'Draft',
      isDefault: false
    })
  }

  const createLimitPlan = (input: Omit<GameLimitPlan, 'id' | 'updatedAt'>) => {
    const plan: GameLimitPlan = {
      ...structuredClone(input),
      id: `LIMIT-${input.gameId}-${Date.now()}-${limitPlans.value.length}`,
      updatedAt: formatNow()
    }
    limitPlans.value.unshift(plan)
    syncPlanStatus(plan.gameId)
    addAudit(plan.gameId, {
      action: '新增限紅方案',
      operator: 'Super Admin',
      reason: `建立 ${plan.currency} 限紅草稿`,
      result: 'Success',
      before: '無',
      after: `${plan.code}｜${plan.status}`
    })
    return plan
  }

  const updateLimitPlan = (id: string, updates: Partial<GameLimitPlan>, reason: string) => {
    const plan = limitPlans.value.find((item) => item.id === id)
    if (!plan) return
    const before = JSON.stringify(plan)
    Object.assign(plan, structuredClone(updates), { updatedAt: formatNow() })
    syncPlanStatus(plan.gameId)
    addAudit(plan.gameId, {
      action: '更新限紅方案',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(plan)
    })
  }

  return {
    games,
    gameCount,
    auditLogs,
    rtpPlans,
    limitPlans,
    findGame,
    isCodeAvailable,
    createGame,
    updateGame,
    getAuditLogs,
    getRtpPlans,
    getLimitPlans,
    createRtpPlan,
    updateRtpPlan,
    cloneRtpPlan,
    createLimitPlan,
    updateLimitPlan
  }
})
