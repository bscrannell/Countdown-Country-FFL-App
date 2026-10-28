import { isAdmin, isMember } from "../lib/http.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ member: isMember(req), admin: isAdmin(req) });
}
