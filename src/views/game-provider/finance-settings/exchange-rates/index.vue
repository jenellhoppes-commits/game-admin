<template>
  <div class="page">
    <AppPageHeader
      :title="copy.title"
      eyebrow="財務設定 · 匯率管理"
      :description="copy.description"
    >
      <template #actions>
        <ElButton @click="ElMessage.success('資料已匯出')">匯出</ElButton>
        <ElButton v-if="mode === 'daily'" type="primary" @click="dialogVisible = true"
          >新增匯率</ElButton
        >
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <div
        ><span>今日已發布</span><strong>{{ todayPublished }}</strong
        ><small>2026-09-04 匯率</small></div
      >
      <div
        ><span>啟用來源</span><strong>{{ activeSources }}</strong
        ><small>依優先序取值</small></div
      >
      <div
        ><span>異常預警</span><strong class="danger">{{ triggeredAlerts }}</strong
        ><small>等待財務確認</small></div
      >
      <div
        ><span>歷史快照</span><strong>{{ lockedRates }}</strong
        ><small>鎖定後不可修改</small></div
      >
    </div>

    <ElAlert :title="copy.rule" type="info" :closable="false" show-icon />
    <ElCard v-if="!['sources', 'logs'].includes(mode)" shadow="never" class="filter-card">
      <ElForm inline>
        <ElFormItem label="幣別對"
          ><ElInput v-model="filters.keyword" clearable placeholder="例如 USD/TWD"
        /></ElFormItem>
        <ElFormItem v-if="['daily', 'history', 'adjustments'].includes(mode)" label="日期"
          ><ElDatePicker v-model="filters.date" value-format="YYYY-MM-DD" clearable
        /></ElFormItem>
        <ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="table-card">
      <div class="toolbar"
        ><div
          ><strong>{{ copy.tableTitle }}</strong
          ><span>共 {{ rowCount }} 筆</span></div
        ><span>{{ copy.hint }}</span></div
      >

      <ElTable
        v-if="['daily', 'history', 'adjustments'].includes(mode)"
        :data="rateRows"
        border
        row-key="id"
      >
        <ElTableColumn label="幣別對" min-width="150" fixed="left"
          ><template #default="scope"
            ><strong>{{ scope.row.fromCurrency }}/{{ scope.row.toCurrency }}</strong
            ><br /><small>{{ scope.row.id }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn prop="date" label="匯率日期" width="120" />
        <ElTableColumn label="基準匯率" min-width="140" align="right"
          ><template #default="scope">{{ formatRate(scope.row.baseRate) }}</template></ElTableColumn
        >
        <ElTableColumn v-if="mode === 'adjustments'" label="調整比例" min-width="180"
          ><template #default="scope"
            ><ElInputNumber
              :model-value="scope.row.adjustmentPercent"
              :min="-10"
              :max="10"
              :precision="2"
              :step="0.05"
              :disabled="scope.row.status === 'Locked'"
              @change="adjust(scope.row.id, $event)"
            /><span class="suffix">%</span></template
          ></ElTableColumn
        >
        <ElTableColumn v-else label="調整" width="100" align="right"
          ><template #default="scope"
            >{{ scope.row.adjustmentPercent > 0 ? '+' : ''
            }}{{ scope.row.adjustmentPercent }}%</template
          ></ElTableColumn
        >
        <ElTableColumn label="最終匯率" min-width="140" align="right"
          ><template #default="scope"
            ><strong>{{ formatRate(scope.row.finalRate) }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="來源" min-width="160"
          ><template #default="scope">{{ sourceName(scope.row.sourceId) }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" width="100"
          ><template #default="scope"
            ><ElTag :type="rateStatusType(scope.row.status)">{{
              rateStatusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn v-if="mode === 'daily'" label="操作" width="100" fixed="right"
          ><template #default="scope"
            ><ElButton
              v-if="scope.row.status === 'Draft'"
              link
              type="primary"
              @click="publish(scope.row.id)"
              >發布</ElButton
            ><span v-else>—</span></template
          ></ElTableColumn
        >
      </ElTable>

      <ElTable v-else-if="mode === 'sources'" :data="store.sources" border row-key="id">
        <ElTableColumn label="匯率來源" min-width="220" fixed="left"
          ><template #default="scope"
            ><strong>{{ scope.row.name }}</strong
            ><br /><small>{{ scope.row.id }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn prop="type" label="類型" width="110" /><ElTableColumn
          prop="priority"
          label="優先序"
          width="100"
          align="center"
        />
        <ElTableColumn label="更新頻率" width="130"
          ><template #default="scope">{{
            scope.row.refreshMinutes ? `${scope.row.refreshMinutes} 分鐘` : '人工更新'
          }}</template></ElTableColumn
        >
        <ElTableColumn label="健康狀態" width="110"
          ><template #default="scope"
            ><ElTag :type="scope.row.health === 'Normal' ? 'success' : 'warning'">{{
              healthLabel(scope.row.health)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn prop="lastSyncedAt" label="最後同步" min-width="160" /><ElTableColumn
          label="啟用"
          width="90"
          align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.status === 'Active'"
              @change="toggleSource(scope.row.id, $event)" /></template
        ></ElTableColumn>
      </ElTable>

      <ElTable v-else-if="mode === 'alerts'" :data="alertRows" border row-key="id">
        <ElTableColumn
          prop="currencyPair"
          label="幣別對"
          min-width="150"
          fixed="left"
        /><ElTableColumn label="預警門檻" min-width="180"
          ><template #default="scope"
            ><ElInputNumber
              :model-value="scope.row.thresholdPercent"
              :min="0.1"
              :max="20"
              :precision="1"
              :step="0.5"
              @change="updateAlert(scope.row.id, $event)"
            /><span class="suffix">%</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="目前變動" width="120" align="right"
          ><template #default="scope"
            ><strong :class="{ danger: scope.row.status === 'Triggered' }"
              >{{ scope.row.currentChangePercent }}%</strong
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="狀態" width="110"
          ><template #default="scope"
            ><ElTag :type="alertType(scope.row.status)">{{
              alertLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn prop="lastTriggeredAt" label="最近觸發" min-width="160"
          ><template #default="scope">{{
            scope.row.lastTriggeredAt || '—'
          }}</template></ElTableColumn
        >
        <ElTableColumn label="啟用" width="90" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.enabled"
              @change="store.updateAlert(scope.row.id, { enabled: Boolean($event) })" /></template
        ></ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right"
          ><template #default="scope"
            ><ElButton
              v-if="scope.row.status === 'Triggered'"
              link
              type="primary"
              @click="acknowledge(scope.row.id)"
              >確認預警</ElButton
            ><span v-else>—</span></template
          ></ElTableColumn
        >
      </ElTable>

      <ElTable v-else :data="store.logs" border row-key="id">
        <ElTableColumn prop="createdAt" label="時間" min-width="160" fixed="left" /><ElTableColumn
          prop="target"
          label="對象"
          min-width="170"
        /><ElTableColumn prop="action" label="操作" min-width="150" /><ElTableColumn
          prop="beforeValue"
          label="修改前"
          min-width="160"
          show-overflow-tooltip
        /><ElTableColumn
          prop="afterValue"
          label="修改後"
          min-width="160"
          show-overflow-tooltip
        /><ElTableColumn prop="operator" label="操作人" width="120" /><ElTableColumn
          prop="note"
          label="說明"
          min-width="220"
        />
      </ElTable>
    </ElCard>

    <ElDialog v-model="dialogVisible" title="新增每日匯率" width="min(560px, 92vw)">
      <ElAlert
        title="新增後先保留為草稿，經確認發布後才提供交易與結算使用。"
        type="warning"
        :closable="false"
      />
      <ElForm label-position="top" class="dialog-form">
        <ElFormItem label="匯率日期" required
          ><ElDatePicker v-model="form.date" value-format="YYYY-MM-DD" class="full"
        /></ElFormItem>
        <div class="form-grid"
          ><ElFormItem label="來源幣別" required
            ><ElSelect v-model="form.fromCurrency" class="full"
              ><ElOption
                v-for="item in store.transactionCurrencies"
                :key="item.code"
                :label="`${item.code}｜${item.name}`"
                :value="item.code" /></ElSelect></ElFormItem
          ><ElFormItem label="目標幣別" required
            ><ElSelect v-model="form.toCurrency" class="full"
              ><ElOption
                v-for="item in store.currencies"
                :key="item.code"
                :label="`${item.code}｜${item.name}`"
                :value="item.code" /></ElSelect></ElFormItem
        ></div>
        <div class="form-grid"
          ><ElFormItem label="基準匯率" required
            ><ElInputNumber
              v-model="form.baseRate"
              :min="0.000001"
              :precision="6"
              class="full" /></ElFormItem
          ><ElFormItem label="調整比例"
            ><ElInputNumber
              v-model="form.adjustmentPercent"
              :min="-10"
              :max="10"
              :precision="2"
              class="full" /></ElFormItem
        ></div>
        <ElFormItem label="匯率來源"
          ><ElSelect v-model="form.sourceId" class="full"
            ><ElOption
              v-for="item in activeSourceRows"
              :key="item.id"
              :label="item.name"
              :value="item.id" /></ElSelect
        ></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="dialogVisible = false">取消</ElButton
        ><ElButton type="primary" @click="createRate">建立草稿</ElButton></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type {
    ExchangeRateAlertRecord,
    ExchangeRateStatus,
    ExchangeSourceHealth
  } from '@/types/game-provider'

  defineOptions({ name: 'FinanceExchangeRateSettings' })
  const route = useRoute()
  const store = useFinanceSettingsStore()
  const filters = reactive({ keyword: '', date: '' })
  const dialogVisible = ref(false)
  const form = reactive({
    date: '2026-09-04',
    fromCurrency: 'USD',
    toCurrency: 'TWD',
    baseRate: 32.05,
    adjustmentPercent: 0,
    sourceId: 'FXS-001'
  })
  const nameModes = {
    ExchangeRateSources: 'sources',
    ExchangeRateAdjustments: 'adjustments',
    ExchangeRateHistory: 'history',
    ExchangeRateAlerts: 'alerts',
    ExchangeRateLogs: 'logs'
  }
  const mode = computed(() => nameModes[String(route.name) as keyof typeof nameModes] || 'daily')
  const copies = {
    daily: {
      title: '每日匯率',
      tableTitle: '每日匯率清單',
      description: '建立、檢查並發布平台每日使用的幣別換算匯率。',
      rule: '草稿可調整；發布後供當日計算使用；進入歷史期後鎖定，不回寫既有快照。',
      hint: '匯率以 1 單位來源幣別換算'
    },
    sources: {
      title: '匯率來源',
      tableTitle: '來源與優先序',
      description: '管理自動與人工匯率來源、更新頻率及備援順序。',
      rule: '取值會依啟用來源的優先序執行；來源異常時自動使用下一順位。',
      hint: '至少保留一個可用來源'
    },
    adjustments: {
      title: '匯率調整',
      tableTitle: '匯率加減成',
      description: '在基準匯率上設定財務加成或減成，產生平台最終匯率。',
      rule: '最終匯率＝基準匯率 ×（1＋調整比例）；已鎖定匯率不可再修改。',
      hint: '每次異動均保留紀錄'
    },
    history: {
      title: '歷史匯率',
      tableTitle: '歷史匯率快照',
      description: '查詢已鎖定的每日匯率與當時使用來源。',
      rule: '歷史匯率為稽核快照，只能查詢與匯出，不能編輯或重新計算。',
      hint: '依日期與幣別對追溯'
    },
    alerts: {
      title: '匯率預警',
      tableTitle: '波動預警規則',
      description: '監控匯率日變動幅度，協助財務及時確認異常波動。',
      rule: '超過門檻會標示為待確認；確認預警不會自動變更或發布匯率。',
      hint: '預警與匯率發布分開處理'
    },
    logs: {
      title: '更新紀錄',
      tableTitle: '匯率操作紀錄',
      description: '追蹤來源同步、匯率調整、發布及預警確認等操作。',
      rule: '所有影響匯率與結算規則的操作皆須保留操作人、時間與前後值。',
      hint: '不可刪除的稽核軌跡'
    }
  }
  const copy = computed(() => copies[mode.value as keyof typeof copies])
  const todayPublished = computed(
    () =>
      store.dailyRates.filter((item) => item.date === '2026-09-04' && item.status === 'Published')
        .length
  )
  const activeSources = computed(
    () => store.sources.filter((item) => item.status === 'Active').length
  )
  const activeSourceRows = computed(() => store.sources.filter((item) => item.status === 'Active'))
  const triggeredAlerts = computed(
    () => store.alerts.filter((item) => item.status === 'Triggered').length
  )
  const lockedRates = computed(
    () => store.dailyRates.filter((item) => item.status === 'Locked').length
  )
  const rateRows = computed(() =>
    store.dailyRates.filter((item) => {
      if (mode.value === 'history' && item.status !== 'Locked') return false
      if (mode.value !== 'history' && filters.date && item.date !== filters.date) return false
      const pair = `${item.fromCurrency}/${item.toCurrency}`
      return !filters.keyword || pair.toLowerCase().includes(filters.keyword.toLowerCase())
    })
  )
  const alertRows = computed(() =>
    store.alerts.filter(
      (item) =>
        !filters.keyword || item.currencyPair.toLowerCase().includes(filters.keyword.toLowerCase())
    )
  )
  const rowCount = computed(() =>
    mode.value === 'sources'
      ? store.sources.length
      : mode.value === 'alerts'
        ? alertRows.value.length
        : mode.value === 'logs'
          ? store.logs.length
          : rateRows.value.length
  )
  const reset = () => {
    filters.keyword = ''
    filters.date = ''
  }
  const formatRate = (value: number) =>
    value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  const sourceName = (id: string) => store.sources.find((item) => item.id === id)?.name || id
  const rateStatusLabel = (status: ExchangeRateStatus) =>
    ({ Draft: '草稿', Published: '已發布', Locked: '已鎖定' })[status]
  const rateStatusType = (status: ExchangeRateStatus) =>
    status === 'Published' ? 'success' : status === 'Locked' ? 'info' : 'warning'
  const healthLabel = (health: ExchangeSourceHealth) =>
    ({ Normal: '正常', Delayed: '延遲', Unavailable: '無法使用' })[health]
  const alertLabel = (status: ExchangeRateAlertRecord['status']) =>
    ({ Normal: '正常', Triggered: '待確認', Acknowledged: '已確認' })[status]
  const alertType = (status: ExchangeRateAlertRecord['status']) =>
    status === 'Normal' ? 'success' : status === 'Triggered' ? 'danger' : 'info'
  const toggleSource = (id: string, value: string | number | boolean) => {
    store.updateSource(id, { status: value ? 'Active' : 'Inactive' })
    ElMessage.success('來源狀態已更新')
  }
  const adjust = (id: string, value: number | undefined) => {
    if (value === undefined) return
    if (store.updateRateAdjustment(id, value)) ElMessage.success('匯率調整已更新')
  }
  const publish = (id: string) => {
    if (store.publishRate(id)) ElMessage.success('匯率已發布')
  }
  const acknowledge = (id: string) => {
    if (store.acknowledgeAlert(id)) ElMessage.success('預警已確認')
  }
  const updateAlert = (id: string, value: number | undefined) => {
    if (value === undefined) return
    store.updateAlert(id, { thresholdPercent: value })
    ElMessage.success('預警門檻已更新')
  }
  const createRate = () => {
    if (form.fromCurrency === form.toCurrency) return ElMessage.warning('來源與目標幣別不可相同')
    store.createRate({ ...form })
    dialogVisible.value = false
    ElMessage.success('每日匯率草稿已建立')
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

  .danger {
    color: var(--el-color-danger);
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

  .suffix {
    margin-left: 5px;
    color: var(--art-gray-600);
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

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 600px) {
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
