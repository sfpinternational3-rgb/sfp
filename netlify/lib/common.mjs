// Shared helpers for every Netlify Function (replaces config.php).
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export const REMEMBER_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return s;
}
const sign = (v) => crypto.createHmac("sha256", secret()).update(v).digest("base64url");

function safeEq(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
export const store = (name) => getStore({ name, consistency: "strong" });

export function json(status, data, cookies = []) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(data), { status, headers });
}

export async function readJson(req) {
  try {
    const d = await req.json();
    return d && typeof d === "object" && !Array.isArray(d) ? d : {};
  } catch {
    return {};
  }
}

export function clientIp(req, context) {
  return (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "unknown";
}

function cookiesOf(req) {
  const out = {};
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function cookie(name, value, maxAge) {
  let c = `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  return c;
}
export const clearCookie = (name) => cookie(name, "", 0);

// ---------- CSRF (replaces csrf.php + require_post_with_csrf) ----------
export function getCsrf(req) {
  const raw = cookiesOf(req).sfp_csrf || "";
  const [t, s] = raw.split(".");
  if (t && s && safeEq(s, sign(t))) return { token: t, setCookie: null };
  const token = crypto.randomBytes(32).toString("hex");
  return { token, setCookie: cookie("sfp_csrf", `${token}.${sign(token)}`) };
}

// Returns a Response to send back if the request is not allowed, otherwise null.
export function requirePostWithCsrf(req) {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  const sent = req.headers.get("x-csrf-token") || "";
  const cur = getCsrf(req);
  if (cur.setCookie || !safeEq(cur.token, sent)) {
    return json(403, { error: "Your session expired. Refresh the page and try again." });
  }
  return null;
}

// ---------- Sessions (signed cookie instead of PHP sessions) ----------
export function sessionCookie(userId, remember) {
  const life = remember ? REMEMBER_DAYS * 86400 : 86400;
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + life })
  ).toString("base64url");
  return cookie("sfp_session", `${payload}.${sign(payload)}`, remember ? life : undefined);
}

export function sessionUserId(req) {
  const raw = cookiesOf(req).sfp_session || "";
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEq(sig, sign(payload))) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    return d.exp > Date.now() / 1000 ? String(d.uid) : null;
  } catch {
    return null;
  }
}

// ---------- Passwords (scrypt, built into Node) ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${h.toString("base64url")}`;
}
export function verifyPassword(pw, stored) {
  const [alg, s, h] = String(stored).split("$");
  if (alg !== "scrypt" || !s || !h) return false;
  const hash = crypto.scryptSync(pw, Buffer.from(s, "base64url"), 64);
  return safeEq(hash.toString("base64url"), h);
}
export const DUMMY_HASH = hashPassword("not-a-real-password");

// ---------- Simple attempt counters for rate limiting ----------
export async function attempts(storeName, key, windowSec) {
  const s = store(storeName);
  const rec = await s.get(key, { type: "json" });
  const now = Date.now();
  if (!rec || now - rec.start > windowSec * 1000) return { s, key, n: 0, start: now };
  return { s, key, n: rec.n, start: rec.start };
}
export const addAttempt = (a) => a.s.setJSON(a.key, { n: a.n + 1, start: a.start });
