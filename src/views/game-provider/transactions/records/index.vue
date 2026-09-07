<template>
  <div class="transaction-list-page">
    <AppPageHeader
      title="交易管理"
      eyebrow="交易中心"
      description="集中查詢投注、派彩、退款、回滾及錢包轉入轉出紀錄。"
    >
      <template #actions>
        <ElTag type="success" effect="light" round
          >{{ store.successfulTransactionCount }} 筆成功</ElTag
        >
        <ElTag type="danger" effect="plain" round
          >{{ store.exceptionTransactionCount }} 筆異常</ElTag
        >
        <ElButton @click="exportRows">匯出交易</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <ElCard v-for="item in summary" :key="item.label" shadow="never">
        <span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </ElCard>
    </div>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      :label-position="isMobile ? 'top' : 'right'"
      :label-width="isMobile ? 'auto' : '92px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card table-card" shadow="never">
      <ArtTableHeader :loading="loading" @refresh="refreshData">
        <template #left
          ><div class="toolbar-copy"
            ><strong>交易查詢結果</strong
            ><span>共 {{ pagination.total }} 筆；所有金額異動皆為唯讀。</span></div
          ></template
        >
      </ArtTableHeader>
      <ArtTable
        :data="pagedRows"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
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
  import type {
    MemberTransactionStatus,
    MemberTransactionType,
    TransactionCenterRecord
  } from '@/types/game-provider'
  import { useTransactionCenterStore } from '@/store/modules/transactionCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'TransactionManagement' })
  const store = useTransactionCenterStore()
  const router = useRouter()
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const loading = ref(false)
  const searchForm = ref<Record<string, unknown>>({})
  const filteredRows = ref<TransactionCenterRecord[]>([...store.transactions])
  const pagination = reactive({ current: 1, size: 20, total: store.transactions.length })
  const typeOptions: Array<{ label: string; value: MemberTransactionType }> = [
    { label: '投注', value: 'Bet' },
    { label: '派彩', value: 'Payout' },
    { label: '退款', value: 'Refund' },
    { label: '回滾', value: 'Rollback' },
    { label: '獎池', value: 'Jackpot' },
    { label: '轉入', value: 'Transfer In' },
    { label: '轉出', value: 'Transfer Out' }
  ]
  const statusOptions: Array<{ label: string; value: MemberTransactionStatus }> = [
    { label: '處理中', value: 'Processing' },
    { label: '成功', value: 'Success' },
    { label: '失敗', value: 'Failed' },
    { label: '已退款', value: 'Refunded' },
    { label: '已回滾', value: 'Rolled Back' },
    { label: '異常', value: 'Exception' }
  ]
  const merchantOptions = computed(() =>
    Array.from(
      new Map(
        store.transactions.map((row) => [
          row.merchantId,
          { label: row.merchantName, value: row.merchantId }
        ])
      ).values()
    )
  )
  const currencies = computed(() =>
    Array.from(new Set(store.transactions.map((row) => row.currency))).map((currency) => ({
      label: currency,
      value: currency
    }))
  )
  const summary = computed(() => [
    { label: '交易總數', value: store.transactions.length, note: '目前查詢範圍' },
    { label: '成功交易', value: store.successfulTransactionCount, note: '已完成錢包回應' },
    {
      label: '處理中',
      value: store.transactions.filter((row) => row.status === 'Processing').length,
      note: '等待最終結果'
    },
    {
      label: '異常交易',
      value: store.exceptionTransactionCount,
      note: '需由風控中心處理'
    }
  ])
  const searchItems = computed(() => [
    {
      label: '交易編號',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '內部或外部交易編號', clearable: true }
    },
    {
      label: '會員',
      key: 'member',
      type: 'input',
      props: { placeholder: '會員 ID／外部 ID', clearable: true }
    },
    {
      label: '商戶',
      key: 'merchantId',
      type: 'select',
      props: { placeholder: '全部商戶', clearable: true, options: merchantOptions.value }
    },
    {
      label: '交易類型',
      key: 'type',
      type: 'select',
      props: { placeholder: '全部類型', clearable: true, options: typeOptions }
    },
    {
      label: '交易狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    },
    {
      label: '幣別',
      key: 'currency',
      type: 'select',
      props: { placeholder: '全部幣別', clearable: true, options: currencies.value }
    },
    {
      label: '交易時間',
      key: 'dateRange',
      type: 'daterange',
      props: { startPlaceholder: '開始日期', endPlaceholder: '結束日期', valueFormat: 'YYYY-MM-DD' }
    }
  ])
  const columns = computed<ColumnOption[]>(() => [
    {
      prop: 'id',
      label: '交易編號',
      minWidth: 130,
      formatter: (row: TransactionCenterRecord) =>
        h(EntityLink, { label: row.id, to: `/transactions/records/${row.id}` })
    },
    { prop: 'externalReference', label: '外部參考號', minWidth: 190 },
    {
      prop: 'memberId',
      label: '會員',
      minWidth: 190,
      formatter: (row: TransactionCenterRecord) =>
        h(EntityLink, {
          label: row.externalMemberId,
          secondary: row.memberId,
          to: `/members/management/${row.memberId}`
        })
    },
    {
      prop: 'merchantId',
      label: '商戶／線路',
      minWidth: 200,
      formatter: (row: TransactionCenterRecord) =>
        h(EntityLink, {
          label: row.merchantName,
          secondary: row.lineUid,
          to: `/business/merchants/${row.merchantId}`
        })
    },
    {
      prop: 'type',
      label: '類型',
      width: 95,
      formatter: (row: TransactionCenterRecord) => transactionTypeLabel(row.type)
    },
    {
      prop: 'amount',
      label: '金額',
      minWidth: 140,
      align: 'right',
      formatter: (row: TransactionCenterRecord) =>
        h(
          'span',
          { class: row.amount >= 0 ? 'positive' : 'negative' },
          `${money(row.amount)} ${row.currency}`
        )
    },
    {
      prop: 'status',
      label: '狀態',
      width: 100,
      formatter: (row: TransactionCenterRecord) =>
        h(ElTag, { type: transactionStatusType(row.status), effect: 'light' }, () =>
          transactionStatusLabel(row.status)
        )
    },
    {
      prop: 'walletMode',
      label: '錢包模式',
      width: 110,
      formatter: (row: TransactionCenterRecord) =>
        row.walletMode === 'Seamless' ? '單一錢包' : '轉帳錢包'
    },
    { prop: 'time', label: '建立時間', minWidth: 160 },
    {
      prop: 'operation',
      label: '操作',
      width: 85,
      fixed: 'right',
      formatter: (row: TransactionCenterRecord) =>
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: () => router.push(`/transactions/records/${row.id}`)
          },
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
  const transactionTypeLabel = (type: MemberTransactionType) =>
    ({
      Bet: '投注',
      Payout: '派彩',
      Refund: '退款',
      Rollback: '回滾',
      Jackpot: '獎池',
      'Transfer In': '轉入',
      'Transfer Out': '轉出'
    })[type]
  const transactionStatusLabel = (status: MemberTransactionStatus) =>
    ({
      Processing: '處理中',
      Success: '成功',
      Failed: '失敗',
      Refunded: '已退款',
      'Rolled Back': '已回滾',
      Exception: '異常'
    })[status]
  const transactionStatusType = (status: MemberTransactionStatus) =>
    status === 'Success'
      ? 'success'
      : ['Failed', 'Exception'].includes(status)
        ? 'danger'
        : status === 'Processing'
          ? 'warning'
          : 'info'
  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    const memberKeyword = String(params.member || '')
      .trim()
      .toLowerCase()
    const range = params.dateRange as string[] | undefined
    filteredRows.value = store.transactions.filter((row) => {
      const matchesKeyword =
        !keyword || `${row.id} ${row.externalReference}`.toLowerCase().includes(keyword)
      const matchesMember =
        !memberKeyword ||
        `${row.memberId} ${row.externalMemberId}`.toLowerCase().includes(memberKeyword)
      const matchesRange =
        !range?.length || (row.time.slice(0, 10) >= range[0] && row.time.slice(0, 10) <= range[1])
      return (
        matchesKeyword &&
        matchesMember &&
        matchesRange &&
        (!params.merchantId || row.merchantId === params.merchantId) &&
        (!params.type || row.type === params.type) &&
        (!params.status || row.status === params.status) &&
        (!params.currency || row.currency === params.currency)
      )
    })
    pagination.total = filteredRows.value.length
    pagination.current = 1
  }
  const resetFilters = () => {
    filteredRows.value = [...store.transactions]
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
    ElMessage.success('交易資料已重新整理')
  }
  const exportRows = () => {
    const header = [
      '交易編號',
      '外部參考號',
      '會員',
      '商戶',
      '線路',
      '類型',
      '金額',
      '幣別',
      '狀態',
      '錢包模式',
      '建立時間'
    ]
    const csv = [
      header,
      ...filteredRows.value.map((row) => [
        row.id,
        row.externalReference,
        row.externalMemberId,
        row.merchantName,
        row.lineUid,
        transactionTypeLabel(row.type),
        row.amount,
        row.currency,
        transactionStatusLabel(row.status),
        row.walletMode,
        row.time
      ])
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = '交易查詢結果.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('交易 CSV 已匯出')
  }
</script>

<style scoped lang="scss">
  .transaction-list-page {
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

  :deep(.positive) {
    color: var(--el-color-success);
  }

  :deep(.negative) {
    color: var(--el-color-danger);
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
