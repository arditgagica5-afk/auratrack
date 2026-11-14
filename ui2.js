document.getElementById('app').insertAdjacentHTML('beforeend', `
<section id="view-credits" class="hidden space-y-4">
  <div id="history-strip" class="flex gap-2 overflow-x-auto no-scrollbar pb-1"></div>
  <div id="credits-empty" class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-8 text-center space-y-3">
    <p class="text-sm font-medium text-zinc-200">Nothing scanned yet</p>
    <button onclick="switchTab('radar')" class="px-4 py-2 rounded-lg bg-white text-black text-xs font-medium">Go to Radar</button>
  </div>
  <div id="credits-content" class="hidden space-y-4">
    <div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-3">
      <div class="flex items-start gap-3">
        <img id="res-poster" class="hidden w-16 h-24 object-cover rounded-lg border border-white/10 shrink-0" />
        <div class="min-w-0 flex-1">
          <p id="res-badge" class="text-[10px] mono uppercase tracking-widest text-emerald-400 mb-1">Match Found</p>
          <h2 id="res-title" class="text-lg font-semibold text-white truncate"></h2>
          <p id="res-artist" class="text-sm text-zinc-400 truncate"></p>
          <p id="res-album" class="text-xs mono text-zinc-500 mt-0.5 truncate"></p>
        </div>
        <button onclick="openSaveModal()" class="shrink-0 px-3 py-2 rounded-lg bg-white text-black text-xs font-semibold">+ Save</button>
      </div>
      <div class="flex gap-2 pt-2 border-t border-white/[0.06]">
        <a id="btn-sp-search" target="_blank" class="flex-1 text-center py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium">Open in Spotify ↗</a>
        <a id="btn-yt" target="_blank" class="flex-1 text-center py-2 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 text-xs font-medium">YouTube ↗</a>
      </div>
    </div>
    <div class="rounded-xl border border-white/[0.08] bg-[#0D0D11] p-4 space-y-3">
      <div class="flex justify-between border-b border-white/[0.06] pb-2.5">
        <span class="text-xs mono uppercase text-zinc-400">Cast, Crew &amp; Credits</span>
        <span id="credits-source" class="text-[10px] mono text-zinc-500">DATABASE</span>
      </div>
      <div id="credits-list" class="space-y-1 text-xs"></div>
    </div>
  </div>
</section>
<section id="view-library" class="hidden space-y-4">
  <div class="flex items-center justify-between gap-2">
    <div><h2 class="text-lg font-semibold">Vault</h2><p class="text-xs text-zinc-500">History, Songs &amp; Movies</p></div>
    <div class="flex gap-2">
      <button onclick="createFolderPrompt()" class="px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium">+ Folder</button>
      <button onclick="createPlaylistPrompt()" class="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold">+ List</button>
    </div>
  </div>
  <div class="grid grid-cols-3 p-1 bg-[#101014] border border-white/[0.08] rounded-lg text-xs">
    <button onclick="setVaultFilter('all')" id="flt-all" class="py-1.5 rounded bg-white text-black font-semibold">All</button>
    <button onclick="setVaultFilter('music')" id="flt-music" class="py-1.5 rounded text-zinc-400">🎵 Songs</button>
    <button onclick="setVaultFilter('movie')" id="flt-movie" class="py-1.5 rounded text-zinc-400">🎬 Movies</button>
  </div>
  <div id="library-container" class="space-y-4"></div>
</section>`);
// END UI2
