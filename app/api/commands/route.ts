import { NextRequest } from "next/server";
import { json, requireAuth, validateUid } from "@/lib/http";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth) return auth;

  try {
    const body = await req.json();
    const uid = validateUid(String(body.uid ?? ""));
    const command = String(body.command ?? "").trim();

    if (!uid) {
      return json({ ok: false, error: "INVALID_UID" }, 400);
    }

    if (!command.startsWith("/")) {
      return json({ ok: false, error: "INVALID_COMMAND" }, 400);
    }

    const parts = command.slice(1).trim().split(/\s+/);
    const action = (parts[0] ?? "").toLowerCase();

    if (action === "help") {
      return json({
        ok: true,
        commands: ["/help", "/5", "/status"]
      });
    }

    if (action === "5" || action === "status") {
      const owner = validateUid(process.env.MADARA_OWNER_UID ?? null);

      if (!owner || uid !== owner) {
        return json({ ok: false, error: "NOT_AUTHORIZED" }, 403);
      }

      const group = await query(
        `SELECT g.id, g.name, g.status,
                m.uid, m.role, p.nickname
         FROM madara_groups g
         LEFT JOIN madara_group_members m ON m.group_id = g.id
         LEFT JOIN madara_players p ON p.uid = m.uid
         WHERE g.leader_uid = $1 AND g.status = 'open'
         ORDER BY g.created_at DESC, m.joined_at ASC
         LIMIT 5`,
        [owner]
      );

      if (!group.rows.length) {
        return json({ ok: false, error: "GROUP_NOT_FOUND" }, 404);
      }

      return json({
        ok: true,
        group: {
          id: group.rows[0].id,
          name: group.rows[0].name,
          status: group.rows[0].status,
          members: group.rows.map((row) => ({
            uid: row.uid,
            nickname: row.nickname,
            role: row.role
          }))
        },
        capacity: 5
      });
    }

    return json({ ok: false, error: "UNKNOWN_COMMAND" }, 400);
  } catch {
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
}
