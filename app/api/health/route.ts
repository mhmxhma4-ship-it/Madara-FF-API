import { NextRequest } from "next/server";
import { json, requireAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return json({ ok: true, service: "Madara FF API", region: "EU", status: "online", integration: "not_configured" });
}