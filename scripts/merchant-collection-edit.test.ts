import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
Object.defineProperty(globalThis, 'localStorage', {
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
})
const { useBusinessPartnerStore } = await import('../src/store/modules/businessPartner')
const { useFinanceCenterStore } = await import('../src/store/modules/financeCenter')
setActivePinia(createPinia())
const business = useBusinessPartnerStore(),
  finance = useFinanceCenterStore()
const record = finance.merchantReconciliations[0]
const snapshot = JSON.stringify(record)
for (const mode of ['PlatformCollect', 'AgentCollect'] as const) {
  business.updateMerchant(
    record.merchantId,
    { collectionMode: mode },
    'Verify merchant default edit'
  )
  assert.equal(business.merchants.find((m) => m.id === record.merchantId)?.collectionMode, mode)
  assert.equal(JSON.stringify(record), snapshot)
}
console.log(
  'PASS merchant mode edits persist in shared store without rewriting existing statements'
)
