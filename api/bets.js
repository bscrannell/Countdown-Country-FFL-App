import { BETS, NICKNAMES } from "../lib/config.js";
import { parseOdds } from "../lib/odds.js";
import { leagueBasics } from "../lib/sleeper.js";
import * as store from "../lib/store.js";
import { isAdmin, body, fail } from "../lib/http.js";

const RESULTS = new Set(["pending", "win", "loss", "push"]);
const SPORTS = new Set(["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL", "UFC", "Soccer", "Golf", "Other"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!store.storageReady()) {
    return fail(res, 503, "Bet storage isn't connected yet. Add an Upstash Redis database to this Vercel project.");
  }
  try {
    if (req.method === "GET") {
      const basics = req.query && req.query.season ? null : await leagueBasics();
      const season = (req.query && req.query.season) || basics.season;
      return res.status(200).json({ season, ...(await store.readSeason(season)) });
    }
    if (req.method !== "POST") return fail(res, 405, "Use GET or POST");
    const b = body(req);
    const basics = await leagueBasics();
    const season = basics.season;
    const admin = isAdmin(req);
    const week = Number(b.week);

    const checkWeek = () => Number.isInteger(week) && week >= BETS.firstWeek && week <= BETS.lastWeek;
    const knownUser = (id) => !!id && (basics.userIds.includes(id) || !!NICKNAMES[id]);

    switch (b.action) {
      case "submitLeg": {
        if (!admin) return fail(res, 401, "Only the commissioner can enter picks.");
        if (!checkWeek()) return fail(res, 400, `Week must be ${BETS.firstWeek}–${BETS.lastWeek}.`);
        if (!knownUser(b.userId)) return fail(res, 400, "Pick who you are from the list.");
        const pick = String(b.pick || "").trim().replace(/\s+/g, " ");
        if (pick.length < 2 || pick.length > 80) return fail(res, 400, "Describe the pick in 2–80 characters.");
        const odds = parseOdds(b.odds);
        if (odds == null) return fail(res, 400, "Enter American odds like -110 or +250.");
        const existing = await store.getLeg(season, week, b.userId);
        const sport = SPORTS.has(b.sport) ? b.sport : null;
        const leg = {
          season,
          week,
          userId: b.userId,
          pick,
          odds,
          sport,
          result: RESULTS.has(b.result) ? b.result : existing ? existing.result : "pending",
          createdAt: (existing && existing.createdAt) || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "admin",
        };
        await store.putLeg(season, leg);
        return res.status(200).json({ ok: true, leg });
      }
      case "removeLeg": {
        if (!admin) return fail(res, 401, "Only the commissioner can remove picks.");
        const existing = await store.getLeg(season, week, b.userId);
        if (!existing) return fail(res, 404, "No pick to remove.");
        await store.deleteLeg(season, week, b.userId);
        return res.status(200).json({ ok: true });
      }
      case "gradeLeg": {
        if (!admin) return fail(res, 401, "Only the commissioner can grade picks.");
        if (!RESULTS.has(b.result)) return fail(res, 400, "Result must be win, loss, push or pending.");
        const existing = await store.getLeg(season, week, b.userId);
        if (!existing) return fail(res, 404, "No pick to grade.");
        const leg = { ...existing, result: b.result, gradedAt: new Date().toISOString() };
        await store.putLeg(season, leg);
        return res.status(200).json({ ok: true, leg });
      }
      case "saveParlay": {
        if (!admin) return fail(res, 401, "Only the commissioner can edit the parlay.");
        if (!checkWeek()) return fail(res, 400, "Bad week.");
        const bookOdds = b.bookOdds === "" || b.bookOdds == null ? null : parseOdds(b.bookOdds);
        if (b.bookOdds && bookOdds == null) return fail(res, 400, "Book odds must look like +2500.");
        const money = (v) => (v === "" || v == null ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v) * 100) / 100 : NaN);
        const payout = money(b.payout);
        const stake = money(b.stake);
        if (Number.isNaN(payout) || Number.isNaN(stake)) return fail(res, 400, "Amounts must be dollar values.");
        if (b.bettorUserId && !knownUser(b.bettorUserId)) return fail(res, 400, "Unknown bettor.");
        const record = {
          bettorUserId: b.bettorUserId || null,
          bookOdds,
          stake,
          payout,
          placed: !!b.placed,
          notes: String(b.notes || "").slice(0, 280),
          updatedAt: new Date().toISOString(),
        };
        await store.putParlay(season, week, record);
        return res.status(200).json({ ok: true, parlay: record });
      }
      case "setTiebreaker": {
        if (!admin) return fail(res, 401, "Only the commissioner can change rules.");
        await store.putSetting("jerseyTiebreaker", String(b.text || "").slice(0, 280));
        return res.status(200).json({ ok: true });
      }
      default:
        return fail(res, 400, "Unknown action.");
    }
  } catch (e) {
    return fail(res, 500, e.message);
  }
}
