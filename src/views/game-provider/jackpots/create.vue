<template>
  <div class="jackpot-create-page">
    <AppPageHeader
      title="新增獎池"
      eyebrow="獎池管理"
      description="完成基本資料、級別、遊戲與商戶設定後，建立為草稿。"
    >
      <template #actions
        ><ElButton @click="router.push('/jackpots/list')">取消新增</ElButton></template
      >
    </AppPageHeader>

    <ElCard class="step-card" shadow="never">
      <ElSteps :active="activeStep" align-center finish-status="success">
        <ElStep title="基本資料" /><ElStep title="獎池級別" /><ElStep title="綁定遊戲" /><ElStep
          title="商戶設定"
        /><ElStep title="確認建立" />
      </ElSteps>
    </ElCard>

    <ElCard class="form-card" shadow="never">
      <section v-if="activeStep === 0" class="step-content">
        <div class="section-title"
          ><h3>基本資料</h3><p>獎池代碼、類型與基準幣別在啟用後不可直接修改。</p></div
        >
        <ElForm label-position="top" class="form-grid">
          <ElFormItem label="獎池代碼" required
            ><ElInput v-model="form.code" placeholder="例如 JP_GLOBAL_001" maxlength="30"
          /></ElFormItem>
          <ElFormItem label="獎池類型" required
            ><ElSelect v-model="form.type" class="w-full"
              ><ElOption label="單一遊戲獎池" value="Single Game" /><ElOption
                label="多遊戲共享獎池"
                value="Shared Games" /><ElOption label="活動獎池" value="Campaign" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="中文名稱" required
            ><ElInput v-model="form.nameZh" placeholder="請輸入中文顯示名稱"
          /></ElFormItem>
          <ElFormItem label="英文名稱" required
            ><ElInput v-model="form.nameEn" placeholder="請輸入英文顯示名稱"
          /></ElFormItem>
          <ElFormItem label="基準幣別" required
            ><ElSelect v-model="form.baseCurrency" class="w-full"
              ><ElOption
                v-for="currency in currencies"
                :key="currency"
                :label="currency"
                :value="currency" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="時區" required
            ><ElSelect v-model="form.timezone" class="w-full"
              ><ElOption label="Asia/Taipei" value="Asia/Taipei" /><ElOption
                label="UTC"
                value="UTC" /><ElOption label="Asia/Tokyo" value="Asia/Tokyo" /><ElOption
                label="Asia/Singapore"
                value="Asia/Singapore" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="顯示說明" required class="full-width"
            ><ElInput v-model="form.description" type="textarea" :rows="3"
          /></ElFormItem>
          <ElFormItem label="內部備註" class="full-width"
            ><ElInput v-model="form.note" type="textarea" :rows="2"
          /></ElFormItem>
        </ElForm>
      </section>

      <section v-else-if="activeStep === 1" class="step-content">
        <div class="section-title with-action"
          ><div><h3>獎池級別</h3><p>至少建立一個級別；金額僅為展示初始值。</p></div
          ><ElButton type="primary" @click="addLevelRow">新增級別</ElButton></div
        >
        <ElTable :data="form.levels" border>
          <ElTableColumn label="級別代碼" min-width="130"
            ><template #default="scope"
              ><ElInput v-model="scope.row.code" placeholder="GRAND" /></template
          ></ElTableColumn>
          <ElTableColumn label="級別名稱" min-width="130"
            ><template #default="scope"
              ><ElInput v-model="scope.row.name" placeholder="Grand" /></template
          ></ElTableColumn>
          <ElTableColumn label="初始展示金額" min-width="160"
            ><template #default="scope"
              ><ElInputNumber
                v-model="scope.row.initialDisplayAmount"
                :min="0"
                :precision="2"
                controls-position="right"
                class="w-full" /></template
          ></ElTableColumn>
          <ElTableColumn label="最低展示金額" min-width="160"
            ><template #default="scope"
              ><ElInputNumber
                v-model="scope.row.minimumDisplayAmount"
                :min="0"
                :precision="2"
                controls-position="right"
                class="w-full" /></template
          ></ElTableColumn>
          <ElTableColumn label="顏色" width="100"
            ><template #default="scope"><ElColorPicker v-model="scope.row.color" /></template
          ></ElTableColumn>
          <ElTableColumn label="操作" width="80"
            ><template #default="scope"
              ><ElButton
                link
                type="danger"
                :disabled="form.levels.length === 1"
                @click="form.levels.splice(scope.$index, 1)"
                >移除</ElButton
              ></template
            ></ElTableColumn
          >
        </ElTable>
        <ElAlert
          title="本階段不設定中獎機率、貢獻演算法或派發公式。"
          type="info"
          :closable="false"
          show-icon
          class="mt-4"
        />
      </section>

      <section v-else-if="activeStep === 2" class="step-content">
        <div class="section-title"
          ><h3>綁定遊戲</h3><p>僅顯示已完成主要設定且支援 Jackpot 的遊戲。</p></div
        >
        <ElCheckboxGroup v-model="form.gameIds" class="selection-grid">
          <ElCheckbox
            v-for="game in availableGames"
            :key="game.id"
            :value="game.id"
            border
            class="selection-card"
          >
            <strong>{{ game.displayName }}</strong
            ><small>{{ game.id }} · {{ game.code }}</small
            ><small
              >RTP：{{
                game.rtpStatus === 'Configured' ? `${game.defaultRtp}%` : '尚未設定'
              }}</small
            >
          </ElCheckbox>
        </ElCheckboxGroup>
      </section>

      <section v-else-if="activeStep === 3" class="step-content">
        <div class="section-title"
          ><h3>商戶線路設定</h3
          ><p>只顯示幣別為 {{ form.baseCurrency }} 且符合遊戲開放條件的啟用線路。</p></div
        >
        <ElAlert
          :title="`一個獎池只能服務一種交易幣別；目前僅可綁定 ${form.baseCurrency} 線路。`"
          type="info"
          :closable="false"
          show-icon
          class="mb-4"
        />
        <ElCheckboxGroup v-model="form.merchantLineUids" class="selection-grid merchant-grid">
          <ElCheckbox
            v-for="item in eligibleMerchantLines"
            :key="item.line.uid"
            :value="item.line.uid"
            border
            class="selection-card"
          >
            <strong>{{ item.merchant.name }} · {{ item.line.currency }}</strong
            ><small>{{ item.line.uid }}</small
            ><small
              >{{ item.merchant.agentName }} · 可用遊戲：{{
                item.eligibleGameNames.join('、')
              }}</small
            >
          </ElCheckbox>
        </ElCheckboxGroup>
        <ElEmpty
          v-if="eligibleMerchantLines.length === 0"
          description="目前沒有符合幣別與遊戲開放條件的啟用線路"
        />
      </section>

      <section v-else class="step-content review-content">
        <div class="section-title"
          ><h3>確認建立</h3><p>確認後只建立草稿，不會直接開放遊戲或商戶使用。</p></div
        >
        <ElAlert
          :title="
            readiness.ready
              ? '必要設定已完成，可以建立獎池草稿。'
              : '仍有必要設定未完成，請返回修正。'
          "
          :type="readiness.ready ? 'success' : 'warning'"
          :closable="false"
          show-icon
          class="mb-4"
        />
        <ElDescriptions :column="descriptionColumns" border>
          <ElDescriptionsItem label="獎池代碼">{{ form.code }}</ElDescriptionsItem
          ><ElDescriptionsItem label="類型">{{ typeLabel(form.type) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="中文名稱">{{ form.nameZh }}</ElDescriptionsItem
          ><ElDescriptionsItem label="英文名稱">{{ form.nameEn }}</ElDescriptionsItem>
          <ElDescriptionsItem label="基準幣別">{{ form.baseCurrency }}</ElDescriptionsItem
          ><ElDescriptionsItem label="時區">{{ form.timezone }}</ElDescriptionsItem>
          <ElDescriptionsItem label="級別">{{
            form.levels.map((level) => level.name).join('、')
          }}</ElDescriptionsItem
          ><ElDescriptionsItem label="綁定遊戲">{{ form.gameIds.length }} 款</ElDescriptionsItem>
          <ElDescriptionsItem label="適用商戶線路"
            >{{ form.merchantLineUids.length }} 條（{{
              selectedMerchantCount
            }}
            家商戶）</ElDescriptionsItem
          ><ElDescriptionsItem label="建立狀態">草稿</ElDescriptionsItem>
        </ElDescriptions>
        <div class="check-list"
          ><div v-for="item in readiness.items" :key="item.label" :class="{ passed: item.passed }"
            ><ArtSvgIcon
              :icon="item.passed ? 'ri:checkbox-circle-line' : 'ri:error-warning-line'"
            /><span>{{ item.label }}</span
            ><strong>{{ item.passed ? '完成' : '未完成' }}</strong></div
          ></div
        >
      </section>

      <div class="step-actions"
        ><ElButton v-if="activeStep > 0" @click="activeStep--">上一步</ElButton
        ><ElButton v-if="activeStep < 4" type="primary" @click="nextStep">下一步</ElButton
        ><ElButton v-else type="primary" :disabled="!readiness.ready" @click="createJackpot"
          >建立獎池草稿</ElButton
        ></div
      >
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type { JackpotType } from '@/types/game-provider'
  import { useJackpotCenterStore } from '@/store/modules/jackpotCenter'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'JackpotCreate' })
  const router = useRouter()
  const store = useJackpotCenterStore()
  const gameStore = useGameCatalogStore()
  const { width } = useWindowSize()
  const activeStep = ref(0)
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const currencies = ['USD', 'TWD', 'USDT', 'JPY', 'EUR', 'THB', 'SGD', 'HKD']
  const form = reactive({
    code: '',
    nameZh: '',
    nameEn: '',
    type: 'Shared Games' as JackpotType,
    baseCurrency: 'USD',
    timezone: 'Asia/Taipei',
    description: '',
    note: '',
    levels: [
      {
        code: 'MINI',
        name: 'Mini',
        initialDisplayAmount: 1000,
        minimumDisplayAmount: 500,
        color: '#67c23a'
      },
      {
        code: 'GRAND',
        name: 'Grand',
        initialDisplayAmount: 100000,
        minimumDisplayAmount: 50000,
        color: '#f56c6c'
      }
    ],
    gameIds: [] as string[],
    merchantLineUids: [] as string[]
  })
  const availableGames = computed(() =>
    gameStore.games.filter(
      (game) =>
        game.masterComplete && game.status !== 'Disabled' && game.featureTagIds.includes('FT003')
    )
  )
  const eligibleMerchantLines = computed(() =>
    store.getEligibleMerchantLines(form.baseCurrency, form.gameIds)
  )
  const selectedMerchantCount = computed(
    () =>
      new Set(
        eligibleMerchantLines.value
          .filter((item) => form.merchantLineUids.includes(item.line.uid))
          .map((item) => item.merchant.id)
      ).size
  )
  const readiness = computed(() => {
    const items = [
      {
        label: '基本資料完整',
        passed: Boolean(
          form.code.trim() &&
            form.nameZh.trim() &&
            form.nameEn.trim() &&
            form.baseCurrency &&
            form.description.trim()
        )
      },
      {
        label: '至少一個有效級別',
        passed: form.levels.some((level) => level.code.trim() && level.name.trim())
      },
      { label: '至少綁定一款遊戲', passed: form.gameIds.length > 0 },
      { label: '至少選擇一條合格商戶線路', passed: form.merchantLineUids.length > 0 }
    ]
    return { items, ready: items.every((item) => item.passed) }
  })
  const typeLabel = (type: JackpotType) =>
    ({ 'Single Game': '單一遊戲獎池', 'Shared Games': '多遊戲共享獎池', Campaign: '活動獎池' })[
      type
    ]
  const addLevelRow = () =>
    form.levels.push({
      code: '',
      name: '',
      initialDisplayAmount: 0,
      minimumDisplayAmount: 0,
      color: '#409eff'
    })
  const nextStep = () => {
    if (activeStep.value === 0 && !readiness.value.items[0].passed)
      return ElMessage.warning('請先完成所有必要基本資料')
    if (activeStep.value === 1 && !readiness.value.items[1].passed)
      return ElMessage.warning('請至少建立一個有效級別')
    if (activeStep.value === 2 && !readiness.value.items[2].passed)
      return ElMessage.warning('請至少綁定一款遊戲')
    if (activeStep.value === 3 && !readiness.value.items[3].passed)
      return ElMessage.warning('請至少選擇一條合格商戶線路')
    activeStep.value++
  }
  const createJackpot = () => {
    if (!readiness.value.ready) return
    const id = store.createPool({
      code: form.code,
      nameZh: form.nameZh,
      nameEn: form.nameEn,
      type: form.type,
      baseCurrency: form.baseCurrency,
      timezone: form.timezone,
      description: form.description,
      note: form.note,
      levels: form.levels,
      gameIds: form.gameIds,
      merchantLineUids: form.merchantLineUids
    })
    ElMessage.success('獎池草稿已建立')
    router.push(`/jackpots/${id}`)
  }
  watch(
    [() => form.baseCurrency, () => [...form.gameIds]],
    () => {
      const eligibleUids = new Set(eligibleMerchantLines.value.map((item) => item.line.uid))
      form.merchantLineUids = form.merchantLineUids.filter((lineUid) => eligibleUids.has(lineUid))
    },
    { deep: true }
  )
