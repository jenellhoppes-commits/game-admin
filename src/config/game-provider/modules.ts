import type { BusinessModuleDefinition } from '@/types/game-provider'

export const businessModuleDefinitions: Record<string, BusinessModuleDefinition> = {
  '/merchants': {
    path: '/merchants',
    title: '商戶管理',
    eyebrow: 'Merchant Management',
    description: '管理合作商戶、遊戲開通狀態與營運歸屬。',
    primaryAction: '新增商戶',
    codeLabel: 'Merchant ID',
    nameLabel: '商戶名稱',
    categoryLabel: '合作模式',
    ownerLabel: '負責團隊',
    metricLabel: '已開通遊戲',
    detailBase: '/merchants'
  },
  '/games': {
    path: '/games',
    title: '遊戲管理',
    eyebrow: 'Game Catalog',
    description: '集中管理遊戲目錄、類型、上線狀態與產品歸屬。',
    primaryAction: '新增遊戲',
    codeLabel: '遊戲代碼',
    nameLabel: '遊戲名稱',
    categoryLabel: '遊戲類型',
    ownerLabel: '內部名稱',
    metricLabel: '核心數值',
    detailBase: '/games'
  },
  '/game-math': {
    path: '/game-math',
    title: '數值管理',
    eyebrow: 'Game Math',
    description: '預留 RTP、波動度與數值版本的管理框架。',
    primaryAction: '新增數值版本',
    codeLabel: 'Math ID',
    nameLabel: '數值方案',
    categoryLabel: '遊戲類型',
    ownerLabel: '數值團隊',
    metricLabel: 'RTP'
  },
  '/game-versions': {
    path: '/game-versions',
    title: '遊戲版本',
    eyebrow: 'Game Versions',
    description: '追蹤遊戲版本、環境、QA 狀態與發布節點。',
    primaryAction: '建立版本',
    codeLabel: 'Version ID',
    nameLabel: '版本名稱',
    categoryLabel: '環境',
    ownerLabel: '發布團隊',
    metricLabel: '發布狀態'
  },
  '/game-assets': {
    path: '/game-assets',
    title: '遊戲素材',
    eyebrow: 'Game Assets',
    description: '管理 Lobby、縮圖、橫幅與多語系遊戲素材。',
    primaryAction: '上傳素材',
    codeLabel: 'Asset ID',
    nameLabel: '素材名稱',
    categoryLabel: '素材類型',
    ownerLabel: '負責團隊',
    metricLabel: '尺寸'
  },
  '/jackpots': {
    path: '/jackpots',
    title: '獎池管理',
    eyebrow: 'Jackpot Management',
    description: '管理 Network、Local 與 Progressive 獎池設定。',
    primaryAction: '新增獎池',
    codeLabel: 'Jackpot ID',
    nameLabel: '獎池名稱',
    categoryLabel: '獎池類型',
    ownerLabel: '負責團隊',
    metricLabel: '目前池額',
    detailBase: '/jackpots'
  },
  '/players': {
    path: '/players',
    title: '會員管理',
    eyebrow: '會員中心',
    description: '查詢會員所屬商戶線路、交易幣別、遊戲活動與限制狀態。',
    primaryAction: '匯出會員',
    codeLabel: '會員編號',
    nameLabel: '會員識別碼',
    categoryLabel: '會員標籤',
    ownerLabel: '所屬商戶',
    metricLabel: '最近遊戲',
    detailBase: '/members'
  },
  '/bets': {
    path: '/bets',
    title: '注單管理',
    eyebrow: '交易中心',
    description: '查詢注單生命週期、遊戲結果與派彩摘要。',
    primaryAction: '匯出注單',
    codeLabel: 'Bet ID',
    nameLabel: '注單編號',
    categoryLabel: '注單狀態',
    ownerLabel: '遊戲',
    metricLabel: '投注 / 派彩',
    detailBase: '/transactions/bets'
  },
  '/transactions': {
    path: '/transactions',
    title: '交易管理',
    eyebrow: '交易中心',
    description: '查詢 Wallet、投注、派彩、退款與調整交易。',
    primaryAction: '匯出交易',
    codeLabel: 'Transaction ID',
    nameLabel: '交易編號',
    categoryLabel: '交易類型',
    ownerLabel: '來源',
    metricLabel: '金額',
    detailBase: '/transactions/records'
  },
  '/risk': {
    path: '/risk',
    title: '風控中心',
    eyebrow: 'Risk Center',
    description: '集中檢視異常事件、規則命中與人工複核狀態。',
    primaryAction: '新增規則',
    codeLabel: 'Case ID',
    nameLabel: '風控事件',
    categoryLabel: '對象類型',
    ownerLabel: '偵測來源',
    metricLabel: '風險分數'
  },
  '/reports': {
    path: '/reports',
    title: '報表中心',
    eyebrow: 'Reports',
    description: '預留 GGR、RTP、投注、派彩與商戶營運報表。',
    primaryAction: '建立報表',
    codeLabel: 'Report ID',
    nameLabel: '報表任務',
    categoryLabel: '報表類型',
    ownerLabel: '資料來源',
    metricLabel: '資料區間'
  },
  '/settlements': {
    path: '/settlements',
    title: '結算管理',
    eyebrow: 'Settlements',
    description: '管理商戶結算週期、金額、覆核與關帳狀態。',
    primaryAction: '建立結算單',
    codeLabel: 'Settlement ID',
    nameLabel: '結算批次',
    categoryLabel: '結算週期',
    ownerLabel: '負責團隊',
    metricLabel: '結算金額'
  },
  '/integrations': {
    path: '/integrations',
    title: '串接管理',
    eyebrow: 'Integrations',
    description: '管理商戶 API、Wallet 模式、環境與健康狀態。',
    primaryAction: '新增串接',
    codeLabel: 'Integration ID',
    nameLabel: '串接名稱',
    categoryLabel: '串接模式',
    ownerLabel: '負責團隊',
    metricLabel: '健康狀態'
  },
  '/maintenance': {
    path: '/maintenance',
    title: '維護與公告',
    eyebrow: 'Maintenance & Notices',
    description: '管理維護窗口、發布通知與影響範圍。',
    primaryAction: '新增公告',
    codeLabel: 'Notice ID',
    nameLabel: '主旨',
    categoryLabel: '類型',
    ownerLabel: '發布團隊',
    metricLabel: '預估時間'
  },
  '/system': {
    path: '/system',
    title: '系統管理',
    eyebrow: 'System Management',
    description: '沿用原權限框架，預留使用者、角色與系統政策管理。',
    primaryAction: '新增角色',
    codeLabel: 'Policy ID',
    nameLabel: '名稱',
    categoryLabel: '類型',
    ownerLabel: '管理者',
    metricLabel: '權限摘要'
  }
}

