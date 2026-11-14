import { COURSES } from "../lib/exams.mjs";
import { json, readJson, sessionUserId, store, sha, attempts, addAttempt } from "../lib/common.mjs";
import { currentMode, linkDays, linkProblem, minutesAllowed, sendExamEmail } from "../lib/exam-tools.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const uid = sessionUserId(req);
  const user = uid ? await store("users").get(uid, { type: "json" }) : null;
  if (!user) return json(401, { error: "Please sign in first.", login: true });

  const course = String((await readJson(req)).course || "");
  if (!COURSES[course]) return json(400, { error: "Unknown course." });

  // At most 3 resends per account per hour.
  const att = await attempts("resend-attempts", sha(uid), 3600);
  if (att.n >= 3) return json(429, { error: "Too many requests. Please wait an hour and try again." });
  await addAttempt(att);

  const { blobs } = await store("exam-index").list({ prefix: `${sha(user.email)}/` });
  let best = null;
  for (const b of blobs) {
    const token = b.key.split("/")[1];
    const record = await store("tokens").get(token, { type: "json" });
    if (!record || record.course !== course || linkProblem(record)) continue;
    if (!best || record.createdAt > best.record.createdAt) best = { token, record };
  }
  if (!best) {
    return json(404, {
      error: "We could not find an unused exam link for this course on your account. If you have paid, please contact us.",
    });
  }

  try {
    await sendExamEmail({
      to: user.email,
      name: user.name,
      courseTitle: COURSES[course],
      link: `${process.env.URL}/exam.html?token=${best.token}`,
      validDays: linkDays(),
      minutes: minutesAllowed(),
      mode: currentMode(),
    });
  } catch (err) {
    console.error(err);
    return json(502, { error: "We could not send the email right now. Please try again later." });
  }
  return json(200, { ok: true });
};

export const config = { path: "/api/resend-exam" };
