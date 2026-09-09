<template>
  <ElCard class="carry-demo" shadow="never">
    <template #header
      ><div class="carry-heading"
        ><strong>交收結轉演示</strong
        ><ElTag>第 {{ history.length + 1 }} 期 · SLOT · USD</ElTag></div
      ></template
    >
    <p>獨立演示資料：GGR 條件 5%。確認對帳後選擇交收或保留，再查看下期承接結果。</p>
    <ElForm label-position="top" class="carry-form">
      <ElFormItem label="結算方式"
        ><ElSelect v-model="mode" :disabled="history.length > 0 || confirmed"
          ><ElOption label="清零" value="清零" /><ElOption label="累積" value="累積" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="本期 GGR（USD）"
        ><ElInputNumber v-model="currentGgr" :precision="2" :controls="false" :disabled="confirmed"
      /></ElFormItem>
    </ElForm>
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem label="上期累積 GGR">{{ money(previousGgr) }}</ElDescriptionsItem>
      <ElDescriptionsItem label="本期 GGR">{{ money(currentGgr) }}</ElDescriptionsItem>
      <ElDescriptionsItem label="扣抵後 GGR">{{ money(result.adjustedGgr) }}</ElDescriptionsItem>
      <ElDescriptionsItem label="上期待交收金額">{{ money(previousPayable) }}</ElDescriptionsItem>
      <ElDescriptionsItem label="本期新增交收金額">{{
        money(result.newPayable)
      }}</ElDescriptionsItem>
      <ElDescriptionsItem label="合計待交收金額">{{
        money(result.totalPayable)
      }}</ElDescriptionsItem>
      <ElDescriptionsItem label="結轉下期 GGR">{{ money(result.nextGgr) }}</ElDescriptionsItem>
    </ElDescriptions>
    <div class="carry-actions">
      <ElButton v-if="!confirmed" type="primary" @click="confirmed = true">確認本期對帳</ElButton>
      <template v-else
        ><ElTag type="success">本期已對帳</ElTag
        ><ElButton type="primary" @click="finish('retain')">保留至下期交收</ElButton
        ><ElButton :disabled="result.totalPayable <= 0" @click="finish('settle')"
          >交收全部待交收金額</ElButton
        ></template
      >
      <ElButton @click="reset">重設演示</ElButton>
    </div>
    <h4 v-if="history.length">已完成期別</h4>
    <ElTable v-if="history.length" :data="history" style="width: 100%">
      <ElTableColumn prop="period" label="期別" width="80" />
      <ElTableColumn
        v-for="column in historyColumns"
        :key="column.key"
        :label="column.label"
        min-width="170"
        align="right"
        ><template #default="{ row }">{{ money(row[column.key]) }}</template></ElTableColumn
      >
      <ElTableColumn prop="action" label="處理方式" min-width="150" />
    </ElTable>
  </ElCard>
</template>
<script setup lang="ts">
  import { calculateCarry, closeCarry, type CarryMode } from '@/utils/settlementCarry'
  const mode = ref<CarryMode>('累積')
  const currentGgr = ref(-100000)
  const previousGgr = ref(0),
    previousPayable = ref(0),
    confirmed = ref(false)
  const history = ref<Array<Record<string, string | number>>>([])
  const input = computed(() => ({
    mode: mode.value,
    currentGgr: currentGgr.value ?? 0,
    previousGgr: previousGgr.value,
    previousPayable: previousPayable.value,
    percent: 5
  }))
  const result = computed(() => calculateCarry(input.value))
  const money = (amount: number) =>
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD'
  const historyColumns = [
    { key: 'previousGgr', label: '上期累積 GGR' },
    { key: 'currentGgr', label: '本期 GGR' },
    { key: 'adjustedGgr', label: '扣抵後 GGR' },
    { key: 'previousPayable', label: '上期待交收金額' },
    { key: 'newPayable', label: '本期新增交收金額' },
    { key: 'totalPayable', label: '合計待交收金額' },
    { key: 'actualPaid', label: '本期實際交收金額' },
    { key: 'nextPayable', label: '結轉下期待交收金額' },
    { key: 'nextGgr', label: '結轉下期 GGR' }
  ]
  function finish(action: 'retain' | 'settle') {
    if (!confirmed.value) return
    const closed = closeCarry(input.value, action)
    history.value.push({
      ...input.value,
      ...closed,
      period: history.value.length + 1,
      action: action === 'retain' ? '保留至下期交收' : '已交收'
    })
    previousGgr.value = closed.nextGgr
    previousPayable.value = closed.nextPayable
    currentGgr.value = 0
    confirmed.value = false
  }
  function reset() {
    history.value = []
    previousGgr.value = 0
    previousPayable.value = 0
    currentGgr.value = -100000
    confirmed.value = false
  }
</script>
<style scoped>
  .carry-demo {
    margin: 16px 0;
    min-width: 0;
  }
  .carry-demo p {
    color: var(--el-text-color-secondary);
    margin-bottom: 16px;
  }
  .carry-heading,
  .carry-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  .carry-actions {
    margin-top: 16px;
  }
  .carry-actions :deep(.el-button) {
    margin-left: 0;
  }
  .carry-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .carry-form :deep(.el-input-number) {
    width: 100%;
  }
  @media (max-width: 600px) {
    .carry-form {
      grid-template-columns: 1fr;
    }
  }
</style>