const skeletonModule = (
  path: string,
  title: string,
  eyebrow: string,
  description: string,
  primaryAction: string
): BusinessModuleDefinition => ({
  path,
  title,
  eyebrow,
  description,
  primaryAction,
  codeLabel: 'Record ID',
  nameLabel: '名稱',
  categoryLabel: '類型',
  ownerLabel: '負責單位',
  metricLabel: '摘要'
})

Object.assign(businessModuleDefinitions, {
  '/jackpot-merchants': skeletonModule(
    '/jackpots/merchant-currencies',
    '商戶幣別設定',
    'Merchant Currency Overrides',
    '檢視商戶幣別沿用預設值或覆寫的 Jackpot 規則。',
    '新增覆寫設定'
  ),
  '/jackpot-ledger': skeletonModule(
    '/jackpots/ledger',
    '獎池流水',
    'Jackpot Ledger',
    '追蹤獎池注入、累積、派發與調整流水。',
    '匯出流水'
  ),
  '/jackpot-payouts': skeletonModule(
    '/jackpots/payouts',
    '派發紀錄',
    'Jackpot Payouts',
    '查詢中獎玩家、派發金額與處理結果。',
    '匯出紀錄'
  ),
  '/jackpot-adjustments': skeletonModule(
    '/jackpots/adjustments',
    'Jackpot 人工調整',
    'Jackpot Adjustments',
    '管理附理由、影響預覽與雙重審核的獎池調整申請。',
    '新增調整'
  ),
  '/risk-alerts': skeletonModule(
    '/risk/alerts',
    '告警列表',
    'Risk Alerts',
    '集中處理規則命中的即時告警。',
    '建立案件'
  ),
  '/risk-rules': skeletonModule(
    '/risk/rules',
    '風控規則',
    'Risk Rules',
    '管理告警條件、門檻與啟停狀態。',
    '新增規則'
  ),
  '/risk-cases': skeletonModule(
    '/risk/cases',
    '風控案件',
    'Risk Cases',
    '追蹤人工複核、處置與結案流程。',
    '建立案件'
  ),
  '/risk-whitelist': skeletonModule(
    '/risk/whitelist',
    '白名單',
    'Risk Whitelist',
    '管理有範圍、有效期與審核版本的風控白名單。',
    '新增白名單'
  ),
  '/report-agents': skeletonModule(
    '/reports/agents',
    '代理報表',
    'Agent Reports',
    '彙整代理層級的投注、派彩與 GGR。',
    '建立報表'
  ),
  '/report-merchants': skeletonModule(
    '/reports/merchants',
    '商戶報表',
    'Merchant Reports',
    '彙整商戶營運與收益表現。',
    '建立報表'
  ),
  '/report-games': skeletonModule(
    '/reports/games',
    '遊戲報表',
    'Game Reports',
    '比較遊戲投注、派彩、RTP 與活躍度。',
    '建立報表'
  ),
  '/report-players': skeletonModule(
    '/reports/players',
    '會員報表',
    '報表中心',
    '分析會員活躍、留存與投注表現。',
    '建立報表'
  ),
  '/report-rtp': skeletonModule(
    '/reports/rtp',
    'RTP 報表',
    'RTP Reports',
    '監控理論 RTP 與實際 RTP 偏移。',
    '建立報表'
  ),
  '/report-jackpots': skeletonModule(
    '/reports/jackpots',
    '獎池報表',
    '報表中心',
    '檢視獎池累積、派發與貢獻。',
    '建立報表'
  ),
  '/report-settlements': skeletonModule(
    '/reports/settlements',
    '結算報表',
    'Settlement Reports',
    '彙整週期結算與覆核狀態。',
    '建立報表'
  ),
  '/report-wallet': skeletonModule(
    '/reports/wallet',
    'Wallet／Transfer 報表',
    'Wallet Reports',
    '比較 Seamless 回傳或 Transfer Ledger、餘額與對帳差異。',
    '建立報表'
  ),
  '/round-replay': skeletonModule(
    '/bets/replay',
    'Round Replay',
    'Round Replay',
    '依 Round 時間軸還原投注、結果、版本與關聯交易。',
    '查詢 Round'
  ),
  '/wallet-transactions': skeletonModule(
    '/transactions/wallet',
    'Wallet／Transfer 交易',
    'Wallet Transactions',
    '依 Wallet Mode 查詢 Balance、Transfer In／Out 與對帳狀態。',
    '匯出交易'
  ),
  '/manual-transactions': skeletonModule(
    '/transactions/manual',
    '人工處理',
    'Manual Transactions',
    '管理退款、Rollback、補扣款與人工交易申請。',
    '新增申請'
  ),
  '/settlement-sheets': skeletonModule(
    '/settlements/sheets',
    '結算單',
    'Settlement Sheets',
    '按商戶幣別檢視結算口徑、快照、費率與審核狀態。',
    '產生結算單'
  ),
  '/wallet-reconciliation': skeletonModule(
    '/settlements/reconciliation',
    'Wallet 對帳',
    'Wallet Reconciliation',
    '核對 Seamless 結果或 Transfer Ledger、餘額與差異。',
    '建立對帳'
  ),
  '/settlement-adjustments': skeletonModule(
    '/settlements/adjustments',
    '調整項目',
    'Settlement Adjustments',
    '管理結算補扣款、附件、送審與取消流程。',
    '新增調整'
  ),
  '/integration-credentials': skeletonModule(
    '/integrations/credentials',
    'Credential 管理',
    'Credentials',
    '按商戶幣別與環境核發、輪替、撤銷及追蹤憑證。',
    '核發 Credential'
  ),
  '/integration-testing': skeletonModule(
    '/integrations/testing',
    '測試與驗收',
    'Integration Testing',
    '依 Wallet Mode 執行測試 Checklist 與正式上線申請。',
    '建立測試'
  ),
  '/integration-traces': skeletonModule(
    '/integrations/traces',
    '錯誤／Trace',
    'Integration Traces',
    '追蹤失敗請求、回應、Attempt 與關聯交易。',
    '匯出 Trace'
  ),
  '/integration-docs': skeletonModule(
    '/integrations/docs',
    '文件版本',
    'Documentation Versions',
    '管理 API Version、Endpoint、可見章節與生效時間。',
    '發布版本'
  ),
  '/notices': skeletonModule(
    '/maintenance/notices',
    '公告管理',
    'Notices',
    '管理內部與商戶公告、多語內容、對象與排程。',
    '新增公告'
  ),
  '/system-roles': skeletonModule(
    '/system/roles',
    '角色權限',
    'Roles & Permissions',
    '管理角色與功能權限範圍。',
    '新增角色'
  ),
  '/system-approvals': skeletonModule(
    '/system/approvals',
    '審核管理',
    'Approval Management',
    '管理敏感操作的申請、一級審核與執行狀態。',
    '新增審核申請'
  ),
  '/system-logs': skeletonModule(
    '/system/logs',
    '系統紀錄',
    'System Logs',
    '查詢操作、登入、審核與重要系統異常紀錄。',
    '匯出紀錄'
  ),
  '/system-currencies': skeletonModule(
    '/system/currencies',
    '幣別管理',
    'Currencies',
    '管理支援幣別與顯示精度。',
    '新增幣別'
  ),
  '/system-languages': skeletonModule(
    '/system/locales',
    '語系與地區',
    'Locales & Regions',
    '管理語系、國家／地區與時區主資料。',
    '新增語系或地區'
  ),
  '/system-settings': skeletonModule(
    '/system/settings',
    '系統設定',
    'System Settings',
    '管理共用平台參數與預設值。',
    '儲存設定'
  ),
  '/system-credential-policy': skeletonModule(
    '/system/credential-policy',
    'Wallet／Credential Policy',
    'Security Policy',
    '管理 Wallet 固定規則、Secret 顯示、輪替、到期與環境政策。',
    '發布政策'
  )
})

