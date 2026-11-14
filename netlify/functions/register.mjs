import {
  json, readJson, requirePostWithCsrf, store, sha, hashPassword, sessionCookie,
} from "../lib/common.mjs";

export default async (req) => {
  const bad = requirePostWithCsrf(req);
  if (bad) return bad;

  const d = await readJson(req);
  const name = typeof d.name === "string" ? d.name.trim() : "";
  const email = typeof d.email === "string" ? d.email.trim().toLowerCase() : "";
  const password = typeof d.password === "string" ? d.password : "";

  const errors = {};
  if (name.length < 2 || name.length > 100) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = "Enter a valid email, like name@example.com.";
  }
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 72) errors.password = "Use 72 characters or fewer.";
  if (Object.keys(errors).length) {
    return json(422, { error: "Please fix the highlighted fields.", fields: errors });
  }

  const users = store("users");
  const id = sha(email);
  const exists = {
    error: "An account with this email already exists. Sign in instead.",
    fields: { email: "This email is already registered." },
  };
  if (await users.get(id)) return json(409, exists);

  const res = await users.setJSON(
    id,
    { id, name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString() },
    { onlyIfNew: true }
  );
  if (res && res.modified === false) return json(409, exists);

  return json(201, { ok: true, redirect: "dashboard.html" }, [sessionCookie(id, false)]);
};

export const config = { path: "/api/register.php" };
