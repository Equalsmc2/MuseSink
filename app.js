/* MuseSink v2.4 — single-queue RGB edition. */
'use strict';

const $ = id => document.getElementById(id);
const QUEUE_SLOT = 'deadlock';
const pad = n => String(n).padStart(2, '0');
const clamp = (v, low, high) => Math.min(high, Math.max(low, Number(v) || 0));
const randomId = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
const randomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
};
const safeName = value => String(value || '').trim().slice(0, 24) || 'Listener';
const formatTime = seconds => {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0));
  return Math.floor(seconds / 60) + ':' + pad(seconds % 60);
};
const emptyPlayback = () => ({ trackId: '', playing: false, position: 0, changedAt: 0 });
const thumbUrl = videoId => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

function parseYouTube(input) {
  const value = String(input || '').trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value.startsWith('http') ? value : 'https://' + value);
    const host = url.hostname.toLowerCase();
    let id = '';
    if (host === 'youtu.be' || host === 'www.youtu.be') id = url.pathname.split('/')[1] || '';
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(shorts|live|embed|v)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
    }
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function createRoomData(uid, name, remote) {
  return {
    meta: {
      game: 'deadlock',
      createdBy: uid,
      djId: uid,
      createdAt: remote ? firebase.database.ServerValue.TIMESTAMP : Date.now()
    },
    profiles: {
      [QUEUE_SLOT]: {
        playback: emptyPlayback(),
        tracks: {}
      }
    },
    members: {
      [uid]: {
        name,
        joinedAt: remote ? firebase.database.ServerValue.TIMESTAMP : Date.now()
      }
    }
  };
}

const app = {
  store: null,
  room: null,
  code: '',
  name: '',
  armed: false,
  player: null,
  playerReady: false,
  loadedVideoId: null,
  localVideoTitle: '',
  seekPreview: false,
  watchOff: null,
  autoNextAt: 0,
  networkConnected: true,
  playbackDebug: new URL(location.href).searchParams.get('debug') === '1',
  playbackKey: null,
  syncState: null,
  themeCache: new Map(),
  noticeDismissed: false,
  activeCoverId: ''
};

class LocalStore {
  constructor() {
    this.remote = false;
    this.uid = sessionStorage.getItem('musesink-demo-uid') || 'demo-' + randomId();
    sessionStorage.setItem('musesink-demo-uid', this.uid);
    this.listeners = new Map();
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('musesink-demo') : null;
    this.channel?.addEventListener('message', e => this.emit(e.data?.code));
    window.addEventListener('storage', e => { if (e.key?.startsWith('musesink-room-')) this.emit(e.key.slice(14)); });
  }
  key(code) { return 'musesink-room-' + code; }
  read(code) { try { return JSON.parse(localStorage.getItem(this.key(code)) || 'null'); } catch { return null; } }
  write(code, data) {
    localStorage.setItem(this.key(code), JSON.stringify(data));
    this.emit(code);
    this.channel?.postMessage({ code });
  }
  emit(code) {
    if (!code) return;
    for (const cb of this.listeners.get(code) || []) cb(this.read(code));
  }
  async create(name) {
    let code;
    do { code = randomCode(); } while (this.read(code));
    this.write(code, createRoomData(this.uid, name, false));
    return code;
  }
  async join(code, name) {
    const room = this.read(code);
    if (!room) throw Error('Room not found on this device. Online rooms need Firebase setup.');
    room.members ||= {};
    room.members[this.uid] = { name, joinedAt: Date.now() };
    this.write(code, room);
  }
  subscribe(code, fn) {
    if (!this.listeners.has(code)) this.listeners.set(code, new Set());
    this.listeners.get(code).add(fn);
    fn(this.read(code));
    return () => this.listeners.get(code)?.delete(fn);
  }
  async update(code, changes) {
    const room = this.read(code);
    if (!room) throw Error('Room no longer exists.');
    for (const [path, value] of Object.entries(changes)) {
      const segments = path.split('/');
      let dest = room;
      for (let i = 0; i < segments.length - 1; i++) dest = dest[segments[i]] ||= {};
      const key = segments.at(-1);
      if (value === null) delete dest[key];
      else dest[key] = value === 'SERVER_TIMESTAMP' ? Date.now() : value;
    }
    this.write(code, room);
  }
  async addTrack(code, game, track) {
    const key = 'trk-' + randomId().replaceAll('-', '').slice(0, 22);
    await this.update(code, { [`profiles/${game}/tracks/${key}`]: { ...track, addedAt: Date.now() } });
    return key;
  }
  async leave(code) {
    const room = this.read(code);
    if (room?.members?.[this.uid]) await this.update(code, { [`members/${this.uid}`]: null });
  }
  now() { return Date.now(); }
}

