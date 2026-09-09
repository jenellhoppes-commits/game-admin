<template>
  <div class="agent-create-page">
    <AppPageHeader
      :title="createdAgentId ? '代理主檔已建立' : '新增代理'"
      eyebrow="商務中心／代理管理"
      description="建立代理主檔、上下級關係與第一版商務條件。"
      status="Draft"
    >
      <template #status
        ><p v-if="createdAgentId">Agent ID：{{ createdAgentId }}</p></template
      >
      <template #actions><ElButton @click="cancelCreate">返回代理管理</ElButton></template>
    </AppPageHeader>

    <ElAlert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />

    <div class="create-layout">
      <main>
        <ElForm
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          :validate-on-rule-change="false"
        >
          <ElCard class="form-section">
            <div class="section-heading"
              ><div><h2>基本資料</h2><p>建立代理識別與主要聯絡資訊。</p></div
              ><ElTag type="danger" effect="plain">必填</ElTag></div
            >
            <ElRow :gutter="16">
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="代理代碼" prop="code"
                  ><ElInput
                    v-model="form.code"
                    :disabled="Boolean(createdAgentId)"
                    maxlength="40"
                    placeholder="例如 AG-TW-016"
                    @input="normalizeCode"
                    @blur="validateCodeState"
                  /><div class="field-state" :class="codeState">{{
                    codeStateText
                  }}</div></ElFormItem
                ></ElCol
              >
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="代理名稱" prop="name"
                  ><ElInput
                    v-model="form.name"
                    maxlength="80"
                    placeholder="輸入代理名稱" /></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="聯絡人" prop="contact"
                  ><ElInput v-model="form.contact" placeholder="輸入主要聯絡人" /></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="聯絡方式" prop="contactMethod"
                  ><ElInput
                    v-model="form.contactMethod"
                    placeholder="Email、電話或即時通訊帳號" /></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="合作開始日" prop="cooperationStartDate"
                  ><ElDatePicker
                    v-model="form.cooperationStartDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="w-full" /></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="建立後狀態"><ElInput model-value="草稿" disabled /></ElFormItem
              ></ElCol>
              <ElCol :span="24"
                ><ElFormItem label="備註"
                  ><ElInput
                    v-model="form.note"
                    type="textarea"
                    :rows="3"
                    maxlength="500"
                    show-word-limit /></ElFormItem
              ></ElCol>
            </ElRow>
          </ElCard>

          <ElCard class="form-section">
            <div class="section-heading"
              ><div><h2>代理層級</h2><p>最多三級，L2 必須隸屬 L1，L3 必須隸屬 L2。</p></div
              ><ElTag type="warning" effect="plain">關係規則</ElTag></div
            >
            <ElRow :gutter="16">
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="代理層級" prop="level"
                  ><ElSelect
                    v-model="form.level"
                    class="w-full"
                    :disabled="Boolean(presetParent)"
                    @change="handleLevelChange"
                    ><ElOption label="L1｜總代理" value="L1" /><ElOption
                      label="L2｜區域代理"
                      value="L2" /><ElOption
                      label="L3｜地方代理"
                      value="L3" /></ElSelect></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="上級代理" prop="parentAgentId"
                  ><ElSelect
                    v-model="form.parentAgentId"
                    class="w-full"
                    filterable
                    clearable
                    :disabled="form.level === 'L1' || Boolean(presetParent)"
                    :placeholder="parentPlaceholder"
                    ><ElOption
                      v-for="agent in eligibleParents"
                      :key="agent.id"
                      :label="`${agent.name}｜${agent.code}`"
                      :value="agent.id" /></ElSelect></ElFormItem
              ></ElCol>
            </ElRow>
            <ElAlert :title="hierarchyHint" type="info" :closable="false" show-icon />
            <div class="hierarchy-preview">
              <strong>關係預覽</strong>
              <div v-if="selectedParent" class="path-node parent"
                ><span>{{ selectedParent.level }}</span
                >{{ selectedParent.name }}<small>{{ selectedParent.code }}</small></div
              >
              <div v-if="selectedParent" class="path-line"></div>
              <div class="path-node current"
                ><span>{{ form.level }}</span
                >{{ form.name || '目前新增代理'
                }}<small>{{ form.code || '尚未輸入代碼' }}</small></div
              >
            </div>
          </ElCard>

          <ElCard class="form-section">
            <div class="section-heading"
              ><div><h2>初始商務條件</h2><p>只保存結算基礎與條件值，不在此寫死結算公式。</p></div
              ><ElTag type="warning" effect="plain">版本 V1</ElTag></div
            >
            <ElRow :gutter="16">
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="結算基礎" prop="settlementBasis"
                  ><ElSelect v-model="form.settlementBasis" class="w-full"
                    ><ElOption label="GGR" value="GGR" /></ElSelect></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="代理條件" prop="ratePercent"
                  ><GameTypeRates
                    v-model="form.gameTypeRates"
                    :cost-rates="
                      form.parentAgentId
                        ? costRatesAt(
                            store.getTerms(form.parentAgentId),
                            form.effectiveFrom || businessDate()
                          )
                        : undefined
                    "
                  /><div class="form-help"
                    >條件值以百分比保存，實際基礎依左側選項。</div
                  ></ElFormItem
                ></ElCol
              >
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="結算方式" required
                  ><ElSelect v-model="form.settlementMode" placeholder="請選擇"
                    ><ElOption label="清零" value="清零" /><ElOption
                      label="累積"
                      value="累積" /></ElSelect
                ></ElFormItem>
                <ElFormItem label="結算幣別" prop="settlementCurrency"
                  ><ElSelect v-model="form.settlementCurrency" class="w-full" filterable
                    ><ElOption
                      v-for="currency in currencies"
                      :key="currency"
                      :label="currency"
                      :value="currency" /></ElSelect></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="結算週期" prop="settlementCycle"
                  ><ElSelect v-model="form.settlementCycle" class="w-full"
                    ><ElOption label="每日" value="Daily" /><ElOption
                      label="每週"
                      value="Weekly" /><ElOption label="每半月" value="Semimonthly" /><ElOption
                      label="每月"
                      value="Monthly" /></ElSelect></ElFormItem
              ></ElCol>
              <ElCol :xs="24" :sm="12"
                ><ElFormItem label="生效日期" prop="effectiveFrom"
                  ><ElDatePicker
                    v-model="form.effectiveFrom"
                    type="date"
                    value-format="YYYY-MM-DD"
                    class="w-full" /></ElFormItem
              ></ElCol>
            </ElRow>
          </ElCard>
        </ElForm>
      </main>

      <aside
        ><ElCard class="summary-card"
          ><div class="summary-heading"
            ><strong>建立摘要</strong><ElTag type="info" effect="light">草稿</ElTag></div
          ><div class="completion"
            ><span>必填完成度</span
            ><strong>{{ completedCount }} / {{ requiredItems.length }}</strong></div
          ><ElProgress :percentage="completionPercentage" :show-text="false" /><dl
            ><div
              ><dt>Agent ID</dt><dd>{{ createdAgentId || '儲存後產生' }}</dd></div
            ><div
              ><dt>代理層級</dt><dd>{{ form.level }}</dd></div
            ><div
              ><dt>上級代理</dt><dd>{{ selectedParent?.name || '無' }}</dd></div
            ><div
              ><dt>代理條件</dt><dd>{{ describeGameTypeRates(form) }}</dd></div
            ><div
              ><dt>結算設定</dt><dd>{{ form.settlementCurrency }}／{{ cycleLabel }}</dd></div
            ><div
              ><dt>生效日期</dt><dd>{{ form.effectiveFrom || '未設定' }}</dd></div
            ></dl
          ><div v-if="missingItems.length" class="missing"
            ><strong>尚待完成</strong
            ><span v-for="item in missingItems" :key="item.label"
              ><ArtSvgIcon icon="ri:checkbox-blank-circle-line" />{{ item.label }}</span
            ></div
          ><ElAlert
            v-else
            title="必填資料已完成，可以建立代理草稿。"
            type="success"
            :closable="false"
            show-icon /></ElCard
      ></aside>
    </div>

    <div class="sticky-actions"
      ><span>建立後不會立即啟用，可在代理詳細頁檢查後啟用。</span
      ><ElSpace
        ><ElButton @click="cancelCreate">取消</ElButton
        ><ElButton :loading="submitting" @click="saveAgent('stay')">儲存草稿</ElButton
        ><ElButton type="primary" :loading="submitting" @click="saveAgent('detail')"
          >儲存並前往詳細</ElButton
        ></ElSpace
      ></div
    >
  </div>
