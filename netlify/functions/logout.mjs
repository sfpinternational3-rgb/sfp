import { json, requirePostWithCsrf, clearCookie } from "../lib/common.mjs";

export default async (req) => {
  const bad = requirePostWithCsrf(req);
  if (bad) return bad;
  return json(200, { ok: true, redirect: "login.html" }, [clearCookie("sfp_session")]);
};

export const config = { path: "/api/logout.php" };
