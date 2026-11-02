import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { COURSES } from "../lib/exams.mjs";

const ok = (msg = "OK") => new Response(msg, { status: 200 });

function signatureIsValid(raw, signature) {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(raw)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendExamEmail({ to, name, courseTitle, link, validDays }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to,
      subject: `Your exam link: ${courseTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6">
          <h2>Payment received. Thank you${name ? ", " + name : ""}!</h2>
          <p>You can now take the <strong>${courseTitle}</strong> exam.</p>
          <p>
            <a href="${link}"
               style="display:inline-block;background:#0b5ed7;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">
              Start the Exam
            </a>
          </p>
          <p>If the button does not work, copy this link into your browser:<br>${link}</p>
          <p><strong>Important:</strong> this link can be used for one attempt and expires in ${validDays} days. Please do not share it.</p>
          <p>SFP International Quality Institute</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
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
  const email = d.customer?.email;

  if (!reference || !email || !COURSES[course]) return ok("Ignored");

  // Make sure the amount paid is at least the exam price
  const expected = Math.round(Number(process.env.EXAM_PRICE) * 100);
  if (d.amount < expected) {
    console.error("Underpayment", reference, d.amount, expected);
    return ok("Underpaid");
  }

  const payments = getStore("payments");
  const tokens = getStore("tokens");
  const validDays = Number(process.env.EXAM_LINK_DAYS || 14);

  // Paystack can send the same webhook more than once, so check first
  let record = await payments.get(reference, { type: "json" });
  if (record?.emailed) return ok("Already processed");

  if (!record) {
    const token = crypto.randomBytes(24).toString("hex");
    await tokens.setJSON(token, {
      email,
      name,
      course,
      reference,
      used: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + validDays * 24 * 60 * 60 * 1000,
    });
    record = { token, emailed: false };
    await payments.setJSON(reference, record);
  }

  const link = `${process.env.URL}/exam.html?token=${record.token}`;

  try {
    await sendExamEmail({
      to: email,
      name,
      courseTitle: COURSES[course],
      link,
      validDays,
    });
    await payments.setJSON(reference, { ...record, emailed: true });
  } catch (err) {
    console.error(err);
    // A non-200 response makes Paystack retry the webhook later
    return new Response("Email failed", { status: 500 });
  }

  return ok();
};

export const config = { path: "/api/paystack-webhook" };
