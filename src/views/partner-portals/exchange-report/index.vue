<template>
  <div class="exchange-page">
    <AppPageHeader
      :eyebrow="portalLabel"
      title="匯率報表"
      description="僅供查詢正式適用匯率與歷史鎖定快照。"
    >
      <template #actions>
        <ElTag type="info" effect="plain">唯讀</ElTag>
        <ElTag type="warning" effect="plain">{{ targetPhase }}串接正式資料</ElTag>
      </template>
    </AppPageHeader>

    <ElAlert
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="第一階段僅驗證查詢版面與權限"
      description="下列表格為原型示意，不提供來源、加減點、成本、內部備註或任何修改操作。"
    />

    <ElCard shadow="never">
      <ElTable :data="rates" size="small" table-layout="fixed">
        <ElTableColumn prop="currency" label="幣別" width="110" />
        <ElTableColumn prop="quotation" label="正式適用匯率" min-width="190" />
        <ElTableColumn prop="effectiveDate" label="適用日期" min-width="140" />
        <ElTableColumn prop="lockedAt" label="鎖定時間" min-width="175" />
        <ElTableColumn label="狀態" width="110">
          <template #default>
            <ElTag type="success" effect="plain">已鎖定</ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'PartnerExchangeReport' })

  const route = useRoute()
  const isAgent = computed(() => route.path.startsWith('/agent'))
  const portalLabel = computed(() => (isAgent.value ? '代理後台' : '商戶後台'))
  const targetPhase = computed(() => (isAgent.value ? '第二階段' : '第三階段'))
  const rates = [
    {
      currency: 'USDT',
      quotation: '1 USDT = 1.000000 USDT',
      effectiveDate: '2026-09-07',
      lockedAt: '2026-09-07 00:05'
    },
    {
      currency: 'TWD',
      quotation: '1 USDT = 32.180000 TWD',
      effectiveDate: '2026-09-07',
      lockedAt: '2026-09-07 00:05'
    },
    {
      currency: 'ASGU',
      quotation: '1 USDT = 1.000000 ASGU',
      effectiveDate: '2026-09-07',
      lockedAt: '2026-09-07 00:05'
    }
  ]
</script>

<style scoped lang="scss">
  .exchange-page {
    padding: 20px;
  }

  .notice {
    margin-bottom: 16px;
  }

  @media (max-width: 640px) {
    .exchange-page {
      padding: 12px;
    }
  }
</style>
