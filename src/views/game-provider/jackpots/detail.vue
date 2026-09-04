<template>
  <div v-if="pool" class="jackpot-detail-page">
    <ElCard class="hero-card" shadow="never">
      <AppPageHeader
        :title="pool.nameZh"
        eyebrow="獎池詳細"
        :description="`${pool.code} · 獎池 ID：${pool.id}`"
      >
        <template #status
          ><ElTag :type="statusType(pool.status)" effect="light" round>{{
            statusLabel(pool.status)
          }}</ElTag></template
        >
        <template #meta
          ><div class="hero-meta"
            ><span><ArtSvgIcon icon="ri:money-dollar-circle-line" />{{ pool.baseCurrency }}</span
            ><span><ArtSvgIcon icon="ri:funds-box-line" />{{ typeLabel(pool.type) }}</span
            ><span><ArtSvgIcon icon="ri:time-line" />{{ pool.timezone }}</span
            ><span><ArtSvgIcon icon="ri:refresh-line" />{{ pool.updatedAt }}</span></div
          ></template
        >
        <template #actions
          ><ElButton @click="router.push('/jackpots/list')">返回列表</ElButton
          ><ElButton @click="copyPool">複製獎池</ElButton
          ><ElDropdown trigger="click" @command="openStatusAction"
            ><ElButton type="primary"
              >狀態操作<ArtSvgIcon icon="ri:arrow-down-s-line" class="ml-1" /></ElButton
            ><template #dropdown
              ><ElDropdownMenu
                ><ElDropdownItem v-if="pool.status === 'Draft'" command="Pending"
                  >送出審核</ElDropdownItem
                ><ElDropdownItem
                  v-if="['Pending', 'Draft', 'Maintenance', 'Disabled'].includes(pool.status)"
                  command="Active"
                  >啟用獎池</ElDropdownItem
                ><ElDropdownItem v-if="pool.status === 'Active'" command="Maintenance"
                  >進入維護</ElDropdownItem
                ><ElDropdownItem
                  v-if="['Active', 'Maintenance'].includes(pool.status)"
                  command="Disabled"
                  >停用獎池</ElDropdownItem
                ><ElDropdownItem v-if="pool.status !== 'Closed'" command="Closed" divided
                  >關閉獎池</ElDropdownItem
                ></ElDropdownMenu
              ></template
            ></ElDropdown
          ></template
        >
      </AppPageHeader>
    </ElCard>

    <div class="summary-grid"
      ><ElCard v-for="item in summary" :key="item.label" shadow="never"
        ><span>{{ item.label }}</span
        ><strong>{{ item.value }}</strong
        ><small>{{ item.note }}</small></ElCard
      ></div
    >

    <ElCard class="tabs-card" shadow="never">
      <ElTabs v-model="activeTab" @tab-change="syncTab">
        <ElTabPane label="基本設定" name="overview">
          <div class="tab-panel overview-grid">
            <section class="section-block">
              <div class="section-title"
                ><div
                  ><h3>獎池主檔</h3><p>啟用後，識別碼、類型與基準幣別不可直接修改。</p></div
                ></div
              >
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem label="獎池 ID">{{ pool.id }}</ElDescriptionsItem
                ><ElDescriptionsItem label="獎池代碼">{{ pool.code }}</ElDescriptionsItem>
                <ElDescriptionsItem label="中文名稱">{{ pool.nameZh }}</ElDescriptionsItem
                ><ElDescriptionsItem label="英文名稱">{{ pool.nameEn }}</ElDescriptionsItem>
                <ElDescriptionsItem label="獎池類型">{{ typeLabel(pool.type) }}</ElDescriptionsItem
                ><ElDescriptionsItem label="基準幣別">{{ pool.baseCurrency }}</ElDescriptionsItem>
                <ElDescriptionsItem label="時區">{{ pool.timezone }}</ElDescriptionsItem
                ><ElDescriptionsItem label="建立人">{{ pool.createdBy }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立時間">{{ pool.createdAt }}</ElDescriptionsItem
                ><ElDescriptionsItem label="更新時間">{{ pool.updatedAt }}</ElDescriptionsItem>
                <ElDescriptionsItem label="顯示說明" :span="descriptionColumns">{{
                  pool.description
                }}</ElDescriptionsItem
                ><ElDescriptionsItem label="內部備註" :span="descriptionColumns">{{
                  pool.note || '—'
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>
            <section class="section-block readiness-panel">
              <div class="section-title"
                ><div><h3>啟用前檢查</h3><p>所有必要設定完成後才能啟用。</p></div></div
              >
              <div class="check-list"
                ><div
                  v-for="item in readiness.items"
                  :key="item.label"
                  :class="{ passed: item.passed }"
                  ><ArtSvgIcon
                    :icon="item.passed ? 'ri:checkbox-circle-line' : 'ri:error-warning-line'"
                  /><span>{{ item.label }}</span
                  ><strong>{{ item.passed ? '完成' : '未完成' }}</strong></div
                ></div
              >
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="獎池級別" name="levels">
          <div class="tab-panel"
            ><div class="section-title"
              ><div><h3>獎池級別</h3><p>已產生流水的級別僅能停用，不可刪除。</p></div
              ><ElButton type="primary" @click="levelVisible = true">新增級別</ElButton></div
            >
            <ElTable :data="levels" border
              ><ElTableColumn prop="sort" label="順序" width="75" /><ElTableColumn
                label="級別"
                min-width="150"
                ><template #default="scope"
                  ><div class="level-name"
                    ><i :style="{ backgroundColor: scope.row.color }"></i
                    ><strong>{{ scope.row.name }}</strong
                    ><small>{{ scope.row.code }}</small></div
                  ></template
                ></ElTableColumn
              ><ElTableColumn label="初始展示金額" width="160" align="right"
                ><template #default="scope">{{
                  money(scope.row.initialDisplayAmount)
                }}</template></ElTableColumn
              ><ElTableColumn label="最低展示金額" width="160" align="right"
                ><template #default="scope">{{
                  money(scope.row.minimumDisplayAmount)
                }}</template></ElTableColumn
              ><ElTableColumn label="目前餘額" width="170" align="right"
                ><template #default="scope"
                  >{{ money(scope.row.currentBalance) }} {{ pool.baseCurrency }}</template
                ></ElTableColumn
              ><ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
                    scope.row.status === 'Active' ? '啟用' : '已停用'
                  }}</ElTag></template
                ></ElTableColumn
              ><ElTableColumn prop="updatedAt" label="更新時間" width="160" /><ElTableColumn
                label="操作"
                width="100"
                fixed="right"
                ><template #default="scope"
                  ><ElButton
                    link
                    :type="scope.row.status === 'Active' ? 'danger' : 'primary'"
                    @click="toggleLevel(scope.row)"
                    >{{ scope.row.status === 'Active' ? '停用' : '啟用' }}</ElButton
                  ></template
                ></ElTableColumn
              ></ElTable
            >
          </div>
        </ElTabPane>

        <ElTabPane label="綁定遊戲" name="games">
          <div class="tab-panel"
            ><div class="section-title"
              ><div><h3>綁定遊戲</h3><p>解除綁定會影響使用此獎池的商戶遊戲。</p></div
              ><ElButton type="primary" @click="gameVisible = true">新增綁定</ElButton></div
            >
            <ElTable :data="gameBindings" border
              ><ElTableColumn label="遊戲" min-width="190"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.gameName"
                    :secondary="scope.row.gameId"
                    :to="`/games/management/${scope.row.gameId}`" /></template></ElTableColumn
              ><ElTableColumn prop="gameType" label="遊戲類型" width="120" /><ElTableColumn
                prop="rtpPlan"
                label="RTP 方案"
                min-width="150"
              /><ElTableColumn prop="limitPlan" label="限紅方案" min-width="150" /><ElTableColumn
                label="狀態"
                width="100"
                ><template #default="scope"
                  ><ElTag :type="bindingStatusType(scope.row.status)">{{
                    bindingStatusLabel(scope.row.status)
                  }}</ElTag></template
                ></ElTableColumn
              ><ElTableColumn prop="effectiveAt" label="生效時間" width="160" /><ElTableColumn
                prop="updatedAt"
                label="更新時間"
                width="160"
              /><ElTableColumn label="操作" width="100" fixed="right"
                ><template #default="scope"
                  ><ElButton
                    v-if="scope.row.status !== 'Disabled'"
                    link
                    type="danger"
                    @click="unbindGame(scope.row)"
                    >解除綁定</ElButton
                  ><span v-else>—</span></template
                ></ElTableColumn
              ></ElTable
            >
          </div>
        </ElTabPane>

        <ElTabPane label="商戶設定" name="merchants">
          <div class="tab-panel"
            ><div class="section-title"
              ><div><h3>商戶線路適用設定</h3><p>線路停用只影響該線路，不會停用獎池本身。</p></div
              ><ElButton type="primary" @click="merchantVisible = true">新增商戶線路</ElButton></div
            >
            <ElAlert
              :title="`本獎池只接受 ${pool.baseCurrency} 商戶線路；非同幣別或未開放綁定遊戲的線路不會出現在選單。`"
              type="info"
              :closable="false"
              show-icon
              class="mb-4"
            />
            <ElTable :data="merchantSettings" border
              ><ElTableColumn label="商戶" min-width="180"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.merchantName"
                    :secondary="scope.row.merchantId"
                    :to="`/business/merchants/${scope.row.merchantId}`" /></template></ElTableColumn
              ><ElTableColumn label="所屬代理" min-width="170"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.agentName"
                    :secondary="scope.row.agentId"
                    :to="`/business/agents/${scope.row.agentId}`" /></template></ElTableColumn
              ><ElTableColumn prop="lineUid" label="線路 UID" min-width="210" /><ElTableColumn
                prop="currency"
                label="交易幣別"
                width="100" /><ElTableColumn label="錢包模式" width="110"
                ><template #default="scope">{{
                  scope.row.walletMode === 'Seamless' ? '單一錢包' : '轉帳錢包'
                }}</template></ElTableColumn
              ><ElTableColumn prop="displayName" label="顯示名稱" min-width="190" /><ElTableColumn
                label="啟用"
                width="90"
                ><template #default="scope"
                  ><ElSwitch
                    :model-value="scope.row.status === 'Active'"
                    @change="
                      (value) => store.updateMerchantStatus(scope.row.id, Boolean(value))
                    " /></template></ElTableColumn
              ><ElTableColumn prop="updatedAt" label="更新時間" width="160"
            /></ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="獎池流水" name="ledger">
          <div class="tab-panel"
            ><div class="section-title"
              ><div><h3>獎池流水</h3><p>完整保留每次累積、派發與回滾的餘額變化。</p></div
              ><ElTag type="info" effect="plain">唯讀</ElTag></div
            >
            <ElTable :data="ledgerRecords" border
              ><ElTableColumn prop="id" label="流水編號" width="140" /><ElTableColumn
                label="級別／類型"
                min-width="150"
                ><template #default="scope"
                  ><strong>{{ scope.row.levelName }}</strong
                  ><br /><small>{{ ledgerTypeLabel(scope.row.type) }}</small></template
                ></ElTableColumn
              ><ElTableColumn label="會員" min-width="180"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.memberId"
                    :label="scope.row.externalMemberId"
                    :secondary="scope.row.memberId"
                    :to="`/members/management/${scope.row.memberId}`"
                  /><span v-else>系統</span></template
                ></ElTableColumn
              ><ElTableColumn label="遊戲／局號" min-width="190"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.gameId"
                    :label="scope.row.gameName"
                    :secondary="scope.row.roundId"
                    :to="`/games/management/${scope.row.gameId}`" /></template></ElTableColumn
              ><ElTableColumn label="異動前" width="135" align="right"
                ><template #default="scope">{{
                  money(scope.row.beforeBalance)
                }}</template></ElTableColumn
              ><ElTableColumn label="異動金額" width="135" align="right"
                ><template #default="scope"
                  ><span :class="scope.row.amount >= 0 ? 'positive' : 'negative'">{{
                    signedMoney(scope.row.amount)
                  }}</span></template
                ></ElTableColumn
              ><ElTableColumn label="異動後" width="135" align="right"
                ><template #default="scope">{{
                  money(scope.row.afterBalance)
                }}</template></ElTableColumn
              ><ElTableColumn prop="currency" label="幣別" width="80" /><ElTableColumn
                label="狀態"
                width="95"
                ><template #default="scope"
                  ><ElTag
                    :type="
                      scope.row.status === 'Success'
                        ? 'success'
                        : scope.row.status === 'Failed'
                          ? 'danger'
                          : 'warning'
                    "
                    >{{ ledgerStatusLabel(scope.row.status) }}</ElTag
                  ></template
                ></ElTableColumn
              ><ElTableColumn prop="occurredAt" label="發生時間" width="160"
            /></ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="派發紀錄" name="payouts">
          <div class="tab-panel"
            ><div class="section-title"
              ><div><h3>派發紀錄</h3><p>追查中獎會員、局號、錢包交易與失敗原因。</p></div
              ><ElTag type="warning" effect="plain">{{ pendingPayouts }} 筆待處理</ElTag></div
            >
            <ElTable :data="payouts" border
              ><ElTableColumn prop="id" label="派發編號" width="140" /><ElTableColumn
                prop="levelName"
                label="級別"
                width="100" /><ElTableColumn label="會員" min-width="190"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.externalMemberId"
                    :secondary="scope.row.memberId"
                    :to="`/members/management/${scope.row.memberId}?tab=jackpots`" /></template></ElTableColumn
              ><ElTableColumn label="商戶" min-width="150"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.merchantName"
                    :secondary="scope.row.merchantId"
                    :to="`/business/merchants/${scope.row.merchantId}`" /></template></ElTableColumn
              ><ElTableColumn label="遊戲／局號" min-width="190"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.gameName"
                    :secondary="scope.row.roundId"
                    :to="`/games/management/${scope.row.gameId}`" /></template></ElTableColumn
              ><ElTableColumn label="派發金額" width="150" align="right"
                ><template #default="scope"
                  >{{ money(scope.row.amount) }} {{ scope.row.currency }}</template
                ></ElTableColumn
              ><ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><ElTag :type="payoutStatusType(scope.row.status)">{{
                    payoutStatusLabel(scope.row.status)
                  }}</ElTag></template
                ></ElTableColumn
              ><ElTableColumn label="關聯交易" width="130"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.transactionId"
                    :label="scope.row.transactionId"
                    :to="`/transactions/records/${scope.row.transactionId}`"
                  /><span v-else>—</span></template
                ></ElTableColumn
              ><ElTableColumn prop="failureReason" label="失敗原因" min-width="190"
                ><template #default="scope">{{
                  scope.row.failureReason || '—'
                }}</template></ElTableColumn
              ><ElTableColumn prop="payoutAt" label="派發時間" width="160"
            /></ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="異動紀錄" name="logs">
          <div class="tab-panel"
            ><div class="section-title"
              ><div><h3>異動紀錄</h3><p>所有狀態與適用範圍操作均保留原因。</p></div></div
            >
            <ElTable :data="auditRecords" border
              ><ElTableColumn prop="action" label="操作類型" min-width="150" /><ElTableColumn
                prop="target"
                label="操作對象"
                min-width="180" /><ElTableColumn label="修改內容" min-width="210"
                ><template #default="scope"
                  >{{ scope.row.before }} → {{ scope.row.after }}</template
                ></ElTableColumn
              ><ElTableColumn prop="reason" label="操作原因" min-width="190" /><ElTableColumn
                prop="operator"
                label="操作人"
                width="130" /><ElTableColumn prop="approver" label="審核人" width="130"
                ><template #default="scope">{{
                  scope.row.approver || '—'
                }}</template></ElTableColumn
              ><ElTableColumn label="結果" width="95"
                ><template #default="scope"
                  ><ElTag
                    :type="
                      scope.row.status === 'Success'
                        ? 'success'
                        : scope.row.status === 'Rejected'
                          ? 'danger'
                          : 'warning'
                    "
                    >{{
                      scope.row.status === 'Success'
                        ? '成功'
                        : scope.row.status === 'Rejected'
                          ? '已駁回'
                          : '待審核'
                    }}</ElTag
                  ></template
                ></ElTableColumn
              ><ElTableColumn prop="time" label="操作時間" width="160"
            /></ElTable>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog
      v-model="statusVisible"
      :title="`${statusLabel(targetStatus)}確認`"
      width="min(92vw, 600px)"
      destroy-on-close
      ><ElAlert
        :title="statusImpactText"
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      /><div class="impact-list"
        ><div
          ><span>獎池</span><strong>{{ pool.nameZh }}</strong></div
        ><div
          ><span>影響遊戲</span><strong>{{ activeGameCount }} 款</strong></div
        ><div
          ><span>影響商戶線路</span><strong>{{ activeMerchantCount }} 條</strong></div
        ></div
      ><ElForm label-position="top" class="mt-4"
        ><ElFormItem label="操作原因" required
          ><ElInput
            v-model="statusReason"
            type="textarea"
            :rows="3"
            placeholder="請輸入至少 4 個字" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="statusVisible = false">取消</ElButton
        ><ElButton
          type="primary"
          :disabled="
            statusReason.trim().length < 4 || (targetStatus === 'Active' && !readiness.ready)
          "
          @click="confirmStatus"
          >確認執行</ElButton
        ></template
      ></ElDialog
    >

    <ElDialog v-model="levelVisible" title="新增獎池級別" width="min(92vw, 560px)" destroy-on-close
      ><ElForm label-position="top"
        ><div class="dialog-grid"
          ><ElFormItem label="級別代碼" required
            ><ElInput v-model="levelForm.code" placeholder="GRAND" /></ElFormItem
          ><ElFormItem label="級別名稱" required
            ><ElInput v-model="levelForm.name" placeholder="Grand" /></ElFormItem
          ><ElFormItem label="初始展示金額" required
            ><ElInputNumber
              v-model="levelForm.initialDisplayAmount"
              :min="0"
              :precision="2"
              class="w-full" /></ElFormItem
          ><ElFormItem label="最低展示金額" required
            ><ElInputNumber
              v-model="levelForm.minimumDisplayAmount"
              :min="0"
              :precision="2"
              class="w-full" /></ElFormItem
          ><ElFormItem label="顯示顏色"><ElColorPicker v-model="levelForm.color" /></ElFormItem
          ><ElFormItem label="備註" class="full-width"
            ><ElInput
              v-model="levelForm.note"
              type="textarea"
              :rows="2" /></ElFormItem></div></ElForm
      ><template #footer
        ><ElButton @click="levelVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveLevel">確認新增</ElButton></template
      ></ElDialog
    >

    <ElDialog v-model="gameVisible" title="新增遊戲綁定" width="min(92vw, 640px)" destroy-on-close
      ><ElCheckboxGroup v-model="selectedGameIds" class="option-list"
        ><ElCheckbox v-for="game in unboundGames" :key="game.id" :value="game.id" border
          ><strong>{{ game.displayName }}</strong
          ><small>{{ game.id }} · {{ game.code }}</small></ElCheckbox
        ></ElCheckboxGroup
      ><ElEmpty v-if="unboundGames.length === 0" description="所有可用遊戲都已綁定" /><template
        #footer
        ><ElButton @click="gameVisible = false">取消</ElButton
        ><ElButton type="primary" :disabled="selectedGameIds.length === 0" @click="saveGameBindings"
          >確認綁定</ElButton
        ></template
      ></ElDialog
    >

    <ElDialog
      v-model="merchantVisible"
      title="新增適用商戶線路"
      width="min(92vw, 600px)"
      destroy-on-close
      ><ElAlert
        :title="`僅顯示已啟用、幣別為 ${pool.baseCurrency}，且已開放支援 Jackpot 遊戲的線路。`"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      /><ElSelect
        v-model="selectedMerchantLineUid"
        filterable
        placeholder="選擇商戶線路"
        class="w-full"
        ><ElOption
          v-for="item in unboundMerchantLines"
          :key="item.line.uid"
          :label="`${item.merchant.name}｜${item.line.uid}｜${item.line.currency}｜${item.eligibleGameNames.join('、')}`"
          :value="item.line.uid" /></ElSelect
      ><ElEmpty
        v-if="unboundMerchantLines.length === 0"
        description="目前沒有其他符合條件的商戶線路"
      />
      ><template #footer
        ><ElButton @click="merchantVisible = false">取消</ElButton
        ><ElButton type="primary" :disabled="!selectedMerchantLineUid" @click="saveMerchantLine"
          >確認新增</ElButton
        ></template
      ></ElDialog
    >
  </div>

  <ElResult v-else icon="warning" title="找不到獎池資料" sub-title="請確認獎池編號是否正確。"
    ><template #extra
      ><ElButton type="primary" @click="router.push('/jackpots/list')"
        >返回獎池列表</ElButton
      ></template
    ></ElResult
  >
