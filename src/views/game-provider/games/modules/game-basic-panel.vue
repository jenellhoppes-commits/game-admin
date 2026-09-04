<template>
  <div class="basic-panel">
    <div class="panel-toolbar">
      <div>
        <h2>遊戲主檔</h2>
        <p>集中檢視識別資料、分類、顯示設定與固定遊戲規格。</p>
      </div>
      <ElButton type="primary" @click="openEditor">編輯基本資料</ElButton>
    </div>

    <div class="section-grid">
      <section class="info-section">
        <div class="section-title">
          <strong>識別資料</strong>
          <ElTag type="info" effect="plain">主檔</ElTag>
        </div>
        <ElDescriptions :column="descriptionColumns" border>
          <ElDescriptionsItem label="Game ID">{{ game.id }}</ElDescriptionsItem>
          <ElDescriptionsItem label="遊戲代碼">{{ game.code }}</ElDescriptionsItem>
          <ElDescriptionsItem label="內部名稱">{{ game.internalName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="顯示名稱">{{ game.displayName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="英文名稱">{{ game.englishName || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="預設語系">{{ localeLabel }}</ElDescriptionsItem>
        </ElDescriptions>
      </section>

      <section class="info-section">
        <div class="section-title"><strong>分類與標籤</strong></div>
        <ElDescriptions :column="descriptionColumns" border>
          <ElDescriptionsItem label="遊戲類型">{{ typeName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="限紅模型">{{ limitModelLabel }}</ElDescriptionsItem>
          <ElDescriptionsItem label="功能標籤" :span="descriptionColumns">
            <ElSpace wrap>
              <ElTag v-for="tag in featureTags" :key="tag.id" type="warning" effect="light">
                {{ tag.name }}
              </ElTag>
              <span v-if="!featureTags.length">未設定</span>
            </ElSpace>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="行銷標籤" :span="descriptionColumns">
            <ElSpace wrap>
              <ElTag v-for="tag in marketingTags" :key="tag.id" effect="light">
                {{ tag.name }}
              </ElTag>
              <span v-if="!marketingTags.length">未設定</span>
            </ElSpace>
          </ElDescriptionsItem>
        </ElDescriptions>
      </section>

      <section class="info-section">
        <div class="section-title"><strong>顯示設定</strong></div>
        <ElDescriptions :column="descriptionColumns" border>
          <ElDescriptionsItem label="遊戲簡介" :span="descriptionColumns">
            {{ game.description || '尚未填寫遊戲簡介' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="畫面方向">{{ orientationLabel }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支援裝置">
            {{ game.supportedDevices?.join('、') || 'Web、Mobile' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="展示素材" :span="descriptionColumns">
            <div class="asset-strip">
              <div v-for="asset in assetItems" :key="asset.label">
                <img v-if="asset.value" :src="asset.value.url" :alt="asset.label" />
                <div v-else class="empty-asset"><ArtSvgIcon icon="ri:image-line" /></div>
                <span>{{ asset.label }}</span>
              </div>
            </div>
          </ElDescriptionsItem>
        </ElDescriptions>
      </section>

      <section class="info-section">
        <div class="section-title"><strong>固定遊戲規格</strong></div>
        <ElDescriptions :column="descriptionColumns" border>
          <ElDescriptionsItem label="畫面格局">{{ game.layout || '5 × 3' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="計獎模型">{{ game.payoutModel || 'Ways' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="Line／Way">{{ game.ways || '243 Ways' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="押注模式">{{ game.betMode || '固定檔位' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="基礎押注模型">
            {{ game.baseBetModel || 'Total Bet' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="最大贏分倍率">
            {{ game.maxWinMultiplier ? `${game.maxWinMultiplier}×` : '待確認' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="波動度">{{ volatilityLabel }}</ElDescriptionsItem>
          <ElDescriptionsItem label="最後修改">{{ game.updatedAt }}</ElDescriptionsItem>
          <ElDescriptionsItem label="盤面顯示">
            <ElTag :type="game.supportsBoardDisplay ? 'success' : 'info'" effect="light">
              {{ game.supportsBoardDisplay ? '支援' : '不支援' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="結果重播">
            <ElTag :type="game.supportsResultReplay ? 'success' : 'info'" effect="light">
              {{ game.supportsResultReplay ? '支援' : '不支援' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="事件重播">
            <ElTag :type="game.supportsEventReplay ? 'success' : 'info'" effect="light">
              {{ game.supportsEventReplay ? '支援' : '不支援' }}
            </ElTag>
          </ElDescriptionsItem>
        </ElDescriptions>
      </section>

      <section class="info-section full-span">
        <div class="section-title">
          <strong>子遊戲／玩法</strong>
          <ElTag effect="plain">{{ game.subgames?.length || 0 }} 項</ElTag>
        </div>
        <ElTable :data="game.subgames || []" border empty-text="目前沒有子遊戲或特殊玩法">
          <ElTableColumn prop="code" label="玩法代碼" min-width="140" />
          <ElTableColumn prop="name" label="玩法名稱" min-width="150" />
          <ElTableColumn prop="featureType" label="功能類型" min-width="150" />
          <ElTableColumn label="特殊限紅" width="120">
            <template #default="{ row }">
              <ElTag :type="row.specialLimitRequired ? 'warning' : 'info'" effect="light">
                {{ row.specialLimitRequired ? '需要' : '不需要' }}
              </ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </section>
    </div>

    <ElDrawer v-model="editorVisible" title="編輯遊戲基本資料" :size="drawerSize" destroy-on-close>
      <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="drawer-section">
          <h3>識別與分類</h3>
          <ElRow :gutter="14">
            <ElCol :span="12">
              <ElFormItem label="遊戲代碼"
                ><ElInput :model-value="game.code" disabled
              /></ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="遊戲類型" prop="typeId">
                <ElSelect v-model="form.typeId" class="w-full">
                  <ElOption
                    v-for="type in activeTypes"
                    :key="type.id"
                    :label="type.name"
                    :value="type.id"
                  />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="內部名稱" prop="internalName"
                ><ElInput v-model="form.internalName"
              /></ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="顯示名稱" prop="displayName"
                ><ElInput v-model="form.displayName"
              /></ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="英文名稱（建議）"
                ><ElInput v-model="form.englishName"
              /></ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="預設語系" prop="defaultLocale">
                <ElSelect v-model="form.defaultLocale" class="w-full">
                  <ElOption label="繁體中文｜zh-TW" value="zh-TW" />
                  <ElOption label="簡體中文｜zh-CN" value="zh-CN" />
                  <ElOption label="English｜en-US" value="en-US" />
                  <ElOption label="ไทย｜th-TH" value="th-TH" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElFormItem label="功能標籤">
            <ElSelect v-model="form.featureTagIds" multiple filterable class="w-full">
              <ElOption
                v-for="tag in activeFeatureTags"
                :key="tag.id"
                :label="tag.name"
                :value="tag.id"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="行銷標籤">
            <ElSelect v-model="form.marketingTagIds" multiple filterable class="w-full">
              <ElOption
                v-for="tag in activeMarketingTags"
                :key="tag.id"
                :label="tag.name"
                :value="tag.id"
              />
            </ElSelect>
          </ElFormItem>
        </div>

        <div class="drawer-section">
          <h3>顯示設定</h3>
          <ElFormItem label="遊戲簡介"
            ><ElInput v-model="form.description" type="textarea" :rows="3"
          /></ElFormItem>
          <ElRow :gutter="14">
            <ElCol :span="12">
              <ElFormItem label="畫面方向">
                <ElSelect v-model="form.orientation" class="w-full">
                  <ElOption label="響應式" value="Responsive" />
                  <ElOption label="橫向" value="Landscape" />
                  <ElOption label="直向" value="Portrait" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12">
              <ElFormItem label="支援裝置">
                <ElSelect v-model="form.supportedDevices" multiple class="w-full">
                  <ElOption label="Web" value="Web" />
                  <ElOption label="Mobile" value="Mobile" />
                  <ElOption label="Tablet" value="Tablet" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <div class="asset-edit-grid">
            <GameAssetUploader
              v-model="form.iconAsset"
              label="Icon"
              description="建議比例 1:1"
              :aspect-ratio="1"
              aspect-label="1:1"
            />
            <GameAssetUploader
              v-model="form.coverAsset"
              label="Cover"
              description="建議比例 16:9"
              :aspect-ratio="16 / 9"
              aspect-label="16:9"
            />
            <GameAssetUploader
              v-model="form.heroAsset"
              label="Hero Image"
              description="建議比例 21:9"
              :aspect-ratio="21 / 9"
              aspect-label="21:9"
            />
          </div>
        </div>

        <div class="drawer-section">
          <h3>固定遊戲規格</h3>
          <ElRow :gutter="14">
            <ElCol :span="12"
              ><ElFormItem label="畫面格局"
                ><ElInput v-model="form.layout" placeholder="例如 5 × 3" /></ElFormItem
            ></ElCol>
            <ElCol :span="12"
              ><ElFormItem label="計獎模型"
                ><ElInput v-model="form.payoutModel" placeholder="例如 Ways" /></ElFormItem
            ></ElCol>
            <ElCol :span="12"
              ><ElFormItem label="Line／Way"
                ><ElInput v-model="form.ways" placeholder="例如 243 Ways" /></ElFormItem
            ></ElCol>
            <ElCol :span="12"
              ><ElFormItem label="押注模式"
                ><ElInput v-model="form.betMode" placeholder="例如 固定檔位" /></ElFormItem
            ></ElCol>
            <ElCol :span="12"
              ><ElFormItem label="基礎押注模型"
                ><ElInput v-model="form.baseBetModel" placeholder="例如 Total Bet" /></ElFormItem
            ></ElCol>
            <ElCol :span="12"
              ><ElFormItem label="最大贏分倍率"
                ><ElInputNumber
                  v-model="form.maxWinMultiplier"
                  :min="1"
                  :max="1000000"
                  class="w-full" /></ElFormItem
            ></ElCol>
            <ElCol :span="12">
              <ElFormItem label="波動度">
                <ElSelect v-model="form.volatility" class="w-full">
                  <ElOption label="低" value="Low" /><ElOption label="中" value="Medium" /><ElOption
                    label="高"
                    value="High"
                  />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="12"
              ><ElFormItem label="排序"
                ><ElInputNumber v-model="form.sort" :min="1" class="w-full" /></ElFormItem
            ></ElCol>
          </ElRow>
          <ElFormItem label="內部備註"
            ><ElInput v-model="form.note" type="textarea" :rows="3"
          /></ElFormItem>
        </div>
      </ElForm>
      <template #footer>
        <ElButton @click="editorVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveChanges">儲存變更</ElButton>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import {
    gameFeatureTagMockData,
    gameMarketingTagMockData,
    gameTypeMockData
  } from '@/mock/game-provider'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import type { GameAssetRecord, GameRecord } from '@/types/game-provider'
  import GameAssetUploader from './game-asset-uploader.vue'

  const props = defineProps<{ game: GameRecord }>()
  const route = useRoute()
  const router = useRouter()
  const store = useGameCatalogStore()
  const { width } = useWindowSize()
  const editorVisible = ref(false)
  const formRef = ref<FormInstance>()
  const drawerSize = computed(() => (width.value < 720 ? '100%' : '760px'))
  const descriptionColumns = computed(() => (width.value < 720 ? 1 : 2))
  const activeTypes = gameTypeMockData.filter((item) => item.status === 'Active')
  const activeFeatureTags = gameFeatureTagMockData.filter((item) => item.status === 'Active')
  const activeMarketingTags = gameMarketingTagMockData.filter((item) => item.status === 'Active')
  const type = computed(() => gameTypeMockData.find((item) => item.id === props.game.typeId))
  const typeName = computed(() => type.value?.name || '未分類')
  const limitModelLabel = computed(
    () =>
      ({
        'Slot Bet Levels': 'Slot｜投注檔位',
        'Fishing Hall BetX': 'Fishing｜廳別 × Bet X',
        'Arcade Level Currency': 'Arcade｜Level × 幣別矩陣',
        'Generic Bet Range': '通用投注範圍'
      })[type.value?.limitModel || 'Generic Bet Range']
  )
  const featureTags = computed(() =>
    gameFeatureTagMockData.filter((item) => props.game.featureTagIds.includes(item.id))
  )
  const marketingTags = computed(() =>
    gameMarketingTagMockData.filter((item) => props.game.marketingTagIds.includes(item.id))
  )
  const localeLabel = computed(
    () =>
      ({ 'zh-TW': '繁體中文', 'zh-CN': '簡體中文', 'en-US': 'English', 'th-TH': 'ไทย' })[
        props.game.defaultLocale
      ] || props.game.defaultLocale
  )
  const orientationLabel = computed(
    () =>
      ({ Landscape: '橫向', Portrait: '直向', Responsive: '響應式' })[
        props.game.orientation || 'Responsive'
      ]
  )
  const volatilityLabel = computed(
    () => ({ Low: '低', Medium: '中', High: '高' })[props.game.volatility || 'Medium']
  )
  const assetItems = computed(() => [
    { label: 'Icon', value: props.game.iconAsset },
    { label: 'Cover', value: props.game.coverAsset },
    { label: 'Hero', value: props.game.heroAsset }
  ])

  type EditForm = {
    internalName: string
    displayName: string
    englishName: string
    typeId: string
    defaultLocale: string
    featureTagIds: string[]
    marketingTagIds: string[]
    description: string
    orientation: 'Landscape' | 'Portrait' | 'Responsive'
    supportedDevices: string[]
    iconAsset?: GameAssetRecord
    coverAsset?: GameAssetRecord
    heroAsset?: GameAssetRecord
    layout: string
    payoutModel: string
    ways: string
    betMode: string
    baseBetModel: string
    maxWinMultiplier?: number
    volatility: 'Low' | 'Medium' | 'High'
    sort: number
    note: string
  }
  const form = reactive<EditForm>({} as EditForm)
  const rules: FormRules = {
    internalName: [{ required: true, message: '請輸入內部名稱', trigger: 'blur' }],
    displayName: [{ required: true, message: '請輸入顯示名稱', trigger: 'blur' }],
    typeId: [{ required: true, message: '請選擇遊戲類型', trigger: 'change' }],
    defaultLocale: [{ required: true, message: '請選擇預設語系', trigger: 'change' }]
  }

  const openEditor = () => {
    Object.assign(form, {
      internalName: props.game.internalName,
      displayName: props.game.displayName,
      englishName: props.game.englishName,
      typeId: props.game.typeId,
      defaultLocale: props.game.defaultLocale,
      featureTagIds: [...props.game.featureTagIds],
      marketingTagIds: [...props.game.marketingTagIds],
      description: props.game.description || '',
      orientation: props.game.orientation || 'Responsive',
      supportedDevices: props.game.supportedDevices || ['Web', 'Mobile'],
      iconAsset: props.game.iconAsset,
      coverAsset: props.game.coverAsset,
      heroAsset: props.game.heroAsset,
      layout: props.game.layout || '',
      payoutModel: props.game.payoutModel || '',
      ways: props.game.ways || '',
      betMode: props.game.betMode || '',
      baseBetModel: props.game.baseBetModel || '',
      maxWinMultiplier: props.game.maxWinMultiplier,
      volatility: props.game.volatility || 'Medium',
      sort: props.game.sort || 10,
      note: props.game.note || ''
    })
    editorVisible.value = true
  }

  const saveChanges = async () => {
    if (!(await formRef.value?.validate().catch(() => false))) return
    store.updateGame(
      props.game.id,
      { ...JSON.parse(JSON.stringify(form)), masterComplete: true },
      '更新遊戲基本資料與固定規格'
    )
    editorVisible.value = false
    ElMessage.success('遊戲基本資料已更新')
  }

  watch(
    () => route.query.edit,
    (edit) => {
      if (edit !== '1') return
      openEditor()
      const query = { ...route.query }
      delete query.edit
      router.replace({ query })
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .basic-panel,
  .section-grid {
    display: grid;
    gap: 18px;
  }

  .panel-toolbar,
  .section-title {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .panel-toolbar h2,
  .drawer-section h3 {
    margin: 0;
    font-size: 17px;
  }

  .panel-toolbar p {
    margin: 5px 0 0;
    color: var(--art-gray-500);
  }

  .section-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .info-section {
    min-width: 0;
    padding: 16px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .section-title {
    margin-bottom: 12px;
  }

  .full-span {
    grid-column: 1 / -1;
  }

  .asset-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  .asset-strip > div {
    display: grid;
    gap: 5px;
    justify-items: center;
    font-size: 12px;
    color: var(--art-gray-500);
  }

  .asset-strip img,
  .empty-asset {
    width: 74px;
    height: 50px;
    object-fit: cover;
    border-radius: 6px;
  }

  .empty-asset {
    display: grid;
    place-items: center;
    color: var(--art-gray-400);
    background: var(--art-gray-100);
  }

  .drawer-section {
    padding-bottom: 22px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--art-gray-200);
  }

  .drawer-section h3 {
    margin-bottom: 16px;
  }

  .asset-edit-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .asset-edit-grid > :last-child {
    grid-column: 1 / -1;
  }

  @media (width <= 800px) {
    .section-grid {
      grid-template-columns: 1fr;
    }

    .full-span {
      grid-column: auto;
    }
  }

  @media (width <= 560px) {
    .panel-toolbar {
      flex-direction: column;
      align-items: flex-start;
    }

    .asset-edit-grid {
      grid-template-columns: 1fr;
    }

    .asset-edit-grid > :last-child {
      grid-column: auto;
    }
  }
</style>
