<template>
  <div class="merchant-line-table">
    <div class="section-toolbar">
      <div>
        <h3>商戶線路</h3>
        <p>每條線路固定一個交易幣別，並擁有獨立的遊戲、限紅與串接設定。</p>
      </div>
      <ElButton v-if="editable" type="primary" @click="$emit('add')">新增線路</ElButton>
    </div>
    <ElTable :data="lines" border>
      <ElTableColumn label="線路 UID" min-width="210">
        <template #default="scope">
          <EntityLink
            :label="scope.row.uid"
            :secondary="scope.row.currency"
            @click="$emit('open', scope.row)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="Wallet Mode" width="130">
        <template #default="scope"
          ><ElTag effect="plain">{{ scope.row.walletMode }}</ElTag></template
        >
      </ElTableColumn>
      <ElTableColumn prop="enabledGames" label="遊戲" width="80" />
      <ElTableColumn prop="limitPlanCount" label="限紅方案" width="100" />
      <ElTableColumn label="Jackpot" width="110">
        <template #default="scope">{{ jackpotModeLabel(scope.row.jackpotMode) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="environment" label="環境" width="130" />
      <ElTableColumn label="Credential" width="135">
        <template #default="scope">
          <GameProviderStatusTag :status="scope.row.credentialStatus" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="狀態" width="140" fixed="right">
        <template #default="scope"><GameProviderStatusTag :status="scope.row.status" /></template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>

<script setup lang="ts">
  import type { MerchantLine } from '@/types/game-provider'
  import EntityLink from '../entity-link/index.vue'
  import GameProviderStatusTag from '../status-tag/index.vue'

  defineOptions({ name: 'MerchantLineTable' })
  defineProps<{ lines: MerchantLine[]; editable?: boolean }>()
  defineEmits<{ add: []; open: [line: MerchantLine] }>()

  const jackpotModeLabel = (mode: MerchantLine['jackpotMode']) =>
    ({ Default: '使用預設', Custom: '自訂', Excluded: '不參與' })[mode]
</script>

<style scoped lang="scss">
  .section-toolbar {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 14px;

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: 16px;
    }

    p {
      margin-top: 5px;
      font-size: 13px;
      color: var(--art-gray-600);
    }
  }
</style>
