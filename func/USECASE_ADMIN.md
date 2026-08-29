# Use Cases — Admin / Super Admin v2.0 Exhaustive

**Actor:** Admin `ROLE_ADMIN` / Super Admin `ROLE_SUPER_ADMIN` — hierarchy SUPER > ADMIN, perms 21 vs super 25+, lastLoginRole admin, AreaGuard admin
**Source:** `AdminLogin.tsx` `admin/Dashboard.tsx` `admin/Shops.tsx` `admin/Users.tsx` `admin/Orders.tsx` `admin/Complaints.tsx` `admin/Audit.tsx` + `AdminUserService` `AuditService` `ComplaintController` `ShopController` `AnalyticsService` `SecurityConfig`
**Language:** English — per row Frontend + Backend + smallest UI.

> Prefix `UC-A-`.

---

## UC-A-01 — Admin Login

- **Goal:** Enter governance console.
- **Flow:** /admin/login ShieldCheck gradient Mail lower + Lock → POST /auth/login → 200 ROLE_ADMIN/SUPER 21 perms lastLoginRole admin → AdminShell NAV6 Overview/Shops/Users/Orders/Complaints/Audit indigo ADMIN Bell refund/complaint. Guard canAccessAdmin ADMIN|SUPER else Different console.

## UC-A-02 — Overview Dashboard

- **Flow:** GET /analytics/overview platform no shopId + GET /shops all sorted + GET /actuator/health + GET /analytics/mix + GET /analytics/series?days=7 → Grid4 Total Orders Total Revenue Shops Users Active Shops table Search health Backend/DATABASE badges mix Progress series7 Bars.

## UC-A-03 — Shops View All

- **Flow:** /admin/shops GET /api/shops admin all grid3 Building2 Badge OPEN/CLOSED View live queue → /queue/:id (any shop).

## UC-A-04 — Users Manage Roles/Status

- **Flow:** GET /admin/users?size100 + /admin/users/count {total,active} Search name/email/phone mono id8 Table Name Contact Roles brand Status success canEdit !=self Edit roles checkboxes 4 CUSTOMER SHOPKEEPER ADMIN SUPER_ADMIN inline gap2 Save ShieldCheck → PATCH /admin/users/:id/roles → audit ADMIN_ROLE_CHANGED, Suspend ShieldAlert → PATCH /status SUSPENDED/ACTIVE → audit, self-suspend blocked 400 You cannot change own status, ADMIN cannot grant SUPER escalation should be SUPER only (P1).

## UC-A-05 — Orders View All Shops

- **Flow:** GET /shops → shopNames map Promise.all GET /orders/shop/:id per shop flat sort desc Select All shops filter table mono8 Order Printer Badge Clock3 Date Amount Open → /order/:id admin detail.

## UC-A-06 — Order Detail Admin + Refund Decision

- **Flow:** /order/:id as admin same as customer + if refund REQUESTED Buttons Approve/Reject → POST /refunds/:id/decision {APPROVE|REJECTED} → refund APPROVED→COMPLETED if full Payment REFUNDED/PARTIAL Order REFUNDED if full notify REFUND_…

## UC-A-07 — Complaints List & Resolve

- **Flow:** GET /complaints?size100 cards mono category Badge success/danger description bg-slate-50 Select filter ALL Search Set status Select → PATCH /complaints/:id {status, resolution, assignedTo} → RESOLVED audit COMPLAINT_STATUS_CHANGED notify customer. IDOR no principal P1.

## UC-A-08 — Audit Log

- **Flow:** GET /admin/audit?page&size25 → content totalPages table When Actor Badge SUPER_ADMIN brand id8 Action mono Resource Detail truncate Page x of y Prev/Next size unclamped OOM page negative 500, append-only REVOKE UPDATE/DELETE for inko_app else mutable.

## UC-A-09 — Security Isolation

- **Flow:** CUSTOMER → /admin/dashboard AreaGuard Different console, CUSTOMER GET /admin/users → 403 FORBIDDEN, CUSTOMER GET /orders/shop/victim → IDOR 200 should be 403 ownership check.

## UC-A-10 — Super Admin Governance

- **Flow:** SUPER can grant ADMIN, suspend ADMIN, system config, high governance; ADMIN cannot. Hierarchy enforced via role check.

*Admin flows verified static; hardening P1 after PG fix.*

