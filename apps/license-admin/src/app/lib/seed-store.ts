import type { ReleaseStoreSnapshot } from "./types";

export const seedStore: ReleaseStoreSnapshot = {
  updatePolicy: {
    latestVersion: "0.1.0-beta.1",
    minimumSupportedVersion: "0.1.0-beta.1",
    forceUpdate: false,
    downloadUrl: "/download",
    sha256: "TBD",
    releaseDate: "2026-04-24",
    releaseNotes: [
      "Windows MSI beta installer scaffold",
      "Scope 1/2 desktop app shell",
      "License and update management API draft"
    ]
  },
  licenseRecords: [
    {
      customer: "파일럿 고객사",
      key: "GHG-DEMO-0001",
      status: "active",
      expiresAt: "2026-12-31",
      devices: 1,
      maxDevices: 3,
      note: "초기 베타 테스트용"
    }
  ]
};

