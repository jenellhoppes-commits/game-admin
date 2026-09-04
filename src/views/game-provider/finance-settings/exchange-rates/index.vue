<template>
  <div class="page">
    <AppPageHeader
      :title="copy.title"
      eyebrow="平台管理 · 匯率管理"
      :description="copy.description"
    >
      <template #actions>
        <ElButton v-if="mode === 'settings'" @click="logDrawerVisible = true">
          <ArtSvgIcon icon="ri:file-history-line" />操作紀錄
        </ElButton>
        <ElButton v-else @click="ElMessage.success('匯率歷史已匯出')">
          <ArtSvgIcon icon="ri:download-2-line" />匯出歷史
        </ElButton>
        <ElButton v-if="mode === 'settings'" type="primary" @click="openEditor()">
          <ArtSvgIcon icon="ri:add-line" />新增幣別匯率
        </ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <div>
        <span>啟用匯率設定</span>
        <strong>{{ activeConfigCount }}</strong>
        <small>每日自動取得並鎖定</small>
      </div>
      <div>
        <span>統一基準幣別</span>
        <strong>USDT</strong>
        <small>所有匯率皆以 1 USDT 報價</small>
      </div>
      <div>
        <span>今日已鎖定</span>
        <strong>{{ todayLockedCount }}</strong>
        <small>{{ todayDate }} 當日快照</small>
      </div>
      <div>
        <span>已供結算使用</span>
        <strong>{{ settlementUsedCount }}</strong>
        <small>歷史匯率快照</small>
      </div>
    </div>

    <ElAlert :title="copy.rule" type="info" :closable="false" show-icon />

    <ElCard shadow="never" class="filter-card">
      <ElForm inline>
        <ElFormItem label="幣別">
          <ElInput v-model="filters.keyword" clearable placeholder="例如 TWD、ASGU" />
        </ElFormItem>
        <ElFormItem v-if="mode === 'settings'" label="狀態">
          <ElSelect v-model="filters.status" clearable placeholder="全部狀態">
            <ElOption label="啟用" value="Active" />
            <ElOption label="停用" value="Inactive" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-else label="匯率日期">
          <ElDatePicker v-model="filters.date" value-format="YYYY-MM-DD" clearable />
        </ElFormItem>
        <ElFormItem v-if="mode === 'history'" label="結算使用">
          <ElSelect v-model="filters.settlementUsed" clearable placeholder="全部">
            <ElOption label="已使用" value="yes" />
            <ElOption label="未使用" value="no" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem>
        <ElFormItem><ElButton @click="resetFilters">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="table-card">
      <div class="toolbar">
        <div>
          <strong>{{ copy.tableTitle }}</strong>
          <span>共 {{ displayedRows.length }} 筆</span>
        </div>
        <span>{{ copy.hint }}</span>
      </div>

      <ElTable
        v-if="mode === 'settings'"
        :data="settingRows"
        border
        row-key="id"
        table-layout="auto"
      >
        <ElTableColumn label="幣別" min-width="180" fixed="left">
          <template #default="scope">
            <div class="pair-cell">
              <strong>{{ scope.row.toCurrency }}｜{{ currencyName(scope.row.toCurrency) }}</strong>
              <small>基準：USDT · {{ scope.row.id }}</small>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="匯率類型" min-width="125">
          <template #default="scope">
            <ElTag :type="rateTypeTagType(scope.row.rateType)" effect="plain">
              {{ rateTypeLabel(scope.row.rateType) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="匯率來源" min-width="180">
          <template #default="scope">
            <strong>{{ sourceName(scope.row.sourceId) }}</strong>
            <small>{{ sourceType(scope.row.sourceId) }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="每日取得／鎖定" min-width="175">
          <template #default="scope">
            <strong>{{ scheduleLabel(scope.row) }}</strong>
            <small>{{ scope.row.lockedAt ? `${scope.row.lockedAt} 已鎖定` : '尚未鎖定' }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="加／減調整" min-width="135" align="right">
          <template #default="scope">
            <ElTag :type="adjustmentType(scope.row.adjustmentMode)" effect="plain">
              {{ configAdjustmentText(scope.row) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="精度／捨入" min-width="145">
          <template #default="scope">
            <strong>{{ scope.row.precision }} 位小數</strong>
            <small>{{ scope.row.roundingRule }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="生效版本" min-width="145">
          <template #default="scope">
            <strong>{{ scope.row.effectiveVersion }}</strong>
            <small>{{ scope.row.effectiveFrom }} 起</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="目前來源匯率" min-width="145" align="right">
          <template #default="scope">{{
            formatRate(scope.row.todaySourceRate, scope.row.precision)
          }}</template>
        </ElTableColumn>
        <ElTableColumn label="目前適用匯率" min-width="190" align="right">
          <template #default="scope">
            <strong class="final-rate"
              >1 USDT = {{ formatRate(scope.row.todayFinalRate, scope.row.precision) }}
              {{ scope.row.toCurrency }}</strong
            >
          </template>
        </ElTableColumn>
        <ElTableColumn label="啟用" width="86" align="center">
          <template #default="scope">
            <ElSwitch
              :model-value="scope.row.status === 'Active'"
              @change="toggleConfig(scope.row.id, $event)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="scope">
            <ElButton link type="primary" @click="openEditor(scope.row)">編輯</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <ElTable v-else :data="historyRows" border row-key="id" table-layout="auto">
        <ElTableColumn prop="date" label="日期" width="120" fixed="left" />
        <ElTableColumn label="幣別／基準" min-width="170" fixed="left">
          <template #default="scope">
            <strong>{{ scope.row.toCurrency }}／USDT</strong>
            <small>{{ scope.row.id }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="類型／來源" min-width="175">
          <template #default="scope">
            <strong>{{ rateTypeLabel(scope.row.rateType || 'Market') }}</strong>
            <small>{{ sourceName(scope.row.sourceId) }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="每日來源匯率" min-width="145" align="right">
          <template #default="scope">{{ formatRate(scope.row.baseRate) }}</template>
        </ElTableColumn>
        <ElTableColumn label="當日調整" min-width="125" align="right">
          <template #default="scope">
            {{ historyAdjustmentText(scope.row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="最終適用匯率" min-width="150" align="right">
          <template #default="scope"
            ><strong class="final-rate">{{ formatRate(scope.row.finalRate) }}</strong></template
          >
        </ElTableColumn>
        <ElTableColumn label="取得／鎖定時間" min-width="190">
          <template #default="scope">
            <strong>{{ scope.row.fetchedAt || '—' }}</strong>
            <small>{{ scope.row.lockedAt ? `鎖定 ${scope.row.lockedAt}` : '尚未鎖定' }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="settingVersion" label="設定版本" min-width="135" />
        <ElTableColumn label="結算使用" min-width="210">
          <template #default="scope">
            <ElTag :type="scope.row.settlementUsed ? 'success' : 'info'">
              {{ scope.row.settlementUsed ? '已使用' : '未使用' }}
            </ElTag>
            <div v-if="scope.row.settlementIds?.length" class="settlement-links">
              <ElButton
                v-for="id in scope.row.settlementIds"
                :key="id"
                link
                type="primary"
                @click="ElMessage.info(`開啟結算單 ${id}`)"
                >{{ id }}</ElButton
              >
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="取得結果" min-width="210">
          <template #default="scope">
            <ElTag :type="historyStatusType(scope.row.fetchStatus)">
              {{ historyStatusLabel(scope.row.fetchStatus) }}
            </ElTag>
            <small v-if="scope.row.failureReason" class="result-note danger">{{
              scope.row.failureReason
            }}</small>
            <small v-else-if="scope.row.correctionNote" class="result-note warning">{{
              scope.row.correctionNote
            }}</small>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog
      v-model="editorVisible"
      :title="editingId ? '編輯匯率設定' : '新增匯率設定'"
      width="min(680px, 94vw)"
    >
      <ElAlert
        title="每個已啟用幣別只維護一筆對 USDT 的匯率；結算時透過同日快照推導跨幣別結果。"
        type="warning"
        :closable="false"
      />
      <ElForm label-position="top" class="dialog-form">
        <div class="form-grid">
          <ElFormItem label="幣別" required>
            <ElSelect
              v-model="form.toCurrency"
              filterable
              class="full"
              :disabled="Boolean(editingId)"
            >
              <ElOption
                v-for="item in eligibleCurrencyRows"
                :key="item.code"
                :label="`${item.code}｜${item.name}｜${currencyTypeLabel(item.currencyType)}`"
                :value="item.code"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="基準幣別">
            <ElInput model-value="USDT｜泰達幣" disabled class="full" />
          </ElFormItem>
        </div>
        <div class="form-grid">
          <ElFormItem label="匯率類型" required>
            <ElSelect
              v-model="form.rateType"
              class="full"
              :disabled="form.toCurrency === 'ASGU'"
              @change="onRateTypeChange"
            >
              <ElOption label="市場匯率" value="Market" />
              <ElOption label="固定錨定" value="Pegged" />
              <ElOption label="人工匯率" value="Manual" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem v-if="form.rateType === 'Market'" label="匯率來源" required>
            <ElSelect v-model="form.sourceId" class="full">
              <ElOption
                v-for="item in marketSourceRows"
                :key="item.id"
                :label="`${item.name}｜優先序 ${item.priority}`"
                :value="item.id"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem v-else label="匯率來源">
            <ElInput :model-value="sourceName(form.sourceId)" disabled class="full" />
          </ElFormItem>
        </div>
        <div class="form-grid">
          <ElFormItem v-if="form.rateType === 'Market'" label="每日取得時間" required>
            <ElTimePicker
              v-model="form.dailyFetchTime"
              value-format="HH:mm"
              format="HH:mm"
              class="full"
            />
          </ElFormItem>
          <ElFormItem
            v-else
            :label="form.rateType === 'Pegged' ? '固定錨定匯率' : '人工匯率'"
            required
          >
            <ElInputNumber
              v-model="form.configuredRate"
              :min="0.00000001"
              :precision="8"
              :step="0.01"
              class="full"
            />
            <small class="field-help">1 USDT 等於多少 {{ form.toCurrency || '該幣別' }}</small>
          </ElFormItem>
          <ElFormItem v-if="form.rateType !== 'Market'" label="每日快照">
            <ElInput model-value="每日 00:00 自動鎖定" disabled class="full" />
          </ElFormItem>
        </div>
        <div v-if="form.rateType === 'Market'" class="form-grid">
          <ElFormItem label="匯率調整方式">
            <ElRadioGroup v-model="form.adjustmentMode">
              <ElRadioButton value="None">不調整</ElRadioButton>
              <ElRadioButton value="Add">加</ElRadioButton>
              <ElRadioButton value="Subtract">減</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="調整單位">
            <ElRadioGroup v-model="form.adjustmentUnit" :disabled="form.adjustmentMode === 'None'">
              <ElRadioButton value="Percent">百分比</ElRadioButton>
              <ElRadioButton value="Fixed">固定值</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem :label="form.adjustmentUnit === 'Percent' ? '調整值（%）' : '固定調整值'">
            <ElInputNumber
              v-model="form.adjustmentValue"
              :min="0"
              :max="form.adjustmentUnit === 'Percent' ? 20 : undefined"
              :precision="2"
              :step="0.05"
              class="full"
              :disabled="form.adjustmentMode === 'None'"
            />
          </ElFormItem>
        </div>
        <div class="form-grid">
          <ElFormItem label="匯率精度">
            <ElSelect v-model="form.precision" class="full">
              <ElOption
                v-for="value in [2, 4, 6, 8]"
                :key="value"
                :label="`${value} 位小數`"
                :value="value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="四捨五入規則">
            <ElSelect v-model="form.roundingRule" class="full">
              <ElOption v-for="rule in roundingRules" :key="rule" :label="rule" :value="rule" />
            </ElSelect>
          </ElFormItem>
        </div>
        <div class="form-grid">
          <ElFormItem label="生效版本"
            ><ElInput
              :model-value="
                editingId
                  ? `${form.effectiveVersion}（儲存後自動產生新版本）`
                  : '儲存後由系統自動產生'
              "
              disabled
          /></ElFormItem>
          <ElFormItem label="生效日期" required>
            <ElDatePicker v-model="form.effectiveFrom" value-format="YYYY-MM-DD" class="full" />
          </ElFormItem>
        </div>
        <ElFormItem label="狀態">
          <ElRadioGroup v-model="form.status">
            <ElRadioButton value="Active">啟用</ElRadioButton>
            <ElRadioButton value="Inactive">停用</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <div class="rate-preview">
          <span>目前預估適用匯率</span>
          <strong>1 USDT = {{ previewRate }} {{ form.toCurrency || '—' }}</strong>
          <small>{{
            form.rateType === 'Market'
              ? '正式值會依每日來源匯率取得並調整後鎖定'
              : '固定／人工匯率仍會每日建立不可變更的鎖定快照'
          }}</small>
        </div>
      </ElForm>
      <template #footer>
        <ElButton @click="editorVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveConfig">儲存設定</ElButton>
      </template>
    </ElDialog>

    <ElDrawer v-model="logDrawerVisible" title="匯率操作紀錄" size="min(760px, 94vw)">
      <ElTable :data="store.logs" border row-key="id">
        <ElTableColumn prop="createdAt" label="時間" min-width="150" />
        <ElTableColumn prop="target" label="對象" min-width="130" />
        <ElTableColumn prop="action" label="操作" min-width="135" />
        <ElTableColumn prop="operator" label="操作人" width="110" />
        <ElTableColumn prop="note" label="說明" min-width="220" show-overflow-tooltip />
      </ElTable>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { defaultExchangeRate, useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type {
    DailyExchangeRateRecord,
    ExchangeAdjustmentMode,
    ExchangeAdjustmentUnit,
    ExchangeRateConfigRecord,
    ExchangeRateSourceRecord,
    ExchangeRateType,
    FinanceRoundingRule,
    FinanceSettingStatus
  } from '@/types/game-provider'

  defineOptions({ name: 'PlatformExchangeRateManagement' })

  const route = useRoute()
  const store = useFinanceSettingsStore()
  const mode = computed(() =>
    route.name === 'PlatformExchangeRateHistory' ? 'history' : 'settings'
  )
  const copy = computed(() =>
    mode.value === 'settings'
      ? {
          title: '匯率設定',
          description: '以 USDT 為唯一基準，為每個幣別設定市場、固定錨定或人工匯率。',
          rule: '所有匯率皆定義為「1 USDT 等於多少該幣別」；跨幣別換算會使用同一天的兩筆鎖定快照推導。',
          tableTitle: '全域匯率設定',
          hint: '新版本只影響生效日後的匯率與結算'
        }
      : {
          title: '匯率歷史',
          description: '按幣別追溯每日對 USDT 的來源匯率、調整值、鎖定時間與結算使用情況。',
          rule: '每日匯率鎖定後保留完整快照；已被結算使用的紀錄不可修改或刪除。',
          tableTitle: '每日匯率紀錄',
          hint: '包含失敗、更正與關聯結算單'
        }
  )

  const filters = reactive({
    keyword: '',
    status: '',
    date: '',
    settlementUsed: ''
  })
  const editorVisible = ref(false)
  const logDrawerVisible = ref(false)
  const editingId = ref('')
  const roundingRules: FinanceRoundingRule[] = [
    '四捨五入',
    '無條件捨去',
    '無條件進位',
    '銀行家捨入'
  ]

  const emptyForm = () => ({
    fromCurrency: 'USDT',
    toCurrency:
      store.enabledCurrencies.find(
        (item) =>
          item.code !== 'USDT' &&
          !store.rateConfigs.some((config) => config.toCurrency === item.code)
      )?.code || '',
    rateType: 'Market' as ExchangeRateType,
    configuredRate: 1,
    sourceId: 'FXS-001',
    dailyFetchTime: '02:00',
    adjustmentMode: 'None' as ExchangeAdjustmentMode,
    adjustmentUnit: 'Percent' as ExchangeAdjustmentUnit,
    adjustmentValue: 0,
    precision: 6,
    roundingRule: '四捨五入' as FinanceRoundingRule,
    effectiveVersion: '',
    effectiveFrom: '2026-09-05',
    status: 'Active' as FinanceSettingStatus
  })
  const form = reactive(emptyForm())

  const eligibleCurrencyRows = computed(() =>
    store.enabledCurrencies.filter(
      (item) =>
        item.code !== 'USDT' &&
        (editingId.value
          ? item.code === form.toCurrency ||
            !store.rateConfigs.some((config) => config.toCurrency === item.code)
          : !store.rateConfigs.some((config) => config.toCurrency === item.code))
    )
  )
  const marketSourceRows = computed(() =>
    store.sources.filter(
      (item) => item.status === 'Active' && !['FXS-003', 'FXS-005'].includes(item.id)
    )
  )
  const activeConfigCount = computed(
    () => store.rateConfigs.filter((item) => item.status === 'Active').length
  )
  const todayDate = new Date().toLocaleDateString('sv-SE')
  const todayLockedCount = computed(
    () =>
      store.dailyRates.filter((item) => item.date === todayDate && item.status === 'Locked').length
  )
  const settlementUsedCount = computed(
    () => store.dailyRates.filter((item) => item.settlementUsed).length
  )
  const settingRows = computed(() =>
    store.rateConfigs.filter((item) => {
      const pair = `${item.toCurrency} ${currencyName(item.toCurrency)}`.toLowerCase()
      return (
        (!filters.keyword || pair.includes(filters.keyword.toLowerCase())) &&
        (!filters.status || item.status === filters.status)
      )
    })
  )
  const historyRows = computed(() =>
    [...store.dailyRates]
      .filter((item) => {
        const pair = `${item.toCurrency} ${currencyName(item.toCurrency)}`.toLowerCase()
        const usedMatches =
          !filters.settlementUsed ||
          (filters.settlementUsed === 'yes' ? item.settlementUsed : !item.settlementUsed)
        return (
          (!filters.keyword || pair.includes(filters.keyword.toLowerCase())) &&
          (!filters.date || item.date === filters.date) &&
          usedMatches
        )
      })
      .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`))
  )
  const displayedRows = computed(() =>
    mode.value === 'settings' ? settingRows.value : historyRows.value
  )
  const previewRate = computed(() => {
    if (!form.toCurrency) return '—'
    const rate =
      form.rateType === 'Market'
        ? defaultExchangeRate('USDT', form.toCurrency)
        : form.configuredRate
    if (!Number.isFinite(rate)) return '等待來源匯率'
    const direction =
      form.adjustmentMode === 'Add' ? 1 : form.adjustmentMode === 'Subtract' ? -1 : 0
    const adjusted =
      form.adjustmentUnit === 'Fixed'
        ? rate + direction * form.adjustmentValue
        : rate * (1 + (direction * form.adjustmentValue) / 100)
    return formatRate(adjusted, form.precision)
  })

  const resetFilters = () =>
    Object.assign(filters, { keyword: '', status: '', date: '', settlementUsed: '' })
  const source = (id: string) => store.sources.find((item) => item.id === id)
  const sourceName = (id: string) => source(id)?.name || id
  const currency = (code: string) => store.currencies.find((item) => item.code === code)
  const currencyName = (code: string) => currency(code)?.name || code
  const currencyTypeLabel = (type: (typeof store.currencies)[number]['currencyType']) =>
    ({ Fiat: '法定幣', Crypto: '加密幣', System: '系統幣' })[type]
  const rateTypeLabel = (type: ExchangeRateType) =>
    ({ Market: '市場匯率', Pegged: '固定錨定', Manual: '人工匯率' })[type]
  const rateTypeTagType = (type: ExchangeRateType) =>
    type === 'Pegged' ? 'warning' : type === 'Manual' ? 'info' : 'success'
  const scheduleLabel = (item: ExchangeRateConfigRecord) =>
    item.rateType === 'Market' ? `${item.dailyFetchTime} 自動取得` : '每日 00:00 鎖定快照'
  const sourceType = (id: string) =>
    ({ API: '外部 API', Manual: '人工來源', Internal: '平台來源' })[
      (source(id)?.type || 'Internal') as ExchangeRateSourceRecord['type']
    ]
  const formatRate = (value: number, precision = 6) =>
    value.toLocaleString('zh-TW', {
      minimumFractionDigits: Math.min(precision, 2),
      maximumFractionDigits: precision
    })
  const adjustmentType = (modeValue: ExchangeAdjustmentMode) =>
    modeValue === 'Add' ? 'success' : modeValue === 'Subtract' ? 'danger' : 'info'
  const configAdjustmentText = (item: ExchangeRateConfigRecord) =>
    item.adjustmentMode === 'Add'
      ? `+${item.adjustmentValue}${item.adjustmentUnit === 'Percent' ? '%' : ''}`
      : item.adjustmentMode === 'Subtract'
        ? `-${item.adjustmentValue}${item.adjustmentUnit === 'Percent' ? '%' : ''}`
        : '不調整'
  const historyAdjustmentText = (item: DailyExchangeRateRecord) => {
    const mode =
      item.adjustmentMode ||
      (item.adjustmentPercent < 0 ? 'Subtract' : item.adjustmentPercent > 0 ? 'Add' : 'None')
    if (mode === 'None') return '不調整'
    const sign = mode === 'Add' ? '+' : '-'
    const value = item.adjustmentValue ?? Math.abs(item.adjustmentPercent)
    return `${sign}${value}${(item.adjustmentUnit || 'Percent') === 'Percent' ? '%' : ''}`
  }
  const historyStatusLabel = (status?: DailyExchangeRateRecord['fetchStatus']) =>
    ({ Success: '成功', Failed: '失敗', Corrected: '已更正' })[status || 'Success']
  const historyStatusType = (status?: DailyExchangeRateRecord['fetchStatus']) =>
    status === 'Failed' ? 'danger' : status === 'Corrected' ? 'warning' : 'success'

  const openEditor = (item?: ExchangeRateConfigRecord) => {
    editingId.value = item?.id || ''
    Object.assign(
      form,
      item
        ? {
            fromCurrency: item.fromCurrency,
            toCurrency: item.toCurrency,
            rateType: item.rateType,
            configuredRate: item.configuredRate ?? item.todaySourceRate,
            sourceId: item.sourceId,
            dailyFetchTime: item.dailyFetchTime,
            adjustmentMode: item.adjustmentMode,
            adjustmentUnit: item.adjustmentUnit,
            adjustmentValue: item.adjustmentValue,
            precision: item.precision,
            roundingRule: item.roundingRule,
            effectiveVersion: item.effectiveVersion,
            effectiveFrom: item.effectiveFrom,
            status: item.status
          }
        : emptyForm()
    )
    editorVisible.value = true
  }

  const saveConfig = () => {
    if (!form.toCurrency || !form.sourceId || !form.effectiveFrom)
      return ElMessage.warning('請完整填寫必填欄位')
    if (form.rateType !== 'Market' && (!form.configuredRate || form.configuredRate <= 0))
      return ElMessage.warning('請設定大於 0 的固定或人工匯率')

    if (editingId.value) {
      store.updateRateConfig(editingId.value, { ...form })
    } else if (!store.createRateConfig({ ...form })) {
      return ElMessage.warning('幣別尚未啟用，或該幣別已經建立匯率設定')
    }
    editorVisible.value = false
    ElMessage.success(editingId.value ? '匯率設定已更新' : '匯率設定已新增')
  }

  const onRateTypeChange = (value: ExchangeRateType) => {
    form.adjustmentMode = 'None'
    form.adjustmentUnit = 'Percent'
    form.adjustmentValue = 0
    if (value === 'Pegged') {
      form.sourceId = 'FXS-005'
      form.dailyFetchTime = '00:00'
      form.configuredRate = 1
    } else if (value === 'Manual') {
      form.sourceId = 'FXS-003'
      form.dailyFetchTime = '00:00'
    } else {
      form.sourceId = marketSourceRows.value[0]?.id || ''
      form.dailyFetchTime = '02:00'
    }
  }

  const toggleConfig = (id: string, value: string | number | boolean) => {
    const updated = store.updateRateConfig(id, { status: value ? 'Active' : 'Inactive' })
    if (updated) ElMessage.success(value ? '匯率設定已啟用' : '匯率設定已停用')
    else ElMessage.warning('請先至幣別管理啟用此幣別')
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

  .pair-cell,
  .el-table small {
    display: block;
  }

  small {
    color: var(--art-gray-600);
  }

  .final-rate {
    color: var(--el-color-primary);
  }

  .settlement-links {
    display: flex;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .result-note {
    max-width: 220px;
    margin-top: 5px;
    white-space: normal;
  }

  .danger {
    color: var(--el-color-danger);
  }

  .warning {
    color: var(--el-color-warning);
  }

  .dialog-form {
    margin-top: 18px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .full {
    width: 100%;
  }

  .field-help {
    margin-top: 5px;
  }

  .rate-preview {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 14px 16px;
    background: var(--art-gray-200);
    border: 1px solid var(--art-gray-300);
    border-radius: 8px;

    span,
    small {
      color: var(--art-gray-600);
    }

    strong {
      font-size: 16px;
    }
  }

  @media (width <= 1000px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 640px) {
    .summary-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      gap: 4px;
      align-items: flex-start;
    }
  }
</style>
