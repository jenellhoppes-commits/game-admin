import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useBusinessPartnerStore } from './businessPartner'
import { useFinanceCenterStore } from './financeCenter'
import { useFinanceSettingsStore } from './financeSettings'
import { useTransactionCenterStore } from './transactionCenter'
import type {
  AgentCommercialTerm,
  AgentRecord,
  AgentReconciliationRecord,
  MerchantRecord
} from '@/types/game-provider'

export const CURRENT_AGENT_ID = 'A00001'

export type AgentPermission =
  | 'relations:manage'
  | 'merchants:apply'
  | 'terms:apply'
  | 'finance:confirm'
  | 'reports:export'
  | 'staff:manage'

export interface AgentPortalStaff {
  id: string
  name: string
  account: string
  roleId: string
  scope: string
  status: 'Active' | 'Inactive' | 'Pending'
  lastLogin?: string
}

export interface AgentPortalRole {
  id: string
  name: string
  permissions: AgentPermission[]
}

export interface AgentPortalRequest {
  id: string
  category: '關係' | '商戶' | '條件' | '差異'
  action: string
  targetId: string
  targetName: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved'
  createdAt: string
  effective: boolean
  extra?: Record<string, string | number>
}

export interface AgentPortalNotice {
  content?: string
  id: string
  type: '平台公告' | '申請' | '對帳'
  title: string
  scope: string
  publishedAt: string
  read: boolean
}

export interface AgentPortalLog {
  id: string
  time: string
  actor: string
  action: string
  scope: string
  result: string
}

export interface AgentMetricRow {
  id: string
  date: string
  gameId: string
  lineKey: string
  memberKey: string
  roundKey: string
  agentId: string
  agentName: string
  merchantId: string
  merchantName: string
  gameName: string
  currency: string
  lines: number
  rounds: number
  activeMembers: number
  betAmount: number
  payoutAmount: number
  ggr: number
}

export interface AgentReportRow {
  id: string
  name: string
  currency: string
  merchants: number
  lines: number
  rounds: number
  activeMembers: number
  betAmount: number
  payoutAmount: number
  ggr: number
}

