# Inko — Smart Printing Platform — Complete Functionality Inventory v6.0 (Redo Ultra Detailed — Every little thing)

**Version:** 6.0 Redo Ultra Detailed 2026-08-29 23:00 IST
**Date:** 2026-08-29 23:00 IST — Redone Phase 2 Ultra v6
**Source:** `frontend/src/**` 1952 modules + `backend/src/main/java/com/inko/**` 124 files + `db/migration V1-V12` + `application.yml` + `SecurityConfig.java` + `App.tsx`
**Layer separation:** Each actor has Frontend + Backend subsections. Shared/global documented separately.
**Fix baseline:** Includes 2026-08-29 audit fixes — PrintCalc sheets, inventory paperSize-matched dedup idempotent, token/pay idempotent, queueEntry COMPLETED, shop OPEN validation, SSE poll start/stop.

---

## Table of Contents
1. Global / Shared
2. Actor A — Guest via QR (Unauthenticated)
3. Actor B — Customer (ROLE_CUSTOMER)
4. Actor C — Shopkeeper (ROLE_SHOPKEEPER, accountType SHOP_OWNER)
5. Actor D — Admin / Super Admin (ROLE_ADMIN, SUPER_ADMIN)
6. Relationship Map — Frontend ↔ Backend
7. Cross-Check Verification
8. Appendices — Enums, Badges, Icons, API Table, DB, Permissions

---

## 1. Global / Shared

### 1.1 Frontend Shell & Routing

**Entrypoint `src/main.tsx`** — QueryClient retry1 stale15000, SettingsProvider→BrowserRouter→App, index.css, mount `#root`.

**App.tsx (110L)** — AuthProvider wraps Routes.
Public (no guard): `/login` `Welcome`, `/register` alias, `/shop/login` ShopLogin, `/admin/login` AdminLogin, `/customer/login`→`/login`, `/signin`→`/login`, `/forgot-password` ForgotPassword (3-step), `/qr/:code` QrScan, `/shops/:shopId/print` ShopPrint, CustomerShell guest-capable `/upload`, `/configure`, `/order/:id`, `/queue/:id`.
Gated AreaGuard: `customer` → `/customer/dashboard`, `/history`, `/customer/profile`, `/customer/settings`; `shop` → `/shop/dashboard`, `/shop/queue`, `/shop/shops`, `/shop/pricing`, `/shop/qr`, `/shop/profile`, `/shop/settings`; `admin` → `/admin/dashboard`, `/admin/shops`, `/admin/users`, `/admin/orders`, `/admin/complaints`, `/admin/audit`, `/admin/profile`, `/admin/settings`.
Redirects: `/`→RoleRedirect, `/dashboard`→RoleRedirect, `/shops` placeholder card, `*` → Page not found link to customer dashboard.
Relationship: one session = one console via AreaGuard.

**AreaGuard `components/AreaGuard.tsx` 52L** — props area customer|shop|admin, states loading spinner animate-spin border-slate-300/t-blue-600 + Checking your session…, !user→Navigate AREA_LOGIN[area], sessionArea!==area→mesh-gradient Card ShieldAlert amber h6 w6 Different console required You are signed in to {currentLabel} text + primary Sign in to {area} ArrowRight + secondary Back to my {current} Dashboard, else Outlet.

**ProtectedRoute 40L** — roles? check user.roles includes else red Access denied, else Outlet (legacy).

**RoleRedirect** — !user→/login, sessionArea&&hasAreaRole→AREA_HOME[area], else priority ADMIN→/admin/dashboard, SHOPKEEPER→/shop/dashboard, CUSTOMER→/customer/dashboard.

**Layouts:** CustomerShell NAV3 customer/dashboard|upload|history brand Inko PRINT OS NotificationsBell CUSTOMER initials, ShopShell NAV5 shop/dashboard|queue|shops|pricing|qr amber SHOP OS Bell low-stock, AdminShell NAV6 admin/dashboard|shops|users|orders|complaints|audit indigo ADMIN, AppShell legacy 7 NAV.

### 1.2 Design System `components/ui.tsx` 242L

