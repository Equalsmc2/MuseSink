# MuseSink 3.0 — Zero Friction Edition

MuseSink is a lightweight synchronized YouTube music website for a trusted gaming squad. It is built with **plain HTML, CSS and JavaScript**, plus Firebase Auth/Realtime Database and the official YouTube IFrame player.

## User experience

There is **one shared listening space**. Everyone simply opens the same site URL. No room creation, room IDs, invites or music profiles.

- Make as many playlists as you want; rename or delete them.
- Each playlist shows a collage of actual song covers.
- Every track displays its YouTube thumbnail, title and contributor.
- Anyone can add songs, select playlists or operate the transport; all actions synchronize.
- Song cover art drives the RGB color scheme, with a stable fallback for blocked image sampling.
- The layout has **no browser-page scroll**. Page arrows reveal additional playlists and songs; on mobile the three sections are accessible through tabs.
- Volume is saved locally, and each listener enables YouTube audio themselves.

## Setup and installation

Read **GO_LIVE.md**. Most importantly, publish the new `database.rules.json` file in Firebase before deploying the code. Use `INSTALL_TO_GITHUB.bat` to install into GitHub Desktop, then commit and push.

## Data model

- `musesinkHub/v1/playlists/{playlistId}`: playlist metadata
- `musesinkHub/v1/tracks/{playlistId}/{trackId}`: YouTube link metadata
- `musesinkHub/v1/playback`: active playlist and shared player position
- `musesinkHub/v1/presence/{anonymousUid}`: connected listeners

Old `musesinkRooms` nodes are not used or modified. Avoid exposing personal information in this trusted-group app: anonymous auth permits site visitors to collaborate.

## Testing

See `TEST_REPORT.md` for the performed checks and remaining required live verification.
