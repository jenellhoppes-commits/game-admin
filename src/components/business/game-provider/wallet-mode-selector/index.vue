<template>
  <div class="wallet-mode-selector" :class="{ locked }">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="mode-card"
      :class="{ active: model === option.value }"
      :disabled="locked"
      @click="model = option.value"
    >
      <span class="mode-icon"><ArtSvgIcon :icon="option.icon" /></span>
      <span class="mode-copy">
        <strong>{{ option.label }}</strong>
        <small>{{ option.description }}</small>
      </span>
      <ElTag v-if="model === option.value" type="primary" effect="light" round>已選擇</ElTag>
    </button>
    <ElAlert :title="impactText" type="warning" :closable="false" show-icon class="impact-alert" />
  </div>
</template>

<script setup lang="ts">
  import type { WalletMode } from '@/types/game-provider'

  defineOptions({ name: 'WalletModeSelector' })

  defineProps<{ locked?: boolean }>()
  const model = defineModel<WalletMode>({ required: true })

  const options = [
    {
      value: 'Seamless' as const,
      label: 'Seamless Wallet',
      icon: 'ri:link-m',
      description: '玩家主餘額由商戶管理，遊戲商逐筆呼叫 Balance、Bet、Win。'
    },
    {
      value: 'Transfer' as const,
      label: 'Transfer Wallet',
      icon: 'ri:exchange-funds-line',
      description: '資金先轉入遊戲錢包，需處理 Transfer In／Out、餘額與對帳。'
    }
  ]

  const impactText = computed(() =>
    model.value === 'Seamless'
      ? '全部商戶線路將繼承 Seamless；串接測試包含餘額、下注、派彩、退款與回滾。'
      : '全部商戶線路將繼承 Transfer；串接測試包含轉入／轉出、遊戲餘額與回收。'
  )
</script>

<style scoped lang="scss">
  .wallet-mode-selector {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .mode-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    align-items: center;
    padding: 18px;
    color: var(--art-gray-900);
    text-align: left;
    cursor: pointer;
    background: var(--default-box-color);
    border: 1px solid var(--art-gray-200);
    border-radius: 12px;
    transition: 0.2s ease;

    &:hover,
    &.active {
      border-color: var(--theme-color);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-color) 10%, transparent);
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .mode-icon {
    display: grid;
    width: 42px;
    height: 42px;
    font-size: 20px;
    color: var(--theme-color);
    background: color-mix(in srgb, var(--theme-color) 10%, transparent);
    border-radius: 10px;
    place-items: center;
  }

  .mode-copy {
    display: grid;
    gap: 5px;

    small {
      line-height: 1.55;
      color: var(--art-gray-600);
    }
  }

  .impact-alert {
    grid-column: 1 / -1;
  }

  @media (width <= 760px) {
    .wallet-mode-selector {
      grid-template-columns: 1fr;
    }

    .impact-alert {
      grid-column: auto;
    }
  }
</style>
