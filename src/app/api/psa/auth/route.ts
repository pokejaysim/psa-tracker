import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/psa-api";

export async function POST() {
  try {
    await getAuthToken();
    return NextResponse.json({ status: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
