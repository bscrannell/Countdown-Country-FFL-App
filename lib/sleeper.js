// Server-side Sleeper client. Sleeper's API is public and read-only.
// Set SLEEPER_FIXTURES=1 to read saved responses from fixtures/sleeper (local testing).

import { LEAGUE_ID, NICKNAMES } from "./config.js";

const BASE = "https://api.sleeper.app/v1";

async function get(path) {
  if (process.env.SLEEPER_FIXTURES === "1") {
    const fs = await import("node:fs/promises");
    const file = new URL(`../fixtures/sleeper/${path.replace(/^\//, "").replace(/\//g, "__")}.json`, import.meta.url);
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      return null;
    }
  }
  const res = await fetch(BASE + path, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Sleeper ${path} answered ${res.status}`);
  return res.json();
}

const num = (whole, dec) => (Number(whole) || 0) + (Number(dec) || 0) / 100;

function members(rosters, users) {
  const byId = Object.fromEntries((users || []).map((u) => [u.user_id, u]));
  return (rosters || []).map((r) => {
    const u = byId[r.owner_id] || {};
    const s = r.settings || {};
    return {
      rosterId: r.roster_id,
      userId: r.owner_id,
      name: NICKNAMES[r.owner_id] || u.display_name || `Team ${r.roster_id}`,
      handle: u.display_name || "",
      team: ((u.metadata && u.metadata.team_name) || u.display_name || "").trim(),
      avatar: u.avatar || null,
      division: s.division || 0,
      wins: s.wins || 0,
      losses: s.losses || 0,
      ties: s.ties || 0,
      pf: num(s.fpts, s.fpts_decimal),
      pa: num(s.fpts_against, s.fpts_against_decimal),
      maxPf: num(s.ppts, s.ppts_decimal),
    };
  });
}

// Everything the app needs about the current season, in one compact payload.
export async function loadLeague(leagueId = LEAGUE_ID) {
  const [league, state, users, rosters, traded, wb] = await Promise.all([
    get(`/league/${leagueId}`),
    get(`/state/nfl`),
    get(`/league/${leagueId}/users`),
    get(`/league/${leagueId}/rosters`),
    get(`/league/${leagueId}/traded_picks`),
    get(`/league/${leagueId}/winners_bracket`),
  ]);
  if (!league) throw new Error("League not found on Sleeper");
  const ls = league.settings || {};
  const sameSeason = !!state && String(state.season) === String(league.season);
  const lastScoredWeek = ls.last_scored_leg || 0;
  const currentWeek = sameSeason ? state.leg || state.week || lastScoredWeek + 1 : 18;
  const maxWeek = Math.min(Math.max(currentWeek, lastScoredWeek), 17);
  const weekNums = Array.from({ length: maxWeek }, (_, i) => i + 1);
  const matchups = await Promise.all(weekNums.map((w) => get(`/league/${leagueId}/matchups/${w}`)));
  const weeks = {};
  weekNums.forEach((w, i) => {
    const list = matchups[i] || [];
    if (list.length) weeks[w] = list.map((m) => ({ rosterId: m.roster_id, matchupId: m.matchup_id ?? null, points: Number(m.points) || 0 }));
  });

  return {
    leagueId,
    name: league.name,
    season: league.season,
    status: league.status,
    seasonType: sameSeason ? state.season_type : "off",
    week: currentWeek,
    lastScoredWeek,
    seasonStart: sameSeason ? state.season_start_date : null,
    playoffWeekStart: ls.playoff_week_start || 15,
    playoffTeams: ls.playoff_teams || 6,
    draftRounds: ls.draft_rounds || 4,
    previousLeagueId: league.previous_league_id || null,
    defendingChampRosterId: league.metadata && league.metadata.latest_league_winner_roster_id ? Number(league.metadata.latest_league_winner_roster_id) : null,
    members: members(rosters, users),
    weeks,
    tradedPicks: (traded || []).map((p) => ({ season: String(p.season), round: p.round, rosterId: p.roster_id, ownerId: p.owner_id })),
    winnersBracket: wb || [],
    fetchedAt: new Date().toISOString(),
  };
}

function placements(bracket) {
  const out = {};
  for (const m of bracket || []) {
    if (m.p && m.w && m.l) {
      out[m.w] = m.p;
      out[m.l] = m.p + 1;
    }
  }
  return out;
}

// Completed seasons, walking back through previous_league_id.
export async function loadHistory(leagueId = LEAGUE_ID) {
  const seasons = [];
  const current = await get(`/league/${leagueId}`);
  let id = current && current.previous_league_id;
  let guard = 0;
  while (id && id !== "0" && guard++ < 20) {
    const [lg, rosters, users, wb] = await Promise.all([
      get(`/league/${id}`),
      get(`/league/${id}/rosters`),
      get(`/league/${id}/users`),
      get(`/league/${id}/winners_bracket`),
    ]);
    if (!lg) break;
    const place = placements(wb);
    const ms = members(rosters, users).map((m) => ({ ...m, place: place[m.rosterId] || null }));
    seasons.push({
      leagueId: id,
      season: lg.season,
      status: lg.status,
      playoffTeams: (lg.settings && lg.settings.playoff_teams) || null,
      members: ms,
    });
    id = lg.previous_league_id;
  }
  return { seasons, fetchedAt: new Date().toISOString() };
}

export async function seasonStartDate() {
  const s = await get(`/state/nfl`);
  return s ? s.season_start_date : null;
}

// Just enough to enforce deadlines on the server.
export async function leagueBasics(leagueId = LEAGUE_ID) {
  const [league, state, users] = await Promise.all([get(`/league/${leagueId}`), get(`/state/nfl`), get(`/league/${leagueId}/users`)]);
  const same = !!state && String(state.season) === String(league.season);
  return { season: league.season, seasonStart: same ? state.season_start_date : null, userIds: (users || []).map((u) => u.user_id) };
}
