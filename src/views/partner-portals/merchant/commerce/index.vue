<template>
  <div class="merchant-page">
    <AppPageHeader
      :title="title"
      :description="`${store.merchant?.name || '無可用商戶'} · 本商戶授權線路`"
    >
      <template #actions
        ><ElButton
          v-if="kind === 'lines'"
          type="primary"
          :disabled="!store.merchant"
          @click="request('NEW', '新增線路')"
          >申請幣別線路</ElButton
        ></template
      >
    </AppPageHeader>
    <ElTabs v-model="tab">
      <ElTabPane
        :label="kind === 'games' ? '可合作遊戲' : kind === 'lines' ? '線路清單' : '環境與憑證狀態'"
        name="list"
      />
      <ElTabPane v-if="kind === 'games'" label="已開通遊戲" name="enabled" />
      <ElTabPane v-if="kind === 'integrations'" label="文件與測試紀錄" name="tests" />
      <ElTabPane v-if="kind === 'lines'" label="申請紀錄" name="requests" />
    </ElTabs>
    <ElAlert v-if="kind === 'integrations' && route.query.line" type="info" :closable="false">
      目前限定線路：{{ route.query.line }}
      <ElButton link type="primary" @click="router.replace({ query: {} })"
        >查看全部授權線路</ElButton
      >
    </ElAlert>
    <ElAlert
      v-if="kind === 'integrations'"
      title="串接中心僅供資訊與狀態查看。金鑰取得／重設流程待確認，暫未開放操作。"
      type="info"
      :closable="false"
    />
    <ElAlert
      v-if="kind === 'games'"
      title="可依幣別線路選擇總後台限紅方案；RTP 與其他遊戲資料唯讀。"
      type="info"
      :closable="false"
    />
    <ElCard shadow="never">
      <template v-if="tab === 'tests'">
        <ElDescriptions title="串接文件" :column="1" border>
          <ElDescriptionsItem label="版本">各環境 API／簽章版本請見環境明細</ElDescriptionsItem>
          <ElDescriptionsItem label="文件連結">來源尚未提供核准公開文件連結</ElDescriptionsItem>
          <ElDescriptionsItem label="主動測試"
            >固定 Sandbox 測試端點與測試身分未提供，目前不執行測試</ElDescriptionsItem
          >
          <ElDescriptionsItem label="跳轉追蹤">來源尚未提供可公開的跳轉紀錄</ElDescriptionsItem>
        </ElDescriptions>
        <ScopedTable
          :rows="
            store.integrationTests.filter(
              (item) => !route.query.line || item.lineUid === route.query.line
            )
          "
          :columns="testColumns"
        />
      </template>
      <ScopedTable
        v-else-if="kind === 'lines' && tab === 'requests'"
        :rows="[
          ...store.lineApplications,
          ...store.requests.filter((item) => item.category === category)
        ]"
        :columns="requestColumns"
      />
      <ScopedTable
        v-else
        :key="kind + tab"
        :rows="rows"
        :columns="columns"
        :filter-keys="
          kind === 'games'
            ? ['type', 'status']
            : kind === 'lines'
              ? ['currency', 'status', 'environment']
              : ['lineUid', 'environment', 'status']
        "
        ><template #actions="{ row }"
          ><ElButton link type="primary" @click="showDetail(row.id)">查看</ElButton></template
        ></ScopedTable
      >
    </ElCard>
    <ElDrawer
      class="merchant-drawer"
      :model-value="Boolean(route.query.detail)"
      :title="title + '明細'"
      size="min(760px, 100vw)"
      @close="closeDetail"
    >
      <ElEmpty v-if="!detail" description="資料不存在或不在授權範圍" />
      <template v-else>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem v-for="column in columns" :key="column.key" :label="column.label">{{
            field(detail, column.key)
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <template v-if="kind === 'games'">
          <h3>幣別與限紅</h3>
          <ScopedTable
            :rows="store.configurations.filter((item) => item.gameId === detail!.id)"
            :columns="configColumns"
          >
            <template #actions="{ row }"
              ><ElButton
                link
                type="primary"
                :disabled="!store.availableLimitPlans(row.lineUid, row.gameId).length"
                @click="openLimit(row.lineUid, row.gameId)"
                >設定限紅</ElButton
              ></template
            >
          </ScopedTable>
          <h3>限紅操作紀錄</h3>
          <ScopedTable
            :rows="store.limitLogs.filter((item) => item.gameId === detail!.id)"
            :columns="limitLogColumns"
          />
        </template>
        <template v-else-if="kind === 'lines'">
          <h3>遊戲配置</h3
          ><ScopedTable
            :rows="store.configurations.filter((item) => item.lineUid === detail!.id)"
            :columns="configColumns"
          />
        </template>
        <template v-else>
          <ElDescriptions :column="1" border>
            <ElDescriptionsItem label="憑證編號">{{
              integrationDetail?.credentialId
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="指紋">{{
              integrationDetail?.fingerprint
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="簽章版本">{{
              integrationDetail?.signatureVersion
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="核發時間">{{
              integrationDetail?.issuedAt
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="到期時間">{{
              integrationDetail?.expiresAt
            }}</ElDescriptionsItem>
          </ElDescriptions>
        </template>
      </template>
      <template v-if="detail && (kind === 'games' || kind === 'lines')" #footer>
        <div class="merchant-drawer-footer-actions">
          <template v-if="kind === 'games'">
            <ElButton
              type="danger"
              :disabled="!store.games.find((item) => item.id === detail!.id)?.enabled"
              @click="closeGame(detail.id)"
              >關閉本平台遊戲</ElButton
            >
          </template>
          <template v-else>
            <ElButton
              @click="router.push({ path: '/merchant/integrations', query: { line: detail.id } })"
              >查看串接</ElButton
            >
          </template>
        </div>
      </template>
    </ElDrawer>
    <ElDialog
      v-if="kind === 'lines'"
      v-model="requestVisible"
      :title="form.action"
      width="min(560px, 94vw)"
    >
      <ElForm label-position="top" @submit.prevent="submit">
        <ElFormItem label="商戶"
          ><ElInput :model-value="store.merchant?.name" disabled
        /></ElFormItem>
        <ElFormItem label="申請幣別" required
          ><ElSelect v-model="form.proposed" style="width: 100%" placeholder="請選擇幣別"
            ><ElOption
              v-for="currency in store.availableCurrencies"
              :key="currency"
              :label="currency"
              :value="currency" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="申請原因" required
          ><ElInput v-model="form.reason" type="textarea" :rows="3" maxlength="300"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="requestVisible = false">取消</ElButton
        ><ElButton type="primary" @click="submit">送出申請</ElButton></template
      >
    </ElDialog>
    <ElDialog v-model="limitVisible" title="設定限紅" width="min(560px, 94vw)" append-to-body>
      <ElForm label-position="top">
        <ElFormItem label="線路"><ElInput :model-value="limitForm.lineUid" readonly /></ElFormItem>
        <ElFormItem label="總後台限紅方案" required
          ><ElSelect v-model="limitForm.planId" style="width: 100%" placeholder="請選擇方案"
            ><ElOption
              v-for="plan in store.availableLimitPlans(limitForm.lineUid, limitForm.gameId)"
              :key="plan.id"
              :value="plan.id"
              :label="
                plan.name + ' · ' + plan.minBet + '–' + plan.maxBet + ' ' + plan.currency
              " /></ElSelect
        ></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="limitVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveLimit">保存</ElButton></template
      >
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { merchantField } from '@/utils/merchantDisplay'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import ScopedTable from '../components/ScopedTable.vue'
  import {
    useMerchantPortalStore,
    type MerchantRequestCategory
  } from '@/store/modules/merchantPortal'
  const store = useMerchantPortalStore()
  const field = (row: object, key: string) => merchantField(row, key, () => 2)
  async function closeGame(id: string) {
    try {
      await ElMessageBox.confirm(
        '關閉後此遊戲不再於本商戶平台提供；不影響其他商戶，重新開啟規則待確認。',
        '關閉本平台遊戲',
        { confirmButtonText: '確認關閉', cancelButtonText: '取消', type: 'warning' }
      )
      const result = store.closePlatformGame(id)
      ElMessage[result.ok ? 'success' : 'error'](result.message)
    } catch {
      /* 使用者取消 */
    }
  }
  const route = useRoute()
  const router = useRouter()
  const kind = computed(() => route.path.split('/')[2] as 'games' | 'lines' | 'integrations')
  const title = computed(
    () => ({ games: '遊戲中心', lines: '線路管理', integrations: '串接中心' })[kind.value]
  )
  const category = computed<MerchantRequestCategory>(
    () => (({ games: '遊戲', lines: '線路', integrations: '串接' }) as const)[kind.value]
  )
  const tab = ref('list')
  watch(kind, () => {
    tab.value = 'list'
    requestVisible.value = false
  })
  const columns = computed(() =>
    kind.value === 'games'
      ? [
          { key: 'code', label: '遊戲代碼' },
          { key: 'name', label: '名稱' },
          { key: 'type', label: '類型' },
          { key: 'status', label: '主檔狀態' },
          { key: 'enabled', label: '商戶開通' },
          { key: 'enabledLines', label: '開通線路數' },
          { key: 'rtpPlanName', label: '核定 RTP 方案' },
          { key: 'devices', label: '裝置' },
          { key: 'locale', label: '預設語系' },
          { key: 'updatedAt', label: '更新時間' }
        ]
      : kind.value === 'lines'
        ? [
            { key: 'uid', label: '線路 UID', width: 220 },
            { key: 'currency', label: '交易幣別' },
            { key: 'walletMode', label: '錢包模式' },
            { key: 'environment', label: '環境' },
            { key: 'status', label: '開通狀態' },
            { key: 'enabledGames', label: '開通遊戲數' },
            { key: 'credentialStatus', label: '憑證狀態' },
            { key: 'updatedAt', label: '更新時間' }
          ]
        : [
            { key: 'lineUid', label: '線路 UID', width: 220 },
            { key: 'environment', label: '環境' },
            { key: 'status', label: '串接狀態' },
            { key: 'credentialStatus', label: '憑證狀態' },
            { key: 'apiVersion', label: 'API 版本' },
            { key: 'updatedAt', label: '更新時間' }
          ]
  )
  const rows = computed(() =>
    kind.value === 'games'
      ? store.games.filter(
          (item) => tab.value !== 'enabled' || (item.enabled && item.enabledLines > 0)
        )
      : kind.value === 'lines'
        ? store.lines
        : store.integrations.filter(
            (item) => !route.query.line || item.lineUid === route.query.line
          )
  )
  const detail = computed(() => rows.value.find((item) => item.id === route.query.detail))
  const integrationDetail = computed(() =>
    store.integrations.find((item) => item.id === route.query.detail)
  )
  const configColumns = [
    { key: 'lineUid', label: '線路', width: 220 },
    { key: 'gameId', label: '遊戲' },
    { key: 'enabled', label: '開通' },
    { key: 'rtpPlanName', label: 'RTP 方案' },
    { key: 'currency', label: '幣別' },
    { key: 'limitPlan', label: '限紅方案' },
    { key: 'minBet', label: '最低投注' },
    { key: 'maxBet', label: '最高投注' }
  ]
  const testColumns = [
    { key: 'lineUid', label: '線路', width: 220 },
    { key: 'name', label: '既有測試項目' },
    { key: 'status', label: '結果' },
    { key: 'testedAt', label: '測試時間' }
  ]
  const requestColumns = [
    { key: 'id', label: '申請編號', width: 260 },
    { key: 'action', label: '類型' },
    { key: 'target', label: '對象' },
    { key: 'proposed', label: '申請幣別' },
    { key: 'reviewReason', label: '審核說明' },
    { key: 'reason', label: '原因' },
    { key: 'status', label: '審核狀態' },
    { key: 'execution', label: '執行狀態' },
    { key: 'createdAt', label: '建立時間' }
  ]
  const limitVisible = ref(false)
  const limitForm = reactive({ lineUid: '', gameId: '', planId: '' })
  const limitLogColumns = [
    { key: 'time', label: '操作時間' },
    { key: 'operator', label: '操作人' },
    { key: 'lineUid', label: '線路' },
    { key: 'beforePlan', label: '原方案' },
    { key: 'afterPlan', label: '新方案' }
  ]
  function openLimit(lineUid: string, gameId: string) {
    Object.assign(limitForm, { lineUid, gameId, planId: '' })
    limitVisible.value = true
  }
  function saveLimit() {
    const result = store.setLimitPlan(limitForm.lineUid, limitForm.gameId, limitForm.planId)
    if (!result.ok) return ElMessage.warning(result.message)
    limitVisible.value = false
    ElMessage.success(result.message)
  }
  const requestVisible = ref(false)
  const form = reactive({ target: '', action: '', proposed: '', reason: '' })
  function showDetail(id: string) {
    router.replace({ query: { ...route.query, detail: id } })
  }
  function closeDetail() {
    const query = { ...route.query }
    delete query.detail
    router.replace({ query })
  }
  function request(target: string, action: string) {
    Object.assign(form, { target, action, proposed: '', reason: '' })
    requestVisible.value = true
  }
  function submit() {
    const result = store.submitLineApplication(form.proposed, form.reason)
    if (!result.ok) return ElMessage.error(result.message)
    ElMessage.success(result.message)
    requestVisible.value = false
    closeDetail()
    tab.value = 'requests'
  }
</script>
<style scoped lang="scss">
  .merchant-page {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .merchant-page :deep(.el-descriptions) {
    margin-bottom: 16px;
  }
</style>
