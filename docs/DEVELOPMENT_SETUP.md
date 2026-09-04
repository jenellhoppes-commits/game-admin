# 遊戲總後台開發基線

本專案直接採用 Art Design Pro 官方原始碼，保留 Vue 3、TypeScript、Vite、Element Plus、Tailwind CSS、Pinia、Vue Router、ECharts 與既有的響應式後台框架。

## 環境

- Node.js：`>= 20.19.0`（目前已在 Node `24.18.0` 驗證）
- pnpm：`>= 8.8.0`（目前鎖定環境為 pnpm `11.19.0`）
- 開發埠：`3006`
- 預設路由：`/#/dashboard`
- 正式輸出：`dist/`

首次啟動：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

正式驗證：

```bash
pnpm build
```

## 環境檔

- `.env`：共用版本、埠號、部署 base path、權限模式與介面開關。
- `.env.development`：本機 API 走 `/api`，由 Vite proxy 轉發。
- `.env.production`：正式環境 API base URL。

接入遊戲後端時，優先新增不提交版本控制的 `.env.local`，不要把正式憑證、Token 或私密 API key 寫進既有環境檔。

## 專案入口

- `src/main.ts`：應用啟動與全域註冊。
- `src/router/modules/`：模組化路由與選單定義。
- `src/views/`：頁面；遊戲營運功能建議依領域新增模組資料夾。
- `src/api/`：API 封裝。
- `src/store/modules/`：Pinia 狀態。
- `src/components/core/`：共用基礎元件，不應複製一份再改。
- `src/config/setting.ts`：布局、主題、圓角、工作頁籤等預設值。
- `src/assets/styles/`：全域樣式、主題 token、Element Plus 覆寫。

## 既有能力

目前已包含工作台、分析、電商、使用者、角色、選單、權限、文章、表格、表單、圖表、運維、結果頁、例外頁、深色模式、主題色、語系與多種選單布局。後續遊戲總後台 PRD 應先對照這些現有模式，避免重複建立基礎元件。

## 建議的遊戲後台模組邊界

PRD 到位後，可依需求建立：

- `src/views/game/overview/`：遊戲總覽與即時營運指標。
- `src/views/game/players/`：玩家、角色、封禁與標籤。
- `src/views/game/economy/`：貨幣、道具、訂單與流水。
- `src/views/game/operations/`：活動、公告、郵件與補償。
- `src/views/game/configuration/`：版本、伺服器與動態配置。
- `src/views/game/risk/`：風控、稽核與操作紀錄。

實際命名仍以 PRD 的資訊架構與權限模型為準。
