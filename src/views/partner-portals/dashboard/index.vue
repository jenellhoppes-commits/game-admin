<template>
  <div class="portal-page">
    <AppPageHeader
      :eyebrow="portalLabel"
      :title="`${portalLabel}儀錶板`"
      :description="description"
    >
      <template #actions>
        <ElTag type="warning" effect="plain">第一階段整合原型</ElTag>
      </template>
    </AppPageHeader>

    <ElAlert
      class="scope-alert"
      type="info"
      :closable="false"
      show-icon
      title="目前完成共用框架、角色入口、選單與路由隔離"
      :description="phaseNotice"
    />

    <div class="metric-grid">
      <ElCard v-for="item in metrics" :key="item.label" shadow="never" class="metric-card">
        <div class="metric-title">
          <span>{{ item.label }}</span>
          <ArtSvgIcon :icon="item.icon" />
        </div>
        <strong>{{ item.value }}</strong>
        <small>{{ item.note }}</small>
      </ElCard>
    </div>

    <div class="content-grid">
      <ElCard shadow="never">
        <template #header>
          <div class="card-heading">
            <div>
              <strong>可見資料範圍</strong>
              <span>第一階段先固定安全邊界</span>
            </div>
          </div>
        </template>
        <ElTable :data="scopeRows" size="small" table-layout="fixed">
          <ElTableColumn prop="area" label="資料區域" min-width="140" />
          <ElTableColumn prop="scope" label="允許範圍" min-width="230" />
          <ElTableColumn label="狀態" width="110">
            <template #default>
              <ElTag type="success" effect="plain">已隔離</ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="card-heading">
            <div>
              <strong>下一階段功能</strong>
              <span>未完成項目不提供操作按鈕</span>
            </div>
          </div>
        </template>
        <div class="next-list">
          <div v-for="item in nextItems" :key="item">
            <ArtSvgIcon icon="ri:time-line" />
            <span>{{ item }}</span>
            <ElTag size="small" effect="plain">{{ targetPhase }}</ElTag>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'PartnerPortalDashboard' })

  const route = useRoute()
  const isAgent = computed(() => route.path.startsWith('/agent'))
  const portalLabel = computed(() => (isAgent.value ? '代理後台' : '商戶後台'))
  const targetPhase = computed(() => (isAgent.value ? '第二階段' : '第三階段'))
  const description = computed(() =>
    isAgent.value
      ? '查看授權代理層級、商戶彙總及財務作業入口。'
      : '查看本商戶與已授權線路的營運作業入口。'
  )
  const phaseNotice = computed(
    () => `${targetPhase.value}才會串接正式業務資料；本頁數字僅用來驗證版面，不代表正式營運結果。`
  )

  const metrics = computed(() =>
    isAgent.value
      ? [
          { label: '授權代理層級', value: 'L1–L3', note: '僅限授權後代', icon: 'ri:node-tree' },
          { label: '商戶彙總', value: '—', note: '第二階段串接', icon: 'ri:store-2-line' },
          { label: '待對帳', value: '—', note: '依原幣別呈現', icon: 'ri:calculator-line' },
          { label: '公告通知', value: '—', note: '第二階段串接', icon: 'ri:notification-3-line' }
        ]
      : [
          { label: '授權線路', value: '—', note: '第三階段串接', icon: 'ri:route-line' },
          { label: '啟用遊戲', value: '—', note: '限已授權線路', icon: 'ri:gamepad-line' },
          { label: '待對帳', value: '—', note: '依原幣別呈現', icon: 'ri:calculator-line' },
          { label: '公告通知', value: '—', note: '第三階段串接', icon: 'ri:notification-3-line' }
        ]
  )

  const scopeRows = computed(() =>
    isAgent.value
      ? [
          { area: '代理與商戶', scope: '授權後代及其商戶彙總' },
          { area: '會員與交易', scope: '不提供個資、逐筆注單、交易及重播' },
          { area: '財務', scope: '僅能確認自己的單據，不跨幣別加總' }
        ]
      : [
          { area: '商戶資料', scope: '僅限目前登入商戶' },
          { area: '遊戲與交易', scope: '本商戶且已授權線路' },
          { area: '財務', scope: '僅能確認自己的單據，不跨幣別加總' }
        ]
  )

  const nextItems = computed(() =>
    isAgent.value
      ? ['代理層級與商戶彙總', '代理報表及正式匯率快照', '代理對帳與帳號權限']
      : ['遊戲、線路與串接作業', '會員、交易及獎池作業', '營運報表與商戶對帳']
  )
</script>

<style scoped lang="scss">
  .portal-page {
    padding: 20px;
  }

  .scope-alert {
    margin-bottom: 16px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .metric-card {
    .metric-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 14px 0 6px;
      font-size: 28px;
    }

    small {
      color: var(--art-gray-500);
    }
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
    gap: 16px;
  }

  .card-heading div,
  .next-list div {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .card-heading span {
    margin-left: 10px;
    color: var(--art-gray-500);
    font-size: 13px;
  }

  .next-list {
    display: grid;
    gap: 14px;

    span {
      flex: 1;
    }
  }

  @media (max-width: 1100px) {
    .metric-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .portal-page {
      padding: 12px;
    }

    .metric-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }
</style>
