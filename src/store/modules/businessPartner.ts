import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { agentMockData, merchantRecords } from '@/mock/game-provider'
import type {
  AgentCommercialTerm,
  AgentLevel,
  AgentReconciliationSummary,
  AgentRecord,
  AgentStatus,
  AuditEntry,
  MerchantCommercialTerm,
  MerchantGameConfiguration,
  MerchantLine,
  MerchantLineGameConfiguration,
  MerchantReconciliationSummary,
  MerchantRecord,
  MerchantStatus,
  SettlementBasis,
  SettlementCycle,
  WalletMode,
  IntegrationTestItem,
  IntegrationEnvironment,
  IntegrationEnvironmentConfig,
  CredentialRecord
} from '@/types/game-provider'

export interface NewAgentPayload {
  code: string
  name: string
  level: AgentLevel
  parentAgentId?: string
  contact: string
  contactMethod: string
  cooperationStartDate: string
  note?: string
  settlementBasis: SettlementBasis
  ratePercent: number
  settlementCurrency: string
  settlementCycle: SettlementCycle
  effectiveFrom: string
}

export interface NewMerchantPayload {
  code: string
  name: string
  brandName?: string
  country: string
  timezone: string
  contact: string
  email: string
  cooperationStartDate: string
  note?: string
  agentId: string
  settlementBasis: SettlementBasis
  merchantTermPercent: number
  settlementCurrency: string
  settlementCycle: SettlementCycle
  effectiveFrom: string
  walletMode: WalletMode
  lineCurrency: string
  createSandbox: boolean
}

export interface NewMerchantLinePayload {
  currency: string
  copySourceUid?: string
  createSandbox?: boolean
}

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

