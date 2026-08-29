# Use Cases — Guest via QR (Unauthenticated)

**Directory:** `func/`  
**Actor:** Guest (no account, scans QR poster) — ephemeral `CUSTOMER` after `POST /auth/guest`  
**Language:** English  
**Source:** `FUNCTIONALITY.md` §2 (Actor A) + cross-checked `QrScan.tsx`, `ShopPrint.tsx`, `Upload.tsx`, `Configure.tsx`, `QrController.java`, `AuthService.createGuestSession`, `DocumentController`, `PricingController`, `SecurityConfig`

> Every row = one testable use case. Covers happy, alternate, error flows + smallest UI details.

---

## UC-G-01 — Scan Valid QR Code

- **Goal:** Reach correct shop upload with one scan.
- **Pre:** Poster shows QR `codeValue` status `ACTIVE`, backend up, client at `/qr/:code`.
- **Trigger:** `GET /qr/:code` loads.
- **Main Flow:**
  1. `GET /qr/:code/resolve` → `{shopId, status ACTIVE}` 200.
  2. `POST /qr/:code/scan` logs `QrScanEvent{qrId, ip, ua}` 200.
  3. `GET /shops/:shopId` fetches name/city.
  4. `localStorage inko.qrShop = shopId`.
  5. If no `inko.access_token`, `POST /auth/guest` → `AuthResponse` sets `tokens` + `lastLoginRole customer` + `GET /users/me`.
  6. Navigate `/upload?shopId&src=qr`.
- **Alt:** Already has token → skip guest mint.
- **Error:** `GET resolve 404` → UI `AlertTriangle QR not found — Invalid or expired` + `Button Continue without QR → /upload`. Code `REPLACED/EXPIRED` → same.
- **UI Details:** Loading `Store pulse + Skeleton h2 w40 + Resolving QR…` mesh-gradient. Error red card.
- **Post:** Guest can upload; `GET /shops/:shopId/qr/scans` increments.
- **Related:** UC-G-02, UC-G-04.

## UC-G-02 — View Shop Landing After Scan

- **Goal:** Confirm shop identity before upload.
- **Pre:** UC-G-01 resolved `shopId`.
- **Trigger:** `/shops/:shopId/print`.
- **Flow:** `GET /shops/:shopId` permitAll → Card `gradient indigo→violet Store icon + name h2 + Badge status + MapPin city + Palette Color/B&W + mono id8` + `Printer All sizes / Clock Live queue / QrCode Scan again` 3 gray cards + CTA `Start printing — upload ArrowRight lg → /upload?shopId` + links `Upload →, My orders →/history, View queue →/queue/:shopId`.
- **Alt Loading:** `Loading shop…` text.
- **Error:** `AlertTriangle Shop not available` red if 404/CLOSED/SUSPENDED.
- **Related:** UC-G-01 → UC-G-04.

## UC-G-03 — Auto-Mint Guest Session (Silent)

- **Goal:** Use secured endpoints without registration.
- **Pre:** No `inko.access_token` in localStorage.
- **Trigger:** `Upload.tsx` mount or `QrScan` completion.
- **Flow:** `POST /api/auth/guest` no body → 201 `AuthResponse{accessToken 15m, refreshToken 7d, user {id, Guest, email guest-{UUID}@guest.inko.local, roles [CUSTOMER]}}` → `tokens.set` → `setSessionArea customer`.
- **Error:** Network → `apiErrorMessage ERR_NETWORK`.
- **Post:** `GET /users/me` succeeds; `isGuest = email endsWith @guest.inko.local`.
- **Related:** All guest upload/config/order flows reuse token; logout clears.

## UC-G-04 — Upload Documents as Guest (First Print Step)

- **Goal:** Drop files and get analysis.
- **Pre:** Guest token present (or freshly minted), at `/upload?shopId&src=qr`.
- **UI:** `Stepper Upload Configure Preview Pay current0`, Banner emerald `QrCode Scanned at {shop}` if `src=qr`, `Guest name Card {Label Your name + Input guestName + Save & remember}` + indigo upsell `LogIn / Create account` + indigo `Shop {name} pre-selected Clear X` + Dropzone `dashed-2 p8 UploadCloud 14x14` states `default / drag bg-indigo-50`.
- **Flow:**
  1. `addFiles` validate ≤50 MB each, ≤10 files, allowed ext `pdf,jpg,jpeg,png,doc,docx,ppt,pptx,xls,xlsx,txt` else `Alert Invalid file`.
  2. Chip grid2 `FileIcon + name + size formatBytes + X`.
  3. Click `Upload & analyze ArrowRight` → `POST /documents/upload FormData files` with `onUploadProgress` → `Progress {value}` + spinner `h-8 animate-spin border-t blue`.
  4. Result header `CheckCircle2 Analysis complete Ready success` → grid2 cards `FileText + Badge mime warning + Badge Analyzed success + pages` or `pre analysis_summary` (blank pages note amber).
  5. `Continue to configure → /configure?shopId state {docs}`.
