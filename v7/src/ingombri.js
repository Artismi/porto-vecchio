/* Porto Vecchio — [compenetrazioni2] GLI INGOMBRI: lo spazio libero per i pezzi grandi (solo logica, nessuna grafica).
   Il committente, davanti al distributore: «compenetrazione tra benzinaio e case» (la pensilina tagliava le case accanto e una finestra
   a caso). Chi posa un pezzo grande (la pensilina e le pompe del distributore, le tettoie, le pensiline delle stazioni, i chioschi, i
   banchi) chiede qui se il suo rettangolo in pianta sta nello spazio libero: fuori dai VOLUMI DELLE CASE (la pianta di ogni casa, girata
   come la casa, presa per tutta l'altezza: un pezzo che entra nella pianta di una casa la taglia a qualche quota) con MARGINE metri di
   aria dal muro, e sopra un suolo che lo può portare (non la carreggiata, non l'acqua, non le scale, non il giardino).
   Se il pezzo non ci sta, chi lo posa lo rimpicciolisce, lo gira, lo sposta nel suo lotto o lo lascia (non se ne inventano altri).
   Lo usano render.js (il distributore, le tettoie, le stazioni) e la prova test_compenetrazioni.js in Node.
   Coordinate in metri, x est, z sud; un rettangolo è { cx, cz, a, hu, hv }: centro, angolo dell'asse u = (cos a, sin a), mezze misure. */
