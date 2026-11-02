import { COURSES } from "../lib/exams.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim().slice(0, 100);
  const course = String(body.course || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  if (!COURSES[course]) {
    return json({ error: "Unknown course." }, 400);
  }

  // Paystack amounts are in the smallest unit (e.g. cents), so multiply by 100
  const amount = Math.round(Number(process.env.EXAM_PRICE) * 100);
  if (!amount) return json({ error: "Exam price is not configured." }, 500);

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      currency: process.env.EXAM_CURRENCY || undefined,
      callback_url: `${process.env.URL}/payment-success.html`,
      metadata: { course, name },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!data.status) {
    console.error("Paystack initialize failed:", data);
    return json({ error: "Could not start payment. Please try again." }, 502);
  }

  return json({ url: data.data.authorization_url });
};

export const config = { path: "/api/create-checkout" };
