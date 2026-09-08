import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { createApp } from 'vue'
import { createPersistedState } from 'pinia-plugin-persistedstate'
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
    clear: () => memory.clear()
  }
})
const { useAgentPortalStore, CURRENT_AGENT_ID } = await import('../src/store/modules/agentPortal')
import { useBusinessPartnerStore } from '../src/store/modules/businessPartner'
import { useFinanceCenterStore } from '../src/store/modules/financeCenter'
function freshPinia() {
  const pinia = createPinia()
  pinia.use(createPersistedState({ storage: globalThis.localStorage }))
  createApp({}).use(pinia)
  setActivePinia(pinia)
}
freshPinia()
const store = useAgentPortalStore(),
  business = useBusinessPartnerStore(),
  finance = useFinanceCenterStore()
const requests = store.requests.length,
  history = JSON.stringify(finance.agentReconciliations)
const outside = business.agents.find((a) => !store.visibleAgentIds.has(a.id))
if (outside) assert.equal(store.createChildAgent({ parentId: outside.id, name: 'Out' }).ok, false)
const l3 = store.visibleAgents.find((a) => a.level === 'L3')!
assert.equal(store.createChildAgent({ parentId: l3.id, name: 'Too deep' }).ok, false)
const child = store.createChildAgent({ parentId: CURRENT_AGENT_ID, name: 'Direct QA Child' })
assert.equal(child.ok, true)
assert(store.directChildren.some((a) => a.id === child.id))
assert.equal(
  store.createChildAgent({ parentId: CURRENT_AGENT_ID, name: 'Direct QA Child' }).ok,
  false
)
const input = {
  targetId: CURRENT_AGENT_ID,
  basis: 'GGR',
  percent: 3,
  effectiveFrom: '2026-10-01',
  reason: '驗證直接修改'
}
assert.equal(store.saveDirectChildTerm(input).ok, false)
assert.equal(store.saveDirectChildTerm({ ...input, targetId: l3.id }).ok, false)
assert.equal(store.saveDirectChildTerm({ ...input, targetId: child.id!, percent: 101 }).ok, false)
const older = JSON.stringify(business.commercialTerms)
assert(store.saveDirectChildTerm({ ...input, targetId: child.id! }).ok)
assert.equal(JSON.stringify(business.commercialTerms.slice(1)), older)
assert.equal(business.getTerms(child.id!)[0].status, 'Draft')
const term = store.merchantTermOptions[0]
assert(term, 'must have an authorized active merchant term')
const payload = {
  code: 'QA-DIRECT-MER',
  name: 'QA Direct Merchant',
  currency: store.visibleCurrencies[0],
  termId: term.id,
  walletMode: 'Transfer',
  reason: ''
}
assert.equal(store.createDirectMerchant({ ...payload, termId: 'forged' }).ok, false)
assert.equal(store.createDirectMerchant({ ...payload, walletMode: '' }).ok, false)
const result = store.createDirectMerchant(payload)
assert.equal(result.ok, true)
const merchant = business.findMerchant(result.id!)!
assert.equal(merchant.agentId, CURRENT_AGENT_ID)
assert.equal(merchant.walletMode, 'Transfer')
assert.equal(merchant.lines.length, 0)
assert.equal(merchant.requestedCurrency, payload.currency)
assert.equal(store.createDirectMerchant(payload).ok, false)
assert.equal(store.requests.length, requests)
assert.equal(JSON.stringify(finance.agentReconciliations), history)
assert(store.logs.some((log) => log.action === '直接新增商戶'))
console.log(
  'PASS direct creation, term/wallet validation, hierarchy/scope, duplicate prevention, new versions, unchanged history and no applications'
)

business.$persist()
freshPinia()
const restored = useBusinessPartnerStore()
assert(restored.findMerchant(result.id!), 'merchant survives reload')
assert(restored.findAgent(child.id!), 'agent survives reload')
assert.equal(restored.getTerms(child.id!)[0].status, 'Draft')
console.log('PASS persisted new records and term versions')
