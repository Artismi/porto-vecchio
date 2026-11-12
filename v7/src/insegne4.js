/* Porto Vecchio — [insegne4] LE INSEGNE VIVE (con ?insegne4; [apk_finale] di serie: index.src.html lo aggiunge, ?noinsegne4 o ?vecchio lo spengono).
   [apk_finale] COTTE NEI TASSELLI: nella cottura (strumenti/tassella.js, la città costruita qui) le insegne di serie si spengono e si scavano
   come sotto, le correzioni contro le compenetrazioni si calcolano coi raggi, e la lista dei posti (le schede di partenza) e la tabella
   delle correzioni vanno in tasselli/dati.json (Insegne4.cotto(), tassella_pagina.js). Il gruppo delle insegne nuove resta del gioco (non
   è di una fase della città: non entra nei tasselli). Coi tasselli il telefono non cerca, non spegne e non scava niente: dalla lista
   cotta dipinge la tela e fa le mesh (Tasselli.insegne4). Senza tasselli (?tasselli=0, impronta diversa) tutto come prima, nel browser.
   insegne4.js sta nell'impronta dei tasselli (cambiarlo li ricuoce).
   Come lavora, tutto a tempo di esecuzione:
   - prima che la città nasca toglie la tavola di legno di serie (Arredo3D.T.insegna_tavola: un gruppo vuoto) e il braccio della bandiera;
   - a città fatta trova le scritte di serie dal nome dei loro materiali (userData.grafica: insegna_locale, insegna_speciale, insegna_fascia_*,
     insegna_verticale, bandiera_neon), ne legge dalla geometria posto, verso e misura, le spegne (e il loro alone), e ne libera le tele;
   - al loro posto un'insegna vera per bottega, mai due uguali: smalto su lamiera, tavola di legno dipinta, cassonetto luminoso, neon a tubi
     su pannello o su telaio, lettere dipinte sul muro, bandiere su staffa di ferro battuto col ricciolo, croce della farmacia, la T dei
     tabacchi, la bandiera verticale. Lettere dei font dei graffiti (GraffitiFonts) e dei serif di sistema, col contorno, l'ombra portata,
     lo smusso e la mano che trema; la vernice con la grana, le sbeccature, la ruggine che cola dai bulloni e dai bordi, il sole che sbiadisce,
     lo sporco in basso. Una tela sola (2048²) per tutte le facce dipinte; le parti senza tela col colore ai vertici; per insegna 3-5 disegni.
   - il neon: tubi veri (lo scheletro della lettera: la parola su una tela, assottigliata, seguita in linee, lisciata), i portalampada alle
     estremità, i distanziali, il trasformatore e il tubo del cavo; l'alone sul pannello (additivo) e un bagliore; di giorno vetro tinto, di
     notte acceso; su qualche insegna lettere che si spengono e tornano (deterministico per insegna, più spesso di notte).
   Le sonde: window.__insegne4 (posti e tipi), Insegne4.conti() (disegni, vertici, memoria della tela). */
