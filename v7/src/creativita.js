/* Porto Vecchio — La Creatività: inventarsi le cose (solo logica, nessuna grafica).
   Gli abitanti non fanno solo quello che è in catalogo: si inventano qualcosa di loro, a partire da quello che hanno
   vissuto (la memoria lunga, il diario), da quello che amano (gli interessi) e da quello che manca.
   - OPERE: chi ama la musica va a cantare in piazza una canzone sua (le strofe vengono dai suoi ricordi: il fratello
     portato via, il mare d'inverno, il Garante); chi ama l'arte dipinge un murale; chi ama i libri recita una poesia
     all'osteria; chi ama la cucina prepara un piatto e lo porta a un amico; chi fotografa regala le foto. Chi passa si
     ferma, ascolta, guarda, lascia due spiccioli, e se lo ricorda: l'opera fa parlare.
   - IMPROVVISARE: quando la via normale è chiusa (in bottega è finito, non ci sono soldi) si trova un'altra strada:
     la legna secca in pineta, un pesce al molo, le erbe in campagna, un lavoretto alla calata, suonare per due lire.
   - SOPRANNOMI: la gente si dà dei nomignoli (dal mestiere, dal carattere, da un fatto) e li usa parlando.
   Tutto succede nel gioco: ci si va a piedi (Popolo._.errand), lo si fa sul posto, la gente intorno reagisce.
   Si aggancia a Game.HOOKS dopo popolo.js, scambi.js e commissioni.js. */
