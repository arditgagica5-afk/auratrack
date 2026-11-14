const defaultState = {
  folders: [{ id: 'f_default', name: 'Unsorted Vault' }, { id: 'f_movies', name: 'Watchlist & Scenes' }],
  playlists: [
    { id: 'p_1', folderId: 'f_default', name: 'Identified Bangers', tracks: [] },
    { id: 'p_2', folderId: 'f_movies', name: 'Movies To Watch', tracks: [] }
  ]
};
let folders = JSON.parse(localStorage.getItem('at_folders')) || defaultState.folders;
let playlists = JSON.parse(localStorage.getItem('at_playlists')) || defaultState.playlists;
let scanHistory = JSON.parse(localStorage.getItem('at_history')) || [];
let keys = JSON.parse(localStorage.getItem('at_keys')) || { audd: '', spotifyClientId: '', gemini: '', tmdb: '' };
let spotifyAuth = JSON.parse(localStorage.getItem('at_spotify_auth')) || null;
let currentTrack = null, vaultFilter = 'all', toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('app-toast'); if (!el) return;
  el.textContent = msg; el.style.opacity = '1';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

function persist() {
  localStorage.setItem('at_folders', JSON.stringify(folders));
  localStorage.setItem('at_playlists', JSON.stringify(playlists));
  localStorage.setItem('at_history', JSON.stringify(scanHistory));
  localStorage.setItem('at_keys', JSON.stringify(keys));
  renderLibrary(); renderHistoryStrip(); updateBadges();
}

function saveToHistory(item) {
  const id = (item.kind || 'music') + '_' + item.title + '_' + item.artist;
  scanHistory = [{ ...item, id }, ...scanHistory.filter(x => x.id !== id)].slice(0, 40);
  persist();
}

function openHistoryItem(id) {
  const h = scanHistory.find(x => x.id === id); if (!h) return;
  currentTrack = h;
  document.getElementById('credits-empty').classList.add('hidden');
  document.getElementById('credits-content').classList.remove('hidden');
  document.getElementById('res-badge').textContent = h.kind === 'movie' ? 'SAVED MOVIE / TV' : 'SAVED SONG';
  document.getElementById('res-title').textContent = h.title;
  document.getElementById('res-artist').textContent = h.artist;
  document.getElementById('res-album').textContent = h.album || '';
  const poster = document.getElementById('res-poster');
  if (h.poster) { poster.src = h.poster; poster.classList.remove('hidden'); } else poster.classList.add('hidden');
  const q = encodeURIComponent(`${h.title} ${h.artist}`);
  const sp = document.getElementById('btn-sp-search');
  if (h.kind === 'movie') { sp.textContent = 'Google / Watch ↗'; sp.href = `https://www.google.com/search?q=${q}+watch`; }
  else { sp.textContent = 'Open in Spotify ↗'; sp.href = `https://open.spotify.com/search/${q}`; }
  document.getElementById('btn-yt').href = `https://www.youtube.com/results?search_query=${q}`;
  document.getElementById('credits-list').innerHTML = (h.credits || []).map(r =>
    `<div class="flex justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0"><span class="mono uppercase text-[10px] text-zinc-500 shrink-0">${escapeHtml(r.role)}</span><span class="font-medium text-zinc-200 text-right">${escapeHtml(r.name)}</span></div>`
  ).join('') || '<p class="text-zinc-500 py-2">No detailed credits saved.</p>';
  switchTab('credits');
}

function renderHistoryStrip() {
  const el = document.getElementById('history-strip'); if (!el) return;
  el.innerHTML = scanHistory.map(h =>
    `<button onclick="openHistoryItem('${escapeHtml(h.id)}')" class="shrink-0 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0D0D11] hover:border-white/30 text-[11px] text-zinc-200">${h.kind === 'movie' ? '🎬 ' : '🎵 '}${escapeHtml(h.title)}</button>`
  ).join('');
}

function setVaultFilter(f) {
  vaultFilter = f;
  ['all', 'music', 'movie'].forEach(k => {
    const b = document.getElementById('flt-' + k);
    if (b) b.className = k === f ? 'py-1.5 rounded bg-white text-black font-semibold' : 'py-1.5 rounded text-zinc-400';
  });
  renderLibrary();
}

