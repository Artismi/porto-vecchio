/* [unico] unico_rissa.js: LA SCALA DELL'AGGRESSIVITÀ (progetto: commedia/MONDO_PIENO.md §4). Dietro ?commedia. Spento: UnicoRissa = { ON: false }.

   CHIUNQUE, provocato, sale una scala di 8 gradini, ognuno un verbo del registro (la stessa porta di tutti, Verbo.fai, con il suo fatto
   e il suo segno): 0 guarda_storto · 1 borbotta · 2 insulta · 3 spingi · 4 minaccia_con (alza la cosa che ha) · 5 picchia (a mani o con
   la cosa) · 6 picchia con la lama (il coltello, la bottiglia rotta) · 7 spara. A ogni turno di chi tocca:
       salire = offesa × (0,5 + rabbia + zelo) − paura × (1 + viltà) − freno
   offesa: il fatto che l'ha aperta (Fatto.OFFESE) + il rancore che c'è già (Fatto.rancore) + l'ultimo gradino dell'altro; paura: la forza
   dell'altro (che cosa tiene in mano, gli amici vicini, «temuto») contro la propria; freno: i testimoni (meno per il teatrale), un Grigio
   entro 30 m (non per chi è già della malavita), l'ebbrezza che lo dimezza. CHE COSA HA IN MANO decide il gradino massimo (UnicoCose.armaDi):
   niente o un bastone 5, una lama 6, un'arma da fuoco 7 solo per la malavita, le bande, i Grigi, o un torto enorme con un carattere estremo.
   OGNI GRADINO HA UNA VIA PER SCENDERE: scusati, ridi, paga (il caffè, la cosa resa), scappa, arrenditi; da fuori separa (l'amico, il
   passante coraggioso). Chi è amico o dello stesso gruppo entro 20 m entra alla pari; il vile scappa e va a chiamare qualcuno.
   LE CONSEGUENZE RESTANO: i segni del corpo (UnicoCose: livido, taglio, braccio rotto, KO a terra), la reputazione (temuto, ridicolo,
   vigliacco: st.u.rissa.rep), il fascicolo dei Grigi (st.u.rissa.fasc; chi ha visto denuncia; sopra il gradino 5 il fermo), le idee dei
   testimoni (UnicoIdee.adotta), il rancore (i fatti nuovi in Fatto.OFFESE), e il FILO DI VENDETTA del regista (famiglia «offesa»): la Mente
   dell'offeso con «vendicarsi» ha il metodo nuovo «affronta», che va dall'altro e riapre la scala.
   IL GIOCATORE: chi lo prende a botte (Game, n.hitT) o lo vede rubare può reagire salendo la scala contro di lui; i Grigi restano quelli di
   ordine.js. Vicino al giocatore la lite si svolge a turni (2,2 s di st.clock), lontano si risolve in un colpo con lo stesso conto. Il caso
   dal flusso 'rissa' della porta. Lo stato in st.u.rissa, solo dati. */
