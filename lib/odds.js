// American odds helpers and unit math. 1 unit = one leg's share of the stake.

export function decimalOdds(american) {
  const o = Number(american);
  if (!Number.isFinite(o) || o === 0) return null;
  return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
}

export function americanFromDecimal(dec) {
  if (!Number.isFinite(dec) || dec <= 1) return null;
  return dec >= 2 ? Math.round((dec - 1) * 100) : Math.round(-100 / (dec - 1));
}

// Units won if the leg hits (profit only, stake excluded).
export function unitsIfWin(american) {
  const d = decimalOdds(american);
  return d == null ? 0 : d - 1;
}

export function legUnits(leg) {
  if (!leg) return 0;
  if (leg.result === "win") return unitsIfWin(leg.odds);
  if (leg.result === "loss") return -1;
  return 0; // push, pending, void
}

export function fmtOdds(american) {
  if (american == null || american === "") return "—";
  const o = Number(american);
  return o > 0 ? `+${o}` : `${o}`;
}

export function fmtUnits(u, digits = 2) {
  if (u == null || !Number.isFinite(u)) return "—";
  const v = Math.abs(u) < 0.005 ? 0 : u;
  return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(digits);
}

export function fmtMoney(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);
}

export function parseOdds(input) {
  if (input == null) return null;
  const s = String(input).trim().replace(/\s+/g, "");
  if (!/^[+-]?\d{3,5}$/.test(s)) return null;
  const n = parseInt(s, 10);
  if (Math.abs(n) < 100) return null;
  return n;
}
