import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useMerchantPortalStore } from '../src/store/modules/merchantPortal'
import { useBusinessPartnerStore } from '../src/store/modules/businessPartner'
import { useGameCatalogStore } from '../src/store/modules/gameCatalog'
import { useApprovalCenterStore } from '../src/store/modules/approvalCenter'
import { useTransactionCenterStore } from '../src/store/modules/transactionCenter'
setActivePinia(createPinia())
const portal = useMerchantPortalStore(),
  business = useBusinessPartnerStore(),
  catalog = useGameCatalogStore(),
  approval = useApprovalCenterStore()
const merchant = business.findMerchant('M00001')!
const config = portal.configurations.find(
  (c) => portal.availableLimitPlans(c.lineUid, c.gameId).length
)!
const plan = portal.availableLimitPlans(config.lineUid, config.gameId)[0]
const previousLimit = business
  .getMerchantLineGameConfigurations(config.lineUid)
  .find((c) => c.gameId === config.gameId)!.limitPlan
const masterBefore = JSON.stringify(catalog.games)
const transactionsBefore = JSON.stringify(useTransactionCenterStore().bets)
assert(portal.setLimitPlan(config.lineUid, config.gameId, plan.id).ok)
assert.equal(
  business.getMerchantLineGameConfigurations(config.lineUid).find((c) => c.gameId === config.gameId)
    ?.limitPlan,
  plan.id
)
assert.equal(portal.configurations.find((c) => c.id === config.id)?.limitPlan, plan.name)
assert.equal(portal.setLimitPlan('foreign-line', config.gameId, plan.id).ok, false)
assert.equal(portal.setLimitPlan(config.lineUid, config.gameId, 'invented').ok, false)
plan.status = 'Disabled'
assert.equal(portal.setLimitPlan(config.lineUid, config.gameId, plan.id).ok, false)
assert.equal(JSON.stringify(catalog.games), masterBefore)
assert.equal(JSON.stringify(useTransactionCenterStore().bets), transactionsBefore)
assert(portal.limitLogs.length > 0)
const audit = business.getMerchantAuditLogs('M00001').find((a) => a.action === '更新線路遊戲配置')!
assert.equal(JSON.parse(audit.before!).limitPlan, previousLimit)
assert.equal(JSON.parse(audit.after!).limitPlan, plan.id)
// Revoking authorization hides current operations without erasing historical data.
const grant = business
  .getMerchantGameConfigurations('M00001')
  .find((c) => c.gameId === config.gameId)!
const history = JSON.stringify(useTransactionCenterStore().bets)
business.updateMerchantGameConfiguration(
  'M00001',
  config.gameId,
  { enabled: false },
  '驗證取消授權'
)
assert(!portal.games.some((g) => g.id === config.gameId))
assert(!portal.configurations.some((c) => c.gameId === config.gameId))
assert.equal(portal.availableLimitPlans(config.lineUid, config.gameId).length, 0)
assert.equal(portal.setLimitPlan(config.lineUid, config.gameId, plan.id).ok, false)
assert.equal(JSON.stringify(useTransactionCenterStore().bets), history)
business.updateMerchantGameConfiguration('M00001', config.gameId, { enabled: true }, '恢復授權')
assert(portal.closePlatformGame(config.gameId).ok)
assert.equal(grant.enabled, true)
assert(portal.games.some((g) => g.id === config.gameId && !g.enabled))
business.updateMerchantGameConfiguration(
  'M00001',
  config.gameId,
  { rtpPlanName: grant.rtpPlanName },
  '更新 RTP'
)
assert(
  business
    .getMerchantLineGameConfigurations(config.lineUid)
    .filter((c) => c.gameId === config.gameId)
    .every((c) => !c.enabled)
)
const currency = portal.availableCurrencies.find(
  (c) => !merchant.lines.some((l) => l.currency === c)
)!
const count = merchant.lines.length
const request = portal.submitLineApplication(currency, '示範申請幣別線路')
assert(request.ok)
assert.equal(merchant.lines.length, count)
assert.equal(portal.submitLineApplication(currency, '重複幣別申請').ok, false)
assert(approval.review(request.id!, true, '符合開通規格'))
assert.equal(merchant.lines.length, count + 1)
assert(portal.lines.some((l) => l.currency === currency))
assert.equal(approval.review(request.id!, true, '再次核准測試'), false)
assert.equal(portal.lineApplications[0].execution, '已建立線路')
assert.equal(portal.submitLineApplication('UNKNOWN', '錯誤幣別申請').ok, false)
// The first line must remain requestable when a merchant has no lines.
merchant.lines = []
const first = portal.submitLineApplication('USD', '首條線路申請測試')
assert(first.ok)
const status = merchant.status
assert(approval.review(first.id!, false, '資料需要補充'))
assert.equal(merchant.lines.length, 0)
assert.equal(merchant.status, status)
assert(portal.submitLineApplication('USD', '補齊後重新申請').ok)
console.log(
  'PASS shared plans, scope, disabled plans, immutable history, currency review, duplicates, rejection and first-line application'
)
