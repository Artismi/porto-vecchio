/* Porto Vecchio — [peso] lo schermo si adatta al telefono (v7).
   1. Il livello della scheda video, deciso da solo all'avvio (nessun menu): dal nome della scheda (WEBGL_debug_renderer_info) si sceglie
      'bassa' (Mali vecchi e di fascia bassa, Adreno 3xx-5xx e 60x-61x, PowerVR, i disegnatori in software), 'media' (Adreno 616-650,
      Mali-G7x/G610, Xclipse, le Intel integrate) o 'alta' (il resto: Apple, Adreno 660+, Mali-G7xx recenti, le schede da computer).
      ?livello=bassa|media|alta lo forza per le prove. window.__pesoLivello lo dice.
   2. Sul telefono (puntatore grossolano, o ?leggera) la risoluzione interna della scena segue il tempo del fotogramma: se per 1,5 s i
      fotogrammi stanno sopra il 118% del ritmo (60 Hz, o 30 quando main.js ha fermato il ritmo a 30), si scende di un gradino; se per 6 s
      stanno sotto il 90%, si risale. Gradini 1, 0,9, 0,8 (0,72 sulla bassa); al più un cambio ogni 3 s. L'interfaccia è nel DOM e la tela
      finale resta a piena risoluzione (render.js [sviluppo]): restano nitide. Sul computer ci pensa già main.js.
   ?nopesoschermo spegne tutto (come prima: telefono a risoluzione fissa).                                                             */
var PesoSchermo = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nopeso(schermo)?\b/.test(Q);
  const GRADINI = { bassa: [1, .9, .8, .72], media: [1, .9, .8], alta: [1, .9] };
  const S = { livello: null, nome: '', telefono: false, gradino: 0, buf: [], ultimo: 0, cambio: 0, sopra: 0, sotto: 0, bloccato: false, cambi: 0 };
  function livelloDa(nome) {
    const n = (nome || '').toLowerCase(), f = (Q.match(/[?&]livello=(bassa|media|alta)\b/) || [])[1]; if (f) return f;
    if (/swiftshader|llvmpipe|softpipe|software|microsoft basic/.test(n)) return 'bassa';
    const ad = n.match(/adreno[^0-9]*(\d{3})/); if (ad) { const v = +ad[1]; return v < 616 ? 'bassa' : v < 660 ? 'media' : 'alta'; }
    const ma = n.match(/mali[- ]?(g|t)?(\d+)/); if (ma) { const v = +ma[2]; if (ma[1] !== 'g' || v < 71) return 'bassa'; if (v < 78) return 'media'; return v >= 710 ? 'alta' : 'media'; }
    if (/powervr|sgx|vivante|videocore/.test(n)) return 'bassa';
    if (/xclipse|intel/.test(n)) return 'media';
    return 'alta';
  }
  function avvia() {
    const pv = window.__pv; if (!pv || !pv.R || !pv.R.__models || !pv.R.__models.renderer) { setTimeout(avvia, 500); return; }
    const rd = pv.R.__models.renderer, gl = rd.getContext();
    try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); S.nome = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { S.nome = ''; }
    S.livello = livelloDa(S.nome); window.__pesoLivello = { livello: S.livello, scheda: S.nome };
    S.telefono = !!(pv.R.phone || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches));
    if (!S.telefono || !ON) return;
    // il ritmo: l'intervallo fra due fotogrammi del gioco (R.frame), non quello del browser (con il ritmo a 30 il gioco salta un giro su due)
    const R = pv.R, f0 = R.frame;
    R.frame = function () { const t = performance.now(); if (S.ultimo) { S.buf.push(t - S.ultimo); if (S.buf.length > 60) S.buf.shift(); } S.ultimo = t; valuta(t); return f0.apply(this, arguments); };
    if (S.livello === 'bassa' && R.setRes) { S.gradino = 1; R.setRes(GRADINI.bassa[1]); }   // la bassa parte un gradino sotto
  }
  function valuta(t) {
    const R = window.__pv.R; if (S.bloccato || !R.setRes || S.buf.length < 30 || window.__pv.ui.intro) return;
    const b = S.buf.slice().sort((x, y) => x - y), med = b[b.length >> 1]; if (med > 250) return;   // una pausa, un caricamento: non conta
    const T = med > 25 ? 1000 / 30 : 1000 / 60, G = GRADINI[S.livello] || GRADINI.media, dt = Math.min(100, med);
    if (med > T * 1.18) { S.sopra += dt; S.sotto = 0; } else if (med < T * .9) { S.sotto += dt; S.sopra = 0; } else { S.sopra = 0; S.sotto = 0; }
    if (t - S.cambio < 3000) return;
    if (S.sopra > 1500 && S.gradino < G.length - 1) { S.gradino++; R.setRes(G[S.gradino]); S.cambio = t; S.sopra = 0; S.buf.length = 0; S.cambi++; }
    else if (S.sotto > 6000 && S.gradino > 0) { S.gradino--; R.setRes(G[S.gradino]); S.cambio = t; S.sotto = 0; S.buf.length = 0; S.cambi++; }
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') setTimeout(avvia, 0);
  return { ON, livelloDa, get stato() { return Object.assign({}, S, { buf: undefined }); }, blocca() { S.bloccato = true; } };
})();
if (typeof window !== 'undefined') window.PesoSchermo = PesoSchermo;
