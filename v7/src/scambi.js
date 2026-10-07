/* Porto Vecchio — Gli Scambi tra la gente (solo logica, nessuna grafica).
   Gli abitanti hanno roba vera: le tasche (P.inv) e la casa (P.casa), con gli stessi oggetti dello zaino del giocatore.
   - DESIDERI: ognuno sa cosa gli manca (da mangiare, la legna per l'inverno, le sigarette, l'attrezzo del mestiere,
     le bende se è ferito, la radio se gli piace la musica) e quanto gli preme.
   - ECCEDENZE: quello che ha in più (il pescatore il pesce, il fornaio il pane, l'allevatore uova e latte: la paga in natura;
     il ladro la refurtiva; chiunque, quello che non gli serve).
   - TRATTATIVA: quando due si trovano nello stesso posto, chi cerca chiede a chi ha. Il prezzo lo fanno l'avidità di chi vende,
     il bisogno di chi compra, la simpatia tra i due e quello che si ricordano l'uno dell'altro. Si paga in lire, si baratta
     (roba contro roba, se a chi vende serve), o si dà sulla parola a chi è fidato (un debito). Chi è al verde svende.
   - AIUTO: chi ha un bisogno urgente e niente per pagare chiede a chi gli deve un favore, poi alla famiglia, poi agli amici.
     Chi aiuta se lo ricorda: il favore va ricambiato. Chi non ricambia perde l'amico e finisce nella memoria lunga.
   - PATTI: se chi vende non ce l'ha adesso ma lo produce col suo lavoro, promette: «te lo porto domani» e fissa un appuntamento
     vero (Popolo.appoint). All'appuntamento la roba passa di mano; chi non si presenta ha dato buca e ce lo si ricorda.
   - La roba si usa: si mangia dalla dispensa, si brucia la legna la sera, si fuma, ci si medica.
   Tutto finisce nei diari (e da lì nella memoria lunga): la chat e il Taccuino lo leggono.
   Si aggancia a Game.HOOKS dopo popolo.js, azioni.js, economia.js e oggetti.js. */
