import { json, sessionUserId, store, clearCookie } from "../lib/common.mjs";

export default async (req) => {
  const uid = sessionUserId(req);
  if (!uid) return json(401, { error: "Not signed in." });
  const user = await store("users").get(uid, { type: "json" });
  if (!user) return json(401, { error: "Not signed in." }, [clearCookie("sfp_session")]);
  return json(200, { name: user.name, email: user.email });
};

export const config = { path: "/api/me.php" };
