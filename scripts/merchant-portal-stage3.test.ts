import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useMerchantPortalStore } from '../src/store/modules/merchantPortal'
import { useBusinessPartnerStore } from '../src/store/modules/businessPartner'
import { useGameCatalogStore } from '../src/store/modules/gameCatalog'
import { useTransactionCenterStore } from '../src/store/modules/transactionCenter'
import { useFinanceCenterStore } from '../src/store/modules/financeCenter'
import { useFinanceSettingsStore } from '../src/store/modules/financeSettings'
import {
  aggregateMerchantReport,
  filterMerchantReport,
  formatMerchantAmount,
  merchantReportCsv
} from '../src/utils/merchantReporting'
import { referenceConversion, latestPublishedRates } from '../src/utils/referenceConversion'
import { merchantField, merchantStatusType } from '../src/utils/merchantDisplay'
import { useJackpotCenterStore } from '../src/store/modules/jackpotCenter'

function setup() {
  setActivePinia(createPinia())
  return {
    portal: useMerchantPortalStore(),
    business: useBusinessPartnerStore(),
    catalog: useGameCatalogStore(),
    transactions: useTransactionCenterStore(),
    finance: useFinanceCenterStore(),
    rates: useFinanceSettingsStore()
  }
}
let checks = 0
assert.equal(merchantStatusType('Success'), 'success')
assert.equal(merchantStatusType('Exception'), 'danger')
assert.equal(merchantStatusType('Pending Review'), 'warning')
assert.equal(merchantStatusType('UNKNOWN'), 'info')
function test(name: string, run: () => void) {
  run()
  checks++
  console.log(`PASS ${name}`)
}

test('商戶／線路交集；偽造外部線路不取得資料', () => {
  const { portal, transactions } = setup()
  assert.equal(portal.merchant?.id, 'M00001')
  assert.equal(portal.lines.length, 2)
  const own = transactions.bets.filter(
    (item) => item.merchantId === 'M00001' && portal.lineIds.has(item.lineUid)
  )
  assert.deepEqual(
    portal.bets.map((item) => item.id),
    own.map((item) => item.id)
  )
  const foreign = transactions.bets.find((item) => item.merchantId !== 'M00001')!
  assert.equal(portal.getBetResult(foreign.id), undefined)
  portal.authorizedLineUids = [foreign.lineUid]
  for (const rows of [
    portal.lines,
    portal.games,
    portal.integrations,
    portal.integrationTests,
    portal.members,
    portal.bets,
    portal.transactions,
    portal.reconciliations,
    portal.differences,
    portal.statements,
    portal.pools,
    portal.payouts,
    portal.contributions
  ])
    assert.equal(rows.length, 0)
  portal.authorizedLineUids = []
  assert.equal(portal.getBetResult(own[0].id), undefined)
})

