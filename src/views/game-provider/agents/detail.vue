<template>
  <div v-if="agent" class="agent-detail-page">
    <AppPageHeader
      :title="agent.name"
      eyebrow="商務中心／代理詳細"
      :description="`${agent.code} · Agent ID ${agent.id}`"
      :status="agent.status"
    >
      <template #actions
        ><ElButton @click="router.push('/business/agents')">返回列表</ElButton
        ><ElButton @click="openBasicEditor">編輯基本資料</ElButton
        ><ElButton v-if="agent.level !== 'L3'" type="primary" plain @click="createChild"
          >建立下級代理</ElButton
        ><ElDropdown trigger="click" @command="handleHeaderCommand"
          ><ElButton type="primary"
            >狀態操作<ArtSvgIcon icon="ri:arrow-down-s-line" class="ml-1" /></ElButton
          ><template #dropdown
            ><ElDropdownMenu
              ><ElDropdownItem command="activate" :disabled="agent.status === 'Active'"
                >啟用代理</ElDropdownItem
              ><ElDropdownItem command="disable" :disabled="agent.status === 'Disabled'" divided
                >停用代理</ElDropdownItem
              ></ElDropdownMenu
            ></template
          ></ElDropdown
        ></template
      >
    </AppPageHeader>

    <div class="summary-grid">
      <ElCard v-for="item in summaryItems" :key="item.label" shadow="never"
        ><span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small></ElCard
      >
    </div>

    <ElCard class="tabs-card">
      <ElTabs v-model="activeTab" @tab-change="syncTab">
        <ElTabPane label="基本資料" name="overview">
          <div class="tab-panel">
            <div class="panel-toolbar"
              ><div><h2>代理主檔</h2><p>代理識別、聯絡資料及合作資訊。</p></div
              ><ElButton type="primary" @click="openBasicEditor">編輯基本資料</ElButton></div
            >
            <ElDescriptions :column="descriptionColumns" border>
              <ElDescriptionsItem label="Agent ID">{{ agent.id }}</ElDescriptionsItem
              ><ElDescriptionsItem label="代理代碼">{{ agent.code }}</ElDescriptionsItem>
              <ElDescriptionsItem label="代理名稱">{{ agent.name }}</ElDescriptionsItem
              ><ElDescriptionsItem label="代理層級">{{ agent.level }}</ElDescriptionsItem>
              <ElDescriptionsItem label="上級代理">{{ agent.parentAgent }}</ElDescriptionsItem
              ><ElDescriptionsItem label="主要聯絡人">{{ agent.contact }}</ElDescriptionsItem>
              <ElDescriptionsItem label="聯絡方式">{{
                agent.contactMethod || '—'
              }}</ElDescriptionsItem
              ><ElDescriptionsItem label="合作開始日">{{
                agent.cooperationStartDate || '—'
              }}</ElDescriptionsItem>
              <ElDescriptionsItem label="狀態"
                ><GameProviderStatusTag :status="agent.status" /></ElDescriptionsItem
              ><ElDescriptionsItem label="最後修改">{{ agent.updatedAt }}</ElDescriptionsItem>
              <ElDescriptionsItem label="內部備註" :span="descriptionColumns">{{
                agent.note || '—'
              }}</ElDescriptionsItem>
            </ElDescriptions>
            <ElAlert :title="hierarchyRule" type="info" :closable="false" show-icon />
          </div>
        </ElTabPane>

        <ElTabPane label="代理關係" name="relations">
          <div class="tab-panel">
            <div class="panel-toolbar"
              ><div><h2>代理關係</h2><p>以 Agent ID 維護父子關係，最多三級且不得形成循環。</p></div
              ><ElSpace
                ><ElButton v-if="agent.level !== 'L1'" @click="openParentDialog"
                  >調整上級代理</ElButton
                ><ElButton v-if="agent.level !== 'L3'" type="primary" @click="createChild"
                  >建立下級代理</ElButton
                ></ElSpace
              ></div
            >
            <div class="relationship-path"
              ><div
                v-for="item in hierarchyPath"
                :key="item.id"
                class="path-card"
                :class="{ current: item.id === agent.id }"
                ><ElTag effect="plain">{{ item.level }}</ElTag
                ><strong>{{ item.name }}</strong
                ><span>{{ item.code }}</span></div
              ></div
            >
            <div class="relationship-summary"
              ><div
                ><span>直接下級</span><strong>{{ directChildren.length }}</strong></div
              ><div
                ><span>全部轄下代理</span><strong>{{ descendants.length }}</strong></div
              ><div
                ><span>直屬商戶</span><strong>{{ directMerchants.length }}</strong></div
              ><div
                ><span>轄下商戶總數</span><strong>{{ allMerchants.length }}</strong></div
              ></div
            >
            <ElTable :data="directChildren" border empty-text="目前沒有直接下級代理"
              ><ElTableColumn label="代理" min-width="230"
                ><template #default="{ row }"
                  ><EntityLink
                    :label="row.name"
                    :secondary="`${row.code} · ${row.id}`"
                    :to="`/business/agents/${row.id}`" /></template></ElTableColumn
              ><ElTableColumn prop="level" label="層級" width="80" /><ElTableColumn
                prop="merchantCount"
                label="直屬商戶"
                width="110"
              /><ElTableColumn label="狀態" width="110"
                ><template #default="{ row }"
                  ><GameProviderStatusTag :status="row.status" /></template></ElTableColumn
              ><ElTableColumn label="操作" width="100"
                ><template #default="{ row }"
                  ><ElButton link type="primary" @click="router.push(`/business/agents/${row.id}`)"
                    >查看</ElButton
                  ></template
                ></ElTableColumn
              ></ElTable
            >
          </div>
        </ElTabPane>

        <ElTabPane label="商務條件" name="terms">
          <div class="tab-panel">
            <div class="panel-toolbar"
              ><div
                ><h2>商務條件版本</h2><p>已生效版本不可覆寫；修改條件必須建立下一個版本。</p></div
              ><ElButton type="primary" @click="openTermDrawer">新增下一版本</ElButton></div
            >
            <ElAlert
              title="結算公式尚未定案；目前只保存結算基礎、代理條件、幣別與週期。"
              type="info"
              :closable="false"
              show-icon
            />
            <ElTable :data="terms" border
              ><ElTableColumn label="版本" width="75"
                ><template #default="{ row }">V{{ row.version }}</template></ElTableColumn
              ><ElTableColumn label="結算基礎" width="110"
                ><template #default="{ row }">{{
                  basisText(row.settlementBasis)
                }}</template></ElTableColumn
              ><ElTableColumn label="代理條件" width="105"
                ><template #default="{ row }"
                  ><strong>{{ row.ratePercent }}%</strong></template
                ></ElTableColumn
              ><ElTableColumn
                prop="settlementCurrency"
                label="結算幣別"
                width="100"
              /><ElTableColumn label="結算週期" width="100"
                ><template #default="{ row }">{{
                  cycleText(row.settlementCycle)
                }}</template></ElTableColumn
              ><ElTableColumn prop="effectiveFrom" label="生效日期" width="115" /><ElTableColumn
                label="狀態"
                width="105"
                ><template #default="{ row }"
                  ><GameProviderStatusTag
                    :status="termStatusTag(row.status)" /></template></ElTableColumn
              ><ElTableColumn prop="reason" label="建立原因" min-width="180" /><ElTableColumn
                label="操作"
                width="120"
                fixed="right"
                ><template #default="{ row }"
                  ><ElButton
                    v-if="row.status === 'Draft'"
                    link
                    type="primary"
                    @click="openActivateTerm(row)"
                    >設為生效</ElButton
                  ><span v-else>—</span></template
                ></ElTableColumn
              ></ElTable
            >
          </div>
        </ElTabPane>

        <ElTabPane name="merchants"
          ><template #label
            ><span>所屬商戶</span><ElBadge :value="allMerchants.length" class="tab-badge"
          /></template>
          <div class="tab-panel"
            ><div class="panel-toolbar"
              ><div><h2>所屬商戶</h2><p>預設顯示直屬商戶，也可檢視所有下級代理的轄下商戶。</p></div
              ><ElRadioGroup v-model="merchantScope" size="small"
                ><ElRadioButton value="direct">直屬商戶</ElRadioButton
                ><ElRadioButton value="all">全部轄下</ElRadioButton></ElRadioGroup
              ></div
            ><ElTable :data="visibleMerchants" border empty-text="目前沒有商戶"
              ><ElTableColumn prop="id" label="Merchant ID" width="120" /><ElTableColumn
                label="商戶"
                min-width="200"
                ><template #default="{ row }"
                  ><EntityLink
                    :label="row.name"
                    :secondary="row.code"
                    :to="`/business/merchants/${row.id}`" /></template></ElTableColumn
              ><ElTableColumn prop="agentName" label="所屬代理" min-width="140" /><ElTableColumn
                label="商戶條件"
                width="110"
                ><template #default="{ row }"
                  >{{ row.merchantTermPercent }}%</template
                ></ElTableColumn
              ><ElTableColumn label="代理價差" width="105"
                ><template #default="{ row }"
                  >{{ (row.merchantTermPercent - row.agentTermPercent).toFixed(2) }}%</template
                ></ElTableColumn
              ><ElTableColumn label="線路數" width="85"
                ><template #default="{ row }">{{ row.lines.length }}</template></ElTableColumn
              ><ElTableColumn label="狀態" width="110"
                ><template #default="{ row }"
                  ><GameProviderStatusTag
                    :status="row.status" /></template></ElTableColumn></ElTable
          ></div>
        </ElTabPane>

        <ElTabPane label="對帳" name="reconciliation">
          <div class="tab-panel"
            ><div class="panel-toolbar"
              ><div
                ><h2>代理對帳摘要</h2
                ><p>提供期間摘要與預估結果；正式處理仍由對帳／結算中心執行。</p></div
              ><ElButton @click="router.push('/finance/reconciliation/agents')"
                >前往代理對帳</ElButton
              ></div
            ><div class="reconciliation-summary"
              ><div
                ><span>本期投注</span
                ><strong>{{ money(latestReconciliation?.betAmount) }}</strong></div
              ><div
                ><span>本期 GGR</span><strong>{{ money(latestReconciliation?.ggr) }}</strong></div
              ><div
                ><span>代理條件</span
                ><strong>{{ latestReconciliation?.ratePercent || 0 }}%</strong></div
              ><div
                ><span>預估代理收益</span
                ><strong>{{ money(latestReconciliation?.estimatedRevenue) }}</strong></div
              ></div
            ><ElTable :data="reconciliations" border
              ><ElTableColumn prop="period" label="對帳期間" width="105" /><ElTableColumn
                label="結算基礎"
                width="105"
                ><template #default="{ row }">{{
                  basisText(row.settlementBasis)
                }}</template></ElTableColumn
              ><ElTableColumn label="投注" min-width="130" align="right"
                ><template #default="{ row }">{{
                  money(row.betAmount, row.currency)
                }}</template></ElTableColumn
              ><ElTableColumn label="派彩" min-width="130" align="right"
                ><template #default="{ row }">{{
                  money(row.winAmount, row.currency)
                }}</template></ElTableColumn
              ><ElTableColumn label="GGR" min-width="125" align="right"
                ><template #default="{ row }">{{
                  money(row.ggr, row.currency)
                }}</template></ElTableColumn
              ><ElTableColumn label="預估收益" min-width="130" align="right"
                ><template #default="{ row }"
                  ><strong>{{ money(row.estimatedRevenue, row.currency) }}</strong></template
                ></ElTableColumn
              ><ElTableColumn label="匯率" width="95"
                ><template #default="{ row }"
                  ><ElTag
                    :type="row.exchangeRateStatus === 'Locked' ? 'success' : 'warning'"
                    effect="light"
                    >{{ row.exchangeRateStatus === 'Locked' ? '已鎖定' : '預估' }}</ElTag
                  ></template
                ></ElTableColumn
              ><ElTableColumn label="狀態" width="100"
                ><template #default="{ row }">{{
                  reconciliationStatusText(row.status)
                }}</template></ElTableColumn
              ></ElTable
            ></div
          >
        </ElTabPane>

        <ElTabPane label="異動紀錄" name="logs"
          ><div class="tab-panel"
            ><div class="panel-toolbar"
              ><div><h2>異動紀錄</h2><p>代理主檔、上下級關係、條件版本與狀態操作均可追溯。</p></div
              ><ElInput
                v-model="logKeyword"
                clearable
                placeholder="搜尋操作、原因或人員"
                class="log-search" /></div
            ><ElTimeline v-if="filteredLogs.length"
              ><ElTimelineItem
                v-for="log in filteredLogs"
                :key="log.id"
                :timestamp="log.time"
                placement="top"
                :type="log.result === 'Success' ? 'success' : 'warning'"
                ><ElCard shadow="never"
                  ><div class="log-heading"
                    ><div
                      ><strong>{{ log.action }}</strong
                      ><span>{{ log.operator }}</span></div
                    ><ElTag
                      :type="log.result === 'Success' ? 'success' : 'warning'"
                      effect="light"
                      >{{ log.result === 'Success' ? '成功' : '待處理' }}</ElTag
                    ></div
                  ><p>{{ log.reason }}</p
                  ><ElCollapse v-if="log.before || log.after"
                    ><ElCollapseItem title="查看異動內容"
                      ><div class="change-grid">
                        <pre>{{ readable(log.before) }}</pre
                        ><pre>{{ readable(log.after) }}</pre>
                      </div></ElCollapseItem
                    ></ElCollapse
                  ></ElCard
                ></ElTimelineItem
              ></ElTimeline
            ><ElEmpty v-else description="沒有符合條件的異動紀錄" /></div
        ></ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDrawer v-model="basicVisible" title="編輯代理基本資料" :size="drawerSize"
      ><ElForm ref="basicFormRef" :model="basicForm" :rules="basicRules" label-position="top"
        ><ElRow :gutter="14"
          ><ElCol :span="12"
            ><ElFormItem label="代理代碼"
              ><ElInput :model-value="agent.code" disabled /></ElFormItem></ElCol
          ><ElCol :span="12"
            ><ElFormItem label="代理名稱" prop="name"
              ><ElInput v-model="basicForm.name" /></ElFormItem></ElCol
          ><ElCol :span="12"
            ><ElFormItem label="主要聯絡人" prop="contact"
              ><ElInput v-model="basicForm.contact" /></ElFormItem></ElCol
          ><ElCol :span="12"
            ><ElFormItem label="聯絡方式" prop="contactMethod"
              ><ElInput v-model="basicForm.contactMethod" /></ElFormItem></ElCol
          ><ElCol :span="12"
            ><ElFormItem label="合作開始日"
              ><ElDatePicker
                v-model="basicForm.cooperationStartDate"
                type="date"
                value-format="YYYY-MM-DD"
                class="w-full" /></ElFormItem></ElCol
          ><ElCol :span="24"
            ><ElFormItem label="備註"
              ><ElInput
                v-model="basicForm.note"
                type="textarea"
                :rows="4" /></ElFormItem></ElCol></ElRow></ElForm
      ><template #footer
        ><ElButton @click="basicVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveBasic">儲存變更</ElButton></template
      ></ElDrawer
    >

    <ElDrawer v-model="termVisible" title="新增商務條件版本" :size="drawerSize"
      ><ElAlert
        title="目前生效條件不會被直接覆寫；新版本確認後才會切換生效。"
        type="warning"
        :closable="false"
        show-icon
        class="mb-5"
      /><ElForm ref="termFormRef" :model="termForm" :rules="termRules" label-position="top"
        ><ElFormItem label="結算基礎" prop="settlementBasis"
          ><ElSelect v-model="termForm.settlementBasis" class="w-full"
            ><ElOption label="GGR" value="GGR" /></ElSelect></ElFormItem
        ><ElFormItem label="代理條件" prop="ratePercent"
          ><ElInputNumber
            v-model="termForm.ratePercent"
            :min="0"
            :max="100"
            :precision="2"
            class="w-full" /></ElFormItem
        ><ElFormItem label="結算幣別" prop="settlementCurrency"
          ><ElSelect v-model="termForm.settlementCurrency" class="w-full"
            ><ElOption
              v-for="currency in currencies"
              :key="currency"
              :label="currency"
              :value="currency" /></ElSelect></ElFormItem
        ><ElFormItem label="結算週期" prop="settlementCycle"
          ><ElSelect v-model="termForm.settlementCycle" class="w-full"
            ><ElOption label="每日" value="Daily" /><ElOption
              label="每週"
              value="Weekly" /><ElOption label="每半月" value="Semimonthly" /><ElOption
              label="每月"
              value="Monthly" /></ElSelect></ElFormItem
        ><ElFormItem label="生效日期" prop="effectiveFrom"
          ><ElDatePicker
            v-model="termForm.effectiveFrom"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full" /></ElFormItem
        ><ElFormItem label="建立原因" prop="reason"
          ><ElInput v-model="termForm.reason" type="textarea" :rows="3" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="termVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveTerm">儲存版本草稿</ElButton></template
      ></ElDrawer
    >

    <ElDialog v-model="parentVisible" title="調整上級代理" :width="dialogWidth"
      ><ElAlert
        title="調整只影響生效後的資料範圍；歷史報表、對帳及結算歸屬不回溯修改。"
        type="warning"
        :closable="false"
        show-icon
      /><div class="impact-grid"
        ><div
          ><span>目前上級</span><strong>{{ agent.parentAgent }}</strong></div
        ><div
          ><span>轄下代理</span><strong>{{ descendants.length }}</strong></div
        ><div
          ><span>轄下商戶</span><strong>{{ allMerchants.length }}</strong></div
        ><div><span>歷史資料</span><strong>保留快照</strong></div></div
      ><ElForm label-position="top"
        ><ElFormItem label="新上級代理" required
          ><ElSelect v-model="newParentId" class="w-full" filterable
            ><ElOption
              v-for="item in parentCandidates"
              :key="item.id"
              :label="`${item.name}｜${item.code}`"
              :value="item.id" /></ElSelect></ElFormItem
        ><ElFormItem label="操作原因" required
          ><ElInput v-model="parentReason" type="textarea" :rows="3" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="parentVisible = false">取消</ElButton
        ><ElButton
          type="primary"
          :disabled="!newParentId || !parentReason.trim()"
          @click="confirmParent"
          >確認調整</ElButton
        ></template
      ></ElDialog
    >

    <ElDialog
      v-model="statusVisible"
      :title="`${statusCommand === 'activate' ? '啟用' : '停用'}代理確認`"
      :width="dialogWidth"
      ><ElAlert
        :title="
          statusCommand === 'activate'
            ? '啟用後可建立下級代理與商戶。'
            : '停用後將限制建立新的下級代理與商戶，歷史資料不受影響。'
        "
        type="warning"
        :closable="false"
        show-icon
      /><div class="impact-grid"
        ><div
          ><span>直接下級</span><strong>{{ directChildren.length }}</strong></div
        ><div
          ><span>全部轄下代理</span><strong>{{ descendants.length }}</strong></div
        ><div
          ><span>全部轄下商戶</span><strong>{{ allMerchants.length }}</strong></div
        ><div><span>歷史資料</span><strong>保留快照</strong></div></div
      ><ElForm label-position="top"
        ><ElFormItem label="操作原因" required
          ><ElInput v-model="statusReason" type="textarea" :rows="3" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="statusVisible = false">取消</ElButton
        ><ElButton type="primary" :disabled="!statusReason.trim()" @click="confirmStatus"
          >確認送出</ElButton
        ></template
      ></ElDialog
    >

    <ElDialog v-model="termActivateVisible" title="商務條件生效確認" :width="dialogWidth"
      ><ElAlert
        title="生效後目前版本將轉為歷史版本，且不可直接修改。"
        type="warning"
        :closable="false"
        show-icon
      /><ElForm label-position="top" class="mt-4"
        ><ElFormItem label="操作原因" required
          ><ElInput v-model="termActivateReason" type="textarea" :rows="3" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="termActivateVisible = false">取消</ElButton
        ><ElButton
          type="primary"
          :disabled="!termActivateReason.trim()"
          @click="confirmActivateTerm"
          >確認生效</ElButton
        ></template
      ></ElDialog
    >
  </div>
  <ElResult v-else icon="warning" title="找不到代理資料"
    ><template #extra
      ><ElButton type="primary" @click="router.push('/business/agents')"
        >返回代理列表</ElButton
      ></template
    ></ElResult
  >
