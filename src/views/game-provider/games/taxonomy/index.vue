<template>
  <div class="taxonomy-page">
    <AppPageHeader
      :title="config.title"
      eyebrow="遊戲中心／分類與標籤"
      :description="config.description"
    >
      <template #actions>
        <ElTag type="success" effect="light" round>{{ activeCount }} 個啟用</ElTag>
        <ElTag type="info" effect="plain" round>{{ rows.length }} 筆資料</ElTag>
      </template>
    </AppPageHeader>

    <ElAlert :title="config.ruleHint" type="info" :closable="false" show-icon class="rule-alert" />

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      :show-expand="false"
      :label-position="isMobile ? 'top' : 'right'"
      :label-width="isMobile ? 'auto' : '96px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card table-card">
      <ArtTableHeader :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="openCreate" v-ripple>
              新增{{ config.itemLabel }}
            </ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="batchDisable">
              批次停用
            </ElButton>
            <ElButton @click="exportRows">匯出</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :data="pagedRows"
        :columns="columns"
        :pagination="pagination"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        :loading="loading"
        height="520"
        row-key="id"
        @selection-change="selectedRows = $event"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <TaxonomyDrawer
      v-model:visible="drawerVisible"
      :kind="kind"
      :record="editingRecord"
      :existing-records="rows"
      @saved="saveRecord"
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
    ElMessageBox,
    ElTag
  } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { ColumnOption } from '@/types'
  import type {
    GameLimitModel,
    GameTaxonomyKind,
    GameTaxonomyRecord,
    GameTaxonomyStatus
  } from '@/types/game-provider'
  import {
    gameFeatureTagMockData,
    gameMarketingTagMockData,
    gameTypeMockData
  } from '@/mock/game-provider'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import TaxonomyDrawer from './modules/taxonomy-drawer.vue'

  defineOptions({ name: 'GameTaxonomyManagement' })

  const route = useRoute()
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)

  const kind = computed<GameTaxonomyKind>(() => {
    if (route.name === 'GameFeatureTags') return 'feature'
    if (route.name === 'GameMarketingTags') return 'marketing'
    return 'type'
  })

  const configs = {
    type: {
      title: '遊戲類型',
      itemLabel: '遊戲類型',
      description: '管理遊戲的主要分類與限紅編輯模型；每款遊戲只能指定一個主要類型。',
      ruleHint: '遊戲類型會決定限紅方案的欄位結構。已有遊戲引用時，類型代碼不可修改。'
    },
    feature: {
      title: '功能標籤',
      itemLabel: '功能標籤',
      description: '管理 Buy Feature、Super Buy、Jackpot 等可多選的遊戲功能。',
      ruleHint: '標記為「影響設定」的功能標籤會控制遊戲詳細頁的相關設定欄位。'
    },
    marketing: {
      title: '行銷標籤',
      itemLabel: '行銷標籤',
      description: '管理熱門、推薦、新遊戲等展示標籤，只影響搜尋與前台呈現。',
      ruleHint: '行銷標籤不參與 RTP、限紅或遊戲計算；已有遊戲引用時仍可停用，但會停止後續選用。'
    }
  } as const
  const config = computed(() => configs[kind.value])

  const sourceData: Record<GameTaxonomyKind, GameTaxonomyRecord[]> = {
    type: gameTypeMockData,
    feature: gameFeatureTagMockData,
    marketing: gameMarketingTagMockData
  }
  const rows = ref<GameTaxonomyRecord[]>([])
  const filteredRows = ref<GameTaxonomyRecord[]>([])
  const selectedRows = ref<GameTaxonomyRecord[]>([])
  const editingRecord = ref<GameTaxonomyRecord>()
  const drawerVisible = ref(false)
  const loading = ref(false)
  const pagination = reactive({ current: 1, size: 20, total: 0 })
  const searchForm = ref<{
    keyword?: string
    status?: GameTaxonomyStatus
    limitModel?: GameLimitModel
    affectsSettings?: 'yes' | 'no'
  }>({})

  const limitModelLabels: Record<GameLimitModel, string> = {
    'Slot Bet Levels': 'Slot｜投注檔位',
    'Fishing Hall BetX': 'Fishing｜廳別 × Bet X',
    'Arcade Level Currency': 'Arcade｜Level × 幣別',
    'Generic Bet Range': '其他｜通用投注範圍'
  }

  const activeCount = computed(() => rows.value.filter((item) => item.status === 'Active').length)
  const searchItems = computed(() => {
    const items = [
      {
        label: '關鍵字',
        key: 'keyword',
        type: 'input',
        props: {
          placeholder:
            kind.value === 'type'
              ? '搜尋代碼或類型名稱'
              : kind.value === 'feature'
                ? '搜尋代碼或標籤名稱'
                : '搜尋標籤名稱或顯示文字',
          clearable: true
        }
      },
      {
        label: '狀態',
        key: 'status',
        type: 'select',
        props: {
          placeholder: '全部狀態',
          clearable: true,
          options: [
            { label: '啟用', value: 'Active' },
            { label: '已停用', value: 'Disabled' }
          ]
        }
      }
    ]

    if (kind.value === 'type') {
      items.splice(1, 0, {
        label: '限紅模型',
        key: 'limitModel',
        type: 'select',
        props: {
          placeholder: '全部模型',
          clearable: true,
          options: Object.entries(limitModelLabels).map(([value, label]) => ({ label, value }))
        }
      })
    }
    if (kind.value === 'feature') {
      items.splice(1, 0, {
        label: '影響設定',
        key: 'affectsSettings',
        type: 'select',
        props: {
          placeholder: '全部',
          clearable: true,
          options: [
            { label: '是', value: 'yes' },
            { label: '否', value: 'no' }
          ]
        }
      })
    }
    return items
  })

  const baseColumns = computed<ColumnOption[]>(() => {
    const result: ColumnOption[] = [{ type: 'selection', width: 50 }]

    if (kind.value !== 'marketing') {
      result.push({
        prop: 'code',
        label: kind.value === 'type' ? '類型代碼' : '標籤代碼',
        minWidth: 135
      })
    }
    result.push({
      prop: 'name',
      label: kind.value === 'type' ? '類型名稱' : '標籤名稱',
      minWidth: 145,
      formatter: (row: GameTaxonomyRecord) =>
        h(ElButton, { link: true, type: 'primary', onClick: () => openEdit(row) }, () => row.name)
    })

    if (kind.value === 'type') {
      result.push({
        prop: 'limitModel',
        label: '限紅模型',
        minWidth: 190,
        formatter: (row: GameTaxonomyRecord) =>
          row.limitModel ? limitModelLabels[row.limitModel] : '—'
      })
    }
    if (kind.value === 'feature') {
      result.push(
        {
          prop: 'affectsSettings',
          label: '影響設定',
          width: 105,
          formatter: (row: GameTaxonomyRecord) =>
            h(
              ElTag,
              { type: row.affectsSettings ? 'warning' : 'info', effect: 'light', round: true },
              () => (row.affectsSettings ? '是' : '否')
            )
        },
        { prop: 'relatedSetting', label: '關聯設定', minWidth: 185 }
      )
    }
    if (kind.value === 'marketing') {
      result.push({
        prop: 'displayText',
        label: '顯示文字',
        minWidth: 125,
        formatter: (row: GameTaxonomyRecord) =>
          h(ElTag, { type: 'primary', effect: 'plain', round: true }, () => row.displayText || '—')
      })
    }

    result.push(
      { prop: 'gameCount', label: '使用遊戲', width: 105, sortable: true },
      { prop: 'sort', label: '排序', width: 82, sortable: true },
      {
        prop: 'status',
        label: '狀態',
        width: 105,
        formatter: (row: GameTaxonomyRecord) => h(GameProviderStatusTag, { status: row.status })
      },
      { prop: 'updatedAt', label: '最後修改時間', minWidth: 155, sortable: true },
      {
        prop: 'operation',
        label: '操作',
        width: 155,
        fixed: 'right',
        formatter: (row: GameTaxonomyRecord) =>
          h('div', { class: 'flex-c gap-1' }, [
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openEdit(row) },
              () => '編輯'
            ),
            h(
              ElDropdown,
              { trigger: 'click', onCommand: (command: string) => handleCommand(command, row) },
              {
                default: () => h(ElButton, { link: true }, () => '更多'),
                dropdown: () =>
                  h(ElDropdownMenu, null, () => [
                    h(
                      ElDropdownItem,
                      { command: row.status === 'Active' ? 'disable' : 'activate' },
                      () => (row.status === 'Active' ? '停用' : '啟用')
                    ),
                    h(ElDropdownItem, { command: 'games', divided: true }, () => '查看使用遊戲')
                  ])
              }
            )
          ])
      }
    )
    return result
  })

  const columns = computed<ColumnOption[]>(() => {
    if (!isMobile.value) return baseColumns.value
    const mobileProps = new Set(['code', 'name', 'status', 'operation'])
    return baseColumns.value
      .filter(
        (column) => column.type === 'selection' || (column.prop && mobileProps.has(column.prop))
      )
      .map((column) => (column.prop === 'operation' ? { ...column, fixed: undefined } : column))
  })

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })

  const syncFilteredRows = (nextRows: GameTaxonomyRecord[]) => {
    filteredRows.value = [...nextRows].sort((a, b) => a.sort - b.sort)
    pagination.total = filteredRows.value.length
    pagination.current = 1
    selectedRows.value = []
  }

  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    const nextRows = rows.value.filter((row) => {
      const searchable = [row.code, row.name, row.displayText, row.relatedSetting]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const affectsSettings = params.affectsSettings
      return (
        (!keyword || searchable.includes(keyword)) &&
        (!params.status || row.status === params.status) &&
        (!params.limitModel || row.limitModel === params.limitModel) &&
        (!affectsSettings || row.affectsSettings === (affectsSettings === 'yes'))
      )
    })
    syncFilteredRows(nextRows)
  }

  const resetFilters = () => syncFilteredRows(rows.value)
  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
  }
  const handleCurrentChange = (current: number) => (pagination.current = current)

  const loadKindData = () => {
    rows.value = structuredClone(sourceData[kind.value])
    searchForm.value = {}
    resetFilters()
  }

  const refreshData = async () => {
    loading.value = true
    await new Promise((resolve) => setTimeout(resolve, 350))
    resetFilters()
    loading.value = false
    ElMessage.success(`${config.value.itemLabel}資料已重新整理`)
  }

  const openCreate = () => {
    editingRecord.value = undefined
    drawerVisible.value = true
  }
  const openEdit = (row: GameTaxonomyRecord) => {
    editingRecord.value = row
    drawerVisible.value = true
  }
  const saveRecord = (record: GameTaxonomyRecord) => {
    const index = rows.value.findIndex((item) => item.id === record.id)
    if (index >= 0) rows.value[index] = record
    else rows.value.unshift(record)
    applyFilters(searchForm.value)
  }

  const updateStatus = async (row: GameTaxonomyRecord, status: GameTaxonomyStatus) => {
    if (status === 'Disabled') {
      const confirmed = await ElMessageBox.confirm(
        row.gameCount
          ? `目前有 ${row.gameCount} 款遊戲使用「${row.name}」。停用後既有資料會保留，但不可再被新遊戲選用。`
          : `確定要停用「${row.name}」嗎？`,
        `停用${config.value.itemLabel}`,
        { confirmButtonText: '確認停用', cancelButtonText: '取消', type: 'warning' }
      ).catch(() => false)
      if (!confirmed) return
    }
    row.status = status
    row.updatedAt = new Date().toLocaleString('zh-TW', { hour12: false }).replaceAll('/', '-')
    resetFilters()
    ElMessage.success(status === 'Active' ? `${row.name} 已啟用` : `${row.name} 已停用`)
  }

  const handleCommand = (command: string, row: GameTaxonomyRecord) => {
    if (command === 'activate') return updateStatus(row, 'Active')
    if (command === 'disable') return updateStatus(row, 'Disabled')
    ElMessage.info(`${row.name} 目前被 ${row.gameCount} 款遊戲使用`)
  }

  const batchDisable = async () => {
    const targets = selectedRows.value.filter((row) => row.status === 'Active')
    if (!targets.length) {
      ElMessage.info('選取資料目前都已停用')
      return
    }
    const referenceCount = targets.reduce((sum, row) => sum + row.gameCount, 0)
    const confirmed = await ElMessageBox.confirm(
      `將停用 ${targets.length} 筆${config.value.itemLabel}，共涉及 ${referenceCount} 個遊戲引用；既有資料不會刪除。`,
      '批次停用確認',
      { confirmButtonText: '確認停用', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    targets.forEach((row) => (row.status = 'Disabled'))
    resetFilters()
    ElMessage.success(`已停用 ${targets.length} 筆資料`)
  }

  const exportRows = () => {
    const header = [
      'ID',
      '代碼',
      '名稱',
      '顯示文字',
      '限紅模型',
      '影響設定',
      '關聯設定',
      '遊戲數',
      '排序',
      '狀態'
    ]
    const csv = [
      header,
      ...filteredRows.value.map((row) => [
        row.id,
        row.code || '',
        row.name,
        row.displayText || '',
        row.limitModel ? limitModelLabels[row.limitModel] : '',
        row.affectsSettings === undefined ? '' : row.affectsSettings ? '是' : '否',
        row.relatedSetting || '',
        row.gameCount,
        row.sort,
        row.status === 'Active' ? '啟用' : '已停用'
      ])
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = `game-${kind.value}-taxonomy-mock.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('Mock CSV 已匯出')
  }

  watch(() => route.name, loadKindData, { immediate: true })
</script>

<style scoped lang="scss">
  .taxonomy-page {
    display: grid;
    gap: 16px;
  }

  .rule-alert {
    border: 1px solid var(--el-color-info-light-7);
  }

  .table-card :deep(.el-card__body) {
    height: 100%;
  }

  @media (width <= 640px) {
    .rule-alert :deep(.el-alert__content) {
      min-width: 0;
    }
  }
</style>
