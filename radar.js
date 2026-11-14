let mediaRecorder = null, isRecording = false, countdownTimer = null;

function switchTab(tab) {
  ['radar', 'credits', 'library', 'settings'].forEach(t => {
    document.getElementById('view-' + t).classList.toggle('hidden', t !== tab);
    document.getElementById('tab-' + t).className = t === tab
      ? 'tab-btn h-full border-b-2 border-white text-white font-medium whitespace-nowrap'
      : 'tab-btn h-full border-b-2 border-transparent text-zinc-500 whitespace-nowrap';
  });
}

function setInputMode(mode) {
  document.getElementById('radar-input-label').textContent = mode === 'mic' ? 'MODE // LIVE MIC' : 'MODE // FILE UPLOAD';
  document.getElementById('mic-controls').classList.toggle('hidden', mode !== 'mic');
  document.getElementById('file-controls').classList.toggle('hidden', mode !== 'file');
  document.getElementById('mode-mic').className = mode === 'mic' ? 'py-2 rounded-md text-xs font-medium bg-zinc-100 text-black' : 'py-2 rounded-md text-xs font-medium text-zinc-400';
  document.getElementById('mode-file').className = mode === 'file' ? 'py-2 rounded-md text-xs font-medium bg-zinc-100 text-black' : 'py-2 rounded-md text-xs font-medium text-zinc-400';
}

function logConsole(msg, state = 'IDLE') {
  document.getElementById('console-log').textContent = '> ' + msg;
  document.getElementById('console-state').textContent = state;
}

function setVinylScanning(active, sec = 6) {
  const disc = document.getElementById('vinyl-disc'), r1 = document.getElementById('vinyl-ring-1'), r2 = document.getElementById('vinyl-ring-2'), eq = document.getElementById('vinyl-eq');
  disc.classList.toggle('vinyl-spinning', active);
  r1.classList.toggle('hidden', !active);
  r2.classList.toggle('hidden', !active);
  eq.classList.toggle('eq-active', active);
  eq.querySelectorAll('span').forEach(s => s.classList.replace(active ? 'bg-zinc-600' : 'bg-emerald-400', active ? 'bg-emerald-400' : 'bg-zinc-600'));
  document.getElementById('scan-status-title').textContent = active ? `Listening... (${sec}s)` : 'Tap vinyl to listen';
  document.getElementById('scan-status-sub').textContent = active ? 'Tap vinyl again to stop early' : 'Plays music near your mic for 6 seconds';
}

async function toggleMicScan() {
  if (isRecording && mediaRecorder) { mediaRecorder.stop(); return; }
  if (!keys.audd) { showToast('Add AudD token in Keys / Setup first'); return switchTab('settings'); }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      isRecording = false; clearInterval(countdownTimer);
      stream.getTracks().forEach(t => t.stop());
      setVinylScanning(false);
      await sendToAudD(new Blob(chunks, { type: 'audio/webm' }));
    };
    mediaRecorder.start(); isRecording = true;
    let left = 6; setVinylScanning(true, left); logConsole('capturing audio...', 'LIVE');
    countdownTimer = setInterval(() => {
      left--;
      if (left > 0 && isRecording) document.getElementById('scan-status-title').textContent = `Listening... (${left}s)`;
      else { clearInterval(countdownTimer); if (isRecording && mediaRecorder) mediaRecorder.stop(); }
    }, 1000);
  } catch (err) { logConsole('mic blocked', 'ERR'); showToast('Allow Microphone permission'); }
}

async function scanAudioFile(file) {
  if (!file) return;
  if (!keys.audd) { showToast('Add AudD token in Keys / Setup first'); return switchTab('settings'); }
  await sendToAudD(file);
}

async function sendToAudD(blob) {
  logConsole('identifying track...', 'SCAN');
  document.getElementById('scan-status-title').textContent = 'Identifying track...';
  const fd = new FormData(); fd.append('api_token', keys.audd); fd.append('file', blob); fd.append('return', 'spotify');
  try {
    const res = await fetch('https://api.audd.io/', { method: 'POST', body: fd });
    const data = await res.json();
    setVinylScanning(false);
    if (data.status !== 'success' || !data.result) { logConsole('no match', 'MISS'); return showToast('No match found — try closer audio'); }
    const r = data.result;
    await loadTrackAndCredits({ kind: 'music', title: r.title, artist: r.artist, album: r.album || 'Single', spotifyUri: r.spotify?.uri || null });
  } catch (err) { setVinylScanning(false); logConsole(err.message, 'ERR'); showToast(err.message); }
}