</template>

<script setup lang="ts">
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { useFinanceSettingsStore } from '@/store/modules/financeSettings'
  import type {
    AgentCommercialTerm,
    AgentRecord,
    SettlementBasis,
    SettlementCycle
  } from '@/types/game-provider'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'
  import GameProviderStatusTag from '@/components/business/game-provider/status-tag/index.vue'

  defineOptions({ name: 'AgentDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useBusinessPartnerStore()
  const financeSettingsStore = useFinanceSettingsStore()
  const { width } = useWindowSize()
  const descriptionColumns = computed(() => (width.value < 720 ? 1 : 2))
  const drawerSize = computed(() => (width.value < 640 ? '100%' : '560px'))
  const dialogWidth = computed(() => (width.value < 640 ? 'calc(100% - 24px)' : '560px'))
  const agent = computed(() => store.findAgent(String(route.params.id)))
  const activeTab = ref(String(route.query.tab || 'overview'))
  const directChildren = computed(() =>
    agent.value ? store.getDirectChildren(agent.value.id) : []
  )
  const descendants = computed(() => (agent.value ? store.getDescendants(agent.value.id) : []))
  const directMerchants = computed(() =>
    agent.value ? store.getDirectMerchants(agent.value.id) : []
  )
  const allMerchants = computed(() => (agent.value ? store.getAllMerchants(agent.value.id) : []))
  const terms = computed(() => (agent.value ? store.getTerms(agent.value.id) : []))
  const currentTerm = computed(() =>
    agent.value ? store.getCurrentTerm(agent.value.id) : undefined
  )
  const reconciliations = computed(() =>
    agent.value ? store.getReconciliations(agent.value.id) : []
  )
  const latestReconciliation = computed(() => reconciliations.value[0])
  const hierarchyPath = computed(() => {
    if (!agent.value) return []
    const path: AgentRecord[] = [agent.value]
    let current = store.getParent(agent.value)
    while (current) {
      path.unshift(current)
      current = store.getParent(current)
    }
    return path
  })
  const summaryItems = computed(() => [
    {
      label: '直接下級代理',
      value: directChildren.value.length,
      note: agent.value?.level === 'L3' ? '已達最深層級' : '可建立下一級'
    },
    { label: '轄下代理總數', value: descendants.value.length, note: '包含全部下級' },
    {
      label: '轄下商戶總數',
      value: allMerchants.value.length,
      note: `${directMerchants.value.length} 家直屬`
    },
    {
      label: '目前代理條件',
      value: currentTerm.value
        ? `${basisText(currentTerm.value.settlementBasis)} ${currentTerm.value.ratePercent}%`
        : '未設定',
      note: currentTerm.value
        ? `${currentTerm.value.settlementCurrency}／${cycleText(currentTerm.value.settlementCycle)}`
        : '待建立版本'
    },
    {
      label: '本期預估結算',
      value: money(latestReconciliation.value?.estimatedRevenue),
      note: latestReconciliation.value?.period || '尚無資料'
    }
  ])
  const hierarchyRule = computed(() =>
    agent.value?.level === 'L1'
      ? 'L1 無上級代理，可建立 L2 與商戶。'
      : agent.value?.level === 'L2'
        ? 'L2 必須隸屬 L1，可建立 L3 與商戶。'
        : 'L3 必須隸屬 L2，只可建立商戶，不可再建立下級代理。'
  )
  const merchantScope = ref<'direct' | 'all'>('direct')
  const visibleMerchants = computed(() =>
    merchantScope.value === 'direct' ? directMerchants.value : allMerchants.value
  )
  const logKeyword = ref('')
  const filteredLogs = computed(() => {
    if (!agent.value) return []
    const query = logKeyword.value.trim().toLowerCase()
    const logs = store.getAuditLogs(agent.value.id)
    return query
      ? logs.filter((log) =>
          [log.action, log.operator, log.reason].some((value) =>
            value.toLowerCase().includes(query)
          )
        )
      : logs
  })
  const basicVisible = ref(false)
  const termVisible = ref(false)
  const parentVisible = ref(false)
  const statusVisible = ref(false)
  const termActivateVisible = ref(false)
  const basicFormRef = ref<FormInstance>()
  const termFormRef = ref<FormInstance>()
  const currencies = computed(() =>
    financeSettingsStore.settlementCurrencies.map((item) => item.code)
  )
  const basicForm = reactive({
    name: '',
    contact: '',
    contactMethod: '',
    cooperationStartDate: '',
    note: ''
  })
  const basicRules: FormRules = {
    name: [{ required: true, message: '請輸入代理名稱', trigger: 'blur' }],
    contact: [{ required: true, message: '請輸入聯絡人', trigger: 'blur' }],
    contactMethod: [{ required: true, message: '請輸入聯絡方式', trigger: 'blur' }]
  }
  const termForm = reactive({
    settlementBasis: 'GGR' as SettlementBasis,
    ratePercent: 6.5,
    settlementCurrency: 'USDT',
    settlementCycle: 'Monthly' as SettlementCycle,
    effectiveFrom: '',
    reason: ''
  })
  const termRules: FormRules = {
    settlementBasis: [{ required: true, message: '請選擇結算基礎', trigger: 'change' }],
    ratePercent: [{ required: true, message: '請輸入代理條件', trigger: 'change' }],
    settlementCurrency: [{ required: true, message: '請選擇結算幣別', trigger: 'change' }],
    settlementCycle: [{ required: true, message: '請選擇結算週期', trigger: 'change' }],
    effectiveFrom: [
      { required: true, message: '請選擇生效日期', trigger: 'change' },
      {
        validator: (_rule, value, callback) =>
          currentTerm.value && value <= currentTerm.value.effectiveFrom
            ? callback(new Error('新版本生效日需晚於目前版本'))
            : callback(),
        trigger: 'change'
      }
    ],
    reason: [{ required: true, message: '請輸入建立原因', trigger: 'blur' }]
  }
  const newParentId = ref('')
  const parentReason = ref('')
  const statusReason = ref('')
  const statusCommand = ref<'activate' | 'disable'>('disable')
  const activatingTerm = ref<AgentCommercialTerm>()
  const termActivateReason = ref('')
  const parentCandidates = computed(() =>
    !agent.value
      ? []
      : store.agents.filter((item) => store.canAssignParent(agent.value!.id, item.id))
  )
  const syncTab = (tab: string | number) =>
    router.replace({ query: { ...route.query, tab: String(tab) } })
  const createChild = () =>
    agent.value &&
    router.push({ path: '/business/agents/create', query: { parentId: agent.value.id } })
  const openBasicEditor = () => {
    if (!agent.value) return
    Object.assign(basicForm, {
      name: agent.value.name,
      contact: agent.value.contact,
      contactMethod: agent.value.contactMethod || '',
      cooperationStartDate: agent.value.cooperationStartDate || '',
      note: agent.value.note || ''
    })
    basicVisible.value = true
  }
  const saveBasic = async () => {
    if (!agent.value || !(await basicFormRef.value?.validate().catch(() => false))) return
    store.updateAgent(agent.value.id, { ...basicForm }, '更新代理基本資料')
    basicVisible.value = false
    ElMessage.success('代理基本資料已更新')
  }
  const openTermDrawer = () => {
    Object.assign(termForm, {
      settlementBasis: 'GGR',
      ratePercent: currentTerm.value?.ratePercent || 6.5,
      settlementCurrency: currentTerm.value?.settlementCurrency || 'USDT',
      settlementCycle: currentTerm.value?.settlementCycle || 'Monthly',
      effectiveFrom: '',
      reason: ''
    })
    termVisible.value = true
  }
  const saveTerm = async () => {
    if (!agent.value || !(await termFormRef.value?.validate().catch(() => false))) return
    store.addCommercialTerm(agent.value.id, { ...termForm })
    termVisible.value = false
    ElMessage.success('商務條件新版本已建立為草稿')
  }
  const openActivateTerm = (term: AgentCommercialTerm) => {
    activatingTerm.value = term
    termActivateReason.value = ''
    termActivateVisible.value = true
  }
  const confirmActivateTerm = () => {
    if (!activatingTerm.value || !termActivateReason.value.trim()) return
    store.activateCommercialTerm(activatingTerm.value.id, termActivateReason.value)
    termActivateVisible.value = false
    ElMessage.success('商務條件版本已生效')
  }
  const openParentDialog = () => {
    newParentId.value = agent.value?.parentAgentId || ''
    parentReason.value = ''
    parentVisible.value = true
  }
  const confirmParent = () => {
    if (!agent.value || !newParentId.value || !parentReason.value.trim()) return
    if (!store.changeParent(agent.value.id, newParentId.value, parentReason.value))
      return ElMessage.error('上級代理不符合層級規則')
    parentVisible.value = false
    ElMessage.success('上級代理已調整')
  }
  const handleHeaderCommand = (command: string) => {
    statusCommand.value = command as 'activate' | 'disable'
    statusReason.value = ''
    statusVisible.value = true
  }
  const confirmStatus = () => {
    if (!agent.value || !statusReason.value.trim()) return
    store.changeStatus(
      agent.value.id,
      statusCommand.value === 'activate' ? 'Active' : 'Disabled',
      statusReason.value
    )
    statusVisible.value = false
    ElMessage.success('代理狀態已更新')
  }
  const basisText = (value?: SettlementBasis) =>
    ({ GGR: 'GGR', 'Valid Bet': '有效投注', Turnover: '營業額' })[value || 'GGR']
  const cycleText = (value?: SettlementCycle) =>
    ({ Daily: '每日', Weekly: '每週', Semimonthly: '每半月', Monthly: '每月' })[value || 'Monthly']
  const termStatusTag = (status: string) =>
    status === 'Active'
      ? 'Active'
      : status === 'Draft'
        ? 'Draft'
        : status === 'Scheduled'
          ? 'Pending'
          : 'Disabled'
  const reconciliationStatusText = (status: string) =>
    ({ Pending: '待確認', Difference: '有差異', Confirmed: '已確認', Completed: '已完成' })[
      status
    ] || status
  const money = (value?: number, currency?: string) =>
    `${currency || currentTerm.value?.settlementCurrency || 'USDT'} ${new Intl.NumberFormat('zh-TW').format(value || 0)}`
  const readable = (value?: string) => {
    if (!value) return '—'
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  watch(
    () => route.query.tab,
    (tab) => {
      if (tab) activeTab.value = String(tab)
    }
  )
</script>

<style scoped lang="scss">
  .agent-detail-page,
  .tab-panel {
    display: grid;
    gap: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid :deep(.el-card__body) {
    display: grid;
    gap: 6px;
    padding: 16px;
  }

  .summary-grid span,
  .summary-grid small {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    font-size: 18px;
  }

  .tabs-card :deep(.el-card__body) {
    padding-top: 8px;
  }

  .tab-panel {
    min-height: 330px;
    padding: 14px 2px 4px;
  }

  .panel-toolbar,
  .log-heading {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .panel-toolbar h2 {
    margin: 0;
    font-size: 17px;
  }

  .panel-toolbar p {
    margin: 5px 0 0;
    color: var(--art-gray-500);
  }

  .relationship-path {
    display: flex;
    gap: 28px;
    padding: 14px;
    overflow-x: auto;
    background: var(--art-gray-50);
    border-radius: 10px;
  }

  .path-card {
    position: relative;
    display: grid;
    gap: 6px;
    min-width: 170px;
    padding: 12px;
    background: var(--art-bg-color);
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .path-card:not(:last-child)::after {
    position: absolute;
    top: 50%;
    right: -21px;
    color: var(--art-gray-400);
    content: '→';
  }

  .path-card.current {
    border-color: var(--theme-color);
  }

  .path-card span {
    font-size: 12px;
    color: var(--art-gray-500);
  }

  .relationship-summary,
  .reconciliation-summary,
  .impact-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .relationship-summary > div,
  .reconciliation-summary > div,
  .impact-grid > div {
    display: grid;
    gap: 6px;
    padding: 13px;
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .relationship-summary span,
  .reconciliation-summary span,
  .impact-grid span {
    color: var(--art-gray-500);
  }

  .tab-badge {
    margin-left: 8px;
  }

  .tab-badge :deep(.el-badge__content) {
    position: static;
    transform: none;
  }

  .log-search {
    width: 280px;
  }

  .log-heading > div {
    display: grid;
    gap: 4px;
  }

  .log-heading span {
    font-size: 12px;
    color: var(--art-gray-500);
  }

  .log-heading + p {
    color: var(--art-gray-600);
  }

  .change-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  pre {
    max-height: 220px;
    padding: 10px;
    overflow: auto;
    word-break: break-word;
    white-space: pre-wrap;
    background: var(--art-gray-50);
    border-radius: 6px;
  }

  @media (width <= 1100px) {
    .summary-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (width <= 760px) {
    .summary-grid,
    .relationship-summary,
    .reconciliation-summary,
    .impact-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .panel-toolbar {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (width <= 520px) {
    .summary-grid,
    .relationship-summary,
    .reconciliation-summary,
    .impact-grid,
    .change-grid {
      grid-template-columns: 1fr;
    }

    .log-search {
      width: 100%;
    }
  }
</style>
