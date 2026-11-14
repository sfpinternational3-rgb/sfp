import { COURSES, EXAMS, PASS_MARK } from "../lib/exams.mjs";
import { json, readJson, store } from "../lib/common.mjs";
import { TOKEN_RE, linkProblem, readToken, writeIfUnchanged } from "../lib/exam-tools.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const body = await readJson(req);
  const token = String(body.token || "");
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (!TOKEN_RE.test(token)) return json(400, { error: "This exam link is not valid." });

  const found = await readToken(token);
  if (!found) return json(404, { error: "This exam link is not valid." });
  const { record, etag } = found;

  const problem = linkProblem(record);
  if (problem) return json(problem.status, { error: problem.error });
  if (!record.startedAt) return json(400, { error: "Please open the exam from your link first." });

  const questions = EXAMS[record.course];
  if (!questions || questions.length === 0) {
    return json(404, { error: "The exam for this course is not available yet." });
  }

  // Mark the link as used. This only succeeds for ONE submission, even if the
  // button is double-clicked or two requests arrive at the same moment.
  const now = Date.now();
  const claimed = await writeIfUnchanged(token, { ...record, used: true, usedAt: now }, etag);
  if (!claimed) return json(410, { error: "This exam link has already been used." });

  let correct = 0;
  questions.forEach((q, i) => {
    if (Number(answers[i]) === q.answer) correct++;
  });
  const percent = Math.round((correct / questions.length) * 100);
  const passed = percent >= PASS_MARK;

  try {
    await store("results").setJSON(`${record.reference}`, {
      email: record.email,
      name: record.name,
      course: record.course,
      courseTitle: COURSES[record.course],
      correct,
      total: questions.length,
      percent,
      passed,
      mode: record.mode || null,
      startedAt: record.startedAt,
      submittedAt: now,
    });
  } catch (err) {
    console.error("Could not save result", record.reference, err); // the student still sees their score
  }

  return json(200, {
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
