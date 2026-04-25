import { neon } from "@neondatabase/serverless";
import type { LicenseRecord, ReleaseStoreSnapshot, UpdatePolicy } from "./types";

interface LicenseRow {
  customer: string;
  license_key: string;
  status: LicenseRecord["status"];
  expires_at: string | Date;
  device_count: number | string | null;
  max_devices: number;
  note: string;
}

interface UpdatePolicyRow {
  latest_version: string;
  minimum_supported_version: string;
  force_update: boolean;
  download_url: string;
  sha256: string;
  release_date: string | Date;
  release_notes: string[] | string;
}

function formatDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function normalizeReleaseNotes(value: string[] | string): string[] {
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return neon(databaseUrl);
}

export async function getPostgresReleaseStore(): Promise<ReleaseStoreSnapshot | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  const [policyRows, licenseRows] = await Promise.all([
    sql`
      select
        latest_version,
        minimum_supported_version,
        force_update,
        download_url,
        sha256,
        release_date,
        release_notes
      from update_policy
      where id = 'default'
      limit 1
    `,
    sql`
      select
        l.customer,
        l.license_key,
        l.status,
        l.expires_at,
        coalesce(count(d.id), 0) as device_count,
        l.max_devices,
        l.note
      from licenses l
      left join license_devices d on d.license_id = l.id
      group by l.id
      order by l.created_at desc
    `
  ]) as [UpdatePolicyRow[], LicenseRow[]];

  const policyRow = policyRows[0];
  if (!policyRow) return null;

  const updatePolicy: UpdatePolicy = {
    latestVersion: policyRow.latest_version,
    minimumSupportedVersion: policyRow.minimum_supported_version,
    forceUpdate: policyRow.force_update,
    downloadUrl: policyRow.download_url,
    sha256: policyRow.sha256,
    releaseDate: formatDate(policyRow.release_date),
    releaseNotes: normalizeReleaseNotes(policyRow.release_notes)
  };

  const licenseRecords: LicenseRecord[] = licenseRows.map((row) => ({
    customer: row.customer,
    key: row.license_key,
    status: row.status,
    expiresAt: formatDate(row.expires_at),
    devices: Number(row.device_count ?? 0),
    maxDevices: row.max_devices,
    note: row.note
  }));

  return { updatePolicy, licenseRecords };
}
