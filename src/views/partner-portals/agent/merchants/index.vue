<template>
  <div class="agent-page">
    <AppPageHeader
      eyebrow="代理後台／合作管理"
      title="商戶管理"
      description="直屬與間接集合互斥；只顯示授權樹內商戶及原幣彙總。"
    >
      <template #actions>
        <ElButton
          v-if="draft.relation === 'direct'"
          type="primary"
          :disabled="!store.hasPermission('merchants:apply')"
          @click="openApplication"
          >新增直屬商戶</ElButton
        >
      </template>
    </AppPageHeader>

    <ArtSearchBar
      label-position="top"
      :model-value="draft"
      @update:model-value="Object.assign(draft, $event)"
      :items="searchItems"
      :show-expand="false"
      :is-expand="true"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard shadow="never">
      <template #header>
        <div class="agent-card-title">
          <div><strong>授權商戶</strong><small>不能替下級代理新增合作</small></div>
        </div>
      </template>
      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        :data="pagedRows"
        :pagination="{ current: page, size: pageSize, total: filteredRows.length }"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        @pagination:current-change="page = $event"
        @pagination:size-change="pageSize = $event"
        row-key="id"
      >
        <ElTableColumn prop="code" label="商戶代碼" min-width="120" />
        <ElTableColumn prop="name" label="名稱" min-width="145" />
        <ElTableColumn prop="agentName" label="直接代理" min-width="145" />
        <ElTableColumn label="關係" width="85">
          <template #default="scope">{{ relationLabel(scope.row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="100">
          <template #default="scope">{{ statusLabel(scope.row.status) }}</template>
        </ElTableColumn>
        <ElTableColumn label="關係生效日" min-width="125">
          <template #default="scope">{{ scope.row.cooperationStartDate || '未取得' }}</template>
        </ElTableColumn>
        <ElTableColumn label="幣別" min-width="120">
          <template #default="scope">{{ currencies(scope.row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="線路數" width="85" align="right">
          <template #default="scope">{{ scope.row.lines.length }}</template>
        </ElTableColumn>
        <ElTableColumn label="原幣摘要" min-width="180">
          <template #default="scope">{{ merchantSummary(scope.row.id) }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="scope">
            <ElButton link type="primary" @click="openDetail(scope.row.id)">查看</ElButton>
          </template>
        </ElTableColumn>
      </ArtTable>
    </ElCard>

    <ElCard v-if="merchantRequests.length" shadow="never" class="request-card">
      <template #header>
        <div class="agent-card-title">
          <div><strong>歷史商戶申請紀錄</strong><small>保留舊申請；新商戶直接建立</small></div>
        </div>
      </template>
      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        :data="merchantRequests"
        row-key="id"
      >
        <ElTableColumn prop="id" label="申請編號" min-width="170" />
        <ElTableColumn prop="targetId" label="商戶代碼" min-width="120" />
        <ElTableColumn prop="targetName" label="名稱" min-width="140" />
        <ElTableColumn prop="reason" label="原因" min-width="220" />
        <ElTableColumn prop="createdAt" label="建立時間" min-width="150" />
        <ElTableColumn label="狀態" width="110">
          <template #default="scope">
            <ElTag :type="scope.row.status === 'Pending' ? 'warning' : 'success'" effect="plain">
              {{ scope.row.status === 'Pending' ? '待審核' : '已核准' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ArtTable>
    </ElCard>

    <ElDialog
      class="partner-terms-dialog"
      v-model="applicationVisible"
      title="新增直屬商戶"
      width="min(92vw, 580px)"
    >
      <ElForm label-position="top">
        <ElFormItem label="直接代理"
          ><ElInput
            :model-value="store.currentAgent?.code + '／' + store.currentAgent?.name"
            disabled
        /></ElFormItem>
        <ElFormItem label="商戶代碼" required
          ><ElInput v-model="application.code" maxlength="24"
        /></ElFormItem>
        <ElFormItem label="商戶名稱" required
          ><ElInput v-model="application.name" maxlength="80"
        /></ElFormItem>
        <ElDivider content-position="left">商務條件</ElDivider>
        <TermFields v-model="conditions" :currencies="store.settlementCurrencies" />
        <ElFormItem label="錢包類型" required>
          <ElSelect
            v-model="application.walletMode"
            class="full-width"
            placeholder="請選擇錢包類型"
          >
            <ElOption label="單一錢包（Seamless）" value="Seamless" />
            <ElOption label="轉帳錢包（Transfer）" value="Transfer" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="投注幣別" required>
          <ElSelect v-model="application.currency" class="full-width">
            <ElOption
              v-for="item in store.transactionCurrencies"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="備註（選填）">
          <ElInput
            v-model="application.reason"
            type="textarea"
            :rows="2"
            maxlength="300"
            show-word-limit
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="applicationVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitApplication">建立商戶</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import '../components/term-dialog.scss'
  import type { PartnerTermInput } from '@/utils/partnerTerms'
  import TermFields from '../components/TermFields.vue'
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import {
    CURRENT_AGENT_ID,
    groupAgentMetrics,
    useAgentPortalStore
  } from '@/store/modules/agentPortal'
  import type { MerchantRecord, MerchantStatus } from '@/types/game-provider'

  defineOptions({ name: 'AgentPortalMerchants' })

  const store = useAgentPortalStore()

  const searchItems = computed(() => [
    {
      key: 'relation',
      label: '關係',
      type: 'select',
      props: {
        options: [
          { label: '直屬', value: 'direct' },
          { label: '間接', value: 'indirect' }
        ]
      }
    },
    { key: 'keyword', label: '代碼或名稱', type: 'input', props: { clearable: true } },
    {
      key: 'agentId',
      label: '直接代理',
      type: 'select',
      props: {
        clearable: true,
        options: store.visibleAgents.map((a) => ({ label: a.name, value: a.id }))
      }
    },
    {
      key: 'status',
      label: '狀態',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '正式合作', value: 'Active' },
          { label: '申請中', value: 'Pending' },
          { label: '已停用', value: 'Inactive' }
        ]
      }
    },
    {
      key: 'currency',
      label: '幣別',
      type: 'select',
      props: {
        clearable: true,
        options: store.visibleCurrencies.map((value) => ({ label: value, value }))
      }
    }
  ])
  const router = useRouter()
  const route = useRoute()
  const queryText = (key: string) =>
    typeof route.query[key] === 'string' ? String(route.query[key]) : ''
  const page = ref(Math.max(1, Number(queryText('page')) || 1))
  const pageSize = ref(
    [20, 50, 100].includes(Number(queryText('size'))) ? Number(queryText('size')) : 20
  )
  const draft = reactive({
    relation: queryText('relation') === 'indirect' ? 'indirect' : 'direct',
    keyword: queryText('keyword'),
    agentId: queryText('agentId'),
    status: queryText('status'),
    currency: queryText('currency')
  })
  const applied = reactive({ ...draft })
  const conditions = ref<PartnerTermInput>({
    basis: 'GGR',
    percent: 0,
    settlementCurrency: '',
    settlementCycle: '',
    effectiveFrom: ''
  })
  const applicationVisible = ref(false)
  const application = reactive({
    code: '',
    name: '',
    currency: '',
    reason: '',
    effectiveFrom: '',
    walletMode: ''
  })

  const sourceRows = computed(() =>
    applied.relation === 'direct' ? store.directMerchants : store.indirectMerchants
  )
  const filteredRows = computed(() => {
    const keyword = applied.keyword.trim().toLowerCase()
    return sourceRows.value.filter(
      (merchant) =>
        (!keyword || `${merchant.code}${merchant.name}`.toLowerCase().includes(keyword)) &&
        (!applied.agentId || merchant.agentId === applied.agentId) &&
        (!applied.status || merchant.status === applied.status) &&
        (!applied.currency ||
          merchant.requestedCurrency === applied.currency ||
          merchant.lines.some((line) => line.currency === applied.currency))
    )
  })
  const pagedRows = computed(() =>
    filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )
  const merchantRequests = computed(() =>
    store.requests.filter((request) => request.category === '商戶')
  )

  watch(() => draft.relation, applyFilters)
  watch(pageSize, () => (page.value = 1))

  function applyFilters() {
    Object.assign(applied, draft)
    page.value = 1
  }

  function resetFilters() {
    Object.assign(draft, { relation: 'direct', keyword: '', agentId: '', status: '', currency: '' })
    applyFilters()
  }

  function openApplication() {
    conditions.value = {
      basis: 'GGR',
      percent: 0,
      settlementCurrency: '',
      settlementCycle: '',
      effectiveFrom: ''
    }
    Object.assign(application, {
      code: '',
      name: '',
      walletMode: '',
      currency: store.visibleCurrencies[0] || '',
      reason: ''
    })
    applicationVisible.value = true
  }

  function openDetail(id: string) {
    router.push({
      path: `/agent/merchants/${id}`,
      query: { ...applied, page: String(page.value), size: String(pageSize.value) }
    })
  }

  function submitApplication() {
    const result = store.createDirectMerchant({ ...application, conditions: conditions.value })
    if (!result.ok) return ElMessage.warning(result.message)
    applicationVisible.value = false
    resetFilters()
    ElMessage.success(result.message)
  }

  function relationLabel(merchant: MerchantRecord) {
    return merchant.agentId === CURRENT_AGENT_ID ? '直屬' : '間接'
  }

  function currencies(merchant: MerchantRecord) {
    return (
      [...new Set(merchant.lines.map((line) => line.currency))].join('、') ||
      merchant.requestedCurrency ||
      '未取得'
    )
  }

  function merchantSummary(merchantId: string) {
    const rows = groupAgentMetrics(
      store.metricRows.filter((row) => row.merchantId === merchantId),
      '幣別'
    )
    if (!rows.length) return '沒有營運資料'
    return rows.map((row) => `${row.currency} ${number(row.betAmount)}`).join('／')
  }

  function statusLabel(status: MerchantStatus) {
    return (
      (
        { Active: '正式合作', Pending: '申請中', Inactive: '已停用', Testing: '測試中' } as Record<
          string,
          string
        >
      )[status] || status
    )
  }

  function number(value: number) {
    return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)
  }
</script>

<style scoped lang="scss">
  @use '../shared';

  .request-card {
    margin-top: 16px;
  }

  .full-width {
    width: 100%;
  }
</style>
