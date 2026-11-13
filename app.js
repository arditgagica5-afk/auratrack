const defaultState = {
  folders: [
    { id: 'f_default', name: 'Unsorted Vault' },
    { id: 'f_studio', name: 'Late Night Samples' }
  ],
  playlists: [
    { id: 'p_1', folderId: 'f_default', name: 'Identified Bangers', tracks: [] },
    { id: 'p_2', folderId: 'f_studio', name: 'Guitar & Synth Chops', tracks: [] }
  ]
};

let folders = JSON.parse(localStorage.getItem('at_folders')) || defaultState.folders;
let playlists = JSON.parse(localStorage.getItem('at_playlists')) || defaultState.playlists;
let keys = JSON.parse(localStorage.getItem('at_keys')) || { audd: '', spotifyClientId: '' };
let spotifyAuth = JSON.parse(localStorage.getItem('at_spotify_auth')) || null;
let currentTrack = null;
let inputMode = 'mic';
let mediaRecorder = null;
let isRecording = false;

function persist() {
  localStorage.setItem('at_folders', JSON.stringify(folders));
  localStorage.setItem('at_playlists', JSON.stringify(playlists));
  localStorage.setItem('at_keys', JSON.stringify(keys));
  renderLibrary();
}

async function initApp() {
  document.getElementById('input-audd').value = keys.audd || '';
  document.getElementById('input-spotify-id').value = keys.spotifyClientId || '';
  document.getElementById('redirect-uri-display').textContent = window.location.origin + window.location.pathname;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    await exchangeSpotifyCode(code);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  updateSpotifyPill();
  renderLibrary();
}

function updateSpotifyPill() {
  const pill = document.getElementById('spotify-pill');
  if (spotifyAuth && spotifyAuth.accessToken && Date.now() < spotifyAuth.expiresAt) {
    pill.textContent = 'SPOTIFY: CONNECTED';
    pill.className = 'text-[11px] mono text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded bg-emerald-500/10';
  } else {
    pill.textContent = 'SPOTIFY: OFF';
    pill.className = 'text-[11px] mono text-zinc-400 border border-white/10 px-2.5 py-1 rounded bg-white/[0.03]';
  }
}

function switchTab(tab) {
  ['radar', 'credits', 'library', 'settings'].forEach(t => {
    document.getElementById('view-' + t).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('tab-' + t);
    btn.className = t === tab
      ? 'tab-btn h-full border-b-2 border-white text-white font-medium whitespace-nowrap'
      : 'tab-btn h-full border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 whitespace-nowrap';
  });
}

function setInputMode(mode) {
  inputMode = mode;
  document.getElementById('radar-input-label').textContent = mode === 'mic' ? 'INPUT: LIVE MIC' : 'INPUT: AUDIO FILE';
  document.getElementById('mic-controls').classList.toggle('hidden', mode !== 'mic');
  document.getElementById('file-controls').classList.toggle('hidden', mode !== 'file');
  document.getElementById('mode-mic').className = mode === 'mic' ? 'py-2 rounded-md text-xs font-medium bg-zinc-100 text-black transition' : 'py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition';
  document.getElementById('mode-file').className = mode === 'file' ? 'py-2 rounded-md text-xs font-medium bg-zinc-100 text-black transition' : 'py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition';
}

function logConsole(msg, state = 'OK') {
  document.getElementById('console-log').textContent = '> ' + msg;
  document.getElementById('console-state').textContent = state;
}

async function toggleMicScan() {
  if (isRecording && mediaRecorder) {
    mediaRecorder.stop();
    return;
  }
  if (!keys.audd) {
    alert('Paste your free AudD API token in Keys / Setup first, or tap "Test with Demo Track".');
    switchTab('settings');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      isRecording = false;
      stream.getTracks().forEach(t => t.stop());
      setScanUI(false);
      const blob = new Blob(chunks, { type: 'audio/webm' });
      await sendToAudD(blob);
    };
    mediaRecorder.start();
    isRecording = true;
    setScanUI(true);
    logConsole('recording acoustic fingerprint (6s)...', 'LIVE');
    setTimeout(() => { if (isRecording && mediaRecorder) mediaRecorder.stop(); }, 6000);
  } catch (err) {
    logConsole('mic blocked: ' + err.message, 'ERR');
  }
}

