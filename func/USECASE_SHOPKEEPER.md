# Use Cases — Shopkeeper (Authenticated, ROLE_SHOPKEEPER)

**Actor:** Shopkeeper — `roles [ROLE_SHOPKEEPER]` (may also have `CUSTOMER`), owner of `shops.owner_user_id`  
**Language:** English — Frontend + Backend exhaustive, every smallest UI detail  
**Source:** `FUNCTIONALITY.md` §4 (Actor C) verified `ShopLogin.tsx, ShopShell, shop/Dashboard, QueueManage, Shops, Pricing, Qr, ShopController, CatalogController, PricingController, TokenController, AnalyticsService`

---

## UC-S-01 — Register as Shop Owner

- **UI:** `Welcome register` card `Store Shop Owner border oklch active` vs `FileText Customer` — select `accountType SHOP_OWNER`.
- **Flow:** `POST /api/auth/register {…, accountType SHOP_OWNER}` → assigns `CUSTOMER + SHOPKEEPER`, `lastLoginRole shop`.
- **Post:** `POST /shops` to create first shop (UC-S-05) else empty dashboard shows `No shops yet`.

## UC-S-02 — Sign In with Password to Shop Console

- **Route:** `/shop/login` guard `canAccessShop = SHOPKEEPER|ADMIN`, else `This account is a shop owner — use Customer login` etc.
- **UI:** amber badge `SHOP OS`, `Mail identifier + Lock password + Send OTP phone option`, `Sign in to shop ArrowRight lg` `loading spinner`, footer `Customer sign in → User + Create shop account`.
- **Flow:** `POST /auth/login` → `issueAccessToken roles ROLE_SHOPKEEPER + perm shop:manage_own… + shopId primary` → `localStorage lastLoginRole shop` → `?next startsWith /shop ? next : /shop/dashboard`.
- **Error:** `401 INVALID_CREDENTIALS`, `403 SUSPENDED`.
- **Related:** OTP path `requestOtp fullPhone → verifyOtp → AuthResponse` same guard.

## UC-S-03 — Sign In with OTP to Shop

- **Flow:** `POST /auth/otp/request {identifier fullPhone}` → `200 delivered + devCode`, `POST /auth/otp/verify {identifier,code}` → `AuthResponse` with shopkeeper role check.

## UC-S-04 — Shop Shell Navigation

- **NAV 5:** `Dashboard Store /shop/dashboard`, `Queue ListOrdered /shop/queue`, `Shops Store /shop/shops`, `Pricing Tag /shop/pricing`, `QR QrCode /shop/qr`, tag `SHOP OS amber`, dropdown `SHOPKEEPER initials + Settings/User + Sign out → POST /auth/logout + → /shop/login`, mobile `Menu/X`, footer `footerShop © {year} Inko Shop…` + emerald dot.

## UC-S-05 — Create First Shop

- **Pre:** No shops owned, `GET /shops/mine []` empty.
- **UI:** `Shops.tsx ShopManage` card `Store No shops yet + Create shop Button` or `QueueManage` empty card `Shop name * + City + Create shop Button`. Also `Dashboard Select shop empty`.
- **Flow:** `POST /api/shops {name 1-150 required, city?, addressLine1/2?, state?, pincode 5-6 digits?, phone +CC digits?, lat/lng 9,6 bothOrNone}` → validates `name max150, address→city required, pincode regex \d{5,6}, lat -90..90 lng -180..180`, `status OPEN`, `supportsColor true`, `owner_user_id = principal`. Error details in `Alert red`.
- **UI Detail:** `Dialog New shop` inputs `name* + address1/2 + City* if address + State + Pincode + Phone CountryCode +91 + Input + Lat/Lng + Toggle Pick from map → MapPicker OSM + Confirm` + `Create Save spinner`.
- **Success:** `ShopSummaryDto {id, name, city, status OPEN, supportsColor, address…}` appears in grid `MapPin lat.lon`.

## UC-S-06 — View Shop Dashboard KPIs (Shop-Scoped)

