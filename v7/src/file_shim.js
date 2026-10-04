/* [file://] Aperto col doppio clic (file://) il browser vieta fetch() sui file della cartella, e i modelli
   (assets/*.json) non arrivano: i personaggi restano a blocchetti. Qui, solo in quel caso, ogni richiesta
   a assets/...json viene servita dal gemello assets/...json.js, caricato con un <script> (che file:// permette).
   Con AVVIA.bat (http://localhost) questo pezzo non fa nulla. I .json.js si rifanno con strumenti_inverno/pack_file.py */
(function () {
  if (location.protocol !== 'file:' || !window.fetch) return;
  const real = window.fetch.bind(window), PVA = window.PVA = window.PVA || {}, wait = {};
  function rel(u) { const m = /(?:^|\/)(assets\/[^?#]+\.json)(?:[?#].*)?$/.exec(decodeURIComponent(u)); return m ? m[1] : null; }
  function viaScript(k) {
    if (PVA[k] !== undefined) return Promise.resolve(PVA[k]);
    return wait[k] || (wait[k] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = k + '.js'; s.onload = () => PVA[k] !== undefined ? res(PVA[k]) : rej(new Error('vuoto ' + k)); s.onerror = () => rej(new Error('manca ' + k + '.js')); document.head.appendChild(s); }));
  }
  window.fetch = function (input, init) {
    const u = typeof input === 'string' ? input : (input && input.url) || '', k = rel(u);
    if (!k) return real(input, init);
    return viaScript(k).then(t => new Response(t, { status: 200, headers: { 'Content-Type': 'application/json' } }), e => { console.warn('[file://]', e.message); return new Response('', { status: 404 }); });
  };
})();
