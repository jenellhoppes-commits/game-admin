<template>
  <div class="risk-alert-page">
    <AppPageHeader
      title="告警列表"
      eyebrow="風控中心"
      description="統一處理會員、注單、交易、商戶線路、遊戲與獎池異常。"
    >
      <template #actions>
        <ElTag type="danger" effect="light" round>{{ store.criticalAlertCount }} 筆嚴重</ElTag>
        <ElTag type="warning" effect="plain" round>{{ store.newAlertCount }} 筆待確認</ElTag>
        <ElButton @click="refreshData">重新整理</ElButton>
      </template>
    </AppPageHeader>

    <ElCard class="category-card" shadow="never">
      <ElRadioGroup v-model="activeCategory" @change="applyCategory">
        <ElRadioButton value="">全部 {{ store.alerts.length }}</ElRadioButton>
        <ElRadioButton v-for="item in categoryOptions" :key="item.value" :value="item.value">
          {{ item.label }} {{ categoryCount(item.value) }}
        </ElRadioButton>
      </ElRadioGroup>
    </ElCard>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      :label-position="isMobile ? 'top' : 'right'"
      :label-width="isMobile ? 'auto' : '90px'"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="table-card" shadow="never">
      <div class="table-toolbar">
        <div>
          <strong>告警查詢結果</strong>
          <span>共 {{ filteredRows.length }} 筆；所有處理操作都會保留紀錄。</span>
        </div>
        <ElButton :disabled="!selectedRows.length" @click="batchAcknowledge">
          批次確認（{{ selectedRows.length }}）
        </ElButton>
      </div>

      <ElTable :data="pagedRows" border row-key="id" @selection-change="selectedRows = $event">
        <ElTableColumn type="selection" width="48" />
        <ElTableColumn label="告警" min-width="230" fixed="left">
          <template #default="scope">
            <button class="primary-link" type="button" @click="openDrawer(scope.row.id)">
              <strong>{{ scope.row.title }}</strong>
              <small>{{ scope.row.id }} · {{ scope.row.ruleName }}</small>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn label="分類" width="120">
          <template #default="scope">{{ categoryLabel(scope.row.category) }}</template>
        </ElTableColumn>
        <ElTableColumn label="風險" width="105">
          <template #default="scope">
            <ElTag :type="severityType(scope.row.severity)" effect="light">
              {{ severityLabel(scope.row.severity) }} · {{ scope.row.score }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="關聯對象" min-width="180">
          <template #default="scope">
            <span>{{ scope.row.subjectLabel }}</span
            ><br />
            <small>{{ scope.row.subjectType }} · {{ scope.row.subjectId }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="商戶／線路" min-width="200">
          <template #default="scope">
            {{ scope.row.merchantName || '—' }}
            <small v-if="scope.row.lineUid" class="block">{{ scope.row.lineUid }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="實際值／門檻" min-width="170">
          <template #default="scope">
            <strong>{{ scope.row.measuredValue }}</strong
            ><br />
            <small>{{ scope.row.threshold }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="110">
          <template #default="scope">
            <ElTag :type="statusType(scope.row.status)" effect="plain">
              {{ statusLabel(scope.row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="assignee" label="處理人" width="130">
          <template #default="scope">{{ scope.row.assignee || '未指派' }}</template>
        </ElTableColumn>
        <ElTableColumn label="發生／期限" width="170">
          <template #default="scope">
            {{ scope.row.occurredAt }}<br />
            <small :class="{ overdue: isOverdue(scope.row) }">期限 {{ scope.row.dueAt }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="130" fixed="right">
          <template #default="scope">
            <ElButton link type="primary" @click="openDrawer(scope.row.id)">查看詳細</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pagination-wrap">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[20, 50, 100]"
          :total="filteredRows.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </ElCard>

    <ElDrawer
      v-model="drawerVisible"
      :title="currentAlert ? `${currentAlert.id}｜${currentAlert.title}` : '告警詳細'"
      :size="drawerSize"
      destroy-on-close
      @closed="closeDrawer"
    >
      <template v-if="currentAlert">
        <div class="drawer-status">
          <ElTag :type="severityType(currentAlert.severity)" effect="dark">
            {{ severityLabel(currentAlert.severity) }}風險 · {{ currentAlert.score }}
          </ElTag>
          <ElTag :type="statusType(currentAlert.status)" effect="plain">
            {{ statusLabel(currentAlert.status) }}
          </ElTag>
          <ElTag v-if="currentAlert.caseId" type="warning" effect="plain">
            案件 {{ currentAlert.caseId }}
          </ElTag>
        </div>

        <section class="drawer-section">
          <div class="section-title">
            <div><h3>告警摘要</h3><p>告警識別、來源與處理責任。</p></div>
          </div>
          <ElDescriptions :column="drawerColumns" border>
            <ElDescriptionsItem label="告警分類">{{
              categoryLabel(currentAlert.category)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="關聯對象">
              {{ currentAlert.subjectLabel }}（{{ currentAlert.subjectId }}）
            </ElDescriptionsItem>
            <ElDescriptionsItem label="處理人">{{
              currentAlert.assignee || '尚未指派'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="處理期限">{{ currentAlert.dueAt }}</ElDescriptionsItem>
            <ElDescriptionsItem label="發生時間">{{ currentAlert.occurredAt }}</ElDescriptionsItem>
            <ElDescriptionsItem label="最後更新">{{ currentAlert.updatedAt }}</ElDescriptionsItem>
            <ElDescriptionsItem label="告警說明" :span="drawerColumns">
              {{ currentAlert.description }}
            </ElDescriptionsItem>
          </ElDescriptions>
        </section>

        <section class="drawer-section trigger-panel">
          <div class="section-title">
            <div><h3>規則觸發資訊</h3><p>比較實際觀測值與規則門檻。</p></div>
            <ElButton link type="primary" @click="openRule">查看規則</ElButton>
          </div>
          <div class="trigger-comparison">
            <div
              ><span>監控來源</span><strong>{{ currentAlert.source }}</strong></div
            >
            <div
              ><span>實際值</span
              ><strong class="danger-text">{{ currentAlert.measuredValue }}</strong></div
            >
            <div
              ><span>觸發門檻</span><strong>{{ currentAlert.threshold }}</strong></div
            >
            <div
              ><span>觸發規則</span><strong>{{ currentAlert.ruleName }}</strong></div
            >
          </div>
        </section>

        <section class="drawer-section">
          <div class="section-title">
            <div><h3>關聯資料</h3><p>直接進入會員、Replay、交易、線路與獎池查核。</p></div>
          </div>
          <div class="relation-grid">
            <button v-if="currentAlert.memberId" type="button" @click="openMember">
              <ArtSvgIcon icon="ri:user-line" /><span>會員</span>
              <strong>{{ currentAlert.externalMemberId || currentAlert.memberId }}</strong>
            </button>
            <button v-if="currentAlert.betId" type="button" @click="openBet">
              <ArtSvgIcon icon="ri:file-list-3-line" /><span>注單</span>
              <strong>{{ currentAlert.betId }}</strong>
            </button>
            <button
              v-if="currentAlert.betId && currentAlert.replayEventId"
              type="button"
              @click="openReplay"
            >
              <ArtSvgIcon icon="ri:play-circle-line" /><span>異常階段 Replay</span>
              <strong>{{ currentAlert.replayEventId }}</strong>
            </button>
            <button v-if="currentAlert.transactionId" type="button" @click="openTransaction">
              <ArtSvgIcon icon="ri:exchange-dollar-line" /><span>交易</span>
              <strong>{{ currentAlert.transactionId }}</strong>
            </button>
            <button v-if="currentAlert.lineUid" type="button" @click="openMerchantLine">
              <ArtSvgIcon icon="ri:route-line" /><span>商戶線路</span>
              <strong>{{ currentAlert.lineUid }}</strong>
            </button>
            <button v-if="currentAlert.gameId" type="button" @click="openGame">
              <ArtSvgIcon icon="ri:gamepad-line" /><span>遊戲</span>
              <strong>{{ currentAlert.gameName || currentAlert.gameId }}</strong>
            </button>
            <button v-if="currentAlert.poolId" type="button" @click="openPool">
              <ArtSvgIcon icon="ri:funds-box-line" /><span>獎池</span>
              <strong>{{ currentAlert.poolName || currentAlert.poolId }}</strong>
            </button>
          </div>
        </section>

        <section class="drawer-section">
          <div class="section-title">
            <div><h3>處理紀錄</h3><p>完整保留狀態、指派與處理原因。</p></div>
          </div>
          <ElTable :data="alertLogs" border empty-text="尚無處理紀錄">
            <ElTableColumn prop="action" label="操作" width="120" />
            <ElTableColumn label="狀態變化" min-width="160">
              <template #default="scope">
                {{ auditStateLabel(scope.row.before) }} → {{ auditStateLabel(scope.row.after) }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="reason" label="原因" min-width="220" />
            <ElTableColumn prop="operator" label="操作人" width="120" />
            <ElTableColumn prop="time" label="時間" width="155" />
          </ElTable>
        </section>
      </template>

      <template #footer>
        <div v-if="currentAlert" class="drawer-actions">
          <ElButton @click="assignCurrent">指派處理人</ElButton>
          <ElButton
            v-if="currentAlert.status === 'New'"
            type="primary"
            plain
            @click="acknowledgeCurrent"
          >
            確認告警
          </ElButton>
          <ElButton
            v-if="!isClosed(currentAlert.status)"
            type="warning"
            plain
            @click="investigateCurrent"
          >
            開始調查
          </ElButton>
          <ElButton v-if="!currentAlert.caseId" type="primary" @click="createCurrentCase">
            建立案件
          </ElButton>
          <ElButton
            v-else
            type="primary"
            @click="router.push(`/risk/cases/${currentAlert.caseId}`)"
          >
            查看案件 {{ currentAlert.caseId }}
          </ElButton>
          <ElDropdown v-if="!isClosed(currentAlert.status)" @command="dismissCurrent">
            <ElButton type="danger" plain>
              排除告警<ArtSvgIcon icon="ri:arrow-down-s-line" class="ml-1" />
            </ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="false-positive">標記誤報</ElDropdownItem>
                <ElDropdownItem command="dismiss">忽略告警</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    RiskAlertCategory,
    RiskAlertRecord,
    RiskAlertStatus,
    RiskSeverity
  } from '@/types/game-provider'
  import { useRiskCenterStore } from '@/store/modules/riskCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'RiskAlerts' })

  const route = useRoute()
  const router = useRouter()
  const store = useRiskCenterStore()
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value < 640)
  const drawerSize = computed(() => (width.value < 760 ? '100%' : 'min(860px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 680 ? 1 : 2))
  const activeCategory = ref(String(route.query.category || ''))
  const searchForm = ref<Record<string, unknown>>({
    severity: route.query.severity || '',
    status: route.query.status || ''
  })
  const appliedFilters = ref<Record<string, unknown>>({ ...searchForm.value })
  const selectedRows = ref<RiskAlertRecord[]>([])
  const selectedAlertId = ref(String(route.query.alertId || ''))
  const drawerVisible = ref(Boolean(route.query.alertId))
  const pagination = reactive({ current: 1, size: 20 })

  const categoryOptions: Array<{ label: string; value: RiskAlertCategory }> = [
    { label: '會員異常', value: 'Member' },
    { label: '注單異常', value: 'Bet' },
    { label: '交易異常', value: 'Transaction' },
    { label: '商戶線路異常', value: 'Merchant Line' },
    { label: '遊戲異常', value: 'Game' },
    { label: '獎池異常', value: 'Jackpot' }
  ]
  const severityOptions: Array<{ label: string; value: RiskSeverity }> = [
    { label: '嚴重', value: 'Critical' },
    { label: '高', value: 'High' },
    { label: '中', value: 'Medium' },
    { label: '低', value: 'Low' }
  ]
  const statusOptions: Array<{ label: string; value: RiskAlertStatus }> = [
    { label: '新告警', value: 'New' },
    { label: '已確認', value: 'Acknowledged' },
    { label: '調查中', value: 'Investigating' },
    { label: '已解決', value: 'Resolved' },
    { label: '誤報', value: 'False Positive' },
    { label: '已忽略', value: 'Dismissed' }
  ]
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '告警編號、標題、關聯對象', clearable: true }
    },
    {
      label: '風險等級',
      key: 'severity',
      type: 'select',
      props: { placeholder: '全部等級', clearable: true, options: severityOptions }
    },
    {
      label: '告警狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    },
    {
      label: '處理人',
      key: 'assignee',
      type: 'input',
      props: { placeholder: '輸入處理人', clearable: true }
    },
    {
      label: '發生時間',
      key: 'dateRange',
      type: 'daterange',
      props: { startPlaceholder: '開始日期', endPlaceholder: '結束日期', valueFormat: 'YYYY-MM-DD' }
    }
  ])

  const filteredRows = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    const assignee = String(appliedFilters.value.assignee || '')
      .trim()
      .toLowerCase()
    const range = appliedFilters.value.dateRange as string[] | undefined
    return store.alerts.filter((row) => {
      const haystack =
        `${row.id} ${row.title} ${row.subjectId} ${row.subjectLabel} ${row.memberId || ''} ${row.betId || ''} ${row.transactionId || ''} ${row.lineUid || ''}`.toLowerCase()
      return (
        (!activeCategory.value || row.category === activeCategory.value) &&
        (!keyword || haystack.includes(keyword)) &&
        (!appliedFilters.value.severity || row.severity === appliedFilters.value.severity) &&
        (!appliedFilters.value.status || row.status === appliedFilters.value.status) &&
        (!assignee || (row.assignee || '').toLowerCase().includes(assignee)) &&
        (!range?.length ||
          (row.occurredAt.slice(0, 10) >= range[0] && row.occurredAt.slice(0, 10) <= range[1]))
      )
    })
  })
  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })
  const currentAlert = computed(() => store.findAlert(selectedAlertId.value))
  const alertLogs = computed(() =>
    currentAlert.value ? store.getAlertLogs(currentAlert.value.id) : []
  )

  const categoryCount = (category: RiskAlertCategory) =>
    store.alerts.filter((item) => item.category === category).length
  const categoryLabel = (category: RiskAlertCategory) =>
    categoryOptions.find((item) => item.value === category)?.label || category
  const severityLabel = (severity: RiskSeverity) =>
    severityOptions.find((item) => item.value === severity)?.label || severity
  const severityType = (severity: RiskSeverity) =>
    severity === 'Critical' || severity === 'High'
      ? 'danger'
      : severity === 'Medium'
        ? 'warning'
        : 'info'
  const statusLabel = (status: RiskAlertStatus) =>
    statusOptions.find((item) => item.value === status)?.label || status
  const auditStateLabel = (status: string) =>
    ({
      None: '無',
      New: '新告警',
      Acknowledged: '已確認',
      Investigating: '調查中',
      Resolved: '已解決',
      'False Positive': '誤報',
      Dismissed: '已忽略'
    })[status] || status
  const statusType = (status: RiskAlertStatus) =>
    status === 'Resolved'
      ? 'success'
      : status === 'Investigating'
        ? 'warning'
        : status === 'False Positive' || status === 'Dismissed'
          ? 'info'
          : status === 'New'
            ? 'danger'
            : 'primary'
  const isClosed = (status: RiskAlertStatus) =>
    ['Resolved', 'False Positive', 'Dismissed'].includes(status)
  const isOverdue = (alert: RiskAlertRecord) =>
    !isClosed(alert.status) && new Date(alert.dueAt.replace(' ', 'T')).getTime() < Date.now()
  const applyCategory = () => {
    pagination.current = 1
    router.replace({ query: { ...route.query, category: activeCategory.value || undefined } })
  }
  const applyFilters = (params: Record<string, unknown>) => {
    appliedFilters.value = { ...params }
    pagination.current = 1
  }
  const resetFilters = () => {
    searchForm.value = {}
    appliedFilters.value = {}
    pagination.current = 1
  }
  const refreshData = async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    ElMessage.success('風控告警已重新整理')
  }
  const openDrawer = (alertId: string) => {
    selectedAlertId.value = alertId
    drawerVisible.value = true
    router.replace({ query: { ...route.query, alertId } })
  }
  const closeDrawer = () => {
    selectedAlertId.value = ''
    router.replace({ query: { ...route.query, alertId: undefined } })
  }
  const acknowledgeCurrent = () => {
    if (!currentAlert.value) return
    if (store.acknowledgeAlert(currentAlert.value.id)) ElMessage.success('告警已確認')
  }
  const batchAcknowledge = () => {
    const count = selectedRows.value.filter((item) => store.acknowledgeAlert(item.id)).length
    selectedRows.value = []
    ElMessage.success(`已確認 ${count} 筆新告警`)
  }
  const assignCurrent = async () => {
    if (!currentAlert.value) return
    const result = await ElMessageBox.prompt('請輸入處理人名稱', '指派處理人', {
      inputValue: currentAlert.value.assignee || 'Risk Analyst A',
      inputPattern: /.{2,}/,
      inputErrorMessage: '處理人名稱至少 2 個字',
      confirmButtonText: '確認指派',
      cancelButtonText: '取消'
    }).catch(() => null)
    if (!result) return
    store.assignAlert(currentAlert.value.id, result.value, '人工指派告警處理人')
    ElMessage.success('處理人已更新')
  }
  const investigateCurrent = () => {
    if (!currentAlert.value) return
    if (store.startInvestigation(currentAlert.value.id)) ElMessage.success('告警已進入調查中')
  }
  const createCurrentCase = async () => {
    if (!currentAlert.value) return
    const result = await ElMessageBox.prompt('請輸入建案原因', '建立風控案件', {
      inputPattern: /.{4,}/,
      inputErrorMessage: '建案原因至少 4 個字',
      confirmButtonText: '確認建案',
      cancelButtonText: '取消',
      type: 'warning'
    }).catch(() => null)
    if (!result) return
    const caseId = store.createCaseFromAlert(currentAlert.value.id, result.value)
    if (caseId) ElMessage.success(`已建立風控案件 ${caseId}`)
  }
  const dismissCurrent = async (command: string) => {
    if (!currentAlert.value) return
    const falsePositive = command === 'false-positive'
    const result = await ElMessageBox.prompt(
      falsePositive ? '請說明判定為誤報的原因' : '請說明忽略此告警的原因',
      falsePositive ? '標記誤報' : '忽略告警',
      {
        inputPattern: /.{4,}/,
        inputErrorMessage: '原因至少 4 個字',
        confirmButtonText: '確認',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => null)
    if (!result) return
    store.dismissAlert(currentAlert.value.id, falsePositive, result.value)
    ElMessage.success(falsePositive ? '已標記為誤報' : '告警已忽略')
  }
  const openRule = () =>
    currentAlert.value &&
    router.push({ path: '/risk/rules', query: { ruleId: currentAlert.value.ruleId } })
  const openMember = () =>
    currentAlert.value?.memberId &&
    router.push(`/members/management/${currentAlert.value.memberId}`)
  const openBet = () =>
    currentAlert.value?.betId && router.push(`/transactions/bets/${currentAlert.value.betId}`)
  const openReplay = () => {
    if (!currentAlert.value?.betId) return
    router.push({
      path: `/transactions/bets/${currentAlert.value.betId}`,
      query: {
        tab: 'replay',
        eventId: currentAlert.value.replayEventId,
        stageId: currentAlert.value.replayStageId,
        alertId: currentAlert.value.id
      }
    })
  }
  const openTransaction = () =>
    currentAlert.value?.transactionId &&
    router.push(`/transactions/records/${currentAlert.value.transactionId}`)
  const openMerchantLine = () => {
    if (!currentAlert.value?.merchantId || !currentAlert.value.lineUid) return
    router.push(
      `/business/merchants/${currentAlert.value.merchantId}/lines/${currentAlert.value.lineUid}`
    )
  }
  const openGame = () =>
    currentAlert.value?.gameId && router.push(`/games/management/${currentAlert.value.gameId}`)
  const openPool = () =>
    currentAlert.value?.poolId && router.push(`/jackpots/${currentAlert.value.poolId}`)

  watch(
    () => route.query.alertId,
    (alertId) => {
      if (!alertId) return
      selectedAlertId.value = String(alertId)
      drawerVisible.value = true
    }
  )
</script>

<style scoped lang="scss">
  .risk-alert-page {
    display: grid;
    gap: 16px;
  }

  .category-card :deep(.el-card__body) {
    padding: 14px 16px;
    overflow-x: auto;
  }

  .category-card :deep(.el-radio-group) {
    flex-wrap: nowrap;
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .table-toolbar,
  .drawer-status,
  .drawer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .table-toolbar {
    padding: 16px 18px;
  }

  .table-toolbar > div {
    display: grid;
    gap: 4px;
  }

  .table-toolbar span,
  small,
  .section-title p,
  .trigger-comparison span {
    color: var(--art-gray-500);
  }

  .block {
    display: block;
    margin-top: 3px;
  }

  .primary-link {
    display: grid;
    gap: 3px;
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

  .overdue,
  .danger-text {
    color: var(--el-color-danger);
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px 18px;
  }

  .drawer-status {
    justify-content: flex-start;
    margin-bottom: 18px;
  }

  .drawer-section {
    padding: 18px;
    margin-bottom: 16px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .section-title {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 15px;
  }

  .section-title h3,
  .section-title p {
    margin: 0;
  }

  .section-title p {
    margin-top: 4px;
    font-size: 13px;
  }

  .trigger-comparison {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: hidden;
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .trigger-comparison > div {
    display: grid;
    gap: 6px;
    padding: 13px 15px;
    border-right: 1px solid var(--art-gray-200);
    border-bottom: 1px solid var(--art-gray-200);
  }

  .relation-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .relation-grid button {
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: 3px 8px;
    align-items: center;
    min-width: 0;
    padding: 13px;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .relation-grid button:hover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  .relation-grid .art-svg-icon {
    grid-row: 1 / 3;
    font-size: 19px;
    color: var(--el-color-primary);
  }

  .relation-grid strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .drawer-actions {
    justify-content: flex-end;
  }

  @media (width <= 680px) {
    .relation-grid,
    .trigger-comparison {
      grid-template-columns: 1fr;
    }

    .pagination-wrap {
      overflow-x: auto;
    }
  }
</style>
