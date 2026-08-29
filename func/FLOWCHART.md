# Inko — Detailed Flow Charts — Per Actor + Whole App

**Date:** 2026-08-28 23:15 IST  
**Source:** `LOGICAL_AUDIT.md` + `FUNCTIONALITY.md` + Use Cases `func/USECASE_*.md`  
**Format:** Mermaid `flowchart TD` — copy into `mermaid.live` or GitHub preview. Separate file as requested.

---

## 1. Whole App — System Overview (All Actors + Services + DB)

```mermaid
flowchart TD
    %% Nodes
    Poster[("📮 QR Poster<br/>codeValue ACTIVE")]
    Browser["Browser<br/>http://localhost:5173"]
    Frontend["Frontend React<br/>App.tsx + AreaGuard<br/>Customer/Shop/Admin Shell"]
    AuthAPI["Auth API<br/>/api/auth/*<br/>JWT 15m / Refresh 7d"]
    ShopAPI["Shop API<br/>/api/shops*<br/>Catalog / QR"]
    DocAPI["Document API<br/>/api/documents/upload<br/>50MB / 10 files"]
    PricingAPI["Pricing API<br/>/api/pricing/quote<br/>SHOP > PLATFORM"]
    OrderAPI["Order API<br/>/api/orders<br/>INKO-YYYY-######"]
    PaymentAPI["Payment API<br/>/api/orders/{id}/payment<br/>MOCK_UPI / COD"]
    TokenAPI["Token API<br/>/api/tokens/*<br/>A001 priority"]
    QueueSSE["SSE<br/>/shops/{id}/queue/stream 60s"]
    AnalyticsAPI["Analytics API<br/>/analytics/overview|series|mix"]
    AdminAPI["Admin API<br/>/admin/users|audit<br/>/complaints /refunds"]
    NotifyAPI["Notification API<br/>/notifications"]
    DB[("PostgreSQL 17<br/>28 tables<br/>V1-V12 + seeds")]

    %% Edges — Whole flow
    Poster -->|scan /qr/:code| Browser
    Browser --> Frontend
    Frontend -->|GET /qr/:code/resolve<br/>POST /qr/:code/scan permitAll| ShopAPI
    Frontend -->|POST /auth/guest<br/>POST /auth/register|SHOP_OWNER<br/>POST /auth/login + OTP<br/>POST /auth/refresh single-flight| AuthAPI
    Frontend -->|POST /documents/upload FormData<br/>onUploadProgress| DocAPI
    Frontend -->|POST /pricing/quote<br/>shopId paper color sides pages copies| PricingAPI
    Frontend -->|POST /orders<br/>GET /orders /history<br/>GET /orders/shop/{id}| OrderAPI
    Frontend -->|POST /orders/{id}/payment<br/>POST /payments/{id}/verify| PaymentAPI
    PaymentAPI -->|PAID→tokens.generate A%03d| TokenAPI
    TokenAPI -->|WAITING→CALLED→PRINTING→COMPLETED<br/>QueueEntry WAITING→DONE| OrderAPI
    TokenAPI -->|decrement inventory -totalPages*copies<br/>LOW_STOCK notify owner| ShopAPI
    TokenAPI -->|TOKEN_CALLED/PREPRINT/COMPLETED notify| NotifyAPI
    Frontend -->|GET /shops/{id}/queue<br/>GET /tokens/{id}/wait<br/>EventSource SSE| QueueSSE
    Frontend -->|GET /analytics/overview?shopId<br/>GET /series?days| AnalyticsAPI
    Frontend -->|GET /admin/users|audit<br/>PATCH roles/status<br/>GET /complaints PATCH| AdminAPI
    Frontend -->|GET /notifications<br/>POST /read| NotifyAPI
    AuthAPI & ShopAPI & DocAPI & PricingAPI & OrderAPI & PaymentAPI & TokenAPI & AnalyticsAPI & AdminAPI & NotifyAPI --> DB

    %% Notes
    style Poster fill:#ede9fe,stroke:#7c3aed
    style Frontend fill:#dbeafe,stroke:#2563eb
    style DB fill:#fef3c7,stroke:#d97706
```

