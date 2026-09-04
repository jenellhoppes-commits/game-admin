# Game Provider Back Office

遊戲商總後台前端展示專案，基於 Art Design Pro 建立，使用 Vue 3、TypeScript、Vite、Element Plus、Pinia 與 ECharts。

## 線上展示

[GitHub Pages](https://jenellhoppes-commits.github.io/game-admin/)

## 主要模組

- 營運儀錶板
- 遊戲、代理、商戶與會員管理
- 注單、交易與獎池管理
- 風控與審核中心
- 對帳、結算、報表與財務設定
- 帳號權限、語系、通知、系統參數與系統紀錄

目前版本使用前端 Mock Data 展示介面與操作流程，未串接正式後端、資料庫、錢包、RNG 或結算服務。

## 本機開發

環境需求：Node.js 20.19 以上、pnpm 8.8 以上。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

開發網址：`http://localhost:3006/#/dashboard`

## 正式建置

```bash
pnpm build
```

建置結果會輸出至 `dist/`。推送至 `main` 分支後，GitHub Actions 會自動建置並發布到 GitHub Pages。

## 開發文件

- [開發環境與專案結構](./docs/DEVELOPMENT_SETUP.md)
- [介面設計規範](./docs/DESIGN_SYSTEM.md)

## 基礎框架

本專案沿用 [Art Design Pro](https://github.com/Daymychen/art-design-pro) 的核心架構與 MIT 授權，並針對遊戲商營運後台進行資訊架構、頁面與 Mock Data 擴充。
