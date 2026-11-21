import { NextRequest } from "next/server";
import { query, transaction } from "@/lib/db";
import { json, requireAuth, validateRegion, validateUid } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlayerRow = { [key: string]: unknown; uid: string; nickname: string; region: string; notes: string | null; created_at: string; updated_at: string };
type GroupRow = { [key: string]: unknown; id: string; name: string; leader_uid: string; status: string; created_at: string };

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await req.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function validName(value: unknown, max = 32): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function dbError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "23503") return json({ ok: false, error: "PLAYER_NOT_FOUND", message: "Register every UID before using it." }, 404);
  if (code === "23505") return json({ ok: false, error: "ALREADY_EXISTS" }, 409);
  if (code === "DATABASE_NOT_CONFIGURED" || (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED")) return json({ ok: false, error: "DATABASE_NOT_CONFIGURED", message: "Set DATABASE_URL in Vercel Environment Variables." }, 503);
  return json({ ok: false, error: "DATABASE_ERROR", message: "The Madara database request failed." }, 500);
}

async function handleGet(req: NextRequest, endpoint: string) {
  if (endpoint === "player") {
    const uid = validateUid(req.nextUrl.searchParams.get("uid"));
    if (!uid) return json({ ok: false, error: "INVALID_UID" }, 400);
    const result = await query<PlayerRow>("SELECT uid,nickname,region,notes,created_at,updated_at FROM madara_players WHERE uid=$1", [uid]);
    return result.rowCount ? json({ ok: true, source: "madara_registry", player: result.rows[0] }) : json({ ok: false, error: "PLAYER_NOT_REGISTERED" }, 404);
  }

  if (endpoint === "stats") {
    const uid = validateUid(req.nextUrl.searchParams.get("uid"));
    if (!uid) return json({ ok: false, error: "INVALID_UID" }, 400);
    const result = await query(
      `SELECT p.uid,p.nickname,
        (SELECT COUNT(*)::int FROM madara_group_members gm WHERE gm.uid=p.uid) AS groups_joined,
        (SELECT COUNT(*)::int FROM madara_groups g WHERE g.leader_uid=p.uid) AS groups_led,
        (SELECT COUNT(*)::int FROM madara_friends f WHERE f.owner_uid=p.uid) AS friends_count,
        (SELECT COUNT(*)::int FROM madara_guild_members m WHERE m.uid=p.uid) AS guilds_joined
       FROM madara_players p WHERE p.uid=$1`, [uid]);
    return result.rowCount ? json({ ok: true, source: "madara_platform_stats", stats: result.rows[0], note: "These are Madara platform records, not official in-game statistics." }) : json({ ok: false, error: "PLAYER_NOT_REGISTERED" }, 404);
  }

  if (endpoint === "friends") {
    const uid = validateUid(req.nextUrl.searchParams.get("uid"));
    if (!uid) return json({ ok: false, error: "INVALID_UID" }, 400);
    const result = await query(
      `SELECT p.uid,p.nickname,f.created_at FROM madara_friends f
       JOIN madara_players p ON p.uid=f.friend_uid WHERE f.owner_uid=$1 ORDER BY f.created_at DESC`, [uid]);
    return json({ ok: true, source: "madara_contacts", count: result.rowCount, friends: result.rows });
  }

  if (endpoint === "guild") {
    const guildId = req.nextUrl.searchParams.get("guildId");
    if (!guildId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guildId)) return json({ ok: false, error: "INVALID_GUILD_ID" }, 400);
    const result = await query(
      `SELECT g.id,g.name,g.tag,g.owner_uid,g.created_at,
        COALESCE(json_agg(json_build_object('uid',p.uid,'nickname',p.nickname,'role',m.role))
          FILTER (WHERE p.uid IS NOT NULL),'[]'::json) AS members
       FROM madara_guilds g LEFT JOIN madara_guild_members m ON m.guild_id=g.id
       LEFT JOIN madara_players p ON p.uid=m.uid WHERE g.id=$1
       GROUP BY g.id`, [guildId]);
    return result.rowCount ? json({ ok: true, source: "madara_guilds", guild: result.rows[0] }) : json({ ok: false, error: "GUILD_NOT_FOUND" }, 404);
  }

  if (endpoint === "5group") {
    const groupId = req.nextUrl.searchParams.get("id");
    if (!groupId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(groupId)) return json({ ok: false, error: "GROUP_ID_REQUIRED" }, 400);
    const result = await query(
      `SELECT g.id,g.name,g.leader_uid,g.status,g.created_at,
        COALESCE(json_agg(json_build_object('uid',p.uid,'nickname',p.nickname,'role',m.role))
          FILTER (WHERE p.uid IS NOT NULL),'[]'::json) AS members
       FROM madara_groups g LEFT JOIN madara_group_members m ON m.group_id=g.id
       LEFT JOIN madara_players p ON p.uid=m.uid WHERE g.id=$1
       GROUP BY g.id`, [groupId]);
    return result.rowCount ? json({ ok: true, group: result.rows[0] }) : json({ ok: false, error: "GROUP_NOT_FOUND" }, 404);
  }

  return json({ ok: false, error: "NOT_FOUND" }, 404);
}