**Whole app sequence:**
`QR scan → Guest mint (ephemeral CUSTOMER) → Upload (analyze pages) → Configure (quote decompose → final) → Create Order INKO-YYYY → Payment MOCK_UPI verify PAID / COD → Token A001 WAITING → Shop Queue CALLED→PRINTING (decrement inventory)→COMPLETED → Customer Queue SSE live → History reprint → Shop Pricing/Inventory/QR → Admin Users/Orders/Complaints/Audit`

---

## 2. Guest via QR (Unauthenticated → Ephemeral CUSTOMER)

```mermaid
flowchart TD
    Start([Guest scans QR]) --> Resolve{GET /qr/:code/resolve<br/>permitAll ACTIVE?}
    Resolve -- 404/REPLACED/EXPIRED --> ErrQR["AlertTriangle QR not found<br/>Button Continue without QR → /upload"] --> UploadGuest
    Resolve -- 200 {shopId} --> Scan["POST /qr/:code/scan<br/>log QrScanEvent ip/ua"] --> FetchShop["GET /shops/:shopId<br/>permitAll"] --> Store["localStorage inko.qrShop=shopId"]
    Store --> HasToken{inko.access_token exists?}
    HasToken -- Yes --> UploadGuest
    HasToken -- No --> GuestMint["POST /api/auth/guest<br/>no body → 201 AuthResponse<br/>guest-UUID@guest.inko.local<br/>ROLE_CUSTOMER + JWT 15m/7d"] --> SetArea["setSessionArea customer<br/>tokens.set + GET /users/me"]
    SetArea --> UploadGuest["/upload?shopId&src=qr<br/>CustomerShell no AreaGuard"]
    UploadGuest --> BannerQR["Banner emerald QrCode Scanned at {shop}"]
    UploadGuest --> NameCard["Guest name Card<br/>Input guestName + Save & remember<br/>PATCH /users/me fullName→queue 👤"]
    UploadGuest --> Upsell["Upsell indigo LogIn / Create account → /login"]
    UploadGuest --> PreSel["Shop {name} pre-selected Clear X"]
    UploadGuest --> Drop["Dropzone dashed-2 p8 UploadCloud<br/>≤50MB ≤10 ext pdf/jpg…<br/>FileChip grid2 + X"]
    Drop --> AnalyzeBtn["Upload & analyze ArrowRight<br/>POST /documents/upload FormData<br/>Progress + spinner"] --> Analyzed["Analyzed success<br/>FileText + Badge mime + pages<br/>or pre analysis_summary"]
    Analyzed --> Continue["Continue to configure → /configure?shopId state docs"]
    Continue --> GuestQueue["Guest can track /order/:id /queue/:id<br/>via guest customerId token"]

    style GuestMint fill:#fef3c7,stroke:#d97706
    style ErrQR fill:#fee2e2,stroke:#dc2626
```

**Test path (browser explicit):** `http://localhost:5173/qr/TESTCODE → Network POST /auth/guest 201 → Application LocalStorage inko.access_token → DB guest-* → ShopPrint`

---

## 3. Customer (ROLE_CUSTOMER — Registered / Logged In)

