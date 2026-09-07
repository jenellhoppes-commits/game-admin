<template>
  <div class="merchant-page">
    <AppPageHeader
      title="商戶管理"
      eyebrow="商務中心"
      description="統一管理商戶主檔、代理歸屬、商務條件、錢包模式與商戶線路。"
    >
      <template #actions>
        <ElTag type="success" effect="light" round>{{ activeCount }} 個啟用</ElTag>
        <ElTag type="info" effect="plain" round>{{ rows.length }} 個商戶</ElTag>
        <ElButton type="primary" @click="startCreate">新增商戶</ElButton>
      </template>
    </AppPageHeader>

    <div class="merchant-summary">
      <ElCard v-for="item in summary" :key="item.label" shadow="never">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.note }}</small>
      </ElCard>
    </div>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      :label-position="isMobile ? 'top' : 'right'"
      :label-width="isMobile ? 'auto' : '104px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card table-card">
      <ArtTableHeader class="merchant-table-header" :loading="loading" @refresh="refreshData">
        <template #left>
          <div class="merchant-toolbar">
            <ElButton type="primary" @click="startCreate">新增商戶</ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="batchAction">
              批次操作<span v-if="selectedRows.length">（{{ selectedRows.length }}）</span>
            </ElButton>
            <ElButton @click="exportRows">匯出</ElButton>
          </div>
        </template>
      </ArtTableHeader>

      <ArtTable
        :data="pagedRows"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        height="560"
        row-key="id"
        @selection-change="selectedRows = $event"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ImpactPreviewModal
      v-model="impactVisible"
      :title="impactNextStatus === 'Active' ? '恢復商戶確認' : '暫停商戶影響預覽'"
      :summary="impactSummary"
      :items="impactItems"
      :allow-schedule="impactNextStatus !== 'Active'"
      @confirm="confirmStatus"
    />
  </div>
</template>

