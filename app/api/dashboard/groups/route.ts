import { NextRequest } from "next/server";
import { hasDashboardSession } from "@/lib/dashboard-auth";
import { query, transaction } from "@/lib/db";
import { json, validateUid } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (!hasDashboardSession(req)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  try {
    const result = await query("SELECT g.id,g.name,g.status,g.created_at,COALESCE(json_agg(json_build_object('uid',p.uid,'nickname',p.nickname,'role',m.role)) FILTER (WHERE p.uid IS NOT NULL),'[]'::json) AS members FROM madara_groups g LEFT JOIN madara_group_members m ON m.group_id=g.id LEFT JOIN madara_players p ON p.uid=m.uid GROUP BY g.id ORDER BY g.created_at DESC LIMIT 30");
    return json({ ok: true, groups: result.rows });
  } catch { return json({ ok: false, error: process.env.DATABASE_URL ? "DATABASE_ERROR" : "DATABASE_NOT_CONFIGURED" }, 503); }
}
export async function POST(req: NextRequest) {
  if (!hasDashboardSession(req)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  let body: Record<string, unknown>;
  try { const value: unknown = await req.json(); if (!value || typeof value !== "object" || Array.isArray(value)) return json({ ok: false, error: "INVALID_JSON" }, 400); body = value as Record<string, unknown>; }
  catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  const leaderUid = validateUid(typeof body.leaderUid === "string" ? body.leaderUid : null);
  const name = typeof body.name === "string" ? body.name.trim() : "Madara Squad";
  const members = Array.isArray(body.members) ? body.members : [];
  const allUids = [leaderUid, ...members];
  if (!leaderUid || !name || name.length > 40 || members.length !== 4 || allUids.some(uid => typeof uid !== "string" || !/^\d{5,20}$/.test(uid)) || new Set(allUids).size !== 5) return json({ ok: false, error: "INVALID_GROUP", message: "Vendos 5 UID unike: 1 lider dhe 4 lojtare." }, 400);
  try {
    const group = await transaction(async client => {
      const registered = await client.query("SELECT uid FROM madara_players WHERE uid=ANY($1::varchar[])", [allUids]);
      if (registered.rowCount !== 5) throw new Error("PLAYERS_MISSING");
      const created = await client.query("INSERT INTO madara_groups(name,leader_uid) VALUES($1,$2) RETURNING id,name,leader_uid,status,created_at", [name, leaderUid]);
      for (const uid of allUids) await client.query("INSERT INTO madara_group_members(group_id,uid,role) VALUES($1,$2,$3)", [created.rows[0].id, uid, uid === leaderUid ? "leader" : "member"]);
      return created.rows[0];
    });
    return json({ ok: true, group, capacity: 5, members: allUids, note: "Squad created in Madara database only; no Free Fire lobby was created." }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "PLAYERS_MISSING") return json({ ok: false, error: "PLAYERS_NOT_REGISTERED", message: "Regjistro fillimisht te 5 UID-te." }, 400);
    return json({ ok: false, error: process.env.DATABASE_URL ? "DATABASE_ERROR" : "DATABASE_NOT_CONFIGURED" }, 503);
  }
}
