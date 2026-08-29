# Use Cases — Shared / Global (All Actors)

**Scope:** Cross-cutting functionality used by every actor (auth, shells, design system, notifications, error handling, config, DB).  
**Language:** English — Frontend + Backend per use case  
**Source:** `FUNCTIONALITY.md` §1 (Global) verified `App.tsx, ui.tsx, auth.tsx, api.ts, settings.tsx, sound.ts, SecurityConfig, JwtService, ErrorModel, Migrations, application.yml`

---

## UC-GL-01 — App Bootstrap (Main Entrypoint)

- **Trigger:** `GET /` → `main.tsx` loads `index.css`, `createRoot` mounts.
- **UI:** No visible, creates `QueryClient retry1 stale15s` + `SettingsProvider` + `BrowserRouter` + `App`.
- **Related:** Every query uses client cache.

## UC-GL-02 — Root Routing & Auth Provider Wrap

- **Flow:** `App.tsx` wraps `<AuthProvider>` around `<Routes>`; `AuthProvider` `useEffect bootstrap` with `failsafe 8s` + `GET /users/me timeout10s` if tokens exist else `isLoading false`; on 401/403 `tokens.clear`.
- **UI States:** Loading handled by `AreaGuard/ProtectedRoute` spinner.

## UC-GL-03 — Design System Button Variants

- **Purpose:** Primary CTA `oklch(0.55) white shadow`, Secondary `border slate`, Ghost, Danger `red-600`, Subtle `slate-900`; sizes sm `h-8 px3` md `h-10` lg `h-11` icon `h-9 w-9`; loading `spinner border-t-transparent + disabled`.
- **Test:** Every page verifies `loading` disables click and shows spinner.

## UC-GL-04 — Input / Textarea / Select / Label

- **Input** `h-10 rounded-xl border-slate-200 bg-white px3.5 shadow hover:border-slate-300 focus:border-oklch ring-4 0.12 placeholder slate-400 disabled 50%`. 
- **Textarea** `min-h88 py3`, **Select** `h-10 rounded-xl`, **Label** `mb1.5 text-sm font-medium`.
- **Related:** All forms (login, shop create, complaint).

## UC-GL-05 — Card & Hover

- **Card** `rounded-2xl border-slate-200 bg-white shadow-sm` + `hover:shadow-md` if `hover` + `CardHeader/Content/Footer`. Used for KPIs, lists.

## UC-GL-06 — Badge Tones (Status Indicators)

- **7 tones:** `default slate, brand oklch indigo, success emerald, warning amber, danger red, info sky, neutral white` `rounded-full px2.5 py0.5 border text-xs`. Mappings: shop `OPEN success, BUSY warning`, order `QUEUED warning, PRINTING brand, COMPLETED success, CANCELLED danger`, token `WAITING warning, CALLED brand`, printer `ERROR red`, `LOW amber`.
- **Test:** Visual snapshot per tone.

## UC-GL-07 — Alert Tones

- **4 tones:** `error red-50, success emerald-50, info sky-50, warning amber-50` `rounded-xl border px4 py3 role=alert`. Used for error/info/success banners.

## UC-GL-08 — Skeleton Loading

- **Skeleton** `animate-pulse rounded-xl bg-slate-200` any `className`, `SkeletonCard p5 space-y3 h5 w3/5`. Shown while `GET /shops, /orders, /analytics` loading.

## UC-GL-09 — Separator & Progress

- **Separator** `h-px bg-slate-200`. **Progress** `{value 0-100 clamped} h2 rounded-full bg-slate-100 inner oklch transition500`. Used `mix sharePercent` progress bar.

## UC-GL-10 — Dialog Modal (Accessible)

- **Props** `open, onClose, title, children` behavior `Escape→onClose`, `body overflow hidden`, `fixed inset0 backdrop-blur bg-slate-900/40`, `max-w-lg max-h88vh rounded-2xl p4/6 shadow-xl`. Title sticky `text-lg font-semibold`.
- **Used:** Shop create/edit, resources, delete, complaint, QR regenerate, refund reason.

## UC-GL-11 — EmptyState

