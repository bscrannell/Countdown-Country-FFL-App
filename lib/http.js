import crypto from "node:crypto";

function same(a, b) {
  if (!a || !b) return false;
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const isAdmin = (req) => same(req.headers["x-admin-pin"], process.env.ADMIN_PIN);
export const isMember = (req) => isAdmin(req) || same(req.headers["x-league-code"], process.env.LEAGUE_CODE);

export function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

export function fail(res, status, message) {
  res.status(status).json({ error: message });
}
