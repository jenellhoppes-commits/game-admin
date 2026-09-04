<template>
  <div class="audit-panel">
    <div class="panel-toolbar">
      <div>
        <h2>異動紀錄</h2>
        <p>追蹤遊戲主檔、RTP、限紅與狀態的所有關鍵操作。</p>
      </div>
      <ElInput v-model="keyword" clearable placeholder="搜尋操作、原因或人員" class="search-input">
        <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
      </ElInput>
    </div>

    <ElTimeline v-if="filteredLogs.length">
      <ElTimelineItem
        v-for="log in filteredLogs"
        :key="log.id"
        :timestamp="log.time"
        placement="top"
        :type="
          log.result === 'Success' ? 'success' : log.result === 'Rejected' ? 'danger' : 'warning'
        "
      >
        <ElCard shadow="never" class="audit-card">
          <div class="audit-heading">
            <div>
              <strong>{{ log.action }}</strong>
              <span>{{ log.operator }}</span>
            </div>
            <ElTag
              :type="
                log.result === 'Success'
                  ? 'success'
                  : log.result === 'Rejected'
                    ? 'danger'
                    : 'warning'
              "
              effect="light"
            >
              {{ resultLabel(log.result) }}
            </ElTag>
          </div>
          <p>{{ log.reason }}</p>
          <ElCollapse v-if="log.before || log.after">
            <ElCollapseItem title="查看異動內容">
              <div class="change-grid">
                <div
                  ><span>異動前</span><pre>{{ readable(log.before) }}</pre>
                </div>
                <div
                  ><span>異動後</span><pre>{{ readable(log.after) }}</pre>
                </div>
              </div>
            </ElCollapseItem>
          </ElCollapse>
        </ElCard>
      </ElTimelineItem>
    </ElTimeline>
    <ElEmpty v-else description="沒有符合條件的異動紀錄" />
  </div>
</template>

<script setup lang="ts">
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'

  const props = defineProps<{ gameId: string }>()
  const store = useGameCatalogStore()
  const keyword = ref('')
  const filteredLogs = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    const logs = store.getAuditLogs(props.gameId)
    if (!query) return logs
    return logs.filter((log) =>
      [log.action, log.operator, log.reason, log.approver].some((value) =>
        value?.toLowerCase().includes(query)
      )
    )
  })
  const resultLabel = (result: string) =>
    ({ Success: '成功', Pending: '待處理', Rejected: '已駁回' })[result] || result
  const readable = (value?: string) => {
    if (!value) return '—'
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
</script>

<style scoped lang="scss">
  .audit-panel {
    display: grid;
    gap: 20px;
  }
  .panel-toolbar,
  .audit-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .panel-toolbar h2 {
    margin: 0;
    font-size: 17px;
  }
  .panel-toolbar p,
  .audit-card p {
    margin: 5px 0 0;
    color: var(--art-gray-500);
  }
  .search-input {
    width: 280px;
  }
  .audit-heading > div {
    display: grid;
    gap: 3px;
  }
  .audit-heading span {
    font-size: 12px;
    color: var(--art-gray-500);
  }
  .change-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .change-grid > div {
    min-width: 0;
  }
  .change-grid span {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--art-gray-500);
  }
  pre {
    max-height: 220px;
    padding: 10px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    background: var(--art-gray-50);
    border-radius: 6px;
  }
  @media (width <= 640px) {
    .panel-toolbar {
      align-items: stretch;
      flex-direction: column;
    }
    .search-input {
      width: 100%;
    }
    .change-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
