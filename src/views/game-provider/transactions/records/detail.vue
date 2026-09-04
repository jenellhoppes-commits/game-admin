<template>
  <div v-if="transaction" class="transaction-detail-page">
    <ElCard class="hero-card" shadow="never">
      <AppPageHeader
        :title="transaction.id"
        eyebrow="交易詳細"
        :description="`外部參考號：${transaction.externalReference}`"
      >
        <template #status>
          <ElTag :type="transactionStatusType(transaction.status)" effect="light" round>{{
            transactionStatusLabel(transaction.status)
          }}</ElTag>
          <ElTag :type="riskType(transaction.riskStatus)" effect="plain" round>{{
            riskLabel(transaction.riskStatus)
          }}</ElTag>
        </template>
        <template #meta>
          <div class="hero-meta">
            <span><ArtSvgIcon icon="ri:user-line" />{{ transaction.externalMemberId }}</span>
            <span><ArtSvgIcon icon="ri:store-2-line" />{{ transaction.merchantName }}</span>
            <span><ArtSvgIcon icon="ri:route-line" />{{ transaction.lineUid }}</span>
            <span
              ><ArtSvgIcon icon="ri:wallet-3-line" />{{
                walletModeLabel(transaction.walletMode)
              }}</span
            >
          </div>
        </template>
        <template #actions>
          <ElButton @click="router.push('/transactions/records')">返回列表</ElButton>
          <ElButton
            @click="router.push(`/members/management/${transaction.memberId}?tab=transactions`)"
            >查看會員</ElButton
          >
          <ElButton
            v-if="relatedBet"
            type="primary"
            @click="router.push(`/transactions/bets/${relatedBet.id}`)"
            >查看關聯注單</ElButton
          >
        </template>
      </AppPageHeader>
    </ElCard>

    <div class="summary-grid">
      <ElCard v-for="item in summary" :key="item.label" shadow="never">
        <span>{{ item.label }}</span
        ><strong :class="item.className">{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </ElCard>
    </div>

    <ElCard class="tabs-card" shadow="never">
      <ElTabs v-model="activeTab" @tab-change="syncTab">
        <ElTabPane label="基本資料" name="overview">
          <div class="tab-panel overview-grid">
            <section class="section-block">
              <div class="section-title"
                ><div><h3>交易識別</h3><p>交易來源、會員與商戶線路關聯。</p></div></div
              >
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem label="交易編號">{{ transaction.id }}</ElDescriptionsItem>
                <ElDescriptionsItem label="外部參考號">{{
                  transaction.externalReference
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="交易類型">{{
                  transactionTypeLabel(transaction.type)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="交易方向">{{
                  transaction.amount >= 0 ? '入帳' : '扣款'
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="會員">
                  <EntityLink
                    :label="transaction.externalMemberId"
                    :secondary="transaction.memberId"
                    :to="`/members/management/${transaction.memberId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="商戶">
                  <EntityLink
                    :label="transaction.merchantName"
                    :secondary="transaction.merchantId"
                    :to="`/business/merchants/${transaction.merchantId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="所屬代理">
                  <EntityLink
                    :label="transaction.agentName"
                    :secondary="transaction.agentId"
                    :to="`/business/agents/${transaction.agentId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="線路 UID">{{ transaction.lineUid }}</ElDescriptionsItem>
                <ElDescriptionsItem label="錢包模式">{{
                  walletModeLabel(transaction.walletMode)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="交易幣別">{{ transaction.currency }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立時間">{{ transaction.time }}</ElDescriptionsItem>
                <ElDescriptionsItem label="完成時間">{{
                  transaction.completedAt || '處理中'
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>

            <section class="section-block">
              <div class="section-title"
                ><div><h3>餘額快照</h3><p>顯示此筆交易前後的錢包餘額。</p></div></div
              >
              <div class="balance-flow">
                <div
                  ><span>交易前</span><strong>{{ money(transaction.beforeBalance) }}</strong
                  ><small>{{ transaction.currency }}</small></div
                >
                <ArtSvgIcon icon="ri:arrow-right-line" class="flow-arrow" />
                <div class="amount-change"
                  ><span>{{ transaction.amount >= 0 ? '入帳' : '扣款' }}</span
                  ><strong :class="transaction.amount >= 0 ? 'positive' : 'negative'">{{
                    signedMoney(transaction.amount)
                  }}</strong
                  ><small>{{ transaction.currency }}</small></div
                >
                <ArtSvgIcon icon="ri:arrow-right-line" class="flow-arrow" />
                <div
                  ><span>交易後</span><strong>{{ money(transaction.afterBalance) }}</strong
                  ><small>{{ transaction.currency }}</small></div
                >
              </div>
              <ElAlert
                title="此處為交易完成當下的餘額快照，不代表會員目前即時餘額。"
                type="info"
                :closable="false"
                show-icon
              />
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="交易歷程" name="history">
          <div class="tab-panel history-layout">
            <div class="section-title"
              ><div><h3>狀態歷程</h3><p>從接收請求到錢包最終回應的時間線。</p></div></div
            >
            <ElTimeline>
              <ElTimelineItem
                v-for="entry in transaction.history"
                :key="entry.id"
                :timestamp="entry.time"
                :type="transactionStatusType(entry.status)"
                placement="top"
              >
                <ElCard shadow="never" class="history-card">
                  <div class="history-heading"
                    ><strong>{{ entry.action }}</strong
                    ><ElTag :type="transactionStatusType(entry.status)" size="small">{{
                      transactionStatusLabel(entry.status)
                    }}</ElTag></div
                  >
                  <p>{{ entry.note }}</p
                  ><small>處理來源：{{ entry.operator }}</small>
                </ElCard>
              </ElTimelineItem>
            </ElTimeline>
          </div>
        </ElTabPane>

        <ElTabPane label="關聯注單" name="bets">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>關聯注單</h3><p>透過局號與會員識別碼關聯。</p></div></div
            >
            <ElTable :data="relatedBet ? [relatedBet] : []" border empty-text="此交易沒有關聯注單">
              <ElTableColumn label="注單編號" width="130"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.id"
                    :to="`/transactions/bets/${scope.row.id}`" /></template
              ></ElTableColumn>
              <ElTableColumn prop="roundId" label="局號" min-width="180" />
              <ElTableColumn label="遊戲" min-width="180"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.gameName"
                    :secondary="scope.row.gameId"
                    :to="`/games/management/${scope.row.gameId}`" /></template
              ></ElTableColumn>
              <ElTableColumn label="投注／派彩" min-width="170" align="right"
                ><template #default="scope"
                  >{{ money(scope.row.betAmount) }}／{{ money(scope.row.payoutAmount) }}
                  {{ scope.row.currency }}</template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><ElTag :type="betStatusType(scope.row.status)">{{
                    betStatusLabel(scope.row.status)
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn prop="time" label="投注時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="異常紀錄" name="anomalies">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>交易異常</h3><p>異常處置與案件狀態統一由風控中心管理。</p></div></div
            >
            <ElTable :data="anomalies" border empty-text="此交易尚無異常紀錄">
              <ElTableColumn prop="id" label="異常編號" width="120" />
              <ElTableColumn prop="type" label="異常類型" min-width="190" />
              <ElTableColumn label="風險等級" width="100"
                ><template #default="scope"
                  ><ElTag :type="scope.row.riskLevel === 'High' ? 'danger' : 'warning'">{{
                    scope.row.riskLevel === 'High'
                      ? '高'
                      : scope.row.riskLevel === 'Medium'
                        ? '中'
                        : '低'
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn label="關聯注單" width="130"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.betId"
                    :label="scope.row.betId"
                    :to="`/transactions/bets/${scope.row.betId}`"
                  /><span v-else>—</span></template
                ></ElTableColumn
              >
              <ElTableColumn label="風控案件" width="130"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.riskCaseId"
                    :label="scope.row.riskCaseId"
                    :to="`/risk/cases/${scope.row.riskCaseId}`"
                  /><span v-else>尚未建案</span></template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope">{{
                  anomalyStatusLabel(scope.row.status)
                }}</template></ElTableColumn
              >
              <ElTableColumn prop="occurredAt" label="發生時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>

  <ElResult v-else icon="warning" title="找不到交易資料" sub-title="請確認交易編號是否正確。">
    <template #extra
      ><ElButton type="primary" @click="router.push('/transactions/records')"
        >返回交易列表</ElButton
      ></template
    >
  </ElResult>
</template>

<script setup lang="ts">
  import { ElButton, ElTag } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    MemberBetStatus,
    MemberTransactionStatus,
    MemberTransactionType,
    WalletMode
  } from '@/types/game-provider'
  import { useTransactionCenterStore } from '@/store/modules/transactionCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'TransactionDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useTransactionCenterStore()
  const { width } = useWindowSize()
  const activeTab = ref(String(route.query.tab || 'overview'))
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const transaction = computed(() => store.findTransaction(String(route.params.id)))
  const relatedBet = computed(() =>
    transaction.value?.betId ? store.findBet(transaction.value.betId) : undefined
  )
  const anomalies = computed(() =>
    transaction.value ? store.getTransactionAnomalies(transaction.value.id) : []
  )
  const summary = computed(() =>
    transaction.value
      ? [
          {
            label: '交易金額',
            value: `${signedMoney(transaction.value.amount)} ${transaction.value.currency}`,
            note: transactionTypeLabel(transaction.value.type),
            className: transaction.value.amount >= 0 ? 'positive' : 'negative'
          },
          {
            label: '交易前餘額',
            value: `${money(transaction.value.beforeBalance)} ${transaction.value.currency}`,
            note: '交易發生前快照'
          },
          {
            label: '交易後餘額',
            value: `${money(transaction.value.afterBalance)} ${transaction.value.currency}`,
            note: '交易完成後快照'
          },
          {
            label: '歷程節點',
            value: transaction.value.history.length,
            note: transaction.value.completedAt ? '交易流程已結束' : '交易仍在處理中'
          }
        ]
      : []
  )
  const money = (value: number) =>
    new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value
    )
  const signedMoney = (value: number) => `${value >= 0 ? '+' : ''}${money(value)}`
  const walletModeLabel = (mode: WalletMode) => (mode === 'Seamless' ? '單一錢包' : '轉帳錢包')
  const transactionTypeLabel = (type: MemberTransactionType) =>
    ({
      Bet: '投注',
      Payout: '派彩',
      Refund: '退款',
      Rollback: '回滾',
      Jackpot: '獎池',
      'Transfer In': '轉入',
      'Transfer Out': '轉出'
    })[type]
  const transactionStatusLabel = (status: MemberTransactionStatus) =>
    ({
      Processing: '處理中',
      Success: '成功',
      Failed: '失敗',
      Refunded: '已退款',
      'Rolled Back': '已回滾',
      Exception: '異常'
    })[status]
  const transactionStatusType = (status: MemberTransactionStatus) =>
    status === 'Success'
      ? 'success'
      : ['Failed', 'Exception'].includes(status)
        ? 'danger'
        : status === 'Processing'
          ? 'warning'
          : 'info'
  const betStatusLabel = (status: MemberBetStatus) =>
    ({
      'In Progress': '進行中',
      Settled: '已結算',
      Cancelled: '已取消',
      Refunded: '已退款',
      Exception: '異常'
    })[status]
  const betStatusType = (status: MemberBetStatus) =>
    status === 'Settled'
      ? 'success'
      : status === 'Exception'
        ? 'danger'
        : status === 'In Progress'
          ? 'warning'
          : 'info'
  const riskLabel = (status: 'Normal' | 'Attention' | 'Exception') =>
    ({ Normal: '正常', Attention: '需關注', Exception: '異常' })[status]
  const riskType = (status: 'Normal' | 'Attention' | 'Exception') =>
    status === 'Exception' ? 'danger' : status === 'Attention' ? 'warning' : 'info'
  const anomalyStatusLabel = (status: string) =>
    ({ Open: '待處理', Investigating: '調查中', Resolved: '已解決', Dismissed: '已排除' })[
      status as 'Open'
    ] || status
  const syncTab = (tab: string | number) =>
    router.replace({ query: { ...route.query, tab: String(tab) } })
  watch(
    () => route.query.tab,
    (tab) => {
      if (tab) activeTab.value = String(tab)
    }
  )
</script>

<style scoped lang="scss">
  .transaction-detail-page {
    display: grid;
    gap: 16px;
  }

  .hero-card :deep(.el-card__body) {
    padding: 20px 22px;
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: 12px;
    color: var(--art-gray-600);
  }

  .hero-meta span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid :deep(.el-card__body) {
    display: grid;
    gap: 7px;
    padding: 18px;
  }

  .summary-grid span,
  .summary-grid small,
  .section-title p,
  .balance-flow span,
  .balance-flow small,
  .history-card p,
  .history-card small {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    overflow: hidden;
    font-size: 20px;
    text-overflow: ellipsis;
  }

  .tabs-card :deep(.el-card__body) {
    padding-top: 8px;
  }

  .tab-panel {
    padding: 10px 0 4px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
    gap: 16px;
  }

  .section-block {
    min-width: 0;
    padding: 18px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .section-title {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title h3,
  .section-title p {
    margin: 0;
  }

  .section-title p {
    margin-top: 5px;
    font-size: 13px;
  }

  .balance-flow {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 10px;
    align-items: center;
    margin-bottom: 18px;
  }

  .balance-flow > div {
    display: grid;
    gap: 5px;
    min-width: 0;
    padding: 14px;
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .balance-flow strong {
    overflow: hidden;
    font-size: 18px;
    text-overflow: ellipsis;
  }

  .flow-arrow {
    color: var(--art-gray-400);
  }

  .positive {
    color: var(--el-color-success);
  }

  .negative {
    color: var(--el-color-danger);
  }

  .history-layout {
    max-width: 920px;
  }

  .history-card :deep(.el-card__body) {
    padding: 14px 16px;
  }

  .history-heading {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .history-card p {
    margin: 8px 0;
    line-height: 1.6;
  }

  @media (width <= 1100px) {
    .overview-grid {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 700px) {
    .balance-flow {
      grid-template-columns: 1fr;
    }

    .flow-arrow {
      justify-self: center;
      transform: rotate(90deg);
    }
  }

  @media (width <= 560px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .section-block {
      padding: 12px;
    }
  }
</style>
