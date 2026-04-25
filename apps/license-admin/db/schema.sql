create extension if not exists pgcrypto;

create table if not exists licenses (
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

create table if not exists license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  device_id_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (license_id, device_id_hash)
);

create table if not exists update_policy (
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

insert into update_policy (
  id,
  latest_version,
  minimum_supported_version,
  force_update,
  download_url,
  sha256,
  release_date,
  release_notes
) values (
  'default',
  '0.1.0-beta.1',
  '0.1.0-beta.1',
  false,
  '/download',
  'TBD',
  '2026-04-24',
  '["Windows MSI beta installer scaffold", "Scope 1/2 desktop app shell", "License and update management API draft"]'::jsonb
) on conflict (id) do nothing;

insert into licenses (
  customer,
  license_key,
  status,
  expires_at,
  max_devices,
  note
) values (
  '파일럿 고객사',
  'GHG-DEMO-0001',
  'active',
  '2026-12-31',
  3,
  '초기 베타 테스트용'
) on conflict (license_key) do nothing;

