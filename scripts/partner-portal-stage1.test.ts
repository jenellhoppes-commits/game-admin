import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getPortalHome,
  isDemoAccountAllowedForPortal,
  isPortalPathAllowed,
  resolvePortalRedirect
} from '../src/config/partner-portals'
import { partnerPortalRoutes } from '../src/router/modules/partnerPortals'

const agentRoles = ['R_AGENT']
const merchantRoles = ['R_MERCHANT']
const adminRoles = ['R_SUPER']
const secondaryAdminRoles = ['R_ADMIN']
const unknownRoles = ['R_UNKNOWN']
const legacyUserRoles = ['R_USER']

assert.equal(getPortalHome(adminRoles), '/dashboard')
assert.equal(getPortalHome(secondaryAdminRoles), '/dashboard')
assert.equal(getPortalHome(agentRoles), '/agent/dashboard')
assert.equal(getPortalHome(merchantRoles), '/merchant/dashboard')
assert.equal(getPortalHome([]), null)
assert.equal(getPortalHome(unknownRoles), null)
assert.equal(getPortalHome(legacyUserRoles), null)
assert.equal(getPortalHome(['R_SUPER', 'R_UNKNOWN']), null)
assert.equal(getPortalHome(['R_SUPER', 'R_AGENT']), null)

assert.equal(isPortalPathAllowed('/agent/reconciliation', agentRoles), true)
assert.equal(isPortalPathAllowed('/merchant/reconciliation', agentRoles), false)
assert.equal(isPortalPathAllowed('/dashboard', agentRoles), false)
assert.equal(isPortalPathAllowed('/merchant/games', merchantRoles), true)
assert.equal(isPortalPathAllowed('/agent/merchants', merchantRoles), false)
assert.equal(isPortalPathAllowed('/dashboard', merchantRoles), false)
assert.equal(isPortalPathAllowed('/dashboard', adminRoles), true)
assert.equal(isPortalPathAllowed('/agent/dashboard', adminRoles), false)
assert.equal(isPortalPathAllowed('/merchant/dashboard', adminRoles), false)
assert.equal(isPortalPathAllowed('/dashboard', []), false)
assert.equal(isPortalPathAllowed('/dashboard', unknownRoles), false)
assert.equal(isPortalPathAllowed('/dashboard', legacyUserRoles), false)
assert.equal(isPortalPathAllowed('/403', unknownRoles), true)
assert.equal(isPortalPathAllowed('/auth/login', []), true)

assert.equal(resolvePortalRedirect('/dashboard', 'agent'), '/agent/dashboard')
assert.equal(
  resolvePortalRedirect('/agent/reports/operations', 'agent'),
  '/agent/reports/operations'
)
assert.equal(resolvePortalRedirect('/agent/dashboard', 'merchant'), '/merchant/dashboard')

assert.equal(isDemoAccountAllowedForPortal('Super', 'admin'), true)
assert.equal(isDemoAccountAllowedForPortal('Admin', 'admin'), true)
assert.equal(isDemoAccountAllowedForPortal('Agent', 'agent'), true)
assert.equal(isDemoAccountAllowedForPortal('Merchant', 'merchant'), true)
assert.equal(isDemoAccountAllowedForPortal('Merchant', 'agent'), false)
assert.equal(isDemoAccountAllowedForPortal('Agent', 'merchant'), false)

const agentRoute = partnerPortalRoutes.find((route) => route.path === '/agent')
const merchantRoute = partnerPortalRoutes.find((route) => route.path === '/merchant')
assert.deepEqual(
  agentRoute?.children?.filter((route) => !route.meta.isHide).map((route) => route.meta.title),
  [
    '儀錶板',
    '代理關係',
    '商戶管理',
    '代理報表',
    '匯率報表',
    '對帳／結算',
    '公告通知',
    '帳號與權限'
  ]
)
assert.deepEqual(
  merchantRoute?.children?.map((route) => route.meta.title),
  [
    '儀錶板',
    '遊戲中心',
    '線路管理',
    '串接中心',
    '會員中心',
    '交易中心',
    '獎池',
    '營運報表',
    '匯率報表',
    '對帳／結算',
    '公告通知',
    '帳號與權限'
  ]
)

const adminRoutes = readFileSync('src/router/modules/gameProvider.ts', 'utf8')
assert.match(adminRoutes, /redirect: '\/finance\/reconciliation\/agents'/)
assert.doesNotMatch(adminRoutes, /reconciliation\/suppliers|供應商對帳/)
for (const route of ['/dashboard', '/games', '/business', '/transactions', '/finance']) {
  assert.match(adminRoutes, new RegExp(`path: '${route.replace('/', '\\/')}'`))
}

const logoutSource = readFileSync('src/store/modules/user.ts', 'utf8')
assert.match(logoutSource, /useWorktabStore\(\)\.clearAll\(\)/)
assert.match(logoutSource, /localStorage\.removeItem\('game-provider-demo-user'\)/)

const authSource = readFileSync('src/api/auth.ts', 'utf8')
assert.doesNotMatch(authSource, /localUsers\[key\] \|\| localUsers\.super/)
assert.doesNotMatch(authSource, /roles: \['R_USER'\]/)
assert.match(authSource, /throw new HttpError\('登入身分已失效，請重新登入'/)

const guardSource = readFileSync('src/router/guards/beforeEach.ts', 'utf8')
assert.match(guardSource, /if \(userStore\.isLogin\) \{[\s\S]*?const portalHome/)
assert.match(guardSource, /if \(!portalHome\) \{[\s\S]*?userStore\.logOut\(false\)/)
assert.match(guardSource, /next\(\{ name: 'Login', replace: true \}\)/)

console.log('partner portal stage 1 navigation and isolation checks passed')
