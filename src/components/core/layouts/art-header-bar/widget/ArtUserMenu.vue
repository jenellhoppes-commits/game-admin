<!-- 使用者選單 -->
<template>
  <ElPopover
    ref="userMenuPopover"
    placement="bottom-end"
    :width="240"
    :hide-after="0"
    :offset="10"
    trigger="hover"
    :show-arrow="false"
    popper-class="user-menu-popover"
  >
    <template #reference>
      <img class="user-menu-avatar-trigger" src="@imgs/user/avatar.webp" alt="avatar" />
    </template>

    <template #default>
      <div class="user-menu-panel">
        <div class="user-profile">
          <img class="user-profile__avatar" src="@imgs/user/avatar.webp" alt="" />
          <div class="user-profile__content">
            <span class="user-profile__name">{{ userInfo.userName }}</span>
            <span class="user-profile__email">{{ userInfo.email }}</span>
          </div>
        </div>

        <div class="menu-section menu-section--account">
          <button class="menu-item" type="button" @click="goPage('/platform/access/accounts')">
            <ArtSvgIcon icon="ri:user-settings-line" />
            <span>帳號與權限</span>
            <ArtSvgIcon class="menu-item__arrow" icon="ri:arrow-right-s-line" />
          </button>
        </div>

        <div class="menu-section menu-section--preferences">
          <p class="menu-section__title">顯示偏好</p>

          <button class="menu-item" type="button" @click="toggleThemePreference">
            <ArtSvgIcon :icon="isDark ? 'ri:sun-line' : 'ri:moon-line'" />
            <span>{{ isDark ? '切換淺色模式' : '切換深色模式' }}</span>
          </button>

          <button class="menu-item" type="button" @click="toggleFullScreen">
            <ArtSvgIcon :icon="isFullscreen ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'" />
            <span>{{ isFullscreen ? '退出全螢幕' : '全螢幕顯示' }}</span>
          </button>

          <div class="menu-item menu-item--language">
            <ArtSvgIcon icon="ri:translate-2" />
            <span>介面語言</span>
            <ElSelect
              v-model="locale"
              class="language-select"
              popper-class="user-menu-language-popper"
              :teleported="false"
              @change="changeLanguage"
            >
              <ElOption
                v-for="item in menuLanguageOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </ElSelect>
          </div>
        </div>

        <div class="menu-section menu-section--logout">
          <button class="menu-item menu-item--danger" type="button" @click="loginOut">
            <ArtSvgIcon icon="ri:logout-box-r-line" />
            <span>登出</span>
          </button>
        </div>
      </div>
    </template>
  </ElPopover>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useFullscreen } from '@vueuse/core'
  import { ElMessageBox } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { useSettingStore } from '@/store/modules/setting'
  import { languageOptions } from '@/locales'
  import { LanguageEnum } from '@/enums/appEnum'
  import { themeAnimation } from '@/utils/ui/animation'

  defineOptions({ name: 'ArtUserMenu' })

  const router = useRouter()
  const { t, locale } = useI18n()
  const userStore = useUserStore()
  const settingStore = useSettingStore()
  const { getUserInfo: userInfo } = storeToRefs(userStore)
  const { isDark } = storeToRefs(settingStore)
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
  const userMenuPopover = ref()

  const menuLanguageOptions = languageOptions.map((item) => ({
    ...item,
    label: item.value === LanguageEnum.ZH ? '繁體中文' : item.label
  }))

  const goPage = (path: string): void => {
    closeUserMenu()
    router.push(path)
  }

  const toggleThemePreference = (event: MouseEvent): void => {
    closeUserMenu()
    themeAnimation(event)
  }

  const toggleFullScreen = (): void => {
    toggleFullscreen()
  }

  const changeLanguage = (lang: LanguageEnum): void => {
    if (userStore.language === lang) return
    userStore.setLanguage(lang)
    locale.value = lang
  }

  const loginOut = (): void => {
    closeUserMenu()
    setTimeout(() => {
      ElMessageBox.confirm(t('common.logOutTips'), t('common.tips'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        customClass: 'login-out-dialog'
      }).then(() => {
        userStore.logOut()
      })
    }, 200)
  }

  const closeUserMenu = (): void => {
    setTimeout(() => {
      userMenuPopover.value?.hide()
    }, 100)
  }