var Insegne4 = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = typeof window !== 'undefined' && /[?&]insegne4\b/.test(Q) && !window.PV_STUDIO;
  const API = { on: ON };
  if (!ON) return API;
  const GEN = (window.__ins4gen = (window.__ins4gen || 0) + 1);   // le prove ricaricano il file nella pagina: il giro vecchio si ferma

  // ---- [telefono] il profilo leggero (?leggera, LeggeraMem) svuota i vettori delle geometrie dopo l'invio alla scheda video: le insegne di
  // serie e le mesh fuse da scavare non si leggerebbero più. Finché le insegne nuove non sono fatte (e due fotogrammi dopo, perché gli
  // indici scavati vadano alla scheda video) lo svuotamento aspetta; poi si fa come prima
  const RIT = []; let liberaOk = false;
  // [apk_finale] le insegne cotte nei tasselli (la lista dei posti e le correzioni): con loro non si cerca niente nella città
  const COTTE = () => typeof Tasselli !== 'undefined' && Tasselli.deciso && Tasselli.attivo() && !!Tasselli.insegne4;
  if (typeof THREE !== 'undefined' && THREE.BufferAttribute) { const o0 = THREE.BufferAttribute.prototype.onUpload;
    THREE.BufferAttribute.prototype.onUpload = function (cb) { return o0.call(this, function () { if (liberaOk || COTTE()) return cb.apply(this, arguments); RIT.push([this, cb]); }); }; }
  const libera = () => { requestAnimationFrame(() => requestAnimationFrame(() => { liberaOk = true; RIT.splice(0).forEach(([a, cb]) => { try { cb.call(a); } catch (e) { } }); STATO.liberati = (STATO.liberati || 0) + 1; })); };
  // ---- prima della città: la tavola di serie non nasce (la scritta di serie si spegne dopo, la sua tavola qui) ----
  if (typeof Arredo3D !== 'undefined' && Arredo3D && Arredo3D.T && Arredo3D.T.insegna_tavola) Arredo3D.T.insegna_tavola = () => { const g = new THREE.Group(); g.userData.aMuro = true; return g; };

  // ---- la tavolozza unica (BIBBIA_STILE §1); mai vermiglio, limone, allarme ----
  const P = { carta: '#F2E7CF', osso: '#D2C2A6', sasso: '#A89C92', lilla: '#A68FB6', piombo: '#7C7186', lavagna: '#3D3548', nero: '#16121B', pesca: '#F0BE8C',
    ocra: '#DC9A34', cotto: '#C25B36', mattone: '#6F2B2E', cielo: '#A3D4D8', acqua: '#2A8A8A', oltremare: '#2F60B5', notte: '#202D5E', salvia: '#93B27C',
    persiana: '#3F8A50', bosco: '#34532F', rosa: '#E04B8C', viola: '#6B3D9B' };
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hx = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hx(A.map((v, i) => v + (B[i] - v) * t)); };
  const rgba = (h, a) => { const A = rgb(h); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
  const RUGGINE = ['#7a3a22', '#8e4a26', '#a35a2c', '#5e2a1e'], LEGNO = ['#8a6446', '#76563c', '#9a7452'];
  // gli schemi: fondo, scritta, contorno/ombra, accento
  const SCH = {
    farmacia: [['persiana', 'carta', 'bosco', 'salvia'], ['carta', 'persiana', 'bosco', 'cotto'], ['bosco', 'osso', 'nero', 'salvia']],
    pesce: [['acqua', 'carta', 'notte', 'cielo'], ['cielo', 'notte', 'oltremare', 'cotto'], ['oltremare', 'carta', 'notte', 'cielo']],
    carne: [['mattone', 'carta', 'nero', 'cotto'], ['carta', 'mattone', 'nero', 'cotto']],
    latte: [['cielo', 'oltremare', 'notte', 'carta'], ['carta', 'oltremare', 'notte', 'cielo']],
    frutta: [['salvia', 'bosco', 'nero', 'cotto'], ['persiana', 'carta', 'bosco', 'ocra'], ['ocra', 'bosco', 'nero', 'cotto']],
    pane: [['ocra', 'mattone', 'nero', 'carta'], ['pesca', 'mattone', 'nero', 'cotto']],
    vino: [['mattone', 'pesca', 'nero', 'ocra'], ['bosco', 'ocra', 'nero', 'cotto'], ['lavagna', 'ocra', 'nero', 'cotto']],
    tabacchi: [['notte', 'carta', 'nero', 'ocra'], ['oltremare', 'carta', 'notte', 'ocra']],
    bar: [['oltremare', 'carta', 'notte', 'ocra'], ['mattone', 'carta', 'nero', 'rosa'], ['nero', 'pesca', 'lavagna', 'rosa'], ['acqua', 'carta', 'notte', 'ocra']],
    barbiere: [['carta', 'oltremare', 'notte', 'cotto'], ['oltremare', 'carta', 'notte', 'cotto']],
    gen: [['oltremare', 'carta', 'notte', 'ocra'], ['mattone', 'pesca', 'nero', 'ocra'], ['bosco', 'osso', 'nero', 'ocra'], ['carta', 'cotto', 'mattone', 'oltremare'],
      ['ocra', 'mattone', 'nero', 'carta'], ['notte', 'ocra', 'nero', 'cielo'], ['acqua', 'carta', 'notte', 'rosa'], ['lavagna', 'ocra', 'nero', 'rosa'], ['osso', 'oltremare', 'notte', 'cotto'],
      ['viola', 'pesca', 'nero', 'cielo'], ['cotto', 'carta', 'mattone', 'notte'], ['persiana', 'carta', 'bosco', 'ocra'], ['pesca', 'notte', 'nero', 'cotto'], ['lilla', 'notte', 'nero', 'carta']]
  };
  const TRADE = { bar: 'bar', sirena: 'bar', farmacia: 'farmacia', ambulatorio: 'farmacia', tabacchi: 'tabacchi', pescheria: 'pesce', macelleria: 'carne', latteria: 'latte',
    fruttivendolo: 'frutta', wu: 'frutta', panetteria: 'pane', trattoria: 'vino', osteria: 'vino', osteria_sg: 'vino', car_2: 'vino', pub: 'vino', barbiere: 'barbiere', drogheria: 'pane' };
  const NEON_ID = { cinema: 1, disco: 1, flipper: 1, video: 1, miramare: 1, flamingo: 1, paradiso: 1, oceano: 1, sirena: 1, gelateria: 1, bar: 1, teatro: 1 };
  const NEONC = { rosa: '#ff5c9e', cielo: '#a8f0f4', ocra: '#ffb648', salvia: '#a8f08a', lilla: '#c8a8ff', carta: '#fff0d8', cotto: '#ff7a4a' };
  const SECONDA = { bar: ['CAFFÈ · LIQUORI', 'PASTE · GELATI', 'APERITIVI', 'TAVOLA CALDA'], vino: ['CUCINA CASALINGA', 'VINI SFUSI', 'PESCE FRESCO'], farmacia: ['NOTTURNO', 'DROGHE · PROFUMI'],
    pesce: ['PESCATO DEL GIORNO'], latte: ['BURRO · FORMAGGI'], pane: ['FORNO A LEGNA', 'PASTE SECCHE'], frutta: ['PRIMIZIE'], tabacchi: ['SALI E TABACCHI', 'VALORI BOLLATI'],
    barbiere: ['UOMO · BARBA'], gen: ['DAL 1951', 'DAL 1964', 'DAL 1938', 'TEL. 2 41', 'TEL. 3 07', 'PREMIATA DITTA', 'INGROSSO · DETTAGLIO'] };
  const SHORT_ID = { bar: 'BAR', sirena: 'BAR', osteria: 'VINI', osteria_sg: 'VINI', car_2: 'CUCINA', wu: 'DROGHERIA', ambulatorio: 'MEDICO', cultura: 'CULTURA', flipper: 'GIOCHI',
    cinema: 'CINEMA', video: 'VIDEO', miramare: 'MIRAMARE', flamingo: 'FLAMINGO', paradiso: 'PARADISO', oceano: 'OCEANO', gabbiano: 'ALBERGO', disco: 'LUNA', benzina: 'BENZINA',
    officina: 'MOTO', gelateria: 'GELATI', chiosco: 'BAGNI', commissariato: 'GUARDIA' };
  const SHORT_USE = { teatro: 'TEATRO', palestra: 'SPORT', ferramenta: 'UTENSILI', barbiere: 'BARBIERE', tabacchi: 'TABACCHI', panetteria: 'PANE', farmacia: 'FARMACIA', lavanderia: 'LAVASECCO',
    tipografia: 'STAMPA', circolo: 'CIRCOLO', sartoria: 'SARTO', pescheria: 'PESCE', autorimessa: 'GARAGE', armeria: 'CACCIA', abbigliamento: 'MODA', pub: 'BIRRA', supermercato: 'SPESA', alimentari: 'ALIMENTI' };
  const SERIF = 'Georgia, "DejaVu Serif", "Liberation Serif", "Times New Roman", serif', SANS = '"Arial Black", "DejaVu Sans", "Liberation Sans", Arial, sans-serif';
  // i caratteri per materia: [famiglia, peso, minuscole ammesse]
  const FONT = {
    smalto: [['GFShrikhand', '400', 1], ['GFCarterOne', '400', 1], ['GFTitanOne', '400', 0], [SERIF, '700', 0], ['GFBungee', '400', 0], ['GFRanchers', '400', 0], ['GFLondrinaSolid', '900', 0]],
    legno: [['GFKavoon', '400', 1], ['GFChewy', '400', 1], [SERIF, 'italic 700', 1], ['GFShrikhand', '400', 1], ['GFCarterOne', '400', 1], ['GFLuckiestGuy', '400', 0], ['GFKnewave', '400', 1]],
    cassonetto: [['GFBungee', '400', 0], ['GFTitanOne', '400', 0], ['GFRanchers', '400', 0], [SANS, '900', 0], ['GFLondrinaSolid', '900', 0], ['GFBangers', '400', 0]],
    muro: [[SERIF, '700', 0], ['GFShrikhand', '400', 1], ['GFCarterOne', '400', 1], ['GFKavoon', '400', 1], ['GFLondrinaSolid', '900', 0], ['GFRanchers', '400', 0], ['GFRubikWetPaint', '400', 0]],
    neon: [['GFKnewave', '400', 1], ['GFShrikhand', '400', 1], ['GFMarckScript', '400', 1], ['GFBungee', '400', 0], ['GFChewy', '400', 1], ['GFPermanentMarker', '400', 0]],
    piccolo: [[SERIF, '700', 0], ['GFBungee', '400', 0], [SANS, '700', 0], ['GFMarckScript', '400', 1], ['GFCarterOne', '400', 1]]
  };

  // ---- il caso: per insegna un seme, sempre lo stesso ----
  const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const h01 = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const titolo = s => s.toLowerCase().replace(/(^|[\s'’.])([a-zàèéìòù])/g, (m, a, b) => a + b.toUpperCase());

  // =====================================================================================================================================
  // LA TELA: un atlante 2048² per tutte le facce dipinte, a scaffali; la densità (px per metro) si stringe finché ci sta tutto
  // =====================================================================================================================================
  const AW = 2048, AH = 2048, PAD = 6;
  function impacca(items) {
    let D = 150;
    for (let it = 0; it < 30; it++, D *= .93) {
      let x = PAD, y = PAD, rh = 0, ok = true;
      const L = items.map(c => ({ c, w: Math.max(16, Math.round(c.wm * D * (c.dens || 1))), h: Math.max(12, Math.round(c.hm * D * (c.dens || 1))) })).sort((a, b) => b.h - a.h);
      for (const q of L) { if (q.w > AW - 2 * PAD) { ok = false; break; } if (x + q.w + PAD > AW) { x = PAD; y += rh + PAD; rh = 0; } if (y + q.h + PAD > AH) { ok = false; break; } q.c.x = x; q.c.y = y; q.c.w = q.w; q.c.h = q.h; x += q.w + PAD; rh = Math.max(rh, q.h); }
      if (ok) return D;
    }
    return D;
  }

  // ---- le lettere: il contorno, l'ombra portata a blocco, lo smusso, la mano che trema, l'arco ----
  function scrivi(x, text, bx, by, bw, bh, L, r) {
    const chars = Array.from(text); if (!chars.length) return null;
    const fnt = s => `${L.w8} ${s}px ${L.font}`; x.font = fnt(100);
    const tr = (L.track || 0) * 100, wd = chars.map(ch => ch === ' ' ? x.measureText(' ').width * .9 : x.measureText(ch).width), tot = wd.reduce((a, b) => a + b, 0) + tr * (chars.length - 1);
    const capH = L.capH || .74, s = Math.min(bh / capH, bw / tot * 100) * (L.sc || 1); if (!(s > 2)) return null;
    x.font = fnt(s); x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.lineJoin = 'round';
    const k = s / 100, W = tot * k, y0 = by + bh / 2 + s * capH / 2, x0 = bx + (bw - W) / 2, R = L.arc ? bw * L.arc : 0, sag = R ? R * (1 - Math.cos(W / 2 / R)) : 0;
    const pos = []; let px = x0; const J = L.jit === undefined ? 1 : L.jit;
    chars.forEach((ch, i) => { const w = wd[i] * k, cx = px + w / 2; let yy = y0, rot = (r() - .5) * .06 * J;
      if (R) { const a = (cx - (x0 + W / 2)) / R; yy = y0 + R * (1 - Math.cos(a)) - sag / 2; rot += a; }
      pos.push({ ch, cx, y: yy + (r() - .5) * s * .05 * J, rot, sx: 1 + (r() - .5) * .05 * J, w }); px += w + tr * k; });
    const eachOn = (c2, ox, oy, fn) => pos.forEach(p => { if (p.ch === ' ') return; c2.save(); c2.translate(p.cx - ox, p.y - oy); c2.rotate(p.rot); if (L.slant) c2.transform(1, 0, -L.slant, 1, 0, 0); c2.scale(p.sx, 1); fn(p, c2); c2.restore(); });
    const each = fn => eachOn(x, 0, 0, fn);
    const draw = (p, dx, dy, mode, c2) => { c2 = c2 || x; if (mode === 's') c2.strokeText(p.ch, -p.w / 2 + dx, dy); else c2.fillText(p.ch, -p.w / 2 + dx, dy); };
    if (L.shade) { const D = Math.max(1, Math.round(s * (L.shadeD || .07))); x.fillStyle = L.shade; each(p => { for (let d = 1; d <= D; d++) draw(p, d * .8, d); }); }
    if (L.out) { x.strokeStyle = L.out; x.lineWidth = Math.max(1.5, s * (L.outW || .09)); each(p => draw(p, 0, 0, 's')); }
    if (L.lo) { x.fillStyle = L.lo; each(p => draw(p, s * .022, s * .022)); }
    if (L.hi) { x.fillStyle = L.hi; each(p => draw(p, -s * .02, -s * .02)); }
    { const tx0 = Math.floor(x0 - s * .4), ty0 = Math.floor(Math.min(...pos.map(p => p.y)) - s * 1.15), tw = Math.ceil(W + s * .8), th = Math.ceil(Math.max(...pos.map(p => p.y)) - ty0 + s * .4);
      const T2 = scrivi.T || (scrivi.T = document.createElement('canvas')); if (T2.width < tw || T2.height < th) { T2.width = Math.max(T2.width, tw); T2.height = Math.max(T2.height, th); }
      const t = T2.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, T2.width, T2.height); t.font = x.font; t.textBaseline = 'alphabetic'; t.textAlign = 'left';
      t.fillStyle = L.ink; eachOn(t, tx0, ty0, p => draw(p, 0, 0, 'f', t));
      if (L.luce !== false) { t.globalCompositeOperation = 'source-atop'; const yb = y0 - ty0, yt = yb - s * capH, g = t.createLinearGradient(0, yt, 0, yb);
        g.addColorStop(0, L.grad || mix(L.ink, P.carta, .35)); g.addColorStop(.42, L.ink); g.addColorStop(.58, L.ink); g.addColorStop(1, mix(L.ink, P.nero, .3)); t.fillStyle = g; t.fillRect(0, 0, tw, th);
        t.strokeStyle = rgba(P.carta, .55); t.lineWidth = Math.max(1, s * .035); t.lineCap = 'round'; for (let gx = s * .3; gx < tw; gx += s * (1.4 + r() * 1.2)) { t.beginPath(); t.moveTo(gx, yt + s * .12); t.lineTo(gx + s * .14, yt + s * .02); t.stroke(); }   // i riflessi del fumetto: una lineetta chiara in alto
        t.globalCompositeOperation = 'source-over'; }
      x.drawImage(T2, 0, 0, tw, th, tx0, ty0, tw, th); }
    if (L.line) { x.fillStyle = L.ink; x.fillRect(x0, y0 + s * .1, W, Math.max(1, s * .045)); }
    return { x0, x1: x0 + W, y0: y0 - s * capH, y1: y0, s, pos };
  }

  // ---- le icone dipinte (semplici, al pennello) ----
  function icona(x, kind, cx, cy, s, col, out) {
    x.save(); x.translate(cx, cy); x.fillStyle = col; x.strokeStyle = out; x.lineWidth = Math.max(1.5, s * .1); x.lineJoin = 'round';
    const P2 = () => { x.stroke(); x.fill(); };
    if (kind === 'croce') { x.beginPath(); const a = s * .2, b = s * .5; x.moveTo(-a, -b); x.lineTo(a, -b); x.lineTo(a, -a); x.lineTo(b, -a); x.lineTo(b, a); x.lineTo(a, a); x.lineTo(a, b); x.lineTo(-a, b); x.lineTo(-a, a); x.lineTo(-b, a); x.lineTo(-b, -a); x.lineTo(-a, -a); x.closePath(); P2(); }
    else if (kind === 'pesce') { x.beginPath(); x.ellipse(-s * .05, 0, s * .38, s * .2, 0, 0, 7); x.moveTo(s * .3, 0); x.lineTo(s * .5, -s * .2); x.lineTo(s * .5, s * .2); x.closePath(); P2(); x.fillStyle = out; x.beginPath(); x.arc(-s * .28, -s * .04, s * .04, 0, 7); x.fill(); }
    else if (kind === 'tazza') { x.beginPath(); x.moveTo(-s * .3, -s * .15); x.lineTo(s * .25, -s * .15); x.lineTo(s * .18, s * .25); x.lineTo(-s * .23, s * .25); x.closePath(); P2(); x.beginPath(); x.arc(s * .3, 0, s * .1, -1.4, 1.4); x.stroke(); x.beginPath(); x.moveTo(-s * .45, s * .32); x.lineTo(s * .4, s * .32); x.stroke(); }
    else if (kind === 'calice') { x.beginPath(); x.moveTo(-s * .25, -s * .4); x.lineTo(s * .25, -s * .4); x.quadraticCurveTo(s * .25, 0, 0, s * .05); x.quadraticCurveTo(-s * .25, 0, -s * .25, -s * .4); P2(); x.beginPath(); x.moveTo(0, s * .05); x.lineTo(0, s * .38); x.moveTo(-s * .18, s * .4); x.lineTo(s * .18, s * .4); x.stroke(); }
    else if (kind === 'forbici') { x.beginPath(); x.arc(-s * .18, s * .25, s * .12, 0, 7); x.moveTo(s * .3, s * .25); x.arc(s * .18, s * .25, s * .12, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-s * .1, s * .15); x.lineTo(s * .2, -s * .45); x.moveTo(s * .1, s * .15); x.lineTo(-s * .2, -s * .45); x.stroke(); }
    else if (kind === 'stella') { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * .2 : s * .48; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); P2(); }
    else if (kind === 'pane') { x.beginPath(); x.ellipse(0, 0, s * .45, s * .24, 0, 0, 7); P2(); x.beginPath(); for (let i = -1; i <= 1; i++) { x.moveTo(i * s * .15 - s * .06, -s * .12); x.lineTo(i * s * .15 + s * .06, s * .12); } x.strokeStyle = out; x.stroke(); }
    else { x.beginPath(); x.moveTo(0, -s * .45); x.lineTo(s * .3, 0); x.lineTo(0, s * .45); x.lineTo(-s * .3, 0); x.closePath(); P2(); }
    x.restore();
  }

  // ---- l'usura: la grana, le pennellate, il sole, le sbeccature, la ruggine che cola, le gocce, lo sporco, le crepe ----
  function grana(x, W, H, r, a) {
    x.save(); x.globalCompositeOperation = 'source-atop';
    for (let i = 0, n = W * H / 60; i < n; i++) { x.fillStyle = r() < .5 ? `rgba(255,248,230,${a * r()})` : `rgba(20,14,24,${a * r()})`; x.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 1.5); }
    for (let i = 0, n = H / 2; i < n; i++) { x.fillStyle = r() < .5 ? `rgba(255,250,235,${a * .5})` : `rgba(0,0,0,${a * .45})`; const y = r() * H; x.fillRect(r() * W * .3, y, W * (.3 + r() * .7), .6 + r() * 1.4); }   // le pennellate in orizzontale
    x.restore();
  }
  function sole(x, W, H, r, k) {   // il sole sbiadisce: una macchia larga dall'alto, verso la carta e meno colore
    x.save(); x.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 3; i++) { const cx = r() * W, cy = -H * .2 + r() * H * .5, rr = (.4 + r() * .6) * Math.max(W * .5, H); const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, rgba(P.carta, .5 * k)); g.addColorStop(.6, rgba(P.carta, .18 * k)); g.addColorStop(1, rgba(P.carta, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.globalCompositeOperation = 'saturation'; const g2 = x.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, `rgba(128,128,128,${.45 * k})`); g2.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
    x.restore();
  }
  function blob(x, cx, cy, rr, r) { x.beginPath(); const n = 6 + Math.floor(r() * 5); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, q = rr * (.45 + r() * .75); x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * (.6 + r() * .6)); } x.closePath(); }
  function sbecca(x, W, H, r, n, fondo, bordo, cut) {   // le sbeccature: più sui bordi e negli angoli; sotto la lamiera, il legno o l'intonaco
    x.save();
    for (let i = 0; i < n; i++) { const e = r(); let cx, cy; if (e < .65) { const s = Math.floor(r() * 4); cx = s === 0 ? r() * W * .06 : s === 1 ? W - r() * W * .06 : r() * W; cy = s === 2 ? r() * H * .1 : s === 3 ? H - r() * H * .1 : r() * H; } else { cx = r() * W; cy = r() * H; }
      const rr = (e < .65 ? 1 + r() * r() * 5 : .8 + r() * r() * 3) * Math.max(.8, H / 110);
      if (cut) { x.globalCompositeOperation = 'destination-out'; blob(x, cx, cy, rr, r); x.fill(); x.globalCompositeOperation = 'source-over'; continue; }
      x.globalCompositeOperation = 'source-atop'; blob(x, cx, cy, rr, r); x.fillStyle = fondo; x.fill(); x.strokeStyle = bordo; x.lineWidth = 1; x.stroke(); }
    x.restore();
  }
  function cola(x, sx, sy, len, w, col, a, r) {   // una colatura di ruggine: dalla testa scura giù a sfumare, un poco storta
    const g = x.createLinearGradient(0, sy, 0, sy + len); g.addColorStop(0, rgba(col, a)); g.addColorStop(.35, rgba(col, a * .6)); g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g; x.lineCap = 'round'; x.lineWidth = w; x.beginPath(); x.moveTo(sx, sy); let px = sx; const st = 6; for (let y = sy; y <= sy + len; y += st) { px += (r() - .5) * w * .7; x.lineTo(px, y); } x.stroke();
  }
  function ruggine(x, W, H, r, fonti, k) {
    x.save(); x.globalCompositeOperation = 'source-atop';
    fonti.forEach(([fx, fy]) => { const col = pick(r, RUGGINE), sx = fx * W, sy = fy * H; const g = x.createRadialGradient(sx, sy, 0, sx, sy, H * .11); g.addColorStop(0, rgba(col, .9 * k)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(sx - H * .1, sy - H * .1, H * .2, H * .2);
      const n = 2 + Math.floor(r() * 3 * k + .5); for (let i = 0; i < n; i++) cola(x, sx + (r() - .5) * H * .05, sy, H * (.25 + r() * .7) * k, 1.5 + r() * H * .03, col, .8 * k, r); });
    for (let i = 0, n = Math.floor(W / 45 * k); i < n; i++) cola(x, r() * W, r() * H * .06, H * (.12 + r() * .5), 1 + r() * H * .02, pick(r, RUGGINE), .5 * k, r);   // dal bordo di sopra
    x.restore();
  }
  function sporco(x, W, H, r, k) {
    x.save(); x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, H, 0, H * .55); g.addColorStop(0, rgba(P.nero, .55 * k)); g.addColorStop(1, rgba(P.nero, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 14 * k; i++) { const cx = r() * W, cy = H * (.75 + r() * .3), rr = H * (.05 + r() * .15); const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g2.addColorStop(0, rgba(P.lavagna, .22 * k)); g2.addColorStop(1, rgba(P.lavagna, 0)); x.fillStyle = g2; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
    const g3 = x.createLinearGradient(0, 0, 0, H * .08); g3.addColorStop(0, rgba(P.nero, .3 * k)); g3.addColorStop(1, rgba(P.nero, 0)); x.fillStyle = g3; x.fillRect(0, 0, W, H * .08);   // la polvere sotto il bordo
    x.restore();
  }
  function graffi(x, W, H, r, n) { x.save(); x.globalCompositeOperation = 'source-atop'; x.lineWidth = 1; for (let i = 0; i < n; i++) { const px = r() * W, py = r() * H, a = (r() - .5) * .8, L = H * (.1 + r() * .4); x.strokeStyle = r() < .6 ? 'rgba(242,231,207,.35)' : 'rgba(22,18,27,.3)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); } x.restore(); }
  function crepe(x, W, H, r, n, a) { x.save(); x.globalCompositeOperation = 'source-atop'; x.strokeStyle = `rgba(22,18,27,${a})`; x.lineWidth = 1;
    for (let i = 0; i < n; i++) { let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (r() - .5) * H * .25; py += (r() - .3) * H * .12; x.lineTo(px, py); } x.stroke(); } x.restore(); }
  function gocce(x, x0, x1, y, col, n, len, r) {   // la vernice che è colata dalle lettere
    x.save(); x.fillStyle = col; x.strokeStyle = col;
    for (let i = 0; i < n; i++) { const sx = x0 + r() * (x1 - x0), l = len * (.3 + r()), w = 1.2 + r() * 2.5; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(sx, y - 2); x.lineTo(sx + (r() - .5) * 2, y + l); x.stroke(); x.beginPath(); x.arc(sx, y + l, w * .9, 0, 7); x.fill(); }
    x.restore();
  }
  function rrPath(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.lineTo(X + W - R, Y); x.quadraticCurveTo(X + W, Y, X + W, Y + R); x.lineTo(X + W, Y + H - R); x.quadraticCurveTo(X + W, Y + H, X + W - R, Y + H); x.lineTo(X + R, Y + H); x.quadraticCurveTo(X, Y + H, X, Y + H - R); x.lineTo(X, Y + R); x.quadraticCurveTo(X, Y, X + R, Y); x.closePath(); }

  // =====================================================================================================================================
  // LE FACCE DIPINTE (S: la scheda dell'insegna; c: la casella nella tela)
  // =====================================================================================================================================
  function dipingi(x, c, S) {
    const W = c.w, H = c.h, r = rng(S.seed * 7 + 3), C = S.col, wear = S.wear;
    x.save(); x.beginPath(); x.rect(c.x - 2, c.y - 2, W + 4, H + 4); x.clip(); x.translate(c.x, c.y);
    const fondo = P[C[0]], ink = P[C[1]], ombra = P[C[2]], acc = P[C[3]], m = S.mat;
    // ---- il fondo ----
    if (m === 'muro') {   // il riquadro dipinto sull'intonaco: bordi a pennello, mai dritti
      x.fillStyle = rgba(mix(fondo, P.osso, .22), .9); x.beginPath(); const st = 7; for (let px = 0; px <= W; px += st) x.lineTo(px, H * .04 + r() * H * .05); for (let py = 0; py <= H; py += st) x.lineTo(W - r() * W * .012, py); for (let px = W; px >= 0; px -= st) x.lineTo(px, H * .96 - r() * H * .05); for (let py = H; py >= 0; py -= st) x.lineTo(r() * W * .012, py); x.closePath(); x.fill();
      if (r() < .7) { x.globalAlpha = .11; scrivi(x, pick(r, ['VINI', 'OLIO', 'SAPONI', 'CAFFÈ', 'COLONIALI', 'CHINOTTO', 'LIQUORI']), W * .05, H * .12, W * .9, H * .7, { font: SERIF, w8: '700', ink: mix(ink, fondo, .3), track: .3, jit: .3 }, r); x.globalAlpha = 1; }   // la scritta di prima, sotto, quasi sparita
    } else if (m === 'cassonetto') {
      x.fillStyle = fondo; x.fillRect(0, 0, W, H);
      const nt = Math.max(2, Math.round(W / H * .9)); for (let i = 0; i < nt; i++) { const cx = (i + .5) / nt * W, g = x.createLinearGradient(cx - W / nt / 2, 0, cx + W / nt / 2, 0); g.addColorStop(0, rgba(P.nero, .1)); g.addColorStop(.5, 'rgba(255,255,240,.16)'); g.addColorStop(1, rgba(P.nero, .1)); x.fillStyle = g; x.fillRect(cx - W / nt / 2, 0, W / nt, H); }   // i tubi dentro che si vedono
      x.fillStyle = rgba(ombra, .9); x.fillRect(0, 0, W, H * .07); x.fillRect(0, H * .93, W, H * .07);
    } else {
      x.fillStyle = fondo; x.fillRect(0, 0, W, H);
      if (m === 'legno') { const np = 2 + Math.floor(r() * 3); for (let i = 1; i < np; i++) { const y = i / np * H; x.fillStyle = rgba(P.nero, .5); x.fillRect(0, y - 1, W, 2.2); x.fillStyle = 'rgba(255,240,220,.12)'; x.fillRect(0, y + 1.2, W, 1); }
        x.strokeStyle = rgba(P.nero, .1); x.lineWidth = 1; for (let i = 0; i < H / 3; i++) { const y = r() * H; x.beginPath(); x.moveTo(0, y); for (let px = 0; px < W; px += 20) x.lineTo(px, y + Math.sin(px * .02 + i) * 2.5); x.stroke(); } }   // le venature sotto la vernice
      else { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,245,.14)'); g.addColorStop(.5, 'rgba(255,255,245,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }   // lo smalto lucido
      // il filetto: due righe, gli angoli a ricciolo o tagliati
      const ins = Math.min(W, H) * .1, rad = S.ang === 'tondo' ? H * .14 : 0; x.strokeStyle = acc; x.lineWidth = Math.max(2, H * .035); rrPath(x, ins, ins, W - 2 * ins, H - 2 * ins, rad); x.stroke();
      x.lineWidth = Math.max(1, H * .012); x.strokeStyle = rgba(ink, .7); rrPath(x, ins * 1.6, ins * 1.6, W - 3.2 * ins, H - 3.2 * ins, rad * .7); x.stroke();
      if (S.ang === 'ricciolo') [[ins * 1.6, ins * 1.6, 1, 1], [W - ins * 1.6, ins * 1.6, -1, 1], [ins * 1.6, H - ins * 1.6, 1, -1], [W - ins * 1.6, H - ins * 1.6, -1, -1]].forEach(([px, py, sx, sy]) => { x.beginPath(); x.lineWidth = Math.max(1.5, H * .02); x.strokeStyle = acc; x.arc(px + sx * H * .06, py + sy * H * .06, H * .045, 0, 5.2); x.stroke(); });
    }
    if (m === 'neon') {   // il pannello del neon: lamiera scura, i bordi battuti, sotto i tubi la parola dipinta (di giorno si legge quella)
      x.fillStyle = rgba(P.nero, .25); x.fillRect(0, 0, W, H * .05); x.fillRect(0, H * .95, W, H * .05);
    }
    // ---- l'usura (prima della scritta: la scritta resta leggibile) ----
    grana(x, W, H, r, m === 'cassonetto' ? .05 : .09);
    if (S.sole) sole(x, W, H, r, m === 'muro' ? S.sole * .45 : S.sole);
    if (m === 'muro') { sbecca(x, W, H, r, Math.floor(30 + wear * 70), null, null, true); }
    else if (m === 'smalto' || m === 'neon') { sbecca(x, W, H, r, Math.floor(m === 'neon' ? 8 + wear * 22 : 25 + wear * 70), m === 'neon' ? pick(r, RUGGINE) : P.nero, rgba(P.nero, .5)); crepe(x, W, H, r, Math.floor(wear * 5), .35); }
    else if (m === 'legno') { sbecca(x, W, H, r, Math.floor(16 + wear * 50), pick(r, LEGNO), rgba(P.nero, .4)); crepe(x, W, H, r, Math.floor(2 + wear * 8), .3); }
    else { sbecca(x, W, H, r, Math.floor(wear * 8), P.osso, rgba(P.nero, .3)); }
    if (m !== 'muro' && m !== 'cassonetto') { ruggine(x, W, H, r, S.bulloni || [], .55 + wear * .45); graffi(x, W, H, r, Math.floor(4 + wear * 14)); }
    if (m === 'cassonetto') { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba(P.nero, .55); for (let i = 0; i < 18 * wear; i++) { x.beginPath(); x.arc(W * (.1 + r() * .8), H * (.86 + r() * .05), 1 + r() * 2, 0, 7); x.fill(); } x.restore(); }   // le mosche morte sul fondo del cassonetto
    // ---- la scritta ----
    if (m === 'neon' && S.ne) {
      const NE = S.ne, sc = Math.min(S.W0 * .86 / NE.gw, S.H0 * .8 / NE.gh), ox = -(NE.gx0 + NE.gx1) / 2, oy = -(NE.gy0 + NE.gy1) / 2, tp = ([a, b]) => [((a + ox) * sc / S.FW + .5) * W, (.5 - (b + oy) * sc / S.FH) * H], tw = .016 * W / S.FW;
      x.lineCap = 'round'; x.lineJoin = 'round';
      [[tw * 6.5, rgba(P.nero, .55)], [tw * 4.6, mix(fondo, ink, .3)], [tw * 2.2, rgba(mix(fondo, P.carta, .4), .5)]].forEach(([lw, st]) => { x.lineWidth = lw; x.strokeStyle = st; NE.paths.forEach(pp => { x.beginPath(); pp.pts.forEach((q, i) => { const [px, py] = tp(q); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); }); });
    }
    const TX = m === 'neon' ? '' : S.testo, sec = m === 'neon' ? null : S.seconda, iconaK = m === 'neon' ? null : S.icona;
    let lx0 = W * .05, lx1 = W * .95; if (iconaK && W / H > 3.4) { lx0 = W * .05 + H * .52; lx1 = W * .95 - H * .52; [W * .05 + H * .24, W * .95 - H * .24].forEach(px => icona(x, iconaK, px, H * .5, H * .36, iconaK === 'croce' ? (S.col[0] === 'carta' ? P.persiana : P.carta) : acc, ombra)); }
    const L = { font: S.font[0], w8: S.font[1], ink: m === 'neon' ? mix(fondo, ink, .38) : ink, out: m === 'neon' ? null : S.contornoC, outW: .085, shade: m === 'neon' || m === 'muro' && r() < .4 ? null : rgba(ombra, .85), shadeD: .05 + r() * .05,
      hi: m === 'smalto' || m === 'legno' ? rgba(P.carta, .55) : null, lo: m === 'smalto' ? rgba(P.nero, .35) : null, grad: S.grad ? mix(ink, acc, .45) : null, slant: S.slant, arc: S.arco, track: S.track, jit: m === 'cassonetto' ? .25 : 1, line: S.sotto };
    if (!TX) { }
    else if (S.vert) {   // le lettere una sotto l'altra (la bandiera verticale)
      const ch = Array.from(TX.replace(/ /g, '')), sl = (H * .94) / ch.length; ch.forEach((q, i) => scrivi(x, q, W * .06, H * .03 + i * sl + sl * .04, W * .88, sl * .92, Object.assign({}, L, { arc: 0, jit: .6 }), r));
    } else if (sec && H / W > .12) {
      const top = S.secSopra, mh = H * .6, sh = H * .14;
      const ym = top ? H * .3 : H * .08, ys = top ? H * .1 : H * .74;
      scrivi(x, TX, lx0, ym, lx1 - lx0, mh, L, r);
      const Fp = S.font2; const t2 = scrivi(x, sec, lx0 + (lx1 - lx0) * .15, ys, (lx1 - lx0) * .7, sh, { font: Fp[0], w8: Fp[1], ink: m === 'neon' ? mix(fondo, acc, .5) : acc, track: Fp[2] ? 0 : .12, jit: .5, shade: m === 'neon' ? null : rgba(ombra, .6), shadeD: .04 }, r);
      if (t2 && m !== 'muro') { x.fillStyle = acc; x.fillRect(lx0 + (lx1 - lx0) * .06, ys + sh * .45, t2.x0 - (lx0 + (lx1 - lx0) * .06) - sh * .4, Math.max(1, sh * .08)); x.fillRect(t2.x1 + sh * .4, ys + sh * .45, lx0 + (lx1 - lx0) * .94 - t2.x1 - sh * .4, Math.max(1, sh * .08)); }
    } else {
      const sec2 = sec && H / W <= .12; const t = scrivi(x, TX, lx0, H * .1, (lx1 - lx0) * (sec2 ? .74 : 1), H * .8, L, r);
      if (sec2 && t) { const Fp = S.font2; scrivi(x, sec, t.x1 + H * .3, H * .3, lx1 - t.x1 - H * .3, H * .4, { font: Fp[0], w8: Fp[1], ink: acc, jit: .5 }, r); }
    }
    if (m === 'muro' && wear > .3) { x.save(); x.globalCompositeOperation = 'source-over'; gocce(x, W * .1, W * .9, H * .8, rgba(ink, .85), Math.floor(4 + wear * 8), H * .25, r); x.restore(); }
    // ---- l'usura sopra la scritta: leggera, non mangia le lettere ----
    grana(x, W, H, r, .04);
    if (m === 'muro') sbecca(x, W, H, r, Math.floor(6 + wear * 10), null, null, true); else if (m !== 'cassonetto') sbecca(x, W, H, r, Math.floor(3 + wear * 7), m === 'legno' ? pick(r, LEGNO) : P.nero, rgba(P.nero, .4));
    sporco(x, W, H, r, m === 'muro' ? wear * .35 : .3 + wear * .3);
    if (m !== 'muro') { x.strokeStyle = rgba(P.nero, .5); x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2); }
    x.restore();
  }
  // la T dei tabacchi, la croce, il palo del barbiere: caselle piccole
  function dipingiT(x, c, S) { const W = c.w, H = c.h, r = rng(S.seed + 91); x.save(); x.beginPath(); x.rect(c.x - 2, c.y - 2, W + 4, H + 4); x.clip(); x.translate(c.x, c.y);
    x.fillStyle = P.notte; x.fillRect(0, 0, W, H); x.strokeStyle = P.carta; x.lineWidth = W * .04; x.strokeRect(W * .08, H * .08, W * .84, H * .84);
    scrivi(x, 'T', W * .15, H * .14, W * .7, H * .7, { font: SERIF, w8: '700', ink: P.carta, shade: rgba(P.nero, .7), shadeD: .05, jit: 0 }, r);
    grana(x, W, H, r, .05); sporco(x, W, H, r, .6); x.restore(); }
  function dipingiPalo(x, c) { const W = c.w, H = c.h; x.save(); x.beginPath(); x.rect(c.x, c.y, W, H); x.clip(); x.translate(c.x, c.y); x.fillStyle = P.carta; x.fillRect(0, 0, W, H);
    const cols = [P.cotto, P.carta, P.oltremare, P.carta]; for (let i = -8; i < 16; i++) { x.fillStyle = cols[((i % 4) + 4) % 4]; x.beginPath(); x.moveTo(i * W / 4, H); x.lineTo(i * W / 4 + W / 4, H); x.lineTo(i * W / 4 + W / 4 + W, 0); x.lineTo(i * W / 4 + W, 0); x.closePath(); x.fill(); } x.restore(); }
  // il bagliore del neon: le linee dei tubi larghe e morbide (a passate, senza filtro: va anche su Safari)
  function dipingiAlone(x, c, NE) { x.save(); x.beginPath(); x.rect(c.x, c.y, c.w, c.h); x.clip(); x.fillStyle = '#000'; x.fillRect(c.x, c.y, c.w, c.h);
    const sx = c.w * .8 / NE.gw, sy = c.h * .69 / NE.gh, ox = c.w * .1, oy = c.h * .155, u = Math.min(c.w * .8 / Math.max(1, NE.n), c.h * .69); x.translate(c.x, c.y); x.lineCap = 'round'; x.lineJoin = 'round';
    [[u * .42, .06], [u * .28, .08], [u * .17, .11], [u * .09, .16], [u * .04, .3]].forEach(([w, a]) => { x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = w;
      NE.paths.forEach(p => { x.beginPath(); p.pts.forEach((q, i) => { const px = ox + (q[0] - NE.gx0) * sx, py = oy + (NE.gy1 - q[1]) * sy; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); }); });
    x.restore(); }

  // =====================================================================================================================================
  // IL NEON: lo scheletro delle lettere (Zhang-Suen), seguito in linee, semplificato e lisciato
  // =====================================================================================================================================
  function scheletro(text, font, w8, vert) {
    const S = 60, cv = document.createElement('canvas'), x = cv.getContext('2d'); x.font = `${w8} ${S}px ${font}`;
    const chars = Array.from(text); let W, H, place = [];
    if (vert) { W = Math.ceil(S * 1.3); H = Math.ceil(chars.length * S * 1.05 + S * .4); chars.forEach((ch, i) => place.push({ ch, x: W / 2 - x.measureText(ch).width / 2, y: S * .2 + (i + 1) * S * 1.05 - S * .2 })); }
    else { const tw = x.measureText(text).width; W = Math.ceil(tw + S * .6); H = Math.ceil(S * 1.5); let px = S * .3; place.push({ ch: text, x: px, y: S * 1.12 }); }
    cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.font = `${w8} ${S}px ${font}`; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; place.forEach(p => g.fillText(p.ch, p.x, p.y));
    // i confini delle lettere (per lo sfarfallio lettera per lettera)
    const bounds = []; if (vert) chars.forEach((ch, i) => bounds.push(place[i].y - S * .9)); else { let px = S * .3; chars.forEach(ch => { bounds.push(px); px += g.measureText(ch).width; }); }
    const d = g.getImageData(0, 0, W, H).data, B = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) B[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    const at = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : B[yy * W + xx];
    for (let ch = 1, it = 0; ch && it < 40; it++) { ch = 0;
      for (let pass = 0; pass < 2; pass++) { const del = [];
        for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) { if (!B[yy * W + xx]) continue;
          const p2 = at(xx, yy - 1), p3 = at(xx + 1, yy - 1), p4 = at(xx + 1, yy), p5 = at(xx + 1, yy + 1), p6 = at(xx, yy + 1), p7 = at(xx - 1, yy + 1), p8 = at(xx - 1, yy), p9 = at(xx - 1, yy - 1);
          const bn = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9; if (bn < 2 || bn > 6) continue;
          const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2); if (A !== 1) continue;
          if (pass === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue; del.push(yy * W + xx); }
        del.forEach(i => { B[i] = 0; }); if (del.length) ch = 1; } }
    // seguire: dalle estremità vere fino a un incrocio, poi da ogni incrocio i tratti fra due incroci, poi gli anelli chiusi (la «o»)
    const N8 = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]], RING = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]], CNc = new Int8Array(W * H).fill(-1);
    const cnum = (xx, yy) => { const i = yy * W + xx; if (CNc[i] >= 0) return CNc[i]; let c = 0, nn = 0; for (let k = 0; k < 8; k++) { const a = at(xx + RING[k][0], yy + RING[k][1]), b = at(xx + RING[(k + 1) % 8][0], yy + RING[(k + 1) % 8][1]); nn += a; if (!a && b) c++; } return (CNc[i] = nn === 0 ? 0 : c); };
    const deg = (xx, yy) => cnum(xx, yy) === 1 ? 1 : 2, isJ = (xx, yy) => cnum(xx, yy) >= 3;
    const vis = new Uint8Array(W * H), paths = [];
    const step = (pts) => { for (;;) { const [xx, yy] = pts[pts.length - 1], pv = pts.length > 1 ? pts[pts.length - 2] : null; let nx = -1, ny = -1, jn = false;
        for (const [a, b] of N8) { const qx = xx + a, qy = yy + b; if (!at(qx, qy) || (pv && qx === pv[0] && qy === pv[1])) continue; const J = isJ(qx, qy); if (J && pts.length > 2 && qx === pts[0][0] && qy === pts[0][1]) { nx = qx; ny = qy; jn = true; break; } if (!vis[qy * W + qx] && !(J && pts.length < 2)) { nx = qx; ny = qy; jn = J; break; } }
        if (nx < 0) return; pts.push([nx, ny]); if (jn) return; vis[ny * W + nx] = 1; } };
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (B[yy * W + xx] && !vis[yy * W + xx] && deg(xx, yy) === 1) { vis[yy * W + xx] = 1; const p = [[xx, yy]]; step(p); const e = p[p.length - 1]; paths.push({ p, e0: true, e1: deg(e[0], e[1]) === 1 }); }
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (B[yy * W + xx] && isJ(xx, yy)) for (const [a, b] of N8) { const qx = xx + a, qy = yy + b; if (!at(qx, qy) || vis[qy * W + qx] || isJ(qx, qy)) continue; vis[qy * W + qx] = 1; const p = [[xx, yy], [qx, qy]]; step(p); const e = p[p.length - 1]; paths.push({ p, e0: false, e1: deg(e[0], e[1]) === 1 }); }
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (B[yy * W + xx] && !vis[yy * W + xx] && !isJ(xx, yy)) { vis[yy * W + xx] = 1; const p = [[xx, yy]]; step(p); if (p.length > 5) { p.push(p[0]); paths.push({ p, e0: false, e1: false, anello: true }); } }
    // via gli speroni dell'assottigliamento (un capo libero, corto) e i pezzetti fra due incroci vicini
    const tieni = paths.filter(q => { const L = q.p.length; if (q.e0 !== q.e1 && L < S * .14) return false; if (q.e0 && q.e1 && L < 5) return false; if (!q.e0 && !q.e1 && !q.anello && L < 4) return false; return true; });
    // semplificare (Ramer-Douglas-Peucker) e lisciare (Chaikin)
    const rdp = (pts, eps) => { if (pts.length < 3) return pts; let dm = 0, im = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], L2 = Math.hypot(bx - ax, by - ay) || 1;
      for (let i = 1; i < pts.length - 1; i++) { const dd = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L2; if (dd > dm) { dm = dd; im = i; } }
      return dm > eps ? rdp(pts.slice(0, im + 1), eps).slice(0, -1).concat(rdp(pts.slice(im), eps)) : [pts[0], pts[pts.length - 1]]; };
    const chaikin = pts => { if (pts.length < 3) return pts; const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; o.push([ax * .75 + bx * .25, ay * .75 + by * .25], [ax * .25 + bx * .75, ay * .25 + by * .75]); } o.push(pts[pts.length - 1]); return o; };
    const out = tieni.map(Q2 => { const p = Q2.p, hm = p.length >> 1; let q = Q2.anello ? rdp(p.slice(0, hm + 1), 1.7).concat(rdp(p.slice(hm), 1.7).slice(1)) : rdp(p, 1.7); q = chaikin(chaikin(q)); const mx = p.reduce((s, v) => s + v[0], 0) / p.length, my = p.reduce((s, v) => s + v[1], 0) / p.length;
      let li = 0; if (vert) { for (let i = 0; i < bounds.length; i++) if (my >= bounds[i]) li = i; } else { for (let i = 0; i < bounds.length; i++) if (mx >= bounds[i]) li = i; }
      return { pts: q.map(v => [v[0], H - v[1]]), li, e0: Q2.e0, e1: Q2.e1, chiuso: !!Q2.anello }; });
    let gx0 = 1e9, gx1 = -1e9, gy0 = 1e9, gy1 = -1e9; out.forEach(p => p.pts.forEach(([a, b]) => { gx0 = Math.min(gx0, a); gx1 = Math.max(gx1, a); gy0 = Math.min(gy0, b); gy1 = Math.max(gy1, b); }));
    return { paths: out, gx0, gx1, gy0, gy1, gw: gx1 - gx0, gh: gy1 - gy0, n: chars.length };
  }

  // =====================================================================================================================================
  // LA GEOMETRIA: accumulatori (posizioni, normali, colori o uv, indici) che diventano UNA mesh per materiale e per insegna
  // =====================================================================================================================================
  const V3 = THREE.Vector3, _v = new V3(), _n = new V3(), _m3 = new THREE.Matrix3(), _c = new THREE.Color();
  const acc0 = () => ({ p: [], n: [], c: [], uv: [], i: [] });
  const TM = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new V3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new V3(sx || 1, sy || 1, sz || 1));
  function addG(A, geo, M, col, ruggine) {   // col: colore o funzione del punto
    const pos = geo.attributes.position, nor = geo.attributes.normal, base = A.p.length / 3; _m3.getNormalMatrix(M);
    const cf = typeof col === 'function' ? col : null; if (!cf && col) _c.set(col);
    for (let i = 0; i < pos.count; i++) { _v.fromBufferAttribute(pos, i).applyMatrix4(M); A.p.push(_v.x, _v.y, _v.z); _n.fromBufferAttribute(nor, i).applyMatrix3(_m3).normalize(); A.n.push(_n.x, _n.y, _n.z);
      if (cf) { const q = cf(_v); A.c.push(q[0], q[1], q[2]); } else A.c.push(_c.r, _c.g, _c.b); }
    if (geo.index) for (let j = 0; j < geo.index.count; j++) A.i.push(base + geo.index.array[j]); else for (let j = 0; j < pos.count; j++) A.i.push(base + j);
    geo.dispose();
  }
  const metallo = (hex, rr) => { const a = new THREE.Color(hex), b = new THREE.Color(RUGGINE[1]); return v => { const n = h01((Math.floor(v.x * 9) * 73856093) ^ (Math.floor(v.y * 9) * 19349663) ^ (Math.floor(v.z * 9) * 83492791)); const t = n < rr ? .55 + n : 0; return [a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t]; }; };
  function pq(A, c, n, w, h, cell, ox) {   // un quadrato dipinto: centro, normale, misure, la casella; la scritta si legge da davanti
    const up = new V3(0, 1, 0), rr = new V3().crossVectors(up, n).normalize(), base = A.p.length / 3, u0 = cell.x / AW, u1 = (cell.x + cell.w) / AW, v0 = 1 - cell.y / AH, v1 = 1 - (cell.y + cell.h) / AH;
    [[-1, 1, u0, v0], [1, 1, u1, v0], [-1, -1, u0, v1], [1, -1, u1, v1]].forEach(([a, b, u, v]) => { A.p.push(c.x + rr.x * a * w / 2, c.y + b * h / 2, c.z + rr.z * a * w / 2); A.n.push(n.x, n.y, n.z); A.uv.push(u, v); A.c.push(ox || 1, ox || 1, ox || 1); });
    A.i.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  function mesh(A, mat, uv) {
    if (!A.i.length) return null; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(A.n, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(A.c, 3));
    g.setIndex(A.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(A.i, 1) : new THREE.Uint16BufferAttribute(A.i, 1)); g.computeBoundingSphere();
    const o = new THREE.Mesh(g, mat); o.matrixAutoUpdate = false; o.userData.keep = true; o.userData.insegne4 = true; return o;
  }
  const rrShape = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  const rrPath3 = (w, h, r) => { const s = new THREE.Path(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.quadraticCurveTo(x, y, x, y + r); s.lineTo(x, y + h - r); s.quadraticCurveTo(x, y + h, x + r, y + h); s.lineTo(x + w - r, y + h); s.quadraticCurveTo(x + w, y + h, x + w, y + h - r); s.lineTo(x + w, y + r); s.quadraticCurveTo(x + w, y, x + w - r, y); s.lineTo(x + r, y); return s; };
  const extr = (shape, d, bev) => new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 4 });
  function cornice(A, w, h, t, d, bev, rad, col, M) { const s = rrShape(w, h, rad); s.holes.push(rrPath3(w - 2 * t, h - 2 * t, Math.max(.005, rad - t))); addG(A, extr(s, d, bev), M, col); }
  function bullone(A, x, y, z, col, M, r) { addG(A, new THREE.CylinderGeometry(r || .013, r || .013, .012, 6), M.clone().multiply(TM(x, y, z + .006, Math.PI / 2)), col); addG(A, new THREE.SphereGeometry((r || .013) * .7, 5, 3, 0, 6.3, 0, 1.6), M.clone().multiply(TM(x, y, z + .012, Math.PI / 2)), col); }
  function tubo(A, pts, r, seg, col, M, chiuso) {   // un tubo lungo una linea 3D (punti V3 in coordinate locali)
    const n = pts.length; if (n < 2) return; const base = A.p.length / 3, cf = typeof col === 'function' ? col : null; if (!cf) _c.set(col); _m3.getNormalMatrix(M);
    let prevN = null;
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], T = new V3().subVectors(b, a).normalize();
      let N = prevN ? prevN.clone().sub(T.clone().multiplyScalar(prevN.dot(T))).normalize() : (Math.abs(T.z) < .9 ? new V3(0, 0, 1) : new V3(1, 0, 0)).sub(T.clone().multiplyScalar(Math.abs(T.z) < .9 ? T.z : T.x)).normalize(); prevN = N; const Bn = new V3().crossVectors(T, N);
      for (let k = 0; k < seg; k++) { const a2 = k / seg * Math.PI * 2, d = N.clone().multiplyScalar(Math.cos(a2)).add(Bn.clone().multiplyScalar(Math.sin(a2)));
        _v.copy(pts[i]).addScaledVector(d, r).applyMatrix4(M); A.p.push(_v.x, _v.y, _v.z); _n.copy(d).applyMatrix3(_m3).normalize(); A.n.push(_n.x, _n.y, _n.z);
        if (cf) { const q = cf(i, k, d); A.c.push(q[0], q[1], q[2]); } else A.c.push(_c.r, _c.g, _c.b); } }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * seg + k, b = base + i * seg + (k + 1) % seg, c2 = a + seg, d = b + seg; A.i.push(a, c2, b, b, c2, d); }
  }

  // =====================================================================================================================================
  // I MATERIALI (pochi, condivisi da tutte le insegne)
  // =====================================================================================================================================
  const MAT = {};
  function materiali(tex) {
    MAT.paint = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .16, vertexColors: true, roughness: .62, metalness: .05 });
    MAT.box = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: .15, vertexColors: true, roughness: .4 });
    MAT.muro = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .08, depthWrite: false, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    MAT.ferro = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .35 });
    MAT.neon = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true });
    MAT.alone = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    [MAT.paint, MAT.box, MAT.muro, MAT.ferro].forEach(m => { m.userData.grafica = 'insegne4'; });
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'), gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
    MAT.gtex = new THREE.CanvasTexture(gc);
  }

  // =====================================================================================================================================
  // LE INSEGNE DI SERIE: trovarle, leggerle, spegnerle
  // =====================================================================================================================================
  const KINDS = /^(insegna_locale|insegna_speciale|insegna_verticale|insegna_fascia_.*|bandiera_neon)$/;
  function leggiQuadri(o) {   // i quadrati di una mesh (fusa o no): centro, normale, misure, la scala
    o.updateMatrixWorld(true); const g = o.geometry, p = g && g.attributes.position; if (!p || !p.array || !p.array.length) { STATO.senzaGeo = (STATO.senzaGeo || 0) + 1; return []; } const M = o.matrixWorld, n = p.count, W = [];
    for (let i = 0; i < n; i++) W.push(new V3().fromBufferAttribute(p, i).applyMatrix4(M));
    const idx = g.index ? Array.from(g.index.array) : [...Array(n).keys()], par = [...Array(n).keys()], f = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
    const key = v => Math.round(v.x * 200) + ',' + Math.round(v.y * 200) + ',' + Math.round(v.z * 200), first = {};
    W.forEach((v, i) => { const k = key(v); if (first[k] === undefined) first[k] = i; else par[f(i)] = f(first[k]); });
    for (let t = 0; t < idx.length; t += 3) { par[f(idx[t + 1])] = f(idx[t]); par[f(idx[t + 2])] = f(idx[t]); }
    const G = {}; for (let t = 0; t < idx.length; t += 3) { const r0 = f(idx[t]); (G[r0] || (G[r0] = [])).push(idx[t], idx[t + 1], idx[t + 2]); }
    const sc = new V3().setFromMatrixColumn(M, 0).length();
    return Object.values(G).map(tr => { const a = W[tr[0]], b = W[tr[1]], c = W[tr[2]], nn = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)).normalize();
      if (Math.abs(nn.y) > .5) return null; nn.y = 0; nn.normalize(); const up = new V3(0, 1, 0), rr = new V3().crossVectors(up, nn).normalize();
      let r0 = 1e9, r1 = -1e9, y0 = 1e9, y1 = -1e9; tr.forEach(i => { const v = W[i], u = v.dot(rr); r0 = Math.min(r0, u); r1 = Math.max(r1, u); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); });
      const d = a.dot(nn), C = rr.clone().multiplyScalar((r0 + r1) / 2).addScaledVector(nn, d); C.y = (y0 + y1) / 2;
      return { C, N: nn, w: r1 - r0, h: y1 - y0, sc }; }).filter(Boolean);
  }
  function casaVicina(C, filtro) { const G = window.__pv.G, TS = G.TS; let best = null, bd = 1e9;
    G.BUILDINGS.forEach(b => { if (filtro && !filtro(b)) return; const x0 = b.x * TS, z0 = b.y * TS, x1 = x0 + b.w * TS, z1 = z0 + b.h * TS, dx = Math.max(x0 - C.x, 0, C.x - x1), dz = Math.max(z0 - C.z, 0, C.z - z1), d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = b; } });
    return bd < 4.5 ? best : null; }
  const fuori = (b, C, N) => { const TS = window.__pv.G.TS, cx = (b.x + b.w / 2) * TS, cz = (b.y + b.h / 2) * TS; return (C.x - cx) * N.x + (C.z - cz) * N.z >= 0 ? N : N.clone().negate(); };
  function spegni(sc, R) {
    const trovati = [], mats = new Set(), via = [];
    sc.traverse(o => { if (!o.isMesh || o.userData.insegne4) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; const k = ms.map(m => m && m.userData && m.userData.grafica).find(q => q && KINDS.test(q)); if (!k) return;
      via.push(o); ms.forEach(m => mats.add(m));
      if (k === 'insegna_verticale') { o.updateMatrixWorld(true); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, C = bb.getCenter(new V3()).applyMatrix4(o.matrixWorld), sz = bb.getSize(new V3());
        const ax = new V3(0, 0, 1).transformDirection(o.matrixWorld); ax.y = 0; ax.normalize(); trovati.push({ k, C, N: ax, w: sz.z, h: sz.y, d: sz.x, sc: 1 }); return; }
      leggiQuadri(o).forEach(q => { q.k = k; trovati.push(q); }); });
    via.forEach(o => { o.visible = false; o.userData.insegne4spenta = true; });
    // gli aloni e lo sfarfallio delle scritte spente; le tele liberate dalla scheda video
    const dyn = R.__dyn; let tele = 0;
    dyn.signs = dyn.signs.filter(s => { if (!mats.has(s.m)) return true; if (s.gl) { const f = dyn.flicker.find(e => e.s === s.gl); if (f) f.base = 0; s.gl.visible = false; s.gl.scale.set(0, 0, 0); } return false; });
    mats.forEach(m => { if (m.map) { const im = m.map.image; tele += im && im.width ? im.width * im.height * 4 : 0; m.map.dispose(); } m.visible = false; });
    return { trovati, spente: via.length, materiali: mats.size };
  }

  // =====================================================================================================================================
  // LA SCHEDA: per ogni insegna trovata il tipo, i colori, i caratteri, l'usura (mai due uguali: il seme è il posto)
  // =====================================================================================================================================
  const USATI = new Set();
  function scheda(q, i, F) {   // F: le scelte forzate (l'anteprima: API.__prova)
    F = F || {}; const k = q.k, fascia = /^insegna_fascia_/.test(k), stile = fascia ? k.replace('insegna_fascia_', '') : null;
    const b = 'b' in F ? F.b : casaVicina(q.C, fascia ? (bb => bb.shopFront) : k === 'insegna_locale' || k === 'insegna_speciale' ? (bb => bb.sign) : (bb => bb.sign || bb.shop));
    const use = b ? (fascia ? b.shopFront.use : b.use || b.id) : 'gen', tr = F.tr || TRADE[use] || TRADE[b && b.id] || 'gen', seed = F.seed || hashS((b ? b.id : 'x') + k + Math.round(q.C.x * 10) + ',' + Math.round(q.C.z * 10)), r = rng(seed);
    const S = { k, b, use, tr, seed, r, q, wear: .35 + r() * .65, sole: r() < .75 ? .4 + r() * .6 : 0, idx: i };
    let txt = fascia ? (b && (b.shopFront.sign && b.shopFront.sign.t || b.shopFront.name) || 'BOTTEGA') : b && b.sign ? b.sign.t : 'BAR';
    txt = String(txt).replace(/✚\s*/g, '').toUpperCase().trim();
    // il tipo
    const bandiera = (k === 'insegna_locale' && q.sc < .9), lama = k === 'bandiera_neon' || k === 'insegna_verticale';
    if (lama) { S.tipo = 'verticale'; S.mat = k === 'insegna_verticale' || r() < .45 ? 'neon' : pick(r, ['smalto', 'legno']); txt = b ? (SHORT_ID[b.id] || SHORT_USE[b.use] || (b.sign && /^[A-Z]{3,8}$/.test(b.sign.t) ? b.sign.t : null) || 'BAR') : 'BAR'; if (k === 'insegna_verticale' && b && b.sign) txt = b.sign.t.replace(/^HOTEL /, ''); }
    else if (bandiera) { S.tipo = 'bandiera'; if (q.agg) txt = (b && (SHORT_USE[b.use] || SHORT_ID[b.id])) || txt.split(' ')[0]; S.mat = (b && NEON_ID[b.id]) ? 'neon' : pick(r, ['smalto', 'legno', 'cassonetto', 'smalto', 'legno']); }
    else if (fascia) { S.tipo = 'fascia'; S.mat = stile === 'dipinta' ? pick(r, ['muro', 'muro', 'legno', 'smalto', 'muro']) : stile === 'tavola' ? pick(r, ['legno', 'smalto', 'legno']) : pick(r, ['smalto', 'legno', 'cassonetto', 'smalto']); if (b && (tr === 'bar' || use === 'pub') && r() < .5) S.mat = 'neon'; }
    else { S.tipo = 'piatta'; S.mat = (b && NEON_ID[b.id]) ? 'neon' : k === 'insegna_speciale' ? 'cassonetto' : pick(r, ['smalto', 'legno', 'cassonetto', 'muro', 'smalto', 'legno']); }
    if (F.mat) S.mat = F.mat; if (F.testo) txt = F.testo;
    if (S.mat === 'neon') S.telaio = S.tipo === 'piatta' && r() < .45; if ('telaio' in F) S.telaio = F.telaio;   // il neon su telaio aperto (due tubi d'acciaio) o su pannello
    S.testo = txt; S.col = SCH[tr] ? pick(r, SCH[tr].concat(r() < .3 ? SCH.gen : [])) : pick(r, SCH.gen);
    if (S.mat === 'muro' && /rosa|viola|lilla|pesca|cielo|salvia/.test(S.col[0])) S.col = pick(r, [['carta', 'mattone', 'nero', 'oltremare'], ['bosco', 'carta', 'nero', 'ocra'], ['notte', 'osso', 'nero', 'cotto'], ['mattone', 'osso', 'nero', 'ocra'], ['osso', 'notte', 'nero', 'cotto']]);
    if (S.mat === 'neon') S.col = pick(r, [['nero', 'rosa', 'lavagna', 'cielo'], ['notte', 'cielo', 'nero', 'rosa'], ['lavagna', 'ocra', 'nero', 'cielo'], ['mattone', 'carta', 'nero', 'ocra'], ['viola', 'rosa', 'nero', 'cielo'], ['nero', 'salvia', 'lavagna', 'ocra']]);
    if (S.mat === 'cassonetto' && !/^(farmacia|pesce|latte|tabacchi)$/.test(tr)) S.col = pick(r, [['carta', 'oltremare', 'notte', 'cotto'], ['osso', 'mattone', 'nero', 'oltremare'], ['cielo', 'notte', 'oltremare', 'rosa'], ['pesca', 'viola', 'nero', 'notte'], ['carta', 'persiana', 'bosco', 'cotto'], ['notte', 'carta', 'nero', 'ocra']]);
    const FL = FONT[S.mat === 'muro' ? 'muro' : S.mat === 'neon' ? 'smalto' : S.mat] || FONT.smalto; S.font = pick(r, FL); if (!S.font[2] && /[a-z]/.test(S.testo)) S.testo = S.testo.toUpperCase();
    if (S.font[2] && r() < .5 && S.mat !== 'cassonetto') S.testo = titolo(S.testo);
    S.font2 = pick(r, FONT.piccolo); S.contorno = r() < .7; S.grad = r() < .35; S.slant = S.font[1].indexOf('italic') < 0 && r() < .25 ? .12 : 0; S.arco = S.tipo === 'piatta' && S.mat !== 'cassonetto' && r() < .3 ? 2.2 + r() * 2 : 0;
    S.track = r() < .3 ? .06 : 0; S.sotto = r() < .15; S.ang = pick(r, ['tondo', 'dritto', 'ricciolo']);
    S.icona = { farmacia: 'croce', pesce: 'pesce', bar: 'tazza', vino: 'calice', barbiere: 'forbici', pane: 'pane' }[tr] || (r() < .3 ? pick(r, ['stella', 'rombo']) : null); if (S.mat === 'muro' && r() < .5) S.icona = null;
    if (fascia && b) { const nm = String(b.shopFront.name || '').toUpperCase(); if (nm && nm !== S.testo.toUpperCase()) { const rest = nm.split(/\s+/).filter(w => S.testo.toUpperCase().indexOf(w) < 0).join(' '); S.seconda = rest.length > 2 ? (/^(DA|DI|DEL|DELLA|DEI)\b/.test(rest) ? rest : (nm.length < 26 ? nm : rest)) : null; } }
    if (!S.seconda && r() < .55) S.seconda = pick(r, (SECONDA[tr] || []).concat(SECONDA.gen));
    S.secSopra = r() < .35; if (S.tipo === 'bandiera' || S.tipo === 'verticale') S.seconda = null;
    if (F.seconda !== undefined) S.seconda = F.seconda;
    S.croce = tr === 'farmacia' && !lama; S.tabT = tr === 'tabacchi' && !lama; S.palo = tr === 'barbiere' && !lama && S.tipo !== 'bandiera';
    // lo sfarfallio: solo sui neon, uno su tre; le lettere guaste
    S.flk = S.mat === 'neon' && (r() < .4 || (b && (b.id === 'flipper' || b.id === 'video' || b.id === 'magazzino'))) ? (r() < .7 ? 1 : 2) : 0;
    // mai due uguali: se la combinazione c'è già, si cambia il carattere e lo schema
    { const lum = h => { const c = rgb(P[h]); return (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255; };
      if (S.mat !== 'neon' && /^(nero|lavagna|notte)$/.test(S.col[0])) S.col = [S.col[1] === 'carta' || S.col[1] === 'osso' ? 'carta' : 'osso', S.col[0], S.col[2] === S.col[0] ? 'nero' : S.col[2], S.col[3]];
      if (S.mat !== 'neon' && Math.abs(lum(S.col[0]) - lum(S.col[1])) < .38) S.col = [S.col[0], lum(S.col[0]) > .5 ? 'nero' : 'carta', S.col[2], S.col[3]];
      S.contornoC = lum(S.col[1]) > .5 ? P.nero : P.carta; }
    if (F.flk !== undefined) S.flk = F.flk; if (F.col) S.col = F.col; if (F.font) S.font = F.font;
    for (let t = 0; t < 8 && !F.col; t++) { const sig = [S.mat, S.testo, S.font[0], S.col.join()].join('|'); if (!USATI.has(sig)) { USATI.add(sig); break; } S.font = pick(r, FL); S.col = pick(r, SCH.gen); }
    return S;
  }

  // =====================================================================================================================================
  // IL MONTAGGIO: ogni tipo la sua geometria. Coordinate locali: origine sul muro, +Z fuori dal muro, +X lungo il muro (destra di chi guarda)
  // =====================================================================================================================================
  const FERRO = '#24202a', ACCIAIO = '#7C7186', OTTONE = '#b08a48';
  function costruisci1(S, A) {
    const q = S.q, r = rng(S.seed + 17), wear = S.wear;
    const ferro = metallo(FERRO, .12 + wear * .25), acciaio = metallo(ACCIAIO, .08 + wear * .2), I = new THREE.Matrix4();
    const fondoC = P[S.col[0]], scuro = mix(fondoC, P.nero, .45);
    // l'insegna che sta in un piano (piatta o fascia): la tavola, la cornice, i bulloni, i distanziali, le staffe
    const tavola = (w, h, z0, M, dop) => {   // M: la matrice del piano della tavola; dop: due facce (bandiera)
      const mat = S.mat, rad = S.ang === 'tondo' ? Math.min(w, h) * .12 : .015;
      // il corpo (d lo spessore, bev lo smusso), poi la cornice in rilievo davanti (e dietro, a due facce); la faccia dipinta dentro la cornice
      const T = { smalto: [.012, .006, rad, scuro, [.022, .008, .006, mix(fondoC, P.carta, .25)]], legno: [.04, 0, 0, null, [.07, .018, .008, mix(fondoC, P.nero, .3)]],
        cassonetto: [.16, .006, .03, metallo(mix(ACCIAIO, P.osso, .4), .1 + wear * .2), [.035, .012, .004, mix(ACCIAIO, P.nero, .3)]], neon: [.05, .005, .02, scuro, [.018, .01, .004, mix(scuro, P.nero, .4)]] }[mat] || [.012, .006, rad, scuro, [.022, .008, .006, P.osso]];
      const [d, bev, rd, col, RG] = T; let top;
      if (mat === 'legno') { addG(A.ferro, new THREE.BoxGeometry(w, h, d), M.clone().multiply(TM(0, 0, dop ? 0 : z0 + d / 2)), metallo(mix(LEGNO[0], fondoC, .5), 0)); top = dop ? d / 2 : z0 + d;
        if (!dop) addG(A.ferro, new THREE.BoxGeometry(w + .16, .045, .09), M.clone().multiply(TM(0, h / 2 + .055, z0 + .045)), RG[3]); }   // il cappello: la cimasa sopra la tavola
      else { addG(A.ferro, extr(rrShape(w, h, rd), d, bev), M.clone().multiply(TM(0, 0, dop ? -d / 2 : z0 + bev)), col); top = dop ? d / 2 + bev : z0 + d + 2 * bev; }
      const wr = w + (mat === 'legno' ? .06 : .012), hr = h + (mat === 'legno' ? .06 : .012), rr2 = mat === 'legno' ? .004 : Math.max(.006, rd);
      cornice(A.ferro, wr, hr, RG[0], RG[1], RG[2], rr2, RG[3], M.clone().multiply(TM(0, 0, top + RG[2])));
      if (dop) cornice(A.ferro, wr, hr, RG[0], RG[1], RG[2], rr2, RG[3], M.clone().multiply(TM(0, 0, -top - RG[2], 0, Math.PI, 0)));
      return top + .0015;
    };
    const facce = (w, h, zf, cell, M, dop, mat) => { const AA = mat === 'cassonetto' ? A.box : A.paint, c0 = new V3(0, 0, zf).applyMatrix4(M), nz = new V3(0, 0, 1).transformDirection(M);
      pq(AA, c0, nz, w, h, cell); if (dop) { const c1 = new V3(0, 0, -zf).applyMatrix4(M); pq(AA, c1, nz.clone().negate(), w, h, cell); } };
    const neonSu = (w, h, zf, M, dop, vert) => {   // i tubi davanti al pannello (o al telaio), i portalampada, i distanziali, l'alone
      const NE = S.ne; if (!NE || !NE.paths.length) return;
      const sc = Math.min(w * .86 / NE.gw, h * .8 / NE.gh), ox = -(NE.gx0 + NE.gx1) / 2, oy = -(NE.gy0 + NE.gy1) / 2, tz = .05, col = new THREE.Color(S.neonC), core = new THREE.Color(S.neonC).lerp(new THREE.Color('#fffaf0'), .55);
      const capN = {}; [1, -1].forEach(sd => { if (sd < 0 && !dop) return; const MM = sd > 0 ? M : M.clone().multiply(TM(0, 0, 0, 0, Math.PI, 0)), z1 = zf + tz;
        NE.paths.forEach(p => { const pts = p.pts.map(([a, b]) => new V3((a + ox) * sc, (b + oy) * sc, z1)); if (pts.length < 2) return;
          const st = A.neon.p.length / 3; tubo(A.neon, pts, .016, 6, (i, k, d) => { const f = d.z > .3 ? core : col; return [f.r, f.g, f.b]; }, MM); S.lett.push({ li: p.li, s: st, n: A.neon.p.length / 3 - st });
          [pts[0], pts[pts.length - 1]].forEach((e, j) => { if (!(j ? p.e1 : p.e0)) return; const kk = sd + ':' + p.li; capN[kk] = (capN[kk] || 0) + 1; if (capN[kk] > 2) return; const o = j ? pts[pts.length - 2] : pts[1], dir = new V3().subVectors(e, o).normalize(), cpos = e.clone().addScaledVector(dir, .012);
            addG(A.ferro, new THREE.CylinderGeometry(.017, .017, .035, 7), MM.clone().multiply(new THREE.Matrix4().compose(cpos, new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir), new V3(1, 1, 1))), P.lavagna);
            addG(A.ferro, new THREE.CylinderGeometry(.004, .004, tz, 4), MM.clone().multiply(TM(cpos.x, cpos.y, zf + tz / 2, Math.PI / 2)), ACCIAIO); });
          let accL = 0; for (let i = 1; i < pts.length; i++) { accL += pts[i].distanceTo(pts[i - 1]); if (accL > .32) { accL = 0; const e = pts[i]; addG(A.ferro, new THREE.CylinderGeometry(.005, .007, tz, 5), MM.clone().multiply(TM(e.x, e.y, zf + tz / 2, Math.PI / 2)), mix(ACCIAIO, P.nero, .3)); } } });
        // l'alone sul pannello: la casella del bagliore, additiva
        const gw = NE.gw * sc * 1.25, gh = NE.gh * sc * 1.45, c0 = new V3(0, 0, zf + .004).applyMatrix4(MM), nz = new V3(0, 0, 1).transformDirection(MM), st = A.alone.p.length / 3;
        pq(A.alone, c0, nz, gw, gh, S.cells.alone); for (let j = st; j < st + 4; j++) { A.alone.c[j * 3] = col.r; A.alone.c[j * 3 + 1] = col.g; A.alone.c[j * 3 + 2] = col.b; } });
    };
    const trasformatore = (x, y, z, M) => { addG(A.ferro, new THREE.BoxGeometry(.3, .2, .13), M.clone().multiply(TM(x, y, z + .065)), acciaio); addG(A.ferro, new THREE.BoxGeometry(.32, .03, .15), M.clone().multiply(TM(x, y + .11, z + .07)), mix(ACCIAIO, P.nero, .3));
      [-1, 1].forEach(s => [-1, 1].forEach(t => bullone(A.ferro, x + s * .13, y + t * .08, z + .13, OTTONE, M, .007)));
      tubo(A.ferro, [new V3(x, y - .1, z + .05), new V3(x, y - .2, z + .05), new V3(x + Math.sign(-x) * .15, y - .26, z + .05), new V3(x + Math.sign(-x) * .35, y - .26, z + .05)], .01, 5, P.nero, M); };

    if (S.tipo === 'piatta' || S.tipo === 'fascia') {
      const W0 = S.W0, H0 = S.H0, M = S.M; S.dim = [W0, H0];
      if (S.mat === 'muro') { const c0 = new V3(0, 0, .003).applyMatrix4(M); pq(A.muro, c0, new V3(0, 0, 1).transformDirection(M), S.FW, S.FH, S.cells.faccia); }
      else if (S.mat === 'neon' && S.telaio) {   // il telaio: due tubi d'acciaio orizzontali sulle staffe a muro, i tubi davanti
        [-1, 1].forEach(s => { const y = s * H0 * .3; tubo(A.ferro, [new V3(-W0 / 2, y, .07), new V3(W0 / 2, y, .07)], .014, 6, acciaio, M); [-.42, 0, .42].forEach(f => { addG(A.ferro, new THREE.CylinderGeometry(.01, .01, .07, 5), M.clone().multiply(TM(f * W0, y, .035, Math.PI / 2)), ferro); addG(A.ferro, new THREE.BoxGeometry(.07, .07, .01), M.clone().multiply(TM(f * W0, y, .005)), ferro); bullone(A.ferro, f * W0, y, .01, OTTONE, M, .008); }); });
        neonSu(W0, H0, .07, M, false); trasformatore(-W0 / 2 - .25, -H0 * .1, 0, M);
      } else {
        const z0 = S.tipo === 'fascia' ? .002 : .09 + (S.dz || 0);   // le piatte staccate dal muro sui distanziali (l'ombra dietro)
        if (S.tipo === 'piatta') [-1, 1].forEach(s => [-1, 1].forEach(t => addG(A.ferro, new THREE.CylinderGeometry(.018, .018, z0, 6), M.clone().multiply(TM(s * (W0 / 2 - .12), t * (H0 / 2 - .1), z0 / 2, Math.PI / 2)), ferro)));
        if (S.tipo === 'fascia' && S.off > .01) addG(A.ferro, new THREE.BoxGeometry(W0 - .02, H0 - .02, S.off + .003), M.clone().multiply(TM(0, 0, -S.off / 2 + .0015)), scuro);
        const zf = tavola(W0, H0, z0, M, false); facce(S.FW, S.FH, zf, S.cells.faccia, M, false, S.mat);
        const bx = W0 / 2 - .06, by = H0 / 2 - .06; if (S.mat === 'smalto' || S.mat === 'neon') [[-bx, by], [bx, by], [-bx, -by], [bx, -by]].forEach(([a, b2]) => bullone(A.ferro, a, b2, zf, mix(OTTONE, RUGGINE[0], wear * .6), M));
        if (S.mat === 'neon') { neonSu(W0, H0, zf, M, false); trasformatore(W0 / 2 + .25, 0, 0, M); }
        if (S.tipo === 'piatta' && S.mat !== 'neon') [-1, 1].forEach(s => { const x = s * W0 * .35; addG(A.ferro, new THREE.BoxGeometry(.05, .14, .025), M.clone().multiply(TM(x, H0 / 2 + .05, .0125)), ferro); addG(A.ferro, new THREE.BoxGeometry(.05, .025, .07), M.clone().multiply(TM(x, H0 / 2 + .012, .05)), ferro); bullone(A.ferro, x, H0 / 2 + .09, .025, OTTONE, M, .008); });
        if (S.mat === 'cassonetto') { tubo(A.ferro, [new V3(W0 / 2 - .2, H0 / 2, .1), new V3(W0 / 2 - .2, H0 / 2 + .12, .1), new V3(W0 / 2 - .2, H0 / 2 + .18, .03), new V3(W0 / 2 - .2, H0 / 2 + .9, .03)], .012, 5, ACCIAIO, M); }   // il tubo del cavo che sale
      }
      // le aggiunte del mestiere, accanto: la croce verde, la T dei tabacchi, il palo del barbiere (a bandiera, su una staffa corta)
      const lato = r() < .5 ? -1 : 1, xs = lato * (W0 / 2 + .45);
      if (S.croce) { const MM = M.clone().multiply(TM(xs, 0, 0)); braccio(A, MM, .5, ferro, r); tubo(A.ferro, [new V3(0, 0, .55), new V3(0, -.12, .55)], .008, 5, ferro, MM); const cs = new THREE.Shape(), a = .1, b = .3; [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]].forEach(([u, v], i) => i ? cs.lineTo(u, v) : cs.moveTo(u, v));
        addG(A.ferro, extr(cs, .1, .01), MM.clone().multiply(TM(0, -.42, .55, 0, Math.PI / 2, 0)).multiply(TM(0, 0, -.05)), P.bosco);
        const pts = [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a], [-a, -b]].map(([u, v]) => new V3(u * .8, v * .8, .072));
        [1, -1].forEach(sd => { const st = A.neon.p.length / 3; tubo(A.neon, pts, .014, 5, (i, k, d) => { const c = new THREE.Color('#9cff8a').lerp(new THREE.Color('#f4fff0'), d.z > .3 ? .5 : 0); return [c.r, c.g, c.b]; }, MM.clone().multiply(TM(0, -.42, .55, 0, sd > 0 ? Math.PI / 2 : -Math.PI / 2, 0))); S.lett.push({ li: 99, s: st, n: A.neon.p.length / 3 - st }); });
        S.extraLuce = { x: xs, y: -.42, z: .55, c: '#9cff8a' }; }
      else if (S.tabT) { const MM = M.clone().multiply(TM(xs, 0, 0)); braccio(A, MM, .45, ferro, r); addG(A.ferro, new THREE.BoxGeometry(.06, .5, .5), MM.clone().multiply(TM(0, -.4, .5)), P.nero); [1, -1].forEach(sd => pq(A.box, new V3(sd * .032, -.4, .5).applyMatrix4(MM), new V3(sd, 0, 0).transformDirection(MM), .46, .46, S.cells.T)); }
      else if (S.palo) { const MM = M.clone().multiply(TM(xs, -.2, 0)); addG(A.ferro, new THREE.BoxGeometry(.08, .08, .2), MM.clone().multiply(TM(0, .35, .1)), ferro); addG(A.ferro, new THREE.BoxGeometry(.08, .08, .2), MM.clone().multiply(TM(0, -.35, .1)), ferro);
        const cg = new THREE.CylinderGeometry(.07, .07, .6, 12, 1, true), uvA = cg.attributes.uv, st = A.paint.p.length / 3, c = S.cells.palo; addG(A.paint, cg.clone(), MM.clone().multiply(TM(0, 0, .2)), '#ffffff');
        for (let j = 0; j < uvA.count; j++) A.paint.uv.push((c.x + uvA.getX(j) * c.w) / AW, 1 - (c.y + (1 - uvA.getY(j)) * c.h) / AH); cg.dispose();
        [.32, -.32].forEach(y => addG(A.ferro, new THREE.SphereGeometry(.08, 8, 5), MM.clone().multiply(TM(0, y, .2)), y > 0 ? OTTONE : FERRO)); }
    } else if (S.tipo === 'bandiera') {
      const M = S.M, w = S.W0, h = S.H0, a = .14, L = a + w + .12 + r() * .15;
      braccio(A, M, L, ferro, r, true);
      const zc = a + w / 2, yc = -.13 - h / 2, MB = M.clone().multiply(TM(0, yc, zc, 0, Math.PI / 2, 0));   // il piano della tavola: +Z locale = lungo il muro
      [a + .12, a + w - .12].forEach(z => { for (let j = 0; j < 3; j++) addG(A.ferro, new THREE.TorusGeometry(.017, .004, 4, 8), M.clone().multiply(TM(0, -.03 - j * .03, z, 0, j % 2 ? Math.PI / 2 : 0, 0)), ferro); });   // le catenelle
      const zf = tavola(w, h, 0, MB, true); facce(S.FW, S.FH, zf, S.cells.faccia, MB, true, S.mat); if (S.mat === 'neon') neonSu(w, h, zf, MB, true);
      S.dim = [w, h]; S.centroL = new V3(0, yc, zc);
    } else if (S.tipo === 'verticale') {
      const M = S.M, w = S.W0, h = S.H0, zc = S.lz, MB = M.clone().multiply(TM(0, 0, zc, 0, Math.PI / 2, 0)), d = .12;
      addG(A.ferro, extr(rrShape(w, h, .04), d, .008), MB.clone().multiply(TM(0, 0, -d / 2)), mix(P[S.col[0]], P.nero, .3));
      [1, -1].forEach(sd => cornice(A.ferro, w + .02, h + .02, .03, .012, .004, .04, mix(ACCIAIO, P.nero, .4), MB.clone().multiply(TM(0, 0, sd > 0 ? d / 2 + .004 : -d / 2 - .02))));
      const zf = d / 2 + .008; if (S.mat === 'neon') neonSu(w, h, zf, MB, true, true); facce(S.FW, S.FH, zf, S.cells.faccia, MB, true, 'smalto');
      [h / 2 - .2, -h / 2 + .2].forEach(y => { tubo(A.ferro, [new V3(0, y, .01), new V3(0, y, zc - w / 2 + .02)], .018, 6, ferro, M); addG(A.ferro, new THREE.BoxGeometry(.14, .18, .02), M.clone().multiply(TM(0, y, .01)), ferro); [-1, 1].forEach(s => bullone(A.ferro, s * .045, y + .05, .02, OTTONE, M, .009)); });
      S.dim = [w, h]; S.centroL = new V3(0, 0, zc);
    }
  }
  // la staffa di ferro battuto: la piastra coi bulloni, il braccio, il saettone, il ricciolo, il pomo
  function braccio(A, M, L, ferro, r, lungo) {
    addG(A.ferro, new THREE.BoxGeometry(.15, .4, .02), M.clone().multiply(TM(0, -.12, .01)), ferro); [[-.045, .04], [.045, .04], [-.045, -.28], [.045, -.28]].forEach(([x, y]) => bullone(A.ferro, x, y, .02, OTTONE, M, .009));
    tubo(A.ferro, [new V3(0, 0, .02), new V3(0, 0, L)], .019, 6, ferro, M); addG(A.ferro, new THREE.SphereGeometry(.035, 8, 6), M.clone().multiply(TM(0, 0, L + .03)), ferro);
    addG(A.ferro, new THREE.ConeGeometry(.02, .07, 6), M.clone().multiply(TM(0, 0, L + .085, Math.PI / 2)), ferro);
    tubo(A.ferro, [new V3(0, -.3, .02), new V3(0, -.15, L * .3), new V3(0, -.01, L * .58)], .012, 5, ferro, M);
    // il ricciolo: una spirale nel triangolo fra braccio e saettone (e, sulle lunghe, un secondo più piccolo verso la punta)
    const spir = (cz, cy, R0, giri, s) => { const pts = []; for (let i = 0; i <= 44; i++) { const t = i / 44, ang = t * giri * Math.PI * 2, rr = R0 * (1 - t * .85); pts.push(new V3(0, cy + Math.sin(ang) * rr * s, cz + Math.cos(ang) * rr)); } tubo(A.ferro, pts, .007, 5, ferro, M); };
    spir(L * .2, -.1, .085, 1.6, 1); if (lungo) spir(L * .68, -.05, .045, 1.3, -1);
  }

  // =====================================================================================================================================
  // LA REGIA: dalle insegne di serie alle nuove
  // =====================================================================================================================================
  const SIGNS = [], STATO = { fatto: false };
  async function fontPronti(nomi) { if (!document.fonts || !document.fonts.load) return; try { await Promise.race([Promise.all(nomi.map(f => document.fonts.load(`400 40px ${f}`, 'AbcÈ'))), new Promise(res => setTimeout(res, 4000))]); } catch (e) { } }
  async function avvia() {
    const R = window.__pv.R, sc = R.__models.scene, t0 = performance.now(); { const old = sc.getObjectByName('insegne4'); if (old) { sc.remove(old); old.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); } }
    SIGNS.length = 0; USATI.clear();
    const CT = COTTE() ? Tasselli.insegne4 : null; STATO.cotte = !!CT;
    if (CT) {   // [apk_finale] dai tasselli: i posti già trovati, le correzioni già calcolate
      const v3 = a => a ? new V3(a[0], a[1], a[2]) : undefined;
      const schede = CT.q.map((q, i) => scheda(Object.assign({}, q, { C: v3(q.C), N: v3(q.N), Nw: v3(q.Nw) }), i));
      await monta(schede, sc, CT.tab, true);
      STATO.fatto = true; STATO.ms = Math.round(performance.now() - t0); STATO.spente = 0; return; }
    const { trovati, spente, materiali: nm } = spegni(sc, R);
    // una volta sola per posto: i pezzi delle case fuse tornano con la loro geometria quando la casa si dissolve (la stessa scritta due volte)
    const visti = new Set(), unici = trovati.filter(q => { const k = [q.C.x, q.C.y, q.C.z].map(v => Math.round(v * 3)).join(',') + q.k; if (visti.has(k)) return false; visti.add(k); return true; });
    unici.filter(q => /^insegna_fascia_/.test(q.k)).forEach(q => { if (h01(Math.round(q.C.x * 7) * 131 + Math.round(q.C.z * 7)) > .7) return;
      const T = new V3().crossVectors(new V3(0, 1, 0), q.N).normalize(), sd = h01(Math.round(q.C.x * 3) + 77) < .5 ? 1 : -1, C = q.C.clone().addScaledVector(T, sd * (q.w / 2 + .45)).addScaledVector(q.N, 1.22); C.y += .55;
      unici.push({ k: 'insegna_locale', C, N: T, Nw: q.N.clone(), w: 3.4 * .6, h: .85 * .6, sc: .6, agg: true }); });
    const schede = unici.map((q, i) => scheda(q, i));
    // [apk_finale] per la cottura: i posti come numeri (Insegne4.cotto)
    const ar = v => v ? [v.x, v.y, v.z].map(n => +n.toFixed(4)) : undefined;
    STATO.q = unici.map(q => { const o = {}; for (const k in q) { const v = q[k]; o[k] = v && v.isVector3 ? ar(v) : v; } return o; });
    // [apk_finale] senza tasselli (l'APK leggero, ?tasselli=0): le correzioni della cottura di questa build, se ci sono (tasselli/insegne4.json),
    // al posto dei raggi (decine di secondi sul telefono). Nella cottura il server non dà i tasselli: lì si calcolano
    let tab = null; if (!/[?&]insegne4prova\b/.test(Q))
      try { const r = await fetch('tasselli/insegne4.json?v=' + (window.PV_IMPRONTA_TASS || 0)); if (r.ok) { const j = await r.json(); if (j && j.impronta === window.PV_IMPRONTA_TASS && j.tab) { tab = j.tab; STATO.tabellaFile = true; } } } catch (e) { }
    await monta(schede, sc, tab, false);
    STATO.fatto = true; STATO.ms = Math.round(performance.now() - t0); STATO.spente = spente; STATO.materialiSpenti = nm;
  }
  async function monta(schede, sc, tab, cotte) {
    await fontPronti([...new Set([].concat(...Object.values(FONT)).map(f => f[0]).filter(f => /^GF/.test(f)))]);
    // le caselle della tela
    const cells = [];
    schede.forEach(S => { S.cells = {}; S.lett = [];
      const q = S.q, rd = rng(S.seed + 11);
      // le misure: la tavola (W0 × H0) e la faccia dipinta (FW × FH), che è anche la casella nella tela (niente lettere stirate)
      if (S.tipo === 'fascia') { S.W0 = q.w + .12; S.H0 = q.h + .14; }
      else if (S.tipo === 'piatta') { S.W0 = 3.2 + rd() * .45; S.H0 = S.mat === 'cassonetto' ? .8 + rd() * .2 : .82 + rd() * .26; }
      else if (S.tipo === 'bandiera') { S.W0 = S.mat === 'cassonetto' ? .95 + rd() * .2 : 1.0 + rd() * .4; S.H0 = S.mat === 'cassonetto' ? .62 : .5 + rd() * .25; }
      else { S.W0 = S.k === 'insegna_verticale' ? Math.min(1.1, q.w) : Math.max(.6, q.w * .9); S.H0 = q.h; S.vert = true; }
      const ins = { legno: .1, muro: 0 }[S.mat]; S.FW = S.mat === 'muro' ? S.W0 * 1.04 : S.W0 - (ins === undefined ? .04 : ins); S.FH = S.mat === 'muro' ? S.H0 * 1.1 : S.H0 - (ins === undefined ? .04 : ins);
      if (!(S.mat === 'neon' && S.telaio)) { S.cells.faccia = { wm: S.FW, hm: S.FH, dens: S.vert ? .8 : 1 }; cells.push(S.cells.faccia); }
      if (S.mat === 'neon') { const fN = pick(rng(S.seed + 5), S.vert ? FONT.cassonetto : FONT.neon); let t = S.testo; if (fN[2] && !S.vert) t = titolo(t); S.ne = scheletro(S.vert ? t.replace(/ /g, '') : t, fN[0], fN[1], S.vert); S.neonC = NEONC[S.col[1]] || NEONC[pick(rng(S.seed), Object.keys(NEONC))];
        const asp = Math.max(.2, S.ne.gw * 1.25 / Math.max(1, S.ne.gh * 1.45)); S.cells.alone = { wm: asp * .5, hm: .5, dens: .5 }; cells.push(S.cells.alone); }
      if (S.tabT) { S.cells.T = { wm: .5, hm: .5 }; cells.push(S.cells.T); }
      if (S.palo) { S.cells.palo = { wm: .44, hm: .6, dens: .6 }; cells.push(S.cells.palo); }
      S.bulloni = S.mat === 'smalto' || S.mat === 'neon' ? [[.03, .06], [.97, .06], [.03, .94], [.97, .94]].map(([a, b]) => [a + (a < .5 ? .01 : -.01), b < .5 ? .07 : .9]) : S.mat === 'legno' ? [[.33, .02], [.67, .02]] : [];
    });
    const D = impacca(cells);
    const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH; const x = cv.getContext('2d');
    schede.forEach(S => { if (S.cells.faccia) dipingi(x, S.cells.faccia, S); if (S.cells.alone) dipingiAlone(x, S.cells.alone, S.ne); if (S.cells.T) dipingiT(x, S.cells.T, S); if (S.cells.palo) dipingiPalo(x, S.cells.palo); });
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    API.__tela = cv; if (!/[?&]insegne4tela\b/.test(Q)) tex.onUpdate = () => { tex.onUpdate = null; setTimeout(() => { if (tex.image === cv) { const im = document.createElement('canvas'); im.width = im.height = 1; API.__tela = null; tex.image = im; } }, 0); };   // la tela liberata dopo l'invio (come freeAfterUpload)
    materiali(tex);
    // la geometria: un gruppo per insegna, una mesh per materiale
    const root = new THREE.Group(); root.name = 'insegne4'; root.userData.keep = true; sc.add(root);
    let vert = 0, disegni = 0;
    schede.forEach(S => {
      const q = S.q, b = S.b; let N = q.N.clone(), P0;
      if (S.tipo === 'piatta' || S.tipo === 'fascia') { const off = S.tipo === 'fascia' ? { dipinta: .004, marmo: .045, tavola: .055 }[S.k.replace('insegna_fascia_', '')] || .004 : S.k === 'insegna_speciale' ? .06 : .046; P0 = q.C.clone().addScaledVector(N, -off);
        S.off = 0; if (S.tipo === 'fascia' && S.mat !== 'muro') { P0.addScaledVector(N, off); S.off = off; } }   // sopra la lastra di serie (che resta: la copre la tavola più grande)
      else if (S.tipo === 'bandiera') { const Nw = q.Nw ? q.Nw.clone() : b ? fuori(b, q.C, new V3().crossVectors(new V3(0, 1, 0), q.N).normalize()) : new V3(0, 0, 1), dist = q.sc < .7 ? 1.22 : .9; P0 = q.C.clone().addScaledVector(Nw, -dist); P0.y = q.C.y + (q.sc < .7 ? .445 : .6); N = Nw; }
      else { const Nw = b ? fuori(b, q.C, S.k === 'insegna_verticale' ? q.N.clone() : new V3().crossVectors(new V3(0, 1, 0), q.N).normalize()) : new V3(0, 0, 1), dist = S.k === 'insegna_verticale' ? .7 : .62; S.lz = dist; P0 = q.C.clone().addScaledVector(Nw, -dist); N = Nw; }
      S.key = q.k + ':' + [q.C.x, q.C.y, q.C.z].map(v => Math.round(v * 3)).join(','); S.P0 = P0; S.Nw = N; S.Tw = new V3(N.z, 0, -N.x); S.o = { W0: S.W0, H0: S.H0, FW: S.FW, FH: S.FH };
      gruppo(S, root);
      SIGNS.push(S);
    });
    if (window.__pv && window.__pv.R && !API.__anteprima) {   // [insegne4] niente compenetrazioni: la tabella cotta per questa città, o i raggi (lenti)
      if (tab) applica(root, tab);   // [apk_finale] la tabella della cottura (nei tasselli o in tasselli/insegne4.json)
      else if (CORR.imp && CORR.imp === window.PV_IMPRONTA_TASS && !/[?&]insegne4prova\b/.test(Q)) applica(root); else risolvi(sc, root);
      unaSola(root); pulisci(sc, schede, !!cotte); }
    SIGNS.forEach(S => { Object.values(S.ms).forEach(o => { if (o) { vert += o.geometry.attributes.position.count; disegni++; } }); if (S.sp) disegni++; });
    STATO.vert = vert; STATO.disegni = disegni; STATO.D = Math.round(D); STATO.n = SIGNS.length;
    window.__insegne4 = SIGNS.map(S => { const wp = new V3(0, 0, 0).applyMatrix4(S.g.matrixWorld), c = (S.centroL || new V3(0, 0, .1)).clone().applyMatrix4(S.g.matrixWorld), n = new V3(0, 0, 1).transformDirection(S.g.matrixWorld);
      return { i: S.idx, id: S.b && S.b.id, tipo: S.tipo, mat: S.mat, testo: S.testo, k: S.k, flk: S.flk, C: [c.x, c.y, c.z], N: [n.x, n.z], muro: [wp.x, wp.y, wp.z], dim: S.dim, telaio: !!S.telaio }; });
    requestAnimationFrame(tick);
  }

  function gruppo(S, root) {
    if (S.g) { root.remove(S.g); S.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); }); }
    const k = S.scala || 1; S.W0 = S.o.W0 * k; S.H0 = S.o.H0 * k; S.FW = S.o.FW * k; S.FH = S.o.FH * k; S.lett = []; S.sp = null; S.extraLuce = null; S.centroL = null;
    const N = S.Nw, g = new THREE.Group(); g.position.copy(S.P0).addScaledVector(S.Tw, S.du || 0); g.position.y += S.dy || 0;
    g.rotation.y = Math.atan2(N.x, N.z); g.updateMatrix(); g.matrixAutoUpdate = false; S.M = new THREE.Matrix4();
    const A = { paint: acc0(), box: acc0(), muro: acc0(), ferro: acc0(), neon: acc0(), alone: acc0() };
    costruisci1(S, A);
    const ms = { paint: mesh(A.paint, MAT.paint, true), box: mesh(A.box, MAT.box, true), muro: mesh(A.muro, MAT.muro, true), ferro: mesh(A.ferro, MAT.ferro), neon: mesh(A.neon, MAT.neon), alone: mesh(A.alone, MAT.alone, true) };
    Object.entries(ms).forEach(([k2, o]) => { if (!o) return; o.updateMatrix(); if (k2 === 'ferro' || k2 === 'paint' || k2 === 'box') { o.castShadow = true; o.receiveShadow = true; } if (k2 === 'alone' || k2 === 'neon') o.renderOrder = 3; g.add(o); });
    S.ms = ms; S.g = g;
    if (S.mat === 'neon' || S.mat === 'cassonetto' || S.extraLuce) {   // il bagliore: uno sprite morbido sopra le insegne accese
      const c = S.centroL ? S.centroL.clone() : new V3(0, 0, .15), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: MAT.gtex, color: new THREE.Color(S.mat === 'cassonetto' ? '#fff0d0' : S.neonC || '#9cff8a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false, toneMapped: false }));
      sp.position.copy(c).add(new V3(0, 0, .25)); const sz = Math.max(S.dim[0], S.dim[1]) * 1.25; sp.scale.set(sz, sz * .7, 1); sp.renderOrder = 4; sp.visible = false; g.add(sp); S.sp = sp; }
    root.add(g); g.updateMatrixWorld(true);
    if (ms.neon) { S.c0 = Float32Array.from(ms.neon.geometry.attributes.color.array); S.lit = {}; } else S.c0 = null;
    if (ms.alone) S.a0 = Float32Array.from(ms.alone.geometry.attributes.color.array);
    return g;
  }
  // =====================================================================================================================================
  // LE COMPENETRAZIONI: la scatola dell'insegna (staccata dal muro di 3,5 cm) attraversata da raggi in tre direzioni contro la geometria
  // vicina (case fuse coi loro balconi, tende, finestre, grondaie; arredi; le altre insegne nuove). Se un raggio tocca: si prova a togliere
  // le aggiunte (croce, T, palo), a spostarla in su o in giù, a staccarla dal muro, a ridurla, a farla scorrere lungo il muro; se niente
  // basta, l'insegna si toglie. STATO.compenetra: prima e dopo
  // =====================================================================================================================================
  const RC = new THREE.Raycaster();
  // la tabella: per chiave [scala, dy, dz, du, senza aggiunte, tolta]; la scrive risolvi() (Insegne4.conti().tab) e si incolla qui sotto
  const CORR = /*CORR*/{"imp":"5566e05b3d398bc3","conti":{"prima":70,"dopo":0,"spostate":30,"ridotte":10,"tolte":37,"senzaAggiunte":3},"v":{"insegna_locale:4250,23,966":[0,0,0.08,0,0,0],"insegna_locale:4131,16,1080":[0,0,0,0,0,1],"insegna_locale:3779,14,1100":[0,-0.25,0,0,0,0],"insegna_locale:4020,13,969":[0,0,0.08,0,0,0],"insegna_locale:4195,20,1084":[0,0,0,0,0,1],"insegna_locale:3921,12,888":[0,0,0,0,0,1],"insegna_locale:3855,16,1074":[0,0,0,0,0,1],"insegna_locale:3974,12,1112":[0,-0.5,0,0,0,0],"insegna_locale:3750,15,1089":[0,0,0.16,0,0,0],"insegna_speciale:3774,20,1074":[0,0,0,0,0,1],"insegna_locale:3873,10,1145":[0.72,0,0.16,0.5,0,0],"insegna_locale:4287,25,1092":[0,-0.4,0.16,0,0,0],"insegna_locale:4363,25,1152":[0.85,0,0.16,0,0,0],"insegna_locale:4250,27,1076":[0,0.5,0,0,0,0],"insegna_locale:3957,12,990":[0.72,0,0.16,0,0,0],"insegna_locale:4386,29,1077":[0,0,0,0,0,1],"insegna_verticale:3749,32,1013":[0,0,0,0,0,1],"insegna_locale:3741,22,1015":[0.6,0,0.16,0,0,0],"insegna_locale:4500,28,1011":[0,0,0.25,0,0,0],"insegna_locale:4047,12,1002":[0,0,0,0,0,1],"insegna_locale:4077,13,1002":[0,0,0,0,0,1],"insegna_locale:4166,19,980":[0,0,0,0,0,1],"insegna_locale:4226,22,962":[0,0,0,0,0,1],"insegna_locale:3764,11,1178":[0,0,0,0,0,1],"insegna_locale:4334,26,864":[0,0,0,0,0,1],"insegna_locale:4376,27,864":[0,0,0,0,0,1],"insegna_locale:4131,16,894":[0.6,0,0.16,0,0,0],"insegna_locale:4290,25,903":[0,0,0,0,0,1],"insegna_locale:4042,12,910":[0,0,0,0,0,1],"insegna_locale:4184,21,914":[0,0,0,0,0,1],"insegna_locale:4320,26,924":[0,0,0,0,0,1],"insegna_locale:4377,28,928":[0,0,0,0,0,1],"insegna_locale:3984,10,926":[0,0,0,0,0,1],"insegna_locale:4175,20,930":[0,0,0,0,0,1],"insegna_locale:4166,19,932":[0,0,0,0,0,1],"insegna_locale:4269,24,966":[0,0,0,0,0,1],"insegna_locale:4357,22,1182":[0,0,0,0,0,1],"bandiera_neon:4264,25,1004":[0,0,0,0,0,1],"bandiera_neon:3759,18,1102":[0,0,0,0,0,1],"bandiera_neon:3988,16,988":[0,0,0,0,0,1],"bandiera_neon:3845,17,1072":[0,0,0,0,0,1],"bandiera_neon:3891,21,1147":[0,0,0,0,0,1],"bandiera_neon:4304,30,1124":[0,0,0,0,0,1],"bandiera_neon:4148,29,1004":[0,0,0,0,0,1],"insegna_fascia_dipinta:4155,17,938":[0.6,-0.1,0,0,0,0],"insegna_fascia_marmo:3918,11,1047":[0,0,0,0,1,0],"insegna_fascia_marmo:3894,11,1101":[0,0,0,0,1,0],"insegna_fascia_marmo:3936,10,1125":[0,0,0,0,0,1],"insegna_fascia_marmo:3759,10,1146":[0.85,-0.1,0,0,0,0],"insegna_fascia_marmo:3771,10,1176":[0,0,0,0,0,1],"insegna_fascia_marmo:3792,10,1176":[0,-0.1,0,0,0,0],"insegna_fascia_dipinta:4272,24,1044":[0,0,0,0,1,0],"insegna_fascia_dipinta:4260,23,1092":[0,0,0,0,0,1],"insegna_fascia_dipinta:4260,23,1122":[0,0,0,0,0,1],"insegna_fascia_tavola:4152,13,1134":[0.72,0.1,0,0,0,0],"insegna_fascia_tavola:4218,18,1140":[0.85,0.1,0,0,0,0],"insegna_fascia_tavola:4263,20,1161":[0.85,0.1,0,0,0,0],"insegna_fascia_dipinta:4338,27,1044":[0,0,0,0,0,1],"insegna_locale:4158,19,934":[0,0,0,0.4,0,0],"insegna_locale:4140,18,1006":[0,0,0,0,0,1],"insegna_locale:4077,15,1056":[0,-0.5,0,0,0,0],"insegna_locale:4198,23,1056":[0,0.5,0,0,0,0],"insegna_locale:3920,12,960":[0,0,0,0.4,0,0],"insegna_locale:3820,14,1110":[0,-0.5,0,0,0,0],"insegna_locale:3798,12,1172":[0,0.25,0,0,0,0],"insegna_locale:4266,26,944":[0,0,0,-0.4,0,0],"insegna_locale:4164,18,1082":[0,0.5,0,0,0,0],"insegna_locale:4020,13,1112":[0,0.5,0,0,0,0],"insegna_locale:4156,14,1128":[0,0.5,0,0,0,0],"insegna_locale:4320,28,941":[0,0.5,0,0,0,0]}}/*FINE*/;
  // UN OGGETTO SOLO per insegna: per casa al più un'insegna nuova (prima quella del locale, poi la fascia, poi la bandiera aggiunta);
  // le insegne tolte (qui o dalle compenetrazioni) non lasciano pezzi: la lastra di serie della fascia (e i suoi faretti), le sbarre della
  // bandiera al neon si scavano dalle mesh fuse; il bucato steso sotto e attorno alle insegne si toglie (panni e filo)
  function unaSola(root) { const pr = S => S.q.agg ? 3 : S.tipo === 'fascia' ? 2 : 1, per = new Map();
    SIGNS.forEach(S => { if (!S.b) return; const k = S.b.id; if (!per.has(k)) per.set(k, []); per.get(k).push(S); });
    per.forEach(L => { if (L.length < 2) return; L.sort((a, b) => pr(a) - pr(b) || a.idx - b.idx); const tenute = [];
      L.forEach(S => { if (tenute.some(K => K.g.position.distanceTo(S.g.position) < 6)) { root.remove(S.g); SIGNS.splice(SIGNS.indexOf(S), 1); STATO.doppioni = (STATO.doppioni || 0) + 1; } else tenute.push(S); }); }); }
  function scava(sc, M, box) {   // i triangoli tutti dentro la scatola (nel riferimento M) diventano nulli, nelle mesh vicine col loro indice
    const inv = new THREE.Matrix4().copy(M).invert(), ws = box.getBoundingSphere(new THREE.Sphere()).applyMatrix4(M), v = new V3(); let n = 0;
    sc.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.userData.insegne4) return; const g = o.geometry, p = g && g.attributes.position; if (!p || !p.array || !p.array.length) return;
      if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingSphere.clone().applyMatrix4(o.matrixWorld).intersectsSphere(ws)) return;
      const T = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), dentro = i => box.containsPoint(v.fromBufferAttribute(p, i).applyMatrix4(T));
      if (g.index) { const I = g.index.array; let ch = false; for (let t = 0; t < I.length; t += 3) if (I[t] !== I[t + 1] && dentro(I[t]) && dentro(I[t + 1]) && dentro(I[t + 2])) { I[t + 1] = I[t + 2] = I[t]; ch = true; n++; } if (ch) g.index.needsUpdate = true; }
      else { let ch = false; for (let t = 0; t + 2 < p.count; t += 3) if (dentro(t) && dentro(t + 1) && dentro(t + 2)) { for (let k = 1; k < 3; k++) p.setXYZ(t + k, p.getX(t), p.getY(t), p.getZ(t)); ch = true; n++; } if (ch) p.needsUpdate = true; } });
    return n; }
  function pulisci(sc, schede, cotte) { const via = cotte ? [] : schede.filter(S => SIGNS.indexOf(S) < 0); let tri = 0;   // [apk_finale] coi tasselli lo scavo è già nella cottura
    via.forEach(S => { const q = S.q, N = q.N.clone(), M = new THREE.Matrix4().makeRotationY(Math.atan2(N.x, N.z)).setPosition(q.C);
      if (/^insegna_fascia_(marmo|tavola)$/.test(S.k)) { tri += scava(sc, M, new THREE.Box3(new V3(-q.w / 2 - .05, -q.h / 2 - .05, -.08), new V3(q.w / 2 + .05, q.h / 2 + .05, .01)));
        if (S.k === 'insegna_fascia_marmo') tri += scava(sc, M, new THREE.Box3(new V3(-q.w / 2, q.h / 2, -.06), new V3(q.w / 2, q.h / 2 + .16, .4))); }
      if (S.k === 'bandiera_neon' && S.P0) { const M2 = new THREE.Matrix4().makeRotationY(Math.atan2(S.Nw.x, S.Nw.z)).setPosition(S.P0); tri += scava(sc, M2, new THREE.Box3(new V3(-.06, q.C.y - S.P0.y - q.h / 2 - .1, -.02), new V3(.06, q.C.y - S.P0.y + q.h / 2 + .1, .7))); } });
    // il bucato: panni e filo sotto e attorno alle insegne rimaste
    const Z = SIGNS.map(S => { const bb = new THREE.Box3(); ['ferro', 'paint', 'box', 'neon', 'muro'].forEach(k => { const o = S.ms[k]; if (o) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox); } });
      bb.min.x -= .6; bb.max.x += .6; bb.min.y -= 1.8; bb.max.y += .4; bb.max.z += .6; return { inv: new THREE.Matrix4().copy(S.g.matrixWorld).invert(), bb }; });
    const vic = p => Z.some(z => z.bb.containsPoint(p.clone().applyMatrix4(z.inv))); let panni = 0, fili = 0; const w = new V3();
    (window.__pv.R.__dyn.laundry || []).forEach(L => { if (L.m && vic(L.m.getWorldPosition(w))) { L.m.visible = false; L.m.scale.setScalar(1e-4); panni++; } });
    if (!cotte) sc.traverse(o => { if (!o.isMesh || o.userData.insegne4 || !o.geometry || o.geometry.type !== 'BoxGeometry') return; const pr = o.geometry.parameters, d = [pr.width, pr.height, pr.depth].sort((a, b) => a - b);
      if (d[0] <= .021 && d[1] <= .021 && d[2] > 1 && vic(o.getWorldPosition(w))) { o.visible = false; fili++; } });
    STATO.pulizia = { triangoliScavati: tri, panni, fili, tolteSenzaResti: via.length }; }
  function applica(root, tab) { const K = { tabella: true, spostate: 0, ridotte: 0, tolte: 0, senzaAggiunte: 0 }, V = tab || CORR.v;
    for (const S of SIGNS.slice()) { const c = V[S.key]; if (!c) continue;
      if (c[5]) { root.remove(S.g); SIGNS.splice(SIGNS.indexOf(S), 1); K.tolte++; continue; }
      S.scala = c[0] || 1; S.dy = c[1] || 0; S.dz = c[2] || 0; S.du = c[3] || 0; if (c[4]) { S.croce = S.tabT = S.palo = false; K.senzaAggiunte++; } if (c[0]) K.ridotte++; if (c[1] || c[2] || c[3]) K.spostate++; gruppo(S, root); }
    STATO.compenetra = Object.assign({}, CORR.conti || {}, K); }
  function candidati(sc) { const L = [];
    sc.traverseVisible(o => { if (!o.isMesh || o.isSkinnedMesh || o.userData.insegne4spenta || o.userData.insegne4) return; const m = Array.isArray(o.material) ? o.material : [o.material];
      if (!m.some(q => q && q.visible !== false && q.blending !== THREE.AdditiveBlending)) return; const g = o.geometry, p = g && g.attributes.position; if (!p || !p.array || !p.array.length) return;
      let sp; if (o.isInstancedMesh) { const bb = new THREE.Box3(), mm = new THREE.Matrix4(); if (!g.boundingBox) g.computeBoundingBox(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mm); bb.union(g.boundingBox.clone().applyMatrix4(mm)); } sp = bb.applyMatrix4(o.matrixWorld).getBoundingSphere(new THREE.Sphere()); }
      else { if (!g.boundingSphere) g.computeBoundingSphere(); sp = g.boundingSphere.clone().applyMatrix4(o.matrixWorld); }
      L.push({ o, s: sp }); });
    return L; }
  function urti(S, C) {
    if (S.mat === 'muro' || !S.g) return 0; const g = S.g, bb = new THREE.Box3();
    ['ferro', 'paint', 'box', 'neon'].forEach(k => { const o = S.ms[k]; if (!o) return; o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox); }); if (bb.isEmpty()) return 0;
    const z0 = Math.max(bb.min.z, S.tipo === 'fascia' ? .05 : S.tipo === 'piatta' ? .095 + (S.dz || 0) : .2), z1 = bb.max.z - .005, x0 = bb.min.x + .015, x1 = bb.max.x - .015, y0 = bb.min.y + .015, y1 = bb.max.y - .015; if (z1 <= z0) return 0;
    const ws = bb.getBoundingSphere(new THREE.Sphere()).applyMatrix4(g.matrixWorld), cand = C.filter(c => c.o.parent !== g && c.s.intersectsSphere(ws)).map(c => c.o); if (!cand.length) return 0;
    const M = g.matrixWorld, l = (a, b, t) => a + (b - a) * t; let n = 0;
    const seg = (a, b) => { a.applyMatrix4(M); b.applyMatrix4(M); const d = b.clone().sub(a), L = d.length(); RC.set(a, d.divideScalar(L)); RC.near = 0; RC.far = L; const h = RC.intersectObjects(cand, false); if (h.length) { n++; if (STATO.diag && STATO.diag.length < 400 && !S.__d) { S.__d = 1; const o = h[0].object, m = Array.isArray(o.material) ? o.material[h[0].face ? h[0].face.materialIndex : 0] : o.material, pl = h[0].point.clone().applyMatrix4(new THREE.Matrix4().copy(M).invert()); STATO.diag.push([S.testo, S.tipo, S.mat, o.name, Object.keys(o.userData).slice(0, 6).join(','), m && m.userData && m.userData.grafica, m && m.type, m && m.color && m.color.getHexString(), +pl.x.toFixed(2), +pl.y.toFixed(2), +pl.z.toFixed(2), o.isInstancedMesh ? 'inst' : '']); } } };
    for (const ty of [.1, .5, .9]) for (const tz of [0, .5, 1]) seg(new V3(x0, l(y0, y1, ty), l(z0, z1, tz)), new V3(x1, l(y0, y1, ty), l(z0, z1, tz)));
    for (const tx of [0, .25, .5, .75, 1]) for (const tz of [0, .6]) seg(new V3(l(x0, x1, tx), y0, l(z0, z1, tz)), new V3(l(x0, x1, tx), y1, l(z0, z1, tz)));
    for (const tx of [0, .25, .5, .75, 1]) for (const ty of [.1, .5, .9]) seg(new V3(l(x0, x1, tx), l(y0, y1, ty), z1), new V3(l(x0, x1, tx), l(y0, y1, ty), z0));
    return n; }
  function risolvi(sc, root) {
    STATO.diag = /[?&]insegne4diag\b/.test(Q) || window.__ins4diag ? [] : null;
    const t0 = performance.now(), C = candidati(sc), K = { tab: {}, imp: window.PV_IMPRONTA_TASS, prima: 0, dopo: 0, spostate: 0, ridotte: 0, tolte: 0, senzaAggiunte: 0 };
    const prove = S => { const v = []; if (S.croce || S.tabT || S.palo) v.push({ agg: 1 });
      if (S.tipo === 'piatta') { [.08, .16, .25].forEach(dz => v.push({ dz })); [.2, -.2, .4, -.4].forEach(dy => v.push({ dy, dz: .16 }));
        [.85, .72, .6].forEach(scala => [0, .25, -.25].forEach(dy => v.push({ scala, dy, dz: .16 }))); [.5, -.5, .9, -.9].forEach(du => v.push({ du, scala: .72, dz: .16 })); }
      else if (S.tipo === 'fascia') { [.1, -.1, .2, -.2].forEach(dy => v.push({ dy })); [.85, .72, .6].forEach(scala => [0, .1, -.1].forEach(dy => v.push({ scala, dy }))); }
      else { [.25, -.25, .5, -.5].forEach(dy => v.push({ dy })); [.4, -.4, .8, -.8].forEach(du => [0, .25].forEach(dy => v.push({ du, dy }))); [.85, .72].forEach(scala => [0, .3].forEach(dy => v.push({ scala, dy }))); }
      return v; };
    for (const S of SIGNS.slice()) {
      let ok = urti(S, C) === 0; if (!ok) K.prima++;
      if (!ok) for (const v of prove(S)) { S.scala = v.scala || 1; S.dy = v.dy || 0; S.dz = v.dz || 0; S.du = v.du || 0; if (v.agg) { S.croce = S.tabT = S.palo = false; S.senzaAgg = true; }
        gruppo(S, root); if (urti(S, C) === 0) { ok = true; if (v.agg) K.senzaAggiunte++; if (v.scala) K.ridotte++; if (v.dy || v.dz || v.du) K.spostate++; break; } }
      if (ok && (S.scala || S.dy || S.dz || S.du || S.senzaAgg)) K.tab[S.key] = [S.scala !== 1 ? S.scala : 0, S.dy || 0, S.dz || 0, S.du || 0, S.senzaAgg ? 1 : 0, 0];
      if (!ok) { K.tab[S.key] = [0, 0, 0, 0, 0, 1]; root.remove(S.g); S.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); SIGNS.splice(SIGNS.indexOf(S), 1); K.tolte++; }
      if (ok) C.push(...Object.values(S.ms || {}).filter(o => o && o.material !== MAT.alone).map(o => ({ o, s: o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld) })));
    }
    for (const S of SIGNS) if (urti(S, C)) K.dopo++;
    K.ms = Math.round(performance.now() - t0); STATO.compenetra = K;
  }
  // =====================================================================================================================================
  // IL GIORNO E LA NOTTE, LO SFARFALLIO (deterministico per insegna: il seme, il tempo a fette)
  // =====================================================================================================================================
  // una lettera: accesa (1), spenta (0), a mezzo (.35). flk 1: le lettere guaste (una su tre, più una scelta dal seme) si spengono a tratti,
  // più spesso di notte; flk 2: ogni 9-14 s l'insegna intera balbetta per quasi un secondo, come all'accensione
  function statoLettera(S, li, t, night) { if (!S.flk) return 1; if (S.flk === 2) { const ph = t % (9 + (S.seed % 6)); if (ph < .9) return h01(S.seed + Math.floor(t * 14)) < .5 ? 0 : 1; return 1; }
    const g2 = (S.seed + li * 7) % 3 === 0 || li === (S.seed % Math.max(1, S.ne ? S.ne.n : 1)); if (!g2) return 1;
    const h = h01(S.seed * 31 + li * 977 + Math.floor(t * (2.5 + (S.seed % 5)) + li * .37)); const p = .1 + .3 * night; return h < p ? 0 : h < p + .08 ? .35 : 1; }
  API.__statoLettera = statoLettera;
  let lastNight = -1;
  function tick() {
    if (window.__ins4gen !== GEN) return; requestAnimationFrame(tick); const pv = window.__pv, AN = API.__anteprima; if (!AN && (!pv || !pv.R || !pv.st)) return;
    const night = AN ? AN.notte : Math.max(0, Math.min(1, pv.R.nightLevel(pv.st.t))), t = AN && AN.t !== undefined ? AN.t : performance.now() / 1000, cam = AN ? AN.cam : pv.R.getCamera();
    if (Math.abs(night - lastNight) > .005) { lastNight = night;
      MAT.neon.color.setScalar(.62 + night * .55); MAT.alone.opacity = night * .95; MAT.box.emissiveIntensity = .1 + night * 1.05; }
    const vis = night > .02;
    for (const S of SIGNS) {
      const far = cam ? S.g.position.distanceToSquared(cam.position) > 120 * 120 : false;
      if (S.ms.alone) S.ms.alone.visible = vis && !far;
      if (S.sp) { S.sp.visible = vis && !far; if (vis) S.sp.material.opacity = night * (S.mat === 'cassonetto' ? .22 : .4); }
      if (far || !S.ms.neon) continue;
      // le lettere: accese (1), spente (0), a mezzo (.35); solo dove c'è un guasto
      let lit = 0, tot = 0, changed = false;
      const att = S.c0, col = S.ms.neon.geometry.attributes.color;
      const stato = li => statoLettera(S, li, t, night);
      const st = {}; S.lett.forEach(L => { if (st[L.li] === undefined) st[L.li] = stato(L.li); });
      S.lett.forEach(L => { const v = st[L.li]; tot += L.n; lit += L.n * v; if (S.lit[L.li] !== v) { changed = true; for (let j = L.s * 3; j < (L.s + L.n) * 3; j++) col.array[j] = att[j] * (v === 1 ? 1 : v === 0 ? .18 : .5); } });
      if (changed) { S.lett.forEach(L => { S.lit[L.li] = st[L.li]; }); col.needsUpdate = true;
        if (S.ms.alone) { const k = tot ? lit / tot : 1, ac = S.ms.alone.geometry.attributes.color; for (let j = 0; j < ac.array.length; j++) ac.array[j] = S.a0[j] * k; ac.needsUpdate = true; } }
      if (S.sp && vis && S.mat === 'neon') S.sp.material.opacity = night * .4 * (tot ? lit / tot : 1);
    }
  }

  // ---- l'aggancio: a città fatta (main.js __tl.compilato), una volta ----
  API.conti = () => Object.assign({}, STATO, { tela: AW + '×' + AH, telaMB: +(AW * AH * 4 * 4 / 3 / 1048576).toFixed(1) });
  API.SIGNS = SIGNS;
  // [apk_finale] per la cottura dei tasselli (tassella_pagina.js → dati.json): i posti e le correzioni di questa città
  API.cotto = () => STATO.fatto && !STATO.cotte && STATO.q ? { q: STATO.q, tab: (STATO.compenetra && STATO.compenetra.tab) || CORR.v } : null;
  // l'anteprima (gli strumenti, fuori dal gioco): voci { q: {k, C, N, w, h, sc}, F: scelte forzate } su una scena qualsiasi
  API.__prova = async (voci, sc) => { API.__anteprima = API.__anteprima || { notte: 0, cam: null }; const schede = voci.map((v, i) => scheda(v.q, i, v.F)); await monta(schede, sc); return SIGNS; };
  API.__tick = () => tick;
  // le insegne che nascono dopo (i pezzi della città costruiti più tardi): ogni 5 s si guarda se ce n'è una di serie ancora accesa; se sì
  // si rifà tutto (una volta ogni tanto, ~1,5 s: la tela e le mesh nuove, le vecchie liberate)
  const nuove = () => { const pv = window.__pv; if (!STATO.fatto || STATO.cotte || STATO.lavoro || !pv || !pv.R || window.__ins4gen !== GEN) return; let n = 0;
    pv.R.__models.scene.traverse(o => { if (n || !o.isMesh || o.userData.insegne4 || o.userData.insegne4spenta) return; const m = Array.isArray(o.material) ? o.material : [o.material]; if (!m.some(q => q && q.userData && KINDS.test(q.userData.grafica || ''))) return; if (!m.some(q => q && q.visible !== false && KINDS.test(q.userData.grafica || ''))) { o.visible = false; o.userData.insegne4spenta = true; return; } const p = o.geometry && o.geometry.attributes.position; if (p && p.array && p.array.length) n++; else { o.visible = false; m.forEach(q => { if (q && KINDS.test(q.userData.grafica || '')) q.visible = false; }); o.userData.insegne4spenta = true; } });
    if (n) { STATO.lavoro = true; STATO.rifatte = (STATO.rifatte || 0) + 1; avvia().catch(e => { STATO.err = String(e); }).then(() => { STATO.lavoro = false; }); } };
  const prova = () => { const pv = window.__pv; if (!STATO.avviato && window.__tl && window.__tl.compilato && pv && pv.R && pv.R.__models && pv.R.__models.scene && pv.G && pv.G.BUILDINGS) { STATO.avviato = true; avvia().catch(e => { STATO.err = String(e && e.stack || e); console.error('[insegne4]', e); }).then(libera); setInterval(nuove, 5000); return; } if (!STATO.avviato) setTimeout(prova, 400); };
  if (typeof window !== 'undefined') setTimeout(prova, 400);
  return API;
})();
if (typeof module !== 'undefined') module.exports = Insegne4;
