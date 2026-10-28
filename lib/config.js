// League configuration. Edit this file to change names, rules or the deadline.

export const LEAGUE_ID =
  (typeof process !== "undefined" && process.env && process.env.LEAGUE_ID) ||
  "1312188294745841664";

export const LEAGUE_NAME = "Countdown County";

// Sleeper user_id -> the name everyone actually uses.
// Bets are keyed by Sleeper user_id, so they follow the person even if
// rosters ever change hands.
export const NICKNAMES = {
  "415996642882240512": "Joey",
  "416447102478987264": "Tyler",
  "459424912210128896": "Toby",
  "471743789493383168": "Austin",
  "539620225104900096": "Trey",
  "539648708573425664": "Alex",
  "593583469775347712": "Haas",
  "599387482362015744": "Chase",
  "599786474371620864": "Kyle",
  "676994755774750720": "Branden",
  "690633669643161600": "Wyatt",
  "732394108043255808": "Noah",
};

// Optional division names (Sleeper division number -> label).
export const DIVISION_NAMES = {
  1: "Division 1",
  2: "Division 2",
  3: "Division 3",
  4: "Division 4",
};

export const BETS = {
  stake: 2, // dollars the lowest scorer puts on the parlay
  legsPerParlay: 12,
  unitValue: 0.167, // dollars per unit: one leg's share of the $2 stake (same value the spreadsheet used)
  firstWeek: 2, // week 1's lowest scorer places the week 2 parlay
  lastWeek: 17,
  // Picks lock at this local time on the Thursday of the bet week.
  deadline: { weekday: "Thursday", hour: 8, minute: 0, timeZone: "America/New_York" },
};

export const RULES = {
  playoffTeams: 6,
  byes: 2,
  wildcards: 2,
  draftRounds: 4,
};
