/* Porto Vecchio — La Convivenza: dire e fare la stessa cosa (solo logica, nessuna grafica).
   - COERENZA: la chat col giocatore riceve la vita vera del personaggio (cosa sta facendo, gli impegni di oggi, gli
     appuntamenti, i patti, i debiti, cosa ha in tasca, cosa gli manca, di chi si fida, cosa ha detto in giro, la memoria
     lunga) e la regola di non inventare niente. Quello che ci si dice in chat finisce nel diario (e nella memoria lunga):
     il personaggio se lo ricorda anche in giro. Per strada si parla delle cose vere: l'appuntamento di stasera, la legna
     che ti porta Totò domani, i soldi che devi a Gino.
   - APPUNTAMENTI COL GIOCATORE: verbo «appuntamento» (luogo, ora, giorno). Il personaggio se lo segna, ci va davvero
     all'ora giusta (è un blocco della sua giornata) e ti aspetta. Se vieni ti saluta e se lo ricorda bene; se non vieni
     se lo ricorda male (e la fiducia cala). Se ha già un impegno a quell'ora te lo dice.
   - AIUTO COL GIOCATORE: «chiedi_aiuto» (ti chiede quello che gli manca davvero), «ricevi» (gli dai una cosa dal tuo zaino:
     se era quello che gli serviva ti deve un favore), «accompagna» (viene con te per qualche ora, anche se non è della
     Risacca). Chi ti deve un favore fa più volentieri quello che chiedi, e quando lo fa il favore è ricambiato.
   - AGIRE INSIEME TRA LORO: chi ha in programma un lavoro da fare (sistemare la Vespa, zappare l'orto, cucinare il pranzo
     della domenica…) chiede a un amico di dargli una mano: appuntamento vero sul posto. Se vengono tutti e due lo fanno
     insieme (e chi ha aiutato si aspetta di essere ricambiato); se l'amico non viene, buca.
   Si aggancia a Game.HOOKS e a Risacca.EXT dopo popolo.js, risacca.js, scambi.js. */
