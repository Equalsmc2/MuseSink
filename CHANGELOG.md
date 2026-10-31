# MuseSink Changelog

## v2.4 — RGB Single-Page Refresh

### What changed
- Removed the separate **Deadlock / Valorant / R.E.P.O. music profiles**.
- Rebuilt the UI into a **single no-page-scroll dashboard** so the important controls stay visible in one spot on desktop.
- Added a **cover-reactive RGB theme**:
  - the current track thumbnail now drives the page glow and accent colors
  - the background softly reflects the current cover art
- Reworked the layout into three focused zones:
  - **Now Playing**
  - **Shared Queue**
  - **Room / Lobby**
- Kept the existing **Firebase + YouTube sync** flow and the earlier API-key fix.
- Preserved lightweight architecture: plain HTML, CSS, and JS with no framework.

### Notes
- Desktop is the primary target for the new no-scroll layout.
- On narrower screens the site can stack vertically so it remains usable.