var Scambi = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Az = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const Og = typeof Oggetti !== 'undefined' ? Oggetti : require('./oggetti.js');
  const I = Po._, CAT = Og.CAT;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const o = I.o, nm = id => (CAT[id] ? CAT[id].nome : id);
  const L = q => `${Math.round(q * 10) / 10}`.replace('.', ',') + '.000 lire';

  const CFG = { every: 20, tries: 2, near: 30 };

  // ---------------- LA ROBA ----------------
  const bagOf = (n, k) => { const P = n.pop; return k === 'casa' ? (P.casa = P.casa || {}) : (P.inv = P.inv || {}); };
  const has = (n, id) => ((n.pop.inv || {})[id] || 0) + ((n.pop.casa || {})[id] || 0);
  function take(n, id, q) {
    q = q || 1; const P = n.pop;
    for (const k of ['inv', 'casa']) { const B = bagOf(n, k); const t = Math.min(q, B[id] || 0); if (t > 0) { B[id] -= t; q -= t; if (B[id] <= 1e-6) { delete B[id]; if (k === 'inv' && n.hand === id) n.hand = null; } } if (q <= 0) break; }
    return q <= 0;
  }
  // il cibo e la legna vanno a casa, il resto in tasca
  function put(n, id, q) { const c = CAT[id], k = c && (c.heat || c.res === 'viveri' || /^viveri/.test(c.res || '') || c.cat === 'cibo' || c.cat === 'dispensa') ? 'casa' : 'inv'; const B = bagOf(n, k); B[id] = (B[id] || 0) + (q || 1); }
  const isFood = id => { const c = CAT[id]; return !!(c && ((c.eat && c.eat.fame > 0) || /^viveri/.test(c.res || ''))); };
  const isFuel = id => !!(CAT[id] && CAT[id].heat);
  const foodAt = n => Object.keys(Object.assign({}, n.pop.inv, n.pop.casa)).filter(isFood).reduce((s, id) => s + has(n, id), 0);
  const fuelAt = n => Object.keys(n.pop.casa || {}).filter(isFuel).reduce((s, id) => s + has(n, id), 0);
  const value = id => (CAT[id] ? CAT[id].prezzo || 1 : 1);

  // il mestiere: l'attrezzo che serve e quello che si porta a casa (la paga in natura)
  const TOOL = [[/braccian|vignaiol/, 'pala'], [/boscaiol/, 'ascia'], [/carpent|falegnam/, 'sega'], [/fabbr/, 'martello'], [/sart/, 'ago_filo'], [/pescator/, 'canna'], [/cavator|minator/, 'piccone'], [/meccanic/, 'chiave_inglese']];
  const KIND = [[/pescator/, ['pesce', 'sarde', 'polpo']], [/fornai/, ['pane', 'focaccia']], [/allevator/, ['uova', 'latte', 'formaggio']], [/braccian|ortolan|contadin/, ['verdura', 'patate', 'pomodori', 'frutta']],
    [/vignaiol/, ['vino']], [/oliv/, ['olive', 'olio']], [/boscaiol|carbonai/, ['legna', 'carbone']], [/macellai/, ['salsiccia', 'carne']], [/cuoc|^oste/, ['panino']], [/operai/, ['scatolame']], [/salinar/, ['sale']]];
  const jobOf = n => ((n.pop.job && (n.pop.job.base || n.pop.job.title)) || '').toLowerCase();
  const toolFor = n => { const t = TOOL.find(([re]) => re.test(jobOf(n))); return t && CAT[t[1]] ? t[1] : null; };
  const madeBy = n => { const k = KIND.find(([re]) => re.test(jobOf(n))); return k ? k[1].filter(id => CAT[id]) : []; };

  // ---------------- DESIDERI ----------------
  // { ids: [oggetti che vanno bene], label, urg 0..1 }
  function wants(st, n) {
    const P = n.pop, N = P.need || {}, out = [];
    if (foodAt(n) < 2 && (P.pantry || 0) <= 2) out.push({ ids: FOODS, label: 'qualcosa da mangiare', urg: clamp(.35 + (N.fame || 0) * .6, 0, 1) });
    if (fuelAt(n) < 1) out.push({ ids: ['legna', 'carbone'], label: 'legna per la stufa', urg: .35 + (P.cold || 0) * .4 });
    if (P.smoker && !has(n, 'sigarette')) out.push({ ids: ['sigarette'], label: 'sigarette', urg: .3 + (N.rabbia || 0) * .3 });
    if (P.vice === 'vino' && !has(n, 'vino')) out.push({ ids: ['vino'], label: 'una bottiglia', urg: .4 });
    const tl = toolFor(n); if (tl && !has(n, tl)) out.push({ ids: [tl], label: nm(tl), urg: .3 });
    if (n.maxHp && n.hp < n.maxHp * .6 && !has(n, 'bende') && !has(n, 'medicine')) out.push({ ids: ['bende', 'medicine'], label: 'qualcosa per medicarsi', urg: .7 });
    if (P.intW && P.intW.musica > .5 && !(P.owns && P.owns.radio) && CAT.radiolina) out.push({ ids: ['radiolina'], label: 'una radio', urg: .2, own: 'radio' });
    if (P.intW && P.intW.carte > .5 && !has(n, 'carte') && CAT.carte) out.push({ ids: ['carte'], label: 'un mazzo di carte', urg: .15 });
    return out.sort((a, b) => b.urg - a.urg);
  }
  let FOODS = [];
  // quanto tiene per sé di una cosa (il resto si può dare via)
  function keep(n, id) {
    const P = n.pop;
    if (isFood(id)) return 3; if (isFuel(id)) return 2;
    if (id === 'sigarette') return P.smoker ? 1 : 0; if (id === toolFor(n)) return 1;
    if (id === 'radiolina' || id === 'carte' || id === 'orologio' || id === 'catenina') return P.money < 8 ? 0 : 1;
    if (id === 'bende' || id === 'medicine') return 1;
    return CAT[id] && CAT[id].tool ? 1 : 0;
  }
  const spare = (n, id) => Math.max(0, Math.floor(has(n, id) - keep(n, id)));
  const surplus = n => Object.keys(Object.assign({}, n.pop.inv, n.pop.casa)).filter(id => CAT[id] && spare(n, id) > 0 && !/pistola|mitra|lupara|refurtiva_viva/.test(id));

  // ---------------- PERSONE ----------------
  const ok = (st, n) => n && !n.dead && n.pop && n.pop.ints && !(n.jailedUntil > st.t) && !I.isPassive(st, n) && !(n.pop.emer);
  const relA = (st, a, b) => { try { return Az.rel(st, a, b).a; } catch (e) { return 0; } };
  const bump = (st, a, b, da) => { try { Az.moveRel(st, a, b, da, 0); } catch (e) { } };
  const S = st => st.scambi || (st.scambi = { hour: Math.floor(st.t / 60), tick: st.t, stats: { vendite: 0, baratti: 0, sullaParola: 0, regali: 0, rifiuti: 0, aiuti: 0, aiutiNegati: 0, favoriResi: 0, ingrati: 0, patti: 0, pattiTenuti: 0, pattiRotti: 0, svendite: 0, mangiato: 0, bruciato: 0 } });
  const visible = (st, n) => n.pop.near && !n.inside && Math.hypot(n.x - st.player.x, n.y - st.player.y) < CFG.near;
  const talk = (st, n, text, d) => { if (visible(st, n) && st.clock > (n.barkCd || 0)) { G.say(st, n, text, d || 2.6); n.barkCd = st.clock + 6; } };
  // i debiti di favore: P.debiti[id] = quanto devo a id (in migliaia di lire, anche per roba o aiuto)
  const owe = (a, b, v, why, st) => { const D = a.pop.debiti = a.pop.debiti || {}; D[b.id] = D[b.id] || { v: 0, t: st.t, why }; D[b.id].v += v; D[b.id].why = why; };
  const owedTo = (a, b) => (a.pop.debiti && a.pop.debiti[b.id] ? a.pop.debiti[b.id].v : 0);

  // ---------------- LA TRATTATIVA ----------------
  // chi vende chiede: il valore, più la sua avidità, meno la simpatia; chi è al verde svende
  function ask(st, seller, buyer, id) {
    const base = value(id), avid = seller.tr ? seller.tr.avid : .5, a = relA(st, seller, buyer), N = seller.pop.need || {};
    let p = base * (.85 + avid * .55) * (1 - Math.max(0, a) * .35);
    if (N.soldi > .6) p *= .8;
    if (owedTo(seller, buyer) > 0) p *= .5;   // a chi mi ha aiutato faccio un prezzo
    return Math.max(.2, Math.round(p * 10) / 10);
  }
  // chi compra arriva fino a: il valore per quanto gli preme, meno se ha pochi soldi
  const maxPay = (st, buyer, id, urg) => value(id) * (.9 + urg * .9) * (buyer.pop.money < 15 ? .75 : 1);
  function deal(st, buyer, seller, w, id) {
    const PB = buyer.pop, PS = seller.pop, X = S(st).stats, c = nm(id);
    // la memoria decide prima del prezzo: da chi ti ha fregato non si compra, a chi ti ha fregato non si vende
    const ob = Po.opinionOf(st, buyer, seller.id), os = Po.opinionOf(st, seller, buyer.id);
    if (rnd() < .5) Po.recall(st, buyer, { who: seller.id });
    if (ob < -.35) { if (rnd() < .3) I.note(st, buyer, `non compra niente da ${seller.first}, dopo quello che è successo`, 'info', { who: seller.id, w: .2 }); return false; }
    if (os < -.4) { X.rifiuti++; talk(st, seller, 'A te non vendo niente.'); I.note(st, buyer, `${seller.first} non gli ha voluto dare ${c}`, 'bad', { who: seller.id, w: .3 }); bump(st, buyer, seller, -.03); return false; }
    // in famiglia non si vende: si dà
    if (PB.hh && PB.hh === PS.hh) { take(seller, id, 1); put(buyer, id, 1); return true; }
    const p = ask(st, seller, buyer, id), m = maxPay(st, buyer, id, w.urg);
    talk(st, buyer, pick([`Ce l'hai ${c}?`, `Mi daresti ${c}?`, `Quanto vuoi per ${c}?`]));
    // tirare sul prezzo: si chiude a metà se non sono troppo lontani
    let price = p <= m ? p : p <= m * 1.25 && (rnd() < .5 + relA(st, seller, buyer) * .4) ? Math.round((p + m) / 2 * 10) / 10 : null;
    if (price !== null && PB.money >= price) {
      take(seller, id, 1); put(buyer, id, 1); PB.money -= price; PS.money += price; X.vendite++;
      if (w.own) PB.owns[w.own] = true;
      talk(st, seller, price < value(id) * .8 ? pick(['Te lo lascio a poco, va.', 'Per te, prezzo d\'amico.']) : pick([`${L(price)}.`, 'Affare fatto.']));
      I.note(st, buyer, `comprato ${c} da ${seller.first} per ${L(price)}`, 'info', { who: seller.id, w: .2, tag: 'scambio' });
      I.note(st, seller, `venduto ${c} a ${buyer.first} per ${L(price)}`, 'info', { who: buyer.id, w: .2, tag: 'scambio' });
      bump(st, buyer, seller, .02); bump(st, seller, buyer, .02); return true;
    }
    // il baratto: roba contro roba, se a chi vende serve qualcosa che chi compra ha in più
    const sw = wants(st, seller), mine = surplus(buyer);
    const swap = mine.filter(x => x !== id && sw.some(v => v.ids.includes(x)) && value(x) * spare(buyer, x) >= (price || p) * .7).sort((a, b) => value(a) - value(b))[0]
      || (seller.tr && seller.tr.avid > .6 ? mine.filter(x => x !== id && value(x) >= (price || p) * 1.2).sort((a, b) => value(a) - value(b))[0] : null);
    if (swap) {
      const q = Math.max(1, Math.min(spare(buyer, swap), Math.ceil((price || p) / value(swap))));
      take(seller, id, 1); put(buyer, id, 1); take(buyer, swap, q); put(seller, swap, q); X.baratti++;
      if (w.own) PB.owns[w.own] = true;
      talk(st, buyer, `Ti do ${q > 1 ? q + ' × ' : ''}${nm(swap)} in cambio?`); talk(st, seller, 'Va bene, scambio.');
      I.note(st, buyer, `scambiato ${nm(swap)} con ${c} di ${seller.first}`, 'info', { who: seller.id, w: .25, tag: 'scambio' });
      I.note(st, seller, `scambiato ${c} con ${nm(swap)} di ${buyer.first}`, 'info', { who: buyer.id, w: .25, tag: 'scambio' });
      bump(st, buyer, seller, .03); bump(st, seller, buyer, .03); return true;
    }
    // sulla parola: a chi è fidato (o a chi soffre davvero, se chi vende ha buon cuore) si dà e si paga dopo
    const trust = os + relA(st, seller, buyer) * .6 + (w.urg > .7 ? (1 - (seller.tr ? seller.tr.avid : .5)) * .4 : 0);
    if (trust > .25) {
      const v = price || p; take(seller, id, 1); put(buyer, id, 1); owe(buyer, seller, v, c, st); X.sullaParola++;
      if (w.own) PB.owns[w.own] = true;
      talk(st, seller, pick(['Me lo paghi quando puoi.', 'Tienilo, poi facciamo i conti.']));
      I.note(st, buyer, `${seller.first} gli ha dato ${c} sulla parola: gli deve ${L(v)}`, 'info', { who: seller.id, w: .45, tag: 'debito' });
      I.note(st, seller, `dato ${c} a ${buyer.first} sulla parola (${L(v)})`, 'info', { who: buyer.id, w: .35, tag: 'debito' });
      bump(st, buyer, seller, .05); return true;
    }
    X.rifiuti++; talk(st, seller, pick(['Troppo poco.', 'Non se ne parla.', 'Torna quando hai i soldi.']));
    if (w.urg > .5) I.note(st, buyer, `${seller.first} non gli ha dato ${c}: troppo caro`, 'info', { who: seller.id, w: .2 });
    return false;
  }
  // chi è al verde prova a vendere quello che ha in più a chi ha qualche soldo
  function sellOff(st, seller, group) {
    const PS = seller.pop; if (!(PS.need && PS.need.soldi > .55) && PS.money > 5) return false;
    const goods = surplus(seller); if (!goods.length) return false;
    const id = pick(goods), b = group.filter(k => k !== seller && k.pop.money > 15 && k.pop.hh !== PS.hh && Po.opinionOf(st, k, seller.id) > -.3 && (isFood(id) ? foodAt(k) < 6 : isFuel(id) ? fuelAt(k) < 4 : !has(k, id)))
      .sort((a, b) => relA(st, b, seller) - relA(st, a, seller))[0];
    if (!b) return false;
    const price = Math.max(.2, Math.round(value(id) * (.55 + rnd() * .25) * 10) / 10);
    talk(st, seller, pick([`Ti interessa ${nm(id)}? Te lo do a poco.`, `${cap(nm(id))}, ${L(price)}. Ne ho bisogno.`]));
    if (rnd() > .45 + relA(st, b, seller) * .4 + (1 - (b.tr ? b.tr.avid : .5)) * .2) { talk(st, b, 'No, grazie.'); return false; }
    take(seller, id, 1); put(b, id, 1); b.pop.money -= price; PS.money += price; S(st).stats.svendite++;
    talk(st, b, 'Dai, lo prendo.');
    I.note(st, seller, `ha dovuto svendere ${nm(id)} a ${b.first} (${L(price)})`, 'bad', { who: b.id, w: .3, tag: 'scambio' });
    I.note(st, b, `comprato ${nm(id)} da ${seller.first}, che aveva bisogno di soldi`, 'info', { who: seller.id, w: .25, tag: 'scambio' });
    return true;
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // ---------------- IL MERCATO DELLA GENTE ----------------
  // ogni tanto, in ogni posto dove c'è più di una persona, qualcuno chiede e qualcuno offre
  function market(st) {
    const groups = {};
    st.npcs.forEach(n => { if (ok(st, n) && n.pop.at) { const k = I.tkey(n.pop.at); (groups[k] = groups[k] || []).push(n); } });
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      for (let t = 0; t < CFG.tries; t++) {
        const a = pick(g); if (a.pop.cur && a.pop.cur.act === 'sonno') continue;
        const W = wants(st, a);
        if (W.length && rnd() < .5 + W[0].urg * .5) {
          const w = W[0];
          // chi ce l'ha in più, qui; poi chi ce l'ha comunque e ci tiene poco
          let best = null;
          for (const b of g) { if (b === a || (b.pop.cur && b.pop.cur.act === 'sonno')) continue; const id = w.ids.find(x => spare(b, x) > 0); if (id) { best = [b, id]; break; } }
          if (best) { deal(st, a, best[0], w, best[1]); continue; }
          // nessuno ce l'ha ma qualcuno lo fa col suo lavoro: un patto per domani
          const maker = g.find(b => b !== a && madeBy(b).some(x => w.ids.includes(x)) && !b.pop.appt && !a.pop.appt);
          if (maker) { promise(st, a, maker, w, madeBy(maker).find(x => w.ids.includes(x))); continue; }
          if (w.urg > .55) askHelp(st, a, w);
        } else sellOff(st, a, g);
      }
    });
  }

  // ---------------- I PATTI: «te lo porto domani» ----------------
  function promise(st, buyer, seller, w, id) {
    const P = seller.pop, job = P.job; if (!job) return false;
    const day = Math.floor(st.t / 1440) + 1, endMin = Math.min(job.end * 60 + 20, 21 * 60), when = day * 1440 + (job.night ? 12 * 60 : endMin);
    const price = ask(st, seller, buyer, id), place = buyer.pop.at && buyer.pop.at.k === 'p' ? buyer.pop.at : (P.job.t || buyer.pop.at);
    if (buyer.pop.money < price * .8 && Po.opinionOf(st, seller, buyer.id) < .3) return false;
    const ap = Po.appoint(st, seller, buyer, place, when, `consegna di ${nm(id)}`); if (!ap) return false;
    ap.deal = { id, price, seller: seller.id, buyer: buyer.id }; if (ap.twin) ap.twin.deal = ap.deal;
    S(st).stats.patti++;
    talk(st, buyer, `Mi servirebbe ${nm(id)}.`); talk(st, seller, `Te lo porto domani a ${place.label}. ${L(price)}.`);
    I.note(st, buyer, `${seller.first} ha promesso di portargli ${nm(id)} domani a ${place.label}`, 'info', { who: seller.id, w: .35, tag: 'patto' });
    I.note(st, seller, `promesso ${nm(id)} a ${buyer.first} per domani`, 'info', { who: buyer.id, w: .35, tag: 'patto' });
    return true;
  }
  // all'appuntamento: chi c'era, chi ha la roba, chi paga
  I.MEET.push((st, a, b, ap, cameA, cameB) => {
    const D = ap.deal; if (!D) return; const X = S(st).stats;
    const seller = G.byId(st, D.seller), buyer = G.byId(st, D.buyer); if (!seller || !buyer || !seller.pop || !buyer.pop) return;
    const sCame = seller === a ? cameA : cameB, bCame = buyer === a ? cameA : cameB;
    if (sCame && bCame) {
      if (!has(seller, D.id)) put(seller, D.id, 1);   // l'ha preso dal lavoro
      take(seller, D.id, 1); put(buyer, D.id, 1);
      const paid = Math.min(D.price, Math.max(0, buyer.pop.money)); buyer.pop.money -= paid; seller.pop.money += paid; if (paid < D.price) owe(buyer, seller, D.price - paid, nm(D.id), st);
      X.pattiTenuti++;
      I.note(st, buyer, `${seller.first} ha mantenuto la parola: ${nm(D.id)} consegnato`, 'good', { who: seller.id, w: .45, tag: 'patto' });
      I.note(st, seller, `consegnato ${nm(D.id)} a ${buyer.first}${paid < D.price ? ', ma non aveva tutti i soldi' : ''}`, paid < D.price ? 'info' : 'good', { who: buyer.id, w: .3, tag: 'patto' });
      bump(st, buyer, seller, .06); bump(st, seller, buyer, .04);
    } else {
      X.pattiRotti++;
      const liar = !sCame ? seller : buyer, wronged = liar === seller ? buyer : seller;
      I.note(st, wronged, liar === seller ? `${seller.first} aveva promesso ${nm(D.id)} e non si è fatt${o(seller)} vedere` : `${buyer.first} ha fatto portare ${nm(D.id)} per niente`, 'bad', { who: liar.id, w: .55, tag: 'bidone' });
      bump(st, wronged, liar, -.1);
    }
  });

  // ---------------- CHIEDERE AIUTO, RICAMBIARE ----------------
  function askHelp(st, n, w) {
    const P = n.pop, X = S(st).stats; if (st.t - (P.askedAt || -1e9) < 900) return false;
    if (P.money > value(w.ids[0]) * 2 + 4) return false;   // chi può pagare non chiede: va a comprarlo
    P.askedAt = st.t; const no = [];
    // prima chi mi deve un favore, poi la famiglia, poi gli amici; chi mi è antipatico no
    const hh = (st.pop.households[P.hh] || { members: [] }).members.map(id => G.byId(st, id));
    const debtors = st.npcs.filter(k => k.pop && k.pop.debiti && k.pop.debiti[n.id] && k.pop.debiti[n.id].v > 0);
    const friends = (P.friends || []).map(id => G.byId(st, id));
    const seen = new Set(), cands = [];
    [[debtors, 'debt'], [hh, 'fam'], [friends, 'friend']].forEach(([list, why]) => list.forEach(k => { if (k && k !== n && ok(st, k) && !seen.has(k.id) && Po.opinionOf(st, n, k.id) > -.3) { seen.add(k.id); cands.push([k, why]); } }));
    for (const [k, why] of cands.slice(0, 4)) {
      const id = w.ids.find(x => has(k, x) > (why === 'fam' ? 0 : keep(k, x) * .5));
      const money = !id && k.pop.money > value(w.ids[0]) * 2 + 10 ? Math.round(value(w.ids[0]) * 1.5) : 0;
      if (!id && !money) continue;
      // decide chi aiuta: quanto gli vuole bene, cosa si ricorda, se deve un favore, quanto è avaro, se è al verde lui
      const pYes = .2 + I.closeness(st, k, n) * .45 + Po.opinionOf(st, k, n.id) * .3 + (why === 'debt' ? .45 : 0) - (k.tr ? k.tr.avid * .25 : .12) - ((k.pop.need || {}).soldi || 0) * .25;
      if (rnd() < pYes) {
        if (id) { take(k, id, 1); put(n, id, 1); if (w.own) P.owns[w.own] = true; } else { k.pop.money -= money; P.money += money; }
        const what = id ? nm(id) : L(money); X.aiuti++;
        if (why === 'debt') { const D = k.pop.debiti[n.id]; D.v -= id ? value(id) : money; if (D.v <= 0) delete k.pop.debiti[n.id]; X.favoriResi++;
          I.note(st, k, `ha ricambiato il favore a ${n.first} (${what})`, 'good', { who: n.id, w: .35, tag: 'favore' }); I.note(st, n, `${k.first} gli ha ricambiato il favore: ${what}`, 'good', { who: k.id, w: .4, tag: 'favore' }); }
        else if (why === 'fam') I.note(st, n, `${k.first} gli ha dato ${what}`, 'good', { who: k.id, w: .2, tag: 'aiuto' });
        else { owe(n, k, id ? value(id) : money, what, st); I.note(st, n, `chiesto aiuto a ${k.first}: gli ha dato ${what}. Ora gli deve un favore`, 'good', { who: k.id, w: .5, tag: 'favore' }); I.note(st, k, `aiutato ${n.first} (${what}): mi deve un favore`, 'good', { who: n.id, w: .45, tag: 'favore' }); }
        bump(st, n, k, .08); talk(st, n, `Grazie, ${k.first}. Non me lo scordo.`);
        return true;
      }
      X.aiutiNegati++;
      if (why === 'debt') { X.ingrati++; I.note(st, n, `${k.first} non ha ricambiato il favore, dopo quello che ho fatto per lui`, 'bad', { who: k.id, w: .6, tag: 'tradimento' }); bump(st, n, k, -.15); if (rnd() < .4) P.friends = (P.friends || []).filter(x => x !== k.id); }
      else no.push(k);
    }
    if (no.length) I.note(st, n, `chiesto aiuto a ${no.map(k => k.first).join(' e ')}, ma niente`, 'bad', { who: no[0].id, w: .3, tag: 'aiuto' });
    return false;
  }
  // i debiti si pagano quando si può; chi lascia passare troppo tempo se lo sente rinfacciare (e perde l'amico)
  function settle(st) {
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || !P.debiti || n.dead) return;
      Object.entries(P.debiti).forEach(([id, D]) => {
        const k = G.byId(st, id); if (!k || k.dead || !k.pop) { delete P.debiti[id]; return; }
        const honest = n.tr ? n.tr.legge * .5 + (1 - n.tr.avid) * .5 : .5;
        if (P.money > D.v + 15 && rnd() < .3 + honest * .6) {
          P.money -= D.v; k.pop.money += D.v; delete P.debiti[id]; S(st).stats.favoriResi++;
          I.note(st, k, `${n.first} ha saldato il debito (${L(D.v)})`, 'good', { who: n.id, w: .35, tag: 'favore' }); I.note(st, n, `saldato il debito con ${k.first}`, 'info', { who: k.id, w: .25 });
          bump(st, k, n, .05);
        } else if (st.t - D.t > 8 * 1440 && !D.warned) {
          D.warned = true; S(st).stats.ingrati++;
          I.note(st, k, `${n.first} non ha mai pagato ${D.why}: non ci si può fidare`, 'bad', { who: n.id, w: .55, tag: 'bidone' }); bump(st, k, n, -.15);
          if (k.pop.friends) k.pop.friends = k.pop.friends.filter(x => x !== n.id);
        }
      });
    });
  }

  // ---------------- LA ROBA SI USA ----------------
  function hour(st, hr) {
    const X = S(st).stats;
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || !P.ints || n.jailedUntil > st.t) return;
      const act = P.cur && P.cur.act;
      // la paga in natura: chi lavora si porta a casa un po' di quello che fa
      if (act === 'lavoro') { const m = madeBy(n); if (m.length && rnd() < .12) { const id = pick(m); if (has(n, id) < 6) put(n, id, 1); } }
      // si mangia quello che si ha, se c'è fame (a casa o dalle tasche)
      if ((P.need || {}).fame > .55) { const id = Object.keys(Object.assign({}, P.inv, act === 'casa' || act === 'pranzo' ? P.casa : {})).filter(isFood).sort((a, b) => value(a) - value(b))[0]; if (id && take(n, id, 1)) { P.need.fame = clamp(P.need.fame - Math.max(.15, (CAT[id].eat && CAT[id].eat.fame) || .25) * 1.4, 0, 1); X.mangiato++; } }
      // la sera a casa si accende la stufa: senza legna si sta al freddo (e lo si vuole di più)
      if (hr === 20 && (act === 'casa' || act === 'sonno' || act === 'pranzo')) {
        const id = Object.keys(P.casa || {}).find(isFuel);
        if (id && take(n, id, 1)) { P.cold = 0; X.bruciato++; } else { P.cold = clamp((P.cold || 0) + .25, 0, 1); if (P.cold > .5 && rnd() < .3) I.note(st, n, 'a casa si gela: niente legna per la stufa', 'bad', { w: .25, tag: 'freddo' }); }
      }
      // chi è ferito si medica
      if (n.maxHp && n.hp < n.maxHp * .7) { const id = ['bende', 'medicine'].find(x => has(n, x)); if (id && take(n, id, 1)) n.hp = Math.min(n.maxHp, n.hp + ((CAT[id].eat && CAT[id].eat.hp) || 8)); }
    });
    if (hr === 19) settle(st);
  }

  // ---------------- AGGANCI ----------------
  function install() {
    const H = G.HOOKS; if (H.__scambi) return; H.__scambi = true;
    FOODS = Object.keys(CAT).filter(isFood);
    const s0 = H.step;
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const M = S(st), hm = Math.floor(st.t / 60);
      while (M.hour < hm) { M.hour++; hour(st, M.hour % 24); }
      if (st.t - M.tick >= CFG.every) { M.tick = st.t; market(st); }
    };
  }
  install();
  function report(st) { return Object.assign({}, S(st).stats); }
  return { CFG, wants, surplus, has, put, take, deal, askHelp, promise, market, report };
})();
if (typeof module !== 'undefined') module.exports = Scambi;
