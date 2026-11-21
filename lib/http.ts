import { NextRequest, NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function authenticate(req: NextRequest): boolean {
  const expected = process.env.MADARA_API_KEY;
  if (!expected || expected.length < 24) return false;
  const header = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(header && header === expected);
}

export function requireAuth(req: NextRequest) {
  if (!process.env.MADARA_API_KEY || process.env.MADARA_API_KEY.length < 24) {
    return json({ ok: false, error: "SERVER_NOT_CONFIGURED", message: "MADARA_API_KEY must be configured with at least 24 characters." }, 503);
  }
  if (!authenticate(req)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  return null;
}

export function validateUid(value: string | null): string | null {
  if (!value || !/^\d{5,20}$/.test(value)) return null;
  return value;
}

export function validateRegion(value: unknown): value is "EU" {
  return value === "EU";
}

export function notIntegrated(endpoint: string) {
  return json({
    ok: false,
    error: "INTEGRATION_NOT_CONFIGURED",
    endpoint,
    message: "No authorized game-data provider is configured. Add a legitimate provider integration before using this endpoint."
  }, 503);
}