<template>
  <div class="page">
    <AppPageHeader
      title="結算批次"
      eyebrow="對帳／結算"
      description="將已確認對帳、匯率快照與調整項目組成可審核、可追溯的結算作業。"
    >
      <template #actions
        ><ElButton @click="ElMessage.success('批次資料已更新')">重新整理</ElButton
        ><ElButton type="primary" @click="openCreate">新增結算批次</ElButton></template
      >
    </AppPageHeader>

    <div class="summary-grid">
      <button type="button" @click="setStatus('')"
        ><span>全部批次</span><strong>{{ store.settlementBatches.length }}</strong
        ><small>目前資料範圍</small></button
      >
      <button type="button" @click="setStatus('Pending Review')"
        ><span>待審核</span><strong>{{ countStatus('Pending Review') }}</strong
        ><small>等待財務覆核</small></button
      >
      <button type="button" @click="setStatus('Approved')"
        ><span>已核准</span><strong>{{ countStatus('Approved') }}</strong
        ><small>可執行付款</small></button
      >
      <button type="button" @click="setStatus('Completed')"
        ><span>已完成</span><strong>{{ countStatus('Completed') }}</strong
        ><small>對帳已鎖定</small></button
      >
    </div>

    <ElCard shadow="never" class="filter-card">
      <ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput v-model="filters.keyword" clearable placeholder="批次名稱或編號" /></ElFormItem
        ><ElFormItem label="期間"
          ><ElSelect v-model="filters.period" clearable placeholder="全部期間"
            ><ElOption label="2026-08" value="2026-08" /><ElOption
              label="2026-07"
              value="2026-07" /></ElSelect></ElFormItem
        ><ElFormItem label="狀態"
          ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
            ><ElOption
              v-for="status in statuses"
              :key="status"
              :label="statusLabel(status)"
              :value="status" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      >
    </ElCard>

    <ElCard shadow="never" class="table-card">
      <div class="toolbar"
        ><div
          ><strong>結算批次清單</strong><span>共 {{ filteredRows.length }} 筆</span></div
        ><span>金額以批次結算幣別顯示</span></div
      >
      <ElTable :data="filteredRows" border row-key="id">
        <ElTableColumn label="批次" min-width="250" fixed="left"
          ><template #default="scope"
            ><button class="link" type="button" @click="openDetail(scope.row.id)"
              ><strong>{{ scope.row.name }}</strong
              ><small>{{ scope.row.id }} · {{ cycleLabel(scope.row.cycle) }}</small></button
            ></template
          ></ElTableColumn
        >
        <ElTableColumn prop="period" label="期間" width="100" />
        <ElTableColumn label="結算單" min-width="145"
          ><template #default="scope"
            >商戶 {{ scope.row.merchantStatementCount }}／代理
            {{ scope.row.agentStatementCount }}</template
          ></ElTableColumn
        >
        <ElTableColumn label="原始應結" min-width="155" align="right"
          ><template #default="scope">{{
            money(scope.row.totalAmount, scope.row.settlementCurrency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="調整" min-width="130" align="right"
          ><template #default="scope">{{
            money(scope.row.adjustmentAmount, scope.row.settlementCurrency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="最終應結" min-width="160" align="right"
          ><template #default="scope"
            ><strong>{{
              money(scope.row.finalAmount, scope.row.settlementCurrency)
            }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="匯率快照" width="100" align="center"
          ><template #default="scope">{{
            scope.row.exchangeSnapshotCount
          }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" width="110"
          ><template #default="scope"
            ><ElTag :type="statusType(scope.row.status)">{{
              statusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn prop="updatedAt" label="更新時間" width="155" />
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openDetail(scope.row.id)"
              >查看</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>

    <ElDialog v-model="createVisible" title="新增結算批次" width="min(560px, 92vw)">
      <ElAlert
        type="info"
        :closable="false"
        title="只會納入已確認／已鎖定，且尚未進入其他批次的對帳資料。"
      />
      <p class="eligible-hint"
        >目前條件可納入：商戶對帳 {{ eligibleCounts.merchants }} 筆、代理對帳
        {{ eligibleCounts.agents }} 筆。</p
      >
      <ElForm label-position="top" class="create-form">
        <ElFormItem label="批次名稱" required><ElInput v-model="createForm.name" /></ElFormItem>
        <div class="form-grid"
          ><ElFormItem label="對帳期間" required
            ><ElSelect v-model="createForm.period" class="full"
              ><ElOption label="2026-08" value="2026-08" /><ElOption
                label="2026-07"
                value="2026-07" /></ElSelect></ElFormItem
          ><ElFormItem label="結算週期" required
            ><ElSelect v-model="createForm.cycle" class="full"
              ><ElOption label="每月" value="Monthly" /><ElOption
                label="每週"
                value="Weekly" /><ElOption label="每半月" value="Semimonthly" /><ElOption
                label="每日"
                value="Daily" /></ElSelect></ElFormItem
        ></div>
        <ElFormItem label="結算幣別" required
          ><ElSelect v-model="createForm.settlementCurrency" class="full"
            ><ElOption
              v-for="currency in currencyOptions"
              :key="currency"
              :label="currency"
              :value="currency" /></ElSelect
        ></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="createVisible = false">取消</ElButton
        ><ElButton type="primary" @click="createBatch">建立批次</ElButton></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type { SettlementBatchStatus, SettlementCycle } from '@/types/game-provider'

  defineOptions({ name: 'SettlementBatches' })
  const router = useRouter()
  const store = useFinanceCenterStore()
  const settingsStore = useFinanceSettingsStore()
  const filters = reactive({ keyword: '', period: '', status: '' })
  const createVisible = ref(false)
  const createForm = reactive<{
    name: string
    period: string
    cycle: SettlementCycle
    settlementCurrency: string
  }>({
    name: '',
    period: '2026-07',
    cycle: settingsStore.settlementRule.cycle,
    settlementCurrency: settingsStore.settlementRule.defaultCurrency
  })
  const statuses: SettlementBatchStatus[] = [
    'Draft',
    'Pending Review',
    'Approved',
    'Processing',
    'Completed',
    'Failed',
    'Cancelled'
  ]
  const currencyOptions = computed(() =>
    settingsStore.settlementCurrencies.map((currency) => currency.code)
  )
  const eligibleCounts = computed(() => {
    const usedMerchants = new Set(store.merchantStatements.map((item) => item.reconciliationId))
    const usedAgents = new Set(store.agentStatements.map((item) => item.reconciliationId))
    return {
      merchants: store.merchantReconciliations.filter(
        (item) =>
          item.period === createForm.period &&
          item.snapshot.settlementCurrency === createForm.settlementCurrency &&
          ['Confirmed', 'Locked'].includes(item.status) &&
          !usedMerchants.has(item.id)
      ).length,
      agents: store.agentReconciliations.filter(
        (item) =>
          item.period === createForm.period &&
          item.currency === createForm.settlementCurrency &&
          ['Confirmed', 'Locked'].includes(item.status) &&
          !usedAgents.has(item.id)
      ).length
    }
  })
  const filteredRows = computed(() =>
    store.settlementBatches.filter(
      (item) =>
        (!filters.keyword ||
          `${item.id} ${item.name}`.toLowerCase().includes(filters.keyword.toLowerCase())) &&
        (!filters.period || item.period === filters.period) &&
        (!filters.status || item.status === filters.status)
    )
  )
  const countStatus = (status: SettlementBatchStatus) =>
    store.settlementBatches.filter((item) => item.status === status).length
  const setStatus = (status: string) => {
    filters.status = status
  }
  const reset = () => {
    filters.keyword = ''
    filters.period = ''
    filters.status = ''
  }
  const openDetail = (id: string) => router.push(`/finance/settlement/batches/${id}`)
  const openCreate = () => {
    createForm.name = '2026-07 補充結算批次'
    createForm.cycle = settingsStore.settlementRule.cycle
    createForm.settlementCurrency = settingsStore.settlementRule.defaultCurrency
    createVisible.value = true
  }
  const createBatch = () => {
    if (!createForm.name.trim() || !createForm.period || !createForm.settlementCurrency)
      return ElMessage.warning('請完整填寫批次資料')
    const result = store.createSettlementBatch({ ...createForm, name: createForm.name.trim() })
    if (!result.ok) return ElMessage.warning(result.message)
    createVisible.value = false
    ElMessage.success('結算批次已建立')
    if (result.batch) openDetail(result.batch.id)
  }
  const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const cycleLabel = (cycle: string) =>
    ({ Daily: '每日', Weekly: '每週', Semimonthly: '每半月', Monthly: '每月' })[cycle] || cycle
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Review': '待審核',
      Approved: '已核准',
      Processing: '處理中',
      Completed: '已完成',
      Failed: '失敗',
      Cancelled: '已取消'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Completed'
      ? 'success'
      : status === 'Approved'
        ? 'primary'
        : status === 'Pending Review'
          ? 'warning'
          : status === 'Failed'
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
  .link small {
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
    align-items: center;
    justify-content: space-between;
    padding: 16px;
  }

  .toolbar div {
    display: flex;
    gap: 10px;
  }

  .link {
    display: grid;
    gap: 4px;
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .create-form {
    margin-top: 18px;
  }

  .eligible-hint {
    margin: 14px 0 0;
    color: var(--art-gray-600);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .full {
    width: 100%;
  }

  @media (width <= 850px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 580px) {
    .summary-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
