import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
const COOKIE = "madara_dashboard";
const TTL = 12 * 60 * 60;
function sign(ts: string, secret: string) { return createHmac("sha256", secret).update(ts).digest("hex"); }
export function verifyDashboardPassword(password: string) {
  const secret = process.env.MADARA_API_KEY;
  return !!secret && secret.length >= 24 && password.length === secret.length && timingSafeEqual(Buffer.from(password), Buffer.from(secret));
}
export function createDashboardSession(response: NextResponse) {
  const secret = process.env.MADARA_API_KEY;
  if (!secret || secret.length < 24) throw new Error("SERVER_NOT_CONFIGURED");
  const ts = String(Math.floor(Date.now() / 1000));
  response.cookies.set(COOKIE, ts + "." + sign(ts, secret), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: TTL });
}
export function clearDashboardSession(response: NextResponse) {
  response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
export function hasDashboardSession(req: NextRequest) {
  const secret = process.env.MADARA_API_KEY;
  const value = req.cookies.get(COOKIE)?.value;
  if (!secret || secret.length < 24 || !value) return false;
  const [ts, supplied] = value.split(".");
  if (!ts || !supplied || !/^\d{10}$/.test(ts)) return false;
  const age = Math.floor(Date.now() / 1000) - Number(ts);
  if (age < 0 || age > TTL) return false;
  const expected = sign(ts, secret);
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
