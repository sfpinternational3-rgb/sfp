import { COURSES } from "../lib/exams.mjs";
import { json, readJson, sessionUserId, store } from "../lib/common.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const body = await readJson(req);
  const course = String(body.course || "");
  if (!COURSES[course]) return json(400, { error: "Unknown course." });

  // The learner must be signed in. The exam link goes to the email on their account.
  const uid = sessionUserId(req);
  const user = uid ? await store("users").get(uid, { type: "json" }) : null;
  if (!user) {
    return json(401, { error: "Please sign in or create an account before paying for the exam.", login: true });
  }

  // Paystack amounts are in the smallest unit (e.g. cents), so multiply by 100
  const amount = Math.round(Number(process.env.EXAM_PRICE) * 100);
  if (!amount) return json(500, { error: "Exam price is not configured." });

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount,
      currency: process.env.EXAM_CURRENCY || undefined,
      callback_url: `${process.env.URL}/payment-success.html`,
      metadata: { course, name: user.name, userId: uid },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!data.status) {
    console.error("Paystack initialize failed:", res.status, data);
    return json(502, { error: "Could not start payment. Please try again." });
  }
  return json(200, { url: data.data.authorization_url });
};

export const config = { path: "/api/create-checkout" };
