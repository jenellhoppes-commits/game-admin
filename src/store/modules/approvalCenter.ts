import { useFinanceSettingsStore } from './financeSettings'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useBusinessPartnerStore } from './businessPartner'
import { useGameCatalogStore } from './gameCatalog'
import { useJackpotCenterStore } from './jackpotCenter'
import { useRiskCenterStore } from './riskCenter'
import type {
  ApprovalActionLog,
  ApprovalRecord,
  ApprovalSourceType,
  ApprovalStatus
} from '@/types/game-provider'

const formatNow = () => {
  const now = new Date()
  const part = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
}

export const useApprovalCenterStore = defineStore(
  'approvalCenterStore',
  () => {
    const riskStore = useRiskCenterStore()
    const businessStore = useBusinessPartnerStore()
    const gameStore = useGameCatalogStore()
    const jackpotStore = useJackpotCenterStore()
    const financeSettings = useFinanceSettingsStore()
    const sourceTypes: ApprovalSourceType[] = ['Risk Rule', 'Agent', 'Merchant', 'Game', 'Jackpot']

    const sourceInfo = (sourceType: ApprovalSourceType, index: number) => {
      if (sourceType === 'Risk Rule') {
        const item = riskStore.rules[index % riskStore.rules.length]
        return {
          id: item.id,
          name: item.name,
          action: '啟用風控規則',
          summary: `啟用「${item.name}」並依 ${item.metric} ${item.operator} ${item.threshold} 建立告警。`,
          changes: [
            { field: '規則狀態', before: '草稿', after: '啟用' },
            { field: '作用範圍', before: '未生效', after: item.scope },
            {
              field: '觸發門檻',
              before: '未生效',
              after: `${item.operator} ${item.threshold}`,
              sensitive: true
            }
          ]
        }
      }
      if (sourceType === 'Agent') {
        const item = businessStore.agents[index % businessStore.agents.length]
        return {
          id: item.id,
          name: item.name,
          action: '啟用代理',
          summary: `審核代理 ${item.code} 的基本資料、層級與商務關係。`,
          changes: [
            { field: '代理狀態', before: '待審核', after: '啟用' },
            { field: '代理層級', before: '未生效', after: item.level },
            { field: '結算幣別', before: '未生效', after: item.currency, sensitive: true }
          ]
        }
      }
      if (sourceType === 'Merchant') {
        const item = businessStore.merchants[index % businessStore.merchants.length]
        return {
          id: item.id,
          name: item.name,
          action: '啟用商戶',
          summary: `審核商戶 ${item.code} 的代理歸屬、錢包模式與初始線路。`,
          changes: [
            { field: '商戶狀態', before: '待審核', after: '啟用' },
            { field: '所屬代理', before: '未生效', after: item.agentName },
            { field: '錢包模式', before: '未生效', after: item.walletMode, sensitive: true }
          ]
        }
      }
      if (sourceType === 'Game') {
        const item = gameStore.games[index % gameStore.games.length]
        return {
          id: item.id,
          name: item.displayName,
          action: '發布遊戲',
          summary: `審核遊戲 ${item.code} 的主檔、RTP、限紅與結果重播能力。`,
          changes: [
            { field: '遊戲狀態', before: '草稿', after: '啟用' },
            {
              field: 'RTP 設定',
              before: '尚未發布',
              after: item.defaultRtp ? `${item.defaultRtp}%` : '依預設方案',
              sensitive: true
            },
            {
              field: '結果重播',
              before: '尚未發布',
              after: item.supportsResultReplay ? '支援' : '不支援'
            }
          ]
        }
      }
      const item = jackpotStore.pools[index % jackpotStore.pools.length]
      return {
        id: item.id,
        name: item.nameZh,
        action: '啟用獎池',
        summary: `審核獎池 ${item.code} 的幣別、級別、綁定遊戲與商戶線路。`,
        changes: [
          { field: '獎池狀態', before: '待審核', after: '啟用' },
          { field: '交易幣別', before: '未生效', after: item.baseCurrency, sensitive: true },
          {
            field: '目前水位',
            before: '未生效',
            after: `${item.currentBalance.toLocaleString()} ${item.baseCurrency}`,
            sensitive: true
          }
        ]
      }
    }

    const approvals = ref<ApprovalRecord[]>(
      Array.from({ length: 20 }, (_, index) => {
        const sourceType = sourceTypes[index % sourceTypes.length]
        const source = sourceInfo(sourceType, index)
        const status: ApprovalStatus = index < 8 ? 'Pending' : index < 15 ? 'Approved' : 'Rejected'
        const day = String((index % 3) + 1).padStart(2, '0')
        const requestedHour = 18 - (index % 9)
        const requestedMinute = (index * 7) % 60
        const reviewedMinutes = requestedHour * 60 + requestedMinute + 35
        const reviewedHour = Math.floor(reviewedMinutes / 60)
        const reviewedMinute = reviewedMinutes % 60
        return {
          id: `AP${String(index + 1).padStart(6, '0')}`,
          title: `${source.action}｜${source.name}`,
          sourceType,
          sourceId: source.id,
          sourceName: source.name,
          action: source.action,
          summary: source.summary,
          priority: index % 7 === 0 ? 'Urgent' : index % 3 === 0 ? 'High' : 'Normal',
          status,
          requester:
            sourceType === 'Risk Rule'
              ? 'Risk Admin'
              : sourceType === 'Jackpot'
                ? 'Jackpot Admin'
                : 'Operations Admin',
          requestedAt: `2026-09-${day} ${String(requestedHour).padStart(2, '0')}:${String(requestedMinute).padStart(2, '0')}`,
          dueAt: `2026-09-${index % 4 === 0 ? '03' : '05'} 18:00`,
          reviewer:
            status === 'Pending'
              ? undefined
              : index % 2
                ? 'Approval Manager B'
                : 'Approval Manager A',
          reviewedAt:
            status === 'Pending'
              ? undefined
              : `2026-09-${day} ${String(reviewedHour).padStart(2, '0')}:${String(reviewedMinute).padStart(2, '0')}`,
          reviewReason:
            status === 'Approved'
              ? '資料與設定符合目前營運規範。'
              : status === 'Rejected'
                ? '設定內容不完整，請補充作用範圍及異動原因後重新送審。'
                : undefined,
          changes: source.changes
        }
      })
    )

    const logs = ref<ApprovalActionLog[]>(
      approvals.value.flatMap((item, index) => {
        const rows: ApprovalActionLog[] = [
          {
            id: `APLOG-${String(index * 2 + 1).padStart(6, '0')}`,
            approvalId: item.id,
            action: '送出審核',
            before: 'Draft',
            after: 'Pending',
            reason: item.summary,
            operator: item.requester,
            time: item.requestedAt
          }
        ]
        if (item.status !== 'Pending') {
          rows.push({
            id: `APLOG-${String(index * 2 + 2).padStart(6, '0')}`,
            approvalId: item.id,
            action: item.status === 'Approved' ? '核准' : '駁回',
            before: 'Pending',
            after: item.status,
            reason: item.reviewReason || '',
            operator: item.reviewer || 'Approval Manager',
            time: item.reviewedAt || item.requestedAt
          })
        }
        return rows
      })
    )

    const findApproval = (id: string) => approvals.value.find((item) => item.id === id)
    const getApprovalLogs = (id: string) => logs.value.filter((item) => item.approvalId === id)
    const pendingItems = computed(() => approvals.value.filter((item) => item.status === 'Pending'))
    const approvedItems = computed(() =>
      approvals.value.filter((item) => item.status === 'Approved')
    )
    const rejectedItems = computed(() =>
      approvals.value.filter((item) => item.status === 'Rejected')
    )
    const overdueItems = computed(() =>
      pendingItems.value.filter(
        (item) => new Date(item.dueAt.replace(' ', 'T')).getTime() < Date.now()
      )
    )

    const addLog = (item: ApprovalRecord, action: string, before: string, reason: string) => {
      logs.value.unshift({
        id: `APLOG-${Date.now()}`,
        approvalId: item.id,
        action,
        before,
        after: item.status,
        reason,
        operator: 'Super Admin',
        time: item.reviewedAt || formatNow()
      })
    }

    const applySourceStatus = (item: ApprovalRecord, approved: boolean, reason: string) => {
      if (item.sourceType === 'Risk Rule')
        riskStore.changeRuleStatus(item.sourceId, approved ? 'Active' : 'Draft')
      if (item.sourceType === 'Agent')
        businessStore.changeStatus(item.sourceId, approved ? 'Active' : 'Draft', reason)
      if (item.sourceType === 'Merchant')
        businessStore.changeMerchantStatus(item.sourceId, approved ? 'Active' : 'Draft', reason)
      if (item.sourceType === 'Game')
        gameStore.updateGame(item.sourceId, { status: approved ? 'Active' : 'Draft' }, reason)
      if (item.sourceType === 'Jackpot')
        jackpotStore.updateStatus(item.sourceId, approved ? 'Active' : 'Draft', reason)
    }

    const submitCurrencyLine = (merchantId: string, currency: string, reason: string) => {
      const merchant = businessStore.findMerchant(merchantId)
      if (!merchant || !['Active', 'Testing'].includes(merchant.status))
        return { ok: false, message: '商戶狀態不可申請線路' }
      if (
        !financeSettings.currencies.some(
          (c) => c.code === currency && c.status === 'Active' && c.transactionEnabled
        )
      )
        return { ok: false, message: '請選擇總後台開放的幣別' }
      if (!reason.trim()) return { ok: false, message: '請填寫申請原因' }
      if (merchant.lines.some((l) => l.currency === currency && l.status !== 'Closed'))
        return { ok: false, message: '此幣別已有線路' }
      if (
        approvals.value.some(
          (a) => a.sourceId === merchantId && a.lineCurrency === currency && a.status === 'Pending'
        )
      )
        return { ok: false, message: '此幣別已有待審申請' }
      const item: ApprovalRecord = {
        id: 'AP-LINE-' + crypto.randomUUID(),
        sourceType: 'Merchant',
        sourceId: merchantId,
        sourceName: merchant.name,
        title: merchant.name + '｜申請 ' + currency + ' 幣別線路',
        action: '新增幣別線路',
        lineCurrency: currency,
        summary: reason.trim(),
        priority: 'Normal',
        status: 'Pending',
        requester: merchant.code,
        requestedAt: formatNow(),
        dueAt: formatNow(),
        changes: [{ field: '交易幣別', before: '未建立', after: currency }]
      }
      approvals.value.unshift(item)
      addLog(item, '送出審核', 'Draft', reason.trim())
      logs.value[0].operator = merchant.code
      return { ok: true, message: '幣別線路申請已送出', id: item.id }
    }
    const review = (id: string, approved: boolean, reason: string) => {
      const item = findApproval(id)
      if (!item || item.status !== 'Pending' || reason.trim().length < 4) return false
      if (item.lineCurrency && approved) {
        const merchant = businessStore.findMerchant(item.sourceId)
        if (
          !merchant ||
          !['Active', 'Testing'].includes(merchant.status) ||
          !financeSettings.currencies.some(
            (c) => c.code === item.lineCurrency && c.status === 'Active' && c.transactionEnabled
          ) ||
          merchant.lines.some(
            (line) => line.currency === item.lineCurrency && line.status !== 'Closed'
          )
        )
          return false
        const line = businessStore.addMerchantLine(item.sourceId, {
          currency: item.lineCurrency,
          createSandbox: false
        })
        if (!line) return false
        item.createdLineUid = line.uid
      }
      const before = item.status
      item.status = approved ? 'Approved' : 'Rejected'
      item.reviewer = 'Super Admin'
      item.reviewedAt = formatNow()
      item.reviewReason = reason.trim()
      if (!item.lineCurrency) applySourceStatus(item, approved, reason.trim())
      addLog(item, approved ? '核准' : '駁回', before, reason.trim())
      return true
    }

    const batchApprove = (ids: string[], reason: string) =>
      ids.filter((id) => review(id, true, reason)).length

    return {
      approvals,
      logs,
      pendingItems,
      approvedItems,
      rejectedItems,
      overdueItems,
      findApproval,
      getApprovalLogs,
      submitCurrencyLine,
      review,
      batchApprove
    }
  },
  { persist: { key: 'approval-center-v1', pick: ['approvals', 'logs'] } }
)
