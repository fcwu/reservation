## 1. Project Setup

- [x] 1.1 初始化 monorepo 結構（frontend / worker 兩個目錄）
- [x] 1.2 建立 frontend：Vite + React + TypeScript + Tailwind CSS
- [x] 1.3 建立 worker：Hono + TypeScript，設定 wrangler.toml
- [x] 1.4 建立 Cloudflare D1 資料庫，設定 wrangler.toml binding
- [x] 1.5 設定 ESLint、Prettier、TypeScript 編譯設定

## 2. Database Schema

- [x] 2.1 撰寫 D1 migration：customers 表（id, phone, name, line_user_id, created_at）
- [x] 2.2 撰寫 D1 migration：services 表（id, name, duration_minutes, price, is_active, created_at）
- [x] 2.3 撰寫 D1 migration：slot_rules 表（id, day_of_week, start_time, end_time, is_active, created_at）
- [x] 2.4 撰寫 D1 migration：slot_overrides 表（id, date, is_closed, created_at）— 用於關閉特定日期
- [x] 2.5 撰寫 D1 migration：slots 表（id, start_at, end_at, is_available, source_rule_id, created_at）— 單次時段
- [x] 2.6 撰寫 D1 migration：reservations 表（id, slot_id, service_id, customer_id, status, note, rejection_reason, created_at）
- [x] 2.7 執行所有 migrations 於本地與遠端 D1（需先完成 10.1 建立 D1 資料庫）

## 3. Owner Auth（Google OAuth）

- [x] 3.1 在 Google Cloud Console 建立 OAuth 2.0 憑證，設定 redirect URI（手動設定）
- [x] 3.2 實作 Worker 路由：GET /auth/google → 導向 Google OAuth 授權頁
- [x] 3.3 實作 Worker 路由：GET /auth/callback → 交換 code、驗證 email 為業主帳號、建立 session cookie
- [x] 3.4 實作 Worker 路由：POST /auth/logout → 清除 session
- [x] 3.5 實作 authMiddleware：驗證 session cookie，未登入返回 401
- [x] 3.6 前端：建立登入頁面（/admin/login），含 Google 登入按鈕
- [x] 3.7 前端：實作 ProtectedRoute，未登入導向 /admin/login

## 4. Service Management API & UI

- [x] 4.1 實作 Worker API：GET /api/admin/services（列表）
- [x] 4.2 實作 Worker API：POST /api/admin/services（建立）
- [x] 4.3 實作 Worker API：PUT /api/admin/services/:id（修改）
- [x] 4.4 實作 Worker API：DELETE /api/admin/services/:id（刪除，有預約時拒絕）
- [x] 4.5 前端：服務管理頁面（/admin/services），列表含新增、編輯、刪除、啟用切換

## 5. Slot Management API & UI

- [x] 5.1 實作 Worker API：GET /api/admin/slots（列表，含展開週期性規則）
- [x] 5.2 實作 Worker API：POST /api/admin/slots（建立單次時段）
- [x] 5.3 實作 Worker API：POST /api/admin/slot-rules（建立週期性規則）
- [x] 5.4 實作 Worker API：PUT /api/admin/slot-rules/:id（修改 / 停用規則）
- [x] 5.5 實作 Worker API：POST /api/admin/slot-overrides（關閉特定日期）
- [x] 5.6 實作 Worker API：DELETE /api/admin/slots/:id（刪除無預約時段）
- [x] 5.7 實作 slot 展開邏輯：從 slot_rules 動態計算未來 8 週時段，合併 overrides
- [x] 5.8 前端：時段管理頁面（/admin/slots），月曆視圖，支援新增單次 / 週期規則、關閉特定日期

## 6. Customer Booking API & UI

- [x] 6.1 實作 Worker API：GET /api/slots（公開，列出開放時段，含服務選項）
- [x] 6.2 實作 Worker API：POST /api/reservations（提交預約，自動識別回訪顧客）
- [x] 6.3 實作 Worker API：GET /api/reservations?phone=xxx（顧客查詢自己的預約）
- [x] 6.4 前端：顧客預約頁面（/）：月曆或列表顯示開放時段
- [x] 6.5 前端：預約表單：服務選擇、姓名、電話（回訪自動帶入）、備註、LINE 登入（選填）
- [x] 6.6 前端：預約查詢頁面（/my-bookings）：輸入電話查看預約狀態

## 7. LINE LIFF Integration

- [x] 7.1 在 LINE Developers Console 建立 Messaging API channel 與 LIFF app（手動設定）
- [x] 7.2 實作 Worker API：POST /api/auth/line → 接收 LIFF idToken，驗證並取得 userId，更新顧客記錄
- [x] 7.3 前端：整合 LIFF SDK，實作「以 LINE 接收通知」按鈕
- [x] 7.4 前端：LIFF 授權完成後顯示加好友連結

## 8. Booking Confirmation API & UI

- [x] 8.1 實作 Worker API：GET /api/admin/reservations（列表，支援狀態 / 日期篩選）
- [x] 8.2 實作 Worker API：POST /api/admin/reservations/:id/confirm（確認，檢查時段衝突）
- [x] 8.3 實作 Worker API：POST /api/admin/reservations/:id/reject（拒絕，含原因）
- [x] 8.4 實作 Worker API：POST /api/admin/reservations/:id/cancel（取消已確認預約）
- [x] 8.5 前端：預約管理頁面（/admin/reservations），含 pending 列表與確認 / 拒絕操作
- [x] 8.6 前端：歷史預約頁面，含狀態篩選

## 9. LINE Notify Integration

- [x] 9.1 實作 lineNotify 工具函式：封裝 LINE Messaging API Push Message 呼叫
- [x] 9.2 整合至預約提交流程：通知業主新預約
- [x] 9.3 整合至確認流程：通知顧客預約已確認
- [x] 9.4 整合至拒絕流程：通知顧客預約已拒絕（含原因）
- [x] 9.5 整合至取消流程：通知顧客預約已取消
- [x] 9.6 LINE API 失敗靜默記錄（不影響主流程）

## 10. Deployment

- [x] 10.1 設定 Cloudflare Pages 專案，連結 GitHub repo（手動）
- [x] 10.2 設定 Workers 環境變數（GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、LINE_CHANNEL_ACCESS_TOKEN、OWNER_EMAIL、SESSION_SECRET）（手動）
- [x] 10.3 設定 Pages 環境變數（VITE_API_BASE_URL、VITE_LIFF_ID）（手動）
- [x] 10.4 設定 Google OAuth redirect URI 為 Production 域名（手動）
- [x] 10.5 設定 LINE LIFF endpoint URL 為 Production 域名（手動）
- [x] 10.6 執行端對端煙霧測試（登入 → 建服務 → 設時段 → 顧客預約 → 確認 → LINE 通知）
