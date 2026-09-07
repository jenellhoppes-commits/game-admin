<template>
  <div class="difference-page">
    <AppPageHeader
      title="差異處理"
      eyebrow="對帳／結算"
      description="集中比對系統與合作方帳務，追蹤責任人、關聯資料與處理結果。"
    >
      <template #actions
        ><ElButton @click="refresh">重新整理</ElButton
        ><ElButton @click="ElMessage.success('差異明細已匯出')">匯出</ElButton></template
      >
    </AppPageHeader>

    <div class="summary-grid">
      <button type="button" @click="setStatus('')"
        ><span>全部差異</span><strong>{{ store.differences.length }}</strong
        ><small>含已完成案件</small></button
      >
      <button type="button" @click="setStatus('Open')"
        ><span>待處理</span><strong class="danger">{{ statusCount('Open') }}</strong
        ><small>尚未指派</small></button
      >
      <button type="button" @click="setStatus('Investigating')"
        ><span>調查中</span><strong>{{ statusCount('Investigating') }}</strong
        ><small>已有負責人</small></button
      >
      <button type="button" @click="setStatus('Resolved')"
        ><span>已完成</span><strong>{{ completedCount }}</strong
        ><small>已解決或接受</small></button
      >
    </div>

    <ElCard class="filter-card" shadow="never">
      <ElForm :model="filters" inline @submit.prevent="applyFilters">
        <ElFormItem label="關鍵字"
          ><ElInput v-model="filters.keyword" clearable placeholder="差異、對帳或合作方"
        /></ElFormItem>
        <ElFormItem label="差異類型"
          ><ElSelect v-model="filters.type" clearable placeholder="全部類型"
            ><ElOption
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="狀態"
          ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
            ><ElOption
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value" /></ElSelect
        ></ElFormItem>
        <ElFormItem><ElButton type="primary" native-type="submit">查詢</ElButton></ElFormItem>
        <ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard class="table-card" shadow="never">
      <div class="table-toolbar"
        ><div
          ><strong>差異案件</strong><span>共 {{ filteredRows.length }} 筆</span></div
        ><span>依處理期限排序</span></div
      >
      <ElTable :data="pagedRows" border row-key="id">
        <ElTableColumn label="差異案件" min-width="230" fixed="left"
          ><template #default="scope"
            ><button class="primary-link" type="button" @click="openDrawer(scope.row.id)"
              ><strong>{{ scope.row.id }}</strong
              ><small>{{ scope.row.reconciliationId }} · {{ scope.row.period }}</small></button
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="對象" min-width="210"
          ><template #default="scope"
            ><strong>{{
              scope.row.merchantName || scope.row.agentName
            }}</strong
            ><br /><small>{{
              scope.row.lineUid || scope.row.agentId
            }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn label="類型" width="120"
          ><template #default="scope">{{ typeLabel(scope.row.type) }}</template></ElTableColumn
        >
        <ElTableColumn label="系統值" min-width="135" align="right"
          ><template #default="scope">{{
            money(scope.row.systemValue, scope.row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="合作方值" min-width="135" align="right"
          ><template #default="scope">{{
            money(scope.row.partnerValue, scope.row.currency)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="差異金額" min-width="135" align="right"
          ><template #default="scope"
            ><strong class="danger">{{
              money(scope.row.differenceAmount, scope.row.currency)
            }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="負責人" min-width="120"
          ><template #default="scope">{{ scope.row.assignee || '未指派' }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" width="115"
          ><template #default="scope"
            ><ElTag :type="differenceStatusType(scope.row.status)">{{
              statusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="處理期限" prop="dueAt" width="145" />
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openDrawer(scope.row.id)"
              >處理</ElButton
            ></template
          ></ElTableColumn
        >
      </ElTable>
      <div class="pagination-wrap"
        ><ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredRows.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
      /></div>
    </ElCard>

    <ElDrawer
      v-model="drawerVisible"
      :title="currentDifference ? `差異案件｜${currentDifference.id}` : '差異案件'"
      :size="drawerSize"
      destroy-on-close
      @closed="closeDrawer"
    >
      <template v-if="currentDifference">
        <div class="drawer-tags"
          ><ElTag :type="differenceStatusType(currentDifference.status)">{{
            statusLabel(currentDifference.status)
          }}</ElTag
          ><ElTag effect="plain">{{ typeLabel(currentDifference.type) }}</ElTag></div
        >
        <section>
          <div class="section-heading"
            ><div
              ><h3>比對結果</h3><p>{{ currentDifference.description }}</p></div
            ><ElButton @click="openReconciliation">查看對帳資料</ElButton></div
          >
          <div class="compare-grid">
            <div
              ><span>平台系統</span
              ><strong>{{
                money(currentDifference.systemValue, currentDifference.currency)
              }}</strong></div
            >
            <div
              ><span>合作方</span
              ><strong>{{
                money(currentDifference.partnerValue, currentDifference.currency)
              }}</strong></div
            >
            <div class="difference"
              ><span>差異</span
              ><strong>{{
                money(currentDifference.differenceAmount, currentDifference.currency)
              }}</strong></div
            >
          </div>
          <ElDescriptions :column="drawerColumns" border>
            <ElDescriptionsItem label="商戶">{{
              currentDifference.merchantName || '—'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="代理">{{ currentDifference.agentName }}</ElDescriptionsItem>
            <ElDescriptionsItem label="商戶線路">{{
              currentDifference.lineUid || '—'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="對帳期間">{{ currentDifference.period }}</ElDescriptionsItem>
            <ElDescriptionsItem label="負責人">{{
              currentDifference.assignee || '未指派'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="處理期限">{{ currentDifference.dueAt }}</ElDescriptionsItem>
          </ElDescriptions>
        </section>
        <section>
          <div class="section-heading"
            ><div><h3>關聯帳務</h3><p>可直接回查造成差異的注單與錢包交易。</p></div></div
          >
          <div class="related-grid">
            <div
              ><span>關聯注單</span
              ><ElButton
                v-for="id in currentDifference.relatedBetIds"
                :key="id"
                link
                type="primary"
                @click="router.push(`/transactions/bets/${id}`)"
                >{{ id }}</ElButton
              ></div
            >
            <div
              ><span>關聯交易</span
              ><ElButton
                v-for="id in currentDifference.relatedTransactionIds"
                :key="id"
                link
                type="primary"
                @click="router.push(`/transactions/records/${id}`)"
                >{{ id }}</ElButton
              ></div
            >
          </div>
        </section>
        <section v-if="currentDifference.resolution">
          <div class="section-heading"
            ><div
              ><h3>處理結果</h3
              ><p>{{ resolutionTypeLabel(currentDifference.resolutionType) }}</p></div
            ></div
          >
          <ElAlert type="success" :closable="false" :title="currentDifference.resolution" />
        </section>
      </template>
      <template #footer
        ><div
          v-if="currentDifference && !isCompleted(currentDifference.status)"
          class="drawer-actions"
          ><ElButton v-if="currentDifference.status === 'Open'" @click="startInvestigation"
            >指派給我並開始調查</ElButton
          ><ElButton type="primary" @click="resolveDialogVisible = true">完成處理</ElButton></div
        ></template
      >
    </ElDrawer>

    <ElDialog v-model="resolveDialogVisible" title="完成差異處理" width="min(520px, 92vw)">
      <ElForm label-position="top">
        <ElFormItem label="處理方式" required
          ><ElSelect v-model="resolutionForm.type" class="full-width"
            ><ElOption label="採用平台系統值" value="Use System Value" /><ElOption
              label="接受合作方數值"
              value="Use Partner Value" /><ElOption
              label="建立結算調整項目"
              value="Create Adjustment" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="處理說明" required
          ><ElInput
            v-model="resolutionForm.reason"
            type="textarea"
            :rows="4"
            placeholder="請記錄核對依據與處理原因"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="resolveDialogVisible = false">取消</ElButton
        ><ElButton
          type="primary"
          :disabled="!resolutionForm.type || !resolutionForm.reason.trim()"
          @click="resolveCurrent"
          >確認完成</ElButton
        ></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  import type {
    ReconciliationDifferenceRecord,
    ReconciliationDifferenceStatus
  } from '@/types/game-provider'

  defineOptions({ name: 'ReconciliationDifferences' })
  const route = useRoute()
  const router = useRouter()
  const store = useFinanceCenterStore()
  const { width } = useWindowSize()
  const filters = reactive({
    keyword: String(route.query.reconciliationId || ''),
    type: '',
    status: ''
  })
  const pagination = reactive({ current: 1, size: 20 })
  const drawerVisible = ref(Boolean(route.query.differenceId))
  const selectedId = ref(String(route.query.differenceId || ''))
  const resolveDialogVisible = ref(false)
  const resolutionForm = reactive<{
    type: NonNullable<ReconciliationDifferenceRecord['resolutionType']> | ''
    reason: string
  }>({ type: '', reason: '' })
  const drawerSize = computed(() => (width.value < 760 ? '100%' : 'min(820px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 620 ? 1 : 2))
  const currentDifference = computed(() => store.findDifference(selectedId.value))
  const typeOptions = [
    { label: '投注金額', value: 'Bet Amount' },
    { label: '派彩金額', value: 'Payout Amount' },
    { label: '有效投注', value: 'Valid Bet' },
    { label: '獎池', value: 'Jackpot' },
    { label: '退款', value: 'Refund' },
    { label: '匯率', value: 'Exchange Rate' },
    { label: '費用', value: 'Fee' },
    { label: '其他', value: 'Other' }
  ]
  const statusOptions = [
    { label: '待處理', value: 'Open' },
    { label: '調查中', value: 'Investigating' },
    { label: '等待合作方', value: 'Waiting Partner' },
    { label: '等待內部', value: 'Waiting Internal' },
    { label: '已解決', value: 'Resolved' },
    { label: '已接受', value: 'Accepted' },
    { label: '已關閉', value: 'Closed' }
  ]
  const filteredRows = computed(() =>
    store.differences
      .filter((item) => {
        const searchable =
          `${item.id} ${item.reconciliationId} ${item.merchantName || ''} ${item.agentName} ${item.lineUid || ''}`.toLowerCase()
        return (
          (!filters.keyword || searchable.includes(filters.keyword.toLowerCase())) &&
          (!filters.type || item.type === filters.type) &&
          (!filters.status || item.status === filters.status)
        )
      })
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  )
  const pagedRows = computed(() =>
    filteredRows.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  const completedCount = computed(
    () => store.differences.filter((item) => isCompleted(item.status)).length
  )
  const statusCount = (status: ReconciliationDifferenceStatus) =>
    store.differences.filter((item) => item.status === status).length
  const isCompleted = (status: ReconciliationDifferenceStatus) =>
    ['Resolved', 'Accepted', 'Closed'].includes(status)
  const setStatus = (status: string) => {
    filters.status = status
    pagination.current = 1
  }
  const applyFilters = () => (pagination.current = 1)
  const reset = () => {
    filters.keyword = ''
    filters.type = ''
    filters.status = ''
    pagination.current = 1
  }
  const refresh = () => ElMessage.success('差異資料已更新')
  const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const typeLabel = (type: string) =>
    ({
      'Bet Amount': '投注金額',
      'Payout Amount': '派彩金額',
      'Valid Bet': '有效投注',
      Jackpot: '獎池',
      Refund: '退款',
      'Exchange Rate': '匯率',
      Fee: '費用',
      Other: '其他'
    })[type] || type
  const statusLabel = (status: string) =>
    ({
      Open: '待處理',
      Investigating: '調查中',
      'Waiting Partner': '等待合作方',
      'Waiting Internal': '等待內部',
      Resolved: '已解決',
      Accepted: '已接受',
      Closed: '已關閉'
    })[status] || status
  const differenceStatusType = (status: string) =>
    status === 'Open'
      ? 'danger'
      : status === 'Investigating' || status.startsWith('Waiting')
        ? 'warning'
        : 'success'
  const resolutionTypeLabel = (type?: string) =>
    ({
      'Use System Value': '採用平台系統值',
      'Use Partner Value': '接受合作方數值',
      'Create Adjustment': '建立結算調整項目'
    })[type || ''] || '已完成處理'
  const openDrawer = (id: string) => {
    selectedId.value = id
    drawerVisible.value = true
    router.replace({ query: { ...route.query, differenceId: id } })
  }
  const closeDrawer = () => {
    selectedId.value = ''
    const query = { ...route.query }
    delete query.differenceId
    router.replace({ query })
  }
  const openReconciliation = () => {
    if (currentDifference.value)
      router.push(
        `/finance/reconciliation/${
          currentDifference.value.reconciliationType === 'Merchant'
              ? 'merchants'
              : 'agents'
        }/${currentDifference.value.reconciliationId}`
      )
  }
  const startInvestigation = () => {
    if (
      currentDifference.value &&
      store.updateDifference(currentDifference.value.id, 'Investigating', 'Super Admin')
    )
      ElMessage.success('已指派給你並開始調查')
  }
  const resolveCurrent = () => {
    if (!currentDifference.value || !resolutionForm.type || !resolutionForm.reason.trim()) return
    if (
      store.resolveDifference(
        currentDifference.value.id,
        resolutionForm.type,
        resolutionForm.reason.trim()
      )
    ) {
      ElMessage.success('差異已完成處理')
      resolveDialogVisible.value = false
      resolutionForm.type = ''
      resolutionForm.reason = ''
    }
  }
</script>

<style scoped lang="scss">
  .difference-page {
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
  .table-toolbar span,
  section p,
  .primary-link small,
  .related-grid span,
  .compare-grid span {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 25px;
    color: var(--art-gray-900);
  }

  .danger,
  .compare-grid .difference strong {
    color: var(--el-color-danger) !important;
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

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px;
  }

  .drawer-tags {
    display: flex;
    gap: 8px;
    margin-bottom: 18px;
  }

  section {
    display: grid;
    gap: 14px;
    padding: 20px 0;
    border-bottom: 1px solid var(--art-border-color);
  }

  .section-heading {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .section-heading h3,
  .section-heading p {
    margin: 0 0 5px;
  }

  .compare-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .compare-grid div {
    display: grid;
    gap: 7px;
    padding: 14px;
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .compare-grid strong {
    font-size: 18px;
  }

  .related-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .related-grid > div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--art-border-color);
    border-radius: 8px;
  }

  .drawer-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .full-width {
    width: 100%;
  }

  @media (width <= 800px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 620px) {
    .summary-grid,
    .compare-grid,
    .related-grid {
      grid-template-columns: 1fr;
    }

    .table-toolbar {
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
    }
  }
</style>
