/* Porto Vecchio — [pulizia] IL RUMORE: la passata che rende leggibile la mappa (solo città nuova).
   Il committente: «c'è ancora molto rumore: cose posizionate, ruotate o modelli 3d non ottimizzati, o elementi sovrapposti sulle
   pareti e sui marciapiedi e sui muri, che compromettono la leggibilità della mappa».
   Lavora sul registro di render.js ([pulizia2]: ogni cosa posata con la sua scatola orientata, la casa e il lato) DOPO che tutti hanno
   posato e dopo il regista delle compenetrazioni, così vale anche per il lavoro degli altri filoni. Prima misura (il censimento),
   poi corregge, poi rimisura; ?norumore misura soltanto, per il confronto.
   IL CENSIMENTO, per voce viva:
   - verso: una cosa a muro parallela al suo muro; una cosa a terra col piede orientato (rettangolare, non tonda) allineata al muro
     vicino (entro 1,5 m) o all'asse della via (entro 5 m). Il verso si misura sulla sagoma vera (l'angolo del rettangolo d'ingombro
     più stretto dei vertici), non sul numero scritto da chi l'ha posata;
   - quota: quello che sta a terra non galleggia e non affonda rispetto a groundH (oltre 6 cm);
   - parete: sulla stessa facciata due cose appese che si coprono nel piano del muro (insegne, targhe, manifesti, lampade, tubi,
     contatori), o una che copre una finestra;
   - marciapiede: una cosa a terra a ridosso del muro che copre, vista dalla camera, una cosa appesa alla stessa altezza;
   - doppioni: due cose dello stesso tipo e della stessa sagoma troppo vicine;
   - passaggi: porte, scale, tombini (lo dice il regista di [pulizia2]) e i vicoli: una cosa che lascia meno di 0,9 m per passare.
   LA DENSITÀ LEGGIBILE (la gerarchia: prima l'ingresso e l'insegna, poi un elemento di vita, poi il resto, solo se c'è spazio):
   - su ogni facciata un tetto di cose appese che cresce con la larghezza (CFG.facciata); l'architettura (balconi, portali, serrande,
     gradini) e i pezzi degli scorci non contano e non si toccano;
   - su ogni tratto di marciapiede di 6 m (lungo la casa) o di slargo (6 × 6 m) al più CFG.marciapiede.max cose a terra.
   Quello che sfora: si ruota, si posa, si sposta lungo il muro, e solo per ultimo si toglie; ogni correzione si tiene solo se il
   regista delle compenetrazioni non trova niente di nuovo. window.__rumore: il censimento prima e dopo e le azioni
   (strumenti/rumore.js lo stampa). */