test('關閉只影響本商戶遊戲可用性；RTP／限紅／其他商戶／歷史不变', () => {
  const { portal, business, catalog, transactions, finance, rates } = setup()
  const game = portal.games.find((item) => item.enabled)!
  const globalBefore = JSON.stringify(catalog.games)
  const foreignBefore = JSON.stringify(
    business.merchantGameConfigurations.filter((item) => item.merchantId !== 'M00001')
  )
  const lineBefore = portal.configurations.map((item) => ({ ...item }))
  const historyBefore = JSON.stringify([
    transactions.bets,
    transactions.transactions,
    finance.merchantReconciliations,
    rates.dailyRates
  ])
  assert.equal(portal.closePlatformGame(game.id).ok, true)
  assert.equal(portal.games.find((item) => item.id === game.id)?.enabled, false)
  const operatedAt = portal.logs[0].time
  assert.equal(portal.games.find((item) => item.id === game.id)?.updatedAt, operatedAt)
  assert.ok(portal.lines.every((item) => item.updatedAt === operatedAt))
  assert.ok(
    portal.configurations
      .filter((item) => item.gameId === game.id)
      .every((item) => item.updatedAt === operatedAt)
  )
  assert.ok(
    portal.configurations.filter((item) => item.gameId === game.id).every((item) => !item.enabled)
  )
  for (const before of lineBefore) {
    const after = portal.configurations.find((item) => item.id === before.id)!
    assert.equal(after.rtpPlanName, before.rtpPlanName)
    assert.equal(after.limitPlan, before.limitPlan)
    if (before.gameId !== game.id) {
      assert.equal(after.enabled, before.enabled)
      assert.equal(after.updatedAt, before.updatedAt)
    }
  }
  assert.equal(JSON.stringify(catalog.games), globalBefore)
  assert.equal(
    JSON.stringify(
      business.merchantGameConfigurations.filter((item) => item.merchantId !== 'M00001')
    ),
    foreignBefore
  )
  assert.equal(
    JSON.stringify([
      transactions.bets,
      transactions.transactions,
      finance.merchantReconciliations,
      rates.dailyRates
    ]),
    historyBefore
  )
  assert.equal(portal.closePlatformGame(game.id).ok, false)
  assert.equal(portal.closePlatformGame('FOREIGN-GAME').ok, false)
})

test('遊戲與串接所有舊申請均拒絕；線路申請去重且未生效', () => {
  const { portal, business } = setup()
  const base = { proposed: '測試設定', reason: '測試原因' }
  for (const action of ['申請開通', '申請變更配置', '申請停用'])
    assert.equal(
      portal.submitRequest({ ...base, category: '遊戲', action, target: portal.games[0].id }).ok,
      false
    )
  assert.equal(
    portal.submitRequest({
      ...base,
      category: '串接',
      action: '串接設定變更申請',
      target: portal.integrations[0].id
    }).ok,
    false
  )
  assert.equal(
    portal.submitRequest({
      ...base,
      category: '線路',
      action: '任意執行',
      target: portal.lines[0].id
    }).ok,
    false
  )
  assert.equal(
    portal.submitRequest({
      ...base,
      category: '線路',
      action: '申請變更線路設定',
      target: 'ASG_MER0002_TWD'
    }).ok,
    false
  )
  const before = JSON.stringify(business.merchants)
  const input = {
    ...base,
    category: '線路' as const,
    action: '申請變更線路設定',
    target: portal.lines[0].id
  }
  assert.equal(portal.submitRequest(input).ok, true)
  assert.equal(portal.submitRequest(input).ok, false)
  assert.equal(portal.requests.length, 1)
  assert.equal(portal.requests[0].execution, '未執行')
  assert.equal(JSON.stringify(business.merchants), before)
})

test('串接／Replay／匯率使用明確白名單，讀取不修改來源', () => {
  const { portal, transactions, rates } = setup()
  const before = JSON.stringify([transactions.bets, transactions.transactions, rates.dailyRates])
  function assertNoPrivateKeys(value: unknown) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      assert.ok(
        !/^(apiKey|secret|rawPayload|seed|riskAlert|exchangeRateSource|baseRate|adjustmentPercent|adjustmentValue|note)$/i.test(
          key
        ),
        `unexpected ${key}`
      )
      assertNoPrivateKeys(child)
    }
  }
  assertNoPrivateKeys(portal.integrations)
  assertNoPrivateKeys(portal.rates)
  for (const bet of portal.bets) {
    const result = portal.getBetResult(bet.id)!
    assertNoPrivateKeys(result)
    const original = transactions.findBet(bet.id)!.result
    assert.equal(result.version.gameVersion, original.version.gameVersion)
    assert.equal(result.replay.events.length, original.replay.events.length)
    assert.deepEqual(
      result.replay.stages.map((stage) => [stage.rows, stage.columns]),
      original.replay.stages.map((stage) => [stage.rows, stage.columns])
    )
  }
  assert.equal(
    JSON.stringify([transactions.bets, transactions.transactions, rates.dailyRates]),
    before
  )
})

