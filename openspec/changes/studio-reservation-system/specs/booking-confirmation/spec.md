## ADDED Requirements

### Requirement: View Pending Bookings
業主 SHALL 能在後台查看所有待確認（pending）的預約，含顧客姓名、電話、所選時段、服務項目、備註與提交時間。

#### Scenario: Owner views pending bookings
- **WHEN** 業主進入預約管理頁面
- **THEN** 系統顯示所有 pending 預約，按提交時間排序（最新在前）

### Requirement: Confirm Booking
業主 SHALL 能確認一筆 pending 預約，狀態更新為 confirmed，時段標記為已佔用。

#### Scenario: Owner confirms a booking
- **WHEN** 業主點擊「確認」按鈕
- **THEN** 預約狀態更新為 confirmed，時段標記已佔用，觸發 LINE 通知顧客

#### Scenario: Confirm booking when slot is already taken
- **WHEN** 業主嘗試確認某時段，但該時段已有另一筆已確認預約
- **THEN** 系統顯示衝突提示，拒絕確認

### Requirement: Reject Booking
業主 SHALL 能拒絕一筆 pending 預約，可選填拒絕原因，狀態更新為 rejected，時段重新開放。

#### Scenario: Owner rejects a booking with reason
- **WHEN** 業主填寫拒絕原因並點擊「拒絕」
- **THEN** 預約狀態更新為 rejected，時段重新開放，觸發 LINE 通知顧客（含原因）

#### Scenario: Owner rejects a booking without reason
- **WHEN** 業主不填原因直接點擊「拒絕」
- **THEN** 預約狀態更新為 rejected，時段重新開放，觸發 LINE 通知顧客（無原因文字）

### Requirement: View All Bookings History
業主 SHALL 能查看所有歷史預約（含 confirmed、rejected、pending），可依狀態、日期篩選。

#### Scenario: Owner filters bookings by status
- **WHEN** 業主選擇篩選條件（例如只看 confirmed）
- **THEN** 系統只顯示符合條件的預約列表

### Requirement: Cancel Confirmed Booking
業主 SHALL 能取消已確認的預約，狀態更新為 cancelled，時段重新開放，觸發 LINE 通知顧客。

#### Scenario: Owner cancels a confirmed booking
- **WHEN** 業主點擊「取消預約」
- **THEN** 預約狀態更新為 cancelled，時段重新開放，觸發 LINE 通知顧客
