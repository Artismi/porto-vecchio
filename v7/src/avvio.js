/* Porto Vecchio — [avvio] le prime cose, prima di tutto il resto (ANALISI_CARICAMENTO P2a, P4).
   1. Il nome della scheda video si legge UNA volta, appena nasce il primo contesto WebGL (three crea quello del gioco in R.init),
      quando la scheda non ha ancora niente da fare. Chiederlo dopo (main.js gpuName, peso_schermo.js) fermava la pagina in coda
      dietro a tutte le compilazioni e i caricamenti già mandati (35-50 s in SwiftShader). Chi lo vuole legge PV_GPU().
   2. I kit (assets/mk, che boot() aspetta) si scaricano da subito, mentre si calcola la mappa: prima partivano dopo i 20-30 s di
      calcolo. Con <link rel=preload>: solo i byte, nella cache del browser; Kit.load li chiede come prima e li trova lì. I personaggi
      (assets/mc) restano dove erano (protagonista_ui.js, Models.attach: chiesti a fine pagina, letti dopo R.init).
   3. PV_V(url): l'indirizzo con l'impronta del file (?v=…, da build.py: window.PV_VER), così assets/ può stare in cache per sempre.
   Da file:// non si scarica niente in anticipo (file_shim.js serve i .json.js). Il punto 2 per ora è spento: ?precarico lo accende.                    */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  // 3. l'impronta del file
  const VER = window.PV_VER || {};
  window.PV_V = u => { const v = VER[u]; return v ? u + (u.indexOf('?') < 0 ? '?' : '&') + 'v=' + v : u; };
  // 1. il nome della scheda video, letto una volta sola
  let nome = window.PV_GPU_NOME;   // undefined finché non c'è un contesto ([profilo] profilo.js l'ha già letto, se ha potuto)
  const leggi = gl => { try { const e = gl.getExtension('WEBGL_debug_renderer_info'); nome = String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (x) { nome = ''; } };
  try {
    const P = HTMLCanvasElement.prototype, g0 = P.getContext;
    P.getContext = function (type) {
      const c = g0.apply(this, arguments);
      if (nome === undefined && c && /^(webgl2?|experimental-webgl)$/.test(type)) leggi(c);   // (non si toglie: altri moduli avvolgono getContext dopo)
      return c;
    };
  } catch (e) { }
  // chi arriva prima del contesto (o senza WebGL) ha '' ; gl: il contesto da cui leggerlo se non è ancora stato letto
  window.PV_GPU = gl => { if (nome === undefined && gl) leggi(gl); return nome || ''; };
  // 2. i modelli in anticipo
  const Q = location.search || '';
  // [avvio] PER ORA SPENTO (?precarico lo accende, ?precarico=fetch nella variante col fetch): in 6 giri su 6 con i kit in anticipo
  // R.init è durato 1,5-2 volte tanto e il processo della scheda video lavorava per tutto R.init (senza: fermo). Causa da capire
  if (location.protocol === 'file:' || !/[?&]precarico\b/.test(Q) || !window.fetch) return;
  // [compressi] il .glb.gz se si può aprire (kit.js lo chiede per primo), se no il .glb
  const GLBX = typeof DecompressionStream !== 'undefined' && typeof WebAssembly !== 'undefined' && !/[?&]noglbgz\b/.test(Q) ? '.glb.gz' : '.glb';
  const KITS = window.PV_KITS = ['bkit', 'rurban', 'food', 'arcade', 'train', 'grave', 'urban', 'natura', 'urbano', 'casa', 'stazione', 'garage', 'tortura'];
  if (!/[?&]precarico=fetch\b/.test(Q)) {
    // <link rel=preload>: il browser scarica e tiene i byte nella sua cache, e il fetch di Kit.load (stesso indirizzo, stesso modo cors)
    // li trova lì. Il codice resta com'era, cambia solo quando arrivano i byte. Con un fetch qui (?precarico=fetch) i kit si leggevano
    // prima della fine della pagina e, nelle misure, la scheda video restava occupata per tutto R.init (R.init +60-100 s)
    const h = document.head || document.documentElement;
    KITS.forEach(k => { const l = document.createElement('link'); l.rel = 'preload'; l.as = 'fetch'; l.crossOrigin = 'anonymous'; l.href = PV_V('assets/mk/kit_' + k + GLBX); h.appendChild(l); });
    return;
  }
  const PRE = window.__pvPre = {};
  const scarica = u => (PRE[u] = fetch(PV_V(u)).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null));
  KITS.forEach(k => scarica('assets/mk/kit_' + k + GLBX));
  // kit.js: il .glb già scaricato (una volta sola: poi il ArrayBuffer si lascia andare)
  window.__pvPreso = u => { const p = PRE[u]; if (p) delete PRE[u]; return p || null; };
})();
