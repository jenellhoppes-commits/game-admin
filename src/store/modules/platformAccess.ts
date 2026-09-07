import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  PlatformAccessLog,
  PlatformAccountRecord,
  PlatformDataScopeRecord,
  PlatformPermissionRecord,
  PlatformRoleRecord,
  PlatformSensitiveGrantRecord
} from '@/types/game-provider'

const formatNow = () => new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)

const permissionSeeds: Array<
  [
    string,
    string,
    string,
    PlatformPermissionRecord['action'],
    boolean,
    PlatformPermissionRecord['riskLevel'],
    string
  ]
> = [
  ['dashboard', '儀錶板', '查看儀錶板', 'View', false, 'Normal', '查看平台營運摘要與待處理事項'],
  ['games', '遊戲中心', '查看遊戲', 'View', false, 'Normal', '查看遊戲主檔與設定'],
  ['games', '遊戲中心', '編輯遊戲設定', 'Edit', false, 'Medium', '異動遊戲主檔、RTP 與限紅方案'],
  ['games', '遊戲中心', '發布遊戲版本', 'Execute', true, 'High', '發布新版本至商戶可用環境'],
  ['partners', '商務中心', '查看代理與商戶', 'View', false, 'Normal', '查看商務關係與線路'],
  ['partners', '商務中心', '編輯商務條件', 'Edit', true, 'High', '異動分潤、結算與費率條件'],
  ['members', '會員中心', '查看會員', 'View', false, 'Medium', '查看會員基本資料與遊戲紀錄'],
  ['members', '會員中心', '查看會員敏感資料', 'View', true, 'High', '查看完整識別資料與聯絡資訊'],
  ['transactions', '交易中心', '查看注單與交易', 'View', false, 'Normal', '查詢注單、交易與重播'],
  ['transactions', '交易中心', '匯出交易資料', 'Export', true, 'High', '匯出注單與交易明細'],
  ['jackpots', '獎池管理', '管理獎池', 'Edit', false, 'Medium', '建立與編輯獎池設定'],
  ['jackpots', '獎池管理', '執行獎池調整', 'Execute', true, 'High', '異動獎池水位與派發設定'],
  ['risk', '風控中心', '查看風控案件', 'View', false, 'Medium', '查看告警、規則與案件'],
  ['risk', '風控中心', '處理風控案件', 'Execute', true, 'High', '結案、解除或套用風控處置'],
  ['approvals', '審核中心', '執行審核', 'Approve', true, 'High', '核准或駁回敏感業務異動'],
  ['finance', '對帳／結算', '查看財務資料', 'View', false, 'Medium', '查看對帳、結算與差異'],
  [
    'finance',
    '對帳／結算',
    '確認對帳',
    'Approve',
    true,
    'High',
    '確認代理與商戶對帳結果及尾差調整'
  ],
  ['reports', '報表中心', '查看報表', 'View', false, 'Normal', '查看各類營運與財務報表'],
  ['reports', '報表中心', '匯出報表', 'Export', true, 'Medium', '匯出完整營運或財務報表'],
  [
    'exchange-rates',
    '匯率管理',
    '管理幣別與匯率設定',
    'Edit',
    true,
    'High',
    '新增幣別配對、發布每日適用匯率及查看歷史快照'
  ],
  ['platform', '平台管理', '管理後台帳號', 'Edit', true, 'High', '新增、停用、解鎖與重設後台帳號'],
  [
    'platform',
    '平台管理',
    '管理角色與權限',
    'Edit',
    true,
    'High',
    '異動角色權限、敏感權限與資料範圍'
  ],
  [
    'platform',
    '平台管理',
    '查看系統紀錄',
    'View',
    false,
    'Medium',
    '查看操作、登入、審核與錯誤紀錄'
  ],
  [
    'finance',
    '對帳／結算',
    '建立結算申請',
    'Create',
    true,
    'High',
    '依已確認對帳結果建立待審結算申請'
  ],
  ['finance', '對帳／結算', '審核結算申請', 'Approve', true, 'High', '核准或駁回待審結算申請'],
  [
    'finance',
    '對帳／結算',
    '產生並鎖定結算單',
    'Execute',
    true,
    'High',
    '依已核准內容產生並鎖定結算單'
  ]
]

