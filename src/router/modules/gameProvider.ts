import type { AppRouteRecord } from '@/types/router'

const roles = ['R_SUPER', 'R_ADMIN']
const reportView = '/game-provider/reports/index'

const page = (
  path: string,
  name: string,
  title: string,
  icon: string,
  moduleKey: string,
  component = '/game-provider/shared/list-page',
  isHide = false,
  activePath?: string
): AppRouteRecord => ({
  path,
  name,
  component,
  meta: { title, icon, keepAlive: false, moduleKey, isHide, activePath }
})

const directory = (
  path: string,
  name: string,
  title: string,
  icon: string,
  children: AppRouteRecord[]
): AppRouteRecord => ({
  path,
  name,
  component: '',
  meta: { title, icon, keepAlive: false },
  children
})

const hiddenDetail = (
  path: string,
  name: string,
  title: string,
  icon: string,
  moduleKey: string,
  activePath: string,
  component = '/game-provider/shared/detail-page'
): AppRouteRecord => page(path, name, title, icon, moduleKey, component, true, activePath)

export const gameProviderRoutes: AppRouteRecord[] = [
  {
    path: '/dashboard',
    name: 'GameProviderDashboard',
    component: '/game-provider/dashboard',
    meta: {
      title: '儀錶板',
      icon: 'ri:dashboard-3-line',
      menuGroup: '首頁',
      roles,
      fixedTab: true,
      keepAlive: false
    }
  },
  {
    path: '/games',
    name: 'GameCenter',
    component: '/index/index',
    redirect: '/games/management',
    meta: { title: '遊戲中心', icon: 'ri:gamepad-line', menuGroup: '營運管理', roles },
    children: [
      directory('taxonomy', 'GameTaxonomy', '分類與標籤', 'ri:price-tag-3-line', [
        page(
          'types',
          'GameTypes',
          '遊戲類型',
          'ri:apps-line',
          '/game-taxonomy-types',
          '/game-provider/games/taxonomy/index'
        ),
        page(
          'features',
          'GameFeatureTags',
          '功能標籤',
          'ri:price-tag-3-line',
          '/game-taxonomy-features',
          '/game-provider/games/taxonomy/index'
        ),
        page(
          'marketing',
          'GameMarketingTags',
          '行銷標籤',
          'ri:megaphone-line',
          '/game-taxonomy-marketing',
          '/game-provider/games/taxonomy/index'
        )
      ]),
      page(
        'management',
        'GamesList',
        '遊戲管理',
        'ri:gamepad-line',
        '/games',
        '/game-provider/games/index'
      ),
      page(
        'management/create',
        'GameCreate',
        '新增遊戲',
        'ri:add-circle-line',
        '/games',
        '/game-provider/games/create',
        true,
        '/games/management'
      ),
      hiddenDetail(
        'management/:id(G[0-9]+)',
        'GameDetail',
        '遊戲詳細',
        'ri:gamepad-line',
        '/games',
        '/games/management',
        '/game-provider/games/detail'
      )
    ]
  },
  {
    path: '/business',
    alias: '/partners',
    name: 'BusinessCenter',
    component: '/index/index',
    redirect: '/business/agents',
    meta: { title: '商務中心', icon: 'ri:team-line', menuGroup: '營運管理', roles },
    children: [
      page('agents', 'AgentsList', '代理管理', 'ri:node-tree', '/agents', '/game-provider/agents'),
      page(
        'agents/create',
        'AgentCreate',
        '新增代理',
        'ri:add-circle-line',
        '/agents',
        '/game-provider/agents/create',
        true,
        '/business/agents'
      ),
      hiddenDetail(
        'agents/:id(A[0-9]+)',
        'AgentDetail',
        '代理詳細',
        'ri:node-tree',
        '/agents',
        '/business/agents',
        '/game-provider/agents/detail'
      ),
      page(
        'merchants',
        'MerchantsList',
        '商戶管理',
        'ri:store-2-line',
        '/merchants',
        '/game-provider/merchants'
      ),
      page(
        'merchants/create',
        'MerchantCreate',
        '新增商戶',
        'ri:add-circle-line',
        '/merchants',
        '/game-provider/merchants/create',
        true,
        '/business/merchants'
      ),
      hiddenDetail(
        'merchants/:merchantId/lines/:lineUid',
        'MerchantLineDetail',
        '商戶線路詳細',
        'ri:route-line',
        '/merchants',
        '/business/merchants',
        '/game-provider/merchants/currency-detail'
      ),
      hiddenDetail(
        'merchants/:merchantId/currencies/:currency',
        'LegacyMerchantCurrencyDetail',
        '商戶線路詳細',
        'ri:route-line',
        '/merchants',
        '/business/merchants',
        '/game-provider/merchants/currency-detail'
      ),
      hiddenDetail(
        'merchants/:id(M[0-9]+)',
        'MerchantDetail',
        '商戶詳細',
        'ri:store-2-line',
        '/merchants',
        '/business/merchants',
        '/game-provider/merchants/detail'
      )
    ]
  },
  {
    path: '/members',
    alias: '/players',
    name: 'MemberCenter',
    component: '/index/index',
    redirect: '/members/management',
    meta: { title: '會員中心', icon: 'ri:user-search-line', menuGroup: '營運管理', roles },
    children: [
      page(
        'management',
        'MembersList',
        '會員管理',
        'ri:user-search-line',
        '/players',
        '/game-provider/members/index',
        true,
        '/members'
      ),
      hiddenDetail(
        'management/:id(P[0-9]+)',
        'MemberDetail',
        '會員詳細',
        'ri:user-search-line',
        '/players',
        '/members',
        '/game-provider/members/detail'
      )
    ]
  },
  {
    path: '/transactions',
    name: 'TransactionCenter',
    component: '/index/index',
    redirect: '/transactions/bets',
    meta: {
      title: '交易中心',
      icon: 'ri:exchange-dollar-line',
      menuGroup: '營運管理',
      roles
    },
    children: [
      page(
        'bets',
        'BetsList',
        '注單管理',
        'ri:file-list-3-line',
        '/bets',
        '/game-provider/transactions/bets/index'
      ),
      hiddenDetail(
        'bets/:id(B[0-9]+)',
        'BetDetail',
        '注單詳細',
        'ri:file-list-3-line',
        '/bets',
        '/transactions/bets',
        '/game-provider/transactions/bets/detail'
      ),
      page(
        'records',
        'GameTransactions',
        '交易管理',
        'ri:exchange-dollar-line',
        '/transactions',
        '/game-provider/transactions/records/index'
      ),
      hiddenDetail(
        'records/:id(TX[0-9]+)',
        'TransactionDetail',
        '交易詳細',
        'ri:exchange-dollar-line',
        '/transactions',
        '/transactions/records',
        '/game-provider/transactions/records/detail'
      )
    ]
  },
  {
    path: '/jackpots',
    name: 'JackpotCenter',
    component: '/index/index',
    redirect: '/jackpots/list',
    meta: { title: '獎池管理', icon: 'ri:funds-box-line', menuGroup: '營運管理', roles },
    children: [
      page(
        'list',
        'JackpotList',
        '獎池列表',
        'ri:list-check-2',
        '/jackpots',
        '/game-provider/jackpots/index',
        true,
        '/jackpots'
      ),
      page(
        'create',
        'JackpotCreate',
        '新增獎池',
        'ri:add-circle-line',
        '/jackpots',
        '/game-provider/jackpots/create',
        true
      ),
      hiddenDetail(
        ':id(JP[0-9]+)',
        'JackpotDetail',
        '獎池詳細',
        'ri:funds-box-line',
        '/jackpots',
        '/jackpots',
        '/game-provider/jackpots/detail'
      ),
      page(
        'ledger',
        'JackpotLedger',
        '獎池流水',
        'ri:file-list-2-line',
        '/jackpot-ledger',
        undefined,
        true
      ),
      page(
        'payouts',
        'JackpotPayouts',
        '派發紀錄',
        'ri:money-dollar-circle-line',
        '/jackpot-payouts',
        undefined,
        true
      )
    ]
  },
  {
    path: '/risk',
    name: 'RiskCenter',
    component: '/index/index',
    redirect: '/risk/overview',
    meta: {
      title: '風控中心',
      icon: 'ri:shield-check-line',
      menuGroup: '監控與作業',
      roles
    },
    children: [
      page(
        'overview',
        'RiskOverview',
        '風控總覽',
        'ri:dashboard-line',
        '/risk',
        '/game-provider/risk/overview'
      ),
      page(
        'alerts',
        'RiskAlerts',
        '告警列表',
        'ri:alarm-warning-line',
        '/risk-alerts',
        '/game-provider/risk/alerts/index'
      ),
      page(
        'rules',
        'RiskRules',
        '風控規則',
        'ri:filter-3-line',
        '/risk-rules',
        '/game-provider/risk/rules/index'
      ),
      page(
        'cases',
        'RiskCases',
        '風控案件',
        'ri:briefcase-4-line',
        '/risk-cases',
        '/game-provider/risk/cases/index'
      ),
      hiddenDetail(
        'cases/:id(R[0-9]+)',
        'RiskCaseDetail',
        '風控案件詳細',
        'ri:briefcase-4-line',
        '/risk-cases',
        '/risk/cases',
        '/game-provider/risk/cases/detail'
      ),
      page(
        'processing-logs',
        'RiskProcessingLogs',
        '處理紀錄',
        'ri:file-history-line',
        '/risk-logs',
        '/game-provider/risk/logs/index'
      )
    ]
  },
  {
    path: '/approvals',
    name: 'ApprovalCenter',
    component: '/index/index',
    redirect: '/approvals/pending',
    meta: {
      title: '審核中心',
      icon: 'ri:git-pull-request-line',
      menuGroup: '監控與作業',
      roles
    },
    children: [
      page(
        'pending',
        'ApprovalPending',
        '待審核',
        'ri:time-line',
        '/approvals-pending',
        '/game-provider/approvals/pending/index'
      ),
      page(
        'approved',
        'ApprovalApproved',
        '已通過',
        'ri:checkbox-circle-line',
        '/approvals-approved',
        '/game-provider/approvals/history-list/index'
      ),
      page(
        'rejected',
        'ApprovalRejected',
        '已駁回',
        'ri:close-circle-line',
        '/approvals-rejected',
        '/game-provider/approvals/history-list/index'
      ),
      page(
        'logs',
        'ApprovalLogs',
        '審核紀錄',
        'ri:file-history-line',
        '/approvals-logs',
        '/game-provider/approvals/logs/index'
      )
    ]
  },
  {
    path: '/finance',
    alias: '/settlements',
    name: 'FinanceCenter',
    component: '/index/index',
    redirect: '/finance/reconciliation/suppliers',
    meta: { title: '對帳／結算', icon: 'ri:calculator-line', menuGroup: '財務管理', roles },
    children: [
      page(
        'reconciliation/suppliers',
        'SupplierReconciliation',
        '供應商對帳',
        'ri:gamepad-line',
        '/supplier-reconciliation',
        '/game-provider/finance/reconciliation/index'
      ),
      hiddenDetail(
        'reconciliation/suppliers/:id',
        'SupplierReconciliationDetail',
        '供應商對帳詳細',
        'ri:file-list-3-line',
        '/supplier-reconciliation-detail',
        '/finance/reconciliation/suppliers',
        '/game-provider/finance/reconciliation/detail'
      ),
      page(
        'reconciliation/agents',
        'AgentReconciliation',
        '代理對帳',
        'ri:node-tree',
        '/agent-reconciliation',
        '/game-provider/finance/reconciliation/index'
      ),
      hiddenDetail(
        'reconciliation/agents/:id',
        'AgentReconciliationDetail',
        '代理對帳詳細',
        'ri:file-list-3-line',
        '/agent-reconciliation-detail',
        '/finance/reconciliation/agents',
        '/game-provider/finance/reconciliation/detail'
      ),
      page(
        'reconciliation/merchants',
        'MerchantReconciliation',
        '商戶對帳',
        'ri:store-2-line',
        '/merchant-reconciliation',
        '/game-provider/finance/reconciliation/index'
      ),
      hiddenDetail(
        'reconciliation/merchants/:id',
        'MerchantReconciliationDetail',
        '商戶對帳詳細',
        'ri:file-list-3-line',
        '/merchant-reconciliation-detail',
        '/finance/reconciliation/merchants',
        '/game-provider/finance/reconciliation/detail'
      ),
      page(
        'reconciliation/differences',
        'ReconciliationDifferences',
        '差異處理',
        'ri:file-warning-line',
        '/reconciliation-differences',
        '/game-provider/finance/reconciliation/differences'
      ),
      page(
        'reconciliation/logs',
        'ReconciliationChangeLogs',
        '異動紀錄',
        'ri:file-history-line',
        '/settlement-change-logs',
        '/game-provider/finance/settlement/logs/index'
      )
    ]
  },
  {
    path: '/reports',
    name: 'ReportCenter',
    component: '/index/index',
    redirect: '/reports/operations',
    meta: { title: '報表中心', icon: 'ri:bar-chart-box-line', menuGroup: '財務管理', roles },
    children: [
      page(
        'operations',
        'OperationsReport',
        '營運報表',
        'ri:dashboard-3-line',
        '/reports',
        reportView
      ),
      page(
        'games',
        'GameReport',
        '遊戲報表',
        'ri:gamepad-line',
        '/report-game-performance',
        reportView
      ),
      page('agents', 'AgentReport', '代理報表', 'ri:node-tree', '/report-agents', reportView),
      page(
        'merchants',
        'MerchantReport',
        '商戶報表',
        'ri:store-2-line',
        '/report-merchants',
        reportView
      ),
      page(
        'jackpots',
        'JackpotReport',
        '獎池報表',
        'ri:funds-box-line',
        '/report-jackpots',
        reportView
      )
    ]
  },
  {
    path: '/platform/exchange-rates',
    name: 'PlatformExchangeRateManagement',
    component: '/index/index',
    redirect: '/platform/exchange-rates/currencies',
    meta: {
      title: '匯率管理',
      icon: 'ri:exchange-funds-line',
      menuGroup: '平台管理',
      roles
    },
    children: [
      page(
        'currencies',
        'PlatformCurrencyManagement',
        '幣別管理',
        'ri:currency-line',
        '/platform-currency-management',
        '/game-provider/finance-settings/currencies/index'
      ),
      page(
        'settings',
        'PlatformExchangeRateSettings',
        '匯率設定',
        'ri:equalizer-2-line',
        '/platform-exchange-rate-settings',
        '/game-provider/finance-settings/exchange-rates/index'
      ),
      page(
        'history',
        'PlatformExchangeRateHistory',
        '匯率歷史',
        'ri:history-line',
        '/platform-exchange-rate-history',
        '/game-provider/finance-settings/exchange-rates/index'
      )
    ]
  },
  {
    path: '/platform/access',
    name: 'AccessManagement',
    component: '/index/index',
    redirect: '/platform/access/accounts',
    meta: { title: '帳號與權限', icon: 'ri:admin-line', menuGroup: '平台管理', roles },
    children: [
      page(
        'accounts',
        'PlatformPersonnel',
        '人員管理',
        'ri:user-settings-line',
        '/platform-accounts',
        '/game-provider/platform/access/index'
      ),
      page(
        'roles',
        'PlatformRolePermissions',
        '角色權限管理',
        'ri:admin-line',
        '/platform-roles',
        '/game-provider/platform/access/index'
      ),
      page(
        'logs',
        'PlatformOperationLogs',
        '操作日誌',
        'ri:file-list-3-line',
        '/platform-operation-logs',
        '/game-provider/platform/logs/index'
      )
    ]
  },
  {
    path: '/platform/locales',
    name: 'LocaleManagement',
    component: '/index/index',
    redirect: '/platform/locales/languages',
    meta: { title: '語系與地區', icon: 'ri:translate-2', menuGroup: '平台管理', roles },
    children: [
      page(
        'languages',
        'PlatformLanguages',
        '語系管理',
        'ri:translate-2',
        '/platform-languages',
        '/game-provider/platform/locales/index'
      ),
      page(
        'regions',
        'PlatformRegions',
        '國家／地區',
        'ri:earth-line',
        '/platform-regions',
        '/game-provider/platform/locales/index'
      ),
      page(
        'timezones',
        'PlatformTimezones',
        '時區管理',
        'ri:time-line',
        '/platform-timezones',
        '/game-provider/platform/locales/index'
      )
    ]
  },
  {
    path: '/platform/notifications',
    name: 'NotificationManagement',
    component: '/index/index',
    redirect: '/platform/notifications/rules',
    meta: {
      title: '通知管理',
      icon: 'ri:notification-3-line',
      menuGroup: '平台管理',
      roles
    },
    children: [
      page(
        'rules',
        'PlatformNotificationRules',
        '通知規則',
        'ri:filter-3-line',
        '/platform-notification-rules',
        '/game-provider/platform/notifications/index'
      ),
      page(
        'logs',
        'PlatformNotificationLogs',
        '通知紀錄',
        'ri:file-history-line',
        '/platform-notification-logs',
        '/game-provider/platform/notifications/index'
      )
    ]
  },
  {
    path: '/platform/parameters',
    name: 'ParameterManagement',
    component: '/index/index',
    redirect: '/platform/parameters/basic',
    meta: { title: '系統參數', icon: 'ri:settings-4-line', menuGroup: '平台管理', roles },
    children: [
      page(
        'basic',
        'PlatformBasicSettings',
        '系統基本設定',
        'ri:settings-4-line',
        '/platform-basic-settings',
        '/game-provider/platform/parameters/index'
      ),
      page(
        'login-security',
        'PlatformLoginSecurity',
        '登入安全',
        'ri:shield-user-line',
        '/platform-login-security',
        '/game-provider/platform/parameters/index'
      )
    ]
  },
  {
    path: '/platform/logs',
    name: 'SystemLogManagement',
    component: '/index/index',
    redirect: '/platform/logs/logins',
    meta: { title: '系統紀錄', icon: 'ri:file-history-line', menuGroup: '平台管理', roles },
    children: [
      page(
        'logins',
        'PlatformLoginLogs',
        '登入紀錄',
        'ri:login-box-line',
        '/platform-login-logs',
        '/game-provider/platform/system-logs/index'
      ),
      page(
        'approvals',
        'PlatformApprovalLogs',
        '審核紀錄',
        'ri:git-pull-request-line',
        '/platform-approval-logs',
        '/game-provider/platform/system-logs/index'
      ),
      page(
        'errors',
        'PlatformErrorLogs',
        '系統異常紀錄',
        'ri:error-warning-line',
        '/platform-error-logs',
        '/game-provider/platform/system-logs/index'
      )
    ]
  }
]
