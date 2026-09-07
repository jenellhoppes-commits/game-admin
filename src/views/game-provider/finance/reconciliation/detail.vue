<template>
  <div v-if="record" class="detail-page">
    <AppPageHeader :title="recordTitle" :eyebrow="recordEyebrow" :description="recordDescription">
      <template #actions>
        <ElTag :type="statusType(record.status)" effect="light">{{
          statusLabel(record.status)
        }}</ElTag>
        <ElButton v-if="isMerchant" :disabled="!canRecalculate" @click="recalculate"
          >重新計算</ElButton
        >
        <ElButton type="primary" :disabled="!canConfirm" @click="openConfirm">確認對帳</ElButton>
      </template>
    </AppPageHeader>

    <ElAlert v-if="record.unresolvedDifferenceCount" type="error" :closable="false" show-icon>
      <template #title
        >尚有 {{ record.unresolvedDifferenceCount }} 筆差異未完成處理，因此不能確認對帳。</template
      >
      <ElButton link type="danger" @click="openDifferences">前往差異處理</ElButton>
    </ElAlert>
    <ElAlert
      v-else-if="!canConfirm && record.status === 'Pending Confirmation'"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #title>{{ confirmBlockReason }}</template>
    </ElAlert>

    <div class="metric-grid">
      <div
        ><span>投注總額</span><strong>{{ money(record.betAmount) }}</strong
        ><small>{{ record.betCount.toLocaleString() }} 筆</small></div
      >
      <div
        ><span>有效投注</span><strong>{{ money(record.validBet) }}</strong
        ><small>{{ record.memberCount.toLocaleString() }} 位會員</small></div
      >
      <div
        ><span>派彩總額</span><strong>{{ money(record.payoutAmount) }}</strong
        ><small>含一般派彩</small></div
      >
      <div
        ><span>GGR</span><strong>{{ money(record.ggr) }}</strong
        ><small>投注減派彩</small></div
      >
      <div
        ><span>調整金額</span
        ><strong :class="{ danger: record.adjustmentAmount < 0 }">{{
          settlementMoney(record.adjustmentAmount)
        }}</strong
        ><small>差異調整加總</small></div
      >
      <div class="accent"
        ><span>最終應結</span><strong>{{ settlementMoney(record.finalSettlementAmount) }}</strong
        ><small
          >{{ record.snapshot.settlementBasis }} × {{ record.snapshot.ratePercent }}%</small
        ></div
      >
    </div>

    <ElCard shadow="never" class="content-card">
      <ElTabs v-model="activeTab">
        <ElTabPane label="對帳摘要" name="summary">
          <div class="section">
            <div class="section-heading"
              ><div><h2>資料範圍與對象</h2><p>本筆對帳採用的合作方、期間與結算條件。</p></div></div
            >
            <ElDescriptions :column="descriptionColumns" border>
              <ElDescriptionsItem label="對帳編號">{{ record.id }}</ElDescriptionsItem>
              <ElDescriptionsItem label="對帳期間"
                >{{ record.periodStart }} ～ {{ record.periodEnd }}</ElDescriptionsItem
              >
              <ElDescriptionsItem v-if="isMerchant" label="商戶"
                >{{ merchantRecord!.merchantCode }}｜{{
                  merchantRecord!.merchantName
                }}</ElDescriptionsItem
              >
              <ElDescriptionsItem v-if="isMerchant" label="商戶線路">{{
                merchantRecord!.lineUid
              }}</ElDescriptionsItem>
              <ElDescriptionsItem v-if="isMerchant || isAgent" label="代理">{{
                agentDisplay
              }}</ElDescriptionsItem>
              <ElDescriptionsItem v-if="isAgent" label="納入商戶數">{{
                agentRecord!.merchantCount
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="交易幣別">{{
                record.snapshot.transactionCurrency
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="結算幣別">{{
                record.snapshot.settlementCurrency
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="建立時間">{{ record.createdAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="更新時間">{{ record.updatedAt }}</ElDescriptionsItem>
            </ElDescriptions>
          </div>
        </ElTabPane>

        <ElTabPane v-if="isMerchant" label="每日彙總" name="daily">
          <ElTable :data="dailyRows" border>
            <ElTableColumn prop="date" label="日期" width="120" />
            <ElTableColumn prop="betCount" label="投注筆數" width="110" align="right" />
            <ElTableColumn label="投注總額" min-width="140" align="right"
              ><template #default="scope">{{ money(scope.row.betAmount) }}</template></ElTableColumn
            >
            <ElTableColumn label="有效投注" min-width="140" align="right"
              ><template #default="scope">{{ money(scope.row.validBet) }}</template></ElTableColumn
            >
            <ElTableColumn label="派彩" min-width="140" align="right"
              ><template #default="scope">{{
                money(scope.row.payoutAmount)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="GGR" min-width="130" align="right"
              ><template #default="scope">{{ money(scope.row.ggr) }}</template></ElTableColumn
            >
            <ElTableColumn label="應結金額" min-width="140" align="right"
              ><template #default="scope"
                ><strong>{{ settlementMoney(scope.row.settlementAmount) }}</strong></template
              ></ElTableColumn
            >
          </ElTable>
        </ElTabPane>

        <ElTabPane v-if="isMerchant" label="遊戲彙總" name="games">
          <ElTable :data="gameRows" border>
            <ElTableColumn label="遊戲" min-width="220"
              ><template #default="scope"
                ><strong>{{ scope.row.gameName }}</strong
                ><br /><small>{{ scope.row.gameCode }}</small></template
              ></ElTableColumn
            >
            <ElTableColumn prop="betCount" label="投注筆數" width="110" align="right" />
            <ElTableColumn label="有效投注" min-width="140" align="right"
              ><template #default="scope">{{ money(scope.row.validBet) }}</template></ElTableColumn
            >
            <ElTableColumn label="派彩" min-width="140" align="right"
              ><template #default="scope">{{
                money(scope.row.payoutAmount)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="GGR" min-width="130" align="right"
              ><template #default="scope">{{ money(scope.row.ggr) }}</template></ElTableColumn
            >
            <ElTableColumn label="應結金額" min-width="140" align="right"
              ><template #default="scope"
                ><strong>{{ settlementMoney(scope.row.settlementAmount) }}</strong></template
              ></ElTableColumn
            >
          </ElTable>
        </ElTabPane>

        <ElTabPane v-else-if="isAgent" label="商戶對帳" name="merchants">
          <ElTable :data="includedMerchants" border>
            <ElTableColumn label="商戶／線路" min-width="240"
              ><template #default="scope"
                ><button
                  class="primary-link"
                  type="button"
                  @click="router.push(`/finance/reconciliation/merchants/${scope.row.id}`)"
                  ><strong>{{ scope.row.merchantName }}</strong
                  ><small>{{ scope.row.lineUid }} · {{ scope.row.id }}</small></button
                ></template
              ></ElTableColumn
            >
            <ElTableColumn label="有效投注" min-width="140" align="right"
              ><template #default="scope">{{
                moneyWithCurrency(scope.row.validBet, scope.row.currency)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="GGR" min-width="130" align="right"
              ><template #default="scope">{{
                moneyWithCurrency(scope.row.ggr, scope.row.currency)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="狀態" width="115"
              ><template #default="scope"
                ><ElTag :type="statusType(scope.row.status)">{{
                  statusLabel(scope.row.status)
                }}</ElTag></template
              ></ElTableColumn
            >
          </ElTable>
        </ElTabPane>

        <ElTabPane label="結算單" name="settlement">
          <div class="section-heading">
            <div>
              <h2>本期結算結果</h2>
              <p>結算單直接附屬於對帳資料，不再另外建立獨立的結算管理層級。</p>
            </div>
            <ElTag :type="['Confirmed', 'Locked'].includes(record.status) ? 'success' : 'info'">
              {{ ['Confirmed', 'Locked'].includes(record.status) ? '已產生' : '待確認對帳' }}
            </ElTag>
          </div>
          <ElDescriptions :column="descriptionColumns" border>
            <ElDescriptionsItem label="結算單號">ST-{{ record.id }}</ElDescriptionsItem>
            <ElDescriptionsItem label="對帳期間">{{ record.period }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始應結">{{
              settlementMoney(record.initialSettlementAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="差異／尾差調整">{{
              settlementMoney(record.adjustmentAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="實收／實付金額">{{
              record.actualSettlementAmount === undefined
                ? '待確認'
                : settlementMoney(record.actualSettlementAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="最終結算金額">{{
              settlementMoney(record.finalSettlementAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="匯率快照">{{
              record.snapshot.exchangeRateSnapshotIds.join('、') || '同幣別，不需換匯'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="確認說明">{{
              record.confirmationNote || '—'
            }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElTabPane>

        <ElTabPane :label="`差異（${record.differenceCount}）`" name="differences">
          <div class="section-heading"
            ><div><h2>差異案件</h2><p>差異未清除前，對帳不能進入確認與結算。</p></div
            ><ElButton type="primary" plain @click="openDifferences">集中處理差異</ElButton></div
          >
          <ElTable :data="recordDifferences" border empty-text="本筆對帳沒有差異">
            <ElTableColumn prop="id" label="差異編號" width="135" />
            <ElTableColumn label="類型" width="120"
              ><template #default="scope">{{
                differenceTypeLabel(scope.row.type)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="系統值" min-width="140" align="right"
              ><template #default="scope">{{
                money(scope.row.systemValue)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="合作方值" min-width="140" align="right"
              ><template #default="scope">{{
                money(scope.row.partnerValue)
              }}</template></ElTableColumn
            >
            <ElTableColumn label="差異" min-width="130" align="right"
              ><template #default="scope"
                ><strong class="danger">{{ money(scope.row.differenceAmount) }}</strong></template
              ></ElTableColumn
            >
            <ElTableColumn label="狀態" width="110"
              ><template #default="scope">{{
                differenceStatusLabel(scope.row.status)
              }}</template></ElTableColumn
            >
          </ElTable>
        </ElTabPane>

        <ElTabPane label="計算快照" name="snapshot">
          <div class="section-heading"
            ><div
              ><h2>結算計算快照</h2
              ><p>固定保存當期費率、匯率、精度與公式版本，避免日後設定異動影響歷史結果。</p></div
            ></div
          >
          <ElDescriptions :column="descriptionColumns" border>
            <ElDescriptionsItem label="結算基礎">{{
              record.snapshot.settlementBasis
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="費率">{{ record.snapshot.ratePercent }}%</ElDescriptionsItem>
            <ElDescriptionsItem label="匯率"
              >1 {{ record.snapshot.transactionCurrency }} = {{ record.snapshot.exchangeRate }}
              {{ record.snapshot.settlementCurrency }}</ElDescriptionsItem
            >
            <ElDescriptionsItem label="匯率來源">{{
              record.snapshot.exchangeRateSource
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="匯率時間">{{
              record.snapshot.exchangeRateTime
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="金額精度"
              >小數 {{ record.snapshot.amountPrecision }} 位</ElDescriptionsItem
            >
            <ElDescriptionsItem label="捨入規則">{{
              record.snapshot.roundingRule
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="公式版本">{{
              record.snapshot.formulaVersion
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="計算時間">{{
              record.snapshot.calculatedAt
            }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElTabPane>

        <ElTabPane label="操作紀錄" name="logs">
          <ElTimeline>
            <ElTimelineItem v-for="log in logs" :key="log.id" :timestamp="log.time" placement="top">
              <strong>{{ log.action }}</strong
              ><p>{{ log.reason }}</p
              ><small>{{ log.before }} → {{ log.after }} · {{ log.operator }}</small>
            </ElTimelineItem>
          </ElTimeline>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog v-model="confirmVisible" title="確認對帳與實收／實付金額" width="min(560px, 92vw)">
      <ElAlert
        title="確認後會依輸入金額自動建立尾差增減紀錄，並產生本期結算單。"
        type="info"
        :closable="false"
        show-icon
      />
      <ElForm label-position="top" class="confirm-form">
        <ElFormItem label="平台計算應結金額">
          <ElInput :model-value="settlementMoney(record.finalSettlementAmount)" disabled />
        </ElFormItem>
        <ElFormItem label="實收／實付金額" required>
          <ElInputNumber
            v-model="confirmForm.actualAmount"
            :min="0"
            :precision="record.snapshot.amountPrecision"
            class="full"
          />
        </ElFormItem>
        <ElFormItem label="本次增減">
          <ElInput :model-value="settlementMoney(confirmAdjustment)" disabled />
        </ElFormItem>
        <ElFormItem
          :label="confirmAdjustment === 0 ? '確認備註' : '尾差原因'"
          :required="confirmAdjustment !== 0"
        >
          <ElInput
            v-model="confirmForm.note"
            type="textarea"
            :rows="3"
            placeholder="例如：依實際入帳金額去除尾數"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="confirmVisible = false">取消</ElButton>
        <ElButton type="primary" @click="confirm">確認並產生結算單</ElButton>
      </template>
    </ElDialog>
  </div>
  <ElResult v-else icon="warning" title="找不到對帳資料"
    ><template #extra
      ><ElButton type="primary" @click="router.back()">返回列表</ElButton></template
    ></ElResult
  >
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'

  defineOptions({ name: 'FinanceReconciliationDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useFinanceCenterStore()
  const { width } = useWindowSize()
  const isMerchant = computed(() => route.name === 'MerchantReconciliationDetail')
  const isAgent = computed(() => !isMerchant.value)
  const merchantRecord = computed(() =>
    isMerchant.value ? store.findMerchantReconciliation(String(route.params.id)) : undefined
  )
  const agentRecord = computed(() =>
    isAgent.value ? store.findAgentReconciliation(String(route.params.id)) : undefined
  )
  const record = computed(() => merchantRecord.value || agentRecord.value)
  const recordTitle = computed(
    () =>
      merchantRecord.value?.merchantName ||
      agentRecord.value?.agentName ||
      ''
  )
  const recordEyebrow = computed(() =>
    isMerchant.value ? '商戶對帳詳細' : '代理對帳詳細'
  )
  const recordDescription = computed(() =>
    record.value
      ? `${record.value.id} · ${record.value.period} · ${
          merchantRecord.value?.lineUid || agentRecord.value?.agentCode || ''
        }`
      : ''
  )
  const agentDisplay = computed(() => {
    const value = merchantRecord.value || agentRecord.value
    return value ? `${value.agentId}｜${value.agentName}` : '—'
  })
  const activeTab = ref('summary')
  const confirmVisible = ref(false)
  const confirmForm = reactive({ actualAmount: 0, note: '' })
  const descriptionColumns = computed(() => (width.value < 720 ? 1 : 2))
  const dailyRows = computed(() =>
    merchantRecord.value ? store.getDailyRows(merchantRecord.value) : []
  )
  const gameRows = computed(() =>
    merchantRecord.value ? store.getGameRows(merchantRecord.value) : []
  )
  const includedMerchants = computed(() =>
    agentRecord.value ? store.getIncludedMerchantReconciliations(agentRecord.value) : []
  )
  const recordDifferences = computed(() =>
    record.value ? store.getDifferences(record.value.id) : []
  )
  const logs = computed(() => (record.value ? store.getLogs(record.value.id) : []))
  const confirmAdjustment = computed(() =>
    record.value
      ? Number((confirmForm.actualAmount - record.value.finalSettlementAmount).toFixed(2))
      : 0
  )
  const canRecalculate = computed(() =>
    Boolean(
      merchantRecord.value &&
        !['Confirmed', 'Locked', 'Cancelled'].includes(merchantRecord.value.status)
    )
  )
  const confirmBlockReason = computed(() => {
    if (!agentRecord.value) return ''
    const incomplete = includedMerchants.value.filter(
      (item) => !['Confirmed', 'Locked'].includes(item.status)
    ).length
    return incomplete ? `仍有 ${incomplete} 筆商戶對帳尚未確認，代理對帳暫時不能確認。` : ''
  })
  const canConfirm = computed(() => {
    if (
      !record.value ||
      record.value.unresolvedDifferenceCount > 0 ||
      ['Confirmed', 'Locked', 'Cancelled'].includes(record.value.status)
    )
      return false
    if (agentRecord.value)
      return includedMerchants.value.every((item) => ['Confirmed', 'Locked'].includes(item.status))
    return true
  })
  const moneyWithCurrency = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const money = (value: number) => moneyWithCurrency(value, record.value?.currency || '')
  const settlementMoney = (value: number) =>
    moneyWithCurrency(value, record.value?.snapshot.settlementCurrency || '')
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Confirmation': '待確認',
      Difference: '有差異',
      Confirmed: '已確認',
      Locked: '已鎖定',
      Cancelled: '已取消'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Difference'
      ? 'danger'
      : status === 'Pending Confirmation'
        ? 'warning'
        : status === 'Confirmed'
          ? 'success'
          : status === 'Locked'
            ? 'info'
            : 'primary'
  const differenceTypeLabel = (type: string) =>
    ({
      'Bet Amount': '投注金額',
      'Payout Amount': '派彩金額',
      'Valid Bet': '有效投注',
      Jackpot: '獎池',
      Refund: '退款',
      'Exchange Rate': '匯率',
      Fee: '費用',
      Other: '其他'
    })[type] || type
  const differenceStatusLabel = (status: string) =>
    ({
      Open: '待處理',
      Investigating: '調查中',
      'Waiting Partner': '等待合作方',
      'Waiting Internal': '等待內部',
      Resolved: '已解決',
      Accepted: '已接受',
      Closed: '已關閉'
    })[status] || status
  const openDifferences = () =>
    router.push({
      path: '/finance/reconciliation/differences',
      query: { reconciliationId: record.value?.id }
    })
  const recalculate = () => {
    if (record.value && store.recalculateMerchant(record.value.id))
      ElMessage.success('已重新計算並更新快照')
  }
  const openConfirm = () => {
    if (!record.value || !canConfirm.value) return
    confirmForm.actualAmount = record.value.finalSettlementAmount
    confirmForm.note = ''
    confirmVisible.value = true
  }
  const confirm = () => {
    if (!record.value || (confirmAdjustment.value !== 0 && !confirmForm.note.trim()))
      return ElMessage.warning('有增減金額時，請填寫尾差原因')
    const success = isMerchant.value
        ? store.confirmMerchant(record.value.id, confirmForm.actualAmount, confirmForm.note)
        : store.confirmAgent(record.value.id, confirmForm.actualAmount, confirmForm.note)
    if (success) {
      confirmVisible.value = false
      activeTab.value = 'settlement'
      ElMessage.success('對帳已確認，結算單已產生')
    } else ElMessage.error('尚未符合確認條件')
  }
</script>

<style scoped lang="scss">
  .detail-page {
    display: grid;
    gap: 16px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .metric-grid > div {
    display: grid;
    gap: 5px;
    padding: 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .metric-grid .accent {
    border-color: var(--el-color-primary-light-5);
  }

  .metric-grid span,
  .metric-grid small,
  .section-heading p,
  .primary-link small,
  .el-timeline p,
  .el-timeline small {
    color: var(--art-gray-500);
  }

  .metric-grid strong {
    font-size: 18px;
    color: var(--art-gray-900);
  }

  .danger {
    color: var(--el-color-danger) !important;
  }

  .content-card :deep(.el-card__body) {
    padding-top: 4px;
  }

  .confirm-form {
    margin-top: 18px;
  }

  .full {
    width: 100%;
  }

  .section {
    display: grid;
    gap: 16px;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 10px 0 16px;
  }

  .section-heading h2 {
    margin: 0 0 5px;
    font-size: 17px;
  }

  .section-heading p,
  .el-timeline p {
    margin: 0;
  }

  .primary-link {
    display: grid;
    gap: 4px;
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
  }

  @media (width <= 1180px) {
    .metric-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (width <= 680px) {
    .metric-grid {
      grid-template-columns: 1fr;
    }

    .section-heading {
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
    }
  }
</style>