class FirebaseStore {
  constructor() {
    this.remote = true;
    this.db = firebase.database();
    this.uid = firebase.auth().currentUser.uid;
    this.offset = 0;
    this.db.ref('.info/serverTimeOffset').on('value', s => { this.offset = Number(s.val()) || 0; });
    this.db.ref('.info/connected').on('value', s => {
      app.networkConnected = !!s.val();
      $('connectionLabel').textContent = app.networkConnected ? 'LIVE SYNC' : 'RECONNECTING';
      $('modeLabel').textContent = app.networkConnected ? 'FIREBASE CONNECTED' : 'WAITING FOR NETWORK';
    });
  }
  ref(code, path = '') { return this.db.ref('musesinkRooms/' + code + (path ? '/' + path : '')); }
  async create(name) {
    let code;
    for (let attempt = 0; attempt < 7; attempt++) {
      code = randomCode();
      const created = await this.ref(code).transaction(current => current === null ? createRoomData(this.uid, name, true) : undefined, undefined, false);
      if (created.committed) {
        await this.registerDisconnect(code);
        return code;
      }
    }
    throw Error('Could not reserve a room code. Try again.');
  }
  async registerDisconnect(code) {
    try { await this.ref(code, 'members/' + this.uid).onDisconnect().remove(); }
    catch (error) { console.warn('Disconnect cleanup unavailable', error); }
  }
  async join(code, name) {
    const snap = await this.ref(code).once('value');
    if (!snap.exists()) throw Error('Room not found. Check the invite code.');
    await this.ref(code, 'members/' + this.uid).set({ name, joinedAt: firebase.database.ServerValue.TIMESTAMP });
    await this.registerDisconnect(code);
  }
  subscribe(code, fn) {
    const ref = this.ref(code);
    const cb = snap => fn(snap.val());
    const err = error => toast('Live sync lost: ' + error.message);
    ref.on('value', cb, err);
    return () => ref.off('value', cb);
  }
  async update(code, changes) {
    const patch = {};
    for (const [key, value] of Object.entries(changes)) patch[key] = value === 'SERVER_TIMESTAMP' ? firebase.database.ServerValue.TIMESTAMP : value;
    await this.ref(code).update(patch);
  }
  async addTrack(code, game, track) {
    const child = this.ref(code, `profiles/${game}/tracks`).push();
    await child.set({ ...track, addedAt: firebase.database.ServerValue.TIMESTAMP });
    return child.key;
  }
  async leave(code) {
    await this.ref(code, 'members/' + this.uid).remove().catch(() => {});
    await this.ref(code, 'members/' + this.uid).onDisconnect().cancel().catch(() => {});
  }
  now() { return Date.now() + this.offset; }
}

function traceSync(...args) {
  if (app.playbackDebug) console.debug('[MuseSink sync]', ...args);
}
function currentProfile(room = app.room) {
  return room?.profiles?.[QUEUE_SLOT] || { playback: emptyPlayback(), tracks: {} };
}
function currentPlayback(room = app.room) {
  return currentProfile(room).playback || emptyPlayback();
}
function trackList(room = app.room) {
  return Object.entries(currentProfile(room).tracks || {}).map(([key, value]) => ({ ...value, key }))
    .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0) || String(a.key).localeCompare(String(b.key)));
}
function currentTrack(room = app.room) {
  const playback = currentPlayback(room);
  return trackList(room).find(track => track.key === playback.trackId) || null;
}
function roomMembers(room = app.room) {
  return Object.entries(room?.members || {}).map(([uid, member]) => ({ uid, ...(member || {}) }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0) || String(a.name || '').localeCompare(String(b.name || '')));
}
function isDJ() {
  return !!app.room && app.room?.meta?.djId === app.store?.uid;
}
function nowPos(playback = currentPlayback()) {
  if (!playback?.trackId) return 0;
  if (!playback.playing) return Number(playback.position) || 0;
  const now = app.store?.now?.() || Date.now();
  return Math.max(0, (Number(playback.position) || 0) + Math.max(0, now - (Number(playback.changedAt) || 0)) / 1000);
}
function setUrlRoom(code) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code); else url.searchParams.delete('room');
  history.replaceState({}, '', url);
}
function toast(message) {
  const el = $('toast');
  if (!message) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('visible'), 2800);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src === src);
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(Error('Cannot load ' + src)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { script.dataset.loaded = '1'; resolve(); };
    script.onerror = () => reject(Error('Cannot load ' + src));
    document.head.appendChild(script);
  });
}

