import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  formatBoardDimensions,
  useTransactionCenterStore
} from '../src/store/modules/transactionCenter'
import { useFinanceCenterStore } from '../src/store/modules/financeCenter'
import { usePlatformAccessStore } from '../src/store/modules/platformAccess'

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const relativeLuminance = (hex: string) => {
  const channels = hex
    .match(/[\da-f]{2}/gi)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

const configSource = readFileSync(resolve('src/config/index.ts'), 'utf8')
const primary = configSource.match(/systemMainColor:\s*\[\s*'([^']+)'/)?.[1]
assert(primary, '找不到系統主色設定')
const primaryContrast = 1.05 / (relativeLuminance(primary!) + 0.05)
assert(primaryContrast >= 4.5, `主色白字對比不足：${primaryContrast.toFixed(2)}`)

const createFinanceStore = () => {
  setActivePinia(createPinia())
  return useFinanceCenterStore()
}

const assertRetryIsRejectedWithoutMutation = (
  role: 'Merchant' | 'Agent' | 'Supplier',
  prepare: (store: ReturnType<typeof useFinanceCenterStore>) => {
    record: ReturnType<typeof useFinanceCenterStore>['merchantReconciliations'][number]
    confirm: (amount: number, note: string) => boolean
  }
) => {
  const store = createFinanceStore()
  const { record, confirm } = prepare(store)
  const originalAmount = record.finalSettlementAmount

  assert(confirm(originalAmount, '') === true, `${role} 首次確認應成功`)

  const snapshot = JSON.stringify({
    record,
    differences: store.differences,
    logs: store.actionLogs
  })
  assert(confirm(originalAmount - 1, '重複確認測試') === false, `${role} 重複確認應被拒絕`)
  assert(
    JSON.stringify({ record, differences: store.differences, logs: store.actionLogs }) === snapshot,
    `${role} 重複確認不得改動金額、差異或操作紀錄`
  )
}

assertRetryIsRejectedWithoutMutation('Merchant', (store) => {
  const record = store.merchantReconciliations.find(
    (item) => item.status === 'Pending Confirmation' && item.unresolvedDifferenceCount === 0
  )
  assert(record, '缺少可測試的商戶待確認對帳')
  return {
    record: record!,
    confirm: (amount, note) => store.confirmMerchant(record!.id, amount, note)
  }
})

assertRetryIsRejectedWithoutMutation('Supplier', (store) => {
  const record = store.supplierReconciliations.find(
    (item) => item.status === 'Pending Confirmation' && item.unresolvedDifferenceCount === 0
  )
  assert(record, '缺少可測試的供應商待確認對帳')
  return {
    record: record!,
    confirm: (amount, note) => store.confirmSupplier(record!.id, amount, note)
  }
})

assertRetryIsRejectedWithoutMutation('Agent', (store) => {
  const record = store.agentReconciliations.find(
    (item) => item.status === 'Pending Confirmation' && item.unresolvedDifferenceCount === 0
  )
  assert(record, '缺少可測試的代理待確認對帳')
  for (const merchant of store.getIncludedMerchantReconciliations(record!)) {
    merchant.status = 'Confirmed'
  }
  return {
    record: record!,
    confirm: (amount, note) => store.confirmAgent(record!.id, amount, note)
  }
})

setActivePinia(createPinia())
const accessStore = usePlatformAccessStore()
const financePermissions = accessStore.permissions.filter(
  (permission) => permission.module === 'finance'
)
for (const permissionName of ['確認對帳', '建立結算申請', '審核結算申請', '產生並鎖定結算單']) {
  assert(
    financePermissions.some((permission) => permission.name === permissionName),
    `缺少財務權限：${permissionName}`
  )
}
assert(
  financePermissions.every((permission) => !permission.description.includes('付款')),
  '結算權限不得包含外部付款語意'
)

setActivePinia(createPinia())
const transactionStore = useTransactionCenterStore()
const bet = transactionStore.findBet('B00003')
assert(bet, '找不到注單 B00003')
const mainStage = bet!.result.replay.stages[0]
assert(mainStage, 'B00003 缺少主遊戲盤面')
const boardDimensions = formatBoardDimensions(mainStage!.columns, mainStage!.rows)
const replayEvent = bet!.result.replay.events.find((event) => event.stageId === mainStage!.id)
assert(replayEvent?.detail.includes(`盤面 ${boardDimensions}`), '遊戲盤面與結果重播的欄 × 列不一致')

const betDetailSource = readFileSync(
  resolve('src/views/game-provider/transactions/bets/detail.vue'),
  'utf8'
)
const tabLabels = [...betDetailSource.matchAll(/<ElTabPane[^>]*label="([^"]+)"/g)].map(
  (match) => match[1]
)
assert(
  JSON.stringify(tabLabels) ===
    JSON.stringify(['基本資料', '遊戲結果', '關聯交易', '異常紀錄', '重播與盤面', '原始結果']),
  `注單詳細分頁順序錯誤：${tabLabels.join(' → ')}`
)
const betListSource = readFileSync(
  resolve('src/views/game-provider/transactions/bets/index.vue'),
  'utf8'
)
assert(!betListSource.includes("() => '查看盤面'"), '注單列表不應有查看盤面快捷操作')
assert(!betListSource.includes("() => '結果重播'"), '注單列表不應有結果重播快捷操作')
assert(betListSource.includes('const detailUrl ='), '注單詳細連結需帶回列表狀態')
assert(betDetailSource.includes('router.push(listReturnPath)'), '返回列表需恢復已套用查詢狀態')

const searchBarSource = readFileSync(
  resolve('src/components/core/forms/art-search-bar/index.vue'),
  'utf8'
)
assert(searchBarSource.includes('@submit.prevent="handleSearch"'), '共用查詢列按 Enter 應執行查詢')
assert(searchBarSource.includes('native-type="submit"'), '共用查詢按鈕應使用安全的表單提交')
const reportSource = readFileSync(resolve('src/views/game-provider/reports/index.vue'), 'utf8')
assert(reportSource.includes('@submit.prevent="applyFilters"'), '五種報表按 Enter 應執行查詢')

console.log('confirmed defects regression tests passed')
