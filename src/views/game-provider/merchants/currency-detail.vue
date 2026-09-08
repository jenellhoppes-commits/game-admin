<template>
  <div class="line-detail">
    <ElCard class="hero-card">
      <AppPageHeader
        :title="line.uid"
        eyebrow="商戶線路"
        :description="`${merchant.name} · 固定交易幣別：${line.currency}`"
        :status="currentStatus"
      >
        <template #meta>
          <div class="hero-meta">
            <span><ArtSvgIcon icon="ri:store-2-line" />{{ merchant.code }}</span>
            <span><ArtSvgIcon icon="ri:wallet-3-line" />{{ line.walletMode }}</span>
            <span><ArtSvgIcon icon="ri:global-line" />{{ line.environment }}</span>
          </div>
        </template>
        <template #actions>
          <ElButton @click="returnToMerchant">返回商戶</ElButton>
          <ElButton @click="openEnvironmentEditor">編輯串接設定</ElButton>
          <ElButton
            :type="line.status === 'Suspended' ? 'success' : 'danger'"
            plain
            @click="statusImpactVisible = true"
          >
            {{ line.status === 'Suspended' ? '恢復線路' : '暫停線路' }}
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

    <ElCard>
      <ElTabs v-model="activeTab" @tab-change="syncTab">
        <ElTabPane label="基本資料" name="profile">
          <div class="tab-panel overview-grid">
            <ElDescriptions :column="descriptionColumns" border>
              <ElDescriptionsItem label="線路 UID">{{ line.uid }}</ElDescriptionsItem>
              <ElDescriptionsItem label="商戶">
                <EntityLink
                  :label="merchant.name"
                  :secondary="merchant.id"
                  :to="`/business/merchants/${merchant.id}`"
                />
              </ElDescriptionsItem>
              <ElDescriptionsItem label="交易幣別">{{ line.currency }}</ElDescriptionsItem>
              <ElDescriptionsItem label="錢包模式">{{ line.walletMode }}</ElDescriptionsItem>
              <ElDescriptionsItem label="Jackpot 模式">{{ jackpotModeLabel }}</ElDescriptionsItem>
              <ElDescriptionsItem label="目前環境">{{ line.environment }}</ElDescriptionsItem>
              <ElDescriptionsItem label="建立規則">商戶代碼＋幣別＋唯一識別</ElDescriptionsItem>
              <ElDescriptionsItem label="更新時間">{{ line.updatedAt }}</ElDescriptionsItem>
            </ElDescriptions>
            <ElAlert
              title="同一商戶、同一幣別未來可能存在多條線路，因此網址與資料關聯一律使用線路 UID，不以幣別作為識別碼。"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </ElTabPane>

        <ElTabPane label="遊戲配置" name="games">
          <div class="tab-panel">
            <ElAlert
              title="RTP 方案由商戶 × 遊戲決定並唯讀顯示；本頁只設定線路 × 遊戲的限紅與 Jackpot 參與方式。"
              type="info"
              :closable="false"
              show-icon
            />
            <ElTable :data="lineGames" border class="mt-4">
              <ElTableColumn prop="gameId" label="遊戲 ID" width="110" />
              <ElTableColumn prop="gameName" label="遊戲名稱" min-width="150" />
              <ElTableColumn label="啟用" width="80">
                <template #default="scope"
                  ><ElSwitch
                    :model-value="scope.row.enabled"
                    @change="(value) => updateLineGame(scope.row, { enabled: Boolean(value) })"
                /></template>
              </ElTableColumn>
              <ElTableColumn prop="rtpPlan" label="商戶 RTP 方案" min-width="150" />
              <ElTableColumn label="線路限紅方案" min-width="150">
                <template #default="scope">
                  <ElSelect
                    :model-value="scope.row.limitPlan"
                    size="small"
                    @change="(value) => updateLineGame(scope.row, { limitPlan: String(value) })"
                  >
                    <ElOption
                      v-for="plan in catalog
                        .getLimitPlans(scope.row.gameId)
                        .filter((p) => p.currency === line?.currency && p.status === 'Active')"
                      :key="plan.id"
                      :label="`${plan.name} · ${plan.minBet}–${plan.maxBet} ${plan.currency}`"
                      :value="plan.id"
                    />
                  </ElSelect>
                </template>
              </ElTableColumn>
              <ElTableColumn label="Jackpot" min-width="130">
                <template #default="scope">
                  <ElSelect
                    :model-value="scope.row.jackpotMode"
                    size="small"
                    @change="(value) => changeJackpot(scope.row, String(value))"
                  >
                    <ElOption label="使用預設" value="Default" />
                    <ElOption label="自訂" value="Custom" />
                    <ElOption label="不參與" value="Excluded" />
                  </ElSelect>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="串接設定" name="integration">
          <div class="tab-panel">
            <div class="section-toolbar">
              <div>
                <h3>環境與憑證</h3>
                <p>測試與正式環境均綁定線路 UID，Secret 僅在核發時顯示一次。</p>
              </div>
              <div class="toolbar-actions">
                <ElButton @click="openEnvironmentEditor">編輯環境設定</ElButton>
                <ElButton
                  v-if="!productionEnvironment"
                  type="primary"
                  :disabled="!allRequiredTestsPassed"
                  @click="productionImpactVisible = true"
                  >申請正式環境</ElButton
                >
              </div>
            </div>
            <div class="environment-grid">
              <CredentialField
                v-for="environment in environments"
                :key="environment.id"
                :environment="environment"
                @change="(credential) => updateCredential(environment.environment, credential)"
              />
              <ElCard v-if="!productionEnvironment" shadow="never" class="production-empty">
                <ArtSvgIcon icon="ri:shield-keyhole-line" />
                <div>
                  <h3>正式環境尚未建立</h3>
                  <p>完成必測案例後才可提出正式環境申請。</p>
                </div>
              </ElCard>
            </div>
          </div>
        </ElTabPane>

        <ElTabPane label="測試與驗收" name="testing">
          <div class="tab-panel">
            <div class="section-toolbar">
              <div>
                <h3>串接測試清單</h3>
                <p>測試項目會依商戶錢包模式自動套用。</p>
              </div>
              <ElButton type="primary" :loading="testsRunning" @click="runTests"
                >執行全部測試</ElButton
              >
            </div>
            <ElTable :data="testItems" border>
              <ElTableColumn prop="name" label="測試項目" min-width="170" />
              <ElTableColumn prop="description" label="驗收內容" min-width="260" />
              <ElTableColumn label="必要" width="80">
                <template #default="scope">{{ scope.row.required ? '是' : '否' }}</template>
              </ElTableColumn>
              <ElTableColumn label="結果" width="120">
                <template #default="scope">
                  <GameProviderStatusTag :status="scope.row.status" />
                </template>
              </ElTableColumn>
              <ElTableColumn prop="testedAt" label="測試時間" min-width="150" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="關聯會員" name="members">
          <div class="tab-panel">
            <ElTable :data="relatedMembers" border>
              <ElTableColumn prop="id" label="會員 ID" min-width="130" />
              <ElTableColumn prop="externalId" label="商戶會員識別碼" min-width="170" />
              <ElTableColumn prop="currency" label="錢包幣別" width="100" />
              <ElTableColumn prop="lastActiveAt" label="最後活動時間" min-width="160" />
              <ElTableColumn label="操作" width="90">
                <template #default="scope">
                  <ElButton link type="primary" @click="router.push(`/members/${scope.row.id}`)">
                    查看
                  </ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="異動紀錄" name="audit">
          <div class="tab-panel"><AuditTimeline :entries="auditEntries" /></div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog v-model="environmentVisible" title="編輯串接環境" width="min(94vw, 680px)">
      <ElForm label-position="top">
        <ElFormItem label="環境" required>
          <ElSelect v-model="environmentForm.environment" class="w-full">
            <ElOption
              v-for="item in environments"
              :key="item.environment"
              :label="item.environment === 'Sandbox' ? '測試環境' : '正式環境'"
              :value="item.environment"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="服務端點"
          ><ElInput :model-value="selectedEnvironment?.endpoint || '—'" disabled
        /></ElFormItem>
        <ElFormItem label="回呼網址" required
          ><ElInput
            v-model="environmentForm.callbackUrl"
            placeholder="https://merchant.example.com/game/callback"
        /></ElFormItem>
        <ElFormItem label="IP 白名單"
          ><ElInput
            v-model="environmentForm.ipWhitelistText"
            type="textarea"
            :rows="3"
            placeholder="每行一個 IP 或 CIDR"
        /></ElFormItem>
        <ElFormItem label="修改原因" required
          ><ElInput v-model="environmentForm.reason"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="environmentVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveEnvironment">儲存設定</ElButton></template
      >
    </ElDialog>

    <ImpactPreviewModal
      v-model="productionImpactVisible"
      title="申請正式環境"
      summary="正式環境會建立獨立端點與憑證；送出後進入營運與安全審核。"
      :items="productionImpactItems"
      @confirm="requestProduction"
    />
    <ImpactPreviewModal
      v-model="statusImpactVisible"
      :title="line.status === 'Suspended' ? '恢復線路影響預覽' : '暫停線路影響預覽'"
      :summary="
        line.status === 'Suspended'
          ? '恢復後線路可重新進行串接作業。'
          : '暫停後新遊戲請求將停止，歷史資料仍保留。'
      "
      :items="statusImpactItems"
      @confirm="changeLineStatus"
    />
  </div>
