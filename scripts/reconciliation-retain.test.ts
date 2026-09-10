import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
})
const { useFinanceCenterStore } = await import('../src/store/modules/financeCenter')
setActivePinia(createPinia())
const store = useFinanceCenterStore()
for (const mode of ['清零', '累積']) {
  const record = store.merchantReconciliations.find(
    (r) => r.status === 'Pending Confirmation' && !r.unresolvedDifferenceCount
  )!
  assert(record)
  record.settlementMode = mode
  const original = record.finalSettlementAmount
  const adjustment = record.adjustmentAmount
  const differences = store.differences.length
  assert.equal(store.retainReconciliation(record.id, '留到下期'), true)
  assert.equal(record.finalSettlementAmount, original)
  assert.equal(record.retainedSettlementAmount, original)
  assert.equal(record.actualSettlementAmount, 0)
  assert.equal(record.adjustmentAmount, adjustment)
  assert.equal(store.differences.length, differences)
  assert.equal(record.status, 'Confirmed')
  assert.equal(store.retainReconciliation(record.id), false)
  assert.equal(store.confirmMerchant(record.id), false)
}
const blocked = store.merchantReconciliations.find((r) => r.unresolvedDifferenceCount > 0)!
assert.equal(store.retainReconciliation(blocked.id), false)
const agent = store.agentReconciliations[0]
agent.status = 'Pending Confirmation'
agent.unresolvedDifferenceCount = 0
const included = store.getIncludedMerchantReconciliations(agent)
included[0].status = 'Pending Confirmation'
assert.equal(store.retainReconciliation(agent.id), false)
included.forEach((r) => {
  r.status = 'Confirmed'
})
assert.equal(store.retainReconciliation(agent.id), true)
assert.equal(store.retainReconciliation(agent.id), false)
console.log(
  'PASS retention preserves payable, does not create rounding adjustments, blocks differences and repeat submissions'
)
