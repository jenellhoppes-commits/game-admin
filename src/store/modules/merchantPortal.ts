import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useBusinessPartnerStore } from './businessPartner'
import { useGameCatalogStore } from './gameCatalog'
import { useMemberCenterStore } from './memberCenter'
import { useTransactionCenterStore } from './transactionCenter'
import { useFinanceSettingsStore } from './financeSettings'
import { useFinanceCenterStore } from './financeCenter'
import { useJackpotCenterStore } from './jackpotCenter'

export const CURRENT_MERCHANT_ID = 'M00001'
// Demonstration session scope, not a decision about employee permission configuration.
const DEMO_LINES = ['ASG_MER0001_TWD', 'ASG_MER0001_USD']
export type MerchantRequestCategory = '遊戲' | '線路' | '串接' | '會員' | '交易' | '獎池' | '差異'
export interface MerchantPortalRequest {
  id: string
  category: MerchantRequestCategory
  target: string
  action: string
  proposed: string
  reason: string
  status: string
  execution: string
  createdAt: string
}

export const useMerchantPortalStore = defineStore('merchantPortalStore', () => {
  const business = useBusinessPartnerStore()
  const catalog = useGameCatalogStore()
  const membersSource = useMemberCenterStore()
  const transactionsSource = useTransactionCenterStore()
  const financeSettings = useFinanceSettingsStore()
  const finance = useFinanceCenterStore()
  const jackpot = useJackpotCenterStore()
  const source = computed(() => business.findMerchant(CURRENT_MERCHANT_ID))
  const authorizedLineUids = ref([...DEMO_LINES])
  const merchant = computed(() =>
    source.value
      ? {
          id: source.value.id,
          code: source.value.code,
          name: source.value.name,
          walletMode: source.value.walletMode,
          agentName: source.value.agentName,
          status: source.value.status,
          settlementCurrency: source.value.settlementCurrency
        }
      : undefined
  )
  const sourceLines = computed(() =>
    (source.value?.lines || []).filter((line) => authorizedLineUids.value.includes(line.uid))
  )
  const lineIds = computed(() => new Set(sourceLines.value.map((line) => line.uid)))
  const lines = computed(() =>
    sourceLines.value.map((line) => ({
      id: line.uid,
      uid: line.uid,
      currency: line.currency,
      walletMode: line.walletMode,
      environment: line.environment,
      status: line.status,
      credentialStatus: line.credentialStatus,
      enabledGames: business
        .getMerchantLineGameConfigurations(line.uid)
        .filter((config) => config.enabled).length,
      updatedAt: line.updatedAt
    }))
  )
  const configurations = computed(() =>
    sourceLines.value.flatMap((line) =>
      business.getMerchantLineGameConfigurations(line.uid).map((config) => ({
        id: `${line.uid}/${config.gameId}`,
        lineUid: line.uid,
        currency: line.currency,
        gameId: config.gameId,
        enabled: config.enabled,
        rtpPlanName: config.rtpPlanName,
        limitPlan: config.limitPlan,
        updatedAt: config.updatedAt
      }))
    )
  )
  const games = computed(() => {
    const granted = business.getMerchantGameConfigurations(CURRENT_MERCHANT_ID)
    return granted.flatMap((config) => {
      const game = catalog.findGame(config.gameId)
      if (!game || !lineIds.value.size) return []
      const gameLines = configurations.value.filter((item) => item.gameId === game.id)
      return [
        {
          id: game.id,
          code: game.code,
          name: game.displayName,
          type: game.typeId,
          status: game.status,
          enabled: config.enabled,
          rtpPlanName: config.rtpPlanName,
          devices: game.supportedDevices?.join('、') || '未提供',
          locale: game.defaultLocale,
          enabledLines: gameLines.filter((item) => item.enabled).length,
          updatedAt: config.updatedAt
        }
      ]
    })
  })
  const integrations = computed(() =>
    sourceLines.value.flatMap((line) =>
      line.environments.map((env) => ({
        id: env.id,
        lineUid: line.uid,
        environment: env.environment,
        status: env.status,
        credentialId: env.credential?.id || '未核發',
        credentialStatus: env.credential?.status || 'Not Issued',
        fingerprint: env.credential?.fingerprint || '未提供',
        apiVersion: env.credential?.apiVersion || '未提供',
        signatureVersion: env.credential?.signatureVersion || '未提供',
        issuedAt: env.credential?.issuedAt || '未提供',
        expiresAt: env.credential?.expiresAt || '未提供',
        updatedAt: env.updatedAt
      }))
    )
  )
  const integrationTests = computed(() =>
    sourceLines.value.flatMap((line) =>
      business.getMerchantLineTests(line.uid).map((test) => ({
        id: `${line.uid}/${test.id}`,
        lineUid: line.uid,
        name: test.name,
        status: test.status,
        testedAt: test.testedAt || '未測試'
      }))
    )
  )
  const members = computed(() =>
    membersSource.members
      .filter((item) => item.merchantId === CURRENT_MERCHANT_ID && lineIds.value.has(item.lineUid))
      .map((item) => ({
        id: item.id,
        externalId: item.externalId,
        lineUid: item.lineUid,
        currency: item.currency,
        status: item.merchantStatus,
        restriction: item.restrictionStatus,
        walletMode: item.walletMode,
        balance: item.wallet.balance,
        balanceSource: item.wallet.source,
        balanceAt: item.wallet.updatedAt,
        firstPlayedAt: item.firstPlayedAt,
        lastPlayedAt: item.lastPlayedAt,
        test: item.tags.includes('Test')
      }))
  )
  const memberIds = computed(() => new Set(members.value.map((item) => item.id)))
  const bets = computed(() =>
    transactionsSource.bets
      .filter(
        (item) =>
          item.merchantId === CURRENT_MERCHANT_ID &&
          lineIds.value.has(item.lineUid) &&
          memberIds.value.has(item.memberId)
      )
      .map((item) => ({
        id: item.id,
        roundId: item.roundId,
        memberId: item.memberId,
        externalMemberId: item.externalMemberId,
        lineUid: item.lineUid,
        gameId: item.gameId,
        gameName: item.gameName,
        currency: item.currency,
        betAmount: item.betAmount,
        payoutAmount: item.payoutAmount,
        status: item.status,
        time: item.time,
        settledAt: item.settledAt,
        test: members.value.find((member) => member.id === item.memberId)?.test ?? false
      }))
  )
  const transactions = computed(() =>
    transactionsSource.transactions
      .filter(
        (item) =>
          item.merchantId === CURRENT_MERCHANT_ID &&
          lineIds.value.has(item.lineUid) &&
          memberIds.value.has(item.memberId)
      )
      .map((item) => ({
        id: item.id,
        betId: item.betId,
        roundId: item.roundId,
        memberId: item.memberId,
        lineUid: item.lineUid,
        gameName: item.gameName,
        type: item.type,
        currency: item.currency,
        amount: item.amount,
        status: item.status,
        time: item.time
      }))
  )
  const getBetResult = (id: string) => {
    if (!bets.value.some((item) => item.id === id)) return undefined
    const result = transactionsSource.findBet(id)?.result
    if (!result) return undefined
    return {
      outcome: result.outcome,
      summary: result.summary,
      resultType: result.resultType,
      version: {
        gameVersion: result.version.gameVersion,
        resultFormatVersion: result.version.resultFormatVersion,
        rtpPlan: result.version.rtpPlan,
        limitPlan: result.version.limitPlan,
        replayAssetVersion: result.version.replayAssetVersion
      },
      replay: {
        status: result.replay.status,
        supportsBoardDisplay: result.replay.supportsBoardDisplay,
        supportsEventReplay: result.replay.supportsEventReplay,
        stages: result.replay.stages.map((stage) => ({
          id: stage.id,
          sequence: stage.sequence,
          label: stage.label,
          rows: stage.rows,
          columns: stage.columns,
          payoutAmount: stage.payoutAmount,
          cells: stage.cells.map((cell) => ({
            position: cell.position,
            row: cell.row,
            column: cell.column,
            symbolName: cell.symbolName,
            icon: cell.icon,
            winning: cell.winning
          }))
        })),
        events: result.replay.events.map((event) => ({
          id: event.id,
          sequence: event.sequence,
          offsetSeconds: event.offsetSeconds,
          type: event.type,
          title: event.title,
          stageId: event.stageId,
          amount: event.amount,
          currency: event.currency
        }))
      }
    }
  }
  const pools = computed(() =>
    jackpot.merchantSettings
      .filter((item) => item.merchantId === CURRENT_MERCHANT_ID && lineIds.value.has(item.lineUid))
      .flatMap((item) => {
        const pool = jackpot.findPool(item.poolId)
        if (!pool || pool.baseCurrency !== item.currency) return []
        return [
          {
            id: item.id,
            poolId: pool.id,
            name: pool.nameZh,
            lineUid: item.lineUid,
            currency: item.currency,
            status: item.status,
            effectiveAt: item.effectiveAt,
            sharedBalance: '未提供（公開範圍待確認）'
          }
        ]
      })
  )
  const payouts = computed(() =>
    jackpot.payouts
      .filter(
        (item) =>
          item.merchantId === CURRENT_MERCHANT_ID &&
          memberIds.value.has(item.memberId) &&
          pools.value.some(
            (pool) =>
              pool.poolId === item.poolId &&
              pool.lineUid === members.value.find((member) => member.id === item.memberId)?.lineUid
          )
      )
      .map((item) => ({
        id: item.id,
        poolId: item.poolId,
        level: item.levelName,
        memberId: item.memberId,
        gameName: item.gameName,
        roundId: item.roundId,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        time: item.payoutAt
      }))
  )
  const contributions = computed(() =>
    jackpot.ledgerRecords
      .filter(
        (item) =>
          item.merchantId === CURRENT_MERCHANT_ID &&
          item.memberId &&
          memberIds.value.has(item.memberId) &&
          pools.value.some(
            (pool) =>
              pool.poolId === item.poolId &&
              pool.lineUid === members.value.find((member) => member.id === item.memberId)?.lineUid
          )
      )
      .map((item) => ({
        id: item.id,
        poolId: item.poolId,
        type: item.type,
        amount: item.amount,
        currency: item.currency,
        time: item.occurredAt,
        status: item.status
      }))
  )
  const reconciliations = computed(() =>
    finance.merchantReconciliations
      .filter((item) => item.merchantId === CURRENT_MERCHANT_ID && lineIds.value.has(item.lineUid))
      .map((item) => ({
        id: item.id,
        lineUid: item.lineUid,
        period: item.period,
        currency: item.currency,
        betAmount: item.betAmount,
        payoutAmount: item.payoutAmount,
        ggr: item.ggr,
        settlementCurrency: item.snapshot.settlementCurrency,
        status: item.status,
        lockedAt: item.lockedAt,
        version: `${item.snapshot.formulaVersion}/${item.snapshot.calculatedAt}`,
        rateSnapshotIds: [...item.snapshot.exchangeRateSnapshotIds],
        exchangeRate: item.snapshot.exchangeRate,
        unresolved: item.unresolvedDifferenceCount,
        calculatedAt: item.snapshot.calculatedAt,
        confirmationBlock: '結算公式、確認層級與對外金額口徑待確認；目前不能確認正式結算金額'
      }))
  )
  const differences = computed(() =>
    finance.differences
      .filter(
        (item) =>
          item.reconciliationType === 'Merchant' &&
          item.merchantId === CURRENT_MERCHANT_ID &&
          reconciliations.value.some((record) => record.id === item.reconciliationId)
      )
      .map((item) => ({
        id: item.id,
        reconciliationId: item.reconciliationId,
        type: item.type,
        currency: item.currency,
        differenceAmount: item.differenceAmount,
        status: item.status,
        time: item.detectedAt,
        resolution: '對外處理摘要尚未提供'
      }))
  )
  const statements = computed(() =>
    finance.merchantStatements
      .filter((item) => item.merchantId === CURRENT_MERCHANT_ID && lineIds.value.has(item.lineUid))
      .map((item) => ({
        id: item.id,
        reconciliationId: item.reconciliationId,
        lineUid: item.lineUid,
        period: item.period,
        currency: item.settlementCurrency,
        status: item.status,
        createdAt: item.createdAt,
        amount: '未定案（正式金額口徑待確認）'
      }))
  )
  const currencies = computed(() => [
    ...new Set([
      ...lines.value.map((line) => line.currency),
      ...(merchant.value?.settlementCurrency ? [merchant.value.settlementCurrency] : [])
    ])
  ])
  const rates = computed(() =>
    financeSettings.dailyRates
      .filter(
        (rate) =>
          rate.status === 'Locked' &&
          rate.fromCurrency === 'USDT' &&
          currencies.value.includes(rate.toCurrency)
      )
      .map((rate) => ({
        id: rate.id,
        date: rate.date,
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        finalRate: rate.finalRate,
        lockedAt: rate.lockedAt,
        settingVersion: rate.settingVersion,
        status: rate.status
      }))
  )
  const requests = ref<MerchantPortalRequest[]>([])
  const logs = ref<{ id: string; time: string; action: string; target: string; result: string }[]>(
    []
  )
  const addLog = (action: string, target: string, result = '完成') =>
    logs.value.unshift({
      id: crypto.randomUUID(),
      time: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }),
      action,
      target,
      result
    })
  const submitRequest = (
    input: Pick<MerchantPortalRequest, 'category' | 'target' | 'action' | 'proposed' | 'reason'>
  ) => {
    if (!merchant.value || !lineIds.value.size)
      return { ok: false, message: '沒有可用商戶或線路範圍' }
    const actions: Record<MerchantRequestCategory, string[]> = {
      遊戲: [],
      線路: ['新增線路', '申請變更線路設定'],
      串接: [],
      會員: ['會員限制申覆'],
      交易: ['回報交易異常'],
      獎池: ['獎池參與變更申請'],
      差異: ['回報對帳差異', '更正申請']
    }
    if (!actions[input.category]?.includes(input.action))
      return { ok: false, message: '此申請類型尚未開放' }
    const targets: Record<MerchantRequestCategory, Set<string>> = {
      遊戲: new Set(games.value.map((item) => item.id)),
      線路: new Set([...lineIds.value, 'NEW']),
      串接: new Set(integrations.value.map((item) => item.id)),
      會員: memberIds.value,
      交易: new Set([...bets.value, ...transactions.value].map((item) => item.id)),
      獎池: new Set(pools.value.map((item) => item.id)),
      差異: new Set(reconciliations.value.map((item) => item.id))
    }
    if (!targets[input.category].has(input.target))
      return { ok: false, message: '對象不存在或不在授權範圍' }
    if (!input.reason.trim() || !input.proposed.trim())
      return { ok: false, message: '請填寫目標設定及申請原因' }
    if (
      requests.value.some(
        (item) =>
          item.category === input.category &&
          item.target === input.target &&
          item.action === input.action &&
          item.status === '已送出'
      )
    )
      return { ok: false, message: '此對象已有同類待處理申請，請查看申請紀錄' }
    const request = {
      ...input,
      id: `MREQ-${crypto.randomUUID()}`,
      status: '已送出',
      execution: '未執行',
      createdAt: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' })
    }
    requests.value.unshift(request)
    addLog(input.action, input.target, '原型申請已建立，未執行')
    return { ok: true, message: '原型申請已建立；核准及執行前有效配置不變', id: request.id }
  }
  const closePlatformGame = (gameId: string) => {
    const game = games.value.find((item) => item.id === gameId)
    if (!game || !game.enabled || !source.value?.lines.every((line) => lineIds.value.has(line.uid)))
      return { ok: false, message: '遊戲已關閉或沒有完整商戶範圍' }
    business.updateMerchantGameConfiguration(
      CURRENT_MERCHANT_ID,
      gameId,
      { enabled: false },
      '商戶關閉本平台遊戲'
    )
    addLog('關閉本平台遊戲', gameId, '僅本商戶遊戲配置已關閉')
    return { ok: true, message: '已關閉本商戶平台遊戲；全域遊戲及其他商戶不受影響' }
  }
  const readNoticeIds = ref<string[]>([])
  const notices = computed(() =>
    [
      {
        id: 'MERCHANT-DEMO-NOTICE',
        title: '商戶工作台使用說明（示範公告）',
        type: '示範公告',
        time: '2026-09-07 09:00',
        content:
          '此工作台展示本商戶授權線路資料。設定變更僅建立原型申請，核准前不變更有效配置。正式公告發布來源尚待串接。'
      },
      ...requests.value.map((item) => ({
        id: item.id,
        title: `${item.action}：${item.status}`,
        type: '本商戶申請',
        time: item.createdAt,
        content: `申請編號 ${item.id}。${item.execution}；有效設定尚未變更。`
      }))
    ].map((item) => ({ ...item, read: readNoticeIds.value.includes(item.id) }))
  )
  const markNoticeRead = (id: string) => {
    if (notices.value.some((item) => item.id === id) && !readNoticeIds.value.includes(id)) {
      readNoticeIds.value.push(id)
      addLog('閱讀公告', id)
    }
  }
  const staff = ref([
    {
      id: 'MERCHANT-DEMO-ADMIN',
      name: 'NovaBet 示範管理員',
      account: 'Merchant',
      status: '示範會話',
      role: '細粒度權限待確認'
    }
  ])
  const inviteDraft = (name: string, account: string) => {
    if (!name.trim() || !account.trim()) return { ok: false, message: '請填寫姓名與帳號' }
    if (staff.value.some((item) => item.account === account.trim()))
      return { ok: false, message: '帳號已存在' }
    staff.value.push({
      id: crypto.randomUUID(),
      name: name.trim(),
      account: account.trim(),
      status: '邀請草稿（未寄信）',
      role: '待確認，尚未授權'
    })
    addLog('建立邀請草稿', account, '未寄信／未授權')
    return { ok: true, message: '邀請草稿已保存，尚未寄信或授權' }
  }
  return {
    merchant,
    authorizedLineUids,
    lineIds,
    lines,
    configurations,
    games,
    integrations,
    integrationTests,
    members,
    bets,
    transactions,
    currencies,
    rates,
    requests,
    logs,
    addLog,
    submitRequest,
    getBetResult,
    pools,
    payouts,
    contributions,
    reconciliations,
    differences,
    statements,
    notices,
    markNoticeRead,
    staff,
    inviteDraft,
    closePlatformGame
  }
})
