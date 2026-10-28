/* Porto Vecchio — i tetti vissuti (v7, [vissuti]).
   Il committente: «i tetti non mi convincono, serve che ci siano dei dettagli, dalle buste di carta bagnate, e le cartacce, le piante
   cresciute tra le tegole o nei vasi belle, le sdraio e i tavoli sui terrazzi, i dettagli, le pozze d'acqua, la texture».
   Dalla camera di gioco i tetti sono la cosa che si vede di più: qui diventano abitati, come un borgo mediterraneo visto dall'alto, nel
   registro del diorama (caldo, leggibile, mai ingombro). Tre parti:
   1. IL DATO (Node e pagina, come Tetti.PIANO): per ogni tetto col piano una piccola storia, deterministica (l'hash della casa, mai
      Math.random): sul terrazzo UNA scenetta (chi ci vive) più pochi dettagli del tempo (le pozze, l'erba al piede del parapetto, il
      cappero sulla copertina, le cartacce in un angolo); sulle falde l'erba fra i coppi della gronda, la malta del colmo, la busta nel
      canale. Per quartiere: il borgo (vasi e latte di basilico, la sedia impagliata, l'orto in cassetta, il gatto), la marina (le reti, le
      boe, le cassette del pesce, i remi, il sale), l'Ottocento (le sdraio con l'ombrellone, il canniccio col tavolo, il limone in vaso).
      Niente sulla rete dei tetti: un corridoio di 1,2 m sui giri, sulle vie, sui rami e fra tutte le porte del tetto (scale, passerelle,
      salti, i passaggi da tetto a tetto), le riserve di Tetti.PIANO, i gruppi del piano, la cupola; niente di alto verso la camera.
   2. LA GRAFICA (render.js chiama terrazzo, costruisci, vicino, manto): i mobili e le piante (un materiale per colore, uguali a meno del colore), dentro il
      gruppo del tetto della casa, quindi nelle mesh fuse per settore di [leggero] (nessun disegno in più, il taglio e lo sbiadire del
      tetto li prendono con la casa); le cartacce e le pozze sono istanze vicino al personaggio (8 disegni per tutta la città, spente
      oltre ~36 m e ~64 m, sui telefoni meno), tolte dalla casa tagliata o col tetto sbiadito.
   3. IL MANTO (manto): lo shader dei coppi, delle tegole e dei lastrici prende il tempo dal mondo (la posizione vera, non la tela che si
      ripete ogni 16 m): rappezzi di coppi nuovi e campi vecchi, muschio verso nord e sulla gronda, licheni, qualche coppo rotto o mancante;
      sui lastrici le chiazze d'umido, le crepe, i rappezzi di cemento. Sopravvive alla fusione, alla tavolozza e alla pila ([leggero]) e
      a ?noleggero: è un marchio nei userData che ogni copia del materiale si porta dietro.
   ?novissuti spegne tutto (il «prima» delle foto e delle misure). */
