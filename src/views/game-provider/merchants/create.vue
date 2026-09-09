<template>
  <div class="merchant-create">
    <AppPageHeader
      title="新增商戶"
      eyebrow="商務中心／商戶管理"
      description="建立商戶主檔、代理歸屬、初始商務條件與第一條交易線路。"
      status="Draft"
    >
      <template #actions><ElButton @click="cancelCreate">返回商戶管理</ElButton></template>
    </AppPageHeader>

    <ElAlert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />

    <ElCard class="wizard-card">
      <ElSteps :active="activeStep" finish-status="success" align-center>
        <ElStep
          v-for="step in steps"
          :key="step.title"
          :title="step.title"
          :description="step.description"
        />
      </ElSteps>

      <div class="step-content">
        <section v-if="activeStep === 0">
          <StepHeading title="基本資料" description="建立唯一的商戶識別與主要聯絡資訊。" />
          <ElForm label-position="top" class="form-grid">
            <ElFormItem label="商戶代碼" required>
              <ElInput
                v-model="form.code"
                maxlength="40"
                placeholder="例如 MER-TW-013"
                @input="normalizeCode"
                @blur="validateCode"
              />
              <div class="field-state" :class="codeState">{{ codeStateText }}</div>
            </ElFormItem>
            <ElFormItem label="商戶名稱" required>
              <ElInput v-model="form.name" maxlength="80" placeholder="輸入商戶名稱" />
            </ElFormItem>
            <ElFormItem label="品牌名稱">
              <ElInput v-model="form.brandName" maxlength="80" placeholder="對外顯示名稱" />
            </ElFormItem>
            <ElFormItem label="國家／地區" required>
              <ElSelect v-model="form.country" filterable class="w-full">
                <ElOption
                  v-for="country in countries"
                  :key="country"
                  :label="country"
                  :value="country"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="時區" required>
              <ElSelect v-model="form.timezone" filterable class="w-full">
                <ElOption
                  v-for="timezone in timezones"
                  :key="timezone"
                  :label="timezone"
                  :value="timezone"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="主要聯絡人" required>
              <ElInput v-model="form.contact" placeholder="輸入聯絡人" />
            </ElFormItem>
            <ElFormItem label="聯絡信箱" required>
              <ElInput v-model="form.email" type="email" placeholder="name@example.com" />
            </ElFormItem>
            <ElFormItem label="合作開始日" required>
              <ElDatePicker
                v-model="form.cooperationStartDate"
                type="date"
                value-format="YYYY-MM-DD"
                class="w-full"
              />
            </ElFormItem>
            <ElFormItem label="內部備註" class="full-width">
              <ElInput
                v-model="form.note"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
              />
            </ElFormItem>
          </ElForm>
        </section>

        <section v-else-if="activeStep === 1">
          <StepHeading
            title="代理與商務條件"
            description="商務條件保存於商戶層級，不在線路或幣別層級重複設定。"
          />
          <ElForm label-position="top" class="form-grid">
            <ElFormItem label="所屬代理" required>
              <ElSelect
                v-model="form.agentId"
                filterable
                class="w-full"
                placeholder="搜尋代理 ID、代碼或名稱"
                @change="syncAgentTerm"
              >
                <ElOption
                  v-for="agent in eligibleAgents"
                  :key="agent.id"
                  :label="`${agent.name}｜${agent.code}｜${agent.level}`"
                  :value="agent.id"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="代理目前條件">
              <ElInput :model-value="agentTermLabel" disabled />
            </ElFormItem>
            <ElFormItem label="結算基礎" required>
              <ElSelect v-model="form.settlementBasis" class="w-full">
                <ElOption label="GGR" value="GGR" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="商戶條件" required>
              <GameTypeRates v-model="form.gameTypeRates" />
              <div class="form-help">目前以百分比保存，不在前端寫死結算公式。</div>
            </ElFormItem>

            <ElFormItem label="結算幣別" required>
              <ElSelect v-model="form.settlementCurrency" filterable class="w-full">
                <ElOption
                  v-for="currency in settlementCurrencies"
                  :key="currency"
                  :label="currency"
                  :value="currency"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="結算週期" required>
              <ElSelect v-model="form.settlementCycle" class="w-full">
                <ElOption label="每日" value="Daily" />
                <ElOption label="每週" value="Weekly" />
                <ElOption label="每半月" value="Semimonthly" />
                <ElOption label="每月" value="Monthly" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="條件生效日期" required>
              <ElDatePicker
                v-model="form.effectiveFrom"
                type="date"
                value-format="YYYY-MM-DD"
                class="w-full"
              />
            </ElFormItem>
          </ElForm>
          <ElAlert
            v-if="selectedAgent"
            :title="`所屬代理：${selectedAgent.name}（${selectedAgent.code}）；目前生效條件為 ${agentTermLabel}。`"
            type="info"
            :closable="false"
            show-icon
          />
        </section>

        <section v-else-if="activeStep === 2">
          <StepHeading
            title="錢包與初始線路"
            description="錢包模式屬於商戶層級；每條線路固定一個交易幣別。"
          />
          <WalletModeSelector v-model="form.walletMode" />
          <ElForm label-position="top" class="form-grid line-form">
            <ElFormItem label="初始交易幣別" required>
              <ElSelect v-model="form.lineCurrency" filterable class="w-full">
                <ElOption
                  v-for="currency in transactionCurrencies"
                  :key="currency"
                  :label="currency"
                  :value="currency"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="線路 UID">
              <ElInput :model-value="lineUid" disabled />
            </ElFormItem>
            <ElFormItem label="測試環境">
              <ElSwitch v-model="form.createSandbox" active-text="建立 Sandbox 設定" />
            </ElFormItem>
          </ElForm>
          <ElAlert
            :title="`${lineUid} 將繼承 ${form.walletMode}；同幣別後續仍可建立其他線路，系統會產生不同 UID。`"
            type="info"
            :closable="false"
            show-icon
          />
        </section>

        <section v-else>
          <StepHeading
            title="確認並送審"
            description="確認資料後建立商戶、V1 商務條件與第一條線路。"
          />
          <ElDescriptions :column="descriptionColumns" border>
            <ElDescriptionsItem label="商戶">{{ form.name }}｜{{ form.code }}</ElDescriptionsItem>
            <ElDescriptionsItem label="品牌">{{ form.brandName || '—' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="所屬代理"
              >{{ selectedAgent?.name }}｜{{ selectedAgent?.code }}</ElDescriptionsItem
            >
            <ElDescriptionsItem label="商務條件">{{
              describeGameTypeRates(form)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="結算"
              >{{ form.settlementCurrency }}｜{{ cycleLabel }}</ElDescriptionsItem
            >
            <ElDescriptionsItem label="錢包模式"
              ><ElTag type="primary">{{ form.walletMode }}</ElTag></ElDescriptionsItem
            >
            <ElDescriptionsItem label="初始線路"
              >{{ lineUid }}｜{{ form.lineCurrency }}</ElDescriptionsItem
            >
            <ElDescriptionsItem label="建立狀態"
              >待審核／{{
                form.createSandbox ? '建立測試環境' : '尚未建立環境'
              }}</ElDescriptionsItem
            >
          </ElDescriptions>
          <ApprovalPanel
            class="mt-5"
            title="商戶上線流程"
            status="Pending"
            :active-step="1"
            :steps="['建立並送審', '營運審核', '串接驗收', '啟用']"
          />
        </section>
      </div>

      <div class="wizard-footer">
        <ElButton :disabled="activeStep === 0" @click="activeStep--">上一步</ElButton>
        <span>步驟 {{ activeStep + 1 }}／{{ steps.length }}</span>
        <ElButton v-if="activeStep < steps.length - 1" type="primary" @click="nextStep"
          >下一步</ElButton
        >
        <ElButton v-else type="primary" :loading="submitting" @click="submitMerchant"
          >建立商戶並前往詳細</ElButton
        >
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import GameTypeRates from '@/components/business/GameTypeRates.vue'
  import { describeGameTypeRates, validateGameTypeRates, businessDate } from '@/utils/partnerTerms'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type { SettlementBasis, SettlementCycle, WalletMode } from '@/types/game-provider'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import ApprovalPanel from '@/components/business/game-provider/approval-panel/index.vue'
  import WalletModeSelector from '@/components/business/game-provider/wallet-mode-selector/index.vue'

  defineOptions({ name: 'MerchantCreateWizard' })

  const StepHeading = defineComponent({
    props: {
      title: { type: String, required: true },
      description: { type: String, required: true }
    },
    setup: (props) => () =>
      h('div', { class: 'step-heading' }, [h('h2', props.title), h('p', props.description)])
  })
  const router = useRouter()
  const store = useBusinessPartnerStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const { width } = useWindowSize()
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const activeStep = ref(0)
  const submitting = ref(false)
  const submitError = ref('')
  const codeState = ref<'idle' | 'available' | 'duplicate'>('idle')
  const allowLeave = ref(false)
  const baseline = ref('')
  const steps = [
    { title: '基本資料', description: '商戶主檔' },
    { title: '商務條件', description: '代理與結算' },
    { title: '錢包與線路', description: '初始線路' },
    { title: '確認', description: '建立並送審' }
  ]
  const countries = [
    '台灣',
    '新加坡',
    '菲律賓',
    '泰國',
    '香港',
    '越南',
    '馬來西亞',
    '日本',
    '澳洲',
    '印度',
    '馬爾他'
  ]
  const timezones = [
    'Asia/Taipei',
    'Asia/Singapore',
    'Asia/Manila',
    'Asia/Bangkok',
    'Asia/Hong_Kong',
    'Asia/Ho_Chi_Minh',
    'Asia/Kuala_Lumpur',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Asia/Kolkata',
    'Europe/Malta'
  ]
  const settlementCurrencies = computed(() =>
    financeSettingsStore.settlementCurrencies.map((item) => item.code)
  )
  const transactionCurrencies = computed(() =>
    financeSettingsStore.transactionCurrencies.map((item) => item.code)
  )
  const form = reactive({
    code: '',
    name: '',
    brandName: '',
    country: '台灣',
    timezone: 'Asia/Taipei',
    contact: '',
    email: '',
    cooperationStartDate: '',
    note: '',
    agentId: '',
    settlementBasis: 'GGR' as SettlementBasis,
    merchantTermPercent: 0,
    gameTypeRates: [] as import('@/types/game-provider').GameTypeRate[],
    settlementCurrency: 'USDT',
    settlementCycle: 'Monthly' as SettlementCycle,
    effectiveFrom: '',
    walletMode: 'Seamless' as WalletMode,
    lineCurrency: 'USDT',
    createSandbox: true
  })

  const eligibleAgents = computed(() => store.agents.filter((agent) => agent.status === 'Active'))
  const selectedAgent = computed(() => store.findAgent(form.agentId))
  const selectedAgentTerm = computed(() => store.getCurrentTerm(form.agentId))
  const agentTermLabel = computed(() => {
    const term = selectedAgentTerm.value
    if (!term) return '尚未選擇代理'
    return `${basisText(term.settlementBasis)} ${describeGameTypeRates(term)}`
  })
  const lineUid = computed(() => store.createLineUid(form.code || 'MERCHANT', form.lineCurrency))
  const cycleLabel = computed(() => cycleText(form.settlementCycle))
  const codeStateText = computed(() =>
    codeState.value === 'available'
      ? '商戶代碼可以使用'
      : codeState.value === 'duplicate'
        ? '商戶代碼已被使用'
        : '啟用後原則上不可修改商戶代碼'
  )
  const serialize = () => JSON.stringify(form)
  const isDirty = computed(() => serialize() !== baseline.value)

  function basisText(value: SettlementBasis) {
    return { GGR: 'GGR', 'Valid Bet': '有效投注', Turnover: '營業額' }[value]
  }
  function cycleText(value: SettlementCycle) {
    return { Daily: '每日', Weekly: '每週', Semimonthly: '每半月', Monthly: '每月' }[value]
  }
  const normalizeCode = (value: string) => {
    form.code = value.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')
    codeState.value = 'idle'
  }
  const validateCode = () => {
    if (!form.code) return (codeState.value = 'idle')
    codeState.value = store.isMerchantCodeAvailable(form.code) ? 'available' : 'duplicate'
  }
  const syncAgentTerm = () => {
    const term = selectedAgentTerm.value
    if (!term) return
    form.settlementBasis = term.settlementBasis
    form.settlementCurrency = term.settlementCurrency
    form.settlementCycle = term.settlementCycle
    form.merchantTermPercent = 0
  }
  const validateStep = () => {
    validateCode()
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    const validations = [
      Boolean(
        form.code &&
          form.name &&
          form.country &&
          form.timezone &&
          form.contact &&
          emailValid &&
          form.cooperationStartDate &&
          codeState.value === 'available'
      ),
      Boolean(
        form.agentId &&
          selectedAgentTerm.value &&
          form.settlementCurrency &&
          form.settlementCycle &&
          form.effectiveFrom &&
          !validateGameTypeRates(form.gameTypeRates) &&
          form.effectiveFrom >= businessDate()
      ),
      Boolean(form.walletMode && form.lineCurrency)
    ]
    const valid = validations[activeStep.value] ?? true
    if (!valid) submitError.value = '請完成必填欄位、各遊戲類型比例及有效生效日。'
    else submitError.value = ''
    return valid
  }
  const nextStep = () => {
    if (validateStep()) activeStep.value++
  }
  const confirmDiscard = async () =>
    !isDirty.value ||
    Boolean(
      await ElMessageBox.confirm('離開後目前輸入的資料將不會保留。', '尚有未儲存內容', {
        confirmButtonText: '放棄並離開',
        cancelButtonText: '繼續編輯',
        type: 'warning'
      }).catch(() => false)
    )
  const cancelCreate = async () => {
    if (!(await confirmDiscard())) return
    allowLeave.value = true
    await router.push('/business/merchants')
  }
  const submitMerchant = async () => {
    if (
      ![0, 1, 2].every((step) => {
        const current = activeStep.value
        activeStep.value = step
        const valid = validateStep()
        activeStep.value = current
        return valid
      })
    )
      return
    submitting.value = true
    await new Promise((resolve) => setTimeout(resolve, 400))
    const merchant = store.createMerchant({ ...form })
    submitting.value = false
    if (!merchant) return (submitError.value = '商戶建立失敗，請確認代碼與代理資料後再試一次。')
    allowLeave.value = true
    baseline.value = serialize()
    ElMessage.success(`${merchant.name} 已建立並送交審核`)
    await router.push(`/business/merchants/${merchant.id}`)
  }
  onBeforeRouteLeave(async () => allowLeave.value || !isDirty.value || confirmDiscard())
  onMounted(() => (baseline.value = serialize()))
</script>

<style scoped lang="scss">
  .merchant-create {
    display: grid;
    gap: 16px;
  }

  .wizard-card :deep(.el-card__body) {
    padding: 26px;
  }

  .step-content {
    min-height: 470px;
    padding: 34px 8px 24px;
  }

  :deep(.step-heading) {
    margin-bottom: 24px;

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 20px;
    }

    p {
      margin-top: 7px;
      color: var(--art-gray-600);
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 20px;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .line-form {
    margin-top: 24px;
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

  .wizard-footer {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 18px;
    align-items: center;
    padding-top: 20px;
    border-top: 1px solid var(--art-gray-200);

    span {
      font-size: 13px;
      color: var(--art-gray-600);
    }

    > :last-child {
      justify-self: end;
    }
  }

  @media (width <= 640px) {
    .wizard-card :deep(.el-card__body) {
      padding: 18px;
    }

    .wizard-card :deep(.el-step__description) {
      display: none;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .full-width {
      grid-column: auto;
    }

    .wizard-footer {
      grid-template-columns: auto 1fr auto;
    }
  }
</style>