<script setup lang="ts">
  import {
    ElButton,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElMessage,
    ElTag
  } from 'element-plus'
  import { storeToRefs } from 'pinia'
  import { useWindowSize } from '@vueuse/core'
  import type { ColumnOption } from '@/types'
  import type { MerchantRecord, MerchantStatus, WalletMode } from '@/types/game-provider'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import ImpactPreviewModal from '@/components/business/game-provider/impact-preview-modal/index.vue'

  defineOptions({ name: 'MerchantManagement' })

  const router = useRouter()
  const store = useBusinessPartnerStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const { merchants: rows } = storeToRefs(store)
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const filteredRows = ref<MerchantRecord[]>([...rows.value])
  const selectedRows = ref<MerchantRecord[]>([])
  const loading = ref(false)
  const impactVisible = ref(false)
  const impactMerchant = ref<MerchantRecord>()
  const searchForm = ref<Record<string, unknown>>({})
  const pagination = reactive({ current: 1, size: 20, total: rows.value.length })
  const currencies = computed(() =>
    financeSettingsStore.transactionCurrencies.map((item) => item.code)
  )
  const statusOptions = [
    { label: '草稿', value: 'Draft' },
    { label: '待審核', value: 'Pending' },
    { label: '啟用', value: 'Active' },
    { label: '暫停', value: 'Suspended' },
    { label: '終止', value: 'Terminated' }
  ]

  const activeCount = computed(() => rows.value.filter((row) => row.status === 'Active').length)
  const summary = computed(() => [
    { label: '啟用商戶', value: activeCount.value, note: '目前可提供服務' },
    {
      label: '待處理',
      value: rows.value.filter((row) => ['Draft', 'Pending'].includes(row.status)).length,
      note: '草稿與待審核'
    },
    {
      label: '商戶線路',
      value: rows.value.reduce((total, row) => total + row.lines.length, 0),
      note: '全部交易線路'
    },
    {
      label: '正式環境',
      value: rows.value.reduce(
        (total, row) =>
          total + row.lines.filter((line) => line.environment === 'Production').length,
        0
      ),
      note: '已建立正式環境'
    }
  ])
  const searchItems = computed(() => [
    {
      label: '商戶編號',
      key: 'id',
      type: 'input',
      props: { placeholder: '輸入 Merchant ID', clearable: true }
    },
    {
      label: '商戶代碼',
      key: 'code',
      type: 'input',
      props: { placeholder: '輸入商戶代碼', clearable: true }
    },
    {
      label: '商戶名稱',
      key: 'name',
      type: 'input',
      props: { placeholder: '輸入商戶名稱', clearable: true }
    },
    {
      label: '所屬代理',
      key: 'agentId',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        options: store.agents.map((agent) => ({
          label: `${agent.name}｜${agent.code}`,
          value: agent.id
        }))
      }
    },
    {
      label: '錢包模式',
      key: 'walletMode',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: 'Seamless Wallet', value: 'Seamless' },
          { label: 'Transfer Wallet', value: 'Transfer' }
        ]
      }
    },
    {
      label: '交易幣別',
      key: 'currency',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        options: currencies.value.map((value) => ({ label: value, value }))
      }
    },
    {
      label: '商戶狀態',
      key: 'status',
      type: 'select',
      props: { clearable: true, options: statusOptions }
    },
    {
      label: '線路狀態',
      key: 'lineStatus',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '草稿', value: 'Draft' },
          { label: '設定中', value: 'Configuring' },
          { label: '測試中', value: 'Testing' },
          { label: '啟用', value: 'Active' },
          { label: '暫停', value: 'Suspended' },
          { label: '關閉', value: 'Closed' }
        ]
      }
    },
    {
      label: '更新日期',
      key: 'updatedAt',
      type: 'datetime',
      props: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
        startPlaceholder: '開始',
        endPlaceholder: '結束'
      }
    }
  ])

  const merchantTermText = (row: MerchantRecord) => {
    const term = store.getCurrentMerchantTerm(row.id)
    if (!term) return '未設定'
    const basis =
      term.settlementBasis === 'Valid Bet'
        ? '有效投注'
        : term.settlementBasis === 'Turnover'
          ? '營業額'
          : 'GGR'
    return `${basis} ${term.merchantTermPercent}%`
  }
  const integrationText = (row: MerchantRecord) => {
    if (row.lines.some((line) => line.environment === 'Production')) return '正式環境'
    if (row.lines.some((line) => line.environment === 'Sandbox')) return '測試環境'
    return '尚未設定'
  }
  const columns: ColumnOption[] = [
    { type: 'selection', width: 50 },
    { prop: 'id', label: 'Merchant ID', width: 120 },
    {
      prop: 'name',
      label: '商戶',
      minWidth: 175,
      formatter: (row: MerchantRecord) =>
        h(EntityLink, { label: row.name, secondary: row.code, to: `/business/merchants/${row.id}` })
    },
    {
      prop: 'agentName',
      label: '所屬代理',
      minWidth: 150,
      formatter: (row: MerchantRecord) =>
        h(EntityLink, {
          label: row.agentName,
          secondary: row.agentId,
          to: `/business/agents/${row.agentId}`
        })
    },
    { prop: 'term', label: '商戶條件', minWidth: 130, formatter: merchantTermText },
    {
      prop: 'walletMode',
      label: '錢包模式',
      width: 125,
      formatter: (row: MerchantRecord) => h(ElTag, { effect: 'plain' }, () => row.walletMode)
    },
    {
      prop: 'lines',
      label: '線路數',
      width: 90,
      sortable: true,
      formatter: (row: MerchantRecord) => row.lines.length
    },
    {
      prop: 'enabledGames',
      label: '開通遊戲',
      width: 100,
      formatter: (row: MerchantRecord) => Math.max(...row.lines.map((line) => line.enabledGames), 0)
    },
    { prop: 'integration', label: '串接狀態', width: 110, formatter: integrationText },
    {
      prop: 'status',
      label: '商戶狀態',
      width: 110,
      formatter: (row: MerchantRecord) => h(GameProviderStatusTag, { status: row.status })
    },
    { prop: 'updatedAt', label: '最後修改', minWidth: 150, sortable: true },
    {
      prop: 'operation',
      label: '操作',
      width: 165,
      fixed: 'right',
      formatter: (row: MerchantRecord) =>
        h('div', { class: 'flex-c gap-1' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openDetail(row) },
            () => '查看'
          ),
          h(
            ElDropdown,
            { trigger: 'click', onCommand: (command: string) => handleMore(command, row) },
            {
              default: () => h(ElButton, { link: true }, () => '更多'),
              dropdown: () =>
                h(ElDropdownMenu, null, () => [
                  h(ElDropdownItem, { command: 'line' }, () => '新增線路'),
                  h(ElDropdownItem, { command: 'games' }, () => '遊戲配置'),
                  h(ElDropdownItem, { command: 'integration' }, () => '串接管理'),
                  h(ElDropdownItem, { command: 'logs' }, () => '異動紀錄'),
                  h(ElDropdownItem, { command: 'status', divided: true }, () =>
                    row.status === 'Active' ? '暫停商戶' : '恢復商戶'
                  )
                ])
            }
          )
        ])
    }
  ]

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })
  const impactNextStatus = computed<MerchantStatus>(() =>
    impactMerchant.value?.status === 'Active' ? 'Suspended' : 'Active'
  )
  const impactSummary = computed(() =>
    impactNextStatus.value === 'Active'
      ? `恢復 ${impactMerchant.value?.name || ''} 後，線路仍須逐條檢查再啟用。`
      : `暫停 ${impactMerchant.value?.name || ''} 將阻止全部商戶線路建立新連線與交易。`
  )
  const impactItems = computed(() => [
    { label: '商戶線路', value: impactMerchant.value?.lines.length || 0 },
    {
      label: '正式環境',
      value:
        impactMerchant.value?.lines.filter((line) => line.environment === 'Production').length || 0
    },
    {
      label: '已開通遊戲',
      value: Math.max(...(impactMerchant.value?.lines.map((line) => line.enabledGames) || []), 0)
    },
    { label: '歷史資料', value: '保留，不回溯修改' }
  ])

  const syncRows = (nextRows: MerchantRecord[]) => {
    filteredRows.value = nextRows
    pagination.total = nextRows.length
    pagination.current = 1
  }
  const applyFilters = (params: Record<string, unknown>) => {
    const textMatch = (source: string, query: unknown) =>
      !String(query || '').trim() ||
      source.toLowerCase().includes(String(query).trim().toLowerCase())
    syncRows(
      rows.value.filter((row) => {
        const dateRange = params.updatedAt as string[] | undefined
        return (
          textMatch(row.id, params.id) &&
          textMatch(row.code, params.code) &&
          textMatch(row.name, params.name) &&
          (!params.agentId || row.agentId === params.agentId) &&
          (!params.walletMode || row.walletMode === (params.walletMode as WalletMode)) &&
          (!params.status || row.status === (params.status as MerchantStatus)) &&
          (!params.currency || row.lines.some((line) => line.currency === params.currency)) &&
          (!params.lineStatus || row.lines.some((line) => line.status === params.lineStatus)) &&
          (!dateRange?.length ||
            (row.updatedAt.slice(0, 10) >= dateRange[0] &&
              row.updatedAt.slice(0, 10) <= dateRange[1]))
        )
      })
    )
  }
  const resetFilters = () => syncRows([...rows.value])
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }
  const handleCurrentChange = (current: number) => (pagination.current = current)
  const refreshData = async () => {
    loading.value = true
    await new Promise((resolve) => setTimeout(resolve, 350))
    resetFilters()
    loading.value = false
    ElMessage.success('商戶資料已重新整理')
  }
  const startCreate = () => router.push('/business/merchants/create')
  const openDetail = (row: MerchantRecord, tab?: string) =>
    router.push({ path: `/business/merchants/${row.id}`, query: tab ? { tab } : undefined })
  const handleMore = (command: string, row: MerchantRecord) => {
    if (command === 'line') return openDetail(row, 'lines')
    if (command === 'games') return openDetail(row, 'games')
    if (command === 'integration') return openDetail(row, 'integration')
    if (command === 'logs') return openDetail(row, 'logs')
    impactMerchant.value = row
    impactVisible.value = true
  }
  const confirmStatus = (payload: { reason: string }) => {
    if (!impactMerchant.value) return
    const nextStatus = impactNextStatus.value
    store.changeMerchantStatus(impactMerchant.value.id, nextStatus, payload.reason)
    resetFilters()
    ElMessage.success(nextStatus === 'Active' ? '商戶已恢復' : '商戶已暫停')
  }
  const batchAction = () => ElMessage.info('批次操作將在審核中心流程完成後開放')
  const exportRows = () => {
    const escapeCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const header = [
      'Merchant ID',
      '商戶代碼',
      '商戶名稱',
      '所屬代理',
      '商戶條件',
      '錢包模式',
      '線路數',
      '串接狀態',
      '商戶狀態',
      '最後修改'
    ]
    const lines = filteredRows.value.map((row) =>
      [
        row.id,
        row.code,
        row.name,
        row.agentName,
        merchantTermText(row),
        row.walletMode,
        row.lines.length,
        integrationText(row),
        row.status,
        row.updatedAt
      ]
        .map(escapeCell)
        .join(',')
    )
    const blob = new Blob([`\uFEFF${header.map(escapeCell).join(',')}\r\n${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `商戶列表_${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已匯出目前篩選結果，共 ${filteredRows.value.length} 筆商戶資料`)
  }
  watch(rows, resetFilters, { deep: true })
</script>

<style scoped lang="scss">
  .merchant-page {
    display: grid;
    gap: 16px;
  }

  .merchant-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .merchant-summary :deep(.el-card__body) {
    display: grid;
    gap: 6px;
    padding: 16px 18px;
  }

  .merchant-summary span,
  .merchant-summary small {
    color: var(--art-gray-500);
  }

  .merchant-summary strong {
    font-size: 22px;
  }

  .merchant-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .merchant-table-header {
    margin-bottom: 16px;
  }

  @media (width <= 900px) {
    .merchant-summary {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 560px) {
    .merchant-summary {
      grid-template-columns: 1fr;
    }
  }
</style>
