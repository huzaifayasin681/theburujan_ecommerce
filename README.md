# Burujan Commerce

Burujan is a production-oriented TypeScript e-commerce monorepo. The customer storefront is Next.js App Router with TypeScript, Tailwind, shadcn-style components, TanStack Query, React Hook Form, and Zod. The API is NestJS REST with Prisma and MySQL 8+, Redis/BullMQ, Passport JWT sessions, Swagger, S3-compatible media, and provider-neutral payments.

## Project tree

```text
apps/
  web/       Next.js storefront, account, checkout, and permission-aware admin UI
  api/       NestJS modules, Prisma schema/migrations, jobs, REST API, Swagger
packages/
  types/     shared transport types
deploy/
  nginx.conf HTTPS reverse proxy example
.github/workflows/ci.yml
docker-compose.yml
```

The API owns prices, discounts, tax, shipping, coupon eligibility, inventory, payment state, authorization, and order transitions. Controllers are thin; domain operations run in services and Prisma transactions. Private customer media is served through an authenticated API endpoint, while product media can use public cacheable URLs.

## Implemented business architecture

Authentication uses Argon2id password hashes, short-lived access cookies, rotating server-stored refresh sessions, token-family revocation, email verification, password reset, verified email changes, session management, optional TOTP with recovery codes, CSRF protection, secure cookie flags in production, and Redis-backed throttling. New registrations must verify email before login.

RBAC is database-backed (`Role`, `Permission`, `UserRole`, `RolePermission`). `@Permissions()` metadata is enforced by a global guard on the API. Super administrators and system roles have transaction-level protection, including last-super-admin protection. Frontend navigation is only a usability aid; backend authorization remains authoritative.

Checkout reloads cart records and current catalog data inside a serializable transaction. It validates shipping zones/rules, tax classes/rates, coupon restrictions, and terms; uses fixed `DECIMAL(19,4)` money; reserves inventory atomically for 15 minutes; records a ledger entry; creates immutable order snapshots; and honors a unique idempotency key. COD, Stripe Checkout, and PayPal Orders are supported through a provider abstraction. Stripe and PayPal webhooks verify signatures, log events, and ignore duplicate event IDs. Browser redirects never mark a payment paid.

Orders use an explicit state machine and status history. Shipment, COD collection, cancellation, partial/full refund, return/RMA, restock, notifications, audit entries, and provider idempotency are separate concerns. Product variants use normalized attribute/value combinations and independent SKU, price, weight, active state, and inventory. Every stock change has an `InventoryTransaction` with actor, reason, reference, and timestamp.

The admin API and UI cover products, categories, brands, media, variants, inventory, orders, payments/refunds, shipping zones/methods, tax classes/rates, coupons, reviews, returns, customers, admins, roles, settings, notifications, audit logs, CSV product import/export, analytics, and date-filtered dashboard metrics. CSV imports validate every row before a single transactional write. Background jobs handle email, abandoned carts, low-stock alerts, expired promotions, reservation release, and delayed account-deletion anonymization.

## Database

The Prisma schema includes users/sessions/roles/permissions/consents, products/variants/attributes/images/categories/brands/tags, inventory/ledger/reservations, carts/wishlist, orders/items/status history/shipments, payments/events/refunds, shipping/tax, coupons/usage/restrictions, reviews/votes/media, returns/media, notifications, media, settings, idempotency records, newsletter verification, contact messages, and audit logs. Foreign-key deletion behavior preserves financial and order history. Monetary columns use fixed precision and timestamps are UTC.

## Environment

Copy `.env.example` to `.env` and replace every placeholder in a deployed environment. Startup validates the required application, database, Redis, S3, and SMTP settings.

Required groups:

- `DATABASE_URL`, `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`, `APP_URL`, `STORE_CURRENCY`
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (plus SMTP credentials when required)

Optional integrations: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_API_URL`, and `INTERNAL_API_URL`. Seed credentials are supplied only through `SEED_*` variables and are never embedded in source.

## Local installation

Prerequisites: Node 22+, npm 10+, Docker Compose.

```bash
cp .env.example .env
docker compose up -d mysql redis minio
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The storefront is `http://localhost:3000`; the API is `http://localhost:4000/api/v1`; Swagger is `http://localhost:4000/api/docs` in non-production environments. MinIO is available at ports `33221` (S3) and `33222` (console). The compose file uses persistent volumes and health checks.

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e -w @burujan/api
npm run build
```

Prisma workflows:

```bash
npm run db:generate
npm run db:migrate                         # development migration
npm run prisma:deploy -w @burujan/api     # production, non-destructive
npm run db:seed
```

The API health endpoint is `GET /api/v1/health`; `?deep=true` additionally checks Redis and S3 without exposing credentials. CI runs install, migration deployment, generation, lint, type checking, unit/API tests, and production builds with MySQL and Redis service containers.

## Production/VPS deployment

1. Provision MySQL 8.4+, Redis, S3-compatible storage, SMTP, a non-root deploy account, DNS, and TLS.
2. Store `.env` in a protected secret store or root-owned file. Never commit it or put secrets in a workflow.
3. Build immutable images with `docker compose build`; run `node_modules/.bin/prisma migrate deploy` once per release before starting API replicas.
4. Use `deploy/nginx.conf` as the reverse-proxy starting point. Replace the example server name, install certificates, preserve `X-Forwarded-*` headers, and keep infrastructure ports private.
5. Set `INTERNAL_API_URL=http://api:4000/api/v1` for server-side Next.js fetches. Disable Swagger in production unless it is protected by network or identity controls.
6. Monitor `/api/v1/health`, structured JSON logs, request IDs, failed jobs, database capacity, Redis health, and payment webhook failures.

## Backup and restore

Run encrypted nightly `mysqldump --single-transaction --routines --triggers` backups with daily/weekly/monthly retention and off-server copies. Enable S3 versioning and lifecycle retention. For a restore, create an empty MySQL database, import the selected dump, run only pending Prisma migrations, validate row counts and recent orders/payments, point a staging API at the result, and exercise login/catalog/order reads before switching traffic. Perform a documented restore drill at least quarterly and verify backup encryption keys separately.

## Development users and external credentials

No production password is shipped. In development, set `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD`, `SEED_ADMIN_*`, and `SEED_USER_*` before running the seed. Production seeding creates only roles and permissions. Live card/PayPal charges, SMTP delivery, S3 storage, TLS, domain DNS, and monitoring still require deployment-specific credentials and configuration. Courier APIs and search engines such as Elasticsearch/Meilisearch remain optional extension points; the initial search implementation uses indexed Prisma queries.

## Security and privacy notes

Inputs are DTO-validated and transformed server-side. Responses use a consistent error shape and do not expose stack traces, hashes, tokens, card data, or provider secrets. Rate limits cover authentication, verification, reviews, coupons, checkout, contact, newsletter, and uploads. Account export, consent records, deletion requests, delayed anonymization, cookie policy pages, audit logs, safe upload signatures, IDOR ownership checks, pagination, and soft deletion support privacy and operational controls; deployment-specific legal obligations still need jurisdictional review.
