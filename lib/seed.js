// Weeks 2-7 of 2026, imported from the "Bet Sheet" tab of FBBet.xlsx.
// [name, pick, odds, result]. Blank weeks on the sheet (no pick) are left out.
// Week 2's summary row on the sheet said 6W6L; the cells (and this data) are 7W5L.

import { NICKNAMES } from "./config.js";

const W = "win", L = "loss", P = "push";

const SHEET = {
  2: [
    ["Alex", "Henry ATTD", -300, W],
    ["Branden", "Swift ATTD", -160, L],
    ["Austin", "SMU ML", 105, L],
    ["Noah", "J. Taylor ATTD", -150, W],
    ["Kyle", "J. Richie > 4.5 K's", 170, W],
    ["Trey", "Cook ATTD", -175, W],
    ["Chase", "49ers ML", -575, W],
    ["Tyler", "CMC ATTD", -200, W],
    ["Haas", "J. Chase ATTD", 110, W],
    ["Toby", "Skattebo ATTD", 110, L],
    ["Joey", "Miami -21.5", -110, L],
    ["Wyatt", "K. Walker ATTD", -140, L],
  ],
  3: [
    ["Branden", "TCU -3", -112, L],
    ["Austin", "Boise St. -7", -115, W],
    ["Kyle", "Army ML", -155, W],
    ["Trey", "Henry ATTD", -225, W],
    ["Chase", "Florida -3.5", 100, W],
    ["Tyler", "Stafford 2 Pass TD", -124, W],
    ["Haas", "LSU -10.5", 105, W],
    ["Toby", "Allen 2 ATTD", 350, W],
    ["Joey", "Louisville ML", -520, L],
    ["Wyatt", "Bama ML", -485, W],
  ],
  4: [
    ["Alex", "Keenan ATTD", null, P],
    ["Branden", "Miami -16.5", -115, W],
    ["Austin", "Kentucky ML", 125, W],
    ["Noah", "Air Force ML", -150, W],
    ["Kyle", "Braves Series W", -135, W],
    ["Trey", "Navy Air Force > 47.5", -110, L],
    ["Chase", "Florida ML", -200, L],
    ["Tyler", "T. McBride ATTD", 110, L],
    ["Haas", "OSU > 29.5", -125, W],
    ["Toby", "B. Bowers ATTD", 190, W],
    ["Joey", "Browns ML", 125, W],
    ["Wyatt", "Bama MSU > 60.5", -115, W],
  ],
  5: [
    ["Branden", "Ceedee ATTD", null, L],
    ["Austin", "Pitt -3.5", -115, L],
    ["Noah", "Oklahoma St ML", -425, W],
    ["Kyle", "Pickens > 62.5 yards", -110, W],
    ["Trey", "McBride ATTD", 110, W],
    ["Chase", "Allen ATTD", -130, W],
    ["Tyler", "Bijan ATTD", -260, L],
    ["Haas", "Indiana -7.5", -110, L],
    ["Toby", "Burrow > 1.5 TDs", -155, W],
    ["Joey", "Houston - K State < 55.5", -105, W],
    ["Wyatt", "Bama ML", -125, L],
  ],
  6: [
    ["Alex", "J. Johnson ATTD", 240, L],
    ["Branden", "J. Love > 270 passing", -115, W],
    ["Austin", "Oklahoma St ML", 165, L],
    ["Noah", "BYU ML", 350, W],
    ["Kyle", "Panthers ML", -110, W],
    ["Trey", "Kittle > 63.5 yards", -115, W],
    ["Chase", "P. Washington ATTD", 175, L],
    ["Tyler", "Metcalf < 50.5 yards", -115, L],
    ["Haas", "OSU Indiana < 50.5", -105, W],
    ["Toby", "Shough ATTD", 300, W],
    ["Joey", "OSU -6.5", 135, L],
    ["Wyatt", "JSN ATTD", 100, L],
  ],
  7: [
    ["Alex", "Petr Yan by decision", 130, W],
    ["Branden", "Rays ML", 135, L],
    ["Austin", "JMU -11.5", -105, L],
    ["Noah", "N. Texas ML", -140, W],
    ["Kyle", "Pickens > 1.5 TDs", 1000, L],
    ["Trey", "Ollie Gordon > 48.5 rush yds", -110, W],
    ["Chase", "Ole Miss ML", 130, L],
    ["Tyler", "Wisc ML", 125, W],
    ["Haas", "BYU -13.5", 195, L],
    ["Toby", "Pitt ML", 1100, L],
    ["Joey", "LSU -7.5", -105, W],
    ["Wyatt", "Henry ATTD", -220, L],
  ],
};

export const SEED_SEASON = "2026";

export function seedLegs() {
  const idByName = Object.fromEntries(Object.entries(NICKNAMES).map(([id, n]) => [n, id]));
  const out = [];
  for (const [week, rows] of Object.entries(SHEET)) {
    for (const [name, pick, odds, result] of rows) {
      out.push({
        season: SEED_SEASON,
        week: Number(week),
        userId: idByName[name],
        pick,
        odds,
        result,
        sport: null,
        updatedAt: "2026-10-28T00:00:00Z",
        source: "spreadsheet",
      });
    }
  }
  return out;
}

// Parlays for weeks 2-7: placed, all lost (every week had at least one losing leg).
export function seedParlays() {
  const out = {};
  for (const w of Object.keys(SHEET)) out[w] = { placed: true, notes: "Imported from the spreadsheet" };
  return out;
}
