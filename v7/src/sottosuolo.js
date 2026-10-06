/* Porto Vecchio — il sottosuolo della città (v7, «Sotto»).
   Sotto la città c'è un'altra città, ricalcata sulla mappa di sopra:
   - LE FOGNE corrono sotto le strade vere (corso, vie, litoranea dentro la città), a quattro metri e mezzo; ogni trenta metri un tombino
     da cui si esce in mezzo alla strada (V).
   - I POSTI DI SOTTO: la cripta di San Rocco e quella del Santuario del Mare, le vecchie carceri sotto la Caserma della Guardia,
     il rifugio antiaereo sotto la Piazza del Governo, il bunker della guerra nella Collina Nera, il deposito dei contrabbandieri sotto
     il Magazzino Neri (con la grata sulla calata), lo spaccio sotto la Sala giochi Flipper, il Mercato di sotto sotto la piazza,
     la Città dei Topi (chi ci vive) nella vecchia cisterna sotto i giardini. Dai posti sotto un edificio si sale dentro (V).
   - LA GENTE DI SOTTO: contrabbandieri, spacciatori, ricettatori, i Topi. Si cliccano: parlano, vendono, comprano.
   - LA ROBA SEPOLTA: scavando si trova qualcosa (monete, orologi, bossoli…); in certi punti c'è una cassa sotterrata apposta.
     Nei posti di sotto ci sono casse da aprire.
   - LA METROPOLITANA: due stazioni, Periferia Sud e Periferia Nord. Le due gallerie si avvolgono una sull'altra per mezzo giro,
     come metà dell'elica del DNA (andata sopra, ritorno sotto, a metà strada si incrociano), con i passaggi di servizio a pioli.
     Due treni fanno la spola; alla banchina col treno fermo, V (o clic sul treno) per salire: si scende da soli all'altro capo.
   Stato: st.sotto = { folk, crates, stock, found, ride, dug }. Il resto (caselle, portali, stanze) va in st.lv tramite Livelli.hooks.init.
   La grafica (in fondo al file) disegna con un suo gruppo: canale dell'acqua, arredi dei posti, gente, casse, gallerie e treni;
   in superficie tombini, grate e ingressi della metropolitana. */
