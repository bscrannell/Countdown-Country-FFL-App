import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app.jsx";
import { Link, Who, Section, ResultChip, Units, Countdown, useNow } from "../ui.jsx";
import { StatusText } from "./Bets.jsx";
import { legsForWeek, parlaySummary, tallyText } from "../../lib/bets.js";
import { autoBettor, lowestScorer } from "../../lib/league.js";
import { fmtDeadline } from "../../lib/deadline.js";
import { fmtOdds, fmtMoney, legUnits, parseOdds, unitsIfWin, fmtUnits } from "../../lib/odds.js";
import { BETS } from "../../lib/config.js";
import { postAction, prefs } from "../client.js";

const SPORTS = ["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL", "UFC", "Soccer", "Golf", "Other"];

export default function Week({ week }) {
  const { L, bets, betsErr, byUser, members, deadline, auth, reloadBets } = useApp();
  const now = useNow(15000);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);

  if (week < BETS.firstWeek || week > BETS.lastWeek)
    return <div className="page"><p>Betting runs weeks {BETS.firstWeek} to {BETS.lastWeek}. <Link to="/bets">Back to the bet sheet</Link>.</p></div>;
  if (betsErr) return <div className="page"><div className="notice notice-bad">{betsErr}</div></div>;
  if (!bets) return <div className="page loading">Loading bets…</div>;

  const legs = legsForWeek(bets.legs, week);
  const rec = bets.parlays[week];
  const auto = autoBettor(L, week);
  const s = parlaySummary(legs, rec, auto);
  const bettor = s.bettorUserId ? byUser[s.bettorUserId] : null;
  const dl = deadline(week);
  const locked = dl ? now >= dl : false;
  const byUserLeg = Object.fromEntries(legs.map((l) => [l.userId, l]));
  const missing = members.filter((m) => !byUserLeg[m.userId]);
  const canEdit = auth.admin || !locked;

  const act = async (payload, okText) => {
    setMsg(null);
    try {
      await postAction(payload);
      await reloadBets();
      if (okText) setMsg({ ok: true, text: okText });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e.message });
      return false;
    }
  };

  return (
    <div className="page">
      <div className="week-nav">
        {week > BETS.firstWeek ? <Link to={`/bets/week/${week - 1}`}>Week {week - 1}</Link> : <span />}
        <Link to="/bets">Bet sheet</Link>
        {week < BETS.lastWeek ? <Link to={`/bets/week/${week + 1}`}>Week {week + 1}</Link> : <span />}
      </div>

      <section className="ticket" aria-label={`Week ${week} parlay ticket`}>
        <div className="ticket-top">
          <h1 className="page-title">Week {week} parlay</h1>
          <StatusText s={s} />
        </div>
        <dl className="ticket-facts">
          <div>
            <dt>Bettor</dt>
            <dd>{bettor ? <Who m={bettor} sub={auto && !s.bettorOverridden ? `Low score in week ${auto.fromWeek}` : "Set by the commissioner"} /> : `Decided after week ${week - 1}`}</dd>
          </div>
          <div>
            <dt>Odds</dt>
            <dd className="big">{s.bookOdds != null ? fmtOdds(s.bookOdds) : s.combinedAmerican ? fmtOdds(s.combinedAmerican) : "—"}</dd>
            {s.bookOdds != null ? <dd className="small muted">Book price. Legs multiply to {fmtOdds(s.combinedAmerican)}.</dd> : null}
          </div>
          <div>
            <dt>{s.status === "won" ? "Paid" : "Pays"}</dt>
            <dd className="big">{s.status === "won" ? fmtMoney(s.payout) : s.status === "lost" ? fmtMoney(0) : s.toWin ? fmtMoney(s.toWin) : "—"}</dd>
            <dd className="small muted">on {fmtMoney(s.stake)}{s.placed ? ", bet placed" : ""}</dd>
          </div>
          <div>
            <dt>{locked ? "Locked" : "Picks lock in"}</dt>
            <dd>{locked ? fmtDeadline(dl) : <Countdown to={dl} />}</dd>
          </div>
        </dl>
        {s.notes ? <p className="ticket-notes">{s.notes}</p> : null}
        <p className="small muted">{tallyText(s.tally)}</p>
      </section>

      {msg ? <div className={msg.ok ? "notice notice-ok" : "notice notice-bad"} role="status">{msg.text}</div> : null}

      <Section title="Legs">
        <ul className="legs">
          {legs
            .slice()
            .sort((a, b) => byUser[a.userId]?.name.localeCompare(byUser[b.userId]?.name))
            .map((l) => {
              const m = byUser[l.userId];
              const mine = prefs.me() === l.userId;
              return (
                <li key={l.userId} className={`leg leg-${l.result}`}>
                  <ResultChip result={l.result} />
                  <div className="leg-main">
                    <div className="leg-pick">{l.pick}</div>
                    <div className="leg-meta">
                      {m ? m.name : "Unknown"}
                      {l.sport ? `, ${l.sport}` : ""}
                    </div>
                  </div>
                  <div className="leg-odds">{fmtOdds(l.odds)}</div>
                  <div className="leg-units">{l.result === "pending" ? <span className="muted small">{fmtUnits(unitsIfWin(l.odds))} if it hits</span> : <Units value={legUnits(l)} />}</div>
                  <div className="leg-actions">
                    {auth.admin ? (
                      <div className="grade" role="group" aria-label={`Grade ${m ? m.name : ""}'s pick`}>
                        {["win", "loss", "push", "pending"].map((r) => (
                          <button
                            key={r}
                            className={l.result === r ? `gbtn on gbtn-${r}` : `gbtn gbtn-${r}`}
                            aria-pressed={l.result === r}
                            onClick={() => act({ action: "gradeLeg", week, userId: l.userId, result: r })}
                          >
                            {r === "pending" ? "Open" : r[0].toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {(auth.admin || (mine && !locked && l.result === "pending")) ? (
                      <button className="link-btn" onClick={() => setEditing(l.userId)}>Edit</button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          {!legs.length ? <li className="empty">No picks yet for week {week}.</li> : null}
        </ul>
        {missing.length ? (
          <p className="footnote">
            {locked ? "No pick" : "Still waiting on"}: {missing.map((m) => m.name).join(", ")}.
          </p>
        ) : null}
      </Section>

      {canEdit ? (
        <PickForm
          week={week}
          key={`${week}-${editing || "new"}`}
          initialUser={editing}
          legs={byUserLeg}
          locked={locked}
          onSaved={() => setEditing(null)}
          act={act}
        />
      ) : (
        <p className="notice">Week {week} picks locked {fmtDeadline(dl)}. Missed it? The commissioner can still add a pick.</p>
      )}

      {auth.admin ? <ParlayEditor week={week} rec={rec || {}} auto={auto} act={act} /> : null}
    </div>
  );
}

function PickForm({ week, initialUser, legs, locked, onSaved, act }) {
  const { members, auth, refreshAuth } = useApp();
  const [userId, setUserId] = useState(initialUser || prefs.me() || "");
  const existing = legs[userId];
  const [pick, setPick] = useState(existing ? existing.pick : "");
  const [odds, setOdds] = useState(existing ? fmtOdds(existing.odds).replace("—", "") : "");
  const [sport, setSport] = useState(existing && existing.sport ? existing.sport : "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const e = legs[userId];
    setPick(e ? e.pick : "");
    setOdds(e && e.odds != null ? fmtOdds(e.odds) : "");
    setSport(e && e.sport ? e.sport : "");
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = parseOdds(odds);
  const needCode = !auth.member;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (needCode) {
      prefs.setCode(code.trim());
      await refreshAuth();
    }
    prefs.setMe(userId);
    const ok = await act({ action: "submitLeg", week, userId, pick, odds, sport }, existing ? "Pick updated." : "Pick saved. Good luck.");
    setBusy(false);
    if (ok) onSaved();
  };

  const remove = async () => {
    setBusy(true);
    await act({ action: "removeLeg", week, userId }, "Pick removed.");
    setBusy(false);
    onSaved();
  };

  return (
    <Section title={existing ? "Change your pick" : "Add your pick"} intro={locked ? "Picks are locked. You're adding this as the commissioner." : null}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Who are you?</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="" disabled>Choose your name</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name}{legs[m.userId] ? " (picked)" : ""}</option>
            ))}
          </select>
        </label>
        <label className="field field-wide">
          <span>Your leg</span>
          <input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Bijan anytime TD" maxLength={80} required />
        </label>
        <label className="field">
          <span>Odds</span>
          <input value={odds} onChange={(e) => setOdds(e.target.value)} placeholder="-110" inputMode="numeric" aria-describedby="odds-help" required />
          <small id="odds-help" className={odds && parsed == null ? "bad" : "muted"}>
            {odds && parsed == null ? "Use American odds, like -115 or +240" : parsed != null ? `Hit pays ${fmtUnits(unitsIfWin(parsed))} units` : "American odds from your book"}
          </small>
        </label>
        <label className="field">
          <span>Sport</span>
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="">Pick one (optional)</option>
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {needCode ? (
          <label className="field">
            <span>League code</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ask the commissioner" autoComplete="off" required />
          </label>
        ) : null}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || !userId || parsed == null || pick.trim().length < 2}>
            {existing ? "Update pick" : "Save pick"}
          </button>
          {existing && existing.result === "pending" ? (
            <button type="button" className="btn btn-quiet" onClick={remove} disabled={busy}>Remove pick</button>
          ) : null}
        </div>
      </form>
    </Section>
  );
}

function ParlayEditor({ week, rec, auto, act }) {
  const { members, byUser } = useApp();
  const [f, setF] = useState({
    bettorUserId: rec.bettorUserId || "",
    bookOdds: rec.bookOdds != null ? fmtOdds(rec.bookOdds) : "",
    stake: rec.stake != null ? String(rec.stake) : "",
    payout: rec.payout != null ? String(rec.payout) : "",
    placed: !!rec.placed,
    notes: rec.notes || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <Section title="Commissioner: parlay details" intro="Only fill in what differs from the defaults. Leave the bettor on automatic unless someone else placed it.">
      <form className="form" onSubmit={(e) => { e.preventDefault(); act({ action: "saveParlay", week, ...f }, "Parlay saved."); }}>
        <label className="field">
          <span>Bettor</span>
          <select value={f.bettorUserId} onChange={set("bettorUserId")}>
            <option value="">Automatic{auto && byUser[auto.userId] ? ` (${byUser[auto.userId].name})` : ""}</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Book odds</span>
          <input value={f.bookOdds} onChange={set("bookOdds")} placeholder="+45000" />
        </label>
        <label className="field">
          <span>Stake ($)</span>
          <input value={f.stake} onChange={set("stake")} placeholder={String(BETS.stake)} inputMode="decimal" />
        </label>
        <label className="field">
          <span>Actual payout ($)</span>
          <input value={f.payout} onChange={set("payout")} placeholder="If it hits" inputMode="decimal" />
        </label>
        <label className="field check">
          <input type="checkbox" checked={f.placed} onChange={set("placed")} />
          <span>Bet has been placed</span>
        </label>
        <label className="field field-wide">
          <span>Notes</span>
          <input value={f.notes} onChange={set("notes")} maxLength={280} placeholder="Placed on DraftKings" />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary">Save parlay</button>
        </div>
      </form>
    </Section>
  );
}
