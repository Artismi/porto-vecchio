/* Porto Vecchio — L'Ordine: l'apparato della Tutela per strada (solo logica, nessuna grafica).
   Costruito sopra quello che c'è: i Grigi del motore (vedono, denunciano, inseguono, arrestano), la vita di popolo.js
   (diari, rabbia, paura, spesa), le corsie del traffico, le botteghe di economia/oggetti, la nave dell'Impero.
   - La Caserma della Guardia diventa una questura vera: turni (mattina, pomeriggio, notte), piantone alla porta,
     una centrale che assegna i servizi agli agenti di turno.
   - Agenti nuovi: Grigi in divisa, agenti in borghese dell'Ufficio Rettifiche, Guardie del Garante al Palazzo del Governo,
     soldati della Base (varco del Muro, Rocca, porto cargo, eliporto, poligono) con i cani.
   - Volanti: tre Alfette dei Grigi girano sulle corsie, si fermano per i controlli, inseguono quando scatta l'allarme.
   - Ronde a piedi (di notte col coprifuoco), posti di blocco occasionali con la Campagnola e le transenne.
   - Documenti: carta d'identità, tessera annonaria, lasciapassare per la zona della Base. Controlli, multe, perquisizioni, fermi.
   - Proteste spontanee (un arresto davanti a tutti, la fame, la rabbia) e organizzate (la Risacca), cortei, cordoni,
     cariche, fermi, fuggi fuggi. Ognuno se lo ricorda nel diario.
   - La nave al porto militare: arriva, ormeggia, scarica le casse sotto scorta, il camion porta la roba al supermercato.
   - Il Supermercato del Popolo: un edificio del centro con scaffali, cassiere, scorte vere (economia.js) e la coda fuori
     quando arriva la merce.
   Si aggancia a Game.HOOKS concatenando gli agganci che trova (dopo popolo.js). Stato in st.ord. Prova: node test_ordine.js */