</template>

<script setup lang="ts">
  import GameTypeRates from '@/components/business/GameTypeRates.vue'
  import {
    describeGameTypeRates,
    validateGameTypeRates,
    businessDate,
    costRatesAt
  } from '@/utils/partnerTerms'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type { AgentLevel, SettlementBasis, SettlementCycle } from '@/types/game-provider'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  const route = useRoute()
  const router = useRouter()
  const store = useBusinessPartnerStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const submitError = ref('')
  const codeState = ref<'idle' | 'available' | 'duplicate'>('idle')
  const createdAgentId = ref('')
  const allowLeave = ref(false)
  const baseline = ref('')
  const currencies = computed(() =>
    financeSettingsStore.settlementCurrencies.map((item) => item.code)
  )
  const presetParent = computed(() => store.findAgent(String(route.query.parentId || '')))
  const form = reactive({
    code: '',
    name: '',
    contact: '',
    contactMethod: '',
    cooperationStartDate: '',
    note: '',
    level: 'L1' as AgentLevel,
    parentAgentId: '',
    settlementBasis: 'GGR' as SettlementBasis,
    ratePercent: 0,
    settlementMode: '',
    gameTypeRates: [] as import('@/types/game-provider').GameTypeRate[],
    settlementCurrency: 'USDT',
    settlementCycle: 'Monthly' as SettlementCycle,
    effectiveFrom: ''
  })
  const requiredItems = computed(() => [
    { label: '代理代碼', completed: Boolean(form.code) },
    { label: '代理名稱', completed: Boolean(form.name) },
    { label: '聯絡人', completed: Boolean(form.contact) },
    { label: '聯絡方式', completed: Boolean(form.contactMethod) },
    { label: '合作開始日', completed: Boolean(form.cooperationStartDate) },
    { label: '代理層級', completed: Boolean(form.level) },
    { label: '上級代理', completed: form.level === 'L1' || Boolean(form.parentAgentId) },
    { label: '代理條件', completed: !validateGameTypeRates(form.gameTypeRates) },
    { label: '生效日期', completed: Boolean(form.effectiveFrom) }
  ])
  const completedCount = computed(() => requiredItems.value.filter((item) => item.completed).length)
  const missingItems = computed(() => requiredItems.value.filter((item) => !item.completed))
  const completionPercentage = computed(() =>
    Math.round((completedCount.value / requiredItems.value.length) * 100)
  )
  const selectedParent = computed(() => store.findAgent(form.parentAgentId))
  const eligibleParents = computed(() =>
    store.agents.filter(
      (agent) => agent.level === (form.level === 'L2' ? 'L1' : 'L2') && agent.status !== 'Disabled'
    )
  )
  const parentPlaceholder = computed(() =>
    form.level === 'L1' ? 'L1 無上級代理' : `請選擇 ${form.level === 'L2' ? 'L1' : 'L2'} 上級代理`
  )
  const hierarchyHint = computed(() =>
    form.level === 'L1'
      ? 'L1 無上級代理，可建立 L2 與商戶。'
      : form.level === 'L2'
        ? 'L2 必須隸屬 L1，可建立 L3 與商戶。'
        : 'L3 必須隸屬 L2，只可建立商戶，不可再建立下級代理。'
  )
  const cycleLabel = computed(
    () =>
      ({ Daily: '每日', Weekly: '每週', Semimonthly: '每半月', Monthly: '每月' })[
        form.settlementCycle
      ]
  )
  const codeStateText = computed(() =>
    codeState.value === 'available'
      ? '代理代碼可以使用'
      : codeState.value === 'duplicate'
        ? '代理代碼已被使用'
        : '正式啟用後，代理代碼原則上不可修改'
  )
  const rules = computed<FormRules>(() => ({
    code: [
      { required: true, message: '請輸入代理代碼', trigger: 'blur' },
      { pattern: /^[A-Z0-9_-]{3,40}$/, message: '限英文大寫、數字、底線或連字號', trigger: 'blur' },
      {
        validator: (_rule, value, callback) =>
          store.isCodeAvailable(String(value), createdAgentId.value || undefined)
            ? callback()
            : callback(new Error('代理代碼已被使用')),
        trigger: 'blur'
      }
    ],
    name: [{ required: true, message: '請輸入代理名稱', trigger: 'blur' }],
    contact: [{ required: true, message: '請輸入聯絡人', trigger: 'blur' }],
    contactMethod: [{ required: true, message: '請輸入聯絡方式', trigger: 'blur' }],
    cooperationStartDate: [{ required: true, message: '請選擇合作開始日', trigger: 'change' }],
    level: [{ required: true, message: '請選擇代理層級', trigger: 'change' }],
    parentAgentId:
      form.level === 'L1'
        ? []
        : [{ required: true, message: '請選擇符合層級的上級代理', trigger: 'change' }],
    settlementBasis: [{ required: true, message: '請選擇結算基礎', trigger: 'change' }],
    ratePercent: [{ required: true, message: '請輸入代理條件', trigger: 'change' }],
    settlementCurrency: [{ required: true, message: '請選擇結算幣別', trigger: 'change' }],
    settlementCycle: [{ required: true, message: '請選擇結算週期', trigger: 'change' }],
    effectiveFrom: [{ required: true, message: '請選擇生效日期', trigger: 'change' }]
  }))
  const serialize = () => JSON.stringify(form)
  const isDirty = computed(() => serialize() !== baseline.value)
  const normalizeCode = (value: string) => {
    form.code = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')
    codeState.value = 'idle'
  }
  const validateCodeState = () => {
    if (!form.code) return (codeState.value = 'idle')
    codeState.value = store.isCodeAvailable(form.code, createdAgentId.value || undefined)
      ? 'available'
      : 'duplicate'
  }
  const handleLevelChange = () => {
    if (!presetParent.value) form.parentAgentId = ''
    formRef.value?.clearValidate('parentAgentId')
  }

  const saveAgent = async (destination: 'stay' | 'detail') => {
    submitError.value = ''
    const error = store.validateCommercialInput(form, form.parentAgentId)
    if (error || form.effectiveFrom < businessDate()) {
      submitError.value = error || '生效日不可早於本日'
      return
    }
    validateCodeState()
    if (!(await formRef.value?.validate().catch(() => false)) || codeState.value === 'duplicate') {
      submitError.value = '尚有必填資料或欄位格式不正確，請完成後再儲存。'
      return
    }
    submitting.value = true
    await new Promise((resolve) => setTimeout(resolve, 350))
    const agent = createdAgentId.value
      ? store.findAgent(createdAgentId.value)
      : store.createAgent({ ...form, parentAgentId: form.parentAgentId || undefined })
    if (agent && createdAgentId.value) {
      const parent = form.parentAgentId ? store.findAgent(form.parentAgentId) : undefined
      store.updateAgent(
        agent.id,
        {
          name: form.name,
          level: form.level,
          parentAgentId: parent?.id,
          parentAgent: parent?.name || '—',
          currency: form.settlementCurrency,
          contact: form.contact,
          contactMethod: form.contactMethod,
          cooperationStartDate: form.cooperationStartDate,
          note: form.note
        },
        '更新新建代理草稿'
      )
      store.updateDraftCommercialTerm(agent.id, {
        settlementBasis: form.settlementBasis,
        ratePercent: 0,
        settlementMode: form.settlementMode,
        gameTypeRates: JSON.parse(JSON.stringify(form.gameTypeRates)),
        settlementCurrency: form.settlementCurrency,
        settlementCycle: form.settlementCycle,
        effectiveFrom: form.effectiveFrom
      })
    }
    submitting.value = false
    if (!agent) return (submitError.value = '代理儲存失敗，請稍後重試。')
    createdAgentId.value = agent.id
    await nextTick()
    baseline.value = serialize()
    ElMessage.success(`${agent.name} 已儲存為草稿`)
    if (destination === 'detail') {
      allowLeave.value = true
      await router.push(`/business/agents/${agent.id}`)
    }
  }
  const confirmDiscard = async () =>
    !isDirty.value ||
    Boolean(
      await ElMessageBox.confirm('離開後目前輸入的資料將遺失。', '尚有未儲存內容', {
        confirmButtonText: '放棄並離開',
        cancelButtonText: '繼續編輯',
        type: 'warning'
      }).catch(() => false)
    )
  const cancelCreate = async () => {
    if (!(await confirmDiscard())) return
    allowLeave.value = true
    await router.push('/business/agents')
  }
  onBeforeRouteLeave(async () => allowLeave.value || !isDirty.value || confirmDiscard())
  onMounted(() => {
    if (presetParent.value) {
      form.level = presetParent.value.level === 'L1' ? 'L2' : 'L3'
      form.parentAgentId = presetParent.value.id
    }
    baseline.value = serialize()
  })
