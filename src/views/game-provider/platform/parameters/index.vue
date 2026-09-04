<template>
  <div class="page">
    <AppPageHeader
      :title="isSecurity ? '登入安全' : '系統基本設定'"
      eyebrow="平台管理 · 系統參數"
      :description="
        isSecurity
          ? '統一管理密碼、帳號鎖定、MFA、工作階段與 IP 白名單規則。'
          : '管理平台識別、預設語系與時區、維護模式及紀錄保存週期。'
      "
    >
      <template #actions
        ><ElButton @click="showLogs = true">異動紀錄</ElButton
        ><ElButton @click="reset">還原</ElButton
        ><ElButton type="primary" @click="save">儲存設定</ElButton></template
      >
    </AppPageHeader>
    <ElAlert
      v-if="isSecurity"
      title="登入安全設定會影響所有後台帳號；正式環境變更後應通知使用者，並保留異動紀錄。"
      type="warning"
      :closable="false"
      show-icon
    /><ElAlert
      v-else
      title="維護模式只阻擋一般後台使用者；超級管理員仍可登入進行復原操作。"
      type="info"
      :closable="false"
      show-icon
    />

    <template v-if="!isSecurity">
      <div class="setting-grid"
        ><ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>平台識別</strong><span>顯示於登入頁與後台標題</span></div
            ></template
          ><ElForm label-position="top"
            ><ElFormItem label="平台名稱"><ElInput v-model="basicForm.platformName" /></ElFormItem
            ><div class="form-grid"
              ><ElFormItem label="平台代碼"><ElInput v-model="basicForm.platformCode" /></ElFormItem
              ><ElFormItem label="環境標示"
                ><ElInput v-model="basicForm.environmentLabel" /></ElFormItem></div
            ><ElFormItem label="客服聯絡信箱"
              ><ElInput v-model="basicForm.supportEmail" /></ElFormItem></ElForm
        ></ElCard>
        <ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>地區與顯示</strong><span>未指定偏好時使用</span></div
            ></template
          ><ElForm label-position="top"
            ><ElFormItem label="預設語系"
              ><ElSelect v-model="basicForm.defaultLanguage" class="full"
                ><ElOption
                  v-for="item in localeStore.availableLanguages"
                  :key="item.code"
                  :label="`${item.nativeName}｜${item.code}`"
                  :value="item.code" /></ElSelect></ElFormItem
            ><ElFormItem label="預設時區"
              ><ElSelect v-model="basicForm.defaultTimezone" filterable class="full"
                ><ElOption
                  v-for="item in localeStore.activeTimezones"
                  :key="item.id"
                  :label="`${item.name}｜${item.utcOffset}`"
                  :value="item.id" /></ElSelect></ElFormItem
            ><ElFormItem label="日期時間格式"
              ><ElSelect v-model="basicForm.dateFormat" class="full"
                ><ElOption label="YYYY/MM/DD HH:mm:ss" value="YYYY/MM/DD HH:mm:ss" /><ElOption
                  label="YYYY-MM-DD HH:mm:ss"
                  value="YYYY-MM-DD HH:mm:ss" /><ElOption
                  label="DD/MM/YYYY HH:mm:ss"
                  value="DD/MM/YYYY HH:mm:ss" /><ElOption
                  label="MM/DD/YYYY hh:mm:ss A"
                  value="MM/DD/YYYY hh:mm:ss A" /></ElSelect></ElFormItem
            ><div class="preview"
              ><span>顯示預覽</span><strong>{{ datePreview }}</strong></div
            ></ElForm
          ></ElCard
        >
        <ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>系統維護</strong><span>控制一般後台登入</span></div
            ></template
          ><ElForm label-position="top"
            ><ElFormItem label="維護模式"
              ><ElSwitch
                v-model="basicForm.maintenanceMode"
                active-text="啟用"
                inactive-text="關閉" /></ElFormItem
            ><ElFormItem label="維護訊息"
              ><ElInput
                v-model="basicForm.maintenanceMessage"
                type="textarea"
                :rows="4" /></ElFormItem
            ><ElAlert
              v-if="basicForm.maintenanceMode"
              title="儲存後一般使用者將無法登入後台。"
              type="error"
              :closable="false" /></ElForm
        ></ElCard>
        <ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>資料保存</strong><span>稽核與系統紀錄</span></div
            ></template
          ><ElForm label-position="top"
            ><ElFormItem label="紀錄保存天數"
              ><ElInputNumber
                v-model="basicForm.recordRetentionDays"
                :min="90"
                :max="3650"
                class="full"
              /><small>至少 90 天；正式期限應依所在地法規及公司政策確認。</small></ElFormItem
            ></ElForm
          ><ElDescriptions :column="1" border
            ><ElDescriptionsItem label="最近更新">{{
              store.basicSettings.updatedAt
            }}</ElDescriptionsItem
            ><ElDescriptionsItem label="更新人員">{{
              store.basicSettings.updatedBy
            }}</ElDescriptionsItem
            ><ElDescriptionsItem label="預計保存至"
              >自事件發生日起 {{ basicForm.recordRetentionDays }} 天</ElDescriptionsItem
            ></ElDescriptions
          ></ElCard
        ></div
      >
    </template>

    <template v-else>
      <div class="security-summary"
        ><div
          ><ArtSvgIcon icon="ri:lock-password-line" /><span
            ><strong>{{ securityForm.minimumPasswordLength }} 字元</strong
            ><small>最短密碼長度</small></span
          ></div
        ><div
          ><ArtSvgIcon icon="ri:error-warning-line" /><span
            ><strong>{{ securityForm.maximumFailedAttempts }} 次</strong
            ><small>失敗後鎖定</small></span
          ></div
        ><div
          ><ArtSvgIcon icon="ri:timer-line" /><span
            ><strong>{{ securityForm.sessionTimeoutMinutes }} 分鐘</strong
            ><small>工作階段逾時</small></span
          ></div
        ><div
          ><ArtSvgIcon icon="ri:shield-keyhole-line" /><span
            ><strong>{{ securityForm.forceMfaForSensitiveRoles ? '強制' : '選用' }}</strong
            ><small>敏感角色 MFA</small></span
          ></div
        ></div
      >
      <div class="setting-grid"
        ><ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>密碼原則</strong><span>建立與重設密碼時檢核</span></div
            ></template
          ><ElForm label-position="top"
            ><ElFormItem label="最短密碼長度"
              ><ElInputNumber
                v-model="securityForm.minimumPasswordLength"
                :min="8"
                :max="32" /></ElFormItem
            ><ElFormItem label="複雜度要求"
              ><div class="switch-list"
                ><label
                  ><span>至少一個大寫英文字母</span
                  ><ElSwitch v-model="securityForm.requireUppercase" /></label
                ><label
                  ><span>至少一個小寫英文字母</span
                  ><ElSwitch v-model="securityForm.requireLowercase" /></label
                ><label
                  ><span>至少一個數字</span><ElSwitch v-model="securityForm.requireNumber" /></label
                ><label
                  ><span>至少一個特殊符號</span
                  ><ElSwitch
                    v-model="securityForm.requireSpecialCharacter" /></label></div></ElFormItem
            ><div class="form-grid"
              ><ElFormItem label="密碼有效天數"
                ><ElInputNumber
                  v-model="securityForm.passwordExpiryDays"
                  :min="0"
                  :max="365"
                  class="full"
                /><small>0 代表永不強制到期</small></ElFormItem
              ><ElFormItem label="禁止重複最近密碼"
                ><ElInputNumber
                  v-model="securityForm.passwordHistoryCount"
                  :min="0"
                  :max="20"
                  class="full" /></ElFormItem></div></ElForm
        ></ElCard>
        <ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>登入與鎖定</strong><span>防止密碼暴力嘗試</span></div
            ></template
          ><ElForm label-position="top"
            ><div class="form-grid"
              ><ElFormItem label="最大失敗次數"
                ><ElInputNumber
                  v-model="securityForm.maximumFailedAttempts"
                  :min="3"
                  :max="10"
                  class="full" /></ElFormItem
              ><ElFormItem label="鎖定時間（分鐘）"
                ><ElInputNumber
                  v-model="securityForm.lockoutMinutes"
                  :min="5"
                  :max="1440"
                  class="full" /></ElFormItem></div
            ><ElFormItem label="異常登入通知"
              ><ElSwitch
                v-model="securityForm.loginAlertEnabled"
                active-text="啟用通知" /></ElFormItem
            ><ElAlert
              title="帳號達失敗上限後自動鎖定；管理員仍可至後台帳號頁手動解鎖。"
              type="info"
              :closable="false" /></ElForm
        ></ElCard>
        <ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>工作階段與 MFA</strong><span>控制登入後的存取風險</span></div
            ></template
          ><ElForm label-position="top"
            ><div class="form-grid"
              ><ElFormItem label="閒置逾時（分鐘）"
                ><ElInputNumber
                  v-model="securityForm.sessionTimeoutMinutes"
                  :min="5"
                  :max="480"
                  class="full" /></ElFormItem
              ><ElFormItem label="同時登入上限"
                ><ElInputNumber
                  v-model="securityForm.maximumConcurrentSessions"
                  :min="1"
                  :max="10"
                  class="full" /></ElFormItem></div
            ><ElFormItem label="敏感角色 MFA"
              ><ElSwitch
                v-model="securityForm.forceMfaForSensitiveRoles"
                active-text="強制啟用" /></ElFormItem></ElForm
        ></ElCard>
        <ElCard shadow="never"
          ><template #header
            ><div class="card-title"
              ><strong>IP 白名單</strong><span>限制後台登入來源</span></div
            ></template
          ><ElForm label-position="top"
            ><ElFormItem label="啟用 IP 白名單"
              ><ElSwitch
                v-model="securityForm.ipAllowlistEnabled"
                active-text="啟用"
                inactive-text="關閉" /></ElFormItem
            ><ElFormItem label="允許的 IP 或 CIDR"
              ><ElSelect
                v-model="securityForm.ipAllowlist"
                multiple
                filterable
                allow-create
                default-first-option
                class="full"
                :disabled="!securityForm.ipAllowlistEnabled"
                placeholder="輸入後按 Enter 新增" /></ElFormItem
            ><ElAlert
              v-if="securityForm.ipAllowlistEnabled"
              title="請先確認目前網路位址已在白名單內，避免儲存後無法再次登入。"
              type="warning"
              :closable="false" /></ElForm></ElCard
      ></div>
    </template>

    <ElDrawer v-model="showLogs" title="系統參數異動紀錄" size="min(760px, 94vw)"
      ><ElTable :data="store.settingLogs" border row-key="id"
        ><ElTableColumn prop="createdAt" label="時間" min-width="160" /><ElTableColumn
          label="設定類型"
          width="130"
          ><template #default="scope">{{
            scope.row.settingType === 'Basic' ? '基本設定' : '登入安全'
          }}</template></ElTableColumn
        ><ElTableColumn prop="action" label="操作" min-width="180" /><ElTableColumn
          prop="operator"
          label="操作人"
          width="130" /><ElTableColumn
          prop="beforeValue"
          label="修改前"
          min-width="180"
          show-overflow-tooltip /><ElTableColumn
          prop="afterValue"
          label="修改後"
          min-width="180"
          show-overflow-tooltip /></ElTable
    ></ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { usePlatformLocaleStore } from '@/store/modules/platformLocale'
  import { usePlatformSystemStore } from '@/store/modules/platformSystem'
  import type {
    PlatformBasicSettingsRecord,
    PlatformLoginSecuritySettings
  } from '@/types/game-provider'

  defineOptions({ name: 'PlatformSystemParameters' })
  const route = useRoute()
  const store = usePlatformSystemStore()
  const localeStore = usePlatformLocaleStore()
  const isSecurity = computed(() => route.name === 'PlatformLoginSecurity')
  const basicForm = reactive<PlatformBasicSettingsRecord>({ ...store.basicSettings })
  const securityForm = reactive<PlatformLoginSecuritySettings>({
    ...store.loginSecurity,
    ipAllowlist: [...store.loginSecurity.ipAllowlist]
  })
  const showLogs = ref(false)
  const datePreview = computed(() =>
    basicForm.dateFormat.startsWith('DD')
      ? '04/09/2026 14:30:25'
      : basicForm.dateFormat.startsWith('MM')
        ? '09/04/2026 02:30:25 PM'
        : basicForm.dateFormat.includes('-')
          ? '2026-09-04 14:30:25'
          : '2026/09/04 14:30:25'
  )
  const reset = () => {
    Object.assign(basicForm, store.basicSettings)
    Object.assign(securityForm, store.loginSecurity, {
      ipAllowlist: [...store.loginSecurity.ipAllowlist]
    })
    ElMessage.info('已還原為目前設定')
  }
  const save = async () => {
    if (isSecurity.value) {
      if (securityForm.ipAllowlistEnabled && !securityForm.ipAllowlist.length)
        return ElMessage.warning('啟用 IP 白名單時至少需要一筆允許來源')
      if (!securityForm.forceMfaForSensitiveRoles)
        await ElMessageBox.confirm(
          '關閉後，具有結算、權限管理等敏感操作的角色也可不使用 MFA。',
          '關閉敏感角色 MFA',
          { type: 'warning' }
        )
      store.saveLoginSecurity({ ...securityForm, ipAllowlist: [...securityForm.ipAllowlist] })
      ElMessage.success('登入安全設定已儲存')
      return
    }
    if (!basicForm.platformName.trim() || !basicForm.supportEmail.includes('@'))
      return ElMessage.warning('請填寫有效的平台名稱與客服信箱')
    if (basicForm.maintenanceMode && !store.basicSettings.maintenanceMode)
      await ElMessageBox.confirm(
        '儲存後一般使用者會立即無法登入，確定啟用維護模式？',
        '啟用維護模式',
        { type: 'warning' }
      )
    store.saveBasicSettings({ ...basicForm })
    ElMessage.success('系統基本設定已儲存')
  }
