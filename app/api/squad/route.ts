import { NextRequest } from "next/server";
import { query, transaction } from "@/lib/db";
import { json, requireAuth, validateUid } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ownerUid() {
  return validateUid(process.env.MADARA_OWNER_UID ?? null);
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth) return auth;

  const owner = ownerUid();
  if (!owner) {
    return json({ ok: false, error: "OWNER_NOT_CONFIGURED" }, 503);
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return json({ ok: false, error: "GROUP_ID_REQUIRED" }, 400);

    const result = await query(
      `SELECT g.id, g.name, g.status, g.created_at,
              m.uid, m.role, p.nickname
       FROM madara_groups g
       LEFT JOIN madara_group_members m ON m.group_id = g.id
       LEFT JOIN madara_players p ON p.uid = m.uid
       WHERE g.id = $1 AND g.leader_uid = $2
       ORDER BY m.joined_at`,
      [id, owner]
    );

    if (!result.rows.length) {
      return json({ ok: false, error: "GROUP_NOT_FOUND" }, 404);
    }

    return json({
      ok: true,
      group: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        status: result.rows[0].status,
        members: result.rows.map((row) => ({
          uid: row.uid,
          nickname: row.nickname,
          role: row.role
        }))
      }
    });
  } catch (error) {
    console.error("MADARA_SQUAD_GET_ERROR", error);
    return json({ ok: false, error: "DATABASE_ERROR" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth) return auth;

  const owner = ownerUid();
  if (!owner) {
    return json({ ok: false, error: "OWNER_NOT_CONFIGURED" }, 503);
  }

  try {
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "create") {
      const name = String(body.name ?? "Madara Squad").trim().slice(0, 40);
      const nickname = String(body.nickname ?? "Madara").trim().slice(0, 32);

      if (!name || !nickname) {
        return json({ ok: false, error: "INVALID_NAME" }, 400);
      }

      const group = await transaction(async (client) => {
        await client.query(
          `INSERT INTO madara_players (uid, nickname, region)
           VALUES ($1, $2, 'EU')
           ON CONFLICT (uid) DO NOTHING`,
          [owner, nickname]
        );

        const created = await client.query(
          `INSERT INTO madara_groups (name, leader_uid)
           VALUES ($1, $2)
           RETURNING id, name, status`,
          [name, owner]
        );

        await client.query(
          `INSERT INTO madara_group_members (group_id, uid, role)
           VALUES ($1, $2, 'leader')`,
          [created.rows[0].id, owner]
        );

        return created.rows[0];
      });

      return json({ ok: true, group }, 201);
    }

    const groupId = String(body.groupId ?? "");
    if (!groupId) {
      return json({ ok: false, error: "GROUP_ID_REQUIRED" }, 400);
    }

    const found = await query(
      `SELECT id, status FROM madara_groups
       WHERE id = $1 AND leader_uid = $2`,
      [groupId, owner]
    );

    if (!found.rows.length) {
      return json({ ok: false, error: "GROUP_NOT_FOUND" }, 404);
    }

    if (action === "invite") {
      const uid = validateUid(String(body.uid ?? ""));
      if (!uid) return json({ ok: false, error: "INVALID_UID" }, 400);
      if (uid === owner) return json({ ok: false, error: "ALREADY_LEADER" }, 409);
      if (found.rows[0].status !== "open") {
        return json({ ok: false, error: "GROUP_CLOSED" }, 409);
      }

      const nickname = String(body.nickname ?? `Player${uid.slice(-6)}`)
        .trim().slice(0, 32) || "Player";

      await transaction(async (client) => {
        await client.query(
          `SELECT id FROM madara_groups
           WHERE id = $1 AND leader_uid = $2 AND status = 'open'
           FOR UPDATE`,
          [groupId, owner]
        );

        await client.query(
          `INSERT INTO madara_players (uid, nickname, region)
           VALUES ($1, $2, 'EU')
           ON CONFLICT (uid) DO NOTHING`,
          [uid, nickname]
        );

        const count = await client.query(
          `SELECT COUNT(*)::int AS total
           FROM madara_group_members
           WHERE group_id = $1`,
          [groupId]
        );

        if (count.rows[0].total >= 5) {
          throw new Error("GROUP_FULL");
        }

        await client.query(
          `INSERT INTO madara_group_members (group_id, uid, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (group_id, uid) DO NOTHING`,
          [groupId, uid]
        );
      });

      return json({ ok: true, message: "Player added to Madara squad." });
    }

    if (action === "kick") {
      const uid = validateUid(String(body.uid ?? ""));
      if (!uid) return json({ ok: false, error: "INVALID_UID" }, 400);
      if (uid === owner) {
        return json({ ok: false, error: "CANNOT_KICK_LEADER" }, 400);
      }

      const removed = await query(
        `DELETE FROM madara_group_members
         WHERE group_id = $1 AND uid = $2 AND role = 'member'
         RETURNING uid`,
        [groupId, uid]
      );

      return json({
        ok: true,
        removed: removed.rowCount ?? 0
      });
    }

    if (action === "leave") {
      await query(
        `UPDATE madara_groups SET status = 'closed'
         WHERE id = $1 AND leader_uid = $2`,
        [groupId, owner]
      );

      return json({
        ok: true,
        message: "Madara squad closed."
      });
    }

    return json({ ok: false, error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_FULL") {
      return json({ ok: false, error: "GROUP_FULL" }, 409);
    }

    console.error("MADARA_SQUAD_ERROR", error);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
}
