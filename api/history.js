import { loadHistory } from "../lib/sleeper.js";

export default async function handler(req, res) {
  try {
    const data = await loadHistory();
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: `Couldn't load league history from Sleeper: ${e.message}` });
  }
}
