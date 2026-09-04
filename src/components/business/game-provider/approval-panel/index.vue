<template>
  <ElCard shadow="never" class="approval-panel">
    <div class="approval-heading">
      <div>
        <p>審核流程</p>
        <h3>{{ title }}</h3>
      </div>
      <ElTag :type="status === 'Pending' ? 'warning' : status === 'Approved' ? 'success' : 'info'">
        {{ statusLabel }}
      </ElTag>
    </div>
    <ElSteps :active="activeStep" finish-status="success" simple>
      <ElStep v-for="step in steps" :key="step" :title="step" />
    </ElSteps>
    <p class="approval-note">提出者與核准者必須分離；所有結果均保留於不可變更的操作紀錄。</p>
  </ElCard>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ApprovalPanel' })
  const props = defineProps<{
    title: string
    status: 'Draft' | 'Pending' | 'Approved' | 'Rejected'
    activeStep: number
    steps: string[]
  }>()

  const statusLabel = computed(
    () =>
      ({ Draft: '草稿', Pending: '待審核', Approved: '已核准', Rejected: '已退回' })[props.status]
  )
</script>

<style scoped lang="scss">
  .approval-heading {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 18px;

    p,
    h3 {
      margin: 0;
    }

    p {
      margin-bottom: 4px;
      font-size: 11px;
      color: var(--theme-color);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  }

  .approval-note {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--art-gray-600);
  }
</style>
