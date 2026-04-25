# Vercel + Neon Postgres Setup

## What This Is For

This database stores only license/admin metadata:

- license keys
- license status
- expiration dates
- device activation hashes
- update policy

It must not store customer GHG calculation data or generated reports.

## Recommended Path

Use Neon Postgres through Vercel Marketplace if possible. It keeps the Vercel project and Postgres environment variables connected with less manual setup.

## Setup Steps

1. Open the Vercel project for `apps/license-admin`.
2. Go to `Storage` or `Marketplace`.
3. Search for `Neon`.
4. Create or connect a Neon Postgres database.
5. Confirm that Vercel adds `DATABASE_URL` to the project environment variables.
6. Open the Neon SQL editor or any Postgres SQL console.
7. Run [schema.sql](../apps/license-admin/db/schema.sql).
8. Redeploy the Vercel project.
9. Visit `/api/admin/licenses` and confirm the seeded license appears.
10. Visit `/api/updates/latest` and confirm update metadata appears.

## Local Development

Without `DATABASE_URL`, the app uses seed data from:

```text
apps/license-admin/src/app/lib/seed-store.ts
```

With `DATABASE_URL`, the app reads from Postgres through:

```text
apps/license-admin/src/app/lib/postgres-store.ts
```

## Environment Variable

```env
DATABASE_URL=postgres://...
```

## Current Fallback Behavior

If `DATABASE_URL` is missing, or if a Postgres query fails, the app falls back to seed data so local builds keep working.

For production, the fallback should be tightened later so DB failures are visible to the admin user.

