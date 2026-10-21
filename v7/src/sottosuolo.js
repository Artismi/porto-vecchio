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
  const K = { FOGNA: 3, CRIPTA: 4, CARCERE: 5, BUNKER: 6, METRO: 7, COVO: 8, BANCHINA: 9,   // 9: la banchina, senza pareti (la grafica disegna la stazione)
    // [sotto2] gli strati: cantine delle case di oggi, cisterne, catacombe, la città sepolta, grotte, cunicolo di fuga, miniera, relitto, la cavità di un ritrovamento, il fiume sotterraneo
    CANTINA: 10, CISTERNA: 11, CATACOMBA: 12, SEPOLTA: 13, GROTTA: 14, CUNICOLO: 15, MINIERA: 16, RELITTO: 17, RITROV: 18, FIUME: 19 };
  const O = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const has = id => !O() || !!O().CAT[id];

  // =====================================================================================================================
  // [sotto2] GLI STRATI: sotto un'isola con secoli di storia la terra non è vuota. Per casella e per quota, sempre uguali:
  //   0/−2   le cantine delle case di oggi (volte di mattoni, botti, la scala che sale in casa);
  //   −2/−6  LA CITTÀ SEPOLTA: le case del borgo medievale rase nel Seicento (sotto San Giacomo), le case dell'Ottocento
  //          buttate giù dallo sventramento (sotto la piazza e il corso), le cantine delle case bombardate (sotto i vuoti d'erba
  //          della città); le cisterne; le CATACOMBE sotto il sagrato di San Rocco e sotto San Giacomo (gallerie coi loculi,
  //          la cappella, l'ossario), rilegate alle cripte; il cunicolo di fuga della Rocca spagnola verso il mare;
  //   −6/−14 terra: la grotta con le stalattiti e il fiume sotterraneo della Collina Nera, i ritrovamenti grossi;
  //   −14/−32 roccia: la miniera sotto la cava e sotto la Stazione Nord; sotto il mare, davanti alla calata, il relitto.
  //   Fogne, metropolitana e bunker restano al loro posto. I RITROVAMENTI (in fondo al file) non sono scavati: si trovano scavando.
  // =====================================================================================================================
  const LIGHT = { cantina: '#ffb060', cisterna: '#4fa8b8', catacomba: '#ffa050', cappella: '#ffc070', ossario: '#d8c8a0', sepolta: '#c8a070', grotta: '#7fb0c8', fiume: '#4fa8b8', cunicolo: '#ff9040', miniera: '#ffc080', relitto: '#4f90b8',
    dino: '#d8d0b0', bus: '#ffd890', barca: '#80b0c0', anfore: '#c8a070', monete: '#ffd060', statua: '#d8d8e0', campana: '#c8a040', auto: '#a0a090', partigiani: '#ffb060', regime: '#e8e0c0', bottiglie: '#80c080', cani: '#d8c8a0', ossa: '#d8d0b0' };
  function buildStrati(C) {
    const { ug, fl, kind, portals, rooms, place, lamp, B, sewer } = C;
    const E = (tx, ty) => EL[idx(tx, ty)];
    // [sotto2] le fondamenta di oggi: sotto una casa si scava solo la sua cantina, o più giù di sei metri (catacombe, miniere, grotte)
    let OWN = -9;   // l'edificio di cui si sta scavando il sotto (la chiesa delle sue catacombe): sotto di lui si può
    const DEEP = 6, put = (tx, ty, f, k, force) => { if (!inb(tx, ty)) return false; if (k !== K.CANTINA && G.tileAt(tx, ty) === T.BLD && E(tx, ty) - f < DEEP && W.bIndex[idx(tx, ty)] !== OWN) return false; return C.put(tx, ty, f, k, force); };
    const corridor = (ax, ay, bx, by, fa, fb, k) => {
      const pts = []; let x = ax, y = ay; pts.push([x, y]);
      while (x !== bx) { x += Math.sign(bx - x); pts.push([x, y]); }
      while (y !== by) { y += Math.sign(by - y); pts.push([x, y]); }
      pts.forEach(([tx, ty], q) => { if (G.tileAt(tx, ty) === T.WATER && !ug[idx(tx, ty)]) return; put(tx, ty, fa + (fb - fa) * q / Math.max(1, pts.length - 1), k); });
    };
    const toSewer = (tx, ty, f, k) => { let best = null, bd = 1e9; sewer.forEach(([sx, sy]) => { const d = Math.abs(sx - tx) + Math.abs(sy - ty); if (d < bd) { bd = d; best = [sx, sy]; } }); if (best && bd < 160) corridor(tx, ty, best[0], best[1], f, fl[idx(best[0], best[1])], k); return best; };
    const free = (tx, ty) => inb(tx, ty) && !ug[idx(tx, ty)] && G.tileAt(tx, ty) !== T.WATER;
    const rectFree = (x0, y0, w, h, noBld) => { for (let ty = y0; ty < y0 + h; ty++) for (let tx = x0; tx < x0 + w; tx++) { if (!free(tx, ty)) return false; if (noBld && G.tileAt(tx, ty) === T.BLD) return false; } return true; };
    const minE = (x0, y0, w, h) => { let m = 1e9; for (let ty = y0; ty < y0 + h; ty++) for (let tx = x0; tx < x0 + w; tx++) m = Math.min(m, E(tx, ty)); return m; };
    const taken = (tx, ty) => portals.some(P => P.s[0] === tx && P.s[1] === ty);
    const portal = (k, s, name, ex) => portals.push(Object.assign({ kind: k, s: s.slice(), u: s.slice(), name }, ex || {}));
    // una stanza: le caselle, e la voce in rooms (centro, quota, arredo, misura in caselle) per la grafica e le luci
    const rm = (x0, y0, tw, th, f, k, deco, ex) => { for (let ty = y0; ty < y0 + th; ty++) for (let tx = x0; tx < x0 + tw; tx++) put(tx, ty, f, k, true); const R = Object.assign({ x: cen(x0) + (tw - 1) * TS / 2, y: cen(y0) + (th - 1) * TS / 2, f, deco, w: tw * TS, h: th * TS, x0, y0, tw, th, light: LIGHT[deco] }, ex || {}); rooms.push(R); return R; };
    // una galleria naturale: passa anche sotto l'acqua (il relitto), gradino per gradino
    const tunnel = (ax, ay, bx, by, fa, fb, k) => { const pts = []; let x = ax, y = ay; pts.push([x, y]); while (x !== bx) { x += Math.sign(bx - x); pts.push([x, y]); } while (y !== by) { y += Math.sign(by - y); pts.push([x, y]); } pts.forEach(([tx, ty], q) => put(tx, ty, fa + (fb - fa) * q / Math.max(1, pts.length - 1), k)); return pts; };
    // la grata (o la botola) in superficie: la prima casella calpestabile sopra una casella scavata del posto
    const exitOn = (x0, y0, tw, th, k, name) => { for (let ty = y0; ty < y0 + th; ty++) for (let tx = x0; tx < x0 + tw; tx++) if (ug[idx(tx, ty)] && G.walkT(tx, ty) && !taken(tx, ty)) { portal(k, [tx, ty], name); return [tx, ty]; } return null; };
    const nearWalk = (tx0, ty0, r) => { for (let d = 0; d <= r; d++) for (let j = -d; j <= d; j++) for (let i = -d; i <= d; i++) if (Math.max(Math.abs(i), Math.abs(j)) === d && inb(tx0 + i, ty0 + j) && G.walkT(tx0 + i, ty0 + j) && !taken(tx0 + i, ty0 + j) && !ug[idx(tx0 + i, ty0 + j)]) return [tx0 + i, ty0 + j]; return null; };
    const bld = id => { const bi = B(id); return bi >= 0 ? W.BUILDINGS[bi] : null; };
    const out = { cantine: 0, sepolte: 0, catacombe: 0 };

    // ---------------- 0/−2: LE CANTINE delle case di oggi ----------------
    // una casa su tre, in città, tra quelle col portone: la cantina occupa la pianta meno un bordo, la scala sale al piano terra
    W.BUILDINGS.forEach((b, bi) => {
      if (!b.house || !b.door || b.w < 3 || b.h < 3 || b.shack || W.zone[idx(b.x, b.y)] !== ZC || hash(b.x, b.y, 21) > .34 || out.cantine >= 30) return;
      const ix = b.w >= 5 ? 1 : 0, iy = b.h >= 5 ? 1 : 0, x0 = b.x + ix, y0 = b.y + iy, tw = b.w - 2 * ix, th = b.h - 2 * iy;   // le case strette del borgo: la cantina prende tutta la pianta
      if (!rectFree(x0, y0, tw, th)) return;
      const f = E(b.x + (b.w >> 1), b.y + (b.h >> 1)) - 2.8;
      const R = rm(x0, y0, tw, th, f, K.CANTINA, 'cantina', { bi, seed: hash(b.x, b.y, 22) });
      portals.push({ kind: 'interno', s: [x0 + tw - 1, y0 + th - 1], u: [x0 + tw - 1, y0 + th - 1], bi, name: b.name || 'casa' });
      R.stair = [cen(x0 + tw - 1), cen(y0 + th - 1)]; lamp(R.x, R.y, f + 1.9, '#ffb060', 'lume'); out.cantine++;
    });

    // ---------------- −2/−6: LA CITTÀ SEPOLTA ----------------
    // una casa sepolta: muri perimetrali (le caselle attorno restano terra), dentro due o tre stanze separate da un muro con la porta,
    // la soglia dove stava il portone, in qualcuna il pozzo (una casella più fonda) o il mosaico (lo disegna la grafica)
    const casa = (x0, y0, tw, th, f, stile, name, ex) => {
      if (!rectFree(x0, y0, tw, th, true)) return null;
      const div = tw >= 5, sx = x0 + Math.max(2, Math.floor(tw / 2)), doorY = y0 + Math.floor(th / 2);   // il muro divisorio (solo nelle case larghe), con la porta a metà
      for (let ty = y0; ty < y0 + th; ty++) for (let tx = x0; tx < x0 + tw; tx++) { if (div && tx === sx && ty !== doorY) continue; put(tx, ty, f, K.SEPOLTA, true); }
      const seed = hash(x0, y0, 23), well = seed < .3 ? [x0 + (seed < .15 ? 0 : tw - 1), y0 + (seed * 40 % 1 < .5 ? 0 : th - 1)] : null;
      if (well) fl[idx(well[0], well[1])] = f - 1.2;
      const R = Object.assign({ x: cen(x0) + (tw - 1) * TS / 2, y: cen(y0) + (th - 1) * TS / 2, f, deco: 'sepolta', stile, w: tw * TS, h: th * TS, x0, y0, tw, th, wall: div ? sx : null, door: doorY, well, mosaico: stile === 'ottocento' || stile === 'sventramento' ? seed > .25 : seed > .7, soglia: [x0, doorY], light: LIGHT.sepolta, name, seed }, ex || {});
      rooms.push(R); out.sepolte++; return R;
    };
    const CN = !!W.sets && !!W.FORT;   // [sotto2] la città nuova (?cittanuova): le epoche sono vere, la città sepolta le segue
    if (CN) {
      // ---- IL BORGO RASO NEL 1660 SOTTO LA SPIANATA: i vicoli continuano sotto terra dove sopra c'è il vuoto ----
      // a pettine come il borgo vivo: un vicolo est-ovest largo una casella, a nord e a sud le case a schiera (fronte 6 m, fondo 8 m)
      // col muro comune (una casella di terra fra l'una e l'altra), la soglia sul vicolo; ogni tanto una casa crollata resta terra.
      const SPX = W.FORT.ditch[0] - 48, X0 = Math.ceil(SPX / TS) + 1, X1 = Math.floor(W.FORT.ditch[0] / TS) - 3;
      const lanes = []; let first = null;
      for (let yL = Math.floor(W.FORT.ditch[1] / TS) + 6; yL < Math.floor(W.FORT.ditch[3] / TS) + 2; yL += 12) {
        let m = 1e9; for (let tx = X0; tx <= X1; tx++) if (inb(tx, yL) && G.tileAt(tx, yL) !== T.WATER) m = Math.min(m, E(tx, yL)); if (m > 1e8) continue;
        const f = m - 4.4, lane = []; for (let tx = X0; tx <= X1; tx++) { if (ug[idx(tx, yL)] && kind[idx(tx, yL)] === K.FOGNA && lane.length) { lane.push(tx); continue; }   // la fogna sotto la strada della spianata: il vicolo ci sbuca e prosegue
          if (!free(tx, yL) || G.tileAt(tx, yL) === T.BLD) { if (lane.length > 3) break; lane.length = 0; continue; } lane.push(tx); }
        if (lane.length < 5) continue; lane.forEach(tx => { if (kind[idx(tx, yL)] !== K.FOGNA) put(tx, yL, f, K.SEPOLTA, true); });
        const Rl = { x: cen((lane[0] + lane[lane.length - 1]) / 2), y: cen(yL), f, deco: 'vicolo_sepolto', w: lane.length * TS, h: TS, x0: lane[0], y0: yL, tw: lane.length, th: 1, light: LIGHT.sepolta, name: 'Il borgo sepolto' }; rooms.push(Rl);
        let nh = 0;
        for (let x = lane[0]; x + 3 <= lane[lane.length - 1] + 1; x += 4) for (const sd of [-1, 1]) {
          if (hash(x, yL + sd, 51) < .22) continue;   // crollata: resta terra
          const y0 = sd < 0 ? yL - 5 : yL + 2, R = casa(x, y0, 3, 4, f + (hash(x, sd, 52) - .5) * .3, 'borgo', 'Il borgo sepolto', { lane: yL, side: sd }); if (!R) continue;
          const dx = x + 1, dy = yL + sd; put(dx, dy, f, K.SEPOLTA, true); R.soglia = [dx, dy]; R.door = dy; nh++;
          if (nh % 3 === 1) lamp(R.x, R.y, R.f + 1.6, '#c8a070', 'lume');
        }
        lanes.push({ yL, lane, f, R: Rl }); if (!first) first = Rl;
      }
      // il vicolo nord-sud che li cuce, sul bordo dove il borgo è stato tagliato; le grate sulla spianata; la fogna
      lanes.forEach((q, k) => { if (k) corridor(q.lane[0], lanes[k - 1].yL, q.lane[0], q.yL, lanes[k - 1].f, q.f, K.SEPOLTA);
        if (k % 2 === 0) { const ex = exitOn(q.lane[2], q.yL, q.lane.length - 4, 1, 'grata', 'Il borgo sepolto'); if (!ex) { const n2 = nearWalk(q.lane[q.lane.length >> 1], q.yL, 3); if (n2) { corridor(q.lane[q.lane.length >> 1], q.yL, n2[0], n2[1], q.f, E(n2[0], n2[1]) - 3, K.SEPOLTA); portal('grata', n2, 'Il borgo sepolto'); } } }
        lamp(cen(q.lane[1]), cen(q.yL), q.f + 1.7, '#ffa050', 'torcia'); });
      if (lanes.length) { const q = lanes[lanes.length >> 1]; toSewer(q.lane[0], q.yL, q.f, K.SEPOLTA); place('borgo_sepolto', 'Il borgo sepolto (raso nel 1660)', first.x, first.y, 10, 'sepolta'); }
      // ---- LE CASE DELLO SVENTRAMENTO (1932) SOTTO LA VIA DELLA VITTORIA: cantine e pianterreni del borgo tagliato ----
      // a destra e a sinistra della fogna, case di 6×4 m, ciascuna con la sua porta sulla fogna (il vecchio vicolo)
      const vt = (W.roads || []).find(r => r.id === 'vittoria') || (W.roads || []).find(r => r.era === 'E4');
      if (vt && vt.pts && vt.pts.length > 1) {
        const a0 = vt.pts[0], a1 = vt.pts[vt.pts.length - 1], Lv = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), ux = (a1[0] - a0[0]) / Lv, uy = (a1[1] - a0[1]) / Lv;
        let n = 0, firstV = null;
        for (let s2 = 14; s2 < Lv - 6 && n < 14; s2 += 9) for (const sd of [-1, 1]) {
          if (hash(Math.round(s2), sd, 53) < .2) continue;
          const cx = a0[0] + ux * s2 - uy * sd * 3.6, cy = a0[1] + uy * s2 + ux * sd * 3.6, [tx, ty] = ti(cx, cy), x0 = tx - 1, y0 = ty - (sd < 0 ? 1 : 0);
          if (!inb(tx, ty) || W.zone[idx(tx, ty)] !== ZC) continue;
          const f = minE(x0, y0, 3, 2) - 3.9, R = casa(x0, y0, 3, 2, f, 'sventramento', 'Le case dello sventramento', { side: sd }); if (!R) continue; n++;
          toSewer(x0 + 1, sd < 0 ? y0 + 1 : y0, f, K.SEPOLTA); if (n % 3 === 1) lamp(R.x, R.y, f + 1.5, '#d8b080', 'lume');
          if (!firstV) firstV = R;
        }
        if (firstV) { exitOn(firstV.x0, firstV.y0, firstV.tw, firstV.th, 'grata', 'Le case dello sventramento'); place('sventramento', 'Le case dello sventramento (1932)', firstV.x, firstV.y, 9, 'sepolta'); }
      }
    } else {
    // il borgo medievale raso nel Seicento (le caselle BORGO, dove oggi non c'è una casa): vicoli e case di pietra a −4,4
    const MF = W.MF || {}, borgo = []; let prev = null;
    if (W.feat && MF.BORGO) {
      for (let ty = 140; ty < 210; ty += 5) for (let tx = 505; tx < 590; tx += 6) {
        if (!inb(tx, ty) || !(W.feat[idx(tx, ty)] & MF.BORGO) || hash(tx, ty, 24) > .55) continue;
        const tw = 4 + Math.floor(hash(tx, ty, 25) * 2), th = 3 + Math.floor(hash(tx, ty, 26) * 2), f = minE(tx, ty, tw, th) - 4.4;
        const R = casa(tx, ty, tw, th, f, 'borgo', 'Il borgo sepolto'); if (!R) continue; borgo.push(R);
        // il vicolo sepolto: dalla soglia di questa casa a quella di prima, se è vicina
        if (prev && Math.abs(prev.x0 - tx) + Math.abs(prev.y0 - ty) < 14) corridor(R.x0, R.door, prev.x0, prev.door, f, prev.f, K.SEPOLTA);
        prev = R;
      }
      borgo.forEach((R, k) => { if (k % 2 === 0) exitOn(R.x0, R.y0, R.tw, R.th, 'grata', 'Il borgo sepolto'); if (k % 3 === 0) lamp(R.x, R.y, R.f + 1.6, '#c8a070', 'lume'); });
      if (borgo.length) { toSewer(borgo[0].x0, borgo[0].door, borgo[0].f, K.SEPOLTA); place('borgo_sepolto', 'Il borgo sepolto', borgo[0].x, borgo[0].y, 9, 'sepolta'); }
    }
    // lo sventramento dell'Ottocento: sotto il corso e la piazza, le case buttate giù per fare largo (intonaci, mosaici)
    const pz = G.PLACES.piazza; if (pz) {
      const [px, py] = ti(pz.x, pz.y); let n = 0;
      for (let r = 6; r < 22 && n < 6; r += 3) for (let a = 0; a < 6.283 && n < 6; a += .9) {
        const tx = px + Math.round(Math.cos(a) * r), ty = py + Math.round(Math.sin(a) * r * .7); if (!inb(tx, ty) || W.zone[idx(tx, ty)] !== ZC || hash(tx, ty, 27) > .6) continue;
        const v = G.tileAt(tx, ty); if (v !== T.PIAZZA && v !== T.VIA && v !== T.WALK && v !== T.COB) continue;
        const tw = 4 + Math.floor(hash(tx, ty, 28) * 2), th = 3, f = minE(tx, ty, tw, th) - 3.8, R = casa(tx, ty, tw, th, f, 'ottocento', 'Le case dello sventramento'); if (!R) continue; n++;
        toSewer(tx, ty + 1, f, K.SEPOLTA); exitOn(tx, ty, tw, th, 'grata', 'Le case dello sventramento'); lamp(R.x, R.y, f + 1.5, '#c8a070', 'lume');
        if (n === 1) place('sventramento', 'Le case dello sventramento', R.x, R.y, 8, 'sepolta');
      }
    }
    }
    // i vuoti delle bombe: dove in città oggi c'è erba o terra, sotto restano le cantine delle case saltate (macerie, una stufa)
    { let n = 0; for (let ty = 60; ty < GH - 60 && n < 8; ty += 7) for (let tx = 540; tx < 800 && n < 8; tx += 7) {
        if (W.zone[idx(tx, ty)] !== ZC || hash(tx, ty, 29) > .5) continue; const v = G.tileAt(tx, ty); if (v !== T.GRASS && v !== T.DIRT && v !== T.SHRUB) continue;
        const f = minE(tx, ty, 3, 3) - 3.2, R = casa(tx, ty, 3, 3, f, 'bombe', 'Una cantina bombardata'); if (!R) continue; n++;
        toSewer(tx + 1, ty, f, K.SEPOLTA); exitOn(tx, ty, 3, 3, 'botola', 'Cantina bombardata'); } }

    // ---------------- −2/−6: LE CISTERNE e il CUNICOLO DI FUGA della Rocca ----------------
    const fo = G.PLACES.fontana; if (fo) { const [fx, fy] = ti(fo.x, fo.y); for (const [ox, oy] of [[1, -1], [-4, -1], [1, 2]]) { const x0 = fx + ox, y0 = fy + oy; if (!rectFree(x0, y0, 4, 3, true)) continue;
      const f = minE(x0, y0, 4, 3) - 5.2, R = rm(x0, y0, 4, 3, f, K.CISTERNA, 'cisterna', { stile: 'ottocento' }); toSewer(x0, y0 + 1, f, K.CISTERNA); exitOn(x0, y0, 4, 3, 'grata', 'La cisterna della fontana');
      place('cisterna', 'La cisterna della fontana', R.x, R.y, 6, 'cisterna'); lamp(R.x, R.y, f + .6, '#4fa8b8', 'acqua'); break; } }
    const rocca = bld('rocca'); if (rocca) {
      const bi = B('rocca'), cx = rocca.x + (rocca.w >> 1), cy = rocca.y + (rocca.h >> 1), f = E(cx, cy) - 6.5;
      const R = rm(cx - 2, cy - 1, 5, 4, f, K.CISTERNA, 'cisterna', { stile: 'spagnola', name: 'La cisterna della Rocca' }); place('cisterna_rocca', 'La cisterna della Rocca', R.x, R.y, 6, 'cisterna'); lamp(R.x, R.y, f + .6, '#4fa8b8', 'acqua');
      if (rocca.door) portals.push({ kind: 'interno', s: [cx + 2, cy + 2], u: [cx + 2, cy + 2], bi, name: rocca.name });
      // il cunicolo di fuga: dalla cisterna verso il mare più vicino, sbuca con una botola sulla riva
      let end = null, bd = 1e9; for (let r = 4; r < 40 && !end; r++) for (let a = 0; a < 6.283; a += .25) { const tx = cx + Math.round(Math.cos(a) * r), ty = cy + Math.round(Math.sin(a) * r); if (!inb(tx, ty) || G.tileAt(tx, ty) !== T.WATER) continue; const d = Math.hypot(tx - cx, ty - cy); if (d < bd) { bd = d; end = [tx, ty]; } }
      if (end) { const ex = nearWalk(end[0], end[1], 3); if (ex) { const pts = tunnel(cx - 2, cy + 1, ex[0], ex[1], f, E(ex[0], ex[1]) - 3.2, K.CUNICOLO); portal('botola', ex, 'Il cunicolo della Rocca'); for (let k = 3; k < pts.length - 2; k += 6) { const [tx, ty] = pts[k]; lamp(cen(tx), cen(ty), fl[idx(tx, ty)] + 1.7, '#ff9040', 'torcia'); } place('cunicolo', 'Il cunicolo di fuga della Rocca', cen(pts[Math.floor(pts.length / 2)][0]), cen(pts[Math.floor(pts.length / 2)][1]), 7, 'cunicolo'); } }
    }

    // ---------------- −6/−7: LE CATACOMBE sotto il sagrato di San Rocco e sotto San Giacomo ----------------
    // un pettine di gallerie larghe una casella, i loculi nelle pareti (li disegna la grafica), in fondo la cappella, di lato l'ossario
    const catacomba = (id, name, bid, depth, len, exitKind) => {
      const b = bld(bid); if (!b || !b.door) return; OWN = B(bid);
      const [dx0, dy0] = b.door, cxb = b.x + (b.w >> 1), cyb = b.y + (b.h >> 1), ox = Math.sign(dx0 - cxb) * (dx0 < b.x || dx0 >= b.x + b.w ? 1 : 0), oy = Math.sign(dy0 - cyb) * (dy0 < b.y || dy0 >= b.y + b.h ? 1 : 0);
      const u0 = [ox || 0, ox ? 0 : (oy || 1)], land = ([ux, uy]) => { let n = 0; for (let a = 1; a <= len + 4; a++) for (let l = -5; l <= 3; l++) { const tx = dx0 + ux * a - uy * l, ty = dy0 + uy * a + ux * l; if (inb(tx, ty) && G.tileAt(tx, ty) !== T.WATER && !ug[idx(tx, ty)]) n++; } return n; };   // terra vergine: non sotto il mare, non dentro un posto che c'è già
      const [ux, uy] = [u0, [-u0[0], -u0[1]], [-u0[1], u0[0]], [u0[1], -u0[0]]].map(d => [d, land(d)]).sort((p0, p1) => p1[1] - p0[1] || 0)[0][0], nx = -uy, ny = ux, f = E(dx0, dy0) - depth;   // u: fuori dalla porta (o dove c'è terra: mai sotto il mare), n: di lato
      const at = (a, l) => [dx0 + ux * a + nx * l, dy0 + uy * a + ny * l];
      const gal = (a0, a1, l) => { for (let a = a0; a <= a1; a++) { const [tx, ty] = at(a, l); if (free(tx, ty) || ug[idx(tx, ty)]) put(tx, ty, f, K.CATACOMBA); } };
      gal(1, len, 0); gal(2, len - 1, 2); gal(2, len - 1, -2); gal(2, len - 1, 3); gal(2, len - 1, -3);   // la galleria di mezzo e le due laterali (larghe due)
      for (const a of [2, len - 1]) for (let l = -3; l <= 3; l++) { const [tx, ty] = at(a, l); if (free(tx, ty)) put(tx, ty, f, K.CATACOMBA); }   // le traverse
      // la cappella in fondo (3×3), l'ossario di lato
      const [cx1, cy1] = at(len + 2, 0), capp = rm(cx1 - 1, cy1 - 1, 3, 3, f, K.CATACOMBA, 'cappella', { name });
      corridor(at(len, 0)[0], at(len, 0)[1], capp.x0 + 1, capp.y0 + 1, f, f, K.CATACOMBA);
      const [ox1, oy1] = at(Math.floor(len / 2), -5), oss = rm(ox1 - (ux ? 1 : 0), oy1 - (uy ? 1 : 0), 2, 2, f, K.CATACOMBA, 'ossario', { name }); corridor(at(Math.floor(len / 2), -3)[0], at(Math.floor(len / 2), -3)[1], oss.x0, oss.y0, f, f, K.CATACOMBA);
      // rilegate alla cripta che c'è già (sotto la chiesa), e su, per una grata del sagrato o una botola
      const cr = rooms.find(R => R.deco === 'cripta' && R.bi === B(bid)); if (cr) corridor(at(1, 0)[0], at(1, 0)[1], cr.x0 + (cr.tw >> 1), cr.y0 + cr.th - 1, f, cr.f, K.CATACOMBA);
      let ex = null; for (let a = 2; a <= len && !ex; a++) { const [tx, ty] = at(a, 0); if (ug[idx(tx, ty)] && G.walkT(tx, ty) && !taken(tx, ty)) ex = [tx, ty]; } if (ex) portal(exitKind, ex, name);
      if (!ex) { const n2 = nearWalk(dx0, dy0, 6); if (n2) { const [sx1, sy1] = at(1, 0); corridor(sx1, sy1, n2[0], n2[1], f, f, K.CATACOMBA); portal(exitKind, n2, name); ex = n2; } }   // [sotto2] se la galleria gira verso la chiesa: la scala scende accanto alla porta
      if (!ex) ex = exitOn(Math.min(...[at(1, -3), at(len, 3)].map(q => q[0])), Math.min(...[at(1, -3), at(len, 3)].map(q => q[1])), Math.abs(ux) * len + 7, Math.abs(uy) * len + 7, exitKind, name);
      // (il portale della prima uscita lo mette il ciclo qui sopra)
      const [mx, my] = at(Math.floor(len / 2), 0); place(id, name, cen(mx), cen(my), 10, 'catacomba');
      rooms.push({ x: cen(mx), y: cen(my), f, deco: 'catacomba', w: len * TS, h: 7 * TS, name, light: LIGHT.catacomba, ux, uy, len });
      for (let a = 3; a < len; a += 4) { const [tx, ty] = at(a, 0); lamp(cen(tx), cen(ty), f + 1.6, '#ffa050', 'torcia'); } lamp(capp.x, capp.y, f + 1.2, '#ffc070', 'lume'); out.catacombe++; OWN = -9;
    };
    catacomba('catacombe', 'Le catacombe di San Rocco', 'chiesa', 7, 9, 'grata');
    catacomba('catacombe_sg', 'Le catacombe di San Giacomo', 'chiesa_sg', 6.5, 7, 'botola');
    catacomba('catacombe_conv', 'Le catacombe del convento', 'santuario', 7.5, 7, 'grata');   // [sotto2] i frati del Santuario: sotto il chiostro, rilegate alla cripta dei marinai

    // ---------------- −6/−14: LA GROTTA con le stalattiti e IL FIUME SOTTERRANEO della Collina Nera ----------------
    const gr = G.PLACES.grotta, sp = G.PLACES.spiaggia; if (gr) {
      const [gx, gy] = ti(gr.x, gr.y), f = E(gx, gy) - 9.5; let first = null;
      const blob = (cx, cy, r, deco) => { for (let ty = cy - r; ty <= cy + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) { const d = Math.hypot(tx - cx, (ty - cy) * 1.3); if (d <= r - hash(tx, ty, 31) * 1.2 && free(tx, ty)) put(tx, ty, f, K.GROTTA); } rooms.push({ x: cen(cx), y: cen(cy), f, deco, w: r * 2 * TS, h: r * 2 * TS, light: LIGHT.grotta, r }); };
      blob(gx, gy, 4, 'grotta'); blob(gx + 7, gy + 3, 3, 'grotta'); tunnel(gx + 3, gy, gx + 5, gy + 3, f, f, K.GROTTA);
      const ex = nearWalk(gx, gy - 5, 4); if (ex) { tunnel(gx, gy - 3, ex[0], ex[1], f, f, K.GROTTA); portal('pozzo', ex, 'La grotta delle stalattiti', { nat: true }); }
      place('grotta_stal', 'La grotta delle stalattiti', cen(gx), cen(gy), 9, 'grotta'); lamp(cen(gx), cen(gy), f + .5, '#7fb0c8', 'acqua');
      // il fiume: dalla grotta scende verso la spiaggia a zig-zag, l'acqua corre nel mezzo; sbuca con un pozzo tra gli scogli
      if (sp) { const [sx, sy] = ti(sp.x, sp.y); let x = gx + 9, y = gy + 3, fz = f, k = 0; const pts = [];
        while ((Math.abs(x - sx) > 2 || Math.abs(y - sy) > 3) && k++ < 14) { const nx2 = x + Math.sign(sx - x) * Math.min(Math.abs(sx - x), 3 + Math.floor(hash(x, y, 32) * 4)), ny2 = y + Math.sign(sy - y) * Math.min(Math.abs(sy - y), 2 + Math.floor(hash(x, y, 33) * 3)); const nf = fz + (E(nx2, ny2) - 6 - fz) * .35; pts.push(...tunnel(x, y, nx2, ny2, fz, nf, K.FIUME)); x = nx2; y = ny2; fz = nf; }
        const ex2 = nearWalk(x, y, 5); if (ex2) { tunnel(x, y, ex2[0], ex2[1], fz, E(ex2[0], ex2[1]) - 4, K.FIUME); portal('pozzo', ex2, 'Il fiume sotterraneo', { nat: true }); }
        if (pts.length) { const q = pts[Math.floor(pts.length / 2)]; place('fiume', 'Il fiume sotterraneo', cen(q[0]), cen(q[1]), 8, 'fiume'); rooms.push({ x: cen(q[0]), y: cen(q[1]), f: fl[idx(q[0], q[1])], deco: 'fiume', light: LIGHT.fiume }); for (let k2 = 4; k2 < pts.length; k2 += 9) lamp(cen(pts[k2][0]), cen(pts[k2][1]), fl[idx(pts[k2][0], pts[k2][1])] + .4, '#4fa8b8', 'acqua'); } }
    }

    // ---------------- −14/−32: LA MINIERA sotto la cava e sotto la Stazione Nord ----------------
    const miniera = (id, name, x, y, depth, len) => {
      const [mx, my] = ti(x, y), f = E(mx, my) - depth, dir = hash(mx, my, 34) < .5 ? [1, 0] : [0, 1], nx = dir[1], ny = dir[0];
      const at = (a, l) => [mx + dir[0] * a + nx * l, my + dir[1] * a + ny * l];
      for (let a = -len; a <= len; a++) { const [tx, ty] = at(a, 0); if (inb(tx, ty)) put(tx, ty, f, K.MINIERA); }   // la galleria di carreggio
      for (const a of [-len + 2, 0, len - 2]) for (let l = 1; l <= 4; l++) { const [tx, ty] = at(a, l * (a === 0 ? -1 : 1)); if (inb(tx, ty)) put(tx, ty, f - l * .25, K.MINIERA); }   // le traverse di scavo, in leggera pendenza
      for (const [a, l] of [[-len + 2, 6], [len - 2, 6]]) { const [tx, ty] = at(a, l); rm(tx - 1, ty - 1, 3, 3, f - 1.1, K.MINIERA, 'miniera_camera', { name }); const [px2, py2] = at(a, 4); corridor(px2, py2, tx, ty, f - 1, f - 1.1, K.MINIERA); }
      const ex = nearWalk(mx, my, 8); if (ex) { corridor(mx, my, ex[0], ex[1], f, f, K.MINIERA); portal('pozzo', ex, name); }
      place(id, name, cen(mx), cen(my), 12, 'miniera'); rooms.push({ x: cen(mx), y: cen(my), f, deco: 'miniera', light: LIGHT.miniera, dir, len, name });
      for (let a = -len + 1; a < len; a += 5) { const [tx, ty] = at(a, 0); lamp(cen(tx), cen(ty), f + 2, '#ffc080', 'lume'); }
      return { mx, my, f };
    };
    const cv = G.PLACES.cava, mn = G.PLACES.miniera, mc = cv ? miniera('miniera_cava', 'La miniera della cava', cv.x, cv.y, 16, 7) : null; if (mn) miniera('miniera_nord', 'La vecchia miniera del Nord', mn.x, mn.y, 18, 6);
    // [sotto2] la fessura: dalla grotta delle stalattiti scende nella miniera della cava (i minatori l'hanno trovata così)
    if (mc && gr) { const [gx, gy] = ti(gr.x, gr.y), d = Math.abs(mc.mx - gx) + Math.abs(mc.my - gy); if (d < 70) { const pts = tunnel(gx + 7, gy + 3, mc.mx, mc.my, E(gx, gy) - 9.5, mc.f, K.GROTTA); const q = pts[pts.length >> 1]; if (q) lamp(cen(q[0]), cen(q[1]), fl[idx(q[0], q[1])] + .5, '#7fb0c8', 'acqua'); } }

    // ---------------- SOTTO IL MARE: IL RELITTO davanti alla calata ----------------
    const ca = G.PLACES.calata; if (ca) {
      const [cx, cy] = ti(ca.x, ca.y); let rel = null;
      for (let dy = 5; dy < 16 && !rel; dy++) for (let dx = -4; dx < 5 && !rel; dx++) { let okW = true; for (let j = 0; j < 3 && okW; j++) for (let i = 0; i < 6; i++) { const tx = cx + dx + i, ty = cy + dy + j; if (!inb(tx, ty) || G.tileAt(tx, ty) !== T.WATER || ug[idx(tx, ty)]) { okW = false; break; } } if (okW) rel = [cx + dx, cy + dy]; }
      if (rel) { const f = minE(rel[0], rel[1], 6, 3) - 9.4, R = rm(rel[0], rel[1], 6, 3, f, K.RELITTO, 'relitto', { name: 'Il relitto' }); place('relitto_sotto', 'Il relitto', R.x, R.y, 7, 'relitto'); lamp(R.x, R.y, f + .8, '#4f90b8', 'acqua');
        // la galleria naturale fino al molo: una botola fra le tavole
        let best = null, bd = 1e9; for (let r = 1; r < 16; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const tx = rel[0] + i, ty = rel[1] + j; if (!inb(tx, ty) || !G.walkT(tx, ty) || ug[idx(tx, ty)] || taken(tx, ty)) continue; const d = Math.hypot(i, j); if (d < bd) { bd = d; best = [tx, ty]; } }
        if (best) { tunnel(rel[0], rel[1] + 1, best[0], best[1], f, E(best[0], best[1]) - 3.4, K.GROTTA); portal('botola', best, 'Il relitto'); } }
    }
    return out;
  }

  // =====================================================================================================================
  // [sotto2] I RITROVAMENTI: cose sepolte che si trovano scavando. Non sono scavati: stanno nella terra a una certa quota.
  // Scavando accanto (una casella attorno, o sopra/sotto a meno di quattro metri) spunta un indizio; scavando dentro, alla quota
  // giusta (±2 m), la cavità si apre (le caselle diventano scavate, kind RITROV) e dentro c'è la cosa, da guardare e da prendere.
  // I grossi sono uno per tipo, in un posto preciso; i piccoli (anfore, monete, bottiglie, ossa) a densità per strato.
  // Tabella: id, nome, kind (= l'arredo in grafica), casella d'angolo x0,y0, misura tw×th, quota del pavimento f, cosa dà, frasi.
  // =====================================================================================================================
  const FINDS_DEF = [
    { id: 'dino', name: 'Lo scheletro del dinosauro', kind: 'dino', near: 'pineta', tw: 6, th: 3, d: 9, zones: [3, 5], items: { fossile: 2 },
      hint: 'La pala urta qualcosa di duro, liscio, enorme. Un osso? Ma di che bestia?', msg: 'La terra frana e si apre una cavità lunga come una casa: costole alte come porte, una colonna vertebrale, un teschio con i denti. Un dinosauro, sotto la Collina Nera. Ci si cammina in mezzo.' },
    { id: 'bus', name: 'L\'autobus sepolto', kind: 'bus', near: 'discarica', tw: 6, th: 2, d: 4.6, zones: [1], items: { dischi: 1, orologio: 1, rottami: 2 },
      hint: 'Un bordo di lamiera arrugginita spunta dalla terra: verde e crema, la vernice delle vecchie autolinee.', msg: 'La lamiera cede: dentro è vuoto. Un autobus degli anni Cinquanta, sepolto intero alla discarica. I sedili, i manifesti, il posto dell\'autista. Ci si entra.' },
    { id: 'barca', name: 'La barca romana', kind: 'barca', near: 'scalo', tw: 5, th: 2, d: 6.5, items: { anfora: 2, moneta_romana: 2 },
      hint: 'Legno nero, duro come pietra, incastrato nella sabbia. Un\'asse curva, lunga.', msg: 'Le costole di una barca, nere, e il carico ancora a posto: anfore, una pila di monete verdi. Una barca romana sotto lo scalo.' },
    { id: 'statua', name: 'La statua sepolta', kind: 'statua', near: 'pietra', tw: 2, th: 2, d: 4.2, items: { moneta_romana: 1 },
      hint: 'Un dito di marmo spunta dalla terra. Un dito grande come un braccio.', msg: 'Una statua di marmo, intera, coricata nella terra: un governatore, un santo, nessuno lo sa più. Qualcuno l\'ha seppellita apposta.' },
    { id: 'campana', name: 'La campana', kind: 'campana', near: 'ruderi', tw: 2, th: 2, d: 5.5, items: { candele: 2 },
      hint: 'Il piccone suona: bronzo. Un rintocco sordo sotto la terra.', msg: 'La campana della chiesa dei ruderi, sepolta nel Seicento perché gli spagnoli non la fondessero. Pesa quanto una casa.' },
    { id: 'auto', name: 'L\'auto della guerra', kind: 'auto', near: 'poligono', tw: 3, th: 2, d: 4, items: { munizioni: 2, elmetto: 1, medaglia: 1 },
      hint: 'Un parafango, un faro rotto. Una macchina sotto terra.', msg: 'Una vettura militare della guerra, finita in una buca e coperta. Dentro un elmetto, le cartucce, una medaglia nel cruscotto.' },
    { id: 'partigiani', name: 'Il rifugio dei partigiani', kind: 'partigiani', near: 'bivacco_o', tw: 4, th: 3, d: 6.5, zones: [3, 5], items: { radiolina: 1, coperta: 2, mappa: 1, pistola: 1, volantini: 1 },
      hint: 'Tavole, una porta di legno sepolta. Qualcuno ha scavato qui prima di te.', msg: 'Il rifugio dei partigiani del \'44: le brande, la radio, la bandiera, le scritte sulla parete. Se ne sono andati di corsa.' },
    { id: 'regime', name: 'La stanza murata del regime', kind: 'regime', near: 'archivio', prima: 'stazione',   /* [mappa_compatta] sotto la stazione, se c'è */ tw: 3, th: 3, d: 4, zones: [1], items: { fascicolo: 3, prove: 1, documenti: 1, timbro_falso: 1 },
      hint: 'Un muro di mattoni nuovi, dentro la terra. Troppo nuovi.', msg: 'Una stanza murata: gli schedari del regime, i fascicoli che non dovevano esistere, i timbri, le foto. Li hanno nascosti qui sotto l\'Archivio.' },
    { id: 'cani', name: 'Il cimitero dei cani', kind: 'cani', near: 'giardini', tw: 3, th: 2, d: 3, items: { catena: 1 },
      hint: 'Una crocetta di legno, un collare. Ossa piccole.', msg: 'Il cimitero dei cani dei giardini: croci di legno coi nomi, Fido, Lampo, Nerina. Un collare col campanello.' },
    { id: 'armi', name: 'Il deposito d\'armi', kind: 'armi', near: 'carbonaia', tw: 3, th: 2, d: 4.5, zones: [3, 5], items: { moschetto: 2, munizioni: 3, pistola: 1 },
      hint: 'La pala fa scintille: ferro. Un bidone, un altro bidone, unti d\'olio.', msg: 'Una buca foderata di tavole: casse di moschetti avvolti nei teli cerati, bidoni di cartucce, una pistola nell\'olio. Nascoste nel \'45 per «la prossima volta».' },
    { id: 'brigante', name: 'Il nascondiglio del brigante', kind: 'brigante', near: 'paese_vecchio', tw: 3, th: 2, d: 5, items: { valuta: 3, gioielli: 1, coltello: 1, lupara: 1 },
      hint: 'Un ferro di cavallo, una fibbia, il fondo di una pipa. Qualcuno ci ha vissuto, qui sotto.', msg: 'La tana del brigante Cuccu: un giaciglio di paglia marcia, la sella, una cassa coi soldi dei Borboni e la lupara appesa a un chiodo.' },
    // i piccoli: n copie, a caso ma sempre uguali, nei posti e nelle fasce di quota giuste
    { id: 'anfore', name: 'Le anfore', kind: 'anfore', n: 5, among: ['calata', 'scalo', 'cantiere', 'spiaggia', 'caletta', 'marina', 'chiesa_sg', 'vigne'], tw: 1, th: 1, d: [4, 5.5], items: { anfora: 1 }, hint: 'Un collo di terracotta spunta dalla terra.', msg: 'Un\'anfora romana intera, col tappo di pece. Dentro, sabbia e una moneta.' },
    { id: 'monete', name: 'Il tesoretto', kind: 'monete', n: 6, among: ['piazza', 'vico', 'caruggio', 'chiesa_sg', 'ovile', 'rudere_o', 'ruderi', 'sangiacomo'], tw: 1, th: 1, d: [3, 5.5], items: { moneta_romana: 1, valuta: 1 }, hint: 'Qualcosa tintinna sotto la pala.', msg: 'Una pentola di coccio piena di monete: romane, spagnole, un dollaro. Il tesoretto di qualcuno che non è tornato.' },
    { id: 'bottiglie', name: 'Le bottiglie', kind: 'bottiglie', n: 5, among: ['osteria', 'sirena', 'bar', 'cantina', 'osteria_sg', 'flamingo'], tw: 1, th: 1, d: [2.6, 3.6], zones: [1, 2], items: { vino: 1, bottiglia_vuota: 2 }, hint: 'Vetro verde nella terra.', msg: 'Una cassa di bottiglie sepolte: vino del \'38, qualcuna ancora buona. Le altre, vetro.' },
    { id: 'ossa', name: 'Le ossa fossili', kind: 'ossa', n: 4, among: ['monte', 'belvedere', 'vetta', 'sorgente', 'collina_o', 'macchia', 'radura'], tw: 1, th: 1, d: [9, 13], zones: [3, 5], items: { fossile: 1 }, hint: 'Nella roccia, il disegno di un osso.', msg: 'Ossa fossili nella pietra: una zampa, una vertebra. Pezzi della stessa bestia che dorme sotto la pineta.' },
  ];
  function buildFinds(C) {
    const { ug } = C, out = [], busy = new Set();
    const okTile = (tx, ty, q) => inb(tx, ty) && !ug[idx(tx, ty)] && !busy.has(idx(tx, ty)) && G.tileAt(tx, ty) !== T.WATER && G.tileAt(tx, ty) !== T.BLD && (!q.zones || q.zones.includes(W.zone[idx(tx, ty)]));
    const okRect = (x0, y0, q) => { for (let ty = y0 - 1; ty <= y0 + q.th; ty++) for (let tx = x0 - 1; tx <= x0 + q.tw; tx++) if (!okTile(tx, ty, q)) return false; return true; };
    // a spirale dal punto voluto: il primo rettangolo libero (terra, non acqua, non sotto una casa, non già scavato)
    const spot = (x, y, q, seed) => { const [cx, cy] = ti(x, y); const a0 = hash(cx, cy, seed) * 6.283; for (let r = 1; r < 26; r++) for (let k = 0; k < 8 + r; k++) { const a = a0 + k / (8 + r) * 6.283, tx = cx + Math.round(Math.cos(a) * r) - (q.tw >> 1), ty = cy + Math.round(Math.sin(a) * r) - (q.th >> 1); if (okRect(tx, ty, q)) return [tx, ty]; } return null; };
    const add = (q, x0, y0, k) => { let e = 1e9; for (let ty = y0; ty < y0 + q.th; ty++) for (let tx = x0; tx < x0 + q.tw; tx++) { e = Math.min(e, EL[idx(tx, ty)]); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) busy.add(idx(tx + i, ty + j)); }
      const d = Array.isArray(q.d) ? q.d[0] + hash(x0, y0, 36) * (q.d[1] - q.d[0]) : q.d;
      out.push({ id: q.n ? q.id + '_' + k : q.id, name: q.name, kind: q.kind, x0, y0, tw: q.tw, th: q.th, f: e - d, d, items: q.items, hint: q.hint, msg: q.msg, light: LIGHT[q.kind], x: cen(x0) + (q.tw - 1) * TS / 2, y: cen(y0) + (q.th - 1) * TS / 2 }); };
    FINDS_DEF.forEach(q => {
      if (!q.n) { const P = (q.prima && G.PLACES[q.prima]) || G.PLACES[q.near]; if (!P) return; const s = spot(P.x, P.y, q, 35); if (s) add(q, s[0], s[1], 0); return; }
      let k = 0; for (let t = 0; t < q.among.length * 3 && k < q.n; t++) { const P = G.PLACES[q.among[(t * 7 + 3) % q.among.length]]; if (!P) continue; const s = spot(P.x + (hash(t, q.id.length, 37) - .5) * 30, P.y + (hash(t, q.id.length, 38) - .5) * 30, q, 39 + t); if (s) { add(q, s[0], s[1], k); k++; } }
    });
    return out;
  }

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
    // [pulizia2] i pezzi urbani grandi (archi, portici, tettoie, mura): un tombino lì sotto, visto dalla camera, non si vede
    const PZ = (W.pezzi || []).filter(p => p.imp && p.tipo !== 'binari' && p.tipo !== 'bitta'), CAM = Math.SQRT1_2;
    const inPz = (x, y, pad0) => PZ.some(p => { const pad = /portico|porta_terra|tettoia/.test(p.tipo) ? pad0 + 2 : pad0, c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - p.x, dy = y - p.y, l = dx * c - dy * s, z = dx * s + dy * c; return p.imp.some(r => l >= r[1] - pad && l <= r[2] + pad && z >= r[3] - pad && z <= r[4] + pad); });   // le volte dei portici sporgono oltre le caselle riservate
    const sottoPezzo = (x, y) => { if (!PZ.length) return false; for (let b = 0; b <= 12; b += 1) for (const o of [-.6, 0, .6]) if (inPz(x + CAM * b + o, y + CAM * b - o, 1.5)) return true; return false; };
    (W.roads || []).forEach(rd => {
      if (!rd.pts || rd.pts.length < 2 || (!rd.fogna && (!/^(citta|strada|litoranea)$/.test(rd.kind || '') || (rd.w || 0) < 6))) return;   // [città2] rd.fogna: la chiavica sotto la Rua e la marina del borgo
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
          if (run - tomb > 30 && (G.tileAt(tx, ty) === T.VIA || (rd.fogna && G.tileAt(tx, ty) === T.COB)) &&   /* [mappa_compatta] anche sulla Rua e sulla Marina (la chiavica del borgo) */ !portals.some(Q => Q.kind === 'tombino' && Math.hypot(Q.s[0] - tx, Q.s[1] - ty) < 8) && !sottoPezzo((tx + .5) * TS, (ty + .5) * TS)) { /* [pulizia2] mai sotto un arco, un portico, una tettoia */ portals.push({ kind: 'tombino', s: [tx, ty], u: [tx, ty], name: rd.name }); tomb = run; }
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
    // i due capi si ricavano dalla città com'è adesso (la mappa è cambiata e le vecchie coordinate fisse cadevano in mare):
    // si scartano le frange (10% per lato) e si prende il bordo sud della parte ovest e il bordo nord della parte est
    const cityAt = (() => { const xs = [], ys = []; for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) if (W.zone[idx(tx, ty)] === ZC) { xs.push(tx); ys.push(ty); }
      if (!xs.length) return () => null; const q = (a, k) => a.slice().sort((m, n) => m - n)[Math.floor(a.length * k)], X0 = q(xs, .1), X1 = q(xs, .9), Y0 = q(ys, .1), Y1 = q(ys, .9);
      return (fx, fy) => { const gx = X0 + (X1 - X0) * fx, gy = Y0 + (Y1 - Y0) * fy; let b = null, bd = 1e9; for (let i = 0; i < xs.length; i++) { const d = (xs[i] - gx) ** 2 + (ys[i] - gy) ** 2; if (d < bd) { bd = d; b = i; } } return [cen(xs[b]), cen(ys[b])]; }; })();
    // [mappa_compatta] nella città compatta la linea va dal Mercato (accanto alla tettoia, verso i Giardini) alle Mura (la Via delle Mura, sotto la vedetta)
    const MKT = (W.sets || []).find(s => s.k === 'mercato'), VM = (W.roads || []).find(r => r.id === 'vic_mura');
    const VMq = VM ? VM.pts.reduce((b, q) => (!b || Math.hypot(q[0] - 1455, q[1] - 288) < Math.hypot(b[0] - 1455, b[1] - 288) ? q : b), null) : null;
    const COMP = !!(W.luoghi && MKT && VMq);
    const aS = COMP ? [MKT.x - 12, MKT.y + 9] : cityAt(.2, .92), aN = COMP ? [VMq[0], VMq[1] + 6] : cityAt(.8, .08);
    const S0 = aS && spot(...aS), N0 = aN && spot(...aN), metro = { ok: false };
    if (S0 && N0) {
      const ax = cen(S0[0]), ay = cen(S0[1]), bx = cen(N0[0]), by = cen(N0[1]), Ld = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / Ld, uy = (by - ay) / Ld, nx = -uy, ny = ux;
      const R = 4.4, OFF = 11;   // raggio dell'elica (mezza distanza tra le gallerie); la banchina comincia 11 m oltre l'ingresso
      const st = [{ id: 'sud', name: COMP ? 'Mercato' : 'Periferia Sud', ent: S0, sgn: 1 }, { id: 'nord', name: COMP ? 'Mura' : 'Periferia Nord', ent: N0, sgn: -1 }];
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
    // [sotto2] gli strati e i ritrovamenti: dopo fogne, posti e metropolitana (chi c'era prima resta)
    const strati = buildStrati({ ug, fl, kind, portals, rooms, put, place, lamp, B, sewer });
    const finds = buildFinds({ ug, fl, kind, portals });
    return { ug, fl, kind, portals, rooms, places, folk, crates, lamps, metro, strati, finds };
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
  // [sotto2] I RITROVAMENTI: scavando accanto spunta l'indizio, scavando dentro alla quota giusta la cavità si apre (vedi FINDS_DEF)
  const RITROVAMENTI = TPL.finds;
  const findAt = (tx, ty) => RITROVAMENTI.find(q => tx >= q.x0 - 1 && tx <= q.x0 + q.tw && ty >= q.y0 - 1 && ty <= q.y0 + q.th);
  function openFind(st, q, L) {
    L = L || LV.S(st); const R0 = S0(st); R0.finds = R0.finds || {}; if (R0.finds[q.id] === 2) return null; R0.finds[q.id] = 2;
    for (let ty = q.y0; ty < q.y0 + q.th; ty++) for (let tx = q.x0; tx < q.x0 + q.tw; tx++) { const i = idx(tx, ty); L.ug[i] = 3; L.fl[i] = q.f; L.kind[i] = K.RITROV; }
    L.rooms.push({ x: q.x, y: q.y, f: q.f, deco: q.kind, w: q.tw * TS, h: q.th * TS, x0: q.x0, y0: q.y0, tw: q.tw, th: q.th, find: q.id, name: q.name, light: q.light }); L.rev++;
    const got = []; Object.entries(q.items || {}).forEach(([g, n]) => { if (!has(g) || !O()) return; const left = O().givePlayer(st, g, n) || 0; if (n - left > 0) got.push(O().nm(g) + (n - left > 1 ? ' ×' + (n - left) : '')); });
    if (!R0.found[q.id]) { R0.found[q.id] = st.t; G.feed(st, `Hai scoperto: ${q.name}.`, 'good'); }
    return q.msg + (got.length ? ` Prendi: ${got.join(', ')}.` : '');
  }
  LV.hooks.dug.push((st, tx, ty, L) => {
    const q = findAt(tx, ty); if (!q) return null; const R0 = S0(st), F = R0.finds = R0.finds || {}; if (F[q.id] === 2) return null;
    const f0 = L.fl[idx(tx, ty)], dz = f0 - q.f, inside = tx >= q.x0 && tx < q.x0 + q.tw && ty >= q.y0 && ty < q.y0 + q.th;
    if (inside && Math.abs(dz) < 2.2) return openFind(st, q, L);
    if (Math.abs(dz) > 4.5) return null;
    if (F[q.id]) return inside ? (dz > 0 ? 'Sotto i piedi la terra suona vuota: scava giù (J).' : 'Sopra la testa qualcosa di duro: scava su (K).') : null;
    F[q.id] = 1; return q.hint + (dz > 2.2 ? ' Viene da più in basso.' : dz < -2.2 ? ' Viene da più in alto.' : '');
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
  // [punta e clicca] tombini, pozzi, grate e scale della metropolitana: un clic e ci vai, arrivato scendi (o risali)
  const PORTAL_LABEL = { tombino: 'Scendi nel tombino', scala: 'Scendi le scale', grata: 'Scendi dalla grata', pozzo: 'Scendi nel pozzo', botola: 'Scendi nella botola' };
  function portalAt(st, i) { const L = LV.S(st), P = L.portals[i], p = st.player; if (!P || !LV.CLIMB.has(P.kind) || P.kind === 'interno' && !p.lv) return null; const c = p.lv ? P.u : P.s; return { P, x: cen(c[0]), y: cen(c[1]) }; }
  function pick(st, nx, ny, o) {
    const p = st.player, R = typeof window !== 'undefined' && window.__pv && window.__pv.R; if (!R || p.indoor || p.vehicle || (p.lv && (p.lv.k !== 'ug' || p.lv.ride !== undefined))) return null;
    if (typeof Cantiere !== 'undefined' && Cantiere.active()) return null;
    const R0 = S0(st); let best = null, bd = Math.max(26, o.h * .045);
    const test = (x, y, h, ref, label) => { if (Math.hypot(x - p.x, y - p.y) > 40) return; const pr = R.project(x, h, y); if (pr.behind) return; const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h); if (d < bd) { bd = d; best = { kind: 'loot', via: 'sotto', ref, x, y, label }; } };
    LV.S(st).portals.forEach((P, i) => { const q = portalAt(st, i); if (!q) return; const lab = p.lv ? (P.kind === 'interno' ? `Sali in ${P.name || 'casa'}` : 'Risali da qui') : P.metro ? P.name : P.nat ? 'Scendi nel pozzo' : PORTAL_LABEL[P.kind] || 'Scendi'; test(q.x, q.y, p.lv ? ((floorAtXY(st, q.x, q.y) || 0) + .3) : R.groundH(q.x, q.y) + .1, 'p:' + i, lab); });
    if (!p.lv) return best;
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
    if (k === 'p') return portalAt(st, +id);
    return null;
  }
  const goal = (st, ref) => { const q = find(st, ref); if (!q) return null; if (ref[0] === 't' || ref[0] === 'p') return { x: q.x, y: q.y }; return freeSpot(st, q.x, q.y); };
  const reach = ref => ref[0] === 't' ? 3 : ref[0] === 'p' ? .9 : 1.7;
  function arrive(st, ref) {
    const R0 = S0(st), k = ref[0], id = ref.slice(2);
    if (k === 'p') { const q = portalAt(st, +id); if (!q) return; const p = st.player; p.x = q.x; p.y = q.y; const m = LV.climb(st); if (m) G.feed(st, m, 'info'); return; }
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
    // il tracciato dello scavo a clic: un riquadro tratteggiato su ogni casella ancora da scavare
    if (!DIG.route) { DIG.route = []; const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.8, 2.3, 1.8)); for (let k = 0; k < 40; k++) { const m = new THREE.LineSegments(eg, new THREE.LineDashedMaterial({ color: '#ffd060', dashSize: .25, gapSize: .18, transparent: true, opacity: .75 })); m.computeLineDistances(); m.userData.ugKeep = true; m.visible = false; scene.add(m); DIG.route.push(m); } }
    const RT = show && L.route ? L.route.tiles.filter(([tx, ty]) => !L.ug[idx(tx, ty)]) : [];
    let fR = L && L.route ? (L.fl[idx(...L.route.from)] || 0) : 0; if (L && L.route) { const pf = LV.heightOf(st, p); if (pf != null) fR = pf; }
    DIG.route.forEach((m, k) => { const q = RT[k]; m.visible = !!q && k > 0; if (q) { m.position.set(cen(q[0]), fR + 1.15, cen(q[1])); m.material.opacity = .35 + .4 * Math.max(0, Math.sin(t * 4 - k * .5)); } });
    if (show && (!L.route || RT.length)) {
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
      for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = idx(tx, ty); const kw = TPL.kind[i]; if (kw !== K.FOGNA && kw !== K.FIUME) continue; const x = cen(tx), z = cen(ty), y = TPL.fl[i] + (kw === K.FIUME ? .14 : .07), e = kw === K.FIUME ? .92 : .5;   // [sotto2] anche il fiume sotterraneo: acqua da parete a parete, si guada
        q(x - e, z - e, x + e, z + e, y); if (tx + 1 < GW && TPL.kind[i + 1] === kw) q(x + e, z - e, x + 2 - e, z + e, (y + TPL.fl[i + 1] + y - TPL.fl[i]) / 2); if (ty + 1 < GH && TPL.kind[i + GW] === kw) q(x - e, z + e, x + e, z + 2 - e, (y + TPL.fl[i + GW] + y - TPL.fl[i]) / 2); }
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
    GFX.pend = TPL.rooms.slice(); GFX.root = root;   // [sotto2] gli arredi si fanno quando ti avvicini (vedi gfx): a partita iniziata non si costruisce tutto il sottosuolo
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
      default: if (!decor2(Rm, g)) return null;   // [sotto2] gli strati e i ritrovamenti
    }
    return g;
  }
  // =====================================================================================================================
  // [sotto2] GLI ARREDI DEGLI STRATI E DEI RITROVAMENTI. Ogni cavità è un'inquadratura: un oggetto dominante (la botte, l'altare,
  // il muro d'ossa, lo scheletro, l'autobus), il materiale vero, la sua luce. Tutto a istanze: per ogni stanza pochi draw call
  // (un InstancedMesh per forma e colore). Le cose appoggiate alle pareti stanno in un gruppo per lato: quel lato si spegne
  // quando la parete è verso la camera (lì la parete è tagliata bassa, per vedere dentro).
  // =====================================================================================================================
  const GEO = {};
  const geo = k => GEO[k] || (GEO[k] = k === 'b' ? new THREE.BoxGeometry(1, 1, 1) : k === 'c' ? new THREE.CylinderGeometry(1, 1, 1, 10) : k === 's' ? new THREE.SphereGeometry(1, 10, 7)
    : k === 'r' ? new THREE.DodecahedronGeometry(1, 0) : k === 'k' ? new THREE.ConeGeometry(1, 1, 7) : k === 'a' ? new THREE.TorusGeometry(1, .07, 5, 20, Math.PI)
    : k === 'g' ? (() => { const t = new THREE.TorusGeometry(1, .06, 5, 22, Math.PI * 1.3); t.rotateZ(-Math.PI * .15); return t; })()   // la costola: un arco che scende sotto il centro
    : k === 'h' ? new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, 0, Math.PI) : null);
  // il raccoglitore delle istanze: forma k, colore c (o materiale), posizione, rotazione (Euler YXZ), scala
  function IB() {
    const B = {}, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), V = new THREE.Vector3(), S = new THREE.Vector3();
    const add = (k, c, o, x, y, z, sx, sy, sz, ry, rx, rz) => { const key = k + '|' + (c && c.isMaterial ? c.uuid : c) + '|' + JSON.stringify(o || 0); (B[key] = B[key] || { k, c, o, l: [] }).l.push([x, y, z, sx, sy, sz, ry || 0, rx || 0, rz || 0]); };
    return {
      box: (w, h, d, c, x, y, z, ry, rx, rz, o) => add('b', c, o, x, y, z, w, h, d, ry, rx, rz),
      cyl: (r, h, c, x, y, z, ry, rx, rz, o) => add('c', c, o, x, y, z, r, h, r, ry, rx, rz),
      sph: (r, c, x, y, z, sy, o) => add('s', c, o, x, y, z, r, r * (sy || 1), r),
      rock: (r, c, x, y, z, sy, ry) => add('r', c, null, x, y, z, r, r * (sy || .6), r, ry),
      cone: (r, h, c, x, y, z, rx, o) => add('k', c, o, x, y, z, r, h, r, 0, rx),
      arc: (sx, sy, c, x, y, z, ry, o) => add('a', c, o, x, y, z, sx, sy, sx, ry),
      rib: (s, c, x, y, z, ry, o) => add('g', c, o, x, y, z, s, s, s, ry),
      half: (r, h, c, x, y, z, ry, rx, rz) => add('h', c, null, x, y, z, r, h, r, ry, rx, rz),
      done(g) { Object.values(B).forEach(q => { const m0 = q.c && q.c.isMaterial ? q.c : q.o && q.o.glow ? glow(q.c, q.o.glow) : mat(q.c, q.o && q.o.m); const im = new THREE.InstancedMesh(geo(q.k), m0, q.l.length);
        q.l.forEach(([x, y, z, sx, sy, sz, ry, rx, rz], i) => { E.set(rx, ry, rz); Q.setFromEuler(E); V.set(x, y, z); S.set(sx, sy, sz); M4.compose(V, Q, S); im.setMatrixAt(i, M4); });
        im.instanceMatrix.needsUpdate = true; im.receiveShadow = true; g.add(im); }); return g; },
    };
  }
  const H = (a, b, s) => hash(Math.floor(a * 7.3), Math.floor(b * 5.1), s);
  // i gruppi dei lati: '1,0' è la parete a +x (est), '0,1' a +z (sud) e così via
  function sides(g) { const S = {}; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const s = new THREE.Group(); s.userData.side = [a, b]; g.add(s); S[a + ',' + b] = { g: s, ib: IB() }; }); g.userData.sides = true; return { S, done() { Object.values(S).forEach(q => q.ib.done(q.g)); } }; }
  const TEXC = {};
  const tex = (k, w, h, draw) => TEXC[k] || (TEXC[k] = canvasTex(w, h, draw));
  const plane = (g, w, h, m, x, y, z, rx, ry) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, 0, 'YXZ'); g.add(o); return o; };
  // il mosaico (borgo: tessere bianche e nere a meandro; Ottocento: cementine colorate), con le lacune
  function mosaicTex(stile, seed) {
    return tex('mos' + stile + (seed > .5 ? 1 : 0), 128, 128, (x, w, h) => {
      const r = (() => { let s = Math.floor(seed * 1e6) + 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      if (stile === 'borgo') { x.fillStyle = '#d8d0bc'; x.fillRect(0, 0, w, h); for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) { const bd = i < 3 || j < 3 || i > 28 || j > 28, mea = (i + j) % 6 < 2 && (i < 6 || j < 6 || i > 25 || j > 25); x.fillStyle = bd ? '#2a2620' : mea ? '#8a2a1e' : (i * 3 + j * 5) % 11 === 0 ? '#3a3630' : r() < .5 ? '#e0d8c4' : '#cec6b0'; x.fillRect(i * 4, j * 4, 3, 3); }
        x.fillStyle = '#2a2620'; x.beginPath(); x.arc(64, 64, 22, 0, 6.3); x.fill(); x.fillStyle = '#c8a040'; x.beginPath(); x.arc(64, 64, 16, 0, 6.3); x.fill(); x.fillStyle = '#2a5a6a'; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; x.fillRect(64 + Math.cos(a) * 9 - 2, 64 + Math.sin(a) * 9 - 2, 4, 4); } }
      else { const C = [['#b8402a', '#e8dcc0', '#2a4a6a'], ['#3a6a4a', '#e0d4b8', '#8a2a2a']][seed > .5 ? 1 : 0]; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = C[1]; x.fillRect(i * 16, j * 16, 16, 16); x.fillStyle = C[0]; x.beginPath(); x.moveTo(i * 16 + 8, j * 16); x.lineTo(i * 16 + 16, j * 16 + 8); x.lineTo(i * 16 + 8, j * 16 + 16); x.lineTo(i * 16, j * 16 + 8); x.fill(); x.fillStyle = C[2]; x.fillRect(i * 16 + 6, j * 16 + 6, 4, 4); x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeRect(i * 16, j * 16, 16, 16); } }
      // le lacune: la terra che si vede dove le tessere sono saltate
      for (let k = 0; k < 7; k++) { x.fillStyle = '#4a3a2a'; x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 16, 4 + r() * 10, r() * 3, 0, 6.3); x.fill(); }
    });
  }
  const frescoTex = () => tex('fresco', 96, 128, (x, w, h) => { x.fillStyle = '#c8b48a'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a4a7a'; x.beginPath(); x.moveTo(0, h); x.lineTo(0, 30); x.quadraticCurveTo(w / 2, -10, w, 30); x.lineTo(w, h); x.fill();
    x.fillStyle = '#d8b050'; x.beginPath(); x.arc(w / 2, 40, 13, 0, 6.3); x.fill(); x.fillStyle = '#d8b090'; x.beginPath(); x.arc(w / 2, 42, 8, 0, 6.3); x.fill(); x.fillStyle = '#8a2a20'; x.beginPath(); x.moveTo(w / 2 - 14, 120); x.lineTo(w / 2 - 9, 52); x.lineTo(w / 2 + 9, 52); x.lineTo(w / 2 + 14, 120); x.fill();
    x.fillStyle = '#e8dcc0'; x.fillRect(w / 2 - 2, 60, 4, 40); x.fillRect(w / 2 - 10, 70, 20, 3); for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(200,180,138,.7)'; x.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 6, 2 + Math.random() * 4); } });
  const writeTex = (k, lines, bg, fg) => tex(k, 256, 128, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach((t, i) => { x.font = (i ? '' : 'bold ') + (i ? 22 : 30) + 'px Arial'; x.fillText(t, w / 2 + (Math.random() - .5) * 6, 30 + i * 36); }); for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(Math.random() * w, Math.random() * h, 8, 3); } });
  // la lampada a olio nella nicchia, il lume appeso
  const oil = (ib, x, y, z) => { ib.box(.16, .07, .1, '#8a5a3a', x, y, z); ib.sph(.05, '#ffc060', x + .05, y + .07, z, 1.4, { glow: 2.4 }); };
  // ---------------- le stanze ----------------
  function decor2(Rm, g) {
    const w = Rm.w || 8, h = Rm.h || 6, W2 = w / 2, H2 = h / 2, ib = IB(), d = Rm.deco, sd = Rm.seed !== undefined ? Rm.seed : H(Rm.x, Rm.y, 61);
    const wood = '#5a3e26', woodD = '#3a2818', bone = '#e4dcc4', boneD = '#c8bea0', stoneC = '#8a8478', brick = '#8a5a3e';
    const SD = () => { const s = sides(g); return s; };
    switch (d) {
      case 'cantina': {
        // la volta a botte: archi di mattoni sul lato corto, ogni metro e mezzo; le botti sui cavalletti; la scala che sale in casa
        const along = w >= h, L0 = along ? w : h, span = (along ? h : w) / 2 - .12;
        for (let s = -L0 / 2 + .8; s <= L0 / 2 - .5; s += 1.5) { const [ax, az] = along ? [s, 0] : [0, s]; ib.arc(span, 1.05, brick, ax, 1.62, az, along ? Math.PI / 2 : 0); }
        const S = SD(), wall = along ? S.S['0,-1'] : S.S['-1,0'], nb = Math.max(1, Math.min(4, Math.floor((L0 - 2) / 1.3)));
        for (let k = 0; k < nb; k++) { const s = -L0 / 2 + 1.1 + k * 1.3, [bxp, bzp] = along ? [s, -H2 + .65] : [-W2 + .65, s];
          wall.ib.cyl(.46, .95, '#6a4428', bxp, .62, bzp, 0, along ? Math.PI / 2 : 0, along ? 0 : Math.PI / 2); for (const o of [-.33, .33]) wall.ib.cyl(.48, .05, '#2a2a2a', bxp + (along ? 0 : o), .62, bzp + (along ? o : 0), 0, along ? Math.PI / 2 : 0, along ? 0 : Math.PI / 2);
          wall.ib.box(.9, .16, .14, woodD, bxp, .1, bzp + (along ? 0 : 0)); wall.ib.box(.05, .08, .05, '#3a2818', bxp, .62, bzp + (along ? .47 : 0)); }
        // lo scaffale delle bottiglie sull'altra parete lunga
        const sh = along ? S.S['-1,0'] : S.S['0,-1'], [sx0, sz0] = along ? [-W2 + .25, 0] : [0, -H2 + .25];
        for (const yy of [.5, 1.1, 1.7]) { sh.ib.box(along ? .4 : 1.6, .05, along ? 1.6 : .4, wood, sx0, yy, sz0); for (let k = 0; k < 6; k++) sh.ib.cyl(.04, .3, k % 3 ? '#2a4a2a' : '#4a2a1a', sx0 + (along ? 0 : -.65 + k * .26), yy + .18, sz0 + (along ? -.65 + k * .26 : 0)); }
        S.done();
        if (Rm.stair) { const lx = Rm.stair[0] - Rm.x, lz = Rm.stair[1] - Rm.y; for (let k = 0; k < 9; k++) ib.box(.9, .3 * (k + 1), .3, '#7a6a58', lx, .15 * (k + 1), lz + .9 - k * .3); ib.box(.05, .9, 2.6, woodD, lx + .45, 2.0, lz - .3, 0, -.75); }
        ib.box(.5, .4, .4, '#5a3a22', W2 - .5, .2, H2 - .5); ib.box(.4, .3, .35, '#6a4a2a', W2 - .6, .55, H2 - .5);   // casse di patate
        break; }
      case 'sepolta': case 'vicolo_sepolto': {
        const stile = Rm.stile || 'borgo';
        if (d === 'vicolo_sepolto') {
          // il vicolo: la canaletta in mezzo, gli archi di scarico fra le case ogni otto metri, un gradino, macerie contro i muri
          ib.box(w - .4, .03, .22, '#1a1612', 0, .02, 0);
          for (let s = -W2 + 3; s < W2 - 1; s += 8) { ib.arc(1, 1.3, '#7a7468', s, 1.55, 0, Math.PI / 2); ib.box(.35, 1.6, .25, '#6e6a62', s, .8, -.9); ib.box(.35, 1.6, .25, '#6e6a62', s, .8, .9); }
          for (let k = 0; k < 6; k++) { const s = -W2 + 1 + H(Rm.x, k, 62) * (w - 2); ib.rock(.25 + H(k, Rm.y, 63) * .25, k % 2 ? '#7a7468' : '#6a5a48', s, .1, (k % 2 ? 1 : -1) * .7, .5, k); }
          break;
        }
        const S = SD(), cx0 = cen(Rm.x0) - Rm.x, cz0 = cen(Rm.y0) - Rm.y;   // la casella d'angolo, in locale
        // il pavimento: mosaico o lastre (la casa è un riquadro sopra il pavimento della cavità)
        if (Rm.mosaico) { const m = new THREE.MeshStandardMaterial({ map: mosaicTex(stile === 'borgo' ? 'borgo' : 'cement', sd), roughness: .8 }); const mw = (Rm.wall !== null && Rm.wall !== undefined ? (Rm.wall - Rm.x0) * TS : w) - .6; plane(g, mw, h - .6, m, -W2 + .3 + mw / 2, .03, 0, -Math.PI / 2); }
        // la soglia: la lastra consumata e gli stipiti della porta che dava sul vicolo
        if (Rm.soglia) { const lx = cen(Rm.soglia[0]) - Rm.x, lz = cen(Rm.soglia[1]) - Rm.y, alongX = Rm.side !== undefined, rot = alongX ? 0 : Math.PI / 2;
          ib.box(alongX ? 1.3 : .5, .08, alongX ? .5 : 1.3, '#9a9488', lx, .04, lz); const off = (Rm.side || 0) * .9;
          for (const s of [-.7, .7]) ib.box(.28, 2.1, .3, '#8a8274', lx + (alongX ? s : 0), 1.05, lz + (alongX ? 0 : s) - off * 0, rot); ib.box(alongX ? 1.7 : .32, .3, alongX ? .32 : 1.7, '#7a7266', lx, 2.2, lz); }
        // il pozzo: la vera di pietra, il buio, la carrucola
        if (Rm.well) { const lx = cen(Rm.well[0]) - Rm.x, lz = cen(Rm.well[1]) - Rm.y; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; ib.box(.32, .75, .2, k % 3 ? '#8a8478' : '#7a7468', lx + Math.cos(a) * .62, .38, lz + Math.sin(a) * .62, -a); }
          const hole = new THREE.Mesh(new THREE.CircleGeometry(.55, 14), new THREE.MeshBasicMaterial({ color: '#040303' })); hole.rotation.x = -Math.PI / 2; hole.position.set(lx, .72, lz); g.add(hole);
          for (const s of [-.7, .7]) ib.box(.1, 1.6, .1, woodD, lx + s, .8, lz); ib.box(1.6, .1, .1, woodD, lx, 1.6, lz); ib.cyl(.12, .3, '#4a3a2a', lx, 1.45, lz, 0, 0, Math.PI / 2); ib.cyl(.01, .8, '#8a7a5a', lx, 1.0, lz); ib.cyl(.12, .2, '#5a4a3a', lx, .55, lz); }
        // il crollo: una trave del solaio caduta di sbieco, coppi rotti, macerie
        { const a = sd * 6.283; ib.box(w * .7, .22, .26, woodD, Math.cos(a) * .4, .7, Math.sin(a) * .3, a, 0, .32); for (let k = 0; k < 9; k++) ib.half(.13, .4, '#a85a3a', (H(Rm.x, k, 64) - .5) * (w - 1.4), .06, (H(k, Rm.y, 65) - .5) * (h - 1.2), H(k, k, 66) * 6, Math.PI / 2, 0);
          for (let k = 0; k < 5; k++) ib.rock(.3 + H(k, Rm.x, 67) * .3, k % 2 ? '#8a8478' : '#7a6a58', (k % 2 ? 1 : -1) * (W2 - .6), .1, (H(Rm.y, k, 68) - .5) * (h - 1), .5, k); }
        // quello che è rimasto di chi ci abitava
        const back = S.S['0,-1'], lft = S.S['-1,0'];
        if (stile === 'borgo') { back.ib.box(1.2, .55, .7, '#9a9488', -W2 + 1, .28, -H2 + .45); back.ib.box(1, .1, .5, '#5a564e', -W2 + 1, .5, -H2 + .45);   // la vasca di pietra
          lft.ib.box(.7, .9, 1.1, '#6a645a', -W2 + .45, .45, 0); lft.ib.box(.5, .05, .9, '#1a1410', -W2 + .45, .92, 0); for (let k = 0; k < 3; k++) lft.ib.sph(.18, '#a86a3a', -W2 + .45, 1.1, -.3 + k * .3, 1.3);   // il focolare, le pentole
          back.ib.cyl(.2, .5, '#b8784a', W2 - .7, .3, -H2 + .4); back.ib.cyl(.08, .18, '#b8784a', W2 - .7, .64, -H2 + .4); }
        else if (stile === 'bombe') { back.ib.box(.6, .8, .5, '#2a2a2a', -W2 + .8, .4, -H2 + .4); back.ib.cyl(.07, 1.8, '#2a2a2a', -W2 + .8, 1.7, -H2 + .4); for (let k = 0; k < 4; k++) ib.box(1.4, .04, .04, '#3a3a3a', (k - 1.5) * .3, .3 + k * .1, .2, k * .5, 0, .2 * k); ib.box(1.2, .02, .9, '#1a1612', .3, .02, -.2); }
        else { // le case dello sventramento: il letto di ferro, la sedia rotta, il quadro caduto, le piastrelle della cucina ancora al muro
          back.ib.box(1.9, .05, .9, '#5a5a5a', -W2 + 1.3, .45, -H2 + .55); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) back.ib.cyl(.025, a < 0 ? 1 : .6, '#3a3a3a', -W2 + 1.3 + a * .93, a < 0 ? .5 : .3, -H2 + .55 + b * .42);
          back.ib.box(.04, .7, .9, '#3a3a3a', -W2 + .37, .8, -H2 + .55);
          lft.ib.box(.04, .5, .7, '#c8b890', -W2 + .12, 1.35, .4); for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) if (H(i, j, 69) > .25) lft.ib.box(.03, .14, .14, (i + j) % 2 ? '#e0dcd0' : '#5a8aa8', -W2 + .1, .3 + j * .15, -.4 + i * .15);
          ib.box(.45, .05, .45, wood, W2 - 1, .45, .3, .4); ib.box(.05, .45, .05, wood, W2 - 1.2, .22, .1); ib.box(.4, .5, .05, wood, W2 - .8, .1, .6, .3, Math.PI / 2 - .2); }
        S.done(); break; }
      case 'cisterna': {
        // l'acqua ferma, le colonne coi capitelli e gli archi, la scala che scende all'acqua, la luce che cade dalla bocca
        const wm = new THREE.MeshStandardMaterial({ color: '#0e2a2a', emissive: '#1a4a48', emissiveIntensity: .35, roughness: .08, metalness: .6, transparent: true, opacity: .88 });
        plane(g, w - .1, h - .1, wm, 0, .55, 0, -Math.PI / 2).name = 'acqua';
        for (let x = -W2 + 2; x < W2 - .5; x += 2) for (let z = -H2 + 2; z < H2 - .5; z += 2) { ib.cyl(.22, 3.6, '#9a8a74', x, 1.8, z); ib.box(.6, .22, .6, '#8a7a64', x, 3.5, z); ib.box(.5, .15, .5, '#8a7a64', x, .08, z); }
        for (let x = -W2 + 2; x < W2 - .5; x += 2) ib.arc(1, .7, '#8a6a56', x - 1, 2.9, 0, 0);
        for (let k = 0; k < 6; k++) ib.box(.8, .22, .4, '#7a6a58', -W2 + .5, .55 + k * .22 * 0 + .11 + k * .2, -H2 + .4 + k * .4);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, 1.3, 3.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe8e0', transparent: true, opacity: .08, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(W2 - 1.4, 2.1, H2 - 1.2); g.add(beam);
        ib.cyl(.15, .2, '#6a5a3a', W2 - 1.4, .75, H2 - 1.2); ib.cyl(.008, 2.7, '#8a7a5a', W2 - 1.4, 2.2, H2 - 1.2);
        break; }
      case 'catacomba': {
        // le gallerie: lucerne nelle nicchie, cumuli d'ossa agli incroci, un arcosolio dipinto, i graffiti dei pellegrini
        const ux = Rm.ux || 1, uy = Rm.uy || 0, nx = -uy, ny = ux, len = Rm.len || 8, P = (a, l) => [(a - len / 2) * TS * ux + l * TS * nx, (a - len / 2) * TS * uy + l * TS * ny];
        for (let a = 2; a <= len; a += 2) for (const l of [0, 2, -2, 3, -3]) { if (l && (a < 2 || a > len - 1)) continue; const [x, z] = P(a, l), s = H(a, l, 70) < .5 ? 1 : -1; if (H(a, l, 71) < .55) oil(ib, x + nx * s * .82, 1.15, z + ny * s * .82); }
        for (const a of [2, len - 1]) for (const l of [-3, 3]) { const [x, z] = P(a, l); for (let k = 0; k < 7; k++) ib.cyl(.04, .45, bone, x + (H(a, k, 72) - .5) * .6, .06 + (k % 3) * .06, z + (H(l, k, 73) - .5) * .6, k, Math.PI / 2, 0); for (let k = 0; k < 3; k++) ib.sph(.11, boneD, x + (k - 1) * .2, .3, z, 1.1); }
        { const [x, z] = P(Math.floor(len / 2), 0); ib.box(.5, .7, 1.8, '#a89a80', x + nx * .2, .35, z + ny * .2, Math.atan2(ux, uy)); }   // un sarcofago di tufo
        break; }
      case 'cappella': {
        // la cappella: l'altare, l'affresco nell'abside (il santo con l'aureola), le candele, le panche, la grata
        const S = SD(), back = S.S['0,-1'], fr = new THREE.MeshStandardMaterial({ map: frescoTex(), roughness: .9, emissive: '#ffffff', emissiveMap: frescoTex(), emissiveIntensity: .08 });
        plane(back.g, 2.4, 2.4, fr, 0, 1.55, -H2 + .06); back.ib.arc(1.3, 1.3, '#a89a80', 0, 1.5, -H2 + .1, 0);
        back.ib.box(1.8, .95, .7, '#b8ac94', 0, .48, -H2 + .7); back.ib.box(2, .08, .8, '#c8bca4', 0, .99, -H2 + .7); back.ib.box(.06, .5, .06, '#c8a040', 0, 1.3, -H2 + .55, 0, 0, 0, { m: { metalness: .6, roughness: .4 } }); back.ib.box(.3, .06, .06, '#c8a040', 0, 1.42, -H2 + .55, 0, 0, 0, { m: { metalness: .6, roughness: .4 } });
        for (let k = 0; k < 9; k++) { const x = -.8 + k * .2; back.ib.cyl(.03, .2 + (k % 3) * .06, '#f0e6c8', x, 1.12 + (k % 3) * .03, -H2 + .45); back.ib.sph(.025, '#ffc060', x, 1.25 + (k % 3) * .06, -H2 + .45, 1.6, { glow: 3 }); }
        for (const z of [.4, 1.5]) for (const s of [-1, 1]) { ib.box(1.5, .08, .35, wood, s * 1.15, .45, z); ib.box(.08, .45, .3, woodD, s * 1.15 - .6, .22, z); ib.box(.08, .45, .3, woodD, s * 1.15 + .6, .22, z); }
        plane(g, w - 1, h - 1, new THREE.MeshStandardMaterial({ map: mosaicTex('borgo', .2), roughness: .8 }), 0, .03, .3, -Math.PI / 2);
        S.done(); break; }
      case 'ossario': {
        // il muro d'ossa: file di teschi fra file di femori, fino alla volta; un mucchio con la croce in mezzo
        const S = SD();
        for (const [k2, q] of [['0,-1', S.S['0,-1']], ['-1,0', S.S['-1,0']], ['1,0', S.S['1,0']], ['0,1', S.S['0,1']]]) {
          const [a, b] = k2.split(',').map(Number), lenW = a ? h : w, wx = a * (W2 - .22), wz = b * (H2 - .22);
          for (let row = 0; row < 7; row++) { const y = .18 + row * .32, skulls = row % 2 === 0;
            for (let s = -lenW / 2 + .2; s < lenW / 2 - .1; s += skulls ? .27 : .5) { const x = wx + (a ? 0 : s), z = wz + (a ? s : 0);
              if (skulls) { q.ib.sph(.12, H(s, row, 74) < .15 ? '#b8ae90' : bone, x, y, z, 1.08); q.ib.box(.05, .04, .02, '#1a140e', x - (a ? a * .1 : .045), y + .01, z - (b ? b * .1 : 0) + (a ? -.045 : 0)); }
              else q.ib.cyl(.045, .5, H(s, row, 75) < .3 ? boneD : bone, x, y, z, a ? 0 : Math.PI / 2, Math.PI / 2, 0); } } }
        for (let k = 0; k < 18; k++) ib.cyl(.04, .45, bone, (H(k, 1, 76) - .5) * .9, .05 + (k % 4) * .07, (H(k, 2, 77) - .5) * .9, k * 1.3, Math.PI / 2, 0);
        for (let k = 0; k < 6; k++) ib.sph(.12, bone, (H(k, 3, 78) - .5) * .7, .3 + (k % 2) * .15, (H(k, 4, 79) - .5) * .7, 1.08);
        ib.box(.07, 1.1, .07, woodD, 0, .9, 0); ib.box(.5, .07, .07, woodD, 0, 1.2, 0);
        S.done(); break; }
      case 'grotta': {
        // stalattiti dalla volta, stalagmiti sotto, una pozza ferma che riflette la lanterna
        const r = (Rm.r || 3) * TS - 1;
        for (let k = 0; k < 34; k++) { const a = H(k, Rm.x, 80) * 6.283, rr = Math.sqrt(H(Rm.y, k, 81)) * r, x = Math.cos(a) * rr, z = Math.sin(a) * rr * .8, L = .4 + H(k, k, 82) * 1.4;
          ib.cone(.12 + L * .08, L, k % 4 ? '#c8c4b8' : '#a8a498', x, 3.9 - L / 2, z, Math.PI);
          if (k % 3 === 0) { const L2 = .3 + H(k, 9, 83) * .9; ib.cone(.16 + L2 * .1, L2, '#b8b2a4', x, L2 / 2, z, 0); } }
        const pm = new THREE.MeshStandardMaterial({ color: '#0a1a20', emissive: '#2a5a6a', emissiveIntensity: .25, roughness: .05, metalness: .7 }); const pool = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), pm); pool.rotation.x = -Math.PI / 2; pool.position.set(r * .3, .05, r * .2); g.add(pool);
        for (let k = 0; k < 8; k++) ib.rock(.3 + H(k, 5, 84) * .4, '#6a7276', Math.cos(k) * (r - .3), .15, Math.sin(k) * (r - .3) * .8, .6, k);
        break; }
      case 'fiume': break;   // l'acqua corre su tutte le caselle del fiume (vedi buildUnder)
      case 'miniera': {
        // la galleria di carreggio: i binari a scartamento ridotto, le traversine, il vagonetto pieno, le lampade
        const [ux, uy] = Rm.dir || [1, 0], len = (Rm.len || 6) * TS, ry = Math.atan2(ux, uy);
        for (const o of [-.35, .35]) ib.box(.06, .06, len * 2, '#7a7a80', uy * o, .1, ux * o, ry, 0, 0, { m: { metalness: .7, roughness: .4 } });
        for (let s = -len; s <= len; s += .7) ib.box(.95, .06, .16, '#4a3626', ux * s, .04, uy * s, ry);
        const cart = (s, full) => { const x = ux * s, z = uy * s; ib.box(.9, .55, 1.2, '#5a4a3a', x, .55, z, ry); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ib.cyl(.13, .08, '#2a2a2a', x + uy * a * .38 + ux * b * .4, .16, z + ux * a * .38 + uy * b * .4, ry, 0, Math.PI / 2); if (full) for (let k = 0; k < 5; k++) ib.rock(.18, k % 2 ? '#6a5a4a' : '#8a7a5a', x + (H(s, k, 85) - .5) * .5, .9, z + (H(k, s, 86) - .5) * .7, .7, k); };
        cart(len * .3, true); cart(-len * .55, false);
        break; }
      case 'miniera_camera': {
        for (let k = 0; k < 7; k++) ib.rock(.35 + H(k, Rm.x, 87) * .35, k % 3 ? '#6a5a48' : '#8a7a58', (H(k, 1, 88) - .5) * (w - 1.5), .2, (H(k, 2, 89) - .5) * (h - 1.5), .7, k);
        ib.box(1.4, .08, .7, wood, -W2 + 1.2, .8, H2 - .7); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ib.box(.07, .8, .07, wood, -W2 + 1.2 + a * .6, .4, H2 - .7 + b * .28);
        ib.box(.06, 1, .06, '#5a3e26', W2 - .6, .5, -H2 + .6, .3, 0, .3); ib.box(.3, .07, .07, '#4a4a50', W2 - .55, 1, -H2 + .6, .3);   // il piccone contro la parete
        ib.cyl(.3, 1.2, '#4a4a40', W2 - 1, .6, H2 - .8, 0, 0, Math.PI / 2);   // l'argano
        break; }
      case 'relitto': {
        // la nave sul fianco: la chiglia, le costole nere, il fasciame a pezzi, l'albero spezzato
        const tilt = .5; ib.box(w - 1.2, .3, .35, '#2a2018', 0, .25, .9, 0);
        for (let s = -W2 + 1; s <= W2 - 1; s += .9) { const k2 = 1 - Math.pow(Math.abs(s) / W2, 2) * .5; ib.arc(1.7 * k2, 1.5 * k2, '#2e241a', s, .3, .2, Math.PI / 2 + tilt * 0, null); }
        for (let k = 0; k < 6; k++) ib.box(1.6 + H(k, 1, 90) * 2, .06, .25, '#3a2c20', (H(k, 2, 91) - .5) * (w - 3), .4 + k * .25, -.6 + k * .05, (H(k, 3, 92) - .5) * .3, 0, .9);
        ib.cyl(.16, w * .55, '#3a2a1c', -.5, .5, -H2 + 1.2, .25, 0, Math.PI / 2 - .1);
        for (let k = 0; k < 4; k++) { ib.sph(.25, '#a8683a', -1 + k * .6, .3, .4, 1.5); ib.cyl(.07, .25, '#a8683a', -1 + k * .6, .7, .4); }
        ib.box(.8, .5, .5, '#4a3826', W2 - 1.6, .25, -.2, .4); break; }
      // ---------------- i ritrovamenti ----------------
      case 'dino': dinoDecor(ib, w, h); break;
      case 'bus': busDecor(g, ib, w, h); break;
      case 'barca': {
        const ry = w >= h ? 0 : Math.PI / 2, L0 = Math.max(w, h) - .8; ib.box(L0, .2, .25, '#2a2018', 0, .15, 0, ry);
        for (let s = -L0 / 2 + .5; s <= L0 / 2 - .4; s += .55) { const k2 = 1 - Math.pow(Math.abs(s) / (L0 / 2), 2) * .7; ib.arc(1.1 * k2, .8 * k2, '#3a2c1e', ry ? 0 : s, .2, ry ? s : 0, ry + Math.PI / 2); }
        for (let k = 0; k < 7; k++) { const s = -L0 / 2 + 1 + k * .55, x = ry ? (k % 2 - .5) * .4 : s, z = ry ? s : (k % 2 - .5) * .4, tlt = (H(k, 1, 93) - .5) * .8; ib.sph(.22, '#b06a3a', x, .45, z, 1.6); ib.cyl(.06, .3, '#b06a3a', x + tlt * .2, .85, z, 0, 0, tlt); }
        for (let k = 0; k < 14; k++) ib.cyl(.04, .015, '#7a8a5a', .8 + (H(k, 2, 94) - .5) * .4, .05 + (k % 5) * .016, (H(k, 3, 95) - .5) * .4, 0, 0, 0, { m: { metalness: .6, roughness: .5 } });
        break; }
      case 'statua': {
        // la statua coricata nella terra: il corpo togato, la testa girata, il braccio teso, il plinto spezzato
        const mar = '#e4e2dc'; ib.box(1.8, .5, .6, mar, 0, .3, 0, .2); ib.sph(.24, mar, 1.15, .4, .25, 1.1); ib.box(.9, .18, .2, mar, .5, .5, .45, .9);
        ib.box(.7, .45, .55, mar, -1.2, .25, -.1, .2); for (let k = 0; k < 6; k++) ib.box(.04, .45, .02, '#c8c6be', -.6 + k * .2, .45, .31, .2);
        ib.box(.9, .7, .9, '#a8a49a', -.4, .35, -1.2, .5, .2, .1); break; }
      case 'campana': {
        const pts = [[0, 1.2], [.28, 1.2], [.42, 1.0], [.48, .6], [.62, .2], [.8, .02], [.76, 0]].map(([a, b]) => new THREE.Vector2(a, b));
        const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), mat('#7a6a34', { metalness: .75, roughness: .45, side: THREE.DoubleSide })); bell.rotation.set(0, .4, 1.25); bell.position.set(.1, .8, 0); g.add(bell);
        ib.box(2.6, .3, .3, woodD, -.2, 1.6, -.6, .4, 0, .35); ib.cyl(.06, .7, '#3a3a34', .6, .6, .2, 0, 0, 1.2); break; }
      case 'auto': {
        // la vettura militare: cassone verde oliva, parafanghi, la ruota di scorta, il parabrezza abbattuto, l'elmetto sul sedile
        const ol = '#4a5032', ry = w >= h ? 0 : Math.PI / 2, rx = (a, b) => ry ? [b, a] : [a, b];
        const B = (sx, sy, sz, c, a, y, b, o) => { const [x, z] = rx(a, b); ib.box(ry ? sz : sx, sy, ry ? sx : sz, c, x, y, z, 0, 0, 0, o); };
        B(3.4, .6, 1.6, ol, 0, .75, 0); B(1.1, .45, 1.5, ol, 1.2, 1.2, 0); B(.06, .5, 1.4, '#6a7a7a', .55, 1.3, 0, { m: { metalness: .3 } }); B(.9, .25, .5, '#3a3428', -.3, 1.1, .35); B(.9, .25, .5, '#3a3428', -.3, 1.1, -.35);
        for (const [a, b] of [[1.15, .85], [1.15, -.85], [-1.15, .85], [-1.15, -.85]]) { const [x, z] = rx(a, b); ib.cyl(.36, .25, '#1a1a1a', x, .36, z, ry, Math.PI / 2, 0); }
        { const [x, z] = rx(-1.8, 0); ib.cyl(.34, .22, '#1a1a1a', x, .9, z, ry + Math.PI / 2, Math.PI / 2, 0); }
        { const [x, z] = rx(-.3, .35); ib.sph(.16, '#4a5a3a', x, 1.3, z, .6); }
        for (let k = 0; k < 4; k++) ib.rock(.2, '#6a4a2a', (H(k, 1, 96) - .5) * 3, .7 + k * .1, (H(k, 2, 97) - .5) * 1, .5, k);   // la ruggine e la terra dentro
        break; }
      case 'partigiani': {
        // il rifugio del '44: brande, la radio sul tavolo, la bandiera e le scritte sulla parete, le casse, la lanterna
        const S = SD(), back = S.S['0,-1'], lft = S.S['-1,0'];
        plane(back.g, 2.4, 1.2, new THREE.MeshStandardMaterial({ map: writeTex('part', ['W L\'ITALIA LIBERA', 'BRIGATA «MARE» — 1944', 'a morte il tiranno'], '#8a7a5a', '#2a1a12'), roughness: 1 }), .3, 1.5, -H2 + .06);
        back.ib.box(1.2, .8, .02, '#a82a20', -W2 + 1.1, 1.7, -H2 + .08); back.ib.box(.4, .8, .021, '#2a6a3a', -W2 + .7, 1.7, -H2 + .08);
        for (const z of [-.6, .7]) { lft.ib.box(.75, .1, 1.9, '#4a4a3a', -W2 + .55, .45, z); lft.ib.box(.75, .12, .5, '#7a7a6a', -W2 + .55, .55, z - .65); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lft.ib.box(.05, .45, .05, woodD, -W2 + .55 + a * .33, .22, z + b * .9); }
        ib.box(1.2, .07, .7, wood, .6, .78, .3); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ib.box(.06, .78, .06, wood, .6 + a * .55, .39, .3 + b * .3);
        ib.box(.5, .3, .3, '#3a3a32', .5, .96, .25); ib.box(.08, .06, .02, '#ffb040', .35, 1.0, .41, 0, 0, 0, { glow: 2 }); ib.cyl(.005, .6, '#2a2a2a', .65, 1.4, .2);
        for (let k = 0; k < 3; k++) ib.box(.6, .4, .45, '#4a5a3a', W2 - .5, .2 + k * .4, -H2 + .5 + (k % 2) * .1);
        S.done(); break; }
      case 'regime': {
        // la stanza murata: gli schedari in fila, le scatole dei fascicoli, la scrivania con la macchina da scrivere, il cartello
        const S = SD(), back = S.S['0,-1'], lft = S.S['-1,0'];
        for (let k = 0; k < Math.floor((w - .6) / .55); k++) { const x = -W2 + .45 + k * .55; back.ib.box(.5, 1.35, .6, '#5a5e5a', x, .68, -H2 + .38, 0, 0, 0, { m: { metalness: .4, roughness: .6 } }); for (let j = 0; j < 4; j++) back.ib.box(.3, .04, .02, '#c8c0a0', x, .25 + j * .33, -H2 + .69); }
        for (let k = 0; k < Math.floor((h - 1) / .5); k++) for (let j = 0; j < 3; j++) lft.ib.box(.35, .3, .45, j % 2 ? '#b8a878' : '#a89868', -W2 + .25, .16 + j * .31, -H2 + .9 + k * .5);
        ib.box(1.3, .06, .7, '#4a3020', .5, .76, .6); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ib.box(.06, .76, .06, '#3a2418', .5 + a * .6, .38, .6 + b * .3); ib.box(.4, .14, .3, '#1a1a1a', .5, .86, .55); ib.box(.4, .06, .08, '#e8e0cc', .5, .97, .45);
        for (let k = 0; k < 12; k++) ib.box(.22, .01, .3, k % 3 ? '#e0d8c0' : '#c8b890', (H(k, 1, 98) - .5) * 2, .02, (H(k, 2, 99) - .5) * 1.6, k);
        plane(back.g, 1.6, .55, new THREE.MeshBasicMaterial({ map: writeTex('reg', ['ARCHIVIO RISERVATO', 'UFFICIO POLITICO — 1938'], '#d8d0b8', '#1a1a1a') }), 0, 2.15, -H2 + .06);
        S.done(); break; }
      case 'cani': {
        // il cimitero dei cani: crocette di legno in file coi nomi, i cumuli, un collare
        for (let k = 0; k < Math.floor(w / 1) * Math.floor(h / 1.4); k++) { const i = k % Math.floor(w / 1), j = Math.floor(k / Math.floor(w / 1)), x = -W2 + .5 + i, z = -H2 + .7 + j * 1.4;
          ib.box(.6, .18, .9, '#4a3624', x, .06, z + .3, 0, 0, 0); ib.box(.05, .55, .05, wood, x, .38, z - .1, (H(i, j, 100) - .5) * .3, 0, (H(j, i, 101) - .5) * .2); ib.box(.3, .05, .05, wood, x, .5, z - .1); ib.box(.18, .1, .01, '#d8d0b8', x, .4, z - .07); }
        ib.cyl(.12, .03, '#8a2a20', 0, .14, .2, 0, Math.PI / 2, 0); ib.sph(.03, '#c8a040', .12, .14, .2, 1, { m: { metalness: .7 } }); break; }
      case 'armi': {
        // il deposito d'armi: le casse coi moschetti, i bidoni, il telo cerato
        for (let k = 0; k < 4; k++) { const x = -W2 + .9 + (k % 2) * 1.2, z = -H2 + .6 + Math.floor(k / 2) * 1.6; ib.box(1.1, .35, .5, '#4a5034', x, .18 + (k > 1 ? 0 : 0), z); if (k % 2 === 0) for (let j = 0; j < 4; j++) ib.box(1, .05, .06, '#2a2420', x, .4, z - .18 + j * .12, .05); }
        for (let k = 0; k < 3; k++) ib.cyl(.3, .9, k % 2 ? '#3a4a2a' : '#5a4a2a', W2 - .6, .45, -H2 + .6 + k * .65);
        ib.box(2, .04, 1.4, '#2a3024', -.3, .5, .4, .2, .1, .08); break; }
      case 'brigante': {
        // la tana del brigante: il giaciglio di paglia, la sella, la cassa, la lupara al chiodo, il fuoco spento
        ib.box(1.9, .2, .9, '#a8904a', -W2 + 1.2, .1, 0); ib.box(.6, .3, .4, '#5a3a22', W2 - .7, .3, -H2 + .5, .3); ib.box(.9, .55, .55, '#5a3e22', 0, .28, -H2 + .45); ib.box(.92, .06, .57, '#3a2a1a', 0, .58, -H2 + .45);
        ib.box(.06, .06, .9, '#3a2a1a', W2 - .2, 1.4, 0, 0, .2); ib.box(.07, .07, .4, '#2a2a2a', W2 - .2, 1.45, .55, 0, .2);
        for (let k = 0; k < 6; k++) ib.rock(.14, '#3a3634', Math.cos(k) * .4 + .6, .07, Math.sin(k) * .4 + .5, .7, k); ib.box(.5, .04, .5, '#141010', .6, .02, .5); break; }
      case 'anfore': { for (let k = 0; k < 3; k++) { const x = (k - 1) * .5, z = (k % 2) * .2, tl = (k - 1) * .4; ib.sph(.25, '#b06a3a', x, .4, z, 1.6); ib.cyl(.07, .35, '#b06a3a', x + tl * .25, .85, z, 0, 0, tl); ib.cone(.12, .25, '#b06a3a', x, .05, z, Math.PI); } break; }
      case 'monete': { ib.half(.3, .4, '#8a5a3a', 0, .2, 0, 0, 0, 0); ib.half(.3, .4, '#7a4a2a', .25, .15, .2, 2, Math.PI / 2, .4); for (let k = 0; k < 24; k++) ib.cyl(.04, .012, k % 4 ? '#c8a040' : '#9aa0a0', (H(k, 1, 102) - .5) * .7, .02 + (k % 6) * .013, (H(k, 2, 103) - .5) * .7, 0, 0, 0, { m: { metalness: .8, roughness: .3 } }); ib.sph(.03, '#ffd060', 0, .1, 0, 1, { glow: 1.6 }); break; }
      case 'bottiglie': { ib.box(.9, .35, .6, '#6a4a2a', 0, .18, 0, .2); for (let k = 0; k < 9; k++) ib.cyl(.045, .32, k % 3 ? '#2a5a2a' : '#4a2a1a', -.3 + (k % 3) * .3, .4, -.2 + Math.floor(k / 3) * .2, .2, k === 4 ? 1.2 : 0, 0); break; }
      case 'ossa': { for (let k = 0; k < 7; k++) ib.cyl(.07, .6 + H(k, 1, 104) * .5, '#c8b890', (H(k, 2, 105) - .5) * 1.2, .1, (H(k, 3, 106) - .5) * 1.2, k * .9, Math.PI / 2, 0); ib.sph(.2, '#c8b890', .3, .15, -.3, .7); break; }
      default: return false;
    }
    ib.done(g); return true;
  }
  // il dinosauro in piedi nella cavità: la colonna a tre metri e mezzo, le costole ad arco sopra il passaggio, il collo e il cranio
  // coi denti a un capo, la coda che scende fino a terra all'altro, le zampe come pilastri. Si cammina sotto le costole.
  function dinoDecor(ib, w, h) {
    const along = w >= h, L0 = Math.max(w, h), b0 = mat('#d8ceb0', { emissive: '#4a4434' }), b1 = mat('#c4b894', { emissive: '#3a3428' }), P = (s, lat) => along ? [s, lat] : [lat, s], ry = along ? Math.PI / 2 : 0;
    // la colonna: vertebre dalla coda (s = -L/2) al collo
    const spine = s => { const t = (s + L0 / 2) / L0; return t < .35 ? .5 + t / .35 * 2.9 : t < .7 ? 3.4 : 3.4 + (t - .7) / .3 * .9; };
    for (let s = -L0 / 2 + .3; s <= L0 / 2 - 1.4; s += .32) { const t = (s + L0 / 2) / L0, r = t < .35 ? .07 + t * .35 : t > .75 ? .12 : .17, [x, z] = P(s, 0), y = spine(s); ib.sph(r, b0, x, y, z, 1); if (t > .2 && t < .8) { const [x2, z2] = P(s, 0); ib.box(.05, r * 2.2, .1, b1, x2, y + r * 1.4, z2, ry); } }
    // le costole: archi che scendono dalla colonna ai fianchi, più grandi in mezzo
    for (let s = -L0 * .12; s <= L0 * .22; s += .42) { const t = (s + L0 * .12) / (L0 * .34), k = .7 + Math.sin(t * Math.PI) * .5, [x, z] = P(s, 0), y = spine(s); ib.rib(1.75 * k, (s * 7 | 0) % 2 ? b0 : b1, x, y - 1.75 * k, z, ry); }
    // il bacino e le zampe: anche, femori, tibie, piedi
    const leg = (s, sd, big) => { const [x, z] = P(s, sd * .9), y0 = spine(s) - .3, kx = along ? .25 : 0, kz = along ? 0 : .25; ib.cyl(big ? .13 : .1, y0 * .55, b0, x + kx, y0 * .72, z + kz, 0, 0, along ? -.25 : 0); ib.cyl(big ? .11 : .08, y0 * .5, b1, x - kx * .3, y0 * .25, z - kz * .3, 0, 0, along ? .15 : 0); ib.sph(big ? .17 : .13, b0, x + kx * .9, y0 * .47, z + kz * .9, 1); ib.box(.5, .1, .35, b1, x - kx, .05, z - kz, ry); };
    leg(-L0 * .16, -1, true); leg(-L0 * .16, 1, true); leg(L0 * .25, -1, false); leg(L0 * .25, 1, false);
    { const [x, z] = P(-L0 * .16, 0); ib.box(along ? .9 : 1.6, .5, along ? 1.6 : .9, b0, x, spine(-L0 * .16) - .25, z); }
    // il cranio: la scatola, la mascella, le orbite, i denti
    { const s = L0 / 2 - .9, [x, z] = P(s, 0), y = spine(s) + .2, [fx, fz] = along ? [1, 0] : [0, 1];
      ib.box(along ? 1.2 : .55, .5, along ? .55 : 1.2, b0, x, y, z); ib.box(along ? 1.1 : .45, .14, along ? .45 : 1.1, b1, x + fx * .1, y - .38, z + fz * .1, 0, 0, along ? -.12 : 0);
      for (const sd2 of [-1, 1]) { ib.sph(.1, '#2a2418', x - fx * .25 + (along ? 0 : sd2 * .2), y + .12, z - fz * .25 + (along ? sd2 * .2 : 0), 1); for (let k = 0; k < 6; k++) ib.cone(.035, .14, '#f0ead8', x + fx * (.5 - k * .16) + (along ? 0 : sd2 * .2), y - .3, z + fz * (.5 - k * .16) + (along ? sd2 * .2 : 0), Math.PI); } }
  }
  // l'autobus anni Cinquanta sepolto intero: verde e crema, i finestrini, i sedili a due a due col corridoio, il posto di guida,
  // i manifesti. Il tetto si toglie quando ci sei dentro (come la carrozza della metropolitana).
  function busDecor(g, ib, w, h) {
    const along = w >= h, L0 = Math.min(Math.max(w, h) - 1.2, 10.5), W0 = 2.5, gr = '#3a6a4a', cr = '#e8dcbc', P = (s, lat) => along ? [s, lat] : [lat, s];
    const B = (ls, lw, hh, c, s, lat, y, o, ib2) => { const [x, z] = P(s, lat); (ib2 || ib).box(along ? ls : lw, hh, along ? lw : ls, c, x, y, z, 0, 0, 0, o); };
    B(L0, W0, .1, '#3a3a3a', 0, 0, .55);   // il pianale
    for (const sd of [-1, 1]) { B(L0, .08, .8, gr, 0, sd * W0 / 2, .95); B(L0, .08, .25, cr, 0, sd * W0 / 2, 2.32);
      for (let s = -L0 / 2 + .35; s <= L0 / 2 - .2; s += 1.15) B(.18, .08, 1, cr, s, sd * W0 / 2, 1.85);   // i montanti fra i finestrini
      for (let s = -L0 / 2 + .9; s <= L0 / 2 - .6; s += 1.15) { B(.95, .03, .85, '#9ab0b0', s, sd * (W0 / 2 + .01), 1.85, { m: { transparent: true, opacity: .35, metalness: .2, roughness: .1 } }); } }
    B(.08, W0, 1.9, gr, -L0 / 2, 0, 1.45); B(.08, W0, .7, gr, L0 / 2, 0, .9); B(.08, W0, .9, '#9ab0b0', L0 / 2, 0, 1.8, { m: { transparent: true, opacity: .35 } });
    B(.6, W0 - .2, .5, gr, L0 / 2 + .25, 0, .7);   // il muso
    for (const [s, sd] of [[L0 / 2 - 1.4, -1], [L0 / 2 - 1.4, 1], [-L0 / 2 + 1.8, -1], [-L0 / 2 + 1.8, 1]]) { const [x, z] = P(s, sd * (W0 / 2 - .1)); ib.cyl(.48, .3, '#1a1a1a', x, .45, z, along ? 0 : Math.PI / 2, Math.PI / 2, 0); }
    for (let s = -L0 / 2 + 1; s <= L0 / 2 - 1.6; s += .95) for (const sd of [-1, 1]) { B(.5, .9, .1, '#7a2a2a', s, sd * .72, 1.0); B(.12, .9, .55, '#7a2a2a', s - .25, sd * .72, 1.25); }   // i sedili, il corridoio in mezzo
    { const [x, z] = P(L0 / 2 - .7, -.6); ib.cyl(.22, .03, '#1a1a1a', x, 1.3, z, 0, .9, 0); B(.5, .5, .1, '#5a3a2a', L0 / 2 - 1.1, -.6, 1.0); }
    // i manifesti dentro (una pubblicità e l'orario) e la tabella del capolinea
    { const m = new THREE.MeshBasicMaterial({ map: writeTex('bus1', ['LINEA 4 · PORTO — STAZIONE', 'corse ogni 20 minuti', 'vietato fumare e sputare'], '#e8dcbc', '#2a3a2a') }), m2 = new THREE.MeshBasicMaterial({ map: writeTex('bus2', ['CAPOLINEA', 'PORTO VECCHIO'], '#1a1a1a', '#f0e8d0') });
      const [x, z] = P(-L0 / 2 + .06, 0), p1 = plane(g, 1.4, .7, m, x, 1.8, z, 0, along ? Math.PI / 2 : 0); const [x2, z2] = P(L0 / 2 + .05, 0), p2 = plane(g, 1.6, .35, m2, x2, 2.25, z2, 0, along ? Math.PI / 2 : 0); }
    // il tetto, a parte: si spegne quando ci sei dentro
    const roof = new THREE.Mesh(new THREE.BoxGeometry(along ? L0 + .1 : W0 + .1, .12, along ? W0 + .1 : L0 + .1), mat(cr)); roof.position.set(0, 2.5, 0); roof.name = 'tetto'; g.add(roof);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(along ? L0 * .8 : .3, .03, along ? .3 : L0 * .8), glow('#fff0c0', .5)); strip.position.set(0, 2.42, 0); g.add(strip);
    g.userData.bus = { along, L0, W0 };
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
      // [pulizia2] il tombino che si apre si trova al primo sguardo: l'anello di ghisa in rilievo, chiaro e lucido (il bordo che riflette),
      // il disco scuro un po' più in basso con la croce e la scritta, l'ombra morbida attorno. Quelli dipinti delle strade restano piatti.
      const tex = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#1c1c1f'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#3a3a3e'; x.lineWidth = 3; for (let i = 8; i < 60; i += 8) { x.beginPath(); x.moveTo(i, 4); x.lineTo(i, 60); x.stroke(); } x.strokeStyle = '#4a4a50'; x.lineWidth = 2; x.beginPath(); x.arc(32, 32, 27, 0, 6.3); x.stroke(); x.fillStyle = '#5a5a60'; x.font = 'bold 10px Arial'; x.textAlign = 'center'; x.fillText('S.P.Q.', 32, 36); });
      const sh = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 14, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
      const n = tomb.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
      const ombra = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false }), n);
      const anello = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .53, .07, 20), new THREE.MeshStandardMaterial({ color: '#a8a8a2', metalness: .75, roughness: .28, emissive: '#3a3a34', emissiveIntensity: .6 }), n);
      const disco = new THREE.InstancedMesh(new THREE.CylinderGeometry(.41, .41, .07, 18), new THREE.MeshStandardMaterial({ map: tex, color: '#9a9aa0', metalness: .6, roughness: .22 }), n);
      tomb.forEach((P, k) => { const x = cen(P.s[0]), z = cen(P.s[1]), y = R.groundH(x, z);
        m4.compose(V.set(x, y + .012, z), q, S1); ombra.setMatrixAt(k, m4); m4.makeTranslation(x, y + .035, z); anello.setMatrixAt(k, m4); m4.makeTranslation(x, y + .03, z); disco.setMatrixAt(k, m4); });
      ombra.renderOrder = 1; anello.receiveShadow = disco.receiveShadow = true; [ombra, anello, disco].forEach(o => { o.frustumCulled = false; g.add(o); });
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
    g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });   // [pulizia2] l'ombra dipinta non fa ombra
    return g;
  }

  // ---------------- OGNI FOTOGRAMMA ----------------
  function gfx(st, R) {
    const scene = R.__models.scene, p = st.player, L = st.lv; if (!L) return;
    if (GFX.scene !== scene || GFX.stRef !== st) {
      if (GFX.scene === scene) { [GFX.surf].concat(Object.values(GFX.people), Object.values(GFX.crates)).forEach(o => o && o.parent && o.parent.remove(o)); }
      if (GFX.scene !== scene) { GFX.chunks = []; GFX.findsBuilt = {}; GFX.ug = buildUnder(); scene.add(GFX.ug); GFX.lights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight('#ffb060', 0, 22, 1.2); l.userData.ugKeep = true; scene.add(l); return l; }); }
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
    // [sotto2] gli arredi si costruiscono quando ti avvicini (al massimo tre stanze per fotogramma); le cavità dei ritrovamenti appena aperte
    if (GFX.pend && GFX.pend.length) { const near = GFX.pend.map(Rm => [Math.hypot(Rm.x - p.x, Rm.y - p.y), Rm]).filter(q => q[0] < 80).sort((a, b) => a[0] - b[0]).slice(0, 3); near.forEach(([, Rm]) => { GFX.pend.splice(GFX.pend.indexOf(Rm), 1); const g = decor(Rm); if (g) addChunk(GFX.root, g, Rm.x, Rm.y); }); }   // prima le più vicine
    GFX.findsBuilt = GFX.findsBuilt || {}; L.rooms.forEach(Rm => { if (!Rm.find || GFX.findsBuilt[Rm.find]) return; GFX.findsBuilt[Rm.find] = 1; const g = decor(Rm); if (g) { g.userData.find = Rm; addChunk(GFX.root, g, Rm.x, Rm.y); } });
    const yaw = (R.cam && R.cam.yaw !== undefined ? R.cam.yaw : Math.PI / 4), sy = Math.sin(yaw), cyw = Math.cos(yaw);
    GFX.chunks.forEach(c => { c.visible = Math.hypot(c.userData.cx - p.x, c.userData.cy - p.y) < 72; if (!c.visible) return;
      // le cose contro le pareti: spente dal lato della camera (lì la parete è tagliata bassa)
      if (c.userData.sides) c.children.forEach(s => { const q = s.userData.side; if (q) s.visible = q[0] * sy + q[1] * cyw <= .3; });
      // l'autobus: dentro, il tetto non c'è
      const bu = c.userData.bus; if (bu) { const dx = p.x - c.userData.cx, dz = p.y - c.userData.cy, inside = Math.abs(bu.along ? dx : dz) < bu.L0 / 2 + .3 && Math.abs(bu.along ? dz : dx) < bu.W0 / 2 + .3; c.traverse(o => { if (o.name === 'tetto') o.visible = !inside; }); } });
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
    GFX.lights.forEach((l, k) => { const q = near[k]; if (!q) { l.intensity = 0; return; } const Lp = q[1]; l.position.set(Lp.x, Lp.f + .3, Lp.y); l.color.set(Lp.c); l.intensity = (Lp.k === 'fuoco' ? 2 + Math.sin(t * 13 + k) * .3 : 1.6) * (1 - q[0] / 45); });
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
      const pv = window.__pv, st = pv && pv.st; if (st && pv.R && pv.R.__models && pv.R.__models.scene) { gfx(st, pv.R); panel(st); digGfx(st, pv.R.__models.scene, !!(st.player.lv && st.player.lv.k === 'ug'), performance.now() / 1000); }
    } catch (e) { if (!GFX.err) { GFX.err = 1; console.error('[Sottosuolo gfx]', e); } }
    requestAnimationFrame(gfxLoop);
  }
  if (typeof window !== 'undefined') { const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 250); return; } requestAnimationFrame(gfxLoop); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0); }

  return { TPL, K, S: S0, decor, step, train, trackAt, metroKey, board, buy, sell, shopView, openCrate, pick, find, goal, reach, arrive, freeSpot, findPath, SHOPS, CACHES, RITROVAMENTI, FINDS_DEF, openFind, findAt, LIGHT, GFX, UI, panel, floorAtXY, get CYC() { return CYC; }, get TT() { return TT; }, DW };
})();
if (typeof module !== 'undefined') module.exports = Sottosuolo;
