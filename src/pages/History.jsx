import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app.jsx";
import { Section, fmtPts } from "../ui.jsx";
import { getJSON } from "../client.js";

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
                <th scope="col">Member</th>
                <th scope="col" className="num">Titles</th>
                <th scope="col" className="num">Finals</th>
                <th scope="col" className="num hide-sm">Playoffs</th>
                <th scope="col" className="num">Record</th>
                <th scope="col" className="num">Win %</th>
                <th scope="col" className="num hide-sm">PF per season</th>
              </tr>
            </thead>
            <tbody>
              {allTime.map((r) => (
                <tr key={r.userId}>
                  <th scope="row">{r.name}{r.years.length ? <span className="muted small"> {r.years.join(", ")}</span> : null}</th>
                  <td className="num">{r.titles}</td>
                  <td className="num">{r.finals}</td>
                  <td className="num hide-sm">{r.playoffs}</td>
                  <td className="num">{r.w}-{r.l}{r.t ? `-${r.t}` : ""}</td>
                  <td className="num">{((r.w + 0.5 * r.t) / Math.max(1, r.w + r.l + r.t) * 100).toFixed(1)}%</td>
                  <td className="num hide-sm">{fmtPts(r.pf / r.seasons)}</td>
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
