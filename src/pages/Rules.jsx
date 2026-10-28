import { useApp } from "../app.jsx";
import { Section } from "../ui.jsx";
import { BETS } from "../../lib/config.js";

export default function Rules() {
  const { bets } = useApp();
  const tb = bets && bets.settings.jerseyTiebreaker;
  const d = BETS.deadline;
  const time = `${d.hour % 12 || 12}:${String(d.minute).padStart(2, "0")} ${d.hour < 12 ? "AM" : "PM"} Eastern`;
  return (
    <div className="page prose">
      <h1 className="page-title">League rules</h1>

      <Section title="The weekly parlay">
        <ul>
          <li>The lowest scorer of each week puts ${BETS.stake} on a parlay for the following week. Week 1's low scorer places the week {BETS.firstWeek} parlay, and it runs through week {BETS.lastWeek}, playoffs included.</li>
          <li>Every member picks one leg. Any sport, any bet type.</li>
          <li>Send your leg and its odds to the commissioner by {d.weekday} at {time}. The commissioner enters every pick in the app.</li>
          <li>Each leg is one unit. A win pays the odds (+150 pays 1.50 units, −150 pays 0.67), a loss is −1, and a push or a missed week is 0.</li>
          <li>Most units after week {BETS.lastWeek} wins the jersey. Tiebreaker: {tb || "not decided yet"}.</li>
        </ul>
      </Section>

      <Section title="Playoffs">
        <ul>
          <li>Six teams make it. Each of the four division winners gets in, ranked 1 to 4 by record. Points for breaks ties, and a tie counts as half a win.</li>
          <li>The two remaining teams with the most points for get the wild cards, seeds 5 and 6, regardless of record.</li>
          <li>Seeds 1 and 2 get a first-round bye. Week 15 is 3 vs 6 and 4 vs 5.</li>
          <li>The bracket reseeds after round 1: the 1 seed plays the lowest seed left.</li>
          <li>The first-round losers play for 5th place in week 16. Week 17 has the championship and the 3rd place game.</li>
        </ul>
      </Section>

      <Section title="Rookie draft">
        <ul>
          <li>Four rounds.</li>
          <li>Picks 1 to 6 go to the non-playoff teams, lowest Max PF first.</li>
          <li>Picks 7 to 12 go by playoff finish: 6th place picks 7th and the champion picks 12th.</li>
          <li>Traded picks follow Sleeper's records.</li>
        </ul>
      </Section>
    </div>
  );
}
