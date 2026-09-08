<template>
  <ElTabs v-model="tab">
    <ElTabPane label="基本資料" name="basic"><slot name="basic" /></ElTabPane>
    <ElTabPane :label="own ? '我的條件（唯讀）' : '商務條件'" name="terms">
      <div class="term-actions"
        ><ElButton v-if="editable" type="primary" @click="openEditor">修改條件</ElButton></div
      >
      <ElDescriptions v-if="current" :column="1" border>
        <ElDescriptionsItem label="版本">V{{ current.version }}</ElDescriptionsItem>
        <ElDescriptionsItem label="計算基礎">{{
          termBasisLabels[current.settlementBasis]
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="比例">{{ percent(current) }}%</ElDescriptionsItem>
        <ElDescriptionsItem label="結算幣別">{{ current.settlementCurrency }}</ElDescriptionsItem>
        <ElDescriptionsItem label="對帳週期">{{
          termCycleLabels[current.settlementCycle]
        }}</ElDescriptionsItem>
        <ElDescriptionsItem label="生效日"
          >{{ current.effectiveFrom }}（Asia/Taipei）</ElDescriptionsItem
        >
      </ElDescriptions>
      <ElEmpty v-else description="目前沒有生效中的條件" />
      <h3 v-if="scheduled.length">待生效版本</h3>
      <ArtTable v-if="scheduled.length" :data="scheduled" height="auto" :show-table-header="false">
        <ElTableColumn label="版本" width="80"
          ><template #default="{ row }">V{{ row.version }}</template></ElTableColumn
        >
        <ElTableColumn prop="effectiveFrom" label="生效日" min-width="130" />
        <ElTableColumn label="條件" min-width="220"
          ><template #default="{ row }">{{ describe(row) }}</template></ElTableColumn
        >
      </ArtTable>
    </ElTabPane>
    <ElTabPane label="條件歷史" name="history">
      <ArtTable :data="terms" height="auto" :show-table-header="false" empty-text="尚無條件版本">
        <ElTableColumn label="版本" width="80"
          ><template #default="{ row }">V{{ row.version }}</template></ElTableColumn
        >
        <ElTableColumn label="條件" min-width="230"
          ><template #default="{ row }">{{ describe(row) }}</template></ElTableColumn
        >
        <ElTableColumn label="生效期間" min-width="220"
          ><template #default="{ row }"
            >{{ row.effectiveFrom || '未設定' }} ～ {{ row.effectiveTo || '—' }}</template
          ></ElTableColumn
        >
        <ElTableColumn label="狀態" width="100"
          ><template #default="{ row }">{{ termStatusLabels[row.status] }}</template></ElTableColumn
        >
        <ElTableColumn prop="reason" label="原因" min-width="180" />
      </ArtTable>
    </ElTabPane>
    <ElTabPane label="操作紀錄" name="logs">
      <ArtTable
        :data="operations"
        height="auto"
        :show-table-header="false"
        empty-text="尚無操作紀錄"
      >
        <ElTableColumn type="expand"
          ><template #default="{ row }"
            ><div class="operation-detail"
              ><p>修改前：{{ describeJson(row.before) }}</p
              ><p>修改後：{{ describeJson(row.after) }}</p
              ><p>原因：{{ row.reason || '—' }}</p></div
            ></template
          ></ElTableColumn
        >
        <ElTableColumn prop="time" label="操作時間" min-width="160" />
        <ElTableColumn prop="actor" label="操作人" min-width="120" />
        <ElTableColumn prop="action" label="操作內容" min-width="170" />
        <ElTableColumn prop="result" label="結果" min-width="110" />
      </ArtTable>
    </ElTabPane>
  </ElTabs>
  <ElDialog
    class="partner-terms-dialog"
    v-model="visible"
    title="修改商務條件"
    width="min(92vw, 680px)"
    append-to-body
  >
    <ElForm label-position="top">
      <TermFields v-model="form" :currencies="store.settlementCurrencies" />
      <ElFormItem label="變更原因" required
        ><ElInput v-model="reason" type="textarea" :rows="2" maxlength="300" show-word-limit
      /></ElFormItem>
    </ElForm>
    <template #footer
      ><ElButton @click="visible = false">取消</ElButton
      ><ElButton type="primary" @click="save">保存新版本</ElButton></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { CURRENT_AGENT_ID, useAgentPortalStore } from '@/store/modules/agentPortal'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import type { AgentCommercialTerm, MerchantCommercialTerm } from '@/types/game-provider'
  import {
    termBasisLabels,
    termCycleLabels,
    termStatusLabels,
    type PartnerTermInput
  } from '@/utils/partnerTerms'
  import TermFields from './TermFields.vue'
  const props = defineProps<{ kind: 'agent' | 'merchant'; targetId: string }>()
  const store = useAgentPortalStore(),
    business = useBusinessPartnerStore()
  const tab = ref('basic'),
    visible = ref(false),
    reason = ref('')
  const form = ref<PartnerTermInput>({
    basis: 'GGR',
    percent: 0,
    settlementCurrency: '',
    settlementCycle: '',
    effectiveFrom: ''
  })
  const own = computed(() => props.kind === 'agent' && props.targetId === CURRENT_AGENT_ID)
  const allowed = computed(() =>
    props.kind === 'agent'
      ? store.visibleAgentIds.has(props.targetId)
      : store.allMerchants.some((t) => t.id === props.targetId)
  )
  const editable = computed(
    () =>
      store.hasPermission('terms:apply') &&
      (props.kind === 'agent' ? store.directChildren : store.directMerchants).some(
        (t) => t.id === props.targetId
      )
  )
  const terms = computed(() =>
    !allowed.value
      ? []
      : props.kind === 'agent'
        ? business.getTerms(props.targetId)
        : business.getMerchantTerms(props.targetId)
  )
  const current = computed(() => terms.value.find((t) => t.status === 'Active'))
  const scheduled = computed(() => terms.value.filter((t) => t.status === 'Scheduled'))
  const operations = computed(() => {
    if (!allowed.value) return []
    const logs = store.logs.filter((t) => t.targetId === props.targetId)
    const audits = (
      props.kind === 'agent'
        ? business.getAuditLogs(props.targetId)
        : business.getMerchantAuditLogs(props.targetId)
    )
      .filter((t) => t.operator === '系統' || !logs.some((log) => log.after === t.after))
      .map((t) => ({ ...t, actor: t.operator, result: t.result === 'Success' ? '成功' : t.result }))
    return [...logs, ...audits].sort((a, b) => b.time.localeCompare(a.time))
  })
  type Term = AgentCommercialTerm | MerchantCommercialTerm
  function percent(term: Term) {
    return 'ratePercent' in term ? term.ratePercent : term.merchantTermPercent
  }
  function describe(term: Term) {
    return `${termBasisLabels[term.settlementBasis]} ${percent(term)}% · ${term.settlementCurrency} · ${termCycleLabels[term.settlementCycle]}`
  }
  function describeJson(value?: string) {
    if (!value) return '—'
    try {
      const term = JSON.parse(value)
      return term.settlementBasis
        ? `V${term.version} · ${describe(term)} · 生效日 ${term.effectiveFrom}`
        : value
    } catch {
      return value
    }
  }
  function openEditor() {
    const term = current.value || terms.value[0]
    form.value = {
      basis: 'GGR',
      percent: term ? percent(term) : 0,
      settlementCurrency: term?.settlementCurrency || '',
      settlementCycle: term?.settlementCycle || '',
      effectiveFrom: ''
    }
    reason.value = ''
    visible.value = true
  }
  function save() {
    const input = { ...form.value, targetId: props.targetId, reason: reason.value }
    const result =
      props.kind === 'agent'
        ? store.saveDirectChildTerm(input)
        : store.saveDirectMerchantTerm(input)
    if (!result.ok) return ElMessage.warning(result.message)
    visible.value = false
    ElMessage.success(result.message)
  }
  watch(
    () => props.targetId,
    () => {
      tab.value = 'basic'
      visible.value = false
    }
  )
  onMounted(() => business.syncPartnerTerms())
</script>
<style scoped lang="scss">
  .term-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }

  .operation-detail {
    padding: 16px;
    overflow-wrap: anywhere;
  }

  h3 {
    margin: 20px 0 12px;
  }
</style>
