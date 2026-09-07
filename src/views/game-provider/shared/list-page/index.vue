<template>
  <div class="module-list-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">{{ moduleConfig.eyebrow }}</p>
        <h1>{{ moduleConfig.title }}</h1>
        <p class="description">{{ moduleConfig.description }}</p>
      </div>
      <GameProviderStatusTag status="Draft" />
    </header>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :show-expand="false"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card table-card">
      <ArtTableHeader :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="handlePrimaryAction" v-ripple>
              {{ moduleConfig.primaryAction }}
            </ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="handleBatchAction">
              批次操作
            </ElButton>
            <ElButton @click="exportRows">匯出</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :data="pagedRows"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        height="520"
        @selection-change="selectedRows = $event"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage } from 'element-plus'
  import type { ColumnOption } from '@/types'
  import type { BusinessRecord, BusinessStatus } from '@/types/game-provider'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import { businessModuleDefinitions } from '@/config/game-provider/modules'
  import { genericCollections } from '@/mock/game-provider'

  defineOptions({ name: 'GameProviderModuleList' })

  const route = useRoute()
  const router = useRouter()
  const routeBase = computed(() =>
    String(route.meta.moduleKey || `/${route.path.split('/').filter(Boolean)[0] || 'merchants'}`)
  )
  const moduleConfig = computed(
    () => businessModuleDefinitions[routeBase.value] || businessModuleDefinitions['/merchants']
  )
  const sourceRows = computed(() => genericCollections[routeBase.value] || [])

  const searchForm = ref<{ keyword?: string; status?: BusinessStatus }>({})
  const filteredRows = ref<BusinessRecord[]>([])
  const loading = ref(false)
  const selectedRows = ref<BusinessRecord[]>([])
  const pagination = reactive({ current: 1, size: 20, total: 0 })

  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: `搜尋${moduleConfig.value.codeLabel}或名稱`, clearable: true }
    },
    {
      label: '狀態',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '全部狀態',
        clearable: true,
        options: [
          'Active',
          'Inactive',
          'Maintenance',
          'Pending',
          'Disabled',
          'Draft',
          'Published',
          'Risk'
        ].map((status) => ({ label: status, value: status }))
      }
    }
  ])

  const columns = computed<ColumnOption[]>(() => [
    { type: 'selection', width: 50 },
    { prop: 'code', label: moduleConfig.value.codeLabel, minWidth: 145 },
    { prop: 'name', label: moduleConfig.value.nameLabel, minWidth: 190 },
    { prop: 'category', label: moduleConfig.value.categoryLabel, minWidth: 130 },
    { prop: 'owner', label: moduleConfig.value.ownerLabel, minWidth: 140 },
    { prop: 'metric', label: moduleConfig.value.metricLabel, minWidth: 140 },
    {
      prop: 'status',
      label: '狀態',
      width: 130,
      formatter: (row: BusinessRecord) => h(GameProviderStatusTag, { status: row.status })
    },
    { prop: 'updatedAt', label: '更新時間', minWidth: 165 },
    {
      prop: 'operation',
      label: '操作',
      width: 110,
      fixed: 'right',
      formatter: (row: BusinessRecord) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            disabled: !moduleConfig.value.detailBase,
            onClick: () => openDetail(row)
          },
          () => '查看'
        )
    }
  ])

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })

  const syncRows = (rows = sourceRows.value) => {
    filteredRows.value = [...rows]
    pagination.total = rows.length
    pagination.current = 1
  }

  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    const status = params.status as BusinessStatus | undefined
    const rows = sourceRows.value.filter((row) => {
      const matchesKeyword = !keyword || `${row.code} ${row.name}`.toLowerCase().includes(keyword)
      return matchesKeyword && (!status || row.status === status)
    })
    syncRows(rows)
  }

  const resetFilters = () => syncRows()
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }
  const handleCurrentChange = (current: number) => (pagination.current = current)

  const refreshData = async () => {
    loading.value = true
    await new Promise((resolve) => setTimeout(resolve, 450))
    syncRows()
    loading.value = false
    ElMessage.success('Mock 資料已重新整理')
  }

  const handlePrimaryAction = () =>
    ElMessage.info(`${moduleConfig.value.primaryAction}將在下一階段接入表單流程`)
  const handleBatchAction = () => ElMessage.success(`已選取 ${selectedRows.value.length} 筆資料`)

  const exportRows = () => {
    const rows = filteredRows.value
    const header = ['ID', 'Code', 'Name', 'Category', 'Owner', 'Metric', 'Status', 'Updated At']
    const csv = [
      header,
      ...rows.map((row) => [
        row.id,
        row.code,
        row.name,
        row.category,
        row.owner,
        row.metric,
        row.status,
        row.updatedAt
      ])
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = `${routeBase.value.slice(1)}-mock.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('Mock CSV 已匯出')
  }

  const openDetail = (row: BusinessRecord) => {
    if (moduleConfig.value.detailBase) router.push(`${moduleConfig.value.detailBase}/${row.id}`)
  }

  watch(routeBase, () => syncRows(), { immediate: true })
</script>

<style scoped lang="scss">
  .module-list-page {
    display: grid;
    gap: 16px;
  }

  .page-heading {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 4px 2px;

    .eyebrow {
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--theme-color);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--art-gray-900);
    }

    .description {
      margin-top: 8px;
      color: var(--art-gray-600);
    }
  }

  .table-card :deep(.el-card__body) {
    height: 100%;
  }

  @media (width <= 640px) {
    .page-heading {
      gap: 12px;

      h1 {
        font-size: 21px;
      }

      .description {
        font-size: 13px;
      }
    }
  }
</style>