export const usePlatformAccessStore = defineStore('platformAccessStore', () => {
  const permissions = ref<PlatformPermissionRecord[]>(
    permissionSeeds.map((item, index) => ({
      id: `PERM-${String(index + 1).padStart(3, '0')}`,
      module: item[0],
      name: item[2],
      code: `${item[0]}.${item[3].toLowerCase()}.${String(index + 1).padStart(2, '0')}`,
      action: item[3],
      sensitive: item[4],
      riskLevel: item[5],
      description: item[6]
    }))
  )

  const dataScopes = ref<PlatformDataScopeRecord[]>([
    {
      id: 'SCOPE-ALL',
      name: '全平台資料',
      type: 'All',
      agentIds: [],
      merchantIds: [],
      description: '可查看與操作平台全部資料',
      roleCount: 2,
      status: 'Active',
      updatedAt: '2026-09-03 14:20'
    },
    {
      id: 'SCOPE-FINANCE',
      name: '財務部門資料',
      type: 'Department',
      agentIds: [],
      merchantIds: [],
      description: '依所屬財務部門與授權業務範圍查看',
      roleCount: 2,
      status: 'Active',
      updatedAt: '2026-09-02 11:30'
    },
    {
      id: 'SCOPE-CS',
      name: '客服指定商戶',
      type: 'Assigned Merchants',
      agentIds: [],
      merchantIds: ['M00001', 'M00003', 'M00006'],
      description: '僅查看指定商戶及其會員、注單與交易',
      roleCount: 1,
      status: 'Active',
      updatedAt: '2026-09-01 16:40'
    },
    {
      id: 'SCOPE-RISK',
      name: '風控指定代理',
      type: 'Assigned Agents',
      agentIds: ['A00001', 'A00002'],
      merchantIds: [],
      description: '查看指定代理及旗下商戶的風控資料',
      roleCount: 1,
      status: 'Active',
      updatedAt: '2026-09-01 10:15'
    },
    {
      id: 'SCOPE-SELF',
      name: '僅本人建立資料',
      type: 'Self',
      agentIds: [],
      merchantIds: [],
      description: '只查看或操作由本人建立的資料',
      roleCount: 0,
      status: 'Active',
      updatedAt: '2026-08-28 09:00'
    }
  ])

  const normalIds = computed(() =>
    permissions.value.filter((item) => !item.sensitive).map((item) => item.id)
  )
  const viewIds = computed(() =>
    permissions.value.filter((item) => item.action === 'View').map((item) => item.id)
  )
  const financeIds = computed(() =>
    permissions.value
      .filter((item) => ['dashboard', 'finance', 'reports', 'exchange-rates'].includes(item.module))
      .map((item) => item.id)
  )
  const roles = ref<PlatformRoleRecord[]>([
    {
      id: 'ROLE-001',
      code: 'R_SUPER',
      name: '超級管理員',
      description: '平台最高權限，僅限核心管理人員',
      accountCount: 2,
      permissionIds: permissions.value.map((item) => item.id),
      sensitivePermissionIds: permissions.value
        .filter((item) => item.sensitive)
        .map((item) => item.id),
      dataScopeId: 'SCOPE-ALL',
      builtIn: true,
      status: 'Active',
      updatedAt: '2026-09-03 14:20'
    },
    {
      id: 'ROLE-002',
      code: 'R_ADMIN',
      name: '營運管理員',
      description: '遊戲、商務、會員與交易日常營運',
      accountCount: 3,
      permissionIds: [...normalIds.value, 'PERM-003', 'PERM-011'],
      sensitivePermissionIds: [],
      dataScopeId: 'SCOPE-ALL',
      builtIn: true,
      status: 'Active',
      updatedAt: '2026-09-02 17:40'
    },
    {
      id: 'ROLE-003',
      code: 'R_FINANCE',
      name: '財務人員',
      description: '對帳、結算、匯率與財務報表作業',
      accountCount: 3,
      permissionIds: financeIds.value,
      sensitivePermissionIds: [
        'PERM-017',
        'PERM-019',
        'PERM-020',
        'PERM-024',
        'PERM-025',
        'PERM-026'
      ],
      dataScopeId: 'SCOPE-FINANCE',
      builtIn: false,
      status: 'Active',
      updatedAt: '2026-09-02 11:30'
    },
    {
      id: 'ROLE-004',
      code: 'R_RISK',
      name: '風控人員',
      description: '告警、規則、案件與異常交易處理',
      accountCount: 2,
      permissionIds: [...viewIds.value, 'PERM-014'],
      sensitivePermissionIds: ['PERM-014'],
      dataScopeId: 'SCOPE-RISK',
      builtIn: false,
      status: 'Active',
      updatedAt: '2026-09-01 10:15'
    },
    {
      id: 'ROLE-005',
      code: 'R_CS',
      name: '客服人員',
      description: '會員、注單、交易查詢與結果重播',
      accountCount: 2,
      permissionIds: viewIds.value.filter((id) => !['PERM-016', 'PERM-023'].includes(id)),
      sensitivePermissionIds: [],
      dataScopeId: 'SCOPE-CS',
      builtIn: false,
      status: 'Active',
      updatedAt: '2026-08-30 15:00'
    },
    {
      id: 'ROLE-006',
      code: 'R_AUDITOR',
      name: '稽核人員',
      description: '唯讀查看財務、審核及系統操作紀錄',
      accountCount: 1,
      permissionIds: viewIds.value,
      sensitivePermissionIds: [],
      dataScopeId: 'SCOPE-ALL',
      builtIn: false,
      status: 'Active',
      updatedAt: '2026-08-29 13:25'
    }
  ])

  const departments = ['平台管理部', '營運部', '財務部', '風控部', '客服部', '稽核部']
  const accountNames = [
    'Super Admin',
    'Platform Owner',
    'Operations One',
    'Operations Two',
    'Game Ops',
    'Finance Amy',
    'Finance Brian',
    'Settlement Ops',
    'Risk Leo',
    'Risk Nina',
    'CS Taiwan',
    'CS SEA',
    'Auditor'
  ]
  const roleSequence = [
    'ROLE-001',
    'ROLE-001',
    'ROLE-002',
    'ROLE-002',
    'ROLE-002',
    'ROLE-003',
    'ROLE-003',
    'ROLE-003',
    'ROLE-004',
    'ROLE-004',
    'ROLE-005',
    'ROLE-005',
    'ROLE-006'
  ]
  const departmentSequence = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5]
  const accounts = ref<PlatformAccountRecord[]>(
    accountNames.map((displayName, index) => ({
      id: `ADM-${String(index + 1).padStart(5, '0')}`,
      username: displayName.toLowerCase().replaceAll(' ', '.'),
      displayName,
      email: `${displayName.toLowerCase().replaceAll(' ', '.')}@gameprovider.local`,
      department: departments[departmentSequence[index]],
      roleIds: [roleSequence[index]],
      status: index === 11 ? 'Locked' : index === 12 ? 'Pending' : 'Active',
      mfaEnabled: index < 10,
      lastLoginAt:
        index < 11
          ? `2026-09-0${4 - (index % 3)} ${String(9 + index).padStart(2, '0')}:20`
          : undefined,
      lastLoginIp: index < 11 ? `10.20.${departmentSequence[index]}.${20 + index}` : undefined,
      passwordChangedAt: `2026-08-${String(12 + index).padStart(2, '0')} 10:00`,
      failedLoginCount: index === 11 ? 5 : 0,
      createdAt: `2026-07-${String(index + 1).padStart(2, '0')} 09:00`,
      updatedAt: '2026-09-03 14:20'
    }))
  )

  const sensitiveGrants = ref<PlatformSensitiveGrantRecord[]>([
    {
      id: 'SG-0001',
      roleId: 'ROLE-003',
      permissionId: 'PERM-017',
      reason: '財務主管執行月結所需',
      status: 'Approved',
      requestedBy: 'Finance Manager',
      requestedAt: '2026-08-01 10:00',
      reviewedBy: 'Super Admin',
      reviewedAt: '2026-08-01 14:20'
    },
    {
      id: 'SG-0002',
      roleId: 'ROLE-004',
      permissionId: 'PERM-014',
      reason: '風控案件處置所需',
      status: 'Approved',
      requestedBy: 'Risk Lead',
      requestedAt: '2026-08-15 11:10',
      reviewedBy: 'Super Admin',
      reviewedAt: '2026-08-15 15:40'
    },
    {
      id: 'SG-0003',
      roleId: 'ROLE-002',
      permissionId: 'PERM-004',
      reason: '代理營運主管代班發布版本',
      status: 'Pending Review',
      requestedBy: 'Operations One',
      requestedAt: '2026-09-04 09:30',
      expiresAt: '2026-09-30 23:59'
    },
    {
      id: 'SG-0004',
      roleId: 'ROLE-005',
      permissionId: 'PERM-008',
      reason: '處理會員身份爭議案件',
      status: 'Pending Review',
      requestedBy: 'CS Taiwan',
      requestedAt: '2026-09-04 10:10',
      expiresAt: '2026-09-11 23:59'
    }
  ])

  const logs = ref<PlatformAccessLog[]>([
    {
      id: 'ACL-0008',
      entityType: 'Exchange Rate',
      entityId: 'FX-TWD-20260904',
      module: '匯率管理',
      action: '更新今日適用匯率',
      beforeValue: '31.82',
      afterValue: '31.86',
      operator: 'Finance Brian',
      ipAddress: '10.20.2.26',
      riskLevel: 'High',
      createdAt: '2026-09-04 14:10',
      note: '依平台調整規則加成 0.04'
    },
    {
      id: 'ACL-0007',
      entityType: 'Merchant',
      entityId: 'M00006',
      module: '商務中心',
      action: '啟用商戶',
      beforeValue: '待審核',
      afterValue: '啟用',
      operator: 'Operations One',
      ipAddress: '10.20.1.22',
      riskLevel: 'Medium',
      createdAt: '2026-09-04 11:42',
      note: '商戶資料與合約條件已完成審核'
    },
    {
      id: 'ACL-0006',
      entityType: 'Game',
      entityId: 'PG-SLOT-001',
      module: '遊戲中心',
      action: '調整遊戲狀態',
      beforeValue: '維護中',
      afterValue: '上線',
      operator: 'Game Ops',
      ipAddress: '10.20.1.24',
      riskLevel: 'Medium',
      createdAt: '2026-09-04 10:25',
      note: '供應商維護完成並通過驗證'
    },
    {
      id: 'ACL-0005',
      entityType: 'Report',
      entityId: 'RPT-AGENT-0904',
      module: '報表中心',
      action: '匯出代理報表',
      beforeValue: '—',
      afterValue: 'CSV',
      operator: 'Operations Two',
      ipAddress: '10.20.1.23',
      riskLevel: 'Normal',
      createdAt: '2026-09-04 09:50',
      note: '資料期間 2026-09-01 至 2026-09-04'
    },
    {
      id: 'ACL-0004',
      entityType: 'Account',
      entityId: 'ADM-00012',
      module: '帳號與權限',
      action: '帳號自動鎖定',
      beforeValue: '啟用',
      afterValue: '鎖定',
      operator: '系統',
      riskLevel: 'High',
      createdAt: '2026-09-04 08:55',
      note: '連續登入失敗 5 次'
    },
    {
      id: 'ACL-0003',
      entityType: 'Sensitive Grant',
      entityId: 'SG-0004',
      module: '帳號與權限',
      action: '申請敏感權限',
      beforeValue: '無',
      afterValue: '待審核',
      operator: 'CS Taiwan',
      ipAddress: '10.20.4.31',
      riskLevel: 'High',
      createdAt: '2026-09-04 10:10',
      note: '暫時查看會員敏感資料'
    },
    {
      id: 'ACL-0002',
      entityType: 'Role',
      entityId: 'ROLE-003',
      module: '帳號與權限',
      action: '更新角色權限',
      beforeValue: '8 項',
      afterValue: '9 項',
      operator: 'Super Admin',
      ipAddress: '10.20.0.20',
      riskLevel: 'High',
      createdAt: '2026-09-03 14:20',
      note: '新增匯率管理權限'
    },
    {
      id: 'ACL-0001',
      entityType: 'Data Scope',
      entityId: 'SCOPE-CS',
      module: '帳號與權限',
      action: '更新資料範圍',
      beforeValue: '2 個商戶',
      afterValue: '3 個商戶',
      operator: 'Super Admin',
      ipAddress: '10.20.0.20',
      riskLevel: 'Medium',
      createdAt: '2026-09-01 16:40',
      note: '新增 M00006'
    }
  ])

  const addLog = (
    entityType: PlatformAccessLog['entityType'],
    entityId: string,
    action: string,
    beforeValue: string,
    afterValue: string,
    note: string
  ) =>
    logs.value.unshift({
      id: `ACL-${String(logs.value.length + 1).padStart(4, '0')}`,
      entityType,
      entityId,
      module: '帳號與權限',
      action,
      beforeValue,
      afterValue,
      operator: 'Super Admin',
      ipAddress: '10.20.0.20',
      riskLevel: entityType === 'Account' ? 'Medium' : 'High',
      createdAt: formatNow(),
      note
    })
  const getRoleNames = (roleIds: string[]) =>
    roleIds.map((id) => roles.value.find((item) => item.id === id)?.name || id)

  const saveAccount = (
    payload: Partial<PlatformAccountRecord> &
      Pick<PlatformAccountRecord, 'username' | 'displayName' | 'email' | 'department' | 'roleIds'>
  ) => {
    if (payload.id) {
      const item = accounts.value.find((row) => row.id === payload.id)
      if (!item) return false
      const before = `${getRoleNames(item.roleIds).join('、')} / ${item.status}`
      Object.assign(item, payload, { updatedAt: formatNow() })
      addLog(
        'Account',
        item.id,
        '更新後台帳號',
        before,
        `${getRoleNames(item.roleIds).join('、')} / ${item.status}`,
        '帳號資料已更新'
      )
      return item.id
    }
    if (accounts.value.some((item) => item.username === payload.username)) return false
    const id = `ADM-${String(accounts.value.length + 1).padStart(5, '0')}`
    accounts.value.unshift({
      id,
      username: payload.username,
      displayName: payload.displayName,
      email: payload.email,
      department: payload.department,
      roleIds: payload.roleIds,
      status: payload.status || 'Pending',
      mfaEnabled: payload.mfaEnabled || false,
      passwordChangedAt: '尚未設定',
      failedLoginCount: 0,
      createdAt: formatNow(),
      updatedAt: formatNow()
    })
    addLog('Account', id, '新增後台帳號', '無', '待啟用', '已寄送首次登入通知')
    return id
  }

  const setAccountStatus = (id: string, status: PlatformAccountRecord['status']) => {
    const item = accounts.value.find((row) => row.id === id)
    if (!item) return false
    const before = item.status
    item.status = status
    if (status === 'Active') item.failedLoginCount = 0
    item.updatedAt = formatNow()
    addLog(
      'Account',
      id,
      status === 'Active' && before === 'Locked' ? '解鎖帳號' : '變更帳號狀態',
      before,
      status,
      '狀態已立即生效'
    )
    return true
  }

  const resetPassword = (id: string) => {
    const item = accounts.value.find((row) => row.id === id)
    if (!item) return false
    item.passwordChangedAt = '等待使用者重設'
    item.updatedAt = formatNow()
    addLog('Account', id, '重設密碼', '既有密碼', '強制重設', '下次登入必須設定新密碼')
    return true
  }

  const saveRole = (id: string, changes: Partial<PlatformRoleRecord>) => {
    const item = roles.value.find((row) => row.id === id)
    if (!item) return false
    const before = `${item.permissionIds.length} 項權限 / ${item.dataScopeId}`
    Object.assign(item, changes, { updatedAt: formatNow() })
    addLog(
      'Role',
      id,
      '更新角色設定',
      before,
      `${item.permissionIds.length} 項權限 / ${item.dataScopeId}`,
      '角色設定已同步至所屬帳號'
    )
    return true
  }

  const createRole = (
    payload: Pick<
      PlatformRoleRecord,
      'name' | 'code' | 'description' | 'permissionIds' | 'sensitivePermissionIds' | 'dataScopeId'
    >
  ) => {
    const id = `ROLE-${String(roles.value.length + 1).padStart(3, '0')}`
    roles.value.unshift({
      ...payload,
      id,
      accountCount: 0,
      builtIn: false,
      status: 'Active',
      updatedAt: formatNow()
    })
    addLog(
      'Role',
      id,
      '新增角色',
      '無',
      `${payload.permissionIds.length} 項權限 / ${payload.dataScopeId}`,
      '角色已建立，可指派給人員帳號'
    )
    return id
  }

  const reviewSensitiveGrant = (id: string, approved: boolean) => {
    const item = sensitiveGrants.value.find((row) => row.id === id)
    if (!item || item.status !== 'Pending Review') return false
    item.status = approved ? 'Approved' : 'Rejected'
    item.reviewedBy = 'Super Admin'
    item.reviewedAt = formatNow()
    if (approved) {
      const role = roles.value.find((row) => row.id === item.roleId)
      if (role && !role.sensitivePermissionIds.includes(item.permissionId))
        role.sensitivePermissionIds.push(item.permissionId)
    }
    addLog(
      'Sensitive Grant',
      id,
      approved ? '核准敏感權限' : '駁回敏感權限',
      '待審核',
      item.status,
      item.reason
    )
    return true
  }

  const saveDataScope = (id: string, changes: Partial<PlatformDataScopeRecord>) => {
    const item = dataScopes.value.find((row) => row.id === id)
    if (!item) return false
    const before = `${item.type} / 代理 ${item.agentIds.length} / 商戶 ${item.merchantIds.length}`
    Object.assign(item, changes, { updatedAt: formatNow() })
    addLog(
      'Data Scope',
      id,
      '更新資料範圍',
      before,
      `${item.type} / 代理 ${item.agentIds.length} / 商戶 ${item.merchantIds.length}`,
      '資料範圍已更新'
    )
    return true
  }

  return {
    accounts,
    roles,
    permissions,
    sensitiveGrants,
    dataScopes,
    logs,
    getRoleNames,
    saveAccount,
    createRole,
    setAccountStatus,
    resetPassword,
    saveRole,
    reviewSensitiveGrant,
    saveDataScope
  }
})
