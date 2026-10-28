// Local server that mimics Vercel: serves public/ and runs api/*.js handlers.
// Usage: npm run dev   (set SLEEPER_FIXTURES=1 to use saved Sleeper data)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const port = Number(process.env.PORT || 3000);
process.env.LOCAL_STORE ??= "1";
process.env.LEAGUE_CODE ??= "countdown";
process.env.ADMIN_PIN ??= "1234";

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };

function decorate(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (v) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(v)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    const file = path.join(root, "api", url.pathname.slice(5) + ".js");
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end("not found"); }
    let raw = "";
    for await (const c of req) raw += c;
    req.query = Object.fromEntries(url.searchParams);
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
    const mod = await import(pathToFileURL(file).href);
    return mod.default(req, decorate(res));
  }
  let file = path.join(root, "public", decodeURIComponent(url.pathname));
  if (!file.startsWith(path.join(root, "public")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "public", "index.html");
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Countdown County running at http://localhost:${port}`));
