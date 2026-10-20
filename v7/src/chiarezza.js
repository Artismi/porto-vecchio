/* Porto Vecchio — [chiarezza] LE REGOLE DELLA LETTURA DEL FOTOGRAMMA (solo nella città nuova).
   «Qui uno vede mille cose eppure non si capisce nulla»: ogni inquadratura si legge in tre piani, il suolo (dove cammino), il fronte
   (porte, botteghe, scale: la cosa più chiara di tutte), lo sfondo (tetti e cielo). Gli alberi, l'arredo e le cose a terra stanno al
   loro posto in questa gerarchia: mai davanti a un fronte, mai sparsi a caso. Qui stanno le misure e i controlli, senza grafica:
   li usano render.js (filari, chiome, cose a terra) e la prova test_chiarezza.js in Node. Coordinate in metri, x est, z sud.
   - ALBERO: il leccio di città ha il fusto libero fin sopra il piano terra (la chioma comincia sopra la porta e la vetrina), la chioma
     stretta (≈3,4 m) a una o due masse, verde oliva scuro e opaco, poche carte di foglie, l'ombra a terra chiara e morbida.
   - FRONTI: le porte (b.door), le vetrine delle botteghe (b.shopFront.span) e le scale (caselle STAIRS) hanno davanti una fascia
     libera: niente alberi a meno di PORTA metri dall'asse di una porta, niente davanti alla vetrina, niente sulla scala.
   - FILARE: un albero ogni PASSO metri lungo la strada (misurato lungo il tracciato, non ai vertici), sui due marciapiedi a filo del
     cordolo; un posto che cade davanti a un fronte si salta (non si sposta: il ritmo del filare resta leggibile).
   - A TERRA: pannelli, cartoni e tavole si posano solo dove una scena li giustifica (la consegna davanti alla bottega, il cantiere),
     mai sparsi: SCENE_A_TERRA. */
