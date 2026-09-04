<template>
  <div class="page">
    <AppPageHeader
      :title="mode === 'rules' ? '通知規則' : '通知紀錄'"
      eyebrow="平台管理 · 通知管理"
      :description="
        mode === 'rules'
          ? '設定業務事件的接收角色、通知管道、彙整頻率與靜默時段。'
          : '查詢每次通知的觸發來源、收件對象、管道結果及失敗原因。'
      "
    >
      <template #actions
        ><ElButton @click="ElMessage.success('通知資料已匯出')">匯出</ElButton
        ><ElButton v-if="mode === 'rules'" type="primary" @click="openRule()"
          >新增通知規則</ElButton
        ></template
      >
    </AppPageHeader>

    <div class="summary-grid"
      ><button type="button" @click="setFilter('')"
        ><span>通知規則</span><strong>{{ store.rules.length }}</strong
        ><small>{{ store.enabledRules.length }} 個啟用中</small></button
      ><button type="button" @click="setFilter('Sent')"
        ><span>發送成功</span><strong>{{ statusCount('Sent') }}</strong
        ><small>所有管道成功</small></button
      ><button type="button" @click="setFilter('Partial')"
        ><span>部分成功</span><strong class="warning">{{ statusCount('Partial') }}</strong
        ><small>部分管道需重送</small></button
      ><button type="button" @click="setFilter('Failed')"
        ><span>發送失敗</span><strong class="danger">{{ statusCount('Failed') }}</strong
        ><small>等待人工處理</small></button
      ></div
    >

    <ElAlert
      v-if="mode === 'rules'"
      title="通知規則只負責傳遞事件，不會自動核准申請、關閉告警或修改原始業務資料。"
      type="info"
      :closable="false"
      show-icon
    /><ElAlert
      v-else
      title="重送只處理失敗的通知管道，不會重新觸發原始業務事件。"
      type="warning"
      :closable="false"
      show-icon
    />

    <ElCard shadow="never" class="filter-card"
      ><ElForm inline
        ><ElFormItem label="關鍵字"
          ><ElInput
            v-model="filters.keyword"
            clearable
            :placeholder="mode === 'rules' ? '規則名稱' : '通知、來源或收件角色'" /></ElFormItem
        ><ElFormItem label="事件類型"
          ><ElSelect v-model="filters.eventType" clearable placeholder="全部事件"
            ><ElOption
              v-for="item in eventTypes"
              :key="item"
              :label="eventLabel(item)"
              :value="item" /></ElSelect></ElFormItem
        ><ElFormItem v-if="mode === 'logs'" label="狀態"
          ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
            ><ElOption label="待發送" value="Pending" /><ElOption
              label="發送成功"
              value="Sent" /><ElOption label="部分成功" value="Partial" /><ElOption
              label="發送失敗"
              value="Failed" /><ElOption
              label="靜默延後"
              value="Suppressed" /></ElSelect></ElFormItem
        ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem></ElForm
      ></ElCard
    >

    <ElCard v-if="mode === 'rules'" shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>規則清單</strong><span>共 {{ ruleRows.length }} 筆</span></div
        ><span>重大風控與帳號安全事件不受靜默時段限制</span></div
      ><ElTable :data="ruleRows" border row-key="id"
        ><ElTableColumn label="規則" min-width="230" fixed="left"
          ><template #default="scope"
            ><button class="link" type="button" @click="openRule(scope.row)"
              ><strong>{{ scope.row.name }}</strong
              ><small>{{ scope.row.id }}</small></button
            ></template
          ></ElTableColumn
        ><ElTableColumn label="事件類型" min-width="160"
          ><template #default="scope"
            ><ElTag effect="plain">{{ eventLabel(scope.row.eventType) }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="等級" width="100"
          ><template #default="scope"
            ><ElTag :type="severityType(scope.row.severity)">{{
              severityLabel(scope.row.severity)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn label="接收角色" min-width="210"
          ><template #default="scope"
            ><span class="tag-list"
              ><ElTag
                v-for="roleId in scope.row.roleIds"
                :key="roleId"
                type="info"
                effect="plain"
                >{{ roleName(roleId) }}</ElTag
              ></span
            ></template
          ></ElTableColumn
        ><ElTableColumn label="通知管道" min-width="180"
          ><template #default="scope"
            ><span class="channel-list"
              ><span v-for="channel in scope.row.channels" :key="channel"
                ><ArtSvgIcon :icon="channelIcon(channel)" />{{ channelLabel(channel) }}</span
              ></span
            ></template
          ></ElTableColumn
        ><ElTableColumn label="彙整／靜默" min-width="160"
          ><template #default="scope"
            >{{
              scope.row.aggregationMinutes
                ? `${scope.row.aggregationMinutes} 分鐘彙整`
                : '即時通知'
            }}<br /><small>{{
              scope.row.quietHoursEnabled
                ? `${scope.row.quietHoursStart}–${scope.row.quietHoursEnd}`
                : '不設靜默時段'
            }}</small></template
          ></ElTableColumn
        ><ElTableColumn label="觸發" width="90" align="center"
          ><template #default="scope">{{ scope.row.triggerCount }}</template></ElTableColumn
        ><ElTableColumn label="啟用" width="90" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.enabled"
              @change="toggleRule(scope.row.id, $event)" /></template></ElTableColumn
        ><ElTableColumn label="操作" width="150" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openRule(scope.row)">編輯</ElButton
            ><ElButton link @click="testRule(scope.row.id)">測試</ElButton></template
          ></ElTableColumn
        ></ElTable
      ></ElCard
    >

    <ElCard v-else shadow="never" class="table-card"
      ><div class="toolbar"
        ><div
          ><strong>發送紀錄</strong><span>共 {{ logRows.length }} 筆</span></div
        ><span>每個管道皆保留獨立結果</span></div
      ><ElTable :data="logRows" border row-key="id"
        ><ElTableColumn label="通知" min-width="260" fixed="left"
          ><template #default="scope"
            ><button class="link" type="button" @click="openLog(scope.row.id)"
              ><strong>{{ scope.row.subject }}</strong
              ><small>{{ scope.row.id }} · {{ scope.row.triggeredAt }}</small></button
            ></template
          ></ElTableColumn
        ><ElTableColumn label="事件來源" min-width="190"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openSource(scope.row)">{{
              scope.row.eventSourceId
            }}</ElButton
            ><br /><small>{{ eventLabel(scope.row.eventType) }}</small></template
          ></ElTableColumn
        ><ElTableColumn label="收件角色" min-width="180"
          ><template #default="scope">{{
            scope.row.recipients.join('、')
          }}</template></ElTableColumn
        ><ElTableColumn label="通知管道" min-width="170"
          ><template #default="scope"
            ><span class="channel-list"
              ><span v-for="channel in scope.row.channels" :key="channel"
                ><ArtSvgIcon :icon="channelIcon(channel)" />{{ channelLabel(channel) }}</span
              ></span
            ></template
          ></ElTableColumn
        ><ElTableColumn label="狀態" width="110"
          ><template #default="scope"
            ><ElTag :type="statusType(scope.row.status)">{{
              statusLabel(scope.row.status)
            }}</ElTag></template
          ></ElTableColumn
        ><ElTableColumn prop="attempts" label="嘗試次數" width="95" align="center" /><ElTableColumn
          prop="sentAt"
          label="完成時間"
          min-width="165"
          ><template #default="scope">{{ scope.row.sentAt || '—' }}</template></ElTableColumn
        ><ElTableColumn label="操作" width="120" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openLog(scope.row.id)">查看</ElButton
            ><ElButton
              v-if="['Failed', 'Partial'].includes(scope.row.status)"
              link
              type="warning"
              @click="retry(scope.row.id)"
              >重送</ElButton
            ></template
          ></ElTableColumn
        ></ElTable
      ></ElCard
    >

    <ElDialog
      v-model="ruleDialog"
      :title="ruleForm.id ? '編輯通知規則' : '新增通知規則'"
      width="min(720px, 94vw)"
      ><ElForm label-position="top"
        ><ElFormItem label="規則名稱" required><ElInput v-model="ruleForm.name" /></ElFormItem
        ><div class="form-grid"
          ><ElFormItem label="事件類型" required
            ><ElSelect v-model="ruleForm.eventType" class="full"
              ><ElOption
                v-for="item in eventTypes"
                :key="item"
                :label="eventLabel(item)"
                :value="item" /></ElSelect></ElFormItem
          ><ElFormItem label="通知等級" required
            ><ElSelect v-model="ruleForm.severity" class="full"
              ><ElOption label="資訊" value="Info" /><ElOption
                label="警告"
                value="Warning" /><ElOption
                label="重大"
                value="Critical" /></ElSelect></ElFormItem></div
        ><ElFormItem label="接收角色" required
          ><ElSelect v-model="ruleForm.roleIds" multiple class="full"
            ><ElOption
              v-for="item in accessStore.roles"
              :key="item.id"
              :label="`${item.name}｜${item.code}`"
              :value="item.id" /></ElSelect></ElFormItem
        ><ElFormItem label="通知管道" required
          ><ElCheckboxGroup v-model="ruleForm.channels"
            ><ElCheckbox value="In-App">站內通知</ElCheckbox
            ><ElCheckbox value="Email">Email</ElCheckbox
            ><ElCheckbox value="Webhook">Webhook</ElCheckbox></ElCheckboxGroup
          ></ElFormItem
        ><div class="form-grid"
          ><ElFormItem label="彙整時間"
            ><ElInputNumber
              v-model="ruleForm.aggregationMinutes"
              :min="0"
              :max="1440"
              class="full"
            /><small>0 代表即時發送</small></ElFormItem
          ><ElFormItem label="靜默時段"
            ><ElSwitch v-model="ruleForm.quietHoursEnabled" /><div
              v-if="ruleForm.quietHoursEnabled"
              class="quiet-hours"
              ><ElTimeSelect
                v-model="ruleForm.quietHoursStart"
                start="00:00"
                step="00:30"
                end="23:30" /><span>至</span
              ><ElTimeSelect
                v-model="ruleForm.quietHoursEnd"
                start="00:00"
                step="00:30"
                end="23:30" /></div></ElFormItem></div
        ><ElFormItem label="通知範本" required
          ><ElInput v-model="ruleForm.template" type="textarea" :rows="3" /><small
            >可使用事件提供的 {{ '{' }}{變數名稱}{{ '}' }}。</small
          ></ElFormItem
        ></ElForm
      ><template #footer
        ><ElButton @click="ruleDialog = false">取消</ElButton
        ><ElButton type="primary" @click="saveRule">儲存規則</ElButton></template
      ></ElDialog
    >

    <ElDrawer
      v-model="logDrawer"
      :title="currentLog ? `通知紀錄｜${currentLog.id}` : '通知紀錄'"
      size="min(720px, 94vw)"
      ><template v-if="currentLog"
        ><div class="drawer-head"
          ><ElTag :type="statusType(currentLog.status)">{{ statusLabel(currentLog.status) }}</ElTag
          ><strong>{{ currentLog.subject }}</strong
          ><p>{{ currentLog.summary }}</p></div
        ><ElDescriptions :column="2" border
          ><ElDescriptionsItem label="事件類型">{{
            eventLabel(currentLog.eventType)
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="事件來源"
            ><ElButton link type="primary" @click="openSource(currentLog)">{{
              currentLog.eventSourceId
            }}</ElButton></ElDescriptionsItem
          ><ElDescriptionsItem label="觸發時間">{{ currentLog.triggeredAt }}</ElDescriptionsItem
          ><ElDescriptionsItem label="完成時間">{{ currentLog.sentAt || '—' }}</ElDescriptionsItem
          ><ElDescriptionsItem label="收件角色" :span="2">{{
            currentLog.recipients.join('、')
          }}</ElDescriptionsItem
          ><ElDescriptionsItem v-if="currentLog.errorMessage" label="錯誤訊息" :span="2"
            ><span class="danger">{{ currentLog.errorMessage }}</span></ElDescriptionsItem
          ></ElDescriptions
        ><h3>管道結果</h3
        ><div class="result-list"
          ><div v-for="result in currentLog.channelResults" :key="result.channel"
            ><span
              ><ArtSvgIcon :icon="channelIcon(result.channel)" /><strong>{{
                channelLabel(result.channel)
              }}</strong></span
            ><span
              ><ElTag
                :type="
                  result.status === 'Sent'
                    ? 'success'
                    : result.status === 'Failed'
                      ? 'danger'
                      : 'info'
                "
                >{{
                  result.status === 'Sent' ? '成功' : result.status === 'Failed' ? '失敗' : '延後'
                }}</ElTag
              ><small>{{ result.message }}</small></span
            ></div
          ></div
        ></template
      ><template #footer
        ><ElButton
          v-if="currentLog && ['Failed', 'Partial'].includes(currentLog.status)"
          type="primary"
          @click="retry(currentLog.id)"
          >重新發送失敗管道</ElButton
        ></template
      ></ElDrawer
    >
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { usePlatformAccessStore } from '@/store/modules/platformAccess'
  import { usePlatformNotificationStore } from '@/store/modules/platformNotification'
  import type {
    PlatformNotificationChannel,
    PlatformNotificationEventType,
    PlatformNotificationLogRecord,
    PlatformNotificationRuleRecord,
    PlatformNotificationStatus
  } from '@/types/game-provider'

  defineOptions({ name: 'PlatformNotificationManagement' })
  const route = useRoute()
  const router = useRouter()
  const store = usePlatformNotificationStore()
  const accessStore = usePlatformAccessStore()
  const mode = computed(() => (route.name === 'PlatformNotificationLogs' ? 'logs' : 'rules'))
  const eventTypes: PlatformNotificationEventType[] = [
    'Risk Alert',
    'Approval Pending',
    'Exchange Rate Alert',
    'Settlement Status',
    'Account Security',
    'System Error'
  ]
  const filters = reactive({ keyword: '', eventType: '', status: '' })
  const ruleRows = computed(() =>
    store.rules.filter(
      (item) =>
        (!filters.eventType || item.eventType === filters.eventType) &&
        (!filters.keyword || item.name.toLowerCase().includes(filters.keyword.toLowerCase()))
    )
  )
  const logRows = computed(() =>
    store.logs.filter(
      (item) =>
        (!filters.eventType || item.eventType === filters.eventType) &&
        (!filters.status || item.status === filters.status) &&
        (!filters.keyword ||
          `${item.subject}${item.eventSourceId}${item.recipients.join('')}`
            .toLowerCase()
            .includes(filters.keyword.toLowerCase()))
    )
  )
  const statusCount = (status: PlatformNotificationStatus) =>
    store.logs.filter((item) => item.status === status).length
  const setFilter = (status: string) => {
    if (mode.value === 'logs') filters.status = status
  }
  const reset = () => {
    filters.keyword = ''
    filters.eventType = ''
    filters.status = ''
  }
  const eventLabel = (event: PlatformNotificationEventType) =>
    ({
      'Risk Alert': '風控告警',
      'Approval Pending': '審核待辦',
      'Exchange Rate Alert': '匯率預警',
      'Settlement Status': '結算狀態',
      'Account Security': '帳號安全',
      'System Error': '系統異常'
    })[event]
  const channelLabel = (channel: PlatformNotificationChannel) =>
    ({ 'In-App': '站內', Email: 'Email', Webhook: 'Webhook' })[channel]
  const channelIcon = (channel: PlatformNotificationChannel) =>
    ({ 'In-App': 'ri:notification-3-line', Email: 'ri:mail-line', Webhook: 'ri:webhook-line' })[
      channel
    ]
  const severityLabel = (severity: PlatformNotificationRuleRecord['severity']) =>
    ({ Info: '資訊', Warning: '警告', Critical: '重大' })[severity]
  const severityType = (severity: PlatformNotificationRuleRecord['severity']) =>
    severity === 'Critical' ? 'danger' : severity === 'Warning' ? 'warning' : 'info'
  const statusLabel = (status: PlatformNotificationStatus) =>
    ({
      Pending: '待發送',
      Sent: '成功',
      Partial: '部分成功',
      Failed: '失敗',
      Suppressed: '靜默延後'
    })[status]
  const statusType = (status: PlatformNotificationStatus) =>
    status === 'Sent'
      ? 'success'
      : status === 'Failed'
        ? 'danger'
        : status === 'Partial'
          ? 'warning'
          : 'info'
  const roleName = (id: string) => accessStore.roles.find((item) => item.id === id)?.name || id
  const toggleRule = (id: string, value: string | number | boolean) => {
    store.toggleRule(id, Boolean(value))
    ElMessage.success('通知規則狀態已更新')
  }
  const ruleDialog = ref(false)
  const ruleForm = reactive({
    id: '',
    name: '',
    eventType: 'Risk Alert' as PlatformNotificationEventType,
    severity: 'Warning' as PlatformNotificationRuleRecord['severity'],
    roleIds: [] as string[],
    channels: ['In-App'] as PlatformNotificationChannel[],
    aggregationMinutes: 0,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    template: '',
    enabled: true
  })
  const openRule = (item?: PlatformNotificationRuleRecord) => {
    Object.assign(
      ruleForm,
      item
        ? { ...item, roleIds: [...item.roleIds], channels: [...item.channels] }
        : {
            id: '',
            name: '',
            eventType: 'Risk Alert',
            severity: 'Warning',
            roleIds: ['ROLE-004'],
            channels: ['In-App'],
            aggregationMinutes: 0,
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            template: '',
            enabled: true
          }
    )
    ruleDialog.value = true
  }
  const saveRule = () => {
    if (
      !ruleForm.name.trim() ||
      !ruleForm.roleIds.length ||
      !ruleForm.channels.length ||
      !ruleForm.template.trim()
    )
      return ElMessage.warning('請完整填寫通知規則')
    store.saveRule({
      ...ruleForm,
      roleIds: [...ruleForm.roleIds],
      channels: [...ruleForm.channels]
    })
    ruleDialog.value = false
    ElMessage.success('通知規則已儲存')
  }
  const testRule = async (id: string) => {
    await ElMessageBox.confirm(
      '測試通知會依規則發送至目前登入帳號，不影響正式收件人。',
      '發送測試通知',
      { type: 'info' }
    )
    store.sendTest(id)
    ElMessage.success('測試通知已發送，可至通知紀錄查看')
  }
  const selectedLogId = ref('')
  const logDrawer = ref(false)
  const currentLog = computed(() => store.logs.find((item) => item.id === selectedLogId.value))
  const openLog = (id: string) => {
    selectedLogId.value = id
    logDrawer.value = true
  }
  const retry = async (id: string) => {
    await ElMessageBox.confirm('只會重送失敗的通知管道，不會重新觸發業務事件。', '重新發送通知', {
      type: 'warning'
    })
    store.retryNotification(id)
    ElMessage.success('通知已重新發送')
  }
  const openSource = (item: PlatformNotificationLogRecord) => {
    const routeMap: Record<PlatformNotificationEventType, string> = {
      'Risk Alert': '/risk/alerts',
      'Approval Pending': '/approvals/pending',
      'Exchange Rate Alert': '/finance-settings/exchange-rates/alerts',
      'Settlement Status': '/finance/settlement/batches',
      'Account Security': '/platform/access/accounts',
      'System Error': '/platform/logs/errors'
    }
    const queryKey =
      item.eventType === 'Risk Alert'
        ? 'alertId'
        : item.eventType === 'Approval Pending'
          ? 'approvalId'
          : ''
    router.push({
      path: routeMap[item.eventType],
      query: queryKey ? { [queryKey]: item.eventSourceId } : undefined
    })
  }
</script>

<style scoped lang="scss">
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

    button {
      padding: 18px 20px;
      text-align: left;
      cursor: pointer;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 10px;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    span,
    small {
      display: block;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 8px 0 4px;
      font-size: 26px;
    }
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

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
      color: var(--art-text-gray-900);
    }
  }

  .link {
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;

    strong,
    small {
      display: block;
    }
  }

  small {
    color: var(--art-gray-600);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .channel-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 12px;

    span {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      white-space: nowrap;
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .full {
    width: 100%;
  }

  .quiet-hours {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  }

  .drawer-head {
    margin-bottom: 18px;

    > strong {
      display: block;
      margin-top: 12px;
      font-size: 18px;
    }

    p {
      color: var(--art-gray-600);
    }
  }

  h3 {
    margin: 22px 0 12px;
  }

  .result-list {
    display: flex;
    flex-direction: column;
    gap: 10px;

    > div {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 14px;
      border: 1px solid var(--art-border-color);
      border-radius: 8px;
    }

    span {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    small {
      margin-left: 8px;
    }
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 620px) {
    .summary-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar,
    .result-list > div {
      flex-direction: column;
      align-items: flex-start;
    }

    .quiet-hours {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
