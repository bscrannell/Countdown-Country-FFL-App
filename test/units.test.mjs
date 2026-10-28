import { test } from "node:test";
import assert from "node:assert/strict";
import { seedLegs } from "../lib/seed.js";
import { leaderboard, weekTally, tallyText } from "../lib/bets.js";
import { NICKNAMES } from "../lib/config.js";

// "Units Won" column from the spreadsheet (S2..S35)
const SHEET = { Alex: 0.633333333333333, Branden: -2.2608695652173916, Austin: -1.8804347826086956, Noah: 5.782913165266106,
  Kyle: 3.9040838492451395, Trey: 2.894529142355229, Chase: -1.0568561872909703, Tyler: -0.44354838709677397,
  Haas: 1.9023809523809503, Toby: 7.045161290322581, Joey: 0.1547619047619047, Wyatt: -2.9242492155983864 };

test("units match the spreadsheet", () => {
  const members = Object.entries(NICKNAMES).map(([userId, name]) => ({ userId, name }));
  const rows = leaderboard(seedLegs(), members, [2,3,4,5,6,7]);
  for (const r of rows) assert.ok(Math.abs(r.units - SHEET[r.name]) < 1e-9, `${r.name}: ${r.units} vs ${SHEET[r.name]}`);
  assert.equal(rows[0].name, "Toby");
});

test("weekly tallies match the sheet's Total row (week 2 corrected)", () => {
  const legs = seedLegs();
  const want = { 2: "7W 5L", 3: "8W 2L", 4: "8W 3L 1P", 5: "6W 5L", 6: "6W 6L", 7: "5W 7L" };
  for (const [w, s] of Object.entries(want)) assert.equal(tallyText(weekTally(legs.filter(l => l.week == w))), s);
});