- **Route:** `/shop/dashboard`.
- **Flow on mount:** `GET /shops/mine → shopId` → `GET /analytics/overview?shopId` (scoped) vs old platform-wide → `{totalOrders countByShopId, totalShops 1, totalRevenue SUM shop_id=:sid, todayOrders/todayRevenue shop filter}` 200. Also `loadShopData`.
- **UI Grid4 `KPI Card icon slate-900`:**
  - `Users Shop Orders {totalOrders} sub today {n todaySuffix}` — Purpose: orders for this shop; (was `Platform orders` now scoped).
  - `IndianRupee Shop Revenue ₹{totalRevenue} sub netOfRefunds`.
  - `Store Shops {totalShops 1} sub openNow {open count}`.
  - `Timer In queue {queueCount from GET /shops/:shopId/queue length} sub shownBelow {preview length} / topTokensLive`.
- **Error:** `GET overview 403 Forbidden if not SHOPKEEPER`.

## UC-S-07 — View & Filter Revenue by Day Graph

- **UI Card** `p5 header revenueByDay + period tabs hour/day/week/year oklch active + Badge INR + subtitle Revenue per {period} auto-refresh`.
- **Logic:** `loadRevenue GET /analytics/series?days&shopId days hour1 day7 week30 year30` → backend `native query day COUNT SUM where shop_id=:sid GROUP BY day ORDER BY` zero-filled missing days `for i=safeDays-1..0`. Normalize `normalized {date,revenue}`. Special `hour fake 12 slots {day 06:00… total random base}`, `year group months 12`.
- **Display States:** `revenue null → Skeleton 3`, `all revenue 0 && length>0 → gray bars h8% label date.slice5`, `empty → EmptyState noRevenueYet Icon IndianRupee desc noRevenueDesc`, else `maxRev = max(1, revenues)`, bars `gradient indigo height max(6,v/maxRev*100)% + label date.slice5` title `₹v`.
- **Related:** Requires shop has PAID orders; else zero bars.

## UC-S-08 — View Queue Preview (Dashboard Right Column)

- **UI:** `Card p5 QueueNow Timer h-4 w-4` `No tokens — queue is clear dashed bg-slate-50 p6 center` else `grid2 tokens preview 3 map tokenNumber + Badge brand status friendlyStatus`.
- **Logic:** `GET /shops/:shopId/queue` enriched `tokenNumber, status WAITING|CALLED|PRINTING, type, priority, customerName, orderNumber`.
- **Action:** `Open queue → /shop/queue` link.

## UC-S-09 — View Printers (Dashboard)

- **UI:** `Card Printer h-4 w-4` `EmptyState noPrinters Icon Boxes desc noPrintersDesc` else rows `name font-medium + model • paperSizes + Select status IDLE/ONLINE/PRINTING/OFFLINE/ERROR/MAINTENANCE PATCH onChange → PUT reload`.
- **Logic:** `GET /shops/:shopId/printers`, `PATCH /shops/:shopId/printers/{id} {status}`.
- **Badge Colors:** `ERROR red, PRINTING indigo, else emerald`.

## UC-S-10 — View Paper Inventory & Adjust Stock

- **UI:** `Card Boxes Paper inventory` Empty `noStockTracked` else rows `paperSize • gsm + qtySheets + Buttons − (−50) + (+50) + Badge LOW amber if qty ≤ lowThreshold`.
- **Logic:** `GET /shops/:shopId/inventory` → `ShopPaperInventory {paperSize,gsm,quantitySheets,lowStockThreshold100,isAvailable}`; Buttons `PUT /inventory {paperSize,gsm,quantitySheets±50,lowThreshold}` → reload.
- **Notification:** On shop `Token PRINTING` decrement `inventoryRepo first row quantity - totalPages*copies`, if `next ≤ threshold` → `NotificationService.create(ownerUserId, LOW_STOCK, Low paper: {size}, … queue has {waiting} waiting., /shop/shops)`.

## UC-S-11 — View Recent Orders (Dashboard Bottom)

- **UI:** `Card Clock3 Recent orders` empty `noOrdersShop` else `table hidden sm overflow min-w480 columns Order mono8 status Badge success/brand/warning/danger Date locale Amount ₹right` + mobile cards `mono + Badge + Date/Amount`.
- **Logic:** `GET /orders/shop/{shopId} → Array<Order> slice0-5` `Badge QUEUED In queue, PRINTING Printing…, COMPLETED` tones.

