<template>
  <div class="page">
    <AppPageHeader
      title="異動紀錄"
      eyebrow="對帳／結算"
      description="集中追蹤供應商、代理、商戶對帳，以及差異調整與結算結果。"
      ><template #actions
        ><ElButton @click="ElMessage.success('異動紀錄已匯出')">匯出</ElButton></template
      ></AppPageHeader
    >
    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput
            v-model="filters.keyword"
            clearable
            placeholder="編號、動作或人員" /></ElFormItem
        ><ElFormItem label="資料類型"
          ><ElSelect v-model="filters.entityType" clearable placeholder="全部類型"
            ><ElOption
              v-for="item in entityOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >
    <ElCard shadow="never" class="table-card"
      ><div class="toolbar"
        ><strong>異動紀錄</strong><span>共 {{ rows.length }} 筆</span></div
      ><ElTable :data="rows" border
        ><ElTableColumn prop="time" label="時間" width="155" /><ElTableColumn
          label="資料類型"
          min-width="150"
          ><template #default="scope">{{
            entityLabel(scope.row.entityType)
          }}</template></ElTableColumn
        ><ElTableColumn label="資料編號" min-width="160"
          ><template #default="scope"
            ><ElButton
              link
              type="primary"
              @click="openEntity(scope.row.entityType, scope.row.entityId)"
              >{{ scope.row.entityId }}</ElButton
            ></template
          ></ElTableColumn
        ><ElTableColumn prop="action" label="動作" min-width="150" /><ElTableColumn
          label="狀態異動"
          min-width="170"
          ><template #default="scope"
            >{{ scope.row.before }} → {{ scope.row.after }}</template
          ></ElTableColumn
        ><ElTableColumn prop="reason" label="原因" min-width="260" /><ElTableColumn
          prop="operator"
          label="操作人員"
          min-width="140" /></ElTable
    ></ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  defineOptions({ name: 'ReconciliationChangeLogs' })
  const router = useRouter()
  const store = useFinanceCenterStore()
  const filters = reactive({ keyword: '', entityType: '' })
  const entityOptions = [
    { label: '供應商對帳', value: 'Supplier Reconciliation' },
    { label: '代理對帳', value: 'Agent Reconciliation' },
    { label: '商戶對帳', value: 'Merchant Reconciliation' },
    { label: '差異處理', value: 'Difference' }
  ]
  const rows = computed(() =>
    store.actionLogs
      .filter((item) =>
        [
          'Supplier Reconciliation',
          'Agent Reconciliation',
          'Merchant Reconciliation',
          'Difference'
        ].includes(item.entityType)
      )
      .filter(
        (item) =>
          (!filters.keyword ||
            `${item.entityId} ${item.action} ${item.operator}`
              .toLowerCase()
              .includes(filters.keyword.toLowerCase())) &&
          (!filters.entityType || item.entityType === filters.entityType)
      )
      .sort((a, b) => b.time.localeCompare(a.time))
  )
  const reset = () => {
    filters.keyword = ''
    filters.entityType = ''
  }
  const entityLabel = (type: string) =>
    ({
      'Supplier Reconciliation': '供應商對帳',
      'Agent Reconciliation': '代理對帳',
      'Merchant Reconciliation': '商戶對帳',
      Difference: '差異處理'
    })[type] || type
  const openEntity = (type: string, id: string) => {
    if (type === 'Supplier Reconciliation') router.push(`/finance/reconciliation/suppliers/${id}`)
    else if (type === 'Merchant Reconciliation')
      router.push(`/finance/reconciliation/merchants/${id}`)
    else if (type === 'Agent Reconciliation') router.push(`/finance/reconciliation/agents/${id}`)
    else if (type === 'Difference')
      router.push({ path: '/finance/reconciliation/differences', query: { differenceId: id } })
  }
</script>

<style scoped lang="scss">
  .page {
    display: grid;
    gap: 16px;
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

  .toolbar span {
    color: var(--art-gray-500);
  }
</style>
