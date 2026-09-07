<template>
  <div class="game-list-page">
    <AppPageHeader
      title="遊戲管理"
      eyebrow="遊戲中心"
      description="集中管理遊戲主檔、分類標籤、RTP 與限紅設定狀態。"
    >
      <template #actions>
        <ElTag type="success" effect="light" round>{{ activeCount }} 款啟用</ElTag>
        <ElTag type="warning" effect="light" round>{{ incompleteCount }} 款待完成設定</ElTag>
        <ElTag type="info" effect="plain" round>{{ rows.length }} 款遊戲</ElTag>
      </template>
    </AppPageHeader>

    <ElAlert
      title="新增遊戲後會先保持草稿；完成預設 RTP 與限紅方案後，才能啟用提供商戶使用。"
      type="info"
      :closable="false"
      show-icon
      class="rule-alert"
    />

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      :label-position="isMobile ? 'top' : 'right'"
      :label-width="isMobile ? 'auto' : '106px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="art-table-card table-card">
      <ArtTableHeader :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton type="primary" @click="startCreate" v-ripple>新增遊戲</ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="batchEnable">
              批次啟用
            </ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="batchDisable">
              批次停用
            </ElButton>
            <ElButton :disabled="selectedRows.length === 0" @click="batchTagVisible = true">
              批次設定標籤
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
        height="540"
        row-key="id"
        @selection-change="selectedRows = $event"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDialog
      v-model="activationVisible"
      :title="`啟用前檢查｜${activationTarget?.displayName || ''}`"
      :width="activationDialogWidth"
      destroy-on-close
    >
      <ElAlert
        :title="
          activationReady
            ? '必要設定已完成，可以啟用遊戲。'
            : '仍有必要設定未完成，暫時不能啟用遊戲。'
        "
        :type="activationReady ? 'success' : 'warning'"
        :closable="false"
        show-icon
        class="mb-5"
      />
      <div class="activation-list">
        <div v-for="item in activationChecks" :key="item.key" class="activation-item">
          <div class="check-icon" :class="{ passed: item.passed }">
            <ArtSvgIcon :icon="item.passed ? 'ri:check-line' : 'ri:close-line'" />
          </div>
          <div>
            <strong>{{ item.label }}</strong>
            <p>{{ item.note }}</p>
          </div>
          <ElTag :type="item.passed ? 'success' : 'warning'" effect="light" round>
            {{ item.passed ? '已完成' : '待設定' }}
          </ElTag>
        </div>
      </div>
      <template #footer>
        <ElButton @click="activationVisible = false">取消</ElButton>
        <ElButton v-if="activationReady" type="primary" @click="confirmActivate">
          確認啟用
        </ElButton>
        <ElButton v-else type="primary" @click="goToMissingSetup">前往完成設定</ElButton>
      </template>
    </ElDialog>

    <GameBatchTagDialog
      v-model:visible="batchTagVisible"
      :game-count="selectedRows.length"
      :feature-options="activeFeatureTags"
      :marketing-options="activeMarketingTags"
      @apply="applyBatchTags"
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
  import { storeToRefs } from 'pinia'
  import { useWindowSize } from '@vueuse/core'
  import type { ColumnOption } from '@/types'
  import type { GameRecord, GameSetupStatus, GameStatus } from '@/types/game-provider'
  import {
    gameFeatureTagMockData,
    gameMarketingTagMockData,
    gameTypeMockData
  } from '@/mock/game-provider'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import GameBatchTagDialog from './modules/game-batch-tag-dialog.vue'

  defineOptions({ name: 'GameManagement' })

  const router = useRouter()
  const gameCatalogStore = useGameCatalogStore()
  const { games: rows } = storeToRefs(gameCatalogStore)
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const activationDialogWidth = computed(() => (isMobile.value ? 'calc(100% - 24px)' : '620px'))
  const filteredRows = ref<GameRecord[]>([...rows.value])
  const selectedRows = ref<GameRecord[]>([])
  const loading = ref(false)
  const activationVisible = ref(false)
  const activationTarget = ref<GameRecord>()
  const batchTagVisible = ref(false)
  const pagination = reactive({ current: 1, size: 20, total: rows.value.length })
  const searchForm = ref<{
    keyword?: string
    typeId?: string
    featureTagId?: string
    marketingTagId?: string
    status?: GameStatus
    rtpStatus?: GameSetupStatus
    limitStatus?: GameSetupStatus
    updatedAt?: [string, string]
  }>({})

  const activeTypes = gameTypeMockData.filter((item) => item.status === 'Active')
  const activeFeatureTags = gameFeatureTagMockData.filter((item) => item.status === 'Active')
  const activeMarketingTags = gameMarketingTagMockData.filter((item) => item.status === 'Active')
  const typeMap = new Map(gameTypeMockData.map((item) => [item.id, item.name]))
  const featureMap = new Map(gameFeatureTagMockData.map((item) => [item.id, item.name]))
  const marketingMap = new Map(gameMarketingTagMockData.map((item) => [item.id, item.name]))

  const statusOptions: Array<{ label: string; value: GameStatus }> = [
    { label: '草稿', value: 'Draft' },
    { label: '啟用', value: 'Active' },
    { label: '維護中', value: 'Maintenance' },
    { label: '已停用', value: 'Disabled' }
  ]
  const setupOptions: Array<{ label: string; value: GameSetupStatus }> = [
    { label: '已設定', value: 'Configured' },
    { label: '未設定', value: 'Not Configured' }
  ]

  const activeCount = computed(() => rows.value.filter((game) => game.status === 'Active').length)
  const incompleteCount = computed(() => rows.value.filter((game) => !isGameReady(game)).length)
  const searchItems = [
    {
      label: '遊戲關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '輸入遊戲代碼或名稱', clearable: true }
    },
    {
      label: '遊戲類型',
      key: 'typeId',
      type: 'select',
      props: {
        placeholder: '全部類型',
        clearable: true,
        options: activeTypes.map((item) => ({ label: item.name, value: item.id }))
      }
    },
    {
      label: '狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    },
    {
      label: 'RTP 設定',
      key: 'rtpStatus',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: setupOptions }
    },
    {
      label: '限紅設定',
      key: 'limitStatus',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: setupOptions }
    },
    {
      label: '功能標籤',
      key: 'featureTagId',
      type: 'select',
      props: {
        placeholder: '全部標籤',
        clearable: true,
        filterable: true,
        options: activeFeatureTags.map((item) => ({ label: item.name, value: item.id }))
      }
    },
    {
      label: '行銷標籤',
      key: 'marketingTagId',
      type: 'select',
      props: {
        placeholder: '全部標籤',
        clearable: true,
        filterable: true,
        options: activeMarketingTags.map((item) => ({ label: item.name, value: item.id }))
      }
    },
    {
      label: '最後修改日期',
      key: 'updatedAt',
      type: 'datetime',
      props: {
        type: 'daterange',
        valueFormat: 'YYYY-MM-DD',
        rangeSeparator: '至',
        startPlaceholder: '開始日期',
        endPlaceholder: '結束日期'
      }
    }
  ]

  const setupTag = (status: GameSetupStatus, count: number) =>
    h('div', { class: 'setup-cell' }, [
      h(
        ElTag,
        { type: status === 'Configured' ? 'success' : 'warning', effect: 'light', round: true },
        () => (status === 'Configured' ? '已設定' : '未設定')
      ),
      h('span', { class: 'setup-count' }, `${count} 個方案`)
    ])

  const renderTags = (ids: string[], map: Map<string, string>, type: 'primary' | 'info') => {
    if (!ids.length) return h('span', { class: 'empty-value' }, '—')
    const visibleIds = ids.slice(0, 2)
    return h('div', { class: 'tag-list' }, [
      ...visibleIds.map((id) =>
        h(
          ElTag,
          { key: id, type, effect: 'plain', size: 'small', round: true },
          () => map.get(id) || id
        )
      ),
      ids.length > 2
        ? h(
            ElTag,
            { type: 'info', effect: 'plain', size: 'small', round: true },
            () => `+${ids.length - 2}`
          )
        : null
    ])
  }

  const baseColumns: ColumnOption[] = [
    { type: 'selection', width: 50 },
    {
      prop: 'displayName',
      label: '遊戲資訊',
      minWidth: 220,
      fixed: 'left',
      formatter: (row: GameRecord) =>
        h('div', { class: 'game-identity' }, [
          h(
            'div',
            { class: 'game-icon', 'aria-hidden': 'true' },
            row.iconAsset ? [h('img', { src: row.iconAsset.url, alt: '' })] : row.icon
          ),
          h('div', { class: 'game-copy' }, [
            h(
              ElButton,
              { link: true, type: 'primary', onClick: () => openDetail(row) },
              () => row.displayName
            ),
            h('span', row.code)
          ])
        ])
    },
    {
      prop: 'typeId',
      label: '遊戲類型',
      minWidth: 110,
      formatter: (row: GameRecord) => typeMap.get(row.typeId) || '未分類'
    },
    {
      prop: 'featureTagIds',
      label: '功能標籤',
      minWidth: 210,
      formatter: (row: GameRecord) => renderTags(row.featureTagIds, featureMap, 'primary')
    },
    {
      prop: 'marketingTagIds',
      label: '行銷標籤',
      minWidth: 170,
      formatter: (row: GameRecord) => renderTags(row.marketingTagIds, marketingMap, 'info')
    },
    {
      prop: 'defaultRtp',
      label: '預設 RTP',
      width: 105,
      formatter: (row: GameRecord) => (row.defaultRtp ? `${row.defaultRtp}%` : '—')
    },
    {
      prop: 'rtpStatus',
      label: 'RTP 方案',
      minWidth: 130,
      formatter: (row: GameRecord) => setupTag(row.rtpStatus, row.rtpPlanCount)
    },
    {
      prop: 'limitStatus',
      label: '限紅方案',
      minWidth: 130,
      formatter: (row: GameRecord) => setupTag(row.limitStatus, row.limitPlanCount)
    },
    {
      prop: 'status',
      label: '狀態',
      width: 105,
      formatter: (row: GameRecord) => h(GameProviderStatusTag, { status: row.status })
    },
    { prop: 'updatedAt', label: '最後修改時間', minWidth: 155, sortable: true },
    {
      prop: 'operation',
      label: '操作',
      width: 170,
      fixed: 'right',
      formatter: (row: GameRecord) =>
        h('div', { class: 'flex-c gap-1' }, [
          h(
            ElButton,
            { link: true, type: 'primary', onClick: () => openDetail(row) },
            () => '查看'
          ),
          h(
            ElDropdown,
            { trigger: 'click', onCommand: (command: string) => handleCommand(command, row) },
            {
              default: () => h(ElButton, { link: true }, () => '更多'),
              dropdown: () =>
                h(ElDropdownMenu, null, () => [
                  h(ElDropdownItem, { command: 'edit' }, () => '編輯基本資料'),
                  h(ElDropdownItem, { command: 'rtp' }, () => '查看 RTP 方案'),
                  h(ElDropdownItem, { command: 'limits' }, () => '查看限紅方案'),
                  h(ElDropdownItem, { command: 'logs' }, () => '查看異動紀錄'),
                  h(
                    ElDropdownItem,
                    { command: row.status === 'Active' ? 'disable' : 'activate', divided: true },
                    () => (row.status === 'Active' ? '停用遊戲' : '啟用遊戲')
                  )
                ])
            }
          )
        ])
    }
  ]

  const columns = computed<ColumnOption[]>(() => {
    if (!isMobile.value) return baseColumns
    const mobileProps = new Set(['displayName', 'rtpStatus', 'limitStatus', 'status', 'operation'])
    return baseColumns
      .filter(
        (column) => column.type === 'selection' || (column.prop && mobileProps.has(column.prop))
      )
      .map((column) =>
        column.prop === 'displayName' || column.prop === 'operation'
          ? { ...column, fixed: undefined }
          : column
      )
  })

  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })

  const activationChecks = computed(() => {
    const game = activationTarget.value
    if (!game) return []
    return [
      {
        key: 'master',
        label: '遊戲主檔',
        passed: game.masterComplete,
        note: game.masterComplete ? '必要基本資料已完成' : '仍缺少必要的顯示或規格資料'
      },
      {
        key: 'rtp',
        label: '預設 RTP 方案',
        passed:
          game.rtpStatus === 'Configured' && game.rtpPlanCount > 0 && Boolean(game.defaultRtp),
        note:
          game.rtpStatus === 'Configured' && game.defaultRtp
            ? `目前預設 RTP 為 ${game.defaultRtp}%`
            : '尚未建立並啟用預設 RTP 方案'
      },
      {
        key: 'limits',
        label: '限紅方案',
        passed: game.limitStatus === 'Configured' && game.limitPlanCount > 0,
        note:
          game.limitStatus === 'Configured'
            ? `目前有 ${game.limitPlanCount} 個限紅方案`
            : '尚未依遊戲類型建立必要限紅方案'
      }
    ]
  })
  const activationReady = computed(() => activationChecks.value.every((item) => item.passed))

  function isGameReady(game: GameRecord) {
    return (
      game.masterComplete &&
      game.rtpStatus === 'Configured' &&
      game.rtpPlanCount > 0 &&
      Boolean(game.defaultRtp) &&
      game.limitStatus === 'Configured' &&
      game.limitPlanCount > 0
    )
  }

  const applyFilters = (params: Record<string, unknown>) => {
    const keyword = String(params.keyword || '')
      .trim()
      .toLowerCase()
    filteredRows.value = rows.value.filter((row) => {
      const searchable =
        `${row.code} ${row.internalName} ${row.displayName} ${row.englishName}`.toLowerCase()
      return (
        (!keyword || searchable.includes(keyword)) &&
        (!params.typeId || row.typeId === params.typeId) &&
        (!params.featureTagId || row.featureTagIds.includes(String(params.featureTagId))) &&
        (!params.marketingTagId || row.marketingTagIds.includes(String(params.marketingTagId))) &&
        (!params.status || row.status === params.status) &&
        (!params.rtpStatus || row.rtpStatus === params.rtpStatus) &&
        (!params.limitStatus || row.limitStatus === params.limitStatus) &&
        (!Array.isArray(params.updatedAt) ||
          params.updatedAt.length !== 2 ||
          (row.updatedAt.slice(0, 10) >= String(params.updatedAt[0]) &&
            row.updatedAt.slice(0, 10) <= String(params.updatedAt[1])))
      )
    })
    pagination.total = filteredRows.value.length
    pagination.current = 1
    selectedRows.value = []
  }

  const resetFilters = () => {
    filteredRows.value = [...rows.value]
    pagination.total = rows.value.length
    pagination.current = 1
    selectedRows.value = []
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
    ElMessage.success('遊戲資料已重新整理')
  }

  const startCreate = () => router.push('/games/management/create')
  const openDetail = (row: GameRecord, tab?: string) =>
    router.push({ path: `/games/management/${row.id}`, query: tab ? { tab } : undefined })
  const openActivationCheck = (row: GameRecord) => {
    activationTarget.value = row
    activationVisible.value = true
  }
  const confirmActivate = () => {
    if (!activationTarget.value || !activationReady.value) return
    gameCatalogStore.updateGame(activationTarget.value.id, { status: 'Active' }, '啟用遊戲')
    activationVisible.value = false
    applyFilters(searchForm.value)
    ElMessage.success(`${activationTarget.value.displayName} 已啟用`)
  }
  const goToMissingSetup = () => {
    if (!activationTarget.value) return
    const firstMissing = activationChecks.value.find((item) => !item.passed)?.key
    openDetail(activationTarget.value, firstMissing === 'master' ? 'overview' : firstMissing)
    activationVisible.value = false
  }

  const disableGame = async (row: GameRecord) => {
    const confirmed = await ElMessageBox.confirm(
      row.merchantCount
        ? `目前有 ${row.merchantCount} 個商戶使用「${row.displayName}」。停用後將停止新局啟動，歷史注單不受影響。`
        : `確定要停用「${row.displayName}」嗎？`,
      '停用遊戲確認',
      { confirmButtonText: '確認停用', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    gameCatalogStore.updateGame(row.id, { status: 'Disabled' }, '停用遊戲')
    applyFilters(searchForm.value)
    ElMessage.success(`${row.displayName} 已停用`)
  }

  const handleCommand = (command: string, row: GameRecord) => {
    if (command === 'activate') return openActivationCheck(row)
    if (command === 'disable') return disableGame(row)
    if (command === 'edit') return openDetail(row, 'overview')
    if (command === 'rtp') return openDetail(row, 'rtp')
    if (command === 'limits') return openDetail(row, 'limits')
    return openDetail(row, 'logs')
  }

  const batchEnable = async () => {
    const candidates = selectedRows.value.filter((game) => game.status !== 'Active')
    const ready = candidates.filter(isGameReady)
    const blocked = candidates.filter((game) => !isGameReady(game))
    if (!ready.length) {
      await ElMessageBox.alert(
        blocked.length
          ? `選取的 ${blocked.length} 款遊戲仍缺少主檔、RTP 或限紅設定，無法啟用。`
          : '選取的遊戲目前都已啟用。',
        '沒有可啟用的遊戲',
        { confirmButtonText: '知道了', type: 'warning' }
      )
      return
    }
    const confirmed = await ElMessageBox.confirm(
      blocked.length
        ? `${ready.length} 款遊戲符合條件；另有 ${blocked.length} 款設定未完成，將自動略過。`
        : `確定要啟用選取的 ${ready.length} 款遊戲嗎？`,
      '批次啟用確認',
      { confirmButtonText: '確認啟用', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    ready.forEach((game) => {
      gameCatalogStore.updateGame(game.id, { status: 'Active' }, '批次啟用遊戲')
    })
    resetFilters()
    ElMessage.success(
      `已啟用 ${ready.length} 款遊戲${blocked.length ? `，略過 ${blocked.length} 款` : ''}`
    )
  }

  const batchDisable = async () => {
    const targets = selectedRows.value.filter(
      (game) => game.status === 'Active' || game.status === 'Maintenance'
    )
    if (!targets.length) {
      ElMessage.info('選取的遊戲目前不需要停用')
      return
    }
    const merchantCount = targets.reduce((sum, game) => sum + game.merchantCount, 0)
    const confirmed = await ElMessageBox.confirm(
      `將停用 ${targets.length} 款遊戲，涉及 ${merchantCount} 個商戶引用；歷史注單不受影響。`,
      '批次停用確認',
      { confirmButtonText: '確認停用', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    targets.forEach((game) => {
      gameCatalogStore.updateGame(game.id, { status: 'Disabled' }, '批次停用遊戲')
    })
    resetFilters()
    ElMessage.success(`已停用 ${targets.length} 款遊戲`)
  }

  const applyBatchTags = (payload: {
    mode: 'append' | 'replace'
    featureTagIds: string[]
    marketingTagIds: string[]
  }) => {
    selectedRows.value.forEach((game) => {
      let featureTagIds = game.featureTagIds
      let marketingTagIds = game.marketingTagIds
      if (payload.mode === 'replace') {
        if (payload.featureTagIds.length) featureTagIds = [...payload.featureTagIds]
        if (payload.marketingTagIds.length) marketingTagIds = [...payload.marketingTagIds]
      } else {
        featureTagIds = [...new Set([...game.featureTagIds, ...payload.featureTagIds])]
        marketingTagIds = [...new Set([...game.marketingTagIds, ...payload.marketingTagIds])]
      }
      gameCatalogStore.updateGame(game.id, { featureTagIds, marketingTagIds }, '批次更新遊戲標籤')
    })
    const count = selectedRows.value.length
    resetFilters()
    ElMessage.success(`已更新 ${count} 款遊戲的標籤`)
  }

  const exportRows = () => {
    const header = [
      'Game ID',
      '遊戲代碼',
      '遊戲名稱',
      '遊戲類型',
      '功能標籤',
      '行銷標籤',
      '預設 RTP',
      'RTP 方案數',
      '限紅方案數',
      '狀態',
      '最後修改時間'
    ]
    const csv = [
      header,
      ...filteredRows.value.map((game) => [
        game.id,
        game.code,
        game.displayName,
        typeMap.get(game.typeId) || '',
        game.featureTagIds.map((id) => featureMap.get(id) || id).join('、'),
        game.marketingTagIds.map((id) => marketingMap.get(id) || id).join('、'),
        game.defaultRtp || '',
        game.rtpPlanCount,
        game.limitPlanCount,
        statusOptions.find((item) => item.value === game.status)?.label || game.status,
        game.updatedAt
      ])
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = 'games-mock.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success('遊戲 Mock CSV 已匯出')
  }
</script>

<style scoped lang="scss">
  .game-list-page {
    display: grid;
    gap: 16px;
  }

  .rule-alert {
    border: 1px solid var(--el-color-info-light-7);
  }

  .table-card :deep(.el-card__body) {
    height: 100%;
  }

  :deep(.game-identity) {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  :deep(.game-icon) {
    display: grid;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    font-size: 22px;
    background: var(--art-gray-100);
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
    place-items: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }
  }

  :deep(.game-copy) {
    display: grid;
    min-width: 0;

    .el-button {
      justify-content: flex-start;
      width: fit-content;
      max-width: 100%;
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      overflow: hidden;
      font-size: 12px;
      color: var(--art-gray-500);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  :deep(.tag-list) {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  :deep(.setup-cell) {
    display: grid;
    gap: 4px;
    justify-items: start;
  }

  :deep(.setup-count),
  :deep(.empty-value) {
    font-size: 12px;
    color: var(--art-gray-500);
  }

  .activation-list {
    display: grid;
    gap: 10px;
  }

  .activation-item {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 14px;
    background: var(--art-gray-50);
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;

    strong {
      font-weight: 600;
    }

    p {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--art-gray-600);
    }
  }

  .check-icon {
    display: grid;
    width: 30px;
    height: 30px;
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    border-radius: 50%;
    place-items: center;

    &.passed {
      color: var(--el-color-success);
      background: var(--el-color-success-light-9);
    }
  }

  @media (width <= 640px) {
    .activation-item {
      grid-template-columns: 30px minmax(0, 1fr);

      .el-tag {
        grid-column: 2;
        width: fit-content;
      }
    }
  }
</style>