- **Props** `icon?, title, description, action` UI `flex col dashed border-slate-200 bg-slate-50/60 px6 py12 + rounded-2xl bg-white p3 shadow-sm border icon h6 w6 slate-400`. Used `No shops, No orders, No printers, No revenue, No tokens`.

## UC-GL-12 — Toast Ephemeral

- **Global** `toast(message, tone success/error/info)` auto dismiss `3500ms`, `Toaster bottom-4 right-4 stacked border px4 py3 shadow-lg` tones. Used for quick feedback?

## UC-GL-13 — Stepper Multi-Step

- **Props** `steps[], current` pills `current oklch shadow, <current emerald-50 ✓, >white slate` circle `h5 w5` + connector `h-px w6/8 emerald/slate`. Used `Upload/Configure/Pay` + `ForgotPassword request/reset/done` (3 steps).

## UC-GL-14 — Auth Session Area Isolation (AreaGuard)

- **Purpose:** One session = one console. `SessionArea customer|shop|admin, AREA_LOGIN, AREA_HOME, AREA_LABEL, get/setSessionArea localStorage inko.lastLoginRole`.
- **Flow:** `isLoading true → spinner Checking your session…` `!user → Navigate AREA_LOGIN[area]` `sessionArea !== area → mesh-gradient Card ShieldAlert amber Different console required: {current} → {area} Buttons Sign in to {area} ArrowRight + Back to my {current}` else `Outlet`.
- **Related:** `RoleRedirect` uses same.

## UC-GL-15 — ProtectedRoute Legacy Guard

- **Flow:** `isLoading → spinner` `!user → Navigate /login state from` `roles && !includes → Access denied red card` else `Outlet`.

## UC-GL-16 — RoleRedirect Home Resolver

- **Logic:** `!user → /login` `getSessionArea && hasAreaRole → AREA_HOME[area]` else priority `ADMIN→/admin/dashboard, SHOPKEEPER→/shop/dashboard, CUSTOMER→/customer/dashboard`.

## UC-GL-17 — Settings Persistence & i18n

- **Type** `Language en-IN hi mr` `LANGUAGE_LABEL`, `STRINGS 45 keys ×3 locales` (settings, notifications, sound, darkMode, language, testVoice, voiceDemo, saved, navDashboard…lowBadge).
- **Storage** `KEY inko.settings DEFAULTS {true,false,false,en-IN}` `load/persist localStorage` `useEffect classList dark + colorScheme + document.lang` `t(key)` fallback `set(k,v)` per switch.
- **UI:** `SettingsPage` 4 rows `Bell Switch, Volume2 Switch + Test voice speak, Moon Switch, Globe Select en-IN/hi/mr + Device-local note`, saved flash `Check Saved`.

## UC-GL-18 — Voice Speak (Settings + Shop Queue)

- **Flow:** `speak(text) → if !sound return; cancel() ; SpeechSynthesisUtterance text, voice by lang prefix en/hi/mr, lang en-IN/hi-IN/mr-IN, rate0.95`. Announce `Token A104 completed` variations.
- **Related:** `sound.ts announceToken` same logic when `settings.sound`.

## UC-GL-19 — NotificationsBell (Global)

- **State** `enabled {!!user && settings.notifications} + prevUnread`.
- **Queries** `GET /notifications refetch30s + GET /unread-count` effect `speak newest title if sound && unread>prev`.
- **UI:** if disabled `BellOff disabled` else `Bell h9 w9 badge red >0`; dropdown `fixed inset-x3 top14 sm:w80 max-h70vh header Mark all read CheckCheck indigo + list unread bg-indigo-50 dot else opacity60 Link if linkPath`.
- **Actions:** `POST /{id}/read + POST /read-all` invalidate.
- **Backend:** `Notification recipientId type title200 body1000 linkPath is_read channel IN_APP default, NotificationService.create`.

## UC-GL-20 — MapPicker Leaflet OSM

