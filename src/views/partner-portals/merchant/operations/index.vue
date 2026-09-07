<template>
  <div class="merchant-page">
    <AppPageHeader
      :title="definition.title"
      :description="`${store.merchant?.name || '無可用商戶'} · 本商戶授權範圍`"
      ><template #actions
        ><ElButton v-if="kind === 'access'" type="primary" @click="inviteVisible = true"
          >建立邀請草稿</ElButton
        ></template
      ></AppPageHeader
    >
    <ElAlert :title="definition.note" type="info" :closable="false" />
    <ElTabs v-model="tab"
      ><ElTabPane
        v-for="pane in definition.tabs"
        :key="pane.key"
        :name="pane.key"
        :label="pane.label"
    /></ElTabs>
    <ElCard shadow="never">
      <ScopedTable :key="kind + tab" :rows="rows" :columns="columns" :filter-keys="filterKeys"
        ><template #actions="{ row }"
          ><ElButton link type="primary" @click="open(row.id)">查看</ElButton></template
        ></ScopedTable
      >
    </ElCard>
    <ElDrawer
      class="merchant-drawer"
      :model-value="Boolean(route.query.detail || route.query.snapshot)"
      :title="definition.title + '明細'"
      size="min(760px, 100vw)"
      @close="close"
    >
      <ElEmpty v-if="!selected" description="資料不存在或不在授權範圍" />
      <template v-else>
        <ElDescriptions :column="1" border
          ><ElDescriptionsItem v-for="column in columns" :key="column.key" :label="column.label">{{
            field(selected, column.key)
          }}</ElDescriptionsItem></ElDescriptions
        >
        <template v-if="kind === 'notifications'"
          ><p class="content">{{ notice?.content }}</p
          ><ElTag>{{ notice?.read ? '已讀' : '未讀' }}</ElTag></template
        >
        <template v-if="kind === 'rates'"
          ><p
            >此為已鎖定對外匯率快照。1 USDT = {{ rate?.finalRate }}
            {{ rate?.toCurrency }}；內部來源、調整與備註不對外提供。</p
          ></template
        >
        <template v-if="kind === 'reconciliation' && tab === 'reconciliations' && reconciliation">
          <ElDescriptions :column="1" border>
            <ElDescriptionsItem label="計算版本">{{ reconciliation.version }}</ElDescriptionsItem>
            <ElDescriptionsItem label="計算時間">{{
              reconciliation.calculatedAt
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="結算幣別">{{
              reconciliation.settlementCurrency
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="方向／正式金額">未定案</ElDescriptionsItem>
            <ElDescriptionsItem label="歷史匯率快照"
              ><ElSpace wrap
                ><ElButton
                  v-for="id in reconciliation.rateSnapshotIds"
                  :key="id"
                  link
                  type="primary"
                  @click="
                    router.push({
                      path: '/merchant/reports/exchange-rates',
                      query: { snapshot: id }
                    })
                  "
                  >{{ id }}</ElButton
                ></ElSpace
              ><span v-if="!reconciliation.rateSnapshotIds.length">未提供</span></ElDescriptionsItem
            >
          </ElDescriptions>
          <ElAlert :title="reconciliation.confirmationBlock" type="warning" :closable="false" />
          <ElButton disabled>確認此版本</ElButton>
          <h3>{{ reconciliation.lockedAt ? '提出更正申請' : '回報差異' }}</h3>
          <ElForm label-position="top" @submit.prevent="reportDifference">
            <ElFormItem label="關聯交易／局號"
              ><ElInput v-model="difference.reference"
            /></ElFormItem>
            <ElFormItem label="爭議幣別"
              ><ElSelect v-model="difference.currency"
                ><ElOption
                  v-for="currency in [
                    ...new Set([reconciliation.currency, reconciliation.settlementCurrency])
                  ]"
                  :key="currency"
                  :label="currency"
                  :value="currency" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="爭議金額"
              ><ElInputNumber
                v-model="difference.amount"
                :precision="precision(difference.currency)"
            /></ElFormItem>
            <ElFormItem label="說明"
              ><ElInput v-model="difference.reason" type="textarea"
            /></ElFormItem>
            <p>附件上傳服務尚未接入；此處保存文字回報及指定版本，不修改原交易。</p>
            <ElButton type="primary" native-type="submit">建立原型差異申請</ElButton>
          </ElForm>
          <ScopedTable
            :rows="
              store.requests.filter(
                (item) => item.category === '差異' && item.target === reconciliation!.id
              )
            "
            :columns="requestColumns"
          />
        </template>
        <template v-if="kind === 'jackpots' && tab === 'pools'"
          ><ElForm label-position="top" @submit.prevent="requestPool"
            ><ElFormItem label="申請目標與原因"
              ><ElInput v-model="poolReason" type="textarea" /></ElFormItem
            ><ElButton native-type="submit">參與變更申請</ElButton></ElForm
          ></template
        >
        <template v-if="kind === 'access' && tab === 'staff'"
          ><ElAlert
            title="角色權限矩陣、員工線路授權與敏感操作流程待確認；目前不開放修改或停用示範會話。"
            type="warning"
            :closable="false"
        /></template>
      </template>
    </ElDrawer>
    <ElDialog v-model="inviteVisible" title="建立本商戶邀請草稿" width="min(520px, 94vw)"
      ><ElForm label-position="top" @submit.prevent="invite"
        ><ElFormItem label="姓名"><ElInput v-model="inviteForm.name" /></ElFormItem
        ><ElFormItem label="工作帳號"><ElInput v-model="inviteForm.account" /></ElFormItem
        ><p>僅建立草稿，不寄信、不核發角色或線路權限。</p
        ><ElButton type="primary" native-type="submit">保存草稿</ElButton></ElForm
      ></ElDialog
    >
  </div>
</template>
<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import ScopedTable from '../components/ScopedTable.vue'
  import { useMerchantPortalStore } from '@/store/modules/merchantPortal'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import { latestPublishedRates } from '@/utils/referenceConversion'
  import { merchantField } from '@/utils/merchantDisplay'
  const store = useMerchantPortalStore(),
    settings = useFinanceSettingsStore(),
    route = useRoute(),
    router = useRouter()
  const field = (row: object, key: string) =>
    merchantField(
      row,
      key,
      (currency) => settings.currencies.find((item) => item.code === currency)?.decimalPlaces ?? 2
    )
  type Kind = 'rates' | 'reconciliation' | 'jackpots' | 'notifications' | 'access'
  const kind = computed<Kind>(() =>
    route.path.includes('exchange-rates') ? 'rates' : (route.path.split('/')[2] as Kind)
  )
  const definitions = {
    rates: {
      title: '匯率報表',
      note: '唯讀正式適用匯率與每日歷史；正式結算使用當期保存快照。',
      tabs: [
        { key: 'current', label: '最新正式匯率' },
        { key: 'history', label: '匯率歷史' }
      ]
    },
    reconciliation: {
      title: '對帳／結算',
      note: '僅本商戶及授權線路單據。確認層級與結算公式尚待確認；已鎖定不代表付款。',
      tabs: [
        { key: 'reconciliations', label: '對帳單' },
        { key: 'differences', label: '差異處理' },
        { key: 'statements', label: '結算單' },
        { key: 'requests', label: '差異／更正申請' }
      ]
    },
    jackpots: {
      title: '獎池',
      note: '僅本商戶授權線路參與與自身流水、派發。共享水位公開規則待確認。',
      tabs: [
        { key: 'pools', label: '參與獎池' },
        { key: 'contributions', label: '自身流水' },
        { key: 'payouts', label: '自身派發' },
        { key: 'requests', label: '申請紀錄' }
      ]
    },
    notifications: {
      title: '公告通知',
      note: '本站示範公告及本商戶申請通知；已讀不代表接受商務條件。',
      tabs: [
        { key: 'notices', label: '全部通知' },
        { key: 'unread', label: '未讀通知' }
      ]
    },
    access: {
      title: '帳號與權限',
      note: '本商戶工作帳號。細粒度角色與員工線路權限仍待確認，邀請只保存草稿。',
      tabs: [
        { key: 'staff', label: '人員管理' },
        { key: 'permissions', label: '權限範圍' },
        { key: 'logs', label: '操作紀錄' }
      ]
    }
  }
  const definition = computed(() => definitions[kind.value])
  const tab = ref(definition.value.tabs[0].key)
  watch(kind, () => {
    tab.value = definition.value.tabs[0].key
  })
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
  const currentRates = computed(() => [...latestPublishedRates(store.rates, today).values()])
  const permissionRows = computed(() => [
    { id: 'scope', item: '商戶邊界', value: store.merchant?.code || '無可用範圍' },
    {
      id: 'lines',
      item: '示範會話授權線路',
      value: store.lines.map((item) => item.uid).join('、') || '無可用範圍'
    },
    { id: 'roles', item: '角色／欄位／員工線路配置', value: '待確認，未開放授權變更' },
    { id: 'secrets', item: '金鑰取得／重設', value: '待確認，未開放' }
  ])
  const rows = computed<object[]>(() => {
    if (kind.value === 'rates') return tab.value === 'current' ? currentRates.value : store.rates
    if (kind.value === 'notifications')
      return store.notices.filter((item) => tab.value !== 'unread' || !item.read)
    if (kind.value === 'access')
      return tab.value === 'staff'
        ? store.staff
        : tab.value === 'logs'
          ? store.logs
          : permissionRows.value
    if (tab.value === 'requests')
      return store.requests.filter(
        (item) => item.category === (kind.value === 'jackpots' ? '獎池' : '差異')
      )
    if (kind.value === 'jackpots')
      return tab.value === 'pools'
        ? store.pools
        : tab.value === 'contributions'
          ? store.contributions
          : store.payouts
    return tab.value === 'reconciliations'
      ? store.reconciliations
      : tab.value === 'differences'
        ? store.differences
        : store.statements
  })
  const c = (key: string, label: string, width = 150) => ({ key, label, width })
  const requestColumns = [
    c('id', '申請編號', 250),
    c('target', '對象'),
    c('action', '類型'),
    c('proposed', '回報內容'),
    c('reason', '原因'),
    c('status', '審核狀態'),
    c('execution', '執行狀態'),
    c('createdAt', '建立時間')
  ]
  const columns = computed(() => {
    if (kind.value === 'rates')
      return [
        c('date', '匯率日期'),
        c('fromCurrency', '基準幣別'),
        c('toCurrency', '對應幣別'),
        c('finalRate', '1 USDT 對應匯率'),
        c('settingVersion', '設定版本'),
        c('lockedAt', '鎖定時間'),
        c('id', '快照編號', 250)
      ]
    if (kind.value === 'notifications')
      return [c('title', '標題', 280), c('type', '類型'), c('time', '發布時間'), c('read', '已讀')]
    if (kind.value === 'access')
      return tab.value === 'staff'
        ? [c('name', '姓名'), c('account', '工作帳號'), c('role', '角色'), c('status', '狀態')]
        : tab.value === 'logs'
          ? [c('time', '時間'), c('action', '操作'), c('target', '對象'), c('result', '結果')]
          : [c('item', '項目'), c('value', '目前範圍', 300)]
    if (tab.value === 'requests') return requestColumns
    if (kind.value === 'jackpots')
      return tab.value === 'pools'
        ? [
            c('name', '獎池'),
            c('lineUid', '線路', 220),
            c('currency', '幣別'),
            c('status', '參與狀態'),
            c('effectiveAt', '生效時間'),
            c('sharedBalance', '共享水位', 240)
          ]
        : [
            c('id', '編號'),
            c('poolId', '獎池'),
            c('type', '類型'),
            c('currency', '原幣'),
            c('amount', '金額'),
            c('status', '狀態'),
            c('time', '時間')
          ]
    return tab.value === 'reconciliations'
      ? [
          c('id', '對帳編號', 220),
          c('lineUid', '線路', 220),
          c('period', '期間'),
          c('currency', '原幣'),
          c('betAmount', '投注'),
          c('payoutAmount', '派彩'),
          c('status', '對帳狀態'),
          c('unresolved', '未解差異'),
          c('lockedAt', '鎖定時間')
        ]
      : tab.value === 'differences'
        ? [
            c('id', '差異編號'),
            c('reconciliationId', '對帳單'),
            c('type', '類型'),
            c('currency', '原幣'),
            c('differenceAmount', '差異金額'),
            c('status', '狀態'),
            c('resolution', '處理結果')
          ]
        : [
            c('id', '結算單'),
            c('reconciliationId', '對帳單'),
            c('period', '期間'),
            c('currency', '結算幣'),
            c('status', '狀態'),
            c('amount', '正式金額')
          ]
  })
  const filterKeys = computed(() =>
    columns.value
      .filter((item) =>
        ['currency', 'status', 'lineUid', 'toCurrency', 'date', 'type'].includes(item.key)
      )
      .map((item) => item.key)
  )
  const selectedId = computed(() => String(route.query.detail || route.query.snapshot || ''))
  const selected = computed(() =>
    (kind.value === 'rates'
      ? store.rates
      : kind.value === 'notifications'
        ? store.notices
        : rows.value
    ).find((item) => (item as { id: string }).id === selectedId.value)
  )
  const notice = computed(() => store.notices.find((item) => item.id === selectedId.value))
  const rate = computed(() => store.rates.find((item) => item.id === selectedId.value))
  const reconciliation = computed(() =>
    store.reconciliations.find((item) => item.id === selectedId.value)
  )
  const difference = reactive({ reference: '', currency: '', amount: 0, reason: '' })
  // Capture when opening, never silently adopt a version changed while editing.
  const differenceVersion = ref('')
  const differenceLocked = ref(false)
  watch(
    selectedId,
    () => {
      const record = reconciliation.value
      differenceVersion.value = record?.version || ''
      differenceLocked.value = Boolean(record?.lockedAt)
      Object.assign(difference, {
        reference: '',
        currency: record?.currency || '',
        amount: 0,
        reason: ''
      })
    },
    { immediate: true }
  )
  const poolReason = ref(''),
    inviteVisible = ref(false),
    inviteForm = reactive({ name: '', account: '' })
  const precision = (currency: string) =>
    settings.currencies.find((item) => item.code === currency)?.decimalPlaces ?? 2
  function open(id: string) {
    router.replace({ query: { detail: id } })
    if (kind.value === 'notifications') store.markNoticeRead(id)
    Object.assign(difference, {
      reference: '',
      currency: store.reconciliations.find((item) => item.id === id)?.currency || '',
      amount: 0,
      reason: ''
    })
    poolReason.value = ''
  }
  function close() {
    router.replace({ query: {} })
  }
  function reportDifference() {
    const record = reconciliation.value
    if (
      record &&
      (record.version !== differenceVersion.value ||
        Boolean(record.lockedAt) !== differenceLocked.value)
    )
      return ElMessage.error('對帳版本或鎖定狀態已變更，請關閉並重新開啟明細後再回報')
    if (
      !record ||
      !difference.reference.trim() ||
      !Number.isFinite(difference.amount) ||
      ![record.currency, record.settlementCurrency].includes(difference.currency)
    )
      return ElMessage.error('請填寫關聯參照、金額與正確幣別')
    const response = store.submitRequest({
      category: '差異',
      target: record.id,
      action: record.lockedAt ? '更正申請' : '回報對帳差異',
      reason: difference.reason,
      expectedVersion: differenceVersion.value,
      proposed: JSON.stringify({ ...difference, version: differenceVersion.value })
    })
    ElMessage[response.ok ? 'success' : 'error'](response.message)
  }
  function requestPool() {
    const response = store.submitRequest({
      category: '獎池',
      target: selectedId.value,
      action: '獎池參與變更申請',
      proposed: poolReason.value,
      reason: poolReason.value
    })
    ElMessage[response.ok ? 'success' : 'error'](response.message)
  }
  function invite() {
    const response = store.inviteDraft(inviteForm.name, inviteForm.account)
    ElMessage[response.ok ? 'success' : 'error'](response.message)
    if (response.ok) {
      inviteVisible.value = false
      inviteForm.name = ''
      inviteForm.account = ''
    }
  }
</script>
<style scoped>
  .merchant-page {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .merchant-page :deep(.el-descriptions),
  .merchant-page :deep(.el-alert) {
    margin-bottom: 16px;
  }

  .content {
    margin: 16px 0;
    white-space: pre-wrap;
  }
</style>
