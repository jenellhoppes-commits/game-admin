<template>
  <ElTag :type="statusConfig.type" effect="light" round>
    {{ statusConfig.label }}
  </ElTag>
</template>

<script setup lang="ts">
  import type { BusinessStatus, CredentialStatus } from '@/types/game-provider'

  defineOptions({ name: 'GameProviderStatusTag' })

  const props = defineProps<{ status: BusinessStatus | CredentialStatus }>()

  const statusMap = {
    Active: { type: 'success', label: '啟用' },
    Inactive: { type: 'info', label: '未啟用' },
    Maintenance: { type: 'warning', label: '維護中' },
    Pending: { type: 'warning', label: '待處理' },
    Suspended: { type: 'warning', label: '已暫停' },
    Disabled: { type: 'danger', label: '已停用' },
    Draft: { type: 'info', label: '草稿' },
    Configuring: { type: 'warning', label: '設定中' },
    'Sandbox Enabled': { type: 'primary', label: 'Sandbox 已啟用' },
    Testing: { type: 'primary', label: '測試中' },
    'Not Started': { type: 'info', label: '尚未測試' },
    Passed: { type: 'success', label: '已通過' },
    Failed: { type: 'danger', label: '未通過' },
    'Production Pending': { type: 'warning', label: '正式環境待審' },
    Closed: { type: 'info', label: '已關閉' },
    Terminated: { type: 'danger', label: '已終止' },
    Published: { type: 'success', label: '已發布' },
    Risk: { type: 'danger', label: '風險' },
    'Not Issued': { type: 'info', label: '尚未核發' },
    Rotating: { type: 'warning', label: '輪替中' },
    Revoked: { type: 'danger', label: '已撤銷' },
    Expired: { type: 'danger', label: '已過期' }
  } as const

  const statusConfig = computed(() => statusMap[props.status])
</script>
