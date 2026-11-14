async function initApp() {
  document.getElementById('input-audd').value = keys.audd || '';
  document.getElementById('input-gemini').value = keys.gemini || '';
  document.getElementById('input-tmdb').value = keys.tmdb || '';
  document.getElementById('input-spotify-id').value = keys.spotifyClientId || '';
  document.getElementById('redirect-uri-display').textContent = window.location.origin + window.location.pathname;
  const p = new URLSearchParams(window.location.search);
  const code = p.get('code'), shared = p.get('url') || p.get('text') || p.get('title');
  if (code) { await exchangeSpotifyCode(code); window.history.replaceState({}, document.title, window.location.pathname); }
  if (shared) { setCategory('movies'); document.getElementById('movie-query').value = shared; showToast('Loaded from Share menu!'); }
  updateBadges(); renderLibrary();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); else initApp();
// END RADAR
