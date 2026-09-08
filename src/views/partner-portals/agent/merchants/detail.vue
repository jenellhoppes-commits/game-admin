<template>
  <div class="agent-page">
    <AppPageHeader
      eyebrow="代理後台／商戶管理／詳細"
      :title="merchant?.name || '無權限或資料不存在'"
      :description="
        merchant ? `${merchant.code}／${relationLabel}` : '系統未載入授權範圍外的商戶資料。'
      "
    >
      <template #actions
        ><ElButton @click="router.push({ path: '/agent/merchants', query: route.query })"
          >返回列表</ElButton
        ></template
      >
    </AppPageHeader>

    <ElResult
      v-if="!merchant"
      icon="warning"
      title="無權限或資料不存在"
      sub-title="不會揭露授權代理樹以外的商戶是否存在。"
    />
    <template v-else>
      <ElAlert
        type="info"
        :closable="false"
        title="只提供授權商務摘要"
        description="不載入會員、逐筆注單、交易、Credential、Secret、Callback 或 IP 資料。"
      />
      <ElCard shadow="never" class="detail-card">
        <template #header><strong>商戶摘要</strong></template>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="商戶代碼">{{ merchant.code }}</ElDescriptionsItem>
          <ElDescriptionsItem label="名稱">{{ merchant.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="直接代理">{{ merchant.agentName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關係">{{ relationLabel }}</ElDescriptionsItem>
          <ElDescriptionsItem label="關係生效日">{{
            merchant.cooperationStartDate || '未取得'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="核准幣別">{{ currencies }}</ElDescriptionsItem>
          <ElDescriptionsItem label="線路數">{{ merchant.lines.length }}</ElDescriptionsItem>
          <ElDescriptionsItem label="結算週期">{{
            cycleLabel(merchant.settlementCycle)
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>
      <ElCard shadow="never">
        <template #header>
          <div class="agent-card-title">
            <div><strong>原幣營運摘要</strong><small>彙總資料，不含明細識別</small></div>
          </div>
        </template>
        <ArtTable
          :show-table-header="false"
          height="auto"
          empty-height="240px"
          empty-text="沒有符合條件的資料"
          :data="summaries"
        >
          <ElTableColumn prop="currency" label="原幣" width="100" />
          <ElTableColumn prop="lines" label="線路數" width="100" align="right" />
          <ElTableColumn prop="rounds" label="局數" min-width="110" align="right" />
          <ElTableColumn label="投注" min-width="150" align="right">
            <template #default="scope">{{
              money(scope.row.betAmount, scope.row.currency)
            }}</template>
          </ElTableColumn>
          <ElTableColumn label="派彩" min-width="150" align="right">
            <template #default="scope">{{
              money(scope.row.payoutAmount, scope.row.currency)
            }}</template>
          </ElTableColumn>
          <ElTableColumn label="遊戲輸贏" min-width="150" align="right">
            <template #default="scope">{{ money(scope.row.ggr, scope.row.currency) }}</template>
          </ElTableColumn>
        </ArtTable>
      </ElCard>
    </template>
  </div>
</template>

<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import {
    CURRENT_AGENT_ID,
    groupAgentMetrics,
    useAgentPortalStore
  } from '@/store/modules/agentPortal'

  defineOptions({ name: 'AgentPortalMerchantDetail' })

  const route = useRoute()
  const router = useRouter()
  const store = useAgentPortalStore()
  const merchant = computed(() =>
    store.allMerchants.find((item) => item.id === String(route.params.id || ''))
  )
  const relationLabel = computed(() =>
    merchant.value?.agentId === CURRENT_AGENT_ID ? '直屬' : '間接'
  )
  const currencies = computed(
    () =>
      [...new Set(merchant.value?.lines.map((line) => line.currency) || [])].join('、') ||
      merchant.value?.requestedCurrency ||
      '未取得'
  )
  const summaries = computed(() =>
    groupAgentMetrics(
      store.metricRows.filter((row) => row.merchantId === merchant.value?.id),
      '幣別'
    )
  )

  function money(value: number, currency: string) {
    return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value)} ${currency}`
  }

  function cycleLabel(value: string) {
    return (
      (
        { Daily: '日結', Weekly: '週結', Semimonthly: '半月結', Monthly: '月結' } as Record<
          string,
          string
        >
      )[value] || value
    )
  }
</script>

<style scoped lang="scss">
  @use '../shared';

  .detail-card {
    margin: 16px 0;
  }
</style>