async function initStore() {
  const config = window.MUSE_FIREBASE_CONFIG;
  if (config?.apiKey && config?.databaseURL && config?.projectId) {
    try {
      for (const name of ['firebase-app-compat', 'firebase-auth-compat', 'firebase-database-compat']) {
        await loadScript(`https://www.gstatic.com/firebasejs/11.10.0/${name}.js`);
      }
      if (!firebase.apps.length) firebase.initializeApp(config);
      await firebase.auth().signInAnonymously();
      app.store = new FirebaseStore();
      $('demoNotice').hidden = true;
      $('connectionLabel').textContent = 'LIVE SYNC';
      $('modeLabel').textContent = 'FIREBASE CONNECTED';
      return;
    } catch (error) {
      console.error('Firebase init failed', error);
      const code = String(error?.code || '');
      const hint = code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid'
        ? 'Firebase rejected the API key. Verify firebase-config.js against Firebase Console → Project settings → Your apps → Config.'
        : code === 'auth/unauthorized-domain'
          ? 'Add this site hostname to Firebase Console → Authentication → Settings → Authorized domains.'
          : 'Online connection failed: ' + (error?.message || 'unknown error') + '.';
      $('demoNotice').querySelector('span:nth-child(2)').textContent = hint + ' Rooms are LOCAL ONLY until Firebase is fixed.';
      toast('ONLINE FAILED — local demo only.');
    }
  }
  app.store = new LocalStore();
  $('connectionLabel').textContent = config?.projectId ? 'ONLINE FAILED / DEMO' : 'LOCAL DEMO';
  $('modeLabel').textContent = config?.projectId ? 'FALLBACK TO LOCAL MODE' : 'LOCAL PREVIEW';
}

const SYNC = Object.freeze({
  loadGraceMs: 3200,
  resumeGraceMs: 5000,
  seekCooldownMs: 6000,
  driftSeconds: 7,
  requiredChecks: 2,
  pollMs: 4000
});
function freshSyncState() {
  return { videoId: null, loadedAt: 0, playingSince: 0, lastSeekAt: 0, driftChecks: 0, desiredPlay: false, manualUntil: 0, playRequestedAt: 0 };
}
function resetPlayerSync() {
  app.syncState = freshSyncState();
  app.playbackKey = null;
}
resetPlayerSync();
function videoState() { try { return app.player?.getPlayerState?.() ?? -1; } catch { return -1; } }
function isYoutubeBuffering(state) { return state === YT.PlayerState.BUFFERING || state === YT.PlayerState.UNSTARTED; }
function safePosition() { try { return Number(app.player?.getCurrentTime?.()) || 0; } catch { return 0; } }
function seekPlayer(target, reason) {
  try {
    app.player.seekTo(target, true);
    app.syncState.lastSeekAt = Date.now();
    app.syncState.driftChecks = 0;
    traceSync('seek', reason, target.toFixed(1));
  } catch (error) {
    console.warn('seek unavailable', error);
  }
}

function initPlayer() {
  if (app.player) return;
  app.player = new YT.Player('youtubePlayer', {
    width: '100%',
    height: '100%',
    playerVars: {
      playsinline: 1,
      controls: 1,
      rel: 0,
      origin: location.origin.startsWith('http') ? location.origin : undefined
    },
    events: {
      onReady: () => {
        app.playerReady = true;
        try { app.player.setVolume(Number($('volume').value)); } catch {}
        syncPlayer(false);
      },
      onStateChange: event => {
        const s = app.syncState;
        if (event.data === YT.PlayerState.PLAYING) {
          if (!s.playingSince) s.playingSince = Date.now();
          s.playRequestedAt = Date.now();
          readNativeTitle();
        } else if (event.data === YT.PlayerState.BUFFERING) {
          s.driftChecks = 0;
        } else if (event.data === YT.PlayerState.ENDED) {
          if (isDJ() && currentPlayback().playing && Date.now() - app.autoNextAt > 4500) {
            app.autoNextAt = Date.now();
            skipTrack(1).catch(err => toast(err.message));
          }
        }
        render();
      },
      onError: event => {
        toast('YouTube cannot play this video in the embedded player (error ' + event.data + '). Try another link.');
      }
    }
  });
}

function readNativeTitle() {
  try {
    const details = app.player.getVideoData();
    const track = currentTrack();
    if (details?.title && track && details.video_id === track.videoId) {
      app.localVideoTitle = details.title;
      if (isDJ() && track.title === `YouTube · ${track.videoId}`) {
        app.store.update(app.code, { [`profiles/${QUEUE_SLOT}/tracks/${track.key}/title`]: details.title.slice(0, 110) }).catch(() => {});
      }
      render();
    }
  } catch {}
}