function setScanUI(active) {
  const btn = document.getElementById('scan-btn');
  const dot = document.getElementById('scan-dot');
  const lbl = document.getElementById('scan-label');
  if (active) {
    btn.className = 'w-full max-w-[260px] py-3.5 rounded-lg bg-red-500/15 border border-red-500/60 text-red-400 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2.5';
    dot.className = 'h-2 w-2 rounded-full bg-red-500 animate-ping';
    lbl.textContent = 'Listening... Tap to Stop';
  } else {
    btn.className = 'w-full max-w-[260px] py-3.5 rounded-lg bg-white text-black font-mono text-xs uppercase tracking-widest font-medium hover:bg-zinc-200 transition flex items-center justify-center gap-2.5';
    dot.className = 'h-2 w-2 rounded-full bg-black';
    lbl.textContent = 'Start Capture (6s)';
  }
}

async function scanAudioFile(file) {
  if (!file) return;
  if (!keys.audd) {
    alert('Paste your free AudD API token in Keys / Setup first.');
    switchTab('settings');
    return;
  }
  await sendToAudD(file);
}

async function sendToAudD(audioBlob) {
  logConsole('querying acoustic database...', 'BUSY');
  const fd = new FormData();
  fd.append('api_token', keys.audd);
  fd.append('file', audioBlob);
  fd.append('return', 'spotify');

  try {
    const res = await fetch('https://api.audd.io/', { method: 'POST', body: fd });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Non-JSON response (' + res.status + ')');
    }
    const data = await res.json();
    if (data.status !== 'success' || !data.result) {
      logConsole(data.error?.error_message || 'No match found. Try louder audio.', 'MISS');
      return;
    }
    const r = data.result;
    await loadTrackAndCredits({
      title: r.title,
      artist: r.artist,
      album: r.album || 'Single',
      spotifyUri: r.spotify?.uri || null
    });
  } catch (err) {
    logConsole(err.message, 'ERR');
  }
}

async function runDemoTrack() {
  await loadTrackAndCredits({
    title: 'Nights',
    artist: 'Frank Ocean',
    album: 'Blonde',
    spotifyUri: null
  });
}

async function loadTrackAndCredits(track) {
  currentTrack = track;
  logConsole('pulling studio credits...', 'BUSY');

  document.getElementById('credits-empty').classList.add('hidden');
  document.getElementById('credits-content').classList.remove('hidden');
  document.getElementById('res-title').textContent = track.title;
  document.getElementById('res-artist').textContent = track.artist;
  document.getElementById('res-album').textContent = track.album;

  const list = document.getElementById('credits-list');
  list.innerHTML = '<p class="text-zinc-500 mono">Searching MusicBrainz session logs...</p>';
  switchTab('credits');

  try {
    const q = encodeURIComponent(`recording:"${track.title}" AND artist:"${track.artist}"`);
    const searchRes = await fetch(`https://musicbrainz.org/ws/2/recording?query=${q}&fmt=json&limit=3`);
    const searchJson = await searchRes.json();

    if (!searchJson.recordings || searchJson.recordings.length === 0) {
      list.innerHTML = '<p class="text-zinc-500">No deep studio credits indexed for this exact recording yet.</p>';
      logConsole('track found (limited credits)', 'OK');
      return;
    }

    const mbid = searchJson.recordings[0].id;
    const detailRes = await fetch(`https://musicbrainz.org/ws/2/recording/${mbid}?inc=artist-rels+work-rels+label-rels+place-rels&fmt=json`);
    const detail = await detailRes.json();

    let rows = [];
    const extractRels = (rels) => {
      (rels || []).forEach(rel => {
        const who = rel.artist?.name || rel.place?.name || rel.label?.name;
        if (!who) return;
        const attrs = rel.attributes?.length ? ` (${rel.attributes.join(', ')})` : '';
        rows.push({ role: rel.type + attrs, name: who });
      });
    };

    extractRels(detail.relations);

    const workRel = (detail.relations || []).find(r => r.work);
    if (workRel?.work?.id) {
      const workRes = await fetch(`https://musicbrainz.org/ws/2/work/${workRel.work.id}?inc=artist-rels&fmt=json`);
      const workJson = await workRes.json();
      extractRels(workJson.relations);
    }

    if (rows.length === 0) {
      list.innerHTML = '<p class="text-zinc-500">Artist matched, but studio personnel credits are missing in MusicBrainz.</p>';
    } else {
      list.innerHTML = rows.map(r => `
        <div class="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
          <span class="mono uppercase text-[10px] text-zinc-500">${escapeHtml(r.role)}</span>
          <span class="font-medium text-zinc-200 text-right">${escapeHtml(r.name)}</span>
        </div>
      `).join('');
    }
    logConsole('match + credits loaded.', 'OK');
  } catch (err) {
    list.innerHTML = `<p class="text-red-400">Error loading credits: ${escapeHtml(err.message)}</p>`;
    logConsole('credit lookup error', 'ERR');
  }
}