</script>

<style scoped lang="scss">
  .jackpot-create-page {
    display: grid;
    gap: 16px;
  }

  .step-card :deep(.el-card__body) {
    padding: 22px;
  }

  .form-card :deep(.el-card__body) {
    padding: 24px;
  }

  .step-content {
    min-height: 440px;
  }

  .section-title {
    margin-bottom: 20px;
  }

  .section-title h3,
  .section-title p {
    margin: 0;
  }

  .section-title p {
    margin-top: 6px;
    color: var(--art-gray-500);
  }

  .with-action {
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 20px;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .selection-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .selection-card {
    width: 100%;
    height: auto;
    min-height: 96px;
    padding: 14px;
    margin: 0;
  }

  .selection-card :deep(.el-checkbox__label) {
    display: grid;
    gap: 5px;
    white-space: normal;
  }

  .selection-card small {
    color: var(--art-gray-500);
  }

  .step-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 20px;
    border-top: 1px solid var(--art-gray-200);
  }

  .check-list {
    display: grid;
    gap: 10px;
    margin-top: 18px;
  }

  .check-list > div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    color: var(--el-color-warning);
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .check-list > div.passed {
    color: var(--el-color-success);
  }

  @media (width <= 900px) {
    .selection-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .form-grid,
    .selection-grid {
      grid-template-columns: 1fr;
    }

    .form-card :deep(.el-card__body) {
      padding: 16px;
    }
  }
</style>