var PuliziaRumore = (function () {
  'use strict';
  const PI = Math.PI, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const spento = () => typeof location !== 'undefined' && /[?&]norumore\b/.test(location.search);
  const CFG = {
    verso: { muro: 3, terra: 4, piede: .55, rapporto: 1.25, muroD: 1.5, viaD: 5 },   // gradi di tolleranza; il piede minimo (m); quanto deve essere rettangolare
    quota: .06,
    doppioni: { arredo: 1.2, applique: 2.2, tabellone: 3.0, pluviale: 1.0, citofono: .9, lampione: 3.5, cartello: 2.0, tenda: .6, ingombro: 2.0 },
    stessaCasa: { applique: .8, citofono: .5, pluviale: .5, tabellone: 1.0, tenda: 0 },   // fra due case accanto sono doppioni solo se quasi attaccati (due lampade ai due lati dello stesso muro di confine)
    facciata: { base: 1, ogni: 3.2, vita: 4, tabellone: 1, pluviale: 7, applique: 5 },   // cose appese: base + una ogni 3,2 m; di vita al più una ogni 4 m (almeno 2), 1 manifesto, 1 tubo ogni 7 m, 1 lampada ogni 5 m (più una per porta)
    marciapiede: { tratto: 6, max: 3, slargo: 4, fascia: 2.4 },
    vicolo: .9,
    porta: { fondo: 1.8, fianco: .3, alto: 1.8 },   // davanti a ogni porta: 1,8 m di corridoio libero, largo la porta più 30 cm per parte, fino a 1,8 m d'altezza
  };
  // la gerarchia: 0 si tiene sempre (ingresso, insegna, architettura, impianti), 1 la vita, 2 il resto
  const LIV = { fermata: 0, edicola: 0, plancia: 1, porta: 0, gradino: 0, portale: 0, serranda: 0, vetrina: 0, insegna: 0, citofono: 0, balcone: 0, rete: 0, lampione: 0, cartello: 0, grande: 0, scorcio: 0, scorcio_muro: 0, scorcio_filo: 0, tettoia: 0,
    tenda: 1, bucato: 1, festone: 1, dehors: 1, ingombro: 1, applique: 2, pluviale: 2, tabellone: 2, arredo: 2 };
  const ARCHI = new Set(['balcone', 'portale', 'serranda', 'gradino', 'tettoia', 'grande', 'scorcio', 'scorcio_muro', 'scorcio_filo', 'porta', 'vetrina']);   // non contano nella densità della facciata
  const APPESI = new Set(['insegna', 'citofono', 'rete', 'tenda', 'bucato', 'festone', 'applique', 'pluviale', 'tabellone']);
  const SU_PARETE = new Set(['insegna', 'citofono', 'applique', 'pluviale', 'tabellone', 'rete']);   // si coprono fra loro nel piano del muro (tende, bucato e festoni stanno avanti per forza)
  const RANGO_PARETE = { insegna: 100, cartello: 95, citofono: 90, rete: 60, pluviale: 55, applique: 50, tabellone: 40 };   // il tubo scende per tutta la casa: cede la lampada, che scivola di poco   // chi resta quando due cose appese si coprono
  const DAVANTI = new Set(['insegna', 'citofono', 'applique', 'tabellone']);   // le cose appese che una cosa a terra non deve coprire (il tubo arriva a terra: si può)
  const COPRE_FIN = new Set(['citofono', 'applique', 'pluviale', 'tabellone', 'rete']);   // non devono stare sopra una finestra
  const A_TERRA = new Set(['arredo', 'dehors', 'ingombro', 'lampione', 'cartello']);
  const LIBERI = new Set(['festone', 'bucato', 'dehors']);   // il verso è voluto (attraverso la via, tavolini sparsi)
  const wrap90 = a => { a = ((a % (PI / 2)) + PI / 2) % (PI / 2); return a > PI / 4 ? a - PI / 2 : a; };   // in (-45°, 45°]
  const deg = a => a * 180 / PI;

  // ---------- la sagoma: il verso del rettangolo d'ingombro più stretto dei vertici ----------
  function sagoma(e) {
    const v = e.vx; if (!v || v.length < 12) return null;
    let best = Infinity, ba = 0, worst = 0;
    for (let k = 0; k < 30; k++) { const a = k * PI / 60, c = Math.cos(a), s = Math.sin(a); let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;
      for (let i = 0; i < v.length; i += 3) { const x = v[i], z = v[i + 2], u = x * c - z * s, w = x * s + z * c; if (u < u0) u0 = u; if (u > u1) u1 = u; if (w < w0) w0 = w; if (w > w1) w1 = w; }
      const A = (u1 - u0) * (w1 - w0); if (A < best) { best = A; ba = a; } if (A > worst) worst = A; }
    if (!(best > 1e-4)) return null;
    return { a: ba, r: worst / best };
  }

  // ---------- il frame della facciata di una voce: u lungo il muro, d fuori dal muro ----------
  function inFacciata(e, F) {
    const [cx, cz] = e.c, du = cx - F.p[0], dz = cz - F.p[1], B = e.B, hu = (B.u1 - B.u0) / 2, hv = (B.v1 - B.v0) / 2;
    const eu = Math.abs(hu * (F.u[0] * B.c - F.u[1] * B.s)) + Math.abs(hv * (F.u[0] * B.s + F.u[1] * B.c));   // la mezza larghezza lungo il muro
    const ed = Math.abs(hu * (F.n[0] * B.c - F.n[1] * B.s)) + Math.abs(hv * (F.n[0] * B.s + F.n[1] * B.c));
    const u = du * F.u[0] + dz * F.u[1], d = du * F.n[0] + dz * F.n[1];
    return { u0: u - eu, u1: u + eu, d0: d - ed, d1: d + ed, y0: B.y0, y1: B.y1, u, d };
  }
  const ov1 = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

  // il verso di riferimento: il muro per le cose appese; il muro vicino o l'asse della via per quelle a terra. Si fissa la prima volta
  // (e.rif), dal centro di allora: girata la cosa, il centro della sua scatola si sposta di poco e non deve cambiare il riferimento
  function rifVerso(A, e, terra) {
    if (e.rif !== undefined) return e.rif; let ref = null;
    if (e.F && APPESI.has(e.k)) ref = e.F.yaw;
    else if (terra(e)) { const w = A.casaVicina(e.c[0], e.c[1], CFG.verso.muroD); if (w) ref = w.yaw; else { const rd = A.roadDir(e.c[0], e.c[1]); if (rd.a !== null && rd.d < CFG.verso.viaD) ref = rd.a; } }
    return (e.rif = ref);
  }
  // ================= IL CENSIMENTO =================
  function censisci(A) {
    const { R, ctr, groundH } = A, E = R.E.filter(e => !e.gone && e.B), out = { voci: E.length, per: {}, punti: [], perTipo: {} };
    const TIPI = ['porta', 'verso', 'galleggia', 'affonda', 'parete', 'finestra', 'marciapiede', 'sovrapposto', 'doppione', 'passaggio', 'facciata_piena', 'tratto_pieno'];
    const X = (A.esterni || []).filter(x => !x.gone); X.forEach(x => { x.c = ctr(x.B); });   // le voci esterne (segnaletica, vie vive): fisse
    TIPI.forEach(t => out.per[t] = 0);
    const segna = (t, e, extra) => { out.per[t]++; const k = t + ':' + e.k + (e.tipo ? ':' + e.tipo : ''); out.perTipo[k] = (out.perTipo[k] || 0) + 1; if (out.punti.length < 6000) out.punti.push([t, Math.round(e.c[0] * 10) / 10, Math.round(e.c[1] * 10) / 10, e.k, e.src, extra || '']); (e.ru = e.ru || []).push(t); };
    E.concat(X).forEach(e => { e.c = ctr(e.B); e.ru = null; e.dVerso = e.dQuota = e.doppioneDi = e.davantiA = e.copreCon = e.strozza = e.suFinestra = e.sopraX = e.davantiPorta = undefined; });
    const GR = new Map(); E.forEach(e => { if (!e.g) return; const kk = (e.b ? A.bid(e.b) : '-') + ':' + e.g; let a = GR.get(kk); if (!a) GR.set(kk, a = []); a.push(e); e.membri = a; });   // le composizioni (una lampada: piastra, braccio, lanterna) si muovono e se ne vanno insieme
    E.forEach(e => { if (!e.g) e.membri = null; });
    // una composizione è fatta di pezzi che si toccano: se lo stesso g copre cose lontane (in buildCase tutta la vita alla base dei muri
    // di una casa ha lo stesso g) si divide in grappoli, a 15 cm di luce fra le scatole
    const aabb = e => { const cs = A.corners(e.B); return [Math.min(...cs.map(c => c[0])), Math.max(...cs.map(c => c[0])), Math.min(...cs.map(c => c[1])), Math.max(...cs.map(c => c[1])), e.B.y0, e.B.y1]; };
    GR.forEach(L => { if (L.length < 2 || !L.every(e => e.k === 'arredo' || e.k === 'dehors' || e.k === 'ingombro')) return; const bx = L.map(aabb), pa = L.map((_, i) => i), f = i => pa[i] === i ? i : (pa[i] = f(pa[i]));
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = bx[i], b = bx[j]; if (a[0] - .15 <= b[1] && b[0] - .15 <= a[1] && a[2] - .15 <= b[3] && b[2] - .15 <= a[3] && a[4] - .15 <= b[5] && b[4] - .15 <= a[5]) pa[f(i)] = f(j); }
      const M = new Map(); L.forEach((e, i) => { const r = f(i); let a = M.get(r); if (!a) M.set(r, a = []); a.push(e); }); if (M.size > 1) M.forEach(a => a.forEach(e => { e.membri = a; })); });
    // indice a 4 m
    const IX = new Map(), k4 = (i, j) => i * 8192 + j; E.forEach(e => { const kk = k4(Math.floor(e.c[0] / 4), Math.floor(e.c[1] / 4)); let a = IX.get(kk); if (!a) IX.set(kk, a = []); a.push(e); });
    const vicini = (x, z, r, fn) => { for (let i = Math.floor((x - r) / 4); i <= Math.floor((x + r) / 4); i++) for (let j = Math.floor((z - r) / 4); j <= Math.floor((z + r) / 4); j++) for (const o of IX.get(k4(i, j)) || []) if (!o.gone) fn(o); };
    const terra = e => (e.ext ? !!e.terra || (e.k === 'cartello' && !e.muro) : A_TERRA.has(e.k)) && Math.abs(e.B.y0 - groundH(e.c[0], e.c[1])) < .6;
    const IXX = new Map(); X.forEach(x => { const kk = k4(Math.floor(x.c[0] / 4), Math.floor(x.c[1] / 4)); let a = IXX.get(kk); if (!a) IXX.set(kk, a = []); a.push(x); });
    const viciniX = (x, z, r, fn) => { for (let i = Math.floor((x - r) / 4); i <= Math.floor((x + r) / 4); i++) for (let j = Math.floor((z - r) / 4); j <= Math.floor((z + r) / 4); j++) for (const o of IXX.get(k4(i, j)) || []) if (!o.gone) fn(o); };

    // 1) il verso
    E.forEach(e => {
      if (LIBERI.has(e.k) || e.free || /^scorcio/.test(e.k) || e.k === 'grande' || (e.membri && e.membri.length > 1)) return;
      const S = sagoma(e); if (!S || S.r < CFG.verso.rapporto) return;
      const hu = (e.B.u1 - e.B.u0) / 2, hv = (e.B.v1 - e.B.v0) / 2; if (Math.max(hu, hv) * 2 < CFG.verso.piede) return;
      const tol = e.F && APPESI.has(e.k) ? CFG.verso.muro : CFG.verso.terra, ref = rifVerso(A, e, terra); if (ref === null) return;
      const d = wrap90(S.a - ref); e.dVerso = d;
      if (Math.abs(deg(d)) > tol) segna('verso', e, deg(d).toFixed(1) + '°');
    });
    // 2) la quota (quello che sta a terra)
    E.forEach(e => { if (!(e.k === 'arredo' || e.k === 'ingombro' || e.k === 'cartello' || (e.k === 'lampione' && A.palo(e)))) return; if (e.membri && e.membri.length > 1) return;
      const cs = A.corners(e.B); let gmin = Infinity, gmax = -Infinity; cs.concat([e.c]).forEach(([x, z]) => { const h = groundH(x, z); gmin = Math.min(gmin, h); gmax = Math.max(gmax, h); });
      if (e.B.y0 > gmax + (e.k === 'cartello' ? 1 : 2.5)) return;   // sui tetti, sui muretti, a bandiera sul muro: non è terra
      if (e.B.y0 > gmax + CFG.quota && !A.appoggiato(e)) { e.dQuota = gmax - e.B.y0; segna('galleggia', e, (e.B.y0 - gmax).toFixed(2)); }
      else if (e.B.y0 < gmin - CFG.quota - .14 && e.B.y1 - e.B.y0 < 3) { e.dQuota = gmin - e.B.y0 - .02; segna('affonda', e, (gmin - e.B.y0).toFixed(2)); }   // fino a 20 cm è la base piantata nel selciato
    });
    // 3) la parete: per facciata, le cose appese che si coprono nel piano del muro e quelle sopra le finestre
    const FAC = new Map();
    E.concat(X).forEach(e => { if (!e.b || !e.f || !e.F || (e.ext && e.terra)) return; const key = A.bid(e.b) + e.f; let L = FAC.get(key); if (!L) FAC.set(key, L = { b: e.b, f: e.f, F: e.F, E: [] }); e.fq = inFacciata(e, e.F); L.E.push(e); });
    FAC.forEach(L => {
      const S = L.E.filter(e => (SU_PARETE.has(e.k) || e.ext) && e.fq.d0 < 1.2);
      for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) { const a = S[i], b = S[j]; if ((a.g && a.g === b.g) || (a.ext && b.ext)) continue;
        const ou = ov1(a.fq.u0, a.fq.u1, b.fq.u0, b.fq.u1), oy = ov1(a.fq.y0, a.fq.y1, b.fq.y0, b.fq.y1), aa = (a.fq.u1 - a.fq.u0) * (a.fq.y1 - a.fq.y0), ab = (b.fq.u1 - b.fq.u0) * (b.fq.y1 - b.fq.y0);
        if (ou * oy > .2 * Math.min(aa, ab) && ou > .05 && oy > .05) { const ra = RANGO_PARETE[a.k] || 0, rb = RANGO_PARETE[b.k] || 0, perde0 = ra < rb || (ra === rb && (a.vol < b.vol || (a.vol === b.vol && a.id > b.id))) ? a : b, perde = perde0.ext ? (perde0 === a ? b : a) : perde0; perde.copreCon = perde === a ? b : a; segna('parete', perde, (perde === a ? b : a).k); } }
      const W = A.finestre(L.b, L.f); if (W.length) L.E.forEach(e => { if (!COPRE_FIN.has(e.k)) return; for (const w of W) { const ou = ov1(e.fq.u0, e.fq.u1, w.u0, w.u1), oy = ov1(e.fq.y0, e.fq.y1, w.y0, w.y1);
        if (ou > .08 && oy > .12 && ou * oy > .15 * Math.min((e.fq.u1 - e.fq.u0) * (e.fq.y1 - e.fq.y0), (w.u1 - w.u0) * (w.y1 - w.y0))) { e.suFinestra = w; segna('finestra', e, w.name); break; } } });
      L.W = W;
    });
    // 4) il marciapiede: una cosa a terra a ridosso del muro (entro 0,8 m) davanti a una cosa appesa alla sua altezza
    FAC.forEach(L => { const T = [], Ap = L.E.filter(e => DAVANTI.has(e.k) && e.fq.d0 < .6);
      if (!Ap.length) return;
      vicini(L.F.p[0] + L.F.u[0] * 5, L.F.p[1] + L.F.u[1] * 5, 30, o => { if (!terra(o) || o.k === 'lampione' || o.k === 'cartello') return; const q = inFacciata(o, L.F); if (q.d0 < -.3 || q.d0 > .8) return; T.push([o, q]); });
      T.forEach(([o, q]) => { for (const a of Ap) { if (ov1(q.u0, q.u1, a.fq.u0, a.fq.u1) > .1 && ov1(q.y0, q.y1, a.fq.y0, a.fq.y1) > .1) { o.davantiA = a; o.fqT = q; o.LF = L; segna('marciapiede', o, a.k); break; } } });
    });
    // 0) le porte: tutte quelle a piano terra (anche i vani porta del kit), un corridoio libero davanti; dentro non sta niente di quello che
    // sta a terra (arredo, dehors, bancarelle, pali, plance), del registro o esterno
    const PT = A.porteTutte ? A.porteTutte() : []; out.porte = PT.length;
    PT.forEach(P => { const F = P.F, d = CFG.porta, cx = F.p[0] + F.n[0] * (d.fondo / 2 + .02), cz = F.p[1] + F.n[1] * (d.fondo / 2 + .02), gy = groundH(cx, cz), Z = A.box(cx, cz, F.yaw, P.w / 2 + d.fianco, d.fondo / 2, Math.min(gy, P.y) - .1, Math.max(gy, P.y) + d.alto);
      P.Z = Z; const chi = o => { if (o.davantiPorta || !(terra(o) || (o.ext && o.terra)) || A.yov(o.B, Z) <= .03 || A.sat(o.B, Z) <= .03) return; o.davantiPorta = P; segna('porta', o, o.ext ? o.fonte : ''); };
      vicini(cx, cz, 4, chi); viciniX(cx, cz, 4, chi); });
    // 4b) sovrapposto: una cosa a terra del registro dentro una cosa esterna (un palo della segnaletica, una fermata, un'edicola, una plancia)
    E.forEach(e => { if (!terra(e) || LIV[e.k] === 0) return; viciniX(e.c[0], e.c[1], 4, x => { if (e.sopraX || !terra(x)) return; if (A.yov(e.B, x.B) > .03 && A.sat(e.B, x.B) > .03) { e.sopraX = x; segna('sovrapposto', e, x.k); } }); });
    // i pali della segnaletica doppi (due pali di cartelli a meno di 1,2 m: il secondo se ne va)
    X.forEach(x => { if (x.k !== 'cartello' || x.muro || x.indicazioni) return; viciniX(x.c[0], x.c[1], 1.2, o => { if (o === x || o.k !== 'cartello' || o.muro || o.indicazioni || o.id < x.id || o.doppioneDi) return; if (hyp(o.c[0] - x.c[0], o.c[1] - x.c[1]) < 1.2) { o.doppioneDi = x; segna('doppione', o, 'palo'); } }); });
    // 5) i doppioni: lo stesso tipo, la stessa sagoma, troppo vicini
    E.forEach(e => { const r = CFG.doppioni[e.k]; if (!r || e.free) return; const fe = A.firma(e);
      vicini(e.c[0], e.c[1], r, o => { if (o === e || o.id < e.id || o.k !== e.k || (e.g && e.g === o.g) || ((e.k === 'arredo' || e.k === 'ingombro') && A.firma(o) !== fe)) return;
        if (Math.abs(o.c[0] - e.c[0]) > r || Math.abs(o.c[1] - e.c[1]) > r || hyp(o.c[0] - e.c[0], o.c[1] - e.c[1]) > r || Math.abs(o.B.y0 - e.B.y0) > .8) return;
        if (CFG.stessaCasa[e.k] !== undefined && e.b !== o.b && hyp(o.c[0] - e.c[0], o.c[1] - e.c[1]) > CFG.stessaCasa[e.k]) return;   // due tubi su due case accanto: ognuno il suo
        if (o.membri && e.membri && o.membri.some(m => m.k !== o.k) !== e.membri.some(m => m.k !== e.k)) return;
        if (o.doppioneDi) return; o.doppioneDi = e; segna('doppione', o, e.k); }); });
    // 6) i passaggi stretti nei vicoli
    E.forEach(e => { if (!terra(e) || e.k === 'lampione' || e.k === 'cartello') return; const v = A.vicolo(e.c[0], e.c[1]); if (!v) return;
      const hu = (e.B.u1 - e.B.u0) / 2, hv = (e.B.v1 - e.B.v0) / 2, r = Math.min(hu, hv), resta = Math.max(v.w / 2 - (v.d + r), v.w / 2 - (r - v.d));   // il lato più largo che resta
      if (resta < CFG.vicolo && v.w > 1.6) { e.strozza = v; segna('passaggio', e, v.w.toFixed(1) + ' m'); } });
    // 7) la densità: facciate e tratti di marciapiede pieni (cosa si toglierebbe)
    const D = densita(A, E.concat(X), FAC, vicini, terra); D.facciate.forEach(([e]) => segna('facciata_piena', e)); D.tratti.forEach(([e]) => segna('tratto_pieno', e));
    out.tot = TIPI.reduce((s, t) => s + out.per[t], 0); out.facciate = FAC.size; out.densita = D.conti;
    out.esterni = {}; X.forEach(x => { const k = x.fonte + ':' + x.k; out.esterni[k] = (out.esterni[k] || 0) + 1; });
    const TV = A.vissuti && A.vissuti(); if (TV) out.vissuti = TV; if (A.atlanti) out.atlanti = A.atlanti();
    return { rep: out, E, X, FAC, D, vicini, viciniX, terra, porte: PT };
  }

  // ---------- la densità: per facciata e per tratto, chi resta secondo la gerarchia ----------
  function densita(A, E, FAC, vicini, terra) {
    const fuori = [], tratti = [], conti = { facciate: { n: 0, piene: 0, media: 0, max: 0 }, tratti: { n: 0, pieni: 0, media: 0, max: 0 } };
    const elementi = L => { const M = new Map(); L.forEach(e => { const key = e.membri || e; let q = M.get(key); if (!q) M.set(key, q = { E: [], k: e.k, liv: LIV[e.k] !== undefined ? LIV[e.k] : 2, vol: 0 }); q.E.push(e); q.vol += e.vol || 0; q.liv = Math.min(q.liv, LIV[e.k] !== undefined ? LIV[e.k] : 2); }); return [...M.values()]; };
    FAC.forEach(L => {
      const Lw = A.larghezza(L.b, L.f); if (!Lw) return;
      const El = elementi(L.E.filter(e => (APPESI.has(e.k) || e.ext) && !e.gone && !(e.k === 'festone' && !e.b))); if (!El.length) return;
      const cap = Math.max(2, Math.round(CFG.facciata.base + Lw / CFG.facciata.ogni)), porte = A.porte(L.b, L.f), vitaMax = Math.max(2, Math.floor(Lw / CFG.facciata.vita));
      const per = { tabellone: CFG.facciata.tabellone, pluviale: Math.max(1, Math.floor(Lw / CFG.facciata.pluviale)), applique: 1 + porte + Math.floor(Lw / CFG.facciata.applique / 2) };
      El.sort((a, b) => a.liv - b.liv || (b.vol - a.vol));
      let n = 0, vita = 0; const quanti = {};
      El.forEach(q => { const k = q.k; quanti[k] = (quanti[k] || 0) + 1;
        const tiene = q.liv === 0 || (q.liv === 1 ? vita < vitaMax && n < cap : n < cap) && !(per[k] !== undefined && quanti[k] > per[k]);
        if (!tiene) { q.E.forEach(e => fuori.push([e, 'facciata'])); return; } n++; if (q.liv === 1) vita++; });
      conti.facciate.n++; conti.facciate.media += El.length; conti.facciate.max = Math.max(conti.facciate.max, El.length); if (El.length > n) conti.facciate.piene++;
    });
    // i tratti di marciapiede: lungo la casa più vicina (entro la fascia), a 6 m; altrove lo slargo a 6 × 6 m
    const TR = new Map();
    E.forEach(e => { if (e.gone || !terra(e)) return; const h = A.casaVicina(e.c[0], e.c[1], CFG.marciapiede.fascia); let key;
      if (h) key = 'c' + h.i + ':' + h.lato + ':' + Math.floor(h.u / CFG.marciapiede.tratto); else key = 's' + Math.floor(e.c[0] / 6) + ',' + Math.floor(e.c[1] / 6);
      let a = TR.get(key); if (!a) TR.set(key, a = []); a.push(e); });
    TR.forEach((L, key) => { const El = elementi(L), cap = key[0] === 'c' ? CFG.marciapiede.max : CFG.marciapiede.slargo;
      El.forEach(q => { if (q.E.some(e => e.k === 'lampione' || e.k === 'cartello' || (e.ext && e.k !== 'plancia') || A.posto(e))) q.liv = 0; });
      El.sort((a, b) => a.liv - b.liv || (b.vol - a.vol)); let n = 0;
      El.forEach(q => { if (q.liv === 0 || n < cap) { n++; return; } q.E.forEach(e => tratti.push([e, 'tratto'])); });
      conti.tratti.n++; conti.tratti.media += El.length; conti.tratti.max = Math.max(conti.tratti.max, El.length); if (El.length > cap) conti.tratti.pieni++; });
    if (conti.facciate.n) conti.facciate.media = +(conti.facciate.media / conti.facciate.n).toFixed(2);
    if (conti.tratti.n) conti.tratti.media = +(conti.tratti.media / conti.tratti.n).toFixed(2);
    return { facciate: fuori, tratti, conti };
  }

  // ================= LE CORREZIONI =================
  // ogni correzione vale per la composizione intera (e.membri: la stessa casa e lo stesso g) e si tiene solo se il regista delle
  // compenetrazioni di [pulizia2] non trova niente di nuovo sulle sue voci
  function correggi(A, C) {
    const az = { ruotati: {}, posati: {}, spostati: {}, tolti: {}, tenuti: {} }, conta = (o, k) => { o[k] = (o[k] || 0) + 1; };
    // [telefono] l'insieme accanto alla lista: «c'è già?» costava un giro intero della lista (7 s di avvio su una composizione grande)
    const I = A.indici(), grp = e => { const G = (e.membri || [e]).filter(m => !m.gone), GS = new Set(G); for (let i = 0; i < G.length; i++) A.sopra(G[i], I).forEach(o => (o.membri || [o]).forEach(q => { if (!q.gone && !GS.has(q)) { GS.add(q); G.push(q); } })); G.__s = GS; return G; };   // la composizione, e quello che ci poggia sopra
    const X = C.X || [], nx = m => { let n = 0; C.viciniX(m.c[0], m.c[1], 4, x => { if (A.yov(m.B, x.B) > .03 && A.sat(m.B, x.B) > .03) n++; }); return n; };   // e le voci esterne: niente addosso
    const nv = G => G.reduce((s, m) => s + A.viol(m, I).length + nx(m), 0);
    const muovi = (G, dx, dy, dz) => G.forEach(m => A.sposta(m, dx, dy, dz));
    const prova = (G, fai, disfa) => { const prima = nv(G); fai(); if (nv(G) <= prima) { G.forEach(m => A.rimetti(I, m)); return true; } disfa(); return false; };
    const togli = (e, perche, anche0) => { if (e.ext) { if (e.gone || (LIV[e.k] === 0 && !anche0)) { conta(az.tenuti, perche + ':' + e.k); return false; } A.togliEsterno(e); conta(az.tolti, perche + ':' + e.fonte + ':' + e.k); return true; }
      const G = grp(e); if (!G.length) return false;
      if (G.some(m => (LIV[m.k] === 0 && !anche0) || A.posto(m) || m.free)) { conta(az.tenuti, perche + ':' + e.k); return false; }
      const su = [], SU = new Set(), GS = G.__s; G.forEach(m => A.sopra(m, I).forEach(o => { if (!GS.has(o) && !SU.has(o)) { SU.add(o); su.push(o); } }));   // quello che ci poggia sopra se ne va con lei, se può
      if (su.some(o => LIV[o.k] === 0 || A.posto(o) || o.free || (o.membri && o.membri.some(m => !SU.has(m) && !GS.has(m))))) { conta(az.tenuti, perche + ':' + e.k); return false; }
      G.concat(su).forEach(m => A.togli(m)); conta(az.tolti, perche + ':' + e.k); return true; };
    const E = C.E;
    // 1) i doppioni se ne vanno (il primo posato resta); le lampade e i citofoni doppi anche se di solito si tengono
    E.forEach(e => { if (e.doppioneDi && !e.gone && !e.doppioneDi.gone && !(e.doppioneDi.membri || [e.doppioneDi]).every(m => m.gone)) togli(e, 'doppione', e.k === 'applique' || e.k === 'citofono'); });
    X.forEach(x => { if (x.doppioneDi && !x.gone && !x.doppioneDi.gone) togli(x, 'doppione', true); });
    // 1a) i praticabili coperti da chi non dovrebbe: un pezzo d'uno scorcio (la serranda chiusa, lo zoccolo, la luminaria) proprio su una
    // porta vera o contro il suo gradino se ne va; un pezzo grande piccolo (l'edicola votiva, il carro, il pozzo) davanti a una porta o al
    // piede di una scala scivola lungo i suoi assi finché la lascia libera (mai dentro una casa)
    const MOBILI = /^(edicola_votiva|carro_merci|pozzo|fontana|bitta|palo_riflettori|grata_vapore|locomotiva|lavatoio)$/;
    const copre = (e, V) => V.filter(v => (v.t === 'coperto' && v.p && v.p.k === 'porta') || (v.t === 'urto' && v.o && v.o.k === 'gradino') || v.t === 'pezzo');   // il pezzo davanti al praticabile (coi raggi) o dentro la sua zona libera
    E.forEach(e => { if (e.gone) return;
      if (/^scorcio/.test(e.k)) { if (copre(e, A.viol(e, I)).length) { A.togli(e); conta(az.tolti, 'coperta:' + e.k); } return; }   // solo quel pezzo, non lo scorcio intero
      if (e.k !== 'grande' || (e.tipo ? !MOBILI.test(e.tipo) : e.src !== 'soglie')) return;   // anche i grandi senza nome delle soglie (chioschi, banchi) const V0 = copre(e, A.viol(e, I)); if (!V0.length) return;
      const B = e.B, assi = [[B.c, -B.s], [B.s, B.c]];
      for (const s of [.5, 1, 1.5, 2, 2.5, 3, 4]) for (const [ux, uz] of assi) for (const sg of [1, -1]) { const dx = ux * s * sg, dz = uz * s * sg, dy = A.groundH(e.c[0] + dx, e.c[1] + dz) - A.groundH(e.c[0], e.c[1]); A.sposta(e, dx, dy, dz);
        if (!copre(e, A.viol(e, I)).length && !A.inCasa(e) && nx(e) === 0) { A.rimetti(I, e); conta(az.spostati, 'pezzo:' + (e.tipo || e.src)); return; } A.sposta(e, -dx, -dy, -dz); }
      if (e.tipo === 'edicola_votiva') { A.togli(e); conta(az.tolti, 'coperta:edicola_votiva'); return; }   // il decoro piccolo che non trova un altro posto se ne va
      conta(az.tenuti, 'coperta:' + (e.tipo || e.src)); });
    // 1b) le porte: chi sta nel corridoio scivola lungo il muro fino a uscirne, o se ne va (anche i pali e i lampioni: una porta conta di più);
    // le fermate, le edicole e i posti delle persone restano (si contano)
    const fuoriPorta = (G, P) => G.every(m => A.yov(m.B, P.Z) <= .03 || A.sat(m.B, P.Z) <= .03);
    E.concat(X).forEach(e => { const P = e.davantiPorta; if (!P || e.gone) return;
      if (e.ext) { if (e.k === 'fermata' || e.k === 'edicola') conta(az.tenuti, 'porta:' + e.k); else togli(e, 'porta', true); return; }
      const G = grp(e), F = P.F;
      for (const s of [.5, .9, 1.3, 1.8, 2.4, 3.0]) for (const sg of [1, -1]) { const dx = F.u[0] * s * sg, dz = F.u[1] * s * sg, dy = A.groundH(e.c[0] + dx, e.c[1] + dz) - A.groundH(e.c[0], e.c[1]); muovi(G, dx, dy, dz);
        if (fuoriPorta(G, P) && nv(G) === 0 && !C.porte.some(Q => Q !== P && !fuoriPorta(G, Q))) { G.forEach(m => A.rimetti(I, m)); conta(az.spostati, e.k); return; } muovi(G, -dx, -dy, -dz); }
      if (A.posto(e)) { conta(az.tenuti, 'porta:posto'); return; }   // il posto delle persone: si sposta ma non si toglie
      togli(e, 'porta', e.k === 'lampione' || e.k === 'cartello'); });
    // 2) il verso: si ruota attorno al centro
    E.forEach(e => { if (e.gone || !e.ru || !e.ru.includes('verso') || !e.dVerso) return; const d = -e.dVerso;
      const dritto = () => { const S = sagoma(e); return S && Math.abs(deg(wrap90(S.a - e.rif))) <= CFG.verso.terra; };   // girata, la sagoma deve stare davvero dritta
      if (A.ruotabile(e) && prova([e], () => A.ruota(e, d), () => A.ruota(e, -d))) { if (dritto()) { conta(az.ruotati, e.k); return; } A.ruota(e, -d); A.rimetti(I, e); }
      else if (A.ruotabile(e)) {   // girata urta qualcosa: girata e scostata di poco (a terra)
        for (const s of [.12, .25, .4]) for (let a = 0; a < 8; a++) { const dx = Math.cos(a * PI / 4) * s, dz = Math.sin(a * PI / 4) * s, dy = A.groundH(e.c[0] + dx, e.c[1] + dz) - A.groundH(e.c[0], e.c[1]);
          if (prova([e], () => { A.ruota(e, d); A.sposta(e, dx, dy, dz); }, () => { A.sposta(e, -dx, -dy, -dz); A.ruota(e, -d); })) { if (dritto()) { conta(az.ruotati, e.k); return; } A.sposta(e, -dx, -dy, -dz); A.ruota(e, -d); A.rimetti(I, e); } } }
      conta(az.tenuti, 'verso:' + e.k); });
    // 3) la quota: si posa a terra
    E.forEach(e => { if (e.gone || e.dQuota === undefined) return; const dy = e.dQuota;
      if (prova([e], () => A.sposta(e, 0, dy, 0), () => A.sposta(e, 0, -dy, 0))) conta(az.posati, e.k); else conta(az.tenuti, 'quota:' + e.k); });
    // 4) la parete e le finestre: chi conta meno scivola lungo il muro; se non trova posto se ne va (due insegne una sull'altra: la più piccola)
    E.forEach(e => { if (e.gone || !e.ru || !(e.ru.includes('parete') || e.ru.includes('finestra'))) return;
      const doppia = e.copreCon && e.copreCon.k === 'insegna' && e.k === 'insegna';
      if (doppia) { togli(e, 'parete', true); return; }
      if (LIV[e.k] === 0 && e.k !== 'citofono') { conta(az.tenuti, 'parete:' + e.k); return; }
      const F = e.F, G = grp(e), libero = () => { const q = inFacciata(e, F); if (e.copreCon && !e.copreCon.gone) { const o = inFacciata(e.copreCon, F); if (ov1(q.u0, q.u1, o.u0, o.u1) > .05 && ov1(q.y0, q.y1, o.y0, o.y1) > .05) return false; }
        return !A.finestre(e.b, e.f).some(w => COPRE_FIN.has(e.k) && ov1(q.u0, q.u1, w.u0, w.u1) > .08 && ov1(q.y0, q.y1, w.y0, w.y1) > .12); };
      for (const s of [.3, .6, .9, 1.2, 1.6, 2.0]) for (const sg of [1, -1]) { const dx = F.u[0] * s * sg, dz = F.u[1] * s * sg; muovi(G, dx, 0, dz);
        if (libero() && nv(G) === 0 && G.every(m => dentro(A, m, F))) { G.forEach(m => A.rimetti(I, m)); conta(az.spostati, e.k); return; } muovi(G, -dx, 0, -dz); }
      togli(e, 'parete', e.k === 'citofono'); });
    // 5) il marciapiede: la cosa a terra davanti a quella appesa scivola lungo il muro, o se ne va
    E.forEach(e => { if (e.gone || !e.davantiA || e.davantiA.gone) return; const F = e.LF.F, a = inFacciata(e.davantiA, F), G = grp(e);
      const libero = () => { const q = inFacciata(e, F); return !(ov1(q.u0, q.u1, a.u0, a.u1) > .1 && ov1(q.y0, q.y1, a.y0, a.y1) > .1); };
      for (const s of [.4, .8, 1.2, 1.7, 2.2]) for (const sg of [1, -1]) { const dx = F.u[0] * s * sg, dz = F.u[1] * s * sg, dy = A.groundH(e.c[0] + dx, e.c[1] + dz) - A.groundH(e.c[0], e.c[1]); muovi(G, dx, dy, dz);
        if (libero() && nv(G) === 0) { G.forEach(m => A.rimetti(I, m)); conta(az.spostati, e.k); return; } muovi(G, -dx, -dy, -dz); }
      togli(e, 'marciapiede'); });
    // 5b) sopra una cosa esterna: qualche passo attorno (a terra), o via
    E.forEach(e => { if (e.gone || !e.sopraX) return; const G = grp(e);
      for (const s of [.3, .6, .9, 1.3, 1.8]) for (let a = 0; a < 8; a++) { const dx = Math.cos(a * PI / 4) * s, dz = Math.sin(a * PI / 4) * s, dy = A.groundH(e.c[0] + dx, e.c[1] + dz) - A.groundH(e.c[0], e.c[1]); muovi(G, dx, dy, dz);
        if (nv(G) === 0) { G.forEach(m => A.rimetti(I, m)); conta(az.spostati, e.k); return; } muovi(G, -dx, -dy, -dz); }
      togli(e, 'sovrapposto'); });
    // 6) i vicoli strozzati: verso il muro più vicino, o via
    E.forEach(e => { if (e.gone || !e.strozza) return; const v = e.strozza, sg = v.d >= 0 ? 1 : -1, G = grp(e), r = Math.min(e.B.u1 - e.B.u0, e.B.v1 - e.B.v0) / 2;
      for (const s of [.3, .5, .8]) { const dx = v.n[0] * s * sg, dz = v.n[1] * s * sg;
        if (prova(G, () => muovi(G, dx, 0, dz), () => muovi(G, -dx, 0, -dz))) { const c = A.ctr(e.B), w = A.vicolo(c[0], c[1]); if (!w || Math.max(w.w / 2 - (w.d + r), w.w / 2 - (r - w.d)) >= CFG.vicolo) { conta(az.spostati, e.k); return; } } }
      togli(e, 'passaggio'); });
    // 7) la densità, rifatta su quello che resta: si toglie il di più, dal fondo della gerarchia
    const D = densita(A, E.concat(X).filter(e => !e.gone), C.FAC, C.vicini, C.terra);
    D.facciate.forEach(([e]) => { if (!e.gone) togli(e, 'facciata'); });
    D.tratti.forEach(([e]) => { if (!e.gone) togli(e, 'tratto'); });
    A.fine();
    return az;
  }
  const dentro = (A, e, F) => { const q = inFacciata(e, F), L = A.larghezza(e.b, e.f); return !L || (q.u0 > .1 && q.u1 < L - .1); };   // resta sulla sua facciata

  // ================= I MODELLI: quanto si vedono e quanto sono poveri (solo col censimento acceso, window.__rumoreChi) =================
  // per chi li posa (la funzione e la riga di index.html): quanti, quanta superficie occupano sullo schermo della camera di gioco
  // (il contorno dei vertici proiettato, m²), i triangoli, le mesh e quante di esse sono scatole nude (BoxGeometry)
  function modelli(A, E) {
    const M = new Map();
    const CORNICE = [1202, 230, 1630, 472];   // la città che si gioca (segnaletica.js CORNICE, con 20 m di margine): fuori si vede poco
    E.forEach(e => { if (e.gone || !e.B || e.k === 'grande') return; const [cx, cz] = A.ctr(e.B); if (cx < CORNICE[0] || cx > CORNICE[2] || cz < CORNICE[1] || cz > CORNICE[3]) return; const chi = e.chi || (e.tipo ? (e.k === 'grande' ? 'pezzo:' : 'scorcio:') + e.tipo : 'casa:' + e.k); let q = M.get(chi); if (!q) M.set(chi, q = { chi, k: {}, n: 0, schermo: 0, tri: 0, mesh: 0, scatole: 0 });
      q.n++; q.k[e.k] = (q.k[e.k] || 0) + 1; q.schermo += A.schermo(e); q.tri += A.triangoli(e); q.mesh += e.nm || 0; q.scatole += e.nb || 0; });
    return [...M.values()].map(q => Object.assign(q, { schermo: +q.schermo.toFixed(1), triPer: Math.round(q.tri / q.n), meshPer: +(q.mesh / q.n).toFixed(1), quotaScatole: q.mesh ? +(q.scatole / q.mesh).toFixed(2) : null, triPerM2: q.schermo ? Math.round(q.tri / q.schermo) : 0 })).sort((a, b) => b.schermo - a.schermo);
  }

  // ================= L'INGRESSO (da render.js, pulizia2, dopo il regista) =================
  function passa(A) {
    const t0 = performance.now(), prima = censisci(A), off = spento(), chi = typeof window !== 'undefined' && window.__rumoreChi;
    const mod0 = chi ? modelli(A, prima.E) : null;
    const az = off ? { spento: true } : correggi(A, prima);
    const dopo = off ? prima : censisci(A);
    const somma = o => Object.values(o || {}).reduce((s, v) => s + v, 0);
    const R = { prima: prima.rep, dopo: dopo.rep, azioni: az, spento: off, ms: Math.round(performance.now() - t0),
      numeri: off ? null : { tolti: somma(az.tolti), ruotati: somma(az.ruotati), spostati: somma(az.spostati), posati: somma(az.posati), tenuti: somma(az.tenuti) } };
    if (chi) { R.modelli = { prima: mod0, dopo: modelli(A, dopo.E) }; R.punti = { prima: prima.rep.punti, dopo: dopo.rep.punti }; }
    delete prima.rep.punti; if (dopo !== prima) delete dopo.rep.punti;
    if (typeof window !== 'undefined') window.__rumore = R;
    if (typeof window !== 'undefined' && window.__dbg35) console.log('[rumore] prima', JSON.stringify(prima.rep.per), 'dopo', JSON.stringify(dopo.rep.per), 'numeri', JSON.stringify(R.numeri), R.ms + ' ms');
    return R;
  }
  const API = { CFG, LIV, passa, censisci, sagoma, wrap90, spento, SALTA: new Set() };   // SALTA: le voci della segnaletica tolte (segnaletica.js non le disegna)
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  return API;
})();
