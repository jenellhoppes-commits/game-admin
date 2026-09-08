<template>
  <div class="agent-page">
    <AppPageHeader
      eyebrow="代理後台／分析與財務"
      title="匯率報表"
      description="只讀查詢本代理業務與結算涉及幣別的正式適用匯率及歷史快照。"
    >
      <template #actions><ElTag type="info" effect="plain">全程唯讀</ElTag></template>
    </AppPageHeader>

    <ElCard shadow="never" class="rate-card">
      <ElTabs v-model="activeTab" @tab-change="page = 1">
        <ElTabPane label="正式適用匯率" name="current" />
        <ElTabPane label="歷史快照" name="history" />
      </ElTabs>
      <ArtSearchBar label-position="top"
        v-model="draft"
        :items="searchItems"
        :show-expand="false"
        @search="applyFilters"
        @reset="resetFilters"
      />

      <p class="rate-note">每 1 USDT 可兌換的目標幣數量；適用日期為當日 00:00–23:59。</p>
      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        :data="pagedRows"
        :pagination="{ current: page, size: pageSize, total: filteredRows.length }"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        @pagination:current-change="page = $event"
        @pagination:size-change="pageSize = $event"
        row-key="id"
      >
        <ElTableColumn prop="fromCurrency" label="基準幣" width="85" />
        <ElTableColumn prop="toCurrency" label="目標幣" width="85" />
        <ElTableColumn label="最終匯率" min-width="145" align="right">
          <template #default="{ row }"
            ><span class="rate-number">{{ rate(row.finalRate) }}</span></template
          >
        </ElTableColumn>
        <ElTableColumn prop="date" label="適用日期" min-width="120" />
        <ElTableColumn prop="settingVersion" label="版本" min-width="145" show-overflow-tooltip />
        <ElTableColumn label="狀態" width="80"
          ><template #default
            ><ElTag type="success" effect="plain">正式</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="85" fixed="right">
          <template #default="scope"
            ><ElButton link type="primary" @click="openDetail(scope.row.id)"
              >詳細</ElButton
            ></template
          >
        </ElTableColumn>
      </ArtTable>
    </ElCard>

    <ElDrawer class="partner-drawer"
      v-model="detailVisible"
      title="正式匯率快照"
      size="min(92vw, 560px)"
      @closed="closeDetail"
    >
      <ElResult v-if="!selected" icon="warning" title="無權限或資料不存在" />
      <template v-else>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="快照編號">{{ selected.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="基準幣別">{{ selected.fromCurrency }}</ElDescriptionsItem>
          <ElDescriptionsItem label="目標幣別">{{ selected.toCurrency }}</ElDescriptionsItem>
          <ElDescriptionsItem label="正式最終匯率"
            >1 {{ selected.fromCurrency }} = {{ rate(selected.finalRate) }}
            {{ selected.toCurrency }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="生效期間"
            >{{ selected.date }} 00:00 ～ 23:59</ElDescriptionsItem
          >
          <ElDescriptionsItem label="設定版本">{{
            selected.settingVersion || '未取得'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="鎖定時間">{{
            selected.lockedAt || '未取得'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="狀態">正式鎖定</ElDescriptionsItem>
        </ElDescriptions>
        <ElAlert
          class="agent-dialog-note"
          type="info"
          :closable="false"
          title="只讀快照"
          description="這裡不載入任何內部來源、調整規則、成本或備註。"
        />
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useAgentPortalStore } from '@/store/modules/agentPortal'

  defineOptions({ name: 'AgentPortalExchangeRates' })

  const store = useAgentPortalStore()
  const route = useRoute()
  const router = useRouter()
  const activeTab = ref<'current' | 'history'>('current')
  const draft = ref({ date: '', currency: '' })
  const searchItems = computed(() => [
    {
      key: 'date',
      label: '日期',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', clearable: true }
    },
    {
      key: 'currency',
      label: '目標幣別',
      type: 'select',
      props: {
        clearable: true,
        options: store.visibleCurrencies.map((value) => ({ label: value, value }))
      }
    }
  ])
  const applied = reactive({ date: '', currency: '' })
  const page = ref(1)
  const pageSize = ref(20)
  const detailVisible = ref(false)

  const sourceRows = computed(() => {
    const sorted = [...store.visibleRateHistory].sort(
      (a, b) => b.date.localeCompare(a.date) || a.toCurrency.localeCompare(b.toCurrency)
    )
    if (activeTab.value === 'history') return sorted
    const seen = new Set<string>()
    return sorted.filter((row) => {
      if (seen.has(row.toCurrency)) return false
      seen.add(row.toCurrency)
      return true
    })
  })
  const filteredRows = computed(() =>
    sourceRows.value.filter(
      (row) =>
        (!applied.date || row.date === applied.date) &&
        (!applied.currency || row.toCurrency === applied.currency)
    )
  )
  const pagedRows = computed(() =>
    filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )
  const selected = computed(() =>
    store.visibleRateHistory.find(
      (row) => row.id === String(route.params.id || route.query.snapshot || '')
    )
  )

  watch(pageSize, () => (page.value = 1))
  watch(
    () => [route.params.id, route.query.snapshot],
    () => {
      detailVisible.value = Boolean(route.params.id || route.query.snapshot)
    },
    { immediate: true }
  )

  function applyFilters() {
    Object.assign(applied, draft.value)
    page.value = 1
  }

  function resetFilters() {
    Object.assign(draft.value, { date: '', currency: '' })
    applyFilters()
  }

  function openDetail(id: string) {
    router.push(`/agent/reports/exchange-rates/${id}`)
  }

  function closeDetail() {
    if (route.params.id || route.query.snapshot) router.push('/agent/reports/exchange-rates')
  }

  function rate(value: number) {
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)
  }
</script>

<style scoped lang="scss">
  @use '../shared';
  .rate-note {
    margin: 16px 0 8px;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }
  .rate-number {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .rate-card {
    margin-top: 16px;
  }

  .single-column {
    grid-template-columns: 1fr;
  }
</style>
