<template>
  <div class="page">
    <AppPageHeader
      title="操作紀錄"
      eyebrow="平台管理 · 系統紀錄"
      description="集中追蹤後台帳號、角色、權限與資料範圍的敏感異動。"
    >
      <template #actions
        ><ElButton @click="ElMessage.success('操作紀錄已匯出')">匯出</ElButton></template
      >
    </AppPageHeader>
    <ElAlert
      title="操作紀錄為不可修改的稽核資料；正式環境應由後端保存修改前後內容與來源 IP。"
      type="info"
      :closable="false"
      show-icon
    />
    <ElCard shadow="never" class="filter-card">
      <ElForm inline>
        <ElFormItem label="關鍵字"
          ><ElInput v-model="filters.keyword" clearable placeholder="對象、操作人或說明"
        /></ElFormItem>
        <ElFormItem label="資料類型"
          ><ElSelect v-model="filters.entityType" clearable placeholder="全部類型"
            ><ElOption label="後台帳號" value="Account" /><ElOption
              label="角色"
              value="Role" /><ElOption label="操作權限" value="Permission" /><ElOption
              label="敏感權限"
              value="Sensitive Grant" /><ElOption label="資料範圍" value="Data Scope" /></ElSelect
        ></ElFormItem>
        <ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
        ><ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>
    <ElCard shadow="never" class="table-card">
      <div class="toolbar"
        ><div
          ><strong>帳號與權限操作</strong><span>共 {{ rows.length }} 筆</span></div
        ><span>最近異動優先顯示</span></div
      >
      <ElTable :data="rows" border row-key="id">
        <ElTableColumn prop="createdAt" label="操作時間" min-width="165" fixed="left" />
        <ElTableColumn label="資料類型" width="120"
          ><template #default="scope"
            ><ElTag effect="plain">{{ entityLabel(scope.row.entityType) }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="對象" min-width="150"
          ><template #default="scope"
            ><strong>{{ scope.row.entityId }}</strong
            ><br /><small>{{ scope.row.id }}</small></template
          ></ElTableColumn
        >
        <ElTableColumn prop="action" label="操作" min-width="160" />
        <ElTableColumn prop="beforeValue" label="修改前" min-width="190" show-overflow-tooltip />
        <ElTableColumn prop="afterValue" label="修改後" min-width="190" show-overflow-tooltip />
        <ElTableColumn prop="operator" label="操作人" min-width="130" />
        <ElTableColumn prop="note" label="說明" min-width="240" />
      </ElTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { usePlatformAccessStore } from '@/store/modules/platformAccess'
  import type { PlatformAccessLog } from '@/types/game-provider'

  defineOptions({ name: 'PlatformOperationLogs' })
  const store = usePlatformAccessStore()
  const filters = reactive({ keyword: '', entityType: '' })
  const rows = computed(() =>
    store.logs.filter(
      (item) =>
        (!filters.entityType || item.entityType === filters.entityType) &&
        (!filters.keyword ||
          `${item.entityId}${item.action}${item.operator}${item.note}`
            .toLowerCase()
            .includes(filters.keyword.toLowerCase()))
    )
  )
  const reset = () => {
    filters.keyword = ''
    filters.entityType = ''
  }
  const entityLabel = (type: PlatformAccessLog['entityType']) =>
    ({
      Account: '後台帳號',
      Role: '角色',
      Permission: '操作權限',
      'Sensitive Grant': '敏感權限',
      'Data Scope': '資料範圍'
    })[type]
</script>

<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    color: var(--art-gray-600);

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
      color: var(--art-text-gray-900);
    }
  }

  small {
    color: var(--art-gray-600);
  }

  @media (width <= 620px) {
    .toolbar {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
