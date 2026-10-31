# MuseSink — Changelog

## 3.0 — One Space, Many Playlists

- Removed room creation, room joining, invite URLs and eight-character codes.
- Removed all game-specific playlists and profile switching.
- Added automatic entrance to one Firebase-shared listening space.
- Added shared playlist creation, renaming, deletion and selection.
- Added 2×2 playlist cover mosaics, song thumbnails, and paging controls.
- All listeners can control music; per-listener volume stays local.
- Automatic end-of-song advancement now uses an atomic playback compare-and-swap to prevent multiple listeners from skipping multiple songs.
- Retained and hardened low-disruption YouTube sync and manual resync.
- Redesigned the UI for one screen, no scrolling and no overlapping controls.
- Added mobile Player / Playlists / Tracks tabs.
- Retained the v2.4 Firebase configuration and cover-responsive RGB theming.
- Introduced new **musesinkHub/v1** database rules. The old `musesinkRooms` data is left unchanged.
