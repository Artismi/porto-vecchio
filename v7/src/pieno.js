/* Porto Vecchio — [pieno] LO STRATO DEL PIENO: la vita della strada all'altezza degli occhi (di serie; ?nopieno lo spegne).
   Il committente: «lo stile è ancora vuoto e neutro». La camera guarda giù sul personaggio: vede il suolo fino a ~35 m e i primi 3 m
   delle facciate. Lì la città era nuda: sui percorsi principali metà dei punti di facciata senza niente entro 1,2 m sotto i 3 m
   (squadra/pieno/ANALISI.md). Questo strato mette la mano di chi ci vive, coi pezzi che il gioco ha già (la scena dei writer di
   strada_dipinta.js: le crew, i nomi, i manifesti; il disegnatore di writer_arte.js: tag, throw-up, adesivi, manifesti a strati):
   - SUI MURI, nei moduli di muro pieno del piano terra (b.__win 'wall', mai su porte, vetrine, finestre, insegne, lavori dei writer):
     la serranda abbassata e dipinta (con le guide e il cassonetto), i manifesti a strati, i manifesti funebri vicino alle chiese,
     le tag in colonna con la colatura, il throw-up dove i writer stanno, gli adesivi a grappolo all'altezza della mano accanto alle
     porte, il numero civico di maiolica;
   - A TERRA: la vernice caduta sotto i lavori, il gesso dei bambini (la campana, i disegni) nelle piazze e nei vicoli, i mozziconi e
     la macchia davanti ai bar, l'olio sul porto;
   - LE PICCOLE STORIE (3D, vertici colorati): fuori dal bar le sedie di plastica e la cassa di birra, davanti all'alimentari e alla
     pescheria le cassette, accanto alla porta del vicolo la sedia della signora, al throw-up la cassa e le bombolette, sotto le edicole
     votive i lumini e i fiori, il bucato teso nei vicoli stretti.
   IL RITMO: la zona del muro e il ritmo di strada_dipinta.js (zonaPunto, ritmo): fitto vicino ai bar, alle botteghe, ai sottopassi e
   ai posti dei writer, calmo nelle vie di casa; niente sulla chiesa e sui palazzi del regime (solo i manifesti funebri accanto).
   L'ADERENZA: ogni cosa sul muro si verifica coi raggi dei graffiti (Writing.__ray.rayWall: lo stesso piano al centro e ai bordi,
   sopra lo zoccolo), le cose a terra stanno sul marciapiede, sulla piazza o nel vicolo, mai in carreggiata, mai davanti a porte e
   vetrine (1,1 m), mai sopra un tombino.
   IL COSTO (il telefono è legato ai disegni): UNA tessitura (l'atlante 2048×1024, sul telefono 1024×512) disegnata a pezzi nei primi
   secondi; DUE disegni: tutte le decalcomanie in un InstancedMesh (il riquadro dell'atlante per istanza), tutte le cose 3D in una
   geometria sola rifatta quando la camera si sposta di qualche metro. La pianta si fa a celle di 24 m attorno alla camera, pochi
   millisecondi a fotogramma. Fuori dall'impronta dei tasselli (non tocca la città: si appoggia sopra, anche ai tasselli).
   window.__PIENO: lo stato; Pieno.elenco(): quello che è posato (per strumenti/pieno_censimento.js). */
