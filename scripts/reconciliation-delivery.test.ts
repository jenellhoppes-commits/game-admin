import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { calculateDelivery } from '../src/utils/reconciliationDelivery'
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
})
assert.deepEqual(calculateDelivery(1000, -100, 600, '核帳調整', true), {
  adjusted: 900,
  remaining: 300,
  carried: 300,
  paymentStatus: 'Carried'
})
assert.equal(calculateDelivery(1000, 0, 600, '', false).paymentStatus, 'Partial')
assert.equal(calculateDelivery(1000, 100, 1100, '補計', false).paymentStatus, 'Paid')
assert.equal(calculateDelivery(1000, 0, 0, '', false).paymentStatus, 'Unpaid')
assert.equal(calculateDelivery(1000.99, 0, 1000.99, '', true).carried, 0.99)
assert.equal(calculateDelivery(1000, 0, 600.99, '', false).remaining, 400)
assert.equal(calculateDelivery(-500, 0, 0, '', false).remaining, 0)
assert.throws(() => calculateDelivery(100, 1, 0, '', false))
assert.throws(() => calculateDelivery(100, 0, 101, '', false))
assert.throws(() => calculateDelivery(100, NaN, 0, '', false))
const { useFinanceCenterStore } = await import('../src/store/modules/financeCenter')
setActivePinia(createPinia())
const store = useFinanceCenterStore()
const record = store.merchantReconciliations.find((r) => r.status === 'Pending Confirmation')!
const amount = record.finalSettlementAmount
const oldDifferences = store.differences.length
deliver(record.id, 10, 0, '財務核對補計', true)
assert.equal(record.status, 'Locked')
assert.equal(record.finalSettlementAmount, amount)
assert.equal(
  record.delivery?.adjusted,
  Number((amount + 10).toFixed(record.snapshot.amountPrecision))
)
assert.equal(store.differences.length, oldDifferences)
assert.throws(() => deliver(record.id, 0, 0, '', false))
const diff = store.differences.find((d) => d.reconciliationId === record.id)
if (diff) assert.equal(store.resolveDifference(diff.id, 'Create Adjustment', '不可改原單'), false)
const original = JSON.stringify(record)
const target = {
  ...structuredClone(JSON.parse(original)),
  id: 'TEST-NEXT',
  period: '2027-01',
  periodStart: '2027-01-01',
  periodEnd: '2027-01-31',
  status: 'Pending Confirmation' as const,
  delivery: undefined,
  priorCorrections: []
}
store.merchantReconciliations.push(target)
store.addPriorCorrection(record.id, target.id, -20, '上期退款')
assert.equal(JSON.stringify(record), original)
assert.equal(store.findMerchantReconciliation(target.id)?.priorCorrections?.[0].amount, -20)
deliver(target.id, 0, 0, '', true)
assert.equal(
  store.findMerchantReconciliation(target.id)?.delivery?.adjusted,
  Number((amount - 20).toFixed(record.snapshot.amountPrecision))
)
assert.throws(() => store.addPriorCorrection(record.id, target.id, 10, '不可改鎖定目標'))
for (const mode of ['清零', '累積']) {
  const r = store.merchantReconciliations.find((r) => !['Locked', 'Cancelled'].includes(r.status))!
  r.ggr = -100
  r.finalSettlementAmount = -5
  r.settlementMode = mode
  deliver(r.id, 0, 0, '', true)
  assert.equal(r.delivery?.nextGgr, mode === '累積' ? -100 : 0)
  assert.equal(r.delivery?.actual, 0)
}
console.log(
  'PASS manual adjustments, partial payment, retention, immutable lock, negative GGR policies'
)

function deliver(id: string, adjustment: number, actual: number, reason: string, retain: boolean) {
  const r = store.findMerchantReconciliation(id) || store.findAgentReconciliation(id)
  return store.deliverReconciliation(id, adjustment, actual, reason, retain, r?.collection?.payeeId)
}
