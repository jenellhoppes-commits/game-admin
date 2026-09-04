<template>
  <div class="page">
    <AppPageHeader
      title="操作日誌"
      eyebrow="平台管理 · 帳號與權限"
      description="集中查詢全平台的人員操作、設定異動與高風險行為。"
    >
      <template #actions>
        <ElButton @click="ElMessage.success('操作日誌已重新整理')">重新整理</ElButton>
        <ElButton type="primary" plain @click="ElMessage.success('操作日誌已匯出')"
          >匯出日誌</ElButton
        >
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <button type="button" @click="setSummary('', '')">
        <span>操作總數</span><strong>{{ store.logs.length }}</strong
        ><small>目前保留資料</small>
      </button>
      <button type="button" @click="setSummary('', today)">
        <span>今日操作</span><strong>{{ todayCount }}</strong
        ><small>{{ today }}</small>
      </button>
      <button type="button" @click="setSummary('High', '')">
        <span>高風險操作</span><strong class="danger">{{ highRiskCount }}</strong
        ><small>需優先稽核</small>
      </button>
      <div> <span>資料保留</span><strong>365 天</strong><small>不可由前台修改或刪除</small> </div>
    </div>

    <ElAlert
      title="日誌涵蓋帳號、角色權限、遊戲、商戶、匯率、對帳結算與報表操作；正式環境應由後端保存修改前後內容、來源 IP 與操作者。"
      type="info"
      :closable="false"
      show-icon
    />

    <ElCard shadow="never" class="filter-card">
      <ElForm inline>
        <ElFormItem label="關鍵字">
          <ElInput v-model="filters.keyword" clearable placeholder="對象、操作人或說明" />
        </ElFormItem>
        <ElFormItem label="功能模組">
          <ElSelect v-model="filters.module" clearable placeholder="全部模組">
            <ElOption v-for="item in moduleOptions" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="風險等級">
          <ElSelect v-model="filters.riskLevel" clearable placeholder="全部等級">
            <ElOption label="一般" value="Normal" />
            <ElOption label="中度" value="Medium" />
            <ElOption label="高風險" value="High" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="操作日期">
          <ElInput v-model="filters.date" clearable placeholder="YYYY-MM-DD" />
        </ElFormItem>
        <ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem>
        <ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="table-card">
      <div class="toolbar">
        <div
          ><strong>全平台操作軌跡</strong><span>共 {{ rows.length }} 筆</span></div
        >
        <span>依操作時間由新到舊顯示</span>
      </div>
      <ElTable :data="rows" border row-key="id">
        <ElTableColumn prop="createdAt" label="操作時間" min-width="165" fixed="left" />
        <ElTableColumn label="功能模組" min-width="130">
          <template #default="scope">
            <ElTag effect="plain">{{ scope.row.module || '帳號與權限' }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作對象" min-width="170">
          <template #default="scope">
            <strong>{{ scope.row.entityId }}</strong
            ><br /><small>{{ entityLabel(scope.row.entityType) }} · {{ scope.row.id }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="action" label="操作行為" min-width="170" />
        <ElTableColumn label="異動內容" min-width="260">
          <template #default="scope">
            <span class="change-value">{{ scope.row.beforeValue }}</span>
            <span class="arrow">→</span>
            <span class="change-value after">{{ scope.row.afterValue }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作人／來源" min-width="160">
          <template #default="scope">
            {{ scope.row.operator }}<br /><small>{{ scope.row.ipAddress || '系統內部' }}</small>
          </template>
        </ElTableColumn>
        <ElTableColumn label="風險" width="100" align="center">
          <template #default="scope">
            <ElTag :type="riskType(scope.row.riskLevel)" effect="plain">
              {{ riskLabel(scope.row.riskLevel) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="note" label="原因／說明" min-width="250" show-overflow-tooltip />
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { usePlatformAccessStore } from '@/store/modules/platformAccess'
  import type { PlatformAccessLog } from '@/types/game-provider'

  defineOptions({ name: 'PlatformOperationLogs' })
  const store = usePlatformAccessStore()
  const today = '2026-09-04'
  const filters = reactive({ keyword: '', module: '', riskLevel: '', date: '' })
  const moduleOptions = computed(() =>
    Array.from(new Set(store.logs.map((item) => item.module || '帳號與權限')))
  )
  const todayCount = computed(
    () => store.logs.filter((item) => item.createdAt.startsWith(today)).length
  )
  const highRiskCount = computed(
    () => store.logs.filter((item) => item.riskLevel === 'High').length
  )
  const rows = computed(() =>
    store.logs
      .filter(
        (item) =>
          (!filters.module || (item.module || '帳號與權限') === filters.module) &&
          (!filters.riskLevel || item.riskLevel === filters.riskLevel) &&
          (!filters.date || item.createdAt.startsWith(filters.date)) &&
          (!filters.keyword ||
            `${item.entityId}${item.action}${item.operator}${item.note}`
              .toLowerCase()
              .includes(filters.keyword.toLowerCase()))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )
  const setSummary = (riskLevel: string, date: string) => {
    filters.riskLevel = riskLevel
    filters.date = date
  }
  const reset = () => {
    filters.keyword = ''
    filters.module = ''
    filters.riskLevel = ''
    filters.date = ''
  }
  const entityLabel = (type: PlatformAccessLog['entityType']) =>
    ({
      Account: '人員帳號',
      Role: '角色',
      Permission: '操作權限',
      'Sensitive Grant': '敏感權限',
      'Data Scope': '資料範圍',
      Game: '遊戲',
      Merchant: '商戶',
      'Exchange Rate': '匯率',
      Reconciliation: '對帳單',
      Report: '報表'
    })[type]
  const riskLabel = (risk?: PlatformAccessLog['riskLevel']) =>
    ({ Normal: '一般', Medium: '中度', High: '高風險' })[risk || 'Normal']
  const riskType = (risk?: PlatformAccessLog['riskLevel']) =>
    risk === 'High' ? 'danger' : risk === 'Medium' ? 'warning' : 'info'
</script>

<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    button,
    > div {
      padding: 18px 20px;
      text-align: left;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    button {
      cursor: pointer;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    span,
    small {
      display: block;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 8px 0 4px;
      font-size: 24px;
      color: var(--art-text-gray-900);
    }
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    color: var(--art-gray-600);

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
      color: var(--art-text-gray-900);
    }
  }

  .change-value {
    display: inline-block;
    max-width: 100px;
    overflow: hidden;
    color: var(--art-gray-600);
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;

    &.after {
      font-weight: 600;
      color: var(--art-text-gray-900);
    }
  }

  .arrow {
    margin: 0 8px;
    color: var(--art-gray-500);
  }

  .danger {
    color: var(--el-color-danger) !important;
  }

  small {
    color: var(--art-gray-600);
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 620px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
