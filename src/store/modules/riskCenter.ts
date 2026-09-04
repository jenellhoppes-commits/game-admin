import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useBusinessPartnerStore } from './businessPartner'
import { useGameCatalogStore } from './gameCatalog'
import { useJackpotCenterStore } from './jackpotCenter'
import { useMemberCenterStore } from './memberCenter'
import { useTransactionCenterStore } from './transactionCenter'
import type {
  RiskActionLog,
  RiskAlertCategory,
  RiskAlertRecord,
  RiskAlertStatus,
  RiskCaseActionLog,
  RiskCaseRecord,
  RiskCaseStatus,
  RiskRuleSummary,
  RiskSeverity
} from '@/types/game-provider'

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

const categories: RiskAlertCategory[] = [
  'Member',
  'Bet',
  'Transaction',
  'Merchant Line',
  'Game',
  'Jackpot'
]

const categorySettings: Record<
  RiskAlertCategory,
  { name: string; metric: string; threshold: string; source: string }
> = {
  Member: {
    name: '會員高頻行為',
    metric: '10 分鐘投注次數',
    threshold: '>= 60 次',
    source: 'Member Behavior Monitor'
  },
  Bet: {
    name: '注單派彩異常',
    metric: '單局派彩倍率',
    threshold: '>= 500x',
    source: 'Bet Result Monitor'
  },
  Transaction: {
    name: '錢包交易異常',
    metric: '交易處理時間',
    threshold: '>= 10 秒',
    source: 'Wallet Transaction Monitor'
  },
  'Merchant Line': {
    name: '商戶線路錯誤率',
    metric: '5 分鐘回呼錯誤率',
    threshold: '>= 5%',
    source: 'Merchant Line Monitor'
  },
  Game: {
    name: '遊戲結果格式異常',
    metric: '結果格式失敗次數',
    threshold: '>= 3 次',
    source: 'Game Runtime Monitor'
  },
  Jackpot: {
    name: '獎池派發異常',
    metric: '單筆獎池派發金額',
    threshold: '>= 300,000',
    source: 'Jackpot Monitor'
  }
}

