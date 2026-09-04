<template>
  <div class="game-create-page">
    <AppPageHeader
      :title="createdGameId ? '遊戲主檔已建立' : '新增遊戲'"
      eyebrow="遊戲中心／遊戲管理"
      description="先建立遊戲主檔；RTP 與限紅方案可在建立後的遊戲詳細頁繼續設定。"
      status="Draft"
    >
      <template #meta>
        <p v-if="createdGameId" class="created-id">Game ID：{{ createdGameId }}</p>
      </template>
      <template #actions>
        <ElButton @click="cancelCreate">返回遊戲管理</ElButton>
      </template>
    </AppPageHeader>

    <ElAlert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />

    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="create-layout">
        <main class="form-sections">
          <ElCard id="identity-section" class="form-card">
            <template #header>
              <div class="section-heading">
                <div>
                  <h2>識別資料</h2>
                  <p>建立遊戲代碼、名稱與主要類型。</p>
                </div>
                <ElTag type="danger" effect="plain" round>必填</ElTag>
              </div>
            </template>

            <ElRow :gutter="18">
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="遊戲代碼" prop="code">
                  <ElInput
                    v-model="form.code"
                    placeholder="例如 DRAGON_VAULT"
                    :disabled="Boolean(createdGameId)"
                    maxlength="40"
                    show-word-limit
                    @input="normalizeGameCode"
                    @blur="validateCodeState"
                  />
                  <div v-if="form.code" class="field-state" :class="codeState">
                    <ArtSvgIcon
                      :icon="codeState === 'available' ? 'ri:check-line' : 'ri:information-line'"
                    />
                    {{ codeStateText }}
                  </div>
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="內部名稱" prop="internalName">
                  <ElInput
                    v-model="form.internalName"
                    placeholder="例如 Dragon Vault"
                    maxlength="80"
                  />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="顯示名稱" prop="displayName">
                  <ElInput v-model="form.displayName" placeholder="例如 龍之寶庫" maxlength="80" />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="英文名稱（建議）" prop="englishName">
                  <ElInput
                    v-model="form.englishName"
                    placeholder="填寫國際展示名稱（選填）"
                    maxlength="80"
                  />
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="遊戲類型" prop="typeId">
                  <ElSelect
                    v-model="form.typeId"
                    class="w-full"
                    filterable
                    placeholder="選擇遊戲類型"
                  >
                    <ElOption
                      v-for="option in activeTypes"
                      :key="option.id"
                      :label="option.name"
                      :value="option.id"
                    >
                      <span>{{ option.name }}</span>
                      <span class="option-code">{{ option.code }}</span>
                    </ElOption>
                  </ElSelect>
                </ElFormItem>
              </ElCol>
              <ElCol :xs="24" :sm="12">
                <ElFormItem label="預設語系" prop="defaultLocale">
                  <ElSelect v-model="form.defaultLocale" class="w-full">
                    <ElOption
                      v-for="locale in localeOptions"
                      :key="locale.value"
                      :label="locale.label"
                      :value="locale.value"
                    />
                  </ElSelect>
                </ElFormItem>
              </ElCol>
            </ElRow>

            <ElAlert
              v-if="selectedType"
              :title="`建立後將使用「${limitModelLabel}」限紅編輯模型。`"
              type="info"
              :closable="false"
              show-icon
            />
          </ElCard>

          <ElCard id="taxonomy-section" class="form-card">
            <template #header>
              <div class="section-heading">
                <div>
                  <h2>分類與標籤</h2>
                  <p>功能標籤會影響後續設定；行銷標籤只影響展示與搜尋。</p>
                </div>
                <ElTag type="info" effect="plain" round>選填</ElTag>
              </div>
            </template>

            <ElRow :gutter="18">
              <ElCol :span="24">
                <ElFormItem label="功能標籤">
                  <ElSelect
                    v-model="form.featureTagIds"
                    class="w-full"
                    multiple
                    filterable
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="選擇 Buy Feature、Jackpot 等遊戲功能"
                  >
                    <ElOption
                      v-for="option in activeFeatureTags"
                      :key="option.id"
                      :label="option.name"
                      :value="option.id"
                    />
                  </ElSelect>
                </ElFormItem>
              </ElCol>
              <ElCol :span="24">
                <ElFormItem label="行銷標籤">
                  <ElSelect
                    v-model="form.marketingTagIds"
                    class="w-full"
                    multiple
                    filterable
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="選擇熱門、推薦、新遊戲等展示標籤"
                  >
                    <ElOption
                      v-for="option in activeMarketingTags"
                      :key="option.id"
                      :label="`${option.name}｜${option.displayText}`"
                      :value="option.id"
                    />
                  </ElSelect>
                </ElFormItem>
              </ElCol>
            </ElRow>

            <div v-if="featureReminders.length" class="feature-reminders">
              <strong>建立後待完成設定</strong>
              <div v-for="reminder in featureReminders" :key="reminder.id" class="reminder-item">
                <ArtSvgIcon icon="ri:information-line" />
                <span>{{ reminder.name }}：{{ reminder.relatedSetting }}</span>
              </div>
            </div>
          </ElCard>

          <ElCard id="assets-section" class="form-card">
            <template #header>
              <div class="section-heading">
                <div>
                  <h2>展示素材</h2>
                  <p>支援 PNG、JPG 與 WebP；單張圖片不可超過 5 MB。</p>
                </div>
                <ElTag type="info" effect="plain" round>選填</ElTag>
              </div>
            </template>

            <div class="asset-grid">
              <GameAssetUploader
                v-model="form.iconAsset"
                label="Icon"
                description="列表與遊戲大廳小圖，建議比例 1:1。"
                :aspect-ratio="1"
                aspect-label="1:1"
                preview-class="icon-preview"
              />
              <GameAssetUploader
                v-model="form.coverAsset"
                label="Cover"
                description="遊戲卡片封面，建議比例 16:9。"
                :aspect-ratio="16 / 9"
                aspect-label="16:9"
              />
              <GameAssetUploader
                v-model="form.heroAsset"
                label="Hero Image"
                description="遊戲主視覺，建議寬幅比例 21:9。"
                :aspect-ratio="21 / 9"
                aspect-label="21:9"
                preview-class="hero-preview"
              />
            </div>
          </ElCard>

          <ElCard id="management-section" class="form-card">
            <template #header>
              <div class="section-heading">
                <div>
                  <h2>管理資訊</h2>
                  <p>設定排序與僅供後台使用的內部備註。</p>
                </div>
                <ElTag type="info" effect="plain" round>內部資料</ElTag>
              </div>
            </template>

            <ElRow :gutter="18">
              <ElCol :xs="24" :sm="8">
                <ElFormItem label="排序" prop="sort">
                  <ElInputNumber v-model="form.sort" :min="1" :max="9999" class="w-full" />
                </ElFormItem>
              </ElCol>
              <ElCol :span="24">
                <ElFormItem label="備註">
                  <ElInput
                    v-model="form.note"
                    type="textarea"
                    :rows="4"
                    maxlength="500"
                    show-word-limit
                    placeholder="輸入遊戲內部說明、版本來源或營運備註"
                  />
                </ElFormItem>
              </ElCol>
            </ElRow>
          </ElCard>
        </main>

        <aside class="summary-column">
          <ElCard class="summary-card">
            <template #header>
              <div class="summary-title">
                <strong>建立摘要</strong>
                <GameProviderStatusTag status="Draft" />
              </div>
            </template>

            <div class="completion-block">
              <div class="completion-copy">
                <span>必填完成度</span>
                <strong>{{ completedRequiredCount }} / {{ requiredItems.length }}</strong>
              </div>
              <ElProgress
                :percentage="completionPercentage"
                :stroke-width="8"
                :show-text="false"
                :status="completionPercentage === 100 ? 'success' : undefined"
              />
            </div>

            <dl class="summary-list">
              <div>
                <dt>Game ID</dt>
                <dd>{{ createdGameId || '儲存後產生' }}</dd>
              </div>
              <div>
                <dt>遊戲類型</dt>
                <dd>{{ selectedType?.name || '尚未選擇' }}</dd>
              </div>
              <div>
                <dt>限紅模型</dt>
                <dd>{{ selectedType ? limitModelLabel : '依遊戲類型決定' }}</dd>
              </div>
              <div>
                <dt>功能標籤</dt>
                <dd>{{ form.featureTagIds.length }} 個</dd>
              </div>
              <div>
                <dt>行銷標籤</dt>
                <dd>{{ form.marketingTagIds.length }} 個</dd>
              </div>
            </dl>

            <div v-if="missingRequiredItems.length" class="missing-list">
              <strong>尚待完成</strong>
              <div v-for="item in missingRequiredItems" :key="item.label">
                <ArtSvgIcon icon="ri:checkbox-blank-circle-line" />
                {{ item.label }}
              </div>
            </div>
            <ElAlert
              v-else
              title="必填資料已完成，可以建立遊戲主檔。"
              type="success"
              :closable="false"
              show-icon
            />

            <div class="post-create-state">
              <strong>建立後狀態</strong>
              <div><span>遊戲</span><GameProviderStatusTag status="Draft" /></div>
              <div><span>RTP</span><ElTag type="warning" effect="light" round>未設定</ElTag></div>
              <div><span>限紅</span><ElTag type="warning" effect="light" round>未設定</ElTag></div>
              <div><span>可否啟用</span><ElTag type="info" effect="plain" round>否</ElTag></div>
            </div>
          </ElCard>
        </aside>
      </div>
    </ElForm>

    <div class="sticky-actions">
      <div class="action-note">
        <ArtSvgIcon icon="ri:information-line" />
        <span>儲存後仍為草稿，不會直接提供商戶使用。</span>
      </div>
      <ElSpace wrap>
        <ElButton @click="cancelCreate">取消</ElButton>
        <ElButton :loading="submitting" @click="saveGame('stay')">儲存草稿</ElButton>
        <ElButton type="primary" :loading="submitting" @click="saveGame('detail')">
          儲存並前往詳細
        </ElButton>
      </ElSpace>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useEventListener } from '@vueuse/core'
  import type { GameAssetRecord, GameLimitModel, GameRecord } from '@/types/game-provider'
  import {
    gameFeatureTagMockData,
    gameMarketingTagMockData,
    gameTypeMockData
  } from '@/mock/game-provider'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'
  import GameAssetUploader from './modules/game-asset-uploader.vue'

  defineOptions({ name: 'GameCreate' })

  const router = useRouter()
  const gameCatalogStore = useGameCatalogStore()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const submitError = ref('')
  const createdGameId = ref('')
  const allowLeave = ref(false)
  const baseline = ref('')
  const codeState = ref<'idle' | 'available' | 'duplicate'>('idle')

  const activeTypes = gameTypeMockData.filter((item) => item.status === 'Active')
  const activeFeatureTags = gameFeatureTagMockData.filter((item) => item.status === 'Active')
  const activeMarketingTags = gameMarketingTagMockData.filter((item) => item.status === 'Active')
  const localeOptions = [
    { label: '繁體中文｜zh-TW', value: 'zh-TW' },
    { label: '英文｜en-US', value: 'en-US' },
    { label: '簡體中文｜zh-CN', value: 'zh-CN' },
    { label: '日文｜ja-JP', value: 'ja-JP' },
    { label: '泰文｜th-TH', value: 'th-TH' }
  ]
  const limitModelLabels: Record<GameLimitModel, string> = {
    'Slot Bet Levels': 'Slot｜投注檔位',
    'Fishing Hall BetX': 'Fishing｜廳別 × Bet X',
    'Arcade Level Currency': 'Arcade｜Level × 幣別',
    'Generic Bet Range': '其他｜通用投注範圍'
  }
  const typeIcons: Record<string, string> = {
    GT001: '🎰',
    GT002: '🃏',
    GT003: '🐟',
    GT004: '🎮',
    GT005: '🎲',
    GT006: '🏆',
    GT007: '🎟️',
    GT008: '🎮'
  }

  const nextSort = Math.max(...gameCatalogStore.games.map((game) => game.sort || 0), 0) + 10
  const form = reactive({
    code: '',
    internalName: '',
    displayName: '',
    englishName: '',
    typeId: '',
    defaultLocale: 'zh-TW',
    featureTagIds: [] as string[],
    marketingTagIds: [] as string[],
    iconAsset: undefined as GameAssetRecord | undefined,
    coverAsset: undefined as GameAssetRecord | undefined,
    heroAsset: undefined as GameAssetRecord | undefined,
    sort: nextSort,
    note: ''
  })

  const selectedType = computed(() => activeTypes.find((item) => item.id === form.typeId))
  const limitModelLabel = computed(() =>
    selectedType.value?.limitModel
      ? limitModelLabels[selectedType.value.limitModel]
      : '通用投注範圍'
  )
  const featureReminders = computed(() =>
    activeFeatureTags.filter(
      (item) => form.featureTagIds.includes(item.id) && item.affectsSettings && item.relatedSetting
    )
  )
  const requiredItems = computed(() => [
    { label: '遊戲代碼', completed: Boolean(form.code.trim()) },
    { label: '內部名稱', completed: Boolean(form.internalName.trim()) },
    { label: '顯示名稱', completed: Boolean(form.displayName.trim()) },
    { label: '遊戲類型', completed: Boolean(form.typeId) },
    { label: '預設語系', completed: Boolean(form.defaultLocale) }
  ])
  const completedRequiredCount = computed(
    () => requiredItems.value.filter((item) => item.completed).length
  )
  const missingRequiredItems = computed(() => requiredItems.value.filter((item) => !item.completed))
  const completionPercentage = computed(() =>
    Math.round((completedRequiredCount.value / requiredItems.value.length) * 100)
  )
  const codeStateText = computed(() => {
    if (codeState.value === 'available') return '遊戲代碼可以使用'
    if (codeState.value === 'duplicate') return '遊戲代碼已被使用'
    return '正式啟用並被引用後，遊戲代碼原則上不可修改'
  })

  const rules: FormRules = {
    code: [
      { required: true, message: '請輸入遊戲代碼', trigger: 'blur' },
      {
        pattern: /^[A-Z0-9_]{3,40}$/,
        message: '請輸入 3～40 個英文大寫、數字或底線',
        trigger: 'blur'
      },
      {
        validator: (_rule, value, callback) => {
          if (
            !value ||
            gameCatalogStore.isCodeAvailable(String(value), createdGameId.value || undefined)
          ) {
            callback()
          } else {
            callback(new Error('此遊戲代碼已被使用'))
          }
        },
        trigger: 'blur'
      }
    ],
    internalName: [
      { required: true, message: '請輸入內部名稱', trigger: 'blur' },
      { min: 2, max: 80, message: '內部名稱需為 2～80 個字元', trigger: 'blur' }
    ],
    displayName: [
      { required: true, message: '請輸入顯示名稱', trigger: 'blur' },
      { min: 2, max: 80, message: '顯示名稱需為 2～80 個字元', trigger: 'blur' }
    ],
    typeId: [{ required: true, message: '請選擇遊戲類型', trigger: 'change' }],
    defaultLocale: [{ required: true, message: '請選擇預設語系', trigger: 'change' }],
    sort: [{ required: true, message: '請輸入排序', trigger: 'change' }]
  }

  const serializeForm = () =>
    JSON.stringify({
      code: form.code,
      internalName: form.internalName,
      displayName: form.displayName,
      englishName: form.englishName,
      typeId: form.typeId,
      defaultLocale: form.defaultLocale,
      featureTagIds: form.featureTagIds,
      marketingTagIds: form.marketingTagIds,
      iconAsset: form.iconAsset ? [form.iconAsset.name, form.iconAsset.size] : null,
      coverAsset: form.coverAsset ? [form.coverAsset.name, form.coverAsset.size] : null,
      heroAsset: form.heroAsset ? [form.heroAsset.name, form.heroAsset.size] : null,
      sort: form.sort,
      note: form.note
    })
  const isDirty = computed(() => Boolean(baseline.value) && serializeForm() !== baseline.value)

  const normalizeGameCode = (value: string) => {
    form.code = value
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
    codeState.value = 'idle'
  }

  const validateCodeState = () => {
    if (!form.code || !/^[A-Z0-9_]{3,40}$/.test(form.code)) {
      codeState.value = 'idle'
      return
    }
    codeState.value = gameCatalogStore.isCodeAvailable(form.code, createdGameId.value || undefined)
      ? 'available'
      : 'duplicate'
  }

  const buildGamePayload = (): Omit<GameRecord, 'id' | 'updatedAt'> => ({
    code: form.code,
    icon: typeIcons[form.typeId] || '🎮',
    iconAsset: form.iconAsset,
    coverAsset: form.coverAsset,
    heroAsset: form.heroAsset,
    internalName: form.internalName.trim(),
    displayName: form.displayName.trim(),
    englishName: form.englishName.trim(),
    typeId: form.typeId,
    defaultLocale: form.defaultLocale,
    featureTagIds: [...form.featureTagIds],
    marketingTagIds: [...form.marketingTagIds],
    rtpPlanCount: 0,
    limitPlanCount: 0,
    rtpStatus: 'Not Configured',
    limitStatus: 'Not Configured',
    masterComplete: true,
    merchantCount: 0,
    sort: form.sort,
    note: form.note.trim(),
    status: 'Draft'
  })

  const scrollToFirstError = () => {
    nextTick(() =>
      document
        .querySelector('.el-form-item.is-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    )
  }

  const saveGame = async (destination: 'stay' | 'detail') => {
    submitError.value = ''
    validateCodeState()
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid || codeState.value === 'duplicate') {
      submitError.value = '尚有必填資料或欄位格式不正確，請完成後再儲存。'
      scrollToFirstError()
      return
    }

    submitting.value = true
    await new Promise((resolve) => setTimeout(resolve, 400))
    const payload = buildGamePayload()
    let savedGame: GameRecord | undefined
    if (createdGameId.value) {
      savedGame = gameCatalogStore.updateGame(createdGameId.value, payload, '更新新建遊戲草稿')
    } else {
      savedGame = gameCatalogStore.createGame(payload)
      createdGameId.value = savedGame.id
    }
    submitting.value = false
    if (!savedGame) {
      submitError.value = '遊戲主檔儲存失敗，請稍後重試。'
      return
    }

    await nextTick()
    baseline.value = serializeForm()
    ElMessage.success(`${savedGame.displayName} 已儲存為草稿`)
    if (destination === 'detail') {
      allowLeave.value = true
      await router.push(`/games/management/${savedGame.id}`)
    }
  }

  const confirmDiscard = async () => {
    if (!isDirty.value) return true
    return Boolean(
      await ElMessageBox.confirm('離開後目前輸入的資料將遺失。', '尚有未儲存內容', {
        confirmButtonText: '放棄並離開',
        cancelButtonText: '繼續編輯',
        type: 'warning'
      }).catch(() => false)
    )
  }

  const cancelCreate = async () => {
    if (!(await confirmDiscard())) return
    allowLeave.value = true
    await router.push('/games/management')
  }

  onBeforeRouteLeave(async () => {
    if (allowLeave.value || !isDirty.value) return true
    return confirmDiscard()
  })

  useEventListener(window, 'beforeunload', (event) => {
    if (!isDirty.value || allowLeave.value) return
    event.preventDefault()
    event.returnValue = ''
  })

  onMounted(() => {
    baseline.value = serializeForm()
  })
</script>

<style scoped lang="scss">
  .game-create-page {
    display: grid;
    gap: 16px;
    padding-bottom: 82px;
  }

  .created-id {
    margin: 7px 0 0;
    font-size: 13px;
    color: var(--art-gray-600);
  }

  .create-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 18px;
    align-items: start;
  }

  .form-sections {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .form-card :deep(.el-card__header) {
    padding: 18px 20px;
  }

  .section-heading,
  .summary-title {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;

    h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }

    p {
      margin: 5px 0 0;
      font-size: 13px;
      color: var(--art-gray-500);
    }
  }

  .option-code {
    float: right;
    margin-left: 16px;
    font-size: 12px;
    color: var(--art-gray-500);
  }

  .field-state {
    display: flex;
    gap: 5px;
    align-items: center;
    margin-top: 5px;
    font-size: 12px;
    color: var(--art-gray-500);

    &.available {
      color: var(--el-color-success);
    }

    &.duplicate {
      color: var(--el-color-danger);
    }
  }

  .feature-reminders {
    display: grid;
    gap: 8px;
    padding: 14px;
    background: var(--el-color-warning-light-9);
    border: 1px solid var(--el-color-warning-light-7);
    border-radius: 10px;

    > strong {
      font-size: 13px;
      font-weight: 600;
    }
  }

  .reminder-item {
    display: flex;
    gap: 7px;
    align-items: flex-start;
    font-size: 13px;
    line-height: 1.5;
    color: var(--art-gray-700);

    .art-svg-icon {
      margin-top: 2px;
      color: var(--el-color-warning);
    }
  }

  .asset-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;

    > :last-child {
      grid-column: 1 / -1;
    }
  }

  .summary-column {
    position: sticky;
    top: 16px;
  }

  .summary-card :deep(.el-card__body) {
    display: grid;
    gap: 20px;
  }

  .summary-title {
    align-items: center;
  }

  .completion-block {
    display: grid;
    gap: 9px;
  }

  .completion-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;

    span {
      color: var(--art-gray-600);
    }
  }

  .summary-list {
    display: grid;
    gap: 11px;
    margin: 0;

    > div {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      justify-content: space-between;
    }

    dt {
      color: var(--art-gray-500);
    }

    dd {
      max-width: 160px;
      margin: 0;
      font-weight: 500;
      text-align: right;
    }
  }

  .missing-list {
    display: grid;
    gap: 8px;
    padding: 13px;
    background: var(--art-gray-50);
    border-radius: 10px;

    strong {
      font-size: 13px;
    }

    div {
      display: flex;
      gap: 7px;
      align-items: center;
      font-size: 13px;
      color: var(--art-gray-600);
    }
  }

  .post-create-state {
    display: grid;
    gap: 10px;
    padding-top: 16px;
    border-top: 1px solid var(--art-gray-200);

    > strong {
      font-size: 13px;
    }

    > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
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
    background: color-mix(in srgb, var(--art-bg-color) 92%, transparent);
    border: 1px solid var(--art-gray-200);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgb(0 0 0 / 8%);
    backdrop-filter: blur(12px);
  }

  .action-note {
    display: flex;
    gap: 7px;
    align-items: center;
    font-size: 13px;
    color: var(--art-gray-600);
  }

  @media (width <= 1100px) {
    .create-layout {
      grid-template-columns: 1fr;
    }

    .summary-column {
      position: static;
      grid-row: 1;
    }
  }

  @media (width <= 768px) {
    .sticky-actions {
      right: 12px;
      bottom: 12px;
      left: 12px;
      flex-direction: column;
      align-items: stretch;

      .action-note {
        display: none;
      }

      .el-space {
        justify-content: flex-end;
      }
    }
  }

  @media (width <= 640px) {
    .game-create-page {
      padding-bottom: 112px;
    }

    .asset-grid {
      grid-template-columns: 1fr;

      > :last-child {
        grid-column: auto;
      }
    }

    .section-heading {
      flex-direction: column;
    }

    .sticky-actions .el-space {
      display: grid;
      grid-template-columns: 1fr 1fr;

      .el-button:first-child {
        display: none;
      }

      .el-button {
        width: 100%;
        margin: 0;
      }
    }
  }
</style>
