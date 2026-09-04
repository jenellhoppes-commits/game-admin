<template>
  <div class="page">
    <AppPageHeader
      :title="copy.title"
      eyebrow="平台管理 · 帳號與權限"
      :description="copy.description"
    >
      <template #actions>
        <ElButton @click="ElMessage.success('目前清單已匯出')">匯出</ElButton>
        <ElButton v-if="mode === 'accounts'" type="primary" @click="openAccount()"
          >新增人員</ElButton
        >
        <ElButton v-else type="primary" @click="openRole()">新增角色</ElButton>
      </template>
    </AppPageHeader>

    <div v-if="mode === 'accounts'" class="summary-grid">
      <button type="button" @click="setSummaryFilter('')"
        ><span>人員帳號</span><strong>{{ store.accounts.length }}</strong
        ><small>全部後台使用者</small></button
      >
      <button type="button" @click="setSummaryFilter('Active')"
        ><span>啟用帳號</span><strong>{{ activeAccounts }}</strong
        ><small>可正常登入</small></button
      >
      <button type="button" @click="setSummaryFilter('Locked')"
        ><span>鎖定帳號</span><strong class="danger">{{ lockedAccounts }}</strong
        ><small>需要管理員處理</small></button
      >
      <button type="button" @click="setSummaryFilter('Pending')"
        ><span>待啟用帳號</span><strong class="warning">{{ pendingAccounts }}</strong
        ><small>尚未完成首次登入</small></button
      >
    </div>
    <div v-else class="summary-grid">
      <div
        ><span>角色總數</span><strong>{{ store.roles.length }}</strong
        ><small>內建與自訂角色</small></div
      >
      <div
        ><span>啟用角色</span><strong>{{ activeRoles.length }}</strong
        ><small>可指派給人員</small></div
      >
      <div
        ><span>權限項目</span><strong>{{ store.permissions.length }}</strong
        ><small>依功能模組分組</small></div
      >
      <div
        ><span>高風險權限</span><strong class="warning">{{ sensitivePermissions.length }}</strong
        ><small>指派時需確認</small></div
      >
    </div>

    <ElAlert :title="copy.rule" type="info" :closable="false" show-icon />

    <template v-if="mode === 'accounts'">
      <ElCard shadow="never" class="filter-card"
        ><ElForm inline
          ><ElFormItem label="關鍵字"
            ><ElInput
              v-model="filters.keyword"
              clearable
              placeholder="帳號、姓名或 Email" /></ElFormItem
          ><ElFormItem label="部門"
            ><ElSelect v-model="filters.department" clearable placeholder="全部部門"
              ><ElOption
                v-for="item in departments"
                :key="item"
                :label="item"
                :value="item" /></ElSelect></ElFormItem
          ><ElFormItem label="狀態"
            ><ElSelect v-model="filters.status" clearable placeholder="全部狀態"
              ><ElOption label="啟用" value="Active" /><ElOption
                label="鎖定"
                value="Locked" /><ElOption label="停用" value="Inactive" /><ElOption
                label="待啟用"
                value="Pending" /></ElSelect></ElFormItem
          ><ElFormItem><ElButton type="primary">查詢</ElButton></ElFormItem
          ><ElFormItem><ElButton @click="resetFilters">重置</ElButton></ElFormItem></ElForm
        ></ElCard
      >
      <ElCard shadow="never" class="table-card"
        ><div class="toolbar"
          ><div
            ><strong>人員帳號清單</strong><span>共 {{ accountRows.length }} 筆</span></div
          ><span>帳號停用不會刪除歷史操作紀錄</span></div
        >
        <ElTable :data="accountRows" border row-key="id"
          ><ElTableColumn label="帳號" min-width="230" fixed="left"
            ><template #default="scope"
              ><button class="link account-name" type="button" @click="openAccount(scope.row)"
                ><ElAvatar :size="34">{{ scope.row.displayName.slice(0, 1) }}</ElAvatar
                ><span
                  ><strong>{{ scope.row.displayName }}</strong
                  ><small>{{ scope.row.username }} · {{ scope.row.id }}</small></span
                ></button
              ></template
            ></ElTableColumn
          ><ElTableColumn prop="department" label="部門" min-width="130" /><ElTableColumn
            label="角色"
            min-width="180"
            ><template #default="scope"
              ><ElTag
                v-for="name in store.getRoleNames(scope.row.roleIds)"
                :key="name"
                effect="plain"
                >{{ name }}</ElTag
              ></template
            ></ElTableColumn
          ><ElTableColumn label="MFA" width="90" align="center"
            ><template #default="scope"
              ><ElTag :type="scope.row.mfaEnabled ? 'success' : 'warning'">{{
                scope.row.mfaEnabled ? '已啟用' : '未啟用'
              }}</ElTag></template
            ></ElTableColumn
          ><ElTableColumn label="最後登入" min-width="180"
            ><template #default="scope"
              >{{ scope.row.lastLoginAt || '尚未登入' }}<br /><small>{{
                scope.row.lastLoginIp || '—'
              }}</small></template
            ></ElTableColumn
          ><ElTableColumn label="狀態" width="100"
            ><template #default="scope"
              ><ElTag :type="accountStatusType(scope.row.status)">{{
                accountStatusLabel(scope.row.status)
              }}</ElTag></template
            ></ElTableColumn
          ><ElTableColumn label="操作" width="200" fixed="right"
            ><template #default="scope"
              ><ElButton link type="primary" @click="openAccount(scope.row)">編輯</ElButton
              ><ElButton link @click="resetPassword(scope.row.id)">重設密碼</ElButton
              ><ElButton
                v-if="scope.row.status === 'Locked'"
                link
                type="success"
                @click="unlock(scope.row.id)"
                >解鎖</ElButton
              ><ElButton
                v-else-if="scope.row.status === 'Active' && !scope.row.roleIds.includes('ROLE-001')"
                link
                type="danger"
                @click="disable(scope.row.id)"
                >停用</ElButton
              ></template
            ></ElTableColumn
          ></ElTable
        >
      </ElCard>
    </template>

    <template v-else-if="mode === 'roles'">
      <ElAlert
        title="在同一個角色內設定功能權限、高風險權限與資料範圍；儲存後會同步套用到所有被指派的人員帳號。"
        type="info"
        :closable="false"
        show-icon
      />
      <ElCard shadow="never" class="table-card"
        ><div class="toolbar"
          ><div
            ><strong>角色清單</strong><span>共 {{ store.roles.length }} 個角色</span></div
          ><ElButton type="primary" plain @click="openRole()">新增角色</ElButton></div
        >
        <ElTable :data="store.roles" border row-key="id"
          ><ElTableColumn label="角色" min-width="230" fixed="left"
            ><template #default="scope"
              ><strong>{{ scope.row.name }}</strong
              ><br /><small>{{ scope.row.code }} · {{ scope.row.id }}</small></template
            ></ElTableColumn
          ><ElTableColumn prop="description" label="說明" min-width="260" /><ElTableColumn
            prop="accountCount"
            label="帳號數"
            width="90"
            align="center"
          /><ElTableColumn label="全部權限" width="110" align="center"
            ><template #default="scope">{{
              scope.row.permissionIds.length
            }}</template></ElTableColumn
          ><ElTableColumn label="敏感權限" width="110" align="center"
            ><template #default="scope"
              ><strong :class="{ warning: scope.row.sensitivePermissionIds.length }">{{
                scope.row.sensitivePermissionIds.length
              }}</strong></template
            ></ElTableColumn
          ><ElTableColumn label="資料範圍" min-width="160"
            ><template #default="scope">{{
              scopeName(scope.row.dataScopeId)
            }}</template></ElTableColumn
          ><ElTableColumn label="類型" width="100"
            ><template #default="scope"
              ><ElTag :type="scope.row.builtIn ? 'warning' : 'info'">{{
                scope.row.builtIn ? '內建' : '自訂'
              }}</ElTag></template
            ></ElTableColumn
          ><ElTableColumn label="操作" width="120" fixed="right"
            ><template #default="scope"
              ><ElButton link type="primary" @click="openRole(scope.row.id)"
                >配置角色</ElButton
              ></template
            ></ElTableColumn
          ></ElTable
        >
      </ElCard>
    </template>

    <template v-else-if="mode === 'permissions'">
      <ElCard shadow="never" class="permission-layout"
        ><div class="role-selector"
          ><span>設定角色</span
          ><ElSelect v-model="selectedRoleId" @change="loadRolePermissions"
            ><ElOption
              v-for="item in store.roles"
              :key="item.id"
              :label="`${item.name}｜${item.code}`"
              :value="item.id" /></ElSelect
          ><small>敏感權限需至獨立頁面申請與審核</small></div
        ><div class="permission-actions"
          ><span>已選 {{ selectedPermissionIds.length }}／{{ normalPermissions.length }} 項</span
          ><ElButton type="primary" @click="savePermissions">儲存操作權限</ElButton></div
        ></ElCard
      >
      <ElCard
        v-for="group in permissionGroups"
        :key="group.module"
        shadow="never"
        class="permission-group"
        ><template #header
          ><div class="group-title"
            ><strong>{{ group.module }}</strong
            ><span
              >{{
                group.items.filter((item) => selectedPermissionIds.includes(item.id)).length
              }}／{{ group.items.length }}</span
            ></div
          ></template
        ><div class="permission-list"
          ><label v-for="item in group.items" :key="item.id"
            ><ElCheckbox
              :model-value="selectedPermissionIds.includes(item.id)"
              @change="togglePermission(item.id, $event)"
              ><span class="permission-label"
                ><strong>{{ item.name }}</strong
                ><small>{{ item.description }}</small></span
              ></ElCheckbox
            ><ElTag :type="riskType(item.riskLevel)" effect="plain">{{
              riskLabel(item.riskLevel)
            }}</ElTag></label
          ></div
        ></ElCard
      >
    </template>

    <template v-else-if="mode === 'sensitive'">
      <ElCard shadow="never" class="table-card"
        ><div class="toolbar"
          ><div
            ><strong>敏感權限申請</strong><span>共 {{ store.sensitiveGrants.length }} 筆</span></div
          ><span>核准後才會加入角色，並保留申請原因及期限</span></div
        >
        <ElTable :data="store.sensitiveGrants" border row-key="id"
          ><ElTableColumn label="申請" min-width="170" fixed="left"
            ><template #default="scope"
              ><strong>{{ scope.row.id }}</strong
              ><br /><small>{{ scope.row.requestedAt }}</small></template
            ></ElTableColumn
          ><ElTableColumn label="角色" min-width="150"
            ><template #default="scope">{{ roleName(scope.row.roleId) }}</template></ElTableColumn
          ><ElTableColumn label="敏感權限" min-width="220"
            ><template #default="scope"
              ><strong>{{ permissionName(scope.row.permissionId) }}</strong
              ><br /><small>{{ permissionDescription(scope.row.permissionId) }}</small></template
            ></ElTableColumn
          ><ElTableColumn prop="reason" label="申請原因" min-width="240" /><ElTableColumn
            prop="requestedBy"
            label="申請人"
            min-width="130"
          /><ElTableColumn label="有效期限" min-width="160"
            ><template #default="scope">{{
              scope.row.expiresAt || '永久'
            }}</template></ElTableColumn
          ><ElTableColumn label="狀態" width="110"
            ><template #default="scope"
              ><ElTag :type="grantStatusType(scope.row.status)">{{
                grantStatusLabel(scope.row.status)
              }}</ElTag></template
            ></ElTableColumn
          ><ElTableColumn label="操作" width="130" fixed="right"
            ><template #default="scope"
              ><template v-if="scope.row.status === 'Pending Review'"
                ><ElButton link type="success" @click="reviewGrant(scope.row.id, true)"
                  >核准</ElButton
                ><ElButton link type="danger" @click="reviewGrant(scope.row.id, false)"
                  >駁回</ElButton
                ></template
              ><span v-else>—</span></template
            ></ElTableColumn
          ></ElTable
        >
      </ElCard>
    </template>

    <template v-else>
      <ElCard shadow="never" class="table-card"
        ><div class="toolbar"
          ><div
            ><strong>資料範圍清單</strong><span>共 {{ store.dataScopes.length }} 組</span></div
          ><ElButton type="primary" plain @click="ElMessage.info('演示版先編輯既有資料範圍')"
            >新增資料範圍</ElButton
          ></div
        >
        <ElTable :data="store.dataScopes" border row-key="id"
          ><ElTableColumn label="資料範圍" min-width="220" fixed="left"
            ><template #default="scope"
              ><strong>{{ scope.row.name }}</strong
              ><br /><small>{{ scope.row.id }}</small></template
            ></ElTableColumn
          ><ElTableColumn label="範圍類型" min-width="150"
            ><template #default="scope"
              ><ElTag effect="plain">{{ scopeTypeLabel(scope.row.type) }}</ElTag></template
            ></ElTableColumn
          ><ElTableColumn prop="description" label="說明" min-width="280" /><ElTableColumn
            label="指定代理"
            width="100"
            align="center"
            ><template #default="scope">{{
              scope.row.agentIds.length || '—'
            }}</template></ElTableColumn
          ><ElTableColumn label="指定商戶" width="100" align="center"
            ><template #default="scope">{{
              scope.row.merchantIds.length || '—'
            }}</template></ElTableColumn
          ><ElTableColumn prop="roleCount" label="角色數" width="90" align="center" /><ElTableColumn
            prop="updatedAt"
            label="更新時間"
            min-width="160"
          /><ElTableColumn label="操作" width="100" fixed="right"
            ><template #default="scope"
              ><ElButton link type="primary" @click="openScope(scope.row.id)"
                >編輯範圍</ElButton
              ></template
            ></ElTableColumn
          ></ElTable
        >
      </ElCard>
    </template>

    <ElDialog
      v-model="accountDialog"
      :title="accountForm.id ? '編輯後台帳號' : '新增後台帳號'"
      width="min(640px, 94vw)"
      ><ElAlert
        title="新帳號建立後為待啟用狀態，使用者完成首次密碼設定後才可登入。"
        type="info"
        :closable="false"
      /><ElForm label-position="top" class="dialog-form"
        ><div class="form-grid"
          ><ElFormItem label="登入帳號" required
            ><ElInput
              v-model="accountForm.username"
              :disabled="Boolean(accountForm.id)" /></ElFormItem
          ><ElFormItem label="顯示名稱" required
            ><ElInput v-model="accountForm.displayName" /></ElFormItem></div
        ><ElFormItem label="Email" required><ElInput v-model="accountForm.email" /></ElFormItem
        ><div class="form-grid"
          ><ElFormItem label="所屬部門" required
            ><ElSelect v-model="accountForm.department" class="full"
              ><ElOption
                v-for="item in departments"
                :key="item"
                :label="item"
                :value="item" /></ElSelect></ElFormItem
          ><ElFormItem label="角色" required
            ><ElSelect v-model="accountForm.roleIds" multiple class="full"
              ><ElOption
                v-for="item in activeRoles"
                :key="item.id"
                :label="item.name"
                :value="item.id" /></ElSelect></ElFormItem></div
        ><ElFormItem label="多因素驗證"
          ><ElSwitch v-model="accountForm.mfaEnabled" /><span class="inline-hint"
            >高權限角色建議強制啟用</span
          ></ElFormItem
        ></ElForm
      ><template #footer
        ><ElButton @click="accountDialog = false">取消</ElButton
        ><ElButton type="primary" @click="saveAccount">儲存帳號</ElButton></template
      ></ElDialog
    >

    <ElDialog
      v-model="roleDialog"
      :title="editingRole ? '角色權限配置' : '新增角色'"
      width="min(920px, 96vw)"
      class="role-permission-dialog"
    >
      <ElForm label-position="top" class="dialog-form">
        <div class="form-grid">
          <ElFormItem label="角色名稱" required>
            <ElInput v-model="roleForm.name" :disabled="Boolean(editingRole?.builtIn)" />
          </ElFormItem>
          <ElFormItem label="角色代碼" required>
            <ElInput
              v-model="roleForm.code"
              :disabled="Boolean(editingRole)"
              placeholder="例如 FINANCE_ADMIN"
            />
          </ElFormItem>
        </div>
        <ElFormItem label="角色說明">
          <ElInput v-model="roleForm.description" />
        </ElFormItem>
        <ElFormItem label="資料範圍" required>
          <ElSelect v-model="roleForm.dataScopeId" class="full">
            <ElOption
              v-for="item in activeScopes"
              :key="item.id"
              :label="`${item.name}｜${scopeTypeLabel(item.type)}`"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <div class="permission-editor-heading">
        <div>
          <strong>功能權限</strong>
          <span>已選 {{ roleForm.permissionIds.length }}／{{ store.permissions.length }} 項</span>
        </div>
        <ElButton link type="primary" @click="toggleAllRolePermissions">
          {{ roleForm.permissionIds.length === store.permissions.length ? '全部取消' : '全部選取' }}
        </ElButton>
      </div>
      <ElAlert
        v-if="selectedSensitiveCount"
        :title="`目前包含 ${selectedSensitiveCount} 項高風險權限，請確認此角色確實需要。`"
        type="warning"
        :closable="false"
        show-icon
      />
      <ElCheckboxGroup v-model="roleForm.permissionIds" class="role-permission-groups">
        <section
          v-for="group in rolePermissionGroups"
          :key="group.module"
          class="role-permission-group"
        >
          <div class="group-title">
            <strong>{{ group.module }}</strong>
            <span
              >{{
                group.items.filter((item) => roleForm.permissionIds.includes(item.id)).length
              }}／{{ group.items.length }}</span
            >
          </div>
          <label v-for="item in group.items" :key="item.id">
            <ElCheckbox :value="item.id">
              <span class="permission-label">
                <strong>{{ item.name }}</strong>
                <small>{{ item.description }}</small>
              </span>
            </ElCheckbox>
            <ElTag :type="riskType(item.riskLevel)" effect="plain">
              {{ item.sensitive ? '敏感' : riskLabel(item.riskLevel) }}
            </ElTag>
          </label>
        </section>
      </ElCheckboxGroup>
      <template #footer>
        <ElButton @click="roleDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveRole">儲存角色與權限</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="scopeDialog" title="編輯資料範圍" width="min(680px, 94vw)"
      ><ElForm label-position="top"
        ><ElFormItem label="範圍名稱"><ElInput v-model="scopeForm.name" /></ElFormItem
        ><ElFormItem label="類型"
          ><ElSelect v-model="scopeForm.type" class="full"
            ><ElOption label="全平台資料" value="All" /><ElOption
              label="所屬部門"
              value="Department" /><ElOption label="指定代理" value="Assigned Agents" /><ElOption
              label="指定商戶"
              value="Assigned Merchants" /><ElOption
              label="僅本人資料"
              value="Self" /></ElSelect></ElFormItem
        ><ElFormItem v-if="scopeForm.type === 'Assigned Agents'" label="指定代理"
          ><ElSelect v-model="scopeForm.agentIds" multiple filterable class="full"
            ><ElOption
              v-for="item in partnerStore.agents"
              :key="item.id"
              :label="`${item.name}｜${item.code}`"
              :value="item.id" /></ElSelect></ElFormItem
        ><ElFormItem v-if="scopeForm.type === 'Assigned Merchants'" label="指定商戶"
          ><ElSelect v-model="scopeForm.merchantIds" multiple filterable class="full"
            ><ElOption
              v-for="item in partnerStore.merchants"
              :key="item.id"
              :label="`${item.name}｜${item.code}`"
              :value="item.id" /></ElSelect></ElFormItem
        ><ElFormItem label="說明"
          ><ElInput
            v-model="scopeForm.description"
            type="textarea"
            :rows="3" /></ElFormItem></ElForm
      ><template #footer
        ><ElButton @click="scopeDialog = false">取消</ElButton
        ><ElButton type="primary" @click="saveScope">儲存範圍</ElButton></template
      ></ElDialog
    >
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import AppPageHeader from '@/components/business/game-provider/app-page-header/index.vue'
  import { useBusinessPartnerStore } from '@/store/modules/businessPartner'
  import { usePlatformAccessStore } from '@/store/modules/platformAccess'
  import type {
    PlatformAccountRecord,
    PlatformAccountStatus,
    PlatformDataScopeRecord,
    PlatformPermissionRecord,
    PlatformSensitiveGrantRecord
  } from '@/types/game-provider'

  defineOptions({ name: 'PlatformAccessManagement' })
  const route = useRoute()
  const store = usePlatformAccessStore()
  const partnerStore = useBusinessPartnerStore()
  const modes = {
    PlatformRolePermissions: 'roles',
    PlatformRoles: 'roles',
    PlatformPermissions: 'permissions',
    PlatformSensitivePermissions: 'sensitive',
    PlatformDataScopes: 'scopes'
  }
  const mode = computed(() => modes[String(route.name) as keyof typeof modes] || 'accounts')
  const copies = {
    accounts: {
      title: '人員管理',
      description: '管理後台人員帳號、角色指派、MFA 與帳號安全狀態。',
      rule: '帳號停用、解鎖與密碼重設立即生效；所有操作均保留稽核紀錄。'
    },
    roles: {
      title: '角色權限管理',
      description: '建立角色並依功能分組，自由配置各項操作權限、高風險權限與資料範圍。',
      rule: '角色權限異動會同步套用到所屬人員；高風險權限應遵循最小授權原則。'
    },
    permissions: {
      title: '操作權限',
      description: '依角色配置各模組的查看、新增、編輯、匯出與執行權限。',
      rule: '本頁只處理一般操作權限；高風險敏感操作必須透過敏感權限審核。'
    },
    sensitive: {
      title: '敏感權限',
      description: '管理高風險資料與操作權限的申請、審核、期限及撤銷。',
      rule: '申請人與審核人必須分離；到期權限應自動失效，且所有使用行為需留下紀錄。'
    },
    scopes: {
      title: '資料範圍',
      description: '限制角色只能查看全平台、所屬部門、指定代理或指定商戶資料。',
      rule: '操作權限決定「能做什麼」，資料範圍決定「能對哪些資料做」，兩者必須同時成立。'
    }
  }
  const copy = computed(() => copies[mode.value as keyof typeof copies])
  const filters = reactive({ keyword: '', department: '', status: '' })
  const departments = ['平台管理部', '營運部', '財務部', '風控部', '客服部', '稽核部']
  const activeAccounts = computed(
    () => store.accounts.filter((item) => item.status === 'Active').length
  )
  const lockedAccounts = computed(
    () => store.accounts.filter((item) => item.status === 'Locked').length
  )
  const pendingAccounts = computed(
    () => store.accounts.filter((item) => item.status === 'Pending').length
  )
  const sensitivePermissions = computed(() => store.permissions.filter((item) => item.sensitive))
  const activeRoles = computed(() => store.roles.filter((item) => item.status === 'Active'))
  const activeScopes = computed(() => store.dataScopes.filter((item) => item.status === 'Active'))
  const accountRows = computed(() =>
    store.accounts.filter(
      (item) =>
        (!filters.keyword ||
          `${item.username}${item.displayName}${item.email}`
            .toLowerCase()
            .includes(filters.keyword.toLowerCase())) &&
        (!filters.department || item.department === filters.department) &&
        (!filters.status || item.status === filters.status)
    )
  )
  const normalPermissions = computed(() => store.permissions.filter((item) => !item.sensitive))
  const permissionGroups = computed(() =>
    Array.from(new Set(normalPermissions.value.map((item) => item.module))).map((module) => ({
      module: normalPermissions.value.find((item) => item.module === module)?.module
        ? moduleLabel(module)
        : module,
      items: normalPermissions.value.filter((item) => item.module === module)
    }))
  )
  const rolePermissionGroups = computed(() =>
    Array.from(new Set(store.permissions.map((item) => item.module))).map((module) => ({
      module: moduleLabel(module),
      items: store.permissions.filter((item) => item.module === module)
    }))
  )
  const selectedRoleId = ref('ROLE-002')
  const selectedPermissionIds = ref<string[]>([])
  const loadRolePermissions = () => {
    selectedPermissionIds.value = [
      ...(store.roles
        .find((item) => item.id === selectedRoleId.value)
        ?.permissionIds.filter(
          (id) => !store.permissions.find((permission) => permission.id === id)?.sensitive
        ) || [])
    ]
  }
  const togglePermission = (id: string, checked: string | number | boolean) => {
    selectedPermissionIds.value = checked
      ? Array.from(new Set([...selectedPermissionIds.value, id]))
      : selectedPermissionIds.value.filter((item) => item !== id)
  }
  loadRolePermissions()
  const accountDialog = ref(false)
  const accountForm = reactive({
    id: '',
    username: '',
    displayName: '',
    email: '',
    department: '',
    roleIds: [] as string[],
    mfaEnabled: false,
    status: 'Pending' as PlatformAccountStatus
  })
  const roleDialog = ref(false)
  const roleForm = reactive({
    name: '',
    code: '',
    description: '',
    dataScopeId: '',
    permissionIds: [] as string[]
  })
  const editingRoleId = ref('')
  const editingRole = computed(() => store.roles.find((item) => item.id === editingRoleId.value))
  const scopeDialog = ref(false)
  const scopeForm = reactive({
    id: '',
    name: '',
    type: 'Self' as PlatformDataScopeRecord['type'],
    agentIds: [] as string[],
    merchantIds: [] as string[],
    description: ''
  })
  const setSummaryFilter = (status: string) => {
    if (mode.value === 'accounts') filters.status = status
  }
  const resetFilters = () => {
    filters.keyword = ''
    filters.department = ''
    filters.status = ''
  }
  const accountStatusLabel = (status: PlatformAccountStatus) =>
    ({ Active: '啟用', Locked: '鎖定', Inactive: '停用', Pending: '待啟用' })[status]
  const accountStatusType = (status: PlatformAccountStatus) =>
    status === 'Active'
      ? 'success'
      : status === 'Locked'
        ? 'danger'
        : status === 'Pending'
          ? 'warning'
          : 'info'
  const grantStatusLabel = (status: PlatformSensitiveGrantRecord['status']) =>
    ({ 'Pending Review': '待審核', Approved: '已核准', Rejected: '已駁回', Revoked: '已撤銷' })[
      status
    ]
  const grantStatusType = (status: PlatformSensitiveGrantRecord['status']) =>
    status === 'Approved'
      ? 'success'
      : status === 'Pending Review'
        ? 'warning'
        : status === 'Rejected'
          ? 'danger'
          : 'info'
  const riskLabel = (risk: PlatformPermissionRecord['riskLevel']) =>
    ({ Normal: '一般', Medium: '中度', High: '高風險' })[risk]
  const riskType = (risk: PlatformPermissionRecord['riskLevel']) =>
    risk === 'High' ? 'danger' : risk === 'Medium' ? 'warning' : 'info'
  const moduleLabel = (module: string) =>
    ({
      dashboard: '儀錶板',
      games: '遊戲中心',
      partners: '商務中心',
      members: '會員中心',
      transactions: '交易中心',
      jackpots: '獎池管理',
      risk: '風控中心',
      approvals: '審核中心',
      finance: '對帳／結算',
      reports: '報表中心',
      'exchange-rates': '匯率管理',
      platform: '平台管理'
    })[module] || module
  const scopeTypeLabel = (type: PlatformDataScopeRecord['type']) =>
    ({
      All: '全平台資料',
      Department: '所屬部門',
      'Assigned Agents': '指定代理',
      'Assigned Merchants': '指定商戶',
      Self: '僅本人資料'
    })[type]
  const scopeName = (id: string) => store.dataScopes.find((item) => item.id === id)?.name || id
  const roleName = (id: string) => store.roles.find((item) => item.id === id)?.name || id
  const permissionName = (id: string) =>
    store.permissions.find((item) => item.id === id)?.name || id
  const permissionDescription = (id: string) =>
    store.permissions.find((item) => item.id === id)?.description || ''
  const openAccount = (item?: PlatformAccountRecord) => {
    Object.assign(
      accountForm,
      item
        ? {
            id: item.id,
            username: item.username,
            displayName: item.displayName,
            email: item.email,
            department: item.department,
            roleIds: [...item.roleIds],
            mfaEnabled: item.mfaEnabled,
            status: item.status
          }
        : {
            id: '',
            username: '',
            displayName: '',
            email: '',
            department: '營運部',
            roleIds: ['ROLE-002'],
            mfaEnabled: true,
            status: 'Pending'
          }
    )
    accountDialog.value = true
  }
  const saveAccount = () => {
    if (
      !accountForm.username ||
      !accountForm.displayName ||
      !accountForm.email ||
      !accountForm.department ||
      !accountForm.roleIds.length
    )
      return ElMessage.warning('請完整填寫帳號資料')
    if (
      !accountForm.id &&
      store.accounts.some((item) => item.username === accountForm.username.trim())
    )
      return ElMessage.warning('登入帳號已存在')
    const hasSensitiveRole = accountForm.roleIds.some(
      (id) => (store.roles.find((item) => item.id === id)?.sensitivePermissionIds.length || 0) > 0
    )
    if (hasSensitiveRole && !accountForm.mfaEnabled)
      return ElMessage.warning('具有敏感權限的角色必須啟用多因素驗證')
    store.saveAccount({ ...accountForm, roleIds: [...accountForm.roleIds] })
    accountDialog.value = false
    ElMessage.success('後台帳號已儲存')
  }
  const unlock = (id: string) => {
    store.setAccountStatus(id, 'Active')
    ElMessage.success('帳號已解鎖')
  }
  const disable = async (id: string) => {
    await ElMessageBox.confirm('停用後此帳號會立即無法登入，確定繼續？', '停用後台帳號', {
      type: 'warning'
    })
    store.setAccountStatus(id, 'Inactive')
    ElMessage.success('帳號已停用')
  }
  const resetPassword = async (id: string) => {
    await ElMessageBox.confirm('將使既有密碼失效，使用者下次登入必須重新設定。', '重設密碼', {
      type: 'warning'
    })
    store.resetPassword(id)
    ElMessage.success('重設通知已建立')
  }
  const selectedSensitiveCount = computed(
    () =>
      roleForm.permissionIds.filter(
        (id) => store.permissions.find((permission) => permission.id === id)?.sensitive
      ).length
  )
  const toggleAllRolePermissions = () => {
    roleForm.permissionIds =
      roleForm.permissionIds.length === store.permissions.length
        ? []
        : store.permissions.map((item) => item.id)
  }
  const openRole = (id?: string) => {
    const item = id ? store.roles.find((row) => row.id === id) : undefined
    editingRoleId.value = item?.id || ''
    roleForm.name = item?.name || ''
    roleForm.code = item?.code || ''
    roleForm.description = item?.description || ''
    roleForm.dataScopeId = item?.dataScopeId || activeScopes.value[0]?.id || ''
    roleForm.permissionIds = [...(item?.permissionIds || [])]
    roleDialog.value = true
  }
  const saveRole = () => {
    if (!roleForm.name.trim() || !roleForm.code.trim() || !roleForm.dataScopeId)
      return ElMessage.warning('請完整填寫角色名稱、代碼與資料範圍')
    if (
      !editingRole.value &&
      store.roles.some((item) => item.code.toLowerCase() === roleForm.code.trim().toLowerCase())
    )
      return ElMessage.warning('角色代碼已存在')
    const sensitivePermissionIds = roleForm.permissionIds.filter(
      (id) => store.permissions.find((permission) => permission.id === id)?.sensitive
    )
    const payload = {
      name: roleForm.name.trim(),
      code: roleForm.code.trim().toUpperCase(),
      description: roleForm.description,
      dataScopeId: roleForm.dataScopeId,
      permissionIds: [...roleForm.permissionIds],
      sensitivePermissionIds
    }
    if (editingRole.value) store.saveRole(editingRole.value.id, payload)
    else store.createRole(payload)
    roleDialog.value = false
    ElMessage.success('角色與權限已儲存')
  }
  const savePermissions = () => {
    const role = store.roles.find((item) => item.id === selectedRoleId.value)
    if (!role) return
    const sensitiveIds = role.permissionIds.filter(
      (id) => store.permissions.find((permission) => permission.id === id)?.sensitive
    )
    store.saveRole(role.id, { permissionIds: [...selectedPermissionIds.value, ...sensitiveIds] })
    ElMessage.success('操作權限已更新')
  }
  const reviewGrant = async (id: string, approved: boolean) => {
    await ElMessageBox.confirm(
      approved ? '核准後此敏感權限將加入角色，確定繼續？' : '確定駁回此敏感權限申請？',
      approved ? '核准敏感權限' : '駁回敏感權限',
      { type: approved ? 'warning' : 'error' }
    )
    store.reviewSensitiveGrant(id, approved)
    ElMessage.success(approved ? '敏感權限已核准' : '申請已駁回')
  }
  const openScope = (id: string) => {
    const item = store.dataScopes.find((row) => row.id === id)
    if (!item) return
    Object.assign(scopeForm, {
      id: item.id,
      name: item.name,
      type: item.type,
      agentIds: [...item.agentIds],
      merchantIds: [...item.merchantIds],
      description: item.description
    })
    scopeDialog.value = true
  }
  const saveScope = () => {
    store.saveDataScope(scopeForm.id, {
      name: scopeForm.name,
      type: scopeForm.type,
      agentIds: [...scopeForm.agentIds],
      merchantIds: [...scopeForm.merchantIds],
      description: scopeForm.description
    })
    scopeDialog.value = false
    ElMessage.success('資料範圍已更新')
  }
