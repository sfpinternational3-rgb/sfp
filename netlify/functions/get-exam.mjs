import { getStore } from "@netlify/blobs";
import { COURSES, EXAMS, PASS_MARK } from "../lib/exams.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req) => {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return json({ error: "This exam link is not valid." }, 400);
  }

  const record = await getStore("tokens").get(token, { type: "json" });
  if (!record) return json({ error: "This exam link is not valid." }, 404);
  if (record.used) return json({ error: "This exam link has already been used." }, 410);
  if (Date.now() > record.expiresAt) {
    return json({ error: "This exam link has expired. Please contact the institute." }, 410);
  }

  const questions = EXAMS[record.course];
  if (!questions || questions.length === 0) {
    return json({ error: "The exam for this course is not available yet. Please contact the institute." }, 404);
  }

  // Never send the correct answers to the browser
  return json({
    course: COURSES[record.course],
    passMark: PASS_MARK,
    questions: questions.map((q) => ({ q: q.q, options: q.options })),
  });
};

export const config = { path: "/api/get-exam" };