```mermaid
flowchart TD
    CStart([Customer at /login<br/>Welcome unified]) --> Tabs{"Tabs Sign in / Create account<br/>Cards Customer FileText vs Shop Store"}
    Tabs -->|Create| RegCust["Register Customer<br/>User fullName 1-120<br/>Email @Email || Phone +?[0-9]{8,15} fullPhone<br/>Password 8-72 + confirm match<br/>strength bar len*12%"]
    RegCust --> POSTReg["POST /api/auth/register<br/>{fullName,email,phone,password,accountType CUSTOMER}<br/>409 if duplicate"] --> AuthRespCust["201 AuthResponse<br/>access 15m refresh 7d<br/>roles ROLE_CUSTOMER<br/>lastLoginRole customer"] --> DashCust
    Tabs -->|Sign in| Methods{"method Password / Phone OTP"}
    Methods -- Password --> LoginPwd["Mail identifier lower<br/>Lock password + Forgot? → /forgot-password<br/>Sign in ArrowRight"] --> POSTLogin["POST /auth/login<br/>findByEmailOrPhone + BCrypt requireActive<br/>lastLoginAt now"] --> AuthRespCust
    Methods -- OTP --> SendOTP["Country +91 + phone → Send OTP<br/>POST /auth/otp/request"] --> DevCode["200 delivered + devCode Alert info<br/>devMode + OtpIssue 6-digit SHA256 5m 5 attempts"] --> VerifyOTP["Input mono 6-digit → Verify<br/>POST /auth/otp/verify → AuthResponse"]
    VerifyOTP --> AuthRespCust
    AuthRespCust --> DashCust["/customer/dashboard<br/>AreaGuard customer + CustomerShell<br/>Hero Welcome back 👋<br/>Stats Shops online / Your orders<br/>Shops grid OPEN/BUSY Badge OPEN success"]
    
    DashCust --> UploadC["/upload<br/>Stepper Upload current0<br/>Dropzone → POST /documents/upload<br/>GET /documents list"] --> ConfigC["/configure?shopId<br/>Stepper Configure current1<br/>Select shop / QR locked emerald<br/>Options A4…legal BW/COLOR SINGLE/DOUBLE copies<br/>Pages ALL tip 1-5,8 + Tag coupon uppercase"]
    ConfigC --> Quote["POST /pricing/quote<br/>SHOP override PLATFORM<br/>decompose paper/color/side 50/50<br/>discount best + tax + minOrder<br/>→ YOU PAY ₹final"] --> CreateOrd["POST /api/orders<br/>items [{documentId paper color sides orientation AUTO pageSelection copies}]<br/>→ INKO-YYYY-###### CREATED + PrintConfiguration + OrderItem"]
    CreateOrd --> Detail["/order/:id poll 3s<br/>Receipt Badge + ₹ + Track queue Ticket<br/>Stepper PLACED→PAYMENT→QUEUED→PRINTING→COMPLETED<br/>Live Badge WAITING/Called/Printing/Completed + estimate"]
    Detail --> Pay{"Pay"}
    Pay -- MOCK_UPI --> Initiate["POST /orders/:id/payment {MOCK_UPI idempotencyKey}<br/>auto CREATED→CONFIGURED→PAYMENT_PENDING"] --> Verify["POST /payments/:id/verify<br/>PAID + paidAt + Order PAID→TOKEN_GENERATED→QUEUED<br/>tokens.generate A001 WAITING"] --> QueueC
    Pay -- COD --> CODP["POST payment {COD} → COD_SELECTED→QUEUED"] --> QueueC
    Detail --> RefundBtn["Request refund 10% fee Btn if PAID<br/>POST /orders/:id/refund → REQUESTED"] --> AdminDecideA["Admin POST /refunds/{id}/decision APPROVE→COMPLETED"]
    Detail --> Complaint["File complaint Dialog 9 categories<br/>POST /complaints OPEN"]
    
    QueueC["/queue/:shopId?order=<br/>Header Store Queue live SSE Radio/Emerald vs Polling amber<br/>Mine Card 5xl tokenNumber + Badge + Position<br/>Waiting list priority+issuedAt + At a glance"]
    QueueC --> HistoryC["/history<br/>GET /orders → Search + Status + Shop Select<br/>table Order mono8 Printer Badge Clock3 Amount<br/>Print again → /configure?reprint state docs"]
    HistoryC --> ProfileC["/customer/profile<br/>avatar 16x16 + Badge brand + dw Mail/Phone/ShopId<br/>Open settings + Sign out → POST /auth/logout → /login"]
    ProfileC --> Danger["DangerZone red Trash2 → Dialog password → DELETE /users/me → INACTIVE deleted-{id}"]
    ProfileC --> SettingsC["/customer/settings<br/>4 rows Bell/Volume2/Moon/Globe<br/>notifications sound darkMode language en-IN hi mr<br/>localStorage inko.settings + speech Test voice"]
    SettingsC --> BellC["NotificationsBell Bell h9 w9 badge red<br/>GET /notifications refetch30s + unread-count<br/>speak newest if sound"]
    
    %% Error branch
    LoginPwd -- 401 --> ErrLogin["401 INVALID_CREDENTIALS"]
    RegCust -- 409 --> ErrDup["409 Already exists"]
    Pay -- 409 --> ErrPay["409 Already paid"]
```

