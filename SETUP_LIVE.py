#!/usr/bin/env python3
"""Complete the Firebase web configuration without reentering supplied fields."""
import json, pathlib, re, sys
path = pathlib.Path(__file__).resolve().parent / 'firebase-config.js'
content=path.read_text(encoding='utf-8')
m=re.search(r'window\.MUSE_FIREBASE_CONFIG\s*=\s*(\{.*?\})\s*;',content,re.S)
if not m:
    print('ERROR: No preconfigured Firebase Web App found. See README.md');sys.exit(1)
config=json.loads(m.group(1))
print('=== MuseSink: Connect Realtime Database ===')
print('Your Firebase Web App settings are ALREADY filled in.')
print('Project:',config.get('projectId'))
print('Open Firebase Console > Build > Realtime Database > Create database.')
print('Choose Locked mode and publish database.rules.json in Realtime Database > Rules.')
print('Copy the exact database URL shown in the Data tab. Do not use a Firestore URL.')
print('Sample shape ONLY: https://example-default-rtdb.firebaseio.com')
print('')
old=config.get('databaseURL','')
url=input('Paste REALTIME DATABASE URL'+(' ['+old+']' if old else '')+': ').strip().strip('"\'') or old
if not re.match(r'^https://[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:firebaseio\.com|firebasedatabase\.app)/?$',url):
    print('ERROR: Invalid database URL. It must be the exact HTTPS URL displayed in the Realtime Database Data tab.')
    sys.exit(1)
if not all(config.get(k) for k in ('apiKey','authDomain','projectId','appId')):
    print('ERROR: Other Firebase web config fields are missing; see README.md');sys.exit(1)
config['databaseURL']=url.rstrip('/')
path.write_text('// MuseSink public Firebase web client settings. Never include Admin SDK private keys.\nwindow.MUSE_FIREBASE_CONFIG = '+json.dumps(config,indent=2)+';\n', encoding='utf-8')
print('\nSUCCESS: MuseSink configuration completed for',config['projectId'])
print('Next: install to your GitHub Desktop repository and publish GitHub Pages.')
print('Check the site says LIVE SYNC; test on two separate computers.')
