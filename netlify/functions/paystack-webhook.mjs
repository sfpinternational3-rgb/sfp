import crypto from "node:crypto";
import { COURSES } from "../lib/exams.mjs";
import { store, sha } from "../lib/common.mjs";
import { currentMode, linkDays, minutesAllowed, sendExamEmail } from "../lib/exam-tools.mjs";

const ok = (msg = "OK") => new Response(msg, { status: 200 });

function signatureIsValid(raw, signature) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async (req) => {
  const raw = await req.text();
  if (!signatureIsValid(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event !== "charge.success") return ok("Ignored");

  const d = event.data;
  const reference = d.reference;
  const course = d.metadata?.course;
  const name = d.metadata?.name || "";
  const email = String(d.customer?.email || "").toLowerCase();
  if (!reference || !email || !COURSES[course]) return ok("Ignored");

  // Test payments must never create live links (and the other way round).
  const mode = d.domain === "live" || d.domain === "test" ? d.domain : currentMode();
  if (mode !== currentMode()) return ok("Ignored: payment mode does not match this site's key");

  const expected = Math.round(Number(process.env.EXAM_PRICE) * 100);
  if (d.amount < expected) {
    console.error("Underpayment", reference, d.amount, expected);
    return ok("Underpaid");
  }

  const payments = store("payments");
  const tokens = store("tokens");
  const validDays = linkDays();

  // Paystack can send the same webhook more than once (or at the same moment).
  let found = await payments.getWithMetadata(reference, { type: "json" });
  if (found?.data?.emailed) return ok("Already processed");

  if (!found) {
    const fresh = { token: crypto.randomBytes(24).toString("hex"), emailed: false };
    await payments.setJSON(reference, fresh, { onlyIfNew: true });
    found = await payments.getWithMetadata(reference, { type: "json" });
  }
  let record = found.data;

  // Make sure the exam token exists (also repairs a half-finished earlier attempt).
  if (!(await tokens.get(record.token))) {
    const now = Date.now();
    await tokens.setJSON(record.token, {
      email, name, course, reference, mode,
      userId: d.metadata?.userId || null,
      used: false,
      createdAt: now,
      expiresAt: now + validDays * 24 * 60 * 60 * 1000,
    });
    await store("exam-index").setJSON(`${sha(email)}/${record.token}`, { course });
  }

  // Only one request may send the email. A claim older than 2 minutes counts as abandoned.
  const now2 = Date.now();
  if (record.sendingAt && now2 - record.sendingAt < 2 * 60 * 1000) return ok("Already being processed");
  const claimed = await payments.setJSON(reference, { ...record, sendingAt: now2 }, { onlyIfMatch: found.etag });
  if (claimed && claimed.modified === false) return ok("Already being processed");

  try {
    await sendExamEmail({
      to: email,
      name,
      courseTitle: COURSES[course],
      link: `${process.env.URL}/exam.html?token=${record.token}`,
      validDays,
      minutes: minutesAllowed(),
      mode,
    });
    await payments.setJSON(reference, { token: record.token, emailed: true });
  } catch (err) {
    console.error(err);
    return new Response("Email failed", { status: 500 }); // Paystack retries later
  }
  return ok();
};

export const config = { path: "/api/paystack-webhook" };
