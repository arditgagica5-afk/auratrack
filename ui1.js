document.getElementById('hdr').innerHTML = `
<header class="sticky top-0 z-30 border-b border-white/[0.08] bg-[#08080A]/90 backdrop-blur-md">
  <div class="max-w-xl mx-auto px-4 h-12 flex items-center justify-between">
    <div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-emerald-400"></span><span class="text-xs font-semibold tracking-wider uppercase">AuraTrack</span><span class="text-[10px] mono text-zinc-500 border border-white/10 px-1.5 py-0.5 rounded">3.0</span></div>
    <div class="flex items-center gap-1 p-0.5 bg-[#121216] border border-white/10 rounded-lg text-[11px]">
      <button onclick="setCategory('music')" id="cat-music" class="px-2.5 py-1 rounded-md bg-white text-black font-semibold">Music</button>
      <button onclick="setCategory('movies')" id="cat-movies" class="px-2.5 py-1 rounded-md text-zinc-400">Movies &amp; TV</button>
    </div>
    <div id="spotify-pill" class="hidden sm:block text-[10px] mono text-zinc-400 border border-white/10 px-2 py-1 rounded">SP: OFF</div>
  </div>
  <nav class="max-w-xl mx-auto px-4 flex items-center gap-6 overflow-x-auto text-xs border-t border-white/[0.05] h-10 no-scrollbar">
    <button onclick="switchTab('radar')" id="tab-radar" class="tab-btn h-full border-b-2 border-white text-white font-medium whitespace-nowrap">Radar</button>
    <button onclick="switchTab('credits')" id="tab-credits" class="tab-btn h-full border-b-2 border-transparent text-zinc-500 whitespace-nowrap">Credits</button>
    <button onclick="switchTab('library')" id="tab-library" class="tab-btn h-full border-b-2 border-transparent text-zinc-500 whitespace-nowrap">Vault</button>
    <button onclick="switchTab('settings')" id="tab-settings" class="tab-btn h-full border-b-2 border-transparent text-zinc-500 whitespace-nowrap">Keys / Setup</button>
  </nav>
</header>`;

