# License Admin Storage Plan

## Current State

The license admin app currently uses an in-repo seed repository:

- `apps/license-admin/src/app/lib/types.ts`
- `apps/license-admin/src/app/lib/seed-store.ts`
- `apps/license-admin/src/app/lib/release-store.ts`

The app UI and APIs already call repository functions instead of importing constants directly. This makes the next storage change isolated to the repository layer.

## API Surface

- `GET /api/updates/latest`
  - Used by the desktop app to check the latest version and forced update policy.
- `POST /api/licenses/verify`
  - Used by the desktop app to verify license status.
- `GET /api/admin/licenses`
  - Used by the admin UI to list licenses.

## Recommended Production Storage

Use a small hosted Postgres database for production.

Recommended options:

1. Neon Postgres
2. Vercel Postgres/Marketplace Postgres
3. Supabase Postgres only for license/admin metadata

The desktop app's customer calculation data must not be stored here. This DB is only for license keys, update policy, customer status, and device activation metadata.

## Minimum Tables

```sql
create table licenses (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  license_key text not null unique,
  status text not null check (status in ('active', 'expired', 'blocked')),
  expires_at date not null,
  max_devices integer not null default 1,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  device_id_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (license_id, device_id_hash)
);

create table update_policy (
  id text primary key default 'default',
  latest_version text not null,
  minimum_supported_version text not null,
  force_update boolean not null default false,
  download_url text not null,
  sha256 text not null,
  release_date date not null,
  release_notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
```

## Next Implementation Step

Replace `seed-store.ts` with a Postgres-backed implementation and keep the public repository functions unchanged:

- `getUpdatePolicy`
- `listLicenses`
- `findLicenseByKey`