export const useBusinessPartnerStore = defineStore('businessPartnerStore', () => {
  const sourceAgents = structuredClone(agentMockData)
  const nameToId = new Map(sourceAgents.map((agent) => [agent.name, agent.id]))
  const agents = ref<AgentRecord[]>(
    sourceAgents.map((agent) => ({
      ...agent,
      parentAgentId: agent.parentAgent === '—' ? undefined : nameToId.get(agent.parentAgent),
      updatedAt: agent.updatedAt || agent.createdAt
    }))
  )
  const merchants = ref<MerchantRecord[]>(structuredClone(merchantRecords))
  const commercialTerms = ref<AgentCommercialTerm[]>(
    agents.value.map((agent, index) => ({
      id: `TERM-${agent.id}-001`,
      agentId: agent.id,
      version: 1,
      settlementBasis: (index % 3 === 0
        ? 'GGR'
        : index % 3 === 1
          ? 'Valid Bet'
          : 'Turnover') as SettlementBasis,
      ratePercent: Number((5.5 + (index % 5) * 0.25).toFixed(2)),
      settlementCurrency: agent.currency || 'USDT',
      settlementCycle: (index % 2 === 0 ? 'Monthly' : 'Weekly') as SettlementCycle,
      effectiveFrom: agent.cooperationStartDate || agent.createdAt.slice(0, 10),
      status: agent.status === 'Active' ? 'Active' : 'Draft',
      reason: '初始合作條件',
      createdBy: 'Super Admin',
      createdAt: agent.createdAt
    }))
  )
  merchants.value.forEach((merchant, index) => {
    const agentTerm = commercialTerms.value.find((term) => term.agentId === merchant.agentId)
    merchant.agentTermPercent = agentTerm?.ratePercent || 0
    merchant.merchantTermPercent = Number(
      Math.max(0, merchant.agentTermPercent - 0.75 - (index % 3) * 0.25).toFixed(2)
    )
    merchant.email ||= `${merchant.code.toLowerCase()}@example.com`
    merchant.cooperationStartDate ||= merchant.createdAt.slice(0, 10)
  })
  const merchantCommercialTerms = ref<MerchantCommercialTerm[]>(
    merchants.value.map((merchant) => {
      const agentTerm = commercialTerms.value.find((term) => term.agentId === merchant.agentId)
      return {
        id: `MTERM-${merchant.id}-001`,
        merchantId: merchant.id,
        version: 1,
        settlementBasis: agentTerm?.settlementBasis || 'GGR',
        agentTermPercent: merchant.agentTermPercent,
        merchantTermPercent: merchant.merchantTermPercent,
        settlementCurrency: merchant.settlementCurrency,
        settlementCycle: merchant.settlementCycle,
        effectiveFrom: merchant.cooperationStartDate || merchant.createdAt.slice(0, 10),
        status: merchant.status === 'Active' ? 'Active' : 'Draft',
        reason: '初始商務條件',
        createdBy: 'Super Admin',
        createdAt: merchant.createdAt
      }
    })
  )
  const merchantGameConfigurations = ref<MerchantGameConfiguration[]>(
    merchants.value.flatMap((merchant, merchantIndex) =>
      Array.from({ length: 5 }, (_, gameIndex) => ({
        gameId: `G${String(gameIndex + 1).padStart(5, '0')}`,
        merchantId: merchant.id,
        enabled: gameIndex < 4,
        rtpPlanId: `RTP-${String((gameIndex % 3) + 1).padStart(3, '0')}`,
        rtpPlanName: ['標準 96.2%', '均衡 95.8%', '進階 96.8%'][gameIndex % 3],
        updatedAt: `2026-08-${String(28 - ((merchantIndex + gameIndex) % 8)).padStart(2, '0')} 14:20`
      }))
    )
  )
  const merchantReconciliationSummaries = ref<MerchantReconciliationSummary[]>(
    merchants.value.flatMap((merchant, index) =>
      ['2026-08', '2026-07', '2026-06'].map((period, periodIndex) => {
        const term = merchantCommercialTerms.value.find((item) => item.merchantId === merchant.id)!
        const betAmount = 420000 + index * 28000 - periodIndex * 31000
        const winAmount = Math.round(betAmount * (0.932 + (index % 4) * 0.005))
        const ggr = betAmount - winAmount
        const validBet = Math.round(betAmount * 0.9)
        const baseValue =
          term.settlementBasis === 'GGR'
            ? ggr
            : term.settlementBasis === 'Valid Bet'
              ? validBet
              : betAmount
        return {
          id: `MREC-${merchant.id}-${period}`,
          merchantId: merchant.id,
          period,
          settlementBasis: term.settlementBasis,
          betAmount,
          winAmount,
          ggr,
          validBet,
          merchantTermPercent: term.merchantTermPercent,
          estimatedSettlement: Math.round(baseValue * (term.merchantTermPercent / 100)),
          currency: term.settlementCurrency,
          exchangeRateStatus: periodIndex === 0 ? 'Estimated' : 'Locked',
          status: periodIndex === 0 ? 'Pending' : periodIndex === 1 ? 'Confirmed' : 'Completed'
        }
      })
    )
  )
  const merchantAuditLogs = ref<Record<string, AuditEntry[]>>(
    Object.fromEntries(
      merchants.value.map((merchant) => [
        merchant.id,
        [
          {
            id: `MAUD-${merchant.id}-002`,
            action: '更新商戶資料',
            operator: 'Business Ops',
            reason: '例行資料確認',
            time: merchant.updatedAt,
            result: 'Success',
            before: '前一版商戶主檔',
            after: `${merchant.name}｜${merchant.status}`
          },
          {
            id: `MAUD-${merchant.id}-001`,
            action: '建立商戶',
            operator: 'Super Admin',
            reason: '建立商戶主檔與初始線路',
            time: merchant.createdAt,
            result: 'Success',
            before: '無',
            after: merchant.code
          }
        ] as AuditEntry[]
      ])
    )
  )
  const gameNames = ['Dragon Vault', 'Neon Tiger', 'Lucky Panda', 'Royal Baccarat', 'Fortune Ox']
  const merchantLineGameConfigurations = ref<Record<string, MerchantLineGameConfiguration[]>>(
    Object.fromEntries(
      merchants.value.flatMap((merchant) =>
        merchant.lines.map((line) => [
          line.uid,
          gameNames.map((_, index) => ({
            gameId: `G${String(index + 1).padStart(5, '0')}`,
            lineUid: line.uid,
            enabled: index < line.enabledGames,
            rtpPlanName: ['標準 96.2%', '均衡 95.8%', '進階 96.8%'][index % 3],
            limitPlan: ['標準限紅', '低額限紅', '高額限紅'][index % 3],
            jackpotMode: line.jackpotMode,
            updatedAt: line.updatedAt
          }))
        ])
      )
    )
  )
  const merchantLineTests = ref<Record<string, IntegrationTestItem[]>>(
    Object.fromEntries(
      merchants.value.flatMap((merchant) =>
        merchant.lines.map((line) => [
          line.uid,
          (line.walletMode === 'Seamless'
            ? [
                ['餘額查詢', '驗證餘額查詢與簽章', true],
                ['下注', '驗證下注冪等與回應', true],
                ['派彩', '驗證派彩與重送處理', true],
                ['退款／回滾', '驗證退款及回滾流程', true]
              ]
            : [
                ['轉入', '驗證資金轉入遊戲錢包', true],
                ['轉出', '驗證資金轉回商戶錢包', true],
                ['遊戲餘額', '驗證遊戲錢包餘額', true],
                ['餘額回收', '驗證批次回收流程', true]
              ]
          ).map((item, index) => ({
            id: `${line.uid}-TEST-${index + 1}`,
            name: item[0] as string,
            description: item[1] as string,
            required: item[2] as boolean,
            status: index < 2 ? ('Passed' as const) : ('Not Started' as const),
            testedAt: index < 2 ? line.updatedAt : undefined
          }))
        ])
      )
    )
  )
  const merchantLineAuditLogs = ref<Record<string, AuditEntry[]>>(
    Object.fromEntries(
      merchants.value.flatMap((merchant) =>
        merchant.lines.map((line) => [
          line.uid,
          [
            {
              id: `LAUD-${line.uid}-001`,
              action: '建立商戶線路',
              operator: 'Operations Admin',
              reason: '商戶初始線路',
              time: line.updatedAt,
              result: 'Success',
              before: '無',
              after: line.uid
            }
          ] as AuditEntry[]
        ])
      )
    )
  )
  const reconciliationSummaries = ref<AgentReconciliationSummary[]>(
    agents.value.flatMap((agent, index) =>
      ['2026-08', '2026-07', '2026-06'].map((period, periodIndex) => {
        const betAmount = 680000 + index * 37000 - periodIndex * 42000
        const winAmount = Math.round(betAmount * (0.93 + (index % 4) * 0.006))
        const ggr = betAmount - winAmount
        const term = commercialTerms.value.find((item) => item.agentId === agent.id)!
        const baseValue =
          term.settlementBasis === 'GGR'
            ? ggr
            : term.settlementBasis === 'Valid Bet'
              ? betAmount * 0.91
              : betAmount
        return {
          id: `REC-${agent.id}-${period}`,
          agentId: agent.id,
          period,
          settlementBasis: term.settlementBasis,
          betAmount,
          winAmount,
          ggr,
          validBet: Math.round(betAmount * 0.91),
          ratePercent: term.ratePercent,
          estimatedRevenue: Math.round(baseValue * (term.ratePercent / 100)),
          currency: term.settlementCurrency,
          exchangeRateStatus: periodIndex === 0 ? 'Estimated' : 'Locked',
          status: periodIndex === 0 ? 'Pending' : periodIndex === 1 ? 'Confirmed' : 'Completed'
        }
      })
    )
  )
  const auditLogs = ref<Record<string, AuditEntry[]>>(
    Object.fromEntries(
      agents.value.map((agent) => [
        agent.id,
        [
          {
            id: `AUD-${agent.id}-002`,
            action: '更新代理資料',
            operator: 'Business Ops',
            reason: '例行資料確認',
            time: agent.updatedAt || agent.createdAt,
            result: 'Success',
            before: '前一版代理主檔',
            after: `${agent.name}｜${agent.status}`
          },
          {
            id: `AUD-${agent.id}-001`,
            action: '建立代理',
            operator: 'Super Admin',
            reason: '建立合作代理主檔',
            time: agent.createdAt,
            result: 'Success',
            before: '無',
            after: agent.code
          }
        ] as AuditEntry[]
      ])
    )
  )

  const agentCount = computed(() => agents.value.length)
  const findAgent = (id: string) => agents.value.find((agent) => agent.id === id)
  const isCodeAvailable = (code: string, excludeId?: string) => {
    const normalized = code.trim().toUpperCase()
    return !agents.value.some(
      (agent) => agent.id !== excludeId && agent.code.toUpperCase() === normalized
    )
  }
  const getParent = (agent: AgentRecord) =>
    agent.parentAgentId ? findAgent(agent.parentAgentId) : undefined
  const getDirectChildren = (agentId: string) =>
    agents.value.filter((agent) => agent.parentAgentId === agentId)
  const getDescendants = (agentId: string) => {
    const result: AgentRecord[] = []
    const visit = (id: string) => {
      getDirectChildren(id).forEach((child) => {
        result.push(child)
        visit(child.id)
      })
    }
    visit(agentId)
    return result
  }
  const getDirectMerchants = (agentId: string) =>
    merchants.value.filter((merchant) => merchant.agentId === agentId)
  const getAllMerchants = (agentId: string) => {
    const agentIds = new Set([agentId, ...getDescendants(agentId).map((agent) => agent.id)])
    return merchants.value.filter((merchant) => agentIds.has(merchant.agentId))
  }
  const getTerms = (agentId: string) =>
    commercialTerms.value
      .filter((term) => term.agentId === agentId)
      .sort((a, b) => b.version - a.version)
  const getCurrentTerm = (agentId: string) =>
    getTerms(agentId).find((term) => term.status === 'Active') || getTerms(agentId)[0]
  const getReconciliations = (agentId: string) =>
    reconciliationSummaries.value.filter((item) => item.agentId === agentId)
  const getAuditLogs = (agentId: string) => auditLogs.value[agentId] || []
  const findMerchant = (id: string) => merchants.value.find((merchant) => merchant.id === id)
  const findMerchantLine = (merchantId: string, lineUid: string) =>
    findMerchant(merchantId)?.lines.find((line) => line.uid === lineUid)
  const isMerchantCodeAvailable = (code: string, excludeId?: string) => {
    const normalized = code.trim().toUpperCase()
    return !merchants.value.some(
      (merchant) => merchant.id !== excludeId && merchant.code.toUpperCase() === normalized
    )
  }
  const isLineUidAvailable = (uid: string) =>
    !merchants.value.some((merchant) => merchant.lines.some((line) => line.uid === uid))
  const getMerchantTerms = (merchantId: string) =>
    merchantCommercialTerms.value
      .filter((term) => term.merchantId === merchantId)
      .sort((a, b) => b.version - a.version)
  const getCurrentMerchantTerm = (merchantId: string) =>
    getMerchantTerms(merchantId).find((term) => term.status === 'Active') ||
    getMerchantTerms(merchantId)[0]
  const getMerchantGameConfigurations = (merchantId: string) =>
    merchantGameConfigurations.value.filter((item) => item.merchantId === merchantId)
  const getMerchantReconciliations = (merchantId: string) =>
    merchantReconciliationSummaries.value.filter((item) => item.merchantId === merchantId)
  const getMerchantAuditLogs = (merchantId: string) => merchantAuditLogs.value[merchantId] || []
  const getMerchantLineGameConfigurations = (lineUid: string) =>
    merchantLineGameConfigurations.value[lineUid] || []
  const getMerchantLineTests = (lineUid: string) => merchantLineTests.value[lineUid] || []
  const getMerchantLineAuditLogs = (lineUid: string) => merchantLineAuditLogs.value[lineUid] || []

  const addAudit = (agentId: string, input: Omit<AuditEntry, 'id' | 'time'>) => {
    const logs = auditLogs.value[agentId] || []
    logs.unshift({ ...input, id: `AUD-${agentId}-${Date.now()}`, time: formatNow() })
    auditLogs.value[agentId] = logs
  }

  const addMerchantAudit = (merchantId: string, input: Omit<AuditEntry, 'id' | 'time'>) => {
    const logs = merchantAuditLogs.value[merchantId] || []
    logs.unshift({ ...input, id: `MAUD-${merchantId}-${Date.now()}`, time: formatNow() })
    merchantAuditLogs.value[merchantId] = logs
  }

  const addMerchantLineAudit = (lineUid: string, input: Omit<AuditEntry, 'id' | 'time'>) => {
    const logs = merchantLineAuditLogs.value[lineUid] || []
    logs.unshift({ ...input, id: `LAUD-${lineUid}-${Date.now()}`, time: formatNow() })
    merchantLineAuditLogs.value[lineUid] = logs
  }

  const refreshCounts = () => {
    agents.value.forEach((agent) => {
      agent.childAgentCount = getDirectChildren(agent.id).length
      agent.merchantCount = getDirectMerchants(agent.id).length
      agent.parentAgent = getParent(agent)?.name || '—'
    })
  }

  const nextAgentId = () => {
    const maxId = agents.value.reduce(
      (max, agent) => Math.max(max, Number(agent.id.replace(/\D/g, '')) || 0),
      0
    )
    return `A${String(maxId + 1).padStart(5, '0')}`
  }

  const nextMerchantId = () => {
    const maxId = merchants.value.reduce(
      (max, merchant) => Math.max(max, Number(merchant.id.replace(/\D/g, '')) || 0),
      0
    )
    return `M${String(maxId + 1).padStart(5, '0')}`
  }

  const createLineUid = (merchantCode: string, currency: string) => {
    const base = `ASG_${merchantCode.replaceAll('-', '').toUpperCase()}_${currency}`
    if (isLineUidAvailable(base)) return base
    let sequence = 2
    while (!isLineUidAvailable(`${base}_${String(sequence).padStart(2, '0')}`)) sequence++
    return `${base}_${String(sequence).padStart(2, '0')}`
  }

  const createMerchantLineRecord = (
    merchant: Pick<MerchantRecord, 'id' | 'code' | 'name' | 'walletMode'>,
    payload: NewMerchantLinePayload
  ): MerchantLine => {
    const now = formatNow()
    const source = payload.copySourceUid
      ? merchants.value
          .flatMap((item) => item.lines)
          .find((line) => line.uid === payload.copySourceUid)
      : undefined
    const uid = createLineUid(merchant.code, payload.currency)
    return {
      uid,
      merchantId: merchant.id,
      currency: payload.currency,
      walletMode: merchant.walletMode,
      enabledGames: source?.enabledGames || 0,
      limitPlanCount: source?.limitPlanCount || 0,
      jackpotMode: source?.jackpotMode || 'Default',
      environment: payload.createSandbox ? 'Sandbox' : 'Not Configured',
      credentialStatus: 'Not Issued',
      environments: payload.createSandbox
        ? [
            {
              id: `${uid}-SBX`,
              environment: 'Sandbox',
              endpoint: 'https://sandbox-api.game-provider.local/v2',
              callbackUrl: '',
              ipWhitelist: [],
              status: 'Configuring',
              updatedAt: now
            }
          ]
        : [],
      status: payload.createSandbox ? 'Configuring' : 'Draft',
      updatedAt: now
    }
  }

  const initializeMerchantLineWorkspace = (line: MerchantLine) => {
    merchantLineGameConfigurations.value[line.uid] = gameNames.map((_, index) => ({
      gameId: `G${String(index + 1).padStart(5, '0')}`,
      lineUid: line.uid,
      enabled: index < line.enabledGames,
      rtpPlanName: ['標準 96.2%', '均衡 95.8%', '進階 96.8%'][index % 3],
      limitPlan: ['標準限紅', '低額限紅', '高額限紅'][index % 3],
      jackpotMode: line.jackpotMode,
      updatedAt: line.updatedAt
    }))
    merchantLineTests.value[line.uid] = (
      line.walletMode === 'Seamless'
        ? [
            ['餘額查詢', '驗證餘額查詢與簽章', true],
            ['下注', '驗證下注冪等與回應', true],
            ['派彩', '驗證派彩與重送處理', true],
            ['退款／回滾', '驗證退款及回滾流程', true]
          ]
        : [
            ['轉入', '驗證資金轉入遊戲錢包', true],
            ['轉出', '驗證資金轉回商戶錢包', true],
            ['遊戲餘額', '驗證遊戲錢包餘額', true],
            ['餘額回收', '驗證批次回收流程', true]
          ]
    ).map((item, index) => ({
      id: `${line.uid}-TEST-${index + 1}`,
      name: item[0] as string,
      description: item[1] as string,
      required: item[2] as boolean,
      status: 'Not Started',
      testedAt: undefined
    }))
    merchantLineAuditLogs.value[line.uid] = []
    addMerchantLineAudit(line.uid, {
      action: '建立商戶線路',
      operator: 'Operations Admin',
      reason: '建立新的交易線路工作區',
      result: 'Success',
      before: '無',
      after: line.uid
    })
  }

  const createAgent = (payload: NewAgentPayload) => {
    const now = formatNow()
    const parent = payload.parentAgentId ? findAgent(payload.parentAgentId) : undefined
    const agent: AgentRecord = {
      id: nextAgentId(),
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      level: payload.level,
      parentAgentId: parent?.id,
      parentAgent: parent?.name || '—',
      childAgentCount: 0,
      merchantCount: 0,
      currency: payload.settlementCurrency,
      contact: payload.contact,
      contactMethod: payload.contactMethod,
      cooperationStartDate: payload.cooperationStartDate,
      note: payload.note,
      status: 'Draft',
      createdAt: now,
      updatedAt: now
    }
    agents.value.unshift(agent)
    commercialTerms.value.unshift({
      id: `TERM-${agent.id}-001`,
      agentId: agent.id,
      version: 1,
      settlementBasis: payload.settlementBasis,
      ratePercent: payload.ratePercent,
      settlementCurrency: payload.settlementCurrency,
      settlementCycle: payload.settlementCycle,
      effectiveFrom: payload.effectiveFrom,
      status: 'Draft',
      reason: '建立代理時設定的初始條件',
      createdBy: 'Super Admin',
      createdAt: now
    })
    auditLogs.value[agent.id] = []
    addAudit(agent.id, {
      action: '建立代理',
      operator: 'Super Admin',
      reason: '建立代理主檔與初始商務條件',
      result: 'Success',
      before: '無',
      after: JSON.stringify(agent)
    })
    refreshCounts()
    return agent
  }

  const updateAgent = (id: string, updates: Partial<AgentRecord>, reason: string) => {
    const agent = findAgent(id)
    if (!agent) return
    const before = JSON.stringify(agent)
    Object.assign(agent, JSON.parse(JSON.stringify(updates)), { updatedAt: formatNow() })
    refreshCounts()
    addAudit(id, {
      action: '編輯代理資料',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(agent)
    })
  }

  const canAssignParent = (agentId: string, parentId: string) => {
    const agent = findAgent(agentId)
    const parent = findAgent(parentId)
    if (!agent || !parent || agent.id === parent.id) return false
    const requiredParentLevel =
      agent.level === 'L2' ? 'L1' : agent.level === 'L3' ? 'L2' : undefined
    if (!requiredParentLevel || parent.level !== requiredParentLevel) return false
    return !getDescendants(agentId).some((item) => item.id === parentId)
  }

  const changeParent = (agentId: string, parentId: string, reason: string) => {
    if (!canAssignParent(agentId, parentId)) return false
    const agent = findAgent(agentId)!
    const parent = findAgent(parentId)!
    const before = `${agent.parentAgentId || '無'}｜${agent.parentAgent}`
    agent.parentAgentId = parent.id
    agent.parentAgent = parent.name
    agent.updatedAt = formatNow()
    refreshCounts()
    addAudit(agentId, {
      action: '調整上級代理',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: `${parent.id}｜${parent.name}`
    })
    return true
  }

  const changeStatus = (agentId: string, status: AgentStatus, reason: string) => {
    const agent = findAgent(agentId)
    if (!agent) return
    const before = agent.status
    agent.status = status
    agent.updatedAt = formatNow()
    addAudit(agentId, {
      action:
        status === 'Active' ? '啟用代理' : status === 'Disabled' ? '停用代理' : '變更代理狀態',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: status
    })
  }

  const addCommercialTerm = (
    agentId: string,
    input: Omit<
      AgentCommercialTerm,
      'id' | 'agentId' | 'version' | 'createdAt' | 'createdBy' | 'status'
    >
  ) => {
    const versions = getTerms(agentId)
    const term: AgentCommercialTerm = {
      ...input,
      id: `TERM-${agentId}-${String(versions.length + 1).padStart(3, '0')}`,
      agentId,
      version: (versions[0]?.version || 0) + 1,
      status: 'Draft',
      createdBy: 'Super Admin',
      createdAt: formatNow()
    }
    commercialTerms.value.unshift(term)
    addAudit(agentId, {
      action: '新增商務條件版本',
      operator: 'Super Admin',
      reason: input.reason,
      result: 'Success',
      before: versions[0] ? JSON.stringify(versions[0]) : '無',
      after: JSON.stringify(term)
    })
    return term
  }

  const updateDraftCommercialTerm = (
    agentId: string,
    updates: Pick<
      AgentCommercialTerm,
      'settlementBasis' | 'ratePercent' | 'settlementCurrency' | 'settlementCycle' | 'effectiveFrom'
    >
  ) => {
    const term = getTerms(agentId).find((item) => item.status === 'Draft')
    if (!term) return false
    const before = JSON.stringify(term)
    Object.assign(term, updates)
    addAudit(agentId, {
      action: '更新商務條件草稿',
      operator: 'Super Admin',
      reason: '更新新建代理的初始條件',
      result: 'Success',
      before,
      after: JSON.stringify(term)
    })
    return true
  }

  const activateCommercialTerm = (termId: string, reason: string) => {
    const term = commercialTerms.value.find((item) => item.id === termId)
    if (!term) return
    commercialTerms.value.forEach((item) => {
      if (item.agentId === term.agentId && item.status === 'Active') {
        item.status = 'Expired'
        item.effectiveTo = term.effectiveFrom
      }
    })
    term.status = 'Active'
    const agent = findAgent(term.agentId)
    if (agent) {
      agent.currency = term.settlementCurrency
      agent.updatedAt = formatNow()
    }
    addAudit(term.agentId, {
      action: '商務條件生效',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before: '前一版本已失效',
      after: JSON.stringify(term)
    })
  }

  const createMerchant = (payload: NewMerchantPayload) => {
    const agent = findAgent(payload.agentId)
    const agentTerm = getCurrentTerm(payload.agentId)
    if (!agent || !agentTerm || !isMerchantCodeAvailable(payload.code)) return
    const now = formatNow()
    const merchant: MerchantRecord = {
      id: nextMerchantId(),
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      brandName: payload.brandName?.trim(),
      agentId: agent.id,
      agentName: agent.name,
      walletMode: payload.walletMode,
      country: payload.country,
      timezone: payload.timezone,
      contact: payload.contact.trim(),
      email: payload.email.trim(),
      cooperationStartDate: payload.cooperationStartDate,
      note: payload.note?.trim(),
      agentTermPercent: agentTerm.ratePercent,
      merchantTermPercent: payload.merchantTermPercent,
      settlementCurrency: payload.settlementCurrency,
      settlementCycle: payload.settlementCycle,
      status: 'Pending',
      lines: [],
      createdAt: now,
      updatedAt: now
    }
    const initialLine = createMerchantLineRecord(merchant, {
      currency: payload.lineCurrency,
      createSandbox: payload.createSandbox
    })
    merchant.lines.push(initialLine)
    merchants.value.unshift(merchant)
    merchantCommercialTerms.value.unshift({
      id: `MTERM-${merchant.id}-001`,
      merchantId: merchant.id,
      version: 1,
      settlementBasis: payload.settlementBasis,
      agentTermPercent: agentTerm.ratePercent,
      merchantTermPercent: payload.merchantTermPercent,
      settlementCurrency: payload.settlementCurrency,
      settlementCycle: payload.settlementCycle,
      effectiveFrom: payload.effectiveFrom,
      status: 'Draft',
      reason: '建立商戶時設定的初始條件',
      createdBy: 'Super Admin',
      createdAt: now
    })
    merchantGameConfigurations.value.push(
      ...Array.from({ length: 5 }, (_, gameIndex) => ({
        gameId: `G${String(gameIndex + 1).padStart(5, '0')}`,
        merchantId: merchant.id,
        enabled: false,
        rtpPlanId: '',
        rtpPlanName: '尚未設定',
        updatedAt: now
      }))
    )
    merchantAuditLogs.value[merchant.id] = []
    initializeMerchantLineWorkspace(initialLine)
    addMerchantAudit(merchant.id, {
      action: '建立商戶並送審',
      operator: 'Super Admin',
      reason: '建立商戶主檔、初始商務條件與第一條線路',
      result: 'Pending',
      before: '無',
      after: JSON.stringify(merchant)
    })
    refreshCounts()
    return merchant
  }

  const updateMerchant = (id: string, updates: Partial<MerchantRecord>, reason: string) => {
    const merchant = findMerchant(id)
    if (!merchant) return
    const before = JSON.stringify(merchant)
    Object.assign(merchant, JSON.parse(JSON.stringify(updates)), { updatedAt: formatNow() })
    const agent = findAgent(merchant.agentId)
    merchant.agentName = agent?.name || merchant.agentName
    refreshCounts()
    addMerchantAudit(id, {
      action: '編輯商戶資料',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(merchant)
    })
  }

  const changeMerchantStatus = (merchantId: string, status: MerchantStatus, reason: string) => {
    const merchant = findMerchant(merchantId)
    if (!merchant) return
    const before = merchant.status
    merchant.status = status
    merchant.updatedAt = formatNow()
    if (status === 'Suspended') {
      merchant.lines.forEach((line) => {
        if (!['Closed', 'Suspended'].includes(line.status)) line.status = 'Suspended'
      })
    }
    addMerchantAudit(merchantId, {
      action:
        status === 'Active' ? '啟用商戶' : status === 'Suspended' ? '暫停商戶' : '變更商戶狀態',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: status
    })
  }

  const addMerchantLine = (merchantId: string, payload: NewMerchantLinePayload) => {
    const merchant = findMerchant(merchantId)
    if (!merchant) return
    const line = createMerchantLineRecord(merchant, payload)
    merchant.lines.push(line)
    initializeMerchantLineWorkspace(line)
    merchant.updatedAt = formatNow()
    addMerchantAudit(merchantId, {
      action: '新增商戶線路',
      operator: 'Super Admin',
      reason: `新增 ${payload.currency} 交易線路`,
      result: 'Success',
      before: '無',
      after: line.uid
    })
    return line
  }

  const changeMerchantLineStatus = (
    merchantId: string,
    lineUid: string,
    status: MerchantLine['status'],
    reason: string
  ) => {
    const merchant = findMerchant(merchantId)
    const line = findMerchantLine(merchantId, lineUid)
    if (!merchant || !line) return
    const before = line.status
    line.status = status
    line.updatedAt = formatNow()
    merchant.updatedAt = line.updatedAt
    addMerchantAudit(merchantId, {
      action: status === 'Suspended' ? '暫停商戶線路' : '變更商戶線路狀態',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before: `${line.uid}｜${before}`,
      after: `${line.uid}｜${status}`
    })
    addMerchantLineAudit(lineUid, {
      action: status === 'Suspended' ? '暫停商戶線路' : '變更商戶線路狀態',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before,
      after: status
    })
  }

  const addMerchantCommercialTerm = (
    merchantId: string,
    input: Omit<
      MerchantCommercialTerm,
      'id' | 'merchantId' | 'version' | 'createdAt' | 'createdBy' | 'status'
    >
  ) => {
    const versions = getMerchantTerms(merchantId)
    const term: MerchantCommercialTerm = {
      ...input,
      id: `MTERM-${merchantId}-${String(versions.length + 1).padStart(3, '0')}`,
      merchantId,
      version: (versions[0]?.version || 0) + 1,
      status: 'Draft',
      createdBy: 'Super Admin',
      createdAt: formatNow()
    }
    merchantCommercialTerms.value.unshift(term)
    addMerchantAudit(merchantId, {
      action: '新增商戶商務條件版本',
      operator: 'Super Admin',
      reason: input.reason,
      result: 'Success',
      before: versions[0] ? JSON.stringify(versions[0]) : '無',
      after: JSON.stringify(term)
    })
    return term
  }

  const activateMerchantCommercialTerm = (termId: string, reason: string) => {
    const term = merchantCommercialTerms.value.find((item) => item.id === termId)
    if (!term) return
    merchantCommercialTerms.value.forEach((item) => {
      if (item.merchantId === term.merchantId && item.status === 'Active') {
        item.status = 'Expired'
        item.effectiveTo = term.effectiveFrom
      }
    })
    term.status = 'Active'
    const merchant = findMerchant(term.merchantId)
    if (merchant) {
      merchant.agentTermPercent = term.agentTermPercent
      merchant.merchantTermPercent = term.merchantTermPercent
      merchant.settlementCurrency = term.settlementCurrency
      merchant.settlementCycle = term.settlementCycle
      merchant.updatedAt = formatNow()
    }
    addMerchantAudit(term.merchantId, {
      action: '商戶商務條件生效',
      operator: 'Super Admin',
      reason,
      result: 'Success',
      before: '前一版本已失效',
      after: JSON.stringify(term)
    })
  }

  const updateMerchantGameConfiguration = (
    merchantId: string,
    gameId: string,
    updates: Partial<Pick<MerchantGameConfiguration, 'enabled' | 'rtpPlanId' | 'rtpPlanName'>>,
    reason: string
  ) => {
    const config = merchantGameConfigurations.value.find(
      (item) => item.merchantId === merchantId && item.gameId === gameId
    )
    if (!config) return
    const before = JSON.stringify(config)
    Object.assign(config, updates, { updatedAt: formatNow() })
    const merchant = findMerchant(merchantId)
    if (merchant) {
      merchant.updatedAt = config.updatedAt
      merchant.lines.forEach((line) => {
        const lineConfig = getMerchantLineGameConfigurations(line.uid).find(
          (item) => item.gameId === gameId
        )
        if (lineConfig) {
          lineConfig.enabled = config.enabled
          lineConfig.rtpPlanName = config.rtpPlanName
          lineConfig.updatedAt = config.updatedAt
        }
        line.enabledGames = getMerchantLineGameConfigurations(line.uid).filter(
          (item) => item.enabled
        ).length
      })
    }
    addMerchantAudit(merchantId, {
      action: '更新商戶遊戲配置',
      operator: 'Game Operations',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(config)
    })
  }

  const updateMerchantLineGameConfiguration = (
    merchantId: string,
    lineUid: string,
    gameId: string,
    updates: Partial<Pick<MerchantLineGameConfiguration, 'enabled' | 'limitPlan' | 'jackpotMode'>>,
    reason: string
  ) => {
    const line = findMerchantLine(merchantId, lineUid)
    const config = getMerchantLineGameConfigurations(lineUid).find((item) => item.gameId === gameId)
    if (!line || !config) return
    const before = JSON.stringify(config)
    Object.assign(config, updates, { updatedAt: formatNow() })
    line.enabledGames = getMerchantLineGameConfigurations(lineUid).filter(
      (item) => item.enabled
    ).length
    line.limitPlanCount = new Set(
      getMerchantLineGameConfigurations(lineUid)
        .filter((item) => item.enabled)
        .map((item) => item.limitPlan)
    ).size
    line.updatedAt = config.updatedAt
    addMerchantLineAudit(lineUid, {
      action: '更新線路遊戲配置',
      operator: 'Game Operations',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(config)
    })
    addMerchantAudit(merchantId, {
      action: '更新線路遊戲配置',
      operator: 'Game Operations',
      reason,
      result: 'Success',
      before: `${lineUid}｜${gameId}`,
      after: JSON.stringify(config)
    })
  }

  const startMerchantLineTests = (merchantId: string, lineUid: string) => {
    const line = findMerchantLine(merchantId, lineUid)
    if (!line) return false
    getMerchantLineTests(lineUid).forEach((item) => {
      item.status = 'Testing'
    })
    line.status = 'Testing'
    line.updatedAt = formatNow()
    return true
  }

  const completeMerchantLineTests = (merchantId: string, lineUid: string) => {
    const line = findMerchantLine(merchantId, lineUid)
    if (!line) return false
    const now = formatNow()
    getMerchantLineTests(lineUid).forEach((item) => {
      item.status = 'Passed'
      item.testedAt = now
    })
    line.status = line.environment === 'Production' ? 'Active' : 'Sandbox Enabled'
    line.updatedAt = now
    addMerchantLineAudit(lineUid, {
      action: '完成串接測試',
      operator: 'Integration Admin',
      reason: '執行全套必要測試案例',
      result: 'Success',
      before: '待測試',
      after: '必要測試全部通過'
    })
    addMerchantAudit(merchantId, {
      action: '線路串接測試通過',
      operator: 'Integration Admin',
      reason: lineUid,
      result: 'Success'
    })
    return true
  }

  const requestProductionEnvironment = (merchantId: string, lineUid: string, reason: string) => {
    const line = findMerchantLine(merchantId, lineUid)
    if (!line) return false
    const requiredTestsPassed = getMerchantLineTests(lineUid)
      .filter((item) => item.required)
      .every((item) => item.status === 'Passed')
    if (!requiredTestsPassed) return false
    if (!line.environments.some((item) => item.environment === 'Production')) {
      line.environments.push({
        id: `${line.uid}-PRD`,
        environment: 'Production',
        endpoint: 'https://api.game-provider.local/v2',
        callbackUrl: '',
        ipWhitelist: [],
        status: 'Configuring',
        updatedAt: formatNow()
      })
    }
    line.status = 'Production Pending'
    line.updatedAt = formatNow()
    addMerchantLineAudit(lineUid, {
      action: '申請正式環境',
      operator: 'Integration Admin',
      reason,
      result: 'Pending',
      before: '僅測試環境',
      after: '正式環境待審'
    })
    addMerchantAudit(merchantId, {
      action: '線路申請正式環境',
      operator: 'Integration Admin',
      reason,
      result: 'Pending',
      after: lineUid
    })
    return true
  }

  const updateLineEnvironment = (
    merchantId: string,
    lineUid: string,
    environment: IntegrationEnvironment,
    updates: Partial<Pick<IntegrationEnvironmentConfig, 'callbackUrl' | 'ipWhitelist' | 'status'>>,
    reason: string
  ) => {
    const line = findMerchantLine(merchantId, lineUid)
    const target = line?.environments.find((item) => item.environment === environment)
    if (!line || !target) return
    const before = JSON.stringify(target)
    Object.assign(target, updates, { updatedAt: formatNow() })
    if (environment === 'Production' && target.status === 'Active') {
      line.environment = 'Production'
      line.status = 'Active'
    } else if (environment === 'Sandbox' && target.status === 'Active') {
      line.environment = 'Sandbox'
      if (line.status !== 'Active') line.status = 'Sandbox Enabled'
    }
    line.updatedAt = target.updatedAt
    addMerchantLineAudit(lineUid, {
      action: `更新${environment === 'Sandbox' ? '測試' : '正式'}環境設定`,
      operator: 'Integration Admin',
      reason,
      result: 'Success',
      before,
      after: JSON.stringify(target)
    })
  }

  const updateLineCredential = (
    merchantId: string,
    lineUid: string,
    environment: IntegrationEnvironment,
    credential: CredentialRecord | undefined
  ) => {
    const line = findMerchantLine(merchantId, lineUid)
    const target = line?.environments.find((item) => item.environment === environment)
    if (!line || !target) return
    target.credential = credential
    target.updatedAt = formatNow()
    const credentials = line.environments.map((item) => item.credential).filter(Boolean)
    line.credentialStatus = credentials.some((item) => item?.status === 'Active')
      ? 'Active'
      : credential?.status || 'Not Issued'
    line.updatedAt = target.updatedAt
    addMerchantLineAudit(lineUid, {
      action: credential?.status === 'Revoked' ? '撤銷環境憑證' : '更新環境憑證',
      operator: 'Integration Admin',
      reason: `${environment} 環境憑證作業`,
      result: credential?.status === 'Revoked' ? 'Pending' : 'Success',
      after: credential?.id || '無憑證'
    })
  }

  refreshCounts()

  return {
    agents,
    merchants,
    commercialTerms,
    reconciliationSummaries,
    auditLogs,
    merchantCommercialTerms,
    merchantGameConfigurations,
    merchantReconciliationSummaries,
    merchantAuditLogs,
    merchantLineGameConfigurations,
    merchantLineTests,
    merchantLineAuditLogs,
    agentCount,
    findAgent,
    isCodeAvailable,
    getParent,
    getDirectChildren,
    getDescendants,
    getDirectMerchants,
    getAllMerchants,
    getTerms,
    getCurrentTerm,
    getReconciliations,
    getAuditLogs,
    findMerchant,
    findMerchantLine,
    isMerchantCodeAvailable,
    isLineUidAvailable,
    createLineUid,
    getMerchantTerms,
    getCurrentMerchantTerm,
    getMerchantGameConfigurations,
    getMerchantReconciliations,
    getMerchantAuditLogs,
    getMerchantLineGameConfigurations,
    getMerchantLineTests,
    getMerchantLineAuditLogs,
    createAgent,
    updateAgent,
    canAssignParent,
    changeParent,
    changeStatus,
    addCommercialTerm,
    updateDraftCommercialTerm,
    activateCommercialTerm,
    createMerchant,
    updateMerchant,
    changeMerchantStatus,
    addMerchantLine,
    changeMerchantLineStatus,
    addMerchantCommercialTerm,
    activateMerchantCommercialTerm,
    updateMerchantGameConfiguration,
    updateMerchantLineGameConfiguration,
    startMerchantLineTests,
    completeMerchantLineTests,
    requestProductionEnvironment,
    updateLineEnvironment,
    updateLineCredential
  }
})
