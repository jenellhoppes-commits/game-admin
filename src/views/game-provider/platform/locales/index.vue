<template>
  <div class="page">
    <AppPageHeader
      :title="copy.title"
      eyebrow="平台管理 · 語系與地區"
      :description="copy.description"
    >
      <template #actions
        ><ElButton @click="ElMessage.success('設定清單已匯出')">匯出</ElButton
        ><ElButton type="primary" plain @click="showLogs = true">異動紀錄</ElButton></template
      >
    </AppPageHeader>

    <div class="summary-grid">
      <div
        ><span>後台可用語系</span><strong>{{ store.availableLanguages.length }}</strong
        ><small>翻譯完成並已開放</small></div
      >
      <div
        ><span>營運國家／地區</span><strong>{{ store.activeRegions.length }}</strong
        ><small>允許建立商戶資料</small></div
      >
      <div
        ><span>啟用時區</span><strong>{{ store.activeTimezones.length }}</strong
        ><small>IANA 標準時區</small></div
      >
      <div
        ><span>平台預設</span><strong class="default-value">{{ defaultSummary }}</strong
        ><small>{{ mode === 'timezones' ? '預設時間顯示' : '預設介面語系' }}</small></div
      >
    </div>

    <ElAlert :title="copy.rule" type="info" :closable="false" show-icon />
    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput v-model="keyword" clearable :placeholder="copy.placeholder" /></ElFormItem
        ><ElFormItem label="狀態"
          ><ElSelect v-model="status" clearable placeholder="全部狀態"
            ><ElOption label="啟用" value="Active" /><ElOption
              label="停用"
              value="Inactive" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >

    <ElCard v-if="mode === 'languages'" shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>語系清單</strong><span>共 {{ languageRows.length }} 種</span></div
        ><span>翻譯完成度 100% 才可開放後台使用</span></div
      >
      <ElTable :data="languageRows" border row-key="code"
        ><ElTableColumn label="語系" min-width="200" fixed="left"
          ><template #default="scope"
            ><strong>{{ scope.row.nativeName }}</strong
            ><br /><small>{{ scope.row.name }} · {{ scope.row.code }}</small></template
          ></ElTableColumn
        ><ElTableColumn label="翻譯進度" min-width="180"
          ><template #default="scope"
            ><ElProgress
              :percentage="scope.row.translationProgress"
              :status="
                scope.row.translationProgress === 100 ? 'success' : undefined
              " /></template></ElTableColumn
        ><ElTableColumn prop="dateFormat" label="日期格式" width="130" /><ElTableColumn
          label="時間格式"
          width="110"
          ><template #default="scope">{{
            scope.row.timeFormat === '24-hour' ? '24 小時制' : '12 小時制'
          }}</template></ElTableColumn
        ><ElTableColumn prop="direction" label="方向" width="80" align="center" /><ElTableColumn
          label="後台可用"
          width="110"
          align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.availableInBackOffice"
              :disabled="scope.row.translationProgress < 100 || scope.row.status !== 'Active'"
              @change="toggleLanguage(scope.row.code, $event)" /></template></ElTableColumn
        ><ElTableColumn label="預設" width="90" align="center"
          ><template #default="scope"
            ><ElTag v-if="scope.row.defaultLanguage" type="success">預設</ElTag
            ><ElButton
              v-else-if="scope.row.availableInBackOffice"
              link
              type="primary"
              @click="setDefaultLanguage(scope.row.code)"
              >設為預設</ElButton
            ><span v-else>—</span></template
          ></ElTableColumn
        ><ElTableColumn label="狀態" width="100"
          ><template #default="scope"
            ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
              scope.row.status === 'Active' ? '啟用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openLanguage(scope.row.code)"
              >編輯</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      >
    </ElCard>

    <ElCard v-else-if="mode === 'regions'" shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>國家／地區清單</strong><span>共 {{ regionRows.length }} 筆</span></div
        ><span>地區設定不等同法律合規許可</span></div
      >
      <ElTable :data="regionRows" border row-key="code"
        ><ElTableColumn label="國家／地區" min-width="200" fixed="left"
          ><template #default="scope"
            ><div class="region-name"
              ><b>{{ scope.row.code }}</b
              ><span
                ><strong>{{ scope.row.name }}</strong
                ><small>{{ scope.row.englishName }}</small></span
              ></div
            ></template
          ></ElTableColumn
        ><ElTableColumn label="預設語系" min-width="150"
          ><template #default="scope"
            >{{ languageName(scope.row.defaultLanguage) }}<br /><small>{{
              scope.row.defaultLanguage
            }}</small></template
          ></ElTableColumn
        ><ElTableColumn label="預設時區" min-width="180"
          ><template #default="scope">{{ scope.row.defaultTimezone }}</template></ElTableColumn
        ><ElTableColumn label="可用幣別" min-width="160"
          ><template #default="scope"
            ><ElTag v-for="currency in scope.row.currencyCodes" :key="currency" effect="plain">{{
              currency
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="允許營運" width="100" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.allowed"
              :disabled="scope.row.status !== 'Active'"
              @change="toggleRegion(scope.row.code, $event)" /></template></ElTableColumn
        ><ElTableColumn label="狀態" width="100"
          ><template #default="scope"
            ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
              scope.row.status === 'Active' ? '啟用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openRegion(scope.row.code)"
              >編輯</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      >
    </ElCard>

    <ElCard v-else shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>時區清單</strong><span>共 {{ timezoneRows.length }} 個</span></div
        ><span>資料儲存建議統一使用 UTC，畫面依時區轉換</span></div
      >
      <ElTable :data="timezoneRows" border row-key="id"
        ><ElTableColumn label="時區" min-width="240" fixed="left"
          ><template #default="scope"
            ><strong>{{ scope.row.name }}</strong
            ><br /><small>{{ scope.row.id }}</small></template
          ></ElTableColumn
        ><ElTableColumn prop="region" label="區域" width="110" /><ElTableColumn
          prop="utcOffset"
          label="UTC 偏移"
          width="110"
          align="center"
        /><ElTableColumn label="目前時間預覽" min-width="190"
          ><template #default="scope">{{
            timePreview(scope.row.utcOffset)
          }}</template></ElTableColumn
        ><ElTableColumn label="日光節約時間" width="130"
          ><template #default="scope"
            ><ElTag :type="scope.row.observesDst ? 'warning' : 'info'" effect="plain">{{
              scope.row.observesDst ? '適用 DST' : '不適用'
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="平台預設" width="110" align="center"
          ><template #default="scope"
            ><ElTag v-if="scope.row.defaultTimezone" type="success">預設</ElTag
            ><ElButton
              v-else-if="scope.row.status === 'Active'"
              link
              type="primary"
              @click="setDefaultTimezone(scope.row.id)"
              >設為預設</ElButton
            ></template
          ></ElTableColumn
        ><ElTableColumn label="狀態" width="100"
          ><template #default="scope"
            ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
              scope.row.status === 'Active' ? '啟用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openTimezone(scope.row.id)"
              >編輯</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      >
    </ElCard>

    <ElDialog v-model="languageDialog" title="編輯語系" width="min(580px, 94vw)"
      ><ElForm label-position="top"
        ><div class="form-grid"
          ><ElFormItem label="語系代碼"><ElInput v-model="languageForm.code" disabled /></ElFormItem
          ><ElFormItem label="語系名稱"><ElInput v-model="languageForm.name" /></ElFormItem></div
        ><div class="form-grid"
          ><ElFormItem label="日期格式"
            ><ElSelect v-model="languageForm.dateFormat" class="full"
              ><ElOption label="YYYY/MM/DD" value="YYYY/MM/DD" /><ElOption
                label="DD/MM/YYYY"
                value="DD/MM/YYYY" /><ElOption label="MM/DD/YYYY" value="MM/DD/YYYY" /><ElOption
                label="YYYY.MM.DD"
                value="YYYY.MM.DD" /></ElSelect></ElFormItem
          ><ElFormItem label="時間格式"
            ><ElRadioGroup v-model="languageForm.timeFormat"
              ><ElRadioButton value="24-hour">24 小時</ElRadioButton
              ><ElRadioButton value="12-hour">12 小時</ElRadioButton></ElRadioGroup
            ></ElFormItem
          ></div
        ><ElFormItem label="翻譯完成度"
          ><ElSlider
            v-model="languageForm.translationProgress"
            :min="0"
            :max="100"
            show-input /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="languageDialog = false">取消</ElButton
        ><ElButton type="primary" @click="saveLanguage">儲存語系</ElButton></template
      ></ElDialog
    >

    <ElDialog v-model="regionDialog" title="編輯國家／地區" width="min(620px, 94vw)"
      ><ElForm label-position="top"
        ><div class="form-grid"
          ><ElFormItem label="代碼"><ElInput v-model="regionForm.code" disabled /></ElFormItem
          ><ElFormItem label="名稱"><ElInput v-model="regionForm.name" /></ElFormItem></div
        ><div class="form-grid"
          ><ElFormItem label="預設語系"
            ><ElSelect v-model="regionForm.defaultLanguage" class="full"
              ><ElOption
                v-for="item in store.activeLanguages"
                :key="item.code"
                :label="`${item.nativeName}｜${item.code}`"
                :value="item.code" /></ElSelect></ElFormItem
          ><ElFormItem label="預設時區"
            ><ElSelect v-model="regionForm.defaultTimezone" filterable class="full"
              ><ElOption
                v-for="item in store.activeTimezones"
                :key="item.id"
                :label="`${item.name}｜${item.utcOffset}`"
                :value="item.id" /></ElSelect></ElFormItem></div
        ><ElFormItem label="可用幣別"
          ><ElSelect v-model="regionForm.currencyCodes" multiple class="full"
            ><ElOption
              v-for="item in financeStore.transactionCurrencies"
              :key="item.code"
              :label="`${item.code}｜${item.name}`"
              :value="item.code" /></ElSelect></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="regionDialog = false">取消</ElButton
        ><ElButton type="primary" @click="saveRegion">儲存地區</ElButton></template
      ></ElDialog
    >

    <ElDialog v-model="timezoneDialog" title="編輯時區" width="min(560px, 94vw)"
      ><ElForm label-position="top"
        ><ElFormItem label="IANA 時區識別碼"
          ><ElInput v-model="timezoneForm.id" disabled /></ElFormItem
        ><div class="form-grid"
          ><ElFormItem label="顯示名稱"><ElInput v-model="timezoneForm.name" /></ElFormItem
          ><ElFormItem label="UTC 偏移"
            ><ElInput v-model="timezoneForm.utcOffset" disabled /></ElFormItem></div
        ><ElFormItem label="狀態"
          ><ElRadioGroup v-model="timezoneForm.status"
            ><ElRadioButton value="Active">啟用</ElRadioButton
            ><ElRadioButton value="Inactive">停用</ElRadioButton></ElRadioGroup
          ></ElFormItem
        ></ElForm
      ><template #footer
        ><ElButton @click="timezoneDialog = false">取消</ElButton
        ><ElButton type="primary" @click="saveTimezone">儲存時區</ElButton></template
      ></ElDialog
    >

    <ElDrawer v-model="showLogs" title="語系與地區異動紀錄" size="min(720px, 94vw)"
      ><ElTimeline
        ><ElTimelineItem
          v-for="item in store.logs"
          :key="item.id"
          :timestamp="item.createdAt"
          placement="top"
          ><ElCard shadow="never"
            ><strong>{{ item.action }} · {{ item.targetId }}</strong
            ><p>{{ item.beforeValue }} → {{ item.afterValue }}</p
            ><small>{{ item.operator }} · {{ item.id }}</small></ElCard
          ></ElTimelineItem
        ></ElTimeline
      ></ElDrawer
    >
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import { usePlatformLocaleStore } from '@/store/modules/platformLocale'
  import type { FinanceSettingStatus, PlatformLanguageRecord } from '@/types/game-provider'

  defineOptions({ name: 'PlatformLocaleManagement' })
  const route = useRoute()
  const store = usePlatformLocaleStore()
  const financeStore = useFinanceSettingsStore()
  const mode = computed(
    () =>
      ({ PlatformRegions: 'regions', PlatformTimezones: 'timezones' })[String(route.name)] ||
      'languages'
  )
  const copies = {
    languages: {
      title: '語系管理',
      description: '管理後台介面語系、翻譯完成度與日期時間顯示格式。',
      rule: '語系啟用代表可維護翻譯；只有完成度 100% 且通過驗收後，才能開放後台使用。',
      placeholder: '語系名稱或代碼'
    },
    regions: {
      title: '國家／地區',
      description: '管理營運地區的預設語系、時區與可使用交易幣別。',
      rule: '允許營運僅代表系統可建立該地區資料，不取代牌照、法遵或風控審查。',
      placeholder: '國家、地區或代碼'
    },
    timezones: {
      title: '時區管理',
      description: '統一管理平台、商戶與營運報表使用的標準時區。',
      rule: '後端時間一律保存 UTC；畫面、報表與結算期間再依資料所屬時區顯示。',
      placeholder: '時區名稱或 IANA 識別碼'
    }
  }
  const copy = computed(() => copies[mode.value as keyof typeof copies])
  const keyword = ref('')
  const status = ref('')
  const showLogs = ref(false)
  const defaultSummary = computed(() =>
    mode.value === 'timezones'
      ? store.defaultTimezone?.id || '—'
      : store.defaultLanguage?.code || '—'
  )
  const languageRows = computed(() =>
    store.languages.filter(
      (item) =>
        (!status.value || item.status === status.value) &&
        (!keyword.value ||
          `${item.code}${item.name}${item.nativeName}`
            .toLowerCase()
            .includes(keyword.value.toLowerCase()))
    )
  )
  const regionRows = computed(() =>
    store.regions.filter(
      (item) =>
        (!status.value || item.status === status.value) &&
        (!keyword.value ||
          `${item.code}${item.name}${item.englishName}`
            .toLowerCase()
            .includes(keyword.value.toLowerCase()))
    )
  )
  const timezoneRows = computed(() =>
    store.timezones.filter(
      (item) =>
        (!status.value || item.status === status.value) &&
        (!keyword.value ||
          `${item.id}${item.name}${item.region}`
            .toLowerCase()
            .includes(keyword.value.toLowerCase()))
    )
  )
  const reset = () => {
    keyword.value = ''
    status.value = ''
  }
  const languageName = (code: string) =>
    store.languages.find((item) => item.code === code)?.nativeName || code
  const timePreview = (offset: string) =>
    `2026-09-04 ${String(12 + Number(offset.slice(0, 3))).padStart(2, '0')}:30`
  const toggleLanguage = async (code: string, value: string | number | boolean) => {
    if (!value && store.languages.find((item) => item.code === code)?.defaultLanguage)
      return ElMessage.warning('預設語系不能關閉')
    store.updateLanguage(code, { availableInBackOffice: Boolean(value) })
    ElMessage.success('後台語系狀態已更新')
  }
  const setDefaultLanguage = async (code: string) => {
    await ElMessageBox.confirm('新登入使用者及未指定偏好的帳號將使用此語系。', '設定預設語系', {
      type: 'warning'
    })
    store.updateLanguage(code, { defaultLanguage: true })
    ElMessage.success('平台預設語系已更新')
  }
  const toggleRegion = (code: string, value: string | number | boolean) => {
    store.updateRegion(code, { allowed: Boolean(value) })
    ElMessage.success('營運地區狀態已更新')
  }
  const setDefaultTimezone = async (id: string) => {
    await ElMessageBox.confirm('未指定時區的系統畫面與報表將使用此時區。', '設定平台預設時區', {
      type: 'warning'
    })
    store.updateTimezone(id, { defaultTimezone: true })
    ElMessage.success('平台預設時區已更新')
  }
  const languageDialog = ref(false)
  const languageForm = reactive({
    code: '',
    name: '',
    dateFormat: '',
    timeFormat: '24-hour' as PlatformLanguageRecord['timeFormat'],
    translationProgress: 0
  })
  const openLanguage = (code: string) => {
    const item = store.languages.find((row) => row.code === code)
    if (!item) return
    Object.assign(languageForm, item)
    languageDialog.value = true
  }
  const saveLanguage = () => {
    store.updateLanguage(languageForm.code, {
      name: languageForm.name,
      dateFormat: languageForm.dateFormat,
      timeFormat: languageForm.timeFormat,
      translationProgress: languageForm.translationProgress
    })
    languageDialog.value = false
    ElMessage.success('語系設定已儲存')
  }
  const regionDialog = ref(false)
  const regionForm = reactive({
    code: '',
    name: '',
    defaultLanguage: '',
    defaultTimezone: '',
    currencyCodes: [] as string[]
  })
  const openRegion = (code: string) => {
    const item = store.regions.find((row) => row.code === code)
    if (!item) return
    Object.assign(regionForm, {
      code: item.code,
      name: item.name,
      defaultLanguage: item.defaultLanguage,
      defaultTimezone: item.defaultTimezone,
      currencyCodes: [...item.currencyCodes]
    })
    regionDialog.value = true
  }
  const saveRegion = () => {
    if (!regionForm.currencyCodes.length) return ElMessage.warning('至少保留一個可用幣別')
    store.updateRegion(regionForm.code, {
      name: regionForm.name,
      defaultLanguage: regionForm.defaultLanguage,
      defaultTimezone: regionForm.defaultTimezone,
      currencyCodes: [...regionForm.currencyCodes]
    })
    regionDialog.value = false
    ElMessage.success('國家／地區設定已儲存')
  }
  const timezoneDialog = ref(false)
  const timezoneForm = reactive({
    id: '',
    name: '',
    utcOffset: '',
    status: 'Active' as FinanceSettingStatus
  })
  const openTimezone = (id: string) => {
    const item = store.timezones.find((row) => row.id === id)
    if (!item) return
    Object.assign(timezoneForm, {
      id: item.id,
      name: item.name,
      utcOffset: item.utcOffset,
      status: item.status
    })
    timezoneDialog.value = true
  }
  const saveTimezone = () => {
    const current = store.timezones.find((item) => item.id === timezoneForm.id)
    if (current?.defaultTimezone && timezoneForm.status === 'Inactive')
      return ElMessage.warning('平台預設時區不能停用')
    store.updateTimezone(timezoneForm.id, { name: timezoneForm.name, status: timezoneForm.status })
    timezoneDialog.value = false
    ElMessage.success('時區設定已儲存')
  }
</script>

<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    > div {
      padding: 18px 20px;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    span,
    small {
      display: block;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 8px 0 4px;
      font-size: 26px;
    }

    .default-value {
      overflow: hidden;
      font-size: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    color: var(--art-gray-600);

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
      color: var(--art-text-gray-900);
    }
  }

  small {
    color: var(--art-gray-600);
  }

  .el-tag + .el-tag {
    margin-left: 6px;
  }

  .region-name {
    display: flex;
    gap: 12px;
    align-items: center;

    > b {
      display: grid;
      place-items: center;
      width: 38px;
      height: 32px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-radius: 6px;
    }

    span,
    small {
      display: block;
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .full {
    width: 100%;
  }

  :deep(.el-timeline-item__timestamp) {
    color: var(--art-gray-600);
  }

  :deep(.el-timeline-item p) {
    margin: 8px 0;
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 620px) {
    .summary-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
