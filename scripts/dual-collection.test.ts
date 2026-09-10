import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
})
const { useFinanceCenterStore } = await import('../src/store/modules/financeCenter')
for (const mode of ['AgentCollect', 'PlatformCollect'] as const) {
  setActivePinia(createPinia())
  const store = useFinanceCenterStore()
  const r = store.merchantReconciliations.find((r) => r.status === 'Pending Confirmation')!
  store.setCollectionMode(r.id, mode)
  if (mode === 'PlatformCollect')
    assert.throws(() => store.deliverReconciliation(r.id, 0, 0, '', true, r.collection!.payeeId))
  store.deliverReconciliation(
    r.id,
    0,
    10.99,
    '平台登錄代理實收',
    true,
    'PLATFORM',
    r.collection!.payeeId
  )
  assert.equal(r.delivery?.operatorId, 'PLATFORM')
  assert.equal(r.delivery?.actualCollectorId, r.collection!.payeeId)
  assert.equal(r.delivery?.actual, 10)
  assert.equal(r.status, 'Locked')
  assert.throws(() => store.deliverReconciliation(r.id, 0, 0, '', true))
  assert.throws(() => store.setCollectionMode(r.id, 'AgentCollect'))
}
console.log(
  'PASS platform access in both modes, agent readonly, collector audit and immutable lock'
)
for (const operator of ['PLATFORM', 'AGENT']) {
  for (const mode of ['AgentCollect', 'PlatformCollect'] as const) {
    setActivePinia(createPinia())
    const store = useFinanceCenterStore()
    const r = store.merchantReconciliations.find((r) => r.status === 'Pending Confirmation')!
    store.setCollectionMode(r.id, mode)
    const actor = operator === 'PLATFORM' ? 'PLATFORM' : r.collection!.payeeId
    assert.throws(() => store.deliverReconciliation(r.id, 0, 0, '', true, actor, 'UNRELATED'))
    if (operator === 'AGENT' && mode === 'PlatformCollect') {
      const before = JSON.stringify(r)
      assert.throws(() => store.deliverReconciliation(r.id, 0, 0, '', true, actor))
      assert.equal(JSON.stringify(r), before)
    } else {
      store.deliverReconciliation(r.id, 0, 0, '保留驗收', true, actor)
      assert.equal(r.delivery?.operatorId, actor)
      assert.equal(r.delivery?.actualCollectorId, actor)
      assert.throws(() => store.deliverReconciliation(r.id, 0, 0, '', true, 'PLATFORM'))
    }
  }
}
console.log('PASS complete role/mode matrix, rejected operation leaves record unchanged')
