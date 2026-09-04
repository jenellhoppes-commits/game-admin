<template>
  <div class="risk-rule-page">
    <AppPageHeader
      title="風控規則"
      eyebrow="風控中心"
      description="管理告警條件、作用範圍、風險等級、冷卻時間與白名單。"
    >
      <template #actions>
        <ElButton type="primary" @click="openCreate">新增規則</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <ElCard v-for="item in summaries" :key="item.label" shadow="never">
        <span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </ElCard>
    </div>

    <ArtSearchBar
      v-model="searchForm"
      :items="searchItems"
      :span="6"
      @search="applyFilters"
      @reset="resetFilters"
    />

    <ElCard class="table-card" shadow="never">
      <div class="table-toolbar">
        <div
          ><strong>規則清單</strong><span>共 {{ filteredRules.length }} 條規則</span></div
        >
        <ElButton @click="refreshRules">重新整理</ElButton>
      </div>
      <ElTable :data="pagedRules" border row-key="id">
        <ElTableColumn label="規則" min-width="250" fixed="left">
          <template #default="scope">
            <button class="primary-link" type="button" @click="openDetail(scope.row.id)">
              <strong>{{ scope.row.name }}</strong
              ><small>{{ scope.row.code }} · {{ scope.row.id }}</small>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn label="分類" width="130">
          <template #default="scope">{{ categoryLabel(scope.row.category) }}</template>
        </ElTableColumn>
        <ElTableColumn label="風險等級" width="105">
          <template #default="scope">
            <ElTag :type="severityType(scope.row.severity)" effect="light">
              {{ severityLabel(scope.row.severity) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="作用範圍" prop="scope" min-width="160" />
        <ElTableColumn label="觸發條件" min-width="210">
          <template #default="scope">
            <strong>{{ scope.row.metric }}</strong
            ><br />
            <small
              >{{ scope.row.operator }} {{ scope.row.threshold }}／{{ scope.row.window }}</small
            >
          </template>
        </ElTableColumn>
        <ElTableColumn label="冷卻時間" prop="cooldown" width="110" />
        <ElTableColumn label="今日觸發" prop="todayTriggers" width="95" align="right" />
        <ElTableColumn label="狀態" width="105">
          <template #default="scope">
            <ElTag :type="ruleStatusType(scope.row.status)" effect="light">
              {{ ruleStatusLabel(scope.row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="更新時間" prop="updatedAt" width="155" />
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="scope">
            <ElButton link type="primary" @click="openDetail(scope.row.id)">查看</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="pagination-wrap">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="filteredRules.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </ElCard>

    <ElDrawer
      v-model="detailVisible"
      :title="currentRule ? `${currentRule.id}｜${currentRule.name}` : '規則詳細'"
      :size="drawerSize"
      destroy-on-close
      @closed="closeDetail"
    >
      <template v-if="currentRule">
        <div class="drawer-status">
          <ElTag :type="severityType(currentRule.severity)" effect="light">
            {{ severityLabel(currentRule.severity) }}風險
          </ElTag>
          <ElTag :type="ruleStatusType(currentRule.status)" effect="light">
            {{ ruleStatusLabel(currentRule.status) }}
          </ElTag>
        </div>
        <section class="detail-section">
          <h3>基本資料</h3>
          <ElDescriptions :column="drawerColumns" border>
            <ElDescriptionsItem label="規則代碼">{{ currentRule.code }}</ElDescriptionsItem>
            <ElDescriptionsItem label="告警分類">{{
              categoryLabel(currentRule.category)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="作用範圍">{{ currentRule.scope }}</ElDescriptionsItem>
            <ElDescriptionsItem label="建立人">{{ currentRule.createdBy }}</ElDescriptionsItem>
            <ElDescriptionsItem label="規則說明" :span="drawerColumns">
              {{ currentRule.description }}
            </ElDescriptionsItem>
          </ElDescriptions>
        </section>
        <section class="detail-section condition-card">
          <h3>觸發條件</h3>
          <div
            ><span>監控指標</span><strong>{{ currentRule.metric }}</strong></div
          >
          <div
            ><span>觸發門檻</span
            ><strong>{{ currentRule.operator }} {{ currentRule.threshold }}</strong></div
          >
          <div
            ><span>觀察時間</span><strong>{{ currentRule.window }}</strong></div
          >
          <div
            ><span>冷卻時間</span><strong>{{ currentRule.cooldown }}</strong></div
          >
        </section>
        <section class="detail-section">
          <h3>作用對象</h3>
          <ElSpace wrap>
            <ElTag v-for="target in currentRule.scopeTargets" :key="target">{{ target }}</ElTag>
          </ElSpace>
          <h3 class="subheading">白名單</h3>
          <ElSpace v-if="currentRule.whitelist.length" wrap>
            <ElTag v-for="item in currentRule.whitelist" :key="item" type="info">{{ item }}</ElTag>
          </ElSpace>
          <ElEmpty v-else description="未設定白名單" :image-size="60" />
        </section>
      </template>
      <template #footer>
        <div v-if="currentRule" class="drawer-actions">
          <ElButton @click="duplicateCurrent">複製規則</ElButton>
          <ElButton @click="editCurrent">編輯</ElButton>
          <ElButton
            v-if="currentRule.status === 'Active'"
            type="warning"
            @click="changeCurrentStatus('Disabled')"
            >停用</ElButton
          >
          <ElButton
            v-else-if="currentRule.status === 'Disabled' || currentRule.status === 'Draft'"
            type="primary"
            @click="changeCurrentStatus('Pending')"
            >送出審核</ElButton
          >
        </div>
      </template>
    </ElDrawer>

    <ElDialog
      v-model="formVisible"
      :title="editingRuleId ? '編輯風控規則' : '新增風控規則'"
      width="min(94vw, 760px)"
      destroy-on-close
    >
      <ElAlert
        title="第一版規則只建立告警，不會自動封鎖會員、交易或遊戲。"
        type="warning"
        :closable="false"
        show-icon
      />
      <ElForm label-position="top" class="rule-form">
        <ElFormItem label="規則名稱" required><ElInput v-model="form.name" /></ElFormItem>
        <ElFormItem label="規則代碼" required><ElInput v-model="form.code" /></ElFormItem>
        <ElFormItem label="告警分類" required>
          <ElSelect v-model="form.category"
            ><ElOption
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
          /></ElSelect>
        </ElFormItem>
        <ElFormItem label="風險等級" required>
          <ElSelect v-model="form.severity"
            ><ElOption
              v-for="item in severityOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
          /></ElSelect>
        </ElFormItem>
        <ElFormItem label="作用範圍" required><ElInput v-model="form.scope" /></ElFormItem>
        <ElFormItem label="監控指標" required><ElInput v-model="form.metric" /></ElFormItem>
        <ElFormItem label="比較方式" required>
          <ElSelect v-model="form.operator"
            ><ElOption v-for="item in operatorOptions" :key="item" :label="item" :value="item"
          /></ElSelect>
        </ElFormItem>
        <ElFormItem label="觸發門檻" required><ElInput v-model="form.threshold" /></ElFormItem>
        <ElFormItem label="觀察時間" required><ElInput v-model="form.window" /></ElFormItem>
        <ElFormItem label="冷卻時間" required><ElInput v-model="form.cooldown" /></ElFormItem>
        <ElFormItem label="作用對象（逗號分隔）" class="span-2"
          ><ElInput v-model="form.scopeTargetsText"
        /></ElFormItem>
        <ElFormItem label="白名單（逗號分隔）" class="span-2"
          ><ElInput v-model="form.whitelistText"
        /></ElFormItem>
        <ElFormItem label="規則說明" class="span-2" required
          ><ElInput v-model="form.description" type="textarea" :rows="3"
        /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="formVisible = false">取消</ElButton>
        <ElButton @click="saveForm('Draft')">儲存草稿</ElButton>
        <ElButton type="primary" @click="saveForm('Pending')">儲存並送審</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { RiskAlertCategory, RiskRuleSummary, RiskSeverity } from '@/types/game-provider'
  import { useRiskCenterStore } from '@/store/modules/riskCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'RiskRules' })

  type RuleStatus = RiskRuleSummary['status']
  type RuleOperator = RiskRuleSummary['operator']
  interface RuleFormState {
    name: string
    code: string
    category: RiskAlertCategory
    severity: RiskSeverity
    scope: string
    metric: string
    operator: RuleOperator
    threshold: string
    window: string
    cooldown: string
    description: string
    scopeTargetsText: string
    whitelistText: string
  }

  const route = useRoute()
  const router = useRouter()
  const store = useRiskCenterStore()
  const { width } = useWindowSize()
  const drawerSize = computed(() => (width.value < 760 ? '100%' : 'min(780px, 92vw)'))
  const drawerColumns = computed(() => (width.value < 680 ? 1 : 2))
  const detailVisible = ref(Boolean(route.query.ruleId))
  const formVisible = ref(false)
  const selectedRuleId = ref(String(route.query.ruleId || ''))
  const editingRuleId = ref('')
  const pagination = reactive({ current: 1, size: 10 })
  const searchForm = ref<Record<string, unknown>>({})
  const appliedFilters = ref<Record<string, unknown>>({})

  const emptyForm = (): RuleFormState => ({
    name: '',
    code: '',
    category: 'Member',
    severity: 'Medium',
    scope: '全平台',
    metric: '',
    operator: '>=',
    threshold: '',
    window: '10 分鐘',
    cooldown: '30 分鐘',
    description: '',
    scopeTargetsText: '全部正式環境',
    whitelistText: ''
  })
  const form = reactive<RuleFormState>(emptyForm())
  const categoryOptions: Array<{ label: string; value: RiskAlertCategory }> = [
    { label: '會員異常', value: 'Member' },
    { label: '注單異常', value: 'Bet' },
    { label: '交易異常', value: 'Transaction' },
    { label: '商戶線路異常', value: 'Merchant Line' },
    { label: '遊戲異常', value: 'Game' },
    { label: '獎池異常', value: 'Jackpot' }
  ]
  const severityOptions: Array<{ label: string; value: RiskSeverity }> = [
    { label: '嚴重', value: 'Critical' },
    { label: '高', value: 'High' },
    { label: '中', value: 'Medium' },
    { label: '低', value: 'Low' }
  ]
  const operatorOptions: RuleOperator[] = ['>', '>=', '<', '<=', '=', '!=']
  const statusOptions: Array<{ label: string; value: RuleStatus }> = [
    { label: '啟用', value: 'Active' },
    { label: '草稿', value: 'Draft' },
    { label: '待審核', value: 'Pending' },
    { label: '已停用', value: 'Disabled' }
  ]
  const searchItems = computed(() => [
    {
      label: '關鍵字',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '規則名稱、代碼、指標', clearable: true }
    },
    {
      label: '分類',
      key: 'category',
      type: 'select',
      props: { placeholder: '全部分類', clearable: true, options: categoryOptions }
    },
    {
      label: '風險等級',
      key: 'severity',
      type: 'select',
      props: { placeholder: '全部等級', clearable: true, options: severityOptions }
    },
    {
      label: '狀態',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部狀態', clearable: true, options: statusOptions }
    }
  ])
  const summaries = computed(() => [
    { label: '規則總數', value: store.rules.length, note: '包含草稿與停用' },
    {
      label: '啟用中',
      value: store.rules.filter((item) => item.status === 'Active').length,
      note: '持續監控中'
    },
    {
      label: '待審核',
      value: store.rules.filter((item) => item.status === 'Pending').length,
      note: '等待審核中心處理'
    },
    {
      label: '今日觸發',
      value: store.rules.reduce((sum, item) => sum + item.todayTriggers, 0),
      note: '已建立告警'
    }
  ])
  const filteredRules = computed(() => {
    const keyword = String(appliedFilters.value.keyword || '')
      .trim()
      .toLowerCase()
    return store.rules.filter((item) => {
      const text = `${item.id} ${item.code} ${item.name} ${item.metric}`.toLowerCase()
      return (
        (!keyword || text.includes(keyword)) &&
        (!appliedFilters.value.category || item.category === appliedFilters.value.category) &&
        (!appliedFilters.value.severity || item.severity === appliedFilters.value.severity) &&
        (!appliedFilters.value.status || item.status === appliedFilters.value.status)
      )
    })
  })
  const pagedRules = computed(() =>
    filteredRules.value.slice(
      (pagination.current - 1) * pagination.size,
      pagination.current * pagination.size
    )
  )
  const currentRule = computed(() => store.findRule(selectedRuleId.value))
  const categoryLabel = (value: RiskAlertCategory) =>
    categoryOptions.find((item) => item.value === value)?.label || value
  const severityLabel = (value: RiskSeverity) =>
    severityOptions.find((item) => item.value === value)?.label || value
  const severityType = (value: RiskSeverity) =>
    value === 'Critical' || value === 'High' ? 'danger' : value === 'Medium' ? 'warning' : 'info'
  const ruleStatusLabel = (value: RuleStatus) =>
    ({
      Active: '啟用',
      Draft: '草稿',
      Pending: '待審核',
      Scheduled: '已排程',
      Disabled: '已停用',
      Expired: '已到期'
    })[value]
  const ruleStatusType = (value: RuleStatus) =>
    value === 'Active' ? 'success' : value === 'Pending' ? 'warning' : 'info'
  const applyFilters = (params: Record<string, unknown>) => {
    appliedFilters.value = { ...params }
    pagination.current = 1
  }
  const resetFilters = () => {
    searchForm.value = {}
    appliedFilters.value = {}
    pagination.current = 1
  }
  const refreshRules = () => ElMessage.success('風控規則已重新整理')
  const openDetail = (id: string) => {
    selectedRuleId.value = id
    detailVisible.value = true
    router.replace({ query: { ...route.query, ruleId: id } })
  }
  const closeDetail = () => {
    selectedRuleId.value = ''
    router.replace({ query: { ...route.query, ruleId: undefined } })
  }
  const openCreate = () => {
    editingRuleId.value = ''
    Object.assign(form, emptyForm())
    formVisible.value = true
  }
  const editCurrent = () => {
    if (!currentRule.value) return
    const rule = currentRule.value
    editingRuleId.value = rule.id
    Object.assign(form, {
      ...rule,
      scopeTargetsText: rule.scopeTargets.join('、'),
      whitelistText: rule.whitelist.join('、')
    })
    formVisible.value = true
  }
  const listFromText = (value: string) =>
    value
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  const saveForm = (status: 'Draft' | 'Pending') => {
    if (
      ![form.name, form.code, form.metric, form.threshold, form.description].every((item) =>
        item.trim()
      )
    )
      return ElMessage.warning('請完成所有必填欄位')
    const id = store.saveRule(
      {
        name: form.name.trim(),
        code: form.code.trim(),
        category: form.category,
        severity: form.severity,
        scope: form.scope.trim(),
        metric: form.metric.trim(),
        operator: form.operator,
        threshold: form.threshold.trim(),
        window: form.window.trim(),
        cooldown: form.cooldown.trim(),
        status,
        description: form.description.trim(),
        scopeTargets: listFromText(form.scopeTargetsText),
        whitelist: listFromText(form.whitelistText)
      },
      editingRuleId.value || undefined
    )
    formVisible.value = false
    ElMessage.success(status === 'Draft' ? `規則 ${id} 已儲存為草稿` : `規則 ${id} 已送出審核`)
    openDetail(id)
  }
  const duplicateCurrent = () => {
    if (!currentRule.value) return
    const id = store.duplicateRule(currentRule.value.id)
    if (id) {
      ElMessage.success(`已建立規則副本 ${id}`)
      openDetail(id)
    }
  }
  const changeCurrentStatus = async (status: RuleStatus) => {
    if (!currentRule.value) return
    await ElMessageBox.confirm(
      status === 'Disabled' ? '停用後將不再產生新告警，是否繼續？' : '是否將規則送至審核中心？',
      status === 'Disabled' ? '停用規則' : '送出審核',
      { type: 'warning' }
    )
    store.changeRuleStatus(currentRule.value.id, status)
    ElMessage.success(status === 'Disabled' ? '規則已停用' : '規則已送出審核')
  }
  watch(
    () => route.query.ruleId,
    (id) => {
      if (id) {
        selectedRuleId.value = String(id)
        detailVisible.value = true
      }
    }
  )
</script>

<style scoped lang="scss">
  .risk-rule-page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .summary-grid :deep(.el-card__body) {
    display: grid;
    gap: 5px;
  }

  .summary-grid span,
  .summary-grid small,
  .table-toolbar span,
  small,
  .condition-card span {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 26px;
    color: var(--art-gray-900);
  }

  .table-card :deep(.el-card__body) {
    padding: 0;
  }

  .table-toolbar,
  .drawer-status,
  .drawer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .table-toolbar {
    padding: 16px 18px;
  }

  .table-toolbar > div {
    display: grid;
    gap: 4px;
  }

  .primary-link {
    display: grid;
    gap: 3px;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .primary-link:hover strong {
    color: var(--el-color-primary);
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 16px 18px;
  }

  .drawer-status {
    justify-content: flex-start;
    margin-bottom: 16px;
  }

  .detail-section {
    padding: 18px;
    margin-bottom: 16px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .detail-section h3 {
    margin: 0 0 14px;
  }

  .detail-section .subheading {
    margin-top: 22px;
  }

  .condition-card {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .condition-card h3 {
    grid-column: 1 / -1;
  }

  .condition-card div {
    display: grid;
    gap: 5px;
    padding: 12px;
    background: var(--art-gray-100);
    border-radius: 8px;
  }

  .rule-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;
    margin-top: 18px;
  }

  .rule-form .span-2 {
    grid-column: 1 / -1;
  }

  .rule-form :deep(.el-select) {
    width: 100%;
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .summary-grid,
    .condition-card,
    .rule-form {
      grid-template-columns: 1fr;
    }

    .condition-card h3,
    .rule-form .span-2 {
      grid-column: auto;
    }
  }
</style>