- **Props** `lat? lng? onPick {lat,lng,displayName,address {city,town,village,county,state,postcode}}`.
- **State** `pickLat/pickLng, addr, search, suggestions, loading`.
- **Functions:** `reverse OSM reverse, doSearch OSM search countrycodes=in, pickSuggestion, confirm validate→onPick double`.
- **Effects:** loads `leaflet.css+js unpkg 1.9.4`, map `mt1.google/lyrs=m tiles`, draggable marker click/drag→reverse→update.
- **UI:** `Input search debounce 500ms window.__mapSearch + Button Search, suggestions max-h44 type•class lat, div mapRef h64 rounded-xl, lat/lng Input grid, addr preview, Button Confirm Check full width`.
- **Used:** Shops create/edit.

## UC-GL-21 — PhoneInput Country Code

- **Data** `COUNTRIES 12 IN+91 US+1 UK+44 AU+61 AE+971 SA+966 BD+880 LK+94 NP+977 MY+60 SG+65 ZA+27`.
- **UI** `CountryCode Select w104 h7 bg-slate-100 absolute left-1.5` + Input `pl112` `fullPhone(cc,local) strip non-digits → +CC digits`.
- **Used:** Welcome OTP, Register, Shops phone.

## UC-GL-22 — API Client & Token Rotation (api.ts)

- **Keys** `inko.access_token refresh_token`.
- **Axios** `baseURL VITE_API_BASE_URL||/api timeout15000` request interceptor `Bearer`.
- **Error:** `ApiErrorBody status code message details?` `STATUS_MESSAGES 400/401/403/404/405/409/413/429/500/502/503/504` friendly.
- **apiErrorMessage** merges `body.details values` else `STATUS_MESSAGES[status]` else `ERR_NETWORK Cannot reach server`.
- **Refresh:** `refreshPromise single-flight POST /auth/refresh {refreshToken} timeout10000 → tokens.set` interceptor retries 401 except `/auth/login|refresh|register|otp` `_retry` flag on fail `tokens.clear + window.location.assign loginPath area-aware`.

## UC-GL-23 — Utility cn

- **`twMerge(clsx(...))`** merge Tailwind conditional classes.

## UC-GL-24 — Backend Security Chain

- **Beans** `BCrypt 10, Cors {allowedOrigins prop, methods GET|POST|PUT|PATCH|DELETE|OPTIONS headers * exposed Location credentials true /api/** /actuator/**}`.
- **Chain** `csrf disable, cors, stateless, authorize: permitAll /auth/** /actuator/health /error /swagger-ui /v3, GET permitAll /shops /pricing/rules /discounts, GET permitAll /shops/* /qr/*/resolve, POST permitAll /qr/*/scan, /shops/mine auth, /analytics/** ADMIN|SHOPKEEPER, /refunds/*/decision ADMIN, /admin/** ADMIN, anyRequest authenticated` `JwtAuthFilter before UsernamePasswordFilter` exceptions JSON `ApiError 401 UNAUTHORIZED 403 FORBIDDEN`.

## UC-GL-25 — JWT Issue / Verify

- **Issue** `HS256 MACSigner secret UTF-8 valid 15m → JWT sub userId jti UUID iat now exp now+15m roles ROLE_*, perms[], shopId?` `SignedJWT`.
- **Verify** `parse + verify else InvalidTokenException, exp before now → TokenExpiredException, return DecodedToken`.
- **Related:** `AuthService.issueAuthResponse` sets roles/perms/primaryShopId.

## UC-GL-26 — AuthService Core Flows

- **Register** email/phone uniqueness 409, hash BCrypt, assign `CUSTOMER (+SHOPKEEPER if SHOP_OWNER)`, OTP verify email mocked, log, `issueAuthResponse 15m/7d`.
- **Login** `findByEmailOrPhone lower, requireActive (SUSPENDED 403), matches`, `lastLoginAt now`.
- **Refresh** `findByHashForUpdate SHA256, if revoked → revokeAllForUser REQUIRES_NEW + 401 INVALID_TOKEN replay, if expired → 401 expired, requireActive, setRevokedAt now + issue new pair`.
- **Logout** `findByHash revoke if not revoked`.
- **OTP** `issueOtp 6-digit random SHA256 expires 5m MAX_ATTEMPTS 5, consumeOtp latest active validates hash → consume else registerFailedAttempt`.
- **DeleteAccount** `DELETE anonymize deleted-{id}@deleted.local INACTIVE null`.

