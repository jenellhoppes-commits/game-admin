<template>
  <div v-if="member" class="member-detail-page">
    <ElCard class="hero-card" shadow="never">
      <AppPageHeader
        :title="member.externalId"
        eyebrow="會員詳細"
        :description="`會員 ID：${member.id} · ${member.merchantName}`"
        :status="member.merchantStatus === 'Active' ? 'Active' : 'Inactive'"
      >
        <template #meta>
          <div class="hero-meta">
            <span><ArtSvgIcon icon="ri:store-2-line" />{{ member.merchantName }}</span>
            <span><ArtSvgIcon icon="ri:route-line" />{{ member.lineUid }}</span>
            <span><ArtSvgIcon icon="ri:money-dollar-circle-line" />{{ member.currency }}</span>
            <ElTag :type="restrictionTagType" effect="light" round>
              {{ restrictionLabel(member.restrictionStatus) }}
            </ElTag>
          </div>
        </template>
        <template #actions>
          <ElButton @click="router.push('/members/management')">返回列表</ElButton>
          <ElButton @click="tagVisible = true">新增標記</ElButton>
          <ElButton
            :type="member.restrictionStatus === 'None' ? 'danger' : 'success'"
            plain
            @click="openRestriction"
          >
            {{ member.restrictionStatus === 'None' ? '限制遊戲' : '解除限制' }}
          </ElButton>
        </template>
      </AppPageHeader>
    </ElCard>

    <div class="summary-grid">
      <ElCard v-for="item in summary" :key="item.label" shadow="never">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.note }}</small>
      </ElCard>
    </div>

    <ElCard class="tabs-card" shadow="never">
      <ElTabs v-model="activeTab" @tab-change="syncTab">
        <ElTabPane label="基本資料" name="profile">
          <div class="tab-panel profile-grid">
            <section class="section-block">
              <div class="section-title">
                <div><h3>會員與歸屬資料</h3><p>由商戶串接同步，總後台僅提供查詢。</p></div>
              </div>
              <ElDescriptions :column="descriptionColumns" border>
                <ElDescriptionsItem label="會員 ID">{{ member.id }}</ElDescriptionsItem>
                <ElDescriptionsItem label="外部會員 ID">{{ member.externalId }}</ElDescriptionsItem>
                <ElDescriptionsItem label="所屬商戶">
                  <EntityLink
                    :label="member.merchantName"
                    :secondary="member.merchantId"
                    :to="`/business/merchants/${member.merchantId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="所屬代理">
                  <EntityLink
                    :label="member.agentName"
                    :secondary="member.agentId"
                    :to="`/business/agents/${member.agentId}`"
                  />
                </ElDescriptionsItem>
                <ElDescriptionsItem label="線路 UID">{{ member.lineUid }}</ElDescriptionsItem>
                <ElDescriptionsItem label="交易幣別">{{ member.currency }}</ElDescriptionsItem>
                <ElDescriptionsItem label="錢包模式">{{
                  walletLabel(member.walletMode)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="商戶側狀態">{{
                  merchantStatusLabel(member.merchantStatus)
                }}</ElDescriptionsItem>
                <ElDescriptionsItem label="首次遊戲">{{ member.firstPlayedAt }}</ElDescriptionsItem>
                <ElDescriptionsItem label="最近遊戲">{{ member.lastPlayedAt }}</ElDescriptionsItem>
                <ElDescriptionsItem label="建立時間">{{ member.createdAt }}</ElDescriptionsItem>
                <ElDescriptionsItem label="風險狀態">{{
                  riskLabel(member.riskStatus)
                }}</ElDescriptionsItem>
              </ElDescriptions>
            </section>

            <section class="wallet-card">
              <div class="section-title">
                <div
                  ><h3>錢包摘要</h3
                  ><p>{{
                    member.wallet.source === 'Merchant'
                      ? '餘額來源：商戶錢包'
                      : '餘額來源：遊戲錢包'
                  }}</p></div
                >
              </div>
              <div class="wallet-balance">
                <span>目前餘額</span>
                <strong>{{ money(member.wallet.balance) }}</strong>
                <small>{{ member.currency }}</small>
              </div>
              <div v-if="member.walletMode === 'Transfer'" class="wallet-breakdown">
                <div
                  ><span>可用餘額</span
                  ><strong>{{ money(member.wallet.availableBalance || 0) }}</strong></div
                >
                <div
                  ><span>凍結餘額</span
                  ><strong>{{ money(member.wallet.frozenBalance || 0) }}</strong></div
                >
              </div>
              <ElAlert
                title="本頁僅顯示錢包快照，不提供加款、扣款或餘額調整。"
                type="info"
                :closable="false"
                show-icon
              />
              <small class="updated-at">更新時間：{{ member.wallet.updatedAt }}</small>
            </section>

            <section class="section-block full-width">
              <div class="section-title">
                <div><h3>遊戲限制紀錄</h3><p>限制範圍固定為全部遊戲，所有異動均保留原因。</p></div>
              </div>
              <ElTable :data="restrictionRecords" border empty-text="尚無限制紀錄">
                <ElTableColumn label="狀態" width="100">
                  <template #default="scope"
                    ><ElTag :type="restrictionRecordType(scope.row.status)" effect="light">{{
                      restrictionRecordLabel(scope.row.status)
                    }}</ElTag></template
                  >
                </ElTableColumn>
                <ElTableColumn prop="reason" label="原因" min-width="180" />
                <ElTableColumn prop="startAt" label="開始時間" width="160" />
                <ElTableColumn prop="endAt" label="結束時間" width="160"
                  ><template #default="scope">{{
                    scope.row.endAt || '持續有效'
                  }}</template></ElTableColumn
                >
                <ElTableColumn prop="operator" label="操作人" width="130" />
                <ElTableColumn prop="createdAt" label="建立時間" width="160" />
                <ElTableColumn label="解除資訊" min-width="180"
                  ><template #default="scope">{{
                    scope.row.releaseReason
                      ? `${scope.row.releaseReason}｜${scope.row.releasedAt}`
                      : '—'
                  }}</template></ElTableColumn
                >
              </ElTable>
            </section>
          </div>
        </ElTabPane>

        <ElTabPane label="遊戲紀錄" name="games">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>遊戲活動</h3><p>依遊戲彙總會員的場次、投注與派彩。</p></div></div
            >
            <ElTable :data="gameActivities" border>
              <ElTableColumn label="遊戲" min-width="180"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.gameName"
                    :secondary="scope.row.gameId"
                    :to="`/games/management/${scope.row.gameId}`" /></template
              ></ElTableColumn>
              <ElTableColumn prop="rounds" label="局數" width="100" align="right" />
              <ElTableColumn label="投注金額" width="150" align="right"
                ><template #default="scope">{{
                  money(scope.row.betAmount)
                }}</template></ElTableColumn
              >
              <ElTableColumn label="派彩金額" width="150" align="right"
                ><template #default="scope">{{
                  money(scope.row.payoutAmount)
                }}</template></ElTableColumn
              >
              <ElTableColumn prop="firstPlayedAt" label="首次遊戲" width="160" />
              <ElTableColumn prop="lastPlayedAt" label="最近遊戲" width="160" />
              <ElTableColumn label="狀態" width="90"
                ><template #default="scope"
                  ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
                    scope.row.status === 'Active' ? '活躍' : '非活躍'
                  }}</ElTag></template
                ></ElTableColumn
              >
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="注單紀錄" name="bets">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>注單紀錄</h3><p>點擊注單或遊戲可前往對應模組追查。</p></div></div
            >
            <ElTable :data="betRecords" border>
              <ElTableColumn label="注單編號" width="130"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.id"
                    :to="`/transactions/bets/${scope.row.id}`" /></template
              ></ElTableColumn>
              <ElTableColumn prop="roundId" label="局號" min-width="180" />
              <ElTableColumn label="遊戲" min-width="170"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.gameName"
                    :secondary="scope.row.gameId"
                    :to="`/games/management/${scope.row.gameId}`" /></template
              ></ElTableColumn>
              <ElTableColumn label="投注／派彩" min-width="160" align="right"
                ><template #default="scope"
                  >{{ money(scope.row.betAmount) }}／{{ money(scope.row.payoutAmount) }}</template
                ></ElTableColumn
              >
              <ElTableColumn label="會員淨額" width="130" align="right"
                ><template #default="scope"
                  ><span :class="scope.row.playerNet >= 0 ? 'positive' : 'negative'">{{
                    money(scope.row.playerNet)
                  }}</span></template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><ElTag :type="betStatusType(scope.row.status)">{{
                    betStatusLabel(scope.row.status)
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn prop="time" label="投注時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="交易紀錄" name="transactions">
          <div class="tab-panel">
            <div class="section-title"
              ><div
                ><h3>交易紀錄</h3><p>正數為入帳，負數為扣款；交易資料不可在此頁修改。</p></div
              ></div
            >
            <ElTable :data="transactionRecords" border>
              <ElTableColumn label="交易編號" width="135"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.id"
                    :to="`/transactions/records/${scope.row.id}`" /></template
              ></ElTableColumn>
              <ElTableColumn label="類型" width="110"
                ><template #default="scope">{{
                  transactionTypeLabel(scope.row.type)
                }}</template></ElTableColumn
              >
              <ElTableColumn label="遊戲／局號" min-width="190"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.gameId"
                    :label="scope.row.gameName"
                    :secondary="scope.row.roundId"
                    :to="`/games/management/${scope.row.gameId}`"
                  /><span v-else>—</span></template
                ></ElTableColumn
              >
              <ElTableColumn label="金額" width="140" align="right"
                ><template #default="scope"
                  ><span :class="scope.row.amount >= 0 ? 'positive' : 'negative'"
                    >{{ money(scope.row.amount) }} {{ scope.row.currency }}</span
                  ></template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope"
                  ><ElTag :type="transactionStatusType(scope.row.status)">{{
                    transactionStatusLabel(scope.row.status)
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn prop="time" label="交易時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="獎池紀錄" name="jackpots">
          <div class="tab-panel">
            <div class="section-title"
              ><div><h3>獎池派發</h3><p>顯示會員中獎與派發狀態，可直接追查獎池。</p></div></div
            >
            <ElTable :data="jackpotRecords" border empty-text="此會員尚無獎池紀錄">
              <ElTableColumn label="獎池" min-width="180"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.poolName"
                    :secondary="scope.row.poolId"
                    :to="`/jackpots/${scope.row.poolId}`" /></template
              ></ElTableColumn>
              <ElTableColumn prop="level" label="級別" width="100" />
              <ElTableColumn label="遊戲" min-width="170"
                ><template #default="scope"
                  ><EntityLink
                    :label="scope.row.gameName"
                    :secondary="scope.row.gameId"
                    :to="`/games/management/${scope.row.gameId}`" /></template
              ></ElTableColumn>
              <ElTableColumn label="派發金額" width="150" align="right"
                ><template #default="scope"
                  >{{ money(scope.row.amount) }} {{ scope.row.currency }}</template
                ></ElTableColumn
              >
              <ElTableColumn prop="roundId" label="局號" min-width="160" />
              <ElTableColumn label="狀態" width="90"
                ><template #default="scope"
                  ><ElTag
                    :type="
                      scope.row.status === 'Paid'
                        ? 'success'
                        : scope.row.status === 'Failed'
                          ? 'danger'
                          : 'warning'
                    "
                    >{{ jackpotStatusLabel(scope.row.status) }}</ElTag
                  ></template
                ></ElTableColumn
              >
              <ElTableColumn prop="payoutAt" label="派發時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="異常紀錄" name="anomalies">
          <div class="tab-panel">
            <div class="section-title"
              ><div
                ><h3>會員異常</h3><p>異常處置仍由風控中心負責，本頁提供完整關聯入口。</p></div
              ></div
            >
            <ElTable :data="anomalyRecords" border empty-text="此會員尚無異常紀錄">
              <ElTableColumn prop="id" label="異常編號" width="120" />
              <ElTableColumn prop="type" label="異常類型" min-width="180" />
              <ElTableColumn label="風險等級" width="100"
                ><template #default="scope"
                  ><ElTag :type="riskLevelType(scope.row.riskLevel)">{{
                    riskLevelLabel(scope.row.riskLevel)
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn label="關聯資料" min-width="210"
                ><template #default="scope"
                  ><div class="related-links"
                    ><EntityLink
                      v-if="scope.row.betId"
                      :label="scope.row.betId"
                      :to="`/transactions/bets/${scope.row.betId}`" /><EntityLink
                      v-if="scope.row.transactionId"
                      :label="scope.row.transactionId"
                      :to="`/transactions/records/${scope.row.transactionId}`" /></div></template
              ></ElTableColumn>
              <ElTableColumn label="案件" width="120"
                ><template #default="scope"
                  ><EntityLink
                    v-if="scope.row.riskCaseId"
                    :label="scope.row.riskCaseId"
                    :to="`/risk/cases/${scope.row.riskCaseId}`"
                  /><span v-else>尚未建案</span></template
                ></ElTableColumn
              >
              <ElTableColumn label="狀態" width="100"
                ><template #default="scope">{{
                  anomalyStatusLabel(scope.row.status)
                }}</template></ElTableColumn
              >
              <ElTableColumn prop="occurredAt" label="發生時間" width="160" />
            </ElTable>
          </div>
        </ElTabPane>

        <ElTabPane label="標記紀錄" name="tags">
          <div class="tab-panel">
            <div class="section-title">
              <div><h3>會員標記</h3><p>測試會員與白名單標記會影響部分營運統計口徑。</p></div>
              <ElButton type="primary" @click="tagVisible = true">新增標記</ElButton>
            </div>
            <ElTable :data="tagRecords" border empty-text="尚無標記紀錄">
              <ElTableColumn label="標記" width="110"
                ><template #default="scope"
                  ><ElTag :type="tagType(scope.row.tag)" effect="light">{{
                    tagLabel(scope.row.tag)
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn prop="reason" label="新增原因" min-width="180" />
              <ElTableColumn prop="note" label="備註" min-width="150"
                ><template #default="scope">{{ scope.row.note || '—' }}</template></ElTableColumn
              >
              <ElTableColumn prop="operator" label="操作人" width="130" />
              <ElTableColumn prop="createdAt" label="新增時間" width="160" />
              <ElTableColumn label="狀態" width="90"
                ><template #default="scope"
                  ><ElTag :type="scope.row.status === 'Active' ? 'success' : 'info'">{{
                    scope.row.status === 'Active' ? '有效' : '已移除'
                  }}</ElTag></template
                ></ElTableColumn
              >
              <ElTableColumn label="移除資訊" min-width="180"
                ><template #default="scope">{{
                  scope.row.removalReason
                    ? `${scope.row.removalReason}｜${scope.row.removedAt}`
                    : '—'
                }}</template></ElTableColumn
              >
              <ElTableColumn label="操作" width="90" fixed="right"
                ><template #default="scope"
                  ><ElButton
                    v-if="scope.row.status === 'Active'"
                    link
                    type="danger"
                    @click="removeMemberTag(scope.row.id)"
                    >移除</ElButton
                  ><span v-else>—</span></template
                ></ElTableColumn
              >
            </ElTable>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDrawer v-model="tagVisible" title="新增會員標記" size="min(92vw, 520px)">
      <ElAlert
        title="新增與移除皆會保留操作原因及時間。"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top">
        <ElFormItem label="標記" required
          ><ElSelect v-model="tagForm.tag" class="w-full"
            ><ElOption
              v-for="option in tagOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value" /></ElSelect
        ></ElFormItem>
        <ElFormItem label="標記原因" required
          ><ElInput
            v-model="tagForm.reason"
            type="textarea"
            :rows="3"
            placeholder="請輸入至少 4 個字"
        /></ElFormItem>
        <ElFormItem label="備註"
          ><ElInput v-model="tagForm.note" type="textarea" :rows="3"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="tagVisible = false">取消</ElButton
        ><ElButton type="primary" @click="saveTag">確認新增</ElButton></template
      >
    </ElDrawer>

    <ElDialog
      v-model="restrictionVisible"
      :title="restrictionAction === 'restrict' ? '限制會員遊戲' : '解除會員限制'"
      width="min(92vw, 620px)"
      destroy-on-close
    >
      <ElAlert
        :title="
          restrictionAction === 'restrict'
            ? '生效後，會員將無法透過此遊戲商進入任何遊戲。'
            : '解除後，會員可恢復進入商戶已啟用的遊戲。'
        "
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <div class="impact-list">
        <div
          ><span>會員</span><strong>{{ member.externalId }}</strong></div
        >
        <div
          ><span>商戶／線路</span
          ><strong>{{ member.merchantName }}／{{ member.lineUid }}</strong></div
        >
        <div><span>影響範圍</span><strong>全部遊戲</strong></div>
      </div>
      <ElForm label-position="top" class="restriction-form">
        <template v-if="restrictionAction === 'restrict'">
          <ElFormItem label="開始時間"
            ><ElDatePicker
              v-model="restrictionForm.startAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm"
              placeholder="留空代表立即生效"
              class="w-full"
          /></ElFormItem>
          <ElFormItem label="結束時間"
            ><ElDatePicker
              v-model="restrictionForm.endAt"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm"
              placeholder="留空代表持續有效"
              class="w-full"
          /></ElFormItem>
        </template>
        <ElFormItem :label="restrictionAction === 'restrict' ? '限制原因' : '解除原因'" required
          ><ElInput
            v-model="restrictionForm.reason"
            type="textarea"
            :rows="3"
            placeholder="請輸入至少 4 個字"
        /></ElFormItem>
        <ElFormItem v-if="restrictionAction === 'restrict'" label="備註"
          ><ElInput v-model="restrictionForm.note" type="textarea" :rows="2"
        /></ElFormItem>
      </ElForm>
      <template #footer
        ><ElButton @click="restrictionVisible = false">取消</ElButton
        ><ElButton
          :type="restrictionAction === 'restrict' ? 'danger' : 'primary'"
          :disabled="restrictionForm.reason.trim().length < 4"
          @click="saveRestriction"
          >確認執行</ElButton
        ></template
      >
    </ElDialog>
  </div>

  <ElResult v-else icon="warning" title="找不到會員資料" sub-title="請確認會員編號是否正確。">
    <template #extra
      ><ElButton type="primary" @click="router.push('/members/management')"
        >返回會員列表</ElButton
      ></template
    >
  </ElResult>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWindowSize } from '@vueuse/core'
  import type {
    MemberBetStatus,
    MemberMerchantStatus,
    MemberRestrictionStatus,
    MemberRiskStatus,
    MemberTagKind,
    MemberTransactionStatus,
    MemberTransactionType,
    WalletMode
  } from '@/types/game-provider'
  import { useMemberCenterStore } from '@/store/modules/memberCenter'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import EntityLink from '@/components/business/game-provider/entity-link/index.vue'

  defineOptions({ name: 'MemberDetail' })

  const route = useRoute()
  const router = useRouter()
  const store = useMemberCenterStore()
  const { width } = useWindowSize()
  const member = computed(() => store.findMember(String(route.params.id)))
  const activeTab = ref(String(route.query.tab || 'profile'))
  const descriptionColumns = computed(() => (width.value < 760 ? 1 : 2))
  const tagVisible = ref(false)
  const restrictionVisible = ref(false)
  const restrictionAction = ref<'restrict' | 'release'>('restrict')
  const tagForm = reactive<{ tag: MemberTagKind | ''; reason: string; note: string }>({
    tag: '',
    reason: '',
    note: ''
  })
  const restrictionForm = reactive({ reason: '', note: '', startAt: '', endAt: '' })
  const tagOptions: Array<{ label: string; value: MemberTagKind }> = [
    { label: '一般', value: 'General' },
    { label: '測試會員', value: 'Test' },
    { label: '白名單', value: 'Whitelist' },
    { label: '觀察', value: 'Watch' },
    { label: '風控', value: 'Risk' }
  ]

  const gameActivities = computed(() =>
    member.value ? store.getGameActivities(member.value.id) : []
  )
  const betRecords = computed(() => (member.value ? store.getBetRecords(member.value.id) : []))
  const transactionRecords = computed(() =>
    member.value ? store.getTransactionRecords(member.value.id) : []
  )
  const jackpotRecords = computed(() =>
    member.value ? store.getJackpotRecords(member.value.id) : []
  )
  const anomalyRecords = computed(() =>
    member.value ? store.getAnomalyRecords(member.value.id) : []
  )
  const tagRecords = computed(() => (member.value ? store.getTagRecords(member.value.id) : []))
  const restrictionRecords = computed(() =>
    member.value ? store.getRestrictionRecords(member.value.id) : []
  )
  const totalBet = computed(() =>
    gameActivities.value.reduce((sum, item) => sum + item.betAmount, 0)
  )
  const totalPayout = computed(() =>
    gameActivities.value.reduce((sum, item) => sum + item.payoutAmount, 0)
  )
  const summary = computed(() =>
    member.value
      ? [
          {
            label: '錢包餘額',
            value: `${money(member.value.wallet.balance)} ${member.value.currency}`,
            note: walletLabel(member.value.walletMode)
          },
          {
            label: '累計投注',
            value: `${money(totalBet.value)} ${member.value.currency}`,
            note: `派彩 ${money(totalPayout.value)}`
          },
          {
            label: '遊戲數',
            value: gameActivities.value.length,
            note: `${betRecords.value.length} 筆近期注單`
          },
          {
            label: '異常紀錄',
            value: anomalyRecords.value.length,
            note: anomalyRecords.value.length ? '請至風控中心處理' : '目前無異常'
          }
        ]
      : []
  )
  const restrictionTagType = computed(() =>
    member.value?.restrictionStatus === 'Active'
      ? 'danger'
      : member.value?.restrictionStatus === 'Scheduled'
        ? 'warning'
        : 'info'
  )

  const money = (value: number) =>
    new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value
    )
  const walletLabel = (mode: WalletMode) => (mode === 'Seamless' ? '單一錢包' : '轉帳錢包')
  const merchantStatusLabel = (status: MemberMerchantStatus) =>
    ({ Active: '啟用', Inactive: '未啟用', Blocked: '已封鎖' })[status]
  const restrictionLabel = (status: MemberRestrictionStatus) =>
    ({ None: '未限制', Scheduled: '已排程', Active: '限制中', Expired: '已到期' })[status]
  const riskLabel = (status: MemberRiskStatus) =>
    ({ Normal: '正常', Attention: '需關注', High: '高風險' })[status]
  const tagLabel = (tag: MemberTagKind) =>
    ({ General: '一般', Test: '測試會員', Whitelist: '白名單', Watch: '觀察', Risk: '風控' })[tag]
  const tagType = (tag: MemberTagKind) =>
    tag === 'Risk'
      ? 'danger'
      : tag === 'Watch'
        ? 'warning'
        : tag === 'Whitelist'
          ? 'success'
          : tag === 'Test'
            ? 'info'
            : 'primary'
  const betStatusLabel = (status: MemberBetStatus) =>
    ({
      'In Progress': '進行中',
      Settled: '已結算',
      Cancelled: '已取消',
      Refunded: '已退款',
      Exception: '異常'
    })[status]
  const betStatusType = (status: MemberBetStatus) =>
    status === 'Settled'
      ? 'success'
      : status === 'Exception'
        ? 'danger'
        : status === 'In Progress'
          ? 'warning'
          : 'info'
  const transactionTypeLabel = (type: MemberTransactionType) =>
    ({
      Bet: '投注',
      Payout: '派彩',
      Refund: '退款',
      Rollback: '回滾',
      Jackpot: '獎池',
      'Transfer In': '轉入',
      'Transfer Out': '轉出'
    })[type]
  const transactionStatusLabel = (status: MemberTransactionStatus) =>
    ({
      Processing: '處理中',
      Success: '成功',
      Failed: '失敗',
      Refunded: '已退款',
      'Rolled Back': '已回滾',
      Exception: '異常'
    })[status]
  const transactionStatusType = (status: MemberTransactionStatus) =>
    status === 'Success'
      ? 'success'
      : ['Failed', 'Exception'].includes(status)
        ? 'danger'
        : status === 'Processing'
          ? 'warning'
          : 'info'
  const jackpotStatusLabel = (status: string) =>
    ({ Pending: '待派發', Paid: '已派發', Failed: '失敗' })[status as 'Pending'] || status
  const riskLevelLabel = (level: string) =>
    ({ Low: '低', Medium: '中', High: '高' })[level as 'Low'] || level
  const riskLevelType = (level: string) =>
    level === 'High' ? 'danger' : level === 'Medium' ? 'warning' : 'info'
  const anomalyStatusLabel = (status: string) =>
    ({ Open: '待處理', Investigating: '調查中', Resolved: '已解決', Dismissed: '已排除' })[
      status as 'Open'
    ] || status
  const restrictionRecordLabel = (status: string) =>
    ({ Scheduled: '已排程', Active: '限制中', Expired: '已到期', Cancelled: '已解除' })[
      status as 'Scheduled'
    ] || status
  const restrictionRecordType = (status: string) =>
    status === 'Active' ? 'danger' : status === 'Scheduled' ? 'warning' : 'info'

  const syncTab = (tab: string | number) =>
    router.replace({ query: { ...route.query, tab: String(tab) } })
  const resetTagForm = () => Object.assign(tagForm, { tag: '', reason: '', note: '' })
  const saveTag = () => {
    if (!member.value || !tagForm.tag || tagForm.reason.trim().length < 4)
      return ElMessage.warning('請選擇標記並輸入至少 4 個字的原因')
    if (member.value.tags.includes(tagForm.tag)) return ElMessage.warning('此會員已有相同標記')
    store.addTag([member.value.id], tagForm.tag, tagForm.reason.trim(), tagForm.note.trim())
    tagVisible.value = false
    resetTagForm()
    ElMessage.success('會員標記已新增')
  }
  const removeMemberTag = async (recordId: string) => {
    if (!member.value) return
    const result = await ElMessageBox.prompt(
      '請輸入移除此標記的原因（至少 4 個字）',
      '移除會員標記',
      {
        confirmButtonText: '確認移除',
        cancelButtonText: '取消',
        inputPattern: /.{4,}/,
        inputErrorMessage: '原因至少需要 4 個字',
        type: 'warning'
      }
    ).catch(() => null)
    if (!result) return
    store.removeTag(member.value.id, recordId, result.value.trim())
    ElMessage.success('會員標記已移除')
  }
  const openRestriction = () => {
    if (!member.value) return
    restrictionAction.value = member.value.restrictionStatus === 'None' ? 'restrict' : 'release'
    Object.assign(restrictionForm, { reason: '', note: '', startAt: '', endAt: '' })
    restrictionVisible.value = true
  }
  const saveRestriction = () => {
    if (!member.value || restrictionForm.reason.trim().length < 4) return
    if (restrictionAction.value === 'restrict') {
      if (
        restrictionForm.startAt &&
        restrictionForm.endAt &&
        restrictionForm.endAt <= restrictionForm.startAt
      )
        return ElMessage.warning('結束時間必須晚於開始時間')
      store.restrictMember(member.value.id, {
        reason: restrictionForm.reason.trim(),
        note: restrictionForm.note.trim(),
        startAt: restrictionForm.startAt,
        endAt: restrictionForm.endAt
      })
      ElMessage.success(restrictionForm.startAt ? '會員限制已建立' : '會員限制已立即生效')
    } else {
      store.releaseRestriction(member.value.id, restrictionForm.reason.trim())
      ElMessage.success('會員限制已解除')
    }
    restrictionVisible.value = false
  }

  watch(
    () => route.query.tab,
    (tab) => {
      if (tab) activeTab.value = String(tab)
    }
  )
