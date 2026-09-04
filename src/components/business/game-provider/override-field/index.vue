<template>
  <div class="override-field">
    <div v-for="item in rows" :key="item.label" class="value-row">
      <span>{{ item.label }}</span>
      <strong :class="item.className">{{ item.value || '—' }}</strong>
    </div>
    <div class="value-row final-value">
      <span>最終生效值</span>
      <strong>{{ value.finalValue }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { OverrideValue } from '@/types/game-provider'

  defineOptions({ name: 'OverrideField' })
  const props = defineProps<{ value: OverrideValue }>()

  const rows = computed(() => [
    { label: '系統預設值', value: props.value.systemDefault, className: '' },
    { label: '商戶覆寫值', value: props.value.merchantOverride, className: 'override' },
    {
      label: '幣別覆寫值',
      value: props.value.currencyOverride,
      className: 'override'
    }
  ])
</script>

<style scoped lang="scss">
  .override-field {
    overflow: hidden;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .value-row {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 11px 14px;
    border-bottom: 1px solid var(--art-gray-200);

    span {
      font-size: 12px;
      color: var(--art-gray-600);
    }

    .override {
      color: var(--el-color-warning);
    }
  }

  .final-value {
    color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 7%, transparent);
    border-bottom: 0;
  }
</style>