Button cva variant primary oklch0.55 white hover0.50 secondary border slate200 ghost outline danger red600 size sm h8 px3 lg h11 loading spinner disabled. Input h10 rounded-xl border-slate200 shadow focus oklch ring4 placeholder slate400 disabled50% Textarea min-h88 Select h10 Label block text-sm Badge tones default slate100 brand oklch indigo success emerald50 warning amber50 danger red50 info sky50 neutral white rounded-full Alert tones error red50 success emerald50 info sky50 warning amber50 Skeleton pulse rounded-xl SkeletonCard p5 Progress h2 bg-slate100 inner oklch clamped Dialog open Escape body hidden backdrop-blur bg-slate900/40 max-w-lg max-h88vh sticky title EmptyState dashed border Toast bottom-right fixed 3500ms auto dismiss Stepper pills current oklch + emerald <current + white >current.

### 1.3 State & Cross-Cutting Frontend

**Auth `lib/auth.tsx` 167L** — CurrentUser id fullName email phone roles[] perms status ACTIVE|INACTIVE|SUSPENDED shopId? ROLES 4 SessionArea AREA_LOGIN/HOME get/set localStorage inko.lastLoginRole lastLoginAt, AuthContextValue user isLoading loginWithPassword POST /auth/login requestOtp verifyOtp register POST /auth/register accountType CUSTOMER|SHOP_OWNER forgotPassword devCode resetPassword DELETE /users/me logout POST /auth/logout + clear refreshMe GET /users/me failsafe 8000ms.

