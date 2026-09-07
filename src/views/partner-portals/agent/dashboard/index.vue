<template>
  <div class="agent-page">
    <AppPageHeader
      eyebrow="代理後台／首頁"
      title="代理儀錶板"
      description="授權代理樹、商戶覆蓋、原幣彙總與本代理待辦。"
    >
      <template #actions>
        <ElTag effect="plain" type="success">A00001／L1 授權樹</ElTag>
      </template>
    </AppPageHeader>

    <ElCard shadow="never" class="agent-filter-card">
      <ElForm inline @submit.prevent="applyFilters">
        <ElFormItem label="資料期間">
          <label class="sr-only" for="agent-dashboard-start">開始日期</label>
          <label class="sr-only" for="agent-dashboard-end">結束日期</label>
          <ElDatePicker
            :id="['agent-dashboard-start', 'agent-dashboard-end']"
            v-model="draftRange"
            type="daterange"
            :shortcuts="reportDateShortcuts"
            popper-class="report-date-panel"
            range-separator="至"
            value-format="YYYY-MM-DD"
            :clearable="false"
          />
        </ElFormItem>
        <ElFormItem label="原幣別">
          <ElSelect v-model="draftCurrency" clearable placeholder="全部原幣">
            <ElOption
              v-for="currency in store.visibleCurrencies"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" native-type="submit">查詢</ElButton>
          <ElButton @click="resetFilters">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <div class="agent-kpi-grid">
      <ArtStatsCard
        v-for="metric in relationshipMetrics"
        :key="metric.label"
        :title="metric.label"
        :count="metric.value"
        :description="metric.note"
      />
    </div>

    <div v-if="appliedCurrency && filteredMetrics.length" class="agent-kpi-grid">
      <ArtStatsCard
        v-for="metric in operationMetrics"
        :key="metric.label"
        :title="metric.label"
        :count="metric.value"
        :description="metric.note"
        :decimals="metric.label === '活躍線路會員數' ? 0 : (financeSettings.currencies.find(item => item.code === appliedCurrency)?.decimalPlaces ?? 2)"
      />
    </div>

    <ElCard shadow="never" class="dashboard-tasks">
      <template #header><strong>待辦事項</strong></template>
      <div class="task-grid">
        <ElButton
          v-for="task in tasks"
          :key="task.path"
          class="task-button"
          @click="router.push(task.path)"
        >
          <span>{{ task.title }}</span
          ><ElTag :type="task.count ? 'warning' : 'info'" effect="plain">{{ task.count }}</ElTag>
        </ElButton>
      </div>
    </ElCard>
    <ElCard shadow="never">
      <template #header>
        <div class="agent-card-title"
          ><strong>原幣營運彙總</strong>
          <ElButton link type="primary" @click="router.push('/agent/reports/operations')"
            >查看報表</ElButton
          >
        </div>
      </template>
      <ArtTable
        :data="summaries"
        row-key="id"
        :show-table-header="false"
        height="auto"
        empty-height="180px"
        empty-text="此條件沒有營運資料"
        scrollbar-always-on
      >
        <ElTableColumn prop="currency" label="幣別" width="90" fixed="left" />
        <ElTableColumn label="投注" min-width="150" align="right"
          ><template #default="{ row }">{{
            amount(row.betAmount, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="派彩" min-width="150" align="right"
          ><template #default="{ row }">{{
            amount(row.payoutAmount, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="遊戲輸贏" min-width="150" align="right"
          ><template #default="{ row }">{{
            amount(row.ggr, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="局數" min-width="110" align="right"
          ><template #default="{ row }">{{ number(row.rounds) }}</template></ElTableColumn
        >
      </ArtTable>
      <p class="summary-note">依投注時間（Asia/Taipei）查詢共用模擬交易，按原幣分別統計。收益計算規則待確認，遊戲輸贏不代表代理收益。</p>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { reportDateShortcuts } from '@/utils/reportDateShortcuts'
  import '@/assets/styles/report-date-picker.scss'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import { groupAgentMetrics, useAgentPortalStore } from '@/store/modules/agentPortal'

  defineOptions({ name: 'AgentPortalDashboardStage2' })

  const store = useAgentPortalStore()
  const router = useRouter()
  const financeSettings = useFinanceSettingsStore()
  const tasks = computed(() => [
    { title: '待審關係申請', count: pending('關係'), path: '/agent/relationships' },
    { title: '待審商戶申請', count: pending('商戶'), path: '/agent/merchants' },
    { title: '待確認對帳', count: pendingReconciliations.value, path: '/agent/reconciliation' },
    { title: '未讀公告', count: store.unreadCount, path: '/agent/notifications' }
  ])
  function amount(value: number, currency: string) {
    const digits =
      financeSettings.currencies.find((item) => item.code === currency)?.decimalPlaces ?? 2
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value)
  }
  const defaultRange = ['2026-09-01', '2026-09-07']
  const draftRange = ref([...defaultRange])
  const appliedRange = ref([...defaultRange])
  const draftCurrency = ref('')
  const appliedCurrency = ref('')

  const filteredMetrics = computed(() =>
    store.metricRows.filter(
      (row) => row.date >= appliedRange.value[0] && row.date <= appliedRange.value[1] &&
        (!appliedCurrency.value || row.currency === appliedCurrency.value)
    )
  )
  const summaries = computed(() => groupAgentMetrics(filteredMetrics.value, '幣別'))
  const relationshipMetrics = computed(() => [
    { label: '直屬下級', value: store.directChildren.length, note: '直接父子關係' },
    { label: '後代代理', value: store.descendantAgents.length, note: 'L2／L3 去重' },
    { label: '直屬商戶', value: store.directMerchants.length, note: 'A00001 直接關係' },
    { label: '覆蓋商戶', value: store.allMerchants.length, note: '授權樹內去重' }
  ])
  const operationMetrics = computed(() => {
    const rows = summaries.value
    const currencies = new Set(rows.map((row) => row.currency))
    const label = currencies.size === 1 ? [...currencies][0] : '分幣查看'
    return [
      { label: '投注總額', value: rows.reduce((sum, row) => sum + row.betAmount, 0), note: label },
      { label: '派彩總額', value: rows.reduce((sum, row) => sum + row.payoutAmount, 0), note: label },
      { label: '遊戲輸贏', value: rows.reduce((sum, row) => sum + row.ggr, 0), note: label },
      {
        label: '活躍線路會員數',
        value: summaries.value.reduce((sum, row) => sum + row.activeMembers, 0),
        note: `${number(summaries.value.reduce((sum, row) => sum + row.rounds, 0))} 局；不提供個資`
      }
    ]
  })
  const pendingReconciliations = computed(
    () =>
      store.ownReconciliations.filter((record) => record.status === 'Pending Confirmation').length
  )

  function pending(category: '關係' | '商戶') {
    return store.requests.filter(
      (request) => request.category === category && request.status === 'Pending'
    ).length
  }

  function applyFilters() {
    appliedRange.value = [...draftRange.value]
    appliedCurrency.value = draftCurrency.value
  }

  function resetFilters() {
    draftRange.value = [...defaultRange]
    draftCurrency.value = ''
    applyFilters()
  }

  function sumDisplay(rows: typeof store.metricRows, key: 'betAmount' | 'payoutAmount' | 'ggr') {
    const currencies = [...new Set(rows.map((row) => row.currency))]
    if (currencies.length !== 1) return '請選擇原幣'
    return money(
      rows.reduce((sum, row) => sum + row[key], 0),
      currencies[0]
    )
  }

  function money(value: number, currency: string) {
    return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)} ${currency}`
  }

  function number(value: number) {
    return new Intl.NumberFormat('zh-TW').format(value)
  }
</script>

<style scoped lang="scss">
  @use '../shared';
  .dashboard-tasks {
    margin-bottom: 16px;
  }
  .task-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .task-button {
    width: 100%;
    margin: 0;
    height: 48px;
  }
  .task-button :deep(> span) {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }
  .summary-note {
    margin: 12px 0 0;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }
  @media (max-width: 960px) {
    .task-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    .task-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
