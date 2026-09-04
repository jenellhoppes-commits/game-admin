<template>
  <ElDialog v-model="visible" title="批次設定遊戲標籤" :width="dialogWidth" destroy-on-close>
    <ElAlert
      :title="`已選取 ${gameCount} 款遊戲。標籤修改只影響遊戲分類與展示，不會改變既有注單資料。`"
      type="info"
      :closable="false"
      show-icon
      class="mb-5"
    />

    <ElForm label-position="top">
      <ElFormItem label="套用方式">
        <ElRadioGroup v-model="mode">
          <ElRadio value="append">新增至現有標籤</ElRadio>
          <ElRadio value="replace">取代現有標籤</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem label="功能標籤">
        <ElSelect
          v-model="featureTagIds"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          class="w-full"
          placeholder="選擇要套用的功能標籤"
        >
          <ElOption
            v-for="option in featureOptions"
            :key="option.id"
            :label="option.name"
            :value="option.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="行銷標籤">
        <ElSelect
          v-model="marketingTagIds"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          class="w-full"
          placeholder="選擇要套用的行銷標籤"
        >
          <ElOption
            v-for="option in marketingOptions"
            :key="option.id"
            :label="option.name"
            :value="option.id"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton
        type="primary"
        :disabled="!featureTagIds.length && !marketingTagIds.length"
        @click="submit"
      >
        套用至 {{ gameCount }} 款遊戲
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useWindowSize } from '@vueuse/core'
  import type { GameTaxonomyRecord } from '@/types/game-provider'

  defineOptions({ name: 'GameBatchTagDialog' })

  defineProps<{
    gameCount: number
    featureOptions: GameTaxonomyRecord[]
    marketingOptions: GameTaxonomyRecord[]
  }>()
  const emit = defineEmits<{
    apply: [
      payload: { mode: 'append' | 'replace'; featureTagIds: string[]; marketingTagIds: string[] }
    ]
  }>()
  const visible = defineModel<boolean>('visible', { default: false })
  const { width } = useWindowSize()
  const dialogWidth = computed(() => (width.value < 640 ? 'calc(100% - 24px)' : '560px'))
  const mode = ref<'append' | 'replace'>('append')
  const featureTagIds = ref<string[]>([])
  const marketingTagIds = ref<string[]>([])

  watch(visible, (isVisible) => {
    if (!isVisible) return
    mode.value = 'append'
    featureTagIds.value = []
    marketingTagIds.value = []
  })

  const submit = () => {
    emit('apply', {
      mode: mode.value,
      featureTagIds: featureTagIds.value,
      marketingTagIds: marketingTagIds.value
    })
    visible.value = false
  }
</script>
