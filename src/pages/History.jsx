import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app.jsx";
import { Section, fmtPts } from "../ui.jsx";
import { getJSON } from "../client.js";
import { seasonGames, unpackGame, headToHead } from "../../lib/h2h.js";

export default function History() {
  const { L } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { getJSON("/api/history").then(setData, (e) => setErr(e.message)); }, []);

  const allTime = useMemo(() => {
    if (!data) return [];
    const t = {};
    for (const s of data.seasons) {
      for (const m of s.members) {
        const r = (t[m.userId] = t[m.userId] || { userId: m.userId, name: m.name, seasons: 0, w: 0, l: 0, t: 0, pf: 0, titles: 0, finals: 0, podiums: 0, playoffs: 0, years: [] });
        r.name = m.name;
        r.seasons++; r.w += m.wins; r.l += m.losses; r.t += m.ties; r.pf += m.pf;
        if (m.place === 1) { r.titles++; r.years.push(s.season); }
        if (m.place && m.place <= 2) r.finals++;
        if (m.place && m.place <= 3) r.podiums++;
        if (m.place) r.playoffs++;
      }
    }
    return Object.values(t).sort((a, b) => b.titles - a.titles || b.finals - a.finals || (b.w + 0.5 * b.t) / (b.w + b.l + b.t) - (a.w + 0.5 * a.t) / (a.w + a.l + a.t));
  }, [data]);

  if (err) return <div className="page"><div className="notice notice-bad">{err}</div></div>;
  if (!data) return <div className="page loading">Loading league history…</div>;

  const placeName = (s, p) => s.members.find((m) => m.place === p);

  return (
    <div className="page">
      <h1 className="page-title">League history</h1>
      <p className="lede">{data.seasons.length} completed seasons on Sleeper. The {L.season} season counts once it's finished.</p>

      <HeadToHead data={data} />

      <Section title="Champions">
        <ol className="champs">
          {data.seasons.map((s) => {
            const c = placeName(s, 1), ru = placeName(s, 2), third = placeName(s, 3);
            const bestRec = [...s.members].sort((a, b) => b.wins - a.wins || b.pf - a.pf)[0];
            const bestPf = [...s.members].sort((a, b) => b.pf - a.pf)[0];
            return (
              <li key={s.season} className="champ">
                <span className="champ-year">{s.season}</span>
                <span className="champ-name">{c ? c.name : "—"}</span>
                <span className="champ-detail">
                  {ru ? `Beat ${ru.name} in the final.` : ""} {third ? `${third.name} took 3rd.` : ""} Best record: {bestRec.name} ({bestRec.wins}-{bestRec.losses}{bestRec.ties ? `-${bestRec.ties}` : ""}). Most points: {bestPf.name} ({fmtPts(bestPf.pf)}).
                </span>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="All-time">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="rowhead">Member</th>
                <th scope="col" className="num">Titles</th>
                <th scope="col" className="num">Finals</th>
                <th scope="col" className="num">Playoffs</th>
                <th scope="col" className="num">Record</th>
                <th scope="col" className="num">Win %</th>
                <th scope="col" className="num">PF per season</th>
              </tr>
            </thead>
            <tbody>
              {allTime.map((r) => (
                <tr key={r.userId}>
                  <th scope="row">{r.name}{r.years.length ? <span className="muted small"> {r.years.join(", ")}</span> : null}</th>
                  <td className="num">{r.titles}</td>
                  <td className="num">{r.finals}</td>
                  <td className="num">{r.playoffs}</td>
                  <td className="num">{r.w}-{r.l}{r.t ? `-${r.t}` : ""}</td>
                  <td className="num">{((r.w + 0.5 * r.t) / Math.max(1, r.w + r.l + r.t) * 100).toFixed(1)}%</td>
                  <td className="num">{fmtPts(r.pf / r.seasons)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Regular-season records only. Playoffs counts seasons that ended with a top-6 finish in the winners bracket.</p>
      </Section>
    </div>
  );
}

const rec = (r) => `${r.w}-${r.l}${r.t ? `-${r.t}` : ""}`;

function HeadToHead({ data }) {
  const { L, members, byUser } = useApp();
  const [a, setA] = useState(members[0].userId);
  const [b, setB] = useState(members[1].userId);

  const games = useMemo(() => {
    const past = data.seasons.flatMap((s) => (s.games || []).map(unpackGame));
    const current = seasonGames({
      season: L.season,
      weeks: L.weeks,
      rosterToUser: Object.fromEntries(L.members.map((m) => [m.rosterId, m.userId])),
      playoffWeekStart: L.playoffWeekStart,
      bracket: L.winnersBracket,
      lastWeek: L.lastScoredWeek,
    });
    return past.concat(current);
  }, [data, L]);

  const h = useMemo(() => (a && b && a !== b ? headToHead(games, a, b) : null), [games, a, b]);
  const A = byUser[a], B = byUser[b];

  return (
    <Section title="Head to head" intro="Every game two members have played against each other since 2020, this season included. Playoffs count winners-bracket games only.">
      <div className="h2h-pick">
        <label className="field">
          <span>Team</span>
          <select value={a} onChange={(e) => setA(e.target.value)}>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-quiet h2h-swap" onClick={() => { setA(b); setB(a); }} aria-label="Swap teams">Swap</button>
        <label className="field">
          <span>Opponent</span>
          <select value={b} onChange={(e) => setB(e.target.value)}>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </label>
      </div>

      {a === b ? (
        <p className="muted">Pick two different members.</p>
      ) : !h.games.length ? (
        <p className="muted">{A.name} and {B.name} haven't played each other yet.</p>
      ) : (
        <>
          <div className="h2h-score" aria-live="polite">
            <div className={h.total.w > h.total.l ? "h2h-side lead" : "h2h-side"}>
              <span className="h2h-name">{A.name}</span>
              <span className="h2h-wins">{h.total.w}</span>
            </div>
            <div className="h2h-mid">{h.total.t ? `${h.total.t} tied` : "–"}</div>
            <div className={h.total.l > h.total.w ? "h2h-side lead right" : "h2h-side right"}>
              <span className="h2h-wins">{h.total.l}</span>
              <span className="h2h-name">{B.name}</span>
            </div>
          </div>
          <dl className="h2h-facts">
            <div><dt>Regular season</dt><dd>{rec(h.regular)}</dd></div>
            <div><dt>Playoffs</dt><dd>{h.playoffs.w + h.playoffs.l + h.playoffs.t ? rec(h.playoffs) : "Never met"}</dd></div>
            <div><dt>Points</dt><dd>{fmtPts(h.pointsA)} to {fmtPts(h.pointsB)}</dd></div>
            <div><dt>Streak</dt><dd>{h.streak ? `${byUser[h.streak.who].name} has won ${h.streak.n}` : "Last game tied"}</dd></div>
            {h.biggestA ? <div><dt>{A.name}'s biggest win</dt><dd>by {fmtPts(h.biggestA.margin)}, {h.biggestA.season} {h.biggestA.label.toLowerCase()}</dd></div> : null}
            {h.biggestB ? <div><dt>{B.name}'s biggest win</dt><dd>by {fmtPts(h.biggestB.margin)}, {h.biggestB.season} {h.biggestB.label.toLowerCase()}</dd></div> : null}
          </dl>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col">Game</th>
                  <th scope="col" className="num">{A.name}</th>
                  <th scope="col" className="num">{B.name}</th>
                  <th scope="col">Winner</th>
                </tr>
              </thead>
              <tbody>
                {[...h.games].reverse().map((g) => (
                  <tr key={`${g.season}-${g.week}-${g.label}`} className={g.playoff ? "h2h-playoff" : ""}>
                    <td>{g.season}</td>
                    <td>{g.label}</td>
                    <td className={`num${g.winner === a ? " strong" : ""}`}>{fmtPts(g.ptsA)}</td>
                    <td className={`num${g.winner === b ? " strong" : ""}`}>{fmtPts(g.ptsB)}</td>
                    <td>{g.winner ? byUser[g.winner].name : "Tie"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}
