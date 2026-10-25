# MuseSink v2.1 — The squad's shared soundtrack

Three separate game playlists and themes, one synchronized room. Made with plain HTML, CSS and JavaScript to keep memory/CPU usage low. No npm, bundler, React, backend server, or media downloading. The only playback engine is YouTube's official, **visible** embedded player. Firebase holds a tiny room state: current game, playback timestamp, playlist entries, and who's connected.

## Go live first

Your Firebase WEB APP configuration is already saved in `firebase-config.js` from your screenshot; **only the actual `databaseURL` is missing**. Use `FINISH_FIREBASE_SETUP.bat` after creating Realtime Database. Do not replace this project ID with another.

**Start with [`GO_LIVE_FIRST.md`](GO_LIVE_FIRST.md)**: it provides the shortest steps for connecting Firebase and publishing to GitHub Pages. On Windows, `SETUP_LIVE.bat` writes the web config, and `INSTALL_TO_GITHUB.bat` copies the site into your GitHub Desktop repo. The package cannot turn on cloud services without your account configuration.

## Try it right now (local demo)

- Windows: double-click `START_DEMO.bat` (requires Python installed).
- Otherwise, open a terminal in this folder, run `python -m http.server 5500` (or `py -m http.server 5500`) and visit `http://localhost:5500`.
- Create a room; paste a YouTube video link; click **Enable My Audio**; press **Play**. Open a second browser tab and join using the code to try cross-tab sync.

**IMPORTANT:** With `databaseURL` left blank, rooms **only work across tabs on the same machine and site origin**. They do *not* synchronize your friends' computers. To play online, complete the Firebase setup below and host the site via HTTPS.

## Enable real online rooms using Firebase

This is the same GitHub Pages + Firebase-style workflow used for SoulSeekers. MuseSink can use the **same Firebase project** if you wish, but it needs **Realtime Database** and anonymous auth. It's namespaced under `musesinkRooms`, so it doesn't modify existing SoulSeekers records.

1. Open [Firebase Console](https://console.firebase.google.com/), select an existing project (or create a new one).
2. **Build → Authentication → Sign-in method**: enable **Anonymous** authentication.
3. **Build → Realtime Database → Create database**. Choose a suitable region. Choose locked mode initially, not open test mode. Note the **database URL** (ending in `.firebaseio.com` or `.firebasedatabase.app`). Firestore alone is not enough.
4. In Realtime Database → **Rules**, merge the `"musesinkRooms"` rule from `database.rules.json` into your project's existing `"rules"` object. If this is a brand-new project with no existing data/rules, you can copy the **entire** `database.rules.json` contents. **Do not overwrite existing SoulSeekers rules** if you share the Firebase project. Publish the rules.
5. In Firebase Console → **Project settings → General → Your apps**, register/select a **Web app** and copy its `firebaseConfig` object.
6. The Firebase Web App credentials are already prefilled. Run `FINISH_FIREBASE_SETUP.bat` and enter the exact `databaseURL` from step 3, or manually fill that one field in `firebase-config.js`. Example:

   ```js
   window.MUSE_FIREBASE_CONFIG = {
     apiKey: "YOUR_PUBLIC_WEB_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
     projectId: "YOUR_PROJECT",
     appId: "YOUR_APP_ID"
   };
   ```

7. In Authentication → **Settings → Authorized domains**, add your actual GitHub Pages hostname (e.g., `your-user.github.io`) if not already present. Local `localhost` may need authorization too, depending on project age/settings.
8. Publish these files through **GitHub Pages**: put the folder's *contents* at the published repository root; commit/push with GitHub Desktop; Repository Settings → Pages → Deploy from branch. You can also host these same static files with Firebase Hosting. Send friends your site link or create a room and click **Copy Invite Link**.
9. **Test with two different devices**: both show `LIVE SYNC` in the header; use a shared 8-character code; enable audio on each; change tracks and verify timing stays close. If the header says `LOCAL DEMO`, the Firebase setup is not active or failed.

### Game controls

- **Create Room / Join Room**: join using a shareable URL or 8-character room code.
- **Enable My Audio**: every player needs one interaction to satisfy browser autoplay rules. Leave the website open with the official embedded player available; YouTube content is not extracted to audio-only files.
- **Add to Queue**: paste regular `youtube.com/watch`, `youtu.be`, Shorts, or YouTube video IDs. Titles can be supplied; otherwise MuseSink picks up the title from the official player when the DJ plays the song.
- **Take the Aux**: the creator is the first DJ. Any room member can claim DJ control. Only the current DJ can play, pause, skip, seek, remove anyone's entries, or switch the shared game theme. Everyone can add songs; people can remove their own.
- **Game switch**: separate *persistent room playlists* for Deadlock, Valorant, and R.E.P.O. Switching pauses the previous game's playback and selects the new game's saved position.
- **Local volume**: each listener sets their own volume. This does not change anyone else's.
- **Sync**: manually re-aligns to room timestamp. The app also checks for drift about every 4 seconds (7-second threshold, consecutive samples and an 18-second correction cooldown), and when the window regains focus.

### Notes and limits

- This synchronizes playback **approximately**. Network latency, buffering, ads, individual YouTube restrictions, and browser policies can cause slight delay. It isn't sample-accurate party audio.
- It uses the **YouTube IFrame Player API**, not an MP3 ripper. YouTube embeds must remain visible at least 200 × 200 pixels and their built-in controls must not be obscured. Embedded playback availability varies by video, region, and account. Respect YouTube's player terms and browser autoplay rules.
- Web browsers may block autoplay until you interact. Never force a hidden player or bypass adverts/access restrictions. Video streams are loaded from YouTube on **each** listener's device; Firebase transmits only synchronization metadata.
- Anyone who knows a code and has an anonymous account in *your* Firebase project can access that room and take the aux. Don't treat private codes as strong authentication. Anonymous sign-in and per-room validation rules reduce accidental/unwanted database edits but are **not a complete anti-abuse system**. For public rooms use a stricter auth/permission system, quotas and possibly App Check.
- Room records and playlists persist in Firebase until manually deleted. Old rooms are not automatically purged; occasionally remove old `musesinkRooms` entries in Firebase Console to avoid accumulating data.
- Closing a tab normally removes its listener presence using Firebase `onDisconnect()`. Two tabs sharing the same anonymous identity can affect presence counts.
- Don't commit *private server-side Firebase Admin credentials* or service-account keys. The Firebase web config is designed to be publicly delivered, but **database rules must be active**.

## Files

- `index.html` – application UI and YouTube player mount
- `styles.css` – theme palettes and responsive styling
- `app.js` – playlist management, transport, local demo and Firebase sync
- `firebase-config.js` – optional **public client-side** Firebase setup
- `database.rules.json` – Firebase Realtime Database rules for MuseSink data
- `START_DEMO.bat` – local Windows preview server

## Performance

No bundler or JavaScript UI framework. The page only refreshes UI on room changes and updates the progress timer once per second; sync checks every 4 seconds. Image previews are lazy-loaded. YouTube playback is by far the largest CPU/network component, because each listener is playing an actual YouTube embed. MuseSink does not host or transcode media.

## v2 regression coverage

Executed: `node --check app.js`, Python `py_compile` for setup helper, static HTML/rules checks, and headless Chromium DOM smoke using an in-memory mock YouTube API. The smoke covered room creation, track queuing, arm, conservative drift correction with seek cooldown, and separate game playlists. Actual YouTube CDN streaming, Firebase permissions, and two physically separate devices must be verified in the deployed environment. See `CHANGELOG.md`.
