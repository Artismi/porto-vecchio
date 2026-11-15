/* [unico] unico_striscione.js: LO STRISCIONE FATTO A MANO (dietro ?commedia). Spento il flag: UnicoStriscione = { ON: false }.
   Sopra unico_parti_vivo.js (il disegno del cantiere: UV.extra) e unico_cultura.js (il nome, il simbolo, i colori del gruppo). Il direttore
   artistico sul presidio: «lo striscione è brutto: VIA NOSTRA in rosso contornato di nero, stirato a caso in mezzo». Qui la scritta del
   presidio (la parte «scritta» di GEN.presidio) diventa un panno vero, dipinto a mano:
   - IL PANNO: una tela suddivisa (40 × 8) che pende fra i due pali (la catenaria, la pancia del vento, le pieghe di tensione che partono
     dagli angoli legati), due facce (la scritta si legge dai due versi, mai a specchio), una sola chiamata di disegno col resto del cantiere.
   - LE CORDE: dagli angoli ai pali (il giro attorno al palo, il nodo); se di lato c'è una casa a meno di 6 m (Ingombri), una corda in più
     dall'angolo alto a un gancio nel muro (la facciata: un ferro e l'anello).
   - LA SCRITTA DIPINTA: lettere a pennello disegnate qui (un alfabeto a tratti, niente caratteri di sistema né di rete): la linea che
     scende un po', le lettere di misura diversa, ognuna storta a modo suo, le colature di vernice, a volte le ultime lettere strette
     (lo spazio finito) o una lettera sbagliata coperta col bianco e ridipinta giusta sopra. La scritta si legge SEMPRE giusta: niente
     lettere mancanti né aggiunte di fianco (la lettera dimenticata con la freccetta si leggeva come un errore vero, «VIA NOSTA» e una R
     per aria). La misura si adatta al panno (una o due righe), mai stirata. Il simbolo del gruppo dipinto a mano a un capo (UnicoCultura.disegna).
   - IL TIPO DI PANNO dalla cultura del gruppo (il disegno del simbolo, cioè le cose della sua storia) o dal seme: il lenzuolo di casa
     (bianco sporco, il bordo a righe, lettere nel colore del gruppo con l'ombra d'inchiostro), il telone di plastica (blu o verde, gli
     occhielli, la scritta a spruzzo carta col contorno), la stoffa colorata (il colore del gruppo, le lettere carta). In più, quando ci
     stanno: il cartello di cartone appoggiato alla cassa (pennarello) e il lenzuolo appeso alla ringhiera di un balcone della casa accanto.
   Tavolozza di BIBBIA_STILE.md (mai i colori riservati al gioco). Le tele si fanno una volta (cache per testo, tipo, misura). */
