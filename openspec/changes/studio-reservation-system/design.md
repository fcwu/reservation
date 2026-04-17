## Context

全新個人工作室預約系統，採 Greenfield 開發。業主獨立運營，需要輕量、低維護成本的基礎設施。選用 Cloudflare 全棧方案（Pages + Workers + D1）可避免維護伺服器，並享有免費額度。技術棧：TypeScript、Tailwind CSS、Hono（Workers 框架）。

## Goals / Non-Goals

**Goals:**
- 業主以 Google OAuth 登入後台管理服務、時段與預約
- 顧客無需帳號即可預約，以電話號碼作為識別回訪者
- 支援多服務項目（各自有時長與價格）
- 時段設定支援單次與週期性（每週固定）
- 預約狀態變更時透過 LINE Messaging API 通知業主與顧客
- 前後端均部署於 Cloudflare（Pages / Workers / D1）

**Non-Goals:**
- 顧客帳號系統（無登入）
- 金流 / 線上付款
- 多業主 / 多工作室（單一業主）
- 行事曆同步（Google Calendar 等）
- 複雜排班規則（只支援週期性週間時段）

## Decisions

### D1: Cloudflare Workers + Hono 作為後端框架

**決策**：使用 Hono 框架於 Cloudflare Workers。

**理由**：Hono 是專為 Edge runtime 設計的輕量框架，TypeScript 支援完整，與 Cloudflare Workers 整合最佳，路由語法接近 Express，開發體驗好。相比直接使用原生 fetch handler，Hono 提供更好的 middleware、路由、錯誤處理。

### D2: Cloudflare D1（SQLite）作為資料庫

**決策**：使用 D1 而非外部資料庫（PlanetScale、Supabase 等）。

**理由**：與 Workers 原生整合、無額外網路延遲、免費額度足夠個人工作室規模。缺點是無法在 Worker 之外直接查詢，但透過 migrations 管理 schema 仍可控。

### D3: 顧客識別以電話號碼為主鍵

**決策**：不建立顧客帳號，以電話號碼作為識別符。

**理由**：降低顧客使用門檻，無需記住密碼。系統在提交預約時以電話查找既有顧客資料並自動帶入姓名；若不存在則建立新紀錄。LINE userId 也附加於顧客紀錄，供後續推播使用。

### D4: LINE 通知需顧客主動加官方帳號為好友

**決策**：採用 LINE Messaging API Push Message，顧客需加官方帳號好友。

**理由**：Push Message 是唯一能主動發訊的方式。以 LIFF 讓顧客在預約流程中完成 LINE 登入並取得 userId，同時引導加好友。若顧客未加好友，通知靜默失敗，不影響預約流程。

### D5: 週期性時段使用 Rule + 展開策略

**決策**：儲存週期性規則（SlotRule），並在查詢時動態展開未來 N 週的時段，不預先產生大量 Slot 紀錄。

**理由**：避免資料庫膨脹，且易於修改規則。展開範圍預設為未來 8 週，業主也可手動覆蓋（關閉特定日期的時段）。

### D6: 前端為 SPA，部署於 Cloudflare Pages

**決策**：使用 Vite + React（或純 Vanilla + Vite）搭配 Tailwind，部署至 Cloudflare Pages。

**理由**：Pages 與 Workers 在同一個 Cloudflare 帳號下，可使用 Functions 橋接或直接 fetch Workers 的 API。SPA 適合這種互動性高的預約介面。

## Risks / Trade-offs

- **LINE 通知依賴好友關係** → 預約完成頁面加入「加好友」按鈕與說明，說明未加好友將無法收到通知
- **D1 寫入一致性（SQLite 單寫）** → 個人工作室流量極低，不構成實際問題；若未來需要，可遷移至 Hyperdrive + Postgres
- **電話號碼作為顧客識別** → 顧客換號時歷史資料不連結；可接受，因業主規模小
- **Google OAuth 僅單一業主** → 實作時硬編碼業主的 Google sub 或 email，防止他人登入

## Migration Plan

1. 建立 D1 資料庫，執行 schema migrations
2. 部署 Cloudflare Workers（API）
3. 部署 Cloudflare Pages（前端），設定環境變數（Google Client ID、LINE Token 等）
4. 在 LINE Developers Console 建立 Messaging API channel 及 LIFF app
5. 設定 Google OAuth redirect URI
6. 煙霧測試：業主登入 → 建立服務 → 設定時段 → 顧客預約 → 業主確認 → LINE 通知

**Rollback**：Workers 與 Pages 均支援版本回滾，D1 可透過備份還原。

## Open Questions

- 前端框架：React 或 Solid.js 或純 Vanilla？（建議 React，生態系最完整）
- 業主是否需要在 LINE 上收通知，還是只靠後台？（目前設計兩者皆支援）
- 是否需要 email 通知作為 LINE 的備援？