var Chiarezza = (function () {
  'use strict';
  const ALBERO = {
    fusto: 3.9,        // m: sotto la chioma si vede il piano terra (3,6 m) con la porta, la vetrina e l'insegna
    raggio: 1.7,       // m: mezza larghezza della chioma (≈3,4 m): copre il marciapiede, non la facciata
    alto: 3.3,         // m: altezza della chioma (da fusto a cima ≈ 7,2 m)
    masse: 5,          // una massa grande e quattro lobi che la gonfiano: una sagoma sola che si legge
    carte: 34,         // carte di foglie sul contorno (prima 110: coriandoli chiari)
    ombra: .2,         // opacità dell'ombra a terra (disco morbido; la chioma non getta l'ombra del sole sul selciato)
  };
  const PORTA = 2.0, VETRINA = .6, SCALA = 2.4, PROF = 7, PASSO = 12;   // m
  const FRONTI = { porta: 3, vetrina: 3, scala: 2 };   // gerarchia del contrasto: fronte 3, suolo 2, alberi e sfondo 1
  const SCENE_A_TERRA = ['consegna', 'cantiere', 'trasloco', 'mercato', 'baracca', 'discarica'];
  // il lato di un edificio su cui sta una casella esterna (la porta): 'S' 'N' 'E' 'W' o null
  function lato(b, tx, ty) { return ty === b.y + b.h ? 'S' : ty === b.y - 1 ? 'N' : tx === b.x + b.w ? 'E' : tx === b.x - 1 ? 'W' : null; }
  const NORM = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
  // i fronti della città: { x, z (sul filo del muro, al centro dell'apertura), nx, nz (verso la strada), half (mezza fascia libera), tipo }
  // B: gli edifici; TS: metri per casella; tile(tx, ty): il tipo della casella; T: i tipi; GW, GH: la griglia; pezzi: W.pezzi (scalinate, gradoni)
  function fronti(B, TS, tile, T, GW, GH, pezzi) {
    const F = [];
    (B || []).forEach(b => {
      if (b.door) { const f = lato(b, b.door[0], b.door[1]); if (f) { const [nx, nz] = NORM[f], cx = (b.door[0] + .5) * TS - nx * TS / 2, cz = (b.door[1] + .5) * TS - nz * TS / 2;
        F.push({ x: cx, z: cz, nx, nz, half: PORTA, tipo: 'porta', b }); } }
      const S = b.shopFront;
      if (S && S.door) { const f = lato(b, S.door[0], S.door[1]); if (f) { const [nx, nz] = NORM[f], d = (S.door[0] + .5) * TS - nx * TS / 2, e = (S.door[1] + .5) * TS - nz * TS / 2;
        F.push({ x: d, z: e, nx, nz, half: PORTA, tipo: 'porta', b }); } }
      if (S && S.span && S.span[0] && S.span[1]) { const f = lato(b, S.span[0][0], S.span[0][1]); if (f) { const [nx, nz] = NORM[f];
        const ax = (S.span[0][0] + .5) * TS - nx * TS / 2, az = (S.span[0][1] + .5) * TS - nz * TS / 2, bx = (S.span[1][0] + .5) * TS - nx * TS / 2, bz = (S.span[1][1] + .5) * TS - nz * TS / 2;
        F.push({ x: (ax + bx) / 2, z: (az + bz) / 2, nx, nz, half: Math.hypot(bx - ax, bz - az) / 2 + TS / 2 + VETRINA, tipo: 'vetrina', b }); } }
    });
    if (tile && T && T.STAIRS !== undefined) for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) if (tile(tx, ty) === T.STAIRS) F.push({ x: (tx + .5) * TS, z: (ty + .5) * TS, nx: 0, nz: 0, half: SCALA, tipo: 'scala' });
    // le scale dei pezzi grandi (scalinate dei vicoli, gradoni con la scala, la Porta di Terra): un cerchio libero che copre la rampa
    (pezzi || []).forEach(p => { const o = p.opz || {};
      if (p.tipo === 'scalinata') F.push({ x: p.x, z: p.y, nx: 0, nz: 0, half: SCALA + Math.max(o.w || 3, (o.dislivello || 1) * 2.4) / 2, tipo: 'scala' });
      else if (p.tipo === 'gradone' && o.scala) F.push({ x: p.x, z: p.y, nx: 0, nz: 0, half: SCALA + 2, tipo: 'scala' });
      else if (p.tipo === 'porta_terra' || p.tipo === 'porta_monumentale') F.push({ x: p.x, z: p.y, nx: 0, nz: 0, half: SCALA + 4, tipo: 'scala' }); });
    const H = new Map(), C = 8; F.forEach(q => { const k = Math.floor(q.x / C) * 8192 + Math.floor(q.z / C); (H.get(k) || H.set(k, []).get(k)).push(q); });
    F.cella = H; F.C = C; return F;
  }
  // il fronte che un punto a terra coprirebbe (null se il punto è libero): davanti a una porta entro PORTA m dal suo asse e PROF m dal muro,
  // davanti alla vetrina, sopra o accanto a una scala
  function davanti(F, x, z, pad) {
    if (!F || !F.cella) return null; const C = F.C, i0 = Math.floor(x / C), j0 = Math.floor(z / C), p = pad || 0;
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const q of F.cella.get(i * 8192 + j) || []) {
      if (q.tipo === 'scala') { if (Math.hypot(x - q.x, z - q.z) < q.half + p) return q; continue; }
      const dx = x - q.x, dz = z - q.z, v = dx * q.nx + dz * q.nz, u = Math.abs(dx * -q.nz + dz * q.nx);
      if (v > -.5 && v < PROF && u < q.half + p) return q;
    }
    return null;
  }
  // i posti di un filare lungo un tracciato: uno ogni passo metri misurati sul tracciato, sui due lati a off metri dall'asse
  function filare(pts, passo, off, inizio) {
    const out = []; if (!pts || pts.length < 2) return out; let next = inizio === undefined ? passo / 2 : inizio, s = 0;
    for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1e-6) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
      while (next <= s + L) { const t = next - s, x = ax + tx * t, z = az + tz * t; [-1, 1].forEach(sd => out.push({ x: x + nx * sd * off, z: z + nz * sd * off, sd, s: next, nx: nx * sd, nz: nz * sd })); next += passo; }
      s += L; }
    return out;
  }
  // le vie che hanno alberi e come: le alberate (rd.alberi: Corso, viale del boom, lungomare) col filare sui due lati ogni PASSO m;
  // le altre vie di città larghe ≥ 7 m un albero ogni 14 m su un lato solo (LEGGIBILITA: «alberi solo su un lato»); mai la Vittoria
  // dei pennoni («nessun albero»), mai i vicoli, mai le vie strette
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  function strade(roads) {
    const out = [];
    (roads || []).forEach((rd, ri) => {
      if (!rd || !rd.pts || rd.pennoni) return;
      if (rd.alberi) { const sp = rd.alberi === 'palme' ? 'palma' : rd.era === 'E6' ? 'pino' : 'leccio';
        out.push({ rd, kind: 'filare', sp, passo: sp === 'palma' ? 10 : PASSO, off: rd.w / 2 + 1.1, lati: [-1, 1], inizio: PASSO / 2 }); return; }
      if ((rd.kind === 'citta' || rd.kind === 'litoranea') && rd.w >= 7) out.push({ rd, kind: 'viale', passo: 14, off: rd.w / 2 + 1.25, lati: [hash(ri, 7, 351) < .5 ? -1 : 1], inizio: 5 + hash(ri, 0, 352) * 8 });
    });
    return out;
  }
  // la misura di un elenco di alberi: quanti stanno davanti a un fronte (per tipo)
  function misura(F, alberi) { const m = { alberi: alberi.length, porta: 0, vetrina: 0, scala: 0 }; alberi.forEach(t => { const q = davanti(F, t.x, t.z); if (q) m[q.tipo]++; }); return m; }
  return { ALBERO, PORTA, VETRINA, SCALA, PROF, PASSO, FRONTI, SCENE_A_TERRA, lato, fronti, davanti, filare, strade, misura };
})();
if (typeof module !== 'undefined') module.exports = Chiarezza;
