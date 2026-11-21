import { NextRequest } from "next/server";
import { hasDashboardSession } from "@/lib/dashboard-auth";
import { query } from "@/lib/db";
import { json, validateUid } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (!hasDashboardSession(req)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  try {
    const result = await query("SELECT uid,nickname,region,created_at FROM madara_players ORDER BY created_at DESC LIMIT 100");
    return json({ ok: true, players: result.rows });
  } catch { return json({ ok: false, error: process.env.DATABASE_URL ? "DATABASE_ERROR" : "DATABASE_NOT_CONFIGURED" }, 503); }
}
export async function POST(req: NextRequest) {
  if (!hasDashboardSession(req)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  let body: Record<string, unknown>;
  try { const value: unknown = await req.json(); if (!value || typeof value !== "object" || Array.isArray(value)) return json({ ok: false, error: "INVALID_JSON" }, 400); body = value as Record<string, unknown>; }
  catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const uid = validateUid(typeof body.uid === "string" ? body.uid : null);
  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
  if (!uid || !nickname || nickname.length > 32) return json({ ok: false, error: "INVALID_PLAYER", message: "UID duhet te kete 5-20 shifra dhe nickname 1-32 karaktere." }, 400);
  try {
    const result = await query("INSERT INTO madara_players(uid,nickname,region) VALUES($1,$2,'EU') ON CONFLICT(uid) DO UPDATE SET nickname=EXCLUDED.nickname,updated_at=NOW() RETURNING uid,nickname,region,created_at", [uid, nickname]);
    return json({ ok: true, player: result.rows[0] }, 201);
  } catch { return json({ ok: false, error: process.env.DATABASE_URL ? "DATABASE_ERROR" : "DATABASE_NOT_CONFIGURED" }, 503); }
}
