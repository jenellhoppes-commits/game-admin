<template>
  <div v-if="bet" class="bet-detail-page">
    <ElCard class="hero-card" shadow="never">
      <AppPageHeader
        :title="bet.id"
        eyebrow="注單詳細"
        :description="`局號：${bet.roundId} · ${bet.gameName}`"
      >
        <template #status>
          <ElTag :type="betStatusType(bet.status)" effect="light" round>{{
            betStatusLabel(bet.status)
          }}</ElTag>
          <ElTag :type="riskType(bet.riskStatus)" effect="plain" round>{{
            riskLabel(bet.riskStatus)
          }}</ElTag>
          <ElTag :type="replayStatusType(bet.result.replay.status)" effect="plain" round>
            {{ replayStatusLabel(bet.result.replay.status) }}
          </ElTag>
        </template>
        <template #meta>
          <div class="hero-meta">
            <span><ArtSvgIcon icon="ri:user-line" />{{ bet.externalMemberId }}</span>
            <span><ArtSvgIcon icon="ri:store-2-line" />{{ bet.merchantName }}</span>
            <span><ArtSvgIcon icon="ri:route-line" />{{ bet.lineUid }}</span>
            <span><ArtSvgIcon icon="ri:money-dollar-circle-line" />{{ bet.currency }}</span>
          </div>
        </template>
        <template #actions>
          <ElButton @click="router.push(listReturnPath)">返回列表</ElButton>
          <ElButton @click="router.push(`/members/management/${bet.memberId}?tab=bets`)"
            >查看會員</ElButton
          >
          <ElButton
            v-if="relatedTransactions[0]"
            @click="router.push(`/transactions/records/${relatedTransactions[0].id}`)"
            >查看關聯交易</ElButton
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
          <div class="tab-panel detail-grid">
            <section class="section-block">
              <div class="section-title"
                ><div><h3>注單識別</h3><p>平台、商戶、會員與遊戲的完整關聯。</p></div></div
              >
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem label="注單編號">{{ bet.id }}</ElDescriptionsItem>
                <ElDescriptionsItem label="局號">{{ bet.roundId }}</ElDescriptionsItem>
                <ElDescriptionsItem label="會員">
                  <EntityLink
                    :label="bet.externalMemberId"
                    :secondary="bet.memberId"
                    :to="`/members/management/${bet.memberId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="遊戲">
                  <EntityLink
                    :label="bet.gameName"
                    :secondary="bet.gameId"
                    :to="`/games/management/${bet.gameId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="遊戲代碼">{{ bet.gameCode }}</ElDescriptionsItem>
                <ElDescriptionsItem label="遊戲類型">{{
                  gameTypeLabel(bet.gameType)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="商戶">
                  <EntityLink
                    :label="bet.merchantName"
                    :secondary="bet.merchantId"
                    :to="`/business/merchants/${bet.merchantId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="所屬代理">
                  <EntityLink
                    :label="bet.agentName"
                    :secondary="bet.agentId"
                    :to="`/business/agents/${bet.agentId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="線路 UID">{{ bet.lineUid }}</ElDescriptionsItem>
                <ElDescriptionsItem label="交易幣別">{{ bet.currency }}</ElDescriptionsItem>
                <ElDescriptionsItem label="錢包模式">{{
                  bet.walletMode === 'Seamless' ? '單一錢包' : '轉帳錢包'
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="遊戲版本">{{
                  bet.result.version.gameVersion
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="RTP 方案">{{
                  bet.result.version.rtpPlan
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="限紅方案">{{
                  bet.result.version.limitPlan
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="注單狀態">{{
                  betStatusLabel(bet.status)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="開始時間">{{ bet.time }}</ElDescriptionsItem>
                <ElDescriptionsItem label="結算時間">{{
                  bet.settledAt || '尚未結算'
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>

            <section class="section-block">
              <div class="section-title"
                ><div><h3>金額摘要</h3><p>所有金額均以該注單交易幣別呈現。</p></div></div
              >
              <div class="amount-list">
                <div
                  ><span>投注金額</span
                  ><strong>{{ money(bet.betAmount) }} {{ bet.currency }}</strong></div
                >
                <div
                  ><span>有效投注</span
                  ><strong>{{ money(bet.betAmount) }} {{ bet.currency }}</strong></div
                >
                <div
                  ><span>派彩金額</span
                  ><strong>{{ money(bet.payoutAmount) }} {{ bet.currency }}</strong></div
                >
                <div
                  ><span>會員淨額</span
                  ><strong :class="bet.playerNet >= 0 ? 'positive' : 'negative'"
                    >{{ money(bet.playerNet) }} {{ bet.currency }}</strong
                  ></div
                >
                <div
                  ><span>遊戲商淨額</span
                  ><strong :class="bet.playerNet <= 0 ? 'positive' : 'negative'"
                    >{{ money(-bet.playerNet) }} {{ bet.currency }}</strong
                  ></div
                >
                <div
                  ><span>Jackpot 金額</span
                  ><strong>{{ money(bet.result.jackpotAmount) }} {{ bet.currency }}</strong></div
                >
              </div>
              <ElAlert
                title="注單資料由遊戲服務與錢包交易共同產生，總後台不可人工更改金額或狀態。"
                type="info"
                :closable="false"
                show-icon
              />
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="遊戲結果" name="result">
          <div class="tab-panel result-layout">
            <section class="section-block">
              <div class="section-title"
                ><div><h3>結果摘要</h3><p>提供客服及營運快速判讀。</p></div></div
              >
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem label="結果">{{ bet.result.outcome }}</ElDescriptionsItem>
                <ElDescriptionsItem label="派彩倍數"
                  >{{ bet.result.multiplier }}x</ElDescriptionsItem
                >
                <ElDescriptionsItem label="觸發功能">{{ bet.result.feature }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Jackpot 金額"
                  >{{ money(bet.result.jackpotAmount) }} {{ bet.currency }}</ElDescriptionsItem
                >
                <ElDescriptionsItem label="結果代碼">{{
                  bet.result.resultCode
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="遊戲"
                  >{{ bet.gameName }}（{{ bet.gameId }}）</ElDescriptionsItem
                >
                <ElDescriptionsItem label="局號">{{ bet.roundId }}</ElDescriptionsItem>
                <ElDescriptionsItem label="結果摘要" :span="descriptionColumns">{{
                  bet.result.summary
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>
            <section class="section-block">
              <div class="section-title"
                ><div
                  ><h3>當局版本快照</h3
                  ><p>一律使用下注當時的版本與設定，不讀取目前最新設定。</p></div
                ></div
              >
              <ElDescriptions :column="1" border>
                <ElDescriptionsItem label="遊戲版本">{{
                  bet.result.version.gameVersion
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="結果格式">{{
                  bet.result.version.resultFormatVersion
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="RTP 方案">{{
                  bet.result.version.rtpPlan
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="限紅方案">{{
                  bet.result.version.limitPlan
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="Replay 素材">{{
                  bet.result.version.replayAssetVersion
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="關聯交易" name="transactions">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>關聯交易</h3><p>同一局號下的投注扣款與派彩入帳。</p></div></div
            >
            <ElTable :data="relatedTransactions" border empty-text="尚無關聯交易">
              <ElTableColumn label="交易編號" width="135"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.id"
                    :to="`/transactions/records/${scope.row.id}`" /></template
              ></ElTableColumn>
              <ElTableColumn label="類型" width="100"
                ><template #default="scope">{{
                  transactionTypeLabel(scope.row.type)
                }}</template></ElTableColumn
              >
              <ElTableColumn label="金額" width="150" align="right"
                ><template #default="scope"
                  ><span :class="scope.row.amount >= 0 ? 'positive' : 'negative'"
                    >{{ money(scope.row.amount) }} {{ scope.row.currency }}</span
                  ></template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><ElTag :type="transactionStatusType(scope.row.status)">{{
                    transactionStatusLabel(scope.row.status)
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn prop="externalReference" label="外部參考號" min-width="200" />
              <ElTableColumn prop="time" label="交易時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="異常紀錄" name="anomalies">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>異常與風控案件</h3><p>案件處理統一在風控中心進行。</p></div></div
            >
            <ElTable :data="anomalies" border empty-text="此注單尚無異常紀錄">
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
              <ElTableColumn label="關聯交易" width="140"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.transactionId"
                    :label="scope.row.transactionId"
                    :to="`/transactions/records/${scope.row.transactionId}`"
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

        <ElTabPane label="重播與盤面" name="replay">
          <div v-if="bet.result.replay.supportsBoardDisplay" class="tab-panel board-layout">
            <section class="section-block">
              <div class="section-title">
                <div>
                  <h3>歷史靜態盤面</h3>
                  <p>顯示當時保存的 Symbol 與中獎位置，不會重新產生結果。</p>
                </div>
                <ElTag type="info" effect="plain">{{ currentBoardStage.label }}</ElTag>
              </div>
              <div class="stage-tabs">
                <ElButton
                  v-for="(stage, index) in bet.result.replay.stages"
                  :key="stage.id"
                  :type="boardStageIndex === index ? 'primary' : 'default'"
                  plain
                  @click="boardStageIndex = index"
                >
                  {{ stage.label }}
                </ElButton>
              </div>
              <div
                class="symbol-board"
                :style="{ gridTemplateColumns: `repeat(${currentBoardStage.columns}, 1fr)` }"
              >
                <div
                  v-for="cell in currentBoardStage.cells"
                  :key="cell.position"
                  class="symbol-cell"
                  :class="{ winning: cell.winning }"
                >
                  <span>{{ cell.icon }}</span>
                  <strong>{{ cell.symbolId }}</strong>
                  <small>位置 {{ cell.position + 1 }}</small>
                </div>
              </div>
            </section>
            <section class="section-block stage-summary">
              <div class="section-title">
                <div><h3>本盤結果</h3><p>目前階段的中獎判定摘要。</p></div>
              </div>
              <div class="amount-list">
                <div
                  ><span>盤面階段</span><strong>{{ currentBoardStage.label }}</strong></div
                >
                <div
                  ><span>盤面尺寸</span><strong>{{ currentBoardDimensions }}</strong></div
                >
                <div
                  ><span>中獎倍率</span><strong>×{{ currentBoardStage.winMultiplier }}</strong></div
                >
                <div
                  ><span>本盤派彩</span
                  ><strong
                    >{{ money(currentBoardStage.payoutAmount) }} {{ bet.currency }}</strong
                  ></div
                >
                <div
                  ><span>特殊玩法</span
                  ><strong>{{ currentBoardStage.feature || '無' }}</strong></div
                >
              </div>
              <ElAlert
                title="黃色框代表保存結果中的中獎位置；此畫面僅供判讀。"
                type="warning"
                :closable="false"
                show-icon
              />
            </section>
          </div>
          <ElAlert
            v-else
            class="replay-unavailable"
            title="此注單未提供保存盤面素材"
            description="系統不會重新產生盤面或重跑 RNG；可用資料仍會如實保留。"
            type="info"
            :closable="false"
            show-icon
          />

          <div
            v-if="bet.result.replay.supportsResultReplay || bet.result.replay.supportsEventReplay"
            class="tab-panel replay-layout"
          >
            <ElAlert
              v-if="route.query.alertId"
              class="risk-source-alert"
              :title="`已由風控告警 ${route.query.alertId} 定位至異常階段`"
              description="目前顯示的是該告警保存的歷史事件位置；重播只還原結果，不會重新計算。"
              type="error"
              :closable="false"
              show-icon
            />
            <section class="section-block replay-area">
              <div class="section-title">
                <div>
                  <h3>結果重播</h3>
                  <p>依保存事件逐步還原結果，不會重新執行 RNG。</p>
                </div>
                <ElTag :type="replayStatusType(bet.result.replay.status)" effect="light">
                  {{ replayStatusLabel(bet.result.replay.status) }}
                </ElTag>
              </div>

              <div class="replay-stage">
                <span>事件 {{ currentEventIndex + 1 }} / {{ replayEvents.length }}</span>
                <ArtSvgIcon :icon="eventIcon(currentReplayEvent.type)" />
                <h2>{{ currentReplayEvent.title }}</h2>
                <p>{{ currentReplayEvent.detail }}</p>
                <ElAlert
                  v-if="currentReplayEvent.riskAlert"
                  :title="`風控告警：${currentReplayEvent.riskAlert}`"
                  type="error"
                  :closable="false"
                  show-icon
                />
              </div>

              <div class="replay-controls">
                <ElButton :disabled="currentEventIndex === 0" @click="previousEvent"
                  >上一步</ElButton
                >
                <ElButton type="primary" @click="togglePlayback">
                  {{ isPlaying ? '暫停' : '播放' }}
                </ElButton>
                <ElButton @click="resetReplay">重新播放</ElButton>
                <ElButton
                  :disabled="currentEventIndex >= replayEvents.length - 1"
                  @click="nextEvent"
                  >下一步</ElButton
                >
                <ElSelect v-model="playbackSpeed" class="speed-select">
                  <ElOption label="0.5x" :value="0.5" />
                  <ElOption label="1x" :value="1" />
                  <ElOption label="2x" :value="2" />
                </ElSelect>
              </div>
              <ElProgress
                :percentage="replayProgress"
                :format="() => `${currentEventIndex + 1} / ${replayEvents.length}`"
              />
            </section>

            <section class="section-block transaction-trail">
              <div class="section-title">
                <div><h3>交易軌跡</h3><p>同步查看本局錢包資金變化。</p></div>
              </div>
              <button
                v-for="transaction in relatedTransactions"
                :key="transaction.id"
                type="button"
                @click="router.push(`/transactions/records/${transaction.id}`)"
              >
                <span>{{ transactionTypeLabel(transaction.type) }}</span>
                <strong :class="transaction.amount >= 0 ? 'positive' : 'negative'">
                  {{ signedMoney(transaction.amount) }} {{ transaction.currency }}
                </strong>
                <small>{{ transaction.id }}</small>
              </button>
              <ElEmpty v-if="relatedTransactions.length === 0" description="尚無關聯交易" />
            </section>

            <section class="section-block event-timeline">
              <div class="section-title">
                <div><h3>事件時間軸</h3><p>點擊事件可直接跳至該階段。</p></div>
              </div>
              <div class="timeline-list">
                <button
                  v-for="(event, index) in replayEvents"
                  :key="event.id"
                  type="button"
                  :class="{ active: currentEventIndex === index, risk: event.riskAlert }"
                  @click="selectEvent(index)"
                >
                  <time>{{ eventTime(event.offsetSeconds) }}</time>
                  <ArtSvgIcon :icon="eventIcon(event.type)" />
                  <span
                    ><strong>{{ event.title }}</strong
                    ><small>{{ event.detail }}</small></span
                  >
                  <ElTag v-if="event.riskAlert" type="danger" size="small">異常階段</ElTag>
                </button>
              </div>
            </section>
          </div>
          <ElAlert
            v-else
            class="replay-unavailable"
            title="此注單未提供事件重播素材"
            description="僅顯示已保存的歷史資料，不會重新執行遊戲或產生結果。"
            type="info"
            :closable="false"
            show-icon
          />
        </ElTabPane>

        <ElTabPane v-if="canViewRawResult" label="原始結果" name="raw">
          <div class="tab-panel raw-layout">
            <section class="section-block raw-result">
              <div class="section-title">
                <div>
                  <h3>原始結果資料</h3>
                  <p>僅供具備技術資料權限的角色查閱，所有操作均保留紀錄。</p>
                </div>
                <div class="raw-actions">
                  <ElButton @click="copyRawPayload">複製內容</ElButton>
                  <ElButton type="primary" @click="exportRawPayload">匯出結果資料</ElButton>
                </div>
              </div>
              <ElAlert
                title="敏感資料：一般客服與商戶後台不顯示內部 Debug、Math、RNG Seed 或技術 Log。"
                type="warning"
                :closable="false"
                show-icon
                class="mb-4"
              />
              <pre>{{ bet.result.rawPayload }}</pre>
            </section>
            <section class="section-block">
              <div class="section-title">
                <div><h3>查看與匯出紀錄</h3><p>追蹤盤面、Replay 與原始資料操作。</p></div>
              </div>
              <ElTable :data="accessLogs" border empty-text="尚無操作紀錄">
                <ElTableColumn label="操作" min-width="130">
                  <template #default="scope">{{ accessActionLabel(scope.row.action) }}</template>
                </ElTableColumn>
                <ElTableColumn prop="detail" label="內容" min-width="190" />
                <ElTableColumn prop="operator" label="操作人" width="120" />
                <ElTableColumn prop="time" label="時間" width="160" />
              </ElTable>
            </section>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>

  <ElResult v-else icon="warning" title="找不到注單資料" sub-title="請確認注單編號是否正確。">
    <template #extra
      ><ElButton type="primary" @click="router.push('/transactions/bets')"
        >返回注單列表</ElButton
      ></template
    >
  </ElResult>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElTag } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    BetBoardStage,
    BetReplayEventType,
    BetReplayStatus,
    BetResultAccessLog,
    MemberBetStatus,
    MemberTransactionStatus,
    MemberTransactionType
  } from '@/types/game-provider'
  import {
    formatBoardDimensions,
    useTransactionCenterStore
  } from '@/store/modules/transactionCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'BetDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useTransactionCenterStore()
  const { width } = useWindowSize()
  const normalizeTab = (tab: unknown) =>
    String(tab || 'overview') === 'board' ? 'replay' : String(tab || 'overview')
  const activeTab = ref(normalizeTab(route.query.tab))
  const listReturnPath = computed(() => {
    const target = String(route.query.returnTo || '')
    return target.startsWith('/transactions/bets') ? target : '/transactions/bets'
  })
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const bet = computed(() => store.findBet(String(route.params.id)))
  const relatedTransactions = computed(() =>
    bet.value ? store.getTransactionsByBet(bet.value.id) : []
  )
  const anomalies = computed(() => (bet.value ? store.getBetAnomalies(bet.value.id) : []))
  const replayEvents = computed(() => bet.value?.result.replay.events || [])
  const accessLogs = computed(() => (bet.value ? store.getBetResultAccessLogs(bet.value.id) : []))
  const canViewRawResult = true
  const boardStageIndex = ref(0)
  const currentEventIndex = ref(0)
  const playbackSpeed = ref(1)
  const isPlaying = ref(false)
  let playbackTimer: ReturnType<typeof setInterval> | undefined
  const currentBoardStage = computed<BetBoardStage>(
    () =>
      (bet.value?.result.replay.stages[boardStageIndex.value] ||
        bet.value?.result.replay.stages[0])!
  )
  const currentBoardDimensions = computed(() =>
    formatBoardDimensions(currentBoardStage.value.columns, currentBoardStage.value.rows)
  )
  const currentReplayEvent = computed(() => replayEvents.value[currentEventIndex.value]!)
  const replayProgress = computed(() =>
    replayEvents.value.length
      ? Math.round(((currentEventIndex.value + 1) / replayEvents.value.length) * 100)
      : 0
  )
  const summary = computed(() =>
    bet.value
      ? [
          {
            label: '投注金額',
            value: `${money(bet.value.betAmount)} ${bet.value.currency}`,
            note: '會員扣款'
          },
          {
            label: '派彩金額',
            value: `${money(bet.value.payoutAmount)} ${bet.value.currency}`,
            note: '會員入帳'
          },
          {
            label: '會員淨額',
            value: `${money(bet.value.playerNet)} ${bet.value.currency}`,
            note: bet.value.playerNet >= 0 ? '會員淨贏' : '會員淨輸',
            className: bet.value.playerNet >= 0 ? 'positive' : 'negative'
          },
          {
            label: '派彩倍數',
            value: `${bet.value.result.multiplier}x`,
            note: bet.value.result.feature
          }
        ]
      : []
  )
  const money = (value: number) =>
    new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value
    )
  const signedMoney = (value: number) => `${value >= 0 ? '+' : ''}${money(value)}`
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
  const gameTypeLabel = (type: string) =>
    ({
      GT001: '電子遊戲',
      GT002: '真人遊戲',
      GT003: '捕魚遊戲',
      GT004: '街機遊戲',
      GT005: '桌牌遊戲',
      GT006: '虛擬運動',
      GT007: '彩票遊戲',
      GT008: '其他遊戲'
    })[type as 'GT001'] || type
  const replayStatusLabel = (status: BetReplayStatus) =>
    ({
      Available: '可重播',
      Partial: '部分可重播',
      Unsupported: '不支援重播',
      'Missing Data': '重播資料缺失'
    })[status]
  const replayStatusType = (status: BetReplayStatus) =>
    status === 'Available'
      ? 'success'
      : status === 'Partial'
        ? 'warning'
        : status === 'Missing Data'
          ? 'danger'
          : 'info'
  const eventIcon = (type: BetReplayEventType) =>
    ({
      Bet: 'ri:money-dollar-circle-line',
      'Game Start': 'ri:play-circle-line',
      'Board Result': 'ri:grid-line',
      'Win Evaluation': 'ri:award-line',
      Feature: 'ri:magic-line',
      Jackpot: 'ri:funds-box-line',
      Payout: 'ri:coins-line',
      'Round End': 'ri:stop-circle-line'
    })[type]
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
  const anomalyStatusLabel = (status: string) =>
    ({ Open: '待處理', Investigating: '調查中', Resolved: '已解決', Dismissed: '已排除' })[
      status as 'Open'
    ] || status
  const accessActionLabel = (action: BetResultAccessLog['action']) =>
    ({
      'View Board': '查看盤面',
      'Start Replay': '啟動重播',
      'View Raw Result': '查看原始結果',
      'Export Result': '匯出結果資料'
    })[action]
  const stopPlayback = () => {
    if (playbackTimer) clearInterval(playbackTimer)
    playbackTimer = undefined
    isPlaying.value = false
  }
  const startPlayback = () => {
    if (!bet.value || replayEvents.value.length === 0) return
    if (currentEventIndex.value >= replayEvents.value.length - 1) currentEventIndex.value = 0
    stopPlayback()
    isPlaying.value = true
    store.logBetResultAccess(bet.value.id, 'Start Replay', `播放速度 ${playbackSpeed.value}x`)
    playbackTimer = setInterval(() => {
      if (currentEventIndex.value >= replayEvents.value.length - 1) {
        stopPlayback()
        return
      }
      currentEventIndex.value += 1
      const stageId = currentReplayEvent.value?.stageId
      if (stageId && bet.value) {
        const index = bet.value.result.replay.stages.findIndex((stage) => stage.id === stageId)
        if (index >= 0) boardStageIndex.value = index
      }
    }, 1200 / playbackSpeed.value)
  }
  const togglePlayback = () => (isPlaying.value ? stopPlayback() : startPlayback())
  const selectEvent = (index: number) => {
    stopPlayback()
    currentEventIndex.value = index
    const stageId = replayEvents.value[index]?.stageId
    if (stageId && bet.value) {
      const stageIndex = bet.value.result.replay.stages.findIndex((stage) => stage.id === stageId)
      if (stageIndex >= 0) boardStageIndex.value = stageIndex
    }
  }
  const applyReplayLocation = () => {
    if (!bet.value) return

    const eventId = String(route.query.eventId || '')
    if (eventId) {
      const eventIndex = replayEvents.value.findIndex((event) => event.id === eventId)
      if (eventIndex >= 0) selectEvent(eventIndex)
    }

    const stageId = String(route.query.stageId || '')
    if (stageId) {
      const stageIndex = bet.value.result.replay.stages.findIndex((stage) => stage.id === stageId)
      if (stageIndex >= 0) boardStageIndex.value = stageIndex
    }
  }
  const previousEvent = () => selectEvent(Math.max(0, currentEventIndex.value - 1))
  const nextEvent = () =>
    selectEvent(Math.min(replayEvents.value.length - 1, currentEventIndex.value + 1))
  const resetReplay = () => selectEvent(0)
  const eventTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const trackTabAccess = (tab: string) => {
    if (!bet.value) return
    if (tab === 'replay' && bet.value.result.replay.supportsBoardDisplay)
      store.logBetResultAccess(bet.value.id, 'View Board', '查看歷史靜態盤面與重播')
    if (tab === 'raw')
      store.logBetResultAccess(bet.value.id, 'View Raw Result', '查看原始 JSON 結果')
  }
  const syncTab = (tab: string | number) => {
    const target = String(tab)
    trackTabAccess(target)
    if (target !== 'replay') stopPlayback()
    router.replace({ query: { ...route.query, tab: target } })
  }
  const copyRawPayload = async () => {
    if (!bet.value) return
    await navigator.clipboard.writeText(bet.value.result.rawPayload)
    store.logBetResultAccess(bet.value.id, 'View Raw Result', '複製原始 JSON 結果')
    ElMessage.success('原始結果已複製')
  }
  const exportRawPayload = () => {
    if (!bet.value) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(
      new Blob([bet.value.result.rawPayload], { type: 'application/json;charset=utf-8' })
    )
    link.download = `${bet.value.id}-result.json`
    link.click()
    URL.revokeObjectURL(link.href)
    store.logBetResultAccess(bet.value.id, 'Export Result', '匯出原始 JSON 結果')
    ElMessage.success('結果資料已匯出')
  }
  watch(
    () => [route.query.tab, route.query.eventId, route.query.stageId],
    ([tab]) => {
      if (tab) activeTab.value = normalizeTab(tab)
      applyReplayLocation()
    }
  )
  watch(playbackSpeed, () => {
    if (isPlaying.value) startPlayback()
  })
  watch(
    () => bet.value?.id,
    () => {
      stopPlayback()
      boardStageIndex.value = 0
      currentEventIndex.value = 0
      applyReplayLocation()
      trackTabAccess(activeTab.value)
    },
    { immediate: true }
  )
  onBeforeUnmount(stopPlayback)
</script>

<style scoped lang="scss">
  .bet-detail-page {
    display: grid;
    gap: 16px;
  }

  .risk-source-alert {
    grid-column: 1 / -1;
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
  .amount-list span {
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

  .detail-grid,
  .result-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
    gap: 16px;
  }

  .result-layout {
    grid-template-columns: 1fr 1fr;
  }

  .board-layout,
  .replay-layout,
  .raw-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
    gap: 16px;
  }

  .stage-tabs,
  .replay-controls,
  .raw-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stage-tabs {
    margin-bottom: 18px;
  }

  .stage-tabs :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  .symbol-board {
    display: grid;
    gap: 10px;
    max-width: 760px;
    padding: 20px;
    margin: 0 auto;
    background: var(--art-gray-50);
    border: 1px solid var(--art-gray-200);
    border-radius: 12px;
  }

  .symbol-cell {
    display: grid;
    gap: 4px;
    place-content: center;
    min-height: 104px;
    text-align: center;
    background: var(--art-bg-color);
    border: 2px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .symbol-cell.winning {
    background: var(--el-color-warning-light-9);
    border-color: var(--el-color-warning);
    box-shadow: 0 0 0 3px var(--el-color-warning-light-8);
  }

  .symbol-cell span {
    font-size: 30px;
  }

  .symbol-cell small {
    color: var(--art-gray-500);
  }

  .replay-stage {
    display: grid;
    gap: 10px;
    place-content: center;
    min-height: 280px;
    padding: 28px;
    margin-bottom: 18px;
    text-align: center;
    background: linear-gradient(145deg, var(--art-gray-50), var(--art-bg-color));
    border: 1px solid var(--art-gray-200);
    border-radius: 12px;
  }

  .replay-stage > .art-svg-icon {
    margin: 4px auto;
    font-size: 42px;
    color: var(--el-color-primary);
  }

  .replay-stage h2,
  .replay-stage p {
    margin: 0;
  }

  .replay-stage p,
  .replay-stage > span {
    color: var(--art-gray-500);
  }

  .replay-controls {
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
  }

  .speed-select {
    width: 92px;
  }

  .transaction-trail button,
  .timeline-list button {
    width: 100%;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .transaction-trail button {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 5px 12px;
    padding: 13px 2px;
    border-bottom: 1px solid var(--art-gray-200);
  }

  .transaction-trail button:hover {
    color: var(--el-color-primary);
  }

  .transaction-trail button small {
    grid-column: 1 / -1;
    color: var(--art-gray-500);
  }

  .event-timeline {
    grid-column: 1 / -1;
  }

  .timeline-list {
    display: grid;
    gap: 8px;
  }

  .timeline-list button {
    display: grid;
    grid-template-columns: 58px 26px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .timeline-list button:hover,
  .timeline-list button.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  .timeline-list button.risk {
    border-left: 4px solid var(--el-color-danger);
  }

  .timeline-list time,
  .timeline-list small {
    color: var(--art-gray-500);
  }

  .timeline-list span {
    display: grid;
    gap: 3px;
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

  .amount-list {
    display: grid;
    gap: 0;
    margin-bottom: 16px;
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .amount-list > div {
    display: flex;
    gap: 20px;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--art-gray-200);
  }

  .amount-list > div:last-child {
    border-bottom: 0;
  }

  .positive {
    color: var(--el-color-success);
  }

  .negative {
    color: var(--el-color-danger);
  }

  .raw-result pre {
    min-height: 220px;
    padding: 16px;
    overflow: auto;
    font-size: 12px;
    line-height: 1.7;
    color: var(--art-gray-800);
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  @media (width <= 1000px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .detail-grid,
    .result-layout,
    .board-layout,
    .replay-layout,
    .raw-layout {
      grid-template-columns: 1fr;
    }

    .event-timeline {
      grid-column: auto;
    }
  }

  @media (width <= 560px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .section-block {
      padding: 12px;
    }

    .symbol-board {
      gap: 5px;
      padding: 10px;
    }

    .symbol-cell {
      min-height: 76px;
    }

    .symbol-cell span {
      font-size: 22px;
    }

    .symbol-cell small {
      display: none;
    }

    .timeline-list button {
      grid-template-columns: 48px 22px minmax(0, 1fr);
    }

    .timeline-list .el-tag {
      grid-column: 3;
      justify-self: start;
    }
  }
</style>
