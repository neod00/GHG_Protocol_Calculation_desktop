export type LicenseStatus = "active" | "expired" | "blocked";

export interface LicenseRecord {
  customer: string;
  key: string;
  status: LicenseStatus;
  expiresAt: string;
  devices: number;
  maxDevices: number;
  note: string;
}

export interface UpdatePolicy {
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  downloadUrl: string;
  sha256: string;
  releaseDate: string;
  releaseNotes: string[];
}

export interface ReleaseStoreSnapshot {
  updatePolicy: UpdatePolicy;
  licenseRecords: LicenseRecord[];
}

