document.getElementById('app').insertAdjacentHTML('beforeend', `
<section id="view-credits" class="hidden space-y-5">
  <div id="credits-empty" class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-8 text-center space-y-3"><p class="text-sm font-medium text-zinc-200">Nothing scanned yet</p><button onclick="switchTab('radar')" class="px-4 py-2 rounded-lg bg-white text-black text-xs font-medium">Go to Radar</button></div>
  <div id="credits-content" class="hidden space-y-4">
    <div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-3">
      <div class="flex items-start gap-3">
        <img id="res-poster" class="hidden w-16 h-24 object-cover rounded-lg border border-white/10 shrink-0" />
        <div class="min-w-0 flex-1"><p id="res-badge" class="text-[10px] mono uppercase tracking-widest text-emerald-400 mb-1">Match Found</p><h2 id="res-title" class="text-lg font-semibold text-white truncate"></h2><p id="res-artist" class="text-sm text-zinc-400 truncate"></p><p id="res-album" class="text-xs mono text-zinc-500 mt-0.5 truncate"></p></div>
        <button onclick="openSaveModal()" class="shrink-0 px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold">+ Save</button>
      </div>
      <div class="flex gap-2 pt-2 border-t border-white/[0.06]">
        <a id="btn-sp-search" target="_blank" class="flex-1 text-center py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium">Open in Spotify ↗</a>
        <a id="btn-yt" target="_blank" class="flex-1 text-center py-2 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 text-xs font-medium">YouTube ↗</a>
      </div>
    </div>
    <div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-3">
      <div class="flex justify-between border-b border-white/[0.06] pb-2.5"><span class="text-xs mono uppercase text-zinc-400">Cast, Crew &amp; Credits</span><span id="credits-source" class="text-[10px] mono text-zinc-500">DATABASE</span></div>
      <div id="credits-list" class="space-y-1 text-xs"></div>
    </div>
  </div>
</section>
<section id="view-library" class="hidden space-y-5">
  <div class="flex items-center justify-between gap-2"><div><h2 class="text-lg font-semibold">Vault</h2><p class="text-xs text-zinc-500">Songs, Movies &amp; Shows organized in folders.</p></div><div class="flex gap-2"><button onclick="createFolderPrompt()" class="px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium">+ Folder</button><button onclick="createPlaylistPrompt()" class="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold">+ List</button></div></div>
  <div id="library-container" class="space-y-4"></div>
</section>
<section id="view-settings" class="hidden space-y-4">
  <div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-5 space-y-4">
    <div class="flex justify-between items-center"><div><h2 class="text-sm font-semibold">1. Music Scanner (AudD)</h2><p class="text-xs text-zinc-400">Free at <strong>dashboard.audd.io</strong></p></div><span id="badge-audd" class="text-[10px] mono px-2 py-0.5 rounded border"></span></div>
    <input id="input-audd" type="password" placeholder="Paste AudD API token..." class="w-full bg-[#08080A] border border-white/10 rounded-lg px-3 py-2 text-xs mono text-white" />
    <div class="border-t border-white/[0.06] pt-3 space-y-2"><div class="flex justify-between items-center"><div><h2 class="text-sm font-semibold">2. Movie Scene AI (Gemini)</h2><p class="text-xs text-zinc-400">Free at <strong>aistudio.google.com</strong></p></div><span id="badge-gemini" class="text-[10px] mono px-2 py-0.5 rounded border"></span></div><input id="input-gemini" type="password" placeholder="Paste Gemini API key..." class="w-full bg-[#08080A] border border-white/10 rounded-lg px-3 py-2 text-xs mono text-white" /></div>
    <div class="border-t border-white/[0.06] pt-3 space-y-2"><div class="flex justify-between items-center"><div><h2 class="text-sm font-semibold">3. Movie Cast &amp; Posters (TMDB)</h2><p class="text-xs text-zinc-400">Free at <strong>themoviedb.org/settings/api</strong></p></div><span id="badge-tmdb" class="text-[10px] mono px-2 py-0.5 rounded border"></span></div><input id="input-tmdb" type="password" placeholder="Paste TMDB Key or Token..." class="w-full bg-[#08080A] border border-white/10 rounded-lg px-3 py-2 text-xs mono text-white" /></div>
    <div class="border-t border-white/[0.06] pt-3 space-y-2"><div class="flex justify-between items-center"><div><h2 class="text-sm font-semibold">4. Spotify Push</h2></div><span id="badge-spotify" class="text-[10px] mono px-2 py-0.5 rounded border"></span></div><div class="flex items-center gap-2"><code id="redirect-uri-display" class="flex-1 p-2 rounded bg-black border border-white/10 text-[10px] mono text-emerald-400 break-all"></code><button onclick="copyRedirectUri()" class="shrink-0 px-2.5 py-2 rounded bg-white/10 text-[11px]">Copy</button></div><input id="input-spotify-id" type="text" placeholder="Paste Spotify Client ID..." class="w-full bg-[#08080A] border border-white/10 rounded-lg px-3 py-2 text-xs mono text-white" /></div>
    <div class="flex flex-wrap gap-2 pt-2"><button onclick="saveKeys()" class="px-4 py-2.5 rounded-lg bg-white text-black text-xs font-semibold">Save All Keys</button><button onclick="connectSpotify()" class="px-4 py-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-medium">Connect Spotify</button><a href="guide.html" class="ml-auto px-3 py-2.5 rounded-lg border border-white/10 text-xs text-zinc-400">Manual ↗</a></div>
  </div>
</section>`);

document.getElementById('modals').innerHTML = `
<div id="save-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"><div class="w-full max-w-md rounded-xl border border-white/15 bg-[#101014] p-5 space-y-4"><div class="flex justify-between items-center"><h3 class="text-sm font-semibold">Save to List</h3><button onclick="closeSaveModal()" class="text-xs text-zinc-400">Close</button></div><div id="modal-playlist-list" class="space-y-2 max-h-60 overflow-y-auto"></div></div></div>
<div id="app-toast" class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-zinc-900 border border-white/20 text-xs text-white shadow-xl opacity-0 pointer-events-none transition-opacity whitespace-nowrap"></div>`;
// END UI2
