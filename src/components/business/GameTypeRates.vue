<template>
  <div class="type-rates">
    <div v-for="type in types" :key="type.id" class="type-rate-row">
      <span>{{ type.code }} {{ type.name }}</span>
      <ElInputNumber
        :model-value="model?.find((r) => r.typeId === type.id)?.percent"
        :min="0"
        :max="100"
        :precision="2"
        :controls="false"
        placeholder="未設定"
        :aria-label="type.name + ' GGR 比例'"
        @update:model-value="(value) => update(type, value)"
      />
      <span>%</span>
    </div>
    <small>計算基準 GGR；留空表示未設定。</small>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { gameTypeMockData } from '@/mock/game-provider'
  import type { GameTypeRate, GameTaxonomyRecord } from '@/types/game-provider'
  const model = defineModel<GameTypeRate[]>()
  const types = computed(() => gameTypeMockData.filter((t) => t.status === 'Active'))
  function update(type: GameTaxonomyRecord, value: number | undefined) {
    const rates = (model.value || []).filter((r) => r.typeId !== type.id)
    if (value !== undefined && value !== null)
      rates.push({ typeId: type.id, code: type.code || type.id, name: type.name, percent: value })
    model.value = rates
  }
</script>
<style scoped>
  .type-rates {
    width: 100%;
    min-width: 0;
  }
  .type-rate-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px 16px;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
  }
  .type-rate-row :deep(.el-input-number) {
    width: 100%;
  }
  small {
    color: var(--el-text-color-secondary);
  }
</style>
