# Use Cases — Customer (Authenticated, ROLE_CUSTOMER) v6.0 Redo Ultra Detailed

**Actor:** Customer — `roles [ROLE_CUSTOMER]` (may also have SHOPKEEPER if owner), `accountType CUSTOMER` → CUSTOMER only
**Source:** `Welcome.tsx` `Dashboard.tsx` `Upload.tsx` `Configure.tsx` `OrderDetail.tsx` `Queue.tsx` `History.tsx` `Account.tsx` + `DocumentController` `PricingService` `OrderService` `PaymentService` `TokenService` `SecurityConfig`
**Language:** English — per row Frontend + Backend + smallest UI details.

> Every row = testable UC. Prefix `UC-C-`.

---

## UC-C-01 — Register Customer Happy

- **Goal:** Create account and land dashboard.
- **Pre:** At /login tabs Create account, backend up.
- **Trigger:** Fill fullName 1-120 Email @Email xor Phone +?8-15 fullPhone Password 8-72 confirm match strength bar len*12% color.
- **Flow:** POST /api/auth/register {fullName,email,phone,password,accountType CUSTOMER} → 201 AuthResponse access15m refresh7d ROLE_CUSTOMER lastLoginRole customer → tokens.set + GET /users/me → /customer/dashboard.
- **Error:** 409 Already exists Alert red + link Sign in; weak password frontend disabled.
- **UI:** Card Customer FileText vs Shop Store border oklch active, Input h10, Button Create ArrowRight.
- **Post:** user active, shops online count visible.

## UC-C-02 — Sign In Password Happy

- **Goal:** Login with password.
- **Flow:** Input identifier Mail lowerTrim + Lock password + Button Sign in ArrowRight → POST /api/auth/login {identifier,password} findByEmailOrPhone BCrypt requireActive lastLoginAt now → 200 AuthResponse → AreaGuard customer true → dashboard.
- **Error:** 401 INVALID_CREDENTIALS Alert clear password; 429 Too many RateLimit 20/window.
- **UI:** Link Forgot? → /forgot-password.

## UC-C-03 — Sign In OTP

- **Flow:** Toggle Phone OTP → Country +91 + phone → Send OTP POST /auth/otp/request → 200 delivered devCode alert info indigo mono if devMode → Input 6 boxes mono → Verify POST /auth/otp/verify → AuthResponse. 5 attempts else TOO_MANY, 5m expiry.
- **UI:** Input mono tracking-widest, Button Verify.

## UC-C-04 — Forgot Password Reset

- **Flow:** /forgot-password Step1 identifier → POST /auth/forgot-password → devCode → Step2 code newPassword confirm → POST /auth/reset-password → Success re-login new pwd. 3-step Stepper.

## UC-C-05 — Customer Dashboard

- **Flow:** AreaGuard customer CustomerShell Hero Welcome back 👋 Hello {fullName} Stats Shops online GET /shops OPEN count / Your orders GET /orders mine count Shops grid cards Store name city Badge OPEN success.

## UC-C-06 — Upload via Customer

- **Flow:** Same as Guest Dropzone FormData POST /documents/upload 50MB10 analyze Result Cards Continue to configure → /configure?shopId state docs. Auth required via JWT.

## UC-C-07 — Configure Print (Shop select, Paper, Copies, Pages, Coupon)

- **Pre:** docs.length >0 shops GET /shops list.
- **Flow:** if qrShopId locked emerald QR {shop name} Badge QR else Select shop dropdown + p city. Inputs Paper A4/A3/A5/LETTER/LEGAL Select, Color BW/COLOR, Sides SINGLE/DOUBLE, Copies 1-100 Input number, Pages ALL placeholder Tip need only 1-5? Type 1-5 Input, Coupon TAG uppercase Input + Apply secondary 600ms debounce preview POST /pricing/quote {shopId,paper,color,sides,pages:parsed,copies,coupon upper} SHOP>PLATFORM sheets printedPages decompose best discount tax minOrder → YOU PAY ₹final emerald Card Confirm.
- **Error:** Select a shop → Alert; Pricing not configured 404; Coupon invalid 400; pages countPages mirrors PrintCalc 1-5,8 →6.
- **UI:** Stepper Configure current1, Card p5, Badge QR emerald, Button See price Refresh Confirm & pay ArrowRight.

