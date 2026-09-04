<template>
  <header class="app-page-header">
    <div class="heading-copy">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <div class="title-line">
        <h1>{{ title }}</h1>
        <GameProviderStatusTag v-if="status" :status="status" />
        <slot name="status" />
      </div>
      <p v-if="description" class="description">{{ description }}</p>
      <slot name="meta" />
    </div>
    <ElSpace v-if="$slots.actions" wrap class="header-actions">
      <slot name="actions" />
    </ElSpace>
  </header>
</template>

<script setup lang="ts">
  import type { BusinessStatus, CredentialStatus } from '@/types/game-provider'
  import GameProviderStatusTag from '../status-tag/index.vue'

  defineOptions({ name: 'AppPageHeader' })

  defineProps<{
    title: string
    eyebrow?: string
    description?: string
    status?: BusinessStatus | CredentialStatus
  }>()
</script>

<style scoped lang="scss">
  .app-page-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 4px 2px;
  }

  .eyebrow {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--theme-color);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .title-line {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--art-gray-900);
  }

  .description {
    max-width: 920px;
    margin: 8px 0 0;
    line-height: 1.65;
    color: var(--art-gray-600);
  }

  @media (width <= 640px) {
    .app-page-header {
      flex-direction: column;
      gap: 14px;
    }

    .header-actions {
      width: 100%;
    }
  }
</style>
