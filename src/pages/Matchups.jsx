import { useApp } from "../app.jsx";
import { Link, Section, fmtPts } from "../ui.jsx";
import { weekGames, lowestScorer, highestScorer } from "../../lib/league.js";
import { BETS } from "../../lib/config.js";

export default function Matchups({ week }) {
  const { L, byRoster } = useApp();
  const weeks = Object.keys(L.weeks).map(Number).sort((a, b) => a - b);
  const w = week || Math.min(L.week, Math.max(...weeks));
  const games = weekGames(L, w);
  const final = w <= L.lastScoredWeek;
  const lo = lowestScorer(L, w), hi = highestScorer(L, w);

  const shame = [];
  for (let i = 1; i <= L.lastScoredWeek; i++) {
    const l = lowestScorer(L, i);
    if (l) shame.push({ week: i, ...l });
  }
  const counts = {};
  for (const s of shame) counts[s.rosterId] = (counts[s.rosterId] || 0) + 1;
  const leaders = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page">
      <h1 className="page-title">Week {w} scores</h1>
      <div className="week-pills" role="navigation" aria-label="Choose week">
        {weeks.map((n) => (
          <Link key={n} to={`/matchups/${n}`} className={n === w ? "pill active" : "pill"} aria-current={n === w ? "page" : undefined}>{n}</Link>
        ))}
      </div>
      {!final ? <p className="notice">Week {w} is still being played. Scores update every couple of minutes.</p> : null}

      <div className="games">
        {games.map((g, i) => {
          const sides = [g.a, g.b];
          return (
            <div className="game" key={i}>
              {sides.map((s) => {
                const m = byRoster[s.rosterId];
                const tags = [];
                if (final && hi && hi.rosterId === s.rosterId) tags.push("Top score");
                if (final && lo && lo.rosterId === s.rosterId) tags.push("Low score");
                return (
                  <div key={s.rosterId} className={`game-side${g.winner === s.rosterId ? " won" : ""}${g.winner && g.winner !== s.rosterId ? " lost" : ""}`}>
                    <span className="game-name">
                      {m.name}
                      <span className="game-team">{m.team}</span>
                    </span>
                    {tags.map((t) => <span key={t} className={t === "Low score" ? "tag tag-flag" : "tag"}>{t}</span>)}
                    <span className="game-pts">{fmtPts(s.points)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <Section title="On the hook" intro="Each week's low scorer places the next week's parlay.">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">Low scorer</th>
                <th scope="col" className="num">Points</th>
                <th scope="col">Paid for</th>
              </tr>
            </thead>
            <tbody>
              {shame.map((s) => (
                <tr key={s.week}>
                  <td><Link to={`/matchups/${s.week}`}>Week {s.week}</Link></td>
                  <td>{byRoster[s.rosterId].name}</td>
                  <td className="num">{fmtPts(s.points)}</td>
                  <td>{s.week + 1 <= BETS.lastWeek ? <Link to={`/bets/week/${s.week + 1}`}>Week {s.week + 1} parlay</Link> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leaders.length ? (
          <p className="footnote">
            Most times on the hook: {leaders.filter(([, n]) => n === leaders[0][1]).map(([r]) => byRoster[r].name).join(", ")} ({leaders[0][1]}).
          </p>
        ) : null}
      </Section>
    </div>
  );
}
