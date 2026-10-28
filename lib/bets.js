// Bet tracking logic. Replaces the spreadsheet's "Bet Sheet" tab.
// A leg's units: win at +odds = odds/100, win at -odds = 100/|odds|,
// loss = -1, push or no pick = 0. (The sheet stored 0.167 x decimal odds for a
// win and subtracted 0.167 per win in the total; this is the same number.)

import { BETS } from "./config.js";
import { legUnits, decimalOdds, americanFromDecimal } from "./odds.js";

export const RESULTS = ["pending", "win", "loss", "push"];

export function legsForWeek(legs, week) {
  return legs.filter((l) => l.week === week);
}

export function weekTally(legs) {
  const t = { win: 0, loss: 0, push: 0, pending: 0, units: 0, count: legs.length };
  for (const l of legs) {
    t[l.result] = (t[l.result] || 0) + 1;
    t.units += legUnits(l);
  }
  return t;
}

export function tallyText(t) {
  let s = `${t.win}W ${t.loss}L`;
  if (t.push) s += ` ${t.push}P`;
  if (t.pending) s += ` ${t.pending} open`;
  return s;
}

export function leaderboard(legs, members, weeks) {
  const rows = members.map((m) => {
    const mine = legs.filter((l) => l.userId === m.userId).sort((a, b) => a.week - b.week);
    let units = 0, w = 0, l = 0, p = 0, pending = 0;
    let best = null;
    const series = [];
    const byWeek = {};
    for (const leg of mine) byWeek[leg.week] = leg;
    for (const wk of weeks) {
      const leg = byWeek[wk];
      if (leg) {
        const u = legUnits(leg);
        units += u;
        if (leg.result === "win") {
          w++;
          if (!best || u > best.units) best = { units: u, pick: leg.pick, odds: leg.odds, week: leg.week };
        } else if (leg.result === "loss") l++;
        else if (leg.result === "push") p++;
        else pending++;
      }
      series.push({ week: wk, units, leg: leg || null });
    }
    const graded = mine.filter((x) => x.result === "win" || x.result === "loss");
    let streak = null;
    for (let i = graded.length - 1; i >= 0; i--) {
      const r = graded[i].result;
      if (!streak) streak = { result: r, n: 1 };
      else if (streak.result === r) streak.n++;
      else break;
    }
    const plusMoney = mine.filter((x) => x.result === "win" && x.odds > 0).length;
    return {
      userId: m.userId,
      name: m.name,
      units,
      w, l, p, pending,
      legs: mine.length,
      winPct: w + l ? w / (w + l) : null,
      best,
      streak,
      plusMoney,
      series,
      byWeek,
    };
  });
  rows.sort((a, b) => b.units - a.units || b.w - a.w);
  let rank = 0, prev = null;
  rows.forEach((r, i) => {
    if (prev === null || Math.abs(r.units - prev) > 1e-9) rank = i + 1;
    r.rank = rank;
    prev = r.units;
  });
  return rows;
}

// The real $2 parlay for a week.
export function parlaySummary(weekLegs, record, autoBettor) {
  const rec = record || {};
  const stake = rec.stake != null ? Number(rec.stake) : BETS.stake;
  const live = weekLegs.filter((l) => l.result !== "push");
  let combined = 1;
  let priced = true;
  for (const l of live) {
    const d = decimalOdds(l.odds);
    if (d == null) priced = false;
    else combined *= d;
  }
  const t = weekTally(weekLegs);
  let status = "open";
  if (!weekLegs.length) status = "empty";
  else if (t.loss > 0) status = "lost";
  else if (t.pending === 0) status = "won";
  else if (t.win > 0) status = "alive";

  const bookOdds = rec.bookOdds != null && rec.bookOdds !== "" ? Number(rec.bookOdds) : null;
  const effectiveDecimal = bookOdds != null ? decimalOdds(bookOdds) : combined;
  const toWin = live.length ? stake * effectiveDecimal : null;
  let payout = null;
  if (status === "lost") payout = 0;
  if (status === "won") payout = rec.payout != null && rec.payout !== "" ? Number(rec.payout) : toWin;
  const bettorUserId = rec.bettorUserId || (autoBettor && autoBettor.userId) || null;

  return {
    stake,
    legs: weekLegs.length,
    combinedDecimal: live.length ? combined : null,
    combinedAmerican: live.length && priced ? americanFromDecimal(combined) : null,
    priced,
    bookOdds,
    toWin,
    payout,
    status,
    placed: !!rec.placed,
    notes: rec.notes || "",
    bettorUserId,
    bettorOverridden: !!rec.bettorUserId,
    tally: t,
  };
}

export function parlayLedger(summaries) {
  let spent = 0, returned = 0, hits = 0, settled = 0;
  for (const s of summaries) {
    if (s.status === "empty") continue;
    if (s.status === "won" || s.status === "lost") {
      settled++;
      spent += s.stake;
      returned += s.payout || 0;
      if (s.status === "won") hits++;
    }
  }
  return { spent, returned, net: returned - spent, hits, settled };
}