</script>

<style scoped>
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .setting-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  .card-title {
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  .card-title strong {
    font-size: 16px;
  }

  .card-title span {
    font-size: 13px;
    color: var(--art-gray-600);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .full {
    width: 100%;
  }

  small {
    display: block;
    margin-top: 5px;
    color: var(--art-gray-600);
  }

  .preview {
    padding: 14px;
    background: var(--art-gray-100);
    border-radius: 8px;
  }

  .preview span {
    display: block;
    font-size: 12px;
    color: var(--art-gray-600);
  }

  .preview strong {
    display: block;
    margin-top: 6px;
    font-size: 17px;
  }

  .security-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .security-summary > div {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 18px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .security-summary .art-svg-icon {
    font-size: 26px;
    color: var(--el-color-primary);
  }

  .security-summary span,
  .security-summary strong,
  .security-summary small {
    display: block;
  }

  .security-summary strong {
    font-size: 20px;
  }

  .switch-list {
    width: 100%;
  }

  .switch-list label {
    display: flex;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid var(--art-border-color);
  }

  .switch-list label:last-child {
    border-bottom: 0;
  }

  @media (width <= 1000px) {
    .security-summary {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (width <= 760px) {
    .setting-grid,
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 520px) {
    .security-summary {
      grid-template-columns: 1fr;
    }

    .card-title {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
