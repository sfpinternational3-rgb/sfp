import { getStore } from "@netlify/blobs";
import { COURSES, EXAMS, PASS_MARK } from "../lib/exams.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const token = String(body.token || "");
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return json({ error: "This exam link is not valid." }, 400);
  }

  const tokens = getStore("tokens");
  const record = await tokens.get(token, { type: "json" });
  if (!record) return json({ error: "This exam link is not valid." }, 404);
  if (record.used) return json({ error: "This exam link has already been used." }, 410);
  if (Date.now() > record.expiresAt) {
    return json({ error: "This exam link has expired. Please contact the institute." }, 410);
  }

  const questions = EXAMS[record.course];
  if (!questions || questions.length === 0) {
    return json({ error: "The exam for this course is not available yet." }, 404);
  }

  // Mark the link as used first, so it cannot be submitted twice
  await tokens.setJSON(token, { ...record, used: true, usedAt: Date.now() });

  let correct = 0;
  questions.forEach((q, i) => {
    if (Number(answers[i]) === q.answer) correct++;
  });
  const percent = Math.round((correct / questions.length) * 100);
  const passed = percent >= PASS_MARK;

  // Keep a record of the result for your own use
  await getStore("results").setJSON(`${record.reference}`, {
    email: record.email,
    name: record.name,
    course: record.course,
    courseTitle: COURSES[record.course],
    correct,
    total: questions.length,
    percent,
    passed,
    submittedAt: Date.now(),
  });

  return json({
    name: record.name,
    course: COURSES[record.course],
    correct,
    total: questions.length,
    percent,
    passed,
    passMark: PASS_MARK,
  });
};

export const config = { path: "/api/submit-exam" };
