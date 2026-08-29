# Use Cases — Admin / Super Admin (ROLE_ADMIN, ROLE_SUPER_ADMIN)

**Actor:** Admin — `roles [ROLE_ADMIN]` or Super Admin `ROLE_SUPER_ADMIN` (all perms).  
**Language:** English — Frontend + Backend exhaustive per smallest UI detail  
**Source:** `FUNCTIONALITY.md` §5 (Actor D) verified `AdminLogin.tsx, AdminShell, admin/Dashboard, Shops, Users, Orders, Complaints, Audit, AdminUserController, AnalyticsService, ComplaintController, AuditLog`

---

## UC-A-01 — Sign In to Admin Console

- **Route:** `/admin/login` (also `/login` admin can but isolated).
- **Guard:** `canAccessAdmin = ADMIN|SUPER_ADMIN`, else `This account is not an admin…`.
- **UI:** `ShieldCheck gradient indigo Badge ADMIN` header `Admin sign in`, `Mail identifier + Lock password` (only password, no OTP tabs), `Sign in to admin ArrowRight lg loading spinner` + `ApiErrorMessage` Alert, links `Customer login → /login, Shop login → /shop/login`.
- **Flow:** `POST /auth/login {identifier lower, password}` → `findUser` → `requireActive` → `issueAccessToken roles [ROLE_ADMIN] perms 21 codes shopId null + refreshToken 7d` → `localStorage lastLoginRole admin` → `?next startsWith /admin ? next : /admin/dashboard`.
- **Errors:** `401 INVALID_CREDENTIALS`, `403 SUSPENDED`.

## UC-A-02 — Admin Shell Navigation

- **NAV 6:** `Overview ShieldCheck /admin/dashboard`, `Shops Building2 /admin/shops`, `Users Users /admin/users`, `Orders FileText /admin/orders`, `Complaints MessagesSquare /admin/complaints`, `Audit ScrollText /admin/audit`, tag `ADMIN indigo`, `NotificationsBell` (admin receives refund/complaint not low-stock), dropdown `ADMIN initials` → `profile/settings` → `Sign out LogOut → POST /auth/logout → /admin/login`, mobile drawer, footer `footerAdmin © {year} Inko Admin…`.

## UC-A-03 — View Platform Overview Dashboard

- **Route:** `/admin/dashboard` `AreaGuard admin` + `AdminShell`.
- **State:** `stats {totalOrders,totalShops,totalRevenue,activeUsers,totalUsers,todayOrders,todayRevenue}, shops[], health UP/DOWN, mix [{mode,pages,orders,sharePercent}], series [{date,orders,revenue}] 7d, q search, err`.
- **Effects:** `GET /analytics/overview (platform, no shopId)` + `GET /shops (admin sees all sorted name)` parallel, `GET /actuator/health` via `axios GET {baseURL without /api}/actuator/health` else `DOWN`, `GET /analytics/mix + GET /analytics/series?days=7`.
- **UI:**
  - Header `ShieldCheck Admin console + Enterprise live` `Refresh Button`.
  - Err `Card red border-red-200`.
  - Grid4 `Activity Total Orders, IndianRupee Total Revenue, Building2 Shops open, Users Active Users` (all platform totals).
  - Two cols: left `Shops table` `Search Input placeholder Search shops → filtered shops name/city substring lower` header `Shop City Status + Manage →/admin/shops`, right `System health Card Backend Operational/DOWN emerald vs red + Database Connected/Unknown` + `Revenue mix Card pages by color Table + Progress bar sharePercent = pages*1000/total/10`.
  - Bottom `Orders & revenue last7 days TrendingUp BarChart INR` `EmptyState` else `maxRev max(revenue)` bars `gradient indigo height v/maxRev*100 title orders revenue label date.slice5` + legend `revenuePerDay`.
- **Backend:** `AnalyticsService.overview(null)` counts all, `colorMix JOIN order_items + print_configurations GROUP color_mode`, `dailySeries 7`.

## UC-A-04 — View All Shops (Admin List)

- **Route:** `/admin/shops`.
- **Flow:** `GET /shops` admin branch `findAll sorted name` (vs customer `OPEN|BUSY` filter). State `shops|null ShopRow {id,name,city,status,supportsColor}`.
- **UI:** Header `Shops All registered + Refresh`, states `Skeleton 3`, Error `EmptyState Building2 Could not load shops — please retry. Retry Button` note `admin bypass`, empty `No shops`, grid3 cards `Building2 icon bg-slate-100 + name h3 + MapPin city + Badge OPEN success/CLOSED neutral/BUSY warning + Palette Color/B&W + mono id8 + View live queue ChevronRight →/queue/:id`.
- **Related:** Click → customer queue view but with admin token.

