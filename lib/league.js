// Pure league logic shared by the browser and the API.
// It ports the spreadsheet's "Playoff Picture" tab and adds the league's rules:
//  - ties count as half a win
//  - division winners are seeded 1-4 by record, PF breaks ties
//  - the two best-PF teams that didn't win a division are the wild cards (5-6)
//  - seeds 1-2 get byes; the bracket reseeds after round 1
//  - 3rd place and 5th place games decide places 3-6
//  - draft: non-playoff teams pick 1-6 by Max PF (lowest first),
//    playoff teams pick 7-12 by finish (champion picks last)

import { RULES, DIVISION_NAMES } from "./config.js";

export const winScore = (m) => m.wins + 0.5 * (m.ties || 0);
export const recordText = (m) => `${m.wins}-${m.losses}${m.ties ? `-${m.ties}` : ""}`;

const byRecordThenPF = (a, b) => winScore(b) - winScore(a) || b.pf - a.pf;

export function divisionName(d) {
  return DIVISION_NAMES[d] || `Division ${d}`;
}

export function standings(L) {
  const rows = L.members.map((m) => ({ ...m }));
  const divisions = [...new Set(rows.map((r) => r.division))].sort((a, b) => a - b);

  for (const d of divisions) {
    const div = rows.filter((r) => r.division === d).sort(byRecordThenPF);
    const leader = div[0];
    div.forEach((r, i) => {
      r.divRank = i + 1;
      r.divWinner = i === 0;
      r.gamesBehind = winScore(leader) - winScore(r);
      r.pointsBehind = leader.pf - r.pf;
    });
  }

  const winners = rows.filter((r) => r.divWinner).sort(byRecordThenPF);
  winners.forEach((r, i) => (r.seed = i + 1));
  const field = rows.filter((r) => !r.divWinner).sort((a, b) => b.pf - a.pf);
  field.forEach((r, i) => {
    if (i < RULES.wildcards) r.seed = winners.length + i + 1;
  });

  // Wild-card race: for teams in, the cushion over the first team out;
  // for teams out, how far behind the last wild card they are.
  const lastIn = field[RULES.wildcards - 1];
  const firstOut = field[RULES.wildcards];
  for (const r of field) {
    r.wcGap = r.seed ? r.pf - (firstOut ? firstOut.pf : r.pf) : r.pf - lastIn.pf;
  }
  for (const r of winners) r.wcGap = null;

  rows.forEach((r) => (r.inPlayoffs = !!r.seed));
  const overall = [...rows].sort((a, b) => (a.seed || 99) - (b.seed || 99) || b.pf - a.pf);
  overall.forEach((r, i) => (r.rank = i + 1));
  return { rows: overall, divisions, field, winners };
}

// ---------- bracket ----------

function pointsFor(L, week, rosterId) {
  const wk = L.weeks && L.weeks[week];
  if (!wk) return null;
  const e = wk.find((x) => x.rosterId === rosterId);
  return e ? e.points : null;
}

