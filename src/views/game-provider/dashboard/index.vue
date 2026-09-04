<template>
  <div class="dashboard-page">
    <AppPageHeader
      title="營運儀錶板"
      eyebrow="首頁"
      description="集中查看遊戲商營運、遊戲、商務、會員、交易、獎池、風控與財務待辦。"
    >
      <template #actions>
        <span class="updated-at">最後更新：{{ dashboardStore.refreshedAt }}</span>
        <ElButton :loading="refreshing" @click="refreshDashboard">
          <ArtSvgIcon icon="ri:refresh-line" />
          重新整理
        </ElButton>
      </template>
    </AppPageHeader>

    <ElCard shadow="never" class="filter-card">
      <ElForm inline>
        <ElFormItem label="資料日期">
          <ElDatePicker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="開始日期"
            end-placeholder="結束日期"
            value-format="YYYY-MM-DD"
            :clearable="false"
          />
        </ElFormItem>
        <ElFormItem label="交易幣別">
          <ElSelect v-model="selectedCurrency" class="currency-select">
            <ElOption
              v-for="currency in dashboardStore.currencies"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排除測試資料">
          <ElSwitch v-model="excludeTest" aria-label="排除測試資料" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="applyDashboardFilters">套用</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <div class="kpi-grid">
      <button
        v-for="metric in metrics"
        :key="metric.label"
        type="button"
        class="kpi-card"
        @click="go(metric.path)"
      >
        <div class="metric-head">
          <span>{{ metric.label }}</span>
          <ArtSvgIcon :icon="metric.icon" />
        </div>
        <strong :class="metric.tone">{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </button>
    </div>

    <div class="primary-grid">
      <ElCard shadow="never" class="trend-card">
        <template #header>
          <div class="section-title">
            <div>
              <strong>近七日營運趨勢</strong>
              <span>{{ selectedCurrency }}｜投注與派彩</span>
            </div>
            <ElButton link type="primary" @click="go('/reports/overview')">查看完整報表</ElButton>
          </div>
        </template>
        <ArtLineChart
          :data="trendSeries"
          :x-axis-data="trendDates"
          :show-area-color="true"
          :show-legend="true"
          legend-position="top"
          height="310px"
        />
      </ElCard>

      <ElCard shadow="never" class="task-card">
        <template #header>
          <div class="section-title">
            <div>
              <strong>待處理事項</strong>
              <span>依緊急程度集中作業</span>
            </div>
            <strong class="task-total">{{ totalTasks }}</strong>
          </div>
        </template>
        <button
          v-for="task in dashboardStore.tasks"
          :key="task.id"
          type="button"
          class="task-row"
          @click="go(task.path)"
        >
          <span class="task-icon" :class="task.tone">
            <ArtSvgIcon :icon="taskIcon(task.id)" />
          </span>
          <span class="task-copy">
            <strong>{{ task.title }}</strong>
            <small>{{ task.note }}</small>
          </span>
          <b :class="task.tone">{{ task.count }}</b>
          <ArtSvgIcon icon="ri:arrow-right-s-line" />
        </button>
      </ElCard>
    </div>

    <div class="ranking-grid">
      <ElCard shadow="never">
        <template #header>
          <div class="section-title">
            <div><strong>遊戲表現排行</strong><span>依投注金額排序</span></div>
            <ElButton link type="primary" @click="go('/reports/games/performance')"
              >查看全部</ElButton
            >
          </div>
        </template>
        <ElTable :data="topGames" size="small" row-key="id">
          <ElTableColumn label="遊戲" min-width="180">
            <template #default="scope">
              <button
                class="source-link"
                type="button"
                @click="go(`/games/management/${scope.row.gameId}`)"
              >
                <strong>{{ scope.row.primary }}</strong>
                <small>{{ scope.row.secondary }}</small>
              </button>
            </template>
          </ElTableColumn>
          <ElTableColumn label="投注金額" min-width="135" align="right">
            <template #default="scope">{{ formatMoney(scope.row.betAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn label="RTP" width="90" align="right">
            <template #default="scope">{{ formatPercent(scope.row.actualRtp) }}</template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="section-title">
            <div><strong>商戶線路排行</strong><span>依遊戲商輸贏排序</span></div>
            <ElButton link type="primary" @click="go('/reports/merchants/lines')"
              >查看全部</ElButton
            >
          </div>
        </template>
        <ElTable :data="topMerchants" size="small" row-key="id">
          <ElTableColumn label="商戶線路" min-width="190">
            <template #default="scope">
              <button
                class="source-link"
                type="button"
                @click="
                  go(`/business/merchants/${scope.row.merchantId}/lines/${scope.row.lineUid}`)
                "
              >
                <strong>{{ scope.row.primary }}</strong>
                <small>{{ scope.row.secondary }}</small>
              </button>
            </template>
          </ElTableColumn>
          <ElTableColumn label="遊戲商輸贏" min-width="140" align="right">
            <template #default="scope">{{ formatMoney(scope.row.ggr) }}</template>
          </ElTableColumn>
          <ElTableColumn label="成功率" width="95" align="right">
            <template #default="scope">{{ formatPercent(scope.row.successRate) }}</template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>

    <div class="secondary-grid">
      <ElCard shadow="never">
        <template #header>
          <div class="section-title">
            <div><strong>營運資源摘要</strong><span>目前可用與需補設定項目</span></div>
          </div>
        </template>
        <div class="operations-grid">
          <button type="button" @click="go('/games/management')">
            <span>啟用遊戲</span><strong>{{ dashboardStore.operations.activeGames }}</strong
            ><small>{{ dashboardStore.operations.incompleteGames }} 款待完成設定</small>
          </button>
          <button type="button" @click="go('/business/merchants')">
            <span>啟用商戶</span><strong>{{ dashboardStore.operations.activeMerchants }}</strong
            ><small>{{ dashboardStore.operations.activeAgents }} 個啟用代理</small>
          </button>
          <button type="button" @click="go('/members/management')">
            <span>受限會員</span><strong>{{ dashboardStore.operations.restrictedMembers }}</strong
            ><small>需同步風控狀態</small>
          </button>
          <button type="button" @click="go('/jackpots/list')">
            <span>啟用獎池</span><strong>{{ dashboardStore.operations.activeJackpots }}</strong
            ><small
              >{{ appliedCurrency }} 水位
              {{ formatMoney(dashboardStore.getJackpotBalance(appliedCurrency)) }}</small
            >
          </button>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="section-title">
            <div><strong>匯率摘要</strong><span>已發布的最新匯率</span></div>
            <ElButton link type="primary" @click="go('/finance-settings/exchange-rates/daily')"
              >匯率管理</ElButton
            >
          </div>
        </template>
        <ElTable :data="dashboardStore.exchangeRates" size="small" row-key="id">
          <ElTableColumn prop="pair" label="幣別對" min-width="110" />
          <ElTableColumn label="最終匯率" min-width="120" align="right">
            <template #default="scope">{{ formatRate(scope.row.rate) }}</template>
          </ElTableColumn>
          <ElTableColumn label="調整" width="90" align="right">
            <template #default="scope">
              {{ scope.row.adjustment > 0 ? '+' : '' }}{{ scope.row.adjustment }}%
            </template>
          </ElTableColumn>
          <ElTableColumn prop="updatedAt" label="更新時間" min-width="150" />
        </ElTable>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useDashboardOverviewStore } from '@/store/modules/dashboardOverview'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'GameProviderDashboard' })

  const router = useRouter()
  const dashboardStore = useDashboardOverviewStore()
  const selectedCurrency = ref('TWD')
  const appliedCurrency = ref('TWD')
  const excludeTest = ref(true)
  const appliedExcludeTest = ref(true)
  const dateRange = ref<[string, string]>(['2026-09-01', '2026-09-04'])
  const refreshing = ref(false)

  const summary = computed(() =>
    dashboardStore.getSummary(appliedCurrency.value, appliedExcludeTest.value)
  )
  const trend = computed(() =>
    dashboardStore.getTrend(appliedCurrency.value, appliedExcludeTest.value)
  )
  const trendDates = computed(() => trend.value.map((item) => item.date))
  const trendSeries = computed(() => [
    { name: '投注金額', data: trend.value.map((item) => item.betAmount) },
    { name: '派彩金額', data: trend.value.map((item) => item.payoutAmount) },
    { name: '遊戲商輸贏', data: trend.value.map((item) => item.ggr) }
  ])
  const topGames = computed(() => dashboardStore.getTopGames(appliedCurrency.value))
  const topMerchants = computed(() => dashboardStore.getTopMerchants(appliedCurrency.value))
  const totalTasks = computed(() =>
    dashboardStore.tasks.reduce((total, task) => total + task.count, 0)
  )

  const metrics = computed(() => [
    {
      label: '投注金額',
      value: formatMoney(summary.value.betAmount),
      note: `${formatNumber(summary.value.betCount)} 筆注單`,
      icon: 'ri:exchange-dollar-line',
      path: '/reports/transactions/bets'
    },
    {
      label: '派彩金額',
      value: formatMoney(summary.value.payoutAmount),
      note: '不含尚未結算注單',
      icon: 'ri:money-dollar-circle-line',
      path: '/reports/transactions/bets'
    },
    {
      label: '遊戲商輸贏',
      value: formatMoney(summary.value.ggr),
      note: '投注－派彩',
      icon: 'ri:line-chart-line',
      path: '/reports/overview',
      tone: summary.value.ggr < 0 ? 'danger' : 'success'
    },
    {
      label: '實際 RTP',
      value: formatPercent(summary.value.actualRtp),
      note: '依目前樣本計算',
      icon: 'ri:percent-line',
      path: '/reports/games/rtp',
      tone: Math.abs(summary.value.actualRtp - 96) > 3 ? 'warning' : ''
    },
    {
      label: '活躍會員',
      value: formatNumber(summary.value.activeMembers),
      note: appliedExcludeTest.value ? '已排除測試會員' : '包含測試會員',
      icon: 'ri:user-heart-line',
      path: '/reports/members'
    },
    {
      label: '待處理事項',
      value: formatNumber(totalTasks.value),
      note: '審核、風控、差異與異常',
      icon: 'ri:task-line',
      path: '/approvals/pending',
      tone: totalTasks.value ? 'danger' : ''
    }
  ])

  function formatNumber(value: number) {
    return new Intl.NumberFormat('zh-TW').format(value)
  }
  function formatMoney(value = 0) {
    return `${new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)} ${appliedCurrency.value}`
  }
  function formatPercent(value = 0) {
    return `${value.toFixed(2)}%`
  }
  function formatRate(value: number) {
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 6 }).format(value)
  }
  function taskIcon(id: string) {
    return (
      {
        approval: 'ri:git-pull-request-line',
        risk: 'ri:shield-check-line',
        difference: 'ri:scales-3-line',
        system: 'ri:error-warning-line'
      }[id] || 'ri:task-line'
    )
  }
  function go(path: string) {
    router.push(path)
  }
  function applyDashboardFilters() {
    appliedCurrency.value = selectedCurrency.value
    appliedExcludeTest.value = excludeTest.value
    ElMessage.success('儀錶板已依條件重新整理')
  }
  async function refreshDashboard() {
    refreshing.value = true
    await new Promise((resolve) => setTimeout(resolve, 450))
    dashboardStore.refresh()
    refreshing.value = false
    ElMessage.success('營運資料已重新整理')
  }