const now = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)
const requestId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`
const levelNumber = (agent?: AgentRecord) => Number(agent?.level?.replace('L', '') || 0)

export function groupAgentMetrics(
  rows: AgentMetricRow[],
  dimension: '代理' | '商戶' | '遊戲' | '幣別'
): AgentReportRow[] {
  const groups = new Map<string, AgentReportRow & {
    merchantIds: Set<string>
    lineIds: Set<string>
    memberIds: Set<string>
    roundIds: Set<string>
  }>()
  const seen = new Set<string>()
  rows.forEach((row) => {
    if (seen.has(row.id)) return
    seen.add(row.id)
    const name =
      dimension === '代理'
        ? row.agentName
        : dimension === '商戶'
          ? row.merchantName
          : dimension === '遊戲'
            ? row.gameName
            : row.currency
    const entityId = dimension === '代理' ? row.agentId : dimension === '商戶' ? row.merchantId : dimension === '遊戲' ? row.gameId : row.currency
    const id = JSON.stringify([dimension, entityId, row.currency])
    const current = groups.get(id) || {
      id,
      name,
      currency: row.currency,
      merchants: 0,
      merchantIds: new Set<string>(),
      lineIds: new Set<string>(),
      memberIds: new Set<string>(),
      roundIds: new Set<string>(),
      lines: 0,
      rounds: 0,
      activeMembers: 0,
      betAmount: 0,
      payoutAmount: 0,
      ggr: 0
    }
    current.merchantIds.add(row.merchantId)
    current.merchants = current.merchantIds.size
    current.lineIds.add(row.lineKey)
    current.memberIds.add(row.memberKey)
    current.roundIds.add(row.roundKey)
    current.lines = current.lineIds.size
    current.rounds = current.roundIds.size
    current.activeMembers = current.memberIds.size
    current.betAmount += row.betAmount
    current.payoutAmount += row.payoutAmount
    current.ggr += row.ggr
    groups.set(id, current)
  })
  return [...groups.values()].map(({ merchantIds: _merchantIds, lineIds: _lineIds, memberIds: _memberIds, roundIds: _roundIds, ...row }) => ({
    ...row,
    betAmount: Number(row.betAmount.toFixed(2)),
    payoutAmount: Number(row.payoutAmount.toFixed(2)),
    ggr: Number(row.ggr.toFixed(2))
  }))
}

export function getComparableSpread(
  mine: Pick<AgentCommercialTerm, 'settlementBasis' | 'effectiveFrom' | 'effectiveTo' | 'ratePercent'>,
  target: Pick<AgentCommercialTerm, 'settlementBasis' | 'effectiveFrom' | 'effectiveTo' | 'ratePercent'>
): string {
  if (
    mine.settlementBasis !== target.settlementBasis ||
    mine.effectiveFrom !== target.effectiveFrom ||
    (mine.effectiveTo || '') !== (target.effectiveTo || '')
  ) {
    return '不適用'
  }
  return `${(target.ratePercent - mine.ratePercent).toFixed(2)} 個百分點`
}

export const useAgentPortalStore = defineStore(
  'agentPortalStore',
  () => {
    const businessStore = useBusinessPartnerStore()
    const transactionStore = useTransactionCenterStore()
    const financeStore = useFinanceCenterStore()
    const financeSettingsStore = useFinanceSettingsStore()

    const roles = ref<AgentPortalRole[]>([
      {
        id: 'ROLE-AGENT-ADMIN',
        name: '代理管理員',
        permissions: [
          'relations:manage',
          'merchants:apply',
          'terms:apply',
          'finance:confirm',
          'reports:export',
          'staff:manage'
        ]
      },
      {
        id: 'ROLE-AGENT-OPS',
        name: '營運',
        permissions: ['merchants:apply', 'reports:export']
      },
      {
        id: 'ROLE-AGENT-FINANCE',
        name: '財務',
        permissions: ['finance:confirm', 'reports:export']
      },
      { id: 'ROLE-AGENT-AUDIT', name: '稽核', permissions: [] }
    ])
    const staff = ref<AgentPortalStaff[]>([
      {
        id: 'U-A01',
        name: 'Ethan Lin',
        account: 'ethan@asia.example',
        roleId: 'ROLE-AGENT-ADMIN',
        scope: 'A00001 授權後代樹',
        status: 'Active',
        lastLogin: '2026-09-07 09:01'
      },
      {
        id: 'U-A02',
        name: 'Finance Team',
        account: 'finance@asia.example',
        roleId: 'ROLE-AGENT-FINANCE',
        scope: 'A00001 自身對帳',
        status: 'Active',
        lastLogin: '2026-09-06 18:22'
      }
    ])
    const currentStaffId = ref('U-A01')
    const requests = ref<AgentPortalRequest[]>([
      {
        id: 'REQ-REL-20260904-01',
        category: '關係',
        action: '新增下級',
        targetId: 'A00002',
        targetName: 'Pacific Link',
        reason: '既有核准示例：區域業務拓展',
        status: 'Approved',
        createdAt: '2026-09-04 17:05',
        effective: true
      }
    ])
    const notices = ref<AgentPortalNotice[]>([
      {
        id: 'NT-A01',
        type: '對帳',
        title: '2026-08 代理對帳單待確認',
        scope: 'A00001 財務角色',
        publishedAt: '2026-09-05 11:20',
        read: false
      },
      {
        id: 'NT-A02',
        type: '申請',
        title: '代理關係申請已受理',
        scope: 'A00001 管理員',
        publishedAt: '2026-09-04 17:05',
        read: true
      },
      {
        id: 'NT-A03',
        type: '平台公告',
        title: '九月平台維護時段公告',
        scope: 'A00001 組織',
        publishedAt: '2026-09-03 10:00',
        read: false
      }
    ])
    const logs = ref<AgentPortalLog[]>([
      {
        id: 'LOG-A01',
        time: '2026-09-07 09:05',
        actor: 'Ethan Lin',
        action: '查看代理報表',
        scope: 'A00001 授權樹',
        result: '成功'
      },
      {
        id: 'LOG-A02',
        time: '2026-09-06 16:20',
        actor: 'Finance Team',
        action: '下載代理報表',
        scope: 'A00001 原幣彙總',
        result: '成功'
      }
    ])

    const currentAgent = computed(() => businessStore.findAgent(CURRENT_AGENT_ID))
    const descendantAgents = computed(() => businessStore.getDescendants(CURRENT_AGENT_ID))
    const visibleAgents = computed(() =>
      [currentAgent.value, ...descendantAgents.value].filter(Boolean) as AgentRecord[]
    )
    const visibleAgentIds = computed(() => new Set(visibleAgents.value.map((agent) => agent.id)))
    const directChildren = computed(() => businessStore.getDirectChildren(CURRENT_AGENT_ID))
    const directMerchants = computed(() => businessStore.getDirectMerchants(CURRENT_AGENT_ID))
    const allMerchants = computed(() => businessStore.getAllMerchants(CURRENT_AGENT_ID))
    const indirectMerchants = computed(() =>
      allMerchants.value.filter((merchant) => merchant.agentId !== CURRENT_AGENT_ID)
    )
    const currentStaff = computed(() =>
      staff.value.find((member) => member.id === currentStaffId.value)
    )
    const currentPermissions = computed<AgentPermission[]>(() => {
      if (currentStaff.value?.status !== 'Active') return []
      return roles.value.find((role) => role.id === currentStaff.value?.roleId)?.permissions || []
    })
    const hasPermission = (permission: AgentPermission) =>
      currentPermissions.value.includes(permission)

    const metricRows = computed<AgentMetricRow[]>(() => {
      const merchantIds = new Set(allMerchants.value.map((merchant) => merchant.id))
      const masterRows = transactionStore.bets.filter(
        (row) => merchantIds.has(row.merchantId) && visibleAgentIds.value.has(row.agentId)
      )
      // Opaque keys support distinct counts without copying member identifiers into report output.
      const memberKeys = new Map<string, string>()
      return masterRows.map((row) => {
        const lineKey = JSON.stringify([row.merchantId, row.lineUid])
        const memberIdentity = JSON.stringify([lineKey, row.memberId])
        if (!memberKeys.has(memberIdentity)) memberKeys.set(memberIdentity, `member-${memberKeys.size}`)
        return {
          id: row.id,
          date: row.time.slice(0, 10),
          gameId: row.gameId,
          lineKey,
          memberKey: memberKeys.get(memberIdentity)!,
          roundKey: JSON.stringify([lineKey, row.gameId, row.roundId]),
          agentId: row.agentId,
          agentName: row.agentName,
          merchantId: row.merchantId,
          merchantName: row.merchantName,
          gameName: row.gameName,
          currency: row.currency,
          lines: 1,
          rounds: 1,
          activeMembers: 1,
          betAmount: row.betAmount,
          payoutAmount: row.payoutAmount,
          ggr: row.betAmount - row.payoutAmount
        }
      })
    })

    const currencySummaries = computed(() => groupAgentMetrics(metricRows.value, '幣別'))
    const visibleCurrencies = computed(() => {
      const currencies = new Set(metricRows.value.map((row) => row.currency))
      const termCurrency = businessStore.getCurrentTerm(CURRENT_AGENT_ID)?.settlementCurrency
      if (termCurrency) currencies.add(termCurrency)
      return [...currencies].filter((currency) => currency !== '未取得').sort()
    })
    const visibleRateHistory = computed(() =>
      financeSettingsStore.dailyRates.filter(
        (rate) =>
          rate.status === 'Locked' &&
          rate.fromCurrency === 'USDT' &&
          visibleCurrencies.value.includes(rate.toCurrency)
      )
    )
    const ownReconciliations = computed(() =>
      financeStore.agentReconciliations.filter((record) => record.agentId === CURRENT_AGENT_ID)
    )
    const ownStatements = computed(() =>
      financeStore.agentStatements.filter((record) => record.agentId === CURRENT_AGENT_ID)
    )
    const ownDifferences = computed(() =>
      financeStore.differences.filter(
        (record) => record.reconciliationType === 'Agent' && record.agentId === CURRENT_AGENT_ID
      )
    )
    const getReconciliationDifferences = (id: string) => {
      const record = ownReconciliations.value.find(item => item.id === id)
      if (!record) return []
      const included = new Set(record.includedMerchantReconciliationIds)
      return financeStore.differences.filter(item =>
        (item.reconciliationType === 'Agent' && item.reconciliationId === record.id && item.agentId === CURRENT_AGENT_ID) ||
        (item.reconciliationType === 'Merchant' && included.has(item.reconciliationId))
      ).map(item => ({ id: item.id, reconciliationId: item.reconciliationId,
        merchantName: item.merchantName || '本代理', description: item.description,
        status: item.status, resolution: item.resolution }))
    }
    const unreadCount = computed(() => notices.value.filter((notice) => !notice.read).length)

    const addLog = (action: string, scope: string, result = '成功') => {
      logs.value.unshift({
        id: requestId('LOG-A'),
        time: now(),
        actor: currentStaff.value?.name || '目前代理員工',
        action,
        scope,
        result
      })
    }

    const submitRelationRequest = (input: {
      action: '新增下級' | '停用代理' | '移轉代理'
      targetId?: string
      parentId?: string
      newParentId?: string
      name?: string
      reason: string
    }) => {
      if (!hasPermission('relations:manage')) return { ok: false, message: '目前角色沒有關係申請權限' }
      if (input.reason.trim().length < 6) return { ok: false, message: '申請原因至少需要 6 個字' }

      const parent = businessStore.findAgent(input.parentId || '')
      const target = businessStore.findAgent(input.targetId || '')
      const newParent = businessStore.findAgent(input.newParentId || '')
      if (input.action === '新增下級') {
        if (!parent || !visibleAgentIds.value.has(parent.id))
          return { ok: false, message: '上級代理不存在或超出授權範圍' }
        if (levelNumber(parent) >= 3) return { ok: false, message: 'L3 不能再新增下級' }
        if (!input.name?.trim()) return { ok: false, message: '請填寫新代理名稱' }
      }
      if (input.action === '停用代理') {
        if (!target || target.id === CURRENT_AGENT_ID || !visibleAgentIds.value.has(target.id))
          return { ok: false, message: '只能申請停用授權範圍內的下級代理' }
      }
      if (input.action === '移轉代理') {
        if (
          !target ||
          target.id === CURRENT_AGENT_ID ||
          !newParent ||
          !visibleAgentIds.value.has(target.id) ||
          !visibleAgentIds.value.has(newParent.id)
        ) {
          return { ok: false, message: '移轉對象或新上級不在授權範圍' }
        }
        const subtree = businessStore.getDescendants(target.id)
        if (target.id === newParent.id || subtree.some((agent) => agent.id === newParent.id))
          return { ok: false, message: '新上級位於移轉子樹內，會形成循環' }
        const relativeDepth = Math.max(
          0,
          ...subtree.map((agent) => levelNumber(agent) - levelNumber(target))
        )
        if (levelNumber(newParent) + 1 + relativeDepth > 3)
          return { ok: false, message: '移轉後子樹會超過全域 L3' }
      }

      const targetName =
        input.action === '新增下級'
          ? input.name!.trim()
          : target?.name || input.targetId || '未指定'
      const request: AgentPortalRequest = {
        id: requestId('REQ-REL'),
        category: '關係',
        action: input.action,
        targetId: target?.id || 'NEW',
        targetName,
        reason: input.reason.trim(),
        status: 'Pending',
        createdAt: now(),
        effective: false,
        extra: {
          parentId: input.parentId || '',
          newParentId: input.newParentId || ''
        }
      }
      requests.value.unshift(request)
      addLog(`建立${input.action}申請`, 'A00001 授權後代樹', '待審核')
      return { ok: true, message: '申請已建立，核准前不會更動有效關係', id: request.id }
    }

    const submitMerchantApplication = (input: {
      code: string
      name: string
      currency: string
      reason: string
    }) => {
      if (!hasPermission('merchants:apply')) return { ok: false, message: '目前角色沒有商戶申請權限' }
      if (!input.code.trim() || !input.name.trim() || !input.currency)
        return { ok: false, message: '請填寫商戶代碼、名稱與幣別' }
      if (input.reason.trim().length < 6) return { ok: false, message: '申請原因至少需要 6 個字' }
      const request: AgentPortalRequest = {
        id: requestId('REQ-MER'),
        category: '商戶',
        action: '新增直屬商戶',
        targetId: input.code.trim().toUpperCase(),
        targetName: input.name.trim(),
        reason: input.reason.trim(),
        status: 'Pending',
        createdAt: now(),
        effective: false,
        extra: { currency: input.currency, directAgentId: CURRENT_AGENT_ID }
      }
      requests.value.unshift(request)
      addLog('建立直屬商戶申請', 'A00001 自身', '待審核')
      return { ok: true, message: '申請已建立，核准前不會出現在有效商戶清單', id: request.id }
    }

    const submitTermRequest = (input: {
      targetId: string
      basis: string
      percent: number
      effectiveFrom: string
      reason: string
    }) => {
      if (!hasPermission('terms:apply')) return { ok: false, message: '目前角色沒有條件申請權限' }
      const allowedTargets = new Set([CURRENT_AGENT_ID, ...directMerchants.value.map((item) => item.id)])
      if (!allowedTargets.has(input.targetId)) return { ok: false, message: '只能申請自己的條件或直屬商戶條件' }
      if (!input.basis || !Number.isFinite(input.percent) || !input.effectiveFrom)
        return { ok: false, message: '請填寫完整條件資料' }
      if (input.reason.trim().length < 6) return { ok: false, message: '申請原因至少需要 6 個字' }
      const target =
        input.targetId === CURRENT_AGENT_ID
          ? currentAgent.value
          : directMerchants.value.find((item) => item.id === input.targetId)
      const request: AgentPortalRequest = {
        id: requestId('REQ-TERM'),
        category: '條件',
        action: '建立條件提案版本',
        targetId: input.targetId,
        targetName: target?.name || input.targetId,
        reason: input.reason.trim(),
        status: 'Pending',
        createdAt: now(),
        effective: false,
        extra: {
          basis: input.basis,
          percent: input.percent,
          effectiveFrom: input.effectiveFrom
        }
      }
      requests.value.unshift(request)
      addLog('建立商務條件提案', target?.name || input.targetId, '待審核')
      return { ok: true, message: '提案版本已建立，未核准前不影響報表或結算', id: request.id }
    }

    const submitDifferenceRequest = (input: {
      reconciliationId: string
      reference: string
      amount: number
      currency: string
      reason: string
    }) => {
      if (!hasPermission('finance:confirm')) return { ok: false, message: '目前角色沒有財務操作權限' }
      const record = ownReconciliations.value.find((item) => item.id === input.reconciliationId)
      if (!record || record.lockedAt || !['Pending Confirmation', 'Difference'].includes(record.status)) return { ok: false, message: '單據目前不可回報差異' }
      if (input.currency !== record.currency) return { ok: false, message: '差異幣別必須與單據一致' }
      if (!input.reference.trim() || !Number.isFinite(input.amount) || !input.currency)
        return { ok: false, message: '請填寫關聯參照、金額與幣別' }
      if (input.reason.trim().length < 6) return { ok: false, message: '差異原因至少需要 6 個字' }
      const request: AgentPortalRequest = {
        id: requestId('REQ-DIF'),
        category: '差異',
        action: '回報對帳差異',
        targetId: record.id,
        targetName: record.period,
        reason: input.reason.trim(),
        status: 'Pending',
        createdAt: now(),
        effective: false,
        extra: { reference: input.reference.trim(), amount: input.amount, currency: input.currency }
      }
      requests.value.unshift(request)
      addLog('回報對帳差異', record.id, '待處理')
      return { ok: true, message: '差異已送出；處理完成前不能確認該對帳單', id: request.id }
    }

    const hasPendingDifference = (reconciliationId: string) =>
      requests.value.some(
        (request) =>
          request.category === '差異' &&
          request.targetId === reconciliationId &&
          request.status === 'Pending'
      )

    const canConfirmReconciliation = (record: AgentReconciliationRecord) =>
      hasPermission('finance:confirm') &&
      record.agentId === CURRENT_AGENT_ID &&
      record.status === 'Pending Confirmation' &&
      !record.lockedAt &&
      record.unresolvedDifferenceCount === 0 &&
      !hasPendingDifference(record.id) &&
      Boolean(record.snapshot.formulaVersion) &&
      record.includedMerchantReconciliationIds.every(id => financeStore.merchantReconciliations.some(item => item.id === id && ['Confirmed', 'Locked'].includes(item.status))) &&
      record.snapshot.exchangeRateSnapshotIds.length > 0

    const confirmOwnReconciliation = (recordId: string, actualAmount: number, note: string) => {
      const record = ownReconciliations.value.find((item) => item.id === recordId)
      if (!record || !canConfirmReconciliation(record))
        return { ok: false, message: '此單據目前不符合確認條件' }
      const ok = financeStore.confirmAgent(record.id, actualAmount, note)
      if (!ok) return { ok: false, message: '旗下商戶尚未全部確認，無法確認本代理對帳' }
      addLog('確認自身代理對帳', record.id)
      return { ok: true, message: '此版本已確認；尚未鎖定，也不表示已付款' }
    }

    const markNoticeRead = (id: string) => {
      const notice = notices.value.find((item) => item.id === id)
      if (!notice || notice.read) return false
      notice.read = true
      addLog('標記公告已讀', id)
      return true
    }

    const inviteStaff = (input: { name: string; account: string; roleId: string }) => {
      if (!hasPermission('staff:manage')) return { ok: false, message: '目前角色沒有員工管理權限' }
      if (!input.name.trim() || !input.account.includes('@') || !roles.value.some((role) => role.id === input.roleId))
        return { ok: false, message: '請填寫有效姓名、電子郵件與角色' }
      if (staff.value.some(member => member.account.toLowerCase() === input.account.trim().toLowerCase()))
        return { ok: false, message: '此帳號已存在' }
      const member: AgentPortalStaff = {
        id: requestId('U-A'),
        name: input.name.trim(),
        account: input.account.trim(),
        roleId: input.roleId,
        scope: 'A00001 組織',
        status: 'Pending'
      }
      staff.value.unshift(member)
      addLog('邀請本代理員工', member.account, '待接受')
      return { ok: true, message: '邀請已建立，僅適用本代理組織' }
    }

    const updateStaffRole = (staffId: string, roleId: string) => {
      if (!hasPermission('staff:manage')) return false
      const member = staff.value.find((item) => item.id === staffId)
      if (!member || member.id === currentStaffId.value || !roles.value.some((role) => role.id === roleId)) return false
      member.roleId = roleId
      addLog('更新員工角色', `${member.account}／A00001 組織`)
      return true
    }

    const toggleStaffStatus = (staffId: string) => {
      if (!hasPermission('staff:manage')) return false
      const member = staff.value.find((item) => item.id === staffId)
      if (!member || member.status === 'Pending' || member.id === currentStaffId.value) return false
      member.status = member.status === 'Inactive' ? 'Active' : 'Inactive'
      addLog(member.status === 'Inactive' ? '停用員工' : '啟用員工', member.account)
      return true
    }

    return {
      roles,
      staff,
      currentStaffId,
      requests,
      notices,
      logs,
      currentAgent,
      descendantAgents,
      visibleAgents,
      visibleAgentIds,
      directChildren,
      directMerchants,
      indirectMerchants,
      allMerchants,
      currentStaff,
      currentPermissions,
      metricRows,
      currencySummaries,
      visibleCurrencies,
      visibleRateHistory,
      ownReconciliations,
      ownStatements,
      ownDifferences,
      getReconciliationDifferences,
      unreadCount,
      hasPermission,
      submitRelationRequest,
      submitMerchantApplication,
      submitTermRequest,
      submitDifferenceRequest,
      hasPendingDifference,
      canConfirmReconciliation,
      confirmOwnReconciliation,
      markNoticeRead,
      inviteStaff,
      updateStaffRole,
      toggleStaffStatus,
      addLog,
      getComparableSpread
    }
  },
  {
    persist: {
      key: 'agent-portal-stage2',
      storage: localStorage,
      pick: ['staff', 'currentStaffId', 'requests', 'notices', 'logs']
    }
  }
)
