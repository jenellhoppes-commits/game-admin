<template>
  <div class="page">
    <AppPageHeader
      :title="isMerchant ? '商戶結算單' : '代理結算單'"
      eyebrow="結算管理"
      :description="
        isMerchant
          ? '查詢商戶線路的應結、調整與付款狀態。'
          : '查詢代理層級彙總、旗下商戶數與付款狀態。'
      "
      ><template #actions
        ><ElButton @click="ElMessage.success('結算單資料已更新')">重新整理</ElButton
        ><ElButton @click="ElMessage.success('結算單已匯出')">匯出</ElButton></template
      ></AppPageHeader
    >
    <div class="summary-grid"
      ><button type="button" @click="filters.status = ''"
        ><span>全部結算單</span><strong>{{ rows.length }}</strong
        ><small>目前資料範圍</small></button
      ><button type="button" @click="filters.status = 'Pending Review'"
        ><span>待審核</span><strong>{{ count('Pending Review') }}</strong
        ><small>等待財務覆核</small></button
      ><button type="button" @click="filters.status = 'Approved'"
        ><span>已核准</span><strong>{{ count('Approved') }}</strong
        ><small>等待付款</small></button
      ><button type="button" @click="filters.status = 'Paid'"
        ><span>已付款</span><strong>{{ count('Paid') }}</strong
        ><small>已完成結算</small></button
      ></div
    >
    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput
            v-model="filters.keyword"
            clearable
            :placeholder="isMerchant ? '商戶、線路或結算單' : '代理或結算單'" /></ElFormItem
        ><ElFormItem label="批次"
          ><ElSelect v-model="filters.batchId" clearable placeholder="全部批次"
            ><ElOption
              v-for="batch in store.settlementBatches"
              :key="batch.id"
              :label="batch.name"
              :value="batch.id" /></ElSelect></ElFormItem
        ><ElFormItem label="狀態"
          ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
            ><ElOption label="草稿" value="Draft" /><ElOption
              label="待審核"
              value="Pending Review" /><ElOption label="已核准" value="Approved" /><ElOption
              label="已付款"
              value="Paid" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >
    <ElCard shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>{{ isMerchant ? '商戶結算單清單' : '代理結算單清單' }}</strong
          ><span>共 {{ filteredRows.length }} 筆</span></div
        ></div
      ><SettlementTable
        :rows="filteredRows"
        :type="isMerchant ? 'merchant' : 'agent'"
        show-actions
        @open="openDrawer"
    /></ElCard>

    <ElDrawer
      v-model="drawerVisible"
      :title="current ? `結算單｜${current.id}` : '結算單'"
      :size="drawerSize"
      destroy-on-close
      @closed="selectedId = ''"
    >
      <template v-if="current"
        ><div class="drawer-tags"
          ><ElTag :type="statusType(current.status)">{{ statusLabel(current.status) }}</ElTag
          ><ElTag effect="plain">{{ current.settlementCurrency }}</ElTag></div
        ><div class="amount-card"
          ><span>最終應結金額</span
          ><strong>{{ money(current.finalAmount, current.settlementCurrency) }}</strong
          ><small
            >原始 {{ money(current.grossAmount, current.settlementCurrency) }}／調整
            {{ money(current.adjustmentAmount, current.settlementCurrency) }}</small
          ></div
        ><ElDescriptions :column="drawerColumns" border
          ><ElDescriptionsItem label="結算批次">{{ current.batchId }}</ElDescriptionsItem
          ><ElDescriptionsItem label="來源對帳">{{ current.reconciliationId }}</ElDescriptionsItem
          ><ElDescriptionsItem label="對象">{{ currentName }}</ElDescriptionsItem
          ><ElDescriptionsItem v-if="isMerchant && 'lineUid' in current" label="商戶線路">{{
            current.lineUid
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="結算期間">{{ current.period }}</ElDescriptionsItem
          ><ElDescriptionsItem label="付款期限">{{ current.dueDate }}</ElDescriptionsItem
          ><ElDescriptionsItem label="建立時間">{{ current.createdAt }}</ElDescriptionsItem
          ><ElDescriptionsItem label="付款時間">{{
            current.paidAt || '—'
          }}</ElDescriptionsItem></ElDescriptions
        ><div class="drawer-actions"
          ><ElButton @click="router.push(`/finance/settlement/batches/${current.batchId}`)"
            >查看結算批次</ElButton
          ><ElButton type="primary" plain :disabled="!canAdjust" @click="goAdjustment"
            >建立調整項目</ElButton
          ></div
        ></template
      >
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import SettlementTable from './settlement-table.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'

  defineOptions({ name: 'SettlementStatements' })
  const route = useRoute()
  const router = useRouter()
  const store = useFinanceCenterStore()
  const { width } = useWindowSize()
  const isMerchant = computed(() => route.name === 'MerchantSettlementStatements')
  const filters = reactive({ keyword: '', batchId: '', status: '' })
  const selectedId = ref('')
  const drawerVisible = ref(false)
  const rows = computed(() => (isMerchant.value ? store.merchantStatements : store.agentStatements))
  const filteredRows = computed(() =>
    rows.value.filter((item) => {
      const name = 'merchantName' in item ? `${item.merchantName} ${item.lineUid}` : item.agentName
      return (
        (!filters.keyword ||
          `${item.id} ${name}`.toLowerCase().includes(filters.keyword.toLowerCase())) &&
        (!filters.batchId || item.batchId === filters.batchId) &&
        (!filters.status || item.status === filters.status)
      )
    })
  )
  const current = computed(() =>
    isMerchant.value
      ? store.findMerchantStatement(selectedId.value)
      : store.findAgentStatement(selectedId.value)
  )
  const currentName = computed(() =>
    current.value
      ? 'merchantName' in current.value
        ? current.value.merchantName
        : current.value.agentName
      : ''
  )
  const canAdjust = computed(
    () =>
      Boolean(current.value) &&
      store.findSettlementBatch(current.value!.batchId)?.status !== 'Completed'
  )
  const drawerSize = computed(() => (width.value < 680 ? '100%' : 'min(680px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 620 ? 1 : 2))
  const count = (status: string) => rows.value.filter((item) => item.status === status).length
  const reset = () => {
    filters.keyword = ''
    filters.batchId = ''
    filters.status = ''
  }
  const openDrawer = (id: string) => {
    selectedId.value = id
    drawerVisible.value = true
  }
  const goAdjustment = () =>
    current.value &&
    router.push({
      path: '/finance/settlement/adjustments',
      query: { statementId: current.value.id, targetType: isMerchant.value ? 'Merchant' : 'Agent' }
    })
  const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Review': '待審核',
      Approved: '已核准',
      Paid: '已付款',
      Voided: '已作廢'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Paid'
      ? 'success'
      : status === 'Approved'
        ? 'primary'
        : status === 'Pending Review'
          ? 'warning'
          : status === 'Voided'
            ? 'danger'
            : 'info'
</script>

<style scoped lang="scss">
  .page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid button {
    display: grid;
    gap: 5px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .summary-grid span,
  .summary-grid small,
  .toolbar span,
  .amount-card span,
  .amount-card small {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 25px;
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .filter-card :deep(.el-input),
  .filter-card :deep(.el-select) {
    width: 220px;
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .toolbar {
    display: flex;
    padding: 16px;
  }

  .toolbar div {
    display: flex;
    gap: 10px;
  }

  .drawer-tags,
  .drawer-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 18px;
  }

  .amount-card {
    display: grid;
    gap: 6px;
    padding: 18px;
    margin-bottom: 18px;
    background: var(--art-gray-50);
    border-radius: 10px;
  }

  .amount-card strong {
    font-size: 24px;
    color: var(--el-color-primary);
  }

  .drawer-actions {
    justify-content: flex-end;
    margin-top: 18px;
  }

  @media (width <= 800px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 580px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
