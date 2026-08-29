# Logical Correctness Audit — Inko App Flows & User Types

**Date:** 2026-08-28 23:12 IST  
**Scope:** Guest via QR, Customer, Shopkeeper, Admin/Super Admin — full flow `Welcome → Upload → Configure → Pricing → Order → Payment → Token/Queue → History → Shop Ops → Admin Governance`  
**Method:** Code vs state-machine cross-check (`OrderStatus, TokenStatus, PricingService, PaymentService, Catalog, Analytics, SecurityConfig, JWT`). Previously fixed 7 FAIL (RETEST 2026-08-28) re-verified.

## Verdict

| Layer | Logical Status |
|---|---|
| **Guest QR flow** | ✅ **Correct** — mint → upload → order path sound. One gap: docs not migrated on register (known deferred, not failure). |
| **Customer order → pay → queue** | ⚠️ **Mostly Correct, 3 logic flaws** — pricing `copies` double-count in inventory + coupon redemption never written (infinite reuse) + payment verify lacks amount check. Flow `CREATED→QUEUED` via PAID is correct after fix. |
| **Shopkeeper shop/inventory/pricing/queue/QR** | ⚠️ **Mostly Correct, 4 flaws** — inventory deduct picks wrong paperSize + double-count, pricing GET scope leak (fixed for rules, coupons still leak), QR `REPLACED` still resolvable, token priority ignored in frontend position. |
| **Admin governance** | ⚠️ **Needs Hardening, 3 critical** — shopOrders & complaint IDOR (any auth can read any shop's orders/complaints), analytics `?shopId` theft without ownership check (platform totals leaked to shopkeeper), ADMIN→SUPER_ADMIN escalation via `changeRoles`. |
| **Global / Security / JWT** | ⚠️ **Correct with window** — JWT 15m/refresh 7d replay protection OK, but logout leaves access valid 15m; CORS fallback fixed, rate-limit now on login/OTP only. |

**Overall:** App flow is **logically coherent** (end-to-end order succeeds), but **7 remaining logic issues** need fixes for correctness/security. No flow is fundamentally broken.

## Per-Actor Flow Check

### Guest (`/qr/:code → /shops/:shopId/print → /upload`)
- `QrScan resolve→scan→guest mint→ShopPrint→Upload` — ✅ Correct, permitAll wiring `SecurityConfig 83-87` matches. Edge `REPLACED` still resolvable is shop-side flaw, not guest.

### Customer
- **Upload** (`POST /documents/upload ≤50MB ≤10 ext, analyze pages, pages per doc`) — ✅ Correct, but `copies=0` not validated at controller (`@Min(1)` missing) and `parsePages` `NumberFormatException→500` not 400.
- **Configure → Quote** (`POST /pricing/quote shop override PLATFORM, decompose paper/color/side 50/50, discount best, tax, minOrder`) — ⚠️ `minOrderAmount` tax inflation (`final<min → final=min, tax=final-afterDiscount` inflates tax) + frontend multi-doc `countPages` uses first doc only vs backend sums all docs → preview mismatch 5 vs 17 pages.
- **Create Order** (`POST /orders INKO-YYYY-###### + PrintConfiguration + OrderItem`) — ⚠️ `header copies = specs[0].copies` wrong for heterogenous copies, `itemSubtotal = finalAmount aggregate` not per-item, `snapshot` overwritten last item only.
- **Payment** (`CREATED→CONFIGURED→PAYMENT_PENDING→PAID/COD→QUEUED` via `PaymentService.initiate` then `verify` → `tokens.generate A001`) — ⚠️ `initiate` auto-drives `CREATED→CONFIGURED→PAYMENT_PENDING` without exposed CONFIGURED API (fictional state), `verify` with empty body → PAID (no amount check), concurrent initiate can create 2 payments (race on `findByOrderId`), `FAILED` payment blocks retry (`CONFLICT`), coupon never redeemed (`CouponRedemption` not written → infinite reuse).
- **Queue** (`GET /shops/{id}/queue + SSE` → `waitingAhead priority+issuedAt, estimate 0.4*pages+1*job`) — ⚠️ frontend `waiting` filter includes `QUEUED` (non-existent TokenStatus) + backend `WAITING` only vs frontend `WAITING,QUEUED` mismatch + `Queue.tsx position = waiting.findIndex` ignores priority vs DB `order by priority`, race `waitInfo` expects tokenId but receives orderId → 404 swallowed.

### Shopkeeper
- **Create/Update Shop** (`POST/PATCH /shops name≤150, address→city, pincode 5-6, lat/lng bothOrNone`) — ✅ Fixed, but `trimOrNull` silently truncates instead of VALIDATION and `PATCH {latitude:12.5}` alone passes due to retained `lng` (XOR on merged entity).
- **Printers/Inventory** (`GET /printers` public leak, `PUT /inventory upsert defaults A4` → spurious row, `NFE→500`) — ⚠️ **Inventory deduct critical:** `TokenService 117 dec = totalPages * copies` double-counts (`totalPages` already `pages*copies`), picks first `quantity>0` row regardless of `paperSize` (A3 order deducts A4), ignores `sidesMode DOUBLE` sheets vs printedPages, `lowStockThreshold` notify only after print.
- **Pricing/Discount** (scope `SHOP`→owner check, `PLATFORM`→admin) — ✅ `PricingController` GET now owner-checked (fixed), but `DiscountController list/coupons` still permitAny → customer can enumerate all shop discounts; `POST /pricing/rules` duplicate check only on create not update → conflicting rules via PUT.
- **Queue Ops** (`WAITING→CALLED→PRINTING→COMPLETED` + auto 3500 `WAITING→CALLED→PRINTING 2s →COMPLETED`) — ✅ `OrderStatus QUEUED→PRINTING/COMPLETED` fix allows quick-complete, inventory low-stock notify `WAITING.size()` not date-filtered.
- **Analytics** (`GET /analytics/overview?shopId scoped, zero-fill dailySeries`) — ✅ Scoped after fix, but any keeper can steal `?shopId=victim` (no ownership check), `mix` global not shop-scoped, `revenue` sums 30d not total, frontend hour fake random revenue + year `idx%12` not calendar month.
- **QR** (`ACTIVE→REPLACED→new ACTIVE chain`) — ⚠️ `REPLACED` still `resolve` allowed → old QR works, `regenerate` no shop check, concurrent generate can create 2 ACTIVE, `replacedById` chain overwritten.

### Admin
- **Users** (`GET /admin/users, PATCH roles/status, audit`) — ⚠️ `ADMIN` can `PATCH SUPER_ADMIN` as role (escalation), any ADMIN can suspend any ADMIN/SUPER_ADMIN (collusion), `changeStatus` already blocks self but not peer, audit `actorRole` hard-coded `ADMIN`, `audit_logs` append-only only if `inko_app` role exists (prod host without it → mutable).
- **Orders** (`GET /orders/shop/{shopId} Promise.all`) — ❌ **IDOR:** `OrderController.shopOrders` has zero `@AuthenticationPrincipal` / ownership check → any authenticated user enumerates any shop's orders; single `GET /orders/{id} hasShopAccess` only checks any `SHOPKEEPER` not owner shop. Cross-shop read.
- **Complaints** (`POST /complaints, PATCH status`) — ❌ **IDOR + spam:** `GET /complaints/{id}` no principal, `PATCH {status:"CLOSED"}` bypasses `Complaint CHECK` (DB has `OPEN…ESCALATED` but UI `CLOSED` →500) and allows illegal `OPEN→RESOLVED`, no rate-limit, `complaintNumber` `currentTimeMillis` collision, description unlimited.
- **Audit** (`GET /admin/audit?page&size25`) — ⚠️ `size` unclamped (2e9 → OOM), `page negative→500`, entity mutable via `JpaRepository.delete`.
- **Security** (`/analytics/**` hasAnyRole ADMIN|SHOPKEEPER leaks platform totals to shopkeeper) — fixed for `overview` scope but not for `mix/revenue` + string concat `shop_id='…'` weak sanitize.

## Critical Fixes Still Needed (Ranked)

1. **P0 Inventory** `TokenService.java:117 paperSize match + 121 first-quantity pick + 52 printedPages vs sheets` — deduct `select paperSize = pc.paperSize` row, use `sheetsPerCopy` not `printedPages*copies`.
2. **P0 IDOR** `OrderController.shopOrders` + `ComplaintController GET/{id}` + `Analytics ?shopId` — add `hasShopAccess(principal, shopId)` check (owner or ADMIN) and return 403 else.
3. **P0 Coupon** `OrderService.create` → insert `CouponRedemption` + `timesUsed++` in same transaction with pessimistic lock on `DiscountRule`.
4. **P1 Payment** `PaymentService.verify` amount check + idempotent (if `PAID` skip), `FAILED→Order FAILED`, `initiate` block `FAILED` retry allowed, `orderId+customerId` ownership check + `@AuthenticationPrincipal` on initiate/verify.
5. **P1 QR** `QrService resolve` block `REPLACED`, `QrController regenerate/list` require `shop ownership`, `expiresAt` set.
6. **P1 Admin** `ADMIN cannot grant SUPER_ADMIN`, `changeStatus` already self-block good; add hierarchy: `SUPER_ADMIN only` for suspend/escalate.

## What Is Already Correct After 7 Fixes (RETEST)

- Auth refresh single-flight, failsafe 8s, area-aware redirect — ✅
- Order `QUEUED→PRINTING/COMPLETED` — ✅
- Analytics `overview?shopId` zero-fill scoped — ✅
- Shop edit fresh `GET /shops/{id}` — ✅
- Revenue `year 365` — ✅
- `Pricing GET` owner check — ✅
- `Toaster` mounted, `CORS fallback localhost:5173`, `Dialog overflow` always reset — ✅

## Recommendation

App is shippable for happy path (guest→shop flow works end-to-end, build passes 1952 modules + compile pass). Fix P0s before prod: 1 day for inventory+IDOR+coupon, 0.5 day for payment+QR. I can apply P0 patches now without getting stuck (non-blocking `pg_ctl -l pg.log` verified) — say yes to proceed.