## UC-S-12 — Operate Queue (QueueManage)

- **Route:** `/shop/queue`.
- **State:** `shops[], shopsLoading, tokens[], filter ALL, live bool, newShopName/City, prevCompleted Set, acting id:status, autoMode localStorage inko.autoQueue`.
- **Flow Init:** `GET /shops/mine → shopId`, `load GET /shops/{shopId}/queue` enriched `customerName orderNumber pages` `speak Token {number} completed` if `settings.sound && status COMPLETED new` → `announceToken`, poll `2500ms`, auto `3500ms` cycle `WAITING→CALLED, CALLED→PRINTING (2s delay), PRINTING→COMPLETED`.
- **UI Header:** `Queue management Automated flow… + Auto checkbox ON/OFF + Live badge emerald Live Radio / amber Reconnecting pulsate + Filter Select ALL/WAITING/CALLED/PRINTING`.
- **Auto Banner:** indigo `Auto mode: calls next → after 3s starts printing → hand over Ready to collect. You only hand over.`
- **Shops States:** `Loading your shops…`, empty `Card border-amber No shop yet + Shop name* + City + Create shop → POST /shops`, single `name — city + Badge status + Polling every 4s Timer`, multi `Select shop w-64`.
- **NextToken Card:** `border-indigo overflow hidden grid lg:auto|1fr|auto p5 center NOW SERVING xs tracking + 6xl font-black tokenNumber + Badge friendlyStatus + Actions lg + Up next Token2`.
- **Actions `NEXT_ACTION`:** `WAITING Call customer CALLED Phone primary, CALLED Printing started PRINTING Phone secondary, PRINTING Hand over — done COMPLETED emerald CheckCircle2, plus Fail FAILED AlertTriangle Cancel CANCELLED XCircle ghost`. `ActionButtons lg/sm` disabled if `acting`, `loading acting === id:target`. `canClose WAITING|CALLED|PRINTING`.
- **Tokens List:** `flex rounded-2xl border bg-white px4 py3 gap3 slate-900 h12 w16 tokenNumber font-black + friendlyStatus Badge warning/brand/success/neutral + Radio type • #id • 👤 customerName • orderNumber mono + Actions sm`. Empty `CheckCircle2 No tokens`.
- **Backend:** `POST /tokens/{id}/transition {targetStatus}` validates `canTransitionTo` `WAITING→CALLED→PRINTING→COMPLETED` sets timestamps `calledAt,startedAt,completedAt` updates `queue_entries WAITING→CALLED/PROCESSING/DONE/REMOVED` → syncs `Order` `QUEUED→PRINTING→COMPLETED` + inventory + customer notify `TOKEN_CALLED/PREPRINT/COMPLETED`.
- **Errors:** `Invalid transition → Already completed — refreshing queue` Alert.

## UC-S-13 — Call Customer

- **Trigger:** `Action Button Call customer → POST /tokens/{id}/transition CALLED` → token `calledAt now`, `queue CALLED`, `order still QUEUED`, notify `TOKEN_CALLED Your turn — go to counter Token {number} called`. Auto after 2s `POST … PRINTING`.

## UC-S-14 — Start Printing

- **Trigger:** `Button Printing started → POST PRINTING` → `startedAt now`, `queue PROCESSING`, `Order PRINTING` (if direct from QUEUED fallback allows), inventory decrement, low-stock notify if needed, customer notify `Printing started Your print {number} is now printing`.
- **Alt:** `autoMode` after CALLED 2s does same.
- **Errors:** `Invalid transition PRINTING→PRINTING`.

## UC-S-15 — Mark Completed (Hand Over)

- **Trigger:** `Button Hand over — done emerald → POST COMPLETED` → `completedAt now`, `queue DONE`, `Order COMPLETED` (even if `QUEUED→COMPLETED` direct now allowed enum), customer notify `Print completed — collect your print Token {number} done`, shop hears `speak` + `announceToken`.
- **UI:** `Badge success READY Ready to collect`.