## UC-GL-27 — Error Model

- **ErrorCode 19** → status mapping, `ApiException, ApiError(status,code,message,details), GlobalExceptionHandler → JSON`.
- **UI:** `apiErrorMessage` shows `details values` join.

## UC-GL-28 — DB Migrations V1-V12 & Seeds

- **V1 trigger**, **V2 users/roles/permissions/refresh_tokens/otp_codes**, **V3 shops/operating_hours**, **V4 printers/paper inventory**, **V5 documents/pages**, **V6 pricing/coupons**, **V7 orders/printConfigurations/order_items**, **V8 tokens/queue/printer_jobs**, **V9 payments/refunds/invoices**, **V10 complaints/notifications/qr/audit/failed_jobs/system_settings**, **V11 seed 4 roles 21 perms 7 paper types 8 settings**, **V12 fix stale QUEUED→PRINTING/COMPLETED**.
- **Appendix E lists all columns.**

## UC-GL-29 — App Config (application.yml)

- **Port 8080, datasource hikari max10, flyway, jpa validate, multipart 50MB/200MB, actuator health, jwt secret env, CORS localhost:5173, dev-mode seed true, OTP 5m/5, storage ./data/storage, payment mock, logging DEBUG.**

## UC-GL-30 — Queue Token Lifecycle (Cross-Actor)

- **Lifecycle:** `Order CREATED→…→PAID/COD→TOKEN_GENERATED→QUEUED` via `OrderService.create + PaymentService` → `TokenService.generate A001 priority 10-200 → WAITING → TokenService.transition CALLED→PRINTING→COMPLETED` → sync `Order QUEUED→PRINTING→COMPLETED` + inventory decrement + notify. DB `token_sequences per shop/date, queue_entries WAITING→DONE`.
- **Related:** Customer queue track, Shop queue manage, Admin order view.

## UC-GL-31 — Pricing Quote Decomposition

- **Flow:** `PricingService.quote` validate pages/copies, `findResolved SHOP override PLATFORM`, `unitPrice, printedPages, sheets DOUBLE:(p+1)//2 else p, subtotal unit*printed, specialCharge, decompose paper/color/side half split, discount best, tax percent, currency INR, minOrder bump`.
- **Used:** Configure preview.

## UC-GL-32 — Fallback / 404

- **Routes:** `/shops placeholder + * → Inko Page not found — go home link /customer/dashboard`.

## UC-GL-33 — Creating & Logging In for Testing — Global Harness (Browser Explicit, All Roles)

- **Goal (Testing):** Single procedure to create + log in every actor for end-to-end browser testing — explicit steps on real browser (Playwright/manual), not just code.
- **Pre (One-Time Setup):**
  - `git pull`, `docker-compose up -d db`, `cd backend && ./mvnw spring-boot:run -Dinko.app.jwt.secret=dev-only-secret-change-me-in-production-0123456789abcdef -Dinko.app.cors.allowed-origins=http://localhost:5173 -Dinko.app.dev-mode=true` → `http://localhost:8080/actuator/health 200 UP`.
  - `cd frontend && npm install && npm run dev` → `http://localhost:5173`.
  - Clear `Application → LocalStorage` `inko.*` + `SessionStorage`.
  - Seed check: `curl http://localhost:8080/api/actuator/health` + `psql inko -c "SELECT name FROM roles"` 4 roles.
- **Browser Matrix (Explicit):**
  1. **Guest (QR):** `http://localhost:5173/upload` empty → verify `POST /auth/guest 201` → `CUSTOMER` guest.
  2. **Customer create:** `http://localhost:5173/login → Create account Customer → testcust+ts@test.inko Test@12345` → `201 + → /customer/dashboard`.
  3. **Customer login pwd:** `logout → /login → Password testcust → 200 → /customer/dashboard`.
  4. **Customer OTP:** `Phone OTP +91 90000… → Send OTP (copy devCode from Network Response devCode or backend log OTP issued) → Verify → 200`.
  5. **Shop Owner create:** `Register → Shop Owner → shopown+ts@test.inko Test@12345 → 201 SHOPKEEPER → → /shop/dashboard → Create shop Test Print`.
  6. **Shop login:** ` /shop/login → shopown@… Test@12345 → 200 → /shop/dashboard`.
  7. **Admin login:** ` /admin/login → admin@inko.local Admin@123 (seed) → 200 → /admin/dashboard` or promotion path UC-A-26.
  8. **Forgot flows:** `/forgot-password` per actor → `devCode` → reset → re-login new pwd.
  9. **Cross-console isolation:** While customer logged, navigate `/shop/dashboard` → `Different console required` — verify.
  10. **Token rotation:** Wait 15m or shorten `accessTokenValidityMinutes` to 1 for test → `GET /users/me` 401 → interceptor `POST /auth/refresh 200` → new `accessToken` without logout.