function syncPlayer(manual = false) {
  if (!app.playerReady || !app.store || !app.syncState) return;
  const playback = currentPlayback();
  const track = currentTrack();
  const s = app.syncState;
  if (!track) {
    if (app.loadedVideoId) { try { app.player.stopVideo(); } catch {} }
    app.loadedVideoId = null;
    app.localVideoTitle = '';
    $('videoPlaceholder').hidden = false;
    resetPlayerSync();
    return;
  }
  const target = nowPos(playback);
  const now = Date.now();
  const actionKey = [QUEUE_SLOT, playback.trackId, playback.changedAt, playback.position, playback.playing].join('|');
  const newAction = app.playbackKey !== actionKey;
  if (newAction) app.playbackKey = actionKey;
  const newlyLoaded = app.loadedVideoId !== track.videoId;
  if (newlyLoaded) {
    app.loadedVideoId = track.videoId;
    app.localVideoTitle = '';
    resetPlayerSync();
    app.playbackKey = actionKey;
    Object.assign(app.syncState, { videoId: track.videoId, loadedAt: now, desiredPlay: playback.playing });
    try {
      if (app.armed && playback.playing) app.player.loadVideoById({ videoId: track.videoId, startSeconds: target });
      else app.player.cueVideoById({ videoId: track.videoId, startSeconds: target });
      $('videoPlaceholder').hidden = true;
    } catch (error) {
      console.warn('YouTube load failed', error);
    }
    return;
  }
  const state = videoState();
  const buffering = isYoutubeBuffering(state);
  const current = safePosition();
  if (!app.armed) {
    if (state === YT.PlayerState.PLAYING) { try { app.player.pauseVideo(); } catch {} }
    return;
  }
  if (newAction) {
    const wasPlaying = s.desiredPlay;
    s.desiredPlay = !!playback.playing;
    const bigJump = Math.abs(current - target) > 2.5;
    const pauseOrResume = wasPlaying !== !!playback.playing;
    if (!newlyLoaded && bigJump && (!pauseOrResume || (!playback.playing && current - target > 4))) {
      seekPlayer(target, 'DJ command');
      s.manualUntil = now + SYNC.resumeGraceMs;
    }
  }
  if (playback.playing) {
    if (state === YT.PlayerState.CUED || state === YT.PlayerState.PAUSED || (state === YT.PlayerState.UNSTARTED && now - s.playRequestedAt > 12000) || (state === YT.PlayerState.ENDED && newAction)) {
      if (now - s.playRequestedAt > 1300) {
        s.playRequestedAt = now;
        try { app.player.playVideo(); } catch {}
      }
    }
  } else if (state === YT.PlayerState.PLAYING) {
    try { app.player.pauseVideo(); } catch {}
  }
  if (manual) {
    if (!buffering) {
      seekPlayer(target, 'manual sync');
      s.manualUntil = now + SYNC.resumeGraceMs;
      toast('Resynced with room.');
    } else toast('YouTube is buffering. Retry sync once playback resumes.');
    return;
  }
  if (!playback.playing || state !== YT.PlayerState.PLAYING || buffering) { s.driftChecks = 0; return; }
  if (now - s.loadedAt < SYNC.loadGraceMs || !s.playingSince || now - s.playingSince < SYNC.resumeGraceMs || now - s.lastSeekAt < SYNC.seekCooldownMs || now < s.manualUntil) {
    s.driftChecks = 0;
    return;
  }
  const drift = Math.abs(current - target);
  if (drift > SYNC.driftSeconds) {
    s.driftChecks++;
    if (s.driftChecks >= SYNC.requiredChecks) seekPlayer(target, 'sustained drift');
  } else s.driftChecks = 0;
}

function armPlayback() {
  if (!app.playerReady) { toast('YouTube is still loading or blocked by an extension.'); return; }
  const firstArm = !app.armed;
  app.armed = true;
  const playback = currentPlayback();
  const track = currentTrack();
  if (track) {
    if (app.loadedVideoId !== track.videoId) syncPlayer(false);
    else if (playback.playing) {
      try { app.player.playVideo(); } catch {}
      if (firstArm) {
        const position = nowPos(playback);
        const current = safePosition();
        if (Math.abs(current - position) > 4 && videoState() !== YT.PlayerState.BUFFERING) seekPlayer(position, 'initial catch-up');
      }
    }
  }
  render();
  toast('Audio enabled — following the room.');
}

function requireRoom() {
  if (!app.code || !app.room) throw Error('Create or join a room first.');
}
function requireDJ() {
  if (!isDJ()) throw Error('Only the current DJ can do that.');
}

async function connectRoom(code) {
  if (app.watchOff) app.watchOff();
  app.code = code;
  setUrlRoom(code);
  app.watchOff = app.store.subscribe(code, room => {
    app.room = room;
    if (!room) {
      toast('Room is no longer available.');
      leaveRoom(true).catch(() => {});
      return;
    }
    render();
    syncPlayer(false);
  });
}