var Convivenza = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : require('./risacca.js');
  const Sc = typeof Scambi !== 'undefined' ? Scambi : (typeof require !== 'undefined' ? require('./scambi.js') : null);
  const Og = typeof Oggetti !== 'undefined' ? Oggetti : null;
  const I = Po._, PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const NAME = () => G.PLAYER_NAME || 'Nino';
  const nm = id => (Og && Og.CAT[id] ? Og.CAT[id].nome : id);
  const hhmm = I.hhmm, minOfDay = I.minOfDay, dayIdx = I.dayIdx;
  const dayWord = (st, t) => { const d = dayIdx(t) - dayIdx(st.t); return d === 0 ? 'oggi' : d === 1 ? 'domani' : Po.WEEK[(dayIdx(t) + 1) % 7]; };
  const S = st => st.conv || (st.conv = { hour: Math.floor(st.t / 60), stats: { appGiocatore: 0, venuto: 0, bidoneGiocatore: 0, bidoneNpc: 0, chiesto: 0, ricevuto: 0, accompagna: 0, insiemeChiesti: 0, insiemeFatti: 0, insiemeBuca: 0, favoriAlGiocatore: 0 } });

  // ---------------- COSA HA DETTO IN GIRO ----------------
  // ogni battuta detta resta (le ultime 5): la chat la conosce, così non si contraddice
  const say0 = G.say;
  G.say = function (st, n, text, d) { if (n && text && n !== st.player) { const L = n.said = n.said || []; if (!L.length || L[L.length - 1].text !== text) { L.push({ t: st.t, text: String(text).slice(0, 120) }); if (L.length > 5) L.shift(); } } return say0.apply(this, arguments); };

  // ---------------- LA CHAT VEDE LA VITA VERA ----------------
  function lifeNow(st, n) {
    const P = n.pop; if (!P || !P.plan) return '';
    const out = [], m = minOfDay(st.t);
    const d = Po.doing ? Po.doing(st, n) : ''; if (d) out.push(`ADESSO: ${d}.`);
    const next = P.plan.filter(b => b.at > m && b.act !== 'sonno').slice(0, 4).map(b => `${hhmm(b.at)} ${b.label}${b.tgt && b.tgt.label && !b.label.includes(b.tgt.label) ? ` (${I.isHomeT(P, b.tgt) ? 'a casa' : b.tgt.label})` : ''}`);
    if (next.length) out.push(`IL RESTO DELLA GIORNATA: ${next.join('; ')}.`);
    const ap = P.appt; if (ap && ap.t > st.t - 60) out.push(`APPUNTAMENTO: ${ap.with === 'player' ? `con te (${NAME()})` : `con ${G.nameOf(st, ap.with)}`} ${dayWord(st, ap.t)} alle ${hhmm(minOfDay(ap.t))} a ${ap.label}${ap.why ? ` (${ap.why})` : ''}.`);
    if (ap && ap.deal && ap.deal.id) out.push(ap.deal.seller === n.id ? `HA PROMESSO di portare ${nm(ap.deal.id)} a ${G.nameOf(st, ap.deal.buyer)}.` : `ASPETTA che ${G.nameOf(st, ap.deal.seller)} gli porti ${nm(ap.deal.id)}.`);
    const deb = Object.entries(P.debiti || {}).map(([id, D]) => `${Math.round(D.v)}.000 lire a ${G.nameOf(st, id)}${D.why ? ` (${D.why})` : ''}`); if (deb.length) out.push(`HA DEBITI: ${deb.join('; ')}.`);
    const cred = st.npcs.filter(k => k.pop && k.pop.debiti && k.pop.debiti[n.id]).slice(0, 4).map(k => `${k.first} (${Math.round(k.pop.debiti[n.id].v)}.000)`); if (cred.length) out.push(`GLI DEVONO QUALCOSA: ${cred.join(', ')}.`);
    const bag = Object.entries(Object.assign({}, P.casa, P.inv)).filter(([, q]) => q > 0).slice(0, 10).map(([id, q]) => `${nm(id)}${q > 1 ? ' ×' + Math.round(q) : ''}`);
    out.push(`HA (tasche e casa): ${bag.join(', ') || 'quasi niente'}. Soldi: ${Math.round(P.money)}.000 lire.`);
    if (Sc) { const W = Sc.wants(st, n).slice(0, 3).map(w => w.label); if (W.length) out.push(`GLI MANCA: ${W.join(', ')}.`); }
    const fr = (P.friends || []).slice(0, 5).map(id => G.nameOf(st, id)); if (fr.length) out.push(`AMICI: ${fr.join(', ')}.`);
    const no = st.npcs.filter(k => k !== n && k.pop && Po.opinionOf(st, n, k.id) < -.3).slice(0, 4).map(k => k.first); if (no.length) out.push(`NON SI FIDA DI: ${no.join(', ')}.`);
    const op = Po.opinionOf(st, n, 'player'); if (Math.abs(op) > .15) out.push(`DI TE (${NAME()}) PENSA: ${op > 0 ? 'bene' : 'male'}, per quello che si ricorda.`);
    if (n.__ap && n.__ap.said) out.push(`È VENUTO A DIRTI: «${n.__ap.line}»`);   // [vivi]
    if (P.askPlayer && st.t - P.askPlayer.t < 600) out.push(`TI HA CHIESTO: ${P.askPlayer.label} (se gliela dai: verbo "ricevi").`);
    if (P.debiti && P.debiti.player) out.push(`TI DEVE UN FAVORE (${P.debiti.player.why || 'per quello che hai fatto'}): lo ricambia volentieri.`);
    const said = (n.said || []).slice(-3).map(x => `«${x.text}»`); if (said.length) out.push(`HA DETTO DI RECENTE IN GIRO: ${said.join(' ')}.`);
    const lg = (P.lunga || []).slice().sort((a, b) => b.w - a.w).slice(0, 4).map(e => e.text); if (lg.length) out.push(`NON DIMENTICA: ${lg.join('; ')}.`);
    return '[LA SUA VITA] ' + out.join(' ');
  }
  RS.EXT.stateExtra.push(lifeNow);
  RS.EXT.rulesExtra.push(() => [
    'COERENZA: parla solo di quello che risulta da [LA SUA VITA], dalla scheda e da quello che sa. Non inventare appuntamenti, oggetti, soldi o fatti che non ci sono. Se ha un impegno, ci va; se ha già un appuntamento a quell\'ora, lo dice.',
    'Quello che promette lo deve fare: se vi date appuntamento usa il verbo "appuntamento" (luogo = id, ora = "18" o "18:30", giorno = "oggi" o "domani"); se ti chiede qualcosa che gli manca usa "chiedi_aiuto" (cosa); se il giocatore gli dà una cosa dal suo zaino usa "ricevi" (oggetto, quanto); se viene con il giocatore usa "accompagna" (ore). Questi verbi li può usare chiunque, anche chi non è della Risacca.',
  ].join('\n'));

  // ---------------- LA CHAT NEL DIARIO ----------------
  RS.EXT.onReply.push((st, n, text, said, out, resp) => {
    if (!n.pop) return;
    // senza modello: la frase la decide quello che è successo davvero
    if (resp && resp.__fb) {
      const f = v => (out || []).find(o => o.verb === v);
      const ap = f('appuntamento'), ch = f('chiedi_aiuto'), rc = f('ricevi'), ac = f('accompagna');
      const line = ap ? (ap.ok ? `Va bene. ${ap.msg.replace(/^Appuntamento con [^:]+: /, '').replace(/^./, c => c.toUpperCase())} Non farmi aspettare.` : ap.msg.startsWith('Ha già') || ap.msg.startsWith('A quell') ? `Non posso. ${ap.msg}` : null)
        : ch && ch.ok ? `Visto che chiedi… ${ch.msg.replace(/^.*ti chiede: /, 'mi servirebbe ').replace(/\.$/, '')}.` : ch ? 'Grazie, ma non mi manca niente.'
        : rc && rc.ok ? (/favore/.test(rc.msg) ? 'Proprio quello che mi serviva. Non me lo scordo.' : 'Grazie, sei gentile.')
        : ac && ac.ok ? 'Va bene, vengo con te. Ma non troppo.' : ac ? ac.msg : null;
      if (line) { said.text = line; try { const R0 = JSON.parse(said.raw || '{}'); R0.risposta = line; said.raw = JSON.stringify(R0); } catch (e) { } }
    }
    const mem = resp && resp.memoria ? String(resp.memoria).slice(0, 140) : `${NAME()} gli ha detto: «${String(text).slice(0, 80)}»`;
    Po.note(st, n, `parlato con ${NAME()}: ${mem}`, 'info', { who: 'player', w: .3, tag: 'chat' });
    // chi ti deve un favore e fa quello che chiedi: il favore è ricambiato
    const P = n.pop, done = (out || []).filter(o => o.ok && !['ricevi', 'ricevi_soldi', 'chiedi_aiuto', 'racconta'].includes(o.verb));
    if (done.length && P.debiti && P.debiti.player) { delete P.debiti.player; S(st).stats.favoriAlGiocatore++; Po.note(st, n, `ha ricambiato il favore a ${NAME()}`, 'good', { who: 'player', w: .4, tag: 'favore' }); out.push({ ok: true, msg: `${n.first} ha ricambiato il favore.` }); }
  });
  // la volontà: chi ti deve un favore è più disponibile, chi l'hai lasciato ad aspettare meno
  const wm0 = RS.EXT.willMod;
  RS.EXT.willMod = (st, n, verb) => {
    let s = wm0 ? wm0(st, n, verb) || 0 : 0; const P = n.pop; if (!P) return s;
    if (P.debiti && P.debiti.player) s += .25;
    s += Po.opinionOf(st, n, 'player') * .2;
    if (verb === 'appuntamento') s += .25; if (verb === 'chiedi_aiuto' || verb === 'ricevi') s += .6; if (verb === 'accompagna') s += .1;
    return s;
  };

  // ---------------- I VERBI PER TUTTI ----------------
  Object.assign(RS.VERBS, {
    appuntamento: { label: 'appuntamento', risk: 0, args: 'luogo, ora, giorno?', desc: 'ti dà appuntamento: ci va davvero e ti aspetta' },
    chiedi_aiuto: { label: 'chiedi aiuto', risk: 0, args: 'cosa?', desc: 'ti chiede una cosa che gli manca davvero (vedi GLI MANCA)' },
    ricevi: { label: 'ricevi', risk: 0, args: 'oggetto, quanto', desc: 'prende una cosa che gli dai dal tuo zaino (se gli serviva, ti deve un favore)' },
    accompagna: { label: 'accompagna', risk: 0, args: 'ore', desc: 'viene con te per qualche ora, poi torna alle sue cose' },
  });
  function parseTime(st, ora, giorno) {
    const m = String(ora || '').match(/(\d{1,2})(?:[:.,h ](\d{2}))?/); if (!m) return null;
    let h = +m[1], mi = +(m[2] || 0); if (h > 23 || mi > 59) return null;
    const g = String(giorno || '').toLowerCase(); let day = dayIdx(st.t);
    if (/domani/.test(g)) day++; else if (/dopodomani/.test(g)) day += 2;
    else { const wd = Po.WEEK.findIndex(w => g.includes(w)); if (wd >= 0) { const cur = (day + 1) % 7; day += (wd - cur + 7) % 7 || 7; } }
    let t = day * 1440 + h * 60 + mi; if (t < st.t + 20 && !/oggi/.test(g) && !giorno) t += 1440;
    return t < st.t + 20 ? null : t;
  }
  RS.EXT.immediate.appuntamento = (st, n, a) => {
    const P = n.pop; if (!P) return { ok: false, msg: `${n.first} non può prendere appuntamenti.` };
    const t = parseTime(st, a.ora || a.orario || a.quando, a.giorno || a.quando); if (!t) return { ok: false, msg: 'A che ora? (un\'ora che non sia già passata)' };
    const ref = RS.resolvePlace ? RS.resolvePlace(st, a.luogo || a.dove) : null, pid = (ref && (ref.id || ref)) || (PLACES[a.luogo] ? a.luogo : null);
    const tgt = pid && PLACES[pid] ? I.target(pid) : (P.at || I.target(G.nearestPlace(n.x, n.y).id)); if (!tgt) return { ok: false, msg: 'Dove?' };
    if (P.appt && Math.abs(P.appt.t - t) < 150 && P.appt.t > st.t) return { ok: false, msg: `Ha già un impegno: ${P.appt.with === 'player' ? 'con te' : 'con ' + G.nameOf(st, P.appt.with)} alle ${hhmm(minOfDay(P.appt.t))} a ${P.appt.label}.` };
    const m = minOfDay(t), wd = (dayIdx(t) + 1) % 7, works = P.job && !P.job.night && wd !== 6 && m >= P.job.start * 60 && m < P.job.end * 60;
    if (works && !(P.job.t && I.tkey(P.job.t) === I.tkey(tgt))) return { ok: false, msg: `A quell'ora lavora (${P.job.title}): ${P.job.end}:00 in poi, o sul posto di lavoro.` };
    P.appt = { with: 'player', tgt, t, label: tgt.label, why: `vedersi con ${NAME()}`, by: 'player', player: true };
    Po.note(st, n, `appuntamento con ${NAME()} ${dayWord(st, t)} alle ${hhmm(m)} a ${tgt.label}`, 'info', { who: 'player', w: .45, tag: 'appuntamento' });
    if (dayIdx(t) === dayIdx(st.t)) Po.planDay(st, n, dayIdx(st.t));
    S(st).stats.appGiocatore++;
    const msg = `Appuntamento con ${n.first}: ${dayWord(st, t)} alle ${hhmm(m)} a ${tgt.label}.`;
    G.addLog(st, `${G.clockStr(st.t)} · ${msg}`, 'info');
    return { ok: true, msg };
  };
  RS.EXT.immediate.chiedi_aiuto = (st, n, a) => {
    const P = n.pop; if (!P) return { ok: false, msg: '' };
    const W = Sc ? Sc.wants(st, n) : [], q = String(a.cosa || '').toLowerCase();
    const w = W.find(x => x.ids.some(id => q && (q.includes(id) || q.includes(nm(id).toLowerCase())))) || W[0];
    if (!w) return { ok: false, msg: `A ${n.first} non manca niente, per ora.` };
    P.askPlayer = { ids: w.ids, label: w.label, t: st.t }; S(st).stats.chiesto++;
    Po.note(st, n, `chiesto a ${NAME()} ${w.label}`, 'info', { who: 'player', w: .3, tag: 'aiuto' });
    return { ok: true, msg: `${n.first} ti chiede: ${w.label}.` };
  };
  RS.EXT.immediate.ricevi = (st, n, a) => {
    const P = n.pop, p = st.player, inv = p.inv || {}; if (!P) return { ok: false, msg: '' };
    const q0 = String(a.oggetto || a.cosa || '').toLowerCase(), id = Object.keys(inv).find(k => inv[k] > 0 && (k === q0 || nm(k).toLowerCase().includes(q0) || q0.includes(k)));
    if (!id) return { ok: false, msg: 'Non ce l\'hai nello zaino.' };
    const qty = clamp(Math.round(a.quanto || 1), 1, inv[id]); inv[id] -= qty; if (inv[id] <= 0) delete inv[id];
    if (Sc && Sc.put) Sc.put(n, id, qty); else { P.inv = P.inv || {}; P.inv[id] = (P.inv[id] || 0) + qty; } S(st).stats.ricevuto++;   // il cibo e la legna vanno a casa
    const needed = (P.askPlayer && P.askPlayer.ids.includes(id)) || (Sc && Sc.wants(st, n).some(w => w.ids.includes(id)));
    const v = (Og && Og.CAT[id] ? Og.CAT[id].prezzo || 1 : 1) * qty;
    if (needed) { P.debiti = P.debiti || {}; P.debiti.player = { v: (P.debiti.player ? P.debiti.player.v : 0) + v, t: st.t, why: nm(id) }; P.askPlayer = null;
      Po.note(st, n, `${NAME()} gli ha dato ${nm(id)} quando ne aveva bisogno: gli deve un favore`, 'good', { who: 'player', w: .6, tag: 'favore' }); }
    else Po.note(st, n, `${NAME()} gli ha regalato ${nm(id)}`, 'good', { who: 'player', w: .3, tag: 'regalo' });
    if (n.ris) n.ris.bond = clamp(n.ris.bond + (needed ? .12 : .04), -.5, .6);
    return { ok: true, msg: `Hai dato ${qty > 1 ? qty + ' × ' : ''}${nm(id)} a ${n.first}${needed ? ': ti deve un favore' : ''}.` };
  };
  RS.EXT.immediate.accompagna = (st, n, a) => {
    const P = n.pop; if (!P) return { ok: false, msg: '' };
    if (P.appt && P.appt.t > st.t && P.appt.t < st.t + 120 && P.appt.with !== 'player') return { ok: false, msg: `Non può: alle ${hhmm(minOfDay(P.appt.t))} ha appuntamento con ${G.nameOf(st, P.appt.with)}.` };
    const h = clamp(Number(a.ore) || 1, .5, 3); P.with = { until: st.t + h * 60 }; S(st).stats.accompagna++;
    Po.note(st, n, `è andat${I.o(n)} in giro con ${NAME()}`, 'info', { who: 'player', w: .3, tag: 'insieme' });
    return { ok: true, msg: `${n.first} viene con te per ${h < 1 ? 'mezz\'ora' : h + (h === 1 ? ' ora' : ' ore')}.` };
  };
  // chi accompagna ti sta dietro (fuori dagli edifici; se entri, aspetta alla porta)
  const mv0 = G.HOOKS.move;
  G.HOOKS.move = (st, n, dt, a) => {
    if (n.__ap && approachMove(st, n, dt)) return true;   // [vivi] sta venendo a parlarti
    const W = n.pop && n.pop.with;
    if (W && !n.dead && !(n.jailedUntil > st.t) && !n.aggro && n.stun <= 0 && n.action && !['fugge', 'combatte'].includes(n.action.name)) {
      if (st.t > W.until) { n.pop.with = null; G.say(st, n, 'Io torno alle mie cose. Ci vediamo.', 2.5); }
      else {
        const p = st.player; if (n.inside && !n.room) { n.inside = false; n.x = (n.pop.at || n).x; n.y = (n.pop.at || n).y; }
        const d = dist(n.x, n.y, p.x, p.y); n.action = { name: 'accompagna', scores: [], why: `Va in giro con ${NAME()}.`, since: n.action.since };
        if (p.indoor || p.vehicle || d < 2.2) { n.speedNow = 0; n.path = []; if (d < 6) n.face = Math.atan2(p.y - n.y, p.x - n.x); return true; }
        if (!n.path.length || st.clock > (n._fT || 0)) { G.goTo(n, p.x, p.y); n._fT = st.clock + .7; }
        G.stepAlong(n, d > 7 ? 3.2 : 1.6, dt); return true;
      }
    }
    return mv0 ? mv0(st, n, dt, a) : false;
  };
  const th0 = G.HOOKS.think;
  G.HOOKS.think = (st, n) => (n.pop && n.pop.with && st.t <= n.pop.with.until) ? true : (th0 ? th0(st, n) : false);

  // ---------------- [vivi] VENGONO LORO DAL GIOCATORE ----------------
  // Ogni tanto qualcuno che è lì vicino viene a cercarti, a piedi, con un motivo vero: avvisarti, ricordarti un favore,
  // invitarti a un'impresa, chiederti una cosa che gli manca (magari ce l'hai nello zaino), raccontarti l'ultima, o affrontarti.
  const NEWS = { scasso: p => `stanotte hanno svaligiato ${p}`, vandalismo: p => `hanno rotto una vetrina a ${p}`, furto: p => `hanno rubato a ${p}`, scippo: p => `hanno scippato una a ${p}`, omicidio: p => `hanno ammazzato uno a ${p}`, aggressione: p => `hanno pestato uno a ${p}`, scritta: p => `qualcuno ha scritto sui muri a ${p}`, graffito: p => `hanno dipinto un muro a ${p}`, molotov: p => `hanno tirato una molotov a ${p}`, esplosione: p => `è saltata in aria una macchina a ${p}` };
  function reasonFor(st, n) {
    const P = n.pop, op = Po.opinionOf(st, n, 'player'), p = st.player;
    if (G.wanted && G.wanted(st) > 0 && (op > .1 || (n.ris && n.ris.ideo > .6))) return { line: pick([`${NAME()}, sta' attento: i Grigi ti cercano.`, 'Togliti di qui, è pieno di Grigi che chiedono di te.']), kind: 'avviso' };
    if (P.debiti && P.debiti.player) return { line: pick([`${NAME()}! Ti devo un favore, non me lo scordo. Se ti serve qualcosa, chiedi.`, 'Per quella volta… se hai bisogno, io ci sono.']), kind: 'favore' };
    if (typeof Imprese !== 'undefined') { const E = Imprese.list(st).find(x => x.leader === n.id && x.status === 'cerca' && !x.members.includes('player') && !x.invitedPlayer); if (E && op > -.15) { E.invitedPlayer = true; return { line: `${cap(dayWord(st, E.t))} alle ${hhmm(minOfDay(E.t))}: ${E.label}, a ${E.tgt.label}. Vieni anche tu? Servono braccia.`, kind: 'invito' }; } }
    if (Sc && op > -.3 && !recentKind(st, 'richiesta:' + (Sc.wants(st, n)[0] || {}).label)) { const w = Sc.wants(st, n).find(x => x.urg > .4); if (w) { const inv = p.inv || {}, hasIt = w.ids.find(id => inv[id] > 0); P.askPlayer = { ids: w.ids, label: w.label, t: st.t }; markKind(st, 'richiesta:' + w.label);
      return { line: hasIt ? pick([`Scusa… per caso hai ${nm(hasIt)}? Mi serve proprio. Te lo ripago.`, `Ho visto che hai ${nm(hasIt)}. Me ne daresti un po'? Poi ti ricambio.`, `${NAME()}, una cortesia: ${nm(hasIt)}. Ne ho bisogno.`]) : pick([`Sai mica dove trovo ${w.label}? Non se ne trova.`, `Mi serve ${w.label}, se senti qualcosa dimmelo.`, `Cerco ${w.label} da stamattina. Tu ne sai niente?`]), kind: 'richiesta' }; } }
    if (op < -.4 && n.tr && n.tr.cor > .6) return { line: pick(['Tu! Non farti più vedere da queste parti.', `So cosa hai fatto, ${NAME()}.`, 'Gira al largo, capito?']), kind: 'minaccia' };
    if (n.tr && n.tr.loq > .5) { const e = st.events.find(x => NEWS[x.type] && x.actor !== 'player' && st.t - x.t < 1440 && !(S(st).told || {})[x.id]); if (e) { (S(st).told = S(st).told || {})[e.id] = 1; return { line: `Hai sentito? ${cap(NEWS[e.type](e.place))}.${rnd() < .5 ? ' Brutta aria.' : ''}`, kind: 'notizia' }; } }
    // chi ha roba in più te la propone
    if (Sc && op > -.2 && n.tr && n.tr.avid > .45) { const id = Sc.surplus(n).find(x => Og && Og.CAT[x] && (Og.CAT[x].prezzo || 0) >= 1); if (id) return { line: pick([`Ho ${nm(id)}, se ti serve te lo do a buon prezzo.`, `Ti interessa ${nm(id)}? Per te faccio uno sconto.`]), kind: 'offerta' }; }
    // chi non ti conosce e ha voglia di parlare si presenta (una volta sola)
    if (!n.__met && n.tr && n.tr.loq > .55 && Math.abs(op) < .15 && (S(st).lastKinds || []).slice(-1)[0] !== 'presenta') { n.__met = true; const job = P.job ? `, ${P.job.title.split(/[.(]/)[0].trim().toLowerCase()}` : P.status === 'pensionato' ? ', in pensione' : P.status === 'disoccupato' ? ', senza lavoro di questi tempi' : ''; return { line: pick([`Tu sei nuovo da queste parti, vero? Io sono ${n.first}${job}.`, `Piacere, ${n.first}${job}. Abito qui vicino.`, `Non ti ho mai visto. Io sono ${n.first}${job}. Se ti serve qualcosa, chiedi.`, `Sei il nipote dei Mancini? Io sono ${n.first}${job}.`, `${n.first}${job}. Qui ci conosciamo tutti, sai.`, `Ehi, tu. Io sono ${n.first}. Non sei di qui, si vede.`]), kind: 'presenta' }; }
    if (op > .15) { const l = I.chatLine ? I.chatLine(st, n, P.cur) : null; if (l) return { line: `Ciao ${NAME()}! ${l}`, kind: 'saluto' }; }
    return null;
  }
  // le ultime visite: non due dello stesso tipo di fila
  const recentKind = (st, k) => (S(st).lastKinds || []).includes(k);
  const markKind = (st, k) => { const L = S(st).lastKinds = S(st).lastKinds || []; L.push(k); if (L.length > 3) L.shift(); };
  function approachPick(st) {
    const M = S(st), p = st.player; if (p.vehicle || p.indoor || st.clock < (M.apAt || 0)) return; M.apAt = st.clock + 3;
    if (st.npcs.some(n => n.__ap)) return;
    const c = st.npcs.filter(n => n.pop && n.pop.ints && n.pop.near && !n.inside && !n.dead && !n.cop && !n.faction && !n.pop.emer && !n.pop.errand && !n.pop.with && n.stun <= 0 && !(n.jailedUntil > st.t)
      && n.pop.cur && !['lavoro', 'sonno', 'impresa', 'appuntamento'].includes(n.pop.cur.act) && st.t - (n.__apT || -1e9) > 600 && dist(n.x, n.y, p.x, p.y) < 20 && dist(n.x, n.y, p.x, p.y) > 2.5);
    for (const n of c.sort(() => rnd() - .5).slice(0, 4)) {
      const r = reasonFor(st, n); if (!r || (r.kind !== 'richiesta' && r.kind !== 'presenta' && recentKind(st, r.kind))) continue; if (r.kind !== 'richiesta') markKind(st, r.kind);
      n.__ap = Object.assign({ until: st.clock + 25, said: false }, r); n.__apT = st.t; M.apAt = st.clock + 14 + rnd() * 18; S(st).stats.vengono = (S(st).stats.vengono || 0) + 1;
      return;
    }
  }
  function approachMove(st, n, dt) {
    const A = n.__ap, p = st.player; if (!A) return false;
    const d = dist(n.x, n.y, p.x, p.y);
    if (st.clock > A.until || p.vehicle || p.indoor || d > 30 || n.pop.emer || n.aggro) { n.__ap = null; return false; }
    if (!A.said) {
      if (d > 1.9) { if (!n.path.length || st.clock > (n._apT || 0)) { G.goTo(n, p.x, p.y); n._apT = st.clock + .6; } G.stepAlong(n, d > 8 ? 2 : 1.45, dt); n.action = { name: 'accompagna', scores: [], why: `Viene a parlare con ${NAME()}.`, since: n.action.since }; return true; }
      A.said = true; A.until = st.clock + 5; n.path = []; G.say(st, n, A.line, 4.5); n.barkCd = st.clock + 6;
      Po.note(st, n, `è andat${I.o(n)} a parlare con ${NAME()}: «${A.line}»`, 'info', { who: 'player', w: .3, tag: 'chat' });
    }
    n.speedNow = 0; n.face += angDiff(Math.atan2(p.y - n.y, p.x - n.x), n.face) * Math.min(1, dt * 6);
    if (A.kind === 'minaccia' && st.clock > A.until - 1) n.__ap = null;
    return true;
  }
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // ---------------- L'APPUNTAMENTO COL GIOCATORE ----------------
  // chi è sul posto mentre l'appuntamento è in corso è venuto (anche se era arrivato prima, o se il giocatore è lontano)
  function presence(st) {
    const M = S(st); if (st.clock < (M.presAt || 0)) return; M.presAt = st.clock + .5;
    st.npcs.forEach(n => {
      const P = n.pop, ap = P && P.appt; if (!ap || st.t < ap.t - 30 || st.t > ap.t + 35 || n.dead || n.jailedUntil > st.t) return;
      const there = P.at && I.tkey(P.at) === I.tkey(ap.tgt) && (n.inside || !P.near || dist(n.x, n.y, ap.tgt.x, ap.tgt.y) < 14);
      if (there) { P.apptArrived = Math.max(P.apptArrived || 0, st.t); ap.nCame = true; }
    });
  }
  function playerAppts(st) {
    const p = st.player, X = S(st).stats;
    st.npcs.forEach(n => {
      const P = n.pop, ap = P && P.appt; if (!ap || ap.with !== 'player') return;
      const near = p.indoor ? (ap.tgt.k === 'b' && p.indoor.b === ap.tgt.bi) : dist(p.x, p.y, ap.tgt.x, ap.tgt.y) < 12;
      if (st.t >= ap.t - 20 && st.t <= ap.t + 50 && near) {
        if (!ap.pCame) ap.pCame = st.t;
        const here = ap.nCame || (P.at && I.tkey(P.at) === I.tkey(ap.tgt));
        if (here && !ap.greeted && (n.room || (!n.inside && dist(n.x, n.y, p.x, p.y) < 10))) { ap.greeted = true; G.say(st, n, ap.pCame > ap.t + 15 ? `Finalmente, ${NAME()}. Ti aspettavo dalle ${hhmm(minOfDay(ap.t))}.` : pick([`Eccoti, ${NAME()}.`, 'Puntuale. Bene.', 'Sei venuto, allora.']), 3); }
      }
      if (st.t < ap.t + 50) return;
      const nCame = !!ap.nCame && !n.dead;
      if (nCame && ap.pCame) { X.venuto++; Po.note(st, n, `visto ${NAME()} a ${ap.label}, come d'accordo`, 'good', { who: 'player', w: .45, tag: 'appuntamento', place: ap.label }); if (n.ris) n.ris.bond = clamp(n.ris.bond + .05, -.5, .6); if (n.op) n.op.trust = clamp(n.op.trust + .05, -1, 1); }
      else if (nCame) { X.bidoneGiocatore++; Po.note(st, n, `${NAME()} mi ha lasciato ad aspettare a ${ap.label}`, 'bad', { who: 'player', w: .55, tag: 'bidone', place: ap.label }); if (n.ris) n.ris.bond = clamp(n.ris.bond - .08, -.5, .6); if (n.op) n.op.trust = clamp(n.op.trust - .08, -1, 1); }
      else if (ap.pCame) { X.bidoneNpc++; G.addLog(st, `${G.clockStr(st.t)} · ${n.first} non è venut${I.o(n)} all'appuntamento a ${ap.label}.`, 'info'); Po.note(st, n, `non è andat${I.o(n)} all'appuntamento con ${NAME()}`, 'info', { who: 'player', w: .3 }); }
      P.appt = null; P.apptArrived = 0;
    });
  }

  // ---------------- PER STRADA SI PARLA DI COSE VERE ----------------
  I.TALK.push((st, n) => {
    const P = n.pop, ap = P.appt, r = rnd();
    if (ap && ap.t > st.t && ap.t - st.t < 600 && r < .45) {
      const when = `${dayWord(st, ap.t) === 'oggi' ? (minOfDay(ap.t) >= 18 * 60 ? 'stasera' : 'oggi') : dayWord(st, ap.t)} alle ${hhmm(minOfDay(ap.t))}`;
      if (ap.deal && ap.deal.id) return ap.deal.seller === n.id ? `${cap(when)} devo portare ${nm(ap.deal.id)} a ${G.nameOf(st, ap.deal.buyer)}.` : `${cap(when)} ${G.nameOf(st, ap.deal.seller)} mi porta ${nm(ap.deal.id)}.`;
      if (ap.deal && ap.deal.kind === 'insieme') return `${cap(when)} ${ap.deal.helper === n.id ? `do una mano a ${G.nameOf(st, ap.deal.asker)}` : `${G.nameOf(st, ap.deal.helper)} mi aiuta`}: ${ap.deal.label}.`;
      return `${cap(when)} vedo ${ap.with === 'player' ? NAME() : G.nameOf(st, ap.with)} a ${ap.label}.`;
    }
    const deb = Object.entries(P.debiti || {})[0]; if (deb && r < .25) return deb[0] === 'player' ? `Devo un favore a ${NAME()}.` : `Devo ancora ${Math.round(deb[1].v)}.000 lire a ${G.nameOf(st, deb[0])}.`;
    // l'ultima cosa che gli è successa oggi
    const e = (P.diary || []).slice().reverse().find(x => st.t - x.t < 600 && x.who && x.who !== 'player' && /scambio|patto|favore|aiuto|bidone|tradimento|furto|insieme/.test(x.tag || ''));
    if (e && r < .5) { const k = G.nameOf(st, e.who); return e.tag === 'bidone' || e.tag === 'tradimento' ? pick([`Con ${k} ho chiuso.`, `${k}? Non ci si può contare.`]) : e.tag === 'furto' ? `Mi hanno derubato. È stato ${k}, lo so.` : e.kind === 'good' ? pick([`${k} è una brava persona.`, `Ieri ${k} mi ha dato una mano.`]) : e.tag === 'scambio' ? `Ho fatto un affare con ${k}.` : null; }
    if (Sc && r < .6) { const w = Sc.wants(st, n)[0]; if (w && w.urg > .4) return pick([`Mi serve ${w.label}, sai chi ce l'ha?`, `Non trovo ${w.label} da nessuna parte.`]); }
    return null;
  });
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // ---------------- FARE LE COSE INSIEME (tra di loro) ----------------
  const HELPABLE = /sistem|zapp|cucin|ripar|raccogl|lavora alla|costru|imbianc|trasloc|scarica|pesca/i;
  function askFriends(st) {
    const X = S(st).stats, m = minOfDay(st.t), today = dayIdx(st.t);
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || !P.plan || P.appt || I.isPassive(st, n) || P.planDay !== today) return;
      const b = P.plan.find(x => x.pj && x.at > m + 90 && HELPABLE.test(x.label || '')); if (!b || P.askedTogether === b.pj + '@' + today) return;
      P.askedTogether = b.pj + '@' + today;
      const t = today * 1440 + b.at, wd = (today + 1) % 7;
      const free = k => k && k.pop && !k.dead && !k.pop.appt && !I.isPassive(st, k) && !(k.jailedUntil > st.t) && !(k.pop.job && !k.pop.job.night && wd !== 6 && b.at >= k.pop.job.start * 60 - 30 && b.at < k.pop.job.end * 60 + 30);
      const cands = (P.friends || []).map(id => G.byId(st, id)).concat(((st.pop.households[P.hh] || {}).members || []).map(id => G.byId(st, id))).filter(k => k && k !== n && free(k) && Po.opinionOf(st, n, k.id) > -.2);
      if (!cands.length) return;
      const k = cands.sort((a, c) => (Po.opinionOf(st, n, c.id) + I.closeness(st, n, c)) - (Po.opinionOf(st, n, a.id) + I.closeness(st, n, a)))[0];
      X.insiemeChiesti++;
      // decide l'amico: quanto gli vuole bene, se gli deve un favore, quanto è stanco o avaro
      const owes = !!(k.pop.debiti && k.pop.debiti[n.id]);
      const yes = rnd() < .3 + I.closeness(st, k, n) * .4 + Po.opinionOf(st, k, n.id) * .3 + (owes ? .35 : 0) - (k.tr ? k.tr.avid * .15 : 0);
      if (!yes) { Po.note(st, n, `chiesto a ${k.first} di aiutarlo a ${b.label}, ma ha detto di no`, 'bad', { who: k.id, w: .25, tag: 'aiuto' }); return; }
      const ap = Po.appoint(st, n, k, b.tgt, t, b.label); if (!ap) return;
      ap.deal = { kind: 'insieme', label: b.label, asker: n.id, helper: k.id, owes }; if (ap.twin) ap.twin.deal = ap.deal;
    });
  }
  I.MEET.push((st, a, b, ap, cameA, cameB) => {
    const D = ap.deal; if (!D || D.kind !== 'insieme') return; const X = S(st).stats;
    const asker = G.byId(st, D.asker), helper = G.byId(st, D.helper); if (!asker || !helper || !asker.pop || !helper.pop) return;
    const aC = asker === a ? cameA : cameB, hC = helper === a ? cameA : cameB;
    if (aC && hC) {
      X.insiemeFatti++;
      Po.note(st, asker, `${helper.first} è venut${I.o(helper)} a dargli una mano: ${D.label}, insieme`, 'good', { who: helper.id, w: .5, tag: 'insieme' });
      Po.note(st, helper, `ha dato una mano a ${asker.first}: ${D.label}`, 'good', { who: asker.id, w: .4, tag: 'insieme' });
      if (D.owes) { delete helper.pop.debiti[asker.id]; Po.note(st, helper, `così ha ricambiato il favore a ${asker.first}`, 'good', { who: asker.id, w: .3, tag: 'favore' }); }
      else { const Dd = asker.pop.debiti = asker.pop.debiti || {}; Dd[helper.id] = Dd[helper.id] || { v: 0, t: st.t, why: 'una mano' }; Dd[helper.id].v += 3; }
      ['compagnia', 'svago'].forEach(k => { if (asker.pop.need) asker.pop.need[k] = 0; if (helper.pop.need) helper.pop.need[k] = Math.max(0, helper.pop.need[k] - .3); });
      try { Azioni.moveRel(st, asker, helper, .1, 0); Azioni.moveRel(st, helper, asker, .06, 0); } catch (e) { }
    } else if (aC && !hC) { X.insiemeBuca++; Po.note(st, asker, `${helper.first} doveva aiutarlo a ${D.label} e non si è vist${I.o(helper)}`, 'bad', { who: helper.id, w: .5, tag: 'bidone' }); }
  });

  // ---------------- AGGANCI ----------------
  const s0 = G.HOOKS.step;
  G.HOOKS.step = (st, dt) => {
    if (s0) s0(st, dt);
    if (!st.pop) return;
    presence(st); playerAppts(st); approachPick(st);   // [vivi]
    const M = S(st), hm = Math.floor(st.t / 60);
    while (M.hour < hm) { M.hour++; const hr = M.hour % 24; if (hr === 7 || hr === 13) askFriends(st); }
  };
  function report(st) { return Object.assign({}, S(st).stats); }
  return { lifeNow, parseTime, report, askFriends };
})();
if (typeof module !== 'undefined') module.exports = Convivenza;
