// Browser helpers: API calls, remembered codes, routing.

const store = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {}
  },
};

export const prefs = {
  code: () => store.get("ccffl.code"),
  pin: () => store.get("ccffl.pin"),
  me: () => store.get("ccffl.me"),
  setCode: (v) => store.set("ccffl.code", v),
  setPin: (v) => store.set("ccffl.pin", v),
  setMe: (v) => store.set("ccffl.me", v),
};

function headers() {
  const h = { "Content-Type": "application/json" };
  const code = prefs.code(), pin = prefs.pin();
  if (code) h["x-league-code"] = code;
  if (pin) h["x-admin-pin"] = pin;
  return h;
}

export async function getJSON(url) {
  const res = await fetch(url, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function postAction(payload) {
  const res = await fetch("/api/bets", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function checkAuth() {
  return getJSON("/api/auth");
}

// ---- tiny router ----
const listeners = new Set();
export function navigate(to) {
  if (to === location.pathname) return;
  history.pushState(null, "", to);
  listeners.forEach((f) => f());
  window.scrollTo(0, 0);
}
export function onRoute(f) {
  listeners.add(f);
  const pop = () => f();
  window.addEventListener("popstate", pop);
  return () => {
    listeners.delete(f);
    window.removeEventListener("popstate", pop);
  };
}
