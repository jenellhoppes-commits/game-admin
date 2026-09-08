import type { AppRouteRecord } from '@/types/router'

const stagePage = '/partner-portals/stage-page'

const child = (
  path: string,
  name: string,
  title: string,
  icon: string,
  phase: '第二階段' | '第三階段',
  description: string,
  component = stagePage
): AppRouteRecord => ({
  path,
  name,
  component,
  meta: { title, icon, keepAlive: false, phase, description }
})

export const partnerPortalRoutes: AppRouteRecord[] = [
  {
    path: '/agent',
    name: 'AgentPortal',
    component: '/index/index',
    redirect: '/agent/dashboard',
    meta: {
      title: '代理後台',
      icon: 'ri:organization-chart',
      menuGroup: '代理作業',
      roles: ['R_AGENT']
    },
    children: [
      child(
        'dashboard',
        'AgentDashboard',
        '儀錶板',
        'ri:dashboard-3-line',
        '第二階段',
        '代理營運摘要與待辦',
        '/partner-portals/agent/dashboard'
      ),
      child(
        'relationships',
        'AgentRelationships',
        '代理關係',
        'ri:node-tree',
        '第二階段',
        '授權後代 L1–L3 關係與範圍',
        '/partner-portals/agent/relationships'
      ),
      child(
        'merchants',
        'AgentMerchants',
        '商戶管理',
        'ri:store-2-line',
        '第二階段',
        '僅顯示授權範圍內商戶彙總',
        '/partner-portals/agent/merchants'
      ),
      {
        path: 'business-terms',
        name: 'AgentBusinessTerms',
        redirect: '/agent/relationships',
        meta: { title: '商務條件', isHide: true }
      },
      child(
        'reports/operations',
        'AgentOperationsReport',
        '代理報表',
        'ri:bar-chart-box-line',
        '第二階段',
        '依代理層級與幣別查看彙總',
        '/partner-portals/agent/reports'
      ),
      child(
        'reports/exchange-rates',
        'AgentExchangeReport',
        '匯率報表',
        'ri:exchange-dollar-line',
        '第二階段',
        '查詢正式適用與歷史快照',
        '/partner-portals/agent/exchange-rates'
      ),
      {
        path: 'merchants/:id',
        name: 'AgentPortalMerchantDetail',
        component: '/partner-portals/agent/merchants/detail',
        meta: { title: '商戶摘要', isHide: true, activePath: '/agent/merchants', keepAlive: false }
      },
      {
        path: 'reports/exchange-rates/:id',
        name: 'AgentPortalRateDetail',
        component: '/partner-portals/agent/exchange-rates',
        meta: {
          title: '匯率快照',
          isHide: true,
          activePath: '/agent/reports/exchange-rates',
          keepAlive: false
        }
      },
      {
        path: 'exchange-rates',
        name: 'AgentPortalRateAlias',
        component: '/partner-portals/agent/exchange-rates',
        redirect: '/agent/reports/exchange-rates',
        meta: { title: '匯率報表', isHide: true }
      },
      child(
        'reconciliation',
        'AgentReconciliation',
        '對帳／結算',
        'ri:calculator-line',
        '第二階段',
        '僅能查看及確認自己的對帳單',
        '/partner-portals/agent/reconciliation'
      ),
      child(
        'notifications',
        'AgentNotifications',
        '公告通知',
        'ri:notification-3-line',
        '第二階段',
        '平台公告及通知閱讀',
        '/partner-portals/agent/notifications'
      ),
      child(
        'access',
        'AgentAccess',
        '帳號與權限',
        'ri:shield-user-line',
        '第二階段',
        '代理組織內帳號與授權範圍',
        '/partner-portals/agent/access'
      )
    ]
  },
  {
    path: '/merchant',
    name: 'MerchantPortal',
    component: '/index/index',
    redirect: '/merchant/dashboard',
    meta: {
      title: '商戶後台',
      icon: 'ri:store-2-line',
      menuGroup: '商戶作業',
      roles: ['R_MERCHANT']
    },
    children: [
      child(
        'dashboard',
        'MerchantDashboard',
        '儀錶板',
        'ri:dashboard-3-line',
        '第三階段',
        '商戶營運摘要與待辦',
        '/partner-portals/merchant/reports'
      ),
      child(
        'games',
        'MerchantGames',
        '遊戲中心',
        'ri:gamepad-line',
        '第三階段',
        '已授權線路可用遊戲',
        '/partner-portals/merchant/commerce'
      ),
      child(
        'lines',
        'MerchantLines',
        '線路管理',
        'ri:route-line',
        '第三階段',
        '本商戶已授權線路',
        '/partner-portals/merchant/commerce'
      ),
      child(
        'integrations',
        'MerchantIntegrations',
        '串接中心',
        'ri:plug-line',
        '第三階段',
        '商戶串接狀態與文件',
        '/partner-portals/merchant/commerce'
      ),
      child(
        'members',
        'MerchantMembers',
        '會員中心',
        'ri:user-search-line',
        '第三階段',
        '本商戶會員作業',
        '/partner-portals/merchant/transactions'
      ),
      child(
        'transactions',
        'MerchantTransactions',
        '交易中心',
        'ri:exchange-funds-line',
        '第三階段',
        '本商戶交易與注單作業',
        '/partner-portals/merchant/transactions'
      ),
      child(
        'jackpots',
        'MerchantJackpots',
        '獎池',
        'ri:funds-box-line',
        '第三階段',
        '已授權獎池彙總',
        '/partner-portals/merchant/operations'
      ),
      child(
        'reports/operations',
        'MerchantOperationsReport',
        '營運報表',
        'ri:bar-chart-box-line',
        '第三階段',
        '本商戶、原幣別營運彙總',
        '/partner-portals/merchant/reports'
      ),
      child(
        'reports/exchange-rates',
        'MerchantExchangeReport',
        '匯率報表',
        'ri:exchange-dollar-line',
        '第三階段',
        '查詢正式適用與歷史快照',
        '/partner-portals/merchant/operations'
      ),
      child(
        'reconciliation',
        'MerchantReconciliation',
        '對帳／結算',
        'ri:calculator-line',
        '第三階段',
        '僅能查看及確認自己的對帳單',
        '/partner-portals/merchant/operations'
      ),
      child(
        'notifications',
        'MerchantNotifications',
        '公告通知',
        'ri:notification-3-line',
        '第三階段',
        '平台公告及通知閱讀',
        '/partner-portals/merchant/operations'
      ),
      child(
        'access',
        'MerchantAccess',
        '帳號與權限',
        'ri:shield-user-line',
        '第三階段',
        '商戶內帳號與授權範圍',
        '/partner-portals/merchant/operations'
      )
    ]
  }
]