var Ordine = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const EC = () => (typeof Economia !== 'undefined' ? Economia : null);
  const OG = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const RS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const TS = G.TS, PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const hourOf = t => Math.floor(t / 60) % 24;
  const minOf = t => ((t % 1440) + 1440) % 1440;
  const H32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  const WORLD = G.MAP && G.MAP.world;
  const WALL = WORLD && WORLD.WALL;

  const CFG = {
    grigi: 12, borghese: 4, garante: 2, soldati: 12,
    volanti: 3,
    blocchiAlGiorno: 4, bloccoMin: [60, 130],
    rondaStopOgni: [3, 7],        // minuti di gioco tra un controllo e l'altro di una ronda
    protestaOgni: 50,              // minuti di gioco tra due prove di protesta spontanea
    abitanti: 560,                 // più gente per strada (popolo.js: CFG.max)
  };

  // ================= AL CARICAMENTO: il Supermercato del Popolo, i documenti =================
  const SUPER = (() => {
    const B = G.BUILDINGS, pz = PLACES.piazza || { x: 0, y: 0 };
    let sb = B.find(b => b.use === 'supermercato');
    if (!sb) {
      const free = B.filter(b => b.door && b.use === 'casa' && !b.home && !b.farm && !b.trade && !b.name && b.w * b.h >= 12)
        .map(b => ({ b, d: dist(b.door[0] * TS, b.door[1] * TS, pz.x, pz.y), a: b.w * b.h })).filter(x => x.d < 140)
        .sort((p, q) => (q.a - p.a) * 1.5 + (p.d - q.d) * .25);
      if (free[0]) { sb = free[0].b; sb.use = 'supermercato'; sb.trade = 'supermercato'; sb.name = 'Supermercato del Popolo «La Spiga»'; sb.label = sb.name; sb.shop = true; sb.sign = { t: 'УНИВЕРСАМ 슈퍼', c: '#ffd23b' }; sb.superm = true; }
    }
    if (!sb) return null;
    const door = { x: sb.door[0] * TS + TS / 2, y: sb.door[1] * TS + TS / 2 };
    // la fila: dalla porta verso fuori, lungo il marciapiede
    const cx = (sb.x + sb.w / 2) * TS, cy = (sb.y + sb.h / 2) * TS, ox = door.x - cx, oy = door.y - cy, L = Math.hypot(ox, oy) || 1;
    const out = { x: ox / L, y: oy / L }, side = { x: -out.y, y: out.x };
    if (!PLACES.supermercato) { const px = door.x + out.x * 2, py = door.y + out.y * 2; PLACES.supermercato = { id: 'supermercato', name: sb.name, tx: Math.floor(px / TS), ty: Math.floor(py / TS), x: px, y: py }; }
    return { b: sb, id: sb.id, door, out, side };
  })();
  const GOODS_SUPER = ['pane', 'pasta', 'riso', 'farina', 'zucchero', 'sale', 'olio', 'latte', 'uova', 'formaggio', 'scatolame', 'carne_scatola', 'legumi', 'passata', 'caffe', 'biscotti', 'gallette',
    'acqua', 'aranciata', 'birra', 'vino', 'sapone', 'detersivo', 'candeggina', 'dentifricio', 'rasoio', 'carta', 'quaderno', 'penne', 'candele', 'fiammiferi', 'pile', 'lampadine', 'cerotti', 'garze', 'sigarette'];
  (function installShop() {
    if (!SUPER) return;
    const P = PO(), O = OG(), E = EC(), R = RS();
    if (P && P._ && P._.JOBS_BY) {
      P._.JOBS_BY.supermercato = [['cassiera del supermercato', 3, 5, 8, 20], ['scaffalista', 2, 4, 6, 15], ['magazziniere del supermercato', 2, 5, 6, 14], ['guardiano del supermercato', 1, 5, 8, 20], ['direttrice del supermercato', 1, 9, 8, 18]];
      if (P._.ESSENTIAL) P._.ESSENTIAL.push(/^cassier/, /^scaffalist/);
      if (P._.GENDER) P._.GENDER.push(['cassiere', 'cassiera'], ['scaffalista', 'scaffalista']);
    }
    if (P && P.OGG) {
      if (P.OGG.bottega && !P.OGG.bottega.where.includes('use:supermercato')) P.OGG.bottega.where.push('use:supermercato');
      P.OGG.spesa_grande = { label: 'la spesa al supermercato', where: ['use:supermercato'], act: 'spesa', h: [8, 20], pantry: 7, cost: 8, once: { compagnia: -.05, paura: .01 }, int: 'cucina', needs: (Pp, st) => !st.ord || !st.ord.superVuoto };
    }
    const sell = ['use:supermercato', GOODS_SUPER.filter(g => !O || O.CAT[g])];
    if (O && O.SHOPLIST && !O.SHOPLIST.some(r => r[0] === 'use:supermercato')) O.SHOPLIST.push(sell);
    else if (E && E.SELL && !E.SELL.some(r => r[0] === 'use:supermercato')) E.SELL.push(sell);
    if (R && R.SHOPS && !R.SHOPS[SUPER.id]) R.SHOPS[SUPER.id] = { viveri: 2, zucchero: 2, carta: 2, medicine: 7, gesso: 1 };
    if (O && O.CAT) {
      O.CAT.carta_identita = O.CAT.carta_identita || { id: 'carta_identita', nome: 'carta d\'identità', cat: O.CAT.tessera_annonaria ? O.CAT.tessera_annonaria.cat : 'valori', prezzo: 0, peso: .01, q: 0, doc: true };
      O.CAT.lasciapassare = O.CAT.lasciapassare || { id: 'lasciapassare', nome: 'lasciapassare della Base', cat: O.CAT.carta_identita.cat, prezzo: 0, peso: .01, q: 0, doc: true };
    }
    if (P && P.CFG && P.CFG.max < CFG.abitanti) P.CFG.max = CFG.abitanti;
  })();

  // ================= NOMI E ASPETTI =================
  const NOMI = ['Bruno', 'Gavino', 'Efisio', 'Mario', 'Antonio', 'Salvatore', 'Giovanni', 'Franco', 'Luigi', 'Piero', 'Renato', 'Aldo', 'Sergio', 'Elio', 'Dario', 'Nanni', 'Tore', 'Peppino', 'Vittorio', 'Ugo', 'Raffaele', 'Ignazio', 'Battista', 'Corrado', 'Dino', 'Mauro', 'Silvio', 'Walter'];
  const NOMI_F = ['Maria', 'Anna', 'Graziella', 'Rita', 'Luisa', 'Paola', 'Teresa', 'Franca'];
  const COGNOMI = ['Sanna', 'Pinna', 'Murgia', 'Deiana', 'Loi', 'Melis', 'Serra', 'Carta', 'Porcu', 'Usai', 'Fadda', 'Piras', 'Atzori', 'Mereu', 'Cocco', 'Floris', 'Manca', 'Lai', 'Puddu', 'Cabras', 'Scano', 'Orrù', 'Zedda', 'Cossu', 'Pisano', 'Spano'];
  const SKIN = ['#e3c1a0', '#dcae88', '#c99a76', '#e8c3a4', '#d8a982', '#b9825c', '#f0cfb2'];
  const HAIR = ['#111', '#2a1d14', '#3a2a1a', '#1a1410', '#5a4a3a', '#8a8a88'];
  const GRIGIO = { top: '#5c6672', bottom: '#3c444e' }, SOLDATO = { top: '#4a5440', bottom: '#3a4232' }, GARANTE = { top: '#2a2a32', bottom: '#2a2a32' };
  const BORGHESE = [['#3a3a40', '#2a2a30'], ['#5a4a3a', '#2a2a30'], ['#6a6a5a', '#3a3a3a'], ['#2a3044', '#1a1a22']];

  // ================= STATO =================
  const S = st => st.ord;
  function create(st) {
    const r = G.MAP && G.MAP.world ? G.MAP.world.rng(7717) : Math.random;
    const O = st.ord = {
      agents: [], volanti: [], ronde: [], blocco: null, nextBlocco: st.t + 60 + r() * 120, ctl: null, proteste: [], nextProt: st.t + 90,
      nave: { phase: 'lontana', x: 1460, y: 176, ang: Math.PI, t: 0, kind: 'impero', crates: 0, crew: [] }, coda: null, superVuoto: false,
      camion: null, sorvegliati: {}, stats: { controlli: 0, multe: 0, fermi: 0, perquisizioni: 0, proteste: 0, cariche: 0, navi: 0, codaServiti: 0 }, log: [], nextId: 1, rev: 0,
    };
    const used = new Set(st.npcs.map(n => n.id));
    const nm = (fem) => { for (let k = 0; k < 40; k++) { const f = pick(r, fem ? NOMI_F : NOMI), c = pick(r, COGNOMI), full = `${f} ${c}`; if (!st.npcs.some(n => n.name.endsWith(full))) return [f, c]; } return [pick(r, NOMI), pick(r, COGNOMI)]; };
    const add = (id, c) => {
      if (used.has(id)) return null; used.add(id); c.id = id;
      const n = G.makeNpc(st, c); n.first = c.first || n.first; n.ord = Object.assign({ duty: null, svc: null }, c.ordX || {}); delete n.ordX;
      st.npcs.push(n); O.agents.push(n.id); return n;
    };
    const look = (u, extra) => ({ skin: pick(r, SKIN), top: u.top, bottom: u.bottom, uniform: u.top, hair: pick(r, HAIR), hat: extra.hat || 'police', build: .95 + r() * .25, extra: extra.extra || 'belt' });
    // i Grigi della questura: tre turni da quattro
    const GR = ['Guardia', 'Guardia', 'Appuntato', 'Guardia', 'Brigadiere', 'Guardia', 'Guardia', 'Appuntato', 'Guardia', 'Guardia', 'Maresciallo', 'Guardia'];
    for (let i = 0; i < CFG.grigi; i++) {
      const fem = i % 6 === 4, [f, c] = nm(fem), rank = fem ? 'Guardia' : GR[i];
      add('gr_' + i, { name: `${rank} ${f} ${c}`, first: f, role: `${rank} dei Grigi (Guardia Insulare)`, home: 'commissariato', hp: 100, weapon: 'pistola', tr: { cor: .6 + r() * .35, loq: .3 + r() * .4, avid: .1 + r() * .6, legge: .7 + r() * .3 }, sched: [[0, 'commissariato']], cop: true, grigio: true,
        look: look(GRIGIO, { hat: 'police', extra: r() < .3 ? 'belt,moustache' : 'belt' }), ordX: { kind: 'grigio', turno: i % 3, rank } });
    }
    // l'Ufficio Rettifiche: in borghese, nei bar e nelle piazze
    for (let i = 0; i < CFG.borghese; i++) {
      const fem = i === 2, [f, c] = nm(fem), col = BORGHESE[i % BORGHESE.length];
      add('rt_' + i, { name: `${f} ${c}`, first: f, role: 'Impiegato del Comune (in realtà Ufficio Rettifiche)', home: 'garante', hp: 80, weapon: 'pistola', tr: { cor: .5, loq: .7, avid: .3, legge: .95 }, sched: [[0, 'garante']], cop: true, borghese: true,
        look: { skin: pick(r, SKIN), top: col[0], bottom: col[1], hair: pick(r, HAIR), hat: fem ? 'none' : pick(r, ['fedora', 'none', 'flat']), build: 1, extra: fem ? 'bag,fem' : pick(r, ['paper', 'shades', 'paper,shades']) }, ordX: { kind: 'borghese', turno: i % 2 ? 1 : 0 } });
    }
    // le Guardie del Garante, ferme davanti al Palazzo del Governo
    for (let i = 0; i < CFG.garante; i++) {
      const [f, c] = nm(false);
      add('gg_' + i, { name: `Guardia d'onore ${c}`, first: f, role: 'Guardia d\'onore del Garante', home: 'governo', hp: 110, weapon: 'mitra', tr: { cor: .8, loq: .1, avid: .2, legge: 1 }, sched: [[0, 'governo']], cop: true, military: true,
        look: look(GARANTE, { hat: 'basco', extra: 'belt,gold' }), ordX: { kind: 'garante', post: i } });
    }
    // i soldati della Base: due turni (7-19, 19-7); i due cinofili hanno i cani
    const POSTS = soldierPosts();
    for (let i = 0; i < CFG.soldati; i++) {
      const [f, c] = nm(false), P = POSTS[i % POSTS.length];
      add('sd_' + i, { name: `Soldato ${c}`, first: f, role: P.role, home: 'caserma_p', hp: 120, weapon: P.dog ? 'pistola' : 'mitra', tr: { cor: .75 + r() * .2, loq: .2, avid: .2 + r() * .3, legge: .9 }, sched: [[0, 'caserma_p']], cop: true, military: true,
        look: look(SOLDATO, { hat: 'elmetto', extra: 'belt' }), ordX: { kind: 'soldato', turno: i < CFG.soldati / 2 ? 0 : 1, post: P, dog: !!P.dog } });
    }
    // i Grigi che c'erano già (Carla, Ferri) restano quelli della storia
    // le volanti: tre Alfette davanti alla questura (grigie col fregio)
    const qs = PLACES.commissariato;
    for (let i = 0; i < CFG.volanti; i++) {
      const sp = (G.parkSpot && G.parkSpot(qs.x + 6 + i * 5, qs.y + 4, false)) || { x: qs.x + 6 + i * 5, y: qs.y + 4 };
      const v = G.makeVehicle(st, { id: 'volante' + i, kind: 'polizia', x: sp.x, y: sp.y, ang: 0, color: '#6c7684', ronda: true, livrea: true, rider: null, siren: false, home: { x: sp.x, y: sp.y } });
      st.vehicles.push(v); O.volanti.push({ car: v.id, crew: [], mode: 'parcheggio', until: 0, i });
    }
    // documenti del protagonista
    const p = st.player; p.inv = p.inv || {}; if (!p.inv.carta_identita) p.inv.carta_identita = 1; if (!p.inv.tessera_annonaria) p.inv.tessera_annonaria = 1;
    // la vita: anche gli agenti nuovi hanno diario, bisogni e chi li conosce (popolo.js li lascia muovere al motore)
    const P0 = PO(); if (P0 && P0._ && P0._.adopt) O.agents.forEach(id => { const n = G.byId(st, id); if (n) try { P0._.adopt(st, n); } catch (e) { } });
    G.addLog(st, 'La Caserma della Guardia lavora a pieno: tre turni, le volanti, le ronde. La Tutela tiene d\'occhio tutto.', 'info');
  }

  // i posti dei soldati della Base
  function soldierPosts() {
    const out = [], v = PLACES.varco || { x: 1175, y: 139 }, ro = PLACES.rocca || v, mc = PLACES.molo_cargo || v, el = PLACES.eliporto || v, pg = PLACES.poligono || v, dn = PLACES.deposito_n || v, h2 = PLACES.hangar2 || v;
    const wx = WALL ? WALL.x : 1168, g0 = WALL ? WALL.gate[0] : 133, g1 = WALL ? WALL.gate[1] : 145;
    out.push({ x: wx + 4, y: g0 - 1.5, face: Math.PI, role: 'Sentinella al Varco del Muro', gate: true });
    out.push({ x: wx + 4, y: g1 + 1.5, face: Math.PI, role: 'Sentinella al Varco del Muro', gate: true });
    out.push({ x: ro.x - 3, y: ro.y + 4, face: Math.PI / 2, role: 'Sentinella della Rocca' });
    out.push({ x: ro.x + 3, y: ro.y + 4, face: Math.PI / 2, role: 'Sentinella della Rocca' });
    out.push({ x: mc.x - 4, y: mc.y + 3, face: 0, role: 'Guardia del porto cargo', port: true });
    out.push({ x: mc.x + 2, y: mc.y - 3, face: 0, role: 'Guardia del porto cargo', port: true });
    out.push({ x: el.x, y: el.y + 5, face: Math.PI / 2, role: 'Guardia dell\'eliporto' });
    out.push({ x: dn.x, y: dn.y + 4, face: Math.PI / 2, role: 'Guardia del deposito' });
    out.push({ role: 'Cinofilo della Base', dog: true, route: [[wx + 8, g0 - 20], [pg.x, pg.y], [mc.x - 8, mc.y + 8], [h2.x, h2.y + 6], [wx + 8, g1 + 22]] });
    out.push({ role: 'Cinofilo della Base', dog: true, route: [[h2.x - 6, h2.y + 8], [el.x, el.y], [ro.x, ro.y + 10], [dn.x - 8, dn.y + 6], [pg.x + 6, pg.y - 4]] });
    out.push({ role: 'Pattuglia della Base', route: [[wx + 6, 100], [ro.x - 10, ro.y - 10], [wx + 6, g0 - 8], [pg.x - 8, pg.y + 6], [wx + 6, 185]] });
    out.push({ role: 'Pattuglia della Base', route: [[wx + 6, 185], [pg.x - 8, pg.y + 6], [wx + 6, g1 + 8], [ro.x - 10, ro.y - 10], [wx + 6, 100]] });
    return out;
  }

  // ================= MOVIMENTO =================
  // verso un punto: dritti se è vicino e si vede, altrimenti col percorso (ricalcolato al massimo ogni 1,5 s)
  function seek(st, n, x, y, dt, sp, near) {
    const d = dist(n.x, n.y, x, y);
    if (d < (near || .5)) { n.speedNow = 0; n.path = []; return true; }
    const O = n.ord || (n.ord = {});
    if (d < 7 && G.walkM(x, y) && G.los(n.x, n.y, x, y)) { n.path = [{ x, y }]; n.goal = { x, y }; }
    else if (!n.path.length || !n.goal || (dist(n.goal.x, n.goal.y, x, y) > 2 && st.clock - (O.pT || -9) > 1.5)) { O.pT = st.clock; G.goTo(n, x, y, 2); if (!n.path.length) { n.path = [{ x, y }]; n.goal = { x, y }; } }
    G.stepAlong(n, sp || 1.35, dt);
    return false;
  }
  const faceTo = (n, x, y, dt) => { const a = Math.atan2(y - n.y, x - n.x); n.face += angDiff(a, n.face) * Math.min(1, (dt || .1) * 6); };
  function stand(n, face, dt) { n.speedNow = 0; n.path = []; if (face !== undefined) n.face += angDiff(face, n.face) * Math.min(1, (dt || .1) * 4); }

  // ================= TURNI E SERVIZI =================
  const onDuty = (st, n) => {
    const h = hourOf(st.t), k = n.ord.kind;
    if (k === 'grigio') return n.ord.turno === 0 ? h >= 6 && h < 14 : n.ord.turno === 1 ? h >= 14 && h < 22 : h >= 22 || h < 6;
    if (k === 'soldato') return n.ord.turno === 0 ? h >= 7 && h < 19 : h >= 19 || h < 7;
    if (k === 'borghese') return n.ord.turno === 0 ? h >= 8 && h < 16 : h >= 15 && h < 24;
    return true;   // le Guardie d'onore e chi ha un servizio straordinario
  };
  // chi lascia fare al motore: allarme, combattimento, ferito, a terra
  let WL = { c: -1, v: 0 };
  const wanted = st => { if (WL.c !== st.clock || WL.st !== st) WL = { c: st.clock, st, v: G.wantedLevel(st) }; return WL.v; };
  function engineTakes(st, n) {
    if (n.dead || n.stun > 0 || n.jailedUntil > st.t) return true;
    const lv = wanted(st);
    if (lv >= 2) return true;
    if (lv >= 1 && (n.alert > .3 || (st.chase && dist(n.x, n.y, st.player.x, st.player.y) < 45))) return true;
    return false;
  }
  // la centrale: chi è di turno senza servizio ne riceve uno
  function centrale(st) {
    const O = S(st), free = [];
    O.agents.forEach(id => { const n = G.byId(st, id); if (!n || n.dead || n.ord.kind !== 'grigio') return; if (!onDuty(st, n)) { if (n.ord.svc && !n.ord.svc.extra && n.ord.svc.k !== 'volante') endSvc(st, n); return; } if (!n.ord.svc) free.push(n); });
    if (!free.length) return;
    const want = [];
    const piantone = O.agents.map(id => G.byId(st, id)).some(n => n && n.ord.svc && n.ord.svc.k === 'piantone');
    if (!piantone) want.push('piantone');
    // le volanti: due a macchina
    O.volanti.forEach(V => { const car = st.vehicles.find(v => v.id === V.car); if (car && !car.wreck && V.crew.length === 0 && V.mode === 'parcheggio') want.push('volante:' + V.i, 'volante:' + V.i); });
    for (let i = 0; i < free.length; i++) want.push('ronda');
    if (O.coda && O.coda.active && !O.coda.cop) want.unshift('coda');
    for (const n of free) {
      const k = want.shift(); if (!k) break;
      if (k === 'piantone') n.ord.svc = { k: 'piantone' };
      else if (k === 'coda') { n.ord.svc = { k: 'coda' }; O.coda.cop = n.id; }
      else if (k.startsWith('volante:')) { const V = O.volanti[+k.split(':')[1]]; V.crew.push(n.id); n.ord.svc = { k: 'volante', V: V.i }; }
      else if (k === 'ronda') {
        let R = O.ronde.find(q => q.a.length < 2 && q.night === isCurfew(st)); if (!R) { R = { id: O.nextId++, a: [], route: rondaRoute(st), i: 0, stopAt: st.t + rrand(CFG.rondaStopOgni), night: isCurfew(st) }; O.ronde.push(R); }
        R.a.push(n.id); n.ord.svc = { k: 'ronda', R: R.id };
      }
    }
  }
  const rrand = ([a, b]) => a + Math.random() * (b - a);
  const isCurfew = st => { const P = PO(); const cf = P && P.curfewFrom ? P.curfewFrom(st) : 23 * 60; const m = minOf(st.t); return m >= cf || m < 5 * 60; };
  const ROUTES = [
    ['piazza', 'fontana', 'vico', 'caruggio', 'calata', 'molo', 'marina', 'piazza'],
    ['piazza', 'piazzetta', 'lungomare', 'passeggiata', 'spiaggia', 'lungomare', 'piazzetta'],
    ['piazza_gov', 'giardini', 'pineta', 'giardini', 'piazza_gov'],
    ['calata', 'lungomare', 'piazzetta', 'wu', 'fontana', 'calata'],
    ['commissariato', 'caruggio', 'vico', 'piazza', 'supermercato', 'commissariato'],
  ];
  function rondaRoute(st) { const R = ROUTES[Math.floor(Math.random() * ROUTES.length)].filter(k => PLACES[k]); return R.length >= 2 ? R : ['piazza', 'commissariato']; }
  function endSvc(st, n) {
    const O = S(st), s = n.ord.svc; if (!s) return;
    if (s.k === 'volante') { const V = O.volanti[s.V]; if (V) V.crew = V.crew.filter(id => id !== n.id); if (n.car) { n.car = null; } n.inside = false; }
    if (s.k === 'ronda') { const R = O.ronde.find(q => q.id === s.R); if (R) { R.a = R.a.filter(id => id !== n.id); if (!R.a.length) O.ronde = O.ronde.filter(q => q !== R); } }
    if (s.k === 'coda' && O.coda && O.coda.cop === n.id) O.coda.cop = null;
    n.ord.svc = null;
  }

  // ================= IL PENSIERO DEGLI AGENTI =================
  function think(st, n) {
    const O = S(st); if (!O) return false;
    if (n.ord && n.ord.protester) return thinkProtester(st, n);
    if (n.ord && n.ord.fermato) { n.action = { name: 'ordine_fermo', scores: [], why: 'Lo portano in questura.', since: n.action.since }; return true; }
    if (n.ord && n.ord.coda) { n.inside = false; n.action = { name: 'ordine_coda', scores: [], why: 'In fila al supermercato.', since: n.action.since }; return true; }
    if (n.ord && n.ord.stopped && st.t < n.ord.stopped.until) { n.inside = false; n.action = { name: 'ordine_fermato', scores: [], why: 'Fermato dai Grigi per un controllo.', since: n.action.since }; return true; }
    if (!n.ord || !n.ord.kind) return false;
    if (engineTakes(st, n)) { if (n.inside && !n.dead && n.stun <= 0) n.inside = false; if (n.ord.svc && n.ord.svc.k === 'volante') { const V = O.volanti[n.ord.svc.V]; if (V && V.mode !== 'inseguimento') startChase(st, V); } return false; }
    const k = n.ord.kind, svc = n.ord.svc;
    const set = (name, why) => { const was = n.action.name; n.action = { name, scores: [{ name, v: 1, why }], why, since: was === name ? n.action.since : st.clock }; return true; };
    if (svc && svc.k === 'controllo_p') { n.inside = false; return set('ordine_controllo_p', 'Ti controlla i documenti.'); }
    if (svc && svc.k === 'antisommossa') return set('ordine_cordone', 'Reparto antisommossa: ' + (svc.phase || 'in posizione') + '.');
    if (svc && svc.k === 'blocco') { n.inside = false; return set('ordine_blocco', 'Posto di blocco: controlla chi passa.'); }
    if (svc && svc.k === 'scorta') { n.inside = false; return set('ordine_scorta', 'Porta un fermato in questura.'); }
    if (svc && svc.k === 'nave') { n.inside = false; return set('ordine_nave', 'Scorta allo scarico della nave.'); }
    if (svc && svc.k === 'controllo') { n.inside = false; return set('ordine_controllo', 'Controlla i documenti.'); }
    if (k === 'garante') { n.inside = false; return set('ordine_posto', 'Di guardia davanti al Palazzo del Governo.'); }
    if (!onDuty(st, n)) {
      if (k === 'soldato' || k === 'grigio') { return set('ordine_riposo', k === 'soldato' ? 'Fuori turno: in camerata.' : 'Fuori turno: in caserma.'); }
      return set('ordine_riposo', 'Fuori servizio.');
    }
    if (!(svc && svc.k === 'volante')) n.inside = false;
    if (k === 'soldato') return set('ordine_posto', n.ord.post.route ? `${n.ord.post.role}: giro del perimetro.` : `${n.ord.post.role}.`);
    if (k === 'borghese') return set('ordine_ascolta', 'In borghese: ascolta i discorsi della gente.');
    if (!svc) return set('ordine_rientra', 'Di turno: aspetta un servizio in caserma.');
    if (svc.k === 'piantone') return set('ordine_piantone', 'Piantone alla porta della caserma.');
    if (svc.k === 'ronda') return set('ordine_ronda', isCurfew(st) ? 'Ronda notturna: il coprifuoco.' : 'Ronda a piedi.');
    if (svc.k === 'volante') return set('ordine_volante', 'In volante.');
    if (svc.k === 'coda') return set('ordine_coda_g', 'Tiene in ordine la fila del supermercato.');
    return false;
  }

  // ================= IL MOVIMENTO DEGLI AGENTI =================
  const NEED = { ordine_blocco: 'blocco', ordine_scorta: 'scorta', ordine_controllo: 'controllo', ordine_cordone: 'antisommossa', ordine_ronda: 'ronda', ordine_piantone: 'piantone', ordine_coda_g: 'coda', ordine_volante: 'volante', ordine_controllo_p: 'controllo_p', ordine_fermo: '.fermato', ordine_coda: '.coda', ordine_protesta: '.protester', ordine_fermato: '.stopped' };
  function move(st, n, dt, a) {
    if (!a || a.slice(0, 7) !== 'ordine_') return false;
    const O = S(st);
    // l'azione può essere rimasta indietro rispetto al servizio (si pensa ogni 0,35 s): si aspetta il prossimo pensiero
    const need = NEED[a], o = n.ord;
    if (need && !(need[0] === '.' ? o[need.slice(1)] : o.svc && o.svc.k === need)) { n.thinkAt = 0; n.speedNow = 0; return true; }
    switch (a) {
      case 'ordine_riposo': case 'ordine_rientra': {
        const home = n.ord.kind === 'soldato' ? PLACES.caserma_p : n.ord.kind === 'borghese' ? PLACES.garante : PLACES.commissariato;
        if (!home) return true;
        if (n.inside) { n.speedNow = 0; return true; }
        if (seek(st, n, home.x, home.y, dt, 1.5, 1.2)) { n.inside = true; n.x = home.x; n.y = home.y; }
        return true;
      }
      case 'ordine_piantone': { const q = PLACES.commissariato; const x = q.x + 1.6, y = q.y + 1.2; if (seek(st, n, x, y, dt, 1.4, .4)) { stand(n, Math.PI / 2, dt); spotCheck(st, n, 5); } return true; }
      case 'ordine_posto': return postMove(st, n, dt);
      case 'ordine_ascolta': return listenMove(st, n, dt);
      case 'ordine_ronda': return rondaMove(st, n, dt);
      case 'ordine_volante': case 'ordine_controllo_p': { if (a === 'ordine_volante') n.speedNow = 0; return true; }
      case 'ordine_blocco': return bloccoMove(st, n, dt);
      case 'ordine_scorta': return scortaMove(st, n, dt);
      case 'ordine_fermo': return fermoMove(st, n, dt);
      case 'ordine_controllo': return controlloMove(st, n, dt);
      case 'ordine_fermato': { const s = n.ord.stopped, c = s && G.byId(st, s.cop); if (c) faceTo(n, c.x, c.y, dt); n.speedNow = 0; n.path = []; return true; }
      case 'ordine_coda': return codaMove(st, n, dt);
      case 'ordine_coda_g': return codaGuardMove(st, n, dt);
      case 'ordine_cordone': return cordoneMove(st, n, dt);
      case 'ordine_nave': return naveGuardMove(st, n, dt);
      case 'ordine_protesta': return protesterMove(st, n, dt);
    }
    return false;
  }

  // ---- soldati, guardie d'onore ----
  function postMove(st, n, dt) {
    const k = n.ord.kind;
    if (k === 'garante') { const q = PLACES.governo || PLACES.piazza_gov; const x = q.x + (n.ord.post ? 2.2 : -2.2), y = q.y + 1.5; if (seek(st, n, x, y, dt, 1.2, .3)) { stand(n, Math.PI / 2, dt); } return true; }
    const P = n.ord.post;
    if (P.route) {
      const R = P.route, i = n.ord.ri || 0, [x, y] = R[i % R.length];
      if (n.ord.wait > 0) { n.ord.wait -= dt; stand(n, undefined, dt); if (P.dog) baseWatch(st, n); return true; }
      if (seek(st, n, x, y, dt, 1.25, 1.2)) { n.ord.ri = i + 1; n.ord.wait = 4 + Math.random() * 8; }
      baseWatch(st, n); return true;
    }
    if (seek(st, n, P.x, P.y, dt, 1.3, .3)) { stand(n, P.face, dt); baseWatch(st, n); if (P.gate) gateCheck(st, n); }
    return true;
  }
  // dentro la zona della Base senza lasciapassare: ti fermano; se scappi o ti trovano dove non dovresti essere, allarme
  const inBase = (x) => WALL && x > WALL.x + 1;
  const hasPass = st => { const inv = st.player.inv || {}; return (inv.lasciapassare > 0) || (inv.documenti > 0); };
  function baseWatch(st, n) {
    const p = st.player, O = S(st);
    if (!inBase(p.x) || p.vehicle && Math.hypot(p.x - n.x, p.y - n.y) > 20) return;
    if (O.ctl || st.clock < (O.baseCd || 0)) return;
    if (!G.seesPlayer(st, n) || dist(n.x, n.y, p.x, p.y) > 13) return;
    if (O.passOk && st.t < O.passOk) return;
    startCheck(st, n, 'base');
  }
  function gateCheck(st, n) {
    const p = st.player, O = S(st);
    if (O.ctl || O.passOk && st.t < O.passOk) return;
    if (!WALL || Math.abs(p.x - WALL.x) > 7 || p.y < WALL.gate[0] - 3 || p.y > WALL.gate[1] + 3) return;
    if (dist(n.x, n.y, p.x, p.y) < 9) startCheck(st, n, 'varco');
  }

  // ---- in borghese: siedono vicino alla gente, ascoltano, ogni tanto seguono qualcuno ----
  const LISTEN = ['bar', 'sirena', 'osteria', 'piazza', 'fontana', 'calata', 'piazzetta', 'lungomare', 'giardini', 'supermercato'];
  function listenMove(st, n, dt) {
    const O = S(st), m = n.ord;
    if (m.tail) {
      const t = G.byId(st, m.tail.id);
      if (!t || t.dead || t.inside || st.t > m.tail.until) { if (t && !t.dead) noteOf(st, n, `ho seguito ${t.name} per un po': ${t.inside ? 'è entrat' + (t.pop && t.pop.sex === 'f' ? 'a' : 'o') + ' in casa' : 'niente di strano'}`); m.tail = null; }
      else { const d = dist(n.x, n.y, t.x, t.y); if (d > 9) seek(st, n, t.x, t.y, dt, 1.45, 6); else if (d < 5) { stand(n, undefined, dt); faceTo(n, t.x, t.y, dt); } else seek(st, n, t.x, t.y, dt, 1.1, 6); return true; }
    }
    if (!m.spot || st.t > m.spotUntil) {
      const k = pick(Math.random, LISTEN.filter(q => PLACES[q])), q = PLACES[k], s = G.wanderSpot(st, q);
      m.spot = s; m.spotUntil = st.t + 25 + Math.random() * 40; m.spotName = q.name;
    }
    if (seek(st, n, m.spot.x, m.spot.y, dt, 1.25, .8)) {
      stand(n, undefined, dt);
      if (st.clock > (m.lookT || 0)) {
        m.lookT = st.clock + 20 + Math.random() * 30;
        // uno con la testa calda vicino: lo si segue
        const sus = st.npcs.find(k => k.pop && !k.dead && !k.inside && !k.cop && dist(k.x, k.y, n.x, n.y) < 12 && ((k.ris && k.ris.ideo > .55) || (k.pop.need && k.pop.need.rabbia > .55)));
        if (sus && Math.random() < .5) { m.tail = { id: sus.id, until: st.t + 15 + Math.random() * 20 }; O.sorvegliati[sus.id] = (O.sorvegliati[sus.id] || 0) + 1; }
      }
    }
    return true;
  }

  // ---- ronde a piedi ----
  function rondaMove(st, n, dt) {
    const O = S(st), R = O.ronde.find(q => q.id === (n.ord.svc && n.ord.svc.R));
    if (!R) { n.ord.svc = null; return true; }
    const lead = G.byId(st, R.a[0]);
    if (lead && lead !== n && !lead.dead && lead.action.name === 'ordine_ronda') {
      // il compagno sta al fianco del capo pattuglia
      const s = lead.face + Math.PI / 2, x = lead.x + Math.cos(s) * .9 - Math.cos(lead.face) * .3, y = lead.y + Math.sin(s) * .9 - Math.sin(lead.face) * .3;
      if (!seek(st, n, x, y, dt, Math.max(1.2, (lead.speedNow || 1.3) * 1.15), .35)) return true;
      stand(n, lead.face, dt); return true;
    }
    if (R.pause > 0) { R.pause -= dt; stand(n, undefined, dt); return true; }
    const pid = R.route[R.i % R.route.length], q = PLACES[pid];
    if (!q) { R.i++; return true; }
    if (!R.pt || R.ptFor !== R.i) { R.pt = G.wanderSpot(st, q); R.ptFor = R.i; }
    if (seek(st, n, R.pt.x, R.pt.y, dt, R.night ? 1.15 : 1.3, 1.2)) { R.i++; R.pause = 3 + Math.random() * 6; }
    // controllo a campione: un passante vicino (di notte chiunque giri col coprifuoco)
    if (st.t >= R.stopAt) {
      R.stopAt = st.t + rrand(CFG.rondaStopOgni) * (R.night ? .6 : 1);
      if (!spotCheck(st, n, R.night ? 14 : 9, R)) R.stopAt = st.t + 1;
    }
    return true;
  }
  // cerca qualcuno da controllare (il giocatore compreso)
  function spotCheck(st, n, range, R) {
    const O = S(st), p = st.player, night = isCurfew(st);
    // il giocatore: più facile di notte, se ha addosso roba che scotta si nota di più
    if (!O.ctl && !p.vehicle && !p.indoor && st.clock > (O.playerCd || 0) && dist(n.x, n.y, p.x, p.y) < range && G.seesPlayer(st, n)) {
      const repr = st.ris ? st.ris.repr / 100 : .1, k = (night ? .65 : .18) + repr * .3 + (contraband(st).length ? .1 : 0);
      if (Math.random() < k) { startCheck(st, n, night ? 'coprifuoco' : 'ronda'); return true; }
    }
    const cand = [];
    for (const k of st.npcs) {
      if (k.dead || k.inside || k.cop || k.faction || !k.pop || k.ord && (k.ord.protester || k.ord.coda || k.ord.fermato) || k.jailedUntil > st.t) continue;
      if (k.ord && k.ord.stopped && st.t < k.ord.stopped.until + 60) continue;
      const d = dist(n.x, n.y, k.x, k.y); if (d > range) continue;
      cand.push([k, d - (k.ris && k.ris.ideo > .5 ? 3 : 0) - (k.pop.age < 30 ? 1.5 : 0) + Math.random() * 4]);
    }
    if (!cand.length) return false;
    cand.sort((a, b) => a[1] - b[1]);
    startNpcCheck(st, n, cand[0][0], R);
    return true;
  }

  // ================= DOCUMENTI =================
  // gli abitanti: quasi tutti in regola; chi non lo è lo è per un motivo
  function docsOf(n) {
    if (n.ord && n.ord.docs) return n.ord.docs;
    const h = H32(n.id + 'doc'), h2 = H32(n.id + 'tes'), P = n.pop || {};
    const d = { carta: h > .06, tessera: h2 > .1 || (P.age && P.age < 16), falsi: !!(n.ris && n.ris.member && h > .5), scaduta: h > .06 && h < .13 };
    if (P.status === 'disoccupato' && h2 < .2) d.tessera = false;
    (n.ord = n.ord || {}).docs = d; return d;
  }
  function contraband(st) {
    const inv = st.player.inv || {}, O = OG(), out = [];
    for (const k in inv) { if (!(inv[k] > 0)) continue; const c = O && O.CAT[k]; if ((c && c.ill) || ['volantini', 'documenti', 'cassette_proibite', 'rivista_proibita', 'tessera_falsa'].includes(k)) out.push(k); }
    const p = st.player; for (const k in p.arms || {}) if (k !== 'pugni' && k !== 'coltello') out.push('arma:' + k);
    if (st.ris && st.ris.inv) ['volantini', 'kit', 'vernice'].forEach(k => { if (st.ris.inv[k] > 0 && !st.ris.cassaAt) { } });
    return out;
  }
  const nomeOgg = k => { if (k.startsWith('arma:')) return (G.WEAPONS[k.slice(5)] || {}).name || 'un\'arma'; const c = OG() && OG().CAT[k]; return c ? c.nome : k; };

  // ---- il controllo di un abitante ----
  function startNpcCheck(st, cop, k, R) {
    const O = S(st);
    k.ord = k.ord || {}; k.ord.stopped = { cop: cop.id, until: st.t + 4 + Math.random() * 3, t0: st.t }; k.path = []; k.speedNow = 0;
    cop.ord.chk = { id: k.id, t0: st.t, R: R ? R.id : null, back: cop.ord.svc };
    cop.ord.svc = { k: 'controllo', back: cop.ord.svc };
    G.say(st, cop, pick(Math.random, isCurfew(st) ? ['Alt. Coprifuoco. Documenti.', 'Dove va a quest\'ora? Documenti.', 'Fermo lì. Mani in vista.'] : ['Documenti, prego.', 'Un controllo. I documenti.', 'Lei. Venga qui. Documenti.']), 2.6);
    O.stats.controlli++;
  }
  function controlloMove(st, n, dt) {
    const O = S(st), c = n.ord.chk, k = c && G.byId(st, c.id);
    const done = () => { n.ord.svc = n.ord.svc && n.ord.svc.back || null; n.ord.chk = null; };
    if (!k || k.dead) { done(); return true; }
    const d = dist(n.x, n.y, k.x, k.y);
    if (d > 1.3) { seek(st, n, k.x, k.y, dt, 1.6, 1.1); if (st.t - c.t0 > 3) { done(); if (k.ord) k.ord.stopped = null; } return true; }
    stand(n, undefined, dt); faceTo(n, k.x, k.y, dt);
    if (st.t < k.ord.stopped.until) return true;
    // l'esito
    const D = docsOf(k), night = isCurfew(st), P = k.pop || {}, PL = PO();
    let esito = 'ok', why = '';
    if (!D.carta) { esito = 'fermo'; why = 'senza documenti'; }
    else if (D.falsi && Math.random() < .2) { esito = 'fermo'; why = 'documenti falsi'; }
    else if (D.scaduta) { esito = 'multa'; why = 'carta d\'identità scaduta'; }
    else if (!D.tessera && Math.random() < .5) { esito = 'multa'; why = 'senza tessera annonaria'; }
    if (night && esito === 'ok') { esito = Math.random() < .35 ? 'fermo' : 'multa'; why = 'fuori col coprifuoco'; }
    if (esito === 'ok' && k.ris && k.ris.ideo > .6 && Math.random() < .12) { esito = 'fermo'; why = 'sospetto della Risacca'; }
    if (esito === 'ok' && (O.sorvegliati[k.id] || 0) >= 2 && Math.random() < .3) { esito = 'fermo'; why = 'segnalato dall\'Ufficio Rettifiche'; }
    k.ord.stopped = null;
    if (esito === 'ok') { G.say(st, n, pick(Math.random, ['Va bene. Circolare.', 'In regola. Vada pure.', 'Può andare.']), 2); if (PL) PL.note(st, k, `fermat${k.pop && k.pop.sex === 'f' ? 'a' : 'o'} dai Grigi per un controllo, tutto in regola`, 'info', { w: .25, tag: 'controllo' }); if (P.need) P.need.paura = clamp((P.need.paura || 0) + .05, 0, 1); }
    else if (esito === 'multa') {
      const m = 2 + Math.floor(Math.random() * 4); if (P.money !== undefined) P.money -= m; O.stats.multe++;
      G.say(st, n, `Multa: ${why}. ${m}.000 lire.`, 2.6);
      if (PL) { PL.note(st, k, `multa dai Grigi (${why}): ${m}.000 lire`, 'bad', { w: .45, tag: 'multa' }); if (P.need) P.need.rabbia = clamp((P.need.rabbia || 0) + .12, 0, 1); }
    } else {
      G.say(st, n, pick(Math.random, ['Lei viene con noi.', 'In caserma. Subito.', 'Si giri. Mani dietro la schiena.']), 2.6);
      G.say(st, k, pick(Math.random, ['Ma io non ho fatto niente!', 'Lasciatemi, ho famiglia!', 'Per cosa?']), 2.6);
      n.ord.chk = null; fermo(st, n, k, why); return true;
    }
    done(); return true;
  }
  // un fermo: lo si porta in questura a piedi (se il giocatore è lontano, ci si arriva subito)
  function fermo(st, cop, k, why) {
    const O = S(st), PL = PO(); O.stats.fermi++;
    if (dist(st.player.x, st.player.y, k.x, k.y) > 80 || !PLACES.commissariato) { if (PL) PL.arrest(st, k, why); else k.jailedUntil = st.t + 240; return; }
    k.ord = k.ord || {}; k.ord.fermato = { cop: cop.id, why }; k.path = []; k.inside = false;
    cop.ord.svc = { k: 'scorta', who: k.id, back: cop.ord.svc && cop.ord.svc.back || null };
    // chi vede, se lo ricorda
    st.npcs.forEach(w => { if (w === k || w.cop || w.dead || w.inside || !w.pop || dist(w.x, w.y, k.x, k.y) > 14) return; if (PL) PL.note(st, w, `ho visto i Grigi portare via ${k.name}`, 'bad', { w: .5, who: k.id, tag: 'arresto' }); if (w.pop.need) { w.pop.need.rabbia = clamp((w.pop.need.rabbia || 0) + .08, 0, 1); w.pop.need.paura = clamp((w.pop.need.paura || 0) + .06, 0, 1); } });
    O.lastArrest = { x: k.x, y: k.y, t: st.t, who: k.id };
  }
  function scortaMove(st, n, dt) {
    const s = n.ord.svc, k = G.byId(st, s.who), q = PLACES.commissariato;
    if (!k || k.dead || !k.ord || !k.ord.fermato) { n.ord.svc = s.back || null; return true; }
    if (dist(n.x, n.y, k.x, k.y) > 3) { seek(st, n, k.x, k.y, dt, 1.6, 1); return true; }
    if (seek(st, n, q.x, q.y, dt, 1.15, 1.3)) {
      const PL = PO(), why = k.ord.fermato.why; k.ord.fermato = null;
      if (PL) PL.arrest(st, k, why); else { k.jailedUntil = st.t + 240; k.inside = true; }
      n.ord.svc = s.back || null;
    }
    return true;
  }
  function fermoMove(st, n, dt) {
    const f = n.ord.fermato, c = f && G.byId(st, f.cop);
    if (!c || c.dead || c.stun > 0 || G.hostile(st, c)) { n.ord.fermato = null; n.panic = 3; n.fleeFrom = c ? { x: c.x, y: c.y } : null; return true; }   // il Grigio è a terra: si scappa
    const bx = c.x - Math.cos(c.face) * .9, by = c.y - Math.sin(c.face) * .9;
    seek(st, n, bx, by, dt, Math.max(1, c.speedNow || 1.1), .3); n.handsBack = true;
    return true;
  }

  // ---- il controllo del giocatore ----
  // fasi: 'alt' (l'agente si avvicina, tu ti fermi), 'verifica' (5 secondi), poi l'esito. Se te ne vai: fuga al controllo.
  function startCheck(st, cop, why) {
    const O = S(st); if (O.ctl) return;
    O.ctl = { cop: cop.id, why, phase: 'alt', t0: st.clock, x: st.player.x, y: st.player.y, back: cop.ord.svc };
    cop.ord.svc = { k: 'controllo_p', back: cop.ord.svc };
    cop.action = { name: 'ordine_controllo_p', scores: [], why: 'Ti controlla i documenti.', since: st.clock };
    const lines = { coprifuoco: 'Alt! C\'è il coprifuoco. Documenti!', ronda: 'Lei! Si fermi. Documenti, prego.', blocco: 'Posto di blocco. Documenti e lasciapassare.', varco: 'Alt! Varco della Base. Lasciapassare.', base: 'Alt! Zona militare! Mani in vista!' };
    G.say(st, cop, lines[why] || 'Documenti.', 3.2);
    G.feed(st, `${cop.first} ti ferma: ${why === 'base' ? 'sei nella zona militare' : 'controllo dei documenti'}. Fermati e aspetta.`, 'bad');
    st.sfx.push({ k: 'fischio', x: cop.x, y: cop.y });
  }
  function playerCheckStep(st, dt) {
    const O = S(st), C = O.ctl; if (!C) return;
    const cop = G.byId(st, C.cop), p = st.player;
    const end = () => { if (cop && cop.ord) { cop.ord.svc = C.back || null; } O.ctl = null; O.playerCd = st.clock + 90; };
    if (!cop || cop.dead || cop.stun > 0 || G.hostile(st, cop)) { end(); return; }
    const d = dist(cop.x, cop.y, p.x, p.y);
    // l'agente si avvicina e guarda
    cop.action.name = 'ordine_controllo_p';
    if (d > 1.4) { seek(st, cop, p.x, p.y, dt, 1.9, 1.2); } else { stand(cop, undefined, dt); faceTo(cop, p.x, p.y, dt); }
    const moving = Math.abs(p.speed || 0) > 1.2 || p.vehicle && Math.hypot(...(() => { const v = st.vehicles.find(k => k.id === p.vehicle); return v ? [v.vx || 0, v.vy || 0] : [0, 0]; })()) > 2;
    if (C.phase === 'alt') {
      if (d < 2.2 && !moving) { C.phase = 'verifica'; C.t1 = st.clock; G.say(st, cop, pick(Math.random, ['Vediamo…', 'Carta d\'identità… tessera…', 'Fermo così.']), 2.5); }
      else if (d > 16 || (st.clock - C.t0 > 9 && moving)) return flee(st, cop, C);
      else if (st.clock - C.t0 > 20) end();
      return;
    }
    if (C.phase === 'verifica') {
      if (d > 4.5) return flee(st, cop, C);
      if (st.clock - C.t1 < 5) return;
      verdict(st, cop, C); end();
    }
  }
  function flee(st, cop, C) {
    const O = S(st);
    Object.assign(G.SEV, { fuga_controllo: .55 }); Object.assign(G.NOISE, { fuga_controllo: 8 }); G.NEG.fuga_controllo = 1; G.LABEL.fuga_controllo = 'Fuga a un controllo';
    G.say(st, cop, 'Fermo! Fermati!', 2.5); G.feed(st, 'Sei scappato al controllo: ora ti cercano.', 'bad');
    G.emit(st, 'fuga_controllo', { x: st.player.x, y: st.player.y });
    cop.alert = Math.max(cop.alert || 0, .85); st.lastSeen = { x: st.player.x, y: st.player.y, clock: st.clock };
    if (cop.ord) cop.ord.svc = C.back || null; O.ctl = null; O.playerCd = st.clock + 120;
  }
  function verdict(st, cop, C) {
    const O = S(st), p = st.player, inv = p.inv || {}, night = isCurfew(st);
    const lines = [];
    let bad = 0, why = [];
    if (!(inv.carta_identita > 0)) { bad += 2; why.push('senza carta d\'identità'); }
    if ((C.why === 'varco' || C.why === 'base')) {
      if (inv.lasciapassare > 0) lines.push('Lasciapassare in regola.');
      else if (inv.documenti > 0) { if (Math.random() < .25) { bad += 3; why.push('lasciapassare falso'); delete inv.documenti; } else lines.push('Il lasciapassare passa. Per stavolta.'); }
      else { bad += C.why === 'base' ? 3 : 1; why.push('senza lasciapassare'); }
    }
    if (night) { bad += 1; why.push('coprifuoco'); }
    // perquisizione
    const frisk = Math.random() < (C.why === 'blocco' || C.why === 'base' ? .7 : .4) + (st.ris ? st.ris.repr / 300 : 0);
    let seized = [];
    if (frisk) {
      O.stats.perquisizioni++;
      const cb = contraband(st);
      if (cb.length) {
        seized = cb.slice(0, 4); bad += 2;
        seized.forEach(k => { if (k.startsWith('arma:')) { const w = k.slice(5); delete p.arms[w]; if (p.cur === w) p.cur = 'pugni'; } else delete inv[k]; });
        why.push('roba proibita addosso');
      }
    }
    if (bad === 0) {
      G.say(st, cop, pick(Math.random, ['In regola. Circolare.', 'Va bene. Vada.', frisk ? 'Pulito. Può andare.' : 'Può andare.']), 2.4);
      G.feed(st, frisk ? 'Ti hanno perquisito. Niente. Puoi andare.' : 'Documenti in regola. Puoi andare.', 'good');
      if (C.why === 'varco' || C.why === 'base') O.passOk = st.t + 120;
      return;
    }
    if (bad <= 2) {
      const m = 5 + bad * 5; p.money -= m; O.stats.multe++;
      G.say(st, cop, `Multa: ${why.join(', ')}. ${m}.000 lire.`, 3);
      G.feed(st, `Multa di ${m}.000 lire (${why.join(', ')})${seized.length ? '. Sequestrati: ' + seized.map(nomeOgg).join(', ') : ''}.`, 'bad');
      G.addLog(st, `${G.clockStr(st.t)} · Controllo dei Grigi: multa di ${m}.000 lire (${why.join(', ')}).`, 'bad');
      if (C.why === 'base' || C.why === 'varco') { const v = PLACES.varco; if (v) { p.x = v.x - 10; p.y = v.y; } G.feed(st, 'Ti riaccompagnano fuori dal Varco.', 'info'); }
      return;
    }
    G.say(st, cop, 'Lei viene con noi.', 2.5);
    G.addLog(st, `${G.clockStr(st.t)} · Fermato dai Grigi: ${why.join(', ')}${seized.length ? '. Sequestrati: ' + seized.map(nomeOgg).join(', ') : ''}.`, 'bad');
    O.stats.fermi++;
    if (G.arrestPlayer) G.arrestPlayer(st, cop);
  }

  // ================= POSTI DI BLOCCO =================
  // sulle strade principali, qualche volta al giorno: la Campagnola di traverso, le transenne, due o tre Grigi
  function bloccoSpots() {
    const out = [], L = G.LANES || [];
    const want = [['corso', .15], ['corso', .55], ['corso', .9], ['via_porto', .5], ['via_governo', .5], ['litoranea', .93], ['nord', .03], ['monte', .5], ['raccordo_e', .5], ['via_alta', .5]];
    want.forEach(([id, f]) => { const Ln = L.find(l => l.id === id); if (!Ln) return; const q = G.laneAt(Ln, Ln.L * f); out.push({ x: q.x, y: q.y, ang: q.ang, lane: id, place: G.nearestPlace ? (Object.values(PLACES).reduce((b, p) => (dist(p.x, p.y, q.x, q.y) < dist(b.x, b.y, q.x, q.y) ? p : b), PLACES.piazza)).name : '' }); });
    return out;
  }
  let SPOTS = null;
  function bloccoStep(st) {
    const O = S(st);
    if (O.blocco) {
      const B = O.blocco;
      if (st.t > B.until || B.agents.every(id => { const n = G.byId(st, id); return !n || n.dead; })) { endBlocco(st); }
      return;
    }
    if (st.t < O.nextBlocco) return;
    O.nextBlocco = st.t + 1440 / CFG.blocchiAlGiorno * (.6 + Math.random() * .8);
    if (!SPOTS) SPOTS = bloccoSpots(); if (!SPOTS.length) return;
    const free = O.agents.map(id => G.byId(st, id)).filter(n => n && !n.dead && n.ord.kind === 'grigio' && onDuty(st, n) && (!n.ord.svc || n.ord.svc.k === 'ronda' || n.ord.svc.k === 'piantone') && !engineTakes(st, n)).slice(0, 3);
    if (free.length < 2) return;
    const sp = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    const B = O.blocco = { id: O.nextId++, x: sp.x, y: sp.y, ang: sp.ang, place: sp.place, lane: sp.lane, until: st.t + rrand(CFG.bloccoMin), agents: [], car: 'gr_camp1', t0: st.t };
    free.forEach((n, i) => { endSvc(st, n); n.ord.svc = { k: 'blocco', slot: i }; B.agents.push(n.id); });
    // la Campagnola dei Grigi: se il giocatore è lontano è già lì, se no arriva guidando
    const car = st.vehicles.find(v => v.id === B.car && !v.wreck && v.rider !== 'player');
    if (car) { const far = dist(st.player.x, st.player.y, B.x, B.y) > 70; B.carHome = { x: car.x, y: car.y, ang: car.ang }; const px = B.x + Math.cos(B.ang) * 6, py = B.y + Math.sin(B.ang) * 6; if (far) { car.x = px; car.y = py; car.ang = B.ang + Math.PI / 2; car.vx = car.vy = 0; car.speed = 0; car.parkedBlocco = true; } else { car.driveTo = { x: px, y: py, ang: B.ang + Math.PI / 2 }; } car.ronda = true; }
    O.rev++;
    G.addLog(st, `${G.clockStr(st.t)} · Posto di blocco dei Grigi vicino a ${B.place}.`, 'info');
    if (dist(st.player.x, st.player.y, B.x, B.y) < 160) G.feed(st, `Posto di blocco dei Grigi vicino a ${B.place}.`, 'bad');
  }
  function endBlocco(st) {
    const O = S(st), B = O.blocco; if (!B) return;
    B.agents.forEach(id => { const n = G.byId(st, id); if (n && n.ord && n.ord.svc && n.ord.svc.k === 'blocco') n.ord.svc = null; });
    const car = st.vehicles.find(v => v.id === B.car);
    if (car && B.carHome && car.rider !== 'player' && !car.wreck) { if (dist(st.player.x, st.player.y, car.x, car.y) > 70) { car.x = B.carHome.x; car.y = B.carHome.y; car.ang = B.carHome.ang; car.vx = car.vy = 0; car.speed = 0; } else car.driveTo = { x: B.carHome.x, y: B.carHome.y, ang: B.carHome.ang }; }
    O.blocco = null; O.rev++;
  }
  // le posizioni: uno per corsia con la paletta, uno alla macchina
  function bloccoSlot(B, i) {
    const nx = -Math.sin(B.ang), ny = Math.cos(B.ang);
    if (i === 0) return { x: B.x + nx * 2.2 - Math.cos(B.ang) * 2, y: B.y + ny * 2.2 - Math.sin(B.ang) * 2, face: B.ang + Math.PI };
    if (i === 1) return { x: B.x - nx * 2.2 + Math.cos(B.ang) * 2, y: B.y - ny * 2.2 + Math.sin(B.ang) * 2, face: B.ang };
    return { x: B.x + nx * 5.5 + Math.cos(B.ang) * 6, y: B.y + ny * 5.5 + Math.sin(B.ang) * 6, face: B.ang + Math.PI / 2 };
  }
  function bloccoMove(st, n, dt) {
    const O = S(st), B = O.blocco; if (!B) { n.ord.svc = null; return true; }
    let s = bloccoSlot(B, n.ord.svc.slot);
    if (!G.walkM(s.x, s.y)) s = { x: B.x, y: B.y, face: s.face };
    if (seek(st, n, s.x, s.y, dt, 1.6, .4)) {
      stand(n, s.face, dt);
      // chi passa a piedi vicino al blocco viene controllato; le macchine rallentano (e quella del giocatore si ferma)
      if (n.ord.svc.slot < 2 && st.clock > (n.ord.bT || 0)) {
        n.ord.bT = st.clock + 6;
        const p = st.player, d = dist(p.x, p.y, B.x, B.y);
        if (!O.ctl && d < 9 && st.clock > (O.playerCd || 0) && (!p.vehicle || Math.random() < .8)) { startCheck(st, n, 'blocco'); return true; }
        spotCheck(st, n, 6);
      }
    }
    return true;
  }
  // le macchine del traffico rallentano e passano a passo d'uomo davanti al blocco
  function bloccoTraffic(st) {
    const B = S(st).blocco; if (!B) return;
    for (const v of st.vehicles) { if (!v.traffic || v.hidden || v.ronda) continue; const d = dist(v.x, v.y, B.x, B.y); if (d < 14 && v.speed > 2.5) v.speed = Math.max(2.5, v.speed - 6 * (1 / 30)); }
  }

  // ================= VOLANTI =================
  function volantiStep(st, dt) {
    const O = S(st);
    O.volanti.forEach(V => {
      const car = st.vehicles.find(v => v.id === V.car); if (!car) return;
      if (car.wreck || car.rider === 'player' || car.stolen) { V.crew.forEach(id => { const n = G.byId(st, id); if (n && n.ord) { n.inside = false; n.car = null; if (n.ord.svc && n.ord.svc.k === 'volante') n.ord.svc = null; } }); V.crew = []; V.mode = 'persa'; car.traffic = false; car.siren = false; return; }
      const crew = V.crew.map(id => G.byId(st, id)).filter(n => n && !n.dead);
      if (crew.length !== V.crew.length) V.crew = crew.map(n => n.id);
      if (!crew.length && V.mode !== 'parcheggio') { car.traffic = false; car.siren = false; car.driveTo = null; car.rider = null; V.mode = 'parcheggio'; V.away = true; }
      if (V.away && !crew.length && dist(st.player.x, st.player.y, car.x, car.y) > 80 && dist(st.player.x, st.player.y, car.home.x, car.home.y) > 80) { car.x = car.home.x; car.y = car.home.y; car.ang = 0; car.vx = car.vy = 0; car.speed = 0; V.away = false; }
      if (V.mode === 'parcheggio') {
        if (crew.length >= 2) { // salgono e partono
          const q = PLACES.commissariato, inN = crew.every(n => n.inside || dist(n.x, n.y, car.x, car.y) < 2.2);
          crew.forEach(n => { if (!n.inside && dist(n.x, n.y, car.x, car.y) >= 2.2) seek(st, n, car.x, car.y, dt, 1.6, 1.8); else { n.inside = true; n.car = car.id; n.x = car.x; n.y = car.y; } });
          if (inN) { toLane(st, car); car.traffic = true; car.rider = 'npc'; car.speed = 3; V.mode = 'giro'; V.until = st.t + 6 + Math.random() * 14; }
        }
        return;
      }
      crew.forEach(n => { if (n.inside) { n.x = car.x; n.y = car.y; } });
      if (V.mode === 'giro') {
        car.siren = false;
        if (!crew.length) { car.traffic = false; car.rider = null; V.mode = 'parcheggio'; return; }
        // fine turno: si torna in caserma
        if (crew.some(n => !onDuty(st, n))) { V.mode = 'rientro'; car.traffic = false; car.driveTo = { x: car.home.x, y: car.home.y, ang: 0 }; return; }
        if (st.t > V.until && car.speed < 9 && dist(car.x, car.y, st.player.x, st.player.y) < 160) {
          // una sosta: si accosta, scendono, controllano chi c'è
          const sp = G.parkSpot ? G.parkSpot(car.x, car.y, false) : null;
          if (sp && dist(sp.x, sp.y, car.x, car.y) < 10) { car.traffic = false; car.driveTo = { x: sp.x, y: sp.y, ang: car.ang, then: 'sosta' }; V.mode = 'accosta'; }
          else V.until = st.t + 3;
        }
        return;
      }
      if (V.mode === 'accosta') { if (!car.driveTo) { V.mode = 'sosta'; V.until = st.t + 8 + Math.random() * 12; crew.forEach((n, i) => { n.inside = false; n.car = null; n.x = car.x + Math.cos(car.ang + (i ? 1 : -1) * Math.PI / 2) * 1.8; n.y = car.y + Math.sin(car.ang + (i ? 1 : -1) * Math.PI / 2) * 1.8; if (!G.walkM(n.x, n.y)) { n.x = car.x - Math.cos(car.ang) * 2.6; n.y = car.y - Math.sin(car.ang) * 2.6; } n.ord.vSosta = { x: n.x, y: n.y }; }); } return; }
      if (V.mode === 'sosta') {
        crew.forEach(n => { if (n.ord.svc && n.ord.svc.k === 'controllo') return; if (n.action.name === 'ordine_volante' && st.clock > (n.ord.vT || 0)) { n.ord.vT = st.clock + 4; spotCheck(st, n, 10); } });
        if (st.t > V.until && !crew.some(n => n.ord.svc && n.ord.svc.k !== 'volante')) { V.mode = 'parcheggio_s'; }
        return;
      }
      if (V.mode === 'parcheggio_s') {
        const inN = crew.every(n => n.inside || dist(n.x, n.y, car.x, car.y) < 2.2);
        crew.forEach(n => { if (n.ord.svc && n.ord.svc.k !== 'volante') return; if (!n.inside && dist(n.x, n.y, car.x, car.y) >= 2.2) { seek(st, n, car.x, car.y, dt, 1.6, 1.8); } else { n.inside = true; n.car = car.id; } });
        if (inN) { toLane(st, car); car.traffic = true; car.rider = 'npc'; V.mode = 'giro'; V.until = st.t + 8 + Math.random() * 16; }
        return;
      }
      if (V.mode === 'rientro') {
        if (!car.driveTo) { crew.forEach(n => { n.inside = false; n.car = null; n.x = car.x + 1.5; n.y = car.y + 1.5; endSvc(st, n); }); V.crew = []; V.mode = 'parcheggio'; car.rider = null; }
        return;
      }
      if (V.mode === 'inseguimento') {
        car.siren = true; car.traffic = false;
        const p = st.player, lv = G.wantedLevel(st), tgt = st.lastSeen || p;
        if (lv === 0 && st.clock - (V.calmT || st.clock) > 25) { V.mode = 'rientro'; car.siren = false; crew.forEach(n => { n.inside = true; n.car = car.id; }); car.driveTo = { x: car.home.x, y: car.home.y, ang: 0 }; return; }
        if (lv > 0) V.calmT = st.clock;
        if (V.out) { // scesi: combattono col motore; quando l'allarme si spegne risalgono
          if (lv === 0) { const inN = crew.every(n => n.inside || dist(n.x, n.y, car.x, car.y) < 2.4); crew.forEach(n => { if (!n.inside) { n.ord.svc = { k: 'volante', V: V.i }; seek(st, n, car.x, car.y, dt, 2.2, 2); if (dist(n.x, n.y, car.x, car.y) < 2.4) { n.inside = true; n.car = car.id; } } }); if (inN) V.out = false; }
          return;
        }
        if (dist(car.x, car.y, tgt.x, tgt.y) < 10 || car.stuck > 4) {
          car.driveTo = null; car.speed *= .5; V.out = true; crew.forEach((n, i) => { n.inside = false; n.car = null; n.x = car.x + Math.cos(car.ang + (i ? 1 : -1) * Math.PI / 2) * 1.8; n.y = car.y + Math.sin(car.ang + (i ? 1 : -1) * Math.PI / 2) * 1.8; if (!G.walkM(n.x, n.y)) { n.x = car.x; n.y = car.y; } n.alert = Math.max(n.alert, .85); });
          G.say(st, crew[0], 'Volante sul posto! Fermo!', 2.4); return;
        }
        if (!car.driveTo || dist(car.driveTo.x, car.driveTo.y, tgt.x, tgt.y) > 6) car.driveTo = { x: tgt.x, y: tgt.y, chase: true };
      }
    });
  }
  function startChase(st, V) {
    const car = st.vehicles.find(v => v.id === V.car); if (!car || car.wreck || car.rider === 'player') return;
    const crew = V.crew.map(id => G.byId(st, id)).filter(n => n && !n.dead); if (!crew.length) return;
    if (V.mode === 'sosta' || V.mode === 'parcheggio_s' || V.mode === 'parcheggio') { crew.forEach(n => { n.inside = true; n.car = car.id; }); }
    V.mode = 'inseguimento'; V.out = false; car.traffic = false; car.rider = 'npc'; car.siren = true; car.speed = Math.max(car.speed, 4); V.calmT = st.clock;
    G.feed(st, 'Una volante a sirene spiegate.', 'bad');
  }
  // sistema la macchina sulla corsia più vicina, nel senso giusto
  function toLane(st, v) {
    const L = G.LANES; let best = null, bd = 1e9;
    L.forEach((Ln, i) => { for (let s = 0; s < Ln.L; s += 3) { const q = G.laneAt(Ln, s), d = dist(q.x, q.y, v.x, v.y); if (d < bd) { bd = d; best = { i, s, ang: q.ang }; } } });
    if (!best) return;
    const dir = Math.cos(angDiff(v.ang, best.ang)) >= 0 ? 1 : -1;
    v.lane = { i: best.i, s: best.s, dir }; v.dir = dir;
    if (bd > 3) { const q = G.lanePos(L[best.i], best.s, dir); v.x = q.x; v.y = q.y; v.ang = q.ang; }
  }
  // guida verso un punto fuori dalle corsie (Campagnola al blocco, volante in caserma, camion della nave, inseguimento)
  function driveStep(st, v, dt) {
    const T = v.driveTo; if (!T || v.rider === 'player' || v.wreck) return;
    if (v.rider !== 'npc') v.rider = 'npc';
    if (!v.path || !v.path.length || st.clock - (v.pathT || 0) > (T.chase ? 2.5 : 8)) { v.path = G.findPath(v.x, v.y, T.x, T.y, 1) || []; v.pathT = st.clock; }
    const d = dist(v.x, v.y, T.x, T.y);
    if (d < (T.chase ? 6 : 3) || (!v.path.length && d < 14)) {
      v.speed *= .8; v.vx = (v.vx || 0) * .8; v.vy = (v.vy || 0) * .8;
      if (Math.abs(v.speed) < .6) { v.speed = 0; v.vx = v.vy = 0; if (T.ang !== undefined) v.ang = T.ang; v.driveTo = null; v.path = []; if (!v.livrea) v.rider = null; }
      return;
    }
    if (!v.path.length) { v.stuck = (v.stuck || 0) + dt; if (v.stuck > 6) { v.driveTo = null; if (!v.livrea) v.rider = null; } return; }
    let w = v.path[0]; while (v.path.length > 1 && dist(v.x, v.y, w.x, w.y) < 3) { v.path.shift(); w = v.path[0]; }
    const want = Math.atan2(w.y - v.y, w.x - v.x), off = Math.abs(angDiff(want, v.ang));
    const slow = d < 18 || off > .8;
    const x0 = v.x, y0 = v.y;
    G.vehicleMotion(st, v, dt, want, off > 1.4 && v.speed > 5 ? 0 : slow && v.speed > 6 ? 0 : 1, off > 1.4 && v.speed > 5 || (slow && v.speed > 7), !!T.chase && !slow, false);
    if (dist(x0, y0, v.x, v.y) < .02) v.stuck = (v.stuck || 0) + dt; else v.stuck = Math.max(0, (v.stuck || 0) - dt);
    if (G.runOver && Math.hypot(v.vx || 0, v.vy || 0) > 5) G.runOver(st, v, 'police');
  }

  // ================= LA NAVE AL PORTO MILITARE =================
  // l'Impero: lunedì e giovedì all'alba (economia.js fa lo sbarco alle 6); la Marina della Tutela: mercoledì e sabato.
  // in rada dalle 4, ormeggio alle 6, scarico fino alle 10 sotto scorta, partenza alle 11.
  const BERTH = { x: 1300, y: 155, ang: Math.PI }, SEA = { x: 1470, y: 182 }, QUAY = { x: 1281, y: 146 };
  function naveStep(st, dt) {
    const O = S(st), N = O.nave, P = PO(), wd = P ? P.weekday(st.t) : Math.floor(st.t / 1440) % 7, m = minOf(st.t);
    const today = wd === 0 || wd === 3 ? 'impero' : wd === 2 || wd === 5 ? 'militare' : null;
    const lerpTo = (tx, ty, k) => { const a = Math.atan2(ty - N.y, tx - N.x); N.ang += angDiff(a, N.ang) * Math.min(1, dt * .3); const sp = k * dt; const d = dist(N.x, N.y, tx, ty); if (d < sp) { N.x = tx; N.y = ty; return true; } N.x += Math.cos(N.ang) * sp; N.y += Math.sin(N.ang) * sp; return false; };
    if (N.phase === 'lontana') { if (today && m >= 4 * 60 && m < 5 * 60 + 40) { N.phase = 'arrivo'; N.kind = today; N.x = SEA.x; N.y = SEA.y; N.ang = Math.PI; N.crates = 0; O.rev++; } return; }
    if (N.phase === 'arrivo') {
      const u = clamp((m - 4 * 60) / 115, 0, 1), e = 1 - (1 - u) * (1 - u), px = N.x, py = N.y;
      N.x = SEA.x + (BERTH.x + 18 - SEA.x) * e - 18 * Math.max(0, (u - .8) / .2) ** 2; N.y = SEA.y + (BERTH.y - SEA.y) * Math.min(1, e * 1.15);
      if (Math.hypot(N.x - px, N.y - py) > .001) N.ang = Math.atan2(N.y - py, N.x - px);
      if (u >= 1 || m >= 6 * 60) { N.x = BERTH.x; N.y = BERTH.y; N.ang = BERTH.ang; N.phase = 'ormeggiata'; N.t = st.t; O.stats.navi++; startUnload(st); O.rev++;
        G.addLog(st, `${G.clockStr(st.t)} · ${N.kind === 'impero' ? 'La nave dell\'Impero' : 'La nave della Marina della Tutela'} ha attraccato al porto cargo.`, 'info'); }
      return;
    }
    if (N.phase === 'ormeggiata') {
      // le casse scendono una alla volta; la scorta guarda
      if (m < 10 * 60) { const want = Math.floor(clamp((m - 6 * 60) / 240, 0, 1) * 24); if (want > N.crates) { N.crates = want; O.rev++; } }
      else if (m >= 11 * 60) { N.phase = 'partenza'; endUnload(st); O.rev++; }
      return;
    }
    if (N.phase === 'partenza') {
      const u = clamp((m - 11 * 60) / 100, 0, 1), e = u * u, px = N.x, py = N.y;
      N.x = BERTH.x + (SEA.x - BERTH.x) * e; N.y = BERTH.y + (SEA.y - BERTH.y) * e + Math.sin(u * Math.PI) * 6;
      if (Math.hypot(N.x - px, N.y - py) > .001) N.ang = Math.atan2(N.y - py, N.x - px);
      if (u >= 1 || m >= 13 * 60) { N.phase = 'lontana'; N.crates = 0; O.rev++; }
    }
  }
  function startUnload(st) {
    const O = S(st), N = O.nave;
    // due soldati del porto e (se c'è la nave dell'Impero) un Grigio scortano lo scarico
    N.crew = [];
    st.npcs.forEach(n => { if (n.ord && n.ord.kind === 'soldato' && n.ord.post && n.ord.post.port && !n.dead) N.crew.push(n.id); });
    // il camion della Tutela: dal porto al supermercato con la merce
    if (N.kind === 'impero' && SUPER) {
      let truck = st.vehicles.find(v => v.id === 'camion_tutela');
      if (!truck) { truck = G.makeVehicle(st, { id: 'camion_tutela', kind: 'camion', x: QUAY.x - 8, y: QUAY.y + 2, ang: Math.PI, color: '#5a6250', military: true, tutela: true, rider: null }); st.vehicles.push(truck); }
      O.camion = { phase: 'carico', at: st.t + 90 };
    }
  }
  function endUnload(st) { const O = S(st); O.nave.crew = []; }
  function camionStep(st, dt) {
    const O = S(st), C = O.camion; if (!C) return;
    const v = st.vehicles.find(k => k.id === 'camion_tutela'); if (!v || v.wreck || v.rider === 'player') { O.camion = null; return; }
    const far = dist(st.player.x, st.player.y, v.x, v.y) > 90;
    if (C.phase === 'carico' && st.t >= C.at) {
      const sp = SUPER.door, tx = sp.x + SUPER.out.x * 5, ty = sp.y + SUPER.out.y * 5, ps = (G.parkSpot && G.parkSpot(tx, ty, true)) || { x: tx, y: ty };
      C.phase = 'viaggio'; C.dest = ps; v.rider = 'npc';
      if (far && dist(st.player.x, st.player.y, ps.x, ps.y) > 90) { v.x = ps.x; v.y = ps.y; v.vx = v.vy = 0; v.speed = 0; } else v.driveTo = { x: ps.x, y: ps.y };
      return;
    }
    if (C.phase === 'viaggio') {
      if (!v.driveTo || dist(v.x, v.y, C.dest.x, C.dest.y) < 6) { v.driveTo = null; C.phase = 'scarico'; C.at = st.t + 35; restock(st); G.addLog(st, `${G.clockStr(st.t)} · Il camion della Tutela scarica la merce al Supermercato del Popolo. Si fa la fila.`, 'info'); startCoda(st); }
      else if (far && st.t > C.at + 120) { v.x = C.dest.x; v.y = C.dest.y; v.driveTo = null; }
      return;
    }
    if (C.phase === 'scarico' && st.t >= C.at) {
      C.phase = 'ritorno';
      if (far) { v.x = QUAY.x - 8; v.y = QUAY.y + 2; v.rider = null; O.camion = null; } else v.driveTo = { x: QUAY.x - 8, y: QUAY.y + 2 };
      return;
    }
    if (C.phase === 'ritorno' && (!v.driveTo || far)) { if (far) { v.x = QUAY.x - 8; v.y = QUAY.y + 2; } v.driveTo = null; v.rider = null; O.camion = null; }
  }
  // le scorte del supermercato: quelle vere di economia.js
  function superShop(st) { const E = EC(); if (!E || !st.eco || !SUPER) return null; const S0 = st.eco.shops || {}; for (const k in S0) { const s = S0[k]; if (s.t && s.t.bi !== undefined && G.BUILDINGS[s.t.bi] === SUPER.b) return s; if (s.t && s.t.id === SUPER.id) return s; } return null; }
  function restock(st) {
    const sh = superShop(st); if (!sh) return;
    for (const g in sh.sells || {}) sh.stock[g] = Math.max(sh.stock[g] || 0, 6 + Math.floor(Math.random() * 6));
  }
  function stockLevel(st) {
    const sh = superShop(st); if (!sh) return 1;
    let t = 0, n = 0; for (const g in sh.sells || {}) { t += Math.min(1, (sh.stock[g] || 0) / 6); n++; }
    return n ? t / n : 1;
  }

  // ================= LA FILA AL SUPERMERCATO =================
  function startCoda(st) {
    const O = S(st); if (!SUPER) return;
    O.coda = { active: true, list: [], t0: st.t, until: st.t + 150, nextIn: st.t + 2, cop: null };
    // chi ha la dispensa vuota (e abita in zona) si mette in fila
    const P = PO(), d0 = SUPER.door;
    const cand = st.npcs.filter(n => n.pop && !n.pop.cast && !n.dead && !n.cop && !n.faction && !(n.jailedUntil > st.t) && n.pop.age > 16 && n.pop.homeT && dist(n.pop.homeT.x, n.pop.homeT.y, d0.x, d0.y) < 220 && !(n.ord && (n.ord.protester || n.ord.fermato)))
      .map(n => [n, (n.pop.pantry || 0) - (n.pop.need && n.pop.need.fame || 0) * 4 + Math.random() * 3]).sort((a, b) => a[1] - b[1]).slice(0, 14);
    cand.forEach(([n]) => joinCoda(st, n));
  }
  function joinCoda(st, n) {
    const O = S(st), C = O.coda; if (!C || C.list.includes(n.id)) return;
    n.ord = n.ord || {}; n.ord.coda = { at: st.t };
    // chi è lontano dal giocatore arriva subito in fila; chi è vicino ci cammina
    if (n.inside || dist(n.x, n.y, st.player.x, st.player.y) > 70) { const q = codaPos(C.list.length); n.x = q.x; n.y = q.y; n.inside = false; if (n.pop) { n.pop.near = true; n.pop.lod = 'vicino'; } }
    C.list.push(n.id);
  }
  function codaPos(i) { const D = SUPER.door, o = SUPER.out, s = SUPER.side; return { x: D.x + o.x * 1.6 + s.x * (1.2 + i * .85), y: D.y + o.y * 1.6 + s.y * (1.2 + i * .85), face: Math.atan2(-s.y, -s.x) }; }
  function codaStep(st) {
    const O = S(st), C = O.coda; if (!C) return;
    O.superVuoto = stockLevel(st) < .15;
    C.list = C.list.filter(id => { const n = G.byId(st, id); return n && !n.dead && n.ord && n.ord.coda && !(n.jailedUntil > st.t); });
    if (st.t >= C.nextIn && C.list.length) {
      C.nextIn = st.t + 4 + Math.random() * 4;
      const n = G.byId(st, C.list[0]), q = codaPos(0);
      if (n && dist(n.x, n.y, q.x, q.y) < 2) {
        C.list.shift(); n.ord.coda = null; O.stats.codaServiti++;
        const P = n.pop; if (P) { if (O.superVuoto) { if (PO()) PO().note(st, n, 'tre ore di fila al supermercato e gli scaffali erano vuoti', 'bad', { w: .55, tag: 'fame' }); if (P.need) P.need.rabbia = clamp((P.need.rabbia || 0) + .15, 0, 1); } else { P.pantry = (P.pantry || 0) + 6; P.money = (P.money || 0) - 7; if (PO()) PO().note(st, n, 'fatto la fila al supermercato: c\'era la merce della nave', 'good', { w: .3, tag: 'spesa' }); } }
        n.inside = true; n.x = SUPER.door.x; n.y = SUPER.door.y; n.action = { name: 'dentro', scores: [], why: 'Dentro il supermercato.', since: st.clock };
        const sh = superShop(st); if (sh) for (const g of ['pane', 'pasta', 'latte', 'olio', 'zucchero']) if (sh.stock[g] > 0) sh.stock[g]--;
      }
    }
    if (st.t > C.until || (!C.list.length && st.t > C.t0 + 20)) { C.list.forEach(id => { const n = G.byId(st, id); if (n && n.ord) n.ord.coda = null; }); const c = C.cop && G.byId(st, C.cop); if (c && c.ord && c.ord.svc && c.ord.svc.k === 'coda') c.ord.svc = null; O.coda = null; }
  }
  function codaMove(st, n, dt) {
    const C = S(st).coda; if (!C) { n.ord.coda = null; return true; }
    const i = C.list.indexOf(n.id); if (i < 0) { n.ord.coda = null; return true; }
    const q = codaPos(i);
    if (seek(st, n, q.x, q.y, dt, 1.25, .25)) { stand(n, q.face, dt); if (Math.random() < .002) G.say(st, n, pick(Math.random, ['Ma quanto ci vuole?', 'Speriamo che resti qualcosa.', 'Ieri non c\'era neanche il pane.', 'Non spinga!', 'Mio figlio ha fame.']), 2.6); }
    return true;
  }
  function codaGuardMove(st, n, dt) {
    const C = S(st).coda; if (!C) { n.ord.svc = null; return true; }
    const q = codaPos(Math.min(4, C.list.length)), D = SUPER.door, s = SUPER.side, o = SUPER.out, x = D.x + o.x * 3.4 + s.x * 2.4, y = D.y + o.y * 3.4 + s.y * 2.4;
    if (seek(st, n, x, y, dt, 1.3, .4)) { stand(n, Math.atan2(q.y - y, q.x - x), dt); if (Math.random() < .0015) G.say(st, n, pick(Math.random, ['In fila! Uno alla volta.', 'Tessera in mano.', 'Chi spinge torna a casa senza niente.']), 2.4); }
    return true;
  }

  // ================= PROTESTE =================
  const SLOGAN = {
    pane: ['Pane! Pane!', 'Abbiamo fame!', 'Gli scaffali sono vuoti!', 'Dov\'è la nave?', 'La tessera non si mangia!'],
    arresto: ['Liberatelo!', 'Assassini!', 'Ridateci {nome}!', 'Vergogna!', 'Non ha fatto niente!'],
    rabbia: ['Basta!', 'Ce ne avete prese abbastanza!', 'Via i Grigi!', 'L\'isola è nostra!', 'Non abbiamo paura!'],
    risacca: ['La Risacca non si ferma!', 'Libertà!', 'Abbasso il Garante!', 'Ridateci i nostri!', 'L\'onda torna sempre!'],
  };
  const BANNER = { pane: ['PANE', 'ABBIAMO FAME', 'LA NAVE È NOSTRA'], arresto: ['LIBERATELI', 'RIDATECI {NOME}', 'BASTA FERMI'], rabbia: ['BASTA', 'VIA I GRIGI', 'NON ABBIAMO PAURA'], risacca: ['LIBERTÀ', 'LA RISACCA', 'ABBASSO IL GARANTE', 'L\'ONDA TORNA'] };
  function protesteStep(st, dt) {
    const O = S(st);
    O.proteste = O.proteste.filter(Pr => protestaTick(st, Pr, dt));
    if (st.t < O.nextProt || O.proteste.length) return;
    O.nextProt = st.t + CFG.protestaOgni * (.7 + Math.random() * .6);
    const h = hourOf(st.t); if (h < 8 || h >= 21) return;
    const P = PO(), wd = P ? P.weekday(st.t) : 0;
    // la Risacca organizza: il sabato alle 17 (annunciato il venerdì), col morale alto
    const R = st.ris;
    if (R && R.morale >= 35 && wd === 5 && h === 17 && !O.orgDone) { O.orgDone = true; return startProtest(st, { kind: 'organizzata', motivo: 'risacca', place: Math.random() < .5 ? 'piazza' : 'piazza_gov', size: 16 + Math.floor(R.morale / 4), corteo: true }); }
    if (wd === 4 && h >= 10 && R && R.morale >= 35 && !O.annunciata) { O.annunciata = st.t; G.feed(st, 'Volantini sui muri: «Sabato alle 17, tutti in piazza».', 'rumor'); G.addLog(st, `${G.clockStr(st.t)} · Gira la voce di una manifestazione sabato alle 17.`, 'info'); }
    if (wd === 6) { O.orgDone = false; O.annunciata = 0; }
    // spontanea: un arresto davanti a tutti
    if (O.lastArrest && st.t - O.lastArrest.t < 40) {
      const wit = st.npcs.filter(n => n.pop && !n.cop && !n.dead && !n.inside && dist(n.x, n.y, O.lastArrest.x, O.lastArrest.y) < 25).length;
      const repr = R ? R.repr / 100 : .1;
      if (wit >= 5 && Math.random() < .25 + repr * .3) { const who = G.byId(st, O.lastArrest.who); O.lastArrest = null; return startProtest(st, { kind: 'spontanea', motivo: 'arresto', x: who ? who.x : undefined, y: who ? who.y : undefined, place: 'commissariato', size: 8 + wit, nome: who ? who.first : '', march: 'commissariato' }); }
    }
    // spontanea: la fame (supermercato vuoto, nave trattenuta)
    if (O.superVuoto && SUPER && Math.random() < .35) return startProtest(st, { kind: 'spontanea', motivo: 'pane', place: 'supermercato', size: 10 + Math.floor(Math.random() * 10) });
    // spontanea: la rabbia della città
    let tot = 0, k = 0; for (const n of st.npcs) { if (n.pop && n.pop.need && !n.cop) { tot += n.pop.need.rabbia || 0; k++; } }
    const anger = k ? tot / k : 0;
    if (anger > .28 && Math.random() < (anger - .28) * 1.6) startProtest(st, { kind: 'spontanea', motivo: 'rabbia', place: pick(Math.random, ['piazza', 'piazza_gov', 'calata']), size: 8 + Math.floor(anger * 30) });
  }
  function startProtest(st, o) {
    const O = S(st), q = PLACES[o.place] || PLACES.piazza; if (!q) return;
    const x = o.x !== undefined ? o.x : q.x, y = o.y !== undefined ? o.y : q.y;
    // chi viene: i più arrabbiati e coraggiosi del quartiere, chi è della Risacca (quella organizzata), chi passa
    const PL = PO();
    const cand = st.npcs.filter(n => n.pop && !n.pop.cast && !n.dead && !n.cop && !n.faction && !(n.jailedUntil > st.t) && n.pop.age >= 15 && n.pop.age < 75 && !(n.ord && (n.ord.protester || n.ord.fermato || n.ord.coda)) && !(PL && PL.isPassive(st, n)))
      .map(n => { const N = n.pop.need || {}, ide = n.ris ? n.ris.ideo : .3, d = dist(n.x, n.y, x, y); return [n, (N.rabbia || 0) * 1.5 + ide * (o.kind === 'organizzata' ? 2 : .8) - (N.paura || 0) * 1.2 + (n.tr ? n.tr.cor : .5) * .6 - d / 160 + Math.random() * .4]; })
      .filter(a => a[1] > .35).sort((a, b) => b[1] - a[1]).slice(0, Math.min(40, o.size));
    if (cand.length < 5) return;
    const Pr = { id: O.nextId++, kind: o.kind, motivo: o.motivo, place: q.name, pid: o.place, x, y, t0: st.t, phase: 'raduno', until: st.t + (o.kind === 'organizzata' ? 30 : 18), people: [], leader: null, nome: o.nome || '', corteo: !!o.corteo, march: o.march || null, route: null, ri: 0, police: [], warn: 0, arrested: 0, hurt: 0, line: null, blind: null };
    if (Pr.corteo) Pr.route = ['piazza', 'corso_c', 'piazza_gov'];
    cand.forEach(([n], i) => {
      n.ord = n.ord || {}; n.ord.protester = { pr: Pr.id, slot: i, ang: Math.random() * 6.28, rad: .8 + Math.sqrt(i) * .75, resolve: clamp((n.ris ? n.ris.ideo : .3) + (n.pop.need.rabbia || 0) - (n.pop.need.paura || 0) * .7 + .3, .05, 1) };
      n.path = []; if (n.inside && dist(n.x, n.y, st.player.x, st.player.y) > 60) { const s = G.wanderSpot(st, q); n.x = s.x; n.y = s.y; } n.inside = false; if (n.pop) { n.pop.near = true; n.pop.lod = 'vicino'; }
      const ban = BANNER[Pr.motivo] || BANNER.rabbia; if (i % 3 === 0) { n.ord.protester.banner = pick(Math.random, ban).replace('{NOME}', (Pr.nome || '').toUpperCase()); n.hand = 'cartello'; }
      Pr.people.push(n.id);
    });
    Pr.leader = Pr.people[0];
    O.proteste.push(Pr); O.stats.proteste++; O.rev++;
    const what = { pane: 'per il pane', arresto: `per ${Pr.nome || 'chi hanno portato via'}`, rabbia: 'contro i Grigi', risacca: 'della Risacca' }[Pr.motivo];
    G.addLog(st, `${G.clockStr(st.t)} · ${Pr.kind === 'organizzata' ? 'Manifestazione' : 'Protesta spontanea'} ${what} a ${Pr.place}: ${Pr.people.length} persone.`, 'info');
    if (dist(st.player.x, st.player.y, x, y) < 220) G.feed(st, `${Pr.kind === 'organizzata' ? 'Manifestazione' : 'Protesta'} ${what} a ${Pr.place}.`, 'rumor');
    if (st.ris) st.ris.morale = clamp(st.ris.morale + (Pr.kind === 'organizzata' ? 4 : 2), 0, 100);
    // la centrale manda il reparto antisommossa
    Pr.policeAt = st.t + (Pr.kind === 'organizzata' ? 4 : 8 + Math.random() * 8);
    return Pr;
  }
  function protestCenter(st, Pr) {
    if (Pr.phase === 'corteo' || Pr.phase === 'cordone' || Pr.phase === 'carica') { const L = G.byId(st, Pr.leader); if (L && !L.dead && L.ord && L.ord.protester) return { x: L.x, y: L.y }; }
    return { x: Pr.x, y: Pr.y };
  }
  function protestaTick(st, Pr, dt) {
    const O = S(st), alive = Pr.people.filter(id => { const n = G.byId(st, id); return n && !n.dead && n.ord && n.ord.protester && n.ord.protester.pr === Pr.id && !(n.jailedUntil > st.t); });
    Pr.people = alive;
    if (!alive.includes(Pr.leader)) Pr.leader = alive[0] || null;
    // i cori
    if (st.clock > (Pr.chantT || 0) && alive.length) { Pr.chantT = st.clock + 1.8 + Math.random() * 2.5; const n = G.byId(st, pick(Math.random, alive)); if (n && Pr.phase !== 'carica') G.say(st, n, pick(Math.random, SLOGAN[Pr.motivo] || SLOGAN.rabbia).replace('{nome}', Pr.nome || 'lui'), 2.2); if (Math.random() < .3) st.sfx.push({ k: 'folla', x: Pr.x, y: Pr.y }); }
    // il reparto antisommossa
    if (!Pr.police.length && st.t >= Pr.policeAt && Pr.phase !== 'fine') sendRiot(st, Pr);
    const pol = Pr.police.map(id => G.byId(st, id)).filter(n => n && !n.dead);
    if (Pr.phase === 'raduno' && st.t > Pr.until && Pr.corteo && Pr.route) { Pr.phase = 'corteo'; Pr.ri = 0; }
    if (Pr.phase === 'raduno' && Pr.march && st.t > Pr.t0 + 6) { Pr.phase = 'corteo'; Pr.route = [Pr.march]; Pr.ri = 0; }
    if (Pr.phase === 'corteo') {
      const L = G.byId(st, Pr.leader); if (L) { const pid = Pr.route[Pr.ri]; const q = pid === 'corso_c' ? corsoMid() : PLACES[pid]; if (q && dist(L.x, L.y, q.x, q.y) < 4) { Pr.ri++; if (Pr.ri >= Pr.route.length) { Pr.phase = 'raduno'; Pr.x = L.x; Pr.y = L.y; Pr.until = st.t + 25; Pr.corteo = false; Pr.march = null; } } }
    }
    // cordone: gli agenti in fila davanti alla folla, il megafono
    if (pol.length && (Pr.phase === 'raduno' || Pr.phase === 'corteo' || Pr.phase === 'cordone')) {
      const c = protestCenter(st, Pr), lineOk = pol.filter(n => n.ord && n.ord.svc && n.ord.svc.k === 'antisommossa' && n.ord.svc.phase === 'cordone').length;
      if (Pr.phase !== 'cordone' && pol.some(n => dist(n.x, n.y, c.x, c.y) < 18)) { Pr.phase = 'cordone'; Pr.warnAt = st.t + 2; Pr.x = c.x; Pr.y = c.y; }
      if (Pr.phase === 'cordone' && st.t >= Pr.warnAt && lineOk >= Math.min(3, pol.length)) {
        Pr.warn++; Pr.warnAt = st.t + 3 + Math.random() * 2;
        const cap = pol[0]; G.say(st, cap, Pr.warn < 3 ? `Sciogliete l'assembramento! ${Pr.warn === 1 ? 'Primo' : 'Secondo'} avviso!` : 'Carica!', 3);
        st.sfx.push({ k: 'megafono', x: cap.x, y: cap.y });
        // a ogni avviso qualcuno se ne va
        alive.forEach(id => { const n = G.byId(st, id); if (!n) return; const P = n.ord.protester; if (Math.random() > P.resolve * (Pr.warn < 3 ? 1.1 : .9)) leaveProtest(st, n, Pr, 'avviso'); });
        if (Pr.warn >= 3) { Pr.phase = 'carica'; O.stats.cariche++; G.addLog(st, `${G.clockStr(st.t)} · I Grigi caricano la folla a ${Pr.place}.`, 'bad'); if (dist(st.player.x, st.player.y, Pr.x, Pr.y) < 120) G.feed(st, `I Grigi caricano la protesta a ${Pr.place}!`, 'bad'); panicNear(st, Pr.x, Pr.y, 22); }
      }
    }
    if (Pr.phase === 'carica') {
      const left = Pr.people.length;
      if (!left || st.t > (Pr.chargeEnd || (Pr.chargeEnd = st.t + 20))) { endProtest(st, Pr, left ? 'dispersa' : 'sgomberata'); return false; }
    }
    if (Pr.phase === 'raduno' && !pol.length && st.t > Pr.until + (Pr.kind === 'organizzata' ? 40 : 25)) { endProtest(st, Pr, 'finita'); return false; }
    if (!alive.length && Pr.phase !== 'carica') { endProtest(st, Pr, 'svanita'); return false; }
    return true;
  }
  const corsoMid = () => { const L = (G.LANES || []).find(l => l.id === 'corso'); if (!L) return PLACES.piazza; const q = G.laneAt(L, L.L * .7); return { x: q.x, y: q.y }; };
  function panicNear(st, x, y, r) { st.npcs.forEach(n => { if (n.cop || n.dead || n.inside || n.ord && n.ord.protester) return; if (dist(n.x, n.y, x, y) < r) { n.panic = 4 + Math.random() * 4; n.fleeFrom = { x, y }; } }); }
  function leaveProtest(st, n, Pr, why) {
    const P = n.ord && n.ord.protester; if (!P) return;
    n.ord.protester = null; if (n.hand === 'cartello') n.hand = null;
    Pr.people = Pr.people.filter(id => id !== n.id);
    if (why !== 'fine') { n.panic = why === 'carica' ? 5 + Math.random() * 4 : 2 + Math.random() * 3; n.fleeFrom = { x: Pr.x, y: Pr.y }; }
    const PL = PO();
    if (PL && n.pop) {
      const t = { avviso: 'alla protesta: al secondo avviso dei Grigi me ne sono andat' + (n.pop.sex === 'f' ? 'a' : 'o'), carica: 'i Grigi hanno caricato la protesta: sono scappat' + (n.pop.sex === 'f' ? 'a' : 'o'), fine: 'sono stat' + (n.pop.sex === 'f' ? 'a' : 'o') + ' alla protesta, eravamo in tanti' }[why] || 'alla protesta';
      PL.note(st, n, t, why === 'fine' ? 'good' : 'bad', { w: why === 'carica' ? .7 : .45, tag: 'protesta' });
      const N = n.pop.need; if (N) { if (why === 'fine') { N.rabbia = clamp((N.rabbia || 0) - .25, 0, 1); N.compagnia = clamp((N.compagnia || 0) - .3, 0, 1); } else { N.paura = clamp((N.paura || 0) + (why === 'carica' ? .25 : .1), 0, 1); N.rabbia = clamp((N.rabbia || 0) + (why === 'carica' ? .2 : .03), 0, 1); } }
      if (n.ris && why === 'carica') n.ris.ideo = clamp(n.ris.ideo + .04, 0, 1);
    }
  }
  function endProtest(st, Pr, how) {
    const O = S(st);
    Pr.people.forEach(id => { const n = G.byId(st, id); if (n) leaveProtest(st, n, Pr, Pr.phase === 'carica' ? 'carica' : 'fine'); });
    Pr.police.forEach(id => { const n = G.byId(st, id); if (n && n.ord) { n.ord.svc = null; n.hand = null; n.ord.riot = false; } });
    if (Pr.blind) { const v = st.vehicles.find(k => k.id === Pr.blind); if (v && !v.wreck && v.rider !== 'player') v.driveTo = v.homeB ? { x: v.homeB.x, y: v.homeB.y } : null; }
    Pr.phase = 'fine'; O.rev++;
    if (st.ris) { if (how === 'finita') st.ris.morale = clamp(st.ris.morale + 3, 0, 100); else { st.ris.repr = clamp(st.ris.repr + 3, 0, 100); st.ris.morale = clamp(st.ris.morale + (Pr.arrested > 2 ? -2 : 1), 0, 100); } }
    G.addLog(st, `${G.clockStr(st.t)} · La protesta a ${Pr.place} è ${how}${Pr.arrested ? `: ${Pr.arrested} fermati` : ''}${Pr.hurt ? `, ${Pr.hurt} feriti` : ''}.`, how === 'finita' ? 'info' : 'bad');
  }
  // il reparto: chi è di turno (e se non basta, chi riposa in caserma), la Campagnola o il Blindato
  function sendRiot(st, Pr) {
    const O = S(st), cnt = Math.min(10, Math.max(4, Math.round(Pr.people.length / 2.5)));
    const pool = O.agents.map(id => G.byId(st, id)).filter(n => n && !n.dead && n.ord.kind === 'grigio' && !engineTakes(st, n) && !(n.ord.svc && ['scorta', 'controllo', 'antisommossa', 'controllo_p'].includes(n.ord.svc.k)))
      .sort((a, b) => (onDuty(st, b) ? 1 : 0) - (onDuty(st, a) ? 1 : 0) + (dist(a.x, a.y, Pr.x, Pr.y) - dist(b.x, b.y, Pr.x, Pr.y)) / 400).slice(0, cnt);
    if (!pool.length) { Pr.policeAt = st.t + 15; return; }
    const far = dist(st.player.x, st.player.y, Pr.x, Pr.y) > 80;
    pool.forEach((n, i) => {
      endSvc(st, n); n.ord.svc = { k: 'antisommossa', pr: Pr.id, slot: i, phase: 'arrivo', extra: true }; n.ord.riot = true; n.hand = 'manganello'; n.inside = false;
      if (far || dist(n.x, n.y, Pr.x, Pr.y) > 120) { const q = PLACES.commissariato; const a = Math.atan2(Pr.y - q.y, Pr.x - q.x); n.x = Pr.x - Math.cos(a) * (20 + Math.random() * 4) + (Math.random() - .5) * 3; n.y = Pr.y - Math.sin(a) * (20 + Math.random() * 4) + (Math.random() - .5) * 3; if (!G.walkM(n.x, n.y)) { const s = G.wanderSpot(st, PLACES[Pr.pid] || PLACES.piazza); n.x = s.x; n.y = s.y; } }
      Pr.police.push(n.id);
    });
    // il Blindato se la folla è grande
    const bl = st.vehicles.find(v => v.id === (Pr.people.length > 14 ? 'gr_blind' : 'gr_camp1') && !v.wreck && v.rider !== 'player' && !(O.blocco && O.blocco.car === v.id));
    if (bl) { Pr.blind = bl.id; bl.homeB = bl.homeB || { x: bl.x, y: bl.y }; const a = Math.atan2(Pr.y - bl.y, Pr.x - bl.x), tx = Pr.x - Math.cos(a) * 22, ty = Pr.y - Math.sin(a) * 22; if (far) { const ps = (G.parkSpot && G.parkSpot(tx, ty, true)) || { x: tx, y: ty }; bl.x = ps.x; bl.y = ps.y; bl.ang = a; bl.vx = bl.vy = 0; bl.speed = 0; } else bl.driveTo = { x: tx, y: ty }; bl.ronda = true; }
    G.addLog(st, `${G.clockStr(st.t)} · Arriva il reparto antisommossa (${pool.length} Grigi${bl ? (bl.kind === 'blindato' ? ' e il Blindato' : ' e la Campagnola') : ''}).`, 'bad');
    st.sfx.push({ k: 'sirena', x: Pr.x, y: Pr.y });
  }
  function cordoneMove(st, n, dt) {
    const O = S(st), s = n.ord.svc, Pr = O.proteste.find(q => q.id === s.pr);
    if (!Pr || Pr.phase === 'fine') { n.ord.svc = null; n.ord.riot = false; n.hand = null; return true; }
    const c = protestCenter(st, Pr), q = PLACES.commissariato || c;
    // la linea si mette tra la folla e la caserma (o da dove sono arrivati), a 8 m dal centro
    if (!Pr.line || st.clock - (Pr.lineT || 0) > 4) { const a = Math.atan2((Pr.police[0] && G.byId(st, Pr.police[0]) ? G.byId(st, Pr.police[0]).y : q.y) - c.y, (Pr.police[0] && G.byId(st, Pr.police[0]) ? G.byId(st, Pr.police[0]).x : q.x) - c.x); Pr.line = { a }; Pr.lineT = st.clock; }
    const a = Pr.line.a, N = Pr.police.length, k = s.slot - (N - 1) / 2, rad = Pr.phase === 'carica' ? 0 : 8.5;
    const lx = c.x + Math.cos(a) * rad - Math.sin(a) * k * 1.2, ly = c.y + Math.sin(a) * rad + Math.cos(a) * k * 1.2;
    if (Pr.phase !== 'carica') {
      const ok = seek(st, n, G.walkM(lx, ly) ? lx : c.x + Math.cos(a) * rad, G.walkM(lx, ly) ? ly : c.y + Math.sin(a) * rad, dt, s.phase === 'arrivo' ? 2.6 : 1.4, .4);
      if (ok) { s.phase = 'cordone'; stand(n, a + Math.PI, dt); } return true;
    }
    // la carica: ognuno sceglie il manifestante più vicino e lo colpisce; qualcuno lo ferma
    s.phase = 'carica';
    let tgt = s.tgt && G.byId(st, s.tgt);
    if (!tgt || tgt.dead || !tgt.ord || !tgt.ord.protester) { tgt = null; let bd = 1e9; for (const id of Pr.people) { const m = G.byId(st, id); if (!m) continue; const d = dist(n.x, n.y, m.x, m.y); if (d < bd) { bd = d; tgt = m; } } s.tgt = tgt ? tgt.id : null; }
    // anche il giocatore, se è in mezzo
    const p = st.player, dp = dist(n.x, n.y, p.x, p.y);
    if (dp < 2.5 && !p.vehicle && dist(p.x, p.y, Pr.x, Pr.y) < 14 && st.clock > (n.ord.hitT || 0)) { n.ord.hitT = st.clock + 1.6; n.gesture = .4; if (G.damagePlayer) G.damagePlayer(st, 9, Math.atan2(p.y - n.y, p.x - n.x), n.id); p.stun = Math.max(p.stun || 0, .5); G.say(st, n, 'Via! Via di qua!', 1.6); }
    if (!tgt) { stand(n, undefined, dt); return true; }
    const d = dist(n.x, n.y, tgt.x, tgt.y);
    if (d > 1.1) { seek(st, n, tgt.x, tgt.y, dt, 3.6, .9); return true; }
    if (st.clock > (n.ord.hitT || 0)) {
      n.ord.hitT = st.clock + 1.2; n.gesture = .4; faceTo(n, tgt.x, tgt.y, 1);
      tgt.stun = Math.max(tgt.stun, 1.2 + Math.random() * 1.8); tgt.hp -= 8; tgt.hitT = st.clock; Pr.hurt++;
      st.sfx.push({ k: 'botta', x: tgt.x, y: tgt.y });
      if (Math.random() < .3 && Pr.arrested < 6) { Pr.arrested++; leaveProtest(st, tgt, Pr, 'carica'); tgt.panic = 0; fermo(st, n, tgt, 'protesta non autorizzata'); s.tgt = null; return true; }
      leaveProtest(st, tgt, Pr, 'carica'); s.tgt = null;
    }
    return true;
  }
  function thinkProtester(st, n) {
    if (n.dead || n.stun > 0) return false;
    if (n.panic > 0 && n.ord.protester) { const Pr = S(st).proteste.find(q => q.id === n.ord.protester.pr); if (Pr && Pr.phase === 'carica') { leaveProtest(st, n, Pr, 'carica'); return false; } }
    n.inside = false; n.action = { name: 'ordine_protesta', scores: [], why: 'In piazza a protestare.', since: n.action.name === 'ordine_protesta' ? n.action.since : st.clock }; return true;
  }
  function protesterMove(st, n, dt) {
    const O = S(st), P = n.ord.protester; if (!P) return false;
    const Pr = O.proteste.find(q => q.id === P.pr); if (!Pr) { n.ord.protester = null; return false; }
    if (Pr.phase === 'carica') { // si scappa
      if (!n.ord.protester) return false; leaveProtest(st, n, Pr, 'carica'); return false;
    }
    if (Pr.phase === 'corteo' && n.id === Pr.leader) {
      const pid = Pr.route[Pr.ri], q = pid === 'corso_c' ? corsoMid() : PLACES[pid];
      if (q) seek(st, n, q.x, q.y, dt, .95, 1); return true;
    }
    const c = protestCenter(st, Pr), L = G.byId(st, Pr.leader);
    let x, y;
    if (Pr.phase === 'corteo' && L && L !== n) { // dietro al capo, a file
      const row = Math.floor((P.slot) / 4) + 1, col = P.slot % 4 - 1.5;
      x = L.x - Math.cos(L.face) * row * 1.1 - Math.sin(L.face) * col * .9; y = L.y - Math.sin(L.face) * row * 1.1 + Math.cos(L.face) * col * .9;
    } else { x = c.x + Math.cos(P.ang) * P.rad; y = c.y + Math.sin(P.ang) * P.rad; }
    if (!G.walkM(x, y)) { x = c.x; y = c.y; }
    if (seek(st, n, x, y, dt, Pr.phase === 'corteo' ? 1.05 : 1.3, .5)) {
      // fermi in piazza: verso il centro (o verso il cordone)
      const pol = Pr.police.length ? G.byId(st, Pr.police[0]) : null;
      if (pol && Pr.phase === 'cordone') faceTo(n, pol.x, pol.y, dt); else faceTo(n, c.x, c.y, dt);
      n.speedNow = 0; if (Math.random() < .004) n.gesture = .5;
    }
    return true;
  }

  // ================= LA SCORTA ALLA NAVE =================
  function naveGuardMove(st, n, dt) { n.ord.svc = null; return true; }

  // ================= GLI ABITANTI CHE VEDONO =================
  function noteOf(st, n, text) { const PL = PO(); if (PL && n.pop) PL.note(st, n, text, 'info', { w: .2, tag: 'servizio' }); }

  // ================= IL PASSO =================
  let acc = 0;
  function step(st, dt) {
    const O = S(st); if (!O) return;
    try {
      playerCheckStep(st, dt);
      volantiStep(st, dt);
      for (const v of st.vehicles) if (v.driveTo) driveStep(st, v, dt);
      bloccoTraffic(st);
      acc += dt; if (acc < .5) return; const dts = acc; acc = 0;
      centrale(st);
      bloccoStep(st);
      naveStep(st, dts);
      camionStep(st, dts);
      codaStep(st);
      protesteStep(st, dts);
      O.ronde.forEach(R => { R.a = R.a.filter(id => { const n = G.byId(st, id), s = n && !n.dead && n.ord && n.ord.svc; if (!s) return false; for (let q = s, k = 0; q && k < 4; q = q.back, k++) if (q.k === 'ronda' && q.R === R.id) return true; return false; }); });
      O.ronde = O.ronde.filter(R => R.a.length);
      // chi ha finito un controllo e non ha più servizio torna libero; chi è stato rilasciato dal fermo perde lo stato
      st.npcs.forEach(n => { if (n.ord && n.ord.stopped && st.t > n.ord.stopped.until + 2) n.ord.stopped = null; });
    } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[ordine]', e); } }
  }

  // ================= RESOCONTO =================
  function report(st) {
    const O = S(st); if (!O) return null;
    const ag = O.agents.map(id => G.byId(st, id)).filter(Boolean);
    const by = f => { const o = {}; ag.forEach(n => { const k = f(n); o[k] = (o[k] || 0) + 1; }); return o; };
    return {
      agenti: ag.length, diTurno: ag.filter(n => onDuty(st, n)).length, servizi: by(n => n.ord.svc ? n.ord.svc.k : (onDuty(st, n) ? 'libero' : 'riposo')), azioni: by(n => n.action.name),
      volanti: O.volanti.map(V => V.mode + '/' + V.crew.length).join(' '), ronde: O.ronde.length, blocco: O.blocco ? O.blocco.place : null,
      proteste: O.proteste.map(p => `${p.kind} ${p.motivo} ${p.phase} ${p.people.length} (pol ${p.police.length})`), nave: `${O.nave.kind} ${O.nave.phase} casse ${O.nave.crates}`,
      coda: O.coda ? O.coda.list.length : 0, scorte: Math.round(stockLevel(st) * 100), stats: O.stats, supermercato: SUPER ? SUPER.b.name : null,
    };
  }
  // per la grafica e per il menu: cosa sta facendo un agente
  function label(st, n) { const s = n.ord && n.ord.svc; return s ? ({ ronda: 'ronda', volante: 'in volante', blocco: 'posto di blocco', piantone: 'piantone', antisommossa: 'antisommossa', scorta: 'porta un fermato', controllo: 'controllo', controllo_p: 'ti controlla', coda: 'ordine alla fila' }[s.k] || s.k) : null; }

  // ================= INSTALLAZIONE =================
  (function install() {
    const H = G.HOOKS; if (H.__ordine) return; H.__ordine = true;
    Object.assign(G.SEV, { fuga_controllo: .55, intrusione: .7 }); Object.assign(G.NOISE, { fuga_controllo: 8, intrusione: 6 }); Object.assign(G.NEG, { fuga_controllo: 1, intrusione: 1 }); Object.assign(G.LABEL, { fuga_controllo: 'Fuga a un controllo', intrusione: 'Intrusione nella zona militare' });
    const c0 = H.create, t0 = H.think, m0 = H.move, s0 = H.step, v0 = H.verb;
    H.create = st => { if (c0) c0(st); try { create(st); } catch (e) { if (typeof console !== 'undefined') console.warn('[ordine] create', e); } };
    H.think = (st, n) => (st.ord && n.ord && think(st, n)) || (t0 ? t0(st, n) : false);
    H.move = (st, n, dt, a) => (st.ord && n.ord && move(st, n, dt, a)) || (m0 ? m0(st, n, dt, a) : false);
    H.step = (st, dt) => { if (s0) s0(st, dt); step(st, dt); };
    H.verb = (st, m, T) => (m.type === 'fuga_controllo' ? 'è scappato a un controllo dei Grigi' : m.type === 'intrusione' ? 'è entrato nella zona militare' : v0 ? v0(st, m, T) : null);
  })();

  return { CFG, SUPER, BERTH, QUAY, create, step, report, label, docsOf, contraband, startCheck, startProtest, sendRiot, onDuty, isCurfew, stockLevel, restock, startCoda, bloccoSlot, endBlocco, toLane };
})();
if (typeof module !== 'undefined') module.exports = Ordine;
