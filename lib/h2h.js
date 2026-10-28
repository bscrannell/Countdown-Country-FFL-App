// Head-to-head: turns Sleeper weekly matchups into a list of games between
// people (by Sleeper user_id), then compares any two members.
//
// Regular season: every matchup before the playoff start week.
// Playoffs: only winners-bracket games count (consolation and toilet-bowl
// games are skipped). A bracket game played over two weeks (the 2020 and 2021
// championships) is one game with the scores added together.

const LABEL = { 1: "Championship", 3: "3rd place game", 5: "5th place game" };

function bracketLabel(m, rounds) {
  if (m.p) return LABEL[m.p] || `${m.p}th place game`;
  if (m.r === rounds) return "Championship";
  if (m.r === rounds - 1) return "Semifinal";
  return "Wild card round";
}

// weeks: { [week]: [{ rosterId, matchupId, points }] }
export function seasonGames({ season, weeks, rosterToUser, playoffWeekStart, bracket, lastWeek }) {
  const games = [];
  const pws = playoffWeekStart || 15;
  const rounds = Math.max(0, ...(bracket || []).map((m) => m.r));
  const byPair = new Map();
  for (const m of bracket || []) if (m.t1 && m.t2) byPair.set([m.t1, m.t2].sort((a, b) => a - b).join("-"), m);
  const playoff = new Map();

  const weekNums = Object.keys(weeks || {}).map(Number).filter((w) => w <= lastWeek).sort((a, b) => a - b);
  for (const w of weekNums) {
    const groups = {};
    for (const e of weeks[w]) {
      if (!e.matchupId) continue;
      (groups[e.matchupId] = groups[e.matchupId] || []).push(e);
    }
    for (const g of Object.values(groups)) {
      if (g.length !== 2) continue;
      const [x, y] = g;
      const ux = rosterToUser[x.rosterId], uy = rosterToUser[y.rosterId];
      if (!ux || !uy) continue;
      if (w < pws) {
        games.push({
          season, week: w, a: ux, b: uy, pa: x.points, pb: y.points, playoff: false, label: `Week ${w}`,
          winner: x.points === y.points ? null : x.points > y.points ? ux : uy,
        });
        continue;
      }
      const m = byPair.get([x.rosterId, y.rosterId].sort((a, b) => a - b).join("-"));
      if (!m) continue; // consolation or toilet bowl
      const key = m.m;
      const cur = playoff.get(key) || { season, week: w, a: ux, b: uy, pa: 0, pb: 0, playoff: true, label: bracketLabel(m, rounds), m };
      if (cur.a === ux) { cur.pa += x.points; cur.pb += y.points; } else { cur.pa += y.points; cur.pb += x.points; }
      playoff.set(key, cur);
    }
  }
  for (const g of playoff.values()) {
    if (!g.m.w) continue; // not decided yet
    g.winner = rosterToUser[g.m.w] || null;
    g.pa = Math.round(g.pa * 100) / 100;
    g.pb = Math.round(g.pb * 100) / 100;
    delete g.m;
    games.push(g);
  }
  return games;
}

// Compact form for the API: [season, week, a, b, pa, pb, playoff, label, winner]
export const packGame = (g) => [g.season, g.week, g.a, g.b, g.pa, g.pb, g.playoff ? 1 : 0, g.label, g.winner];
export const unpackGame = ([season, week, a, b, pa, pb, playoff, label, winner]) => ({ season, week, a, b, pa, pb, playoff: !!playoff, label, winner });

export function headToHead(games, A, B) {
  const meet = games
    .filter((g) => (g.a === A && g.b === B) || (g.a === B && g.b === A))
    .map((g) => {
      const flip = g.a !== A;
      return { ...g, ptsA: flip ? g.pb : g.pa, ptsB: flip ? g.pa : g.pb };
    })
    .sort((x, y) => Number(x.season) - Number(y.season) || x.week - y.week);

  const rec = (list) => ({
    w: list.filter((g) => g.winner === A).length,
    l: list.filter((g) => g.winner === B).length,
    t: list.filter((g) => !g.winner).length,
  });
  const reg = meet.filter((g) => !g.playoff), po = meet.filter((g) => g.playoff);
  let streak = null;
  for (let i = meet.length - 1; i >= 0; i--) {
    const who = meet[i].winner;
    if (!who) break;
    if (!streak) streak = { who, n: 1 };
    else if (streak.who === who) streak.n++;
    else break;
  }
  const biggest = (who) => {
    const wins = meet.filter((g) => g.winner === who).map((g) => ({ ...g, margin: Math.abs(g.ptsA - g.ptsB) }));
    return wins.sort((x, y) => y.margin - x.margin)[0] || null;
  };
  return {
    games: meet,
    total: rec(meet),
    regular: rec(reg),
    playoffs: rec(po),
    pointsA: meet.reduce((s, g) => s + g.ptsA, 0),
    pointsB: meet.reduce((s, g) => s + g.ptsB, 0),
    streak,
    biggestA: biggest(A),
    biggestB: biggest(B),
    last: meet[meet.length - 1] || null,
  };
}