</script>

<style scoped lang="scss">
  :global(.user-menu-popover.el-popover.el-popper) {
    padding: 0 !important;
    overflow: hidden;
    background: var(--default-box-color) !important;
    border: 1px solid var(--art-gray-300) !important;
    border-radius: 9px !important;
    box-shadow: 0 14px 30px rgb(0 0 0 / 24%) !important;
  }

  :global(.dark .user-menu-popover.el-popover.el-popper) {
    background: #1b1b1e !important;
  }

  .user-menu-avatar-trigger {
    width: 34px;
    height: 34px;
    margin-right: 20px;
    overflow: hidden;
    cursor: pointer;
    object-fit: cover;
    border-radius: 50%;
  }

  .user-menu-panel {
    color: var(--art-gray-900);
  }

  .user-profile {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 62px;
    padding: 12px 16px 10px;
  }

  .user-profile__avatar {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    margin-right: 12px;
    object-fit: cover;
    border-radius: 50%;
  }

  .user-profile__content {
    min-width: 0;
  }

  .user-profile__name,
  .user-profile__email {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-profile__name {
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    color: var(--art-gray-900);
  }

  .user-profile__email {
    margin-top: 2px;
    font-size: 12px;
    line-height: 18px;
    color: var(--art-gray-500);
  }

  .menu-section {
    padding: 8px 12px;
  }

  .menu-section--account,
  .menu-section--preferences {
    position: relative;
  }

  .user-profile::after,
  .menu-section--account::after,
  .menu-section--preferences::after {
    position: absolute;
    right: 16px;
    bottom: 0;
    left: 16px;
    height: 1px;
    content: '';
    background: var(--art-gray-300);
  }

  .menu-section--preferences {
    padding-top: 10px;
    padding-bottom: 8px;
  }

  .menu-section--logout {
    padding-top: 8px;
    padding-bottom: 12px;
  }

  .menu-section__title {
    padding: 0 12px 6px;
    margin: 0;
    font-size: 12px;
    line-height: 18px;
    color: var(--art-gray-500);
  }

  .menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 40px;
    padding: 0 12px;
    font: inherit;
    font-size: 14px;
    line-height: 20px;
    color: var(--art-gray-900);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 6px;
    transition:
      color 0.15s ease,
      background-color 0.15s ease;

    :deep(.art-svg-icon) {
      flex: 0 0 auto;
      width: 16px;
      height: 16px;
      margin-right: 10px;
      font-size: 16px;
      color: var(--art-gray-700);
    }

    &:hover {
      color: var(--art-gray-900);
      background: var(--art-gray-200);
    }
  }

  .menu-item__arrow {
    margin-right: 0 !important;
    margin-left: auto;
    color: var(--art-gray-500) !important;
  }

  .menu-item--language {
    cursor: default;

    &:hover {
      background: transparent;
    }
  }

  .language-select {
    width: 104px;
    margin-left: auto;

    :deep(.el-select__wrapper) {
      min-height: 26px;
      padding: 2px 9px;
      background: transparent;
      border-radius: 6px;
      box-shadow: 0 0 0 1px var(--art-gray-400) inset !important;
    }

    :deep(.el-select__selected-item) {
      font-size: 12px;
      color: var(--art-gray-800);
    }

    :deep(.el-select__caret) {
      font-size: 13px;
      color: var(--art-gray-500);
    }
  }

  .menu-item--danger {
    color: var(--el-color-danger);

    :deep(.art-svg-icon) {
      color: var(--el-color-danger);
    }

    &:hover {
      color: var(--el-color-danger);
      background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
    }
  }

  @media screen and (width <= 640px) {
    .user-menu-avatar-trigger {
      width: 26px;
      height: 26px;
      margin-right: 16px;
    }
  }
</style>
