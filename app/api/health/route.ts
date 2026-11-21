import { NextRequest } from "next/server";
import { databaseHealth } from "@/lib/db";
import { json, requireAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  try {
    await databaseHealth();
    return json({ ok: true, service: "Madara FF API", region: "EU", status: "online", storage: "connected", integration: "madara_owned" });
  } catch (error) {
    const message = error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
      ? "Set DATABASE_URL in Vercel Environment Variables."
      : "The database could not be reached.";
    return json({ ok: false, error: "DATABASE_UNAVAILABLE", message }, 503);
  }
}