var Ingombri = (function () {
  'use strict';
  const MARGINE = .5;   // l'aria fra un pezzo grande e il muro di una casa
  const rotOf = b => b && b.rot && !b.sign && !b.shop ? b.rot : 0;   // come render.js: le case girate (non le botteghe né le insegne)
  const rett = (cx, cz, a, hu, hv) => ({ cx, cz, a: a || 0, hu, hv });
  const rettAA = (x0, z0, x1, z1) => rett((x0 + x1) / 2, (z0 + z1) / 2, 0, Math.abs(x1 - x0) / 2, Math.abs(z1 - z0) / 2);
  const angoli = R => { const c = Math.cos(R.a), s = Math.sin(R.a); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [R.cx + i * R.hu * c - j * R.hv * s, R.cz + i * R.hu * s + j * R.hv * c]); };
  // quanto si compenetrano due rettangoli in pianta (0 se separati): il minimo delle sovrapposizioni sui quattro assi
  function pen(A, B) {
    const PA = angoli(A), PB = angoli(B); let p = Infinity;
    for (const R of [A, B]) for (const t of [R.a, R.a + Math.PI / 2]) { const ax = Math.cos(t), az = Math.sin(t);
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      PA.forEach(q => { const v = q[0] * ax + q[1] * az; a0 = Math.min(a0, v); a1 = Math.max(a1, v); });
      PB.forEach(q => { const v = q[0] * ax + q[1] * az; b0 = Math.min(b0, v); b1 = Math.max(b1, v); });
      const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; p = Math.min(p, o); }
    return p;
  }
  // le case in una griglia a 8 m (si rifà se cambia l'elenco)
  let IDX = null;
  function indice(G) {
    const B = G.BUILDINGS || []; if (IDX && IDX.G === G && IDX.n === B.length) return IDX;
    const TS = G.TS, M = new Map(), L = [];
    B.forEach(b => { if (!b || !(b.w > 0) || !(b.h > 0)) return; const R = rett((b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS, rotOf(b), b.w * TS / 2, b.h * TS / 2); R.b = b; L.push(R);
      celle(R, 0, k => { let a = M.get(k); if (!a) M.set(k, a = []); a.push(R); }); });
    IDX = { G, n: B.length, M, L }; return IDX;
  }
  function celle(R, m, fn) { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; angoli(R).forEach(([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
    for (let i = Math.floor((x0 - m) / 8); i <= Math.floor((x1 + m) / 8); i++) for (let j = Math.floor((z0 - m) / 8); j <= Math.floor((z1 + m) / 8); j++) fn(i * 4096 + j); }
  // la casa più compenetrata dal rettangolo R allargato di m (null se nessuna); salta: una casa o un elenco da non contare
  function casa(G, R, m, salta) {
    const I = indice(G), Rm = rett(R.cx, R.cz, R.a, R.hu + (m || 0), R.hv + (m || 0)), seen = new Set(), S = salta ? [].concat(salta) : []; let best = null;
    celle(Rm, 0, k => { for (const H of I.M.get(k) || []) { if (seen.has(H)) continue; seen.add(H); if (S.includes(H.b)) continue; const d = pen(Rm, H); if (d > 1e-6 && (!best || d > best.d)) best = { b: H.b, d }; } });
    return best;
  }
  // il suolo sotto R: ogni punto (ogni mezzo metro) su una casella fra quelle ammesse
  function suolo(G, R, ok) {
    const TS = G.TS, c = Math.cos(R.a), s = Math.sin(R.a), nu = Math.max(1, Math.ceil(R.hu * 4)), nv = Math.max(1, Math.ceil(R.hv * 4));
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = -R.hu + 2 * R.hu * i / nu, v = -R.hv + 2 * R.hv * j / nv, x = R.cx + u * c - v * s, z = R.cz + u * s + v * c;
      if (!ok(G.tileAt(Math.floor(x / TS), Math.floor(z / TS)))) return false; }
    return true;
  }
  // il suolo dei piazzali: lastricato, piazza, marciapiede, banchina, terra battuta, ghiaia (non la carreggiata, l'acqua, le scale, il verde)
  const piazzale = G => { const T = G.T, S = new Set([T.COB, T.PIAZZA, T.WALK, T.QUAY, T.DIRT, T.GRAVEL].filter(v => v !== undefined)); return v => S.has(v); };
  // libero: fuori dalle case con m metri d'aria (MARGINE se non detto) e, se c'è ok, sopra il suolo giusto
  function libero(G, R, m, ok, salta) { return !casa(G, R, m === undefined ? MARGINE : m, salta) && (!ok || suolo(G, R, ok)); }

  // ---- IL DISTRIBUTORE: il chiosco è la casa b (b.kiosk, id 'benzina'); attorno, nello spazio libero, la pensilina con le isole delle
  // pompe, il totem dei prezzi, la pila delle gomme. La pensilina sta su un lato del chiosco, staccata di MARGINE da lui e da ogni casa;
  // si prova sui quattro lati, dalla più grande (10 m di sbalzo, lunga quanto il lato più 2 m) alla più piccola che porta un'isola
  // (3 × 6 m), scorrendo lungo il lato; vince la più grande, a parità quella a est (il disegno di prima). Se non ci sta, niente pensilina:
  // l'isola delle pompe da sola, se c'è posto. Il totem e le gomme cercano un posto libero attorno alla pensilina. ----
  function distributore(G, b) {
    if (!b) return null; const TS = G.TS, x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, ok = piazzale(G), M = MARGINE;
    const LATI = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] }, ordine = ['E', 'S', 'W', 'N'];
    const lato = f => f === 'E' || f === 'W' ? d : w, base = (f, D, L, t) => {   // il rettangolo sul lato f: sbalzo D, lungo L, spostato di t lungo il lato
      const [nx, nz] = LATI[f], ccx = x0 + w / 2, ccz = z0 + d / 2, off = (f === 'E' || f === 'W' ? w : d) / 2 + M + D / 2;
      return f === 'E' || f === 'W' ? rettAA(ccx + nx * off - D / 2, ccz + t - L / 2, ccx + nx * off + D / 2, ccz + t + L / 2) : rettAA(ccx + t - L / 2, ccz + nz * off - D / 2, ccx + t + L / 2, ccz + nz * off + D / 2); };
    let best = null;
    ordine.forEach((f, fi) => { const S = lato(f);
      for (let D = 10; D >= 3 - 1e-9; D -= .5) for (let L = S + 2; L >= 6 - 1e-9; L -= .5) { const tm = Math.max(0, (L + S) / 2 - 2);
        for (let k = 0; k <= 2 * Math.ceil(tm / .5); k++) { const t = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5; if (Math.abs(t) > tm + 1e-9) continue;
          const R = base(f, D, L, t), A = D * L; if (best && (A < best.A - 1e-9 || (Math.abs(A - best.A) < 1e-9 && fi >= best.fi))) continue;
          if (libero(G, R, M, ok)) { best = { f, D, L, t, R, A, fi }; break; } } } });
    const out = { b, lato: best ? best.f : null, pensilina: null, isole: [], pompe: [], totem: null, gomme: null };
    const AA = R => ({ x0: R.cx - R.hu, x1: R.cx + R.hu, z0: R.cz - R.hv, z1: R.cz + R.hv });
    let P = best ? AA(best.R) : null;
    if (P) out.pensilina = P;
    // le isole lungo il lato lungo della pensilina: due se lo sbalzo trasversale arriva a 7 m, una al centro se no
    const isole = Q => { const lx = Q.x1 - Q.x0, lz = Q.z1 - Q.z0, lungoX = lx >= lz, Lg = (lungoX ? lx : lz) - 3, Tr = lungoX ? lz : lx, n = Tr >= 7 ? 2 : 1, I = [];
      for (let k = 0; k < n; k++) { const tr = n === 2 ? (k ? Tr - 2.6 : 2.6) : Tr / 2, c = lungoX ? [(Q.x0 + Q.x1) / 2, Q.z0 + tr] : [Q.x0 + tr, (Q.z0 + Q.z1) / 2];
        I.push({ cx: c[0], cz: c[1], lungoX, L: Lg }); }
      return I; };
    if (!P) {   // senza pensilina: l'isola da sola (1,2 × 4 m) attaccata a un lato, se c'è posto
      for (const f of ordine) { const S = lato(f); let fatto = false; for (let t = 0; t <= S / 2 && !fatto; t += .5) for (const sg of [1, -1]) { const R = base(f, 1.6, 4, sg * t);
        if (libero(G, R, M, ok)) { const Q = AA(R); out.isole.push({ cx: R.cx, cz: R.cz, lungoX: f === 'N' || f === 'S', L: 3.2 }); P = Q; fatto = true; break; } } if (fatto) break; }
    } else out.isole = isole(P);
    out.isole.forEach((I, j) => { const n = I.L >= 4 ? 3 : 1, o = Math.min(2, I.L / 2 - .8); for (let k = 0; k < n; k++) { const u = n === 1 ? 0 : (k - 1) * o; out.pompe.push({ x: I.lungoX ? I.cx + u : I.cx, z: I.lungoX ? I.cz : I.cz + u, rot: I.lungoX ? 0 : Math.PI / 2, j, k }); } });
    // il totem (1,84 × 0,6, alto 4,8 m) e la pila delle gomme (0,8 × 1,8) attorno alla pensilina, fuori dalla sua pianta, col loro margine
    if (P) { const cerca = (hu, hv, prefer) => { let bestT = null;
        for (let u = 0; u <= 1; u += 1 / 16) for (const s of ['n', 's', 'e', 'w']) { const x = s === 'e' ? P.x1 + .3 + hu : s === 'w' ? P.x0 - .3 - hu : P.x0 + (P.x1 - P.x0) * u, z = s === 's' ? P.z1 + .3 + hv : s === 'n' ? P.z0 - .3 - hv : P.z0 + (P.z1 - P.z0) * u;
          const R = rett(x, z, 0, hu, hv); if (out.totem && pen(R, rett(out.totem.x, out.totem.z, 0, .92 + M, .3 + M)) > 0) continue;
          const dd = Math.hypot(x - prefer[0], z - prefer[1]); if (bestT && dd >= bestT.dd) continue; if (libero(G, R, M, ok, null) && pen(rett(x, z, 0, hu + M, hv + M), rettAA(x0, z0, x0 + w, z0 + d)) === 0) bestT = { x, z, dd }; }
        return bestT; };
      const [nx, nz] = LATI[out.lato || 'E'], far = [(P.x0 + P.x1) / 2 + nx * (P.x1 - P.x0) / 2, (P.z0 + P.z1) / 2 + nz * (P.z1 - P.z0) / 2];
      const tt = cerca(.92, .3, [far[0] - nz * 4, far[1] - nx * 4]); if (tt) out.totem = { x: tt.x, z: tt.z };
      const gg = cerca(.4, .9, [far[0] + nz * 4, far[1] + nx * 4]); if (gg) out.gomme = { x: gg.x, z: gg.z }; }
    // la porta del chiosco: il lato dove sta la casella della porta
    if (b.door) { const [dx, dy] = b.door; out.porta = dy >= b.y + b.h ? { f: 'S', u: (dx + .5) * TS } : dy < b.y ? { f: 'N', u: (dx + .5) * TS } : dx < b.x ? { f: 'W', u: (dy + .5) * TS } : { f: 'E', u: (dy + .5) * TS }; }
    // le parti, per le prove: rettangoli in pianta con la quota (dal piede del chiosco)
    out.parti = [];
    if (out.pensilina) out.parti.push(Object.assign({ k: 'pensilina', y0: 4.1, y1: 5 }, out.pensilina));
    out.isole.forEach(I => { const hu = I.lungoX ? I.L / 2 : .6, hv = I.lungoX ? .6 : I.L / 2; out.parti.push({ k: 'pompe', x0: I.cx - hu, x1: I.cx + hu, z0: I.cz - hv, z1: I.cz + hv, y0: 0, y1: 2 }); });
    if (out.totem) out.parti.push({ k: 'totem', x0: out.totem.x - .92, x1: out.totem.x + .92, z0: out.totem.z - .3, z1: out.totem.z + .3, y0: 0, y1: 4.8 });
    if (out.gomme) out.parti.push({ k: 'gomme', x0: out.gomme.x - .4, x1: out.gomme.x + .4, z0: out.gomme.z - .9, z1: out.gomme.z + .9, y0: 0, y1: 1.2 });
    return out;
  }
  return { MARGINE, rett, rettAA, angoli, pen, casa, suolo, piazzale, libero, distributore, indice };
})();
if (typeof module !== 'undefined') module.exports = Ingombri;
