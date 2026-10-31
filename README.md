# MuseSink v4.0 — The Listening Room

A small, shared record-shop-inspired music website for you and your friends. All visitors share **one listening room**, with no invite codes or game-specific profiles.

## What's new

- **Real record-crate browsing:** a shelf of playlist sleeves and song artwork, with page buttons instead of long scrolling lists.
- **Spinning record display:** the current YouTube thumbnail is presented as a vinyl sleeve with a rotating LP and turntable details.
- **Fixed bottom player:** a compact set of shared transport controls, song progress, personal volume, and Enable Audio.
- **Black + rainbow when idle:** while a song is playing, the interface shifts to colors sampled from its YouTube thumbnail (fallback colors are deterministic if image sampling is blocked).
- **Independent browsing:** exploring another playlist doesn't interrupt playback; only selecting a song does.
- **Compact official YouTube player:** the video remains a 200 × 200 secondary preview in the track pane, rather than a large video panel.
- **No page scrolling:** desktop content is paginated and phones use Library / Player / Songs tabs.

## Multiplayer

This build retains the existing Firebase project configuration, Realtime Database schema (`musesinkHub/v1`), and anonymous sign-in. No new Firebase rules should be needed if **MuseSink v3** was already online using `database.rules.json`.

Everyone opens the **same published URL**. Each device clicks **ENABLE AUDIO** once before YouTube can play. The site uses YouTube's official embedded player, not audio downloading or extraction.

## Files

- `index.html`, `styles.css`, `app.js`: website
- `firebase-config.js`: Firebase web configuration
- `database.rules.json`: existing MuseSink v3-compatible RTDB rules
- `INSTALL_TO_GITHUB.bat`: copies this full website into an existing GitHub Desktop repository
- `START_DEMO.bat`: local preview for testing on a single computer
- `GO_LIVE.md`: update instructions

## Caveats

YouTube playback requires an embeddable video. The official embedded player has size and visibility rules; the small 200 × 200 preview stays in the Songs area. On smaller devices, the player appears in the Songs tab. Browsers may still require a user gesture and may limit playback in background tabs.

The website's address is not a security mechanism: anyone who obtains the URL could join the shared library, since Anonymous Authentication does not identify your friend group. Do not store private data in the playlist names.
