import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApprovalCenterStore } from './approvalCenter'
import { useFinanceCenterStore } from './financeCenter'
import { useFinanceSettingsStore } from './financeSettings'
import { usePlatformAccessStore } from './platformAccess'
import { useRiskCenterStore } from './riskCenter'
import type {
  PlatformNotificationEventType,
  PlatformNotificationLogRecord,
  PlatformNotificationRuleRecord
} from '@/types/game-provider'

const formatNow = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)

const ruleSeeds: Array<
  Omit<PlatformNotificationRuleRecord, 'id' | 'lastTriggeredAt' | 'triggerCount' | 'updatedAt'>
> = [
  {
    name: '重大風控告警',
    eventType: 'Risk Alert',
    severity: 'Critical',
    roleIds: ['ROLE-004', 'ROLE-001'],
    channels: ['In-App', 'Email', 'Webhook'],
    aggregationMinutes: 0,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    template: '【{{severity}}】{{title}}，請於 {{dueAt}} 前處理。',
    enabled: true
  },
  {
    name: '一般風控告警彙整',
    eventType: 'Risk Alert',
    severity: 'Warning',
    roleIds: ['ROLE-004'],
    channels: ['In-App', 'Email'],
    aggregationMinutes: 15,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    template: '{{count}} 筆風控告警等待處理。',
    enabled: true
  },
  {
    name: '審核待辦通知',
    eventType: 'Approval Pending',
    severity: 'Warning',
    roleIds: ['ROLE-001', 'ROLE-002'],
    channels: ['In-App', 'Email'],
    aggregationMinutes: 10,
    quietHoursEnabled: true,
    quietHoursStart: '23:00',
    quietHoursEnd: '08:00',
    template: '審核申請 {{sourceId}} 已等待 {{waitingTime}}。',
    enabled: true
  },
  {
    name: '匯率波動預警',
    eventType: 'Exchange Rate Alert',
    severity: 'Critical',
    roleIds: ['ROLE-003', 'ROLE-001'],
    channels: ['In-App', 'Email'],
    aggregationMinutes: 0,
    quietHoursEnabled: false,
    quietHoursStart: '00:00',
    quietHoursEnd: '00:00',
    template: '{{currencyPair}} 波動 {{changePercent}}%，請確認匯率。',
    enabled: true
  },
  {
    name: '結算批次狀態',
    eventType: 'Settlement Status',
    severity: 'Info',
    roleIds: ['ROLE-003'],
    channels: ['In-App', 'Email'],
    aggregationMinutes: 0,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    template: '結算批次 {{batchId}} 狀態已更新為 {{status}}。',
    enabled: true
  },
  {
    name: '後台帳號安全',
    eventType: 'Account Security',
    severity: 'Critical',
    roleIds: ['ROLE-001'],
    channels: ['In-App', 'Email'],
    aggregationMinutes: 0,
    quietHoursEnabled: false,
    quietHoursStart: '00:00',
    quietHoursEnd: '00:00',
    template: '帳號 {{account}} 發生安全事件：{{event}}。',
    enabled: true
  },
  {
    name: '系統異常通知',
    eventType: 'System Error',
    severity: 'Critical',
    roleIds: ['ROLE-001'],
    channels: ['In-App', 'Webhook'],
    aggregationMinutes: 5,
    quietHoursEnabled: false,
    quietHoursStart: '00:00',
    quietHoursEnd: '00:00',
    template: '{{service}} 發生 {{errorCode}}，請立即確認。',
    enabled: true
  },
  {
    name: '低風險審核每日摘要',
    eventType: 'Approval Pending',
    severity: 'Info',
    roleIds: ['ROLE-002'],
    channels: ['In-App'],
    aggregationMinutes: 1440,
    quietHoursEnabled: true,
    quietHoursStart: '20:00',
    quietHoursEnd: '09:00',
    template: '今日共有 {{count}} 筆一般審核待辦。',
    enabled: false
  }
]

