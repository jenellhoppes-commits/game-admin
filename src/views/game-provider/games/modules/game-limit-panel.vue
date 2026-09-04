<template>
  <div class="plan-panel">
    <div class="panel-toolbar">
      <div>
        <h2>限紅方案</h2>
        <p>{{ modelDescription }}</p>
      </div>
      <ElSpace wrap>
        <ElButton @click="exportPlans">匯出 XLSX</ElButton>
        <ElUpload
          accept=".xlsx"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleImportFile"
        >
          <ElButton>匯入 XLSX</ElButton>
        </ElUpload>
        <ElButton type="primary" @click="openCreate">新增限紅方案</ElButton>
      </ElSpace>
    </div>

    <ElAlert :title="`目前套用模型：${modelLabel}`" type="info" :closable="false" show-icon />

    <ElTable :data="plans" border empty-text="尚未建立限紅方案">
      <ElTableColumn prop="code" label="方案代碼" min-width="190" fixed="left" />
      <ElTableColumn prop="name" label="方案名稱" min-width="160" />
      <ElTableColumn prop="currency" label="幣別" width="90" />
      <ElTableColumn prop="dimension" :label="dimensionColumnLabel" min-width="170" />
      <ElTableColumn label="投注範圍" min-width="170">
        <template #default="{ row }"
          >{{ formatAmount(row.minBet) }} ～ {{ formatAmount(row.maxBet) }}</template
        >
      </ElTableColumn>
      <ElTableColumn label="投注檔位" min-width="220">
        <template #default="{ row }">{{ row.betLevels.join('、') || '—' }}</template>
      </ElTableColumn>
      <ElTableColumn label="狀態" width="110">
        <template #default="{ row }"><GameProviderStatusTag :status="row.status" /></template>
      </ElTableColumn>
      <ElTableColumn prop="updatedAt" label="最後修改" width="150" />
      <ElTableColumn label="操作" width="155" fixed="right">
        <template #default="{ row }">
          <ElButton v-if="row.status === 'Draft'" link type="primary" @click="openEdit(row)"
            >編輯</ElButton
          >
          <ElButton
            v-if="row.status === 'Draft'"
            link
            type="success"
            @click="changeStatus(row, 'Active')"
            >啟用</ElButton
          >
          <ElButton
            v-if="row.status === 'Active'"
            link
            type="danger"
            @click="changeStatus(row, 'Disabled')"
            >停用</ElButton
          >
        </template>
      </ElTableColumn>
    </ElTable>

    <ElDialog
      v-model="dialogVisible"
      :title="editingId ? '編輯限紅草稿' : '新增限紅方案'"
      :width="dialogWidth"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
        <ElAlert :title="modelFormHint" type="info" :closable="false" class="mb-5" />
        <ElRow :gutter="14">
          <ElCol :span="12"
            ><ElFormItem label="方案代碼" prop="code"
              ><ElInput
                v-model="form.code"
                placeholder="例如 DRAGON_TWD_STD"
                @input="normalizeCode" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="方案名稱" prop="name"
              ><ElInput v-model="form.name" placeholder="例如 TWD 標準限紅" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="幣別" prop="currency"
              ><ElSelect v-model="form.currency" filterable class="w-full"
                ><ElOption
                  v-for="currency in currencies"
                  :key="currency"
                  :label="currency"
                  :value="currency" /></ElSelect></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem :label="dimensionFieldLabel" prop="dimension"
              ><ElInput v-model="form.dimension" :placeholder="dimensionPlaceholder" /></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="最低投注" prop="minBet"
              ><ElInputNumber
                v-model="form.minBet"
                :min="0"
                :precision="2"
                class="w-full" /></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="最高投注" prop="maxBet"
              ><ElInputNumber
                v-model="form.maxBet"
                :min="0"
                :precision="2"
                class="w-full" /></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="預設投注"
              ><ElInputNumber
                v-model="form.defaultBet"
                :min="0"
                :precision="2"
                class="w-full" /></ElFormItem
          ></ElCol>
        </ElRow>
        <ElFormItem label="投注檔位" prop="betLevelsText"
          ><ElInput
            v-model="form.betLevelsText"
            placeholder="使用逗號分隔，例如 10, 20, 50, 100"
          /><div class="form-help">檔位需由小到大，且落在最低與最高投注範圍內。</div></ElFormItem
        >
        <ElRow v-if="showBuyLimits" :gutter="14">
          <ElCol :span="12"
            ><ElFormItem label="Buy Feature 上限"
              ><ElInputNumber v-model="form.buyFeatureMax" :min="0" class="w-full" /></ElFormItem
          ></ElCol>
          <ElCol :span="12"
            ><ElFormItem label="Super Buy 上限"
              ><ElInputNumber v-model="form.superBuyMax" :min="0" class="w-full" /></ElFormItem
          ></ElCol>
        </ElRow>
        <ElFormItem label="備註"
          ><ElInput v-model="form.note" type="textarea" :rows="3"
        /></ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="savePlan">儲存草稿</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="importVisible"
      title="限紅 XLSX 匯入預覽"
      :width="importDialogWidth"
      destroy-on-close
    >
      <ElAlert
        :title="importHasError ? '發現驗證錯誤，修正後才能匯入' : '資料驗證完成，可匯入為草稿'"
        :type="importHasError ? 'error' : 'success'"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <p class="import-file">來源檔案：{{ importFileName }}</p>
      <ElTable :data="importRows" border>
        <ElTableColumn prop="row" label="列" width="60" />
        <ElTableColumn prop="code" label="方案代碼" min-width="180" />
        <ElTableColumn prop="currency" label="幣別" width="85" />
        <ElTableColumn prop="range" label="投注範圍" min-width="140" />
        <ElTableColumn label="驗證" min-width="180">
          <template #default="{ row }"
            ><ElTag :type="row.valid ? 'success' : 'danger'" effect="light">{{
              row.message
            }}</ElTag></template
          >
        </ElTableColumn>
      </ElTable>
      <template #footer>
        <ElButton @click="importVisible = false">取消</ElButton>
        <ElButton type="primary" :disabled="importHasError" @click="applyImport"
          >匯入 3 筆草稿</ElButton
        >
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules, UploadFile } from 'element-plus'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import { gameTypeMockData } from '@/mock/game-provider'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import type {
    GameLimitModel,
    GameLimitPlan,
    GameRecord,
    GamePlanStatus
  } from '@/types/game-provider'

  const props = defineProps<{ game: GameRecord }>()
  const store = useGameCatalogStore()
  const { width } = useWindowSize()
  const formRef = ref<FormInstance>()
  const dialogVisible = ref(false)
  const importVisible = ref(false)
  const editingId = ref('')
  const importFileName = ref('')
  const currencies = ['TWD', 'USD', 'USDT', 'CNY', 'THB', 'VND', 'JPY']
  const dialogWidth = computed(() => (width.value < 700 ? 'calc(100% - 24px)' : '700px'))
  const importDialogWidth = computed(() => (width.value < 760 ? 'calc(100% - 24px)' : '760px'))
  const plans = computed(() => store.getLimitPlans(props.game.id))
  const gameType = computed(() => gameTypeMockData.find((item) => item.id === props.game.typeId))
  const model = computed<GameLimitModel>(() => gameType.value?.limitModel || 'Generic Bet Range')
  const modelLabel = computed(
    () =>
      ({
        'Slot Bet Levels': 'Slot｜投注檔位',
        'Fishing Hall BetX': 'Fishing｜廳別 × Bet X × 幣別',
        'Arcade Level Currency': 'Arcade｜Level × 幣別矩陣',
        'Generic Bet Range': '通用｜最低／最高投注'
      })[model.value]
  )
  const modelDescription = computed(
    () =>
      ({
        'Slot Bet Levels': '依投注檔位與功能購買上限管理多幣別限紅。',
        'Fishing Hall BetX': '依廳別、Bet X 與交易幣別維護最低／最高投注。',
        'Arcade Level Currency': '依 Level 與交易幣別建立投注矩陣。',
        'Generic Bet Range': '依交易幣別維護通用投注範圍與投注檔位。'
      })[model.value]
  )
  const dimensionColumnLabel = computed(() =>
    model.value === 'Fishing Hall BetX'
      ? '廳別／Bet X'
      : model.value === 'Arcade Level Currency'
        ? 'Level'
        : '模型範圍'
  )
  const dimensionFieldLabel = dimensionColumnLabel
  const dimensionPlaceholder = computed(() =>
    model.value === 'Fishing Hall BetX'
      ? '例如 經典廳 × Bet X 1–10'
      : model.value === 'Arcade Level Currency'
        ? '例如 Level 1–5'
        : '例如 標準投注檔位'
  )
  const modelFormHint = computed(() => `${modelLabel.value}：實際金額必須按交易幣別分別維護。`)
  const showBuyLimits = computed(
    () =>
      model.value === 'Slot Bet Levels' &&
      (props.game.featureTagIds.includes('FT001') || props.game.featureTagIds.includes('FT002'))
  )

  const form = reactive({
    code: '',
    name: '',
    currency: 'TWD',
    dimension: '',
    minBet: 1,
    maxBet: 1000,
    defaultBet: 10,
    betLevelsText: '1, 5, 10, 50, 100',
    buyFeatureMax: undefined as number | undefined,
    superBuyMax: undefined as number | undefined,
    note: ''
  })
  const parsedLevels = computed(() =>
    form.betLevelsText
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value))
  )
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
    currency: [{ required: true, message: '請選擇幣別', trigger: 'change' }],
    dimension: [{ required: true, message: '請輸入模型範圍', trigger: 'blur' }],
    minBet: [{ required: true, message: '請輸入最低投注', trigger: 'change' }],
    maxBet: [
      {
        validator: (_rule, value, callback) =>
          Number(value) < Number(form.minBet)
            ? callback(new Error('最高投注不可低於最低投注'))
            : callback(),
        trigger: 'change'
      }
    ],
    betLevelsText: [
      {
        validator: (_rule, _value, callback) => {
          const levels = parsedLevels.value
          if (!levels.length) return callback(new Error('請至少輸入一個投注檔位'))
          if (levels.some((value, index) => index > 0 && value <= levels[index - 1]))
            return callback(new Error('投注檔位需由小到大且不可重複'))
          if (levels.some((value) => value < form.minBet || value > form.maxBet))
            return callback(new Error('投注檔位需在最低與最高投注範圍內'))
          callback()
        },
        trigger: 'blur'
      }
    ]
  }
  const importRows = ref([
    { row: 2, code: '', currency: 'TWD', range: '10 ～ 10,000', valid: true, message: '通過' },
    { row: 3, code: '', currency: 'USD', range: '1 ～ 1,000', valid: true, message: '通過' },
    { row: 4, code: '', currency: 'USDT', range: '1 ～ 2,000', valid: true, message: '通過' }
  ])
  const importHasError = computed(() => importRows.value.some((row) => !row.valid))

  const normalizeCode = (value: string) => {
    form.code = value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  }
  const resetForm = () =>
    Object.assign(form, {
      code: '',
      name: '',
      currency: 'TWD',
      dimension: dimensionPlaceholder.value.replace('例如 ', ''),
      minBet: 10,
      maxBet: 10000,
      defaultBet: 50,
      betLevelsText: '10, 20, 50, 100, 500, 1000',
      buyFeatureMax: undefined,
      superBuyMax: undefined,
      note: ''
    })
  const openCreate = () => {
    editingId.value = ''
    resetForm()
    dialogVisible.value = true
  }
  const openEdit = (plan: GameLimitPlan) => {
    editingId.value = plan.id
    Object.assign(form, {
      ...JSON.parse(JSON.stringify(plan)),
      betLevelsText: plan.betLevels.join(', ')
    })
    dialogVisible.value = true
  }
  const savePlan = async () => {
    if (!(await formRef.value?.validate().catch(() => false))) return
    const payload = {
      code: form.code,
      name: form.name,
      currency: form.currency,
      model: model.value,
      dimension: form.dimension,
      minBet: form.minBet,
      maxBet: form.maxBet,
      defaultBet: form.defaultBet,
      betLevels: parsedLevels.value,
      buyFeatureMax: form.buyFeatureMax,
      superBuyMax: form.superBuyMax,
      note: form.note
    }
    if (editingId.value) store.updateLimitPlan(editingId.value, payload, '編輯限紅草稿')
    else store.createLimitPlan({ gameId: props.game.id, ...payload, status: 'Draft' })
    dialogVisible.value = false
    ElMessage.success('限紅方案草稿已儲存')
  }
  const changeStatus = async (plan: GameLimitPlan, status: GamePlanStatus) => {
    const confirmed = await ElMessageBox.confirm(
      `確定要${status === 'Active' ? '啟用' : '停用'} ${plan.name}？`,
      '限紅方案狀態確認',
      { confirmButtonText: '確認', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false)
    if (!confirmed) return
    store.updateLimitPlan(plan.id, { status }, `${status === 'Active' ? '啟用' : '停用'}限紅方案`)
    ElMessage.success('限紅方案狀態已更新')
  }
  const handleImportFile = (file: UploadFile) => {
    importFileName.value = file.name
    const suffix = Date.now().toString().slice(-4)
    importRows.value = ['TWD', 'USD', 'USDT'].map((currency, index) => ({
      row: index + 2,
      code: `${props.game.code}_${currency}_IMP_${suffix}`,
      currency,
      range: index === 0 ? '10 ～ 10,000' : '1 ～ 1,000',
      valid: true,
      message: '通過'
    }))
    importVisible.value = true
  }
  const applyImport = () => {
    importRows.value.forEach((row, index) =>
      store.createLimitPlan({
        gameId: props.game.id,
        code: row.code,
        name: `${row.currency} 匯入限紅`,
        currency: row.currency,
        model: model.value,
        dimension: dimensionPlaceholder.value.replace('例如 ', ''),
        minBet: index === 0 ? 10 : 1,
        maxBet: index === 0 ? 10000 : 1000,
        defaultBet: index === 0 ? 50 : 5,
        betLevels: index === 0 ? [10, 20, 50, 100, 500, 1000] : [1, 5, 10, 50, 100],
        status: 'Draft',
        note: `由 ${importFileName.value} 匯入`
      })
    )
    importVisible.value = false
    ElMessage.success('已匯入 3 筆限紅草稿')
  }
  const exportPlans = () => ElMessage.success(`已產生 ${props.game.code} 限紅方案匯出檔`)
  const formatAmount = (value: number) => new Intl.NumberFormat('zh-TW').format(value)
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
  .form-help {
    margin-top: 5px;
    font-size: 12px;
    color: var(--art-gray-500);
  }
  .import-file {
    color: var(--art-gray-600);
  }
  @media (width <= 720px) {
    .panel-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