</script>

<style scoped lang="scss">
  .agent-create-page {
    display: grid;
    gap: 16px;
    padding-bottom: 76px;
  }

  .create-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 16px;
    align-items: start;
  }

  main,
  .form-section :deep(.el-card__body),
  .summary-card :deep(.el-card__body),
  .missing {
    display: grid;
    gap: 18px;
  }

  aside {
    position: sticky;
    top: 16px;
  }

  .section-heading,
  .summary-heading,
  .completion,
  dl > div {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
  }

  .section-heading h2 {
    margin: 0;
    font-size: 17px;
  }

  .section-heading p {
    margin: 5px 0 0;
    color: var(--art-gray-500);
  }

  .field-state,
  .form-help {
    margin-top: 5px;
    font-size: 12px;
    color: var(--art-gray-500);
  }

  .field-state.available {
    color: var(--el-color-success);
  }

  .field-state.duplicate {
    color: var(--el-color-danger);
  }

  .hierarchy-preview {
    padding: 16px;
    margin-top: 16px;
    background: var(--art-gray-50);
    border-radius: 10px;
  }

  .path-node {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 11px;
    margin-top: 12px;
    background: var(--art-bg-color);
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .path-node span {
    display: grid;
    place-items: center;
    height: 28px;
    color: var(--theme-color);
    background: var(--art-gray-100);
    border-radius: 6px;
  }

  .path-node small {
    color: var(--art-gray-500);
  }

  .path-line {
    width: 2px;
    height: 18px;
    margin-left: 28px;
    background: var(--art-gray-300);
  }

  dl {
    display: grid;
    gap: 12px;
    margin: 0;
  }

  dt {
    color: var(--art-gray-500);
  }

  dd {
    margin: 0;
    font-weight: 500;
    text-align: right;
  }

  .missing {
    padding: 12px;
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .missing span {
    display: flex;
    gap: 7px;
    color: var(--art-gray-600);
  }

  .sticky-actions {
    position: sticky;
    bottom: 14px;
    z-index: 20;
    display: flex;
    gap: 20px;
    align-items: center;
    justify-content: space-between;
    padding: 13px 18px;
    color: var(--art-gray-600);
    background: color-mix(in srgb, var(--art-bg-color) 92%, transparent);
    backdrop-filter: blur(12px);
    border: 1px solid var(--art-gray-200);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgb(0 0 0 / 8%);
  }

  @media (width <= 980px) {
    .create-layout {
      grid-template-columns: 1fr;
    }

    aside {
      position: static;
      grid-row: 1;
    }
  }

  @media (width <= 640px) {
    .sticky-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .sticky-actions > span {
      display: none;
    }

    .sticky-actions .el-space {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .sticky-actions .el-button:first-child {
      display: none;
    }
  }
</style>
