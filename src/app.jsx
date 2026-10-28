import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getJSON, onRoute, checkAuth, prefs } from "./client.js";
import { Link } from "./ui.jsx";
import { standings, bracket, draftOrder } from "../lib/league.js";
import { openBetWeek, deadlineForWeek } from "../lib/deadline.js";
import { BETS, LEAGUE_NAME } from "../lib/config.js";
import Home from "./pages/Home.jsx";
import Bets from "./pages/Bets.jsx";
import Week from "./pages/Week.jsx";
import Playoffs from "./pages/Playoffs.jsx";
import Draft from "./pages/Draft.jsx";
import Matchups from "./pages/Matchups.jsx";
import Power from "./pages/Power.jsx";
import History from "./pages/History.jsx";
import Rules from "./pages/Rules.jsx";
import Admin from "./pages/Admin.jsx";
import More from "./pages/More.jsx";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function route(path) {
  const p = path.replace(/\/+$/, "") || "/";
  let m;
  if (p === "/") return { page: Home, key: "home" };
  if (p === "/bets") return { page: Bets, key: "bets" };
  if ((m = p.match(/^\/bets\/week\/(\d+)$/))) return { page: Week, key: "bets", params: { week: Number(m[1]) } };
  if (p === "/playoffs") return { page: Playoffs, key: "playoffs" };
  if (p === "/draft") return { page: Draft, key: "draft" };
  if (p === "/matchups") return { page: Matchups, key: "more" };
  if ((m = p.match(/^\/matchups\/(\d+)$/))) return { page: Matchups, key: "more", params: { week: Number(m[1]) } };
  if (p === "/power") return { page: Power, key: "more" };
  if (p === "/history") return { page: History, key: "more" };
  if (p === "/rules") return { page: Rules, key: "more" };
  if (p === "/admin") return { page: Admin, key: "more" };
  if (p === "/more") return { page: More, key: "more" };
  return { page: NotFound, key: "" };
}

function NotFound() {
  return (
    <div className="page">
      <h1 className="page-title">Nothing here</h1>
      <p>That page doesn't exist. <Link to="/">Go to the home page</Link>.</p>
    </div>
  );
}

const NAV = [
  { to: "/", key: "home", label: "Home" },
  { to: "/bets", key: "bets", label: "Bets" },
  { to: "/playoffs", key: "playoffs", label: "Playoffs" },
  { to: "/draft", key: "draft", label: "Draft" },
  { to: "/more", key: "more", label: "More" },
];
const DESKTOP_EXTRA = [
  { to: "/matchups", label: "Matchups" },
  { to: "/power", label: "Power" },
  { to: "/history", label: "History" },
  { to: "/rules", label: "Rules" },
];

const ICONS = {
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  bets: <path d="M5 4h14v4a2 2 0 0 0 0 4v4a2 2 0 0 0 0 4H5v-4a2 2 0 0 0 0-4V8a2 2 0 0 0 0-4zM10 8v8M14 8v8" />,
  playoffs: <path d="M4 5h4v5h4m-8 4h4v5h4m0-9.5h4v4h4M12 10v4" />,
  draft: <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h3" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.5" />,
};

export default function App() {
  const [path, setPath] = useState(location.pathname);
  const [league, setLeague] = useState(null);
  const [leagueErr, setLeagueErr] = useState(null);
  const [bets, setBets] = useState(null);
  const [betsErr, setBetsErr] = useState(null);
  const [auth, setAuth] = useState({ member: false, admin: false });

  useEffect(() => onRoute(() => setPath(location.pathname)), []);

  useEffect(() => {
    getJSON("/api/league").then(setLeague, (e) => setLeagueErr(e.message));
  }, []);

  const reloadBets = useCallback(async () => {
    try {
      setBets(await getJSON("/api/bets"));
      setBetsErr(null);
    } catch (e) {
      setBetsErr(e.message);
    }
  }, []);
  useEffect(() => { reloadBets(); }, [reloadBets]);

  const refreshAuth = useCallback(async () => {
    if (!prefs.code() && !prefs.pin()) return setAuth({ member: false, admin: false });
    try { setAuth(await checkAuth()); } catch { /* offline: keep previous */ }
  }, []);
  useEffect(() => { refreshAuth(); }, [refreshAuth]);

  const value = useMemo(() => {
    if (!league) return null;
    const byRoster = {}, byUser = {};
    for (const m of league.members) {
      byRoster[m.rosterId] = m;
      byUser[m.userId] = m;
    }
    const st = standings(league);
    const br = bracket(league, st);
    const draft = draftOrder(league, st, br);
    const openWeek = league.seasonStart ? openBetWeek(league.seasonStart) : null;
    const legs = bets ? bets.legs : [];
    const maxLegWeek = legs.reduce((a, l) => Math.max(a, l.week), BETS.firstWeek);
    const lastWeekShown = Math.min(BETS.lastWeek, Math.max(maxLegWeek, openWeek || 0));
    const betWeeks = [];
    for (let w = BETS.firstWeek; w <= lastWeekShown; w++) betWeeks.push(w);
    const deadline = (w) => deadlineForWeek(league.seasonStart, w);
    const members = [...league.members].sort((a, b) => a.name.localeCompare(b.name));
    return { L: league, st, br, draft, byRoster, byUser, members, bets, betsErr, reloadBets, openWeek, betWeeks, deadline, auth, refreshAuth };
  }, [league, bets, betsErr, reloadBets, auth, refreshAuth]);

  const r = route(path);
  const Page = r.page;

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <Link to="/" className="wordmark" aria-label={`${LEAGUE_NAME} home`}>
          <span className="wm-flag" aria-hidden="true" />
          <span className="wm-text">{LEAGUE_NAME}</span>
        </Link>
        <nav className="topnav" aria-label="Main">
          {NAV.filter((n) => n.key !== "more").map((n) => (
            <Link key={n.to} to={n.to} className={r.key === n.key ? "active" : ""} aria-current={r.key === n.key ? "page" : undefined}>{n.label}</Link>
          ))}
          {DESKTOP_EXTRA.map((n) => (
            <Link key={n.to} to={n.to} className={path.startsWith(n.to) ? "active" : ""}>{n.label}</Link>
          ))}
        </nav>
        {auth.admin ? <Link to="/admin" className="badge-admin">Commish</Link> : null}
      </header>

      <main id="main" className="main">
        {leagueErr ? (
          <div className="page"><div className="notice notice-bad">{leagueErr}</div></div>
        ) : !value ? (
          <div className="page loading" aria-busy="true">Loading the league…</div>
        ) : (
          <Ctx.Provider value={value}>
            <Page {...(r.params || {})} />
          </Ctx.Provider>
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={r.key === n.key ? "active" : ""} aria-current={r.key === n.key ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[n.key]}</svg>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
