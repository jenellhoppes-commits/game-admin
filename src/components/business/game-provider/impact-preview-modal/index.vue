<template>
  <ElDialog v-model="visible" :title="title" width="min(92vw, 620px)" destroy-on-close>
    <ElAlert :title="summary" type="warning" :closable="false" show-icon class="mb-4" />
    <div class="impact-list">
      <div v-for="item in items" :key="item.label" class="impact-item">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <ElForm label-position="top" class="reason-form">
      <ElFormItem label="操作原因" required>
        <ElInput v-model="reason" type="textarea" :rows="3" placeholder="請輸入可供稽核的原因" />
      </ElFormItem>
      <ElFormItem v-if="allowSchedule" label="生效方式">
        <ElRadioGroup v-model="effectiveMode">
          <ElRadioButton value="now">立即生效</ElRadioButton>
          <ElRadioButton value="scheduled">排程生效</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem v-if="allowSchedule && effectiveMode === 'scheduled'" label="生效時間" required>
        <ElDatePicker v-model="effectiveAt" type="datetime" class="w-full" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :disabled="!canConfirm" @click="confirm">確認並送審</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ImpactPreviewModal' })

  withDefaults(
    defineProps<{
      title: string
      summary: string
      items: Array<{ label: string; value: string | number }>
      allowSchedule?: boolean
    }>(),
    { allowSchedule: true }
  )
  const emit = defineEmits<{
    confirm: [payload: { reason: string; effectiveMode: string; effectiveAt?: Date }]
  }>()
  const visible = defineModel<boolean>({ default: false })
  const reason = ref('')
  const effectiveMode = ref<'now' | 'scheduled'>('now')
  const effectiveAt = ref<Date>()
  const canConfirm = computed(
    () => reason.value.trim().length >= 4 && (effectiveMode.value === 'now' || effectiveAt.value)
  )

  const confirm = () => {
    if (!canConfirm.value) return
    emit('confirm', {
      reason: reason.value.trim(),
      effectiveMode: effectiveMode.value,
      effectiveAt: effectiveAt.value
    })
    visible.value = false
  }

  watch(visible, (open) => {
    if (!open) return
    reason.value = ''
    effectiveMode.value = 'now'
    effectiveAt.value = undefined
  })
</script>

<style scoped lang="scss">
  .impact-list {
    overflow: hidden;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .impact-item {
    display: flex;
    gap: 20px;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--art-gray-200);

    &:last-child {
      border-bottom: 0;
    }

    span {
      color: var(--art-gray-600);
    }
  }

  .reason-form {
    margin-top: 18px;
  }
</style>
