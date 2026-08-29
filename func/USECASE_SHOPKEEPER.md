# Use Cases — Shopkeeper (ROLE_SHOPKEEPER, accountType SHOP_OWNER) v2.0 Exhaustive

**Actor:** Shopkeeper owner of `shops.owner_user_id` — roles [SHOPKEEPER may+ CUSTOMER], register SHOP_OWNER → CUSTOMER+SHOPKEEPER, perms 8 shop:manage_own etc, `lastLoginRole shop`
**Source:** `ShopLogin.tsx` `Welcome.tsx` `shop/Dashboard.tsx` `QueueManage.tsx` `Shops.tsx` `Pricing.tsx` `Qr.tsx` `Account.tsx` + `ShopController` `CatalogController` `PricingController` `TokenService` `QrService` `AnalyticsService`
**Language:** English — per row Frontend + Backend + smallest UI.

> Prefix `UC-S-`.

---

## UC-S-01 — Register as Shop Owner

- **Goal:** Become shopkeeper.
- **Flow:** Welcome Store Shop Owner border oklch active vs Customer → POST /api/auth/register {accountType SHOP_OWNER} 201 SHOPKEEPER → lastLoginRole shop → /shop/dashboard if ?next else dashboard.
- **UI:** Button Create shop owner Account ArrowRight.

## UC-S-02 — Sign In to Shop Console

- **Flow:** /shop/login amber SHOP OS Mail+Lock / OTP → POST /auth/login → 200 ROLE_SHOPKEEPER perms 8 shopId primary → canAccessShop SHOPKEEPER|ADMIN|SUPER else error This account is a shop owner… → ShopShell NAV5.
- **Error:** 401 wrong, 403 not shopkeeper.

## UC-S-03 — No Shop Yet Create First Shop

- **Flow:** GET /shops/mine empty → Card dashed Store No shop yet + Form Shop name*150 + City + Create POST /shops {name,city} validations name city pincode 5-6 Phone +91 lat/lng bothOrNone → OPEN supportsColor → 201 card appears.
- **UI:** Input h10 rounded-xl + Button Create.

## UC-S-04 — Dashboard KPIs + Revenue

- **Flow:** GET /shops/mine → shopId → GET /analytics/overview?shopId scoped → KPIs Shop Orders today Shop Revenue ₹ Shops openNow In queue, GET /analytics/series?days 1/7/30/365 zero-fill Bars gradient height, GET /shops/:id/queue 3 preview QueueNow tokenNumber Badge, GET /printers + inventory + GET /orders/shop/:id 5 Recent table.
- **Tabs:** Revenue by Day hour1 day7 week30 year365 grouped12.

## UC-S-05 — Queue Manage Manual

- **Flow:** GET /shops/mine → shopId GET /shops/:id/queue poll2500 + SSE stream stop/start Live badge emerald vs amber Filter ALL/WAITING/CALLED/PRINTING, NOW SERVING 6xl Badge friendly + Actions WAITING Call customer CALLED → Phone CALLED Printing started PRINTING → Hand over done COMPLETED emerald + Fail Cancel ghost, Tokens list rounded-2xl h12 w16 slate900 👤 customerName Actions sm, POST /tokens/:id/transition VALID else 400 Already completed, idempotent guard acting flag, inventory deduct once sheets paperSize matched threshold-cross notify.
- **Alt:** auto 2s after CALLED → PRINTING.

## UC-S-06 — Auto Queue Mode

- **Flow:** Checkbox Auto localStorage inko.autoQueue 1/0 interval 3500 finds WAITING first → act CALLED → then CALLED→PRINTING → PRINTING→COMPLETED, banner indigo Auto: calls next. Manual still works but backend canTransitionTo protects race.

## UC-S-07 — Manage Shops CRUD

- **Flow:** /shop/shops grid cards name Badge OPEN MapPin lat + Resources/Edit/Delete, New shop Dialog name* address City* State Pincode Phone +91 Pick from map OSM reverse → POST /shops 201, Edit Pencil GET /shops/:id PATCH 200, Delete Trash2 password DELETE BCrypt 403 cascade, Resources PAPERS_ALL 5 checkboxes Badge LOW Input qty staged diff DELETE+PUT inventory.

## UC-S-08 — Pricing Rules Shop vs Platform

- **Flow:** /shop/pricing tabs Price rules table 20 combos Paper Color Badge Sides Market baseline Your ₹/page Input EffectiveFrom existing ₹ warning Delete + banner Keep & Save All loops POST/PUT enforceShopAccess scope SHOP owner else 403 PLATFORM admin only, GET rules owner-checked.

## UC-S-09 — Discounts & Coupons

- **Flow:** Discounts grid TicketPercent Badge ACTIVE minPages minAmount %/FLAT max Attach coupon POST /discounts SHOP + POST /discounts/:id/coupon code upper. Infinite reuse bug P1 not yet.

## UC-S-10 — QR Generate & History

- **Flow:** /shop/qr Select shop w64 Generate new QR POST /shops/:id/qr/regenerate owner 200 new code_value 64 ACTIVE QRCodeSVG 240 level H mono code Badge ACTIVE Copy Download Regenerate history table When Scanned by ip ua REPLACED chain ACTIVE→REPLACED concurrent race.

## UC-S-11 — Inventory Deduct & Low-Stock

- **Flow:** Token PRINTING once sheets ceil via PrintCalc sum per item → pick inventory paperSize matched > any >0 dec sheets → threshold-cross notify LOW_STOCK to owner Shop Bell. No spam per refresh.

## UC-S-12 — SSE + Poll Fallback Shop

- **Flow:** Shop queue SSE onopen stopPoll onerror startPoll cleanup unmount clearInterval+close no leak.

## UC-S-13 — Profile & Settings Shop

- **Flow:** /shop/profile Badge SHOPKEEPER home /shop/dashboard, /shop/settings 4 rows bell/sound/moon/globe localStorage speech.

*Shop flows verified static; live after PG fix.*