</script>

<style scoped lang="scss">
  .member-detail-page {
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
    align-items: center;
    margin-top: 12px;
    color: var(--art-gray-600);
  }

  .hero-meta > span {
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
  .summary-grid small {
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

  .profile-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 16px;
  }

  .section-block,
  .wallet-card {
    min-width: 0;
    padding: 18px;
    border: 1px solid var(--art-gray-200);
    border-radius: 10px;
  }

  .full-width {
    grid-column: 1 / -1;
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

  .section-title h3 {
    color: var(--art-gray-900);
  }

  .section-title p {
    margin-top: 5px;
    font-size: 13px;
    color: var(--art-gray-500);
  }

  .wallet-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .wallet-balance {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 12px;
    align-items: end;
    padding: 18px;
    background: var(--art-gray-50);
    border-radius: 10px;
  }

  .wallet-balance span,
  .wallet-balance small,
  .wallet-breakdown span,
  .updated-at {
    color: var(--art-gray-500);
  }

  .wallet-balance strong {
    font-size: 28px;
    color: var(--theme-color);
  }

  .wallet-balance small {
    grid-column: 1 / -1;
  }

  .wallet-breakdown {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .wallet-breakdown > div {
    display: grid;
    gap: 5px;
    padding: 12px;
    border: 1px solid var(--art-gray-200);
    border-radius: 8px;
  }

  .positive {
    color: var(--el-color-success);
  }

  .negative {
    color: var(--el-color-danger);
  }

  .related-links {
    display: flex;
    gap: 14px;
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

  .restriction-form {
    margin-top: 18px;
  }

  @media (width <= 1000px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .profile-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 560px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .section-block,
    .wallet-card {
      padding: 12px;
    }
  }
</style>