function setBadge(id, ok, txtOk = '✓ READY', txtNo = 'NOT SET') {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = ok ? txtOk : txtNo;
  el.className = ok ? 'text-[10px] mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'text-[10px] mono px-2 py-0.5 rounded border border-white/10 text-zinc-500';
}
function updateBadges() {
  setBadge('badge-audd', !!keys.audd); setBadge('badge-gemini', !!keys.gemini); setBadge('badge-tmdb', !!keys.tmdb);
  const spOk = spotifyAuth && spotifyAuth.accessToken && Date.now() < spotifyAuth.expiresAt;
  setBadge('badge-spotify', spOk, '✓ CONNECTED', keys.spotifyClientId ? 'TAP CONNECT' : 'NOT SET');
  const pill = document.getElementById('spotify-pill');
  if (pill) { pill.textContent = spOk ? 'SP: ON' : 'SP: OFF'; pill.className = spOk ? 'hidden sm:block text-[10px] mono text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded bg-emerald-500/10' : 'hidden sm:block text-[10px] mono text-zinc-400 border border-white/10 px-2 py-1 rounded'; }
}
function createFolderPrompt() { const n = prompt('New Folder Name:'); if (n?.trim()) { folders.push({ id: 'f_' + Date.now(), name: n.trim() }); persist(); showToast('Folder created'); } }
function createPlaylistPrompt() { const n = prompt('New List Name:'); if (n?.trim()) { playlists.push({ id: 'p_' + Date.now(), folderId: folders[0].id, name: n.trim(), tracks: [] }); persist(); showToast('List created'); } }
function deletePlaylist(id) { if (confirm('Delete list?')) { playlists = playlists.filter(p => p.id !== id); persist(); } }
function movePlaylistToFolder(pid, fid) { const p = playlists.find(x => x.id === pid); if (p) { p.folderId = fid; persist(); } }
function moveTrack(fromId, idx, toId) {
  if (!toId || fromId === toId) return;
  const f = playlists.find(p => p.id === fromId), t = playlists.find(p => p.id === toId);
  if (f && t) { t.tracks.push(f.tracks.splice(idx, 1)[0]); persist(); showToast('Moved'); }
}
function deleteTrack(pid, idx) { const p = playlists.find(p => p.id === pid); if (p) { p.tracks.splice(idx, 1); persist(); } }

