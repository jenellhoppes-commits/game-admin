# Art Design Pro 視覺與元件規格

此文件整理目前線上工作台與原始碼中的設計基線。後續遊戲總後台功能應沿用這些 token 與元件語言，除非 PRD 明確要求建立新的品牌層。

## 視覺原則

- 介面以低對比灰白底、白色內容卡片、藍色主題色為主。
- 資訊密度偏中等：主要頁面採 20px 欄距，桌面卡片並排，手機改為單欄。
- 分隔優先使用細邊框，不以強陰影切割區塊。
- 所有狀態色都使用語意 token；不要在業務頁直接散落新的 hex 色碼。

## 核心色彩

來源：`src/assets/styles/core/tailwind.css`。

| Token | 亮色值 | 用途 |
| --- | --- | --- |
| `--art-primary` | `oklch(0.7 0.23 260)` | 品牌／主操作色 |
| `--el-color-primary` | 執行時預設約 `#5D87FF` | Element Plus 主題色 |
| `--art-success` | `oklch(0.78 0.17 166.1)` | 成功、正成長 |
| `--art-warning` | `oklch(0.78 0.14 75.5)` | 警告 |
| `--art-danger` | `oklch(0.68 0.22 25.3)` | 錯誤、負成長、危險操作 |
| `--default-bg-color` | `#fafbfc` | 頁面背景 |
| `--default-box-color` | `#ffffff` | 卡片／面板背景 |
| `--art-card-border` | `rgba(0, 0, 0, 0.08)` | 卡片邊框 |

灰階由 `--art-gray-100` 到 `--art-gray-900`，亮色模式從 `#f9fafb` 遞進到 `#323251`；深色模式有完整反向 token，不需要在元件內另寫 dark mode 色碼。

## 字體與層級

- 字體：`ui-sans-serif, system-ui, sans-serif`，並保留 Apple／Segoe UI emoji fallback。
- 基本文字：16px / 24px。
- 小型說明與表格輔助資訊：14px。
- 卡片標題：18px、中等字重。
- 區塊主標：24px、中等字重。
- 數據值應比標籤高一至兩級，並使用 tabular-friendly 的簡潔數字呈現。

## 圓角、邊框與陰影

- 全域自訂圓角：`--custom-radius: 0.75rem`。
- 一般 `art-card`：實際約 16px 圓角。
- `art-card-sm`：約 12px。
- `art-card-xs`：約 8px。
- 邊框模式：`1px solid var(--art-card-border)`，無陰影。
- 陰影模式：保留極輕微的 1–3px elevation；由 `src/assets/styles/core/app.scss` 統一控制。

新增業務卡片時應使用 `art-card` 系列，不要在頁面內重新定義背景、邊框與圓角。

## 間距與布局

- 左側選單展開寬度：230px。
- 主內容桌面外距／欄距：以 20px 為主要節奏。
- 卡片水平內距常用 20px。
- 工作台統計卡高度：140px。
- 小螢幕斷點：640px；內容改為單欄、卡片垂直間距 16px。
- 中小螢幕下選單會收合，主內容保留可操作的頂部工具列與工作頁籤。

## 共用元件優先順序

1. 先使用 `src/components/core/` 的 Art 元件。
2. 再使用 Element Plus 元件與專案既有覆寫。
3. 只有在兩者都無法覆蓋 PRD 行為時，才新增業務元件。

常用基礎元件：

- 卡片：`art-stats-card`、`art-data-list-card`、`art-progress-card`、圖表卡片系列。
- 表格：`art-table`、`art-table-header`。
- 表單：`art-form`、`art-search-bar`、Excel 匯入／匯出。
- 圖表：ECharts 封裝與 `useChart`。
- 布局：側欄、工作頁籤、麵包屑、全域搜尋、設定面板。

## 互動與狀態

- 主題支援亮色、深色與跟隨系統，設定由 Pinia 持久化。
- 主色會自動生成 Element Plus 的 1–9 階亮色與深色變體。
- 可切換邊框／陰影卡片模式、選單布局、容器寬度與頁面轉場。
- 表格、篩選、核取方塊、頁籤與側欄收合均已有一致的 hover、active、focus 狀態。
- 危險操作需使用 danger 語意色與二次確認；不可只用顏色表示狀態。

## 遊戲總後台延伸規則

- 核心營運 KPI 優先沿用工作台的統計卡、折線圖、長條圖與趨勢標記。
- 玩家、角色、訂單、道具等清單優先沿用 `art-table` 與既有搜尋列。
- 活動配置、伺服器設定與補償發放要有草稿／發布狀態、權限檢查與操作紀錄。
- 經濟數值、貨幣與時間區間應明確標示單位、時區與格式。
- 大量資料頁面必須保留載入、空值、錯誤、權限不足與部分成功狀態。

## 視覺參考

本次線上比對的桌面與手機擷取圖保存在工作區根目錄：

- `../../source-desktop.png`
- `../../source-desktop-mid.png`
- `../../source-desktop-bottom.png`
- `../../source-mobile-top.png`
- `../../source-mobile-menu.png`

後續若調整全域 token、側欄、頂部工具列或工作台卡片，應以相同 viewport 重新截圖並做並排比對。
