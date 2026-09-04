<template>
  <div class="risk-overview-page">
    <AppPageHeader
      title="風控總覽"
      eyebrow="監控與作業"
      description="集中掌握會員、注單、交易、商戶線路、遊戲與獎池的風險告警。"
    >
      <template #actions>
        <ElButton @click="router.push('/risk/alerts')">查看全部告警</ElButton>
        <ElButton type="primary" @click="router.push('/risk/rules')">管理風控規則</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <ElCard v-for="item in summaries" :key="item.label" shadow="never">
        <div class="summary-icon" :class="item.tone"><ArtSvgIcon :icon="item.icon" /></div>
        <div>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.note }}</small>
        </div>
      </ElCard>
    </div>

    <div class="content-grid">
      <ElCard class="category-card" shadow="never">
        <template #header>
          <div class="card-title">
            <div><strong>告警分類</strong><span>點擊分類查看對應告警</span></div>
            <ElTag type="info" effect="plain">{{ store.alerts.length }} 筆</ElTag>
          </div>
        </template>
        <div class="category-grid">
          <button
            v-for="item in categorySummary"
            :key="item.category"
            type="button"
            @click="openCategory(item.category)"
          >
            <ArtSvgIcon :icon="item.icon" />
            <span>{{ item.label }}</span>
            <strong>{{ item.total }}</strong>
            <small>{{ item.open }} 筆待處理</small>
          </button>
        </div>
      </ElCard>

      <ElCard class="severity-card" shadow="never">
        <template #header>
          <div class="card-title">
            <div><strong>風險等級分布</strong><span>目前尚未結束的告警</span></div>
          </div>
        </template>
        <div class="severity-list">
          <button
            v-for="item in severitySummary"
            :key="item.severity"
            type="button"
            @click="openSeverity(item.severity)"
          >
            <div
              ><span>{{ item.label }}</span
              ><strong>{{ item.count }}</strong></div
            >
            <ElProgress
              :percentage="item.percentage"
              :stroke-width="10"
              :show-text="false"
              :color="item.color"
            />
          </button>
        </div>
      </ElCard>
    </div>

    <div class="table-grid">
      <ElCard shadow="never">
        <template #header>
          <div class="card-title">
            <div><strong>逾時待處理</strong><span>應優先確認與指派</span></div>
            <ElTag type="danger" effect="light">{{ store.overdueAlerts.length }} 筆</ElTag>
          </div>
        </template>
        <ElTable :data="store.overdueAlerts.slice(0, 6)" empty-text="目前沒有逾時告警">
          <ElTableColumn label="告警" min-width="210">
            <template #default="scope">
              <button class="alert-link" type="button" @click="openAlert(scope.row.id)">
                <strong>{{ scope.row.title }}</strong
                ><small>{{ scope.row.id }}</small>
              </button>
            </template>
          </ElTableColumn>
          <ElTableColumn label="等級" width="90">
            <template #default="scope">
              <ElTag :type="severityType(scope.row.severity)" effect="light">
                {{ severityLabel(scope.row.severity) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="subjectLabel" label="關聯對象" min-width="150" />
          <ElTableColumn prop="dueAt" label="處理期限" width="155" />
        </ElTable>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="card-title">
            <div><strong>近期高風險告警</strong><span>Critical 與 High</span></div>
            <ElButton link type="primary" @click="openSeverity('High')">查看更多</ElButton>
          </div>
        </template>
        <ElTable :data="highRiskAlerts" empty-text="目前沒有高風險告警">
          <ElTableColumn label="告警" min-width="210">
            <template #default="scope">
              <button class="alert-link" type="button" @click="openAlert(scope.row.id)">
                <strong>{{ scope.row.title }}</strong
                ><small>{{ scope.row.id }}</small>
              </button>
            </template>
          </ElTableColumn>
          <ElTableColumn label="分類" width="115">
            <template #default="scope">{{ categoryLabel(scope.row.category) }}</template>
          </ElTableColumn>
          <ElTableColumn label="分數" width="80" align="right">
            <template #default="scope"
              ><strong>{{ scope.row.score }}</strong></template
            >
          </ElTableColumn>
          <ElTableColumn prop="occurredAt" label="發生時間" width="155" />
        </ElTable>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { RiskAlertCategory, RiskSeverity } from '@/types/game-provider'
  import { useRiskCenterStore } from '@/store/modules/riskCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'RiskOverview' })

  const router = useRouter()
  const store = useRiskCenterStore()
  const categoryMeta: Record<RiskAlertCategory, { label: string; icon: string }> = {
    Member: { label: '會員異常', icon: 'ri:user-warning-line' },
    Bet: { label: '注單異常', icon: 'ri:file-warning-line' },
    Transaction: { label: '交易異常', icon: 'ri:exchange-dollar-line' },
    'Merchant Line': { label: '商戶線路異常', icon: 'ri:route-line' },
    Game: { label: '遊戲異常', icon: 'ri:gamepad-line' },
    Jackpot: { label: '獎池異常', icon: 'ri:funds-box-line' }
  }
  const severityMeta: Record<RiskSeverity, { label: string; color: string }> = {
    Critical: { label: '嚴重', color: '#b42318' },
    High: { label: '高', color: '#f56c6c' },
    Medium: { label: '中', color: '#e6a23c' },
    Low: { label: '低', color: '#409eff' }
  }
  const summaries = computed(() => [
    {
      label: '今日新增告警',
      value: store.alerts.filter((item) => item.occurredAt.startsWith('2026-09-03')).length,
      note: `${store.newAlertCount} 筆尚未確認`,
      icon: 'ri:alarm-warning-line',
      tone: 'warning'
    },
    {
      label: '嚴重告警',
      value: store.criticalAlertCount,
      note: '需優先處理',
      icon: 'ri:error-warning-line',
      tone: 'danger'
    },
    {
      label: '調查中案件',
      value: store.investigatingCount,
      note: '由告警轉入調查',
      icon: 'ri:search-eye-line',
      tone: 'primary'
    },
    {
      label: '逾時未處理',
      value: store.overdueAlerts.length,
      note: '已超過處理期限',
      icon: 'ri:timer-flash-line',
      tone: 'danger'
    },
    {
      label: '今日已處理',
      value: store.alerts.filter((item) =>
        ['Resolved', 'False Positive', 'Dismissed'].includes(item.status)
      ).length,
      note: '已結束或排除',
      icon: 'ri:checkbox-circle-line',
      tone: 'success'
    },
    {
      label: '啟用規則',
      value: store.rules.filter((item) => item.status === 'Active').length,
      note: `${store.rules.length} 條規則`,
      icon: 'ri:filter-3-line',
      tone: 'primary'
    }
  ])
  const categorySummary = computed(() =>
    (Object.keys(categoryMeta) as RiskAlertCategory[]).map((category) => ({
      category,
      ...categoryMeta[category],
      total: store.alerts.filter((item) => item.category === category).length,
      open: store.openAlerts.filter((item) => item.category === category).length
    }))
  )
  const severitySummary = computed(() =>
    (Object.keys(severityMeta) as RiskSeverity[]).map((severity) => {
      const count = store.openAlerts.filter((item) => item.severity === severity).length
      return {
        severity,
        ...severityMeta[severity],
        count,
        percentage: store.openAlerts.length
          ? Math.round((count / store.openAlerts.length) * 100)
          : 0
      }
    })
  )
  const highRiskAlerts = computed(() =>
    store.openAlerts
      .filter((item) => ['Critical', 'High'].includes(item.severity))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 6)
  )
  const categoryLabel = (category: RiskAlertCategory) => categoryMeta[category].label
  const severityLabel = (severity: RiskSeverity) => severityMeta[severity].label
  const severityType = (severity: RiskSeverity) =>
    severity === 'Critical' || severity === 'High'
      ? 'danger'
      : severity === 'Medium'
        ? 'warning'
        : 'info'
  const openCategory = (category: RiskAlertCategory) =>
    router.push({ path: '/risk/alerts', query: { category } })
  const openSeverity = (severity: RiskSeverity) =>
    router.push({ path: '/risk/alerts', query: { severity } })
  const openAlert = (alertId: string) => router.push({ path: '/risk/alerts', query: { alertId } })
</script>

<style scoped lang="scss">
  .risk-overview-page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid :deep(.el-card__body) {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
  }

  .summary-grid span,
  .summary-grid small,
  .card-title span {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    display: block;
    margin: 3px 0;
    font-size: 22px;
  }

  .summary-icon {
    display: grid;
    flex: 0 0 40px;
    place-items: center;
    height: 40px;
    font-size: 19px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 10px;
  }

  .summary-icon.danger {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  .summary-icon.warning {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
  }

  .summary-icon.success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  .content-grid,
  .table-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
    gap: 16px;
  }

  .table-grid {
    grid-template-columns: 1fr 1fr;
  }

  .card-title {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .card-title > div {
    display: grid;
    gap: 4px;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .category-grid button,
  .severity-list button,
  .alert-link {
    font: inherit;
    color: inherit;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .category-grid button {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    gap: 5px 8px;
    align-items: center;
    padding: 14px;
    text-align: left;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .category-grid button:hover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  .category-grid .art-svg-icon {
    grid-row: 1 / 3;
    font-size: 20px;
    color: var(--el-color-primary);
  }

  .category-grid small {
    color: var(--art-gray-500);
  }

  .severity-list {
    display: grid;
    gap: 16px;
  }

  .severity-list button {
    display: grid;
    gap: 7px;
    width: 100%;
    text-align: left;
  }

  .severity-list button > div {
    display: flex;
    justify-content: space-between;
  }

  .alert-link {
    display: grid;
    gap: 3px;
    text-align: left;
  }

  .alert-link:hover strong {
    color: var(--el-color-primary);
  }

  .alert-link small {
    color: var(--art-gray-500);
  }

  @media (width <= 1280px) {
    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (width <= 900px) {
    .content-grid,
    .table-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 640px) {
    .summary-grid,
    .category-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
