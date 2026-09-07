<template>
  <div class="agent-page">
    <AppPageHeader title="公告通知" />
    <ArtSearchBar label-position="top"
      :model-value="draft"
      @update:model-value="Object.assign(draft, $event)"
      :items="items"
      :show-expand="false"
      :is-expand="true"
      @search="search"
      @reset="reset"
    />
    <ElCard shadow="never">
      <ArtTable
        :data="rows.slice((page - 1) * size, page * size)"
        :show-table-header="false"
        height="auto"
        row-key="id"
        :pagination="{ current: page, size, total: rows.length }"
        @pagination:current-change="page = $event"
        @pagination:size-change="changePageSize"
      >
        <ElTableColumn prop="type" label="類型" width="100" />
        <ElTableColumn label="標題" min-width="240"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="open(row.id)">{{
              row.title
            }}</ElButton></template
          ></ElTableColumn
        >
        <ElTableColumn prop="publishedAt" label="發布時間" min-width="160" />
        <ElTableColumn label="閱讀狀態" width="100"
          ><template #default="{ row }"
            ><ElTag :type="row.read ? 'info' : 'primary'">{{
              row.read ? '已讀' : '未讀'
            }}</ElTag></template
          ></ElTableColumn
        >
      </ArtTable>
    </ElCard>
    <ElDrawer v-model="visible" title="通知詳細" size="min(560px, 100%)">
      <template v-if="selected">
        <h2>{{ selected.title }}</h2>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem label="類型">{{ selected.type }}</ElDescriptionsItem>
          <ElDescriptionsItem label="發布時間">{{ selected.publishedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="對象">{{ selected.scope }}</ElDescriptionsItem>
        </ElDescriptions>
        <p class="notice-body">{{
          selected.content ||
          sampleContent[selected.id] ||
          '目前此通知僅提供標題摘要，完整內容尚未提供。'
        }}</p>
        <ElTag v-if="!selected.content && sampleContent[selected.id]" type="info"
          >示範公告內容</ElTag
        >
      </template>
    </ElDrawer>
  </div>
</template>
<script setup lang="ts">
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useAgentPortalStore } from '@/store/modules/agentPortal'
  const store = useAgentPortalStore()
  const sampleContent: Record<string, string> = {
    'NT-A01':
      '請至本代理對帳／結算頁核對期間、幣別、金額及快照。如有差異，請於單據內回報；差異處理完成並符合確認條件後，再確認本版本。實際可確認狀態以單據為準。',
    'NT-A02':
      '代理關係申請已受理。請至代理關係頁查看申請紀錄；待審核期間不會改變現行代理關係，結果以申請狀態為準。',
    'NT-A03':
      '平台維護公告將於此提供影響範圍、維護時間及恢復通知。本示範尚未設定正式維護時段，請以後續正式公告為準。'
  }
  const draft = reactive({ keyword: '', read: '' })
  const applied = reactive({ ...draft })
  const page = ref(1),
    size = ref(20),
    visible = ref(false),
    selectedId = ref('')
  const items = [
    { key: 'keyword', label: '關鍵字', type: 'input', props: { clearable: true } },
    {
      key: 'read',
      label: '閱讀狀態',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '未讀', value: 'unread' },
          { label: '已讀', value: 'read' }
        ]
      }
    }
  ]
  const rows = computed(() =>
    store.notices.filter(
      (n) =>
        (!applied.keyword || n.title.includes(applied.keyword)) &&
        (!applied.read || (applied.read === 'read') === n.read)
    )
  )
  const selected = computed(() => store.notices.find((n) => n.id === selectedId.value))
  function search() {
    Object.assign(applied, draft)
    page.value = 1
  }
  function reset() {
    Object.assign(draft, { keyword: '', read: '' })
    search()
  }
  function open(id: string) {
    selectedId.value = id
    visible.value = true
    store.markNoticeRead(id)
  }
function changePageSize(value: number) { size.value = value; page.value = 1 }
</script>
<style scoped lang="scss">
  @use '../shared';
  .notice-body {
    margin-top: 20px;
    line-height: 1.8;
    white-space: pre-wrap;
  }
</style>
