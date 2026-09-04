<template>
  <div class="jackpot-list-page">
    <AppPageHeader
      title="獎池列表"
      eyebrow="獎池管理"
      description="管理獎池主檔、級別、遊戲與商戶適用範圍，並追查流水及派發結果。"
    >
      <template #actions
        ><ElTag type="warning" effect="light" round
          >{{ store.pendingPayoutCount }} 筆待確認派發</ElTag
        ><ElButton type="primary" @click="router.push('/jackpots/create')">新增獎池</ElButton
        ><ElButton @click="exportRows">匯出</ElButton></template
      >
    </AppPageHeader>

    <div class="summary-grid">
      <ElCard v-for="item in summary" :key="item.label" shadow="never"
        ><span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small></ElCard
      >
    </div>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      :label-position="isMobile ? 'top' : 'right'"
      :label-width="isMobile ? 'auto' : '94px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader :loading="loading" @refresh="refreshData"
        ><template #left
          ><div class="toolbar-copy"
            ><strong>獎池查詢結果</strong
            ><span>不同基準幣別的餘額獨立顯示，不進行跨幣別加總。</span></div
          ></template
        ></ArtTableHeader
      >
      <ArtTable
        :data="pagedRows"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        height="560"
        row-key="id"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { ColumnOption } from '@/types'
  import type { JackpotPoolRecord, JackpotStatus, JackpotType } from '@/types/game-provider'
  import { useJackpotCenterStore } from '@/store/modules/jackpotCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'JackpotList' })
  const store = useJackpotCenterStore()
  const router = useRouter()
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const loading = ref(false)
  const searchForm = ref<Record<string, unknown>>({})
  const filteredRows = ref<JackpotPoolRecord[]>([...store.pools])
  const pagination = reactive({ current: 1, size: 10, total: store.pools.length })
  const typeOptions: Array<{ label: string; value: JackpotType }> = [
    { label: '單一遊戲獎池', value: 'Single Game' },
    { label: '多遊戲共享獎池', value: 'Shared Games' },
    { label: '活動獎池', value: 'Campaign' }
  ]
  const statusOptions: Array<{ label: string; value: JackpotStatus }> = [
    { label: '草稿', value: 'Draft' },
    { label: '待審核', value: 'Pending' },
    { label: '啟用中', value: 'Active' },
    { label: '維護中', value: 'Maintenance' },
    { label: '已停用', value: 'Disabled' },
    { label: '已關閉', value: 'Closed' }
  ]
  const currencyOptions = computed(() =>
    Array.from(new Set(store.pools.map((pool) => pool.baseCurrency))).map((currency) => ({
      label: currency,
      value: currency
    }))
  )
  const summary = computed(() => [
    { label: '獎池總數', value: store.pools.length, note: '目前 Mock 主檔' },
    {
      label: '啟用中',
      value: store.pools.filter((pool) => pool.status === 'Active').length,
      note: '可供遊戲與商戶使用'
    },
    {
      label: '維護／停用',
      value: store.pools.filter((pool) => ['Maintenance', 'Disabled'].includes(pool.status)).length,
      note: '目前不可正常參與'
    },
    { label: '待確認派發', value: store.pendingPayoutCount, note: '等待錢包或人工確認' }
  ])
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '獎池 ID、代碼或名稱', clearable: true }
    },
    {
      label: '獎池類型',
      key: 'type',
      type: 'select',
      props: { placeholder: '全部類型', clearable: true, options: typeOptions }
    },
    {
      label: '基準幣別',
      key: 'baseCurrency',
      type: 'select',
      props: { placeholder: '全部幣別', clearable: true, options: currencyOptions.value }
    },
    {
      label: '狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    },
    {
      label: '更新日期',
      key: 'dateRange',
      type: 'daterange',
      props: { startPlaceholder: '開始日期', endPlaceholder: '結束日期', valueFormat: 'YYYY-MM-DD' }
    }
  ])
  const columns = computed<ColumnOption[]>(() => [
    {
      prop: 'id',
      label: '獎池 ID',
      minWidth: 120,
      formatter: (row: JackpotPoolRecord) =>
        h(EntityLink, { label: row.id, secondary: row.code, to: `/jackpots/${row.id}` })
    },
    {
      prop: 'nameZh',
      label: '獎池名稱',
      minWidth: 210,
      formatter: (row: JackpotPoolRecord) =>
        h(EntityLink, { label: row.nameZh, secondary: row.nameEn, to: `/jackpots/${row.id}` })
    },
    {
      prop: 'type',
      label: '獎池類型',
      minWidth: 140,
      formatter: (row: JackpotPoolRecord) => typeLabel(row.type)
    },
    { prop: 'baseCurrency', label: '基準幣別', width: 100 },
    {
      prop: 'levels',
      label: '級別',
      width: 90,
      align: 'right',
      formatter: (row: JackpotPoolRecord) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: () => router.push(`/jackpots/${row.id}?tab=levels`)
          },
          () => `${store.getLevels(row.id).length} 個`
        )
    },
    {
      prop: 'games',
      label: '綁定遊戲',
      width: 110,
      align: 'right',
      formatter: (row: JackpotPoolRecord) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: () => router.push(`/jackpots/${row.id}?tab=games`)
          },
          () =>
            `${store.getGameBindings(row.id).filter((item) => item.status !== 'Disabled').length} 款`
        )
    },
    {
      prop: 'merchants',
      label: '啟用商戶',
      width: 110,
      align: 'right',
      formatter: (row: JackpotPoolRecord) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: () => router.push(`/jackpots/${row.id}?tab=merchants`)
          },
          () =>
            `${store.getMerchantSettings(row.id).filter((item) => item.status === 'Active').length} 家`
        )
    },
    {
      prop: 'currentBalance',
      label: '目前餘額',
      minWidth: 160,
      align: 'right',
      formatter: (row: JackpotPoolRecord) => `${money(row.currentBalance)} ${row.baseCurrency}`
    },
    {
      prop: 'status',
      label: '狀態',
      width: 100,
      formatter: (row: JackpotPoolRecord) =>
        h(ElTag, { type: statusType(row.status), effect: 'light' }, () => statusLabel(row.status))
    },
    { prop: 'updatedAt', label: '更新時間', minWidth: 160 },
    {
      prop: 'operation',
      label: '操作',
      width: 85,
      fixed: 'right',
      formatter: (row: JackpotPoolRecord) =>
        h(
          ElButton,
          { link: true, type: 'primary', onClick: () => router.push(`/jackpots/${row.id}`) },
          () => '查看'
        )
    }
  ])
  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })
  const money = (value: number) =>
    new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value
    )
  const typeLabel = (type: JackpotType) =>
    ({ 'Single Game': '單一遊戲獎池', 'Shared Games': '多遊戲共享獎池', Campaign: '活動獎池' })[
      type
    ]
  const statusLabel = (status: JackpotStatus) =>
    ({
      Draft: '草稿',
      Pending: '待審核',
      Active: '啟用中',
      Maintenance: '維護中',
      Disabled: '已停用',
      Closed: '已關閉'
    })[status]
  const statusType = (status: JackpotStatus) =>
    status === 'Active'
      ? 'success'
      : status === 'Maintenance' || status === 'Pending'
        ? 'warning'
        : status === 'Disabled' || status === 'Closed'
          ? 'danger'
          : 'info'
  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    const range = params.dateRange as string[] | undefined
    filteredRows.value = store.pools.filter((row) => {
      const textMatch =
        !keyword ||
        `${row.id} ${row.code} ${row.nameZh} ${row.nameEn}`.toLowerCase().includes(keyword)
      const dateMatch =
        !range?.length ||
        (row.updatedAt.slice(0, 10) >= range[0] && row.updatedAt.slice(0, 10) <= range[1])
      return (
        textMatch &&
        dateMatch &&
        (!params.type || row.type === params.type) &&
        (!params.baseCurrency || row.baseCurrency === params.baseCurrency) &&
        (!params.status || row.status === params.status)
      )
    })
    pagination.total = filteredRows.value.length
    pagination.current = 1
  }
  const resetFilters = () => {
    filteredRows.value = [...store.pools]
    pagination.total = filteredRows.value.length
    pagination.current = 1
  }
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }
  const handleCurrentChange = (current: number) => {
    pagination.current = current
  }
  const refreshData = async () => {
    loading.value = true
    await new Promise((resolve) => setTimeout(resolve, 350))
    resetFilters()
    loading.value = false
    ElMessage.success('獎池資料已重新整理')
  }
  const exportRows = () => {
    const header = [
      '獎池 ID',
      '代碼',
      '中文名稱',
      '英文名稱',
      '類型',
      '基準幣別',
      '級別數',
      '遊戲數',
      '商戶數',
      '目前餘額',
      '狀態',
      '更新時間'
    ]
    const csv = [
      header,
      ...filteredRows.value.map((row) => [
        row.id,
        row.code,
        row.nameZh,
        row.nameEn,
        typeLabel(row.type),
        row.baseCurrency,
        store.getLevels(row.id).length,
        store.getGameBindings(row.id).length,
        store.getMerchantSettings(row.id).length,
        row.currentBalance,
        statusLabel(row.status),
        row.updatedAt
      ])
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = '獎池查詢結果.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('獎池 CSV 已匯出')
  }
</script>

<style scoped lang="scss">
  .jackpot-list-page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid :deep(.el-card__body) {
    display: grid;
    gap: 7px;
    padding: 18px;
  }

  .summary-grid span,
  .summary-grid small,
  .toolbar-copy span {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 20px;
  }

  .toolbar-copy {
    display: grid;
    gap: 4px;
  }

  .toolbar-copy span {
    font-size: 12px;
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 560px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
