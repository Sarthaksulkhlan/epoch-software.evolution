#!/usr/bin/env node
// bob-hook.mjs — EPOCH hook notifier
// Usage: node scripts/bob-hook.mjs <action>
//   action: "file-changed" | "stop"
// Reads hook JSON from stdin; POSTs to the EPOCH API; always exits 0.

const action = process.argv[2];
const API = "http://127.0.0.1:3000";
const TIMEOUT_MS = 3000;

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

let url, body;
if (action === "file-changed") {
  url = `${API}/api/hooks/file-changed`;
  body = {
    file: payload.tool_input?.path ?? payload.tool_input?.destination ?? "",
    tool: payload.tool_name ?? "",
  };
} else if (action === "stop") {
  url = `${API}/api/hooks/bob-activity`;
  body = {
    event: "stop",
    detail: payload.last_assistant_message ?? null,
  };
} else {
  process.exit(0);
}

try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timer);
} catch {
  // network errors and timeouts are non-fatal
}

process.exit(0);
