## ADDED Requirements

### Requirement: Browse Available Slots
顧客 SHALL 能在預約頁面瀏覽所有開放的可用時段，顯示日期、時間及可選服務項目。

#### Scenario: Customer views available slots
- **WHEN** 顧客開啟預約頁面
- **THEN** 系統顯示未來 8 週內所有開放時段（月曆或列表視圖），已額滿時段標示為不可選

### Requirement: Submit Booking
顧客 SHALL 能選擇時段與服務項目，填寫姓名、電話後送出預約。系統 SHALL 以電話號碼識別回訪顧客並自動帶入姓名。

#### Scenario: First-time customer submits booking
- **WHEN** 新顧客填寫姓名、電話並選擇時段、服務送出
- **THEN** 系統建立顧客記錄與預約，預約狀態為 pending，顯示「預約申請已送出，等待業主確認」

#### Scenario: Returning customer submits booking
- **WHEN** 顧客輸入曾預約過的電話號碼
- **THEN** 系統自動帶入該電話對應的姓名，顧客確認後可直接送出

#### Scenario: Customer submits booking for already-booked slot
- **WHEN** 顧客選擇已有確認預約的時段送出
- **THEN** 系統顯示「此時段已被預約」，拒絕送出

#### Scenario: Customer submits without required fields
- **WHEN** 顧客未填寫姓名或電話即送出
- **THEN** 系統顯示欄位錯誤提示，不送出

### Requirement: LINE Login for Notification
顧客 SHALL 能在預約流程中選擇以 LIFF 完成 LINE 登入，授權後系統取得 userId 以便後續推播通知。LINE 登入為選填，不強制。

#### Scenario: Customer completes LINE login
- **WHEN** 顧客點擊「以 LINE 接收通知」並完成 LIFF 授權
- **THEN** 系統取得 LINE userId 並與預約紀錄關聯，顯示「已綁定 LINE 通知」

#### Scenario: Customer skips LINE login
- **WHEN** 顧客不點擊 LINE 登入直接送出預約
- **THEN** 預約正常建立，無 LINE userId，後續狀態變更不發送 LINE 通知

### Requirement: View Booking Status
顧客 SHALL 能透過電話號碼查詢自己的預約狀態。

#### Scenario: Customer queries booking status
- **WHEN** 顧客輸入電話號碼查詢
- **THEN** 系統顯示該電話號碼下所有預約的時段、服務、狀態（待確認 / 已確認 / 已拒絕）
