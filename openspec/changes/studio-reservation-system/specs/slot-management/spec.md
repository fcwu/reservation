## ADDED Requirements

### Requirement: Create One-Time Slot
業主 SHALL 能建立單次可預約時段，指定日期、開始時間與結束時間。

#### Scenario: Owner creates a one-time slot
- **WHEN** 業主選擇日期、開始與結束時間並儲存
- **THEN** 系統建立時段，顯示於時段列表與顧客預約頁面

#### Scenario: Create overlapping slot
- **WHEN** 業主建立的時段與現有時段時間重疊
- **THEN** 系統顯示衝突提示，拒絕建立

### Requirement: Create Recurring Slot Rule
業主 SHALL 能建立週期性時段規則，指定星期幾、開始與結束時間，系統 SHALL 動態展開未來 8 週的時段供顧客預約。

#### Scenario: Owner creates a weekly recurring rule
- **WHEN** 業主設定每週三 14:00–18:00 的週期性規則
- **THEN** 系統儲存規則，顧客預約頁面顯示未來 8 週每週三的可用時段

#### Scenario: Owner disables a recurring rule
- **WHEN** 業主停用一條週期性規則
- **THEN** 該規則展開的未來時段（無預約者）從顧客頁面消失

### Requirement: Close Specific Date Slot
業主 SHALL 能關閉特定日期的時段（覆蓋週期性規則），例如國定假日。

#### Scenario: Owner closes a specific date from recurring rule
- **WHEN** 業主選擇某一特定日期將時段標記為關閉
- **THEN** 該日期時段不顯示於顧客預約頁面，週期性規則的其他日期不受影響

### Requirement: View Slot List
業主 SHALL 能查看時段列表，含日期、時間、類型（單次 / 週期）、狀態（開放 / 已關閉 / 已預約）。

#### Scenario: Owner views slot list
- **WHEN** 業主進入時段管理頁面
- **THEN** 系統顯示未來時段列表，標示每個時段的狀態

### Requirement: Delete Slot
業主 SHALL 能刪除無預約的單次時段或停用週期性規則。有已確認預約的時段 SHALL 禁止直接刪除。

#### Scenario: Owner deletes a slot with no bookings
- **WHEN** 業主刪除無預約的時段
- **THEN** 系統移除時段

#### Scenario: Owner attempts to delete a slot with confirmed booking
- **WHEN** 業主嘗試刪除有已確認預約的時段
- **THEN** 系統拒絕並提示需先處理該預約
