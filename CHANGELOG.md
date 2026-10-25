# MuseSink v2.1 — Firebase Web App preconfigured

- Added all Firebase Web App fields shown in the supplied MuseSink screenshot (these are public client settings, not credentials).
- The Realtime Database URL is deliberately blank: the web app screenshot does not show whether or where the database exists.
- `FINISH_FIREBASE_SETUP.bat` asks only for the missing exact URL and retains other fields.
- Website now displays a clear **DATABASE SETUP NEEDED** status rather than confusing missing configuration with a functional online session.
- Updated asset version query strings so browsers fetch the new configuration.
- No changes to the sync playback algorithm from v2.0, which already addressed repeated track restarts.
- This is ready for deployment **once** Realtime Database, Anonymous Auth, RTDB rules, and hosting are enabled; real two-device playback remains to be verified.

# MuseSink v2.0 — Stability + go-live build

* Fixed seek loop by replacing aggressive 2.2-second corrections with 7-second sustained drift tolerance, two consecutive checks, 18-second seek cooldown, and 10-second playback-start grace.
* Separate manual DJ seek/track changes from background corrections; no forced seek on focus/visibility changes.
* Initial playback arming catches up one time instead of repeatedly jumping.
* Avoid repeated playVideo calls during the YouTube UNSTARTED state.
* Added Firebase RTDB `.info/connected` status: LIVE SYNC vs RECONNECTING.
* Make Firebase initialization errors unmistakable (ONLINE FAILED / DEMO; never claim LIVE SYNC after failure).
* Updated version UI to v2; preserved Deadlock, Valorant and R.E.P.O. profile UI, each game's independent queue, DJ handoff, thumbnails, local volume, YouTube embed, and online room model.
* Added SETUP_LIVE.bat/py to write public Firebase Web config, INSTALL_TO_GITHUB.bat for GitHub Desktop, and GO_LIVE_FIRST.md.
* Added local browser simulation coverage and a release QA report in README.
