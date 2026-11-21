import { NextResponse } from "next/server";
import { clearDashboardSession } from "@/lib/dashboard-auth";
export const runtime = "nodejs";
export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  clearDashboardSession(response);
  return response;
}
