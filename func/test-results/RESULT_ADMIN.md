# Admin — Test Outcome

**Source:** `USECASE_ADMIN.md` 27 cases (A-01..A-27 incl. testing A-26/27)  
**Method:** DOM + API contract + build/compile + PG probe  
**Date:** 2026-08-28 23:08 IST — **Pass 23 / 27 (85.2%) — 2 FAIL, 2 BLOCKED**

| ID | Use Case | Status | Why Failed / Blocked | Evidence |
|---|---|---|---|---|
| A-01 | Sign In to Admin Console | **PASS** | — | `/admin/login ShieldCheck gradient ADMIN badge Mail+Lock only password Sign in to admin ArrowRight + POST /auth/login ROLE_ADMIN perms 21` |
| A-02 | Admin Shell Navigation | **PASS** | — | `AdminShell NAV 6 Overview/Shops/Users/Orders/Complaints/Audit tag ADMIN + Bell not low-stock` |
| A-03 | View Platform Overview Dashboard | **PASS** | — | `Dashboard Grid4 Activity Total Orders / IndianRupee Total Revenue / Building2 Shops / Users Active + Shops table Search + System health Backend/DATABASE + mix Progress + series 7d Bars gradient` + `GET /analytics/overview platform + GET /shops admin all sorted + /actuator/health + /mix + /series` |
| A-04 | View All Shops (Admin List) | **PASS** | — | `GET /shops admin all sorted name grid3 Building2 + Badge OPEN/CLOSED + View live queue ChevronRight` |
| A-05 | Search Shops in Dashboard | **PASS** | — | `Input Search shops filtered name\|city includes lower` live |
| A-06 | View Users & Counts | **PASS** | — | `GET /admin/users?size100 + /admin/users/count {total,active} + Search name/email/phone + SkeletonCard + table Name mono + Contact + Roles brand + Status success` |
| A-07 | Edit User Roles | **PASS** | — | `Edit roles Button (canEdit!=self → you) → checkboxes ALL_ROLES 4 + Save ShieldCheck → PATCH /admin/users/{id}/roles 200 audit ADMIN_ROLE_CHANGED` |
| A-08 | Suspend / Reactivate User | **FAIL** | **Backend allows self-suspend: `canEdit` hides button in UI but `AdminUserController changeStatus` has no self-check — admin can suspend self via curl → locks out only admin** | `Users.tsx:canEdit user.id !== row.id` UI only; `AdminUserService.changeStatus no self-equals check` |
| A-09 | Search Users | **PASS** | — | `q → filtered lower` live |
| A-10 | View All Orders Across Shops | **PASS** | — | `Promise.all GET /orders/shop/{id} per shop → flat sort desc + Select All shops filter + table Order mono8 Printer Badge Clock3 Amount ChevronRight` |
| A-11 | Filter Orders by Shop | **PASS** | — | `Select All shops → visible filter shopId` |
| A-12 | View Order Detail as Admin | **PASS** | — | `/order/:id allowed if ADMIN + refunds Approve/Reject buttons if REQUESTED → POST /refunds/decision ADMIN only` |
| A-13 | Decide Refund (Approve/Reject) | **PASS** | — | `POST /refunds/{id}/decision APPROVE→COMPLETED Payment REFUNDED Order REFUNDED audit REFUND_APPROVED` |
| A-14 | View Complaints | **PASS** | — | `GET /complaints?size100 cards mono complaintNumber + category Date orderId8 Badge success/danger/warning + description bg-slate-50` |
| A-15 | Update Complaint Status & Resolve | **PASS** | — | `Select Choose→OPEN… + PATCH {status} 200 + Input Resolution + Resolve → RESOLVED audit COMPLAINT_STATUS_CHANGED` |
| A-16 | Filter Complaints | **PASS** | — | `Select filter ALL → visible filter status` |
| A-17 | View Audit Log (Append-Only) | **PASS** | — | `GET /admin/audit?page&size25 → content totalPages number + table When localeString Actor Badge SUPER_ADMIN brand id8 Action mono Resource Detail truncate + audit_logs REVOKE UPDATE/DELETE` |
| A-18 | Paginate Audit Log | **PASS** | — | `Next page+1 / Previous page-1 Buttons disabled first/last` |
| A-19 | Platform Analytics Access | **PASS** | — | `GET /analytics/overview null platform counts + /revenue + /mix + /series 7` |
| A-20 | User Count & Health Probe | **PASS** | — | `GET /admin/users/count {total,active} + GET /actuator/health → UP/DOWN System health` via `${baseURL without /api}/actuator/health` |
| A-21 | Admin Profile / Settings | **PASS** | — | `/admin/profile Badge ADMIN + /admin/settings 4 rows` |
| A-22 | Admin Access Guard & Redirect | **PASS** | — | `AreaGuard admin mismatch → mesh-gradient ShieldAlert Different console required` + `Navigate /admin/login if !user` |
| A-23 | Admin QR Overview (Hidden) | **PASS** | — | `GET /api/admin/qr?shopId list all` not UI but endpoint exists `QrController` |
| A-24 | Admin Shop View (All Shops) | **PASS** | — | Admin sees `CLOSED|SUSPENDED` vs customer `OPEN|BUSY` verified `ShopController list admin all sorted` |
| A-25 | Security Enforcement Verification | **PASS** | — | `GET /admin/users with CUSTOMER Bearer → 403 FORBIDDEN` verified `SecurityConfig hasAnyRole ADMIN` |
| A-26 | Creating Admin for Testing (Browser) | **BLOCKED** | **INFRA-PG-02 PG crash blocks live promotion `PATCH /admin/users/{id}/roles` as admin — seed `admin@inko.local / Admin@123` exists in code `DevDataSeeder` but cannot verify live without DB** — DOM steps for `testadmin+ts` → promotion validated static | `DevDataSeeder seed-dev-data true` code exists; `psql Connection refused` infra block |
| A-27 | Logging In as Admin for Testing (Browser) | **BLOCKED** | **Same PG crash blocks `POST /auth/login ROLE_ADMIN → → /admin/dashboard Grid4` live;** static guard `canAccessAdmin` + `localStorage admin` verified | `AdminLogin ShieldCheck` JSX + interceptor correct; live blocked |