// Builds the bracket. Before playoffs it's projected from the league's own
// seeding; once playoffs start it follows Sleeper's bracket (that's where the
// games are actually played).
export function bracket(L, st) {
  const seedOf = {};
  st.rows.forEach((r) => r.seed && (seedOf[r.rosterId] = r.seed));
  const bySeed = (s) => st.rows.find((r) => r.seed === s);
  const pws = L.playoffWeekStart || 15;
  const sleeper = L.winnersBracket || [];
  const started = L.week >= pws && L.seasonType !== "pre";
  const useSleeper = started && sleeper.length > 0;

  const side = (rosterId, placeholder) => ({ rosterId: rosterId || null, seed: rosterId ? seedOf[rosterId] || null : null, placeholder });

  let matches;
  if (useSleeper) {
    matches = sleeper.map((m) => {
      const ph = (from) =>
        from ? (from.w ? `Winner of game ${from.w}` : `Loser of game ${from.l}`) : m.r === 2 && !m.p ? "Lowest seed left" : "TBD";
      const label = m.p === 1 ? "Championship" : m.p === 3 ? "3rd place" : m.p === 5 ? "5th place" : m.r === 1 ? "Wild card round" : "Semifinal";
      return {
        id: m.m,
        round: m.r,
        week: pws + m.r - 1,
        label,
        p: m.p || null,
        t1: side(m.t1, ph(m.t1_from)),
        t2: side(m.t2, m.p === 5 && !m.t2 ? "Wild card loser" : ph(m.t2_from)),
        winner: m.w || null,
        loser: m.l || null,
      };
    });
  } else {
    const s = (n) => (bySeed(n) ? bySeed(n).rosterId : null);
    matches = [
      { id: 1, round: 1, label: "Wild card round", t1: side(s(3), "3 seed"), t2: side(s(6), "6 seed") },
      { id: 2, round: 1, label: "Wild card round", t1: side(s(4), "4 seed"), t2: side(s(5), "5 seed") },
      { id: 3, round: 2, label: "Semifinal", t1: side(s(1), "1 seed"), t2: side(null, "Lowest seed left") },
      { id: 4, round: 2, label: "Semifinal", t1: side(s(2), "2 seed"), t2: side(null, "Other wild card winner") },
      { id: 5, round: 2, label: "5th place", p: 5, t1: side(null, "Loser of 3 v 6"), t2: side(null, "Loser of 4 v 5") },
      { id: 6, round: 3, label: "Championship", p: 1, t1: side(null, "Semifinal winner"), t2: side(null, "Semifinal winner") },
      { id: 7, round: 3, label: "3rd place", p: 3, t1: side(null, "Semifinal loser"), t2: side(null, "Semifinal loser") },
    ].map((m) => ({ ...m, week: pws + m.round - 1, p: m.p || null, winner: null, loser: null }));
  }

  for (const m of matches) {
    m.t1.points = m.t1.rosterId ? pointsFor(L, m.week, m.t1.rosterId) : null;
    m.t2.points = m.t2.rosterId ? pointsFor(L, m.week, m.t2.rosterId) : null;
  }

  // Does Sleeper's first round match the league's rules?
  let sleeperMismatch = false;
  if (!useSleeper && sleeper.length) {
    const ours = new Set(matches.filter((m) => m.round === 1).map((m) => [m.t1.rosterId, m.t2.rosterId].sort().join("-")));
    const theirs = sleeper.filter((m) => m.r === 1 && m.t1 && m.t2).map((m) => [m.t1, m.t2].sort().join("-"));
    sleeperMismatch = theirs.length > 0 && theirs.some((k) => !ours.has(k));
  }

  const byes = [bySeed(1), bySeed(2)].filter(Boolean).map((r) => r.rosterId);
  return { matches, started: useSleeper, byes, sleeperMismatch, weeks: [pws, pws + 1, pws + 2] };
}

// Final or projected finish (1-6) for each playoff team.
export function playoffFinish(st, br) {
  const playoff = st.rows.filter((r) => r.seed);
  const known = {};
  for (const m of br.matches) {
    if (m.p && m.winner && m.loser) {
      known[m.winner] = m.p;
      known[m.loser] = m.p + 1;
    }
  }
  const lostIn = {};
  for (const m of br.matches) if (m.loser && !m.p) lostIn[m.loser] = m.round;

  const key = (r) => {
    if (known[r.rosterId]) return known[r.rosterId];
    if (lostIn[r.rosterId] === 1) return 5 + r.seed / 100;
    if (lostIn[r.rosterId] === 2) return 3 + r.seed / 100;
    return 1 + r.seed / 100;
  };
  const sorted = [...playoff].sort((a, b) => key(a) - key(b));
  const out = {};
  sorted.forEach((r, i) => (out[r.rosterId] = { place: i + 1, final: !!known[r.rosterId] }));
  return out;
}

// ---------- draft ----------

export function draftOrder(L, st, br) {
  const n = st.rows.length;
  const nextSeason = String(Number(L.season) + 1);
  const finish = playoffFinish(st, br);
  const nonPlayoff = st.rows.filter((r) => !r.seed).sort((a, b) => a.maxPf - b.maxPf);
  const slots = [];
  nonPlayoff.forEach((r, i) => slots.push({ slot: i + 1, team: r, basis: "maxpf" }));
  const playoff = st.rows.filter((r) => r.seed).sort((a, b) => finish[b.rosterId].place - finish[a.rosterId].place);
  playoff.forEach((r, i) =>
    slots.push({ slot: nonPlayoff.length + i + 1, team: r, basis: "playoff", finish: finish[r.rosterId] })
  );
  slots.forEach((s, i) => {
    const prev = slots[i - 1];
    s.gapToPickAhead = s.basis === "maxpf" && prev && prev.basis === "maxpf" ? s.team.maxPf - prev.team.maxPf : null;
  });

  const owner = pickOwnerLookup(L);
  const rounds = [];
  for (let rd = 1; rd <= (L.draftRounds || RULES.draftRounds); rd++) {
    rounds.push(
      slots.map((s) => {
        const ownerId = owner(nextSeason, rd, s.team.rosterId);
        return {
          round: rd,
          slot: s.slot,
          label: `${rd}.${String(s.slot).padStart(2, "0")}`,
          overall: (rd - 1) * n + s.slot,
          originalRosterId: s.team.rosterId,
          ownerRosterId: ownerId,
          traded: ownerId !== s.team.rosterId,
        };
      })
    );
  }
  return { season: nextSeason, slots, rounds };
}

export function pickOwnerLookup(L) {
  const map = new Map();
  for (const p of L.tradedPicks || []) map.set(`${p.season}|${p.round}|${p.rosterId}`, p.ownerId);
  return (season, round, rosterId) => map.get(`${season}|${round}|${rosterId}`) ?? rosterId;
}

