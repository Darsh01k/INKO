# Use Cases — Customer (Authenticated, ROLE_CUSTOMER)

**Actor:** Customer — `roles [ROLE_CUSTOMER]` `status ACTIVE` via `Welcome` register/login  
**Language:** English — Frontend + Backend per use case, exhaustive including smallest UI details  
**Source:** `FUNCTIONALITY.md` §3 (Actor B) verified `Welcome.tsx, Dashboard.tsx, Upload.tsx, Configure.tsx, OrderDetail.tsx, Queue.tsx, History.tsx, Account.tsx, NotificationsBell`

---

## UC-C-01 — Register as Customer

- **Goal:** Create account with email/phone + password.
- **Pre:** At `/login` or `/register?type=`, role `CUSTOMER` selected (Card `FileText Customer` border oklch active vs `Store Shop Owner`).
- **UI:** `Welcome.tsx` tabs `Sign in / Create account`, step1 card selection, step2 `CheckCircle2` banner, fields `User fullName, Mail email, Phone CountryCode+91 + Input, Lock newPassword + strength bar width len*12% green>11 amber>7, Lock confirm`, `Back + Create Account` `loading spinner`.
- **Validation:** `fullName 1-120 required, email||phone required (else 400 VALIDATION Either email or phone), email @Email, phone +?[0-9]{8,15}, password 8-72, confirm match` else `Alert error`.
- **Flow:** `POST /api/auth/register {fullName,email||undef,phone||fullPhone(cc,local),password,accountType CUSTOMER}` 201 → `AuthResponse {accessToken 15m, refreshToken 7d, user}` → `tokens.set` → `setSessionArea customer` → `routeForRoles → ?next || /customer/dashboard`, notify `OTP VERIFY_EMAIL` 5m (delivery mocked, `devCode` in dev). Unique check: existing email/phone → `409 CONFLICT Already exists`.
- **Related:** UC-C-02, UC-C-03.

## UC-C-02 — Sign In with Password

- **Goal:** Access customer console.
- **UI:** `Welcome` `method password` or `CustomerLogin` — `Mail identifier + Lock password, Forgot? → /forgot-password, Sign in ArrowRight lg` `loading`.
- **Flow:** `POST /api/auth/login {identifier lower, password}` → `findUserOrThrow emailOrPhone`, `encoder.matches` (BCrypt), `requireActive else SUSPENDED 403`, `set lastLoginAt now`, `issueAuthResponse JWT sub userId roles ROLE_CUSTOMER perms [] shopId null`.
- **Errors:** `401 INVALID_CREDENTIALS Invalid identifier or password`, `403 SUSPENDED/INACTIVE`.
- **Post:** `localStorage lastLoginRole customer`, `RoleRedirect → /customer/dashboard`.
- **Alt OTP:** `Send OTP → POST /auth/otp/request` → `requestOtp fullPhone` → `delivered + devCode`, `Input mono 6-digit + Verify → POST /auth/otp/verify` → `AuthResponse`. Attempts >5 → `OTP_INVALID After 5`.

## UC-C-03 — Sign In with Phone OTP

- **Flow:** `Phone CountryCode Select w104 + Input 7-15 digits` → `Button Send OTP` → `POST /auth/otp/request {identifier fullPhone}` → `OtpIssueResponse {delivered true, channel mock-sms, devCode if devMode}` blue `Alert info`. Then `Input otpCode mono center + Verify` → `POST /auth/otp/verify {identifier,code}` → validates `SHA256 hash`, `expiresAt 5m`, `consumedAt null`; `registerFailedAttempt` up to 5 then consume; success `lastLoginAt`, `AuthResponse`.
- **UI Details:** `CountryCode` absolute `left-1.5`, `Button disabled busy + spinner`.

## UC-C-04 — Forgot / Reset Password

- **Trigger:** `/forgot-password` `Forgot?` link.
- **UI:** mesh 440px progress dots `h-1.5 w-8 indigo current emerald past` 3 steps `request|reset|done`, `Alert` errors.
- **Flow:** `step=request Mail email + Send reset code → POST /auth/forgot-password {email lower} → OtpIssueResponse devCode` 200 else `404 NOT_FOUND No account`. `step=reset KeyRound code + Lock newPassword + Set new password + Back ArrowLeft → POST /auth/reset-password {identifier,code,newPassword}` → validates OTP `SHA256`, `encoder.encode newPassword`, `revokeAllForUser now` (all sessions). `step=done CheckCircle2 Success Password updated… signed out → Back to sign in → /login`.
- **Related:** Invalid code → `400 OTP_INVALID Incorrect code`, expired → `OTP Expired - request new`.