## UC-A-05 — Search Shops in Admin Dashboard

- **Trigger:** `Dashboard` search `q` → `filtered = shops.filter name|city includes lower` live update, count badge.

## UC-A-06 — View Users & Counts

- **Route:** `/admin/users`.
- **State:** `rows UserRow {id,fullName,email,phone,roles[],status ACTIVE|INACTIVE|SUSPENDED, shopId}, counts {total,active}, error, q search, editing id, draftRoles string[], busy`.
- **Flow:** `GET /admin/users?size=100&query&page` → `{content/_embedded, totalElements, ...}` extract rows `content||data||value` + `GET /admin/users/count → {total,active,counts}`. `filtered = search lower name|email|phone`.
- **UI:** Header `Users {total • active} Manage roles/status … + Refresh`, `Search Input placeholder name/email/phone`, states `SkeletonCard`, error `EmptyState No users`, table `Name (fullName + mono id8) + Contact Mail/Phone + Store ShopId mono + Roles Badges tone brand + Status Badge success ACTIVE/warning SUSPENDED + Actions`.
- **Backend:** `AdminUserController search`.

## UC-A-07 — Edit User Roles

- **Trigger:** Actions `Edit roles Button` (if `canEdit user.id !== row.id` else `you`) → `editing = row.id` + `draftRoles = row.roles copy`.
- **UI Editing:** Checkboxes `ALL_ROLES [CUSTOMER,SHOPKEEPER,ADMIN,SUPER_ADMIN]` inline `gap2 h-4 w-4 rounded`, `Save ShieldCheck primary small + Cancel ghost`.
- **Flow:** `Save → PATCH /api/admin/users/{id}/roles {roles: draftRoles}` 200 → `UserDto` updated roles sorted; audit `ADMIN_ROLE_CHANGED old/new json`, notify? 400 `Cannot demote self` if try. `Cancel → editing null`.
- **Errors:** `403 FORBIDDEN` if not ADMIN, `404 Not found`.

## UC-A-08 — Suspend / Reactivate User

- **Trigger:** Row action `Suspend ShieldAlert warning` if `ACTIVE` else `Reactivate Check`.
- **Flow:** `PATCH /api/admin/users/{id}/status {status SUSPENDED|ACTIVE}` → `User status updated`, `audit ADMIN_USER_STATUS_CHANGED`, `Notification ACCOUNT_STATUS Suspended/Reactivated` to user, `refreshTokens revokeAllForUser` if suspend? (service revokes). Auth `requireActive` will block login 403 `This account has been suspended`.
- **UI:** Button `danger subtle?` confirmation not required, immediate.
- **Edge:** Cannot suspend self (`user.id === row.id` hides button shows `you`).

## UC-A-09 — Search Users

- **Flow:** Type `q` → `filtered` live; `Enter` not needed.

## UC-A-10 — View All Orders Across Shops

- **Route:** `/admin/orders`.
- **State:** `orders|null OrderRow {id,orderNumber,status,finalAmount,createdAt,shopId,shopName}, error, shopFilter all|id, shopNames Map shopId→name`.
- **Flow:** `load: GET /shops → shopNames + Promise.all GET /orders/shop/{shopId} per shop → flatMap + sort createdAt desc (newest first)`. `visible filtered by shopFilter`.
- **UI:** Header `Orders Across all shops + Select All shops (options shopNames) + Refresh Button`, states `Skeleton 3 / EmptyState FileText Could not load / No orders yet`, table `Order mono8 (orderNumber||id8) + Shop (shopName Printer icon || id8) + Status Badge tone success/brand/warning/danger + Date localeDate string + Amount ₹ + Open ChevronRight → /order/:id`.
- **Related:** `OrderDetail` admin view same as customer but can `Approve/Reject refund`.

## UC-A-11 — Filter Orders by Shop

- **Trigger:** `Select All shops` change → `visible = shopFilter===all ? orders : orders.filter shopId==value` live.

## UC-A-12 — View Order Detail as Admin

- **Route:** `/order/:id` (same as customer) but admin can see `refunds decision` buttons. `GET /orders/{id}` allows if `ADMIN`.
- **Refund Decision:** `refunds list Badge + Approve/Reject Button small primary/danger` if `REQUESTED` → `POST /refunds/{id}/decision {decision APPROVE|REJECT}` `hasAnyRole ADMIN` else 403. Updates `Refund COMPLETED/REJECTED, Payment REFUNDED, Order REFUNDED`.