var Creativita = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Sc = typeof Scambi !== 'undefined' ? Scambi : require('./scambi.js');
  const Og = typeof Oggetti !== 'undefined' ? Oggetti : null;
  const I = Po._, PLACES = G.PLACES;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const S = st => st.crea || (st.crea = { tick: 0, opere: [], nick: {}, stats: { canzoni: 0, murales: 0, poesie: 0, piatti: 0, foto: 0, improvvisi: 0, soprannomi: 0, pubblico: 0 } });
  const free = (st, n) => n && !n.dead && n.pop && n.pop.ints && !(n.jailedUntil > st.t) && !I.isPassive(st, n) && !n.pop.errand && !n.pop.emer && !n.pop.with && !n.cop && !n.faction;
  const leisure = n => { const b = n.pop.cur; return b && !b.fixed && !['lavoro', 'sonno', 'impresa', 'appuntamento', 'giro'].includes(b.act); };
  const say = (st, n, t, d) => { if (n.pop.near && !n.inside && dist(n.x, n.y, st.player.x, st.player.y) < 32) { G.say(st, n, t, d || 3.2); n.barkCd = st.clock + 5; } };

  // ---------------- LA MATERIA: da cosa nasce un'opera ----------------
  // i temi vengono da quello che ha vissuto davvero; se non ha niente di forte, dall'isola d'inverno
  function themes(st, n) {
    const P = n.pop, out = [];
    (P.lunga || []).concat(P.diary || []).filter(e => e.w > .4 && e.kind !== 'pensiero').sort((a, b) => b.w - a.w).slice(0, 5).forEach(e => {
      const who = e.who && e.who !== 'player' ? G.nameOf(st, e.who) : null;
      if (/arresto|fermato/.test(e.tag || '')) out.push({ k: 'perso', who: who || 'chi hanno portato via' });
      else if (/furto|bidone|tradimento|infamia/.test(e.tag || '')) out.push({ k: 'torto', who: who || 'chi mi ha tradito' });
      else if (/amico|favore|insieme|aiuto/.test(e.tag || '')) out.push({ k: 'amico', who: who || 'un amico' });
      else if (/lutto|morte/.test(e.tag || '')) out.push({ k: 'lutto', who: who || 'chi non c\'è più' });
    });
    if (n.ris && n.ris.ideo > .6) out.push({ k: 'regime' });
    out.push({ k: pick(['mare', 'inverno', 'porto', 'amore', 'isola']) });
    return out;
  }
  const VERSI = {
    perso: w => [`Ridatemi ${w}, la Rocca non è casa sua`, `Ti aspetto alla finestra, ${w}, ogni sera alle otto`, `Hanno preso ${w} col buio e la pioggia`],
    torto: w => [`${w} mi ha venduto per due lire`, `Non mi scordo, ${w}, non mi scordo`, `Il porto sa chi è stato`],
    amico: w => [`Con ${w} si divide il pane e il freddo`, `${w}, la mano che c'era quando serviva`],
    lutto: w => [`Una candela per ${w}, giù a San Rocco`, `Il mare si è preso ${w} e non lo rende`],
    regime: () => ['Il Garante parla e il pane manca', 'Sotto la Rocca nessuno canta', 'Grigi alle porte, ma la Risacca sale'],
    mare: () => ['Il mare d\'inverno è color ferro', 'Le barche dormono, i pescatori no', 'Sale sulle labbra e sulle mani'],
    inverno: () => ['Gela sui vetri e nel cuore', 'Un fuoco di legna e una voce che canta', 'L\'inverno qui non finisce mai'],
    porto: () => ['Le gru come croci sopra il porto', 'Casse che arrivano e nessuno sa cosa c\'è dentro'],
    amore: () => ['Ti ho vista alla fontana e il freddo è passato', 'Una sera alla Luna, poi più niente'],
    isola: () => ['Quest\'isola è piccola ma il cielo è grande', 'Si parte sempre e non si parte mai'],
  };
  const TITOLO = { perso: w => `Ridatemi ${w}`, torto: w => `La canzone di ${w}`, amico: w => `Per ${w}`, lutto: w => `Una candela per ${w}`, regime: () => 'Sotto la Rocca', mare: () => 'Mare color ferro', inverno: () => 'Inverno a Porto Vecchio', porto: () => 'Le gru', amore: () => 'Alla fontana', isola: () => 'Isola' };
  function compose(st, n) {
    const T = themes(st, n), th = T[0], th2 = T[1] || T[0];
    const v = VERSI[th.k](th.who), v2 = VERSI[th2.k](th2.who);
    return { title: TITOLO[th.k](th.who), lines: [pick(v), pick(v2.filter(x => x !== v[0]).concat(v)), pick(v)], theme: th.k, who: th.who };
  }

  // ---------------- LE OPERE ----------------
  function audience(st, n, t, secs) {
    // chi è lì e non ha da fare si ferma, si gira a guardare, ascolta
    const here = st.npcs.filter(k => k !== n && k.pop && !k.inside && !k.dead && !k.pop.emer && !k.pop.errand && dist(k.x, k.y, n.x, n.y) < 12 && k.pop.cur && !k.pop.cur.fixed);
    here.forEach(k => { k.wait = Math.max(k.wait || 0, secs); k.face = Math.atan2(n.y - k.y, n.x - k.x); if (k.pop.spot) k.pop.spot.face = k.face; });
    return here;
  }
  function opera(st, n) {
    const P = n.pop, W = P.intW || {}, X = S(st).stats;
    const want = k => (W[k] || 0) + ((P.want || {})[k] || 0) * .8;
    const options = [['musica', want('musica')], ['arte', want('arte')], ['lettura', want('lettura')], ['cucina', want('cucina')], ['foto', want('foto') * ((P.owns || {}).fotocamera ? 1 : 0)]].filter(([, v]) => v > .55).sort((a, b) => b[1] - a[1]);
    if (!options.length || st.t - (P.lastOpera || -1e9) < 2 * 1440) return false;   // un'opera ogni tanto, non tutti i giorni
    P.lastOpera = st.t;
    const k = options[0][0], c = compose(st, n);
    if (k === 'musica') {
      const t = I.target(pick(['piazza', 'lungomare', 'molo'].filter(x => PLACES[x]))); if (!t) return false;
      return I.errand(st, n, { kind: 'canta', tgt: t, act: 'commissione', label: `canta in piazza «${c.title}»`, secs: 26, mins: 45, data: c });
    }
    if (k === 'arte') {
      // un muro in un posto qualsiasi dell'isola (meglio vicino a casa sua), non sempre lo stesso
      const pids = Object.keys(PLACES).filter(id => PLACES[id] && !/rocca|caserma|commissariato|ministero|garante|governo/.test(id)).sort((a, b) => Math.hypot(PLACES[a].x - P.homeT.x, PLACES[a].y - P.homeT.y) - Math.hypot(PLACES[b].x - P.homeT.x, PLACES[b].y - P.homeT.y)).slice(0, 12);
      let t = null, ws = null; for (const id of pids.sort(() => rnd() - .5)) { const t0 = I.target(id); if (!t0 || t0.k !== 'p') continue; const w0 = I.wallSpot(st, t0); if (w0) { t = t0; ws = w0; break; } }
      if (!t) return false;
      return I.errand(st, n, { kind: 'murale', tgt: t, act: 'commissione', label: `dipinge un murale: «${c.title}»`, secs: 30, mins: 90, data: c, spot: ws });
    }
    if (k === 'lettura') {
      const t = I.target(pick(['osteria', 'bar', 'sirena'].filter(x => PLACES[x]))); if (!t) return false;
      return I.errand(st, n, { kind: 'poesia', tgt: t, act: 'commissione', label: `recita una poesia sua: «${c.title}»`, secs: 16, mins: 30, data: c });
    }
    if (k === 'cucina') {
      const fr = (P.friends || []).map(id => G.byId(st, id)).find(x => x && x.pop && x.pop.homeT && !x.dead); if (!fr) return false;
      const food = Sc.surplus(n).find(id => Og && Og.CAT[id] && (Og.CAT[id].cat === 'cibo' || Og.CAT[id].cat === 'dispensa')) || Object.keys(P.casa || {}).find(id => Og && Og.CAT[id] && Og.CAT[id].cat === 'cibo');
      if (!food) return false;
      return I.errand(st, n, { kind: 'piatto', tgt: fr.pop.homeT, act: 'commissione', label: `porta a ${fr.first} un piatto fatto da lui`, secs: 8, mins: 20, data: { to: fr.id, food } });
    }
    if (k === 'foto') {
      const t = I.target(pick(['lungomare', 'molo', 'piazza', 'santuario'].filter(x => PLACES[x]))); if (!t) return false;
      return I.errand(st, n, { kind: 'foto', tgt: t, act: 'commissione', label: 'scatta foto', secs: 14, mins: 30, data: c });
    }
    return false;
  }
  I.ERRAND.canta = (st, n, E) => {
    const c = E.data, X = S(st).stats; X.canzoni++;
    const aud = audience(st, n, E.tgt, 4); X.pubblico += aud.length;
    let coins = 0; aud.forEach(k => { if (k.pop.money > 3 && rnd() < .4 + (1 - (k.tr ? k.tr.avid : .5)) * .3) { k.pop.money -= 1; coins += 1; }
      I.note(st, k, `ha sentito ${n.first} cantare «${c.title}»${c.who ? ` (parla di ${c.who})` : ''}`, 'good', { w: c.theme === 'regime' || c.theme === 'perso' ? .45 : .25, who: n.id, tag: 'opera' });
      if (c.theme === 'regime' && k.ris) k.ris.ideo = clamp(k.ris.ideo + .02, 0, 1);
      if (k.pop.need) k.pop.need.svago = Math.max(0, k.pop.need.svago - .25); });
    n.pop.money += coins; if (n.pop.want) n.pop.want.musica = 0; if (n.pop.need) n.pop.need.svago = 0;
    if (aud.length && rnd() < .5) say(st, pick(aud), pick(['Bravo!', 'Ancora!', 'Questa la conosco…', 'Mi ha fatto venire i brividi.']), 2.5);
    S(st).opere.push({ t: st.t, by: n.id, kind: 'canzone', title: c.title, place: E.tgt.label }); if (S(st).opere.length > 40) S(st).opere.shift();
    I.note(st, n, `ha cantato in ${E.tgt.label} una canzone sua, «${c.title}»${aud.length ? `: si sono fermati in ${aud.length}` : ''}${coins ? ` e gli hanno lasciato ${coins}.000 lire` : ''}`, 'good', { w: .5, tag: 'opera' });
    if (c.theme === 'regime' && st.ris) { st.ris.morale = clamp(st.ris.morale + .5, 0, 100); const cop = st.npcs.find(k => k.cop && !k.dead && !k.inside && dist(k.x, k.y, n.x, n.y) < 20); if (cop && rnd() < .4) { G.say(st, cop, 'Questa canzone non si canta.', 2.5); I.arrestFar(st, n, 'canzoni sovversive'); } }
  };
  const setTimeout0 = f => { try { f(); } catch (e) { } };
  I.ERRAND.murale = (st, n, E) => {
    const c = E.data; S(st).stats.murales++;
    I.paintWall(st, n, { tgt: E.tgt }, { kind: 'arte', text: `${c.title.toLowerCase()}: ${c.lines[0].toLowerCase()}`, style: 'murale a colori' });
    audience(st, n, E.tgt, 6).forEach(k => I.note(st, k, `ha visto ${n.first} dipingere un murale a ${E.tgt.label}`, 'good', { w: .3, who: n.id, tag: 'opera' }));
    S(st).opere.push({ t: st.t, by: n.id, kind: 'murale', title: c.title, place: E.tgt.label });
  };
  I.ERRAND.poesia = (st, n, E) => {
    const c = E.data, X = S(st).stats; X.poesie++;
    const here = st.npcs.filter(k => k !== n && k.pop && k.pop.at && I.tkey(k.pop.at) === I.tkey(E.tgt) && !k.dead);
    here.forEach(k => I.note(st, k, `${n.first} ha recitato una poesia sua all'${E.tgt.label}: «${c.lines[0]}»`, 'good', { w: .3, who: n.id, tag: 'opera' }));
    S(st).opere.push({ t: st.t, by: n.id, kind: 'poesia', title: c.title, place: E.tgt.label });
    I.note(st, n, `ha letto «${c.title}» all'${E.tgt.label}${here.length ? ` davanti a ${here.length}` : ''}`, 'good', { w: .45, tag: 'opera' });
    if (n.pop.want) n.pop.want.lettura = 0;
  };
  I.ERRAND.piatto = (st, n, E) => {
    const fr = G.byId(st, E.data.to); if (!fr || !fr.pop) return; S(st).stats.piatti++;
    if (Sc.take(n, E.data.food, 1)) Sc.put(fr, E.data.food, 1);
    I.note(st, fr, `${n.first} gli ha portato un piatto cucinato da lui`, 'good', { w: .4, who: n.id, tag: 'amico' }); I.note(st, n, `ha portato a ${fr.first} un piatto fatto in casa`, 'good', { w: .3, who: fr.id, tag: 'amico' });
    try { Azioni.moveRel(st, fr, n, .06, 0); } catch (e) { }
    if (n.pop.want) n.pop.want.cucina = 0;
  };
  I.ERRAND.foto = (st, n, E) => {
    S(st).stats.foto++; const k = st.npcs.find(x => x !== n && x.pop && !x.inside && dist(x.x, x.y, n.x, n.y) < 10);
    I.note(st, n, `ha fotografato ${k ? k.first : E.tgt.label}`, 'good', { w: .25, tag: 'opera' }); if (k) I.note(st, k, `${n.first} gli ha fatto una foto`, 'info', { w: .2, who: n.id });
    if (n.pop.want) n.pop.want.foto = 0;
  };

  // ---------------- IMPROVVISARE ----------------
  function improvise(st, n) {
    const P = n.pop, W = Sc.wants(st, n).filter(w => w.urg > .45); if (!W.length) return false;
    const blocked = (P.diary || []).some(e => e.tag === 'scarsita' && st.t - e.t < 600) || P.money < 4;
    if (!blocked) return false;
    const w = W[0];
    if (w.ids.includes('legna') && PLACES.pineta) return I.errand(st, n, { kind: 'raccatta', tgt: I.target('pineta'), act: 'commissione', label: 'va a raccogliere legna secca in pineta', secs: 18, mins: 60, data: { id: 'legna', q: 1 + Math.floor(rnd() * 2) } });
    if (w.ids.some(id => Og && Og.CAT[id] && (Og.CAT[id].cat === 'cibo' || Og.CAT[id].cat === 'dispensa')) && PLACES.molo) return I.errand(st, n, { kind: 'raccatta', tgt: I.target('molo'), act: 'commissione', obj: 'canna', label: Sc.has(n, 'canna') ? 'va a pescare qualcosa per cena' : 'va al molo a vedere se rimedia un pesce', secs: 22, mins: 90, data: { id: rnd() < .6 ? 'sarde' : 'pesce', q: Sc.has(n, 'canna') ? 2 : (rnd() < .4 ? 1 : 0) } });
    if (P.money < 4 && PLACES.calata) return I.errand(st, n, { kind: 'lavoretto', tgt: I.target('calata'), act: 'commissione', label: 'cerca un lavoretto alla calata', secs: 20, mins: 120, data: {} });
    return false;
  }
  I.ERRAND.raccatta = (st, n, E) => {
    S(st).stats.improvvisi++;
    if (E.data.q > 0) { Sc.put(n, E.data.id, E.data.q); I.note(st, n, `si è arrangiato: ${E.data.q} ${Og && Og.CAT[E.data.id] ? Og.CAT[E.data.id].nome : E.data.id}`, 'good', { w: .3, tag: 'arrangiarsi' }); say(st, n, pick(['Ci si arrangia.', 'Meglio di niente.'])); }
    else { I.note(st, n, 'ha provato ad arrangiarsi, ma niente', 'bad', { w: .2, tag: 'arrangiarsi' }); say(st, n, 'Niente, neanche oggi.'); }
  };
  I.ERRAND.lavoretto = (st, n, E) => {
    S(st).stats.improvvisi++; const ok = rnd() < .55;
    if (ok) { const pay = 4 + Math.floor(rnd() * 6); n.pop.money += pay; I.note(st, n, `ha scaricato casse alla calata per ${pay}.000 lire`, 'good', { w: .3, tag: 'arrangiarsi' }); n.hand = 'cassa'; setTimeout0(() => { }); }
    else I.note(st, n, 'alla calata oggi non c\'era niente da fare', 'bad', { w: .2, tag: 'arrangiarsi' });
  };

  // ---------------- SOPRANNOMI ----------------
  function nickFor(st, n) {
    const P = n.pop, job = ((P.job && (P.job.base || P.job.title)) || '').toLowerCase(), t = n.tr || {};
    const byJob = [[/pescator/, 'il Pesce'], [/fornai/, 'Farina'], [/barist/, 'Caffè'], [/meccanic/, 'Bullone'], [/murator|manoval/, 'Calce'], [/sart/, 'Ago'], [/macellai/, 'Coltello'], [/minator|cavator/, 'Polvere'], [/maestr/, 'la Maestrina'], [/infermier|medic/, 'Cerotto']];
    const j = byJob.find(([re]) => re.test(job)); if (j && rnd() < .5) return j[1];
    if (t.loq > .8) return pick(['Radio', 'la Gazzetta', 'Chiacchiera']); if (t.loq < .25) return pick(['il Muto', 'Silenzio', 'la Tomba']);
    if (t.cor > .85) return pick(['Ferro', 'il Toro', 'Leone']); if (t.avid > .8) return pick(['Spicciolo', 'Salvadanaio', 'Tirchio']);
    if (P.age > 68) return pick(['Nonno', 'il Vecchio', 'Barbagrigia']); if (P.vice === 'vino') return pick(['Fiasco', 'Bicchiere']);
    return null;
  }
  function nicknames(st) {
    const M = S(st); st.npcs.forEach(n => { if (!n.pop || !n.pop.ints || n.dead || M.nick[n.id] !== undefined || rnd() > .02) return; const k = nickFor(st, n); M.nick[n.id] = k || null; if (k) { M.stats.soprannomi++; n.pop.nick = k; I.note(st, n, `in giro lo chiamano «${k}»`, 'info', { w: .2 }); } });
  }
  // per strada: un amico chiamato col suo soprannome, o una canzone che si è sentita
  I.TALK.push((st, n) => {
    const M = S(st), r = rnd();
    if (r < .2) { const fr = (n.pop.friends || []).map(id => G.byId(st, id)).find(k => k && k.pop && k.pop.nick); if (fr) return pick([`Hai visto ${fr.pop.nick}? Lo cercavo.`, `${fr.pop.nick} stasera offre lui, ha detto.`]); }
    if (r < .4) { const seen = n.__opT = n.__opT || {}; const o = M.opere.filter(x => st.t - x.t < 1440 && x.by !== n.id && !seen[x.t + x.by] && ((n.pop.diary || []).some(e => e.tag === 'opera' && e.who === x.by) || rnd() < .15)).slice(-1)[0]; if (o) seen[o.t + o.by] = 1; if (o) return o.kind === 'canzone' ? `Hai sentito «${o.title}»? La canta ${G.nameOf(st, o.by)}.` : o.kind === 'murale' ? `A ${o.place} c'è un murale nuovo, l'ha fatto ${G.nameOf(st, o.by)}.` : `${G.nameOf(st, o.by)} ha letto una poesia all'osteria. Mica male.`; }
    return null;
  });

  // ---------------- IL GIRO ----------------
  // mentre canta o recita: una strofa ogni pochi secondi, e chi passa si ferma
  function performing(st) {
    st.npcs.forEach(n => { const E = n.pop && n.pop.errand; if (!E || !E.arrived || (E.kind !== 'canta' && E.kind !== 'poesia') || n.inside) return;
      if (st.clock < (n.__verse || 0)) return; n.__verse = st.clock + 4.2; const L = E.data.lines, i = (E.__i = (E.__i || 0) + 1) - 1;
      G.say(st, n, E.kind === 'canta' ? `♪ ${L[i % L.length]} ♪` : `«${L[i % L.length]}…»`, 3.8); n.barkCd = st.clock + 4; audience(st, n, E.tgt, 6); });
  }
  function tick(st) {
    performing(st);
    const M = S(st); if (st.clock < M.tick) return; M.tick = st.clock + 2;
    for (const n of st.npcs) {
      if (rnd() > .015 || !free(st, n) || !leisure(n)) continue;
      if (improvise(st, n)) continue;
      if (rnd() < .5) opera(st, n);
    }
  }
  const s0 = G.HOOKS.step;
  G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); if (!st.pop) return; tick(st); if (st.clock > (S(st).nk || 0)) { S(st).nk = st.clock + 20; nicknames(st); } };
  function report(st) { return Object.assign({}, S(st).stats); }
  return { report, compose, opere: st => S(st).opere };
})();
if (typeof module !== 'undefined') module.exports = Creativita;