## UC-C-05 — Customer Dashboard Discover Shops

- **Goal:** See open shops and quick start.
- **Route:** `/customer/dashboard` `CustomerShell + AreaGuard customer`.
- **State:** `useOpenShops GET /shops refetch30s` + `GET /orders` my count.
- **UI:**
  - Hero `rounded28 border-indigo-200` gradient8 blobs `Sparkles New Smart queue` badge `Welcome back {firstName} 👋` hint `Upload→queue token` CTA `Upload documents ArrowRight lg + View history secondary` checklist `CheckCircle2 No waiting, Palette B&W & Color`.
  - Stats `Shops online {n/—} live/refreshing...`, `Your orders {n/—}`, `HOW IT WORKS 4 steps Upload/Configure/Preview/Pay`.
  - Feature cards filtered by `user.roles`: `Upload & print FileUp + Browse shops Store → /upload` (CUSTOMER), `Shop dashboard LayoutDashboard → /shop/dashboard` (SHOPKEEPER|ADMIN hidden for pure customer), `Admin console ShieldCheck → /admin/dashboard` hidden.
  - Shops: header `Open shops near you` `Badge open count + Radio live dot refreshing…`, states: `Skeleton 3`, `AlertCircle Could not load Retry`, `Empty Store No shops open (9am) + Upload anyway`, grid3 cards `Store icon indigo50 + name + MapPin city + Badge OPEN success/BUSY warning + Badge Color available brand/B&W neutral + Buttons Select →/upload + View queue →/queue/id`.
- **Backend:** `GET /shops` permitAll `OPEN|BUSY` sorted, customer sees not own.
- **Errors:** Backend down → `ERR_NETWORK` alert.

## UC-C-06 — Upload Documents (Customer)

- Same as guest UC-G-04 but upsell hidden, `Progress` real `axios onUploadProgress`, `preselectedShop` persists `?shopId`, `guestName` not needed.
- **Additional:** Customer can `GET /documents` list own + `download`.
- **Backend:** `POST /documents/upload` with `Bearer JWT` → `doc.customerId = principal.userId`, stored `./data/storage/{userId}/…`, pages estimate, `DocumentPage` rows.
- **Alternatives:** Max10, 50MB, ext check same; `Alert` on overload.

## UC-C-07 — Configure Print & Preview Price

- **Route:** `/configure?shopId&reprint` state `docs`.
- **UI:** `Stepper Upload Configure Pay current1` left shop selector `QR locked emerald` or `Select`, docs chips `FileText +Badge pages`, Options `Layers A4/A3/A5/LETTER/LEGAL, Palette BW/COLOR, BookOpen SINGLE/DOUBLE, Copy Input, Pages Input ALL tip 1-5,8`, Coupon `Tag Input uppercase mono + Apply → couponApplied`, Error `Alert`, quote emerald `YOU PAY ₹final taxes`, Right sticky `Calculator Live preview` slate-900 header + `subtotal, paper/color/side/specialCharges, discount, tax, Final bold`, `ShieldCheck notes`, `What happens next 1-3 steps`.
- **Logic:** `POST /pricing/quote {shopId,paperSize,colorMode,sidesMode,pages,copies,couponCode}` → `PricingService.quote` validates `pages>0 copies1-999`, resolves rule `SHOP override PLATFORM else PRICING_NOT_CONFIGURED`, `unitPrice, printedPages pages*copies, sheets (DOUBLE (pages+1)//2*copies), subtotal unit*printed, specialCharge, decompose paper/color/side half split, discount resolve by coupon or best active, tax percent settings, currency INR`.
- **Errors:** Coupon `COUPON_INVALID/EXPIRED/LIMIT_REACHED`, `DISCOUNT_NOT_APPLICABLE`.

## UC-C-08 — Create Order

- **Trigger:** `Yes, print — Confirm ArrowRight` → `POST /api/orders {shopId,couponCode,items[{documentId,paperSize,colorMode,sidesMode,orientation AUTO,pageSelection,copies}]} 201` → `Order INKO-YYYY-###### status CREATED customerId shopId totalPages/copies subtotal/discount/tax/final snapshot json` + `PrintConfiguration per item + OrderItem`.
- **Post:** `notify ORDER_CREATED /order/{id}` → `NotificationsBell` unread++.
- **Errors:** Doc not owned `403`, no items `400`.