## UC-A-13 — Decide Refund (Approve/Reject)

- **UI:** `OrderDetail refunds Card` `Request refund (10% fee)` not for admin, but `Approve: success green, Reject: danger red` buttons `loading busy`.
- **Flow:** `POST /api/refunds/{id}/decision {decision}` → `PaymentService.decideRefund` `decidedBy principal, status COMPLETED if APPROVE else REJECTED, sum completed refunds → Payment REFUNDED/PARTIALLY, Order REFUNDED if full, audit REFUND_APPROVED json, notify customer REFUND_APPROVED`.

## UC-A-14 — View Complaints

- **Route:** `/admin/complaints`.
- **State:** `Complaint {id,complaintNumber,customerId,orderId,shopId,category 9, description, attachments, status, assignedTo,resolution,createdAt}, rows|null, err, filter ALL|OPEN|INVESTIGATING|RESOLVED|CLOSED|ESCALATED, busyId, resolution map`.
- **Flow:** `GET /complaints?size100 + /complaints?shopId&status maybe` → list.
- **UI:** Header `MessagesSquare Complaints {count} → Select filter ALL… + Refresh`, Err `Alert red`, `Skeleton`, empty `No complaints`, cards `mono complaintNumber + category Badge + date locale + orderId8 Badge success/danger/warning status + description bg-slate-50 p3 rounded-xl + resolution emerald if exists`, admin controls: `Label Set status Select Choose…→ OPEN|INVESTIGATING|RESOLVED|CLOSED|ESCALATED → PATCH /complaints/{id} {status}` + `Input Resolution note + Button Resolve → RESOLVED` `loading busyId`.
- **Related:** Customer files, shop notified? Admin resolves.

## UC-A-15 — Update Complaint Status & Resolve

- **Trigger:** `Select Choose…` change → `patch PATCH /complaints/{id} {status}` 200; `Input Resolution + Resolve Button → PATCH {status RESOLVED, resolution}`. Audit `COMPLAINT_STATUS_CHANGED`.

## UC-A-16 — Filter Complaints

- **Trigger:** `Select filter ALL` → `visible = rows filter status==value`.

## UC-A-17 — View Audit Log (Append-Only)

- **Route:** `/admin/audit`.
- **State:** `AuditRow {id,BIGSERIAL actorId,actorRole,action,resourceType,resourceId,newValue json,createdAt}, rows|null, err, page, totalPages size25`.
- **Flow:** `GET /admin/audit?page&size=25 → {content,totalPages,number}` `hasAnyRole ADMIN`.
- **UI:** Header `ScrollText Audit log Append-only + Refresh`, Err `Alert`, `Skeleton`, empty `No audit entries`, table `When localeString + Actor Badge SUPER_ADMIN brand + id8 mono + Action mono + Resource type + Detail truncate mono newValue`, pagination `Page x of y + Previous/Next Buttons disabled first/last`.
- **DB:** `audit_logs` append-only `REVOKE UPDATE/DELETE for inko_app` in V10; actions logged: `ADMIN_ROLE_CHANGED, ADMIN_USER_STATUS_CHANGED, REFUND_APPROVED/REJECTED, COMPLAINT_STATUS_CHANGED, SHOP_DELETE` etc. `old/new jsonb`.

## UC-A-18 — Paginate Audit Log

- **Trigger:** `Next → page+1` `GET ?page=next`, `Previous → page-1`.

## UC-A-19 — Platform Analytics Access

- **Flow:** `GET /analytics/overview (platform) + /revenue + /mix + /series` already in dashboard; also could call `GET /analytics/revenue?shopId` individually to drill per shop.

## UC-A-20 — User Count & Health Probe

- **Flow:** `GET /admin/users/count → {total,active}` displayed `Users {total • active}`. `GET /actuator/health → {status UP/DOWN}` probe `fetch ${baseURL without /api}/actuator/health` fallback `UNKNOWN` shown `System health`.

## UC-A-21 — Admin Profile / Settings

- **Routes:** `/admin/profile → Profile home /admin/dashboard Badge ADMIN`, `/admin/settings → SettingsPage` same 4 rows. Purpose: same as customer but admin footer.

## UC-A-22 — Admin Access Guard & Redirect

- **Flow:** Customer tries `/admin/dashboard` → `AreaGuard admin: sessionArea customer !== admin` → `Different console required: Customer → Admin  Buttons Sign in to Admin / Back to my Customer`. Not logged → `Navigate /admin/login`.

