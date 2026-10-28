import { useState } from "react";
import { useApp } from "../app.jsx";
import { Link, Section } from "../ui.jsx";
import { postAction, prefs } from "../client.js";
import { legsForWeek } from "../../lib/bets.js";
import { BETS } from "../../lib/config.js";

export default function Admin() {
  const { auth, refreshAuth, bets, reloadBets, openWeek, betWeeks } = useApp();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState(null);
  const [tb, setTb] = useState((bets && bets.settings.jerseyTiebreaker) || "");

  const signIn = async (e) => {
    e.preventDefault();
    prefs.setPin(pin.trim());
    const ok = await refreshAuth();
    setPin("");
    if (!ok) setMsg({ ok: false, text: "That PIN didn't work. Check the ADMIN_PIN setting in Vercel." });
    else setMsg(null);
  };

  const ungraded = bets ? betWeeks.filter((w) => w < (openWeek || BETS.lastWeek + 1)).map((w) => ({ w, n: legsForWeek(bets.legs, w).filter((l) => l.result === "pending").length })).filter((x) => x.n) : [];

  return (
    <div className="page">
      <h1 className="page-title">Commissioner</h1>
      {msg ? <div className={msg.ok ? "notice notice-ok" : "notice notice-bad"} role="status">{msg.text}</div> : null}

      {!auth.admin ? (
        <Section title="Sign in" intro="Only the commissioner can enter picks, grade them and edit parlays. Your PIN is remembered on this device.">
          <form className="form" onSubmit={signIn}>
            <label className="field">
              <span>Admin PIN</span>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" required />
            </label>
            <div className="form-actions"><button className="btn btn-primary">Sign in</button></div>
          </form>
        </Section>
      ) : (
        <>
          {openWeek ? (
            <Section title={`Week ${openWeek} picks`}>
              <p>
                {bets ? legsForWeek(bets.legs, openWeek).length : 0} of 12 entered.{" "}
                <Link to={`/bets/week/${openWeek}`} className="btn btn-primary">Enter week {openWeek} picks</Link>
              </p>
            </Section>
          ) : null}

          <Section title="Needs grading">
            {ungraded.length ? (
              <ul className="plain">
                {ungraded.map((x) => (
                  <li key={x.w}><Link to={`/bets/week/${x.w}`}>Week {x.w}</Link>: {x.n} open {x.n === 1 ? "leg" : "legs"}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Every locked leg is graded.</p>
            )}
            <p className="small muted">Grade legs and edit the parlay from each week's page. You can add or change picks after the deadline too.</p>
          </Section>

          <Section title="Jersey tiebreaker">
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await postAction({ action: "setTiebreaker", text: tb });
                  await reloadBets();
                  setMsg({ ok: true, text: "Tiebreaker saved." });
                } catch (err) {
                  setMsg({ ok: false, text: err.message });
                }
              }}
            >
              <label className="field field-wide">
                <span>Rule</span>
                <input value={tb} onChange={(e) => setTb(e.target.value)} placeholder="Most wins, then best single hit" maxLength={280} />
              </label>
              <div className="form-actions"><button className="btn btn-primary">Save tiebreaker</button></div>
            </form>
          </Section>

          <Section title="This device">
            <button className="btn btn-quiet" onClick={async () => { prefs.setPin(null); await refreshAuth(); }}>Sign out of commissioner mode</button>
          </Section>
        </>
      )}
    </div>
  );
}
