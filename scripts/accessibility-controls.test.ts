import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(path), 'utf8')

const sidebar = read(
  'src/components/core/layouts/art-menus/art-sidebar-menu/widget/SidebarSubmenu.vue'
)
if ((sidebar.match(/:aria-label="formatMenuTitle\(item\.meta\.title\)"/g) || []).length < 2) {
  throw new Error('側欄父選單與葉節點都必須保留可讀名稱')
}

const tableHeader = read('src/components/core/tables/art-table-header/index.vue')
for (const label of [
  '重新整理列表',
  '調整表格密度',
  '表格全螢幕',
  '設定顯示欄位',
  '開啟表格顯示設定'
]) {
  if (!tableHeader.includes(label)) throw new Error(`表格工具列缺少名稱：${label}`)
}

const header = read('src/components/core/layouts/art-header-bar/index.vue')
for (const label of ['收合側欄', '重新整理頁面', '開啟快速入口', '開啟通知']) {
  if (!header.includes(label)) throw new Error(`頁首純圖示控制項缺少名稱：${label}`)
}

console.log('accessibility control name regression tests passed')
