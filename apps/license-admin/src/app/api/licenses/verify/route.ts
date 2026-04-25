import { NextRequest, NextResponse } from "next/server";
import { compareSemverLike, findLicenseByKey, getUpdatePolicy } from "../../../lib/release-store";

interface VerifyLicenseRequest {
  licenseKey?: string;
  appVersion?: string;
  deviceIdHash?: string;
}

export async function POST(request: NextRequest) {
  let payload: VerifyLicenseRequest;

  try {
    payload = (await request.json()) as VerifyLicenseRequest;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const licenseKey = payload.licenseKey?.trim();
  const [record, updatePolicy] = await Promise.all([
    licenseKey ? findLicenseByKey(licenseKey) : Promise.resolve(undefined),
    getUpdatePolicy()
  ]);

  if (!record) {
    return NextResponse.json({ ok: false, reason: "license_not_found" }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const expiredByDate = record.expiresAt < today;
  const blocked = record.status === "blocked";
  const expired = record.status === "expired" || expiredByDate;
  const deviceLimitExceeded = record.devices > record.maxDevices;
  const appVersion = payload.appVersion ?? "0.0.0";
  const forceUpdate = compareSemverLike(appVersion, updatePolicy.minimumSupportedVersion) < 0;

  return NextResponse.json({
    ok: !(blocked || expired || deviceLimitExceeded),
    status: blocked ? "blocked" : expired ? "expired" : record.status,
    customer: record.customer,
    expiresAt: record.expiresAt,
    maxDevices: record.maxDevices,
    forceUpdate,
    minimumSupportedVersion: updatePolicy.minimumSupportedVersion,
    latestVersion: updatePolicy.latestVersion,
    updateUrl: updatePolicy.downloadUrl,
    reason: blocked
      ? "blocked"
      : expired
        ? "expired"
        : deviceLimitExceeded
          ? "device_limit_exceeded"
          : "ok"
  });
}
