let selectedMovieFile = null;

function setCategory(cat) {
  document.getElementById('section-music-radar').classList.toggle('hidden', cat !== 'music');
  document.getElementById('section-movies-radar').classList.toggle('hidden', cat !== 'movies');
  document.getElementById('cat-music').className = cat === 'music' ? 'px-2.5 py-1 rounded-md bg-white text-black font-semibold' : 'px-2.5 py-1 rounded-md text-zinc-400';
  document.getElementById('cat-movies').className = cat === 'movies' ? 'px-2.5 py-1 rounded-md bg-white text-black font-semibold' : 'px-2.5 py-1 rounded-md text-zinc-400';
  switchTab('radar');
}

function onMovieFilePicked(file) {
  selectedMovieFile = file || null;
  document.getElementById('movie-file-label').textContent = file ? `Selected: ${file.name}` : 'From TikTok, IG Reels, or YouTube Shorts';
}

async function extractFrames(file) {
  if (file.type.startsWith('image/')) {
    return [await new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 768 / img.width), c = document.createElement('canvas');
        c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.src = URL.createObjectURL(file);
    })];
  }
  return await new Promise((res) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = URL.createObjectURL(file);
    v.onloadedmetadata = async () => {
      const frames = [], marks = [0.2, 0.5, 0.8];
      for (const m of marks) {
        v.currentTime = Math.max(0.2, v.duration * m); await new Promise(r => v.onseeked = r);
        const s = Math.min(1, 640 / v.videoWidth), c = document.createElement('canvas');
        c.width = v.videoWidth * s; c.height = v.videoHeight * s;
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        frames.push(c.toDataURL('image/jpeg', 0.75).split(',')[1]);
      }
      res(frames);
    };
  });
}

async function callGeminiScene(promptText, frames) {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  const parts = [{ text: promptText }, ...frames.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))];
  for (const mod of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys.gemini },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } })
    });
    if (res.status === 404) continue;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini API error');
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  }
  throw new Error('No Gemini model available for your key');
}

async function identifyMovieScene() {
  const text = document.getElementById('movie-query').value.trim();
  if (!selectedMovieFile && !text) return showToast('Upload a clip/screenshot or type a scene');
  if (!keys.gemini) { showToast('Paste Gemini API key in Keys / Setup'); return switchTab('settings'); }
  const mc = document.getElementById('movie-console'); mc.textContent = '> analyzing scene...';
  try {
    const frames = selectedMovieFile ? await extractFrames(selectedMovieFile) : [];
    const prompt = `Identify the movie or TV show from these frames and/or note: "${text}". Reply ONLY in JSON: {"title":"Exact Title","type":"movie or tv","year":"YYYY","scene":"brief scene note","director":"Director","cast":["Actor 1","Actor 2"]}`;
    const guess = await callGeminiScene(prompt, frames);
    mc.textContent = '> loading cast & crew...';
    await showMovieCredits(guess); mc.textContent = '> ready.';
  } catch (e) { mc.textContent = '> error: ' + e.message; showToast(e.message); }
}

async function runDemoMovie() {
  await showMovieCredits({ title: 'Interstellar', type: 'movie', year: '2014', scene: 'Docking Scene', director: 'Christopher Nolan', cast: ['Matthew McConaughey', 'Anne Hathaway'] });
}

async function showMovieCredits(info) {
  currentTrack = { kind: 'movie', title: info.title || 'Unknown', artist: `${(info.type || 'movie').toUpperCase()} (${info.year || ''})`, album: info.scene || '' };
  document.getElementById('credits-empty').classList.add('hidden');
  document.getElementById('credits-content').classList.remove('hidden');
  document.getElementById('res-badge').textContent = (info.type || 'MOVIE').toUpperCase() + ' MATCH';
  document.getElementById('res-title').textContent = currentTrack.title;
  document.getElementById('res-artist').textContent = currentTrack.artist;
  document.getElementById('res-album').textContent = currentTrack.album;
  const poster = document.getElementById('res-poster'); poster.classList.add('hidden');
  let posterUrl = '';

  const q = encodeURIComponent(`${currentTrack.title} ${info.year || ''}`);
  const spBtn = document.getElementById('btn-sp-search');
  spBtn.textContent = 'Google / Watch ↗'; spBtn.href = `https://www.google.com/search?q=${q}+where+to+watch`;
  document.getElementById('btn-yt').href = `https://www.youtube.com/results?search_query=${q}+trailer+scene`;
  document.getElementById('credits-source').textContent = keys.tmdb ? 'TMDB + AI' : 'GEMINI AI';

  let rows = [];
  if (info.director) rows.push({ role: 'Director', name: info.director });
  (info.cast || []).forEach(a => rows.push({ role: 'Cast (AI)', name: a }));

  if (keys.tmdb && info.title) {
    try {
      const auth = keys.tmdb.startsWith('eyJ'), headers = auth ? { Authorization: 'Bearer ' + keys.tmdb } : {}, qs = auth ? '' : `&api_key=${encodeURIComponent(keys.tmdb)}`;
      const s = await (await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(info.title)}${qs}`, { headers })).json();
      const hit = (s.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv');
      if (hit) {
        const d = await (await fetch(`https://api.themoviedb.org/3/${hit.media_type}/${hit.id}?append_to_response=credits${qs ? '&' + qs.slice(1) : ''}`, { headers })).json();
        if (d.poster_path) { posterUrl = 'https://image.tmdb.org/t/p/w342' + d.poster_path; poster.src = posterUrl; poster.classList.remove('hidden'); }
        currentTrack.title = d.title || d.name || currentTrack.title;
        currentTrack.artist = `${hit.media_type.toUpperCase()} • ${(d.release_date || d.first_air_date || '').slice(0, 4)} • ★ ${(d.vote_average || 0).toFixed(1)}`;
        document.getElementById('res-title').textContent = currentTrack.title;
        document.getElementById('res-artist').textContent = currentTrack.artist;
        rows = [];
        (d.credits?.crew || []).filter(c => ['Director', 'Writer', 'Screenplay', 'Producer', 'Director of Photography', 'Original Music Composer'].includes(c.job)).slice(0, 8).forEach(c => rows.push({ role: c.job, name: c.name }));
        (d.credits?.cast || []).slice(0, 12).forEach(c => rows.push({ role: c.character || 'Actor', name: c.name }));
      }
    } catch (e) {}
  }

  document.getElementById('credits-list').innerHTML = rows.length ? rows.map(r => `<div class="flex justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0"><span class="mono uppercase text-[10px] text-zinc-500 shrink-0">${escapeHtml(r.role)}</span><span class="font-medium text-zinc-200 text-right">${escapeHtml(r.name)}</span></div>`).join('') : '<p class="text-zinc-500">Add a TMDB key for full cast &amp; posters.</p>';
  saveToHistory({ ...currentTrack, poster: posterUrl, credits: rows });
  switchTab('credits');
}
// END MOVIES