---

## 4. Shopkeeper (ROLE_SHOPKEEPER — Owner of shops.owner_user_id)

```mermaid
flowchart TD
    SStart([Shopkeeper at /shop/login<br/>or register type=shop]) --> RegShop["Register Shop Owner<br/>Welcome Store border oklch<br/>POST /auth/register accountType SHOP_OWNER<br/>→ CUSTOMER+SHOPKEEPER lastLoginRole shop"]
    RegShop --> LoginShop["/shop/login amber SHOP OS<br/>Mail+Lock / Phone OTP<br/>Sign in to shop ArrowRight<br/>canAccessShop = SHOPKEEPER|ADMIN"]
    LoginShop --> POSLog["POST /auth/login → ROLE_SHOPKEEPER perms shop:manage_own*8 + shopId primary"] --> ShopShell["ShopShell NAV5<br/>Dashboard/Queue/Shops/Pricing/QR<br/>SHOP OS amber + Bell low-stock<br/>footerShop"]
    
    ShopShell --> NeedShop{Mine shops?}
    NeedShop -- empty --> CreateShop["/shop/shops or /shop/queue empty Card<br/>Shop name* 150 + City + Create → POST /shops<br/>valid: name city if address pincode 5-6 Phone +91 LatLng bothOrNone → OPEN"]
    CreateShop --> DashShop
    NeedShop -- exists --> DashShop["/shop/dashboard<br/>GET /shops/mine → shopId<br/>GET /analytics/overview?shopId scoped<br/>GET /shops/{id}/queue 3 preview<br/>GET /orders/shop/{id} 5<br/>GET /printers + inventory + series"]
    DashShop --> KPIs["KPI Grid4<br/>Shop Orders today / Shop Revenue ₹<br/>Shops 1 openNow / In queue shownBelow"]
    DashShop --> Rev["Revenue by Day Card<br/>tabs hour1/day7/week30/year365 oklch + Badge INR<br/>Skeleton vs Empty noRevenueYet vs Bars gradient height v/maxRev<br/>year 365 grouped 12 months"]
    DashShop --> QPrev["QueueNow Timer No tokens dashed vs tokenNumber+Badge<br/>Open queue → /shop/queue"]
    DashShop --> Printers["Printers Card Printer<br/>Empty noPrinters vs row model paperSizes + Select IDLE…MAINTENANCE PATCH"]
    DashShop --> InvDash["PaperInventory Boxes<br/>row paperSize•gsm + −50 + qty + +50 + LOW amber + PUT /inventory"]
    DashShop --> Recent["RecentOrders Clock3 table Order Status Date Amount"]
    
    ShopShell --> QManage["/shop/queue<br/>GET /shops/mine → shopId<br/>GET /shops/{id}/queue poll 2500 + speak Token completed<br/>Auto 3500 WAITING→CALLED→PRINTING 2s→COMPLETED"]
    QManage --> QCtrl{"Queue controls"}
    QCtrl --> Auto["Auto checkbox localStorage inko.autoQueue + banner indigo"]
    QCtrl --> Live["Live badge emerald Live Radio vs amber Reconnecting + Filter ALL/WAITING/CALLED/PRINTING"]
    QCtrl --> NextTok["NextToken Card border indigo NOW SERVING 6xl + Badge + Actions lg<br/>WAITING Call customer CALLED Phone<br/>CALLED Printing started PRINTING<br/>PRINTING Hand over done COMPLETED emerald + Fail/Cancel ghost"]
    QCtrl --> Tokens["Tokens list flex rounded-2xl h12 w16 slate-900 + 👤 customerName + Actions sm"]
    NextTok --> Transitions["POST /tokens/{id}/transition CALLED→PRINTING→COMPLETED<br/>calledAt/startedAt/completedAt + queue WAITING→DONE<br/>sync Order QUEUED→PRINTING→COMPLETED<br/>decrement inventory -totalPages*copies + LOW_STOCK notify<br/>notify customer TOKEN_*"]
    
    ShopShell --> ShopsM["/shop/shops ShopManage<br/>grid card name Badge OPEN + MapPin lat + Resources/Edit/Delete"]
    ShopsM --> CrDialog["Dialog New shop<br/>name* + address1/2 + City* + State Pincode Phone +91<br/>Pick from map MapPicker OSM reverse → address1 city state postcode latlng + Create Save"]
    ShopsM --> EdDialog["Edit Pencil → GET /shops/{id} fresh + parse phone → PATCH 200 + await load GET /shops/mine"]
    ShopsM --> DelDialog["Delete Trash2 → password → DELETE /shops/{id} BCrypt → cascade"]
    ShopsM --> ResDialog["Resources Boxes → Dialog PAPERS_ALL 5 checkboxes + Badge LOW + Input qty + staged diff DELETE+PUT"]
    
    ShopShell --> Pricing["/shop/pricing<br/>tabs Price rules / Discounts"]
    Pricing --> RulesTab["Price rules table 20 combos Paper Color Badge Sides Market(state adj) + Your ₹/page Input + EffectiveFrom + existing ₹ / warning + Delete<br/>banner We filled Keep & Save All → loops POST /pricing/rules or PUT"]
    Pricing --> DiscTab["Discounts grid TicketPercent + Badge ACTIVE + Attach coupon prompt → POST /discounts SHOP + POST /discounts/{id}/coupon code upper"]
    
    ShopShell --> QRShop["/shop/qr<br/>Select shop w64 + Generate new QR + Open shop print ExternalLink<br/>sky http://lanIp:5173<br/>QRCodeSVG 240 level H + mono code + Badge ACTIVE + CopyCheck + Download + Regenerate RefreshCw<br/>history table When Scanned by ip max-h72<br/>REPLACED chain"]
    QRShop --> ScanHist["GET /shops/{id}/qr/scans enriched"]
    
    ShopShell --> ProfShop["/shop/profile → Badge SHOPKEEPER"]
    ShopShell --> SettShop["/shop/settings 4 rows same as customer"]

    style Transitions fill:#fef3c7,stroke:#d97706
```

