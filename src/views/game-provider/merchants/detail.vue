<template>
  <div class="merchant-detail">
    <ElCard class="hero-card">
      <AppPageHeader
        :title="merchant.name"
        eyebrow="商戶詳細資料"
        :description="`${merchant.code} · 商戶 ID：${merchant.id}`"
        :status="currentStatus"
      >
        <template #meta>
          <div class="hero-meta">
            <span><ArtSvgIcon icon="ri:node-tree" />{{ merchant.agentName }}</span>
            <span><ArtSvgIcon icon="ri:wallet-3-line" />{{ merchant.walletMode }}</span>
            <span><ArtSvgIcon icon="ri:global-line" />{{ merchant.timezone }}</span>
          </div>
        </template>
        <template #actions>
          <ElButton @click="router.push('/business/merchants')">返回列表</ElButton>
          <ElButton @click="openEdit">編輯基本資料</ElButton>
          <ElButton type="primary" @click="addLineVisible = true">新增線路</ElButton>
          <ElButton
            :type="merchant.status === 'Suspended' ? 'success' : 'danger'"
            plain
            @click="impactVisible = true"
          >
            {{ merchant.status === 'Suspended' ? '恢復商戶' : '暫停商戶' }}
          </ElButton>
        </template>
      </AppPageHeader>
    </ElCard>

    <div class="summary-grid">
      <ElCard v-for="item in summary" :key="item.label" shadow="never">
        <p>{{ item.label }}</p>
        <strong>{{ item.value }}</strong>
        <small>{{ item.note }}</small>
      </ElCard>
    </div>

    <ElCard class="tabs-card">
      <ElTabs v-model="activeTab" @tab-change="syncTab">
        <ElTabPane label="基本資料" name="profile">
          <div class="tab-panel overview-grid">
            <ElDescriptions :column="descriptionColumns" border>
              <ElDescriptionsItem label="商戶 ID">{{ merchant.id }}</ElDescriptionsItem>
              <ElDescriptionsItem label="商戶代碼">{{ merchant.code }}</ElDescriptionsItem>
              <ElDescriptionsItem label="所屬代理">
                <EntityLink
                  :label="merchant.agentName"
                  :secondary="merchant.agentId"
                  :to="`/business/agents/${merchant.agentId}`"
                />
              </ElDescriptionsItem>
              <ElDescriptionsItem label="錢包模式">{{ merchant.walletMode }}</ElDescriptionsItem>
              <ElDescriptionsItem label="國家／時區">
                {{ merchant.country }}／{{ merchant.timezone }}
              </ElDescriptionsItem>
              <ElDescriptionsItem label="主要聯絡人">{{ merchant.contact }}</ElDescriptionsItem>
              <ElDescriptionsItem label="建立時間">{{ merchant.createdAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="更新時間">{{ merchant.updatedAt }}</ElDescriptionsItem>
            </ElDescriptions>
            <ElAlert
              title="錢包模式屬於商戶層級，所有商戶線路固定繼承，不可於線路內單獨修改。"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </ElTabPane>

        <ElTabPane label="商務條件" name="commercial">
          <div class="tab-panel">
            <div class="section-toolbar">
              <div><h3>商務條件版本</h3><p>新版本先建立為草稿，確認後才取代目前條件。</p></div>
              <ElButton type="primary" @click="openTermDialog">新增條件版本</ElButton>
            </div>
            <ElAlert
              :title="`商戶條件不得高於代理條件 ${merchant.agentTermPercent.toFixed(2)}%，目前條件差 ${termSpread.toFixed(2)}%。`"
              type="warning"
              :closable="false"
              show-icon
              class="mb-4"
            />
            <ElTable :data="terms" border>
              <ElTableColumn label="版本" width="80"
                ><template #default="scope">V{{ scope.row.version }}</template></ElTableColumn
              >
              <ElTableColumn prop="settlementBasis" label="計算基準" width="120" />
              <ElTableColumn label="代理／商戶條件" min-width="150"
                ><template #default="scope"
                  >{{ scope.row.agentTermPercent }}%／{{ scope.row.merchantTermPercent }}%</template
                ></ElTableColumn
              >
              <ElTableColumn prop="settlementCurrency" label="幣別" width="90" />
              <ElTableColumn label="週期" width="100"
                ><template #default="scope">{{
                  cycleLabel(scope.row.settlementCycle)
                }}</template></ElTableColumn
              >
              <ElTableColumn prop="effectiveFrom" label="生效日" width="120" />
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><GameProviderStatusTag :status="scope.row.status" /></template
              ></ElTableColumn>
              <ElTableColumn prop="reason" label="原因" min-width="170" show-overflow-tooltip />
              <ElTableColumn label="操作" width="100" fixed="right"
                ><template #default="scope"
                  ><ElButton
                    v-if="scope.row.status === 'Draft'"
                    link
                    type="primary"
                    @click="activateTerm(scope.row.id)"
                    >設為生效</ElButton
                  ><span v-else>—</span></template
                ></ElTableColumn
              >
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="線路管理" name="lines">
          <div class="tab-panel">
            <MerchantLineTable
              :lines="lines"
              editable
              @add="addLineVisible = true"
              @open="openLine"
            />
          </div>
        </ElTabPane>

        <ElTabPane label="遊戲配置" name="games">
          <div class="tab-panel">
            <ElAlert
              title="RTP 採用遊戲中心核定的固定方案，設定粒度為「商戶 × 遊戲」；線路僅維護幣別相關限紅。"
              type="info"
              :closable="false"
              show-icon
            />
            <ElTable :data="gameConfigurations" border class="mt-4">
              <ElTableColumn prop="gameId" label="遊戲 ID" width="110" />
              <ElTableColumn prop="gameName" label="遊戲名稱" min-width="160" />
              <ElTableColumn label="狀態" width="100">
                <template #default="scope">
                  <ElSwitch
                    :model-value="scope.row.enabled"
                    @change="(value) => updateGame(scope.row, { enabled: Boolean(value) })"
                  />
                </template>
              </ElTableColumn>
              <ElTableColumn label="核定 RTP 方案" min-width="170">
                <template #default="scope">
                  <ElSelect
                    :model-value="scope.row.rtpPlanId"
                    size="small"
                    @change="(value) => changeRtp(scope.row, String(value))"
                  >
                    <ElOption
                      v-for="plan in rtpPlans"
                      :key="plan.id"
                      :label="plan.name"
                      :value="plan.id"
                    />
                  </ElSelect>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="updatedAt" label="更新時間" min-width="150" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="串接管理" name="integration">
          <div class="tab-panel">
            <ElTable :data="lines" border>
              <ElTableColumn prop="uid" label="線路 UID" min-width="210" />
              <ElTableColumn prop="currency" label="交易幣別" width="100" />
              <ElTableColumn prop="environment" label="最高環境" width="120" />
              <ElTableColumn label="憑證狀態" width="130">
                <template #default="scope">
                  <GameProviderStatusTag :status="scope.row.credentialStatus" />
                </template>
              </ElTableColumn>
              <ElTableColumn prop="updatedAt" label="更新時間" min-width="150" />
              <ElTableColumn label="操作" width="110">
                <template #default="scope">
                  <ElButton link type="primary" @click="openLine(scope.row)">管理串接</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="對帳摘要" name="reconciliation">
          <div class="tab-panel">
            <div class="reconciliation-grid">
              <ElCard shadow="never">
                <p>本期預估結算</p>
                <strong>{{ formatMoney(reconciliations[0]?.estimatedSettlement || 0) }}</strong>
                <small>{{ merchant.settlementCurrency }}</small>
              </ElCard>
              <ElCard shadow="never">
                <p>待確認差異</p>
                <strong>{{ Number(merchant.id.slice(-2)) % 3 }}</strong>
                <small>差異須於結算批次完成前處理</small>
              </ElCard>
            </div>
            <ElTable :data="reconciliations" border class="mt-4">
              <ElTableColumn prop="period" label="期間" width="110" />
              <ElTableColumn label="有效投注" min-width="130"
                ><template #default="scope">{{
                  formatMoney(scope.row.validBet)
                }}</template></ElTableColumn
              >
              <ElTableColumn label="GGR" min-width="120"
                ><template #default="scope">{{
                  formatMoney(scope.row.ggr)
                }}</template></ElTableColumn
              >
              <ElTableColumn label="預估結算" min-width="150"
                ><template #default="scope"
                  >{{ formatMoney(scope.row.estimatedSettlement) }}
                  {{ scope.row.currency }}</template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope">{{
                  reconciliationStatusLabel(scope.row.status)
                }}</template></ElTableColumn
              >
            </ElTable>
            <ElButton
              class="mt-4"
              type="primary"
              plain
              @click="router.push('/finance/reconciliation/merchants')"
            >
              前往商戶對帳
            </ElButton>
          </div>
        </ElTabPane>

        <ElTabPane label="異動紀錄" name="logs">
          <div class="tab-panel"><AuditTimeline :entries="auditEntries" /></div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDrawer v-model="editVisible" title="編輯商戶基本資料" size="min(92vw, 560px)">
      <ElForm label-position="top">
        <div class="form-grid">
          <ElFormItem label="商戶名稱" required><ElInput v-model="editForm.name" /></ElFormItem>
          <ElFormItem label="品牌名稱"><ElInput v-model="editForm.brandName" /></ElFormItem>
          <ElFormItem label="國家／地區" required
            ><ElInput v-model="editForm.country"
          /></ElFormItem>
          <ElFormItem label="時區" required><ElInput v-model="editForm.timezone" /></ElFormItem>
          <ElFormItem label="主要聯絡人" required
            ><ElInput v-model="editForm.contact"
          /></ElFormItem>
          <ElFormItem label="電子信箱"><ElInput v-model="editForm.email" /></ElFormItem>
        </div>
        <ElFormItem label="備註"
          ><ElInput v-model="editForm.note" type="textarea" :rows="3"
        /></ElFormItem>
        <ElFormItem label="修改原因" required><ElInput v-model="editForm.reason" /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="editVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveMerchant">儲存修改</ElButton></template
      >
    </ElDrawer>

    <ElDialog v-model="termVisible" title="新增商務條件版本" width="min(94vw, 680px)">
      <ElAlert
        title="新條件先儲存為草稿，不會立即改變目前生效條件。"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top">
        <div class="form-grid">
          <ElFormItem label="計算基準" required
            ><ElSelect v-model="termForm.settlementBasis" class="w-full"
              ><ElOption label="GGR" value="GGR" /><ElOption
                label="有效投注"
                value="Valid Bet" /><ElOption label="總投注" value="Turnover" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="代理條件"
            ><ElInput :model-value="`${merchant.agentTermPercent}%`" disabled
          /></ElFormItem>
          <ElFormItem label="商戶條件 (%)" required
            ><ElInputNumber
              v-model="termForm.merchantTermPercent"
              :min="0"
              :max="merchant.agentTermPercent"
              :precision="2"
              class="w-full"
          /></ElFormItem>
          <ElFormItem label="結算幣別" required
            ><ElSelect v-model="termForm.settlementCurrency" class="w-full"
              ><ElOption
                v-for="currency in settlementCurrencies"
                :key="currency"
                :label="currency"
                :value="currency" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="結算週期" required
            ><ElSelect v-model="termForm.settlementCycle" class="w-full"
              ><ElOption label="每日" value="Daily" /><ElOption
                label="每週"
                value="Weekly" /><ElOption label="每半月" value="Semimonthly" /><ElOption
                label="每月"
                value="Monthly" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="預計生效日" required
            ><ElDatePicker
              v-model="termForm.effectiveFrom"
              type="date"
              value-format="YYYY-MM-DD"
              class="w-full"
          /></ElFormItem>
        </div>
        <ElFormItem label="建立原因" required
          ><ElInput v-model="termForm.reason" type="textarea" :rows="3"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="termVisible = false">取消</ElButton
        ><ElButton type="primary" @click="createTerm">建立草稿</ElButton></template
      >
    </ElDialog>

    <ElDialog v-model="addLineVisible" title="新增商戶線路" width="min(92vw, 560px)">
      <ElAlert
        :title="`新線路將繼承 ${merchant.walletMode} 錢包模式；RTP 與商務條件不在線路層級覆寫。`"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top">
        <ElFormItem label="交易幣別" required>
          <ElSelect v-model="newCurrency" filterable class="w-full">
            <ElOption
              v-for="currency in transactionCurrencies"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="線路 UID">
          <ElInput :model-value="newLineUid" disabled />
        </ElFormItem>
        <ElFormItem label="複製線路設定">
          <ElSelect v-model="copySource" class="w-full" clearable placeholder="選填">
            <ElOption
              v-for="line in lines"
              :key="line.uid"
              :label="`${line.uid} · ${line.currency}`"
              :value="line.uid"
            />
          </ElSelect>
        </ElFormItem>
        <ElCheckbox v-model="createSandbox">同時建立測試環境工作區</ElCheckbox>
      </ElForm>
      <template #footer>
        <ElButton @click="addLineVisible = false">取消</ElButton>
        <ElButton type="primary" :disabled="!newCurrency" @click="addLine">建立草稿</ElButton>
      </template>
    </ElDialog>

    <ImpactPreviewModal
      v-model="impactVisible"
      :title="merchant.status === 'Suspended' ? '恢復商戶影響預覽' : '暫停商戶影響預覽'"
      :summary="
        merchant.status === 'Suspended'
          ? '商戶將恢復啟用；各線路仍需逐條確認後啟用。'
          : `此操作影響 ${lines.length} 條商戶線路；歷史交易與報表仍會保留。`
      "
      :items="impactItems"
      @confirm="submitStatusChange"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    MerchantGameConfiguration,
    MerchantLine,
    SettlementBasis,
    SettlementCycle
  } from '@/types/game-provider'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import AuditTimeline from '@/components/business/game-provider/audit-timeline/index.vue'
  import MerchantLineTable from '@/components/business/game-provider/currency-account-table/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import ImpactPreviewModal from '@/components/business/game-provider/impact-preview-modal/index.vue'

  defineOptions({ name: 'MerchantDetail' })

  const router = useRouter()
  const route = useRoute()
  const store = useBusinessPartnerStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const { width } = useWindowSize()
  const merchant = computed(() => store.findMerchant(String(route.params.id)) || store.merchants[0])
  const lines = computed(() => merchant.value.lines)
  const currentStatus = computed(() => merchant.value.status)
  const activeTab = ref(String(route.query.tab || 'profile'))
  const addLineVisible = ref(false)
  const editVisible = ref(false)
  const termVisible = ref(false)
  const impactVisible = ref(false)
  const newCurrency = ref('')
  const copySource = ref('')
  const createSandbox = ref(true)
  const settlementCurrencies = computed(() =>
    financeSettingsStore.settlementCurrencies.map((item) => item.code)
  )
  const transactionCurrencies = computed(() =>
    financeSettingsStore.transactionCurrencies.map((item) => item.code)
  )
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const termSpread = computed(
    () => merchant.value.agentTermPercent - merchant.value.merchantTermPercent
  )
  const terms = computed(() => store.getMerchantTerms(merchant.value.id))
  const reconciliations = computed(() => store.getMerchantReconciliations(merchant.value.id))
  const editForm = reactive({
    name: '',
    brandName: '',
    country: '',
    timezone: '',
    contact: '',
    email: '',
    note: '',
    reason: ''
  })
  const termForm = reactive<{
    settlementBasis: SettlementBasis
    merchantTermPercent: number
    settlementCurrency: string
    settlementCycle: SettlementCycle
    effectiveFrom: string
    reason: string
  }>({
    settlementBasis: 'GGR',
    merchantTermPercent: 0,
    settlementCurrency: 'USD',
    settlementCycle: 'Monthly',
    effectiveFrom: '',
    reason: ''
  })
  const rtpPlans = [
    { id: 'RTP-001', name: '標準 96.2%' },
    { id: 'RTP-002', name: '均衡 95.8%' },
    { id: 'RTP-003', name: '進階 96.8%' }
  ]
  const newLineUid = computed(() =>
    store.createLineUid(merchant.value.code, newCurrency.value || 'CURRENCY')
  )
  const summary = computed(() => [
    { label: '商戶線路', value: lines.value.length, note: '每條線路固定一個交易幣別' },
    {
      label: '已開通遊戲',
      value: gameConfigurations.value.filter((item) => item.enabled).length,
      note: '商戶層級遊戲配置'
    },
    { label: '錢包模式', value: merchant.value.walletMode, note: '所有線路固定繼承' },
    {
      label: '正式線路',
      value: lines.value.filter((line) => line.environment === 'Production').length,
      note: '已具正式環境'
    }
  ])
  const impactItems = computed(() => [
    { label: '商戶線路', value: lines.value.length },
    {
      label: '正式環境',
      value: lines.value.filter((line) => line.environment === 'Production').length
    },
    { label: '錢包模式', value: merchant.value.walletMode },
    { label: '歷史資料', value: '保留，不受影響' }
  ])
  const gameNames = ['Dragon Vault', 'Neon Tiger', 'Lucky Panda', 'Royal Baccarat', 'Fortune Ox']
  const gameConfigurations = computed(() =>
    store.getMerchantGameConfigurations(merchant.value.id).map((item, index) => ({
      ...item,
      gameName: gameNames[index] || item.gameId
    }))
  )
  const auditEntries = computed(() => store.getMerchantAuditLogs(merchant.value.id))

  const cycleLabel = (cycle: SettlementCycle) =>
    ({ Daily: '每日', Weekly: '每週', Semimonthly: '每半月', Monthly: '每月' })[cycle]
  const formatMoney = (value: number) => new Intl.NumberFormat('zh-TW').format(value)
  const reconciliationStatusLabel = (status: string) =>
    ({ Pending: '待確認', Difference: '有差異', Confirmed: '已確認', Completed: '已完成' })[
      status
    ] || status

  const openLine = (line: MerchantLine) =>
    router.push(`/business/merchants/${merchant.value.id}/lines/${line.uid}`)
  const syncTab = (tab: string | number) =>
    router.replace({ query: { ...route.query, tab: String(tab) } })
  const openEdit = () => {
    Object.assign(editForm, {
      name: merchant.value.name,
      brandName: merchant.value.brandName || '',
      country: merchant.value.country,
      timezone: merchant.value.timezone,
      contact: merchant.value.contact,
      email: merchant.value.email || '',
      note: merchant.value.note || '',
      reason: ''
    })
    editVisible.value = true
  }
  const saveMerchant = () => {
    if (!editForm.name.trim() || !editForm.contact.trim() || !editForm.reason.trim()) {
      ElMessage.warning('請填寫必要欄位與修改原因')
      return
    }
    store.updateMerchant(
      merchant.value.id,
      {
        name: editForm.name.trim(),
        brandName: editForm.brandName.trim(),
        country: editForm.country.trim(),
        timezone: editForm.timezone.trim(),
        contact: editForm.contact.trim(),
        email: editForm.email.trim(),
        note: editForm.note.trim()
      },
      editForm.reason.trim()
    )
    editVisible.value = false
    ElMessage.success('商戶基本資料已更新')
  }
  const openTermDialog = () => {
    const current = store.getCurrentMerchantTerm(merchant.value.id)
    Object.assign(termForm, {
      settlementBasis: current?.settlementBasis || 'GGR',
      merchantTermPercent: current?.merchantTermPercent || merchant.value.merchantTermPercent,
      settlementCurrency: current?.settlementCurrency || merchant.value.settlementCurrency,
      settlementCycle: current?.settlementCycle || merchant.value.settlementCycle,
      effectiveFrom: '',
      reason: ''
    })
    termVisible.value = true
  }
  const createTerm = () => {
    if (!termForm.effectiveFrom || !termForm.reason.trim()) {
      ElMessage.warning('請填寫預計生效日與建立原因')
      return
    }
    if (termForm.merchantTermPercent > merchant.value.agentTermPercent) {
      ElMessage.error('商戶條件不可高於代理條件')
      return
    }
    store.addMerchantCommercialTerm(merchant.value.id, {
      settlementBasis: termForm.settlementBasis,
      agentTermPercent: merchant.value.agentTermPercent,
      merchantTermPercent: termForm.merchantTermPercent,
      settlementCurrency: termForm.settlementCurrency,
      settlementCycle: termForm.settlementCycle,
      effectiveFrom: termForm.effectiveFrom,
      reason: termForm.reason.trim()
    })
    termVisible.value = false
    ElMessage.success('商務條件草稿已建立')
  }
  const activateTerm = async (termId: string) => {
    try {
      const result = await ElMessageBox.prompt(
        '請輸入條件生效原因，此操作會使目前版本失效。',
        '確認商務條件生效',
        {
          confirmButtonText: '確認生效',
          cancelButtonText: '取消',
          inputPlaceholder: '請填寫原因',
          inputValidator: (value) => Boolean(value?.trim()) || '請填寫原因'
        }
      )
      store.activateMerchantCommercialTerm(termId, result.value)
      ElMessage.success('新商務條件已生效')
    } catch {
      // 使用者取消
    }
  }
  const addLine = () => {
    store.addMerchantLine(merchant.value.id, {
      currency: newCurrency.value,
      copySourceUid: copySource.value || undefined,
      createSandbox: createSandbox.value
    })
    addLineVisible.value = false
    newCurrency.value = ''
    copySource.value = ''
    createSandbox.value = true
    ElMessage.success('商戶線路草稿已建立')
  }
  const updateGame = (
    row: MerchantGameConfiguration,
    updates: Partial<Pick<MerchantGameConfiguration, 'enabled' | 'rtpPlanId' | 'rtpPlanName'>>
  ) => {
    store.updateMerchantGameConfiguration(
      merchant.value.id,
      row.gameId,
      updates,
      '商戶詳細頁調整遊戲配置'
    )
    ElMessage.success('遊戲配置已更新並同步至線路')
  }
  const changeRtp = (row: MerchantGameConfiguration, planId: string) => {
    const plan = rtpPlans.find((item) => item.id === planId)
    if (plan) updateGame(row, { rtpPlanId: plan.id, rtpPlanName: plan.name })
  }
  const submitStatusChange = (payload: { reason: string }) => {
    const nextStatus = merchant.value.status === 'Suspended' ? 'Active' : 'Suspended'
    store.changeMerchantStatus(merchant.value.id, nextStatus, payload.reason)
    ElMessage.success(
      nextStatus === 'Active' ? '商戶已恢復；請逐條確認線路狀態' : '商戶與所屬線路已暫停'
    )
  }
</script>

<style scoped lang="scss">
  .merchant-detail {
    display: grid;
    gap: 16px;
  }

  .hero-card :deep(.el-card__body) {
    padding: 22px 24px;
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--art-gray-600);

    span {
      display: flex;
      gap: 6px;
      align-items: center;
    }
  }

  .summary-grid,
  .reconciliation-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;

    p,
    small {
      margin: 0;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 7px 0 5px;
      font-size: 22px;
    }
  }

  .reconciliation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tab-panel {
    min-height: 360px;
    padding: 16px 2px 6px;
  }

  .overview-grid {
    display: grid;
    gap: 16px;
  }

  .section-toolbar {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;

    h3,
    p {
      margin: 0;
    }

    p {
      margin-top: 5px;
      color: var(--art-gray-600);
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;
  }

  @media (width <= 960px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .summary-grid,
    .reconciliation-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .section-toolbar {
      flex-direction: column;
    }
  }
</style>
