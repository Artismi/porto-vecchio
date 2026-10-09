/* Porto Vecchio — [cassaforti] Le cassaforti (solo logica, nessuna grafica).
   - DENTRO C'È L'INCASSO VERO: alle 21 chi chiude la bottega mette in cassaforte la giornata (lascia in cassa un fondo di 20.000),
     alle 8 la riprende per portarla al Banco (soldi.js versa le casse piene alle 9). Lo Squalo, nel suo magazzino, non versa niente:
     la sua cassaforte cresce. Le altre (case dei funzionari, uffici, comando) hanno i soldi e le carte del bottino di oggetti.js.
   - SI APRE IN QUATTRO MODI: con la COMBINAZIONE (in silenzio, tre minuti), che si trova tra le carte di una scrivania dello stesso
     edificio o si compra da chi ci lavora (se ha bisogno di soldi; se no se lo ricorda, e magari lo racconta); con lo STETOSCOPIO,
     ascoltando i cilindri (silenzioso, lungo, non sempre riesce; la mano migliora); col TRAPANO (com'era: tre quarti d'ora, rumore);
     col CANDELOTTO di dinamite (subito, ma lo sentono tutti, brucia le carte e un po' di soldi).
   - SOTTO MINACCIA: durante una rapina, con l'arma in pugno, il commesso la apre lui.
   - LA MATTINA DOPO il padrone se ne accorge: la notizia gira (Radio Porto), e la cassaforte viene rimessa a posto.
   Le azioni compaiono nel menu QUI, ADESSO; il pulsante «apri» del frugare usa il modo migliore che hai. Si prova anche in Node. */
