import { NextRequest, NextResponse } from "next/server";
import { createDashboardSession, verifyDashboardPassword } from "@/lib/dashboard-auth";
import { json } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const password = body && typeof body === "object" && "password" in body && typeof body.password === "string" ? body.password : "";
  if (!verifyDashboardPassword(password)) return json({ ok: false, error: "INVALID_PASSWORD" }, 401);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  createDashboardSession(response);
  return response;
}
