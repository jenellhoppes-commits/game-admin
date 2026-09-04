<template>
  <div class="page">
    <AppPageHeader
      title="匯率快照"
      eyebrow="結算管理"
      description="保存每個結算批次實際採用的匯率、來源與鎖定時間，確保歷史金額可重現。"
      ><template #actions
        ><ElButton @click="ElMessage.success('匯率快照已更新')">重新整理</ElButton
        ><ElButton @click="ElMessage.success('匯率快照已匯出')">匯出</ElButton></template
      ></AppPageHeader
    >
    <ElAlert
      type="info"
      :closable="false"
      show-icon
      title="匯率快照建立後不可直接修改；如需更正，必須重建尚未完成的結算批次。"
    />
    <div class="summary-grid"
      ><div
        ><span>快照總數</span><strong>{{ store.exchangeSnapshots.length }}</strong
        ><small>涵蓋所有批次</small></div
      ><div
        ><span>已鎖定</span><strong>{{ lockedCount }}</strong
        ><small>不可變更</small></div
      ><div
        ><span>跨幣別</span><strong>{{ crossCurrencyCount }}</strong
        ><small>需要匯率換算</small></div
      ><div
        ><span>匯率來源</span><strong>{{ sourceCount }}</strong
        ><small>可追溯來源數</small></div
      ></div
    >
    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="結算批次"
          ><ElSelect v-model="filters.batchId" clearable placeholder="全部批次"
            ><ElOption
              v-for="batch in store.settlementBatches"
              :key="batch.id"
              :label="batch.name"
              :value="batch.id" /></ElSelect></ElFormItem
        ><ElFormItem label="幣別"
          ><ElInput v-model="filters.currency" clearable placeholder="例如 USD、TWD" /></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >
    <ElCard shadow="never" class="table-card"
      ><div class="toolbar"
        ><strong>匯率快照清單</strong><span>共 {{ rows.length }} 筆</span></div
      ><ElTable :data="rows" border
        ><ElTableColumn prop="id" label="快照編號" width="135" /><ElTableColumn
          label="結算批次"
          min-width="210"
          ><template #default="scope"
            ><ElButton
              link
              type="primary"
              @click="router.push(`/finance/settlement/batches/${scope.row.batchId}`)"
              >{{ batchName(scope.row.batchId) }}</ElButton
            ><br /><small>{{ scope.row.batchId }}</small></template
          ></ElTableColumn
        ><ElTableColumn label="幣別對" min-width="140"
          ><template #default="scope"
            ><strong>{{ scope.row.fromCurrency }} → {{ scope.row.toCurrency }}</strong></template
          ></ElTableColumn
        ><ElTableColumn prop="rate" label="匯率" min-width="130" /><ElTableColumn
          prop="source"
          label="來源"
          min-width="150" /><ElTableColumn label="基準匯率快照" min-width="220"
          ><template #default="scope"
            ><template v-if="scope.row.sourceRateSnapshotIds.length"
              ><ElTag
                v-for="id in scope.row.sourceRateSnapshotIds"
                :key="id"
                effect="plain"
                class="snapshot-id"
                >{{ id }}</ElTag
              ></template
            ><span v-else>同幣別，無需換算</span></template
          ></ElTableColumn
        ><ElTableColumn prop="rateTime" label="取值時間" width="155" /><ElTableColumn
          label="狀態"
          width="100"
          ><template #default="scope"
            ><ElTag :type="scope.row.status === 'Locked' ? 'success' : 'warning'">{{
              scope.row.status === 'Locked' ? '已鎖定' : '預估'
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn prop="lockedBy" label="鎖定人員" min-width="140" /><ElTableColumn
          prop="lockedAt"
          label="鎖定時間"
          width="155" /></ElTable
    ></ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  defineOptions({ name: 'SettlementExchangeSnapshots' })
  const router = useRouter()
  const store = useFinanceCenterStore()
  const filters = reactive({ batchId: '', currency: '' })
  const rows = computed(() =>
    store.exchangeSnapshots.filter(
      (item) =>
        (!filters.batchId || item.batchId === filters.batchId) &&
        (!filters.currency ||
          `${item.fromCurrency} ${item.toCurrency}`
            .toLowerCase()
            .includes(filters.currency.toLowerCase()))
    )
  )
  const lockedCount = computed(
    () => store.exchangeSnapshots.filter((item) => item.status === 'Locked').length
  )
  const crossCurrencyCount = computed(
    () => store.exchangeSnapshots.filter((item) => item.fromCurrency !== item.toCurrency).length
  )
  const sourceCount = computed(
    () => new Set(store.exchangeSnapshots.map((item) => item.source)).size
  )
  const reset = () => {
    filters.batchId = ''
    filters.currency = ''
  }
  const batchName = (id: string) => store.findSettlementBatch(id)?.name || id
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

  .summary-grid > div {
    display: grid;
    gap: 5px;
    padding: 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .summary-grid span,
  .summary-grid small,
  .toolbar span,
  small {
    color: var(--art-gray-500);
  }

  .snapshot-id + .snapshot-id {
    margin-left: 6px;
  }

  .summary-grid strong {
    font-size: 25px;
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .filter-card :deep(.el-input),
  .filter-card :deep(.el-select) {
    width: 240px;
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .toolbar {
    display: flex;
    gap: 10px;
    padding: 16px;
  }

  @media (width <= 780px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
