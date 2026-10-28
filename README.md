# Countdown County

The league app for the Countdown County dynasty league: the weekly parlay and jersey race, standings and playoff picture, rookie draft order, matchups, power rankings and league history.

Standings, scores, brackets and traded picks come live from Sleeper (league `1312188294745841664`). Bets are stored in an Upstash Redis database. Weeks 2–7 of 2026 are imported from the spreadsheet automatically the first time the app loads.

## Deploy to Vercel (one time, about 10 minutes)

1. **Put the code on GitHub.** Create a new private repository (for example `countdown-county`) and upload this folder to it. GitHub Desktop is easiest: *File → Add local repository*, choose this folder, then *Publish repository*.
2. **Import it into Vercel.** In Vercel choose *Add New → Project*, pick the repository and click *Deploy*. The settings come from `vercel.json`, so leave everything as it is.
3. **Add storage.** In the project open *Storage → Create Database → Upstash (Redis)*. Pick the free plan and connect it to the project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
   - Choose **Upstash** specifically. The app talks to it over Upstash's REST API.
4. **Add your PIN.** In *Settings → Environment Variables* add `ADMIN_PIN`, the commissioner PIN for entering and grading picks. Keep it to yourself. Everyone else can view the app but can't change anything.
5. **Redeploy** (*Deployments → ⋯ → Redeploy*) so the new variable takes effect, then send the link to the league.

## Weekly routine

- **By Thursday morning:** members send their leg and odds to the commissioner, who enters them on the week's page (sign in once at */admin*, or *More → Commissioner* on a phone). The countdown shows the Thursday 8:00 AM Eastern deadline; the commissioner can still enter picks after it.
- **Bettor:** the app reads last week's low scorer from Sleeper. Override it on the week's page if someone else places it.
- **Place the bet,** then on the week's page (signed in as commissioner) enter the book's odds, tick *Bet has been placed* and add a note if you like.
- **Grade legs** as games finish (Win / Loss / Push). Units and the jersey race update right away. If the parlay hits, the payout is calculated from the odds. Enter the actual payout if the book paid something different.

## Changing things

- Names, division names, the deadline and stake: `lib/config.js`
- Bet math (units, parlay status): `lib/bets.js`
- Playoff seeding, bracket and draft order: `lib/league.js`
- Spreadsheet import: `lib/seed.js`

Push a change to GitHub and Vercel redeploys on its own.

## Running it on your computer

Needs Node 20 or newer.

```
npm install
npm run dev
```

Open http://localhost:3000. Locally, bets are saved to `.data/store.json` and the admin PIN is `1234`. `npm run dev:fixtures` uses saved Sleeper data instead of the live API, and `npm test` checks the math against the spreadsheet.

## How it's built

- `api/` holds the Vercel serverless functions: `league` (Sleeper data, cached 2 minutes), `history` (past seasons), `bets` (read and write picks and parlays) and `auth`.
- `lib/` holds the logic shared by the server and the browser.
- `src/` is the React front end, bundled by esbuild into `public/app.js` at build time.
