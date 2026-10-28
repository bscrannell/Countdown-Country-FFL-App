import { loadLeague } from "../lib/sleeper.js";

export default async function handler(req, res) {
  try {
    const data = await loadLeague();
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: `Couldn't load the league from Sleeper: ${e.message}` });
  }
}