## UC-S-16 — Fail / Cancel Token

- **Buttons:** `Fail AlertTriangle → POST FAILED → status FAILED queue REMOVED Order FAILED → may Retry` + `Cancel XCircle → POST CANCELLED → CANCELLED DONE REMOVED + Order CANCELLED`. `canClose` only if `WAITING|CALLED|PRINTING`.
- **UI:** `Badge danger/neutral` after.

## UC-S-17 — Toggle Auto Mode

- **UI:** `label checkbox Auto: ON/OFF rounded-full border px3 py1.5 cursor-pointer h-3.5`. Persists `localStorage inko.autoQueue 1/0`.
- **Logic:** `useEffect interval 3500 find first WAITING→CALLED, else CALLED→PRINTING, else PRINTING→COMPLETED` sequentially.

## UC-S-18 — Manage Shops List

- **Route:** `/shop/shops` `ShopManage`.
- **State:** `shops|null` loading `Loading…` else empty `Store No shops yet Create shop` else grid cards `name Badge OPEN success + MapPin address lat + Buttons Resources Boxes / Edit Pencil / Delete Trash2`.
- **Flow:** `GET /shops/mine` list `ShopSummaryDto`.

## UC-S-19 — Create Shop (Detailed)

- **UI:** `Dialog New shop` inputs `name* 150 + addressLine1 200 + addressLine2 200 + City* if address 80 + State 80 + Pincode 5-6 digits + Phone CountryCode + Input 7-15 + Lat 9,6 + Lng 9,6` + `Button Pick from map MapPin` toggles `MapPicker` OSM search + reverse fill `displayName → address1, city, state, postcode, lat,lng` + note `Provide valid address (address+city+pincode) OR map pin — either works, both best`.
- **Validation:** Same as UC-S-05 client + backend `BadRequest VALIDATION`.
- **Backend:** `POST /shops 201`.

## UC-S-20 — Edit Shop (Fresh Fetch)

- **Trigger:** `Edit Pencil → openEdit GET /shops/{id} fresh → parse phone ^(\+\d{1,4})(.*) → ccEdit + editForm`.
- **UI:** `Dialog Edit shop` same inputs + `Pick from map`. On `Save` → `PATCH /shops/{id} {name,address1/2,city,state,pincode,phone fullPhone,lat,lng null vs value}` → 200 `ShopSummaryDto` → `setEditing null + await load GET /shops/mine`. 405 fallback handled but normally PATCH.
- **Edge:** `lat ^ lng` XOR → `Provide both together` 400.
- **Verification:** Re-open edit shows saved values.

## UC-S-21 — Delete Shop

- **Trigger:** `Delete Trash2 → setDeleteTarget + Input password*`.
- **UI:** `Dialog Delete shop? Permanently delete {name}? Queues… removed. + password Input autofocus + Cancel + Delete forever Trash2 danger loading`.
- **Flow:** `DELETE /shops/{id} {data:{password}}` → `BCrypt matches else 401 Incorrect password`, deletes `shops` row `cascade delete queue/printers/inventory`? app deletes.
- **Errors:** `404 Shop not found`, `403 You do not manage`.

## UC-S-22 — Manage Resources (Paper Inventory)

- **UI:** `Resources Boxes → Dialog  Resources — {name} Tick what you offer, then how many sheets left. Remind when 20 left. + PAPERS_ALL [A4,A3,A5,LETTER,LEGAL] grid max-h50vh overflow  checkbox paper rows border dashed if disabled + Badge LOW/success + Input quantitySheets number + Remove XCircle + note Remind when ≤threshold`.
- **Logic:** `openResources → GET /inventory → staged copy`; `togglePaperStaged(paper,enable) add tmp gsm80 qty200 threshold20 or filter`; `updateStagedQty quant math max0 next lowStock max5 min20 10%`; `saveResources → diff inventory vs staged delete missing DELETE /inventory/{id} + PUT per row {paperSize,gsm,quantitySheets,threshold20,isAvailable true} Promise.all → close`.
- **Related:** Dashboard inventory rows reuse same endpoint.

