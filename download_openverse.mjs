import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, 'public', 'songs');
fs.mkdirSync(outDir, { recursive: true });

const params = new URLSearchParams({
  q: 'instrumental',
  license: 'cc0,by',
  page_size: '20',
  fields: 'id,title,creator,license,preview_url,foreign_landing_url'
});
const apiUrl = 'https://api.openverse.org/v1/audio/?' + params.toString();

function sanitize(name){ return name.replace(/[\/:*?"<>|]+/g,'_').slice(0,80); }

const res = await fetch(apiUrl);
if (!res.ok) { console.error('Openverse API failed:', res.status, await res.text()); process.exit(0); }
const json = await res.json();
const items = (json.results||[]).filter(x=>x.preview_url);

const songs = [];
for (const x of items) {
  try {
    const r = await fetch(x.preview_url);
    if (!r.ok) continue;
    const ct = r.headers.get('content-type') || '';
    const ext = ct.includes('mpeg')?'.mp3':ct.includes('ogg')?'.ogg':ct.includes('wav')?'.wav':'.audio';
    const fileName = sanitize(`${x.title||'untitled'} - ${x.creator||'unknown'} - ${x.id}${ext}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(outDir, fileName), buf);
    songs.push({ title:x.title||'Untitled', artist:x.creator||'Unknown', url:'/songs/'+fileName, license:(x.license||'').toUpperCase(), source:x.foreign_landing_url||null, lrc:null });
    console.log('Saved', fileName);
  } catch (e) {
    console.error('Skip item due to error:', e.message);
  }
}

fs.writeFileSync(path.join(__dirname, 'public', 'songs.json'), JSON.stringify(songs, null, 2));
console.log('songs.json written with', songs.length, 'items');
