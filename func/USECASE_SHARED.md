# Use Cases — Shared / Global (All Actors) v2.0 Exhaustive

**Scope:** Cross-cutting auth, shells, design system, notifications, error handling, config, DB, rate limit, SSE, i18n.
**Source:** `App.tsx` `ui.tsx` `auth.tsx` `api.ts` `settings.tsx` `sound.ts` `SecurityConfig` `JwtService` `ErrorCode` `Migrations V1-V12` `application.yml`
**Language:** English — per row Frontend + Backend + smallest UI.

> Prefix `UC-GL-`.

---

## UC-GL-01 — App Bootstrap

- **Trigger:** GET / → main.tsx createRoot QueryClient retry1 stale15s SettingsProvider→BrowserRouter→App.

## UC-GL-02 — Root Routing & Auth Provider

- **Flow:** App wraps AuthProvider bootstrap failsafe 8s GET /users/me timeout10s if tokens else false; AreaGuard/ProtectedRoute spinner.

## UC-GL-03 — Design System All Primitives

- **Button** primary oklch secondary ghost danger sizes sm/md/lg loading spinner disabled
- **Input** h10 rounded-xl focus oklch
- **Select** h10
- **Badge** 7 tones brand success warning danger info neutral default
- **Alert** 4 tones error success info warning role alert
- **Card** rounded-2xl shadow-sm hover shadow-md
- **Dialog** Escape body hidden backdrop-blur max-w-lg
- **Skeleton** pulse, Progress h2, Toast 3500ms bottom-right, Stepper pills.

## UC-GL-04 — Auth Service Flows

- **Register** 409 dup, BCrypt, CUSTOMER|SHOPKEEPER
- **Login** BCrypt active lastLoginAt
- **Guest** ephemeral CUSTOMER JWT 15m/7d
- **OTP** SHA256 5m 5 attempts devCode
- **Refresh** single-flight 10s retry 401
- **Logout** revoke + clear.

## UC-GL-05 — API Interceptor

- **Flow:** Bearer header, 401 refresh retry except auth/*, area-aware redirect shop→/shop/login admin→/admin/login else /login, apiErrorMessage 400-504 friendly.

## UC-GL-06 — Settings & i18n

- **Flow:** en-IN hi mr 45 strings, persist localStorage inko.settings dark class, speak token completed via speechSynthesis.

## UC-GL-07 — RoleRedirect Home

- **Flow:** !user→/login, sessionArea&&hasRole→AREA_HOME else priority ADMIN→admin SHOPKEEPER→shop CUSTOMER→customer.

## UC-GL-08 — AreaGuard Isolation

- **Flow:** loading spinner, !user→AREA_LOGIN, sessionArea!==area→mesh-gradient ShieldAlert Different console + Sign in to {area} + Back to my {current}.

## UC-GL-09 — Security Chain

- **Flow:** CORS fallback localhost5173, csrf disable stateless, permitAll /auth/** /health, GET permitAll /shops /pricing/rules, GET permitAll /qr/*/resolve, POST permitAll /qr/*/scan, /shops/mine auth, /analytics ADMIN|SHOPKEEPER, /refunds/*/decision ADMIN, /admin/** ADMIN, JwtAuthFilter before, 401/403 JSON, RateLimit 20/window login/otp-request.

## UC-GL-10 — Notifications

- **Flow:** GET /notifications refetch30s unread-count Bell badge red h9 w9 speak newest if sound, POST /read.

## UC-GL-11 — Database Consistency

- **Tables:** 28 V1-V12 FK indexes unique token_id shop_date_number etc, seeds roles perms.

## UC-GL-12 — Error Model

- **Codes:** TOO_MANY_REQUESTS VALIDATION_FAILED PRICING_NOT_CONFIGURED CONFLICT etc, ApiError status code message details.

*Global flows verified static.*