- **Errors:** 413 too large, 400 ext not allowed, `ERR_NETWORK`, no files → `Alert Select at least one file`.
- **Backend:** `DocumentController.upload` → `StorageService store {userId}/{uuid}_{name}` + `DocumentAnalysisService` page count (pdf 40k, image 1, ppt 80k+2, doc 15k+1) + `DocumentPage` every 7th LANDSCAPE, 13th blank 0.92.
- **Related:** UC-G-05.

## UC-G-05 — Save Guest Display Name

- **Goal:** Shop sees friendly name in queue `👤 GuestName`.
- **Pre:** `isGuest true`, `localStorage inko.guestName` maybe.
- **Flow:** Type name → `Save & remember` → `PATCH /users/me {fullName}` 200 → persist `localStorage` + `refreshMe`; queue enriched `customerName`.
- **Error:** `fullName >120` → 400 `VALIDATION` Alert.
- **Related:** Shop `GET /shops/{shopId}/queue` enriched.

## UC-G-06 — Configure Print Options (Guest)

- **Goal:** Choose paper/color/sides/copies/pages and see price.
- **Pre:** `docs` in location state, `shopId` selected (locked emerald `Store Shop — QR locked` if fromQr else Select).
- **UI:** `Stepper current1`, left `Select shop`, docs chips `FileText +Badge pages`, Options Card `Layers A4/A3/A5/LETTER/LEGAL, Palette BW/COLOR, BookOpen SINGLE/DOUBLE, Copy Input number, Pages Input ALL tip 1-5,8`, Coupon `Tag Input uppercase mono + Apply`, quote emerald `YOU PAY ₹final taxes + Yes, print`.
- **Flow:** Debounce 600ms on change → `POST /pricing/quote {shopId,paperSize,colorMode,sidesMode,pages copies, couponCode}` → `PriceBreakdown`. Valid `pages>0 copies 1-999` else client error.
- **Errors:** `PRICING_NOT_CONFIGURED 400` Alert, coupon invalid → `COUPON_INVALID` details.
- **Related:** UC-G-07.

## UC-G-07 — Create Order (Guest)

- **Goal:** Persist order before payment.
- **Trigger:** `Confirm & print Yes, print` → `POST /orders {shopId, couponCode, items[{documentId,paperSize,colorMode,sidesMode,orientation AUTO,pageSelection,copies}]}` 201 → `Order INKO-YYYY-###### status CREATED` + `PrintConfiguration` + `OrderItem`.
- **Post:** Navigate `/order/:id`.
- **Errors:** `doc not owned 403`, `no items 400`.

## UC-G-08 — View Order Detail as Guest

- **Goal:** Track own order.
- **Trigger:** `/order/:id`.
- **Flow:** `GET /orders/{id}` (owner check `customerId == principal`) → `order + items` + `GET /tokens/{id}/wait` + `GET /tokens/{id}` + `GET /orders/{id}/refunds` poll 3s; Timeline `PLACED→PAYMENT→QUEUED→PRINTING→COMPLETED`.
- **UI:** `Receipt ORDER Badge status + ₹finalAmount`, `Track queue Ticket`.
- **Related:** UC-G-09.

## UC-G-09 — Pay Mock UPI / COD as Guest

- **Flow:** `POST /orders/{id}/payment {method MOCK_UPI/COD, idempotencyKey}` → pending; if `MOCK_UPI` → `POST /payments/{id}/verify {payload}` → `PAID + tokens.generate QUEUED` else `COD → COD_SELECTED QUEUED`. Notify `PAYMENT_* + TOKEN_ISSUED`.
- **UI:** `CreditCard Mock UPI + COD`, `Alert payMsg`.
- **Errors:** `CONFLICT Already paid`.

## UC-G-10 — Track Queue Position (Guest)

