<template>
  <div class="merchant-page">
    <AppPageHeader
      :title="isMembers ? '會員中心' : '交易中心'"
      description="本商戶授權線路 · Asia/Taipei · 共用模擬交易"
    />
    <ElTabs v-if="!isMembers" v-model="mode"
      ><ElTabPane label="下注紀錄" name="bets" /><ElTabPane label="資金交易" name="transactions"
    /></ElTabs>
    <ElCard shadow="never"
      ><ScopedTable
        :key="String(isMembers) + mode"
        :rows="rows"
        :columns="columns"
        :filter-keys="[
          'lineUid',
          'currency',
          'status',
          isMembers ? 'restriction' : mode === 'bets' ? 'gameName' : 'type'
        ]"
        :date-key="isMembers ? 'lastPlayedAt' : 'time'"
        ><template #actions="{ row }"
          ><ElButton link type="primary" @click="open(row.id)">查看</ElButton></template
        ></ScopedTable
      ></ElCard
    >
    <ElDrawer
      :model-value="Boolean(route.query.detail)"
      :title="isMembers ? '會員明細' : mode === 'bets' ? '下注明細' : '資金交易明細'"
      size="min(960px, 100vw)"
      @close="close"
    >
      <ElEmpty v-if="!selected" description="資料不存在或不在授權範圍" />
      <template v-else>
        <ElTabs v-model="detailTab">
          <ElTabPane label="基本資料" name="basic"
            ><ElDescriptions :column="1" border
              ><ElDescriptionsItem
                v-for="column in columns"
                :key="column.key"
                :label="column.label"
                >{{ field(selected, column.key) }}</ElDescriptionsItem
              ></ElDescriptions
            ></ElTabPane
          >
          <template v-if="!isMembers && mode === 'bets'">
            <ElTabPane label="遊戲結果" name="result"
              ><ElDescriptions v-if="result" :column="1" border
                ><ElDescriptionsItem label="結果">{{ result.summary }}</ElDescriptionsItem
                ><ElDescriptionsItem label="遊戲版本">{{
                  result.version.gameVersion
                }}</ElDescriptionsItem
                ><ElDescriptionsItem label="RTP 方案">{{
                  result.version.rtpPlan
                }}</ElDescriptionsItem
                ><ElDescriptionsItem label="限紅方案">{{
                  result.version.limitPlan
                }}</ElDescriptionsItem></ElDescriptions
              ></ElTabPane
            >
          </template>
          <ElTabPane v-if="isMembers" label="下注紀錄" name="bets"
            ><ScopedTable
              :rows="store.bets.filter((item) => item.memberId === selected!.id)"
              :columns="betColumns"
          /></ElTabPane>
          <ElTabPane label="關聯交易" name="related"
            ><ScopedTable :rows="related" :columns="transactionColumns"
          /></ElTabPane>
          <ElTabPane label="異常／申請紀錄" name="issues"
            ><ScopedTable
              :rows="store.requests.filter((item) => item.target === selected!.id)"
              :columns="requestColumns"
            /><p>僅提供本商戶回報與公開處理紀錄，內部風控研判不在此顯示。</p></ElTabPane
          >
          <template v-if="!isMembers && mode === 'bets'">
            <ElTabPane label="重播與盤面" name="replay">
              <template v-if="result">
                <ElAlert
                  :title="`歷史重播狀態：${result.replay.status}；素材版本 ${result.version.replayAssetVersion}`"
                  type="info"
                  :closable="false"
                />
                <p>依當局保存結果呈現，不重新計算或新增交易。</p>
                <ElEmpty v-if="!result.replay.events.length" description="尚無可用歷史事件" />
                <template v-else>
                  <ElSpace wrap
                    ><ElButton :disabled="step === 0" @click="step--">上一步</ElButton
                    ><ElButton @click="togglePlayback">{{ playing ? '暫停' : '播放' }}</ElButton
                    ><ElButton :disabled="step >= result.replay.events.length - 1" @click="step++"
                      >下一步</ElButton
                    ><ElButton @click="restart">重新播放</ElButton></ElSpace
                  >
                  <p aria-live="polite"
                    >{{ step + 1 }} / {{ result.replay.events.length }} · {{ event?.title }} ·
                    {{ event?.offsetSeconds }} 秒</p
                  >
                </template>
                <template v-if="stage && result.replay.supportsBoardDisplay">
                  <h3>{{ stage.label }} · {{ stage.columns }} × {{ stage.rows }}</h3>
                  <div
                    class="saved-board"
                    :style="{ gridTemplateColumns: `repeat(${stage.columns}, minmax(0, 1fr))` }"
                    ><div
                      v-for="cell in stage.cells"
                      :key="cell.position"
                      :class="{ winning: cell.winning }"
                      :aria-label="cell.symbolName"
                      >{{ cell.icon }}<small>{{ cell.symbolName }}</small></div
                    ></div
                  >
                </template>
                <ElEmpty v-else description="此事件沒有可用盤面；可查看保存的事件摘要" />
              </template>
            </ElTabPane>
            <ElTabPane label="原始結果" name="raw"
              ><p>外部白名單結果投影</p><pre>{{ externalResult }}</pre>
            </ElTabPane>
          </template>
        </ElTabs>
        <ElDivider />
        <ElForm label-position="top" @submit.prevent="report">
          <ElFormItem :label="isMembers ? '限制申覆範圍與原因' : '異常描述／關聯交易'"
            ><ElInput v-model="reason" type="textarea"
          /></ElFormItem>
          <ElButton @click="report">{{ isMembers ? '建立限制申覆' : '回報交易異常' }}</ElButton>
        </ElForm>
      </template>
    </ElDrawer>
  </div>
