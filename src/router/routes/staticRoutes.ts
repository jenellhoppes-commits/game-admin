import { AppRouteRecordRaw } from '@/utils/router'

/**
 * 静态路由配置（不需要权限就能访问的路由）
 *
 * 属性说明：
 * isHideTab: true 表示不在标签页中显示
 *
 * 注意事项：
 * 1、path、name 不要和动态路由冲突，否则会导致路由冲突无法访问
 * 2、静态路由不管是否登录都可以访问
 */
export const staticRoutes: AppRouteRecordRaw[] = [
  // 不需要登录就能访问的路由示例
  // {
  //   path: '/welcome',
  //   name: 'WelcomeStatic',
  //   component: () => import('@views/dashboard/console/index.vue'),
  //   meta: { title: 'menus.dashboard.title' }
  // },
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('@views/auth/login/index.vue'),
    meta: { title: 'menus.login.title', isHideTab: true }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: () => import('@views/auth/register/index.vue'),
    meta: { title: 'menus.register.title', isHideTab: true }
  },
  {
    path: '/auth/forget-password',
    name: 'ForgetPassword',
    component: () => import('@views/auth/forget-password/index.vue'),
    meta: { title: 'menus.forgetPassword.title', isHideTab: true }
  },
  {
    path: '/403',
    name: 'Exception403',
    component: () => import('@views/exception/403/index.vue'),
    meta: { title: '403', isHideTab: true }
  },
  {
    path: '/games/math',
    name: 'LegacyGameMath',
    redirect: '/games/management',
    meta: { title: '數值管理（舊）', isHideTab: true }
  },
  {
    path: '/games/versions',
    name: 'LegacyGameVersions',
    redirect: '/games/management',
    meta: { title: '遊戲版本（舊）', isHideTab: true }
  },
  {
    path: '/games/assets',
    name: 'LegacyGameAssets',
    redirect: '/games/management',
    meta: { title: '遊戲素材（舊）', isHideTab: true }
  },
  {
    path: '/bets',
    name: 'LegacyBetsList',
    redirect: '/transactions/bets',
    meta: { title: '注單列表（舊）', isHideTab: true }
  },
  {
    path: '/bets/replay',
    name: 'LegacyRoundReplay',
    redirect: '/transactions/bets',
    meta: { title: '局回放（舊）', isHideTab: true }
  },
  {
    path: '/bets/:id',
    name: 'LegacyBetDetail',
    redirect: (to) => `/transactions/bets/${String(to.params.id)}`,
    meta: { title: '注單詳情（舊）', isHideTab: true }
  },
  {
    path: '/transactions/wallet',
    name: 'LegacyWalletTransactions',
    redirect: '/transactions/records',
    meta: { title: '錢包／轉帳（舊）', isHideTab: true }
  },
  {
    path: '/transactions/manual',
    name: 'LegacyManualTransactions',
    redirect: '/transactions/records',
    meta: { title: '人工處理（舊）', isHideTab: true }
  },
  {
    path: '/transactions/bets/replay',
    name: 'LegacyTransactionRoundReplay',
    redirect: '/transactions/bets',
    meta: { title: '局回放（舊）', isHideTab: true }
  },
  {
    path: '/jackpots/merchant-currencies',
    name: 'LegacyJackpotMerchantSettings',
    redirect: '/jackpots/list',
    meta: { title: '商戶獎池設定（舊）', isHideTab: true }
  },
  {
    path: '/jackpots/adjustments',
    name: 'LegacyJackpotAdjustments',
    redirect: '/jackpots/list',
    meta: { title: '獎池人工調整（舊）', isHideTab: true }
  },
  {
    path: '/risk/whitelist',
    name: 'LegacyRiskWhitelist',
    redirect: '/risk/rules',
    meta: { title: '風控白名單（舊）', isHideTab: true }
  },
  {
    path: '/finance/reconciliation',
    name: 'LegacyWalletReconciliation',
    redirect: '/finance/reconciliation/agents',
    meta: { title: '錢包對帳（舊）', isHideTab: true }
  },
  {
    path: '/finance/sheets',
    name: 'LegacySettlementSheets',
    redirect: '/finance/reconciliation/merchants',
    meta: { title: '結算單（舊）', isHideTab: true }
  },
  {
    path: '/finance/adjustments',
    name: 'LegacySettlementAdjustments',
    redirect: '/finance/reconciliation/merchants',
    meta: { title: '調整項目（舊）', isHideTab: true }
  },
  {
    path: '/reports/merchant-currencies',
    name: 'LegacyMerchantCurrencyReports',
    redirect: '/reports/merchants',
    meta: { title: '商戶幣別報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/players',
    name: 'LegacyPlayerReports',
    redirect: '/reports/operations',
    meta: { title: '玩家報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/rtp',
    name: 'LegacyRtpReports',
    redirect: '/reports/games',
    meta: { title: 'RTP 報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/wallet',
    name: 'LegacyWalletReports',
    redirect: '/reports/operations',
    meta: { title: '錢包報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/overview',
    name: 'LegacyReportOverview',
    redirect: '/reports/operations',
    meta: { title: '營運總覽（舊）', isHideTab: true }
  },
  {
    path: '/reports/games/:section',
    name: 'LegacyGameReportSection',
    redirect: '/reports/games',
    meta: { title: '遊戲報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/agents/:section',
    name: 'LegacyAgentReportSection',
    redirect: '/reports/agents',
    meta: { title: '代理報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/merchants/:section',
    name: 'LegacyMerchantReportSection',
    redirect: '/reports/merchants',
    meta: { title: '商戶報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/members',
    name: 'LegacyMemberReport',
    redirect: '/reports/operations',
    meta: { title: '會員報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/transactions/:section',
    name: 'LegacyTransactionReportSection',
    redirect: '/reports/operations',
    meta: { title: '交易報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/settlements/merchants',
    name: 'LegacyMerchantSettlementReport',
    redirect: '/reports/merchants',
    meta: { title: '商戶結算報表（舊）', isHideTab: true }
  },
  {
    path: '/reports/settlements/agents',
    name: 'LegacyAgentSettlementReport',
    redirect: '/reports/agents',
    meta: { title: '代理結算報表（舊）', isHideTab: true }
  },
  {
    path: '/system/languages',
    name: 'LegacySystemLanguages',
    redirect: '/platform/locales/languages',
    meta: { title: '語系管理（舊）', isHideTab: true }
  },
  {
    path: '/system/credential-policy',
    name: 'LegacyCredentialPolicy',
    redirect: '/platform/parameters/basic',
    meta: { title: '憑證政策（舊）', isHideTab: true }
  },
  {
    path: '/system/settings',
    name: 'LegacySystemSettings',
    redirect: '/platform/parameters/basic',
    meta: { title: '系統設定（舊）', isHideTab: true }
  },
  {
    path: '/integrations',
    name: 'LegacyIntegrationCenter',
    redirect: '/business/merchants',
    meta: { title: '串接管理（舊）', isHideTab: true }
  },
  {
    path: '/integrations/credentials',
    name: 'LegacyIntegrationCredentials',
    redirect: '/business/merchants',
    meta: { title: 'Credential 管理（舊）', isHideTab: true }
  },
  {
    path: '/integrations/testing',
    name: 'LegacyIntegrationTesting',
    redirect: '/business/merchants',
    meta: { title: '串接測試（舊）', isHideTab: true }
  },
  {
    path: '/integrations/traces',
    name: 'LegacyIntegrationTraces',
    redirect: '/business/merchants',
    meta: { title: '串接 Trace（舊）', isHideTab: true }
  },
  {
    path: '/integrations/docs',
    name: 'LegacyIntegrationDocs',
    redirect: '/business/merchants',
    meta: { title: '串接文件（舊）', isHideTab: true }
  },
  {
    path: '/integrations/:pathMatch(.*)*',
    name: 'LegacyIntegrations',
    redirect: '/business/merchants',
    meta: { title: '串接管理（舊）', isHideTab: true }
  },
  {
    path: '/maintenance/:pathMatch(.*)*',
    name: 'LegacyMaintenance',
    redirect: '/platform/notifications/rules',
    meta: { title: '維護與公告（舊）', isHideTab: true }
  },
  {
    path: '/games/list',
    name: 'LegacyGamesList',
    redirect: '/games/management',
    meta: { title: '遊戲列表（舊）', isHideTab: true }
  },
  {
    path: '/games/management/list',
    name: 'LegacyNestedGamesList',
    redirect: '/games/management',
    meta: { title: '遊戲列表（舊）', isHideTab: true }
  },
  {
    path: '/games/taxonomy',
    name: 'LegacyGameTaxonomy',
    redirect: '/games/taxonomy/types',
    meta: { title: '分類與標籤（舊）', isHideTab: true }
  },
  {
    path: '/games/:id(G[0-9]+)',
    name: 'LegacyGameDetail',
    redirect: (to) => `/games/management/${String(to.params.id)}`,
    meta: { title: '遊戲詳細（舊）', isHideTab: true }
  },
  {
    path: '/agents',
    name: 'LegacyAgentsList',
    redirect: '/business/agents',
    meta: { title: '代理列表（舊）', isHideTab: true }
  },
  {
    path: '/business/agents/list',
    name: 'LegacyNestedAgentsList',
    redirect: '/business/agents',
    meta: { title: '代理列表（舊）', isHideTab: true }
  },
  {
    path: '/agents/:id(A[0-9]+)',
    name: 'LegacyAgentDetail',
    redirect: (to) => `/business/agents/${String(to.params.id)}`,
    meta: { title: '代理詳細（舊）', isHideTab: true }
  },
  {
    path: '/merchants',
    name: 'LegacyMerchantsList',
    redirect: '/business/merchants',
    meta: { title: '商戶列表（舊）', isHideTab: true }
  },
  {
    path: '/business/merchants/list',
    name: 'LegacyNestedMerchantsList',
    redirect: '/business/merchants',
    meta: { title: '商戶列表（舊）', isHideTab: true }
  },
  {
    path: '/merchants/create',
    name: 'LegacyMerchantCreate',
    redirect: '/business/merchants/create',
    meta: { title: '新增商戶（舊）', isHideTab: true }
  },
  {
    path: '/merchants/:id(M[0-9]+)',
    name: 'LegacyMerchantDetail',
    redirect: (to) => `/business/merchants/${String(to.params.id)}`,
    meta: { title: '商戶詳細（舊）', isHideTab: true }
  },
  {
    path: '/members/:id(P[0-9]+)',
    name: 'LegacyMemberDetail',
    redirect: (to) => `/members/management/${String(to.params.id)}`,
    meta: { title: '會員詳細（舊）', isHideTab: true }
  },
  {
    path: '/members/management/list',
    name: 'LegacyNestedMembersList',
    redirect: '/members/management',
    meta: { title: '會員列表（舊）', isHideTab: true }
  },
  {
    path: '/transactions/bets/list',
    name: 'LegacyNestedBetsList',
    redirect: '/transactions/bets',
    meta: { title: '注單列表（舊）', isHideTab: true }
  },
  {
    path: '/transactions/records/list',
    name: 'LegacyNestedTransactionsList',
    redirect: '/transactions/records',
    meta: { title: '交易列表（舊）', isHideTab: true }
  },
  {
    path: '/transactions/:id(TX[0-9]+)',
    name: 'LegacyTransactionDetail',
    redirect: (to) => `/transactions/records/${String(to.params.id)}`,
    meta: { title: '交易詳細（舊）', isHideTab: true }
  },
  {
    path: '/jackpots/pools',
    name: 'LegacyJackpotPools',
    redirect: '/jackpots/list',
    meta: { title: '獎池列表（舊）', isHideTab: true }
  },
  {
    path: '/finance/merchant-reconciliation',
    name: 'LegacyMerchantReconciliation',
    redirect: '/finance/reconciliation/merchants',
    meta: { title: '商戶對帳（舊）', isHideTab: true }
  },
  {
    path: '/finance/agent-reconciliation',
    name: 'LegacyAgentReconciliation',
    redirect: '/finance/reconciliation/agents',
    meta: { title: '代理對帳（舊）', isHideTab: true }
  },
  {
    path: '/finance/differences',
    name: 'LegacyReconciliationDifferences',
    redirect: '/finance/reconciliation/differences',
    meta: { title: '差異處理（舊）', isHideTab: true }
  },
  {
    path: '/finance/batches',
    name: 'LegacySettlementBatches',
    redirect: '/finance/reconciliation/merchants',
    meta: { title: '結算批次（舊）', isHideTab: true }
  },
  {
    path: '/finance/merchant-statements',
    name: 'LegacyMerchantStatements',
    redirect: '/finance/reconciliation/merchants',
    meta: { title: '商戶結算單（舊）', isHideTab: true }
  },
  {
    path: '/finance/agent-statements',
    name: 'LegacyAgentStatements',
    redirect: '/finance/reconciliation/agents',
    meta: { title: '代理結算單（舊）', isHideTab: true }
  },
  {
    path: '/system',
    name: 'LegacySystem',
    redirect: '/platform/access/accounts',
    meta: { title: '系統管理（舊）', isHideTab: true }
  },
  {
    path: '/system/currencies',
    name: 'LegacySystemCurrencies',
    redirect: '/platform/exchange-rates/currencies',
    meta: { title: '幣別管理（舊）', isHideTab: true }
  },
  {
    path: '/system/exchange-rates',
    name: 'LegacySystemExchangeRates',
    redirect: '/platform/exchange-rates/settings',
    meta: { title: '匯率管理（舊）', isHideTab: true }
  },
  {
    path: '/system/settlement-settings',
    name: 'LegacySystemSettlementSettings',
    redirect: '/platform/exchange-rates/settings',
    meta: { title: '結算設定（舊）', isHideTab: true }
  },
  {
    path: '/system/accounts',
    name: 'LegacySystemAccounts',
    redirect: '/platform/access/accounts',
    meta: { title: '後台帳號（舊）', isHideTab: true }
  },
  {
    path: '/system/roles',
    name: 'LegacySystemRoles',
    redirect: '/platform/access/roles',
    meta: { title: '角色權限（舊）', isHideTab: true }
  },
  {
    path: '/system/approvals',
    name: 'LegacySystemApprovals',
    redirect: '/approvals/pending',
    meta: { title: '審核管理（舊）', isHideTab: true }
  },
  {
    path: '/system/notifications',
    name: 'LegacySystemNotifications',
    redirect: '/platform/notifications/rules',
    meta: { title: '通知設定（舊）', isHideTab: true }
  },
  {
    path: '/system/logs',
    name: 'LegacySystemLogs',
    redirect: '/platform/access/logs',
    meta: { title: '系統紀錄（舊）', isHideTab: true }
  },
  {
    path: '/platform/access/permissions',
    name: 'LegacyPlatformPermissions',
    redirect: '/platform/access/roles',
    meta: { title: '操作權限（舊）', isHideTab: true }
  },
  {
    path: '/platform/access/sensitive',
    name: 'LegacyPlatformSensitivePermissions',
    redirect: '/platform/access/roles',
    meta: { title: '敏感權限（舊）', isHideTab: true }
  },
  {
    path: '/platform/access/data-scopes',
    name: 'LegacyPlatformDataScopes',
    redirect: '/platform/access/roles',
    meta: { title: '資料範圍（舊）', isHideTab: true }
  },
  {
    path: '/platform/logs/operations',
    name: 'LegacyPlatformOperationLogs',
    redirect: '/platform/access/logs',
    meta: { title: '操作紀錄（舊）', isHideTab: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'Exception404',
    component: () => import('@views/exception/404/index.vue'),
    meta: { title: '404', isHideTab: true }
  },
  {
    path: '/500',
    name: 'Exception500',
    component: () => import('@views/exception/500/index.vue'),
    meta: { title: '500', isHideTab: true }
  },
  {
    path: '/outside',
    component: () => import('@views/index/index.vue'),
    name: 'Outside',
    meta: { title: 'menus.outside.title' },
    children: [
      // iframe 内嵌页面
      {
        path: '/outside/iframe/:path',
        name: 'Iframe',
        component: () => import('@/views/outside/Iframe.vue'),
        meta: { title: 'iframe' }
      }
    ]
  }
]
