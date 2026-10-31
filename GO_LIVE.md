# Update MuseSink to v4 — The Listening Room

1. Extract the ZIP.
2. Run `INSTALL_TO_GITHUB.bat`, select the existing local MuseSink Git repository, and confirm the file update.
3. In GitHub Desktop, commit the changes and click **Push origin**.
4. Open your GitHub Pages URL and press **Ctrl+Shift+R** to refresh the website.
5. Confirm the logo says `04` and the connection indicator says **LIVE SYNC**.
6. Each friend opens the *same* URL and presses **ENABLE AUDIO** once. You can browse playlists without stopping the song.

## Firebase

The backend stays on `musesinkHub/v1` and `database.rules.json` is unchanged from v3. If v3 was already live, there is **nothing new to publish in the Firebase console** for v4. If this is a fresh setup, enable Firebase Anonymous Authentication and publish the bundled Realtime Database rules.

## Troubleshooting

- **LOCAL PREVIEW:** authentication or database connection failed; check the status banner and Firebase configuration.
- **Player not starting:** try an embeddable YouTube URL, click Enable Audio, and make sure browser permissions or extensions aren't blocking the official embed.
- **Site still looks like v3:** hard-refresh and check that GitHub Desktop pushed all updated files. The version beside MuseSink should say `04`.
- **No thumbnail colors:** the fallback palette is used if the thumbnail host denies pixel sampling. The thumbnail can still appear visually.

## Privacy

The URL is not an access-control mechanism. Anyone who discovers it could join via anonymous authentication and change shared music. Keep this for a trusted group or implement real authentication if access restrictions matter.
