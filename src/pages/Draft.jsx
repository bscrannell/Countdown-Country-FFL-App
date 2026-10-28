import { useMemo, useState } from "react";
import { useApp } from "../app.jsx";
import { Section, Tabs, Who, fmtPts } from "../ui.jsx";
import { pickLedger } from "../../lib/league.js";

const PLACE = ["", "Champion", "Runner-up", "3rd", "4th", "5th", "6th"];

export default function Draft() {
  const { L, draft, byRoster, br } = useApp();
  const [round, setRound] = useState(1);
  const ledger = useMemo(() => pickLedger(L), [L]);
  const picks = draft.rounds[round - 1];
  const slotByRoster = Object.fromEntries(draft.slots.map((s) => [s.team.rosterId, s]));

  return (
    <div className="page">
      <h1 className="page-title">{draft.season} rookie draft</h1>
      <p className="lede">
        Teams that miss the playoffs pick 1 to 6, lowest Max PF first. Playoff teams pick 7 to 12 by where they finish, so the champion picks last.
        {br.started ? "" : " Until the playoffs are played, playoff teams are slotted by seed."}
      </p>

      <Section title="Projected order">
        <Tabs value={round} onChange={setRound} options={draft.rounds.map((_, i) => ({ value: i + 1, label: `Round ${i + 1}` }))} />
        <ol className="draft">
          {picks.map((p) => {
            const s = slotByRoster[p.originalRosterId];
            const owner = byRoster[p.ownerRosterId];
            const orig = byRoster[p.originalRosterId];
            return (
              <li key={p.label} className={p.traded ? "pick traded" : "pick"}>
                <span className="pick-no">{p.label}</span>
                <span className="pick-owner">
                  <Who m={owner} sub={p.traded ? `via ${orig.name}` : false} size={26} />
                </span>
                <span className="pick-basis">
                  {s.basis === "maxpf" ? (
                    <>
                      Max PF {fmtPts(s.team.maxPf)}
                      {s.gapToPickAhead != null ? <span className="muted">, {fmtPts(s.gapToPickAhead)} ahead of pick {s.slot - 1}</span> : null}
                    </>
                  ) : s.finish && s.finish.final ? (
                    <>{PLACE[s.finish.place]}</>
                  ) : (
                    <>Seed {s.team.seed}{br.started ? `, projected ${PLACE[s.finish.place]}` : ""}</>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Who owns what" intro="Every future pick, from Sleeper's trade records.">
        <div className="table-wrap">
          <table className="table ledger">
            <thead>
              <tr>
                <th scope="col">Team</th>
                {ledger.seasons.map((s) => <th scope="col" key={s}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...L.members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                <tr key={m.rosterId}>
                  <th scope="row">{m.name}</th>
                  {ledger.seasons.map((s) => {
                    const own = ledger.teams[m.rosterId][s];
                    return (
                      <td key={s}>
                        <div className="owned">
                          <span className="owned-count">{own.length}</span>
                          <span className="owned-list">
                            {own.map((p) => (
                              <span key={`${p.round}-${p.fromRosterId}`} className={p.fromRosterId === m.rosterId ? "pk" : "pk acquired"} title={`Round ${p.round}${p.fromRosterId === m.rosterId ? "" : `, from ${byRoster[p.fromRosterId].name}`}`}>
                                R{p.round}{p.fromRosterId === m.rosterId ? "" : ` ${byRoster[p.fromRosterId].name}`}
                              </span>
                            ))}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