test('報表日期、測試會員、分幣去重及跨維度總計一致', () => {
  const { portal } = setup()
  const filters = { range: ['2026-08-01', '2026-08-31'], line: '', currency: '', excludeTest: true }
  const rows = filterMerchantReport(portal.bets, filters)
  assert.ok(rows.length > 0)
  assert.ok(rows.every((row) => !row.test && row.status === 'Settled'))
  assert.equal(
    filterMerchantReport(portal.bets, { ...filters, range: ['2026-09-01', '2026-09-07'] }).length,
    0
  )
  assert.equal(filterMerchantReport(portal.bets, { ...filters, line: 'ASG_MER0002_TWD' }).length, 0)
  assert.equal(
    filterMerchantReport(portal.bets, { ...filters, range: ['2026-08-31', '2026-08-01'] }).length,
    0
  )
  const totals = aggregateMerchantReport(rows, '幣別')
  assert.deepEqual(aggregateMerchantReport([...rows, ...rows], '幣別'), totals)
  for (const total of totals) {
    const source = rows.filter((row) => row.currency === total.currency)
    assert.equal(
      total.members,
      new Set(source.map((row) => JSON.stringify([row.lineUid, row.memberId]))).size
    )
    assert.equal(
      total.rounds,
      new Set(source.map((row) => JSON.stringify([row.lineUid, row.gameId, row.roundId]))).size
    )
    for (const dimension of ['線路', '遊戲']) {
      const groups = aggregateMerchantReport(rows, dimension).filter(
        (row) => row.currency === total.currency
      )
      for (const key of ['betAmount', 'payoutAmount', 'ggr'] as const)
        assert.ok(Math.abs(groups.reduce((sum, row) => sum + row[key], 0) - total[key]) < 1e-8)
    }
  }
  const oneDay = filterMerchantReport(portal.bets, {
    ...filters,
    range: [rows[0].time.slice(0, 10), rows[0].time.slice(0, 10)]
  })
  assert.ok(oneDay.length > 0 && oneDay.length < rows.length)
})

test('CSV 使用全部查詢列與相同精度；缺匯率不產生部分合計', () => {
  const { portal } = setup()
  const filters = { range: ['2026-08-01', '2026-08-31'], line: '', currency: '', excludeTest: true }
  const rows = filterMerchantReport(portal.bets, filters)
  const grouped = aggregateMerchantReport(rows, '遊戲'),
    totals = aggregateMerchantReport(rows, '幣別')
  const csv = merchantReportCsv(grouped, totals, filters, () => 2)
  assert.equal(csv.split('\r\n').length, 1 + grouped.length + totals.length)
  for (const total of totals)
    assert.ok(csv.includes(`"${formatMerchantAmount(total.betAmount, 2, false)}"`))
  assert.equal(formatMerchantAmount(1.005, 2, false), '1.01')
  assert.equal(formatMerchantAmount(-1.005, 2, false), '-1.01')
  const preview = referenceConversion(
    [{ currency: 'TWD', betAmount: 10, payoutAmount: 5, ggr: 5 }],
    'USD',
    [],
    '2026-09-07'
  )
  assert.equal(preview.amounts, null)
  assert.deepEqual(preview.missing.sort(), ['TWD', 'USD'])
})

test('最新匯率與參考換算一致；同日依鎖定時間選取，排除無效與未發布值', () => {
  const base = { fromCurrency: 'USDT', toCurrency: 'TWD', date: '2026-09-07', status: 'Locked' }
  const rates = [
    { ...base, finalRate: 30, lockedAt: '2026-09-07 01:00' },
    { ...base, finalRate: 32, lockedAt: '2026-09-07 02:00' },
    { ...base, finalRate: 99, lockedAt: '2026-09-07 03:00', status: 'Failed' },
    { ...base, finalRate: 0, lockedAt: '2026-09-07 04:00' },
    { ...base, finalRate: 100, date: '2026-09-08' }
  ]
  const before = JSON.stringify(rates)
  assert.equal(latestPublishedRates(rates, '2026-09-07').get('TWD')?.finalRate, 32)
  assert.equal(latestPublishedRates([...rates].reverse(), '2026-09-07').get('TWD')?.finalRate, 32)
  assert.equal(
    referenceConversion(
      [{ currency: 'TWD', betAmount: 320, payoutAmount: 160, ggr: 160 }],
      'USDT',
      rates,
      '2026-09-07'
    ).amounts?.betAmount,
    10
  )
  assert.equal(JSON.stringify(rates), before)
})

