import { BETS } from "./config.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Offset (minutes) of a time zone from UTC at a given instant.
function tzOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUTC - date.getTime()) / 60000;
}

// UTC Date for a wall-clock time in a zone.
export function zonedTime(y, m, d, hour, minute, timeZone) {
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const off = tzOffsetMinutes(guess, timeZone);
  const result = new Date(guess.getTime() - off * 60000);
  const off2 = tzOffsetMinutes(result, timeZone);
  return off2 === off ? result : new Date(guess.getTime() - off2 * 60000);
}

// seasonStart is Sleeper's state.season_start_date ("2026-09-09").
// Week 1's deadline day is the first configured weekday on/after that date.
export function deadlineForWeek(seasonStart, week, cfg = BETS.deadline) {
  if (!seasonStart) return null;
  const [y, m, d] = seasonStart.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const target = DAYS.indexOf(cfg.weekday);
  const delta = (target - start.getUTCDay() + 7) % 7;
  const day = new Date(start.getTime() + (delta + 7 * (week - 1)) * 86400000);
  return zonedTime(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), cfg.hour, cfg.minute, cfg.timeZone);
}

export function isLocked(seasonStart, week, now = new Date()) {
  const dl = deadlineForWeek(seasonStart, week);
  return dl ? now.getTime() >= dl.getTime() : false;
}

// The bet week people should be picking for right now: the earliest week
// in range whose deadline hasn't passed.
export function openBetWeek(seasonStart, now = new Date()) {
  for (let w = BETS.firstWeek; w <= BETS.lastWeek; w++) {
    if (!isLocked(seasonStart, w, now)) return w;
  }
  return null;
}

export function fmtDeadline(date) {
  if (!date) return "";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: BETS.deadline.timeZone,
    timeZoneName: "short",
  });
}