var UnicoRissa = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UR = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UR;
  if (!ON) return UR;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const CO = () => (typeof UnicoCose !== 'undefined' && UnicoCose.ON ? UnicoCose : null);
  const ID = () => (typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null);
  const GR = () => (typeof UnicoGruppi !== 'undefined' && UnicoGruppi.ON ? UnicoGruppi : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const RG = () => (typeof Regista !== 'undefined' && Regista.ON ? Regista : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  if (!G || !Un() || !FT() || !AT() || !VB() || !CO()) { UR.ON = false; return UR; }
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('rissa');
  const pick = L => L[Math.floor(rnd() * L.length) % L.length];
  const CFG = UR.CFG = { max: 12, turno: 2.2, scena: 60, testR: 15, grigioR: 30, amicoR: 20, soglia: .22, scendi: -.05, stalli: 3, turni: 12, fattiPasso: 120, giorno: 60, ripresa: 360 };
  const stats = UR.stats = { aperte: 0, chiuse: 0, saliti: [0, 0, 0, 0, 0, 0, 0, 0], uscite: {}, max: [0, 0, 0, 0, 0, 0, 0, 0], unite: 0, denunce: 0, fermi: 0, giocatore: 0, lontane: 0, ms: 0, msMax: 0 };
  const io = id => (id === 'player' ? 'nino' : id == null ? null : String(id));

  function S(st) { const u = st && st.u; if (!u) return null; return u.rissa || (u.rissa = { L: [], n: 0, rep: {}, fasc: {}, ult: Math.max(0, (FT()._.M(st) || { n: 0 }).n), hit: {}, bud: { g: -1, n: 0 }, ultime: {} }); }
  const npc = (st, id) => (id === 'nino' || id === 'player' ? st.player : G.byId ? G.byId(st, id) : null);
  const nome = (st, id) => CO()._.nome(st, id);
  const scrivi = (st, tipo, chi, dati, causa) => CO()._.scrivi(st, tipo, chi, dati, causa);
  const T = (st, id) => (ID() && ID().tratti(st, id)) || { follia: 0, zelo: .1, vilta: .5, carisma: .3 };
  const car = (st, id) => { const M = ME() && ME().mente(st, id); return (M && M.carattere) || {}; };

  // ======================= LA REPUTAZIONE E IL FASCICOLO =======================
  function rep(st, id, k, d) { const s = S(st), r = s.rep[id] || (s.rep[id] = { temuto: 0, ridicolo: 0, vigliacco: 0 }); if (d) r[k] = r2(clamp((r[k] || 0) + d, 0, 1)); return r[k] || 0; }
  function fascicolo(st, id, liv, fid) { if (id === 'nino') return; const s = S(st), f = s.fasc[id] || (s.fasc[id] = [0, 0, 0]); f[0] = r1(f[0] + liv); f[1]++; f[2] = Math.round(st.t); if (fid) f[3] = fid; return f[0]; }
  UR.rep = rep; UR.fascicolo = fascicolo;

  // ======================= I GRADINI (verbi) =======================
  const SCALA = UR.SCALA = ['guarda_storto', 'borbotta', 'insulta', 'spingi', 'minaccia_con', 'picchia', 'accoltella', 'spara'];
  const FATTO_G = ['guarda_storto', 'borbotta', 'insulto', 'spinta', 'minaccia', 'botte', 'coltellata', 'sparo'];
  const ONO_G = ['?', '…', '!#@', 'SCIAFF', 'EHI!', 'TONF', 'ZAC', 'BANG'];
  const PACE = UR.PACE = { scusati: 'scuse', ridi: 'risata', paga: 'pace_pagata', scappa: 'fuga', arrenditi: 'resa', separa: 'separati' };
  const INSULTI = ['Ma vai a pescare le acciughe!', 'Testa di baccalà!', 'Ti conosco, sai? Tu e tua zia!', 'Ma chi ti credi di essere?', 'Torna sotto il tuo scoglio!', 'Faccia da triglia!', 'Ma senti questo qui...', 'Brutto muso di sarago!'];
  const BATT = { scusati: ['Scusa, non volevo.', 'Hai ragione, ho esagerato.', 'Dai, scusami.'], ridi: ['Ahah, ma dai! Stavo scherzando.', 'Ma guarda che faccia! Dai, ridiamoci su.'], paga: ['Dai, ti offro un caffè e chiudiamola qui.', 'Tieni, così siamo pari.'],
    scappa: ['Me ne vado, me ne vado!', 'Aiuto!'], arrenditi: ['Basta, basta! Hai vinto tu.', 'Va bene, va bene!'], separa: ['Fermi, fermi! Ma siete matti?', 'Basta, voi due!'] };
  const say = (st, n, s, d) => { if (!n || n === st.player || !st.player || hyp(n.x - st.player.x, n.y - st.player.y) > 26) return; try { G.say(st, n, s, d || 2.5); } catch (e) { } };
  function effetto(st, A, chi, g, c) {
    const n = A.o, B = npc(st, chi), C = CO(); if (!B || !n) return; const ang = Math.atan2(B.y - n.y, B.x - n.x); n.face = ang;
    const nb = B === st.player ? null : B, Bi = nb && nb.pop && nb.pop.need;
    if (g === 0) { if (nb) nb.face = ang + Math.PI; }
    else if (g === 1) { if (A.bisogni) A.bisogni.rabbia = clamp((A.bisogni.rabbia || 0) + .05, 0, 1); }
    else if (g === 2) { say(st, n, pick(INSULTI), 2.6); if (Bi) Bi.rabbia = clamp((Bi.rabbia || 0) + .1, 0, 1); }
    else if (g === 3) { if (nb) { const x = nb.x + Math.cos(ang) * .8, y = nb.y + Math.sin(ang) * .8; try { if (G.walkM(x, y)) { nb.x = x; nb.y = y; } } catch (e) { } nb.stun = Math.max(nb.stun || 0, .6); } }
    else if (g === 4) { const a = C.armaDi(st, n); if (a) C.mano(st, n.id, a[0], 10); if (Bi) Bi.paura = clamp((Bi.paura || 0) + .2, 0, 1); }
    else if (g === 5 || g === 6) {
      n.gesture = 'punch'; GEST.push([n.id, st.clock + .5]);
      const a = C.armaDi(st, n), k = a ? a[0] : null, f = k ? C.fisica(k) : null;
      if (k) C.mano(st, n.id, k, 6);
      const r = rnd(), lama = g === 6 && f && f.appuntito;
      const seg = lama ? (r < .2 ? 'ko' : r < .35 ? 'rotto' : 'taglio') : f && f.kg > 1 ? (r < .25 ? 'ko' : r < .4 ? 'rotto' : 'livido') : (r < .1 ? 'ko' : 'livido');
      if (B === st.player) { try { G.damagePlayer(st, lama ? 14 : f ? 9 : 5, ang, n.id); } catch (e) { } } else C.segna(st, B.id, seg);
      if (f && f.rompe === 'urto' && A.borsa.togli(k, 1)) { C.aTerra(st, k, B.x, B.y, true, n.id); C.mano(st, n.id, 'cocci', 8); BROKEN[n.id] = 1; }   // la bottiglia si rompe: diventa appuntita
      if (nb) nb.stun = Math.max(nb.stun || 0, .8);
      if (c) c.r = { seg, con: k || 'pugni' };
    } else if (g === 7) {
      const a = C.armaDi(st, n); if (!a || !C.fisica(a[0]).gun) return; C.mano(st, n.id, a[0], 8);
      const vic = st.player && hyp(n.x - st.player.x, n.y - st.player.y) < CFG.scena;
      if (vic && G.shoot && G.WEAPONS && G.WEAPONS[a[0]]) { try { G.shoot(st, n, a[0], ang, .25, n.id); } catch (e) { } }
      else if (B !== st.player) C.segna(st, B.id, rnd() < .5 ? 'ko' : 'taglio');
      if (c) c.r = { con: a[0] };
    }
    if (C.ONOV && st.player && hyp(n.x - st.player.x, n.y - st.player.y) < CFG.scena && typeof document !== 'undefined') { C.ONOV.push({ x: B.x, y: B.y, w: ONO_G[g], t: st.clock + 1.3 }); if (C.ONOV.length > 8) C.ONOV.shift(); }
  }
  const GEST = [], BROKEN = {};
  function pace(st, A, chi, k, c) {
    const n = A.o, B = npc(st, chi); if (!n) return; say(st, n, pick(BATT[k] || ['Basta.']), 2.4);
    if (k === 'paga' && B) { const v = Math.min(2, A.soldi || 0); if (v > 0) { A.soldi = r1(A.soldi - v); const Bb = AT().di(st, B); if (Bb) Bb.soldi = r1(Bb.soldi + v); if (c) c.r = { v }; } }
    if (k === 'scappa') { n.panic = Math.max(n.panic || 0, 4); n.fleeFrom = B ? { x: B.x, y: B.y } : null; rep(st, n.id, 'vigliacco', .08); }
    if (k === 'arrenditi') { rep(st, n.id, 'ridicolo', .05); if (B && B !== st.player) rep(st, B.id, 'temuto', .06); }
    if (k === 'ridi' && A.bisogni) A.bisogni.rabbia = clamp((A.bisogni.rabbia || 0) - .2, 0, 1);
  }
  // le schede: la stessa porta di tutti (Verbo.fai), il fatto, il segno, gli esiti dichiarati
  { const V = VB();
    Object.assign(V.EFF, { gradino: (c, g, chi) => effetto(c.st, c.A, V._.val(chi, c), +g, c), pace: (c, k, chi) => pace(c.st, c.A, V._.val(chi, c), k, c) });
    const PITTO = ['esclamativo', 'fumetto', 'muso', 'mano', 'esclamativo', 'esclamativo', 'esclamativo', 'esclamativo'], W = ['?', '...', '!#@!', 'SCIAFF', 'occhio!', 'TONF', 'ZAC', 'BANG'];
    SCALA.forEach((v, g) => V.registra(v, { fam: 'rissa', args: { chi: 'attore' }, pre: [['vivo'], ['altro', '$chi'], ['vicino', 'persona', '$chi', g >= 5 ? 3 : g === 0 ? 14 : 7]], eff: [['gradino', g, '$chi']],
      costo: { min: .2, rischio: g * .12 }, posa: g <= 2 ? 'discute' : g === 4 ? 'mira' : null, segno: { bolla: [PITTO[g], W[g]] }, fatto: FATTO_G[g], con: ['$chi'], menu: false, illegale: g >= 5,
      esiti: { ok: 'il gradino', no: 'GUASTI' } }));
    const PP = { scusati: ['stretta', 'scusa'], ridi: ['fumetto', 'ahah'], paga: ['moneta', 'offro io'], scappa: ['freccia', 'via!'], arrenditi: ['mano', 'basta!'], separa: ['stretta', 'fermi!'] };
    for (const k in PACE) V.registra(k, { fam: 'pace', args: { chi: 'attore' }, pre: [['vivo'], ['altro', '$chi']], eff: [['pace', k, '$chi']], costo: { min: .3 }, posa: k === 'scappa' ? null : 'discute',
      segno: { bolla: PP[k] }, fatto: PACE[k], con: ['$chi'], menu: false, esiti: { ok: 'la lite scende', no: 'GUASTI' } });
  }

  // ======================= LA FORMULA =======================
  function grigioVicino(st, x, y) { for (const k of st.npcs) if ((k.cop || k.grigio) && !k.dead && !k.inside && Math.abs(k.x - x) < CFG.grigioR && Math.abs(k.y - y) < CFG.grigioR) return k; return null; }
  function intorno(st, n) { let t = 0; const L = []; for (const k of st.npcs) { if (k === n || k.dead || k.inside || Math.abs(k.x - n.x) > CFG.amicoR || Math.abs(k.y - n.y) > CFG.amicoR) continue; const d = hyp(k.x - n.x, k.y - n.y); if (d < CFG.testR) t++; if (d < CFG.amicoR) L.push(k); } return { t, L }; }
  const malavita = n => !!(n && (n.faction || n.cop || n.grigio || (n.ris && n.ris.member) || n.crim || (n.pop && n.pop.job && /ladr|spacc|contrab/.test(String(n.pop.job.k || n.pop.job)))));
  function forza(st, n) { if (!n) return 1; if (n === st.player) return 1.6 + (st.player.cur && st.player.cur !== 'pugni' ? 1 : 0); const a = CO().armaDi(st, n); return 1 + (a ? a[1] * .12 : 0) + rep(st, n.id, 'temuto') * .6 + (n.look && n.look.build ? (n.look.build - 1) * .4 : 0); }
  function cima(st, n, of) {   // il gradino massimo per quello che ha in mano
    const a = CO().armaDi(st, n), lv = a ? a[1] : 0;
    if (lv >= 7) { const t = T(st, n.id); return malavita(n) || (of > .85 && (t.follia > .7 || t.zelo > .8)) ? 7 : 6; }
    if (lv >= 6 || BROKEN[n.id]) return 6;
    return 5;
  }
  function salire(st, c, x, y) {
    const n = npc(st, x), k = npc(st, y); if (!n || !k || n === st.player) return -1;
    const t = T(st, x), Bi = (n.pop && n.pop.need) || {}, ch = car(st, x);
    const ranc = FT().rancore(st, io(x), io(y)) || 0, of = clamp(c.of + ranc * .6 + (c.ug && c.chi === y ? c.g * .06 : 0), 0, 1.6);
    const rabbia = clamp((Bi.rabbia || 0) * .6 + (ch.rancore || 0) * .3, 0, 1);
    const paura = clamp(forza(st, k) / forza(st, n) - .7, 0, 2) * .55 + (Bi.paura || 0) * .3;
    const I = intorno(st, n), gr = grigioVicino(st, n.x, n.y);
    let freno = I.t * .035 * (ch.teatrale > .6 ? -.5 : 1) + (gr && !malavita(n) ? .55 : 0) + c.g * .05;
    if (n.drunk > 0 || (n.pop && n.pop.drunk > 0)) freno *= .5;
    return of * (.5 + rabbia + t.zelo) - paura * (1 + t.vilta) - freno + (rnd() - .5) * .3;
  }

  // ======================= LA LITE: apri, i turni, la fine =======================
  function aperta(st, a, b) { return S(st).L.find(c => (c.a === a && c.b === b) || (c.a === b && c.b === a)) || null; }
  UR.aperta = aperta;
  function apri(st, a, b, of, fid, g0) {
    a = io(a); b = io(b); if (!a || !b || a === b || a === 'nino') return null; const s = S(st);
    const na = npc(st, a), nb = npc(st, b); if (!na || !nb || na.dead || nb.dead || na.cop || na.grigio || !na.pop || !!na.inside !== !!nb.inside) return null;
    if (nb !== st.player && (nb.cop || nb.grigio)) return null;
    if (aperta(st, a, b) || s.L.length >= CFG.max) return null;
    const ult = s.ultime[a + '|' + b]; if (ult && st.t - ult < CFG.ripresa && !(fid && g0)) return null;
    const c = { id: ++s.n, a, b, g: g0 || 0, of: r2(clamp(of, 0, 1.2)), t0: Math.round(st.t), tc: r2(st.clock), turno: 'a', fid: fid || null, st: 0, chi: null, ug: 0, lontano: 0 };
    s.L.push(c); stats.aperte++; if (b === 'nino') stats.giocatore++;
    return c;
  }
  UR.apri = apri;
  function vicinoG(st, n) { return st.player && n && hyp(n.x - st.player.x, n.y - st.player.y) < CFG.scena && !n.inside; }
  function fai(st, x, v, y, causa) {
    const n = npc(st, x), k = npc(st, y); if (!n || !k) return null;
    if (hyp(n.x - k.x, n.y - k.y) > 6.5) { if (vicinoG(st, n)) return 'lontano'; const a = Math.atan2(n.y - k.y, n.x - k.x); n.x = k.x + Math.cos(a) * 1.4; n.y = k.y + Math.sin(a) * 1.4; }
    const r = VB().fai(st, n, v, { chi: y === 'nino' ? 'nino' : k.id }, { subito: true, causa });
    return r && r.fid != null ? r.fid : null;
  }
  // il passo per chi sta andando dall'altro: il passo di Azioni che lo porta lì e lo tiene girato (la lite non scappa)
  function avvicina(st, c) {
    const n = npc(st, c.a), k = npc(st, c.b), Z = typeof Azioni !== 'undefined' ? Azioni : null; if (!n || !k || !Z || !Z.startPlan || n.pop.emer && (n.pop.emer.prio || 0) >= 3) return;
    const passi = [{ label: 'va da ' + (k.first || 'lui'), at: () => ({ x: k.x + Math.cos(n.face || 0) * -1.2, y: k.y + Math.sin(n.face || 0) * -1.2 }), dur: 0, outside: true },
      { label: 'litiga con ' + (k.first || 'lui'), dur: 6, act: () => 'next', tick: (s2, n2) => { n2.face = Math.atan2(k.y - n2.y, k.x - n2.x); } }];
    Z.startPlan(st, n, 'lite', 'lite con ' + (k.first || 'lui'), passi, 2, { verbo: null, rissa: c.id });
  }
  function turno(st, c) {
    const x = c.turno === 'a' ? c.a : c.b, y = c.turno === 'a' ? c.b : c.a, n = npc(st, x), k = npc(st, y);
    if (!n || !k || n.dead || k.dead || (n !== st.player && n.stun > 1 && c.g >= 5)) return chiudi(st, c, n && n.stun > 1 ? 'ko' : 'via');
    if (x === 'nino') {   // il giocatore non ha la scala: se si allontana, finisce; se no tocca di nuovo all'altro
      if (hyp(n.x - k.x, n.y - k.y) > 14) return chiudi(st, c, 'andato');
      c.turno = 'a'; c.ug = 0; return;
    }
    const s = salire(st, c, x, y), top = cima(st, n, c.of);
    c.ug = 0;
    if (s > CFG.soglia && c.g < top) {
      const g = c.g + (c.g === 0 && s > .7 ? 2 : 1), v = SCALA[Math.min(g, 7)];
      const pr = (g === 3 || g === 5) && k !== st.player ? CO().sostituto(AT().di(st, n), 'proiettile') : null;
      if (pr && (hyp(n.x - k.x, n.y - k.y) > 2.5 || rnd() < .35)) { const f0 = CO().lancia(st, x, pr[0], y, { causa: c.fid }); if (f0) { c.g = g; c.chi = x; c.ug = 1; c.st = 0; stats.saliti[c.g]++; stats.lanci = (stats.lanci || 0) + 1; if (c.g > (c.gm || 0)) c.gm = c.g; c.turno = c.turno === 'a' ? 'b' : 'a'; return; } }
      const fid = fai(st, x, v, y, c.fid);
      if (fid === 'lontano') { avvicina(st, c); return; }
      if (fid != null) { c.g = Math.min(g, 7); c.chi = x; c.ug = 1; c.fid = fid; c.st = 0; stats.saliti[c.g]++; if (c.g > (c.gm || 0)) c.gm = c.g; unisci(st, c, x, y); }
      else c.st++;
    } else if (s < CFG.scendi || c.st >= CFG.stalli || (c.n = (c.n || 0) + 1) > CFG.turni) {
      // si scende: la via che sceglie lui, o qualcuno che li separa
      const z = separatore(st, c); if (z) { const f = fai(st, z.id, 'separa', x, c.fid); return chiudi(st, c, 'separa', f, z.id); }
      const ch = car(st, x), t = T(st, x), off = c.chi === y ? 0 : 1, perde = forza(st, k) > forza(st, n) * 1.4 || (n.stun > 0);
      const via = perde && c.g >= 4 ? (t.vilta > .5 ? 'scappa' : 'arrenditi') : off && (n.pop.money || 0) > 3 && ch.generoso > .4 ? 'paga' : off && (ch.orgoglio || 0) < .6 ? 'scusati' : (ch.teatrale > .5 || t.follia > .5) ? 'ridi' : c.g <= 1 ? null : t.vilta > .6 ? 'scappa' : 'scusati';
      const f = via ? fai(st, x, via, y, c.fid) : null;
      return chiudi(st, c, via || 'sbollita', f, x);
    } else c.st++;
    c.turno = c.turno === 'a' ? 'b' : 'a';
  }
  function separatore(st, c) {
    if (c.g < 3) return null; const n = npc(st, c.a); if (!n) return null; const I = intorno(st, n);
    for (const k of I.L) { if (k.cop || k.grigio || !k.pop || k.id === c.b || k.id === c.a || hyp(k.x - n.x, k.y - n.y) > 12) continue; const t = T(st, k.id); if (t.vilta < .35 && rnd() < .35) return k; }
    return null;
  }
  // chi si unisce: l'amico o lo stesso gruppo entro 20 m, alla pari; il vile va a chiamare qualcuno
  function unisci(st, c, x, y) {
    if (c.g < 3 || c.unite) return; const n = npc(st, x), Gr = GR(); if (!n || n === st.player) return; c.unite = 1;
    const g = Gr ? Gr.gruppoDi(st, x) : null, M = ME() && ME().mente(st, x);
    for (const k of intorno(st, n).L) {
      if (k.cop || k.grigio || !k.pop || k.id === y || k.id === x || aperta(st, k.id, y)) continue;
      const aff = M && M.rel && M.rel[k.id] ? M.rel[k.id][0] || 0 : 0, stesso = g && g.membri.includes(k.id);
      if (!(stesso || aff > .3)) continue; const t = T(st, k.id);
      if (t.vilta > .65) { scrivi(st, 'chiama_aiuto', [k.id, x], { d: `${nome(st, k.id)} è corso a chiamare qualcuno: ${nome(st, x)} è nei guai` }, c.fid); continue; }
      if (apri(st, k.id, y, c.of * .8, c.fid, Math.max(0, c.g - 1))) { stats.unite++; break; }
    }
  }
  function chiudi(st, c, come, fid, chi) {
    const s = S(st); s.L = s.L.filter(q => q !== c); stats.chiuse++; stats.uscite[come] = (stats.uscite[come] || 0) + 1; stats.max[c.gm || c.g]++;
    s.ultime[c.a + '|' + c.b] = Math.round(st.t); const K = Object.keys(s.ultime); if (K.length > 300) for (const k of K.slice(0, 100)) delete s.ultime[k];
    const n = npc(st, c.a); if (n && n.pop && n.pop.emer && n.pop.emer.rissa === c.id && typeof Azioni !== 'undefined') Azioni.endPlan(st, n, 'fine lite');
    for (const id of [c.a, c.b]) if (BROKEN[id] && rnd() < .5) delete BROKEN[id];
    const gm = c.gm || c.g; if (gm < 2) return;
    // le conseguenze: i testimoni, i Grigi, le idee, la reputazione
    const vinc = come === 'scappa' || come === 'arrenditi' ? (chi === c.a ? c.b : c.a) : come === 'ko' ? c.chi : null;
    if (vinc && vinc !== 'nino') rep(st, vinc, 'temuto', .05 * gm);
    const ff = scrivi(st, 'rissa_fine', [c.a, c.b], { d: `${nome(st, c.a)} e ${nome(st, c.b)}: ${FINE[come] || 'finita lì'}${gm >= 5 ? ' (sono volate le mani)' : ''}`, gm, come, vinc: vinc || null }, typeof fid === 'number' ? fid : c.fid);
    if (gm >= 5 && n) {
      const gr = grigioVicino(st, n.x, n.y), offensore = c.chi || c.a, k = npc(st, offensore), I = intorno(st, n), Id = ID();
      fascicolo(st, offensore, gm - 4, ff ? ff.id : null);
      for (const w of I.L.slice(0, 6)) {
        if (w.id === c.a || w.id === c.b || !w.pop) continue; const tl = (w.tr && w.tr.legge) || .4;
        if (Id) Id.adotta(st, w.id, 'p:' + offensore, gm >= 6 ? 'paura' : 'disprezzo', -.5, .25 + gm * .04, ff ? ff.id : null, false);
        if (tl > .65 && rnd() < .3 && offensore !== 'nino') { scrivi(st, 'denuncia', [w.id, offensore], { d: `${nome(st, w.id)} ha denunciato ${nome(st, offensore)} ai Grigi per la rissa` }, ff ? ff.id : null); fascicolo(st, offensore, 1); stats.denunce++; break; }
      }
      if (gr && k && k !== st.player && rnd() < (gm >= 6 ? .7 : .35)) { try { if (typeof Popolo !== 'undefined' && Popolo.arrest) Popolo.arrest(st, k, 'rissa in strada'); else k.jailedUntil = st.t + 240; stats.fermi++; } catch (e) { k.jailedUntil = st.t + 240; } scrivi(st, 'fermato', [k.id], { d: `I Grigi hanno portato via ${nome(st, k.id)} dopo la rissa` }, ff ? ff.id : null); }
    }
  }
  const FINE = { scusati: 'si sono chiesti scusa', ridi: 'ci hanno riso sopra', paga: 'ha offerto lui, pace fatta', scappa: 'uno se l\'è data a gambe', arrenditi: 'uno ha alzato le mani', separa: 'li hanno separati', sbollita: 'è sbollita da sola', ko: 'uno è rimasto a terra', via: 'uno se n\'è andato', andato: 'se n\'è andato' };

  // ======================= I FATTI CHE APRONO LA SCALA (e il contratto dei verbi falliti) =======================
  // tipo → offesa; chi offende e chi è offeso dagli attori del fatto (come Fatto.OFFESE)
  const APRE = UR.APRE = { furto: [0, 1, .55], rinfacciato: [0, 1, .3], lite: [0, 1, .4], muso: [1, 0, .2], buca: [0, 1, .25], infamia_creduta: [1, 0, .35], lancio: [0, 1, .55], guasto: [0, 1, .3], denuncia: [0, 1, .4], rissa: [0, 1, .45], sfotto: [0, 1, .3], equivoco: [1, 0, .15], insulto: [0, 1, .3], spinta: [0, 1, .5], botte: [0, 1, .7] };
  const TIENE = { compra: 0, prende: 0, raccoglie: 0, fa: 0, pesca: 0, regalo: 1, dai: 1, restituito: 1 };
  const ATTORI = f => [f.chi].concat(f.con || []).map(io);
  function leggi(st, s) {
    const F = FT(), M = F._.M(st); if (!M) return; let k = 0; if (s.ult > M.n) s.ult = M.n;
    while (s.ult < M.n && k++ < CFG.fattiPasso) {
      const f = F.di(st, ++s.ult); if (!f) continue;
      // il contratto: il verbo fallito di un NPC lascia una cosa nel mondo (vicino al giocatore quasi sempre, lontano di rado)
      if (f.esito === 'no' && f.x && f.x.verbo && f.chi && f.chi !== 'nino') { const n = npc(st, f.chi), vic = n && vicinoG(st, n); if (rnd() < (vic ? .6 : .12)) CO().guasto(st, f); continue; }
      if ((f.v === 'comica' || f.v === 'guasto') && f.chi && f.chi !== 'nino') rep(st, f.chi, 'ridicolo', .03 + Math.min(.12, (f.test || []).length * .02));
      // in mano, sempre (§3.1): la cosa appena comprata, presa, raccolta o ricevuta si vede in mano per qualche secondo
      if (f.cosa && TIENE[f.v] !== undefined && f.esito !== 'no') { const h = TIENE[f.v] ? (f.con || [])[0] : f.chi, n = h && h !== 'nino' ? npc(st, h) : null; if (n && vicinoG(st, n)) CO().mano(st, n.id, f.cosa, 7); }
      const o = APRE[f.v]; if (!o) continue;
      if (f.v === 'guasto' && !(f.con && f.con.length)) continue;
      if (f.v === 'lancio' && !(f.con && f.con.length)) continue;
      const A = ATTORI(f), off = A[o[0]], vit = A[o[1]]; if (!off || !vit || vit === 'nino') continue;
      const c = aperta(st, vit, off); if (c) { if (c.a === vit) c.of = r2(clamp(c.of + o[2] * .3, 0, 1.4)); continue; }
      const vn = npc(st, vit); if (!vn || !vn.pop) continue;
      // si apre se la prima voglia di salire c'è (il conto, non un copione)
      const prova = { of: o[2], g: 0, chi: null, ug: 0 };
      if (salire(st, prova, vit, off) > CFG.soglia * .5) { const c2 = apri(st, vit, off, o[2], f.id); if (c2 && !vicinoG(st, vn)) c2.lontano = 1; }
    }
  }
  // il giocatore che mena le mani: chi è stato colpito da vicino (Game, n.hitT) può rispondere
  function giocatore(st, s) {
    const p = st.player; if (!p || p.vehicle) return;
    for (const n of st.npcs) {
      if (n.dead || n.inside || !n.pop || n.cop || n.grigio || n.faction || Math.abs(n.x - p.x) > 4 || Math.abs(n.y - p.y) > 4) continue;
      if (!(n.hitT > (s.hit[n.id] || 0))) continue; s.hit[n.id] = n.hitT;
      if (st.clock - n.hitT > 1) continue;
      const f = scrivi(st, 'botte', ['nino', n.id], { d: `${G.PLAYER_NAME || 'Nino'} ha alzato le mani su ${nome(st, n.id)}` }, null);
      const c = aperta(st, n.id, 'nino'); if (c) { c.of = r2(clamp(c.of + .3, 0, 1.4)); continue; }
      const prova = { of: .7, g: 0, chi: null, ug: 0 }; if (salire(st, prova, n.id, 'nino') > CFG.soglia) { const c2 = apri(st, n.id, 'nino', .7, f ? f.id : null, 2); if (c2) { n.panic = 0; } }
    }
    const K = Object.keys(s.hit); if (K.length > 200) for (const k of K.slice(0, 100)) delete s.hit[k];
  }

  // ======================= LA MENTE: «affronta» per vendicarsi (il filo di vendetta del regista spinge «vendicarsi») =======================
  { const Mn = ME(); if (Mn && Mn.estendi && Mn.OBIETTIVI && Mn.OBIETTIVI.vendicarsi) {
    const affronta = c => {
      const st = c.st, M = c.M; let best = null, bv = .3;
      for (const id in M.rel || {}) { const r = FT().rancore(st, io(c.n.id), id); if (r > bv) { const k = npc(st, id); if (k && !k.dead && k !== st.player && !k.inside && !k.cop) { bv = r; best = k; } } }
      if (!best || aperta(st, c.n.id, best.id)) return null;
      const d = hyp(best.x - c.n.x, best.y - c.n.y); if (d > 120 && !(c.lod === 'lontano' || c.lod === 'dormiente')) return null;
      const f = 1.3 / Math.max(1.3, d), passi = d > 2.5 ? [['vai', { x: r1(best.x + (c.n.x - best.x) * f), y: r1(best.y + (c.n.y - best.y) * f) }]] : [];
      return { passi: passi.concat([['guarda_storto', { chi: best.id }]]), costo: .4 - (c.M.carattere.rancore || 0) * .2, chi: best.id };
    };
    Mn.estendi({ metodi: { affronta }, costo: { affronta: k => .45 - (k.rancore || 0) * .3 + (k.legge || 0) * .3 } });
    if (!Mn.OBIETTIVI.vendicarsi.metodi.includes('affronta')) Mn.OBIETTIVI.vendicarsi.metodi.push('affronta');
  } }

  // ======================= LA FASE =======================
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return; const t0 = now();
    leggi(st, s);
    if ((Un().passi % 10) === 0) giocatore(st, s);
    for (let i = GEST.length - 1; i >= 0; i--) if (st.clock >= GEST[i][1]) { const n = npc(st, GEST[i][0]); if (n && n.gesture === 'punch') n.gesture = 0; GEST.splice(i, 1); }
    for (const c of s.L.slice()) {
      const na = npc(st, c.a);
      if (!na || !vicinoG(st, na)) {   // lontano: tutta la lite in un colpo, con lo stesso conto
        stats.lontane++; for (let j = 0; j < CFG.turni + 2 && s.L.includes(c); j++) turno(st, c);
        if (s.L.includes(c)) chiudi(st, c, 'sbollita'); continue;
      }
      if (st.clock - c.tc < CFG.turno) continue; c.tc = r2(st.clock); turno(st, c);
    }
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.rissa', { dopo: 'unico.cose', budget: { p95: .05 } }, fase);
  if (Un().nasce) Un().nasce('rissa', st => { S(st); });

  // un «guarda_storto» chiesto dalla Mente (affronta) apre la lite: chi guarda storto è l'offeso che è andato a cercare l'altro
  APRE.guarda_storto = [1, 0, .45];

  // ======================= I SEGNI, I FILI, LE OFFESE =======================
  { const O = FT().OFFESE; Object.assign(O, { insulto: [0, 1, .25], spinta: [0, 1, .35], minaccia: [0, 1, .4], botte: [0, 1, .6], coltellata: [0, 1, .9], sparo: [0, 1, 1], fuga: [1, 0, -.05] });
    const Gv = FT().GRAV; Object.assign(Gv, { guarda_storto: .1, borbotta: .1, insulto: .4, spinta: .55, minaccia: .6, botte: .85, coltellata: .95, sparo: 1, scuse: .3, risata: .25, pace_pagata: .35, fuga: .4, resa: .45, separati: .4, rissa_fine: .5, chiama_aiuto: .35 }); }
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    guarda_storto: { p: 'esclamativo', w: '?', gz: 0, n: ['occhiataccia', 'occhiatacce'] }, borbotta: { p: 'fumetto', w: '...', posa: 'discute', gz: 0, n: ['borbottio', 'borbottii'] },
    insulto: { p: 'muso', w: '!#@!', posa: 'discute', gz: .35, n: ['insulto', 'insulti'], r: ['{A} ha insultato {B}.', 'Parole grosse fra {A} e {B}.'] },
    spinta: { p: 'mano', w: 'SCIAFF', gz: .5, n: ['spintone', 'spintoni'], r: ['{A} ha dato uno spintone a {B}.'] },
    minaccia: { p: 'esclamativo', w: 'occhio!', posa: 'mira', gz: .55, n: ['minaccia', 'minacce'], r: ['{A} ha minacciato {B}[ con {cosaN}].'] },
    botte: { p: 'esclamativo', w: 'TONF', gz: .8, n: ['scazzottata', 'scazzottate'], r: ['{A} ha menato {B}.', 'Botte fra {A} e {B}.'] },
    coltellata: { p: 'esclamativo', w: 'ZAC', gz: .95, n: ['coltellata', 'coltellate'], r: ['{A} ha ferito {B} con una lama.'] },
    sparo: { p: 'esclamativo', w: 'BANG', gz: 1, n: ['sparatoria', 'sparatorie'], r: ['Spari: {A} contro {B}.'] },
    scuse: { p: 'stretta', w: 'scusa', posa: 'discute', gz: .2, n: ['scusa', 'scuse'] }, risata: { p: 'fumetto', w: 'ahah', posa: 'discute', gz: .15, n: ['risata', 'risate'] },
    pace_pagata: { p: 'moneta', w: 'offro io', posa: 'porge', gz: .3, n: ['caffè della pace', 'caffè della pace'] }, fuga: { p: 'freccia', w: 'via!', gz: .3, n: ['fuga', 'fughe'] },
    resa: { p: 'mano', w: 'basta!', gz: .35, n: ['resa', 'rese'] }, separati: { p: 'stretta', w: 'fermi!', posa: 'discute', gz: .35, n: ['lite sedata', 'liti sedate'] },
    rissa_fine: { p: 'fumetto', gz: .6, n: ['lite finita', 'liti finite'], bolla: false }, chiama_aiuto: { p: 'esclamativo', w: 'aiuto!', gz: .3, n: ['richiesta d\'aiuto', 'richieste d\'aiuto'] },
    denuncia: { p: 'esclamativo', w: 'ai Grigi', gz: .5, n: ['denuncia', 'denunce'] },
  });
  const R = RG();
  if (R && R.TIPI_FILO) {
    const R_ = (fam, m, r, o) => Object.assign({ fam, m, r }, o || {}), T_ = R.TIPI_FILO;
    for (const t of ['insulto', 'spinta', 'minaccia', 'botte', 'coltellata', 'sparo', 'lancio']) T_[t] = (T_[t] || []).concat([R_('offesa', 'apre', { offensore: 'chi', offeso: 'con0' })]);
    for (const t of ['scuse', 'pace_pagata', 'risata']) T_[t] = [R_('offesa', 'chiude', { offensore: 'chi', offeso: 'con0' }, { esito: 'pace' })];
    for (const t of ['fuga', 'resa', 'separati', 'rissa_fine', 'guarda_storto', 'chiama_aiuto']) T_[t] = (T_[t] || []).concat([R_('offesa', 'avanza', { offeso: 'chi', offensore: 'con0' })]);
    Object.assign(R.GT, { insulto: .3, spinta: .45, minaccia: .5, botte: .7, coltellata: .9, sparo: 1, lancio: .4, guasto: .1, scuse: -.2, pace_pagata: -.25, risata: -.15, separati: -.2, fuga: .2, resa: .1 });
    try { R.problemi = R.controlla(); } catch (e) { }
  }

  Object.assign(UR, { S, salire, cima, forza, turno, chiudi, leggi, fase, effetto, pace, intorno, malavita, _: { GEST, BROKEN, FATTO_G } });
  Un().Rissa = UR;
  return UR;
})();
if (typeof window !== 'undefined') window.UnicoRissa = UnicoRissa;
