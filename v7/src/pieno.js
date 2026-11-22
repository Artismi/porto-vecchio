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
  let K = 1; const AW = 2048, AH = 2048;   // K: la scala del disegno (l'atlante si disegna pieno, una volta, in strumenti/pieno_atlante.js)
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
  // [pieno2] la seconda metà: i pezzi grandi (anche per i lavori dei writer non ancora disegnati), gli stencil, i volantini, le frecce, il
  // gesso grande, la pozza, lo spruzzo, altre tag e throw-up
  for (let i = 0; i < 4; i++) cella('pezzo' + i, i * 512, 1024, 512, 256);
  cella('burner0', 0, 1280, 512, 256); cella('burner1', 512, 1280, 512, 256); cella('calli0', 1024, 1280, 512, 256); cella('calli1', 1536, 1280, 512, 256);
  for (let i = 0; i < 4; i++) cella('stencil' + i, i * 256, 1536, 256, 256);
  cella('volantini0', 1024, 1536, 256, 256); cella('volantini1', 1280, 1536, 256, 256); cella('freccia0', 1536, 1536, 256, 256); cella('freccia1', 1792, 1536, 256, 256);
  for (let i = 0; i < 4; i++) cella('throw' + (8 + i), (i % 2) * 256, 1792 + (i >> 1) * 128, 256, 128);
  for (let i = 0; i < 8; i++) cella('tag' + (16 + i), 512 + (i % 2) * 256, 1792 + (i >> 1) * 64, 256, 64);
  cella('gessone', 1024, 1792, 512, 256); cella('pozza', 1536, 1792, 256, 256); cella('spruzzo', 1792, 1792, 256, 256);
  const N_TAG = 24, N_THROW = 12, N_ADE = 8, N_MAN = 6, N_SER = 6, N_PEZ = 4;

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
    x.strokeStyle = 'rgba(250,246,236,1)'; x.fillStyle = 'rgba(250,246,236,1)'; x.lineWidth = 6 * K * 2; x.lineCap = 'round';
    const u = h * .25, y0 = h / 2, cs = [[0, 1], [1, 1], [2, 2], [3, 1], [4, 2], [5, 1]]; let n = 1;
    x.font = `bold ${Math.round(u * .5)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
    cs.forEach(([c, m]) => { const X = w * .06 + c * u * 1.05; if (m === 1) { x.strokeRect(X, y0 - u / 2, u, u); x.fillText(String(n++), X + u / 2, y0); } else { x.strokeRect(X, y0 - u, u, u); x.strokeRect(X, y0, u, u); x.fillText(String(n++), X + u / 2, y0 - u / 2); x.fillText(String(n++), X + u / 2, y0 + u / 2); } });
    const X = w * .06 + 6 * u * 1.05; x.beginPath(); x.arc(X, y0, u, -Math.PI / 2, Math.PI / 2); x.stroke(); x.font = `bold ${Math.round(u * .32)}px Arial`; x.fillText('CIELO', X + u * .45, y0);
    x.fillStyle = 'rgba(224,75,140,.8)'; x.beginPath(); x.arc(X - u * 3.5, y0 + u * .2, u * .12, 0, 6.3); x.fill();   // il sasso rosa
  }
  function polvere(x, w, h, r) {   // il gesso è polvere: si toglie a puntini (il segno si sgrana, mezzo cancellato dai passi)
    x.save(); x.globalCompositeOperation = 'destination-out'; for (let n = 0; n < w * h / 22; n++) { x.globalAlpha = .2 + r() * .45; x.fillRect(r() * w, r() * h, 1 + r() * 2 * K, 1 + r() * 2 * K); }
    x.globalAlpha = .5; for (let n = 0; n < 3; n++) { const px = r() * w, py = r() * h, R2 = w * (.08 + r() * .12), g = x.createRadialGradient(px, py, 0, px, py, R2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); } x.restore(); }
  function gesso(x, w, h, r, k, i) {   // i disegni col gesso: il sole e la casetta, il cuore coi nomi, la scritta e la freccia
    const C = ['rgba(250,246,236,1)', 'rgba(244,170,90,1)', 'rgba(120,200,210,1)', 'rgba(234,70,140,1)', 'rgba(130,190,100,1)']; x.lineWidth = 6 * K * 2; x.lineCap = 'round'; x.lineJoin = 'round';
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
  function stencil(x, w, h, r, k, i) {   // lo stencil della crew a spruzzo: la sagoma piena, i ponticelli, l'alone dello spray
    const col = [INK.nero, INK.magenta, INK.crema, INK.petrolio][i], testo = ['PVK', 'RISACCA', 'TNT', 'BDS'][i];
    x.save(); x.shadowColor = col; x.shadowBlur = 6 * K * 2; x.fillStyle = col; x.strokeStyle = col; x.lineWidth = w * .05;
    if (i === 0) { x.beginPath(); x.arc(w / 2, h * .42, w * .3, 0, 6.3); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(w * .4, h * .36, w * .07, 0, 6.3); x.arc(w * .6, h * .36, w * .07, 0, 6.3); x.fill(); x.fillRect(w * .36, h * .52, w * .28, h * .05); x.globalCompositeOperation = 'source-over'; }   // la faccia del re
    else if (i === 1) { for (let j = 0; j < 3; j++) { x.beginPath(); for (let t = 0; t <= 1; t += .05) { const px = w * (.12 + t * .76), py = h * (.25 + j * .13) + Math.sin(t * 12) * h * .04; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } }   // le onde
    else if (i === 2) { x.beginPath(); x.moveTo(w * .5, h * .1); x.lineTo(w * .62, h * .4); x.lineTo(w * .9, h * .42); x.lineTo(w * .66, h * .58); x.lineTo(w * .76, h * .85); x.lineTo(w * .5, h * .68); x.lineTo(w * .24, h * .85); x.lineTo(w * .34, h * .58); x.lineTo(w * .1, h * .42); x.lineTo(w * .38, h * .4); x.closePath(); x.fill(); }   // la stella
    else { x.beginPath(); x.moveTo(w * .15, h * .55); x.quadraticCurveTo(w * .5, h * .05, w * .85, h * .55); x.lineTo(w * .7, h * .55); x.lineTo(w * .7, h * .62); x.lineTo(w * .3, h * .62); x.lineTo(w * .3, h * .55); x.closePath(); x.fill(); }   // la vela
    x.shadowBlur = 0; x.font = `bold ${Math.round(h * .17)}px Impact, sans-serif`; x.textAlign = 'center'; x.fillText(testo, w / 2, h * .88); x.restore();
    x.save(); x.globalAlpha = .18; x.fillStyle = col; for (let n = 0; n < 90; n++) { x.beginPath(); x.arc(w / 2 + (r() - .5) * w * .95, h / 2 + (r() - .5) * h * .95, (.6 + r()) * K * 2, 0, 6.3); x.fill(); } x.restore();   // l'alone
  }
  function volantini(x, w, h, r, k, i) {   // i volantini della serata buttati a terra, calpestati
    const carte = [[INK.ocra, INK.nero], [INK.magenta, INK.crema], [INK.crema, INK.vino], [INK.acqua, INK.marina], ['#F6F2E8', INK.nero]];
    for (let n = 0; n < 9 + i * 3; n++) { const [c1, c2] = carte[Math.floor(r() * carte.length)], fw = w * (.16 + r() * .08), fh = fw * 1.38; x.save(); x.translate(w * (.15 + r() * .7), h * (.15 + r() * .7)); x.rotate(r() * 6.28);
      x.fillStyle = c1; x.fillRect(-fw / 2, -fh / 2, fw, fh); x.fillStyle = c2; x.fillRect(-fw * .38, -fh * .36, fw * .76, fh * .16); for (let j = 0; j < 3; j++) x.fillRect(-fw * .38, fh * (.0 + j * .1), fw * (.76 - j * .15), fh * .04);
      x.fillStyle = 'rgba(40,30,30,.25)'; x.beginPath(); x.ellipse(fw * (r() - .5) * .5, fh * (r() - .5) * .5, fw * .25, fh * .12, r() * 3, 0, 6.3); x.fill(); x.restore(); }   // l'impronta della scarpa
  }
  function freccia(x, w, h, r, k, i) {   // la freccia dipinta a terra che porta alla jam (o al muro della crew)
    const col = i ? INK.acqua : INK.magenta; x.save(); x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 5 * K * 2;
    x.beginPath(); x.moveTo(w * .08, h * .42); x.lineTo(w * .62, h * .42); x.lineTo(w * .62, h * .26); x.lineTo(w * .93, h * .5); x.lineTo(w * .62, h * .74); x.lineTo(w * .62, h * .58); x.lineTo(w * .08, h * .58); x.closePath(); x.fill();
    x.shadowBlur = 0; x.fillStyle = INK.nero; x.font = `bold ${Math.round(h * .12)}px Impact, sans-serif`; x.textAlign = 'center'; x.fillText(i ? 'MURO' : 'JAM', w * .36, h * .54); x.restore();
    for (let n = 0; n < 8; n++) { x.fillStyle = col; x.globalAlpha = .8; x.fillRect(w * (.1 + r() * .5), h * .58, 2 * K * 2, h * (.04 + r() * .1)); } x.globalAlpha = 1;   // le colature della vernice
  }
  function gessone(x, w, h, r) {   // il disegno grande col gesso: il mare, la barca, il sole, i nomi dei bambini
    x.lineWidth = 7 * K * 2; x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = 'rgba(120,200,210,1)'; for (let j = 0; j < 3; j++) { x.beginPath(); for (let t = 0; t <= 1; t += .02) { const px = w * (.04 + t * .92), py = h * (.68 + j * .1) + Math.sin(t * 22 + j) * h * .03; t ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
    x.strokeStyle = 'rgba(244,170,90,1)'; x.beginPath(); x.arc(w * .82, h * .25, h * .13, 0, 6.3); x.stroke(); for (let j = 0; j < 10; j++) { const a = j / 10 * 6.28; x.beginPath(); x.moveTo(w * .82 + Math.cos(a) * h * .17, h * .25 + Math.sin(a) * h * .17); x.lineTo(w * .82 + Math.cos(a) * h * .24, h * .25 + Math.sin(a) * h * .24); x.stroke(); }
    x.strokeStyle = 'rgba(250,246,236,1)'; x.beginPath(); x.moveTo(w * .3, h * .62); x.lineTo(w * .55, h * .62); x.lineTo(w * .5, h * .7); x.lineTo(w * .34, h * .7); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(w * .42, h * .62); x.lineTo(w * .42, h * .25); x.lineTo(w * .55, h * .55); x.lineTo(w * .42, h * .55); x.stroke();
    x.fillStyle = 'rgba(234,70,140,1)'; x.font = `bold ${Math.round(h * .16)}px Arial`; x.fillText('GIGI', w * .06, h * .2); x.fillStyle = 'rgba(130,190,100,1)'; x.fillText('ANNA', w * .06, h * .38);
    x.strokeStyle = 'rgba(220,154,52,.9)'; x.strokeRect(w * .62, h * .44, w * .1, h * .1);
  }
  function pozza(x, w, h, r) {   // la pozza: l'acqua scura che riflette il cielo e le luci (un riflesso chiaro, un'orlatura)
    x.save(); x.beginPath(); for (let a = 0; a <= 6.3; a += .3) { const R2 = (.36 + r() * .1) * w; a ? x.lineTo(w / 2 + Math.cos(a) * R2, h / 2 + Math.sin(a) * R2 * .7) : x.moveTo(w / 2 + R2, h / 2); } x.closePath(); x.clip();
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(42,60,94,.78)'); g.addColorStop(.5, 'rgba(32,45,94,.7)'); g.addColorStop(1, 'rgba(60,40,90,.75)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(163,212,216,.55)'; x.beginPath(); x.ellipse(w * .42, h * .4, w * .2, h * .04, -.4, 0, 6.3); x.fill(); x.fillStyle = 'rgba(224,75,140,.4)'; x.beginPath(); x.ellipse(w * .6, h * .6, w * .1, h * .03, -.4, 0, 6.3); x.fill(); x.restore();
  }
  function spruzzo(x, w, h, r) {   // lo spruzzo dei writer a terra: la nebbia di colore sotto il muro, le prove, i tappi
    [INK.magenta, INK.petrolio, INK.ocra, INK.blu, INK.nero].forEach((c, j) => { const cx0 = w * (.2 + r() * .6), cy0 = h * (.25 + r() * .5); for (let n = 0; n < 140; n++) { const a = r() * 6.28, d = Math.pow(r(), .5) * w * .22; x.globalAlpha = .3 + r() * .35; x.fillStyle = c; x.beginPath(); x.arc(cx0 + Math.cos(a) * d, cy0 + Math.sin(a) * d, (.8 + r() * 2) * K * 2, 0, 6.3); x.fill(); } });
    x.globalAlpha = 1; x.lineWidth = 4 * K * 2; x.lineCap = 'round'; [INK.magenta, INK.acqua].forEach(c => { x.strokeStyle = c; x.beginPath(); x.moveTo(w * (.2 + r() * .2), h * (.7 + r() * .1)); x.bezierCurveTo(w * .4, h * .5, w * .6, h * .9, w * (.7 + r() * .2), h * (.6 + r() * .2)); x.stroke(); });   // le prove della bomboletta
  }
  // l'atlante si disegna a passi (un pezzo a fotogramma, nel budget), poi sale una volta sola alla scheda video
  const ATL = { cnv: null, x: null, tex: null, passi: [], pronto: false, carica: false };
  // il gioco carica l'atlante già disegnato (assets/pieno/atlante.png; sul telefono atlante_tel.png, a metà): i pennelli dei writer costano
  // 0,1-0,4 s a disegno, quaranta disegni sarebbero secondi di scatti. Se il file manca, lo si disegna qui a passi (fuori dal gioco, o lento)
  const FILE = TEL ? 'assets/pieno/atlante_tel.png' : 'assets/pieno/atlante.png';
  function caricaAtlante() {
    ATL.carica = true; const u = (window.PV_V || (x => x))(FILE);
    new THREE.TextureLoader().load(u, t => { t.anisotropy = TEL ? 2 : 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
      ATL.tex = t; MAT.map = t; MAT.emissiveMap = t; MAT.needsUpdate = true; ATL.pronto = true; ATL.passi.length = 0; S.atlante = 2; sporco = true; }, undefined, () => { S.atlante = -1; K = TEL ? .5 : 1; preparaAtlante(); });
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
    for (let i = 0; i < N_PEZ; i++) P.push(() => { const [a, c] = L[(i * 3 + 2) % L.length], t = arte('pezzo', a, c, 4.8, 2.05, 7900 + i * 61, { bgk: i % 2 ? 'rullo' : null }); if (t) incolla(ATL.x, t, CELLE['pezzo' + i]); });
    for (let i = 0; i < 2; i++) P.push(() => { const [a, c] = L[(i * 5 + 4) % L.length], t = arte('burner', a, c, 6.6, 2.5, 7950 + i * 67); if (t) incolla(ATL.x, t, CELLE['burner' + i]); });
    for (let i = 0; i < 2; i++) P.push(() => { const [a, c] = L[(i * 7 + 6) % L.length], t = arte('calli', a, c, 4.0, 1.5, 7990 + i * 71); if (t) incolla(ATL.x, t, CELLE['calli' + i]); });
    P.push(() => { for (let i = 0; i < 4; i++) aMano(ATL.x, 'stencil' + i, (x, w, h, r, k) => stencil(x, w, h, r, k, i), 8900 + i); for (let i = 0; i < 2; i++) { aMano(ATL.x, 'volantini' + i, (x, w, h, r, k) => volantini(x, w, h, r, k, i), 8910 + i); aMano(ATL.x, 'freccia' + i, (x, w, h, r, k) => freccia(x, w, h, r, k, i), 8920 + i); } });
    P.push(() => { aMano(ATL.x, 'gessone', (x, w, h, r) => { gessone(x, w, h, r); polvere(x, w, h, r); }, 8930); aMano(ATL.x, 'pozza', pozza, 8931); aMano(ATL.x, 'spruzzo', spruzzo, 8932); });
    P.push(() => { for (let i = 0; i < 2; i++) { aMano(ATL.x, 'mozziconi' + i, (x, w, h, r, k) => mozziconi(x, w, h, r, k, i), 8800 + i); aMano(ATL.x, 'macchia' + i, (x, w, h, r, k) => macchia(x, w, h, r, k, i), 8810 + i); } });
    P.push(() => { const t = new THREE.CanvasTexture(ATL.cnv); t.anisotropy = TEL ? 2 : 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
      ATL.tex = t; MAT.map = t; MAT.emissiveMap = t; MAT.needsUpdate = true; ATL.pronto = true; S.atlante = 1; });
  }
  // aspetta i caratteri dei graffiti (le tag e i manifesti si disegnano coi font della mano), al più 12 s
  let fontT0 = 0; const fontPronti = () => { const A = WA(); if (!A) return true; if (A.FONTS && A.FONTS.ok) return true; fontT0 = fontT0 || performance.now(); return performance.now() - fontT0 > 12000; };

  // ================= I MATERIALI E LE DUE MESH =================
  // le decalcomanie: un quadrato 1×1 (davanti +z), l'istanza dice dove, quanto e quale riquadro dell'atlante (aRect: u0, v0, du, dv)
  const MAT = new THREE.MeshLambertMaterial({ map: null, transparent: true, depthWrite: false, alphaTest: .04, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  MAT.userData.grafica = 'pieno'; MAT.emissive = new THREE.Color(1, 1, 1);   // [pieno2] la vernice e la carta si leggono anche nell'ombra (l'emissivo è la stessa tela, dosato da UE per istanza)
  // [pieno3] l'emissivo per istanza (aEmi): 0 la vernice e la carta (un filo di giorno, niente di notte: non devono sembrare accese),
  // 1 le pozze (di notte il riflesso del cielo e dei lampioni, una lucentezza leggera). UE.x / UE.y li mette il tick dall'ora del giorno
  const UE = { value: new THREE.Vector2(.28, .12) };
  MAT.onBeforeCompile = sh => { sh.uniforms.uPienoEmi = UE;
    const uvR = /vMapUv/.test(THREE.ShaderChunk.map_fragment || '') ? '#ifdef USE_MAP\n vMapUv = aRect.xy + uv * aRect.zw;\n#endif' : '#ifdef USE_UV\n vUv = aRect.xy + uv * aRect.zw;\n#endif';
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aRect;\nattribute float aEmi;\nvarying float vPienoEmi;').replace('#include <uv_vertex>', '#include <uv_vertex>\n' + uvR + '\n vPienoEmi = aEmi;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 uPienoEmi;\nvarying float vPienoEmi;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= mix( uPienoEmi.x, uPienoEmi.y, vPienoEmi );'); };
  MAT.customProgramCacheKey = () => 'pieno-atlante';
  const MATC = new THREE.MeshLambertMaterial({ vertexColors: true });   // le cose: una geometria sola, i colori nei vertici
  MATC.userData.grafica = 'pieno';
  const QUAD = new THREE.PlaneGeometry(1, 1);
  let DEC = null, COSE = null, GRUPPO = null, CAP = 0;
  function cresci(n) {
    const cap = Math.max(256, CAP * 2, n), m = new THREE.InstancedMesh(QUAD.clone(), MAT, cap); m.geometry.setAttribute('aRect', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4)); m.geometry.setAttribute('aEmi', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
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
  const COL3 = new Map(), col3 = h => { let a = COL3.get(h); if (!a) { const c = new THREE.Color(h); COL3.set(h, a = [c.r, c.g, c.b]); } return a; };   // (in sola lettura: i colori si ripetono, la tinta si legge una volta)
  function Cose() { this.p = []; this.n = []; this.c = []; this.ops = []; }   // ops: la ricetta (per la pianta cotta nei tasselli: si rifà senza raggi)
  Cose.prototype.box = function (o, cx, cy, cz, sx, sy, sz, hex, ry) { if (!this.rifai) this.ops.push(['b', cx, cy, cz, sx, sy, sz, hex, ry || 0].map(v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
    const c = col3(hex), hx = sx / 2, hy = sy / 2, hz = sz / 2, cr = Math.cos(ry || 0), sr = Math.sin(ry || 0);
    const F = [[[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]], [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]], [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
      [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]], [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]], [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]]];
    for (const [nn, V] of F) { if (nn[1] < 0) continue;   // il fondo non si vede mai
      const sh = nn[1] > 0 ? 1 : nn[2] !== 0 ? .9 : .82, Lc = [c[0] * sh, c[1] * sh, c[2] * sh];
      for (const i of [0, 1, 2, 0, 2, 3]) { const v = V[i], lx = cx + v[0] * cr + v[2] * sr, lz = cz - v[0] * sr + v[2] * cr; this.p.push(lx, cy + v[1], lz); this.n.push(nn[0] * cr + nn[2] * sr, nn[1], -nn[0] * sr + nn[2] * cr); this.c.push(Lc[0], Lc[1], Lc[2]); } }
    return this; };
  Cose.prototype.cil = function (o, cx, cy, cz, r, h, hex, seg) { if (!this.rifai) this.ops.push(['c', cx, cy, cz, r, h, hex, seg || 8].map(v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
    const c = col3(hex), n = seg || 8;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, x0 = Math.cos(a0) * r, z0 = Math.sin(a0) * r, x1 = Math.cos(a1) * r, z1 = Math.sin(a1) * r, nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
      const q = [[x1, 0, z1], [x0, 0, z0], [x0, h, z0], [x1, 0, z1], [x0, h, z0], [x1, h, z1]]; q.forEach(v => { this.p.push(cx + v[0], cy + v[1], cz + v[2]); this.n.push(nx, 0, nz); this.c.push(c[0] * .9, c[1] * .9, c[2] * .9); });
      [[0, h, 0], [x1, h, z1], [x0, h, z0]].forEach(v => { this.p.push(cx + v[0], cy + v[1], cz + v[2]); this.n.push(0, 1, 0); this.c.push(c[0], c[1], c[2]); }); }
    return this; };
  // il tronco di cono a spicchi (il telo dell'ombrellone, la mantovana): r0 sotto, r1 sopra, gli spicchi a due colori; solo il fianco
  Cose.prototype.cono = function (o, cx, cy, cz, r0, r1, h, hexA, hexB, seg) { if (!this.rifai) this.ops.push(['k', cx, cy, cz, r0, r1, h, hexA, hexB || hexA, seg || 8].map(v => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
    const cA = col3(hexA), cB = col3(hexB || hexA), n = seg || 8, ny = r0 - r1;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2, L = Math.hypot(h, ny) || 1, nx = Math.cos(am) * h / L, nz = Math.sin(am) * h / L, nyy = ny / L, c = i % 2 ? cB : cA;
      const q = [[Math.cos(a1) * r0, 0, Math.sin(a1) * r0], [Math.cos(a0) * r0, 0, Math.sin(a0) * r0], [Math.cos(a0) * r1, h, Math.sin(a0) * r1], [Math.cos(a1) * r0, 0, Math.sin(a1) * r0], [Math.cos(a0) * r1, h, Math.sin(a0) * r1], [Math.cos(a1) * r1, h, Math.sin(a1) * r1]];
      q.forEach(v => { this.p.push(cx + v[0], cy + v[1], cz + v[2]); this.n.push(nx, nyy, nz); this.c.push(c[0], c[1], c[2]); }); }
    return this; };
  // posa: da locale (u lungo il muro, v verso la strada) a mondo, col muro in (px, pz), u = (ux, uz), n = (nx, nz), quota y0
  Cose.prototype.posa = function (px, y0, pz, ux, uz, nx, nz) { this.dove = [px, y0, pz, ux, uz, nx, nz].map(v => Math.round(v * 1000) / 1000);
    const P = this.p, N = this.n, o = { p: new Float32Array(P.length), n: new Float32Array(N.length), c: new Float32Array(this.c) };
    for (let i = 0; i < P.length; i += 3) { const a = P[i], b = P[i + 2]; o.p[i] = px + a * ux + b * nx; o.p[i + 1] = y0 + P[i + 1]; o.p[i + 2] = pz + a * uz + b * nz; const na = N[i], nb = N[i + 2]; o.n[i] = na * ux + nb * nx; o.n[i + 1] = N[i + 1]; o.n[i + 2] = na * uz + nb * nz; }
    o.ricetta = { ops: this.ops, dove: this.dove }; return o; };
  // dalla ricetta (la pianta cotta): le stesse scatole e gli stessi cilindri, posati uguali
  const daRicetta = q => { const C = new Cose(); C.rifai = true; q.ops.forEach(op => op[0] === 'b' ? C.box(0, op[1], op[2], op[3], op[4], op[5], op[6], op[7], op[8]) : op[0] === 'k' ? C.cono(0, op[1], op[2], op[3], op[4], op[5], op[6], op[7], op[8], op[9]) : C.cil(0, op[1], op[2], op[3], op[4], op[5], op[6], op[7])); const o = C.posa(...q.dove); delete o.ricetta; return o; };
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
    scooter(C, u, v, ry, hex) {   // [pieno2] la Vespa sul cavalletto: la scocca, lo scudo, la sella, il manubrio, le ruote piene
      const c = Math.cos(ry), s2 = Math.sin(ry), at = (a, b) => [u + a * c + b * s2, v - a * s2 + b * c], k = hex || INK.acqua;
      { const [x, z] = at(0, -.25); C.box(0, x, .38, z, .36, .34, .62, k, ry); } { const [x, z] = at(0, .05); C.box(0, x, .2, z, .3, .06, .5, '#3d3548', ry); } { const [x, z] = at(0, .38); C.box(0, x, .55, z, .4, .62, .07, k, ry); }
      { const [x, z] = at(0, -.22); C.box(0, x, .62, z, .26, .09, .5, '#16121B', ry); } { const [x, z] = at(0, .4); C.box(0, x, .92, z, .58, .05, .05, '#A89C92', ry); C.box(0, x, .9, z, .12, .12, .08, '#F2E7CF', ry); }
      [[0, .48], [0, -.5]].forEach(([a, b]) => { const [x, z] = at(a, b); C.box(0, x, .14, z, .08, .28, .28, '#16121B', ry); }); },
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
    const kc = Math.round(x / 3) * 4096 + Math.round(z / 3); let L = CANDS.get(kc); if (!L) { L = MESHE.m ? candidati(x, z) : WR.cands ? WR.cands(x, z) : []; CANDS.set(kc, L); if (CANDS.size > 400) CANDS.clear(); }   // le mesh vicine (come i graffiti), una volta ogni 3 m
    V0.set(x + nx * 1.6, y, z + nz * 1.6); V1.set(-nx, 0, -nz); const h = soloPronte(() => WR.rayWall(V0, V1, 3.4, L)); if (!h) return null;
    if (h.n.x * nx + h.n.z * nz < .96 || Math.abs(h.n.y) > .2) return null;
    const m = h.obj && (Array.isArray(h.obj.material) ? h.obj.material[0] : h.obj.material); if (!m || nonMuro(m) || (h.obj.geometry && h.obj.geometry.attributes.position && h.obj.geometry.attributes.position.count <= 8)) { conta('non_muro'); return null; }   // un quadro solo (4 vertici) appeso al muro è un telo, un murale, un cartello: non il muro
    return h.p;
  }
  // (manifesto0, col disco nero, da lontano si legge come una macchia: resta nell'atlante ma non si posa)
  // il muro è intonaco, mattone, pietra; non le grate e i fogli trasparenti posati sopra (keepTr), i murales del regime e le
  // insegne dipinte (Lambert con la loro immagine), i vetri, i cartelli (grafica), le cose senza luce o coi colori nei vertici
  const nonMuro = m => !!(m.isShaderMaterial || m.isMeshBasicMaterial || m.vertexColors || (m.userData && (m.userData.grafica || m.userData.vetro)) || /vetro/.test(m.name || '') || (m.isMeshLambertMaterial && m.map && m.map.image && m.map.image.width > 4) || m.transparent);
  // un raggio da un punto in una direzione (il bucato: dal mezzo del vicolo verso i due muri)
  // [pieno3] LE MESH DELLA CITTÀ FERMA PER I RAGGI (senza tasselli): un giro della scena solo, la prima volta (nella schermata iniziale), in una
  // griglia di 8 m. render.js bmbCands (quello dei graffiti) rifà il giro intero se nessuno l'ha chiesto da 6 s (~25-45 ms in un fotogramma)
  const MESHE = { m: null };
  function indiceMeshe() { const sc = R().__models && R().__models.scene; if (!sc) return; const m = new Map(), Sf = new THREE.Sphere(), dinamici = new Set();
    try { const V = R().__vehicles || {}, P = (R().__dyn && R().__dyn.people) || {}; for (const k in V) dinamici.add(V[k]); for (const k in P) dinamici.add(P[k]); } catch (e) { }
    const visita = (o, din) => { if (o === GRUPPO || o.visible === false) return; din = din || dinamici.has(o) || !!(o.userData && (o.userData.model || o.userData.velo || o.userData.wr || o.userData.pieno));
      if (o.isMesh && !din && o.geometry && o.geometry.attributes && o.geometry.attributes.position) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); if (g.boundingSphere) { o.updateMatrixWorld(); Sf.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); const r = Math.min(Sf.radius, 60);
        for (let i = Math.floor((Sf.center.x - r) / 8); i <= Math.floor((Sf.center.x + r) / 8); i++) for (let j = Math.floor((Sf.center.z - r) / 8); j <= Math.floor((Sf.center.z + r) / 8); j++) { const k = keyC(i, j); (m.get(k) || m.set(k, []).get(k)).push(o); } } }
      for (const c of o.children) visita(c, din); };
    visita(sc, false); MESHE.m = m; S.meshe = m.size; }
  const candidati = (x, z) => { const out = new Set(); for (let i = Math.floor((x - 4) / 8); i <= Math.floor((x + 4) / 8); i++) for (let j = Math.floor((z - 4) / 8); j <= Math.floor((z + 4) / 8); j++) for (const o of MESHE.m.get(keyC(i, j)) || []) out.add(o); return [...out]; };
  // [pieno3] coi tasselli sul telefono la griglia dei raggi di una mesh si fa a fette (tasselli.js griglieTick): chi tira raggi di sottofondo
  // non la costruisce nel suo fotogramma (50-450 ms) e il «niente» conta come «non ancora» (Tasselli.raggiMancanti); la faccia si rifà dopo
  const soloPronte = f => { if (TUTTO) return f(); window.__soloGriglie = true; try { return f(); } finally { window.__soloGriglie = false; } };
  const mancanti = () => (typeof Tasselli !== 'undefined' && Tasselli.raggiMancanti ? Tasselli.raggiMancanti() : 0);
  function muroDa(x, y, z, dx, dz, far) { const WR = typeof Writing !== 'undefined' && Writing.__ray ? Writing.__ray : null; if (!WR) return null; S.raggi++;
    V0.set(x, y, z); V1.set(dx, 0, dz); const h = soloPronte(() => WR.rayWall(V0, V1, far, MESHE.m ? candidati(x + dx * far * .6, z + dz * far * .6) : WR.cands ? WR.cands(x + dx * far * .6, z + dz * far * .6) : [])); if (!h || h.n.x * dx + h.n.z * dz > -.85) return null;
    const m = h.obj && (Array.isArray(h.obj.material) ? h.obj.material[0] : h.obj.material); return !m || nonMuro(m) ? null : h.p; }
  // il rettangolo (u0..u1 lungo il muro, y0..y1) sta tutto sullo stesso piano? torna la distanza del piano dal filo (lungo n) o null
  // il rettangolo, e se lì sotto c'è lo zoccolo (un altro piano) lo stesso rettangolo 35 cm più su: torna [d, dy] o null
  function* pianoSu(F, fc, u0, u1, ya, yb) { let d = yield* piano(F, fc, u0, u1, ya, yb); if (d !== null) return [d, 0]; if (yb + .35 > 2.7) return null; d = yield* piano(F, fc, u0, u1, ya + .35, yb + .35); return d === null ? null : [d, .35]; }
  function* piano(F, fc, u0, u1, ya, yb) {   // [pieno3] a passi: dopo ogni raggio, se il fotogramma ha già speso il suo, cede
    let ref = null; for (const [u, y] of [[(u0 + u1) / 2, (ya + yb) / 2], [u0 + .1, ya + .08], [u1 - .1, ya + .08], [u0 + .1, yb - .08], [u1 - .1, yb - .08]]) {
      const x = F.p[0] + F.u[0] * (u - fc.L / 2), z = F.p[1] + F.u[1] * (u - fc.L / 2), p = muroA(x, fc.y0 + y, z, F.n[0], F.n[1]); if (!TUTTO && performance.now() - FR0.t > FR0.max) yield 'passo'; if (!p) { conta('senza_muro'); return null; }
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
  let GES = null; const gessoGia = (x, z) => { if (!GES) GES = (((G.MAP.world && G.MAP.world.sets) || []).filter(q => /^(piazzetta|sagrato|marina)$/.test(q.k)).map(q => q.x !== undefined ? [q.x, q.y] : [(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2])); return GES.some(q => hyp(q[0] - x, q[1] - z) < 5); };
  const tombino = (x, z) => (window.__PV_TOMBINI || []).some(q => hyp(q.x - x, q.z - z) < (q.r || .4) + .6);

  // le zone e il ritmo (strada_dipinta.js); senza: tutto via
  // il regime: la sua zona (strada_dipinta.js), e come render.js regAt entro 6 m dai palazzi del governo e militari (lì le bandiere con
  // l'occhio e i manifesti del regime: niente vernice né carta di strada)
  let GOV = null; const regime = (x, z) => { if (!GOV) GOV = (G.BUILDINGS || []).filter(b => b.gov || b.military).map(b => [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS]); return GOV.some(R => x > R[0] - 6 && x < R[2] + 6 && z > R[1] - 6 && z < R[3] + 6); };
  const zona = (x, z, nx, nz) => { if (regime(x, z)) return 'regime'; const sd = SD(); try { return sd ? sd.zonaPunto(x, z, nx, nz, 'strada') : 'via'; } catch (e) { return 'via'; } };
  const ritmo = (x, z) => { const sd = SD(); try { return sd ? sd.ritmo(x, z) : 1; } catch (e) { return 1; } };
  // per zona: quanto è facile che un modulo di muro pieno abbia qualcosa (p) e cosa (pesi)
  const ZP = {
    sottopasso: { p: .97, pez: 3, ser: 2, man: 2, tag: 3, thr: 3, ade: 2 }, ferrovia: { p: .95, pez: 3, ser: 1, man: 2, tag: 3, thr: 3, ade: 2 }, muro: { p: .4, pez: 2, man: 1, tag: 2, thr: 1, ade: 2 },
    porto: { p: .9, pez: 2, ser: 3, man: 2, tag: 3, thr: 2, ade: 1 }, vicolo: { p: .9, pez: 2, ser: 2, man: 2, tag: 3, thr: 2.5, ade: 2 }, ritrovo: { p: .95, pez: 2, ser: 2.5, man: 4, tag: 3, thr: 2.5, ade: 3 },
    via: { p: .85, pez: .8, ser: 2.5, man: 3, tag: 2.5, thr: 1.2, ade: 2 }, lungomare: { p: .7, pez: .5, ser: 1, man: 3, tag: 1.5, thr: .8, ade: 2 }, piazza: { p: .5, ser: .3, man: 4, fun: 1, tag: 0, thr: 0, ade: 1 },
    sacro: { p: .4, fun: 1 }, regime: { p: 0 }, fuori: { p: .35, pez: 1, ser: 1, man: 1, tag: 2, thr: 1, ade: 1 },
  };
  const scegli = (Z, r, wS) => { const L = [['pez', wS >= 2.3 ? Z.pez || 0 : 0], ['ser', wS >= 1.75 ? Z.ser || 0 : 0], ['man', Z.man || 0], ['fun', Z.fun || 0], ['tag', Z.tag || 0], ['thr', wS >= 1.4 ? Z.thr || 0 : 0], ['ade', Z.ade || 0]]; let t = L.reduce((a, q) => a + q[1], 0) * r; for (const q of L) { if ((t -= q[1]) < 0) return q[0]; } return null; };
  // la sagoma dell'atlante per un lavoro dei writer: la famiglia dallo stile, la variante dal suo numero (sempre la stessa)
  const cellaLavoro = w => { const h = Math.floor(hh(w.id || 0, w.seed || 0, 77) * 1e6), st2 = w.style;
    if (/^(tag|mtag|gotico|scritta)$/.test(st2)) return 'tag' + h % N_TAG; if (/^(throw|estintore|bombing)$/.test(st2)) return 'throw' + h % N_THROW; if (/^(pezzo|rullo|murale)$/.test(st2)) return 'pezzo' + h % N_PEZ;
    if (/^(burner|wholecar)$/.test(st2)) return 'burner' + h % 2; if (st2 === 'calli') return 'calli' + h % 2; if (st2 === 'stencil') return 'stencil' + h % 4; if (st2 === 'adesivi') return 'adesivo' + h % N_ADE; if (st2 === 'manifesto') return 'manifesto' + (1 + h % (N_MAN - 1)); return null; };
  // [pieno2] dove si passa di sicuro: 45 m attorno alla partenza (il primo quadro del gioco) e 7 m attorno ai percorsi di W.percorsi
  let PERC = null; const PART = { x: null, z: null };
  const percorsi = () => { if (PERC) return PERC; PERC = new Map(); const Wd = G.MAP.world, P = Wd && Wd.percorsi && Wd.percorsi.percorsi; (P || []).forEach(pc => { const pts = pc.pts || []; for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], L = hyp(b[0] - a[0], b[1] - a[1]); for (let t = 0; t <= L; t += 1) { const x = a[0] + (b[0] - a[0]) * t / Math.max(L, 1e-6), z = a[1] + (b[1] - a[1]) * t / Math.max(L, 1e-6), kk = keyC(Math.floor(x / 8), Math.floor(z / 8)); (PERC.get(kk) || PERC.set(kk, []).get(kk)).push([x, z, pc.k, (b[0] - a[0]) / (L || 1), (b[1] - a[1]) / (L || 1)]); } } }); return PERC; };
  const vicinoPercorso = (x, z, r) => { const M = percorsi(); for (let i = Math.floor((x - r) / 8); i <= Math.floor((x + r) / 8); i++) for (let j = Math.floor((z - r) / 8); j <= Math.floor((z + r) / 8); j++) for (const q of M.get(keyC(i, j)) || []) if (hyp(q[0] - x, q[1] - z) < r) return true; return false; };
  const vivo = (x, z) => (PART.x !== null && hyp(x - PART.x, z - PART.z) < 45) || vicinoPercorso(x, z, 7);
  const USO_BAR = /^(bar|osteria|trattoria|circolo|pub|gelateria|tabacchi|caffe|pizzeria)$/, USO_CASSE = /^(alimentari|fruttivendolo|frutta|pescheria|panetteria|forno|mercato|drogheria|salumeria|ortolano|latteria|macelleria|emporio|supermercato)$/, USO_OFF = /^(officina|garage|magazzino|ferramenta|deposito|falegnameria|fabbro|autorimessa|tipografia)$/;
  const usoDi = b => String((b.shopFront && b.shopFront.use) || b.use || '');

  function* pianificaG(cel, st, soloFacce) {   // a passi: una faccia per passo (i raggi costano), il tick ne fa quante ne stanno nel budget
    const out = { d: [], cose: [], voci: [] }, list = soloFacce || FACCE.get(cel.k) || [], rimandate = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    // una decalcomania sul muro: centro (u lungo la faccia dal suo inizio, y sopra il piede), misure, distanza del piano
    const sulMuro = (fc, F, nome, u, y, w, h, dist, tilt) => { const x = F.p[0] + F.u[0] * (u - fc.L / 2) + F.n[0] * (dist + .006), z = F.p[1] + F.u[1] * (u - fc.L / 2) + F.n[1] * (dist + .006);
      e.set(0, Math.atan2(F.n[0], F.n[1]), tilt || 0, 'YXZ'); q.setFromEuler(e); ps.set(x, fc.y0 + y, z); sc.set(w, h, 1); m4.compose(ps, q, sc); out.d.push([nome, m4.toArray()]); out.voci.push([nome, +x.toFixed(2), +(fc.y0 + y - h / 2).toFixed(2), +z.toFixed(2), +F.n[0].toFixed(2), +F.n[1].toFixed(2)]); };
    const aTerra = (nome, x, z, w, h, rot) => { const y = gH(x, z) + .015; q.setFromEuler(new THREE.Euler(0, rot, 0)); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)); ps.set(x, y, z); sc.set(w, h, 1); m4.compose(ps, q, sc); out.d.push([nome, m4.toArray()]); out.voci.push([nome, +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]); };
    const suoloVero = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS), e0 = G.MAP.elev ? G.MAP.elev[ty * GW + tx] : null, q = G.quotaSuolo ? G.quotaSuolo(x, z) : e0; return q == null || Math.abs(gH(x, z) - q) < .45; };
    const aTerraOk = (x, z, r) => { if (!PIEDI.has(tileAt(x, z)) || !suoloVero(x, z)) return false; for (const [a, b] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!PIEDI.has(tileAt(x + a, z + b))) return false; return !tombino(x, z); };
    const cose = (C, fc, F, u, v, nome) => { const x = F.p[0] + F.u[0] * u, z = F.p[1] + F.u[1] * u; out.cose.push(C.posa(x, gH(x + F.n[0] * v, z + F.n[1] * v), z, F.u[0], F.u[1], F.n[0], F.n[1])); out.voci.push([nome, +(x + F.n[0] * v).toFixed(2), +fc.y0.toFixed(2), +(z + F.n[1] * v).toFixed(2)]); };
    // [pieno2] I LAVORI DEI WRITER GIÀ SUL MURO: la storia dei muri ne fa ~2.460, ma il disegnatore del gioco li piazza vicino alla camera a
    // budget (writing.js scanNear: 1 ms a fotogramma sul telefono) e ne disegna uno ogni 1,2 s: alla partenza i muri sono puliti. Qui ogni
    // lavoro della cella trova il suo riquadro coi raggi del gioco stesso (Writing._.placeWall: lo stesso posto che avrà il vero) e intanto
    // si vede la sua sagoma dall'atlante (la stessa mano, la stessa misura); quando il vero arriva (Writing.GFX.works) la sagoma si toglie
    occupato(st);
    for (const fc of list) { FASE = 'faccia';
      { const F0 = faccia(fc.b, fc.rec, fc.f, fc.L / 2), m0 = mancanti(); muroA(F0.p[0], fc.y0 + 1.2, F0.p[1], F0.n[0], F0.n[1]); if (mancanti() > m0) { rimandate.push(fc); conta('faccia_rimandata'); yield; continue; } }   // il muro non è ancora pronto per i raggi: dopo
      const F = faccia(fc.b, fc.rec, fc.f, fc.L / 2), A = aperture(fc), cx = F.p[0], cz = F.p[1], Zn = zona(cx + F.n[0] * .8, cz + F.n[1] * .8, F.n[0], F.n[1]), Z = ZP[Zn] || ZP.via, rit = clamp(ritmo(cx, cz), .3, 2.2);
      const uso = usoDi(fc.b), bot = !!(fc.b.__bot && fc.b.__bot.face === fc.f) || !!fc.b.shop, bar = USO_BAR.test(uso), seed = fc.bi * 7 + fc.f.charCodeAt(0);
      // [pieno2] i tratti liberi: tutto il piede della facciata fuori da porte, finestre, vetrine e garage (coi loro margini), anche i
      // pilastrini fra le finestre e le facce senza un modulo di muro pieno; i tratti lunghi a pezzi di al più 3,2 m
      let libere = [[.12, fc.L - .12]]; A.ap.slice().sort((p1, p2) => p1.u - p2.u).forEach(a => { const a0 = a.u - a.hw, a1 = a.u + a.hw, nuove = []; libere.forEach(([u0, u1]) => { if (a1 <= u0 || a0 >= u1) { nuove.push([u0, u1]); return; } if (a0 > u0) nuove.push([u0, a0]); if (a1 < u1) nuove.push([a1, u1]); }); libere = nuove; });
      let slot = []; libere.forEach(([u0, u1]) => { const L0 = u1 - u0; if (L0 < .5) return; const n = Math.max(1, Math.ceil(L0 / 3.2)); for (let k = 0; k < n; k++) slot.push({ u0: u0 + L0 * k / n, u1: u0 + L0 * (k + 1) / n }); });
      slot.forEach(q => { q.accanto = A.ap.filter(a => a.porta && Math.min(Math.abs(a.u - a.hw - q.u1), Math.abs(a.u + a.hw - q.u0)) < .3); });
      const sotto = A.ap.filter(a => !a.porta && !a.vetrina && !a.garage && /window/.test(a.nome || '') && !/wide/.test(a.nome || ''));   // sotto il davanzale delle finestre del piano terra
      let fatto = 0, storia = false; conta('facce'); S.scarti.slot = (S.scarti.slot || 0) + slot.length; if (!slot.length) conta(A.nota ? 'faccia_senza_muri' : 'faccia_vuota');
      FASE = 'tratti'; const unSlot = function* (s, si) {
        const r = mulberry(seed * 131 + si * 17 + 5), wS = s.u1 - s.u0, um = (s.u0 + s.u1) / 2, wx = cx + F.u[0] * (um - fc.L / 2), wz = cz + F.u[1] * (um - fc.L / 2);
        const pOgni = clamp(Z.p * (.55 + .45 * rit) * (bot || bar ? 1.25 : 1) * (vivo(wx, wz) ? 1.35 : 1), 0, .96);   // [pieno2] più fitto attorno alla partenza e lungo i percorsi
        if (r() > pOgni) { conta('ritmo'); return; }
        const k = scegli(Z, r(), wS); if (!k) return;
        if (k === 'pez') {   // [pieno2] il pezzo del pianterreno (2,3-3,1 m): la vernice a terra, e spesso l'angolo dei writer
          const fam = r() < .62 ? 'pezzo' + Math.floor(r() * N_PEZ) : r() < .5 ? 'burner' + Math.floor(r() * 2) : 'calli' + Math.floor(r() * 2), asp = /calli|burner/.test(fam) ? 2.6 : 2.3, w = Math.min(3.1, wS - .1), hgt = w / asp, y0 = .25 + r() * .2;
          const D = (yield* pianoSu(F, fc, um - w / 2, um + w / 2, y0, y0 + hgt)); if (D === null || !libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + hgt, w / 2 - .2)) return;
          sulMuro(fc, F, fam, um, y0 + D[1] + hgt / 2, w, hgt, D[0]); fatto++;
          { const x = wx + F.n[0] * .9, z = wz + F.n[1] * .9; if (aTerraOk(x, z, .6)) aTerra('spruzzo', x, z, 2.2, 1.5, Math.atan2(F.u[0], F.u[1]) + (r() - .5) * .3); }
          if (!storia && r() < .55) { const x = wx + F.n[0] * .6, z = wz + F.n[1] * .6; if (aTerraOk(x, z, .5) && libero(st, x, z, fc.y0, fc.y0 + 1, .4)) { const C = new Cose(), u0 = um - fc.L / 2 + w * .32; PZ.cassaBirra(C, u0, .4, 0, .3, INK.blu); PZ.cassaBirra(C, u0, .4, .29, .2, INK.blu);
            ['#e04b8c', '#2a8a8a', '#16121b', '#dc9a34'].forEach((c2, j) => PZ.bombola(C, u0 - .38 - j * .13, .32 + (j % 2) * .14, c2, j >= 2)); if (r() < .5) PZ.scooter(C, u0 + 1.0, 1.1, Math.PI / 2 + (r() - .5) * .4, [INK.acqua, INK.vino, INK.crema, INK.salvia][Math.floor(r() * 4)]);
            cose(C, fc, F, 0, .5, 'cosa_writer'); storia = true; } }
          return; }
        if (k === 'ser' && wS > 1.7 && fatto < 2) {   // la serranda abbassata: 1,8-2,6 × 2,2 m dal piede, il pannello dipinto, guide e cassonetto in 3D
          const w = Math.min(2.6, wS - .1), d1 = (yield* piano(F, fc, um - w / 2, um + w / 2, 1.0, 2.15)), d0 = (yield* piano(F, fc, um - w / 2, um + w / 2, .12, .5)); if (d1 === null || d0 === null || Math.abs(d1 - d0) > .16) return;
          if (!libero(st, wx, wz, fc.y0, fc.y0 + 2.4, w / 2)) return; const d = Math.max(d0, d1), i = r() < .45 ? (r() < .5 ? 1 : 4) : Math.floor(r() * N_SER);
          sulMuro(fc, F, 'serranda' + i, um, 1.1, w, 2.2, d + .012); const C = new Cose(), metal = '#6e6a70', dz = d + .05;
          C.box(0, um - fc.L / 2, 2.3, dz + .06, w + .16, .26, .16, '#58545a'); [-1, 1].forEach(sg => C.box(0, um - fc.L / 2 + sg * (w / 2 + .03), 1.1, dz + .01, .06, 2.2, .07, metal)); C.box(0, um - fc.L / 2, .03, dz + .02, w + .1, .06, .06, '#3d3548');
          cose(C, fc, F, 0, .1, 'serranda'); fatto++;
          if (r() < .45) { const x = wx + F.n[0] * .9, z = wz + F.n[1] * .9; if (aTerraOk(x, z, .5)) aTerra('macchia' + Math.floor(r() * 2), x, z, 1.1, 1.1, r() * 6.28); }
          return; }
        if (k === 'man' || k === 'fun') {   // i manifesti a strati (2 × 1,6 m) o i funebri (2 × 1 m), sopra lo zoccolo
          const fun = k === 'fun' || ((Zn === 'piazza' || Zn === 'vicolo' || Zn === 'sacro') && r() < .3), w = Math.min(fun ? 1.6 : 1.9, wS - .1), hgt = fun ? w * .5 : w * .8, y0 = fun ? 1.25 : .85;
          if (w < .9) return; const D = (yield* pianoSu(F, fc, um - w / 2, um + w / 2, y0, y0 + hgt)); if (D === null || !libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + hgt, w / 2)) return;
          sulMuro(fc, F, fun ? 'funebre' + Math.floor(r() * 2) : 'manifesto' + (1 + Math.floor(r() * (N_MAN - 1))), um, y0 + D[1] + hgt / 2, w, hgt, D[0], (r() - .5) * .03); fatto++;
          if (!fun && r() < .5 && wS - w > .5) { const tw = .9 + r() * .3, uu = um + (r() < .5 ? -1 : 1) * Math.min(w / 2, (wS - tw) / 2), D2 = (yield* pianoSu(F, fc, uu - tw / 2, uu + tw / 2, y0 + D[1] + hgt * .55, y0 + D[1] + hgt * .55 + tw * .25)); if (D2) sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), uu, y0 + D[1] + D2[1] + hgt * .55 + tw * .125, tw, tw * .25, Math.max(D[0], D2[0]) + .004, (r() - .5) * .1); }   // la tag sopra il manifesto: gli strati
          return; }
        if (k === 'tag') {   // le tag: una, due o tre in colonna, di mani diverse; sotto, a volte, la colatura e la vernice caduta
          const n = 1 + Math.floor(r() * 3 * Math.min(1, rit)); let y = .95 + r() * .3;
          for (let j = 0; j < n; j++) { const w = Math.min(wS - .1, 1.05 + r() * .55), hgt = w * .26, uu = um + (r() - .5) * Math.max(0, wS - w - .1); const D = (yield* pianoSu(F, fc, uu - w / 2, uu + w / 2, y, y + hgt)); if (D !== null && libero(st, wx, wz, fc.y0 + y, fc.y0 + y + hgt, w / 2)) { y += D[1]; sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), uu, y + hgt / 2, w, hgt, D[0], (r() - .5) * .12); fatto++; } y += hgt + .08 + r() * .2; }
          if (r() < .75) { const x = wx + F.n[0] * .55, z = wz + F.n[1] * .55; if (aTerraOk(x, z, .3)) aTerra('vernice' + Math.floor(r() * 4), x, z, 1.0, .9, r() * 6.28); }
          return; }
        if (k === 'thr' && wS > 1.4) {   // il throw-up (fino a 2 × 1 m): la vernice a terra, e dove i writer stanno la cassa e le bombolette
          const w = Math.min(2.5, wS - .1), hgt = w * .5, y0 = .35 + r() * .3, D = (yield* pianoSu(F, fc, um - w / 2, um + w / 2, y0, y0 + hgt)); if (D === null || !libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + hgt, w / 2)) return;
          sulMuro(fc, F, 'throw' + Math.floor(r() * N_THROW), um, y0 + D[1] + hgt / 2, w, hgt, D[0]); fatto++;
          { const x = wx + F.n[0] * .55, z = wz + F.n[1] * .55; if (aTerraOk(x, z, .4)) aTerra('vernice' + Math.floor(r() * 4), x, z, 1.3, .9, Math.atan2(F.u[0], F.u[1]) + (r() - .5) * .4); }
          if (!storia && (Zn === 'sottopasso' || Zn === 'ferrovia' || Zn === 'vicolo' || Zn === 'porto' || Zn === 'ritrovo') && r() < .7) { const x = wx + F.n[0] * .5, z = wz + F.n[1] * .5; if (aTerraOk(x, z, .5) && libero(st, x, z, fc.y0, fc.y0 + 1, .4)) {
            const C = new Cose(), u0 = um - fc.L / 2 + w * .35; PZ.cassaBirra(C, u0, .35, 0, .3, INK.blu); ['#e04b8c', '#2a8a8a', '#16121b'].forEach((c2, j) => PZ.bombola(C, u0 - .35 - j * .14, .3 + (j % 2) * .12, c2, j === 2)); cose(C, fc, F, 0, .4, 'cosa_writer'); storia = true; } }
          return; }
        if (k === 'ade' && wS > .6) { const w = .48 + r() * .2, y0 = 1.0 + r() * .4, uu = um + (r() - .5) * (wS - w - .1), D = (yield* pianoSu(F, fc, uu - w / 2, uu + w / 2, y0, y0 + w)); if (D !== null && libero(st, wx, wz, fc.y0 + y0, fc.y0 + y0 + w, w / 2)) { sulMuro(fc, F, 'adesivo' + Math.floor(r() * N_ADE), uu, y0 + D[1] + w / 2, w, w, D[0], (r() - .5) * .14); fatto++;
          if (r() < .55 && wS > 1.4) { const tw = .9 + r() * .4, u2 = um - Math.sign(uu - um || 1) * (wS - tw) / 2 * .8, D2 = (yield* pianoSu(F, fc, u2 - tw / 2, u2 + tw / 2, 1.3, 1.3 + tw * .26)); if (D2 && libero(st, wx, wz, fc.y0 + 1.3, fc.y0 + 1.7, .2)) sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), u2, 1.3 + D2[1] + tw * .13, tw, tw * .26, D2[0], (r() - .5) * .1); } } }   // gli adesivi e accanto una tag
      };   // un tratto per passo (i raggi costano): il giro del fotogramma resta corto
      for (let si = 0; si < slot.length; si++) { yield* unSlot(slot[si], si); yield; }
      FASE = 'sotto';
      // [pieno2] sotto i davanzali del piano terra la tag bassa (chi passa scrive all'altezza della mano abbassata)
      if ((Z.tag || 0) > 0) for (let j = 0; j < sotto.length; j++) { const a = sotto[j]; yield* (function* () { const r = mulberry(seed * 733 + j * 5); if (r() > .32 * Math.min(1.4, rit) * (vivo(cx, cz) ? 1.4 : 1)) return; const w = .75 + r() * .15, hgt = w * .26, y0 = .14 + r() * .12, D = (yield* pianoSu(F, fc, a.u - w / 2, a.u + w / 2, y0, y0 + hgt));
        if (D && D[1] === 0) sulMuro(fc, F, 'tag' + Math.floor(r() * N_TAG), a.u + (r() - .5) * .1, y0 + hgt / 2, w, hgt, D[0], (r() - .5) * .1); })(); yield; }
      FASE = 'porte';
      // le porte: sugli stipiti (i 45 cm di muro del modulo accanto all'apertura) il civico di maiolica delle case, gli adesivi all'altezza
      // della mano; davanti al bar i mozziconi e i tappi
      if (Zn !== 'regime') for (const [j, a] of A.ap.filter(a => a.porta).entries()) { yield* (function* () { const r = mulberry(seed * 389 + j * 7 + 1), lato = r() < .5 ? 1 : -1, ax = cx + F.u[0] * (a.u - fc.L / 2), az = cz + F.u[1] * (a.u - fc.L / 2), hw = .55;
        if (!bot && !bar && r() < .6) { const u = a.u + lato * (hw + .2), d = (yield* piano(F, fc, u - .09, u + .09, 1.82, 2.0)); if (d !== null && libero(st, ax, az, fc.y0 + 1.8, fc.y0 + 2.02, .1)) sulMuro(fc, F, 'civico' + Math.floor(r() * 16), u, 1.91, .17, .17, d); }
        if ((Z.ade || 0) > 0 && Zn !== 'sacro' && r() < .55 * Math.min(1.3, rit)) { const w = .28 + r() * .06, u = a.u - lato * (hw + .05 + w / 2), y0 = 1.0 + r() * .35, d = (yield* piano(F, fc, u - w / 2, u + w / 2, y0, y0 + w)); if (d !== null && libero(st, ax, az, fc.y0 + y0, fc.y0 + y0 + w, .05)) sulMuro(fc, F, 'adesivo' + Math.floor(r() * N_ADE), u, y0 + w / 2, w, w, d, (r() - .5) * .12); }
        if (bar && r() < .85) { const u = a.u + lato * (hw + .3), x = cx + F.u[0] * (u - fc.L / 2) + F.n[0] * 1.5, z = cz + F.u[1] * (u - fc.L / 2) + F.n[1] * 1.5; if (aTerraOk(x, z, .4)) aTerra('mozziconi' + Math.floor(r() * 2), x, z, .9, .9, r() * 6.28); } })(); yield; }
      yield; FASE = 'piede';
      // a terra lungo il piede del muro: le macchie (l'olio sul porto, il caffè e l'acqua sporca nelle vie), ogni tanto
      if (/^(via|vicolo|porto|ritrovo|sottopasso|ferrovia)$/.test(Zn)) for (let t = 2; t < fc.L - 1; t += 6) { const r = mulberry(seed * 61 + t * 13); if (r() > (Zn === 'porto' ? .45 : .22)) continue; const x = cx + F.u[0] * (t - fc.L / 2) + F.n[0] * (.8 + r()), z = cz + F.u[1] * (t - fc.L / 2) + F.n[1] * (.8 + r()); if (aTerraOk(x, z, .6) && !A.ap.some(a => Math.abs(a.u - t) < a.hw + .3 && a.porta)) aTerra('macchia' + (Zn === 'porto' ? 0 : Math.floor(r() * 2)), x, z, 1.2 + r() * .6, 1 + r() * .5, r() * 6.28); }
      // il gesso dei bambini sotto casa, nei vicoli e nelle vie di casa (non davanti alle botteghe)
      if (!bot && !bar && (Zn === 'vicolo' || Zn === 'via') && hh(fc.bi, fc.f.charCodeAt(0), 11) < .3) { const r = mulberry(seed * 7 + 99), t = fc.L * (.25 + r() * .5), x = cx + F.u[0] * (t - fc.L / 2) + F.n[0] * (1.6 + r() * .6), z = cz + F.u[1] * (t - fc.L / 2) + F.n[1] * (1.6 + r() * .6); const camp = r() < .35; if (aTerraOk(x, z, 1.1) && !gessoGia(x, z)) aTerra(camp ? 'campana' : 'gesso' + Math.floor(r() * 3), x, z, camp ? 2.6 : 1.2, camp ? 1.3 : 1.2, Math.atan2(F.u[0], F.u[1]) + (r() - .5) * .5); }
      // le colature sotto le finestre del piano terra (i davanzali), poche
      for (const [j, a] of A.ap.filter(a => !a.porta && !a.vetrina && !a.garage && /window/.test(a.nome || '')).entries()) { yield* (function* () { const r = mulberry(seed * 977 + j); if (r() > .3) return; const d = (yield* piano(F, fc, a.u - .3, a.u + .3, .2, .75)); if (d !== null) sulMuro(fc, F, 'colatura' + Math.floor(r() * 2), a.u + (r() - .5) * .2, .5, .6, .7, d); })(); yield; }
      yield; FASE = 'storia';
      // la piccola storia davanti alla bottega o al bar, su un modulo di muro pieno accanto alla porta, se il marciapiede è largo
      if ((bar || bot || USO_CASSE.test(uso) || USO_OFF.test(uso) || ((Zn === 'vicolo' || Zn === 'via') && !bot && hh(fc.bi, 7, 3) < .3)) && slot.length && Zn !== 'regime' && Zn !== 'sacro') {
        const s = slot.reduce((a, q) => (q.accanto.length && (!a || q.u1 - q.u0 > a.u1 - a.u0)) ? q : a, null) || slot[0], um = (s.u0 + s.u1) / 2, wS = s.u1 - s.u0, r = mulberry(seed * 53 + 11);
        const ok = v => { const x = cx + F.u[0] * (um - fc.L / 2) + F.n[0] * v, z = cz + F.u[1] * (um - fc.L / 2) + F.n[1] * v; return aTerraOk(x, z, .45) && libero(st, x, z, fc.y0, fc.y0 + 1.2, .5); };
        if (wS > 1.1 && ok(.5) && ok(1.3)) { const C = new Cose(), u0 = um - fc.L / 2;
          if (bar) { PZ.sedia(C, u0 - .35, .55, Math.PI + (r() - .5) * .5); PZ.sedia(C, u0 + .45, .7, Math.PI - .4 + (r() - .5) * .4, r() < .5 ? '#EEEBE2' : '#D8E0C8'); PZ.cassaBirra(C, u0 + .05, 1.15, 0, r(), r() < .5 ? INK.mattone : INK.ocra); PZ.cassaBirra(C, u0 + .7, .25, 0, .1, INK.mattone); PZ.cassaBirra(C, u0 + .7, .25, .29, .05, INK.mattone); if (r() < .6 && wS > 2.4) PZ.scooter(C, u0 - 1.2, 1.15, Math.PI / 2 + (r() - .5) * .5, [INK.acqua, INK.vino, INK.crema, INK.salvia][Math.floor(r() * 4)]); }
          else if (USO_CASSE.test(uso)) { const fr = uso === 'pescheria' ? '#A3D4D8' : ['#DC9A34', '#C25B36', '#93B27C'][Math.floor(r() * 3)]; PZ.cassetta(C, u0 - .3, .25, 0, 0, null); PZ.cassetta(C, u0 - .3, .25, .16, .05, null); PZ.cassetta(C, u0 - .3, .25, .32, -.04, fr); PZ.cassetta(C, u0 + .35, .3, 0, .1, fr); PZ.sedia(C, u0 + .1, .9, Math.PI + .3); }
          else if (USO_OFF.test(uso)) { PZ.secchio(C, u0 - .4, .25); PZ.cassetta(C, u0 + .3, .25, 0, .2, null); PZ.cassaBirra(C, u0 + .3, .25, .16, .2, INK.blu); }
          else if (bot) { PZ.sedia(C, u0 + .1, .45, Math.PI + (r() - .5) * .6, r() < .5 ? '#EEEBE2' : '#93B27C'); if (r() < .5) PZ.cassetta(C, u0 + .65, .25, 0, .2, null); }   // il negoziante seduto fuori quando non c'è nessuno
          else { PZ.sedia(C, u0 + .1, .45, Math.PI + (r() - .5) * .6, r() < .5 ? '#EEEBE2' : '#A3D4D8'); if (r() < .35) PZ.secchio(C, u0 + .7, .2); else if (r() < .5 && wS > 2) PZ.scooter(C, u0 + .9, .75, Math.PI / 2 + (r() - .5) * .4, [INK.acqua, INK.vino, INK.crema, INK.salvia][Math.floor(r() * 4)]); }   // la sedia della signora accanto alla porta (e il secchio con la scopa)
          cose(C, fc, F, 0, .6, bar ? 'cosa_bar' : USO_CASSE.test(uso) ? 'cosa_bottega' : USO_OFF.test(uso) ? 'cosa_officina' : bot ? 'cosa_negozio' : 'cosa_porta'); }
      }
      yield;
    }
    out.rimandate = rimandate; if (soloFacce) return out;
    // a terra, nelle piazze e nei vicoli di questa cella: il gesso dei bambini (pochi, lontano dai muri e dalla carreggiata)
    { const r = mulberry(cel.k * 7 + 3), x0 = cel.i * CELL, z0 = cel.j * CELL; let fatti = 0; for (let n = 0; n < 5; n++) { const x = x0 + 3 + r() * (CELL - 6), z = z0 + 3 + r() * (CELL - 6), v = tileAt(x, z); if ((v !== T.PIAZZA && v !== T.COB) || !aTerraOk(x, z, 2.2)) continue; const Zn = zona(x, z, 0, 0); if (!/^(piazza|vicolo|via|ritrovo)$/.test(Zn) || r() > (Zn === 'piazza' ? .8 : .45)) continue;
      if (!libero(st, x, z, -99, 99, 1.6) || gessoGia(x, z)) continue; if (r() < .45) aTerra('campana', x, z, 3.0, 1.5, r() * 6.28); else aTerra('gesso' + Math.floor(r() * 3), x, z, 1.5, 1.5, r() * 6.28); if (++fatti >= 2) break; } }
    // sotto le edicole votive: i lumini e i fiori (i pezzi del mondo, W.pezzi)
    yield; ((G.MAP.world && G.MAP.world.pezzi) || []).forEach(p => { if (p.tipo !== 'edicola_votiva' || Math.floor(p.x / CELL) !== cel.i || Math.floor(p.y / CELL) !== cel.j) return; const c = Math.cos(p.rot || 0), s = Math.sin(p.rot || 0);
      for (const sg of [1, -1]) { const nx = -s * sg, nz = c * sg, ux = c, uz = s, x = p.x + nx * .55, z = p.y + nz * .55; if (!PIEDI.has(tileAt(x, z))) continue; const C = new Cose(); [[-.22, 0, '#c8303a'], [-.1, .08, '#f2ead6'], [.04, 0, '#c8303a'], [.18, .06, '#DC9A34']].forEach(([a, b, k2]) => PZ.lumino(C, a, b, k2)); PZ.fiori(C, .36, .02, INK.magenta); PZ.fiori(C, -.4, .04, INK.ocra);
        out.cose.push(C.posa(x, gH(x, z), z, ux, uz, nx, nz)); out.voci.push(['cosa_edicola', +x.toFixed(2), +gH(x, z).toFixed(2), +z.toFixed(2)]); break; } });
    // il bucato teso nei vicoli stretti (dove non c'è già): due muri a meno di 7 m, a 4,2 m, i panni colorati
    yield; FASE = 'bucato'; if (cel.bucato !== false) bucato(cel, out);
    yield; FASE = 'terra'; yield* terra(cel, out, st, aTerra, aTerraOk);
    return out;
  }
  // i lavori per cella (dal riquadro, o dal posto del writer), rifatti quando la lista cambia: la cella guarda solo i suoi
  const LC = { n: -1, t: 0, m: new Map() };
  function lavoriDi(LAV, k) { const now = performance.now(); if (LAV.length !== LC.n || now - LC.t > 8000) { LC.n = LAV.length; LC.t = now; LC.m = new Map(); for (const w of LAV) { const R0 = w.gfxRect, px = R0 ? R0.c.x : w.spot ? w.spot.x : null, pz = R0 ? R0.c.z : w.spot ? w.spot.y : null; if (px === null) continue; const kk = keyC(Math.floor(px / CELL), Math.floor(pz / CELL)); (LC.m.get(kk) || LC.m.set(kk, []).get(kk)).push(w); } } return LC.m.get(k) || []; }
  function* lavoriG(cel, st, out) {
    const soloLettura = typeof Tasselli !== 'undefined' && Tasselli.attivo && Tasselli.attivo() && !TUTTO, c2 = cel; c2.manca = 0;
    occupato(st); const WRm = typeof Writing !== 'undefined' ? Writing : null, LAV = WRm && st && st.wr && st.wr.works ? st.wr.works : [], m4 = new THREE.Matrix4();
    for (const w of lavoriDi(LAV, cel.k)) {   // (i fondali, la corsa lungo la via fino al muro in fondo, restano al disegnatore: sono i piazzamenti lunghi)
      if (w.erased || w.by === 'player' || !(w.done || w.prog >= 1) || (w.surf && w.surf !== 'muro') || w.__pieno || (w.sdRun && !w.gfxRect)) continue; const nome = cellaLavoro(w); if (!nome) continue;
      const R0 = w.gfxRect, px = R0 ? R0.c.x : w.spot ? w.spot.x : null, pz = R0 ? R0.c.z : w.spot ? w.spot.y : null; if (px === null || Math.floor(px / CELL) !== cel.i || Math.floor(pz / CELL) !== cel.j) continue;
      // coi tasselli (il telefono) lo strato legge e basta: i lavori senza riquadro (non cotti, il disegnatore o graffiti2 li agganceranno)
      // si riguardano più tardi (la cella si ripassa ogni 5 s), niente raggi qui
      if (!w.gfxRect && soloLettura) { c2.manca = (c2.manca || 0) + 1; continue; }
      w.__pieno = 1;
      // [pieno3] il riquadro: coi tasselli i lavori arrivano già sul muro (la storia E cotta, tassella_pagina.js) e qui non si tira un raggio.
      // Senza (il browser senza tasselli) il generatore del gioco (Writing._.placeWallG) a passi: al più 2 ms a fotogramma ('passo' cede il
      // fotogramma), e il piazzamento continua al prossimo
      if (!w.gfxRect) { const G2 = WRm.GFX; if ((w.gfxFail || 0) > 3 || (G2 && G2.pw && G2.pw.w === w)) continue;
        if (TUTTO || !WRm._.placeWallG) { const tp = performance.now(); try { WRm._.placeWall(w); } catch (e) { conta('lavoro_errore'); } S.msPiazza = (S.msPiazza || 0) + performance.now() - tp; }
        else { const it = WRm._.placeWallG(w); let r, tp = performance.now(); for (;;) { try { r = it.next(); } catch (e) { conta('lavoro_errore'); break; } if (r.done) break; if (performance.now() - tp > PASSO_LAV) { S.msPiazza = (S.msPiazza || 0) + performance.now() - tp; yield 'passo'; tp = performance.now(); } } S.msPiazza = (S.msPiazza || 0) + performance.now() - tp; }
        S.piazzati = (S.piazzati || 0) + 1; if (!w.gfxRect) { conta('lavoro_senza_muro'); yield; continue; } }
      const R = w.gfxRect; if (!R || !R.c || !R.n || Math.abs(R.n.y) > .5) continue;
      const q2 = CELLE[nome], asp = q2[2] / q2[3], W0 = R.W || 1, H0 = R.H || .5, wd = Math.min(W0, H0 * asp) * .96, ht = wd / asp, n = new THREE.Vector3(R.n.x, 0, R.n.z).normalize(), xa = new THREE.Vector3(0, 1, 0).cross(n).normalize(), ya = n.clone().cross(xa);
      m4.makeBasis(xa.multiplyScalar(wd), ya.multiplyScalar(ht), n); m4.setPosition(R.c.x + n.x * .006, R.c.y, R.c.z + n.z * .006); out.d.push([nome, m4.toArray(), w.id]); out.voci.push(['lavoro_' + nome.replace(/[0-9]+$/, ''), +R.c.x.toFixed(2), +(R.c.y - ht / 2).toFixed(2), +R.c.z.toFixed(2), +n.x.toFixed(2), +n.z.toFixed(2)]);
      // quello che lo strato aveva già messo lì sotto (la pianta delle facciate può essere venuta prima della storia) se ne va
      for (let k = out.d.length - 1; k >= 0; k--) { const e2 = out.d[k], M = e2[1]; if (e2[2] !== undefined) continue; const hw2 = Math.hypot(M[0], M[1], M[2]) / 2, hh2 = Math.hypot(M[4], M[5], M[6]) / 2; if (Math.abs(M[5]) < .5 * hh2 * 2) continue;   /* a terra: resta */ if (hyp(M[12] - R.c.x, M[14] - R.c.z) < W0 / 2 + hw2 && Math.abs(M[13] - R.c.y) < H0 / 2 + hh2) { out.d.splice(k, 1); conta('sotto_lavoro'); } }
      if (OCC) { const kk = keyC(Math.floor(R.c.x / 8), Math.floor(R.c.z / 8)); (OCC.get(kk) || OCC.set(kk, []).get(kk)).push([R.c.x, R.c.z, R.c.y - H0 / 2, R.c.y + H0 / 2, W0 / 2 + .1]); }
      S.lavori = (S.lavori || 0) + 1; yield;
    }
  }
  function pianifica(cel, st) { const g = pianificaG(cel, st); let r; do r = g.next(); while (!r.done); return r.value; }
  // [pieno2] IL SUOLO COME TELA: metà del quadro del telefono è selciato. Lungo i percorsi (W.percorsi), a passo di 7-10 m e ai lati
  // dell'asse dove si cammina (marciapiede, piazza, vicolo; mai in carreggiata), le cose grandi che si leggono dall'alto: il gesso dei
  // bambini (la campana, il disegno grande del mare), gli stencil delle crew, le frecce dipinte verso la jam e il muro, lo spruzzo dei
  // writer, i volantini della serata calpestati, le macchie. Il ritmo è quello dei muri (strada_dipinta.js ritmo); sugli stalli della
  // sosta (vievive.js) l'olio delle auto
  const TERRA = {
    piazza: [['pavimento', 3.2, 1.4, 2.5], ['gessone', 3.4, 1.7, 2.5], ['campana', 3, 1.5, 2.5], ['gesso', 1.8, 1.8, 1.5], ['volantini', 1.8, 1.8, 2], ['stencil', 1.4, 1.4, 1]],
    vicolo: [['pozza', 1.9, 1.3, 1.2], ['pavimento', 2.6, 1.2, 1.5], ['campana', 2.8, 1.4, 3], ['gesso', 1.6, 1.6, 2], ['stencil', 1.2, 1.2, 2], ['spruzzo', 2, 1.4, 1.5], ['volantini', 1.6, 1.6, 1.5], ['freccia', 1.8, 1.8, 1]],
    via: [['pavimento', 2.6, 1.2, 1], ['stencil', 1.3, 1.3, 3], ['volantini', 1.7, 1.7, 2.5], ['freccia', 1.9, 1.9, 1.5], ['campana', 2.8, 1.4, 1.5], ['macchia', 1.8, 1.4, 1.5], ['gessone', 3.2, 1.6, 1]],
    ritrovo: [['pavimento', 3.2, 1.4, 3], ['spruzzo', 2.2, 1.5, 3], ['stencil', 1.3, 1.3, 2.5], ['freccia', 2, 2, 2], ['volantini', 1.8, 1.8, 3], ['mozziconi', 1.2, 1.2, 1.5]],
    sottopasso: [['pavimento', 3.2, 1.4, 3], ['spruzzo', 2.4, 1.6, 4], ['stencil', 1.3, 1.3, 3], ['freccia', 2, 2, 2], ['volantini', 1.6, 1.6, 1]],
    ferrovia: [['pavimento', 3.2, 1.4, 2], ['spruzzo', 2.4, 1.6, 4], ['stencil', 1.3, 1.3, 3], ['freccia', 2, 2, 2]],
    porto: [['pozza', 2.2, 1.5, 2], ['macchia', 2.2, 1.6, 4], ['stencil', 1.2, 1.2, 2], ['spruzzo', 2, 1.4, 1.5], ['volantini', 1.5, 1.5, 1]],
    lungomare: [['pozza', 2, 1.4, 1], ['pavimento', 3, 1.3, 1.5], ['gesso', 1.6, 1.6, 2], ['campana', 2.8, 1.4, 2], ['volantini', 1.6, 1.6, 2], ['stencil', 1.2, 1.2, 1]],
  };
  // i punti delle vie (W.roads, uno ogni 3 m) per cella, fatti una volta (prima: tutte le vie della città a ogni cella, ~30 ms)
  let STR = null; const strade = () => { if (STR) return STR; STR = new Map(); ((G.MAP.world && G.MAP.world.roads) || []).forEach(rd => { if (!rd.pts || !/^(citta|vicolo|strada)$/.test(rd.kind || 'citta')) return; for (let k = 1; k < rd.pts.length; k++) { const a = rd.pts[k - 1], b = rd.pts[k], L = hyp(b[0] - a[0], b[1] - a[1]); if (L < 1) continue; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let t = 1.5; t < L; t += 3) { const x = a[0] + ux * t, z = a[1] + uz * t, kk = keyC(Math.floor(x / CELL), Math.floor(z / CELL)); (STR.get(kk) || STR.set(kk, []).get(kk)).push([x, z, 'via', ux, uz, false, (rd.w || 6) / 2]); } } }); return STR; };
  let STALLI = null; const stalliC = () => { if (STALLI) return STALLI; STALLI = new Map(); try { if (typeof Vievive !== 'undefined' && Vievive.stalli) Vievive.stalli().forEach(q => { const kk = keyC(Math.floor(q.cx / CELL), Math.floor(q.cy / CELL)); (STALLI.get(kk) || STALLI.set(kk, []).get(kk)).push(q); }); } catch (e) { } return STALLI; };
  let VICOLI = null; const vicoliC = () => { if (VICOLI) return VICOLI; VICOLI = new Map(); ((G.MAP.world && G.MAP.world.roads) || []).forEach(rd => { if (rd.kind !== 'vicolo' || !rd.pts) return; const ks = new Set(); rd.pts.forEach(p2 => ks.add(keyC(Math.floor(p2[0] / CELL), Math.floor(p2[1] / CELL)))); for (let k = 1; k < rd.pts.length; k++) { const a = rd.pts[k - 1], b = rd.pts[k]; for (let t = 0; t <= 1; t += .1) ks.add(keyC(Math.floor((a[0] + (b[0] - a[0]) * t) / CELL), Math.floor((a[1] + (b[1] - a[1]) * t) / CELL))); } ks.forEach(kk => (VICOLI.get(kk) || VICOLI.set(kk, []).get(kk)).push(rd)); }); return VICOLI; };
  function* terra(cel, out, st, aTerra, aTerraOk) {   // a passi (zona e ritmo per candidato costano): otto candidati per passo
    const M = percorsi(), r = mulberry(cel.k * 29 + 7), fatti = [], CAND = [];
    for (let i = Math.floor(cel.i * CELL / 8); i < Math.ceil((cel.i + 1) * CELL / 8); i++) for (let j = Math.floor(cel.j * CELL / 8); j < Math.ceil((cel.j + 1) * CELL / 8); j++) { const L = M.get(keyC(i, j)) || []; for (let k = 0; k < L.length; k += 3) CAND.push(L[k]); }
    // [pieno2] le altre vie della città (W.roads), più rade: un candidato ogni 3 m
    (strade().get(cel.k) || []).forEach(q => CAND.push(q));
    // e le piazze: una griglia di 6 m sulle caselle di piazza della cella (il quadro della partenza è una piazza)
    for (let x = cel.i * CELL + 2.5; x < (cel.i + 1) * CELL; x += 5) for (let z = cel.j * CELL + 2.5; z < (cel.j + 1) * CELL; z += 5) { const jx = x + (hh(x, z, 3) - .5) * 2.5, jz = z + (hh(z, x, 4) - .5) * 2.5; if (tileAt(jx, jz) === T.PIAZZA) CAND.push([jx, jz, 'piazza', 1, 0, true]); }
    let nn = 0; for (const Q of CAND) { if (++nn % 8 === 0) yield; { const [x0, z0, kind, ux, uz, inPiazza, mezza] = Q; if (Math.floor(x0 / CELL) !== cel.i || Math.floor(z0 / CELL) !== cel.j) continue;
        if (fatti.some(q => hyp(q[0] - x0, q[1] - z0) < (inPiazza ? 5.5 : 6.5))) continue; const Zn = zona(x0, z0, 0, 0), T2 = inPiazza && Zn !== 'regime' && Zn !== 'sacro' ? TERRA.piazza : TERRA[Zn]; if (!T2) { conta('terra_zona'); continue; }
        const pp = clamp((kind === 'via' ? .3 : .5) * clamp(ritmo(x0, z0), .3, 2.2) * (kind === 'dominante' ? 1.15 : 1) * (PART.x !== null && hyp(x0 - PART.x, z0 - PART.z) < 45 ? 1.6 : 1), inPiazza ? .65 : .2, .9); if (r() > pp) { fatti.push([x0, z0]); conta('terra_ritmo'); continue; }
        let tot = T2.reduce((a, q) => a + q[3], 0) * r(), sc = T2[0]; for (const q of T2) { if ((tot -= q[3]) < 0) { sc = q; break; } }
        const [fam, w0, h0] = sc, w = w0, h = fam === 'pavimento' ? w0 / 2.2 : h0, nome = fam === 'gesso' ? 'gesso' + Math.floor(r() * 3) : fam === 'stencil' ? 'stencil' + Math.floor(r() * 4) : fam === 'volantini' ? 'volantini' + Math.floor(r() * 2) : fam === 'freccia' ? 'freccia' + Math.floor(r() * 2) : fam === 'macchia' ? 'macchia' + Math.floor(r() * 2) : fam === 'mozziconi' ? 'mozziconi' + Math.floor(r() * 2) : fam === 'pavimento' ? (r() < .55 ? 'pezzo' + Math.floor(r() * N_PEZ) : 'throw' + Math.floor(r() * N_THROW)) : fam;
        // di lato all'asse, dove si cammina e c'è posto: prima un lato poi l'altro, a 1,5-3,5 m
        const gy0 = gH(x0, z0), libT = (x, z) => aTerraOk(x, z, Math.max(w, h) * .36) && libero(st, x, z, gy0 - .5, gy0 + 1, Math.max(w, h) * .3) && !gessoGia(x, z);
        let ok = null; if (inPiazza) { if (libT(x0, z0)) ok = [x0, z0]; } else for (const sg of r() < .5 ? [1, -1] : [-1, 1]) { for (const d of mezza ? [mezza + 1.4, mezza + 2.4, mezza + .8] : [2.2, 1.4, 3.2]) { const x = x0 - uz * sg * d, z = z0 + ux * sg * d; if (libT(x, z)) { ok = [x, z]; break; } } if (ok) break; }
        if (!ok) { conta('terra_posto'); continue; } const lungo = inPiazza ? hh(Math.round(x0), Math.round(z0), 9) * 6.28 : Math.atan2(-uz, ux), rot = fam === 'freccia' || fam === 'pavimento' ? lungo + (r() < .5 ? 0 : Math.PI) : fam === 'campana' || fam === 'gessone' ? lungo + (r() - .5) * .3 : lungo + (r() - .5) * 1.6;   // la x della tela lungo il percorso
        aTerra(nome, ok[0], ok[1], w, h, rot); fatti.push([x0, z0]); conta('terra'); } }   // (la graffa doppia chiude il blocco del candidato)
    // [pieno2] LA SCENA DELLA PARTENZA: il primo quadro del gioco. Attorno a dove si nasce (3-8 m), se c'è posto sulla piazza o sul
    // marciapiede: un pavimento dipinto grande, la campana, i volantini della jam, lo stencil della crew, lo spruzzo
    if (PART.x !== null && Math.floor(PART.x / CELL) === cel.i && Math.floor(PART.z / CELL) === cel.j) {
      const gy0 = gH(PART.x, PART.z), r2 = mulberry(4242), messi = [];
      [['pezzo' + Math.floor(r2() * N_PEZ), 3.6, 1.6, 4.5], ['campana', 3, 1.5, 6.5], ['volantini0', 1.9, 1.9, 3.4], ['stencil0', 1.4, 1.4, 5.5], ['spruzzo', 2.2, 1.5, 7.5], ['throw' + Math.floor(r2() * N_THROW), 2.6, 1.3, 8]].forEach(([nome, w, h, dist]) => {
        for (let k = 0; k < 16; k++) { const a = (k / 16 + r2() * .06) * 6.2832, x = PART.x + Math.cos(a) * dist, z = PART.z + Math.sin(a) * dist;
          if (messi.some(q => hyp(q[0] - x, q[1] - z) < Math.max(w, q[2]) * .75) || !aTerraOk(x, z, Math.max(w, h) * .36) || !libero(st, x, z, gy0 - .6, gy0 + 1, Math.max(w, h) * .3)) continue;
          aTerra(nome, x, z, w, h, a + Math.PI / 2 + (r2() - .5) * .4); messi.push([x, z, w]); conta('partenza'); break; } });
    }
    // l'olio sotto le auto in sosta
    try { (stalliC().get(cel.k) || []).forEach(q => { if (Math.floor(q.cx / CELL) !== cel.i || Math.floor(q.cy / CELL) !== cel.j || hh(Math.round(q.cx * 10), Math.round(q.cy * 10), 5) > .5) return; const v = tileAt(q.cx, q.cy); if (v === T.BLD || v === T.WATER || v < 0 || tombino(q.cx, q.cy)) return; aTerra('macchia0', q.cx, q.cy, 1.5, 1.1, (q.ang || 0) + Math.PI / 2); conta('olio'); }); } catch (e) { }
  }
  function bucato(cel, out) {
    const Wd = G.MAP.world; if (!Wd || !Wd.roads) return; const r = mulberry(cel.k * 13 + 1), ESIST = (window.__PV_FILI || []).filter(f => /bucato/.test(f.k || ''));
    (vicoliC().get(cel.k) || []).forEach(rd => { if (rd.kind !== 'vicolo' || !rd.pts) return; for (let k = 1; k < rd.pts.length; k++) { const a = rd.pts[k - 1], b = rd.pts[k], L = hyp(b[0] - a[0], b[1] - a[1]); if (L < 3) continue; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      for (let s = 3; s < L - 2; s += 7) { const x = a[0] + ux * s, z = a[1] + uz * s; if (Math.floor(x / CELL) !== cel.i || Math.floor(z / CELL) !== cel.j || r() > .65) continue; if (ESIST.some(f => hyp((f.a[0] + f.b[0]) / 2 - x, (f.a[2] + f.b[2]) / 2 - z) < 6)) continue;
        const gy = gH(x, z), y = gy + 4.2, nx = -uz, nz = ux; const pA = muroDa(x, y, z, -nx, -nz, 5), pB = muroDa(x, y, z, nx, nz, 5); if (!pA || !pB) { conta('bucato_senza_muri'); continue; } const W2 = hyp(pA.x - pB.x, pA.z - pB.z); if (W2 > 7 || W2 < 2) continue;
        const C = new Cose(), dx = pB.x - pA.x, dz = pB.z - pA.z, n = Math.ceil(W2 / .4), cols = [INK.crema, INK.acqua, INK.magenta, '#F6F2E8', INK.ocra, INK.blu, INK.salvia, INK.pesca], yaw = Math.atan2(dx, dz) + Math.PI / 2;
        for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2, sag = Math.sin(tm * Math.PI) * .35; C.box(0, pA.x + dx * tm, y - sag, pA.z + dz * tm, .015, .015, W2 / n + .01, '#d8d0c0', Math.atan2(dx, dz)); }
        for (let i = 1; i < 7; i++) { const t = i / 7 + (r() - .5) * .04; if (r() < .25) continue; const sag = Math.sin(t * Math.PI) * .35, w = .3 + r() * .35, h = .35 + r() * .45; C.box(0, pA.x + dx * t, y - sag - h / 2, pA.z + dz * t, w, h, .02, cols[Math.floor(r() * cols.length)], yaw); }
        const o = C.posa(0, 0, 0, 1, 0, 0, 1); out.cose.push(o); out.voci.push(['cosa_bucato', +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]); } } });
  }

  // ================= [pieno4] I DEHORS DEI BAR =================
  // Il committente: «tavolini dei bar molto semplici». Il piano dei dehors resta quello di scena.js (Scena.piano().dehors: i tavolini a
  // 1,1 m dal muro ai lati della porta, le fioriere ai capi, gli ombrelloni dove c'è spazio, la lavagna accanto al portone, il frigo dei
  // gelati); render.js non li disegna più (?nopieno: com'erano) e qui ogni bar ha il SUO dehors, disegnato pezzo per pezzo:
  //  - il caffè col marmo: tavolino tondo di marmo col bordo, colonna e tre piedi di ghisa; sedie bistrot di ferro col sedile di legno e lo
  //    schienale curvo; tazzine col piattino, la zuccheriera di vetro, il bicchiere con la cannuccia, il posacenere;
  //  - il bar dello sport: tavolino pieghevole quadrato di lamiera a tinta (verde bottiglia, rosso, blu) e sedie pieghevoli a doghe dello
  //    stesso colore; le bottiglie, i bicchieri di birra con la schiuma, il giornale;
  //  - la gelateria: tavolino di plastica bianca con la tovaglia a quadri, sedie a filo intrecciato; la coppa di gelato, il bicchiere col
  //    succo e la cannuccia;
  //  - l'osteria: tavolo di legno con la tovaglia a quadri blu, sedie impagliate; il fiasco, i bicchieri di rosso, il cestino del pane.
  // Attorno: l'ombrellone a spicchi coi colori del bar (la mantovana, il palo, la base di cemento), la lavagna del menù col gesso, le
  // fioriere col bordo che chiudono il dehors, il vassoio del cameriere su un tavolino, il frigo dei gelati. Il colore e il tipo dal bar
  // (sempre gli stessi per lo stesso bar). Le sedie sono sedili veri (Anim.sedileObj: la gente si siede, come prima).
  // Costo: dentro la geometria delle cose (vertici colorati: zero disegni in più); vicino (16 m, 12 sul telefono) il dehors intero, più in
  // là senza le cose sui tavolini e senza le doghe (il lontano: un terzo dei vertici).
  const DEH = { idx: null, fatti: new Map(), sedili: false, speso: 0, manca: false };
  const DEH_LOD = TEL ? 12 : 16;
  const DEH_BUD = TEL ? 1.5 : 3;   // ms di costruzione dei dehors per fotogramma (almeno uno)
  // i quattro tipi e le loro tinte
  const DEHT = [
    { tipo: 'marmo', piano: '#EEE8DC', bordo: '#B9AE9C', ferro: '#2A2630', sedia: 'bistrot', legno: ['#A8743E', '#8A5A34', '#C08A50'], omb: [['#F2E7CF', '#6F2B2E'], ['#F2E7CF', '#2A8A8A'], ['#F2E7CF', '#202D5E']] },
    { tipo: 'pieghevole', tinte: ['#2F6A4A', '#B3302E', '#2F60B5', '#DC9A34'], sedia: 'pieghevole', omb: [['#F6F2E8', '#B3302E'], ['#F6F2E8', '#2F6A4A'], ['#DC9A34', '#F6F2E8']] },
    { tipo: 'plastica', piano: '#F2F0EA', tovaglie: [['#C8303A', '#F6F2E8'], ['#2F60B5', '#F6F2E8'], ['#3F8A50', '#F6F2E8']], sedia: 'filo', tinte: ['#E04B8C', '#2A8A8A', '#F2F0EA', '#DC9A34'], omb: [['#F6F2E8', '#2F60B5'], ['#F6F2E8', '#E04B8C'], ['#A3D4D8', '#F6F2E8']] },
    { tipo: 'legno', piano: '#8A5A34', tovaglie: [['#2F60B5', '#F6F2E8'], ['#C8303A', '#F6F2E8']], sedia: 'paglia', legno: ['#6B3E22', '#7A4A2A'], omb: [['#F2E7CF', '#3F8A50'], ['#F2E7CF', '#6F2B2E']] },
  ];
  // una parte girata attorno al centro (ox, oz) di ry: le scatole (che girano su sé stesse) e i cilindri
  const pB = (C, ox, oz, ry, lx, y, lz, sx, sy, sz, hex) => { const c = Math.cos(ry), sn = Math.sin(ry); C.box(0, ox + lx * c + lz * sn, y, oz - lx * sn + lz * c, sx, sy, sz, hex, ry); };
  const pC = (C, ox, oz, ry, lx, y, lz, r, h, hex, seg) => { const c = Math.cos(ry), sn = Math.sin(ry); C.cil(0, ox + lx * c + lz * sn, y, oz - lx * sn + lz * c, r, h, hex, seg); };
  // le sedie: (x, z) il punto, ry il verso (il davanti è +z), lontano: senza doghe
  function sedia(C, x, z, ry, T, tinta, lon, r) {
    if (T.sedia === 'bistrot') { const fe = T.ferro, le = tinta; [[-.17, .16], [.17, .16], [-.16, -.16], [.16, -.16]].forEach(([a, b]) => pB(C, x, z, ry, a, .22, b, .025, .44, .025, fe)); pC(C, x, z, ry, 0, .44, .01, .21, .035, le, lon ? 8 : 12);
      [-.16, .16].forEach(a => pB(C, x, z, ry, a, .66, -.18, .022, .44, .022, fe)); pB(C, x, z, ry, 0, .86, -.19, .38, .05, .03, le); if (!lon) { pB(C, x, z, ry, 0, .7, -.19, .34, .03, .02, fe); pB(C, x, z, ry, 0, .2, 0, .36, .015, .015, fe); } return; }
    if (T.sedia === 'pieghevole') { const sc = sh(tinta, .78); [[-.19, .18], [.19, .18], [-.19, -.18], [.19, -.18]].forEach(([a, b]) => pB(C, x, z, ry, a, .22, b, .03, .45, .03, sc));
      if (lon) pB(C, x, z, ry, 0, .46, 0, .42, .03, .4, tinta); else for (let k = 0; k < 4; k++) pB(C, x, z, ry, 0, .46, -.15 + k * .1, .42, .025, .075, tinta);
      [-.19, .19].forEach(a => pB(C, x, z, ry, a, .68, -.2, .03, .46, .03, sc)); pB(C, x, z, ry, 0, .78, -.2, .42, lon ? .2 : .09, .025, tinta); if (!lon) pB(C, x, z, ry, 0, .63, -.2, .42, .07, .025, tinta); return; }
    if (T.sedia === 'filo') { const fe = '#2A2630'; [[-.17, .17], [.17, .17], [-.17, -.17], [.17, -.17]].forEach(([a, b]) => pB(C, x, z, ry, a, .22, b, .022, .44, .022, fe)); pC(C, x, z, ry, 0, .44, 0, .22, .03, tinta, 12);
      if (!lon) pC(C, x, z, ry, 0, .465, 0, .16, .006, sh(tinta, 1.18), 12); pB(C, x, z, ry, 0, .7, -.2, .4, .38, .03, tinta); if (!lon) for (let k = 0; k < 3; k++) pB(C, x, z, ry, -.12 + k * .12, .7, -.183, .03, .34, .012, sh(tinta, .72)); return; }
    // impagliata: telaio di legno, il sedile di paglia a trama, lo schienale a pioli
    const le = tinta, pa = '#D8B66A'; [[-.18, .17], [.18, .17]].forEach(([a, b]) => pB(C, x, z, ry, a, .22, b, .035, .45, .035, le)); [-.18, .18].forEach(a => pB(C, x, z, ry, a, .48, -.18, .035, .96, .035, le));
    if (lon) pB(C, x, z, ry, 0, .46, 0, .38, .04, .38, pa); else for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pB(C, x, z, ry, -.12 + i * .12, .46, -.12 + j * .12, .12, .04, .12, (i + j) % 2 ? pa : '#C29A50');
    [.66, .8, .93].forEach((y, k) => { if (lon && k !== 2) return; pB(C, x, z, ry, 0, y, -.18, .36, .045, .03, le); });
  }
  const sh = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
  // la tovaglia a quadri: una griglia di quadrati sul piano, girata di 45° quando il tavolo è tondo; le falde che pendono
  function tovaglia(C, y, lato, n, cA, cB, ruota) { const q = lato / n, c = Math.cos(ruota), s = Math.sin(ruota);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const lx = -lato / 2 + q * (i + .5), lz = -lato / 2 + q * (j + .5); C.box(0, lx * c + lz * s, y, -lx * s + lz * c, q, .008, q, (i + j) % 2 ? cA : cB, ruota); }
    for (const sg of [-1, 1]) for (const ax of [0, 1]) for (let i = 0; i < n; i++) { const t = -lato / 2 + q * (i + .5), lx = ax ? t : sg * lato / 2, lz = ax ? sg * lato / 2 : t; C.box(0, lx * c + lz * s, y - .07, -lx * s + lz * c, ax ? q : .01, .14, ax ? .01 : q, (i + (sg > 0 ? 0 : 1)) % 2 ? cA : cB, ruota); } }
  // le cose sul tavolino: (x, z) sul piano, y la quota del piano
  const TAZ = (C, x, y, z, r) => { C.cil(0, x, y, z, .055, .008, '#F6F2E8', 10); C.cil(0, x, y + .008, z, .032, .045, '#F6F2E8', 8); C.cil(0, x, y + .051, z, .027, .003, '#3A2418', 8); C.box(0, x + .038, y + .03, z, .015, .02, .008, '#F6F2E8'); };
  const BIC = (C, x, y, z, succo, cann) => { C.cil(0, x, y, z, .034, .13, '#CFE6EA', 8); C.cil(0, x, y + .005, z, .029, .085, succo, 8); C.box(0, x + .012, y + .14, z, .009, .1, .009, cann); C.box(0, x - .03, y + .115, z, .02, .03, .006, '#F2D23A'); };
  const ZUC = (C, x, y, z) => { C.cil(0, x, y, z, .03, .085, '#D8EEF0', 8); C.cil(0, x, y + .01, z, .025, .055, '#F6F2E8', 8); C.cil(0, x, y + .085, z, .032, .028, '#B8B8C0', 8); C.box(0, x + .02, y + .118, z, .02, .012, .012, '#B8B8C0'); };
  const POS = (C, x, y, z) => { C.cil(0, x, y, z, .05, .022, '#3A3A42', 10); C.box(0, x + .015, y + .025, z, .04, .008, .008, '#EDE6D6'); };
  const BOT = (C, x, y, z, hex) => { C.cil(0, x, y, z, .032, .19, hex, 8); C.cil(0, x, y + .19, z, .014, .08, hex, 6); C.box(0, x, y + .09, z + .028, .05, .06, .01, '#E8D8A8'); };
  const BIR = (C, x, y, z) => { C.cil(0, x, y, z, .04, .14, '#E0A030', 8); C.cil(0, x, y + .14, z, .041, .03, '#F6F2E8', 8); };
  const GEL = (C, x, y, z) => { C.cil(0, x, y, z, .018, .08, '#CFE6EA', 6); C.cil(0, x, y + .08, z, .06, .04, '#CFE6EA', 10); [['#F0BE8C', -.02, 0], ['#E04B8C', .02, .01], ['#93B27C', 0, -.02]].forEach(([c, a, b]) => C.cil(0, x + a, y + .11, z + b, .028, .035, c, 8)); C.box(0, x + .02, y + .15, z, .006, .06, .006, '#C8303A'); };
  const FIA = (C, x, y, z) => { C.cil(0, x, y, z, .075, .12, '#C8A060', 10); C.cil(0, x, y + .12, z, .05, .05, '#3F6A3A', 8); C.cil(0, x, y + .17, z, .016, .12, '#3F6A3A', 6); };
  const ROS = (C, x, y, z) => { C.cil(0, x, y, z, .03, .09, '#CFE6EA', 8); C.cil(0, x, y + .005, z, .026, .05, '#6F2B2E', 8); };
  const PAN = (C, x, y, z) => { C.cil(0, x, y, z, .1, .05, '#B08A4A', 10); [[-.03, 0], [.035, .02], [0, -.04]].forEach(([a, b]) => C.box(0, x + a, y + .065, z + b, .07, .04, .045, '#D8A860')); };
  const GIO = (C, x, y, z, ry) => { C.box(0, x, y + .004, z, .3, .008, .22, '#EDE8DA', ry); [-.05, 0, .05].forEach(b => C.box(0, x - .04 * Math.cos(ry) + b * Math.sin(ry), y + .009, z + .04 * Math.sin(ry) + b * Math.cos(ry), .18, .002, .02, '#8A8A90', ry)); };
  const VAS = (C, x, y, z) => { C.cil(0, x, y, z, .17, .012, '#C8C8D0', 14); BIC(C, x - .06, y + .012, z, '#E8902C', '#E04B8C'); TAZ(C, x + .06, y + .012, z + .02); };
  // il tavolino col suo piano, alla quota y0 = 0 del gruppo: torna la quota del piano
  function tavolo(C, T, tinta, lon, r, cl) {
    if (T.tipo === 'marmo') { for (let i = 0; i < 3; i++) { const a = i / 3 * 6.2832 + .5; C.box(0, Math.cos(a) * .14, .025, Math.sin(a) * .14, .3, .03, .035, T.ferro, -a); } C.cil(0, 0, .03, 0, .03, .68, T.ferro, 8); C.cil(0, 0, .67, 0, .07, .04, T.ferro, 8);
      C.cil(0, 0, .71, 0, .37, .018, T.bordo, lon ? 12 : 20); C.cil(0, 0, .728, 0, .355, .022, T.piano, lon ? 12 : 20); return .75; }
    if (T.tipo === 'pieghevole') { const sc = sh(tinta, .78); [[-.26, -.26], [.26, -.26], [-.26, .26], [.26, .26]].forEach(([a, b]) => C.box(0, a, .36, b, .03, .72, .03, sc)); if (!lon) [-.26, .26].forEach(b => C.box(0, 0, .2, b, .52, .025, .02, sc));
      C.box(0, 0, .725, 0, .64, .03, .64, tinta); C.box(0, 0, .705, 0, .66, .03, .66, sc); return .74; }
    if (T.tipo === 'plastica') { C.cil(0, 0, 0, 0, .24, .03, T.piano, 12); C.cil(0, 0, .03, 0, .04, .68, T.piano, 8); C.cil(0, 0, .71, 0, .38, .03, T.piano, 16); if (!lon) tovaglia(C, .745, .86, 4, cl[0], cl[1], .785); else C.box(0, 0, .745, 0, .8, .01, .8, cl[0], .785); return .75; }
    [[-.46, -.3], [.46, -.3], [-.46, .3], [.46, .3]].forEach(([a, b]) => C.box(0, a, .37, b, .05, .74, .05, sh(T.piano, .8))); C.box(0, 0, .75, 0, 1.0, .04, .68, T.piano);
    if (!lon) { const n = 5, q = 1.08 / n; for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) C.box(0, -.54 + q * (i + .5), .775, -.38 + .19 * (j + .5), q, .008, .19, (i + j) % 2 ? cl[0] : cl[1]); [-1, 1].forEach(sg => { for (let i = 0; i < n; i++) C.box(0, -.54 + q * (i + .5), .71, sg * .38, q, .13, .01, (i + (sg > 0 ? 0 : 1)) % 2 ? cl[0] : cl[1]); }); }
    else C.box(0, 0, .775, 0, 1.08, .01, .76, cl[0]); return .785;
  }
  // le cose sul piano, secondo il tipo del bar (il caso del tavolino decide quali)
  function sulTavolo(C, T, y, r, vassoio) { const k = Math.floor(r() * 3);
    if (vassoio) { VAS(C, .08, y, -.05); POS(C, -.18, y, .12); return; }
    if (T.tipo === 'marmo') { TAZ(C, -.15, y, .1); if (k) TAZ(C, .16, y, -.06); ZUC(C, 0, y, -.16); if (k !== 1) BIC(C, .12, y, .15, ['#E8902C', '#C8303A', '#F2D23A'][k], '#E04B8C'); POS(C, -.08, y, -.17); return; }
    if (T.tipo === 'pieghevole') { BOT(C, -.12, y, -.1, k ? '#2F6A3A' : '#6A3A18'); BIR(C, .12, y, .1); if (k === 2) BIR(C, -.15, y, .16); else GIO(C, .08, y, -.12, .3); POS(C, .18, y, -.16); return; }
    if (T.tipo === 'plastica') { GEL(C, -.1, y + .002, .08); BIC(C, .14, y + .002, -.06, '#E8902C', '#2A8A8A'); if (k) GEL(C, .1, y + .002, .16); ZUC(C, -.16, y + .002, -.14); return; }
    FIA(C, -.3, y, -.1); ROS(C, -.05, y, .12); ROS(C, .2, y, .1); PAN(C, .25, y, -.15); if (k) ROS(C, -.25, y, .16);
  }
  function ombrellone(C, A, B, lon, R, senzaBase) { R = R || 1.35; if (!senzaBase) C.cil(0, 0, 0, 0, .26, .09, '#9A948C', 10); C.cil(0, 0, senzaBase ? .7 : .09, 0, .025, senzaBase ? 1.74 : 2.35, '#F2F0EA', 6);
    C.cono(0, 0, 1.98, 0, R, .05, .44, A, B, lon ? 8 : 12); C.cono(0, 0, 1.86, 0, R, R, .13, A, B, lon ? 8 : 12); C.cil(0, 0, 2.42, 0, .04, .06, '#F2F0EA', 6); }
  function lavagna(C, lon) { [-.27, .27].forEach(a => C.box(0, a, .5, 0, .04, 1.0, .04, '#8A5A34')); C.box(0, 0, .62, .01, .56, .66, .03, '#22302A'); C.box(0, 0, .96, .01, .6, .04, .05, '#8A5A34'); C.box(0, 0, .28, .01, .6, .04, .05, '#8A5A34');
    if (!lon) { C.box(0, 0, .86, .03, .36, .05, .004, '#F6F2E8'); [.76, .69, .62, .55].forEach((y, k) => C.box(0, -.04 + (k % 2) * .03, y, .03, .4 - k * .05, .018, .004, k === 1 ? '#F0BE8C' : '#E8E4D8')); C.box(0, .16, .44, .03, .1, .1, .004, '#E04B8C'); } }
  function fioriera(C, cotto, lon, r) { const v = cotto ? '#B85C38' : '#2F6A4A'; C.box(0, 0, .2, 0, .9, .4, .42, v); C.box(0, 0, .41, 0, .96, .04, .48, sh(v, .82)); C.box(0, 0, .42, 0, .84, .02, .36, '#4A3422');
    [[-.28, .02], [0, -.04], [.28, .03]].forEach(([a, b], i) => { C.cil(0, a, .42, b, .16, .22 + i % 2 * .06, i % 2 ? '#3F8A50' : '#34532F', 8); if (!lon) for (let k = 0; k < 4; k++) C.box(0, a + (r() - .5) * .22, .62 + r() * .08 + i % 2 * .05, b + (r() - .5) * .2, .05, .05, .05, ['#E04B8C', '#C8303A', '#F6F2E8', '#E04B8C'][k]); }); }
  function frigo(C) { C.box(0, 0, .43, 0, 1.0, .82, .6, '#E8E6E0'); C.box(0, 0, .86, 0, 1.02, .04, .62, '#C8C6C0'); C.box(0, 0, .88, 0, .9, .01, .5, '#A3D4D8'); C.box(0, 0, .5, .305, .7, .32, .01, '#2F60B5'); C.box(0, 0, .5, .31, .5, .06, .01, '#F6F2E8'); }

  // il dehors intero di un bar: una delle due versioni (vers: [true] il lontano, [false] il vicino coi sedili)
  const CD = () => { const C = new Cose(); C.rifai = true; return C; };   // senza ricetta (i dehors non si cuociono come le cose delle celle): metà del tempo
  function costruisciDehors(d, vers) {
    const bi = d.bi, hT = hh(bi, 4242, 7), T = DEHT[d.use === 'gelateria' ? 2 : (d.use === 'osteria' || d.use === 'trattoria') ? 3 : Math.floor(hT * 3) % 3 === 2 && hh(bi, 3, 3) < .4 ? 3 : Math.floor(hT * 3)], r0 = () => mulberry(bi * 977 + 13);
    const tinta = T.tinte ? T.tinte[Math.floor(hh(bi, 5, 5) * T.tinte.length)] : T.legno[Math.floor(hh(bi, 6, 6) * T.legno.length)], cl = T.tovaglie ? T.tovaglie[Math.floor(hh(bi, 7, 7) * T.tovaglie.length)] : null, omb = T.omb[Math.floor(hh(bi, 8, 8) * T.omb.length)];
    const ux = Math.cos(d.yaw), uz = -Math.sin(d.yaw), nx = Math.sin(d.yaw), nz = Math.cos(d.yaw);
    // la pedana di legno se il marciapiede scende (come render.js): i tavolini alla quota più alta
    const hs = d.tavoli.map(t => gH(t.x, t.z)), hmax = Math.max(...hs, -99), hmin = Math.min(...hs, 99), pedana = d.tavoli.length && hmax - hmin > .12, top = hmax + (pedana ? .12 : 0);
    const out = { vicino: null, lontano: null, sedili: [], d };
    for (const lon of vers) { const r = r0(), L = []; if (lon) out.lontano = L; else out.vicino = L;
      const pos = (C, x, z, y) => L.push(C.posa(x, y, z, ux, uz, nx, nz));
      if (pedana) { const us = d.tavoli.map(t => (t.x - d.tavoli[0].x) * ux + (t.z - d.tavoli[0].z) * uz), u0 = Math.min(...us) - .9, u1 = Math.max(...us) + .9, C = CD(); C.box(0, (u0 + u1) / 2, -(top - hmin + .05) / 2, 0, u1 - u0, top - hmin + .05, 1.9, '#7A5236'); if (!lon) for (let k = 0; k < 8; k++) C.box(0, u0 + (k + .5) * (u1 - u0) / 8, .004, 0, .02, .01, 1.9, '#5A3A22'); pos(C, d.tavoli[0].x, d.tavoli[0].z, top); }
      d.tavoli.forEach((t, i) => { const C = CD(), y0 = pedana ? top : gH(t.x, t.z), yp = tavolo(C, T, tinta, lon, r, cl);
        if (!lon) sulTavolo(C, T, yp, r, i === 0 && d.tavoli.length > 1);
        // le sedie: ai due lati lungo il muro, rivolte al tavolino; fra due tavolini una sola; con una sola, una dal lato della strada
        const vic = s2 => d.tavoli.filter(q => q !== t).map(q => (q.x - t.x) * ux + (q.z - t.z) * uz).filter(l => l * s2 > 0 && Math.abs(l) < 1.9).sort((a, b) => Math.abs(a) - Math.abs(b))[0];
        const posti = []; [-1, 1].forEach(s2 => { const l = vic(s2); if (l === undefined) posti.push([s2 * .64, 0, -s2 * Math.PI / 2]); else if (s2 > 0) posti.push([l / 2, 0, -Math.PI / 2]); }); if (posti.length < 2) posti.push([0, .66, Math.PI]);
        const ct = T.sedia === 'filo' ? T.tinte[Math.floor(hh(bi, 9, i) * T.tinte.length)] : T.sedia === 'bistrot' ? T.legno[Math.floor(hh(bi, 10, i) * T.legno.length)] : tinta;
        posti.forEach(([px, pz, ry]) => { const ryj = ry + (r() - .5) * .3; sedia(C, px, pz, ryj, T, ct, lon, r); if (!lon) out.sedili.push([t.x + px * ux + pz * nx, y0, t.z + px * uz + pz * nz, d.yaw + ryj]); });
        if (d.ombTav === i) ombrellone(C, omb[0], omb[1], lon, 1.05, true);
        pos(C, t.x, t.z, y0); });
      d.ombrelloni.forEach(o => { const C = CD(); ombrellone(C, omb[0], omb[1], lon); pos(C, o.x, o.z, pedana ? top : gH(o.x, o.z)); });
      d.fioriere.forEach(f => { const C = CD(); fioriera(C, T.tipo !== 'pieghevole', lon, r); pos(C, f.x, f.z, pedana ? top : gH(f.x, f.z)); });
      if (d.lavagna) { const C = CD(); lavagna(C, lon); pos(C, d.lavagna.x, d.lavagna.z, gH(d.lavagna.x, d.lavagna.z)); }
      if (d.frigo) { const C = CD(); frigo(C); pos(C, d.frigo.x, d.frigo.z, gH(d.frigo.x, d.frigo.z)); }
    }
    const xs = d.tavoli.concat(d.fioriere), cx = xs.length ? xs.reduce((a, q) => a + q.x, 0) / xs.length : (d.lavagna ? d.lavagna.x : 0), cz = xs.length ? xs.reduce((a, q) => a + q.z, 0) / xs.length : (d.lavagna ? d.lavagna.z : 0);
    if (vers.includes(true)) { S.dehors = (S.dehors || 0) + 1; S.dehorsTipi = S.dehorsTipi || {}; S.dehorsTipi[T.tipo] = (S.dehorsTipi[T.tipo] || 0) + 1; }
    return Object.assign(out, { x: cx, z: cz, tipo: T.tipo });
  }
  // l'indice per cella del piano di scena.js (una volta), e i dehors costruiti la prima volta che la loro cella si vede
  function dehorsCella(k) {
    if (!DEH.idx) { DEH.idx = new Map(); try { const P = typeof Scena !== 'undefined' && Scena.piano ? Scena.piano() : null; (P && P.dehors || []).concat(barRoba()).forEach(d => { if (!d.tavoli.length && !d.lavagna && !d.fioriere.length) return; const q = d.tavoli[0] || d.lavagna || d.fioriere[0], kk = keyC(Math.floor(q.x / CELL), Math.floor(q.z / CELL)); (DEH.idx.get(kk) || DEH.idx.set(kk, []).get(kk)).push(d); }); } catch (e) { S.err = 'dehors: ' + e.message; } }
    const L = DEH.idx.get(k); if (!L) return null;
    // prima il lontano (un terzo dei vertici), uno alla volta finché il fotogramma ha tempo (DEH.speso, azzerato da rifai), il resto al
    // fotogramma dopo (DEH.manca); il vicino quando ci si avvicina (vicinoDi). Tutti insieme (nove bar entrando in una zona) erano 10 ms
    let F = DEH.fatti.get(k); if (!F) DEH.fatti.set(k, F = []);
    while (F.length < L.length) { if (DEH.speso > DEH_BUD) { DEH.manca = true; break; } const t0 = performance.now(); F.push(costruisciDehors(L[F.length], [true])); spesa(t0); }
    return F;
  }
  function spesa(t0) { const dt = performance.now() - t0; DEH.speso += dt; S.dehorsUnoMax = Math.max(S.dehorsUnoMax || 0, Math.round(dt * 100) / 100); }
  // il dehors da vicino: le cose sui tavolini, le doghe, i sedili; se il fotogramma non ha più tempo resta il lontano un fotogramma ancora
  function vicinoDi(D) {
    if (D.vicino) return D.vicino; if (DEH.speso > DEH_BUD) { DEH.manca = true; return D.lontano; }
    const t0 = performance.now(), V = costruisciDehors(D.d, [false]); D.vicino = V.vicino; spesa(t0);
    if (typeof Anim !== 'undefined' && Anim.sedileObj && GRUPPO) V.sedili.forEach(([x, y, z, ry]) => { const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.y = ry; o.name = 'pieno_sedile'; GRUPPO.add(o); o.updateMatrixWorld(true); Anim.sedileObj(o, 0); });   // [seduti] le sedie dei dehors sono sedili
    return D.vicino;
  }
  const DEHORS_ON = !/[?&]nopienodehors\b/.test(Q);
  // i tavolini davanti alla porta dei bar, le due fonti di render.js: buildDetails («il carattere del locale»: bar, trattorie e osterie, due
  // tavolini ottagonali di legno con due sgabelli rossi, a 1,6 e 1,8 m dalla porta e a 2 m dal muro: sono quelli che si vedono) e
  // oggetti35 (due tavolini a 1,6 e 3,2 m dalla porta, 1,3 m dal muro, sul posto libero di OCC35; la lavagna dall'altra parte della porta,
  // oltre le casse dei vuoti; la fioriera in fondo). render.js ne fa solo la posa (window.__pienoBar35) e la cottura dei tasselli la porta
  // in pieno.json (bar): qui diventano dehors come gli altri, un dehors per fonte. Con i tasselli vecchi (senza bar) niente: i tavolini di
  // prima sono dentro i tasselli
  function barRoba() {
    const L = COTTA.dati ? COTTA.dati.bar : (typeof window !== 'undefined' ? window.__pienoBar35 : null); if (!Array.isArray(L)) return [];
    const per = new Map(), visti = new Set(); L.forEach(q => { const kq = q.t + q.x + ',' + q.z; if (visti.has(kq)) return; visti.add(kq); const kb = q.bi + ':' + (q.src || ''); let d = per.get(kb); if (!d) per.set(kb, d = { bi: q.id ? [...q.id].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261) % 100000 : q.bi, use: /osteria|trattoria/.test(q.id + ' ' + q.use) ? 'osteria' : /gelat/.test(q.id + ' ' + q.use) ? 'gelateria' : q.use, yaw: q.yaw, tavoli: [], fioriere: [], ombrelloni: [], lavagna: null, frigo: null, roba: true });
      if (q.t === 't') d.tavoli.push({ x: q.x, z: q.z }); else if (q.t === 'f') d.fioriere.push({ x: q.x, z: q.z }); else if (q.t === 'l') d.lavagna = { x: q.x, z: q.z }; });
    // l'ombrellone sull'ultimo tavolino, il più lontano dalla porta (il palo nel tavolino, senza base: non c'è posto), per metà dei bar
    per.forEach(d => { if (d.tavoli.length && hh(d.bi, 11, 11) < .55) d.ombTav = d.tavoli.length - 1; });
    return [...per.values()];
  }

  // ================= OGNI FOTOGRAMMA =================
  const FR0 = { t: 0, max: BUDGET };   // il fotogramma: quando è cominciato e quanto può spendere la pianta
  let FASE = ''; const COTTA = { dati: undefined, t0: 0 };
  let lx = 1e9, lz = 1e9, sporco = true, st0 = null, tFacce = 0, nVeri = 0, tVeri = 0, TUTTO = false; const FOT = { n: 0, prossimo: 0 }, ARRIVO = { t0: 0, on: false }, PASSO_LAV = TEL ? 1.5 : 2;
  function tick(st) {
    if (!S.on) return; const cam = R().cam; if (!cam || !isFinite(cam.x)) return; st0 = st || st0; FOT.n++;
    const t0 = performance.now(); FR0.t = t0;
    if (!GRUPPO) { const sc = R().__models && R().__models.scene; if (!sc) return; GRUPPO = new THREE.Group(); GRUPPO.name = 'pieno'; sc.add(GRUPPO); window.__PIENO_G = GRUPPO; cresci(256); cresciCose(8192); caricaAtlante(); }
    // l'atlante a passi (i caratteri dei graffiti prima)
    if (!ATL.pronto && ATL.passi.length && fontPronti()) { while (ATL.passi.length && performance.now() - t0 < BUDGET * 2) { const f = ATL.passi.shift(); try { f(); } catch (e) { S.err = 'atlante: ' + e.message; } } }
    // le facce: quando le case ci sono (il registro del regista è pronto, o coi tasselli i dati delle case)
    if (!FACCE) { if (!R().__dz || !R().__dz.bRec || !R().__dz.bRec.length || !(window.__pulizia2 || (window.__tasselli && window.__tasselli.on))) return; if (performance.now() - tFacce < 1000) return; tFacce = performance.now(); FACCE = facce(); if (!FACCE) return; if (!(typeof Tasselli !== 'undefined' && Tasselli.attivo && Tasselli.attivo())) indiceMeshe(); }
    // [pieno3] le mesh vicine per i raggi (render.js bmbCands) si rifanno a fette solo se qualcuno le ha chieste negli ultimi 10 s; dopo una
    // pausa il primo che chiede fa il giro intero della scena (~25 ms). Si tengono calde: una domanda ogni 4 s (nella schermata iniziale la prima)
    if (!COTTA.dati && !MESHE.m && performance.now() - (S.tCaldo || 0) > 4000) { S.tCaldo = performance.now(); try { const B = R().__bmb; if (B && B.bmbCands) B.bmbCands(Math.round(cam.x), Math.round(cam.y)); } catch (e) { } }
    const tF = performance.now();
    // [pieno3] LA PIANTA COTTA: coi tasselli lo strato legge la sua pianta già fatta (tasselli/pieno.json: niente raggi a gioco); finché il
    // file non è arrivato si aspetta (al più 90 s), senza (cottura vecchia, o niente tasselli) la pianta si fa qui come prima, a passi
    if (COTTA.dati === undefined) { const TS2 = typeof Tasselli !== 'undefined' ? Tasselli : null;
      if (TS2 && TS2.attivo && TS2.attivo()) { const p = TS2.pieno; if (p === undefined && performance.now() - (COTTA.t0 || (COTTA.t0 = performance.now())) < 90000) return; COTTA.dati = p && Array.isArray(p.celle) ? p : null; }
      else if (TS2 && TS2.deciso === false && performance.now() - (COTTA.t0 || (COTTA.t0 = performance.now())) < 15000) return; else COTTA.dati = null;
      if (COTTA.dati) { COTTA.dati.celle.forEach(q => { const k = keyC(q.k[0], q.k[1]); PIANO.set(k, { k, i: q.k[0], j: q.k[1], stato: 1, cotta: true, d: q.d.map(e => [e[0], [e[1], e[2], e[3], 0, e[4], e[5], e[6], 0, e[7], e[8], e[9], 0, e[10], e[11], e[12], 1]]), ricette: q.c, cose: [], voci: q.v || [], prove: 0 }); }); S.cotta = COTTA.dati.celle.length; sporco = true; } }
    // le celle vicine da pianificare, la più vicina prima, nel budget
    const ci = Math.floor(cam.x / CELL), cj = Math.floor(cam.y / CELL), nR = Math.ceil(RV / CELL) + 1, da = [];
    for (let i = ci - nR; i <= ci + nR; i++) for (let j = cj - nR; j <= cj + nR; j++) { const k = keyC(i, j); let c = PIANO.get(k); if (!c) PIANO.set(k, c = COTTA.dati ? { k, i, j, stato: 1, d: [], cose: [], voci: [], prove: 0 } : { k, i, j, stato: 0, prove: 0 }); if (c.stato === 0 && performance.now() >= (c.dopo || 0)) da.push([hyp((i + .5) * CELL - cam.x, (j + .5) * CELL - cam.y), c]); }
    da.sort((a, b) => a[0] - b[0]);
    const intro = !!(window.__pv && window.__pv.ui && window.__pv.ui.intro), BUD = intro ? 30 : BUDGET; FR0.max = BUD;   // [pieno2] nella schermata iniziale (il gioco è fermo) la pianta attorno alla partenza corre: il primo quadro è già pieno
    if (PART.x === null && st0 && st0.player) { PART.x = st0.player.x; PART.z = st0.player.y; }
    for (const [d, c] of da) { if (d > RV + CELL || performance.now() - t0 > BUD) break;
      try { if (!c.gen) { c.gen = pianificaG(c, st0); c.r0 = S.raggi; c.m0 = S.scarti.senza_muro || 0; } let r; do { const tq = performance.now(), fq = FASE; r = c.gen.next(); const dq = performance.now() - tq; if (dq > (S.passoMax || 0) && !intro && !ARRIVO.on) { S.passoMax = +dq.toFixed(1); S.passoFase = fq + '>' + FASE; } } while (!r.done && performance.now() - t0 < BUD); if (!r.done) break;
        const o = r.value; c.gen = null; if ((S.scarti.senza_muro || 0) - c.m0 > 0 && !o.d.length && !o.cose.length && (FACCE.get(c.k) || []).length && c.prove < 3) { c.prove++; c.dopo = performance.now() + 4000; continue; }   // i muri non ancora arrivati (tasselli): si riprova
        Object.assign(c, o, { stato: 1 }); c.dopoF = performance.now() + 1500; S.celle++; sporco = true; } catch (e) { S.err = 'pianta: ' + e.message; c.gen = null; c.stato = 1; c.d = []; c.cose = []; c.voci = []; } }
    // [pieno3] le facce rimandate (i dati dei raggi del tassello non ancora pronti): si riprovano ogni 1,5 s, nel budget
    if (!da.length || performance.now() - t0 < BUD * .5) for (const c of PIANO.values()) { if (performance.now() - t0 > BUD) break; if (c.stato !== 1 || !c.rimandate || !c.rimandate.length || performance.now() < (c.dopoF || 0) || hyp((c.i + .5) * CELL - cam.x, (c.j + .5) * CELL - cam.y) > RV + CELL) continue;
      try { if (!c.genF) c.genF = pianificaG(c, st0, c.rimandate); let r; do r = c.genF.next(); while (!r.done && performance.now() - t0 < BUD); if (!r.done) break;
        const o = r.value; c.genF = null; c.d.push(...o.d); c.cose.push(...o.cose); c.voci.push(...o.voci); c.rimandate = o.rimandate; c.dopoF = performance.now() + 1500; if (o.d.length || o.cose.length) sporco = true; } catch (e) { S.err = 'rimandate: ' + e.message; c.genF = null; c.rimandate = []; } }
    const tP = performance.now();
    // [pieno2] i lavori dei writer delle celle già pianificate (quando la storia dei muri c'è); nei primi 4 s dopo che la storia arriva
    // (la partita è appena cominciata, la camera ferma) la pianta corre: il primo quadro ha già i suoi muri dipinti
    const conLav = st0 && st0.wr && st0.wr.works && st0.wr.works.length > 50; if (conLav && !ARRIVO.t0) ARRIVO.t0 = performance.now(); ARRIVO.on = intro || (ARRIVO.t0 && performance.now() - ARRIVO.t0 < 4000);
    const BUDL = ARRIVO.on ? 25 : Math.min(BUD, 2);
    if (conLav) for (const [d, c] of vicine(cam)) { if (d > RV + CELL || performance.now() - tP > BUDL) break; if (c.stato !== 1 || c.lavFatto) continue;
      try { if (!c.genL) c.genL = lavoriG(c, st0, c); let r; do r = c.genL.next(); while (!r.done && (ARRIVO.on || r.value !== 'passo') && performance.now() - tP < BUDL); if (!r.done) break; c.genL = null; c.lavFatto = true; c.lavRivedi = c.manca ? performance.now() + 5000 : 0; sporco = true; } catch (e) { S.err = 'lavori: ' + e.message; c.genL = null; c.lavFatto = true; } }
    const tL = performance.now();
    // le liste da disegnare quando la camera si sposta o una cella è pronta
    { const GW2 = typeof Writing !== 'undefined' && Writing.GFX ? Writing.GFX.works : null, nv = GW2 ? Object.keys(GW2).length : 0; if (nv !== nVeri && performance.now() - tVeri > 1500) { nVeri = nv; tVeri = performance.now(); sporco = true; } }   // il vero arriva: la sua sagoma va via
    if (sporco || hyp(cam.x - lx, cam.y - lz) > 3) { lx = cam.x; lz = cam.y; sporco = false; rifai(cam.x, cam.y); }
    { const nl = (R().nightLevel && st0) ? R().nightLevel(st0.t) : 0; UE.value.set(.28 * (1 - nl), .12 + .38 * nl); }   // di notte la vernice non si accende; la pozza luccica
    { const dt0 = performance.now() - t0; S.ms = +(S.ms * .9 + dt0 * .1).toFixed(2); if (!intro && !ARRIVO.on) { if (dt0 > (S.msMax || 0)) S.picco = { inizio: +(tF - t0).toFixed(1), pianta: +(tP - tF).toFixed(1), lavori: +(tL - tP).toFixed(1), liste: +(performance.now() - tL).toFixed(1) }; S.msMax = Math.max(S.msMax || 0, +dt0.toFixed(2)); S.fot = (S.fot || 0) + 1; if (dt0 > 4) S.sopra4 = (S.sopra4 || 0) + 1; } }   // il fotogramma più lungo a gioco (fuori dalla schermata iniziale e dall'arrivo)
  }
  function vicine(cam) { const L = [], now = performance.now(); PIANO.forEach(c => { if (c.stato === 1 && c.lavFatto && c.lavRivedi && now > c.lavRivedi) c.lavFatto = false; if (c.stato === 1 && !c.lavFatto) L.push([hyp((c.i + .5) * CELL - cam.x, (c.j + .5) * CELL - cam.y), c]); }); return L.sort((a, b) => a[0] - b[0]); }
  function rifai(x, z) {
    const t0r = performance.now(), vis = []; DEH.speso = 0; DEH.manca = false; PIANO.forEach(c => { if (c.stato === 1 && hyp((c.i + .5) * CELL - x, (c.j + .5) * CELL - z) < RV + CELL * .75) vis.push(c); });
    vis.forEach(c => { if (c.ricette && !c.coseFatte) { c.cose = c.ricette.map(daRicetta); c.coseFatte = true; } });
    const DH = []; if (DEHORS_ON) vis.forEach(c => { const F = dehorsCella(c.k); if (F) F.forEach(D => DH.push(hyp(D.x - x, D.z - z) < DEH_LOD ? vicinoDi(D) : D.lontano)); });
    S.dehorsMsMax = Math.max(S.dehorsMsMax || 0, Math.round((performance.now() - t0r) * 100) / 100);   // [pieno4] il costo dei dehors (la prima volta che una cella si vede si costruiscono)
    let nd = 0, nv = 0; vis.forEach(c => { nd += c.d.length; c.cose.forEach(o => nv += o.p.length / 3); }); DH.forEach(L => L.forEach(o => nv += o.p.length / 3));
    if (nd > CAP) cresci(nd); if (nv > CV) cresciCose(nv);
    const RA = DEC.geometry.getAttribute('aRect'), RE = DEC.geometry.getAttribute('aEmi'), M = DEC.instanceMatrix.array; let i = 0;
    const GW2 = typeof Writing !== 'undefined' && Writing.GFX ? Writing.GFX.works : null;
    if (ATL.pronto) vis.forEach(c => c.d.forEach(([nome, m, id]) => { const q = CELLE[nome]; if (!q || (id !== undefined && GW2 && GW2[id])) return; M.set(m, i * 16); const pad = 3 + 1 / K; RA.array.set([(q[0] + pad) / AW, 1 - (q[1] + q[3] - pad) / AH, (q[2] - pad * 2) / AW, (q[3] - pad * 2) / AH], i * 4); RE.array[i] = nome === 'pozza' ? 1 : 0; i++; }));
    DEC.count = i; DEC.instanceMatrix.needsUpdate = true; RA.needsUpdate = true; RE.needsUpdate = true; S.decal = i;
    // la sfera per il taglio fuori dall'inquadratura: chi passa a rimettere frustumCulled (i rami del gioco) trova quella giusta, attorno alla camera
    const gy = gH(x, z), SF = (g, r) => { if (!g.boundingSphere) g.boundingSphere = new THREE.Sphere(); g.boundingSphere.center.set(x, gy, z); g.boundingSphere.radius = r; };
    SF(DEC.geometry, RV + CELL + 8); SF(COSE.geometry, RV + CELL + 8);   // (le cose non si tagliano, ma la sfera giusta serve alle ombre)
    const G2 = COSE.geometry, P = G2.attributes.position.array, N = G2.attributes.normal.array, Cc = G2.attributes.color.array; let o = 0;
    vis.forEach(c => c.cose.forEach(q => { P.set(q.p, o * 3); N.set(q.n, o * 3); Cc.set(q.c, o * 3); o += q.p.length / 3; }));
    DH.forEach(L => L.forEach(q => { P.set(q.p, o * 3); N.set(q.n, o * 3); Cc.set(q.c, o * 3); o += q.p.length / 3; })); S.dehorsVerts = DH.reduce((a, L) => a + L.reduce((b, q) => b + q.p.length / 3, 0), 0);
    G2.setDrawRange(0, o); ['position', 'normal', 'color'].forEach(k => { const a = G2.attributes[k]; a.needsUpdate = true; if (a.updateRange) { a.updateRange.offset = 0; a.updateRange.count = o * 3; } }); S.cose = vis.reduce((a, c) => a + c.cose.length, 0); S.verts = o;
    S.rifaiMsMax = Math.max(S.rifaiMsMax || 0, Math.round((performance.now() - t0r) * 100) / 100); if (DEH.manca) sporco = true;
  }
  if (Render.frame) { const f0 = Render.__pienoF0 || Render.frame; Render.__pienoF0 = f0; Render.frame = function (st) { try { tick(st); } catch (e) { S.err = String(e && e.message || e); } return f0.apply(this, arguments); }; }   // (una volta sola: ricaricato, il modulo prende il posto del vecchio)
  if (window.__PIENO_G && window.__PIENO_G.parent) window.__PIENO_G.parent.remove(window.__PIENO_G);
  const API = {
    attivo: true, CELLE, stato: () => S,
    elenco: () => { const L = []; PIANO.forEach(c => (c.voci || []).forEach(v => L.push(v))); return L; },
    imposta: on => { S.on = !!on; if (GRUPPO) GRUPPO.visible = S.on; return S.on; },
    // strumenti/pieno_atlante.js: l'atlante pieno, disegnato tutto d'un fiato (fuori dal gioco), come immagine
    disegnaAtlante: () => { const k0 = K, P0 = ATL.passi.slice(), c0 = ATL.cnv, x0 = ATL.x, p0 = ATL.pronto, t0 = ATL.tex; K = 1; ATL.passi = []; ATL.pronto = false; preparaAtlante(); ATL.passi.pop();   // l'ultimo passo manda alla scheda video: qui no
      ATL.passi.forEach(f => f()); const out = ATL.cnv; Object.assign(ATL, { passi: P0, cnv: c0, x: x0, pronto: p0, tex: t0 }); K = k0; return out; },
    // [pieno3] la pianta per la cottura dei tasselli (strumenti/tassella_pagina.js): le decalcomanie (matrice 3×4), le ricette delle cose,
    // le voci; senza le sagome dei lavori (quelle si leggono a gioco dai lavori cotti)
    esporta: () => { const out = []; PIANO.forEach(c => { if (c.stato !== 1) return; const d = (c.d || []).filter(e => e[2] === undefined).map(([nome, m]) => [nome].concat([0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14].map(i => Math.round(m[i] * 1000) / 1000)));
      const cs = (c.cose || []).filter(o => o.ricetta).map(o => o.ricetta), v = (c.voci || []).filter(q => !/^lavoro_/.test(q[0])); if (d.length || cs.length) out.push({ k: [c.i, c.j], d, c: cs, v }); }); return { versione: 1, celle: out, bar: typeof window !== 'undefined' && Array.isArray(window.__pienoBar35) ? window.__pienoBar35 : undefined }; },
    disegni: () => (DEC && DEC.count ? 1 : 0) + (COSE && COSE.geometry.drawRange.count ? 1 : 0),
    // per il censimento: pianifica tutte le celle della città (fuori dal gioco normale; lento)
    tutto: (st, x0, z0, x1, z1) => { TUTTO = true; try { return tutto0(st, x0, z0, x1, z1); } finally { TUTTO = false; } },
    __tutto0: null,
  };
  function tutto0(st, x0, z0, x1, z1) { { if (!FACCE) FACCE = facce(); if (!MESHE.m && !(typeof Tasselli !== 'undefined' && Tasselli.attivo && Tasselli.attivo())) indiceMeshe(); if (PART.x === null && st && st.player) { PART.x = st.player.x; PART.z = st.player.y; } for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = keyC(i, j); let c = PIANO.get(k); if (!c) PIANO.set(k, c = COTTA.dati ? { k, i, j, stato: 1, d: [], cose: [], voci: [], prove: 0 } : { k, i, j, stato: 0, prove: 0 }); if (c.stato === 0) { c.gen = null; Object.assign(c, pianifica(c, st), { stato: 1 }); S.celle++; } if (!c.lavFatto && st && st.wr && st.wr.works && st.wr.works.length > 50) { const g = lavoriG(c, st, c); while (!g.next().done); c.lavFatto = true; } } sporco = true; return S; } }
  return API;
})();
if (typeof module !== 'undefined') module.exports = Pieno;
