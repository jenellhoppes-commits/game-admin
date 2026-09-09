<template>
  <div class="term-fields">
    <ElFormItem label="計算基礎" required>
      <ElInput model-value="GGR（遊戲輸贏）" readonly />
    </ElFormItem>
    <ElFormItem label="各遊戲類型 GGR 比例" required style="grid-column: 1 / -1"
      ><GameTypeRates v-model="model.gameTypeRates" :cost-rates="costs"
    /></ElFormItem>
    <ElFormItem label="結算方式" required
      ><ElSelect v-model="model.settlementMode" placeholder="請選擇"
        ><ElOption label="累積" value="累積" /><ElOption label="清零" value="清零" /></ElSelect
    ></ElFormItem>
    <ElFormItem label="結算幣別" required
      ><ElSelect v-model="model.settlementCurrency"
        ><ElOption
          v-for="currency in currencies"
          :key="currency"
          :value="currency"
          :label="currency" /></ElSelect
    ></ElFormItem>
    <ElFormItem label="對帳週期" required
      ><ElSelect v-model="model.settlementCycle"
        ><ElOption
          v-for="(label, value) in termCycleLabels"
          :key="value"
          :value="value"
          :label="label" /></ElSelect
    ></ElFormItem>
    <ElFormItem label="生效日（Asia/Taipei）" required
      ><ElDatePicker
        v-model="model.effectiveFrom"
        type="date"
        value-format="YYYY-MM-DD"
        :disabled-date="disabledDate"
        placeholder="請選擇生效日"
    /></ElFormItem>
  </div>
</template>
<script setup lang="ts">
  import './term-dialog.scss'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { CURRENT_AGENT_ID } from '@/store/modules/agentPortal'
  import { costRatesAt } from '@/utils/partnerTerms'
  const business = useBusinessPartnerStore()
  const costs = computed(() =>
    costRatesAt(business.getTerms(CURRENT_AGENT_ID), model.value.effectiveFrom || businessDate())
  )
  import GameTypeRates from '@/components/business/GameTypeRates.vue'
  import { businessDate, termCycleLabels, type PartnerTermInput } from '@/utils/partnerTerms'
  const model = defineModel<PartnerTermInput>({ required: true })
  defineProps<{ currencies: string[] }>()
  const disabledDate = (date: Date) => businessDate(date) < businessDate()
</script>
<style scoped lang="scss">
  .term-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;

    :deep(.el-form-item),
    :deep(.el-form-item__content) {
      min-width: 0;
    }

    :deep(.el-select),
    :deep(.el-input-number),
    :deep(.el-date-editor) {
      width: 100%;
    }
  }

  @media (width <= 600px) {
    .term-fields {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
