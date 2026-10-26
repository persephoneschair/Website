# Play page redesign, and light site-wide fixes (design, not built)

Written 26 October 2026 and revised the same day after Ben's first look (section 5). Design only: no site code has changed. Nothing here is built until Ben says yes.

Mock-ups: `docs/design/play-page/empty.html` and `full.html` (with `play.css`). They load the real `/assets/css/site.css`, so serve the repo root (`python -m http.server 8834`) and open `/docs/design/play-page/empty.html`. PNGs of both states at the same sizes (1440 wide, and 375 wide):

| | Empty (today: signed out, nothing on Kore yet, trial chips not yet answered) | Fullest (signed in, Kore formats on stream and listed, trial chips shown) |
| --- | --- | --- |
| Desktop | `play-page/empty-desktop.png` | `play-page/full-desktop.png` |
| Phone | `play-page/empty-phone.png` | `play-page/full-phone.png` |

## 1. Audit

Checked on the local dev server at 1440 and 375 wide (and 320, 768, 1024 for the mock-ups), by text reads, layout measurements and a few screenshots. No page scrolls sideways at any width.

### Every page

| Page | Purpose | Works | Confusing, inconsistent or stale |
| --- | --- | --- | --- |
| Home `/` | The show: watch, play along, episodes, Penny Bank, Q-Forge, Discord | Strong hero and logotype; latest episode loads behind a same-size skeleton; clear three-button row | The Play strip says "Standalone games you can play any time", but they are formats you **host**; it uses the Game Night logo as its icon. Q-Forge appears here and in the footer only |
| Play `/PlayAGame/` | Play along, and the formats | Simple cards; works on phones | See section 2. Calls them "Standalone games"; every card says the same "Play in your browser on any device"; no word of hosting, the free trial or its rules, or Support; "Game Night account" where every other page says Persephone's Chair account; lists the old Escape Artist and Risky Business web builds as if they were like the other three; no mention of Kore; meta description still says "standalone games"; the cards' `h2`s sit at the same level as the section labels |
| On Demand | Every episode, searchable | Good filters; compact rows on phones; count line | Fine. On phones the filter panel takes most of the first screen before any episode |
| Penny Bank | Leaderboard, medal cabinets, Hall of Fame | Clear podium and table | On phones the three tabs scroll sideways and "Hall of Fame" is cut off at the edge with no sign there is more. Its data source moves to Kore's ledger at Phase 2 P2f (not a design matter here) |
| Support | What support gives; free trial rules; prices | The trial rules paragraph with live numbers in fixed-width boxes is the model for the Play page | Says "game" for what is hosted and paid for ("Prices are per game", "Pay for a game"). No `id`s on its sections, so other pages cannot link to "the trial rules" directly. Its section-label and card styles are copied from the Play page's inline `<style>` |
| Privacy | Accounts' privacy | Clear, dated | None |
| `/account/` | Redirect to the login app | Works | None |
| `/Downloads/` | Old link, redirects to Play | Works | None |
| 404 and vanity links | `/play`, `/ondemand`, ... | Redirect in the browser | The server still answers HTTP 404 first, so a link pasted into Discord previews as "Page not found". Low priority |
| `/UniCon/` | The controller, full screen | Two-step home button | Stays in use for at least another season, beside the new Kore player app |

### Across the site

- **Names**: the header brand is Game Night (right: the show), but accounts are "Persephone's Chair accounts" on Privacy, Support and in Kore, and "Game Night account" on Play. Tab titles say "– Game Night" even on Support and Privacy, which are Persephone's Chair pages (fine to leave; noted). What is hosted is called a "game" on Play and Support; Ben's word is **format**.
- **Typography**: three faces, used consistently: Game Over for display headings, Satisfy for the signature, Chakra Petch for everything else. Section labels (small caps, muted) and panel headings are consistent between Play and Support, but each page carries its own copy of the CSS.
- **Colour**: one token set in `site.css`, used well. No status colours exist, and the revised Play page needs none.
- **Navigation**: four links plus Discord and Watch live; Support and Q-Forge are footer only. That is right for viewers; the Play page is where a would-be host needs Support, so it should link it in the body (section 2).
- **Layout stability**: already good: the account slot and the trial numbers reserve their space. The Play page proposal keeps that rule.
- **Stale files**: `Files/QForge.zip` (52 MB, Q-Forge is a web app now) and `Files/2025SurveyReport.pdf` are linked from nowhere. The UniCon zips are still linked and still needed.

