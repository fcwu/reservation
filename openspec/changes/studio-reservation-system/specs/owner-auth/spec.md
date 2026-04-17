## ADDED Requirements

### Requirement: Owner Google OAuth Login
業主 SHALL 使用 Google OAuth 2.0 完成登入，取得後台管理權限。系統 SHALL 僅允許預先設定的業主 Google 帳號（以 email 或 sub 識別）登入，拒絕其他 Google 帳號。

#### Scenario: Successful owner login
- **WHEN** 業主點擊「登入」並完成 Google OAuth 授權流程
- **THEN** 系統驗證 Google 帳號符合業主設定，建立 session，導向後台首頁

#### Scenario: Unauthorized Google account login attempt
- **WHEN** 非業主的 Google 帳號完成 OAuth 授權
- **THEN** 系統拒絕登入並顯示「此帳號無管理權限」訊息，不建立 session

#### Scenario: Session expiry
- **WHEN** 業主 session 過期後訪問後台頁面
- **THEN** 系統自動導向登入頁，不顯示任何後台內容

### Requirement: Owner Logout
業主 SHALL 能隨時登出，系統 SHALL 清除 session 並導向登入頁。

#### Scenario: Owner logs out
- **WHEN** 業主點擊「登出」
- **THEN** 系統清除 session cookie，導向登入頁
