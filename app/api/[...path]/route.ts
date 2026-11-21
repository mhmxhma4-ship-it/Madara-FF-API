import { NextRequest } from "next/server";
import { json, notIntegrated, requireAuth, validateRegion, validateUid } from "@/lib/http";

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
    const uid = validateUid(req.nextUrl.searchParams.get("uid"));
    if (!uid) return json({ ok: false, error: "INVALID_UID", message: "uid must contain 5 to 20 digits." }, 400);
    if (!validateRegion(req.nextUrl.searchParams.get("region") ?? "EU")) {
      return json({ ok: false, error: "UNSUPPORTED_REGION", allowed: ["EU"] }, 400);
    }
  } else {
    let body: unknown;
    try { body = await req.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ ok: false, error: "INVALID_BODY", message: "Request body must be a JSON object." }, 400);
    }
    const data = body as Record<string, unknown>;
    if (data.region !== undefined && !validateRegion(data.region)) {
      return json({ ok: false, error: "UNSUPPORTED_REGION", allowed: ["EU"] }, 400);
    }
    if (endpoint === "5group" || endpoint === "6group") {
      const code = data.teamCode;
      if (typeof code !== "string" || !/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
        return json({ ok: false, error: "INVALID_TEAM_CODE", message: "teamCode must be 4 to 32 safe characters." }, 400);
      }
    }
    if (endpoint === "emote" && (typeof data.uid !== "string" || !/^\d{5,20}$/.test(data.uid))) {
      return json({ ok: false, error: "INVALID_UID" }, 400);
    }
  }

  return notIntegrated(endpoint);
}

export function GET(req: NextRequest) { return handle(req, "GET"); }
export function POST(req: NextRequest) { return handle(req, "POST"); }