export const useRiskCenterStore = defineStore('riskCenterStore', () => {
  const memberStore = useMemberCenterStore()
  const transactionStore = useTransactionCenterStore()
  const businessStore = useBusinessPartnerStore()
  const gameStore = useGameCatalogStore()
  const jackpotStore = useJackpotCenterStore()

  const rules = ref<RiskRuleSummary[]>(
    Array.from({ length: 12 }, (_, index) => {
      const category = categories[index % categories.length]
      const setting = categorySettings[category]
      return {
        id: `RR${String(index + 1).padStart(5, '0')}`,
        code: `RISK_${category.replaceAll(' ', '_').toUpperCase()}_${String(index + 1).padStart(2, '0')}`,
        name: index < categories.length ? setting.name : `${setting.name}－進階條件`,
        category,
        severity: (['Medium', 'High', 'Critical', 'High'][index % 4] || 'Medium') as RiskSeverity,
        scope: index % 3 === 0 ? '全平台' : index % 3 === 1 ? '正式環境線路' : '指定遊戲與商戶',
        metric: setting.metric,
        operator: '>=',
        threshold: setting.threshold.replace('>= ', ''),
        window: index % 2 === 0 ? '10 分鐘' : '30 分鐘',
        cooldown: index % 3 === 0 ? '30 分鐘' : '10 分鐘',
        status: index === 10 ? 'Draft' : index === 11 ? 'Pending' : 'Active',
        todayTriggers: 2 + ((index * 5) % 17),
        description: `${setting.name}達到指定門檻時建立告警，交由風控人員確認與調查。`,
        scopeTargets:
          index % 3 === 0
            ? ['全部正式環境']
            : index % 3 === 1
              ? ['正式環境線路', '啟用中商戶']
              : ['高風險商戶', '指定遊戲'],
        whitelist: index % 4 === 0 ? ['測試會員', '內部 QA 線路'] : [],
        createdBy: index % 2 === 0 ? 'Risk Admin' : 'Super Admin',
        createdAt: `2026-08-${String(12 + index).padStart(2, '0')} 10:00`,
        updatedAt: `2026-09-0${(index % 3) + 1} ${String(9 + (index % 8)).padStart(2, '0')}:20`
      }
    })
  )

  const merchantLines = businessStore.merchants.flatMap((merchant) =>
    merchant.lines.map((line) => ({ merchant, line }))
  )

  const alerts = ref<RiskAlertRecord[]>(
    Array.from({ length: 30 }, (_, index) => {
      const category = categories[index % categories.length]
      const setting = categorySettings[category]
      const rule = rules.value.find((item) => item.category === category)!
      const member = memberStore.members[index % memberStore.members.length]
      const bet = transactionStore.bets[(index * 3 + 2) % transactionStore.bets.length]
      const transaction =
        transactionStore.transactions[(index * 2 + 1) % transactionStore.transactions.length]
      const merchantLine = merchantLines[(index * 2 + 1) % merchantLines.length]
      const game = gameStore.games[(index * 2 + 1) % gameStore.games.length]
      const pool = jackpotStore.pools[index % jackpotStore.pools.length]
      const replayEvent =
        bet.result.replay.events.find((event) => event.riskAlert) ||
        bet.result.replay.events.find((event) => event.type === 'Board Result') ||
        bet.result.replay.events[0]
      const severity = (
        index % 9 === 0 ? 'Critical' : index % 4 === 0 ? 'High' : index % 3 === 0 ? 'Low' : 'Medium'
      ) as RiskSeverity
      const status = (['New', 'Acknowledged', 'Investigating', 'Resolved', 'New'][index % 5] ||
        'New') as RiskAlertStatus
      const occurredDay = String((index % 3) + 1).padStart(2, '0')
      const dueDay = index % 4 === 0 ? '03' : '04'
      const base = {
        id: `RA${String(index + 1).padStart(6, '0')}`,
        title: setting.name,
        category,
        severity,
        score:
          severity === 'Critical' ? 95 : severity === 'High' ? 82 : severity === 'Medium' ? 64 : 38,
        status,
        ruleId: rule.id,
        ruleName: rule.name,
        source: setting.source,
        measuredValue:
          category === 'Member'
            ? `${72 + index} 次`
            : category === 'Bet'
              ? `${Math.max(12, Math.round(bet.result.multiplier * 600))}x`
              : category === 'Transaction'
                ? `${11 + (index % 9)} 秒`
                : category === 'Merchant Line'
                  ? `${6 + (index % 7)}%`
                  : category === 'Game'
                    ? `${4 + (index % 5)} 次`
                    : `${320000 + index * 18500} ${pool.baseCurrency}`,
        threshold: setting.threshold,
        description: `${setting.name}已超過規則門檻，請確認關聯資料與近期操作。`,
        assignee:
          status === 'New' ? undefined : index % 2 === 0 ? 'Risk Analyst A' : 'Risk Analyst B',
        caseId:
          index % 7 === 0 ? `R${String(Math.floor(index / 7) + 1).padStart(5, '0')}` : undefined,
        occurredAt: `2026-09-${occurredDay} ${String(18 - (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
        dueAt: `2026-09-${dueDay} ${index % 4 === 0 ? '18:00' : '23:59'}`,
        updatedAt: `2026-09-${occurredDay} ${String(18 - (index % 10)).padStart(2, '0')}:${String((index * 7 + 3) % 60).padStart(2, '0')}`
      }

      if (category === 'Member')
        return {
          ...base,
          subjectType: '會員',
          subjectId: member.id,
          subjectLabel: member.externalId,
          memberId: member.id,
          externalMemberId: member.externalId,
          merchantId: member.merchantId,
          merchantName: member.merchantName,
          lineUid: member.lineUid
        }
      if (category === 'Bet')
        return {
          ...base,
          subjectType: '注單',
          subjectId: bet.id,
          subjectLabel: bet.roundId,
          memberId: bet.memberId,
          externalMemberId: bet.externalMemberId,
          betId: bet.id,
          merchantId: bet.merchantId,
          merchantName: bet.merchantName,
          lineUid: bet.lineUid,
          gameId: bet.gameId,
          gameName: bet.gameName,
          replayEventId: replayEvent?.id,
          replayStageId: replayEvent?.stageId
        }
      if (category === 'Transaction')
        return {
          ...base,
          subjectType: '交易',
          subjectId: transaction.id,
          subjectLabel: transaction.externalReference,
          memberId: transaction.memberId,
          externalMemberId: transaction.externalMemberId,
          betId: transaction.betId,
          transactionId: transaction.id,
          merchantId: transaction.merchantId,
          merchantName: transaction.merchantName,
          lineUid: transaction.lineUid,
          gameId: transaction.gameId,
          gameName: transaction.gameName
        }
      if (category === 'Merchant Line')
        return {
          ...base,
          subjectType: '商戶線路',
          subjectId: merchantLine.line.uid,
          subjectLabel: `${merchantLine.merchant.name}｜${merchantLine.line.currency}`,
          merchantId: merchantLine.merchant.id,
          merchantName: merchantLine.merchant.name,
          lineUid: merchantLine.line.uid
        }
      if (category === 'Game')
        return {
          ...base,
          subjectType: '遊戲',
          subjectId: game.id,
          subjectLabel: game.displayName,
          gameId: game.id,
          gameName: game.displayName
        }
      return {
        ...base,
        subjectType: '獎池',
        subjectId: pool.id,
        subjectLabel: pool.nameZh,
        poolId: pool.id,
        poolName: pool.nameZh
      }
    })
  )

  const actionLogs = ref<RiskActionLog[]>(
    alerts.value.slice(0, 18).map((alert, index) => ({
      id: `RALOG-${String(index + 1).padStart(6, '0')}`,
      alertId: alert.id,
      action: alert.status === 'New' ? '系統產生告警' : '確認告警',
      before: alert.status === 'New' ? '無' : '新告警',
      after: alert.status === 'New' ? '新告警' : alert.status,
      reason: alert.status === 'New' ? '符合風控規則門檻' : '已由風控人員確認',
      operator: alert.status === 'New' ? 'Risk Service' : alert.assignee || 'Risk Analyst',
      time: alert.updatedAt
    }))
  )

  const caseSeedIndexes = [0, 1, 7, 8, 14, 15, 21, 28]
  const cases = ref<RiskCaseRecord[]>(
    caseSeedIndexes.map((alertIndex, index) => {
      const alert = alerts.value[alertIndex]
      const id = `R${String(index + 1).padStart(5, '0')}`
      alert.caseId = id
      const status = (['Open', 'Investigating', 'Pending Decision', 'Resolved', 'Investigating'][
        index % 5
      ] || 'Open') as RiskCaseStatus
      return {
        id,
        title: `${alert.title}調查案件`,
        category: alert.category,
        severity: alert.severity,
        status,
        priority:
          alert.severity === 'Critical' ? 'Urgent' : alert.severity === 'High' ? 'High' : 'Normal',
        description: `由告警 ${alert.id} 建立，需核對觸發條件、關聯資料與資金軌跡。`,
        alertIds: [alert.id],
        memberIds: alert.memberId ? [alert.memberId] : [],
        betIds: alert.betId ? [alert.betId] : [],
        transactionIds: alert.transactionId ? [alert.transactionId] : [],
        merchantIds: alert.merchantId ? [alert.merchantId] : [],
        lineUids: alert.lineUid ? [alert.lineUid] : [],
        gameIds: alert.gameId ? [alert.gameId] : [],
        poolIds: alert.poolId ? [alert.poolId] : [],
        assignee: status === 'Open' ? undefined : index % 2 ? 'Risk Analyst B' : 'Risk Analyst A',
        openedBy: 'Super Admin',
        openedAt: alert.occurredAt,
        dueAt: alert.dueAt,
        updatedAt: alert.updatedAt,
        conclusion: status === 'Resolved' ? '確認為單次異常，未發現持續性風險。' : undefined,
        resolution: status === 'Resolved' ? '保留監控並調整告警觀察期。' : undefined
      }
    })
  )

  const caseLogs = ref<RiskCaseActionLog[]>(
    cases.value.flatMap((item, index) => {
      const logs: RiskCaseActionLog[] = [
        {
          id: `RCLOG-${String(index * 2 + 1).padStart(6, '0')}`,
          caseId: item.id,
          action: '建立案件',
          before: '無',
          after: 'Open',
          reason: item.description,
          operator: item.openedBy,
          time: item.openedAt
        }
      ]
      if (item.status !== 'Open') {
        logs.push({
          id: `RCLOG-${String(index * 2 + 2).padStart(6, '0')}`,
          caseId: item.id,
          action: item.status === 'Resolved' ? '完成調查' : '開始調查',
          before: 'Open',
          after: item.status,
          reason: item.conclusion || '已指派風控人員進行關聯資料查核',
          operator: item.assignee || 'Risk Analyst A',
          time: item.updatedAt
        })
      }
      return logs
    })
  )

  const findAlert = (id: string) => alerts.value.find((item) => item.id === id)
  const getAlertLogs = (alertId: string) =>
    actionLogs.value.filter((item) => item.alertId === alertId)
  const findRule = (id: string) => rules.value.find((item) => item.id === id)
  const findCase = (id: string) => cases.value.find((item) => item.id === id)
  const getCaseLogs = (caseId: string) => caseLogs.value.filter((item) => item.caseId === caseId)
  const openAlerts = computed(() =>
    alerts.value.filter(
      (item) => !['Resolved', 'False Positive', 'Dismissed'].includes(item.status)
    )
  )
  const newAlertCount = computed(() => alerts.value.filter((item) => item.status === 'New').length)
  const criticalAlertCount = computed(
    () => openAlerts.value.filter((item) => item.severity === 'Critical').length
  )
  const investigatingCount = computed(
    () => alerts.value.filter((item) => item.status === 'Investigating').length
  )
  const overdueAlerts = computed(() =>
    openAlerts.value.filter((item) => new Date(item.dueAt.replace(' ', 'T')).getTime() < Date.now())
  )

  const addLog = (
    alertId: string,
    action: string,
    before: string,
    after: string,
    reason: string
  ) => {
    actionLogs.value.unshift({
      id: `RALOG-${Date.now()}`,
      alertId,
      action,
      before,
      after,
      reason,
      operator: 'Super Admin',
      time: formatNow()
    })
  }

  const addCaseLog = (
    caseId: string,
    action: string,
    before: string,
    after: string,
    reason: string
  ) => {
    caseLogs.value.unshift({
      id: `RCLOG-${Date.now()}`,
      caseId,
      action,
      before,
      after,
      reason,
      operator: 'Super Admin',
      time: formatNow()
    })
  }

  const saveRule = (
    payload: Omit<
      RiskRuleSummary,
      'id' | 'todayTriggers' | 'createdBy' | 'createdAt' | 'updatedAt'
    >,
    ruleId?: string
  ) => {
    const existing = ruleId ? findRule(ruleId) : undefined
    if (existing) {
      Object.assign(existing, payload, { updatedAt: formatNow() })
      return existing.id
    }
    const nextId = `RR${String(Math.max(0, ...rules.value.map((item) => Number(item.id.replace(/\D/g, '')))) + 1).padStart(5, '0')}`
    rules.value.unshift({
      ...payload,
      id: nextId,
      todayTriggers: 0,
      createdBy: 'Super Admin',
      createdAt: formatNow(),
      updatedAt: formatNow()
    })
    return nextId
  }

  const duplicateRule = (ruleId: string) => {
    const source = findRule(ruleId)
    if (!source) return undefined
    return saveRule({
      code: `${source.code}_COPY`,
      name: `${source.name}（副本）`,
      category: source.category,
      severity: source.severity,
      scope: source.scope,
      metric: source.metric,
      operator: source.operator,
      threshold: source.threshold,
      window: source.window,
      cooldown: source.cooldown,
      status: 'Draft',
      description: source.description,
      scopeTargets: [...source.scopeTargets],
      whitelist: [...source.whitelist]
    })
  }

  const changeRuleStatus = (ruleId: string, status: RiskRuleSummary['status']) => {
    const rule = findRule(ruleId)
    if (!rule) return false
    rule.status = status
    rule.updatedAt = formatNow()
    return true
  }

  const acknowledgeAlert = (alertId: string) => {
    const alert = findAlert(alertId)
    if (!alert || alert.status !== 'New') return false
    const before = alert.status
    alert.status = 'Acknowledged'
    alert.assignee ||= 'Super Admin'
    alert.updatedAt = formatNow()
    addLog(alertId, '確認告警', before, alert.status, '已確認告警內容，進入人工判讀')
    return true
  }

  const assignAlert = (alertId: string, assignee: string, reason: string) => {
    const alert = findAlert(alertId)
    if (!alert || !assignee.trim()) return false
    const before = alert.assignee || '未指派'
    alert.assignee = assignee.trim()
    alert.updatedAt = formatNow()
    addLog(alertId, '指派處理人', before, alert.assignee, reason)
    return true
  }

  const startInvestigation = (alertId: string) => {
    const alert = findAlert(alertId)
    if (!alert || ['Resolved', 'False Positive', 'Dismissed'].includes(alert.status)) return false
    const before = alert.status
    alert.status = 'Investigating'
    alert.assignee ||= 'Super Admin'
    alert.updatedAt = formatNow()
    addLog(alertId, '開始調查', before, alert.status, '開始檢查關聯會員、注單及交易資料')
    return true
  }

  const dismissAlert = (alertId: string, falsePositive: boolean, reason: string) => {
    const alert = findAlert(alertId)
    if (!alert || reason.trim().length < 4) return false
    const before = alert.status
    alert.status = falsePositive ? 'False Positive' : 'Dismissed'
    alert.updatedAt = formatNow()
    addLog(alertId, falsePositive ? '標記誤報' : '忽略告警', before, alert.status, reason.trim())
    return true
  }

  const createCaseFromAlert = (alertId: string, reason: string) => {
    const alert = findAlert(alertId)
    if (!alert) return undefined
    if (alert.caseId) return alert.caseId
    const nextCaseId = `R${String(Math.max(0, ...cases.value.map((item) => Number(item.id.replace(/\D/g, '')))) + 1).padStart(5, '0')}`
    const before = alert.status
    alert.caseId = nextCaseId
    alert.status = 'Investigating'
    alert.assignee ||= 'Super Admin'
    alert.updatedAt = formatNow()
    cases.value.unshift({
      id: nextCaseId,
      title: `${alert.title}調查案件`,
      category: alert.category,
      severity: alert.severity,
      status: 'Investigating',
      priority:
        alert.severity === 'Critical' ? 'Urgent' : alert.severity === 'High' ? 'High' : 'Normal',
      description: reason,
      alertIds: [alert.id],
      memberIds: alert.memberId ? [alert.memberId] : [],
      betIds: alert.betId ? [alert.betId] : [],
      transactionIds: alert.transactionId ? [alert.transactionId] : [],
      merchantIds: alert.merchantId ? [alert.merchantId] : [],
      lineUids: alert.lineUid ? [alert.lineUid] : [],
      gameIds: alert.gameId ? [alert.gameId] : [],
      poolIds: alert.poolId ? [alert.poolId] : [],
      assignee: alert.assignee,
      openedBy: 'Super Admin',
      openedAt: formatNow(),
      dueAt: alert.dueAt,
      updatedAt: formatNow()
    })
    addCaseLog(nextCaseId, '建立案件', '無', 'Investigating', reason)
    addLog(alertId, '建立風控案件', before, alert.status, `${nextCaseId}｜${reason}`)
    return nextCaseId
  }

  const assignCase = (caseId: string, assignee: string, reason: string) => {
    const item = findCase(caseId)
    if (!item || !assignee.trim()) return false
    const before = item.assignee || '未指派'
    item.assignee = assignee.trim()
    item.updatedAt = formatNow()
    addCaseLog(caseId, '指派處理人', before, item.assignee, reason)
    return true
  }

  const startCaseInvestigation = (caseId: string) => {
    const item = findCase(caseId)
    if (!item || ['Resolved', 'Closed'].includes(item.status)) return false
    const before = item.status
    item.status = 'Investigating'
    item.assignee ||= 'Super Admin'
    item.updatedAt = formatNow()
    addCaseLog(caseId, '開始調查', before, item.status, '開始核對案件內的告警與關聯資料')
    return true
  }

  const addCaseNote = (caseId: string, note: string) => {
    const item = findCase(caseId)
    if (!item || note.trim().length < 4) return false
    item.updatedAt = formatNow()
    addCaseLog(caseId, '新增處理紀錄', item.status, item.status, note.trim())
    return true
  }

  const resolveCase = (caseId: string, conclusion: string, resolution: string) => {
    const item = findCase(caseId)
    if (!item || conclusion.trim().length < 4 || resolution.trim().length < 4) return false
    const before = item.status
    item.status = 'Resolved'
    item.conclusion = conclusion.trim()
    item.resolution = resolution.trim()
    item.updatedAt = formatNow()
    item.alertIds.forEach((alertId) => {
      const alert = findAlert(alertId)
      if (alert && !['False Positive', 'Dismissed'].includes(alert.status)) {
        alert.status = 'Resolved'
        alert.updatedAt = formatNow()
        addLog(alertId, '案件完成調查', 'Investigating', 'Resolved', item.conclusion || '')
      }
    })
    addCaseLog(caseId, '完成調查', before, item.status, `${item.conclusion}｜${item.resolution}`)
    return true
  }

  const closeCase = (caseId: string, reason: string) => {
    const item = findCase(caseId)
    if (!item || item.status !== 'Resolved' || reason.trim().length < 4) return false
    const before = item.status
    item.status = 'Closed'
    item.closedAt = formatNow()
    item.updatedAt = item.closedAt
    addCaseLog(caseId, '關閉案件', before, item.status, reason.trim())
    return true
  }

  return {
    rules,
    alerts,
    actionLogs,
    cases,
    caseLogs,
    openAlerts,
    newAlertCount,
    criticalAlertCount,
    investigatingCount,
    overdueAlerts,
    findAlert,
    findRule,
    findCase,
    getAlertLogs,
    getCaseLogs,
    saveRule,
    duplicateRule,
    changeRuleStatus,
    acknowledgeAlert,
    assignAlert,
    startInvestigation,
    dismissAlert,
    createCaseFromAlert,
    assignCase,
    startCaseInvestigation,
    addCaseNote,
    resolveCase,
    closeCase
  }
})