## UC-A-23 — Admin QR Overview (Hidden but Exists)

- **Flow:** `GET /api/admin/qr?shopId` list all QRs across shops for platform view (not in UI but endpoint). Used to audit QR `REPLACED` chains.

## UC-A-24 — Admin Shop View (All Shops)

- **Already UC-A-04** but filter not needed — admin sees `CLOSED|SUSPENDED` as well whereas customer only `OPEN|BUSY`.

## UC-A-25 — Security Enforcement Verification

- **Use Case:** Non-admin `GET /api/admin/users` → `403 FORBIDDEN You do not have permission`. Admin `GET /api/shops/mine` works but returns owned shops (if admin also shopkeeper). `POST /api/shops` admin can create shops (has `SHOPKEEPER` perms via role).

## UC-A-26 — Creating Admin Account for Testing (Browser Explicit)

- **Goal (Testing):** Obtain Admin login for browser testing — note: Admin cannot self-register as `SHOP_OWNER`; must be promoted.
- **Pre:** `devMode true seed-dev-data true` seeds `dev admin: admin@inko.local / Admin@123` (from `DevDataSeeder`) or manual promotion via DB.
- **Browser Steps (Create then Promote):**
  1. Create user as per UC-C-22 `testadmin+{ts}@test.inko / Test@12345` → `CUSTOMER`.
  2. Promote: `psql → INSERT INTO user_roles … SELECT id FROM roles WHERE name='ADMIN'` or `PATCH /api/admin/users/{id}/roles {roles:[CUSTOMER,ADMIN]}` as existing admin (use `admin@inko.local` login to call). Verify `GET /admin/users/{id}` shows `ADMIN`.
  3. Or directly login with seeded `admin@inko.local / Admin@123` (if seed ran) → test without creation.
  4. DB: `SELECT email, name FROM users JOIN user_roles … WHERE email='admin@inko.local'` role `ADMIN` `SUPER_ADMIN` optional `passwordHash BCrypt`, `status ACTIVE`.
- **UI Note:** `Welcome` `SHOP_OWNER` does not create admin; must use admin promotion flow.

## UC-A-27 — Logging In as Admin for Testing (Browser Explicit)

- **Goal:** Verify admin console via browser + seed credentials + password reset.
- **Pre:** Admin exists (seed or promoted), `http://localhost:5173/admin/login`.
- **Password Path (Browser):**
  1. `Mail identifier admin@inko.local + Lock Admin@123 → Sign in to admin ArrowRight lg` → `POST /auth/login 200 roles [ROLE_ADMIN] perms 21` → `lastLoginRole admin` → `→ /admin/dashboard` `ShieldCheck Admin console + Grid4 totals`.
  2. Verify `GET /admin/users 200`, `GET /analytics/overview 200`, `GET /admin/audit 200`.
  3. Hard refresh → `AuthProvider GET /users/me shopId null` → stays admin; navigate ` /shop/dashboard` → `AreaGuard Different console required: Admin → Shop`.
- **Forgot + Re-login:** `Forgot? not in admin UI` → use `http://localhost:5173/forgot-password` with `admin@inko.local → devCode → reset → login new pwd` verified.
- **Negative Tests:** Customer `testcust` → `POST /auth/login` succeeds but `AdminLogin` UI check `This account is not an admin` prevents navigation; direct `GET /admin/users` with customer `Bearer` → `403 FORBIDDEN`.
- **Seed Test Data:** After login, verify `GET /admin/users/count {total,active}`, `GET /shops` shows all shops including `CLOSED`, `GET /admin/audit page0` has `ADMIN_ROLE_CHANGED` etc.

---

### Traceability Admin

| UC | File:Endpoint |
|---|---|
| A-03 | `admin/Dashboard.tsx:GET /analytics/overview + /shops + /actuator/health + /mix + /series` |
| A-07 | `admin/Users.tsx:PATCH /admin/users/{id}/roles` |
| A-08 | `PATCH /admin/users/{id}/status` |
| A-10 | `admin/Orders.tsx:Promise.all GET /orders/shop/{shopId}` |
| A-13 | `OrderDetail.tsx:POST /refunds/{id}/decision` |
| A-14 | `admin/Complaints.tsx:PATCH /complaints/{id}` |
| A-17 | `admin/Audit.tsx:GET /admin/audit?page&size` |

*Cross-checked `admin/*.tsx` + `AdminUserController.java`, `PaymentService.decideRefund`, `ComplaintController`, `AuditLog`.*