var UnicoStriscione = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q) && !/[?&]striscione=0\b/.test(Q);   // &striscione=0: spento (le foto «prima»)
  const US = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = US;
  if (!ON) return US;
  const V = typeof UnicoPartiVivo !== 'undefined' && UnicoPartiVivo.ON ? UnicoPartiVivo : null;
  const UP = typeof UnicoParti !== 'undefined' && UnicoParti.ON ? UnicoParti : null;
  const UC = typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null;
  if (!V || !UP || !UC || typeof window === 'undefined' || typeof document === 'undefined' || typeof THREE === 'undefined') { US.ON = false; return US; }
  const T3 = THREE, PI = Math.PI, hashS = UP.hashS, D2 = PI / 180;
  const INK = '#16121B', CARTA = '#F2E7CF';
  const UCu = () => (typeof UnicoCultura !== 'undefined' && UnicoCultura.ON ? UnicoCultura : null);
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const stats = US.stats = { tele: 0, panni: 0, muri: 0, balconi: 0, cartoni: 0 };

  // ======================= L'ALFABETO A PENNELLO (tratti in unità d'altezza: 0 in alto, 1 alla base) =======================
  const arc = (cx, cy, rx, ry, a0, a1, n) => { const o = []; n = n || 8; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  const GL = {
    A: [.8, [[[0, 1], [.4, 0], [.8, 1]], [[.17, .64], [.63, .64]]]],
    B: [.68, [[[0, 1], [0, 0], [.42, 0]].concat(arc(.42, .24, .22, .24, -90, 90, 6), [[0, .48]]), [[0, .48], [.44, .48]].concat(arc(.44, .74, .24, .26, -90, 90, 6), [[0, 1]])]],
    C: [.72, [arc(.42, .5, .4, .5, -40, -320, 12)]],
    D: [.72, [[[0, 0], [0, 1]], [[0, 0], [.3, 0]].concat(arc(.3, .5, .4, .5, -90, 90, 10), [[0, 1]])]],
    E: [.6, [[[.6, 0], [0, 0], [0, 1], [.6, 1]], [[0, .5], [.48, .5]]]],
    F: [.58, [[[.58, 0], [0, 0], [0, 1]], [[0, .48], [.46, .48]]]],
    G: [.78, [arc(.42, .5, .4, .5, -40, -330, 12).concat([[.8, .56], [.5, .56]])]],
    H: [.72, [[[0, 0], [0, 1]], [[.72, 0], [.72, 1]], [[0, .5], [.72, .5]]]],
    I: [.12, [[[.06, 0], [.06, 1]]]],
    J: [.55, [[[.55, 0], [.55, .7]].concat(arc(.28, .7, .27, .3, 0, 180, 6))]],
    K: [.68, [[[0, 0], [0, 1]], [[.66, 0], [0, .6]], [[.22, .44], [.7, 1]]]],
    L: [.55, [[[0, 0], [0, 1], [.55, 1]]]],
    M: [.9, [[[0, 1], [.05, 0], [.45, .62], [.85, 0], [.9, 1]]]],
    N: [.74, [[[0, 1], [0, 0], [.74, 1], [.74, 0]]]],
    O: [.84, [arc(.42, .5, .42, .5, 0, 360, 16)]],
    P: [.64, [[[0, 1], [0, 0], [.38, 0]].concat(arc(.38, .26, .26, .26, -90, 90, 6), [[0, .52]])]],
    Q: [.84, [arc(.42, .5, .42, .5, 0, 360, 16), [[.5, .7], [.86, 1.06]]]],
    R: [.68, [[[0, 1], [0, 0], [.4, 0]].concat(arc(.4, .26, .26, .26, -90, 90, 6), [[0, .52]]), [[.32, .52], [.7, 1]]]],
    S: [.64, [[[.62, .12], [.45, 0], [.2, 0], [.03, .12], [.04, .34], [.3, .47], [.58, .58], [.66, .8], [.52, .97], [.25, 1], [0, .88]]]],
    T: [.7, [[[0, 0], [.7, 0]], [[.35, 0], [.35, 1]]]],
    U: [.72, [[[0, 0], [0, .64]].concat(arc(.36, .64, .36, .36, 180, 0, 8), [[.72, 0]])]],
    V: [.76, [[[0, 0], [.38, 1], [.76, 0]]]],
    W: [1, [[[0, 0], [.22, 1], [.5, .35], [.78, 1], [1, 0]]]],
    X: [.7, [[[0, 0], [.7, 1]], [[.7, 0], [0, 1]]]],
    Y: [.7, [[[0, 0], [.35, .5], [.7, 0]], [[.35, .5], [.35, 1]]]],
    Z: [.66, [[[0, 0], [.66, 0], [0, 1], [.66, 1]]]],
    0: [.6, [arc(.3, .5, .3, .5, 0, 360, 14)]], 1: [.34, [[[.04, .2], [.28, 0], [.28, 1]]]],
    2: [.62, [[[.04, .2], [.2, .02], [.42, 0], [.6, .15], [.58, .38], [0, 1], [.62, 1]]]], 3: [.6, [[[.04, .08], [.3, 0], [.55, .12], [.55, .36], [.28, .48], [.58, .6], [.6, .86], [.35, 1], [.02, .92]]]],
    4: [.66, [[[.48, 1], [.48, 0], [0, .7], [.66, .7]]]], 5: [.6, [[[.6, 0], [.08, 0], [.03, .45], [.35, .4], [.6, .55], [.6, .85], [.35, 1], [.02, .92]]]],
    6: [.62, [[[.55, .05], [.3, 0], [.05, .25], [.02, .7], [.2, 1], [.48, 1], [.62, .8], [.55, .55], [.3, .48], [.05, .62]]]], 7: [.62, [[[0, 0], [.62, 0], [.2, 1]]]],
    8: [.6, [arc(.3, .25, .24, .25, 0, 360, 12), arc(.3, .74, .3, .26, 0, 360, 12)]], 9: [.62, [[[.07, .95], [.32, 1], [.57, .75], [.6, .3], [.42, 0], [.14, 0], [0, .2], [.07, .45], [.32, .52], [.57, .38]]]],
    '!': [.16, [[[.08, 0], [.08, .64]], [[.08, .93], [.085, .95]]]], '?': [.56, [[[0, .18], [.15, 0], [.42, 0], [.56, .18], [.5, .36], [.28, .5], [.28, .68]], [[.28, .93], [.285, .95]]]],
    '.': [.14, [[[.07, .93], [.075, .95]]]], ',': [.14, [[[.08, .9], [.03, 1.08]]]], '\'': [.12, [[[.07, -.02], [.04, .2]]]], '-': [.42, [[[0, .55], [.42, .55]]]],
    ':': [.14, [[[.07, .3], [.075, .32]], [[.07, .93], [.075, .95]]]], '«': [.55, [[[.3, .3], [.05, .5], [.3, .7]], [[.55, .3], [.3, .5], [.55, .7]]]], '»': [.55, [[[.25, .3], [.5, .5], [.25, .7]], [[0, .3], [.25, .5], [0, .7]]]],
  };
  const ACC = { 'À': 'A', 'Á': 'A', 'È': 'E', 'É': 'E', 'Ì': 'I', 'Í': 'I', 'Ò': 'O', 'Ó': 'O', 'Ù': 'U', 'Ú': 'U' };
  // un carattere → [larghezza, tratti] (le accentate: la lettera con l'accento sopra); lo spazio: null
  function glifo(ch) {
    if (GL[ch]) return GL[ch];
    const b = ACC[ch]; if (b) { const g = GL[b], gr = 'ÀÈÌÒÙ'.includes(ch); return [g[0], g[1].concat([[[g[0] / 2 + (gr ? -.1 : .1), -.3], [g[0] / 2 + (gr ? .08 : -.08), -.1]]])]; }
    return null;
  }
  const rngDi = s => UP.rngDi(s);

  // ======================= IL PENNELLO: un tratto morbido, la larghezza che respira, le colature =======================
  // P: punti in px; w: la larghezza; r: il caso del tratto
  function denso(P, passo) {
    // un giro di Chaikin leggero (gli spigoli appena smussati, come un pennello che gira) e poi punti ogni «passo» px
    let L = P; if (L.length > 2) { const o = [L[0]]; for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1]; o.push([a[0] * .85 + b[0] * .15, a[1] * .85 + b[1] * .15], [a[0] * .15 + b[0] * .85, a[1] * .15 + b[1] * .85]); } o.push(L[L.length - 1]); L = o; }
    const out = [L[0]]; for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / passo)); for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    return out;
  }
  function tratto(x, P, w, col, r, morbido) {
    const D = denso(P, Math.max(2, w * .35)); if (D.length < 2) { x.fillStyle = col; x.beginPath(); x.arc(P[0][0], P[0][1], w * .55, 0, 7); x.fill(); return; }
    x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round';
    const f0 = r() * 6, f1 = .7 + r() * .6;
    // la pressione: più piena all'attacco, si assottiglia alla fine (il pennello si scarica)
    for (let i = 1; i < D.length; i++) {
      const k = i / (D.length - 1), pr = (.92 + .14 * Math.sin(f0 + i * .23 * f1)) * (1.06 - .2 * k * k);
      x.lineWidth = w * pr; x.beginPath(); x.moveTo(D[i - 1][0], D[i - 1][1]); x.lineTo(D[i][0], D[i][1]); x.stroke();
    }
    if (morbido) return;
    // il segno delle setole: due righe appena più chiare lungo il tratto (larghe 2 px, niente puntini)
    x.save(); x.globalAlpha = .1; x.strokeStyle = '#FFFFFF'; x.lineWidth = Math.max(2, w * .1);
    for (const o of [-.2]) { x.beginPath(); for (let i = 0; i < D.length; i++) { const a = D[Math.max(0, i - 1)], b = D[Math.min(D.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, px = D[i][0] - dy / L * w * o, py = D[i][1] + dx / L * w * o; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); }
    x.restore();
  }
  function colatura(x, px, py, w, len, col) {
    x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round'; x.lineWidth = w;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + w * .2, py + len * .6, px + w * .05, py + len); x.stroke();
    x.beginPath(); x.ellipse(px + w * .05, py + len, w * .62, w * .8, 0, 0, 7); x.fill();
  }

  // ======================= LA SCRITTA: misure, impaginato, i difetti di chi dipinge =======================
  // le lettere di una riga con le loro misure (in unità di altezza): [ch, glifo, scala x, scala y, rot, dy]
  function riga(testo, r, stretta) {
    const L = []; let w = 0; const n = testo.length;
    for (let i = 0; i < n; i++) {
      const ch = testo[i]; if (ch === ' ') { L.push([' ', null, 1, 1, 0, 0]); w += .42; continue; }
      const g = glifo(ch); if (!g) continue;
      const sy = .9 + r() * .2, sx = sy * (stretta && i >= n - 3 ? .76 - (i - (n - 3)) * .05 : 1) * (.94 + r() * .1), rot = (r() - .5) * .12, dy = (r() - .5) * .08;
      L.push([ch, g, sx, sy, rot, dy]); w += g[0] * sx + .2;
    }
    return { L, w: w - .2 };
  }
  function righe(testo) {
    const t = testo.trim(); if (!t.includes(' ')) return [t];
    // il taglio più bilanciato fra due righe
    let best = [t], bd = Infinity; const P = t.split(' ');
    for (let k = 1; k < P.length; k++) { const a = P.slice(0, k).join(' '), b = P.slice(k).join(' '), d = Math.abs(a.length - b.length); if (d < bd) { bd = d; best = [a, b]; } }
    return best;
  }
  // dipinge il testo nel riquadro (x0, y0, W, H): la misura più grande che ci sta, una o due righe
  const misura = (Ls, bw, bh, stretta) => { const R = Ls.map(t => riga(t, rngDi('m' + t), stretta)), wmax = Math.max(...R.map(q => q.w)), n = Ls.length, gap = .28; return { R, s: Math.min(bh / (n + gap * (n - 1) + .22), bw / (wmax + .1)) }; };
  // una riga o due: quella che fa le lettere più grandi
  function impagina(testo, bw, bh) { const una = [testo], due = righe(testo); if (due.length < 2) return una; return misura(due, bw, bh).s > misura(una, bw, bh).s * 1.12 ? due : una; }
  function scritta(x, Ls, box, S) {
    const [bx, by, bw, bh] = box, M = misura(Ls, bw, bh, S.stretta);
    const s = M.s, n = M.R.length, gap = .28 * s, alto = n * s + (n - 1) * gap, yTop = by + (bh - alto) / 2 + .06 * s;
    const pennello = s * S.spessore, colature = [];
    M.R.forEach((Rg, ri) => {
      const r2 = rngDi(S.seme + '|riga' + ri), tot = Rg.w * s, xl = bx + (bw - tot) / 2 + (r2() - .5) * .1 * s, pend = (r2() - .35) * .1 * s;   // la riga scende (o sale) un poco
      let cx = xl; const base = yTop + ri * (s + gap);
      Rg.L.forEach(([ch, g, sx, sy, rot, dy], li) => {
        if (!g) { cx += .42 * s; return; }
        const gw = g[0] * sx * s, gh = sy * s, ox = cx, oy = base + (s - gh) + dy * s + pend * ((cx - xl) / Math.max(1, tot));
        const lettera = (col, w, morbido, alfa) => { x.save(); x.globalAlpha = alfa || 1; x.translate(ox + gw / 2, oy + gh / 2); x.rotate(rot); x.translate(-gw / 2, -gh / 2);
          for (const T of g[1]) tratto(x, T.map(p => [p[0] * sx * s, p[1] * gh]), w, col, rngDi(S.seme + ch + li + ri + T.length), morbido); x.restore(); };
        // la lettera sbagliata coperta col bianco (fondo) e ridipinta sopra
        if (S.corretta && S.corretta[0] === ri && S.corretta[1] === li) {
          const sb = glifo(S.corretta[2]); if (sb) { x.save(); x.translate(ox + gw / 2, oy + gh / 2); x.rotate(-rot); x.translate(-gw / 2, -gh / 2); for (const T of sb[1]) tratto(x, T.map(p => [p[0] * gw / sb[0], p[1] * gh]), pennello, S.lettere, rngDi('sb' + T.length), true); x.restore(); }
          x.save(); x.fillStyle = S.toppa; x.globalAlpha = .93; x.beginPath(); const rr = rngDi(S.seme + 'toppa'); for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2, R0 = (.9 + rr() * .14); x.lineTo(ox + gw / 2 + Math.cos(a) * (gw / 2 + pennello * .6) * R0 * 1.05, oy + gh / 2 + Math.sin(a) * (gh / 2 + pennello * .6) * R0); } x.closePath(); x.fill(); x.restore();
        }
        lettera(S.lettere, pennello, S.morbido);
        // le colature: dai tratti che toccano la base, una ogni tanto
        if (S.cola && rngDi(S.seme + 'c' + ri + li)() < S.cola) { const T = g[1][0], p = T.reduce((a, b) => (b[1] > a[1] ? b : a)); colature.push([ox + p[0] * sx * s, oy + Math.min(1, p[1]) * gh - pennello * .1, pennello * .42, (.12 + rngDi(S.seme + 'cl' + li)() * .3) * s]); }
        cx += gw + .2 * s;
      });
    });
    for (const c of colature) colatura(x, c[0], c[1], c[2], c[3], S.lettere);
    return s;
  }
  // le scelte di chi dipinge (dal seme): una lettera sbagliata coperta e ridipinta giusta, le ultime strette. Il testo resta quello intero
  function difetti(Ls, seme) {
    const r = rngDi(seme + '|difetti'), R = Ls.slice(), o = { stretta: r() < .3, corretta: null };
    const roll = r();
    if (roll < .45) {   // una lettera sbagliata coperta e ridipinta (sopra, la lettera giusta: si legge giusto)
      const cand = []; R.forEach((t, ri) => { for (let i = 1; i < t.length; i++) if (/[A-Z]/.test(t[i])) cand.push([ri, i]); });
      if (cand.length) { const [ri, i] = cand[Math.floor(r() * cand.length)], sb = { A: 'R', E: 'F', O: 'Q', R: 'P', S: 'Z', T: 'I', N: 'M', I: 'L', L: 'I', C: 'G' }[R[ri][i]] || 'X'; o.corretta = [ri, i, sb]; }
    }
    o.righe = R; return o;
  }

  // ======================= I PANNI: lenzuolo, telone, stoffa, cartone =======================
  const TIPI = {
    lenzuolo: { fondo: '#EEE4CC', bordo: '#A3D4D8', spessore: .2, cola: .35, morbido: false, ombraK: 1 },
    telo: { fondo: '#2F60B5', bordo: null, spessore: .2, cola: .15, morbido: true, ombraK: 0 },
    stoffa: { fondo: '#DC9A34', bordo: null, spessore: .2, cola: .25, morbido: false, ombraK: 0 },
    cartone: { fondo: '#B98E5C', bordo: null, spessore: .13, cola: 0, morbido: true, ombraK: 0 },
  };
  // il tipo dalla cultura (le cose della storia del gruppo, il simbolo) o dal seme
  function tipoDi(C, c) {
    const d = c && c.sim && c.sim.d, h = hashS(C.id + '|panno');
    if (d && /lamiera|furgone|cassa|ruota|bidone/.test(d)) return 'telo';
    if (d && /fiore|pentola|sole|luna|pesce|sedia|tavolo/.test(d)) return 'lenzuolo';
    return h < .5 ? 'lenzuolo' : h < .75 ? 'telo' : 'stoffa';
  }
  // i colori: dalla tavolozza del gruppo (il colore del gruppo, il secondo del simbolo); i telo blu o verde
  function colori(tipo, c, C) {
    const col = c && c.sim ? c.sim.c : null, h = hashS(C.id + '|col');
    if (tipo === 'lenzuolo') return { fondo: '#EEE4CC', lettere: col ? col[0] : '#C25B36', ombra: INK, toppa: '#F6EEDA' };
    if (tipo === 'telo') { const f = col && /#2F60B5|#3F8A50|#2A8A8A|#6B3D9B|#3D3548/.test(col[0]) ? col[0] : h < .6 ? '#2F60B5' : '#3F8A50'; return { fondo: f, lettere: CARTA, contorno: INK, toppa: f }; }
    if (tipo === 'stoffa') { const f = col ? col[0] : '#DC9A34'; return { fondo: f, lettere: CARTA, contorno: INK, toppa: f }; }
    return { fondo: '#B98E5C', lettere: INK, toppa: '#C49A68' };
  }
  const TELE = {};
  // la tela del panno: W × H px (asp = larghezza/altezza), il testo, il simbolo, il tipo
  function tela(testo, sim, tipo, asp, seme, colo) {
    const k = [testo, JSON.stringify(sim || 0), tipo, asp.toFixed(2), seme].join('|'); if (TELE[k]) return TELE[k];
    const H = tipo === 'cartone' ? 160 : 192, W = Math.min(2048, Math.max(64, Math.round(H * asp / 4) * 4)), c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const T = TIPI[tipo], col = colo, r = rngDi(seme + '|tela');
    // il fondo: il colore del panno e le pieghe in larghe bande morbide (niente grana)
    x.fillStyle = col.fondo; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(22,18,27,.10)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < Math.round(W / 220); i++) { const cx = r() * W, w = 60 + r() * 120, gg = x.createLinearGradient(cx - w, 0, cx + w, 0); gg.addColorStop(0, 'rgba(22,18,27,0)'); gg.addColorStop(.5, 'rgba(22,18,27,.07)'); gg.addColorStop(1, 'rgba(22,18,27,0)'); x.fillStyle = gg; x.fillRect(cx - w, 0, 2 * w, H); }
    if (tipo === 'lenzuolo') { x.fillStyle = 'rgba(163,212,216,.75)'; for (const y of [.07, .11, .89, .93]) x.fillRect(0, Math.round(y * H), W, Math.max(3, Math.round(H * .018))); x.strokeStyle = 'rgba(22,18,27,.18)'; x.lineWidth = 3; x.strokeRect(5, 5, W - 10, H - 10); }
    if (tipo === 'telo') { x.strokeStyle = 'rgba(22,18,27,.35)'; x.lineWidth = 4; x.strokeRect(6, 6, W - 12, H - 12); for (let u = 30; u < W - 10; u += 150) for (const y of [16, H - 16]) { x.fillStyle = '#9a9ca2'; x.beginPath(); x.arc(u, y, 8, 0, 7); x.fill(); x.fillStyle = INK; x.beginPath(); x.arc(u, y, 4, 0, 7); x.fill(); } }
    if (tipo === 'stoffa') { x.strokeStyle = 'rgba(22,18,27,.25)'; x.lineWidth = 4; x.strokeRect(5, 5, W - 10, H - 10); }
    if (tipo === 'cartone') { x.strokeStyle = 'rgba(111,43,46,.18)'; x.lineWidth = 3; for (let y = 14; y < H; y += 18) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } x.fillStyle = 'rgba(22,18,27,.12)'; x.fillRect(0, 0, W, 6); }
    // il simbolo a un capo (dipinto a mano: un po' storto), dove c'è posto
    const pad = H * .12; let bx = pad, bw = W - 2 * pad;
    const tondo = W / H > 3.2 && tipo !== 'cartone';
    if (tondo) { const S0 = sim ? H * .74 : H * .52, sinistra = r() < .5, sx = sinistra ? pad * .6 : W - pad * .6 - S0;
      if (sim && UCu() && UCu().disegna) { x.save(); x.translate(sx + S0 / 2, H / 2); x.rotate((r() - .5) * .16); UCu().disegna(x, sim, -S0 / 2, -S0 / 2, S0); x.restore(); } else stella(x, sx + S0 / 2, H / 2, S0 / 2, col.lettere, r);
      if (sinistra) { bx = sx + S0 + pad * .5; bw = W - pad - bx; } else { bx = pad; bw = sx - pad * .5 - pad; } }
    bx += bw * .03; bw *= .94;   // un po' d'aria fra la scritta e il simbolo (il tratto del pennello sborda dalla misura delle lettere)
    const box = [bx, H * .1, bw, H * .8], D = difetti(impagina(testo, bw, box[3]), seme);
    // le righe come le ha decise difetti(): il testo intero, sempre
    const S = { seme, lettere: col.lettere, toppa: col.toppa, spessore: T.spessore, cola: T.cola, morbido: T.morbido, stretta: D.stretta, corretta: D.corretta };
    if (col.ombra) { x.save(); x.translate(H * .016, H * .02); scritta(x, D.righe, box, Object.assign({}, S, { lettere: col.ombra, cola: 0, corretta: null, morbido: true })); x.restore(); }
    if (col.contorno) scritta(x, D.righe, box, Object.assign({}, S, { lettere: col.contorno, spessore: S.spessore * 1.7, cola: 0, corretta: null, morbido: true }));
    scritta(x, D.righe, box, S);
    const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 4; stats.tele++;
    return (TELE[k] = new T3.MeshStandardMaterial({ map: t, roughness: .95, metalness: 0 }));
  }
  function stella(x, cx, cy, R, col, r) {
    x.save(); x.translate(cx, cy); x.rotate((r() - .5) * .3); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = (i % 2 ? .42 : 1) * R * (.95 + r() * .1); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath();
    x.fillStyle = col; x.fill(); x.lineWidth = Math.max(3, R * .1); x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke(); x.restore();
  }
  US.tela = tela;

  // ======================= LA GEOMETRIA: il panno che pende, le corde =======================
  const GEO = {};
  // il panno nello spazio del gruppo del cantiere (X di traverso, Y su, Z lungo la via): dagli angoli alti (±Lc/2, ht), alto Hc, la pancia
  // «sag», il vento «b» (verso +Z o −Z); due facce (la seconda con le u rovesciate: la scritta si legge dritta anche da dietro)
  function panno(Lc, Hc, ht, sag, b, seme, nx, ny) {
    const k = [Lc, Hc, ht, sag, b, seme].map(v => typeof v === 'number' ? v.toFixed(3) : v).join('|'); if (GEO[k]) return GEO[k];
    nx = nx || 40; ny = ny || 8; const r = rngDi(seme + '|pieghe'), f1 = 1.8 + r() * 1.2, f2 = r() * 6;
    const P = [], N = [], UV = [], pos = (u, v) => {
      const xx = (u - .5) * Lc, ar = 4 * u * (1 - u);
      const y = ht - sag * ar * (1 + .35 * v) - v * Hc * (1 - .03 * ar);
      let z = b * Math.sin(PI * u) * (.35 + .65 * v);
      // le pieghe di tensione dagli angoli alti (in diagonale), e qualche onda morbida in mezzo
      for (const c of [0, 1]) { const du = Math.abs(u - c) * Lc, fade = Math.exp(-du / .9) * (1 - v * .5); z += .045 * fade * Math.sin((du * 1.1 - v * Hc * 1.4) * 8 + c * 2); }
      z += .018 * Math.sin(u * Lc * f1 + f2 + v * 1.2) * (.4 + .6 * v);
      return [xx, y, z];
    };
    const V = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) V.push(pos(i / nx, j / ny));
    const idx = (i, j) => j * (nx + 1) + i;
    // le normali dalle differenze (la faccia davanti guarda −Z: chi viene da −y legge la scritta)
    const nor = (i, j) => { const a = V[idx(Math.min(nx, i + 1), j)], b0 = V[idx(Math.max(0, i - 1), j)], c = V[idx(i, Math.min(ny, j + 1))], d = V[idx(i, Math.max(0, j - 1))]; const ux = a[0] - b0[0], uy = a[1] - b0[1], uz = a[2] - b0[2], vx = d[0] - c[0], vy = d[1] - c[1], vz = d[2] - c[2]; let nx0 = uy * vz - uz * vy, ny0 = uz * vx - ux * vz, nz0 = ux * vy - uy * vx; const L = Math.hypot(nx0, ny0, nz0) || 1; return [nx0 / L, ny0 / L, nz0 / L]; };
    const faccia = (dietro) => { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]], tri = dietro ? [q[0], q[2], q[1], q[3], q[5], q[4]] : q;
      for (const [a, c] of tri) { const p = V[idx(a, c)], n = nor(a, c), s = dietro ? 1 : -1; P.push(p[0], p[1], p[2] + (dietro ? .006 : -.006)); N.push(n[0] * s, n[1] * s, n[2] * s); UV.push(dietro ? a / nx : 1 - a / nx, 1 - c / ny); } } };
    faccia(false); faccia(true);
    const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(UV, 2)); g.computeBoundingSphere();
    return (GEO[k] = g);
  }
  // una corda che pende fra due punti (tubo a 4 lati), e il nodo
  function corda(a, b, cad) {
    const k = 'c' + a.concat(b).map(v => v.toFixed(2)).join(',') + cad; if (GEO[k]) return GEO[k];
    const P = []; for (let i = 0; i <= 6; i++) { const t = i / 6; P.push(new T3.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - cad * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t)); }
    return (GEO[k] = new T3.TubeGeometry(new T3.CatmullRomCurve3(P), 8, .011, 4, false));
  }
  const giro = () => GEO.giro || (GEO.giro = (() => { const g = new T3.TorusGeometry(.04, .012, 4, 10); g.rotateX(PI / 2); return g; })());
  const nodo = () => GEO.nodo || (GEO.nodo = new T3.SphereGeometry(.028, 6, 4));
  const ferro = () => GEO.ferro || (GEO.ferro = new T3.BoxGeometry(.05, .05, .14));
  const MAT = {};
  const matC = (c, r) => MAT[c] || (MAT[c] = new T3.MeshStandardMaterial({ color: c, roughness: r === undefined ? 1 : r }));
  const tr = (x, y, z) => new T3.Matrix4().makeTranslation(x, y, z);

  // ======================= DOVE LEGARE: i muri delle case accanto =======================
  const Gm = () => (window.__pv && window.__pv.G) || (typeof Game !== 'undefined' ? Game : null);
  // dal punto locale (lx, ly) verso s (+1 / −1 lungo x locale): la prima casa entro 6 m; { d, b } o null
  function muro(C, lx, ly, s) {
    const G = Gm(); if (!G || typeof Ingombri === 'undefined' || !Ingombri.casa) return null;
    for (let d = .25; d <= 6; d += .25) { const w = UP.aMondo(C, lx + s * d, ly), h = Ingombri.casa(G, { cx: w.x, cz: w.y, a: C.a, hu: .08, hv: .08 }, 0); if (h) return { d: d - .12, b: h.b }; }
    return null;
  }

  // ======================= IL PRESIDIO: il panno al posto della scritta piatta =======================
  function testoDi(C) { return String(C.nome || 'VIA NOSTRA').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function comDi(C) { const U = UCu(), st = Un() && Un().st; if (!U || !st || !st.u || !st.u.cultura || !U.comPerCantiere) return null; try { return U.comPerCantiere(st, C); } catch (e) { return null; } }
  function presidio(C, out) {
    // via la scritta piatta (la tela di parti_vivo, quella della cultura) e la sua cordicella: tutto rifatto qui
    for (let i = out.length - 1; i >= 0; i--) { const [g, m] = out[i]; if ((m && m.map && m.map.isCanvasTexture && m.side === T3.DoubleSide) || (g && g.parameters && g.parameters.radiusTop === .008 && g.parameters.radialSegments === 4)) out.splice(i, 1); }
    const p = C.piano.find(q => q[0] === 'scritta'); if (!p) return;
    const c = comDi(C), tipo = tipoDi(C, c), col = colori(tipo, c, C), seme = C.id, testo = testoDi(C), ly = p[2];
    const xp = UP.dimDi(p)[0] / 2 + .034, Lc = 2 * xp - .44, Hc = .66, ht = 2.95, sag = .07, b = (hashS(C.id + '|vento') - .5) * .16;
    const m = tela(testo, c && c.sim, tipo, Lc / Hc, seme, col), I = tr(0, 0, ly);
    out.push([panno(Lc, Hc, ht, sag, b, seme), m, I]); stats.panni++;
    const mc = matC('#c8b080');
    // le corde: gli angoli alti al palo in cima, quelli bassi più giù (il giro attorno al palo, il nodo sull'angolo)
    for (const s of [-1, 1]) {
      const ax = s * Lc / 2, px = s * xp;
      for (const [ya, yp] of [[ht, 2.96], [ht - Hc, 2.24]]) { out.push([corda([ax, ya, ly], [px, yp, ly], .02), mc, new T3.Matrix4()]); out.push([giro(), mc, tr(px, yp, ly)]); out.push([nodo(), mc, tr(ax, ya, ly)]); }
      // un muro accanto: la corda in più dall'angolo alto al ferro nel muro (a 3,3 m)
      const M = muro(C, px, ly, s); if (M && M.d > .4) { const wx = s * (xp + M.d), hz = 3.3 + hashS(C.id + s) * .3; out.push([corda([ax, ht, ly], [wx - s * .07, hz, ly], .1 + M.d * .03), mc, new T3.Matrix4()]); out.push([ferro(), matC('#3D3548', .6), new T3.Matrix4().makeRotationY(PI / 2).premultiply(tr(wx - s * .04, hz, ly))]); out.push([giro(), matC('#3D3548', .6), new T3.Matrix4().makeRotationZ(PI / 2).premultiply(tr(wx - s * .1, hz, ly))]); stats.muri++; }
    }
    extra(C, out, c, testo, tipo);
  }
  // il cartello di cartone appoggiato alla cassa, il lenzuolo al balcone
  function extra(C, out, c, testo, tipo) {
    const messi = new Set(C.pezzi.map(q => q[0]));
    const ic = C.piano.findIndex((q, i) => q[0] === 'cassa' && messi.has(i));
    if (ic >= 0) {
      const q = C.piano[ic], d = UP.dimDi(q), s = Math.sign(q[1]) || 1, frasi = ['QUI SI STA', 'STRADA APERTA', 'NON CE NE ANDIAMO', 'ORA E SEMPRE', 'CI SIAMO'], motto = c && c.motto && c.motto.length < 22 ? c.motto.toUpperCase() : frasi[Math.floor(hashS(C.id + 'cart') * frasi.length)];
      const w = .62, h = .46, m = tela(motto, null, 'cartone', w / h, C.id + 'cart', colori('cartone', null, C)), g = GEO['cart' + w] || (GEO['cart' + w] = new T3.PlaneGeometry(w, h));
      // davanti alla cassa, verso la carreggiata, appoggiato indietro di 14°
      const M = new T3.Matrix4().makeRotationX(-.24).premultiply(new T3.Matrix4().makeRotationY(s > 0 ? -PI / 2 : PI / 2)).premultiply(tr(q[1] - s * (d[0] / 2 + .07), h / 2 + .01, q[2]));
      out.push([g, m, M]); stats.cartoni++;
    }
    // la pentola sul fusto (chi cucina ci gira il mestolo), le carte e i bicchieri sul tavolo (chi gioca ha la sua mano)
    const pz = k => { const i = C.piano.findIndex((q, j) => q[0] === k && messi.has(j)); return i >= 0 ? C.piano[i] : null; }, fu = pz('fusto'), ta = pz('tavolo');
    const fu2 = fu || pz('cassa');
    if (fu2) { const fu = fu2, H = UP.dimDi(fu)[2], g = GEO.pent || (GEO.pent = new T3.CylinderGeometry(.18, .16, .2, 14)), b = GEO.bordo || (GEO.bordo = new T3.TorusGeometry(.18, .012, 4, 16)), m = GEO.manico || (GEO.manico = new T3.BoxGeometry(.06, .025, .03));
      out.push([g, matC('#7C7186', .5), tr(fu[1], H + .1, fu[2])]); out.push([b, matC('#A89C92', .5), new T3.Matrix4().makeRotationX(PI / 2).premultiply(tr(fu[1], H + .2, fu[2]))]);
      out.push([GEO.sugo || (GEO.sugo = new T3.CircleGeometry(.165, 14)), matC('#C25B36', .8), new T3.Matrix4().makeRotationX(-PI / 2).premultiply(tr(fu[1], H + .18, fu[2]))]);
      for (const s of [-1, 1]) out.push([m, matC('#3D3548', .6), tr(fu[1] + s * .2, H + .17, fu[2])]); }
    if (ta) { const H = UP.dimDi(ta)[2] + .006, r = rngDi(C.id + '|carte'), cg = GEO.carta || (GEO.carta = new T3.PlaneGeometry(.06, .09)), mzz = GEO.mazzo || (GEO.mazzo = new T3.BoxGeometry(.065, .03, .095));
      out.push([mzz, matC('#F2E7CF', .9), tr(ta[1] + .05, H + .015, ta[2] - .04)]);
      for (let i = 0; i < 5; i++) out.push([cg, matC(i % 2 ? '#F2E7CF' : '#E8DCC0', .9), new T3.Matrix4().makeRotationX(-PI / 2).premultiply(new T3.Matrix4().makeRotationY(r() * 3)).premultiply(tr(ta[1] + (r() - .5) * .3, H + i * .001, ta[2] + (r() - .5) * .3))]);
      const vg = GEO.bic || (GEO.bic = new T3.CylinderGeometry(.032, .027, .09, 10)); for (const [dx, dy] of [[-.25, .2], [.26, -.22]]) out.push([vg, matC('#6F2B2E', .3), tr(ta[1] + dx, H + .045, ta[2] + dy)]); }
    // il lenzuolo dal balcone: una casa di due piani o più a meno di 5 m di lato, la ringhiera e il panno appeso
    const sb = hashS(C.id + '|balc') < .5 ? 1 : -1, F = C.F, yb0 = (hashS(C.id + '|by') < .5 ? F[1] - 1.2 : F[3] + 1.2), yb1 = F[1] + F[3] - yb0;
    for (const [s, yb] of [[sb, yb0], [-sb, yb0], [sb, yb1], [-sb, yb1]]) {   // il lato e il capo dal seme; se lì non c'è una casa, gli altri
      const x0 = s * ((C.meta && C.meta.w) || 7) / 2 * .8, M = muro(C, x0, yb, s); if (!M || !M.b || (M.b.fl || 1) < 2) continue;
      const wx = x0 + s * M.d, base = 3.25, Wb = 1.3, Hb = 1.45, frase = testo.length <= 14 ? testo : (c && c.motto && c.motto.length <= 16 ? c.motto.toUpperCase() : 'CI SIAMO');
      const m = tela(frase, c && c.sim, 'lenzuolo', Wb / Hb, C.id + 'balc', colori('lenzuolo', c, C));
      const g = panno(Wb, Hb, base + Hb + .02, .03, .05, C.id + 'balc', 10, 12), Rot = new T3.Matrix4().makeRotationY(s > 0 ? -PI / 2 : PI / 2).premultiply(tr(wx - s * .64, 0, yb));
      out.push([g, m, Rot]);
      // la ringhiera: il corrimano, i ritti, la lastra
      const fe = matC('#3D3548', .6), bar = GEO.rb || (GEO.rb = new T3.BoxGeometry(1.7, .04, .04)), rit = GEO.rr || (GEO.rr = new T3.BoxGeometry(.025, .9, .025)), las = GEO.rl || (GEO.rl = new T3.BoxGeometry(1.8, .1, .62));
      const Mb = new T3.Matrix4().makeRotationY(s > 0 ? -PI / 2 : PI / 2);
      out.push([las, matC('#A89C92'), Mb.clone().premultiply(tr(wx - s * .31, base + Hb - .9 + .06 - .05, yb))]);
      out.push([bar, fe, Mb.clone().premultiply(tr(wx - s * .6, base + Hb + .02, yb))]);
      for (let k = -4; k <= 4; k++) out.push([rit, fe, tr(wx - s * .6, base + Hb - .43, yb + k * .2)]);
      stats.balconi++; break;
    }
  }
  US.presidio = presidio;

  // ======================= L'AGGANCIO: sopra il disegno di parti_vivo (e della cultura) =======================
  const d0 = Object.getOwnPropertyDescriptor(V, 'extra'), prima = () => (d0 ? (d0.get ? d0.get() : d0.value) : null);
  const nostro = (C, out, T) => { const f = prima(); if (f) try { f(C, out, T); } catch (e) { } if (C.tipo === 'presidio' && C.fine !== null) try { presidio(C, out); } catch (e) { if (Un() && Un()._ && Un()._.conta) Un()._.conta('unico.striscione', e); } };
  try { Object.defineProperty(V, 'extra', { configurable: true, get: () => nostro, set: f => { if (d0 && d0.set) d0.set(f); else if (f !== nostro) d0.value = f; } }); } catch (e) { }
  if (V.VIS && V.VIS.per) for (const id in V.VIS.per) V.VIS.per[id].userData.chiave = '·';   // si rifanno col panno nuovo
  return US;
})();
if (typeof window !== 'undefined') window.UnicoStriscione = UnicoStriscione;
