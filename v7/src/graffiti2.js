/* Porto Vecchio — [graffitipool] ?graffiti2: PIÙ GRAFFITI, MESSI MEGLIO (la proposta, dietro l'interruttore; GRAFFITI_POOL.md §4).
   Il committente: «servono più graffiti e disposti meglio, se ne vedono pochi». Misurato (GRAFFITI_POOL.md §3): la città di serie (stile E coi
   tasselli) ha 520 lavori in tutta l'isola, perché la strada dipinta ne pianifica 919, la cottura dei tasselli ne piazza 491 (i raggi), e nel
   gioco rimodella li dirada UNA SECONDA VOLTA per zona (la cottura è già quella dello stile E); in più porte, pali e fondali si aggiungono due
   volte. E la camera del gioco (camera7: 34° in giù, il bordo alto 11° sotto l'orizzonte) dei muri davanti vede solo la fascia bassa: i fondali a
   40 m e i verticali sui palazzi stanno fuori quadro.
   Qui, A INTERRUTTORE ACCESO, solo regole (niente coordinate), sopra a strada_dipinta.js (che resta com'è):
   1. NIENTE SECONDO DIRADAMENTO: i lavori cotti dello stile E si tengono tutti (la scelta per zona l'ha già fatta la strada dipinta); una cottura
      vecchia (senza stile E) si dirada di meno dove si cammina (vie .8, lungomare .7), uguale su piazze, chiesa, regime.
   2. NIENTE DOPPIONI: porte, pali e fondali della cottura non si rifanno (prima c'erano due grappoli di adesivi sulla stessa porta).
   3. IL RECUPERO: i lavori della strada dipinta che la cottura non ha saputo piazzare (428 su 919) si riprovano nel gioco con le alternative
      (la misura più piccola, mezzo metro più in basso, spostati di lato, il pezzo che diventa throw-up).
   4. IL MURO D'ARRIVO: il muro che chiude un tratto dritto di via da 8 a 30 m (chi cammina ci va incontro, la camera lo ha davanti) prende un
      lavoro medio-grande, nuovo e leggibile, nella fascia bassa che la camera vede (centro a 1,1 m): un pezzo se il muro è largo, se no un throw-up;
      le crew del territorio, la nuvola chiara dietro le lettere.
   5. LA FASCIA ALL'ALTEZZA DEGLI OCCHI: lungo i muri dove si cammina (vicoli, ritrovi, porto, sottopassi, ferrovia, il Muro; poco nelle vie e sul
      lungomare) throw-up, tag grandi (lettere da 70 cm), stencil, adesivi, manifesti con il centro fra 0,9 e 1,7 m, secondo il ritmo dei posti.
   6. PULITO dove la bibbia lo vuole: piazze, chiesa, regime, campagna niente di nuovo; mai a meno di 1,2 m da una porta (la bottega si legge).
   7. LEGGIBILE: una tavolozza (w.sdPal, la stessa lutE), i lavori nuovi freschi (età .05–.3: niente pioggia e crosta), quelli cotti dove si
      cammina al più .4; niente verticali né heaven spot nuovi (la camera non li vede).
   Spento (di serie) non fa niente: niente tocca la città, i tasselli, la scelta di strada_dipinta.js. Fuori dall'impronta dei tasselli
   (build.py TASS_FUORI). Prove: node src/test_graffiti2.js; strumenti/graffiti_pool.js --g2; strumenti/graffiti_vista.js ... "&graffiti2". */
