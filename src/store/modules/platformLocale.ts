import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  PlatformLanguageRecord,
  PlatformLocaleLog,
  PlatformRegionRecord,
  PlatformTimezoneRecord
} from '@/types/game-provider'

const formatNow = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)

export const usePlatformLocaleStore = defineStore('platformLocaleStore', () => {
  const languages = ref<PlatformLanguageRecord[]>([
    {
      code: 'zh-TW',
      name: '繁體中文',
      nativeName: '繁體中文',
      direction: 'LTR',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24-hour',
      translationProgress: 100,
      availableInBackOffice: true,
      defaultLanguage: true,
      status: 'Active',
      updatedAt: '2026-09-03 15:00'
    },
    {
      code: 'en-US',
      name: '英文',
      nativeName: 'English',
      direction: 'LTR',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12-hour',
      translationProgress: 100,
      availableInBackOffice: true,
      defaultLanguage: false,
      status: 'Active',
      updatedAt: '2026-09-03 15:00'
    },
    {
      code: 'zh-CN',
      name: '簡體中文',
      nativeName: '简体中文',
      direction: 'LTR',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24-hour',
      translationProgress: 82,
      availableInBackOffice: false,
      defaultLanguage: false,
      status: 'Active',
      updatedAt: '2026-09-02 11:20'
    },
    {
      code: 'th-TH',
      name: '泰文',
      nativeName: 'ไทย',
      direction: 'LTR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24-hour',
      translationProgress: 68,
      availableInBackOffice: false,
      defaultLanguage: false,
      status: 'Active',
      updatedAt: '2026-09-01 16:40'
    },
    {
      code: 'vi-VN',
      name: '越南文',
      nativeName: 'Tiếng Việt',
      direction: 'LTR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24-hour',
      translationProgress: 54,
      availableInBackOffice: false,
      defaultLanguage: false,
      status: 'Active',
      updatedAt: '2026-08-30 14:10'
    },
    {
      code: 'id-ID',
      name: '印尼文',
      nativeName: 'Bahasa Indonesia',
      direction: 'LTR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24-hour',
      translationProgress: 35,
      availableInBackOffice: false,
      defaultLanguage: false,
      status: 'Active',
      updatedAt: '2026-08-28 10:00'
    },
    {
      code: 'ja-JP',
      name: '日文',
      nativeName: '日本語',
      direction: 'LTR',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24-hour',
      translationProgress: 42,
      availableInBackOffice: false,
      defaultLanguage: false,
      status: 'Inactive',
      updatedAt: '2026-08-25 09:20'
    },
    {
      code: 'ko-KR',
      name: '韓文',
      nativeName: '한국어',
      direction: 'LTR',
      dateFormat: 'YYYY.MM.DD',
      timeFormat: '24-hour',
      translationProgress: 28,
      availableInBackOffice: false,
      defaultLanguage: false,
      status: 'Inactive',
      updatedAt: '2026-08-25 09:20'
    }
  ])

  const regions = ref<PlatformRegionRecord[]>([
    {
      code: 'TW',
      name: '臺灣',
      englishName: 'Taiwan',
      defaultLanguage: 'zh-TW',
      defaultTimezone: 'Asia/Taipei',
      currencyCodes: ['TWD'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-03 14:00'
    },
    {
      code: 'US',
      name: '美國',
      englishName: 'United States',
      defaultLanguage: 'en-US',
      defaultTimezone: 'America/New_York',
      currencyCodes: ['USD'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-03 14:00'
    },
    {
      code: 'PH',
      name: '菲律賓',
      englishName: 'Philippines',
      defaultLanguage: 'en-US',
      defaultTimezone: 'Asia/Manila',
      currencyCodes: ['PHP', 'USD'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-02 12:30'
    },
    {
      code: 'TH',
      name: '泰國',
      englishName: 'Thailand',
      defaultLanguage: 'th-TH',
      defaultTimezone: 'Asia/Bangkok',
      currencyCodes: ['THB'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-02 12:30'
    },
    {
      code: 'VN',
      name: '越南',
      englishName: 'Vietnam',
      defaultLanguage: 'vi-VN',
      defaultTimezone: 'Asia/Ho_Chi_Minh',
      currencyCodes: ['VND'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-02 12:30'
    },
    {
      code: 'ID',
      name: '印尼',
      englishName: 'Indonesia',
      defaultLanguage: 'id-ID',
      defaultTimezone: 'Asia/Jakarta',
      currencyCodes: ['IDR'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-02 12:30'
    },
    {
      code: 'MY',
      name: '馬來西亞',
      englishName: 'Malaysia',
      defaultLanguage: 'en-US',
      defaultTimezone: 'Asia/Kuala_Lumpur',
      currencyCodes: ['MYR'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-01 11:15'
    },
    {
      code: 'JP',
      name: '日本',
      englishName: 'Japan',
      defaultLanguage: 'ja-JP',
      defaultTimezone: 'Asia/Tokyo',
      currencyCodes: ['JPY'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-01 11:15'
    },
    {
      code: 'KR',
      name: '韓國',
      englishName: 'South Korea',
      defaultLanguage: 'ko-KR',
      defaultTimezone: 'Asia/Seoul',
      currencyCodes: ['KRW'],
      allowed: true,
      status: 'Active',
      updatedAt: '2026-09-01 11:15'
    },
    {
      code: 'CN',
      name: '中國',
      englishName: 'China',
      defaultLanguage: 'zh-CN',
      defaultTimezone: 'Asia/Shanghai',
      currencyCodes: ['CNY'],
      allowed: false,
      status: 'Inactive',
      updatedAt: '2026-08-30 09:00'
    }
  ])

  const timezones = ref<PlatformTimezoneRecord[]>(
    [
      ['UTC', '世界標準時間', '全球', '+00:00', false],
      ['Asia/Taipei', '臺北時間', '亞洲', '+08:00', false],
      ['Asia/Manila', '馬尼拉時間', '亞洲', '+08:00', false],
      ['Asia/Bangkok', '曼谷時間', '亞洲', '+07:00', false],
      ['Asia/Ho_Chi_Minh', '胡志明市時間', '亞洲', '+07:00', false],
      ['Asia/Jakarta', '雅加達時間', '亞洲', '+07:00', false],
      ['Asia/Kuala_Lumpur', '吉隆坡時間', '亞洲', '+08:00', false],
      ['Asia/Tokyo', '東京時間', '亞洲', '+09:00', false],
      ['Asia/Seoul', '首爾時間', '亞洲', '+09:00', false],
      ['Asia/Shanghai', '上海時間', '亞洲', '+08:00', false],
      ['America/New_York', '紐約時間', '美洲', '-05:00', true],
      ['Europe/London', '倫敦時間', '歐洲', '+00:00', true]
    ].map(
      (item, index) =>
        ({
          id: String(item[0]),
          name: String(item[1]),
          region: String(item[2]),
          utcOffset: String(item[3]),
          observesDst: Boolean(item[4]),
          defaultTimezone: index === 1,
          status: 'Active',
          updatedAt: '2026-09-03 14:00'
        }) as PlatformTimezoneRecord
    )
  )

  const logs = ref<PlatformLocaleLog[]>([
    {
      id: 'LOCLOG-003',
      targetType: 'Language',
      targetId: 'zh-CN',
      action: '更新翻譯進度',
      beforeValue: '78%',
      afterValue: '82%',
      operator: 'Localization Manager',
      createdAt: '2026-09-02 11:20'
    },
    {
      id: 'LOCLOG-002',
      targetType: 'Region',
      targetId: 'PH',
      action: '新增可用幣別',
      beforeValue: 'PHP',
      afterValue: 'PHP、USD',
      operator: 'Super Admin',
      createdAt: '2026-09-02 12:30'
    },
    {
      id: 'LOCLOG-001',
      targetType: 'Timezone',
      targetId: 'Asia/Taipei',
      action: '設為平台預設時區',
      beforeValue: 'UTC',
      afterValue: 'Asia/Taipei',
      operator: 'Super Admin',
      createdAt: '2026-09-01 10:00'
    }
  ])

  const activeLanguages = computed(() => languages.value.filter((item) => item.status === 'Active'))
  const availableLanguages = computed(() =>
    languages.value.filter((item) => item.status === 'Active' && item.availableInBackOffice)
  )
  const activeRegions = computed(() =>
    regions.value.filter((item) => item.status === 'Active' && item.allowed)
  )
  const activeTimezones = computed(() => timezones.value.filter((item) => item.status === 'Active'))
  const defaultLanguage = computed(() => languages.value.find((item) => item.defaultLanguage))
  const defaultTimezone = computed(() => timezones.value.find((item) => item.defaultTimezone))

  const addLog = (
    targetType: PlatformLocaleLog['targetType'],
    targetId: string,
    action: string,
    beforeValue: string,
    afterValue: string
  ) =>
    logs.value.unshift({
      id: `LOCLOG-${String(logs.value.length + 1).padStart(3, '0')}`,
      targetType,
      targetId,
      action,
      beforeValue,
      afterValue,
      operator: 'Super Admin',
      createdAt: formatNow()
    })

  const updateLanguage = (code: string, changes: Partial<PlatformLanguageRecord>) => {
    const item = languages.value.find((row) => row.code === code)
    if (!item) return false
    if (changes.defaultLanguage)
      languages.value.forEach((row) => {
        row.defaultLanguage = false
      })
    const before = `${item.status} / 後台 ${item.availableInBackOffice ? '可用' : '不可用'}`
    Object.assign(item, changes, { updatedAt: formatNow() })
    addLog(
      'Language',
      code,
      changes.defaultLanguage ? '設定預設語系' : '更新語系',
      before,
      `${item.status} / 後台 ${item.availableInBackOffice ? '可用' : '不可用'}`
    )
    return true
  }

  const updateRegion = (code: string, changes: Partial<PlatformRegionRecord>) => {
    const item = regions.value.find((row) => row.code === code)
    if (!item) return false
    const before = `${item.status} / ${item.currencyCodes.join('、')}`
    Object.assign(item, changes, { updatedAt: formatNow() })
    addLog(
      'Region',
      code,
      '更新國家地區',
      before,
      `${item.status} / ${item.currencyCodes.join('、')}`
    )
    return true
  }

  const updateTimezone = (id: string, changes: Partial<PlatformTimezoneRecord>) => {
    const item = timezones.value.find((row) => row.id === id)
    if (!item) return false
    if (changes.defaultTimezone)
      timezones.value.forEach((row) => {
        row.defaultTimezone = false
      })
    const before = `${item.status} / 預設 ${item.defaultTimezone}`
    Object.assign(item, changes, { updatedAt: formatNow() })
    addLog(
      'Timezone',
      id,
      changes.defaultTimezone ? '設定預設時區' : '更新時區',
      before,
      `${item.status} / 預設 ${item.defaultTimezone}`
    )
    return true
  }

  return {
    languages,
    regions,
    timezones,
    logs,
    activeLanguages,
    availableLanguages,
    activeRegions,
    activeTimezones,
    defaultLanguage,
    defaultTimezone,
    updateLanguage,
    updateRegion,
    updateTimezone
  }
})
