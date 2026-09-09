import assert from 'node:assert/strict'
import { closeCarry } from '../src/utils/settlementCarry'
const base = {
  mode: '累積' as const,
  previousGgr: 0,
  currentGgr: -100000,
  previousPayable: 0,
  percent: 5
}
const first = closeCarry(base, 'retain')
assert.equal(first.nextGgr, -100000)
const second = closeCarry({ ...base, previousGgr: first.nextGgr, currentGgr: 60000 }, 'retain')
assert.equal(second.nextGgr, -40000)
const third = closeCarry({ ...base, previousGgr: second.nextGgr, currentGgr: 140000 }, 'retain')
assert.equal(third.newPayable, 5000)
assert.equal(third.nextPayable, 5000)
const fourth = closeCarry(
  { ...base, previousGgr: third.nextGgr, previousPayable: third.nextPayable, currentGgr: 100000 },
  'retain'
)
assert.equal(fourth.nextPayable, 10000)
const paid = closeCarry({ ...base, previousPayable: fourth.nextPayable, currentGgr: 0 }, 'settle')
assert.equal(paid.actualPaid, 10000)
assert.equal(paid.nextPayable, 0)
const clear = closeCarry({ ...base, mode: '清零', previousPayable: 5000 }, 'retain')
assert.equal(clear.nextGgr, 0)
assert.equal(clear.nextPayable, 5000)
assert.deepEqual(closeCarry({ ...base, mode: '清零', previousPayable: 5000 }, 'retain'), clear)
console.log(
  'PASS multi-period negative offset, positive retention, no repeated percentage, settlement and clear-mode pending balance'
)
