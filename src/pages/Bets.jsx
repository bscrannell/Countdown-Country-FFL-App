import { useMemo } from "react";
import { useApp } from "../app.jsx";
import { Link, Section, Units, UnitsBar, Spark, ResultChip, Empty } from "../ui.jsx";
import { leaderboard, legsForWeek, weekTally, tallyText, parlaySummary, parlayLedger } from "../../lib/bets.js";
import { autoBettor } from "../../lib/league.js";
import { fmtOdds, fmtUnits, fmtMoney, legUnits } from "../../lib/odds.js";

export default function Bets() {
  const { L, bets, betsErr, members, betWeeks, byUser, openWeek, auth } = useApp();
  const legs = bets ? bets.legs : [];
  const board = useMemo(() => leaderboard(legs, members, betWeeks), [legs, members, betWeeks]);
  const maxAbs = Math.max(1, ...board.map((r) => Math.abs(r.units)));
  const summaries = betWeeks.map((w) => ({ week: w, ...parlaySummary(legsForWeek(legs, w), bets && bets.parlays[w], autoBettor(L, w)) }));
  const ledger = parlayLedger(summaries);

  if (betsErr) return <div className="page"><div className="notice notice-bad">{betsErr}</div></div>;
  if (!bets) return <div className="page loading">Loading bets…</div>;

  const tie = board.length > 1 && Math.abs(board[0].units - board[1].units) < 1e-9;

  return (
    <div className="page">
      <h1 className="page-title">Jersey race</h1>
      <p className="lede">
        Every week the low scorer puts {fmtMoney(2)} on a parlay and everyone picks one leg. Each leg is one unit: a win pays the odds, a loss is −1, a push or a skipped week is 0. Most units after week 17 wins the jersey.
      </p>
      {openWeek ? (
        <p><Link to={`/bets/week/${openWeek}`} className="btn btn-primary">{auth.admin ? `Enter week ${openWeek} picks` : `See week ${openWeek} picks`}</Link></p>
      ) : null}

      <Section title="Standings">
        <div className="table-wrap">
          <table className="table board">
            <thead>
              <tr>
                <th scope="col" className="num">#</th>
                <th scope="col">Member</th>
                <th scope="col" className="num">Units</th>
                <th scope="col" className="hide-sm" aria-label="Units chart"></th>
                <th scope="col" className="num">W-L-P</th>
                <th scope="col" className="num hide-sm">Hit rate</th>
                <th scope="col" className="hide-sm">Best hit</th>
                <th scope="col" className="num hide-sm">Streak</th>
                <th scope="col" className="hide-xs">By week</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r) => (
                <tr key={r.userId} className={r.rank === 1 ? "leader" : ""}>
                  <td className="num">{r.rank}</td>
                  <th scope="row">{r.name}</th>
                  <td className="num"><Units value={r.units} /></td>
                  <td className="hide-sm bar-cell"><UnitsBar value={r.units} max={maxAbs} /></td>
                  <td className="num">{r.w}-{r.l}-{r.p}</td>
                  <td className="num hide-sm">{r.winPct == null ? "—" : `${Math.round(r.winPct * 100)}%`}</td>
                  <td className="hide-sm small">{r.best ? `${r.best.pick} (${fmtOdds(r.best.odds)})` : "—"}</td>
                  <td className="num hide-sm">{r.streak ? `${r.streak.result === "win" ? "W" : "L"}${r.streak.n}` : "—"}</td>
                  <td className="hide-xs"><Spark series={r.series} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">
          Tiebreaker for the jersey: {bets.settings.jerseyTiebreaker || "not decided yet"}.
          {tie ? " The top spot is tied right now." : ""}
        </p>
      </Section>

      <Section title="Bet sheet" intro="Every leg, week by week. Tap a week for the full parlay.">
        <div className="table-wrap">
          <table className="table grid">
            <thead>
              <tr>
                <th scope="col" className="sticky">Member</th>
                {betWeeks.map((w) => (
                  <th scope="col" key={w} className="num"><Link to={`/bets/week/${w}`}>Wk {w}</Link></th>
                ))}
                <th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r) => (
                <tr key={r.userId}>
                  <th scope="row" className="sticky">{r.name}</th>
                  {betWeeks.map((w) => {
                    const leg = r.byWeek[w];
                    return (
                      <td key={w} className={leg ? `cell cell-${leg.result}` : "cell cell-none"} title={leg ? `${leg.pick} ${fmtOdds(leg.odds)}` : "No pick"}>
                        {leg ? (
                          <>
                            <ResultChip result={leg.result} />
                            <span className="cell-u">{leg.result === "pending" ? fmtOdds(leg.odds) : fmtUnits(legUnits(leg), 2)}</span>
                          </>
                        ) : (
                          <span className="muted">·</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="num"><Units value={r.units} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="sticky">Week</th>
                {betWeeks.map((w) => (
                  <td key={w} className="num small">{tallyText(weekTally(legsForWeek(legs, w)))}</td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section title="The real parlays" intro={`${ledger.settled} settled, ${ledger.hits} hit. ${fmtMoney(ledger.spent)} spent, ${fmtMoney(ledger.returned)} back.`}>
        {summaries.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th scope="col">Bettor</th>
                  <th scope="col" className="num">Legs</th>
                  <th scope="col" className="num">Odds</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Payout</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.week}>
                    <td><Link to={`/bets/week/${s.week}`}>Week {s.week}</Link></td>
                    <td>{s.bettorUserId && byUser[s.bettorUserId] ? byUser[s.bettorUserId].name : "TBD"}</td>
                    <td className="num">{s.legs}</td>
                    <td className="num">{s.bookOdds != null ? fmtOdds(s.bookOdds) : s.combinedAmerican ? fmtOdds(s.combinedAmerican) : "—"}</td>
                    <td><StatusText s={s} /></td>
                    <td className="num">{s.status === "won" ? fmtMoney(s.payout) : s.status === "lost" ? fmtMoney(0) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No parlays yet.</Empty>
        )}
      </Section>
    </div>
  );
}

export function StatusText({ s }) {
  const map = { empty: "No picks yet", open: "Waiting on games", alive: "Still alive", lost: "Lost", won: "Hit" };
  return <span className={`status status-${s.status}`}>{map[s.status]}</span>;
}
