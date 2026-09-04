<template>
  <div class="page">
    <AppPageHeader
      :title="copy.title"
      eyebrow="財務設定 · 結算設定"
      :description="copy.description"
    >
      <template #actions
        ><ElButton @click="resetForm">還原</ElButton
        ><ElButton type="primary" @click="save">儲存設定</ElButton></template
      >
    </AppPageHeader>

    <ElAlert :title="copy.rule" type="warning" :closable="false" show-icon />
    <div class="content-grid">
      <ElCard shadow="never" class="setting-card">
        <template #header
          ><div class="card-title"
            ><div
              ><strong>{{ copy.formTitle }}</strong
              ><span>{{ copy.formHint }}</span></div
            ><ElTag type="success">目前啟用</ElTag></div
          ></template
        >
        <ElForm label-position="top">
          <template v-if="mode === 'currency'">
            <ElFormItem label="平台預設結算幣別" required
              ><ElSelect v-model="form.defaultCurrency" class="full"
                ><ElOption
                  v-for="item in store.settlementCurrencies"
                  :key="item.code"
                  :label="`${item.code}｜${item.name}`"
                  :value="item.code" /></ElSelect
            ></ElFormItem>
            <ElAlert
              title="商戶或代理若有獨立商務條件，仍以個別設定為優先；未設定者才使用平台預設值。"
              type="info"
              :closable="false"
            />
          </template>

          <template v-else-if="mode === 'cycle'">
            <ElFormItem label="預設結算週期" required
              ><ElRadioGroup v-model="form.cycle"
                ><ElRadioButton value="Daily">每日</ElRadioButton
                ><ElRadioButton value="Weekly">每週</ElRadioButton
                ><ElRadioButton value="Semimonthly">半月</ElRadioButton
                ><ElRadioButton value="Monthly">每月</ElRadioButton></ElRadioGroup
              ></ElFormItem
            >
            <ElDescriptions :column="1" border
              ><ElDescriptionsItem label="每日">每日結束後建立對帳期</ElDescriptionsItem
              ><ElDescriptionsItem label="每週">每週一結算前一週</ElDescriptionsItem
              ><ElDescriptionsItem label="半月">每月 1–15 日、16–月底</ElDescriptionsItem
              ><ElDescriptionsItem label="每月"
                >次月建立前一完整月份</ElDescriptionsItem
              ></ElDescriptions
            >
          </template>

          <template v-else-if="mode === 'rate'">
            <ElFormItem label="匯率取值時間" required
              ><ElSelect v-model="form.rateTiming" class="full"
                ><ElOption label="結算期間最後一日" value="Period End" /><ElOption
                  label="實際結算日"
                  value="Settlement Day" /><ElOption
                  label="期間每日平均"
                  value="Daily Average" /><ElOption
                  label="人工鎖定快照"
                  value="Manual Snapshot" /></ElSelect
            ></ElFormItem>
            <ElFormItem label="優先匯率來源" required
              ><ElSelect v-model="form.rateSourceId" class="full"
                ><ElOption
                  v-for="item in activeSources"
                  :key="item.id"
                  :label="`${item.priority}. ${item.name}`"
                  :value="item.id" /></ElSelect
            ></ElFormItem>
            <ElAlert
              title="建立結算批次時會鎖定實際使用的日期、來源與匯率；日後匯率異動不回寫歷史批次。"
              type="info"
              :closable="false"
            />
          </template>

          <template v-else-if="mode === 'precision'">
            <ElFormItem label="結算金額小數位數" required
              ><ElInputNumber
                v-model="form.amountPrecision"
                :min="0"
                :max="8"
                controls-position="right"
            /></ElFormItem>
            <ElDescriptions :column="1" border
              ><ElDescriptionsItem label="原始金額">12,345.678901</ElDescriptionsItem
              ><ElDescriptionsItem label="依目前精度">{{ previewAmount }}</ElDescriptionsItem
              ><ElDescriptionsItem label="適用範圍"
                >結算單、調整項目與最終應付金額</ElDescriptionsItem
              ></ElDescriptions
            >
          </template>

          <template v-else>
            <ElFormItem label="捨入方式" required
              ><ElRadioGroup v-model="form.roundingRule" class="rounding-options"
                ><ElRadio value="四捨五入">四捨五入</ElRadio
                ><ElRadio value="無條件捨去">無條件捨去</ElRadio
                ><ElRadio value="無條件進位">無條件進位</ElRadio
                ><ElRadio value="銀行家捨入">銀行家捨入</ElRadio></ElRadioGroup
              ></ElFormItem
            >
            <ElDescriptions :column="1" border
              ><ElDescriptionsItem label="測試值">12,345.675</ElDescriptionsItem
              ><ElDescriptionsItem label="計算結果">{{ previewAmount }}</ElDescriptionsItem
              ><ElDescriptionsItem label="規則說明">{{
                roundingDescription
              }}</ElDescriptionsItem></ElDescriptions
            >
          </template>

          <ElDivider />
          <ElFormItem label="生效日期" required
            ><ElDatePicker v-model="form.effectiveFrom" value-format="YYYY-MM-DD" class="full"
          /></ElFormItem>
        </ElForm>
      </ElCard>

      <div class="side-column">
        <ElCard shadow="never"
          ><template #header><strong>目前規則摘要</strong></template
          ><dl class="summary-list"
            ><div
              ><dt>預設結算幣別</dt><dd>{{ store.settlementRule.defaultCurrency }}</dd></div
            ><div
              ><dt>結算週期</dt><dd>{{ cycleLabel(store.settlementRule.cycle) }}</dd></div
            ><div
              ><dt>匯率取值</dt><dd>{{ timingLabel(store.settlementRule.rateTiming) }}</dd></div
            ><div
              ><dt>金額精度</dt><dd>{{ store.settlementRule.amountPrecision }} 位小數</dd></div
            ><div
              ><dt>捨入方式</dt><dd>{{ store.settlementRule.roundingRule }}</dd></div
            ><div
              ><dt>最近更新</dt><dd>{{ store.settlementRule.updatedAt }}</dd></div
            ></dl
          ></ElCard
        >
        <ElCard shadow="never"
          ><template #header><strong>套用優先序</strong></template
          ><ol class="priority-list"
            ><li
              ><b>1</b
              ><span><strong>個別商務條件</strong><small>商戶／代理專屬設定</small></span></li
            ><li
              ><b>2</b
              ><span><strong>平台結算設定</strong><small>本頁管理的預設規則</small></span></li
            ><li
              ><b>3</b
              ><span><strong>歷史計算快照</strong><small>已產生資料永不回寫</small></span></li
            ></ol
          ></ElCard
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { applyFinancePrecision, useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type { SettlementCycle, SettlementRuleConfig } from '@/types/game-provider'

  defineOptions({ name: 'FinanceSettlementSettings' })
  const route = useRoute()
  const store = useFinanceSettingsStore()
  const nameModes = {
    SettlementCycles: 'cycle',
    SettlementRateRules: 'rate',
    SettlementPrecision: 'precision',
    SettlementRounding: 'rounding'
  }
  const mode = computed(() => nameModes[String(route.name) as keyof typeof nameModes] || 'currency')
  const copies = {
    currency: {
      title: '預設結算幣別',
      description: '設定未指定商務條件時，平台建立結算資料所使用的預設幣別。',
      rule: '停用中的結算幣別不會出現在選項；既有結算仍保留原始幣別快照。',
      formTitle: '預設幣別',
      formHint: '適用於未指定幣別的新商務關係'
    },
    cycle: {
      title: '結算週期',
      description: '設定平台預設的對帳與結算期間。',
      rule: '週期異動自生效日後的新期間開始套用，不拆分或重建已開始的結算期間。',
      formTitle: '預設週期',
      formHint: '個別商戶與代理可由商務條件覆寫'
    },
    rate: {
      title: '匯率取值規則',
      description: '定義跨幣別結算採用的匯率日期、來源與快照方式。',
      rule: '結算批次一旦建立即鎖定匯率快照，避免後續匯率變動造成帳務差異。',
      formTitle: '匯率取值',
      formHint: '決定新結算批次的換算依據'
    },
    precision: {
      title: '金額精度',
      description: '設定結算計算與最終應付金額的小數位數。',
      rule: '先完成基礎計算與換匯，最後一步才依此精度處理金額。',
      formTitle: '結算精度',
      formHint: '獨立於各交易幣別的顯示精度'
    },
    rounding: {
      title: '捨入規則',
      description: '設定結算金額超過指定精度時的統一處理方式。',
      rule: '捨入規則會寫入每筆對帳與結算快照，歷史資料不因規則改動而重新計算。',
      formTitle: '捨入方式',
      formHint: '套用於最終結算金額'
    }
  }
  const copy = computed(() => copies[mode.value as keyof typeof copies])
  const form = reactive<SettlementRuleConfig>({ ...store.settlementRule })
  const activeSources = computed(() =>
    [...store.sources]
      .filter((item) => item.status === 'Active')
      .sort((a, b) => a.priority - b.priority)
  )
  const previewAmount = computed(() =>
    applyFinancePrecision(
      mode.value === 'rounding' ? 12345.675 : 12345.678901,
      form.amountPrecision,
      form.roundingRule
    ).toLocaleString('zh-TW', {
      minimumFractionDigits: form.amountPrecision,
      maximumFractionDigits: form.amountPrecision
    })
  )
  const roundingDescription = computed(
    () =>
      ({
        四捨五入: '小於 5 捨去，大於或等於 5 進位。',
        無條件捨去: '超出精度的數值一律捨去。',
        無條件進位: '只要超出精度即向上進位。',
        銀行家捨入: '恰好在中間值時，取最接近的偶數。'
      })[form.roundingRule]
  )
  const cycleLabel = (value: SettlementCycle) =>
    ({ Daily: '每日', Weekly: '每週', Semimonthly: '半月', Monthly: '每月' })[value]
  const timingLabel = (value: SettlementRuleConfig['rateTiming']) =>
    ({
      'Period End': '期間最後一日',
      'Settlement Day': '實際結算日',
      'Daily Average': '期間每日平均',
      'Manual Snapshot': '人工鎖定快照'
    })[value]
  const resetForm = () => {
    Object.assign(form, store.settlementRule)
    ElMessage.info('已還原為目前設定')
  }
  const save = () => {
    store.updateSettlementRule({ ...form })
    ElMessage.success('結算設定已儲存，將依生效日期套用')
  }
</script>

<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.8fr);
    gap: 16px;
    align-items: start;
  }

  .card-title {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    div > span {
      display: block;
      margin-top: 4px;
      font-size: 13px;
      color: var(--art-gray-600);
    }
  }

  .setting-card :deep(.el-card__body) {
    max-width: 720px;
  }

  .full {
    width: 100%;
  }

  .side-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .summary-list {
    margin: 0;

    > div {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 11px 0;
      border-bottom: 1px solid var(--art-border-color);

      &:last-child {
        border-bottom: 0;
      }
    }

    dt {
      color: var(--art-gray-600);
    }

    dd {
      margin: 0;
      font-weight: 600;
      text-align: right;
    }
  }

  .priority-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0;
    margin: 0;
    list-style: none;

    li {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    li > b {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-radius: 50%;
    }

    span,
    small {
      display: block;
    }

    small {
      margin-top: 3px;
      color: var(--art-gray-600);
    }
  }

  .rounding-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 24px;
  }

  @media (width <= 900px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 520px) {
    .rounding-options {
      grid-template-columns: 1fr;
    }
  }
</style>
