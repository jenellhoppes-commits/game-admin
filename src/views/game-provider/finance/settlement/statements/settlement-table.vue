<template>
  <ElTable :data="rows" border row-key="id">
    <ElTableColumn label="結算單" min-width="220"
      ><template #default="scope"
        ><button class="link" type="button" @click="$emit('open', scope.row.id)"
          ><strong>{{ type === 'merchant' ? scope.row.merchantName : scope.row.agentName }}</strong
          ><small>{{ scope.row.id }} · {{ scope.row.period }}</small></button
        ></template
      ></ElTableColumn
    >
    <ElTableColumn v-if="type === 'merchant'" prop="lineUid" label="商戶線路" min-width="180" />
    <ElTableColumn
      v-else
      prop="merchantStatementCount"
      label="商戶對帳數"
      width="110"
      align="right"
    />
    <ElTableColumn prop="batchId" label="結算批次" min-width="150" />
    <ElTableColumn label="原始應結" min-width="145" align="right"
      ><template #default="scope">{{
        money(scope.row.grossAmount, scope.row.settlementCurrency)
      }}</template></ElTableColumn
    >
    <ElTableColumn label="調整" min-width="125" align="right"
      ><template #default="scope">{{
        money(scope.row.adjustmentAmount, scope.row.settlementCurrency)
      }}</template></ElTableColumn
    >
    <ElTableColumn label="最終應結" min-width="150" align="right"
      ><template #default="scope"
        ><strong>{{ money(scope.row.finalAmount, scope.row.settlementCurrency) }}</strong></template
      ></ElTableColumn
    >
    <ElTableColumn label="狀態" width="110"
      ><template #default="scope"
        ><ElTag :type="statusType(scope.row.status)">{{
          statusLabel(scope.row.status)
        }}</ElTag></template
      ></ElTableColumn
    >
    <ElTableColumn prop="dueDate" label="付款期限" width="115" />
    <ElTableColumn v-if="showActions" label="操作" width="90" fixed="right"
      ><template #default="scope"
        ><ElButton link type="primary" @click="$emit('open', scope.row.id)"
          >查看</ElButton
        ></template
      ></ElTableColumn
    >
  </ElTable>
</template>

<script setup lang="ts">
  import type { AgentSettlementStatement, MerchantSettlementStatement } from '@/types/game-provider'

  defineOptions({ name: 'SettlementTable' })
  defineProps<{
    rows: Array<MerchantSettlementStatement | AgentSettlementStatement>
    type: 'merchant' | 'agent'
    showActions?: boolean
  }>()
  defineEmits<{ open: [id: string] }>()
  const money = (value: number, currency: string) =>
    `${currency} ${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)}`
  const statusLabel = (status: string) =>
    ({
      Draft: '草稿',
      'Pending Review': '待審核',
      Approved: '已核准',
      Paid: '已付款',
      Voided: '已作廢'
    })[status] || status
  const statusType = (status: string) =>
    status === 'Paid'
      ? 'success'
      : status === 'Approved'
        ? 'primary'
        : status === 'Pending Review'
          ? 'warning'
          : status === 'Voided'
            ? 'danger'
            : 'info'
</script>

<style scoped lang="scss">
  .link {
    display: grid;
    gap: 4px;
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .link small {
    color: var(--art-gray-500);
  }
</style>
