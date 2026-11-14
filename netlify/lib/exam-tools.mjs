// Shared helpers for the paid-exam flow (payment -> link -> exam -> expiry).
import { store } from "./common.mjs";

export const TOKEN_RE = /^[a-f0-9]{48}$/;
export const GRACE_MS = 60 * 1000; // allow 1 minute for slow connections on submit

const positive = (v, fallback) => (Number(v) > 0 ? Number(v) : fallback);
export const minutesAllowed = () => positive(process.env.EXAM_MINUTES, 60);
export const linkDays = () => positive(process.env.EXAM_LINK_DAYS, 14);

// "test" while PAYSTACK_SECRET_KEY is a sk_test_ key, "live" once you switch to sk_live_.
export const currentMode = () =>
  String(process.env.PAYSTACK_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test";

const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendExamEmail({ to, name, courseTitle, link, validDays, minutes, mode }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to,
      subject: `${mode === "test" ? "[TEST] " : ""}Your exam link: ${courseTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6">
          <h2>Your exam link${name ? ", " + esc(name) : ""}</h2>
          <p>You can now take the <strong>${esc(courseTitle)}</strong> exam.</p>
          <p>
            <a href="${link}"
               style="display:inline-block;background:#0b5ed7;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">
              Start the Exam
            </a>
          </p>
          <p>If the button does not work, copy this link into your browser:<br>${link}</p>
          <p><strong>Important:</strong> this link allows <strong>one attempt</strong>. Once you open the exam you have
          ${minutes} minutes to finish, and the link expires ${validDays} days after payment. Please do not share it.</p>
          <p>SFP International Quality Institute</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
}

// Returns { status, error } if the link cannot be used right now, otherwise null.
export function linkProblem(record, now = Date.now()) {
  if (record.mode && record.mode !== currentMode()) {
    return { status: 403, error: "This exam link was created in a different payment mode (test or live) and cannot be used." };
  }
  if (record.used) return { status: 410, error: "This exam link has already been used." };
  if (now > record.expiresAt) {
    return { status: 410, error: "This exam link has expired. Please contact the institute." };
  }
  if (record.deadline && now > record.deadline + GRACE_MS) {
    return { status: 410, error: "Your exam time has ended. This link can no longer be used." };
  }
  return null;
}

export async function readToken(token) {
  const r = await store("tokens").getWithMetadata(token, { type: "json" });
  return r ? { record: r.data, etag: r.etag } : null;
}

// Saves only if nobody changed the record since we read it. Returns true on success.
export async function writeIfUnchanged(token, record, etag) {
  const res = await store("tokens").setJSON(token, record, { onlyIfMatch: etag });
  return !(res && res.modified === false);
}
