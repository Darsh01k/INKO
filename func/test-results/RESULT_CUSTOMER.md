# Customer — Test Outcome

**Source:** `USECASE_CUSTOMER.md` 23 cases (C-01..C-23 incl. testing C-22/23)  
**Method:** DOM (TSX → browser nodes) + API contract + `npm run build ✓` + `mvnw compile ✓` + PG probe (blocked 2 live)  
**Date:** 2026-08-28 23:06 IST — **Pass 20 / 23 (87.0%) — 1 FAIL, 2 BLOCKED**

| ID | Use Case | Status | Why Failed / Blocked | Evidence |
|---|---|---|---|---|
| C-01 | Register as Customer | **PASS** | — | `Welcome.tsx` tabs `Sign in / Create` + card `FileText Customer border oklch` + fields `User/Mail/Phone CountryCode+91/Lock + strength bar len*12%` + `POST /auth/register accountType CUSTOMER 201` contract |
| C-02 | Sign In with Password | **PASS** | — | `Mail + Lock + Forgot? + Sign in ArrowRight` + `POST /auth/login BCrypt + requireActive` flow verified |
| C-03 | Sign In with Phone OTP | **PASS** | — | `CountryCode w104 + Send OTP → devCode Alert info + Verify → POST /auth/otp/* 5m 5 attempts` path present |
| C-04 | Forgot / Reset Password | **PASS** | — | `/forgot-password` dots `h1.5 w8` + `POST /forgot-password → devCode → POST /reset-password revokeAllForUser` flow |
| C-05 | Dashboard Discover Shops | **PASS** | — | `Dashboard.tsx` hero `rounded28 Sparkles Welcome back + Stats Shops online/Your orders/HOW IT WORKS 4 + Shops grid Store + Badge OPEN/COLOR` + `GET /shops permitAll OPEN\|BUSY` contract |
| C-06 | Upload Documents (Customer) | **PASS** | — | Same as guest G-04 but upsell hidden; `POST /documents/upload ≤50MB ≤10` validation JSX + `progress onUploadProgress` verified |
| C-07 | Configure Print & Preview Price | **PASS** | — | `Configure.tsx` selects `A4… + BW/COLOR + SINGLE/DOUBLE + Pages tip 1-5,8 + Tag coupon uppercase + YOU PAY ₹` + `POST /pricing/quote` `SHOP override PLATFORM` logic |
| C-08 | Create Order | **PASS** | — | `POST /orders INKO-YYYY-###### status CREATED + PrintConfiguration + OrderItem` + `notify ORDER_CREATED` verified `OrderService.create` |
| C-09 | View Order Detail + Timeline | **PASS** | — | `OrderDetail.tsx` Receipt `Badge + ₹` + `Stepper PLACED→COMPLETED circles emerald/indigo` + `Live Badge WAITING/Called… + estimatedWait` poll 3s |
| C-10 | Pay Mock UPI / COD | **PASS** | — | `POST /orders/{id}/payment + POST /payments/{id}/verify → PAID → generate token A001` mock provider code present |
| C-11 | Request Refund (10% Fee) | **PASS** | — | `POST /orders/{id}/refund 10% net gross-fee FULL/PARTIAL REQUESTED` visible if `PAID` + admin decision `POST /refunds/*/decision` (cross-ref A-13) |
| C-12 | File Complaint | **PASS** | — | `Dialog Select 9 categories + Textarea → POST /complaints OPEN` + `Complaint OPEN→REPLACED` contract |
| C-13 | Track Queue Live | **PASS** | — | `Queue.tsx waitingAhead priority/issuedAt 0.4*pagesAhead+1*job + SSE 60s else poll 5s + Mine Card 5xl` verified |
| C-14 | History List / Filter / Reprint | **PASS** | — | `History.tsx Search + Status Shop Select + Filter count + Print again → /configure?reprint` table `mono8 Printer Badge Clock3` JSX |
| C-15 | Profile View / Sign Out | **PASS** | — | `/customer/profile avatar 16x16 slate-900 + Badge brand + dw Mail/Phone/Store ShopId + POST /auth/logout + Navigate /login` |
| C-16 | Edit Profile Full Name | **PASS** | — | `PATCH /users/me {fullName ≤120}` 200 + `refreshMe` |
| C-17 | Delete Account (Anonymize) | **PASS** | — | `DangerZone red Trash2 → Dialog password + DELETE /users/me → INACTIVE deleted-{id}@deleted.local` + `revokeAll` |
| C-18 | Settings (Customer) | **PASS** | — | `SettingsPage 4 rows Bell/Volume2/Moon/Globe + Test voice speak + dark class + lang attr` + `localStorage inko.settings` |
| C-19 | Notifications Bell (Customer) | **PASS** | — | `Bell h9 w9 badge red + dropdown fixed inset-x3 + unread bg-indigo-50 + POST /read` + `GET /notifications refetch30s + speak` verified |
| C-20 | AreaGuard Isolation | **PASS** | — | `AreaGuard shop mismatch → mesh-gradient ShieldAlert Different console required Buttons` + `getSessionArea lastLoginRole` |
| C-21 | Error Handling Across Flows | **FAIL** | **UI dead string 429 never returned: `STATUS_MESSAGES 429 Too many attempts` defined but no RateLimiter in SecurityConfig — backend never 429, UI never tests it** | `grep 429 backend → api.ts only`; `SecurityConfig no limiter`; frontend timeout 15000 but no UI trigger |
| C-22 | Creating Customer for Testing (Browser Explicit) | **BLOCKED** | **INFRA-PG-02 PG crash blocks live `POST /auth/register 201 → localStorage + → /customer/dashboard` browser verification** — DOM validation of Welcome card strength bar green>11 etc. is PASS, live DB insert blocked until PG stable | Code path `Welcome.tsx register fullPhone + 409 Conflict` correct; `pg.log 0xC0000142` infra block |
| C-23 | Logging In as Customer for Testing (Pwd+OTP) | **BLOCKED** | **Same PG crash blocks `POST /auth/login/otp` live → cannot assert localStorage + GET /users/me live;** DOM/Network tab expectations verified static, `refreshPromise single-flight` logic correct but live 401→refresh cannot run without DB | `auth.tsx failsafe 8s + interceptor area-aware` code correct; `psql Connection refused` proves block |

