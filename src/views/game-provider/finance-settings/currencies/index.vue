<template>
  <div class="page">
    <AppPageHeader
      :title="copy.title"
      eyebrow="財務設定 · 幣別管理"
      :description="copy.description"
    >
      <template #actions>
        <ElButton @click="ElMessage.success('幣別設定已匯出')">匯出</ElButton>
        <ElButton v-if="mode === 'data'" type="primary" @click="openEdit()">新增幣別</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <div
        ><span>幣別總數</span><strong>{{ store.currencies.length }}</strong
        ><small>平台幣別主檔</small></div
      >
      <div
        ><span>交易幣別</span><strong>{{ store.transactionCurrencies.length }}</strong
        ><small>可建立商戶線路</small></div
      >
      <div
        ><span>結算幣別</span><strong>{{ store.settlementCurrencies.length }}</strong
        ><small>可建立結算批次</small></div
      >
      <div
        ><span>停用幣別</span><strong>{{ inactiveCount }}</strong
        ><small>不可供新資料使用</small></div
      >
    </div>

    <ElAlert v-if="mode !== 'data'" :title="copy.rule" type="info" :closable="false" show-icon />
    <ElCard shadow="never" class="filter-card">
      <ElForm inline>
        <ElFormItem label="關鍵字"
          ><ElInput v-model="keyword" clearable placeholder="幣別代碼或名稱"
        /></ElFormItem>
        <ElFormItem label="狀態"
          ><ElSelect v-model="status" clearable placeholder="全部狀態"
            ><ElOption label="啟用" value="Active" /><ElOption
              label="停用"
              value="Inactive" /></ElSelect
        ></ElFormItem>
        <ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem>
        <ElFormItem><ElButton @click="reset">重置</ElButton></ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="table-card">
      <div class="toolbar"
        ><div
          ><strong>{{ copy.tableTitle }}</strong
          ><span>共 {{ rows.length }} 筆</span></div
        ><span>更新會同步影響後續可選項目</span></div
      >
      <ElTable :data="rows" border row-key="code">
        <ElTableColumn label="幣別" min-width="180" fixed="left"
          ><template #default="scope"
            ><div class="currency"
              ><b>{{ scope.row.symbol }}</b
              ><span
                ><strong>{{ scope.row.code }}</strong
                ><small>{{ scope.row.name }}</small></span
              ></div
            ></template
          ></ElTableColumn
        >
        <ElTableColumn prop="numericCode" label="ISO 數字碼" width="120" />
        <ElTableColumn v-if="mode === 'data'" label="交易／結算" min-width="180"
          ><template #default="scope"
            ><ElTag :type="scope.row.transactionEnabled ? 'success' : 'info'" effect="plain"
              >交易</ElTag
            ><ElTag :type="scope.row.settlementEnabled ? 'success' : 'info'" effect="plain"
              >結算</ElTag
            ></template
          ></ElTableColumn
        >
        <ElTableColumn v-if="mode === 'transaction'" label="交易幣別" width="150" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.transactionEnabled"
              :disabled="scope.row.status !== 'Active'"
              @change="toggle(scope.row.code, 'transactionEnabled', $event)" /></template
        ></ElTableColumn>
        <ElTableColumn v-if="mode === 'settlement'" label="結算幣別" width="150" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.settlementEnabled"
              :disabled="scope.row.status !== 'Active'"
              @change="toggle(scope.row.code, 'settlementEnabled', $event)" /></template
        ></ElTableColumn>
        <ElTableColumn v-if="mode === 'precision'" label="小數位數" width="180"
          ><template #default="scope"
            ><ElInputNumber
              :model-value="scope.row.decimalPlaces"
              :min="0"
              :max="8"
              controls-position="right"
              @change="updatePrecision(scope.row.code, $event)" /></template
        ></ElTableColumn>
        <ElTableColumn v-if="mode === 'precision'" label="最小金額單位" min-width="160"
          ><template #default="scope">{{ scope.row.minimumUnit }}</template></ElTableColumn
        >
        <ElTableColumn v-if="mode !== 'precision'" label="小數位數" width="110" align="center"
          ><template #default="scope">{{ scope.row.decimalPlaces }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" width="100"
          ><template #default="scope"
            ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
              scope.row.status === 'Active' ? '啟用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn prop="updatedAt" label="更新時間" min-width="160" />
        <ElTableColumn v-if="mode === 'data'" label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openEdit(scope.row)">編輯</ElButton></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>

    <ElDialog v-model="dialogVisible" title="編輯幣別" width="min(520px, 92vw)">
      <ElForm label-position="top">
        <div class="form-grid"
          ><ElFormItem label="幣別代碼"
            ><ElInput v-model="form.code" :disabled="Boolean(editingCode)" /></ElFormItem
          ><ElFormItem label="幣別名稱"><ElInput v-model="form.name" /></ElFormItem
        ></div>
        <div class="form-grid"
          ><ElFormItem label="符號"><ElInput v-model="form.symbol" /></ElFormItem
          ><ElFormItem label="ISO 數字碼"><ElInput v-model="form.numericCode" /></ElFormItem
        ></div>
        <ElFormItem label="狀態"
          ><ElRadioGroup v-model="form.status"
            ><ElRadioButton value="Active">啟用</ElRadioButton
            ><ElRadioButton value="Inactive">停用</ElRadioButton></ElRadioGroup
          ></ElFormItem
        >
      </ElForm>
      <template #footer
        ><ElButton @click="dialogVisible = false">取消</ElButton
        ><ElButton type="primary" @click="save">儲存</ElButton></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type { CurrencyConfigRecord } from '@/types/game-provider'

  defineOptions({ name: 'FinanceCurrencySettings' })
  const route = useRoute()
  const store = useFinanceSettingsStore()
  const keyword = ref('')
  const status = ref('')
  const dialogVisible = ref(false)
  const editingCode = ref('')
  const form = reactive({
    code: '',
    name: '',
    symbol: '',
    numericCode: '',
    status: 'Active' as CurrencyConfigRecord['status']
  })
  const mode = computed(
    () =>
      ({
        TransactionCurrencies: 'transaction',
        SettlementCurrencies: 'settlement',
        CurrencyPrecision: 'precision'
      })[String(route.name)] || 'data'
  )
  const copies = {
    data: {
      title: '幣別資料',
      tableTitle: '幣別主檔',
      description: '統一管理平台使用的幣別基本資料、顯示名稱與啟用狀態。',
      rule: ''
    },
    transaction: {
      title: '交易幣別',
      tableTitle: '交易幣別設定',
      description: '控制商戶線路、會員錢包與遊戲交易可使用的幣別。',
      rule: '停用後僅限制建立新的商戶線路；既有交易與歷史資料不受影響。'
    },
    settlement: {
      title: '結算幣別',
      tableTitle: '結算幣別設定',
      description: '控制商務條件與結算批次可選用的結算幣別。',
      rule: '已有未完成結算批次的幣別，正式環境停用前必須先完成或作廢相關批次。'
    },
    precision: {
      title: '精度設定',
      tableTitle: '幣別精度',
      description: '設定各幣別的顯示小數位與最小金額單位。',
      rule: '精度異動只套用新計算；歷史結算保留當時的精度快照。'
    }
  }
  const copy = computed(() => copies[mode.value as keyof typeof copies])
  const rows = computed(() =>
    store.currencies.filter(
      (item) =>
        (!status.value || item.status === status.value) &&
        (!keyword.value ||
          `${item.code}${item.name}`.toLowerCase().includes(keyword.value.toLowerCase()))
    )
  )
  const inactiveCount = computed(
    () => store.currencies.filter((item) => item.status === 'Inactive').length
  )
  const reset = () => {
    keyword.value = ''
    status.value = ''
  }
  const toggle = (
    code: string,
    field: 'transactionEnabled' | 'settlementEnabled',
    value: string | number | boolean
  ) => {
    store.updateCurrency(code, { [field]: Boolean(value) })
    ElMessage.success('設定已更新')
  }
  const updatePrecision = (code: string, value: number | undefined) => {
    if (value === undefined) return
    store.updateCurrency(code, { decimalPlaces: value, minimumUnit: 1 / 10 ** value })
    ElMessage.success('精度已更新')
  }
  const openEdit = (row?: CurrencyConfigRecord) => {
    editingCode.value = row?.code || ''
    Object.assign(
      form,
      row
        ? {
            code: row.code,
            name: row.name,
            symbol: row.symbol,
            numericCode: row.numericCode,
            status: row.status
          }
        : { code: '', name: '', symbol: '', numericCode: '', status: 'Active' }
    )
    dialogVisible.value = true
  }
  const save = () => {
    if (!form.code || !form.name) return ElMessage.warning('請填寫幣別代碼與名稱')
    if (!editingCode.value) return ElMessage.info('演示版僅開放編輯既有幣別')
    store.updateCurrency(editingCode.value, form)
    dialogVisible.value = false
    ElMessage.success('幣別資料已儲存')
  }
</script>

<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    > div {
      padding: 18px 20px;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    span,
    small {
      display: block;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 8px 0 4px;
      font-size: 26px;
    }
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    color: var(--art-gray-600);

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
      color: var(--art-text-gray-900);
    }
  }

  .currency {
    display: flex;
    gap: 12px;
    align-items: center;

    > b {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-radius: 8px;
    }

    span,
    small {
      display: block;
    }

    small {
      color: var(--art-gray-600);
    }
  }

  .el-tag + .el-tag {
    margin-left: 6px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  @media (width <= 900px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 600px) {
    .summary-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;
      gap: 4px;
      align-items: flex-start;
    }
  }
</style>
