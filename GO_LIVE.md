# MuseSink v3.0 — Go Live

## Why the rules must change

MuseSink v2 stored separate rooms under `musesinkRooms/{roomCode}`. MuseSink v3 deliberately **does not use rooms or invitation codes**. All listeners use a single synced home: `musesinkHub/v1`.

That new path is denied under the old RTDB rules. The new file `database.rules.json` grants authenticated anonymous users read/write access **only to MuseSink's v3 data paths**, with validation for playlists, songs, playback and each listener's presence. It denies reads/writes outside the defined structure by default.

## Before installing

1. Open your Firebase project **MuseSink** → **Realtime Database** → **Rules**.
2. Keep a copy of the existing rules if you use other apps in this same database.
3. Paste the full contents of `database.rules.json` and click **Publish**.
4. Confirm **Authentication** → **Sign-in method** → **Anonymous** is **Enabled**.
5. If you use GitHub Pages, verify its hostname is in **Authentication → Settings → Authorized domains**. Add it there if needed.

## Deploy

1. Extract this full ZIP.
2. Double-click `INSTALL_TO_GITHUB.bat`, or copy the files manually into your MuseSink GitHub repository root (beside the `.git` folder).
3. Open GitHub Desktop → commit the changes → **Push origin**.
4. If needed, open GitHub repository → **Settings → Pages** → deploy `main` branch from `/ (root)`.
5. Open the live site and hard refresh using Ctrl+Shift+R.
6. Confirm **LIVE SYNC** appears at the top.
7. Each friend opens the **same website URL**, clicks **ENABLE AUDIO** once, and joins the one shared playlist library. No room codes, invites or accounts needed.

## First-use check

1. Open the site on one computer and create a playlist.
2. Open it on another PC, verify the playlist automatically appears.
3. Add two YouTube links. Both should show cover thumbnails.
4. Click play. After clicking Enable Audio, the computers should hear approximately the same moment of the same song.
5. Try skipping and switching playlists from the other PC. Every connected listener should follow.

**The supplied ZIP includes the Firebase web configuration from MuseSink v2.4**. You should not need to retype the API key or database URL.

## Previous music

Existing v2 room data remains stored under `musesinkRooms` if it existed, but v3 does not automatically import it into the new shared library. If you had playlists you want to keep, export their URLs before switching or retain a backup of the previous database rules/data. The v3 install does not delete those database records.

## Security and privacy

There is no room code or password. This is intended for a small, trusted group. **Knowing the website URL is not a true access-control mechanism.** The app uses Firebase anonymous sign-in, so someone who finds the site could potentially join and edit the shared library. Do not put private information in playlist titles or display names. Stronger access control would require authentication or a backend allowlist.

## Limitations

- YouTube embeds must be permitted by the original video and the browser. Some videos cannot play embedded.
- Browser autoplay policies require each listener to click **ENABLE AUDIO**.
- RTDB synchronizes playback intent and approximate timeline; YouTube ads, network jitter and buffering can create drift. Manual resync is provided.
- Four playlists and four/five tracks appear at a time, with page arrows — no full-page scrolling on desktop or phone.
- Cover-inspired colors are sampled when allowed by the thumbnail image host; otherwise a stable RGB pairing is used for the track.