test('差異申請拒絕缺失／過期版本與鎖定競態，僅保存使用者檢視版本', () => {
  const { portal, finance } = setup()
  const record = portal.reconciliations[0]
  const source = finance.merchantReconciliations.find((item) => item.id === record.id)!
  const input = {
    category: '差異' as const,
    target: record.id,
    action: record.lockedAt ? '更正申請' : '回報對帳差異',
    reason: '核對來源',
    proposed: '原型文字回報'
  }
  assert.equal(portal.submitRequest(input).ok, false)
  assert.equal(portal.submitRequest({ ...input, expectedVersion: 'STALE' }).ok, false)
  source.snapshot.calculatedAt = source.snapshot.calculatedAt + ':01'
  assert.equal(portal.submitRequest({ ...input, expectedVersion: record.version }).ok, false)
  const current = portal.reconciliations.find((item) => item.id === record.id)!
  const expectedVersion = current.version
  assert.equal(
    portal.submitRequest({
      ...input,
      expectedVersion,
      action: current.lockedAt ? '回報對帳差異' : '更正申請'
    }).ok,
    false
  )
  assert.equal(portal.requests.length, 0)
  const before = JSON.stringify(finance.merchantReconciliations)
  assert.equal(portal.submitRequest({ ...input, expectedVersion }).ok, true)
  assert.equal(portal.requests[0].expectedVersion, expectedVersion)
  assert.equal(JSON.stringify(finance.merchantReconciliations), before)
})

test('列表與明細金額同精度；未結算不顯示零派彩，來源不變', () => {
  const row = {
    currency: 'USD',
    gameName: '測試',
    payoutAmount: 0,
    betAmount: 1.005,
    status: 'In Progress'
  }
  const before = JSON.stringify(row)
  assert.equal(
    merchantField(row, 'payoutAmount', () => 2),
    '待結算'
  )
  assert.equal(
    merchantField(row, 'betAmount', () => 2),
    '1.01'
  )
  assert.equal(
    merchantField({ ...row, status: 'Settled' }, 'payoutAmount', () => 2),
    '0.00'
  )
  assert.equal(
    merchantField({ ...row, currency: 'TWD', betAmount: 37.35 }, 'betAmount', () => 0),
    '37'
  )
  assert.equal(
    merchantField({ ...row, status: 'Exception', payoutAmount: 111.6 }, 'payoutAmount', () => 2),
    '111.60（異常，未確認）'
  )
  assert.equal(
    merchantField({ amount: '未定案', currency: 'USD' }, 'amount', () => 2),
    '未定案'
  )
  assert.equal(JSON.stringify(row), before)
})

test('登出清除本地申請／草稿／已讀與範圍，重入不重置共享資料', () => {
  const { portal, business, transactions, finance } = setup()
  portal.submitRequest({
    category: '線路',
    target: 'NEW',
    action: '新增線路',
    proposed: 'QA',
    reason: 'QA'
  })
  assert.equal(portal.inviteDraft('QA', 'qa-local').ok, true)
  portal.markNoticeRead('MERCHANT-DEMO-NOTICE')
  const before = JSON.stringify([
    business.merchants,
    transactions.bets,
    finance.merchantReconciliations
  ])
  portal.resetSession()
  assert.equal(portal.requests.length, 0)
  assert.equal(portal.logs.length, 0)
  assert.equal(portal.staff.length, 0)
  assert.equal(portal.lines.length, 0)
  assert.equal(portal.bets.length, 0)
  assert.equal(portal.inviteDraft('QA', 'qa-local').ok, false)
  portal.resetSession(true)
  assert.equal(portal.lines.length, 2)
  assert.equal(portal.staff.length, 1)
  assert.ok(portal.notices.every((item) => !item.read))
  assert.equal(portal.requests.length, 0)
  assert.equal(
    JSON.stringify([business.merchants, transactions.bets, finance.merchantReconciliations]),
    before
  )
})

