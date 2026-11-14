import { json, getCsrf } from "../lib/common.mjs";

export default async (req) => {
  const { token, setCookie } = getCsrf(req);
  return json(200, { token }, setCookie ? [setCookie] : []);
};

export const config = { path: "/api/csrf.php" };
