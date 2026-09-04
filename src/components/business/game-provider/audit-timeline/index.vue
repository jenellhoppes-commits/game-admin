<template>
  <ElTimeline class="audit-timeline">
    <ElTimelineItem
      v-for="entry in entries"
      :key="entry.id"
      :timestamp="entry.time"
      placement="top"
      :type="
        entry.result === 'Success' ? 'success' : entry.result === 'Rejected' ? 'danger' : 'warning'
      "
    >
      <ElCard shadow="never">
        <div class="audit-heading">
          <strong>{{ entry.action }}</strong>
          <ElTag size="small" effect="plain">{{ resultLabel(entry.result) }}</ElTag>
        </div>
        <p
          >{{ entry.operator }}<span v-if="entry.approver"> · 核准：{{ entry.approver }}</span></p
        >
        <p>{{ entry.reason }}</p>
        <div v-if="entry.before || entry.after" class="change-row">
          <span>{{ entry.before || '—' }}</span
          ><ArtSvgIcon icon="ri:arrow-right-line" /><strong>{{ entry.after || '—' }}</strong>
        </div>
      </ElCard>
    </ElTimelineItem>
  </ElTimeline>
</template>

<script setup lang="ts">
  import type { AuditEntry } from '@/types/game-provider'

  defineOptions({ name: 'AuditTimeline' })
  defineProps<{ entries: AuditEntry[] }>()

  const resultLabel = (result: AuditEntry['result']) =>
    ({ Success: '成功', Pending: '待處理', Rejected: '已退回' })[result]
</script>

<style scoped lang="scss">
  .audit-heading,
  .change-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .audit-heading {
    justify-content: space-between;
  }

  p {
    margin: 8px 0 0;
    color: var(--art-gray-600);
  }

  .change-row {
    padding: 10px 12px;
    margin-top: 12px;
    background: var(--art-gray-100);
    border-radius: 8px;

    strong {
      color: var(--theme-color);
    }
  }
</style>
