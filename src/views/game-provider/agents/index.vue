<template>
  <div class="agent-page">
    <AppPageHeader
      title="代理管理"
      eyebrow="商務中心"
      description="管理代理層級、上下級關係、商務條件與營運狀態。"
    >
      <template #actions>
        <ElTag type="success" effect="light" round>{{ activeCount }} 個啟用</ElTag>
        <ElTag type="info" effect="plain" round>{{ rows.length }} 個代理</ElTag>
        <ElButton type="primary" @click="startCreate">新增代理</ElButton>
      </template>
    </AppPageHeader>

    <div class="level-summary">
      <ElCard v-for="item in levelSummary" :key="item.label" shadow="never"
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
      :label-width="isMobile ? 'auto' : '100px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card table-card">
      <ArtTableHeader class="agent-table-header" :loading="loading" @refresh="refreshData">
        <template #left>
          <div class="agent-toolbar">
            <ElButton type="primary" @click="startCreate">新增代理</ElButton>
            <ElRadioGroup v-model="viewMode" size="small">
              <ElRadioButton value="list">列表</ElRadioButton>
              <ElRadioButton value="tree">代理樹</ElRadioButton>
            </ElRadioGroup>
            <ElButton @click="exportRows">匯出</ElButton>
          </div>
        </template>
      </ArtTableHeader>

      <ElTable v-if="viewMode === 'tree'" :data="agentTree" row-key="id" border default-expand-all>
        <ElTableColumn label="代理" min-width="260">
          <template #default="{ row }">
            <EntityLink
              :label="row.name"
              :secondary="`${row.code} · ${row.id}`"
              :to="`/business/agents/${row.id}`"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="level" label="層級" width="80" />
        <ElTableColumn label="代理條件" min-width="150">
          <template #default="{ row }">{{ termText(row) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="merchantCount" label="直屬商戶" width="105" />
        <ElTableColumn label="狀態" width="110">
          <template #default="{ row }"><GameProviderStatusTag :status="row.status" /></template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openDetail(row)">查看</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <ArtTable
        v-else
        :data="pagedRows"
        :columns="columns"
        :pagination="pagination"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        :loading="loading"
        height="540"
        row-key="id"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="statusVisible"
      :title="`${statusNext === 'Active' ? '啟用' : '停用'}代理確認`"
      :width="dialogWidth"
    >
      <ElAlert
        :title="
          statusNext === 'Active'
            ? '啟用後可恢復建立下級代理與商戶。'
            : `停用 ${statusTarget?.name || ''} 將限制建立新的下級代理與商戶。`
        "
        type="warning"
        :closable="false"
        show-icon
      />
      <div class="impact-grid"
        ><div
          ><span>直接下級代理</span
          ><strong>{{
            statusTarget ? store.getDirectChildren(statusTarget.id).length : 0
          }}</strong></div
        ><div
          ><span>全部轄下代理</span
          ><strong>{{
            statusTarget ? store.getDescendants(statusTarget.id).length : 0
          }}</strong></div
        ><div
          ><span>直屬商戶</span
          ><strong>{{
            statusTarget ? store.getDirectMerchants(statusTarget.id).length : 0
          }}</strong></div
        ><div><span>歷史報表／結算</span><strong>保留快照</strong></div></div
      >
      <ElForm label-position="top"
        ><ElFormItem label="操作原因" required
          ><ElInput
            v-model="statusReason"
            type="textarea"
            :rows="3"
            placeholder="請輸入此次狀態變更原因" /></ElFormItem
      ></ElForm>
      <template #footer
        ><ElButton @click="statusVisible = false">取消</ElButton
        ><ElButton type="primary" :disabled="!statusReason.trim()" @click="confirmStatus"
          >確認送出</ElButton
        ></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { describeGameTypeRates } from '@/utils/partnerTerms'
  import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElMessage } from 'element-plus'
  import { storeToRefs } from 'pinia'
  import { useWindowSize } from '@vueuse/core'
  import type { ColumnOption } from '@/types'
  import type { AgentRecord, AgentStatus } from '@/types/game-provider'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'

  defineOptions({ name: 'AgentManagement' })
  const router = useRouter()
  const store = useBusinessPartnerStore()
  const { agents: rows } = storeToRefs(store)
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const dialogWidth = computed(() => (width.value < 640 ? 'calc(100% - 24px)' : '560px'))
  const loading = ref(false)
  const viewMode = ref<'list' | 'tree'>('list')
  const filteredRows = ref<AgentRecord[]>([...rows.value])
  const statusVisible = ref(false)
  const statusTarget = ref<AgentRecord>()
  const statusReason = ref('')
  const statusNext = computed<AgentStatus>(() =>
    statusTarget.value?.status === 'Active' ? 'Disabled' : 'Active'
  )
  const searchForm = ref<{
    agentId?: string
    agentCode?: string
    name?: string
    level?: AgentRecord['level']
    parentAgentId?: string
    status?: AgentStatus
    updatedAt?: [string, string]
  }>({})
  const pagination = reactive({ current: 1, size: 20, total: rows.value.length })
  const activeCount = computed(() => rows.value.filter((agent) => agent.status === 'Active').length)
  const levelSummary = computed(() => [
    {
      label: 'L1 總代理',
      value: rows.value.filter((a) => a.level === 'L1').length,
      note: '無上級代理'
    },
    {
      label: 'L2 區域代理',
      value: rows.value.filter((a) => a.level === 'L2').length,
      note: '隸屬 L1'
    },
    {
      label: 'L3 地方代理',
      value: rows.value.filter((a) => a.level === 'L3').length,
      note: '最深層級'
    },
    {
      label: '待處理',
      value: rows.value.filter((a) => ['Draft', 'Pending'].includes(a.status)).length,
      note: '草稿與待生效'
    }
  ])
  const searchItems = computed(() => [
    {
      label: '代理編號',
      key: 'agentId',
      type: 'input',
      props: { placeholder: '輸入 Agent ID', clearable: true }
    },
    {
      label: '代理代碼',
      key: 'agentCode',
      type: 'input',
      props: { placeholder: '輸入代理代碼', clearable: true }
    },
    {
      label: '代理名稱',
      key: 'name',
      type: 'input',
      props: { placeholder: '輸入代理名稱', clearable: true }
    },
    {
      label: '代理層級',
      key: 'level',
      type: 'select',
      props: {
        clearable: true,
        options: ['L1', 'L2', 'L3'].map((value) => ({ label: value, value }))
      }
    },
    {
      label: '上級代理',
      key: 'parentAgentId',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        options: rows.value
          .filter((a) => a.level !== 'L3')
          .map((a) => ({ label: a.name, value: a.id }))
      }
    },
    {
      label: '狀態',
      key: 'status',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '草稿', value: 'Draft' },
          { label: '待生效', value: 'Pending' },
          { label: '啟用', value: 'Active' },
          { label: '停用', value: 'Disabled' }
        ]
      }
    },
    {
      label: '最後修改',
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
  const termText = (agent: AgentRecord) => {
    const term = store.getCurrentTerm(agent.id)
    return term
      ? `${term.settlementBasis === 'Valid Bet' ? '有效投注' : term.settlementBasis === 'Turnover' ? '營業額' : 'GGR'} ${describeGameTypeRates(term)}`
      : '未設定'
  }
  const allColumns: ColumnOption[] = [
    { prop: 'id', label: 'Agent ID', width: 105 },
    {
      prop: 'code',
      label: '代理代碼',
      minWidth: 135,
      formatter: (row: AgentRecord) =>
        h(EntityLink, { label: row.code, secondary: row.name, to: `/business/agents/${row.id}` })
    },
    { prop: 'name', label: '代理名稱', minWidth: 140 },
    { prop: 'level', label: '層級', width: 75 },
    { prop: 'parentAgent', label: '上級代理', minWidth: 130 },
    {
      prop: 'term',
      label: '代理條件',
      minWidth: 130,
      formatter: (row: AgentRecord) => termText(row)
    },
    { prop: 'merchantCount', label: '直屬商戶', width: 105, sortable: true },
    {
      prop: 'status',
      label: '狀態',
      width: 105,
      formatter: (row: AgentRecord) => h(GameProviderStatusTag, { status: row.status })
    },
    { prop: 'updatedAt', label: '最後修改', minWidth: 145, sortable: true },
    {
      prop: 'operation',
      label: '操作',
      width: 175,
      fixed: 'right',
      formatter: (row: AgentRecord) =>
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
                h(ElDropdownMenu, null, () =>
                  [
                    row.level !== 'L3'
                      ? h(ElDropdownItem, { command: 'child' }, () => '建立下級代理')
                      : null,
                    h(ElDropdownItem, { command: 'terms' }, () => '商務條件'),
                    h(ElDropdownItem, { command: 'merchants' }, () => '所屬商戶'),
                    h(ElDropdownItem, { command: 'logs' }, () => '異動紀錄'),
                    h(ElDropdownItem, { command: 'status', divided: true }, () =>
                      row.status === 'Active' ? '停用代理' : '啟用代理'
                    )
                  ].filter(Boolean)
                )
            }
          )
        ])
    }
  ]
  const columns = computed<ColumnOption[]>(() =>
    isMobile.value
      ? allColumns
          .filter((c) => ['code', 'status', 'operation'].includes(String(c.prop)))
          .map((c) => (c.prop === 'operation' ? { ...c, fixed: undefined } : c))
      : allColumns
  )
  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })
  type TreeAgent = AgentRecord & { children?: TreeAgent[] }
  const agentTree = computed<TreeAgent[]>(() => {
    const map = new Map(
      filteredRows.value.map((agent) => [agent.id, { ...agent, children: [] } as TreeAgent])
    )
    const roots: TreeAgent[] = []
    map.forEach((node) => {
      const parent = node.parentAgentId ? map.get(node.parentAgentId) : undefined
      if (parent) parent.children?.push(node)
      else roots.push(node)
    })
    return roots
  })
  const applyFilters = (params: Record<string, unknown>) => {
    filteredRows.value = rows.value.filter((row) => {
      const text = (key: string, value: string) =>
        !String(params[key] || '').trim() ||
        value.toLowerCase().includes(String(params[key]).trim().toLowerCase())
      return (
        text('agentId', row.id) &&
        text('agentCode', row.code) &&
        text('name', row.name) &&
        (!params.level || row.level === params.level) &&
        (!params.parentAgentId || row.parentAgentId === params.parentAgentId) &&
        (!params.status || row.status === params.status) &&
        (!Array.isArray(params.updatedAt) ||
          params.updatedAt.length !== 2 ||
          ((row.updatedAt || row.createdAt).slice(0, 10) >= String(params.updatedAt[0]) &&
            (row.updatedAt || row.createdAt).slice(0, 10) <= String(params.updatedAt[1])))
      )
    })
    pagination.total = filteredRows.value.length
    pagination.current = 1
  }
  const resetFilters = () => {
    filteredRows.value = [...rows.value]
    pagination.total = rows.value.length
    pagination.current = 1
  }
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
    ElMessage.success('代理資料已重新整理')
  }
  const startCreate = () => router.push('/business/agents/create')
  const openDetail = (row: AgentRecord, tab?: string) =>
    router.push({ path: `/business/agents/${row.id}`, query: tab ? { tab } : undefined })
  const handleMore = (command: string, row: AgentRecord) => {
    if (command === 'child')
      return router.push({ path: '/business/agents/create', query: { parentId: row.id } })
    if (command === 'terms') return openDetail(row, 'terms')
    if (command === 'merchants') return openDetail(row, 'merchants')
    if (command === 'logs') return openDetail(row, 'logs')
    statusTarget.value = row
    statusReason.value = ''
    statusVisible.value = true
  }
  const confirmStatus = () => {
    if (!statusTarget.value || !statusReason.value.trim()) return
    store.changeStatus(statusTarget.value.id, statusNext.value, statusReason.value)
    statusVisible.value = false
    resetFilters()
    ElMessage.success('代理狀態已更新')
  }
  const exportRows = () => {
    const escapeCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const header = [
      'Agent ID',
      '代理代碼',
      '代理名稱',
      '層級',
      '上級代理',
      '代理條件',
      '直屬商戶',
      '狀態',
      '最後修改'
    ]
    const lines = filteredRows.value.map((row) =>
      [
        row.id,
        row.code,
        row.name,
        row.level,
        row.parentAgent,
        termText(row),
        row.merchantCount,
        row.status,
        row.updatedAt || row.createdAt
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
    anchor.download = `代理列表_${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    ElMessage.success(`已匯出目前篩選結果，共 ${filteredRows.value.length} 筆代理資料`)
  }
  watch(rows, resetFilters, { deep: true })
</script>

<style scoped lang="scss">
  .agent-page {
    display: grid;
    gap: 16px;
  }

  .agent-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .agent-table-header {
    margin-bottom: 16px;
  }

  .level-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .level-summary :deep(.el-card__body) {
    display: grid;
    gap: 6px;
    padding: 16px 18px;
  }

  .level-summary span,
  .level-summary small {
    color: var(--art-gray-500);
  }

  .level-summary strong {
    font-size: 22px;
  }

  .impact-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 16px 0;
  }

  .impact-grid > div {
    display: grid;
    gap: 5px;
    padding: 12px;
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .impact-grid span {
    color: var(--art-gray-500);
  }

  @media (width <= 900px) {
    .level-summary {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 560px) {
    .level-summary {
      grid-template-columns: 1fr;
    }

    .impact-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
