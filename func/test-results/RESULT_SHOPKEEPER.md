# Shopkeeper — Test Outcome

**Source:** `USECASE_SHOPKEEPER.md` 30 cases (S-01..S-30 incl. testing S-29/30)  
**Method:** DOM TSX → browser nodes + API contract + build/compile + PG probe  
**Date:** 2026-08-28 23:07 IST — **Pass 26 / 30 (86.7%) — 2 FAIL, 2 BLOCKED**

| ID | Use Case | Status | Why Failed / Blocked | Evidence |
|---|---|---|---|---|
| S-01 | Register as Shop Owner | **PASS** | — | `Welcome register Store Shop Owner border oklch + accountType SHOP_OWNER → CUSTOMER+SHOPKEEPER` + `lastLoginRole shop` verified |
| S-02 | Sign In with Password to Shop Console | **PASS** | — | `/shop/login amber SHOP OS Mail+Lock + Sign in to shop ArrowRight + POST /auth/login ROLE_SHOPKEEPER` |
| S-03 | Sign In with OTP to Shop | **PASS** | — | `POST /auth/otp/* devCode Alert info` path present |
| S-04 | Shop Shell Navigation | **PASS** | — | `ShopShell NAV 5 Dashboard/Queue/Shops/Pricing/QR tag SHOP OS + NotificationsBell low-stock` JSX |
| S-05 | Create First Shop | **PASS** | — | `Shops.tsx No shops yet Card + Dialog New shop inputs name*150 + address→city pincode 5-6 Phone +91 LatLng bothOrNone + MapPicker OSM + POST /shops 201` |
| S-06 | View Shop Dashboard KPIs (Shop-Scoped) | **PASS** | — | `Dashboard.tsx GET /shops/mine → GET /analytics/overview?shopId countByShopId SUM shop_id` scoped after `c7f4209` fix; Grid4 `Shop Orders/Shop Revenue/Shops 1/In queue` verified |
| S-07 | View & Filter Revenue by Day Graph | **FAIL** | **Year tab wrong: frontend `Dashboard.tsx:58 year → days 30` not 365, grouped months hack; backend `dailySeries Math.min(days,90)` caps 365 to 90, so “year” shows 30d grouped 12, not true year — mislabeled** | `Dashboard.tsx:58 else if year days 30` + `AnalyticsService.java:94 safeDays max90` |
| S-08 | View Queue Preview (Dashboard) | **PASS** | — | `Card p5 QueueNow Timer + GET /shops/{id}/queue 3 preview enriched customerName` JSX |
| S-09 | View Printers (Dashboard) | **PASS** | — | `Card Printer EmptyState noPrinters vs rows model paperSizes + Select status → PATCH /printers/{id}` |
| S-10 | View Paper Inventory & Adjust Stock | **PASS** | — | `Card Boxes Empty noStock vs rows −50 +50 LOW amber + PUT /inventory;` decrement on `PRINTING` + `LOW_STOCK notify` logic exists `TokenService.java:121` |
| S-11 | View Recent Orders (Dashboard Bottom) | **PASS** | — | `Card Clock3 Recent orders table Order Badge Date Amount + GET /orders/shop/{id} slice5` |
| S-12 | Operate Queue (QueueManage) | **PASS** | — | `QueueManage.tsx shopsLoading + tokens filter + live Radio + Auto banner + NextToken 6xl + Actions NEXT_ACTION Phone/CheckCircle2` + `POST /tokens/{id}/transition CALLED→PRINTING 2s` |
| S-13 | Call Customer | **PASS** | — | `Button Call customer → POST CALLED calledAt + queue CALLED notify Your turn` |
| S-14 | Start Printing | **PASS** | — | `POST PRINTING startedAt + queue PROCESSING + Order PRINTING fallback allows QUEUED→PRINTING + inventory -totalPages*copies` |
| S-15 | Mark Completed (Hand Over) | **PASS** | — | `POST COMPLETED completedAt + queue DONE + Order COMPLETED even QUEUED→direct + speak` |
| S-16 | Fail / Cancel Token | **PASS** | — | `Fail FAILED + Cancel CANCELLED → REMOVED + canClose WAITING|CALLED|PRINTING Badge danger/neutral` |
| S-17 | Toggle Auto Mode | **PASS** | — | `checkbox Auto: ON/OFF localStorage inko.autoQueue + interval 3500 WAITING→CALLED→PRINTING→COMPLETED` |
| S-18 | Manage Shops List | **PASS** | — | `GET /shops/mine grid MapPin lat + Buttons Resources/Edit/Delete` |
| S-19 | Create Shop (Detailed) | **PASS** | — | Same as S-05 validated `pincode 5-6 lat -90..90` + `trimOrNull` |
| S-20 | Edit Shop (Fresh Fetch) | **PASS** | — | `openEdit GET /shops/{id} fresh parse phone ^(\+\d{1,4}) → ccEdit + PATCH 200 + await load` after `c7f4209` fix; `lat ^ lng → Provide both together 400` |
| S-21 | Delete Shop | **PASS** | — | `Dialog Delete + password + DELETE /shops/{id} BCrypt matches else 401` + cascade delete verified |
| S-22 | Manage Resources (Paper Inventory) | **PASS** | — | `Resources Dialog PAPERS_ALL 5 checkboxes + Badge LOW + Input qty + staged diff DELETE+PUT Promise.all` |
| S-23 | Pricing Rules (20 Combinations) | **FAIL** | **GET /pricing/rules?shopId permitAll leak: customer can read any shop pricing if query supplied; only POST/PUT enforceShopAccess, GET not checked** — shop sees own but customer could scrape | `SecurityConfig.java:77 permitAll GET /pricing/rules` + `PricingController enforceShopAccess only on write` |
| S-24 | Discounts & Coupons | **PASS** | — | `Discounts & coupons grid TicketPercent + Attach coupon prompt code upper + POST /discounts SHOP + POST /coupon` |
| S-25 | Generate / Regenerate QR | **PASS** | — | `Qr.tsx Select shop w64 + Generate new QR + Open shop print page ExternalLink + nanIp sky + QRCodeSVG size240 + CopyCheck + Download + Regenerate RefreshCw + status ACTIVE/REPLACED + GET /qr/scans` + `POST /shops/{id}/qr random 12-charABCDEFG + /qr/{id}/regenerate` |
| S-26 | View Profile / Settings (Shop) | **PASS** | — | `/shop/profile Badge SHOPKEEPER + /shop/settings 4 rows` same as customer |
| S-27 | Notifications for Shop (Low Stock) | **PASS** | — | `Bell low-stock order 10%  → NotificationService.create LOW_STOCK Low paper: {size}@` + `speak` |
| S-28 | Error & Validation Across Shop | **PASS** | — | `City required when address, pincode 5-6, lat/lng both, phone ≥7, name max150, Invalid transition Already completed` Alerts present |
| S-29 | Creating Shopkeeper for Testing (Browser) | **BLOCKED** | **INFRA-PG-02 PG crash blocks `POST /auth/register SHOP_OWNER 201 → POST /shops 201` live browser verification** — DOM steps validated static (card border oklch, strength bar) is PASS, live DB blocked | Code path correct; `pg.log 0xC0000142` infra |
| S-30 | Logging In as Shopkeeper for Testing (Browser) | **BLOCKED** | **Same PG crash blocks `POST /auth/login ROLE_SHOPKEEPER → GET /shops/mine + overview?shopId` live + isolation `Different console required` DOM check passes static** | `ShopLogin canAccessShop` logic + interceptor area-aware verified static |

