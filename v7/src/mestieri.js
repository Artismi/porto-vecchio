/* Porto Vecchio — I Mestieri: quello che ognuno può fare grazie al suo lavoro, e la stessa libertà per tutti.
   Ogni mestiere apre azioni che gli altri non hanno: chi ci lavora ha le chiavi, conosce il posto e la gente.
   Le stesse azioni le fanno:
   - gli abitanti, da soli, quando servono ai loro scopi (la Risacca, la Famiglia, la Tutela, i soldi, un amico);
   - i membri della Risacca, se glielo chiedi (verbo «mestiere», in chat o dal pannello);
   - il protagonista, quando lavora lì (menu QUI, ADESSO).
   Il rischio è uguale per tutti: dipende dall'ora e da chi c'è. Chi viene visto finisce nella memoria di chi l'ha visto.
   In più: vino, sigarette, prestiti tra amici, roba nascosta, offrire un giro, licenziarsi anche per gli abitanti. */
var Mestieri = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const PO = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const AZ = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : null;
  const FZ = typeof Fazioni !== 'undefined' ? Fazioni : null;
  const I = PO._, PLACES = G.PLACES, TS = G.TS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const alive = n => n && !n.dead;
  const free = (st, n) => alive(n) && !(n.jailedUntil > st.t);
  const isP = a => a === 'player';
  const nm = (st, a) => isP(a) ? G.PLAYER_NAME : a.first;
  const o = n => isP(n) ? 'o' : I.o(n);
  if (RS && RS.RES && !RS.RES.divisa) RS.RES.divisa = { name: 'divise dei Grigi', one: 'divisa dei Grigi', cat: 'Documenti', syn: ['divisa', 'divise', 'uniforme', 'travestimento'] };

  // ---------------- CHI STA CON CHI ----------------
  // da che parte sta chi agisce: la Risacca (membro, collaboratore, cellula, simpatizzante), la Famiglia, la Tutela, o solo per sé
  function sideOf(st, a) {
    if (isP(a)) return 'ris';
    if (a.ris && (a.ris.member || a.ris.collabOf)) return 'ris';
    if (a.cell) return 'ris';
    if (a.fam && a.fam.rank !== 'cacciato') return 'fam';
    if (a.cop) return 'tut';
    if (a.ris && a.ris.ideo > .62) return 'ris';
    if (a.ris && a.ris.ideo < .2 && a.tr.legge > .7) return 'tut';
    return 'self';
  }
  // dove arriva quello che si procura per la Risacca: nella cassa comune, e lo dice chi la tiene
  function toRis(st, a, res, q, text) {
    if (!st.ris) return;
    st.ris.inv[res] = (st.ris.inv[res] || 0) + q;
    const m = isP(a) ? null : a.ris && a.ris.member ? a : a.ris && a.ris.collabOf ? G.byId(st, a.ris.collabOf) : a.cell && st.ris.cells[a.cell] && st.ris.cells[a.cell].contact ? G.byId(st, st.ris.cells[a.cell].contact) : null;
    if (m && RS) RS.inbox(st, m, text || `${nm(st, a)} ci ha procurato ${q} ${(RS.RES[res] || { name: res }).name}.`, 'good', true);
    else if (!isP(a)) G.addLog(st, `${G.clockStr(st.t)} · Qualcuno ha lasciato ${q} ${(RS && RS.RES[res] || { name: res }).name} per la Risacca.`, 'good');
  }
  const money = (st, a, q) => { if (isP(a)) st.player.money += q; else if (a.pop) a.pop.money += q; };
  const giveItem = (st, a, k, q) => { if (isP(a)) { const p = st.player; p.inv = p.inv || {}; p.inv[k] = (p.inv[k] || 0) + (q || 1); } else if (a.pop) AZ.give(a, k, q || 1); };
  const say = (st, a, text, kind) => { if (isP(a)) G.feed(st, text, kind || 'info'); else if (a.pop) I.note(st, a, text, kind === 'bad' ? 'bad' : 'shady', { w: .45, tag: 'mestiere' }); };
  const morale = (st, q) => { if (st.ris) st.ris.morale = clamp(st.ris.morale + q, 0, 100); };
  const repr = (st, q) => { if (st.ris) st.ris.repr = clamp(st.ris.repr + q, 0, 100); };
  const risOf = st => st.ris ? RS.members(st) : [];
  const famCash = (st, q) => { if (st.fam) st.fam.cash += q; };
  // qualcuno della Risacca o vicino a lei, conosciuto da chi agisce: per chi fa la spia
  function suspect(st, a) {
    const pool = st.npcs.filter(k => free(st, k) && k !== a && !k.cop && (k.ris && (k.ris.member || k.ris.collabOf) || k.cell || (k.ris && k.ris.ideo > .7)));
    const known = a.pop ? pool.filter(k => a.pop.diary.some(e => e.who === k.id) || (a.pop.friends || []).includes(k.id)) : [];
    return pick(known.length ? known : pool.filter(k => rnd() < .3).concat(pool.slice(0, 1)));
  }

  // ---------------- LE AZIONI ----------------
  // side: per chi si fa (ris = Risacca, fam = Famiglia, tut = Tutela, self = per sé, aiuto = per qualcuno che ha bisogno)
  // night: si fa fuori orario, con le chiavi; risk: probabilità base di essere visti; mins: quanto ci vuole; ev: che cosa resta nella memoria di chi vede
  const AB = {
    // carta e stampa
    stampa: { label: 'Stampare volantini di notte', side: ['ris'], night: true, risk: .12, mins: 120, ev: 'volantino', run: (st, a) => { toRis(st, a, 'volantini', 20, `${nm(st, a)} ha stampato 20 volantini in tipografia, a luci spente.`); return 'Venti volantini, ancora caldi.'; } },
    tessere: { label: 'Falsificare tessere e lasciapassare', side: ['ris', 'self'], night: true, risk: .18, mins: 90, ev: 'scasso', run: (st, a, s) => { if (s === 'self') { money(st, a, 25); return 'Due tessere annonarie false, vendute sottobanco.'; } toRis(st, a, 'documenti', 2); return 'Due lasciapassare che sembrano veri.'; } },
    timbri: { label: 'Far sparire una pratica', side: ['ris'], night: false, risk: .15, mins: 30, ev: 'scasso', run: (st, a) => { const R = st.ris; const j = risOf(st).find(m => m.jailedUntil > st.t); if (j) { j.jailedUntil = Math.min(j.jailedUntil, st.t + 30); return `La pratica di ${j.first} è finita sotto una pila: domani è fuori.`; } repr(st, -5); return 'Un fascicolo in meno sulla Risacca. Nessuno se ne accorgerà.'; } },
    // ufficio della Tutela
    fascicoli: { label: 'Leggere i fascicoli della Tutela', side: ['ris'], night: false, risk: .2, mins: 45, ev: 'scasso', run: (st, a) => { const R = st.ris; if (R && R.raid) { R.raid.at += 120; return `Nei fascicoli c'è la perquisizione a ${R.raid.name}. Abbiamo due ore in più.`; } if (R && R.mole) { const k = G.nameOf(st, R.mole); return `Nei fascicoli c'è un nome che passa informazioni: ${k}.`; } repr(st, -3); return 'Niente di urgente. Ma ora sappiamo dove guardano.'; } },
    segnala: { label: 'Segnalare un sospetto alla Tutela', side: ['tut'], night: false, risk: .02, mins: 20, ev: null, run: (st, a) => { const k = suspect(st, a); if (!k) return 'Nessuno da segnalare.'; repr(st, 4); if (rnd() < .5) I.arrest(st, k, 'segnalato da un collega'); if (k.pop) I.note(st, k, 'qualcuno in ufficio ha fatto il suo nome', 'bad', { w: .5, tag: 'fermato' }); return `Ha fatto il nome di ${k.first}.`; } },
    // sanità
    cura: { label: 'Curare un ferito senza registrarlo', side: ['ris', 'aiuto'], night: false, risk: .06, mins: 40, ev: null, run: (st, a) => { const p = st.player, hurt = [].concat(p.hp < 70 && (isP(a) || dist(p.x, p.y, a.x || 0, a.y || 0) < 20) ? ['player'] : [], st.npcs.filter(k => free(st, k) && k.hp < k.maxHp * .7 && (risOf(st).includes(k) || (a.pop && (a.pop.friends || []).includes(k.id))))); const t = hurt[0]; if (!t) return 'Oggi non c\'è nessuno da ricucire.'; if (t === 'player') p.hp = 100; else t.hp = t.maxHp; return `${t === 'player' ? G.PLAYER_NAME : t.first} è stato ricucito. Sul registro non c'è.`; } },
    medicine: { label: 'Mettere da parte medicine', side: ['ris', 'self'], night: false, risk: .1, mins: 20, ev: 'furto_mat', run: (st, a, s) => { if (s === 'self') { money(st, a, 12); return 'Due scatole vendute a chi ne ha bisogno, a caro prezzo.'; } toRis(st, a, 'medicine', 2); return 'Due scatole di medicine finiscono nella borsa.'; } },
    roba: { label: 'Vendere la roba della farmacia sottobanco', side: ['fam', 'self'], night: true, risk: .12, mins: 30, ev: 'furto_mat', run: (st, a, s) => { if (s === 'fam') { famCash(st, 20); return 'La roba è passata alla Famiglia.'; } money(st, a, 15); return 'Quindicimila lire e un cliente che tornerà.'; } },
    // motori
    sabota_mezzo: { label: 'Truccare un mezzo della Guardia', side: ['ris'], night: false, risk: .15, mins: 60, ev: 'sabotaggio', run: (st, a) => { const v = st.vehicles.filter(v => (v.police || (G.VK[v.kind] && G.VK[v.kind].military)) && !v.wreck)[0]; if (v) { v.hp = Math.min(v.hp, (G.VK[v.kind] ? G.VK[v.kind].hp : 100) * .25); v.sabotaged = true; } morale(st, 2); return v ? 'Un tubo allentato, un bullone di meno. Alla prossima corsa si ferma.' : 'Oggi in officina non c\'erano mezzi della Guardia.'; } },
    ripara: { label: 'Riparare un mezzo', side: ['aiuto', 'self', 'ris'], night: false, risk: 0, mins: 60, ev: null, run: (st, a) => { const p = st.player, v = st.vehicles.filter(v => !v.wreck && v.hp < (G.VK[v.kind] ? G.VK[v.kind].hp : 100) && (v.mine || v.stolen || dist(v.x, v.y, isP(a) ? p.x : a.x, isP(a) ? p.y : a.y) < 12)).sort((x, y) => x.hp - y.hp)[0]; if (!v) { money(st, a, 8); return 'Una Vespa da sistemare, ottomila lire.'; } v.hp = G.VK[v.kind] ? G.VK[v.kind].hp : 100; return `Il mezzo è come nuovo.`; } },
    benzina: { label: 'Benzina senza tessera', side: ['ris', 'fam', 'self'], night: false, risk: .08, mins: 15, ev: 'furto_mat', run: (st, a, s) => { if (s === 'ris') { toRis(st, a, 'benzina', 2); return 'Due taniche, segnate come evaporate.'; } if (s === 'fam') { famCash(st, 10); return 'Benzina al nero per la Famiglia.'; } money(st, a, 8); giveItem(st, a, 'benzina', 1); return 'Una tanica per sé, una venduta.'; } },
    // bancone e servizio: si sente tutto
    ascolta: { label: 'Ascoltare i clienti', side: ['ris', 'tut', 'fam', 'self'], night: false, risk: 0, mins: 60, ev: null, run: (st, a, s) => {
      const near = st.npcs.filter(k => k !== a && !k.dead && k.mem && k.mem.length && (isP(a) ? dist(k.x, k.y, st.player.x, st.player.y) < 18 : a.pop && k.pop && k.pop.at && a.pop.at && I.tkey(k.pop.at) === I.tkey(a.pop.at)));
      const k = pick(near.length ? near : st.npcs.filter(x => x.mem && x.mem.length).slice(0, 20)); const m = k && k.mem.slice().sort((x, y) => G.weight(st, y) - G.weight(st, x))[0];
      const heard = m ? G.rumorText(st, m, k.id).replace(/^Hai sentito\? /, '') : 'si lamentano del freddo e dei prezzi';
      if (s === 'tut') { const x = suspect(st, a); if (x) { repr(st, 2); if (rnd() < .3) I.arrest(st, x, 'parlava troppo al bancone'); return `Ha riferito alla Zia quello che diceva ${x.first}.`; } }
      if (s === 'ris' && st.ris && st.ris.raid && rnd() < .5) { st.ris.raid.at += 60; return `Al bancone due Grigi parlavano della perquisizione a ${st.ris.raid.name}. Un'ora in più.`; }
      if (s === 'ris' && RS && !isP(a)) { const m2 = risOf(st)[0]; if (m2) RS.inbox(st, m2, `Da ${nm(st, a)}: al bancone si dice che ${heard}.`, 'rumor', true); }
      return `Al bancone si dice che ${heard}.`; } },
    bancone: { label: 'Tenere un messaggio dietro il bancone', side: ['ris'], night: false, risk: .03, mins: 10, ev: null, run: (st, a) => { morale(st, 1); if (st.ris) st.ris.drop = { by: isP(a) ? 'player' : a.id, t: st.t }; return 'Una busta sotto la cassa: chi deve sapere, sa.'; } },
    annacqua: { label: 'Annacquare il vino', side: ['self', 'fam'], night: false, risk: .05, mins: 10, ev: null, run: (st, a, s) => { if (s === 'fam') famCash(st, 4); else money(st, a, 4); return 'Il vino della casa è un po\' più della casa.'; } },
    // magazzini, porto, alberghi
    casse: { label: 'Far sparire una cassa', side: ['ris', 'fam', 'self'], night: true, risk: .15, mins: 40, ev: 'furto_mat', run: (st, a, s) => { if (s === 'ris') { toRis(st, a, pick(['viveri', 'materiali', 'merce']), 2); return 'Una cassa in meno nell\'inventario.'; } if (s === 'fam') { famCash(st, 20); return 'La cassa è finita alla Famiglia.'; } money(st, a, 12); return 'Una cassa venduta al mercato nero.'; } },
    contrabbando: { label: 'Far passare merce di contrabbando', side: ['ris', 'fam', 'self'], night: true, risk: .12, mins: 90, ev: 'furto_mat', run: (st, a, s) => { if (s === 'ris') { toRis(st, a, pick(['radio', 'merce', 'medicine']), 1); return 'Una scatola dal continente, sotto le reti.'; } if (s === 'fam') { famCash(st, 30); return 'Un carico per la Famiglia è passato senza controlli.'; } money(st, a, 20); return 'Ventimila lire per guardare dall\'altra parte.'; } },
    camere: { label: 'Una stanza senza registro', side: ['ris', 'fam'], night: false, risk: .06, mins: 15, ev: null, run: (st, a, s) => { if (s === 'fam') { famCash(st, 5); return 'Una stanza per uno della Famiglia che deve sparire per qualche giorno.'; } if (st.ris) st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo - .08, 0, 1); }); return 'Una stanza che non esiste: chi è braccato ci dorme stanotte.'; } },
    // sartoria e lavanderia
    divisa: { label: 'Cucire una divisa dei Grigi', side: ['ris'], night: true, risk: .12, mins: 180, ev: 'scasso', run: (st, a) => { toRis(st, a, 'divisa', 1, `${nm(st, a)} ha cucito una divisa dei Grigi. Da lontano non si distingue.`); return 'Una divisa grigia, i bottoni giusti.'; } },
    rammenda: { label: 'Aggiustare i vestiti dei vicini', side: ['aiuto', 'self'], night: false, risk: 0, mins: 60, ev: null, run: (st, a) => { money(st, a, 4); if (a.pop) (a.pop.friends || []).slice(0, 2).forEach(id => { const k = G.byId(st, id); if (k && k.ris) k.ris.bond = clamp(k.ris.bond + .02, -1, 1); }); return 'Un cappotto rattoppato per l\'inverno.'; } },
    // ferro e legno
    chiavi: { label: 'Duplicare una chiave', side: ['ris', 'fam', 'self'], night: false, risk: .08, mins: 30, ev: null, run: (st, a, s) => { if (s === 'ris' && st.ris) { const sp = Object.values(st.ris.spaces || {}).find(x => x.found && x.locked); if (sp) { sp.locked = false; return 'La chiave di uno spazio chiuso: adesso si entra.'; } toRis(st, a, 'attrezzi', 1); return 'Un mazzo di chiavi buone per molte porte.'; } if (s === 'fam') { famCash(st, 10); return 'Una chiave per la Famiglia. Meglio non sapere di che porta.'; } money(st, a, 6); return 'Una chiave fatta per un cliente che non ha fatto domande.'; } },
    lame: { label: 'Fare un coltello', side: ['fam', 'self', 'ris'], night: true, risk: .08, mins: 60, ev: null, run: (st, a, s) => { if (s === 'fam') { famCash(st, 6); return 'Lame per la Famiglia.'; } giveItem(st, a, 'coltello', 1); return 'Un coltello, affilato bene.'; } },
    attrezzi: { label: 'Portare via attrezzi e materiali', side: ['ris', 'self'], night: false, risk: .1, mins: 30, ev: 'furto_mat', run: (st, a, s) => { if (s === 'ris') { toRis(st, a, pick(['attrezzi', 'materiali']), pick([1, 2])); return 'Qualche attrezzo in meno in bottega.'; } giveItem(st, a, pick(['piede', 'chiodi', 'corda']), 1); return 'Un attrezzo che serviva più a casa.'; } },
    // cucina e cibo
    sfama: { label: 'Mettere da parte cibo per il covo', side: ['ris'], night: false, risk: .06, mins: 20, ev: 'furto_mat', run: (st, a) => { toRis(st, a, 'viveri', 3); return 'Tre scatole di viveri, contate come avanzi.'; } },
    poveri: { label: 'Dare da mangiare a chi non ha niente', side: ['aiuto'], night: false, risk: 0, mins: 40, ev: null, run: (st, a) => { const poor = st.npcs.filter(k => free(st, k) && k.pop && k.pop.money < 10 && k.pop.need && k.pop.need.fame > .5).slice(0, 4); poor.forEach(k => { k.pop.need.fame = 0; if (k.ris) k.ris.ideo = clamp(k.ris.ideo + .02, 0, 1); I.note(st, k, `${nm(st, a)} gli ha dato da mangiare senza chiedere niente`, 'good', { w: .4, tag: 'amico' }); }); morale(st, poor.length * .5); return poor.length ? `Ha sfamato ${poor.map(k => k.first).join(', ')}.` : 'Oggi non c\'era nessuno alla porta.'; } },
    mensa: { label: 'Ascoltare nelle cucine del comando', side: ['ris'], night: false, risk: .1, mins: 60, ev: null, run: (st, a) => { if (st.ris && st.ris.raid) { st.ris.raid.at += 90; return `In cucina gli ufficiali parlavano di ${st.ris.raid.name}. Un'ora e mezza in più.`; } repr(st, -2); return 'Gli ufficiali parlano di carbone e di promozioni. Niente su di noi, per ora.'; } },
    // mare
    barca: { label: 'Portare qualcosa (o qualcuno) via mare', side: ['ris', 'fam', 'self'], night: true, risk: .15, mins: 180, ev: 'furto_mat', run: (st, a, s) => { if (s === 'fam') { famCash(st, 40); return 'Un viaggio di notte per la Famiglia.'; } if (s === 'self') { money(st, a, 30); return 'Un passeggero senza nome, trentamila lire.'; } toRis(st, a, 'radio', 2); return 'Due casse di parti radio dal continente.'; } },
    // scuola, cultura, chiesa
    lezione: { label: 'Raccontare quello che il Garante tace', side: ['ris'], night: false, risk: .12, mins: 60, ev: 'volantino', run: (st, a) => { const near = st.npcs.filter(k => free(st, k) && k.ris && k.pop && a.pop && k.pop.at && a.pop.at && I.tkey(k.pop.at) === I.tkey(a.pop.at)).slice(0, 8); near.forEach(k => { k.ris.ideo = clamp(k.ris.ideo + .03, 0, 1); }); morale(st, 2); return near.length ? `L'hanno ascoltata in ${near.length}.` : 'Poche parole, ma rimangono.'; } },
    proiezione: { label: 'Una proiezione proibita, di notte', side: ['ris'], night: true, risk: .14, mins: 150, ev: 'volantino', run: (st, a) => { morale(st, 4); repr(st, 2); return 'Un film che non si poteva vedere. In sala in trenta, in silenzio.'; } },
    riunione: { label: 'Aprire la sala per una riunione', side: ['ris'], night: true, risk: .08, mins: 120, ev: null, run: (st, a) => { morale(st, 3); if (st.ris) st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo - .06, 0, 1); }); return 'Una riunione dove nessuno la cerca.'; } },
    cripta: { label: 'Nascondere qualcuno nella cripta', side: ['ris', 'aiuto'], night: true, risk: .05, mins: 30, ev: null, run: (st, a) => { if (st.ris) st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo - .1, 0, 1); }); repr(st, -2); return 'Sotto l\'altare c\'è posto per uno. I Grigi in chiesa non scendono.'; } },
    // campi, bosco, cave
    legna: { label: 'Portare legna e carbone a chi ha freddo', side: ['aiuto', 'ris', 'self'], night: false, risk: .04, mins: 60, ev: null, run: (st, a, s) => { if (s === 'self') { money(st, a, 10); return 'Legna venduta al nero.'; } if (s === 'ris') { toRis(st, a, 'materiali', 2); return 'Legna e carbone per il covo.'; } morale(st, 1); return 'Due sacchi di carbone alla porta di chi non ne ha.'; } },
    raccolto: { label: 'Mettere da parte una parte del raccolto', side: ['ris', 'self', 'aiuto'], night: false, risk: .08, mins: 30, ev: 'furto_mat', run: (st, a, s) => { if (s === 'ris') { toRis(st, a, 'viveri', 3); return 'Tre cassette di raccolto non dichiarate.'; } if (s === 'aiuto') { morale(st, 1); return 'Il raccolto non dichiarato è andato alle famiglie del villaggio.'; } money(st, a, 10); return 'Una parte del raccolto venduta al mercato nero.'; } },
    dinamite: { label: 'Far sparire esplosivo dalla cava', side: ['ris', 'fam'], night: true, risk: .2, mins: 60, ev: 'furto_mat', run: (st, a, s) => { if (s === 'fam') { famCash(st, 25); return 'Esplosivo per la Famiglia.'; } toRis(st, a, 'kit', 1); return 'Abbastanza esplosivo per un kit di sabotaggio.'; } },
    // fabbriche
    sciopero: { label: 'Fermare il lavoro per un\'ora', side: ['ris'], night: false, risk: .15, mins: 60, ev: 'volantino', run: (st, a) => { morale(st, 3); repr(st, 3); if (a.pop && a.pop.job) st.npcs.filter(k => k !== a && k.pop && k.pop.job && k.pop.job.t && I.tkey(k.pop.job.t) === I.tkey(a.pop.job.t)).forEach(k => { if (k.ris) k.ris.ideo = clamp(k.ris.ideo + .03, 0, 1); I.note(st, k, `${nm(st, a)} ha fermato le macchine per un'ora. Nessuno ha detto niente`, 'shady', { w: .5, tag: 'scritta' }); }); return 'Le macchine ferme per un\'ora. La Tutela lo saprà.'; } },
    materiali: { label: 'Portare via materiali dal cantiere', side: ['ris', 'self'], night: false, risk: .1, mins: 30, ev: 'furto_mat', run: (st, a, s) => { if (s === 'ris') { toRis(st, a, 'materiali', 3); return 'Tre carichi di materiali usciti senza bolla.'; } money(st, a, 8); return 'Materiali venduti al nero.'; } },
    // la Guardia
    occhio: { label: 'Chiudere un occhio, a pagamento', side: ['fam', 'self'], night: false, risk: .05, mins: 10, ev: null, run: (st, a, s) => { money(st, a, 20); if (st.fam) st.fam.bribes[a.id || 'x'] = st.t + 3 * 1440; return 'Una busta, e qualcuno passa il posto di blocco.'; } },
    perquisisci: { label: 'Perquisire una casa sospetta', side: ['tut'], night: false, risk: 0, mins: 60, ev: null, run: (st, a) => { const k = suspect(st, a); if (st.ris) st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo + .1, 0, 1); }); if (k && rnd() < .4) { I.arrest(st, k, 'perquisizione'); return `Perquisita la casa di ${k.first}. L'hanno portato via.`; } return 'Perquisizione: niente, stavolta.'; } },
    // consegne e messaggi
    staffetta: { label: 'Portare messaggi tra le basi', side: ['ris'], night: false, risk: .05, mins: 60, ev: null, run: (st, a) => { morale(st, 1); if (st.ris && st.ris.raid) { st.ris.raid.at += 45; return 'Il messaggio è arrivato prima dei Grigi.'; } return 'Tre biglietti consegnati, nascosti nei fiori.'; } },
    cassette: { label: 'Prestare cassette proibite', side: ['ris', 'self'], night: false, risk: .1, mins: 30, ev: 'volantino', run: (st, a, s) => { if (s === 'self') { money(st, a, 10); return 'Cassette dal continente, a noleggio.'; } morale(st, 2); return 'Un film proibito gira di casa in casa.'; } },
    dediche: { label: 'Dediche in codice alla radio', side: ['ris'], night: true, risk: .08, mins: 60, ev: null, run: (st, a) => { morale(st, 2); return '«Per chi aspetta sotto la neve.» Chi doveva capire ha capito.'; } },
    // forza
    lezione_debitore: { label: 'Ricordare un debito a qualcuno', side: ['fam', 'self'], night: true, risk: .1, mins: 30, ev: 'aggressione', run: (st, a, s) => { const d = st.npcs.find(k => free(st, k) && k.pop && k.pop.debt); if (!d) return 'Nessuno da andare a trovare.'; I.feel(d, 'paura', .4); I.note(st, d, `è passat${o(a)} ${nm(st, a)} a ricordargli il debito`, 'bad', { w: .6, tag: 'squalo' }); const q = Math.min(d.pop.debt.amount, Math.max(0, d.pop.money * .5)); d.pop.money -= q; d.pop.debt.amount -= q; if (s === 'fam') famCash(st, q); else money(st, a, q); return `${d.first} ha pagato ${Math.round(q)}.000 lire.`; } },
    allena: { label: 'Insegnare a difendersi', side: ['ris', 'aiuto'], night: false, risk: .02, mins: 90, ev: null, run: (st, a) => { morale(st, 1); risOf(st).forEach(m => { m.ris.fatigue = clamp(m.ris.fatigue - .05, 0, 1); }); return 'I ragazzi imparano a cadere e a rialzarsi.'; } },
    cabine: { label: 'Nascondere roba nelle cabine', side: ['ris', 'fam'], night: false, risk: .05, mins: 20, ev: null, run: (st, a, s) => { if (s === 'fam') { famCash(st, 5); return 'Una cabina chiusa a chiave per la Famiglia.'; } if (st.ris) st.ris.bases.forEach(b => { if (b.alive) b.expo = clamp(b.expo - .05, 0, 1); }); return 'Una cabina chiusa per l\'inverno, piena della nostra roba.'; } },
    cassa: { label: 'Prendere qualcosa dalla cassa', side: ['self', 'fam'], night: true, risk: .15, mins: 10, ev: 'furto_mat', run: (st, a, s) => { const q = 8 + Math.floor(rnd() * 12); if (s === 'fam') famCash(st, q); else money(st, a, q); return `${q}.000 lire dalla cassa. Il conto non tornerà.`; } },
  };

  // ---------------- CHI PUÒ FARE COSA ----------------
  // per mestiere (titolo o ruolo); il primo che corrisponde vince, e si aggiungono sempre «ascolta» e «cassa» ai mestieri al pubblico
  const JOBMAP = [
    [/tipograf/, ['stampa', 'tessere']],
    [/dattilograf/, ['tessere', 'fascicoli', 'segnala']],
    [/Rettifiche|Ufficio Rettifiche/, ['fascicoli', 'timbri', 'segnala']],
    [/attendente al comando/, ['fascicoli', 'mensa', 'segnala']],
    [/^impiegat|biblioteca/, ['timbri', 'segnala', 'lezione']],
    [/Bibliotecario/, ['lezione', 'stampa', 'riunione']],
    [/infermier|Medico/, ['cura', 'medicine']],
    [/farmacist/, ['cura', 'medicine', 'roba']],
    [/meccanic|Meccanico/, ['sabota_mezzo', 'ripara']],
    [/benzinai/, ['benzina', 'cassa']],
    [/barman|DJ/, ['ascolta', 'annacqua', 'dediche']],
    [/barist|Barista|camerier|oste\b|ostessa|gestore della sala|Vedova del Bar/, ['ascolta', 'bancone', 'annacqua', 'cassa']],
    [/cuoco della mensa|cuoca della mensa/, ['mensa', 'sfama']],
    [/cuoc|fornai|forno|macell|garzone|pescivendol|fruttivendol|Bottegaio|commess/, ['sfama', 'poveri', 'cassa', 'ascolta']],
    [/magazzinier|guardiano dell'Emporio|direttore dell'Emporio|commesso dell'Emporio/, ['casse', 'cassa', 'segnala']],
    [/scaricator|Scaricatore|facchin/, ['casse', 'contrabbando']],
    [/portier|affittacamer|cameriera ai piani/, ['camere', 'ascolta', 'segnala']],
    [/sart|lavandai/, ['divisa', 'rammenda']],
    [/fabbr/, ['chiavi', 'lame', 'attrezzi']],
    [/ferrament/, ['chiavi', 'attrezzi']],
    [/falegnam|carpentier|saldator/, ['attrezzi', 'materiali', 'contrabbando']],
    [/pescator/, ['barca', 'sfama']],
    [/maestr|bidell/, ['lezione', 'riunione']],
    [/proiezionist|custode del teatro|cassiera/, ['proiezione', 'ascolta']],
    [/custode del circolo/, ['riunione', 'ascolta']],
    [/sagrestan|Suora|custode del santuario/, ['cripta', 'riunione']],
    [/boscaiol/, ['legna']],
    [/cavator/, ['dinamite', 'legna']],
    [/braccian|vignaiol|allevator|salinar/, ['raccolto', 'legna']],
    [/operai/, ['sciopero', 'materiali']],
    [/Guardia|Comandante/, ['occhio', 'perquisisci']],
    [/Fioraia|Fattorino/, ['staffetta', 'ascolta']],
    [/Videoteca/, ['cassette', 'ascolta']],
    [/buttafuori|Scagnozzo/, ['lezione_debitore']],
    [/istruttore di pugilato|Ex Grigio/, ['allena', 'lezione_debitore']],
    [/bagnin/, ['cabine']],
    [/barbier|tabacca/, ['ascolta', 'bancone', 'cassa']],
    [/Ricettatore/, ['casse', 'cassa']],
    [/Contrabbandiere|Capobanda/, ['contrabbando', 'barca']],
    [/Studentessa|Ragazzo della Gelateria/, ['staffetta', 'lezione']],
  ];
  function jobTitle(st, a) {
    if (isP(a)) return st.me && st.me.job ? st.me.job.title : '';
    if (a.cop) return 'Guardia';
    return (a.pop && a.pop.job && (a.pop.job.base || a.pop.job.title)) || a.role || '';
  }
  function abilities(st, a) {
    const t = jobTitle(st, a); if (!t) return [];
    for (const [re, ids] of JOBMAP) if (re.test(t)) return ids;
    return ['ascolta', 'cassa'];   // qualunque lavoro al pubblico: si sente, e la cassa è lì
  }
  // dove si fa: il posto di lavoro
  function workT(st, a) {
    if (isP(a)) { const J = st.me && st.me.job; if (!J) return null; return J.bi >= 0 ? I.tB(J.bi) : I.target(J.place); }
    if (a.pop && a.pop.job && a.pop.job.t) return a.pop.job.t;
    if (a.cop) return I.target('commissariato');
    const c = RS && RS.CARDS[a.id]; if (c && c.mestiere) return I.target(c.mestiere.place);
    return a.pop ? a.pop.homeT : null;
  }

  // ---------------- FARE: uguale per tutti ----------------
  function perform(st, a, id, side) {
    const A = AB[id]; if (!A) return { ok: false, msg: 'Non so fare questa cosa.' };
    const s = side || (A.side.includes(sideOf(st, a)) ? sideOf(st, a) : A.side[0]);
    const t = workT(st, a), night = G.isNight(st);
    // il rischio: chi c'è (di notte poca gente), il mestiere che fa da copertura
    const x = isP(a) ? st.player.x : a.x, y = isP(a) ? st.player.y : a.y;
    const wit = st.npcs.filter(k => k !== a && !k.dead && !k.inside && dist(k.x, k.y, x, y) < 14).length + (t && !isP(a) ? st.npcs.filter(k => k !== a && k.pop && k.pop.at && I.tkey(k.pop.at) === I.tkey(t)).length : 0);
    const risk = A.risk * (A.night ? (night ? .6 : 1.6) : 1) * (1 + Math.min(8, wit) * .1);
    const text = A.run(st, a, s);
    st.mest = st.mest || { done: {}, seen: 0 }; st.mest.done[id] = (st.mest.done[id] || 0) + 1;
    let seen = false;
    if (A.ev && rnd() < risk) {
      seen = true; st.mest.seen++;
      if (isP(a)) { G.emit(st, A.ev, { place: t ? t.label : undefined }); G.feed(st, 'Qualcuno ti ha visto.', 'bad'); if (st.me && st.me.job && rnd() < .5) { G.feed(st, `${st.me.job.name}: «Fuori di qui. E ringrazia che non chiamo la Guardia.»`, 'bad'); st.me.job = null; } }
      else {
        const ev = AZ.emit(st, A.ev, a, null, x, y, t ? t.label : '');
        st.npcs.filter(k => k !== a && !k.dead && k.pop && (dist(k.x, k.y, x, y) < 14 || (t && k.pop.at && I.tkey(k.pop.at) === I.tkey(t)))).slice(0, 4).forEach(k => G.addMemory(st, k, { eventId: ev.id, type: A.ev, actor: a.id, place: ev.place, t: st.t, conf: .8, source: 'visto' }));
        if (rnd() < .35) I.arrest(st, a, A.label.toLowerCase()); else if (a.pop && a.pop.job && rnd() < .4) { I.note(st, a, `licenziat${o(a)}: l'hanno visto ${A.label.toLowerCase()}`, 'bad', { w: .7, tag: 'fermato' }); a.pop.job = null; a.pop.status = 'disoccupato'; }
      }
    }
    if (!isP(a)) I.note(st, a, `${A.label.toLowerCase()}: ${text}`, s === 'aiuto' ? 'good' : 'shady', { w: .5, tag: 'mestiere' });
    return { ok: true, msg: text + (seen ? ' Ma qualcuno ha visto.' : ''), seen };
  }

  // ---------------- GLI ABITANTI LO FANNO DA SOLI ----------------
  // a mezzanotte, chi ha un motivo mette in programma una cosa del suo mestiere: di giorno sul lavoro, di notte con le chiavi
  const PROJ_MESTIERE = { id: 'mestiere', need: true, label: (st, n, P, a) => (AB[a.ab] || { label: 'qualcosa sul lavoro' }).label.toLowerCase(), arg: () => null,
    steps: (st, n, P, a) => { const t = workT(st, n), A = AB[a.ab]; if (!t || !A) return null; return [{ k: 'go', ref: t, h: A.night ? 22 + Math.floor(rnd() * 2) : (P.job ? Math.min(P.job.end - 1, P.job.start + 2) : 11), act: A.night ? 'scritta' : 'progetto', label: A.label.toLowerCase(), fx: (st, n) => { perform(st, n, a.ab, a.side); return 'done'; } }]; } };
  I.PROJ.mestiere = PROJ_MESTIERE;
  function motive(st, n) {
    const P = n.pop, s = sideOf(st, n), N = P.need || {};
    if (s === 'ris') return { side: 'ris', p: .05 + (n.ris.ideo - .6) * .2 + (N.rabbia || 0) * .1 + (n.cell || n.ris.collabOf ? .05 : 0) };
    if (s === 'fam') return { side: 'fam', p: .06 };
    if (s === 'tut') return { side: 'tut', p: .03 };
    if (P.money < 10 && n.tr.legge < .45) return { side: 'self', p: .06 + (P.debt ? .04 : 0) };
    const friendInNeed = (P.friends || []).map(id => G.byId(st, id)).some(k => k && k.pop && (k.hp < k.maxHp * .7 || k.pop.money < 0 || (k.pop.need && k.pop.need.fame > .8)));
    if (friendInNeed) return { side: 'aiuto', p: .05 };
    return null;
  }
  I.REFLECT.push((st, n) => {
    if (!n.pop || n.dead || PO.isPassive(st, n)) return;
    const ids = abilities(st, n); if (!ids.length) return;
    const m = motive(st, n); if (!m || rnd() > m.p) return;
    const fit = ids.filter(id => AB[id].side.includes(m.side)); if (!fit.length) return;
    const id = pick(fit);
    I.startProject(st, n, PROJ_MESTIERE, { who: 'mest' + st.t, ab: id, side: m.side });
  });

  // ---------------- LA RISACCA LO CHIEDE ----------------
  if (RS && RS.VERBS) {
    RS.VERBS.mestiere = { label: 'usa il suo mestiere', risk: .1, task: true, pol: true, args: 'azione', desc: 'fa una cosa che solo il suo lavoro permette (vedi «COL SUO LAVORO PUÒ» nella scheda)' };
    RS.EXT.plan.push((st, n, verb, a) => {
      if (verb !== 'mestiere') return null;
      const ids = abilities(st, n).filter(id => AB[id].side.some(s => s === 'ris' || s === 'aiuto' || s === 'self'));
      if (!ids.length) return { err: `${n.first} non ha un lavoro che serva.` };
      const want = String(a.azione || '').toLowerCase();
      const id = ids.find(i => i === want) || ids.find(i => AB[i].label.toLowerCase().includes(want)) || ids[0];
      const t = workT(st, n); if (!t) return { err: 'Non ha un posto di lavoro.' };
      const A = AB[id];
      if (A.night && !G.isNight(st)) return { steps: [{ k: 'go', x: t.x, y: t.y, name: t.label }, { k: 'hold', mins: 30 }, { k: 'do', fn: 'mestiere', ab: id }], desc: `aspetta che chiudano e poi: ${A.label.toLowerCase()} (${t.label})` };
      return { steps: [{ k: 'go', x: t.x, y: t.y, name: t.label }, { k: 'do', fn: 'mestiere', ab: id }], desc: `${A.label.toLowerCase()} (${t.label})` };
    });
    RS.EXT.do.mestiere = (st, n, T, s) => perform(st, n, s.ab, AB[s.ab].side.includes('ris') ? 'ris' : AB[s.ab].side[0]);
    // nella scheda della chat: cosa può fare col suo lavoro
    RS.EXT.cardExtra = (st, n) => { const ids = abilities(st, n); if (!ids.length) return ''; return `COL SUO LAVORO PUÒ (verbo "mestiere", argomento "azione" = uno di questi id): ${ids.map(id => `${id} = ${AB[id].label.toLowerCase()}${AB[id].night ? ' (di notte)' : ''}`).join('; ')}.`; };
  }

  // ---------------- IL PROTAGONISTA, SUL SUO POSTO DI LAVORO ----------------
  const acts0 = AZ.playerActions;
  AZ.playerActions = st => {
    const out = acts0(st) || []; const M = st.me;
    if (!M || !M.job || M.warp || st.player.vehicle) return out;
    const t = workT(st, 'player'); if (!t || (st.player.indoor ? st.player.indoor.b !== t.bi : dist(t.x, t.y, st.player.x, st.player.y) > 5)) return out;
    abilities(st, 'player').forEach(id => { const A = AB[id]; if (A.side.includes('tut')) return; out.push({ id: 'mest_' + id, label: A.label + (A.night ? ' (di notte, con le chiavi)' : ''), run: A.night && !G.isNight(st) ? null : () => perform(st, 'player', id, A.side.includes('ris') ? 'ris' : A.side[0]).msg, off: A.night && !G.isNight(st) ? 'aspetta che chiudano' : '' }); });
    return out;
  };

  // ================= VIZI E FAVORI: la stessa vita del protagonista =================
  const BAR_IDS = ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2', 'flipper', 'disco'];
  const atBar = n => n.pop && n.pop.at && BAR_IDS.includes(n.pop.at.place);
  function vices(st, hr) {
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || n.jailedUntil > st.t || PO.isPassive(st, n)) return;
      if (P.smoker === undefined) P.smoker = rnd() < .32;
      // il vino: al bar si beve, il vino scioglie la lingua, la mattina dopo pesa
      // il vino: al bar si beve; scioglie la lingua; chi beve spesso lo sente meno e ne vuole di più; la mattina dopo pesa
      if (P.alcol === undefined) P.alcol = P.vice === 'vino' ? .5 + rnd() * .3 : rnd() * .15;
      if (P.punctBase === undefined) P.punctBase = P.punct;
      if (P.loqBase === undefined) P.loqBase = n.tr.loq;
      const craving = P.alcol > .5 ? .35 : 0;
      if (atBar(n) && (rnd() < .3 + craving + (P.vice === 'vino' ? .2 : 0))) {
        const shots = P.alcol > .6 ? 2 : 1;
        P.drunk = clamp((P.drunk || 0) + shots * .2 * (1 - P.alcol * .6), 0, 1); P.money -= 2 * shots; P.alcol = clamp(P.alcol + .02 * shots, 0, 1);
      }
      if (P.drunk > 0) P.drunk = clamp(P.drunk - .18, 0, 1);
      if (!(P.drunk > .05)) P.alcol = clamp(P.alcol - .006, 0, 1);
      n.tr.loq = clamp(P.loqBase + (P.drunk || 0) * .4, 0, 1);
      if (hr === 1 && P.drunk > .45) P.hang = true;
      if (hr === 14) P.hang = false;
      // chi è alcolizzato perde lucidità anche da sobrio: arriva tardi, si arrabbia, spende, trema
      P.punct = clamp(P.punctBase * (P.hang ? .5 : 1) * (1 - Math.max(0, P.alcol - .5) * .8), 0, 1);
      if (P.alcol > .6 && !(P.drunk > .15) && rnd() < .2) { I.feel(n, 'rabbia', .05); if (hr === 11 && rnd() < .3) I.note(st, n, 'le mani tremano finché non beve', 'bad', { w: .3, tag: 'vizio' }); }
      // le sigarette: si comprano, e senza si diventa nervosi
      if (P.smoker && hr === 9) { if (P.money >= 1) { P.money -= 1; I.feel(n, 'paura', -.03); } else I.feel(n, 'rabbia', .05); }
      // offrire un giro: chi sta bene e ha qualcuno intorno
      if (atBar(n) && P.money > 70 && rnd() < .05) {
        const others = st.npcs.filter(k => k !== n && k.pop && k.pop.at && I.tkey(k.pop.at) === I.tkey(P.at)).slice(0, 5);
        if (others.length) { P.money -= others.length * 2; others.forEach(k => { if (k.pop.need) k.pop.need.compagnia = 0; I.note(st, k, `${n.first} ha offerto da bere a tutti`, 'good', { w: .25, who: n.id, tag: 'amico' }); if (k.ris && n.ris) k.ris.bond = clamp(k.ris.bond, -1, 1); }); I.note(st, n, `offerto un giro a ${others.length} persone`, 'good', { w: .3, tag: 'amico' }); }
      }
    });
  }
  // prestiti tra amici: chi è al verde chiede, chi può presta, chi non restituisce perde l'amico
  function loans(st, hr) {
    const wd = PO.weekday(st.t);
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || PO.isPassive(st, n)) return;
      if (hr === 19 && !P.loan && (P.money < 0 || (wd === 6 && P.money < (P.rent || 10)))) {
        const fr = (P.friends || []).map(id => G.byId(st, id)).filter(k => free(st, k) && k.pop && k.pop.money > 50 && !(k.pop.lent && k.pop.lent[n.id])).sort((a, b) => b.pop.money - a.pop.money)[0];
        if (fr) { const q = Math.min(30, Math.max(10, Math.round(-P.money + 10))); fr.pop.money -= q; P.money += q; P.loan = { from: fr.id, q, t: st.t }; (fr.pop.lent = fr.pop.lent || {})[n.id] = q; I.note(st, n, `${fr.first} gli ha prestato ${q}.000 lire`, 'info', { w: .4, who: fr.id, tag: 'amico' }); I.note(st, fr, `prestato ${q}.000 lire a ${n.first}`, 'info', { w: .35, who: n.id, tag: 'amico' }); st.mestLoans = (st.mestLoans || 0) + 1; }
      }
      if (P.loan && hr === 20) {
        const L = P.loan, fr = G.byId(st, L.from);
        if (!fr || fr.dead) { P.loan = null; return; }
        if (P.money > L.q + 15) { P.money -= L.q; fr.pop.money += L.q; delete fr.pop.lent[n.id]; P.loan = null; I.note(st, fr, `${n.first} ha restituito i soldi`, 'good', { w: .3, who: n.id, tag: 'amico' }); }
        else if (st.t - L.t > 7 * 1440) {
          P.loan = null; delete fr.pop.lent[n.id];
          fr.pop.friends = (fr.pop.friends || []).filter(id => id !== n.id); P.friends = (P.friends || []).filter(id => id !== fr.id);
          I.note(st, fr, `${n.first} non mi ha mai ridato i soldi. Per me è finita`, 'bad', { w: .6, who: n.id, tag: 'bidone' }); I.feel(fr, 'rabbia', .2);
        }
      }
    });
  }
  // la roba che scotta si nasconde in casa, di notte
  function stash(st, hr) {
    if (hr !== 2) return;
    st.npcs.forEach(n => { const P = n.pop; if (!P || !P.inv || n.dead) return; ['refurtiva', 'roba', 'pistola', 'mitra', 'lupara'].forEach(k => { if (P.inv[k] > 0 && P.cur && P.cur.act === 'sonno') { P.stash = P.stash || {}; P.stash[k] = (P.stash[k] || 0) + P.inv[k]; delete P.inv[k]; if (n.hand === k) n.hand = null; } }); });
  }
  // licenziarsi: chi lavora per la Tutela e non la sopporta più, chi è stufo del padrone
  function quits(st, hr) {
    if (hr !== 8) return;
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || !P.job || n.dead || PO.isPassive(st, n)) return;
      const tut = /Rettifiche|Tutela|comando|Emporio/.test((P.job.name || '') + (P.job.title || ''));
      if ((tut && n.ris && n.ris.ideo > .78 && rnd() < .08) || (P.late >= 3 && n.tr.cor > .75 && rnd() < .1)) {
        I.note(st, n, tut ? `si è licenziat${o(n)}: non lavora più per la Tutela` : `si è licenziat${o(n)}: il padrone non lo sopportava più`, tut ? 'good' : 'info', { w: .6, tag: 'progetto' });
        if (tut && n.ris) n.ris.ideo = clamp(n.ris.ideo + .05, 0, 1);
        P.job = null; P.status = 'disoccupato'; n.role = P.sex === 'f' ? 'Disoccupata' : 'Disoccupato'; st.mestQuit = (st.mestQuit || 0) + 1;
      }
    });
  }

  // ---------------- AGGANCI ----------------
  function install() {
    const H = G.HOOKS; if (H.__mestieri) return; H.__mestieri = true;
    const s0 = H.step;
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const hm = Math.floor(st.t / 60); if (st.mestHour === undefined) st.mestHour = hm;
      while (st.mestHour < hm) { st.mestHour++; const hr = st.mestHour % 24; vices(st, hr); loans(st, hr); stash(st, hr); quits(st, hr); }
    };
  }
  install();
  function report(st) { const M = st.mest || { done: {}, seen: 0 }; return { fatte: M.done, viste: M.seen, prestiti: st.mestLoans || 0, licenziati: st.mestQuit || 0, brilli: st.npcs.filter(n => n.pop && n.pop.drunk > .3).length, alcolizzati: st.npcs.filter(n => n.pop && n.pop.alcol > .6).length }; }
  return { AB, JOBMAP, abilities, perform, sideOf, report };
})();
if (typeof module !== 'undefined') module.exports = Mestieri;