## UC-S-23 — Pricing Rules (20 Combinations)

- **Route:** `/shop/pricing` tab `Price rules`.
- **UI:** table 20 rows `Paper (A4…) + Color Badge BW neutral / COLOR brand + Sides SINGLE/DOUBLE + Market(state adj) suggestion + Your ₹/page Input number + Effective from date ISO + existing ₹ success / warning suggested + Delete Trash2` + banner indigo `We filled… Keep & Save All` + `Save All Prices lg long savingAll` + `Refresh`.
- **Logic:** `GET /pricing/rules?shopId` filter + init `edits` suggested `marketPrice * stateAdj (Maharashtra 0.10 Delhi 0.12 Bengaluru 0.08)` today `toISOString slice10`; `saveAll loops combos POST /pricing/rules or PUT /pricing/rules/{id} {scope SHOP,shopId,paperSize,colorMode,sidesMode,pricePerPage,effectiveFrom today}`; `deleteRule DELETE`. State `edits Record price`.
- **Backend:** `PricingController enforceShopAccess` check.
- **Errors:** `CONFLICT UQ`, `VALIDATION price <=0`.

## UC-S-24 — Discounts & Coupons

- **UI Tab** `Discounts & coupons` grid `TicketPercent` cards `name + type PERCENT/FIXED value + caps minOrder maxDiscount + Badge ACTIVE/PAUSED + Attach coupon Button (prompt code)`. Empty `EmptyState`. Right form `New discount Name, Type PERCENT/FIXED, Value, MinOrder, MaxDiscount + Create`.
- **Logic:** `GET /discounts?shopId`, `POST /discounts {scope SHOP,name,type,value,maxDiscount,minOrder,minPages,startsAt/endsAt,limits}` → `DiscountRule`, `POST /discounts/{id}/coupon {code upperCase} → Coupon`.
- **Related:** `Configure couponCode` validation uses `CouponRedemption`.

## UC-S-25 — Generate / Regenerate QR

- **Route:** `/shop/qr`.
- **UI:** If no shops → `Store Set up … Shop name* + City + Create` `POST /shops`. Else `Card Select shop w-64 + Generate new QR + Open shop print page ExternalLink`, `sky note http://{lanIp}:5173 Firewall`. Active `status ACTIVE` → grid `360|1fr`: left `QRCodeSVG size240 level H id qr-codeValue + mono code + Badge success ACTIVE + Copy Check/Copy + Download SVG Download + Regenerate RefreshCw + mono url`; right `ScanLine How it works 4 steps + REPLACED/ACTIVE note + Scan history table When Scanned by QR(ip) max-h72 history REPLACED warning`. Empty `No QR yet` `Generate new QR`. Dialog `Regenerate QR code? Alert warning history preserved + Yes regenerate danger Cancel`.
- **Logic:** `GET /net/lan-ip via DatagramSocket 8.8.8.8:53`, `GET /shops/mine`, `GET /shops/{shopId}/qr + /qr/scans`, `POST /shops/{shopId}/qr → QrService.generate random 12-charABCDEFG… INACTIVE old ACTIVE→REPLACED`, `POST /qr/{id}/regenerate → REPLACED + new`, `qrUrl = lanIp if localhost else hostname + /shops/{id}/print`, `copy clipboard`, `downloadSvg serialize`.
- **Backend:** `QrController` owner check.

## UC-S-26 — View Profile / Settings (Shop)

- **Routes:** `/shop/profile → Profile home /shop/dashboard`, `/shop/settings → SettingsPage` same as customer but `Badge SHOPKEEPER` + `footerShop`.

## UC-S-27 — Notifications for Shop (Low Stock, Queue)

- **Bell:** `GET /notifications` shop receives `LOW_STOCK + TOKEN_*?` no (customer only). Low-stock body `{paperSize} only {next} sheets left — queue has {waiting} waiting. Please add papers., link /shop/shops`.
- **Sound:** `GET /notifications/unread-count` + `speak newest title`.

## UC-S-28 — Error & Validation Across Shop