async function createRoom() {
  const name = safeName($('displayName').value);
  localStorage.setItem('musesink-name', name);
  try {
    const code = await app.store.create(name);
    app.name = name;
    await connectRoom(code);
    render();
    toast('Room created. Share the code with the boys.');
  } catch (error) {
    toast(error.message || 'Could not create room.');
  }
}

async function joinRoom() {
  const code = String($('joinCode').value || '').trim().toUpperCase();
  const name = safeName($('displayName').value);
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) { toast('Enter a valid 8-character room code.'); return; }
  localStorage.setItem('musesink-name', name);
  try {
    await app.store.join(code, name);
    app.name = name;
    await connectRoom(code);
    render();
    toast('Joined room ' + code + '.');
  } catch (error) {
    toast(error.message || 'Could not join room.');
  }
}

async function leaveRoom(silent = false) {
  const oldCode = app.code;
  if (app.watchOff) app.watchOff();
  app.watchOff = null;
  try { if (oldCode) await app.store?.leave?.(oldCode); } catch {}
  app.room = null;
  app.code = '';
  setUrlRoom('');
  resetPlayerSync();
  if (app.loadedVideoId) { try { app.player?.stopVideo(); } catch {} }
  app.loadedVideoId = null;
  app.localVideoTitle = '';
  render();
  if (!silent) toast('Left the room.');
}

async function copyInvite() {
  if (!app.code) { toast('Create or join a room first.'); return; }
  const url = new URL(location.href);
  url.searchParams.set('room', app.code);
  const text = `${url.toString()}\nRoom code: ${app.code}`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Invite link copied.');
  } catch {
    toast('Clipboard blocked — copy code ' + app.code + ' manually.');
  }
}

async function takeAux() {
  try {
    requireRoom();
    await app.store.update(app.code, { 'meta/djId': app.store.uid });
    toast('You took the aux.');
  } catch (error) {
    toast(error.message || 'Could not take the aux.');
  }
}

async function addTrack(event) {
  event.preventDefault();
  try {
    requireRoom();
    const videoId = parseYouTube($('songUrl').value);
    if (!videoId) throw Error('Paste a valid YouTube link or 11-character video ID.');
    const title = String($('songTitle').value || '').trim().slice(0, 110) || `YouTube · ${videoId}`;
    const key = await app.store.addTrack(app.code, QUEUE_SLOT, {
      videoId,
      title,
      addedBy: app.name || safeName($('displayName').value),
      byUid: app.store.uid,
      addedAt: 'SERVER_TIMESTAMP'
    });
    const playback = currentPlayback();
    if (!playback.trackId) {
      await app.store.update(app.code, {
        [`profiles/${QUEUE_SLOT}/playback`]: { trackId: key, playing: false, position: 0, changedAt: app.store.now() }
      });
    }
    $('songUrl').value = '';
    $('songTitle').value = '';
    toast('Added to queue.');
  } catch (error) {
    toast(error.message || 'Could not add track.');
  }
}

async function setPlayback(trackId, playing, position = 0) {
  requireRoom();
  requireDJ();
  await app.store.update(app.code, {
    [`profiles/${QUEUE_SLOT}/playback`]: {
      trackId: trackId || '',
      playing: !!playing,
      position: Math.max(0, Number(position) || 0),
      changedAt: app.store.now()
    }
  });
}

function getAdjacentTrack(step) {
  const tracks = trackList();
  const playback = currentPlayback();
  if (!tracks.length) return null;
  const currentIndex = Math.max(0, tracks.findIndex(track => track.key === playback.trackId));
  const nextIndex = clamp(currentIndex + step, 0, tracks.length - 1);
  return tracks[nextIndex] || null;
}

async function togglePlay() {
  requireRoom();
  requireDJ();
  const tracks = trackList();
  if (!tracks.length) throw Error('Add a song first.');
  const playback = currentPlayback();
  const activeTrack = currentTrack() || tracks[0];
  if (!playback.trackId) {
    await setPlayback(activeTrack.key, true, 0);
    return;
  }
  const position = playback.playing ? nowPos(playback) : Number(playback.position) || 0;
  await setPlayback(activeTrack.key, !playback.playing, position);
}

async function seekTrack(position) {
  requireRoom();
  requireDJ();
  const playback = currentPlayback();
  if (!playback.trackId) throw Error('No track selected.');
  await setPlayback(playback.trackId, playback.playing, Math.max(0, position));
}

