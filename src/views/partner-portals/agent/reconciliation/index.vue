<template>
  <div class="agent-page">
    <AppPageHeader title="對帳／結算" description="查看並確認本代理單據；確認不代表付款完成。" />
    <SettlementCarryDemo />
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
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="對帳單號">{{ selected.id }}</ElDescriptionsItem>
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
          <ElDescriptionsItem label="未解決差異"
            >{{ selected.unresolvedDifferenceCount
            }}<span v-if="store.hasPendingDifference(selected.id)"
              >／另有本代理待處理回報</span
            ></ElDescriptionsItem
          >
          <ElDescriptionsItem label="確認時間">{{
            selected.confirmedAt || '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="鎖定時間">{{ selected.lockedAt || '—' }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElDivider>差異回報</ElDivider>
        <ArtTable
          :data="differences"
          :show-table-header="false"
          height="auto"
          empty-text="沒有差異紀錄"
          ><ElTableColumn prop="id" label="差異編號" min-width="180" /><ElTableColumn
            prop="source"
            label="來源單據"
            min-width="190" /><ElTableColumn
            prop="reason"
            label="原因"
            min-width="200" /><ElTableColumn
            prop="status"
            label="處理狀態"
            width="110" /><ElTableColumn prop="resolution" label="處理結果" min-width="180"
        /></ArtTable>
        <ElForm label-position="top">
          <ElFormItem label="關聯參照"
            ><ElInput v-model="form.reference" :disabled="!canReport"
          /></ElFormItem>
          <ElFormItem :label="`差異金額（${selected.currency}）`"
            ><ElInputNumber v-model="form.amount" :disabled="!canReport"
          /></ElFormItem>
          <ElFormItem label="差異原因"
            ><ElInput v-model="form.reason" type="textarea" :disabled="!canReport"
          /></ElFormItem>
          <ElButton :disabled="!canReport" @click="reportDifference">送出差異</ElButton>
        </ElForm>
        <ElDivider>確認本版本</ElDivider>
        <p>未解決差異、缺少計算快照或旗下商戶尚未確認時，不能確認此單據。</p>
        <ElInput
          v-model="note"
          aria-label="確認備註"
          placeholder="確認備註"
          :disabled="!store.canConfirmReconciliation(selected)"
        />
        <ElButton
          type="primary"
          :disabled="!store.canConfirmReconciliation(selected)"
          @click="confirm"
          >確認本版本金額</ElButton
        >
      </template>
    </ElDrawer>
  </div>
</template>
<script setup lang="ts">
  import SettlementCarryDemo from '@/components/business/SettlementCarryDemo.vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useAgentPortalStore } from '@/store/modules/agentPortal'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  const store = useAgentPortalStore(),
    finance = useFinanceSettingsStore()
  const labels: Record<string, string> = {
    Draft: '草稿',
    'Pending Confirmation': '待確認',
    Difference: '差異處理中',
    Confirmed: '已確認',
    Locked: '已鎖定',
    Cancelled: '已取消'
  }
  const draft = reactive({ period: '', currency: '', status: '' }),
    applied = reactive({ ...draft })
  const page = ref(1),
    size = ref(20),
    visible = ref(false),
    selectedId = ref(''),
    note = ref('')
  const form = reactive({ reference: '', amount: 0, reason: '' })
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
  const canReport = computed(
    () =>
      store.hasPermission('finance:confirm') &&
      !!selected.value &&
      !selected.value.lockedAt &&
      ['Pending Confirmation', 'Difference'].includes(selected.value.status)
  )
  const differenceLabels: Record<string, string> = {
    Open: '待處理',
    Investigating: '調查中',
    'Waiting Partner': '待合作方回覆',
    'Waiting Internal': '內部處理中',
    Resolved: '已解決',
    Accepted: '已接受',
    Closed: '已結案',
    Pending: '待處理',
    Approved: '已核准',
    Rejected: '已退回'
  }
  const differences = computed(() => [
    ...store.getReconciliationDifferences(selectedId.value).map((r) => ({
      id: r.id,
      source: r.merchantName + '／' + r.reconciliationId,
      reason: r.description,
      status: differenceLabels[r.status] || r.status,
      resolution: r.resolution || '尚未提供'
    })),
    ...store.requests
      .filter((r) => r.category === '差異' && r.targetId === selectedId.value)
      .map((r) => ({
        id: r.id,
        reason: r.reason,
        status: differenceLabels[r.status] || r.status,
        resolution: r.status === 'Pending' ? '待處理' : '請依正式差異紀錄查看結果'
      }))
  ])
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
    note.value = ''
    Object.assign(form, { reference: '', amount: 0, reason: '' })
  }
  function money(value: number, currency: string) {
    const digits = finance.currencies.find((c) => c.code === currency)?.decimalPlaces ?? 2
    return value.toLocaleString('zh-TW', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })
  }
  function reportDifference() {
    if (!selected.value || !canReport.value) return
    const result = store.submitDifferenceRequest({
      ...form,
      reconciliationId: selected.value.id,
      currency: selected.value.currency
    })
    ElMessage[result.ok ? 'success' : 'error'](result.message)
    if (result.ok) Object.assign(form, { reference: '', amount: 0, reason: '' })
  }
  async function confirm() {
    const record = selected.value
    if (!record) return
    try {
      await ElMessageBox.confirm(
        `確認 ${record.id} 的 ${money(record.finalSettlementAmount, record.currency)} ${record.currency}？`,
        '確認對帳版本',
        { confirmButtonText: '確認', cancelButtonText: '取消' }
      )
      const result = store.confirmOwnReconciliation(
        record.id,
        record.finalSettlementAmount,
        note.value
      )
      ElMessage[result.ok ? 'success' : 'error'](result.message)
    } catch {
      /* 使用者取消 */
    }
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
    line-height: 1.6;
    margin-bottom: 12px;
  }
</style>
