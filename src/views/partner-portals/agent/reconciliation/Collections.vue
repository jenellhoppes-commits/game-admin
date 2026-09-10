<template>
  <ElCard shadow="never">
    <h3>直屬對帳單</h3>
    <ElTable :data="rows">
      <ElTableColumn prop="id" label="單號" min-width="180" />
      <ElTableColumn prop="period" label="期間" />
      <ElTableColumn label="付款方"
        ><template #default="{ row }">{{ row.collection?.payerName }}</template></ElTableColumn
      >
      <ElTableColumn label="結算幣"
        ><template #default="{ row }">{{
          row.snapshot.settlementCurrency
        }}</template></ElTableColumn
      >
      <ElTableColumn label="操作"
        ><template #default="{ row }"
          ><ElButton link @click="open(row.id)">{{
            row.collection?.mode === 'PlatformCollect' ? '查看（平台代收）' : '核帳／交付'
          }}</ElButton></template
        ></ElTableColumn
      >
    </ElTable>
  </ElCard>
  <ElDialog v-model="visible" title="直屬應收核帳／交付" width="min(600px, 94vw)">
    <template v-if="selected">
      <p
        >{{ selected.collection?.payerName }} → {{ selected.collection?.payeeName }} ·
        {{ selected.snapshot.settlementCurrency }}</p
      >
      <DeliverySummary
        :delivery="selected.delivery"
        :currency="selected.snapshot.settlementCurrency"
      />
      <ElForm label-position="top" :disabled="selected.status === 'Locked' || !canCollect">
        <ElFormItem label="系統應結"><ElInput :model-value="String(base)" disabled /></ElFormItem>
        <ElFormItem label="差異調整"
          ><ElInputNumber v-model="form.adjustment" :precision="selected.snapshot.amountPrecision"
        /></ElFormItem>
        <ElFormItem label="調整後應結"
          ><ElInput :model-value="String(base + form.adjustment)" disabled
        /></ElFormItem>
        <ElFormItem label="實收金額（整數）"
          ><ElInputNumber
            :model-value="form.actual"
            @update:model-value="form.actual = Math.trunc($event ?? 0)"
            :min="0"
            :step="1"
        /></ElFormItem>
        <ElFormItem label="剩餘未收"
          ><ElInput
            :model-value="String(Math.max(0, base + form.adjustment) - form.actual)"
            disabled
        /></ElFormItem>
        <ElFormItem label="調整原因／交付備註" :required="form.adjustment !== 0"
          ><ElInput v-model="form.reason" type="textarea"
        /></ElFormItem>
      </ElForm>
    </template>
    <template #footer
      ><ElButton @click="visible = false">關閉</ElButton
      ><template v-if="selected && selected.status !== 'Locked' && canCollect"
        ><ElButton @click="submit(true)">保留至下期</ElButton
        ><ElButton type="primary" @click="submit(false)">確認交付並鎖定</ElButton></template
      ></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useFinanceCenterStore } from '@/store/modules/financeCenter'
  import { CURRENT_AGENT_ID, useAgentPortalStore } from '@/store/modules/agentPortal'
  import DeliverySummary from '@/components/business/game-provider/DeliverySummary.vue'
  const finance = useFinanceCenterStore(),
    portal = useAgentPortalStore()
  const canCollect = computed(
    () =>
      portal.hasPermission('finance:confirm') && selected.value?.collection?.mode === 'AgentCollect'
  )
  const rows = computed(() =>
    [...finance.merchantReconciliations, ...finance.agentReconciliations].filter(
      (r) => r.collection?.payeeId === CURRENT_AGENT_ID && r.status !== 'Cancelled'
    )
  )
  const visible = ref(false),
    id = ref('')
  const selected = computed(() => rows.value.find((r) => r.id === id.value))
  const base = computed(
    () =>
      (selected.value?.finalSettlementAmount || 0) +
      (selected.value?.priorCorrections || []).reduce((sum, r) => sum + r.amount, 0)
  )
  const form = reactive({ actual: 0, adjustment: 0, reason: '' })
  function open(value: string) {
    id.value = value
    Object.assign(form, { actual: 0, adjustment: 0, reason: '' })
    visible.value = true
  }
  function submit(retain: boolean) {
    if (!canCollect.value || !selected.value) return
    try {
      finance.deliverReconciliation(
        id.value,
        form.adjustment,
        form.actual,
        form.reason,
        retain,
        CURRENT_AGENT_ID
      )
      ElMessage.success('交付已鎖定')
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '交付失敗')
    }
  }
</script>
