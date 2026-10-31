# MuseSink v3.0 — QA Report

## Checks actually performed

- `node --check app.js`: passed.
- `python -m json.tool database.rules.json`: valid JSON.
- Browser rendering using **system Chromium + Playwright** and injected local HTML/CSS/JS:
  - 1536×950: document height exactly viewport height, no page scroll, no JavaScript exceptions.
  - 1440×768: same.
  - 1280×720: same.
  - 390×844: no page scroll; mobile tabs show exactly one main panel at a time.
- Local simulated create playlist → add track → rename playlist: passed.
- Atomic local compare-and-swap for end-of-track playback: first transition accepted, repeated transition against stale command rejected.
- HTML JS reference check, ZIP integrity and file structure: passed.

## Not tested / important limitations

- **Actual Firebase Realtime Database rule evaluation** requires the user's Firebase project or Rules Emulator; JSON validity does not prove the published rules are accepted or permit the expected operations.
- **Real two-device playback sync** was not tested against the user's live database.
- **Actual YouTube media playback and cover-image fetching** could not be verified in the restricted browser QA environment. The visual preview therefore used empty thumbnail boxes in place of externally loaded artwork.
- Firefox was not run.
- The static no-scroll visual tests validate content placement only for specified screen dimensions; alternate text scaling or browser UI zoom may need further adjustment.

## Acceptance test after publishing

1. Install the new Firebase RTDB rules.
2. Deploy the v3 files on the GitHub Pages site and hard-refresh.
3. Open the site on two different devices; verify both show LIVE SYNC without room codes.
4. Create playlist, rename it, add at least two links, and verify both devices see the same lists and covers.
5. On each device press ENABLE AUDIO once; test play/pause/skip/seek and manual sync.
6. Let a song end naturally while two clients are listening; confirm the queue advances only once.
7. Test at a smaller window and a phone; use tabs and page buttons to navigate without scrolling the page.
