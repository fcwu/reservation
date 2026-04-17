## ADDED Requirements

### Requirement: Create Service
業主 SHALL 能建立服務項目，每項服務 SHALL 包含名稱、時長（分鐘）、價格（元）與是否啟用。

#### Scenario: Owner creates a service
- **WHEN** 業主填寫服務名稱、時長、價格並送出
- **THEN** 系統儲存服務，顯示於服務列表

#### Scenario: Create service with missing required fields
- **WHEN** 業主未填寫名稱或時長即送出
- **THEN** 系統顯示欄位錯誤提示，不儲存

### Requirement: Edit Service
業主 SHALL 能修改現有服務的名稱、時長、價格與啟用狀態。

#### Scenario: Owner edits a service
- **WHEN** 業主修改服務資料並儲存
- **THEN** 系統更新服務，列表顯示最新資料

#### Scenario: Disable a service
- **WHEN** 業主將服務標記為停用
- **THEN** 該服務不再顯示於顧客預約頁面的服務選單

### Requirement: Delete Service
業主 SHALL 能刪除無關聯預約的服務項目。有未完成預約的服務 SHALL 禁止刪除。

#### Scenario: Owner deletes a service with no bookings
- **WHEN** 業主刪除一個無任何預約的服務
- **THEN** 系統刪除服務，從列表移除

#### Scenario: Owner attempts to delete a service with existing bookings
- **WHEN** 業主嘗試刪除有未完成預約的服務
- **THEN** 系統顯示提示，拒絕刪除

### Requirement: List Services
業主 SHALL 能查看所有服務項目列表，含名稱、時長、價格、狀態。

#### Scenario: Owner views service list
- **WHEN** 業主進入服務管理頁面
- **THEN** 系統顯示所有服務（啟用與停用），含名稱、時長、價格