function renderLibrary() {
  const c = document.getElementById('library-container'); if (!c) return;
  const filtHist = scanHistory.filter(h => vaultFilter === 'all' || (h.kind || 'music') === vaultFilter);
  const histBox = `<div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-2">
    <div class="flex justify-between border-b border-white/[0.06] pb-2"><span class="text-xs mono uppercase text-emerald-400">⏱ Auto-Saved Scans</span><span class="text-[10px] mono text-zinc-500">${filtHist.length} saved</span></div>
    ${filtHist.length ? filtHist.map(h => `<button onclick="openHistoryItem('${escapeHtml(h.id)}')" class="w-full text-left flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0 text-xs">
      <div class="min-w-0"><span class="text-white block truncate">${h.kind === 'movie' ? '🎬 ' : '🎵 '}${escapeHtml(h.title)}</span><span class="text-[11px] text-zinc-500 block truncate">${escapeHtml(h.artist)}</span></div>
      <span class="text-[10px] mono text-zinc-400 shrink-0 ml-2">View ↗</span>
    </button>`).join('') : '<p class="text-xs text-zinc-600">No scans yet.</p>'}
  </div>`;

  const folderBoxes = folders.map(f => {
    const pls = playlists.filter(p => p.folderId === f.id);
    return `<div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-3">
      <div class="flex justify-between border-b border-white/[0.06] pb-2"><span class="text-xs mono uppercase text-zinc-300">📁 ${escapeHtml(f.name)}</span><span class="text-[10px] mono text-zinc-500">${pls.length} lists</span></div>
      ${pls.map(pl => {
        const items = pl.tracks.map((t, i) => ({ t, i })).filter(x => vaultFilter === 'all' || (x.t.kind || 'music') === vaultFilter);
        return `<div class="rounded-lg border border-white/[0.06] bg-[#08080A] p-3 space-y-2">
          <div class="flex flex-wrap justify-between items-center gap-2">
            <div><p class="text-sm font-medium text-white">${escapeHtml(pl.name)}</p><p class="text-[11px] mono text-zinc-500">${items.length} shown</p></div>
            <div class="flex flex-wrap gap-1.5">
              <select onchange="movePlaylistToFolder('${pl.id}',this.value)" class="bg-[#121217] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-300">${folders.map(x => `<option value="${x.id}" ${x.id === pl.folderId ? 'selected' : ''}>Move → ${escapeHtml(x.name)}</option>`).join('')}</select>
              <button onclick="pushPlaylistToSpotify('${pl.id}')" class="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px]">Spotify ↗</button>
              <button onclick="deletePlaylist('${pl.id}')" class="px-2 py-1 rounded border border-white/10 text-zinc-500 text-[11px]">✕</button>
            </div>
          </div>
          ${items.map(({ t, i }) => `<div class="flex justify-between items-center gap-2 text-xs pt-1.5 border-t border-white/[0.05]">
            <div class="min-w-0"><span class="text-zinc-200 truncate block">${t.kind === 'movie' ? '🎬 ' : '🎵 '}${escapeHtml(t.title)}</span><span class="text-[11px] text-zinc-500 truncate block">${escapeHtml(t.artist)}</span></div>
            <div class="flex gap-1.5 shrink-0">
              <select onchange="moveTrack('${pl.id}',${i},this.value)" class="bg-[#121217] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-400"><option value="">Move...</option>${playlists.filter(op => op.id !== pl.id).map(op => `<option value="${op.id}">${escapeHtml(op.name)}</option>`).join('')}</select>
              <button onclick="deleteTrack('${pl.id}',${i})" class="text-zinc-500 px-1">✕</button>
            </div>
          </div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
  c.innerHTML = histBox + folderBoxes;
}

function openSaveModal() {
  if (!currentTrack) return;
  document.getElementById('modal-playlist-list').innerHTML = playlists.map(pl => `<button onclick="addCurrentTrack('${pl.id}')" class="w-full text-left px-3 py-2.5 rounded-lg border border-white/10 bg-[#08080A] text-xs flex justify-between"><span>${escapeHtml(pl.name)}</span><span class="mono text-[10px] text-zinc-500">${pl.tracks.length}</span></button>`).join('');
  document.getElementById('save-modal').classList.remove('hidden');
}
function closeSaveModal() { document.getElementById('save-modal').classList.add('hidden'); }
function addCurrentTrack(pid) { const pl = playlists.find(p => p.id === pid); if (pl && currentTrack) { pl.tracks.push({ ...currentTrack }); persist(); closeSaveModal(); showToast('Saved!'); switchTab('library'); } }
function copyRedirectUri() { navigator.clipboard.writeText(document.getElementById('redirect-uri-display').textContent).then(() => showToast('Link copied!')); }
function saveKeys() {
  keys.audd = document.getElementById('input-audd').value.trim(); keys.gemini = document.getElementById('input-gemini').value.trim();
  keys.tmdb = document.getElementById('input-tmdb').value.trim(); keys.spotifyClientId = document.getElementById('input-spotify-id').value.trim();
  persist(); showToast('All keys saved!');
}
async function connectSpotify() {
  saveKeys(); if (!keys.spotifyClientId) return showToast('Paste Spotify Client ID first');
  const v = Array.from(crypto.getRandomValues(new Uint8Array(48)), b => ('0' + b.toString(16)).slice(-2)).join('');
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  const ch = btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  localStorage.setItem('at_pkce_verifier', v);
  const u = new URL('https://accounts.spotify.com/authorize');
  u.searchParams.set('client_id', keys.spotifyClientId); u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', window.location.origin + window.location.pathname);
  u.searchParams.set('scope', 'playlist-modify-public playlist-modify-private');
  u.searchParams.set('code_challenge_method', 'S256'); u.searchParams.set('code_challenge', ch);
  window.location.href = u.toString();
}
async function exchangeSpotifyCode(code) {
  const res = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: keys.spotifyClientId, grant_type: 'authorization_code', code, redirect_uri: window.location.origin + window.location.pathname, code_verifier: localStorage.getItem('at_pkce_verifier') }) });
  const data = await res.json();
  if (data.access_token) { spotifyAuth = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }; localStorage.setItem('at_spotify_auth', JSON.stringify(spotifyAuth)); showToast('Spotify connected!'); }
}
async function pushPlaylistToSpotify(pid) {
  if (!spotifyAuth || Date.now() >= spotifyAuth.expiresAt) { showToast('Connect Spotify in Keys first'); return switchTab('settings'); }
  const pl = playlists.find(p => p.id === pid); const songs = (pl?.tracks || []).filter(t => t.kind !== 'movie');
  if (!songs.length) return showToast('Add a song first');
  const headers = { 'Authorization': 'Bearer ' + spotifyAuth.accessToken, 'Content-Type': 'application/json' };
  showToast('Pushing to Spotify...');
  try {
    const uris = [];
    for (const t of songs) {
      if (t.spotifyUri) { uris.push(t.spotifyUri); continue; }
      const r = await (await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`track:${t.title} artist:${t.artist}`)}&type=track&limit=1`, { headers })).json();
      if (r.tracks?.items?.[0]?.uri) uris.push(r.tracks.items[0].uri);
    }
    if (!uris.length) return showToast('No matching songs');
    const cr = await (await fetch('https://api.spotify.com/v1/me/playlists', { method: 'POST', headers, body: JSON.stringify({ name: pl.name, description: 'Created with AuraTrack', public: false }) })).json();
    if (!cr.id) throw new Error(cr.error?.message || 'Create failed');
    const ad = await fetch(`https://api.spotify.com/v1/playlists/${cr.id}/items`, { method: 'POST', headers, body: JSON.stringify({ uris }) });
    if (!ad.ok) throw new Error('Add tracks failed');
    showToast(`Pushed "${pl.name}"!`);
    if (cr.external_urls?.spotify) window.open(cr.external_urls.spotify, '_blank');
  } catch (e) { showToast('Spotify error: ' + e.message); }
}
// END VAULT