export const usePlatformNotificationStore = defineStore('platformNotificationStore', () => {
  const riskStore = useRiskCenterStore()
  const approvalStore = useApprovalCenterStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const financeStore = useFinanceCenterStore()
  const accessStore = usePlatformAccessStore()

  const rules = ref<PlatformNotificationRuleRecord[]>(
    ruleSeeds.map((item, index) => ({
      ...item,
      id: `NOTR-${String(index + 1).padStart(3, '0')}`,
      lastTriggeredAt:
        index < 7 ? `2026-09-04 ${String(8 + index).padStart(2, '0')}:20` : undefined,
      triggerCount: index < 7 ? 12 + index * 7 : 0,
      updatedAt: '2026-09-03 16:30'
    }))
  )

  const eventSources: Array<{
    type: PlatformNotificationEventType
    id: string
    title: string
    summary: string
  }> = [
    ...riskStore.alerts.slice(0, 8).map((item) => ({
      type: 'Risk Alert' as const,
      id: item.id,
      title: item.title,
      summary: `${item.severity}｜${item.category}｜${item.status}`
    })),
    ...approvalStore.pendingItems.slice(0, 5).map((item) => ({
      type: 'Approval Pending' as const,
      id: item.id,
      title: `${item.action}待審核`,
      summary: `${item.sourceName}｜${item.requester}`
    })),
    ...financeSettingsStore.alerts
      .filter((item) => item.status !== 'Normal')
      .map((item) => ({
        type: 'Exchange Rate Alert' as const,
        id: item.id,
        title: `${item.currencyPair} 匯率波動`,
        summary: `變動 ${item.currentChangePercent}%｜門檻 ${item.thresholdPercent}%`
      })),
    ...financeStore.settlementBatches.slice(0, 3).map((item) => ({
      type: 'Settlement Status' as const,
      id: item.id,
      title: `${item.name}狀態更新`,
      summary: `${item.status}｜${item.settlementCurrency}`
    })),
    ...accessStore.accounts
      .filter((item) => item.status === 'Locked' || item.failedLoginCount > 0)
      .map((item) => ({
        type: 'Account Security' as const,
        id: item.id,
        title: `${item.displayName} 帳號安全事件`,
        summary: `${item.status}｜登入失敗 ${item.failedLoginCount} 次`
      })),
    {
      type: 'System Error' as const,
      id: 'ERR-20260904-001',
      title: 'Wallet Callback Service 延遲',
      summary: '回應時間超過 5 秒，已切換備援節點'
    },
    {
      type: 'System Error' as const,
      id: 'ERR-20260903-004',
      title: 'Replay Asset Service 素材缺失',
      summary: '3 筆歷史注單降級為靜態結果'
    }
  ]

  const logs = ref<PlatformNotificationLogRecord[]>(
    Array.from({ length: 28 }, (_, index) => {
      const source = eventSources[index % eventSources.length]
      const rule = rules.value.find((item) => item.eventType === source.type) || rules.value[0]
      const failed = index === 3 || index === 17
      const partial = index === 8 || index === 22
      const suppressed = index === 12
      const status = failed ? 'Failed' : partial ? 'Partial' : suppressed ? 'Suppressed' : 'Sent'
      const channels = [...rule.channels]
      return {
        id: `NOTL-202609-${String(index + 1).padStart(4, '0')}`,
        ruleId: rule.id,
        eventType: source.type,
        eventSourceId: source.id,
        subject: source.title,
        summary: source.summary,
        recipients: rule.roleIds.map(
          (roleId) => accessStore.roles.find((item) => item.id === roleId)?.name || roleId
        ),
        channels,
        channelResults: channels.map((channel, channelIndex) => ({
          channel,
          status: suppressed
            ? 'Suppressed'
            : failed || (partial && channelIndex === channels.length - 1)
              ? 'Failed'
              : 'Sent',
          message:
            failed || (partial && channelIndex === channels.length - 1)
              ? '連線逾時'
              : suppressed
                ? '靜默時段延後發送'
                : '發送成功'
        })),
        status,
        attempts: failed ? 3 : partial ? 2 : 1,
        triggeredAt: `2026-09-${String(4 - (index % 3)).padStart(2, '0')} ${String(18 - (index % 10)).padStart(2, '0')}:${index % 2 ? '35' : '10'}`,
        sentAt:
          status === 'Sent' || status === 'Partial'
            ? `2026-09-${String(4 - (index % 3)).padStart(2, '0')} ${String(18 - (index % 10)).padStart(2, '0')}:${index % 2 ? '36' : '11'}`
            : undefined,
        errorMessage: failed
          ? 'Webhook 與 Email 服務連線逾時，已達自動重試上限。'
          : partial
            ? '部分通知管道發送失敗。'
            : undefined
      } as PlatformNotificationLogRecord
    })
  )

  const enabledRules = computed(() => rules.value.filter((item) => item.enabled))
  const failedLogs = computed(() =>
    logs.value.filter((item) => item.status === 'Failed' || item.status === 'Partial')
  )

  const saveRule = (
    payload: Partial<PlatformNotificationRuleRecord> &
      Pick<
        PlatformNotificationRuleRecord,
        'name' | 'eventType' | 'severity' | 'roleIds' | 'channels' | 'template'
      >
  ) => {
    if (payload.id) {
      const item = rules.value.find((row) => row.id === payload.id)
      if (!item) return false
      Object.assign(item, payload, { updatedAt: formatNow() })
      return item.id
    }
    const id = `NOTR-${String(rules.value.length + 1).padStart(3, '0')}`
    rules.value.unshift({
      id,
      name: payload.name,
      eventType: payload.eventType,
      severity: payload.severity,
      roleIds: payload.roleIds,
      channels: payload.channels,
      template: payload.template,
      aggregationMinutes: payload.aggregationMinutes || 0,
      quietHoursEnabled: payload.quietHoursEnabled || false,
      quietHoursStart: payload.quietHoursStart || '22:00',
      quietHoursEnd: payload.quietHoursEnd || '08:00',
      enabled: payload.enabled ?? true,
      triggerCount: 0,
      updatedAt: formatNow()
    })
    return id
  }

  const toggleRule = (id: string, enabled: boolean) => {
    const item = rules.value.find((row) => row.id === id)
    if (!item) return false
    item.enabled = enabled
    item.updatedAt = formatNow()
    return true
  }

  const sendTest = (id: string) => {
    const rule = rules.value.find((item) => item.id === id)
    if (!rule) return false
    logs.value.unshift({
      id: `NOTL-TEST-${String(logs.value.length + 1).padStart(4, '0')}`,
      ruleId: rule.id,
      eventType: rule.eventType,
      eventSourceId: 'TEST-EVENT',
      subject: `[測試] ${rule.name}`,
      summary: '由通知規則頁手動發送的測試通知',
      recipients: rule.roleIds.map(
        (roleId) => accessStore.roles.find((item) => item.id === roleId)?.name || roleId
      ),
      channels: [...rule.channels],
      channelResults: rule.channels.map((channel) => ({
        channel,
        status: 'Sent',
        message: '測試通知發送成功'
      })),
      status: 'Sent',
      attempts: 1,
      triggeredAt: formatNow(),
      sentAt: formatNow()
    })
    return true
  }

  const retryNotification = (id: string) => {
    const item = logs.value.find((row) => row.id === id)
    if (!item || !['Failed', 'Partial'].includes(item.status)) return false
    item.attempts += 1
    item.status = 'Sent'
    item.sentAt = formatNow()
    item.errorMessage = undefined
    item.channelResults = item.channels.map((channel) => ({
      channel,
      status: 'Sent',
      message: '人工重送成功'
    }))
    return true
  }

  return {
    rules,
    logs,
    enabledRules,
    failedLogs,
    saveRule,
    toggleRule,
    sendTest,
    retryNotification
  }
})
