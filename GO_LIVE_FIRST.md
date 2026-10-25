# MuseSink v2.1 — Web App configuration included

**Already configured from your Firebase screenshot:** `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, and `measurementId`. There is **no need to install npm or the Firebase SDK**; this website dynamically loads Firebase libraries on the client.

**Still required:** Your screenshot did not contain a `databaseURL`, and it does not prove that a Realtime Database has been created or that rules or Anonymous Authentication are enabled. The setup intentionally leaves `databaseURL` blank rather than guessing a database name/region. The website explicitly shows `DATABASE SETUP NEEDED` until configured.

## Three things you need to finish

1. Firebase Console → project **musesink** → **Build → Authentication → Sign-in method → Anonymous → Enable**.
2. Firebase Console → **Build → Realtime Database → Create database** (locked mode). Open **Rules**, paste the included `database.rules.json` (new project only), and Publish. If this database has existing rules, merge the MuseSink subtree without replacing them. Copy the **exact URL** visible under the **Data** tab.
3. Double-click **`FINISH_FIREBASE_SETUP.bat`** (Python 3 installed) and paste **only the database URL**. This saves it into `firebase-config.js`. Then use `INSTALL_TO_GITHUB.bat` + GitHub Desktop to publish the site, and enable Pages in GitHub Settings. Alternatively, edit the single empty `databaseURL` string in `firebase-config.js` directly and upload all files through the GitHub website.

After publishing, you and a friend should both open the public URL, see **LIVE SYNC**, enter the same room code and click **ENABLE MY AUDIO**. This is not confirmed until a real two-device test passes.

---

# MuseSink v2 — legacy guide Go Live for Your Friends

**Status of this package:** Multiplayer code ready; it will not become an internet room until connected to *your* Firebase project and published to an HTTPS website. The Web App config is prefilled, but the actual database URL, rules and hosting must be completed in your accounts.

## 1) Make (or reuse) a Firebase project

Open <https://console.firebase.google.com/>. You may reuse your SoulSeekers project, but **MuseSink uses Realtime Database**, which is a different product from SoulSeekers' **Cloud Firestore**. You can enable RTDB alongside Firestore without changing Firestore data or rules.

* Firebase Console > Build > Authentication > Sign-in method > **Anonymous** > Enable.
* Build > Realtime Database > **Create database** > select location > **locked mode**.
* In Realtime Database > Rules, paste `database.rules.json` and **Publish**. **Important**: if an RTDB already exists in that project, *merge* the `musesinkRooms` rule into your existing rules. Do not overwrite your other app's RTDB rules.
* Project settings > Your apps > Add a **Web** app (if none exists). Copy its public configuration values. Find the Realtime Database URL in Realtime Database if `databaseURL` is omitted from web config.

## 2) Configure MuseSink

On Windows, double-click **`FINISH_FIREBASE_SETUP.bat`** and paste the exact Realtime Database URL when asked. The helper preserves the already-provided Web App settings and writes `firebase-config.js` safely; it does not access a Google login, store private admin credentials or send data to a server. Python 3 required. Alternatively, manually edit `firebase-config.js` using the README template.

**Do not** paste Firebase *Admin SDK private keys* or service account JSON here. The browser Web App config (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`) is intentionally public.

## 3) Put it on the web (GitHub Pages)

1. Create a **public** repository named `MuseSink` via GitHub Desktop/GitHub and publish it.
2. Use **`INSTALL_TO_GITHUB.bat`**: paste the path GitHub Desktop opens using *Repository > Show in Explorer*.
3. Commit + **Push origin** in GitHub Desktop.
4. On GitHub, open repo > **Settings > Pages** > Source: **Deploy from a branch**, Branch: **main**, Folder: **/(root)** > Save.
5. Your website link takes the form `https://YOUR-USERNAME.github.io/MuseSink/`. On **Authentication > Settings > Authorized domains**, add `YOUR-USERNAME.github.io` if Firebase requires it (also include `localhost` for local tests as needed).
6. Open the public site on two different computers. It must show **LIVE SYNC**, not **LOCAL DEMO** or **ONLINE FAILED**.

You can use Firebase Hosting instead if you already know its setup: publish this directory as static site assets, configure Hosting's `public` directory, and deploy. Do not use GitHub pages on a private repository unless your plan supports it.

## 4) Invite your friends

* Type a nickname and press **CREATE A ROOM**.
* Copy the invite URL to Discord.
* Every listener opens the link, joins, and clicks **ENABLE MY AUDIO** once.
* The DJ adds YouTube URLs and controls play/pause/scrub/skip/game profile. Anyone in the room may **TAKE THE AUX**.
* Each game has its own queue. Listeners get their own volume slider.

## Troubleshooting

* **LOCAL DEMO**: `firebase-config.js` has no config or you're opening an older cached version.
* **ONLINE FAILED / DEMO**: Firebase init error. Check Web config, enable Anonymous Authentication, Realtime Database URL, and authorized domain.
* **PERMISSION_DENIED**: Publish the RTDB rules; check `database.rules.json` is going to **Realtime Database > Rules**, *not Firestore Rules*.
* **Two computers cannot join**: Both must load the **same HTTPS site** and show LIVE SYNC, and the invitation must link to the deployed site — **not localhost**.
* **Player is blank / YouTube error**: Try another embeddable video and disable extensions that block embeds. YouTube controls must remain visible. Each user must enable their audio.
* **Occasional differences**: Browser buffering/advertising can prevent perfect sample-level sync. MuseSink prioritizes smoothness over constant seeks.

## What's confirmed / what's pending

Confirmed in a local browser simulation with mocked YouTube embed: create a room, queue tracks, switch between separate game profiles, conservative drift correction, and prevention of repeated automatic seeks; JS syntax checks pass. **Not yet confirmed:** real Firebase multi-device access, GitHub Pages deployment, or actual audio playback from YouTube — those require the owner's Firebase/GitHub settings and an internet-capable browser session.
