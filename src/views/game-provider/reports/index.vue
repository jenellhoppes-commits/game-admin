<template>
  <div class="report-page">
    <AppPageHeader :title="mainCopy.title" eyebrow="報表中心" :description="mainCopy.description">
      <template #actions>
        <ElButton @click="definitionVisible = true">指標說明</ElButton>
        <ElButton type="primary" @click="exportRows">匯出報表</ElButton>
      </template>
    </AppPageHeader>

    <ElCard v-if="analysisOptions.length > 1" shadow="never" class="analysis-tabs-card">
      <div class="analysis-heading">
        <div>
          <strong>分析視角</strong>
          <span>同一份報表內切換維度，不再增加側邊選單</span>
        </div>
      </div>
      <ElTabs v-model="activeMode">
        <ElTabPane
          v-for="option in analysisOptions"
          :key="option.value"
          :label="option.label"
          :name="option.value"
        />
      </ElTabs>
    </ElCard>

    <ElCard shadow="never" class="filter-card">
      <template #header>
        <div class="card-heading">
          <div>
            <strong>查詢條件</strong>
            <span>控制要納入統計的資料範圍</span>
          </div>
        </div>
      </template>
      <ElForm inline label-position="left">
        <ElFormItem label="資料日期">
          <ElDatePicker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="開始日期"
            end-placeholder="結束日期"
            value-format="YYYY-MM-DD"
            :clearable="false"
          />
        </ElFormItem>
        <ElFormItem label="統計週期">
          <ElSegmented
            v-model="filters.granularity"
            :options="['日', '週', '月']"
            aria-label="統計週期"
          />
        </ElFormItem>
        <ElFormItem label="資料幣別">
          <ElSelect
            v-model="filters.currency"
            clearable
            placeholder="全部幣別"
            class="filter-select"
          >
            <ElOption
              v-for="currency in currencies"
              :key="currency"
              :label="currency"
              :value="currency"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="showAgentFilter" label="代理">
          <ElSelect
            v-model="filters.agentId"
            clearable
            filterable
            placeholder="全部代理"
            class="filter-select"
          >
            <ElOption
              v-for="agent in businessStore.agents"
              :key="agent.id"
              :label="`${agent.name}｜${agent.code}`"
              :value="agent.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="showMerchantFilter" label="商戶">
          <ElSelect
            v-model="filters.merchantId"
            clearable
            filterable
            placeholder="全部商戶"
            class="filter-select"
          >
            <ElOption
              v-for="merchant in merchantOptions"
              :key="merchant.id"
              :label="`${merchant.name}｜${merchant.code}`"
              :value="merchant.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="showGameFilter" label="遊戲">
          <ElSelect
            v-model="filters.gameId"
            clearable
            filterable
            placeholder="全部遊戲"
            class="filter-select"
          >
            <ElOption
              v-for="game in gameStore.games"
              :key="game.id"
              :label="`${game.displayName}｜${game.code}`"
              :value="game.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="關鍵字">
          <ElInput v-model="filters.keyword" clearable :placeholder="copy.keywordPlaceholder" />
        </ElFormItem>
        <ElFormItem label="排除測試資料">
          <ElSwitch v-model="filters.excludeTest" aria-label="排除測試資料" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="applyFilters">查詢</ElButton>
          <ElButton @click="resetFilters">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="currency-display-card">
      <template #header>
        <div class="card-heading">
          <div>
            <strong>金額顯示與匯率</strong>
            <span>只改變報表顯示，不會改寫原始資料或正式結算金額</span>
          </div>
          <ElButton link type="primary" @click="openRateHistory">查看匯率歷史</ElButton>
        </div>
      </template>
      <div class="currency-display-grid">
        <div class="currency-control">
          <span class="control-label">顯示方式</span>
          <ElRadioGroup v-model="displayMode">
            <ElRadioButton value="Original">各自原幣</ElRadioButton>
            <ElRadioButton value="Reference">統一換算</ElRadioButton>
          </ElRadioGroup>
        </div>
        <div class="currency-control">
          <span class="control-label">換算幣別</span>
          <ElSelect
            v-model="referenceCurrency"
            class="currency-target-select"
            :disabled="displayMode === 'Original'"
            aria-label="換算幣別"
          >
            <ElOption
              v-for="currency in displayCurrencies"
              :key="currency.code"
              :label="`${currency.code}｜${currency.name}`"
              :value="currency.code"
            />
          </ElSelect>
        </div>
        <div class="rate-summary">
          <div>
            <span>目前顯示口徑</span>
            <strong>{{ conversionSummary }}</strong>
          </div>
          <div>
            <span>目前適用匯率</span>
            <strong>{{ currentRateLabel }}</strong>
          </div>
          <div>
            <span>匯率依據</span>
            <strong>{{ rateBasisLabel }}</strong>
          </div>
        </div>
      </div>
    </ElCard>

    <ElAlert :title="modeAlert" type="info" :closable="false" show-icon />

    <div class="summary-grid">
      <button
        v-for="card in summaryCards"
        :key="card.label"
        type="button"
        :class="{ 'is-clickable': Boolean(card.filter) }"
        :disabled="!card.filter"
        @click="card.filter && applySummaryFilter(card.filter)"
      >
        <span>{{ card.label }}</span>
        <strong :class="card.tone">{{ card.value }}</strong>
        <small>{{ card.note }}</small>
      </button>
    </div>

    <div class="insight-grid" :class="{ 'has-tree': showHierarchy }">
      <ElCard v-if="showHierarchy" shadow="never" class="hierarchy-card">
        <template #header>
          <div class="card-heading">
            <div>
              <strong>{{ mainReport === 'agents' ? '代理層級' : '代理／商戶層級' }}</strong>
              <span>{{ selectedHierarchyLabel }}</span>
            </div>
            <ElButton link type="primary" @click="clearHierarchy">查看全部</ElButton>
          </div>
        </template>
        <ElTree
          ref="hierarchyTreeRef"
          :data="hierarchyData"
          node-key="id"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="selectHierarchyNode"
        />
      </ElCard>

      <ElCard shadow="never" class="distribution-card">
        <template #header>
          <div class="card-heading">
            <div>
              <strong>{{ distributionTitle }}</strong>
              <span>依目前篩選條件顯示前 {{ distributionItems.length }} 名</span>
            </div>
            <ElTag effect="plain">{{ appliedFilters.granularity }}統計</ElTag>
          </div>
        </template>
        <div v-if="distributionItems.length" class="distribution-list">
          <div v-for="item in distributionItems" :key="item.id" class="distribution-item">
            <div class="distribution-label">
              <span>{{ item.label }}</span>
              <strong>{{ item.display }}</strong>
            </div>
            <div class="distribution-track">
              <i :style="{ width: `${item.percent}%` }" />
            </div>
          </div>
        </div>
        <ElEmpty v-else :description="distributionEmptyText" :image-size="72" />
      </ElCard>
    </div>

    <ElCard shadow="never" class="table-card">
      <div class="table-toolbar">
        <div>
          <strong>{{ copy.tableTitle }}</strong>
          <span>共 {{ filteredRows.length }} 筆</span>
          <small>最後更新：{{ reportStore.reportTime }}</small>
        </div>
      </div>

      <ElTable :data="pagedRows" border row-key="id" empty-text="目前篩選條件沒有資料">
        <ElTableColumn label="項目" min-width="220" :fixed="isMobile ? undefined : 'left'">
          <template #default="scope">
            <button class="entity-link" type="button" @click="openSource(scope.row)">
              <strong>{{ scope.row.primary }}</strong>
              <small>{{ scope.row.secondary || scope.row.id }}</small>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn
          v-for="column in copy.columns"
          :key="column.key"
          :label="column.label"
          :min-width="column.minWidth || 130"
          :align="column.align || 'left'"
        >
          <template #default="scope">
            <ElTag
              v-if="column.kind === 'status'"
              :type="statusType(scope.row.status)"
              effect="plain"
            >
              {{ statusLabel(scope.row.status) }}
            </ElTag>
            <span v-else :class="{ 'negative-value': isNegative(scope.row, column.key) }">
              {{ formatCell(scope.row, column) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="更新時間" min-width="160" prop="updatedAt" />
        <ElTableColumn v-if="!isMobile" label="操作" width="110" fixed="right">
          <template #default="scope">
            <ElButton link type="primary" @click="openSource(scope.row)">查看來源</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pagination-row">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="filteredRows.length"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </ElCard>

    <ElDrawer v-model="definitionVisible" title="報表口徑與指標說明" size="520px">
      <ElAlert
        title="報表數值為前端 Mock Data；正式串接後須由資料倉儲提供可追溯的計算版本。"
        type="warning"
        :closable="false"
        show-icon
      />
      <ElDescriptions class="definition-list" :column="1" border>
        <ElDescriptionsItem label="投注金額">已接受且未取消的原始投注金額。</ElDescriptionsItem>
        <ElDescriptionsItem label="有效投注"
          >依遊戲與結算規則排除無效或取消注單後的金額。</ElDescriptionsItem
        >
        <ElDescriptionsItem label="遊戲商輸贏"
          >投注金額－派彩金額，不含後續人工調整。</ElDescriptionsItem
        >
        <ElDescriptionsItem label="實際 RTP">派彩金額 ÷ 投注金額 × 100%。</ElDescriptionsItem>
        <ElDescriptionsItem label="參考換算"
          >依目前平台匯率換算，僅供營運比較，不可作為正式結算依據。</ElDescriptionsItem
        >
        <ElDescriptionsItem label="測試資料"
          >預設排除測試會員；可關閉開關進行 QA 核對。</ElDescriptionsItem
        >
      </ElDescriptions>
      <div class="drawer-note">
        <strong>目前報表</strong>
        <p>{{ mainCopy.title }}｜{{ copy.title }}｜{{ copy.description }}</p>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import { useReportCenterStore } from '@/store/modules/reportCenter'
  import type { ReportMetricRow, ReportMode, ReportRowStatus } from '@/types/game-provider'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'ReportCenter' })

  type DisplayMode = 'Original' | 'Reference'
  type MainReport = 'operations' | 'games' | 'agents' | 'merchants' | 'jackpots'
  type Granularity = '日' | '週' | '月'
  type ColumnKind = 'text' | 'integer' | 'amount' | 'percent' | 'status'
  type ColumnKey = keyof ReportMetricRow

  interface ReportColumn {
    key: ColumnKey
    label: string
    kind: ColumnKind
    minWidth?: number
    align?: 'left' | 'center' | 'right'
  }

  interface ReportCopy {
    title: string
    eyebrow: string
    description: string
    tableTitle: string
    keywordPlaceholder: string
    columns: ReportColumn[]
  }

  interface ReportFilters {
    dateRange: [string, string]
    granularity: Granularity
    currency: string
    agentId: string
    merchantId: string
    gameId: string
    keyword: string
    excludeTest: boolean
    status: ReportRowStatus | ''
  }

  interface AnalysisOption {
    label: string
    value: ReportMode
  }

  interface HierarchyNode {
    id: string
    label: string
    type: 'root' | 'agent' | 'merchant'
    agentId?: string
    merchantId?: string
    children?: HierarchyNode[]
  }

  interface SummaryCard {
    label: string
    value: string
    note: string
    tone?: string
    filter?: ReportRowStatus
  }

  const amountColumn = (key: ColumnKey, label: string): ReportColumn => ({
    key,
    label,
    kind: 'amount',
    minWidth: 150,
    align: 'right'
  })
  const integerColumn = (key: ColumnKey, label: string): ReportColumn => ({
    key,
    label,
    kind: 'integer',
    minWidth: 115,
    align: 'right'
  })
  const percentColumn = (key: ColumnKey, label: string): ReportColumn => ({
    key,
    label,
    kind: 'percent',
    minWidth: 115,
    align: 'right'
  })
  const textColumn = (key: ColumnKey, label: string, minWidth = 140): ReportColumn => ({
    key,
    label,
    kind: 'text',
    minWidth
  })
  const statusColumn: ReportColumn = {
    key: 'status',
    label: '狀態',
    kind: 'status',
    minWidth: 105
  }

  const reportCopies: Record<ReportMode, ReportCopy> = {
    overview: {
      title: '營運總覽',
      eyebrow: '報表中心',
      description: '依交易幣別查看投注、派彩、遊戲商輸贏、RTP 與活躍會員。',
      tableTitle: '交易幣別營運彙總',
      keywordPlaceholder: '搜尋幣別或彙總項目',
      columns: [
        textColumn('period', '資料期間', 190),
        textColumn('currency', '交易幣別', 110),
        integerColumn('activeMembers', '活躍會員'),
        integerColumn('betCount', '注單數'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('payoutAmount', '派彩金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('actualRtp', '實際 RTP'),
        statusColumn
      ]
    },
    'game-performance': {
      title: '遊戲表現',
      eyebrow: '報表中心 · 遊戲報表',
      description: '比較遊戲投注、派彩、活躍會員、商戶覆蓋及營運表現。',
      tableTitle: '遊戲表現明細',
      keywordPlaceholder: '搜尋遊戲代碼或名稱',
      columns: [
        textColumn('currency', '交易幣別', 110),
        integerColumn('merchantCount', '商戶數'),
        integerColumn('activeMembers', '活躍會員'),
        integerColumn('rounds', '遊戲局數'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('payoutAmount', '派彩金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('actualRtp', '實際 RTP'),
        statusColumn
      ]
    },
    rtp: {
      title: 'RTP',
      eyebrow: '報表中心 · 遊戲報表',
      description: '監控理論 RTP、實際 RTP、樣本量與偏移狀況。',
      tableTitle: 'RTP 偏移監控',
      keywordPlaceholder: '搜尋遊戲代碼或名稱',
      columns: [
        textColumn('currency', '交易幣別', 110),
        integerColumn('rounds', '樣本局數'),
        amountColumn('betAmount', '樣本投注'),
        percentColumn('theoreticalRtp', '理論 RTP'),
        percentColumn('actualRtp', '實際 RTP'),
        percentColumn('rtpDeviation', '偏移'),
        statusColumn
      ]
    },
    merchant: {
      title: '商戶',
      eyebrow: '報表中心 · 商戶報表',
      description: '彙整商戶營運規模、交易成功率與遊戲商輸贏。',
      tableTitle: '商戶營運報表',
      keywordPlaceholder: '搜尋商戶代碼或名稱',
      columns: [
        textColumn('agentName', '所屬代理', 160),
        textColumn('currency', '結算幣別', 110),
        integerColumn('activeMembers', '活躍會員'),
        integerColumn('rounds', '遊戲局數'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('successRate', '交易成功率'),
        statusColumn
      ]
    },
    'merchant-line': {
      title: '商戶線路',
      eyebrow: '報表中心 · 商戶報表',
      description: '依商戶線路與交易幣別追蹤投注、RTP 與串接品質。',
      tableTitle: '商戶線路表現',
      keywordPlaceholder: '搜尋 Line UID 或商戶',
      columns: [
        textColumn('merchantName', '商戶', 160),
        textColumn('currency', '交易幣別', 110),
        textColumn('category', '環境', 110),
        integerColumn('activeMembers', '活躍會員'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('actualRtp', '實際 RTP'),
        percentColumn('successRate', '成功率'),
        statusColumn
      ]
    },
    agent: {
      title: '代理',
      eyebrow: '報表中心 · 代理報表',
      description: '依代理層級彙整旗下商戶、活躍會員、投注與收益表現。',
      tableTitle: '代理營運報表',
      keywordPlaceholder: '搜尋代理代碼或名稱',
      columns: [
        textColumn('category', '上級代理', 160),
        textColumn('currency', '結算幣別', 110),
        integerColumn('merchantCount', '商戶數'),
        integerColumn('activeMembers', '活躍會員'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('actualRtp', '實際 RTP'),
        statusColumn
      ]
    },
    'agent-merchant': {
      title: '旗下商戶',
      eyebrow: '報表中心 · 代理報表',
      description: '比較代理旗下各商戶的交易規模與收益貢獻。',
      tableTitle: '代理旗下商戶表現',
      keywordPlaceholder: '搜尋代理或商戶',
      columns: [
        textColumn('agentName', '所屬代理', 160),
        textColumn('currency', '結算幣別', 110),
        integerColumn('activeMembers', '活躍會員'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('payoutAmount', '派彩金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('actualRtp', '實際 RTP'),
        statusColumn
      ]
    },
    member: {
      title: '會員報表',
      eyebrow: '報表中心',
      description: '分析會員活躍、投注、派彩、標記與風險狀態。',
      tableTitle: '會員營運報表',
      keywordPlaceholder: '搜尋會員識別碼或商戶',
      columns: [
        textColumn('merchantName', '商戶', 160),
        textColumn('lineUid', '商戶線路', 170),
        textColumn('currency', '交易幣別', 110),
        textColumn('category', '會員類型', 110),
        integerColumn('rounds', '遊戲局數'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('payoutAmount', '派彩金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        statusColumn
      ]
    },
    bet: {
      title: '注單統計',
      eyebrow: '報表中心 · 交易報表',
      description: '依遊戲與交易幣別彙整注單數、投注、派彩與 RTP。',
      tableTitle: '注單統計明細',
      keywordPlaceholder: '搜尋遊戲或交易幣別',
      columns: [
        textColumn('category', '遊戲類型', 120),
        textColumn('currency', '交易幣別', 110),
        integerColumn('betCount', '注單數'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('validBetAmount', '有效投注'),
        amountColumn('payoutAmount', '派彩金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        percentColumn('actualRtp', '實際 RTP'),
        statusColumn
      ]
    },
    transaction: {
      title: '交易統計',
      eyebrow: '報表中心 · 交易報表',
      description: '依交易類型與幣別檢視交易量、金額、成功率與異常。',
      tableTitle: '交易統計明細',
      keywordPlaceholder: '搜尋交易類型或幣別',
      columns: [
        textColumn('category', '交易類型', 130),
        textColumn('currency', '交易幣別', 110),
        integerColumn('transactionCount', '交易筆數'),
        amountColumn('betAmount', '交易金額'),
        percentColumn('successRate', '成功率'),
        statusColumn
      ]
    },
    jackpot: {
      title: '獎池報表',
      eyebrow: '報表中心',
      description: '檢視各幣別獎池水位、累積、派發與事件筆數。',
      tableTitle: '獎池營運報表',
      keywordPlaceholder: '搜尋獎池代碼或名稱',
      columns: [
        textColumn('category', '獎池類型', 130),
        textColumn('currency', '交易幣別', 110),
        integerColumn('transactionCount', '流水筆數'),
        amountColumn('jackpotContribution', '累積金額'),
        amountColumn('jackpotPayout', '派發金額'),
        amountColumn('currentBalance', '目前水位'),
        statusColumn
      ]
    },
    'merchant-settlement': {
      title: '商戶結算',
      eyebrow: '報表中心 · 結算報表',
      description: '使用正式條件與匯率快照呈現商戶結算結果。',
      tableTitle: '商戶結算報表',
      keywordPlaceholder: '搜尋商戶、線路或對帳單',
      columns: [
        textColumn('period', '結算期間', 120),
        textColumn('lineUid', '商戶線路', 180),
        textColumn('currency', '原始幣別', 110),
        amountColumn('betAmount', '投注金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        amountColumn('adjustmentAmount', '調整金額'),
        amountColumn('settlementAmount', '結算金額'),
        statusColumn
      ]
    },
    'agent-settlement': {
      title: '代理結算',
      eyebrow: '報表中心 · 結算報表',
      description: '依代理條件、旗下商戶對帳與匯率快照呈現代理結算。',
      tableTitle: '代理結算報表',
      keywordPlaceholder: '搜尋代理或對帳單',
      columns: [
        textColumn('period', '結算期間', 120),
        textColumn('currency', '原始幣別', 110),
        integerColumn('merchantCount', '商戶數'),
        amountColumn('betAmount', '投注金額'),
        amountColumn('ggr', '遊戲商輸贏'),
        amountColumn('adjustmentAmount', '調整金額'),
        amountColumn('settlementAmount', '結算金額'),
        statusColumn
      ]
    }
  }

  const mainReportCopies: Record<MainReport, { title: string; description: string }> = {
    operations: {
      title: '營運報表',
      description: '掌握全平台投注、會員與交易健康度，並依日期、週期及幣別切換統計口徑。'
    },
    games: {
      title: '遊戲報表',
      description: '從遊戲表現、RTP 與注單三個視角，分析內容成效與異常偏移。'
    },
    agents: {
      title: '代理報表',
      description: '沿代理層級查看旗下商戶、營運貢獻與結算結果，快速定位差異來源。'
    },
    merchants: {
      title: '商戶報表',
      description: '依代理與商戶樹狀關係，分析商戶、線路及結算表現。'
    },
    jackpots: {
      title: '獎池報表',
      description: '集中檢視各獎池的水位、累積、派發與異常狀態。'
    }
  }

  const analysisByReport: Record<MainReport, AnalysisOption[]> = {
    operations: [
      { label: '營運概況', value: 'overview' },
      { label: '交易分析', value: 'transaction' },
      { label: '會員分析', value: 'member' }
    ],
    games: [
      { label: '遊戲表現', value: 'game-performance' },
      { label: 'RTP 分析', value: 'rtp' },
      { label: '注單分析', value: 'bet' }
    ],
    agents: [
      { label: '代理總覽', value: 'agent' },
      { label: '旗下商戶', value: 'agent-merchant' },
      { label: '結算分析', value: 'agent-settlement' }
    ],
    merchants: [
      { label: '商戶總覽', value: 'merchant' },
      { label: '線路分析', value: 'merchant-line' },
      { label: '結算分析', value: 'merchant-settlement' }
    ],
    jackpots: [{ label: '獎池總覽', value: 'jackpot' }]
  }

  const route = useRoute()
  const router = useRouter()
  const businessStore = useBusinessPartnerStore()
  const gameStore = useGameCatalogStore()
  const reportStore = useReportCenterStore()
  const { width } = useWindowSize()
  const isMobile = computed(() => width.value <= 680)

  const routeReportMap: Record<string, MainReport> = {
    OperationsReport: 'operations',
    GameReport: 'games',
    AgentReport: 'agents',
    MerchantReport: 'merchants',
    JackpotReport: 'jackpots'
  }

  const mainReport = computed<MainReport>(() => routeReportMap[String(route.name)] || 'operations')
  const mainCopy = computed(() => mainReportCopies[mainReport.value])
  const analysisOptions = computed(() => analysisByReport[mainReport.value])
  const activeMode = ref<ReportMode>('overview')
  const mode = computed(() => activeMode.value)
  const copy = computed(() => reportCopies[activeMode.value])
  const displayMode = ref<DisplayMode>('Original')
  const referenceCurrency = ref('USDT')
  const definitionVisible = ref(false)
  const pagination = reactive({ current: 1, size: 10 })

  const defaultFilters = (): ReportFilters => ({
    dateRange: ['2026-09-01', '2026-09-04'],
    granularity: '日',
    currency: '',
    agentId: '',
    merchantId: '',
    gameId: '',
    keyword: '',
    excludeTest: true,
    status: ''
  })
  const filters = reactive<ReportFilters>(defaultFilters())
  const appliedFilters = ref<ReportFilters>(defaultFilters())
  const displayCurrencies = computed(() => reportStore.getDisplayCurrencies())
  const currencyPrecision = (currency: string) =>
    Math.min(displayCurrencies.value.find((item) => item.code === currency)?.decimalPlaces ?? 2, 6)

  const currencies = computed(() => [
    ...new Set(reportStore.getRows(mode.value).map((row) => row.currency))
  ])
  const showAgentFilter = computed(() =>
    [
      'merchant',
      'merchant-line',
      'agent',
      'agent-merchant',
      'member',
      'merchant-settlement',
      'agent-settlement'
    ].includes(mode.value)
  )
  const showMerchantFilter = computed(() =>
    ['merchant', 'merchant-line', 'agent-merchant', 'member', 'merchant-settlement'].includes(
      mode.value
    )
  )
  const showGameFilter = computed(() =>
    ['game-performance', 'rtp', 'member', 'bet', 'jackpot'].includes(mode.value)
  )
  const merchantOptions = computed(() =>
    filters.agentId
      ? businessStore.merchants.filter((merchant) => merchant.agentId === filters.agentId)
      : businessStore.merchants
  )

  const showHierarchy = computed(() => ['agents', 'merchants'].includes(mainReport.value))
  const hierarchyTreeRef = ref()
  const buildAgentNodes = (parentAgentId?: string): HierarchyNode[] =>
    businessStore.agents
      .filter((agent) => agent.parentAgentId === parentAgentId)
      .map((agent) => {
        const agentChildren = buildAgentNodes(agent.id)
        const merchantChildren: HierarchyNode[] =
          mainReport.value === 'merchants'
            ? businessStore.merchants
                .filter((merchant) => merchant.agentId === agent.id)
                .map((merchant) => ({
                  id: `merchant-${merchant.id}`,
                  label: `${merchant.name}｜${merchant.code}`,
                  type: 'merchant',
                  agentId: agent.id,
                  merchantId: merchant.id
                }))
            : []
        return {
          id: `agent-${agent.id}`,
          label: `${agent.name}｜${agent.level}`,
          type: 'agent',
          agentId: agent.id,
          children: [...agentChildren, ...merchantChildren]
        }
      })

  const hierarchyData = computed<HierarchyNode[]>(() => [
    {
      id: 'all',
      label: mainReport.value === 'agents' ? '全部代理' : '全部代理與商戶',
      type: 'root',
      children: buildAgentNodes()
    }
  ])
  const selectedHierarchyLabel = computed(() => {
    if (filters.merchantId) {
      const merchant = businessStore.merchants.find((item) => item.id === filters.merchantId)
      return merchant ? `目前：${merchant.name}` : '目前：全部'
    }
    if (filters.agentId) {
      const agent = businessStore.agents.find((item) => item.id === filters.agentId)
      return agent ? `目前：${agent.name}（含下層）` : '目前：全部'
    }
    return '選擇節點即可縮小統計範圍'
  })
  const appliedAgentIds = computed(() => {
    const ids = new Set<string>()
    const append = (agentId: string) => {
      ids.add(agentId)
      businessStore.agents
        .filter((agent) => agent.parentAgentId === agentId)
        .forEach((agent) => append(agent.id))
    }
    if (appliedFilters.value.agentId) append(appliedFilters.value.agentId)
    return ids
  })

  const sourceRows = computed(() => reportStore.getRows(mode.value))
  const filteredRows = computed(() => {
    const query = appliedFilters.value.keyword.trim().toLowerCase()
    return sourceRows.value.filter((row) => {
      if (appliedFilters.value.currency && row.currency !== appliedFilters.value.currency)
        return false
      if (appliedFilters.value.agentId && (!row.agentId || !appliedAgentIds.value.has(row.agentId)))
        return false
      if (appliedFilters.value.merchantId && row.merchantId !== appliedFilters.value.merchantId)
        return false
      if (appliedFilters.value.gameId && row.gameId !== appliedFilters.value.gameId) return false
      if (appliedFilters.value.excludeTest && row.category === '測試會員') return false
      if (appliedFilters.value.status && row.status !== appliedFilters.value.status) return false
      return (
        !query ||
        `${row.primary} ${row.secondary || ''} ${row.agentName || ''} ${row.merchantName || ''} ${row.lineUid || ''}`
          .toLowerCase()
          .includes(query)
      )
    })
  })
  const sourceCurrencies = computed(() => [
    ...new Set(filteredRows.value.map((row) => row.currency))
  ])
  const conversionQuotes = computed(() =>
    sourceCurrencies.value.map((currency) => ({
      currency,
      quote: reportStore.getRateQuote(currency, referenceCurrency.value)
    }))
  )
  const successfulQuotes = computed(() => conversionQuotes.value.filter((item) => item.quote.ok))
  const latestRateDate = computed(
    () =>
      successfulQuotes.value
        .map((item) => item.quote.rateDate || '')
        .filter(Boolean)
        .sort()
        .at(-1) || '同幣別 1:1'
  )
  const usedSnapshotCount = computed(
    () => new Set(successfulQuotes.value.flatMap((item) => item.quote.snapshotIds || [])).size
  )
  const conversionSummary = computed(() => {
    if (displayMode.value === 'Original') return '每列保留資料原幣'
    return `全部金額統一顯示為 ${referenceCurrency.value}`
  })
  const currentRateLabel = computed(() => {
    if (displayMode.value === 'Original') return '未套用換算'
    if (!sourceCurrencies.value.length) return '目前沒有可換算資料'
    if (sourceCurrencies.value.length > 1) {
      const failedCount = conversionQuotes.value.length - successfulQuotes.value.length
      return failedCount
        ? `${successfulQuotes.value.length} 種成功、${failedCount} 種缺少匯率`
        : `${sourceCurrencies.value.length} 種資料幣別逐列換算`
    }
    const [{ currency, quote }] = conversionQuotes.value
    if (!quote.ok) return quote.message
    return `1 ${currency} = ${formatNumber(quote.rate, 6)} ${referenceCurrency.value}`
  })
  const rateBasisLabel = computed(() => {
    if (displayMode.value === 'Original') return '不進行跨幣別加總'
    const snapshotText = usedSnapshotCount.value
      ? `${usedSnapshotCount.value} 筆鎖定快照`
      : '同幣別不需快照'
    return `${latestRateDate.value}｜${snapshotText}｜USDT 交叉換算`
  })
  const pagedRows = computed(() => {
    const start = (pagination.current - 1) * pagination.size
    return filteredRows.value.slice(start, start + pagination.size)
  })

  const modeAlert = computed(() => {
    if (displayMode.value === 'Reference') {
      const settlementText = ['merchant-settlement', 'agent-settlement'].includes(mode.value)
        ? '原結算結果仍使用當期正式快照，不會被改寫。'
        : '換算結果只供營運比較，不可作為正式結算依據。'
      return `目前以 ${referenceCurrency.value} 統一換算，採用 ${latestRateDate.value} 的平台鎖定匯率；${settlementText}`
    }
    if (['merchant-settlement', 'agent-settlement'].includes(mode.value)) {
      return '目前顯示正式結算原幣；每筆結果使用當期鎖定的商務條件與匯率快照。'
    }
    return '各自原幣不跨幣別加總；若要比較總額與排名，請選擇單一資料幣別或切換「統一換算」。'
  })

  const formatNumber = (value: number, digits = 0) =>
    new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value)

  const displayAmount = (row: ReportMetricRow, value: number) => {
    const amount =
      displayMode.value === 'Reference'
        ? reportStore.convertAmount(value, row.currency, referenceCurrency.value)
        : value
    const currency = displayMode.value === 'Reference' ? referenceCurrency.value : row.currency
    if (!Number.isFinite(amount)) return `匯率缺失｜${row.currency} → ${currency}`
    return `${formatNumber(amount, currencyPrecision(currency))} ${currency}`
  }

  const formatCell = (row: ReportMetricRow, column: ReportColumn) => {
    const value = row[column.key]
    if (value === undefined || value === null || value === '') return '—'
    if (column.kind === 'amount') return displayAmount(row, Number(value))
    if (column.kind === 'integer') return formatNumber(Number(value))
    if (column.kind === 'percent') {
      const prefix = column.key === 'rtpDeviation' && Number(value) > 0 ? '+' : ''
      return `${prefix}${formatNumber(Number(value), 2)}%`
    }
    return String(value)
  }

  const distributionMetric = computed<{
    key: ColumnKey
    label: string
    kind: 'amount' | 'integer' | 'percent'
  }>(() => {
    if (mode.value === 'rtp') return { key: 'actualRtp', label: '實際 RTP', kind: 'percent' }
    if (mode.value === 'jackpot')
      return { key: 'currentBalance', label: '獎池水位', kind: 'amount' }
    if (mode.value === 'transaction')
      return { key: 'transactionCount', label: '交易量', kind: 'integer' }
    if (['member', 'bet'].includes(mode.value))
      return { key: 'betAmount', label: '投注規模', kind: 'amount' }
    return { key: 'ggr', label: '遊戲商輸贏', kind: 'amount' }
  })
  const distributionTitle = computed(() => `${distributionMetric.value.label}分布`)
  const distributionNeedsConversion = computed(
    () => displayMode.value === 'Original' && sourceCurrencies.value.length > 1
  )
  const distributionEmptyText = computed(() =>
    distributionNeedsConversion.value
      ? '不同幣別不能直接排名，請選擇單一資料幣別或切換統一換算'
      : '目前條件沒有可分析資料'
  )
  const distributionItems = computed(() => {
    if (distributionNeedsConversion.value) return []
    const { key, kind } = distributionMetric.value
    const ranked = filteredRows.value
      .filter((row) => typeof row[key] === 'number')
      .map((row) => {
        const value = Number(row[key])
        const comparableValue =
          kind === 'amount' && displayMode.value === 'Reference'
            ? reportStore.convertAmount(value, row.currency, referenceCurrency.value)
            : value
        return { row, value, comparableValue }
      })
      .filter((item) => Number.isFinite(item.comparableValue))
      .sort((a, b) => Math.abs(b.comparableValue) - Math.abs(a.comparableValue))
      .slice(0, 6)
    const max = Math.max(...ranked.map((item) => Math.abs(item.comparableValue)), 1)
    return ranked.map(({ row, value, comparableValue }) => {
      const display =
        kind === 'percent'
          ? `${formatNumber(value, 2)}%`
          : kind === 'integer'
            ? `${formatNumber(value)} 筆`
            : displayAmount(row, value)
      return {
        id: row.id,
        label: row.primary,
        display,
        percent: Math.max(4, Math.round((Math.abs(comparableValue) / max) * 100))
      }
    })
  })

  const summarizeAmount = (key: ColumnKey) => {
    const rows = filteredRows.value.filter((row) => typeof row[key] === 'number')
    const currencySet = new Set(rows.map((row) => row.currency))
    if (!rows.length) return { value: '—', note: '目前沒有可計算資料' }
    if (displayMode.value === 'Original' && currencySet.size > 1) {
      return { value: '多幣別', note: '選擇資料幣別或統一換算' }
    }
    const currency = displayMode.value === 'Reference' ? referenceCurrency.value : rows[0].currency
    const amounts = rows.map((row) => {
      const value = Number(row[key] || 0)
      return displayMode.value === 'Reference'
        ? reportStore.convertAmount(value, row.currency, referenceCurrency.value)
        : value
    })
    if (amounts.some((amount) => !Number.isFinite(amount))) {
      return { value: '匯率缺失', note: `無法完整換算為 ${currency}` }
    }
    const total = amounts.reduce((sum, amount) => sum + amount, 0)
    return {
      value: formatNumber(total, currencyPrecision(currency)),
      note: `${currency}｜目前篩選範圍`
    }
  }

  const summaryCards = computed<SummaryCard[]>(() => {
    if (mode.value === 'transaction') {
      const transactionCount = filteredRows.value.reduce(
        (total, row) => total + (row.transactionCount || 0),
        0
      )
      const averageSuccess = transactionCount
        ? filteredRows.value.reduce(
            (total, row) => total + (row.successRate || 0) * (row.transactionCount || 0),
            0
          ) / transactionCount
        : 0
      return [
        { label: '交易筆數', value: formatNumber(transactionCount), note: '目前篩選範圍' },
        { label: '交易金額', ...summarizeAmount('betAmount') },
        {
          label: '平均成功率',
          value: `${formatNumber(averageSuccess, 2)}%`,
          note: '依交易筆數加權'
        },
        {
          label: '需注意',
          value: String(filteredRows.value.filter((row) => row.status === 'Attention').length),
          note: '可點擊縮小範圍',
          tone: 'danger',
          filter: 'Attention' as ReportRowStatus
        }
      ]
    }
    if (mode.value === 'jackpot') {
      return [
        { label: '獎池數', value: String(filteredRows.value.length), note: '目前篩選範圍' },
        { label: '目前水位', ...summarizeAmount('currentBalance') },
        { label: '累積金額', ...summarizeAmount('jackpotContribution') },
        { label: '派發金額', ...summarizeAmount('jackpotPayout'), tone: 'warning' }
      ]
    }
    if (['merchant-settlement', 'agent-settlement'].includes(mode.value)) {
      return [
        { label: '報表筆數', value: String(filteredRows.value.length), note: '依期間與對象' },
        { label: '遊戲商輸贏', ...summarizeAmount('ggr') },
        { label: '調整金額', ...summarizeAmount('adjustmentAmount'), tone: 'warning' },
        { label: '結算金額', ...summarizeAmount('settlementAmount') }
      ]
    }
    const rtpTotals = filteredRows.value.reduce(
      (total, row) => {
        const rate = reportStore.getRateQuote(row.currency, 'USDT')
        const normalizedRate = rate.ok ? rate.rate : 0
        return {
          bet: total.bet + (row.betAmount || 0) * normalizedRate,
          payout: total.payout + (row.payoutAmount || 0) * normalizedRate
        }
      },
      { bet: 0, payout: 0 }
    )
    const averageRtp = rtpTotals.bet ? (rtpTotals.payout / rtpTotals.bet) * 100 : 0
    return [
      { label: '投注金額', ...summarizeAmount('betAmount') },
      { label: '派彩金額', ...summarizeAmount('payoutAmount') },
      { label: '遊戲商輸贏', ...summarizeAmount('ggr') },
      {
        label: '加權實際 RTP',
        value: `${formatNumber(averageRtp, 2)}%`,
        note: '總派彩 ÷ 總投注'
      }
    ]
  })

  const statusLabel = (status: ReportRowStatus) =>
    ({ Normal: '正常', Attention: '需注意', Pending: '待確認', Completed: '已完成' })[status]
  const statusType = (status: ReportRowStatus) =>
    ({ Normal: 'success', Attention: 'danger', Pending: 'warning', Completed: 'info' })[status] as
      | 'success'
      | 'danger'
      | 'warning'
      | 'info'

  const isNegative = (row: ReportMetricRow, key: ColumnKey) =>
    ['ggr', 'adjustmentAmount', 'settlementAmount'].includes(key) && Number(row[key] || 0) < 0

  const applyFilters = () => {
    appliedFilters.value = structuredClone(toRaw(filters))
    pagination.current = 1
    ElMessage.success('報表已依條件重新整理')
  }
  const resetFilters = () => {
    Object.assign(filters, defaultFilters())
    appliedFilters.value = defaultFilters()
    pagination.current = 1
  }
  const applySummaryFilter = (status: ReportRowStatus) => {
    filters.status = status
    appliedFilters.value = structuredClone(toRaw(filters))
    pagination.current = 1
  }

  const selectHierarchyNode = (node: HierarchyNode) => {
    if (node.type === 'root') {
      clearHierarchy()
      return
    }
    filters.agentId = node.agentId || ''
    filters.merchantId = node.type === 'merchant' ? node.merchantId || '' : ''
    appliedFilters.value = structuredClone(toRaw(filters))
    pagination.current = 1
  }

  const clearHierarchy = () => {
    filters.agentId = ''
    filters.merchantId = ''
    appliedFilters.value = structuredClone(toRaw(filters))
    pagination.current = 1
    hierarchyTreeRef.value?.setCurrentKey('all')
  }

  const resolveSourcePath = (row: ReportMetricRow) => {
    if (row.gameId) return `/games/management/${row.gameId}`
    if (row.lineUid && row.merchantId)
      return `/business/merchants/${row.merchantId}/lines/${row.lineUid}`
    if (row.memberId) return `/members/management/${row.memberId}`
    if (row.merchantId) return `/business/merchants/${row.merchantId}`
    if (row.agentId) return `/business/agents/${row.agentId}`
    if (mode.value === 'jackpot') return `/jackpots/${row.id.replace('JACKPOT-', '')}`
    if (mode.value === 'bet') return '/transactions/bets'
    if (mode.value === 'transaction') return '/transactions/records'
    if (mode.value === 'merchant-settlement') return '/finance/reconciliation/merchants'
    if (mode.value === 'agent-settlement') return '/finance/reconciliation/agents'
    return '/dashboard'
  }
  const openSource = (row: ReportMetricRow) => router.push(resolveSourcePath(row))
  const openRateHistory = () => router.push('/platform/exchange-rates/history')

  const exportRows = () => {
    const columns = copy.value.columns.filter((column) => column.kind !== 'status')
    const header = [
      '項目',
      '補充資訊',
      ...columns.map((column) => column.label),
      '狀態',
      '更新時間'
    ]
    const data = filteredRows.value.map((row) => [
      row.primary,
      row.secondary || '',
      ...columns.map((column) => formatCell(row, column)),
      statusLabel(row.status),
      row.updatedAt
    ])
    const csv = [header, ...data]
      .map((cells) => cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = `${mode.value}-report-${filters.dateRange.join('-')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    ElMessage.success(`已匯出 ${filteredRows.value.length} 筆報表資料`)
  }

  watch(
    mainReport,
    (report) => {
      activeMode.value = analysisByReport[report][0].value
      resetFilters()
    },
    { immediate: true }
  )
  watch(activeMode, () => resetFilters())
  watch(
    () => filters.agentId,
    () => {
      if (!merchantOptions.value.some((merchant) => merchant.id === filters.merchantId)) {
        filters.merchantId = ''
      }
    }
  )
</script>

<style scoped>
  .report-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .analysis-tabs-card :deep(.el-card__body) {
    padding-bottom: 0;
  }

  .analysis-heading {
    margin-bottom: 4px;
  }

  .analysis-heading strong,
  .analysis-heading span,
  .card-heading strong,
  .card-heading span {
    display: block;
  }

  .analysis-heading span,
  .card-heading span {
    margin-top: 4px;
    font-size: 13px;
    color: var(--art-gray-600);
  }

  .analysis-tabs-card :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  .analysis-tabs-card :deep(.el-tabs__content) {
    display: none;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid button {
    padding: 18px 20px;
    color: inherit;
    text-align: left;
    cursor: default;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .summary-grid button:disabled {
    opacity: 1;
  }

  .summary-grid button.is-clickable {
    cursor: pointer;
  }

  .summary-grid button.is-clickable:hover {
    border-color: var(--el-color-primary);
  }

  .summary-grid span,
  .summary-grid small {
    display: block;
    color: var(--art-gray-600);
  }

  .summary-grid strong {
    display: block;
    margin: 8px 0 4px;
    overflow: hidden;
    font-size: 24px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summary-grid .warning {
    color: var(--el-color-warning);
  }

  .summary-grid .danger,
  .negative-value {
    color: var(--el-color-danger);
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .filter-select {
    width: 180px;
  }

  .currency-display-grid {
    display: grid;
    grid-template-columns: auto auto minmax(340px, 1fr);
    gap: 24px;
    align-items: end;
  }

  .currency-control {
    display: grid;
    gap: 8px;
  }

  .control-label {
    font-size: 13px;
    color: var(--art-gray-600);
  }

  .currency-target-select {
    width: 190px;
  }

  .rate-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    background: var(--art-border-color);
    border: 1px solid var(--art-border-color);
    border-radius: 8px;
  }

  .rate-summary > div {
    min-width: 0;
    padding: 11px 14px;
    background: var(--art-main-bg-color);
  }

  .rate-summary span,
  .rate-summary strong {
    display: block;
  }

  .rate-summary span {
    margin-bottom: 5px;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .rate-summary strong {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
  }

  .insight-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .insight-grid.has-tree {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .card-heading {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .hierarchy-card :deep(.el-card__body) {
    max-height: 310px;
    overflow: auto;
  }

  .hierarchy-card :deep(.el-tree-node__content) {
    height: 34px;
    border-radius: 6px;
  }

  .distribution-list {
    display: grid;
    gap: 15px;
  }

  .distribution-label {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
  }

  .distribution-label span {
    overflow: hidden;
    color: var(--art-gray-700);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .distribution-label strong {
    flex: none;
    font-weight: 600;
  }

  .distribution-track {
    height: 8px;
    overflow: hidden;
    background: var(--art-gray-100);
    border-radius: 999px;
  }

  .distribution-track i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--el-color-primary-light-5), var(--el-color-primary));
    border-radius: inherit;
    transition: width 180ms ease;
  }

  .table-toolbar {
    display: flex;
    gap: 18px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .table-toolbar > div:first-child {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  .table-toolbar strong {
    font-size: 16px;
  }

  .table-toolbar span,
  .table-toolbar small {
    color: var(--art-gray-600);
  }

  .entity-link {
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .entity-link strong,
  .entity-link small {
    display: block;
  }

  .entity-link small {
    margin-top: 3px;
    color: var(--art-gray-600);
  }

  .pagination-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
  }

  .definition-list {
    margin-top: 18px;
  }

  .drawer-note {
    padding: 16px;
    margin-top: 18px;
    background: var(--art-gray-100);
    border-radius: 8px;
  }

  .drawer-note p {
    margin: 8px 0 0;
    color: var(--art-gray-600);
  }

  @media (width <= 1000px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .insight-grid.has-tree {
      grid-template-columns: 1fr;
    }

    .currency-display-grid {
      grid-template-columns: 1fr 1fr;
    }

    .rate-summary {
      grid-column: 1 / -1;
    }
  }

  @media (width <= 680px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .summary-grid button {
      padding: 14px;
    }

    .summary-grid strong {
      font-size: 20px;
    }

    .table-toolbar,
    .table-toolbar > div:first-child {
      align-items: flex-start;
    }

    .table-toolbar {
      flex-direction: column;
    }

    .table-toolbar > div:first-child {
      flex-wrap: wrap;
    }

    .currency-display-grid,
    .rate-summary {
      grid-template-columns: 1fr;
    }

    .rate-summary {
      grid-column: auto;
    }

    .currency-target-select {
      width: 100%;
    }
  }
</style>
