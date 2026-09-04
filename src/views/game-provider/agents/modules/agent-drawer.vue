<template>
  <ElDrawer v-model="visible" :title="drawerTitle" :size="drawerSize" destroy-on-close>
    <ElAlert
      title="目前為前端 Mock 流程，送出後僅更新本次瀏覽資料。"
      type="info"
      :closable="false"
      show-icon
      class="mb-5"
    />
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElRow :gutter="16">
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="Agent Code" prop="code">
            <ElInput v-model="form.code" placeholder="例如 AG-TW-016" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="代理名稱" prop="name">
            <ElInput v-model="form.name" placeholder="輸入代理名稱" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="代理層級" prop="level">
            <ElSelect v-model="form.level" class="w-full" :disabled="Boolean(presetParent)">
              <ElOption label="L1｜總代理" value="L1" />
              <ElOption label="L2｜區域代理" value="L2" />
              <ElOption label="L3｜地方代理" value="L3" />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="上級代理" prop="parentAgent">
            <ElSelect
              v-model="form.parentAgent"
              class="w-full"
              clearable
              :disabled="form.level === 'L1' || Boolean(presetParent)"
              :placeholder="form.level === 'L1' ? 'L1 無上級代理' : `請選擇 ${requiredParentLevel}`"
            >
              <ElOption
                v-for="agent in parentOptions"
                :key="agent.id"
                :label="agent.name"
                :value="agent.name"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="24">
          <ElAlert :title="hierarchyHint" type="warning" :closable="false" show-icon class="mb-4" />
        </ElCol>
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="結算幣別" prop="currency">
            <ElSelect v-model="form.currency" class="w-full">
              <ElOption
                v-for="currency in currencies"
                :key="currency"
                :label="currency"
                :value="currency"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :sm="12">
          <ElFormItem label="狀態" prop="status">
            <ElSelect v-model="form.status" class="w-full">
              <ElOption label="啟用" value="Active" />
              <ElOption label="待處理" value="Pending" />
              <ElOption label="草稿" value="Draft" />
              <ElOption label="停用" value="Disabled" />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :span="24">
          <ElFormItem label="主要聯絡人" prop="contact">
            <ElInput v-model="form.contact" placeholder="輸入聯絡人姓名" />
          </ElFormItem>
        </ElCol>
        <ElCol :span="24">
          <ElFormItem label="備註">
            <ElInput
              v-model="form.note"
              type="textarea"
              :rows="4"
              placeholder="輸入代理合作範圍或營運備註"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>

    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="submit">建立代理</ElButton>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { AgentRecord, AgentStatus } from '@/types/game-provider'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'

  defineOptions({ name: 'AgentCreateDrawer' })

  const props = defineProps<{ parentOptions: AgentRecord[]; presetParent?: AgentRecord }>()
  const emit = defineEmits<{ created: [agent: AgentRecord] }>()
  const visible = defineModel<boolean>('visible', { default: false })
  const { width } = useWindowSize()
  const drawerSize = computed(() => (width.value < 640 ? '100%' : '520px'))
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const financeSettingsStore = useFinanceSettingsStore()
  const currencies = computed(() =>
    financeSettingsStore.settlementCurrencies.map((item) => item.code)
  )

  const createInitialForm = () => ({
    code: '',
    name: '',
    level: 'L1' as AgentRecord['level'],
    parentAgent: '',
    currency: 'USDT',
    status: 'Pending' as AgentStatus,
    contact: '',
    note: ''
  })
  const form = reactive(createInitialForm())
  const requiredParentLevel = computed(() => (form.level === 'L3' ? 'L2 上級代理' : 'L1 上級代理'))
  const parentOptions = computed(() => {
    if (form.level === 'L1') return []
    const level = form.level === 'L2' ? 'L1' : 'L2'
    return props.parentOptions.filter((agent) => agent.level === level)
  })
  const hierarchyHint = computed(() => {
    if (form.level === 'L1') return 'L1 可建立 L2 與商戶，且不綁定上級代理。'
    if (form.level === 'L2') return 'L2 必須隸屬 L1，可建立 L3 與商戶。'
    return 'L3 必須隸屬 L2，只可建立商戶，不可再建立下級代理。'
  })
  const drawerTitle = computed(() =>
    props.presetParent ? `建立 ${props.presetParent.name} 的下級代理` : '新增代理'
  )
  const rules = computed<FormRules>(() => ({
    code: [{ required: true, message: '請輸入 Agent Code', trigger: 'blur' }],
    name: [{ required: true, message: '請輸入代理名稱', trigger: 'blur' }],
    level: [{ required: true, message: '請選擇代理層級', trigger: 'change' }],
    parentAgent:
      form.level === 'L1'
        ? []
        : [{ required: true, message: `請選擇 ${requiredParentLevel.value}`, trigger: 'change' }],
    currency: [{ required: true, message: '請選擇結算幣別', trigger: 'change' }],
    contact: [{ required: true, message: '請輸入主要聯絡人', trigger: 'blur' }]
  }))

  watch(
    () => form.level,
    (level) => {
      if (!props.presetParent) form.parentAgent = level === 'L1' ? '' : form.parentAgent
    }
  )

  watch(visible, (isVisible) => {
    if (!isVisible) return
    Object.assign(form, createInitialForm())
    if (props.presetParent) {
      form.level = props.presetParent.level === 'L1' ? 'L2' : 'L3'
      form.parentAgent = props.presetParent.name
    }
  })

  const submit = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    submitting.value = true
    await new Promise((resolve) => setTimeout(resolve, 500))
    const id = `A${String(props.parentOptions.length + 1).padStart(5, '0')}`
    emit('created', {
      id,
      code: form.code,
      name: form.name,
      level: form.level,
      parentAgent: form.parentAgent || '—',
      childAgentCount: 0,
      merchantCount: 0,
      currency: form.currency,
      contact: form.contact,
      status: form.status,
      createdAt: '2026-08-31 16:30'
    })
    submitting.value = false
    visible.value = false
    Object.assign(form, createInitialForm())
    ElMessage.success('代理已建立於 Mock 資料中')
  }
</script>
