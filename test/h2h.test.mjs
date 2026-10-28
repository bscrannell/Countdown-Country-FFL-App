import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SLEEPER_FIXTURES = "1";
const { loadHistory, loadLeague } = await import("../lib/sleeper.js");
const { unpackGame, headToHead, seasonGames } = await import("../lib/h2h.js");
const { NICKNAMES } = await import("../lib/config.js");

const H = await loadHistory();
const id = Object.fromEntries(Object.entries(NICKNAMES).map(([k, v]) => [v, k]));

test("regular-season games rebuild every season's W-L-T exactly", () => {
  for (const s of H.seasons) {
    const games = s.games.map(unpackGame).filter((g) => !g.playoff);
    for (const m of s.members) {
      const mine = games.filter((g) => g.a === m.userId || g.b === m.userId);
      const w = mine.filter((g) => g.winner === m.userId).length;
      const t = mine.filter((g) => !g.winner).length;
      assert.deepEqual([w, mine.length - w - t, t], [m.wins, m.losses, m.ties], `${s.season} ${m.name}`);
    }
  }
});

test("playoff games follow the bracket, two-week finals summed", () => {
  const s2020 = H.seasons.find((s) => s.season === "2020").games.map(unpackGame).filter((g) => g.playoff);
  assert.equal(s2020.length, 4);
  const final = s2020.find((g) => g.label === "Championship");
  assert.equal(final.winner, id.Joey);
  const joeyPts = final.a === id.Joey ? final.pa : final.pb;
  assert.equal(joeyPts, 340.91);
  const s2025 = H.seasons.find((s) => s.season === "2025").games.map(unpackGame).filter((g) => g.playoff);
  assert.equal(s2025.length, 7);
  assert.equal(s2025.find((g) => g.label === "Championship").winner, id.Alex);
});

test("head to head adds up and is symmetric", async () => {
  const L = await loadLeague();
  const cur = seasonGames({ season: L.season, weeks: L.weeks, rosterToUser: Object.fromEntries(L.members.map((m) => [m.rosterId, m.userId])), playoffWeekStart: L.playoffWeekStart, bracket: L.winnersBracket, lastWeek: L.lastScoredWeek });
  const all = H.seasons.flatMap((s) => s.games.map(unpackGame)).concat(cur);
  const ab = headToHead(all, id.Alex, id.Chase), ba = headToHead(all, id.Chase, id.Alex);
  assert.ok(ab.games.length > 5);
  assert.deepEqual([ab.total.w, ab.total.l, ab.total.t], [ba.total.l, ba.total.w, ba.total.t]);
  assert.equal(ab.total.w + ab.total.l + ab.total.t, ab.games.length);
  const champ = ab.games.find((g) => g.season === "2025" && g.label === "Championship");
  assert.equal(champ.winner, id.Alex);
  console.log("Alex vs Chase:", ab.total, "regular", ab.regular, "playoffs", ab.playoffs, ab.games.length, "games");
});
