import { NextResponse } from "next/server";
import { listLicenses } from "../../../lib/release-store";

export async function GET() {
  const licenses = await listLicenses();
  return NextResponse.json({ licenses });
}

