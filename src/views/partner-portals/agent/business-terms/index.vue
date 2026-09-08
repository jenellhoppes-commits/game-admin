<template>
  <div class="agent-page">
    <AppPageHeader
      eyebrow="代理後台／合作管理"
      title="商務條件"
      description="條件以版本管理；只有可比基礎與一致期間才顯示百分點價差。"
    >
      <template #actions>
        <ElButton
          v-if="activeTab === 'children' || activeTab === 'merchants'"
          type="primary"
          :disabled="!store.hasPermission('terms:apply')"
          @click="openRequest"
          >{{ activeTab === 'children' ? '修改直屬下級條件' : '申請變更商戶條件' }}</ElButton
        >
      </template>
    </AppPageHeader>

    <ElAlert
      type="warning"
      :closable="false"
      title="價差不等於收益"
      description="收益算法尚未定案；下級條件可直接保存新版本，生效規則待確認，不修改歷史結算。"
    />

    <ElCard shadow="never" class="terms-card">
      <ElTabs v-model="activeTab" @tab-change="page = 1">
        <ElTabPane label="我的條件（唯讀）" name="mine" />
        <ElTabPane label="直屬下級條件" name="children" />
        <ElTabPane label="直屬商戶條件" name="merchants" />
        <ElTabPane label="申請紀錄" name="requests" />
      </ElTabs>

      <ArtSearchBar
        label-position="top"
        v-if="activeTab !== 'requests'"
        :model-value="{ keyword: draftKeyword, status: draftStatus }"
        @update:model-value="updateSearch"
        :items="searchItems"
        :show-expand="false"
        :is-expand="true"
        @search="applyFilters"
        @reset="resetFilters"
      />

      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        v-if="activeTab !== 'requests'"
        :data="pagedRows"
        :pagination="{ current: page, size: pageSize, total: filteredRows.length }"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        @pagination:current-change="page = $event"
        @pagination:size-change="pageSize = $event"
        row-key="id"
      >
        <ElTableColumn prop="target" label="對象" min-width="145" />
        <ElTableColumn prop="kind" label="類型" min-width="115" />
        <ElTableColumn label="版本" width="90">
          <template #default="scope">V{{ scope.row.version }}</template>
        </ElTableColumn>
        <ElTableColumn prop="basis" label="計算基礎" min-width="110" />
        <ElTableColumn label="比例" width="90" align="right">
          <template #default="scope">{{ scope.row.percent }}%</template>
        </ElTableColumn>
        <ElTableColumn label="生效期間" min-width="190">
          <template #default="scope">{{ scope.row.from }} ～ {{ scope.row.to || '—' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="cycle" label="週期" width="90" />
        <ElTableColumn prop="currency" label="結算幣" width="95" />
        <ElTableColumn prop="spread" label="可比價差" min-width="125" />
        <ElTableColumn prop="statusLabel" label="狀態" width="100" />
      </ArtTable>

      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        v-else
        :data="termRequests"
        row-key="id"
      >
        <ElTableColumn prop="id" label="申請編號" min-width="175" />
        <ElTableColumn prop="targetName" label="對象" min-width="150" />
        <ElTableColumn prop="action" label="申請內容" min-width="150" />
        <ElTableColumn prop="reason" label="原因" min-width="220" />
        <ElTableColumn prop="createdAt" label="建立時間" min-width="155" />
        <ElTableColumn label="狀態" width="110">
          <template #default="scope">
            <ElTag type="warning" effect="plain">{{
              scope.row.status === 'Pending' ? '待審核' : scope.row.status
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="已生效" width="90">
          <template #default="scope">{{ scope.row.effective ? '是' : '否' }}</template>
        </ElTableColumn>
      </ArtTable>
    </ElCard>

    <ElDialog
      v-model="requestVisible"
      :title="editingChild ? '修改直屬下級條件' : '商戶條件變更申請'"
      width="min(92vw, 600px)"
    >
      <ElForm label-position="top">
        <ElFormItem label="變更對象">
          <ElSelect v-model="request.targetId" class="full-width">
            <template v-if="editingChild"
              ><ElOption
                v-for="agent in store.directChildren"
                :key="agent.id"
                :value="agent.id"
                :label="agent.code + '／' + agent.name"
            /></template>
            <ElOption
              v-for="merchant in editingChild ? [] : store.directMerchants"
              :key="merchant.id"
              :label="`${merchant.code}／${merchant.name}（直屬商戶）`"
              :value="merchant.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="計算基礎">
          <ElSelect v-model="request.basis" class="full-width">
            <ElOption label="遊戲輸贏（GGR）" value="GGR" />
            <ElOption label="有效投注" value="Valid Bet" />
            <ElOption label="投注總額" value="Turnover" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="比例（%）">
          <ElInputNumber v-model="request.percent" :min="0" :max="100" :precision="2" />
        </ElFormItem>
        <ElFormItem v-if="!editingChild" label="預計生效日">
          <ElDatePicker
            v-model="request.effectiveFrom"
            type="date"
            value-format="YYYY-MM-DD"
            class="full-width"
          />
        </ElFormItem>
        <ElFormItem label="變更原因">
          <ElInput
            v-model="request.reason"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
          />
        </ElFormItem>
      </ElForm>
      <ElAlert
        type="info"
        :closable="false"
        :title="editingChild ? '直接保存版本，不需送審' : '建立商戶條件提案'"
        :description="
          editingChild
            ? '生效時間與未結算資料處理尚未定案；新版本標記待設定生效，歷史版本及帳單維持原值。'
            : '已鎖定的歷史條件不可回改；商戶條件維持申請流程。'
        "
      />
      <template #footer>
        <ElButton @click="requestVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitRequest">{{
          editingChild ? '保存新版本' : '送出申請'
        }}</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import {
    CURRENT_AGENT_ID,
    getComparableSpread,
    useAgentPortalStore
  } from '@/store/modules/agentPortal'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'

  defineOptions({ name: 'AgentPortalBusinessTerms' })

  const store = useAgentPortalStore()

  const searchItems = [
    { key: 'keyword', label: '對象或版本', type: 'input', props: { clearable: true } },
    {
      key: 'status',
      label: '狀態',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '待設定生效', value: 'Draft' },
          { label: '生效中', value: 'Active' },
          { label: '排程中', value: 'Scheduled' },
          { label: '已到期', value: 'Expired' }
        ]
      }
    }
  ]
  const businessStore = useBusinessPartnerStore()
  const activeTab = ref<'mine' | 'children' | 'merchants' | 'requests'>('mine')
  const page = ref(1)
  const pageSize = ref(20)
  const draftKeyword = ref('')
  const draftStatus = ref('')
  const keyword = ref('')
  const status = ref('')
  const requestVisible = ref(false)
  const editingChild = ref(false)
  const request = reactive({
    targetId: CURRENT_AGENT_ID,
    basis: 'GGR',
    percent: 8,
    effectiveFrom: '2026-10-01',
    reason: ''
  })

  const myTerms = computed(() =>
    businessStore.getTerms(CURRENT_AGENT_ID).map((term) => ({
      id: term.id,
      target: store.currentAgent?.name || CURRENT_AGENT_ID,
      kind: '我的條件',
      version: term.version,
      basis: basisLabel(term.settlementBasis),
      basisValue: term.settlementBasis,
      percent: term.ratePercent,
      from: term.effectiveFrom,
      to: term.effectiveTo,
      cycle: cycleLabel(term.settlementCycle),
      currency: term.settlementCurrency,
      spread: '基準',
      status: term.status,
      statusLabel: termStatus(term.status)
    }))
  )
  const merchantTerms = computed(() => {
    const mine = businessStore.getCurrentTerm(CURRENT_AGENT_ID)
    return store.directMerchants.flatMap((merchant) =>
      businessStore.getMerchantTerms(merchant.id).map((term) => ({
        id: term.id,
        target: merchant.name,
        kind: '直屬商戶',
        version: term.version,
        basis: basisLabel(term.settlementBasis),
        basisValue: term.settlementBasis,
        percent: term.merchantTermPercent,
        from: term.effectiveFrom,
        to: term.effectiveTo,
        cycle: cycleLabel(term.settlementCycle),
        currency: term.settlementCurrency,
        spread: mine
          ? getComparableSpread(mine, {
              settlementBasis: term.settlementBasis,
              effectiveFrom: term.effectiveFrom,
              effectiveTo: term.effectiveTo,
              ratePercent: term.merchantTermPercent
            })
          : '不適用',
        status: term.status,
        statusLabel: termStatus(term.status)
      }))
    )
  })
  const childTerms = computed(() =>
    store.directChildren.flatMap((agent) =>
      businessStore.getTerms(agent.id).map((term) => ({
        id: term.id,
        target: agent.name,
        kind: '直屬下級',
        version: term.version,
        basis: basisLabel(term.settlementBasis),
        basisValue: term.settlementBasis,
        percent: term.ratePercent,
        from: term.effectiveFrom || '待設定生效',
        to: term.effectiveTo,
        cycle: cycleLabel(term.settlementCycle),
        currency: term.settlementCurrency,
        spread: '不適用',
        status: term.status,
        statusLabel: term.status === 'Draft' ? '待設定生效' : termStatus(term.status)
      }))
    )
  )
  const sourceRows = computed(() =>
    activeTab.value === 'mine'
      ? myTerms.value
      : activeTab.value === 'children'
        ? childTerms.value
        : merchantTerms.value
  )
  const filteredRows = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    return sourceRows.value.filter(
      (row) =>
        (!query || `${row.target}V${row.version}`.toLowerCase().includes(query)) &&
        (!status.value || row.status === status.value)
    )
  })
  const pagedRows = computed(() =>
    filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )
  const termRequests = computed(() => store.requests.filter((item) => item.category === '條件'))

  watch(pageSize, () => (page.value = 1))

  function applyFilters() {
    keyword.value = draftKeyword.value
    status.value = draftStatus.value
    page.value = 1
  }

  function resetFilters() {
    draftKeyword.value = ''
    draftStatus.value = ''
    applyFilters()
  }

  function openRequest() {
    editingChild.value = activeTab.value === 'children'
    Object.assign(request, {
      targetId: editingChild.value
        ? store.directChildren[0]?.id || ''
        : store.directMerchants[0]?.id || '',
      basis: businessStore.getCurrentTerm(CURRENT_AGENT_ID)?.settlementBasis || 'GGR',
      percent: businessStore.getCurrentTerm(CURRENT_AGENT_ID)?.ratePercent || 0,
      effectiveFrom: '2026-10-01',
      reason: ''
    })
    requestVisible.value = true
  }

  watch(
    () => request.targetId,
    (id) => {
      if (!editingChild.value) return
      const term = businessStore.getCurrentTerm(id)
      request.basis = term?.settlementBasis || 'GGR'
      request.percent = term?.ratePercent ?? 0
    }
  )

  function submitRequest() {
    const result = editingChild.value
      ? store.saveDirectChildTerm(request)
      : store.submitTermRequest(request)
    if (!result.ok) return ElMessage.warning(result.message)
    requestVisible.value = false
    activeTab.value = editingChild.value ? 'children' : 'requests'
    ElMessage.success(result.message)
  }

  function basisLabel(value: string) {
    return (
      (
        { GGR: '遊戲輸贏', 'Valid Bet': '有效投注', Turnover: '投注總額' } as Record<string, string>
      )[value] || value
    )
  }

  function cycleLabel(value: string) {
    return (
      (
        { Daily: '日結', Weekly: '週結', Semimonthly: '半月結', Monthly: '月結' } as Record<
          string,
          string
        >
      )[value] || value
    )
  }

  function termStatus(value: string) {
    return (
      (
        {
          Active: '生效中',
          Scheduled: '排程中',
          Expired: '已到期',
          Draft: '草稿',
          Disabled: '已停用'
        } as Record<string, string>
      )[value] || value
    )
  }
  function updateSearch(value: Record<string, string>) {
    draftKeyword.value = value.keyword
    draftStatus.value = value.status
  }
</script>

<style scoped lang="scss">
  @use '../shared';

  .terms-card {
    margin-top: 16px;
  }

  .full-width {
    width: 100%;
  }
</style>
