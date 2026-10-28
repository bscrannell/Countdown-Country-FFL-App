import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SLEEPER_FIXTURES = "1";
const { loadLeague } = await import("../lib/sleeper.js");
const { standings, bracket, draftOrder } = await import("../lib/league.js");
const base = await loadLeague();
const nm = (L, rid) => L.members.find((m) => m.rosterId === rid).name;
const order = (L) => { const st = standings(L); return draftOrder(L, st, bracket(L, st)).slots.map((s) => s.team.name); };

test("after round 1: losers drop to picks 7-8, alive teams by seed", () => {
  const L = { ...base, week: 16, winnersBracket: [
    { m: 1, r: 1, t1: 1, t2: 6, w: 1, l: 6 }, { m: 2, r: 1, t1: 5, t2: 8, w: 5, l: 8 },
    { m: 3, r: 2, t1: 9, t2: 5 }, { m: 4, r: 2, t1: 4, t2: 1 }, { m: 5, r: 2, p: 5, t1: 6, t2: 8 },
    { m: 6, r: 3, p: 1, t1_from: { w: 3 }, t2_from: { w: 4 } }, { m: 7, r: 3, p: 3, t1_from: { l: 3 }, t2_from: { l: 4 } } ] };
  assert.deepEqual(order(L).slice(6), ["Tyler", "Noah", "Toby", "Joey", "Alex", "Chase"]);
});

test("final results set picks 7-12 exactly", () => {
  const L = { ...base, week: 17, winnersBracket: [
    { m: 1, r: 1, t1: 1, t2: 6, w: 1, l: 6 }, { m: 2, r: 1, t1: 5, t2: 8, w: 5, l: 8 },
    { m: 3, r: 2, t1: 9, t2: 5, w: 5, l: 9 }, { m: 4, r: 2, t1: 4, t2: 1, w: 4, l: 1 }, { m: 5, r: 2, p: 5, t1: 6, t2: 8, w: 6, l: 8 },
    { m: 6, r: 3, p: 1, t1: 5, t2: 4, w: 5, l: 4 }, { m: 7, r: 3, p: 3, t1: 9, t2: 1, w: 1, l: 9 } ] };
  // 6th Noah, 5th Tyler, 4th Chase, 3rd Joey, 2nd Alex, champ Toby
  assert.deepEqual(order(L).slice(6), ["Noah", "Tyler", "Chase", "Joey", "Alex", "Toby"]);
});
