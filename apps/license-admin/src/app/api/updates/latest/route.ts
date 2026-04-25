import { NextResponse } from "next/server";
import { getUpdatePolicy } from "../../../lib/release-store";

export async function GET() {
  const updatePolicy = await getUpdatePolicy();

  return NextResponse.json({
    version: updatePolicy.latestVersion,
    minimumSupportedVersion: updatePolicy.minimumSupportedVersion,
    forceUpdate: updatePolicy.forceUpdate,
    downloadUrl: updatePolicy.downloadUrl,
    sha256: updatePolicy.sha256,
    releaseDate: updatePolicy.releaseDate,
    notes: updatePolicy.releaseNotes
  });
}