async function skipTrack(direction = 1) {
  requireRoom();
  requireDJ();
  const tracks = trackList();
  if (!tracks.length) throw Error('Queue is empty.');
  const playback = currentPlayback();
  if (direction < 0 && nowPos(playback) > 5) {
    await setPlayback(playback.trackId, playback.playing, 0);
    return;
  }
  const currentIndex = tracks.findIndex(track => track.key === playback.trackId);
  const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
  const targetIndex = fallbackIndex + direction;
  if (!tracks[targetIndex]) {
    if (direction > 0) {
      await setPlayback(playback.trackId || tracks[fallbackIndex].key, false, 0);
      return;
    }
    await setPlayback(tracks[0].key, playback.playing, 0);
    return;
  }
  await setPlayback(tracks[targetIndex].key, playback.playing, 0);
}

async function playNow(trackKey) {
  try {
    requireRoom();
    requireDJ();
    const track = trackList().find(item => item.key === trackKey);
    if (!track) return;
    await setPlayback(track.key, true, 0);
  } catch (error) {
    toast(error.message || 'Could not switch track.');
  }
}

async function deleteTrack(trackKey) {
  try {
    requireRoom();
    const track = trackList().find(item => item.key === trackKey);
    if (!track) return;
    if (!(isDJ() || track.byUid === app.store.uid)) throw Error('Only the DJ or the person who added it can remove this track.');
    if (!isDJ() && currentPlayback().trackId === trackKey) throw Error('Ask the DJ to remove the currently playing track.');
    const tracks = trackList();
    const currentIndex = tracks.findIndex(item => item.key === trackKey);
    const playback = currentPlayback();
    const updates = { [`profiles/${QUEUE_SLOT}/tracks/${trackKey}`]: null };
    if (playback.trackId === trackKey) {
      const next = tracks[currentIndex + 1] || tracks[currentIndex - 1] || null;
      updates[`profiles/${QUEUE_SLOT}/playback`] = next
        ? { trackId: next.key, playing: playback.playing, position: 0, changedAt: app.store.now() }
        : emptyPlayback();
    }
    await app.store.update(app.code, updates);
    toast('Track removed.');
  } catch (error) {
    toast(error.message || 'Could not remove track.');
  }
}

function renderQueue() {
  const list = $('queueList');
  const tracks = trackList();
  const playback = currentPlayback();
  $('queueCount').textContent = String(tracks.length);
  $('queueCountInline').textContent = String(tracks.length);
  $('queueCountBadge').textContent = `${tracks.length} IN QUEUE`;
  if (!tracks.length) {
    list.innerHTML = '<div class="empty-queue">No tracks yet — drop a link above.</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  tracks.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item' + (track.key === playback.trackId ? ' is-current' : '');
    const thumb = document.createElement('img');
    thumb.className = 'queue-thumb';
    thumb.src = thumbUrl(track.videoId);
    thumb.alt = '';
    const meta = document.createElement('div');
    meta.className = 'queue-meta';
    meta.innerHTML = `
      <div class="queue-title">${escapeHtml(track.title || app.localVideoTitle || 'Untitled track')}</div>
      <div class="queue-by">#${index + 1} · added by ${escapeHtml(track.addedBy || 'Listener')}</div>
    `;
    const side = document.createElement('div');
    side.className = 'queue-side';
    side.innerHTML = `<div class="queue-chip">${track.key === playback.trackId ? (playback.playing ? 'LIVE' : 'PAUSED') : 'UP NEXT'}</div>`;
    const actions = document.createElement('div');
    actions.className = 'queue-actions';
    const playBtn = document.createElement('button');
    playBtn.className = 'queue-icon-btn';
    playBtn.type = 'button';
    playBtn.title = 'Play now';
    playBtn.textContent = '▶';
    playBtn.addEventListener('click', () => playNow(track.key));
    actions.appendChild(playBtn);
    if (isDJ() || track.byUid === app.store?.uid) {
      const delBtn = document.createElement('button');
      delBtn.className = 'queue-icon-btn delete';
      delBtn.type = 'button';
      delBtn.title = 'Remove track';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => deleteTrack(track.key));
      actions.appendChild(delBtn);
    }
    side.appendChild(actions);
    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(side);
    frag.appendChild(item);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

function renderMembers() {
  const list = $('memberList');
  const members = roomMembers();
  $('memberCount').textContent = String(members.length);
  $('memberCountInline').textContent = String(members.length);
  if (!members.length) {
    list.innerHTML = '<div class="empty-queue">Nobody is here yet.</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  members.forEach(member => {
    const row = document.createElement('div');
    row.className = 'member';
    const initial = escapeHtml((member.name || 'L').slice(0, 1).toUpperCase());
    const isCurrentDj = app.room?.meta?.djId === member.uid;
    row.innerHTML = `
      <div class="member-avatar">${initial}</div>
      <div class="member-name">${escapeHtml(member.name || 'Listener')}</div>
      <div class="member-dj">${isCurrentDj ? 'DJ' : ''}</div>
    `;
    frag.appendChild(row);
  });
  list.innerHTML = '';
  list.appendChild(frag);
}