- **Shop create/edit:** `City required when address`, `pincode 5-6`, `lat/lng both`, `phone ≥7`, `name required max150`.
- **Inventory:** `quantitySheets >=0`.
- **Pricing:** `pricePerPage >0`.
- **Queue act:** `Invalid transition` shows `Already completed — refreshing`.
- **Tokens clear on 401:** interceptor area-aware `shop:/shop/login`.

## UC-S-29 — Creating Shopkeeper Account for Testing (Browser Explicit)

- **Goal (Testing):** Create Shop Owner account via browser and verify it can own shops — explicit UI+API+DB.
- **Pre:** `http://localhost:5173/login` cleared storage, `devMode true`.
- **Browser Steps:**
  1. `Login → Create account` → select Card `Shop Owner (Store) border oklch active` (vs Customer).
  2. Fill `Full Name: Test ShopOwner {ts}, Email: shopown+{ts}@test.inko, Phone +91 90001…, Password Test@12345` → `Create` → `POST /auth/register {accountType SHOP_OWNER}` 201 → assigns `CUSTOMER + SHOPKEEPER` → `lastLoginRole shop`.
  3. Assert `→ /shop/dashboard` ? If `?next` then `RoleRedirect` detects `SHOPKEEPER` → shop; Dashboard shows `No shops yet Store + Create shop Button` (not `Shops online`? still empty).
  4. DB: `SELECT * FROM users u JOIN user_roles ur JOIN roles r ON … WHERE email LIKE 'shopown+%'` has two roles, `SELECT shopId FROM jwt claim` present via `GET /users/me shopId null` before shop creation.
  5. Create shop immediately: `Dialog New shop name Test Print {ts} + City Pune + Pincode 411038 + Phone +91 90001… + Pick from map 18.52/73.85 + Create → POST /shops 201` → `shops list + Inventory/Printer empty`.
- **Alt via `?type=shop`:** `http://localhost:5173/register?type=shop` shows amber note `admin upgrades…` but still creates.

## UC-S-30 — Logging In as Shopkeeper for Testing (Password + OTP, Browser Explicit)

- **Goal:** Verify shop console login + AreaGuard isolation via browser.
- **Pre:** Account from UC-S-29 exists, `GET /shops/mine` has at least one shop.
- **Password Path:**
  1. `logout → http://localhost:5173/shop/login` → `Mail identifier shopown+… + Lock password Test@12345 → Sign in to shop ArrowRight`.
  2. Network `POST /auth/login 200 roles [ROLE_SHOPKEEPER]` → `lastLoginRole shop` → `→ /shop/dashboard` header `SHOP OS amber` + `KPI Shop Orders 0 Shop Revenue ₹0`.
  3. Verify `GET /shops/mine 200` one shop, `GET /analytics/overview?shopId={id} 200`, `GET /shops/{id}/queue 200 empty`.
- **OTP Path:** `Phone OTP Country +91 → Send OTP → devCode Alert → Verify → POST /verify 200` same.
- **Isolation Test (Browser):** While shop logged, navigate `http://localhost:5173/customer/dashboard` → `AreaGuard shop mismatch → mesh-gradient ShieldAlert Different console required: Shop → Customer Buttons Sign in to Customer / Back to my Shop` — proves isolation.
- **Negative:** Customer account trying `/shop/login` → `Alert This account is a shop owner …` or role guard `Access denied`.
- **Forgot + Re-login:** Same as customer `POST /forgot-password → devCode → reset → login with new pwd`.

---

### Traceability Shop

| UC | Frontend → Backend |
|---|---|
| S-05/19 | `Shops.tsx:doCreate` → `POST /shops` |
| S-06 | `Dashboard.tsx:GET /analytics/overview?shopId` |
| S-12 | `QueueManage.tsx:act` → `POST /tokens/{id}/transition` |
| S-22 | `Shops.tsx:saveResources` → `PUT /inventory` |
| S-23 | `Pricing.tsx:saveAll` → `POST|PUT /pricing/rules` |
| S-25 | `Qr.tsx:generate` → `POST /shops/{id}/qr`, `GET /qr/{code}/resolve` |

*Cross-checked `shop/*.tsx` lines + `ShopController`, `CatalogController`, `TokenService`.*
