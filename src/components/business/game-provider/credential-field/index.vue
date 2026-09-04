<template>
  <ElCard shadow="never" class="credential-card">
    <div class="credential-heading">
      <div>
        <p>{{ environment.environment }} 環境</p>
        <h3>Credential</h3>
      </div>
      <GameProviderStatusTag :status="credential?.status || 'Not Issued'" />
    </div>

    <template v-if="credential">
      <div class="credential-grid">
        <div class="credential-row">
          <span>Credential ID</span>
          <strong>{{ credential.id }}</strong>
        </div>
        <div class="credential-row api-key-row">
          <span>API Key</span>
          <div>
            <code>{{ displayedApiKey }}</code>
            <ElButton link type="primary" @click="toggleApiKey">
              {{ showApiKey ? '遮罩' : '查看' }}
            </ElButton>
            <ElButton link type="primary" @click="copyText(credential.apiKey, 'API Key')">
              複製
            </ElButton>
          </div>
        </div>
        <div class="credential-row">
          <span>Key 指紋</span>
          <strong>{{ credential.fingerprint }}</strong>
        </div>
        <div class="credential-row">
          <span>簽章／API 版本</span>
          <strong>{{ credential.signatureVersion }}／{{ credential.apiVersion }}</strong>
        </div>
        <div class="credential-row">
          <span>核發／到期時間</span>
          <strong>{{ credential.issuedAt || '—' }}／{{ credential.expiresAt || '—' }}</strong>
        </div>
        <div class="credential-row">
          <span>Secret Key</span>
          <strong>無法再次查看；僅核發或輪替時顯示一次</strong>
        </div>
      </div>
      <div class="credential-actions">
        <ElButton @click="openAction('rotate')">輪替 Credential</ElButton>
        <ElButton type="danger" plain @click="openAction('revoke')">撤銷</ElButton>
      </div>
    </template>

    <div v-else class="empty-credential">
      <ArtSvgIcon icon="ri:key-2-line" />
      <div><strong>尚未核發 Credential</strong><p>核發後 Secret 只會顯示一次。</p></div>
      <ElButton type="primary" @click="openAction('issue')">核發 Credential</ElButton>
    </div>

    <ImpactPreviewModal
      v-model="impactVisible"
      :title="actionTitle"
      :summary="actionSummary"
      :items="impactItems"
      :allow-schedule="action !== 'issue'"
      @confirm="confirmAction"
    />

    <ElDialog
      v-model="secretVisible"
      title="Secret Key 僅顯示這一次"
      width="min(92vw, 620px)"
      :close-on-click-modal="false"
    >
      <ElAlert
        title="離開此視窗後將無法再次取得完整 Secret；請立即安全保存。"
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElInput :model-value="oneTimeSecret" readonly>
        <template #append>
          <ElButton @click="copyText(oneTimeSecret, 'Secret Key')">複製</ElButton>
        </template>
      </ElInput>
      <template #footer>
        <ElButton type="primary" @click="secretVisible = false">我已安全保存</ElButton>
      </template>
    </ElDialog>
  </ElCard>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { CredentialRecord, IntegrationEnvironmentConfig } from '@/types/game-provider'
  import GameProviderStatusTag from '../status-tag/index.vue'
  import ImpactPreviewModal from '../impact-preview-modal/index.vue'

  defineOptions({ name: 'CredentialField' })

  const props = defineProps<{ environment: IntegrationEnvironmentConfig }>()
  const emit = defineEmits<{ change: [credential: CredentialRecord | undefined] }>()
  const credential = ref<CredentialRecord | undefined>(
    props.environment.credential ? { ...props.environment.credential } : undefined
  )
  const showApiKey = ref(false)
  const impactVisible = ref(false)
  const secretVisible = ref(false)
  const action = ref<'issue' | 'rotate' | 'revoke'>('issue')
  const oneTimeSecret = ref('')

  const displayedApiKey = computed(() => {
    if (!credential.value) return '—'
    if (showApiKey.value) return credential.value.apiKey
    return `••••••••••••${credential.value.apiKey.slice(-6)}`
  })
  const actionTitle = computed(() => {
    if (action.value === 'issue') return `核發 ${props.environment.environment} Credential`
    if (action.value === 'rotate') return `輪替 ${props.environment.environment} Credential`
    return `撤銷 ${props.environment.environment} Credential`
  })
  const actionSummary = computed(() => {
    if (action.value === 'issue') return 'Secret Key 只會顯示一次，核發結果將寫入操作紀錄。'
    if (action.value === 'rotate') return '新 Key 生效後，舊 Key 將依排程失效；需同步通知商戶。'
    return '撤銷後此環境將無法使用現有 Credential 發送新請求。'
  })
  const impactItems = computed(() => [
    { label: '商戶線路', value: props.environment.id.replace(/-(SBX|PRD)$/, '') },
    { label: '環境', value: props.environment.environment },
    { label: 'API 版本', value: credential.value?.apiVersion || 'v2.0' },
    { label: '既有交易', value: '保留，不修改歷史紀錄' }
  ])

  watch(
    () => props.environment.credential,
    (nextCredential) => {
      credential.value = nextCredential ? { ...nextCredential } : undefined
    }
  )

  const openAction = (nextAction: 'issue' | 'rotate' | 'revoke') => {
    action.value = nextAction
    impactVisible.value = true
  }
  const toggleApiKey = () => {
    showApiKey.value = !showApiKey.value
    if (showApiKey.value) ElMessage.info('API Key 查看行為已記錄於操作紀錄')
  }
  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      ElMessage.success(`${label} 已複製，操作已寫入操作紀錄`)
    } catch {
      ElMessage.warning(`無法自動複製 ${label}，請手動選取`)
    }
  }
  const confirmAction = () => {
    if (action.value === 'revoke') {
      if (credential.value) credential.value.status = 'Revoked'
      emit('change', credential.value)
      ElMessage.success('Credential 撤銷申請已送審')
      return
    }

    const suffix = String(Date.now()).slice(-6)
    oneTimeSecret.value = `sk_demo_${props.environment.environment.toLowerCase()}_${suffix}_only_once`
    credential.value = {
      id:
        credential.value?.id ||
        `CR-${props.environment.environment === 'Sandbox' ? 'SBX' : 'PRD'}-${suffix}`,
      environment: props.environment.environment,
      apiKey: `gp_${props.environment.environment.toLowerCase()}_${suffix}`,
      fingerprint: `${props.environment.environment === 'Sandbox' ? 'SBX' : 'PRD'}:${suffix}:A9:7C`,
      apiVersion: credential.value?.apiVersion || 'v2.0',
      signatureVersion: credential.value?.signatureVersion || 'HMAC-SHA256',
      status: 'Active',
      issuedAt: credential.value?.issuedAt || '2026-08-31 17:30',
      rotatedAt: action.value === 'rotate' ? '2026-08-31 17:30' : undefined,
      expiresAt: '2027-08-31 17:30'
    }
    emit('change', credential.value)
    secretVisible.value = true
  }
