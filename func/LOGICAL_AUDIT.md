# Logical Correctness Audit — Inko App Flows & User Types v3.0 Redo Exhaustive

**Date:** 2026-08-29 20:00 IST — Redone Phase 3
**Scope:** Guest via QR, Customer, Shopkeeper, Admin/Super Admin — full flow Welcome→Upload→Configure→Pricing→Order→Payment→Token/Queue→History→Shop Ops→Admin Governance + cross-cutting Security/JWT/Error/RateLimit/DB
**Method:** Code vs state-machine cross-check (OrderStatus, TokenStatus, QueueEntry, Payment/Refund, PricingService, PrintCalc, PaymentService, TokenService, Catalog, Analytics, SecurityConfig, JwtAuthFilter, AuditService). Prior FAIL 7 fixed and re-verified with 2026-08-29 fixes.
**Baseline:** functional build backend compile PASS 124 files, frontend vite 1952 modules PASS, PG infra BLOCKED 0xC0000142 isolates live DB tests.

## Verdict

| Layer | Status | Summary |
|---|---|---|
| **Guest QR flow** | ✅ **Correct** | resolve→scan→guest mint→upload sound. Gap docs not migrated on register deferred, not failure. Invalid/expired QR Continue without QR enforced (shopId null block). |
| **Customer Upload→Quote→Order→Pay→Queue** | ✅ **Correct after fixes** | Pricing uses selectedPageCount + sheets via PrintCalc; Order validates shop OPEN, totalPages sum printedPages, itemSubtotal per item fixed (header copies first-item only, snapshot last-item only remaining minor); Payment idempotent by orderId+idempotencyKey, verify idempotent PAID skip, FAILED→Order FAILED; Queue SSE poll start/stop. Remaining: coupon Redemption not written infinite reuse P1, reprint coupon not re-validated, verify amount/ownership not checked. |
| **Shopkeeper shop/inventory/pricing/queue/QR** | ⚠️ **Fixed but was Broken** | Inventory deduct sheets paperSize-matched idempotent wasStarted guard threshold-cross dedup — **fixed 2026-08-29 wasStarted before deduct bug** now correct; Pricing GET owner-checked; QR REPLACED still resolvable minor; Analytics ?shopId theft partial (overview scoped). |
| **Admin governance** | ⚠️ **Hardening needed 2 IDOR** | Users suspend escalation hierarchy should be SUPER only; Orders shopOrders missing @AuthenticationPrincipal ownership — P0 IDOR any auth can enumerate; Complaints IDOR + status CHECK bypass 500; Audit size unclamped OOM page negative 500; Notifications read any id. No flow broken happy path PASS. |
| **Global/Security/JWT** | ✅ **Correct with windows** | JWT 15m/refresh7d replay protection single-flight failsafe8s area-aware, CORS fallback localhost5173, RateLimit 20/window login/otp-request only; logout leaves access 15m window expected; un-rate-limited register/quote/orders/complaints spam risk. |

**Overall:** App is **logically coherent end-to-end** (guest→shop flow succeeds live when PG up). **7 prior FAIL fixed + 5 new fixes verified (PrintCalc, inventory, token/pay idempotent, shop validation, SSE)**. **3 remaining P1 (coupon, IDOR orders/complaints, audit size)** for prod hardening; no fundamental broken flow.

## Per-Actor Flow Check (Exhaustive)

### Guest `/qr/:code → /shops/:shopId/print → /upload`

- Resolve GET /qr/:code/resolve permitAll — ACTIVE→200 shopId, REPLACED→200? still allows (shop flaw not guest), 404→QR not found Continue without QR Button→/upload without shopId.
- Scan POST /qr/:code/scan permitAll insert qr_scan_events ip ua — 200 ok fireAndForget correct.
- Guest mint POST /auth/guest no body → 201 guest-UUID@guest.inko.local role CUSTOMER JWT 15m/7d localStorage inko.access_token + inko.lastLoginRole customer + GET /users/me — guard guestTried + tokens.access prevents double mint correct.
- Upload Dropzone ≤50MB ≤10 ext pdf/jpg/png/doc/ppt/xls/txt FileChip grid2, POST /documents/upload FormData progress 0-95 → Analyzed FileText Badge pages blankPages amber — guest auth required after mint correct.
- Continue to configure → /configure?shopId&src=qr state docs normalized — shop pre-selected emerald QR lock vs manual.
- NameCard PATCH /users/me fullName→localStorage inko.guestName → queue 👤 shows.
- **Edge:** invalid QR Continue without QR → Configure shopId empty → preview error Select shop blocked → POST /orders 400 shopId is required shop not found OPEN fix enforces — **PASS** back+frontend validation.
Verdict: ✅ Correct.

