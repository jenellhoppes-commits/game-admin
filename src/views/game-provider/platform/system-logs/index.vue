<template>
  <div class="page">
    <AppPageHeader :title="copy.title" eyebrow="平台管理 · 系統紀錄" :description="copy.description"
      ><template #actions
        ><ElButton @click="ElMessage.success('紀錄已匯出')">匯出</ElButton
        ><ElButton @click="ElMessage.success('資料已重新整理')">重新整理</ElButton></template
      ></AppPageHeader
    >
    <div class="summary-grid"
      ><button type="button" @click="setSummary('')"
        ><span>{{ copy.metricOne }}</span
        ><strong>{{ metricOne }}</strong
        ><small>{{ copy.metricOneHint }}</small></button
      ><button type="button" @click="setSummary(copy.filterTwo)"
        ><span>{{ copy.metricTwo }}</span
        ><strong class="warning">{{ metricTwo }}</strong
        ><small>{{ copy.metricTwoHint }}</small></button
      ><button type="button" @click="setSummary(copy.filterThree)"
        ><span>{{ copy.metricThree }}</span
        ><strong class="danger">{{ metricThree }}</strong
        ><small>{{ copy.metricThreeHint }}</small></button
      ><div><span>資料保留</span><strong>365 天</strong><small>依系統參數設定</small></div></div
    >
    <ElAlert :title="copy.rule" type="info" :closable="false" show-icon />
    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput
            v-model="filters.keyword"
            clearable
            :placeholder="copy.placeholder" /></ElFormItem
        ><ElFormItem v-if="mode === 'logins'" label="結果"
          ><ElSelect v-model="filters.status" clearable placeholder="全部結果"
            ><ElOption
              v-for="item in loginResults"
              :key="item"
              :label="loginResultLabel(item)"
              :value="item" /></ElSelect></ElFormItem
        ><ElFormItem v-else-if="mode === 'approvals'" label="動作"
          ><ElSelect v-model="filters.status" clearable placeholder="全部動作"
            ><ElOption label="送出審核" value="送出審核" /><ElOption
              label="核准"
              value="核准" /><ElOption label="駁回" value="駁回" /></ElSelect></ElFormItem
        ><ElFormItem v-else label="狀態"
          ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
            ><ElOption label="新異常" value="New" /><ElOption
              label="調查中"
              value="Investigating" /><ElOption label="已解決" value="Resolved" /><ElOption
              label="已忽略"
              value="Ignored" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >

    <ElCard v-if="mode === 'logins'" shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>登入與工作階段紀錄</strong><span>共 {{ loginRows.length }} 筆</span></div
        ><span>失敗登入與未知來源優先檢視</span></div
      ><ElTable :data="loginRows" border row-key="id"
        ><ElTableColumn label="時間" prop="occurredAt" min-width="165" fixed="left" /><ElTableColumn
          label="帳號"
          min-width="210"
          ><template #default="scope"
            ><button class="link" type="button" @click="openLogin(scope.row.id)"
              ><strong>{{ scope.row.displayName || '未知帳號' }}</strong
              ><small
                >{{ scope.row.username }} · {{ scope.row.accountId || '未識別' }}</small
              ></button
            ></template
          ></ElTableColumn
        ><ElTableColumn label="結果" width="120"
          ><template #default="scope"
            ><ElTag :type="loginResultType(scope.row.result)">{{
              loginResultLabel(scope.row.result)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="來源" min-width="175"
          ><template #default="scope"
            >{{ scope.row.ipAddress }}<br /><small>{{ scope.row.location }}</small></template
          ></ElTableColumn
        ><ElTableColumn prop="device" label="裝置" min-width="160" /><ElTableColumn
          prop="reason"
          label="原因"
          min-width="230"
        /><ElTableColumn label="風險" width="100"
          ><template #default="scope"
            ><ElTag :type="riskType(scope.row.riskLevel)" effect="plain">{{
              riskLabel(scope.row.riskLevel)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openLogin(scope.row.id)"
              >查看</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      ></ElCard
    >

    <ElCard v-else-if="mode === 'approvals'" shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>全平台審核軌跡</strong><span>共 {{ approvalRows.length }} 筆</span></div
        ><span>來源資料與每次狀態異動皆可追溯</span></div
      ><ElTable :data="approvalRows" border row-key="id"
        ><ElTableColumn label="時間" prop="time" min-width="165" fixed="left" /><ElTableColumn
          label="審核單"
          min-width="180"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openApproval(scope.row.approvalId)">{{
              scope.row.approvalId
            }}</ElButton
            ><br /><small>{{ approvalSource(scope.row.approvalId) }}</small></template
          ></ElTableColumn
        ><ElTableColumn prop="action" label="操作" width="120" /><ElTableColumn
          label="狀態變化"
          min-width="170"
          ><template #default="scope"
            ><ElTag type="info" effect="plain">{{ approvalStatusLabel(scope.row.before) }}</ElTag
            ><span class="arrow">→</span
            ><ElTag :type="approvalStatusType(scope.row.after)">{{
              approvalStatusLabel(scope.row.after)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn prop="operator" label="操作人" min-width="140" /><ElTableColumn
          prop="reason"
          label="原因／說明"
          min-width="300"
          show-overflow-tooltip /><ElTableColumn
          prop="id"
          label="紀錄編號"
          min-width="160" /></ElTable
    ></ElCard>

    <ElCard v-else shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>系統異常紀錄</strong><span>共 {{ errorRows.length }} 筆</span></div
        ><span>正式環境重大異常應同步建立通知</span></div
      ><ElTable :data="errorRows" border row-key="id"
        ><ElTableColumn label="異常" min-width="270" fixed="left"
          ><template #default="scope"
            ><button class="link" type="button" @click="openError(scope.row.id)"
              ><strong>{{ scope.row.message }}</strong
              ><small>{{ scope.row.id }} · {{ scope.row.errorCode }}</small></button
            ></template
          ></ElTableColumn
        ><ElTableColumn prop="service" label="服務" min-width="190" /><ElTableColumn
          label="環境"
          width="110"
          ><template #default="scope"
            ><ElTag
              :type="scope.row.environment === 'Production' ? 'danger' : 'info'"
              effect="plain"
              >{{ environmentLabel(scope.row.environment) }}</ElTag
            ></template
          ></ElTableColumn
        ><ElTableColumn label="等級" width="100"
          ><template #default="scope"
            ><ElTag :type="severityType(scope.row.severity)">{{
              severityLabel(scope.row.severity)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn
          prop="occurrenceCount"
          label="次數"
          width="80"
          align="center"
        /><ElTableColumn label="最近發生" min-width="165"
          ><template #default="scope">{{ scope.row.lastOccurredAt }}</template></ElTableColumn
        ><ElTableColumn prop="assignee" label="處理人" min-width="130"
          ><template #default="scope">{{ scope.row.assignee || '未指派' }}</template></ElTableColumn
        ><ElTableColumn label="狀態" width="110"
          ><template #default="scope"
            ><ElTag :type="errorStatusType(scope.row.status)">{{
              errorStatusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="操作" width="100" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openError(scope.row.id)"
              >查看處理</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      ></ElCard
    >

    <ElDrawer
      v-model="loginDrawer"
      :title="currentLogin ? `登入紀錄｜${currentLogin.id}` : '登入紀錄'"
      size="min(660px, 94vw)"
      ><template v-if="currentLogin"
        ><div class="drawer-status"
          ><ElTag :type="loginResultType(currentLogin.result)">{{
            loginResultLabel(currentLogin.result)
          }}</ElTag
          ><ElTag :type="riskType(currentLogin.riskLevel)" effect="plain">{{
            riskLabel(currentLogin.riskLevel)
          }}</ElTag></div
        ><ElDescriptions :column="2" border
          ><ElDescriptionsItem label="帳號">{{
            currentLogin.displayName || '未知帳號'
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="帳號 ID">{{
            currentLogin.accountId || '未識別'
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="登入名稱">{{ currentLogin.username }}</ElDescriptionsItem
          ><ElDescriptionsItem label="發生時間">{{ currentLogin.occurredAt }}</ElDescriptionsItem
          ><ElDescriptionsItem label="IP 位址">{{ currentLogin.ipAddress }}</ElDescriptionsItem
          ><ElDescriptionsItem label="來源地區">{{ currentLogin.location }}</ElDescriptionsItem
          ><ElDescriptionsItem label="裝置">{{ currentLogin.device }}</ElDescriptionsItem
          ><ElDescriptionsItem label="瀏覽器">{{ currentLogin.userAgent }}</ElDescriptionsItem
          ><ElDescriptionsItem label="結果原因" :span="2">{{
            currentLogin.reason
          }}</ElDescriptionsItem></ElDescriptions
        ></template
      ><template #footer
        ><ElButton
          v-if="currentLogin?.accountId"
          type="primary"
          @click="router.push('/platform/access/accounts')"
          >查看後台帳號</ElButton
        ></template
      ></ElDrawer
    >

    <ElDrawer
      v-model="errorDrawer"
      :title="currentError ? `系統異常｜${currentError.id}` : '系統異常'"
      size="min(740px, 94vw)"
      ><template v-if="currentError"
        ><div class="drawer-status"
          ><ElTag :type="severityType(currentError.severity)">{{
            severityLabel(currentError.severity)
          }}</ElTag
          ><ElTag :type="errorStatusType(currentError.status)">{{
            errorStatusLabel(currentError.status)
          }}</ElTag></div
        ><h2>{{ currentError.message }}</h2
        ><ElDescriptions :column="2" border
          ><ElDescriptionsItem label="服務">{{ currentError.service }}</ElDescriptionsItem
          ><ElDescriptionsItem label="環境">{{
            environmentLabel(currentError.environment)
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="錯誤代碼">{{ currentError.errorCode }}</ElDescriptionsItem
          ><ElDescriptionsItem label="發生次數">{{
            currentError.occurrenceCount
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="首次發生">{{
            currentError.firstOccurredAt
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="最近發生">{{
            currentError.lastOccurredAt
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="Trace ID" :span="2">{{
            currentError.traceId
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="處理人員">{{
            currentError.assignee || '未指派'
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="完成時間">{{
            currentError.resolvedAt || '—'
          }}</ElDescriptionsItem
          ><ElDescriptionsItem v-if="currentError.resolution" label="處理結果" :span="2">{{
            currentError.resolution
          }}</ElDescriptionsItem></ElDescriptions
        ><ElForm
          v-if="!['Resolved', 'Ignored'].includes(currentError.status)"
          label-position="top"
          class="resolution-form"
          ><ElFormItem label="指派處理人"
            ><ElSelect v-model="errorForm.assignee" class="full"
              ><ElOption label="Platform SRE" value="Platform SRE" /><ElOption
                label="Service Owner"
                value="Service Owner" /><ElOption
                label="Super Admin"
                value="Super Admin" /></ElSelect></ElFormItem
          ><ElFormItem label="處理說明"
            ><ElInput
              v-model="errorForm.resolution"
              type="textarea"
              :rows="3" /></ElFormItem></ElForm></template
      ><template #footer
        ><div
          v-if="currentError && !['Resolved', 'Ignored'].includes(currentError.status)"
          class="drawer-actions"
          ><ElButton @click="assignError">開始調查</ElButton
          ><ElButton type="info" plain @click="closeError(true)">忽略</ElButton
          ><ElButton type="primary" @click="closeError(false)">標記已解決</ElButton></div
        ></template
      ></ElDrawer
    >
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useApprovalCenterStore } from '@/store/modules/approvalCenter'
  import { usePlatformSystemStore } from '@/store/modules/platformSystem'
  import type { PlatformLoginLogRecord, PlatformSystemErrorRecord } from '@/types/game-provider'

  defineOptions({ name: 'PlatformSystemLogs' })
  const route = useRoute()
  const router = useRouter()
  const store = usePlatformSystemStore()
  const approvalStore = useApprovalCenterStore()
  const mode = computed(() =>
    route.name === 'PlatformApprovalLogs'
      ? 'approvals'
      : route.name === 'PlatformErrorLogs'
        ? 'errors'
        : 'logins'
  )
  const copies = {
    logins: {
      title: '登入紀錄',
      description: '追蹤後台登入、登出、驗證失敗、帳號鎖定與工作階段逾時。',
      rule: '未知帳號、高風險來源與連續失敗紀錄應優先調查，必要時停用帳號或調整 IP 白名單。',
      placeholder: '帳號、IP、地區或裝置',
      metricOne: '登入事件',
      metricOneHint: '目前資料範圍',
      metricTwo: '驗證失敗',
      metricTwoHint: '密碼或 MFA 失敗',
      metricThree: '高風險',
      metricThreeHint: '未知來源或鎖定',
      filterTwo: 'Failed',
      filterThree: 'Locked'
    },
    approvals: {
      title: '審核紀錄',
      description: '集中查詢各業務模組的審核申請、核准、駁回與操作理由。',
      rule: '審核紀錄來自審核中心，僅提供稽核查詢；原始申請內容與狀態仍由審核中心管理。',
      placeholder: '審核單、操作人或原因',
      metricOne: '審核操作',
      metricOneHint: '包含送出與覆核',
      metricTwo: '核准紀錄',
      metricTwoHint: '已通過異動',
      metricThree: '駁回紀錄',
      metricThreeHint: '未通過異動',
      filterTwo: '核准',
      filterThree: '駁回'
    },
    errors: {
      title: '系統異常紀錄',
      description: '追蹤服務異常、錯誤代碼、發生次數、負責人與處理結果。',
      rule: '重大正式環境異常應先確認影響範圍，再指派負責人；不可直接刪除或覆蓋歷史紀錄。',
      placeholder: '服務、錯誤代碼、Trace ID',
      metricOne: '異常總數',
      metricOneHint: '目前資料範圍',
      metricTwo: '處理中',
      metricTwoHint: '新異常與調查中',
      metricThree: '重大未結',
      metricThreeHint: '需立即處理',
      filterTwo: 'Investigating',
      filterThree: 'New'
    }
  }
  const copy = computed(() => copies[mode.value as keyof typeof copies])
  const filters = reactive({ keyword: '', status: '' })
  const loginResults: PlatformLoginLogRecord['result'][] = [
    'Success',
    'Failed',
    'Locked',
    'MFA Failed',
    'Logged Out',
    'Session Expired'
  ]
  const loginRows = computed(() =>
    store.loginLogs.filter(
      (item) =>
        (!filters.status || item.result === filters.status) &&
        (!filters.keyword ||
          `${item.username}${item.displayName || ''}${item.ipAddress}${item.location}${item.device}`
            .toLowerCase()
            .includes(filters.keyword.toLowerCase()))
    )
  )
  const approvalRows = computed(() =>
    approvalStore.logs
      .filter(
        (item) =>
          (!filters.status || item.action === filters.status) &&
          (!filters.keyword ||
            `${item.id}${item.approvalId}${item.operator}${item.reason}`
              .toLowerCase()
              .includes(filters.keyword.toLowerCase()))
      )
      .sort((a, b) => b.time.localeCompare(a.time))
  )
  const errorRows = computed(() =>
    store.systemErrors.filter(
      (item) =>
        (!filters.status || item.status === filters.status) &&
        (!filters.keyword ||
          `${item.id}${item.service}${item.errorCode}${item.traceId}${item.message}`
            .toLowerCase()
            .includes(filters.keyword.toLowerCase()))
    )
  )
  const metricOne = computed(() =>
    mode.value === 'logins'
      ? store.loginLogs.length
      : mode.value === 'approvals'
        ? approvalStore.logs.length
        : store.systemErrors.length
  )
  const metricTwo = computed(() =>
    mode.value === 'logins'
      ? store.failedLoginCount
      : mode.value === 'approvals'
        ? approvalStore.logs.filter((item) => item.action === '核准').length
        : store.openErrorCount
  )
  const metricThree = computed(() =>
    mode.value === 'logins'
      ? store.loginLogs.filter((item) => item.riskLevel === 'High').length
      : mode.value === 'approvals'
        ? approvalStore.logs.filter((item) => item.action === '駁回').length
        : store.criticalErrorCount
  )
  const setSummary = (value: string) => {
    filters.status = value
  }
  const reset = () => {
    filters.keyword = ''
    filters.status = ''
  }
  const loginResultLabel = (value: PlatformLoginLogRecord['result']) =>
    ({
      Success: '登入成功',
      Failed: '登入失敗',
      Locked: '帳號鎖定',
      'MFA Failed': 'MFA 失敗',
      'Logged Out': '主動登出',
      'Session Expired': '工作階段逾時'
    })[value]
  const loginResultType = (value: PlatformLoginLogRecord['result']) =>
    value === 'Success'
      ? 'success'
      : ['Failed', 'Locked', 'MFA Failed'].includes(value)
        ? 'danger'
        : 'info'
  const riskLabel = (value: PlatformLoginLogRecord['riskLevel']) =>
    ({ Normal: '一般', Medium: '中度', High: '高風險' })[value]
  const riskType = (value: PlatformLoginLogRecord['riskLevel']) =>
    value === 'High' ? 'danger' : value === 'Medium' ? 'warning' : 'info'
  const approvalSource = (id: string) => {
    const item = approvalStore.findApproval(id)
    return item ? `${item.sourceName}｜${item.action}` : '—'
  }
  const approvalStatusLabel = (value: string) =>
    ({ Draft: '草稿', Pending: '待審核', Approved: '已核准', Rejected: '已駁回' })[value] || value
  const approvalStatusType = (value: string) =>
    value === 'Approved' ? 'success' : value === 'Rejected' ? 'danger' : 'warning'
  const openApproval = (id: string) => {
    const item = approvalStore.findApproval(id)
    const path =
      item?.status === 'Approved'
        ? '/approvals/approved'
        : item?.status === 'Rejected'
          ? '/approvals/rejected'
          : '/approvals/pending'
    router.push({ path, query: { approvalId: id } })
  }
  const environmentLabel = (value: PlatformSystemErrorRecord['environment']) =>
    ({ Production: '正式環境', Staging: '測試環境', Sandbox: '沙盒環境' })[value]
  const severityLabel = (value: PlatformSystemErrorRecord['severity']) =>
    ({ Info: '資訊', Warning: '警告', Critical: '重大' })[value]
  const severityType = (value: PlatformSystemErrorRecord['severity']) =>
    value === 'Critical' ? 'danger' : value === 'Warning' ? 'warning' : 'info'
  const errorStatusLabel = (value: PlatformSystemErrorRecord['status']) =>
    ({ New: '新異常', Investigating: '調查中', Resolved: '已解決', Ignored: '已忽略' })[value]
  const errorStatusType = (value: PlatformSystemErrorRecord['status']) =>
    value === 'Resolved'
      ? 'success'
      : value === 'New'
        ? 'danger'
        : value === 'Investigating'
          ? 'warning'
          : 'info'
  const selectedLoginId = ref('')
  const loginDrawer = ref(false)
  const currentLogin = computed(() =>
    store.loginLogs.find((item) => item.id === selectedLoginId.value)
  )
  const openLogin = (id: string) => {
    selectedLoginId.value = id
    loginDrawer.value = true
  }
  const selectedErrorId = ref('')
  const errorDrawer = ref(false)
  const currentError = computed(() =>
    store.systemErrors.find((item) => item.id === selectedErrorId.value)
  )
  const errorForm = reactive({ assignee: 'Platform SRE', resolution: '' })
  const openError = (id: string) => {
    selectedErrorId.value = id
    const item = store.systemErrors.find((row) => row.id === id)
    errorForm.assignee = item?.assignee || 'Platform SRE'
    errorForm.resolution = item?.resolution || ''
    errorDrawer.value = true
  }
  const assignError = () => {
    if (!currentError.value) return
    store.investigateError(currentError.value.id, errorForm.assignee)
    ElMessage.success('異常已指派並進入調查')
  }
  const closeError = async (ignored: boolean) => {
    if (!currentError.value || errorForm.resolution.trim().length < 4)
      return ElMessage.warning('請填寫至少 4 個字的處理說明')
    await ElMessageBox.confirm(
      ignored ? '確定將此異常標記為已忽略？' : '確定此異常已完成處理與資料檢查？',
      ignored ? '忽略異常' : '完成異常處理',
      { type: ignored ? 'warning' : 'info' }
    )
    store.closeError(currentError.value.id, errorForm.resolution, ignored)
    ElMessage.success(ignored ? '異常已忽略' : '異常已標記為解決')
  }
</script>

<style scoped>
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid button,
  .summary-grid > div {
    padding: 18px 20px;
    text-align: left;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .summary-grid button {
    cursor: pointer;
  }

  .summary-grid button:hover {
    border-color: var(--el-color-primary);
  }

  .summary-grid span,
  .summary-grid small {
    display: block;
    color: var(--art-gray-600);
  }

  .summary-grid strong {
    display: block;
    margin: 8px 0 4px;
    font-size: 26px;
  }

  .warning {
    color: var(--el-color-warning);
  }

  .danger {
    color: var(--el-color-danger);
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    color: var(--art-gray-600);
  }

  .toolbar > div {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  .toolbar strong {
    font-size: 16px;
    color: var(--art-text-gray-900);
  }

  .link {
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .link strong,
  .link small {
    display: block;
  }

  small {
    color: var(--art-gray-600);
  }

  .arrow {
    display: inline-block;
    margin: 0 6px;
    color: var(--art-gray-600);
  }

  .drawer-status {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .resolution-form {
    margin-top: 22px;
  }

  .full {
    width: 100%;
  }

  .drawer-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 620px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