function renderTimes() {
  const track = currentTrack();
  const playback = currentPlayback();
  let duration = 0;
  try { duration = Number(app.player?.getDuration?.()) || 0; } catch {}
  const elapsed = playback.trackId ? nowPos(playback) : 0;
  if (!app.seekPreview) $('elapsedTime').textContent = formatTime(elapsed);
  $('durationTime').textContent = formatTime(duration);
  $('timeline').value = duration > 0 ? String(clamp((elapsed / duration) * 1000, 0, 1000)) : '0';
  $('videoPlaceholder').hidden = !!track;
}

function applyTheme(primary, secondary) {
  document.documentElement.style.setProperty('--accent', primary);
  document.documentElement.style.setProperty('--accent-2', secondary);
  document.documentElement.style.setProperty('--accent-soft', colorAlpha(primary, .22));
  document.documentElement.style.setProperty('--accent-soft-2', colorAlpha(secondary, .18));
}
function colorAlpha(hex, alpha) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = value => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}
async function extractTheme(videoId) {
  if (app.themeCache.has(videoId)) return app.themeCache.get(videoId);
  const fallbackHue = [...videoId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  const fallback = [hslToHex(fallbackHue, 88, 68), hslToHex((fallbackHue + 48) % 360, 92, 64)];
  try {
    const img = await loadImage(thumbUrl(videoId));
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 18;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let best = { sat: 0, lumDist: 0, r: 124, g: 139, b: 255 };
    let ar = 0, ag = 0, ab = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 120) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hsl = rgbToHsl(r, g, b);
      ar += r; ag += g; ab += b; count++;
      const sat = hsl.s;
      const lumDist = Math.abs(hsl.l - 52);
      if (sat + lumDist * .2 > best.sat + best.lumDist * .2) best = { sat, lumDist, r, g, b };
    }
    const avg = count ? { r: ar / count, g: ag / count, b: ab / count } : { r: 90, g: 120, b: 220 };
    const vibrantHsl = rgbToHsl(best.r, best.g, best.b);
    const avgHsl = rgbToHsl(avg.r, avg.g, avg.b);
    const primary = hslToHex(vibrantHsl.h, Math.max(78, vibrantHsl.s), clamp(vibrantHsl.l, 54, 68));
    const secondary = hslToHex((avgHsl.h + 30) % 360, Math.max(76, avgHsl.s), clamp(avgHsl.l, 58, 72));
    const result = [primary, secondary];
    app.themeCache.set(videoId, result);
    return result;
  } catch {
    app.themeCache.set(videoId, fallback);
    return fallback;
  }
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function updateVisualTheme() {
  const track = currentTrack();
  const cover = $('coverImage');
  if (!track) {
    cover.removeAttribute('src');
    cover.style.visibility = 'hidden';
    document.documentElement.style.setProperty('--cover-image', 'none');
    applyTheme('#7c8bff', '#4df0ff');
    app.activeCoverId = '';
    return;
  }
  cover.style.visibility = 'visible';
  const url = thumbUrl(track.videoId);
  cover.src = url;
  document.documentElement.style.setProperty('--cover-image', `url("${url}")`);
  if (app.activeCoverId !== track.videoId) {
    app.activeCoverId = track.videoId;
    const [primary, secondary] = await extractTheme(track.videoId);
    if (currentTrack()?.videoId === track.videoId) applyTheme(primary, secondary);
  }
}

