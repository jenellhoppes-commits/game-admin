<template>
  <div class="approval-history-page">
    <AppPageHeader :title="pageTitle" eyebrow="審核中心" :description="pageDescription">
      <template #actions
        ><ElButton @click="ElMessage.success(`${pageTitle}資料已重新整理`)"
          >重新整理</ElButton
        ></template
      >
    </AppPageHeader>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="table-card" shadow="never">
      <div class="table-toolbar"
        ><div
          ><strong>{{ pageTitle }}申請</strong><span>共 {{ filteredRows.length }} 筆</span></div
        ><ElTag :type="targetStatus === 'Approved' ? 'success' : 'danger'" effect="light">{{
          pageTitle
        }}</ElTag></div
      >
      <ElTable :data="pagedRows" border row-key="id">
        <ElTableColumn label="申請" min-width="270" fixed="left"
          ><template #default="scope"
            ><button class="primary-link" type="button" @click="openDrawer(scope.row.id)"
              ><strong>{{ scope.row.title }}</strong
              ><small>{{ scope.row.id }} · {{ sourceLabel(scope.row.sourceType) }}</small></button
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="來源對象" min-width="180"
          ><template #default="scope"
            ><span>{{ scope.row.sourceName }}</span
            ><br /><small>{{ scope.row.sourceId }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn label="申請人" prop="requester" min-width="140" />
        <ElTableColumn label="審核人" prop="reviewer" min-width="140" />
        <ElTableColumn label="審核說明" prop="reviewReason" min-width="260" show-overflow-tooltip />
        <ElTableColumn label="申請時間" prop="requestedAt" width="155" />
        <ElTableColumn label="決議時間" prop="reviewedAt" width="155" />
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openDrawer(scope.row.id)"
              >查看</ElButton
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
          ><ElTag :type="currentItem.status === 'Approved' ? 'success' : 'danger'" effect="light">{{
            currentItem.status === 'Approved' ? '已通過' : '已駁回'
          }}</ElTag
          ><span>{{ currentItem.reviewedAt }} · {{ currentItem.reviewer }}</span></div
        >
        <ElAlert
          :title="currentItem.reviewReason || '未填寫審核說明'"
          :type="currentItem.status === 'Approved' ? 'success' : 'error'"
          :closable="false"
          show-icon
        />
        <section class="drawer-section">
          <div class="section-title"
            ><div
              ><h3>申請內容</h3><p>{{ currentItem.summary }}</p></div
            ><ElButton @click="openSource(currentItem)">查看來源資料</ElButton></div
          >
          <ElDescriptions :column="drawerColumns" border>
            <ElDescriptionsItem label="來源類型">{{
              sourceLabel(currentItem.sourceType)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="來源編號">{{ currentItem.sourceId }}</ElDescriptionsItem>
            <ElDescriptionsItem label="申請人">{{ currentItem.requester }}</ElDescriptionsItem>
            <ElDescriptionsItem label="申請時間">{{ currentItem.requestedAt }}</ElDescriptionsItem>
          </ElDescriptions>
        </section>
        <section class="drawer-section">
          <div class="section-title"
            ><div><h3>異動內容</h3><p>保留審核當時的欄位快照。</p></div></div
          >
          <ElTable :data="currentItem.changes" border
            ><ElTableColumn label="欄位" prop="field" min-width="140" /><ElTableColumn
              label="異動前"
              prop="before"
              min-width="170"
            /><ElTableColumn label="異動後" min-width="170"
              ><template #default="scope"
                ><strong>{{ scope.row.after }}</strong
                ><ElTag v-if="scope.row.sensitive" type="danger" size="small" effect="plain"
                  >敏感</ElTag
                ></template
              ></ElTableColumn
            ></ElTable
          >
        </section>
        <section class="drawer-section">
          <div class="section-title"
            ><div><h3>審核軌跡</h3><p>送審與決議皆完整保留。</p></div></div
          >
          <ElTimeline
            ><ElTimelineItem
              v-for="log in currentLogs"
              :key="log.id"
              :timestamp="log.time"
              placement="top"
              :type="
                log.after === 'Approved'
                  ? 'success'
                  : log.after === 'Rejected'
                    ? 'danger'
                    : 'primary'
              "
              ><strong>{{ log.action }}</strong
              ><p>{{ log.reason }}</p
              ><small
                >{{ stateLabel(log.before) }} → {{ stateLabel(log.after) }} ·
                {{ log.operator }}</small
              ></ElTimelineItem
            ></ElTimeline
          >
        </section>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { ApprovalRecord, ApprovalSourceType, ApprovalStatus } from '@/types/game-provider'
  import { useApprovalCenterStore } from '@/store/modules/approvalCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'ApprovalHistoryList' })
  const route = useRoute()
  const router = useRouter()
  const store = useApprovalCenterStore()
  const { width } = useWindowSize()
  const drawerSize = computed(() => (width.value < 760 ? '100%' : 'min(820px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 680 ? 1 : 2))
  const targetStatus = computed<ApprovalStatus>(() =>
    route.name === 'ApprovalRejected' ? 'Rejected' : 'Approved'
  )
  const pageTitle = computed(() => (targetStatus.value === 'Approved' ? '已通過' : '已駁回'))
  const pageDescription = computed(() =>
    targetStatus.value === 'Approved'
      ? '查詢已核准並同步生效的申請與設定快照。'
      : '查詢遭駁回的申請、原因與原始異動內容。'
  )
  const drawerVisible = ref(Boolean(route.query.approvalId))
  const selectedId = ref(String(route.query.approvalId || ''))
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
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '申請編號、來源、說明', clearable: true }
    },
    {
      label: '來源類型',
      key: 'sourceType',
      type: 'select',
      props: { placeholder: '全部來源', clearable: true, options: sourceOptions }
    },
    {
      label: '申請人',
      key: 'requester',
      type: 'input',
      props: { placeholder: '輸入申請人', clearable: true }
    },
    {
      label: '審核人',
      key: 'reviewer',
      type: 'input',
      props: { placeholder: '輸入審核人', clearable: true }
    }
  ])
  const rows = computed(() => store.approvals.filter((item) => item.status === targetStatus.value))
  const filteredRows = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    const requester = String(appliedFilters.value.requester || '')
      .trim()
      .toLowerCase()
    const reviewer = String(appliedFilters.value.reviewer || '')
      .trim()
      .toLowerCase()
    return rows.value.filter((item) => {
      const text =
        `${item.id} ${item.title} ${item.sourceId} ${item.sourceName} ${item.reviewReason || ''}`.toLowerCase()
      return (
        (!keyword || text.includes(keyword)) &&
        (!appliedFilters.value.sourceType || item.sourceType === appliedFilters.value.sourceType) &&
        (!requester || item.requester.toLowerCase().includes(requester)) &&
        (!reviewer || (item.reviewer || '').toLowerCase().includes(reviewer))
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
  const stateLabel = (value: string) =>
    ({ Draft: '草稿', Pending: '待審核', Approved: '已通過', Rejected: '已駁回' })[value] || value
  const applyFilters = (params: Record<string, unknown>) => {
    appliedFilters.value = { ...params }
    pagination.current = 1
  }
  const resetFilters = () => {
    searchForm.value = {}
    appliedFilters.value = {}
    pagination.current = 1
  }
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
  watch(targetStatus, () => {
    resetFilters()
    drawerVisible.value = false
  })
</script>

<style scoped lang="scss">
  .approval-history-page {
    display: grid;
    gap: 16px;
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .table-toolbar,
  .drawer-status {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
  }

  .table-toolbar > div,
  .primary-link {
    display: grid;
    gap: 4px;
  }

  .table-toolbar span,
  small,
  .section-title p,
  .drawer-status span {
    color: var(--art-gray-500);
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

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px 18px;
  }

  .drawer-status {
    justify-content: flex-start;
    padding: 0;
    margin-bottom: 14px;
  }

  .drawer-section {
    padding: 18px;
    margin-top: 16px;
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
  .el-timeline p {
    margin: 0;
  }

  .section-title p {
    margin-top: 4px;
    font-size: 13px;
  }

  .el-table .el-tag {
    margin-left: 8px;
  }
</style>
