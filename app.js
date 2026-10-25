/* MuseSink v2.2 — dependency-free UI, official YouTube IFrame player, optional Firebase RTDB. */
'use strict';
const $ = id => document.getElementById(id);
const GAME_DATA = {
  deadlock: {name:'Deadlock', serial:'CHANNEL 01', title:'Rule the <em>night.</em>', subtitle:'The city never sleeps. Neither does your soundtrack.', caption:'THE CITY IS LISTENING',num:'01'},
  valorant: {name:'Valorant', serial:'CHANNEL 02', title:'LOCK <em>IN.</em>', subtitle:'Every round counts. Make every second sound right.', caption:'FOCUS / EXECUTE / REPEAT',num:'02'},
  repo: {name:'R.E.P.O.',serial:'CHANNEL 03',title:'STAY <em>WEIRD.</em>',subtitle:'Bad decisions. Expensive scrap. Immaculate music taste.',caption:'TRANSMISSION: QUESTIONABLE',num:'03'}
};
const GAMES = Object.keys(GAME_DATA);
const emptyPlayback = () => ({trackId:'',playing:false,position:0,changedAt:0});
const pad = n => String(n).padStart(2,'0');
const clamp = (v,low,high) => Math.min(high,Math.max(low,Number(v)||0));
const randomCode = () => {const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('');};
const randomId = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+'-'+Math.random().toString(36).slice(2);
const safeName = s => String(s||'').trim().slice(0,24) || 'Listener';
const formatTime = s => {s = Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+':'+pad(s%60);};
const getTrackList = (room,game) => Object.entries(room?.profiles?.[game]?.tracks||{}).map(([key,value])=>({...value,key})).sort((a,b)=>(a.addedAt||0)-(b.addedAt||0) || a.key.localeCompare(b.key));
function parseYouTube(input){
  let value=String(input||'').trim();
  if(/^[\w-]{11}$/.test(value))return value;
  try{
    const url=new URL(value.startsWith('http')?value:'https://'+value);
    const host=url.hostname.toLowerCase();let id='';
    if(host==='youtu.be'||host==='www.youtu.be')id=url.pathname.split('/')[1]||'';
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
      if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
      else if(/^\/(shorts|live|embed|v)\//.test(url.pathname))id=url.pathname.split('/')[2]||'';
    }
    return /^[\w-]{11}$/.test(id)?id:null;
  }catch{return null;}
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function createRoomData(uid,name,remote){
  const profiles={};for(const game of GAMES)profiles[game]={playback:emptyPlayback()};
  return {meta:{game:'deadlock',createdBy:uid,djId:uid,createdAt:remote?firebase.database.ServerValue.TIMESTAMP:Date.now()},profiles,members:{[uid]:{name,joinedAt:remote?firebase.database.ServerValue.TIMESTAMP:Date.now()}}};
}
const app={store:null,room:null,code:null,profile:'deadlock',name:'Listener',armed:false,player:null,playerReady:false,loadedVideoId:null,localVideoTitle:'',serverOffset:0,seekPreview:false,toastTimeout:null,autoNextAt:0,busy:false,watchOff:null,gameWas:null,lastSyncTarget:null,playbackKey:null,syncState:null,roomSyncAt:0,networkConnected:true,playbackDebug:false};

/* Standalone demo backend: tabs share state through BroadcastChannel/localStorage. */
class LocalStore{
  constructor(){this.remote=false;this.uid=sessionStorage.getItem('musesink-demo-uid')||'demo-'+randomId();sessionStorage.setItem('musesink-demo-uid',this.uid);this.listeners=new Map();this.channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('musesink-demo'):null;this.channel?.addEventListener('message',e=>this.emit(e.data?.code));window.addEventListener('storage',e=>{if(e.key?.startsWith('musesink-room-'))this.emit(e.key.slice(14));});}
  key(code){return 'musesink-room-'+code;}
  read(code){try{return JSON.parse(localStorage.getItem(this.key(code))||'null');}catch{return null;}}
  write(code,data){localStorage.setItem(this.key(code),JSON.stringify(data));this.emit(code);this.channel?.postMessage({code});}
  emit(code){if(!code)return;for(const cb of this.listeners.get(code)||[])cb(this.read(code));}
  async create(name){let code;do{code=randomCode();}while(this.read(code));this.write(code,createRoomData(this.uid,name,false));return code;}
  async join(code,name){const room=this.read(code);if(!room)throw Error('Room not found on this device. Online rooms need Firebase setup.');room.members ||= {};room.members[this.uid]={name,joinedAt:Date.now()};this.write(code,room);}
  subscribe(code,fn){if(!this.listeners.has(code))this.listeners.set(code,new Set());this.listeners.get(code).add(fn);fn(this.read(code));return()=>this.listeners.get(code)?.delete(fn);}
  async update(code,changes){const room=this.read(code);if(!room)throw Error('Room no longer exists.');for(const [path,value] of Object.entries(changes)){const segments=path.split('/');let dest=room;for(let i=0;i<segments.length-1;i++)dest=dest[segments[i]] ||= {};const key=segments.at(-1);if(value===null)delete dest[key];else dest[key]=value==='SERVER_TIMESTAMP'?Date.now():value;}this.write(code,room);}
  async addTrack(code,game,track){const key='trk-'+randomId().replaceAll('-','').slice(0,22);await this.update(code,{[`profiles/${game}/tracks/${key}`]:{...track,addedAt:Date.now()}});return key;}
  async leave(code){const room=this.read(code);if(room?.members?.[this.uid])await this.update(code,{[`members/${this.uid}`]:null});}
  now(){return Date.now();}
}
/* Firebase stores a few JSON fields only — video/audio is served by YouTube, not MuseSink. */
class FirebaseStore{
  constructor(){this.remote=true;this.db=firebase.database();this.uid=firebase.auth().currentUser.uid;this.offset=0;this.db.ref('.info/serverTimeOffset').on('value',s=>{this.offset=Number(s.val())||0;});this.db.ref('.info/connected').on('value',s=>{app.networkConnected=!!s.val();$('connectionLabel').textContent=app.networkConnected?'LIVE SYNC':'RECONNECTING';$('footerMode').textContent=app.networkConnected?'FIREBASE CONNECTED':'WAITING FOR NETWORK';});}
  ref(code,path=''){return this.db.ref('musesinkRooms/'+code+(path?'/'+path:''));}
  async create(name){let code;for(let attempts=0;attempts<7;attempts++){code=randomCode();const created=await this.ref(code).transaction(current=>current===null?createRoomData(this.uid,name,true):undefined,undefined,false);if(created.committed){await this.registerDisconnect(code);return code;}}throw Error('Could not reserve a room code. Try again.');}
  async registerDisconnect(code){try{await this.ref(code,'members/'+this.uid).onDisconnect().remove();}catch(e){console.warn('Disconnect cleanup unavailable',e);}}
  async join(code,name){const snap=await this.ref(code).once('value');if(!snap.exists())throw Error('Room not found. Check the invite code.');await this.ref(code,'members/'+this.uid).set({name,joinedAt:firebase.database.ServerValue.TIMESTAMP});await this.registerDisconnect(code);}
  subscribe(code,fn){const ref=this.ref(code);const cb=s=>fn(s.val());const err=e=>toast('Live sync lost: '+e.message);ref.on('value',cb,err);return()=>ref.off('value',cb);}
  async update(code,changes){const patch={};for(const [key,value] of Object.entries(changes))patch[key]=value==='SERVER_TIMESTAMP'?firebase.database.ServerValue.TIMESTAMP:value;await this.ref(code).update(patch);}
  async addTrack(code,game,track){const child=this.ref(code,`profiles/${game}/tracks`).push();await child.set({...track,addedAt:firebase.database.ServerValue.TIMESTAMP});return child.key;}
  async leave(code){await this.ref(code,'members/'+this.uid).remove().catch(()=>{});await this.ref(code,'members/'+this.uid).onDisconnect().cancel().catch(()=>{});}
  now(){return Date.now()+this.offset;}
}
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Cannot load '+src));document.head.appendChild(s);});}
async function initStore(){
  const config=window.MUSE_FIREBASE_CONFIG;
  app.playbackDebug=new URL(location.href).searchParams.get('debug')==='1';
  if(config?.apiKey&&config?.databaseURL&&config?.projectId){
    try{
      for(const name of ['firebase-app-compat','firebase-auth-compat','firebase-database-compat'])await loadScript(`https://www.gstatic.com/firebasejs/11.10.0/${name}.js`);
      if(!firebase.apps.length)firebase.initializeApp(config);
      await firebase.auth().signInAnonymously();
      app.store=new FirebaseStore();
      $('demoNotice').hidden=true;$('connectionLabel').textContent='LIVE SYNC';$('footerMode').textContent='FIREBASE CONNECTED';
      toast('Online rooms enabled.');return;
    }catch(e){console.error('Firebase init failed',e);$('demoNotice').querySelector('span:nth-child(2)').textContent='Online connection failed: '+(e?.message||'unknown error')+'. Rooms are LOCAL ONLY until Firebase is fixed.';toast('ONLINE FAILED — local demo only. Check Firebase settings.');}
  }
  app.store=new LocalStore();
  if(config?.projectId && !config.databaseURL){
    $('connectionLabel').textContent='DATABASE SETUP NEEDED';
    $('footerMode').textContent='FIREBASE URL MISSING';
    $('demoNotice').querySelector('span:nth-child(2)').textContent='Firebase Web App is configured, but Realtime Database is not connected yet. Create a Realtime Database, publish the supplied rules, and paste its exact database URL into SETUP_LIVE.bat. Until then, rooms work on this browser only.';
  }else{
    $('connectionLabel').textContent=config?.projectId?'ONLINE FAILED / DEMO':'LOCAL DEMO';
    $('footerMode').textContent='LOCAL PREVIEW';
  }
}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(app.toastTimeout);app.toastTimeout=setTimeout(()=>el.classList.remove('visible'),4100);}
function isDJ(){return !!app.room&&app.room.meta?.djId===app.store?.uid;}
function currentPlayback(){return app.room?.profiles?.[app.profile]?.playback||emptyPlayback();}
function nowPos(playback){return clamp((Number(playback?.position)||0)+(playback?.playing?Math.max(0,(app.store.now()-(Number(playback?.changedAt)||app.store.now()))/1000):0),0,86400);}
function currentTrack(){const p=currentPlayback();return getTrackList(app.room,app.profile).find(t=>t.key===p.trackId)||null;}
function isRoomReady(){if(!app.code){toast('Create or join a room first.');return false;}return true;}
function mustDJ(){if(!isRoomReady())return false;if(!isDJ()){toast('Only the DJ controls playback. Use TAKE THE AUX to take over.');return false;}return true;}
function getName(){const value=safeName($('displayName').value);localStorage.setItem('musesink-name',value);return value;}
async function doBusy(fn){if(app.busy)return;app.busy=true;try{await fn();}catch(e){console.error(e);toast(e.message||'Something went wrong.');}finally{app.busy=false;}}
async function connectRoom(code,isNew){
  app.code=code;app.armed=false;app.loadedVideoId=null;app.localVideoTitle='';
  if(app.watchOff)app.watchOff();
  resetPlayerSync();
  const u=new URL(location.href);u.searchParams.set('room',code);history.replaceState({},'',u);
  app.watchOff=app.store.subscribe(code,room=>{if(!room){toast('This room is no longer available.');disconnectUI();return;}app.room=room;render();syncPlayer(false);});
  render();toast(isNew?`Room ${code} created. Send your invite link!`:`Joined room ${code}.`);
}
async function createRoom(){await doBusy(async()=>{app.name=getName();const code=await app.store.create(app.name);await connectRoom(code,true);});}
async function joinRoom(){await doBusy(async()=>{const code=$('joinCode').value.replace(/[^a-zA-Z2-9]/g,'').toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code))throw Error('Enter a valid eight-character room code.');app.name=getName();await app.store.join(code,app.name);await connectRoom(code,false);});}
async function leaveRoom(){if(!app.code)return;const code=app.code;app.watchOff?.();app.watchOff=null;try{await app.store.leave(code);}catch{}disconnectUI();const u=new URL(location.href);u.searchParams.delete('room');history.replaceState({},'',u);toast('You left the room.');}
function disconnectUI(){app.watchOff?.();app.watchOff=null;app.room=null;app.code=null;app.armed=false;app.loadedVideoId=null;app.localVideoTitle='';resetPlayerSync();try{app.player?.stopVideo();}catch{}render();}
function setProfile(game){if(!GAMES.includes(game))return;app.profile=game;document.body.dataset.game=game;const data=GAME_DATA[game];$('heroTitle').innerHTML=data.title;$('heroSubtitle').textContent=data.subtitle;$('heroSerial').textContent=data.serial;$('artNumber').textContent=data.num;$('artCaption').textContent=data.caption;$('queueProfileTag').textContent=data.name.toUpperCase();document.querySelectorAll('[data-game-switch]').forEach(el=>el.classList.toggle(el.classList.contains('profile-item')?'selected':'active',el.dataset.gameSwitch===game));}
async function switchGame(game){if(!GAMES.includes(game)||game===app.profile)return;if(!app.code){setProfile(game);render();return;}if(!mustDJ())return;await doBusy(async()=>{const prev=app.profile;const playback=currentPlayback();const changes={'meta/game':game};if(playback.playing){changes[`profiles/${prev}/playback`]={...playback,playing:false,position:nowPos(playback),changedAt:'SERVER_TIMESTAMP'};}await app.store.update(app.code,changes);toast('Switched to '+GAME_DATA[game].name+'.');});}
async function setPlayback(values){if(!mustDJ())return;const before=currentPlayback();await app.store.update(app.code,{[`profiles/${app.profile}/playback`]:{trackId:before.trackId||'',position:0,playing:false,...values,changedAt:'SERVER_TIMESTAMP'}});}
async function togglePlay(){if(!mustDJ())return;const p=currentPlayback();const song=currentTrack();if(!song){const first=getTrackList(app.room,app.profile)[0];if(!first){toast('Add a YouTube link to the queue first.');return;}await setPlayback({trackId:first.key,playing:true,position:0});return;}await setPlayback({trackId:p.trackId,playing:!p.playing,position:nowPos(p)});}
async function selectTrack(key){if(!mustDJ())return;const song=getTrackList(app.room,app.profile).find(t=>t.key===key);if(!song)return;await setPlayback({trackId:key,position:0,playing:true});}
async function skipTrack(delta){if(!mustDJ())return;const list=getTrackList(app.room,app.profile);if(!list.length)return;const ix=list.findIndex(x=>x.key===currentPlayback().trackId);const target=ix<0?0:(ix+delta+list.length)%list.length;await setPlayback({trackId:list[target].key,position:0,playing:true});}
async function seekTrack(seconds){if(!mustDJ())return;const p=currentPlayback();if(!p.trackId)return;await setPlayback({trackId:p.trackId,position:clamp(seconds,0,86400),playing:p.playing});}
async function addTrack(evt){evt.preventDefault();if(!isRoomReady())return;const id=parseYouTube($('songUrl').value);if(!id){toast('Paste a valid YouTube watch, share, shorts link, or 11-character video ID.');return;}const game=app.profile;const name=app.name;const supplied=$('songTitle').value.trim();await doBusy(async()=>{const key=await app.store.addTrack(app.code,game,{videoId:id,title:supplied||`YouTube · ${id}`,addedBy:name,byUid:app.store.uid});$('songUrl').value='';$('songTitle').value='';toast('Added to the '+GAME_DATA[game].name+' playlist.');const current=app.room?.profiles?.[game]?.playback;if(isDJ()&&!current?.trackId)await setPlayback({trackId:key,position:0,playing:true});});}
async function removeTrack(key){if(!isRoomReady())return;const found=getTrackList(app.room,app.profile).find(t=>t.key===key);if(!found)return;if(!isDJ()&&found.byUid!==app.store.uid){toast('Only the DJ or the person who added this track can remove it.');return;}await doBusy(async()=>{const wasCurrent=currentPlayback().trackId===key;const list=getTrackList(app.room,app.profile).filter(t=>t.key!==key);const changes={[`profiles/${app.profile}/tracks/${key}`]:null};if(wasCurrent)changes[`profiles/${app.profile}/playback`]={...emptyPlayback(),trackId:list[0]?.key||'',changedAt:'SERVER_TIMESTAMP'};await app.store.update(app.code,changes);toast('Track removed.');});}
async function takeAux(){if(!isRoomReady())return;if(isDJ())return;await doBusy(async()=>{await app.store.update(app.code,{'meta/djId':app.store.uid});toast('You are now the DJ.');});}
async function copyInvite(){if(!isRoomReady())return;const url=new URL(location.href);url.searchParams.set('room',app.code);try{await navigator.clipboard.writeText(url.href);toast('Invite link copied. Send it to the boys!');}catch{window.prompt('Copy your MuseSink invite link:',url.href);}}
function renderMembers(){const el=$('memberList');el.replaceChildren();const members=Object.entries(app.room?.members||{});$('memberCount').textContent=`${members.length} / ONLINE`;let dj='No active DJ';for(const [uid,member] of members){const row=document.createElement('div');row.className='member';const avatar=document.createElement('span');avatar.className='member-avatar';avatar.textContent=(member.name||'?')[0].toUpperCase();const label=document.createElement('span');label.textContent=member.name+(uid===app.store.uid?' (you)':'');row.append(avatar,label);if(uid===app.room.meta?.djId){dj=member.name;const star=document.createElement('span');star.className='member-dj';star.textContent='♛ DJ';row.append(star);}el.append(row);}if(app.room?.meta?.djId===app.store.uid)dj=app.name;$('djName').textContent=dj;$('takeDjButton').disabled=isDJ();$('takeDjButton').textContent=isDJ()?'YOU HAVE THE AUX':'TAKE THE AUX';}
function renderQueue(){const list=getTrackList(app.room,app.profile);$('queueCount').textContent=pad(list.length);const el=$('queueList');el.replaceChildren();if(!list.length){const empty=document.createElement('div');empty.className='empty-queue';empty.textContent='Nothing queued for '+GAME_DATA[app.profile].name+' — add the first track.';el.append(empty);return;}const active=currentPlayback().trackId;list.forEach((track,i)=>{const item=document.createElement('div');item.className='queue-item'+(track.key===active?' is-current':'');const index=document.createElement('span');index.className='queue-index';index.textContent=track.key===active?'♫':pad(i+1);const image=document.createElement('img');image.className='queue-thumb';image.src=`https://i.ytimg.com/vi/${encodeURIComponent(track.videoId)}/mqdefault.jpg`;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';const info=document.createElement('div');info.className='queue-info';const title=document.createElement('div');title.className='queue-title';title.textContent=track.title||'Untitled YouTube track';const by=document.createElement('div');by.className='queue-by';by.textContent=track.key===active?'NOW PLAYING · Added by '+(track.addedBy||'Listener'):'Added by '+(track.addedBy||'Listener');info.append(title,by);const actions=document.createElement('div');actions.className='queue-actions';const play=document.createElement('button');play.type='button';play.className='queue-icon-btn';play.title='Play this track for the room';play.setAttribute('aria-label','Play '+(track.title||'track'));play.textContent='▶';play.addEventListener('click',()=>selectTrack(track.key));actions.append(play);if(isDJ()||track.byUid===app.store.uid){const remove=document.createElement('button');remove.type='button';remove.className='queue-icon-btn delete';remove.title='Remove this track';remove.setAttribute('aria-label','Remove '+(track.title||'track'));remove.textContent='×';remove.addEventListener('click',()=>removeTrack(track.key));actions.append(remove);}item.append(index,image,info,actions);el.append(item);});}
function render(){
  const inRoom=!!app.code;const room=app.room;
  if(inRoom&&room){const newGame=GAMES.includes(room.meta?.game)?room.meta.game:'deadlock';if(newGame!==app.profile){try{app.player?.stopVideo();}catch{}app.localVideoTitle='';setProfile(newGame);app.loadedVideoId=null;resetPlayerSync();} }
  $('noRoomPanel').hidden=inRoom;$('activeRoomPanel').hidden=!inRoom;$('roomBadge').textContent=inRoom?'ACTIVE CHANNEL':'NOT CONNECTED';$('roomCodeLabel').textContent=app.code||'--------';$('roomMode').textContent=app.store?.remote?'ONLINE':'LOCAL';
  if(inRoom)renderMembers();for(const game of GAMES)$(game+'Count').textContent=pad(getTrackList(room,game).length);renderQueue();
  const p=currentPlayback();const track=currentTrack();$('currentTitle').textContent=track?(app.localVideoTitle&&app.loadedVideoId===track.videoId?app.localVideoTitle:track.title):'No track selected';$('currentSubtitle').textContent=track?'YouTube · '+GAME_DATA[app.profile].name+' playlist':'Your shared soundtrack starts here.';
  $('playerStatus').textContent=!track?'STANDBY':p.playing?'ON AIR':'PAUSED';$('playButton').textContent=p.playing?'Ⅱ':'▶';$('playButton').setAttribute('aria-label',p.playing?'Pause':'Play');$('videoPlaceholder').hidden=!!track;
  $('armButton').classList.toggle('armed',app.armed);$('armButton').innerHTML=app.armed?'✓ AUDIO ENABLED <small>Playback armed for this tab</small>':'<span>▶</span> ENABLE MY AUDIO <small>Required once per browser session</small>';
  $('syncMarker').textContent=!track?'● IDLE':app.armed?'● SYNCED':'● AUDIO OFF';$('syncMarker').classList.toggle('synced',!!track&&app.armed);
  $('queueHint').textContent=isDJ()?'You control what plays next.':'Add songs — the DJ controls playback.';
}
function renderTimes(){const p=currentPlayback();const track=currentTrack();let duration=0;try{duration=Number(app.player?.getDuration?.())||0;}catch{}if(!track)duration=0;const pos=nowPos(p);if(!app.seekPreview){$('elapsedTime').textContent=formatTime(pos);$('timeline').value=duration?Math.round(clamp(pos/duration,0,1)*1000):0;}$('durationTime').textContent=formatTime(duration);$('timeline').disabled=!duration||!isDJ();}

/* YouTube IFrame API. Each browser streams its own official YouTube embed.
   Only authoritative DJ actions should cause an immediate seek. Background
   drift correction is conservative: sustained drift, cooldowns, and buffering
   grace prevent the notorious "song starts/restarts" playback loop. */
const SYNC = Object.freeze({
  loadGraceMs: 10000,       // Let video initialization, ads, and initial buffering finish.
  resumeGraceMs: 5500,     // Allow player to settle after actual PLAYING events.
  seekCooldownMs: 18000,   // Never seek every polling interval.
  driftSeconds: 7,        // Small network errors are less annoying than interruptions.
  requiredChecks: 2,      // Require consecutive drift checks before correcting.
  pollMs: 4000
});
function freshSyncState(){return {videoId:null,loadedAt:0,playingSince:0,lastSeekAt:0,driftChecks:0,everPlayed:false,desiredPlay:false,lastActionKey:null,armJustHappened:false,loading:false,manualUntil:0,playRequestedAt:0};}
function resetPlayerSync(){app.syncState=freshSyncState();app.playbackKey=null;}
resetPlayerSync();
function traceSync(...args){if(app.playbackDebug)console.debug('[MuseSink sync]',...args);}
function videoState(){try{return app.player?.getPlayerState?.() ?? -1;}catch{return -1;}}
function isYoutubeBuffering(state){return state===YT.PlayerState.BUFFERING||state===YT.PlayerState.UNSTARTED;}
function safePosition(){try{return Number(app.player?.getCurrentTime?.())||0;}catch{return 0;}}
function seekPlayer(target,reason){
  try{
    app.player.seekTo(target,true);
    app.syncState.lastSeekAt=Date.now();
    app.syncState.driftChecks=0;
    traceSync('seek',reason,'to',target.toFixed(1));
  }catch(e){console.warn('MuseSink seek unavailable',e);}
}
function initPlayer(){
  if(app.player)return;
  app.player=new YT.Player('youtubePlayer',{width:'100%',height:'100%',playerVars:{playsinline:1,controls:1,rel:0,origin:location.origin.startsWith('http')?location.origin:undefined},events:{
    onReady:()=>{app.playerReady=true;try{app.player.setVolume(Number($('volume').value));}catch{}syncPlayer(false);},
    onStateChange:event=>{
      const s=app.syncState;
      if(event.data===YT.PlayerState.PLAYING){
        s.playRequestedAt=Date.now();
        if(!s.everPlayed)s.playingSince=Date.now();
        else if(!s.playingSince)s.playingSince=Date.now();
        s.everPlayed=true;s.loading=false;
        readNativeTitle();
      }else if(event.data===YT.PlayerState.BUFFERING){s.driftChecks=0;}
      else if(event.data===YT.PlayerState.ENDED){
        if(isDJ()&&currentPlayback().playing&&Date.now()-app.autoNextAt>4500){
          app.autoNextAt=Date.now();skipTrack(1).catch(console.error);
        }
      }
    },
    onError:event=>{toast('YouTube cannot play this video in the embedded player (error '+event.data+'). Try another link.');}
  }});
}
function readNativeTitle(){
  try{
    const details=app.player.getVideoData();const track=currentTrack();
    if(details?.title&&track&&details.video_id===track.videoId){
      app.localVideoTitle=details.title;$('currentTitle').textContent=details.title;
      if(isDJ()&&track.title===`YouTube · ${track.videoId}`){
        app.store.update(app.code,{[`profiles/${app.profile}/tracks/${track.key}/title`]:details.title.slice(0,110)}).catch(()=>{});
      }
    }
  }catch{}
}
function syncPlayer(manual=false){
  if(!app.playerReady||!app.store||!app.syncState)return;
  const p=currentPlayback(),track=currentTrack(),s=app.syncState;
  if(!track){
    if(app.loadedVideoId){try{app.player.stopVideo();}catch{}}
    app.loadedVideoId=null;app.localVideoTitle='';resetPlayerSync();return;
  }
  const target=nowPos(p),now=Date.now();
  const actionKey=[app.profile,p.trackId,p.changedAt,p.position,p.playing].join('|');
  const newAction=app.playbackKey!==actionKey;
  if(newAction){traceSync('DJ action',actionKey);app.playbackKey=actionKey;}
  const newlyLoaded=app.loadedVideoId!==track.videoId;
  if(newlyLoaded){
    app.loadedVideoId=track.videoId;app.localVideoTitle='';
    resetPlayerSync();app.playbackKey=actionKey;
    Object.assign(app.syncState,{videoId:track.videoId,loadedAt:now,loading:true,desiredPlay:p.playing});
    try{
      // With no user gesture, cue rather than autoplay. YouTube autoplay
      // requires every listener to press ENABLE MY AUDIO once.
      if(app.armed&&p.playing)app.player.loadVideoById({videoId:track.videoId,startSeconds:target});
      else app.player.cueVideoById({videoId:track.videoId,startSeconds:target});
      traceSync('load',track.videoId,'at',target.toFixed(1));
    }catch(e){console.warn('YouTube load failed',e);}
    return;
  }
  const state=videoState(),buffering=isYoutubeBuffering(state);
  const current=safePosition();
  if(!app.armed){
    if(state===YT.PlayerState.PLAYING){try{app.player.pauseVideo();}catch{}}
    return;
  }
  if(newAction){
    s.driftChecks=0;
    const wasPlaying=s.desiredPlay;
    s.desiredPlay=!!p.playing;
    // On a deliberate seek, replay, or queue switch within the same video,
    // follow the DJ immediately. Plain play/pause should NOT rewind.
    const bigJump=Math.abs(current-target)>2.5;
    const pauseOrResume=(wasPlaying!==!!p.playing);
    if(!newlyLoaded&&bigJump&&(!pauseOrResume||(!p.playing&&current-target>4))){
      seekPlayer(target,'DJ command');
      s.manualUntil=now+SYNC.resumeGraceMs;
    }
  }
  if(p.playing){
    // During initial buffering, pause/play thrashing restarts YouTube.
    if(state===YT.PlayerState.CUED||state===YT.PlayerState.PAUSED||(state===YT.PlayerState.UNSTARTED&&now-s.playRequestedAt>12000)||(state===YT.PlayerState.ENDED&&newAction)){
      if(now-s.playRequestedAt>1300){s.playRequestedAt=now;try{app.player.playVideo();}catch{}}
    }
  }else{
    if(state===YT.PlayerState.PLAYING){try{app.player.pauseVideo();}catch{}}
    // Paused times align on explicit DJ changes, never periodic polling.
  }
  if(manual){
    if(!buffering){seekPlayer(target,'listener manual sync');s.manualUntil=now+SYNC.resumeGraceMs;}
    else toast('YouTube is buffering. Retry sync once playback resumes.');
    return;
  }
  if(!p.playing||state!==YT.PlayerState.PLAYING||buffering){s.driftChecks=0;return;}
  // No periodic correction during playback startup, ads, or after a manual command.
  if(now-s.loadedAt<SYNC.loadGraceMs || !s.playingSince || now-s.playingSince<SYNC.resumeGraceMs || now-s.lastSeekAt<SYNC.seekCooldownMs || now<s.manualUntil){s.driftChecks=0;return;}
  const drift=Math.abs(current-target);
  if(drift>SYNC.driftSeconds){
    s.driftChecks++;
    traceSync('drift',drift.toFixed(1),s.driftChecks);
    if(s.driftChecks>=SYNC.requiredChecks)seekPlayer(target,'sustained drift');
  }else s.driftChecks=0;
}
function armPlayback(){
  if(!app.playerReady){toast('YouTube is still loading or has been blocked by an extension.');return;}
  const firstArm=!app.armed;app.armed=true;
  const p=currentPlayback(),track=currentTrack();
  if(track){
    if(app.loadedVideoId!==track.videoId){syncPlayer(false);}
    else if(p.playing){
      try{app.player.playVideo();}catch{}
      // A newly enabled listener must catch up if they joined late,
      // but only once (no recurring seek loop).
      if(firstArm){
        const position=nowPos(p);const current=safePosition();
        if(Math.abs(current-position)>4&&videoState()!==YT.PlayerState.BUFFERING){seekPlayer(position,'initial catch-up');}
      }
    }
  }
  render();toast('Audio enabled — following the room.');
}
function setupUI(){
  $('displayName').value=localStorage.getItem('musesink-name')||'';
  $('volume').value=localStorage.getItem('musesink-volume')||65;
  const urlCode=new URL(location.href).searchParams.get('room');if(urlCode)$('joinCode').value=urlCode.toUpperCase();
  $('createRoomButton').addEventListener('click',createRoom);$('joinRoomButton').addEventListener('click',joinRoom);$('joinCode').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom();});
  $('leaveRoomButton').addEventListener('click',leaveRoom);$('copyInviteButton').addEventListener('click',copyInvite);$('takeDjButton').addEventListener('click',takeAux);
  document.querySelectorAll('[data-game-switch]').forEach(button=>button.addEventListener('click',()=>switchGame(button.dataset.gameSwitch)));
  $('addForm').addEventListener('submit',addTrack);$('playButton').addEventListener('click',()=>togglePlay().catch(e=>toast(e.message)));$('previousButton').addEventListener('click',()=>skipTrack(-1).catch(e=>toast(e.message)));$('nextButton').addEventListener('click',()=>skipTrack(1).catch(e=>toast(e.message)));
  $('resyncButton').addEventListener('click',()=>{syncPlayer(true);});
  $('armButton').addEventListener('click',armPlayback);
  $('volume').addEventListener('input',e=>{const value=Number(e.target.value);localStorage.setItem('musesink-volume',value);try{app.player?.setVolume(value);}catch{}});
  $('timeline').addEventListener('input',e=>{app.seekPreview=true;let duration=0;try{duration=app.player?.getDuration?.()||0;}catch{}$('elapsedTime').textContent=formatTime(duration*Number(e.target.value)/1000);});
  $('timeline').addEventListener('change',e=>{app.seekPreview=false;let duration=0;try{duration=app.player?.getDuration?.()||0;}catch{}seekTrack(duration*Number(e.target.value)/1000).catch(x=>toast(x.message));});
  $('noticeDismiss').addEventListener('click',()=>{$('demoNotice').hidden=true;});
  $('helpButton').addEventListener('click',()=>{$('helpModeText').textContent=app.store.remote?'You are in online mode: other devices can join via the invite link.':'You are in local demo mode: separate computers cannot join until Firebase is configured. See README.md.';$('helpDialog').showModal();});
  $('closeHelp').addEventListener('click',()=>$('helpDialog').close());$('closeHelpBottom').addEventListener('click',()=>$('helpDialog').close());
  $('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog'))$('helpDialog').close();});
  window.addEventListener('focus',()=>syncPlayer(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncPlayer(false);});
  window.onYouTubeIframeAPIReady=initPlayer;
  loadScript('https://www.youtube.com/iframe_api').catch(()=>toast('YouTube player unavailable. Check your internet or extensions.'));
  setInterval(()=>{renderTimes();},1000);setInterval(()=>{syncPlayer(false);},SYNC.pollMs);
}
(async()=>{setupUI();setProfile('deadlock');await initStore();render();if(new URL(location.href).searchParams.has('room'))toast('Invite detected — enter a display name and press JOIN.');})();