function createFolderPrompt() {
  const name = prompt('New Folder Name:');
  if (!name?.trim()) return;
  folders.push({ id: 'f_' + Date.now(), name: name.trim() });
  persist();
}

function createPlaylistPrompt() {
  const name = prompt('New Playlist Name:');
  if (!name?.trim()) return;
  playlists.push({ id: 'p_' + Date.now(), folderId: folders[0].id, name: name.trim(), tracks: [] });
  persist();
}

function movePlaylistToFolder(playlistId, newFolderId) {
  const p = playlists.find(x => x.id === playlistId);
  if (p) { p.folderId = newFolderId; persist(); }
}

function moveTrack(fromPlaylistId, trackIndex, toPlaylistId) {
  if (!toPlaylistId || fromPlaylistId === toPlaylistId) return;
  const from = playlists.find(p => p.id === fromPlaylistId);
  const to = playlists.find(p => p.id === toPlaylistId);
  if (!from || !to) return;
  const [moved] = from.tracks.splice(trackIndex, 1);
  to.tracks.push(moved);
  persist();
}

function deleteTrack(playlistId, trackIndex) {
  const p = playlists.find(x => x.id === playlistId);
  if (p) { p.tracks.splice(trackIndex, 1); persist(); }
}

function renderLibrary() {
  const container = document.getElementById('library-container');
  if (!container) return;
  container.innerHTML = folders.map(folder => {
    const folderPlaylists = playlists.filter(p => p.folderId === folder.id);
    return `
      <div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-3">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <span class="text-xs mono uppercase tracking-wider text-zinc-300">📁 ${escapeHtml(folder.name)}</span>
          <span class="text-[10px] mono text-zinc-500">${folderPlaylists.length} playlists</span>
        </div>
        ${folderPlaylists.length === 0 ? '<p class="text-xs text-zinc-600">Empty folder</p>' : folderPlaylists.map(pl => `
          <div class="rounded-lg border border-white/[0.06] bg-[#08080A] p-3 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-white">${escapeHtml(pl.name)}</p>
                <p class="text-[11px] mono text-zinc-500">${pl.tracks.length} tracks</p>
              </div>
              <div class="flex items-center gap-2">
                <select onchange="movePlaylistToFolder('${pl.id}', this.value)" class="bg-[#121217] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300">
                  ${folders.map(f => `<option value="${f.id}" ${f.id === pl.folderId ? 'selected' : ''}>Move → ${escapeHtml(f.name)}</option>`).join('')}
                </select>
                <button onclick="pushPlaylistToSpotify('${pl.id}')" class="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium hover:bg-emerald-500/25">
                  Push to Spotify ↗
                </button>
              </div>
            </div>
            ${pl.tracks.length > 0 ? `
              <div class="space-y-1.5 pt-2 border-t border-white/[0.05]">
                ${pl.tracks.map((t, idx) => `
                  <div class="flex items-center justify-between gap-2 text-xs py-1">
                    <div class="min-w-0">
                      <span class="text-zinc-200 truncate block">${escapeHtml(t.title)}</span>
                      <span class="text-[11px] text-zinc-500 truncate block">${escapeHtml(t.artist)}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <select onchange="moveTrack('${pl.id}', ${idx}, this.value)" class="bg-[#121217] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-400">
                        <option value="">Move song...</option>
                        ${playlists.filter(op => op.id !== pl.id).map(op => `<option value="${op.id}">${escapeHtml(op.name)}</option>`).join('')}
                      </select>
                      <button onclick="deleteTrack('${pl.id}', ${idx})" class="text-zinc-500 hover:text-red-400 px-1">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function openSaveModal() {
  if (!currentTrack) return;
  const list = document.getElementById('modal-playlist-list');
  list.innerHTML = playlists.map(pl => `
    <button onclick="addCurrentTrackToPlaylist('${pl.id}')" class="w-full text-left px-3 py-2.5 rounded-lg border border-white/10 hover:border-white/30 bg-[#08080A] text-xs flex justify-between items-center">
      <span>${escapeHtml(pl.name)}</span>
      <span class="mono text-[10px] text-zinc-500">${pl.tracks.length} tracks</span>
    </button>
  `).join('');
  document.getElementById('save-modal').classList.remove('hidden');
}

function closeSaveModal() { document.getElementById('save-modal').classList.add('hidden'); }

function addCurrentTrackToPlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (pl && currentTrack) {
    pl.tracks.push({ ...currentTrack });
    persist();
    closeSaveModal();
    switchTab('library');
  }
}

function saveKeys() {
  keys.audd = document.getElementById('input-audd').value.trim();
  keys.spotifyClientId = document.getElementById('input-spotify-id').value.trim();
  persist();
  alert('Keys saved.');
}

async function connectSpotify() {
  saveKeys();
  if (!keys.spotifyClientId) return alert('Paste your Spotify Client ID first.');

  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(48)), b => ('0' + b.toString(16)).slice(-2)).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  localStorage.setItem('at_pkce_verifier', verifier);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', keys.spotifyClientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', window.location.origin + window.location.pathname);
  authUrl.searchParams.set('scope', 'playlist-modify-public playlist-modify-private');
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);

  window.location.href = authUrl.toString();
}

