<template>
  <div class="agent-page report-page">
    <AppPageHeader title="代理報表">
      <template #actions>
        <ElButton :disabled="!store.hasPermission('reports:export')" @click="exportCsv"
          >下載 CSV</ElButton
        >
      </template>
    </AppPageHeader>
    <ElTabs v-model="draft.dimension" @tab-change="changeDimension" class="report-tabs">
      <ElTabPane v-for="item in dimensions" :key="item" :label="item" :name="item" />
    </ElTabs>
    <ArtSearchBar
      :model-value="draft"
      @update:model-value="Object.assign(draft, $event)"
      :items="searchItems"
      :show-expand="false"
      :is-expand="true"
      label-position="top"
      :span="6"
      @search="applyFilters"
      @reset="resetFilters"
      class="report-search"
    >
      <template #range>
        <label class="sr-only" for="agent-report-start">開始日期</label>
        <label class="sr-only" for="agent-report-end">結束日期</label>
        <ElDatePicker
          :id="['agent-report-start', 'agent-report-end']"
          v-model="draft.range"
          type="daterange"
          :shortcuts="reportDateShortcuts"
          popper-class="report-date-panel"
          range-separator="至"
          value-format="YYYY-MM-DD"
          :clearable="false"
        />
      </template>
    </ArtSearchBar>
    <ReferenceCurrencyPreview
      :rows="totals"
      :currencies="store.visibleCurrencies"
      :rates="store.visibleRateHistory"
      :decimal-places="Object.fromEntries(financeSettings.currencies.map(item => [item.code, item.decimalPlaces]))"
    />
    <ElCard v-for="section in sections" :key="section.key" shadow="never" class="report-results">
      <template #header>
        <div class="report-section-heading">
          <strong>{{ section.title }}</strong>
          <span>{{ section.note }}</span>
        </div>
      </template>
      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="180px"
        empty-text="沒有符合條件的資料"
        :data="section.rows"
        row-key="id"
        size="default"
        :pagination="
          section.key === 'list'
            ? { current: page, size: pageSize, total: reportRows.length }
            : undefined
        "
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        scrollbar-always-on
        @pagination:current-change="page = $event"
        @pagination:size-change="pageSize = $event"
      >
        <ElTableColumn
          v-if="section.key === 'list' && applied.dimension !== '幣別'"
          prop="name"
          :label="applied.dimension"
          min-width="145"
          fixed="left"
          show-overflow-tooltip
        />
        <ElTableColumn prop="currency" label="幣別" width="72" />
        <ElTableColumn label="商戶數" width="76" align="right"
          ><template #default="{ row }">{{ number(row.merchants) }}</template></ElTableColumn
        >
        <ElTableColumn label="線路數" width="76" align="right"
          ><template #default="{ row }">{{ number(row.lines) }}</template></ElTableColumn
        >
        <ElTableColumn label="局數" min-width="90" align="right"
          ><template #default="{ row }">{{ number(row.rounds) }}</template></ElTableColumn
        >
        <ElTableColumn label="投注" min-width="125" align="right"
          ><template #default="{ row }">{{
            money(row.betAmount, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="派彩" min-width="125" align="right"
          ><template #default="{ row }">{{
            money(row.payoutAmount, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="遊戲輸贏" min-width="125" align="right"
          ><template #default="{ row }">{{ money(row.ggr, row.currency) }}</template></ElTableColumn
        >
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { reportDateShortcuts } from '@/utils/reportDateShortcuts'
  import '@/assets/styles/report-date-picker.scss'
  import { ElMessage } from 'element-plus'
  import ReferenceCurrencyPreview from '@/components/business/game-provider/reference-currency-preview/index.vue'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import {
    CURRENT_AGENT_ID,
    groupAgentMetrics,
    useAgentPortalStore
  } from '@/store/modules/agentPortal'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'

  defineOptions({ name: 'AgentPortalReports' })

  const store = useAgentPortalStore()
  const businessStore = useBusinessPartnerStore()
  const financeSettings = useFinanceSettingsStore()
  const dimensions = ['代理', '商戶', '遊戲', '幣別'] as const
  type Dimension = (typeof dimensions)[number]
  const defaults = {
    range: ['2026-09-01', '2026-09-07'],
    timezone: 'Asia/Taipei',
    dimension: '代理' as Dimension,
    agentId: CURRENT_AGENT_ID,
    relation: 'all',
    currency: ''
  }
  const draft = reactive({ ...defaults, range: [...defaults.range] })
  const applied = reactive({ ...defaults, range: [...defaults.range] })
  const searchItems = computed(() => [
    { key: 'range', label: '期間', span: 12 },
    {
      key: 'timezone',
      label: '時區',
      type: 'select',
      span: 6,
      props: { options: [{ label: 'Asia/Taipei (UTC+8)', value: 'Asia/Taipei' }] }
    },
    {
      key: 'currency',
      label: '原幣別',
      type: 'select',
      span: 6,
      props: {
        clearable: true,
        placeholder: '全部原幣',
        options: store.visibleCurrencies.map((value) => ({ label: value, value }))
      }
    },
    {
      key: 'agentId',
      label: '代理樹範圍',
      type: 'select',
      span: 12,
      props: {
        options: [
          { label: 'A00001 全授權樹', value: CURRENT_AGENT_ID },
          ...store.descendantAgents.map((agent) => ({
            label: agent.code + '／' + agent.name,
            value: agent.id
          }))
        ]
      }
    },
    {
      key: 'relation',
      label: '商戶關係',
      type: 'select',
      span: 6,
      props: {
        options: [
          { label: '全部', value: 'all' },
          { label: '直屬', value: 'direct' },
          { label: '間接', value: 'indirect' }
        ]
      }
    }
  ])
  const page = ref(1)
  const pageSize = ref(20)

  const filteredMetrics = computed(() => {
    const allowedTree = new Set([
      applied.agentId,
      ...businessStore.getDescendants(applied.agentId).map((agent) => agent.id)
    ])
    return store.metricRows.filter(
      (row) =>
        row.date >= applied.range[0] && row.date <= applied.range[1] &&
        allowedTree.has(row.agentId) &&
        (applied.relation === 'all' ||
          (applied.relation === 'direct' && row.agentId === CURRENT_AGENT_ID) ||
          (applied.relation === 'indirect' && row.agentId !== CURRENT_AGENT_ID)) &&
        (!applied.currency || row.currency === applied.currency)
    )
  })
  const reportRows = computed(() => groupAgentMetrics(filteredMetrics.value, applied.dimension))
  const totals = computed(() => groupAgentMetrics(filteredMetrics.value, '幣別'))
  const pagedRows = computed(() =>
    reportRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )

  const sections = computed(() => [
    {
      key: 'list',
      title: applied.dimension + '分析',
      note: '共 ' + number(reportRows.value.length) + ' 筆 · 依投注時間（Asia/Taipei）查詢共用模擬交易 · 按原幣分別統計',
      rows: pagedRows.value
    },
    { key: 'total', title: '分幣總計', note: '全部查詢結果，非僅當頁資料', rows: totals.value }
  ])

  function changeDimension() {
    applied.dimension = draft.dimension
    page.value = 1
  }

  watch(pageSize, () => (page.value = 1))

  function applyFilters() {
    Object.assign(applied, draft, { range: [...draft.range] })
    page.value = 1
  }

  function resetFilters() {
    Object.assign(draft, defaults, { range: [...defaults.range] })
    applyFilters()
  }

  function exportCsv() {
    if (!store.hasPermission('reports:export')) return ElMessage.error('目前角色沒有下載權限')
    const headers = [
      '維度',
      '原幣',
      '商戶數',
      '線路數',
      '局數',
      '活躍線路會員數',
      '投注',
      '派彩',
      '遊戲輸贏'
    ]
    const records = reportRows.value.map((row) => [
      row.name,
      row.currency,
      row.merchants,
      row.lines,
      row.rounds,
      row.activeMembers,
      row.betAmount,
      row.payoutAmount,
      row.ggr
    ])
    const escape = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`
    const csv = `\uFEFF${[headers, ...records].map((row) => row.map(escape).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `agent-report-${applied.range[0]}-${applied.range[1]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    store.addLog('下載代理報表', `${applied.dimension}／A00001 授權樹`)
    ElMessage.success('CSV 已開始下載')
  }

  function money(value: number, currency: string) {
    const digits = financeSettings.currencies.find(item => item.code === currency)?.decimalPlaces ?? 2
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value)
  }

  function number(value: number) {
    return new Intl.NumberFormat('zh-TW').format(value)
  }
</script>

<style scoped lang="scss">
  @use '../shared';
  .report-page {
    font-variant-numeric: tabular-nums;
  }
  .report-tabs :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
  .report-tabs :deep(.el-tabs__content) {
    display: none;
  }
  .report-search {
    margin-bottom: 16px;
  }
  .report-search :deep(.action-column) {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
  }
  .report-search :deep(.action-buttons-wrapper) {
    margin-bottom: 18px;
  }
  .report-search :deep(.el-date-editor),
  .report-search :deep(.el-select) {
    width: 100%;
    min-width: 0;
  }
  .report-results {
    margin-bottom: 16px;
  }
  .report-results :deep(.el-card__header) {
    padding: 14px 20px;
  }
  .report-results :deep(.el-card__body) {
    padding: 12px 20px;
  }
  .report-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .report-section-heading span {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }
  @media (max-width: 640px) {
    .report-search :deep(.el-col) {
      width: 100%;
      max-width: 100%;
      flex: 0 0 100%;
    }
    .report-results :deep(.el-card__body) {
      padding: 8px;
    }
    .report-results :deep(.el-card__header) {
      padding: 12px;
    }
  }
</style>