</script>

<style scoped>
  .dashboard-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .updated-at {
    color: var(--art-gray-600);
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .currency-select {
    width: 130px;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .kpi-card {
    padding: 18px 20px;
    text-align: left;
    cursor: pointer;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .kpi-card:hover {
    border-color: var(--el-color-primary);
  }

  .metric-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--art-gray-600);
  }

  .metric-head .art-svg-icon {
    font-size: 20px;
    color: var(--el-color-primary);
  }

  .kpi-card > strong {
    display: block;
    margin: 9px 0 4px;
    overflow: hidden;
    font-size: 25px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kpi-card small,
  .section-title span,
  .source-link small,
  .task-copy small,
  .operations-grid small {
    color: var(--art-gray-600);
  }

  .success {
    color: var(--el-color-success);
  }

  .warning {
    color: var(--el-color-warning);
  }

  .danger {
    color: var(--el-color-danger);
  }

  .primary-grid,
  .ranking-grid,
  .secondary-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.85fr);
    gap: 16px;
  }

  .ranking-grid,
  .secondary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-title {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .section-title > div > strong,
  .section-title > div > span {
    display: block;
  }

  .section-title > div > span {
    margin-top: 4px;
    font-size: 13px;
  }

  .task-total {
    font-size: 24px;
    color: var(--el-color-danger);
  }

  .task-row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto 18px;
    gap: 12px;
    align-items: center;
    width: 100%;
    padding: 13px 2px;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--art-border-color);
  }

  .task-row:last-child {
    border-bottom: 0;
  }

  .task-row:hover .task-copy strong {
    color: var(--el-color-primary);
  }

  .task-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    background: var(--art-gray-100);
    border-radius: 9px;
  }

  .task-copy strong,
  .task-copy small {
    display: block;
  }

  .task-copy small {
    margin-top: 3px;
  }

  .task-row b {
    font-size: 18px;
  }

  .source-link {
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .source-link strong,
  .source-link small {
    display: block;
  }

  .source-link small {
    margin-top: 3px;
  }

  .operations-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .operations-grid button {
    padding: 14px;
    text-align: left;
    cursor: pointer;
    background: var(--art-gray-100);
    border: 1px solid transparent;
    border-radius: 9px;
  }

  .operations-grid button:hover {
    border-color: var(--el-color-primary);
  }

  .operations-grid span,
  .operations-grid strong,
  .operations-grid small {
    display: block;
  }

  .operations-grid strong {
    margin: 5px 0 3px;
    font-size: 22px;
  }

  @media (width <= 1100px) {
    .primary-grid,
    .secondary-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 820px) {
    .kpi-grid,
    .ranking-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 560px) {
    .kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .kpi-card {
      padding: 14px;
    }

    .kpi-card > strong {
      font-size: 20px;
    }

    .ranking-grid,
    .operations-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
