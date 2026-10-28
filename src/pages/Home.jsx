import { useMemo } from "react";
import { useApp } from "../app.jsx";
import { Link, Who, Avatar, Countdown, Section, UnitsBar, Units, fmtPts, ResultChip } from "../ui.jsx";
import { leaderboard, parlaySummary, legsForWeek, tallyText } from "../../lib/bets.js";
import { autoBettor, weekGames, lowestScorer, highestScorer, recordText } from "../../lib/league.js";
import { fmtDeadline } from "../../lib/deadline.js";
import { fmtOdds, fmtMoney } from "../../lib/odds.js";
import { BETS } from "../../lib/config.js";

export default function Home() {
  const { L, st, bets, byUser, byRoster, members, openWeek, betWeeks, deadline } = useApp();
  const legs = bets ? bets.legs : [];
  const board = useMemo(() => leaderboard(legs, members, betWeeks), [legs, members, betWeeks]);
  const maxAbs = Math.max(1, ...board.map((r) => Math.abs(r.units)));

  const liveWeek = openWeek ? openWeek - 1 : BETS.lastWeek;
  const liveLegs = legsForWeek(legs, liveWeek);
  const live = liveWeek >= BETS.firstWeek && liveLegs.some((l) => l.result === "pending")
    ? parlaySummary(liveLegs, bets && bets.parlays[liveWeek], autoBettor(L, liveWeek))
    : null;

  const recapWeek = L.lastScoredWeek;
  const games = recapWeek ? weekGames(L, recapWeek) : [];
  const closest = [...games].sort((a, b) => a.margin - b.margin)[0];
  const blowout = [...games].sort((a, b) => b.margin - a.margin)[0];
  const hi = highestScorer(L, recapWeek);
  const lo = lowestScorer(L, recapWeek);

  const field = st.rows.filter((r) => !r.divWinner).sort((a, b) => b.pf - a.pf);

  return (
    <div className="page">
      {openWeek ? <Slip week={openWeek} /> : <SeasonOver board={board} />}

      {live ? (
        <Link to={`/bets/week/${liveWeek}`} className="live-strip">
          <span className="live-dot" aria-hidden="true" />
          <span>
            Week {liveWeek} parlay is live: {tallyText(live.tally)}
            {live.status === "lost" ? ", it's dead" : live.toWin ? `, $${live.stake} to win ${fmtMoney(live.toWin)}` : ""}
          </span>
        </Link>
      ) : null}

      <div className="grid-2">
        <Section title="Jersey race" action={<Link to="/bets" className="more-link">Full bet sheet</Link>}>
          {bets ? (
            <ol className="race">
              {board.map((r) => (
                <li key={r.userId} className="race-row">
                  <span className="race-rank">{r.rank}</span>
                  <span className="race-name">{r.name}</span>
                  <UnitsBar value={r.units} max={maxAbs} />
                  <Units value={r.units} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Loading bets…</p>
          )}
        </Section>

        <Section title="Playoff picture" action={<Link to="/playoffs" className="more-link">Standings and bracket</Link>}>
          <ol className="seeds">
            {st.rows.filter((r) => r.seed).map((r) => (
              <li key={r.rosterId} className={r.seed <= 2 ? "seed-row bye" : "seed-row"}>
                <span className="seed-num">{r.seed}</span>
                <Who m={r} sub={r.divWinner ? `Division ${r.division} leader` : "Wild card on points"} size={26} />
                <span className="seed-rec">{recordText(r)}</span>
              </li>
            ))}
          </ol>
          <p className="cutline">
            First team out: <strong>{field[2] ? field[2].name : "—"}</strong>
            {field[2] ? `, ${fmtPts(Math.abs(field[2].wcGap))} PF behind ${field[1].name} for the last wild card.` : ""}
          </p>
        </Section>
      </div>

      {recapWeek ? (
        <Section title={`Week ${recapWeek} recap`} action={<Link to={`/matchups/${recapWeek}`} className="more-link">All scores</Link>}>
          <div className="recap">
            {hi ? <Recap label="Top score" m={byRoster[hi.rosterId]} value={fmtPts(hi.points)} /> : null}
            {lo ? (
              <Recap
                label="Low score"
                m={byRoster[lo.rosterId]}
                value={fmtPts(lo.points)}
                note={recapWeek < BETS.lastWeek ? `Places the week ${recapWeek + 1} parlay` : null}
                flag
              />
            ) : null}
            {closest ? <GameRecap label="Closest game" g={closest} byRoster={byRoster} /> : null}
            {blowout && blowout !== closest ? <GameRecap label="Biggest blowout" g={blowout} byRoster={byRoster} /> : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Recap({ label, m, value, note, flag }) {
  return (
    <div className={flag ? "recap-card flagged" : "recap-card"}>
      <div className="recap-label">{label}</div>
      <Who m={m} size={30} />
      <div className="recap-value">{value}</div>
      {note ? <div className="recap-note">{note}</div> : null}
    </div>
  );
}

function GameRecap({ label, g, byRoster }) {
  const [w, l] = g.a.points >= g.b.points ? [g.a, g.b] : [g.b, g.a];
  return (
    <div className="recap-card">
      <div className="recap-label">{label}</div>
      <div className="recap-game">
        <span><strong>{byRoster[w.rosterId].name}</strong> {fmtPts(w.points)}</span>
        <span>{byRoster[l.rosterId].name} {fmtPts(l.points)}</span>
      </div>
      <div className="recap-value">by {fmtPts(g.margin)}</div>
    </div>
  );
}

function Slip({ week }) {
  const { L, bets, byUser, members, deadline, auth } = useApp();
  const legs = bets ? legsForWeek(bets.legs, week) : [];
  const rec = bets && bets.parlays[week];
  const auto = autoBettor(L, week);
  const sum = parlaySummary(legs, rec, auto);
  const bettor = sum.bettorUserId ? byUser[sum.bettorUserId] : null;
  const dl = deadline(week);
  const inIds = new Set(legs.map((l) => l.userId));

  return (
    <section className="slip" aria-label={`Week ${week} parlay`}>
      <div className="slip-main">
        <div className="slip-week">Week {week} parlay</div>
        {bettor ? (
          <h1 className="slip-title">
            <Avatar m={bettor} size={44} />
            <span>{bettor.name} is on the hook</span>
          </h1>
        ) : (
          <h1 className="slip-title">
            <span>Bettor decided after week {week - 1}</span>
          </h1>
        )}
        <p className="slip-sub">
          {auto && bettor && !sum.bettorOverridden
            ? `Lowest score in week ${auto.fromWeek} with ${fmtPts(auto.points)}. ${fmtMoney(sum.stake)} on a ${BETS.legsPerParlay}-leg parlay, one leg from everybody. Send your leg to the commissioner.`
            : `${fmtMoney(sum.stake)} on a ${BETS.legsPerParlay}-leg parlay, one leg from everybody. Send your leg to the commissioner.`}
        </p>
        <div className="slip-actions">
          <Link to={`/bets/week/${week}`} className="btn btn-primary">{auth.admin ? "Enter picks" : "See the picks"}</Link>
          <span className="slip-count">
            {legs.length} of {members.length} picks in
            {sum.combinedAmerican ? `, ${fmtOdds(sum.combinedAmerican)} so far` : ""}
          </span>
        </div>
        <ul className="slip-roll" aria-label="Who has picked">
          {members.map((m) => (
            <li key={m.userId} className={inIds.has(m.userId) ? "in" : "out"} title={`${m.name}: ${inIds.has(m.userId) ? "picked" : "no pick yet"}`}>
              {m.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="slip-stub">
        <div className="stub-pay">
          <div className="stub-label">{sum.status === "lost" ? "Busted" : "Potential payout"}</div>
          <div className="stub-amount">{sum.status === "lost" ? fmtMoney(0) : sum.toWin ? fmtMoney(sum.toWin) : "—"}</div>
          <div className="stub-when">
            {sum.toWin
              ? `${fmtMoney(sum.stake)} at ${fmtOdds(sum.bookOdds != null ? sum.bookOdds : sum.combinedAmerican)}${sum.bookOdds != null ? " (book price)" : ""}`
              : "Fills in as picks come in"}
          </div>
        </div>
        <div className="stub-label">Picks lock</div>
        <Countdown to={dl} />
        <div className="stub-when">{fmtDeadline(dl)}</div>
      </div>
    </section>
  );
}

function SeasonOver({ board }) {
  const top = board[0];
  return (
    <section className="slip">
      <div className="slip-main">
        <div className="slip-week">Season complete</div>
        <h1 className="slip-title"><span>{top ? `${top.name} leads the jersey race` : "No bets yet"}</span></h1>
        <p className="slip-sub">Betting runs weeks {BETS.firstWeek} to {BETS.lastWeek}.</p>
      </div>
    </section>
  );
}