</template>

<script setup lang="ts">
  import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    JackpotLedgerType,
    JackpotLevelRecord,
    JackpotPayoutStatus,
    JackpotStatus,
    JackpotType
  } from '@/types/game-provider'
  import { useJackpotCenterStore } from '@/store/modules/jackpotCenter'
  import { useGameCatalogStore } from '@/store/modules/gameCatalog'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'JackpotDetail' })
  const route = useRoute()
  const router = useRouter()
  const store = useJackpotCenterStore()
  const gameStore = useGameCatalogStore()
  const { width } = useWindowSize()
  const pool = computed(() => store.findPool(String(route.params.id)))
  const activeTab = ref(String(route.query.tab || 'overview'))
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const levels = computed(() => (pool.value ? store.getLevels(pool.value.id) : []))
  const gameBindings = computed(() => (pool.value ? store.getGameBindings(pool.value.id) : []))
  const merchantSettings = computed(() =>
    pool.value ? store.getMerchantSettings(pool.value.id) : []
  )
  const ledgerRecords = computed(() => (pool.value ? store.getLedgerRecords(pool.value.id) : []))
  const payouts = computed(() => (pool.value ? store.getPayouts(pool.value.id) : []))
  const auditRecords = computed(() => (pool.value ? store.getAuditRecords(pool.value.id) : []))
  const activeGameCount = computed(
    () => gameBindings.value.filter((item) => item.status === 'Active').length
  )
  const activeMerchantCount = computed(
    () => merchantSettings.value.filter((item) => item.status === 'Active').length
  )
  const pendingPayouts = computed(
    () => payouts.value.filter((item) => ['Pending', 'Processing'].includes(item.status)).length
  )
  const summary = computed(() =>
    pool.value
      ? [
          {
            label: '目前餘額',
            value: `${money(pool.value.currentBalance)} ${pool.value.baseCurrency}`,
            note: '不與其他幣別加總'
          },
          {
            label: '獎池級別',
            value: levels.value.length,
            note: `${levels.value.filter((item) => item.status === 'Active').length} 個啟用`
          },
          {
            label: '綁定遊戲',
            value: activeGameCount.value,
            note: `${gameBindings.value.length} 筆設定`
          },
          {
            label: '啟用商戶線路',
            value: activeMerchantCount.value,
            note: `${pendingPayouts.value} 筆派發待處理`
          }
        ]
      : []
  )
  const readiness = computed(() => {
    const items = [
      {
        label: '基本資料完整',
        passed: Boolean(pool.value?.code && pool.value?.nameZh && pool.value?.baseCurrency)
      },
      { label: '至少一個有效級別', passed: levels.value.some((item) => item.status === 'Active') },
      {
        label: '至少綁定一款遊戲',
        passed: gameBindings.value.some((item) => item.status !== 'Disabled')
      },
      {
        label: '至少啟用一條合格商戶線路',
        passed: merchantSettings.value.some(
          (item) =>
            item.status === 'Active' && store.validateMerchantLine(item.poolId, item.lineUid).valid
        )
      }
    ]
    return { items, ready: items.every((item) => item.passed) }
  })
  const unboundGames = computed(() =>
    gameStore.games.filter(
      (game) =>
        game.masterComplete &&
        !gameBindings.value.some(
          (binding) => binding.gameId === game.id && binding.status !== 'Disabled'
        )
    )
  )
  const unboundMerchantLines = computed(() =>
    pool.value
      ? store
          .getEligibleMerchantLines(
            pool.value.baseCurrency,
            gameBindings.value
              .filter((binding) => binding.status !== 'Disabled')
              .map((binding) => binding.gameId)
          )
          .filter(
            (item) => !merchantSettings.value.some((setting) => setting.lineUid === item.line.uid)
          )
      : []
  )
  const statusVisible = ref(false)
  const targetStatus = ref<JackpotStatus>('Active')
  const statusReason = ref('')
  const levelVisible = ref(false)
  const gameVisible = ref(false)
  const merchantVisible = ref(false)
  const selectedGameIds = ref<string[]>([])
  const selectedMerchantLineUid = ref('')
  const levelForm = reactive({
    code: '',
    name: '',
    initialDisplayAmount: 0,
    minimumDisplayAmount: 0,
    color: '#409eff',
    note: ''
  })
  const money = (value: number) =>
    new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value
    )
  const signedMoney = (value: number) => `${value >= 0 ? '+' : ''}${money(value)}`
  const typeLabel = (type: JackpotType) =>
    ({ 'Single Game': '單一遊戲獎池', 'Shared Games': '多遊戲共享獎池', Campaign: '活動獎池' })[
      type
    ]
  const statusLabel = (status: JackpotStatus) =>
    ({
      Draft: '草稿',
      Pending: '待審核',
      Active: '啟用中',
      Maintenance: '維護中',
      Disabled: '已停用',
      Closed: '已關閉'
    })[status]
  const statusType = (status: JackpotStatus) =>
    status === 'Active'
      ? 'success'
      : status === 'Maintenance' || status === 'Pending'
        ? 'warning'
        : status === 'Disabled' || status === 'Closed'
          ? 'danger'
          : 'info'
  const bindingStatusLabel = (status: string) =>
    ({ Active: '啟用', Scheduled: '已排程', Disabled: '已停用' })[status as 'Active'] || status
  const bindingStatusType = (status: string) =>
    status === 'Active' ? 'success' : status === 'Scheduled' ? 'warning' : 'info'
  const ledgerTypeLabel = (type: JackpotLedgerType) =>
    ({
      Contribution: '累積',
      Payout: '派發',
      Refund: '退款',
      Rollback: '回滾',
      'System Adjustment': '系統調整',
      'Manual Adjustment': '人工調整'
    })[type]
  const ledgerStatusLabel = (status: string) =>
    ({ Processing: '處理中', Success: '成功', Failed: '失敗', 'Rolled Back': '已回滾' })[
      status as 'Success'
    ] || status
  const payoutStatusLabel = (status: JackpotPayoutStatus) =>
    ({
      Pending: '待派發',
      Processing: '處理中',
      Paid: '已派發',
      Failed: '失敗',
      Refunded: '已退款',
      'Rolled Back': '已回滾'
    })[status]
  const payoutStatusType = (status: JackpotPayoutStatus) =>
    status === 'Paid'
      ? 'success'
      : status === 'Failed'
        ? 'danger'
        : ['Pending', 'Processing'].includes(status)
          ? 'warning'
          : 'info'
  const statusImpactText = computed(() =>
    targetStatus.value === 'Active'
      ? readiness.value.ready
        ? '啟用後，綁定遊戲與商戶將可使用此獎池。'
        : '必要設定尚未完成，暫時無法啟用。'
      : targetStatus.value === 'Maintenance'
        ? '進入維護後，所有綁定遊戲將暫停使用此獎池。'
        : targetStatus.value === 'Closed'
          ? '關閉屬不可逆的營運狀態，歷史流水仍會保留。'
          : `獎池狀態將變更為「${statusLabel(targetStatus.value)}」。`
  )
  const syncTab = (tab: string | number) =>
    router.replace({ query: { ...route.query, tab: String(tab) } })
  const openStatusAction = (command: JackpotStatus) => {
    targetStatus.value = command
    statusReason.value = ''
    statusVisible.value = true
  }
  const confirmStatus = () => {
    if (
      !pool.value ||
      statusReason.value.trim().length < 4 ||
      (targetStatus.value === 'Active' && !readiness.value.ready)
    )
      return
    store.updateStatus(pool.value.id, targetStatus.value, statusReason.value.trim())
    statusVisible.value = false
    ElMessage.success(`獎池已變更為${statusLabel(targetStatus.value)}`)
  }
  const copyPool = () => ElMessage.info('已建立複製草稿預覽；正式複製流程將於 API 階段接入')
  const saveLevel = () => {
    if (!pool.value || !levelForm.code.trim() || !levelForm.name.trim())
      return ElMessage.warning('請填寫級別代碼與名稱')
    store.addLevel(pool.value.id, { ...levelForm })
    levelVisible.value = false
    Object.assign(levelForm, {
      code: '',
      name: '',
      initialDisplayAmount: 0,
      minimumDisplayAmount: 0,
      color: '#409eff',
      note: ''
    })
    ElMessage.success('獎池級別已新增')
  }
  const toggleLevel = async (level: JackpotLevelRecord) => {
    const confirmed = await ElMessageBox.confirm(
      `確定要${level.status === 'Active' ? '停用' : '啟用'}「${level.name}」級別嗎？`,
      '級別狀態確認',
      { type: 'warning', confirmButtonText: '確認', cancelButtonText: '取消' }
    ).catch(() => false)
    if (!confirmed) return
    store.toggleLevel(level.id, '獎池級別營運調整')
    ElMessage.success('級別狀態已更新')
  }
  const unbindGame = async (binding: { id: string; gameName: string }) => {
    const result = await ElMessageBox.prompt(
      `解除「${binding.gameName}」後將不再參與此獎池，請輸入原因。`,
      '解除遊戲綁定',
      {
        inputPattern: /.{4,}/,
        inputErrorMessage: '原因至少 4 個字',
        confirmButtonText: '確認解除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).catch(() => null)
    if (!result) return
    store.unbindGame(binding.id, result.value)
    ElMessage.success('遊戲綁定已解除')
  }
  const saveGameBindings = () => {
    if (!pool.value || !selectedGameIds.value.length) return
    store.bindGames(pool.value.id, selectedGameIds.value)
    selectedGameIds.value = []
    gameVisible.value = false
    ElMessage.success('遊戲已綁定')
  }
  const saveMerchantLine = () => {
    if (!pool.value || !selectedMerchantLineUid.value) return
    const result = store.addMerchantLine(pool.value.id, selectedMerchantLineUid.value)
    if (!result.success) return ElMessage.warning(result.reason)
    selectedMerchantLineUid.value = ''
    merchantVisible.value = false
    ElMessage.success('商戶線路已加入獎池設定')
  }
  watch(
    () => route.query.tab,
    (tab) => {
      if (tab) activeTab.value = String(tab)
    }
  )
</script>

<style scoped lang="scss">
  .jackpot-detail-page {
    display: grid;
    gap: 16px;
  }

  .hero-card :deep(.el-card__body) {
    padding: 20px 22px;
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: 12px;
    color: var(--art-gray-600);
  }

  .hero-meta span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-grid :deep(.el-card__body) {
    display: grid;
    gap: 7px;
    padding: 18px;
  }

  .summary-grid span,
  .summary-grid small,
  .section-title p,
  .level-name small,
  .option-list small {
    color: var(--art-gray-500);
  }

  .summary-grid strong {
    overflow: hidden;
    font-size: 20px;
    text-overflow: ellipsis;
  }

  .tabs-card :deep(.el-card__body) {
    padding-top: 8px;
  }

  .tab-panel {
    padding: 10px 0 4px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
    gap: 16px;
  }

  .section-block {
    min-width: 0;
    padding: 18px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .section-title {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title h3,
  .section-title p {
    margin: 0;
  }

  .section-title p {
    margin-top: 5px;
    font-size: 13px;
  }

  .check-list {
    display: grid;
    gap: 10px;
  }

  .check-list > div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 12px;
    color: var(--el-color-warning);
    background: var(--art-gray-50);
    border-radius: 8px;
  }

  .check-list > div.passed {
    color: var(--el-color-success);
  }

  .level-name {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 8px;
    align-items: center;
  }

  .level-name i {
    grid-row: 1 / 3;
    width: 12px;
    height: 32px;
    border-radius: 6px;
  }

  .positive {
    color: var(--el-color-success);
  }

  .negative {
    color: var(--el-color-danger);
  }

  .impact-list {
    overflow: hidden;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .impact-list > div {
    display: flex;
    gap: 20px;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--art-gray-200);
  }

  .impact-list > div:last-child {
    border-bottom: 0;
  }

  .impact-list span {
    color: var(--art-gray-500);
  }

  .dialog-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .option-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .option-list .el-checkbox {
    width: 100%;
    height: auto;
    min-height: 68px;
    margin: 0;
  }

  .option-list :deep(.el-checkbox__label) {
    display: grid;
    gap: 4px;
    white-space: normal;
  }

  @media (width <= 1000px) {
    .overview-grid {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .summary-grid,
    .dialog-grid,
    .option-list {
      grid-template-columns: 1fr;
    }

    .section-block {
      padding: 12px;
    }
  }
</style>