**API `lib/api.ts` 117L** — tokens access/refresh localStorage, axios baseURL /api timeout15000 Bearer interceptor, ApiErrorBody STATUS_MESSAGES 400-504 apiErrorMessage network friendly, refreshPromise single-flight POST /auth/refresh retry401 except auth/* _retry area-aware redirect.

**Settings `lib/settings.tsx` 306L** — Language en-IN hi mr STRINGS 45 keys KEY inko.settings DEFAULTS load persist dark class lang attr speak speechSynthesis cancel utterance rate0.95 voice lang prefix.

**Sound `lib/sound.ts`** announceToken tokenNumber lang cancel prior.

### 1.4 Backend Cross-Cutting

**SecurityConfig.java** — cors allowedOrigins trim fallback localhost5173 allowedMethods GET POST PUT PATCH DELETE OPTIONS allowedHeaders * exposed Location, csrf disable stateless, authorize: permitAll /api/auth/** /actuator/health /error /swagger-ui /v3, GET permitAll /api/shops /pricing/rules /discounts, GET permitAll /api/shops/* /qr/*/resolve, POST permitAll /qr/*/scan, /api/shops/mine authenticated, /api/analytics/** hasAnyRole ADMIN|SHOPKEEPER|SUPER_ADMIN, /api/refunds/*/decision hasAnyRole ADMIN, /api/admin/** hasAnyRole ADMIN, anyRequest authenticated, JwtAuthFilter before UsernamePassword, 401/403 JSON ApiError, RateLimitService checkIp login/otp-request 20/window via ConcurrentHashMap.

**JWT** — JwtService sign HS256 access15m refresh7d claims id roles perms, JwtProperties secret expiry, JwtAuthFilter OncePerRequestFilter Bearer parse validate set Authentication InkoPrincipal userId roles.

**Error** — ApiException ErrorCode enum TOO_MANY_REQUESTS VALIDATION_FAILED PRICING_NOT_CONFIGURED CONFLICT etc HttpStatus, ApiError status code message details, GlobalExceptionHandler @ControllerAdvice.

**DB Helpers** — V1 helpers uuid, V2 identity users roles perms user_roles role_permissions refresh_tokens otp_codes, V3 shops, V4 catalog printers shop_paper_inventory, V5 documents document_pages, V6 pricing rules discounts coupons redemptions system_settings, V7 orders order_items print_configurations, V8 tokens queue_entries token_sequences, V9 payments refunds, V10 support complaints notifications qr_codes qr_scan_events audit_logs failed_jobs, V11 seed reference roles perms admin, V12 fix stale orders.

**PrintCalc.java (new)** — printedPages=selected*copies, physicalSheets DOUBLE?(pp+1)/2:pp sheets*? used by PricingService, OrderService, TokenService inventory, queue estimate.

---

## 2. Actor A — Guest via QR

### 2A.1 Frontend

**QrScan `/qr/:code`** — useParams code useEffect GET /qr/:code/resolve 200 shopId → POST /qr/:code/scan fireAndForget → GET /shops/:shopId → localStorage inko.qrShop → hasToken? if !access POST /auth/guest guest-UUID@guest 201 CUSTOMER 15m/7d → nav /upload?shopId=&src=qr replace. Loading mesh-gradient Store pulse Resolving QR Skeleton h2 w40, Error AlertTriangle QR not found Button Continue without QR→/upload (no shopId assumed).

**ShopPrint `/shops/:shopId/print`** — landing after QR landing, GET /shops/:shopId permitAll shop card name city status.

**Upload `/upload` (264L)** — Stepper Upload0, banners: fromQr emerald QrCode Scanned at shopId slice8, guest NameCard Input guestName max120 + Save & remember PATCH /users/me fullName→localStorage, Upsell indigo LogIn Create account next=encode /upload?shopId, Shop pre-selected Clear X vs shop inventory, Dropzone dashed-2 p8 UploadCloud ≤50MB ≤10 ext pdf/jpg/png/doc/ppt/xls/txt FileChip grid2 X remove, Button Upload & analyze FormData files* → POST /documents/upload progress spinner AnalyzeBtn ArrowRight, Result Analyzed success FileText Badge mime pages or analysis_summary, Continue to configure → /configure?shopId state docs (arrayOr wrapper). Guest tracking /order/:id /queue/:id via guest customerId.

### 2A.2 Backend

**QrCode** — id UUID shop_id FK status ACTIVE|REPLACED|EXPIRED code_value UNIQUE 64 created createdAt replacedById chain expiresAt nullable.

**QrScanEvent** — id qr_id ip ua createdAt.

**QrController** — GET /qr/:code/resolve permitAll 200 shopId status or 404, POST /qr/:code/scan permitAll log, POST /shops/:id/qr/regenerate owner POST, GET /shops/:id/qr/scans owner enriched, GET /net/lan-ip DatagramSocket 8.8.8.8.

**AuthService.createGuest** — no body → user guest+UUID + BCrypt random, role CUSTOMER, issueAuthResponse tokens, GET /users/me.

---

## 3. Actor B — Customer (ROLE_CUSTOMER)

### 3B.1 Frontend 8 pages

**Welcome /login** — Tabs Sign in / Create account Cards Customer vs Shop Store, method Password/Phone OTP, register fields fullName 1-120 Email @Email Phone +?8-15 fullPhone Password 8-72 confirm strength bar len*12%, POST /auth/register CUSTOMER 409 dup → AuthResponse.

**Dashboard `/customer/dashboard`** — AreaGuard customer CustomerShell Hero Welcome back 👋 Stats Shops online Your orders Shops grid OPEN/BUSY Badge OPEN success, GET /shops OPEN filter, GET /orders mine count.

**Upload** same as guest but Stepper + guest logic shared.

**Configure `/configure?shopId&reprint`** — State shops GET /shops list shopId state qrShopId locked emerald QR locked Shop {name} pre-selected Clear X else Select shop → city status, Options A4 A3 A5 LETTER LEGAL BW/COLOR SINGLE/DOUBLE copies 1-100 Pages ALL tip 1-5,8 + Tag coupon uppercase Input + Apply couponApplied emerald, countPages sel total 600ms debounce preview POST /pricing/quote shopId paper color sides pages parsed copies coupon → quote YOU PAY ₹final sheets printedPages subtotal paper/color/side/special discount tax final, Buttons See price Refresh Confirm & print ArrowRight → POST /orders items [{documentId paper color sides orientation AUTO pageSelection copies}] → INKO-YYYY-###### CREATED. Error Select shop if null (guest without QR block), No documents → Card Go to upload.

**OrderDetail `/order/:id` poll3s** — StepIndex 0 PLACED 1 PAYMENT 2 QUEUED 3 PRINTING 4 COMPLETED, Header Receipt Badge ₹ Track queue Ticket, Stepper 5, Live Badge WAITING/Called/Printing/Completed + estimate tokenLive GET /tokens/:id/wait shopId, Items list documentId slice8 copies pageCount, Pricing snapshot json, Payment Card Buttons Pay MOCK_UPI ShieldCheck / COD secondary hide if PAID/COD/QUEUED → Banner Payment already verified emerald, pay() POST /orders/:id/payment idempotencyKey + POST /payments/:id/verify PAID, payMsg Alert, Refunds list Badge REQUESTED COMPLETED, Request refund 10% fee Btn POST /orders/:id/refund → REQUESTED, decideRefund admin Approve/Reject POST /refunds/:id/decision, Complaint Dialog 9 categories WRONG_PRINT..OTHER POST /complaints OPEN.

**Queue `/queue/:shopId?order=`** — Header Store Queue live SSE Radio/Emerald vs Polling amber 2500ms fallback startPoll stopPoll onopen connected onerror, Mine Card 5xl tokenNumber Badge Position estimate pagesAhead 0.4*pages+1*job, Waiting list priority+issuedAt, At a glance waiting position est. Waiting filter WAITING|QUEUED etc.

**History `/history`** — GET /orders table Search status Shop Select Order mono8 Printer Badge Clock3 Amount Print again → /configure?reprint state docs shopId originalItems preserve selectedPageCount copies.

**Profile `/customer/profile`** — avatar 16x16 Badge brand Mail/Phone/ShopId Open settings + Sign out POST /auth/logout → /login DangerZone Trash2 Dialog password → DELETE /users/me → INACTIVE deleted-{id}.

**Settings `/customer/settings`** — 4 rows Bell/Volume2/Moon/Globe notifications sound darkMode language en-IN hi mr localStorage inko.settings speech Test voice, NotificationsBell refetch30s speak newest if sound.

### 3B.2 Backend

**Document** — id customerId FK fileName mimeType size pageCount storagePath analysis_summary jsonb thumb? created.

**Pricing** — PricingService quote pages copies → sheets printedPages subtotal SHOP>PLATFORM decompose 50/50 discount best tax minOrder, PricingAdminService list shop/platform, SystemSettings tax.percent.

**OrderService create** — validate shopId !=null exists OPEN else 400, specs !empty, loop doc belongs to customer else 403, selPages PrintCalc.parsePageCount pageCount, PricingRequest → quote printedPages sum totalPages, subtotal/discount/tax/final sum, snapshot json unit sheets printedPages, save Order CREATED copies specs[0].copies totalPages subtotal..snapshot → notify ORDER_CREATED, loop again PrintConfiguration color sides paper orientation pageSelection selectedPageCount copies save, OrderItem orderId documentId configId pageCount copies itemSubtotal = bd.finalAmount per item save. transition PAID/COD generates Token idempotent byOrder check.

**PaymentService** — initiate idempotencyKey dedup findByIdempotencyKey → existing, findByOrderId → return existing idempotent, auto CREATED→CONFIGURED→PAYMENT_PENDING, MOCK createCheckout provider, COD set PAID immediate via COD_SELECTED, verify idempotent PAID skip, provider.verify true→PAID else FAILED, order PAYMENT_PENDING→PAID else FAILED, refund request 10% fee net, decideRefund status REQUESTED cannot re-decide, approve→APPROVED→COMPLETED if full amount else remains APPROVED payment REFUNDED|PARTIAL order REFUNDED only if full.

**TokenService** — generate findByOrderId if exists return, Sequence shop+date forUpdate increment A%03d priority, save Token GENERATED→WAITING QueueEntry WAITING position next, transition validate canTransitionTo set calledAt/startedAt/completedAt, queue status CALLED|PRINTING|COMPLETED|FAILED|CANCELLED, order sync QUEUED→PRINTING→COMPLETED FAILED etc via canTransitionTo else fallback, inventory deduct only if startedAt null compute sheets via itemRepo+configRepo sum ceil per item paperSize matched row cross threshold notify LOW_STOCK once, notify TOKEN_* via NotificationService, broadcast SSE.

**Notification** — create userId type title200 body1000 linkPath is_read channel, GET /notifications unread-count.

---

## 4. Actor C — Shopkeeper (ROLE_SHOPKEEPER, accountType SHOP_OWNER)

### 4C.1 Frontend

**ShopLogin `/shop/login` amber SHOP OS** — canAccessShop SHOPKEEPER|ADMIN|SUPER else error.

**Dashboard `/shop/dashboard`** — GET /shops/mine → shopId GET /analytics/overview?shopId scoped GET /shops/:id/queue 3 preview GET /orders/shop/:id 5 GET /printers + inventory + series, KPI Grid4 Shop Orders today Revenue ₹ Shops open In queue, Revenue by Day tabs hour1 day7 week30 year365 365 grouped12 skeleton empty vs bars gradient, QueueNow No tokens dashed vs tokenNumber Badge Open queue, Printers Empty noPrinters vs row model paperSizes Select IDLE…MAINTENANCE PATCH, PaperInventory Boxes row paperSize·gsm −50 qty +50 LOW amber PUT /inventory, RecentOrders table.

**QueueManage `/shop/queue`** — GET /shops/mine → shopId GET /shops/:id/queue poll2500 speak Token completed Auto 3500 WAITING→CALLED→PRINTING 2s→COMPLETED interval acting guard, NextToken Card NOW SERVING 6xl Badge Actions WAITING Call CALLED Printing PRINTING Hand over done COMPLETED + Fail Cancel ghost, Tokens list flex rounded-2xl h12 w16 slate-900 👤 customerName + Actions sm, Live emerald vs amber Filter ALL/WAITING/CALLED/PRINTING, autoMode localStorage inko.autoQueue.

**Shops `/shop/shops`** — grid card name Badge OPEN MapPin lat + Resources/Edit/Delete, Dialog New shop name* address City* State Pincode Phone +91 Pick from map OSM reverse latlng Create Save POST /shops OPEN, Edit Pencil GET /shops/:id PATCH, Delete Trash2 password DELETE BCrypt cascade, Resources PAPERS_ALL 5 checkboxes Badge LOW Input qty staged diff DELETE+PUT.

**Pricing `/shop/pricing` tabs Price rules/Discounts** — rules table 20 combos Paper Color Badge Sides Market baseline Your ₹/page Input EffectiveFrom existing ₹ warning Delete banner Keep & Save All loops POST/PUT, discounts grid TicketPercent Badge ACTIVE Attach coupon POST /discounts SHOP + POST /discounts/:id/coupon upper.

**Qr `/shop/qr`** — Select shop w64 Generate new QR Open shop print ExternalLink sky lanIp:5173 QRCodeSVG 240 level H mono code Badge ACTIVE Copy Download Regenerate RefreshCw history table When Scanned by ip max-h72 REPLACED chain.

**Profile / Settings** — Badge SHOPKEEPER same as customer.

### 4C.2 Backend

**Shop** — id owner_user_id city address pincode latitude LONG numeric9-6 phone status OPEN/BUSY/CLOSED etc supportsColor.

**Printer** — shopId model paperSizes queued jobs status.

**ShopPaperInventory** — shopId paperSize gsm quantitySheets lowStockThreshold.

**CatalogController** — GET /printers permitAll? leak, PUT /inventory upsert defaults A4.

**PricingController** — GET /pricing/rules enforceShopAccessOnRead owner check, POST/PUT enforceShopAccess scope check.

**ShopController** — POST /shops SHOPKEEPER validation name city pincode latlng bothOrNone, GET /shops/mine auth, PATCH ownership, DELETE password.

**QrService** — generate codeValue 64 ACTIVE scan log, regenerate REPLACED new ACTIVE.

---

## 5. Actor D — Admin / Super Admin

**AdminLogin `/admin/login` ShieldCheck** — canAccessAdmin ADMIN|SUPER.

**AdminShell NAV6** — Overview Shops Users Orders Complaints Audit ADMIN bell refund.

**Dashboard `/admin/dashboard`** — GET /analytics/overview platform + GET /shops all sorted + GET /actuator/health + GET /mix + series7.

**Shops `/admin/shops` GET /shops admin all grid3 Badge OPEN/CLOSED View live queue.**

**Users `/admin/users` GET /admin/users?size100 + /admin/users/count Search table Roles brand Status success canEdit !=self Edit roles checkboxes 4 Save PATCH /admin/users/:id/roles Suspend ShieldAlert PATCH /status SUSPENDED/ACTIVE audit ADMIN_ROLE_CHANGED self-suspend blocked 400.

**Orders `/admin/orders` GET /shops → Promise.all GET /orders/shop/:id per shop flat sort Select All shops filter table Open → /order/:id admin detail refunds Approve/Reject.**

**Complaints `/admin/complaints` GET /complaints?size100 cards category Badge description Set status PATCH status Resolution RESOLVED.**

**Audit `/admin/audit` GET /admin/audit?page&size25 table When Actor Badge SUPER_ADMIN brand id8 Action Resource Detail truncate Page x of y.**

**Security** — ADMIN view/manage users/orders/complaints/refunds/analytics/audit, SUPER_ADMIN + manage admin roles + system config. Hierarchy SUPER only grant SUPER.

---

## 6. Relationship Map

Frontend Upload→DocAPI→OrderAPI→PaymentAPI→TokenAPI→QueueSSE→NotifyAPI→History; Shop pricing→PricingAPI→inventory; Admin Users→AdminAPI→audit_logs. Every frontend page maps to 1-3 backend services via api.ts.

## 7. Cross-Check Verification

Entrypoint main.tsx, Router App.tsx 110L, AreaGuard 52L, ui 242L, auth 167L, api 117L, settings 306L verified line numbers, SecurityConfig cors fallback, RateLimit 20/window login/otp-request, PrintCalc fixed, 28 tables + 12 auxiliary = 40 tables V1-V12 seeds, mocks via MockPaymentProvider. Build backend 124 files compile PASS + frontend 1952 modules vite PASS.

### 1.5 Legacy / Orphan Pages Not Routed (App.tsx)

- `Login.tsx` 165L — legacy destination() to /dashboard Google/SSO placeholders, NOT routed (Welcome unified used).
- `Register.tsx` 103L — legacy ?type=shop amber admin upgrades to SHOPKEEPER warning, NOT routed.
- `CustomerLogin.tsx` 110L — legacy canAccessCustomer guard CountryCode + fullPhone, NOT routed (/customer/login → /login redirect).
- `Dashboard.tsx` 191L — This IS customer dashboard /customer/dashboard stat + HOW IT WORKS 4 steps, distinct from shop/Admin dashboards.

## 8. Appendices

**A Enums (Complete):** OrderStatus CREATED CONFIGURED PAYMENT_PENDING PAID COD_SELECTED TOKEN_GENERATED QUEUED ACCEPTED PRINTING COMPLETED CANCELLED FAILED RETRY_PENDING CANCELLATION_REQUESTED REFUND_PENDING REFUNDED (16 states canTransitionTo terminal COMPLETED/CANCELLED/REFUNDED false, FAILED→RETRY_PENDING/CANCELLED); TokenStatus GENERATED WAITING CALLED PRINTING COMPLETED LATE CANCELLED FAILED (invalid WAITING→COMPLETED/COMPLETED→PRINTING etc 400); TokenType NORMAL URGENT MANUAL LATE priority 100/10/20/200; QueueEntry DB WAITING CALLED PROCESSING DONE REMOVED vs Token standardized WAITING CALLED PRINTING COMPLETED CANCELLED FAILED; Payment PENDING AUTHORIZED PAID FAILED REFUNDED PARTIALLY_REFUNDED CANCELLED + payment_transactions INITIATED/SUCCESS/FAILURE; Refund REQUESTED APPROVED REJECTED INITIATED COMPLETED FAILED + refund_type FULL/PARTIAL/MANUAL; ShopStatus OPEN BUSY TEMPORARILY_UNAVAILABLE CLOSED SUSPENDED; PaperSize A4 A3 A5 LETTER LEGAL OTHER; ColorMode BW COLOR; SidesMode SINGLE DOUBLE; DiscountType PERCENTAGE FIXED (not FLAT) + max_discount_amount min_pages usage_limit_total/per_user times_used; RuleScope SHOP PLATFORM; RoleName CUSTOMER SHOPKEEPER ADMIN SUPER_ADMIN; OtpPurpose LOGIN VERIFY_EMAIL VERIFY_PHONE RESET_PASSWORD; Complaint category 9 WRONG_PRINT..OTHER status OPEN ASSIGNED INVESTIGATING RESOLVED REJECTED ESCALATED; UserStatus ACTIVE INACTIVE SUSPENDED; Printer status ONLINE PRINTING IDLE OFFLINE ERROR MAINTENANCE; DocumentPage orientation PORTRAIT/LANDSCAPE is_blank is_image_heavy; Notification channel IN_APP EMAIL SMS PUSH + read_at; QrCode ACTIVE INACTIVE EXPIRED REPLACED generated_by activated_at deactivated_at; FailedJob reason PRINTER_ERROR/PAPER_JAM status OPEN RETRIED etc; SystemSetting setting_key PK jsonb.

**B Badges:** shop OPEN success emerald50 BUSY warning amber CLOSED danger neutral SUSPENDED red; Order COMPLETED success PRINTING brand QUEUED warning CANCELLED danger FAILED danger PAID brand; Token WAITING warning CALLED brand PRINTING brand COMPLETED success FAILED danger etc.

**C Icons:** lucide Store FileText ShieldCheck Printer UploadCloud History Settings User LogOut LayoutDashboard QrCode Ticket Tag Building2 Users ScrollText Radio Timer etc 40+.

**D API Master (78 routes, grouped):**
- Auth: POST /api/auth/guest 201, POST /api/auth/register 201 409, POST /api/auth/login 200 401 429, POST /api/auth/refresh 200 single-flight, POST /api/auth/logout 200 revoke, POST /api/auth/otp/request 200 devCode, POST /api/auth/otp/verify 200, POST /api/auth/forgot-password devCode, POST /api/auth/reset-password 200, POST /api/auth/verify-email 200
- Users: GET /api/users/me 200 401, PATCH /api/users/me 200 fullName, DELETE /api/users/me 200 BCrypt 403, GET /api/admin/users?size100 200 ADMIN, PATCH /api/admin/users/:id/roles 200, PATCH /api/admin/users/:id/status 200 400 self, GET /api/admin/users/count {total,active}
- Shops: GET /api/shops permitAll 200 list OPEN|BUSY, GET /api/shops/:id permitAll 200 ownerCheck 403, GET /api/shops/mine auth SHOPKEEPER 200, POST /api/shops 201 SHOPKEEPER OPEN, PATCH/PUT/POST /api/shops/:id owner 200 DELETE password 403, GET /api/shops + admin all sorted
- Catalog: GET /api/shops/:shopId/printers permitAll list, POST /api/shops/:shopId/printers 201, PATCH /api/shops/:shopId/printers/:id status, DELETE ..., GET /api/shops/:shopId/inventory 200, PUT /api/shops/:shopId/inventory upsert 200 DELETE :rowId
- Documents: POST /api/documents/upload multipart 50MB 10 ext pdf/jpg/jpeg/png/doc/docx/ppt/pptx/xls/xlsx/txt analyze 201, GET /api/documents 200 mine, GET /api/documents/:id 200 403 owner, GET /api/documents/:id/download storageFallback 200
- Orders: POST /api/orders 201 INKO-YYYY 400 shop OPEN 403 doc owner, GET /api/orders mine 200, GET /api/orders/:id 200 hasShopAccess 403, POST /api/orders/:id/status 200, GET /api/orders/shop/:shopId 200 (IDOR missing ownership should 403)
- Pricing/Discounts: POST /api/pricing/quote 200 PriceBreakdown permitAll 404 pricing, GET /api/pricing/rules?scope&shopId 200 ownerCheck, POST/PUT/DELETE /api/pricing/rules/:id SHOP/ADMIN, GET/POST/PUT/DELETE /api/discounts scope shop, POST /api/discounts/:id/coupon upper, GET /api/discounts/coupons permitAll leak, admin duplicates /api/admin/pricing/* etc
- Tokens/Queue: POST /api/tokens 201, GET /api/tokens/:id byOrderId 200, GET /api/shops/:id/queue 200 WAITING|CALLED|PRINTING priority, POST /api/tokens/:id/transition 200 CALLED calledAt PRINTING startedAt COMPLETED 400 invalid @Version, GET /api/tokens/:id/wait 200 waitingAhead estimate 0.4*pages+1*job, GET /api/shops/:id/queue/stream TEXT_EVENT_STREAM 60s ConcurrentHashMap per-shop isolated FIXED, GET /api/net/lan-ip 200 {ip}
- Payments: POST /api/orders/:id/payment 201 MOCK_UPI|COD idempotencyKey PENDING 200 existing, POST /api/payments/:id/verify 200 PAID/FAILED idempotent, GET /api/orders/:id/payment 200, POST /api/orders/:id/refund REQUESTED 201 amount reason 10% fee, GET /api/orders/:id/refunds 200, POST /api/refunds/:id/decision APPROVE|REJECTED 200
- QR: GET /api/qr/:code/resolve permitAll 200 shopId ACTIVE else 404, POST /api/qr/:code/scan permitAll log, POST /api/shops/:shopId/qr 201, GET /api/shops/:shopId/qr 200 list, GET /api/shops/:shopId/qr/scans enriched 200, POST /api/qr/:id/regenerate owner 200 by qrId (not shopId), GET /api/admin/qr?shopId admin list (null bug)
- Analytics: GET /api/analytics/overview?shopId scoped 200 ADMIN|SHOPKEEPER, GET /api/analytics/series?days&shopId 200, GET /api/analytics/revenue 200, GET /api/analytics/mix 200 global not scoped, GET /api/actuator/health permitAll
- Complaints: POST /api/complaints 201 9 categories, GET /api/complaints?size100 admin 200, GET /api/complaints/:id 200 missing principal IDOR, PATCH /api/complaints/:id status 200 CHECK bypass 500
- Notifications: GET /api/notifications 200, GET /api/notifications/unread-count 200, POST /api/notifications/:id/read 200 missing auth any, POST /api/notifications/read-all 200

**E DB Tables (40 + 3 sequences):** V1 helpers uuid, V2 users/roles/perms/user_roles/role_permissions/refresh_tokens/otp_codes, V3 shops/shopkeepers/operating_hours/shopkeeper_permissions, V4 catalog printers/shop_paper_inventory/paper_types/printer_paper_sizes, V5 documents/document_pages, V6 pricing_rules/discount_rules/coupons/coupon_redemptions (system_settings moved to V10), V7 orders/order_items/print_configurations, V8 tokens/queue_entries/token_sequences/printer_jobs (queue PROCESSING DONE REMOVED vs Token standardized), V9 payments/payment_transactions/invoices/refunds, V10 qr_codes/qr_scan_events/notifications/notification_preferences/audit_logs/failed_jobs/system_settings, V11 seed roles perms, V12 fix stale + sequences order_number_seq/invoice_number_seq/complaint_number_seq.

**F Permissions (21 codes seed V11):** SHOPKEEPER 8 shop:manage_own queue:manage printer:manage inventory:manage pricing:manage_shop discount:manage_shop qr:manage_shop earnings:view_own; ADMIN 21 + shop:create shop:manage_all user:manage order:view_all payment:view_all refund:approve token:manage_all complaint:manage qr:manage_all audit:view analytics:view settings:manage admin:manage; SUPER_ADMIN same as ADMIN + all; CUSTOMER no rows in role_permissions (inferred shop:view); shopkeeper_permissions overrides; RateLimit 20/window login/otp-request only; JwtAuthFilter role extraction; permitAll mappings cross-ref.)

## 9. v5 Ultra Detail Addendum — Multi-doc / Coupon / State Consensus
- **Multi-doc:** `Document A sel10 B sel20 copies2 → sel30 pp60 SINGLE60 DOUBLE30` frontend preview `countPages` per doc `sum` must equal `Order totalPages60` else mismatch bug (now fixed via `PrintCalc.parsePageCount` per item).
- **Coupon:** `findByCodeIgnoreCase` + `validFrom/to` + `usageLimitTotal/perUser` + `redemptions.countByCouponId*` + `findByIdForUpdate PESSIMISTIC_WRITE` + `CouponRedemption` insert + `timesUsed++` atomic.
- **State consensus:** `Order 16` `Token 8` `QueueEntry standardized WAITING/CALLED/PRINTING/COMPLETED` `V13 DONE→COMPLETED` + `Token @Version` queue race one wins.

## 10. v6 Ultra Detail — Every Little Thing File-by-File (Redone Phased)
- **Frontend src/** 27 pages + 4 layouts + 6 lib + ui 242L + main 18L: each file above §1.5 + `App.tsx` 110L 15 routes `Welcome` unified, dead `Login/Register/CustomerLogin` flagged.
- **Backend src/** 124 files: `domain 41` `repo 18` `service 15` `web 18` `security 6` `migrations 13` + `PrintCalc 21L` `Token @Version 1L` `ShopPaperInventory FOR_UPDATE` `DiscountRule FOR_UPDATE`.
- **DB columns every table:** `users` 11 cols + `roles` 3 + `shops` 11 + `printers` 7 + `shop_paper_inventory` 5 + `documents` 9 + `pricing_rules` 11 + `tokens` 11 + `payments` 8 etc fully enumerated §8E.
- **API every field:** `CreateOrderRequest shopId@NotNull items@NotEmpty Item documentId@NotNull paperSize@NotNull colorMode@NotNull sidesMode@NotNull orientation pageSelection copies` + `QuoteRequest shopId paperSize colorMode sidesMode pages@Min1 copies@Min1 coupon` + `AuthDtos` etc validated 400 not 500.
- **UI every tiny:** Button `h-11` Badge `rounded-full text-xs` Input `h10 focus oklch` Alert `role=alert` Toast `3500ms` Stepper `pills` Progress `h2` Skeleton `pulse` — all cva variants enumerated.



