<template>
  <div class="bet-list-page">
    <AppPageHeader
      title="注單管理"
      eyebrow="交易中心"
      description="查詢注單生命週期、遊戲結果、派彩、關聯交易與風控異常。"
    >
      <template #actions>
        <ElTag type="warning" effect="light" round>{{ store.unsettledBetCount }} 筆進行中</ElTag>
        <ElTag type="danger" effect="plain" round>{{ store.exceptionBetCount }} 筆異常</ElTag>
        <ElButton @click="exportRows">匯出注單</ElButton>
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
        <template #left>
          <div class="toolbar-copy">
            <strong>注單查詢結果</strong>
            <span>共 {{ pagination.total }} 筆；資料僅供查詢，不提供人工修改。</span>
          </div>
        </template>
      </ArtTableHeader>
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
  import type { BetCenterRecord, MemberBetStatus } from '@/types/game-provider'
  import { useTransactionCenterStore } from '@/store/modules/transactionCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'BetManagement' })

  const store = useTransactionCenterStore()
  const router = useRouter()
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const loading = ref(false)
  const searchForm = ref<Record<string, unknown>>({})
  const filteredRows = ref<BetCenterRecord[]>([...store.bets])
  const pagination = reactive({ current: 1, size: 10, total: store.bets.length })
  const statusOptions: Array<{ label: string; value: MemberBetStatus }> = [
    { label: '進行中', value: 'In Progress' },
    { label: '已結算', value: 'Settled' },
    { label: '已取消', value: 'Cancelled' },
    { label: '已退款', value: 'Refunded' },
    { label: '異常', value: 'Exception' }
  ]
  const riskOptions = [
    { label: '正常', value: 'Normal' },
    { label: '需關注', value: 'Attention' },
    { label: '異常', value: 'Exception' }
  ]
  const merchantOptions = computed(() =>
    Array.from(
      new Map(
        store.bets.map((row) => [
          row.merchantId,
          { label: row.merchantName, value: row.merchantId }
        ])
      ).values()
    )
  )
  const gameOptions = computed(() =>
    Array.from(
      new Map(
        store.bets.map((row) => [row.gameId, { label: row.gameName, value: row.gameId }])
      ).values()
    )
  )
  const summary = computed(() => [
    { label: '注單總數', value: store.bets.length, note: '目前查詢範圍' },
    {
      label: '已結算',
      value: store.bets.filter((row) => row.status === 'Settled').length,
      note: '已有最終遊戲結果'
    },
    { label: '進行中', value: store.unsettledBetCount, note: '等待遊戲或錢包結果' },
    { label: '異常注單', value: store.exceptionBetCount, note: '需由風控中心處理' }
  ])
  const searchItems = computed(() => [
    {
      label: '注單／局號',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '輸入注單編號或局號', clearable: true }
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
      label: '遊戲',
      key: 'gameId',
      type: 'select',
      props: { placeholder: '全部遊戲', clearable: true, options: gameOptions.value }
    },
    {
      label: '注單狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    },
    {
      label: '風險狀態',
      key: 'riskStatus',
      type: 'select',
      props: { placeholder: '全部風險', clearable: true, options: riskOptions }
    },
    {
      label: '投注時間',
      key: 'dateRange',
      type: 'daterange',
      props: { startPlaceholder: '開始日期', endPlaceholder: '結束日期', valueFormat: 'YYYY-MM-DD' }
    }
  ])
  const columns = computed<ColumnOption[]>(() => [
    {
      prop: 'id',
      label: '注單編號',
      minWidth: 125,
      formatter: (row: BetCenterRecord) =>
        h(EntityLink, { label: row.id, to: `/transactions/bets/${row.id}` })
    },
    { prop: 'roundId', label: '局號', minWidth: 180 },
    {
      prop: 'memberId',
      label: '會員',
      minWidth: 190,
      formatter: (row: BetCenterRecord) =>
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
      formatter: (row: BetCenterRecord) =>
        h(EntityLink, {
          label: row.merchantName,
          secondary: row.lineUid,
          to: `/business/merchants/${row.merchantId}`
        })
    },
    {
      prop: 'gameId',
      label: '遊戲',
      minWidth: 170,
      formatter: (row: BetCenterRecord) =>
        h(EntityLink, {
          label: row.gameName,
          secondary: row.gameId,
          to: `/games/management/${row.gameId}`
        })
    },
    {
      prop: 'betAmount',
      label: '投注／派彩',
      minWidth: 160,
      align: 'right',
      formatter: (row: BetCenterRecord) =>
        `${money(row.betAmount)}／${money(row.payoutAmount)} ${row.currency}`
    },
    {
      prop: 'playerNet',
      label: '會員淨額',
      minWidth: 125,
      align: 'right',
      formatter: (row: BetCenterRecord) =>
        h(
          'span',
          { class: row.playerNet >= 0 ? 'positive' : 'negative' },
          `${money(row.playerNet)} ${row.currency}`
        )
    },
    {
      prop: 'status',
      label: '狀態',
      width: 100,
      formatter: (row: BetCenterRecord) =>
        h(ElTag, { type: betStatusType(row.status), effect: 'light' }, () =>
          betStatusLabel(row.status)
        )
    },
    {
      prop: 'riskStatus',
      label: '風險',
      width: 95,
      formatter: (row: BetCenterRecord) =>
        h(ElTag, { type: riskType(row.riskStatus), effect: 'plain' }, () =>
          riskLabel(row.riskStatus)
        )
    },
    { prop: 'time', label: '投注時間', minWidth: 160 },
    {
      prop: 'operation',
      label: '操作',
      width: 300,
      fixed: 'right',
      formatter: (row: BetCenterRecord) =>
        h('div', { class: 'row-actions' }, [
          h(
            ElButton,
            {
              link: true,
              type: 'primary',
              onClick: () => router.push(`/transactions/bets/${row.id}`)
            },
            () => '查看'
          ),
          row.result.replay.supportsBoardDisplay
            ? h(
                ElButton,
                {
                  link: true,
                  onClick: () => router.push(`/transactions/bets/${row.id}?tab=board`)
                },
                () => '查看盤面'
              )
            : null,
          row.result.replay.supportsResultReplay || row.result.replay.supportsEventReplay
            ? h(
                ElButton,
                {
                  link: true,
                  onClick: () => router.push(`/transactions/bets/${row.id}?tab=replay`)
                },
                () => '結果重播'
              )
            : null,
          row.transactionIds.length
            ? h(
                ElButton,
                {
                  link: true,
                  onClick: () => router.push(`/transactions/bets/${row.id}?tab=transactions`)
                },
                () => '查看交易'
              )
            : null,
          row.riskStatus !== 'Normal'
            ? h(
                ElButton,
                {
                  link: true,
                  type: 'danger',
                  onClick: () => router.push(`/transactions/bets/${row.id}?tab=anomalies`)
                },
                () => '查看異常'
              )
            : null
        ])
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
  const betStatusLabel = (status: MemberBetStatus) =>
    ({
      'In Progress': '進行中',
      Settled: '已結算',
      Cancelled: '已取消',
      Refunded: '已退款',
      Exception: '異常'
    })[status]
  const betStatusType = (status: MemberBetStatus) =>
    status === 'Settled'
      ? 'success'
      : status === 'Exception'
        ? 'danger'
        : status === 'In Progress'
          ? 'warning'
          : 'info'
  const riskLabel = (status: BetCenterRecord['riskStatus']) =>
    ({ Normal: '正常', Attention: '關注', Exception: '異常' })[status]
  const riskType = (status: BetCenterRecord['riskStatus']) =>
    status === 'Exception' ? 'danger' : status === 'Attention' ? 'warning' : 'info'
  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    const memberKeyword = String(params.member || '')
      .trim()
      .toLowerCase()
    const range = params.dateRange as string[] | undefined
    filteredRows.value = store.bets.filter((row) => {
      const matchesKeyword = !keyword || `${row.id} ${row.roundId}`.toLowerCase().includes(keyword)
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
        (!params.gameId || row.gameId === params.gameId) &&
        (!params.status || row.status === params.status) &&
        (!params.riskStatus || row.riskStatus === params.riskStatus)
      )
    })
    pagination.total = filteredRows.value.length
    pagination.current = 1
  }
  const resetFilters = () => {
    filteredRows.value = [...store.bets]
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
    ElMessage.success('注單資料已重新整理')
  }
  const exportRows = () => {
    const header = [
      '注單編號',
      '局號',
      '會員',
      '商戶',
      '線路',
      '遊戲',
      '投注',
      '派彩',
      '會員淨額',
      '幣別',
      '狀態',
      '風險',
      '投注時間'
    ]
    const csv = [
      header,
      ...filteredRows.value.map((row) => [
        row.id,
        row.roundId,
        row.externalMemberId,
        row.merchantName,
        row.lineUid,
        row.gameName,
        row.betAmount,
        row.payoutAmount,
        row.playerNet,
        row.currency,
        betStatusLabel(row.status),
        riskLabel(row.riskStatus),
        row.time
      ])
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = '注單查詢結果.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('注單 CSV 已匯出')
  }
</script>

<style scoped lang="scss">
  .bet-list-page {
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

  :deep(.row-actions) {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
  }

  :deep(.row-actions .el-button + .el-button) {
    margin-left: 0;
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
