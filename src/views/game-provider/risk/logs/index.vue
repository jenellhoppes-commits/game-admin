<template>
  <div class="risk-log-page">
    <AppPageHeader
      title="處理紀錄"
      eyebrow="風控中心"
      description="統一查詢告警與案件的確認、指派、調查、排除及結案紀錄。"
    >
      <template #actions><ElButton @click="refreshLogs">重新整理</ElButton></template>
    </AppPageHeader>

    <ElAlert
      title="風控操作紀錄採追加方式保存；既有紀錄不可編輯或刪除。"
      type="info"
      :closable="false"
      show-icon
    />

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
          ><strong>風控操作紀錄</strong><span>共 {{ filteredLogs.length }} 筆</span></div
        >
        <ElTag type="info" effect="plain">唯讀</ElTag>
      </div>
      <ElTable :data="pagedLogs" border row-key="id">
        <ElTableColumn label="時間" prop="time" width="155" fixed="left" />
        <ElTableColumn label="來源" width="100"
          ><template #default="scope"
            ><ElTag
              :type="scope.row.sourceType === '案件' ? 'warning' : 'primary'"
              effect="light"
              >{{ scope.row.sourceType }}</ElTag
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="來源編號" min-width="130"
          ><template #default="scope"
            ><button class="primary-link" type="button" @click="openSource(scope.row)">{{
              scope.row.sourceId
            }}</button></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" prop="action" min-width="145" />
        <ElTableColumn label="狀態變化" min-width="180"
          ><template #default="scope"
            ><span>{{ translateState(scope.row.before) }}</span
            ><ArtSvgIcon icon="ri:arrow-right-line" /><strong>{{
              translateState(scope.row.after)
            }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="原因／備註" prop="reason" min-width="280" show-overflow-tooltip />
        <ElTableColumn label="操作人" prop="operator" min-width="140" />
        <ElTableColumn label="紀錄編號" prop="id" width="180" />
      </ElTable>
      <div class="pagination-wrap">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredLogs.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useRiskCenterStore } from '@/store/modules/riskCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'RiskProcessingLogs' })
  type LogRow = {
    id: string
    sourceType: '告警' | '案件'
    sourceId: string
    action: string
    before: string
    after: string
    reason: string
    operator: string
    time: string
  }
  const router = useRouter()
  const store = useRiskCenterStore()
  const pagination = reactive({ current: 1, size: 20 })
  const searchForm = ref<Record<string, unknown>>({})
  const appliedFilters = ref<Record<string, unknown>>({})
  const sourceOptions = [
    { label: '告警', value: '告警' },
    { label: '案件', value: '案件' }
  ]
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '來源編號、操作、原因', clearable: true }
    },
    {
      label: '來源類型',
      key: 'sourceType',
      type: 'select',
      props: { placeholder: '全部來源', clearable: true, options: sourceOptions }
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
  const allLogs = computed<LogRow[]>(() =>
    [
      ...store.actionLogs.map((item) => ({
        ...item,
        sourceType: '告警' as const,
        sourceId: item.alertId
      })),
      ...store.caseLogs.map((item) => ({
        ...item,
        sourceType: '案件' as const,
        sourceId: item.caseId
      }))
    ].sort((a, b) => b.time.localeCompare(a.time))
  )
  const filteredLogs = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    const operator = String(appliedFilters.value.operator || '')
      .trim()
      .toLowerCase()
    const range = appliedFilters.value.dateRange as string[] | undefined
    return allLogs.value.filter((item) => {
      const text = `${item.sourceId} ${item.action} ${item.reason} ${item.id}`.toLowerCase()
      return (
        (!keyword || text.includes(keyword)) &&
        (!appliedFilters.value.sourceType || item.sourceType === appliedFilters.value.sourceType) &&
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
  const translations: Record<string, string> = {
    New: '新告警',
    Acknowledged: '已確認',
    Investigating: '調查中',
    Resolved: '已解決',
    Dismissed: '已忽略',
    'False Positive': '誤報',
    Open: '待處理',
    'Pending Decision': '待決議',
    Closed: '已關閉',
    None: '無'
  }
  const translateState = (value: string) => translations[value] || value
  const applyFilters = (params: Record<string, unknown>) => {
    appliedFilters.value = { ...params }
    pagination.current = 1
  }
  const resetFilters = () => {
    searchForm.value = {}
    appliedFilters.value = {}
    pagination.current = 1
  }
  const refreshLogs = () => ElMessage.success('處理紀錄已重新整理')
  const openSource = (item: LogRow) =>
    item.sourceType === '案件'
      ? router.push(`/risk/cases/${item.sourceId}?tab=logs`)
      : router.push({ path: '/risk/alerts', query: { alertId: item.sourceId } })
</script>

<style scoped lang="scss">
  .risk-log-page {
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
