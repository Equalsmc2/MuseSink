# MuseSink v3.2

MuseSink is a lightweight shared music site for a private friend group. Everybody who opens the same URL sees the same playlists and hears the same shared playback.

## Highlights
- One permanent shared space, no room codes
- Multiple shared playlists with cover art
- Black UI with rainbow idle accents
- Dynamic theme colors from the current song cover while music is playing
- Blockier, more compact UI layout
- Hidden YouTube playback engine instead of a giant visible video section
- Desktop layout designed to avoid scrolling
- Mobile tab layout for smaller screens

## Files
- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`
- `database.rules.json`
- `INSTALL_TO_GITHUB.bat`
- `START_DEMO.bat`

## Go live
1. Publish `database.rules.json` in Firebase Realtime Database Rules.
2. Put these files in your GitHub Pages or static hosting repo.
3. Commit and push.
4. Open the site and click **Enable Audio**.

## Notes
- Idle = rainbow accents.
- Playing music = accents adapt to the current track cover.
- The YouTube engine still powers playback, but the big visible video panel is gone.
- YouTube embeds still depend on the video being embeddable.
