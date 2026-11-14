import { readFile } from "node:fs/promises";
import path from "node:path";
import { json, sessionUserId } from "../lib/common.mjs";

// Public key -> file inside the private-materials folder.
// A list means "use the first one that exists". Only keys listed here can be fetched.
const FILES = {
  "fms-1": "fsm.pdf",
  "rms-1": "rms.pdf",
  "ems-1": ["ems.pdf", "ems/emsmodule1.pdf"],
  "energy-1": "energy.pdf",
  "ism-1": "ism.pdf",
  "it-1": "it.pdf",
  "ohs-1": "ohs.pdf",
  "qms-1": "qms.pdf",
};

export default async (req) => {
  if (!sessionUserId(req)) {
    return json(401, { error: "Please sign in to open the course materials." });
  }

  const url = new URL(req.url);
  const entry = FILES[url.searchParams.get("f") || ""];
  if (!entry) return json(404, { error: "File not found." });

  const root = path.join(process.env.LAMBDA_TASK_ROOT || process.cwd(), "private-materials");
  let data = null;
  let name = "material.pdf";
  for (const rel of [].concat(entry)) {
    try {
      data = await readFile(path.join(root, rel));
      name = path.basename(rel);
      break;
    } catch {
      /* try the next candidate */
    }
  }
  if (!data) return json(404, { error: "File not found." });

  const mode = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${mode}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

export const config = { path: "/api/material" };
