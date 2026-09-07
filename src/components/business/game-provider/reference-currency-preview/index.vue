<template>
  <ElCard shadow="never" class="reference-preview">
    <template #header>
      <div class="preview-heading">
        <strong>參考換算</strong>
        <ElTag type="warning">【該金額只可參考】</ElTag>
        <ElSelect v-model="target" aria-label="參考幣別" placeholder="選擇參考幣別" clearable>
          <ElOption
            v-for="currency in currencies"
            :key="currency"
            :label="currency"
            :value="currency"
          />
        </ElSelect>
      </div>
    </template>
    <p v-if="!target">選擇一個幣別，預覽全部查詢結果的換算金額。</p>
    <ElEmpty v-else-if="!rows.length" description="沒有可換算的資料" :image-size="48" />
    <template v-else>
      <ElAlert
        v-if="!preview.amounts"
        type="warning"
        :closable="false"
        :title="`無法換算：缺少 ${preview.missing.join('、')} 正式匯率，暫不顯示合計。`"
      />
      <div v-else class="preview-amounts" aria-live="polite">
        <ElStatistic
          v-for="metric in metrics"
          :key="metric.key"
          :title="metric.label"
          :value="preview.amounts[metric.key]"
          :formatter="formatAmount"
          :precision="precision"
          group-separator=","
        >
          <template #suffix
            ><span class="currency-label">{{ target }}</span></template
          >
        </ElStatistic>
      </div>
      <p>採最新已發布正式匯率估算；僅供參考，不作為對帳或結算金額。</p>
      <p v-if="preview.rates.length" class="rate-dates"
        >匯率日期：{{
          preview.rates.map((rate) => `${rate.toCurrency} ${rate.date}`).join('；')
        }}（USDT 基準）</p
      >
      <p v-else-if="preview.amounts">原幣與參考幣別相同，無須換算。</p>
    </template>
  </ElCard>
</template>

<script setup lang="ts">
  import { referenceConversion, type PublishedRate } from '@/utils/referenceConversion'
  const props = defineProps<{
    rows: { currency: string; betAmount: number; payoutAmount: number; ggr: number }[]
    currencies: string[]
    rates: PublishedRate[]
    decimalPlaces: Record<string, number>
  }>()
  const target = ref('')
  const metrics = [
    { key: 'betAmount', label: '參考投注總額' },
    { key: 'payoutAmount', label: '參考派彩總額' },
    { key: 'ggr', label: '參考遊戲輸贏' }
  ] as const
  const precision = computed(() => props.decimalPlaces[target.value] ?? 2)
  const formatAmount = (value: number) =>
    new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: precision.value,
      maximumFractionDigits: precision.value
    }).format(value)
  const preview = computed(() =>
    referenceConversion(
      props.rows,
      target.value,
      props.rates,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date())
    )
  )
</script>

<style scoped lang="scss">
  .reference-preview {
    margin-bottom: 16px;
  }
  .preview-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .preview-heading .el-select {
    width: 180px;
    margin-left: auto;
  }
  .preview-amounts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }
  .currency-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  p {
    margin-top: 12px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
  }
  .rate-dates {
    overflow-wrap: anywhere;
  }
  @media (max-width: 640px) {
    .preview-amounts {
      grid-template-columns: 1fr;
    }
    .preview-heading .el-select {
      width: 100%;
    }
  }
</style>
