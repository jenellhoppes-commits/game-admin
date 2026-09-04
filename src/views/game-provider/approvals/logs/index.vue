<template>
  <div class="approval-log-page">
    <AppPageHeader
      title="審核紀錄"
      eyebrow="審核中心"
      description="查詢所有送審、核准與駁回操作，保留完整決議軌跡。"
    >
      <template #actions
        ><ElButton @click="ElMessage.success('審核紀錄已重新整理')">重新整理</ElButton></template
      >
    </AppPageHeader>
    <ElAlert title="審核紀錄為唯讀資料，不可修改或刪除。" type="info" :closable="false" show-icon />
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
          ><strong>審核操作紀錄</strong><span>共 {{ filteredLogs.length }} 筆</span></div
        ><ElTag type="info" effect="plain">唯讀</ElTag></div
      >
      <ElTable :data="pagedLogs" border row-key="id">
        <ElTableColumn label="操作時間" prop="time" width="155" fixed="left" />
        <ElTableColumn label="申請編號" min-width="135"
          ><template #default="scope"
            ><button
              class="primary-link"
              type="button"
              @click="openApproval(scope.row.approvalId)"
              >{{ scope.row.approvalId }}</button
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="來源" min-width="120"
          ><template #default="scope">{{
            sourceLabel(scope.row.approvalId)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" prop="action" min-width="120" />
        <ElTableColumn label="狀態變化" min-width="180"
          ><template #default="scope"
            ><span>{{ stateLabel(scope.row.before) }}</span
            ><ArtSvgIcon icon="ri:arrow-right-line" /><strong>{{
              stateLabel(scope.row.after)
            }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="原因／說明" prop="reason" min-width="300" show-overflow-tooltip />
        <ElTableColumn label="操作人" prop="operator" min-width="145" />
        <ElTableColumn label="紀錄編號" prop="id" width="180" />
      </ElTable>
      <div class="pagination-wrap"
        ><ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredLogs.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
      /></div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { ApprovalSourceType } from '@/types/game-provider'
  import { useApprovalCenterStore } from '@/store/modules/approvalCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'ApprovalLogs' })
  const router = useRouter()
  const store = useApprovalCenterStore()
  const searchForm = ref<Record<string, unknown>>({})
  const appliedFilters = ref<Record<string, unknown>>({})
  const pagination = reactive({ current: 1, size: 20 })
  const actionOptions = [
    { label: '送出審核', value: '送出審核' },
    { label: '核准', value: '核准' },
    { label: '駁回', value: '駁回' }
  ]
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '申請編號、原因、紀錄編號', clearable: true }
    },
    {
      label: '操作',
      key: 'action',
      type: 'select',
      props: { placeholder: '全部操作', clearable: true, options: actionOptions }
    },
    {
      label: '操作人',
      key: 'operator',
      type: 'input',
      props: { placeholder: '輸入操作人', clearable: true }
    },
    {
      label: '操作時間',
      key: 'dateRange',
      type: 'daterange',
      props: { startPlaceholder: '開始日期', endPlaceholder: '結束日期', valueFormat: 'YYYY-MM-DD' }
    }
  ])
  const filteredLogs = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    const operator = String(appliedFilters.value.operator || '')
      .trim()
      .toLowerCase()
    const range = appliedFilters.value.dateRange as string[] | undefined
    return [...store.logs]
      .sort((a, b) => b.time.localeCompare(a.time))
      .filter((item) => {
        const text = `${item.id} ${item.approvalId} ${item.reason}`.toLowerCase()
        return (
          (!keyword || text.includes(keyword)) &&
          (!appliedFilters.value.action || item.action === appliedFilters.value.action) &&
          (!operator || item.operator.toLowerCase().includes(operator)) &&
          (!range?.length ||
            (item.time.slice(0, 10) >= range[0] && item.time.slice(0, 10) <= range[1]))
        )
      })
  })
  const pagedLogs = computed(() =>
    filteredLogs.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  const sourceNames: Record<ApprovalSourceType, string> = {
    'Risk Rule': '風控規則',
    Agent: '代理',
    Merchant: '商戶',
    Game: '遊戲',
    Jackpot: '獎池'
  }
  const sourceLabel = (approvalId: string) => {
    const item = store.findApproval(approvalId)
    return item ? sourceNames[item.sourceType] : '未知來源'
  }
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
  const openApproval = (id: string) => {
    const item = store.findApproval(id)
    if (!item) return
    const path =
      item.status === 'Pending'
        ? '/approvals/pending'
        : item.status === 'Approved'
          ? '/approvals/approved'
          : '/approvals/rejected'
    router.push({ path, query: { approvalId: id } })
  }
</script>

<style scoped lang="scss">
  .approval-log-page {
    display: grid;
    gap: 16px;
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .table-toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
  }

  .table-toolbar > div {
    display: grid;
    gap: 4px;
  }

  .table-toolbar span {
    color: var(--art-gray-500);
  }

  .primary-link {
    padding: 0;
    font: inherit;
    color: var(--el-color-primary);
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px 18px;
  }
</style>
