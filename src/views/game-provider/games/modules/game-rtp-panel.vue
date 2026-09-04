<template>
  <div class="plan-panel">
    <div class="panel-toolbar">
      <div>
        <h2>固定 RTP 方案</h2>
        <p>RTP 採固定方案管理；啟用中的核心值不可直接修改，變更時請建立新版本。</p>
      </div>
      <ElButton type="primary" @click="openCreate">新增 RTP 方案</ElButton>
    </div>

    <ElAlert
      title="每款遊戲同一時間只能有一個預設方案；商戶只能引用已啟用的固定方案。"
      type="info"
      :closable="false"
      show-icon
    />

    <ElTable :data="plans" border empty-text="尚未建立 RTP 方案">
      <ElTableColumn prop="code" label="方案代碼" min-width="190" fixed="left" />
      <ElTableColumn prop="name" label="方案名稱" min-width="150" />
      <ElTableColumn label="RTP 值" width="105" align="right">
        <template #default="{ row }"
          ><strong>{{ row.rtpValue }}%</strong></template
        >
      </ElTableColumn>
      <ElTableColumn prop="configKey" label="設定識別" min-width="220" />
      <ElTableColumn label="版本" width="80" align="center">
        <template #default="{ row }">V{{ row.version }}</template>
      </ElTableColumn>
      <ElTableColumn label="預設" width="90" align="center">
        <template #default="{ row }">
          <ElTag v-if="row.isDefault" type="success" effect="light">預設</ElTag>
          <span v-else>—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="狀態" width="110">
        <template #default="{ row }"><GameProviderStatusTag :status="row.status" /></template>
      </ElTableColumn>
      <ElTableColumn prop="updatedAt" label="最後修改" width="150" />
      <ElTableColumn label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <ElSpace :size="8">
            <ElButton v-if="row.status === 'Draft'" link type="primary" @click="openEdit(row)"
              >編輯</ElButton
            >
            <ElButton
              v-if="!row.isDefault && row.status === 'Active'"
              link
              type="primary"
              @click="setDefault(row)"
              >設為預設</ElButton
            >
            <ElDropdown trigger="click" @command="(command: string) => handleCommand(command, row)">
              <ElButton link>更多</ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem v-if="row.status === 'Draft'" command="activate"
                    >啟用</ElDropdownItem
                  >
                  <ElDropdownItem command="version">建立新版本</ElDropdownItem>
                  <ElDropdownItem v-if="row.status === 'Active'" command="disable" divided
                    >停用</ElDropdownItem
                  >
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </ElSpace>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDialog
      v-model="dialogVisible"
      :title="editingId ? '編輯 RTP 草稿' : '新增 RTP 方案'"
      :width="dialogWidth"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
        <ElRow :gutter="14">
          <ElCol :span="12">
            <ElFormItem label="方案代碼" prop="code">
              <ElInput
                v-model="form.code"
                placeholder="例如 DRAGON_RTP_01"
                @input="normalizeCode"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="方案名稱" prop="name"
              ><ElInput v-model="form.name" placeholder="例如 RTP 96.5%"
            /></ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="RTP 值" prop="rtpValue">
              <ElInputNumber
                v-model="form.rtpValue"
                :min="1"
                :max="100"
                :precision="2"
                :step="0.1"
                class="w-full"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="設定識別" prop="configKey"
              ><ElInput v-model="form.configKey" placeholder="遊戲端實際設定識別"
            /></ElFormItem>
          </ElCol>
        </ElRow>
        <ElFormItem label="是否預設">
          <ElSwitch v-model="form.isDefault" active-text="設為預設方案" />
        </ElFormItem>
        <ElFormItem label="備註"
          ><ElInput v-model="form.note" type="textarea" :rows="3" placeholder="內部說明"
        /></ElFormItem>
        <ElAlert
          title="新方案將先儲存為草稿，確認遊戲端設定後再啟用。"
          type="warning"
          :closable="false"
          show-icon
        />
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="savePlan">儲存草稿</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import type { GameRecord, GameRtpPlan } from '@/types/game-provider'

  const props = defineProps<{ game: GameRecord }>()
  const store = useGameCatalogStore()
  const { width } = useWindowSize()
  const dialogVisible = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()
  const dialogWidth = computed(() => (width.value < 640 ? 'calc(100% - 24px)' : '620px'))
  const plans = computed(() => store.getRtpPlans(props.game.id))
  const form = reactive({
    code: '',
    name: '',
    rtpValue: 96.5,
    configKey: '',
    isDefault: false,
    note: ''
  })
  const rules: FormRules = {
    code: [
      { required: true, message: '請輸入方案代碼', trigger: 'blur' },
      { pattern: /^[A-Z0-9_]{3,60}$/, message: '限英文大寫、數字與底線', trigger: 'blur' },
      {
        validator: (_rule, value, callback) =>
          plans.value.some((item) => item.code === value && item.id !== editingId.value)
            ? callback(new Error('方案代碼已存在'))
            : callback(),
        trigger: 'blur'
      }
    ],
    name: [{ required: true, message: '請輸入方案名稱', trigger: 'blur' }],
    rtpValue: [{ required: true, message: '請輸入 RTP 值', trigger: 'change' }],
    configKey: [{ required: true, message: '請輸入設定識別', trigger: 'blur' }]
  }

  const normalizeCode = (value: string) => {
    form.code = value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  }
  const resetForm = () =>
    Object.assign(form, {
      code: '',
      name: '',
      rtpValue: 96.5,
      configKey: '',
      isDefault: plans.value.length === 0,
      note: ''
    })
  const openCreate = () => {
    editingId.value = ''
    resetForm()
    dialogVisible.value = true
  }
  const openEdit = (plan: GameRtpPlan) => {
    editingId.value = plan.id
    Object.assign(form, JSON.parse(JSON.stringify(plan)))
    dialogVisible.value = true
  }

  const savePlan = async () => {
    if (!(await formRef.value?.validate().catch(() => false))) return
    if (editingId.value) {
      store.updateRtpPlan(editingId.value, { ...form }, '編輯 RTP 草稿')
    } else {
      store.createRtpPlan({ gameId: props.game.id, ...form, status: 'Draft' })
    }
    dialogVisible.value = false
    ElMessage.success('RTP 方案草稿已儲存')
  }

  const setDefault = async (plan: GameRtpPlan) => {
    const confirmed = await ElMessageBox.confirm(
      `確定將 ${plan.name} 設為唯一預設方案嗎？`,
      '變更預設 RTP',
      { confirmButtonText: '確認', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    store.updateRtpPlan(plan.id, { isDefault: true }, '設為預設 RTP 方案')
    ElMessage.success('預設 RTP 已更新')
  }

  const handleCommand = async (command: string, plan: GameRtpPlan) => {
    if (command === 'version') {
      store.cloneRtpPlan(plan.id)
      ElMessage.success('已建立新版本草稿')
      return
    }
    const targetStatus = command === 'activate' ? 'Active' : 'Disabled'
    const confirmed = await ElMessageBox.confirm(
      `確定要${command === 'activate' ? '啟用' : '停用'} ${plan.name}？`,
      '方案狀態確認',
      { confirmButtonText: '確認', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    store.updateRtpPlan(
      plan.id,
      { status: targetStatus },
      `${command === 'activate' ? '啟用' : '停用'} RTP 方案`
    )
    ElMessage.success('RTP 方案狀態已更新')
  }
</script>

<style scoped lang="scss">
  .plan-panel {
    display: grid;
    gap: 16px;
  }
  .panel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .panel-toolbar h2 {
    margin: 0;
    font-size: 17px;
  }
  .panel-toolbar p {
    margin: 5px 0 0;
    color: var(--art-gray-500);
  }
  @media (width <= 640px) {
    .panel-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
