import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  PlatformBasicSettingsRecord,
  PlatformLoginLogRecord,
  PlatformLoginSecuritySettings,
  PlatformSystemErrorRecord,
  PlatformSystemSettingLog
} from '@/types/game-provider'

const formatNow = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)

export const usePlatformSystemStore = defineStore('platformSystemStore', () => {
  const basicSettings = ref<PlatformBasicSettingsRecord>({
    platformName: 'Game Provider Back Office',
    platformCode: 'GPBO',
    environmentLabel: '正式環境',
    supportEmail: 'support@gameprovider.local',
    defaultLanguage: 'zh-TW',
    defaultTimezone: 'Asia/Taipei',
    dateFormat: 'YYYY/MM/DD HH:mm:ss',
    maintenanceMode: false,
    maintenanceMessage: '系統維護中，請稍後再試。',
    recordRetentionDays: 365,
    updatedAt: '2026-09-03 16:30',
    updatedBy: 'Super Admin'
  })

  const loginSecurity = ref<PlatformLoginSecuritySettings>({
    minimumPasswordLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialCharacter: true,
    passwordExpiryDays: 90,
    passwordHistoryCount: 5,
    maximumFailedAttempts: 5,
    lockoutMinutes: 30,
    sessionTimeoutMinutes: 30,
    maximumConcurrentSessions: 2,
    forceMfaForSensitiveRoles: true,
    loginAlertEnabled: true,
    ipAllowlistEnabled: false,
    ipAllowlist: ['10.20.0.0/16', '203.0.113.10/32'],
    updatedAt: '2026-09-03 16:40',
    updatedBy: 'Super Admin'
  })

  const loginNames = [
    'Super Admin',
    'Finance Amy',
    'Operations One',
    'Risk Leo',
    'CS Taiwan',
    'Unknown',
    'Platform Owner',
    'Settlement Ops',
    'Risk Nina',
    'Unknown'
  ]
  const loginResults: PlatformLoginLogRecord['result'][] = [
    'Success',
    'Success',
    'Success',
    'MFA Failed',
    'Success',
    'Failed',
    'Logged Out',
    'Session Expired',
    'Locked',
    'Failed'
  ]
  const loginLogs = ref<PlatformLoginLogRecord[]>(
    Array.from({ length: 42 }, (_, index) => {
      const displayName = loginNames[index % loginNames.length]
      const result = loginResults[index % loginResults.length]
      const known = displayName !== 'Unknown'
      return {
        id: `LOGIN-202609-${String(index + 1).padStart(5, '0')}`,
        accountId: known ? `ADM-${String((index % 12) + 1).padStart(5, '0')}` : undefined,
        username: known ? displayName.toLowerCase().replaceAll(' ', '.') : `unknown-${index}`,
        displayName: known ? displayName : undefined,
        result,
        ipAddress: known ? `10.20.${index % 6}.${20 + index}` : `198.51.100.${40 + index}`,
        location: known ? ['臺北', '馬尼拉', '曼谷', '新加坡'][index % 4] : '未知地區',
        device:
          index % 3 === 0
            ? 'Windows / Chrome'
            : index % 3 === 1
              ? 'macOS / Safari'
              : 'Windows / Edge',
        userAgent:
          index % 3 === 0
            ? 'Chrome 140 · Windows 11'
            : index % 3 === 1
              ? 'Safari 19 · macOS'
              : 'Edge 140 · Windows 11',
        reason:
          result === 'Success'
            ? '帳號、密碼與 MFA 驗證成功'
            : result === 'Failed'
              ? '帳號或密碼錯誤'
              : result === 'MFA Failed'
                ? '動態驗證碼錯誤'
                : result === 'Locked'
                  ? '登入失敗次數超過上限'
                  : result === 'Logged Out'
                    ? '使用者主動登出'
                    : '閒置時間超過限制',
        occurredAt: `2026-09-${String(4 - (index % 4)).padStart(2, '0')} ${String(23 - (index % 18)).padStart(2, '0')}:${index % 2 ? '35' : '10'}`,
        riskLevel:
          !known || result === 'Locked'
            ? 'High'
            : result === 'Failed' || result === 'MFA Failed'
              ? 'Medium'
              : 'Normal'
      }
    })
  )

  const services = [
    'Wallet Callback Service',
    'Game Result Service',
    'Replay Asset Service',
    'Settlement Scheduler',
    'Notification Service',
    'Merchant Gateway',
    'Jackpot Service',
    'Report Worker'
  ]
  const errorMessages = [
    '外部回呼逾時',
    '結果格式驗證失敗',
    '歷史素材版本缺失',
    '結算排程執行時間超過門檻',
    'Webhook 發送失敗',
    '商戶簽章驗證失敗',
    '獎池事件序列不連續',
    '報表產生記憶體超過門檻'
  ]
  const systemErrors = ref<PlatformSystemErrorRecord[]>(
    Array.from({ length: 24 }, (_, index) => {
      const severity = index % 7 === 0 ? 'Critical' : index % 3 === 0 ? 'Warning' : 'Info'
      const status =
        index % 6 === 0
          ? 'New'
          : index % 6 === 1
            ? 'Investigating'
            : index % 6 === 2
              ? 'Resolved'
              : index % 6 === 3
                ? 'Ignored'
                : 'Resolved'
      return {
        id: `ERR-20260904-${String(index + 1).padStart(4, '0')}`,
        service: services[index % services.length],
        environment: index % 5 === 0 ? 'Staging' : index % 7 === 0 ? 'Sandbox' : 'Production',
        severity,
        errorCode: `SYS-${String(500 + (index % 8)).padStart(3, '0')}`,
        message: errorMessages[index % errorMessages.length],
        traceId: `trace-${String(9864120 + index * 173)}`,
        occurrenceCount: 1 + (index % 9) * 3,
        status,
        assignee:
          status === 'Investigating'
            ? 'Platform SRE'
            : status === 'Resolved'
              ? 'Service Owner'
              : undefined,
        firstOccurredAt: `2026-09-0${4 - (index % 3)} ${String(18 - (index % 10)).padStart(2, '0')}:10`,
        lastOccurredAt: `2026-09-0${4 - (index % 3)} ${String(18 - (index % 10)).padStart(2, '0')}:35`,
        resolvedAt:
          status === 'Resolved'
            ? `2026-09-0${4 - (index % 3)} ${String(19 - (index % 10)).padStart(2, '0')}:05`
            : undefined,
        resolution:
          status === 'Resolved'
            ? '服務已恢復並完成資料一致性檢查。'
            : status === 'Ignored'
              ? '測試環境已知事件，不影響正式服務。'
              : undefined
      } as PlatformSystemErrorRecord
    })
  )

  const settingLogs = ref<PlatformSystemSettingLog[]>([
    {
      id: 'SETLOG-003',
      settingType: 'Login Security',
      action: '更新工作階段逾時',
      beforeValue: '60 分鐘',
      afterValue: '30 分鐘',
      operator: 'Super Admin',
      createdAt: '2026-09-03 16:40'
    },
    {
      id: 'SETLOG-002',
      settingType: 'Login Security',
      action: '強制敏感角色使用 MFA',
      beforeValue: '關閉',
      afterValue: '啟用',
      operator: 'Super Admin',
      createdAt: '2026-09-03 16:35'
    },
    {
      id: 'SETLOG-001',
      settingType: 'Basic',
      action: '更新紀錄保存天數',
      beforeValue: '180 天',
      afterValue: '365 天',
      operator: 'Super Admin',
      createdAt: '2026-09-03 16:30'
    }
  ])

  const failedLoginCount = computed(
    () =>
      loginLogs.value.filter((item) => ['Failed', 'MFA Failed', 'Locked'].includes(item.result))
        .length
  )
  const openErrorCount = computed(
    () => systemErrors.value.filter((item) => ['New', 'Investigating'].includes(item.status)).length
  )
  const criticalErrorCount = computed(
    () =>
      systemErrors.value.filter(
        (item) => item.severity === 'Critical' && item.status !== 'Resolved'
      ).length
  )

  const saveBasicSettings = (changes: Partial<PlatformBasicSettingsRecord>) => {
    const before = JSON.stringify(basicSettings.value)
    Object.assign(basicSettings.value, changes, {
      updatedAt: formatNow(),
      updatedBy: 'Super Admin'
    })
    settingLogs.value.unshift({
      id: `SETLOG-${String(settingLogs.value.length + 1).padStart(3, '0')}`,
      settingType: 'Basic',
      action: '更新系統基本設定',
      beforeValue: before,
      afterValue: JSON.stringify(changes),
      operator: 'Super Admin',
      createdAt: formatNow()
    })
  }

  const saveLoginSecurity = (changes: Partial<PlatformLoginSecuritySettings>) => {
    const before = JSON.stringify(loginSecurity.value)
    Object.assign(loginSecurity.value, changes, {
      updatedAt: formatNow(),
      updatedBy: 'Super Admin'
    })
    settingLogs.value.unshift({
      id: `SETLOG-${String(settingLogs.value.length + 1).padStart(3, '0')}`,
      settingType: 'Login Security',
      action: '更新登入安全設定',
      beforeValue: before,
      afterValue: JSON.stringify(changes),
      operator: 'Super Admin',
      createdAt: formatNow()
    })
  }

  const investigateError = (id: string, assignee: string) => {
    const item = systemErrors.value.find((row) => row.id === id)
    if (!item || item.status === 'Resolved') return false
    item.status = 'Investigating'
    item.assignee = assignee
    return true
  }

  const closeError = (id: string, resolution: string, ignored = false) => {
    const item = systemErrors.value.find((row) => row.id === id)
    if (!item || !resolution.trim()) return false
    item.status = ignored ? 'Ignored' : 'Resolved'
    item.resolution = resolution.trim()
    item.resolvedAt = formatNow()
    item.assignee ||= 'Super Admin'
    return true
  }

  return {
    basicSettings,
    loginSecurity,
    loginLogs,
    systemErrors,
    settingLogs,
    failedLoginCount,
    openErrorCount,
    criticalErrorCount,
    saveBasicSettings,
    saveLoginSecurity,
    investigateError,
    closeError
  }
})
