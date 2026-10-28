import { useMemo } from "react";
import { useApp } from "../app.jsx";
import { Section, fmtPts } from "../ui.jsx";
import { powerRankings, recordText } from "../../lib/league.js";

const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(0)}%`);
const signed = (x, d = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}`;

export default function Power() {
  const { L } = useApp();
  const rows = useMemo(() => powerRankings(L), [L]);
  const luckiest = [...rows].sort((a, b) => b.luck - a.luck)[0];
  const unluckiest = [...rows].sort((a, b) => a.luck - b.luck)[0];

  return (
    <div className="page">
      <h1 className="page-title">Power rankings</h1>
      <p className="lede">
        Your all-play record is what you'd be if you played all 11 teams every week. Luck is actual wins minus the wins that all-play record predicts. Lineup efficiency is points scored as a share of Max PF.
      </p>
      <p className="callouts">
        Luckiest: <strong>{luckiest.name}</strong> ({signed(luckiest.luck)} wins). Least lucky: <strong>{unluckiest.name}</strong> ({signed(unluckiest.luck)} wins).
      </p>
      <Section title={`Through week ${L.lastScoredWeek}`}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col" className="num">#</th>
                <th scope="col" className="rowhead">Team</th>
                <th scope="col" className="num">Score</th>
                <th scope="col" className="num">Record</th>
                <th scope="col" className="num">All-play</th>
                <th scope="col" className="num">Luck</th>
                <th scope="col" className="num">Efficiency</th>
                <th scope="col" className="num">Last 3 avg</th>
                <th scope="col" className="num">PPG</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rosterId}>
                  <td className="num">{r.powerRank}</td>
                  <th scope="row">{r.name}</th>
                  <td className="num"><strong>{r.score.toFixed(1)}</strong></td>
                  <td className="num">{recordText(r)}</td>
                  <td className="num">{r.allPlay.w}-{r.allPlay.l}{r.allPlay.t ? `-${r.allPlay.t}` : ""}</td>
                  <td className={`num ${r.luck >= 0 ? "pos" : "neg"}`}>{signed(r.luck)}</td>
                  <td className="num">{pct(r.efficiency)}</td>
                  <td className="num">{fmtPts(r.recentAvg)}</td>
                  <td className="num">{fmtPts(r.ppg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Score blends all-play win rate (60%), actual win rate (20%) and all-play over the last three weeks (20%).</p>
      </Section>
    </div>
  );
}
