<template>
  <div class="member-page">
    <AppPageHeader
      title="會員管理"
      eyebrow="會員中心"
      description="查詢會員所屬商戶線路、交易幣別、錢包、遊戲活動與風控限制狀態。"
    >
      <template #actions>
        <ElTag type="warning" effect="light" round>{{ store.restrictedCount }} 名限制中</ElTag>
        <ElTag type="info" effect="plain" round>{{ store.totalCount }} 名會員</ElTag>
        <ElButton @click="exportRows">匯出會員</ElButton>
      </template>
    </AppPageHeader>

    <div class="member-summary">
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
      <ArtTableHeader class="member-table-header" :loading="loading" @refresh="refreshData">
        <template #left>
          <div class="member-toolbar">
            <ElButton type="primary" :disabled="selectedRows.length === 0" @click="openBatchTag">
              批次新增標記<span v-if="selectedRows.length">（{{ selectedRows.length }}）</span>
            </ElButton>
            <ElButton @click="exportRows">匯出查詢結果</ElButton>
            <span class="read-only-note">會員由商戶串接建立，總後台不提供新增或搬移。</span>
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
        @selection-change="selectedRows = $event"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDrawer v-model="tagVisible" title="新增會員標記" size="min(92vw, 520px)">
      <ElAlert
        :title="`將為 ${tagTargets.length} 名會員新增標記；既有相同標記不會重複建立。`"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top">
        <ElFormItem label="標記" required>
          <ElSelect v-model="tagForm.tag" class="w-full">
            <ElOption
              v-for="option in tagOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="標記原因" required>
          <ElInput
            v-model="tagForm.reason"
            type="textarea"
            :rows="3"
            placeholder="請說明新增此標記的原因"
          />
        </ElFormItem>
        <ElFormItem label="備註">
          <ElInput v-model="tagForm.note" type="textarea" :rows="3" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="tagVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveTag">確認新增</ElButton>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { storeToRefs } from 'pinia'
  import { useWindowSize } from '@vueuse/core'
  import type { ColumnOption } from '@/types'
  import type {
    MemberMerchantStatus,
    MemberRecord,
    MemberRestrictionStatus,
    MemberRiskStatus,
    MemberTagKind,
    WalletMode
  } from '@/types/game-provider'
  import { useMemberCenterStore } from '@/store/modules/memberCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'MemberManagement' })

  const router = useRouter()
  const store = useMemberCenterStore()
  const { members: rows } = storeToRefs(store)
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const filteredRows = ref<MemberRecord[]>([...rows.value])
  const selectedRows = ref<MemberRecord[]>([])
  const tagTargets = ref<MemberRecord[]>([])
  const loading = ref(false)
  const tagVisible = ref(false)
  const searchForm = ref<Record<string, unknown>>({})
  const pagination = reactive({ current: 1, size: 10, total: rows.value.length })
  const tagForm = reactive<{ tag: MemberTagKind | ''; reason: string; note: string }>({
    tag: '',
    reason: '',
    note: ''
  })
  const tagOptions: Array<{ label: string; value: MemberTagKind }> = [
    { label: '一般', value: 'General' },
    { label: '測試會員', value: 'Test' },
    { label: '白名單', value: 'Whitelist' },
    { label: '觀察', value: 'Watch' },
    { label: '風控', value: 'Risk' }
  ]

  const summary = computed(() => [
    { label: '全部會員', value: store.totalCount, note: '目前 Mock 資料' },
    { label: '限制中', value: store.restrictedCount, note: '限制全部遊戲' },
    { label: '風控／觀察', value: store.riskCount, note: '需持續關注' },
    { label: '報表排除', value: store.excludedCount, note: '測試會員與白名單' }
  ])
  const merchantOptions = computed(() =>
    Array.from(
      new Map(
        rows.value.map((row) => [
          row.merchantId,
          { label: row.merchantName, value: row.merchantId }
        ])
      ).values()
    )
  )
  const agentOptions = computed(() =>
    Array.from(
      new Map(
        rows.value.map((row) => [row.agentId, { label: row.agentName, value: row.agentId }])
      ).values()
    )
  )
  const lineOptions = computed(() =>
    Array.from(
      new Map(
        rows.value.map((row) => [
          row.lineUid,
          { label: `${row.lineUid}｜${row.currency}`, value: row.lineUid }
        ])
      ).values()
    )
  )
  const currencies = computed(() => Array.from(new Set(rows.value.map((row) => row.currency))))
  const gameOptions = computed(() =>
    Array.from(
      new Map(
        rows.value.map((row) => [
          row.latestGameId,
          { label: row.latestGameName, value: row.latestGameId }
        ])
      ).values()
    )
  )
  const searchItems = computed(() => [
    {
      label: '會員識別',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '會員編號／商戶會員識別碼', clearable: true }
    },
    {
      label: '商戶',
      key: 'merchantId',
      type: 'select',
      props: { clearable: true, filterable: true, options: merchantOptions.value }
    },
    {
      label: '商戶線路',
      key: 'lineUid',
      type: 'select',
      props: { clearable: true, filterable: true, options: lineOptions.value }
    },
    {
      label: '交易幣別',
      key: 'currency',
      type: 'select',
      props: {
        clearable: true,
        options: currencies.value.map((value) => ({ label: value, value }))
      }
    },
    {
      label: '會員狀態',
      key: 'merchantStatus',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '正常', value: 'Active' },
          { label: '未啟用', value: 'Inactive' },
          { label: '商戶封鎖', value: 'Blocked' }
        ]
      }
    },
    {
      label: '最後遊戲時間',
      key: 'lastPlayedAt',
      type: 'datetime',
      props: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
        startPlaceholder: '開始',
        endPlaceholder: '結束'
      }
    },
    {
      label: '所屬代理',
      key: 'agentId',
      type: 'select',
      props: { clearable: true, filterable: true, options: agentOptions.value }
    },
    {
      label: '錢包模式',
      key: 'walletMode',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '單一錢包', value: 'Seamless' },
          { label: '轉帳錢包', value: 'Transfer' }
        ]
      }
    },
    {
      label: '最近遊戲',
      key: 'latestGameId',
      type: 'select',
      props: { clearable: true, filterable: true, options: gameOptions.value }
    },
    {
      label: '限制狀態',
      key: 'restrictionStatus',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '未限制', value: 'None' },
          { label: '預約限制', value: 'Scheduled' },
          { label: '限制中', value: 'Active' },
          { label: '已結束', value: 'Expired' }
        ]
      }
    },
    {
      label: '會員標記',
      key: 'tag',
      type: 'select',
      props: { clearable: true, options: tagOptions }
    },
    {
      label: '異常狀態',
      key: 'riskStatus',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '正常', value: 'Normal' },
          { label: '注意', value: 'Attention' },
          { label: '高風險', value: 'High' }
        ]
      }
    }
  ])

  const merchantStatusLabel = (status: MemberMerchantStatus) =>
    ({ Active: '正常', Inactive: '未啟用', Blocked: '商戶封鎖' })[status]
  const restrictionLabel = (status: MemberRestrictionStatus) =>
    ({ None: '未限制', Scheduled: '預約限制', Active: '限制中', Expired: '已結束' })[status]
  const restrictionType = (status: MemberRestrictionStatus) =>
    status === 'Active' ? 'danger' : status === 'Scheduled' ? 'warning' : 'info'
  const riskLabel = (status: MemberRiskStatus) =>
    ({ Normal: '正常', Attention: '注意', High: '高風險' })[status]
  const riskType = (status: MemberRiskStatus) =>
    status === 'High' ? 'danger' : status === 'Attention' ? 'warning' : 'success'
  const tagLabel = (tag: MemberTagKind) =>
    tagOptions.find((option) => option.value === tag)?.label || tag
  const tagType = (tag: MemberTagKind) =>
    tag === 'Risk'
      ? 'danger'
      : tag === 'Watch'
        ? 'warning'
        : tag === 'Whitelist'
          ? 'success'
          : tag === 'Test'
            ? 'primary'
            : 'info'
  const walletLabel = (mode: WalletMode) => (mode === 'Seamless' ? '單一錢包' : '轉帳錢包')
  const columns: ColumnOption[] = [
    { type: 'selection', width: 50 },
    { prop: 'id', label: '會員編號', width: 110, fixed: 'left' },
    {
      prop: 'externalId',
      label: '會員識別碼',
      minWidth: 180,
      fixed: 'left',
      formatter: (row: MemberRecord) =>
        h(EntityLink, {
          label: row.externalId,
          secondary: row.id,
          to: `/members/management/${row.id}`
        })
    },
    {
      prop: 'merchantName',
      label: '商戶',
      minWidth: 150,
      formatter: (row: MemberRecord) =>
        h(EntityLink, {
          label: row.merchantName,
          secondary: row.merchantId,
          to: `/business/merchants/${row.merchantId}`
        })
    },
    {
      prop: 'lineUid',
      label: '商戶線路',
      minWidth: 200,
      formatter: (row: MemberRecord) =>
        h(EntityLink, {
          label: row.lineUid,
          secondary: `${row.currency}｜${walletLabel(row.walletMode)}`,
          to: `/business/merchants/${row.merchantId}/lines/${row.lineUid}`
        })
    },
    {
      prop: 'latestGameName',
      label: '最近遊戲',
      minWidth: 145,
      formatter: (row: MemberRecord) =>
        h(EntityLink, {
          label: row.latestGameName,
          secondary: row.latestGameId,
          to: `/games/management/${row.latestGameId}`
        })
    },
    { prop: 'lastPlayedAt', label: '最後遊戲時間', minWidth: 150, sortable: true },
    {
      prop: 'merchantStatus',
      label: '商戶會員狀態',
      width: 125,
      formatter: (row: MemberRecord) =>
        h(
          ElTag,
          {
            type:
              row.merchantStatus === 'Active'
                ? 'success'
                : row.merchantStatus === 'Blocked'
                  ? 'danger'
                  : 'info',
            effect: 'light'
          },
          () => merchantStatusLabel(row.merchantStatus)
        )
    },
    {
      prop: 'restrictionStatus',
      label: '遊戲商限制',
      width: 115,
      formatter: (row: MemberRecord) =>
        h(ElTag, { type: restrictionType(row.restrictionStatus), effect: 'light' }, () =>
          restrictionLabel(row.restrictionStatus)
        )
    },
    {
      prop: 'tags',
      label: '會員標記',
      minWidth: 165,
      formatter: (row: MemberRecord) =>
        row.tags.length
          ? h(
              'div',
              { class: 'member-tag-list' },
              row.tags.map((tag) =>
                h(ElTag, { type: tagType(tag), effect: 'plain', size: 'small' }, () =>
                  tagLabel(tag)
                )
              )
            )
          : '—'
    },
    {
      prop: 'riskStatus',
      label: '異常狀態',
      width: 100,
      formatter: (row: MemberRecord) =>
        h(ElTag, { type: riskType(row.riskStatus), effect: 'light' }, () =>
          riskLabel(row.riskStatus)
        )
    },
    {
      prop: 'operation',
      label: '操作',
      width: 150,
      fixed: 'right',
      formatter: (row: MemberRecord) =>
        h('div', { class: 'flex-c gap-1' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openDetail(row) },
            () => '查看'
          ),
          h(ElButton, { link: true, onClick: () => openSingleTag(row) }, () => '新增標記')
        ])
    }
  ]

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })
  const syncRows = (nextRows: MemberRecord[]) => {
    filteredRows.value = nextRows
    pagination.total = nextRows.length
    pagination.current = 1
  }
  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    const dateRange = params.lastPlayedAt as string[] | undefined
    syncRows(
      rows.value.filter(
        (row) =>
          (!keyword || `${row.id} ${row.externalId}`.toLowerCase().includes(keyword)) &&
          (!params.merchantId || row.merchantId === params.merchantId) &&
          (!params.lineUid || row.lineUid === params.lineUid) &&
          (!params.currency || row.currency === params.currency) &&
          (!params.merchantStatus ||
            row.merchantStatus === (params.merchantStatus as MemberMerchantStatus)) &&
          (!params.agentId || row.agentId === params.agentId) &&
          (!params.walletMode || row.walletMode === (params.walletMode as WalletMode)) &&
          (!params.latestGameId || row.latestGameId === params.latestGameId) &&
          (!params.restrictionStatus ||
            row.restrictionStatus === (params.restrictionStatus as MemberRestrictionStatus)) &&
          (!params.tag || row.tags.includes(params.tag as MemberTagKind)) &&
          (!params.riskStatus || row.riskStatus === (params.riskStatus as MemberRiskStatus)) &&
          (!dateRange?.length ||
            (row.lastPlayedAt.slice(0, 10) >= dateRange[0] &&
              row.lastPlayedAt.slice(0, 10) <= dateRange[1]))
      )
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
    ElMessage.success('會員資料已重新整理')
  }
  const openDetail = (row: MemberRecord) => router.push(`/members/management/${row.id}`)
  const openSingleTag = (row: MemberRecord) => {
    tagTargets.value = [row]
    Object.assign(tagForm, { tag: '', reason: '', note: '' })
    tagVisible.value = true
  }
  const openBatchTag = () => {
    tagTargets.value = [...selectedRows.value]
    Object.assign(tagForm, { tag: '', reason: '', note: '' })
    tagVisible.value = true
  }
  const saveTag = () => {
    if (!tagForm.tag || !tagForm.reason.trim()) return ElMessage.warning('請選擇標記並填寫原因')
    store.addTag(
      tagTargets.value.map((row) => row.id),
      tagForm.tag,
      tagForm.reason.trim(),
      tagForm.note.trim()
    )
    tagVisible.value = false
    selectedRows.value = []
    resetFilters()
    ElMessage.success('會員標記已新增')
  }
  const exportRows = () => {
    const escapeCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const header = [
      '會員編號',
      '會員識別碼',
      '所屬代理',
      '商戶',
      '商戶線路',
      '交易幣別',
      '錢包模式',
      '最近遊戲',
      '最後遊戲時間',
      '商戶會員狀態',
      '遊戲商限制',
      '會員標記',
      '異常狀態'
    ]
    const lines = filteredRows.value.map((row) =>
      [
        row.id,
        row.externalId,
        row.agentName,
        row.merchantName,
        row.lineUid,
        row.currency,
        walletLabel(row.walletMode),
        row.latestGameName,
        row.lastPlayedAt,
        merchantStatusLabel(row.merchantStatus),
        restrictionLabel(row.restrictionStatus),
        row.tags.map(tagLabel).join('、'),
        riskLabel(row.riskStatus)
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
    anchor.download = `會員列表_${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已匯出目前篩選結果，共 ${filteredRows.value.length} 筆會員資料`)
  }
  watch(rows, resetFilters, { deep: true })
</script>

<style scoped lang="scss">
  .member-page {
    display: grid;
    gap: 16px;
  }

  .member-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .member-summary :deep(.el-card__body) {
    display: grid;
    gap: 6px;
    padding: 16px 18px;
  }

  .member-summary span,
  .member-summary small,
  .read-only-note {
    color: var(--art-gray-500);
  }

  .member-summary strong {
    font-size: 22px;
  }

  .member-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .member-table-header {
    margin-bottom: 16px;
  }

  .read-only-note {
    font-size: 12px;
  }

  :deep(.member-tag-list) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  @media (width <= 900px) {
    .member-summary {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 560px) {
    .member-summary {
      grid-template-columns: 1fr;
    }

    .read-only-note {
      width: 100%;
    }
  }
</style>
