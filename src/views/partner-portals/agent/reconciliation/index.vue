<template>
  <div class="agent-page">
    <AppPageHeader title="對帳／結算" description="查看本代理結算單、計算依據與財務交付結果。" />
    <Collections />
    <ArtSearchBar
      label-position="top"
      :model-value="draft"
      @update:model-value="Object.assign(draft, $event)"
      :items="items"
      :show-expand="false"
      :is-expand="true"
      @search="search"
      @reset="reset"
    />
    <ElCard shadow="never">
      <ArtTable
        :data="rows.slice((page - 1) * size, page * size)"
        :show-table-header="false"
        height="auto"
        :pagination="{ current: page, size, total: rows.length }"
        @pagination:current-change="page = $event"
        @pagination:size-change="changePageSize"
      >
        <ElTableColumn prop="period" label="期間" width="110" />
        <ElTableColumn prop="id" label="對帳單號" min-width="180" />
        <ElTableColumn prop="currency" label="幣別" width="80" />
        <ElTableColumn label="結算方式" min-width="110"
          ><template #default="{ row }">{{
            row.settlementMode || '未設定'
          }}</template></ElTableColumn
        ><ElTableColumn label="上期累積金額" min-width="150"
          ><template #default="{ row }">{{
            row.previousAccumulatedAmount === undefined
              ? '待定'
              : money(row.previousAccumulatedAmount, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="結算金額" min-width="150" align="right"
          ><template #default="{ row }">{{
            money(row.finalSettlementAmount, row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" min-width="120"
          ><template #default="{ row }">{{ labels[row.status] }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="open(row.id)">詳細</ElButton></template
          ></ElTableColumn
        >
      </ArtTable>
    </ElCard>
    <ElDrawer
      class="partner-drawer"
      v-model="visible"
      title="本代理對帳明細"
      size="min(760px, 100%)"
    >
      <template v-if="selected">
        <DeliverySummary
          :delivery="selected.delivery"
          :currency="selected.snapshot.settlementCurrency"
        />
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="對帳單號">{{ selected.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收付模式">{{
            selected.collection?.mode === 'PlatformCollect' ? '平台代收' : '代理統收'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="付款方">{{
            selected.collection?.payerName || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收款方">{{
            selected.collection?.payeeName || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="期間"
            >{{ selected.periodStart }} ～ {{ selected.periodEnd }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="狀態">{{ labels[selected.status] }}</ElDescriptionsItem>
          <ElDescriptionsItem label="投注"
            >{{ money(selected.betAmount, selected.currency) }}
            {{ selected.currency }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="派彩"
            >{{ money(selected.payoutAmount, selected.currency) }}
            {{ selected.currency }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="遊戲輸贏"
            >{{ money(selected.ggr, selected.currency) }}
            {{ selected.currency }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="結算方式">{{
            selected.settlementMode || '未設定'
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="上期累積金額">{{
            selected.previousAccumulatedAmount === undefined
              ? '待定'
              : money(selected.previousAccumulatedAmount, selected.currency)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="結算金額"
            >{{ money(selected.finalSettlementAmount, selected.currency) }}
            {{ selected.currency }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="公式版本">{{
            selected.snapshot.formulaVersion || '尚未確認'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="匯率快照">{{
            selected.snapshot.exchangeRateSnapshotIds.join('、') || '尚未提供'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="確認時間">{{
            selected.confirmedAt || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="鎖定時間">{{ selected.lockedAt || '—' }}</ElDescriptionsItem>
        </ElDescriptions>
        <p>財務於核帳／交付時記錄調整與收付，確認後鎖定。</p>
      </template>
    </ElDrawer>
  </div>
</template>
<script setup lang="ts">
  import Collections from './Collections.vue'
  import DeliverySummary from '@/components/business/game-provider/DeliverySummary.vue'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useAgentPortalStore } from '@/store/modules/agentPortal'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  const store = useAgentPortalStore(),
    finance = useFinanceSettingsStore()
  const labels: Record<string, string> = {
    Draft: '草稿',
    'Pending Confirmation': '待確認',
    Difference: '待確認',
    Confirmed: '已確認',
    Locked: '已鎖定',
    Cancelled: '已取消'
  }
  const draft = reactive({ period: '', currency: '', status: '' }),
    applied = reactive({ ...draft })
  const page = ref(1),
    size = ref(20),
    visible = ref(false),
    selectedId = ref('')
  const items = computed(() => [
    {
      key: 'period',
      label: '期間',
      type: 'input',
      props: { placeholder: '例如 2026-08', clearable: true }
    },
    {
      key: 'currency',
      label: '幣別',
      type: 'select',
      props: {
        clearable: true,
        options: [...new Set(store.ownReconciliations.map((r) => r.currency))].map((value) => ({
          value,
          label: value
        }))
      }
    },
    {
      key: 'status',
      label: '狀態',
      type: 'select',
      props: {
        clearable: true,
        options: Object.entries(labels).map(([value, label]) => ({ value, label }))
      }
    }
  ])
  const rows = computed(() =>
    store.ownReconciliations.filter(
      (r) =>
        (!applied.period || r.period.includes(applied.period)) &&
        (!applied.currency || r.currency === applied.currency) &&
        (!applied.status || r.status === applied.status)
    )
  )
  const selected = computed(() => store.ownReconciliations.find((r) => r.id === selectedId.value))
  function search() {
    Object.assign(applied, draft)
    page.value = 1
  }
  function reset() {
    Object.assign(draft, { period: '', currency: '', status: '' })
    search()
  }
  function open(id: string) {
    selectedId.value = id
    visible.value = true
  }
  function money(value: number, currency: string) {
    const digits = finance.currencies.find((c) => c.code === currency)?.decimalPlaces ?? 2
    return value.toLocaleString('zh-TW', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })
  }
  function changePageSize(value: number) {
    size.value = value
    page.value = 1
  }
</script>
<style scoped lang="scss">
  @use '../shared';

  .el-form {
    margin-top: 12px;
  }

  p {
    margin-bottom: 12px;
    line-height: 1.6;
  }
</style>