- **Trigger:** `/queue/:shopId?order=`.
- **Flow:** `GET /shops/{shopId}/queue` + `GET /tokens/{id}` → `position`, `estimatedWait 0.4*pagesAhead+1*jobAhead+0.3*myPages` + `EventSource /queue/stream` live `Radio` else `Polling Timer` 5s. Mine Card gradient `5xl tokenNumber + Badge friendlyStatus`.
- **Related:** Shop transition moves `WAITING→CALLED→PRINTING→COMPLETED`.

## UC-G-11 — View History as Guest

- **Trigger:** `/history` (if guest still logged, sees own orders).
- **Flow:** `GET /orders → filtered search/status/shop` → `Print again GET /orders/{id} → /configure?reprint`.
- **UI:** `Search Input + Status Select + Shop Select + Filter count + Skeleton`.

## UC-G-12 — Guest Convert to Registered

- **Trigger:** Click upsell `Create account → /register` or `LogIn → /login` → after register/login new `User` replaces guest? (separate account). Docs remain under guest ID — not migrated (known gap).

## UC-G-13 — QR Resolve/Scan Edge Cases

- **Invalid code:** `GET resolve 404` → `Inko Page not found` fallback.
- **Network failure:** `useAuth failsafe 8s` sets `isLoading false` → shows `Checking your session…` until timeout then `Navigate /login`.
- **Expired QR:** status `EXPIRED/REPLACED` → resolve 410 + scan not logged.

## UC-G-14 — CORS Preflight for QR (Unauth)

- **Request:** `OPTIONS /api/qr/*/scan` with `Origin http://localhost:5173` → `Access-Control-Allow-Origin localhost:5173`.
- **Related:** `SecurityConfig corsConfigurationSource`.

## UC-G-15 — Guest Creating & Logging In for Testing (Browser Explicit)

- **Goal (Testing):** Verify Guest can be created + logged in via browser without registration — explicit UI+API+DB verification, not just code.
- **Pre (Test Env):** `docker-compose up db`, `backend ./mvnw spring-boot:run -Dinko.app.dev-mode=true`, `frontend npm run dev` → `http://localhost:5173`, DB `devMode true` shows `devCode`, storage `./data/storage` writable.
- **Browser Steps (Manual/Playwright):**
  1. Open `http://localhost:5173/qr/TESTCODE` or directly `http://localhost:5173/upload` with empty `localStorage`.
  2. Observe Network tab: `POST /api/auth/guest` 201 → `localStorage inko.access_token` + `inko.refresh_token` present (DevTools Application → Local Storage).
  3. Verify `GET /api/users/me` 200 returns `email guest-*@guest.inko.local, roles [CUSTOMER]`.
  4. Navbar shows `CUSTOMER` avatar, not `Sign in`.
  5. Hard refresh → `AuthProvider bootstrap GET /users/me` succeeds without `Checking your session…` hang (failsafe 8s not triggered).
- **Alternate Testing Path (direct):** `curl -X POST http://localhost:8080/api/auth/guest` → capture `accessToken` → `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/users/me` 200.
- **DB Check:** `psql inko → SELECT id, email, status FROM users WHERE email LIKE 'guest-%' ORDER BY created_at DESC LIMIT 1;` status `ACTIVE`.
- **Error Test:** Block `POST /auth/guest` via devtools → `Upload` shows `Alert Cannot reach server` + still shows `Checking session…` until `isLoading false`.
- **Related:** UC-G-03, UC-G-04; used as prerequisite for customer UC-C-06 browser test without real account.

## UC-G-16 — Guest Session Persistence & Logout (Browser Test)

- **Flow:** After UC-G-15, `POST /auth/logout {refreshToken}` → `tokens.clear` + `lastLoginRole` removed → `Navigate /login`; verify `localStorage` empty; revisit `/upload` → new guest minted (different `guest-*` email).

---

### Traceability (Guest)

| Use Case | Frontend File:Line | Backend Endpoint |
|---|---|---|
| G-01 | `QrScan.tsx:1-40` | `GET /qr/{code}/resolve`, `POST /qr/{code}/scan`, `POST /auth/guest` |
| G-03 | `Upload.tsx:guestTried` | `POST /api/auth/guest` |
| G-04 | `Upload.tsx:doUpload` | `POST /documents/upload` |
| G-09 | `OrderDetail.tsx:pay` | `POST /orders/{id}/payment`, `POST /payments/{id}/verify` |

*Cross-checked 2026-08-28 against `FUNCTIONALITY.md` §2 + code.*
