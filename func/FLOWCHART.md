# Inko — Exhaustive Flow Charts — Every Actor, Service, State & Error Branch
**Version:** 3.0 — Redo Exhaustive 2026-08-29 20:00 IST (Every little thing)
**Date:** 2026-08-29 20:00 IST — Redone per phases
**Source:** `backend/src/**` (124 files), `frontend/src/**` (1952 modules), `db/migration V1-V12`, `SecurityConfig`, `App.tsx`, `*.tsx pages`, `PrintCalc`, `TokenService`, `OrderService`, `PaymentService`, `PricingService`
**Format:** Mermaid `flowchart TD` + `sequenceDiagram` + `stateDiagram-v2` — paste any block into [mermaid.live](https://mermaid.live) or VS Code `Markdown Preview Mermaid`

---

## Legend — How To Read
- `([ ])` = entry/exit terminal
- `{ }` = decision / guard
- `[ ]` = process / API call / UI component
- `[( )]` = DB / poster / external
- `A -->|label| B` = transition with HTTP / event
- Colors: `Guest #fef3c7`, `Customer #dbeafe`, `Shop #fef9c3`, `Admin #ede9fe`, `Error #fee2e2`
- All HTTP routes prefixed `/api` unless noted; `permitAll` = no JWT required

---

## 1. Whole App — Infrastructure & System Overview (All Actors + Services + DB)

```mermaid
flowchart TD
    Poster[("📮 QR Poster<br/>code_value UNIQUE 64<br/>status ACTIVE|REPLACED|EXPIRED<br/>shop_id FK")]
    Browser["Browser SPA<br/>http://localhost:5173<br/>Vite + React Router"]
    Frontend["Frontend React Shell<br/>App.tsx 100L<br/>AuthProvider + SettingsProvider<br/>AreaGuard customer|shop|admin<br/>CustomerShell / ShopShell / AdminShell"]
    AuthAPI["Auth API<br/>/api/auth/guest<br/>/api/auth/register|login|refresh|logout<br/>/api/auth/otp/request|verify<br/>/api/auth/forgot-password<br/>JWT access 15m / refresh 7d<br/>BCrypt 10 / OTP SHA256 5m 5 attempts"]
    ShopAPI["Shop API<br/>GET /api/shops permitAll<br/>GET /api/shops/:id permitAll<br/>GET /api/shops/mine auth SHOPKEEPER<br/>POST /api/shops auth SHOPKEEPER<br/>PATCH /api/shops/:id owner<br/>DELETE /api/shops/:id BCrypt<br/>GET /api/shops/:id/qr/scans owner"]
    DocAPI["Document API<br/>POST /api/documents/upload<br/>FormData files*10 ≤50MB<br/>ext pdf/jpg/png/doc/ppt/xls/txt<br/>analyze pageCount blankPages<br/>GET /api/documents auth"]
    PricingAPI["Pricing API<br/>POST /api/pricing/quote auth?<br/>SHOP rule override PLATFORM<br/>inputs shopId paperSize colorMode sidesMode selectedPageCount copies coupon<br/>→ PriceBreakdown sheets/printedPages<br/>GET /api/pricing/rules owner-checked<br/>POST/PUT/DELETE rules shop/admin"]
    OrderAPI["Order API<br/>POST /api/orders → INKO-YYYY-######<br/>GET /api/orders mine<br/>GET /api/orders/:id auth+ownership<br/>GET /api/orders/shop/:id (shop/admin)<br/>POST /api/orders/:id/status"]
    PaymentAPI["Payment API<br/>POST /api/orders/:id/payment<br/>method MOCK_UPI|COD<br/>idempotencyKey UNIQUE<br/>providerOrderRef<br/>POST /api/payments/:id/verify<br/>GET /api/orders/:id/payment<br/>POST /api/orders/:id/refund REQUESTED"]
    TokenAPI["Token API<br/>POST /api/tokens<br/>GET /api/shops/:id/queue<br/>POST /api/tokens/:id/transition<br/>GET /api/tokens/:id<br/>GET /api/tokens/:id/wait<br/>GENERATED→WAITING→CALLED→PRINTING→COMPLETED<br/>priority 10/20/100/200"]
    QueueEntryDB[("QueueEntry<br/>queue_entries<br/>token_id UNIQUE<br/>shop_id position queuedAt<br/>status WAITING|CALLED|PRINTING|COMPLETED")]
    QueueSSE["SSE Stream<br/>GET /api/shops/:id/queue/stream 60s<br/>SseEmitter CopyOnWriteArray<br/>event token / connected"]
    InventoryAPI["Inventory API<br/>GET /api/catalog/inventory<br/>PUT /api/catalog/inventory<br/>paperSize gsm quantity lowStockThreshold"]
    QrAPI["QR API<br/>GET /api/qr/:code/resolve permitAll<br/>POST /api/qr/:code/scan permitAll<br/>POST /api/shops/:id/qr/regenerate owner<br/>GET /api/shops/:id/qr/history"]
    AnalyticsAPI["Analytics API<br/>GET /api/analytics/overview?shopId scoped<br/>GET /api/analytics/series?days&shopId<br/>GET /api/analytics/mix<br/>GET /api/analytics/revenue"]
    AdminAPI["Admin API<br/>GET /api/admin/users?size100<br/>PATCH /api/admin/users/:id/roles<br/>PATCH /api/admin/users/:id/status<br/>GET /api/admin/audit page25<br/>GET+PATCH /api/complaints<br/>POST /api/refunds/:id/decision"]
    NotifyAPI["Notification API<br/>GET /api/notifications<br/>GET /api/notifications/unread-count<br/>POST /api/notifications/:id/read<br/>poll 30s + SSE"]
    ComplaintAPI["Complaint API<br/>POST /api/complaints<br/>9 categories WRONG_PRINT..OTHER"]
    DB[("PostgreSQL 17<br/>28 tables V1-V12<br/>users/roles/perms/shop/printers<br/>documents/order_items/pricing_rules<br/>payments/refunds/tokens/queue_entries<br/>qr_codes/qr_scan_events/inventory<br/>notifications/audit_logs/system_settings")]
    Storage[("File Storage<br/>backend/data/storage<br/>disk fallback")]
    Poster -->|scan /qr/:code| Browser
    Browser --> Frontend
    Frontend -->|GET /qr/:code/resolve 200 shopId<br/>POST /qr/:code/scan log ip/ua| QrAPI
    Frontend -->|POST /auth/guest 201 guest@guest<br/>POST /auth/register 201<br/>POST /auth/login + OTP<br/>POST /auth/refresh single-flight| AuthAPI
    Frontend -->|POST /documents/upload FormData<br/>progress onUploadProgress<br/>GET /documents| DocAPI
    Frontend -->|POST /pricing/quote<br/>shopId paperSize color sides selectedPageCount copies coupon| PricingAPI
    Frontend -->|POST /api/orders<br/>GET /orders /history<br/>GET /orders/shop/:id| OrderAPI
    Frontend -->|POST /orders/:id/payment MOCK_UPI|COD<br/>idempotencyKey<br/>POST /payments/:id/verify| PaymentAPI
    PaymentAPI -->|PAID→tokens.generate A001 WAITING<br/>idempotent by orderId| TokenAPI
    PaymentAPI -->|COD_SELECTED→generate WAITING| TokenAPI
    TokenAPI -->|WAITING→CALLED→PRINTING→COMPLETED<br/>synced queue_entries| QueueEntryDB
    TokenAPI -->|PRINTING once<br/>sheets=ceil(printedPages/1or2)<br/>deduct inventory paperSize-matched<br/>LOW_STOCK threshold cross only| InventoryAPI
    TokenAPI -->|TOKEN_CALLED/PRINTING/COMPLETED| NotifyAPI
    TokenAPI -->|order QUEUED→PRINTING→COMPLETED<br/>or FAILED| OrderAPI
    Frontend -->|GET /shops/:id/queue poll2500/5000<br/>GET /tokens/:id/wait<br/>EventSource SSE 60s| QueueSSE
    QueueSSE -->|broadcast token DTO| Frontend
    Frontend -->|GET /analytics/overview?shopId<br/>GET /series?days 1/7/30/365| AnalyticsAPI
    Frontend -->|GET /admin/users|audit<br/>PATCH roles/status<br/>GET /complaints PATCH<br/>POST /refunds/:id/decision| AdminAPI
    Frontend -->|POST /complaints OPEN| ComplaintAPI
    Frontend -->|GET /notifications<br/>POST /read| NotifyAPI
    Frontend -->|GET /shops/mine PUT /inventory<br/>POST qr/regenerate<br/>GET /net/lan-ip| ShopAPI
    DocAPI & ShopAPI & PricingAPI & OrderAPI & PaymentAPI & TokenAPI & QueueEntryDB & InventoryAPI & QrAPI & AnalyticsAPI & AdminAPI & NotifyAPI & ComplaintAPI --> DB
    DocAPI --> Storage
    style Poster fill:#ede9fe,stroke:#7c3aed
    style Frontend fill:#dbeafe,stroke:#2563eb
    style DB fill:#fef3c7,stroke:#d97706
    style PaymentAPI fill:#dcfce7,stroke:#16a34a
    style TokenAPI fill:#fef9c3,stroke:#ca8a04
```

**End-to-end happy sequence:** `QR ACTIVE poster → Browser /qr/:code → resolve 200 → scan log → localStorage inko.qrShop → guest mint (ephemeral CUSTOMER JWT) → Upload FormData → analyze pageCount → Configure select shop/paper/BW-COLOR/SINGLE-DOUBLE/pages ALL or 1-5,8/copies/coupon → POST /pricing/quote (SHOP>PLATFORM, decompose, best discount, tax, minOrder) → YOU PAY ₹final → POST /orders INKO-YYYY-###### CREATED (PrintConfiguration + OrderItem per doc, totalPages=Σ printedPages, snapshot sheets) → POST /orders/:id/payment MOCK_UPI idempotencyKey → CREATED→CONFIGURED→PAYMENT_PENDING auto → provider createCheckout → POST /payments/:id/verify → PAID → Order PAID → tokens.generate A%03d priority NORMAL100 → Token GENERATED→WAITING + QueueEntry WAITING → notify TOKEN_ISSUED → Customer Queue /queue/:shopId SSE live → Shop QueueManage poll+SSE → WAITING→CALLED (calledAt) → notify Your turn → auto 2s → PRINTING (startedAt, inventory -sheets once, low-stock check paperSize-matched, notify Printing started, Order QUEUED→PRINTING) → COMPLETED (completedAt, QueueEntry COMPLETED, Order COMPLETED, notify Print completed) → History GET /orders search → Print again /configure?reprint with shop/docs preserved → Shop Pricing/Inventory/QR → Admin Users/Orders/Complaints/Audit overview`

---

## 2. State Machines — Single Source Of Truth

### 2.1 Order Status (OrderStatus.java)

```mermaid
stateDiagram-v2
    [*] --> CREATED : POST /orders
    CREATED --> CONFIGURED : initiate payment auto
    CREATED --> CANCELLED : cancel before pay
    CONFIGURED --> PAYMENT_PENDING : auto
    CONFIGURED --> CANCELLED
    PAYMENT_PENDING --> PAID : MOCK_UPI verify ok
    PAYMENT_PENDING --> COD_SELECTED : COD
    PAYMENT_PENDING --> FAILED : verify fails
    PAYMENT_PENDING --> CANCELLED : user cancel
    PAID --> TOKEN_GENERATED : internal 1ms
    COD_SELECTED --> TOKEN_GENERATED
    TOKEN_GENERATED --> QUEUED : internal
    QUEUED --> PRINTING : token PRINTING
    QUEUED --> ACCEPTED : legacy (optional)
    QUEUED --> CANCELLED : cancel queue
    QUEUED --> CANCELLATION_REQUESTED : customer asks
    ACCEPTED --> PRINTING
    ACCEPTED --> CANCELLED
    ACCEPTED --> FAILED
    PRINTING --> COMPLETED : token COMPLETED
    PRINTING --> FAILED : token FAILED + notify + refund path
    PRINTING --> CANCELLED
    FAILED --> RETRY_PENDING : admin retry
    FAILED --> CANCELLED
    RETRY_PENDING --> PRINTING
    CANCELLATION_REQUESTED --> CANCELLED
    CANCELLATION_REQUESTED --> REFUND_PENDING
    CANCELLATION_REQUESTED --> QUEUED : reject cancel
    REFUND_PENDING --> REFUNDED : admin APPROVE full
    REFUND_PENDING --> CANCELLED
    COMPLETED --> REFUND_PENDING : refund flow via Payment/Refund not Order COMPLETED
    CANCELLED --> [*]
    REFUNDED --> [*]
    COMPLETED --> [*]
    FAILED --> [*]
```

**Rule:** Never use `COMPLETED` for FAILED/CANCELLED. Frontend stepper `stepIndex`: 0 PLACED, 1 PAYMENT, 2 QUEUED, 3 PRINTING, 4 COMPLETED. Badge tones: success COMPLETED, danger CANCELLED/FAILED, brand PAID/QUEUED.

### 2.2 Token Status (TokenStatus.java) — Strict Validation

```mermaid
stateDiagram-v2
    [*] --> GENERATED : generate()
    GENERATED --> WAITING : immediate promote
    GENERATED --> CANCELLED : cancel before call
    WAITING --> CALLED : shop POST /transition CALLED
    WAITING --> LATE : missed call
    WAITING --> CANCELLED
    WAITING --> FAILED : Fail button
    CALLED --> PRINTING : Printing started
    CALLED --> CANCELLED
    CALLED --> FAILED
    LATE --> WAITING : re-queue
    LATE --> CALLED : recall
    LATE --> CANCELLED
    PRINTING --> COMPLETED : Hand over done
    PRINTING --> FAILED : print error
    PRINTING --> CANCELLED
    FAILED --> WAITING : retry
    FAILED --> CANCELLED
    COMPLETED --> [*]
    CANCELLED --> [*]
```

**Invalid rejected 400:** `WAITING→COMPLETED`, `COMPLETED→PRINTING`, `COMPLETED→CALLED`, `CANCELLED→any`, `GENERATED→PRINTING`. Backend `Token.canTransitionTo` enforced; frontend `NEXT_ACTION` only shows valid target per status.

### 2.3 QueueEntry Status (queue_entries table) — Aligned To Token
- `WAITING` ↔ Token WAITING (in queue)
- `CALLED` ↔ Token CALLED (called to counter)
- `PRINTING` ↔ Token PRINTING (on printer)
- `COMPLETED` ↔ Token COMPLETED (done to collect) — *was DONE legacy, now standardized*
- `CANCELLED` / `FAILED` ↔ Token CANCELLED/FAILED → removed from active queue `findQueue WAITING|CALLED|PRINTING` only
- **Idempotency:** `token_id UNIQUE` prevents 1 order → 1 token → 1 queueEntry duplicate.

### 2.4 Payment / Refund Separation

```mermaid
flowchart TD
    PayPending[PAYMENT PENDING] --> PayPaid[PAID paidAt]
    PayPending --> PayFailed[FAILED]
    PayPaid --> PayRefundPend[REFUND_PENDING]
    PayPaid --> PayPartial[PARTIALLY_REFUNDED]
    PayPartial --> PayRefunded[REFUNDED]
    PayRefundPend --> PayRefunded

    RefNone[NONE] --> Req[REQUESTED POST /orders/:id/refund 10% fee]
    Req --> Appr[APPROVED admin decide]
    Req --> Rej[REJECTED]
    Appr --> Comp[COMPLETED if total >= paid else APPROVED]
    Comp --> OrderRefund[Order REFUNDED if full else stays]
```

Order status ≠ Payment status ≠ Refund status kept separate; `Order COMPLETED` never means `Refund COMPLETED`.

---

## 3. Guest via QR (Unauthenticated → Ephemeral CUSTOMER)

```mermaid
flowchart TD
    Start([Guest scans QR poster<br/>camera / link /qr/:code]) --> Resolve{GET /api/qr/:code/resolve<br/>permitAll<br/>DB qr_codes code_value UNIQUE 64}
    Resolve -- 404 not found --> ErrQR["Card AlertTriangle QR not found<br/>text Invalid or expired<br/>Button Continue without QR → /upload<br/>no shopId assumed"] --> UploadGuest
    Resolve -- 200 status REPLACED --> ErrReplaced["Banner amber QR replaced<br/>REPLACED chain show old→new<br/>Continue without QR"] --> UploadGuest
    Resolve -- 200 status EXPIRED --> ErrExp["Banner amber Expired<br/>Continue without QR"] --> UploadGuest
    Resolve -- 200 status ACTIVE 200 {shopId, status, shopSnapshot} --> Scan["POST /api/qr/:code/scan permitAll<br/>insert qr_scan_events qrId ip ua createdAt<br/>200 ok"] --> FetchShop["GET /api/shops/:shopId permitAll<br/>fields id name city status OPEN lat lng supportsColor"] --> Store["localStorage set inko.qrShop=shopId<br/>JSON {shopId,name,code}"]
    Store --> HasToken{localStorage inko.access_token exists?<br/>& not expired 15m}
    HasToken -- Yes (returning guest) --> UploadGuest
    HasToken -- No --> GuestMint["POST /api/auth/guest<br/>no body expected 201<br/>creates user guest-UUID@guest.inko.local<br/>fullName Guest role CUSTOMER<br/>issue JWT access 15m + refresh 7d<br/>tokens.set(access,refresh)<br/>setSessionArea customer"] --> SetArea["setSessionArea customer<br/>localStorage inko.lastLoginRole=customer<br/>GET /api/users/me refreshMe()"]
    SetArea --> UploadGuest["Route /upload?shopId=xxx&src=qr<br/>inside CustomerShell (no AreaGuard)<br/>Stepper.Upload current0"]
    UploadGuest --> BannerQR["UI Banner emerald border<br/>Icon QrCode + text Scanned at {shop.name} — {city}<br/>priority scan"]
    UploadGuest --> NameCard["Card Guest name<br/>Label Your name — so shop knows<br/>Input guestName 120 max + Save & remember<br/>on Save PATCH /api/users/me {fullName}<br/>sync localStorage inko.guestName<br/>error 401 if not authed"]
    UploadGuest --> Upsell["Upsell Card indigo 50/70<br/>text Want to keep history?<br/>Buttons LogIn → /login?next=/upload?shopId...<br/>Create account → /register?next=..."]
    UploadGuest --> PreSel["Chip Shop pre-selected {name} — {city}<br/>Badge QR emerald<br/>Button Clear X → /upload remove query"]
    UploadGuest --> Drop["Dropzone Card dashed-2 p8<br/>Icon UploadCloud h7<br/>Text Drop files or browse<br/>Button Browse files accept pdf/jpg/png/doc/ppt/xls/txt<br/>Limits ≤50MB per file ≤10 files<br/>Files chips grid2 File icon + name + bytes + X remove"]
    Drop --> Validate{files >0 selected?<br/>size & ext valid?}
    Validate -- no --> ErrNoFile["Alert no files → Select at least one"]
    Validate -- yes with over 50MB --> ErrSize["Alert N file(s) exceed 50MB"]
    Validate -- yes valid --> AnalyzeBtn["Button primary Upload & analyze ArrowRight h4<br/>creates FormData files[]<br/>POST /api/documents/upload<br/>header multipart/form-data<br/>onUploadProgress → Progress 0-95%<br/>spinner border-slate-200 border-t oklch"] --> Analyzed["Card success emerald Check<br/>per doc: thumbnail 20x14 + filename<br/>Badge mime + Badge pages + Badge blank amber<br/>blankPages array join , and bg-amber-50<br/>fallback Raw JSON if shape unknown"]
    Analyzed --> Continue["Button secondary Continue to configure →<br/>nav /configure?shopId=xxx state docs normalized<br/>docsArray = Array.isArray(result)?result:result.documents ?? result.data"]
    Continue --> GuestQueue["Guest retains guest customerId<br/>can track /order/:id + /queue/:shopId?order= orderId<br/>poll 3s + SSE live"]
    style GuestMint fill:#fef3c7,stroke:#d97706
    style ErrQR fill:#fee2e2,stroke:#dc2626
    style ErrReplaced fill:#fef3c7,stroke:#ca8a04
```

**Auth details:** `POST /auth/guest` idempotent? No — creates new guest each call; frontend guards with `guestTried` flag + `tokens.access` check to mint once.

---

## 4. Customer (ROLE_CUSTOMER — Registered / Logged In)

```mermaid
flowchart TD
    CStart([Customer lands /login<br/>Welcome unified AreaHome logic]) --> Tabs{"UI Tabs Sign in | Create account<br/>Cards Customer FileText vs Shop Store"}
    Tabs -->|Create account click| RegCust["Form Register Customer<br/>Inputs fullName 1-120 required<br/>Email @Email xor Phone +?[0-9]{8,15} + fullPhone<br/>Country Select +91 default<br/>Password 8-72 + confirm match live<br/>strength bar width len*12% color weak→strong<br/>AccountType hidden CUSTOMER"]
    RegCust --> ValidateReg{valid?}
    ValidateReg -- no --> ErrReg["Field errors red<br/>confirm mismatch, email invalid"]
    ValidateReg -- yes --> POSTReg["POST /api/auth/register<br/>body {fullName,email,phone,password,accountType CUSTOMER}<br/>409 Duplicate if email/phone exists<br/>hash BCrypt 10, insert users + user_roles CUSTOMER<br/>201 AuthResponse {accessToken 15m, refreshToken 7d, user}"] --> AuthRespCust["Client tokens.set + setSessionArea customer<br/>GET /users/me → user.roles [CUSTOMER]<br/>localStorage lastLoginRole=customer"]
    Tabs -->|Sign in| Methods{"Toggle method Password / Phone OTP"}
    Methods -- Password --> LoginPwd["Form Sign in<br/>Input identifier Mail lowerTrim<br/>Input password Lock eye<br/>Link Forgot? → /forgot-password<br/>Button primary Sign in ArrowRight"]
    LoginPwd --> POSTLogin["POST /api/auth/login<br/>{identifier,password}<br/>findByEmailOrPhone case-insensitive<br/>BCrypt verify + requireActive status ACTIVE<br/>update lastLoginAt now<br/>issue JWT + refresh<br/>200 AuthResponse"] --> AuthRespCust
    LoginPwd -- 401 --> ErrLogin["Alert 401 INVALID_CREDENTIALS<br/>clear password"]
    RegCust -- 409 --> ErrDup["Alert 409 Already exists<br/>link to sign in"]
    Methods -- OTP --> SendOTP["Form OTP<br/>Select country +91 + Input phone<br/>Button Send OTP"] --> POSTOtpReq["POST /api/auth/otp/request<br/>{identifier phone}<br/>generate 6-digit SHA256 random<br/>insert otp_codes expires 5m attempts 0 consumed null<br/>devMode 200 {delivered, devCode}"] --> DevCode["Alert info indigo devCode mono<br/>pass to Verify"] --> VerifyOTP["Input otp 6 boxes mono<br/>Button Verify"] --> POSTVerify["POST /api/auth/otp/verify<br/>{identifier,code}<br/>check expires + attempts<5 + hash match<br/>if ok mark consumedAt now<br/>issue AuthResponse"] --> AuthRespCust
    POSTVerify -- fail --> ErrOTP["Alert wrong code / expired / 5 attempts exceeded"]
    AuthRespCust --> DashCust["Route /customer/dashboard<br/>AreaGuard customer + CustomerShell header<br/>Hero Welcome back 👋 Hello {fullName}<br/>Stats Cards: Shops online count GET /shops filter OPEN/BUSY<br/>Your orders count GET /orders<br/>Shops grid cards Store icon + name city + Badge OPEN success/BUSY warning + Button Open shop"]
    DashCust --> UploadC["Route /upload<br/>Stepper Upload current0<br/>fromQr Banner if ?shopId&src=qr<br/>Guest name card + Upsell if guest<br/>Dropzone dashed → File chips<br/>Button Upload & analyze → POST /documents/upload<br/>Result Cards per doc pages mime blank<br/>Button Continue to configure"]
    UploadC --> ConfigC["Route /configure?shopId&reprint?<br/>Stepper Configure current1<br/>Props docs[] from location.state<br/>State shops GET /shops list<br/>shopId useState qrShopId? locked: select<br/>QR locked Card emerald QrCode + {shop name} + Badge QR<br/>else Select shop dropdown + p city status<br/>Print options Card:<br/>Paper A4/A3/A5/LETTER/LEGAL Select<br/>Color BW COLOR Select<br/>Sides SINGLE DOUBLE Select<br/>Copies Input 1-100<br/>Pages Input ALL placeholder tip 1-5,8<br/>Coupon Input uppercase TAG + Apply Button secondary"]
    ConfigC --> CountPages["JS countPages(sel,total) mirrors PrintCalc<br/>if ALL → total<br/>else split , sum range 1-5 →5 etc<br/>parsedPages = countPages(pages, doc.pages|pageCount|5)"]
    CountPages --> Quote["SideEffect 600ms debounce<br/>POST /api/pricing/quote  body {shopId,paperSize,colorMode,sidesMode,pages:parsedPages,copies,specialPaper false,couponCode upper?<br/>Shop override PLATFORM resolve<br/>sheetsPerCopy DOUBLE?(pages+1)/2:pages<br/>sheets=sheetsPerCopy*copies<br/>printedPages=pages*copies<br/>subtotal=unitPrice*printedPages<br/>specialCharge spc*sheets if any<br/>decompose 50/50<br/>best discount → afterDiscount<br/>tax = after*taxPercent/100<br/>final = after+tax clamp minOrderAmount<br/>→ PriceBreakdown {unitPrice pages copies sheets printedPages subtotal paper/color/side/special discount tax final currency ruleId}"] --> QuoteUI["UI YOU PAY ₹final emerald<br/>text For {pages}×{copies} incl taxes<br/>Breakdown Card paper/color/side/special/discount/tax/Final<br/>Confirm button Yes print ArrowRight"]
    Quote -- error 400 pages<=0 --> ErrQuote["Alert ValidationFailed pages>0"]
    Quote -- error 404 pricing not configured --> ErrPricing["Alert No pricing for A4/BW/SINGLE"]
    Quote -- coupon invalid --> ErrCoupon["Alert Invalid coupon 400"]
    QuoteUI --> CreateOrd["Button Confirm & print<br/>check docIds.length + shopId<br/>build payload {shopId,couponCode,items:[{documentId,paperSize,colorMode,sidesMode,orientation AUTO,pageSelection pages,copies}] xN}<br/>POST /api/orders<br/>backend validate shop exists & OPEN else 400<br/>per doc parse selPages, quote, sum totalPages, subtotal,discount,tax,final<br/>insert Order INKO-YYYY-###### status CREATED + configs + items (itemSubtotal per item = bd.finalAmount)<br/>201 Order"] --> Detail["Route /order/:id poll 3s<br/>Card Header Order mono + Badge status brand|success + ₹final<br/>Stepper timeline PLACED→PAYMENT→QUEUED→PRINTING→COMPLETED<br/>Live Token Badge WAITING/Called/Printing/Completed + estimate<br/>Items list documents + copies/pages<br/>Pricing snapshot json<br/>Payment Card + Refund/Complaint"]
    Detail --> Pay{"Pay decision<br/>order.status check"}
    Pay -- status not CREATED/CONFIGURED/PAYMENT_PENDING --> PayDone["Banner emerald Payment already {status}<br/>track queue instead<br/>hide Pay buttons"]
    Pay -- MOCK_UPI --> Initiate["POST /api/orders/:id/payment {MOCK_UPI idempotencyKey uuid}<br/>auto CREATED→CONFIGURED→PAYMENT_PENDING<br/>if idempotencyKey repeat return existing<br/>if payment for order exists return existing<br/>insert payment PENDING provider MOCK providerOrderRef checkout"] --> Verify["POST /api/payments/:id/verify {}<br/>provider verify true → payment PAID paidAt + notify PAYMENT_CONFIRMED<br/>idempotent if already PAID skip<br/>order PAYMENT_PENDING→PAID via transition<br/>if already QUEUED skip token dup<br/>→ token A001 WAITING + notify TOKEN_ISSUED<br/> else  if verify false → payment FAILED + order PAYMENT_PENDING→FAILED"] --> QueueC["Route /queue/:shopId?order=<br/>Header Queue live badge SSE emerald Live Radio vs Polling amber 2500ms<br/>Mine Card 5xl tokenNumber + Badge WAITING|CALLED|PRINTING|COMPLETED + Position + estimate<br/>Waiting list priority+issuedAt + At a glance"]
    Pay -- COD --> CODP["POST /api/orders/:id/payment {COD}<br/>same auto transitions<br/>insert payment PAID immediately<br/>order COD_SELECTED → token WAITING idempotent<br/>no verify needed"] --> QueueC
    Detail --> RefundBtn["UI Button Request refund 10% fee<br/>show if status PAID|COD_SELECTED|TOKEN_GENERATED|QUEUED|PRINTING and no REQUESTED refund<br/>POST /orders/:id/refund {reason}<br/>200 Refund REQUESTED net=gross-10%"] --> RefundList["List refunds Badge REQUESTED→APPROVED→COMPLETED<br/>admin Approve/Reject via /refunds/:id/decision"] --> AdminDecideA["Admin decides APPROVED→COMPLETED?"] 
    Detail --> Complaint["Button File complaint Dialog<br/>Select category 9 WRONG_PRINT..OTHER<br/>Textarea description<br/>POST /api/complaints {orderId,shopId,category,description} → OPEN<br/>admin resolves PATCH"]
    QueueC --> HistoryC["Route /history<br/>GET /api/orders mine<br/>Controls Search orderNumber/status + Status Select + Shop Select<br/>Table mono8 Order | Status Badge | Shop | Date Clock3 | Amount ₹<br/>Desktop table + Mobile cards<br/>Button Print again → /configure?reprint=&shopId state docs+originalItems"]
    HistoryC --> ProfileC["Route /customer/profile<br/>avatar 16 + Badge brand + list Mail/Phone/ShopId<br/>Button Open settings + Sign out POST /auth/logout → /login<br/>DangerZone red Trash2 → Dialog input password → DELETE /api/users/me → INACTIVE deleted-{id}"]
    ProfileC --> SettingsC["Route /customer/settings<br/>4 rows Bell notifications + Volume2 sound + Moon darkMode + Globe language en-IN hi mr<br/>switches persist localStorage inko.settings + speech Test voice"]
    SettingsC --> BellC["Component NotificationsBell h9 w9 badge red<br/>GET /notifications refetch30s + GET unread-count<br/>speak newest if sound true<br/>Dropdown list read/unread"]
    LoginPwd -- 401 --> ErrLogin
    RegCust -- 409 --> ErrDup
    Pay -- 409 Already exists --> ErrPay["Alert Conflict Payment already exists → return existing not error idempotent"]
```

---

## 5. Shopkeeper (ROLE_SHOPKEEPER — Owner of shops.owner_user_id, accountType SHOP_OWNER → role SHOPKEEPER + CUSTOMER)

```mermaid
flowchart TD
    SStart([Entry /shop/login or /register?type=shop<br/>Welcome tabs]) --> RegShop{"Register?"}
    RegShop -- Create shop owner --> RegForm["Form Register Shop Owner<br/>Store icon border oklch<br/>Inputs fullName 120 + email xor phone + password<br/>Button Create shop owner test"] --> POSTRegShop["POST /api/auth/register<br/>body {fullName,email,phone,password,accountType SHOP_OWNER}<br/>409 dup else 201 assign roles CUSTOMER+SHOPKEEPER<br/>issue JWT perms shop:manage_own*8<br/>lastLoginRole=shop"] --> LoginShop
    RegShop -- Sign in --> LoginShop["Route /shop/login amber gradient SHOP OS<br/>Form Mail identifier lower + Lock password<br/>Toggle OTP same as customer<br/>Button Sign in to shop ArrowRight<br/>guard canAccessShop = SHOPKEEPER|ADMIN|SUPER_ADMIN else error This account needs shop owner"]
    LoginShop --> POSTLoginShop["POST /api/auth/login<br/>findByEmailOrPhone BCrypt<br/>issue roles [SHOPKEEPER] + perms 8<br/>shopId primary if owned else null"] --> ShopShell["Layout ShopShell 52 lines<br/>NAV5: Dashboard /shop/dashboard<br/>Queue /shop/queue ListOrdered<br/>Shops /shop/shops Store<br/>Pricing /shop/pricing Tag<br/>QR /shop/qr QrCode<br/>Header amber SHOP OS + Bell low-stock badge<br/>Dropdown user SHOPKEEPER + Settings/Sign out<br/>Footer footerShop © year"]
    ShopShell --> NeedShop{GET /api/shops/mine auth<br/>owned list empty?}
    NeedShop -- empty 0 --> CreateShopCard["Empty Card dashed Store icon<br/>text No shop yet — Create first<br/>Form inline Shop name* 150 required<br/>City input optional + Create Button<br/>POST /api/shops {name,city}<br/>validations: name, city if address, pincode 5-6, phone +91, lat/lng bothOrNone -90..90 / -180..180<br/>→ status OPEN supportsColor true"] --> DashShop
    NeedShop -- exists 1+ --> DashShop["Route /shop/dashboard<br/>Effects: GET /shops/mine → shopId primary<br/>GET /analytics/overview?shopId scoped<br/>GET /shops/:id/queue 3 preview<br/>GET /orders/shop/:id 5 recent<br/>GET /catalog/printers + inventory + series"]
    DashShop --> KPICard["KPI Grid4:<br/>Shop Orders today count today shopId<br/>Shop Revenue ₹ sum finalAmount shopId<br/>Shops 1 openNow count shops<br/>In queue shownBelow count queue WAITING|CALLED|PRINTING"]
    DashShop --> RevCard["Card Revenue by Day<br/>tabs hour1/day7/week30/year365<br/>GET /api/analytics/series params days 1/7/30/365 shopId<br/>Skeleton vs Empty noRevenueYet icon<br/>Bars gradient height value/max*100%<br/>year 365 grouped 12 months avg"]
    DashShop --> QPrev["Card QueueNow Timer<br/>if 0 No tokens dashed border<br/>else tokenNumber 6xl + Badge WAITING etc<br/>Button Open queue → /shop/queue"]
    DashShop --> Printers["Card Printers Printer icon<br/>if 0 Empty noPrinters dashed<br/>else rows model paperSizes badges + Select status IDLE/PRINTING/MAINTENANCE PATCH /api/catalog/printers/:id"]
    DashShop --> InvDash["Card PaperInventory Boxes<br/>rows paperSize•gsm Badge<br/>Buttons −50 + qty Input + +50<br/>Badge LOW amber if qty <= threshold<br/>PUT /api/catalog/inventory {shopId,paperSize,gsm,quantity}<br/>NFE validation"]
    DashShop --> Recent["Card RecentOrders Clock3<br/>table Order mono8 Status Badge Date Amount<br/>5 rows shopOrders GET /api/orders/shop/:id"]
    ShopShell --> QManage["Route /shop/queue<br/>Load: GET /shops/mine → shopId<br/>Poll: GET /api/shops/:id/queue + speak Token completed<br/>SSE /shops/:id/queue/stream + fallback poll 2500"]
    QManage --> QCtrl{"Controls"}
    QCtrl --> Auto["Checkbox Auto localStorage inko.autoQueue 1/0<br/>when ON banner indigo Auto: calls next → 3s printing → done<br/>interval 3500 finds WAITING first → act CALLED<br/>then CALLED→PRINTING then PRINTING→COMPLETED<br/>guard acting flag prevents race"]
    QCtrl --> Live["Badge Live emerald Radio animate vs amber Reconnecting<br/>Filter Select ALL/WAITING/CALLED/PRINTING"]
    QCtrl --> NextTok["Card NOW SERVING 6xl tokenNumber<br/>Badge friendly In queue|Your turn|Printing|Ready<br/>Info type Shop slice 0,8<br/>Actions lg: WAITING→ Call customer CALLED<br/>CALLED→ Printing started PRINTING<br/>PRINTING→ Hand over done COMPLETED emerald<br/>Fail ghost AlertTriangle→FAILED<br/>Cancel ghost XCircle→CANCELLED"]
    QCtrl --> TokensList["List cards rounded-2xl<br/>left h12 w16 slate-900 tokenNumber<br/>mid name 👤 customerName + orderNumber mono<br/>right Actions sm same as NOW SERVING but compact<br/>disable if acting"]
    NextTok --> Transitions["POST /api/tokens/:id/transition {targetStatus}<br/>Token canTransitionTo check<br/>update token priority queue + queue_entry status<br/>sync Order QUEUED→PRINTING→COMPLETED<br/>if PRINTING and startedAt null → compute sheets via itemRepo+configRepo sheetsPerItem DOUBLE? ceil else<br/>choose inventory row by paperSize matched > any >0<br/>deduct sheets once, cross threshold LOW_STOCK notify owner/queue size<br/>notify customer TOKEN_...<br/>broadcast SSE token event"]
    ShopShell --> ShopsM["Route /shop/shops ShopManage<br/>Grid cards name Badge OPEN/CLOSED + MapPin lat lng + Buttons Resources/Edit/Delete"]
    ShopsM --> CrDialog["Dialog New shop<br/>inputs name* + address1/2 + City* + State + Pincode + Phone +91 select<br/>Pick from map MapPicker OSM reverse → fill address1 city state postcode latlng<br/>Button Create → POST /shops 201 + await load GET /shops/mine"]
    ShopsM --> EdDialog["Button Edit Pencil → GET /api/shops/:id fresh<br/>parse phone split +91 → inputs<br/>PATCH /api/shops/:id 200 + await load"]
    ShopsM --> DelDialog["Button Delete Trash2 → Dialog input password + confirm<br/>DELETE /api/shops/:id header password BCrypt check 403 if wrong → cascade delete printers/inventory/tokens"]
    ShopsM --> ResDialog["Button Resources Boxes → Dialog<br/>PAPERS_ALL A4/A3/A5/LEGAL/LETTER checkboxes<br/>Badge LOW per row<br/>Input qty per paper staged diff<br/>on Save diff DELETE rows removed + PUT rows added/updated"]
    ShopShell --> Pricing["Route /shop/pricing<br/>tabs Price rules / Discounts"]
    Pricing --> RulesTab["Tab Price rules table 20 combos<br/>per rule Paper Color Badge Sides Market baseline state adj + Your ₹/page Input<br/>+ EffectiveFrom date + existing ₹ warning<br/>+ Delete trash per row<br/>banner We filled Keep & Save All → loops POST /pricing/rules or PUT /pricing/rules/:id<br/>scope SHOP→owner check, PLATFORM→admin only"]
    Pricing --> DiscTab["Tab Discounts grid TicketPercent<br/>card Badge ACTIVE|INACTIVE title description<br/>fields minPages minAmount %/FLAT maxDiscount<br/>Buttons Attach coupon prompt → POST /api/discounts SHOP + POST /api/discounts/:id/coupon code upper<br/>coupon redemption not written bug P1"]
    ShopShell --> QRShop["Route /shop/qr<br/>Select shop w64 dropdown if multi<br/>Buttons Generate new QR + Open shop /shops/:id/print ExternalLink<br/>LAN IP sky badge http://lanIp:5173 via GET /api/net/lan-ip<br/>Card QRCodeSVG 240 level H mono code_value + Badge ACTIVE + buttons CopyCheck + Download png + Regenerate RefreshCw POST /qr/:id/regenerate owner<br/>history table When Scanned by ip ua max-h72<br/>REPLACED chain arrow ACTIVE→REPLACED<br/>Error generate concurrent 2 ACTIVE race"]
    QRShop --> ScanHist["GET /api/shops/:id/qr/scans enriched<br/>GET /api/shops/:id/qr history"]
    ShopShell --> ProfShop["Route /shop/profile → Profile home /shop/dashboard Badge SHOPKEEPER"]
    ShopShell --> SettShop["Route /shop/settings 4 rows bell/sound/moon/globe same as customer localStorage speech"]
    style Transitions fill:#fef3c7,stroke:#d97706
    style Auto fill:#e0e7ff,stroke:#6366f1
```

---

## 6. Admin / Super Admin (ROLE_ADMIN | SUPER_ADMIN — Governance Hierarchy)

```mermaid
flowchart TD
    AStart([Admin entry /admin/login<br/>ShieldCheck gradient indigo]) --> LoginAdmin["Form Admin login<br/>Input identifier Mail lower + Lock password<br/>Button Sign in to admin ArrowRight<br/>guard canAccessAdmin = ADMIN|SUPER_ADMIN else Different console"]
    LoginAdmin --> POSTAdmin["POST /api/auth/login<br/>find + BCrypt + requireActive<br/>issue roles [ADMIN] or [SUPER_ADMIN] perms 21<br/>lastLoginRole=admin"] --> AdminShell["Layout AdminShell<br/>NAV6: Overview /admin/dashboard<br/>Shops /admin/shops<br/>Users /admin/users<br/>Orders /admin/orders<br/>Complaints /admin/complaints<br/>Audit /admin/audit<br/>Header ADMIN indigo + Bell refund/complaint badge<br/>Dropdown ADMIN initials"]
    AdminShell --> DashAdmin["Route /admin/dashboard<br/>Effects parallel:<br/>GET /api/analytics/overview platform (no shopId)<br/>GET /api/shops admin all sorted<br/>GET /api/actuator/health<br/>GET /api/analytics/mix<br/>GET /api/analytics/series?days=7"]
    DashAdmin --> StatsAdmin["Grid4: Total Orders Activity<br/>Total Revenue IndianRupee sum all<br/>Shops Building2 count all<br/>Users Active count active<br/>Shops table Search shops input<br/>System health Backend/DATABASE badges<br/>Mix Progress bar COLOR %<br/>Series 7 Bars height revenue/max"]
    AdminShell --> ShopsAdmin["Route /admin/shops<br/>GET /api/shops admin all → grid3 cards Building2<br/>Badge OPEN/CLOSED<br/>Button View live queue → /queue/:id (any shop)"]
    AdminShell --> UsersAdmin["Route /admin/users<br/>GET /api/admin/users?size=100 content + GET /api/admin/users/count {total,active}<br/>Controls Search name/email/phone mono id8<br/>Table rows Name + Contact Mail/Phone/ShopId + Roles Badges brand + Status success/warning<br/>Actions if canEdit != self:<br/>Edit roles Checkboxes 4 CUSTOMER/SHOPKEEPER/ADMIN/SUPER_ADMIN inline gap2<br/>Button Save ShieldCheck → PATCH /api/admin/users/:id/roles<br/>Button Suspend ShieldAlert → PATCH /api/admin/users/:id/status SUSPENDED/ACTIVE → audit ADMIN_ROLE_CHANGED<br/>Guard self-suspend blocked 400 You cannot change own status<br/>ADMIN cannot grant SUPER_ADMIN (should be SUPER only) escalation risk"]
    AdminShell --> OrdersAdmin["Route /admin/orders<br/>Effects: GET /api/shops → shopNames map<br/>Promise.all GET /api/orders/shop/:id per shop flat sort desc by createdAt<br/>Filter Select All shops vs single shop<br/>Table mono8 Order Printer Badge status Clock3 Date Amount ₹<br/>Button Open → /order/:id as admin"]
    OrdersAdmin --> DetailAdmin["Route /order/:id as admin<br/>same as customer Detail + extra<br/>If refund REQUESTED show Approve/Reject Buttons<br/>POST /api/refunds/:id/decision {APPROVE|REJECTED}<br/>→ refund APPROVED|REJECTED|COMPLETED + payment REFUNDED/PARTIAL + order REFUNDED if full else stay<br/>notify customer REFUND_..."]
    AdminShell --> CompAdmin["Route /admin/complaints<br/>GET /api/complaints?size=100 list cards mono id8 + category + Badge OPEN|RESOLVED + description bg-slate-50<br/>Controls Select filter ALL→RESOLVED + Search id<br/>Card actions Label Set status Select → PATCH /api/complaints/:id {status}<br/>Input Resolution textarea + Button Resolve → RESOLVED<br/>risk IDOR GET/:id no principal + CHECK OPEN..ESCALATED mismatch CLOSED 500"]
    AdminShell --> AuditAdmin["Route /admin/audit<br/>GET /api/admin/audit?page&size=25 → {content,totalPages,totalElements}<br/>Table When Actor Badge SUPER_ADMIN brand id8 Action mono Resource Detail truncate json + CreatedAt<br/>Paginate Page x of y Prev/Next buttons<br/>Size unclamped OOM risk + page negative 500"]
    AuditAdmin --> AuditNote["Table audit_logs append-only<br/>SQL REVOKE UPDATE/DELETE for role inko_app if exists<br/>else mutable via JpaRepository.delete<br/>actorId actorRole action resourceType resourceId newValue jsonb createdAt"]
    AdminShell --> ProfAdmin["Route /admin/profile Badge ADMIN home /admin/dashboard"]
    AdminShell --> SettAdmin["Route /admin/settings 4 rows bell/sound/moon/globe"]
    AdminShell --> QRAdmin["Hidden endpoint GET /api/admin/qr?shopId list all QRs admin"]
    AdminShell --> SecCheck["Security checks:<br/>If CUSTOMER auth GET /admin/dashboard → AreaGuard Different console<br/>CUSTOMER GET /api/admin/users → 403 FORBIDDEN ApiError<br/>CUSTOMER GET /api/orders/shop/victim → IDOR risk 200 if not patched → should be 403 owner check<br/>ADMIN GET /api/analytics/overview?shopId=victim → should check owner else leak"]
```

**Hierarchy Note:**
```
ADMIN: view/manage users (not SUPER), manage orders, complaints, refunds, analytics overview/mix/series, audit read
SUPER_ADMIN: same as ADMIN + manage admin roles (grant ADMIN), system config, high governance, suspend peers
Guard: self-edit blocked, should be SUPER only can grant SUPER/ suspend ADMIN
```

---

## 7. Sequence — Order → Payment → Token → Queue (Cross-Actor Core with Idempotency)

```mermaid
sequenceDiagram
    participant Cust as Customer Browser<br/>Configure
    participant FE as Frontend<br/>api.ts axios
    participant OrdAPI as OrderService<br/>PrintCalc
    participant Price as PricingService
    participant PayAPI as PaymentService<br/>MOCK
    participant Tok as TokenService
    participant QEnt as QueueEntry<br/>queue_entries
    participant Inv as Inventory<br/>shop_paper_inventory
    participant Shop as Shopkeeper<br/>QueueManage
    participant CustQ as Customer<br/>Queue Track
    Cust->>FE: docs(analyzed) + shopId + paper A4..LEGAL BW/COLOR SINGLE/DOUBLE pages=ALL|1-5,8 copies 1-100 coupon?
    FE->>Price: POST /api/pricing/quote {shopId,paper,color,sides,pages=parsed,copies,coupon}
    Price-->>FE: PriceBreakdown unitPrice sheets printedPages subtotal paper/color/side/special discount tax final currency ruleId
    Note over Price: SHOP>PLATFORM override<br/>decompose baseline* sheets<br/>best discount + tax 10% default
    FE->>OrdAPI: POST /api/orders {shopId,coupon,items[{documentId,paper,color,sides,AUTO,pageSelection,copies}]}
    OrdAPI->>OrdAPI: validate shop exists OPEN else 400
    OrdAPI->>Price: per item quote again sum totalPages=Σ printedPages
    OrdAPI-->>FE: 201 {order INKO-YYYY-###### CREATED, items, snapshot {unit,sheets,printedPages}}
    Cust->>FE: choose Pay method
    alt MOCK_UPI
        FE->>PayAPI: POST /api/orders/{id}/payment {MOCK_UPI, idempotencyKey:uuid}
        PayAPI->>OrdAPI: auto CREATED→CONFIGURED→PAYMENT_PENDING if needed
        PayAPI-->>FE: 201 payment PENDING providerOrderRef
        FE->>PayAPI: POST /api/payments/{id}/verify {}
        PayAPI->>PayAPI: provider.verify true?→PAID else FAILED
        Note over PayAPI: idempotent if already PAID skip<br/>else set PAID paidAt
        PayAPI->>OrdAPI: if PAYMENT_PENDING→PAID else skip dup<br/>OrdAPI creates Token idempotent
        PayAPI-->>FE: payment PAID + Order PAID→QUEUED via Token
    else COD
        FE->>PayAPI: POST /api/orders/{id}/payment {COD}
        PayAPI->>OrdAPI: COD_SELECTED→TOKEN_GENERATED→QUEUED
        PayAPI-->>FE: 201 payment PAID immediate + token WAITING
        Note over PayAPI: same idempotency by orderId return existing<br/>1 Order→1 Payment→1 Token→1 QueueEntry
    end
    PayAPI->>Tok: tokens.generate(shopId,orderId,NORMAL) idempotent findByOrderId
    Tok->>QEnt: insert WAITING position nextOfDay queue
    Tok-->>FE: Token A001 WAITING priority 100
    Shop->>Tok: GET /api/shops/{id}/queue poll2500 + SSE
    CustQ->>Tok: GET /api/shops/{id}/queue?order= + GET /api/tokens/{id}/wait waitingAhead priority+issuedAt estimate 0.4*pages+1*job
    Shop->>Tok: POST /api/tokens/{id}/transition CALLED calledAt + queue CALLED + notify Your turn
    Note over Tok: auto 2s FE timer → PRINTING
    Shop->>Tok: POST PRINTING startedAt + queue PRINTING→Order PRINTING<br/>compute sheets via PrintCalc per item sum ceil<br/>pick inventory by paperSize matched > any>0<br/>deduct once blocked if startedAt not null<br/>if cross threshold notify LOW_STOCK once
    Shop->>Tok: POST COMPLETED completedAt + queue COMPLETED + Order COMPLETED notify Print completed
    CustQ->>CustQ: Mine Card 5xl WAITING→CALLED→PRINTING→COMPLETED READY
    alt Print Failed
        Shop->>Tok: POST FAILED
        Tok->>QEnt: FAILED/REMOVED
        Tok->>OrdAPI: Order FAILED
        Tok-->>CustQ: notify Failed + refund path REQUESTED→APPROVED
    end
```

---

## 8. Auth & RBAC — Guest, Register, Login (All Variants)

```mermaid
flowchart TD
    Entry([/login or /register or /shop/login or /admin/login]) --> Welcome{"Welcome unified<br/>tabs Sign in / Create"}
    Welcome --> Reg["Register CUSTOMER<br/>POST /api/auth/register<br/>409 dup check"]
    Welcome --> LoginPwd["Login Password<br/>POST /api/auth/login"]
    Welcome --> OTP["OTP Phone<br/>POST /api/auth/otp/request 6-digit SHA256<br/>POST /api/auth/otp/verify"]
    Welcome --> Guest["Guest mint POST /api/auth/guest<br/>only if no accessToken<br/>guest-UUID@guest.inko.local<br/>ROLE_CUSTOMER"]
    LoginPwd --> JWT["JWT issue 15m<br/>Refresh 7d<br/>lastLoginRole customer|shop|admin<br/>ApiKeys interceptor single-flight refresh<br/>AreaGuard session isolation"]
    OTP --> JWT
    Reg --> JWT
    Guest --> JWT
    JWT --> RoleRedir{"RoleRedirect<br/>ADMIN→/admin/dashboard<br/>SHOPKEEPER→/shop/dashboard<br/>CUSTOMER→/customer/dashboard"}
    RoleRedir --> Shelf{"Shell by role"}
    JWT --> Forgot["Forgot /forgot-password<br/>POST /api/auth/otp/request purpose RESET<br/>code + devCode alert<br/>POST /api/auth/reset-password"]
    JWT --> Logout["POST /api/auth/logout<br/>revoke refresh + clear tokens"]
```

**OTP limits:** 5 attempts, 5m expiry, consumed flag, devCode returned if `devMode true`.

---

## 9. Pricing Deep Dive (PrintCalc Reusable)

```
Inputs: shopId, paperSize A4..LEGAL, colorMode BW/COLOR, sidesMode SINGLE/DOUBLE,
        selectedPageCount = PrintCalc.parsePageCount(pageSelection, doc.pageCount)
        copies 1-100, couponCode, specialPaper bool, userId
Process:
  rule = findResolved(shopId,paper,color,sides,today) or throw PRICING_NOT_CONFIGURED
  printedPages = pages * copies
  sheetsPerCopy = DOUBLE ? (pages+1)/2 : pages
  sheets = sheetsPerCopy * copies = physical sheets consumed
  subtotal = unitPrice * printedPages
  specialCharge = spc * sheets if specialPaper
  decompose baseline paperCharge + remainder 50/50 color/side
  discount = best active rule or coupon → amount
  after = chargeBase - discount
  tax = after * taxPercent/100 (system_settings tax.percent)
  final = after+tax ; if final < minOrderAmount => final = min ; tax = final-afterDiscount
Output: PriceBreakdown {unitPrice,pages,copies,sheets,printedPages,subtotal,paper,color,side,special,discount,ruleId,couponId,tax,taxPercent,final,currency,ruleId}
Frontend quote vs Order create: both use same PrintCalc; mismatch bug fixed (sum vs first doc)
```

---

## 10. Inventory & Low-Stock (Idempotent)

```mermaid
flowchart TD
    TPrint([Token transition to PRINTING<br/>POST /tokens/:id/transition PRINTING]) --> First{startedAt already set?<br/>idempotency}
    First -- yes --> Skip["Skip deduct already done"]
    First -- no --> Calc["Compute sheets<br/>for each item: sheetsItem = DOUBLE? ceil(pageCount*copies/2): pageCount*copies<br/>sum Σ sheets = dec<br/>resolve paperSize = first item paperSize"]
    Calc --> Pick{"Find inventory row<br/>paperSize match + qty>0<br/>else any qty>0"}
    Pick -- none --> NoInv["No deduction - out of stock (still allow print)"]
    Pick -- row found --> Dec["prev=qty, next=max(0,prev-dec)<br/>save row"]
    Dec --> Cross{prev>threshold && next<=threshold?<br/>lowStockThreshold default 100}
    Cross -- yes --> Notify["Create notification LOW_STOCK to owner<br/>Shop Bell badge + /shop/shops<br/>waiting=queue WAITING size"]
    Cross -- no --> Done["Done no spam"]
    Skip --> Done
    NoInv --> Done
```

---

## 11. SSE + Polling Lifecycle (Customer & Shop)

```mermaid
flowchart TD
    Open([Component mount<br/>Queue / shop/queue]) --> Load["load() GET /api/shops/:id/queue"]
    Load --> StartPoll["startPoll() interval 2500/5000"]
    StartPoll --> TrySSE{"Try EventSource<br/>/api/shops/:id/queue/stream 60s"}
    TrySSE -- onopen --> Live["setLive true, stopPoll()<br/>addListener token|connected → load()"]
    TrySSE -- onerror --> Fallback["setLive false, startPoll()"]
    Live --> Reconnect{"SSE close/timeout?"}
    Reconnect -- yes --> Fallback
    Fallback --> Live
    Open -- unmount --> Cleanup["clearInterval + EventSource.close()<br/>no leaked timers"]
```

---

## 12. Error Branches — HTTP Quick Reference

| Area | Action | Error | UI |
|---|---|---|---|
| QR | resolve 404/EXPIRED/REPLACED | — | AlertTriangle + Continue without QR |
| Auth | register dup | 409 Already exists | Alert red + link Sign in |
| Auth | login wrong | 401 INVALID_CREDENTIALS | Alert |
| Auth | OTP 5 attempts | 429 TOO_MANY_REQUESTS | Alert limit |
| Pricing | no rule | 404 PRICING_NOT_CONFIGURED | Alert pricing not set |
| Order | shop null/closed | 400 ValidationFailed Shop not open | Alert Select shop |
| Payment | duplicate order | 200 return existing (idempotent) | Alert Already paid → token exists |
| Token | invalid transition WAITING→COMPLETED | 400 Invalid transition | Alert Already completed refreshing |
| Shop | patch without ownership | 403 You do not manage this shop | Alert |
| Admin | self suspend | 400 You cannot change … | Alert |
| Inventory | NFE/NaN | 400 Validation | Alert qty must be number |

---

## 13. Viewing & Export

- Paste each `mermaid` block into [mermaid.live](https://mermaid.live) → export PNG/SVG/PDF
- VS Code: install `Markdown Preview Mermaid Support` → `Ctrl+Shift+V` preview `func/FLOWCHART.md` → right-click Export
- GitHub: pushes auto-render flowchart TD natively
- Whole App + Guest + Customer + Shop + Admin + Sequence = 6 runnable diagrams; State diagrams = 3 more
- Keep `func/FLOWCHART.md` as source of truth; version bump on each migration V13+

---

## 14. Fix Diff Since Last Audit (2026-08-29)

- **Flow corrected:** Inventory now `sheets` not `printedPages*copies`; paperSize matched; threshold-cross dedup; idempotent `wasStarted` guard fixed (wasStarted before setStartedAt)
- **Token idempotent:** `findByOrderId` before generate; Payment verify `PAID` skip; init returns existing not CONFLICT; concurrent check-then-act still race without DB UNIQUE FOR UPDATE noted
- **QueueEntry standardized:** `PROCESSING→PRINTING`, `DONE→COMPLETED` alignment; DB still PROCESSING/DONE legacy vs standardized documented
- **Shop validation:** `POST /orders` validates `shopId !=null && shop OPEN else 400`
- **SSE:** Customer 2500 + shop 2500 with stop/start on live/fallback, cleanup on unmount; global CopyOnWriteArray leaks across shops noted

## 15. Not Covered / Legacy (Gaps Closed)

- **Orphan pages:** `Login.tsx` `Register.tsx` `CustomerLogin.tsx` legacy NOT routed — unified `Welcome.tsx` used, flagged dead code
- **Catalog prefix:** actual `PUT /api/shops/:shopId/inventory` + `DELETE .../:rowId` + `GET/POST/PATCH/DELETE /api/shops/:shopId/printers` (not `/api/catalog`)
- **QR paths:** actual `POST /api/qr/:id/regenerate` by qrId + `GET /api/shops/:shopId/qr` vs `GET .../qr/scans` enriched, `POST /api/shops/:shopId/qr` generate, `GET /api/admin/qr?shopId` null bug
- **Token SSE:** `GET /api/shops/:shopId/queue/stream` 60s global broadcast no shop filter leak + `GET /api/net/lan-ip` DatagramSocket 8.8.8.8
- **Payment:** `GET /api/orders/:id/refunds` + `POST /api/orders/:id/refund` optional amount reason 10% fee + `POST /api/refunds/:id/decision` case-insensitive APPROVE
- **Order direct COMPLETED:** `QUEUED→COMPLETED` valid skip PRINTING per canTransitionTo

