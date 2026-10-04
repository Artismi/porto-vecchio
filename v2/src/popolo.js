/* Porto Vecchio — Il Popolo (solo logica, nessuna grafica).
   Gli abitanti dell'isola: famiglie nelle case, lavoratori nelle botteghe, pensionati, disoccupati,
   piccola criminalità, ricettatori, trafficanti, Orecchi. Ognuno ha casa, mestiere con orario d'ingresso,
   puntualità, soldi, affitto, debiti, parenti e amici, un diario, appuntamenti e una settimana fatta di
   giorni diversi (mercato, messa, paga, Bollettino, Ora Quieta).
   La popolazione si costruisce dalla mappa (case e botteghe di World): se la città cresce, cresce anche lei.
   Simulazione a due livelli: chi è vicino al giocatore vive per intero nel motore (percorsi, reazioni,
   passaparola); chi è lontano segue gli orari e si sposta di colpo, senza percorsi né grafica.
   Si aggancia a Game.HOOKS dopo la Risacca, concatenando gli agganci che trova. */
var Popolo = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const W = typeof World !== 'undefined' ? World : require('./world.js');
  const RS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const TS = G.TS, PLACES = G.PLACES, MPS = G.MIN_PER_SEC;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---------------- REGOLAZIONI ----------------
  const CFG = {
    max: 420,          // abitanti al massimo (la mappa ne può offrire di più)
    near: 52,          // entro questa distanza dal giocatore si vive per intero (m)
    far: 66,           // oltre questa si torna al livello leggero (isteresi)
    maxNear: 70,       // quanti al massimo a pieno contemporaneamente
    lodEvery: .5,      // secondi reali tra due controlli di distanza
    talkEvery: 15,     // minuti di gioco tra due giri di chiacchiere lontane
  };

  // ---------------- CALENDARIO ----------------
  // la partita comincia martedì alle 18: il giorno 0 è un martedì
  const WEEK = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  const dayIdx = t => Math.floor(t / 1440);
  const weekday = t => (dayIdx(t) + 1) % 7;          // 0 = lunedì
  const wdName = t => WEEK[weekday(t)];
  const minOfDay = t => ((t % 1440) + 1440) % 1440;
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(Math.floor(m % 60)).padStart(2, '0');
  // quando è successa una cosa, detto come lo direbbe una persona
  function ago(st, t) {
    const d = dayIdx(st.t) - dayIdx(t), h = Math.floor(minOfDay(t) / 60);
    const part = h < 6 ? 'notte' : h < 12 ? 'mattina' : h < 18 ? 'pomeriggio' : 'sera';
    if (d === 0) { const m = st.t - t; return m < 50 ? 'poco fa' : part === 'mattina' ? 'stamattina' : part === 'notte' ? 'stanotte' : part === 'sera' ? 'stasera' : 'oggi pomeriggio'; }
    if (d === 1) return part === 'sera' || part === 'notte' ? 'ieri sera' : `ieri ${part === 'mattina' ? 'mattina' : 'pomeriggio'}`;
    if (d < 7) return WEEK[weekday(t)];
    return `${d} giorni fa`;
  }
  // l'Ora Quieta: coprifuoco dalle 24 alle 5, dalle 22 quando la repressione è alta
  function curfewFrom(st) { const R = st.ris; const rl = R ? Math.min(5, Math.floor(R.repr / 20)) : 0; return rl >= 4 ? 22 * 60 : 24 * 60; }
  // eventi ricorrenti della settimana: [giorno (0 lun … 6 dom, -1 tutti), dalle, alle, id, luogo, nome]
  const RECURRING = [
    [-1, 6 * 60, 8 * 60, 'pesce', 'molo', 'Asta del pesce al molo'],
    [0, 9 * 60, 10 * 60, 'bollettino', 'piazza', 'Lettura del Bollettino della Tutela (presenza obbligatoria)'],
    [2, 7 * 60, 13 * 60, 'mercato', 'piazza', 'Mercato rionale in piazza'],
    [5, 7 * 60, 13 * 60, 'mercato', 'piazza', 'Mercato rionale in piazza'],
    [3, 21 * 60, 23 * 60, 'tombola', 'circolo', 'Tombola al Circolo dei Lavoratori'],
    [4, 18 * 60, 19 * 60, 'paga', null, 'Venerdì: si ritira la paga della settimana'],
    [0, 8 * 60, 9 * 60, 'affitto', null, 'Lunedì: si paga l\'affitto'],
    [5, 22 * 60, 27 * 60, 'sabato', 'disco', 'Sabato sera alla Discoteca Luna'],
    [6, 10 * 60, 11 * 60, 'messa', 'chiesa', 'Messa grande della domenica'],
    [6, 17 * 60, 20 * 60, 'struscio', 'lungomare', 'Passeggiata della domenica sul lungomare'],
    [-1, 18 * 60, 19 * 60, 'vespro', 'chiesa', 'Vespro a San Rocco'],
  ];
  function eventsOn(st, day) { const wd = (day + 1) % 7; return RECURRING.filter(e => e[0] === -1 || e[0] === wd); }

  // ---------------- NOMI E ASPETTO ----------------
  const NOMI_M = ['Antonio', 'Giovanni', 'Salvatore', 'Giuseppe', 'Efisio', 'Gavino', 'Bachisio', 'Mario', 'Franco', 'Bruno', 'Enzo', 'Nello', 'Totò', 'Pasquale', 'Raimondo', 'Ignazio', 'Luigi', 'Sergio', 'Piero', 'Aldo', 'Gianni', 'Paolo', 'Marco', 'Stefano', 'Roberto', 'Claudio', 'Tore', 'Peppino', 'Michele', 'Carmine', 'Renato', 'Fausto', 'Dario', 'Lino', 'Ugo', 'Elio', 'Mauro', 'Angelo', 'Vittorio', 'Cosimo'];
  const NOMI_F = ['Maria', 'Giovanna', 'Anna', 'Rosaria', 'Tina', 'Lella', 'Pina', 'Bonaria', 'Grazia', 'Antonietta', 'Franca', 'Carmela', 'Teresa', 'Lucia', 'Paola', 'Marisa', 'Rita', 'Silvana', 'Luisa', 'Ornella', 'Giuseppina', 'Assunta', 'Caterina', 'Elisa', 'Laura', 'Daniela', 'Sandra', 'Gina', 'Ada', 'Nives', 'Iolanda', 'Wanda', 'Loredana', 'Patrizia', 'Clara', 'Mirella'];
  const COGNOMI = ['Esposito', 'Russo', 'Ferrara', 'Greco', 'Marino', 'Rizzo', 'Lombardi', 'Gallo', 'Costa', 'Fontana', 'Conti', 'De Luca', 'Mancini', 'Caruso', 'Serra', 'Pinna', 'Sanna', 'Melis', 'Deiana', 'Murru', 'Piras', 'Loi', 'Cocco', 'Porcu', 'Fadda', 'Atzori', 'Mura', 'Lai', 'Usai', 'Carta', 'Puddu', 'Floris', 'Manca', 'Cabras', 'Mele', 'Spanu', 'Contu', 'Pisano', 'Orrù', 'Zedda', 'Ledda', 'Satta', 'Tola', 'Solinas', 'Pintus', 'Vacca', 'Bassu', 'Dessì', 'Cossu', 'Arru', 'Podda', 'Saba', 'Olla', 'Boi', 'Marras', 'Fois', 'Corda', 'Medda', 'Murgia', 'Serra'];
  const SOPRANNOMI = ['il Rosso', 'Mezzalingua', 'Zampa', 'il Muto', 'Tredici', 'Gattone', 'Sorcio', 'Lampo', 'Ciccio', 'il Monaco', 'Biscotto', 'Ferretto', 'Sciabica', 'Polpo', 'Ombra', 'Spillo'];
  const SKIN = ['#f0cfb2', '#e6c2a2', '#e0b894', '#dcae88', '#d8a982', '#c99a76', '#b9825c', '#a8724e'];
  const HAIR = ['#17110e', '#2a1d14', '#3a2a1a', '#5b3a22', '#6a4a2a', '#8a6a4a', '#b58a58', '#555', '#888', '#cfcac4'];
  const TOPS = ['#8c6a4f', '#5a6e8c', '#9a5b7a', '#6d7b4a', '#7a4f3a', '#4a6a6e', '#c43c52', '#3b5b86', '#e0a72e', '#3f4f3a', '#f1ece2', '#a04a6a', '#2f5a4a', '#6a5a4a', '#e0d8c8', '#ff9ec7', '#35a0a0', '#d86a4a', '#5a6aa8', '#b8a080'];
  const BOTS = ['#2a2a33', '#2b2b38', '#3a3a44', '#1d2230', '#4a4038', '#2c3a55', '#3c444e', '#5a4a3a', '#e9e4da'];

  // ---------------- MESTIERI ----------------
  // per uso dell'edificio (b.use) o id del luogo con nome: [mestiere, posti, paga (migliaia di lire l'ora), inizio, fine, notturno?]
  const JOBS_BY = {
    bar: [['cameriere', 1, 5, 7, 15], ['cameriere del turno di sera', 1, 5, 15, 23]],
    wu: [['commesso', 1, 5, 8, 20]],
    osteria: [['cuoco', 1, 7, 10, 23], ['cameriera', 2, 5, 11, 23]],
    osteria_sg: [['oste', 1, 6, 10, 23]],
    car_2: [['cuoca', 1, 6, 10, 22], ['cameriere', 1, 5, 11, 22]],
    sirena: [['barista', 1, 5, 8, 20]],
    gelateria: [['commessa', 1, 4, 10, 22]],
    miramare: [['attendente al comando', 2, 6, 7, 19], ['cuoco della mensa', 1, 6, 6, 15]],
    flamingo: [['portiere d\'albergo', 1, 6, 7, 19], ['cameriera ai piani', 2, 5, 7, 15]],
    paradiso: [['portiere d\'albergo', 1, 6, 15, 23], ['cameriera ai piani', 2, 5, 7, 15]],
    oceano: [['portiere d\'albergo', 1, 6, 7, 19], ['cameriera ai piani', 1, 5, 7, 15], ['facchino', 1, 4, 8, 18]],
    gabbiano: [['affittacamere', 1, 4, 8, 20]],
    magazzino: [['magazziniere', 3, 6, 7, 16]],
    cantiere: [['carpentiere navale', 4, 7, 7, 16], ['saldatore', 2, 8, 7, 16]],
    officina: [['apprendista meccanico', 1, 4, 8, 18]],
    benzina: [['benzinaio', 1, 5, 7, 20]],
    disco: [['barman', 1, 6, 21, 28, true], ['buttafuori', 2, 6, 21, 28, true]],
    cinema: [['proiezionista', 1, 6, 15, 24], ['cassiera', 1, 4, 15, 23]],
    flipper: [['gestore della sala', 1, 5, 14, 24]],
    video: [['commesso', 1, 4, 10, 20]],
    chiosco: [['bagnino', 1, 4, 9, 19]],
    ambulatorio: [['infermiere', 2, 7, 7, 19]],
    biblioteca: [['impiegata della biblioteca', 1, 5, 8, 18]],
    chiesa: [['sagrestano', 1, 3, 6, 19]],
    santuario: [['custode del santuario', 1, 3, 8, 18]],
    rocca: [['impiegato dell\'Ufficio Rettifiche', 4, 9, 8, 17], ['dattilografa della Tutela', 2, 7, 8, 17]],
    masseria: [['bracciante', 3, 4, 5, 14]],
    cantina: [['vignaiolo', 3, 4, 6, 15]],
    casotto: [['cavatore', 4, 6, 6, 15]],
    salinaio: [['salinaro', 2, 4, 5, 13]],
    panetteria: [['fornaio', 1, 6, 3, 11], ['commessa del forno', 1, 4, 7, 13]],
    farmacia: [['farmacista', 1, 9, 8, 20]],
    lavanderia: [['lavandaia', 2, 4, 8, 18]],
    tipografia: [['tipografo', 2, 7, 7, 17]],
    circolo: [['custode del circolo', 1, 3, 16, 24]],
    scuola: [['maestra', 3, 6, 8, 13], ['bidello', 1, 4, 7, 15]],
    sartoria: [['sarta', 2, 5, 8, 18]],
    pescheria: [['pescivendolo', 1, 5, 6, 13]],
    teatro: [['custode del teatro', 1, 4, 14, 24]],
    palestra: [['istruttore di pugilato', 1, 5, 15, 22]],
    ferramenta: [['ferramenta', 1, 6, 8, 19]],
    ufficio: [['impiegato', 3, 6, 8, 17]],
    barbiere: [['barbiere', 1, 6, 8, 19]],
    tabacchi: [['tabaccaio', 1, 6, 7, 20]],
    fabbrica: [['operaio del primo turno', 6, 5, 6, 14], ['operaia del secondo turno', 5, 5, 14, 22]],
  };
  // lavori all'aperto, senza edificio: posti larghi
  const OUTDOOR = [['molo', 'pescatore', 8, 5, 3, 11], ['calata', 'scaricatore di porto', 6, 6, 6, 15], ['vigne', 'bracciante delle vigne', 4, 4, 6, 14], ['oliveto', 'bracciante dell\'oliveto', 3, 4, 6, 14], ['saline', 'salinaro', 3, 4, 5, 13], ['cava', 'cavatore', 3, 6, 6, 15]];
  // i giri della malavita (attività di notte, sopra o al posto di un mestiere)
  const GIRI = {
    borsaiolo: { label: 'borsaiolo', when: [[10, 13], [17, 21]], places: ['piazza', 'lungomare', 'passeggiata', 'fontana', 'calata'], earn: [2, 8], risk: .05 },
    ladro: { label: 'ladro d\'appartamenti', when: [[1, 4]], places: ['vico', 'piazzetta', 'caruggio'], earn: [6, 25], risk: .08 },
    ricettatore: { label: 'ricettatore dello Squalo', when: [[17, 22]], places: ['magazzino', 'flipper'], earn: [4, 12], risk: .03, boss: 'sandro' },
    spacciatore: { label: 'spaccia la roba', when: [[21, 26]], places: ['flipper', 'disco', 'lungomare'], earn: [8, 30], risk: .07 },
    trafficante: { label: 'traffica armi al porto', when: [[23, 27]], places: ['pontile', 'caletta', 'marina'], earn: [20, 80], risk: .09, boss: 'marcel' },
    orecchio: { label: 'informatore degli Orecchi', when: [[16, 18]], places: ['sirena'], earn: [3, 8], risk: 0, boss: 'zia' },
  };

  // ---------------- STATO DEL MODULO ----------------
  let INDEX = null; // edifici, case, posti di lavoro, luoghi pubblici: calcolato una volta dalla mappa
  function buildIndex() {
    if (INDEX) return INDEX;
    const B = G.BUILDINGS, door = b => ({ x: b.door[0] * TS + TS / 2, y: b.door[1] * TS + TS / 2 });
    const near = (x, y) => G.nearestPlace(x, y).id;
    const homes = [], works = [];
    B.forEach((b, bi) => {
      if (!b.door) return;
      const d = door(b), place = PLACES[b.id] ? b.id : near(d.x, d.y);
      const info = { bi, id: b.id, x: d.x, y: d.y, place, label: b.label || b.name || b.id, name: b.name || b.label };
      const isHome = b.use === 'casa' || b.use === 'cascina' || (b.home && !b.church);
      if (isHome) {
        const area = b.w * b.h * TS * TS, fl = Math.max(1, b.fl || 1);
        info.cap = clamp(Math.round(area * fl / (b.home ? 26 : 42)), 1, b.home ? 24 : 7);
        info.farm = !!b.farm; info.condo = !!b.home;
        homes.push(info);
      }
      const jobs = JOBS_BY[b.id] || JOBS_BY[b.use];
      if (jobs) jobs.forEach(([title, n, pay, a, z, night]) => works.push(Object.assign({}, info, { title, slots: n, pay, start: a, end: z, night: !!night, indoor: true })));
    });
    OUTDOOR.forEach(([pid, title, n, pay, a, z]) => { const p = PLACES[pid]; if (p) works.push({ bi: -1, id: pid, x: p.x, y: p.y, place: pid, label: p.name, name: p.name, title, slots: n, pay, start: a, end: z, indoor: false }); });
    const has = id => !!PLACES[id];
    const byUse = u => B.map((b, bi) => [b, bi]).filter(([b]) => b.use === u && b.door);
    const bplace = id => { const bi = B.findIndex(b => b.id === id); return bi >= 0 && B[bi].door ? bi : -1; };
    // svaghi: [chi ci va, luogo pubblico (id PLACES) o edificio]
    const fun = { bar: ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2'].filter(has), out: ['piazza', 'fontana', 'lungomare', 'passeggiata', 'giardini', 'belvedere', 'molo', 'spiaggia', 'piazzetta'].filter(has), young: ['flipper', 'gelateria', 'cinema', 'spiaggia', 'lungomare'].filter(has), church: ['chiesa', 'santuario', 'chiesa_sg'].filter(has), shops: ['wu'].filter(has) };
    byUse('panetteria').concat(byUse('tabacchi')).forEach(([b]) => fun.shops.push('b:' + b.id));
    byUse('circolo').forEach(([b]) => fun.circolo = 'b:' + b.id);
    INDEX = { homes, works, fun, bplace, door };
    return INDEX;
  }
  // un bersaglio: un edificio (si entra) o un luogo pubblico (si sta fuori)
  function target(ref) {
    if (!ref) return null;
    if (typeof ref === 'object') return ref;
    if (ref.startsWith('b:')) { const bi = G.BUILDINGS.findIndex(b => b.id === ref.slice(2)); return bi >= 0 ? tB(bi) : null; }
    const p = PLACES[ref]; if (!p) return null;
    const bi = G.BUILDINGS.findIndex(b => b.id === ref && b.door);
    if (bi >= 0 && !['chiosco', 'benzina'].includes(ref)) return tB(bi);
    return { k: 'p', pid: ref, x: p.x, y: p.y, label: p.name, place: ref };
  }
  function tB(bi) {
    const b = G.BUILDINGS[bi]; if (!b || !b.door) return null;
    const x = b.door[0] * TS + TS / 2, y = b.door[1] * TS + TS / 2;
    return { k: 'b', bi, x, y, label: b.name || b.label || b.id, place: PLACES[b.id] ? b.id : G.nearestPlace(x, y).id };
  }
  const tkey = t => t ? (t.k === 'b' ? 'b' + t.bi : 'p' + t.pid) : '';

  // ---------------- GENERAZIONE DELLA POPOLAZIONE ----------------
  function populate(st) {
    const IX = buildIndex(), r = W.rng(7919 + G.BUILDINGS.length);
    const people = [], households = [];
    let n = 0;
    const homes = IX.homes.slice().sort((a, b) => W.hash2(a.bi, 3, 41) - W.hash2(b.bi, 3, 41));
    for (const h of homes) {
      let room = h.cap;
      while (room > 0 && n < CFG.max) {
        const sur = pick(r, COGNOMI), roll = r();
        // tipo di famiglia
        let kind = roll < .22 ? 'solo' : roll < .5 ? 'coppia' : roll < .78 ? 'famiglia' : roll < .9 ? 'anziani' : 'coinquilini';
        if (h.farm) kind = r() < .6 ? 'famiglia' : 'coppia';
        const size = { solo: 1, coppia: 2, famiglia: 3 + (r() < .35 ? 1 : 0), anziani: 2, coinquilini: 2 + (r() < .4 ? 1 : 0) }[kind];
        if (size > room && room < 2) kind = 'solo';
        const hh = { id: 'f' + households.length, sur, home: h, members: [] }; households.push(hh);
        const mk = (sex, age, surname, rel) => {
          const p = { k: n++, sex, age, sur: surname || sur, first: pick(r, sex === 'f' ? NOMI_F : NOMI_M), hh: hh.id, rel, home: h };
          hh.members.push(p); people.push(p); return p;
        };
        if (kind === 'solo') mk(r() < .5 ? 'f' : 'm', 20 + Math.floor(r() * 62), null, 'solo');
        else if (kind === 'coppia') { const a = 24 + Math.floor(r() * 40); mk('m', a, null, 'marito'); mk('f', a - 3 + Math.floor(r() * 6), null, 'moglie'); }
        else if (kind === 'anziani') { const a = 66 + Math.floor(r() * 16); mk('m', a, null, 'marito'); mk('f', a - 2 + Math.floor(r() * 4), null, 'moglie'); }
        else if (kind === 'famiglia') { const a = 44 + Math.floor(r() * 18); mk('m', a, null, 'padre'); mk('f', a - 4 + Math.floor(r() * 6), null, 'madre'); for (let i = 2; i < size; i++) mk(r() < .5 ? 'f' : 'm', 18 + Math.floor(r() * Math.min(12, a - 38)), null, 'figlio'); }
        else for (let i = 0; i < size; i++) mk(r() < .5 ? 'f' : 'm', 19 + Math.floor(r() * 14), pick(r, COGNOMI), 'coinquilino');
        room -= size;
      }
      if (n >= CFG.max) break;
    }
    // il lavoro: i posti più vicini a casa, poi chi resta va al porto, nei campi o resta a spasso
    const slots = []; IX.works.forEach(w => { for (let i = 0; i < w.slots; i++) slots.push(w); });
    const free = slots.slice();
    people.filter(p => p.age >= 18 && p.age < 66).sort(() => r() - .5).forEach(p => {
      if (r() < (p.sex === 'f' && p.age > 40 ? .3 : .1)) { p.status = p.sex === 'f' ? 'casalinga' : 'disoccupato'; return; }
      let best = -1, bs = 1e9;
      free.forEach((w, i) => { if (!w) return; const d = dist(p.home.x, p.home.y, w.x, w.y) + r() * 60 + (w.night && p.age > 50 ? 200 : 0); if (d < bs) { bs = d; best = i; } });
      if (best >= 0) { p.job = free[best]; free[best] = null; p.status = 'lavora'; }
      else { const out = IX.works.filter(w => !w.indoor); if (out.length && r() < .6) { p.job = pick(r, out); p.status = 'lavora'; } else p.status = 'disoccupato'; }
    });
    people.forEach(p => { if (!p.status) p.status = p.age >= 66 ? 'pensionato' : 'disoccupato'; });
    // carattere e giri della malavita
    people.forEach(p => {
      p.tr = { cor: r() * .8 + .1, loq: r() * .8 + .2, avid: r() * .8 + .1, legge: r() * .8 + .15 };
      p.punct = clamp(.35 + r() * .7 - (p.age < 25 ? .15 : 0), 0, 1);  // puntualità
      p.faith = clamp(r() * .8 + (p.age > 60 ? .4 : 0), 0, 1);
      p.vice = r() < .12 ? 'vino' : r() < .05 ? 'gioco' : r() < .03 ? 'roba' : null;
      p.money = Math.round(10 + r() * 60 + (p.job ? p.job.pay * 4 : 0));
      p.rent = p.home.condo ? 18 + Math.floor(r() * 10) : p.home.farm ? 6 : 10 + Math.floor(r() * 14);
      p.debt = r() < .18 ? { to: 'sandro', amount: 40 + Math.floor(r() * 300) } : null;
      p.ideo = clamp(.15 + r() * .5, 0, 1);
      if (r() < .07) { p.lost = pick(r, ['il marito', 'un fratello', 'il figlio', 'la sorella', 'un cugino']); p.ideo = clamp(p.ideo + .35, 0, 1); }
      if (p.job && /Tutela|comando/.test(p.job.title)) p.ideo = clamp(p.ideo - .3, 0, 1);
      p.giro = null;
      const shady = (1 - p.tr.legge) * .7 + p.tr.avid * .4 + (p.debt ? .2 : 0) + (p.status === 'disoccupato' ? .2 : 0);
      if (p.age < 60 && shady > .85) {
        const roll = r();
        p.giro = roll < .32 ? 'borsaiolo' : roll < .52 ? 'ladro' : roll < .68 ? 'ricettatore' : roll < .84 ? 'spacciatore' : 'trafficante';
        p.tr.legge = Math.min(p.tr.legge, .2); p.tr.cor = Math.max(p.tr.cor, .55);
        if (r() < .4) p.nick = pick(r, SOPRANNOMI);
      } else if (p.tr.loq > .75 && p.ideo < .3 && r() < .45) p.giro = 'orecchio';
    });
    // amici e colleghi
    const byWork = {}; people.forEach(p => { if (p.job) (byWork[p.job.title + '@' + p.job.id] = byWork[p.job.title + '@' + p.job.id] || []).push(p); });
    people.forEach(p => { p.friends = []; });
    Object.values(byWork).forEach(g => g.forEach(a => g.forEach(b => { if (a !== b && r() < .6) a.friends.push(b.k); })));
    people.forEach(p => { for (let i = 0; i < 2; i++) { const o = people[Math.floor(r() * people.length)]; if (o !== p && Math.abs(o.age - p.age) < 15 && dist(o.home.x, o.home.y, p.home.x, p.home.y) < 120 && !p.friends.includes(o.k)) { p.friends.push(o.k); o.friends.push(p.k); } } });
    return { people, households };
  }

  function lookFor(p, r) {
    const f = p.sex === 'f', old = p.age > 62;
    return {
      skin: pick(r, SKIN), top: pick(r, TOPS), bottom: f && r() < .4 ? pick(r, TOPS) : pick(r, BOTS),
      hair: old ? pick(r, ['#888', '#cfcac4', '#aaa']) : pick(r, HAIR),
      hat: f ? (r() < .5 ? 'long' : r() < .5 ? 'bun' : old ? 'scarf' : 'long') : (r() < .2 ? 'flat' : r() < .08 ? 'fedora' : 'none'),
      hatCol: pick(r, ['#3a3a44', '#15151c', '#5a4a3a']), build: clamp((f ? .88 : 1) + (r() - .4) * .3, .82, 1.25),
      extra: f ? 'donna' : (r() < .3 ? 'moustache' : r() < .15 ? 'glasses' : ''),
    };
  }
  // i mestieri al maschile e al femminile
  const GENDER = [['operaio', 'operaia'], ['cameriere', 'cameriera'], ['magazziniere', 'magazziniera'], ['infermiere', 'infermiera'], ['impiegato', 'impiegata'], ['cuoco', 'cuoca'], ['commesso', 'commessa'],
    ['pescatore', 'pescatrice'], ['portiere', 'portiera'], ['fornaio', 'fornaia'], ['tipografo', 'tipografa'], ['sarto', 'sarta'], ['maestro', 'maestra'], ['bidello', 'bidella'], ['tabaccaio', 'tabaccaia'],
    ['sagrestano', 'sagrestana'], ['salinaro', 'salinara'], ['vignaiolo', 'vignaiola'], ['istruttore', 'istruttrice'], ['dattilografo', 'dattilografa'], ['lavandaio', 'lavandaia'], ['pescivendolo', 'pescivendola'],
    ['cassiere', 'cassiera'], ['affittacamere', 'affittacamere'], ['oste', 'ostessa'], ['gestore', 'gestrice'], ['benzinaio', 'benzinaia'], ['proiezionista', 'proiezionista'], ['facchino', 'facchina']];
  function genderTitle(t, sex) {
    for (const [m, f] of GENDER) { const from = sex === 'f' ? m : f, to = sex === 'f' ? f : m; if (t.startsWith(from)) return to + t.slice(from.length); }
    return t.replace(/ del primo turno| del secondo turno/, x => x);
  }
  function roleOf(p) {
    if (p.status === 'lavora') { const t = genderTitle(p.job.title, p.sex); return t.charAt(0).toUpperCase() + t.slice(1) + (p.job.indoor ? ` (${p.job.name})` : ''); }
    if (p.status === 'pensionato') return p.sex === 'f' ? 'Pensionata' : 'Pensionato';
    if (p.status === 'casalinga') return 'Casalinga';
    return p.sex === 'f' ? 'Disoccupata' : 'Disoccupato';
  }

  // ---------------- DALLE PERSONE AGLI NPC DEL MOTORE ----------------
  function spawn(st) {
    const { people, households } = populate(st), r = W.rng(12011), byK = [];
    st.pop = { households: {}, appts: [], diaryN: 0, lastT: st.t, talkAt: st.t, lodAt: 0, day: -1, hourMark: Math.floor(st.t / 60), stats: { furti: 0, arresti: 0, licenziati: 0, ritardi: 0, appuntamenti: 0, bidoni: 0 }, nearN: 0 };
    households.forEach(h => { st.pop.households[h.id] = { id: h.id, sur: h.sur, home: h.home.bi, members: [] }; });
    people.forEach(p => {
      const id = 'pp' + p.k, name = `${p.first} ${p.sur}${p.nick ? ` «${p.nick}»` : ''}`;
      const homeT = tB(p.home.bi);
      const n = G.makeNpc(st, { id, name, role: roleOf(p), home: homeT.place, tr: p.tr, sched: [[0, homeT.place]], passante: true, popolo: true, look: lookFor(p, r) });
      n.first = p.nick && r() < .5 ? p.nick.replace(/^il /, '') : p.first;
      n.pop = {
        sex: p.sex, age: p.age, sur: p.sur, hh: p.hh, rel: p.rel, homeT, job: p.job ? { title: genderTitle(p.job.title, p.sex), base: p.job.title, pay: p.job.pay, start: p.job.start, end: p.job.end, night: p.job.night, t: p.job.indoor ? tB(p.job.bi) : target(p.job.id), name: p.job.name } : null,
        status: p.status, punct: p.punct, faith: p.faith, vice: p.vice, money: p.money, rent: p.rent, debt: p.debt, owed: 0, late: 0, giro: p.giro, lost: p.lost, friendsK: p.friends,
        need: { fame: .2 + Math.random() * .3, sonno: .2 + Math.random() * .2, igiene: .2 + Math.random() * .3, compagnia: .2 + Math.random() * .3, svago: .2 + Math.random() * .3, rabbia: p.lost ? .3 : .05, paura: .1 + Math.random() * .1 },
        plan: [], lod: 'lontano', cur: null, curKey: '', at: null, diary: [], appt: null, workToday: null, nextDep: 0, jit: r() * 25, near: false, seenEv: {},
      };
      if (n.pop.job && !n.pop.job.t) { n.pop.job = null; n.pop.status = 'disoccupato'; }
      n.x = homeT.x; n.y = homeT.y; n.inside = true; n.pop.at = homeT; n.action = { name: 'altrove', scores: [], why: '', since: 0 };
      st.npcs.push(n); byK[p.k] = n; st.pop.households[p.hh].members.push(id);
      // la scheda per la chat della Risacca: la biografia si legge al momento, col diario aggiornato
      const R = RS(); if (R && R.CARDS && !R.CARDS[id]) R.CARDS[id] = cardFor(st, n, p);
    });
    people.forEach(p => { const n = byK[p.k]; n.pop.friends = p.friends.map(k => byK[k] && byK[k].id).filter(Boolean); });
    // il primo programma: si parte a metà giornata
    st.npcs.forEach(n => { if (n.pop) { planDay(st, n, dayIdx(st.t)); const b = blockNow(st, n); if (b) { n.pop.cur = b; n.pop.curKey = tkey(b.tgt) + '@' + b.at; } snapFar(st, n); } });
    st.pop.day = dayIdx(st.t);
  }
  function cardFor(st, n, p) {
    const P = n.pop;
    const voice = P.giro && P.giro !== 'orecchio' ? 'sbrigativo, sospettoso, parla per mezze frasi' : P.age > 64 ? 'lento, nostalgico, proverbi e lamentele sui prezzi' : P.age < 26 ? 'veloce, informale, un po\' spaccone' : pick(Math.random, ['cordiale ma prudente', 'diretto, stanco', 'chiacchierone', 'riservato, misurato', 'ironico']);
    const card = { voice, ideo: p.ideo, informer: p.giro === 'orecchio' };
    if (P.job && P.job.t && P.job.t.k === 'b' && PLACES[G.BUILDINGS[P.job.t.bi].id]) card.mestiere = { place: G.BUILDINGS[P.job.t.bi].id, pay: P.job.pay };
    if (P.giro && GIRI[P.giro]) card.secret = `Di nascosto ${GIRI[P.giro].label}.`;
    Object.defineProperty(card, 'bio', { enumerable: true, get: () => bioOf(st, n) });
    return card;
  }
  function bioOf(st, n) {
    const P = n.pop, hh = st.pop.households[P.hh], fam = hh ? hh.members.filter(id => id !== n.id).map(id => G.byId(st, id)).filter(Boolean) : [];
    const parts = [`${n.name}, ${P.age} anni. ${n.role}.`];
    parts.push(`Abita in ${P.homeT.label}${fam.length ? ` con ${fam.map(k => k.first + (k.pop.rel ? ` (${relWord(P.rel, k.pop.rel, k.pop.sex)})` : '')).join(', ')}` : `, da sol${o(n)}`}.`);
    if (P.job) parts.push(`Attacca alle ${hhmm(P.job.start * 60)} e stacca alle ${hhmm(P.job.end * 60)}; ${P.late >= 2 ? 'ultimamente arriva spesso tardi e il padrone se n\'è accorto' : P.punct > .75 ? 'non ha mai fatto un minuto di ritardo' : 'qualche volta arriva tardi'}.`);
    if (P.debt) parts.push(`Deve ${Math.round(P.debt.amount)}.000 lire ${P.debt.to === 'sandro' ? 'allo Squalo' : 'in giro'}.`);
    parts.push(P.money < 0 ? 'È al verde.' : P.money < 15 ? 'Ha pochi soldi.' : P.money > 150 ? 'Se la passa bene.' : 'Tira avanti.');
    if (P.lost) parts.push(`Nel '81 hanno rettificato ${P.lost}: non ne parla mai.`);
    if (P.vice) parts.push({ vino: 'Beve più di quanto dovrebbe.', gioco: 'Si gioca i soldi alla bisca.', roba: 'Ha il vizio della roba.' }[P.vice]);
    if (P.appt && P.appt.t > st.t) parts.push(`Ha un appuntamento con ${G.nameOf(st, P.appt.with)} ${dayPhrase(st, P.appt.t)} alle ${hhmm(minOfDay(P.appt.t))} a ${P.appt.label}.`);
    const nd = needWords(P, o(n)); if (nd) parts.push(nd);
    const d = P.diary.slice(-5).map(e => `${ago(st, e.t)}: ${e.text}`); if (d.length) parts.push('Ultimi fatti: ' + d.join('; ') + '.');
    parts.push(`Oggi è ${wdName(st.t)}, sono le ${G.clockStr(st.t)}.`);
    return parts.join(' ');
  }
  function relWord(me, other, sex) {
    if ((me === 'marito' && other === 'moglie') || (me === 'moglie' && other === 'marito')) return sex === 'f' ? 'la moglie' : 'il marito';
    if ((me === 'padre' || me === 'madre') && other === 'figlio') return sex === 'f' ? 'la figlia' : 'il figlio';
    if (me === 'figlio' && (other === 'padre' || other === 'madre')) return other === 'padre' ? 'il padre' : 'la madre';
    if (me === 'figlio' && other === 'figlio') return sex === 'f' ? 'la sorella' : 'il fratello';
    if (me === 'padre' && other === 'madre') return 'la moglie'; if (me === 'madre' && other === 'padre') return 'il marito';
    return sex === 'f' ? 'la coinquilina' : 'il coinquilino';
  }
  const dayPhrase = (st, t) => { const d = dayIdx(t) - dayIdx(st.t); return d === 0 ? 'oggi' : d === 1 ? 'domani' : WEEK[weekday(t)]; };
  const forDay = t => `per ${WEEK[weekday(t)]}`;   // nel diario: il giorno, non "oggi" (il diario si rilegge dopo)
  function note(st, n, text, kind) {
    const P = n.pop; P.diary.push({ t: st.t, text, kind: kind || 'info' }); if (P.diary.length > 14) P.diary.shift();
  }

  // ---------------- LA GIORNATA ----------------
  // programma: blocchi { at: minuto del giorno, tgt, act, fixed (orario d'ingresso), label }
  function planDay(st, n, day) {
    const P = n.pop, IX = buildIndex(), r = () => W.hash2(day * 131 + P.age, n.id.length * 7 + (P.plan.length || 0), Number(n.id.slice(2)) + 3), rr = (() => { let s = 0; return () => W.hash2(day, Number(n.id.slice(2)) * 17 + s++, 97); })();
    const wd = (day + 1) % 7, ev = eventsOn(st, day), home = P.homeT, plan = [];
    const add = (atMin, tgt, act, label, fixed) => { if (tgt) plan.push({ at: Math.round(atMin), tgt, act, label, fixed: !!fixed }); };
    const curf = curfewFrom(st), shady = !!(P.giro && P.giro !== 'orecchio');
    const pubIn = (list) => { const ok = list.map(target).filter(Boolean); return ok.length ? ok[Math.floor(rr() * ok.length)] : null; };
    const wake = P.job ? Math.max(0, P.job.start * 60 - 70 - rr() * 40) : (P.status === 'pensionato' ? 6.5 * 60 : 8 * 60) + rr() * 90;
    // quello che è cominciato ieri e va oltre la mezzanotte (turno di notte, giro)
    const carry = P.carry && P.carry.day === day - 1 ? P.carry : null; P.carry = null;
    if (carry) { add(0, carry.tgt, carry.act, carry.label, true); plan[plan.length - 1].cont = true; add(carry.until, home, 'sonno', 'rientra a dormire'); }
    else add(0, home, 'sonno', 'dorme');
    // chi lavora di notte dorme di giorno
    const works = P.job && !(wd === 6 && !P.job.night) && !(/^maestr/.test(P.job.title) && wd >= 5);
    const workEnd = works ? Math.min(P.job.end * 60, 1439) : -1;
    const busy = m => works && m >= P.job.start * 60 - 60 && m < P.job.end * 60;
    if (P.job && P.job.night) { add((carry ? carry.until : 0) + 60, home, 'sonno', 'dorme di giorno'); add(14 * 60, home, 'casa', 'a casa'); }
    // la mattina: sveglia, spesa o mercato
    const market = ev.find(e => e[3] === 'mercato'), fish = ev.find(e => e[3] === 'pesce');
    add(wake, home, 'casa', 'si prepara');
    if (works) {
      // si esce prima dell'ingresso: chi è puntuale esce con margine, chi no all'ultimo (o tardi)
      // chi è puntuale esce con margine; chi non lo è, ogni tanto si attarda (a letto, al bar, a chiacchierare)
      const s = P.job.start * 60, lead = 20 + P.punct * 25;
      const delay = rr() < (1 - P.punct) * .35 ? 10 + rr() * 40 : 0;
      const dep = Math.round(s - lead + delay);
      add(dep, P.job.t, 'lavoro', `al lavoro (${P.job.title})`, true);
      P.workToday = { day, start: s, end: P.job.end * 60, dep, late: delay > lead, paid: false };
      // pausa pranzo per chi fa la giornata intera
      if (P.job.end - P.job.start >= 9 && !P.job.night && rr() < .6) { add(13 * 60, rr() < .5 ? home : pubIn(IX.fun.bar) || home, 'pranzo', 'pausa pranzo'); add(14 * 60, P.job.t, 'lavoro', 'torna al lavoro', true); }
      if (P.job.end * 60 > 1439) P.carry = { day, tgt: P.job.t, act: 'lavoro', label: `turno di notte (${P.job.title})`, until: P.job.end * 60 - 1440 };
      else add(workEnd, home, 'casa', 'torna a casa');
    } else {
      P.workToday = null;
      if (market && rr() < .7 - (P.need && P.need.paura > .6 ? .5 : 0)) add(8 * 60 + rr() * 120, target(market[4]), 'mercato', 'al mercato');
      else if (rr() < .6 && IX.fun.shops.length) add(9 * 60 + rr() * 120, pubIn(IX.fun.shops), 'spesa', 'a fare la spesa');
      if (P.status === 'disoccupato' && rr() < .5) add(7 * 60 + rr() * 60, target('calata') || target('molo'), 'cerca', 'cerca lavoro a giornata');
      if (fish && rr() < .3 && P.age > 50) add(fish[1] + rr() * 30, target('molo'), 'mercato', 'all\'asta del pesce');
      add(12 * 60 + 30 + rr() * 40, home, 'pranzo', 'pranza a casa');
      // pomeriggio
      const aft = P.status === 'pensionato' ? (rr() < .5 ? pubIn(IX.fun.bar) : pubIn(IX.fun.out)) : P.age < 28 ? pubIn(IX.fun.young.concat(IX.fun.out)) : pubIn(IX.fun.out.concat(IX.fun.bar));
      add(15 * 60 + rr() * 90, aft, 'svago', 'esce');
    }
    // eventi della settimana
    ev.forEach(([, a, z, id, where]) => {
      const t = target(where); if (!t) return;
      if (id === 'bollettino' && !busy(a)) add(a - 10, t, 'bollettino', 'alla Lettura del Bollettino', true);
      if (id === 'messa' && P.faith > .45 && !busy(a)) add(a - 15, t, 'messa', 'a messa', true);
      if (id === 'vespro' && P.faith > .85 && P.age > 60 && !busy(a)) add(a - 10, t, 'messa', 'al vespro', true);
      if (id === 'struscio' && rr() < .55 && !busy(a)) add(a + rr() * 60, t, 'svago', 'a passeggio sul lungomare');
      if (id === 'tombola' && P.age > 45 && rr() < .45 && !busy(a)) add(a - 10, t, 'svago', 'alla tombola', true);
      if (id === 'sabato' && P.age < 35 && rr() < .5 && !shady && !busy(a)) add(a + rr() * 60, t, 'svago', 'in discoteca');
    });
    // la sera: bar, osteria, piazza; i vecchi e i timorosi a casa presto. Chi lavora la sera, finito il turno, a casa.
    const lateShift = works && P.job.end * 60 > 20 * 60;
    if (!(P.job && P.job.night) && !lateShift) {
      const N = P.need || {}, goOut = (P.status === 'pensionato' ? .35 : P.age < 30 ? .75 : .5) + (N.rabbia > .6 ? .2 : 0) + (N.compagnia > .6 ? .15 : 0) - (N.paura > .55 ? .6 : 0);
      if (rr() < goOut + (P.vice === 'vino' ? .3 : 0)) { const t = P.vice === 'gioco' ? target('flipper') || pubIn(IX.fun.bar) : pubIn(IX.fun.bar.concat(IX.fun.out)); add(19 * 60 + 30 + rr() * 90, t, 'svago', P.vice === 'vino' ? 'a bere' : 'esce la sera'); }
      add(Math.min(curf - 25 - rr() * 60 * (1 - n.tr.legge), 23 * 60 + 40), home, 'casa', 'rientra prima dell\'Ora Quieta');
      add(Math.min(1439, Math.min(curf, 23 * 60 + 59) - 5 + rr() * 10), home, 'sonno', 'dorme');
    } else if (lateShift && !P.job.night) add(Math.min(1439, workEnd + 15), home, 'sonno', 'dorme');
    // il giro: nelle ore sue, sopra tutto il resto (chi ha un turno non lo salta)
    if (P.giro && GIRI[P.giro]) {
      const g = GIRI[P.giro], need = P.money < 20 || (P.debt && P.debt.amount > P.money) ? .9 : .55;
      g.when.forEach(([a, z]) => {
        if (rr() > need || busy(a * 60) || busy(Math.min(z, 23.9) * 60)) return; const t = pubIn(g.places); if (!t) return;
        add(a * 60 + rr() * 30, t, 'giro', g.label);
        if (z >= 24) P.carry = { day, tgt: t, act: 'giro', label: g.label + ' (notte fonda)', until: z * 60 - 1440 };
        else add(z * 60, home, 'casa', 'rientra');
      });
    }
    // appuntamenti presi per oggi
    const ap = P.appt; if (ap && dayIdx(ap.t) === day) { add(minOfDay(ap.t) - 10, ap.tgt, 'appuntamento', `appuntamento con ${G.nameOf(st, ap.with)}`, true); add(minOfDay(ap.t) + 60 + rr() * 40, home, 'casa', 'torna a casa'); }
    plan.sort((a, b) => a.at - b.at);
    P.plan = plan; P.planDay = day;
    return plan;
  }
  // il blocco di adesso. Ognuno ha il suo piccolo ritardo (così non partono tutti allo stesso minuto); chi è vicino
  // al giocatore cammina davvero, e a piedi il tempo di gioco corre (100 m ≈ 3 ore): parte prima, in base alla strada.
  function blockNow(st, n) {
    const P = n.pop, m = minOfDay(st.t); if (!P.plan.length) return null;
    let idx = 0;
    for (let i = 0; i < P.plan.length; i++) {
      const b = P.plan[i]; let at = b.fixed ? b.at : b.at + P.jit;
      if (P.near && i > 0 && b.tgt) at -= Math.min(150, dist(n.x, n.y, b.tgt.x, b.tgt.y) / 1.35 * MPS);
      if (at <= m) idx = i;
    }
    if (P.curPlan === P.plan && P.curIdx > idx) idx = P.curIdx;   // un blocco cominciato non torna indietro
    P.curPlan = P.plan; P.curIdx = idx;
    return P.plan[idx];
  }

  // ---------------- LIVELLO DI DETTAGLIO ----------------
  function mustBeNear(st, n) {
    if (n.ris && (n.ris.member || n.ris.task)) return true;
    if (n.panic > 0 || n.stun > 0 || n.aggro || n.jailedUntil > st.t) return n.jailedUntil <= st.t;
    return ['fugge', 'denuncia', 'affronta', 'combatte', 'insegue'].includes(n.action.name);
  }
  function updateLod(st) {
    const p = st.player, list = [];
    for (const n of st.npcs) {
      if (!n.pop || n.dead) continue;
      const d = dist(n.x, n.y, p.x, p.y), P = n.pop;
      const want = mustBeNear(st, n) || d < CFG.near || (P.near && d < CFG.far);
      list.push([n, want ? d : 1e9]);
    }
    list.sort((a, b) => a[1] - b[1]);
    let nearN = 0;
    list.forEach(([n, d]) => {
      const P = n.pop, near = d < 1e8 && nearN < CFG.maxNear;
      if (near) nearN++;
      if (near && !P.near) wakeNear(st, n);
      else if (!near && P.near) sleepFar(st, n);
    });
    st.pop.nearN = nearN;
  }
  // da lontano a vicino: si riparte da dove dovrebbe essere
  function wakeNear(st, n) {
    const P = n.pop; P.near = true; P.lod = 'vicino';
    const b = blockNow(st, n), t = b && b.tgt;
    if (!t) return;
    P.cur = b; P.curKey = tkey(t) + '@' + b.at;
    if (t.k === 'b' && P.at && tkey(P.at) === tkey(t)) { n.inside = true; n.action = { name: 'dentro', scores: [], why: `È dentro ${t.label}.`, since: st.clock }; }
    else if (t.k === 'p') { const s = G.wanderSpot(st, PLACES[t.pid]); n.x = s.x; n.y = s.y; n.inside = false; P.at = t; n.path = []; n.action = { name: 'routine', scores: [], why: b.label, since: st.clock }; }
    else { n.inside = true; P.at = t; n.x = t.x; n.y = t.y; n.action = { name: 'dentro', scores: [], why: `È dentro ${t.label}.`, since: st.clock }; }
  }
  function sleepFar(st, n) { const P = n.pop; P.near = false; P.lod = 'lontano'; n.path = []; n.speedNow = 0; snapFar(st, n); }
  // il livello leggero: sempre "dentro" (invisibile, fuori dal passaparola del motore), nel posto del blocco
  function snapFar(st, n) {
    const P = n.pop, b = blockNow(st, n); if (!b) return;
    const key = tkey(b.tgt) + '@' + b.at;
    if (P.curKey !== key) { onBlockStart(st, n, b, P.cur); P.cur = b; P.curKey = key; }
    P.at = b.tgt; n.x = b.tgt.x + (Math.random() - .5) * .6; n.y = b.tgt.y + (Math.random() - .5) * .6; n.inside = true;
    n.action = { name: 'altrove', scores: [], why: `${cap(b.label)} (${b.tgt.label}).`, since: n.action.since };
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const o = n => (n && n.pop && n.pop.sex === 'f' ? 'a' : 'o');   // desinenza: arrivato / arrivata

  // ---------------- QUANDO COMINCIA UN BLOCCO ----------------
  function onBlockStart(st, n, b, prev) {
    const P = n.pop, S = st.pop.stats;
    // si chiude il lavoro: ore lavorate, paga maturata (si ritira il venerdì)
    if (prev && prev.act === 'lavoro' && P.workToday && !P.workToday.paid && b.act !== 'lavoro') {
      const h = Math.max(1, (Math.min(minOfDay(st.t), P.workToday.end) - P.workToday.start) / 60);
      P.owed += h * P.job.pay * (P.workToday.late ? .85 : 1); P.workToday.paid = true;
    }
    if (b.act === 'lavoro' && P.workToday && b.fixed && b.at === Math.round(P.workToday.dep)) {
      if (P.workToday.late) {
        P.late++; S.ritardi++;
        note(st, n, `arrivat${o(n)} tardi al lavoro (${P.job.title})`, 'bad');
        if (P.near && !n.inside) G.say(st, n, pick(Math.random, ['Sono in ritardo!', 'Madonna, il padrone mi ammazza…', 'Di nuovo tardi!']), 2);
        if (P.late >= 4 && Math.random() < .5) fire(st, n);
      } else if (P.late > 0 && Math.random() < .25) P.late--;
    }
    satisfy(st, n, b);
    if (b.act === 'svago' && (b.tgt.place === 'bar' || /bar|osteria|sirena|trattoria/i.test(b.tgt.label))) P.money -= 1 + Math.random() * (P.vice === 'vino' ? 4 : 2);
    if (b.act === 'spesa' || b.act === 'mercato') P.money -= 2 + Math.random() * 4;
    if (b.act === 'svago' && b.tgt.place === 'flipper' && P.vice === 'gioco') { const w = (Math.random() - .62) * 30; P.money += w; note(st, n, w > 0 ? `vinto ${Math.round(w)}.000 lire alla bisca` : `perso ${Math.round(-w)}.000 lire alla bisca`, w > 0 ? 'good' : 'bad'); }
    if (b.act === 'giro' && !b.cont) doGiro(st, n, b);
    if (b.act === 'appuntamento') P.apptArrived = st.t;
  }
  function fire(st, n) {
    const P = n.pop; if (!P.job) return;
    note(st, n, `licenziat${o(n)}: troppi ritardi da ${P.job.name || P.job.title}`, 'bad');
    G.addLog(st, `${G.clockStr(st.t)} · ${n.name} ha perso il posto (${P.job.title}): troppi ritardi.`, 'info');
    st.pop.stats.licenziati++;
    P.job = null; P.status = 'disoccupato'; P.late = 0; n.role = n.pop.sex === 'f' ? 'Disoccupata' : 'Disoccupato';
    if (n.tr.legge < .4 && !P.giro && Math.random() < .5) { P.giro = Math.random() < .5 ? 'borsaiolo' : 'ladro'; }
    planDay(st, n, dayIdx(st.t));
  }

  // ---------------- MALAVITA ----------------
  function doGiro(st, n, b) {
    const P = n.pop, g = GIRI[P.giro]; if (!g) return;
    const S = st.pop.stats, earn = g.earn[0] + Math.random() * (g.earn[1] - g.earn[0]);
    // chi è presente: possibili vittime e testimoni (abitanti nello stesso posto)
    const here = st.npcs.filter(k => k !== n && k.pop && !k.dead && k.pop.at && tkey(k.pop.at) === tkey(b.tgt));
    if (P.giro === 'borsaiolo' || P.giro === 'ladro') {
      const pool = P.giro === 'ladro' ? st.npcs.filter(k => k.pop && !k.dead && k.pop.homeT && dist(k.pop.homeT.x, k.pop.homeT.y, b.tgt.x, b.tgt.y) < 40 && k.pop.hh !== P.hh) : here;
      const victim = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      if (!victim) return;
      const type = P.giro === 'ladro' ? 'scasso' : 'scippo', took = Math.min(Math.max(2, victim.pop.money * .4), earn);
      victim.pop.money -= took; P.money += took * (P.giro === 'ladro' ? .5 : 1); S.furti++;
      const ev = crimeEvent(st, n, type, victim, b.tgt);
      const seen = Math.random() < (P.giro === 'ladro' ? .12 : .3) * (1.2 - n.tr.cor * .4);
      const disc = st.t + (P.giro === 'ladro' ? 300 : 15);
      st.timers.push({ at: disc, kind: 'popDiscover', npc: victim.id, ev: ev.id, thief: seen ? n.id : null, type, place: b.tgt.label, took });
      note(st, n, `${type === 'scasso' ? 'svaligiato casa ' + victim.pop.sur : 'alleggerito ' + victim.first} a ${b.tgt.label}`, 'shady');
      if (P.giro === 'ladro') { const ric = st.npcs.find(k => k.pop && k.pop.giro === 'ricettatore' && !k.dead); if (ric) { ric.pop.money += took * .3; note(st, ric, `comprato roba da ${n.first}`, 'shady'); } }
    } else if (P.giro === 'spacciatore') {
      const buyers = st.npcs.filter(k => k.pop && k.pop.vice === 'roba' && !k.dead && k.pop.money > 5);
      buyers.slice(0, 3).forEach(k => { const c = 3 + Math.random() * 5; k.pop.money -= c; P.money += c; if (Math.random() < .3) note(st, k, k.pop.money < 10 ? 'ha speso gli ultimi soldi per la roba' : 'ha comprato la roba al Flipper', 'bad'); });
      P.money += earn * .3;
    } else if (P.giro === 'trafficante') {
      P.money += earn; note(st, n, 'scaricato casse dal continente al porto, di notte', 'shady');
    } else if (P.giro === 'orecchio') {
      P.money += earn;
      const zia = G.byId(st, 'zia'); if (zia) { let told = 0; n.mem.filter(m => (m.actor === 'player' || (m.type && /scritta|volantino|murale|sabotaggio/.test(m.type))) && !m.silenced).slice(0, 3).forEach(m => { if (G.addMemory(st, zia, Object.assign({}, m, { id: undefined, source: 'voce', via: (m.via || []).concat([n.first]), conf: m.conf * .85 }))) told++; }); if (told) note(st, n, `riferito ${told} cose alla Zia`, 'shady'); }
    } else { P.money += earn; }
    // retata: dipende dalla repressione
    const rl = st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) : 1;
    if (Math.random() < g.risk * (.6 + rl * .25)) arrestFar(st, n, P.giro === 'trafficante' ? 'traffico d\'armi' : P.giro === 'spacciatore' ? 'spaccio' : 'furto');
  }
  function crimeEvent(st, n, type, victim, t) {
    const ev = { id: st.nextId++, type, actor: n.id, target: victim.id, owner: victim.id, x: t.x, y: t.y, t: st.t, sev: G.SEV[type] || .5, noise: 0, place: t.label, npcCrime: true };
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    return ev;
  }
  function arrestFar(st, n, why) {
    if (n.jailedUntil > st.t) return;
    n.jailedUntil = st.t + 240 + Math.random() * 480; n.inside = true; n.path = []; st.pop.stats.arresti++;
    note(st, n, `fermat${o(n)} dai Grigi: ${why}`, 'bad');
    G.addLog(st, `${G.clockStr(st.t)} · I Grigi hanno fermato ${n.name} (${why}).`, 'info');
    const hh = st.pop.households[n.pop.hh]; if (hh) hh.members.forEach(id => { const k = G.byId(st, id); if (k && k !== n) { note(st, k, `${n.first} è stat${o(n)} portat${o(n)} via dai Grigi`, 'bad'); feel(k, 'rabbia', .4); feel(k, 'paura', .2); } });
    (n.pop.friends || []).forEach(id => { const k = G.byId(st, id); if (k && k.pop) feel(k, 'rabbia', .15); });
  }

  // ---------------- APPUNTAMENTI ----------------
  // tra amici: "ci vediamo domani alle 19 al bar". Anche il giocatore e la Risacca possono usarli (Popolo.appoint).
  function appoint(st, a, b, tgtRef, atT, why) {
    const t = typeof tgtRef === 'object' ? tgtRef : target(tgtRef); if (!t || !a.pop) return null;
    const ap = { with: b.id, tgt: t, t: atT, label: t.label, why: why || '', by: a.id };
    a.pop.appt = ap; note(st, a, `preso appuntamento con ${b.first} ${forDay(atT)} alle ${hhmm(minOfDay(atT))} a ${t.label}`, 'info');
    if (b.pop) { b.pop.appt = ap.twin = { with: a.id, tgt: t, t: atT, label: t.label, why, by: a.id }; note(st, b, `appuntamento con ${a.first} ${forDay(atT)} alle ${hhmm(minOfDay(atT))} a ${t.label}`, 'info'); }
    st.pop.stats.appuntamenti++;
    [a, b].forEach(k => { if (k.pop && dayIdx(atT) === dayIdx(st.t)) { planDay(st, k, dayIdx(st.t)); } });
    return ap;
  }
  function makeAppointments(st) {
    // ogni mattina qualcuno si dà appuntamento per la sera o per domani
    const cand = st.npcs.filter(n => n.pop && !n.dead && n.pop.friends && n.pop.friends.length && !n.pop.appt && Math.random() < .06);
    const IX = buildIndex();
    cand.forEach(a => {
      const b = G.byId(st, pick(Math.random, a.pop.friends)); if (!b || b.dead || !b.pop || b.pop.appt) return;
      const when = Math.random() < .5 ? dayIdx(st.t) * 1440 + (18 + Math.floor(Math.random() * 3)) * 60 + pick(Math.random, [0, 15, 30]) : (dayIdx(st.t) + 1) * 1440 + (11 + Math.floor(Math.random() * 9)) * 60 + pick(Math.random, [0, 30]);
      if (when <= st.t + 30) return;
      const wm = minOfDay(when), wdw = weekday(when), free = k => !k.pop.job || k.pop.job.night || wdw === 6 || wm < k.pop.job.start * 60 - 60 || wm > k.pop.job.end * 60 + 15;
      if (!free(a) || !free(b)) return;
      const where = pick(Math.random, IX.fun.bar.concat(IX.fun.out));
      appoint(st, a, b, where, when, pick(Math.random, ['due chiacchiere', 'un favore', 'parlare di soldi', 'una partita a carte', 'notizie di famiglia']));
    });
  }
  function checkAppointments(st) {
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || !P.appt || P.appt.by !== n.id) return;   // la coppia si controlla una volta, da chi l'ha proposto
      const ap = P.appt; if (st.t < ap.t + 35) return;
      const other = G.byId(st, ap.with), O = other && other.pop;
      const came = k => k && k.pop && k.pop.apptArrived && k.pop.apptArrived >= ap.t - 60 && k.jailedUntil <= ap.t && !k.dead;
      const a = came(n), b = O ? came(other) : true;
      if (a && b) { note(st, n, `visto ${other.first} a ${ap.label} (${ap.why})`, 'good'); if (O) note(st, other, `visto ${n.first} a ${ap.label} (${ap.why})`, 'good'); if (O) { n.pop.need.compagnia = 0; O.need.compagnia = 0; } }
      else if (a && !b) { note(st, n, `${other.first} non si è fatt${o(other)} vedere a ${ap.label}`, 'bad'); note(st, other, `ha dato buca a ${n.first}`, 'info'); st.pop.stats.bidoni++; }
      else if (!a && b && O) { note(st, other, `${n.first} non si è fatt${o(n)} vedere a ${ap.label}`, 'bad'); note(st, n, `ha dato buca a ${other.first}`, 'info'); st.pop.stats.bidoni++; }
      [n, other].forEach(k => { if (k && k.pop && k.pop.appt === ap || (k && k.pop && k.pop.appt && k.pop.appt.t === ap.t)) { k.pop.appt = null; k.pop.apptArrived = 0; } });
    });
  }

  // ---------------- BISOGNI ----------------
  // fame, sonno, igiene, compagnia, svago crescono con le ore; rabbia e paura nascono dai fatti e calano piano
  const feel = (n, k, v) => { if (n.pop && n.pop.need) n.pop.need[k] = clamp(n.pop.need[k] + v, 0, 1); };
  const SOCIAL = { sfogo: 1, svago: 1, mercato: 1, appuntamento: 1, messa: 1, bollettino: .3, lavoro: .35, pranzo: .3, casa: .25, spesa: .3, cerca: .2, giro: .2 };
  function needsHour(st, n) {
    const P = n.pop, N = P.need, b = P.cur, a = b ? b.act : 'casa', sleeping = a === 'sonno' && n.inside;
    const work = a === 'lavoro', manual = P.job && /operai|scarica|pescat|braccian|cavator|carpent|saldat|forna|salinar|facchin|vignaiol|muratore/.test(P.job.title);
    N.fame = clamp(N.fame + (sleeping ? .02 : work && manual ? .08 : .06), 0, 1);
    N.sonno = clamp(N.sonno + (sleeping ? -.17 : work ? .05 : .038), 0, 1);
    N.igiene = clamp(N.igiene + (work && manual ? .06 : .025), 0, 1);
    const company = SOCIAL[a] || 0, fam = st.pop.households[P.hh] && st.pop.households[P.hh].members.length > 1 && a === 'casa' ? .3 : 0;
    N.compagnia = clamp(N.compagnia + .045 - (company + fam) * .2, 0, 1);
    N.svago = clamp(N.svago + (work ? .05 : .03) - (a === 'svago' || a === 'sfogo' ? .3 : a === 'mercato' || a === 'appuntamento' || a === 'messa' ? .12 : a === 'casa' && n.inside ? .07 : 0), 0, 1);   // a casa: radio, carte, la TV del Garante
    N.rabbia = clamp(N.rabbia - .012, 0, 1); N.paura = clamp(N.paura - .02 + (st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) * .006 : 0), 0, 1);
    if (n.ris && N.rabbia > .5) n.ris.ideo = clamp(n.ris.ideo + (N.rabbia - .5) * .01, 0, 1);   // la rabbia avvicina alla Risacca
    if (n.ris && N.paura > .6) n.ris.ideo = clamp(n.ris.ideo - .003, 0, 1);
    urge(st, n);
  }
  // quando un bisogno è urgente e il blocco non ha orario fisso, si cambia programma adesso
  function urge(st, n) {
    const P = n.pop, N = P.need, b = P.cur; if (!b || b.fixed || b.act === 'giro' || n.jailedUntil > st.t) return;
    const IX = buildIndex(), m = minOfDay(st.t), cf = curfewFrom(st), lateNight = m >= cf - 30 || m < 5 * 60;
    let tgt = null, act = null, label = null;
    const pubIn = list => { const ok = list.map(target).filter(Boolean); return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null; };
    if (N.sonno > .9 && b.act !== 'sonno') { tgt = P.homeT; act = 'sonno'; label = 'casca dal sonno, va a dormire'; }
    else if (N.paura > .7 && b.act !== 'casa' && b.act !== 'sonno') { tgt = P.homeT; act = 'casa'; label = 'ha paura, si chiude in casa'; }
    else if (lateNight) return;
    else if (N.fame > .85 && b.act !== 'pranzo') { const eat = P.money > 6 ? pubIn(['car_2', 'osteria', 'bar', 'osteria_sg']) : null; tgt = eat || P.homeT; act = 'pranzo'; label = eat ? 'ha fame, va a mangiare' : 'ha fame, torna a casa a mangiare'; if (eat) P.money -= 3 + Math.random() * 3; }
    else if (N.igiene > .9 && b.act !== 'casa') { tgt = P.homeT; act = 'bagno'; label = 'va a casa a lavarsi'; }
    else if (N.compagnia > .85 && b.act !== 'svago') {
      const fr = (P.friends || []).map(id => G.byId(st, id)).find(k => k && k.pop && !k.dead && k.pop.cur && k.pop.cur.act === 'casa');
      if (fr && Math.random() < .5) { tgt = fr.pop.homeT; act = 'svago'; label = `passa a trovare ${fr.first}`; }
      else { tgt = pubIn(IX.fun.bar.concat(IX.fun.out)); act = 'svago'; label = 'cerca compagnia'; }
    }
    else if (N.svago > .9 && b.act !== 'svago' && b.act !== 'lavoro') { tgt = pubIn(P.age < 30 ? IX.fun.young.concat(IX.fun.out) : IX.fun.out); act = 'svago'; label = 'si annoia, esce'; }
    else if (N.rabbia > .75 && n.ris && n.ris.ideo > .5 && b.act !== 'svago') { tgt = pubIn(IX.fun.bar); act = 'sfogo'; label = 'va al bar a sfogarsi contro la Tutela'; }
    if (!tgt) return;
    P.plan.push({ at: m, tgt, act, label, fixed: true, urge: true }); P.plan.sort((x, y) => x.at - y.at);
    // il prossimo blocco già previsto resta: l'urgenza dura fino a lì (al massimo un paio d'ore)
    const next = P.plan.find(x => x.at > m && !x.urge); if (!next || next.at - m > 150) P.plan.push({ at: Math.min(1439, m + 90), tgt: P.homeT, act: 'casa', label: 'torna a casa', urge: true });
    P.plan.sort((x, y) => x.at - y.at);
    if (act === 'sfogo' || act === 'casa' || /trovare/.test(label)) note(st, n, label, act === 'sfogo' ? 'shady' : 'info');
  }
  function satisfy(st, n, b) {
    const N = n.pop.need; if (!N) return;
    if (b.act === 'pranzo' || (b.act === 'casa' && /rientra|torna/.test(b.label) && minOfDay(st.t) > 18 * 60)) N.fame = Math.max(0, N.fame - .7);
    if (b.act === 'svago' && b.tgt.place && /bar|osteria|sirena|car_2|trattoria/.test(b.tgt.place + b.tgt.label.toLowerCase())) N.fame = Math.max(0, N.fame - .25);
    if (b.act === 'bagno' || (b.act === 'casa' && /si prepara/.test(b.label))) N.igiene = .05;
    if (b.act === 'sfogo') { N.rabbia = Math.max(0, N.rabbia - .3); N.compagnia = Math.max(0, N.compagnia - .3); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .02, 0, 1); }
    if (b.act === 'bollettino') feel(n, n.ris && n.ris.ideo > .5 ? 'rabbia' : 'paura', .08);
  }
  function needWords(P, e) {
    const N = P.need; if (!N) return '';
    const w = [];
    if (N.fame > .75) w.push('ha fame'); if (N.sonno > .8) w.push(`è stanc${e} mort${e}`); if (N.igiene > .85) w.push('avrebbe bisogno di un bagno');
    if (N.compagnia > .8) w.push(`si sente sol${e}`); if (N.svago > .85) w.push('si annoia a morte');
    if (N.rabbia > .6) w.push(`è furios${e} con la Tutela`); if (N.paura > .6) w.push('ha paura');
    return w.length ? 'Adesso ' + w.join(', ') + '.' : '';
  }

  // ---------------- SOLDI ----------------
  function onHour(st, hr) {
    const day = dayIdx(st.t), wd = weekday(st.t);
    if (hr === 0) st.npcs.forEach(n => { if (n.pop && !n.dead) planDay(st, n, day); });
    if (hr === 8) makeAppointments(st);
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead) return;
      needsHour(st, n);
      if (hr === 21) P.money -= 2 + Math.random() * 2;      // il mangiare della giornata
      if (wd === 4 && hr === 18 && P.owed > 0) { P.money += P.owed; note(st, n, `ritirato la paga: ${Math.round(P.owed)}.000 lire`, 'good'); P.owed = 0; }
      if (wd === 0 && hr === 9) { P.money -= P.rent; if (P.money < 0) note(st, n, 'non ce la fa a pagare l\'affitto', 'bad'); }
      if (P.debt && hr === 12 && wd === 2) {
        P.debt.amount *= 1.1;   // lo Squalo vuole gli interessi il mercoledì
        if (P.money > 30) { const pay = Math.min(P.debt.amount, P.money * .5); P.money -= pay; P.debt.amount -= pay; note(st, n, `dato ${Math.round(pay)}.000 lire allo Squalo`, 'bad'); if (P.debt.amount < 1) { P.debt = null; note(st, n, 'finito di pagare lo Squalo', 'good'); } }
        else { note(st, n, 'gli uomini dello Squalo sono passati a ricordargli il debito', 'bad'); feel(n, 'paura', .3); }
      }
      // la disperazione apre la porta alla malavita (o agli Orecchi)
      if (hr === 10 && !P.giro && P.money < -10 && Math.random() < .25) {
        P.giro = n.tr.legge < .45 ? (Math.random() < .6 ? 'borsaiolo' : 'ladro') : 'orecchio';
        note(st, n, P.giro === 'orecchio' ? 'la Zia gli ha offerto qualche soldo per tenere le orecchie aperte' : 'deciso di arrangiarsi in qualche modo', 'bad');
      }
      if (hr === 7 && P.status === 'disoccupato' && Math.random() < .08) findJob(st, n);
    });
  }
  function findJob(st, n) {
    const IX = buildIndex(), taken = {}; st.npcs.forEach(k => { if (k.pop && k.pop.job && k.pop.job.t) { const key = (k.pop.job.base || k.pop.job.title) + '@' + tkey(k.pop.job.t); taken[key] = (taken[key] || 0) + 1; } });
    const open = IX.works.filter(w => (taken[w.title + '@' + tkey(w.bi >= 0 ? tB(w.bi) : target(w.id))] || 0) < w.slots);
    if (!open.length) return;
    const w = open.sort((a, b) => dist(a.x, a.y, n.pop.homeT.x, n.pop.homeT.y) - dist(b.x, b.y, n.pop.homeT.x, n.pop.homeT.y))[0];
    n.pop.job = { title: genderTitle(w.title, n.pop.sex), base: w.title, pay: w.pay, start: w.start, end: w.end, night: w.night, t: w.bi >= 0 ? tB(w.bi) : target(w.id), name: w.name };
    n.pop.status = 'lavora'; n.role = roleOf({ status: 'lavora', job: w, sex: n.pop.sex });
    note(st, n, `trovato lavoro: ${w.title}${w.indoor ? ' da ' + w.name : ''}`, 'good');
  }

  // ---------------- CHIACCHIERE DA LONTANO ----------------
  // chi sta nello stesso posto (casa, bottega, bar) si racconta le cose anche senza il giocatore vicino
  function farTalk(st) {
    const groups = {};
    st.npcs.forEach(n => { if (!n.dead && n.jailedUntil <= st.t && n.pop && n.pop.at && (!n.pop.near || n.inside)) { const k = tkey(n.pop.at); (groups[k] = groups[k] || []).push(n); } });
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      for (let i = 0; i < Math.min(3, g.length); i++) {
        const a = g[Math.floor(Math.random() * g.length)], b = g[Math.floor(Math.random() * g.length)];
        if (a === b) continue;
        share(st, a, b); share(st, b, a);
      }
    });
  }
  function closeness(st, a, b) {
    if (a.pop && b.pop && a.pop.hh === b.pop.hh) return .9;
    if (a.pop && a.pop.friends && a.pop.friends.includes(b.id)) return .7;
    return .25;
  }
  function share(st, sp, ls) {
    const cand = sp.mem.filter(m => !m.silenced && m.conf >= .3 && !m.liar && m.actor !== 'ignoto')
      .filter(m => { const k = ls.mem.find(x => x.eventId === m.eventId); return !k || (k.actor === 'ignoto' && m.actor !== 'ignoto'); })
      .sort((a, b) => G.weight(st, b) - G.weight(st, a));
    const m = cand[0]; if (!m) return false;
    const r = closeness(st, sp, ls); if (Math.random() > sp.tr.loq * (.4 + r)) return false;
    return !!G.addMemory(st, ls, { eventId: m.eventId, type: m.type, trueType: m.trueType, actor: m.actor, target: m.target, owner: m.owner, place: m.place, shop: m.shop, t: m.t, accepted: m.accepted, conf: m.conf * (r > .5 ? .86 : .76), source: 'voce', via: (m.via || []).concat([sp.first]), distorted: m.distorted, framedBy: m.framedBy });
  }

  // ---------------- AGGANCI ----------------
  function hookThink(st, n) {
    if (!n.pop) return false;
    if (!n.pop.near) { return true; }               // da lontano decide il programma
    return false;                                    // da vicino: il motore (fughe, denunce, reazioni)
  }
  function hookMove(st, n, dt, a) {
    if (!n.pop) return false;
    if (!n.pop.near) { farMove(st, n); return true; }
    if (a === 'routine' || a === 'dentro' || a === 'evita' || a === 'altrove') { nearMove(st, n, dt, a); return true; }
    return false;
  }
  // da lontano: si salta al posto del blocco quando il blocco cambia
  function farMove(st, n) {
    const P = n.pop; n.speedNow = 0;
    if (n.jailedUntil > st.t) return;
    const b = blockNow(st, n); if (!b) return;
    if (tkey(b.tgt) + '@' + b.at !== P.curKey || !n.inside) snapFar(st, n);
  }
  // da vicino: si cammina davvero
  function nearMove(st, n, dt, a) {
    const P = n.pop;
    let b = blockNow(st, n); if (!b) return;
    if (a === 'evita') b = { tgt: P.homeT, act: 'casa', label: 'preferisce stare a casa', at: b.at };
    const t = b.tgt, key = tkey(t) + '@' + b.at;
    if (key !== P.curKey) { onBlockStart(st, n, b, P.cur); P.cur = b; P.curKey = key; P.goalSet = false; }
    if (n.inside) {
      if (P.at && tkey(P.at) === tkey(t)) { n.speedNow = 0; n.action = { name: 'dentro', scores: [], why: `${cap(b.label)} (${t.label}).`, since: n.action.since }; return; }
      // esce dalla porta da cui era entrato
      const from = P.at || P.homeT; n.x = from.x; n.y = from.y; n.inside = false; n.path = []; P.goalSet = false;
      n.action = { name: 'routine', scores: [], why: `${cap(b.label)}: va a ${t.label}.`, since: st.clock };
    }
    // in ritardo per un orario fisso: corre
    const late = b.fixed && minOfDay(st.t) > b.at + 5 && dist(n.x, n.y, t.x, t.y) > 6;
    const speed = (late ? 2.6 : 1.35) * (P.age > 70 ? .75 : P.age > 60 ? .88 : 1);
    if (t.k === 'b') {
      if (!P.goalSet) { G.goTo(n, t.x, t.y); P.goalSet = true; }
      const arrived = G.stepAlong(n, speed, dt);
      if (arrived || dist(n.x, n.y, t.x, t.y) < 1.2) { n.inside = true; P.at = t; n.speedNow = 0; n.action = { name: 'dentro', scores: [], why: `${cap(b.label)} (${t.label}).`, since: st.clock }; if (b.act === 'appuntamento') P.apptArrived = st.t; }
      else if (!n.path.length) { P.goalSet = false; }
      return;
    }
    // luogo all'aperto: ci va e poi gironzola
    if (!P.goalSet) { const s = G.wanderSpot(st, PLACES[t.pid]); G.goTo(n, s.x, s.y); P.goalSet = true; }
    if (n.wait > 0) { n.wait -= dt; n.speedNow = 0; return; }
    const arrived = G.stepAlong(n, speed, dt);
    if (arrived) {
      P.at = t; if (b.act === 'appuntamento') P.apptArrived = P.apptArrived || st.t;
      n.wait = 3 + Math.random() * 7;
      const s = G.wanderSpot(st, PLACES[t.pid]); G.goTo(n, s.x, s.y);
      if (Math.random() < .08 && st.clock > n.barkCd) barkTime(st, n, b);
    }
  }
  // il tempo detto ad alta voce
  function barkTime(st, n, b) {
    const m = minOfDay(st.t), cf = curfewFrom(st), P = n.pop;
    let s = null;
    if (cf - m < 50 && cf - m > 0) s = pick(Math.random, ['Tra poco c\'è l\'Ora Quieta, andiamo.', 'È tardi, a casa prima del coprifuoco.']);
    else if (P.appt && P.appt.t - st.t < 30 && P.appt.t > st.t) s = `Aspetto ${G.nameOf(st, P.appt.with)}… doveva essere qui alle ${hhmm(minOfDay(P.appt.t))}.`;
    else if (weekday(st.t) === 4 && m > 17 * 60 && m < 20 * 60 && P.job) s = 'Oggi è venerdì, si ritira la paga!';
    else if (weekday(st.t) === 0 && m < 11 * 60) s = 'Lunedì… e c\'è pure il Bollettino.';
    if (s) { G.say(st, n, s, 2.6); n.barkCd = st.clock + 25; }
  }
  function hookStep(st, dt) {
    const S = st.pop; if (!S) return;
    // livello di dettaglio
    S.lodAt -= dt; if (S.lodAt <= 0) { S.lodAt = CFG.lodEvery; updateLod(st); }
    // ore
    const hm = Math.floor(st.t / 60);
    while (S.hourMark < hm) { S.hourMark++; onHour(st, S.hourMark % 24); }
    // chiacchiere a distanza e appuntamenti
    if (st.t - S.talkAt >= CFG.talkEvery) { S.talkAt = st.t; farTalk(st); checkAppointments(st); }
    // i furti si scoprono
    st.timers = st.timers.filter(tm => {
      if (tm.kind !== 'popDiscover' || st.t < tm.at) return true;
      const v = G.byId(st, tm.npc); if (!v || v.dead) return false;
      G.addMemory(st, v, { eventId: tm.ev, type: tm.type, target: v.id, owner: v.id, place: tm.place, t: tm.at - 5, actor: tm.thief || 'ignoto', conf: tm.thief ? .85 : .9, source: tm.thief ? 'visto' : 'scoperto' });
      if (v.pop) { feel(v, 'rabbia', .2); feel(v, 'paura', .2); }
      note(st, v, tm.type === 'scasso' ? `trovato la casa svaligiata (${Math.round(tm.took)}.000 lire)` : `scippat${o(v)} a ${tm.place}${tm.thief ? ', ha visto chi è stato' : ''}`, 'bad');
      // la denuncia da lontano: arriva ai Grigi con calma
      if (tm.thief && v.tr.legge > .45 && Math.random() < .6) { const cop = st.npcs.find(k => k.cop && !k.dead); if (cop) { G.addMemory(st, cop, { eventId: tm.ev, type: tm.type, actor: tm.thief, target: v.id, owner: v.id, place: tm.place, t: tm.at, conf: .8, source: 'denuncia', via: [v.first] }); v.reported[tm.ev] = true; } }
      return false;
    });
  }
  function hookCreate(st) { spawn(st); }

  // ---------------- INSTALLAZIONE ----------------
  function install() {
    const H = G.HOOKS;
    if (H.__popolo) return; H.__popolo = true;
    const c0 = H.create, t0 = H.think, m0 = H.move, s0 = H.step, v0 = H.verb, j0 = H.jailed;
    H.create = st => { hookCreate(st); if (c0) c0(st); afterRisacca(st); };
    H.think = (st, n) => (n.pop && !n.pop.near) ? hookThink(st, n) : ((t0 && t0(st, n)) || hookThink(st, n));
    H.move = (st, n, dt, a) => (n.pop && !n.pop.near) ? hookMove(st, n, dt, a) : ((m0 && m0(st, n, dt, a)) || hookMove(st, n, dt, a));
    H.step = (st, dt) => { if (s0) s0(st, dt); hookStep(st, dt); };
    if (v0) H.verb = v0; if (j0) H.jailed = j0;
    // i giorni della settimana anche per chi chiede G.dayName (la chat della Risacca)
    G.dayName = t => WEEK[(Math.floor(t / 1440) + 1) % 7];
  }
  // dopo la Risacca: l'ideologia nata dalla vita di ognuno
  function afterRisacca(st) {
    st.npcs.forEach(n => { if (n.pop && n.ris) { const R = RS(); const c = R && R.CARDS[n.id]; if (c && c.ideo !== undefined) n.ris.ideo = c.ideo; } });
  }
  install();

  // ---------------- RESOCONTO (per le prove) ----------------
  function report(st) {
    const pp = st.npcs.filter(n => n.pop), S = st.pop.stats;
    const by = f => { const o = {}; pp.forEach(n => { const k = f(n); o[k] = (o[k] || 0) + 1; }); return o; };
    return {
      abitanti: pp.length, famiglie: Object.keys(st.pop.households).length, vicini: st.pop.nearN,
      stato: by(n => n.pop.status), giri: by(n => n.pop.giro || '—'), fuori: pp.filter(n => !n.inside).length,
      inCella: pp.filter(n => n.jailedUntil > st.t).length, alVerde: pp.filter(n => n.pop.money < 0).length,
      soldiMedi: Math.round(pp.reduce((s, n) => s + n.pop.money, 0) / pp.length), stats: S,
      giorno: `${wdName(st.t)} ${G.clockStr(st.t)}`,
    };
  }
  return { CFG, WEEK, RECURRING, GIRI, weekday, wdName, ago, curfewFrom, eventsOn, planDay, blockNow, appoint, bioOf, report, target, note, buildIndex };
})();
if (typeof module !== 'undefined') module.exports = Popolo;