async function handlePost(req: NextRequest, endpoint: string) {
  const body = await readBody(req);
  if (!body) return json({ ok: false, error: "INVALID_JSON", message: "Send a JSON object." }, 400);

  if (endpoint === "player") {
    const uid = validateUid(typeof body.uid === "string" ? body.uid : null);
    if (!uid || !validName(body.nickname)) return json({ ok: false, error: "INVALID_PLAYER", message: "Provide a 5-20 digit uid and nickname (1-32 characters)." }, 400);
    if (body.region !== undefined && !validateRegion(body.region)) return json({ ok: false, error: "UNSUPPORTED_REGION", allowed: ["EU"] }, 400);
    if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 500)) return json({ ok: false, error: "INVALID_NOTES" }, 400);
    const result = await query<PlayerRow>(
      `INSERT INTO madara_players(uid,nickname,region,notes) VALUES($1,$2,'EU',$3)
       ON CONFLICT(uid) DO UPDATE SET nickname=EXCLUDED.nickname,notes=EXCLUDED.notes,updated_at=NOW()
       RETURNING uid,nickname,region,notes,created_at,updated_at`,
      [uid, body.nickname.trim(), body.notes ?? null]);
    return json({ ok: true, source: "madara_registry", player: result.rows[0] }, 201);
  }

  if (endpoint === "friends") {
    const ownerUid = validateUid(typeof body.ownerUid === "string" ? body.ownerUid : null);
    const friendUid = validateUid(typeof body.friendUid === "string" ? body.friendUid : null);
    if (!ownerUid || !friendUid || ownerUid === friendUid) return json({ ok: false, error: "INVALID_FRIEND" }, 400);
    await query("INSERT INTO madara_friends(owner_uid,friend_uid) VALUES($1,$2) ON CONFLICT DO NOTHING", [ownerUid, friendUid]);
    return json({ ok: true, message: "Friend link saved in Madara." }, 201);
  }

  if (endpoint === "guild" && typeof body.guildId === "string") {
    const guildId = body.guildId;
    const uid = validateUid(typeof body.uid === "string" ? body.uid : null);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guildId) || !uid) {
      return json({ ok: false, error: "INVALID_GUILD_MEMBERSHIP" }, 400);
    }
    const exists = await query("SELECT id FROM madara_guilds WHERE id=$1", [guildId]);
    if (!exists.rowCount) return json({ ok: false, error: "GUILD_NOT_FOUND" }, 404);
    await query("INSERT INTO madara_guild_members(guild_id,uid,role) VALUES($1,$2,'member')", [guildId, uid]);
    return json({ ok: true, message: "Player joined the Madara guild." }, 201);
  }

  if (endpoint === "guild") {
    const ownerUid = validateUid(typeof body.ownerUid === "string" ? body.ownerUid : null);
    const name = body.name;
    const tag = body.tag;
    if (!ownerUid || !validName(name, 40) || typeof tag !== "string" || !/^[A-Za-z0-9]{2,8}$/.test(tag)) {
      return json({ ok: false, error: "INVALID_GUILD", message: "Provide ownerUid, name (1-40 chars), and tag (2-8 letters/numbers)." }, 400);
    }
    const guild = await transaction(async (client) => {
      const created = await client.query(
        "INSERT INTO madara_guilds(name,tag,owner_uid) VALUES($1,$2,$3) RETURNING id,name,tag,owner_uid,created_at",
        [name.trim(), tag.toUpperCase(), ownerUid]);
      await client.query("INSERT INTO madara_guild_members(guild_id,uid,role) VALUES($1,$2,'owner')", [created.rows[0].id, ownerUid]);
      return created.rows[0];
    });
    return json({ ok: true, source: "madara_guilds", guild }, 201);
  }

  if (endpoint === "5group") {
    const groupId = typeof body.groupId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.groupId) ? body.groupId : null;
    if (body.groupId !== undefined && !groupId) return json({ ok: false, error: "INVALID_GROUP_ID" }, 400);
    const uid = validateUid(typeof body.uid === "string" ? body.uid : null);
    if (groupId) {
      if (!uid) return json({ ok: false, error: "INVALID_UID" }, 400);
      const joined = await transaction(async (client) => {
        const group = await client.query<GroupRow>("SELECT id,name,leader_uid,status,created_at FROM madara_groups WHERE id=$1 FOR UPDATE", [groupId]);
        if (!group.rowCount) throw Object.assign(new Error("GROUP_NOT_FOUND"), { code: "GROUP_NOT_FOUND" });
        if (group.rows[0].status !== "open") throw Object.assign(new Error("GROUP_CLOSED"), { code: "GROUP_CLOSED" });
        const count = await client.query("SELECT COUNT(*)::int AS count FROM madara_group_members WHERE group_id=$1", [groupId]);
        if (count.rows[0].count >= 5) throw Object.assign(new Error("GROUP_FULL"), { code: "GROUP_FULL" });
        await client.query("INSERT INTO madara_group_members(group_id,uid,role) VALUES($1,$2,'member')", [groupId, uid]);
        return group.rows[0];
      });
      return json({ ok: true, message: "Player joined the Madara group.", group: joined }, 201);
    }

    const leaderUid = validateUid(typeof body.leaderUid === "string" ? body.leaderUid : null);
    const name = body.name ?? "Madara Squad";
    const members = Array.isArray(body.members) ? body.members : [];
    if (!leaderUid || !validName(name, 40) || members.length > 4) return json({ ok: false, error: "INVALID_GROUP", message: "Provide leaderUid, a group name, and up to four member UIDs." }, 400);
    const allUids = [leaderUid, ...members];
    if (allUids.some((value) => typeof value !== "string" || !/^\d{5,20}$/.test(value)) || new Set(allUids).size !== allUids.length) {
      return json({ ok: false, error: "INVALID_MEMBERS", message: "Group UIDs must be unique 5-20 digit strings." }, 400);
    }
    const group = await transaction(async (client) => {
      const registered = await client.query("SELECT uid FROM madara_players WHERE uid = ANY($1::varchar[])", [allUids]);
      if (registered.rowCount !== allUids.length) throw Object.assign(new Error("PLAYER_NOT_FOUND"), { code: "23503" });
      const created = await client.query<GroupRow>(
        "INSERT INTO madara_groups(name,leader_uid) VALUES($1,$2) RETURNING id,name,leader_uid,status,created_at",
        [name.trim(), leaderUid]);
      for (const memberUid of allUids) {
        await client.query("INSERT INTO madara_group_members(group_id,uid,role) VALUES($1,$2,$3)", [created.rows[0].id, memberUid, memberUid === leaderUid ? "leader" : "member"]);
      }
      return created.rows[0];
    });
    return json({ ok: true, message: "Madara 5-player group created.", group, capacity: 5, members: allUids }, 201);
  }

  if (endpoint === "6group") return json({ ok: false, error: "UNSUPPORTED_GROUP_SIZE", message: "Madara groups support a maximum of five players." }, 410);
  if (endpoint === "emote") return json({ ok: false, error: "GAME_ACTION_NOT_AVAILABLE", message: "This API cannot send emotes inside Free Fire. No in-game action was performed." }, 501);
  return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
}

export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const endpoint = req.nextUrl.pathname.split("/").filter(Boolean).at(-1) ?? "";
  try { return await handleGet(req, endpoint); } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "GROUP_NOT_FOUND") return json({ ok: false, error: code }, 404);
    return dbError(error);
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const endpoint = req.nextUrl.pathname.split("/").filter(Boolean).at(-1) ?? "";
  try { return await handlePost(req, endpoint); } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "GROUP_NOT_FOUND") return json({ ok: false, error: code }, 404);
    if (code === "GROUP_CLOSED") return json({ ok: false, error: code }, 409);
    if (code === "GROUP_FULL") return json({ ok: false, error: code, message: "This group already has five players." }, 409);
    return dbError(error);
  }
}