---

## 5. Admin / Super Admin (ROLE_ADMIN | SUPER_ADMIN — Governance)

```mermaid
flowchart TD
    AStart([Admin at /admin/login<br/>ShieldCheck gradient]) --> LoginAdmin["Mail identifier lower + Lock password<br/>Sign in to admin ArrowRight<br/>canAccessAdmin = ADMIN|SUPER_ADMIN"] --> POSAdmin["POST /auth/login → ROLE_ADMIN perms 21 + lastLoginRole admin"]
    POSAdmin --> AdminShell["AdminShell NAV6<br/>Overview/Shops/Users/Orders/Complaints/Audit<br/>ADMIN indigo + Bell refund/complaint"]
    
    AdminShell --> DashAdmin["/admin/dashboard<br/>GET /analytics/overview platform + GET /shops all sorted + GET /actuator/health + GET /mix + series 7"]
    DashAdmin --> StatsAdmin["Grid4 Activity Total Orders / IndianRupee Total Revenue / Building2 Shops / Users Active<br/>Shops table Search shops + System health Backend/DATABASE + mix Progress + series 7 Bars"]
    
    AdminShell --> ShopsAdmin["/admin/shops<br/>GET /shops admin all → grid3 Building2 + Badge OPEN/CLOSED + View live queue → /queue/:id"]
    AdminShell --> UsersAdmin["/admin/users<br/>GET /admin/users?size100 + /admin/users/count {total,active}<br/>Search name/email/phone + table Name mono + Contact + Roles brand + Status success<br/>canEdit != self → Edit roles checkboxes 4 + Save → PATCH /admin/users/{id}/roles<br/>Suspend ShieldAlert → PATCH /status SUSPENDED/ACTIVE → audit ADMIN_ROLE_CHANGED<br/>self-suspend blocked 400 You cannot change…"]
    AdminShell --> OrdersAdmin["/admin/orders<br/>GET /shops → shopNames + Promise.all GET /orders/shop/{id} per shop flat sort desc<br/>Select All shops filter + table Order mono8 Printer Badge Clock3 Amount + Open → /order/:id"]
    OrdersAdmin --> DetailAdmin["/order/:id as admin<br/>same as customer + refunds Approve/Reject if REQUESTED → POST /refunds/{id}/decision APPROVE→COMPLETED Payment REFUNDED"]
    
    AdminShell --> CompAdmin["/admin/complaints<br/>GET /complaints?size100 cards mono + category + Badge success/danger + description bg-slate-50<br/>Select filter ALL… + Search<br/>Label Set status Select → PATCH /complaints/{id} status<br/>Input Resolution + Resolve → RESOLVED"]
    
    AdminShell --> AuditAdmin["/admin/audit<br/>GET /admin/audit?page&size25 → content totalPages<br/>table When Actor Badge SUPER_ADMIN brand id8 Action mono Resource Detail truncate<br/>Page x of y Previous/Next"]
    AuditAdmin --> AuditNote["audit_logs append-only REVOKE UPDATE/DELETE if inko_app exists<br/>mutable via JpaRepository otherwise"]
    
    AdminShell --> ProfAdmin["/admin/profile Badge ADMIN"]
    AdminShell --> SettAdmin["/admin/settings 4 rows"]
    AdminShell --> QRAdmin["GET /api/admin/qr?shopId list all QRs (hidden endpoint)"]
    AdminShell --> SecCheck["Any auth CUSTOMER→/admin/dashboard<br/>AreaGuard Different console required Customer→Admin<br/>anyRequest CUSTOMER GET /admin/users → 403 FORBIDDEN"]
```

