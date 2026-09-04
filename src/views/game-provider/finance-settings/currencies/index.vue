<template>
  <div class="page">
    <AppPageHeader
      title="幣別管理"
      eyebrow="平台管理 · 匯率管理"
      description="統一建立平台幣別；新增時預設可作為投注幣別，並在同一頁設定結算用途與金額精度。"
    >
      <template #actions>
        <ElButton @click="ElMessage.success('幣別設定已匯出')">匯出</ElButton>
        <ElButton type="primary" @click="openEdit()">新增幣別</ElButton>
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <div
        ><span>幣別總數</span><strong>{{ store.currencies.length }}</strong
        ><small>平台幣別主檔</small></div
      >
      <div
        ><span>投注幣別</span><strong>{{ store.transactionCurrencies.length }}</strong
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

    <ElAlert
      title="只有在此處新增並啟用的幣別，才能進入匯率設定；停用投注用途不會改寫既有注單。"
      type="info"
      :closable="false"
      show-icon
    />
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
          ><strong>平台幣別清單</strong><span>共 {{ rows.length }} 筆</span></div
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
        <ElTableColumn label="幣別類型" width="120">
          <template #default="scope">
            <ElTag :type="scope.row.currencyType === 'System' ? 'warning' : 'info'" effect="plain">
              {{ currencyTypeLabel(scope.row.currencyType) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="投注幣別" width="120" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.transactionEnabled"
              :disabled="scope.row.status !== 'Active' || scope.row.code === 'USDT'"
              @change="toggle(scope.row.code, 'transactionEnabled', $event)" /></template
        ></ElTableColumn>
        <ElTableColumn label="結算幣別" width="120" align="center"
          ><template #default="scope"
            ><ElSwitch
              :model-value="scope.row.settlementEnabled"
              :disabled="scope.row.status !== 'Active' || scope.row.code === 'USDT'"
              @change="toggle(scope.row.code, 'settlementEnabled', $event)" /></template
        ></ElTableColumn>
        <ElTableColumn label="顯示小數位" width="165"
          ><template #default="scope"
            ><ElInputNumber
              :model-value="scope.row.decimalPlaces"
              :min="0"
              :max="8"
              controls-position="right"
              @change="updatePrecision(scope.row.code, $event)" /></template
        ></ElTableColumn>
        <ElTableColumn label="最小金額單位" min-width="140"
          ><template #default="scope">{{ scope.row.minimumUnit }}</template></ElTableColumn
        >
        <ElTableColumn label="狀態" width="100"
          ><template #default="scope"
            ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
              scope.row.status === 'Active' ? '啟用' : '停用'
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn prop="updatedAt" label="更新時間" min-width="160" />
        <ElTableColumn label="操作" width="90" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openEdit(scope.row)">編輯</ElButton></template
          ></ElTableColumn
        >
      </ElTable>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="editingCode ? '編輯幣別' : '新增幣別'"
      width="min(560px, 92vw)"
    >
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
        <ElFormItem label="幣別類型">
          <ElRadioGroup v-model="form.currencyType" :disabled="editingCode === 'USDT'">
            <ElRadioButton value="Fiat">法定幣</ElRadioButton>
            <ElRadioButton value="Crypto">加密幣</ElRadioButton>
            <ElRadioButton value="System">系統幣</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <div class="form-grid"
          ><ElFormItem label="用途"
            ><div class="purpose-options"
              ><ElCheckbox v-model="form.transactionEnabled" :disabled="editingCode === 'USDT'"
                >可作為投注幣別</ElCheckbox
              ><ElCheckbox v-model="form.settlementEnabled" :disabled="editingCode === 'USDT'"
                >可作為結算幣別</ElCheckbox
              ></div
            ></ElFormItem
          ><ElFormItem label="顯示小數位"
            ><ElInputNumber v-model="form.decimalPlaces" :min="0" :max="8" class="full"
          /></ElFormItem>
        </div>
        <ElFormItem label="狀態"
          ><ElRadioGroup v-model="form.status" :disabled="editingCode === 'USDT'"
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

  defineOptions({ name: 'PlatformCurrencySettings' })
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
    currencyType: 'Fiat' as CurrencyConfigRecord['currencyType'],
    transactionEnabled: true,
    settlementEnabled: false,
    decimalPlaces: 2,
    status: 'Active' as CurrencyConfigRecord['status']
  })
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
  const currencyTypeLabel = (type: CurrencyConfigRecord['currencyType']) =>
    ({ Fiat: '法定幣', Crypto: '加密幣', System: '系統幣' })[type]
  const reset = () => {
    keyword.value = ''
    status.value = ''
  }
  const toggle = (
    code: string,
    field: 'transactionEnabled' | 'settlementEnabled',
    value: string | number | boolean
  ) => {
    const updated = store.updateCurrency(code, { [field]: Boolean(value) })
    if (updated) ElMessage.success('設定已更新')
    else ElMessage.warning('USDT 為系統基準幣別，不能停用必要用途')
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
            currencyType: row.currencyType,
            transactionEnabled: row.transactionEnabled,
            settlementEnabled: row.settlementEnabled,
            decimalPlaces: row.decimalPlaces,
            status: row.status
          }
        : {
            code: '',
            name: '',
            symbol: '',
            numericCode: '',
            currencyType: 'Fiat',
            transactionEnabled: true,
            settlementEnabled: false,
            decimalPlaces: 2,
            status: 'Active'
          }
    )
    dialogVisible.value = true
  }
  const save = () => {
    if (!form.code || !form.name) return ElMessage.warning('請填寫幣別代碼與名稱')
    if (!editingCode.value) {
      if (!store.createCurrency(form)) return ElMessage.warning('幣別代碼已存在，請確認後重試')
    } else {
      if (
        !store.updateCurrency(editingCode.value, {
          ...form,
          minimumUnit: 1 / 10 ** form.decimalPlaces
        })
      )
        return ElMessage.warning('USDT 為系統基準幣別，不能停用或變更必要設定')
    }
    dialogVisible.value = false
    ElMessage.success(
      editingCode.value ? '幣別資料已儲存' : '幣別已新增並啟用為投注幣別，可建立匯率設定'
    )
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

  .full {
    width: 100%;
  }

  .purpose-options {
    display: flex;
    flex-direction: column;
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