function render() {
  const hasRoom = !!app.code && !!app.room;
  const playback = currentPlayback();
  const track = currentTrack();
  $('copyInviteButton').disabled = !hasRoom;
  $('roomBadge').textContent = hasRoom ? (app.store?.remote ? 'LIVE' : 'LOCAL') : 'OFFLINE';
  $('roomChip').textContent = hasRoom ? `ROOM ${app.code}` : 'ROOM — OFFLINE';
  $('djNameInline').textContent = hasRoom ? (app.room?.members?.[app.room?.meta?.djId]?.name || '—') : '—';
  $('noRoomPanel').hidden = hasRoom;
  $('activeRoomPanel').hidden = !hasRoom;
  $('roomCodeLabel').textContent = hasRoom ? app.code : '--------';
  $('roomMode').textContent = app.store?.remote ? 'LIVE' : 'LOCAL';
  $('modeLabel').textContent = app.store?.remote ? 'FIREBASE CONNECTED' : $('modeLabel').textContent;
  $('takeDjButton').disabled = !hasRoom || isDJ();
  $('playButton').disabled = !hasRoom;
  $('previousButton').disabled = !hasRoom;
  $('nextButton').disabled = !hasRoom;
  $('resyncButton').disabled = !hasRoom;
  $('currentTitle').textContent = track ? (app.localVideoTitle || track.title || 'Untitled track') : 'No track selected';
  $('currentSubtitle').textContent = track ? `Added by ${track.addedBy || 'Listener'} · ${isDJ() ? 'You are the DJ.' : 'Only the DJ controls playback.'}` : 'Paste a YouTube link to kick things off.';
  $('playerStatus').textContent = track ? (playback.playing ? 'ON AIR' : 'PAUSED') : 'STANDBY';
  $('syncMarker').textContent = hasRoom ? (app.store?.remote ? (app.networkConnected ? 'LIVE SYNC' : 'RECONNECTING') : 'LOCAL SYNC') : 'IDLE';
  $('memberCountInline').textContent = String(roomMembers().length);
  renderQueue();
  renderMembers();
  renderTimes();
  updateVisualTheme().catch(() => {});
  if (track) $('videoPlaceholder').hidden = true;
  else $('videoPlaceholder').hidden = false;
  const state = videoState();
  const playingState = window.YT && window.YT.PlayerState ? window.YT.PlayerState.PLAYING : 1;
  $('playButton').textContent = playback.playing && state === playingState ? '❚❚' : '▶';
  $('helpModeText').textContent = app.store?.remote
    ? 'You are in online mode. Share the invite link or room code with your friends.'
    : 'You are in local demo mode. Separate computers need Firebase to stay in sync.';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setupUI() {
  const savedName = localStorage.getItem('musesink-name') || '';
  $('displayName').value = savedName;
  $('volume').value = localStorage.getItem('musesink-volume') || 65;
  const inviteCode = new URL(location.href).searchParams.get('room');
  if (inviteCode) $('joinCode').value = inviteCode.toUpperCase();

  $('createRoomButton').addEventListener('click', createRoom);
  $('joinRoomButton').addEventListener('click', joinRoom);
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  $('leaveRoomButton').addEventListener('click', () => leaveRoom().catch(() => {}));
  $('copyInviteButton').addEventListener('click', copyInvite);
  $('takeDjButton').addEventListener('click', takeAux);
  $('addForm').addEventListener('submit', addTrack);
  $('playButton').addEventListener('click', () => togglePlay().catch(err => toast(err.message)));
  $('previousButton').addEventListener('click', () => skipTrack(-1).catch(err => toast(err.message)));
  $('nextButton').addEventListener('click', () => skipTrack(1).catch(err => toast(err.message)));
  $('resyncButton').addEventListener('click', () => syncPlayer(true));
  $('armButton').addEventListener('click', armPlayback);
  $('volume').addEventListener('input', event => {
    const value = Number(event.target.value);
    localStorage.setItem('musesink-volume', String(value));
    try { app.player?.setVolume(value); } catch {}
  });
  $('timeline').addEventListener('input', event => {
    app.seekPreview = true;
    let duration = 0;
    try { duration = app.player?.getDuration?.() || 0; } catch {}
    $('elapsedTime').textContent = formatTime(duration * Number(event.target.value) / 1000);
  });
  $('timeline').addEventListener('change', event => {
    app.seekPreview = false;
    let duration = 0;
    try { duration = app.player?.getDuration?.() || 0; } catch {}
    seekTrack(duration * Number(event.target.value) / 1000).catch(err => toast(err.message));
  });
  $('noticeDismiss').addEventListener('click', () => { $('demoNotice').hidden = true; app.noticeDismissed = true; });
  $('helpButton').addEventListener('click', () => $('helpDialog').showModal());
  $('closeHelp').addEventListener('click', () => $('helpDialog').close());
  $('closeHelpBottom').addEventListener('click', () => $('helpDialog').close());
  $('helpDialog').addEventListener('click', event => { if (event.target === $('helpDialog')) $('helpDialog').close(); });

  window.onYouTubeIframeAPIReady = initPlayer;
  loadScript('https://www.youtube.com/iframe_api').catch(() => toast('YouTube player unavailable. Check your internet or extensions.'));
  window.addEventListener('focus', () => syncPlayer(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncPlayer(false); });
  setInterval(renderTimes, 1000);
  setInterval(() => syncPlayer(false), SYNC.pollMs);
}

(async () => {
  setupUI();
  await initStore();
  render();
  if (new URL(location.href).searchParams.has('room')) toast('Invite detected — enter a display name and press JOIN.');
})();
