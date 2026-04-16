import { NextRequest, NextResponse } from "next/server";
import { getCertByNumber } from "@/lib/psa-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certNumber: string }> }
) {
  try {
    const { certNumber } = await params;
    const cert = await getCertByNumber(certNumber);
    if (!cert) {
      return NextResponse.json({ error: "Cert not found" }, { status: 404 });
    }
    return NextResponse.json(cert);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
