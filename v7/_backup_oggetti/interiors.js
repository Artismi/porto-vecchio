
/* Interni: ogni edificio si visita, al massimo due piani. La pianta si genera dalla sagoma dell'edificio
   (sempre uguale): stanze divise a metà finché sono grandi, porte fra le stanze, l'ingresso sulla porta di strada,
   una scala se ci sono due piani, mobili secondo il tipo di stanza. Coordinate in metri, come il mondo.
   Lo usano il motore (dove si cammina, scale, uscita) e la grafica (muri, pavimenti, mobili). */
var Interior = (function () {
  'use strict';
  const TS = 2, WT = .22, CACHE = {};
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // che cos'è l'edificio
  function kindOf(b) {
    if (b.use && b.use !== 'casa' && b.use !== 'cascina') return b.use;
    if (b.church) return 'chiesa';
    if (b.id === 'officina') return 'officina';
    if (b.warehouse || b.id === 'cantiere' || /hangar|miniera/.test(b.id)) return 'deposito';
    if (b.id === 'commissariato' || b.id === 'caserma_p' || b.id === 'rocca') return 'caserma';
    if (/bar|osteria|sirena|car_2|gelateria|osteria_sg|chiosco/.test(b.id) || (b.sign && /BAR|TRATTORIA|OSTERIA|GELATI/.test(b.sign.t))) return 'bar';
    if (b.id === 'cinema') return 'cinema';
    if (b.id === 'flipper') return 'sala_giochi';
    if (b.shop || b.sign || /wu|video|disco|benzina/.test(b.id)) return 'bottega';
    if (/miramare|flamingo|paradiso|oceano|gabbiano/.test(b.id)) return 'albergo';
    if (b.id === 'biblioteca') return 'biblioteca';
    if (b.id === 'ambulatorio') return 'ambulatorio';
    return 'casa';
  }
  function layout(b) {
    const key = b.i !== undefined ? b.i : b.id; if (CACHE[key]) return CACHE[key];
    const r = rng((b.x * 7919 + b.y * 104729) >>> 0), kind = kindOf(b), X0 = b.x * TS, Y0 = b.y * TS, W = b.w * TS, H = b.h * TS;
    const floors = Math.min(2, Math.max(1, b.fl || 1));
    // ---- l'ingresso: sul lato che tocca la casella della porta ----
    let ent = null;
    if (b.door) {
      const [dx, dy] = b.door, cx = dx * TS + 1, cy = dy * TS + 1;
      if (dy < b.y) ent = { side: 'N', x: cx, y: Y0, out: [cx, Y0 - 1], in: [cx, Y0 + 1.1] };
      else if (dy >= b.y + b.h) ent = { side: 'S', x: cx, y: Y0 + H, out: [cx, Y0 + H + 1], in: [cx, Y0 + H - 1.1] };
      else if (dx < b.x) ent = { side: 'W', x: X0, y: cy, out: [X0 - 1, cy], in: [X0 + 1.1, cy] };
      else ent = { side: 'E', x: X0 + W, y: cy, out: [X0 + W + 1, cy], in: [X0 + W - 1.1, cy] };
    }
    // ---- stanze: divisione binaria lungo le linee delle caselle ----
    const rooms = [], inner = [];   // inner: muri interni {a:[x,y], b:[x,y], gap:[c, w]}
    const split = (tx, ty, tw, th, depth) => {
      const open = kind === 'chiesa' || kind === 'deposito' || kind === 'officina' || kind === 'fabbrica' || ((kind === 'teatro' || kind === 'cinema' || kind === 'palestra') && depth === 0) || (kind === 'bar' && depth === 0 && tw * th <= 30);
      const can = !open && depth < 3 && (tw >= 5 || th >= 5) && tw * th > 12;
      if (!can) { rooms.push({ tx, ty, tw, th }); return; }
      const vert = tw > th ? true : tw < th ? false : r() < .5;
      if (vert) { const k = 2 + Math.floor(r() * (tw - 3)); const gx = (tx + k) * TS, gy = (ty + Math.floor(r() * th)) * TS + 1; inner.push({ a: [gx, ty * TS], b: [gx, (ty + th) * TS], gap: [gy, 1.3], v: true }); split(tx, ty, k, th, depth + 1); split(tx + k, ty, tw - k, th, depth + 1); }
      else { const k = 2 + Math.floor(r() * (th - 3)); const gy = (ty + k) * TS, gx = (tx + Math.floor(r() * tw)) * TS + 1; inner.push({ a: [tx * TS, gy], b: [(tx + tw) * TS, gy], gap: [gx, 1.3], v: false }); split(tx, ty, tw, k, depth + 1); split(tx, ty + k, tw, th - k, depth + 1); }
    };
    split(b.x, b.y, b.w, b.h, 0);
    // la stanza d'ingresso
    const roomAt = (x, y) => rooms.find(q => x >= q.tx * TS && x <= (q.tx + q.tw) * TS && y >= q.ty * TS && y <= (q.ty + q.th) * TS);
    const entRoom = ent ? roomAt(ent.in[0], ent.in[1]) : rooms[0];
    // ---- scala: in una stanza del piano terra, contro un muro, due caselle ----
    let stairs = null;
    if (floors > 1) {
      const cand = rooms.slice().sort((p, q) => (q === entRoom) - (p === entRoom) || q.tw * q.th - p.tw * p.th);
      const gapNear = (x, y, w, h) => inner.some(q => { const gx = q.v ? q.a[0] : q.gap[0], gy = q.v ? q.gap[0] : q.a[1]; return gx > x - 1.6 && gx < x + w + 1.6 && gy > y - 1.6 && gy < y + h + 1.6; });
      for (const q of cand) {
        if (q.tw >= 2 && q.th >= 3 && !gapNear((q.tx + q.tw - 1) * TS, q.ty * TS, TS, 2 * TS)) { const sx = q.tx + q.tw - 1, sy = q.ty; stairs = { x: sx * TS, y: sy * TS, w: TS, h: 2 * TS, dir: 'S', top: [sx * TS, sy * TS, TS, TS], foot: [sx * TS + 1, (sy + 2) * TS + .9], landing: [sx * TS - 1, sy * TS + 1] }; break; }
        if (q.th >= 2 && q.tw >= 3 && !gapNear(q.tx * TS, (q.ty + q.th - 1) * TS, 2 * TS, TS)) { const sx = q.tx, sy = q.ty + q.th - 1; stairs = { x: sx * TS, y: sy * TS, w: 2 * TS, h: TS, dir: 'E', top: [sx * TS, sy * TS, TS, TS], foot: [(sx + 2) * TS + .9, sy * TS + 1], landing: [sx * TS + 1, sy * TS - 1] }; break; }
      }
      for (const q of []) {
        if (q.tw >= 2 && q.th >= 3) { const sx = q.tx + q.tw - 1, sy = q.ty; stairs = { x: sx * TS, y: sy * TS, w: TS, h: 2 * TS, dir: 'S', top: [sx * TS, sy * TS, TS, TS], foot: [sx * TS + 1, (sy + 2) * TS + .9], landing: [sx * TS - 1, sy * TS + 1] }; break; }
        if (q.th >= 2 && q.tw >= 3) { const sx = q.tx, sy = q.ty + q.th - 1; stairs = { x: sx * TS, y: sy * TS, w: 2 * TS, h: TS, dir: 'E', top: [sx * TS, sy * TS, TS, TS], foot: [(sx + 2) * TS + .9, sy * TS + 1], landing: [sx * TS + 1, sy * TS - 1] }; break; }
      }
      // la cima non deve chiudere l'ingresso
      if (stairs && ent && Math.hypot(stairs.top[0] + 1 - ent.in[0], stairs.top[1] + 1 - ent.in[1]) < 2) stairs = null;
    }
    // ---- muri: perimetro con la porta, muri interni con i passaggi ----
    const wallsOf = (f) => {
      const w = [];
      const seg = (x0, y0, x1, y1, gap) => {   // segmento orizzontale o verticale, con un eventuale varco [centro, larghezza]
        const v = x0 === x1;
        if (!gap) { w.push(v ? [x0 - WT / 2, Math.min(y0, y1), WT, Math.abs(y1 - y0)] : [Math.min(x0, x1), y0 - WT / 2, Math.abs(x1 - x0), WT]); return; }
        const [c, gw] = gap, a = v ? Math.min(y0, y1) : Math.min(x0, x1), bb = v ? Math.max(y0, y1) : Math.max(x0, x1);
        if (c - gw / 2 > a) w.push(v ? [x0 - WT / 2, a, WT, c - gw / 2 - a] : [a, y0 - WT / 2, c - gw / 2 - a, WT]);
        if (c + gw / 2 < bb) w.push(v ? [x0 - WT / 2, c + gw / 2, WT, bb - c - gw / 2] : [c + gw / 2, y0 - WT / 2, bb - c - gw / 2, WT]);
      };
      const g = s => f === 0 && ent && ent.side === s ? [s === 'N' || s === 'S' ? ent.x : ent.y, 1.5] : null;
      seg(X0, Y0, X0 + W, Y0, g('N')); seg(X0, Y0 + H, X0 + W, Y0 + H, g('S')); seg(X0, Y0, X0, Y0 + H, g('W')); seg(X0 + W, Y0, X0 + W, Y0 + H, g('E'));
      inner.forEach(q => seg(q.a[0], q.a[1], q.b[0], q.b[1], q.gap));
      return w;
    };
    // ---- che stanza è ----
    const NAMES = {
      casa: [['soggiorno', 'cucina', 'bagno', 'ripostiglio'], ['camera', 'camera', 'bagno', 'studio']],
      bar: [['sala', 'retro', 'bagno', 'magazzino'], ['camera', 'cucina', 'bagno', 'ripostiglio']],
      bottega: [['bottega', 'retro', 'magazzino', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      albergo: [['hall', 'sala', 'cucina', 'bagno'], ['stanza', 'stanza', 'stanza', 'bagno']],
      caserma: [['ufficio', 'cella', 'ufficio', 'armeria'], ['camerata', 'ufficio', 'bagno', 'archivio']],
      biblioteca: [['lettura', 'scaffali', 'archivio', 'bagno'], ['scaffali', 'archivio', 'lettura', 'bagno']],
      ambulatorio: [['attesa', 'visite', 'farmacia', 'bagno'], ['studio', 'archivio', 'bagno', 'camera']],
      officina: [['officina'], ['soppalco']], chiesa: [['navata'], ['cantoria']], deposito: [['deposito'], ['soppalco']],
      teatro: [['platea', 'quinte', 'camerino', 'bagno'], ['galleria', 'camerino', 'archivio', 'bagno']], cinema: [['sala_cinema', 'atrio', 'cabina', 'bagno'], ['galleria', 'cabina', 'ufficio', 'bagno']],
      palestra: [['palestra', 'spogliatoio', 'bagno', 'ufficio'], ['palestra', 'spogliatoio', 'bagno', 'ripostiglio']], ferramenta: [['ferramenta', 'magazzino', 'retro', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      ufficio: [['ingresso_uff', 'ufficio', 'ufficio', 'archivio'], ['ufficio', 'ufficio', 'archivio', 'bagno']], barbiere: [['barbiere', 'retro', 'bagno', 'magazzino'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      tabacchi: [['tabacchi', 'retro', 'magazzino', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']], panetteria: [['panetteria', 'forno', 'magazzino', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      farmacia: [['farmacia', 'retro', 'archivio', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']], lavanderia: [['lavanderia', 'retro', 'magazzino', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      tipografia: [['tipografia', 'magazzino', 'ufficio', 'bagno'], ['archivio', 'camera', 'bagno', 'cucina']], circolo: [['circolo', 'bar_circolo', 'biliardo', 'bagno'], ['sala_riunioni', 'archivio', 'bagno', 'ufficio']],
      scuola: [['aula', 'aula', 'corridoio', 'bagno'], ['aula', 'aula', 'presidenza', 'bagno']], sartoria: [['sartoria', 'prova', 'magazzino', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      pescheria: [['pescheria', 'cella_frigo', 'retro', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']], fabbrica: [['reparto'], ['uffici']], sala_giochi: [['sala_giochi', 'retro', 'bagno', 'magazzino'], ['camera', 'soggiorno', 'bagno', 'cucina']],
      banca: [['sportelli', 'caveau', 'ufficio', 'bagno'], ['ufficio', 'archivio', 'bagno', 'ufficio']],   // [soldi]
    }[kind] || [['bottega', 'retro', 'magazzino', 'bagno'], ['camera', 'soggiorno', 'bagno', 'cucina']];   // [soldi] le botteghe nuove (Emporio, macelleria, fabbro…) senza stanze proprie
    const smallFirst = rooms.slice().sort((p, q) => p.tw * p.th - q.tw * q.th);
    const named = f => { const ns = NAMES[f] || NAMES[0], out = new Map(); out.set(entRoom, f === 0 ? ns[0] : ns[1 % ns.length]); let k = 1; rooms.filter(q => q !== entRoom).sort((p, q) => q.tw * q.th - p.tw * p.th).forEach(q => { out.set(q, ns[Math.min(ns.length - 1, k++)]); }); if (rooms.length > 2 && ns.includes('bagno')) out.set(smallFirst.find(q => q !== entRoom) || smallFirst[0], 'bagno'); return out; };
    // ---- mobili: contro i muri, lontano dai varchi ----
    const FUR = {
      sportelli: ['kitchenBar', 'kitchenBar', 'kitchenBar', 'chairDesk', 'chairDesk', 'computerScreen', 'bench', 'pottedPlant', 'ar_cash-register'], caveau: ['bookcaseClosedWide', 'bookcaseClosedWide', 'cardboardBoxClosed', 'cardboardBoxClosed'],   // [soldi]
      soggiorno: ['loungeSofa', 'tableCoffee', 'cabinetTelevision', 'televisionVintage', 'lampRoundFloor', 'bookcaseOpen', 'pottedPlant', 'rugRectangle'],
      cucina: ['kitchenCabinet', 'kitchenSink', 'kitchenStove', 'kitchenFridge', 'kitchenCabinetDrawer', 'table', 'chair', 'chair'],
      camera: ['bedDouble', 'sideTable', 'bookcaseClosedWide', 'coatRackStanding', 'rugRound'], stanza: ['bedSingle', 'bedSingle', 'sideTable', 'chair'],
      bagno: ['toilet', 'bathroomSink', 'bathtub'], studio: ['desk', 'chairDesk', 'bookcaseOpen', 'radio', 'lampRoundFloor', 'pv_banco_lavoro'],
      ripostiglio: ['pv_banco_lavoro', 'cardboardBoxClosed', 'cardboardBoxClosed', 'washer', 'bookcaseOpenLow'], magazzino: ['cardboardBoxClosed', 'cardboardBoxClosed', 'cardboardBoxClosed', 'bookcaseOpen', 'pv_banco_lavoro'],
      sala: ['kitchenBar', 'kitchenBar', 'kitchenBar', 'stoolBar', 'stoolBar', 'tableRound', 'chair', 'chair', 'tableRound', 'speaker', 'kitchenCoffeeMachine', 'pv_banco_vendita'],
      retro: ['kitchenStove', 'kitchenSink', 'kitchenFridge', 'cardboardBoxClosed', 'trashcan', 'pv_banco_lavoro'],
      bottega: ['pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpenLow', 'cardboardBoxClosed', 'pottedPlant'],
      hall: ['kitchenBar', 'kitchenBar', 'loungeSofa', 'loungeChair', 'pottedPlant', 'rugRectangle', 'coatRackStanding'],
      ufficio: ['desk', 'chairDesk', 'computerScreen', 'bookcaseClosedWide', 'desk', 'chairDesk'], cella: ['bench', 'toilet'], armeria: ['bookcaseClosedWide', 'cardboardBoxClosed', 'cardboardBoxClosed'],
      camerata: ['bedSingle', 'bedSingle', 'bedSingle', 'bedSingle'], archivio: ['bookcaseClosedWide', 'bookcaseClosedWide', 'bookcaseOpen'],
      lettura: ['table', 'chair', 'chair', 'table', 'chair', 'bookcaseOpen', 'lampRoundFloor'], scaffali: ['bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseClosedWide'],
      attesa: ['bench', 'bench', 'pottedPlant', 'desk'], visite: ['bedSingle', 'desk', 'chairDesk', 'bathroomSink'], farmacia: ['pv_banco_vendita', 'bookcaseOpen', 'bookcaseOpen', 'kitchenBar'],
      navata: ['bench', 'bench', 'bench', 'bench', 'bench', 'bench', 'tableCloth', 'pottedPlant', 'pottedPlant'], cantoria: ['bench', 'bench', 'speaker'],
      platea: ['rc_screen', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'speaker', 'speaker'], galleria: ['rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat'],
      sala_cinema: ['rc_screen', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'rc_seat', 'speaker', 'speaker'], atrio: ['kitchenBar', 'kitchenBar', 'ar_vending-machine', 'pottedPlant', 'fd_cup-coffee', 'pv_banco_vendita'], cabina: ['rc_cinecamera', 'bookcaseOpen', 'cardboardBoxClosed'],
      quinte: ['rc_cinecamera', 'coatRackStanding', 'cardboardBoxClosed', 'cardboardBoxClosed'], camerino: ['desk', 'chair', 'coatRackStanding', 'bathroomSink', 'loungeChair'],
      palestra: ['rugRectangle', 'rugRectangle', 'bench', 'bench', 'fx_box-large', 'fx_box-small', 'fx_box-small', 'rc_glove', 'speaker', 'pottedPlant'], spogliatoio: ['bench', 'bench', 'shower', 'coatRackStanding', 'bookcaseClosedWide'],
      ferramenta: ['pv_banco_vendita', 'pv_banco_lavoro', 'kitchenBar', 'kitchenBar', 'ar_cash-register', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpen', 'bookcaseOpenLow', 'fx_box-small', 'fx_box-small', 'cardboardBoxClosed'],
      ingresso_uff: ['desk', 'chairDesk', 'computerScreen', 'loungeChair', 'loungeChair', 'pottedPlant', 'coatRackStanding'],
      barbiere: ['loungeChair', 'loungeChair', 'bathroomSink', 'bathroomSink', 'bench', 'coatRackStanding', 'ar_cash-register'], tabacchi: ['pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'ar_cash-register', 'bookcaseOpen', 'ar_vending-machine', 'ar_gambling-machine'],
      panetteria: ['pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'kitchenBar', 'fd_loaf-baguette', 'fd_bread', 'fd_croissant', 'fd_cake', 'ar_cash-register', 'bookcaseOpen'], forno: ['pv_banco_lavoro', 'kitchenStove', 'kitchenStove', 'table', 'fd_bread', 'kitchenCabinet', 'cardboardBoxClosed'],
      lavanderia: ['washer', 'washer', 'washer', 'washer', 'bench', 'kitchenBar', 'ar_cash-register'], tipografia: ['pv_banco_lavoro', 'fx_machine', 'fx_machine', 'table', 'cardboardBoxClosed', 'cardboardBoxClosed', 'bookcaseOpen'],
      circolo: ['tableRound', 'chair', 'chair', 'tableRound', 'chair', 'chair', 'televisionVintage', 'cabinetTelevision', 'speaker'], bar_circolo: ['kitchenBar', 'kitchenBar', 'stoolBar', 'stoolBar', 'fd_wine-red', 'fd_glass-wine', 'kitchenFridge'],
      biliardo: ['table', 'table', 'chair', 'chair', 'coatRackStanding'], sala_riunioni: ['table', 'chair', 'chair', 'chair', 'chair', 'table', 'chair', 'chair', 'radio'],
      aula: ['desk', 'chair', 'desk', 'chair', 'desk', 'chair', 'desk', 'chair', 'bookcaseOpen', 'desk', 'chairDesk'], corridoio: ['coatRackStanding', 'coatRackStanding', 'bench'], presidenza: ['desk', 'chairDesk', 'bookcaseClosedWide', 'radio'],
      sartoria: ['table', 'table', 'chair', 'chair', 'coatRackStanding', 'coatRackStanding', 'bookcaseOpen', 'rugRectangle', 'pv_banco_lavoro'], prova: ['coatRackStanding', 'loungeChair', 'rugRound'],
      pescheria: ['pv_banco_vendita', 'kitchenBar', 'kitchenBar', 'fd_fish', 'fd_fish', 'fd_barrel', 'fd_barrel', 'ar_cash-register', 'kitchenSink'], cella_frigo: ['kitchenFridge', 'kitchenFridge', 'fd_barrel', 'fd_barrel'],
      reparto: ['fx_machine', 'fx_machine', 'fx_machine', 'fx_conveyor-long', 'fx_conveyor-long', 'fx_robot-arm-a', 'fx_hopper-round', 'fx_box-large', 'fx_box-large', 'fx_box-small', 'fx_scanner-high', 'fx_screen-wide', 'fx_pipe-large-long'], uffici: ['desk', 'chairDesk', 'computerScreen', 'desk', 'chairDesk', 'bookcaseClosedWide'],
      sala_giochi: ['ar_arcade-machine', 'ar_arcade-machine', 'ar_pinball', 'ar_pinball', 'ar_claw-machine', 'ar_air-hockey', 'ar_dance-machine', 'ar_gambling-machine', 'ar_basketball-game', 'ar_prizes', 'ar_cash-register', 'ar_vending-machine'],
      officina: ['pv_ponte', 'pv_ponte', 'pv_banco_lavoro', 'pv_banco_lavoro', 'pv_attrezzi', 'pv_attrezzi', 'pv_pneumatici', 'pv_pneumatici', 'cardboardBoxClosed', 'trashcan'],
      deposito: ['cardboardBoxClosed', 'cardboardBoxClosed', 'cardboardBoxClosed', 'cardboardBoxClosed', 'bookcaseOpen', 'washer', 'trashcan', 'pv_banco_lavoro'], soppalco: ['cardboardBoxClosed', 'cardboardBoxClosed'],
    };
    // ingombro reale in metri (modelli a scala 2): [larghezza lungo il muro, profondità, solido]
    const SZ = { pv_banco_lavoro: [1.8, .7, 1], pv_banco_vendita: [2, .68, 1], pv_ponte: [2, 4, 0], pv_attrezzi: [.64, .54, 1], pv_pneumatici: [.7, .7, 0], loungeSofa: [2, .85, 1], tableCoffee: [1.3, .8, 0], cabinetTelevision: [1.6, .5, 1], televisionVintage: [.8, .5, 0], lampRoundFloor: [.4, .4, 0], bookcaseOpen: [.8, .5, 1], bookcaseOpenLow: [.8, .5, 1], bookcaseClosedWide: [1.6, .5, 1],
      pottedPlant: [.5, .5, 0], rugRectangle: [3.1, 1.8, 0], rugRound: [1.8, 1.8, 0], kitchenCabinet: [.9, .9, 1], kitchenCabinetDrawer: [.9, .9, 1], kitchenSink: [.9, .9, 1], kitchenStove: [.9, .9, 1], kitchenFridge: [.9, .6, 1],
      table: [1.7, .9, 1], tableRound: [1.4, 1.6, 1], tableCloth: [1.7, .9, 1], chair: [.45, .45, 0], bedDouble: [1.9, 2.3, 1], bedSingle: [1.15, 2.3, 1], sideTable: [1.05, .45, 0], coatRackStanding: [.55, .55, 0],
      toilet: [.65, .95, 1], bathroomSink: [.7, .6, 0], bathtub: [2.4, 1.1, 1], desk: [1.45, .8, 1], chairDesk: [.65, .6, 0], radio: [.65, .2, 0], cardboardBoxClosed: [.45, .45, 0], washer: [.8, .8, 1],
      kitchenBar: [.9, .45, 1], rc_screen: [5.6, .5, 1], rc_seat: [.65, .6, 1], rc_cinecamera: [1, 1, 1], rc_glove: [.4, .4, 0],
      'fx_machine': [2.4, 3, 1], 'fx_conveyor-long': [2, 4, 1], 'fx_robot-arm-a': [2, 2, 1], 'fx_hopper-round': [2.2, 2.2, 1], 'fx_box-large': [2.2, 2, 1], 'fx_box-small': [1, 1, 0], 'fx_scanner-high': [1, 3.6, 1], 'fx_screen-wide': [2.4, 1, 0], 'fx_pipe-large-long': [2, 4, 1],
      'ar_arcade-machine': [1, 1.4, 1], 'ar_pinball': [1.3, 1.9, 1], 'ar_claw-machine': [1.7, 1.7, 1], 'ar_air-hockey': [2.5, 1.8, 1], 'ar_dance-machine': [1.8, 2.5, 1], 'ar_gambling-machine': [1.3, 1.2, 1], 'ar_basketball-game': [1.6, 2.5, 1], 'ar_prizes': [2, 1, 1], 'ar_cash-register': [1.1, .6, 0], 'ar_vending-machine': [1.3, 1.2, 1],
      'fd_loaf-baguette': [.5, .2, 0], fd_bread: [.3, .3, 0], fd_croissant: [.3, .3, 0], fd_cake: [.5, .5, 0], 'fd_wine-red': [.15, .15, 0], 'fd_glass-wine': [.15, .15, 0], 'fd_cup-coffee': [.15, .15, 0], fd_fish: [.2, .4, 0], fd_barrel: [.85, .85, 1], fd_cheese: [.4, .4, 0], stoolBar: [.55, .5, 0], speaker: [.3, .3, 0], kitchenCoffeeMachine: [.4, .5, 0], trashcan: [.45, .45, 0], loungeChair: [1, .85, 1], bench: [.8, .4, 0], computerScreen: [.8, .2, 0] };
    const furnish = (f, walls, names) => {
      const out = [], used = [];
      const hitsGap = (x, y, R) => {   // vicino a un varco o all'ingresso o alla scala: lascia libero
        if (f === 0 && ent && Math.hypot(x - ent.in[0], y - ent.in[1]) < R + 1.4) return true;
        for (const q of inner) { const gx = q.v ? q.a[0] : q.gap[0], gy = q.v ? q.gap[0] : q.a[1]; if (Math.hypot(x - gx, y - gy) < R + 1.2) return true; }
        if (stairs && x > stairs.x - .8 && x < stairs.x + stairs.w + .8 && y > stairs.y - .8 && y < stairs.y + stairs.h + .8) return true;
        if (stairs && (Math.hypot(x - stairs.foot[0], y - stairs.foot[1]) < R + 1 || Math.hypot(x - stairs.landing[0], y - stairs.landing[1]) < R + 1)) return true;
        return false;
      };
      rooms.forEach(q => {
        const name = names.get(q), list = (FUR[name] || []).slice(), x0 = q.tx * TS + .15, y0 = q.ty * TS + .15, x1 = (q.tx + q.tw) * TS - .15, y1 = (q.ty + q.th) * TS - .15;
        // giro dei muri della stanza: nord, est, sud, ovest; ogni mobile trova il primo posto libero
        const slots = [];
        for (let x = x0 + .5; x < x1 - .5; x += .5) slots.push([x, y0, 0]);
        for (let y = y0 + .5; y < y1 - .5; y += .5) slots.push([x1, y, Math.PI / 2]);
        for (let x = x1 - .5; x > x0 + .5; x -= .5) slots.push([x, y1, Math.PI]);
        for (let y = y1 - .5; y > y0 + .5; y -= .5) slots.push([x0, y, -Math.PI / 2]);
        const off = Math.floor(r() * slots.length);
        const centerItems = ['pv_ponte', 'rugRectangle', 'rugRound', 'tableCoffee', 'tableRound', 'table'];
        // sale a file: platea, cinema, aule, chiesa, riunioni — palco o lavagna contro il muro di fondo, posti in file con il corridoio in mezzo
        if (['platea', 'sala_cinema', 'galleria', 'aula', 'navata', 'sala_riunioni'].includes(name) && q.tw >= 3 && q.th >= 3) {
          const seat = list.find(i => /seat|chair|bench/.test(i)) || 'chair', head = list.find(i => /screen|desk|tableCloth/.test(i));
          const cx = (x0 + x1) / 2;
          if (head) { const [hw, hd] = SZ[head] || [1.5, .8]; out.push({ id: head, x: cx, y: y0 + hd / 2 + .1, ry: 0, solid: [cx - hw / 2, y0, hw, hd + .1] }); }
          const [sw0, sd0] = SZ[seat] || [.6, .6], stepX = Math.max(.75, sw0 + .15);
          for (let y = y0 + 2.6; y < y1 - 1.2; y += 1.25) for (let xx = x0 + .6; xx < x1 - .5; xx += stepX) {
            if (Math.abs(xx - cx) < .7) continue;      // corridoio
            if (hitsGap(xx, y, .5)) continue;
            out.push({ id: seat, x: xx, y, ry: Math.PI, solid: [xx - sw0 / 2, y - sd0 / 2, sw0, sd0] });
          }
          return;
        }
        const tops = [];
        list.forEach(id => {
          const [sw, sd, solid] = SZ[id] || [.8, .8, 0];
          if (centerItems.includes(id) && q.tw >= 2 && q.th >= 2) {
            const cx = (x0 + x1) / 2 + (r() - .5) * .6, cy = (y0 + y1) / 2 + (r() - .5) * .6, rot = q.tw >= q.th ? 0 : Math.PI / 2;
            const hw = (rot ? sd : sw) / 2, hd = (rot ? sw : sd) / 2;
            if (hitsGap(cx, cy, Math.max(hw, hd) * .6) || used.some(u => Math.abs(u[0] - cx) < u[2] + hw && Math.abs(u[1] - cy) < u[3] + hd && u[4])) return;
            out.push({ id, x: cx, y: cy, ry: rot, solid: solid ? [cx - hw, cy - hd, hw * 2, hd * 2] : null }); used.push([cx, cy, hw, hd, id.indexOf('rug') < 0]); return;
          }
          if (/^fd_/.test(id) && !/barrel/.test(id)) { const t = out.find(o => /kitchenBar|^table|kitchenCabinet/.test(o.id) && o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1 && !o.full); if (t) { t.full = (t.full || 0) + 1; out.push({ id, x: t.x + (r() - .5) * .4, y: t.y + (r() - .5) * .2, h: /kitchenBar|kitchenCabinet/.test(t.id) ? .9 : .68, ry: r() * 6, solid: null }); } return; }
          for (let k = 0; k < slots.length; k++) {
            const [sx, sy, rot] = slots[(k + off) % slots.length], alongX = rot === 0 || rot === Math.PI;
            const hw = (alongX ? sw : sd) / 2, hd = (alongX ? sd : sw) / 2;
            const cx = rot === Math.PI / 2 ? sx - hw : rot === -Math.PI / 2 ? sx + hw : sx, cy = rot === 0 ? sy + hd : rot === Math.PI ? sy - hd : sy;
            if (cx - hw < x0 - .01 || cx + hw > x1 + .01 || cy - hd < y0 - .01 || cy + hd > y1 + .01) continue;
            if (hitsGap(cx, cy, Math.max(hw, hd))) continue;
            if (used.some(u => Math.abs(u[0] - cx) < u[2] + hw + .05 && Math.abs(u[1] - cy) < u[3] + hd + .05)) continue;
            // i mobili guardano verso il centro della stanza: il modello ha il davanti verso +z
            out.push({ id, x: cx, y: cy, ry: rot === 0 ? 0 : rot === Math.PI ? Math.PI : rot === Math.PI / 2 ? -Math.PI / 2 : Math.PI / 2, solid: solid ? [cx - hw, cy - hd, hw * 2, hd * 2] : null });
            used.push([cx, cy, hw, hd, 1]); return;
          }
        });
      });
      return out;
    };
    const fl = [];
    const nF = stairs ? floors : 1;
    for (let f = 0; f < nF; f++) {
      const names = named(f), walls = wallsOf(f);
      fl.push({ walls, rooms: rooms.map(q => ({ x: q.tx * TS, y: q.ty * TS, w: q.tw * TS, h: q.th * TS, name: names.get(q) })), furn: furnish(f, walls, names) });
    }
    const L = { b, kind, floors: fl, ent, stairs, box: [X0, Y0, W, H] };
    // tutto deve essere raggiungibile: se un mobile chiude il passaggio, si toglie (prima i più ingombranti)
    for (let f = 0; f < fl.length; f++) {
      for (let tries = 0; tries < 30; tries++) {
        if (reachAll(L, f)) break;
        const solid = fl[f].furn.filter(o => o.solid); if (!solid.length) break;
        // il mobile pieno più vicino a un varco o alla scala
        const pts = inner.map(q => q.v ? [q.a[0], q.gap[0]] : [q.gap[0], q.a[1]]); if (stairs) pts.push(stairs.foot, stairs.landing); if (ent && f === 0) pts.push(ent.in);
        let best = null, bd = 1e9; solid.forEach(o => pts.forEach(p => { const d = Math.hypot(o.x - p[0], o.y - p[1]); if (d < bd) { bd = d; best = o; } }));
        fl[f].furn.splice(fl[f].furn.indexOf(best), 1);
      }
    }
    CACHE[key] = L; return L;
  }
  function reachAll(L, f) {
    const [X0, Y0, W, H] = L.box, S = .5, F = L.floors[f];
    const start = f === 0 ? (L.ent ? L.ent.in : null) : L.stairs && L.stairs.landing; if (!start) return true;
    const nx = Math.ceil(W / S), ny = Math.ceil(H / S), seen = new Uint8Array(nx * ny), q = [];
    const id = (x, y) => Math.floor((y - Y0) / S) * nx + Math.floor((x - X0) / S);
    const ok = (x, y) => x > X0 && y > Y0 && x < X0 + W && y < Y0 + H && walk(L, f, x, y, .3);
    if (!ok(start[0], start[1])) return false;
    q.push(start); seen[id(start[0], start[1])] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) { const a = x + dx, c = y + dy; if (!ok(a, c)) continue; const k = id(a, c); if (seen[k]) continue; seen[k] = 1; q.push([a, c]); } }
    for (const r of F.rooms) { let hit = false; for (let x = r.x + .25; x < r.x + r.w && !hit; x += S) for (let y = r.y + .25; y < r.y + r.h && !hit; y += S) if (seen[id(x, y)]) hit = true; if (!hit) return false; }
    if (f === 0 && L.stairs && !seen[id(L.stairs.top[0] + 1, L.stairs.top[1] + 1)] && !seen[id(L.stairs.foot[0], L.stairs.foot[1])]) return false;
    return true;
  }
  // si può stare lì? (cerchio di raggio rr): dentro la sagoma, fuori dai muri e dai mobili pieni; il varco d'ingresso porta fuori
  function walk(L, f, x, y, rr) {
    const [X0, Y0, W, H] = L.box, F = L.floors[f]; if (!F) return false;
    const inBox = x - rr > X0 && x + rr < X0 + W && y - rr > Y0 && y + rr < Y0 + H;
    if (!inBox) {
      // solo dal varco d'ingresso, al piano terra
      if (f !== 0 || !L.ent) return false;
      const e = L.ent, along = e.side === 'N' || e.side === 'S' ? Math.abs(x - e.x) : Math.abs(y - e.y);
      if (along > .75 - rr * .3) return false;
    }
    const hit = q => x + rr > q[0] && x - rr < q[0] + q[2] && y + rr > q[1] && y - rr < q[1] + q[3];
    if (F.walls.some(hit)) return false;
    if (F.furn.some(o => o.solid && hit(o.solid))) return false;
    if (f === 1 && L.stairs) { const s = L.stairs; if (hit([s.x + .1, s.y + .1, s.w - .2, s.h - .2]) && !hit(s.top)) return false; }  // il vano scala al piano di sopra
    return true;
  }
  // fuori dalla sagoma (attraverso la porta)?
  function outside(L, x, y) { const [X0, Y0, W, H] = L.box; return x < X0 || x > X0 + W || y < Y0 || y > Y0 + H; }
  // sulla cima della scala?
  function onStairTop(L, x, y) { const s = L.stairs; if (!s) return false; const t = s.top; return x > t[0] + .3 && x < t[0] + t[2] - .3 && y > t[1] + .3 && y < t[1] + t[3] - .3; }
  function roomAt(L, f, x, y) { const F = L.floors[f]; return F && F.rooms.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); }
  return { layout, walk, outside, onStairTop, roomAt, kindOf };
})();
if (typeof module !== 'undefined') module.exports = Interior;