var Graffiti2 = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const on = typeof window === 'undefined' ? !!((typeof global !== 'undefined' && global.PV_GRAFFITI2) || (typeof process !== 'undefined' && process.env && process.env.PV_GRAFFITI2 === '1')) : /[?&]graffiti2\b/.test(Q);
  const conta = { on, cottiTenuti: 0, cottiIn: 0, doppioni: 0, recupero: 0, arrivo: 0, fascia: 0, eta: 0 };
  const misura = () => JSON.parse(JSON.stringify(conta));
  if (!on || typeof StradaDipinta === 'undefined') return { on: false, misura };
  const SD = StradaDipinta, G = typeof Game !== 'undefined' ? Game : null, TS = G.TS, GW = G.GW, GH = G.GH, hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const WA = () => WriterArte, WR = () => Writing;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const walk = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < GW && ty < GH && G.walkT(tx, ty); };
  const davanti = (x, y, ox, oy, max) => { let d = 0; for (; d < max; d += .5) if (!walk(x + ox * d, y + oy * d)) break; return d; };
  const PULITE = { piazza: 1, sacro: 1, regime: 1, fuori: 1 };
  const CAMMINO = { sottopasso: 5, ferrovia: 4, muro: 4, porto: 4, vicolo: 4.5, ritrovo: 4.5, via: 1.6, lungomare: 1.4 };   // lavori nuovi ogni 10 m di muro, al ritmo 1
  const RE = { porto: ['BDS', 'KML', 'BDS'], lungomare: ['BDS', 'TOY'], ferrovia: ['TNT', 'TNT', 'KML'], sottopasso: ['TNT', 'PVK', 'TNT'], muro: ['RSC', 'RSC', 'PVK'], vicolo: ['PVK', 'PVK', 'TOY'], ritrovo: ['PVK', 'BDS', 'TOY'], via: ['PVK', 'TOY', 'TNT'] };   // i territori (come strada_dipinta.js RE)
  const TIENI2 = { muro: 1, sottopasso: 1, ferrovia: 1, porto: 1, vicolo: 1, ritrovo: 1, via: .8, lungomare: .7, piazza: .05, sacro: .02, regime: .04, fuori: .5 };
  function scrittore(aka, crew) { const h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7); const sk = crew === 'TOY' ? .15 + (h % 20) / 100 : .45 + (h % 45) / 100; return { aka, crew, skill: sk, dna: WA().dnaOf(h, sk, h % 14), hand: h * 13 }; }

  // ---- 1. il diradamento: la cottura dello stile E si tiene tutta; quella vecchia si dirada di meno dove si cammina ----
  const rim0 = SD.rimodella, sto0 = SD.storia;
  SD.rimodella = function (st, L) {
    const E = L.length && L.filter(o => o.sdPal && o.sdLiv).length > L.length * .8; conta.cottiIn = L.length;
    let out;
    if (E) out = L.slice();
    else { const rng = mulberry(0xC078); out = L.filter(o => { const R = o.r; if (!R || !R.c || !R.n) return true; const x = R.c[0] + R.n[0] * .6, y = R.c[2] + R.n[2] * .6, z = SD.zonaPunto(x, y, R.n[0], R.n[2], o.spot && o.spot.kind); o.sdZona = z; o.sdPal = 1; if (o.sdEta == null) o.sdEta = clamp((SD.ZONE[z] || SD.ZONE.via).eta * (.6 + rng() * .8), 0, .9); return rng() < (TIENI2[z] != null ? TIENI2[z] : .5); }); }
    out.forEach(o => { if (o.sdLiv !== 'vissuto' && !PULITE[o.sdZona] && o.sdEta > .4) { o.sdEta = .4; conta.eta++; } });
    conta.cottiTenuti = out.length; return out;
  };

  // ---- 2-7. la storia: il recupero, il muro d'arrivo, la fascia degli occhi ----
  SD.storia = function (st, ctx) {
    const W = WR().S(st);
    if (!ctx.cotti) { const n = sto0.call(SD, st, ctx); return n + nuovi(st, ctx, W.works.filter(w => w.old && w.sdPal)); }
    const cotti = W.works.filter(w => w.cotto), Sb = new Set(cotti.map(o => o.style + ':' + o.seed)), E = cotti.filter(o => o.sdLiv).length > cotti.length * .8;
    // il piano intero (come senza tasselli): quello che la cottura non ha piazzato
    const n0 = W.works.length; try { sto0.call(SD, st, Object.assign({}, ctx, { cotti: false })); } catch (e) { console.warn('[graffiti2] il piano', e); }
    const piano = W.works.splice(n0);
    // la storia coi tasselli com'è (fondali, porte, pali): via i doppioni di quello che la cottura ha già
    const n1 = W.works.length; const n = sto0.call(SD, st, ctx); const agg = W.works.splice(n1);
    const fondCotti = cotti.filter(o => o.sdLiv === 'fondale');
    agg.forEach(w => { const dop = E && (w.sdLiv === 'porta' || w.sdLiv === 'palo') || (w.sdLiv === 'fondale' && fondCotti.some(o => o.pos && hyp(o.pos.x - w.spot.x, o.pos.z - w.spot.y) < 12)); if (dop) conta.doppioni++; else W.works.push(w); });
    // il recupero: i lavori del piano che mancano, con le alternative (porte e pali compresi: le porte coi loro raggi, i pali senza)
    if (E) piano.forEach(w => { if (Sb.has(w.style + ':' + w.seed) || w.sdLiv === 'fondale') return; if (!w.sdAnc && w.spot) w.sdAlt = alternative(w, w.spot); W.works.push(w); conta.recupero++; });
    return n + nuovi(st, ctx, W.works.filter(w => !w.erased));
  };
  // le alternative per un lavoro che al primo colpo non entra (writing.js placeWallG: le prova in fila finché una entra)
  function alternative(w, sp) {
    const A = [], at = (k, hRel, o) => Object.assign({ spot: Object.assign({}, sp, { x: sp.x + Math.cos(sp.face + Math.PI / 2) * k, y: sp.y + Math.sin(sp.face + Math.PI / 2) * k, h: null }), hRel, off: k }, o);
    const sty = WR().STYLES[w.style] || { W: 1, H: 1 }, W0 = w.W0 || sty.W, H0 = w.H0 || sty.H;
    if (/^(pezzo|burner|murale|rullo|calli)$/.test(w.style)) { for (const k of [0, -1.5, 1.5]) A.push(at(k, 1.2, { k: 'r', style: w.style, W0: W0 * .7, H0: H0 * .7, minK: .5 })); for (const k of [0, -1.5, 1.5]) A.push(at(k, 1.1, { k: 'r', style: 'throw', W0: 2.6, H0: 1.25 })); }
    else if (/^(throw|estintore|scritta|gotico|stencil|manifesto)$/.test(w.style)) { for (const k of [0, -1.2, 1.2]) A.push(at(k, Math.max(.9, H0 * .5 + .3), { k: 'r', style: w.style, W0: W0 * .75, H0: H0 * .75, minK: .5 })); }
    else for (const k of [-.8, .8]) A.push(at(k, w.style === "adesivi" ? 1.2 : 1.4, { k: "r", style: w.style, W0, H0, minK: .5 }));   // tag, adesivi, toppe: un passo di lato
    return A;
  }

  function nuovi(st, ctx, esist) {
    const rng = mulberry(0x6A2F1), pick = a => a[Math.floor(rng() * a.length)], SITES = ctx.SITES || [], now = st.t, CREW = SD.CREW, MAN = SD.MAN, LOGHI = SD.LOGHI;
    // dove ci sono già lavori medi e grandi (una griglia di 4 m): quelli nuovi non ci finiscono sopra
    const cell = new Map(), key = (x, y) => Math.floor(x / 4) + ',' + Math.floor(y / 4), pos = w => w.pos ? [w.pos.x, w.pos.z] : w.spot ? [w.spot.x, w.spot.y] : null;
    const segna = (x, y, r) => { const k = key(x, y); cell.set(k, (cell.get(k) || []).concat([[x, y, r]])); };
    const libero = (x, y, r) => { const i0 = Math.floor(x / 4), j0 = Math.floor(y / 4); for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) for (const q of cell.get(i + ',' + j) || []) if (hyp(q[0] - x, q[1] - y) < Math.max(r, q[2])) return false; return true; };
    esist.forEach(w => { if (/^(tag|mtag|adesivi|manifesto|buff)$/.test(w.style)) return; const p = pos(w); if (p) segna(p[0], p[1], /^(pezzo|burner|murale|rullo|calli|verticale)$/.test(w.style) ? 3 : 1.6); });
    const porte = (G.BUILDINGS || []).filter(b => b.door).map(b => [(b.door[0] + .5) * TS, (b.door[1] + .5) * TS]);
    const vicinoPorta = (x, y) => porte.some(d => hyp(d[0] - x, d[1] - y) < 1.2 + TS * .5);
    const chi = z => { const cr = pick(RE[z] || RE.via), c = CREW[cr] || CREW.PVK; return scrittore(pick(c.scrittori), cr); };
    function lavoro(sp, wr, style, ex, liv) {
      const seed = Math.floor(rng() * 1e9), z = sp.sdZona;
      const sk = WA().conceive({ aka: wr.aka, crew: wr.crew, style, dna: wr.dna, seed, by: 'old:' + wr.aka });
      const w = Object.assign(sk, { by: 'old', hand: wr.hand || seed, surf: 'muro', spot: sp, place: sp.place, prog: 1, done: true, old: true, sdPal: 1, sdZona: z, sdLiv: liv, sdG2: 1, sdEta: .05 + rng() * .25 }, ex || {});
      if (style === 'tag') w.tagK = 1.25 + rng() * .35;   // le lettere grandi: si leggono dalla camera
      if (style === 'stencil') w.motifSeed = (wr.hand || seed) ^ 0x5a5a;
      WR()._.addWork(st, w); w.t0 = w.tDone = now - Math.floor(rng() * 60) * 1440; return w;
    }
    const corsa = (x, y, ox, oy, F) => { const t = F * .5, px = x + ox * t, py = y + oy * t, ax = -oy, ay = ox; return davanti(px, py, ax, ay, 12) + davanti(px, py, -ax, -ay, 12) < 18; };   // una via (stretta ai lati), non una piazza
    // i muri dove si cammina: i siti di writer_vita.js (i tratti di muro libero: 430 in tutta l'isola) più i muri lungo le vie, presi ogni 2,5 m
    // dai due lati di ogni via della città (le facciate con porte e finestre: placeWall resta fuori dalle aperture vere)
    const T = G.T || (G.MAP.world && G.MAP.world.T), tileV = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : G.MAP.grid[ty * GW + tx]; };
    const citta = (x, y) => { const M = G.MAP, tx = Math.floor(x / TS), ty = Math.floor(y / TS); return !M.zone || !M.Z || M.zone[ty * GW + tx] === M.Z.CITTA; };
    // la casa della casella: le botteghe (il pianterreno è vetrina, porta, insegna) restano pulite e non si provano nemmeno (i raggi falliscono lì)
    const CASA = { casa: 1, '-': 1, capanno: 1, cascina: 1, fabbrica: 1, autorimessa: 1 };
    const bottega = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (const b of G.BUILDINGS || []) if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return !CASA[b.use || '-']; return false; };
    const muroDa = (x, y, ux, uy, d0, d1) => { for (let d = d0; d <= d1; d += .25) { const v = tileV(x + ux * d, y + uy * d); if (v === T.BLD) { const e = d - .55; if (e < .3 || bottega(x + ux * d, y + uy * d)) return null; const px = x + ux * e, py = y + uy * e; return walk(px, py) ? { x: px, y: py, d } : null; } if (v < 0 || v === T.WATER || v === T.CLIFF) return null; } return null; };
    const MURI = [], ARR = new Set();
    SITES.forEach(s => { if (/^(strada|hall|ferrovia|muro|ponte|rilevato)$/.test(s.kind) && s.out && !s.sdFondale) MURI.push({ s, x: s.x, y: s.y, out: s.out, len: s.len || 4 }); });
    ((G.MAP.world || {}).roads || []).forEach(r => { const P = r.pts; if (!P || P.length < 2 || !/^(citta|vicolo|strada)$/.test(r.kind)) return;
      let acc = 0; for (let k = 1; k < P.length; k++) { const ax = P[k - 1][0], ay = P[k - 1][1], dx = P[k][0] - ax, dy = P[k][1] - ay, L = hyp(dx, dy); if (L < 1e-3) continue; const ux = dx / L, uy = dy / L;
        for (let t = (2.5 - acc) % 2.5; t < L; t += 2.5) { const x = ax + ux * t, y = ay + uy * t; if (!citta(x, y)) continue;
          for (const sg of [1, -1]) { const nx = -uy * sg, ny = ux * sg, m = muroDa(x, y, nx, ny, .3, 8); if (m) MURI.push({ x: m.x, y: m.y, out: [-nx, -ny], len: 2.5, along: [ux, uy], face: Math.atan2(ny, nx), via: r.name }); } }
        acc = (acc + L) % 2.5; }
      // il muro d'arrivo: da ogni punto della via, nei due versi, il primo muro dritto davanti fra 6 e 24 m (dove la via piega o finisce:
      // chi cammina ci va incontro e la camera lo ha davanti); uno ogni 5 m
      for (let k = 1; k < P.length; k++) { const dx = P[k][0] - P[k - 1][0], dy = P[k][1] - P[k - 1][1], L = hyp(dx, dy); if (L < 1e-3) continue; const ux = dx / L, uy = dy / L;
        for (let t = 0; t < L; t += 2.5) { const x = P[k - 1][0] + ux * t, y = P[k - 1][1] + uy * t; if (!citta(x, y)) continue;
          for (const sg of [1, -1]) { const m = muroDa(x, y, ux * sg, uy * sg, 6, 24); if (!m) continue; const kk = Math.round(m.x / 5) + ',' + Math.round(m.y / 5); if (ARR.has(kk) || !citta(m.x, m.y)) continue; ARR.add(kk);
            MURI.push({ x: m.x, y: m.y, out: [-ux * sg, -uy * sg], len: 4, along: [-uy, ux], face: Math.atan2(uy * sg, ux * sg), via: r.name, arrivo: true }); } } } });
    let nA = 0, nF = 0;
    MURI.forEach(q => {
      const s = q.s, sp0 = s ? null : { x: q.x, y: q.y, face: q.face, h: null, place: q.via ? 'in ' + q.via : '', kind: 'strada' };
      const z = s ? SD.zonaSito(s) : SD.zonaPunto(q.x, q.y, q.out[0], q.out[1], 'strada'); if (PULITE[z] || !(z in CAMMINO)) return;
      const len = q.len, rt = SD.ritmo(q.x, q.y), A = q.along || [-q.out[1], q.out[0]];
      const posto = du => s ? Object.assign(ctx.spotOf(s, du, null), { sdZona: z, h: null }) : Object.assign({}, sp0, { x: sp0.x + A[0] * du, y: sp0.y + A[1] * du, sdZona: z });
      // 4. il muro d'arrivo (in fondo al tratto, o un sito con 7-32 m di via dritta e stretta davanti)
      const F = s ? davanti(q.x, q.y, q.out[0], q.out[1], 34) : 0;
      if ((q.arrivo || (s && F >= 7 && F <= 32 && corsa(q.x, q.y, q.out[0], q.out[1], F))) && libero(q.x, q.y, 3) && !vicinoPorta(q.x, q.y)) {
        const big = len >= 5 || (q.arrivo && rng() < .5), style = big ? 'pezzo' : 'throw', W0 = big ? clamp(len - .6, 3.6, 4.6) : clamp(len - .3, 2.6, 3.2), H0 = big ? Math.max(1.5, W0 * .4) : Math.max(1.2, W0 * .45), sp = posto(0);
        lavoro(sp, chi(z), style, { W0, H0, sdStrato: 0, bgk: 'rullo', sdMinK: .55, sdGrandi: [{ k: 'arrivo', style, W0, H0, hRel: Math.max(1.1, H0 / 2 + .3), spot: sp }], sdAlt: alternative({ style, W0, H0 }, sp) }, 'arrivo');
        segna(q.x, q.y, 4); nA++;
        if (q.arrivo) return;
      }
      // 5. la fascia all'altezza degli occhi (lungo le vie un po' meno che sui muri liberi: ci sono porte e vetrine)
      let n = Math.floor(CAMMINO[z] * (s ? 1 : .6) * len / 10 * clamp(rt, .6, 1.6) + rng());
      for (let i = 0; i < n; i++) {
        const q = rng(), style = q < .3 ? 'throw' : q < .62 ? 'tag' : q < .74 ? 'stencil' : q < .87 ? 'adesivi' : 'manifesto';
        const mid = style === 'throw' || style === 'stencil', du = (rng() - .5) * Math.max(0, len - (style === 'throw' ? 2.6 : 1)), sp = posto(du), x = sp.x, y = sp.y;
        if (vicinoPorta(x, y)) continue;
        if (mid && !libero(x, y, style === 'throw' ? 2.4 : 1.2)) continue;
        if (style === 'throw' && len < 2.4) continue;
        const ex = { sdStrato: mid ? 0 : 1 }, wr = chi(z);
        if (style === 'throw') Object.assign(ex, { W0: 2.6, H0: 1.25 });
        if (style === 'adesivi') { const crs = (RE[z] || RE.via).concat(['PVK']); ex.sdAdesivi = { n: 7 + Math.floor(rng() * 5), nomi: crs.flatMap(c => (CREW[c] || CREW.PVK).scrittori.slice(0, 3)), crew: crs, loghi: LOGHI }; }
        if (style === 'manifesto') { const cats = z === 'porto' ? ['porto', 'serate'] : z === 'vicolo' ? ['vicolo', 'serate'] : ['strada', 'serate']; ex.sdManifesti = [0, 1].slice(0, 1 + Math.floor(rng() * 2)).map(() => Object.assign({ c: Math.floor(rng() * 10) }, pick(MAN[pick(cats)]))); }
        const hRel = style === 'throw' ? 1.15 + rng() * .3 : style === 'tag' ? 1.0 + rng() * .7 : style === 'manifesto' ? 1.35 : .9 + rng() * .7;
        ex.sdGrandi = [{ k: 'occhi', style, W0: ex.W0, H0: ex.H0, hRel, spot: sp }]; ex.sdAlt = alternative({ style, W0: ex.W0, H0: ex.H0 }, sp);
        lavoro(sp, wr, style, ex, 'fascia'); if (mid) segna(x, y, style === 'throw' ? 2.4 : 1.2); nF++;
      }
    });
    conta.arrivo = nA; conta.fascia = nF; return nA + nF;
  }
  return { on: true, misura, alternative };
})();
if (typeof module !== 'undefined') module.exports = Graffiti2;