</template>
<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import ScopedTable from '../components/ScopedTable.vue'
  import { useMerchantPortalStore } from '@/store/modules/merchantPortal'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import { merchantField } from '@/utils/merchantDisplay'
  const settings = useFinanceSettingsStore()
  const store = useMerchantPortalStore(),
    route = useRoute(),
    router = useRouter()
  const field = (row: object, key: string) =>
    merchantField(
      row,
      key,
      (currency) => settings.currencies.find((item) => item.code === currency)?.decimalPlaces ?? 2
    )
  const isMembers = computed(() => route.path.endsWith('/members'))
  const mode = ref(route.query.mode === 'transactions' ? 'transactions' : 'bets')
  const detailTab = ref('basic'),
    reason = ref(''),
    step = ref(0),
    playing = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined
  const betColumns = [
    { key: 'id', label: '注單編號' },
    { key: 'roundId', label: '局號', width: 220 },
    { key: 'externalMemberId', label: '會員識別' },
    { key: 'lineUid', label: '線路', width: 220 },
    { key: 'gameName', label: '遊戲' },
    { key: 'currency', label: '原幣' },
    { key: 'betAmount', label: '投注' },
    { key: 'payoutAmount', label: '派彩' },
    { key: 'status', label: '狀態' },
    { key: 'time', label: '下注時間' }
  ]
  const transactionColumns = [
    { key: 'id', label: '交易編號' },
    { key: 'betId', label: '關聯注單' },
    { key: 'roundId', label: '局號', width: 220 },
    { key: 'lineUid', label: '線路', width: 220 },
    { key: 'memberId', label: '會員' },
    { key: 'type', label: '資金動作' },
    { key: 'currency', label: '原幣' },
    { key: 'amount', label: '金額' },
    { key: 'status', label: '狀態' },
    { key: 'time', label: '發生時間' }
  ]
  const memberColumns = [
    { key: 'id', label: '會員編號' },
    { key: 'externalId', label: '外部識別' },
    { key: 'lineUid', label: '線路', width: 220 },
    { key: 'currency', label: '原幣' },
    { key: 'status', label: '商戶來源狀態' },
    { key: 'restriction', label: '限制狀態' },
    { key: 'balance', label: '最後回傳餘額' },
    { key: 'balanceSource', label: '餘額來源' },
    { key: 'balanceAt', label: '餘額時間' },
    { key: 'lastPlayedAt', label: '最後遊戲' }
  ]
  const requestColumns = [
    { key: 'id', label: '申請編號' },
    { key: 'reason', label: '描述' },
    { key: 'status', label: '處理狀態' },
    { key: 'execution', label: '執行狀態' }
  ]
  const columns = computed(() =>
    isMembers.value ? memberColumns : mode.value === 'bets' ? betColumns : transactionColumns
  )
  const scoped = computed(() =>
    isMembers.value ? store.members : mode.value === 'bets' ? store.bets : store.transactions
  )
  const rows = computed(() =>
    scoped.value.filter((item) => !route.query.line || item.lineUid === route.query.line)
  )
  const selected = computed(() =>
    scoped.value.find(
      (item) =>
        item.id === route.query.detail && (!route.query.line || item.lineUid === route.query.line)
    )
  )
  const result = computed(() =>
    !isMembers.value && mode.value === 'bets' && selected.value
      ? store.getBetResult(selected.value.id)
      : undefined
  )
  const related = computed(() =>
    store.transactions.filter((item) =>
      isMembers.value
        ? item.memberId === selected.value?.id
        : mode.value === 'bets'
          ? item.betId === selected.value?.id
          : item.roundId === (selected.value as { roundId?: string })?.roundId &&
            item.memberId === (selected.value as { memberId?: string })?.memberId
    )
  )
  const event = computed(() => result.value?.replay.events[step.value])
  const stage = computed(() => {
    const replay = result.value?.replay
    const prior = replay?.events
      .slice(0, step.value + 1)
      .reverse()
      .find((item) => item.stageId)
    return replay?.stages.find((item) => item.id === prior?.stageId)
  })
  const externalResult = computed(() =>
    JSON.stringify(
      {
        bet: selected.value?.id,
        result: result.value?.resultType,
        summary: result.value?.summary,
        version: result.value?.version
      },
      null,
      2
    )
  )
  function stop() {
    clearInterval(timer)
    timer = undefined
    playing.value = false
  }
  function togglePlayback() {
    if (playing.value) return stop()
    if (step.value >= (result.value?.replay.events.length || 0) - 1) step.value = 0
    playing.value = true
    timer = setInterval(() => {
      if (step.value >= (result.value?.replay.events.length || 0) - 1) stop()
      else step.value++
    }, 800)
  }
  function restart() {
    stop()
    step.value = 0
    togglePlayback()
  }
  watch(
    () => route.query.detail,
    () => {
      stop()
      step.value = 0
      reason.value = ''
      detailTab.value = 'basic'
    }
  )
  watch(detailTab, stop)
  watch(mode, () => {
    close()
    stop()
  })
  onUnmounted(stop)
  function open(id: string) {
    router.replace({ query: { ...route.query, detail: id, mode: mode.value } })
  }
  function close() {
    const query = { ...route.query }
    delete query.detail
    router.replace({ query })
  }
  function report() {
    if (!selected.value) return
    const response = store.submitRequest({
      category: isMembers.value ? '會員' : '交易',
      target: selected.value.id,
      action: isMembers.value ? '會員限制申覆' : '回報交易異常',
      proposed: reason.value,
      reason: reason.value
    })
    ElMessage[response.ok ? 'success' : 'error'](response.message)
    if (response.ok) {
      reason.value = ''
      detailTab.value = 'issues'
    }
  }
</script>
<style scoped>
  .merchant-page {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .saved-board {
    display: grid;
    gap: 8px;
    max-width: 620px;
  }

  .saved-board > div {
    padding: 12px 4px;
    font-size: 28px;
    text-align: center;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
  }

  .saved-board .winning {
    border: 2px solid var(--el-color-warning);
  }

  .saved-board small {
    display: block;
    font-size: 12px;
  }

  pre {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
