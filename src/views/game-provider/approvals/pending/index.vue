<template>
  <div class="approval-page">
    <AppPageHeader
      title="待審核"
      eyebrow="審核中心"
      description="集中處理風控規則、代理、商戶、遊戲與獎池的異動申請。"
    >
      <template #actions>
        <ElTag type="danger" effect="light" round>{{ store.overdueItems.length }} 筆逾時</ElTag>
        <ElButton @click="refreshData">重新整理</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <button
        v-for="item in summaries"
        :key="item.label"
        type="button"
        @click="quickFilter(item.type)"
      >
        <span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </button>
    </div>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="table-card" shadow="never">
      <div class="table-toolbar">
        <div
          ><strong>待審核申請</strong><span>共 {{ filteredRows.length }} 筆</span></div
        >
        <ElButton type="primary" plain :disabled="!selectedRows.length" @click="approveSelected"
          >批次核准（{{ selectedRows.length }}）</ElButton
        >
      </div>
      <ElTable :data="pagedRows" border row-key="id" @selection-change="selectedRows = $event">
        <ElTableColumn type="selection" width="48" />
        <ElTableColumn label="申請" min-width="270" fixed="left">
          <template #default="scope"
            ><button class="primary-link" type="button" @click="openDrawer(scope.row.id)"
              ><strong>{{ scope.row.title }}</strong
              ><small>{{ scope.row.id }} · {{ sourceLabel(scope.row.sourceType) }}</small></button
            ></template
          >
        </ElTableColumn>
        <ElTableColumn label="優先級" width="95"
          ><template #default="scope"
            ><ElTag :type="priorityType(scope.row.priority)" effect="light">{{
              priorityLabel(scope.row.priority)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="申請動作" prop="action" min-width="135" />
        <ElTableColumn label="來源對象" min-width="180"
          ><template #default="scope"
            ><span>{{ scope.row.sourceName }}</span
            ><br /><small>{{ scope.row.sourceId }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn label="申請人" prop="requester" min-width="140" />
        <ElTableColumn label="申請時間" prop="requestedAt" width="155" />
        <ElTableColumn label="處理期限" width="155"
          ><template #default="scope"
            ><span :class="{ overdue: isOverdue(scope.row) }">{{ scope.row.dueAt }}</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="敏感異動" width="95" align="center"
          ><template #default="scope"
            ><ElTag v-if="hasSensitiveChanges(scope.row)" type="danger" effect="plain">有</ElTag
            ><span v-else>—</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openDrawer(scope.row.id)"
              >審核</ElButton
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
      :title="currentItem ? `${currentItem.id}｜${currentItem.action}` : '審核詳細'"
      :size="drawerSize"
      destroy-on-close
      @closed="closeDrawer"
    >
      <template v-if="currentItem">
        <div class="drawer-status"
          ><ElTag :type="priorityType(currentItem.priority)" effect="light"
            >{{ priorityLabel(currentItem.priority) }}優先</ElTag
          ><ElTag type="warning" effect="light">待審核</ElTag
          ><ElTag v-if="isOverdue(currentItem)" type="danger">已逾時</ElTag></div
        >
        <section class="drawer-section">
          <div class="section-title"
            ><div><h3>申請摘要</h3><p>確認來源、申請人與異動目的。</p></div
            ><ElButton @click="openSource(currentItem)">查看來源資料</ElButton></div
          >
          <ElDescriptions :column="drawerColumns" border>
            <ElDescriptionsItem label="來源類型">{{
              sourceLabel(currentItem.sourceType)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="來源編號">{{ currentItem.sourceId }}</ElDescriptionsItem>
            <ElDescriptionsItem label="申請人">{{ currentItem.requester }}</ElDescriptionsItem>
            <ElDescriptionsItem label="處理期限">{{ currentItem.dueAt }}</ElDescriptionsItem>
            <ElDescriptionsItem label="申請說明" :span="drawerColumns">{{
              currentItem.summary
            }}</ElDescriptionsItem>
          </ElDescriptions>
        </section>
        <section class="drawer-section">
          <div class="section-title"
            ><div><h3>異動內容</h3><p>敏感異動以紅色標示，核准前必須逐項確認。</p></div></div
          >
          <ElTable :data="currentItem.changes" border>
            <ElTableColumn label="欄位" min-width="140"
              ><template #default="scope"
                ><span>{{ scope.row.field }}</span
                ><ElTag
                  v-if="scope.row.sensitive"
                  class="sensitive-tag"
                  type="danger"
                  size="small"
                  effect="plain"
                  >敏感</ElTag
                ></template
              ></ElTableColumn
            >
            <ElTableColumn label="異動前" prop="before" min-width="170" />
            <ElTableColumn label="異動後" min-width="170"
              ><template #default="scope"
                ><strong>{{ scope.row.after }}</strong></template
              ></ElTableColumn
            >
          </ElTable>
        </section>
        <section class="drawer-section">
          <div class="section-title"
            ><div><h3>審核紀錄</h3><p>完整保留送審與決議。</p></div></div
          >
          <ElTimeline
            ><ElTimelineItem
              v-for="log in currentLogs"
              :key="log.id"
              :timestamp="log.time"
              placement="top"
              ><strong>{{ log.action }}</strong
              ><p class="log-reason">{{ log.reason }}</p
              ><small
                >{{ stateLabel(log.before) }} → {{ stateLabel(log.after) }} ·
                {{ log.operator }}</small
              ></ElTimelineItem
            ></ElTimeline
          >
        </section>
      </template>
      <template #footer
        ><div v-if="currentItem" class="drawer-actions"
          ><ElButton type="danger" plain @click="reviewCurrent(false)">駁回</ElButton
          ><ElButton type="primary" @click="reviewCurrent(true)">核准</ElButton></div
        ></template
      >
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { ApprovalRecord, ApprovalSourceType } from '@/types/game-provider'
  import { useApprovalCenterStore } from '@/store/modules/approvalCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'ApprovalPending' })
  const route = useRoute()
  const router = useRouter()
  const store = useApprovalCenterStore()
  const { width } = useWindowSize()
  const drawerSize = computed(() => (width.value < 760 ? '100%' : 'min(860px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 680 ? 1 : 2))
  const drawerVisible = ref(Boolean(route.query.approvalId))
  const selectedId = ref(String(route.query.approvalId || ''))
  const selectedRows = ref<ApprovalRecord[]>([])
  const searchForm = ref<Record<string, unknown>>({})
  const appliedFilters = ref<Record<string, unknown>>({})
  const pagination = reactive({ current: 1, size: 20 })
  const sourceOptions: Array<{ label: string; value: ApprovalSourceType }> = [
    { label: '風控規則', value: 'Risk Rule' },
    { label: '代理', value: 'Agent' },
    { label: '商戶', value: 'Merchant' },
    { label: '遊戲', value: 'Game' },
    { label: '獎池', value: 'Jackpot' }
  ]
  const priorityOptions = [
    { label: '緊急', value: 'Urgent' },
    { label: '高', value: 'High' },
    { label: '一般', value: 'Normal' }
  ]
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '申請編號、來源、名稱', clearable: true }
    },
    {
      label: '來源類型',
      key: 'sourceType',
      type: 'select',
      props: { placeholder: '全部來源', clearable: true, options: sourceOptions }
    },
    {
      label: '優先級',
      key: 'priority',
      type: 'select',
      props: { placeholder: '全部優先級', clearable: true, options: priorityOptions }
    },
    {
      label: '申請人',
      key: 'requester',
      type: 'input',
      props: { placeholder: '輸入申請人', clearable: true }
    }
  ])
  const summaries = computed(() => [
    { label: '全部待審', value: store.pendingItems.length, note: '等待人工決議', type: '' },
    ...sourceOptions.map((item) => ({
      label: item.label,
      value: store.pendingItems.filter((row) => row.sourceType === item.value).length,
      note: '待審核申請',
      type: item.value
    }))
  ])
  const filteredRows = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    const requester = String(appliedFilters.value.requester || '')
      .trim()
      .toLowerCase()
    return store.pendingItems.filter((item) => {
      const text = `${item.id} ${item.title} ${item.sourceId} ${item.sourceName}`.toLowerCase()
      return (
        (!keyword || text.includes(keyword)) &&
        (!appliedFilters.value.sourceType || item.sourceType === appliedFilters.value.sourceType) &&
        (!appliedFilters.value.priority || item.priority === appliedFilters.value.priority) &&
        (!requester || item.requester.toLowerCase().includes(requester))
      )
    })
  })
  const pagedRows = computed(() =>
    filteredRows.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  const currentItem = computed(() => store.findApproval(selectedId.value))
  const currentLogs = computed(() =>
    currentItem.value ? store.getApprovalLogs(currentItem.value.id) : []
  )
  const sourceLabel = (value: ApprovalSourceType) =>
    sourceOptions.find((item) => item.value === value)?.label || value
  const priorityLabel = (value: ApprovalRecord['priority']) =>
    ({ Normal: '一般', High: '高', Urgent: '緊急' })[value]
  const priorityType = (value: ApprovalRecord['priority']) =>
    value === 'Urgent' ? 'danger' : value === 'High' ? 'warning' : 'info'
  const stateLabel = (value: string) =>
    ({ Draft: '草稿', Pending: '待審核', Approved: '已通過', Rejected: '已駁回' })[value] || value
  const isOverdue = (item: ApprovalRecord) =>
    new Date(item.dueAt.replace(' ', 'T')).getTime() < Date.now()
  const hasSensitiveChanges = (item: ApprovalRecord) =>
    item.changes.some((change) => change.sensitive)
  const applyFilters = (params: Record<string, unknown>) => {
    appliedFilters.value = { ...params }
    pagination.current = 1
  }
  const resetFilters = () => {
    searchForm.value = {}
    appliedFilters.value = {}
    pagination.current = 1
  }
  const quickFilter = (type: string) => {
    searchForm.value = type ? { sourceType: type } : {}
    appliedFilters.value = { ...searchForm.value }
    pagination.current = 1
  }
  const refreshData = () => ElMessage.success('待審核資料已重新整理')
  const openDrawer = (id: string) => {
    selectedId.value = id
    drawerVisible.value = true
    router.replace({ query: { ...route.query, approvalId: id } })
  }
  const closeDrawer = () => {
    selectedId.value = ''
    router.replace({ query: { ...route.query, approvalId: undefined } })
  }
  const openSource = (item: ApprovalRecord) => {
    if (item.sourceType === 'Risk Rule')
      router.push({ path: '/risk/rules', query: { ruleId: item.sourceId } })
    if (item.sourceType === 'Agent') router.push(`/business/agents/${item.sourceId}`)
    if (item.sourceType === 'Merchant') router.push(`/business/merchants/${item.sourceId}`)
    if (item.sourceType === 'Game') router.push(`/games/management/${item.sourceId}`)
    if (item.sourceType === 'Jackpot') router.push(`/jackpots/${item.sourceId}`)
  }
  const reviewCurrent = async (approved: boolean) => {
    if (!currentItem.value) return
    const result = await ElMessageBox.prompt(
      approved ? '請輸入核准說明' : '請具體說明駁回原因',
      approved ? '核准申請' : '駁回申請',
      {
        inputValue: approved ? '資料與設定已確認，符合目前營運規範。' : '',
        inputPattern: /.{4,}/,
        inputErrorMessage: '說明至少 4 個字',
        confirmButtonText: approved ? '確認核准' : '確認駁回',
        cancelButtonText: '取消',
        type: approved ? 'success' : 'warning'
      }
    ).catch(() => null)
    if (!result) return
    const id = currentItem.value.id
    if (store.review(id, approved, result.value)) {
      drawerVisible.value = false
      ElMessage.success(`${id} 已${approved ? '核准' : '駁回'}`)
    }
  }
  const approveSelected = async () => {
    const result = await ElMessageBox.prompt('請輸入本次批次核准說明', '批次核准', {
      inputValue: '已逐項確認申請內容與敏感異動。',
      inputPattern: /.{4,}/,
      inputErrorMessage: '說明至少 4 個字',
      confirmButtonText: '確認核准',
      cancelButtonText: '取消'
    }).catch(() => null)
    if (!result) return
    const count = store.batchApprove(
      selectedRows.value.map((item) => item.id),
      result.value
    )
    selectedRows.value = []
    ElMessage.success(`已核准 ${count} 筆申請`)
  }
  watch(
    () => route.query.approvalId,
    (id) => {
      if (id) {
        selectedId.value = String(id)
        drawerVisible.value = true
      }
    }
  )
</script>

<style scoped lang="scss">
  .approval-page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid button {
    display: grid;
    gap: 5px;
    padding: 15px;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .summary-grid button:hover {
    border-color: var(--el-color-primary);
  }

  .summary-grid span,
  .summary-grid small,
  .table-toolbar span,
  small,
  .section-title p {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 24px;
    color: var(--art-gray-900);
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .table-toolbar,
  .drawer-status,
  .drawer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .table-toolbar {
    padding: 16px 18px;
  }

  .table-toolbar > div,
  .primary-link {
    display: grid;
    gap: 4px;
  }

  .primary-link {
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .primary-link:hover strong {
    color: var(--el-color-primary);
  }

  .overdue {
    font-weight: 600;
    color: var(--el-color-danger);
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px 18px;
  }

  .drawer-status {
    justify-content: flex-start;
    margin-bottom: 16px;
  }

  .drawer-section {
    padding: 18px;
    margin-bottom: 16px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .section-title {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 15px;
  }

  .section-title h3,
  .section-title p,
  .log-reason {
    margin: 0;
  }

  .section-title p {
    margin-top: 4px;
    font-size: 13px;
  }

  .sensitive-tag {
    margin-left: 8px;
  }

  .log-reason {
    margin: 6px 0;
  }

  @media (width <= 1100px) {
    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
