<template>
  <div class="agent-page">
    <AppPageHeader title="帳號與權限"
      ><template #actions
        ><ElButton type="primary" :disabled="!canManage" @click="visible = true"
          >新增帳號邀請</ElButton
        ></template
      ></AppPageHeader
    >
    <ArtSearchBar label-position="top"
      :model-value="draft"
      @update:model-value="Object.assign(draft, $event)"
      :items="items"
      :show-expand="false"
      :is-expand="true"
      @search="search"
      @reset="reset"
    />
    <ElCard shadow="never">
      <ArtTable
        :data="rows.slice((page - 1) * size, page * size)"
        :show-table-header="false"
        height="auto"
        :pagination="{ current: page, size, total: rows.length }"
        @pagination:current-change="page = $event"
        @pagination:size-change="changePageSize"
      >
        <ElTableColumn prop="name" label="姓名" min-width="140" />
        <ElTableColumn prop="account" label="帳號" min-width="220" />
        <ElTableColumn label="角色" min-width="160"
          ><template #default="{ row }"
            ><ElSelect
              :model-value="row.roleId"
              :disabled="!canManage || row.id === store.currentStaffId"
              :aria-label="row.name + '的角色'"
              @change="changeRole(row.id, $event)"
              ><ElOption
                v-for="role in store.roles"
                :key="role.id"
                :label="role.name"
                :value="role.id" /></ElSelect></template
        ></ElTableColumn>
        <ElTableColumn prop="scope" label="資料範圍" min-width="180" />
        <ElTableColumn label="狀態" width="100"
          ><template #default="{ row }"
            ><ElTag :type="row.status === 'Active' ? 'success' : 'info'">{{
              statusText[row.status]
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="100" fixed="right"
          ><template #default="{ row }"
            ><ElButton
              link
              :disabled="!canManage || row.id === store.currentStaffId || row.status === 'Pending'"
              @click="toggle(row.id)"
              >{{ row.status === 'Inactive' ? '啟用' : '停用' }}</ElButton
            ></template
          ></ElTableColumn
        >
      </ArtTable>
    </ElCard>
    <ElCard shadow="never"
      ><template #header>角色權限</template>
      <ArtTable :data="store.roles" :show-table-header="false" height="auto"
        ><ElTableColumn prop="name" label="角色" width="140" /><ElTableColumn
          label="可執行操作"
          min-width="260"
          ><template #default="{ row }">{{
            row.permissions.map((p: AgentPermission) => permissionLabels[p]).join('、') ||
            '唯讀查閱'
          }}</template></ElTableColumn
        ></ArtTable
      >
    </ElCard>
    <ElDialog v-model="visible" title="新增帳號邀請" width="min(480px, 95vw)">
      <ElForm label-position="top" @submit.prevent="invite"
        ><ElFormItem label="姓名"><ElInput v-model="form.name" /></ElFormItem
        ><ElFormItem label="電子郵件"><ElInput v-model="form.account" /></ElFormItem
        ><ElFormItem label="角色"
          ><ElSelect v-model="form.roleId"
            ><ElOption
              v-for="role in store.roles"
              :key="role.id"
              :label="role.name"
              :value="role.id" /></ElSelect></ElFormItem
      ></ElForm>
      <p>邀請建立後為待接受狀態；目前原型不會寄送電子郵件。</p>
      <template #footer
        ><ElButton @click="visible = false">取消</ElButton
        ><ElButton type="primary" @click="invite">建立邀請</ElButton></template
      >
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useAgentPortalStore, type AgentPermission } from '@/store/modules/agentPortal'
  const store = useAgentPortalStore(),
    canManage = computed(() => store.hasPermission('staff:manage'))
  const statusText: Record<string, string> = { Active: '啟用', Inactive: '停用', Pending: '待接受' }
  const permissionLabels: Record<AgentPermission, string> = {
    'relations:manage': '關係申請',
    'merchants:apply': '商戶申請',
    'terms:apply': '條件申請',
    'finance:confirm': '對帳確認及差異回報',
    'reports:export': '報表下載',
    'staff:manage': '帳號管理'
  }
  const draft = reactive({ keyword: '' }),
    applied = ref(''),
    page = ref(1),
    size = ref(20),
    visible = ref(false)
  const form = reactive({ name: '', account: '', roleId: 'ROLE-AGENT-AUDIT' })
  const items = [{ key: 'keyword', label: '姓名或帳號', type: 'input', props: { clearable: true } }]
  const rows = computed(() =>
    store.staff.filter((s) =>
      (s.name + ' ' + s.account).toLowerCase().includes(applied.value.toLowerCase())
    )
  )
  function search() {
    applied.value = draft.keyword.trim()
    page.value = 1
  }
  function reset() {
    draft.keyword = ''
    search()
  }
  function invite() {
    const result = store.inviteStaff(form)
    ElMessage[result.ok ? 'success' : 'error'](result.message)
    if (result.ok) {
      visible.value = false
      Object.assign(form, { name: '', account: '', roleId: 'ROLE-AGENT-AUDIT' })
    }
  }
  function changeRole(id: string, role: string) {
    if (!store.updateStaffRole(id, role)) ElMessage.error('無法更新此帳號角色')
  }
  function toggle(id: string) {
    if (!store.toggleStaffStatus(id)) ElMessage.error('無法變更此帳號狀態')
  }
function changePageSize(value: number) { size.value = value; page.value = 1 }
</script>
<style scoped lang="scss">
  @use '../shared';
</style>
