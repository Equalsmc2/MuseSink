# MuseSink v4.1 — The Listening Room

A lightweight digital record shop for a group of friends: one website URL, shared playlists, synchronized YouTube listening, and no room codes.

## What's changed in v4.1

- Playlists are compact sleeves in your record crate, not oversized blank containers.
- **On this shelf** shows real songs with covers and one-click play buttons. When the playlist has no songs, you see a friendly empty-state note.
- On smaller monitors the shelf intelligently prioritizes the playlist list rather than cramming extra content.
- The official YouTube source panel is organized as a small player with readable source metadata.
- Browsing a different playlist does not change the song being played for everyone.

## How to install over v4.0

1. Extract the ZIP to a new folder.
2. Run `INSTALL_TO_GITHUB.bat` and choose your existing local MuseSink Git repository.
3. Open GitHub Desktop, commit, then push the changes.
4. On your hosted site press Ctrl+Shift+R if you still see the old version.

This update does not change the Firebase rules or stored playlists. Keep the existing published `database.rules.json` (the included copy is the same).

## How to use

- Opening the site automatically joins the single shared listening room.
- Choose a playlist in the crate. Browsing does not change the shared music.
- Use the song list on the right, or a track in **On this shelf**, to play a selection for everyone.
- Add songs using a YouTube URL. Click **Enable Audio** for your own browser.
- Everyone controls their own volume. Play/pause/seek/skip are synchronized.

## Technical notes

- Plain HTML, CSS and JavaScript; no app framework or audio server.
- Firebase Anonymous Authentication + Realtime Database for shared state.
- Uses the official embedded YouTube player; users cannot use non-embeddable videos.
- A minimum-size YouTube player remains visible for official playback compliance, while the large turntable art is decorative.
- Static UI tests cannot prove real two-device synchronization; test with friends after publishing.
