## ADDED Requirements

### Requirement: Notify Owner on New Booking
當顧客提交新預約時，系統 SHALL 透過 LINE Messaging API 發送推播通知給業主。

#### Scenario: New booking submitted
- **WHEN** 顧客成功送出預約申請
- **THEN** 系統以 Push Message 通知業主：顧客姓名、電話、預約時段、服務項目

#### Scenario: Owner LINE notification fails
- **WHEN** LINE API 呼叫失敗（網路錯誤或業主未加好友）
- **THEN** 預約仍正常建立，通知失敗靜默記錄至 log，不回傳錯誤給顧客

### Requirement: Notify Customer on Booking Confirmed
當業主確認預約時，系統 SHALL 透過 LINE 推播通知顧客。

#### Scenario: Customer has LINE userId and booking is confirmed
- **WHEN** 業主確認一筆有 LINE userId 的預約
- **THEN** 系統發送推播：「您的預約已確認！時間：{日期時間}，服務：{服務名稱}」

#### Scenario: Customer has no LINE userId
- **WHEN** 業主確認一筆無 LINE userId 的預約
- **THEN** 系統跳過 LINE 通知，預約狀態正常更新

### Requirement: Notify Customer on Booking Rejected
當業主拒絕預約時，系統 SHALL 透過 LINE 推播通知顧客（含拒絕原因，若有）。

#### Scenario: Customer notified of rejection with reason
- **WHEN** 業主拒絕預約並附上原因
- **THEN** 系統發送推播：「很抱歉，您的預約未能成立。原因：{原因}」

#### Scenario: Customer notified of rejection without reason
- **WHEN** 業主拒絕預約未填原因
- **THEN** 系統發送推播：「很抱歉，您的預約未能成立，請聯繫業主了解詳情。」

### Requirement: Notify Customer on Booking Cancelled
當業主取消已確認預約時，系統 SHALL 透過 LINE 推播通知顧客。

#### Scenario: Confirmed booking is cancelled
- **WHEN** 業主取消已確認的預約
- **THEN** 系統發送推播：「您的預約已被取消，如有疑問請聯繫業主。時間：{日期時間}」

### Requirement: LINE LIFF Integration
系統 SHALL 提供 LIFF 頁面讓顧客在預約流程中完成 LINE 登入，取得 userId 並引導加入業主官方帳號為好友。

#### Scenario: Customer completes LIFF login and adds friend
- **WHEN** 顧客點擊「以 LINE 接收通知」並完成 LIFF 授權
- **THEN** 系統取得 userId，頁面引導顧客加入業主官方帳號好友（含加好友連結）

#### Scenario: LIFF not available (non-LINE browser)
- **WHEN** 顧客在非 LINE 內建瀏覽器中開啟 LIFF 頁面
- **THEN** LIFF 以外部瀏覽器模式啟動，完成授權後返回預約頁面