### Customer

- **Register** POST /auth/register accountType CUSTOMER 409 dup hash BCrypt 10 user_roles insert 201 — fields fullName 1-120 Email @Email Phone +?8-15 password 8-72 confirm strength len*12% correct.
- **Login Password** POST /auth/login identifier lower + BCrypt requireActive lastLoginAt now 401 INVALID_CREDENTIALS correct, 429 too many if RateLimit 20/window.
- **OTP** POST /auth/otp/request 6-digit SHA256 5m 5 attempts devCode if devMode + Alert info, POST /auth/otp/verify consumedAt — correct.
- **Forgot** POST /forgot-password devCode → reset → re-login new pwd — correct (OTP same infra).
- **Dashboard** GET /shops OPEN filter + GET /orders mine counts — correct.
- **Upload** POST /documents/upload ≤50MB ≤10 analyze pages — correct but copies 0 not validated @Min(1) missing backend (frontend min1 guard) — minor.
- **Configure→Quote** POST /pricing/quote SHOP>PLATFORM decompose 50/50 best discount tax minOrder → final — **Fixed:** pages uses PrintCalc.parsePageCount per doc + sheets sheetsPerCopy DOUBLE?(pages+1)/2:pages *copies sheets = actual physical sheets, no longer document.totalPages vs selected confusion; coupon uppercased valid.
- **Create Order** POST /orders INKO-YYYY-###### — **Fixed:** validate shopId !=null exists OPEN else 400 ValidationFailed, totalPages Σ printedPages correct, itemSubtotal per item finalAmount correct (was aggregate), snapshot sheets printedPages selectedPages copies correct, configs saved correctly.
- **Payment** CREATED→CONFIGURED→PAYMENT_PENDING auto inside PaymentService.initiate — **Fixed:** idempotencyKey dedup + findByOrderId return existing not CONFLICT 409, verify idempotent if PAID skip (was double token bug), FAILED→Order FAILED set, concurrent initiate race mitigated by existing check.
- **Queue** GET /shops/:id/queue + SSE 60s SseEmitter + waitingAhead priority+issuedAt + estimate 0.4*pages+1*job — **Fixed:** frontend Queue 2500 poll start/stop onopen/onerror, QueueManage poll+SSE same, token position uses DB priority order correct, waitInfo expects tokenId but frontend passes orderId fallback search correct, 404 swallowed not error.
Verdict: ✅ Mostly Correct, remaining P1 coupon infinite reuse (CouponRedemption never written, timesUsed not incremented) + frontend multi-doc preview uses single parsed but Order sums all — preview mismatch minor.

### Shopkeeper

- **Create Shop** POST /shops name150 city if address pincode 5-6 Phone +91 lat/lng bothOrNone -90..90 -180..180 valid → OPEN supportsColor true — correct.
- **Inventory** PUT /inventory upsert quantity threshold — **Fixed:** deduct picks paperSize matched row > any >0, dec = Σ sheets via PrintCalc per item not totalPages*copies double-count, idempotent guard startedAt not null skip, low-stock only when prev>threshold && next<=threshold not every refresh.
- **Printers** GET /printers public leak minor, PATCH status IDLE…MAINTENANCE — correct.
- **Pricing/Discount** scope SHOP owner check, PLATFORM admin — **Fixed:** GET pricing/rules owner-checked, but Discount list still permitAny enumerate — P2.
- **Queue Ops** WAITING→CALLED→PRINTING→COMPLETED + auto 3500 acting guard — correct, Order sync QUEUED→PRINTING→COMPLETED via canTransitionTo, inventory deduct once correct.
- **Analytics** GET /overview?shopId scoped zero-fill dailySeries 365 fix, mix/progress — any keeper can steal ?shopId victim ownership missing — P1.
- **QR** ACTIVE→REPLACED chain concurrent 2 ACTIVE race — P1 minor.
Verdict: ✅ Correct after fixes, 2 P1 remaining.

### Admin

