import { COURSES, EXAMS, PASS_MARK } from "../lib/exams.mjs";
import { json } from "../lib/common.mjs";
import { TOKEN_RE, linkProblem, minutesAllowed, readToken, writeIfUnchanged } from "../lib/exam-tools.mjs";

export default async (req) => {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!TOKEN_RE.test(token)) return json(400, { error: "This exam link is not valid." });

  let found = await readToken(token);
  if (!found) return json(404, { error: "This exam link is not valid." });
  let { record, etag } = found;

  let problem = linkProblem(record);
  if (problem) return json(problem.status, { error: problem.error });

  const questions = EXAMS[record.course];
  if (!questions || questions.length === 0) {
    return json(404, { error: "The exam for this course is not available yet. Please contact the institute." });
  }

  // The clock starts the first time the exam is opened and does not restart on refresh.
  const now = Date.now();
  if (!record.startedAt) {
    const started = { ...record, startedAt: now, deadline: now + minutesAllowed() * 60 * 1000 };
    if (await writeIfUnchanged(token, started, etag)) {
      record = started;
    } else {
      found = await readToken(token); // another tab started it at the same moment
      record = found.record;
      problem = linkProblem(record);
      if (problem) return json(problem.status, { error: problem.error });
    }
  }

  // Never send the correct answers to the browser
  return json(200, {
    course: COURSES[record.course],
    passMark: PASS_MARK,
    minutes: Math.round((record.deadline - record.startedAt) / 60000),
    secondsLeft: Math.max(0, Math.floor((record.deadline - now) / 1000)),
    questions: questions.map((q) => ({ q: q.q, options: q.options })),
  });
};

export const config = { path: "/api/get-exam" };
