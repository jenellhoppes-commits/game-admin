<template>
  <div class="merchant-page">
    <AppPageHeader
      :title="dashboard ? '商戶儀錶板' : '營運報表'"
      :description="`${store.merchant?.name || '無可用商戶'} · Asia/Taipei`"
      ><template #actions
        ><ElButton v-if="!dashboard" @click="download">下載 CSV</ElButton
        ><ElButton v-else @click="goReport">查看營運報表</ElButton></template
      ></AppPageHeader
    >
    <ArtSearchBar
      :model-value="draft"
      @update:model-value="Object.assign(draft, $event)"
      :items="items"
      label-position="top"
      :show-expand="false"
      :is-expand="true"
      @search="search"
      @reset="reset"
    >
      <template #range
        ><ElDatePicker
          v-model="draft.range"
          type="daterange"
          :shortcuts="reportDateShortcuts"
          value-format="YYYY-MM-DD"
          popper-class="merchant-date-popper"
          :clearable="false"
      /></template>
    </ArtSearchBar>
    <ElAlert
      title="共用模擬交易，預設排除測試會員；依下注日期統計已結算局。來源未提供逐筆環境標記，不能作為正式環境結算依據。遊戲輸贏不等於商戶營收或應付金額。"
      type="info"
      :closable="false"
    />
    <template v-if="dashboard">
      <ElCard v-for="total in totals" :key="total.id" shadow="never">
        <template #header>{{ total.currency }} · {{ applied.range.join(' ～ ') }}</template>
        <div class="stats"
          ><ArtStatsCard
            v-for="metric in metrics"
            :key="metric.key"
            :title="metric.title"
            :count="total[metric.key]"
            :description="total.currency + ' · 已結算局'"
            :decimals="
              metric.key === 'rounds' || metric.key === 'members' ? 0 : precision(total.currency)
            "
        /></div>
      </ElCard>
      <ElEmpty v-if="!totals.length" description="此期間沒有符合條件的已結算交易" />
      <ElSpace wrap
        ><ElButton @click="router.push('/merchant/reconciliation')"
          >本商戶待確認對帳：{{
            store.reconciliations.filter((item) => item.status === 'Pending Confirmation').length
          }}</ElButton
        ><ElButton @click="router.push('/merchant/notifications')"
          >未讀通知：{{ store.notices.filter((item) => !item.read).length }}</ElButton
        ><ElButton @click="router.push('/merchant/transactions')">查看交易異常</ElButton></ElSpace
      >
    </template>
    <template v-else>
      <ReferenceCurrencyPreview
        :rows="totals"
        :currencies="store.currencies"
        :rates="store.rates"
        :decimal-places="
          Object.fromEntries(settings.currencies.map((item) => [item.code, item.decimalPlaces]))
        "
      />
      <ElCard v-for="section in sections" :key="section.title" shadow="never">
        <template #header>{{ section.title }}</template>
        <ArtTable
          :data="section.rows"
          :show-table-header="false"
          height="auto"
          row-key="id"
          empty-text="沒有符合條件的資料"
          :pagination="section.total ? undefined : { current: page, size, total: grouped.length }"
          :pagination-options="{ pageSizes: [20, 50, 100] }"
          @pagination:current-change="page = $event"
          @pagination:size-change="changeSize"
          scrollbar-always-on
        >
          <ElTableColumn
            prop="name"
            :label="section.total ? '原幣' : applied.dimension"
            min-width="200"
          />
          <ElTableColumn prop="currency" label="幣別" width="90" />
          <ElTableColumn prop="rounds" label="局數" width="90" /><ElTableColumn
            prop="members"
            label="線路會員數"
            width="120"
          />
          <ElTableColumn
            v-for="metric in moneyMetrics"
            :key="metric.key"
            :label="metric.title"
            min-width="145"
            align="right"
            ><template #default="{ row }">{{
              money(row[metric.key], row.currency)
            }}</template></ElTableColumn
          >
          <ElTableColumn label="實際 RTP" width="120"
            ><template #default="{ row }">{{
              row.betAmount ? ((row.payoutAmount / row.betAmount) * 100).toFixed(2) + '%' : '不適用'
            }}</template></ElTableColumn
          >
        </ArtTable>
      </ElCard>
    </template>
  </div>
