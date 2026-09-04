<template>
  <div v-if="riskCase" class="case-detail-page">
    <AppPageHeader
      :title="riskCase.title"
      eyebrow="風控案件詳細"
      :description="`案件編號：${riskCase.id} · 建立於 ${riskCase.openedAt}`"
    >
      <template #status>
        <ElTag :type="severityType(riskCase.severity)" effect="light"
          >{{ severityLabel(riskCase.severity) }}風險</ElTag
        >
        <ElTag :type="statusType(riskCase.status)" effect="light">{{
          statusLabel(riskCase.status)
        }}</ElTag>
      </template>
      <template #actions>
        <ElButton @click="router.push('/risk/cases')">返回列表</ElButton>
        <ElButton @click="assignCase">指派處理人</ElButton>
        <ElButton v-if="riskCase.status === 'Open'" type="warning" @click="startInvestigation"
          >開始調查</ElButton
        >
        <ElButton
          v-if="!['Resolved', 'Closed'].includes(riskCase.status)"
          type="primary"
          @click="resolveVisible = true"
          >完成調查</ElButton
        >
        <ElButton v-if="riskCase.status === 'Resolved'" type="success" @click="closeCurrentCase"
          >關閉案件</ElButton
        >
      </template>
    </AppPageHeader>

    <div class="summary-grid">
      <ElCard shadow="never"
        ><span>處理人</span><strong>{{ riskCase.assignee || '未指派' }}</strong
        ><small>案件責任人</small></ElCard
      >
      <ElCard shadow="never"
        ><span>優先級</span><strong>{{ priorityLabel(riskCase.priority) }}</strong
        ><small>{{ severityLabel(riskCase.severity) }}風險</small></ElCard
      >
      <ElCard shadow="never"
        ><span>關聯告警</span><strong>{{ riskCase.alertIds.length }}</strong
        ><small>案件調查來源</small></ElCard
      >
      <ElCard shadow="never"
        ><span>處理期限</span
        ><strong class="date-value" :class="{ overdue: isOverdue }">{{ riskCase.dueAt }}</strong
        ><small>{{ isOverdue ? '已逾期' : '期限內' }}</small></ElCard
      >
    </div>

    <ElCard shadow="never" class="content-card">
      <ElTabs v-model="activeTab">
        <ElTabPane label="基本資料" name="overview">
          <div class="tab-panel two-column">
            <section class="section-block">
              <div class="section-title"
                ><div><h3>案件摘要</h3><p>調查目的、責任人與時間資訊。</p></div></div
              >
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem label="案件分類">{{
                  categoryLabel(riskCase.category)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="案件狀態">{{
                  statusLabel(riskCase.status)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立人">{{ riskCase.openedBy }}</ElDescriptionsItem>
                <ElDescriptionsItem label="最後更新">{{ riskCase.updatedAt }}</ElDescriptionsItem>
                <ElDescriptionsItem label="案件說明" :span="descriptionColumns">{{
                  riskCase.description
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>
            <section class="section-block">
              <div class="section-title"
                ><div><h3>快速處理</h3><p>新增人工判讀與查核紀錄。</p></div></div
              >
              <ElInput
                v-model="note"
                type="textarea"
                :rows="5"
                placeholder="輸入查核結果、聯繫紀錄或下一步處理方式"
              />
              <ElButton
                class="note-button"
                type="primary"
                :disabled="note.trim().length < 4"
                @click="submitNote"
                >新增處理紀錄</ElButton
              >
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="關聯告警" name="alerts">
          <div class="tab-panel">
            <section class="section-block">
              <div class="section-title"
                ><div><h3>關聯告警</h3><p>案件可彙整一筆或多筆相同事件的告警。</p></div></div
              >
              <ElTable :data="relatedAlerts" border empty-text="尚無關聯告警">
                <ElTableColumn label="告警" min-width="240"
                  ><template #default="scope"
                    ><button class="primary-link" type="button" @click="openAlert(scope.row.id)"
                      ><strong>{{ scope.row.title }}</strong
                      ><small>{{ scope.row.id }} · {{ scope.row.subjectLabel }}</small></button
                    ></template
                  ></ElTableColumn
                >
                <ElTableColumn label="風險" width="100"
                  ><template #default="scope"
                    ><ElTag :type="severityType(scope.row.severity)">{{
                      severityLabel(scope.row.severity)
                    }}</ElTag></template
                  ></ElTableColumn
                >
                <ElTableColumn label="狀態" width="110"
                  ><template #default="scope">{{
                    alertStatusLabel(scope.row.status)
                  }}</template></ElTableColumn
                >
                <ElTableColumn label="發生時間" prop="occurredAt" width="155" />
                <ElTableColumn label="操作" width="90"
                  ><template #default="scope"
                    ><ElButton link type="primary" @click="openAlert(scope.row.id)"
                      >查看</ElButton
                    ></template
                  ></ElTableColumn
                >
              </ElTable>
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="關聯資料" name="relations">
          <div class="tab-panel relation-grid">
            <section v-for="group in relationGroups" :key="group.label" class="section-block">
              <div class="relation-heading"
                ><ArtSvgIcon :icon="group.icon" /><div
                  ><h3>{{ group.label }}</h3
                  ><small>{{ group.items.length }} 筆</small></div
                ></div
              >
              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="relation-link"
                @click="openRelation(group.type, item.id, item.index)"
                ><span>{{ item.id }}</span
                ><ArtSvgIcon icon="ri:arrow-right-line"
              /></button>
              <ElEmpty v-if="!group.items.length" description="沒有關聯資料" :image-size="54" />
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="處理紀錄" name="logs">
          <div class="tab-panel">
            <section class="section-block">
              <div class="section-title"
                ><div
                  ><h3>案件處理時間軸</h3><p>所有狀態、指派、備註與結案操作均不可覆寫。</p></div
                ></div
              >
              <ElTimeline>
                <ElTimelineItem
                  v-for="item in caseLogs"
                  :key="item.id"
                  :timestamp="item.time"
                  placement="top"
                  :type="
                    item.after === 'Resolved' || item.after === 'Closed' ? 'success' : 'primary'
                  "
                >
                  <ElCard shadow="never" class="log-card"
                    ><strong>{{ item.action }}</strong
                    ><p>{{ item.reason }}</p
                    ><small
                      >{{ auditStateLabel(item.before) }} → {{ auditStateLabel(item.after) }} ·
                      {{ item.operator }}</small
                    ></ElCard
                  >
                </ElTimelineItem>
              </ElTimeline>
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="案件結果" name="result">
          <div class="tab-panel">
            <section class="section-block result-block">
              <div class="section-title"
                ><div><h3>調查結論</h3><p>完成調查後才可關閉案件。</p></div></div
              >
              <template v-if="riskCase.conclusion">
                <div
                  ><span>調查結論</span><p>{{ riskCase.conclusion }}</p></div
                >
                <div
                  ><span>處理方式</span><p>{{ riskCase.resolution }}</p></div
                >
                <div v-if="riskCase.closedAt"
                  ><span>關閉時間</span><p>{{ riskCase.closedAt }}</p></div
                >
              </template>
              <ElEmpty v-else description="案件尚在調查中，暫無正式結論" />
            </section>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog
      v-model="resolveVisible"
      title="完成案件調查"
      width="min(92vw, 620px)"
      destroy-on-close
    >
      <ElAlert
        title="送出後會同步將案件內未排除的告警標記為已解決。"
        type="warning"
        :closable="false"
        show-icon
      />
      <ElForm label-position="top" class="resolve-form">
        <ElFormItem label="調查結論" required
          ><ElInput
            v-model="resolveForm.conclusion"
            type="textarea"
            :rows="3"
            placeholder="說明風險是否成立與判斷依據"
        /></ElFormItem>
        <ElFormItem label="處理方式" required
          ><ElInput
            v-model="resolveForm.resolution"
            type="textarea"
            :rows="3"
            placeholder="說明後續處置、監控或規則調整"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="resolveVisible = false">取消</ElButton
        ><ElButton type="primary" @click="submitResolution">確認完成</ElButton></template
      >
    </ElDialog>
  </div>

  <ElResult v-else icon="warning" title="找不到風控案件" sub-title="案件可能已不存在或網址有誤">
    <template #extra
      ><ElButton type="primary" @click="router.push('/risk/cases')"
        >返回案件列表</ElButton
      ></template
    >
  </ElResult>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    RiskAlertCategory,
    RiskAlertStatus,
    RiskCaseRecord,
    RiskCaseStatus,
    RiskSeverity
  } from '@/types/game-provider'
  import { useRiskCenterStore } from '@/store/modules/riskCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'

  defineOptions({ name: 'RiskCaseDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useRiskCenterStore()
  const { width } = useWindowSize()
  const activeTab = ref(String(route.query.tab || 'overview'))
  const note = ref('')
  const resolveVisible = ref(false)
  const resolveForm = reactive({ conclusion: '', resolution: '' })
  const descriptionColumns = computed(() => (width.value < 680 ? 1 : 2))
  const riskCase = computed(() => store.findCase(String(route.params.id)))
  const relatedAlerts = computed(() =>
    riskCase.value ? riskCase.value.alertIds.map(store.findAlert).filter(Boolean) : []
  )
  const caseLogs = computed(() => (riskCase.value ? store.getCaseLogs(riskCase.value.id) : []))
  const isOverdue = computed(() =>
    riskCase.value
      ? !['Resolved', 'Closed'].includes(riskCase.value.status) &&
        new Date(riskCase.value.dueAt.replace(' ', 'T')).getTime() < Date.now()
      : false
  )
  const categories: Record<RiskAlertCategory, string> = {
    Member: '會員異常',
    Bet: '注單異常',
    Transaction: '交易異常',
    'Merchant Line': '商戶線路異常',
    Game: '遊戲異常',
    Jackpot: '獎池異常'
  }
  const statuses: Record<RiskCaseStatus, string> = {
    Open: '待處理',
    Investigating: '調查中',
    'Pending Decision': '待決議',
    Resolved: '已完成',
    Closed: '已關閉'
  }
  const severityNames: Record<RiskSeverity, string> = {
    Critical: '嚴重',
    High: '高',
    Medium: '中',
    Low: '低'
  }
  const alertStatuses: Record<RiskAlertStatus, string> = {
    New: '新告警',
    Acknowledged: '已確認',
    Investigating: '調查中',
    Resolved: '已解決',
    'False Positive': '誤報',
    Dismissed: '已忽略'
  }
  const categoryLabel = (value: RiskAlertCategory) => categories[value]
  const statusLabel = (value: RiskCaseStatus) => statuses[value]
  const severityLabel = (value: RiskSeverity) => severityNames[value]
  const alertStatusLabel = (value: RiskAlertStatus) => alertStatuses[value]
  const severityType = (value: RiskSeverity) =>
    value === 'Critical' || value === 'High' ? 'danger' : value === 'Medium' ? 'warning' : 'info'
  const statusType = (value: RiskCaseStatus) =>
    value === 'Resolved' || value === 'Closed'
      ? 'success'
      : value === 'Investigating'
        ? 'warning'
        : value === 'Open'
          ? 'danger'
          : 'primary'
  const priorityLabel = (value: RiskCaseRecord['priority']) =>
    ({ Low: '低', Normal: '一般', High: '高', Urgent: '緊急' })[value]
  const auditStateLabel = (value: string) =>
    ({
      None: '無',
      Open: '待處理',
      Investigating: '調查中',
      'Pending Decision': '待決議',
      Resolved: '已完成',
      Closed: '已關閉'
    })[value] || value
  const relationGroups = computed(() => {
    if (!riskCase.value) return []
    const item = riskCase.value
    return [
      {
        label: '會員',
        type: 'member',
        icon: 'ri:user-search-line',
        items: item.memberIds.map((id, index) => ({ id, index }))
      },
      {
        label: '注單',
        type: 'bet',
        icon: 'ri:file-list-3-line',
        items: item.betIds.map((id, index) => ({ id, index }))
      },
      {
        label: '交易',
        type: 'transaction',
        icon: 'ri:exchange-dollar-line',
        items: item.transactionIds.map((id, index) => ({ id, index }))
      },
      {
        label: '商戶線路',
        type: 'line',
        icon: 'ri:links-line',
        items: item.lineUids.map((id, index) => ({ id, index }))
      },
      {
        label: '遊戲',
        type: 'game',
        icon: 'ri:gamepad-line',
        items: item.gameIds.map((id, index) => ({ id, index }))
      },
      {
        label: '獎池',
        type: 'pool',
        icon: 'ri:funds-line',
        items: item.poolIds.map((id, index) => ({ id, index }))
      }
    ]
  })
  const openAlert = (id: string) => router.push({ path: '/risk/alerts', query: { alertId: id } })
  const openRelation = (type: string, id: string, index: number) => {
    if (!riskCase.value) return
    if (type === 'member') router.push(`/members/management/${id}`)
    if (type === 'bet') router.push(`/transactions/bets/${id}`)
    if (type === 'transaction') router.push(`/transactions/records/${id}`)
    if (type === 'line')
      router.push(`/business/merchants/${riskCase.value.merchantIds[index]}/lines/${id}`)
    if (type === 'game') router.push(`/games/management/${id}`)
    if (type === 'pool') router.push(`/jackpots/${id}`)
  }
  const assignCase = async () => {
    if (!riskCase.value) return
    const result = await ElMessageBox.prompt('請輸入案件處理人', '指派處理人', {
      inputValue: riskCase.value.assignee || 'Risk Analyst A',
      inputPattern: /.{2,}/,
      inputErrorMessage: '處理人至少 2 個字',
      confirmButtonText: '確認指派',
      cancelButtonText: '取消'
    }).catch(() => null)
    if (!result) return
    store.assignCase(riskCase.value.id, result.value, '人工指派案件責任人')
    ElMessage.success('案件處理人已更新')
  }
  const startInvestigation = () => {
    if (riskCase.value && store.startCaseInvestigation(riskCase.value.id))
      ElMessage.success('案件已進入調查中')
  }
  const submitNote = () => {
    if (riskCase.value && store.addCaseNote(riskCase.value.id, note.value)) {
      note.value = ''
      ElMessage.success('處理紀錄已新增')
      activeTab.value = 'logs'
    }
  }
  const submitResolution = () => {
    if (!riskCase.value) return
    if (!store.resolveCase(riskCase.value.id, resolveForm.conclusion, resolveForm.resolution))
      return ElMessage.warning('請完整填寫調查結論與處理方式')
    resolveVisible.value = false
    activeTab.value = 'result'
    ElMessage.success('案件調查已完成，關聯告警已同步更新')
  }
  const closeCurrentCase = async () => {
    if (!riskCase.value) return
    const result = await ElMessageBox.prompt('請輸入關閉案件的補充說明', '關閉案件', {
      inputPattern: /.{4,}/,
      inputErrorMessage: '說明至少 4 個字',
      confirmButtonText: '確認關閉',
      cancelButtonText: '取消'
    }).catch(() => null)
    if (result && store.closeCase(riskCase.value.id, result.value)) ElMessage.success('案件已關閉')
  }
</script>

<style scoped lang="scss">
  .case-detail-page {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .summary-grid :deep(.el-card__body) {
    display: grid;
    gap: 5px;
  }

  .summary-grid span,
  .summary-grid small,
  .section-title p,
  .relation-heading small,
  .result-block span {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 20px;
    color: var(--art-gray-900);
  }

  .summary-grid .date-value {
    font-size: 15px;
  }

  .summary-grid .overdue {
    color: var(--el-color-danger);
  }

  .content-card :deep(.el-card__body) {
    padding: 0;
  }

  .content-card :deep(.el-tabs__header) {
    padding: 0 20px;
    margin: 0;
  }

  .tab-panel {
    padding: 20px;
  }

  .two-column {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.7fr);
    gap: 16px;
  }

  .section-block {
    padding: 18px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title h3,
  .section-title p,
  .relation-heading h3,
  .log-card p,
  .result-block p {
    margin: 0;
  }

  .section-title p {
    margin-top: 4px;
    font-size: 13px;
  }

  .note-button {
    width: 100%;
    margin-top: 12px;
  }

  .primary-link {
    display: grid;
    gap: 3px;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .primary-link:hover strong {
    color: var(--el-color-primary);
  }

  .relation-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .relation-heading {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
  }

  .relation-heading svg {
    font-size: 22px;
    color: var(--el-color-primary);
  }

  .relation-link {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 0;
    color: var(--el-color-primary);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--art-gray-200);
  }

  .log-card p {
    margin: 7px 0;
  }

  .result-block > div:not(.section-title) {
    padding: 15px;
    margin-top: 12px;
    background: var(--art-gray-100);
    border-radius: 8px;
  }

  .result-block p {
    margin-top: 6px;
    line-height: 1.65;
  }

  .resolve-form {
    margin-top: 18px;
  }

  @media (width <= 960px) {
    .relation-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .two-column {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 680px) {
    .summary-grid,
    .relation-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
