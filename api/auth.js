import { isAdmin } from "../lib/http.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ admin: isAdmin(req) });
}
