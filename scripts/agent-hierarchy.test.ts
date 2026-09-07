import { createPinia, setActivePinia } from 'pinia'
import { useBusinessPartnerStore } from '../src/store/modules/businessPartner'
import type { AgentLevel, NewAgentPayload } from '../src/types/game-provider'

setActivePinia(createPinia())
const store = useBusinessPartnerStore()

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const payload = (code: string, level: AgentLevel, parentAgentId?: string): NewAgentPayload => ({
  code,
  name: code,
  level,
  parentAgentId,
  contact: 'Audit',
  contactMethod: 'audit@example.com',
  cooperationStartDate: '2026-09-05',
  settlementBasis: 'GGR',
  ratePercent: 1,
  settlementCurrency: 'USDT',
  settlementCycle: 'Monthly',
  effectiveFrom: '2026-09-05'
})

const l1 = store.agents.find((agent) => agent.level === 'L1')!
const l2 = store.agents.find((agent) => agent.level === 'L2')!
const l3 = store.agents.find((agent) => agent.level === 'L3')!
const originalCount = store.agents.length

assert(!store.createAgent(payload('INVALID-L1-PARENT', 'L1', l1.id)), 'L1 不得設定上級')
assert(!store.createAgent(payload('INVALID-L2-MISSING', 'L2')), 'L2 必須設定上級')
assert(!store.createAgent(payload('INVALID-L2-LEVEL', 'L2', l2.id)), 'L2 只能隸屬 L1')
assert(!store.createAgent(payload('INVALID-L3-MISSING', 'L3')), 'L3 必須設定上級')
assert(!store.createAgent(payload('INVALID-L3-LEVEL', 'L3', l1.id)), 'L3 只能隸屬 L2')
assert(!store.createAgent(payload('INVALID-PARENT', 'L2', 'A99999')), '不存在的上級必須拒絕')
assert(store.agents.length === originalCount, '非法建立不得改動代理資料')

const valid = store.createAgent(payload('VALID-L3', 'L3', l2.id))
assert(valid?.parentAgentId === l2.id, '合法 L3 建立應成功')

const beforeUpdate = JSON.stringify(l3)
assert(store.updateAgent(l3.id, { parentAgentId: l1.id }, '非法跨級測試') === false, '更新不得跨級')
assert(JSON.stringify(l3) === beforeUpdate, '非法更新不得改動代理資料')

console.log('agent hierarchy regression tests passed')
