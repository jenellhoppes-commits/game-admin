<template>
  <div class="page">
    <AppPageHeader
      title="調整項目"
      eyebrow="結算管理"
      description="管理對帳差異、費用、補償及人工調整，所有調整皆須留存原因並經財務覆核。"
      ><template #actions
        ><ElButton @click="ElMessage.success('調整項目已匯出')">匯出</ElButton
        ><ElButton type="primary" @click="openCreate()">新增調整項目</ElButton></template
      ></AppPageHeader
    >
    <div class="summary-grid"
      ><button type="button" @click="filters.status = ''"
        ><span>全部調整</span><strong>{{ store.settlementAdjustments.length }}</strong
        ><small>含歷史資料</small></button
      ><button type="button" @click="filters.status = 'Pending Review'"
        ><span>待審核</span><strong>{{ count('Pending Review') }}</strong
        ><small>等待財務覆核</small></button
      ><button type="button" @click="filters.status = 'Applied'"
        ><span>已套用</span><strong>{{ count('Applied') }}</strong
        ><small>已回寫結算單</small></button
      ><div
        ><span>本頁淨調整</span><strong>{{ money(netAmount, displayCurrency) }}</strong
        ><small>加項減去減項</small></div
      ></div
    >
    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput
            v-model="filters.keyword"
            clearable
            placeholder="調整、對象或結算單" /></ElFormItem
        ><ElFormItem label="批次"
          ><ElSelect v-model="filters.batchId" clearable placeholder="全部批次"
            ><ElOption
              v-for="batch in store.settlementBatches"
              :key="batch.id"
              :label="batch.name"
              :value="batch.id" /></ElSelect></ElFormItem
        ><ElFormItem label="狀態"
          ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
            ><ElOption label="待審核" value="Pending Review" /><ElOption
              label="已核准"
              value="Approved" /><ElOption label="已套用" value="Applied" /><ElOption
              label="已駁回"
              value="Rejected" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >
    <ElCard shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>調整項目清單</strong><span>共 {{ rows.length }} 筆</span></div
        ><span>不同幣別不直接加總</span></div
      ><ElTable :data="rows" border row-key="id"
        ><ElTableColumn label="調整項目" min-width="220" fixed="left"
          ><template #default="scope"
            ><button class="link" type="button" @click="openDrawer(scope.row.id)"
              ><strong>{{ scope.row.id }}</strong
              ><small>{{ typeLabel(scope.row.type) }} · {{ scope.row.statementId }}</small></button
            ></template
          ></ElTableColumn
        ><ElTableColumn label="對象" min-width="180"
          ><template #default="scope"
            ><strong>{{ scope.row.targetName }}</strong
            ><br /><small
              >{{ scope.row.targetType === 'Merchant' ? '商戶' : '代理' }} ·
              {{ scope.row.targetId }}</small
            ></template
          ></ElTableColumn
        ><ElTableColumn prop="batchId" label="結算批次" min-width="150" /><ElTableColumn
          label="方向"
          width="90"
          ><template #default="scope"
            ><ElTag
              :type="scope.row.direction === 'Credit' ? 'success' : 'danger'"
              effect="plain"
              >{{ scope.row.direction === 'Credit' ? '加項' : '減項' }}</ElTag
            ></template
          ></ElTableColumn
        ><ElTableColumn label="金額" min-width="140" align="right"
          ><template #default="scope"
            ><strong>{{ money(scope.row.amount, scope.row.currency) }}</strong></template
          ></ElTableColumn
        ><ElTableColumn prop="reason" label="原因" min-width="260" /><ElTableColumn
          prop="requester"
          label="申請人"
          min-width="130"
        /><ElTableColumn label="狀態" width="110"
          ><template #default="scope"
            ><ElTag :type="statusType(scope.row.status)">{{
              statusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="操作" width="120" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openDrawer(scope.row.id)">查看</ElButton
            ><ElButton
              v-if="scope.row.status === 'Pending Review'"
              link
              type="success"
              @click="review(scope.row.id, true)"
              >核准</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      ></ElCard
    >

    <ElDrawer
      v-model="drawerVisible"
      :title="current ? `調整項目｜${current.id}` : '調整項目'"
      :size="drawerSize"
      destroy-on-close
      @closed="selectedId = ''"
      ><template v-if="current"
        ><div class="drawer-tags"
          ><ElTag :type="statusType(current.status)">{{ statusLabel(current.status) }}</ElTag
          ><ElTag :type="current.direction === 'Credit' ? 'success' : 'danger'" effect="plain">{{
            current.direction === 'Credit' ? '加項' : '減項'
          }}</ElTag></div
        ><div class="amount-card"
          ><span>調整金額</span><strong>{{ money(current.amount, current.currency) }}</strong
          ><small>{{ current.targetName }} · {{ current.statementId }}</small></div
        ><ElDescriptions :column="drawerColumns" border
          ><ElDescriptionsItem label="調整類型">{{ typeLabel(current.type) }}</ElDescriptionsItem
          ><ElDescriptionsItem label="結算批次">{{ current.batchId }}</ElDescriptionsItem
          ><ElDescriptionsItem label="申請人">{{ current.requester }}</ElDescriptionsItem
          ><ElDescriptionsItem label="申請時間">{{ current.requestedAt }}</ElDescriptionsItem
          ><ElDescriptionsItem label="覆核人員">{{ current.reviewer || '—' }}</ElDescriptionsItem
          ><ElDescriptionsItem label="覆核時間">{{ current.reviewedAt || '—' }}</ElDescriptionsItem
          ><ElDescriptionsItem label="依據附件">{{ current.evidence || '—' }}</ElDescriptionsItem
          ><ElDescriptionsItem label="調整原因" :span="drawerColumns">{{
            current.reason
          }}</ElDescriptionsItem></ElDescriptions
        ></template
      ><template #footer
        ><div v-if="current?.status === 'Pending Review'" class="drawer-actions"
          ><ElButton type="danger" plain @click="review(current.id, false)">駁回</ElButton
          ><ElButton type="primary" @click="review(current.id, true)">核准並套用</ElButton></div
        ></template
      ></ElDrawer
    >

    <ElDialog v-model="createVisible" title="新增調整項目" width="min(600px, 92vw)"
      ><ElAlert
        type="warning"
        :closable="false"
        title="已完成的結算批次不能新增調整；送出後須經財務覆核才會回寫金額。"
      /><ElForm label-position="top" class="create-form"
        ><ElFormItem label="調整對象" required
          ><ElSelect v-model="form.statementKey" class="full" filterable
            ><ElOptionGroup label="商戶結算單"
              ><ElOption
                v-for="item in availableMerchantStatements"
                :key="item.id"
                :label="`${item.merchantName}｜${item.id}`"
                :value="`Merchant:${item.id}`" /></ElOptionGroup
            ><ElOptionGroup label="代理結算單"
              ><ElOption
                v-for="item in availableAgentStatements"
                :key="item.id"
                :label="`${item.agentName}｜${item.id}`"
                :value="`Agent:${item.id}`" /></ElOptionGroup></ElSelect></ElFormItem
        ><div class="form-grid"
          ><ElFormItem label="調整類型" required
            ><ElSelect v-model="form.type" class="full"
              ><ElOption label="對帳差異" value="Reconciliation Difference" /><ElOption
                label="人工調整"
                value="Manual" /><ElOption label="費用" value="Fee" /><ElOption
                label="補償"
                value="Compensation" /><ElOption
                label="其他"
                value="Other" /></ElSelect></ElFormItem
          ><ElFormItem label="方向" required
            ><ElRadioGroup v-model="form.direction"
              ><ElRadioButton value="Credit">加項</ElRadioButton
              ><ElRadioButton value="Debit">減項</ElRadioButton></ElRadioGroup
            ></ElFormItem
          ></div
        ><ElFormItem label="金額" required
          ><ElInputNumber
            v-model="form.amount"
            :min="0.01"
            :precision="2"
            class="full" /></ElFormItem
        ><ElFormItem label="調整原因" required
          ><ElInput v-model="form.reason" type="textarea" :rows="3" /></ElFormItem
        ><ElFormItem label="依據附件／單號"><ElInput v-model="form.evidence" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="createVisible = false">取消</ElButton
        ><ElButton type="primary" @click="createAdjustment">送出審核</ElButton></template
      ></ElDialog
    >
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  import type { SettlementAdjustmentRecord } from '@/types/game-provider'
  defineOptions({ name: 'SettlementAdjustments' })
  const route = useRoute()
  const store = useFinanceCenterStore()
  const { width } = useWindowSize()
  const filters = reactive({ keyword: '', batchId: '', status: '' })
  const selectedId = ref(String(route.query.adjustmentId || ''))
  const drawerVisible = ref(Boolean(selectedId.value))
  const createVisible = ref(Boolean(route.query.statementId))
  const form = reactive<{
    statementKey: string
    type: SettlementAdjustmentRecord['type']
    direction: SettlementAdjustmentRecord['direction']
    amount: number
    reason: string
    evidence: string
  }>({
    statementKey: route.query.statementId
      ? `${route.query.targetType || 'Merchant'}:${route.query.statementId}`
      : '',
    type: 'Manual',
    direction: 'Credit',
    amount: 100,
    reason: '',
    evidence: ''
  })
  const rows = computed(() =>
    store.settlementAdjustments.filter(
      (item) =>
        (!filters.keyword ||
          `${item.id} ${item.targetName} ${item.statementId}`
            .toLowerCase()
            .includes(filters.keyword.toLowerCase())) &&
        (!filters.batchId || item.batchId === filters.batchId) &&
        (!filters.status || item.status === filters.status)
    )
  )
  const current = computed(() => store.findSettlementAdjustment(selectedId.value))
  const drawerSize = computed(() => (width.value < 680 ? '100%' : 'min(680px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 620 ? 1 : 2))
  const availableMerchantStatements = computed(() =>
    store.merchantStatements.filter(
      (item) => store.findSettlementBatch(item.batchId)?.status !== 'Completed'
    )
  )
  const availableAgentStatements = computed(() =>
    store.agentStatements.filter(
      (item) => store.findSettlementBatch(item.batchId)?.status !== 'Completed'
    )
  )
  const count = (status: string) =>
    store.settlementAdjustments.filter((item) => item.status === status).length
  const displayCurrency = computed(() => rows.value[0]?.currency || 'TWD')
  const netAmount = computed(() =>
    rows.value
      .filter((item) => item.currency === displayCurrency.value && item.status === 'Applied')
      .reduce((sum, item) => sum + (item.direction === 'Credit' ? item.amount : -item.amount), 0)
  )
  const reset = () => {
    filters.keyword = ''
    filters.batchId = ''
    filters.status = ''
  }
  const openDrawer = (id: string) => {
    selectedId.value = id
    drawerVisible.value = true
  }
  const openCreate = (statementKey = '') => {
    form.statementKey = statementKey
    createVisible.value = true
  }
  const createAdjustment = () => {
    const [targetType, statementId] = form.statementKey.split(':') as ['Merchant' | 'Agent', string]
    if (!statementId || !form.reason.trim() || form.amount <= 0)
      return ElMessage.warning('請完整填寫必要資料')
    const result = store.createSettlementAdjustment({
      statementId,
      targetType,
      type: form.type,
      direction: form.direction,
      amount: form.amount,
      reason: form.reason.trim(),
      evidence: form.evidence.trim()
    })
    if (!result) return ElMessage.error('此結算單目前不能新增調整')
    createVisible.value = false
    ElMessage.success('調整項目已送出審核')
    openDrawer(result.id)
  }
  const review = async (id: string, approved: boolean) => {
    await ElMessageBox.confirm(
      approved ? '核准後金額會立即回寫結算單，是否繼續？' : '確定駁回此調整項目？',
      approved ? '核准調整' : '駁回調整',
      { type: 'warning' }
    )
    if (store.reviewSettlementAdjustment(id, approved))
      ElMessage.success(approved ? '調整已核准並套用' : '調整已駁回')
  }
  const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const typeLabel = (type: string) =>
    ({
      'Reconciliation Difference': '對帳差異',
      Manual: '人工調整',
      Fee: '費用',
      Compensation: '補償',
      Other: '其他'
    })[type] || type
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Review': '待審核',
      Approved: '已核准',
      Rejected: '已駁回',
      Applied: '已套用'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Applied'
      ? 'success'
      : status === 'Pending Review'
        ? 'warning'
        : status === 'Rejected'
          ? 'danger'
          : 'primary'
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

  .summary-grid button,
  .summary-grid > div {
    display: grid;
    gap: 5px;
    padding: 16px;
    text-align: left;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .summary-grid button {
    cursor: pointer;
  }

  .summary-grid span,
  .summary-grid small,
  .toolbar span,
  .link small,
  .amount-card span,
  .amount-card small,
  small {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 24px;
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

  .toolbar div,
  .drawer-tags,
  .drawer-actions {
    display: flex;
    gap: 9px;
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

  .drawer-tags {
    margin-bottom: 18px;
  }

  .drawer-actions {
    justify-content: flex-end;
  }

  .create-form {
    margin-top: 18px;
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
