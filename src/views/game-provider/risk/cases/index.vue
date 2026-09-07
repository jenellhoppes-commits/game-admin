<template>
  <div class="risk-case-page">
    <AppPageHeader
      title="風控案件"
      eyebrow="風控中心"
      description="集中追蹤由告警建立的調查案件、責任人、處理期限與案件結果。"
    >
      <template #actions>
        <ElButton @click="router.push('/risk/alerts')">從告警建立案件</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <button
        v-for="item in summaries"
        :key="item.label"
        type="button"
        @click="quickFilter(item.status)"
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
          ><strong>案件清單</strong><span>共 {{ filteredCases.length }} 件</span></div
        >
        <ElButton @click="ElMessage.success('風控案件已重新整理')">重新整理</ElButton>
      </div>
      <ElTable :data="pagedCases" border row-key="id" @row-dblclick="openCase">
        <ElTableColumn label="案件" min-width="260" fixed="left">
          <template #default="scope">
            <button class="primary-link" type="button" @click="openCase(scope.row)">
              <strong>{{ scope.row.title }}</strong
              ><small>{{ scope.row.id }} · {{ scope.row.alertIds.length }} 筆告警</small>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn label="分類" width="125"
          ><template #default="scope">{{
            categoryLabel(scope.row.category)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="風險" width="95"
          ><template #default="scope"
            ><ElTag :type="severityType(scope.row.severity)" effect="light">{{
              severityLabel(scope.row.severity)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="優先級" width="95"
          ><template #default="scope">{{
            priorityLabel(scope.row.priority)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" width="115"
          ><template #default="scope"
            ><ElTag :type="statusType(scope.row.status)" effect="light">{{
              statusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="處理人" min-width="135"
          ><template #default="scope">{{ scope.row.assignee || '未指派' }}</template></ElTableColumn
        >
        <ElTableColumn label="關聯資料" min-width="170"
          ><template #default="scope"
            >會員 {{ scope.row.memberIds.length }} · 注單 {{ scope.row.betIds.length }} · 交易
            {{ scope.row.transactionIds.length }}</template
          ></ElTableColumn
        >
        <ElTableColumn label="建立時間" prop="openedAt" width="155" />
        <ElTableColumn label="處理期限" width="155"
          ><template #default="scope"
            ><span :class="{ overdue: isOverdue(scope.row) }">{{ scope.row.dueAt }}</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openCase(scope.row)">查看</ElButton></template
          ></ElTableColumn
        >
      </ElTable>
      <div class="pagination-wrap">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredCases.length"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type {
    RiskAlertCategory,
    RiskCaseRecord,
    RiskCaseStatus,
    RiskSeverity
  } from '@/types/game-provider'
  import { useRiskCenterStore } from '@/store/modules/riskCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'RiskCases' })
  const router = useRouter()
  const store = useRiskCenterStore()
  const pagination = reactive({ current: 1, size: 20 })
  const searchForm = ref<Record<string, unknown>>({})
  const appliedFilters = ref<Record<string, unknown>>({})
  const categoryOptions = [
    { label: '會員異常', value: 'Member' },
    { label: '注單異常', value: 'Bet' },
    { label: '交易異常', value: 'Transaction' },
    { label: '商戶線路異常', value: 'Merchant Line' },
    { label: '遊戲異常', value: 'Game' },
    { label: '獎池異常', value: 'Jackpot' }
  ]
  const statusOptions = [
    { label: '待處理', value: 'Open' },
    { label: '調查中', value: 'Investigating' },
    { label: '待決議', value: 'Pending Decision' },
    { label: '已完成', value: 'Resolved' },
    { label: '已關閉', value: 'Closed' }
  ]
  const severityOptions = [
    { label: '嚴重', value: 'Critical' },
    { label: '高', value: 'High' },
    { label: '中', value: 'Medium' },
    { label: '低', value: 'Low' }
  ]
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '案件編號、標題、處理人', clearable: true }
    },
    {
      label: '分類',
      key: 'category',
      type: 'select',
      props: { placeholder: '全部分類', clearable: true, options: categoryOptions }
    },
    {
      label: '案件狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    },
    {
      label: '風險等級',
      key: 'severity',
      type: 'select',
      props: { placeholder: '全部等級', clearable: true, options: severityOptions }
    }
  ])
  const summaries = computed(() => [
    { label: '全部案件', value: store.cases.length, note: '所有調查案件', status: '' },
    {
      label: '待處理',
      value: store.cases.filter((item) => item.status === 'Open').length,
      note: '尚未指派',
      status: 'Open'
    },
    {
      label: '調查中',
      value: store.cases.filter((item) => item.status === 'Investigating').length,
      note: '資料查核中',
      status: 'Investigating'
    },
    {
      label: '待決議',
      value: store.cases.filter((item) => item.status === 'Pending Decision').length,
      note: '等待風控決議',
      status: 'Pending Decision'
    },
    {
      label: '逾時案件',
      value: store.cases.filter(isOverdue).length,
      note: '優先處理',
      status: 'overdue'
    }
  ])
  const filteredCases = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    return store.cases.filter((item) => {
      const text =
        `${item.id} ${item.title} ${item.assignee || ''} ${item.alertIds.join(' ')}`.toLowerCase()
      const overdueMatch = appliedFilters.value.overdue ? isOverdue(item) : true
      return (
        (!keyword || text.includes(keyword)) &&
        (!appliedFilters.value.category || item.category === appliedFilters.value.category) &&
        (!appliedFilters.value.status || item.status === appliedFilters.value.status) &&
        (!appliedFilters.value.severity || item.severity === appliedFilters.value.severity) &&
        overdueMatch
      )
    })
  })
  const pagedCases = computed(() =>
    filteredCases.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  function isOverdue(item: RiskCaseRecord) {
    return (
      !['Resolved', 'Closed'].includes(item.status) &&
      new Date(item.dueAt.replace(' ', 'T')).getTime() < Date.now()
    )
  }
  const categoryLabel = (value: RiskAlertCategory) =>
    categoryOptions.find((item) => item.value === value)?.label || value
  const statusLabel = (value: RiskCaseStatus) =>
    statusOptions.find((item) => item.value === value)?.label || value
  const severityLabel = (value: RiskSeverity) =>
    severityOptions.find((item) => item.value === value)?.label || value
  const severityType = (value: RiskSeverity) =>
    value === 'Critical' || value === 'High' ? 'danger' : value === 'Medium' ? 'warning' : 'info'
  const statusType = (value: RiskCaseStatus) =>
    value === 'Resolved' || value === 'Closed'
      ? 'success'
      : value === 'Investigating'
        ? 'warning'
        : value === 'Open'
          ? 'danger'
          : 'primary'
  const priorityLabel = (value: RiskCaseRecord['priority']) =>
    ({ Low: '低', Normal: '一般', High: '高', Urgent: '緊急' })[value]
  const applyFilters = (params: Record<string, unknown>) => {
    appliedFilters.value = { ...params }
    pagination.current = 1
  }
  const resetFilters = () => {
    searchForm.value = {}
    appliedFilters.value = {}
    pagination.current = 1
  }
  const quickFilter = (status: string) => {
    searchForm.value = status === 'overdue' ? {} : { status }
    appliedFilters.value = status === 'overdue' ? { overdue: true } : status ? { status } : {}
    pagination.current = 1
  }
  const openCase = (item: RiskCaseRecord) => router.push(`/risk/cases/${item.id}`)
</script>

<style scoped lang="scss">
  .risk-case-page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid button {
    display: grid;
    gap: 5px;
    padding: 16px;
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
  small {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 24px;
    color: var(--art-gray-900);
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

  @media (width <= 1000px) {
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
