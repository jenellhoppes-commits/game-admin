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
    redirect: '/finance/reconciliation/merchants',
    meta: { title: '對帳／結算', icon: 'ri:calculator-line', menuGroup: '財務管理', roles },
    children: [
      directory('reconciliation', 'ReconciliationManagement', '對帳管理', 'ri:scales-3-line', [
        page(
          'merchants',
          'MerchantReconciliation',
          '商戶對帳',
          'ri:store-2-line',
          '/merchant-reconciliation',
          '/game-provider/finance/reconciliation/index'
        ),
        hiddenDetail(
          'merchants/:id',
          'MerchantReconciliationDetail',
          '商戶對帳詳細',
          'ri:file-list-3-line',
          '/merchant-reconciliation-detail',
          '/finance/reconciliation/merchants',
          '/game-provider/finance/reconciliation/detail'
        ),
        page(
          'agents',
          'AgentReconciliation',
          '代理對帳',
          'ri:node-tree',
          '/agent-reconciliation',
          '/game-provider/finance/reconciliation/index'
        ),
        hiddenDetail(
          'agents/:id',
          'AgentReconciliationDetail',
          '代理對帳詳細',
          'ri:file-list-3-line',
          '/agent-reconciliation-detail',
          '/finance/reconciliation/agents',
          '/game-provider/finance/reconciliation/detail'
        ),
        page(
          'differences',
          'ReconciliationDifferences',
          '差異處理',
          'ri:file-warning-line',
          '/reconciliation-differences',
          '/game-provider/finance/reconciliation/differences'
        )
      ]),
      directory('settlement', 'SettlementManagement', '結算管理', 'ri:calendar-check-line', [
        page(
          'batches',
          'SettlementBatches',
          '結算批次',
          'ri:calendar-check-line',
          '/settlements',
          '/game-provider/finance/settlement/batches/index'
        ),
        hiddenDetail(
          'batches/:id',
          'SettlementBatchDetail',
          '結算批次詳細',
          'ri:calendar-check-line',
          '/settlement-batch-detail',
          '/finance/settlement/batches',
          '/game-provider/finance/settlement/batches/detail'
        ),
        page(
          'merchant-statements',
          'MerchantSettlementStatements',
          '商戶結算單',
          'ri:file-list-3-line',
          '/merchant-settlement-sheets',
          '/game-provider/finance/settlement/statements/index'
        ),
        page(
          'agent-statements',
          'AgentSettlementStatements',
          '代理結算單',
          'ri:file-list-3-line',
          '/agent-settlement-sheets',
          '/game-provider/finance/settlement/statements/index'
        ),
        page(
          'exchange-snapshots',
          'SettlementExchangeSnapshots',
          '匯率快照',
          'ri:camera-line',
          '/settlement-exchange-snapshots',
          '/game-provider/finance/settlement/exchange-snapshots/index'
        ),
        page(
          'adjustments',
          'SettlementAdjustments',
          '調整項目',
          'ri:edit-box-line',
          '/settlement-adjustments',
          '/game-provider/finance/settlement/adjustments/index'
        ),
        page(
          'logs',
          'SettlementChangeLogs',
          '異動紀錄',
          'ri:file-history-line',
          '/settlement-change-logs',
          '/game-provider/finance/settlement/logs/index'
        )
      ])
    ]
  },
  {
    path: '/reports',
    name: 'ReportCenter',
    component: '/index/index',
    redirect: '/reports/overview',
    meta: { title: '報表中心', icon: 'ri:bar-chart-box-line', menuGroup: '財務管理', roles },
    children: [
      page('overview', 'ReportOverview', '營運總覽', 'ri:dashboard-3-line', '/reports', reportView),
      directory('games', 'GameReportGroup', '遊戲報表', 'ri:gamepad-line', [
        page(
          'performance',
          'GamePerformanceReport',
          '遊戲表現',
          'ri:line-chart-line',
          '/report-game-performance',
          reportView
        ),
        page('rtp', 'RtpReport', 'RTP', 'ri:percent-line', '/report-rtp', reportView)
      ]),
      directory('merchants', 'MerchantReportGroup', '商戶報表', 'ri:store-2-line', [
        page(
          'overview',
          'MerchantReport',
          '商戶',
          'ri:store-2-line',
          '/report-merchants',
          reportView
        ),
        page(
          'lines',
          'MerchantLineReport',
          '商戶線路',
          'ri:route-line',
          '/report-merchant-lines',
          reportView
        )
      ]),
      directory('agents', 'AgentReportGroup', '代理報表', 'ri:node-tree', [
        page('overview', 'AgentReport', '代理', 'ri:node-tree', '/report-agents', reportView),
        page(
          'merchants',
          'AgentMerchantReport',
          '旗下商戶',
          'ri:store-2-line',
          '/report-agent-merchants',
          reportView
        )
      ]),
      page(
        'members',
        'MemberReports',
        '會員報表',
        'ri:user-search-line',
        '/report-players',
        reportView
      ),
      directory('transactions', 'TransactionReportGroup', '交易報表', 'ri:exchange-dollar-line', [
        page(
          'bets',
          'BetStatisticsReport',
          '注單統計',
          'ri:file-list-3-line',
          '/report-bets',
          reportView
        ),
        page(
          'records',
          'TransactionStatisticsReport',
          '交易統計',
          'ri:exchange-dollar-line',
          '/report-transactions',
          reportView
        )
      ]),
      page(
        'jackpots',
        'JackpotReports',
        '獎池報表',
        'ri:funds-box-line',
        '/report-jackpots',
        reportView
      ),
      directory('settlements', 'SettlementReportGroup', '結算報表', 'ri:calculator-line', [
        page(
          'merchants',
          'MerchantSettlementReport',
          '商戶結算',
          'ri:store-2-line',
          '/report-merchant-settlements',
          reportView
        ),
        page(
          'agents',
          'AgentSettlementReport',
          '代理結算',
          'ri:node-tree',
          '/report-agent-settlements',
          reportView
        )
      ])
    ]
  },
  {
    path: '/finance-settings',
    name: 'FinanceSettings',
    component: '/index/index',
    redirect: '/finance-settings/currencies/data',
    meta: {
      title: '財務設定',
      icon: 'ri:money-dollar-circle-line',
      menuGroup: '財務管理',
      roles
    },
    children: [
      directory('currencies', 'CurrencyManagement', '幣別管理', 'ri:currency-line', [
        page(
          'data',
          'CurrencyData',
          '幣別資料',
          'ri:database-2-line',
          '/finance-currency-data',
          '/game-provider/finance-settings/currencies/index'
        ),
        page(
          'transaction',
          'TransactionCurrencies',
          '交易幣別',
          'ri:exchange-dollar-line',
          '/finance-transaction-currencies',
          '/game-provider/finance-settings/currencies/index'
        ),
        page(
          'settlement',
          'SettlementCurrencies',
          '結算幣別',
          'ri:calculator-line',
          '/finance-settlement-currencies',
          '/game-provider/finance-settings/currencies/index'
        ),
        page(
          'precision',
          'CurrencyPrecision',
          '精度設定',
          'ri:equalizer-2-line',
          '/finance-currency-precision',
          '/game-provider/finance-settings/currencies/index'
        )
      ]),
      directory('exchange-rates', 'ExchangeRateManagement', '匯率管理', 'ri:exchange-funds-line', [
        page(
          'daily',
          'DailyExchangeRates',
          '每日匯率',
          'ri:calendar-line',
          '/finance-rates-daily',
          '/game-provider/finance-settings/exchange-rates/index'
        ),
        page(
          'sources',
          'ExchangeRateSources',
          '匯率來源',
          'ri:links-line',
          '/finance-rate-sources',
          '/game-provider/finance-settings/exchange-rates/index'
        ),
        page(
          'adjustments',
          'ExchangeRateAdjustments',
          '匯率調整',
          'ri:edit-box-line',
          '/finance-rate-adjustments',
          '/game-provider/finance-settings/exchange-rates/index'
        ),
        page(
          'history',
          'ExchangeRateHistory',
          '歷史匯率',
          'ri:history-line',
          '/finance-rate-history',
          '/game-provider/finance-settings/exchange-rates/index'
        ),
        page(
          'alerts',
          'ExchangeRateAlerts',
          '匯率預警',
          'ri:alarm-warning-line',
          '/finance-rate-alerts',
          '/game-provider/finance-settings/exchange-rates/index'
        ),
        page(
          'logs',
          'ExchangeRateLogs',
          '更新紀錄',
          'ri:file-history-line',
          '/finance-rate-logs',
          '/game-provider/finance-settings/exchange-rates/index'
        )
      ]),
      directory('settlement', 'SettlementSettings', '結算設定', 'ri:settings-4-line', [
        page(
          'default-currency',
          'DefaultSettlementCurrency',
          '預設結算幣別',
          'ri:currency-line',
          '/finance-default-settlement-currency',
          '/game-provider/finance-settings/settlement/index'
        ),
        page(
          'cycles',
          'SettlementCycles',
          '結算週期',
          'ri:calendar-check-line',
          '/finance-settlement-cycles',
          '/game-provider/finance-settings/settlement/index'
        ),
        page(
          'rate-rules',
          'SettlementRateRules',
          '匯率取值規則',
          'ri:filter-3-line',
          '/finance-settlement-rate-rules',
          '/game-provider/finance-settings/settlement/index'
        ),
        page(
          'precision',
          'SettlementPrecision',
          '金額精度',
          'ri:equalizer-2-line',
          '/finance-settlement-precision',
          '/game-provider/finance-settings/settlement/index'
        ),
        page(
          'rounding',
          'SettlementRounding',
          '捨入規則',
          'ri:function-line',
          '/finance-settlement-rounding',
          '/game-provider/finance-settings/settlement/index'
        )
      ])
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
        'PlatformAccounts',
        '後台帳號',
        'ri:user-settings-line',
        '/platform-accounts',
        '/game-provider/platform/access/index'
      ),
      page(
        'roles',
        'PlatformRoles',
        '角色管理',
        'ri:admin-line',
        '/platform-roles',
        '/game-provider/platform/access/index'
      ),
      page(
        'permissions',
        'PlatformPermissions',
        '操作權限',
        'ri:key-2-line',
        '/platform-permissions',
        '/game-provider/platform/access/index'
      ),
      page(
        'sensitive',
        'PlatformSensitivePermissions',
        '敏感權限',
        'ri:shield-keyhole-line',
        '/platform-sensitive-permissions',
        '/game-provider/platform/access/index'
      ),
      page(
        'data-scopes',
        'PlatformDataScopes',
        '資料範圍',
        'ri:focus-3-line',
        '/platform-data-scopes',
        '/game-provider/platform/access/index'
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
    redirect: '/platform/logs/operations',
    meta: { title: '系統紀錄', icon: 'ri:file-history-line', menuGroup: '平台管理', roles },
    children: [
      page(
        'operations',
        'PlatformOperationLogs',
        '操作紀錄',
        'ri:file-list-3-line',
        '/platform-operation-logs',
        '/game-provider/platform/logs/index'
      ),
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