- **Verification on Browser (Not Just Code):**
  - **UI:** See `Badge OPEN success` color `emerald`, `Queue NOW SERVING 6xl`, `Dialog Escape closes + body overflow hidden`, `Skeleton animate-pulse`, `Toast bottom-right`, `MapPicker OSM markers draggable`.
  - **Network:** Chrome DevTools Network shows `Authorization: Bearer …`, `401→refresh` single-flight, `CORS Access-Control-Allow-Origin localhost:5173`.
  - **DB:** `psql SELECT … FROM users / shops / orders / tokens / refresh_tokens WHERE user_id=…` matches UI.
  - **Sound:** Enable `Settings sound → Test voice` speaks `Token A104 completed` in `en-IN/hi/mr`.
- **Cleanup for Re-test:** `DELETE /users/me {password}` anonymize or `psql DELETE FROM users WHERE email LIKE 'test%+@test.inko'` + `revoke tokens`.

## UC-GL-34 — Browser UI Experience Test Checklist (Beyond Code)

- **Purpose:** Explicit UI experience verification on browser for every small detail — complements API tests.
- **Checklist (Run on Chrome 1920×1080 + mobile 375px):**
  - `AreaGuard` spinner `h-8 animate-spin border-t-blue-600` + `Checking your session…` (<2s) vs failsafe 8s on network block (DevTools Offline).
  - `RoleRedirect` ` / → /customer/dashboard` for customer, ` / → /shop/dashboard` for shop, ` / → /admin/dashboard` for admin.
  - `CustomerShell/ShopShell/AdminShell` sticky `h-14 backdrop-blur`, brand `Printer gradient`, NavLink pill `bg-slate-900 active`, Bell badge red `>0`, dropdown avatar initials, mobile `Menu/X drawer`, footer `© year Smart Printing` + emerald dot.
  - `ui.tsx` Button `loading spinner disables click`, `Input focus oklch ring`, `Card hover:shadow-md`, `Badge tone` colors visual, `Alert role=alert`, `Dialog backdrop-blur`, `EmptyState dashed`, `Stepper pills current oklch`.
  - `Settings` dark toggle `documentElement dark class`, `language hi → Dashboard डैशबोर्ड`, `sound Test voice speaks hi-IN`.
  - `Upload` drag `bg-indigo-50 dashed`, `drop files` vs `click Browse`, `Progress` real %.
  - `Shop Shops` `MapPicker` OSM tiles `mt1.google`, marker drag, search suggestions 500ms, `CountryCode` `+91` parsing `+91 90000 → +9190000`.
  - `QueueManage` auto checkbox persists `localStorage`, `Live badge pulse`, `Call→Printing 2s delay`.
  - `Admin Users` cannot self-suspend `you` label, `Complaints` resolve button `emerald`.

---

### Traceability Shared

| UC | Source File |
|---|---|
| GL-03 to 13 | `components/ui.tsx:1-242` |
| GL-14 | `components/AreaGuard.tsx` |
| GL-17 | `lib/settings.tsx:1-306` STRINGS 45×3 |
| GL-19 | `components/NotificationsBell.tsx` |
| GL-22 | `lib/api.ts:1-117` |
| GL-24 | `identity/security/SecurityConfig.java:68-101` |
| GL-25 | `JwtService.java:38-105` |

*All shared use cases verified; complements per-actor files to achieve exhaustive coverage per FUNCTIONALITY.md.*