## UC-C-08 — Create Order

- **Flow:** Button Confirm & print validates docIds + shopId → POST /api/orders {shopId,couponCode,items:[{documentId,paper,color,sides,AUTO,pageSelection,copies}]} → backend validate shop exists OPEN else 400, per doc quote sum totalPages printedPages → Order INKO-YYYY-###### CREATED configs+items itemSubtotal per item finalAmount correct snapshot sheets → 201 nav /order/:id poll3s.
- **Error:** 400 shop not open, 403 Not your document, 400 No items, docs empty → No documents found Card Go to upload.

## UC-C-09 — Pay MOCK_UPI Full

- **Flow:** OrderDetail pay MOCK_UPI → POST /orders/:id/payment {MOCK_UPI idempotencyKey uuid} → auto CREATED→CONFIGURED→PAYMENT_PENDING insert payment PENDING providerRef → POST /payments/:id/verify {} → provider verify true → payment PAID paidAt notify PAYMENT_CONFIRMED → Order PAYMENT_PENDING→PAID via transition idempotent → tokens.generate A%03d WAITING idempotent findByOrderId → notify TOKEN_ISSUED → UI Live Badge WAITING + Track queue Ticket.
- **Idempotent:** second verify returns same PAID no dup token.
- **UI:** Payment Card Buttons Pay with Mock UPI ShieldCheck ArrowRight primary / COD secondary; after PAID Banner emerald Payment verified track queue hide buttons.

## UC-C-10 — Pay COD

- **Flow:** Button Pay at shop (COD) → POST /orders/:id/payment {COD} → immediate payment PAID + Order COD_SELECTED→TOKEN_GENERATED→QUEUED → token WAITING. No verify needed.
- **Post:** 1 Order 1 Payment 1 Token 1 QueueEntry.

## UC-C-11 — Queue Track SSE+Poll

- **Flow:** /queue/:shopId?order= GET /shops/:id/queue poll2500 startPoll stopPoll on SSE onopen/onerror, EventSource /shops/:id/queue/stream 60s token event → load, Mine Card 5xl tokenNumber Badge Position Est wait pagesAhead 0.4 + jobs + myPages0.5.
- **UI:** Header Queue live badge emerald Live Radio vs amber Polling, At a glance waiting Your position.

## UC-C-12 — History Search Filter Reprint

- **Flow:** GET /orders mine Search orderNumber/status Shop Select Status Select Table mono8 Badge Date Amount View + Print again → /configure?reprint=&shopId state docs shopId originalItems preserve selectedPageCount copies coupon.
- **Post:** Reprint restores shop/docs/pages/copies paper via Configure useEffect.

## UC-C-13 — Profile & DangerZone

- **Flow:** /customer/profile avatar 16x16 Badge brand Mail Phone ShopId Open settings + Sign out POST /auth/logout refreshToken clear → /login DangerZone red Trash2 Dialog password Input → DELETE /users/me {password} BCrypt 403 if wrong → INACTIVE deleted-{id}.

## UC-C-14 — Settings + Notifications Bell

- **Flow:** /customer/settings 4 rows Bell notifications Volume2 sound Moon darkMode Globe language en-IN hi mr switch persist localStorage inko.settings speech Test voice. Bell h9 w9 badge red GET /notifications refetch30s + unread-count speak newest if sound.

## UC-C-15 — Refund & Complaint

- **Flow:** OrderDetail Request refund 10% fee Btn if PAID|COD|QUEUED|PRINTING and no REQUESTED → POST /orders/:id/refund {reason} → REQUESTED net gross-fee, List refunds Badge, admin Decide POST /refunds/:id/decision APPROVE→COMPLETED Payment REFUNDED else REJECTED. Complaint Dialog 9 categories POST /complaints OPEN admin resolves.

---

*Exhaustive customer flows verified static; live re-verify after PG fix.*




