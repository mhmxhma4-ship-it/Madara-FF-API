import { NextRequest } from "next/server";
import { json, requireAuth, validateRegion, validateUid } from "@/lib/http";
import { callFreeFireProvider } from "@/lib/freefire-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supported = new Set(["player", "stats", "friends", "guild", "5group", "6group", "emote"]);

async function handle(req: NextRequest, method: "GET" | "POST") {
  const denied = requireAuth(req);
  if (denied) return denied;

  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const endpoint = parts.at(-1) ?? "";
  if (!supported.has(endpoint)) return json({ ok: false, error: "NOT_FOUND" }, 404);

  if (method === "GET") {
    const region = req.nextUrl.searchParams.get("region") ?? "EU";
    if (!validateRegion(region)) {
      return json({ ok: false, error: "UNSUPPORTED_REGION", allowed: ["EU"] }, 400);
    }

    if (endpoint === "player" || endpoint === "stats") {
      const uid = validateUid(req.nextUrl.searchParams.get("uid"));
      if (!uid) {
        return json({ ok: false, error: "INVALID_UID", message: "uid must contain 5 to 15 digits." }, 400);
      }
      const result = await callFreeFireProvider(endpoint === "player" ? "info" : "stats", {
        uid,
        region: "sg"
      });
      return json(result.body, result.status);
    }

    if (endpoint === "guild") {
      const guildId = req.nextUrl.searchParams.get("guildId");
      if (!guildId || !/^[A-Za-z0-9_-]{3,32}$/.test(guildId)) {
        return json({ ok: false, error: "INVALID_GUILD_ID", message: "guildId must contain 3 to 32 safe characters." }, 400);
      }
      const result = await callFreeFireProvider("guild", {
        guildId,
        region: "sg"
      });
      return json(result.body, result.status);
    }

    return json({
      ok: false,
      error: "FEATURE_NOT_AVAILABLE_FROM_PROVIDER",
      endpoint,
      message: "The connected provider does not document a friends-list endpoint. No game account is accessed or modified."
    }, 501);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "INVALID_BODY", message: "Request body must be a JSON object." }, 400);
  }

  const data = body as Record<string, unknown>;
  if (data.region !== undefined && !validateRegion(data.region)) {
    return json({ ok: false, error: "UNSUPPORTED_REGION", allowed: ["EU"] }, 400);
  }

  if (endpoint === "5group" || endpoint === "6group") {
    const teamCode = data.teamCode;
    if (typeof teamCode !== "string" || !/^[A-Za-z0-9_-]{4,32}$/.test(teamCode)) {
      return json({ ok: false, error: "INVALID_TEAM_CODE", message: "teamCode must be 4 to 32 safe characters." }, 400);
    }
  }

  if (endpoint === "emote" && (typeof data.uid !== "string" || !/^\d{5,15}$/.test(data.uid))) {
    return json({ ok: false, error: "INVALID_UID" }, 400);
  }

  return json({
    ok: false,
    error: "GAME_ACTION_NOT_SUPPORTED",
    endpoint,
    message: "The connected data provider has no documented API for creating in-game groups or sending emotes. This endpoint will not simulate or fake a game action."
  }, 501);
}

export function GET(req: NextRequest) {
  return handle(req, "GET");
}

export function POST(req: NextRequest) {
  return handle(req, "POST");
}