</template>
<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import ReferenceCurrencyPreview from '@/components/business/game-provider/reference-currency-preview/index.vue'
  import { useMerchantPortalStore } from '@/store/modules/merchantPortal'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import { reportDateRange, reportDateShortcuts } from '@/utils/reportDateShortcuts'
  import { ElMessage } from 'element-plus'
  import {
    filterMerchantReport,
    aggregateMerchantReport,
    formatMerchantAmount,
    merchantReportCsv
  } from '@/utils/merchantReporting'
  const store = useMerchantPortalStore(),
    settings = useFinanceSettingsStore(),
    route = useRoute(),
    router = useRouter()
  const dashboard = computed(() => route.path.endsWith('/dashboard'))
  const localDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const initial = () => ({
    range: reportDateRange('month').map(localDate),
    line: '',
    currency: '',
    dimension: '線路',
    excludeTest: true
  })
  const draft = reactive(initial()),
    applied = reactive(initial())
  if (typeof route.query.start === 'string' && typeof route.query.end === 'string') {
    draft.range = [route.query.start, route.query.end]
    draft.line = String(route.query.line || '')
    draft.currency = String(route.query.currency || '')
    draft.excludeTest = route.query.excludeTest !== 'false'
    Object.assign(applied, draft, { range: [...draft.range] })
  }
  const page = ref(1),
    size = ref(20)
  const items = computed(() => [
    { key: 'range', label: '下注期間', span: 12 },
    {
      key: 'line',
      label: '授權線路',
      type: 'select',
      props: {
        clearable: true,
        options: store.lines.map((item) => ({ label: item.uid, value: item.uid }))
      }
    },
    {
      key: 'currency',
      label: '原幣',
      type: 'select',
      props: {
        clearable: true,
        options: store.currencies.map((value) => ({ label: value, value }))
      }
    },
    {
      key: 'dimension',
      label: '分析維度',
      type: 'select',
      props: { options: ['線路', '遊戲', '幣別'].map((value) => ({ label: value, value })) }
    },
    { key: 'excludeTest', label: '排除測試會員', type: 'switch' }
  ])
  const filtered = computed(() => filterMerchantReport(store.bets, applied))
  const grouped = computed(() => aggregateMerchantReport(filtered.value, applied.dimension)),
    totals = computed(() => aggregateMerchantReport(filtered.value, '幣別'))
  const sections = computed(() => [
    {
      title: applied.dimension + '分析',
      total: false,
      rows: grouped.value.slice((page.value - 1) * size.value, page.value * size.value)
    },
    { title: '分幣總計（全部查詢結果）', total: true, rows: totals.value }
  ])
  const moneyMetrics = [
    { key: 'betAmount', title: '投注' },
    { key: 'payoutAmount', title: '派彩' },
    { key: 'ggr', title: '遊戲輸贏' }
  ] as const
  const metrics = [
    ...moneyMetrics,
    { key: 'rounds', title: '局數' },
    { key: 'members', title: '活躍線路會員' }
  ] as const
  const precision = (currency: string) =>
    settings.currencies.find((item) => item.code === currency)?.decimalPlaces ?? 2
  const money = (value: number, currency: string) =>
    formatMerchantAmount(value, precision(currency))
  function search() {
    Object.assign(applied, draft, { range: [...draft.range] })
    page.value = 1
    router.replace({
      query: {
        start: applied.range[0],
        end: applied.range[1],
        line: applied.line,
        currency: applied.currency,
        excludeTest: String(applied.excludeTest)
      }
    })
  }
  function reset() {
    Object.assign(draft, initial())
    search()
  }
  function changeSize(value: number) {
    size.value = value
    page.value = 1
  }
  function goReport() {
    router.push({
      path: '/merchant/reports/operations',
      query: {
        start: applied.range[0],
        end: applied.range[1],
        line: applied.line,
        currency: applied.currency,
        excludeTest: String(applied.excludeTest)
      }
    })
  }
  function download() {
    if (!store.lineIds.size) return ElMessage.error('沒有授權線路，不能下載')
    const url = URL.createObjectURL(
      new Blob([merchantReportCsv(grouped.value, totals.value, applied, precision)], {
        type: 'text/csv;charset=utf-8'
      })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `merchant-report-${applied.range.join('_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    store.addLog('下載營運報表', applied.range.join('～'))
  }
</script>
<style lang="scss">
  @use '../date-picker';
</style>
<style scoped>
  .merchant-page {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .merchant-page :deep(.el-date-editor) {
    max-width: 100%;
  }
</style>
