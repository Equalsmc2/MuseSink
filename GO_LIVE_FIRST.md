# MuseSink v2.2 — Firebase configuration complete

This ZIP is **preconfigured** for the Firebase project `musesink` and Realtime Database URL:

`https://musesink-default-rtdb.firebaseio.com`

You no longer need `FINISH_FIREBASE_SETUP.bat` or `SETUP_LIVE.bat`. You also do not need to run `npm install firebase`.

## Before sharing with your friends

1. Firebase Console → **Build → Authentication → Sign-in method → Anonymous** → Enable (if it is not already enabled).
2. Firebase Console → **Realtime Database → Rules**: paste the contents of **`database.rules.json`** and click **Publish**. These replace the earlier broken `numChildren()` rules. This project appears to have its own fresh Realtime Database; if it contains other apps' rules, **merge** the `musesinkRooms` subtree instead of overwriting their rules.
3. Create or open a GitHub repository for this separate project. Use **`INSTALL_TO_GITHUB.bat`** to install the site into the local GitHub Desktop repository (it must already have a `.git` folder).
4. Open GitHub Desktop and choose **Commit to main** → **Push origin**.
5. On GitHub open the repo → **Settings → Pages** → **Deploy from a branch**, **main**, **/(root)** → Save.
6. Open the public HTTPS website URL; it should show **LIVE SYNC** (not `DATABASE SETUP NEEDED` or `LOCAL DEMO`). Your friends can then use room invite links to join.

**If Firebase reports `auth/unauthorized-domain`:** Firebase Console → Authentication → Settings → Authorized domains → add the hostname of your public Pages site (e.g. `yourname.github.io`). Do not add a URL path.

**If database reads/writes report `PERMISSION_DENIED`:** confirm that Realtime Database rules are published, Anonymous Authentication is enabled, and that the rules are under **Realtime Database**, not **Cloud Firestore**.

**Important:** The app's web client settings are public; they are not an Admin SDK credential. Do not share Firebase service-account private keys. Treat anyone with a room code as capable of joining that room.

**Tests and limitations:** Source/JSON/syntax and local mock-player checks have been run. Actual GitHub Pages publication, the user's live Firebase permission rules, and two-device YouTube playback have **not** been verified in this environment. YouTube browser autoplay, ads and buffering can introduce some delay.
