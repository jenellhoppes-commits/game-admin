<template>
  <div v-if="batch" class="page">
    <AppPageHeader
      :title="batch.name"
      eyebrow="結算批次詳細"
      :description="`${batch.id} · ${batch.period} · ${cycleLabel(batch.cycle)}`"
    >
      <template #actions
        ><ElTag :type="statusType(batch.status)">{{ statusLabel(batch.status) }}</ElTag
        ><ElButton v-if="batch.status === 'Draft'" type="primary" @click="submit">送出審核</ElButton
        ><ElButton v-if="batch.status === 'Pending Review'" type="primary" @click="approve"
          >核准批次</ElButton
        ><ElButton v-if="batch.status === 'Approved'" type="primary" @click="complete"
          >完成結算</ElButton
        ></template
      >
    </AppPageHeader>

    <ElAlert
      v-if="batch.status === 'Draft'"
      type="info"
      :closable="false"
      show-icon
      title="送出前請確認結算單、匯率快照與調整項目；送出後進入財務覆核。"
    />
    <div class="metric-grid">
      <div
        ><span>商戶結算單</span><strong>{{ merchantRows.length }}</strong
        ><small>納入商戶線路</small></div
      >
      <div
        ><span>代理結算單</span><strong>{{ agentRows.length }}</strong
        ><small>代理層級彙總</small></div
      >
      <div
        ><span>原始應結</span><strong>{{ money(batch.totalAmount) }}</strong
        ><small>調整前金額</small></div
      >
      <div
        ><span>調整金額</span><strong>{{ money(batch.adjustmentAmount) }}</strong
        ><small>{{ adjustmentRows.length }} 筆項目</small></div
      >
      <div class="accent"
        ><span>最終應結</span><strong>{{ money(batch.finalAmount) }}</strong
        ><small>批次付款依據</small></div
      >
    </div>

    <ElCard shadow="never" class="content-card">
      <ElTabs v-model="activeTab">
        <ElTabPane label="批次摘要" name="summary">
          <ElDescriptions :column="columns" border>
            <ElDescriptionsItem label="批次編號">{{ batch.id }}</ElDescriptionsItem
            ><ElDescriptionsItem label="批次名稱">{{ batch.name }}</ElDescriptionsItem>
            <ElDescriptionsItem label="對帳期間"
              >{{ batch.periodStart }} ～ {{ batch.periodEnd }}</ElDescriptionsItem
            ><ElDescriptionsItem label="結算週期">{{ cycleLabel(batch.cycle) }}</ElDescriptionsItem>
            <ElDescriptionsItem label="結算幣別">{{ batch.settlementCurrency }}</ElDescriptionsItem
            ><ElDescriptionsItem label="匯率快照"
              >{{ exchangeRows.length }} 筆，均已鎖定</ElDescriptionsItem
            >
            <ElDescriptionsItem label="建立人員">{{ batch.createdBy }}</ElDescriptionsItem
            ><ElDescriptionsItem label="建立時間">{{ batch.createdAt }}</ElDescriptionsItem>
            <ElDescriptionsItem label="核准人員">{{ batch.approvedBy || '—' }}</ElDescriptionsItem
            ><ElDescriptionsItem label="核准時間">{{ batch.approvedAt || '—' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="完成時間">{{ batch.completedAt || '—' }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElTabPane>
        <ElTabPane :label="`商戶結算單（${merchantRows.length}）`" name="merchants"
          ><SettlementTable :rows="merchantRows" type="merchant"
        /></ElTabPane>
        <ElTabPane :label="`代理結算單（${agentRows.length}）`" name="agents"
          ><SettlementTable :rows="agentRows" type="agent"
        /></ElTabPane>
        <ElTabPane :label="`匯率快照（${exchangeRows.length}）`" name="exchange">
          <ElTable :data="exchangeRows" border
            ><ElTableColumn prop="id" label="快照編號" width="130" /><ElTableColumn
              label="幣別對"
              min-width="140"
              ><template #default="scope"
                >{{ scope.row.fromCurrency }} → {{ scope.row.toCurrency }}</template
              ></ElTableColumn
            ><ElTableColumn prop="rate" label="匯率" min-width="130" /><ElTableColumn
              prop="source"
              label="來源"
              min-width="150" /><ElTableColumn
              prop="rateTime"
              label="取值時間"
              width="160" /><ElTableColumn label="狀態" width="100"
              ><template #default="scope"
                ><ElTag type="success">{{
                  scope.row.status === 'Locked' ? '已鎖定' : '預估'
                }}</ElTag></template
              ></ElTableColumn
            ><ElTableColumn prop="lockedBy" label="鎖定人員" min-width="140"
          /></ElTable>
        </ElTabPane>
        <ElTabPane :label="`調整項目（${adjustmentRows.length}）`" name="adjustments">
          <ElTable :data="adjustmentRows" border
            ><ElTableColumn prop="id" label="調整編號" width="130" /><ElTableColumn
              prop="targetName"
              label="對象"
              min-width="160"
            /><ElTableColumn label="類型" min-width="150"
              ><template #default="scope">{{
                adjustmentTypeLabel(scope.row.type)
              }}</template></ElTableColumn
            ><ElTableColumn label="方向" width="90"
              ><template #default="scope">{{
                scope.row.direction === 'Credit' ? '加項' : '減項'
              }}</template></ElTableColumn
            ><ElTableColumn label="金額" min-width="140" align="right"
              ><template #default="scope">{{ money(scope.row.amount) }}</template></ElTableColumn
            ><ElTableColumn prop="reason" label="原因" min-width="240" /><ElTableColumn
              label="狀態"
              width="110"
              ><template #default="scope">{{
                adjustmentStatusLabel(scope.row.status)
              }}</template></ElTableColumn
            ></ElTable
          >
        </ElTabPane>
        <ElTabPane label="異動紀錄" name="logs"
          ><ElTimeline
            ><ElTimelineItem v-for="log in logs" :key="log.id" :timestamp="log.time" placement="top"
              ><strong>{{ log.action }}</strong
              ><p>{{ log.reason }}</p
              ><small
                >{{ log.before }} → {{ log.after }} · {{ log.operator }}</small
              ></ElTimelineItem
            ></ElTimeline
          ></ElTabPane
        >
      </ElTabs>
    </ElCard>
  </div>
  <ElResult v-else icon="warning" title="找不到結算批次"
    ><template #extra
      ><ElButton type="primary" @click="router.back()">返回列表</ElButton></template
    ></ElResult
  >
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import SettlementTable from '../statements/settlement-table.vue'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'

  defineOptions({ name: 'SettlementBatchDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useFinanceCenterStore()
  const { width } = useWindowSize()
  const batch = computed(() => store.findSettlementBatch(String(route.params.id)))
  const merchantRows = computed(() =>
    batch.value ? store.getMerchantStatements(batch.value.id) : []
  )
  const agentRows = computed(() => (batch.value ? store.getAgentStatements(batch.value.id) : []))
  const exchangeRows = computed(() =>
    batch.value ? store.getExchangeSnapshots(batch.value.id) : []
  )
  const adjustmentRows = computed(() =>
    batch.value ? store.getSettlementAdjustments(batch.value.id) : []
  )
  const logs = computed(() => (batch.value ? store.getLogs(batch.value.id) : []))
  const columns = computed(() => (width.value < 700 ? 1 : 2))
  const activeTab = ref('summary')
  const money = (value: number) =>
    `${batch.value?.settlementCurrency || ''} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const cycleLabel = (cycle: string) =>
    ({ Daily: '每日', Weekly: '每週', Semimonthly: '每半月', Monthly: '每月' })[cycle] || cycle
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Review': '待審核',
      Approved: '已核准',
      Processing: '處理中',
      Completed: '已完成',
      Failed: '失敗',
      Cancelled: '已取消'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Completed'
      ? 'success'
      : status === 'Approved'
        ? 'primary'
        : status === 'Pending Review'
          ? 'warning'
          : status === 'Failed'
            ? 'danger'
            : 'info'
  const adjustmentTypeLabel = (type: string) =>
    ({
      'Reconciliation Difference': '對帳差異',
      Manual: '人工調整',
      Fee: '費用',
      Compensation: '補償',
      Other: '其他'
    })[type] || type
  const adjustmentStatusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Review': '待審核',
      Approved: '已核准',
      Rejected: '已駁回',
      Applied: '已套用'
    })[status] || status
  const submit = () =>
    store.submitSettlementBatch(batch.value!.id)
      ? ElMessage.success('批次已送出審核')
      : ElMessage.error('批次尚未符合送審條件')
  const approve = async () => {
    await ElMessageBox.confirm('核准後批次即可執行結算，是否繼續？', '核准結算批次', {
      type: 'warning'
    })
    store.approveSettlementBatch(batch.value!.id)
    ElMessage.success('結算批次已核准')
  }
  const complete = async () => {
    await ElMessageBox.confirm(
      '完成後將標記結算單為已付款，並鎖定來源對帳，是否繼續？',
      '完成結算',
      { type: 'warning' }
    )
    store.completeSettlementBatch(batch.value!.id)
    ElMessage.success('結算已完成')
  }
</script>

<style scoped lang="scss">
  .page {
    display: grid;
    gap: 16px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
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

  .metric-grid span,
  .metric-grid small,
  .el-timeline p,
  .el-timeline small {
    color: var(--art-gray-500);
  }

  .metric-grid strong {
    font-size: 20px;
  }

  .metric-grid .accent {
    border-color: var(--el-color-primary-light-5);
  }

  .content-card :deep(.el-card__body) {
    padding-top: 4px;
  }

  .el-timeline p {
    margin: 4px 0;
  }

  @media (width <= 1050px) {
    .metric-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (width <= 620px) {
    .metric-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
