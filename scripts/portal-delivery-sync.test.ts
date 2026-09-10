import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
})
const { useFinanceCenterStore } = await import('../src/store/modules/financeCenter')
const { useAgentPortalStore } = await import('../src/store/modules/agentPortal')
const { useMerchantPortalStore } = await import('../src/store/modules/merchantPortal')
setActivePinia(createPinia())
const finance = useFinanceCenterStore(),
  agent = useAgentPortalStore(),
  merchant = useMerchantPortalStore()
const m = finance.merchantReconciliations.find(
  (r) => r.merchantId === 'M00001' && r.status === 'Pending Confirmation'
)!
m.finalSettlementAmount = 1000.99
assert.throws(() => finance.deliverReconciliation(m.id, 0, 0, '', true, 'A99999'), /代理僅可/)
assert.equal(m.collection?.platformReceivable, false)
deliver(m.id, 10, 600.99, '驗收調整', true)
const external = merchant.reconciliations.find((r) => r.id === m.id)!
assert.equal(external.status, 'Locked')
assert.deepEqual(external.delivery, m.delivery)
assert.equal(external.delivery?.actual, 600)
assert.equal(external.delivery?.carried, 410.99)
const a = finance.agentReconciliations.find((r) => r.agentId === 'A00001' && r.status !== 'Locked')!
a.finalSettlementAmount = 2000.99
assert.equal(a.collection?.payeeId, 'PLATFORM')
deliver(a.id, 0, 2000.99, '', true)
assert.deepEqual(agent.ownReconciliations.find((r) => r.id === a.id)?.delivery, a.delivery)
assert.equal(a.delivery?.actual, 2000)
assert.equal(a.delivery?.carried, 0.99)
assert(
  merchant.reconciliations.every(
    (r) => finance.findMerchantReconciliation(r.id)?.merchantId === 'M00001'
  )
)
assert(agent.ownReconciliations.every((r) => r.agentId === 'A00001'))
console.log('PASS shared delivery, integer payment, carry balance and role scope')

function deliver(id: string, adjustment: number, actual: number, reason: string, retain: boolean) {
  const r = finance.findMerchantReconciliation(id) || finance.findAgentReconciliation(id)
  return finance.deliverReconciliation(
    id,
    adjustment,
    actual,
    reason,
    retain,
    r?.collection?.payeeId
  )
}
