import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
})
const { useAgentPortalStore, CURRENT_AGENT_ID } = await import('../src/store/modules/agentPortal')
import { useBusinessPartnerStore } from '../src/store/modules/businessPartner'
import { useFinanceCenterStore } from '../src/store/modules/financeCenter'
import {
  businessDate,
  validateGameTypeRates,
  describeGameTypeRates
} from '../src/utils/partnerTerms'
setActivePinia(createPinia())
const portal = useAgentPortalStore(),
  business = useBusinessPartnerStore(),
  finance = useFinanceCenterStore()
const rates = [
  { typeId: 'GT001', code: 'SLOT', name: '電子遊戲', percent: 5 },
  { typeId: 'GT002', code: 'LIVE', name: '真人遊戲', percent: 8 }
]
assert.equal(validateGameTypeRates(rates), '')
for (const bad of [
  [],
  [...rates, rates[0]],
  [{ ...rates[0], percent: 101 }],
  [{ ...rates[0], percent: NaN }],
  [{ ...rates[0], typeId: 'UNKNOWN' }]
])
  assert(validateGameTypeRates(bad))
const history = JSON.stringify([finance.agentReconciliations, finance.merchantReconciliations])
const conditions = {
  basis: 'GGR',
  percent: 0,
  gameTypeRates: rates,
  settlementCurrency: portal.settlementCurrencies[0],
  settlementCycle: 'Monthly',
  effectiveFrom: businessDate()
}
const child = portal.createChildAgent({
  parentId: CURRENT_AGENT_ID,
  name: '類型条件代理',
  conditions
})
assert(child.ok)
assert.deepEqual(business.getTerms(child.id!)[0].gameTypeRates, rates)
const merchant = portal.createDirectMerchant({
  code: 'QA-TYPED',
  name: '類型條件商戶',
  currency: portal.transactionCurrencies[0],
  walletMode: 'Seamless',
  conditions
})
assert(merchant.ok)
const original = business.getMerchantTerms(merchant.id!)[0]
assert.deepEqual(original.gameTypeRates, rates)
rates[0].percent = 7
assert.equal(original.gameTypeRates![0].percent, 5)
assert(
  portal.saveDirectMerchantTerm({
    ...conditions,
    targetId: merchant.id!,
    reason: '調整電子條件',
    effectiveFrom: '2099-01-01'
  }).ok
)
const latest = business.getMerchantTerms(merchant.id!)[0]
assert.equal(latest.status, 'Scheduled')
assert.equal(latest.gameTypeRates![0].percent, 7)
assert.equal(original.gameTypeRates![0].percent, 5)
assert(!describeGameTypeRates(latest).includes('全域'))
assert(describeGameTypeRates({ merchantTermPercent: 3 }).includes('歷史全域'))
const admin = business.addCommercialTerm(child.id!, {
  settlementBasis: 'GGR',
  ratePercent: 0,
  gameTypeRates: rates,
  settlementCurrency: 'USD',
  settlementCycle: 'Monthly',
  effectiveFrom: '2099-02-01',
  reason: '總後台版本'
})
rates[0].percent = 9
assert.equal(admin.gameTypeRates![0].percent, 7)
assert.equal(
  JSON.stringify([finance.agentReconciliations, finance.merchantReconciliations]),
  history
)
console.log(
  'PASS typed GGR validation, direct child/merchant creation, scheduled version, input isolation and immutable financial history'
)

business.activateCommercialTerm(admin.id, '確認未來版本')
assert.equal(admin.status, 'Scheduled')
assert.equal(business.getTerms(child.id!).find((t) => t.status === 'Active')?.version, 1)
console.log('PASS future admin version remains scheduled')