</script>

<style scoped lang="scss">
  .page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    button,
    > div {
      padding: 18px 20px;
      text-align: left;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    button {
      cursor: pointer;
      transition: border-color 0.2s;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    span,
    small {
      display: block;
      color: var(--art-gray-600);
    }

    strong {
      display: block;
      margin: 8px 0 4px;
      font-size: 26px;
    }
  }

  .danger {
    color: var(--el-color-danger);
  }

  .warning {
    color: var(--el-color-warning);
  }

  .filter-card :deep(.el-card__body) {
    padding-bottom: 2px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    color: var(--art-gray-600);

    > div {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    strong {
      font-size: 16px;
      color: var(--art-text-gray-900);
    }
  }

  small {
    color: var(--art-gray-600);
  }

  .link {
    padding: 0;
    color: var(--el-color-primary);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .account-name {
    display: flex;
    gap: 10px;
    align-items: center;

    span,
    small {
      display: block;
    }
  }

  .permission-layout :deep(.el-card__body),
  .permission-actions,
  .role-selector {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .permission-layout :deep(.el-card__body) {
    justify-content: space-between;
  }

  .role-selector > span {
    font-weight: 600;
  }

  .role-selector small {
    margin-left: 4px;
  }

  .permission-actions {
    justify-content: flex-end;
  }

  .group-title {
    display: flex;
    justify-content: space-between;
  }

  .group-title span {
    color: var(--art-gray-600);
  }

  .permission-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 28px;

    label {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      min-height: 68px;
      border-bottom: 1px solid var(--art-border-color);
    }

    :deep(.el-checkbox) {
      flex: 1;
      height: auto;
      white-space: normal;
    }

    :deep(.el-checkbox__label) {
      flex: 1;
    }
  }

  .permission-label {
    display: block;

    strong,
    small {
      display: block;
    }

    small {
      margin-top: 4px;
      line-height: 1.45;
    }
  }

  .permission-editor-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 18px 0 12px;

    strong,
    span {
      display: block;
    }

    span {
      margin-top: 4px;
      color: var(--art-gray-600);
    }
  }

  .role-permission-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 14px;
  }

  .role-permission-group {
    padding: 14px;
    border: 1px solid var(--art-border-color);
    border-radius: 8px;

    > label {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      min-height: 64px;
      border-bottom: 1px solid var(--art-border-color);

      &:last-child {
        border-bottom: 0;
      }
    }

    :deep(.el-checkbox) {
      flex: 1;
      height: auto;
      white-space: normal;
    }

    :deep(.el-checkbox__label) {
      flex: 1;
    }
  }

  .dialog-form {
    margin-top: 18px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .full {
    width: 100%;
  }

  .inline-hint {
    margin-left: 10px;
  }

  @media (width <= 1000px) {
    .summary-grid,
    .permission-list,
    .role-permission-groups {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .permission-layout :deep(.el-card__body) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  @media (width <= 620px) {
    .summary-grid,
    .permission-list,
    .role-permission-groups,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .toolbar,
    .role-selector,
    .permission-actions {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