// Every future pick each team owns, by season.
export function pickLedger(L) {
  const cur = Number(L.season);
  const seasons = new Set([String(cur + 1), String(cur + 2), String(cur + 3)]);
  for (const p of L.tradedPicks || []) if (Number(p.season) > cur) seasons.add(String(p.season));
  const list = [...seasons].sort();
  const owner = pickOwnerLookup(L);
  const rounds = L.draftRounds || RULES.draftRounds;
  const teams = {};
  for (const m of L.members) teams[m.rosterId] = {};
  for (const s of list) {
    for (const m of L.members) teams[m.rosterId][s] = [];
    for (let rd = 1; rd <= rounds; rd++) {
      for (const m of L.members) {
        const o = owner(s, rd, m.rosterId);
        if (teams[o]) teams[o][s].push({ round: rd, fromRosterId: m.rosterId });
      }
    }
  }
  return { seasons: list, teams };
}

// ---------- weekly scores ----------

export function weekGames(L, week) {
  const wk = (L.weeks && L.weeks[week]) || [];
  const groups = {};
  for (const e of wk) {
    if (e.matchupId == null) continue;
    (groups[e.matchupId] = groups[e.matchupId] || []).push(e);
  }
  const final = week <= L.lastScoredWeek;
  return Object.values(groups)
    .filter((g) => g.length === 2)
    .map(([a, b]) => {
      const winner = final && a.points !== b.points ? (a.points > b.points ? a.rosterId : b.rosterId) : null;
      return { a, b, winner, margin: Math.abs(a.points - b.points), total: a.points + b.points, final };
    });
}

export function lowestScorer(L, week) {
  if (week < 1 || week > L.lastScoredWeek) return null;
  const wk = ((L.weeks && L.weeks[week]) || []).filter((e) => e.points != null);
  if (!wk.length) return null;
  return [...wk].sort((a, b) => a.points - b.points || a.rosterId - b.rosterId)[0];
}

export function highestScorer(L, week) {
  if (week < 1 || week > L.lastScoredWeek) return null;
  const wk = ((L.weeks && L.weeks[week]) || []).filter((e) => e.points != null);
  if (!wk.length) return null;
  return [...wk].sort((a, b) => b.points - a.points)[0];
}

// The lowest scorer of week N-1 places week N's parlay.
export function autoBettor(L, betWeek) {
  const low = lowestScorer(L, betWeek - 1);
  if (!low) return null;
  const m = L.members.find((x) => x.rosterId === low.rosterId);
  return m ? { userId: m.userId, rosterId: m.rosterId, points: low.points, fromWeek: betWeek - 1 } : null;
}

// ---------- power rankings ----------

export function powerRankings(L) {
  const weeks = [];
  for (let w = 1; w <= L.lastScoredWeek; w++) if (L.weeks && L.weeks[w]) weeks.push(w);
  const n = L.members.length;
  const stats = {};
  for (const m of L.members) stats[m.rosterId] = { apW: 0, apL: 0, apT: 0, expW: 0, weekly: [] };
  for (const w of weeks) {
    const wk = L.weeks[w];
    for (const e of wk) {
      let W = 0, Ls = 0, T = 0;
      for (const o of wk) {
        if (o.rosterId === e.rosterId) continue;
        if (e.points > o.points) W++;
        else if (e.points < o.points) Ls++;
        else T++;
      }
      const s = stats[e.rosterId];
      if (!s) continue;
      s.apW += W; s.apL += Ls; s.apT += T;
      s.expW += (W + 0.5 * T) / (n - 1);
      s.weekly.push({ week: w, points: e.points, apPct: (W + 0.5 * T) / (n - 1) });
    }
  }
  const rows = L.members.map((m) => {
    const s = stats[m.rosterId];
    const games = weeks.length || 1;
    const apPct = (s.apW + 0.5 * s.apT) / Math.max(1, s.apW + s.apL + s.apT);
    const recent = s.weekly.slice(-3);
    const recentPct = recent.length ? recent.reduce((a, b) => a + b.apPct, 0) / recent.length : 0;
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b.points, 0) / recent.length : 0;
    const winPct = winScore(m) / Math.max(1, m.wins + m.losses + (m.ties || 0));
    const score = 100 * (0.6 * apPct + 0.2 * winPct + 0.2 * recentPct);
    return {
      ...m,
      allPlay: { w: s.apW, l: s.apL, t: s.apT, pct: apPct },
      expectedWins: s.expW,
      luck: winScore(m) - s.expW,
      efficiency: m.maxPf ? m.pf / m.maxPf : null,
      recentAvg,
      ppg: m.pf / games,
      score,
      weekly: s.weekly,
    };
  });
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.powerRank = i + 1));
  return rows;
}
