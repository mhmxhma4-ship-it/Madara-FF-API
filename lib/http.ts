import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function authenticate(req: NextRequest): boolean {
  const expected = process.env.MADARA_API_KEY;
  if (!expected || expected.length < 24) return false;
  const supplied = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function requireAuth(req: NextRequest) {
  if (!process.env.MADARA_API_KEY || process.env.MADARA_API_KEY.length < 24) {
    return json({ ok: false, error: "SERVER_NOT_CONFIGURED", message: "Set MADARA_API_KEY in Vercel Environment Variables (minimum 24 characters)." }, 503);
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