async function runDemoTrack() { await loadTrackAndCredits({ kind: 'music', title: 'Nights', artist: 'Frank Ocean', album: 'Blonde', spotifyUri: null }); }

async function loadTrackAndCredits(track) {
  currentTrack = track; logConsole('pulling credits...', 'BUSY');
  document.getElementById('credits-empty').classList.add('hidden');
  document.getElementById('credits-content').classList.remove('hidden');
  document.getElementById('res-poster').classList.add('hidden');
  document.getElementById('res-badge').textContent = 'MATCH FOUND';
  document.getElementById('res-title').textContent = track.title;
  document.getElementById('res-artist').textContent = track.artist;
  document.getElementById('res-album').textContent = track.album;
  const qLink = encodeURIComponent(`${track.title} ${track.artist}`);
  const spBtn = document.getElementById('btn-sp-search');
  spBtn.textContent = 'Open in Spotify ↗'; spBtn.href = `https://open.spotify.com/search/${qLink}`;
  document.getElementById('btn-yt').href = `https://www.youtube.com/results?search_query=${qLink}`;
  document.getElementById('credits-source').textContent = 'MUSICBRAINZ';
  const list = document.getElementById('credits-list');
  list.innerHTML = '<p class="text-zinc-500 mono py-2">Loading producers, writers &amp; players...</p>';
  switchTab('credits');
  try {
    const s = await (await fetch(`https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(`recording:"${track.title}" AND artist:"${track.artist}"`)}&fmt=json&limit=3`)).json();
    if (!s.recordings?.length) { list.innerHTML = '<p class="text-zinc-500 py-2">No studio credits indexed yet.</p>'; return logConsole('matched.', 'OK'); }
    const d = await (await fetch(`https://musicbrainz.org/ws/2/recording/${s.recordings[0].id}?inc=artist-rels+work-rels+label-rels+place-rels&fmt=json`)).json();
    let rows = [];
    const addRels = (rels) => (rels || []).forEach(rel => { const w = rel.artist?.name || rel.place?.name || rel.label?.name; if (w) rows.push({ role: rel.type + (rel.attributes?.length ? ` (${rel.attributes.join(', ')})` : ''), name: w }); });
    addRels(d.relations);
    const wr = (d.relations || []).find(r => r.work);
    if (wr?.work?.id) addRels((await (await fetch(`https://musicbrainz.org/ws/2/work/${wr.work.id}?inc=artist-rels&fmt=json`)).json()).relations);
    list.innerHTML = rows.length ? rows.map(r => `<div class="flex justify-between gap-4 py-2.5 border-b border-white/[0.04] last:border-0"><span class="mono uppercase text-[10px] text-zinc-500 shrink-0">${escapeHtml(r.role)}</span><span class="font-medium text-zinc-200 text-right">${escapeHtml(r.name)}</span></div>`).join('') : '<p class="text-zinc-500 py-2">Detailed credits missing in MusicBrainz.</p>';
    logConsole('ready.', 'OK');
  } catch (e) { list.innerHTML = `<p class="text-red-400 py-2">Error: ${escapeHtml(e.message)}</p>`; }
}

async function initApp() {
  document.getElementById('input-audd').value = keys.audd || '';
  document.getElementById('input-gemini').value = keys.gemini || '';
  document.getElementById('input-tmdb').value = keys.tmdb || '';
  document.getElementById('input-spotify-id').value = keys.spotifyClientId || '';
  document.getElementById('redirect-uri-display').textContent = window.location.origin + window.location.pathname;
  const p = new URLSearchParams(window.location.search);
  const code = p.get('code'), shared = p.get('url') || p.get('text') || p.get('title');
  if (code) { await exchangeSpotifyCode(code); window.history.replaceState({}, '', window.location.pathname); }
  if (shared) { setCategory('movies'); document.getElementById('movie-query').value = shared; showToast('Loaded from Share menu!'); }
  updateBadges(); renderLibrary();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); else initApp();
// END RADAR
