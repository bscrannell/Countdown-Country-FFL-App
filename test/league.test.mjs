import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SLEEPER_FIXTURES = "1";
const { loadLeague, loadHistory } = await import("../lib/sleeper.js");
const { standings, bracket, draftOrder, autoBettor, powerRankings, pickLedger } = await import("../lib/league.js");
const { deadlineForWeek, openBetWeek } = await import("../lib/deadline.js");

const L = await loadLeague();
const st = standings(L);
const name = (rid) => L.members.find((m) => m.rosterId === rid).name;

test("seeds match the spreadsheet", () => {
  const seeds = Object.fromEntries(st.rows.filter((r) => r.seed).map((r) => [r.seed, r.name]));
  assert.deepEqual(seeds, { 1: "Chase", 2: "Alex", 3: "Noah", 4: "Joey", 5: "Tyler", 6: "Toby" });
});

test("projected draft order matches the spreadsheet", () => {
  const br = bracket(L, st);
  const d = draftOrder(L, st, br);
  const r1 = d.rounds[0].map((p) => `${name(p.ownerRosterId)}(${name(p.originalRosterId)})`);
  assert.deepEqual(r1, ["Trey(Wyatt)", "Trey(Austin)", "Wyatt(Kyle)", "Trey(Trey)", "Toby(Branden)", "Haas(Haas)", "Toby(Toby)", "Tyler(Tyler)", "Wyatt(Joey)", "Trey(Noah)", "Chase(Alex)", "Trey(Chase)"]);
  assert.equal(d.season, "2027");
});

test("bracket projection agrees with Sleeper's", () => {
  const br = bracket(L, st);
  assert.equal(br.sleeperMismatch, false);
  assert.equal(br.matches[0].t1.seed, 3);
});

test("bettors by week come from the previous week's low score", () => {
  const got = [2,3,4,5,6,7,8].map((w) => name(autoBettor(L, w).rosterId));
  assert.deepEqual(got, ["Wyatt", "Austin", "Trey", "Wyatt", "Branden", "Kyle", "Wyatt"]);
});

test("deadline is Thursday 8am ET and handles DST", () => {
  assert.equal(deadlineForWeek("2026-09-09", 8).toISOString(), "2026-10-29T12:00:00.000Z");
  assert.equal(deadlineForWeek("2026-09-09", 10).toISOString(), "2026-11-12T13:00:00.000Z");
  assert.equal(openBetWeek("2026-09-09", new Date("2026-10-28T16:00:00Z")), 8);
  assert.equal(openBetWeek("2026-09-09", new Date("2026-10-29T12:00:01Z")), 9);
});

test("power and ledger compute", () => {
  const p = powerRankings(L);
  assert.equal(p.length, 12);
  const totalAllPlayW = p.reduce((a, r) => a + r.allPlay.w, 0), totalL = p.reduce((a, r) => a + r.allPlay.l, 0);
  assert.equal(totalAllPlayW, totalL);
  const led = pickLedger(L);
  const total = Object.values(led.teams).reduce((a, t) => a + t["2027"].length, 0);
  assert.equal(total, 48);
});

test("history champions", async () => {
  const h = await loadHistory();
  const champ = Object.fromEntries(h.seasons.map((s) => [s.season, s.members.find((m) => m.place === 1).name]));
  assert.deepEqual(champ, { 2025: "Alex", 2024: "Branden", 2023: "Tyler", 2022: "Alex", 2021: "Haas", 2020: "Joey" });
});
