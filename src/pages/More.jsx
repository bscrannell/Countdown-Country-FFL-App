import { Link } from "../ui.jsx";

const ITEMS = [
  { to: "/matchups", title: "Matchups", text: "Weekly scores and who's on the hook" },
  { to: "/power", title: "Power rankings", text: "All-play records, luck and lineup efficiency" },
  { to: "/history", title: "League history", text: "Champions and all-time records since 2020" },
  { to: "/rules", title: "Rules", text: "Parlay, playoff and draft rules" },
  { to: "/admin", title: "Commissioner", text: "Enter and grade picks, manage parlays" },
];

export default function More() {
  return (
    <div className="page">
      <h1 className="page-title">More</h1>
      <ul className="more-list">
        {ITEMS.map((i) => (
          <li key={i.to}>
            <Link to={i.to}>
              <span className="more-title">{i.title}</span>
              <span className="more-text">{i.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