var TettiVissuti = (function () {
  'use strict';
  const SPENTO = typeof location !== 'undefined' && /[?&]novissuti\b/.test(location.search || '');
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const TT = typeof Tetti !== 'undefined' ? Tetti : require('./tetti.js');
  const B = G.BUILDINGS, TS = G.TS, hyp = Math.hypot, PI = Math.PI;
  const ZONA = { E0: 'borgo', E2: 'marina', E3: 'ottocento', E4: 'novecento', E6: 'novecento' };
  const h4 = (a, b, s) => { let h = (a * 374761393 + b * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // le misure delle regole
  const CORR = .6;      // mezzo corridoio libero sulle linee dei percorsi (1,2 m in tutto)
  const PORTA = 1.0;    // il raggio libero attorno a ogni porta del tetto (dove si arriva da una scala, una passerella, un salto, un tetto vicino)
  const STACCO = .3;    // dai gruppi del piano e fra una scenetta e l'altra
  const ALTO = 1.2, CAMB = 1.5;   // come Tetti.PIANO: niente più alto di 1,2 m a meno di 1,5 m dai bordi verso la camera (sud, est)
  const FASCIA = .3;    // le cose basse possono stare nella fascia fra la faccia del parapetto (28 cm) e il rettangolo del piano
  // IL CATALOGO: mezza impronta (hx, hy, prima di girare), altezza, dove può stare, e se è un'istanza vicina (1 cartacce, 2 pozze)
  const CAT = {
    sdraio: { hx: .3, hy: .72, h: .85 }, tavolino: { hx: .3, hy: .3, h: .76 }, sedia: { hx: .23, hy: .23, h: .88 }, impagliata: { hx: .22, hy: .22, h: .86 },
    asta: { hx: .14, hy: .14, h: 2.2, con: 'telo' }, telo: { hx: .86, hy: .86, h: 2.2, cielo: 1.8, con: 'asta' },   // l'ombrellone: l'asta col piede e la tela, due pezzi
    palo: { hx: .05, hy: .05, h: 2.1, con: 'stuoia' }, stuoia: { hx: 1.25, hy: 1.0, h: 2.2, cielo: 2.08, con: 'palo' },   // il canniccio: quattro pali e la stuoia di canne (o la vite)
    stendino: { hx: .5, hy: .32, h: 1.02 }, cesta: { hx: .22, hy: .16, h: .24, basso: 1 }, secchio: { hx: .16, hy: .16, h: .3, basso: 1, tondo: 1 },
    cisterna: { hx: .46, hy: .46, h: 1.14 }, limone: { hx: .42, hy: .42, h: 1.72 },
    vaso: { hx: .22, hy: .22, h: .55, basso: 1, tondo: 1 }, latta: { hx: .09, hy: .09, h: .3, basso: 1, tondo: 1 }, cassetta: { hx: .3, hy: .2, h: .26, basso: 1 }, annaffiatoio: { hx: .23, hy: .12, h: .26, basso: 1 },
    rete: { hx: .48, hy: .36, h: .3, basso: 1 }, boe: { hx: .26, hy: .22, h: .26, basso: 1 }, cima: { hx: .21, hy: .21, h: .08, basso: 1, tondo: 1 }, remi: { hx: 1.05, hy: .16, h: .06, basso: 1 },
    gatto: { hx: .22, hy: .14, h: .2, basso: 1 },
    erba: { hx: .1, hy: .1, h: .26, basso: 1, tondo: 1 }, valeriana: { hx: .13, hy: .13, h: .42, basso: 1, tondo: 1 }, cappero: { hx: .22, hy: .22, h: .28, basso: 1, tondo: 1 },
    sale: { hx: .45, hy: .35, h: .01, basso: 1, tondo: 1, piatto: 1 }, colatura: { hx: .08, hy: .01, h: .6 }, malta: { hx: .2, hy: .2, h: .1 },
    // le istanze vicine: le cartacce (1) e le pozze (2)
    busta: { hx: .15, hy: .1, h: .1, basso: 1, vicino: 1 }, cartaccia: { hx: .06, hy: .06, h: .1, basso: 1, vicino: 1, tondo: 1 }, giornale: { hx: .22, hy: .16, h: .03, basso: 1, vicino: 1 },
    tappi: { hx: .1, hy: .1, h: .02, basso: 1, vicino: 1, tondo: 1 }, pallone: { hx: .11, hy: .11, h: .22, basso: 1, vicino: 1, tondo: 1 }, scarpa: { hx: .14, hy: .06, h: .1, basso: 1, vicino: 1 }, lattina: { hx: .07, hy: .04, h: .07, basso: 1, vicino: 1 },
    pozza: { hx: .5, hy: .4, h: .01, basso: 1, vicino: 2, tondo: 1, piatto: 1 },
  };
  const FUORI = { malta: 1, colatura: 1 };   // sul colmo e sul muro di fuori: non contano negli urti fra le cose del terrazzo
  const CARTE = ['busta', 'cartaccia', 'giornale', 'tappi', 'pallone', 'scarpa', 'lattina'];
  // LE SCENETTE: chi ci vive. Pezzi relativi all'ancora (dx, dy, girata ry), l'impronta d'insieme la fanno i pezzi; «opt» si lascia se non ci sta
  const SCENE = {
    // il borgo
    nonna: [{ k: 'impagliata', dx: 0, dy: 0, ry: 0 }, { k: 'vaso', dx: -.62, dy: -.18, v: 'geranio' }, { k: 'latta', dx: -.55, dy: .28, v: 'basilico' }, { k: 'latta', dx: -.78, dy: .22, v: 'basilico', opt: 1 },
      { k: 'secchio', dx: .6, dy: -.12, opt: 1 }, { k: 'gatto', dx: .62, dy: .42, opt: 1 }],
    orto: [{ k: 'cassetta', dx: -.68, dy: 0, v: 'orto' }, { k: 'cassetta', dx: 0, dy: 0, v: 'orto' }, { k: 'cassetta', dx: .68, dy: 0, v: 'orto', opt: 1 }, { k: 'annaffiatoio', dx: .1, dy: .48 }, { k: 'latta', dx: -.45, dy: .45, v: 'basilico', opt: 1 }],
    panni: [{ k: 'stendino', dx: 0, dy: 0 }, { k: 'cesta', dx: .82, dy: .12 }, { k: 'secchio', dx: -.82, dy: .1, opt: 1 }],
    gatti: [{ k: 'cassetta', dx: 0, dy: 0, v: 'legno' }, { k: 'gatto', dx: 0, dy: 0, sopra: 'cassetta' }, { k: 'vaso', dx: .62, dy: .05, v: 'secco' }, { k: 'latta', dx: -.5, dy: .1, v: 'cactus', opt: 1 }],
    // la marina
    pescatore: [{ k: 'rete', dx: 0, dy: 0 }, { k: 'boe', dx: .78, dy: .06 }, { k: 'cassetta', dx: -.82, dy: 0, v: 'pesce', opt: 1 }, { k: 'cima', dx: 0, dy: .62, opt: 1 }, { k: 'secchio', dx: .8, dy: -.42, opt: 1 }],
    nasse: [{ k: 'cassetta', dx: 0, dy: 0, v: 'pesce' }, { k: 'cima', dx: .56, dy: 0 }, { k: 'secchio', dx: -.52, dy: .02, opt: 1 }, { k: 'boe', dx: .1, dy: .48, opt: 1 }],
    remi: [{ k: 'remi', dx: 0, dy: 0 }, { k: 'cassetta', dx: -.55, dy: .45, v: 'pesce' }, { k: 'cassetta', dx: .1, dy: .45, v: 'pesce', opt: 1 }, { k: 'boe', dx: .78, dy: .48, opt: 1 }],
    // l'Ottocento
    salotto: [{ k: 'sdraio', dx: -.7, dy: 0, ry: 0 }, { k: 'sdraio', dx: .7, dy: 0, ry: 0 }, { k: 'tavolino', dx: 0, dy: .28 }],
    ombrellone: [{ k: 'sdraio', dx: -.7, dy: .2, ry: 0 }, { k: 'sdraio', dx: .7, dy: .2, ry: 0 }, { k: 'tavolino', dx: 0, dy: .48 }, { k: 'asta', dx: 0, dy: -.32 }, { k: 'telo', dx: 0, dy: -.32, cielo: 1 }],
    ombra: [{ k: 'sdraio', dx: -.36, dy: .3, ry: 0 }, { k: 'asta', dx: .5, dy: -.2 }, { k: 'telo', dx: .1, dy: -.2, cielo: 1 }, { k: 'vaso', dx: .62, dy: .52, v: 'geranio', opt: 1 }],   // una sdraio sola sotto l'ombrellone
    canniccio: [{ k: 'palo', dx: -1.15, dy: -.95 }, { k: 'palo', dx: 1.15, dy: -.95 }, { k: 'palo', dx: -1.15, dy: .95 }, { k: 'palo', dx: 1.15, dy: .95 }, { k: 'stuoia', dx: 0, dy: 0, cielo: 1 },
      { k: 'tavolino', dx: 0, dy: 0 }, { k: 'sedia', dx: -.62, dy: 0, ry: -PI / 2 }, { k: 'sedia', dx: .62, dy: 0, ry: PI / 2, opt: 1 }],
    limone: [{ k: 'limone', dx: 0, dy: 0 }, { k: 'vaso', dx: .78, dy: .2, v: 'geranio' }, { k: 'vaso', dx: -.76, dy: .22, v: 'basilico', opt: 1 }],
    pranzo: [{ k: 'tavolino', dx: 0, dy: 0 }, { k: 'sedia', dx: -.6, dy: 0, ry: -PI / 2 }, { k: 'sedia', dx: .6, dy: 0, ry: PI / 2 }, { k: 'vaso', dx: 0, dy: -.62, v: 'basilico', opt: 1 }],
    cisterna: [{ k: 'cisterna', dx: 0, dy: 0 }, { k: 'secchio', dx: .72, dy: .2, opt: 1 }],
  };
  // per quartiere: le scenette dei terrazzi abitati e di quelli calmi (pesate), i dettagli del tempo (quanti, con che probabilità)
  const STORIE = {
    borgo: { vivo: [['nonna', 3], ['orto', 2], ['panni', 2], ['gatti', 2]], calmo: [['gatti', 1], ['nonna', 1]], pCalmo: .3,
      pozze: [.55, .25], erbe: [3, 6], cigli: .65, carte: [.7, .35], sale: 0, colature: .6, falde: { erba: .65, colmo: .2, gronda: .14 } },
    marina: { vivo: [['pescatore', 3], ['remi', 2], ['nasse', 1], ['ombra', 1], ['panni', 1]], calmo: [['nasse', 2], ['pescatore', 1], ['remi', 1]], pCalmo: .45,
      pozze: [.6, .3], erbe: [1, 3], cigli: .4, carte: [.5, .25], sale: .8, colature: .5, falde: { erba: .35, colmo: .1, gronda: .1 } },
    ottocento: { vivo: [['ombrellone', 3], ['ombra', 2], ['canniccio', 2], ['salotto', 2], ['limone', 2], ['pranzo', 1]], calmo: [['cisterna', 2], ['limone', 1], ['ombra', 1]], pCalmo: .25,
      pozze: [.35, .1], erbe: [0, 1], cigli: .25, carte: [.2, .05], sale: 0, colature: .35, falde: { erba: .25, colmo: .04, gronda: .06 } },
    novecento: { vivo: [['salotto', 2], ['pranzo', 2], ['cisterna', 1]], calmo: [['cisterna', 1]], pCalmo: .3,
      pozze: [.5, .2], erbe: [0, 2], cigli: .2, carte: [.4, .15], sale: 0, colature: .4, falde: { erba: .2, colmo: 0, gronda: .05 } },
  };
  const scegli = (L, u) => { let t = 0; L.forEach(q => t += q[1]); let a = u * t; for (const q of L) { a -= q[1]; if (a <= 0) return q[0]; } return L[L.length - 1][0]; };

  // ---------------- la geometria del piano ----------------
  const rr = (it, px, py) => Math.hypot(Math.max(0, Math.abs(px - it.x) - it.hx), Math.max(0, Math.abs(py - it.y) - it.hy));   // punto-rettangolo
  const gap = (a, b) => Math.max(Math.abs(a.x - b.x) - a.hx - b.hx, Math.abs(a.y - b.y) - a.hy - b.hy);   // > 0: staccati di tanto
  // la distanza esatta fra il rettangolo e il segmento: zero se lo attraversa, altrimenti la minima fra estremi e spigoli
  const psD = (px, py, A, Bq) => { const dx = Bq[0] - A[0], dy = Bq[1] - A[1], L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((px - A[0]) * dx + (py - A[1]) * dy) / L2)) : 0; return hyp(px - A[0] - dx * t, py - A[1] - dy * t); };
  function attraversa(it, A, Bq) {   // Liang-Barsky
    let t0 = 0, t1 = 1; const dx = Bq[0] - A[0], dy = Bq[1] - A[1], P4 = [-dx, dx, -dy, dy], Q4 = [A[0] - (it.x - it.hx), it.x + it.hx - A[0], A[1] - (it.y - it.hy), it.y + it.hy - A[1]];
    for (let i = 0; i < 4; i++) { if (Math.abs(P4[i]) < 1e-12) { if (Q4[i] < 0) return false; continue; } const r = Q4[i] / P4[i]; if (P4[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
    return true;
  }
  function segD(it, A, Bq) {
    if (attraversa(it, A, Bq)) return 0;
    let d = Math.min(rr(it, A[0], A[1]), rr(it, Bq[0], Bq[1]));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) d = Math.min(d, psD(it.x + sx * it.hx, it.y + sy * it.hy, A, Bq));
    return d;
  }
  // l'impronta (mezzi lati) girata: a quarti di giro si scambiano; le cose tonde (o girate di sbieco) prendono il cerchio che le contiene
  const impronta = (k, ry, s) => { const c = CAT[k], f = s || 1, a = (ry || 0) / (PI / 2), quarto = Math.abs(a - Math.round(a)) < .01, q = Math.round(a) & 1;
    if (c.tondo) { const r = Math.max(c.hx, c.hy) * f; return [r, r]; }
    if (!quarto) { const r = hyp(c.hx, c.hy) * f; return [r, r]; }
    return q ? [c.hy * f, c.hx * f] : [c.hx * f, c.hy * f]; };
  // la quota della falda sopra il filo del muro (il piano senza l'onda dei coppi), nel riferimento della casa non girata: come tetto1 in render.js
  function quotaFalda(P, b, x, y) {
    const C = P.colmo, tp = Math.tan(P.pitch), L4 = LT(b), x0 = L4.x0, y0 = L4.y0, x1 = L4.x1, y1 = L4.y1;
    const da = C.along ? Math.min(y - y0, y1 - y) : Math.min(x - x0, x1 - x);
    if (P.forma === 'padiglione') { const db = C.along ? Math.min(x - x0, x1 - x) : Math.min(y - y0, y1 - y); return Math.min(da, db) * tp; }
    if (P.forma === 'falda') return (C.along ? y1 - y : x1 - x) * tp;
    return da * tp;
  }
  // [tetti4] il lotto della casa (Tetti.lotto4): il centro e le misure suoi se [pianta] li ha messi, se no la casella
  const LT = b => TT.lotto4 ? TT.lotto4(b) : { cx: (b.x + b.w / 2) * TS, cy: (b.y + b.h / 2) * TS, lw: b.w * TS, ld: b.h * TS, x0: b.x * TS, y0: b.y * TS, x1: (b.x + b.w) * TS, y1: (b.y + b.h) * TS };
  const SBALZO = era => era === 'E3' ? .55 : .32;   // lo sbalzo della gronda per epoca (render.js EPT.ov)

  // ---------------- i corridoi: le linee dei percorsi e le porte di ogni tetto ----------------
  let LINEE = null, PORTE = null;
  function rete() {
    LINEE = []; PORTE = new Map();
    const D = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null;
    if (D) { D.circuiti.forEach(c => { if (c.pts) LINEE.push(c.pts); (c.vie || []).forEach(v => v.pts && LINEE.push(v.pts)); (c.rami || []).forEach(r => r.pts && LINEE.push(r.pts)); });
      (D.porte || []).forEach(q => { const a = q.alternativa; if (a && a.k === 'tetti' && a.pts) LINEE.push(a.pts); }); }
    const porta = (bi, x, y) => { if (bi < 0 || !B[bi]) return; const L = PORTE.get(bi) || PORTE.set(bi, []).get(bi); if (!L.some(p => hyp(p[0] - x, p[1] - y) < .4)) L.push([x, y]); };
    const E = TT.grafo(); E.forEach(L => L.forEach(e => { porta(e.a, e.x, e.y); if (e.k !== 'scala') porta(e.b, e.x, e.y); }));
    TT.LADDERS.forEach(L => { if (L.camm) return; porta(L.bi, L.tx, L.ty); });
    (TT.PREMI || []).forEach(q => porta(q.bi, q.x, q.y)); (TT.BELV || []).forEach(v => porta(v.bi, v.x, v.y));
  }
  // i segmenti che passano sopra questa casa (nel riferimento non girato) e le porte del tetto con le loro linee a due a due
  function corridoi(bi) {
    const b = B[bi], L4 = LT(b), gir4 = !!(TT.libero4 && TT.libero4(b)), R4 = hyp(L4.lw, L4.ld) / 2 + 1.5, x0 = gir4 ? L4.cx - R4 : L4.x0 - 1.5, y0 = gir4 ? L4.cy - R4 : L4.y0 - 1.5, x1 = gir4 ? L4.cx + R4 : L4.x1 + 1.5, y1 = gir4 ? L4.cy + R4 : L4.y1 + 1.5, segs = [],   /* [tetti4] la casa girata: il cerchio che la contiene */ loc = (x, y) => TT.loc3(b, x, y);
    const dentro = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    LINEE.forEach(pts => { for (let k = 0; k < pts.length - 1; k++) { const A = pts[k], Bq = pts[k + 1], L = hyp(Bq[0] - A[0], Bq[1] - A[1]), n = Math.max(1, Math.ceil(L / .5)); let ok = false;
      for (let j = 0; j <= n && !ok; j++) ok = dentro(A[0] + (Bq[0] - A[0]) * j / n, A[1] + (Bq[1] - A[1]) * j / n); if (ok) segs.push([loc(A[0], A[1]), loc(Bq[0], Bq[1])]); } });
    const pp = (PORTE.get(bi) || []).filter(p => dentro(p[0], p[1])).map(p => loc(p[0], p[1]));
    for (let i = 0; i < pp.length; i++) for (let j = i + 1; j < pp.length; j++) segs.push([pp[i], pp[j]]);
    return { segs, porte: pp };
  }

  // ---------------- IL DATO ----------------
  const VISSUTI = [];   // per indice di casa: { bi, era, zona, tipo, storia, cose: [...] }
  function libero(C, it, o) {
    o = o || {}; const P = C.P, R = P.rect, b = C.b, cat = CAT[it.k], L4 = LT(b), W1 = L4.lw, D1 = L4.ld, x0 = L4.x0, y0 = L4.y0;
    if (o.ciglio) {   // sulla copertina del parapetto: sta sul filo, lontano dalle porte e dai corridoi
    } else if (C.tipo === 'piano') {
      const m = cat.basso ? FASCIA : 0, X0 = cat.basso ? x0 + FASCIA : R.x0, Y0 = cat.basso ? y0 + FASCIA : R.y0, X1 = cat.basso ? x0 + W1 - FASCIA : R.x1, Y1 = cat.basso ? y0 + D1 - FASCIA : R.y1;
      if (m === 0 && (it.x - it.hx < X0 - 1e-6 || it.x + it.hx > X1 + 1e-6 || it.y - it.hy < Y0 - 1e-6 || it.y + it.hy > Y1 + 1e-6)) return false;
      if (m && (it.x - it.hx < X0 + .02 || it.x + it.hx > X1 - .02 || it.y - it.hy < Y0 + .02 || it.y + it.hy > Y1 - .02)) return false;
      if (cat.h > ALTO && (it.y + it.hy > y0 + D1 - CAMB || it.x + it.hx > x0 + W1 - CAMB)) return false;
      if (P.cupola && gap(P.cupola, it) < .35) return false;
    }
    for (const r of P.riserve) if (rr(it, r[0], r[1]) < r[2] + .15) return false;
    for (const p of C.porte) if (rr(it, p[0], p[1]) < PORTA) return false;
    for (const g of P.gruppi) if (gap(g, it) < (o.ciglio || C.tipo === 'falde' ? .15 : STACCO)) return false;
    for (const q of C.cose) {
      if (FUORI[q.k] || q.gronda) continue;
      if (!!o.ciglio !== !!q.ciglio) continue;   // sulla copertina e sul lastrico: due piani diversi
      if (o.scena && q.scena === o.scena) {   // i pezzi della stessa scenetta: li ha disposti la scena, si tollera solo quello che sta sopra
        if (o.sopra === q.k || q.sopra === it.k || CAT[it.k].con === q.k || CAT[q.k].con === it.k) continue;
        if (CAT[it.k].cielo !== undefined && CAT[q.k].h < CAT[it.k].cielo) continue;
        if (CAT[q.k].cielo !== undefined && CAT[it.k].h < CAT[q.k].cielo) continue;
        if (gap(q, it) < .03) return false; continue; }
      if (gap(q, it) < (q.scena || o.scena ? STACCO : .12)) return false; }
    if (!CAT[it.k].piatto) for (const [A, Bq] of C.segs) if (segD(it, A, Bq) < CORR) return false;   // la pozza e il sale non sbarrano la strada: ci si passa sopra (ma non alle porte)
    return true;
  }
  const cosa = (C, k, x, y, ry, extra) => { const [hx, hy] = impronta(k, ry, extra && extra.s); return Object.assign({ k, x, y, ry: ry || 0, hx, hy, qz: C.tipo === 'piano' ? .08 : 0, bi: C.bi }, extra || {}); };
  function metti(C, it, o) { if (!libero(C, it, o)) return false; C.cose.push(it); return true; }
  // una scenetta: l'ancora su una griglia del terrazzo, quattro versi; le basse verso la camera (sud, est), le alte dietro (nord, ovest)
  function scena(C, nome, u) {
    const P = C.P, R = P.rect, membri = SCENE[nome], alta = membri.some(m => CAT[m.k].h > ALTO), id = C.bi * 16 + C.nScene++;
    const posti = [];
    for (let y = R.y0 + .2; y <= R.y1 - .2 + 1e-6; y += .3) for (let x = R.x0 + .2; x <= R.x1 - .2 + 1e-6; x += .3) {
      const sx = (x - R.x0) / Math.max(1, R.x1 - R.x0), sy = (y - R.y0) / Math.max(1, R.y1 - R.y0), vis = sy + sx * .5;
      posti.push([x, y, (alta ? -vis : vis) + h4(Math.round(x * 4), Math.round(y * 4), 401 + C.bi) * .35]); }
    posti.sort((a, c) => c[2] - a[2]); if (posti.length > 500) posti.length = 500;
    const versi = [0, PI / 2, PI, -PI / 2].sort((a, c) => h4(C.bi, Math.round(a * 10), 409 + Math.round(u * 50)) - h4(C.bi, Math.round(c * 10), 409 + Math.round(u * 50)));
    for (const [ax, ay] of posti) for (const th of (alta ? [0, PI / 2, -PI / 2] : versi)) {   // le alte guardano a sud o di lato, mai le spalle alla camera
      const c = Math.cos(th), s = Math.sin(th), messi = [];
      let ok = true;
      for (const m of membri) {
        const X = ax + m.dx * c + m.dy * s, Y = ay - m.dx * s + m.dy * c, it = cosa(C, m.k, X, Y, (m.ry || 0) + th, { scena: id, v: m.v, sopra: m.sopra, cielo: m.cielo ? CAT[m.k].cielo : undefined });
        if (m.sopra) { const base = messi.find(q => q.k === m.sopra); if (!base) { ok = !!m.opt; continue; } it.qz = base.qz + CAT[base.k].h; }
        const prima = C.cose.length; C.cose.push(...messi); const lib = libero(C, it, { scena: id, sopra: m.sopra }); C.cose.length = prima;
        if (lib) messi.push(it); else if (!m.opt) { ok = false; break; }
      }
      if (ok && messi.length >= 2) { messi.forEach(q => C.cose.push(q)); C.storia = C.storia ? C.storia + '+' + nome : nome; return true; }
    }
    return false;
  }
  function terrazza(C) {
    const P = C.P, b = C.b, S = STORIE[C.zona] || STORIE.borgo, q = s => h4(b.x, b.y, 300 + s), R = P.rect, L4 = LT(b), x0 = L4.x0, y0 = L4.y0, W1 = L4.lw, D1 = L4.ld;
    // 1. la scenetta: sempre sui terrazzi abitati, qualche volta sui calmi (un uomo solo con la sua cisterna)
    // (niente doppioni coi gruppi del piano: dove c'è il filo del bucato niente stendino, dove c'è il pergolato niente canniccio né pranzo)
    const ha = k => P.gruppi.some(g => g.k === k), via = n => (n === 'panni' && ha('bucato')) || ((n === 'canniccio' || n === 'pranzo' || n === 'salotto') && ha('pergola'));
    if (P.vivo || q(1) < S.pCalmo) { const L = (P.vivo ? S.vivo : S.calmo).filter(([n]) => !via(n)), prima = L.length ? scegli(L, q(2)) : null;
      if (prima && !scena(C, prima, q(2))) for (const [n] of L) if (n !== prima && scena(C, n, q(3))) break; }
    // 2. le pozze nelle conche: verso il bocchettone (sud, est) e negli angoli, mai dove si passa
    const np = (q(11) < S.pozze[0] ? 1 : 0) + (q(12) < S.pozze[1] ? 1 : 0);
    for (let k = 0, fatte = 0; k < 16 && fatte < np; k++) { const s = .7 + q(60 + k) * .8, r = .5 * s + .02, ang = (q(80 + k) - .5) * 1.2, u = q(20 + k), v = q(40 + k), lo = FASCIA + r, w = q(100 + k);
      const x = u < .55 ? x0 + W1 - lo - v * (W1 - 2 * lo) * .45 : x0 + lo + v * (W1 - 2 * lo), y = u < .55 ? y0 + lo + w * (D1 - 2 * lo) : y0 + D1 - lo - w * (D1 - 2 * lo) * .45;   // verso est, o verso sud
      if (metti(C, cosa(C, 'pozza', x, y, ang, { s, qz: .085 }))) fatte++; }
    // 3. l'erba al piede del parapetto (nelle fughe dove si ferma l'acqua): a ciuffi di due o tre, sul nord e sull'ovest di più
    const ne = S.erbe[0] + Math.floor(q(5) * (S.erbe[1] - S.erbe[0] + 1));
    for (let k = 0, fatte = 0; k < ne * 4 && fatte < ne; k++) { const f = q(120 + k) < .62 ? (q(140 + k) < .5 ? 'N' : 'W') : (q(140 + k) < .5 ? 'S' : 'E'), u = .12 + q(160 + k) * .76, d = FASCIA + .14;
      const x = f === 'W' ? x0 + d : f === 'E' ? x0 + W1 - d : x0 + W1 * u, y = f === 'N' ? y0 + d : f === 'S' ? y0 + D1 - d : y0 + D1 * u;
      const k2 = q(180 + k) < (C.zona === 'borgo' ? .3 : .15) ? 'valeriana' : 'erba';
      if (metti(C, cosa(C, k2, x, y, q(200 + k) * 6, { v: q(220 + k) }))) { fatte++;   // un ciuffo chiama il vicino
        const x2 = x + (f === 'N' || f === 'S' ? .3 : 0), y2 = y + (f === 'W' || f === 'E' ? .3 : 0); if (q(240 + k) < .55) metti(C, cosa(C, 'erba', x2, y2, q(260 + k) * 6, { v: q(280 + k) })); } }
    // 4. sulla copertina del parapetto: il cappero e la valeriana nelle crepe, il cactus nel vaso sul davanzale
    if (P.parapetti && q(7) < S.cigli) { const n = 1 + (q(8) < .4 ? 1 : 0);
      for (let k = 0, fatte = 0; k < 10 && fatte < n; k++) { const f = ['S', 'E', 'S', 'W', 'N'][Math.floor(q(300 + k) * 5)], u = .15 + q(320 + k) * .7, ph = P.parapetti[f] || .5, d = .14;
        const x = f === 'W' ? x0 + d : f === 'E' ? x0 + W1 - d : x0 + W1 * u, y = f === 'N' ? y0 + d : f === 'S' ? y0 + D1 - d : y0 + D1 * u;
        const k2 = q(340 + k) < .45 ? 'cappero' : q(340 + k) < .75 ? 'valeriana' : 'latta', v = k2 === 'latta' ? (q(360 + k) < .5 ? 'cactus' : 'geranio') : q(360 + k);
        const it = cosa(C, k2, x, y, f === 'W' || f === 'E' ? PI / 2 : 0, { v, ciglio: f, qz: ph + .06, s: k2 === 'cappero' ? .8 : 1 });
        if (k2 === 'latta' && ph > .55) continue;   // il vaso sul davanzale solo sui parapetti bassi (si vede, non cade)
        if (metti(C, it, { ciglio: f })) fatte++; } }
    // 5. il sale della marina: le chiazze bianche dove l'acqua è evaporata
    if (S.sale && q(9) < S.sale) for (let k = 0, fatte = 0; k < 20 && fatte < 2; k++) { const x = R.x0 + .5 + q(380 + k) * (R.x1 - R.x0 - 1), y = R.y0 + .5 + q(400 + k) * (R.y1 - R.y0 - 1);
      if (metti(C, cosa(C, 'sale', x, y, q(420 + k) * 6, { s: .7 + q(440 + k) * .6, qz: .082 }))) fatte++; }
    // 6. le cartacce: in un angolo, contro il parapetto o dietro i comignoli (dove il vento le spinge e nessuno spazza)
    const nc = (q(13) < S.carte[0] ? 1 : 0) + (q(14) < S.carte[1] ? 1 : 0), dietro = P.gruppi.filter(g => g.k === 'comignoli');
    for (let k = 0, fatte = 0; k < 16 && fatte < nc; k++) { const u = q(460 + k); let x, y;
      if (dietro.length && u < .4) { const g = dietro[Math.floor(q(470 + k) * dietro.length)]; x = g.x + (q(480 + k) - .5) * g.hx * 2; y = g.y - g.hy - .2; }
      else { const cn = Math.floor(q(490 + k) * 4); x = cn & 1 ? x0 + W1 - FASCIA - .25 - q(500 + k) * .4 : x0 + FASCIA + .25 + q(500 + k) * .4; y = cn & 2 ? y0 + D1 - FASCIA - .25 - q(510 + k) * .4 : y0 + FASCIA + .25 + q(510 + k) * .4; }
      const kk = q(520 + k) < .04 ? 'pallone' : q(520 + k) < .08 ? 'scarpa' : ['busta', 'cartaccia', 'giornale', 'tappi', 'lattina'][Math.floor(q(530 + k) * 5)] || 'busta', it = cosa(C, kk, x, y, q(540 + k) * 6, { v: q(550 + k) });
      if (metti(C, it)) { fatte++; if (kk !== 'tappi' && q(560 + k) < .5) metti(C, cosa(C, q(570 + k) < .5 ? 'cartaccia' : 'tappi', x + .3, y + (q(580 + k) - .5) * .3, q(590 + k) * 6, { v: q(600 + k) })); } }
    // 7. le colature sui parapetti verso la camera (sud, est): l'acqua che scende dalla copertina
    if (P.parapetti && q(15) < S.colature) for (let k = 0; k < 2; k++) { const f = q(620 + k) < .6 ? 'S' : 'E', u = .15 + q(640 + k) * .7, ph = P.parapetti[f] || .5;
      const x = f === 'E' ? x0 + W1 + .006 : x0 + W1 * u, y = f === 'S' ? y0 + D1 + .006 : y0 + D1 * u, s = .7 + q(660 + k) * .6;
      const it = cosa(C, 'colatura', x, y, f === 'E' ? PI / 2 : 0, { s, qz: ph - .02, fuori: f, v: q(680 + k) });
      if (!C.cose.some(o => o.k === 'colatura' && hyp(o.x - x, o.y - y) < .6) && !C.porte.some(p => hyp(p[0] - x, p[1] - y) < PORTA)) C.cose.push(it); }
  }
  function falde(C) {
    const P = C.P, b = C.b, S = (STORIE[C.zona] || STORIE.borgo).falde, q = s => h4(b.x, b.y, 700 + s), Co = P.colmo, L4 = LT(b), x0 = L4.x0, y0 = L4.y0, W1 = L4.lw, D1 = L4.ld;
    const tp = Math.tan(P.pitch), ov = SBALZO(P.era), th = P.manto === 'tegole' ? .12 : .16, A = P.manto === 'tegole' ? .022 : .055;
    // la malta del colmo: la striscia di calce sotto i coppi di colmo, a pezzi (fatta a mano), interrotta dai comignoli
    if (P.forma !== 'falda' && Co.rl > .3) { const L = P.forma === 'padiglione' ? Co.rl : Co.L1 + 2 * Math.max(.2, ov * .7), n = Math.max(1, Math.round(L / .9));
      for (let k = 0; k < n; k++) { const t = -L / 2 + (k + .5) * L / n, x = Co.along ? Co.cx + t : Co.cx, y = Co.along ? Co.cy : Co.cy + t, it = cosa(C, 'malta', x, y, Co.along ? 0 : PI / 2, { qz: Co.h, lung: L / n - .03, v: q(10 + k) });
        it.hx = Co.along ? L / n / 2 : .2; it.hy = Co.along ? .2 : L / n / 2;
        if (!P.gruppi.some(g => gap(g, it) < .05)) C.cose.push(it); } }
    // l'erba fra i coppi della gronda: due o tre ciuffi sul filo, davanti e dietro (sulla gronda di dietro, verso nord, di più)
    if (q(1) < S.erba) { const n = 1 + Math.floor(q(2) * 3), gr = P.forma === 'falda' ? ['dav'] : P.forma === 'padiglione' ? ['dav', 'die', 'dx', 'sx'] : ['dav', 'die'];
      for (let k = 0, fatte = 0; k < n * 4 && fatte < n; k++) { const g = gr[Math.floor(q(20 + k) * gr.length)], u = .1 + q(40 + k) * .8, qd = -ov * (.15 + q(60 + k) * .5);   // sullo sbalzo, prima del canale
        let x, y; const lato = (Co.along ? (g === 'dav' ? 'S' : g === 'die' ? 'N' : g === 'dx' ? 'E' : 'W') : (g === 'dav' ? 'E' : g === 'die' ? 'W' : g === 'dx' ? 'S' : 'N'));
        if (lato === 'S') { x = x0 + W1 * u; y = y0 + D1 - qd; } else if (lato === 'N') { x = x0 + W1 * u; y = y0 + qd; } else if (lato === 'E') { x = x0 + W1 - qd; y = y0 + D1 * u; } else { x = x0 + qd; y = y0 + D1 * u; }
        if (P.forma === 'falda' && lato !== (Co.along ? 'S' : 'E')) continue;
        const k2 = q(80 + k) < (C.zona === 'borgo' ? .3 : .12) ? 'valeriana' : 'erba', it = cosa(C, k2, x, y, q(100 + k) * 6, { qz: qd * tp + A * .5, v: q(120 + k), falda: lato, s: .85 });
        if (metti(C, it)) fatte++; } }
    // l'erba sul colmo: il ciuffo che cresce dalla malta
    if (P.forma !== 'falda' && Co.rl > 1 && q(3) < S.colmo) for (let k = 0; k < 4; k++) { const t = (q(140 + k) - .5) * Co.rl * .8, x = Co.along ? Co.cx + t : Co.cx, y = Co.along ? Co.cy : Co.cy + t;
      if (metti(C, cosa(C, 'erba', x, y, q(150 + k) * 6, { qz: Co.h + (P.manto === 'tegole' ? .12 : .18), v: q(160 + k), colmo: 1, s: .8 }))) break; }
    // nel canale di gronda: la busta, il giornale, la palla persa che si è fermata contro il canale
    if (q(4) < S.gronda) { const lato = P.forma === 'falda' ? (Co.along ? 'S' : 'E') : (q(5) < .6 ? (Co.along ? 'S' : 'E') : (Co.along ? 'N' : 'W')), u = .15 + q(6) * .7, dd = ov + .07;
      const x = lato === 'E' ? x0 + W1 + dd : lato === 'W' ? x0 - dd : x0 + W1 * u, y = lato === 'S' ? y0 + D1 + dd : lato === 'N' ? y0 - dd : y0 + D1 * u;
      const kk = q(7) < .5 ? 'busta' : q(7) < .8 ? 'giornale' : 'pallone', it = cosa(C, kk, x, y, lato === 'E' || lato === 'W' ? PI / 2 : 0, { qz: -ov * tp - th - .03 - .05, v: q(8), gronda: lato });   // nel canale (mezzo tubo di 8,5 cm): la busta sul fondo, la palla sulle labbra
      if (!C.porte.some(p => hyp(p[0] - x, p[1] - y) < PORTA)) C.cose.push(it); }
  }
  function calcola() {
    VISSUTI.length = 0; if (!TT.PIANO || !TT.PIANO.length) return VISSUTI;
    rete();
    TT.PIANO.forEach((P, bi) => { if (!P) return; const b = B[bi], zona = ZONA[P.era]; if (!zona) return;
      const { segs, porte } = corridoi(bi), corr = (P.corr || []).concat(segs);
      const C = { P, b, bi, zona, tipo: P.tipo, segs: corr, porte, cose: [], storia: '', nScene: 0 };
      if (P.tipo === 'piano') terrazza(C); else if (P.colmo) falde(C);
      C.cose.forEach(o => { if (o.k !== 'colatura' && o.k !== 'malta' && !CAT[o.k].vicino && !o.ciglio && !o.gronda) o.n = 1; });
      VISSUTI[bi] = { bi, era: P.era, zona, tipo: P.tipo, vivo: P.vivo, storia: C.storia, cose: C.cose, segs: corr, porte };
    });
    return VISSUTI;
  }
  // la verifica (test_tetti_vissuti.js): densità per quartiere, i corridoi liberi, il conto per il bilancio
  function verifica() {
    const V = { tetti: 0, terrazzi: 0, falde: 0, cose: 0, perZona: {}, perK: {}, scene: {}, vicini: { carte: 0, pozze: 0 }, corridoio: [], urti: [], fuori: [], alti: [] };
    VISSUTI.forEach(T0 => { if (!T0) return; V.tetti++; T0.tipo === 'piano' ? V.terrazzi++ : V.falde++;
      const Z = V.perZona[T0.zona] || (V.perZona[T0.zona] = { terrazzi: 0, vivi: 0, falde: 0, scene: 0, cose: 0, coseVivi: 0, coseCalmi: 0, carte: 0, pozze: 0, erbe: 0, k: {} });
      if (T0.tipo === 'piano') { Z.terrazzi++; if (T0.vivo) Z.vivi++; if (T0.storia) Z.scene++; } else Z.falde++;
      const P = TT.PIANO[T0.bi], b = B[T0.bi], L4 = LT(b), x0 = L4.x0, y0 = L4.y0, W1 = L4.lw, D1 = L4.ld;
      T0.storia.split('+').filter(Boolean).forEach(s => V.scene[s] = (V.scene[s] || 0) + 1);
      T0.cose.forEach((o, i) => { V.cose++; Z.cose++; if (T0.tipo === 'piano') { if (T0.vivo) Z.coseVivi++; else Z.coseCalmi++; }
        V.perK[o.k] = (V.perK[o.k] || 0) + 1; Z.k[o.k] = (Z.k[o.k] || 0) + 1; const c = CAT[o.k];
        if (c.vicino === 1) { V.vicini.carte++; Z.carte++; } if (c.vicino === 2) { V.vicini.pozze++; Z.pozze++; } if (o.k === 'erba' || o.k === 'valeriana' || o.k === 'cappero') Z.erbe++;
        if (o.k === 'colatura' || o.gronda || o.k === 'malta') return;   // fuori dal tetto (sul muro, nel canale) o il colmo stesso (la malta)
        if (o.k !== 'malta' && !c.piatto) T0.segs.forEach(([A, Bq]) => { if (segD(o, A, Bq) < CORR - 1e-6) V.corridoio.push([T0.bi, o.k, 'corridoio']); });   // la malta è il colmo stesso, la pozza si attraversa
        T0.porte.forEach(p => { if (rr(o, p[0], p[1]) < PORTA - 1e-6) V.corridoio.push([T0.bi, o.k, 'porta']); });
        P.riserve.forEach(r => { if (rr(o, r[0], r[1]) < r[2] + .15 - 1e-6) V.corridoio.push([T0.bi, o.k, 'riserva']); });
        P.gruppi.forEach(g => { if (gap(g, o) < .15 - 1e-6) V.urti.push([T0.bi, o.k + '/' + g.k, 'gruppo']); });
        if (T0.tipo === 'piano' && !o.ciglio) { if (o.x - o.hx < x0 + FASCIA || o.x + o.hx > x0 + W1 - FASCIA || o.y - o.hy < y0 + FASCIA || o.y + o.hy > y0 + D1 - FASCIA) V.fuori.push([T0.bi, o.k]);
          if (c.h > ALTO && (o.y + o.hy > y0 + D1 - CAMB || o.x + o.hx > x0 + W1 - CAMB)) V.alti.push([T0.bi, o.k]); }
        T0.cose.forEach((q2, j) => { if (j <= i || q2.k === 'malta' || q2.k === 'colatura' || q2.gronda || !!q2.ciglio !== !!o.ciglio) return;
          if (o.scena && o.scena === q2.scena) { if (q2.sopra === o.k || o.sopra === q2.k || o.cielo || q2.cielo) return; if (gap(o, q2) < 0) V.urti.push([T0.bi, o.k + '/' + q2.k, 'scena']); return; }
          if (gap(o, q2) < .1 - 1e-6) V.urti.push([T0.bi, o.k + '/' + q2.k, 'urto']); }); }); });
    for (const z in V.perZona) { const Z = V.perZona[z]; Z.perTerrazzo = +(Z.cose / Math.max(1, Z.terrazzi + Z.falde)).toFixed(2); Z.perVivo = +(Z.coseVivi / Math.max(1, Z.vivi)).toFixed(2);
      Z.perCalmo = +(Z.coseCalmi / Math.max(1, Z.terrazzi - Z.vivi)).toFixed(2); Z.quotaScene = +(Z.scene / Math.max(1, Z.terrazzi)).toFixed(2); Z.cartePerTetto = +(Z.carte / Math.max(1, Z.terrazzi + Z.falde)).toFixed(3); }
    return V;
  }
  // la firma del dato (la prova del determinismo)
  function firma() { let h = 2166136261 >>> 0; const s = JSON.stringify(VISSUTI.filter(Boolean).map(T0 => [T0.bi, T0.storia, T0.cose.map(o => [o.k, o.x.toFixed(3), o.y.toFixed(3), (o.qz || 0).toFixed(3), (o.ry || 0).toFixed(3), o.v === undefined ? '' : String(o.v).slice(0, 6)])]));
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
  // IL BILANCIO della grafica: i disegni fissi che aggiunge (le istanze vicine: un disegno per tipo di cartaccia e uno per le pozze; i mobili,
  // le piante e la malta stanno nelle mesh fuse: un secchio per settore, col colore nella tavolozza) e le distanze delle istanze
  const VICINO = { carte: 36, pozze: 64, carteTel: 24, pozzeTel: 44, passo: 3 };
  const bilancio = () => ({ disegni: CARTE.length + 1, materiali: 2, vicino: VICINO, fusi: 'un materiale per colore, un secchio per settore con la tavolozza', istanze: CARTE.concat(['pozza']) });

  // =====================================================================================================================
  // LA GRAFICA (solo nella pagina; K: il kit di render.js, kitTV1)
  // =====================================================================================================================
  // i colori: pochi e caldi (una quarantina, ognuno un posto nella tavolozza di [leggero])
  const COL = { cotto: '#a8583a', cotto2: '#b8683e', cotto3: '#8a4a32', foglia: '#4a6a38', foglia2: '#5a8a3a', foglia3: '#3e5a32', erba: '#7a8a3a', erba2: '#5a7a34', fiore: '#c84a5a', valer: '#c8506a',
    bianco: '#e8e4dc', ferro: '#26262c', legno: '#4a3626', legno2: '#8a6a44', canna: '#c8b078', panno: ['#2f6f8f', '#c8473a', '#e0b040', '#3f7f5f'], tela: ['#e8dcc0', '#c8473a', '#2f6f8f'],
    latta: '#a8a8a0', zinco: '#8a8e90', blu: '#3a6a9a', rosso: '#a83a2e', verde: '#3a6a3a', rete: ['#3a6a6a', '#5a7a3a', '#4a5a6a'], boa: '#e86a2a', corda: '#c8b890', poli: '#e8e8e2',
    gatto: ['#c87a3a', '#3a3a3e', '#d8d4cc'], limone: '#e8c840', malta: '#d0c8b8', macchia: '#5a5048', macchia2: '#6e665a', sale: '#d8d2c6', paglia: '#b89a5a', vimini: '#a88a5a' };
  const pk = (a, u) => Array.isArray(a) ? a[Math.floor((u || 0) * a.length) % a.length] : a;
  function costruttori(K) {
    // i pezzi: geometrie semplici con un materiale per colore (K.sm, la cache di render.js), tutti uguali a meno del colore: nella fusione
    // di [leggero] vanno in un secchio solo per settore col colore nella tavolozza. Non le celle dell'atlante (FA): l'atlante ha 256 celle e
    // quando la città arriva ai tetti sono già finite (oltre la 255 tutto finisce nell'ultima cella, con l'ultimo colore disegnato).
    const T3 = K.THREE, mat = hex => K.sm(hex, { roughness: .82, userData: { vissuti: 1 } }),   /* il marchio: la misura li ritrova nella mesh fusa */ GEO = new Map(), geo = (k, f) => GEO.get(k) || GEO.set(k, f()).get(k);
    const fB = (w, h, d, hex) => new T3.Mesh(geo('B' + w + ',' + h + ',' + d, () => new T3.BoxGeometry(w, h, d)), mat(hex));
    const fC = (rt, rb, h, seg, hex) => new T3.Mesh(geo('C' + [rt, rb, h, seg], () => new T3.CylinderGeometry(rt, rb, h, seg || 8)), mat(hex));
    const fL = (prof, seg, hex) => new T3.Mesh(geo('L' + prof.join(';') + seg, () => new T3.LatheGeometry(prof.map(([a, b]) => new T3.Vector2(Math.max(.001, a), b)), seg || 8)), mat(hex));
    const fI = (r, det, hex) => new T3.Mesh(geo('I' + r + ',' + det, () => new T3.IcosahedronGeometry(r, det)), mat(hex));
    const fT = (R, t, seg, hex) => { const m = new T3.Mesh(geo('T' + [R, t, seg], () => new T3.TorusGeometry(R, t, 4, seg || 12)), mat(hex)); m.rotation.x = PI / 2; return m; };
    const fAt = (g, o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };
    const fRod = (g, a, b, r, hex) => { const d = new T3.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), m = new T3.Mesh(geo('R' + r + ',' + L.toFixed(3), () => new T3.CylinderGeometry(r, r, L, 5)), mat(hex));
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), d.normalize()); g.add(m); return m; };
    const g = () => new T3.Group();
    const vaso = (o, r, h, col) => fAt(o, fL([[.001, 0], [r * .74, 0], [r, h * .9], [r * 1.1, h * .92], [r * 1.1, h], [r * .9, h], [.001, h * .88]], 8, col, 'clay'), 0, 0, 0);
    const foglie = (o, n, y, R, col, rad) => { for (let k = 0; k < n; k++) { const a = k * 2.4 + .3, f = fI(rad, 0, k % 2 ? col : COL.foglia3, 'leaf'); f.position.set(Math.cos(a) * R, y + (k % 3) * .04, Math.sin(a) * R); f.scale.set(1, .8, 1); o.add(f); } };
    const pianta = (o, v, y, R) => {
      if (v === 'basilico') foglie(o, 4, y + .05, R * .5, COL.foglia2, .07);
      else if (v === 'cactus') { fAt(o, fC(.045, .055, .3, 6, COL.foglia, 'leaf'), 0, y + .15, 0); fRod(o, [0, y + .14, 0], [.09, y + .2, 0], .025, COL.foglia, 'leaf'); }
      else if (v === 'secco') { for (let k = 0; k < 4; k++) { const a = k * 1.6; fRod(o, [0, y - .02, 0], [Math.cos(a) * .12, y + .3, Math.sin(a) * .12], .008, COL.legno2, 'wood'); } }
      else { foglie(o, 4, y + .06, R * .55, COL.foglia, .09); for (let k = 0; k < 4; k++) { const a = k * 1.7 + .5; fAt(o, fB(.06, .05, .06, COL.fiore, 'solid', 0), Math.cos(a) * R * .6, y + .2, Math.sin(a) * R * .6); } }   // il geranio
    };
    const sediaFerro = (col, paglia) => { const o = g(); fAt(o, fB(.42, .05, .42, paglia ? COL.paglia : col, paglia ? 'cloth' : 'paint', 0), 0, .45, 0);
      fAt(o, fB(.42, .36, .04, paglia ? COL.legno2 : col, paglia ? 'wood' : 'paint', 0), 0, .68, -.19);
      [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, c]) => fAt(o, fB(.035, c < 0 ? .86 : .45, .035, paglia ? COL.legno2 : COL.ferro, paglia ? 'wood' : 'paint', 0), a, (c < 0 ? .86 : .45) / 2, c)); return o; };
    return {
      sdraio: v => { const o = g(), col = pk(COL.panno, v);   // il telo inclinato fra due telai di legno, i piedi sul lastrico
        const t = fB(.5, .02, 1.3, col, 'cloth', 0); t.position.set(0, .48, .02); t.rotation.x = -.42; o.add(t);
        [-.27, .27].forEach(x => { fRod(o, [x, 0, .62], [x, .36, .5], .018, COL.legno2, 'wood'); fRod(o, [x, 0, -.5], [x, .82, -.56], .018, COL.legno2, 'wood'); fRod(o, [x, .3, .55], [x, .78, -.58], .018, COL.legno2, 'wood'); });
        fAt(o, fB(.56, .03, .03, COL.legno2, 'wood', 0), 0, .8, -.56); return o; },
      tavolino: () => { const o = g(); fAt(o, fC(.3, .3, .03, 10, '#e8e2d6', 'paint'), 0, .74, 0); fAt(o, fC(.025, .025, .72, 5, COL.ferro, 'paint'), 0, .37, 0); fAt(o, fC(.16, .19, .03, 8, COL.ferro, 'paint'), 0, .015, 0); return o; },
      sedia: v => sediaFerro(pk(['#8a3a2e', '#2f5f4f', '#e8e2d6'], v), false),
      impagliata: () => sediaFerro(null, true),
      asta: () => { const o = g(); fAt(o, fC(.13, .14, .08, 8, '#5a5a5e', 'concrete'), 0, .04, 0); fAt(o, fC(.018, .018, 2.12, 5, COL.bianco, 'plastic'), 0, 1.1, 0); return o; },
      telo: v => { const o = g(), col = pk(COL.tela, v); fAt(o, fL([[.84, 0], [.82, .04], [.42, .19], [.001, .28]], 8, col, 'cloth'), 0, 1.9, 0); fAt(o, fC(.84, .84, .1, 8, col, 'cloth'), 0, 1.88, 0); return o; },
      palo: () => { const o = g(); fAt(o, fB(.07, 2.08, .07, COL.legno, 'wood', 0), 0, 1.04, 0); return o; },
      stuoia: v => { const o = g(); fAt(o, fB(2.5, .05, .07, COL.legno, 'wood', 0), 0, 2.11, -.95); fAt(o, fB(2.5, .05, .07, COL.legno, 'wood', 0), 0, 2.11, .95);
        fAt(o, fB(2.42, .03, 2.04, COL.canna, 'slat', 0), 0, 2.15, 0);
        if (v === 'vite') for (let k = 0; k < 5; k++) { const f = fI(.32, 0, k % 2 ? COL.foglia : COL.foglia3, 'leaf'); f.scale.set(1.1, .35, 1); f.position.set(-.9 + k * .45, 2.22, (k % 3 - 1) * .5); o.add(f); }
        return o; },
      stendino: v => { const o = g();   // lo stendino pieghevole: due gambe a X per parte, quattro fili, i panni
        [-.44, .44].forEach(x => { fRod(o, [x, 0, -.3], [x, .98, .26], .012, COL.zinco, 'galv'); fRod(o, [x, 0, .3], [x, .98, -.26], .012, COL.zinco, 'galv'); });
        [-.24, -.08, .08, .24].forEach(z => fAt(o, fB(.92, .012, .012, COL.zinco, 'galv', 0), 0, .98, z));
        for (let k = 0; k < 5; k++) { const w = .2 + ((k * 7 + Math.round(v * 9)) % 3) * .06, h = .26 + ((k * 5) % 3) * .07; fAt(o, fB(w, h, .012, pk(['#d8d0b8', '#b04a4a', '#4a6aa0', '#caa83a', '#e8e4dc'], (k * .23 + v) % 1), 'cloth', 0), -.32 + k * .16, .97 - h / 2, [-.24, -.08, .08, .24][k % 4]); }
        return o; },
      cesta: () => { const o = g(); fAt(o, fL([[.001, 0], [.17, 0], [.2, .22], [.18, .22], [.15, .03], [.001, .03]], 8, COL.vimini, 'wood'), 0, 0, 0); o.children[0].scale.set(1.2, 1, .85); fAt(o, fB(.3, .06, .2, '#e8e4dc', 'cloth', 0), 0, .2, 0); return o; },
      secchio: v => { const o = g(); fAt(o, fL([[.001, 0], [.11, 0], [.15, .28], [.135, .28], [.1, .03], [.001, .03]], 8, pk([COL.blu, COL.rosso, COL.zinco], v), v < .66 ? 'plastic' : 'galv'), 0, 0, 0); return o; },
      cisterna: v => { const o = g(), col = v < .5 ? COL.blu : '#9a968c'; fAt(o, fB(.92, .12, .92, '#9a968c', 'concrete', 0), 0, .06, 0); fAt(o, fC(.42, .42, .94, 10, col, v < .5 ? 'plastic' : 'concrete'), 0, .59, 0); fAt(o, fC(.2, .22, .06, 8, col, 'plastic'), 0, 1.09, 0); return o; },
      limone: () => { const o = g(); vaso(o, .3, .46, COL.cotto2); fAt(o, fC(.03, .045, .78, 5, COL.legno2, 'wood'), 0, .84, 0);
        [[0, 1.36, 0, .34], [.2, 1.22, .1, .26], [-.18, 1.24, -.08, .27]].forEach(([x, y, z, r]) => { const f = fI(r, 0, COL.foglia3, 'leaf'); f.position.set(x, y, z); o.add(f); });
        [[.26, 1.3, .1], [-.2, 1.42, .14], [.08, 1.18, -.26], [-.28, 1.16, -.06], [.14, 1.5, .02]].forEach(([x, y, z]) => fAt(o, fI(.045, 0, COL.limone, 'paint'), x, y, z)); return o; },
      vaso: v => { const o = g(), big = v === 'geranio' ? .2 : .17; vaso(o, big, .32, v === 'secco' ? COL.cotto3 : COL.cotto); pianta(o, v, .3, big); return o; },
      latta: v => { const o = g(); fAt(o, fC(.07, .07, .16, 8, v === 'cactus' ? COL.rosso : COL.latta, v === 'cactus' ? 'paint' : 'galv'), 0, .08, 0); pianta(o, v === 'geranio' ? 'basilico' : v, .15, .1); return o; },
      cassetta: v => { const o = g();
        if (v === 'pesce') { fAt(o, fB(.6, .2, .4, COL.poli, 'plastic', 0), 0, .1, 0); fAt(o, fB(.54, .02, .34, '#a8b4b8', 'solid', 0), 0, .19, 0); }
        else if (v === 'legno') { fAt(o, fB(.6, .26, .4, '#9a7a52', 'slat', 0), 0, .13, 0); }
        else { fAt(o, fB(.6, .2, .4, COL.poli, 'plastic', 0), 0, .1, 0); fAt(o, fB(.54, .02, .34, '#3a2e24', 'solid', 0), 0, .19, 0); [-.16, 0, .16].forEach((x, k) => { const f = fI(.08, 0, k % 2 ? COL.foglia2 : COL.foglia, 'leaf'); f.position.set(x, .25, 0); o.add(f); }); }
        return o; },
      annaffiatoio: () => { const o = g(); fAt(o, fL([[.001, 0], [.11, 0], [.11, .2], [.08, .22], [.001, .22]], 8, COL.verde, 'paint'), 0, 0, 0); fRod(o, [.08, .1, 0], [.22, .24, 0], .012, COL.verde, 'paint'); return o; },
      rete: v => { const o = g(); [[0, 0, .42, .3], [.2, .08, .3, .24], [-.2, -.05, .3, .22]].forEach(([x, z, r, s], k) => { const f = fI(r, 1, pk(COL.rete, (v + k * .3) % 1), 'cloth'); f.scale.set(1, s * .5 / r, .85); f.position.set(x, s * .5 + .005, z); o.add(f); });
        [[.3, .2, -.15], [-.25, .15, .2], [.05, .24, .12]].forEach(([x, y, z]) => fAt(o, fI(.05, 0, COL.boa, 'plastic'), x, y, z)); return o; },
      boe: () => { const o = g(); [[-.12, .11, 0, COL.boa], [.12, .11, .04, COL.boa], [0, .09, -.12, COL.bianco]].forEach(([x, y, z, c]) => fAt(o, fI(y, 1, c, 'plastic'), x, y, z)); return o; },
      cima: () => { const o = g(); const t = fT(.17, .035, 10, COL.corda, 'cloth'); t.position.y = .035; o.add(t); const t2 = fT(.1, .03, 8, COL.corda, 'cloth'); t2.position.y = .07; o.add(t2); return o; },
      remi: () => { const o = g(); [-.06, .07].forEach((z, k) => { const r = fB(2.0, .035, .07, COL.legno2, 'wood', 0); r.position.set(k * .05, .02 + k * .035, z); r.rotation.y = k ? .04 : 0; o.add(r); const p = fB(.42, .02, .15, COL.legno2, 'wood', 0); p.position.set(.8 + k * .05, .015 + k * .035, z); o.add(p); }); return o; },
      gatto: v => { const o = g(), col = pk(COL.gatto, v), b = fI(.12, 1, col, 'cloth'); b.scale.set(1.5, .75, 1); b.position.y = .09; o.add(b);   // il gatto che dorme acciambellato
        fAt(o, fI(.065, 1, col, 'cloth'), .15, .1, .05); fRod(o, [-.15, .04, 0], [-.05, .03, .12], .02, col, 'cloth'); return o; },
      erba: v => { const o = g(), col = v < .5 ? COL.erba : COL.erba2;   // i fili: lame sottili aperte a ventaglio
        for (let k = 0; k < 5; k++) { const a = k * 1.26 + v * 3, l = fB(.03, .22 + (k % 3) * .04, .012, col, 'leaf', 0); l.position.set(Math.cos(a) * .03, .165, Math.sin(a) * .03); l.rotation.set(Math.sin(a) * .3, a, Math.cos(a) * .3); o.add(l); }
        return o; },
      valeriana: v => { const o = g(); for (let k = 0; k < 4; k++) { const a = k * 1.57 + v * 2, l = fB(.03, .3, .012, COL.erba2, 'leaf', 0); l.position.set(Math.cos(a) * .04, .16, Math.sin(a) * .04); l.rotation.set(Math.sin(a) * .3, a, Math.cos(a) * .3); o.add(l); }
        [[.04, .34, .02], [-.05, .3, -.03], [.0, .38, -.06], [-.02, .32, .07]].forEach(([x, y, z]) => fAt(o, fI(.045, 0, COL.valer, 'leaf'), x, y, z)); return o; },
      cappero: () => { const o = g(), f = fI(.2, 1, COL.foglia, 'leaf'); f.scale.set(1, .55, 1); f.position.y = .1; o.add(f); [[.1, .18, .05], [-.08, .17, .1], [0, .2, -.1]].forEach(([x, y, z]) => fAt(o, fB(.05, .03, .05, '#f0d8e0', 'solid', 0), x, y, z)); return o; },
      sale: v => { const o = g(); [[0, 0, .42, .32], [.25, .12, .22, .18], [-.2, -.08, .2, .16]].forEach(([x, z, a, c], k) => { const d = fC(1, 1, .006, 9, COL.sale, 'concrete'); d.scale.set(a, 1, c); d.position.set(x, .003 + k * .001, z); d.rotation.y = v * 3 + k; o.add(d); }); return o; },
      colatura: v => { const o = g(), col = v < .5 ? COL.macchia : COL.macchia2, h = .55 + v * .5; fAt(o, fB(.12, h, .008, col, 'concrete', 0), 0, -h / 2, 0); fAt(o, fB(.05, h * .5, .008, col, 'concrete', 0), .07, -h * .55, 0); return o; },
      malta: (v, it) => { const o = g(), L = it.lung || .8; fAt(o, fB(L, .1, .36 + v * .06, COL.malta, 'concrete', 0), 0, .02, 0); return o; },
    };
  }
  // ---------------- i pezzi fusi: dentro il gruppo del tetto della casa ----------------
  const FATTI = new Set(), SCATOLE = [];   // le case già arredate; le scatole dei pezzi (per la misura delle compenetrazioni)
  let KB = null;
  function posa(g, T0, top, K) {   // T0: VISSUTI[bi]; g: il gruppo del tetto (riferimento della casa non girata)
    if (!KB) KB = costruttori(K);
    const T3 = K.THREE, bx = new T3.Box3();
    T0.cose.forEach(o => { const c = CAT[o.k]; if (c.vicino) return; const f = KB[o.k]; if (!f) return;
      const m = f(typeof o.v === 'number' ? o.v : o.v === undefined ? h4(Math.round(o.x * 10), Math.round(o.y * 10), 7) : o.v, o);
      if (o.k === 'malta' || o.k === 'colatura') m.rotation.y = o.ry; else m.rotation.y = o.ry;
      if (o.s && o.k !== 'colatura' && o.k !== 'sale') m.scale.setScalar(o.s); if (o.k === 'colatura') m.scale.set(1, o.s, 1);
      if (o.falda) { const ax = o.falda === 'S' || o.falda === 'N' ? 'x' : 'z', sg = o.falda === 'S' || o.falda === 'E' ? 1 : -1, P = TT.PIANO[T0.bi]; m.rotation.set(0, 0, 0); m.rotation[ax] = (ax === 'x' ? 1 : -1) * sg * P.pitch * .6; }   // il ciuffo segue un po' la falda
      m.position.set(o.x, top + (o.qz || 0), o.y); g.add(m);
      if (o.k !== 'malta' && o.k !== 'colatura' && !o.falda && !o.colmo) { m.updateMatrixWorld(true); bx.setFromObject(m); SCATOLE.push({ bi: T0.bi, k: o.k, scena: o.scena, sopra: o.sopra, ciglio: o.ciglio, cielo: c.cielo, B: bx.clone(), top }); }
    });
    FATTI.add(T0.bi);
  }
  // render.js, buildRoofs: il terrazzo della casa, nel suo gruppo, prima della fusione
  function terrazzo(g, rec, top, K) {
    if (SPENTO || !rec || !rec.b) return; if (ATL0 === null) ATL0 = K.atlas; const bi = BI0.get(rec.b); if (bi === undefined) return; const T0 = VISSUTI[bi]; if (!T0 || FATTI.has(bi)) return;
    T0.top = top; posa(g, T0, top, K);
  }
  const BI0 = new Map(); B.forEach((b, i) => BI0.set(b, i));
  let ATL0 = null;   // le celle dell'atlante prima del primo terrazzo (la misura)
  // ---------------- le istanze vicine: cartacce e pozze ----------------
  const VIC = { on: false, tipi: [], cella: 16, griglia: new Map(), fx: NaN, fy: NaN, n: 0, mostrate: 0, K: null };
  function geoCarta(T3, k) {
    const jit = (geo, a, s) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const u = h4(i, Math.round(p.getX(i) * 100), s), w = h4(i, Math.round(p.getZ(i) * 100), s + 1); p.setXYZ(i, p.getX(i) * (1 + (u - .5) * a), Math.max(0, p.getY(i) * (1 + (w - .5) * a)), p.getZ(i) * (1 + (w - u) * a)); } geo.computeVertexNormals(); return geo; };
    let geo;
    if (k === 'busta') geo = jit(new T3.BoxGeometry(.28, .09, .18, 2, 1, 2).translate(0, .045, 0), .45, 3);   // la busta di carta bagnata, afflosciata
    else if (k === 'cartaccia') geo = jit(new T3.IcosahedronGeometry(.06, 0).translate(0, .05, 0), .5, 5);
    else if (k === 'giornale') { geo = new T3.PlaneGeometry(.42, .3, 3, 2).rotateX(-PI / 2); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, .004 + Math.abs(Math.sin(p.getX(i) * 9)) * .018 + h4(i, 1, 9) * .01); geo.computeVertexNormals(); }
    else if (k === 'tappi') { const parts = [[0, 0], [.06, .04], [-.04, .06]].map(([x, z]) => new T3.CylinderGeometry(.016, .016, .01, 6).translate(x, .005, z)); geo = mergeSemplice(T3, parts); }
    else if (k === 'pallone') geo = new T3.IcosahedronGeometry(.11, 1).translate(0, .1, 0);
    else if (k === 'scarpa') { geo = new T3.BoxGeometry(.27, .09, .1, 2, 1, 1).translate(0, .045, 0); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getX(i) > .05 && p.getY(i) > .05) p.setY(i, .06); geo.computeVertexNormals(); }
    else geo = new T3.CylinderGeometry(.033, .033, .12, 8).rotateZ(PI / 2).translate(0, .033, 0);   // la lattina stesa
    return geo;
  }
  function mergeSemplice(T3, geos) { let n = 0; const G2 = geos.map(q => q.index ? q.toNonIndexed() : q); G2.forEach(q => n += q.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let k = 0; G2.forEach(q => { pos.set(q.attributes.position.array, k * 3); nor.set(q.attributes.normal.array, k * 3); k += q.attributes.position.count; });
    const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T3.BufferAttribute(nor, 3)); return geo; }
  function geoPozza(T3) {   // il disco irregolare: il nucleo lucido (bordo 0) e l'anello bagnato (bordo 1)
    const N = 16, rad = a => 1 + .16 * Math.sin(2 * a + 1.3) + .09 * Math.sin(3 * a + .4) + .05 * Math.sin(5 * a + 2.1), pos = [], bo = [];
    const P = (r, a) => [Math.cos(a) * r * rad(a), 0, Math.sin(a) * r * rad(a)];
    for (let i = 0; i < N; i++) { const a0 = i / N * 2 * PI, a1 = (i + 1) / N * 2 * PI, i0 = P(.72, a0), i1 = P(.72, a1), o0 = P(1, a0), o1 = P(1, a1);
      pos.push(0, 0, 0, ...i1, ...i0); bo.push(0, 0, 0);
      pos.push(...i0, ...i1, ...o1, ...i0, ...o1, ...o0); bo.push(0, 0, 1, 0, 1, 1); }
    const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setAttribute('bordo', new T3.Float32BufferAttribute(bo, 1));
    geo.setAttribute('normal', new T3.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3)); return geo;
  }
  function matPozza(T3) {
    const m = new T3.MeshStandardMaterial({ color: '#ffffff', roughness: .12, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    m.userData.cielo = { value: new T3.Color('#9fb4c4') }; m.userData.luce = { value: 1 };
    m.onBeforeCompile = sh => { sh.uniforms.uTvCielo = m.userData.cielo; sh.uniforms.uTvLuce = m.userData.luce;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float bordo; varying float vTvB;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTvB = bordo;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTvB; uniform vec3 uTvCielo; uniform float uTvLuce;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(.42, .74, smoothstep(.0, 1., vTvB));')   // il nucleo scuro, l'anello bagnato del lastrico
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.06, .85, smoothstep(.2, .9, vTvB));')
        .replace('#include <output_fragment>', 'float tvFr = pow(1. - saturate(dot(geometry.normal, geometry.viewDir)), 3.);\noutgoingLight = mix(outgoingLight, uTvCielo * uTvLuce, (.18 + .5 * tvFr) * (1. - smoothstep(.0, .7, vTvB)));\n#include <output_fragment>');   // il cielo nell'acqua ferma: niente riflesso vero, la tinta del cielo col fresnel
    };
    m.customProgramCacheKey = () => 'tv-pozza'; return m;
  }
  function preparaVicini(K) {
    const T3 = K.THREE, CAR = new T3.MeshStandardMaterial({ color: '#ffffff', roughness: .72 }), POZ = matPozza(T3), M4 = new T3.Matrix4(), Q = new T3.Quaternion(), V3 = new T3.Vector3(), S3 = new T3.Vector3(), E = new T3.Euler();
    const tinte = { busta: ['#6e5236', '#7a5a3a', '#5e4a34'], cartaccia: ['#e8e4d8', '#c8c4b8', '#d8d0b8'], giornale: ['#b8b4a4', '#a8a498', '#c4beb0'], tappi: ['#b8302a', '#2a4a8a', '#c8a030'], pallone: ['#c84030', '#e8e4dc', '#3a6a9a'], scarpa: ['#3a3a3e', '#e8e4dc', '#8a4a2a'], lattina: ['#a83a2e', '#c8c8c0', '#3a6a3a'] };
    const deck = { pianelle: '#7a5a4a', quadrotti: '#7c7872' };
    VIC.tipi = CARTE.concat(['pozza']).map(k => ({ k, voci: [], im: null, max: 0 }));
    const byK = new Map(VIC.tipi.map(t => [t.k, t]));
    VISSUTI.forEach(T0 => { if (!T0) return; const rec = K.bRec[T0.bi], b = B[T0.bi]; if (!rec || !rec.box3) return; const top = T0.top !== undefined ? T0.top : rec.box3.max.y - 2.5;
      const a = K.rotOf(b), cx = LT(b).cx, cz = LT(b).cy, c = Math.cos(a), s = Math.sin(a), P = TT.PIANO[T0.bi];
      T0.cose.forEach(o => { const cat = CAT[o.k]; if (!cat.vicino) return; const t = byK.get(o.k); if (!t) return;
        const qx = o.x - cx, qz = o.y - cz, wx = a ? cx + qx * c - qz * s : o.x, wz = a ? cz + qx * s + qz * c : o.y;   // come rotRec: girata di -a attorno al centro
        const u = typeof o.v === 'number' ? o.v : .5, sc = o.k === 'pozza' ? (o.s || 1) : .9 + u * .2;
        E.set(o.k === 'pallone' ? u : 0, o.ry - a, 0); Q.setFromEuler(E); V3.set(wx, top + (o.qz || .08), wz);
        if (o.k === 'pozza') S3.set(cat.hx * sc / 1.3, 1, cat.hy * sc / 1.3); else S3.set(sc, sc, sc);   // la pozza: il disco (raggio fino a 1,3) dentro la sua impronta
        M4.compose(V3, Q, S3);
        const col = new T3.Color(o.k === 'pozza' ? deck[P && P.manto] || deck.pianelle : pk(tinte[o.k], u));
        const v = { x: wx, z: wz, m: M4.clone(), col, rec, pozza: o.k === 'pozza' }; t.voci.push(v);
        const gk = Math.floor(wx / VIC.cella) + ',' + Math.floor(wz / VIC.cella); (VIC.griglia.get(gk) || VIC.griglia.set(gk, []).get(gk)).push([t, v]); }); });
    VIC.tipi.forEach(t => { if (!t.voci.length) return; const geo = t.k === 'pozza' ? geoPozza(T3) : geoCarta(T3, t.k);
      t.max = Math.min(t.voci.length, t.k === 'pozza' ? 160 : 120);
      const im = new T3.InstancedMesh(geo, t.k === 'pozza' ? POZ : CAR, t.max); im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; im.matrixAutoUpdate = false; im.userData.vissuti = t.k; im.material.userData.vissuti = 1; im.userData.keep = true;
      im.instanceColor = new T3.InstancedBufferAttribute(new Float32Array(t.max * 3), 3); t.im = im; K.scene.add(im); });
    VIC.POZ = POZ; VIC.on = true; VIC.K = K;
  }
  // un passo: ogni volta che il fuoco si sposta di qualche metro (o ogni mezzo secondo, per il taglio e i tetti che sbiadiscono) si rifanno le istanze
  function vicino(fx, fy, frameN, notte) {
    if (!VIC.on || SPENTO) return; const K = VIC.K;
    if (VIC.POZ && notte !== undefined) { VIC.POZ.userData.luce.value = 1 - Math.min(1, notte) * .85; if (K.scene.fog) { const f = K.scene.fog.color; VIC.POZ.userData.cielo.value.setRGB(Math.min(1, f.r * 1.05 + .06), Math.min(1, f.g * 1.05 + .07), Math.min(1, f.b * 1.08 + .09)); } }
    const mosso = !(hyp(fx - VIC.fx, fy - VIC.fy) < VICINO.passo); if (!mosso && frameN % 30 !== 0) return; VIC.fx = fx; VIC.fy = fy;
    const tel = !!K.phone, Rc = tel ? VICINO.carteTel : VICINO.carte, Rp = tel ? VICINO.pozzeTel : VICINO.pozze, V3S = K.vis3, nasc = r => r.__t4 || r.out1 || (V3S && V3S.vivi && V3S.vivi.has(r));
    VIC.tipi.forEach(t => { if (t.im) t.im.count = 0; });
    const c0 = Math.floor((fx - Rp) / VIC.cella), c1 = Math.floor((fx + Rp) / VIC.cella), r0 = Math.floor((fy - Rp) / VIC.cella), r1 = Math.floor((fy + Rp) / VIC.cella); let n = 0;
    for (let cx = c0; cx <= c1; cx++) for (let cz = r0; cz <= r1; cz++) { const L = VIC.griglia.get(cx + ',' + cz); if (!L) continue;
      for (const [t, v] of L) { const im = t.im; if (!im || im.count >= t.max) continue; const d = hyp(v.x - fx, v.z - fy); if (d > (v.pozza ? Rp : Rc) || nasc(v.rec)) continue;
        im.setMatrixAt(im.count, v.m); im.setColorAt(im.count, v.col); im.count++; n++; } }
    VIC.tipi.forEach(t => { if (!t.im) return; t.im.instanceMatrix.needsUpdate = true; if (t.im.instanceColor) t.im.instanceColor.needsUpdate = true; t.im.visible = t.im.count > 0; });
    VIC.mostrate = n;
  }
  // render.js, dopo buildRoofs: le falde e i terrazzi rimasti (case senza il programma del tetto), poi le istanze vicine
  function costruisci(K) {
    if (typeof window !== 'undefined') window.__vissuti = { atlantePrima: K.atlas };
    if (SPENTO || !VISSUTI.length) return 0; let n = 0; const T3 = K.THREE; if (ATL0 === null) ATL0 = K.atlas;
    VISSUTI.forEach(T0 => { if (!T0 || FATTI.has(T0.bi)) return; const rec = K.bRec[T0.bi]; if (!rec || !rec.box3 || rec.b !== B[T0.bi]) return;
      if (!T0.cose.some(o => !CAT[o.k].vicino)) { FATTI.add(T0.bi); return; }
      const top = rec.box3.max.y - 2.5; T0.top = top; const g = new T3.Group(); posa(g, T0, top, K);
      if (!g.children.length) return; const gm = K.shadowed(K.mergeGroup(g)); K.rotRec(rec, gm); K.ownMats(gm, rec); K.scene.add(gm); n++; });
    try { preparaVicini(K); } catch (e) { if (typeof console !== 'undefined') console.warn('[vissuti] istanze', e); }
    if (typeof window !== 'undefined') window.__vissuti = { case: FATTI.size, gruppi: n, atlantePrima: ATL0, atlante: K.atlas, istanze: VIC.tipi.map(t => t.k + ':' + t.voci.length).join(' ') };
    return n;
  }
  // la misura sul modello vero (strumenti/compenetrazioni.js, attraverso window.__tetti3): i pezzi fra loro, col parapetto, coi gruppi del piano
  function urti() {
    const U = [], perCasa = new Map(); SCATOLE.forEach(S => (perCasa.get(S.bi) || perCasa.set(S.bi, []).get(S.bi)).push(S));
    perCasa.forEach((L, bi) => { const b = B[bi], P = TT.PIANO[bi], L4 = LT(b), x0 = L4.x0, z0 = L4.y0, x1 = L4.x1, z1 = L4.y1, pt = .28;
      L.forEach((S, i) => { const X = S.B, top = S.top;
        if (!S.ciglio && P.tipo === 'piano' && (X.min.x < x0 + pt - .02 || X.max.x > x1 - pt + .02 || X.min.z < z0 + pt - .02 || X.max.z > z1 - pt + .02)) U.push([bi, 'vissuti:' + S.k, 'parapetto']);
        if (!S.ciglio && P.tipo === 'piano' && X.min.y < top + .08 - .03) U.push([bi, 'vissuti:' + S.k, 'lastrico']);
        P.gruppi.forEach(g => { if (X.min.x < g.x + g.hx - .02 && X.max.x > g.x - g.hx + .02 && X.min.z < g.y + g.hy - .02 && X.max.z > g.y - g.hy + .02 && X.min.y < top + .08 + (g.alto || 1)) U.push([bi, 'vissuti:' + S.k + '/' + g.k, 'urto']); });
        if (P.cupola) { const c = P.cupola; if (X.min.x < c.x + c.hx && X.max.x > c.x - c.hx && X.min.z < c.y + c.hy && X.max.z > c.y - c.hy) U.push([bi, 'vissuti:' + S.k + '/' + c.k, 'urto']); }
        L.forEach((T2, j) => { if (j <= i || !!T2.ciglio !== !!S.ciglio) return; const Y = T2.B; if (S.scena && S.scena === T2.scena && (S.sopra === T2.k || T2.sopra === S.k || CAT[S.k].con === T2.k)) return;
          if (X.min.x < Y.max.x - .02 && X.max.x > Y.min.x + .02 && X.min.z < Y.max.z - .02 && X.max.z > Y.min.z + .02 && X.min.y < Y.max.y - .02 && X.max.y > Y.min.y + .02) U.push([bi, 'vissuti:' + S.k + '/' + T2.k, 'urto']); }); }); });
    return U;
  }
  const conto = () => { const V = verifica(); return { tetti: V.tetti, cose: V.cose, scene: V.scene, perZona: Object.fromEntries(Object.entries(V.perZona).map(([z, Z]) => [z, { perTerrazzo: Z.perTerrazzo, perVivo: Z.perVivo, quotaScene: Z.quotaScene }])), istanze: VIC.mostrate, scatole: SCATOLE.length }; };

  // =====================================================================================================================
  // IL MANTO: il tempo sui coppi, sulle tegole e sui lastrici (shader), dal mondo e non dalla tela
  // =====================================================================================================================
  // kind: coppi, tegole (falde: la gronda è la v della tela, 16 m per unità), pianelle, cemento (lastrici). Celle del manto in unità di uv.
  const CELLE = { coppi: [256 / 6, 256 / 8], tegole: [256 / 4, 256 / 7], pianelle: [256 / 5, 256 / 5], cemento: [256 / 8, 256 / 8] };
  function manto(m, kind) {
    if (SPENTO || !CELLE[kind] || !TT.PIANO || !TT.PIANO.length) return m;
    m.userData.tv1 = kind; applica(m); return m;
  }
  // falde: i rappezzi di coppi nuovi (arancio) e i campi vecchi (grigi), il muschio verso nord e sulla gronda (la v della tela è la
  // distanza dalla gronda: 16 m per unità), i licheni a macchiette, il coppo rotto o mancante (la cella del manto: si vede il sotto).
  // lastrici: le chiazze d'umido scure, le crepe (la cresta di un rumore), i rappezzi di cemento fra le pianelle, il muschio, la pianella rotta.
  // Niente commenti nel GLSL (gli accenti non passano ovunque); niente `diffuse` né `map` (la tavolozza e la pila di [leggero] lo provano a vuoto).
  function applica(m) {
    const kind = m.userData.tv1, cel = CELLE[kind], falda = kind === 'coppi' || kind === 'tegole', f = v => v.toFixed(4);
    m.customProgramCacheKey = () => 'tv1-' + kind;
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTvP; varying vec3 vTvN;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTvP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTvN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vTvP; varying vec3 vTvN;
float tvH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tvN(vec2 p) { vec2 i = floor(p), q = fract(p); q = q * q * (3. - 2. * q); return mix(mix(tvH(i), tvH(i + vec2(1., 0.)), q.x), mix(tvH(i + vec2(0., 1.)), tvH(i + vec2(1., 1.)), q.x), q.y); }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
#ifdef USE_UV
{ vec2 w = vTvP.xz; float a = tvN(w * .23) * .65 + tvN(w * .71 + 7.) * .35, mo = tvN(w * 1.9 + 3.) * .6 + tvN(w * 5.3) * .4;
  vec3 c = diffuseColor.rgb; float lum = dot(c, vec3(.3, .5, .2));
  ${falda ? `float nuovo = smoothstep(.68, .8, a), vecchio = smoothstep(.36, .2, a);
  c = mix(c, c * vec3(1.18, 1.0, .84), nuovo * .8); c = mix(c, vec3(lum) * vec3(.84, .82, .78), vecchio * .5);
  float nord = clamp(-vTvN.z * 1.6, 0., 1.), gronda = 1. - smoothstep(.0, 1.1, vUv.y * 16.);
  float mu = clamp(nord * .75 + gronda * .55 + vecchio * .35, 0., 1.) * smoothstep(.48, .74, mo);
  c = mix(c, vec3(.27, .31, .16), mu * .72);
  float li = step(.9, tvH(floor(w * 6.3))) * smoothstep(.35, .6, a) * (.6 + nord * .4); c = mix(c, vec3(.8, .78, .64), li * .5);
  vec2 ce = floor(vUv * vec2(${f(cel[0])}, ${f(cel[1])})); float ro = step(.9955, tvH(ce + floor(w * .07) * 17.));
  c = mix(c, vec3(.15, .11, .09), ro * .85);` : `float umido = smoothstep(.6, .8, a);
  c = mix(c, c * vec3(.74, .76, .78), umido * .75);
  float cr = 1. - smoothstep(.0, .018, abs(tvN(w * 1.1 + 11.) - .5)); c = mix(c, c * .55, cr * smoothstep(.45, .7, mo) * .8);
  vec2 ce = floor(vUv * vec2(${f(cel[0])}, ${f(cel[1])})), bl = floor(w * .7); float rp = step(.93, tvH(bl + 3.1));
  c = mix(c, vec3(lum * .8 + .06), rp * ${kind === 'pianelle' ? '.4' : '.18'});
  float mu = smoothstep(.62, .8, mo) * smoothstep(.45, .2, a); c = mix(c, vec3(.3, .34, .19), mu * .45);
  float ro = step(.992, tvH(ce + 5.)); c = mix(c, c * .62, ro);`}
  diffuseColor.rgb = c; }
#endif`);
    };
  }
  // ogni copia del materiale (ownMats, la fusione, il tetto che sbiadisce) si porta dietro il marchio nei userData: qui si rimette lo shader
  if (typeof THREE !== 'undefined' && THREE.Material && !THREE.Material.prototype.__tv1) {
    const cp = THREE.Material.prototype.copy;
    THREE.Material.prototype.copy = function (s) { const r = cp.call(this, s); if (s && s.userData && s.userData.tv1 && CELLE[s.userData.tv1]) applica(this); return r; };
    THREE.Material.prototype.__tv1 = true;
  }

  // [cotto] i tetti vissuti cotti nella build (cotto.js): sono dati del piano dei tetti, sempre uguali; col file cotto non si ricalcolano
  const CTV = typeof Cotto !== 'undefined' ? Cotto : null, PCV = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null;
  const COTV = CTV && !SPENTO ? CTV.apri('vissuti', { B, PIANO: TT.PIANO, LADDERS: TT.LADDERS, PREMI: TT.PREMI || null, BELV: TT.BELV || null, P: PCV }) : null;
  if (!COTV) try { calcola(); } catch (e) { if (typeof console !== 'undefined') console.warn('[vissuti]', e); VISSUTI.length = 0; }
  if (CTV && !SPENTO && (COTV || CTV.cuoci)) { const RV = CTV.chiudi('vissuti', { VISSUTI, LINEE, PORTE }, COTV, () => CTV.RIFARE); if (RV) { LINEE = RV.LINEE; PORTE = RV.PORTE; } else if (COTV) { VISSUTI.length = 0; try { calcola(); } catch (e) { VISSUTI.length = 0; } } }
  return { VISSUTI, CAT, SCENE, STORIE, CORR, PORTA, VICINO, calcola, verifica, firma, bilancio, terrazzo, costruisci, vicino, manto, urti, conto, quotaFalda, get spento() { return SPENTO; }, _: { libero, corridoi, VIC, costruttori } };
})();
if (typeof module !== 'undefined') module.exports = TettiVissuti;