### What the Play page must cover

1. Playing along with the stream: the Universal Controller today, and the Kore player app (play.persephoneschair.com) beside it once Kore formats are on stream. Players never need an account.
2. Hosting with the free trial: 28 days and 4 hours of play, numbers live from `GET /api/hosting?rules`, a link to the full rules on Support, and to the account page where a trial is chosen.
3. The formats a person can host: Face/Off, Only Connect and Wonderwall today, and Kore formats as they become hostable, starting with The Escape Artist and Risky Business.

## 2. The Play page proposal

One page, three blocks, in the order people arrive with: play along, host, the formats.

1. **Head**: "Play" in the logotype, lede "Play along with Game Night live, or host our quiz formats at your own quiz night."
2. **Play along live**
   - **Today**: one wide panel, the Universal Controller, with Open in browser, PC and Mac, and the line "Every Game Night format uses it this season."
   - **Once Kore formats are on stream**: two panels side by side. The new player app (play.persephoneschair.com; its name is decision 1), "For formats on Kore", and the Universal Controller, "For every other Game Night format this season", with "Not sure which? The show tells you at the start." Both stay until the last Unity format moves; then the Universal Controller panel goes. The UniCon name stays on the legacy controller only, so the two are never confused.
3. **Host your own**
   - One sentence on how hosting works (laptop, Broadcast screen, players on phones with a room code, no account for players).
   - **Free trial panel**: the rules in short, with the two numbers in fixed-width boxes filled by the same `site.js` code as Support (`[data-trial-rules]`), and links "Full trial rules" (to Support's trial section) and "Why support us". At the right, a fixed-size **sign-in box** fed by the header's existing `peek`: signed out shows "Not signed in", "Hosting needs a Persephone's Chair account." and Sign in / Create account; signed in shows the picture and username, "Choose a free trial, or see your formats and time left." and Your account / Pay for a format. Both fill the same three rows, so signing in never changes the panel's height (measured: the same in both states at every width, 170 px at desktop, 224 px at 375 wide).
   - **Quiz formats**: one grid of every format offered for hosting, web and Kore alike, **alphabetical** (ignoring a leading "The"). One card shape: icon, name, a two-line description, a chip row, then **Host** and **Join**. For the web formats both go to the format's own site; for Kore formats Host goes to host.persephoneschair.com and Join to the player app. Which engine a format runs on is not shown: to a host it makes no difference, and every format ends up on Kore. Today the grid holds Face/Off, Only Connect and Wonderwall. The Escape Artist and Risky Business are not listed (their old web builds stay reachable at their own addresses) and join the grid when their Kore versions are hostable.
4. **Footer** as now.

The word on the page is **format** throughout ("Host any format marked Free trial", "Pay for a format"), not "game".

### Chips

Text on every chip, so colour is never the only signal:

| Chip | Look | Meaning |
| --- | --- | --- |
| Free trial | gold outline, no fill | Can be chosen as the free trial |
| Coming soon | the existing chip (navy, muted text), clock icon | Announced, not hostable yet; Host and Join give way to a disabled "Not hostable yet" |

With the Retiring strip gone there is no red or green status on the page, so the red and green rule does not come into play. If a "Live" or warning chip is ever wanted, the first draft's pair still stands: green `#3FD68C` as a bright fill and red `#8E1F33` as a dark one (luminance 0.51 and 0.07; 6.4:1 between them under protanopia and 3.9:1 under deuteranopia, Machado 2009 at full severity).

### No jumps

- The trial numbers: fixed-width boxes, as Support.
- The sign-in box: one fixed shape for every state; filled by the existing `peek`, hidden until it answers, as the header slot is.
- Free trial chips: always mounted, `visibility: hidden` until the lookup answers.
- Format cards: one fixed height (236 px desktop, 214 px phones); the description always takes two lines; the chip row is always one line high.
- Measured in the mock-ups at 1440, 1024, 768, 375 and 320 wide: nothing is cut off or overflows, and the trial panel, sign-in box and cards are the same height in both states. The Play along panels change only when the site is updated for Kore, never while the page is open.

### Font

**Recommendation: keep Chakra Petch on the website; do not follow Kore's IBM Plex Sans.** Plex is Kore's default for app screens (console, player, Broadcast), where long questions and answers must read plainly. The website is Game Night's shop window, and Chakra Petch with the Game Over logotype is its look; the BIBLE's own rule is that a brand's style may keep its own face. Changing it would touch every page for no gain to the Play page. If Ben prefers to match Kore, the cheapest step is Plex for running text only (`--font`), keeping Chakra Petch for nav, buttons and labels; decision 4.

## 3. Light site-wide fixes

In order of value; each is small.

1. **One account name**: "Persephone's Chair account" everywhere (today the Play page says Game Night account).
2. **Shared styles into `site.css`**: `.section-label`, `.section-note` and the card action row, now copied in Play's and Support's inline styles; and the chip classes.
3. **Support anchors**: `id="free"` and `id="pay"` on Support's sections, so Play (and the account page) can link straight to the trial rules.
4. **"Format", not "game", for what is hosted and paid for**: Support says "Pay for a game", "Prices are per game", "Choose a game on your account", "Which games can I pay for?" and more. The account page in the login app (`persephones-chair-uac-manager/login/`, its `rulesWords` and price lines) needs the same change in its own repo, since Support's trial wording is kept word for word in step with it.
5. **Homepage Play strip**: "Play along live, or host our quiz formats at your own quiz night." with a Play icon instead of the Game Night logo, linking to the new page.
6. **Penny Bank tabs on phones**: three equal tabs that fit (or a fade at the edge) instead of "Hall of Fame" cut off.
7. **Play page meta**: description and Open Graph text to match the new lede.
8. **Heading levels on Play**: section labels `h2`, sub-label and the trial panel `h3`, cards `h4` (as the mock-ups).
9. **Unused files**: remove `Files/QForge.zip` (52 MB) and `Files/2025SurveyReport.pdf`, or link the report somewhere if it should stay public.
10. **Vanity links' HTTP 404** (low): small redirect pages for the most shared ones (`/play/`) so link previews are not "Page not found".

## 4. Decisions for Ben

1. **The new player app's name.** Open. Some directions, none recommended yet: keep the family name and number it ("UniCon 2"), clear to regulars but exactly the confusion to avoid while both run this season; a plain name that matches the address ("Game Night Play"); or a fresh short name from the Persephone myth that Kore already draws on. The mock-up says "Player app (name to choose)".
2. **Which formats show the Free trial chip.** Recommended: the accounts service's public `GET /api/hosting?rules` also returns the ids of the formats that can be chosen as a free trial, so each card's chip follows the Admin Console. Alternative: no per-format chips, only the panel's general sentence.
3. **Personal trial time on the Play page.** Recommended: no; the page shows only who is signed in, and the time left stays on the account page (one place, already built). Alternative: show "Only Connect: 2 h 10 min left" in the sign-in box, which needs a new signed-in read from the website.
4. **Font.** Recommended: keep Chakra Petch. Alternatives: Plex for running text only; Plex everywhere except the logotype.
5. **Which site-wide fixes to do with the Play page.** Recommended: 1 to 8 together (4 in the login app's repo too); 9 needs Ben's word on the survey report; 10 can wait.

Format names in the fullest mock-up other than The Escape Artist and Risky Business (Battlefront, DangerZone, Picture This!, Red Herrings!), their letter icons and "One line about the format." are placeholders to fill the grid, not a release plan.

## 5. Ben's answers to the first draft (26 October 2026)

- **Web Games and Kore Games**: dropped for one alphabetical "Quiz formats" grid, since every format ends up on Kore. Original and Remakes was considered and not used (only two remakes, unlikely to grow).
- **"Format", not "game"**, on the page and, as fix 4, on Support and the account page.
- **The Escape Artist and Risky Business**: not listed now, and no Retiring strip; the one host who needs the old Escape Artist reaches it by its address.
- **"The Game Night player"**: not the name. The Universal Controller stays in use for at least another season, so the new app is shown beside it, not in place of it, and its name is open (decision 1).
