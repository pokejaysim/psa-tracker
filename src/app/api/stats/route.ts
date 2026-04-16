import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/queries/stats";

export async function GET() {
  const stats = getDashboardStats();
  return NextResponse.json(stats);
}