</script>

<style scoped lang="scss">
  .credential-card {
    height: 100%;
  }

  .credential-heading,
  .credential-row,
  .empty-credential {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .credential-heading {
    margin-bottom: 16px;

    p,
    h3 {
      margin: 0;
    }

    p {
      margin-bottom: 4px;
      font-size: 11px;
      color: var(--theme-color);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  }

  .credential-grid {
    overflow: hidden;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .credential-row {
    min-height: 48px;
    padding: 10px 13px;
    border-bottom: 1px solid var(--art-gray-200);

    &:last-child {
      border-bottom: 0;
    }

    > span {
      font-size: 12px;
      color: var(--art-gray-600);
    }

    strong,
    code {
      font-size: 12px;
      text-align: right;
      word-break: break-all;
    }
  }

  .api-key-row > div {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    justify-content: flex-end;
  }

  .credential-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 14px;
  }

  .empty-credential {
    justify-content: flex-start;
    min-height: 190px;
    padding: 24px;
    background: var(--art-gray-100);
    border: 1px dashed var(--art-gray-300);
    border-radius: 10px;

    > .art-svg-icon {
      font-size: 28px;
      color: var(--theme-color);
    }

    div {
      flex: 1;
    }

    p {
      margin: 5px 0 0;
      color: var(--art-gray-600);
    }
  }

  @media (width <= 620px) {
    .credential-row,
    .empty-credential {
      flex-direction: column;
      align-items: flex-start;
    }

    .api-key-row > div {
      justify-content: flex-start;
    }
  }
</style>