Object.assign(businessModuleDefinitions, {
  '/game-taxonomy': skeletonModule(
    '/games/taxonomy',
    '分類與標籤',
    '遊戲目錄',
    '管理遊戲分類、標籤、排序與前台篩選關聯。',
    '新增分類'
  ),
  '/risk-logs': skeletonModule(
    '/risk/processing-logs',
    '處理紀錄',
    '風控中心',
    '查詢告警、案件與人工處置的完整異動紀錄。',
    '匯出紀錄'
  ),
  '/report-transactions': skeletonModule(
    '/reports/transactions',
    '交易報表',
    '報表中心',
    '彙整下注、派彩、退款、錢包與轉帳交易指標。',
    '建立報表'
  ),
  '/merchant-reconciliation': skeletonModule(
    '/finance/merchant-reconciliation',
    '商戶對帳',
    '對帳／結算',
    '按商戶與結算週期核對交易、GGR、費率與差異。',
    '建立對帳'
  ),
  '/agent-reconciliation': skeletonModule(
    '/finance/agent-reconciliation',
    '代理對帳',
    '對帳／結算',
    '按代理關係與商務條件彙整商戶結算結果。',
    '建立對帳'
  ),
  '/reconciliation-differences': skeletonModule(
    '/finance/differences',
    '差異處理',
    '對帳／結算',
    '管理交易遺漏、重複、退款、Jackpot、匯率與商務條件差異。',
    '新增差異調整'
  ),
  '/merchant-settlement-sheets': skeletonModule(
    '/finance/merchant-statements',
    '商戶結算單',
    '對帳／結算',
    '依商戶查看原幣統計、匯率快照、結算計算與調整項目。',
    '產生商戶結算單'
  ),
  '/agent-settlement-sheets': skeletonModule(
    '/finance/agent-statements',
    '代理結算單',
    '對帳／結算',
    '依代理查看條件、旗下商戶價差、收益與最終結算金額。',
    '產生代理結算單'
  ),
  '/system-exchange-rates': skeletonModule(
    '/system/exchange-rates',
    '匯率管理',
    '系統管理',
    '管理結算換算匯率、來源、生效時間與審核紀錄。',
    '新增匯率'
  ),
  '/system-settlement-settings': skeletonModule(
    '/system/settlement-settings',
    '結算設定',
    '系統管理',
    '管理結算週期、截帳規則與共用預設值。',
    '新增設定'
  ),
  '/system-parameters': skeletonModule(
    '/system/parameters',
    '系統參數',
    '系統管理',
    '管理平台共用參數、錢包規則與憑證安全政策。',
    '新增參數'
  ),
  '/system-notifications': skeletonModule(
    '/system/notifications',
    '通知設定',
    '系統管理',
    '管理後台通知、對象、發布排程與已讀狀態。',
    '新增通知'
  )
})