## UC-C-09 — View Order Detail + Timeline

- **Route:** `/order/:id` poll 3s.
- **UI:** Header `Receipt ORDER {orderNumber} Badge completed success/cancelled danger/brand + ₹finalAmount CreatedAt + Track queue Ticket + History ghost`, Timeline `PLACED(→CREATED/CONFIGURED/PAYMENT_PENDING) → PAYMENT(PAID/COD) → QUEUED → PRINTING → COMPLETED` circles `emerald ✓ <current, indigo current, slate next` lines, Live Badge `WAITING/Called — go to counter/Printing started…/Print completed — collect + estimatedWaitMinutes`, grid left `FileText items + Pricing snapshot pre`, right `CreditCard Mock UPI ShieldCheck ArrowRight + COD, payMsg Alert, refunds list Badge + Approve/Reject admin, Request refund 10% fee Btn if PAID`, Help `LifeBuoy Open queue / File complaint`.
- **Logic:** `GET /orders/{id} + GET /tokens/{id}/wait + GET /tokens/{id} + GET /orders/{id}/refunds`.

## UC-C-10 — Pay Mock UPI / COD

- **Flow:** `POST /orders/{id}/payment {method MOCK_UPI|GATEWAY|COD, idempotencyKey uuid}` → auto `CREATED→CONFIGURED→PAYMENT_PENDING` → `Payment amount finalAmount provider MOCK status PENDING idempotency UQ`, if `COD` → `Order COD_SELECTED → TOKEN_GENERATED → QUEUED` immediate notify else `MOCK_UPI PENDING`. Then `POST /payments/{id}/verify {payload} → verify → PAID + paidAt + Order PAID → generate token A001…` notify `PAYMENT_CONFIRMED + TOKEN_ISSUED`.
- **UI:** `payBusy spinner`, `Alert payMsg success/error`, `Button Mock UPI ShieldCheck / COD`.
- **Errors:** `409 Already paid`, `402 Payment failed → Order FAILED`.

## UC-C-11 — Request Refund (10% Fee)

- **Trigger:** `OrderDetail` `Request refund (10% fee) Button` visible if `PAID|PARTIALLY_REFUNDED`.
- **Flow:** `POST /orders/{id}/refund {amount nullable max, reason}` → `Refund net = gross - 10% fee 2dp type FULL|PARTIAL status REQUESTED|APPROVED requestedBy user breakdown json`, `Payment PARTIALLY_REFUNDED`, notify `REFUND_REQUESTED`.
- **Alt:** Admin `POST /refunds/{id}/decision {APPROVE|REJECT}` → `COMPLETED/REJECTED` + `Payment REFUNDED` + notify `REFUND_APPROVED`.

## UC-C-12 — File Complaint

- **Trigger:** `OrderDetail` `File complaint` Link → `Dialog Select category 9 (WRONG_PRINT…OTHER) + Textarea description + attachments? + Submit` → `POST /complaints {orderId,shopId,category,description}` 201 `OPEN` → notify admin, `Badge` status.
- **Related:** Admin `PATCH /complaints/{id}` to close.

## UC-C-13 — Track Queue Live

- **Route:** `/queue/:shopId?order=`.
- **UI:** Header `Store Queue — Shop {id8} live badge Live SSE emerald Radio / Polling amber Timer + Estimates… + New print Ticket`, Mine Card gradient `indigo→violet(PRINTING blue, COMPLETED emerald) 5xl tokenNumber + Badge friendlyStatus + Position + Timer wait + Ticket`, Stats `Shop/Type/Status` 3 cols, Main `Users Waiting • n` list `isMine border-indigo bg-indigo-50 You brand token slate-900 + waitingAhead pos`, Right `Clock3 At a glance` cards.
- **Logic:** `GET /shops/{shopId}/queue` + `GET /tokens/{id}` + `GET /tokens/{id}/wait?shopId` `waitingAhead = tokens WAITING with priority<me or = & issuedAt<me count` ; `estimate 0.4*pagesAhead +1*jobAhead +0.5*myPages`. SSE `EventSource /shops/{shopId}/queue/stream 60s` broadcast else `setInterval 5s`.

## UC-C-14 — History List / Filter / Reprint

