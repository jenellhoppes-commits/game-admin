<template>
  <div class="agent-page">
    <AppPageHeader
      eyebrow="代理後台／合作管理"
      title="代理關係"
      description="新增下級直接建立；停用與移轉維持申請流程。"
    >
      <template #actions>
        <ElButton
          type="primary"
          :disabled="!store.hasPermission('relations:manage')"
          @click="openRequest('新增下級')"
        >
          新增下級代理
        </ElButton>
      </template>
    </AppPageHeader>

    <div class="agent-grid-2">
      <ElCard shadow="never">
        <template #header>
          <div class="agent-card-title">
            <div><strong>授權代理樹</strong><small>全域層級 L1–L3</small></div>
          </div>
        </template>
        <ElTree
          :data="treeData"
          node-key="id"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="onNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <strong>{{ data.code }}／{{ data.name }}</strong>
              <small>{{ data.level }}・直屬商戶 {{ data.merchantCount }}</small>
            </span>
          </template>
        </ElTree>
      </ElCard>

      <ElCard shadow="never">
        <template #header>
          <div class="agent-card-title">
            <div><strong>節點摘要</strong><small>僅限目前授權樹</small></div>
          </div>
        </template>
        <ElDescriptions v-if="selected" :column="1" border>
          <ElDescriptionsItem label="代理代碼">{{ selected.code }}</ElDescriptionsItem>
          <ElDescriptionsItem label="名稱">{{ selected.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="全域層級">{{ selected.level }}</ElDescriptionsItem>
          <ElDescriptionsItem label="直接上級">{{ selected.parentAgent }}</ElDescriptionsItem>
          <ElDescriptionsItem label="狀態">{{ statusLabel(selected.status) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="生效期間"
            >{{ selected.cooperationStartDate || '未取得' }} ～ —</ElDescriptionsItem
          >
          <ElDescriptionsItem label="直屬商戶">{{ selected.merchantCount }}</ElDescriptionsItem>
        </ElDescriptions>
        <ElEmpty v-else description="請從左側選擇代理" />
        <ElAlert
          v-if="selected?.level === 'L3'"
          class="agent-dialog-note"
          type="warning"
          :closable="false"
          title="L3 不能再新增下級"
        />
        <div
          v-if="selected && selected.id !== currentAgentId"
          class="agent-inline-actions action-row"
        >
          <ElButton
            :disabled="!store.hasPermission('relations:manage')"
            @click="openRequest('停用代理')"
            >停用申請</ElButton
          >
          <ElButton
            :disabled="!store.hasPermission('relations:manage')"
            @click="openRequest('移轉代理')"
            >移轉申請</ElButton
          >
        </div>
      </ElCard>
    </div>

    <ElCard shadow="never">
      <template #header>
        <div class="agent-card-title">
          <div><strong>授權後代列表</strong><small>不顯示上級或兄弟代理</small></div>
        </div>
      </template>
      <ArtSearchBar
        label-position="top"
        :model-value="draft"
        @update:model-value="Object.assign(draft, $event)"
        :items="searchItems"
        :show-expand="false"
        :is-expand="true"
        @search="applyFilters"
        @reset="resetFilters"
      />
      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        :data="pagedRows"
        :pagination="{ current: page, size: pageSize, total: filteredRows.length }"
        :pagination-options="{ pageSizes: [20, 50, 100] }"
        @pagination:current-change="page = $event"
        @pagination:size-change="pageSize = $event"
        row-key="id"
      >
        <ElTableColumn prop="code" label="代理代碼" min-width="125" />
        <ElTableColumn prop="name" label="名稱" min-width="150" />
        <ElTableColumn prop="level" label="層級" width="80" />
        <ElTableColumn prop="parentAgent" label="直接上級" min-width="140" />
        <ElTableColumn label="狀態" width="100">
          <template #default="scope">{{ statusLabel(scope.row.status) }}</template>
        </ElTableColumn>
        <ElTableColumn label="生效期間" min-width="180">
          <template #default="scope"
            >{{ scope.row.cooperationStartDate || '未取得' }} ～ —</template
          >
        </ElTableColumn>
        <ElTableColumn prop="merchantCount" label="直屬商戶" width="100" align="right" />
      </ArtTable>
    </ElCard>

    <ElCard shadow="never" class="history-card">
      <template #header>
        <div class="agent-card-title">
          <div><strong>申請與歷程</strong><small>Pending 不代表已生效</small></div>
        </div>
      </template>
      <ArtTable
        :show-table-header="false"
        height="auto"
        empty-height="240px"
        empty-text="沒有符合條件的資料"
        :data="relationRequests"
        row-key="id"
      >
        <ElTableColumn prop="id" label="申請編號" min-width="165" />
        <ElTableColumn prop="action" label="類型" width="120" />
        <ElTableColumn prop="targetName" label="對象" min-width="150" />
        <ElTableColumn prop="reason" label="原因" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="createdAt" label="申請時間" min-width="160" />
        <ElTableColumn label="狀態" width="110">
          <template #default="scope">
            <ElTag :type="scope.row.status === 'Pending' ? 'warning' : 'success'" effect="plain">
              {{ requestStatus(scope.row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="有效關係" width="110">
          <template #default="scope">{{ scope.row.effective ? '已生效' : '未生效' }}</template>
        </ElTableColumn>
      </ArtTable>
    </ElCard>

    <ElDialog
      v-model="requestVisible"
      :title="requestForm.action === '新增下級' ? '新增下級代理' : `${requestForm.action}申請`"
      width="min(92vw, 580px)"
    >
      <ElForm label-position="top">
        <ElFormItem v-if="requestForm.action === '新增下級'" label="上級代理">
          <ElSelect v-model="requestForm.parentId" class="full-width">
            <ElOption
              v-for="agent in parentCandidates"
              :key="agent.id"
              :label="`${agent.code}／${agent.name}／${agent.level}`"
              :value="agent.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="requestForm.action === '新增下級'" label="新代理名稱">
          <ElInput v-model="requestForm.name" maxlength="80" />
        </ElFormItem>
        <ElFormItem v-else label="申請對象">
          <ElInput :model-value="selected ? `${selected.code}／${selected.name}` : ''" disabled />
        </ElFormItem>
        <ElFormItem v-if="requestForm.action === '移轉代理'" label="新上級代理">
          <ElSelect v-model="requestForm.newParentId" class="full-width">
            <ElOption
              v-for="agent in transferParents"
              :key="agent.id"
              :label="`${agent.code}／${agent.name}／${agent.level}`"
              :value="agent.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="requestForm.action === '新增下級' ? '備註（選填）' : '申請原因'">
          <ElInput
            v-model="requestForm.reason"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
          />
        </ElFormItem>
      </ElForm>
      <ElAlert
        v-if="requestForm.action !== '新增下級'"
        type="info"
        :closable="false"
        title="送出只建立申請"
        description="系統會檢查父節點、循環與 L3 上限；總後台核准前有效關係不變。連鎖停用規則尚未定案。"
      />
      <template #footer>
        <ElButton @click="requestVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitRequest">{{
          requestForm.action === '新增下級' ? '建立代理' : '送出申請'
        }}</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { CURRENT_AGENT_ID, useAgentPortalStore } from '@/store/modules/agentPortal'
  import type { AgentRecord, AgentStatus } from '@/types/game-provider'

  defineOptions({ name: 'AgentPortalRelationships' })

  const store = useAgentPortalStore()

  const searchItems = [
    { key: 'keyword', label: '代碼或名稱', type: 'input', props: { clearable: true } },
    {
      key: 'level',
      label: '層級',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: 'L2', value: 'L2' },
          { label: 'L3', value: 'L3' }
        ]
      }
    },
    {
      key: 'status',
      label: '狀態',
      type: 'select',
      props: {
        clearable: true,
        options: [
          { label: '合作中', value: 'Active' },
          { label: '待生效', value: 'Pending' }
        ]
      }
    }
  ]
  const currentAgentId = CURRENT_AGENT_ID
  const selectedId = ref(CURRENT_AGENT_ID)
  const selected = computed(() =>
    store.visibleAgents.find((agent) => agent.id === selectedId.value)
  )
  const page = ref(1)
  const pageSize = ref(20)
  const draft = reactive({ keyword: '', level: '', status: '' })
  const applied = reactive({ keyword: '', level: '', status: '' })
  const requestVisible = ref(false)
  const requestForm = reactive({
    action: '新增下級' as '新增下級' | '停用代理' | '移轉代理',
    parentId: CURRENT_AGENT_ID,
    newParentId: '',
    name: '',
    reason: ''
  })

  const treeData = computed(() => {
    const build = (parentId?: string): any[] =>
      store.visibleAgents
        .filter((agent) => agent.parentAgentId === parentId)
        .map((agent) => ({ ...agent, children: build(agent.id) }))
    return build(undefined).filter((agent) => agent.id === CURRENT_AGENT_ID)
  })
  const parentCandidates = computed(() =>
    store.visibleAgents.filter((agent) => agent.level !== 'L3')
  )
  const transferParents = computed(() =>
    store.visibleAgents.filter((agent) => agent.id !== selected.value?.id && agent.level !== 'L3')
  )
  const filteredRows = computed(() => {
    const keyword = applied.keyword.trim().toLowerCase()
    return store.descendantAgents.filter(
      (agent) =>
        (!keyword || `${agent.code}${agent.name}`.toLowerCase().includes(keyword)) &&
        (!applied.level || agent.level === applied.level) &&
        (!applied.status || agent.status === applied.status)
    )
  })
  const pagedRows = computed(() =>
    filteredRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  )
  const relationRequests = computed(() =>
    store.requests.filter((request) => request.category === '關係')
  )

  watch(pageSize, () => (page.value = 1))

  function onNodeClick(agent: AgentRecord) {
    selectedId.value = agent.id
  }

  function applyFilters() {
    Object.assign(applied, draft)
    page.value = 1
  }

  function resetFilters() {
    Object.assign(draft, { keyword: '', level: '', status: '' })
    applyFilters()
  }

  function openRequest(action: typeof requestForm.action) {
    requestForm.action = action
    requestForm.parentId =
      selected.value?.level === 'L3' ? CURRENT_AGENT_ID : selected.value?.id || CURRENT_AGENT_ID
    requestForm.newParentId = ''
    requestForm.name = ''
    requestForm.reason = ''
    requestVisible.value = true
  }

  function submitRequest() {
    const result = store.submitRelationRequest({
      action: requestForm.action,
      targetId: selected.value?.id,
      parentId: requestForm.parentId,
      newParentId: requestForm.newParentId,
      name: requestForm.name,
      reason: requestForm.reason
    })
    if (!result.ok) return ElMessage.warning(result.message)
    requestVisible.value = false
    resetFilters()
    ElMessage.success(result.message)
  }

  function statusLabel(status: AgentStatus) {
    return (
      (
        { Active: '合作中', Pending: '待生效', Disabled: '已停用', Draft: '草稿' } as Record<
          string,
          string
        >
      )[status] || status
    )
  }

  function requestStatus(status: string) {
    return (
      (
        { Pending: '待審核', Approved: '已核准', Rejected: '已駁回', Resolved: '已處理' } as Record<
          string,
          string
        >
      )[status] || status
    )
  }
</script>

<style scoped lang="scss">
  @use '../shared';

  .tree-node {
    display: grid;
    gap: 2px;
    padding: 6px 0;
  }

  .tree-node small {
    color: var(--art-gray-500);
  }

  .action-row,
  .history-card {
    margin-top: 16px;
  }

  .list-filter {
    margin-bottom: 4px;
  }

  .full-width {
    width: 100%;
  }
</style>