var Sottosuolo = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const LV = typeof Livelli !== 'undefined' ? Livelli : require('./livelli.js');
  const W = G.MAP.world, TS = G.TS, GW = G.GW, GH = G.GH, T = G.T, N = GW * GH, EL = G.MAP.elev, ZC = W.Z.CITTA;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const idx = (tx, ty) => ty * GW + tx, inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const ti = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)], cen = t => (t + .5) * TS;
  const hash = (a, b, s) => { let h = (a * 374761393 + b * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const K = { FOGNA: 3, CRIPTA: 4, CARCERE: 5, BUNKER: 6, METRO: 7, COVO: 8, BANCHINA: 9 };   // 9: la banchina, senza pareti (la grafica disegna la stazione)
  const O = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const has = id => !O() || !!O().CAT[id];

  // =====================================================================================================================
  // LA MAPPA DI SOTTO (sempre uguale: si calcola una volta, poi si copia in ogni partita)
  // =====================================================================================================================
  const TPL = (function build() {
    const ug = new Uint8Array(N), fl = new Float32Array(N), kind = new Uint8Array(N);
    const portals = [], rooms = [], places = [], folk = [], crates = [], lamps = [];
    const put = (tx, ty, f, k, force) => { if (!inb(tx, ty)) return false; const i = idx(tx, ty); if (ug[i] && !force) return false; ug[i] = 3; fl[i] = f; kind[i] = k; return true; };
    const B = id => W.BUILDINGS.findIndex(b => b.id === id), P = id => G.PLACES[id] || null;

    // ---------------- LE FOGNE: sotto le strade grandi della città ----------------
    const sewer = [];
    (W.roads || []).forEach(rd => {
      if (!rd.pts || rd.pts.length < 2 || !/^(citta|strada|litoranea)$/.test(rd.kind || '') || (rd.w || 0) < 6) return;
      let last = null, run = 0, tomb = -24;
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], d = Math.hypot(bx - ax, by - ay);
        for (let s = 0; s < d; s += .5) {
          const x = ax + (bx - ax) * s / d, y = ay + (by - ay) * s / d, [tx, ty] = ti(x, y); run += .5;
          if (!inb(tx, ty) || W.zone[idx(tx, ty)] !== ZC || G.tileAt(tx, ty) === T.WATER) { last = null; continue; }
          if (last && last[0] === tx && last[1] === ty) continue;
          if (last && last[0] !== tx && last[1] !== ty && G.tileAt(tx, last[1]) !== T.WATER) { if (put(tx, last[1], EL[idx(tx, last[1])] - 4.4, K.FOGNA)) sewer.push([tx, last[1]]); }
          if (put(tx, ty, EL[idx(tx, ty)] - 4.4, K.FOGNA)) sewer.push([tx, ty]);
          last = [tx, ty];
          // un tombino ogni trenta metri, sulla carreggiata, mai troppo vicino a un altro
          if (run - tomb > 30 && G.tileAt(tx, ty) === T.VIA && !portals.some(Q => Q.kind === 'tombino' && Math.hypot(Q.s[0] - tx, Q.s[1] - ty) < 8)) { portals.push({ kind: 'tombino', s: [tx, ty], u: [tx, ty], name: rd.name }); tomb = run; }
        }
      }
    });
    // il pavimento della fogna scende piano: due passate di media coi vicini
    for (let pass = 0; pass < 2; pass++) sewer.forEach(([tx, ty]) => { let s = fl[idx(tx, ty)], c = 1; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const j = idx(tx + dx, ty + dy); if (inb(tx + dx, ty + dy) && kind[j] === K.FOGNA) { s += fl[j]; c++; } }); fl[idx(tx, ty)] = s / c; });
    // le lampade di servizio, rade
    sewer.forEach(([tx, ty]) => { if (hash(tx, ty, 9) < .035) lamps.push({ x: cen(tx), y: cen(ty), f: fl[idx(tx, ty)] + 2.1, c: '#9ad0a0', k: 'fogna' }); });

    // ---------------- I POSTI ----------------
    // una stanza rettangolare (caselle), allo stesso pavimento
    const room = (x0, y0, w, h, f, k) => { for (let ty = y0; ty < y0 + h; ty++) for (let tx = x0; tx < x0 + w; tx++) put(tx, ty, f, k, true); };
    // un corridoio a L (prima in x, poi in y) col pavimento che va da fa a fb; non tocca le caselle già scavate
    const corridor = (ax, ay, bx, by, fa, fb, k) => {
      const pts = []; let x = ax, y = ay; pts.push([x, y]);
      while (x !== bx) { x += Math.sign(bx - x); pts.push([x, y]); }
      while (y !== by) { y += Math.sign(by - y); pts.push([x, y]); }
      pts.forEach(([tx, ty], q) => { if (G.tileAt(tx, ty) === T.WATER && !ug[idx(tx, ty)]) return; put(tx, ty, fa + (fb - fa) * q / Math.max(1, pts.length - 1), k); });
    };
    // la fogna più vicina: un corridoio di servizio dalla stanza
    const toSewer = (tx, ty, f, k) => { let best = null, bd = 1e9; sewer.forEach(([sx, sy]) => { const d = Math.abs(sx - tx) + Math.abs(sy - ty); if (d < bd) { bd = d; best = [sx, sy]; } }); if (best && bd < 160) corridor(tx, ty, best[0], best[1], f, fl[idx(best[0], best[1])], k); return best; };
    const place = (id, name, x, y, r, deco, extra) => { const q = Object.assign({ id, name, x, y, r, deco }, extra || {}); places.push(q); return q; };
    const crate = (id, label, x, y, f, items, extra) => crates.push(Object.assign({ id, label, x, y, f, items }, extra || {}));
    const person = (id, name, role, x, y, f, look, lines, extra) => folk.push(Object.assign({ id, name, role, x, y, f, hx: x, hy: y, r: 2.4, look, lines }, extra || {}));
    const lamp = (x, y, f, c, k) => lamps.push({ x, y, f, c: c || '#ffb060', k: k || 'lume' });
    const LOOK = {
      contr: { top: '#2a3a4a', bottom: '#1e1e24', hair: '#1a1410', skin: '#c8946a' }, contr2: { top: '#6a4a2a', bottom: '#2a2a30', hair: '#3a2a1a', skin: '#d8a880' },
      spacc: { top: '#c8c8d0', bottom: '#2a2a40', hair: '#e8d090', skin: '#e0b090' }, bisca: { top: '#7a1a2a', bottom: '#1a1a1a', hair: '#2a1a12', skin: '#c89070' },
      topo: { top: '#5a5040', bottom: '#3a3428', hair: '#6a6a60', skin: '#b88a68' }, topo2: { top: '#4a3a3a', bottom: '#2e2a26', hair: '#2a2420', skin: '#a87a58' },
      vecchio: { top: '#7a7468', bottom: '#4a463e', hair: '#d8d4cc', skin: '#c8a080' }, merc: { top: '#3a5a3a', bottom: '#2a2a2a', hair: '#1a1410', skin: '#c8946a' },
    };
    // dentro un edificio: la stanza ne occupa la pianta (meno un bordo), il portale sale al piano terra
    const under = (bid, deco, name, depth, k, opts) => {
      const bi = B(bid); if (bi < 0) return null; const b = W.BUILDINGS[bi]; opts = opts || {};
      const w = Math.max(3, b.w - 2), h = Math.max(3, b.h - 2), x0 = b.x + Math.floor((b.w - w) / 2), y0 = b.y + Math.floor((b.h - h) / 2), f = EL[idx(b.x + (b.w >> 1), b.y + (b.h >> 1))] - depth;
      room(x0, y0, w, h, f, k);
      const cx = cen(x0) + (w - 1) * TS / 2, cy = cen(y0) + (h - 1) * TS / 2;
      if (b.door && !opts.noUp) portals.push({ kind: 'interno', s: [x0 + w - 1, y0 + h - 1], u: [x0 + w - 1, y0 + h - 1], bi, name: b.name });
      rooms.push({ x: cx, y: cy, f, deco, w: w * TS, h: h * TS, x0, y0, tw: w, th: h, bi });
      toSewer(x0, y0 + (h >> 1), f, k);
      return { b, bi, x0, y0, w, h, f, cx, cy };
    };

    // la cripta di San Rocco: l'ossario, le tombe dei preti, il reliquiario
    { const q = under('chiesa', 'cripta', 'Cripta di San Rocco', 5, K.CRIPTA); if (q) { place('cripta', 'Cripta di San Rocco', q.cx, q.cy, 7, 'cripta'); crate('reliquiario', 'Reliquiario', q.cx - 2, q.cy - q.h + 1.6, q.f, { anello_oro: 1, candele: 3, gioielli: 1 }, { look: 'reliquiario' }); lamp(q.cx, q.cy, q.f + 1.2, '#ffc070'); } }
    // la cripta del Santuario del Mare: i marinai annegati, gli ex voto
    { const q = under('santuario', 'cripta', 'Cripta dei marinai', 5, K.CRIPTA); if (q) { place('cripta_mare', 'Cripta dei marinai', q.cx, q.cy, 6, 'cripta'); crate('exvoto', 'Ex voto dei marinai', q.cx + 1.5, q.cy - 1, q.f, { orologio: 1, anello_oro: 1, candele: 2 }, { look: 'reliquiario' }); lamp(q.cx, q.cy, q.f + 1.2, '#ffc070'); } }
    // le vecchie carceri sotto la Caserma della Guardia: celle borboniche, un prigioniero che nessuno ricorda
    { const q = under('commissariato', 'carceri', 'Le vecchie carceri', 6, K.CARCERE); if (q) {
      place('carceri', 'Le vecchie carceri', q.cx, q.cy, 8, 'carceri');
      person('prigioniero', 'Il Conte', 'prigioniero dimenticato', q.cx - 2, q.cy, q.f, LOOK.vecchio, ['«Dal \'54 sono qui. Mi hanno dimenticato, e io ho dimenticato loro.»', '«Sopra c\'è la Guardia. Di notte li sento che giocano a carte.»', '«Il brigante Cuccu ha sotterrato la sua cassa sotto il Paese Vecchio, vicino alla chiesa senza tetto. Lo diceva sempre, in cella.»', '«Le fogne? Arrivano dappertutto. I Topi lo sanno.»'], { r: 1.2 });
      crate('fascicoli', 'Schedario della Guardia', q.cx + 2, q.cy - 1, q.f, { fascicolo: 2, grimaldello: 1 }, { look: 'schedario' }); lamp(q.cx, q.cy, q.f + 1.4, '#e0d090'); } }
    // il rifugio antiaereo sotto la Piazza del Governo (e su, nel Palazzo)
    { const pg = P('piazza_gov'), bi = B('governo'); if (pg) {
      const [px, py] = ti(pg.x, pg.y), f = EL[idx(px, py)] - 7; room(px - 3, py - 2, 7, 5, f, K.BUNKER);
      rooms.push({ x: cen(px), y: cen(py), f, deco: 'rifugio', w: 14, h: 10, x0: px - 3, y0: py - 2, tw: 7, th: 5 }); place('rifugio', 'Il rifugio antiaereo', cen(px), cen(py), 8, 'rifugio');
      if (bi >= 0) { const b = W.BUILDINGS[bi], gx = b.x + (b.w >> 1), gy = b.y + b.h - 1; corridor(px, py - 2, gx, gy, f, EL[idx(gx, gy)] - 4, K.BUNKER); portals.push({ kind: 'interno', s: [gx, gy], u: [gx, gy], bi, name: b.name }); }
      toSewer(px + 3, py, f, K.BUNKER);
      crate('rifugio_casse', 'Casse del rifugio', cen(px) + 4, cen(py) - 2, f, { maschera_gas: 1, elmetto: 1, documenti: 1 }, { look: 'militare' }); lamp(cen(px), cen(py), f + 2, '#f0f0d0', 'neon'); } }
    // il bunker della guerra nella Collina Nera: tre stanze, l'armeria, la botola nel bosco
    { const pb = P('osservatorio') || P('belvedere') || P('monte'); if (pb) {
      const [px, py] = ti(pb.x, pb.y), f = EL[idx(px, py)] - 6;
      room(px - 2, py - 2, 5, 4, f, K.BUNKER); room(px + 3, py - 1, 4, 3, f, K.BUNKER); room(px - 6, py - 1, 4, 3, f, K.BUNKER);
      rooms.push({ x: cen(px), y: cen(py) - 1, f, deco: 'bunker', w: 10, h: 8, x0: px - 2, y0: py - 2, tw: 5, th: 4 });
      rooms.push({ x: cen(px + 4) + 1, y: cen(py), f, deco: 'armeria', w: 8, h: 6, x0: px + 3, y0: py - 1, tw: 4, th: 3 });
      rooms.push({ x: cen(px - 5) + 1, y: cen(py), f, deco: 'camerata', w: 8, h: 6, x0: px - 6, y0: py - 1, tw: 4, th: 3 });
      place('bunker', 'Il bunker della guerra', cen(px), cen(py), 12, 'bunker');
      // la botola nel bosco: la prima casella percorribile a sud
      let ex = null; for (let r = 3; r < 9 && !ex; r++) for (const [dx, dy] of [[0, r], [r, 0], [-r, 0], [0, -r]]) if (!ex && G.walkT(px + dx, py + dy)) ex = [px + dx, py + dy];
      if (ex) { corridor(px, py, ex[0], ex[1], f, EL[idx(ex[0], ex[1])] - 3, K.BUNKER); portals.push({ kind: 'botola', nat: true, s: ex, u: ex, name: 'Bunker della guerra' }); }
      toSewer(px, py + 1, f, K.BUNKER);
      crate('armeria', 'Armeria del bunker', cen(px + 4) + 1, cen(py) - 1.5, f, { munizioni: 3, pistola: 1, elmetto: 1, maschera_gas: 1 }, { look: 'militare' });
      lamp(cen(px), cen(py), f + 2, '#f0f0d0', 'neon'); lamp(cen(px + 4) + 1, cen(py), f + 2, '#f0f0d0', 'neon'); } }
    // il deposito dei contrabbandieri sotto il Magazzino Neri, con la grata sulla calata
    { const q = under('magazzino', 'contrabbando', 'Il deposito dei contrabbandieri', 4.5, K.COVO); if (q) {
      place('deposito', 'Il deposito dei contrabbandieri', q.cx, q.cy, 9, 'contrabbando');
      // la grata: la prima casella di banchina verso sud
      let g = null; for (let r = 1; r < 14 && !g; r++) { const tx = q.x0 + (q.w >> 1), ty = q.y0 + q.h - 1 + r; if (inb(tx, ty) && (G.tileAt(tx, ty) === T.QUAY || G.tileAt(tx, ty) === T.WALK || G.tileAt(tx, ty) === T.PIER)) g = [tx, ty]; }
      if (g) { corridor(q.x0 + (q.w >> 1), q.y0 + q.h - 1, g[0], g[1], q.f, EL[idx(g[0], g[1])] - 3, K.COVO); portals.push({ kind: 'grata', s: g, u: g, name: 'Calata' }); }
      person('squalo_sotto', 'Tonino «Bavaglio»', 'contrabbandiere', q.cx - 2, q.cy, q.f, LOOK.contr, ['«Sigarette americane, jeans, cassette. Roba che sopra non c\'è.»', '«Lo Squalo prende la sua parte. Tu paghi e non chiedi.»', '«La grata dà sulla calata. Di notte arriva la barca.»'], { shop: 'contrabbando' });
      person('contr2', 'Gerri', 'contrabbandiere', q.cx + 2, q.cy + 1, q.f, LOOK.contr2, ['«Se la Guardia scende qui, noi siamo già in fogna.»', '«Bavaglio fa i prezzi. Io porto le casse.»'], {});
      crate('casse_contr', 'Casse del contrabbando', q.cx + 3, q.cy - 1.5, q.f, { marlboro: 2, jeans: 1, cassette_proibite: 2 }, { look: 'casse', guard: 'squalo_sotto' });
      lamp(q.cx, q.cy, q.f + 1.8, '#ffb060'); } }
    // lo spaccio sotto la Sala giochi Flipper: la bisca, il Biondo
    { const q = under('flipper', 'spaccio', 'Lo spaccio del Flipper', 4.5, K.COVO); if (q) {
      place('spaccio', 'Lo spaccio sotto il Flipper', q.cx, q.cy, 6, 'spaccio');
      person('biondo', 'Il Biondo', 'spacciatore', q.cx + 1.5, q.cy - .5, q.f, LOOK.spacc, ['«Cosa ti serve per dormire? O per non dormire?»', '«Sopra suonano i flipper. Sotto si fanno i soldi veri.»', '«Ai Topi non vendo: non pagano.»'], { shop: 'spaccio', r: 1.2 });
      person('baro', 'Ninì il baro', 'giocatore', q.cx - 1.5, q.cy + .8, q.f, LOOK.bisca, ['«Una mano a zecchinetta? No? Peccato.»', '«Il Biondo ha le tasche piene e il naso pure.»'], { r: .6, sit: 1 });
      lamp(q.cx, q.cy, q.f + 1.6, '#ff5aa0'); } }
    // il Mercato di sotto: una cisterna sotto la piazza, bancarelle e lampade
    { const pz = P('piazza'); if (pz) {
      const [px, py] = ti(pz.x, pz.y), f = EL[idx(px, py)] - 5.5; room(px - 4, py - 3, 9, 6, f, K.COVO);
      rooms.push({ x: cen(px), y: cen(py) - 1, f, deco: 'mercato', w: 18, h: 12, x0: px - 4, y0: py - 3, tw: 9, th: 6 }); place('mercato', 'Il Mercato di sotto', cen(px), cen(py), 11, 'mercato');
      toSewer(px - 4, py, f, K.COVO); toSewer(px + 4, py, f, K.COVO);
      person('ricettatore', 'Mastro Ugo', 'ricettatore', cen(px) - 4, cen(py) - 3, f, LOOK.merc, ['«Ferri, documenti, timbri. Tutto quello che il Garante non ti darà mai.»', '«Compro anche: oro, orologi, roba che scotta. Senza ricevuta.»', '«Qui sotto non c\'è il coprifuoco.»'], { shop: 'mercato', r: 1 });
      person('donna_merc', 'Assunta', 'venditrice', cen(px) + 4, cen(py) - 3, f, LOOK.contr2, ['«Il mercato di sopra è il mercoledì. Questo è sempre.»', '«Mio marito scava. Trova di tutto: monete, ossa, una volta un elmetto tedesco.»'], { r: 1.2 });
      person('cliente1', 'Uno col cappuccio', 'cliente', cen(px), cen(py) + 1, f, LOOK.topo2, ['«Non mi hai visto.»'], { r: 3.5 });
      person('cliente2', 'Una ragazza', 'cliente', cen(px) + 2, cen(py) + 2, f, LOOK.bisca, ['«Cerco cassette dal continente. Madonna, i Clash.»'], { r: 3 });
      lamp(cen(px) - 4, cen(py) - 2, f + 1.6, '#ffb060'); lamp(cen(px) + 4, cen(py) - 2, f + 1.6, '#ffa050'); } }
    // la Città dei Topi: chi vive sotto, nella vecchia cisterna sotto i giardini
    { const pg = P('giardini'); if (pg) {
      const [px, py] = ti(pg.x, pg.y), f = EL[idx(px, py)] - 5; room(px - 4, py - 3, 8, 6, f, K.FOGNA);
      rooms.push({ x: cen(px) - 1, y: cen(py) - 1, f, deco: 'topi', w: 16, h: 12, x0: px - 4, y0: py - 3, tw: 8, th: 6 }); place('topi', 'La Città dei Topi', cen(px), cen(py), 10, 'topi');
      toSewer(px + 3, py, f, K.FOGNA);
      person('re_topi', 'Il Re dei Topi', 'capo dei Topi', cen(px) - 3, cen(py) - 2, f, LOOK.vecchio, ['«Sopra ci chiamano Topi. Sotto siamo cittadini.»', '«Ti vendo candele e scatolette. I soldi li spendiamo sopra, di notte.»', '«Le fogne sono nostre. I tombini sono le nostre porte.»', '«Sotto il Paese Vecchio c\'è la cassa del brigante. E sotto le rovine della collina qualcuno ha sotterrato le armi della guerra.»'], { shop: 'topi', r: 1 });
      person('topo1', 'Peppe', 'Topo', cen(px) + 1, cen(py), f, LOOK.topo, ['«Hai una sigaretta?»', '«Qui sotto fa meno freddo che sopra. D\'inverno siamo in trenta.»'], { r: 2.5 });
      person('topo2', 'Marisa', 'Topo', cen(px) + 3, cen(py) + 2, f, LOOK.topo2, ['«Mio figlio è sopra, in Caserma. Non gli dire che mi hai vista.»'], { r: 2, sit: 1 });
      person('topo3', 'Bambino', 'Topo', cen(px) - 1, cen(py) + 2, f, LOOK.topo, ['«Lo sai che il treno nuovo passa sotto casa nostra? Fa tremare tutto.»'], { r: 3.5 });
      lamp(cen(px) - 2, cen(py), f + .8, '#ff8a30', 'fuoco'); lamp(cen(px) + 2, cen(py) + 1, f + .8, '#ff8a30', 'fuoco'); } }

    // ---------------- LA METROPOLITANA: da Periferia Sud a Periferia Nord ----------------
    // le due stazioni: un marciapiede in città, sul bordo sud della periferia ovest e sul bordo nord della periferia est
    // l'ingresso: una casella aperta (piazzetta, selciato, prato), lontana dalla carreggiata e dai marciapiedi (pensiline, pali, panchine)
    const open = (tx, ty) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const v = G.tileAt(tx + i, ty + j); if (!G.walkT(tx + i, ty + j) || v === T.VIA || v === T.WALK) return false; } return true; };
    const spot = (x, y) => { const [cx, cy] = ti(x, y); for (const strict of [true, false]) { let best = null, bd = 1e9; for (let r = 0; r < 18 && !best; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const tx = cx + i, ty = cy + j; if (!inb(tx, ty) || W.zone[idx(tx, ty)] !== ZC) continue; const v = G.tileAt(tx, ty); if (![T.WALK, T.COB, T.PIAZZA, T.GRASS, T.DIRT].includes(v) || (strict && !open(tx, ty))) continue; const d = Math.hypot(i, j); if (d < bd) { bd = d; best = [tx, ty]; } } if (best) return best; } return null; };
    const S0 = spot(836, 202), N0 = spot(1122, 64), metro = { ok: false };
    if (S0 && N0) {
      const ax = cen(S0[0]), ay = cen(S0[1]), bx = cen(N0[0]), by = cen(N0[1]), Ld = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / Ld, uy = (by - ay) / Ld, nx = -uy, ny = ux;
      const R = 4.4, OFF = 11;   // raggio dell'elica (mezza distanza tra le gallerie); la banchina comincia 11 m oltre l'ingresso
      const st = [{ id: 'sud', name: 'Periferia Sud', ent: S0, sgn: 1 }, { id: 'nord', name: 'Periferia Nord', ent: N0, sgn: -1 }];
      st.forEach(S => {
        const ex = cen(S.ent[0]), ey = cen(S.ent[1]); S.x = ex + ux * OFF * S.sgn; S.y = ey + uy * OFF * S.sgn;
        let lo = 1e9; for (let a = -10; a <= 10; a += 2) for (let l = -3; l <= 3; l += 3) { const [tx, ty] = ti(S.x + ux * a + nx * l, S.y + uy * a + ny * l); if (inb(tx, ty)) lo = Math.min(lo, EL[idx(tx, ty)]); }
        S.f = Math.min(lo, EL[idx(...S.ent)]) - 9;
        // la banchina a isola tra i due binari: lunga 20 m, larga 6
        for (let ty = Math.floor((S.y - 13) / TS); ty <= Math.floor((S.y + 13) / TS); ty++) for (let tx = Math.floor((S.x - 13) / TS); tx <= Math.floor((S.x + 13) / TS); tx++) {
          const dx = cen(tx) - S.x, dy = cen(ty) - S.y, a = dx * ux + dy * uy, l = dx * nx + dy * ny; if (Math.abs(a) <= 10.5 && Math.abs(l) <= 2.7) put(tx, ty, S.f, K.BANCHINA, true);
        }
        // le scale: dall'ingresso al capo della banchina (un corridoio piastrellato che scende)
        const [hx, hy] = ti(S.x - ux * 9 * S.sgn, S.y - uy * 9 * S.sgn);
        corridor(S.ent[0], S.ent[1], hx, hy, EL[idx(...S.ent)] - 3.2, S.f, K.METRO);
        portals.push({ kind: 'scala', s: S.ent, u: S.ent, name: 'Metropolitana · ' + S.name, metro: S.id });
        rooms.push({ x: S.x, y: S.y, f: S.f, deco: 'metro', ux, uy, name: S.name, sid: S.id });
        place('metro_' + S.id, 'Metropolitana, stazione ' + S.name, S.x, S.y, 12, 'metro');
        toSewer(...ti(S.x + ux * 8 * S.sgn, S.y + uy * 8 * S.sgn), S.f, K.METRO);
        for (const a of [-7, 0, 7]) lamp(S.x + ux * a, S.y + uy * a, S.f + 3.6, '#e8f0ff', 'neon');
      });
      const A = st[0], Bn = st[1];
      Object.assign(metro, { ok: true, R, A, B: Bn, ux, uy, nx, ny, L: Math.hypot(Bn.x - A.x, Bn.y - A.y) });
    }
    return { ug, fl, kind, portals, rooms, places, folk, crates, lamps, metro };
  })();

  // =====================================================================================================================
  // LA METROPOLITANA: le due gallerie a mezza elica e i treni
  // =====================================================================================================================
  const M = TPL.metro;
  // il punto della galleria j (0: andata, 1: ritorno) a una frazione t del percorso: x, y del mondo e quota h del piano del binario
  function trackAt(j, t) {
    const A = M.A, B = M.B, ph = Math.PI * t + j * Math.PI, l = M.R * Math.cos(ph), v = M.R * Math.sin(ph) * .92;
    // l'asse scende in mezzo (11 m sotto le stazioni): l'elica passa sotto le fogne, le cripte e il mercato
    const cx = A.x + (B.x - A.x) * t, cy = A.y + (B.y - A.y) * t, f = A.f + (B.f - A.f) * t - 11 * Math.sin(Math.PI * clamp(t, 0, 1));
    return { x: cx + M.nx * l, y: cy + M.ny * l, h: f - 1.05 + v, l, v };
  }
  const DW = 14, VM = 15, AC = 1.3;   // sosta (s), velocità (m/s), accelerazione (m/s²)
  const TT = M.ok ? M.L / VM + VM / AC : 1, CYC = 2 * (TT + DW);
  function sAt(tau) { const ta = VM / AC, da = .5 * AC * ta * ta; if (tau < ta) return .5 * AC * tau * tau; if (tau < TT - ta) return da + VM * (tau - ta); const r = TT - tau; return M.L - .5 * AC * r * r; }
  // il treno j: dove è, dove va, se è fermo e dove
  function train(st, j) {
    if (!M.ok) return null;
    const ph = (((st.clock || 0) + j * CYC / 2) % CYC + CYC) % CYC;
    let t, dir, at = null, left = 0;
    if (ph < DW) { t = 0; dir = 1; at = 'sud'; left = DW - ph; }
    else if (ph < DW + TT) { t = clamp(sAt(ph - DW) / M.L, 0, 1); dir = 1; }
    else if (ph < 2 * DW + TT) { t = 1; dir = -1; at = 'nord'; left = 2 * DW + TT - ph; }
    else { t = clamp(1 - sAt(ph - 2 * DW - TT) / M.L, 0, 1); dir = -1; }
    const q = trackAt(j, t), q2 = trackAt(j, clamp(t + .002, 0, 1)), q1 = trackAt(j, clamp(t - .002, 0, 1));
    return { j, t, dir, at, left, x: q.x, y: q.y, h: q.h, ang: Math.atan2(q2.y - q1.y, q2.x - q1.x), pitch: Math.atan2(q2.h - q1.h, Math.hypot(q2.x - q1.x, q2.y - q1.y)) };
  }
  const stationOf = id => id === 'sud' ? M.A : M.B;
  const onPlatform = (st, S) => { const p = st.player; return p.lv && p.lv.k === 'ug' && p.lv.ride === undefined && Math.hypot(p.x - S.x, p.y - S.y) < 12.5; };
  function board(st, j) {
    const p = st.player, tr = train(st, j); if (!tr || !tr.at) return 'Il treno non è in banchina.';
    const S = stationOf(tr.at); if (!onPlatform(st, S)) return 'Devi essere sulla banchina.';
    p.lv = { k: 'ug', ride: j }; p.path = []; const R0 = S0(st); R0.ride = { j, from: tr.at, t0: st.clock };
    p.x = tr.x; p.y = tr.y; st.sfx && st.sfx.push({ k: 'porta' });
    return `Sali sul treno per ${tr.at === 'sud' ? M.B.name : M.A.name}. Le porte si chiudono tra ${Math.ceil(tr.left)} secondi.`;
  }
  function rideStep(st) {
    const p = st.player, R0 = S0(st); if (!R0.ride) return;
    if (!p.lv || p.lv.ride === undefined) { R0.ride = null; return; }
    const tr = train(st, R0.ride.j); if (!tr) return;
    p.x = tr.x; p.y = tr.y; p.face = tr.ang + (tr.dir < 0 ? Math.PI : 0); p.speed = 0;
    if (tr.at && tr.at !== R0.ride.from) {
      const S = stationOf(tr.at), side = (tr.x - S.x) * M.nx + (tr.y - S.y) * M.ny > 0 ? 1 : -1;
      p.lv = { k: 'ug' }; p.x = S.x + M.nx * side * 1.6; p.y = S.y + M.ny * side * 1.6; R0.ride = null;
      const L = LV.S(st); L.lastU = ti(p.x, p.y);
      G.feed(st, `${S.name}. Si scende. Le scale sono in fondo alla banchina (V per salire in strada).`, 'good');
    }
  }
  // V alla banchina: il treno fermo, o fra quanto arriva il prossimo
  function metroKey(st) {
    const p = st.player; if (!M.ok || !p.lv || p.lv.k !== 'ug') return null;
    if (p.lv.ride !== undefined) return 'Sei sul treno: scendi alla prossima.';
    for (const S of [M.A, M.B]) if (onPlatform(st, S)) {
      for (const j of [0, 1]) { const tr = train(st, j); if (tr && tr.at === S.id) return board(st, j); }
      // un treno arriva a sud all'inizio del suo ciclo, a nord dopo una sosta e un viaggio
      const arr = S.id === 'sud' ? 0 : DW + TT, wait = Math.min(...[0, 1].map(j => ((arr - ((st.clock || 0) + j * CYC / 2)) % CYC + CYC) % CYC));
      return `Il prossimo treno arriva tra ${Math.max(1, Math.ceil(wait))} secondi.`;
    }
    return null;
  }

  // =====================================================================================================================
  // STATO DELLA PARTITA
  // =====================================================================================================================
  function S0(st) {
    if (st.sotto) return st.sotto;
    const R0 = st.sotto = { folk: TPL.folk.map(n => Object.assign({}, n, { tx: n.x, ty: n.y, wait: 0, speed: 0, face: Math.PI / 2 })), crates: TPL.crates.map(c => Object.assign({}, c, { items: Object.assign({}, c.items), open: false })), stock: {}, found: {}, ride: null, dug: 0 };
    Object.entries(SHOPS).forEach(([k, Sh]) => { R0.stock[k] = {}; Sh.goods.filter(has).forEach((g, i) => { R0.stock[k][g] = 2 + Math.floor(hash(i, k.length, 3) * 4); }); });
    return R0;
  }
  // in ogni partita: si copiano fogne, posti e portali nello scavo
  LV.hooks.init.push((L, st) => {
    for (let i = 0; i < N; i++) if (TPL.ug[i] && !L.ug[i]) { L.ug[i] = TPL.ug[i]; L.fl[i] = TPL.fl[i]; L.kind[i] = TPL.kind[i]; }
    TPL.portals.forEach(P => L.portals.push(Object.assign({}, P, { s: P.s.slice(), u: P.u.slice() })));
    TPL.rooms.forEach(R => L.rooms.push(Object.assign({}, R)));
    if (st) S0(st);
  });

  // =====================================================================================================================
  // LA GENTE DI SOTTO: girano piano attorno al loro posto, parlano, vendono, comprano
  // =====================================================================================================================
  const SHOPS = {
    contrabbando: { label: 'Il contrabbando di Bavaglio', goods: ['marlboro', 'sigarette_contr', 'vodka', 'cassette_proibite', 'rivista_proibita', 'jeans', 'chewing_gum', 'benzina'], mult: 1.5, buy: g => O().CAT[g].ill || O().CAT[g].prezzo >= 8, pay: .55 },
    spaccio: { label: 'Lo spaccio del Biondo', goods: ['morfina', 'sonniferi', 'vodka', 'marlboro', 'petardi'], mult: 2.1, buy: g => /morfina|sonniferi|orologio|anello_oro|gioielli/.test(g), pay: .45 },
    mercato: { label: 'Il banco di Mastro Ugo', goods: ['pistola', 'munizioni', 'lupara', 'coltello', 'grimaldello', 'documenti', 'timbro_falso', 'walkie', 'maschera_gas', 'giubbotto', 'tirapugni', 'spray_peperoncino', 'piccone', 'pala'], mult: 1.7, buy: g => !!(O().CAT[g].ill || O().CAT[g].prezzo >= 6), pay: .5 },
    topi: { label: 'La bancarella dei Topi', goods: ['candele', 'scatolame', 'bende', 'corda', 'torcia', 'pala'], mult: .8, buy: g => O().CAT[g].prezzo < 6 && !O().CAT[g].wpn, pay: .6 },
  };
  const ugAt = (L, x, y) => { const [tx, ty] = ti(x, y); return inb(tx, ty) && L.ug[idx(tx, ty)] > 0; };
  function folkStep(st, dt) {
    const p = st.player, R0 = S0(st), L = st.lv; if (!L) return;
    const near = p.lv && p.lv.k === 'ug';
    R0.folk.forEach(n => {
      if (!near || Math.hypot(n.x - p.x, n.y - p.y) > 90) { n.speed = 0; return; }
      if (n.talk && st.clock - n.talk < 6) { n.speed = 0; n.face = Math.atan2(p.y - n.y, p.x - n.x); return; }
      const d = Math.hypot(n.tx - n.x, n.ty - n.y);
      if (d < .15 || n.sit) { n.speed = 0; n.wait -= dt; if (n.wait <= 0 && !n.sit) { const a = hash(Math.floor(st.clock * 3), n.id.length, 7) * 6.283, r = hash(Math.floor(st.clock * 5), n.id.length, 11) * n.r, x = n.hx + Math.cos(a) * r, y = n.hy + Math.sin(a) * r; if (ugAt(L, x, y)) { n.tx = x; n.ty = y; } n.wait = 3 + hash(n.id.length, Math.floor(st.clock), 5) * 6; } return; }
      const v = Math.min(.9, d / dt), ux = (n.tx - n.x) / d, uy = (n.ty - n.y) / d, nx = n.x + ux * v * dt, ny = n.y + uy * v * dt;
      if (ugAt(L, nx, ny)) { n.x = nx; n.y = ny; n.speed = .9; n.face = Math.atan2(uy, ux); } else { n.tx = n.x; n.ty = n.y; }
    });
  }
  const floorAtXY = (st, x, y) => { const L = LV.S(st); return LV.floorAt(L, x, y); };

  // le casse: si apre e si prende tutto (quella sorvegliata solo se il guardiano non c'è o si fida)
  function openCrate(st, c) {
    const R0 = S0(st); if (c.open) return { ok: false, msg: `${c.label}: vuota.` };
    if (c.guard) { const g = R0.folk.find(n => n.id === c.guard); if (g && Math.hypot(g.x - c.x, g.y - c.y) < 8 && !(R0.trust || {})[c.guard]) return { ok: false, msg: `${g.name}: «Giù le mani. Quella roba si compra.»` }; }
    const got = []; Object.entries(c.items).forEach(([g, q]) => { if (!has(g) || !O()) return; const left = O().givePlayer(st, g, q) || 0; if (q - left > 0) got.push(`${O().nm(g)}${q - left > 1 ? ' ×' + (q - left) : ''}`); c.items[g] = left; if (!left) delete c.items[g]; });
    if (!Object.keys(c.items).length) c.open = true;
    return { ok: got.length > 0, msg: got.length ? `${c.label}: prendi ${got.join(', ')}.` : 'Non ti sta più niente addosso.' };
  }
  // comprare e vendere coi soldi del giocatore (in migliaia di lire, come dappertutto)
  const priceOf = (k, g) => Math.max(1, Math.round(O().CAT[g].prezzo * SHOPS[k].mult * 10) / 10);
  const payOf = (k, g) => Math.max(.5, Math.round(O().CAT[g].prezzo * SHOPS[k].pay * 10) / 10);
  function buy(st, k, g) {
    const R0 = S0(st), Sh = SHOPS[k], p = st.player; if (!Sh || !O() || !has(g)) return { ok: false, msg: 'Non ce l\'ha.' };
    if ((R0.stock[k][g] || 0) < 1) return { ok: false, msg: 'Finito.' };
    const pr = priceOf(k, g); if ((p.money || 0) < pr - 1e-6) return { ok: false, msg: `Costa ${pr}.000: non ce li hai.` };
    const left = O().givePlayer(st, g, 1) || 0; if (left) return { ok: false, msg: 'Non ti sta addosso.' };
    p.money -= pr; R0.stock[k][g]--; R0.trust = R0.trust || {}; const who = R0.folk.find(n => n.shop === k); if (who) R0.trust[who.id] = (R0.trust[who.id] || 0) + 1;
    st.sfx && st.sfx.push({ k: 'cash' });
    return { ok: true, msg: `${O().nm(g)}: ${pr}.000 lire.` };
  }
  function sell(st, k, g) {
    const Sh = SHOPS[k], p = st.player, bag = O() && O().inv(st); if (!Sh || !bag || !(bag[g] >= 1) || !has(g)) return { ok: false, msg: 'Non ce l\'hai.' };
    if (!Sh.buy(g)) return { ok: false, msg: '«Questa roba non la tratto.»' };
    const pr = payOf(k, g); bag[g] -= 1; if (bag[g] <= 0) delete bag[g]; p.money = (p.money || 0) + pr; const R0 = S0(st); R0.stock[k][g] = (R0.stock[k][g] || 0) + 1;
    st.sfx && st.sfx.push({ k: 'cash' });
    return { ok: true, msg: `Vendi ${O().nm(g)} per ${pr}.000 lire.` };
  }
  function shopView(st, k) {
    const Sh = SHOPS[k], R0 = S0(st), bag = O() ? O().inv(st) : {};
    if (!Sh || !O()) return null;
    return { k, label: Sh.label, money: st.player.money || 0,
      goods: Sh.goods.filter(has).map(g => ({ g, nome: O().nm(g), q: R0.stock[k][g] || 0, price: priceOf(k, g), ill: !!O().CAT[g].ill })),
      buys: Object.keys(bag).filter(g => has(g) && bag[g] >= 1 && Sh.buy(g)).map(g => ({ g, nome: O().nm(g), q: Math.floor(bag[g]), price: payOf(k, g) })) };
  }

  // =====================================================================================================================
  // LA ROBA SEPOLTA
  // =====================================================================================================================
  const CACHES = [
    { id: 'brigante', near: 'vecchio_3', items: { valuta: 4, pistola: 1, munizioni: 2, gioielli: 1 }, msg: 'La pala sbatte contro il legno: una cassa sotterrata, chiusa col fil di ferro. La cassa del brigante Cuccu!' },
    { id: 'guerra', near: 'ruderi', items: { elmetto: 1, munizioni: 3, maschera_gas: 1, lupara: 1 }, msg: 'Un telo cerato marcio, e sotto: roba della guerra, avvolta nell\'olio.' },
    { id: 'monolite', near: 'monolite', items: { gioielli: 1, anello_oro: 1, orologio: 1 }, msg: 'Sotto il monolite, una scatola di latta con dentro i gioielli di qualcuno.' },
    { id: 'rudere', near: 'rudere_o', items: { valuta: 3, documenti: 1, orologio: 1 }, msg: 'Un barattolo di vetro sotto le fondamenta del rudere: soldi stranieri e un passaporto.' },
  ].map(c => { const q = G.PLACES[c.near]; return q ? Object.assign(c, { tx: Math.floor(q.x / TS), ty: Math.floor(q.y / TS) }) : null; }).filter(Boolean);
  const FINDS = { citta: [['valuta', 3], ['orologio', 1], ['anello_oro', .6], ['munizioni', 1.2], ['candele', 1.5], ['cassetta', .5], ['bende', 1]], fuori: [['valuta', 1.5], ['elmetto', .8], ['munizioni', 1.5], ['gioielli', .4], ['coltello', .8], ['pietre', 3]] };
  const FIND_TXT = { valuta: 'monete vecchie in un sacchetto marcio', orologio: 'un orologio da taschino nella terra', anello_oro: 'un anello d\'oro tra le radici', munizioni: 'una scatola di bossoli e cartucce, ancora buone', candele: 'un mazzo di candele in una scatola di latta', cassetta: 'una cassetta di metallo arrugginita', bende: 'un pacco di bende militari', elmetto: 'un elmetto della guerra, bucato', gioielli: 'una collana annerita', coltello: 'una baionetta', pietre: 'pietre buone da costruzione' };
  LV.hooks.dug.push((st, tx, ty, L) => {
    if (!O()) return null; const R0 = S0(st); R0.dug++;
    const c = CACHES.find(c => Math.abs(c.tx - tx) <= 1 && Math.abs(c.ty - ty) <= 1 && !(R0.caches || {})[c.id]);
    if (c) { R0.caches = R0.caches || {}; R0.caches[c.id] = true; Object.entries(c.items).forEach(([g, q]) => { if (has(g)) O().givePlayer(st, g, q); }); return c.msg; }
    if (hash(tx, ty, 41) > .065) return null;
    const tab = W.zone[idx(tx, ty)] === ZC ? FINDS.citta : FINDS.fuori, tot = tab.reduce((s, [, w]) => s + w, 0); let r = hash(tx, ty, 43) * tot, g = tab[0][0];
    for (const [k, w] of tab) { if ((r -= w) <= 0) { g = k; break; } }
    if (!has(g)) return null; O().givePlayer(st, g, 1);
    return `Scavando trovi ${FIND_TXT[g] || O().nm(g)}.`;
  });

  // =====================================================================================================================
  // MOVIMENTO SUL TRENO, PASSO DEL MOTORE, SCOPERTE
  // =====================================================================================================================
  { const f0 = LV.freeFn; LV.freeFn = (o, r) => (o.lv && o.lv.ride !== undefined ? () => false : f0(o, r)); }
  { const h0 = LV.heightOf; LV.heightOf = (st, o) => { if (o.lv && o.lv.ride !== undefined) { const tr = train(st, o.lv.ride); return tr ? tr.h + .45 : null; } return h0(st, o); }; }
  { const m0 = LV.moved; LV.moved = (st, dx, dy, hit) => (st.player.lv && st.player.lv.ride !== undefined ? true : m0(st, dx, dy, hit)); }
  // V: prima le scale e le botole sotto i piedi, poi il treno
  { const k0 = LV.key; LV.key = (st, k, sh) => { if (k === 'v' && !st.player.indoor) { const p = st.player, [tx, ty] = ti(p.x, p.y), L = LV.S(st); const onPortal = p.lv && L.portals.some(P => LV.CLIMB.has(P.kind) && P.u[0] === tx && P.u[1] === ty); if (!onPortal) { const m = metroKey(st); if (m) return m; } } return k0(st, k, sh); }; }
  function step(st, dt) {
    if (!st.player) return; const R0 = S0(st), p = st.player;
    rideStep(st); folkStep(st, dt);
    if (!st.__ssT || st.clock - st.__ssT > .5) {
      st.__ssT = st.clock;
      if (p.lv && p.lv.k === 'ug') TPL.places.forEach(q => { if (!R0.found[q.id] && Math.hypot(q.x - p.x, q.y - p.y) < q.r) { R0.found[q.id] = st.t; G.feed(st, `Hai scoperto: ${q.name}.`, 'good'); } });
      if (p.lv && p.lv.k === 'ug' && !R0.found.fogne && TPL.kind[idx(...ti(p.x, p.y))] === K.FOGNA) { R0.found.fogne = st.t; G.feed(st, 'Le fogne: corrono sotto le strade. I tombini sono le porte (V).', 'good'); }
    }
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.error('[Sottosuolo]', e); } } }; }
  // il menu «Qui, adesso» delle Tasche: il treno
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => { const out = (prev(st) || []).slice(), p = st.player; if (M.ok && p && p.lv && p.lv.k === 'ug') { if (p.lv.ride !== undefined) out.push({ id: 'treno', label: 'Sei sul treno', run: null, off: 'si scende all\'altro capo' }); else for (const Sx of [M.A, M.B]) if (onPlatform(st, Sx)) out.push({ id: 'treno', label: 'Prendi il treno (V)', run: () => metroKey(st), off: '' }); } return out; }; }

  // sotto terra il clic va sui cunicoli: la casella scavata più vicina, e il percorso con A* sulle caselle scavate
  function freeSpot(st, x, y) {
    const p = st.player; if (!p.lv || p.lv.k !== 'ug') return { x, y }; const L = LV.S(st);
    if (ugAt(L, x, y)) return { x, y }; const [cx, cy] = ti(x, y); let best = null, bd = 1e9;
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const tx = cx + i, ty = cy + j; if (!inb(tx, ty) || !L.ug[idx(tx, ty)]) continue; const d = Math.hypot(cen(tx) - x, cen(ty) - y); if (d < bd) { bd = d; best = { x: cen(tx), y: cen(ty) }; } }
    return best || { x: p.x, y: p.y };
  }
  function findPath(st, x0, y0, x1, y1) {
    const p = st.player; if (!p.lv || p.lv.k !== 'ug') return []; const L = LV.S(st);
    const [ax, ay] = ti(x0, y0), [bx, by] = ti(x1, y1); if (!inb(bx, by) || !L.ug[idx(bx, by)]) return [];
    if (ax === bx && ay === by) return [{ x: x1, y: y1 }];
    const open = [[ax, ay, 0, Math.hypot(bx - ax, by - ay)]], came = new Map(), gS = new Map([[idx(ax, ay), 0]]); let n = 0;
    while (open.length && n++ < 6000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][3] < open[bi][3]) bi = k;
      const [cx, cy, g] = open.splice(bi, 1)[0];
      if (cx === bx && cy === by) { const out = [{ x: x1, y: y1 }]; let k = idx(cx, cy); while (came.has(k)) { k = came.get(k); const tx = k % GW, ty = Math.floor(k / GW); if (tx === ax && ty === ay) break; out.unshift({ x: cen(tx), y: cen(ty) }); } return out; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (!inb(nx, ny) || !L.ug[idx(nx, ny)]) continue;
        if (dx && dy && (!L.ug[idx(cx + dx, cy)] || !L.ug[idx(cx, cy + dy)])) continue;
        const k = idx(nx, ny), ng = g + (dx && dy ? 1.414 : 1); if (gS.has(k) && gS.get(k) <= ng) continue;
        gS.set(k, ng); came.set(k, idx(cx, cy)); open.push([nx, ny, ng, ng + Math.hypot(bx - nx, by - ny)]);
      }
    }
    return [];
  }

  // =====================================================================================================================
  // CLIC: gente, casse, treno (main.js li tratta come 'loot' con via 'sotto')
  // =====================================================================================================================
  const UI = { open: null, msg: '', msgT: 0, tab: 'compra' };
  function pick(st, nx, ny, o) {
    const p = st.player, R = typeof window !== 'undefined' && window.__pv && window.__pv.R; if (!R || !p.lv || p.lv.k !== 'ug' || p.lv.ride !== undefined || p.vehicle) return null;
    if (typeof Cantiere !== 'undefined' && Cantiere.active()) return null;
    const R0 = S0(st); let best = null, bd = Math.max(26, o.h * .045);
    const test = (x, y, h, ref, label) => { if (Math.hypot(x - p.x, y - p.y) > 40) return; const pr = R.project(x, h, y); if (pr.behind) return; const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h); if (d < bd) { bd = d; best = { kind: 'loot', via: 'sotto', ref, x, y, label }; } };
    R0.folk.forEach(n => test(n.x, n.y, n.f + 1.2, 'n:' + n.id, `${n.name} · ${n.role}`));
    R0.crates.forEach(c => test(c.x, c.y, c.f + .5, 'c:' + c.id, c.open ? `${c.label} (vuota)` : `Apri: ${c.label}`));
    if (M.ok) [0, 1].forEach(j => { const tr = train(st, j); if (tr && tr.at) test(tr.x, tr.y, tr.h + 2, 't:' + j, `Sali sul treno per ${tr.at === 'sud' ? M.B.name : M.A.name}`); });
    return best;
  }
  function find(st, ref) {
    const R0 = S0(st), [k, id] = [ref.slice(0, 1), ref.slice(2)];
    if (k === 'n') { const n = R0.folk.find(q => q.id === id); return n ? { x: n.x, y: n.y } : null; }
    if (k === 'c') { const c = R0.crates.find(q => q.id === id); return c ? { x: c.x, y: c.y } : null; }
    if (k === 't') { const tr = train(st, +id); if (!tr || !tr.at) return null; const S = stationOf(tr.at); return { x: S.x, y: S.y }; }
    return null;
  }
  const goal = (st, ref) => { const q = find(st, ref); if (!q) return null; if (ref[0] === 't') return q; return freeSpot(st, q.x, q.y); };
  const reach = ref => ref[0] === 't' ? 3 : 1.7;
  function arrive(st, ref) {
    const R0 = S0(st), k = ref[0], id = ref.slice(2);
    if (k === 't') { const m = board(st, +id); G.feed(st, m, 'info'); return; }
    if (k === 'c') { const c = R0.crates.find(q => q.id === id); if (c) { const r = openCrate(st, c); G.feed(st, r.msg, r.ok ? 'good' : 'bad'); } return; }
    if (k === 'n') { const n = R0.folk.find(q => q.id === id); if (!n) return; n.talk = st.clock; n.lineI = ((n.lineI === undefined ? -1 : n.lineI) + 1) % n.lines.length; UI.open = n.id; UI.tab = 'compra'; UI.msg = ''; UI.dirty = true; }
  }

  // =====================================================================================================================
  // IL PANNELLO: chi parla e cosa vende
  // =====================================================================================================================
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const CSS = `
#ss { position: absolute; right: 18px; top: 84px; z-index: 41; width: 340px; max-width: calc(100% - 32px); display: none; font-family: 'Instrument Sans', system-ui, sans-serif; color: #E9DCBC;
  padding: 14px 16px; border-radius: 16px; background: linear-gradient(135deg, rgba(24,32,30,.96), rgba(36,30,40,.96)); box-shadow: 0 0 0 1px #3A5A50, 0 0 0 4px rgba(13,16,21,.75), 0 0 0 5px rgba(176,141,87,.35); }
#ss.on { display: block; }
#ss b.nm { display: block; font: 400 26px 'Instrument Serif', Georgia, serif; } #ss small.rl { color: rgba(233,220,188,.6); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
#ss .line { margin: 10px 0 12px; font: italic 16px/1.4 'Instrument Serif', Georgia, serif; }
#ss .tabs { display: flex; gap: 6px; margin-bottom: 8px; } #ss .tabs button, #ss .x { cursor: pointer; border-radius: 14px; padding: 3px 12px; background: none; border: 1px solid rgba(233,220,188,.2); color: rgba(233,220,188,.75); font: 600 11px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .14em; text-transform: uppercase; }
#ss .tabs button.on { color: #E9DCBC; box-shadow: 0 0 0 2px #B08D57; border-color: transparent; } #ss .x { position: absolute; right: 12px; top: 12px; }
#ss .list { display: grid; gap: 4px; max-height: 300px; overflow-y: auto; scrollbar-color: #3A5A50 transparent; }
#ss .it { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; padding: 5px 8px; border-radius: 10px; background: rgba(15,27,25,.6); cursor: pointer; font-size: 13.5px; }
#ss .it:hover { box-shadow: inset 0 0 0 1px rgba(176,141,87,.6); } #ss .it.no { opacity: .45; cursor: default; } #ss .it em { color: #B08D57; font-style: normal; } #ss .it small { color: rgba(233,220,188,.5); } #ss .it.ill b { color: #FF8AB8; }
#ss .msg { margin-top: 8px; font: italic 14px 'Instrument Serif', Georgia, serif; color: #B08D57; } #ss .msg.no { color: #FF5FA2; } #ss .wal { margin-top: 6px; font-size: 12px; color: rgba(233,220,188,.6); }
`;
  let lastHtml = '';
  function panel(st) {
    if (typeof document === 'undefined') return; let el = document.getElementById('ss');
    if (!el) { const app = document.getElementById('app'); if (!app) return; const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css); el = document.createElement('div'); el.id = 'ss'; app.appendChild(el); el.addEventListener('click', onPanel); }
    const R0 = S0(st), n = UI.open ? R0.folk.find(q => q.id === UI.open) : null, p = st.player;
    if (n && (Math.hypot(n.x - p.x, n.y - p.y) > 5 || !p.lv || p.lv.k !== 'ug')) UI.open = null;
    if (!UI.open || !n) { el.classList.remove('on'); lastHtml = ''; return; }
    const V = n.shop ? shopView(st, n.shop) : null;
    let body = '';
    if (V) {
      const rows = UI.tab === 'compra'
        ? V.goods.map(g => `<div class="it ${g.q < 1 || V.money < g.price ? 'no' : ''} ${g.ill ? 'ill' : ''}" data-a="compra" data-g="${esc(g.g)}"><b>${esc(g.nome)}</b><small>${g.q} rimasti</small><em>${g.price}.000</em></div>`).join('')
        : V.buys.map(g => `<div class="it" data-a="vendi" data-g="${esc(g.g)}"><b>${esc(g.nome)}</b><small>ne hai ${g.q}</small><em>${g.price}.000</em></div>`).join('') || '<div class="wal">Non hai niente che gli interessi.</div>';
      body = `<div class="tabs"><button class="${UI.tab === 'compra' ? 'on' : ''}" data-a="tab" data-g="compra">Compra</button><button class="${UI.tab === 'vendi' ? 'on' : ''}" data-a="tab" data-g="vendi">Vendi</button></div><div class="list">${rows}</div><div class="wal">In tasca: ${Math.floor(V.money * 10) / 10}.000 lire · ${esc(V.label)}</div>`;
    }
    const showMsg = UI.msg && Date.now() - UI.msgT < 5000;
    const html = `<button class="x" data-a="chiudi">Chiudi · Esc</button><b class="nm">${esc(n.name)}</b><small class="rl">${esc(n.role)}</small><div class="line">${esc(n.lines[n.lineI || 0])}</div>${body}${showMsg ? `<div class="msg ${UI.msgOk ? '' : 'no'}">${esc(UI.msg)}</div>` : ''}`;
    if (html !== lastHtml || UI.dirty) { el.innerHTML = html; lastHtml = html; UI.dirty = false; }
    el.classList.add('on');
  }
  function onPanel(e) {
    const t = e.target.closest('[data-a]'); if (!t) return; const st = window.__pv && window.__pv.st; if (!st) return; const a = t.dataset.a, g = t.dataset.g;
    const R0 = S0(st), n = R0.folk.find(q => q.id === UI.open); e.stopPropagation();
    if (a === 'chiudi') UI.open = null;
    if (a === 'tab') UI.tab = g;
    if ((a === 'compra' || a === 'vendi') && n && n.shop) { const r = a === 'compra' ? buy(st, n.shop, g) : sell(st, n.shop, g); UI.msg = r.msg; UI.msgOk = r.ok; UI.msgT = Date.now(); G.feed(st, r.msg, r.ok ? 'good' : 'bad'); }
    lastHtml = ''; panel(st);
  }
  if (typeof addEventListener !== 'undefined') addEventListener('keydown', e => { if (e.key === 'Escape' && UI.open) { UI.open = null; e.stopImmediatePropagation(); } }, true);

  // =====================================================================================================================
  // LA SEZIONE: sotto terra, accanto alla vista dall'alto (che serve a dirigere la galleria), un taglio verticale lungo la
  // direzione in cui scavi. Piccola mentre vai avanti; grande quando scavi in giù o in su (J, K, Maiusc+J, le botole).
  // Mostra la superficie con le case e le strade, gli strati della terra, la roccia, quello che è già scavato (cunicoli,
  // fogne, cripte, la metro), le scale, te, e le tre caselle che puoi scavare adesso (H avanti, J giù, K su) con l'avanzamento.
  // =====================================================================================================================
  const SEZ = { el: null, cv: null, big: 0, hide: false, last: 0, wasBig: false };
  const VERT = /^(scendi|sali|pozzo|botola|su|imbocco)$/;
  const SEZ_CSS = `
#sez { position: absolute; z-index: 39; right: 18px; top: 78px; border-radius: 14px; overflow: hidden; display: none; pointer-events: auto; cursor: pointer;
  box-shadow: 0 0 0 1px #3A5A50, 0 0 0 4px rgba(13,16,21,.75), 0 0 0 5px rgba(176,141,87,.35); transition: width .35s, height .35s, right .35s, top .35s; background: #0c0b0a; }
#sez.on { display: block; } #sez canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
#sez .tt { position: absolute; left: 10px; top: 7px; font: 600 10.5px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .18em; text-transform: uppercase; color: rgba(233,220,188,.7); pointer-events: none; }
#sez.min { width: 120px !important; height: 26px !important; }
`;
  function sezMount() {
    if (SEZ.el || typeof document === 'undefined') return !!SEZ.el; const app = document.getElementById('app'); if (!app) return false;
    const css = document.createElement('style'); css.textContent = SEZ_CSS; document.head.appendChild(css);
    const el = SEZ.el = document.createElement('div'); el.id = 'sez'; el.innerHTML = '<canvas></canvas><span class="tt">Sezione · clic per chiudere</span>'; app.appendChild(el);
    SEZ.cv = el.querySelector('canvas'); el.addEventListener('mousedown', e => { e.stopPropagation(); SEZ.hide = !SEZ.hide; el.classList.toggle('min', SEZ.hide); el.querySelector('.tt').textContent = SEZ.hide ? 'Sezione ▸' : 'Sezione · clic per chiudere'; });
    return true;
  }
  const BAND = [[0, '#6a4c34'], [1.2, '#5a3e2a'], [4, '#4e3a2c'], [9, '#463830'], [14, '#3c3634'], [22, '#2e2c2e']];   // strati sotto la superficie (m)
  function sezDraw(st) {
    if (!sezMount()) return; const p = st.player, L = st.lv; if (!L) return;
    const job = L.job, under = !!(p.lv && p.lv.k === 'ug'), digging = !!(job && !p.indoor);
    const on = (under && p.lv.ride === undefined) || digging; SEZ.el.classList.toggle('on', on && !(UI.open)); if (!on || UI.open) return;
    const now = performance.now();
    if (job && VERT.test(job.what)) SEZ.last = now;
    const big = !SEZ.hide && (now - SEZ.last < 2600);
    const app = document.getElementById('app'), aw = app ? app.clientWidth : 1280, ah = app ? app.clientHeight : 800;
    const w = big ? Math.min(760, aw * .62) : Math.min(380, aw * .42), h = big ? Math.min(300, ah * .34) : Math.min(190, ah * .26);
    if (!SEZ.hide) { SEZ.el.style.width = w + 'px'; SEZ.el.style.height = h + 'px'; SEZ.el.style.right = big ? ((aw - w) / 2) + 'px' : '18px'; SEZ.el.style.top = big ? Math.max(84, ah - h - 96) + 'px' : '78px'; }   // grande: in basso, il personaggio resta in vista
    if (SEZ.hide) return;
    const cv = SEZ.cv, dpr = 1, CW = Math.round(w * dpr), CH = Math.round(h * dpr); if (cv.width !== CW || cv.height !== CH) { cv.width = CW; cv.height = CH; }
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    // l'asse: la direzione in cui guardi (a passi di 90°), come lo scavo
    const [dx, dy] = LV.dirOf ? LV.dirOf(p.face) : [1, 0], [ptx, pty] = ti(p.x, p.y);
    const colAt = NT0 => { const out = []; for (let k = -NT0; k <= NT0; k++) { const tx = ptx + dx * k, ty = pty + dy * k; out.push(inb(tx, ty) ? { k, tx, ty, i: idx(tx, ty) } : null); } return out; };
    const pf = LV.heightOf(st, p) ?? EL[idx(ptx, pty)];
    // l'altezza del taglio: dal tetto più alto vicino al fondo più basso, poi la larghezza con la stessa scala (niente deformazioni)
    let top = -1e9, bot = 1e9; colAt(9).forEach(c => { if (!c) return; top = Math.max(top, EL[c.i] + (G.tileAt(c.tx, c.ty) === T.BLD ? 10 : 3)); if (L.ug[c.i]) bot = Math.min(bot, L.fl[c.i]); });
    bot = Math.min(bot, pf) - 4; top = Math.max(top, pf + 7); if (top - bot < 16) bot = top - 16;
    const sy = (CH - 6) / (top - bot), NT = clamp(Math.round(CW / sy / TS / 2), 6, 40), col = colAt(NT);
    const sx = CW / (2 * NT + 1), X = k => (k + NT) * sx, Y = hh => 3 + (top - hh) * sy;
    // cielo (giorno o notte, in tinta col gioco)
    const hr = G.hour ? G.hour(st) : 12, night = hr < 6 || hr >= 20, sk = x.createLinearGradient(0, 0, 0, CH * .5);
    sk.addColorStop(0, night ? '#0e1424' : '#5a7a98'); sk.addColorStop(1, night ? '#24283a' : '#c8b8a0'); x.fillStyle = sk; x.fillRect(0, 0, CW, CH);
    // terra a strati, roccia, acqua
    col.forEach(c => {
      if (!c) return; const xa = X(c.k), sf = EL[c.i], v = G.tileAt(c.tx, c.ty), hard = v === T.ROCK || v === T.CLIFF;
      if (v === T.WATER) { x.fillStyle = '#2a5a7a'; x.fillRect(xa, Y(.2), sx + 1, CH); x.fillStyle = '#3a3430'; x.fillRect(xa, Y(-3), sx + 1, CH); return; }
      for (let b = 0; b < BAND.length; b++) { const d0 = BAND[b][0], d1 = b + 1 < BAND.length ? BAND[b + 1][0] : 99; x.fillStyle = hard && d0 >= 1.2 ? '#4a4846' : BAND[b][1]; x.fillRect(xa, Y(sf - d0), sx + 1, (d1 - d0) * sy + 1); }
      // sassi nella terra, sempre uguali per casella
      for (let q = 0; q < 6; q++) { const r1 = hash(c.tx, c.ty, 60 + q), r2 = hash(c.ty, c.tx, 70 + q); x.fillStyle = r1 < .5 ? 'rgba(0,0,0,.18)' : 'rgba(255,240,210,.08)'; x.fillRect(xa + r1 * sx, Y(sf - 1 - r2 * 24), Math.max(2, sx * .18), Math.max(1, sy * .25)); }
      // la superficie: erba, selciato o asfalto
      x.fillStyle = v === T.VIA ? '#2a2a2e' : v === T.WALK || v === T.PIAZZA || v === T.COB ? '#8a8478' : v === T.SAND ? '#d8c89a' : hard ? '#6a6662' : '#4a6a3a'; x.fillRect(xa, Y(sf) - 2, sx + 1, 3);
      if (v === T.BLD) {
        // la casa in sezione: muri del suo colore, i piani, le finestre (accese di notte), il tetto, le fondamenta
        const bi0 = W.bIndex[c.i], b = W.BUILDINGS[bi0], nf = Math.min(6, (b && b.fl) || 2), hh = 3.1 * nf, wall = ['#c8a888', '#d8c8a0', '#b8786a', '#e0d0b8', '#a8b8a8', '#d0a070'][bi0 % 6];
        x.fillStyle = wall; x.fillRect(xa, Y(sf + hh), sx + 1, hh * sy);
        for (let f = 0; f < nf; f++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(xa, Y(sf + f * 3.1), sx + 1, 1); x.fillStyle = night && hash(c.tx + c.ty, f, 3) < .45 ? '#ffd890' : '#3a4a5a'; x.fillRect(xa + sx * .3, Y(sf + f * 3.1 + 2.4), sx * .4, 1.2 * sy); }
        const lft = !(col[c.k + NT - 1] && G.tileAt(col[c.k + NT - 1].tx, col[c.k + NT - 1].ty) === T.BLD), rgt = !(col[c.k + NT + 1] && G.tileAt(col[c.k + NT + 1].tx, col[c.k + NT + 1].ty) === T.BLD);
        x.fillStyle = '#7a4a3a'; x.fillRect(xa - (lft ? 2 : 0), Y(sf + hh) - 3, sx + 1 + (lft ? 2 : 0) + (rgt ? 2 : 0), 4);
        x.fillStyle = '#6a6862'; x.fillRect(xa, Y(sf), sx + 1, 1.4 * sy); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(xa, Y(sf - 1.4), sx + 1, 1);
      }
      if (v === T.TREE) { x.fillStyle = '#4a3a2a'; x.fillRect(xa + sx * .42, Y(sf + 3), sx * .16, 3 * sy); x.fillStyle = '#2e4a2a'; x.beginPath(); x.arc(xa + sx / 2, Y(sf + 4), Math.max(3, sx * .7), 0, 6.3); x.fill(); x.strokeStyle = 'rgba(80,60,40,.5)'; x.beginPath(); x.moveTo(xa + sx / 2, Y(sf)); x.lineTo(xa + sx * .2, Y(sf - 1.5)); x.moveTo(xa + sx / 2, Y(sf)); x.lineTo(xa + sx * .8, Y(sf - 1.2)); x.stroke(); }
    });
    // la metropolitana: dove le gallerie attraversano il taglio, un cerchio
    if (M.ok) for (const j of [0, 1]) for (let t = 0; t <= 1; t += .004) { const q = trackAt(j, t), ux = q.x - p.x, uy = q.y - p.y, along = ux * dx + uy * dy, perp = Math.abs(-ux * dy + uy * dx); if (perp < .9 && Math.abs(along) < NT * TS) { const k = along / TS - .5, cx0 = X(k) + sx / 2, cy0 = Y(q.h + 1.4); x.fillStyle = '#16141a'; x.beginPath(); x.ellipse(cx0, cy0, 2.6 * sx / TS, 2.6 * sy, 0, 0, 6.3); x.fill(); x.strokeStyle = j ? '#8ab0d8' : '#d8b080'; x.lineWidth = 2; x.stroke(); } }
    // lo scavato: cavità all'altezza del pavimento, bordate secondo il tipo
    const KC = { 1: '#7a7068', 2: '#8a6a44', 3: '#9a4a34', 4: '#a8a090', 5: '#a8a090', 6: '#9a9a94', 7: '#d8d4c4', 8: '#9a4a34', 9: '#d8d4c4' };
    col.forEach(c => {
      if (!c || !L.ug[c.i]) return; const xa = X(c.k), f = L.fl[c.i], kd = L.kind[c.i], hh = kd === 7 || kd === 9 ? 4.2 : 2.5;
      x.fillStyle = '#100e0c'; x.fillRect(xa, Y(f + hh), sx + 1, hh * sy); x.fillStyle = KC[kd] || '#8a6a44'; x.fillRect(xa, Y(f + hh), sx + 1, 2); x.fillRect(xa, Y(f), sx + 1, 2);
      if (kd === 3) { x.fillStyle = '#2c5a4a'; x.fillRect(xa, Y(f + .25), sx + 1, .25 * sy + 1); }
      if (kd === 2 && (c.tx + c.ty) % 3 === 0) { x.fillStyle = '#6a4a30'; x.fillRect(xa + 1, Y(f + hh), 2, hh * sy); x.fillRect(xa + sx - 3, Y(f + hh), 2, hh * sy); x.fillRect(xa, Y(f + hh), sx, 2); }
      // il pozzo scavato sul posto: i pioli
      if (L.shafts && L.shafts[c.i]) { x.fillStyle = '#8a6a44'; for (let yy = f; yy < f + 1.6 * L.shafts[c.i] + .5; yy += .4) x.fillRect(xa + sx * .3, Y(yy), sx * .4, 1); }
    });
    // le uscite: scale, tombini, botole, l'entrata in casa
    L.portals.forEach(P => { if (!LV.CLIMB.has(P.kind)) return; const c = col.find(c => c && c.tx === P.u[0] && c.ty === P.u[1]); if (!c) return; const xa = X(c.k), f = L.fl[c.i], sf = EL[c.i]; x.strokeStyle = P.kind === 'tombino' ? '#9aa0a8' : P.kind === 'interno' ? '#e8c060' : '#b08d57'; x.lineWidth = 1; for (const o of [.3, .7]) { x.beginPath(); x.moveTo(xa + sx * o, Y(f)); x.lineTo(xa + sx * o, Y(sf)); x.stroke(); } for (let yy = f + .3; yy < sf; yy += .4) { x.beginPath(); x.moveTo(xa + sx * .3, Y(yy)); x.lineTo(xa + sx * .7, Y(yy)); x.stroke(); } });
    // le tre caselle che puoi scavare adesso
    const c1 = col[NT + 1], c0 = col[NT];
    if (under && c1 && c0 && L.ug[c0.i]) {
      const f0 = L.fl[c0.i], opts = [['H', 0, '#e8e0cc'], ['J', -1.3, '#ff9a5a'], ['K', 1.3, '#8ad0ff']];
      if (!L.ug[c1.i]) opts.forEach(([key, dz, cc]) => { const f = f0 + dz, xa = X(1); x.setLineDash([3, 3]); x.strokeStyle = cc; x.lineWidth = 1.5; x.strokeRect(xa + 1, Y(f + 2.4), sx - 2, 2.4 * sy); x.setLineDash([]); if (big || dz === 0) { x.fillStyle = cc; x.font = `bold ${Math.max(9, sy * .9)}px Arial`; x.fillText(key, xa + sx + 3, Y(f + 1.2) + 4); } });
      if (big) { x.setLineDash([2, 3]); x.strokeStyle = '#ffd060'; x.strokeRect(X(0) + 1, Y(f0 - 1.6 + 2.4) + 2, sx - 2, 1.6 * sy); x.setLineDash([]); x.fillStyle = '#ffd060'; x.fillText('⇧J', X(0) + 2, Y(f0 - 1) + 4); }
    }
    // lo scavo in corso: la casella si riempie di buio dall'alto, e volano zolle
    if (job && job.x !== undefined) {
      const pr = clamp(1 - (job.until - st.clock) / job.dur, 0, 1), dz = job.what === 'scendi' ? -1.3 : job.what === 'sali' ? 1.3 : 0;
      const tgtK = /^(avanti|scendi|sali)$/.test(job.what) ? 1 : 0, f = under ? (job.what === 'pozzo' ? pf - 1.6 : pf + dz) : pf - 3.2, hh = job.what === 'pozzo' || job.what === 'botola' ? 1.6 + (job.what === 'botola' ? 1.6 : 0) : 2.4;
      x.fillStyle = 'rgba(16,14,12,.9)'; x.fillRect(X(tgtK) + 1, Y(f + hh), sx - 2, hh * sy * pr);
      for (let q = 0; q < 7; q++) { const a = hash(q, Math.floor(now / 90), 5), r1 = hash(q, Math.floor(now / 90), 9); x.fillStyle = q % 2 ? '#8a6a44' : '#b89a6a'; x.fillRect(X(tgtK) + sx * a, Y(f + hh * (1 - pr)) + r1 * 6 - 3, 2, 2); }
      x.fillStyle = '#ffd060'; x.fillRect(4, CH - 7, (CW - 8) * pr, 3);
    }
    // tu
    const px0 = X(0) + sx / 2, py0 = Y(pf); x.fillStyle = '#ffcf5a'; x.fillRect(px0 - 2, py0 - 1.75 * sy, 4, 1.4 * sy); x.beginPath(); x.arc(px0, py0 - 1.75 * sy - 3, 3, 0, 6.3); x.fill();
    if (under) { const g0 = x.createRadialGradient(px0, py0 - sy, 2, px0, py0 - sy, 6 * sy); g0.addColorStop(0, 'rgba(255,200,110,.22)'); g0.addColorStop(1, 'rgba(255,200,110,0)'); x.fillStyle = g0; x.fillRect(px0 - 6 * sy, py0 - 7 * sy, 12 * sy, 12 * sy); }
    // le scritte: profondità, cosa c'è davanti, cosa c'è sopra
    const sf0 = EL[idx(ptx, pty)], depth = sf0 - pf, ahead = c1 ? (L.ug[c1.i] ? 'già scavato' : G.tileAt(c1.tx, c1.ty) === T.WATER ? 'acqua' : G.tileAt(c1.tx, c1.ty) === T.BLD ? 'fondamenta' : (LV.material ? LV.material(c1.tx, c1.ty) : 'terra')) : '';
    const bi = W.bIndex ? W.bIndex[idx(ptx, pty)] : -1, above = bi >= 0 ? (W.BUILDINGS[bi].name || 'una casa') : G.tileAt(ptx, pty) === T.VIA ? 'la strada' : '';
    x.font = `600 ${big ? 12 : 10.5}px 'Saira Condensed', Arial, sans-serif`; x.fillStyle = 'rgba(233,220,188,.85)'; x.textAlign = 'right';
    x.fillText(`${under ? `−${depth.toFixed(1)} m` : 'in superficie'}${ahead ? ` · davanti: ${ahead}` : ''}${above ? ` · sopra: ${above}` : ''}`, CW - 8, 14); x.textAlign = 'left';
    if (big) { x.fillStyle = 'rgba(233,220,188,.55)'; x.fillText('H avanti · J giù · K su · Maiusc+J pozzo · N stanza · V sali', 10, CH - 12); }
  }

  // il segno nella vista dall'alto: la casella che stai per scavare, la polvere, le zolle
  const DIG = { ghost: null, dust: null, parts: [] };
  function digGfx(st, scene, under, t) {
    const p = st.player, L = st.lv; if (!DIG.ghost) {
      DIG.ghost = new THREE.Group(); DIG.ghost.userData.ugKeep = true;
      const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9, 2.4, 1.9)), new THREE.LineBasicMaterial({ color: '#ffd060', transparent: true, opacity: .8 })); fr.position.y = 1.2; DIG.ghost.add(fr);
      const fill = new THREE.Mesh(new THREE.BoxGeometry(1.86, 2.36, 1.86), new THREE.MeshBasicMaterial({ color: '#ffb040', transparent: true, opacity: .08, depthWrite: false })); fill.position.y = 1.2; fill.name = 'pieno'; DIG.ghost.add(fill);
      scene.add(DIG.ghost);
      const geo = new THREE.BoxGeometry(.12, .12, .12); DIG.dust = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#8a6a44' }), 40); DIG.dust.userData.ugKeep = true; DIG.dust.frustumCulled = false; scene.add(DIG.dust);
      for (let k = 0; k < 40; k++) DIG.parts.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    const job = L && L.job, show = under && p.lv.ride === undefined && L && !p.vehicle;
    DIG.ghost.visible = false;
    if (show) {
      const [dx, dy] = LV.dirOf(p.face), [tx, ty] = ti(p.x, p.y), nx = tx + dx, ny = ty + dy;
      if (inb(nx, ny) && !L.ug[idx(nx, ny)] && L.ug[idx(tx, ty)]) {
        const f = L.fl[idx(tx, ty)] + (job && job.what === 'scendi' ? -1.3 : job && job.what === 'sali' ? 1.3 : 0);
        DIG.ghost.visible = true; DIG.ghost.position.set(cen(nx), f, cen(ny));
        const pr = job && /^(avanti|scendi|sali)$/.test(job.what) ? clamp(1 - (job.until - st.clock) / job.dur, 0, 1) : 0, fill = DIG.ghost.getObjectByName('pieno');
        fill.material.opacity = job ? .12 + pr * .4 : .05 + Math.sin(t * 3) * .03; fill.scale.y = job ? Math.max(.02, pr) : 1; fill.position.y = job ? 2.4 - 1.2 * pr : 1.2; fill.material.color.set(job ? '#120e0a' : '#ffb040');
      }
    }
    // zolle che saltano mentre scavi
    const m4 = new THREE.Matrix4(), dt = .016;
    if (job && show && Math.random() < .5) { const P0 = DIG.parts.find(q => q.life <= 0); if (P0) { const a = p.face + (Math.random() - .5) * 1.2, h0 = LV.heightOf(st, p) ?? 0; Object.assign(P0, { x: p.x + Math.cos(p.face) * .9, z: p.y + Math.sin(p.face) * .9, y: h0 + .4 + Math.random() * 1.2, vx: -Math.cos(a) * (1 + Math.random()), vz: -Math.sin(a) * (1 + Math.random()), vy: 1.5 + Math.random() * 2, life: .9, f: h0 }); } }
    DIG.parts.forEach((q, k) => { if (q.life > 0) { q.life -= dt; q.vy -= 9.8 * dt; q.x += q.vx * dt; q.y = Math.max(q.f + .05, q.y + q.vy * dt); q.z += q.vz * dt; } m4.makeTranslation(q.x, q.life > 0 ? q.y : -999, q.z); DIG.dust.setMatrixAt(k, m4); });
    DIG.dust.instanceMatrix.needsUpdate = true; DIG.dust.visible = under;
  }

  // =====================================================================================================================
  // LA GRAFICA (solo nel browser): un gruppo sotto terra e uno in superficie
  // =====================================================================================================================
  const GFX = { scene: null, ug: null, surf: null, people: {}, crates: {}, trains: [], lights: [], chunks: [], mats: {}, stRef: null, t0: 0 };
  const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return GFX.mats[k] || (GFX.mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .9, metalness: 0 }, o || {}))); };
  const glow = (c, i) => mat(c, { emissive: c, emissiveIntensity: i || 1.2, roughness: .5 });
  const bx = (g, w, h, d, m, x, y, z, ry) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); o.position.set(x || 0, y || 0, z || 0); if (ry) o.rotation.y = ry; g.add(o); return o; };
  const cy = (g, r0, r1, h, m, x, y, z, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg || 10), typeof m === 'string' ? mat(m) : m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; };
  const sp = (g, r, m, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), typeof m === 'string' ? mat(m) : m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; };
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; return t; }
  // il cartello della metropolitana: la M bianca sul quadrato rosso, e il nome della stazione
  function signTex(name) { return canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#f2efe6'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8202a'; x.fillRect(4, 4, 56, 56); x.fillStyle = '#fff'; x.font = 'bold 46px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('M', 32, 34); x.fillStyle = '#1a1a1a'; x.font = 'bold 24px Arial'; x.textAlign = 'left'; x.fillText(name.toUpperCase(), 72, 34); }); }
  function ugWall() { return GFX.mats.__piast || (GFX.mats.__piast = (() => { const t = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#d8d4c4'; x.fillRect(0, 0, w, h); for (let j = 0; j < 16; j++) for (let i = 0; i < 8; i++) { x.fillStyle = j > 11 ? '#2a5a8a' : (i + j) % 5 ? '#e4e0d0' : '#ccc8b8'; x.fillRect(i * 8, j * 4, 7, 3); } x.fillStyle = '#c8202a'; x.fillRect(0, 36, 64, 3); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); t.magFilter = THREE.NearestFilter; return t; })()); }
  function mapTex() { return canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#d8c89a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#6a5a3a'; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.stroke(); } x.fillStyle = '#b02a2a'; for (let i = 0; i < 6; i++) x.fillRect(Math.random() * w, Math.random() * h, 5, 5); x.strokeStyle = '#2a4a8a'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h * .7); x.quadraticCurveTo(w * .5, h * .4, w, h * .8); x.stroke(); }); }

  // ---------------- SOTTO TERRA: tutto quello che non cambia ----------------
  function buildUnder() {
    const root = new THREE.Group(); root.name = 'sottosuolo'; root.userData.ugKeep = true;
    // l'acqua delle fogne: una striscia nel mezzo di ogni casella di fogna, raccordata coi vicini
    { const pos = []; const q = (x0, z0, x1, z1, y) => pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = idx(tx, ty); if (TPL.kind[i] !== K.FOGNA) continue; const x = cen(tx), z = cen(ty), y = TPL.fl[i] + .07;
        q(x - .5, z - .5, x + .5, z + .5, y); if (tx + 1 < GW && TPL.kind[i + 1] === K.FOGNA) q(x + .5, z - .5, x + 1.5, z + .5, (y + TPL.fl[i + 1] + .07) / 2); if (ty + 1 < GH && TPL.kind[i + GW] === K.FOGNA) q(x - .5, z + .5, x + .5, z + 1.5, (y + TPL.fl[i + GW] + .07) / 2); }
      if (pos.length) {
        // l'acqua che scorre: increspature e schiuma, la texture scivola piano (uv in coordinate di mondo)
        const uv = []; for (let k = 0; k < pos.length; k += 3) uv.push(pos[k] / 4, pos[k + 2] / 4);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
        const tex = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#24443a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const a = Math.random() * w, b = Math.random() * h; x.fillStyle = i % 5 ? 'rgba(120,170,140,.25)' : 'rgba(220,230,200,.35)'; x.fillRect(a, b, 4 + Math.random() * 8, 1); } x.fillStyle = 'rgba(160,140,90,.3)'; for (let i = 0; i < 8; i++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2); });
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter;
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .35, roughness: .1, metalness: .5 })); root.add(m); GFX.water = m; }
      // i pilastri di mattoni contro le pareti, i tubi, i cordoli delle banchine: istanze, una passata sola
      const pil = [], pipe = [], curb = [];
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = idx(tx, ty); if (TPL.kind[i] !== K.FOGNA) continue; const f = TPL.fl[i];
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy], q) => { const j = idx(tx + dx, ty + dy); if (inb(tx + dx, ty + dy) && TPL.ug[j]) return;
          const wx = cen(tx) + dx * .9, wz = cen(ty) + dy * .9, along = dx ? Math.PI / 2 : 0;   // la x locale corre lungo il muro
          if ((tx * 7 + ty * 3) % 4 === 0) pil.push([wx, f, wz, along]);
          curb.push([cen(tx) + dx * .62, f, cen(ty) + dy * .62, along]);
          if (hash(tx, ty, q) < .35) pipe.push([cen(tx) + dx * .78, f + 1.7 + (q % 2) * .35, cen(ty) + dy * .78, along]); }); }
      const inst = (geo, m0, list, fn) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, m0, list.length), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1); list.forEach((q, k) => { fn(q, V, E); Q.setFromEuler(E); M4.compose(V, Q, S); im.setMatrixAt(k, M4); }); im.receiveShadow = true; root.add(im); };
      inst(new THREE.BoxGeometry(.5, 2.7, .35), mat('#7a3e2a'), pil, ([x0, y0, z0, a], V, E) => { V.set(x0, y0 + 1.35, z0); E.set(0, a, 0); });
      inst(new THREE.BoxGeometry(2.02, .22, .28), mat('#6e6a60'), curb, ([x0, y0, z0, a], V, E) => { V.set(x0, y0 + .11, z0); E.set(0, a, 0); });
      inst(new THREE.CylinderGeometry(.12, .12, 2.02, 8), mat('#5a5e58', { metalness: .5, roughness: .5 }), pipe, ([x0, y0, z0, a], V, E) => { V.set(x0, y0, z0); E.set(0, a, Math.PI / 2); }); }
    // le lampade (accese)
    TPL.lamps.forEach(Lp => { const g = new THREE.Group(); g.position.set(Lp.x, Lp.f, Lp.y); if (Lp.k === 'fuoco') { cy(g, .32, .3, .8, '#3a2e26', 0, -.4, 0); const f = cy(g, 0, .26, .5, glow('#ff7a20', 1.6), 0, .25, 0); f.name = 'fiamma'; } else if (Lp.k === 'neon') bx(g, 1.4, .08, .14, glow(Lp.c, 1.5), 0, 0, 0); else { bx(g, .14, .2, .14, glow(Lp.c, 1.4), 0, 0, 0); cy(g, .01, .01, .6, '#2a2a2a', 0, .4, 0); } addChunk(root, g, Lp.x, Lp.y); });
    // gli arredi di ogni posto
    TPL.rooms.forEach(Rm => { const g = decor(Rm); if (g) addChunk(root, g, Rm.x, Rm.y); });
    // la metropolitana
    if (M.ok) { GFX.metro = buildMetro(); root.add(GFX.metro); }
    return root;
  }
  function addChunk(root, g, x, y) { g.userData.cx = x; g.userData.cy = y; g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } }); root.add(g); GFX.chunks.push(g); }
  function decor(Rm) {
    const g = new THREE.Group(); g.position.set(Rm.x, Rm.f, Rm.y); const w = Rm.w || 8, h = Rm.h || 6, W2 = w / 2 - .5, H2 = h / 2 - .5;
    const stone = '#8a8478', wood = '#6a4a30', dark = '#2a2622', iron = '#3a3a40', conc = '#7a7a74';
    switch (Rm.deco) {
      case 'cripta': {
        for (let i = -W2 + .6; i <= W2 - .4; i += 1.1) for (let k = 0; k < 3; k++) { bx(g, .9, .55, .5, '#1a1612', i, .5 + k * .7, -H2 + .1); sp(g, .14, '#e8e0cc', i - .15, .42 + k * .7, -H2 + .2); sp(g, .14, '#ddd4bc', i + .18, .42 + k * .7, -H2 + .22); }
        for (const s of [-1, 1]) { bx(g, 2, .7, .9, stone, s * 1.6, .35, .4); bx(g, 2.1, .12, 1, '#9a948a', s * 1.6, .76, .4); bx(g, .1, .02, .6, '#c8a040', s * 1.6, .83, .4); }
        bx(g, 1.4, .9, .6, '#9a948a', 0, .45, -H2 + 1.2); for (let k = 0; k < 6; k++) { cy(g, .03, .03, .22, '#f0e6c8', -.5 + k * .2, 1.02, -H2 + 1.2); cy(g, 0, .025, .06, glow('#ffc060', 2), -.5 + k * .2, 1.16, -H2 + 1.2); }
        bx(g, .08, .8, .08, '#c8a040', 0, 1.4, -H2 + 1.2); bx(g, .4, .08, .08, '#c8a040', 0, 1.55, -H2 + 1.2); break; }
      case 'carceri': {
        const cells = Math.max(2, Math.floor(w / 2.2));
        for (let c = 0; c < cells; c++) { const x0 = -w / 2 + .3 + c * (w - .6) / cells, x1 = x0 + (w - .6) / cells;
          for (let x = x0 + .15; x < x1 - .05; x += .22) cy(g, .025, .025, 2.4, iron, x, 1.2, -H2 + 1.6);
          bx(g, .1, 2.4, 1.6, '#5a564e', x1, 1.2, -H2 + .8); bx(g, .7, .3, 1.6, '#4a4030', x0 + .55, .15, -H2 + .8);
          if (c % 2) { const ch = cy(g, .02, .02, .8, iron, x0 + .4, 1.4, -H2 + .1); ch.rotation.z = .3; } else { sp(g, .12, '#e8e0cc', x0 + .6, .35, -H2 + .7); bx(g, .5, .08, .2, '#ddd4bc', x0 + .6, .32, -H2 + .9); } }
        bx(g, 1.2, .08, .6, wood, W2 - .6, .8, H2 - .5); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, .06, .8, .06, wood, W2 - .6 + a * .55, .4, H2 - .5 + b * .25);
        bx(g, .5, .04, .35, '#e8e0cc', W2 - .7, .85, H2 - .5); break; }
      case 'rifugio': {
        for (const s of [-1, 1]) for (let x = -W2 + .5; x <= W2 - .5; x += 1.6) { bx(g, 1.4, .08, .4, wood, x, .45, s * (H2 - .1)); bx(g, .06, .45, .3, iron, x - .6, .22, s * (H2 - .1)); bx(g, .06, .45, .3, iron, x + .6, .22, s * (H2 - .1)); }
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (x, W0, H0) => { x.fillStyle = '#d8d0b8'; x.fillRect(0, 0, W0, H0); x.fillStyle = '#1a1a1a'; x.font = 'bold 34px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RICOVERO', W0 / 2, H0 / 2); }) })); sign.position.set(0, 2, -H2 + .05); g.add(sign);
        for (let k = 0; k < 4; k++) { const m0 = sp(g, .16, '#4a5040', -1.5 + k * 1, 1.4, -H2 + .12); m0.scale.set(1, 1.2, .6); }
        bx(g, 1, .6, .7, '#4a5a3a', W2 - 1, .3, 0); bx(g, .8, .5, .6, '#3a4a32', W2 - 1, .85, 0); break; }
      case 'bunker': {
        bx(g, 2.4, .08, 1.4, wood, 0, .85, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, .08, .85, .08, wood, a * 1.1, .42, b * .6);
        const mp = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ map: mapTex() })); mp.rotation.x = -Math.PI / 2; mp.position.set(0, .9, 0); g.add(mp);
        bx(g, .9, .6, .45, '#4a5040', -W2 + .6, 1, -H2 + .3); for (let k = 0; k < 4; k++) bx(g, .06, .06, .02, glow(k % 2 ? '#30ff60' : '#ffb030', 1.5), -W2 + .35 + k * .18, 1.1, -H2 + .54);
        for (const s of [-1, 1]) { bx(g, .45, .9, .45, wood, s * 1.6, .45, 1); } break; }
      case 'armeria': {
        bx(g, 2.6, 1.6, .25, wood, 0, .9, -H2 + .2); for (let k = 0; k < 6; k++) { const r = bx(g, .08, 1.2, .1, '#2a2622', -1.1 + k * .44, .95, -H2 + .38); r.rotation.z = .08; bx(g, .12, .3, .14, wood, -1.1 + k * .44, .4, -H2 + .38); }
        for (let k = 0; k < 3; k++) bx(g, .8, .4, .5, '#4a5a3a', -1 + k * .9, .2, H2 - .4); break; }
      case 'camerata': {
        for (let k = 0; k < 2; k++) { const x = -1 + k * 2.2; for (const y of [.4, 1.4]) { bx(g, .8, .12, 1.9, '#5a5a3a', x, y, 0); } for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cy(g, .03, .03, 1.7, iron, x + a * .38, .85, b * .9); } break; }
      case 'contrabbando': {
        for (let k = 0; k < 7; k++) { const x = -W2 + .6 + (k % 4) * 1.1, z = -H2 + .5 + Math.floor(k / 4) * .9; bx(g, .9, .7, .7, k % 3 ? '#7a5a34' : '#5a6a4a', x, .35, z); if (k % 2) bx(g, .8, .5, .6, '#6a4a2a', x, .95, z); }
        for (let k = 0; k < 5; k++) bx(g, .25, .12, .4, ['#c83a3a', '#e8e0cc', '#2a5aa8', '#c8a040', '#3a8a5a'][k], -.6 + k * .3, .92, .6);
        bx(g, 1.6, .08, .9, wood, 0, .84, .6); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, .07, .84, .07, wood, a * .7, .42, .6 + b * .35);
        const bt = new THREE.Group(); bt.position.set(W2 - 1.4, 0, H2 - 1); bx(bt, 2.6, .5, 1.1, '#e8e0cc', 0, .25, 0); bx(bt, 2.4, .1, .9, '#2a5a8a', 0, .52, 0); bt.rotation.y = .3; g.add(bt); break; }
      case 'spaccio': {
        cy(g, .9, .9, .06, mat('#1e6a3a'), 0, .82, 0, 18); cy(g, .1, .25, .8, '#3a2a20', 0, .4, 0); for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283; bx(g, .4, .45, .4, '#5a2a2a', Math.cos(a) * 1.3, .22, Math.sin(a) * 1.3); }
        for (let k = 0; k < 6; k++) bx(g, .12, .01, .18, '#f0f0f0', -.4 + k * .16, .86, (k % 2) * .2 - .1).rotation.y = k * .4;
        bx(g, 2.2, .6, .8, '#4a2a4a', -W2 + 1.2, .3, -H2 + .5); bx(g, 2.2, .5, .2, '#4a2a4a', -W2 + 1.2, .8, -H2 + .2);
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .45), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (x, W0, H0) => { x.fillStyle = '#100810'; x.fillRect(0, 0, W0, H0); x.fillStyle = '#ff4fa3'; x.font = 'italic bold 36px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('BISCA', W0 / 2, H0 / 2); }) })); sg.position.set(0, 2.1, -H2 + .05); g.add(sg); break; }
      case 'mercato': {
        const cols = ['#c83a3a', '#e8c040', '#3a7ac8', '#3aa86a'];
        for (let k = 0; k < 4; k++) { const sx = (k % 2 ? 1 : -1) * (W2 - 1.6), sz = (k < 2 ? -1 : 1) * (H2 - 1.4); const s = new THREE.Group(); s.position.set(sx, 0, sz); bx(s, 2.2, .08, 1, wood, 0, .85, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(s, .07, 1.9, .07, wood, a * 1.05, .95, b * .45); const aw = bx(s, 2.5, .05, 1.3, cols[k], 0, 1.95, 0); aw.rotation.x = .18;
          for (let i = 0; i < 6; i++) bx(s, .22, .18 + (i % 3) * .06, .22, ['#d8d0c0', '#6a4a2a', '#2a2a2e', '#c8a040', '#8a2a2a', '#3a5a3a'][(i + k) % 6], -.8 + i * .32, .97, (i % 2) * .2 - .1); g.add(s); }
        for (let x = -W2; x <= W2; x += 1.4) sp(g, .07, glow('#ffd890', 2), x, 2.4 + Math.sin(x) * .15, 0); break; }
      case 'topi': {
        for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(1, 1.3, 4), mat(['#6a6a4a', '#5a4a3a', '#4a5a5a', '#7a5a3a'][k])); t.position.set(-W2 + 1.2 + k * 2.1, .65, -H2 + 1.2 + (k % 2) * .4); t.rotation.y = k * .7 + .785; g.add(t); }
        for (let k = 0; k < 5; k++) bx(g, .8, .12, 1.8, ['#8a7a5a', '#6a6a6a', '#7a5a4a'][k % 3], -W2 + 1 + k * 1.5, .06, H2 - 1.2).rotation.y = (k - 2) * .15;
        const line = cy(g, .01, .01, w - 1, '#d8d0c0', 0, 1.9, 0); line.rotation.z = Math.PI / 2; for (let k = 0; k < 6; k++) bx(g, .4, .5, .02, ['#c8c0b0', '#6a8aa8', '#a85a5a'][k % 3], -W2 + 1 + k * 1.1, 1.62, 0);
        break; }
      case 'metro': {
        const a = Math.atan2(Rm.uy, Rm.ux); g.rotation.y = -a;   // x locale = lungo i binari
        bx(g, 21, .04, .25, glow('#e8c020', .4), 0, .03, 2.55); bx(g, 21, .04, .25, glow('#e8c020', .4), 0, .03, -2.55);
        // le pareti della stazione oltre i binari e in fondo: piani rivolti verso dentro (quella verso la camera non si vede)
        { const tw = new THREE.MeshStandardMaterial({ map: ugWall(), roughness: .9 }); const wall = (w0, h0, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w0, h0), tw); m.position.set(x, h0 / 2 - 1.2, z); m.rotation.y = ry; g.add(m); };
          wall(25, 5.6, 0, -6.2, 0); wall(25, 5.6, 0, 6.2, Math.PI); }
        for (const x of [-7, 0, 7]) { cy(g, .3, .3, 4.2, '#c8c4b4', x, 2.1, 0); for (const z of [-1, 1]) { const sn = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), new THREE.MeshBasicMaterial({ map: signTex(Rm.name || '') })); sn.position.set(x, 2.6, z * .32); sn.rotation.y = z > 0 ? 0 : Math.PI; g.add(sn); } }
        for (const x of [-4, 4]) for (const z of [-1, 1]) { bx(g, 1.6, .08, .45, '#c83a2a', x, .45, z * 1.5); bx(g, .1, .45, .35, iron, x - .7, .22, z * 1.5); bx(g, .1, .45, .35, iron, x + .7, .22, z * 1.5); }
        // i letti dei binari lungo la banchina, coi binari
        for (const z of [-1, 1]) { bx(g, 24, .1, 2.6, '#2a2622', 0, -1.1, z * 4.4); for (const o of [-.72, .72]) bx(g, 24, .1, .1, mat('#9aa0a8', { metalness: .7, roughness: .35 }), 0, -1, z * 4.4 + o); for (let x = -11.5; x <= 11.5; x += .8) bx(g, .25, .08, 2, '#4a3a2a', x, -1.08, z * 4.4); bx(g, 24, 1.05, .2, '#c8c4b4', 0, -.52, z * 2.95); }
        break; }
      default: return null;
    }
    return g;
  }
  // le gallerie: due tubi che si avvolgono per mezzo giro, i binari, i passaggi di servizio a pioli (i «gradini» dell'elica)
  function buildMetro() {
    const g = new THREE.Group(), cut = 12.5 / M.L, rail = mat('#9aa0a8', { metalness: .7, roughness: .35 }); GFX.tubes = [];
    for (const j of [0, 1]) {
      const pts = []; for (let k = 0; k <= 160; k++) { const t = cut + (1 - 2 * cut) * k / 160, q = trackAt(j, t); pts.push(new THREE.Vector3(q.x, q.h + 1.4, q.y)); }
      // il cemento della galleria con gli anelli dei conci: le fasce chiare si accendono appena (si legge la forma anche al buio)
      const tex = canvasTex(64, 32, (x, w, h) => { x.fillStyle = j ? '#4a4c50' : '#504c46'; x.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.06)'; x.fillRect(Math.random() * w, Math.random() * h, 3, 1); } x.fillStyle = j ? '#8ab0d8' : '#d8b080'; x.fillRect(0, 0, 3, h); x.fillStyle = 'rgba(20,20,20,.6)'; x.fillRect(4, 0, 1, h); x.fillRect(32, 0, 1, h); });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(Math.round(M.L / 6), 2);
      const wall = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .45, side: THREE.BackSide, roughness: 1, transparent: true, opacity: 1 });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 2.6, 12, false), wall); g.add(tube); GFX.tubes.push(tube);
      // i binari e le luci di galleria
      const r0 = [], r1 = []; for (let k = 0; k <= 200; k++) { const t = -cut * .9 + (1 + 1.8 * cut) * k / 200, q = trackAt(j, t), q2 = trackAt(j, t + .001), dx = q2.x - q.x, dy = q2.y - q.y, d = Math.hypot(dx, dy) || 1, px = -dy / d, py = dx / d; r0.push(new THREE.Vector3(q.x + px * .72, q.h + .06, q.y + py * .72)); r1.push(new THREE.Vector3(q.x - px * .72, q.h + .06, q.y - py * .72)); }
      for (const rr of [r0, r1]) g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rr), 300, .06, 4, false), rail));
      for (let k = 1; k < 30; k++) { const t = cut + (1 - 2 * cut) * k / 30, q = trackAt(j, t); bx(g, .5, .12, .5, glow(j ? '#9ad0ff' : '#ffe0a0', 1.4), q.x, q.h + 3.6, q.y); }
    }
    // i pioli dell'elica: passaggi di servizio tra le due gallerie, a due colori per metà come le basi del DNA
    const PAIR = [['#d8503a', '#3a8ad8'], ['#e8c03a', '#3ac87a']];
    for (let k = 1; k < 12; k++) {
      const t = k / 12, a = trackAt(0, t), b = trackAt(1, t), A = new THREE.Vector3(a.x, a.h + 1.4, a.y), Bv = new THREE.Vector3(b.x, b.h + 1.4, b.y), mid = A.clone().add(Bv).multiplyScalar(.5), len = A.distanceTo(Bv) - 5;
      if (len <= .5) continue; const dir = Bv.clone().sub(A).normalize(), cols = PAIR[k % 2];
      [[A, cols[0]], [Bv, cols[1]]].forEach(([E, c]) => { const half = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, len / 2, 10, 1, true), mat(c, { emissive: c, emissiveIntensity: .35, side: THREE.DoubleSide })); const at = mid.clone().add(E.clone().sub(mid).normalize().multiplyScalar(len / 4)); half.position.copy(at); half.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(half); });
    }
    // i treni
    GFX.trains = [0, 1].map(j => { const t = trainMesh(j); g.add(t); return t; });
    return g;
  }
  function trainMesh(j) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const cream = '#e8e0cc', red = j ? '#2a6ac8' : '#c8402a', win = glow('#fff2c0', 1.1), dark = '#1a1a1e';
    for (const c of [-1, 1]) { const car = new THREE.Group(); car.position.z = c * 3.9; body.add(car);
      bx(car, 2.6, .12, 7.5, '#4a4a4e', 0, .3, 0); for (const s of [-1, 1]) { bx(car, .1, 2.4, 7.5, cream, s * 1.25, 1.55, 0); bx(car, .12, .35, 7.52, red, s * 1.26, .7, 0); }
      for (const z of [-1, 1]) bx(car, 2.6, 2.4, .1, cream, 0, 1.55, z * 3.7);
      const roof = bx(car, 2.62, .14, 7.52, red, 0, 2.8, 0); roof.name = 'tetto';
      for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) bx(car, .04, .7, .8, win, s * 1.31, 1.75, k * 1.05);
      for (const s of [-1, 1]) bx(car, .05, 1.9, 1.1, dark, s * 1.31, 1.25, 0);
      for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) bx(car, .45, .45, .9, '#7a2a2a', s * .9, .55, k * 1.4);
      bx(car, 2.3, .4, 7, dark, 0, .1, 0); bx(car, .9, .04, 6.8, glow('#fff2c0', .9), 0, 2.72, 0).name = 'tetto'; }
    for (const z of [-1, 1]) { bx(body, 1.8, .9, .05, win, 0, 1.9, z * 7.68); for (const x of [-.8, .8]) bx(body, .2, .14, .06, glow(z > 0 ? '#ffffff' : '#ff2020', 2), x, .9, z * 7.7); }
    g.traverse(o => { if (o.isMesh) o.castShadow = false; });
    return g;
  }

  // ---------------- IN SUPERFICIE: tombini, grate, ingressi della metropolitana ----------------
  function buildSurface(st, R) {
    const g = new THREE.Group(); g.name = 'sottosuolo_sopra'; const L = LV.S(st);
    const tomb = L.portals.filter(P => P.kind === 'tombino'), iron = mat('#2e2e30', { metalness: .5, roughness: .6 });
    if (tomb.length) {
      const tex = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#3a3a3c'; x.beginPath(); x.arc(32, 32, 31, 0, 6.3); x.fill(); x.strokeStyle = '#1e1e20'; x.lineWidth = 3; for (let i = 8; i < 60; i += 8) { x.beginPath(); x.moveTo(i, 4); x.lineTo(i, 60); x.stroke(); } x.fillStyle = '#505052'; x.font = 'bold 10px Arial'; x.textAlign = 'center'; x.fillText('S.P.Q.', 32, 36); });
      const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.42, .42, .05, 16), new THREE.MeshStandardMaterial({ map: tex, metalness: .5, roughness: .6 }), tomb.length), m4 = new THREE.Matrix4();
      tomb.forEach((P, k) => { const x = cen(P.s[0]), z = cen(P.s[1]); m4.makeTranslation(x, R.groundH(x, z) + .03, z); im.setMatrixAt(k, m4); }); im.receiveShadow = true; g.add(im);
    }
    L.portals.filter(P => P.kind === 'grata').forEach(P => { const x = cen(P.s[0]), z = cen(P.s[1]), y = R.groundH(x, z); const q = new THREE.Group(); q.position.set(x, y, z); bx(q, 1.1, .05, .8, '#141414', 0, .01, 0); for (let i = -4; i <= 4; i++) bx(q, .05, .06, .8, iron, i * .12, .04, 0); g.add(q); });
    L.portals.filter(P => P.kind === 'scala').forEach(P => {
      const x = cen(P.s[0]), z = cen(P.s[1]), y = R.groundH(x, z), S = P.metro === 'sud' ? M.A : M.B, a = Math.atan2(S.y - z, S.x - x), q = new THREE.Group(); q.position.set(x, y, z); q.rotation.y = -a;
      bx(q, 2.6, .04, 1.7, '#060606', 0, .02, 0); for (let k = 0; k < 4; k++) bx(q, .5, .02, 1.5, '#5a5a56', -.9 + k * .5, -.1 - k * .25, 0);
      for (const s of [-1, 1]) { bx(q, 2.7, .06, .06, mat('#9aa0a8', { metalness: .6 }), 0, .95, s * .9); for (const xx of [-1.3, 0, 1.3]) bx(q, .06, .95, .06, mat('#9aa0a8', { metalness: .6 }), xx, .48, s * .9); }
      bx(q, .06, .95, 1.8, mat('#9aa0a8', { metalness: .6 }), -1.33, .48, 0);
      const tot = new THREE.Group(); tot.position.set(-1.8, 0, 1.1); cy(tot, .07, .07, 2.6, '#3a3a40', 0, 1.3, 0); const sn = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .55), new THREE.MeshBasicMaterial({ map: signTex(S.name), side: THREE.DoubleSide })); sn.position.set(0, 2.75, 0); tot.add(sn); bx(tot, .5, .5, .5, glow('#c8202a', .8), 0, 3.3, 0); q.add(tot);
      g.add(q);
    });
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  // ---------------- OGNI FOTOGRAMMA ----------------
  function gfx(st, R) {
    const scene = R.__models.scene, p = st.player, L = st.lv; if (!L) return;
    if (GFX.scene !== scene || GFX.stRef !== st) {
      if (GFX.scene === scene) { [GFX.surf].concat(Object.values(GFX.people), Object.values(GFX.crates)).forEach(o => o && o.parent && o.parent.remove(o)); }
      if (GFX.scene !== scene) { GFX.chunks = []; GFX.ug = buildUnder(); scene.add(GFX.ug); GFX.lights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight('#ffb060', 0, 22, 1.2); l.userData.ugKeep = true; scene.add(l); return l; }); }
      GFX.scene = scene; GFX.stRef = st; GFX.people = {}; GFX.crates = {};
      GFX.surf = buildSurface(st, R); scene.add(GFX.surf);
    }
    const under = !!(p.lv && p.lv.k === 'ug'), t = performance.now() / 1000, dt = Math.min(.1, t - (GFX.t0 || t)); GFX.t0 = t;
    GFX.ug.visible = under; GFX.lights.forEach(l => { l.visible = under; });
    // le gallerie si vedono dalle banchine e dal treno, non dalle fogne (passano sotto, più in basso)
    if (GFX.metro) GFX.metro.visible = under && M.ok && (p.lv.ride !== undefined || Math.hypot(p.x - M.A.x, p.y - M.A.y) < 34 || Math.hypot(p.x - M.B.x, p.y - M.B.y) < 34);
    if (!under) { if (GFX.surf) GFX.surf.visible = true; Object.values(GFX.people).forEach(g => { g.visible = false; }); Object.values(GFX.crates).forEach(g => { g.visible = false; }); return; }
    // sul treno: si toglie il tetto della carrozza e si sbiadisce l'altra galleria (passa sopra o sotto)
    const ride = p.lv.ride; GFX.trains.forEach((m, j) => m.traverse(o => { if (o.name === 'tetto') o.visible = ride !== j; }));
    (GFX.tubes || []).forEach((tb, j) => { const o = ride !== undefined && ride !== j ? .12 : 1; tb.material.opacity = o; tb.material.depthWrite = o > .5; });
    GFX.chunks.forEach(c => { c.visible = Math.hypot(c.userData.cx - p.x, c.userData.cy - p.y) < 95; });
    // l'acqua che luccica, i fuochi
    if (GFX.water) { const mp = GFX.water.material.map; mp.offset.x = (t * .05) % 1; mp.offset.y = (t * .11) % 1; GFX.water.material.emissiveIntensity = .3 + Math.sin(t * 1.3) * .06; }
    GFX.chunks.forEach(c => { if (!c.visible) return; c.traverse(o => { if (o.name === 'fiamma') { o.scale.y = .8 + Math.sin(t * 11 + c.userData.cx) * .25; o.scale.x = o.scale.z = .9 + Math.sin(t * 17) * .08; } }); });
    // i treni
    GFX.trains.forEach((m, j) => { const tr = train(st, j); if (!tr) return; m.position.set(tr.x, tr.h, tr.y); m.rotation.set(0, Math.PI / 2 - tr.ang, 0); m.children[0].rotation.x = -tr.pitch; });
    // la gente
    const R0 = S0(st), MD = window.Models;
    R0.folk.forEach(n => {
      let g = GFX.people[n.id]; const near = Math.hypot(n.x - p.x, n.y - p.y) < 70;
      if (!g && near) { g = (MD && MD.charsReady && MD.charsReady() && MD.person(n.look, null)) || fallbackPerson(n.look); g.userData.ugKeep = true; scene.add(g); GFX.people[n.id] = g; }
      if (!g) return; g.visible = near; if (!near) return;
      g.position.set(n.x, LV.floorAt(L, n.x, n.y) - (n.sit ? .35 : 0), n.y); g.rotation.y = Math.PI / 2 - n.face;
      if (g.userData.model && MD && MD.animPerson) MD.animPerson(g, { speed: n.speed }, dt);
    });
    // le casse
    R0.crates.forEach(c => {
      let g = GFX.crates[c.id]; if (!g) { g = crateMesh(c); g.userData.ugKeep = true; scene.add(g); GFX.crates[c.id] = g; g.position.set(c.x, c.f, c.y); }
      g.visible = Math.hypot(c.x - p.x, c.y - p.y) < 70; const lid = g.getObjectByName('coperchio'); if (lid) lid.rotation.x += ((c.open ? -1.2 : 0) - lid.rotation.x) * .15; const gl = g.getObjectByName('bagliore'); if (gl) gl.visible = !c.open;
    });
    // le luci: le quattro lampade più vicine
    const near = TPL.lamps.map(Lp => [Math.hypot(Lp.x - p.x, Lp.y - p.y), Lp]).filter(([d]) => d < 34).sort((a, b) => a[0] - b[0]).slice(0, 4);
    GFX.lights.forEach((l, k) => { const q = near[k]; if (!q) { l.intensity = 0; return; } const Lp = q[1]; l.position.set(Lp.x, Lp.f + .3, Lp.y); l.color.set(Lp.c); l.intensity = (Lp.k === 'fuoco' ? 2.4 + Math.sin(t * 13 + k) * .3 : 2.2) * (1 - q[0] / 45); });
  }
  function fallbackPerson(look) { const g = new THREE.Group(); cy(g, .22, .26, .9, (look && look.bottom) || '#3a3a3a', 0, .45, 0); cy(g, .26, .22, .7, (look && look.top) || '#5a5a5a', 0, 1.25, 0); sp(g, .17, (look && look.skin) || '#c8946a', 0, 1.75, 0); return g; }
  function crateMesh(c) {
    const g = new THREE.Group(), col = c.look === 'militare' ? '#4a5a3a' : c.look === 'reliquiario' ? '#8a6a3a' : c.look === 'schedario' ? '#5a5e66' : '#7a5634';
    bx(g, 1, .55, .6, col, 0, .28, 0); const lid = new THREE.Group(); lid.name = 'coperchio'; lid.position.set(0, .56, -.3); g.add(lid); bx(lid, 1.02, .08, .62, col, 0, .04, .3);
    for (const x of [-.4, .4]) bx(g, .06, .57, .62, '#3a3a40', x, .28, 0); if (c.look === 'reliquiario') bx(g, .1, .14, .04, '#e8c050', 0, .4, .31);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd070', transparent: true, opacity: .55 })); gl.name = 'bagliore'; gl.position.set(0, .8, 0); g.add(gl);
    return g;
  }
  function gfxLoop() {
    try {
      const pv = window.__pv, st = pv && pv.st; if (st && pv.R && pv.R.__models && pv.R.__models.scene) { gfx(st, pv.R); panel(st); sezDraw(st); digGfx(st, pv.R.__models.scene, !!(st.player.lv && st.player.lv.k === 'ug'), performance.now() / 1000); }
    } catch (e) { if (!GFX.err) { GFX.err = 1; console.error('[Sottosuolo gfx]', e); } }
    requestAnimationFrame(gfxLoop);
  }
  if (typeof window !== 'undefined') { const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 250); return; } requestAnimationFrame(gfxLoop); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0); }

  return { TPL, K, S: S0, step, train, trackAt, metroKey, board, buy, sell, shopView, openCrate, pick, find, goal, reach, arrive, freeSpot, findPath, SHOPS, CACHES, GFX, UI, panel, floorAtXY, get CYC() { return CYC; }, get TT() { return TT; }, DW };
})();
if (typeof module !== 'undefined') module.exports = Sottosuolo;
