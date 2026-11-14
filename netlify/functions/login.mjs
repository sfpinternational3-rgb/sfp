import {
  json, readJson, clientIp, requirePostWithCsrf, store, sha, verifyPassword,
  sessionCookie, attempts, addAttempt, DUMMY_HASH,
} from "../lib/common.mjs";

const WRONG = { error: "Email or password is incorrect. Check both and try again." };

export default async (req, context) => {
  const bad = requirePostWithCsrf(req);
  if (bad) return bad;

  const d = await readJson(req);
  const email = typeof d.email === "string" ? d.email.trim().toLowerCase() : "";
  const password = typeof d.password === "string" ? d.password : "";
  const remember = !!d.remember;
  const ip = clientIp(req, context);

  if (!email || !password || password.length > 72) return json(401, WRONG);

  // 5 failed tries per email and device in 15 minutes.
  const att = await attempts("login-attempts", sha(`${email}|${ip}`), 15 * 60);
  if (att.n >= 5) {
    return json(429, { error: "Too many failed attempts. Wait 15 minutes and try again." });
  }

  const id = sha(email);
  const user = await store("users").get(id, { type: "json" });
  // Always run a password check so a missing account takes as long as a wrong password.
  const valid = verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !valid) {
    await addAttempt(att);
    return json(401, WRONG);
  }

  await att.s.delete(att.key);
  return json(200, { ok: true, redirect: "dashboard.html" }, [sessionCookie(id, remember)]);
};

export const config = { path: "/api/login.php" };
