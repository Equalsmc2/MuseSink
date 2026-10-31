# MuseSink v2.4 — RGB Edition

MuseSink is a lightweight shared listening room for you and your friends.

## What this version is
This build is the **single-layout refresh**:
- one shared queue
- one room
- one full-screen dashboard
- no separate music profiles
- dynamic RGB-style colors that react to the current track cover art

## Core features
- Create a room or join using an 8-character room code
- Paste YouTube links into the shared queue
- A DJ controls play / pause / skip / seek
- Listeners click **Enable My Audio** once to satisfy browser autoplay rules
- Firebase Realtime Database can sync the room across different computers
- If Firebase fails, MuseSink falls back to local demo mode

## Files that matter most
- `index.html` — app shell
- `styles.css` — full UI and responsive layout
- `app.js` — room logic, YouTube control, sync, and dynamic theme logic
- `firebase-config.js` — public Firebase web configuration
- `database.rules.json` — Firebase Realtime Database rules

## Go live
1. Put these files in your GitHub repository.
2. Push to GitHub.
3. Enable GitHub Pages.
4. Open the site and confirm the top status shows **LIVE SYNC**.

## Firebase reminders
Make sure:
- **Anonymous Authentication** is enabled
- **Realtime Database rules** are published
- the database URL in `firebase-config.js` is correct

## Notes
- MuseSink does **not** rip audio from YouTube.
- It uses the official embedded YouTube player.
- The RGB theme is generated from the current track thumbnail when available.
