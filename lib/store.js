// Storage for bets. On Vercel this is Upstash Redis over its REST API
// (no driver needed). Locally, with no Redis configured, it uses a JSON file.

import { seedLegs, seedParlays, SEED_SEASON } from "./seed.js";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = "ccffl";

export const storageReady = () => !!(URL_ && TOKEN) || process.env.LOCAL_STORE === "1";

// ---------- backends ----------

async function redis(commands) {
  const res = await fetch(`${URL_.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis answered ${res.status}`);
  const out = await res.json();
  for (const r of out) if (r.error) throw new Error(`Redis: ${r.error}`);
  return out.map((r) => r.result);
}

let fileState = null;
async function fileBackend(commands) {
  const fs = await import("node:fs/promises");
  const path = process.env.LOCAL_STORE_FILE || ".data/store.json";
  if (!fileState) {
    try {
      fileState = JSON.parse(await fs.readFile(path, "utf8"));
    } catch {
      fileState = {};
    }
  }
  const results = [];
  let dirty = false;
  for (const [cmd, key, ...args] of commands) {
    const h = (fileState[key] = fileState[key] || {});
    switch (cmd) {
      case "HGETALL":
        results.push(Object.entries(h).flat());
        break;
      case "HGET":
        results.push(h[args[0]] ?? null);
        break;
      case "HSET":
        for (let i = 0; i < args.length; i += 2) h[args[i]] = args[i + 1];
        dirty = true;
        results.push(args.length / 2);
        break;
      case "HSETNX":
        if (h[args[0]] === undefined) {
          h[args[0]] = args[1];
          dirty = true;
          results.push(1);
        } else results.push(0);
        break;
      case "HDEL":
        for (const f of args) delete h[f];
        dirty = true;
        results.push(1);
        break;
      default:
        throw new Error(`Unsupported command ${cmd}`);
    }
  }
  if (dirty) {
    await fs.mkdir(path.split("/").slice(0, -1).join("/") || ".", { recursive: true });
    await fs.writeFile(path, JSON.stringify(fileState, null, 1));
  }
  return results;
}

const run = (commands) => (URL_ && TOKEN ? redis(commands) : fileBackend(commands));

const keys = (season) => ({
  legs: `${PREFIX}:${season}:legs`,
  parlays: `${PREFIX}:${season}:parlays`,
  meta: `${PREFIX}:meta`,
});

const pairs = (flat) => {
  const out = {};
  for (let i = 0; i < (flat || []).length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
};

// ---------- seed ----------

async function ensureSeeded(season) {
  if (String(season) !== SEED_SEASON) return;
  const k = keys(season);
  const [flag] = await run([["HGET", k.meta, `seeded:${season}`]]);
  if (flag) return;
  const cmds = seedLegs().map((l) => ["HSETNX", k.legs, `${l.week}:${l.userId}`, JSON.stringify(l)]);
  for (const [w, p] of Object.entries(seedParlays())) cmds.push(["HSETNX", k.parlays, w, JSON.stringify(p)]);
  cmds.push(["HSET", k.meta, `seeded:${season}`, new Date().toISOString()]);
  await run(cmds);
}

// ---------- API ----------

export async function readSeason(season) {
  await ensureSeeded(season);
  const k = keys(season);
  const [legsFlat, parlaysFlat, metaFlat] = await run([
    ["HGETALL", k.legs],
    ["HGETALL", k.parlays],
    ["HGETALL", k.meta],
  ]);
  const legs = Object.values(pairs(legsFlat)).map((v) => JSON.parse(v));
  const parlays = Object.fromEntries(Object.entries(pairs(parlaysFlat)).map(([w, v]) => [w, JSON.parse(v)]));
  const meta = pairs(metaFlat);
  return {
    legs,
    parlays,
    settings: { jerseyTiebreaker: meta.jerseyTiebreaker || "" },
  };
}

export async function getLeg(season, week, userId) {
  const [v] = await run([["HGET", keys(season).legs, `${week}:${userId}`]]);
  return v ? JSON.parse(v) : null;
}

export async function putLeg(season, leg) {
  await run([["HSET", keys(season).legs, `${leg.week}:${leg.userId}`, JSON.stringify(leg)]]);
}

export async function deleteLeg(season, week, userId) {
  await run([["HDEL", keys(season).legs, `${week}:${userId}`]]);
}

export async function getParlay(season, week) {
  const [v] = await run([["HGET", keys(season).parlays, String(week)]]);
  return v ? JSON.parse(v) : null;
}

export async function putParlay(season, week, record) {
  await run([["HSET", keys(season).parlays, String(week), JSON.stringify(record)]]);
}

export async function putSetting(name, value) {
  await run([["HSET", keys("x").meta, name, String(value)]]);
}