document.getElementById('app').insertAdjacentHTML('beforeend', `
<section id="view-radar" class="space-y-5 flex-1 flex flex-col">
  <div id="section-music-radar" class="space-y-5 flex-1 flex flex-col">
    <div><p class="text-[11px] mono uppercase tracking-[0.18em] text-zinc-500">Music Radar</p><h1 class="text-2xl font-semibold text-white">Tap the vinyl to scan.<br><span class="text-zinc-500">Trace everyone in the session.</span></h1></div>
    <div class="grid grid-cols-2 p-1 bg-[#101014] border border-white/[0.08] rounded-lg">
      <button onclick="setInputMode('mic')" id="mode-mic" class="py-2 rounded-md text-xs font-medium bg-zinc-100 text-black">Live Microphone</button>
      <button onclick="setInputMode('file')" id="mode-file" class="py-2 rounded-md text-xs font-medium text-zinc-400">Upload Song File</button>
    </div>
    <div class="relative flex-1 min-h-[320px] rounded-xl border border-white/[0.08] bg-[#0D0D11] p-5 flex flex-col justify-between overflow-hidden">
      <div class="relative flex justify-between text-[11px] mono text-zinc-500"><span id="radar-input-label">MODE // LIVE MIC</span><span>48KHZ</span></div>
      <div id="mic-controls" class="relative my-3 flex flex-col items-center gap-4">
        <button onclick="toggleMicScan()" id="vinyl-btn" class="relative w-44 h-44 flex items-center justify-center active:scale-95 transition-transform">
          <span id="vinyl-ring-1" class="hidden absolute inset-0 rounded-full border border-emerald-400/50 ring-pulse-1 pointer-events-none"></span>
          <span id="vinyl-ring-2" class="hidden absolute inset-0 rounded-full border border-white/30 ring-pulse-2 pointer-events-none"></span>
          <div id="vinyl-disc" class="relative w-40 h-40 rounded-full bg-[#111115] border border-white/15 shadow-2xl flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 rounded-full pointer-events-none" style="background:conic-gradient(from 15deg,rgba(255,255,255,0.11) 0deg 38deg,transparent 38deg 180deg,rgba(255,255,255,0.08) 180deg 218deg,transparent 218deg 360deg);"></div>
            <div class="w-32 h-32 rounded-full border border-white/[0.07] flex items-center justify-center"><div class="w-24 h-24 rounded-full border border-white/[0.07] flex items-center justify-center"><div class="w-14 h-14 rounded-full bg-zinc-100 text-black flex flex-col items-center justify-center border-2 border-zinc-800"><span class="text-[9px] mono font-bold leading-none">AURA</span><span class="w-2.5 h-2.5 rounded-full bg-[#0D0D11] my-0.5"></span><span class="text-[7px] mono text-zinc-600 leading-none">33RPM</span></div></div></div>
          </div>
        </button>
        <div class="text-center space-y-1.5">
          <div id="vinyl-eq" class="flex items-center justify-center gap-1 h-4"><span class="w-1 h-full bg-zinc-600 rounded-full"></span><span class="w-1 h-full bg-zinc-600 rounded-full"></span><span class="w-1 h-full bg-zinc-600 rounded-full"></span><span class="w-1 h-full bg-zinc-600 rounded-full"></span><span class="w-1 h-full bg-zinc-600 rounded-full"></span></div>
          <p id="scan-status-title" class="text-xs font-medium text-white">Tap vinyl to listen</p><p id="scan-status-sub" class="text-[11px] text-zinc-500">Plays music near your mic for 6 seconds</p>
        </div>
      </div>
      <div id="file-controls" class="hidden relative my-8 flex flex-col items-center"><label class="w-full max-w-[260px] py-5 px-4 rounded-xl border border-dashed border-white/25 bg-white/[0.02] text-center cursor-pointer space-y-1"><div class="text-xs font-medium text-white">Choose Audio File</div><div class="text-[10px] mono text-zinc-500">MP3 / WAV / M4A</div><input type="file" accept="audio/*" class="hidden" onchange="scanAudioFile(this.files[0])" /></label></div>
      <div class="relative space-y-2"><div class="text-center"><button onclick="runDemoTrack()" class="text-[11px] mono text-zinc-500 underline underline-offset-4">Try Demo Song</button></div><div class="border-t border-white/[0.06] pt-2.5 flex justify-between text-[11px] mono text-zinc-500"><span id="console-log">&gt; ready.</span><span id="console-state">IDLE</span></div></div>
    </div>
  </div>
  <div id="section-movies-radar" class="hidden space-y-5 flex-1 flex flex-col">
    <div><p class="text-[11px] mono uppercase tracking-[0.18em] text-zinc-500">Scene &amp; Reel Identifier</p><h1 class="text-2xl font-semibold text-white">Drop a Reel clip or screenshot.<br><span class="text-zinc-500">Get the movie, cast &amp; crew.</span></h1></div>
    <div class="flex-1 rounded-xl border border-white/[0.08] bg-[#0D0D11] p-5 flex flex-col justify-between gap-4">
      <div class="space-y-3">
        <label class="block w-full py-6 px-4 rounded-xl border border-dashed border-white/25 bg-white/[0.02] text-center cursor-pointer space-y-1">
          <div class="text-sm font-medium text-white">📷 Upload Screenshot or Video Clip</div>
          <div id="movie-file-label" class="text-[11px] mono text-zinc-500">From TikTok, IG Reels, or YouTube Shorts</div>
          <input id="movie-file" type="file" accept="image/*,video/*" class="hidden" onchange="onMovieFilePicked(this.files[0])" />
        </label>
        <textarea id="movie-query" rows="3" placeholder="Optional: describe scene, quote, or paste caption..." class="w-full bg-[#08080A] border border-white/10 rounded-lg p-3 text-xs text-white"></textarea>
        <button onclick="identifyMovieScene()" id="btn-scan-movie" class="w-full py-3 rounded-lg bg-white text-black text-xs font-semibold">Identify Movie / TV Show</button>
        <div class="text-center"><button onclick="runDemoMovie()" class="text-[11px] mono text-zinc-500 underline underline-offset-4">Try Demo Movie Scene</button></div>
      </div>
      <div class="border-t border-white/[0.06] pt-2.5 flex justify-between text-[11px] mono text-zinc-500"><span id="movie-console">&gt; ready for clip or screenshot.</span><span>AI + TMDB</span></div>
    </div>
  </div>
</section>`);
// END UI1