</template>

<script setup lang="ts">
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  const catalog = useGameCatalogStore()
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    CredentialRecord,
    IntegrationEnvironment,
    IntegrationEnvironmentConfig,
    MerchantLineGameConfiguration,
    MerchantLineStatus
  } from '@/types/game-provider'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import AuditTimeline from '@/components/business/game-provider/audit-timeline/index.vue'
  import CredentialField from '@/components/business/game-provider/credential-field/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import ImpactPreviewModal from '@/components/business/game-provider/impact-preview-modal/index.vue'

  defineOptions({ name: 'MerchantLineDetail' })

  const router = useRouter()
  const route = useRoute()
  const store = useBusinessPartnerStore()
  const { width } = useWindowSize()
  const merchant = computed(
    () => store.findMerchant(String(route.params.merchantId)) || store.merchants[0]
  )
  const routeLineIdentifier = computed(() =>
    String(route.params.lineUid || route.params.currency || '')
  )
  const line = computed(
    () =>
      merchant.value.lines.find(
        (item) =>
          item.uid === routeLineIdentifier.value || item.currency === routeLineIdentifier.value
      ) || merchant.value.lines[0]
  )
  const currentStatus = computed<MerchantLineStatus>(() => line.value.status)
  const activeTab = ref(String(route.query.tab || 'profile'))
  const testsRunning = ref(false)
  const environmentVisible = ref(false)
  const productionImpactVisible = ref(false)
  const statusImpactVisible = ref(false)
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const environments = computed<IntegrationEnvironmentConfig[]>(() => line.value.environments)
  const productionEnvironment = computed(() =>
    environments.value.find((item) => item.environment === 'Production')
  )
  const jackpotModeLabel = computed(
    () => ({ Default: '使用預設', Custom: '自訂', Excluded: '不參與' })[line.value.jackpotMode]
  )
  const summary = computed(() => [
    { label: '交易幣別', value: line.value.currency, note: '線路建立後固定' },
    {
      label: '已開通遊戲',
      value: lineGames.value.filter((item) => item.enabled).length,
      note: '沿用商戶遊戲配置'
    },
    { label: '限紅方案', value: line.value.limitPlanCount, note: '線路 × 遊戲' },
    { label: '憑證狀態', value: line.value.credentialStatus, note: '正式與測試環境分離' }
  ])
  const gameNames = ['Dragon Vault', 'Neon Tiger', 'Lucky Panda', 'Royal Baccarat', 'Fortune Ox']
  const lineGames = computed(() =>
    store.getMerchantLineGameConfigurations(line.value.uid).map((item, index) => ({
      ...item,
      gameName: gameNames[index] || item.gameId,
      rtpPlan: item.rtpPlanName
    }))
  )
  const testItems = computed(() => store.getMerchantLineTests(line.value.uid))
  const allRequiredTestsPassed = computed(() =>
    testItems.value.filter((item) => item.required).every((item) => item.status === 'Passed')
  )
  const relatedMembers = Array.from({ length: 6 }, (_, index) => ({
    id: `P${String(index + 1).padStart(6, '0')}`,
    externalId: `${merchant.value.code}-USER-${1001 + index}`,
    currency: line.value.currency,
    lastActiveAt: `2026-08-${String(31 - index).padStart(2, '0')} 18:20`
  }))
  const auditEntries = computed(() => store.getMerchantLineAuditLogs(line.value.uid))
  const environmentForm = reactive<{
    environment: IntegrationEnvironment
    callbackUrl: string
    ipWhitelistText: string
    reason: string
  }>({ environment: 'Sandbox', callbackUrl: '', ipWhitelistText: '', reason: '' })
  const selectedEnvironment = computed(() =>
    environments.value.find((item) => item.environment === environmentForm.environment)
  )
  const productionImpactItems = computed(() => [
    { label: '線路 UID', value: line.value.uid },
    {
      label: '必測案例',
      value: `${testItems.value.filter((item) => item.status === 'Passed').length}/${testItems.value.filter((item) => item.required).length} 已通過`
    },
    { label: '正式憑證', value: '核准後另行核發' },
    { label: '歷史資料', value: '不受影響' }
  ])
  const statusImpactItems = computed(() => [
    { label: '交易幣別', value: line.value.currency },
    { label: '已開通遊戲', value: line.value.enabledGames },
    { label: '目前環境', value: line.value.environment },
    { label: '歷史交易', value: '保留' }
  ])

  const returnToMerchant = () => router.push(`/business/merchants/${merchant.value.id}`)
  const syncTab = (tab: string | number) =>
    router.replace({ query: { ...route.query, tab: String(tab) } })
  const updateLineGame = (
    row: MerchantLineGameConfiguration,
    updates: Partial<Pick<MerchantLineGameConfiguration, 'enabled' | 'limitPlan' | 'jackpotMode'>>
  ) => {
    const ok = store.updateMerchantLineGameConfiguration(
      merchant.value.id,
      line.value.uid,
      row.gameId,
      updates,
      '線路詳細頁調整遊戲設定'
    )
    if (!ok) return ElMessage.warning('方案已停用或不適用此遊戲／幣別，請重新選擇')
    ElMessage.success('線路遊戲設定已更新')
  }
  const changeJackpot = (row: MerchantLineGameConfiguration, value: string) => {
    if (value === 'Default' || value === 'Custom' || value === 'Excluded') {
      updateLineGame(row, { jackpotMode: value })
    }
  }
  const runTests = async () => {
    testsRunning.value = true
    store.startMerchantLineTests(merchant.value.id, line.value.uid)
    await new Promise((resolve) => setTimeout(resolve, 500))
    store.completeMerchantLineTests(merchant.value.id, line.value.uid)
    testsRunning.value = false
    ElMessage.success('必測案例已全部通過')
  }
  const requestProduction = (payload: { reason: string }) => {
    const success = store.requestProductionEnvironment(
      merchant.value.id,
      line.value.uid,
      payload.reason
    )
    if (!success) return ElMessage.warning('請先完成全部必要測試')
    activeTab.value = 'integration'
    ElMessage.success('正式環境申請已建立，等待營運與安全審核')
  }
  const openEnvironmentEditor = () => {
    const target = productionEnvironment.value || environments.value[0]
    if (!target) return ElMessage.warning('此線路尚未建立任何串接環境')
    Object.assign(environmentForm, {
      environment: target.environment,
      callbackUrl: target.callbackUrl,
      ipWhitelistText: target.ipWhitelist.join('\n'),
      reason: ''
    })
    environmentVisible.value = true
  }
  watch(
    () => environmentForm.environment,
    () => {
      const target = selectedEnvironment.value
      environmentForm.callbackUrl = target?.callbackUrl || ''
      environmentForm.ipWhitelistText = target?.ipWhitelist.join('\n') || ''
    }
  )
  const saveEnvironment = () => {
    if (!environmentForm.callbackUrl.trim() || !environmentForm.reason.trim()) {
      ElMessage.warning('請填寫回呼網址與修改原因')
      return
    }
    store.updateLineEnvironment(
      merchant.value.id,
      line.value.uid,
      environmentForm.environment,
      {
        callbackUrl: environmentForm.callbackUrl.trim(),
        ipWhitelist: environmentForm.ipWhitelistText
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean),
        status: 'Configuring'
      },
      environmentForm.reason.trim()
    )
    environmentVisible.value = false
    ElMessage.success('串接環境設定已儲存')
  }
  const updateCredential = (
    environment: IntegrationEnvironment,
    credential: CredentialRecord | undefined
  ) => store.updateLineCredential(merchant.value.id, line.value.uid, environment, credential)
  const changeLineStatus = (payload: { reason: string }) => {
    const nextStatus = line.value.status === 'Suspended' ? 'Configuring' : 'Suspended'
    store.changeMerchantLineStatus(merchant.value.id, line.value.uid, nextStatus, payload.reason)
    ElMessage.success(nextStatus === 'Suspended' ? '商戶線路已暫停' : '商戶線路已恢復設定中')
  }
</script>

<style scoped lang="scss">
  .line-detail {
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

  .summary-grid {
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

  .tab-panel {
    min-height: 360px;
    padding: 16px 2px 6px;
  }

  .overview-grid,
  .environment-grid {
    display: grid;
    gap: 16px;
  }

  .environment-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-toolbar,
  .production-empty {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;

    p,
    h3 {
      margin: 0;
    }

    p {
      margin-top: 5px;
      color: var(--art-gray-600);
    }
  }

  .toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }

  .production-empty {
    grid-column: 1 / -1;
    align-items: center;
    margin-bottom: 0;

    > .art-svg-icon {
      font-size: 30px;
      color: var(--theme-color);
    }

    > div {
      flex: 1;
    }
  }

  @media (width <= 960px) {
    .summary-grid,
    .environment-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .summary-grid,
    .environment-grid {
      grid-template-columns: 1fr;
    }

    .section-toolbar,
    .production-empty {
      flex-direction: column;
    }
  }
</style>