- **Route:** `/history`.
- **UI:** Header `History Order history + Refresh`, Card filters `Search Input + Status Select ALL|QUEUED|ACCEPTED|PRINTING|COMPLETED|CANCELLED|REFUNDED + Shop Select + Filter count {n}`, `Skeleton 3 / Empty No orders yet / No matching + Clear`, table `Order mono8 + Shop Printer + Status Badge successor + Date Clock3 + Amount + View secondary + Print again` (mobile cards).
- **Flow:** `GET /orders → filtered by search orderNumber/status, status, shop, hay`. `Print again → GET /orders/{id} → map items→docs → nav /configure?reprint&id state` to recreate.

## UC-C-15 — Profile View / Sign Out

- **Route:** `/customer/profile` `home /customer/dashboard`.
- **UI:** `Back ArrowLeft`, Card `avatar initials 16x16 slate-900 + fullName + Badge brand roles + Badge status success/warning`, `dl Mail Email, Phone Phone, Store ShopId mono, ShieldCheck UserId mono`, Buttons `Open settings → /customer/settings + Sign out LogOut danger → POST /auth/logout {refreshToken} + clear + → /login`.
- **Backend:** `GET /users/me`.

## UC-C-16 — Edit Profile Full Name (Guest→Customer)

- **Trigger:** `PATCH /users/me {fullName ≤120}` 200 updates → `refreshMe`.

## UC-C-17 — Delete Account (Anonymize)

- **UI:** `DangerZone` red border `Trash2 Delete my account danger` → Dialog `Alert error + Input password + Cancel + Delete forever Trash2 danger`.
- **Flow:** `DELETE /users/me {data:{password}}` → `BCrypt matches else 401`, `revokeAllForUser now`, `User status INACTIVE fullName Deleted User email deleted-{id}@deleted.local phone null password null` saved, `logout →/login`.
- **Post:** Orders remain for bookkeeping.

## UC-C-18 — Settings (Customer)

- **Route:** `/customer/settings`.
- **UI:** `Back`, Card `settings/settingsDesc saved flash Check`, rows 4 `notifications Bell Switch, sound Volume2 Switch + Test voice Volume2 speak(voiceDemo), darkMode Moon Switch, language Globe Select en-IN/hi/mr` note `Device-local inko.settings` + toggles persist `localStorage` + `documentElement dark class + lang attr`.
- **Related:** `NotificationsBell enabled {!!user && settings.notifications}` & sound `speak newest`.
- **Languages:** STRINGS `settings, notifications, sound, darkMode, language, testVoice, voiceDemo, saved, navDashboard, navUpload, navOrders, navQueue… lowBadge` 45 keys ×3 locales.

## UC-C-19 — Notifications Bell (Customer)

- **UI:** `Bell h-9 w-9` badge red `>0` vs `BellOff disabled if notifications off`. Dropdown `fixed inset-x-3 top-14 sm:w-80 max-h70vh` header `Mark all read CheckCheck indigo`, list `rounded-xl px3 py2.5 unread bg-indigo-50 dot else opacity60 Link if linkPath → /queue?order=`.
- **Logic:** `GET /notifications refetch30s + GET /unread-count`, `speak` if `sound && unread>prev`, `POST /{id}/read`, `POST /read-all`.
- **Types received:** `ORDER_CREATED, PAYMENT_PAID, TOKEN_ISSUED|CALLED|PRINTING|COMPLETED, REFUND_APPROVED`.

## UC-C-20 — AreaGuard Isolation (Customer Try Shop/Admin)

- **Flow:** `user CUSTOMER` visit `/shop/dashboard` → `AreaGuard shop: getSessionArea != shop` → `mesh-gradient ShieldAlert Different console required: Customer → Shop console  Buttons Sign in to Shop / Back to my Customer`.
- **Related:** `getSessionArea` from `lastLoginRole`.

## UC-C-21 — Error Handling Across Customer Flows

- **Network:** `ERR_NETWORK → Cannot reach server — check connection`.
- **401:** `Please sign in to continue.` + interceptor `refreshPromise` else redirect `lastLoginRole` path.
- **403:** `You do not have permission`.
- **404:** `Not found — may have been removed`.
- **405:** `This action is not available — may still be updating`.
- **429:** `Too many attempts — wait`.

## UC-C-22 — Creating Customer Account for Testing (Browser Explicit)

