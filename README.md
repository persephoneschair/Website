# Website

persephoneschair.com – static site on GitHub Pages. No build step.

## Layout

- `index.html` – homepage
- `OnDemand/`, `PennyBank/`, `PlayAGame/`, `UniCon/` – pages
- Accounts: signing in, sign-up and the account page are the login app at
  https://login.persephoneschair.com (built in `persephones-chair-uac-manager/login/`). The website
  has no sign-in and no Firebase of its own. The header's Account link goes to
  https://login.persephoneschair.com/account (which shows sign-in when signed out).
  `account/` is only a redirect page there (meta refresh plus a link; `/account/#signin` goes
  to sign-in), and `404.html` sends `/accounts` to the account page, `/signup` and `/sign-up`
  to `/create`, and `/signin` and `/sign-in` to sign-in.
- `privacy/` – the privacy page for Persephone's Chair accounts (linked in every footer, and
  from the login app and Google's sign-in consent screen). Keep it in step with what the
  accounts store, and change its "Last updated" date with it.
- `Downloads/` – redirects to `/PlayAGame/` (kept so old links work)
- `404.html` – also handles case-insensitive and vanity redirects (`/ondemand`, `/qforge`, …)
- `assets/css/site.css` – shared styles and colour tokens
- `assets/js/site.js` – shared helpers (mobile menu, escaping, ranking)
- `assets/js/data.js` – **every external data read goes through here**
- `assets/fonts/GameOver.woff2` – repaired copy of Game Over (see below)

## Data

- **Episodes** come from the published Google Sheet, one tab per season named `S1`, `S2`, …
  New season tabs are picked up automatically from the sheet's tab list. The hardcoded list
  in `data.js` is only a fallback.
- **Penny Bank** reads `NewPennys.txt` and the format files from
  `persephoneschair/PennyStorage` on GitHub. To show a new format, add it to
  `PENNY_FORMATS` in `data.js` (files ending `Leaderboard.txt` are treated as score tables).

## Game Over font

The original `Fonts/Game Over.ttf` has a malformed character map that Chrome, Edge and
Firefox reject, so it only rendered where the font was installed locally. `assets/fonts/GameOver.woff2`
is the same font with the character map rebuilt. Its glyphs are tiny relative to the font
size, so the `@font-face` uses `size-adjust: 330%`. Size headings with the `.display` class
and the `--d` variable so browsers without `size-adjust` are scaled correctly too.

## Local preview

`python -m http.server 8834` from the repo root, then open http://localhost:8834.
