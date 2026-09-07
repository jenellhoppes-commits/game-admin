<template>
  <div class="finance-page">
    <AppPageHeader :title="pageCopy.title" eyebrow="對帳／結算" :description="pageCopy.description">
      <template #actions>
        <ElButton @click="refresh">重新整理</ElButton>
        <ElButton @click="ElMessage.success('已建立匯出工作')">匯出</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <button type="button" @click="setStatus('')"
        ><span>全部對帳</span><strong>{{ records.length }}</strong
        ><small>目前查詢範圍</small></button
      >
      <button type="button" @click="setStatus('Pending Confirmation')"
        ><span>待確認</span><strong>{{ countStatus('Pending Confirmation') }}</strong
        ><small>可進行人工核對</small></button
      >
      <button type="button" @click="setStatus('Difference')"
        ><span>有差異</span><strong class="danger">{{ countStatus('Difference') }}</strong
        ><small>須先完成差異處理</small></button
      >
      <button type="button" @click="setStatus('Locked')"
        ><span>已鎖定</span><strong>{{ countStatus('Locked') }}</strong
        ><small>不可回改的歷史資料</small></button
      >
    </div>

    <ElCard class="filter-card" shadow="never">
      <ElForm :model="filters" inline @submit.prevent="applyFilters">
        <ElFormItem label="關鍵字">
          <ElInput v-model="filters.keyword" clearable :placeholder="pageCopy.placeholder" />
        </ElFormItem>
        <ElFormItem label="對帳期間">
          <ElSelect v-model="filters.period" clearable placeholder="全部期間">
            <ElOption label="2026-08" value="2026-08" />
            <ElOption label="2026-07" value="2026-07" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="狀態">
          <ElSelect v-model="filters.status" clearable placeholder="全部狀態">
            <ElOption
              v-for="status in statusOptions"
              :key="status"
              :label="statusLabel(status)"
              :value="status"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary" native-type="submit">查詢</ElButton></ElFormItem>
        <ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard class="table-card" shadow="never">
      <div class="table-toolbar">
        <div
          ><strong>{{ pageCopy.tableTitle }}</strong
          ><span>共 {{ filteredRows.length }} 筆</span></div
        >
        <span class="hint">金額依各筆結算幣別顯示</span>
      </div>
      <ElTable :data="pagedRows" border row-key="id">
        <ElTableColumn label="對帳資料" min-width="230" fixed="left">
          <template #default="scope">
            <button class="primary-link" type="button" @click="openDetail(scope.row.id)">
              <strong>{{ recordName(scope.row) }}</strong>
              <small>{{ scope.row.id }} · {{ scope.row.period }}</small>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn v-if="isMerchant" label="商戶線路" prop="lineUid" min-width="180" />
        <ElTableColumn v-else label="商戶數" prop="merchantCount" width="90" align="right" />
        <ElTableColumn label="投注筆數" prop="betCount" width="110" align="right" />
        <ElTableColumn label="有效投注" min-width="145" align="right">
          <template #default="scope">{{ money(scope.row.validBet, scope.row.currency) }}</template>
        </ElTableColumn>
        <ElTableColumn label="GGR" min-width="135" align="right">
          <template #default="scope">{{ money(scope.row.ggr, scope.row.currency) }}</template>
        </ElTableColumn>
        <ElTableColumn label="最終應結" min-width="155" align="right">
          <template #default="scope"
            ><strong>{{
              money(scope.row.finalSettlementAmount, scope.row.snapshot.settlementCurrency)
            }}</strong></template
          >
        </ElTableColumn>
        <ElTableColumn label="未解差異" width="95" align="center">
          <template #default="scope">
            <ElButton
              v-if="scope.row.unresolvedDifferenceCount"
              link
              type="danger"
              @click="openDifferences(scope.row.id)"
              >{{ scope.row.unresolvedDifferenceCount }}</ElButton
            >
            <span v-else>0</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="115">
          <template #default="scope"
            ><ElTag :type="statusType(scope.row.status)" effect="light">{{
              statusLabel(scope.row.status)
            }}</ElTag></template
          >
        </ElTableColumn>
        <ElTableColumn label="更新時間" prop="updatedAt" width="155" />
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="scope"
            ><ElButton link type="primary" @click="openDetail(scope.row.id)"
              >查看</ElButton
            ></template
          >
        </ElTableColumn>
      </ElTable>
      <div class="pagination-wrap">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredRows.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  import type { FinanceReconciliationStatus } from '@/types/game-provider'

  defineOptions({ name: 'FinanceReconciliationList' })
  const route = useRoute()
  const router = useRouter()
  const store = useFinanceCenterStore()
  const isMerchant = computed(() => route.name === 'MerchantReconciliation')
  const pageCopy = computed(() =>
    isMerchant.value
        ? {
            title: '商戶對帳',
            description: '按商戶線路與交易幣別核對投注、派彩、獎池及應結金額。',
            placeholder: '商戶、線路或對帳編號',
            tableTitle: '商戶對帳清單'
          }
        : {
            title: '代理對帳',
            description: '彙總旗下商戶已確認結果，產生代理層級對帳資料。',
            placeholder: '代理或對帳編號',
            tableTitle: '代理對帳清單'
          }
  )
  const filters = reactive({ keyword: '', period: '', status: '' })
  const pagination = reactive({ current: 1, size: 20 })
  const statusOptions: FinanceReconciliationStatus[] = [
    'Draft',
    'Pending Confirmation',
    'Difference',
    'Confirmed',
    'Locked',
    'Cancelled'
  ]
  const records = computed(() =>
    isMerchant.value
        ? store.merchantReconciliations
        : store.agentReconciliations
  )
  const filteredRows = computed(() =>
    records.value.filter((record) => {
      const searchable = `${record.id} ${recordName(record)} ${
        'merchantCode' in record ? `${record.merchantCode} ${record.lineUid}` : record.agentCode
      }`
      return (
        (!filters.keyword || searchable.toLowerCase().includes(filters.keyword.toLowerCase())) &&
        (!filters.period || record.period === filters.period) &&
        (!filters.status || record.status === filters.status)
      )
    })
  )
  const pagedRows = computed(() =>
    filteredRows.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  const countStatus = (status: FinanceReconciliationStatus) =>
    records.value.filter((record) => record.status === status).length
  const setStatus = (status: string) => {
    filters.status = status
    pagination.current = 1
  }
  const applyFilters = () => (pagination.current = 1)
  const reset = () => {
    filters.keyword = ''
    filters.period = ''
    filters.status = ''
    pagination.current = 1
  }
  const refresh = () => ElMessage.success('對帳資料已更新')
  const recordName = (record: (typeof records.value)[number]) =>
    'merchantName' in record ? record.merchantName : record.agentName
  const openDetail = (id: string) =>
    router.push(
      `/finance/reconciliation/${isMerchant.value ? 'merchants' : 'agents'}/${id}`
    )
  const openDifferences = (id: string) =>
    router.push({ path: '/finance/reconciliation/differences', query: { reconciliationId: id } })
  const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Confirmation': '待確認',
      Difference: '有差異',
      Confirmed: '已確認',
      Locked: '已鎖定',
      Cancelled: '已取消'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Difference'
      ? 'danger'
      : status === 'Pending Confirmation'
        ? 'warning'
        : status === 'Confirmed'
          ? 'success'
          : status === 'Locked'
            ? 'info'
            : 'primary'
</script>

<style scoped lang="scss">
  .finance-page {
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
  .hint,
  .table-toolbar span {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 25px;
    color: var(--art-gray-900);
  }

  .summary-grid .danger {
    color: var(--el-color-danger);
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

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
  }

  .table-toolbar div {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .primary-link {
    display: grid;
    gap: 4px;
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .primary-link small {
    color: var(--art-gray-500);
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px;
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 620px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .table-toolbar {
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
    }
  }
</style>
