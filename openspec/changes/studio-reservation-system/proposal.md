## Why

個人工作室需要一套線上預約管理系統，讓業主能彈性開放時段、管理多項服務，並讓顧客無需登入即可快速預約，同時透過 LINE 通知雙方確認狀態。

## What Changes

- 全新系統，從零建立
- 業主後台：Google OAuth 登入、服務項目管理、週期性時段設定、預約審核
- 顧客預約頁面：無需登入、填寫姓名與電話、瀏覽可用時段並完成預約
- LINE 通知：預約提交與狀態變更時推播給業主與顧客
- 基礎設施：Cloudflare Pages（前端）+ Cloudflare Workers（後端 API）+ D1（資料庫）

## Capabilities

### New Capabilities

- `owner-auth`: 業主使用 Google OAuth 登入後台，管理所有預約相關設定
- `service-management`: 業主建立與管理多項服務，每項服務有名稱、時長、價格
- `slot-management`: 業主設定可預約時段，支援單次與週期性（每週固定時段）規則
- `customer-booking`: 顧客無需登入即可預約；首次填寫姓名與電話，系統以電話號碼識別回訪顧客並自動帶入資料
- `booking-confirmation`: 業主審核預約（確認或拒絕），狀態更新後觸發 LINE 通知
- `line-notify`: 整合 LINE Messaging API，在預約提交及狀態變更時分別通知業主與顧客

### Modified Capabilities

（無既有 Capability）

## Impact

- **前端**：全新 TypeScript + Tailwind CSS 應用，部署至 Cloudflare Pages
- **後端**：Cloudflare Workers（Hono 或原生 fetch handler），TypeScript
- **資料庫**：Cloudflare D1（SQLite）
- **外部依賴**：Google OAuth 2.0、LINE Messaging API、LINE LIFF
- **無現有系統受影響**（greenfield）
