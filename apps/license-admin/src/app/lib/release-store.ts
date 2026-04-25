import { seedStore } from "./seed-store";
import { getPostgresReleaseStore } from "./postgres-store";
import type { LicenseRecord, ReleaseStoreSnapshot, UpdatePolicy } from "./types";

export async function getReleaseStore(): Promise<ReleaseStoreSnapshot> {
  try {
    const postgresStore = await getPostgresReleaseStore();
    if (postgresStore) return postgresStore;
  } catch (error) {
    console.error("Falling back to seed license store.", error);
  }

  return seedStore;
}

export async function getUpdatePolicy(): Promise<UpdatePolicy> {
  const store = await getReleaseStore();
  return store.updatePolicy;
}

export async function listLicenses(): Promise<LicenseRecord[]> {
  const store = await getReleaseStore();
  return store.licenseRecords;
}

export async function findLicenseByKey(key: string): Promise<LicenseRecord | undefined> {
  const licenses = await listLicenses();
  return licenses.find((license) => license.key === key);
}

export function compareSemverLike(left: string, right: string): number {
  const normalize = (value: string) =>
    value
      .replace(/^v/i, "")
      .split(/[.-]/)
      .map((part) => {
        const parsed = Number.parseInt(part, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      });

  const leftParts = normalize(left);
  const rightParts = normalize(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}
