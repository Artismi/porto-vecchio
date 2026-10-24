/* Porto Vecchio — [segni] LA RETE ELETTRICA COME GRAFO (solo nella città nuova).
   «Incasinata, ma non a caso»: i cavi non sono arredo, sono un grafo. Ogni filo ha due estremi veri (mensola a isolatori, cabina,
   contatore, lampione, finestra, balcone, tetto, antenna) e render.js disegna solo da qui. LEGGIBILITA.md sez. 6:
   - dorsale: dalla cabina ENEL di quartiere (una ogni 150-200 m sulle vie) lungo le facciate che la camera vede (il lato lontano
     dalla camera: le facce S ed E), con le mensole al primo marcapiano ogni 8-12 m sugli assi dei moduli; gira gli angoli; attraversa
     la strada solo per cambiare isolato (una traversata ogni 40-60 m, a 6 m, mensola da entrambi i lati); nei vicoli su un solo lato;
     sulla Vittoria e sul Corso è interrata: pozzetti e lampioni e basta.
   - allacci legali: da una mensola al contatore della casa (cassetta grigia a 2,5 m), uno per palazzo.
   - allacci abusivi: da una mensola (o un lampione) vicina alla finestra, al balcone o al tetto di chi ruba la corrente; matasse
     di 2-5 fili sulla stessa mensola fra le baracche. Densità: baracche 80%, borgo 30%, Ottocento 10%, Vittoria 0% (resta il moncone),
     boom 20%. Ogni allaccio chiede il suo posto al regista delle pagine (Scena.chiedi).
   - antenne TV (1986: una per famiglia) coi cavi che scendono lungo la facciata; lampioni a braccio del borgo alimentati dalla dorsale.
   Le quote y dei nodi sono relative: alla base della casa se il nodo ha bi, al suolo altrimenti (render aggiunge groundH / la base vera).
   Nessuna grafica; gira anche in Node (test_segni.js). Coordinate in metri, x est, z sud. */
