<template>
  <div class="stage-page">
    <AppPageHeader
      :eyebrow="portalLabel"
      :title="String(route.meta.title || '')"
      :description="String(route.meta.description || '')"
    >
      <template #actions>
        <ElTag type="warning" effect="plain">{{ route.meta.phase }}</ElTag>
      </template>
    </AppPageHeader>

    <ElCard shadow="never" class="status-card">
      <div class="status-icon"><ArtSvgIcon icon="ri:road-map-line" /></div>
      <div>
        <h3>入口與權限隔離已完成</h3>
        <p>
          目前只完成第一階段的共用版型、角色選單與合法路由。此功能預定於
          {{ route.meta.phase }}串接正式資料與操作流程。
        </p>
        <ElAlert
          type="info"
          :closable="false"
          title="此頁不會執行新增、修改、確認或送出操作"
          description="避免以示範按鈕造成已完成的誤解；待下一階段確認資料權限與 API 後再開放。"
        />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'PartnerPortalStagePage' })

  const route = useRoute()
  const portalLabel = computed(() => (route.path.startsWith('/agent') ? '代理後台' : '商戶後台'))
</script>

<style scoped lang="scss">
  .stage-page {
    padding: 20px;
  }

  .status-card :deep(.el-card__body) {
    display: flex;
    gap: 18px;
    padding: 28px;
  }

  .status-icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    flex: 0 0 auto;
    color: var(--main-color);
    font-size: 24px;
    background: var(--art-gray-100);
    border-radius: 12px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  p {
    max-width: 720px;
    margin: 0 0 20px;
    color: var(--art-gray-600);
    line-height: 1.8;
  }

  @media (max-width: 640px) {
    .stage-page {
      padding: 12px;
    }

    .status-card :deep(.el-card__body) {
      flex-direction: column;
      padding: 20px;
    }
  }
</style>
