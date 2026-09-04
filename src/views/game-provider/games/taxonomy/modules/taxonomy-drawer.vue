<template>
  <ElDrawer v-model="visible" :title="drawerTitle" :size="drawerSize" destroy-on-close>
    <ElAlert
      v-if="record?.gameCount"
      :title="`目前有 ${record.gameCount} 款遊戲使用此${config.itemLabel}，修改後會影響後續遊戲設定與查詢。`"
      type="warning"
      :closable="false"
      show-icon
      class="mb-5"
    />

    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElRow :gutter="16">
        <ElCol v-if="kind !== 'marketing'" :xs="24" :sm="12">
          <ElFormItem :label="config.codeLabel" prop="code">
            <ElInput
              v-model="form.code"
              :placeholder="config.codePlaceholder"
              :disabled="Boolean(record?.gameCount)"
              maxlength="40"
              show-word-limit
              @input="form.code = form.code.toUpperCase().replace(/[^A-Z0-9_]/g, '')"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :sm="kind === 'marketing' ? 24 : 12">
          <ElFormItem :label="config.nameLabel" prop="name">
            <ElInput v-model="form.name" :placeholder="config.namePlaceholder" maxlength="40" />
          </ElFormItem>
        </ElCol>

        <ElCol v-if="kind === 'type'" :span="24">
          <ElFormItem label="限紅模型" prop="limitModel">
            <ElSelect v-model="form.limitModel" class="w-full" placeholder="選擇限紅編輯模型">
              <ElOption
                v-for="option in limitModelOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElAlert
            title="遊戲類型會決定遊戲詳細頁所使用的限紅編輯介面。"
            type="info"
            :closable="false"
            show-icon
            class="field-hint"
          />
        </ElCol>

        <template v-if="kind === 'feature'">
          <ElCol :span="24">
            <ElFormItem label="是否影響設定">
              <ElSwitch
                v-model="form.affectsSettings"
                inline-prompt
                active-text="是"
                inactive-text="否"
              />
            </ElFormItem>
          </ElCol>
          <ElCol v-if="form.affectsSettings" :span="24">
            <ElFormItem label="關聯設定" prop="relatedSetting">
              <ElInput
                v-model="form.relatedSetting"
                placeholder="例如 Buy Feature 投注上限"
                maxlength="80"
              />
            </ElFormItem>
          </ElCol>
        </template>

        <ElCol v-if="kind === 'marketing'" :span="24">
          <ElFormItem label="顯示文字" prop="displayText">
            <ElInput
              v-model="form.displayText"
              placeholder="例如 NEW、熱門、節慶限定"
              maxlength="20"
              show-word-limit
            />
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :sm="12">
          <ElFormItem label="排序" prop="sort">
            <ElInputNumber v-model="form.sort" :min="1" :max="999" class="w-full" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="狀態" prop="status">
            <ElSelect v-model="form.status" class="w-full">
              <ElOption label="啟用" value="Active" />
              <ElOption label="已停用" value="Disabled" />
            </ElSelect>
          </ElFormItem>
        </ElCol>

        <ElCol :span="24">
          <ElFormItem label="備註">
            <ElInput
              v-model="form.note"
              type="textarea"
              :rows="4"
              :placeholder="`輸入${config.itemLabel}的內部說明`"
              maxlength="200"
              show-word-limit
            />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>

    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="submit">
        {{ record ? '儲存修改' : `新增${config.itemLabel}` }}
      </ElButton>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    GameLimitModel,
    GameTaxonomyKind,
    GameTaxonomyRecord,
    GameTaxonomyStatus
  } from '@/types/game-provider'

  defineOptions({ name: 'GameTaxonomyDrawer' })

  const props = defineProps<{
    kind: GameTaxonomyKind
    record?: GameTaxonomyRecord
    existingRecords: GameTaxonomyRecord[]
  }>()
  const emit = defineEmits<{ saved: [record: GameTaxonomyRecord] }>()
  const visible = defineModel<boolean>('visible', { default: false })
  const { width } = useWindowSize()
  const drawerSize = computed(() => (width.value < 640 ? '100%' : '560px'))
  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const configs = {
    type: {
      itemLabel: '遊戲類型',
      codeLabel: '類型代碼',
      codePlaceholder: '例如 SLOT',
      nameLabel: '類型名稱',
      namePlaceholder: '例如 電子遊戲'
    },
    feature: {
      itemLabel: '功能標籤',
      codeLabel: '標籤代碼',
      codePlaceholder: '例如 BUY_FEATURE',
      nameLabel: '標籤名稱',
      namePlaceholder: '例如 購買特色'
    },
    marketing: {
      itemLabel: '行銷標籤',
      codeLabel: '',
      codePlaceholder: '',
      nameLabel: '標籤名稱',
      namePlaceholder: '例如 新遊戲'
    }
  } as const
  const config = computed(() => configs[props.kind])
  const drawerTitle = computed(() =>
    props.record ? `編輯${config.value.itemLabel}` : `新增${config.value.itemLabel}`
  )

  const limitModelOptions: Array<{ label: string; value: GameLimitModel }> = [
    { label: 'Slot｜投注檔位', value: 'Slot Bet Levels' },
    { label: 'Fishing｜廳別 × Bet X', value: 'Fishing Hall BetX' },
    { label: 'Arcade｜Level × 幣別', value: 'Arcade Level Currency' },
    { label: '其他｜通用投注範圍', value: 'Generic Bet Range' }
  ]

  const createInitialForm = () => ({
    code: '',
    name: '',
    displayText: '',
    limitModel: undefined as GameLimitModel | undefined,
    affectsSettings: false,
    relatedSetting: '',
    sort: 10,
    status: 'Active' as GameTaxonomyStatus,
    note: ''
  })
  const form = reactive(createInitialForm())

  const rules = computed<FormRules>(() => ({
    code:
      props.kind === 'marketing'
        ? []
        : [{ required: true, message: `請輸入${config.value.codeLabel}`, trigger: 'blur' }],
    name: [{ required: true, message: `請輸入${config.value.nameLabel}`, trigger: 'blur' }],
    limitModel:
      props.kind === 'type'
        ? [{ required: true, message: '請選擇限紅模型', trigger: 'change' }]
        : [],
    relatedSetting:
      props.kind === 'feature' && form.affectsSettings
        ? [{ required: true, message: '請輸入關聯設定', trigger: 'blur' }]
        : [],
    displayText:
      props.kind === 'marketing'
        ? [{ required: true, message: '請輸入顯示文字', trigger: 'blur' }]
        : [],
    sort: [{ required: true, message: '請輸入排序', trigger: 'change' }],
    status: [{ required: true, message: '請選擇狀態', trigger: 'change' }]
  }))

  watch(
    () => form.affectsSettings,
    (affectsSettings) => {
      if (!affectsSettings) form.relatedSetting = ''
    }
  )

  watch(visible, (isVisible) => {
    if (!isVisible) return
    Object.assign(form, createInitialForm())
    if (props.record) {
      Object.assign(form, {
        code: props.record.code || '',
        name: props.record.name,
        displayText: props.record.displayText || '',
        limitModel: props.record.limitModel,
        affectsSettings: props.record.affectsSettings || false,
        relatedSetting: props.record.relatedSetting || '',
        sort: props.record.sort,
        status: props.record.status,
        note: props.record.note || ''
      })
    }
    nextTick(() => formRef.value?.clearValidate())
  })

  const nextId = () => {
    const prefix = props.kind === 'type' ? 'GT' : props.kind === 'feature' ? 'FT' : 'MT'
    const maxId = props.existingRecords.reduce((max, item) => {
      const value = Number(item.id.replace(/\D/g, ''))
      return Number.isNaN(value) ? max : Math.max(max, value)
    }, 0)
    return `${prefix}${String(maxId + 1).padStart(3, '0')}`
  }

  const formatNow = () => {
    const now = new Date()
    const part = (value: number) => String(value).padStart(2, '0')
    return `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())} ${part(now.getHours())}:${part(now.getMinutes())}`
  }

  const submit = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return

    const normalizedCode = form.code.trim().toUpperCase()
    if (
      props.kind !== 'marketing' &&
      props.existingRecords.some(
        (item) => item.id !== props.record?.id && item.code?.toUpperCase() === normalizedCode
      )
    ) {
      ElMessage.error(`${config.value.codeLabel}已存在，請使用其他代碼`)
      return
    }

    submitting.value = true
    await new Promise((resolve) => setTimeout(resolve, 350))
    emit('saved', {
      id: props.record?.id || nextId(),
      kind: props.kind,
      code: props.kind === 'marketing' ? undefined : normalizedCode,
      name: form.name.trim(),
      displayText: props.kind === 'marketing' ? form.displayText.trim() : undefined,
      limitModel: props.kind === 'type' ? form.limitModel : undefined,
      affectsSettings: props.kind === 'feature' ? form.affectsSettings : undefined,
      relatedSetting:
        props.kind === 'feature' && form.affectsSettings ? form.relatedSetting.trim() : undefined,
      gameCount: props.record?.gameCount || 0,
      sort: form.sort,
      status: form.status,
      note: form.note.trim(),
      updatedAt: formatNow()
    })
    submitting.value = false
    visible.value = false
    ElMessage.success(
      props.record ? `${config.value.itemLabel}已更新` : `${config.value.itemLabel}已新增`
    )
  }
</script>

<style scoped lang="scss">
  .field-hint {
    margin-top: -6px;
    margin-bottom: 18px;
  }
</style>
