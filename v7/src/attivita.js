/* Porto Vecchio — [attività] Le cose da fare nei locali, per il giocatore (solo logica, nessuna grafica).
   - AUTORIMESSA CENTRALE: si compra un mezzo (esce parcheggiato davanti al portone), si potenzia quello tuo parcheggiato
     davanti (motore, assetto, nitro, corazza: gli stessi livelli dell'Officina), si rivernicia un mezzo rubato (non è più «rubato»).
   - LA CASSA: in ogni bottega col banco, se c'è il commesso e hai un'arma in pugno lo rapini; se il negozio è vuoto (chiuso,
     di notte) la forzi, con calma e facendo rumore. Una cassa svuotata resta vuota per mezza giornata; dentro c'è l'incasso vero.
   - BILIARDO, FRECCETTE, POLIGONO, JUKEBOX, CAMERINI: vicino al mobile c'è l'azione (il tempo passa davvero, come al Protagonista).
   Le azioni compaiono nel menu QUI, ADESSO (Azioni.playerActions), dopo quelle del Protagonista. Si prova anche in Node. */
var Attivita = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const AZ = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const O = typeof Oggetti !== 'undefined' ? Oggetti : null;
  const Ec = typeof Economia !== 'undefined' ? Economia : null;
  const INT = G.INT, TS = G.TS || 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const L_ = n => `${Math.round(n)}.000 lire`;

  // ---------------- DOVE SEI ----------------
  const bOf = use => G.BUILDINGS.findIndex(b => b.use === use);
  function inside(st) { const p = st.player; if (!p.indoor) return null; const b = G.BUILDINGS[p.indoor.b], L = INT.layout(b); return { bi: p.indoor.b, b, L, f: p.indoor.f, F: L.floors[p.indoor.f] }; }
  // dentro l'edificio o sulla soglia
  function atB(st, bi, r) { const p = st.player; if (bi < 0) return false; if (p.indoor) return p.indoor.b === bi; const b = G.BUILDINGS[bi]; return !!(b && b.door) && dist(b.door[0] * TS + TS / 2, b.door[1] * TS + TS / 2, p.x, p.y) < (r || 4); }
  // il mobile più vicino (re: id), entro r metri, al piano dove sei
  function nearFurn(st, re, r) { const I = inside(st); if (!I || !I.F) return null; const p = st.player; let best = null, bd = r || 2.2; I.F.furn.forEach(o => { if (!re.test(o.id)) return; const d = dist(o.x, o.y, p.x, p.y); if (d < bd) { bd = d; best = o; } }); return best; }
  function nearSpot(st, k, r) { const I = inside(st); if (!I || !I.F || !I.F.spots) return null; const p = st.player; return I.F.spots.find(s => s.k === k && dist(s.x, s.y, p.x, p.y) < (r || 1.6)) || null; }
  const others = (st, I) => st.npcs.filter(n => n.room && !n.dead && n.room.bi === I.bi && n.room.f === I.f);
  // il tempo che passa giocando (lo fa correre il Protagonista, come quando si mangia o si guarda la TV)
  function spend(st, mins, label) { const M = st.me, p = st.player; if (!M) { st.t += mins; return; } M.warp = { kind: 'svago', until: st.t + mins, label, nap: false, hp: p.hp, wanted: G.wantedLevel(st), t0: st.t }; }
  function svago(st, k) { const N = st.me && st.me.need; if (N) N.svago = clamp(N.svago - k, 0, 1); }
  function pay(st, q) { const p = st.player; if (p.money < q) return false; p.money -= q; if (st.me) st.me.stats.speso += q; return true; }
  const armed = st => { const p = st.player; return !!(p.cur && p.cur !== 'pugni' && G.WEAPONS && G.WEAPONS[p.cur] && !p.hand); };
  const gun = st => armed(st) && !G.WEAPONS[st.player.cur].melee;

  // ---------------- L'AUTORIMESSA ----------------
  // [mezzo, prezzo in migliaia di lire]: le utilitarie, i furgoni, e in fondo le macchine che fanno girare la testa
  const LISTINO = [['vespa', 60], ['ape', 110], ['cinquecento', 150], ['ritmo', 260], ['furgone', 300], ['giulia', 380], ['fuoristrada', 420], ['rx7', 900], ['gtr', 1200]];
  const COLORI = ['#c82a2a', '#2a5ac8', '#e8e4d8', '#e8a020', '#2a6a3a', '#1e1e22', '#8a8a90', '#5a2a4a', '#d8c070'];
  const UPG = [['motore', 'Motore', [40, 90, 160], 'più spinta e velocità di punta'], ['assetto', 'Assetto e gomme', [30, 70, 130], 'più tenuta e sterzo più pronto'], ['nitro', 'Nitro', [80, 170], 'Shift spinge di più'], ['corazza', 'Corazza saldata', [50, 110, 200], 'regge meglio urti e colpi']];
  const luogoOf = (st, bi) => O && O.luoghi ? Object.values(O.luoghi(st)).find(Lg => Lg.bi === bi) || null : null;
  const openNow = (st, Lg) => !O || !Lg || O.isOpen(st, Lg);
  function garage(st, out, add) {
    const bi = bOf('autorimessa'); if (bi < 0 || !atB(st, bi, 5)) return;
    const p = st.player, b = G.BUILDINGS[bi], L = INT.layout(b), Lg = luogoOf(st, bi);
    if (!openNow(st, Lg)) { out.push({ id: 'ar_chiusa', label: 'Autorimessa: chiusa (apre alle 8)', run: null, off: '' }); return; }
    const who = O && Lg ? O.clerk(st, Lg) : null, nm = who ? who.first : 'Il venditore';
    // comprare: il mezzo esce davanti al portone, è tuo e non è rubato
    LISTINO.forEach(([k, c]) => {
      const K = G.VK[k]; if (!K) return;
      add('ar_compra_' + k, `Compra ${K.label} (${L_(c)})`, p.money >= c ? () => {
        pay(st, c);
        const o = L.ent.out, q = G.parkSpot ? G.parkSpot(o[0], o[1]) : { x: o[0], y: o[1] };
        const v = G.makeVehicle(st, { id: 'compra' + (st.nextId++), kind: k, x: q.x, y: q.y, ang: q.ang || 0, color: pick(COLORI), owner: null });
        v.mine = true; v.bought = true; st.vehicles.push(v);
        G.addLog(st, `${G.clockStr(st.t)} · Hai comprato ${K.label} all'Autorimessa Centrale (${L_(c)}).`, 'money');
        st.sfx.push({ k: 'cash' });
        return `${nm} ti dà le chiavi: «${K.label}, pagata in contanti. È parcheggiata qui davanti.»`;
      } : null, 'non hai abbastanza soldi');
    });
    // potenziare e riverniciare il tuo mezzo parcheggiato davanti (o quello su cui sei)
    const dx = L.ent.out[0], dy = L.ent.out[1];
    const v = p.vehicle ? st.vehicles.find(q => q.id === p.vehicle) : st.vehicles.find(q => q.mine && !q.wreck && !q.hidden && !q.rider && dist(q.x, q.y, dx, dy) < 14);
    if (!v || (G.VK[v.kind] && G.VK[v.kind].boat)) return;
    const VN = G.vehicleName ? G.vehicleName(st, v) : v.kind;
    if (v.kind !== 'vespa') {
      v.up = v.up || {};
      UPG.forEach(([k, label, costs, desc]) => {
        const n = k === 'corazza' ? (v.armor || 0) : (v.up[k] | 0);
        if (n >= costs.length) { out.push({ id: 'ar_up_' + k, label: `${label} (${VN}): al massimo`, run: null, off: '' }); return; }
        const c = costs[n];
        add('ar_up_' + k, `${label} livello ${n + 1} per ${VN}: ${desc} (${L_(c)})`, p.money >= c ? () => { pay(st, c); if (k === 'corazza') v.armor = n + 1; else v.up[k] = n + 1; v._tk = null; startWait(st, 40, 'aspetti in officina'); return `I meccanici dell'Autorimessa ci lavorano quaranta minuti. ${label}, livello ${n + 1}.`; } : null, 'non hai abbastanza soldi');
      });
    }
    if (v.stolen) add('ar_vernice', `Rivernicia ${VN} e cambia la targa (80.000 lire, nessuna domanda)`, p.money >= 80 ? () => {
      pay(st, 80); v.color = pick(COLORI.filter(c => c !== v.color)); v.stolen = false; v.owner = null; v._tk = null; v.rev = (v.rev || 0) + 1; startWait(st, 90, 'aspetti che asciughi la vernice');
      return `${nm} non guarda i documenti: «Un'ora e mezza. Quando esce di qui è un'altra macchina.»`;
    } : null, 'non hai abbastanza soldi');
  }
  function startWait(st, mins, label) { spend(st, mins, label); }

  // ---------------- LA CASSA ----------------
  function till(st, out, add) {
    const I = inside(st); if (!I || I.f !== 0 || !O || !O.luogoHere) return;
    const Lg = O.luogoHere(st); if (!Lg || !Lg.shop || !Lg.banco || Lg.bi !== I.bi) return;
    const p = st.player, reg = nearFurn(st, /^ar_cash-register$|^pv_banco_vendita$|^ia_vetrina_armi$|^ia_bancone_bar$/, 2.6);
    if (!reg && dist(Lg.banco.x, Lg.banco.y, p.x, p.y) > 2.6) return;
    const E = Ec && Ec.eco ? Ec.eco(st) : null, Sh = E && E.shops ? E.shops[Lg.k] : null, robbed = st.robbed || (st.robbed = {});
    if (st.t - (robbed[Lg.k] || -1e9) < 12 * 60) { out.push({ id: 'cassa_vuota', label: 'La cassa è vuota: l\'hai già svuotata', run: null, off: '' }); return; }
    const cash = Math.max(0, Sh && Sh.cash !== undefined ? Sh.cash : 60 + rnd() * 80);
    const clerk = O.clerk(st, Lg), here = clerk && !clerk.dead && (clerk.room || dist(clerk.x, clerk.y, p.x, p.y) < 6);
    const take = (q, why) => { q = Math.round(q); p.money += q; if (Sh) Sh.cash = Math.max(0, Sh.cash - q); robbed[Lg.k] = st.t; if (st.me) st.me.stats.guadagnato += q; return q; };
    if (here) {
      add('cassa_rapina', `Rapina la cassa di ${Lg.label} (${clerk.first} è al banco)`, armed(st) ? () => {
        const q = take(Math.max(25, cash * .9 + rnd() * 20));
        clerk.gesture = 2; clerk.stun = Math.max(clerk.stun || 0, 1.5);
        G.say(st, clerk, pick(['Prendi tutto, non sparare!', 'Ecco, ecco… ho dei figli!', 'Va bene, va bene, calma.']), 3);
        const ev = G.emit(st, 'rapina', { target: clerk.id, shopId: Lg.k, shop: Lg.label });
        G.addLog(st, `${G.clockStr(st.t)} · Hai rapinato la cassa di ${Lg.label} (+${L_(q)}).`, 'bad', ev && ev.id);
        // chi è nella stanza scappa o si butta per terra
        others(st, I).forEach(n => { if (n !== clerk && n.room && rnd() < .7) n.room.pose = 'siede_terra'; });
        if (G.panicAround && gun(st)) G.panicAround(st, p.x, p.y, 12, 20);
        st.sfx.push({ k: 'cash' });
        return `${clerk.first} svuota il cassetto con le mani che tremano. +${L_(q)}.`;
      } : null, 'ti serve un\'arma in pugno');
    } else {
      add('cassa_forza', `Forza la cassa di ${Lg.label} (non c'è nessuno al banco)`, () => {
        const q = take(cash * .7);
        st.t += 15;
        const ev = G.emit(st, 'rapina', { shopId: Lg.k, shop: Lg.label });
        G.addLog(st, `${G.clockStr(st.t)} · Hai forzato la cassa di ${Lg.label} (+${L_(q)}).`, 'bad', ev && ev.id);
        if (q) st.sfx.push({ k: 'cash' });
        return q ? `Un quarto d'ora a far leva sul cassetto, poi cede. Dentro: ${L_(q)}.` : 'Il cassetto si apre: vuoto. Hanno già portato via l\'incasso.';
      });
    }
  }

  // ---------------- GIOCARE ----------------
  function games(st, out, add) {
    const I = inside(st); if (!I) return;
    const p = st.player, mates = others(st, I);
    if (nearFurn(st, /^ia_biliardo$/, 2.4)) {
      const foe = mates.find(n => n.room.pose === 'biliardo') || mates.find(n => n.pop && n.pop.intW && n.pop.intW.giochi > .3);
      add('biliardo', foe ? `Sfida ${foe.first} a biliardo (5.000 sul tavolo)` : 'Fai qualche tiro a biliardo (1.000 la partita)', p.money >= (foe ? 5 : 1) ? () => {
        spend(st, 35, 'giochi a biliardo'); svago(st, .3);
        if (!foe) { pay(st, 1); return pick(['Due sponde e la rossa entra. Nessuno ti ha visto, peccato.', 'Il gesso, la stecca, il panno consumato. Si sta bene.']); }
        const win = rnd() < .45 + (st.me && st.me.drunk ? -.15 * st.me.drunk : 0);
        if (win) { p.money += 5; if (foe.ris) foe.ris.bond = clamp(foe.ris.bond - .02, -1, 1); return `Otto in buca d'angolo. ${foe.first} ti allunga i 5.000 lire borbottando.`; }
        pay(st, 5); if (foe.ris) foe.ris.bond = clamp(foe.ris.bond + .03, -1, 1); return `${foe.first} chiude la partita di sponda e intasca i tuoi 5.000. «Rivincita quando vuoi.»`;
      } : null, 'non hai soldi');
    }
    if (nearSpot(st, 'freccette', 1.4)) add('freccette', 'Tira tre freccette', () => {
      spend(st, 10, 'tiri le freccette'); svago(st, .12);
      const s = [0, 0, 0].map(() => rnd() < .08 ? 50 : rnd() < .2 ? 0 : 1 + Math.floor(rnd() * 20) * (rnd() < .15 ? 3 : 1)), tot = s.reduce((a, c) => a + c, 0);
      return `${s.join(', ')}: ${tot} punti.${tot >= 100 ? ' Al bancone qualcuno fischia.' : tot < 20 ? ' Una è finita nel muro.' : ''}`;
    });
    if (nearFurn(st, /^ia_banco_tiro$/, 2.2) || nearSpot(st, 'tiro', 1.5)) add('poligono', 'Spara una serie al poligono (3.000, munizioni comprese)', p.money >= 3 ? () => {
      pay(st, 3); spend(st, 30, 'spari al poligono'); svago(st, .2); const N = st.me && st.me.need; if (N && N.rabbia !== undefined) N.rabbia = clamp(N.rabbia - .2, 0, 1);
      const M = st.me || {}; M.mira = clamp((M.mira || 0) + .03, 0, 1); const hit = Math.round(4 + M.mira * 4 + rnd() * 2);
      return `Dieci colpi, ${Math.min(10, hit)} sul cartone. L'istruttore annuisce: «Il polso è migliorato.»`;
    } : null, 'non hai soldi');
    if (nearFurn(st, /^ia_jukebox$/, 1.8)) add('jukebox', 'Metti un disco nel jukebox (500 lire)', p.money >= .5 ? () => {
      pay(st, .5); svago(st, .08); mates.forEach(n => { if (n.pop && n.pop.need) n.pop.need.svago = clamp((n.pop.need.svago || 0) - .05, 0, 1); });
      return pick(['Parte un pezzo americano, gracchiante. Qualcuno batte il piede.', 'Una canzone napoletana: al bancone cantano tutti il ritornello.', 'Il braccio prende il disco, la puntina gratta, poi la musica.']);
    } : null, 'non hai spiccioli');
    if (nearFurn(st, /^ia_camerino$/, 2)) add('camerino', 'Provati qualcosa in camerino', () => { spend(st, 15, 'ti provi dei vestiti'); svago(st, .1); return pick(['Allo specchio sembri un altro. Il prezzo, però, è quello di prima.', 'Ti sta stretto sulle spalle. La commessa giura che si allarga.']); });
    if (nearFurn(st, /^ia_auto_esposta$/, 2.6)) add('guarda_auto', 'Siediti al volante dell\'auto in esposizione', () => { spend(st, 5, 'sogni a occhi aperti'); svago(st, .06); return 'Il volante è freddo, la pelle dei sedili sa di nuovo. Il cartello col prezzo, meglio non guardarlo.'; });
  }

  // ---------------- [negozi] I SERVIZI: si paga una cosa fatta da qualcuno, non una merce ----------------
  // [tipo di locale, mobile o posto vicino a cui stare, id, etichetta, prezzo (migliaia), minuti, effetto → frase]
  // Servono il commesso al banco (O.clerk) e il locale aperto; il tempo passa davvero (Nino resta lì: spend).
  const SERV = [
    ['barbiere', /^ia_poltrona_barbiere$|^bathroomSink$/, 'barba', 'Capelli e barba dal barbiere', 4, 30, (st, N, M) => { N.igiene = clamp(N.igiene - .35, 0, 1); N.svago = clamp(N.svago - .08, 0, 1); M.ordinato = st.t + 3 * 1440; return ['Rasoio a mano libera, panno caldo, colonia che pizzica. Allo specchio sembri uno che paga le rate.', 'Ti racconta del figlio alla miniera mentre ti sfuma la nuca. Esci che sembri un altro.']; }],
    ['lavanderia', /^washer$/, 'lava', 'Fai lavare e stirare i vestiti', 2, 40, (st, N) => { N.igiene = clamp(N.igiene - .3, 0, 1); return ['Te li ridanno piegati e caldi, con l\'odore di sapone di Marsiglia.', 'Una macchia d\'olio non va via. «Quella è sua, la tenga per ricordo.»']; }],
    ['banja', /^ia_panca_sauna$/, 'sauna', 'Sauna e vapore alla banja', 3, 45, (st, N, M, p) => { N.igiene = 0; N.svago = clamp(N.svago - .2, 0, 1); p.hp = Math.min(100, p.hp + 10); return ['Il vapore ti scioglie il gelo dalle ossa. Fuori, nella neve, ti senti di vetro.', 'Due vecchi reduci sulla panca di sopra parlano piano dei boschi. Smettono quando entri.']; }],
    ['ambulatorio', /^st_tavolo_medico$|^ia_letto_ospedale$/, 'medica', 'Fatti medicare', 6, 30, (st, N, M, p) => { const was = p.hp; p.hp = Math.min(100, p.hp + 45); return [was >= 95 ? 'Ti misurano la pressione e ti dicono di bere meno. Seimila lire per questo.' : 'Punti, garza, un\'iniezione che brucia. Il dottore non chiede come te lo sei fatto.']; }],
    ['sartoria', /^st_macchina_cucire$/, 'rammenda', 'Fatti rammendare e stringere la giacca', 3, 35, (st, N, M) => { M.ordinato = st.t + 2 * 1440; N.svago = clamp(N.svago - .05, 0, 1); return ['Due punti sulla tasca strappata, le maniche accorciate. La giacca di tuo padre ti sta finalmente bene.']; }],
    ['tipografia', /^st_ciclostile$|^fx_machine$/, 'stampa', 'Fai stampare cinquanta volantini (sottobanco)', 5, 40, (st, N, M) => { if (O && O.givePlayer) O.givePlayer(st, 'volantini', 10, true); return ['Il tipografo non legge quello che stampa. «Io faccio inviti a nozze, ha capito?» Ti dà il pacco ancora caldo.']; }],
    ['video', /^pv_banco_vendita$/, 'noleggia', 'Noleggia una videocassetta per stasera', 2, 10, (st, N) => { N.svago = clamp(N.svago - .25, 0, 1); if (O && O.givePlayer) O.givePlayer(st, 'cassetta', 1, true); return ['Un film americano doppiato male, con le macchine che volano. Il commesso ti strizza l\'occhio: «Questa non l\'ha vista la Tutela.»']; }],
    ['bar', /^ia_bancone_bar$/, 'corretto', 'Un caffè corretto al banco', 1.5, 10, (st, N, M) => { N.sonno = clamp(N.sonno - .15, 0, 1); M.drunk = clamp((M.drunk || 0) + .06, 0, 1); return ['Caffè bollente e un dito di grappa. Il bancone è l\'unico posto caldo del porto.', 'Il barista lo corregge senza chiedere. Alla radio il notiziario federale, nessuno ascolta.']; }],
    ['pub', /^ia_bancone_bar$/, 'boccale', 'Un boccale di birra scura', 2, 15, (st, N, M) => { N.svago = clamp(N.svago - .1, 0, 1); N.compagnia = clamp(N.compagnia - .1, 0, 1); M.drunk = clamp((M.drunk || 0) + .12, 0, 1); return ['Schiuma fredda e il calore della sala. Qualcuno ti dà una pacca sulla spalla senza motivo.']; }],
  ];
  function servizi(st, out, add) {
    const I = inside(st); if (!I) return;
    const kind = INT.kindOf(I.b), p = st.player, N = st.me && st.me.need, M = st.me || {}; if (!N) return;
    const Lg = luogoOf(st, I.bi);
    SERV.forEach(([k, re, id, label, cost, mins, fx]) => {
      if (kind !== k || !nearFurn(st, re, 2.6)) return;
      if (!openNow(st, Lg)) { out.push({ id: 'sv_' + id, label: `${label}: è chiuso`, run: null, off: 'non c\'è nessuno' }); return; }
      const who = O && Lg ? O.clerk(st, Lg) : null;
      add('sv_' + id, `${label} (${String(Math.round(cost * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} lire)`, p.money >= cost ? () => {
        pay(st, cost); spend(st, mins, label.toLowerCase()); if (st.sfx) st.sfx.push({ k: 'cash' });
        const t = pick(fx(st, N, M, p)); return who ? `${who.first}: ${t}` : t;
      } : null, 'non hai abbastanza soldi');
    });
  }

  // ---------------- LE AZIONI ----------------
  function actions(st) {
    if (st.me && st.me.warp) return [];
    const out = [], add = (id, label, run, off) => out.push({ id, label, run, off: run ? '' : off || '' });
    if (st.player.vehicle) { garage(st, out, add); return out; }
    try { garage(st, out, add); till(st, out, add); games(st, out, add); servizi(st, out, add); } catch (e) { if (typeof console !== 'undefined') console.error('[attività]', e); }
    return out;
  }
  function install() {
    if (AZ.__attivita) return; AZ.__attivita = true;
    const a0 = AZ.playerActions;
    AZ.playerActions = st => (a0 ? a0(st) || [] : []).concat(actions(st));
  }
  install();
  return { actions, LISTINO, UPG, SERV };
})();
if (typeof module !== 'undefined') module.exports = Attivita;
