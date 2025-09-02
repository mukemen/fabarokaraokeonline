// (isi app.js sesuai versi update dengan playlist)
let audio = document.getElementById('player');
let ctx, musicSource, micSource, musicGain, micGain, convolver, mix, mediaDest, recorder;
let chunks = [];
let lrc = [];
let raf;

const $ = id => document.getElementById(id);
const fmt = s => {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const ss = Math.floor(s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
};

async function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = ctx.createGain();
    micGain = ctx.createGain();
    const delay = ctx.createDelay(3.0);
    const feedback = ctx.createGain();
    delay.delayTime.value = 0.18;
    feedback.gain.value = parseFloat($('echo').value);
    micGain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(ctx.destination);
    mix = ctx.createGain();
    musicGain.connect(mix);
    micGain.connect(mix);
    mix.connect(ctx.destination);
    mediaDest = ctx.createMediaStreamDestination();
    mix.connect(mediaDest);
  }
}

function loadLyricsText(text) {
  lrc = [];
  const re = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?\](.*)/;
  text.split(/\r?\n/).forEach(line=>{
    const m = line.match(re);
    if (!m) return;
    const t = parseInt(m[1])*60 + parseInt(m[2]) + ((m[3]||0)/100);
    lrc.push({t, text: m[4].trim()});
  });
  lrc.sort((a,b)=>a.t-b.t);
  $('lyrics').textContent = lrc.length? '': 'Tidak ada baris lirik valid.';
}

function renderLyrics(current) {
  if (!lrc.length) return;
  let i = 0;
  while (i+1 < lrc.length && lrc[i+1].t <= current) i++;
  const start = Math.max(0, i - 2);
  const end = Math.min(lrc.length, i + 3);
  const lines = lrc.slice(start, end).map((x, idx)=> {
    const isCur = (start + idx) === i;
    return isCur ? `<span class="current">${x.text}</span>` : x.text;
  });
  $('lyrics').innerHTML = lines.join('\n');
}

function tick() {
  const cur = audio.currentTime;
  renderLyrics(cur);
  $('time').textContent = `${fmt(cur)} / ${fmt(audio.duration||0)}`;
  raf = requestAnimationFrame(tick);
}

$('loadAudio').onclick = async () => {
  await ensureCtx();
  if ($('fileAudio').files[0]) {
    audio.src = URL.createObjectURL($('fileAudio').files[0]);
  } else if ($('urlAudio').value) {
    audio.src = $('urlAudio').value;
  } else {
    alert('Pilih file atau masukkan URL audio.');
    return;
  }
  await audio.load();
  const src = ctx.createMediaElementSource(audio);
  musicSource = src;
  musicSource.connect(musicGain);
};

$('fileLrc').onchange = async (e) => {
  const text = await e.target.files[0].text();
  loadLyricsText(text);
};

$('loadLrcSample').onclick = () => {
  const sample = `[00:05.00] Kini ku bernyanyi\n[00:10.00] Ikuti irama malam ini\n[00:15.00] Pegang mic dan jangan ragu\n[00:20.00] Karaoke seru bersama kamu`;
  loadLyricsText(sample);
};

$('musicVol').oninput = e => { if (musicGain) musicGain.gain.value = parseFloat(e.target.value); };
$('micVol').oninput = e => { if (micGain) micGain.gain.value = parseFloat(e.target.value); };
$('echo').oninput = e => {};

$('play').onclick = async () => {
  await ensureCtx();
  if (!musicSource) { alert('Muat audio dulu.'); return; }
  if (!micSource) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const src = ctx.createMediaStreamSource(stream);
    micSource = src;
    micGain.gain.value = parseFloat($('micVol').value);
    micSource.connect(micGain);
  }
  await audio.play();
  cancelAnimationFrame(raf); tick();
};

$('pause').onclick = () => { audio.pause(); };
$('stop').onclick = () => { audio.pause(); audio.currentTime = 0; cancelAnimationFrame(raf); renderLyrics(0); };

$('recStart').onclick = async () => {
  await ensureCtx();
  const stream = mediaDest.stream;
  chunks = [];
  recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = $('downloadLink');
    a.href = url;
    a.style.display = 'inline-block';
  };
  recorder.start();
  $('recStart').disabled = true; $('recStop').disabled = false;
  if (audio.paused) $('play').click();
};

$('recStop').onclick = () => {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  $('recStart').disabled = false; $('recStop').disabled = true;
};

audio.addEventListener('ended', ()=>{ cancelAnimationFrame(raf); });

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt = e; $('installBtn').hidden = false;
});
$('installBtn').onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; $('installBtn').hidden = true;
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=> navigator.serviceWorker.register('/sw.js'));
}

/* Playlist loader */
let playlist = [];
async function loadPlaylist() {
  try {
    const res = await fetch('/songs.json');
    playlist = await res.json();
    const list = document.getElementById('playlist');
    list.innerHTML = '';
    playlist.forEach(track => {
      const item = document.createElement('button');
      item.className = 'btn';
      item.style.background = '#1f2937';
      item.innerHTML = `▶️ ${track.title} — ${track.artist}`;
      item.onclick = async () => {
        await ensureCtx();
        audio.src = track.url;
        await audio.load();
        if (track.lrc) loadLyricsText(track.lrc);
        cancelAnimationFrame(raf); tick();
        audio.play();
      };
      list.appendChild(item);
    });
  } catch (e) { console.error('Gagal memuat playlist', e); }
}
document.getElementById('reloadPlaylist').onclick = loadPlaylist;
window.addEventListener('load', loadPlaylist);