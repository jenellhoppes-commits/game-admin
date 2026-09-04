<template>
  <div class="detail-page">
    <ElCard class="detail-hero">
      <div class="hero-content">
        <div class="identity">
          <ElButton circle plain @click="router.push(listPath)" aria-label="返回列表">
            <ArtSvgIcon icon="ri:arrow-left-line" />
          </ElButton>
          <div>
            <p class="eyebrow">{{ moduleConfig.eyebrow }}</p>
            <div class="title-line">
              <h1>{{ record?.name || '資料不存在' }}</h1>
              <GameProviderStatusTag v-if="record" :status="record.status" />
            </div>
            <p class="record-id"
              >{{ routeBase === '/games' ? 'Game ID' : moduleConfig.codeLabel }}:
              {{ record?.id || route.params.id }}</p
            >
          </div>
        </div>
        <ElSpace wrap>
          <ElButton @click="ElMessage.info('編輯表單將於下一階段接入')">編輯</ElButton>
          <ElButton type="danger" plain @click="ElMessage.warning('已切換為停用預覽狀態')">
            停用
          </ElButton>
        </ElSpace>
      </div>
    </ElCard>

    <ElCard>
      <ElTabs v-model="activeTab">
        <ElTabPane v-for="tab in tabs" :key="tab.key" :label="tab.label" :name="tab.key">
          <div class="tab-content">
            <template v-if="tab.key === 'overview'">
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem :label="moduleConfig.codeLabel">{{
                  record?.code
                }}</ElDescriptionsItem>
                <ElDescriptionsItem :label="moduleConfig.nameLabel">{{
                  record?.name
                }}</ElDescriptionsItem>
                <ElDescriptionsItem :label="moduleConfig.categoryLabel">{{
                  record?.category
                }}</ElDescriptionsItem>
                <ElDescriptionsItem :label="moduleConfig.ownerLabel">{{
                  record?.owner
                }}</ElDescriptionsItem>
                <ElDescriptionsItem :label="moduleConfig.metricLabel">{{
                  record?.metric
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="更新時間">{{ record?.updatedAt }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <template v-else>
              <ElEmpty :image-size="92" :description="`${tab.label}內容將在對應 PRD 確認後接入`" />
            </template>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import { businessModuleDefinitions } from '@/config/game-provider/modules'
  import { gameTypeMockData, genericCollections } from '@/mock/game-provider'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import type { BusinessRecord } from '@/types/game-provider'

  defineOptions({ name: 'GameProviderEntityDetail' })

  const route = useRoute()
  const router = useRouter()
  const gameCatalogStore = useGameCatalogStore()
  const activeTab = ref(String(route.query.tab || 'overview'))
  const routeBase = computed(() =>
    String(route.meta.moduleKey || `/${route.path.split('/').filter(Boolean)[0] || 'merchants'}`)
  )
  const moduleConfig = computed(
    () => businessModuleDefinitions[routeBase.value] || businessModuleDefinitions['/merchants']
  )
  const listPath = computed(() => String(route.meta.activePath || moduleConfig.value.detailBase))
  const record = computed<BusinessRecord | undefined>(() => {
    if (routeBase.value === '/games') {
      const game = gameCatalogStore.findGame(String(route.params.id))
      if (!game) return undefined
      return {
        id: game.id,
        code: game.code,
        name: game.displayName,
        category: gameTypeMockData.find((item) => item.id === game.typeId)?.name || '未分類',
        owner: game.internalName,
        metric: game.defaultRtp ? `RTP ${game.defaultRtp}%` : 'RTP 未設定',
        status: game.status,
        updatedAt: game.updatedAt
      }
    }
    return (genericCollections[routeBase.value] || []).find((item) => item.id === route.params.id)
  })
  const descriptionColumns = computed(() => (window.innerWidth < 768 ? 1 : 2))
  const tabs = computed(() => {
    const moduleTabs: Record<string, Array<[string, string]>> = {
      '/games': [
        ['overview', '基本資料'],
        ['rtp', 'RTP 方案'],
        ['limits', '限紅方案'],
        ['logs', '異動紀錄']
      ],
      '/players': [
        ['overview', '基本資料'],
        ['games', '遊戲紀錄'],
        ['bets', '注單紀錄'],
        ['transactions', '交易紀錄'],
        ['jackpots', '獎池紀錄'],
        ['anomalies', '異常紀錄'],
        ['tags', '標記紀錄']
      ],
      '/bets': [
        ['overview', '基本資料'],
        ['result', '遊戲結果'],
        ['transactions', '關聯交易'],
        ['anomalies', '異常紀錄']
      ],
      '/transactions': [
        ['overview', '基本資料'],
        ['history', '交易歷程'],
        ['bets', '關聯注單'],
        ['anomalies', '異常紀錄']
      ],
      '/jackpots': [
        ['overview', '基本設定'],
        ['levels', '獎池級別'],
        ['games', '綁定遊戲'],
        ['merchants', '商戶設定'],
        ['ledger', '獎池流水'],
        ['payouts', '派發紀錄'],
        ['logs', '異動紀錄']
      ],
      '/risk-cases': [
        ['overview', '基本資料'],
        ['alerts', '關聯告警'],
        ['members', '關聯會員'],
        ['bets', '關聯注單'],
        ['transactions', '關聯交易'],
        ['processing', '處理紀錄'],
        ['result', '案件結果']
      ]
    }

    const currentTabs = moduleTabs[routeBase.value] || [
      ['overview', '基本資料'],
      ['settings', '設定'],
      ['relations', '關聯資料'],
      ['data', '數據'],
      ['logs', '異動紀錄']
    ]

    return currentTabs.map(([key, label]) => ({ key, label }))
  })

  watch(
    () => route.query.tab,
    (tab) => {
      if (tab) activeTab.value = String(tab)
    }
  )
</script>

<style scoped lang="scss">
  .detail-page {
    display: grid;
    gap: 16px;
  }

  .detail-hero :deep(.el-card__body) {
    padding: 22px 24px;
  }

  .hero-content,
  .identity,
  .title-line {
    display: flex;
    align-items: center;
  }

  .hero-content {
    gap: 24px;
    justify-content: space-between;
  }

  .identity {
    gap: 16px;
  }

  .title-line {
    flex-wrap: wrap;
    gap: 10px;

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
  }

  .eyebrow,
  .record-id {
    margin: 0;
    color: var(--art-gray-600);
  }

  .eyebrow {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--theme-color);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .record-id {
    margin-top: 7px;
    font-size: 13px;
  }

  .tab-content {
    min-height: 320px;
    padding: 14px 2px 8px;
  }

  @media (width <= 640px) {
    .hero-content {
      align-items: flex-start;
    }

    .hero-content,
    .identity {
      flex-direction: column;
    }

    .identity {
      align-items: flex-start;
    }
  }
</style>
