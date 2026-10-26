# Website

persephoneschair.com – static site on GitHub Pages. No build step.

## Layout

- `index.html` – homepage
- `OnDemand/`, `PennyBank/`, `PlayAGame/`, `UniCon/` – pages
- Accounts: signing in, sign-up and the account page are the login app at
  https://login.persephoneschair.com (built in `persephones-chair-uac-manager/login/`). The website
  has no sign-in and no Firebase of its own. The nav always has a plain Account link. The header's
  account slot (`.account-slot`, at the far right after Watch live) asks the
  accounts service's `peek` once per page load (`site.js`, contract in
  `persephones-chair-uac-manager/docs/ACCOUNTS-SERVICE.md`). Signed in: picture (or first letter)
  and username, linking to https://login.persephoneschair.com/account (picture only between 960 and
  1100px wide, and on phones beside the menu button). Signed out, failed or over 3 seconds: "Sign
  in", linking to the login app with `?return=` this page (not shown on phones). The slot has a
  fixed width so nothing moves when the answer arrives.
  The nav's Admin link (`.nav-admin`, to https://admin.persephoneschair.com) is hidden unless
  `peek` answers `admin: true`.
  Locally the real call fails (localhost is not an allowed origin), so it shows "Sign in"; to try
  other states, replace `window.fetch` in the console and run `GN.refreshAccount()`.
  `account/` is only a redirect page there (meta refresh plus a link; `/account/#signin` goes
  to sign-in), and `404.html` sends `/accounts` to the account page, `/signup` and `/sign-up`
  to `/create`, and `/signin` and `/sign-in` to sign-in.
- `privacy/` – the privacy page for Persephone's Chair accounts (linked in every footer, and
  from the login app and Google's sign-in consent screen). Keep it in step with what the
  accounts store, and change its "Last updated" date with it.
- `support/` – what supporting Persephone's Chair gives, and free hosting. The "Powered by
  Persephone's Chair" tag on free hosts' Broadcast screens shows this address. Linked from every
  footer, not the top bar. Its free trial paragraph (`[data-trial-rules]`) holds today's numbers
  (28 days, 4 hours) and `site.js` replaces them from the accounts service's public lookup
  `GET /api/hosting?rules` on load (`{ periodDays, playHours, trialFormats }`), so they follow the
  Admin Console; if the numbers change, update
  the HTML's too so the page reads right with scripts off. Its wording matches the account page's
  (`login/src/lib/hosting.ts`, `rulesWords`).
- `PlayAGame/` – the Play page (design: `docs/design/play-page-redesign.md`): the Universal
  Controller, then hosting: the free trial panel (the same `[data-trial-rules]` numbers as
  Support) beside a sign-in box (`[data-who]`, filled from the same `peek` as the top bar, one
  height signed in or out), then one alphabetical grid of quiz formats. Each card's Free trial
  chip (`[data-trial-format]`, the format's key in the accounts service) is always there but shows
  only when the rules lookup lists that key in `trialFormats`, so it follows the Admin Console.
  The word is "format", not "game", for what is hosted and paid for (here, on Support and on the
  account page). A Kore format joins the grid when it can be hosted.
- `Downloads/` – redirects to `/PlayAGame/` (kept so old links work)
- `play/`, `watch/`, `qforge/` – short links as real redirect pages, so a pasted link previews
  properly rather than as the 404 page. Only names that can't clash by case with a real folder
  (Windows checkouts are case-insensitive); everything else stays in `404.html`.
- `404.html` – also handles case-insensitive and vanity redirects (`/ondemand`, `/unicon`, …)
- `assets/css/site.css` – shared styles and colour tokens, including the section labels, button
  rows and status chips the Play and Support pages share
- `assets/js/site.js` – shared helpers (mobile menu, escaping, ranking, the account slot, the
  trial numbers and chips)
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
