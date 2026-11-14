import {
  json, readJson, clientIp, requirePostWithCsrf, store, sha, attempts, addAttempt,
} from "../lib/common.mjs";
import crypto from "node:crypto";

const TOPICS = ["Course enquiry", "Enrolment and payment", "Certificates", "Technical help", "Something else"];
const oneLine = (v) => String(v).replace(/[\r\n]+/g, " ").trim();

export default async (req, context) => {
  const bad = requirePostWithCsrf(req);
  if (bad) return bad;

  const d = await readJson(req);
  const str = (k) => (typeof d[k] === "string" ? d[k].trim() : "");
  const name = str("name"), email = str("email"), topic = str("topic"), message = str("message");
  const ip = clientIp(req, context);

  // Hidden field people never see. Bots fill it in; pretend it worked and drop the message.
  if (typeof d.website === "string" && d.website !== "") return json(200, { ok: true });

  const errors = {};
  if (name.length < 2 || name.length > 100) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = "Enter a valid email, like name@example.com.";
  }
  if (!TOPICS.includes(topic)) errors.topic = "Choose a topic.";
  if (message.length < 10) errors.message = "Write at least 10 characters so we can help.";
  else if (message.length > 2000) errors.message = "Keep the message under 2000 characters.";
  if (Object.keys(errors).length) {
    return json(422, { error: "Please fix the highlighted fields.", fields: errors });
  }

  // At most 3 messages per device per hour.
  const att = await attempts("contact-attempts", sha(ip), 3600);
  if (att.n >= 3) {
    return json(429, { error: "You have sent several messages already. Please wait an hour and try again." });
  }
  await addAttempt(att);

  // Save first, so nothing is lost if email fails.
  const id = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const record = { id, name, email, topic, message, ip, emailed: false, createdAt: new Date().toISOString() };
  const messages = store("messages");
  await messages.setJSON(id, record);

  // Email it to the institute through Resend (https://resend.com).
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || "sfpinternational3@gmail.com";
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev";
  if (apiKey) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `SFP Website <${from}>`,
          to: [to],
          reply_to: email,
          subject: `[SFP website] ${topic} - ${oneLine(name)}`,
          text:
            `New message from the website contact form\n\n` +
            `Name: ${oneLine(name)}\nEmail: ${oneLine(email)}\nTopic: ${topic}\n\n${message}\n`,
        }),
      });
      if (r.ok) {
        record.emailed = true;
        await messages.setJSON(id, record);
      } else {
        console.error("Resend error", r.status, await r.text());
      }
    } catch (e) {
      console.error("Email failed", e);
    }
  } else {
    console.warn("RESEND_API_KEY not set: message saved but not emailed.");
  }

  return json(201, { ok: true });
};

export const config = { path: "/api/contact.php" };