async function exchangeSpotifyCode(code) {
  const verifier = localStorage.getItem('at_pkce_verifier');
  const body = new URLSearchParams({
    client_id: keys.spotifyClientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: window.location.origin + window.location.pathname,
    code_verifier: verifier
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json();
  if (data.access_token) {
    spotifyAuth = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in * 1000) };
    localStorage.setItem('at_spotify_auth', JSON.stringify(spotifyAuth));
  }
}

async function pushPlaylistToSpotify(playlistId) {
  if (!spotifyAuth || Date.now() >= spotifyAuth.expiresAt) {
    alert('Connect your Spotify account in Keys / Setup first.');
    switchTab('settings');
    return;
  }
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl || pl.tracks.length === 0) return alert('Add at least 1 song to this playlist first.');

  const headers = { 'Authorization': 'Bearer ' + spotifyAuth.accessToken, 'Content-Type': 'application/json' };

  try {
    const uris = [];
    for (const t of pl.tracks) {
      if (t.spotifyUri) { uris.push(t.spotifyUri); continue; }
      const q = encodeURIComponent(`track:${t.title} artist:${t.artist}`);
      const sRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, { headers });
      const sJson = await sRes.json();
      const found = sJson.tracks?.items?.[0]?.uri;
      if (found) uris.push(found);
    }
    if (uris.length === 0) return alert('Could not find matching tracks on Spotify.');

    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: pl.name, description: 'Created with AuraTrack', public: false })
    });
    const created = await createRes.json();
    if (!createRes.ok) throw new Error(created.error?.message || 'Failed creating Spotify playlist');

    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${created.id}/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uris })
    });
    if (!addRes.ok) {
      const errData = await addRes.json();
      throw new Error(errData.error?.message || 'Failed adding tracks');
    }

    alert(`Pushed "${pl.name}" (${uris.length} tracks) to Spotify!`);
    if (created.external_urls?.spotify) window.open(created.external_urls.spotify, '_blank');
  } catch (err) {
    alert('Spotify error: ' + err.message);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
// END OF AURATRACK
