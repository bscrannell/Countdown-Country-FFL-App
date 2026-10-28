import { useApp } from "../app.jsx";
import { Section, Who, fmtPts } from "../ui.jsx";
import { recordText, divisionName, winScore } from "../../lib/league.js";

const gb = (n) => (n === 0 ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n) => (n == null ? "—" : `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}`);

export default function Playoffs() {
  const { L, st, br, byRoster } = useApp();
  const rows = st.rows;
  const weeksLeft = Math.max(0, (L.playoffWeekStart - 1) - L.lastScoredWeek);

  return (
    <div className="page">
      <h1 className="page-title">Playoff picture</h1>
      <p className="lede">
        Division winners take seeds 1 to 4 by record, with points for breaking ties. The two highest-scoring teams that didn't win their division get the wild cards. Seeds 1 and 2 get a bye, and the bracket reseeds after the first round.
        {weeksLeft ? ` ${weeksLeft} regular-season ${weeksLeft === 1 ? "week" : "weeks"} left.` : ""}
      </p>
      {br.sleeperMismatch ? (
        <div className="notice">Sleeper's own bracket doesn't match these seeds right now. The commissioner may need to check the playoff settings in Sleeper.</div>
      ) : null}

      <Section title="Seeds">
        <div className="table-wrap">
          <table className="table standings">
            <thead>
              <tr>
                <th scope="col" className="num">Seed</th>
                <th scope="col" className="rowhead">Team</th>
                <th scope="col" className="num">Div</th>
                <th scope="col" className="num">Record</th>
                <th scope="col" className="num">PF</th>
                <th scope="col" className="num">Max PF</th>
                <th scope="col" className="num">Games back</th>
                <th scope="col" className="num">PF back</th>
                <th scope="col" className="num">Wild card</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.rosterId} className={[r.seed ? "in" : "out", r.seed === 6 || (rows[i + 1] && !rows[i + 1].seed && r.seed) ? "cut" : ""].join(" ")}>
                  <td className="num">{r.seed || ""}</td>
                  <th scope="row"><Who m={r} sub={r.seed ? (r.divWinner ? (r.seed <= 2 ? "Division winner, bye" : "Division winner") : "Wild card") : false} size={24} /></th>
                  <td className="num">{r.division}</td>
                  <td className="num">{recordText(r)}</td>
                  <td className="num">{fmtPts(r.pf)}</td>
                  <td className="num">{fmtPts(r.maxPf)}</td>
                  <td className="num">{r.divWinner ? "—" : gb(r.gamesBehind)}</td>
                  <td className="num">{r.divWinner ? "—" : fmtPts(r.pointsBehind)}</td>
                  <td className={`num ${r.wcGap == null ? "" : r.wcGap >= 0 ? "pos" : "neg"}`}>{r.divWinner ? "—" : signed(r.wcGap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Wild card shows the cushion over the first team out for teams in, and the PF gap to the last wild card for teams out. Ties count as half a win.</p>
      </Section>

      <Section title="Divisions">
        <div className="divisions">
          {st.divisions.map((d) => {
            const div = rows.filter((r) => r.division === d).sort((a, b) => a.divRank - b.divRank);
            return (
              <div className="division" key={d}>
                <h3>{divisionName(d)}</h3>
                <ol>
                  {div.map((r) => (
                    <li key={r.rosterId}>
                      <span className="div-name">{r.name}</span>
                      <span className="num">{recordText(r)}</span>
                      <span className="num muted">{fmtPts(r.pf)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={br.started ? "Bracket" : "Projected bracket"} intro={br.started ? null : "If the season ended today."}>
        <Bracket />
      </Section>
    </div>
  );
}

function Side({ t, winner, byRoster }) {
  const m = t.rosterId ? byRoster[t.rosterId] : null;
  const won = winner && t.rosterId === winner;
  const lost = winner && t.rosterId && t.rosterId !== winner;
  return (
    <div className={`bk-side${won ? " won" : ""}${lost ? " lost" : ""}`}>
      <span className="bk-seed">{t.seed || ""}</span>
      <span className="bk-name">{m ? m.name : <span className="muted">{t.placeholder}</span>}</span>
      <span className="bk-pts">{t.points ? fmtPts(t.points) : ""}</span>
    </div>
  );
}

export function Bracket() {
  const { br, byRoster, st } = useApp();
  const cols = [1, 2, 3].map((r) => br.matches.filter((m) => m.round === r));
  const bySeed = (s) => st.rows.find((r) => r.seed === s);
  return (
    <div className="bracket">
      {cols.map((ms, i) => (
        <div className="bk-col" key={i}>
          <h3>Week {br.weeks[i]}</h3>
          {i === 0 && !br.started
            ? [1, 2].map((s) => (
                <div className="bk-match bye" key={`bye${s}`}>
                  <div className="bk-label">Bye</div>
                  <Side t={{ rosterId: bySeed(s) && bySeed(s).rosterId, seed: s }} byRoster={byRoster} />
                </div>
              ))
            : null}
          {ms.map((m) => (
            <div className={`bk-match${m.p === 1 ? " final" : ""}${m.p && m.p > 1 ? " consolation" : ""}`} key={m.id}>
              <div className="bk-label">{m.label}</div>
              <Side t={m.t1} winner={m.winner} byRoster={byRoster} />
              <Side t={m.t2} winner={m.winner} byRoster={byRoster} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