---

## 6. Detailed Sequence — Order → Payment → Token → Queue (Cross-Actor Core)

```mermaid
sequenceDiagram
    participant Cust as Customer (Browser)
    participant FE as Frontend<br/>Configure / OrderDetail
    participant OrdAPI as Order API
    participant PayAPI as Payment API<br/>MOCK
    participant Tok as TokenService
    participant Shop as Shopkeeper<br/>QueueManage
    participant CustQ as Customer<br/>Queue Track
    
    Cust->>FE: docs + shopId + paper BW/COLOR<br/>SINGLE/DOUBLE pages ALL cop copies
    FE->>OrdAPI: POST /api/pricing/quote<br/>→ PriceBreakdown (SHOP>PLATFORM)
    FE->>OrdAPI: POST /api/orders<br/>→ INKO-YYYY-###### CREATED
    FE->>PayAPI: POST /orders/{id}/payment {MOCK_UPI idempotencyKey}
    Note over PayAPI: auto CREATED→CONFIGURED→PAYMENT_PENDING<br/>if COD→COD_SELECTED else PENDING
    PayAPI->>PayAPI: POST /payments/{id}/verify<br/>PAID paidAt + Order PAID→TOKEN_GENERATED→QUEUED<br/>tokens.generate A001 WAITING
    PayAPI-->>FE: PAID + Token ISSUED (Notify)
    Shop->>Tok: GET /shops/{id}/queue poll 2500 + SSE 60s
    CustQ->>Tok: GET /shops/{id}/queue?order= + GET /tokens/{id}/wait<br/>waitingAhead priority+issuedAt<br/>estimate 0.4*pages+1*job
    Shop->>Tok: POST /tokens/{id}/transition CALLED<br/>calledAt + queue CALLED + notify Your turn
    Note over Tok: auto 2s → PRINTING
    Shop->>Tok: POST PRINTING<br/>startedAt + queue PROCESSING<br/>inventory -totalPages*copies*? + LOW_STOCK check
    Shop->>Tok: POST COMPLETED<br/>completedAt + queue DONE + Order COMPLETED<br/>notify Print completed
    CustQ->>CustQ: Mine Card 5xl token → READY
```

---

## 7. Notes — How to View

- Paste each `mermaid` block into [mermaid.live](https://mermaid.live) or VS Code `Markdown Preview Mermaid` extension.
- Export PNG/PDF for docs/print.
- Whole App diagram shows **infra flaw** `PG 0xC0000142` infra (10 BLOCKED) vs code PASS separation — re-run after Docker PG fix flips BLOCKED→PASS.

