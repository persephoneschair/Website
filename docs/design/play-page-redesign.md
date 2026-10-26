# Play page redesign, and light site-wide fixes (design, not built)

Written 26 October 2026. Design only: no site code has changed. Nothing here is built until Ben says yes.

Mock-ups: `docs/design/play-page/empty.html` and `full.html` (with `play.css`). They load the real `/assets/css/site.css`, so serve the repo root (`python -m http.server 8834`) and open `/docs/design/play-page/empty.html`. PNGs of both states at the same sizes (1440 wide, and 375 wide):

| | Empty (today: signed out, no Kore format live, trial chips not yet answered) | Fullest (signed in, six Kore formats listed, trial chips shown) |
| --- | --- | --- |
| Desktop | `play-page/empty-desktop.png` | `play-page/full-desktop.png` |
| Phone | `play-page/empty-phone.png` | `play-page/full-phone.png` |

## 1. Audit

Checked on the local dev server at 1440 and 375 wide (and 320, 768, 1024 for the mock-ups), by text reads, layout measurements and a few screenshots. No page scrolls sideways at any width.

### Every page

| Page | Purpose | Works | Confusing, inconsistent or stale |
| --- | --- | --- | --- |
| Home `/` | The show: watch, play along, episodes, Penny Bank, Q-Forge, Discord | Strong hero and logotype; latest episode loads behind a same-size skeleton; clear three-button row | The Play strip says "Standalone games you can play any time", but they are games you **host**; it uses the Game Night logo as its icon. Q-Forge appears here and in the footer only |
| Play `/PlayAGame/` | Play along, and the games | Simple cards; works on phones | See section 2. Calls them "Standalone games"; every card says the same "Play in your browser on any device"; no word of hosting, the free trial or its rules, or Support; "Game Night account" where every other page says Persephone's Chair account; lists The Escape Artist and Risky Business as if they were like the other three, though they are the old web builds that retire when Kore runs them; no mention of Kore; meta description still says "standalone games"; the cards' `h2`s sit at the same level as the section labels |
| On Demand | Every episode, searchable | Good filters; compact rows on phones; count line | Fine. On phones the filter panel takes most of the first screen before any episode |
| Penny Bank | Leaderboard, medal cabinets, Hall of Fame | Clear podium and table | On phones the three tabs scroll sideways and "Hall of Fame" is cut off at the edge with no sign there is more. Its data source moves to Kore's ledger at Phase 2 P2f (not a design matter here) |
| Support | What support gives; free trial rules; prices | The trial rules paragraph with live numbers in fixed-width boxes is the model for the Play page | No `id`s on its sections, so other pages cannot link to "the trial rules" directly. Its section-label and card styles are copied from the Play page's inline `<style>` |
| Privacy | Accounts' privacy | Clear, dated | None |
| `/account/` | Redirect to the login app | Works | None |
| `/Downloads/` | Old link, redirects to Play | Works | None |
| 404 and vanity links | `/play`, `/ondemand`, ... | Redirect in the browser | The server still answers HTTP 404 first, so a link pasted into Discord previews as "Page not found". Low priority |
| `/UniCon/` | The controller, full screen | Two-step home button | Will be replaced by the Kore player app |

### Across the site

- **Names**: the header brand is Game Night (right: the show), but accounts are "Persephone's Chair accounts" on Privacy, Support and in Kore, and "Game Night account" on Play. Tab titles say "– Game Night" even on Support and Privacy, which are Persephone's Chair pages (fine to leave; noted).
- **Typography**: three faces, used consistently: Game Over for display headings, Satisfy for the signature, Chakra Petch for everything else. Section labels (small caps, muted) and panel headings are consistent between Play and Support, but each page carries its own copy of the CSS.
- **Colour**: one token set in `site.css`, used well. There are no status colours yet (no green or red), so the Play page's need is new.
- **Navigation**: four links plus Discord and Watch live; Support and Q-Forge are footer only. That is right for viewers; the Play page is where a would-be host needs Support, so it should link it in the body (section 2).
- **Layout stability**: already good: the account slot and the trial numbers reserve their space. The Play page proposal keeps that rule.
- **Stale files**: `Files/QForge.zip` (52 MB, Q-Forge is a web app now) and `Files/2025SurveyReport.pdf` are linked from nowhere. The UniCon zips are still linked and still needed until UniCon retires.

