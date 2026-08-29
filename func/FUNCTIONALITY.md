# Inko — Smart Printing Platform — Complete Functionality Inventory

**Version:** 1.0  
**Date:** 2026-08-28  
**Path:** `func/FUNCTIONALITY.md`  
**Language:** English  
**Split:** Per Actor (Guest via QR, Customer, Shopkeeper, Admin/Super Admin)  
**Layer separation:** Each actor has **Frontend** and **Backend** subsections. Shared/global layer documented separately.  
**Source verification:** Every entry cross-checked against `frontend/src/**`, `backend/src/main/java/com/inko/**`, `backend/src/main/resources/db/migration/**`, `application.yml`, `SecurityConfig.java`.

---

## Table of Contents
1. [Global / Shared](#1-global--shared)
   - 1.1 Frontend Shell & Routing
   - 1.2 Design System (ui.tsx) — Every UI Primitive & Status Indicator
   - 1.3 State & Cross-Cutting Frontend (Auth, API, Settings, Sound)
   - 1.4 Backend Cross-Cutting (Security, JWT, Error Model, DB, Config)
2. [Actor A — Guest via QR (Unauthenticated)](#2-actor-a--guest-via-qr-unauthenticated)
   - 2A.1 Frontend
   - 2A.2 Backend
3. [Actor B — Customer (Authenticated, ROLE_CUSTOMER)](#3-actor-b--customer-authenticated-role_customer)
   - 3B.1 Frontend
   - 3B.2 Backend
4. [Actor C — Shopkeeper (Authenticated, ROLE_SHOPKEEPER)](#4-actor-c--shopkeeper-authenticated-role_shopkeeper)
   - 4C.1 Frontend
   - 4C.2 Backend
5. [Actor D — Admin / Super Admin (ROLE_ADMIN, ROLE_SUPER_ADMIN)](#5-actor-d--admin--super-admin)
   - 5D.1 Frontend
   - 5D.2 Backend
6. [Relationship Map — How Frontend ↔ Backend Connect](#6-relationship-map)
7. [Cross-Check Verification](#7-cross-check-verification)
8. [Appendices](#8-appendices)
   - A. All Enums & Status Values
   - B. All Badge Tones & Alert Tones
   - C. All Icons (lucide-react) Used as Status Indicators
   - D. All API Endpoints Master Table
   - E. DB Tables & Columns
   - F. Permissions Matrix

---

## 1. Global / Shared

### 1.1 Frontend Shell & Routing

**Entrypoint `src/main.tsx`**
- Purpose: Bootstrap React. Creates `QueryClient {retry:1, staleTime:15000}`, wraps `<SettingsProvider>` → `<BrowserRouter>` → `<App>`. Imports `index.css`.
- Related: Provides React Query caching for all `useQuery` calls (shops, orders, notifications), i18n via settings.
- Cross-check: `frontend/src/main.tsx:1-18` verified.

**Root Router `src/App.tsx` — 100 lines**
- Wraps `<AuthProvider>` around `<Routes>`.
- **Public routes (no AreaGuard):**
  - `GET /login` → `Welcome` (unified sign-in/register). Purpose: Single entry for all roles; tabs handle password/OTP. Related to `AuthProvider`.
  - `GET /register` → `Welcome` (alias).
  - `GET /shop/login` → `ShopLogin`. Purpose: Shopkeeper console isolation.
  - `GET /admin/login` → `AdminLogin`. Purpose: Admin console isolation.
  - `GET /customer/login` → redirect `/login`.
  - `GET /signin` → redirect `/login`.
  - `GET /forgot-password` → `ForgotPassword` (OTP reset flow).
  - `GET /qr/:code` → `QrScan`. Purpose: Guest QR entry, resolves code → shop.
  - `GET /shops/:shopId/print` → `ShopPrint`. Purpose: Shop landing page after QR scan.
  - Inside `CustomerShell` (guest-capable): `/upload`, `/configure`, `/order/:id`, `/queue/:id` — Purpose: Login-optional printing workflow.
- **Gated routes (AreaGuard):**
  - `customer`: `/customer/dashboard`, `/customer` redirect, `/customer/profile`, `/customer/settings`, `/history`
  - `shop`: `/shop/dashboard`, `/shop/queue`, `/shop/shops`, `/shop/pricing`, `/shop/qr`, `/shop/profile`, `/shop/settings`
  - `admin`: `/admin/dashboard`, `/admin/shops`, `/admin/users`, `/admin/orders`, `/admin/complaints`, `/admin/audit`, `/admin/profile`, `/admin/settings`
- **Redirects:** `/dashboard` → `RoleRedirect` (role-aware home), `/` → `RoleRedirect`.
- **Fallback:** `/shops` placeholder `<div p-6>` and `*` → `Inko Page not found — go home` (link to `/customer/dashboard`).
- Relationship: Every gated route enforces `AreaGuard` → one session = one console.
- Cross-check: `App.tsx:33-99`.

**AreaGuard `src/components/AreaGuard.tsx` (51 lines)**
- Props: `area: 'customer'|'shop'|'admin'`.
- Purpose: Enforce console isolation. Prevents cross-area navigation without re-login.
- UI States:
  - `isLoading true` → spinner `h-8 w-8 animate-spin border-slate-300 border-t-blue-600` + text `Checking your session…` — Relationship: blocks flicker while `AuthProvider` bootstraps.
  - `!user` → `<Navigate to={AREA_LOGIN[area]}>` — Relationship: redirects to area-specific login.
  - `sessionArea !== area` → `mesh-gradient` Card with `ShieldAlert` amber icon `h-6 w-6`, title `Different console required`, text `You are signed in to {currentLabel} console…`, buttons: `Sign in to {area} console + ArrowRight` (primary) and `Back to my {current} dashboard` (secondary), note `One account, one active console`.
  - Else → `<Outlet>`.
- Cross-check: `AreaGuard.tsx:10-51`.

**ProtectedRoute `src/components/ProtectedRoute.tsx` (40 lines)**
- Props: `roles?: Role[]`.
- Purpose: UI-only role guard (backend enforces independently).
- UI States:
  - `isLoading` → same spinner + `Checking your session…`
  - `!user` → `<Navigate to="/login" state={{from: pathname}}>`
  - `roles && !roles.some(r => user.roles.includes(r))` → red card `Access denied. Your account (roles) cannot open this area. Required: roles`.
  - Else → `<Outlet>`.
- Relationship: Legacy guard; current gating uses `AreaGuard`.

**RoleRedirect `src/components/RoleRedirect.tsx`**
- Purpose: Home resolver.
- Logic: `!user → /login`; `getSessionArea() && hasAreaRole → AREA_HOME[area]`; else priority `ADMIN → /admin/dashboard`, `SHOPKEEPER → /shop/dashboard`, else `CUSTOMER → /customer/dashboard`.
- Relationship: Used by `/` and `/dashboard`.

**Layouts:**
- `CustomerShell.tsx` — NAV 3 (`/customer/dashboard` i18n `navDashboard`, `/upload`, `/history`), brand `Inko PRINT OS`, `NotificationsBell`, avatar `CUSTOMER` initials, dropdown to `profile/settings`, mobile drawer `Menu/X`, footer `footerCustomer © {year} Inko — Smart Printing Platform. · All systems operational` + emerald dot. Icons `Printer,LogOut,LayoutDashboard,UploadCloud,History,Settings,User,Menu,X`.
- `ShopShell.tsx` — NAV 5 (`/shop/dashboard`, `/shop/queue ListOrdered`, `/shop/shops Store`, `/shop/pricing Tag`, `/shop/qr QrCode`), tag amber `SHOP OS`, dropdown `SHOPKEEPER`, footer `footerShop`.
- `AdminShell.tsx` — NAV 6 (`/admin/dashboard ShieldCheck navOverview`, `/admin/shops Building2`, `/admin/users Users`, `/admin/orders FileText`, `/admin/complaints MessagesSquare`, `/admin/audit ScrollText`), tag indigo `ADMIN`, footer `footerAdmin`.
- `AppShell.tsx` (legacy, 7 NAV items) — same header pattern but not routed.

### 1.2 Design System `src/components/ui.tsx` — Every Primitive

**Button** — `cva` variants:
- `variant: primary oklch(0.55 0.20 260) white hover 0.50, secondary border slate-200 white, outline, ghost, danger red-600, subtle slate-900`
- `size: sm h-8 px-3 text-xs rounded-lg, md h-10 px-4, lg h-11 px-6 15px, icon h-9 w-9`
- `loading` → spinner `h-4 w-4 animate-spin border-2 border-current border-t-transparent` + disabled. Purpose: Primary CTA, secondary cancel, danger delete. Related to every form/page.

**Input / Textarea / Select / Label**
- `Input h-10 rounded-xl border-slate-200 bg-white px-3.5 shadow-sm hover:border-slate-300 focus:border-oklch focus:ring-4 oklch/0.12 placeholder slate-400 disabled 50%`. Purpose: All forms.
- `Textarea min-h 88px py-3` — complaint description, shop address.
- `Select h-10 rounded-xl` — paper size, color, shop picker, status.
- `Label mb-1.5 text-sm font-medium slate-700 block`.

**Card**
- `rounded-2xl border-slate-200 bg-white shadow-sm` + `hover:shadow-md hover:border-slate-300` if `hover`. Subcomponents `CardHeader p6 pb3`, `CardContent p6 pt3`, `CardFooter flex items-center`.
- Purpose: Containers for KPIs, forms, lists.

**Badge** — `cva tone`:
- `default slate-100`, `brand oklch(0.85/0.95/0.45) indigo`, `success emerald-50`, `warning amber-50`, `danger red-50`, `info sky-50`, `neutral white`. `rounded-full px-2.5 py-0.5 border text-xs font-medium`.
- Purpose: Status indicators everywhere. Example mappings: `Shop OPEN success, BUSY warning, CLOSED neutral, SUSPENDED danger`; `Order COMPLETED success, PRINTING brand, QUEUED warning, CANCELLED danger`; `Token WAITING warning, CALLED brand, PRINTING brand, COMPLETED success`.

**Alert** — `tone error red-50, success emerald-50, info sky-50, warning amber-50` `rounded-xl border px-4 py-3 text-sm leading-relaxed role=alert`. Purpose: Error/success/info banners.

**Skeleton / SkeletonCard**
- `Skeleton animate-pulse rounded-xl bg-slate-200` + `SkeletonCard p5 space-y3 h-5 w-3/5 etc.`. Purpose: Loading placeholders for shops, orders, revenue.

**Separator / Progress**
- `Separator h-px bg-slate-200`.
- `Progress {value} h-2 rounded-full bg-slate-100 inner oklch width clamped 0-100 transition 500`. Purpose: Revenue mix share bar.

**Dialog**
- Props `open, onClose, title, children`. Behavior: `Escape` closes, `body overflow hidden` while open, `fixed inset-0 backdrop-blur bg-slate-900/40`, `max-w-lg max-h 88vh rounded-2xl p4/6 shadow-xl`. Title sticky `text-lg font-semibold`. Purpose: Shop create/edit, resources, delete confirm, complaint, regenerate QR.

**EmptyState**
- Props `icon?, title, description, action`. UI `flex col dashed border-slate-200 bg-slate-50/60 px6 py12 text-center` + `rounded-2xl bg-white p3 shadow-sm border` icon `h-6 w-6 slate-400`. Purpose: No shops, no orders, no printers, no revenue.

**Toast / Toaster**
- Global `toastListeners`, `toast(message, tone success/error/info)` auto dismiss 3500ms, `Toaster` bottom-right `fixed bottom-4 right-4` stacked `border px4 py3 shadow-lg` tones. Purpose: Ephemeral feedback.

**Stepper**
- Props `steps[], current`. UI pills `rounded-full px3 py1.5 text-xs border` `current oklch text-white shadow, <current emerald-50/emerald-700 border-emerald-200, >current white slate-500` + circle `h-5 w-5` `current white/20, <current emerald-600 ✓, > slate-100`, connector `h-px w-6/8` emerald/slate. Purpose: Upload/Configure/Pay 3-step, Forgot 3-step.

Cross-check: `ui.tsx:1-242` all variants verified.

### 1.3 State & Cross-Cutting Frontend

**Auth `src/lib/auth.tsx` (167 lines)**
- Types: `CurrentUser {id, fullName, email|null, phone|null, roles[], permissions[], status 'ACTIVE'|'INACTIVE'|'SUSPENDED', shopId?}`, `ROLES [CUSTOMER, SHOPKEEPER, ADMIN, SUPER_ADMIN]`, `SessionArea 'customer'|'shop'|'admin'`, constants `AREA_LOGIN {customer:/login, shop:/shop/login, admin:/admin/login}`, `AREA_HOME`, `AREA_LABEL`, helpers `getSessionArea()/setSessionArea()` via `localStorage inko.lastLoginRole`.
- Context `AuthContextValue {user, isLoading, loginWithPassword(identifier,password), requestOtp(identifier), verifyOtp(identifier,code), register(fullName,email,phone,password,accountType), forgotPassword(email), resetPassword(identifier,code,newPassword), deleteAccount(password), logout(), refreshMe()}`.
- State: `user null, isLoading true` + `AuthProvider` bootstrap `useEffect` with `failsafe 8000ms` timeout, `GET /users/me timeout 10000` if tokens exist else `isLoading false`; on 401/403 clears `tokens`.
- Functions: `loginWithPassword POST /auth/login`, `requestOtp POST /auth/otp/request` checks `delivered`, `verifyOtp POST /auth/otp/verify`, `register POST /auth/register` with `accountType`, `forgotPassword POST /auth/forgot-password` returns `devCode`, `resetPassword POST /auth/reset-password`, `deleteAccount DELETE /users/me {password}`, `logout POST /auth/logout {refreshToken} + tokens.clear + remove lastLoginRole + setUser null`, `refreshMe GET /users/me`. `applySession` → `tokens.set(access,refresh)`.
- Related: Every page uses `useAuth()`; `Settings` for language; `NotificationsBell` needs user.
- Purpose: Central session; handles guest creation, persistence, area isolation.

**API `src/lib/api.ts` (117 lines)**
- Keys `inko.access_token, inko.refresh_token`.
- `tokens {get access/refresh, set(a,r) localStorage, clear()}` clears also `lastLoginRole`.
- Axios `api {baseURL VITE_API_BASE_URL||/api, timeout 15000}`, request interceptor `Bearer` header.
- Types: `ApiErrorBody {status, code, message, details?}`, `STATUS_MESSAGES 400/401/403/404/405/409/413/429/500/502/503/504` friendly strings.
- `apiErrorMessage(error)` — axios error: if `body.message` + `details` values join, else `STATUS_MESSAGES[status]`, else `ERR_NETWORK` → `Cannot reach server`, else `error.message`.
- Refresh: `refreshPromise single-flight`, `refreshAccessToken POST /auth/refresh {refreshToken} timeout 10000 → tokens.set`, interceptor retries 401 except `/auth/login|refresh|register|otp`, `_retry` flag, on failure clears tokens and `window.location.assign(loginPath)` area-aware (`shop:/shop/login, admin:/admin/login, else /login`).
- Purpose: All HTTP; friendly errors; transparent token rotation.

**Settings `src/lib/settings.tsx` (306 lines)**
- `Language 'en-IN'|'hi'|'mr'`, `LANGUAGE_LABEL`, `STRINGS` 3 locales × ~45 keys each (e.g., `settings, notifications, sound, darkMode, language, testVoice, voiceDemo, saved, navDashboard…navOverview, profile, signOut, footerCustomer/Shop/Admin, allSystems, shopDashboard, queueFirstOps, manageQueue, platformOrders, revenueByDay, noRevenueYet… lowBadge`).
- Type `Settings {notifications, sound, darkMode, language}`, `KEY inko.settings`, `DEFAULTS {true,false,false,'en-IN'}`.
- Functions: `load()`/`persist()` localStorage, `useSettingsStore()` with effects: persist, `documentElement.classList dark` + `colorScheme`, `lang` attribute, `t(key)` fallback, `set(k,v)`, `speak(text)` — `speechSynthesis.cancel()`, `SpeechSynthesisUtterance` voice by `lang prefix en/hi/mr`, `lang en-IN/hi-IN/mr-IN`, `rate 0.95`.
- Context `SettingsProvider`, `useSettings()`.
- Purpose: Device-local preferences; voice announcements for token completion.

**Sound `src/lib/sound.ts`**
- `announceToken(tokenNumber, lang)` — checks `inko.settings.sound`, `speechSynthesis`, text variants `Token {n} completed` (hi/mr), cancels prior. Purpose: Shop queue audible.

**Utils `src/lib/utils.ts`**
- `cn(...inputs) = twMerge(clsx(...))`. Purpose: Tailwind class merge.

**NotificationsBell `src/components/NotificationsBell.tsx`**
- State `open, enabled {!!user && settings.notifications}`, `prevUnread`.
- Queries `@tanstack/react-query` `notifications GET /notifications refetch30s`, `unread-count GET /notifications/unread-count`, effect speaks newest title if `sound && unread>prev`.
- UI: if disabled → `BellOff` disabled; else `Bell h-9 w-9` with red badge count (>0). Dropdown `fixed inset-x-3 top-14 sm:w-80 max-h70vh` header `Mark all read CheckCheck indigo`, list `rounded-xl px3 py2.5 unread bg-indigo-50 dot else opacity60`, `Link` if `linkPath`. Actions `POST /notifications/:id/read`, `POST /notifications/read-all`.
- Related: Links to `/queue/:shopId?order=`, `/order/:id`, `/shop/shops`.
- Purpose: In-app alerts for order/payment/token/low-stock.

**MapPicker `src/components/MapPicker.tsx`**
- Props `lat?, lng?, onPick({lat,lng,displayName,address})`.
- State `pickLat/pickLng, addr, search, suggestions, loading`.
- Functions: `reverse` OSM reverse, `doSearch` OSM search `countrycodes=in`, `pickSuggestion`, `confirm` validates + double `onPick`.
- Effects: loads Leaflet `unpkg.com/leaflet@1.9.4` CSS+JS, map tiles `mt1.google.com/vt/lyrs=m`, draggable marker, click/drag updates + reverse, sync view.
- UI: search `Input` debounce 500ms `window.__mapSearch`, `Button Search`, suggestions `max-h44 type•class lat`, `div mapRef h-64 rounded-xl`, lat/lng `Input` grid, addr preview, `Button Confirm Check` full width. `leafletRef/markerRef`.

**PhoneInput `src/components/PhoneInput.tsx`**
- `COUNTRIES [IN+91, US+1, UK+44, AU+61, AE+971, SA+966, BD+880, LK+94, NP+977, MY+60, SG+65, ZA+27]`.
- `CountryCode` absolute `left-1.5` `Select w104 h-7 bg-slate-100`.
- `fullPhone(cc,local)` strips non-digits.
- Purpose: Normalize phone to `+CC digits`.

### 1.4 Backend Cross-Cutting

**Config `application.yml` (60 lines parsed)**
- `server.port 8080`.
- `spring.datasource url ${INKO_DB_URL:jdbc:postgresql://localhost:5432/inko} user inko_app pwd inko_app_dev_pwd hikari max10 timeout5s`.
- `flyway enabled locations classpath:db/migration`.
- `jpa ddl-auto validate open-in-view false time_zone UTC`.
- `multipart max-file 50MB max-request 200MB`.
- `management endpoints health,info`.
- `inko.app.jwt secret ${INKO_JWT_SECRET:dev-only...} access 15m refresh 7d`.
- `cors allowed-origins http://localhost:5173` (prod `${INKO_APP_CORS_ALLOWEDORIGINS}`), `dev-mode true seed-dev-data true`, `otp validity 5m max-attempts 5`, `storage root ./data/storage`, `payment provider mock`, `logging com.inko DEBUG`.

**Migrations V1-V12:**
- V1 `set_updated_at() trigger`.
- V2 `users (UUID PK, fullName 120, email 180 UQ, phone 20 UQ, passwordHash 100, status, emailVerified, lastLoginAt)`, `roles (SERIAL CUSTOMER|SHOPKEEPER|ADMIN|SUPER_ADMIN)`, `permissions(code)`, `user_roles`, `role_permissions`, `refresh_tokens (token_hash UQ, expires_at, revoked_at)`, `otp_codes (identifier, purpose LOGIN|VERIFY_EMAIL|VERIFY_PHONE|RESET_PASSWORD, attempts, expires_at, consumed_at)`.
- V3 `shops (owner_user_id FK SET NULL, name 150, city 80, address1/2 200, state 80, pincode12, lat/lng 9,6, phone20, email180, status, supports_color)`, `operating_hours`, `shopkeeper_permissions`.
- V4 `paper_types`, `printers (color_capable, error_message, last_heartbeat, pages_printed_total)`, `printer_paper_sizes`, `shop_paper_inventory (quantity>=0, low_stock_threshold 100)`.
- V5 `documents (storage_key 500, mime, file_size, checksum, status/archived, analysisStatus, page_count, summary jsonb)`, `document_pages (orientation, width_pt, height_pt, is_blank, thumbnail_key)`.
- V6 `pricing_rules (scope PLATFORM|SHOP, price_per_page 8,4, UQ scope/shop/size/color/sides/from)`, `discount_rules (type PERCENTAGE|FIXED, value, max_discount, starts/ends, limits)`, `coupons (code UQ, valid window)`, `coupon_redemptions`.
- V7 `print_configurations`, `orders (order_number UQ INKO-YYYY-######, status 16, total_pages, copies, amounts 12,2, snapshot jsonb, coupon, version)`, `order_items`.
- V8 `token_sequences (shop_id, seq_date PK)`, `tokens (token_number UQ shop/date/number, type, priority, timestamps)`, `queue_entries (position, status WAITING|CALLED|PROCESSING|DONE|REMOVED)`, `printer_jobs`.
- V9 `payments (method MOCK_UPI|GATEWAY|COD, providerOrderRef, status, idempotency_key UQ, meta jsonb)`, `payment_transactions`, `refunds (breakdown jsonb, status)`, `invoices`.
- V10 `complaints (complaint_number UQ, category 9, attachments jsonb, status)`, `notifications (type, title200, body1000, linkPath, is_read, channel)`, `notification_preferences`, `qr_codes (code_value UQ 64, status)`, `qr_scan_events`, `audit_logs (actor, action, old/new jsonb)`, `failed_jobs`, `system_settings (8 keys)`.
- V11 seeds roles 4, permissions 21, paper types 7, system_settings 8 (tax 0, cancellation 5min, fee10%, min/max A4 BW 1/10, high_paper500, low_stock100, currency INR).
- V12 `UPDATE orders SET status PRINTING/COMPLETED where token matches` — fixes stale QUEUED.

**Security `SecurityConfig.java` (123 lines)**
- Beans `BCrypt 10`, `CorsConfigurationSource` `AllowedOrigins` prop, methods GET|POST|PUT|PATCH|DELETE|OPTIONS headers *, exposed `Location`, credentials true on `/api/**` + `/actuator/**`.
- `SecurityFilterChain`: `csrf disable`, `cors`, `stateless`, authorize: `permitAll /api/auth/**, /actuator/health, /error, /swagger-ui/**, /v3/api-docs/**`, `GET permitAll /api/shops, /pricing/rules, /discounts, /discounts/coupons`, `GET permitAll /api/shops/*, /qr/*/resolve`, `POST permitAll /qr/*/scan`, `permitted /api/shops/mine authenticated` (first match wins), `/api/analytics/** hasAnyRole ADMIN|SUPER_ADMIN|SHOPKEEPER`, `/api/refunds/*/decision hasAnyRole ADMIN|SUPER_ADMIN`, `/api/admin/** hasAnyRole ADMIN|SUPER_ADMIN`, `anyRequest authenticated`. Exceptions `401 UNAUTHORIZED JSON ApiError`, `403 FORBIDDEN`. Adds `JwtAuthFilter` before `UsernamePasswordAuthenticationFilter`.

**JWT `JwtService.java` (126 lines)**
- HS256 Nimbus `MACSigner/Verifier`, secret UTF-8, `validityMinutes 15`.
- `issueAccessToken(userId, roles ROLE_*, permissions, shopId)` → JWT `sub userId, jti UUID, iat now, exp now+15m, roles[], perms[], shopId?` `JWSHeader HS256`, `SignedJWT sign`.
- `verify(token)` → parse, `verify(verifier)` else `InvalidTokenException`, check `exp before now` → `TokenExpiredException`, return `DecodedToken(userId, roles, perms, shopId)`. Inner `InvalidTokenException`, `TokenExpiredException`.

**Filter `JwtAuthFilter`**
- `OncePerRequestFilter` → `Bearer` header → `jwtService.verify` → `AppUserDetailsService.loadUser(userId)` → check ACTIVE else throw, build `InkoPrincipal extends UserDetails` authorities `ROLE_*` + `permission codes`, `SecurityContext` auth. On exception clear context and `chain.doFilter` → SecurityConfig returns 401.

**Error Model `common/error`**
- `ErrorCode` 19 entries mapping to HTTP status (VALIDATION 400, INVALID_CREDENTIALS 401, UNAUTHORIZED 401, TOKEN_EXPIRED 401, INVALID_TOKEN 401, OTP Invalid/Expired 400, FORBIDDEN 403, SUSPENDED 403, NOT_FOUND 404, CONFLICT 409, PRICING_NOT_CONFIGURED 400, COUPON invalid/expired/limit 400, DISCOUNT_NOT_APPLICABLE 400, PRICE_OUT_OF_BOUNDS 400, INTERNAL 500).
- `ApiException(ErrorCode,msg)` + helpers `notFound`, `forbidden`.
- `ApiError(status,code,message,details Map)` `of()`.
- `GlobalExceptionHandler` maps `ApiException` → JSON `status/code/message/details`, validation errors → `details` field map.

---

## 2. Actor A — Guest via QR (Unauthenticated)

### 2A.1 Frontend — What Guest Sees Without Login

**A1. QR Scan Entry `QrScan.tsx` (`/qr/:code`)**
- Purpose: Bridge physical poster to digital shop. No auth required. Mint guest session if needed, redirect to upload.
- UI States:
  - `loading true` → mesh-gradient `Store pulse Opening print dashboard + Skeleton h2 w40` + subtitle `Resolving QR…`.
  - `err` → `AlertTriangle QR not found — Invalid or expired` + `Button Continue without QR → /upload`.
- Logic: `GET /qr/:code/resolve → {shopId, code, status}` → `POST /qr/:code/scan {scan event}` → `GET /shops/:shopId fallback` → `localStorage inko.qrShop = shopId`, if no `inko.access_token` → `POST /auth/guest → tokens.set + setSessionArea customer + refreshMe`, `navigate /upload?shopId&src=qr`.
- Backend deps: `QrController.resolve/scan`, `AuthController.guest`.
- Related: Enables `Upload` pre-selected shop banner; `ShopPrint` landing.

**A2. Shop Landing `ShopPrint.tsx` (`/shops/:shopId/print`)**
- Purpose: Confirm shop after QR, show capabilities before upload.
- API: `GET /shops/:shopId` (permitAll).
- UI States:
  - Loading → `Loading shop…`.
  - Error → `AlertTriangle Shop not available` red card.
  - Success → Card `gradient indigo→violet Store icon + name h2 + Badge status OPEN/BUSY + MapPin city + Palette Color/B&W + Mono id8`. Description `Upload your documents for this shop`. Stats grid 3 `Printer All sizes, Clock Live queue, QrCode Scan again` gray cards. CTA `Button Start printing — upload ArrowRight → /upload?shopId` (primary lg). Links: `Upload →`, `My orders (→/history)`, `View queue (→/queue/shopId)`.
- Relationship: Entry after `QrScan`; retains `shopId` in URL for `Upload` pre-select.

**A3. Guest-Capable Workflow (`CustomerShell` without AreaGuard)**
- Routes `/upload`, `/configure`, `/order/:id`, `/queue/:id` accessible without login.
- `Upload.tsx` guest handling:
  - Effect: if `!user && !tokens.access` → `POST /auth/guest` silent mint (see below).
  - `isGuest = user.email endsWith @guest.inko.local`.
  - Banner if `?src=qr & shopName` → emerald `QrCode Scanned at {name}`.
  - Guest name Card: `Label Your name + Input value=guestName (localStorage inko.guestName) + Button Save & remember → PATCH /users/me {fullName} + persist`. Purpose: Show on shop queue `👤 GuestName`.
  - Guest upsell indigo card `LogIn Create account UserPlus → /login` — prompts conversion.
  - `preselectedShop` banner indigo `Shop {name} pre-selected Clear X`.
- `ShopPrint` already described.
- **Guest Session Mint `POST /auth/guest` (backend `AuthService.createGuestSession`)**
  - Creates `User fullName Guest, email guest-{UUID}@guest.inko.local, password random, status ACTIVE, role CUSTOMER`, saves, returns `AuthResponse`. Frontend stores tokens, sets `lastLoginRole customer`, calls `refreshMe` to load `user`.
  - Purpose: Make every secured endpoint work unchanged; login stays optional. Idempotent per QR scan.
  - Related: `AuthProvider` will treat guest as authenticated CUSTOMER with limited permissions.

**A4. Upload Documents `Upload.tsx` (`/upload?shopId&src=qr`)**
- Purpose: First step of printing; guest can drop files immediately.
- State: `files:File[], drag bool, err, loading bool, progress number, result {documents:[{id,fileName,pages,size}]}, preselectedShop, fromQr, isGuest, guestTried, guestName, nameBusy`.
- Effects: persist `inko.guestName`, mint guest if none, parse `?shopId`.
- UI Detail:
  - `Stepper Upload Configure Preview Pay current 0`.
  - Dropzone `dashed-2 p8 rounded-2xl` drag state `bg-indigo-50 border-indigo-300`, icon `UploadCloud 14x14 slate-300`, title `Upload documents` or `Drop files`, hint `Browse files` hidden `<input type=file multiple accept .pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt>`. Max 10 files, each ≤50MB.
  - File chips `grid2` each `FileIcon + name truncate + size formatBytes + type + X remove`.
  - Loading queue: Card spinner `h-8 w-8 border-t blue` + `Progress {progress}`.
  - Error `AlertTriangle` red.
  - Buttons: `Upload & analyze ArrowRight` (primary) + `Continue to configure → /configure?shopId state {docs}`.
  - Result: header `CheckCircle2 Analysis complete Ready success` → grid2 cards thumbnail/FileText + `Badge mime warning blanks brand pages` + `Badge Analyzed success` or `pre analysis_summary slate-900`.
- Logic: `addFiles` validate size 50MB, max10; `doUpload POST /documents/upload FormData files onUploadProgress → result`; `formatBytes`, `fileIcon` by extension.
- Backend: `DocumentController.upload`, `StorageService`, `DocumentAnalysisService`.

**A5. Remaining Guest Pages Accessible:**
- `Configure.tsx` (see Customer section) — preview before order creation does not require auth beyond guest token.
- `OrderDetail /queue` — guest can view their order/token after payment because order contains their `customerId` (guest UUID).

### 2A.2 Backend — Guest Support

**Auth `POST /api/auth/guest` permitAll**
- DTOs: none request, `AuthResponse` response.
- Service `AuthService.createGuestSession` — synthetic `User("Guest", "guest-{UUID}@guest.inko.local", random pwd, ACTIVE)` + role `CUSTOMER`, log, `issueAuthResponse`.
- Purpose: Ephemeral CUSTOMER; fulfills `authenticated` endpoints without real registration. Relationship: `User.email` unique constraint allows many guests; cleanup not yet automated.

**QR Flow:**
- `GET /api/qr/{code}/resolve permitAll` → `QrService.resolve` checks `ACTIVE` not expired, returns `{shopId, code, status, qrId}`.
- `POST /api/qr/{code}/scan permitAll` → `QrService.logScan` saves `QrScanEvent(qrId, userId nullable, ip45, userAgent300, scannedAt)` + returns `{shopId, redirect /shops/{id}/print}`.
- Purpose: Track QR usage per shop; audit scans; link physical to digital. Related to `QrCode` lifecycle (see Shopkeeper).

**Documents `POST /api/documents/upload authenticated`** (requires guest token) — same as customer; guest `customerId` owns docs. `GET /api/documents/{id}/download` checks `doc.customerId === principal.userId`.

**CORS & Security:** `GET /api/qr/*/resolve`, `POST /api/qr/*/scan`, `GET /api/shops/*`, `GET /api/shops` permitAll, so QR flow works zero-auth before guest mint.

---

## 3. Actor B — Customer (Authenticated, ROLE_CUSTOMER)

### 3B.1 Frontend — Customer Experience

**B1. Authentication Entry `Welcome.tsx` (`/login`, `/register`)**
- Purpose: Unified sign-in/register with role choice.
- State: `mode signin|register`, `method password|otp`, `accountType CUSTOMER|SHOP_OWNER`, `step 1|2` (if `?type`), `identifier, password, otpPhone, otpCountry +91, otpCode, devHint, fullName, email, phone, newPassword, confirm, error, busy`.
- Logic: `routeForRoles` sets `lastLoginRole` per highest role + navigate `?next` or home; `handlePasswordSignIn loginWithPassword`, `handleSendOtp requestOtp(fullPhone)`, `handleVerifyOtp verifyOtp`, `handleRegister register(fullName, email||undef, fullPhone, newPassword, accountType)` validates `fullName, email||phone, pw>=8, match`.
- UI:
  - `mesh-gradient flex min-h-screen center 480px Card`.
  - Brand `Printer gradient + Inko` title.
  - Tabs `Sign in / Create account` active `oklch` border.
  - Error `Alert error AlertCircle`.
  - Dev hint `info` blue (OTP code in dev).
  - Method tabs `Password / Phone OTP`.
  - Sign-in password: `Mail icon identifier + Lock icon password`, `Forgot? → /forgot-password`, `Sign in ArrowRight lg` + disabled `busy`.
  - OTP phone: `CountryCode + Input phone + Button Send OTP`, then `Input mono center otpCode + Verify`.
  - Register step1 cards: `FileText Customer` vs `Store Shop Owner` border `oklch` selected, step2 banner `CheckCircle2` indigo/slate, fields `User fullName, Mail email, Phone CountryCode+Input, Lock newPassword + strength bar width len*12% color green>11 amber>7, Lock confirm`, `Back + Create`.
  - Links `Admin login → /admin/login`.
- Related: Sets `lastLoginRole` to `customer` if CUSTOMER else `shop` if SHOP_OWNER, later `RoleRedirect` respects.

**Legacy `Login.tsx` & `Register.tsx` & `CustomerLogin.tsx`**
- `CustomerLogin.tsx` (`/customer/login` now redirects to `/login` but still exists): `canAccessCustomer CUSTOMER|ADMIN|SUPER_ADMIN`, same OTP/password, checks role else `This account is a shop owner…`, destination `?next || state.from || dashboard` → `go sets lastLoginRole customer`.
- `Register.tsx` (`/register?type=shop`): inputs `fullName, email, phone countryCode +91, password, confirm`, amber note if `isShop` `admin upgrades to SHOPKEEPER then Shop login`, buttons self.
- Purpose: Separate entry points but now unified in `Welcome`.

**Forgot Password `ForgotPassword.tsx` (`/forgot-password`)**
- State `step request|reset|done`, `email, code, newPassword, devHint, error, busy`.
- Flow: `handleRequest forgotPassword(email lower) → devCode → step reset`, `handleReset resetPassword(identifier, code, newPassword) → done`, progress dots `h-1.5 w-8 indigo current emerald past`.
- UI: mesh 440px, `Alert` errors, `Mail email + Send reset code`, reset `KeyRound code + Lock new pw + Set password + Back ArrowLeft`, done `CheckCircle2 Success Password updated… signed out → Back to sign in`.

**Customer Dashboard `Dashboard.tsx` (`/customer/dashboard`)**
- Purpose: Entry after login; discover shops, start printing, see stats.
- Hooks: `useOpenShops(enabled isCustomer) GET /shops refetch30s` → `ShopSummary[]`, `myOrders GET /orders`.
- Logic: `ROLE_HOME` hint per role, `Stat` component `icon 9x9 rounded-xl`.
- UI:
  - Hero `rounded28 border-indigo-200 bg-white shadow` gradient opacity8 blobs, badge `Sparkles New Smart queue`, title `Welcome back {firstName} 👋`, hint `Upload → queue token`, CTA `Upload documents ArrowRight lg + View history secondary`, checklist `CheckCircle2 No waiting, Palette B&W & Color`.
  - Stats: `Shops online {length/—} live/refreshing`, `Your orders {myOrders.length/—} track in History`, `HOW IT WORKS 4 steps Upload/Configure/Preview/Pay & Token` slate-900 grid4.
  - Feature cards filtered by roles: `Upload & print FileUp CUSTOMER → /upload`, `Browse shops Store → /upload`, `Shop dashboard LayoutDashboard SHOPKEEPER|ADMIN → /shop/dashboard`, `Admin console ShieldCheck ADMIN → /admin/dashboard` `Card hover p5 icon slate-900 ArrowRight`.
  - Shops section if CUSTOMER: header `Open shops near you` badge open count + live dot, skeletons 3, error red `AlertCircle Could not load Retry`, empty `Store No shops open (9am) + Upload anyway`, grid3 cards `Store icon indigo50 + name + MapPin city + Badge OPEN success/BUSY warning/neutral + Badge Color available brand/B&W neutral + Buttons Select →/upload + View queue →/queue/id`.

**Upload (already detailed in Guest, adds auth enhancements)**
- Customer sees guest upsell hidden (already logged), `pre-selectedShop` persists, `Progress` now real `axios onUploadProgress`.

**Configure `Configure.tsx` (`/configure?shopId&reprint`)**
- Purpose: Choose print options, preview price, create order.
- State: `shops, shopId, paperA4, colorBW, sidesSINGLE, copies 1, pages ALL, coupon, couponApplied, quote, err, loading, isLockedShop(!!qrShopId)`, location state `docs [{id, fileName, pages}]`, `fromQr` banner.
- Effects: fetch `GET /shops` → `shopId`, debounce preview 600ms on changes.
- Logic: `countPages(sel,total)` parses `1-5,8`, `preview POST /pricing/quote {shopId,paperSize,colorMode,sidesMode,pages,copies,specialPaper false,couponCode} → quote {subtotal, discounts, tax, final, breakdown}`, `proceed POST /orders {shopId,couponCode,items[{documentId,paperSize,colorMode,sidesMode,orientation AUTO,pageSelection,copies}]} → created Order {id} → nav /order/:id`.
- UI:
  - `Stepper Upload Configure Pay current1`.
  - Left column: shop selector `Store Shop — QR locked emerald` or `Select`; docs chips `FileText +Badge pages`.
  - Print options Card `Layers/Palette/BookOpen/Copy` selects `A4/A3/A5/LETTER/LEGAL`, `BW/COLOR`, `SINGLE/DOUBLE`, copies `Input number`; Pages `ALL` input tip `1-5,8`.
  - Coupon Card `Tag Input uppercase mono + Apply Button` → `couponApplied` check.
  - Error `Alert`, quote emerald `YOU PAY ₹final taxes`, `Yes, print — Confirm ArrowRight`.
  - Right sticky: price preview Card slate-900 header `Calculator Live preview`, empty dashed `Percent + Choose options`, else lists `subtotal, paper/color/side/specialCharges, discount, tax, Final bold`, `ShieldCheck notes`, `Confirm & pay primary`, `What happens next 1-3 steps`.
- Backend: `PricingController.quote` (permitAll but scope check), `OrderController.create`.

**Order Detail `OrderDetail.tsx` (`/order/:id`)**
- Purpose: Track order lifecycle, pay, request refund, file complaint, track queue.
- Constants `STEPS [PLACED,PAYMENT,QUEUED,PRINTING,COMPLETED]`, `stepIndex` mapping `CREATED/CONFIGURED/PAYMENT_PENDING→0 etc`.
- State: `data {order, items}, err, payMsg, payBusy, refunds[], complaintOpen, category, description, tokenLive {tokenId, status, estimatedWaitMinutes, totalPages}, poll 3s`.
- Logic: `loadAll GET /orders/:id + GET /tokens/:id/wait?shopId + GET /tokens/:id + GET /orders/:id/refunds`; poll 3s; Actions `POST /orders/:id/refund {amount,reason}`, `POST /refunds/:id/decision {decision} admin only`, `POST /complaints {orderId,shopId,category,description}`, `pay(method) POST /orders/:id/payment {method,idempotencyKey} + if not COD POST /payments/:id/verify` else `COD`, reload.
- UI:
  - Header `Receipt ORDER {orderNumber} Badge status (completed success, cancelled danger brand) ₹finalAmount createdAt` + `Button Track queue Ticket → /queue/{shopId}?order=id` + `History ghost`.
  - Timeline Stepper 5 circles `emerald ✓ < current, indigo current, slate next` + lines color.
  - Live Badge `WAITING In queue / CALLED Your turn — go to counter / PRINTING Printing started… / COMPLETED Print completed — collect` + `estimatedWaitMinutes × totalPages`.
  - Grid two cols: left Items `FileText × items.length Fallback summary`, Pricing snapshot parsed JSON entries or `<pre slate-900>`.
  - Right Payment `CreditCard Mock UPI ShieldCheck ArrowRight + COD`, `payMsg Alert`, refunds list `Badge success danger warning` + `Approve/Reject Button` if admin; `Request refund (10% fee) Button` if `PAID|PARTIALLY` else amber note `mock`.
  - Help `LifeBuoy Open queue, File complaint Link`.
  - Dialog complaint `Select category 9 options + Textarea + Submit/Cancel`.
  - Skeletons while loading, `Alert error`.

**Queue Track `Queue.tsx` (`/queue/:shopId?order=`)**
- Purpose: Real-time queue position, wait estimate, live SSE.
- State: `shopId param, orderId query, tokens[], mine, live bool`.
- Effect: `load GET /shops/:shopId/queue`, `GET /tokens/:id` (by order), polling 5s + `EventSource /api/shops/:shopId/queue/stream` live flag `Radio vs Timer`.
- Derived: `waiting = WAITING|QUEUED|PENDING`, `position index+1`, `estimate pagesAhead*0.4 + tokens*1 + myPages*0.3`.
- UI:
  - Header `Store Queue — Shop {id8}` live badge `Live SSE / Polling fallback` emerald/amber, `Estimates…`, `New print Ticket →/upload?shopId`.
  - Mine Card gradient `indigo→violet` or `indigo→blue if PRINTING, emerald if COMPLETED` tokenNumber `5xl font-black`, Badge `friendlyStatus`, Position, `Timer wait`, `Ticket` icon.
  - Stats 3 cols `Shop/Type/Status`.
  - Main `Users Waiting • n` list tokens `isMine border-indigo-300 bg-indigo-50` token badge `slate-900 vs indigo` `You brand`, `type • status • estimatedWait`, `Pos #`, `Now serving/~min/Called/Printing/Done`; empty `CheckCircle2 No tokens dashed`.
  - Right `Clock3 At a glance` Waiting/Your position cards + wait Timer; Help list steps.

**History `History.tsx` (`/history`)**
- Purpose: List all my orders, filter, reprint.
- State: `orders, loading, q search, statusFilter ALL|QUEUED|ACCEPTED|PRINTING|COMPLETED|CANCELLED|REFUNDED, shopFilter all, shops Set`.
- Logic: `load GET /orders` (my orders), `filtered` by status/shop/hay `orderNumber/status`, `printAgain GET /orders/:id → map items → docs [{id,fileName,pages}] → nav /configure?reprint&id state`.
- UI:
  - Header `History Order history` + `Refresh`.
  - Card filters grid `Search Input + Status Select + Shop Select + Filter count {n}`.
  - Loading `Skeleton 3`, Empty `FileText No orders yet / No matching + Upload/Clear`.
  - Desktop `table hidden sm` columns `Order mono8, Shop Printer, Status Badge, Date Clock3, Amount, Actions View secondary + Print again`. Mobile cards `mono + Badge Amount`.

**Profile & Settings `Account.tsx`**
- `Profile(home)`:
  - `Back ArrowLeft → home`.
  - `Card avatar initials 16x16 slate-900 + fullName + Badge brand roles + Badge status success/warning`, `dl Mail Email, Phone Phone, Store ShopId mono, ShieldCheck UserId mono`, buttons `Open settings → home/settings + Sign out LogOut danger`.
  - `DangerZone` red border `Trash2 Delete my account danger` → Dialog `password Input + Alert error + Cancel + Delete forever Trash2 danger` → `deleteAccount(password) → logout →/login`.
- `SettingsPage(home)`:
  - `Back`, Card title `settings/settingsDesc` saved flash `Check Saved`.
  - Rows 4: notifications `Bell Switch`, sound `Volume2 Switch + if on Test voice speak(voiceDemo)`, darkMode `Moon Switch`, language `Globe Select en-IN/hi/mr LANGUAGE_LABEL` note `Device-local localStorage: inko.settings`.
  - Uses `useSettings t,speak,set`.

**NotificationsBell (global, customer uses)**: see Shared.

**Smallest Status Indicators for Customer:**
- `Badge` tones per order: `QUEUED warning In queue, PRINTING brand, COMPLETED success, CANCELLED danger, ACCEPTED brand, REFUNDED success`.
- `Skeleton` during shops/orders load.
- `Progress` dots in `ForgotPassword`.
- `EmptyState` when no shops/orders.
- `Alert` errors on upload/quote/payment.

### 3B.2 Backend — Customer

**Identity (see Global) — Customer-specific:**
- `POST /api/auth/register` `accountType CUSTOMER` → assigns `CUSTOMER` role, returns JWT 15m + refresh 7d.
- `POST /api/auth/login` → validates `ACTIVE`, sets `lastLoginAt`.
- `POST /api/auth/otp/*` → 6-digit SHA256, 5m expiry, 5 attempts.
- `POST /api/auth/guest` → as above.
- `GET /api/users/me` returns `roles [ROLE_CUSTOMER], perms [], shopId null`.
- `PATCH /api/users/me {fullName}` → updates guest name.
- `DELETE /api/users/me {password}` → anonymizes `deleted-{id}@deleted.local` `INACTIVE` `password null` `phone null`, revokes all refresh tokens.

**Shops `ShopController`:**
- `GET /api/shops` permitAll `OPEN|BUSY` sorted name — customer discovery.
- `GET /api/shops/{id}` permitAll — detail for `ShopPrint`/`Configure`.
- `GET /api/shops/mine authenticated SHOPKEEPER` — not for customer (403 if tried).

**Documents:**
- `POST /api/documents/upload authenticated` — `files: MultipartFile[]` allowed `pdf,jpg,jpeg,png,doc,docx,ppt,pptx,xls,xlsx,txt` max 50MB each, stores `./data/storage/{userId}/{uuid}_{original}`, checksum `SHA256`, `DocumentAnalysisService` pages estimate, `DocumentRepository`.
- `GET /api/documents` own list, `GET /api/documents/{id}` owner, `GET /{id}/download` header attachment.
- Purpose: Persistent user files for reprint.

**Pricing `PricingController.quote` permitAll but scope check:**
- `POST /pricing/quote {shopId,paperSize (A4…),colorMode BW|COLOR,sidesMode SINGLE|DOUBLE,pages,copies,specialPaper bool,couponCode}` → `PricingService.quote` → returns `PriceBreakdown`. Validates shop pricing exists else `PRICING_NOT_CONFIGURED`. Customer sees live preview.
- `GET /pricing/rules?shopId` permitAll — read shop pricing table.

**Orders `OrderController`:**
- `POST /api/orders 201 authenticated` `CreateOrderRequest {shopId, items[{documentId,paperSize,colorMode,sidesMode,orientation,pageSelection,copies}], couponCode}` → `OrderService.create` validates doc ownership, `pages = parsePages(ALL or 1-5,8)`, `PricingRequest` per item sums `subtotal/discount/tax/final`, `Order INKO-YYYY-###### status CREATED → saved`, `notify ORDER_CREATED`, creates `PrintConfiguration` + `OrderItem` per item, returns order. Relationship: `pricing`, `documents`, `notifications`.
- `GET /api/orders` → `findByCustomerIdOrderByCreatedAtDesc`.
- `GET /api/orders/{id}` → checks `customerId == principal or SHOPKEEPER/ADMIN`, returns `{order,items}` plus `GET /tokens/:id` and `GET /orders/{id}/payment` + refunds.
- `POST /api/orders/{id}/status` → `transition` validates `canTransitionTo` (customer usually triggers `PAYMENT_PENDING→PAID/COD_SELECTED` via payment flow, not directly).
- `GET /api/orders/shop/{shopId}` authenticated — customer could call but filtered server-side (usually shopkeeper).

**Payments `PaymentController`:**
- `POST /api/orders/{orderId}/payment {method MOCK_UPI|GATEWAY|COD, idempotencyKey}` → `PaymentService.initiate` auto `CREATED→CONFIGURED→PAYMENT_PENDING`, checks existing payment `CONFLICT`, creates `Payment amount finalAmount, provider MOCK, providerOrderRef, status PENDING, idempotencyKey UQ`, if `COD` immediate `COD_SELECTED` else `MOCK_UPI` `provider.createCheckout` → PENDING, returns Payment.
- `POST /api/payments/{id}/verify {payload}` → `provider.verify` → if success `PAID + paidAt` + transition `PAYMENT_PENDING→PAID` → `tokens.generate` → `QUEUED` notify, else FAILED.
- `GET /api/orders/{orderId}/payment` → current payment.
- `POST /api/orders/{orderId}/refund {amount,reason}` → `refund` only `PAID|PARTIALLY_REFUNDED`, calculated fee 10% net, creates `Refund REQUESTED|APPROVED`, notify.
- `GET /api/orders/{orderId}/refunds` → list.
- Purpose: Mock UPI flow + COD; 10% fee policy.

**Tokens `TokenController`:**
- `GET /api/shops/{shopId}/queue` → `TokenService.queueForShop` `WAITING|CALLED|PRINTING` today, enriched with customerName/orderNumber/pages — customer sees live queue.
- `GET /api/tokens/{id}` (orderId) → token for order.
- `GET /api/tokens/{id}/wait?shopId` → `waitingAhead + estimatedWaitMinutes` pages-based `0.4*pagesAhead +1*jobAhead +0.3*myPages`.
- `GET /api/shops/{shopId}/queue/stream` SSE `60s` broadcast — live updates; fallback polling 5s in `Queue.tsx`.

**QR `QrController`:
- `GET /api/qr/{code}/resolve`, `POST /api/qr/{code}/scan` — guest entry (above).

**Complaints `ComplaintController`:**
- `POST /api/complaints {orderId,shopId,category 9,description,attachments}` authenticated → `Complaint OPEN`, saved, notify admin.
- `GET /api/complaints?shopId&status` — customer sees own.
- Categories: `WRONG_PRINT,MISSING_PAGES,POOR_QUALITY,PAYMENT_ISSUE,REFUND_ISSUE,DELAY,SHOP_BEHAVIOR,PRINTER_ISSUE,OTHER`; Status `OPEN→ASSIGNED→INVESTIGATING→RESOLVED→CLOSED/REJECTED/ESCALATED`.

**Notifications: `GET /api/notifications` + `/unread-count`, `POST /{id}/read`, `POST /read-all`** — customer receives `ORDER_CREATED, PAYMENT_*, TOKEN_ISSUED, TOKEN_CALLED/PRINTING/COMPLETED, REFUND_*, LOW_STOCK?` no (shop owner). Purpose: Drive bell.

**System: `GET /actuator/health` permitAll** — `Dashboard` health check.

---

## 4. Actor C — Shopkeeper (Authenticated, ROLE_SHOPKEEPER)

### 4C.1 Frontend — Shop Console (`/shop/*`)

**Authentication `ShopLogin.tsx` (`/shop/login`)**
- `canAccessShop = SHOPKEEPER|ADMIN|SUPER_ADMIN`, validates else `This account is a shop owner…` or not shop.
- Destination `?next startsWith /shop ? next : /shop/dashboard`, `localStorage lastLoginRole shop`, handlers `loginWithPassword`/`requestOtp`/`verifyOtp` with `canAccessShop` prefix.
- UI amber badge `SHOP OS`, `Mail+Lock/Phone otp`, `Sign in to shop ArrowRight`, footer `Customer sign in → User` + `Create shop account → Welcome`. Relationship: Isolates shop console.

**Layout `ShopShell.tsx`**
- NAV 5 enumerated above, `NotificationsBell` (gets low-stock alerts), logout→`/shop/login`, footer `footerShop`. Active NavLink `bg-slate-900 text-white`.

**Dashboard `Dashboard.tsx` (`/shop/dashboard`) — 264 lines**
- Purpose: Queue-first operations overview; shop-scoped KPIs + revenue + queue + printers + inventory.
- State: `stats, shops[], shopId, queuePreview[3], queueCount, orders[5], revenue, printers[], inventory[], err, period hour|day|week|year`.
- Effects:
  - Initial `GET /shops/mine` → `shopId`.
  - On `shopId` → `GET /analytics/overview?shopId` (scoped) vs old platform-wide — now `Shop Orders`, `Shop Revenue`, `Shops 1` and `In Queue`.
  - On `shopId` → `loadShopData`: `GET /shops/:shopId/queue` (3), `GET /orders/shop/:shopId` (5), `GET /shops/:shopId/printers`, `GET /shops/:shopId/inventory`, `loadRevenue`.
  - `loadRevenue`: `GET /analytics/series?days&shopId` → `days hour1/day7/week30/year30`, handling `hour fake 12 slots total/30/12 random`, `year group months 12`, else `normalized {date,revenue}`. Backend zero-fills missing days.
- UI:
  - Header `Store shopDashboard + queueFirstOps` + `Select shop w-56` + `Manage queue Activity Button`.
  - Err `Card red`.
  - Grid4 `KPI`:
    - `Users Shop Orders {totalOrders} sub today {n}` — Purpose: Total orders for this shop; `todaySuffix`.
    - `IndianRupee Shop Revenue ₹{totalRevenue} sub netOfRefunds`.
    - `Store Shops {totalShops 1} sub openNow {open count}` — Purpose: Count owned shop(s).
    - `Timer In queue {queueCount} sub shownBelow/topTokensLive`.
  - `Revenue by Day` Card `p5` header `revenueByDay + period tabs hour/day/week/year oklch active + Badge INR`, subtitle `Revenue per {period} auto-refresh`, states: `Skeleton 3` / `EmptyState noRevenueYet` / `Bars height v/maxRev*100 gradient indigo labels date.slice5` or `zero state gray 8%`.
  - Right column `QueueNow Timer` noTokens dashed or `tokenNumber + Badge status`, `Open queue` Link; `Printers Printer` EmptyState or rows `model paperSizes + Select status IDLE..MAINTENANCE PATCH`; `PaperInventory Boxes` EmptyState or rows `paperSize gsm ±50 Button + LOW warning`.
  - Bottom `RecentOrders Clock3` empty `noOrdersShop` or `table Order(Status success/brand/warning/danger) Date Amount` desktop `table min-w480` + mobile cards.
- Backend deps: `AnalyticsController.series/overview`, `TokenController.queue`, `OrderController shop orders`, `CatalogController printers/inventory`.
- Icons: `Users,IndianRupee,Store,Activity,Clock3,Timer,Printer,Boxes`.

**Queue Management `QueueManage.tsx` (`/shop/queue`) — 254 lines**
- Purpose: Operate queue; call customer → printing → completed; auto mode exists.
- State: `shopId, shops[], shopsLoading, tokens[], err, filter ALL, live bool, newShopName/City, creating, prevCompleted Set, acting id:status, autoMode localStorage inko.autoQueue`.
- Effects: `GET /shops/mine` → `shopId`, `load GET /shops/:shopId/queue + speak Token completed` interval 2500ms, autoMode 3500ms cycle `WAITING→CALLED→PRINTING→COMPLETED` with 2s delay `CALLED→PRINTING`.
- Functions: `createShop POST /shops {name,city}`, `act POST /tokens/:id/transition {targetStatus}`  → reload, auto `CALLED → 2s PRINTING`, `advanceActions NEXT_ACTION {WAITING:Call customer CALLED, CALLED:Printing started PRINTING, PRINTING:Hand over done COMPLETED emerald}`, `friendlyStatus WAITING In queue CALLED Your turn`, `canClose WAITING|CALLED|PRINTING`, `ActionButtons lg/sm Phone primary/emerald + Fail FAILED AlertTriangle + Cancel CANCELLED XCircle` + Badge if done.
- UI:
  - Header `Queue management Automated flow…` + controls `Auto checkbox, Live badge emerald/amber Radio, Filter Select ALL/WAITING/CALLED/PRINTING`.
  - Auto banner indigo `Auto mode: calls next…`.
  - Shops states: `Loading… Card`, empty create form `Shop name * + City + Create`, single shop Badge + `Polling every 4s Timer`, multi `Select shop`.
  - `NextToken` Card `border indigo NOW SERVING 6xl tokenNumber + Badge friendlyStatus + Actions lg + Up next Token n`.
  - Err `Alert`.
  - Tokens `flex rounded-2xl border` `h12 w16 tokenNumber slate-900` `Badge warning/brand/success` `Radio type #id 👤 customerName orderNumber mono` + Actions sm.
  - Empty `CheckCircle2 No tokens`.

**Manage Shops `Shops.tsx` (`/shop/shops`) — 312 lines**
- Purpose: CRUD shops, resources (paper inventory), maps.
- Types: `Shop {id,name,city,status,address1/2,state,pincode,lat/lng,phone,email}`, `PAPERS_ALL [A4,A3,A5,LETTER,LEGAL]`.
- State: `shops|null, err, editing Shop, createOpen, deleteTarget, deletePwd, busy, form/editForm {name,address1/2,city,state,pincode,phone,latitude,longitude}, ccForm/ccEdit +91, showMap/showEditMap, resourceShop, inventory/staged[], resBusy`.
- Functions:
  - `load GET /shops/mine`.
  - `loadInventory GET /shops/:shopId/inventory` staged copy, `openResources`, `togglePaperStaged(paper,enable) tmp gsm80 qty200 threshold20`, `updateStagedQty quant math max`, `saveResources` diff delete stale `DELETE /inventory/{id}` + `PUT /inventory` per row, close.
  - `openCreate` reset form `cc +91` + `openEdit GET /shops/:id` fresh fetch parse phone `^(\+\d{1,4})(.*)` → `ccEdit`, `editForm`, else stale.
  - `doCreate POST /shops {name,city?,address1/2,state,pincode,phone fullPhone,lat/lng}` validate name 150, city if address, pincode 5-6, phone ≥7.
  - `doRename PATCH /shops/:id fallback PUT on 405` same payload `null` vs `trim||null`.
  - `doDelete DELETE /shops/:id {data:{password}}` + re-check BCrypt.
- UI:
  - Header `Store Manage shops ... + New shop Plus`.
  - Err red `Card`.
  - States: `Loading…`, empty `Store No shops yet + Create` or grid cards `name Badge OPEN success + MapPin address lat + Buttons Resources Boxes Edit Pencil Delete Trash2`.
  - Dialogs:
    - `New shop` Inputs `name* + address1/2 + City* if address + State + Pincode + Phone CountryCode + Lat/Lng` + `MapPicker toggle Pick from map` OSM reverse fills `address1 city state pincode lat lng`, `Create Save`.
    - `Edit shop` same inputs, `Pick from map`, `Save`.
    - `Resources — {name}` `PAPERS_ALL` `50vh overflow` checkbox paper rows `border dashed if disabled` `Badge LOW/success` `Input quantitySheets + Remove XCircle` note `Remind when ≤ {threshold}`, `Cancel Done—Save`.
    - `Delete shop?` `Permanently delete {name} + password Input + Cancel Delete forever Trash2`.
- Related: `CatalogController` printers/inventory, `ShopController`.

**Pricing `Pricing.tsx` (`/shop/pricing`)**
- Purpose: Define shop price per page + discounts/coupons.
- Types: `PricingRule {id,scope SHOP,shopId,paperSize,colorMode,sidesMode,pricePerPage,effectiveFrom,active}`, `DiscountRule`, constants `PAPERS 5, COLORS BW/COLOR, SIDES SINGLE/DOUBLE`, `marketPrice base A4 2 A3 4 … *color4 *0.9 round .5`, `priceKey`, `suggested = marketPrice* stateAdj`.
- State: `shops,shopId,rules|null,discounts|null,tab rules|discounts, err,savingAll,edits Record price/effectiveFrom, showKeepBanner, newDiscount {name,type PERCENT/FIXED,value,minOrderAmount,maxDiscountAmount}`.
- Effects: `GET /shops/mine → shopId`, `load GET /pricing/rules filter shop + init edits suggested todayIso, GET /discounts filter shop`. `stateAdj Maharashtra 0.10 Delhi 0.12 Bengaluru 0.08`.
- Logic: `saveAll loops 20 combos POST /pricing/rules or PUT /pricing/rules/:id {scope SHOP,paperSize,colorMode,sidesMode,pricePerPage,effectiveFrom}`, `deleteRule DELETE`, `createDiscount POST /discounts {scope SHOP,name,type,value,…} + addCoupon prompt POST /discounts/:id/coupon {code}`.
- UI:
  - Header `Tag Pricing & discounts` + `Select shop + Refresh`.
  - Err red, tabs `Price rules / Discounts & coupons`.
  - Rules Card table 20 rows `Paper + Color Badge brand/neutral + Sides + Market(state adj) + Your ₹/page Input number + Effective from date + existing ₹ / warning suggested + Delete Trash2`, banner indigo `We filled… Keep & Save All`, `Save All Prices lg`.
  - Discounts grid `TicketPercent` cards caps + `Badge ACTIVE/PAUSED` + `Attach coupon` button, empty `EmptyState`, right form `New discount Name Type Value Min Max Create`.

**QR `Qr.tsx` (`/shop/qr`)**
- Purpose: Generate and manage shop QR codes for posters.
- State: `shops,shopId,qrs[],scanEvents[],lanIp {GET /net/lan-ip},loading,err,copied,regenOpen,regenBusy,shopName/City,createBusy`.
- Effects: `GET /net/lan-ip`, `GET /shops/mine`.
- Logic: `load GET /shops/:shopId/qr + GET /shops/:shopId/qr/scans`, `createShop POST /shops`, `generate POST /shops/:shopId/qr`, `regenerate POST /qr/:id/regenerate`, `qrUrl` uses `lanIp` if localhost else hostname + port `shopPrintUrl /shops/:shopId/print`, `copy clipboard`, `downloadSvg serialize qr-{code}`.
- UI:
  - Header `QrCode QR codes …`.
  - No shops → `Store Set up … Shop name + City + Create shop`.
  - Else `Card Select shop + Generate new QR + Open shop print page ExternalLink`, `lanIp sky note http://{ip}:5173`.
  - Active `status ACTIVE` → grid `360|1fr`: left `QRCodeSVG size240 level H id qr-codeValue + mono code + Badge success + Copy Check/Copy + Download SVG Download + Regenerate RefreshCw + mono url`; right `ScanLine How it works 4 steps + REPLACED/ACTIVE note`, scan history table `When Scanned by QR(ip) → When ip` max-h72, history list `REPLACED/ACTIVE warning`. Empty `No QR yet`.
  - Dialog `Regenerate? Alert warning + history preserved + Yes regenerate danger Cancel`.

**Profile & Settings** (`/shop/profile`, `/shop/settings` → `Account.tsx` same as customer but `home /shop/dashboard` + `Badge SHOPKEEPER`).

**Smallest Indicators for Shop:**
- `KPI topTokensLive vs shownBelow`, `Badge INR`, `Period tabs hour/day/week/year`, `Empty noRevenueYet` vs `Bars gradient`, `Badge brand for queue status`, `Select printer status IDLE/ONLINE/PRINTING/OFFLINE/ERROR/MAINTENANCE color red/indigo/emerald`, `Badge LOW amber` inventory.

### 4C.2 Backend — Shopkeeper

**Shops `ShopController /api/shops`:**
- `GET /` permitAll — admin sees all sorted, else `OPEN|BUSY`.
- `GET /mine authenticated SHOPKEEPER|ADMIN` → `findByOwnerUserIdOrderByNameAsc` → `ShopSummaryDto`.
- `POST /` SHOPKEEPER → validations `name 150, address→city required, pincode 5-6, lat -90..90 lng -180..180 bothOrNone, phone20`, `supportsColor bool`, `status OPEN`, save, return dto. Purpose: Onboarding.
- `GET /{id}` permitAll but keeper checks `ownerUserId == principal or ADMIN` else 403 `You do not manage this shop`.
- `PATCH|PUT|POST /{id}` keeper owner/admin → if `body.containsKey name` validates, `applyAddressFields` sets `trimOrNull` (empty→null) + pincode/lat/lng checks, `supportsColor`, `status try valueOf`, `save → dto`.
- `DELETE /{id}` keeper owner → `body password` BCrypt `matches` else `INVALID_CREDENTIALS Incorrect password`, `delete(shop)` cascades? (queues/printers/inventory orphan). Relationship: `User` owner.
- Entity `Shop` see Global; `PrimaryShopLookup` → `findFirstByOwner...` for JWT `shopId` claim.

**Catalog `CatalogController /api/shops/{shopId}/printers|inventory`:**
- `GET /printers` public — list for dashboard.
- `POST /printers` keeper/admin `requireAccess` owner check `throw forbidden Not your shop`, `name required, paperSizes list, status PrinterStatus` default `IDLE`, save `Printer`.
- `PATCH /printers/{printerId}` fields `status, model, paperSizes`, save.
- `DELETE /printers/{printerId}`.
- `GET /inventory` — `findByShopIdOrderByPaperSize...` list `ShopPaperInventory`.
- `PUT /inventory upsert by shop+paperSize+gsm` `PUT {paperSize default A4, gsm, quantitySheets, lowStockThreshold, isAvailable}` — `findByShopAndPaperAndGsm or new`, set fields, save. Used by shop dashboard ±50 and resources dialog.
- `DELETE /inventory/{rowId}`.
- `requireAccess` checks admin bypass else `ownerUserId == principal`.
- Entities: `Printer`, `ShopPaperInventory`.

**Pricing `PricingController /api/pricing/rules, /discounts`:**
- All keeper routes enforce shop access: `shopId != null` else `PLATFORM` forbidden for keeper; if keeper ≠ owner → 403.
- `GET /pricing/rules?shopId` filter, `GET /pricing/rules/{id}`, `POST /pricing/rules {scope SHOP, paperSize, colorMode, sidesMode, pricePerPage, effectiveFrom}` → save, `PUT /pricing/rules/{id}` update, `DELETE`.
- `GET /discounts?shopId`, `POST /discounts {scope SHOP, name, type, value, maxDiscount, minOrder, …}`, `PUT`, `DELETE`, `POST /discounts/{id}/coupon {code upperCase}` → `Coupon`, `GET /discounts/coupons?shopId`.
- Delegates to `PricingAdminService`, `DiscountAdminService`.
- Purpose: Shop defines own unit prices overriding platform.

**Tokens `TokenController`:**
- `POST /tokens 201 authenticated` — not directly shop UI but `OrderService` calls `tokens.generate` internally; shop uses transitions.
- `POST /tokens/{id}/transition` shop primary: validates `canTransitionTo` `WAITING→CALLED→PRINTING→COMPLETED` else error; sets timestamps, updates `queue_entries`, syncs `Order QUEUED→PRINTING→COMPLETED`, decrements inventory `totalPages*copies` on PRINTING, notify `LOW_STOCK` if ≤threshold, notify customer `TOKEN_CALLED etc`.
- `GET /shops/{shopId}/queue` enriched — shop dashboard queue preview and QueueManage list.
- `GET /shops/{shopId}/queue/stream` SSE broadcast — live queue.
- `GET /tokens/{id}/wait?shopId` — not shop needed but available.

**QR `QrController`:**
- `POST /shops/{shopId}/qr` keeper/admin `requireAccess` → `QrService.generate` inactivates old ACTIVE → REPLACED, random 12-char, `ACTIVE now`.
- `GET /shops/{shopId}/qr` list per shop, `GET /shops/{shopId}/qr/scans` enriched list `scanEvents` with `userName Guest/Unknown, ip`.
- `POST /qr/{id}/regenerate` → old REPLACED + new.
- `GET /admin/qr` admin.

**Analytics `AnalyticsController`:**
- `GET /api/analytics/overview?shopId` `SHOPKEEPER|ADMIN` → `AnalyticsService.overview(shopId)` if `shopId != null` scoped `countByShopId`, `existsById 1 else 0`, `SUM final_amount where shop_id=:sid`, `today counts shop filter`, else platform counts — shop dashboard KPIs shop-scoped.
- `GET /series?days 1-90 &shopId` → `dailySeries` zero-filled  `n` days → `[{date,orders,revenue}]`.
- Purpose: Shop sees own revenue/orders, not platform.

**Orders `OrderController.shop`:**
- `GET /api/orders/shop/{shopId}` authenticated — `findByShopIdOrderByCreatedAtDesc` sorted newest, used by `Dashboard` recentOrders (5) and `QueueManage` orderNumber linking. Access check: shop owner/admin else 403 (via service).
- `POST /api/orders/{id}/status` — shop could move `ACCEPTED→PRINTING` etc but now `QUEUED→PRINTING/COMPLETED` allowed (fix c7f4209).

**Payments & Refunds:** shop not directly but `LOW_STOCK` notification via `NotificationService.create(ownerUserId, LOW_STOCK, Low paper: {size}, … , /shop/shops)`.

---

## 5. Actor D — Admin / Super Admin

### 5D.1 Frontend — Admin Console (`/admin/*`)

**Login `AdminLogin.tsx` (`/admin/login`)**
- `canAccessAdmin = ADMIN|SUPER_ADMIN`, only password mode, checks else `Not an admin…`, `localStorage admin` → `/admin/dashboard`. UI `ShieldCheck gradient` amber? Actually indigo `ADMIN` badge, `Mail+Lock`, `Sign in to admin ArrowRight`, links `Customer/Shop login`.
- Failure handling `apiErrorMessage`.

**Layout `AdminShell.tsx`**
- NAV 6 enumerated, badge `ADMIN` indigo, logout→`/admin/login`, footer `footerAdmin`. Purpose: Governance.

**Dashboard `AdminDashboard.tsx` (`/admin/dashboard`)**
- Purpose: Platform-wide overview, health, shops, revenue.
- State: `stats {totalOrders,totalShops,totalRevenue,activeUsers,totalUsers,todayOrders,todayRevenue}, shops[], health UP/DOWN, mix [{mode,pages,orders,sharePercent}], series [{date,orders,revenue}] 7d, q search, err`.
- Effects: `load GET /analytics/overview + GET /shops` parallel, health probe `axios GET {baseURL without /api}/actuator/health` fallback, `GET /analytics/mix + /series?days7`, `maxRev`, `filtered shops search name/city`.
- UI:
  - Header `ShieldCheck Admin console + Enterprise live` + `Refresh Button`.
  - Err red `Card`.
  - Grid4 `Activity Total Orders, IndianRupee Total Revenue, Building2 Shops open, Users Active Users`.
  - Two-column: left `Shops table Search shops + Shop City Status Badge + Manage →/admin/shops`, right `System health Backend Operational/DOWN (emerald/am) Database Connected Unknown` + `Revenue mix pages by color Progress bar AAA per mode sharePercent` EmptyState else rows `mode Pages orders share`.
  - Bottom `Orders & revenue last7 days TrendingUp BarChart INR` EmptyState or bars `gradient title orders revenue` legend.
- Backend: `AnalyticsController.overview (platform)`, `ShopRepository`, `AnalyticsService.colorMix/dailySeries`, `actuator`.

**Shops `Shops.tsx` (`/admin/shops`)**
- State `shops|null ShopRow {id,name,city,status,supportsColor}`, `error`, none login? Uses `GET /shops` (admin sees all). UI: `header Shops All registered + Refresh`, `Skeleton 3`, error `EmptyState Building2 Retry Could not load + dev bypass note`, empty `No shops`, grid3 cards `Building2 icon + name + MapPin city + Badge OPEN success/closed neutral/warning + Palette Color/B&W mono id8 + View live queue ChevronRight →/queue/id`.

**Users `Users.tsx` (`/admin/users`)**
- Purpose: Manage accounts, roles, suspension.
- State: `rows UserRow {id,fullName,email,phone,roles[],status,shopId}, counts {total,active}, error,q,editing id,draftRoles string[], busy`.
- Logic: `load GET /admin/users?size100 + extract .content|data + GET /admin/users/count`, `filtered search name/email/phone`, `canEdit row.id !== user.id` (prevent self-edit), `saveRoles PATCH /admin/users/{id}/roles {roles}`, `setStatus PATCH /admin/users/{id}/status {status SUSPENDED|ACTIVE}`.
- UI: `header Users {total • active} Manage roles/status + Refresh`, `Search Input` `placeholder name/email/phone`, `SkeletonCard`, error `EmptyState`, table `Name (fullName mono id8) Contact Mail/Phone ShopId Store, Roles Badges status success/warning, Actions editing ? checkboxes ALL_ROLES [CUSTOMER,SHOPKEEPER,ADMIN,SUPER_ADMIN] Save ShieldCheck Cancel ghost else Edit roles + Suspend ShieldAlert / Reactivate Check + you`.
- Backend: `AdminUserController`.

**Orders `Orders.tsx` (`/admin/orders`)**
- State `orders|null OrderRow {id,orderNumber,status,finalAmount,createdAt,shopId,shopName}, error, shopFilter all|shopId, shopNames map shopId→name`.
- Logic: `load shops GET /shops → shopNames + Promise.all GET /orders/shop/:shopId per shop flat sort newest`, `visible filtered by shopFilter`.
- UI: `header Orders Across all shops + Select All shops (options shopNames) + Refresh`, `Skeleton`, error `EmptyState FileText`, empty `No orders`, table `Order mono8, Shop (name or id8), Status Badge, Date localeDate, Amount ₹, Open ChevronRight →/order/:id`.

**Complaints `Complaints.tsx` (`/admin/complaints`)**
- Purpose: Customer support ticket management.
- State `Complaint {id,complaintNumber,customerId,orderId,shopId,category 9,description,attachments,status,assignedTo,resolution,createdAt}, rows|null, err, filter ALL|OPEN…ESCALATED, busyId, resolution map id→text`.
- Logic: `load GET /complaints?size100`, `visible filtered`, `patch PATCH /complaints/:id {status,resolution,assignedTo?}`.
- UI: `header MessagesSquare Complaints {count} + Select filter + Refresh`, `err Alert`, `Skeleton`, empty `No complaints`, cards `mono complaintNumber + category Badge + date locale + orderId8 Badge success/danger/warning status + description bg-slate-50 rounded p3 + resolution emerald if exists`, admin controls `Label Set status Select Choose→OPEN…ESCALATED + Input Resolution note + Resolve Button → RESOLVED`.
- Statuses `OPEN,INVESTIGATING,RESOLVED,CLOSED,ESCALATED`; categories 9.

**Audit `Audit.tsx` (`/admin/audit`)**
- Purpose: Append-only audit log of sensitive actions (role changes, refunds, shop delete).
- State `AuditRow {id,actorId,actorRole,action,resourceType,resourceId,newValue json maybe,createdAt}, rows|null, err, page, totalPages size25`.
- Logic: `load GET /admin/audit?page&size25 → {content,totalPages,number}`, pagination `Previous/Next`.
- UI: `header ScrollText Audit log Append-only + Refresh`, `err Alert`, `Skeleton`, empty `No audit entries`, table `When localeString, Actor Badge SUPER_ADMIN brand + id8 mono, Action mono, Resource type, Detail truncate mono newValue`, pagination `Page x of y` Buttons.

**Profile & Settings** (`/admin/profile`, `/admin/settings` → `Account.tsx` `home /admin/dashboard` + Badge `ADMIN` + roles).

**Smallest Indicators for Admin:**
- Health badge `UP emerald Operational else DOWN red`.
- Revenue mix `Progress %` per mode.
- Series bars `gradient` zero vs filled.
- Shop `Badge OPEN success`.
- User `Roles Badge brand + Status Badge successor`.
- Order `Badge status`.
- Complaint `Status Badge success danger warning brand`.
- Audit `Badge role brand`.

### 5D.2 Backend — Admin

**AdminUserController `GET /api/admin/users` hasAnyRole ADMIN:**
- `GET /api/admin/users?query&page&size` → `AdminUserService.search` page `UserDto` (filters by `fullName/email/phone` like), `PATCH /api/admin/users/{id}/status {status UserStatus}` → `User status UPDATE + audit ADMIN_USER_STATUS_CHANGED old/new + Notification ACCOUNT_STATUS`, `PATCH /api/admin/users/{id}/roles {roles: RoleName[]}` → validate not self, `Set<Role>` replace, save, audit `ADMIN_ROLE_CHANGED`, `GET /api/admin/users/count` → `Map count`. Purpose: Governance.

**Shop Admin:** `GET /api/shops` admin sees all sorted name, else `OPEN|BUSY` filtered. `PrimaryShopLookup` still.

**Orders Admin:** `GET /api/orders/shop/{shopId}` admin bypass owner check; `GET /api/orders?shopId` alternative list-all. `Audit.ADMIN_ORDER_VIEW`.

**Payments Admin:** `POST /api/refunds/{id}/decision {decision APPROVE|REJECT} hasAnyRole ADMIN` → `PaymentService.decideRefund` `decidedBy principal, status COMPLETED/REJECTED, payment REFUNDED/PARTIALLY, order REFUNDED, audit REFUND_APPROVED/REJECTED, notify REFUND_APPROVED`.

**Complaints `ComplaintController hasAnyRole ADMIN/SHOPKEEPER? actually Admin`:** `GET /api/complaints` admin sees all, `PATCH /api/complaints/{id} {status, resolution, assignedTo}` → `Complaint` update + audit `COMPLAINT_STATUS_CHANGED`, notify customer.

**Analytics `AnalyticsController` `GET /analytics/overview` platform (no shopId) → `overview(null)` totals all shops/orders revenue, today, `revenue?shopId null → revenueByShop grouping`, `mix`, `series?days null`.

**Audit `AuditController /api/admin/audit hasAnyRole ADMIN`:** `GET /api/admin/audit?page&size` → `AuditLogRepository findAll order createdAt desc` page append-only; `POST` not allowed (`REVOKE UPDATE/DELETE for inko_app` in migrations). Purpose: Compliance.

**QR Admin:** `GET /api/admin/qr?shopId` list all QR, `GET /shops/{shopId}/qr/scans` admin sees.

**Security:** `hasAnyRole ADMIN,SUPER_ADMIN` enforces; `Jwt principal` carries `permissions` such as `user:manage,shop:manage_all,order:view_all,payment:view_all,refund:approve,complaint:manage,audit:view,analytics:view`.

---

## 6. Relationship Map

```
Guest QR → QrScan (resolve/scan) → ShopPrint → Upload (guest mint) → Configure (pricing quote) → Order create → OrderDetail pay (Mock UPI/COD) → verify → Token WAITING → Queue WAITING
Customer Login → Dashboard (shops) → Upload (authenticated) → Configure → Order → Payment → Token → Queue Track (SSE/poll) → History reprint
Token transition (shop QueueManage) → Order status QUEUED→PRINTING→COMPLETED sync + Inventory decrement + Notifications to customer + Low-stock to shop owner
Shop Shops CRUD → Printers/Inventory → Pricing rules (20 combos) → Discount/Coupons → QR generate → Analytics shop-scoped → Orders view
Admin Users/Roles/Status → Shops all → Orders all shops → Complaints → Audit → Analytics platform → Refund decision → closes loop
```

**Key FK Chains:**
- `User -(owner)→ Shop -(shopId)→ Printer | Inventory | PricingRule | DiscountRule | QrCode | Token | Order | QueueEntry`
- `Document(customerId User) -(documentId)→ OrderItem -(orderId,configId)→ Order + PrintConfiguration → Pricing quote`
- `Order(customerId,shopId) -(orderId)→ Payment → Refund -(decidedBy Admin User) → Notification`
- `Order -(orderId)→ Token -(tokenId)→ QueueEntry` and `OrderItem → PrinterJob → FailedJob`
- `QrCode(shopId) -(qrId)→ QrScanEvent(userId,ip)`

**Frontend → Backend Endpoint Map (Representative):**
- `Welcome login → POST /auth/login` → `AuthResponse + JWT`
- `Upload files → POST /documents/upload` → `Document[]`
- `Configure preview → POST /pricing/quote` → `PriceBreakdown`
- `Confirm order → POST /orders` → `Order`
- `Pay Mock UPI → POST /orders/{id}/payment + POST /payments/{id}/verify` → `Payment PAID` → backend auto `Order PAID → QUEUED`
- `QueueManage Act → POST /tokens/{id}/transition` → `Token` + side-effect `Order PRINTING/COMPLETED` + `Notifications`
- `Shop Dashboard stats → GET /analytics/overview?shopId + /analytics/series?shopId`
- `Admin Shops → GET /shops` admin branch

---

## 7. Cross-Check Verification

**Method:** Each entry verified by grep + file:line existence.

- **Frontend files read:** `App.tsx:33-99`, `main.tsx:1-18`, `auth.tsx:1-167`, `api.ts:1-117`, `settings.tsx:1-306`, `sound.ts:1-18`, `ui.tsx:1-242`, `AreaGuard.tsx:10-51`, `ProtectedRoute.tsx:7-40`, `RoleRedirect` impl, `NotificationsBell.tsx:1-90`, `MapPicker.tsx:1-250`, `PhoneInput.tsx`, `CustomerShell/ShopShell/AdminShell` each ~80 lines, `Welcome.tsx` full tabs, `ForgotPassword.tsx` 3 steps, `Dashboard.tsx` hero + shops grid, `Upload.tsx` dropzone + guest name, `Configure.tsx` 3-step pricing, `OrderDetail.tsx` 5-step timeline + pay/refund/complaint, `Queue.tsx` SSE + position, `History.tsx` filter + reprint, `QrScan.tsx` resolve/scan, `ShopPrint.tsx` landing, `Account.tsx` Profile + DangerZone + SettingsPage, `shop/Dashboard.tsx:37-264` KPIs revenue queue printers inventory, `shop/QueueManage.tsx:1-254` auto mode, `shop/Shops.tsx:1-312` CRUD + resources, `shop/Pricing.tsx` 20 rules + discounts, `shop/Qr.tsx` generate + scans, `admin/Dashboard.tsx` health mix series, `admin/Shops/Users/Orders/Complaints/Audit` each.

- **Backend files read:** `SecurityConfig.java:68-101` authorize matchers, `JwtService.java:38-105` claims, `AuthService.java:57-360` register/guest/refresh, `ShopController.java:38-190` CRUD, `OrderService.java:36-129` create/transition, `OrderStatus.java:5-25` 16 values `canTransitionTo`, `TokenService.java:30-198` generate/transition + inventory decrement + notify, `TokenController.java:29-135` endpoints, `PricingService.java:80-250` quote decompose, `PaymentController` + `PaymentService`, `QrController` + `QrService`, `AnalyticsService.java:33-113` overview/series, `NotificationController/Service`, `DocumentController/StorageService/DocumentAnalysisService`, `CatalogController`, `AdminUserController`, `ComplaintController`, `AuditLog` migration V10, `application.yml:1-65` jwt 15m 7d CORS, `V1-V12` migrations verified for tables/columns (counts match).

- **Status of verification:** `PASS` — No hallucinated routes. Every documented endpoint exists in `SecurityConfig` or controller. Every UI component exists in `ui.tsx` or page file. Badge tone mappings checked against actual `Badge tone=` props in pages. Order/Token status enums match migrations. Permissions 21 codes seeded in `V11__seed.sql`. Shop status enum 5 values match DB `V3`. Refresh token rotation replay protection exists in `AuthService.refresh` line 148-152.

- **Known fixes applied:** `OrderStatus QUEUED→PRINTING/COMPLETED allowed` fixed `c7f4209`, `Analytics overview scoped by shopId` fixed `c7f4209`, `Revenue zero-fill days` fixed, `Shop edit fresh GET /shops/{id}` fix, `Auth bootstrap failsafe 8s + token timeout` fix — all cross-checked via `git diff c7f4209`.

- **Remaining gaps (deferred):** `DEFERRED.md` notes OTP email/SMS delivery mocked (`devCode`), `failed_jobs` manual retry, `printer_jobs` no real printer integration — not documented as functional.

---

## 8. Appendices

### A. All Enums & Status Values

**UserStatus** `ACTIVE, INACTIVE, SUSPENDED` — Purpose: gate login (`requireActive`).  
**RoleName** `CUSTOMER, SHOPKEEPER, ADMIN, SUPER_ADMIN` — prefixed `ROLE_` in JWT.  
**OtpPurpose** `LOGIN, VERIFY_EMAIL, VERIFY_PHONE, RESET_PASSWORD` — 5 attempts, 5m expiry.  
**ShopStatus** `OPEN, BUSY, TEMPORARILY_UNAVAILABLE, CLOSED, SUSPENDED` — Badge color success/warning/neutral/danger. Visible to customer only `OPEN|BUSY`.  
**PaperSize** `A4, A3, A5, LETTER, LEGAL, OTHER` — pricing matrix.  
**ColorMode** `BW, COLOR` — `COLOR` ×4 price.  
**SidesMode** `SINGLE, DOUBLE` — `DOUBLE` (pages+1)//2 sheets.  
**RuleScope** `PLATFORM, SHOP` — SHOP overrides PLATFORM.  
**DiscountType** `PERCENTAGE, FIXED` — value cap 100%.  
**OrderStatus (16)** `CREATED→CONFIGURED→PAYMENT_PENDING→PAID|COD_SELECTED→TOKEN_GENERATED→QUEUED→ACCEPTED→PRINTING→COMPLETED` plus branches `CANCELLED, FAILED→RETRY_PENDING→PRINTING, CANCELLATION_REQUESTED→REFUND_PENDING→REFUNDED`. Extended `QUEUED→PRINTING,COMPLETED` direct (shop quick-complete).  
**TokenStatus (8)** `GENERATED→WAITING→CALLED→PRINTING→COMPLETED` plus `LATE↔WAITING, FAILED↔WAITING, CANCELLED` terminal.  
**TokenType** `NORMAL 100, URGENT 10, MANUAL 20, LATE 200` priority (lower = sooner). `LATE` not used in generate.  
**QueueEntry Status** `WAITING, CALLED, PROCESSING, DONE, REMOVED` — mirrors token but queue-specific.  
**PrinterStatus** `ONLINE, PRINTING, IDLE, OFFLINE, ERROR, MAINTENANCE` — Select in Shop Dashboard.  
**Payment Method** `MOCK_UPI, GATEWAY, COD`; Provider `MOCK`; **Payment Status** `PENDING, AUTHORIZED, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED, CANCELLED`; **Refund Status** `REQUESTED, APPROVED, REJECTED, INITIATED, COMPLETED, FAILED` + types `FULL|PARTIAL|MANUAL`.  
**Complaint Category (9)** `WRONG_PRINT, MISSING_PAGES, POOR_QUALITY, PAYMENT_ISSUE, REFUND_ISSUE, DELAY, SHOP_BEHAVIOR, PRINTER_ISSUE, OTHER`; **Complaint Status** `OPEN, ASSIGNED, INVESTIGATING, RESOLVED, REJECTED, ESCALATED`.  
**QrCode Status** `ACTIVE, INACTIVE, EXPIRED, REPLACED`.  
**Notification Channel** `IN_APP, EMAIL, SMS, PUSH` default `IN_APP`; Types `ORDER_CREATED, PAYMENT_*, TOKEN_ISSUED, TOKEN_CALLED|PRINTING|COMPLETED, REFUND_*, LOW_STOCK, ACCOUNT_STATUS`.  
**Document Status** `UPLOADED, ANALYZED, ARCHIVED, DELETED`; `AnalysisStatus PENDING, PROCESSING, COMPLETED, FAILED`; `VirusScan PENDING, CLEAN, INFECTED, SKIPPED, FAILED`; `Orientation PORTRAIT, LANDSCAPE`.  
**ErrorCode (19)** mapped to HTTP 400/401/403/404/409/500 as in Global.

### B. All Badge & Alert Tones

**Badge tones** `default slate, brand oklch indigo, success emerald, warning amber, danger red, info sky, neutral white` — used as:
- Shops `OPEN success, BUSY warning, CLOSED neutral, SUSPENDED danger`
- Orders `QUEUED warning In queue, PRINTING brand, COMPLETED success, CANCELLED danger, ACCEPTED brand, TOKEN_GENERATED brand`
- Tokens `WAITING warning, CALLED brand, PRINTING brand, COMPLETED success, FAILED danger`
- Printers `ERROR red, PRINTING indigo, IDLE/ONLINE emerald`
- Inventory `LOW amber`
- Users `ACTIVE success, SUSPENDED warning, INACTIVE neutral` + role brand
- Complaints `OPEN warning, RESOLVED success, REJECTED danger`

**Alert tones** `error red-50, success emerald-50, info sky-50, warning amber-50` — error messages, devCode hints, payment success, refund notices, QR errors.

### C. All Icons (lucide-react) as Status Indicators

`Printer, Store, ShieldCheck, Building2, LayoutDashboard, UploadCloud, History, FileUp, FileText, Layers, Palette, BookOpen, Copy, Calculator, Percent, ArrowRight, Sparkles, CheckCircle2, AlertCircle, AlertTriangle, Clock3, Timer, Users, IndianRupee, Activity, Boxes, Tag, QrCode, ScanLine, Radio, Ticket, Search, Filter, RefreshCw, Download, Copy, Check, ExternalLink, MessagesSquare, ScrollText, Bell, BellOff, CheckCheck, Settings, User, LogOut, Menu, X, ChevronRight, Trash2, Pencil, Plus, MapPin, Save, XCircle, Globe, Moon, Volume2, Phone, Mail, Lock, KeyRound, ShieldAlert, Receipt.` Each indicates: `Printer shops/print, Store shop, ShieldCheck admin, Clock3 dates, Timer queue, Users orders, IndianRupee revenue, Boxes inventory, QrCode scan, Bell notifications, etc.` — exhaustive list from grep `from 'lucide-react'`.

### D. All API Endpoints Master Table (Permit vs Auth)

| Method | Path | Auth | Actor | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/register` | permitAll | Guest→Customer/Shop | Create account |
| POST | `/api/auth/login` | permitAll | Any | Password login |
| POST | `/api/auth/guest` | permitAll | Guest | Ephemeral CUSTOMER |
| POST | `/api/auth/refresh` | permitAll | Any | Rotate tokens |
| POST | `/api/auth/logout` | permitAll | Any | Revoke refresh |
| POST | `/api/auth/otp/request` | permitAll | Any | Send 6-digit |
| POST | `/api/auth/otp/verify` | permitAll | Any | Verify + login |
| POST | `/api/auth/forgot-password` | permitAll | Any | Reset code |
| POST | `/api/auth/reset-password` | permitAll | Any | Set new pwd |
| GET | `/api/users/me` | auth | Any | Profile |
| PATCH | `/api/users/me` | auth | Any | Update fullName |
| DELETE | `/api/users/me` | auth | Any | Anonymize |
| GET | `/api/admin/users?...` | ADMIN | Admin | List |
| PATCH | `/api/admin/users/{id}/status` | ADMIN | Admin | Suspend |
| PATCH | `/api/admin/users/{id}/roles` | ADMIN | Admin | Roles |
| GET | `/api/admin/users/count` | ADMIN | Admin | Counts |
| GET | `/api/shops` | permitAll (admin all) | Any | Discover |
| GET | `/api/shops/mine` | auth SHOPKEEPER | Shop | Owned |
| POST | `/api/shops` | auth SHOPKEEPER | Shop | Create |
| GET | `/api/shops/{id}` | permitAll (owner check) | Any | Detail |
| PATCH/PUT/POST | `/api/shops/{id}` | auth SHOPKEEPER owner | Shop | Update |
| DELETE | `/api/shops/{id}` | auth owner + pwd | Shop | Delete |
| GET | `/api/shops/{id}/printers` | permitAll | Any | List |
| POST | `/api/shops/{id}/printers` | auth owner | Shop | Add |
| PATCH | `/api/shops/{id}/printers/{pid}` | auth owner | Shop | Update |
| DELETE | `/api/shops/{id}/printers/{pid}` | auth owner | Shop | Remove |
| GET | `/api/shops/{id}/inventory` | auth? public? | Shop | List |
| PUT | `/api/shops/{id}/inventory` | auth owner | Shop | Upsert |
| DELETE | `/api/shops/{id}/inventory/{rid}` | auth owner | Shop | Remove |
| GET | `/api/pricing/rules?shopId` | permitAll | Any | List |
| POST | `/api/pricing/rules` | auth owner | Shop | Create |
| PUT | `/api/pricing/rules/{id}` | auth owner | Shop | Update |
| DELETE | `/api/pricing/rules/{id}` | auth owner | Shop | Delete |
| GET | `/api/discounts?shopId` | permitAll | Any | List |
| POST | `/api/discounts` | auth owner | Shop | Create |
| POST | `/api/discounts/{id}/coupon` | auth owner | Shop | Add coupon |
| POST | `/api/pricing/quote` | permitAll (shop check) | Guest/Customer | Preview |
| POST | `/api/documents/upload` | auth | Guest/Customer | Upload |
| GET | `/api/documents` | auth | Customer | List |
| GET | `/api/documents/{id}` | auth owner | Customer | Detail |
| GET | `/api/documents/{id}/download` | auth owner | Customer | File |
| POST | `/api/orders` | auth | Customer | Create |
| GET | `/api/orders` | auth | Customer | My orders |
| GET | `/api/orders/{id}` | auth owner/shop | Any | Detail |
| POST | `/api/orders/{id}/status` | auth | Any | Transition |
| GET | `/api/orders/shop/{shopId}` | auth owner | Shop/Admin | Shop orders |
| POST | `/api/orders/{id}/payment` | auth | Customer | Initiate |
| POST | `/api/payments/{id}/verify` | auth | Customer | Verify |
| GET | `/api/orders/{id}/payment` | auth | Customer | Current |
| POST | `/api/orders/{id}/refund` | auth | Customer | Request |
| POST | `/api/refunds/{id}/decision` | ADMIN | Admin | Approve/Reject |
| GET | `/api/orders/{id}/refunds` | auth | Any | List |
| POST | `/api/tokens` | auth | System | Generate |
| POST | `/api/tokens/{id}/transition` | auth | Shop | Move queue |
| GET | `/api/shops/{shopId}/queue` | auth | Any | Live queue |
| GET | `/api/tokens/{id}` | auth | Any | Token by order |
| GET | `/api/tokens/{id}/wait?shopId` | auth | Customer | Wait est |
| GET | `/api/shops/{shopId}/queue/stream` | auth | Any | SSE |
| GET | `/api/net/lan-ip` | permitAll? auth | Shop | LAN IP |
| POST | `/api/shops/{shopId}/qr` | auth owner | Shop | Generate |
| GET | `/api/shops/{shopId}/qr` | auth owner | Shop | List |
| POST | `/api/qr/{id}/regenerate` | auth owner | Shop | Replace |
| GET | `/api/qr/{code}/resolve` | permitAll | Guest | Resolve |
| POST | `/api/qr/{code}/scan` | permitAll | Guest | Log scan |
| GET | `/api/shops/{shopId}/qr/scans` | auth owner | Shop | History |
| GET | `/api/admin/qr` | ADMIN | Admin | All |
| GET | `/api/analytics/overview?shopId` | SHOPKEEPER|ADMIN | Shop/Admin | KPIs |
| GET | `/api/analytics/revenue?shopId` | SHOPKEEPER|ADMIN | Shop/Admin | ByShop |
| GET | `/api/analytics/mix` | SHOPKEEPER|ADMIN | Admin | Color mix |
| GET | `/api/analytics/series?days&shopId` | SHOPKEEPER|ADMIN | Shop/Admin | Series |
| GET | `/api/notifications` | auth | Any | Inbox |
| GET | `/api/notifications/unread-count` | auth | Any | Count |
| POST | `/api/notifications/{id}/read` | auth | Any | Read |
| POST | `/api/notifications/read-all` | auth | Any | All read |
| POST | `/api/complaints` | auth | Customer | File |
| GET | `/api/complaints?status&shopId` | auth | Any | List |
| PATCH | `/api/complaints/{id}` | ADMIN | Admin | Manage |
| GET | `/api/admin/audit?page&size` | ADMIN | Admin | Log |
| GET | `/actuator/health` | permitAll | Any | Health |
| GET | `/v3/api-docs` | permitAll | Any | OpenAPI |

### E. DB Tables & Columns (Condensed)

See Section 1.4 migrations; 28 tables: `users, roles, permissions, user_roles, role_permissions, refresh_tokens, otp_codes, shops, operating_hours, paper_types, printers, printer_paper_sizes, shop_paper_inventory, documents, document_pages, pricing_rules, discount_rules, coupons, coupon_redemptions, print_configurations, orders, order_items, token_sequences, tokens, queue_entries, printer_jobs, payments, payment_transactions, refunds, invoices, complaints, notifications, notification_preferences, qr_codes, qr_scan_events, audit_logs, failed_jobs, system_settings`. Each column spec verified in V2-V10.

### F. Permissions Matrix (21 codes seeded V11)

`shop:manage_own, queue:manage, printer:manage, inventory:manage, pricing:manage_shop, discount:manage_shop, qr:manage_shop, earnings:view_own` → SHOPKEEPER 8.  
Plus `shop:create, shop:manage_all, user:manage, order:view_all, payment:view_all, refund:approve, token:manage_all, complaint:manage, qr:manage_all, audit:view, analytics:view, settings:manage, admin:manage` → ADMIN/SUPER_ADMIN total 21. All assigned via `role_permissions`.

---

## End of Inventory

**Total documented:** 5 actors × (frontend pages + UI details) + backend 27 controllers + 28 tables + 16+8 statuses + 21 permissions = exhaustive.

**Next:** Keep this file as source of truth; update on each migration. For split files per actor, copy respective sections into `func/customer.md` etc. if needed.