var Rete = (function () {
  'use strict';
  const MG = 3.6, MF = 2.4, Y_MENS = MG - .2, Y_CONT = 2.5, Y_TRAV = 6;
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const INTERRATA = { vittoria: 1, corso: 1 };   // E4 e il Corso: niente fili in aria
  const ABUSO = { E7: .8, E0: .3, E2: .3, E3: .1, E4: 0, E6: .2 };
  const PASSO_LAMP = { E0: 12, E2: 12, E3: 18, E4: 0, E6: 25, E7: 0 };   // interasse fisso per epoca (il modello lo decide render: braccio, ghisa, stelo; sulla Vittoria i lampioni del regime li mette già render coi pennoni)
  let R = null, G = null;
  const open = v => v === G.T.VIA || v === G.T.WALK || v === G.T.PIAZZA || v === G.T.COB || v === G.T.QUAY || v === G.T.DIRT;
  const tl = (tx, ty) => (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) ? -1 : G.tileAt(tx, ty);
  function init(G0, Scena) {
    G = G0; const TS = G.TS, M = G.MAP, W = M.world, B = G.BUILDINGS, roads = (M.roads || []).filter(q => q.pts && q.era);
    if (!W || !W.sets) { R = null; return null; }
    R = { nodi: [], segmenti: [], lampioni: [], pozzetti: [], perCasa: new Map(), mensole: [], km: 0, kmVicoli: 0 };
    const nodo = (k, x, z, y, o) => { const n = Object.assign({ id: R.nodi.length, k, x, z, y, bi: null }, o || {}); R.nodi.push(n); return n; };
    const seg = (a, b, k, o) => { if (!a || !b || a === b) return null; const s = Object.assign({ a: a.id, b: b.id, k }, o || {}); R.segmenti.push(s); return s; };
    const bAt = (x, z) => { const tx = Math.floor(x / TS), tz = Math.floor(z / TS); if (tl(tx, tz) !== G.T.BLD) return -1; return M.world.bIndex ? M.world.bIndex[tz * G.GW + tx] : -1; };
    const topOf = b => MG + (Math.max(1, b.fl || 1) - 1) * MF;
    // il punto sulla faccia visibile (S o E) più vicino a (x, z), con u lungo il muro snappato all'asse di un modulo (la gabbia)
    const SCM = (bi, f, u) => typeof Scorci !== 'undefined' && Scorci && Scorci.attivo && Scorci.muroRiservato(bi, f, u);   // [scorci] il muro di uno scorcio composto: niente mensole, contatori, bracci
    const faccia = (b, x, z) => { const q = faccia0(b, x, z), o = bAt(q.x + q.nx * .6, q.z + q.nz * .6); q.cieca = (o >= 0 && B[o] !== b) || SCM(B.indexOf(b), q.f, q.u); return q; };   // [pulizia2] cieca: dà contro la casa accanto (la mensola ci finirebbe dentro)   [scorci] o è il muro di uno scorcio
    const faccia0 = (b, x, z) => { const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, dS = Math.abs(z - (z0 + d)), dE = Math.abs(x - (x0 + w));
      if (dS <= dE) { const u = Math.max(1, Math.min(w - 1, Math.round((x - x0 - 1) / TS) * TS + 1)); return { f: 'S', u, x: x0 + u, z: z0 + d, yaw: 0, nx: 0, nz: 1 }; }
      const u = Math.max(1, Math.min(d - 1, Math.round((z0 + d - z - 1) / TS) * TS + 1)); return { f: 'E', u, x: x0 + w, z: z0 + d - u, yaw: Math.PI / 2, nx: 1, nz: 0 }; };
    // una traversata o un filo non attraversa mai una via ≥ 10 m
    const attraversaLarga = (ax, az, bx, bz) => (M.roads || []).some(q => q.w >= 10 && q.pts && q.pts.some((p, i) => { if (!i) return false; const o = q.pts[i - 1]; const d1 = (bx - ax) * (o[1] - az) - (bz - az) * (o[0] - ax), d2 = (bx - ax) * (p[1] - az) - (bz - az) * (p[0] - ax), d3 = (p[0] - o[0]) * (az - o[1]) - (p[1] - o[1]) * (ax - o[0]), d4 = (p[0] - o[0]) * (bz - o[1]) - (p[1] - o[1]) * (bx - o[0]); return d1 * d2 < 0 && d3 * d4 < 0; }));
    // un filo non passa dentro le case: fra i due estremi solo strada, cortile o le due case che collega
    const libero = (ax, az, bx, bz, b1, b2) => { const L = Math.hypot(bx - ax, bz - az); for (let t = 1; t < L - 1; t += .7) { const x = ax + (bx - ax) * t / L, z = az + (bz - az) * t / L, i = bAt(x, z); if (i >= 0 && i !== b1 && i !== b2) return false; } return true; };
    const mensolaDi = (b, bi, fc) => { const key = bi + '|' + fc.f + '|' + fc.u; let m = R.mensole.find(q => q.key === key); if (m) return m;
      m = nodo('mensola', fc.x, fc.z, Math.min(Y_MENS, topOf(b) - .3), { bi, f: fc.f, u: fc.u, yaw: fc.yaw, key }); R.mensole.push(m); if (!R.perCasa.has(bi)) R.perCasa.set(bi, { mensole: [], contatore: null, abusivi: 0, antenna: null }); R.perCasa.get(bi).mensole.push(m); if (Scena && Scena.attivo()) Scena.nota(fc.x, fc.z, 'mensola'); return m; };
    // ---- 1) le dorsali lungo le vie, mensola ogni 8-12 m sul lato lontano dalla camera; cabine; pozzetti dove è interrata ----
    let sPoz = 0;
    roads.forEach((rd, ri) => { const P = rd.pts, interr = !!INTERRATA[rd.id] || rd.era === 'E4', vic = rd.kind === 'vicolo'; let s = 0, sCab = 30 + hash(ri, 4, 3) * 30, prossima = 6 + hash(ri, 1, 3) * 4, prossTrav = 40 + hash(ri, 2, 3) * 20, prev = null, prevS = -1e9, prevBi = -1; const lamp = PASSO_LAMP[rd.era] || 0; let prossLamp = lamp ? 6 : 1e9, lato = 0;
      for (let k = 0; k < P.length - 1; k++) { const [ax, az] = P[k], [bx, bz] = P[k + 1], L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
        const far = (nx + nz) < 0 ? 1 : -1;   // il lato lontano dalla camera (verso nord-ovest): le facce S ed E guardano la via
        for (let t = 0; t < L; t += 1) { const x = ax + ux * t, z = az + uz * t; s += 1; (vic ? (R.kmVicoli += .001) : 0); R.km += .001;
          if (interr) { if (s > sPoz) { sPoz = s + 30; R.pozzetti.push({ x: x + nx * far * (rd.w / 2 - .8), z: z + nz * far * (rd.w / 2 - .8), rd: rd.id }); } }
          else if (s > prossima) {   // la mensola: sulla prima casa che il lato lontano incontra entro 3 m dal bordo
            let bi = -1, px = 0, pz = 0; for (let o = rd.w / 2 + .3; o < rd.w / 2 + 3.2 && bi < 0; o += .7) { px = x + nx * far * o; pz = z + nz * far * o; bi = bAt(px, pz); }
            if (bi >= 0 && B[bi] && (B[bi].era || B[bi].shack)) { const b = B[bi], fc = faccia(b, px, pz); if (!fc.cieca && ((fc.f === 'S' && -far * nz > 0) || (fc.f === 'E' && -far * nx > 0))) { const m = mensolaDi(b, bi, fc);
              if (prev && prev !== m && libero(prev.x, prev.z, m.x, m.z, prev.bi, bi)) { const dd = Math.hypot(prev.x - m.x, prev.z - m.z); if (dd < 18 && !attraversaLarga(prev.x, prev.z, m.x, m.z)) seg(prev, m, 'dorsale', { rd: rd.id });  }
              prev = m; prevS = s; prevBi = bi; prossima = s + 8 + hash(ri, k, 5) * 4; } else prossima = s + 2; } else prossima = s + 2; }
          // la traversata: ogni 40-60 m il filo passa dall'altra parte (mai su una via ≥ 10 m), con la mensola di là sulla faccia che vede la via
          if (!interr && !vic && rd.w < 10 && s > prossTrav && prev && s - prevS < 6) { prossTrav = s + 40 + hash(ri, k, 7) * 20;
            let bi = -1, px = 0, pz = 0; for (let o = rd.w / 2 + .3; o < rd.w / 2 + 3.2 && bi < 0; o += .7) { px = x - nx * far * o; pz = z - nz * far * o; bi = bAt(px, pz); }
            if (bi >= 0 && B[bi] && B[bi].era) { const b = B[bi], x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS;   // di là la faccia che guarda la via è N o W: una mensola alta sullo spigolo che si vede (SE)
              const n2 = nodo('mensola', nx ? x0 + (far * nx > 0 ? w : 0) : px, nz ? z0 + (far * nz > 0 ? d : 0) : pz, Math.min(Y_TRAV, topOf(b) - .3), { bi, f: nx ? (far * nx > 0 ? 'E' : 'W') : (far * nz > 0 ? 'S' : 'N'), traversata: true });
              seg(prev, n2, 'traversata', { rd: rd.id }); } }
          // la cabina ENEL di quartiere: sulle vie, ogni 150-200 m, sul marciapiede lontano, allacciata alla mensola più vicina
          if ((!vic || rd.w >= 5) && !interr && s > sCab && prev && s - prevS < 8) {   /* [mappa_compatta] nella città compatta anche la Rua e la Marina (5 m) sono vie */ sCab = s + 150 + hash(ri, k, 9) * 50; let oc = vic ? rd.w / 2 - 1.1 : rd.w / 2 + 1.6;
            if (vic) { let ow = -1; for (let o = .6; o < rd.w / 2 + 3.2 && ow < 0; o += .3) if (bAt(x + nx * far * o, z + nz * far * o) >= 0) ow = o; if (ow < 0) { sCab = s + 4; oc = NaN; } else oc = ow - .6; }   /* [sporcherie] nei vicoli la cabina sta col retro al muro vero (la Rua è più larga della sua banda), mai in mezzo */
            const cx = x + nx * far * oc, cz = z + nz * far * oc;   /* [mappa_compatta] sulla Rua e sulla Marina contro il muro (non c'è marciapiede) */
            const vPorta = B.some(b => [b.door, b.shopFront && b.shopFront.door].some(dt => dt && Math.hypot((dt[0] + .5) * TS - cx, (dt[1] + .5) * TS - cz) < (vic ? 2 : 3.2))); if (vPorta) sCab = s + (vic ? 2 : 8);   /* [pulizia2] mai davanti a un portone: si riprova più avanti */
            if (!vPorta && oc === oc && open(tl(Math.floor(cx / TS), Math.floor(cz / TS))) && bAt(cx, cz) < 0) { const c = nodo('cabina', cx, cz, 2.3, { yaw: Math.atan2(-nx * far, -nz * far) }); seg(c, prev, 'dorsale', { cabina: true }); } }
          // i lampioni per epoca a interasse fisso, sul lato lontano: nel borgo a braccio sul muro (dalla mensola), altrove a palo sul marciapiede
          if (lamp && s > prossLamp) { prossLamp = s + lamp; const braccio = rd.era === 'E0' || rd.era === 'E2';
            if (braccio) { let bi = -1, px = 0, pz = 0; for (let o = rd.w / 2 + .3; o < rd.w / 2 + 3.2 && bi < 0; o += .7) { px = x + nx * far * o; pz = z + nz * far * o; bi = bAt(px, pz); }
              if (bi >= 0 && B[bi] && B[bi].era) { const b = B[bi], fc = faccia(b, px, pz), ok = !fc.cieca && ((fc.f === 'S' && -far * nz > 0) || (fc.f === 'E' && -far * nx > 0)); if (ok && !R.lampioni.some(q => Math.hypot(q.x - fc.x, q.z - fc.z) < 6)) { const m = mensolaDi(b, bi, fc), Lf = fc.f === 'S' ? b.w * TS : b.h * TS, dU = [b.door, b.shopFront && b.shopFront.door].filter(Boolean).map(dt => fc.f === 'S' ? (dt[1] === b.y + b.h ? dt[0] * TS + 1 - b.x * TS : -99) : (dt[0] === b.x + b.w ? (b.y + b.h) * TS - (dt[1] * TS + 1) : -99)), ok2 = (u, dd) => u >= .45 && u <= Lf - .45 && dU.every(d => Math.abs(d - u) > dd) && !R.mensole.some(q => q.bi === bi && q.f === fc.f && Math.abs(q.u - u) < .65), O2 = [1.2, -1.2, .8, -.8, 2.4, -2.4], u2 = O2.map(o => fc.u + o).find(u => ok2(u, 1.3)) ?? O2.map(o => fc.u + o).find(u => ok2(u, .9)) ?? fc.u + (fc.u + .8 <= Lf - .45 ? .8 : -.8), lx = fc.f === 'S' ? b.x * TS + u2 : fc.x, lz = fc.f === 'S' ? fc.z : (b.y + b.h) * TS - u2, ln = nodo('lampione', lx, lz, Math.min(3.9, topOf(b) - .5), { bi, f: fc.f, u: u2, yaw: fc.yaw, modello: 'braccio' }); /* [pulizia2] il braccio a un metro dalla mensola che lo alimenta (prima ci stava dentro), mai sopra una porta */ seg(m, ln, 'lampione'); R.lampioni.push(ln); } } }
            else { lato = lato || far; const o = rd.w / 2 + 1.1, lx = x + nx * lato * o, lz = z + nz * lato * o; if (open(tl(Math.floor(lx / TS), Math.floor(lz / TS))) && bAt(lx, lz) < 0 && !R.lampioni.some(q => Math.hypot(q.x - lx, q.z - lz) < 8) && !B.some(b => [b.door, b.shopFront && b.shopFront.door].some(dt => dt && Math.hypot((dt[0] + .5) * TS - lx, (dt[1] + .5) * TS - lz) < 2.6))) { /* [pulizia2] il palo mai davanti a una porta */ const ln = nodo('lampione', lx, lz, 0, { yaw: Math.atan2(-nx * lato, -nz * lato), modello: rd.era === 'E3' ? 'ghisa' : rd.era === 'E4' ? 'regime' : 'stelo', rd: rd.id, era: rd.era, s: Math.round(s) }); R.lampioni.push(ln); } } } } } });
    // gira gli angoli: la stessa casa con mensole su S e su E: le due più vicine allo spigolo si uniscono passando per lo spigolo
    R.perCasa.forEach((c, bi) => { const b = B[bi], S0 = c.mensole.filter(m => m.f === 'S' && !m.traversata), E0 = c.mensole.filter(m => m.f === 'E' && !m.traversata); if (!S0.length || !E0.length) return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, mS = S0.sort((p, q) => q.u - p.u)[0], mE = E0.sort((p, q) => p.u - q.u)[0], sp = nodo('spigolo', x0 + w, z0 + d, Math.min(Y_MENS, topOf(b) - .3), { bi });
      seg(mS, sp, 'dorsale', { angolo: true }); seg(sp, mE, 'dorsale', { angolo: true }); });
    // ---- 2) gli allacci legali: un contatore per casa (non le baracche), sulla faccia della mensola, accanto al portone ----
    R.perCasa.forEach((c, bi) => { const b = B[bi]; if (!b || b.shack || !c.mensole.length) return; const dF = !b.door ? null : b.door[1] === b.y + b.h ? 'S' : b.door[0] === b.x + b.w ? 'E' : null;
      let m = c.mensole.filter(q => !q.traversata).sort((p, q) => (p.f === dF ? 0 : 1) - (q.f === dF ? 0 : 1))[0]; if (!m) return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, len = m.f === 'S' ? w : d, du = dF === m.f ? (m.f === 'S' ? (b.door[0] - b.x) * TS + 1 : (b.y + b.h - b.door[1]) * TS - 1) : null;
      let u = du !== null ? (du + TS <= len - .6 ? du + TS * .62 : du - TS * .62) : m.u + (m.u + TS <= len - .6 ? .7 : -.7); u = Math.max(.5, Math.min(len - .5, u));
      { const cieco = uu => { const px = m.f === 'S' ? x0 + uu : x0 + w + .6, pz = m.f === 'S' ? z0 + d + .6 : z0 + d - uu, o = bAt(px, pz); return o >= 0 && B[o] !== b; }; if (cieco(u)) { const alt = [m.u + .7, m.u - .7, m.u].map(q => Math.max(.5, Math.min(len - .5, q))).find(q => !cieco(q)); if (alt === undefined) return; u = alt; } }   // [pulizia2] mai contro il muro della casa accanto
      if (SCM(bi, m.f, u)) { const alt = [u + 1.2, u - 1.2, u + 2.4, u - 2.4].map(q => Math.max(.5, Math.min(len - .5, q))).find(q => !SCM(bi, m.f, q)); if (alt === undefined) return; u = alt; }   // [scorci] il contatore si sposta fuori dallo scorcio
      const ct = nodo('contatore', m.f === 'S' ? x0 + u : x0 + w, m.f === 'S' ? z0 + d : z0 + d - u, Y_CONT, { bi, f: m.f, u, yaw: m.yaw }); c.contatore = ct; seg(m, ct, 'allaccio'); if (Scena && Scena.attivo()) Scena.nota(ct.x, ct.z, 'contatore'); });
    // ---- 3) gli allacci abusivi: la logica del disordine. Dalla mensola (o dal lampione) vicina alla finestra, al balcone, al tetto ----
    const sorgenti = R.nodi.filter(n => (n.k === 'mensola' && !n.traversata) || n.k === 'lampione');
    // [borgo] le baracche fra la ferrovia e il mare stanno lontane dalle facciate: la corrente rubata ci arriva con una fila di pali di legno
    // (uno ogni 22 m, su terreno libero) che parte dalla mensola o dal lampione più vicino; poi le baracche si allacciano ai pali
    B.forEach(b => { if (!b.shack) return; const cx = b.x * TS + b.w, cz = b.y * TS + b.h; if (sorgenti.some(n => Math.hypot(n.x - cx, n.z - cz) < 14)) return;   /* [mappa_compatta] il filo rubato è corto (≤ 14 m): il palo arriva fin lì */
      let s0 = null, sd = 1e9; sorgenti.forEach(n => { if (n.k === 'palo') return; const d = Math.hypot(n.x - cx, n.z - cz); if (d < sd) { sd = d; s0 = n; } }); if (!s0 || sd > 160) return;
      let prev = s0; const steps = Math.ceil((sd - 12) / 22);
      for (let k = 1; k <= steps; k++) { const t = Math.min(1, k * 22 / sd); let px = s0.x + (cx - s0.x) * t, pz = s0.z + (cz - s0.z) * t, ok = false;
        for (let rr = 0; rr < 6 && !ok; rr += 1.5) for (const [ox, oz] of [[0, 0], [rr, 0], [-rr, 0], [0, rr], [0, -rr]]) if (!ok && open(tl(Math.floor((px + ox) / TS), Math.floor((pz + oz) / TS))) && bAt(px + ox, pz + oz) < 0) { px += ox; pz += oz; ok = true; }
        if (!ok || attraversaLarga(prev.x, prev.z, px, pz)) break;
        const p = nodo('palo', px, pz, 6.2, { era: 'E7', yaw: Math.atan2(cx - s0.x, cz - s0.z) }); seg(prev, p, 'abusivo', { era: 'E7', derivazione: true }); sorgenti.push(p); prev = p; } });
    B.forEach((b, bi) => { const era = b.shack ? 'E7' : b.era; if (!era) return; const dens = ABUSO[era] || 0, h = hash(bi, 13, 1986); const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, top = topOf(b);
      const c = R.perCasa.get(bi);
      if (era === 'E4') { let ms = c ? c.mensole.filter(q => !q.traversata).slice(0, 1) : []; if (!ms.length && h < .5 && open(tl(b.x + Math.floor(b.w / 2), b.y + b.h))) ms = [nodo('mensola', x0 + w - 1, z0 + d, Math.min(Y_MENS, top - .3), { bi, f: 'S', u: w - 1, yaw: 0, vecchia: true })];   // la mensola di prima della rete interrata, senza più la dorsale
        if (h < .5) ms.forEach(m => { const mo = nodo('moncone', m.x, m.z, m.y - .6, { bi, f: m.f, yaw: m.yaw }); seg(m, mo, 'moncone'); if (Scena && Scena.attivo()) Scena.chiedi(m.x, m.z, 'moncone'); }); return; }   // il regime taglia: resta il moncone
      if (h >= dens) return;
      // la sorgente: la mensola o il lampione più vicino (anche di un'altra casa), entro 25 m e senza attraversare una via larga
      const cand = sorgenti.filter(n => n.bi !== bi && Math.hypot(n.x - (x0 + w / 2), n.z - (z0 + d / 2)) < 25).sort((p, q) => Math.hypot(p.x - x0 - w / 2, p.z - z0 - d / 2) - Math.hypot(q.x - x0 - w / 2, q.z - z0 - d / 2));
      const src = (c && c.mensole.filter(q => !q.traversata)[0]) || cand.find(n => libero(n.x, n.z, x0 + w / 2, z0 + d, n.bi, bi) || libero(n.x, n.z, x0 + w, z0 + d / 2, n.bi, bi)); if (!src) return;
      const n = era === 'E7' ? 2 + Math.floor(hash(bi, 14, 1986) * 4) : 1;   // le matasse delle baracche
      for (let i = 0; i < n; i++) { const hh = hash(bi, 20 + i, 1986), facce = []; if (open(tl(b.x + Math.floor(b.w / 2), b.y + b.h))) facce.push('S'); if (open(tl(b.x + b.w, b.y + Math.floor(b.h / 2)))) facce.push('E'); if (!facce.length) facce.push(src.f === 'E' ? 'E' : 'S');
        const f = facce[Math.floor(hh * facce.length)], len = f === 'S' ? w : d, kind = hh < .55 ? 'finestra' : hh < .85 ? 'balcone' : 'tetto', fl = Math.max(1, b.fl || 1), piano = fl > 1 ? 1 + Math.floor(hash(bi, 30 + i, 7) * (fl - 1)) : 0;
        let u = (Math.floor(hash(bi, 40 + i, 7) * Math.round(len / TS))) * TS + 1, y = kind === 'tetto' ? top + .25 : MG + (piano - 1) * MF + (kind === 'balcone' ? .9 : 1.5); if (piano === 0 && kind !== 'tetto') y = 2.1;
        const tx = f === 'S' ? x0 + u : x0 + w, tz = f === 'S' ? z0 + d : z0 + d - u;
        if (attraversaLarga(src.x, src.z, tx, tz) || Math.hypot(src.x - tx, src.z - tz) > 14 || !libero(src.x, src.z, tx, tz, src.bi, bi)) continue;   // prima di chiedere il posto
        if (Scena && Scena.attivo()) { const sl = Scena.chiedi(tx, tz, 'abusivo', { max: 5 }); if (!sl) continue; if (sl.u !== undefined && kind !== 'tetto') { u = sl.u; } }
        const px = f === 'S' ? x0 + u : x0 + w, pz = f === 'S' ? z0 + d : z0 + d - u; if (attraversaLarga(src.x, src.z, px, pz) || Math.hypot(src.x - px, src.z - pz) > 14 || !libero(src.x, src.z, px, pz, src.bi, bi)) continue;   // corto e per aria libera: si vede da dove viene
        const t = nodo(kind, px, pz, y, { bi, f, u, yaw: f === 'S' ? 0 : Math.PI / 2 }); seg(src, t, 'abusivo', { era, matassa: n > 1 }); if (c) c.abusivi++; } });
    // ---- 4) le antenne TV sui tetti e il cavo che scende lungo la facciata fino a una finestra ----
    // [tetti3] nella città nuova l'antenna sta dove la mette il piano dei tetti (Tetti.PIANO): una sola, sul colmo o in fondo al terrazzo,
    // e solo sui tetti che ce l'hanno (un tetto calmo su quattro, qualche abitato); le baracche tengono la loro selva
    const T3 = typeof Tetti !== 'undefined' && Tetti.PIANO && Tetti.PIANO.length ? Tetti : null;
    B.forEach((b, bi) => { const era = b.shack ? 'E7' : b.era; if (!era || (b.fl || 1) < 2 && !b.shack) return; const h = hash(bi, 50, 1986);
      const PL = T3 && !b.shack ? T3.PIANO[bi] : null, GA = PL ? PL.gruppi.find(q => q.k === 'antenna') : null;
      if (T3 && !b.shack ? !GA : h > (era === 'E7' ? .5 : era === 'E4' ? .35 : .72)) return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, top = topOf(b);
      let ax = x0 + w * (.35 + hash(bi, 51, 3) * .3), az = z0 + d * (.35 + hash(bi, 52, 3) * .3);
      if (GA) { const a = b.rot && !b.sign && !b.shop ? b.rot : 0, cx = x0 + w / 2, cz = z0 + d / 2, c = Math.cos(a), s2 = Math.sin(a), qx = GA.x - cx, qz = GA.y - cz; ax = cx + qx * c - qz * s2; az = cz + qx * s2 + qz * c; }
      const an = nodo('antenna', ax, az, top + 1.6 + hash(bi, 53, 3) * 1.4, { bi, alta: hash(bi, 54, 3) < .3, falda: !!(GA && GA.falda) }); const c = R.perCasa.get(bi); if (c) c.antenna = an;
      const f = open(tl(b.x + Math.floor(b.w / 2), b.y + b.h)) ? 'S' : open(tl(b.x + b.w, b.y + Math.floor(b.h / 2))) ? 'E' : null; if (!f) return;
      const len = f === 'S' ? w : d, fl = Math.max(1, b.fl || 1), piano = Math.max(1, fl - 1 - Math.floor(hash(bi, 55, 3) * 2)), u0 = hash(bi, 56, 3) < .5 ? 1 : len - 1, tx = f === 'S' ? x0 + u0 : x0 + w, tz = f === 'S' ? z0 + d : z0 + d - u0;
      const sl = Scena && Scena.attivo() ? Scena.chiedi(tx, tz, 'antenna') : { u: u0 }; if (!sl) return; const u = sl.u !== undefined ? sl.u : u0, px = f === 'S' ? x0 + u : x0 + w, pz = f === 'S' ? z0 + d : z0 + d - u;
      const bordo = nodo('gronda', px, pz, top + .05, { bi, f, u }), fin = nodo('finestra', px, pz, MG + (piano - 1) * MF + 1.7, { bi, f, u, yaw: f === 'S' ? 0 : Math.PI / 2 }); seg(an, bordo, 'antenna'); seg(bordo, fin, 'antenna', { facciata: true }); });
    return R;
  }
  const attivo = () => !!R;
  const grafo = () => R;
  // il conteggio per 100 m di via della città: dorsali, traversate, allacci, abusivi, antenne, lampioni; i fili che attraversano un vicolo
  function conteggio() {
    if (!R) return null; const per = {}; R.segmenti.forEach(s => per[s.k] = (per[s.k] || 0) + 1); const km = Math.max(.01, R.km), out = { nodi: R.nodi.length, segmenti: R.segmenti.length, metriVia: Math.round(km * 1000), metriVicoli: Math.round(R.kmVicoli * 1000), per, per100m: {}, lampioni: R.lampioni.length, cabine: R.nodi.filter(n => n.k === 'cabina').length, pozzetti: R.pozzetti.length, mensole: R.mensole.length, contatori: R.nodi.filter(n => n.k === 'contatore').length, antenne: R.nodi.filter(n => n.k === 'antenna').length, errori: [] };
    for (const k in per) out.per100m[k] = +(per[k] / (km * 10)).toFixed(1);
    // ogni segmento ha due nodi veri; nessun filo più lungo di 30 m (un filo da 40 m sarebbe un cavo di nessuno)
    R.segmenti.forEach(s => { const a = R.nodi[s.a], b = R.nodi[s.b]; if (!a || !b) { out.errori.push('segmento senza nodo ' + JSON.stringify(s)); return; } const L = Math.hypot(a.x - b.x, a.z - b.z); if (L > 30) out.errori.push('filo di ' + L.toFixed(0) + ' m (' + s.k + ')'); });
    // i cavi che attraversano un vicolo (traversate e abusivi di traverso), per 100 m di vicolo: ≤ 6
    const M = G.MAP, vic = (M.roads || []).filter(q => q.kind === 'vicolo' && q.pts); let attr = 0;
    R.segmenti.forEach(s => { if (s.k !== 'abusivo' && s.k !== 'traversata') return; const a = R.nodi[s.a], b = R.nodi[s.b]; if (vic.some(q => q.pts.some((p, i) => { if (!i) return false; const o = q.pts[i - 1], d1 = (b.x - a.x) * (o[1] - a.z) - (b.z - a.z) * (o[0] - a.x), d2 = (b.x - a.x) * (p[1] - a.z) - (b.z - a.z) * (p[0] - a.x), d3 = (p[0] - o[0]) * (a.z - o[1]) - (p[1] - o[1]) * (a.x - o[0]), d4 = (p[0] - o[0]) * (b.z - o[1]) - (p[1] - o[1]) * (b.x - o[0]); return d1 * d2 < 0 && d3 * d4 < 0; }))) attr++; });
    out.caviTraversoVicoli = attr; out.caviTraversoPer100mVicolo = +(attr / Math.max(.01, R.kmVicoli * 10)).toFixed(1);
    return out;
  }
  return { init, attivo, grafo, conteggio, INTERRATA, ABUSO, PASSO_LAMP, MG, MF };
})();
if (typeof module !== 'undefined') module.exports = Rete;
