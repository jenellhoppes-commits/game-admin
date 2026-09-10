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
        <ElButton type="primary" :disabled="!canConfirm" @click="openConfirm">核帳／交付</ElButton>
        <ElButton v-if="record.status === 'Locked'" @click="correctionVisible = true"
          >上期退款／回調</ElButton
        >
      </template>
    </AppPageHeader>
    <ElDescriptions v-if="record.collection" :column="descriptionColumns" border>
      <ElDescriptionsItem label="收付模式"
        ><ElSelect
          :model-value="record.collection.mode"
          :disabled="['Locked', 'Cancelled'].includes(record.status)"
          @update:model-value="changeCollectionMode"
          ><ElOption label="代理統收" value="AgentCollect" /><ElOption
            label="平台代收"
            value="PlatformCollect" /></ElSelect
      ></ElDescriptionsItem>
      <ElDescriptionsItem label="付款方">{{ record.collection.payerName }}</ElDescriptionsItem>
      <ElDescriptionsItem label="收款方">{{ record.collection.payeeName }}</ElDescriptionsItem>
      <ElDescriptionsItem label="適用期間"
        >{{ record.periodStart }} 起（本單據）</ElDescriptionsItem
      >
    </ElDescriptions>

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
              {{
                record.retainedForNextPeriod
                  ? '已保留至下期'
                  : ['Confirmed', 'Locked'].includes(record.status)
                    ? '已產生'
                    : '待確認對帳'
              }}
            </ElTag>
          </div>
          <ElDescriptions :column="descriptionColumns" border>
            <ElDescriptionsItem label="收付狀態">{{
              record.delivery
                ? { Unpaid: '未收付', Partial: '部分收付', Paid: '已收付', Carried: '已結轉下期' }[
                    record.delivery.paymentStatus
                  ] || record.delivery.paymentStatus
                : '未收付'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem v-if="record.delivery" label="差異調整金額">{{
              settlementMoney(record.delivery.adjustment)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem v-if="record.delivery" label="調整後應結金額">{{
              settlementMoney(record.delivery.adjusted)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem v-if="record.delivery" label="剩餘未收／未付">{{
              settlementMoney(record.delivery.remaining)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem
              v-if="record.delivery?.nextGgr !== undefined"
              label="結轉下期 GGR"
              >{{ money(record.delivery.nextGgr) }}</ElDescriptionsItem
            >
            <ElDescriptionsItem label="結算單號">ST-{{ record.id }}</ElDescriptionsItem>
            <ElDescriptionsItem label="對帳期間">{{ record.period }}</ElDescriptionsItem>
            <ElDescriptionsItem label="結算方式">{{
              record.settlementMode || '未設定'
            }}</ElDescriptionsItem
            ><ElDescriptionsItem label="上期累積金額">{{
              record.previousAccumulatedAmount === undefined
                ? '待定'
                : settlementMoney(record.previousAccumulatedAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="原始應結">{{
              settlementMoney(record.initialSettlementAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="既有計算調整">{{
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
            <ElDescriptionsItem v-if="record.retainedForNextPeriod" label="保留至下期金額">{{
              settlementMoney(record.retainedSettlementAmount ?? record.finalSettlementAmount)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="匯率快照">{{
              record.snapshot.exchangeRateSnapshotIds.join('、') || '同幣別，不需換匯'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="確認說明">{{
              record.confirmationNote || '—'
            }}</ElDescriptionsItem>
          </ElDescriptions>
          <ElDivider>計算依據（當期快照）</ElDivider>

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

    <ElDialog v-model="confirmVisible" title="財務核帳／交付" width="min(560px, 92vw)">
      <ElAlert
        title="核對系統應結後，手動輸入差異與實收／實付。確認交付即鎖定原單；未收付部分可累積至下期。"
        type="info"
        :closable="false"
        show-icon
      />
      <ElForm label-position="top" class="confirm-form">
        <ElFormItem label="系統應結金額">
          <ElInput :model-value="settlementMoney(deliveryBase)" disabled />
          <small v-if="record.priorCorrections?.length"
            >含上期退款／回調 {{ settlementMoney(priorAmount) }}</small
          >
        </ElFormItem>
        <ElFormItem label="差異調整金額">
          <ElInputNumber
            v-model="confirmForm.adjustment"
            :precision="record.snapshot.amountPrecision"
            class="full"
          />
        </ElFormItem>
        <ElFormItem label="調整後應結金額"
          ><ElInput :model-value="settlementMoney(adjustedAmount)" disabled
        /></ElFormItem>
        <ElFormItem label="實際收款方" required
          ><ElSelect v-model="actualCollector"
            ><ElOption label="遊戲商平台" value="PLATFORM" /><ElOption
              v-if="record.collection && record.collection.payeeId !== 'PLATFORM'"
              :label="record.collection.payeeName"
              :value="record.collection.payeeId" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="實收／實付金額" required>
          <ElInputNumber
            :model-value="confirmForm.actualAmount"
            @update:model-value="confirmForm.actualAmount = Math.trunc($event ?? 0)"
            :min="0"
            :step="1"
            class="full"
          />
          <small>所有幣別均以整數交付，小數直接捨去。</small>
        </ElFormItem>
        <ElFormItem label="剩餘未收／未付金額">
          <ElInput :model-value="settlementMoney(remainingAmount)" disabled />
        </ElFormItem>
        <ElFormItem
          :label="confirmForm.adjustment === 0 ? '交付備註' : '差異調整原因'"
          :required="confirmForm.adjustment !== 0"
        >
          <ElInput
            v-model="confirmForm.note"
            type="textarea"
            :rows="3"
            placeholder="請填寫財務核帳調整依據"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="confirm-actions">
          <ElButton @click="confirmVisible = false">取消</ElButton>
          <ElButton :disabled="!canConfirm" @click="retain">保留至下期</ElButton>
          <ElButton type="primary" @click="confirm">確認交付並鎖定</ElButton>
        </div>
      </template>
    </ElDialog>
    <ElDialog v-model="correctionVisible" title="上期退款／回調" width="min(560px, 95vw)">
      <ElForm label-position="top">
        <ElFormItem label="後續未確認對帳單" required
          ><ElSelect v-model="correction.targetId" style="width: 100%"
            ><ElOption
              v-for="item in correctionTargets"
              :key="item.id"
              :value="item.id"
              :label="`${item.period} · ${item.id}`" /></ElSelect
        ></ElFormItem>
        <p v-if="!correctionTargets.length"
          >目前沒有符合對象、線路及幣別的後續單據，請先產生後續期間結算單。</p
        >
        <ElFormItem label="退款／回調金額（正負調整）" required
          ><ElInputNumber v-model="correction.amount" :precision="record.snapshot.amountPrecision"
        /></ElFormItem>
        <ElFormItem label="原因" required
          ><ElInput v-model="correction.reason" type="textarea"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="correctionVisible = false">取消</ElButton
        ><ElButton type="primary" :disabled="!correction.targetId" @click="saveCorrection"
          >記入後續單據</ElButton
        ></template
      >
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
  const priorAmount = computed(() =>
    (record.value?.priorCorrections || []).reduce((sum, item) => sum + item.amount, 0)
  )
  const deliveryBase = computed(
    () => (record.value?.finalSettlementAmount || 0) + priorAmount.value
  )
  const correctionVisible = ref(false)
  const correction = reactive({ targetId: '', amount: 0, reason: '' })
  const correctionTargets = computed(() => {
    const source = record.value
    if (!source) return []
    return (isMerchant.value ? store.merchantReconciliations : store.agentReconciliations).filter(
      (item) =>
        !['Locked', 'Cancelled', 'Confirmed'].includes(item.status) &&
        item.periodStart > source.periodEnd &&
        item.agentId === source.agentId &&
        item.currency === source.currency &&
        item.snapshot.settlementCurrency === source.snapshot.settlementCurrency &&
        (!('merchantId' in source) ||
          ('merchantId' in item &&
            item.merchantId === source.merchantId &&
            item.lineUid === source.lineUid))
    )
  })
  const saveCorrection = () => {
    if (!record.value) return
    try {
      store.addPriorCorrection(
        record.value.id,
        correction.targetId,
        correction.amount,
        correction.reason
      )
      correctionVisible.value = false
      Object.assign(correction, { targetId: '', amount: 0, reason: '' })
      ElMessage.success('已記入後續單據，原單保持鎖定')
    } catch (error) {
      ElMessage.warning(error instanceof Error ? error.message : '回調失敗')
    }
  }
  const recordTitle = computed(
    () => merchantRecord.value?.merchantName || agentRecord.value?.agentName || ''
  )
  const recordEyebrow = computed(() => (isMerchant.value ? '商戶對帳詳細' : '代理對帳詳細'))
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
  const confirmForm = reactive({ actualAmount: 0, adjustment: 0, note: '' })
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
  const logs = computed(() => (record.value ? store.getLogs(record.value.id) : []))
  const adjustedAmount = computed(() =>
    Number(
      (deliveryBase.value + (confirmForm.adjustment || 0)).toFixed(
        record.value?.snapshot.amountPrecision ?? 2
      )
    )
  )
  const remainingAmount = computed(() =>
    Number(
      (Math.max(0, adjustedAmount.value) - (confirmForm.actualAmount || 0)).toFixed(
        record.value?.snapshot.amountPrecision ?? 2
      )
    )
  )
  const canRecalculate = computed(() =>
    Boolean(
      merchantRecord.value &&
        !['Confirmed', 'Locked', 'Cancelled'].includes(merchantRecord.value.status)
    )
  )
  const actualCollector = ref('PLATFORM')
  const changeCollectionMode = (mode: 'AgentCollect' | 'PlatformCollect') => {
    if (!record.value) return
    try {
      store.setCollectionMode(record.value.id, mode)
      ElMessage.success('本期模式已更新，歷史鎖定單不變')
    } catch (e) {
      ElMessage.warning(e instanceof Error ? e.message : '更新失敗')
    }
  }
  const canConfirm = computed(() =>
    Boolean(record.value && !['Locked', 'Cancelled'].includes(record.value.status))
  )
  const moneyWithCurrency = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const money = (value: number) => moneyWithCurrency(value, record.value?.currency || '')
  const settlementMoney = (value: number) =>
    moneyWithCurrency(value, record.value?.snapshot.settlementCurrency || '')
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Confirmation': '待確認',
      Difference: '待確認',
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
  const recalculate = () => {
    if (record.value && store.recalculateMerchant(record.value.id))
      ElMessage.success('已重新計算並更新快照')
  }
  const openConfirm = () => {
    actualCollector.value = 'PLATFORM'
    if (!record.value || !canConfirm.value) return
    confirmForm.actualAmount = 0
    confirmForm.adjustment = 0
    confirmForm.note = ''
    confirmVisible.value = true
  }
  const deliver = (retain: boolean) => {
    if (!record.value || !canConfirm.value) return
    try {
      store.deliverReconciliation(
        record.value.id,
        confirmForm.adjustment,
        confirmForm.actualAmount,
        confirmForm.note,
        retain,
        'PLATFORM',
        actualCollector.value
      )
      confirmVisible.value = false
      activeTab.value = 'settlement'
      ElMessage.success('交付已確認，單據已鎖定')
    } catch (error) {
      ElMessage.warning(error instanceof Error ? error.message : '交付失敗')
    }
  }
  const confirm = () => deliver(false)
  const retain = () => deliver(true)
</script>

<style scoped lang="scss">
  .detail-page {
    display: grid;
    grid-auto-rows: max-content;
    gap: 16px;
    align-content: start;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .metric-grid > div {
    display: grid;
    gap: 5px;
    align-content: start;
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

  .confirm-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .confirm-actions :deep(.el-button) {
    margin-left: 0;
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