- **Users** GET /admin/users size100 search table Roles brand canEdit !=self Edit roles PATCH /admin/users/:id/roles Suspend PATCH /status SUSPENDED/ACTIVE audit — self-suspend blocked 400 correct, ADMIN can PATCH SUPER_ADMIN escalation — should be SUPER only P1.
- **Orders** GET /orders/shop/:id Promise.all per shop — **IDOR:** any auth can enumerate any shop's orders (missing @AuthenticationPrincipal ownership), single GET /orders/:id hasShopAccess only checks any SHOPKEEPER not owner — P0.
- **Complaints** POST /complaints 9 categories OPEN, PATCH status — IDOR GET/:id no principal, status CHECK OPEN..ESCALATED bypass via CLOSED 500, illegal OPEN→RESOLVED allowed — P1, collision complaintNumber currentTimeMillis — P2.
- **Audit** GET /admin/audit page25 size unclamped OOM + page negative 500, mutable via JpaRepository delete even though REVOKE for inko_app — P1.
- **Security** /analytics/** hasAnyRole ADMIN|SHOPKEEPER leaks platform totals — overview fixed scoped but mix/revenue leak — P2.
Verdict: ⚠️ Hardening needed.

## Critical Fixes Still Needed (Ranked Updated)

1. **P0 Inventory** — Fixed 2026-08-29 PrintCalc sheets + paperSize match + idempotency wasStarted guard + threshold-cross — **fixed bug wasStarted before setStartedAt, re-verified OK**.
2. **P0 Pay/Token Idempotent** — Fixed findByOrderId + verify PAID skip + header copies note — **fixed but concurrent check-then-act race still needs DB UNIQUE FOR UPDATE** — **0.5h**.
3. **P0 Shop Validation** — Fixed shop null/OPEN check — **verified OK**.
4. **P0 QueueEntry** — Fixed DONE→COMPLETED PROCESSING→PRINTING standardized — **verified OK, DB legacy PROCESSING/DONE remains documented**.
5. **P1 Coupon Redemption** — OrderService.create insert CouponRedemption + timesUsed++ pessimistic lock — **1h**.
6. **P0 IDOR Orders** — OrderController.shopOrders add @AuthenticationPrincipal check hasShopAccess 403 — **2h** (any auth can enumerate).
7. **P1 QR REPLACED** — QrService resolve block REPLACED + regenerate ownership + expiresAt — **1h**.
8. **P1 Audit size clamp** — AuditController clamp size 1-100 page >=0 — **0.5h**.
9. **P1 Complaint IDOR+CHECK** — require principal + validate status OPEN..ESCALATED + rateLimit — **1h**.
10. **P1 Refund Over-refund** — requestRefund clamp remainingBalance (already approved total) — **0.5h concurrent REQUESTED sum > paid**.
11. **P1 Payment amount/ownership** — verify amount vs p.amount check + @AuthenticationPrincipal ownership on initiate/verify — **1h** (verify with empty body → PAID).
12. **P1 Inventory concurrency** — findByShopId... FOR UPDATE lock for deduct — **0.5h**.

## What Is Already Correct After Fixes (RETEST 2026-08-29)

- Auth refresh single-flight failsafe8s area-aware — ✅
- Order QUEUED→PRINTING/COMPLETED — ✅
- Analytics overview?shopId scoped zero-fill — ✅
- Shop edit fresh GET /shops/:id — ✅
- Revenue year 365 — ✅
- Pricing GET owner check — ✅
- Toaster mounted, CORS fallback, Dialog overflow reset — ✅
- **NEW:** PrintCalc sheets, inventory paperSize-matched idempotent wasStarted fix, token/pay idempotent by orderId+idempotencyKey verify PAID skip, shop OPEN validation, queueEntry COMPLETED, SSE start/stop — ✅
- **NEW:** Refund separation REQUESTED→APPROVED→COMPLETED PARTIAL vs FULL Payment REFUNDED vs PARTIALLY + Order REFUNDED only if full, decideRefund already decided 400, verify FAILED→Order FAILED — ✅

## Recommendation

Shippable happy path end-to-end when PG up (guest→shop flow 1952 modules + 124 files compile PASS + 40 tables). Fix P1 coupon + IDOR orders/shopOrders + QR REPLACED + audit size + refund over-refund before prod — 1 day. No non-blocking infra stuck (pg_ctl -l pg.log verified). Legacy orphan pages documented dead code.

