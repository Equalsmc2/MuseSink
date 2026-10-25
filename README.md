# MuseSink v2.2 — Online Firebase configuration included

**Firebase is already set up inside `firebase-config.js` including the Realtime Database URL.** Do **not** run any Firebase setup batch file again. Follow `GO_LIVE_FIRST.md` to publish Realtime Database rules, enable Anonymous Authentication, and publish your website with GitHub Desktop.

---

# MuseSink v2.2 — The squad's shared soundtrack

Three separate game playlists and themes, one synchronized room. Made with plain HTML, CSS and JavaScript to keep memory/CPU usage low. No npm, bundler, React, backend server, or media downloading. The only playback engine is YouTube's official, **visible** embedded player. Firebase holds a tiny room state: current game, playback timestamp, playlist entries, and who's connected.

## Go live first

The complete Firebase Web App configuration, including **`databaseURL`**, is present in `firebase-config.js`. Firebase configuration files do not need editing. **Start with [`GO_LIVE_FIRST.md`](GO_LIVE_FIRST.md)** for the three remaining steps: publish the corrected rules, enable Anonymous Authentication, and host the site on GitHub Pages.

## Try it right now (local demo)

- Windows: double-click `START_DEMO.bat` (requires Python installed).
- Otherwise, open a terminal in this folder, run `python -m http.server 5500` (or `py -m http.server 5500`) and visit `http://localhost:5500`.
- Create a room; paste a YouTube video link; click **Enable My Audio**; press **Play**. Open a second browser tab and join using the code to try cross-tab sync.

**IMPORTANT:** `databaseURL` is already configured. Rooms will synchronize across computers only when Firebase rules/Auth are enabled and the site is hosted on an HTTPS URL. The header must say **LIVE SYNC**.

## Enable real online rooms using Firebase

Your MuseSink project already has a Realtime Database at `https://musesink-default-rtdb.firebaseio.com`. To use it:

1. In Firebase Console, enable **Authentication → Sign-in method → Anonymous**.
2. In **Realtime Database → Rules**, publish the supplied `database.rules.json`. This file has the fixed rules without the unsupported `numChildren()` expression. If other unrelated data uses the same database, merge rules carefully instead of overwriting them.
3. Run `INSTALL_TO_GITHUB.bat`, choose a GitHub Desktop repository folder, then commit and push. In GitHub repo settings, configure **Pages → Deploy from a branch → main → /(root)**. Share the published site URL with friends.

The page header should show **LIVE SYNC**. If you encounter `PERMISSION_DENIED`, check the rules and Anonymous Authentication. If you get `auth/unauthorized-domain`, add your GitHub Pages **hostname** to Firebase Authentication authorized domains. See `GO_LIVE_FIRST.md` for details.

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
- `firebase-config.js` – preconfigured **public client-side** Firebase settings
- `database.rules.json` – Firebase Realtime Database rules for MuseSink data
- `START_DEMO.bat` – local Windows preview server

## Performance

No bundler or JavaScript UI framework. The page only refreshes UI on room changes and updates the progress timer once per second; sync checks every 4 seconds. Image previews are lazy-loaded. YouTube playback is by far the largest CPU/network component, because each listener is playing an actual YouTube embed. MuseSink does not host or transcode media.

## v2 regression coverage

Executed: `node --check app.js`, Python `py_compile` for setup helper, static HTML/rules checks, and headless Chromium DOM smoke using an in-memory mock YouTube API. The smoke covered room creation, track queuing, arm, conservative drift correction with seek cooldown, and separate game playlists. Actual YouTube CDN streaming, Firebase permissions, and two physically separate devices must be verified in the deployed environment. See `CHANGELOG.md`.
