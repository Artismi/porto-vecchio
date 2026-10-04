/* Porto Vecchio — Le Fazioni: la Famiglia e la Risacca come organizzazioni (solo logica, nessuna grafica).
   LA FAMIGLIA (la mafia): un capo senza nome nascosto in una base segreta, 15 uomini in una piramide rigida
   (3 fidati, 12 soldati: spacciatori, picchiatori, ricattatori, ricettatori).
   - Ogni uomo può prendersi per un lavoro un aiutante temporaneo (uno alla volta), che poi se ne torna a casa.
   - Solo i 3 più fedeli possono proporre nuovi uomini fissi; decide il capo. Mai oltre 20.
   - Il capo lo vedono solo i fidati, quando gli portano i conti di notte: seguendoli si trova la base.
   LA RISACCA (la resistenza): al massimo 15 membri.
   - Ogni membro può avere fino a 3 collaboratori da fuori: danno una mano nei lavori, mettono soldi,
     tengono gli occhi aperti. Conoscono solo il loro membro: se uno parla, cade solo il suo pezzo.
   - Le cellule autonome: gruppi di 2-4 persone che si organizzano da sole. La Risacca le accoglie; agiscono
     per conto loro (scritte, volantini, collette, piccoli sabotaggi), non prendono ordini, non contano nei 15.
   Si aggancia a Game.HOOKS (dopo popolo, azioni, economia) e a Risacca.EXT. */