test('狀態顯示分辨啟用與限制中，未知狀態不擅自改寫', () => {
  assert.equal(
    merchantField({ status: 'Active' }, 'status', () => 2),
    '啟用'
  )
  assert.equal(
    merchantField({ restriction: 'Active' }, 'restriction', () => 2),
    '限制中'
  )
  assert.equal(
    merchantField({ status: 'Settled' }, 'status', () => 2),
    '已結算'
  )
  assert.equal(
    merchantField({ status: 'FUTURE_STATE' }, 'status', () => 2),
    'FUTURE_STATE'
  )
  assert.equal(
    merchantField({ enabled: true }, 'enabled', () => 2),
    '是'
  )
})

test('有資料獎池fixture：僅自身同池同線同幣流水與派發、申請未生效', () => {
  const { portal } = setup()
  const jackpot = useJackpotCenterStore()
  const member = portal.members.find((item) => item.currency === 'USD')!
  const pool = jackpot.pools.find((item) => item.baseCurrency === 'USD')!
  jackpot.merchantSettings.push({
    id: 'QA-OWN-POOL',
    poolId: pool.id,
    merchantId: 'M00001',
    merchantName: 'QA',
    agentId: 'QA',
    agentName: 'QA',
    lineUid: member.lineUid,
    currency: 'USD',
    walletMode: 'Seamless',
    displayName: 'QA fixture',
    status: 'Active',
    effectiveAt: '2026-09-07',
    updatedAt: '2026-09-07'
  })
  const payout = {
    ...jackpot.payouts[0],
    id: 'QA-PAYOUT',
    poolId: pool.id,
    merchantId: 'M00001',
    memberId: member.id,
    currency: 'USD'
  }
  const ledger = {
    ...jackpot.ledgerRecords[0],
    id: 'QA-LEDGER',
    poolId: pool.id,
    merchantId: 'M00001',
    memberId: member.id,
    currency: 'USD'
  }
  jackpot.payouts.push(
    payout,
    { ...payout, id: 'QA-WRONG-CURRENCY', currency: 'TWD' },
    { ...payout, id: 'QA-FOREIGN', merchantId: 'M00002' }
  )
  jackpot.ledgerRecords.push(ledger, { ...ledger, id: 'QA-LEDGER-WRONG-CURRENCY', currency: 'TWD' })
  assert.ok(portal.pools.some((item) => item.id === 'QA-OWN-POOL'))
  assert.ok(portal.payouts.some((item) => item.id === 'QA-PAYOUT'))
  assert.ok(portal.contributions.some((item) => item.id === 'QA-LEDGER'))
  assert.ok(!portal.payouts.some((item) => ['QA-WRONG-CURRENCY', 'QA-FOREIGN'].includes(item.id)))
  assert.ok(!portal.contributions.some((item) => item.id === 'QA-LEDGER-WRONG-CURRENCY'))
  const before = JSON.stringify([jackpot.merchantSettings, jackpot.payouts, jackpot.ledgerRecords])
  assert.equal(
    portal.submitRequest({
      category: '獎池',
      target: 'QA-OWN-POOL',
      action: '獎池參與變更申請',
      proposed: '測試',
      reason: 'fixture'
    }).ok,
    true
  )
  assert.equal(
    JSON.stringify([jackpot.merchantSettings, jackpot.payouts, jackpot.ledgerRecords]),
    before
  )
})

console.log(`${checks} merchant-stage3 invariant groups passed`)
