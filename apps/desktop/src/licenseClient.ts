import { APP_VERSION, LICENSE_VERIFY_URL } from "./config";

export type LicenseReason =
  | "ok"
  | "blocked"
  | "expired"
  | "device_limit_exceeded"
  | "license_not_found"
  | "invalid_json"
  | "network_error"
  | "unknown";

export interface LicenseVerificationResult {
  ok: boolean;
  status?: "active" | "expired" | "blocked";
  customer?: string;
  expiresAt?: string;
  maxDevices?: number;
  forceUpdate?: boolean;
  minimumSupportedVersion?: string;
  latestVersion?: string;
  updateUrl?: string;
  reason: LicenseReason;
}

function getOrCreateDeviceIdHash(): string {
  const storageKey = "ghg-desktop-device-id-hash";
  const saved = localStorage.getItem(storageKey);
  if (saved) return saved;

  const generated =
    crypto.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(storageKey, generated);
  return generated;
}

export async function verifyLicense(licenseKey: string): Promise<LicenseVerificationResult> {
  try {
    const response = await fetch(LICENSE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenseKey,
        appVersion: APP_VERSION,
        deviceIdHash: getOrCreateDeviceIdHash()
      })
    });

    const result = (await response.json()) as Partial<LicenseVerificationResult>;

    return {
      ok: Boolean(result.ok),
      status: result.status,
      customer: result.customer,
      expiresAt: result.expiresAt,
      maxDevices: result.maxDevices,
      forceUpdate: result.forceUpdate,
      minimumSupportedVersion: result.minimumSupportedVersion,
      latestVersion: result.latestVersion,
      updateUrl: result.updateUrl,
      reason: (result.reason as LicenseReason | undefined) ?? (response.ok ? "ok" : "unknown")
    };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