- **Goal (Testing):** Create a fresh Customer via browser UI and verify DB+API, not just code.
- **Pre (Test Env):** `devMode true`, `http://localhost:5173/login` (Welcome) accessible, `localStorage` cleared.
- **Browser Steps (Explicit):**
  1. Go `http://localhost:5173/login` → click `Create account` tab → select Card `Customer (FileText)` border `oklch` active.
  2. Fill `Full Name: Test Customer {timestamp}`, `Email: testcust+{timestamp}@test.inko`, `Phone: Country +91 + 90000{rand}`, `Password: Test@12345`, `Confirm: Test@12345` → observe strength bar `width 96% green`.
  3. Click `Create Account` → Network `POST /api/auth/register {fullName,email,phone fullPhone, password, accountType CUSTOMER}` 201 → `Application LocalStorage inko.access_token / refresh_token` set + `inko.lastLoginRole customer`.
  4. Assert redirect `→ /customer/dashboard` hero `Welcome back Test` + `AreaGuard` not shown.
  5. DB: `SELECT email, roles FROM users JOIN user_roles … WHERE email LIKE 'testcust+%'` has `CUSTOMER`, `status ACTIVE`, `created_at ≈ now`.
  6. API: `curl -H "Authorization: Bearer <access>" http://localhost:8080/api/users/me` returns `roles [ROLE_CUSTOMER]`.
- **Alt OTP Create (if registered via OTP):** Use phone path → `POST /auth/otp/request` → copy `devCode` from `Alert info devCode` (devMode) or backend log `OTP issued …` → `Verify` → same asserts.
- **Negative Tests:** Submit duplicate email → `Alert 409 Already exists`; password `short` → client `Alert Password 8-72`; no email/phone → `Alert Either email or phone required`.

## UC-C-23 — Logging In as Customer for Testing (Password + OTP, Browser Explicit)

- **Goal (Testing):** Verify Customer login via both methods on browser.
- **Pre:** Account from UC-C-22 exists, `logout` first (`Profile → Sign out` or `localStorage.clear()`).
- **Password Path (Browser):**
  1. `http://localhost:5173/login` tab `Sign in` → `method Password` → `Mail identifier: testcust+…@test.inko` + `Lock password: Test@12345` → `Sign in ArrowRight`.
  2. Network `POST /api/auth/login 200 AuthResponse` → `lastLoginRole customer` → `RoleRedirect → /customer/dashboard`.
  3. Verify `GET /users/me` 200, navbar `CUSTOMER` badge, `GET /shops` 200 list.
  4. Hard refresh → `AuthProvider bootstrap GET /users/me` succeeds, no `Checking your session…` hang; inspect `Authorization: Bearer <new accessToken>` rotated if expired 15m → interceptor `POST /auth/refresh` single-flight.
- **OTP Path (Browser):**
  1. Tab `Phone OTP` → `Country +91 + phone 90000…` → `Send OTP` → `POST /auth/otp/request 200 delivered + devCode` shows `Alert info devCode 6-digit` (devMode) → copy from Network Response or UI `devHint`.
  2. Input `otpCode mono center` → `Verify` → `POST /auth/otp/verify 200 AuthResponse` → same redirects.
  3. Wrong code → `Alert Incorrect code` + `attempts 1/5`; 5 fails → `No active code — request new`.
- **Forgot Password  Login After Reset (Browser):** Click `Forgot? → /forgot-password` → `request Mail → devCode` → `reset KeyRound code + Lock newPassword → POST /reset-password 200` → back `Sign in` with new password → success; old password 401.
- **DB Checks:** `SELECT last_login_at FROM users WHERE email=…` updated after login; `SELECT COUNT(*) FROM refresh_tokens WHERE user_id=… AND revoked_at IS NULL` =1 after login.
- **Error Tests:** Wrong password → `401 Invalid identifier`; suspended user `PATCH /admin/users/{id}/status SUSPENDED` then login → `403 This account has been suspended`.

---

### Traceability Customer

| UC | File:Endpoint |
|---|---|
| C-01 | `Welcome.tsx:register` → `POST /auth/register` |
| C-06 | `Upload.tsx:POST /documents/upload` |
| C-07 | `Configure.tsx:POST /pricing/quote` |
| C-08 | `POST /orders` |
| C-10 | `POST /orders/{id}/payment + /payments/{id}/verify` |
| C-13 | `Queue.tsx:GET /shops/{id}/queue + SSE` |
| C-14 | `History.tsx:GET /orders` |
| C-19 | `NotificationsBell: GET /notifications` |

*Exhaustive per FUNCTIONALITY §3 — no omitted page or badge tone.*
