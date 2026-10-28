import { useEffect, useState } from "react";
import { navigate } from "./client.js";
import { fmtUnits } from "../lib/odds.js";

export function Link({ to, children, className, ...rest }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Avatar({ m, size = 28 }) {
  const [broken, setBroken] = useState(false);
  if (!m) return null;
  const initials = (m.name || "?").slice(0, 2);
  if (m.avatar && !broken) {
    return (
      <img
        className="avatar"
        width={size}
        height={size}
        alt=""
        src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`}
        onError={() => setBroken(true)}
        loading="lazy"
      />
    );
  }
  return (
    <span className="avatar avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Who({ m, sub, size }) {
  if (!m) return <span className="muted">TBD</span>;
  return (
    <span className="who">
      <Avatar m={m} size={size} />
      <span className="who-text">
        <span className="who-name">{m.name}</span>
        {sub !== false && m.team ? <span className="who-team">{sub || m.team}</span> : null}
      </span>
    </span>
  );
}

const RESULT_TEXT = { win: "W", loss: "L", push: "P", pending: "–" };
const RESULT_LABEL = { win: "Win", loss: "Loss", push: "Push", pending: "Pending" };
export function ResultChip({ result, long }) {
  return (
    <span className={`chip chip-${result}`} title={RESULT_LABEL[result]}>
      {long ? RESULT_LABEL[result] : RESULT_TEXT[result]}
    </span>
  );
}

export function Units({ value, digits }) {
  const cls = value > 0.004 ? "pos" : value < -0.004 ? "neg" : "zero";
  return <span className={`units ${cls}`}>{fmtUnits(value, digits)}</span>;
}

export function Section({ title, action, children, id, intro }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {intro ? <p className="section-intro">{intro}</p> : null}
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// Cumulative units sparkline (single series, zero line).
export function Spark({ series, width = 96, height = 26 }) {
  const vals = series.map((s) => s.units);
  if (vals.length < 2) return null;
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const span = max - min || 1;
  const x = (i) => (i / (vals.length - 1)) * (width - 4) + 2;
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6);
  const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Units by week, now ${fmtUnits(last)}`}>
      <line x1="0" x2={width} y1={y(0)} y2={y(0)} className="spark-zero" />
      <path d={d} className="spark-line" />
      <circle cx={x(vals.length - 1)} cy={y(last)} r="2.5" className={last >= 0 ? "spark-dot pos" : "spark-dot neg"} />
    </svg>
  );
}

// Diverging bar around zero.
export function UnitsBar({ value, max }) {
  const pct = Math.min(1, Math.abs(value) / (max || 1)) * 50;
  return (
    <span className="ubar" aria-hidden="true">
      <span className="ubar-zero" />
      <span
        className={value >= 0 ? "ubar-fill pos" : "ubar-fill neg"}
        style={value >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
      />
    </span>
  );
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Countdown({ to }) {
  const now = useNow(1000);
  if (!to) return null;
  let s = Math.max(0, Math.floor((to.getTime() - now.getTime()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const parts = d > 0 ? [[d, "days"], [h, "hrs"], [m, "min"]] : [[h, "hrs"], [m, "min"], [s, "sec"]];
  return (
    <span className="countdown" role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {parts.map(([v, l]) => (
        <span className="cd-cell" key={l}>
          <span className="cd-num">{String(v).padStart(2, "0")}</span>
          <span className="cd-label">{l}</span>
        </span>
      ))}
    </span>
  );
}

export function fmtPts(n) {
  return n == null ? "—" : n.toFixed(2);
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? "tab active" : "tab"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