var Cassaforti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const AZ = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const O = typeof Oggetti !== 'undefined' ? Oggetti : require('./oggetti.js');
  const Ec = typeof Economia !== 'undefined' ? Economia : require('./economia.js');
  const PO = typeof Popolo !== 'undefined' ? Popolo : null;
  const INT = G.INT;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const L_ = n => `${Math.round(n)}.000 lire`;
  const ID = 'st_cassaforte';
  const S = st => st.cassaforti || (st.cassaforti = { combo: {}, threat: {}, cerca: {}, offerte: {}, mano: 0, colpi: 0 });

  // ---------------- DOVE SONO ----------------
  const SAFE_B = {};
  function hasSafe(bi) { if (SAFE_B[bi] === undefined) { const b = G.BUILDINGS[bi]; SAFE_B[bi] = !!(b && b.door && INT.layout(b).floors.some(F => F.furn.some(o => o.id === ID))); } return SAFE_B[bi]; }
  function shopOf(st, bi) { const E = Ec.eco(st); return Object.values(E.shops).find(Sh => Sh.t && Sh.t.k === 'b' && Sh.t.bi === bi && !Sh.market) || null; }
  const nameOf = bi => { const b = G.BUILDINGS[bi]; return (b && (b.name || b.use)) || 'una casa'; };

  // ---------------- I SOLDI DENTRO ----------------
  function safeCash(st, bi) { const Sh = shopOf(st, bi); return Sh ? Math.max(0, Sh.safe || 0) : 0; }
  function takeSafe(st, bi, q) { const Sh = shopOf(st, bi); if (Sh) Sh.safe = Math.max(0, (Sh.safe || 0) - q); S(st).colpi += q; }
  // chiamata da oggetti.js ogni volta che si guarda dentro una cassaforte
  function fill(st, C) {
    const M = S(st), Sh = shopOf(st, C.bi);
    if (Sh && !C.items.$safe) { delete C.items.$; C.items.$safe = 1; if (Sh.safe === undefined) Sh.safe = 40 + Math.round(rnd() * 120); }
    // rimessa a posto dopo il colpo: di nuovo chiusa
    if (C.forced && C.fixAt && st.t >= C.fixAt) { C.forced = false; C.locked = true; C.fixAt = null; C.seen = false; C.byThreat = false; }
    // aperta dal commesso sotto minaccia: resta aperta un'ora
    const T = M.threat[C.bi]; if (C.locked && T && st.t - T < 60) { C.locked = false; C.forced = true; C.byThreat = true; C.openedAt = st.t; }
  }

  // ---------------- APRIRE ----------------
  const has = (st, id) => O.pools(st).some(b => (b[id] || 0) >= 1);
  function useOne(st, id) { for (const b of O.pools(st)) if ((b[id] || 0) >= 1) { b[id] -= 1; if (b[id] <= 0) delete b[id]; return true; } return false; }
  const done = (st, C) => { C.locked = false; C.forced = true; C.openedAt = st.t; C.seen = false; };
  // il modo migliore che hai (null: lo lascia fare a oggetti.js, cioè il trapano)
  function open(st, C, how) {
    const M = S(st), p = st.player;
    how = how || (M.combo[C.bi] ? 'combinazione' : has(st, 'stetoscopio') ? 'stetoscopio' : has(st, 'trapano') ? 'trapano' : has(st, 'candelotto') ? 'candelotto' : null);
    if (how === 'combinazione' && M.combo[C.bi]) {
      O.passTime(st, 3); done(st, C);
      const who = rnd() < .15 ? O.caught(st, C.bi, .02, 'la cassaforte') : null;   // tre minuti, senza rumore: ti vede solo chi entra
      return { ok: true, msg: `Destra, sinistra, destra. Al terzo numero la ghiera fa clic e lo sportello si apre.${who ? ` ${who.first} ti ha visto!` : ''}` };
    }
    if (how === 'stetoscopio' && has(st, 'stetoscopio')) {
      const mins = Math.round(30 + rnd() * 35 - M.mano * 20), chance = clamp(.35 + M.mano * .55, 0, .92);
      O.passTime(st, mins); O.wearTools(st, O.pools(st), ['stetoscopio'], mins); M.mano = clamp(M.mano + .05, 0, 1);
      const who = rnd() < .2 + mins / 400 ? O.caught(st, C.bi, .03, 'la cassaforte') : null;   // senza rumore: ti scopre solo chi passa di lì
      if (rnd() < chance) { done(st, C); return { ok: true, msg: `${mins} minuti con l'orecchio sul metallo. Uno, due, tre scatti: aperta.${who ? ` ${who.first} ti ha visto!` : ''}` }; }
      return { ok: false, msg: `${mins} minuti a girare la ghiera: l'ultimo cilindro non lo senti. La mano però si fa.${who ? ` ${who.first} ti ha visto!` : ''}` };
    }
    if (how === 'candelotto' && useOne(st, 'candelotto')) {
      O.passTime(st, 3); done(st, C);
      // le carte bruciano, e qualche banconota con loro
      ['carta_bollata', 'moduli', 'fascicolo', 'tessera_annonaria', 'tessera_partito', 'francobolli'].forEach(k => delete C.items[k]);
      if (C.items.$) C.items.$ = Math.round(C.items.$ * .7); const Sh = shopOf(st, C.bi); if (Sh && Sh.safe) Sh.safe = Math.round(Sh.safe * .75);
      st.sfx.push({ k: 'explosion', x: p.x, y: p.y });
      G.emit(st, 'esplosione', { shop: nameOf(C.bi) });
      if (G.panicAround) try { G.panicAround(st, p.x, p.y, 30, 30); } catch (e) { }
      const who = O.caught(st, C.bi, 1, 'la cassaforte');
      return { ok: true, msg: `La miccia, tre passi indietro, il botto. Lo sportello è piegato, l'aria sa di polvere e carta bruciata.${who ? ` ${who.first} ha visto tutto!` : ' Adesso sbrigati: l\'hanno sentito fino al porto.'}` };
    }
    return null;
  }

  // ---------------- LA COMBINAZIONE ----------------
  const DESK = /^(desk|ia_scrivania_grande|ia_schedario)$/;
  function inside(st) { const p = st.player; if (!p.indoor) return null; const b = G.BUILDINGS[p.indoor.b], L = INT.layout(b); return { bi: p.indoor.b, b, L, f: p.indoor.f, F: L.floors[p.indoor.f] }; }
  function nearFurn(st, re, r) { const I = inside(st); if (!I || !I.F) return null; const p = st.player; let best = null, bd = r || 2; I.F.furn.forEach((o, i) => { if (!re.test(o.id)) return; const d = dist(o.x, o.y, p.x, p.y); if (d < bd) { bd = d; best = { o, i }; } }); return best; }
  // chi conosce la combinazione: chi ci lavora (per le botteghe e gli uffici) o chi ci abita
  const knowsIt = (n, bi) => { const P = n.pop; if (!P) return false; return !!((P.job && P.job.t && P.job.t.k === 'b' && P.job.t.bi === bi) || (P.homeT && P.homeT.k === 'b' && P.homeT.bi === bi)); };
  const note = (st, n, txt, kind, x) => { if (PO && PO._ && PO._.note) try { PO._.note(st, n, txt, kind, x); } catch (e) { } };

  // ---------------- LE AZIONI ----------------
  function actions(st) {
    const out = [], M = S(st), p = st.player, add = (id, label, run, off) => out.push({ id, label, run, off: run ? '' : off || '' });
    if ((st.me && st.me.warp) || p.vehicle) return out;
    const I = inside(st); if (!I || !hasSafe(I.bi)) return out;
    const bi = I.bi, where = nameOf(bi);
    // davanti alla cassaforte: i modi per aprirla
    const sf = nearFurn(st, /^st_cassaforte$/, 2);
    if (sf) {
      const C = O.contByRef(st, 'f:' + sf.i);
      if (C && C.locked) {
        const run = how => () => { const r = how === 'trapano' ? O.act(st, 'apri', 'f:' + sf.i) : open(st, C, how); return r ? r.msg : ''; };
        if (M.combo[bi]) add('cf_combo', 'Apri la cassaforte con la combinazione', run('combinazione'));
        add('cf_steto', `Ascolta i cilindri con lo stetoscopio (in silenzio, mezz'ora o più${M.mano > .2 ? ', la mano è buona' : ''})`, has(st, 'stetoscopio') ? run('stetoscopio') : null, 'ti serve uno stetoscopio (in farmacia)');
        add('cf_trapano', 'Trapana la serratura (tre quarti d\'ora, fa rumore)', has(st, 'trapano') ? run('trapano') : null, 'ti serve un trapano (ferramenta)');
        add('cf_dinamite', 'Fai saltare lo sportello col candelotto (subito, lo sentono tutti)', has(st, 'candelotto') ? run('candelotto') : null, 'ti serve un candelotto di dinamite (lo Squalo, al magazzino)');
      } else if (C && !C.locked) out.push({ id: 'cf_aperta', label: `Cassaforte aperta${safeCash(st, bi) > 0 || C.items.$ ? ': frugala' : ': è vuota'}`, run: null, off: '' });
    }
    if (M.combo[bi]) return out;
    // tra le carte di una scrivania dello stesso edificio
    const dk = nearFurn(st, DESK, 1.8);
    if (dk) {
      const key = bi + ':' + Math.floor(st.t / 1440);
      add('cf_cerca', 'Cerca la combinazione della cassaforte tra le carte (venti minuti)', M.cerca[key] ? null : () => {
        M.cerca[key] = 1; O.passTime(st, 20);
        const room = (INT.roomAt(I.L, I.f, dk.o.x, dk.o.y) || {}).name || '', ch = .25 + (/ufficio|studio|comando|presidenza|portineria|vendite/.test(room) ? .3 : 0);
        const who = O.caught(st, bi, .08, 'tra le carte');
        if (rnd() < ch) { M.combo[bi] = true; const n = [0, 0, 0].map(() => Math.floor(rnd() * 99)).join('-'); return `Sotto il sottomano, scritta a matita su un biglietto del tram: ${n}. Dev'essere quella.${who ? ` ${who.first} ti ha visto!` : ''}`; }
        return `Bollette, ricevute, una lettera mai spedita. La combinazione qui non c'è.${who ? ` ${who.first} ti ha visto!` : ''}`;
      }, 'oggi qui hai già cercato');
    }
    // comprarla da chi la sa
    st.npcs.filter(n => !n.dead && n.pop && !n.cop && !n.faction && knowsIt(n, bi) && dist(n.x, n.y, p.x, p.y) < 2.6).slice(0, 2).forEach(n => {
      const P = n.pop, price = 60, wait = st.t - (M.offerte[n.id] || -1e9) < 2 * 1440;
      add('cf_compra_' + n.id, `Proponi a ${n.first}: la combinazione della cassaforte per ${L_(price)}`, !wait && p.money >= price ? () => {
        M.offerte[n.id] = st.t;
        const need = (P.need && P.need.soldi) || 0, bond = n.ris ? n.ris.bond || 0 : 0, legge = n.tr && n.tr.legge !== undefined ? n.tr.legge : .5;
        const ch = clamp(.12 + need * .55 + bond * .25 + (P.money < 10 ? .15 : 0) - legge * .3, .02, .85);
        if (rnd() < ch) {
          p.money -= price; P.money = (P.money || 0) + price; if (st.me) st.me.stats.speso += price; M.combo[bi] = true;
          note(st, n, `ha venduto a ${G.PLAYER_NAME} la combinazione della cassaforte di ${where}`, 'shady', { w: .8, who: 'player', tag: 'segreto' });
          G.say(st, n, pick(['Non l\'hai sentita da me.', 'Mai visto, mai conosciuto. Chiaro?']), 3);
          return `${n.first} conta i soldi, si guarda intorno, e ti scrive tre numeri sul palmo della mano.`;
        }
        note(st, n, `${G.PLAYER_NAME} mi ha offerto soldi per la combinazione della cassaforte di ${where}`, 'bad', { w: .7, who: 'player', tag: 'sospetto' });
        if (rnd() < .3) G.emit(st, 'corruzione', { target: n.id, shop: where });
        G.say(st, n, pick(['Ma per chi mi hai preso?', 'Vattene, prima che chiami qualcuno.', 'Faccio finta di non aver sentito.']), 3);
        return `${n.first} ti guarda come si guarda un ladro. Adesso sa cosa hai in mente.`;
      } : null, wait ? 'gliel\'hai già chiesto' : 'non hai abbastanza soldi');
    });
    // sotto minaccia: il commesso la apre lui
    const Lg = O.luogoHere ? O.luogoHere(st) : null, clerk = Lg && Lg.shop && Lg.bi === bi ? O.clerk(st, Lg) : null;
    if (clerk && !clerk.dead && dist(clerk.x, clerk.y, p.x, p.y) < 3.5 && !(M.threat[bi] && st.t - M.threat[bi] < 12 * 60)) {
      const armed = !!(p.cur && p.cur !== 'pugni' && G.WEAPONS && G.WEAPONS[p.cur] && !p.hand);
      add('cf_minaccia', `Punta l'arma su ${clerk.first}: «Apri la cassaforte»`, armed ? () => {
        M.threat[bi] = st.t; O.passTime(st, 3); clerk.stun = Math.max(clerk.stun || 0, 2);
        G.say(st, clerk, pick(['Va bene, va bene… la apro.', 'Non sparare, ti do tutto!', 'È nel retro… vieni, la apro.']), 3);
        const ev = G.emit(st, 'rapina', { target: clerk.id, shopId: Lg.k, shop: Lg.label });
        G.addLog(st, `${G.clockStr(st.t)} · Hai costretto ${clerk.name} ad aprire la cassaforte di ${Lg.label}.`, 'bad', ev && ev.id);
        return `${clerk.first} gira la ghiera con le mani che tremano. La cassaforte è aperta: va' a prendere quello che c'è, e in fretta.`;
      } : null, 'ti serve un\'arma in pugno');
    }
    return out;
  }

  // ---------------- LE ORE: la sera dentro, la mattina fuori; e chi si accorge del colpo ----------------
  function hourTick(st, h) {
    const E = Ec.eco(st);
    Object.values(E.shops).forEach(Sh => {
      if (!Sh.t || Sh.t.k !== 'b' || Sh.market || !hasSafe(Sh.t.bi)) return;
      if (Sh.safe === undefined) Sh.safe = 40 + Math.round(rnd() * 120);
      if (h === 21) { const q = Math.max(0, Math.floor((Sh.cash || 0) - 20)); Sh.cash -= q; Sh.safe += q; }
      if (h === 8 && !Sh.black) { const q = Math.max(0, Sh.safe - 30); Sh.safe -= q; Sh.cash = (Sh.cash || 0) + q; }   // un fondo resta dentro
      if (Sh.black) Sh.safe = Math.min(Sh.safe, 3000);
    });
    if (h !== 8) return;
    const M = O.S(st);
    Object.values(M.cont || {}).forEach(C => {
      if (C.fid !== ID || !C.forced || C.seen) return;
      C.seen = true; C.fixAt = st.t + 1440;
      const where = nameOf(C.bi);
      G.feed(st, `Radio Porto: ${C.byThreat ? 'rapina con la pistola' : 'svaligiata la cassaforte'} di ${where}. I Grigi indagano.`, 'radio');
      G.addLog(st, `${G.clockStr(st.t)} · Hanno scoperto la cassaforte aperta di ${where}.`, 'bad');
      st.npcs.filter(n => !n.dead && knowsIt(n, C.bi)).forEach(n => note(st, n, `qualcuno ha svuotato la cassaforte di ${where}`, 'bad', { w: .9, tag: 'furto' }));
    });
  }
  function install() {
    const H = G.HOOKS; if (!H || H.__cassaforti) return; H.__cassaforti = true;
    const s0 = H.step;
    H.step = (st, dt) => { if (s0) s0(st, dt); const M = S(st), hm = Math.floor(st.t / 60); if (M.hour === undefined) M.hour = hm; while (M.hour < hm) { M.hour++; hourTick(st, M.hour % 24); } };
    const a0 = AZ.playerActions;
    AZ.playerActions = st => (a0 ? a0(st) || [] : []).concat(actions(st));
  }
  install();
  return { fill, open, safeCash, takeSafe, hasSafe, actions, hourTick };
})();
if (typeof module !== 'undefined') module.exports = Cassaforti;
