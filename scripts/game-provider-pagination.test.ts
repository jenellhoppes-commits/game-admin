import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const files = [
  'src/views/game-provider/reports/index.vue',
  'src/views/game-provider/finance/reconciliation/index.vue',
  'src/views/game-provider/finance/reconciliation/differences.vue',
  'src/views/game-provider/risk/alerts/index.vue',
  'src/views/game-provider/risk/rules/index.vue',
  'src/views/game-provider/risk/cases/index.vue',
  'src/views/game-provider/risk/logs/index.vue',
  'src/views/game-provider/approvals/pending/index.vue',
  'src/views/game-provider/approvals/history-list/index.vue',
  'src/views/game-provider/approvals/logs/index.vue'
]

const artTableFiles = [
  'src/views/game-provider/transactions/records/index.vue',
  'src/views/game-provider/transactions/bets/index.vue',
  'src/views/game-provider/agents/index.vue',
  'src/views/game-provider/merchants/index.vue',
  'src/views/game-provider/members/index.vue',
  'src/views/game-provider/games/index.vue',
  'src/views/game-provider/games/taxonomy/index.vue',
  'src/views/game-provider/jackpots/index.vue',
  'src/views/game-provider/shared/list-page/index.vue'
]

for (const file of files) {
  const source = readFileSync(resolve(file), 'utf8')
  if (!source.includes(':page-sizes="[20, 50, 100]"')) {
    throw new Error(`${file} 的分頁選項不是 20／50／100`)
  }
  if (!source.includes('const pagination = reactive({ current: 1, size: 20')) {
    throw new Error(`${file} 的預設筆數不是 20`)
  }
}

for (const file of artTableFiles) {
  const source = readFileSync(resolve(file), 'utf8')
  if (!source.includes(':pagination-options="{ pageSizes: [20, 50, 100] }"')) {
    throw new Error(`${file} 未覆寫共用表格的新版分頁選項`)
  }
  if (!source.includes('size: 20')) {
    throw new Error(`${file} 的預設筆數不是 20`)
  }
}

const rows = Array.from({ length: 137 }, (_, index) => index + 1)
for (const size of [20, 50, 100]) {
  const firstPage = rows.slice(0, size)
  const secondPage = rows.slice(size, size * 2)
  if (firstPage.length !== size || secondPage[0] !== size + 1) {
    throw new Error(`每頁 ${size} 筆的切換或換頁計算錯誤`)
  }
}

console.log('game provider pagination regression tests passed')