### What the Play page must cover

1. Playing along with the stream: the Universal Controller today, the Kore player app (play.persephoneschair.com) later. Players never need an account.
2. Hosting the web games (Only Connect, Wonderwall, Face/Off) with the free trial: 28 days and 4 hours of play, numbers live from `GET /api/hosting?rules`, a link to the full rules on Support, and to the account page where a trial is chosen.
3. Kore formats to come, starting with The Escape Artist and Risky Business, and what happens to their old web versions.

## 2. The Play page proposal

One page, three blocks, in the order people arrive with: watch and play, host, what's next.

1. **Head**: "Play" in the logotype, lede "Play along with Game Night live, or host our games at your own quiz night."
2. **Play along live**: one wide panel. Today: the Universal Controller with Open in browser and the two downloads, and one quiet line "Coming with Kore: one player app for every Game Night format." Later: "The Game Night player" (play.persephoneschair.com), with the Universal Controller as the second button while Unity formats remain. The quiet line is always there. The panel's contents change only when the site is updated for Kore, never while the page is open (the two versions are one height at desktop width; on narrower screens the wording wraps differently).
3. **Host your own**
   - One sentence on how hosting works (laptop, Broadcast screen, players on phones with a room code, no account for players).
   - **Free trial panel**: the rules sentence in short, with the two numbers in fixed-width boxes filled by the same `site.js` code as Support (`[data-trial-rules]`), and links "Full trial rules" (to Support's trial section) and "Why support us". At the right, a fixed-size **sign-in box** fed by the header's existing `peek`: signed out shows "Not signed in", "Hosting needs a Persephone's Chair account." and Sign in / Create account; signed in shows the picture and username, "Choose a free trial, or see your games and time left." and Your account / Pay for a game. Both fill the same three rows, so signing in never changes the panel's height (measured: the same in both states at every width, 170 px at desktop, 224 px at 375 wide).
   - **Web games**: three equal cards, Only Connect, Wonderwall, Face/Off, each with its icon, one real line about the game, a chip row and two buttons, "Host <game>" and "Join a game". The chip row is always one line high; the **Free trial** chip shows when the game is on the trial list (decision 2) and is held invisible, not removed, until then.
   - **Kore games**: one sentence on Kore, then a grid of fixed-size tiles (156 px on desktop, 84 px rows on phones): icon, name, a status chip, and Host (to host.persephoneschair.com) or a disabled "Not hostable yet". A dashed tile, "More Game Night formats follow, one at a time.", fills the row. Today: The Escape Artist and Risky Business, both Coming soon. Below the grid, one strip with a **Retiring** chip: their old web versions still run until the Kore versions are live, with a button for each.
4. **Footer** as now.

### Status chips

Text and an icon on every chip, so colour is never the only signal; the colours also differ in brightness, not just hue:

| Chip | Look | Meaning |
| --- | --- | --- |
| Live | bright green fill `#3FD68C`, dark ink, tick | Hostable now |
| Coming soon | the existing chip (navy, muted text), clock | Announced, not hostable |
| Retiring | dark red fill `#8E1F33`, `#E0475E` edge, pale ink, cross | An old version that will close |
| Free trial | gold outline, no fill | Can be chosen as the free trial |

Checked with the Machado 2009 simulation at full severity: green and red fills have luminance 0.51 and 0.07 (contrast 4.7:1 between them); under protanopia they become a light khaki and a near-black olive (6.4:1), under deuteranopia a light beige and a dark olive (3.9:1), so they never look alike. Ink on each: 8.5:1 on green, 7.3:1 on red. Gold (Free trial) is an outline, not a fill, so it cannot be mistaken for the green fill when both sit in one row.

### No jumps

- The trial numbers: fixed-width boxes, as Support.
- The sign-in box: one fixed shape for every state; filled by the existing `peek`, hidden until it answers as the header slot is.
- Free trial chips: always mounted, `visibility: hidden` until the lookup answers.
- Kore tiles: fixed height; Coming soon tiles keep the button's box (hidden on phones) so names line up.
- Measured in the mock-ups at 1440, 1024, 768, 375 and 320 wide: the trial panel, sign-in box, cards and tiles are the same height in both states (the one exception is a tile at 320 wide, where a long name may take a second line rather than be cut).

### Font

**Recommendation: keep Chakra Petch on the website; do not follow Kore's IBM Plex Sans.** Plex is Kore's default for app screens (console, player, Broadcast), where long questions and answers must read plainly. The website is Game Night's shop window, and Chakra Petch with the Game Over logotype is its look; the BIBLE's own rule is that a brand's style may keep its own face. Changing it would touch every page for no gain to the Play page. If Ben prefers to match Kore, the cheapest step is Plex for running text only (`--font`), keeping Chakra Petch for nav, buttons and labels; decision 4.

## 3. Light site-wide fixes

In order of value; each is small.

1. **One account name**: "Persephone's Chair account" everywhere (today the Play page says Game Night account).
2. **Shared styles into `site.css`**: `.section-label`, `.section-note` and the card action row, now copied in Play's and Support's inline styles; and the three status tokens with the chip classes.
3. **Support anchors**: `id="free"` and `id="pay"` on Support's sections, so Play (and the account page) can link straight to the trial rules.
4. **Homepage Play strip**: "Play along live, or host our games at your own quiz night." with a Play icon instead of the Game Night logo, linking to the new page.
5. **Penny Bank tabs on phones**: three equal tabs that fit (or a fade at the edge) instead of "Hall of Fame" cut off.
6. **Play page meta**: description and Open Graph text to match the new lede.
7. **Heading levels on Play**: section labels `h2`, sub-labels and the trial panel `h3`, cards `h4` (as the mock-ups).
8. **Unused files**: remove `Files/QForge.zip` (52 MB) and `Files/2025SurveyReport.pdf`, or link the report somewhere if it should stay public.
9. **Vanity links' HTTP 404** (low): small redirect pages for the most shared ones (`/play/`, `/support` already exists) so link previews are not "Page not found".

## 4. Decisions for Ben

1. **The Play page layout** as in the mock-ups: Play along live, Host your own (trial panel, web games, Kore games), what's next. Recommended.
2. **Which games show the Free trial chip.** The trial list can change in the Admin Console, and Support deliberately names no games. Recommended: the accounts service's public `GET /api/hosting?rules` also returns the ids of the games that can be chosen as a free trial, so each card's chip follows the Admin Console. Alternative: no per-game chips, only the panel's general sentence ("any game marked Free trial" becomes "our hostable games").
3. **Personal trial time on the Play page.** Recommended: no; the page shows only who is signed in, and the time left stays on the account page (one place, already built). Alternative: show "Only Connect: 2 h 10 min left" in the sign-in box, which needs a new signed-in read from the website.
4. **Font.** Recommended: keep Chakra Petch. Alternatives: Plex for running text only; Plex everywhere except the logotype.
5. **The old Escape Artist and Risky Business builds.** Recommended: keep them listed only in the Retiring strip until their Kore versions are live, then remove the strip. Alternative: drop them from the page now.
6. **Which site-wide fixes to do with the Play page.** Recommended: 1 to 7 together; 8 needs Ben's word on the survey report; 9 can wait.

Kore format names other than The Escape Artist and Risky Business in the fullest mock-up (Red Herrings!, Picture This!, DangerZone, Battlefront) and their letter icons are placeholders to fill the grid, not a release plan.