var Fazioni = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const W = typeof World !== 'undefined' ? World : require('./world.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : require('./risacca.js');
  const PO = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const I = PO._, PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const alive = n => n && !n.dead;
  const free = (st, n) => alive(n) && !(n.jailedUntil > st.t);
  const byId = (st, id) => G.byId(st, id);
  const o = n => I.o(n);

  // ---------------- REGOLE ----------------
  const CFG = {
    famStart: 15,      // uomini della Famiglia all'inizio (il capo escluso)
    famMax: 20,        // tetto: i fidati possono aggiungerne fino a qui
    fidati: 3,         // i più fedeli: vedono il capo, propongono nuovi uomini
    helperChance: .55, // quanto spesso un uomo si prende un aiutante per un lavoro
    risMax: 15,        // membri della Risacca al massimo
    collabPer: 3,      // collaboratori per membro
    cellMax: 5,        // cellule autonome attive al massimo
  };

  // ---------------- TATUAGGI: il curriculum sulla pelle ----------------
  const TAT = {
    capo: ['corona sulle nocche', 'stelle sulle spalle'],
    fidato: ['stelle sulle ginocchia: non si inginocchia', 'cupola con tre torri'],
    soldato: ['un punto tra le dita'],
    galera: n => `${n} anelli sulle dita: anni di galera`,
    spaccio: 'una siringa spezzata sul polso', picchiatore: 'un pugnale nel collo', ricatto: 'un occhio sul palmo', ricettazione: 'una chiave sul dorso della mano',
    traditore: 'una croce rovesciata, tatuata a forza',
  };
  const ROLE_LABEL = { spaccio: 'spaccia', picchiatore: 'picchia e riscuote', ricatto: 'ricatta', ricettazione: 'ricetta la roba rubata' };
  const ROLE_GIRO = { spaccio: 'spacciatore', picchiatore: 'esattore', ricatto: 'ricattatore', ricettazione: 'ricettatore' };

  // giri nuovi per la vita degli abitanti (popolo.js li usa negli orari)
  Object.assign(PO.GIRI, {
    esattore: { label: 'riscuote per la Famiglia', when: [[18, 21]], places: ['vico', 'caruggio', 'piazzetta', 'calata', 'bar'], earn: [3, 10], risk: .04 },
    ricattatore: { label: 'ricatta per la Famiglia', when: [[16, 19]], places: ['sirena', 'bar', 'osteria', 'piazza'], earn: [5, 18], risk: .03 },
  });
  if (PO.GIRI.ricettatore) PO.GIRI.ricettatore.label = 'ricettatore della Famiglia';

  // ---------------- LE COPERTURE: una lavanderia accanto alla sala giochi-bar ----------------
  // la sala giochi Flipper fa anche da bar; la casa più vicina diventa la Lavanderia Stella. Si fa al caricamento,
  // così la vita (posti di lavoro) e la grafica (insegna) la trovano già lavanderia.
  const FRONTS = (() => {
    const B = G.BUILDINGS, TS = G.TS, ctr = b => [(b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS];
    const sala = B.find(b => b.id === 'flipper'); if (!sala || !sala.door) return null;
    sala.barToo = true;
    const [sx, sy] = ctr(sala);
    let lav = B.filter(b => b.door && b.use === 'lavanderia').sort((a, c) => dist(...ctr(a), sx, sy) - dist(...ctr(c), sx, sy))[0];
    if (!lav || dist(...ctr(lav), sx, sy) > 40) {
      const near = B.filter(b => b.door && b.use === 'casa' && !b.name && dist(...ctr(b), sx, sy) < 45).sort((a, c) => dist(...ctr(a), sx, sy) - dist(...ctr(c), sx, sy))[0];
      if (near) { near.use = 'lavanderia'; near.name = 'Lavanderia Stella'; near.label = near.name; near.shop = true; near.sign = { t: 'ПРАЧЕЧНАЯ 세탁', c: '#8affd0' }; lav = near; }
    }
    return lav ? { lav: lav.id, sala: sala.id } : null;
  })();

  // ================= LA FAMIGLIA =================
  function famCount(st) { return Object.keys(st.fam.men).filter(id => alive(byId(st, id))).length; }
  const men = st => Object.keys(st.fam.men).map(id => byId(st, id)).filter(alive);
  const rankOf = n => n && n.fam ? n.fam.rank : null;
  function enlist(st, n, rank, role, by, how) {
    const F = st.fam;
    n.fam = { rank, role, by: by || null, boss: null, loyalty: rank === 'fidato' ? .85 + rnd() * .1 : .45 + rnd() * .3, since: st.t, jail: Math.floor(rnd() * (rank === 'fidato' ? 9 : 5)), tattoos: [], lastBlock: null, helper: null, works: 0 };
    F.men[n.id] = true;
    if (n.pop && role && ROLE_GIRO[role]) n.pop.giro = ROLE_GIRO[role];
    tattoo(n);
    setSecret(st, n);
    if (how) { I.note(st, n, how, 'shady', { w: .8, tag: 'famiglia' }); G.addLog(st, `${G.clockStr(st.t)} · Si dice che ${n.name} sia entrat${o(n)} nella Famiglia.`, 'info'); }
  }
  function tattoo(n) {
    const f = n.fam, t = [].concat(TAT[f.rank] || []);
    if (f.jail) t.push(TAT.galera(f.jail));
    if (f.role && TAT[f.role]) t.push(TAT[f.role]);
    if (f.traitor) t.push(TAT.traditore);
    f.tattoos = t;
  }
  // i capi zona: ogni soldato risponde a un fidato
  function assignBosses(st) {
    const F = st.fam, fid = F.fidati.map(id => byId(st, id)).filter(alive);
    if (!fid.length) return;
    const sold = men(st).filter(n => n.fam.rank === 'soldato');
    sold.forEach((n, i) => { if (!n.fam.boss || !fid.some(f => f.id === n.fam.boss)) n.fam.boss = fid[i % fid.length].id; });
  }
  function famCreate(st) {
    const F = st.fam = { capo: null, hq: null, men: {}, fidati: [], pending: {}, helpers: {}, cash: 0, log: [],
      // i soldi: sporchi in cassa (dai giri), sporchi dal capo, puliti dopo la lavanderia, il tesoro che avanza
      dirty: 0, clean: 0, treasure: 0, heat: 0, closedUntil: 0, washedToday: -1, bribes: {},
      stats: { aiuti: 0, proposte: 0, approvati: 0, respinti: 0, rifiuti: 0, iniziati: 0, promossi: 0, traditori: 0, riscossioni: 0, ricatti: 0, entrate: { riscossioni: 0, ricatti: 0, spaccio: 0 },
        incasso: 0, lavati: 0, stipendi: 0, nonPagati: 0, gestione: 0, mazzette: 0, chiusoUnOcchio: 0, ispezioni: 0, sequestri: 0 } };
    F.fronts = FRONTS ? { lav: I.target('b:' + FRONTS.lav) || null, sala: I.target(FRONTS.sala) || null } : null;
    // la base segreta del capo: una casa qualsiasi della periferia est, dove non abita nessuno
    const used = new Set(st.npcs.filter(n => n.pop && n.pop.homeT && n.pop.homeT.k === 'b').map(n => n.pop.homeT.bi));
    const homes = G.BUILDINGS.map((b, bi) => [b, bi]).filter(([b]) => b.door && (b.use === 'casa' || b.block) && W.districtAt((b.x + b.w / 2) * G.TS) === 'perif_e');
    const freeH = homes.filter(([, bi]) => !used.has(bi)), pool = (freeH.length ? freeH : homes).sort((a, c) => W.hash2(a[1], 7, 77) - W.hash2(c[1], 7, 77));
    const hb = pool[0] || G.BUILDINGS.map((b, bi) => [b, bi]).find(([b]) => b.door && b.use === 'casa');
    F.hq = hb ? I.tB(hb[1]) : I.target('covo');
    // il capo: nessuno lo nomina, non esce mai
    const capo = G.makeNpc(st, { id: 'capo', name: 'Senza nome', role: 'Comanda la Famiglia. Nessuno sa chi sia', home: F.hq.place, passante: true, tr: { cor: 1, loq: .1, avid: .9, legge: 0 }, sched: [[0, F.hq.place]], hp: 140, weapon: 'pistola', look: { skin: '#e0c4a8', top: '#1a1a20', bottom: '#1a1a20', hair: '#cfcac4', hat: 'fedora', hatCol: '#111', build: 1.05, extra: 'moustache' } });
    capo.first = 'lui'; capo.x = F.hq.x; capo.y = F.hq.y; capo.inside = true; capo.capo = true; capo.action = { name: 'dentro', scores: [], why: 'Non esce mai.', since: 0 };
    st.npcs.push(capo); F.capo = capo.id;
    capo.fam = { rank: 'capo', role: null, loyalty: 1, since: -1e5, jail: 12, tattoos: [] }; tattoo(capo);
    // i tre fidati: gli uomini di sempre (il vecchio Squalo non ha più nome: è un ricettatore come gli altri)
    const sandro = byId(st, 'sandro'); if (sandro) { sandro.name = 'Sandro Neri'; sandro.first = 'Sandro'; sandro.role = 'Ricettatore. Uno dei tre fidati della Famiglia'; }
    const fid = ['sandro', 'rocco', 'tano'].map(id => byId(st, id)).filter(alive);
    fid.forEach((n, i) => enlist(st, n, 'fidato', ['ricettazione', 'picchiatore', 'picchiatore'][i]));
    // i soldati: dalla malavita dell'isola, chi ha meno scrupoli e più bisogno
    const want = ['spaccio', 'spaccio', 'spaccio', 'spaccio', 'picchiatore', 'picchiatore', 'picchiatore', 'ricatto', 'ricatto', 'ricettazione', 'ricettazione', 'picchiatore'];
    const score = n => { const P = n.pop; return (1 - n.tr.legge) * .9 + n.tr.avid * .4 + n.tr.cor * .3 + (P.giro && P.giro !== 'orecchio' ? .8 : 0) + (P.debt ? .2 : 0) + (P.sex === 'm' ? .15 : 0) + rnd() * .2; };
    const cands = st.npcs.filter(n => n.pop && !n.pop.cast && alive(n) && !n.cop && !n.faction && !n.fam && !(n.ris && n.ris.member) && n.pop.giro !== 'orecchio' && n.pop.age >= 18 && n.pop.age <= 58)
      .sort((a, c) => score(c) - score(a));
    const need = Math.max(0, CFG.famStart - fid.length);
    cands.slice(0, need).forEach((n, i) => {
      const fit = { spacciatore: 'spaccio', ricettatore: 'ricettazione', borsaiolo: 'picchiatore', ladro: 'ricettazione' }[n.pop.giro];
      const k = fit && want.includes(fit) ? want.indexOf(fit) : 0, role = want.splice(k, 1)[0] || 'picchiatore';
      enlist(st, n, 'soldato', role);
    });
    F.fidati = fid.map(n => n.id); assignBosses(st);
  }

  // un uomo comincia un lavoro: si prende un aiutante
  function famBlocks(st) {
    const m = I.minOfDay(st.t);
    men(st).forEach(n => {
      const f = n.fam, P = n.pop; if (!P || !P.cur || f.rank === 'capo') return;
      if (f.lastBlock === P.cur) return; f.lastBlock = P.cur;
      // l'aiutante di prima torna a casa
      if (f.helper && P.cur.act !== 'giro') releaseHelper(st, n);
      if (P.cur.act !== 'giro' || !free(st, n)) return;
      f.works++; f.loyalty = clamp(f.loyalty + .01, 0, 1);
      giroEffects(st, n, P.cur);
      if (!f.helper && rnd() < CFG.helperChance) takeHelper(st, n, P.cur, m);
    });
  }
  function helperScore(st, n, k) {
    const P = k.pop; let s = (1 - k.tr.legge) * .7 + k.tr.avid * .4 + (P.money < 20 ? .3 : 0) + (P.debt ? .25 : 0) + (P.need ? P.need.paura * -.2 : 0);
    if ((n.pop.friends || []).includes(k.id)) s += .3;
    const H = st.fam.helpers[k.id]; if (H) s += Math.min(.3, H.times * .1);
    return s + rnd() * .15;
  }
  function takeHelper(st, n, b, m) {
    const F = st.fam, P = n.pop;
    const pool = st.npcs.filter(k => k !== n && free(st, k) && k.pop && !k.pop.cast && !k.fam && !k.cop && !k.faction && !(k.ris && (k.ris.member || k.ris.collabOf)) && !k.cell
      && k.pop.age >= 17 && k.pop.age < 60 && !(F.helpers[k.id] && F.helpers[k.id].busy) && !(k.pop.cur && k.pop.cur.fixed && k.pop.cur.act === 'lavoro')
      && ((P.friends || []).includes(k.id) || dist(k.pop.homeT.x, k.pop.homeT.y, P.homeT.x, P.homeT.y) < 90));
    if (!pool.length) return;
    const h = pool.map(k => [k, helperScore(st, n, k)]).sort((a, c) => c[1] - a[1])[0];
    if (!h || h[1] < .55) return;
    const k = h[0], pay = 4 + Math.round(rnd() * 10);
    const H = F.helpers[k.id] = F.helpers[k.id] || { times: 0, for: {} };
    H.times++; H.for[n.id] = (H.for[n.id] || 0) + 1; H.busy = n.id; H.last = st.t;
    n.fam.helper = k.id; F.stats.aiuti++;
    // nel programma dell'aiutante: adesso col suo uomo, fra un paio d'ore a casa
    const KP = k.pop; KP.plan = KP.plan.filter(x => !(x.helpFam));
    KP.plan.push({ at: m, tgt: b.tgt, act: 'aiuta', label: `dà una mano a ${n.first} per un lavoretto`, fixed: true, helpFam: true });
    KP.plan.push({ at: Math.min(1439, m + 120), tgt: KP.homeT, act: 'casa', label: 'torna a casa coi soldi in tasca', fixed: true, helpFam: true });
    KP.plan.sort((x, y) => x.at - y.at);
    KP.money += pay; I.feel(k, 'paura', .05);
    I.note(st, k, `dato una mano a ${n.first} per un lavoretto (${pay}.000 lire, senza fare domande)`, 'shady', { w: .55, who: n.id, tag: 'famiglia' });
    I.note(st, n, `preso ${k.first} per dare una mano`, 'shady', { w: .3, who: k.id, tag: 'famiglia' });
  }
  function releaseHelper(st, n) {
    const F = st.fam, k = byId(st, n.fam.helper); n.fam.helper = null;
    if (k && F.helpers[k.id]) F.helpers[k.id].busy = null;
  }
  // cosa succede quando lavora: riscossioni, ricatti, soldi alla Famiglia
  function giroEffects(st, n, b) {
    const F = st.fam, f = n.fam, P = n.pop;
    if (f.role === 'picchiatore') {
      const d = st.npcs.filter(k => k !== n && free(st, k) && k.pop && k.pop.debt && !k.fam && dist(k.pop.homeT.x, k.pop.homeT.y, b.tgt.x, b.tgt.y) < 120).sort(() => rnd() - .5)[0];
      if (d) {
        const pay = Math.min(d.pop.debt.amount, Math.max(0, d.pop.money * .6));
        d.pop.money -= pay; d.pop.debt.amount -= pay; F.cash += pay * .7; F.stats.entrate.riscossioni += pay * .7; P.money += pay * .3; F.stats.riscossioni++;
        I.feel(d, 'paura', .35); I.feel(d, 'rabbia', .1);
        I.note(st, d, pay > 1 ? `sono passati quelli della Famiglia: ${Math.round(pay)}.000 lire, e un avvertimento` : 'sono passati quelli della Famiglia: non aveva niente, gli hanno spaccato la porta', 'bad', { w: .7, who: n.id, tag: 'squalo' });
        if (d.pop.debt.amount < 1) d.pop.debt = null;
      }
    } else if (f.role === 'ricatto') {
      const v = st.npcs.filter(k => k !== n && free(st, k) && k.pop && !k.fam && k.pop.money > 15 && k.pop.diary.some(e => (e.tag === 'segreto' || e.kind === 'shady') && st.t - e.t < 7 * 1440)).sort(() => rnd() - .5)[0];
      if (v) { const q = Math.round(v.pop.money * .35); v.pop.money -= q; F.cash += q * .7; F.stats.entrate.ricatti += q * .7; P.money += q * .3; F.stats.ricatti++; I.feel(v, 'paura', .4); I.note(st, v, `${n.first} sa una cosa che non doveva sapere: ${q}.000 lire per tacere`, 'bad', { w: .75, who: n.id, tag: 'squalo' }); }
    } else { const q = 3 + rnd() * 8; F.cash += q; F.stats.entrate.spaccio += q; }
  }

  // ogni notte: i fidati si ricalcolano, i fidati propongono, i conti salgono dal capo
  function famNight(st) {
    const F = st.fam, all = men(st);
    // traditori: chi è stato in cella con poca fedeltà ha parlato
    all.forEach(n => {
      const f = n.fam; if (f.rank === 'capo') return;
      if (n.jailedUntil > st.t && !f.jailSeen) { f.jailSeen = true; f.jail++; tattoo(n); if (f.loyalty < .4 && rnd() < .5) betray(st, n); else f.loyalty = clamp(f.loyalty + .05, 0, 1); }
      if (!(n.jailedUntil > st.t)) f.jailSeen = false;
    });
    // i tre più fedeli (un fidato resta tale finché è libero e fedele)
    const keep = F.fidati.map(id => byId(st, id)).filter(n => alive(n) && n.fam && n.fam.rank === 'fidato' && !(n.jailedUntil > st.t + 1440) && n.fam.loyalty >= .5);
    if (keep.length < CFG.fidati) {
      const up = all.filter(n => n.fam.rank === 'soldato' && free(st, n) && !keep.includes(n)).sort((a, c) => c.fam.loyalty - a.fam.loyalty).slice(0, CFG.fidati - keep.length);
      F.fidati.filter(id => !keep.some(k => k.id === id)).forEach(id => { const n = byId(st, id); if (alive(n) && n.fam) { n.fam.rank = 'soldato'; tattoo(n); setSecret(st, n); I.note(st, n, 'il capo non si fida più come prima: non è più tra i tre', 'bad', { w: .6, tag: 'famiglia' }); } });
      up.forEach(n => { n.fam.rank = 'fidato'; n.fam.loyalty = clamp(n.fam.loyalty + .1, 0, 1); tattoo(n); setSecret(st, n); F.stats.promossi++; I.note(st, n, 'adesso è uno dei tre: il capo gli ha fatto vedere la sua faccia', 'good', { w: .8, tag: 'famiglia' }); });
      F.fidati = keep.concat(up).map(n => n.id);
    }
    assignBosses(st);
    // le proposte: solo i fidati, uno alla volta, e mai oltre il tetto
    const count = famCount(st), short = count < CFG.famStart;
    F.fidati.map(id => byId(st, id)).filter(n => free(st, n) && n.pop).forEach(fd => {
      if (F.pending[fd.id] || count + Object.keys(F.pending).length >= CFG.famMax) return;
      if (st.t - (fd.fam.lastProp || -1e9) < 3 * 1440) return;
      if (!short && rnd() > .2) return;   // a ranghi pieni si cresce piano
      const c = candidate(st, fd); if (!c) return;
      F.pending[fd.id] = { cand: c.id, at: st.t }; fd.fam.lastProp = st.t; F.stats.proposte++;
      I.note(st, fd, `vuole portare ${c.first} dal capo`, 'shady', { w: .4, who: c.id, tag: 'famiglia' });
      if (fd.pop) I.startProject(st, fd, PROJ_RAPPORTO, { who: 'p' + st.t, cand: c.id });
    });
    // i fidati che non hanno proposte portano comunque i conti, ogni tanto
    F.fidati.map(id => byId(st, id)).filter(n => free(st, n) && n.pop && !F.pending[n.id] && rnd() < .35).forEach(fd => I.startProject(st, fd, PROJ_RAPPORTO, { who: 'c' + st.t }));
  }
  function candidate(st, fd) {
    const F = st.fam;
    const cands = st.npcs.filter(k => k !== fd && free(st, k) && k.pop && !k.pop.cast && !k.fam && !k.cop && !k.faction && !(k.ris && k.ris.member) && k.pop.age >= 18 && k.pop.age <= 55 && !Object.values(F.pending).some(p => p.cand === k.id) && !(k.famNo && st.t - k.famNo < 5 * 1440));
    const sc = k => { const H = F.helpers[k.id]; return (H ? Math.min(.9, H.times * .3) + (H.for[fd.id] ? .2 : 0) : 0) + ((fd.pop.friends || []).includes(k.id) ? .25 : 0) + (1 - k.tr.legge) * .5 + k.tr.cor * .2 + (k.pop.giro && k.pop.giro !== 'orecchio' ? .3 : 0); };
    const best = cands.map(k => [k, sc(k)]).sort((a, c) => c[1] - a[1])[0];
    return best && best[1] > .8 ? best[0] : null;
  }
  // il fidato va dal capo, di notte: è l'unico modo di vedere dove sta
  const PROJ_RAPPORTO = { id: 'rapporto', need: true, label: (st, n, P, a) => a && a.cand ? `portare ${G.nameOf(st, a.cand)} dal capo` : 'portare i conti al capo', arg: () => null,
    steps: (st, n, P, a) => [{ k: 'go', ref: st.fam.hq, h: 23, act: 'scritta' /* come le scritte: si fa anche dopo l'Ora Quieta */, label: a && a.cand ? 'va dal capo a parlargli di uno nuovo' : 'porta i conti al capo, di notte', fx: (st, n) => visitCapo(st, n, a) }] };
  I.PROJ.rapporto = PROJ_RAPPORTO;
  function visitCapo(st, fd, a) {
    const F = st.fam, cash = Math.round(F.cash); F.cash = 0; F.dirty += cash; F.stats.incasso += cash; fd.fam.loyalty = clamp(fd.fam.loyalty + .03, 0, 1);
    I.note(st, fd, `portato ${cash}.000 lire al capo`, 'shady', { w: .4, tag: 'famiglia', place: F.hq.label });
    F.visits = (F.visits || 0) + 1; F.lastVisit = { by: fd.id, t: st.t };
    const p = F.pending[fd.id]; if (!a || !a.cand || !p) return 'done';
    delete F.pending[fd.id];
    const c = byId(st, p.cand); if (!free(st, c) || c.fam) return 'done';
    if (famCount(st) >= CFG.famMax) { I.note(st, fd, 'il capo ha detto che siamo già abbastanza', 'info', { w: .3, tag: 'famiglia' }); return 'done'; }
    // il capo decide: chi ha già lavorato per noi, chi ha poco da perdere, chi non parla
    const H = F.helpers[c.id], spy = c.pop.giro === 'orecchio' || (c.ris && c.ris.collabOf) || c.cell;
    let s = (H ? Math.min(.6, H.times * .2) : 0) + (1 - c.tr.legge) * .4 + fd.fam.loyalty * .3 - c.tr.loq * .25 + (famCount(st) < CFG.famStart ? .15 : 0);
    if (spy && rnd() < .6) { s = -1; I.note(st, fd, `il capo ha saputo che ${c.first} parla troppo. Va sistemato`, 'bad', { w: .7, who: c.id, tag: 'famiglia' }); I.feel(c, 'paura', .5); I.note(st, c, 'gli uomini della Famiglia lo guardano storto, da qualche giorno', 'bad', { w: .6, tag: 'squalo' }); }
    if (s < .55) { F.stats.respinti++; c.famNo = st.t; if (s > -1) I.note(st, fd, `il capo ha detto no per ${c.first}`, 'info', { w: .4, who: c.id, tag: 'famiglia' }); return 'done'; }
    F.stats.approvati++;
    // e lui accetta? Da questa porta non si esce
    const yes = (1 - c.tr.legge) * .6 + c.tr.avid * .3 + (c.pop.debt ? .2 : 0) + (c.pop.money < 20 ? .2 : 0) + c.pop.need.paura * .2 + (H ? .15 : 0) - (c.ris ? c.ris.ideo * .4 : 0);
    if (yes < .5) { F.stats.rifiuti++; c.famNo = st.t; I.note(st, c, `${fd.first} gli ha offerto di entrare nella Famiglia. Ha detto di no, e adesso ha paura`, 'bad', { w: .8, who: fd.id, tag: 'famiglia' }); I.feel(c, 'paura', .3); return 'done'; }
    const role = { spacciatore: 'spaccio', ricettatore: 'ricettazione', ladro: 'ricettazione' }[c.pop.giro] || pick(['spaccio', 'picchiatore', 'picchiatore', 'ricatto']);
    enlist(st, c, 'soldato', role, fd.id, `entrat${o(c)} nella Famiglia: ${fd.first} ha garantito per lui, il capo ha detto sì. Il primo tatuaggio`);
    c.fam.boss = fd.id; c.fam.loyalty = .55 + rnd() * .2; F.stats.iniziati++;
    I.note(st, fd, `${c.first} adesso è dei nostri`, 'good', { w: .4, who: c.id, tag: 'famiglia' });
    return 'done';
  }
  function betray(st, n) {
    const F = st.fam, f = n.fam; F.stats.traditori++;
    f.traitor = true; f.loyalty = .1; tattoo(n);
    const up = byId(st, f.boss) || byId(st, F.fidati[0]);
    G.addLog(st, `${G.clockStr(st.t)} · Si dice che in cella ${n.name} abbia parlato della Famiglia.`, 'info');
    if (up && rnd() < .5) I.arrest(st, up, 'associazione (ha parlato uno dei suoi)');
    I.note(st, n, 'ha parlato coi Grigi. Se la Famiglia lo scopre, è finita', 'bad', { w: .95, tag: 'segreto' });
    // uscito, la Famiglia lo caccia: niente più protezione
    delete F.men[n.id]; n.fam.rank = 'cacciato'; setSecret(st, n);
  }

  // ---------------- IL RICICLAGGIO ----------------
  // ogni mattina il cassiere (il fidato che ricetta) porta i soldi sporchi alla lavanderia e alla sala giochi-bar:
  // entrano negli incassi come lenzuola lavate e partite a flipper che nessuno ha giocato. Ogni copertura regge una
  // certa cifra al giorno; se il capo ne fa passare di più, i conti non tornano e la Tutela se ne accorge.
  const WASH = { lav: 35, sala: 55, fee: .1 };      // migliaia di lire al giorno, quota che si perde per strada
  const PAY = { fidato: 60, soldato: 25, roba: 8, mazzetta: 20, fisso: 15 };   // a settimana
  function cashier(st) { const F = st.fam; return F.fidati.map(id => byId(st, id)).filter(n => free(st, n) && n.pop).sort((a, c) => (c.fam.role === 'ricettazione') - (a.fam.role === 'ricettazione'))[0]; }
  function washAt(st, which, n) {
    const F = st.fam; if (!F.fronts || !F.fronts[which] || st.t < F.closedUntil || F.dirty <= 0) return 0;
    const cap = WASH[which], push = F.dirty > 300 ? 2 : 1;      // con troppi soldi fermi il capo forza la mano
    const q = Math.min(F.dirty, cap * push), over = Math.max(0, q - cap);
    F.dirty -= q; F.clean += q * (1 - WASH.fee); F.stats.lavati += q; F.heat += over / 120; if (typeof Soldi !== 'undefined') Soldi.flow(st, F.fronts[which], q * WASH.fee, 'riciclaggio');   // [soldi] la quota resta alla copertura
    if (n) I.note(st, n, `portato ${Math.round(q)}.000 lire alla ${which === 'lav' ? 'lavanderia' : 'sala giochi'}: «incassi» della giornata`, 'shady', { w: .35, tag: 'famiglia', place: F.fronts[which].label });
    return q;
  }
  const PROJ_LAVAGGIO = { id: 'lavaggio', need: true, label: () => 'portare i soldi alle coperture', arg: () => null,
    steps: (st, n) => { const F = st.fam; if (!F.fronts || !F.fronts.lav || !F.fronts.sala) return null; return [
      { k: 'go', ref: F.fronts.lav, h: 10, label: 'passa dalla lavanderia con una borsa', fx: (st, n) => { washAt(st, 'lav', n); st.fam.washedToday = I.dayIdx(st.t); return 'next'; } },
      { k: 'go', ref: F.fronts.sala, h: 11, label: 'passa dalla sala giochi a «controllare la cassa»', fx: (st, n) => { washAt(st, 'sala', n); st.fam.washedToday = I.dayIdx(st.t); return 'done'; } }]; } };
  I.PROJ.lavaggio = PROJ_LAVAGGIO;
  I.REFLECT.push((st, n) => { const F = st.fam; if (!F || F.dirty <= 0 || !F.fronts) return; if (cashier(st) === n) I.startProject(st, n, PROJ_LAVAGGIO, { who: 'lav' + st.t }); });
  function washHour(st, hr) {
    const F = st.fam; if (!F.fronts) return;
    // se il cassiere non ci è andato (in cella, malato), ci pensa il gestore: più in fretta e con più rischio
    if (hr === 21 && F.washedToday !== I.dayIdx(st.t) && F.dirty > 0) { washAt(st, 'lav'); washAt(st, 'sala'); F.heat += .05; F.washedToday = I.dayIdx(st.t); }
    if (hr === 6) { F.heat = Math.max(0, F.heat * .9 - .02); if (F.heat > .8 && rnd() < (F.heat - .6) * .4) inspect(st); }
  }
  // la Tutela controlla i registri: le coperture chiudono, i soldi in parte spariscono
  function inspect(st) {
    const F = st.fam, seized = Math.round(F.clean * .3 + F.dirty * .2);
    F.clean *= .7; F.dirty *= .8; F.stats.ispezioni++; F.stats.sequestri += seized; if (typeof Soldi !== 'undefined') Soldi.flow(st, 'stato', seized, 'sequestro alla Famiglia');   // [soldi] F.heat = .2; F.closedUntil = st.t + 2 * 1440;
    G.addLog(st, `${G.clockStr(st.t)} · La Tutela ha messo i sigilli alla ${F.fronts.lav ? F.fronts.lav.label : 'lavanderia'} e alla sala giochi: «irregolarità nei registri».`, 'info');
    G.feed(st, 'Sigilli alla lavanderia e alla sala giochi: la Tutela controlla i registri.', 'rumor');
    const c = cashier(st); if (c && rnd() < .3) I.arrest(st, c, 'riciclaggio');
    st.npcs.filter(n => n.pop && n.pop.job && n.pop.job.t && [F.fronts.lav, F.fronts.sala].some(t => t && I.tkey(t) === I.tkey(n.pop.job.t))).forEach(n => I.note(st, n, 'sono venuti quelli della Tutela a guardare i registri. Il padrone era bianco come un lenzuolo', 'bad', { w: .6, tag: 'fermato' }));
  }
  // la notte tra venerdì e sabato il capo paga: roba e spese, mazzette ai Grigi, stipendi; quello che avanza va nel tesoro
  function payday(st) {
    const F = st.fam, ms = men(st).filter(n => n.fam.rank !== 'capo');
    const roba = ms.filter(n => n.fam.role === 'spaccio').length * PAY.roba + PAY.fisso;
    const g = Math.min(F.clean, roba); F.clean -= g; F.stats.gestione += g; if (typeof Soldi !== 'undefined') Soldi.flow(st, 'fuori', g, 'la roba dal continente');   // [soldi]
    const cops = st.npcs.filter(n => n.cop && alive(n) && !n.reinforcement).sort((a, c) => ((c.id === 'ferri') - (a.id === 'ferri')) || (c.tr.avid - a.tr.avid));
    for (const cop of cops.slice(0, 2)) {
      if (F.clean < PAY.mazzetta || (cop.tr.legge >= .95 && cop.tr.avid < .3)) continue;   // c'è chi non si compra
      F.clean -= PAY.mazzetta; F.stats.mazzette += PAY.mazzetta; F.bribes[cop.id] = st.t + 7 * 1440; if (typeof Soldi !== 'undefined') Soldi.flow(st, cop, PAY.mazzetta, 'mazzetta');   // [soldi]
      if (cop.pop) I.note(st, cop, `una busta senza nome nell'armadietto: ${PAY.mazzetta}.000 lire`, 'shady', { w: .5, tag: 'segreto' });
    }
    ms.sort((a, c) => (c.fam.rank === 'fidato') - (a.fam.rank === 'fidato')).forEach(n => {
      const due = PAY[n.fam.rank] || PAY.soldato;
      if (F.clean >= due) { F.clean -= due; F.stats.stipendi += due; if (n.pop) n.pop.money += due; n.fam.loyalty = clamp(n.fam.loyalty + .03, 0, 1); n.fam.unpaid = 0; }
      else { F.stats.nonPagati++; n.fam.unpaid = (n.fam.unpaid || 0) + 1; n.fam.loyalty = clamp(n.fam.loyalty - .08 * n.fam.unpaid, 0, 1); if (n.pop) I.note(st, n, 'questa settimana la busta non è arrivata', 'bad', { w: .5, tag: 'famiglia' }); }
    });
    F.treasure += F.clean * .5; F.clean *= .5;
  }
  // un Grigio comprato chiude un occhio: un uomo appena fermato esce presto
  function bribeHour(st) {
    const F = st.fam, on = Object.entries(F.bribes).filter(([id, until]) => until > st.t && alive(byId(st, id)));
    men(st).forEach(n => {
      if (n.fam.rank === 'capo') return;
      const jailed = n.jailedUntil > st.t;
      if (jailed && !n.fam.bribeChecked) {
        n.fam.bribeChecked = true;
        if (on.length && rnd() < Math.min(.8, .45 * on.length)) {
          n.jailedUntil = st.t + 20; F.stats.chiusoUnOcchio++;
          const cop = byId(st, on[0][0]); if (n.pop) I.note(st, n, `fermat${o(n)} e rilasciat${o(n)} dopo mezz'ora: ${cop ? cop.first : 'un Grigio'} ha chiuso un occhio`, 'shady', { w: .4, tag: 'famiglia' });
        }
      }
      if (!jailed) n.fam.bribeChecked = false;
    });
  }

  // ================= LA RISACCA: tetto, collaboratori, cellule =================
  const risMembers = st => RS.members(st);
  RS.EXT.canJoin = (st, n) => risMembers(st).length >= CFG.risMax ? `La Risacca è al completo (${CFG.risMax}). ${n.first} può dare una mano da fuori, come collaboratore di un membro.` : null;
  RS.EXT.onJoin.push((st, n) => { const c = st.ris.collab[n.id]; if (c) dropCollab(st, n, 'è entrato nella Risacca'); if (n.cell) leaveCell(st, n); setSecret(st, n); });
  const collabsOf = (st, m) => Object.entries(st.ris.collab || {}).filter(([, c]) => c.of === m.id).map(([id]) => byId(st, id)).filter(alive);

  // il verbo nuovo: un membro chiede a qualcuno di dargli una mano da fuori
  RS.VERBS.collaboratore = { label: 'prendi un collaboratore', risk: .1, task: true, pol: true, args: 'persona', desc: `chiede a qualcuno di dargli una mano da fuori (al massimo ${CFG.collabPer} a testa): soldi, occhi, mani` };
  RS.EXT.plan.push((st, n, verb, a) => {
    if (verb !== 'collaboratore') return null;
    if (collabsOf(st, n).length >= CFG.collabPer) return { err: `${n.first} ha già ${CFG.collabPer} collaboratori.` };
    const tn = RS.resolvePerson(st, a.persona); if (!tn || tn.dead) return { err: 'Chiedere a chi?' };
    if (tn.ris && tn.ris.member) return { err: `${tn.first} è già della Risacca.` };
    if (st.ris.collab[tn.id]) return { err: `${tn.first} dà già una mano a ${G.nameOf(st, st.ris.collab[tn.id].of)}.` };
    return { steps: [{ k: 'meet', who: tn.id }, { k: 'do', fn: 'arruola', who: tn.id }], desc: `va a chiedere a ${tn.first} di dargli una mano da fuori` };
  });
  RS.EXT.do.arruola = (st, n, T, s) => { const tn = byId(st, s.who); const r = askCollab(st, n, tn); return r; };
  function askCollab(st, m, tn) {
    if (!alive(tn)) return { ok: false, msg: 'Non l\'ho trovato.' };
    if (collabsOf(st, m).length >= CFG.collabPer) return { ok: false, msg: `Ne ho già ${CFG.collabPer}, di collaboratori.` };
    RS.initNpc(st, tn); const c = RS.card(tn);
    if (c.antag || c.informer || tn.cop || (tn.fam && tn.fam.rank !== 'cacciato')) {
      st.ris.repr = clamp(st.ris.repr + 8, 0, 100); m.ris.loyalty = clamp(m.ris.loyalty - .05, 0, 1);
      if (tn.pop) I.note(st, tn, `${m.first} gli ha chiesto di aiutare la Risacca`, 'shady', { w: .7, who: m.id, tag: 'risacca' });
      return { ok: false, msg: `Ho chiesto a ${tn.first}. Ho sbagliato persona: adesso sa chi sono.` };
    }
    const close = tn.pop && m.pop ? I.closeness(st, m, tn) : .25;
    const ch = tn.ris.ideo * .8 + close * .35 + tn.ris.bond + (tn.pop ? tn.pop.need.rabbia * .25 - tn.pop.need.paura * .3 : 0) - (1 - tn.tr.cor) * .15 - .15;
    if (rnd() < ch) { addCollab(st, m, tn); return { ok: true, msg: `${tn.first} ci sta: darà una mano da fuori. Conosce solo me.` }; }
    tn.ris.bond += .04; return { ok: false, msg: `${tn.first} non se la sente. Per ora.` };
  }
  function addCollab(st, m, tn) {
    st.ris.collab[tn.id] = { of: m.id, since: st.t, helped: 0, money: 0, warned: 0 };
    tn.ris.collabOf = m.id; tn.ris.ideo = clamp(tn.ris.ideo + .05, 0, 1);
    if (tn.pop) I.note(st, tn, `ha promesso a ${m.first} di dare una mano alla Risacca, da fuori`, 'shady', { w: .8, who: m.id, tag: 'risacca' });
    setSecret(st, tn); st.ris.morale = clamp(st.ris.morale + 1, 0, 100);
    G.addLog(st, `${G.clockStr(st.t)} · ${tn.name} collabora con ${m.first}.`, 'good');
  }
  function dropCollab(st, tn, why) {
    const c = st.ris.collab[tn.id]; if (!c) return;
    delete st.ris.collab[tn.id]; if (tn.ris) tn.ris.collabOf = null; setSecret(st, tn);
    const m = byId(st, c.of); if (m && why) G.addLog(st, `${G.clockStr(st.t)} · ${tn.name} non collabora più con ${m.first}: ${why}.`, 'info');
  }
  // chi parla in cella fa cadere i suoi collaboratori, e solo loro
  RS.EXT.onTalk.push((st, m) => {
    collabsOf(st, m).forEach(k => { if (rnd() < .5) { I.arrest(st, k, `collaborava con ${m.first}`); RS.inbox(st, m, `Per colpa mia hanno preso ${k.first}.`, 'bad'); } });
    Object.values(st.ris.cells || {}).forEach(c => { if (c.contact === m.id && rnd() < .4) c.members.map(id => byId(st, id)).filter(alive).forEach(k => { if (rnd() < .35) I.arrest(st, k, `della cellula «${c.name}»`); }); });
  });
  // ogni notte i membri col libero arbitrio cercano qualcuno che dia una mano da fuori
  function collabNight(st) {
    risMembers(st).filter(m => free(st, m) && m.ris.auto && collabsOf(st, m).length < CFG.collabPer && rnd() < .6).forEach(m => {
      const pool = st.npcs.filter(k => k !== m && free(st, k) && k.pop && !k.fam && !k.cop && !k.faction && !(k.ris && (k.ris.member || k.ris.collabOf)) && !k.cell && k.ris && k.ris.ideo > .4 && k.pop.age >= 16
        && (((m.pop && m.pop.friends) || []).includes(k.id) || (m.pop && dist(k.pop.homeT.x, k.pop.homeT.y, m.pop.homeT.x, m.pop.homeT.y) < 70)));
      const top = pool.sort((a, c) => c.ris.ideo - a.ris.ideo).slice(0, 4), k = top.length ? pick(top) : null; if (!k) return;
      const r = askCollab(st, m, k);
      if (r.ok) RS.inbox(st, m, `Ho trovato chi ci darà una mano da fuori: ${k.name}, ${k.role.toLowerCase()}. Conosce solo me.`, 'good', true);
    });
  }
  // cosa fanno i collaboratori
  function collabStep(st) {
    const R = st.ris, m0 = I.minOfDay(st.t);
    // mani: quando il loro membro lavora a un compito, chi è libero va ad aiutarlo
    risMembers(st).forEach(m => {
      const T = m.ris.task, s = T && T.steps[T.i];
      if (!T || !s || s.k !== 'work') return;
      T.collab = T.collab || {};
      collabsOf(st, m).forEach(k => {
        if (T.collab[k.id] !== undefined || !free(st, k) || !k.pop) return;
        const cur = k.pop.cur, busy = cur && cur.fixed && (cur.act === 'lavoro' || cur.act === 'sonno');
        if (busy || rnd() > .6) { T.collab[k.id] = false; return; }
        T.collab[k.id] = true; const p = G.nearestPlace(m.x, m.y), tgt = I.target(p.id) || { k: 'p', pid: p.id, x: p.x, y: p.y, label: p.name, place: p.id };
        k.pop.plan.push({ at: m0, tgt, act: 'aiuta', label: `dà una mano a ${m.first}`, fixed: true }); k.pop.plan.push({ at: Math.min(1439, m0 + (s.hours || 2) * 60), tgt: k.pop.homeT, act: 'casa', label: 'torna a casa', fixed: true });
        k.pop.plan.sort((x, y) => x.at - y.at);
        R.collab[k.id].helped++; I.note(st, k, `andato a dare una mano a ${m.first}: ${T.desc}`, 'shady', { w: .5, who: m.id, tag: 'risacca' });
      });
    });
  }
  function collabHour(st, hr) {
    const R = st.ris, wd = PO.weekday(st.t);
    risMembers(st).forEach(m => {
      const T = m.ris.task; if (!T || !T.collab) return;
      const n = Object.values(T.collab).filter(Boolean).length; if (!n) return;
      const V = RS.VERBS[T.verb] || {};
      if (T.earned !== undefined || V.work) { const b = 1.5 * n; st.ris.cassa += b; T.earned = (T.earned || 0) + b; }
      if (V.pol) R.morale = clamp(R.morale + .25 * n, 0, 100);
      m.ris.fatigue = clamp(m.ris.fatigue - .02 * n, 0, 1);
    });
    // il venerdì sera i collaboratori mettono qualcosa nella cassa
    if (wd === 4 && hr === 20) risMembers(st).forEach(m => {
      let tot = 0; collabsOf(st, m).forEach(k => { if (!free(st, k) || !k.pop) return; const q = Math.round(clamp(k.pop.money * .12 * k.ris.ideo, 0, 12)); if (q < 1) return; k.pop.money -= q; tot += q; R.collab[k.id].money += q; });
      if (tot) { st.ris.cassa += tot; RS.inbox(st, m, `Quelli che ci danno una mano da fuori hanno messo insieme ${tot}.000 lire.`, 'good', true); }
    });
    // occhi: chi abita vicino a una base vede i Grigi muoversi
    if (R.raid && !R.raid.warned) {
      const k = Object.keys(R.collab).map(id => byId(st, id)).find(k => free(st, k) && k.pop && dist(k.pop.homeT.x, k.pop.homeT.y, R.raid.x, R.raid.y) < 90);
      if (k) { R.raid.warned = true; R.raid.at += 30; R.collab[k.id].warned++; const m = byId(st, R.collab[k.id].of); if (m) RS.inbox(st, m, `${k.first} ha visto i Grigi prepararsi per ${R.raid.name}. Abbiamo mezz'ora in più.`, 'bad'); }
    }
    // un collaboratore in cella: se ha poca fede, fa il nome del suo membro (e solo quello)
    Object.entries(R.collab).forEach(([id, c]) => {
      const k = byId(st, id); if (!k) return;
      if (k.dead) { dropCollab(st, k, 'è morto'); return; }
      if (k.jailedUntil > st.t && !c.jailSeen) {
        c.jailSeen = true; const m = byId(st, c.of);
        if (k.ris.ideo < .55 && rnd() < .5 && m) { R.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .12, 0, 1); }); RS.inbox(st, m, `Hanno preso ${k.first}. Ha fatto il mio nome.`, 'bad'); R.repr = clamp(R.repr + 3, 0, 100); dropCollab(st, k, 'ha parlato'); }
        else if (m) RS.inbox(st, m, `Hanno preso ${k.first}. Non dirà niente, lo conosco.`, 'bad', true);
      }
      if (!(k.jailedUntil > st.t)) c.jailSeen = false;
      const m = byId(st, c.of); if (!m || m.dead || !m.ris.member) dropCollab(st, k, 'il suo membro non c\'è più');
    });
  }

  // ---------------- CELLULE AUTONOME ----------------
  const CELL_NAMES = ['Quelli del Vico', 'Brigata del Molo', 'I Carbonai', 'Cellula Neve', 'Le Vedove', 'I Ragazzi della Calata', 'Brigata Betulla', 'Collettivo Tipografia', 'I Fuochisti', 'Cellula Ottantuno', 'Le Sarte', 'Quelli della Fontana'];
  const freeForCell = (st, k) => free(st, k) && k.pop && !k.pop.cast && !k.fam && !k.cop && !k.faction && k.ris && !k.ris.member && !k.ris.collabOf && !k.cell;
  function cellNight(st) {
    const R = st.ris, cells = Object.values(R.cells), act = cells.filter(c => c.alive);
    // nascono: amici arrabbiati che la pensano allo stesso modo si organizzano da soli
    if (act.length < CFG.cellMax && rnd() < .12 + R.morale / 400) {
      // chi ha un motivo: rabbia, un parente portato via, la fame, la paura che diventa rabbia
      const grudge = k => k.pop.need.rabbia > .15 || !!k.pop.lost || k.pop.diary.some(e => ['arresto', 'fermato', 'scarsita', 'lutto', 'squalo'].includes(e.tag) && st.t - e.t < 7 * 1440);
      const seeds = st.npcs.filter(k => freeForCell(st, k) && k.ris.ideo > .55 && k.tr.cor > .4 && grudge(k)).sort(() => rnd() - .5);
      for (const s of seeds) {
        const fr = (s.pop.friends || []).map(id => byId(st, id)).filter(k => k && freeForCell(st, k) && k.ris.ideo > .42).sort((a, c) => c.ris.ideo - a.ris.ideo).slice(0, 3);
        if (!fr.length) continue;
        const ms = [s].concat(fr), used = new Set(cells.map(c => c.name));
        const name = CELL_NAMES.find(x => !used.has(x)) || `Cellula ${cells.length + 1}`;
        const c = R.cells['c' + (++R.cellN)] = { id: 'c' + R.cellN, name, members: ms.map(k => k.id), born: st.t, contact: null, accepted: false, alive: true, acts: 0, log: [], home: s.pop.homeT.label };
        ms.forEach(k => { k.cell = c.id; setSecret(st, k); I.note(st, k, `con ${ms.filter(x => x !== k).map(x => x.first).join(', ')} abbiamo deciso di fare qualcosa. Da soli. «${name}»`, 'shady', { w: .85, tag: 'risacca' }); });
        G.addLog(st, `${G.clockStr(st.t)} · Nasce una cellula autonoma: «${name}».`, 'info');
        break;
      }
    }
    // si fanno vive con la Risacca, che le accoglie
    const ms = risMembers(st).filter(m => free(st, m));
    act.filter(c => !c.accepted).forEach(c => {
      if (!ms.length) return;
      const mem = c.members.map(id => byId(st, id)).filter(alive);
      const m = ms.find(m => mem.some(k => (k.pop.friends || []).includes(m.id) || ((m.pop && m.pop.friends) || []).includes(k.id))) || ms.sort((a, b) => b.ris.loyalty - a.ris.loyalty)[0];
      c.contact = m.id; c.accepted = true; c.acceptedAt = st.t; R.morale = clamp(R.morale + 3, 0, 100);
      RS.inbox(st, m, `Mi ha cercato un gruppo che si fa chiamare «${c.name}»: ${mem.length} persone, fanno da sole ma stanno con noi. La Risacca li accoglie. Il contatto sono io.`, 'good');
      G.feed(st, `La Risacca accoglie una cellula autonoma: «${c.name}».`, 'good');
    });
    // agiscono da sole, secondo la linea della banda (che però non è un ordine)
    act.forEach(c => {
      const mem = c.members.map(id => byId(st, id)).filter(k => free(st, k) && k.pop && !k.pop.projects.some(p => p.kind === 'cella'));
      if (mem.length < 1) return;
      const L = R.linea, rl = RS.reprLevel(st);
      const rate = .5 * (L === 'prudenza' ? .4 : L === 'propaganda' ? 1.3 : 1) * (c.accepted ? 1 : .6) * (1 - rl * .06);
      if (rnd() > rate) return;
      const w = { scritta: L === 'propaganda' ? 4 : 2.5, volantini: L === 'propaganda' ? 3 : 1.5, colletta: c.accepted ? (L === 'soldi' ? 3 : 1.2) : 0, sabotaggio: mem.some(k => k.pop.need.rabbia > .6) && L !== 'prudenza' ? .8 : 0 };
      let r = rnd() * Object.values(w).reduce((a, b) => a + b, 0), kind = 'scritta';
      for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { kind = k; break; } }
      const k = c.todo && mem.length > 1 ? mem.find(x => x.id !== c.todo.who) : mem[c.acts % mem.length];
      c.todo = { who: k.id, kind, day: I.dayIdx(st.t) + 1 };
    });
  }
  const WALLS = ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'fontana', 'lungomare', 'muro', 'villaggio'];
  const CELL_ACTS = {
    scritta: (st, n, c) => ({ k: 'go', ref: pick(WALLS.filter(id => PLACES[id])), h: 1 + Math.floor(rnd() * 3), act: 'scritta', label: `scrive sul muro per «${c.name}»`, fx: (st, n, P, pj, b) => { I.paintWall(st, n, b, Object.assign(I.sketchFor(st, n), { kind: 'scritta' })); cellDone(st, c, n, `una scritta a ${b.tgt.label}`); return 'done'; } }),
    volantini: (st, n, c) => ({ k: 'go', ref: pick(['piazza', 'calata', 'osteria', 'mercato', 'bar'].filter(id => PLACES[id])), h: 20, label: `lascia volantini per «${c.name}»`, fx: (st, n, P, pj, b) => {
      const R = st.ris; R.morale = clamp(R.morale + 1.5, 0, 100); R.repr = clamp(R.repr + 1, 0, 100);
      st.npcs.filter(k => k !== n && k.ris && k.pop && dist(k.x, k.y, b.tgt.x, b.tgt.y) < 25).slice(0, 6).forEach(k => { k.ris.ideo = clamp(k.ris.ideo + .03, 0, 1); I.note(st, k, `trovato un volantino: «${c.name}»`, 'info', { w: .3, tag: 'scritta' }); });
      if (rnd() < .08 + RS.reprLevel(st) * .03) I.arrest(st, n, 'volantinaggio'); cellDone(st, c, n, `volantini a ${b.tgt.label}`); return 'done'; } }),
    colletta: (st, n, c) => ({ k: 'go', ref: pick(['osteria', 'bar', 'circolo'].filter(id => PLACES[id])), h: 20, label: `raccoglie soldi tra gli amici per «${c.name}»`, fx: (st, n) => {
      const q = 4 + Math.round(rnd() * 10); st.ris.cassa += q; const m = byId(st, c.contact); if (m) RS.inbox(st, m, `«${c.name}» ci manda ${q}.000 lire.`, 'good', true); cellDone(st, c, n, `una colletta: ${q}.000 lire`); return 'done'; } }),
    sabotaggio: (st, n, c) => ({ k: 'go', ref: pick(['calata', 'piazza', 'lungomare', 'muro'].filter(id => PLACES[id])), h: 2, act: 'scritta', label: `butta giù un cartellone del Garante per «${c.name}»`, fx: (st, n, P, pj, b) => {
      const R = st.ris; R.morale = clamp(R.morale + 4, 0, 100); R.repr = clamp(R.repr + 5, 0, 100);
      G.addLog(st, `${G.clockStr(st.t)} · Stanotte qualcuno ha abbattuto un cartellone del Garante a ${b.tgt.label}.`, 'info');
      if (rnd() < .2 + RS.reprLevel(st) * .05) I.arrest(st, n, 'sabotaggio'); cellDone(st, c, n, `un cartellone del Garante abbattuto a ${b.tgt.label}`); return 'done'; } }),
  };
  const PROJ_CELLA = { id: 'cella', need: true, label: (st, n, P, a) => `fare la sua parte per «${(st.ris.cells[a.cell] || {}).name}»`, arg: () => null,
    steps: (st, n, P, a) => { const c = st.ris.cells[a.cell]; return c ? [CELL_ACTS[a.kind](st, n, c)] : null; } };
  I.PROJ.cella = PROJ_CELLA;
  // la sera prima si decide chi fa cosa; a mezzanotte entra nei progetti di chi tocca
  I.REFLECT.push((st, n) => {
    if (!n.cell || !st.ris) return; const c = st.ris.cells[n.cell]; if (!c || !c.todo || c.todo.who !== n.id) return;
    if (I.startProject(st, n, PROJ_CELLA, { who: 'cella' + st.t, cell: c.id, kind: c.todo.kind })) c.todo = null;   // se non ha tempo, ci riprova un altro della cellula
  });
  function cellDone(st, c, n, what) {
    c.acts++; c.log.push({ t: st.t, who: n.id, what }); if (c.log.length > 10) c.log.shift(); c.last = st.t;
    c.members.forEach(id => { const k = byId(st, id); if (k && k !== n && k.pop) I.note(st, k, `${n.first} ha fatto ${what}`, 'shady', { w: .4, who: n.id, tag: 'risacca' }); });
    const m = c.accepted && byId(st, c.contact); if (m && rnd() < .5) RS.inbox(st, m, `«${c.name}»: ${what}.`, 'rumor', true);
  }
  function leaveCell(st, k) { const c = st.ris.cells[k.cell]; k.cell = null; if (!c) return; c.members = c.members.filter(id => id !== k.id); if (c.members.length < 2) dissolve(st, c, 'sono rimasti in pochi'); }
  function dissolve(st, c, why) { if (!c.alive) return; c.alive = false; c.members.forEach(id => { const k = byId(st, id); if (k) { k.cell = null; setSecret(st, k); } }); G.addLog(st, `${G.clockStr(st.t)} · La cellula «${c.name}» si scioglie: ${why}.`, 'info'); const m = c.accepted && byId(st, c.contact); if (m) RS.inbox(st, m, `«${c.name}» non c'è più: ${why}.`, 'bad', true); }
  function cellHour(st) {
    Object.values(st.ris.cells).filter(c => c.alive).forEach(c => {
      c.members.slice().forEach(id => {
        const k = byId(st, id); if (!k || k.dead) { if (k) k.cell = null; c.members = c.members.filter(x => x !== id); return; }
        // uno della cellula in cella: sa solo dei suoi e del contatto
        if (k.jailedUntil > st.t && !k.cellJail) {
          k.cellJail = true;
          if (k.ris.ideo < .6 && rnd() < .4) {
            c.members.filter(x => x !== id).forEach(x => { const q = byId(st, x); if (free(st, q) && rnd() < .3) I.arrest(st, q, `della cellula «${c.name}»`); });
            if (c.accepted) { const m = byId(st, c.contact); st.ris.repr = clamp(st.ris.repr + 3, 0, 100); if (m) RS.inbox(st, m, `Hanno preso ${k.first} di «${c.name}». Ha parlato: i Grigi sanno della cellula, e forse di me.`, 'bad'); }
          } else if (c.accepted) { const m = byId(st, c.contact); if (m) RS.inbox(st, m, `Hanno preso ${k.first} di «${c.name}». Non parla.`, 'bad', true); }
        }
        if (!(k.jailedUntil > st.t)) k.cellJail = false;
      });
      if (c.members.length < 2) dissolve(st, c, 'sono rimasti in pochi');
      if (c.accepted) { const m = byId(st, c.contact); if (!m || m.dead || !m.ris.member) { const nm = risMembers(st).filter(x => free(st, x))[0]; c.contact = nm ? nm.id : null; if (!nm) c.accepted = false; else RS.inbox(st, nm, `Adesso il contatto di «${c.name}» sono io.`, 'info', true); } }
    });
  }

  // ---------------- SCHEDE PER LA CHAT ----------------
  // quello che il personaggio sa di sé e non dice apertamente
  function setSecret(st, n) {
    const C = RS.CARDS; if (!C) return; const c = C[n.id] || (C[n.id] = {}); if (c.__base === undefined) c.__base = c.secret || '';
    const s = [];
    if (n.fam && n.fam.rank === 'capo') s.push(`Comanda la Famiglia da una casa che nessuno conosce. Non dice mai il suo nome. Riceve solo i tre fidati, di notte. Ripulisce i soldi nella ${st.fam && st.fam.fronts && st.fam.fronts.lav ? st.fam.fronts.lav.label : 'lavanderia'} e nella sala giochi Flipper; con quelli paga i suoi uomini e i Grigi.`);
    else if (n.fam && n.fam.rank === 'fidato') s.push(`È uno dei tre fidati della Famiglia: l'unico tipo di uomo che vede il capo. Non lo tradirebbe mai. Non nomina mai il capo. Tatuaggi: ${n.fam.tattoos.join(', ')}.`);
    else if (n.fam && n.fam.rank === 'soldato') s.push(`È della Famiglia (${ROLE_LABEL[n.fam.role] || 'fa quello che gli dicono'}). Risponde a ${G.nameOf(st, n.fam.boss)}. Il capo non l'ha mai visto e non sa dove stia. Tatuaggi: ${n.fam.tattoos.join(', ')}.`);
    else if (n.fam && n.fam.rank === 'cacciato') s.push('Era della Famiglia, ma ha parlato coi Grigi: lo hanno cacciato e ha paura.');
    if (n.ris && n.ris.collabOf) s.push(`Dà una mano alla Risacca da fuori: conosce solo ${G.nameOf(st, n.ris.collabOf)}, e non lo dice a nessuno.`);
    if (n.cell && st.ris && st.ris.cells[n.cell]) { const c = st.ris.cells[n.cell]; s.push(`Fa parte di una cellula autonoma, «${c.name}», con ${c.members.filter(x => x !== n.id).map(x => G.nameOf(st, x)).join(', ')}. Agiscono da soli${c.accepted ? `; il contatto con la Risacca è ${G.nameOf(st, c.contact)}` : ''}.`); }
    c.secret = [c.__base].concat(s).filter(Boolean).join(' ');
  }

  // ---------------- RIEPILOGO (pannello, chat, prove) ----------------
  const sum0 = RS.summary;
  RS.summary = st => {
    const S = sum0(st); if (!S) return S;
    S.max = CFG.risMax; S.collabPer = CFG.collabPer;
    S.members.forEach(m => { const n = byId(st, m.id); m.collabs = n ? collabsOf(st, n).map(k => ({ id: k.id, first: k.first, role: k.role, jailed: k.jailedUntil > st.t })) : []; });
    S.cells = Object.values(st.ris.cells || {}).filter(c => c.alive).map(c => ({ id: c.id, name: c.name, n: c.members.length, accepted: c.accepted, contact: c.contact ? G.nameOf(st, c.contact) : null, acts: c.acts, last: c.log.length ? c.log[c.log.length - 1].what : null }));
    S.collabCands = st.npcs.filter(k => freeForCell(st, k) && k.ris.ideo > .5 && !k.cell).sort((a, c) => c.ris.ideo - a.ris.ideo).slice(0, 8).map(k => ({ id: k.id, first: k.first, role: k.role }));
    return S;
  };
  function report(st) {
    const F = st.fam, R = st.ris, ms = men(st);
    return {
      famiglia: { uomini: famCount(st), tetto: CFG.famMax, fidati: F.fidati.map(id => G.nameOf(st, id)), ruoli: ms.reduce((o, n) => { if (n.fam.rank !== 'capo') o[n.fam.role] = (o[n.fam.role] || 0) + 1; return o; }, {}), inCella: ms.filter(n => n.jailedUntil > st.t).length, cassa: Math.round(F.cash), visiteAlCapo: F.visits || 0, base: F.hq ? F.hq.label : '?', inAttesa: Object.keys(F.pending).length, stats: F.stats,
        soldi: { sporchiInGiro: Math.round(F.cash), sporchiDalCapo: Math.round(F.dirty), puliti: Math.round(F.clean), tesoro: Math.round(F.treasure), sospetto: Math.round(F.heat * 100) / 100, coperture: F.fronts ? [F.fronts.lav && F.fronts.lav.label, F.fronts.sala && F.fronts.sala.label] : null, grigiComprati: Object.entries(F.bribes).filter(([, u]) => u > st.t).map(([id]) => G.nameOf(st, id)) } },
      risacca: { membri: risMembers(st).length, tetto: CFG.risMax, collaboratori: Object.keys(R.collab).length, cellule: Object.values(R.cells).filter(c => c.alive).map(c => `${c.name} (${c.members.length}${c.accepted ? ', accolta' : ''}, ${c.acts} azioni)`), morale: Math.round(R.morale), repr: Math.round(R.repr) },
    };
  }

  // ---------------- AGGANCI ----------------
  function hookCreate(st) {
    famCreate(st);
    const R = st.ris; if (R) { R.collab = R.collab || {}; R.cells = R.cells || {}; R.cellN = R.cellN || 0; }
    st.fazHour = Math.floor(st.t / 60); st.fazTick = 0;
  }
  function hookStep(st, dt) {
    if (!st.fam) return;
    st.fazTick -= dt; if (st.fazTick <= 0) { st.fazTick = .5; famBlocks(st); if (st.ris) collabStep(st); }
    const hm = Math.floor(st.t / 60);
    while (st.fazHour < hm) {
      st.fazHour++; const hr = st.fazHour % 24;
      if (st.ris) { collabHour(st, hr); cellHour(st); }
      washHour(st, hr); bribeHour(st);
      if (hr === 1 && PO.weekday(st.t) === 5) payday(st);   // la notte tra venerdì e sabato
      if (hr === 22 && st.ris) cellNight(st);       // la sera prima: chi della cellula fa cosa domani notte
      if (hr === 23) famNight(st);                   // i fidati decidono chi portare dal capo (e domani notte ci vanno)
      if (hr === 3 && st.ris) collabNight(st);
    }
  }
  function install() {
    const H = G.HOOKS; if (H.__fazioni) return; H.__fazioni = true;
    const c0 = H.create, t0 = H.think, m0 = H.move, s0 = H.step;
    H.create = st => { if (c0) c0(st); hookCreate(st); };
    // il capo non esce mai dalla sua casa
    H.think = (st, n) => { if (n.capo) { n.inside = true; n.action = { name: 'dentro', scores: [], why: 'Non esce mai.', since: n.action.since }; return true; } return t0 ? t0(st, n) : false; };
    H.move = (st, n, dt, a) => { if (n.capo) { n.speedNow = 0; return true; } return m0 ? m0(st, n, dt, a) : false; };
    H.step = (st, dt) => { if (s0) s0(st, dt); hookStep(st, dt); };
  }
  install();
  return { CFG, TAT, WASH, PAY, FRONTS, report, men, famCount, collabsOf, askCollab, addCollab, setSecret, enlist, _: { famNight, cellNight, collabNight, payday, inspect } };
})();
if (typeof module !== 'undefined') module.exports = Fazioni;
