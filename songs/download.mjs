import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'public', 'songs');
fs.mkdirSync(outDir, { recursive: true });

// CC0/public-domain tracks. Sources: FreePD (CC0) + some Pixabay CC0.
const tracks = [
  { name: 'Battle Ready.mp3', url: 'https://freepd.com/music/Battle%20Ready.mp3' },
  { name: 'Think About It.mp3', url: 'https://freepd.com/music/Think%20About%20It.mp3' },
  { name: 'The Ice Giants.mp3', url: 'https://freepd.com/music/The%20Ice%20Giants.mp3' },
  { name: 'Heroic Adventure.mp3', url: 'https://freepd.com/music/Heroic%20Adventure.mp3' },
  { name: 'Bumbly March.mp3', url: 'https://freepd.com/music/Bumbly%20March.mp3' },
  // Pixabay CC0 example (ensure CC0 filter if you change/extend):
  { name: 'Epic Adventure.mp3', url: 'https://cdn.pixabay.com/download/audio/2021/09/27/audio_2a3b0b1a5b.mp3?filename=epic-adventure-113915.mp3' }
];

async function save(url, fileName) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed ' + url + ' ' + res.status);
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  fs.writeFileSync(path.join(outDir, fileName), buf);
  console.log('Saved', fileName);
}

for (const t of tracks) {
  try {
    if (!fs.existsSync(path.join(outDir, t.name))) {
      await save(t.url, t.name);
    } else {
      console.log('Exists', t.name);
    }
  } catch (e) {
    console.error('Error on', t.name, e.message);
  }
}

// Also write songs.json (local urls) at build time
const songs = [
  {
    "title": "Battle Ready",
    "artist": "Bryan Teoh",
    "url": "/songs/Battle Ready.mp3",
    "license": "CC0 - FreePD/Pixabay",
    "lrc": null
  },
  {
    "title": "Think About It",
    "artist": "Bryan Teoh",
    "url": "/songs/Think About It.mp3",
    "license": "CC0 - FreePD/Pixabay",
    "lrc": null
  },
  {
    "title": "The Ice Giants",
    "artist": "Kevin MacLeod",
    "url": "/songs/The Ice Giants.mp3",
    "license": "CC0 - FreePD/Pixabay",
    "lrc": null
  },
  {
    "title": "Heroic Adventure",
    "artist": "Rafael Krux",
    "url": "/songs/Heroic Adventure.mp3",
    "license": "CC0 - FreePD/Pixabay",
    "lrc": null
  },
  {
    "title": "Bumbly March",
    "artist": "Kevin MacLeod",
    "url": "/songs/Bumbly March.mp3",
    "license": "CC0 - FreePD/Pixabay",
    "lrc": null
  },
  {
    "title": "Epic Adventure",
    "artist": "Yuriy Bespalov",
    "url": "/songs/Epic Adventure.mp3",
    "license": "CC0 - FreePD/Pixabay",
    "lrc": null
  }
];
fs.writeFileSync(path.join(__dirname, 'songs.json'), JSON.stringify(songs, null, 2));
console.log('songs.json written.');