var Pieno = (function () {
  'use strict';
  const NOOP = { attivo: false, elenco: () => [], stato: () => null };
  if (typeof window === 'undefined' || typeof THREE === 'undefined' || typeof Render === 'undefined') return NOOP;
  const Q = location.search || '';
  if (/[?&](nopieno|vecchio|cottae)\b/.test(Q) || window.PV_STUDIO) return NOOP;   // cottae: la cottura dei tasselli (strumenti/tassella.js) non lo vede
  const TEL = /[?&](leggera|bassa)\b/.test(Q) || (!/[?&]alta\b/.test(Q) && (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })());
  const G = typeof Game !== 'undefined' ? Game : null; if (!G) return NOOP;
  const TS = G.TS, GW = G.GW, GH = G.GH, T = G.T || (G.MAP.world && G.MAP.world.T);
  const RV = TEL ? 30 : 40, CELL = 24, BUDGET = TEL ? 3 : 5;   // raggio di vista, cella della pianta, ms per fotogramma
  const S = { on: true, celle: 0, decal: 0, cose: 0, verts: 0, atlante: 0, err: null, ms: 0, raggi: 0, scarti: {} };
  window.__PIENO = S;
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hh(a, b, c) { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const tileAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : G.MAP.grid[ty * GW + tx]; };
  const PIEDI = new Set([T.COB, T.PIAZZA, T.WALK, T.QUAY, T.DIRT]);   // dove si posa a terra (non la carreggiata T.VIA)
  const STRADA = new Set([T.COB, T.PIAZZA, T.WALK, T.QUAY, T.DIRT, T.VIA, T.STAIRS]);
  const SD = () => (typeof StradaDipinta !== 'undefined' && StradaDipinta.zonaPunto ? StradaDipinta : null);
  const WA = () => (typeof WriterArte !== 'undefined' && WriterArte.art ? WriterArte : null);

  // ================= L'ATLANTE: una tessitura per tutto =================
  // le celle in pixel dell'atlante pieno (2048×1024); sul telefono tutto a metà. [x, y, w, h]
  let K = 1; const AW = 2048, AH = 1024;   // K: la scala del disegno (l'atlante si disegna pieno, una volta, in strumenti/pieno_atlante.js)
  const CELLE = {};
  const cella = (nome, x, y, w, h) => { CELLE[nome] = [x, y, w, h]; };
  for (let i = 0; i < 6; i++) cella('serranda' + i, i * 256, 0, 256, 256);
  cella('funebre0', 1536, 0, 256, 128); cella('funebre1', 1536, 128, 256, 128);
  for (let i = 0; i < 4; i++) cella('adesivo' + i, 1792 + (i % 2) * 128, (i >> 1) * 128, 128, 128);
  for (let i = 0; i < 4; i++) cella('manifesto' + i, i * 256, 256, 256, 256);
  for (let i = 0; i < 4; i++) cella('throw' + i, 1024 + (i % 2) * 256, 256 + (i >> 1) * 128, 256, 128);
  for (let i = 0; i < 16; i++) cella('civico' + i, 1536 + (i % 4) * 64, 256 + (i >> 2) * 64, 64, 64);
  cella('colatura0', 1792, 256, 128, 256); cella('colatura1', 1920, 256, 128, 256);
  for (let i = 0; i < 16; i++) cella('tag' + i, (i % 4) * 256, 512 + (i >> 2) * 64, 256, 64);
  for (let i = 0; i < 4; i++) cella('throw' + (4 + i), 1024 + (i % 2) * 256, 512 + (i >> 1) * 128, 256, 128);
  for (let i = 0; i < 4; i++) cella('adesivo' + (4 + i), 1536 + (i % 2) * 128, 512 + (i >> 1) * 128, 128, 128);
  cella('vernice0', 1792, 512, 128, 128); cella('vernice1', 1920, 512, 128, 128); cella('vernice2', 1792, 640, 128, 128); cella('vernice3', 1920, 640, 128, 128);
  cella('campana', 0, 768, 512, 256);
  for (let i = 0; i < 3; i++) cella('gesso' + i, 512 + i * 256, 768, 256, 256);
  cella('mozziconi0', 1280, 768, 128, 128); cella('mozziconi1', 1280, 896, 128, 128); cella('macchia0', 1408, 768, 128, 128); cella('macchia1', 1408, 896, 128, 128);
  for (let i = 0; i < 2; i++) cella('manifesto' + (4 + i), 1536 + i * 256, 768, 256, 256);
  const N_TAG = 16, N_THROW = 8, N_ADE = 8, N_MAN = 6, N_SER = 6;

  // la tavolozza della bibbia (tavolozza_mat.js INK): le tinte delle serrande, dei gessi, delle cose
  const INK = { crema: '#F2E7CF', sabbia: '#D2C2A6', grigio: '#A89C92', lilla: '#7C7186', notte: '#3D3548', nero: '#16121B', pesca: '#F0BE8C', ocra: '#DC9A34', mattone: '#C25B36', vino: '#6F2B2E',
    acqua: '#A3D4D8', petrolio: '#2A8A8A', blu: '#2F60B5', marina: '#202D5E', salvia: '#93B27C', verde: '#3F8A50', bosco: '#34532F', glicine: '#A68FB6', magenta: '#E04B8C', viola: '#6B3D9B' };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const scrittori = () => { const sd = SD(); if (!sd || !sd.CREW) return [['CIAPA', 'PVK'], ['ZENA', 'PVK'], ['GOZO', 'BDS'], ['TREK', 'TNT'], ['PIX', 'TOY'], ['MURE', 'BDS'], ['SUBA', 'RSC'], ['ZULU', 'KML']];
    const L = []; Object.entries(sd.CREW).forEach(([c, q]) => q.scrittori.forEach(a => L.push([a, c]))); return L; };
  // un lavoro del disegnatore dei writer (writer_arte.js art): la stessa mano dei graffiti della città, nella tavolozza E
  function arte(style, aka, crew, Wm, Hm, seed, extra) {
    const A = WA(); if (!A) return null;
    try { const h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7), sk = crew === 'TOY' ? .2 : .55 + (h % 40) / 100;
      const w = A.conceive({ aka, crew, style, dna: A.dnaOf ? A.dnaOf(h, sk, h % 14) : {}, seed, by: 'old:' + aka });
      Object.assign(w, { W: Wm, H: Hm, surf: 'muro', prog: 1, done: true, old: true, sdPal: 1, hand: h * 13, seed }, extra || {});
      if (style === 'tag' || style === 'mtag') w.tagK = 1;
      const R = A.art(w); if (!R || !R.stages || !R.stages.length) return null; return R.stages[R.stages.length - 1];
    } catch (e) { S.scarti.arte = (S.scarti.arte || 0) + 1; return null; }
  }
  // si disegna dentro la cella, centrato, nelle proporzioni del disegno; pad: il bordo trasparente (i mipmap non mescolano le celle)
  function incolla(x, src, c, fit) {
    if (!src) return; const [cx0, cy0, cw, ch] = c.map(v => v * K), pad = 3 * K + 1, w = cw - pad * 2, hgt = ch - pad * 2, s = fit === 'riempi' ? Math.max(w / src.width, hgt / src.height) : Math.min(w / src.width, hgt / src.height);
    const dw = src.width * s, dh = src.height * s; x.save(); x.beginPath(); x.rect(cx0 + pad, cy0 + pad, w, hgt); x.clip(); x.drawImage(src, cx0 + pad + (w - dw) / 2, cy0 + pad + (hgt - dh) / 2, dw, dh); x.restore();
  }
  // il disegno a mano dentro una cella: f(ctx, w, h, rng) in un canvas della misura della cella
  function aMano(x, nome, f, seed) { const c = CELLE[nome], pad = 3 * K + 1, k = cv(c[2] * K - pad * 2, c[3] * K - pad * 2); f(k.getContext('2d'), k.width, k.height, mulberry(seed), K); x.drawImage(k, c[0] * K + pad, c[1] * K + pad); }
  const rr = (r, a, b) => a + (b - a) * r();
  function strappo(x, w, h, r, lati) {   // i bordi strappati della carta: si toglie a morsi (destination-out)
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    for (const L of lati) { x.beginPath(); const n = 9; for (let i = 0; i <= n; i++) { const t = i / n, d = r() * .08 + .01;
      if (L === 'b') { if (!i) x.moveTo(0, h); x.lineTo(t * w, h - d * h); } if (L === 't') { if (!i) x.moveTo(0, 0); x.lineTo(t * w, d * h); } }
      if (L === 'b') { x.lineTo(w, h); } if (L === 't') { x.lineTo(w, 0); } x.closePath(); x.fill(); }
    x.restore();
  }
  // la serranda: lamiera a doghe, la tinta (spesso rifatta a pezzi), il lucchetto in basso, poi la vernice di chi ci passa
  function serranda(x, w, h, r, k, i) {
    const tinte = [INK.petrolio, INK.verde, INK.grigio, INK.marina, INK.vino, INK.sabbia], base = tinte[i % tinte.length];
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const nd = 26, dh = h / nd; for (let j = 0; j < nd; j++) { const y = j * dh; x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(0, y, w, dh * .35); x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(0, y + dh * .78, w, dh * .22); }
    x.fillStyle = 'rgba(40,30,30,.18)'; for (let j = 0; j < 5; j++) { const px = r() * w, pw = 6 + r() * 30; x.fillRect(px, h * (.55 + r() * .4), pw * K, h); }   // la ruggine che sale da terra
    x.fillStyle = 'rgba(20,16,24,.55)'; x.fillRect(0, h - dh * 1.4, w, dh * 1.4);   // il fondo con la maniglia e il lucchetto
    x.fillStyle = '#C8C4BC'; x.fillRect(w * .44, h - dh * 2.2, w * .12, dh * .7); x.fillStyle = '#5a5050'; x.fillRect(w * .48, h - dh * 1.6, w * .04, dh * .9);
    const L = scrittori(), pick = a => a[Math.floor(r() * a.length)];
    if (i === 0 || i === 3) { const [a, c] = pick(L), t = arte('throw', a, c, 3.2, 1.7, 9000 + i * 17, { bgk: null }); if (t) x.drawImage(t, w * .04, h * .2, w * .92, w * .92 * t.height / t.width); }   // il throw-up sulla serranda
    else if (i === 1 || i === 4) { const [a, c] = pick(L), p = arte('pezzo', a, c, 3.6, 2.6, 9100 + i * 31, { bgk: null }); if (p) { x.globalAlpha = .95; x.drawImage(p, w * .02, h * .12, w * .96, h * .74); x.globalAlpha = 1; } }   // la serranda dipinta per intero (il negoziante l'ha chiesta alla crew)
    for (let j = 0; j < (i === 1 || i === 4 ? 1 : 3); j++) { const [a, c] = pick(L), t = arte(j === 2 ? 'mtag' : 'tag', a, c, 2.0, .8, 9200 + i * 7 + j); if (t) { const tw = w * rr(r, .32, .5); x.drawImage(t, rr(r, 0, w - tw), h * (i === 1 || i === 4 ? .82 : .1 + j * .24 + r() * .06), tw, tw * t.height / t.width); } }
    if (i === 2 || i === 5) { x.save(); x.fillStyle = 'rgba(242,231,207,.9)'; x.font = `bold ${Math.round(h * .07)}px Impact, sans-serif`; x.textAlign = 'center'; x.fillText(i === 2 ? 'PASSO CARRABILE' : 'AFFITTASI', w / 2, h * .74); x.restore(); }   // la scritta di chi ci sta dietro
    // l'ombra del cassonetto in alto e i bordi scuri delle guide
    const g = x.createLinearGradient(0, 0, 0, h * .12); g.addColorStop(0, 'rgba(10,8,14,.55)'); g.addColorStop(1, 'rgba(10,8,14,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h * .12);
    x.fillStyle = 'rgba(10,8,14,.35)'; x.fillRect(0, 0, w * .02, h); x.fillRect(w * .98, 0, w * .02, h);
  }
  function funebre(x, w, h, r) {   // i manifesti funebri: fogli bianchi bordati di nero, la croce, il nome grande, le righe; uno vecchio sotto
    const fogli = [[.02, .1, .42, .82, .55], [.36, .06, .42, .86, 0], [.66, .14, .32, .74, .2]];
    fogli.forEach(([fx, fy, fw, fh, eta], k) => { const X = fx * w, Y = fy * h, W2 = fw * w, H2 = fh * h; x.save(); x.translate(X + W2 / 2, Y + H2 / 2); x.rotate((r() - .5) * .04); x.translate(-W2 / 2, -H2 / 2);
      x.fillStyle = eta > .3 ? '#E8DFC8' : '#F6F2E8'; x.fillRect(0, 0, W2, H2); x.strokeStyle = '#16121B'; x.lineWidth = Math.max(1.5, W2 * .035); x.strokeRect(W2 * .05, H2 * .05, W2 * .9, H2 * .9);
      x.fillStyle = '#16121B'; x.fillRect(W2 * .47, H2 * .1, W2 * .06, H2 * .14); x.fillRect(W2 * .41, H2 * .14, W2 * .18, H2 * .04);   // la croce
      for (let j = 0; j < 2; j++) x.fillRect(W2 * .18, H2 * (.3 + j * .06), W2 * .64, H2 * .02);
      x.font = `bold ${Math.round(H2 * .13)}px Georgia, serif`; x.textAlign = 'center'; x.fillText(['ROSA', 'NINO', 'TERESA', 'SALVO', 'LINA', 'PEPPE'][Math.floor(r() * 6)], W2 / 2, H2 * .56);
      for (let j = 0; j < 4; j++) x.fillRect(W2 * .14, H2 * (.64 + j * .065), W2 * (.72 - (j === 3 ? .3 : 0)), H2 * .022);
      x.restore(); if (eta > .3) { x.save(); x.translate(X, Y); strappo(x, W2, H2, r, ['b']); x.restore(); } });
  }
  function civico(x, w, h, r, k, i) {   // il civico di maiolica: bianco, la cornice blu, il numero
    x.fillStyle = '#F2EEE2'; x.fillRect(w * .06, h * .1, w * .88, h * .8); x.strokeStyle = i % 3 === 2 ? INK.vino : INK.blu; x.lineWidth = Math.max(1.5, w * .07); x.strokeRect(w * .14, h * .18, w * .72, h * .64);
    x.fillStyle = i % 3 === 2 ? INK.vino : INK.marina; x.font = `bold ${Math.round(h * .44)}px Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String([1, 3, 4, 7, 9, 12, 15, 18, 21, 23, 27, 30, 33, 36, 41, 52][i]), w / 2, h * .53);
  }
  function colatura(x, w, h, r, k, i) {   // lo sporco che cola dal davanzale e dal tubo: righe verticali morbide, scure sopra
    for (let j = 0; j < 9; j++) { const px = w * (.15 + r() * .7), pw = w * (.03 + r() * .07), L = h * (.3 + r() * .65), g = x.createLinearGradient(0, 0, 0, L); const c = i ? '60,50,40' : '40,46,40';
      g.addColorStop(0, `rgba(${c},.34)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(px, 0, pw, L); }
  }
  function vernice(x, w, h, r, k, i) {   // la vernice caduta sotto un lavoro: lo spruzzo nebbioso e le gocce, nei colori della tavolozza
    const cols = [[INK.magenta, INK.petrolio], [INK.ocra, INK.nero], [INK.blu, INK.crema], [INK.nero, INK.salvia]][i % 4];
    cols.forEach((c, j) => { for (let n = 0; n < 220; n++) { const a = r() * 6.28, d = Math.pow(r(), .6) * w * .42, px = w / 2 + Math.cos(a) * d * (j ? .7 : 1), py = h / 2 + Math.sin(a) * d * .55; x.globalAlpha = .25 + r() * .3; x.fillStyle = c; x.beginPath(); x.arc(px, py, (.6 + r() * 1.6) * K * 2, 0, 6.3); x.fill(); }
      for (let n = 0; n < 7; n++) { x.globalAlpha = .85; x.fillStyle = c; x.beginPath(); x.arc(w * (.15 + r() * .7), h * (.2 + r() * .6), (2 + r() * 4) * K * 2, 0, 6.3); x.fill(); } });
    x.globalAlpha = 1;
  }
  function campana(x, w, h, r) {   // il gioco della campana col gesso: le caselle, i numeri, il cielo in fondo
    x.strokeStyle = 'rgba(246,242,232,.92)'; x.fillStyle = 'rgba(246,242,232,.92)'; x.lineWidth = 3 * K * 2; x.lineCap = 'round';
    const u = h * .25, y0 = h / 2, cs = [[0, 1], [1, 1], [2, 2], [3, 1], [4, 2], [5, 1]]; let n = 1;
    x.font = `bold ${Math.round(u * .5)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
    cs.forEach(([c, m]) => { const X = w * .06 + c * u * 1.05; if (m === 1) { x.strokeRect(X, y0 - u / 2, u, u); x.fillText(String(n++), X + u / 2, y0); } else { x.strokeRect(X, y0 - u, u, u); x.strokeRect(X, y0, u, u); x.fillText(String(n++), X + u / 2, y0 - u / 2); x.fillText(String(n++), X + u / 2, y0 + u / 2); } });
    const X = w * .06 + 6 * u * 1.05; x.beginPath(); x.arc(X, y0, u, -Math.PI / 2, Math.PI / 2); x.stroke(); x.font = `bold ${Math.round(u * .32)}px Arial`; x.fillText('CIELO', X + u * .45, y0);
    x.fillStyle = 'rgba(224,75,140,.8)'; x.beginPath(); x.arc(X - u * 3.5, y0 + u * .2, u * .12, 0, 6.3); x.fill();   // il sasso rosa
  }
  function polvere(x, w, h, r) {   // il gesso è polvere: si toglie a puntini (il segno si sgrana, mezzo cancellato dai passi)
    x.save(); x.globalCompositeOperation = 'destination-out'; for (let n = 0; n < w * h / 9; n++) { x.globalAlpha = .25 + r() * .6; x.fillRect(r() * w, r() * h, 1 + r() * 2 * K, 1 + r() * 2 * K); }
    x.globalAlpha = .5; for (let n = 0; n < 3; n++) { const px = r() * w, py = r() * h, R2 = w * (.08 + r() * .12), g = x.createRadialGradient(px, py, 0, px, py, R2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); } x.restore(); }
  function gesso(x, w, h, r, k, i) {   // i disegni col gesso: il sole e la casetta, il cuore coi nomi, la scritta e la freccia
    const C = ['rgba(246,242,232,.9)', 'rgba(240,190,140,.9)', 'rgba(163,212,216,.9)', 'rgba(224,75,140,.85)', 'rgba(147,178,124,.9)']; x.lineWidth = 3 * K * 2; x.lineCap = 'round'; x.lineJoin = 'round';
    if (i === 0) { x.strokeStyle = C[1]; x.beginPath(); x.arc(w * .3, h * .3, w * .1, 0, 6.3); x.stroke(); for (let j = 0; j < 9; j++) { const a = j / 9 * 6.28; x.beginPath(); x.moveTo(w * .3 + Math.cos(a) * w * .14, h * .3 + Math.sin(a) * w * .14); x.lineTo(w * .3 + Math.cos(a) * w * .2, h * .3 + Math.sin(a) * w * .2); x.stroke(); }
      x.strokeStyle = C[0]; x.strokeRect(w * .5, h * .5, w * .3, h * .3); x.beginPath(); x.moveTo(w * .46, h * .52); x.lineTo(w * .65, h * .32); x.lineTo(w * .84, h * .52); x.stroke(); x.strokeStyle = C[2]; x.strokeRect(w * .6, h * .64, w * .08, h * .16); }
    if (i === 1) { x.strokeStyle = C[3]; x.beginPath(); x.moveTo(w * .5, h * .78); x.bezierCurveTo(w * .1, h * .5, w * .25, h * .12, w * .5, h * .34); x.bezierCurveTo(w * .75, h * .12, w * .9, h * .5, w * .5, h * .78); x.stroke();
      x.fillStyle = C[0]; x.font = `bold ${Math.round(h * .11)}px Arial`; x.textAlign = 'center'; x.fillText('TINA + GIGI', w * .5, h * .52); }
    if (i === 2) { x.fillStyle = C[4]; x.font = `bold ${Math.round(h * .14)}px Arial`; x.textAlign = 'center'; x.save(); x.translate(w / 2, h * .4); x.rotate(-.12); x.fillText('W LA MAREA', 0, 0); x.restore();
      x.strokeStyle = C[0]; x.beginPath(); x.moveTo(w * .2, h * .7); x.lineTo(w * .78, h * .66); x.lineTo(w * .7, h * .58); x.moveTo(w * .78, h * .66); x.lineTo(w * .69, h * .74); x.stroke(); }
  }
  function mozziconi(x, w, h, r, k, i) {   // i mozziconi e i tappi davanti al bar
    for (let n = 0; n < 16 + i * 6; n++) { const px = w * (.1 + r() * .8), py = h * (.1 + r() * .8), a = r() * 6.28, L = (7 + r() * 4) * K * 2; x.save(); x.translate(px, py); x.rotate(a);
      x.fillStyle = '#EDE6D6'; x.fillRect(-L / 2, -1.6 * K * 2, L * .62, 3.2 * K * 2); x.fillStyle = INK.ocra; x.fillRect(L * .12, -1.6 * K * 2, L * .38, 3.2 * K * 2); x.restore(); }
    for (let n = 0; n < 4; n++) { x.fillStyle = n % 2 ? '#C8C0B0' : INK.mattone; x.beginPath(); x.arc(w * (.15 + r() * .7), h * (.15 + r() * .7), 3.2 * K * 2, 0, 6.3); x.fill(); }
    for (let n = 0; n < 6; n++) { x.fillStyle = 'rgba(30,26,30,.35)'; x.beginPath(); x.arc(w * (.1 + r() * .8), h * (.1 + r() * .8), (2 + r() * 3) * K * 2, 0, 6.3); x.fill(); }   // le gomme
  }
  function macchia(x, w, h, r, k, i) {   // l'olio, il caffè, l'acqua sporca: una macchia scura morbida
    for (let n = 0; n < 5; n++) { const px = w * (.3 + r() * .4), py = h * (.3 + r() * .4), R2 = w * (.12 + r() * .2), g = x.createRadialGradient(px, py, 0, px, py, R2), c = i ? '50,40,30' : '24,22,30';
      g.addColorStop(0, `rgba(${c},.32)`); g.addColorStop(.7, `rgba(${c},.18)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  }
  // l'atlante si disegna a passi (un pezzo a fotogramma, nel budget), poi sale una volta sola alla scheda video
  const ATL = { cnv: null, x: null, tex: null, passi: [], pronto: false, carica: false };
  // il gioco carica l'atlante già disegnato (assets/pieno/atlante.png; sul telefono atlante_tel.png, a metà): i pennelli dei writer costano
  // 0,1-0,4 s a disegno, quaranta disegni sarebbero secondi di scatti. Se il file manca, lo si disegna qui a passi (fuori dal gioco, o lento)
  const FILE = TEL ? 'assets/pieno/atlante_tel.png' : 'assets/pieno/atlante.png';
  function caricaAtlante() {
    ATL.carica = true; const u = (window.PV_V || (x => x))(FILE);
    new THREE.TextureLoader().load(u, t => { t.anisotropy = TEL ? 2 : 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
      ATL.tex = t; MAT.map = t; MAT.needsUpdate = true; ATL.pronto = true; ATL.passi.length = 0; S.atlante = 2; sporco = true; }, undefined, () => { S.atlante = -1; K = TEL ? .5 : 1; preparaAtlante(); });
  }
  function preparaAtlante() {
    ATL.cnv = cv(AW * K, AH * K); ATL.x = ATL.cnv.getContext('2d');
    const L = scrittori(), sd = SD(), R0 = mulberry(1986), pick = a => a[Math.floor(R0() * a.length)];
    const P = ATL.passi;
    for (let i = 0; i < N_TAG; i++) P.push(() => { const [a, c] = L[(i * 5 + 3) % L.length], t = arte(i % 4 === 3 ? 'mtag' : 'tag', a, c, 2.2, .7, 7100 + i * 13); if (t) incolla(ATL.x, t, CELLE['tag' + i]); });
    for (let i = 0; i < N_THROW; i++) P.push(() => { const [a, c] = L[(i * 7 + 1) % L.length], t = arte('throw', a, c, 3.2, 1.6, 7300 + i * 29); if (t) incolla(ATL.x, t, CELLE['throw' + i]); });
    for (let i = 0; i < N_ADE; i++) P.push(() => { const crs = Object.keys((sd && sd.CREW) || { PVK: 1, BDS: 1, TNT: 1, TOY: 1 }), nomi = L.map(q => q[0]);
      const t = arte('adesivi', nomi[i % nomi.length], crs[i % crs.length], 1.0, 1.0, 7500 + i * 41, { sdAdesivi: { n: 7 + (i % 4) * 2, nomi: nomi.slice((i * 3) % 12, (i * 3) % 12 + 8), crew: crs, loghi: sd ? sd.LOGHI : ['RADIO LUNA'] } }); if (t) incolla(ATL.x, t, CELLE['adesivo' + i]); });
    for (let i = 0; i < N_MAN; i++) P.push(() => { const M = sd && sd.MAN ? sd.MAN : null; if (!M) return; const cats = [['serate', 'serate'], ['vicolo', 'serate'], ['porto', 'serate'], ['piazza', 'piazza'], ['strada', 'serate'], ['serate', 'vicolo']][i], n = 2 + (i % 3);
      const man = []; for (let k = 0; k < n; k++) { const L2 = M[cats[k % 2]] || M.serate; man.push(Object.assign({ c: (i * 3 + k) % 10 }, L2[(i + k * 2) % L2.length])); }
      const t = arte('manifesto', 'PV', 'PVK', 2.0, 1.6, 7700 + i * 53, { sdManifesti: man, sdFresco: i % 2 === 0 }); if (t) incolla(ATL.x, t, CELLE['manifesto' + i]); });
    for (let i = 0; i < N_SER; i++) P.push(() => aMano(ATL.x, 'serranda' + i, (x, w, h, r, k) => serranda(x, w, h, r, k, i), 8100 + i));
    P.push(() => { aMano(ATL.x, 'funebre0', funebre, 8301); aMano(ATL.x, 'funebre1', funebre, 8302); });
    P.push(() => { for (let i = 0; i < 16; i++) aMano(ATL.x, 'civico' + i, (x, w, h, r, k) => civico(x, w, h, r, k, i), 8400 + i); });
    P.push(() => { for (let i = 0; i < 2; i++) aMano(ATL.x, 'colatura' + i, (x, w, h, r, k) => colatura(x, w, h, r, k, i), 8500 + i); for (let i = 0; i < 4; i++) aMano(ATL.x, 'vernice' + i, (x, w, h, r, k) => vernice(x, w, h, r, k, i), 8600 + i); });
    P.push(() => { aMano(ATL.x, 'campana', (x, w, h, r, k) => { campana(x, w, h, r); polvere(x, w, h, r); }, 8700); for (let i = 0; i < 3; i++) aMano(ATL.x, 'gesso' + i, (x, w, h, r, k) => { gesso(x, w, h, r, k, i); polvere(x, w, h, r); }, 8710 + i); });
    P.push(() => { for (let i = 0; i < 2; i++) { aMano(ATL.x, 'mozziconi' + i, (x, w, h, r, k) => mozziconi(x, w, h, r, k, i), 8800 + i); aMano(ATL.x, 'macchia' + i, (x, w, h, r, k) => macchia(x, w, h, r, k, i), 8810 + i); } });
    P.push(() => { const t = new THREE.CanvasTexture(ATL.cnv); t.anisotropy = TEL ? 2 : 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
      ATL.tex = t; MAT.map = t; MAT.needsUpdate = true; ATL.pronto = true; S.atlante = 1; });
  }
  // aspetta i caratteri dei graffiti (le tag e i manifesti si disegnano coi font della mano), al più 12 s
  let fontT0 = 0; const fontPronti = () => { const A = WA(); if (!A) return true; if (A.FONTS && A.FONTS.ok) return true; fontT0 = fontT0 || performance.now(); return performance.now() - fontT0 > 12000; };

  // ================= I MATERIALI E LE DUE MESH =================
  // le decalcomanie: un quadrato 1×1 (davanti +z), l'istanza dice dove, quanto e quale riquadro dell'atlante (aRect: u0, v0, du, dv)
  const MAT = new THREE.MeshLambertMaterial({ map: null, transparent: true, depthWrite: false, alphaTest: .04, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  MAT.userData.grafica = 'pieno';
  MAT.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aRect;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = aRect.xy + uv * aRect.zw;\n#endif\n#if defined( USE_UV ) && !defined( USE_MAP )\n vUv = aRect.xy + uv * aRect.zw;\n#endif'); };
  // r149: la uv della mappa è vUv (non vMapUv): lo si sistema al primo programma
  if (!/vMapUv/.test(THREE.ShaderChunk.map_fragment || '')) MAT.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aRect;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_UV\n vUv = aRect.xy + uv * aRect.zw;\n#endif'); };
  MAT.customProgramCacheKey = () => 'pieno-atlante';
  const MATC = new THREE.MeshLambertMaterial({ vertexColors: true });   // le cose: una geometria sola, i colori nei vertici
  MATC.userData.grafica = 'pieno';
  const QUAD = new THREE.PlaneGeometry(1, 1);
  let DEC = null, COSE = null, GRUPPO = null, CAP = 0;
  function cresci(n) {
    const cap = Math.max(256, CAP * 2, n), m = new THREE.InstancedMesh(QUAD.clone(), MAT, cap); m.geometry.setAttribute('aRect', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    m.name = 'pieno_decal'; m.frustumCulled = true; m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1e4, 0), 1); m.receiveShadow = true; m.renderOrder = 3; m.count = 0; m.userData.pieno = true;   // la sfera la mette rifai (attorno alla camera); col taglio acceso il controllo delle istanze del gioco (render.js instCull) non lo tocca
    if (DEC) { GRUPPO.remove(DEC); DEC.geometry.dispose(); DEC.dispose && DEC.dispose(); } DEC = m; CAP = cap; GRUPPO.add(m);
  }
  let CV = 0;   // i vertici della geometria delle cose
  function cresciCose(nv) {
    // un disegno solo attorno alla camera: niente taglio (la sfera di una geometria che cambia la tiene in cache chi taglia)
    const cap = Math.max(8192, nv * 1.5 | 0), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cap * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
    g.setDrawRange(0, 0); if (COSE) { GRUPPO.remove(COSE); COSE.geometry.dispose(); }
    COSE = new THREE.Mesh(g, MATC); COSE.name = 'pieno_cose'; COSE.frustumCulled = false; COSE.castShadow = !TEL; COSE.receiveShadow = true; COSE.userData.pieno = true; CV = cap; GRUPPO.add(COSE);
  }

  // ================= I PEZZI 3D (vertici colorati) =================
  // un cluster: un elenco di scatole e cilindri in coordinate locali (x lungo il muro, z verso la strada, y su), girato e posato
  const col3 = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  function Cose() { this.p = []; this.n = []; this.c = []; }
  Cose.prototype.box = function (o, cx, cy, cz, sx, sy, sz, hex, ry) {
    const c = col3(hex), hx = sx / 2, hy = sy / 2, hz = sz / 2, cr = Math.cos(ry || 0), sr = Math.sin(ry || 0);
    const F = [[[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]], [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]], [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
      [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]], [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]], [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]]];
    for (const [nn, V] of F) { if (nn[1] < 0) continue;   // il fondo non si vede mai
      const sh = nn[1] > 0 ? 1 : nn[2] !== 0 ? .9 : .82, Lc = [c[0] * sh, c[1] * sh, c[2] * sh];
      for (const i of [0, 1, 2, 0, 2, 3]) { const v = V[i], lx = cx + v[0] * cr + v[2] * sr, lz = cz - v[0] * sr + v[2] * cr; this.p.push(lx, cy + v[1], lz); this.n.push(nn[0] * cr + nn[2] * sr, nn[1], -nn[0] * sr + nn[2] * cr); this.c.push(Lc[0], Lc[1], Lc[2]); } }
    return this; };
  Cose.prototype.cil = function (o, cx, cy, cz, r, h, hex, seg) {
    const c = col3(hex), n = seg || 8;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r, nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
      const q = [[x1, 0, z1], [x0, 0, z0], [x0, h, z0], [x1, 0, z1], [x0, h, z0], [x1, h, z1]]; q.forEach(v => { this.p.push(cx + v[0], cy + v[1], cz + v[2]); this.n.push(nx, 0, nz); this.c.push(c[0] * .9, c[1] * .9, c[2] * .9); });
      [[0, h, 0], [x1, h, z1], [x0, h, z0]].forEach(v => { this.p.push(cx + v[0], cy + v[1], cz + v[2]); this.n.push(0, 1, 0); this.c.push(c[0], c[1], c[2]); }); }
    return this; };
  // posa: da locale (u lungo il muro, v verso la strada) a mondo, col muro in (px, pz), u = (ux, uz), n = (nx, nz), quota y0
  Cose.prototype.posa = function (px, y0, pz, ux, uz, nx, nz) {
    const P = this.p, N = this.n, o = { p: new Float32Array(P.length), n: new Float32Array(N.length), c: new Float32Array(this.c) };
    for (let i = 0; i < P.length; i += 3) { const a = P[i], b = P[i + 2]; o.p[i] = px + a * ux + b * nx; o.p[i + 1] = y0 + P[i + 1]; o.p[i + 2] = pz + a * uz + b * nz; const na = N[i], nb = N[i + 2]; o.n[i] = na * ux + nb * nx; o.n[i + 1] = N[i + 1]; o.n[i + 2] = na * uz + nb * nz; }
    return o; };
  // i pezzi: la sedia di plastica, la cassa di birra, la cassetta di legno, il tavolino, le bombolette, i lumini, i fiori
  const PZ = {
    sedia(C, u, v, ry, hex) { const k = hex || '#EEEBE2'; const c = Math.cos(ry), s = Math.sin(ry), at = (a, b) => [u + a * c + b * s, v - a * s + b * c];
      [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]].forEach(([a, b]) => { const [x, z] = at(a, b); C.box(0, x, .2, z, .04, .4, .04, k, ry); });
      { const [x, z] = at(0, 0); C.box(0, x, .43, z, .44, .05, .44, k, ry); } { const [x, z] = at(0, -.21); C.box(0, x, .7, z, .44, .5, .04, k, ry); } },
    cassaBirra(C, u, v, y, ry, hex) { C.box(0, u, y + .14, v, .4, .28, .3, hex || INK.mattone, ry); C.box(0, u, y + .285, v, .36, .01, .26, '#3a2e2a', ry); for (let i = 0; i < 6; i++) C.cil(0, u - .12 + (i % 3) * .12, y + .28, v - .06 + (i >> 1 & 1) * .12, .03, .08, i % 2 ? '#2f6a3a' : '#5a3a1a', 5); },
    cassetta(C, u, v, y, ry, frutta) { C.box(0, u, y + .02, v, .5, .04, .32, '#c8a46a', ry); [-.15, .15].forEach(b => C.box(0, u, y + .12, v + b * Math.cos(ry), .5, .1, .02, '#d8b47a', ry)); [-.24, .24].forEach(a => C.box(0, u + a * Math.cos(ry), y + .1, v - a * Math.sin(ry), .02, .16, .32, '#b8945a', ry));
      if (frutta) for (let i = 0; i < 6; i++) C.box(0, u - .16 + (i % 3) * .16, y + .17, v - .07 + (i >> 1 & 1) * .14, .12, .08, .12, frutta, ry + i); },
    tavolino(C, u, v) { C.cil(0, u, 0, v, .03, .7, '#8a8a90', 6); C.cil(0, u, .7, v, .32, .03, '#EEEBE2', 12); C.cil(0, u, 0, v, .2, .02, '#8a8a90', 8); },
    bombola(C, u, v, hex, steso) { if (steso) { C.box(0, u, .035, v, .22, .065, .065, hex, .4); return; } C.cil(0, u, 0, v, .033, .2, hex, 7); C.cil(0, u, .2, v, .022, .04, '#16121B', 6); },
    lumino(C, u, v, hex) { C.cil(0, u, 0, v, .04, .11, hex || '#c8303a', 7); C.cil(0, u, .11, v, .028, .015, '#ffd890', 6); },
    fiori(C, u, v, hex) { C.cil(0, u, 0, v, .07, .2, '#4a6a8a', 7); for (let i = 0; i < 5; i++) { const a = i * 1.26; C.box(0, u + Math.cos(a) * .05, .32 + (i % 2) * .05, v + Math.sin(a) * .05, .06, .06, .06, i % 2 ? hex : '#f2ead6', a); C.box(0, u, .25, v, .02, .14, .02, '#3f8a50'); } },
    secchio(C, u, v) { C.cil(0, u, 0, v, .13, .26, '#2f60b5', 9); C.box(0, u + .2, .55, v - .02, .03, 1.1, .03, '#b08a5a', .1); C.box(0, u + .2, .06, v - .02, .28, .12, .06, '#c84a3a', .1); },
  };

  // ================= LA PIANTA: celle di 24 m attorno alla camera =================
  const PIANO = new Map();   // cella → { stato: 0 da fare, 1 fatta; d: decalcomanie [nome, m(16)], c: cose {p,n,c}, voci: [...]; prove }
  const keyC = (i, j) => i * 4096 + j;
  let FACCE = null;   // le facce di strada delle case, per cella
  const FYAW = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };
  function faccia(b, rec, f, u) {   // come render.js faccia2: il punto sul filo della facciata, la normale, la direzione lungo il muro
    const g = rec.geo, x0 = g.x0, z0 = g.z0, w = g.w, d = g.d; let p = f === 'S' ? [x0 + u, z0 + d] : f === 'N' ? [x0 + w - u, z0] : f === 'E' ? [x0 + w, z0 + d - u] : [x0, z0 + u];
    const a = rec.tier ? 0 : (b.rot && !b.sign && !b.shop ? b.rot : 0), yaw = FYAW[f] - a;
    if (a) { const cx = (b.x + b.w / 2) * TS, cz = (b.y + b.h / 2) * TS, qx = p[0] - cx, qz = p[1] - cz, c = Math.cos(a), s = Math.sin(a); p = [cx + qx * c - qz * s, cz + qx * s + qz * c]; }
    const n = [Math.sin(yaw), Math.cos(yaw)]; if (b.__ep && b.__ep.portico === f) p = [p[0] - n[0] * TS, p[1] - n[1] * TS];
    return { p, n, u: [Math.cos(yaw), -Math.sin(yaw)] };
  }
  const R = () => Render, gH = (x, z) => { try { return R().groundH(x, z); } catch (e) { return 0; } };
  function facce() {
    const D = R().__dz, B = G.BUILDINGS; if (!D || !D.bRec || !B) return null; const out = new Map(); let n = 0;
    for (let bi = 0; bi < B.length; bi++) { const b = B[bi], rec = D.bRec[bi]; if (!b || !rec || !rec.geo || b.pezzo || b.kiosk || b.lighthouse) continue; const g = rec.geo;
      for (const f of ['S', 'N', 'E', 'W']) { const L = f === 'S' || f === 'N' ? g.w : g.d; if (L < 1.6) continue; const F = faccia(b, rec, f, L / 2);
        const ox = F.p[0] + F.n[0] * 1.3, oz = F.p[1] + F.n[1] * 1.3, v = tileAt(ox, oz); if (!STRADA.has(v)) continue;   // la faccia guarda la strada
        if (b.__ep && b.__ep.portico === f) continue;   // sotto i portici: la loro scena
        const gy = gH(ox, oz); if (Math.abs(gy - g.y0) > .45) continue;   // il piede della casa a filo della strada (non sopra un terrapieno)
        const k = keyC(Math.floor(F.p[0] / CELL), Math.floor(F.p[1] / CELL)); (out.get(k) || out.set(k, []).get(k)).push({ b, bi, rec, f, L, y0: g.y0 }); n++; } }
    S.facce = n; return out;
  }
  // le aperture del piano terra di una faccia (b.__win): porte, vetrine, finestre, garage; e i moduli di muro pieno
  const WIN_L = { 'wall-doorway-wide-round': 3.2, 'wall-doorway-wide-square': 3.2, 'wall-window-wide-square': 3.1, 'wall-window-wide-round': 3.1, 'wall-window-wide-square-detailed': 3.1, 'wall-window-wide-round-detailed': 3.1 };
  function aperture(fc) {
    const L = (fc.b.__win || []).filter(q => q.f === fc.f && (q.g || Math.abs(q.y - fc.y0) < .3)), ap = [], muri = [];
    L.forEach(q => { const nm = q.name || ''; if (nm === 'wall' || nm === 'wall-low') { muri.push({ u: q.u, hw: .98 }); return; }
      const w = WIN_L[nm] || (/door/.test(nm) ? 1.1 : /garage/.test(nm) ? 2 : .95); ap.push({ u: q.u, hw: w / 2 + .18, porta: /door/.test(nm), vetrina: !!q.shop && /window|wide/.test(nm), garage: /garage/.test(nm), nome: nm }); });
    if (fc.b.__bot && fc.b.__bot.face === fc.f) fc.b.__bot.ents.forEach(e => { const g = ap.find(q => Math.abs(q.u - e.u) < .3); if (g) { g.vetrina = g.vetrina || e.role === 'vetrina'; g.hw = Math.max(g.hw, e.w / 2 + .2); } else ap.push({ u: e.u, hw: e.w / 2 + .2, porta: e.role === 'porta', vetrina: e.role === 'vetrina' }); });   // la stessa porta una volta sola
    return { ap, muri, nota: L.length > 0 };
  }
  // il raggio dei graffiti: il piano del muro davanti a (x, z) alla quota y, guardando verso -n; null se non c'è o non è lo stesso piano
  const V0 = new THREE.Vector3(), V1 = new THREE.Vector3(), CANDS = new Map();
  function muroA(x, y, z, nx, nz) {
    const WR = typeof Writing !== 'undefined' && Writing.__ray ? Writing.__ray : null; if (!WR) return null; S.raggi++;
    const kc = Math.round(x / 3) * 4096 + Math.round(z / 3); let L = CANDS.get(kc); if (!L) { L = WR.cands ? WR.cands(x, z) : []; CANDS.set(kc, L); if (CANDS.size > 400) CANDS.clear(); }   // le mesh vicine (come i graffiti), una volta ogni 3 m
    V0.set(x + nx * 1.4, y, z + nz * 1.4); V1.set(-nx, 0, -nz); const h = WR.rayWall(V0, V1, 2.6, L); if (!h) return null;
    if (h.n.x * nx + h.n.z * nz < .96 || Math.abs(h.n.y) > .2) return null;
    const m = h.obj && (Array.isArray(h.obj.material) ? h.obj.material[0] : h.obj.material); if (!m || nonMuro(m) || (h.obj.geometry && h.obj.geometry.attributes.position && h.obj.geometry.attributes.position.count <= 8)) { conta('non_muro'); return null; }   // un quadro solo (4 vertici) appeso al muro è un telo, un murale, un cartello: non il muro
    return h.p;
  }
  // (manifesto0, col disco nero, da lontano si legge come una macchia: resta nell'atlante ma non si posa)
  // il muro è intonaco, mattone, pietra; non le grate e i fogli trasparenti posati sopra (keepTr), i murales del regime e le
  // insegne dipinte (Lambert con la loro immagine), i vetri, i cartelli (grafica), le cose senza luce o coi colori nei vertici
  const nonMuro = m => !!(m.isShaderMaterial || m.isMeshBasicMaterial || m.vertexColors || (m.userData && (m.userData.grafica || m.userData.vetro)) || /vetro/.test(m.name || '') || (m.isMeshLambertMaterial && m.map && m.map.image && m.map.image.width > 4) || m.transparent);
  // il rettangolo (u0..u1 lungo il muro, y0..y1) sta tutto sullo stesso piano? torna la distanza del piano dal filo (lungo n) o null
  // il rettangolo, e se lì sotto c'è lo zoccolo (un altro piano) lo stesso rettangolo 35 cm più su: torna [d, dy] o null
  function pianoSu(F, fc, u0, u1, ya, yb) { let d = piano(F, fc, u0, u1, ya, yb); if (d !== null) return [d, 0]; if (yb + .35 > 2.7) return null; d = piano(F, fc, u0, u1, ya + .35, yb + .35); return d === null ? null : [d, .35]; }
  function piano(F, fc, u0, u1, ya, yb) {
    let ref = null; for (const [u, y] of [[(u0 + u1) / 2, (ya + yb) / 2], [u0 + .1, ya + .08], [u1 - .1, ya + .08], [u0 + .1, yb - .08], [u1 - .1, yb - .08]]) {
      const x = F.p[0] + F.u[0] * (u - fc.L / 2), z = F.p[1] + F.u[1] * (u - fc.L / 2), p = muroA(x, fc.y0 + y, z, F.n[0], F.n[1]); if (!p) { conta('senza_muro'); return null; }
      const d = (p.x - F.p[0]) * F.n[0] + (p.z - F.p[1]) * F.n[1]; if (ref === null) ref = d; else if (Math.abs(d - ref) > .045) { conta('piano_rotto'); return null; } }
    return ref;
  }
  // i lavori dei writer e le cose appese che ci sono già (registro del regista: insegne, citofoni, tubi, applique, tabelloni, manifesti)
  let OCC = null, OCCt = 0;
  function occupato(st) {
    const now = performance.now(); if (OCC && now - OCCt < 20000) return OCC; OCCt = now; OCC = new Map(); const add = (x, z, y0, y1, r) => { const k = keyC(Math.floor(x / 8), Math.floor(z / 8)); (OCC.get(k) || OCC.set(k, []).get(k)).push([x, z, y0, y1, r]); };
    const W = st && st.wr && st.wr.works; if (W) W.forEach(w => { if (w.erased) return; const r = w.gfxRect; if (r && r.c) add(r.c.x, r.c.z, r.c.y - r.H / 2, r.c.y + r.H / 2, (r.W || 1) / 2 + .15); else if (w.spot && (w.W || 0) > 1.4) add(w.spot.x, w.spot.y, -99, 99, w.W / 2); });   // i lavori non ancora sul muro: solo i grandi (le tag sopra i manifesti sono la strada)
    const reg = R().__vis3 && R().__vis3.reg; if (reg) reg.forEach(e => { if (!/^(insegna|tabellone|citofono|pluviale|applique|cartello|bucato|festone|rete|tenda|tettoia|scorcio_muro|arredo|ingombro|dehors|grande)/.test(e.k)) return; const B = e.B, u = (B.u0 + B.u1) / 2, v = (B.v0 + B.v1) / 2;
      const ext = Math.max(B.u1 - B.u0, B.v1 - B.v0) / 2; if (ext > 3) return;   // i pezzi grandi (portici, scogliere, muri) non si misurano col cerchio: ci pensano i raggi
      add(u * B.c + v * B.s, -u * B.s + v * B.c, B.y0, B.y1, ext + .1); });
    return OCC;
  }
  const conta = k => { S.scarti[k] = (S.scarti[k] || 0) + 1; };
  function libero(st, x, z, y0, y1, r) { const O = occupato(st); for (let i = Math.floor((x - 4) / 8); i <= Math.floor((x + 4) / 8); i++) for (let j = Math.floor((z - 4) / 8); j <= Math.floor((z + 4) / 8); j++) for (const q of O.get(keyC(i, j)) || []) if (hyp(q[0] - x, q[1] - z) < q[4] + r && y1 > q[2] && y0 < q[3]) { conta('occupato'); return false; } return true; }
  // i tombini e le porte del sottosuolo: niente sopra
  // il gesso che render.js dipinge già nel suolo (segniList1: la campana e i disegni al centro di piazzette, sagrati, marine): lì niente
  let GES = null; const gessoGia = (x, z) => { if (!GES) GES = (((G.MAP.world && G.MAP.world.sets) || []).filter(q => /^(piazzetta|sagrato|marina)$/.test(q.k)).map(q => q.x !== undefined ? [q.x, q.y] : [(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2])); return GES.some(q => hyp(q[0] - x, q[1] - z) < 10); };
  const tombino = (x, z) => (window.__PV_TOMBINI || []).some(q => hyp(q.x - x, q.z - z) < (q.r || .4) + .6);

  // le zone e il ritmo (strada_dipinta.js); senza: tutto via
  // il regime: la sua zona (strada_dipinta.js), e come render.js regAt entro 6 m dai palazzi del governo e militari (lì le bandiere con
  // l'occhio e i manifesti del regime: niente vernice né carta di strada)
  let GOV = null; const regime = (x, z) => { if (!GOV) GOV = (G.BUILDINGS || []).filter(b => b.gov || b.military).map(b => [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS]); return GOV.some(R => x > R[0] - 6 && x < R[2] + 6 && z > R[1] - 6 && z < R[3] + 6); };
  const zona = (x, z, nx, nz) => { if (regime(x, z)) return 'regime'; const sd = SD(); try { return sd ? sd.zonaPunto(x, z, nx, nz, 'strada') : 'via'; } catch (e) { return 'via'; } };
  const ritmo = (x, z) => { const sd = SD(); try { return sd ? sd.ritmo(x, z) : 1; } catch (e) { return 1; } };
  // per zona: quanto è facile che un modulo di muro pieno abbia qualcosa (p) e cosa (pesi)
  const ZP = {
    sottopasso: { p: .95, ser: 2, man: 2, tag: 4, thr: 3, ade: 2 }, ferrovia: { p: .9, ser: 1, man: 2, tag: 4, thr: 3, ade: 2 }, muro: { p: .3, ser: 0, man: 1, tag: 2, thr: 1, ade: 2 },
    porto: { p: .85, ser: 3, man: 2, tag: 3, thr: 2, ade: 1 }, vicolo: { p: .85, ser: 2, man: 2, tag: 4, thr: 2, ade: 2 }, ritrovo: { p: .92, ser: 2, man: 4, tag: 3, thr: 2, ade: 3 },
    via: { p: .75, ser: 2, man: 3, tag: 2.5, thr: .7, ade: 2 }, lungomare: { p: .6, ser: 1, man: 3, tag: 1.5, thr: .5, ade: 2 }, piazza: { p: .45, ser: .3, man: 4, fun: 1, tag: 0, thr: 0, ade: 1 },
    sacro: { p: .4, fun: 1 }, regime: { p: 0 }, fuori: { p: .3, ser: 1, man: 1, tag: 2, thr: 1, ade: 1 },
  };
  const scegli = (Z, r) => { const L = [['ser', Z.ser || 0], ['man', Z.man || 0], ['fun', Z.fun || 0], ['tag', Z.tag || 0], ['thr', Z.thr || 0], ['ade', Z.ade || 0]]; let t = L.reduce((a, q) => a + q[1], 0) * r; for (const q of L) { if ((t -= q[1]) < 0) return q[0]; } return null; };
  const USO_BAR = /^(bar|osteria|trattoria|circolo|pub|gelateria|tabacchi|caffe|pizzeria)$/, USO_CASSE = /^(alimentari|fruttivendolo|frutta|pescheria|panetteria|forno|mercato|drogheria|salumeria|ortolano|latteria|macelleria|emporio|supermercato)$/, USO_OFF = /^(officina|garage|magazzino|ferramenta|deposito|falegnameria|fabbro|autorimessa|tipografia)$/;
  const usoDi = b => String((b.shopFront && b.shopFront.use) || b.use || '');

  function* pianificaG(cel, st) {   // a passi: una faccia per passo (i raggi costano), il tick ne fa quante ne stanno nel budget
    const out = { d: [], cose: [], voci: [] }, list = FACCE.get(cel.k) || [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    // una decalcomania sul muro: centro (u lungo la faccia dal suo inizio, y sopra il piede), misure, distanza del piano
    const sulMuro = (fc, F, nome, u, y, w, h, dist, tilt) => { const x = F.p[0] + F.u[0] * (u - fc.L / 2) + F.n[0] * (dist + .006), z = F.p[1] + F.u[1] * (u - fc.L / 2) + F.n[1] * (dist + .006);
      e.set(0, Math.atan2(F.n[0], F.n[1]), tilt || 0, 'YXZ'); q.setFromEuler(e); ps.set(x, fc.y0 + y, z); sc.set(w, h, 1); m4.compose(ps, q, sc); out.d.push([nome, m4.toArray()]); out.voci.push([nome, +x.toFixed(2), +(fc.y0 + y - h / 2).toFixed(2), +z.toFixed(2), +F.n[0].toFixed(2), +F.n[1].toFixed(2)]); };
    const aTerra = (nome, x, z, w, h, rot) => { const y = gH(x, z) + .015; q.setFromEuler(new THREE.Euler(0, rot, 0)); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)); ps.set(x, y, z); sc.set(w, h, 1); m4.compose(ps, q, sc); out.d.push([nome, m4.toArray()]); out.voci.push([nome, +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]); };
    const aTerraOk = (x, z, r) => { if (!PIEDI.has(tileAt(x, z))) return false; for (const [a, b] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!PIEDI.has(tileAt(x + a, z + b))) return false; return !tombino(x, z); };
    const cose = (C, fc, F, u, v, nome) => { const x = F.p[0] + F.u[0] * u, z = F.p[1] + F.u[1] * u; out.cose.push(C.posa(x, gH(x + F.n[0] * v, z + F.n[1] * v), z, F.u[0], F.u[1], F.n[0], F.n[1])); out.voci.push([nome, +(x + F.n[0] * v).toFixed(2), +fc.y0.toFixed(2), +(z + F.n[1] * v).toFixed(2)]); };
    for (const fc of list) {
      const F = faccia(fc.b, fc.rec, fc.f, fc.L / 2), A = aperture(fc), cx = F.p[0], cz = F.p[1], Zn = zona(cx + F.n[0] * .8, cz + F.n[1] * .8, F.n[0], F.n[1]), Z = ZP[Zn] || ZP.via, rit = clamp(ritmo(cx, cz), .3, 2.2);
      const uso = usoDi(fc.b), bot = !!(fc.b.__bot && fc.b.__bot.face === fc.f) || !!fc.b.shop, bar = USO_BAR.test(uso), seed = fc.bi * 7 + fc.f.charCodeAt(0);
      // i moduli liberi: i muri del piano terra (o, se la faccia non ha moduli, la faccia intera a passi di 2 m), fuori dalle aperture
      let slot = A.muri.length ? A.muri.map(m => ({ u: m.u, hw: m.hw })) : (!A.nota ? Array.from({ length: Math.floor(fc.L / 2) }, (_, k) => ({ u: 1 + k * 2 + (fc.L - Math.floor(fc.L / 2) * 2) / 2, hw: .98 })) : []);
      slot = slot.map(s => { let u0 = Math.max(.12, s.u - s.hw), u1 = Math.min(fc.L - .12, s.u + s.hw); A.ap.forEach(a => { if (a.u - a.hw < u1 && a.u + a.hw > u0) { if (a.u < s.u) u0 = Math.max(u0, a.u + a.hw); else u1 = Math.min(u1, a.u - a.hw); } }); return { u0, u1, accanto: A.ap.filter(a => a.porta && Math.min(Math.abs(a.u - a.hw - u1), Math.abs(a.u + a.hw - u0)) < .25) }; }).filter(s => s.u1 - s.u0 > .55);
      let fatto = 0, storia = false; conta('facce'); S.scarti.slot = (S.scarti.slot || 0) + slot.length; if (!slot.length) conta(A.nota ? 'faccia_senza_muri' : 'faccia_vuota');
      slot.forEach((s, si) => {
        const r = mulberry(seed * 131 + si * 17 + 5), wS = s.u1 - s.u0, um = (s.u0 + s.u1) / 2, wx = cx + F.u[0] * (um - fc.L / 2), wz = cz + F.u[1] * (um - fc.L / 2);
        const pOgni = clamp(Z.p * (.55 + .45 * rit) * (bot || bar ? 1.25 : 1), 0, .92);
        if (r() > pOgni) { conta('ritmo'); return; }
        const k = scegli(Z, r()); if (!k) return;
        if (k === 'ser' && wS > 1.7 && fatto < 2) {   // la serranda abbassata: 1,8 × 2,2 m dal piede, il pannello dipinto, guide e cassonetto in 3D
          const w = Math.min(1.8, wS - .1), d1 = piano(F, fc, um - w / 2, um + w / 2, 1.0, 2.15), d0 = piano(F, fc, um - w / 2, um + w / 2, .12, .5); if (d1 === null || d0 === null || Math.abs(d1 - d0) > .16) return;
          if (!libero(st, wx, wz, fc.y0, fc.y0 + 2.4, w / 2)) return; const d = Math.max(d0, d1), i = Math.floor(r() * N_SER);
          sulMuro(fc, F, 'serranda' + i, um, 1.1, w, 2.2, d + .012); const C = new Cose(), metal = '#6e6a70', dz = d + .05;
          C.box(0, um - fc.L / 2, 2.3, dz + .06, w + .16, .26, .16, '#58545a'); [-1, 1].forEach(sg => C.box(0, um - fc.L / 2 + sg * (w / 2 + .03), 1.1, dz + .01, .06, 2.2, .07, metal)); C.box(0, um - fc.L / 2, .03, dz + .02, w + .1, .06, .06, '#3d3548');
          cose(C, fc, F, 0, .1, 'serranda'); fatto++;
          if (r() < .45) { const x = wx + F.n[0] * .9, z = wz + F.n[1] * .9; if (aTerraOk(x, z, .5)) aTerra('macchia' + Math.floor(r() * 2), x, z, 1.1, 1.1, r() * 6.28); }
          return; }
        if (k === 'man' || k === 'fun') {   // i manifesti a strati (2 × 1,6 m) o i funebri (2 × 1 m), sopra lo zoccolo
          const fun = k === 'fun' || ((Zn === 'piazza' || Zn === 'vicolo' || Zn === 'sacro') && r() < .3), w = Math.min(fun ? 1.6 : 1.9, wS - .1), hgt = fun ? w * .5 : w * .8, y0 = fun ? 1.25 : .85;
          if (w < .9) return; const D = pianoSu(F, fc, um - w / 2, um + w / 2, y0, y0 + hgt); if (D === null || !libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + hgt, w / 2)) return;
          sulMuro(fc, F, fun ? 'funebre' + Math.floor(r() * 2) : 'manifesto' + (1 + Math.floor(r() * (N_MAN - 1))), um, y0 + D[1] + hgt / 2, w, hgt, D[0], (r() - .5) * .03); fatto++;
          if (!fun && r() < .5 && wS - w > .5) { const tw = .9 + r() * .3, uu = um + (r() < .5 ? -1 : 1) * Math.min(w / 2, (wS - tw) / 2), D2 = pianoSu(F, fc, uu - tw / 2, uu + tw / 2, y0 + D[1] + hgt * .55, y0 + D[1] + hgt * .55 + tw * .25); if (D2) sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), uu, y0 + D[1] + D2[1] + hgt * .55 + tw * .125, tw, tw * .25, Math.max(D[0], D2[0]) + .004, (r() - .5) * .1); }   // la tag sopra il manifesto: gli strati
          return; }
        if (k === 'tag') {   // le tag: una, due o tre in colonna, di mani diverse; sotto, a volte, la colatura e la vernice caduta
          const n = 1 + Math.floor(r() * 3 * Math.min(1, rit)); let y = .95 + r() * .3;
          for (let j = 0; j < n; j++) { const w = Math.min(wS - .1, 1.05 + r() * .55), hgt = w * .26, uu = um + (r() - .5) * Math.max(0, wS - w - .1); const D = pianoSu(F, fc, uu - w / 2, uu + w / 2, y, y + hgt); if (D !== null && libero(st, wx, wz, fc.y0 + y, fc.y0 + y + hgt, w / 2)) { y += D[1]; sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), uu, y + hgt / 2, w, hgt, D[0], (r() - .5) * .12); fatto++; } y += hgt + .08 + r() * .2; }
          if (r() < .75) { const x = wx + F.n[0] * .55, z = wz + F.n[1] * .55; if (aTerraOk(x, z, .3)) aTerra('vernice' + Math.floor(r() * 4), x, z, 1.0, .9, r() * 6.28); }
          return; }
        if (k === 'thr' && wS > 1.4) {   // il throw-up (fino a 2 × 1 m): la vernice a terra, e dove i writer stanno la cassa e le bombolette
          const w = Math.min(2, wS - .1), hgt = w * .5, y0 = .5 + r() * .3, D = pianoSu(F, fc, um - w / 2, um + w / 2, y0, y0 + hgt); if (D === null || !libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + hgt, w / 2)) return;
          sulMuro(fc, F, 'throw' + Math.floor(r() * N_THROW), um, y0 + D[1] + hgt / 2, w, hgt, D[0]); fatto++;
          { const x = wx + F.n[0] * .55, z = wz + F.n[1] * .55; if (aTerraOk(x, z, .4)) aTerra('vernice' + Math.floor(r() * 4), x, z, 1.3, .9, Math.atan2(F.u[0], F.u[1]) + (r() - .5) * .4); }
          if (!storia && (Zn === 'sottopasso' || Zn === 'ferrovia' || Zn === 'vicolo' || Zn === 'porto' || Zn === 'ritrovo') && r() < .7) { const x = wx + F.n[0] * .5, z = wz + F.n[1] * .5; if (aTerraOk(x, z, .5) && libero(st, x, z, fc.y0, fc.y0 + 1, .4)) {
            const C = new Cose(), u0 = um - fc.L / 2 + w * .35; PZ.cassaBirra(C, u0, .35, 0, .3, INK.blu); ['#e04b8c', '#2a8a8a', '#16121b'].forEach((c2, j) => PZ.bombola(C, u0 - .35 - j * .14, .3 + (j % 2) * .12, c2, j === 2)); cose(C, fc, F, 0, .4, 'cosa_writer'); storia = true; } }
          return; }
        if (k === 'ade' && wS > .6) { const w = .48 + r() * .2, y0 = 1.0 + r() * .4, uu = um + (r() - .5) * (wS - w - .1), D = pianoSu(F, fc, uu - w / 2, uu + w / 2, y0, y0 + w); if (D !== null && libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + w, w / 2)) { sulMuro(fc, F, 'adesivo' + Math.floor(r() * N_ADE), uu, y0 + D[1] + w / 2, w, w, D[0], (r() - .5) * .14); fatto++;
          if (r() < .55 && wS > 1.4) { const tw = .9 + r() * .4, u2 = um - Math.sign(uu - um || 1) * (wS - tw) / 2 * .8, D2 = pianoSu(F, fc, u2 - tw / 2, u2 + tw / 2, 1.3, 1.3 + tw * .26); if (D2 && libero(st, wx, wz, fc.y0 + 1.3, fc.y0 + 1.7, .2)) sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), u2, 1.3 + D2[1] + tw * .13, tw, tw * .26, D2[0], (r() - .5) * .1); } } }   // gli adesivi e accanto una tag
      });
      // le porte: sugli stipiti (i 45 cm di muro del modulo accanto all'apertura) il civico di maiolica delle case, gli adesivi all'altezza
      // della mano; davanti al bar i mozziconi e i tappi
      if (Zn !== 'regime') A.ap.filter(a => a.porta).forEach((a, j) => { const r = mulberry(seed * 389 + j * 7 + 1), lato = r() < .5 ? 1 : -1, ax = cx + F.u[0] * (a.u - fc.L / 2), az = cz + F.u[1] * (a.u - fc.L / 2), hw = .55;
        if (!bot && !bar && r() < .6) { const u = a.u + lato * (hw + .2), d = piano(F, fc, u - .09, u + .09, 1.82, 2.0); if (d !== null && libero(st, ax, az, fc.y0 + 1.8, fc.y0 + 2.02, .1)) sulMuro(fc, F, 'civico' + Math.floor(r() * 16), u, 1.91, .17, .17, d); }
        if ((Z.ade || 0) > 0 && Zn !== 'sacro' && r() < .55 * Math.min(1.3, rit)) { const w = .28 + r() * .06, u = a.u - lato * (hw + .05 + w / 2), y0 = 1.0 + r() * .35, d = piano(F, fc, u - w / 2, u + w / 2, y0, y0 + w); if (d !== null && libero(st, ax, az, fc.y0 + y0, fc.y0 + y0 + w, .05)) sulMuro(fc, F, 'adesivo' + Math.floor(r() * N_ADE), u, y0 + w / 2, w, w, d, (r() - .5) * .12); }
        if (bar && r() < .85) { const u = a.u + lato * (hw + .3), x = cx + F.u[0] * (u - fc.L / 2) + F.n[0] * 1.5, z = cz + F.u[1] * (u - fc.L / 2) + F.n[1] * 1.5; if (aTerraOk(x, z, .4)) aTerra('mozziconi' + Math.floor(r() * 2), x, z, .9, .9, r() * 6.28); } });
      // a terra lungo il piede del muro: le macchie (l'olio sul porto, il caffè e l'acqua sporca nelle vie), ogni tanto
      if (/^(via|vicolo|porto|ritrovo|sottopasso|ferrovia)$/.test(Zn)) for (let t = 2; t < fc.L - 1; t += 6) { const r = mulberry(seed * 61 + t * 13); if (r() > (Zn === 'porto' ? .45 : .22)) continue; const x = cx + F.u[0] * (t - fc.L / 2) + F.n[0] * (.8 + r()), z = cz + F.u[1] * (t - fc.L / 2) + F.n[1] * (.8 + r()); if (aTerraOk(x, z, .6) && !A.ap.some(a => Math.abs(a.u - t) < a.hw + .3 && a.porta)) aTerra('macchia' + (Zn === 'porto' ? 0 : Math.floor(r() * 2)), x, z, 1.2 + r() * .6, 1 + r() * .5, r() * 6.28); }
      // il gesso dei bambini sotto casa, nei vicoli e nelle vie di casa (non davanti alle botteghe)
      if (!bot && !bar && (Zn === 'vicolo' || Zn === 'via') && hh(fc.bi, fc.f.charCodeAt(0), 11) < .3) { const r = mulberry(seed * 7 + 99), t = fc.L * (.25 + r() * .5), x = cx + F.u[0] * (t - fc.L / 2) + F.n[0] * (1.6 + r() * .6), z = cz + F.u[1] * (t - fc.L / 2) + F.n[1] * (1.6 + r() * .6); const camp = r() < .35; if (aTerraOk(x, z, 1.1) && !gessoGia(x, z)) aTerra(camp ? 'campana' : 'gesso' + Math.floor(r() * 3), x, z, camp ? 2.6 : 1.2, camp ? 1.3 : 1.2, Math.atan2(F.u[0], F.u[1]) + (r() - .5) * .5); }
      // le colature sotto le finestre del piano terra (i davanzali), poche
      A.ap.filter(a => !a.porta && !a.vetrina && !a.garage && /window/.test(a.nome || '')).forEach((a, j) => { const r = mulberry(seed * 977 + j); if (r() > .3) return; const d = piano(F, fc, a.u - .3, a.u + .3, .2, .75); if (d !== null) sulMuro(fc, F, 'colatura' + Math.floor(r() * 2), a.u + (r() - .5) * .2, .5, .6, .7, d); });
      // la piccola storia davanti alla bottega o al bar, su un modulo di muro pieno accanto alla porta, se il marciapiede è largo
      if ((bar || bot || USO_CASSE.test(uso) || USO_OFF.test(uso) || ((Zn === 'vicolo' || Zn === 'via') && !bot && hh(fc.bi, 7, 3) < .3)) && slot.length && Zn !== 'regime' && Zn !== 'sacro') {
        const s = slot.reduce((a, q) => (q.accanto.length && (!a || q.u1 - q.u0 > a.u1 - a.u0)) ? q : a, null) || slot[0], um = (s.u0 + s.u1) / 2, wS = s.u1 - s.u0, r = mulberry(seed * 53 + 11);
        const ok = v => { const x = cx + F.u[0] * (um - fc.L / 2) + F.n[0] * v, z = cz + F.u[1] * (um - fc.L / 2) + F.n[1] * v; return aTerraOk(x, z, .45) && libero(st, x, z, fc.y0, fc.y0 + 1.2, .5); };
        if (wS > 1.1 && ok(.5) && ok(1.3)) { const C = new Cose(), u0 = um - fc.L / 2;
          if (bar) { PZ.sedia(C, u0 - .35, .55, Math.PI + (r() - .5) * .5); PZ.sedia(C, u0 + .45, .7, Math.PI - .4 + (r() - .5) * .4, r() < .5 ? '#EEEBE2' : '#D8E0C8'); PZ.cassaBirra(C, u0 + .05, 1.15, 0, r(), r() < .5 ? INK.mattone : INK.ocra); PZ.cassaBirra(C, u0 + .7, .25, 0, .1, INK.mattone); PZ.cassaBirra(C, u0 + .7, .25, .29, .05, INK.mattone); }
          else if (USO_CASSE.test(uso)) { const fr = uso === 'pescheria' ? '#A3D4D8' : ['#DC9A34', '#C25B36', '#93B27C'][Math.floor(r() * 3)]; PZ.cassetta(C, u0 - .3, .25, 0, 0, null); PZ.cassetta(C, u0 - .3, .25, .16, .05, null); PZ.cassetta(C, u0 - .3, .25, .32, -.04, fr); PZ.cassetta(C, u0 + .35, .3, 0, .1, fr); PZ.sedia(C, u0 + .1, .9, Math.PI + .3); }
          else if (USO_OFF.test(uso)) { PZ.secchio(C, u0 - .4, .25); PZ.cassetta(C, u0 + .3, .25, 0, .2, null); PZ.cassaBirra(C, u0 + .3, .25, .16, .2, INK.blu); }
          else if (bot) { PZ.sedia(C, u0 + .1, .45, Math.PI + (r() - .5) * .6, r() < .5 ? '#EEEBE2' : '#93B27C'); if (r() < .5) PZ.cassetta(C, u0 + .65, .25, 0, .2, null); }   // il negoziante seduto fuori quando non c'è nessuno
          else { PZ.sedia(C, u0 + .1, .45, Math.PI + (r() - .5) * .6, r() < .5 ? '#EEEBE2' : '#A3D4D8'); if (r() < .35) PZ.secchio(C, u0 + .7, .2); }   // la sedia della signora accanto alla porta (e il secchio con la scopa)
          cose(C, fc, F, 0, .6, bar ? 'cosa_bar' : USO_CASSE.test(uso) ? 'cosa_bottega' : USO_OFF.test(uso) ? 'cosa_officina' : bot ? 'cosa_negozio' : 'cosa_porta'); }
      }
      yield;
    }
    // a terra, nelle piazze e nei vicoli di questa cella: il gesso dei bambini (pochi, lontano dai muri e dalla carreggiata)
    { const r = mulberry(cel.k * 7 + 3), x0 = cel.i * CELL, z0 = cel.j * CELL; let fatti = 0; for (let n = 0; n < 5; n++) { const x = x0 + 3 + r() * (CELL - 6), z = z0 + 3 + r() * (CELL - 6), v = tileAt(x, z); if ((v !== T.PIAZZA && v !== T.COB) || !aTerraOk(x, z, 2.2)) continue; const Zn = zona(x, z, 0, 0); if (!/^(piazza|vicolo|via|ritrovo)$/.test(Zn) || r() > (Zn === 'piazza' ? .8 : .45)) continue;
      if (!libero(st, x, z, -99, 99, 1.6) || gessoGia(x, z)) continue; if (r() < .45) aTerra('campana', x, z, 3.0, 1.5, r() * 6.28); else aTerra('gesso' + Math.floor(r() * 3), x, z, 1.5, 1.5, r() * 6.28); if (++fatti >= 2) break; } }
    // sotto le edicole votive: i lumini e i fiori (i pezzi del mondo, W.pezzi)
    ((G.MAP.world && G.MAP.world.pezzi) || []).forEach(p => { if (p.tipo !== 'edicola_votiva' || Math.floor(p.x / CELL) !== cel.i || Math.floor(p.y / CELL) !== cel.j) return; const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
      for (const sg of [1, -1]) { const nx = -s * sg, nz = c * sg, ux = c, uz = s, x = p.x + nx * .55, z = p.y + nz * .55; if (!PIEDI.has(tileAt(x, z))) continue; const C = new Cose(); [[-.22, 0, '#c8303a'], [-.1, .08, '#f2ead6'], [.04, 0, '#c8303a'], [.18, .06, '#DC9A34']].forEach(([a, b, k2]) => PZ.lumino(C, a, b, k2)); PZ.fiori(C, .36, .02, INK.magenta); PZ.fiori(C, -.4, .04, INK.ocra);
        out.cose.push(C.posa(x, gH(x, z), z, ux, uz, nx, nz)); out.voci.push(['cosa_edicola', +x.toFixed(2), +gH(x, z).toFixed(2), +z.toFixed(2)]); break; } });
    // il bucato teso nei vicoli stretti (dove non c'è già): due muri a meno di 7 m, a 4,2 m, i panni colorati
    if (cel.bucato !== false) bucato(cel, out);
    return out;
  }
  function pianifica(cel, st) { const g = pianificaG(cel, st); let r; do r = g.next(); while (!r.done); return r.value; }
  function bucato(cel, out) {
    const Wd = G.MAP.world; if (!Wd || !Wd.roads) return; const r = mulberry(cel.k * 13 + 1), ESIST = (window.__PV_FILI || []).filter(f => /bucato/.test(f.k || ''));
    Wd.roads.forEach(rd => { if (rd.kind !== 'vicolo' || !rd.pts) return; for (let k = 1; k < rd.pts.length; k++) { const a = rd.pts[k - 1], b = rd.pts[k], L = hyp(b[0] - a[0], b[1] - a[1]); if (L < 3) continue; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s = 4; s < L - 2; s += 11) { const x = a[0] + ux * s, z = a[1] + uz * s; if (Math.floor(x / CELL) !== cel.i || Math.floor(z / CELL) !== cel.j || r() > .5) continue; if (ESIST.some(f => hyp((f.a[0] + f.b[0]) / 2 - x, (f.a[2] + f.b[2]) / 2 - z) < 6)) continue;
        const gy = gH(x, z), y = gy + 4.2, nx = -uz, nz = ux; const pA = muroA(x, y, z, -nx, -nz), pB = muroA(x, y, z, nx, nz); if (!pA || !pB) continue; const W2 = hyp(pA.x - pB.x, pA.z - pB.z); if (W2 > 7 || W2 < 2) continue;
        const C = new Cose(), dx = pB.x - pA.x, dz = pB.z - pA.z, n = Math.ceil(W2 / .4), cols = [INK.crema, INK.acqua, INK.magenta, '#F6F2E8', INK.ocra, INK.blu, INK.salvia, INK.pesca], yaw = Math.atan2(dx, dz) + Math.PI / 2;
        for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2, sag = Math.sin(tm * Math.PI) * .35; C.box(0, pA.x + dx * tm, y - sag, pA.z + dz * tm, .015, .015, W2 / n + .01, '#d8d0c0', Math.atan2(dx, dz)); }
        for (let i = 1; i < 7; i++) { const t = i / 7 + (r() - .5) * .04; if (r() < .25) continue; const sag = Math.sin(t * Math.PI) * .35, w = .3 + r() * .35, h = .35 + r() * .45; C.box(0, pA.x + dx * t, y - sag - h / 2, pA.z + dz * t, w, h, .02, cols[Math.floor(r() * cols.length)], yaw); }
        const o = C.posa(0, 0, 0, 1, 0, 0, 1); out.cose.push(o); out.voci.push(['cosa_bucato', +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]); } } });
  }

  // ================= OGNI FOTOGRAMMA =================
  let lx = 1e9, lz = 1e9, sporco = true, st0 = null, tFacce = 0;
  function tick(st) {
    if (!S.on) return; const cam = R().cam; if (!cam || !isFinite(cam.x)) return; st0 = st || st0;
    const t0 = performance.now();
    if (!GRUPPO) { const sc = R().__models && R().__models.scene; if (!sc) return; GRUPPO = new THREE.Group(); GRUPPO.name = 'pieno'; sc.add(GRUPPO); window.__PIENO_G = GRUPPO; cresci(256); cresciCose(8192); caricaAtlante(); }
    // l'atlante a passi (i caratteri dei graffiti prima)
    if (!ATL.pronto && ATL.passi.length && fontPronti()) { while (ATL.passi.length && performance.now() - t0 < BUDGET * 2) { const f = ATL.passi.shift(); try { f(); } catch (e) { S.err = 'atlante: ' + e.message; } } }
    // le facce: quando le case ci sono (il registro del regista è pronto, o coi tasselli i dati delle case)
    if (!FACCE) { if (!R().__dz || !R().__dz.bRec || !R().__dz.bRec.length || !(window.__pulizia2 || (window.__tasselli && window.__tasselli.on))) return; if (performance.now() - tFacce < 1000) return; tFacce = performance.now(); FACCE = facce(); if (!FACCE) return; }
    // le celle vicine da pianificare, la più vicina prima, nel budget
    const ci = Math.floor(cam.x / CELL), cj = Math.floor(cam.y / CELL), nR = Math.ceil(RV / CELL) + 1, da = [];
    for (let i = ci - nR; i <= ci + nR; i++) for (let j = cj - nR; j <= cj + nR; j++) { const k = keyC(i, j); let c = PIANO.get(k); if (!c) PIANO.set(k, c = { k, i, j, stato: 0, prove: 0 }); if (c.stato === 0 && performance.now() >= (c.dopo || 0)) da.push([hyp((i + .5) * CELL - cam.x, (j + .5) * CELL - cam.y), c]); }
    da.sort((a, b) => a[0] - b[0]);
    for (const [d, c] of da) { if (d > RV + CELL || performance.now() - t0 > BUDGET) break;
      try { if (!c.gen) { c.gen = pianificaG(c, st0); c.r0 = S.raggi; c.m0 = S.scarti.senza_muro || 0; } let r; do r = c.gen.next(); while (!r.done && performance.now() - t0 < BUDGET); if (!r.done) break;
        const o = r.value; c.gen = null; if ((S.scarti.senza_muro || 0) - c.m0 > 0 && !o.d.length && !o.cose.length && (FACCE.get(c.k) || []).length && c.prove < 3) { c.prove++; c.dopo = performance.now() + 4000; continue; }   // i muri non ancora arrivati (tasselli): si riprova
        Object.assign(c, o, { stato: 1 }); S.celle++; sporco = true; } catch (e) { S.err = 'pianta: ' + e.message; c.gen = null; c.stato = 1; c.d = []; c.cose = []; c.voci = []; } }
    // le liste da disegnare quando la camera si sposta o una cella è pronta
    if (sporco || hyp(cam.x - lx, cam.y - lz) > 3) { lx = cam.x; lz = cam.y; sporco = false; rifai(cam.x, cam.y); }
    S.ms = +(S.ms * .9 + (performance.now() - t0) * .1).toFixed(2);
  }
  function rifai(x, z) {
    const vis = []; PIANO.forEach(c => { if (c.stato === 1 && hyp((c.i + .5) * CELL - x, (c.j + .5) * CELL - z) < RV + CELL * .75) vis.push(c); });
    let nd = 0, nv = 0; vis.forEach(c => { nd += c.d.length; c.cose.forEach(o => nv += o.p.length / 3); });
    if (nd > CAP) cresci(nd); if (nv > CV) cresciCose(nv);
    const RA = DEC.geometry.getAttribute('aRect'), M = DEC.instanceMatrix.array; let i = 0;
    if (ATL.pronto) vis.forEach(c => c.d.forEach(([nome, m]) => { const q = CELLE[nome]; if (!q) return; M.set(m, i * 16); const pad = 3 + 1 / K; RA.array.set([(q[0] + pad) / AW, 1 - (q[1] + q[3] - pad) / AH, (q[2] - pad * 2) / AW, (q[3] - pad * 2) / AH], i * 4); i++; }));
    DEC.count = i; DEC.instanceMatrix.needsUpdate = true; RA.needsUpdate = true; S.decal = i;
    // la sfera per il taglio fuori dall'inquadratura: chi passa a rimettere frustumCulled (i rami del gioco) trova quella giusta, attorno alla camera
    const gy = gH(x, z), SF = (g, r) => { if (!g.boundingSphere) g.boundingSphere = new THREE.Sphere(); g.boundingSphere.center.set(x, gy, z); g.boundingSphere.radius = r; };
    SF(DEC.geometry, RV + CELL + 8); SF(COSE.geometry, RV + CELL + 8);   // (le cose non si tagliano, ma la sfera giusta serve alle ombre)
    const G2 = COSE.geometry, P = G2.attributes.position.array, N = G2.attributes.normal.array, Cc = G2.attributes.color.array; let o = 0;
    vis.forEach(c => c.cose.forEach(q => { P.set(q.p, o * 3); N.set(q.n, o * 3); Cc.set(q.c, o * 3); o += q.p.length / 3; }));
    G2.setDrawRange(0, o); ['position', 'normal', 'color'].forEach(k => { const a = G2.attributes[k]; a.needsUpdate = true; if (a.updateRange) { a.updateRange.offset = 0; a.updateRange.count = o * 3; } }); S.cose = vis.reduce((a, c) => a + c.cose.length, 0); S.verts = o;
  }
  if (Render.frame) { const f0 = Render.__pienoF0 || Render.frame; Render.__pienoF0 = f0; Render.frame = function (st) { try { tick(st); } catch (e) { S.err = String(e && e.message || e); } return f0.apply(this, arguments); }; }   // (una volta sola: ricaricato, il modulo prende il posto del vecchio)
  if (window.__PIENO_G && window.__PIENO_G.parent) window.__PIENO_G.parent.remove(window.__PIENO_G);
  return {
    attivo: true, CELLE, stato: () => S,
    elenco: () => { const L = []; PIANO.forEach(c => (c.voci || []).forEach(v => L.push(v))); return L; },
    imposta: on => { S.on = !!on; if (GRUPPO) GRUPPO.visible = S.on; return S.on; },
    // strumenti/pieno_atlante.js: l'atlante pieno, disegnato tutto d'un fiato (fuori dal gioco), come immagine
    disegnaAtlante: () => { const k0 = K, P0 = ATL.passi.slice(), c0 = ATL.cnv, x0 = ATL.x, p0 = ATL.pronto, t0 = ATL.tex; K = 1; ATL.passi = []; ATL.pronto = false; preparaAtlante(); ATL.passi.pop();   // l'ultimo passo manda alla scheda video: qui no
      ATL.passi.forEach(f => f()); const out = ATL.cnv; Object.assign(ATL, { passi: P0, cnv: c0, x: x0, pronto: p0, tex: t0 }); K = k0; return out; },
    disegni: () => (DEC && DEC.count ? 1 : 0) + (COSE && COSE.geometry.drawRange.count ? 1 : 0),
    // per il censimento: pianifica tutte le celle della città (fuori dal gioco normale; lento)
    tutto: (st, x0, z0, x1, z1) => { if (!FACCE) FACCE = facce(); for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = keyC(i, j); let c = PIANO.get(k); if (!c) PIANO.set(k, c = { k, i, j, stato: 0, prove: 0 }); if (c.stato === 0) { c.gen = null; Object.assign(c, pianifica(c, st), { stato: 1 }); S.celle++; } } sporco = true; return S; },
  };
})();
if (typeof module !== 'undefined') module.exports = Pieno;
