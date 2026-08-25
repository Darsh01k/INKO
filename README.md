# Inko — Multi-Shop Smart Printing & Token Management Platform

Customers upload documents, configure prints, pick a nearby shop, pay (mock gateway for local dev),
receive a queue token, and track printing in real time. Shopkeepers run queues, printers, inventory
and pricing. Admins govern the platform.

## Workflow

`UPLOAD → ANALYZE → CONFIGURE → SHOP SELECTION → PRICE → PAYMENT → TOKEN → QUEUE → PRINTING → COMPLETION`

Roles: **CUSTOMER · SHOPKEEPER · ADMIN · SUPER_ADMIN**

## Architecture

```
Inko/
├── backend/                 Spring Boot 4 (Java 21 target, runs on installed JDK)
│   └── src/main/resources/
│       ├── application.yml  Config (env-var overrides supported)
│       └── db/migration/    Flyway migrations V1..V11 (41 tables, all constraints/indexes)
├── frontend/                React + TypeScript + Vite + Tailwind v4
│   └── src/
│       ├── lib/api.ts       Axios client with JWT interceptor
│       └── App.tsx          Route map (grows each phase)
├── scripts/                 db-start.bat / db-stop.bat (local portable PostgreSQL 17)
├── PROGRESS.md              Phase-by-phase build status
├── DEFERRED.md              Mocked / not-implemented items (payments, SMS, S3…)
├── docker-compose.yml       For future containerized deployment (Docker not required locally)
└── .env.example             Environment template
```

### Backend modules (added per phase)

| Module | Purpose |
|---|---|
| identity | users, roles, permissions, JWT auth, OTP |
| shops | tenants, keepers, hours |
| catalog | paper types, printers, shop inventory |
| documents | upload, analysis engine |
| pricing | pricing rules, discounts, coupons (BigDecimal) |
| orders | orders, configurations, state machine |
| tokens | token sequences, queue entries |
| payments | PaymentProvider abstraction (Mock) |
| support | complaints, notifications, audit |

### Database

PostgreSQL 17 — schema is created exclusively by Flyway migrations (`V1__helpers.sql` … `V11__seed_reference.sql`).
Key tables: `users, roles, permissions, user_roles, refresh_tokens, otp_codes, shopkeepers, shops,
operating_hours, shopkeeper_permissions, paper_types, printers, printer_paper_sizes,
shop_paper_inventory, documents, document_pages, pricing_rules, discount_rules, coupons,
coupon_redemptions, print_configurations, orders, order_items, token_sequences, tokens,
queue_entries, printer_jobs, payments, payment_transactions, refunds, invoices, complaints,
notifications, notification_preferences, qr_codes, qr_scan_events, audit_logs (append-only),
failed_jobs, system_settings`.

Money columns are `NUMERIC` (never float). Orders store an immutable `pricing_snapshot`.
Token numbers are allocated via `token_sequences` row-locking (concurrency-safe).

## Local development

Prerequisites: JDK 21+, Node 20+, PostgreSQL 17 (any local install works — point `INKO_DB_URL` at it).

```powershell
# 1. Database
scripts\db-start.bat

# 2. Backend (port 8080; Swagger at /swagger-ui.html)
cd backend; .\mvnw.cmd spring-boot:run

# 3. Frontend (port 5173, proxies /api to 8080)
cd frontend; npm run dev
```

Connection defaults live in `backend/src/main/resources/application.yml`; override any of them via the env vars in `.env.example`.

## Testing

```powershell
cd backend; .\mvnw.cmd test      # JUnit: unit, security, concurrency (token), pricing
cd frontend; npm run test        # Vitest (from Phase 6 onward)
```

## Status & deferred features

- Progress tracker: [PROGRESS.md](PROGRESS.md)
- Mocked/not implemented (real gateways, SMS, S3, Redis…): [DEFERRED.md](DEFERRED.md)
