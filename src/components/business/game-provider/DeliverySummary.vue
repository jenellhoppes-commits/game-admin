<template>
  <ElDescriptions v-if="delivery" title="財務交付結果" :column="1" border>
    <ElDescriptionsItem label="對帳狀態">已鎖定</ElDescriptionsItem>
    <ElDescriptionsItem label="實際收款方">{{
      delivery.actualCollectorName || '—'
    }}</ElDescriptionsItem>
    <ElDescriptionsItem label="登錄方">{{
      delivery.operatorId === 'PLATFORM' ? '遊戲商平台' : delivery.operatorId || '—'
    }}</ElDescriptionsItem>
    <ElDescriptionsItem label="差異調整金額"
      >{{ delivery.adjustment }} {{ currency }}</ElDescriptionsItem
    >
    <ElDescriptionsItem label="調整原因／交付備註">{{ delivery.reason || '—' }}</ElDescriptionsItem>
    <ElDescriptionsItem label="收付狀態">{{ labels[delivery.paymentStatus] }}</ElDescriptionsItem>
    <ElDescriptionsItem label="調整後應結金額"
      >{{ delivery.adjusted }} {{ currency }}</ElDescriptionsItem
    >
    <ElDescriptionsItem label="實收／實付金額"
      >{{ delivery.actual }} {{ currency }}</ElDescriptionsItem
    >
    <ElDescriptionsItem label="剩餘未收／未付"
      >{{ delivery.remaining }} {{ currency }}</ElDescriptionsItem
    >
    <ElDescriptionsItem label="保留至下期"
      >{{ delivery.carried }} {{ currency }}</ElDescriptionsItem
    >
    <ElDescriptionsItem label="交付確認時間">{{ delivery.deliveredAt }}</ElDescriptionsItem>
  </ElDescriptions>
</template>
<script setup lang="ts">
  import type { ReconciliationMetrics } from '@/types/game-provider'
  defineProps<{ delivery?: ReconciliationMetrics['delivery']; currency: string }>()
  const labels: Record<string, string> = {
    Unpaid: '未收付',
    Partial: '部分收付',
    Paid: '已收付',
    Carried: '已結轉下期'
  }
</script>