const expandedSkeletonModules = [
  ['/game-taxonomy-types', '/games/taxonomy/types', '遊戲類型', '分類與標籤'],
  ['/game-taxonomy-features', '/games/taxonomy/features', '功能標籤', '分類與標籤'],
  ['/game-taxonomy-marketing', '/games/taxonomy/marketing', '行銷標籤', '分類與標籤'],
  ['/approvals-pending', '/approvals/pending', '待審核', '審核中心'],
  ['/approvals-approved', '/approvals/approved', '已通過', '審核中心'],
  ['/approvals-rejected', '/approvals/rejected', '已駁回', '審核中心'],
  ['/approvals-logs', '/approvals/logs', '審核紀錄', '審核中心'],
  [
    '/settlement-exchange-snapshots',
    '/finance/settlement/exchange-snapshots',
    '匯率快照',
    '結算管理'
  ],
  ['/settlement-adjustments', '/finance/settlement/adjustments', '調整項目', '結算管理'],
  ['/settlement-change-logs', '/finance/settlement/logs', '異動紀錄', '結算管理'],
  ['/report-game-performance', '/reports/games/performance', '遊戲表現', '遊戲報表'],
  ['/report-rtp', '/reports/games/rtp', 'RTP', '遊戲報表'],
  ['/report-merchants', '/reports/merchants/overview', '商戶', '商戶報表'],
  ['/report-merchant-lines', '/reports/merchants/lines', '商戶線路', '商戶報表'],
  ['/report-agents', '/reports/agents/overview', '代理', '代理報表'],
  ['/report-agent-merchants', '/reports/agents/merchants', '旗下商戶', '代理報表'],
  ['/report-bets', '/reports/transactions/bets', '注單統計', '交易報表'],
  ['/report-transactions', '/reports/transactions/records', '交易統計', '交易報表'],
  ['/report-merchant-settlements', '/reports/settlements/merchants', '商戶結算', '結算報表'],
  ['/report-agent-settlements', '/reports/settlements/agents', '代理結算', '結算報表'],
  ['/finance-currency-data', '/finance-settings/currencies/data', '幣別資料', '幣別管理'],
  [
    '/finance-transaction-currencies',
    '/finance-settings/currencies/transaction',
    '交易幣別',
    '幣別管理'
  ],
  [
    '/finance-settlement-currencies',
    '/finance-settings/currencies/settlement',
    '結算幣別',
    '幣別管理'
  ],
  ['/finance-currency-precision', '/finance-settings/currencies/precision', '精度設定', '幣別管理'],
  ['/finance-rates-daily', '/finance-settings/exchange-rates/daily', '每日匯率', '匯率管理'],
  ['/finance-rate-sources', '/finance-settings/exchange-rates/sources', '匯率來源', '匯率管理'],
  [
    '/finance-rate-adjustments',
    '/finance-settings/exchange-rates/adjustments',
    '匯率調整',
    '匯率管理'
  ],
  ['/finance-rate-history', '/finance-settings/exchange-rates/history', '歷史匯率', '匯率管理'],
  ['/finance-rate-alerts', '/finance-settings/exchange-rates/alerts', '匯率預警', '匯率管理'],
  ['/finance-rate-logs', '/finance-settings/exchange-rates/logs', '更新紀錄', '匯率管理'],
  [
    '/finance-default-settlement-currency',
    '/finance-settings/settlement/default-currency',
    '預設結算幣別',
    '結算設定'
  ],
  ['/finance-settlement-cycles', '/finance-settings/settlement/cycles', '結算週期', '結算設定'],
  [
    '/finance-settlement-rate-rules',
    '/finance-settings/settlement/rate-rules',
    '匯率取值規則',
    '結算設定'
  ],
  [
    '/finance-settlement-precision',
    '/finance-settings/settlement/precision',
    '金額精度',
    '結算設定'
  ],
  ['/finance-settlement-rounding', '/finance-settings/settlement/rounding', '捨入規則', '結算設定'],
  ['/platform-accounts', '/platform/access/accounts', '後台帳號', '帳號與權限'],
  ['/platform-roles', '/platform/access/roles', '角色管理', '帳號與權限'],
  ['/platform-permissions', '/platform/access/permissions', '操作權限', '帳號與權限'],
  ['/platform-sensitive-permissions', '/platform/access/sensitive', '敏感權限', '帳號與權限'],
  ['/platform-data-scopes', '/platform/access/data-scopes', '資料範圍', '帳號與權限'],
  ['/platform-languages', '/platform/locales/languages', '語系管理', '語系與地區'],
  ['/platform-regions', '/platform/locales/regions', '國家／地區', '語系與地區'],
  ['/platform-timezones', '/platform/locales/timezones', '時區管理', '語系與地區'],
  ['/platform-notification-rules', '/platform/notifications/rules', '通知規則', '通知管理'],
  ['/platform-notification-logs', '/platform/notifications/logs', '通知紀錄', '通知管理'],
  ['/platform-basic-settings', '/platform/parameters/basic', '系統基本設定', '系統參數'],
  ['/platform-login-security', '/platform/parameters/login-security', '登入安全', '系統參數'],
  ['/platform-operation-logs', '/platform/logs/operations', '操作紀錄', '系統紀錄'],
  ['/platform-login-logs', '/platform/logs/logins', '登入紀錄', '系統紀錄'],
  ['/platform-approval-logs', '/platform/logs/approvals', '審核紀錄', '系統紀錄'],
  ['/platform-error-logs', '/platform/logs/errors', '系統異常紀錄', '系統紀錄']
] as const

Object.assign(
  businessModuleDefinitions,
  Object.fromEntries(
    expandedSkeletonModules.map(([key, path, title, section]) => [
      key,
      skeletonModule(
        path,
        title,
        section,
        `依照總後台 PRD 管理${title}，目前提供可操作的前端頁面骨架與 Mock Data。`,
        title.includes('紀錄') || title.includes('報表') ? '匯出資料' : '新增資料'
      )
    ])
  )
)

businessModuleDefinitions['/risk-cases'].detailBase = '/risk/cases'
