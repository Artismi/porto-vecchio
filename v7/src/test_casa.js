// [commedia] prova della casa di ognuno (casa.js, dietro ?commedia): gli abitanti arredano, spostano, buttano, ridipingono
// con gli stessi verbi del giocatore e sullo stesso stato (la pianta del piano); le visite che notano; la banda; la consistenza.
// Uso (dalla cartella src): node test_casa.js [seme] [--giorni=3] [--dt=0.1]
require('./seme.js')(process.argv[2]);
const ARG = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; };
const GIORNI = +(ARG('giorni') || 3), DT = +(ARG('dt') || .1);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// 0) spento: niente agganci, solo { ON: false }
{
  const out = require('child_process').execFileSync(process.execPath, ['-e', `global.World=require('./world.js');global.Interior=require('./interiors.js');global.Game=require('./game.js');const s=Game.HOOKS.step,i=Game.HOOKS.indoor;const C=require('./casa.js');console.log(JSON.stringify({k:Object.keys(C),on:C.ON,same:Game.HOOKS.step===s&&Game.HOOKS.indoor===i}))`], { cwd: __dirname }).toString().trim().split('\n').pop();
  const o = JSON.parse(out); ok(o.on === false && o.same && o.k.length === 1 && o.k[0] === 'ON', `spento: esporta solo {ON:false}, nessun aggancio (${out})`);
}

global.location = { search: '?commedia' };
global.World = require('./world.js'); global.Interior = require('./interiors.js'); global.Game = require('./game.js');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require('./' + f + '.js'); } catch (e) { console.log('(manca ' + f + ': ' + e.message.slice(0, 90) + ')'); } }
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
try { global.Cantiere = require('./cantiere.js'); } catch (e) { console.log('(manca cantiere: ' + e.message.slice(0, 90) + ')'); }
delete global.document;
global.Commedia = require('./commedia.js'); global.Parola = require('./parola.js'); global.Vita = require('./vita.js'); global.Iniziative = require('./iniziative.js');
const CA = require('./casa.js'); global.Casa = CA;
const G = Game, I = Interior;
ok(CA.ON === true && typeof CA.fai === 'function', 'acceso con ?commedia');

// 1) le battute e i colori
{
  const all = []; Object.values(CA.BANCHE).forEach(L => L.forEach(t => all.push(t)));
  const lunghe = all.filter(t => t.replace(/\{\w+\}/g, 'xxxxxxxxxxxx').length > 70);
  ok(all.length >= 60 && !lunghe.length, `${all.length} battute nelle banche, nessuna oltre 70 caratteri (con i nomi lunghi)${lunghe.length ? ': ' + lunghe.slice(0, 2).join(' | ') : ''}`);
  const ink = Object.keys(CA.INK); ok(!ink.some(k => /vermiglio|limone|allarme/.test(k)) && ink.length >= 10, `la tavolozza delle pareti: ${ink.length} inchiostri della Bibbia, nessuno dei tre riservati`);
}

// 2) la partita: il giocatore gira per la città e ogni tanto entra in una casa dove abita qualcuno (a guardare)
CA.CFG.fatti = 1e6;
const seme = +process.argv[2] || 1, st = G.create(seme), p = st.player; st.deadline = 1e12;
const GIRO = ['piazza', 'fontana', 'calata', 'molo', 'osteria', 'giardini', 'lungomare', 'piazzetta', 'vico', 'bar'].map(k => G.PLACES[k]).filter(Boolean);
let tappa = 0, Pz = GIRO[0], wp = null, dentro = null, guardate = 0; p.x = Pz.x; p.y = Pz.y + 2;
const t0 = Date.now(), passi = Math.round(GIORNI * 1440 / G.MIN_PER_SEC / DT), tempi = [];
const homeBi = n => (n && n.pop && n.pop.homeT && n.pop.homeT.k === 'b' ? n.pop.homeT.bi : null);
function entraDa(n) {   // il giocatore entra nella casa di n, al suo piano
  const bi = homeBi(n), b = G.BUILDINGS[bi]; if (!b || b.playerHome) return false;
  if (!G.enterBuilding(st, bi)) return false; const L = I.layout(b), f = CA.pianoDi(L, n.pop.hh);
  if (f > 0 && L.stairs) { p.indoor.f = f; p.x = L.stairs.landing[0]; p.y = L.stairs.landing[1]; if (G.HOOKS.indoor) G.HOOKS.indoor(st, b, true); }
  dentro = { bi, f, until: st.clock + 70, n }; guardate++; return true;
}
for (let k = 0; k < passi; k++) {
  if (dentro) {
    if (st.clock > dentro.until || !p.indoor) { G.exitBuilding(st); dentro = null; Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
    else if (k % 50 === 0) {   // chi è a casa ci mette mano (lo stesso codice di sempre: decidi; qui solo più spesso, per vederlo)
      st.npcs.forEach(n => { if (homeBi(n) === dentro.bi && CA._.aCasa(st, n) && CA._.libero(st, n) && Math.random() < .25) CA.decidi(st, n); });
    }
    const a = process.hrtime.bigint(); G.step(st, DT, { x: 0, y: 0 }); tempi.push(Number(process.hrtime.bigint() - a) / 1e6);
    continue;
  }
  if (k % Math.round(100 / DT) === 0 && k) {
    const h = (st.t % 1440) / 60, cand = h > 9 && h < 21 ? st.npcs.filter(n => CA._.aCasa(st, n) && CA._.libero(st, n) && homeBi(n) != null && !G.BUILDINGS[homeBi(n)].playerHome) : [];
    if (cand.length && Math.random() < .7) { const n = cand[Math.floor(Math.random() * cand.length)]; if (entraDa(n)) continue; }
    Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; p.indoor = null;
  }
  if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = Math.random() * 6.283, r = Math.random() * 25; wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 20 }; }
  const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
  G.step(st, DT, { x: dx / dd, y: dy / dd });
}
if (p.indoor) G.exitBuilding(st);
const Cs = st.casa, SS = Cs.stats, secs = (Date.now() - t0) / 1000;
console.log(`      ${GIORNI} giorni di gioco in ${secs.toFixed(0)} s (${passi} passi), ${st.npcs.length} abitanti, ${guardate} case visitate dal giocatore`);

// 3) le case cambiate (si mettono in opera tutte, come se il giocatore entrasse in ognuna)
const tutte = Object.values(Cs.case); let tm = Date.now(); tutte.forEach(C => CA.mettiInOpera(st, C.bi));
const okOps = tutte.flatMap(C => C.ops.filter(o => o.r && o.r.ok)), per = {}; okOps.forEach(o => { per[o.v] = (per[o.v] || 0) + 1; });
const cambiate = tutte.filter(C => C.ops.some(o => o.r && o.r.ok && o.chi !== 'player'));
console.log(`      righe ${SS.ops} (in opera ${okOps.length}, a vuoto ${SS.fallite}), messe in opera dopo la partita in ${Date.now() - tm} ms; per verbo ${JSON.stringify(per)}`);
console.log(`      scene ${SS.scene} (finite ${SS.sceneFinite}, interrotte ${SS.sceneRotte}); comprati ${SS.comprati}, rubati ${SS.rubati}, vietate ${SS.vietate}, voglie aperte ${Object.values(Cs.voglie).reduce((s, L) => s + L.length, 0)}; gusto spostato ${JSON.stringify(SS.drift)}`);
ok(cambiate.length >= 20, `case cambiate dai loro abitanti: ${cambiate.length}`);
ok(SS.spostati >= 10, `cose spostate (alla finestra, la tv in mezzo, scambi): ${SS.spostati}`);
ok(SS.portati >= 5, `cose portate in casa (comprate, regalate, rubate, fatte): ${SS.portati}`);
ok(SS.buttati >= 5, `cose buttate via: ${SS.buttati}`);
ok(SS.dipinti >= 3, `pareti ridipinte: ${SS.dipinti}`);
const muri = okOps.filter(o => o.v === 'dipingi'), colori = new Set(muri.map(o => o.ink));
ok(colori.size >= 3, `colori diversi sulle pareti: ${[...colori].join(', ')}`);
{ const prov = {}; okOps.filter(o => o.v === 'posa').forEach(o => { const k = (o.prov && o.prov.come) || 'tasche'; prov[k] = (prov[k] || 0) + 1; }); console.log('      la roba portata in casa, da dove: ' + JSON.stringify(prov)); }
// gli stili: tutti diversi, dal carattere
{
  const stili = {}, col = {}; st.npcs.filter(n => n.pop && homeBi(n) != null).forEach(n => { const s = CA.stile(st, n); stili[s.k] = (stili[s.k] || 0) + 1; col[s.colore] = (col[s.colore] || 0) + 1; });
  ok(Object.keys(stili).length >= 6 && Object.keys(col).length >= 6, `stili di casa: ${JSON.stringify(stili)}; colori: ${Object.keys(col).length}`);
  const g1 = JSON.stringify(CA.gusto(st, st.npcs.find(n => n.pop))); ok(g1 === JSON.stringify(st.casa.gusti[st.npcs.find(n => n.pop).id]), 'il gusto è stabile (lo stesso a ogni lettura)');
}
// gli esempi
{
  const L0 = okOps.slice(-400).filter(o => o.chi !== 'player').slice(0, 400), seen = new Set(), es = [];
  for (const o of L0) { if (seen.has(o.v) || es.length > 9) continue; seen.add(o.v); const n = G.byId(st, o.chi); es.push(`${n ? n.first : o.chi}: ${o.r.desc}${o.prov && o.prov.come ? ' [' + o.prov.come + ']' : ''}`); }
  console.log('      esempi: ' + es.join(' · '));
}

// 4) la consistenza: la pianta che vede chi entra è quella che si rifà dal registro su una pianta nuova
{
  let prov = 0, uguali = 0, diff = null;
  const sample = tutte.filter(C => C.ops.length && C.n === C.ops.length && !C.ops.some(o => !o.r)).slice(0, 25);
  sample.forEach(C => {
    const b = G.BUILDINGS[C.bi], viva = CA.istantanea(st, C.bi);
    const Lf = I.layout(Object.assign({}, b, { i: 'copia' + C.bi })); CA.rifai(Lf, C.ops);
    const rif = Lf.floors.map(F => ({ furn: F.furn.map(o => [o.__ck || o.id, o.id, +o.x.toFixed(2), +o.y.toFixed(2), +(o.ry || 0).toFixed(2), !!o.taken]), muri: F.rooms.map(q => q.wall), pav: F.rooms.map(q => q.floor), sporco: F.rooms.map(q => +(q.dirt || 0).toFixed(2)) }));
    prov++; if (JSON.stringify(viva) === JSON.stringify(rif)) uguali++; else if (!diff) diff = C.bi;
  });
  ok(prov >= 10 && uguali === prov, `chi entra vede lo stato del registro: ${uguali}/${prov} case identiche rifatte da zero${diff != null ? ' (diversa: ' + diff + ')' : ''}`);
  // entrare davvero (Game.enterBuilding → HOOKS.indoor): le righe in attesa vanno in opera prima di disegnare
  const n = st.npcs.find(k => homeBi(k) != null && !G.BUILDINGS[homeBi(k)].playerHome && CA._.libero(st, k) && !CA.pianta(homeBi(k)));
  if (n) {
    const bi = homeBi(n), C = CA.casaDi(st, bi), Lc = I.layout(Object.assign({}, G.BUILDINGS[bi], { i: 'prova' + bi })), fc = CA.pianoDi(Lc, n.pop.hh);
    CA.rifai(Lc, C.ops); const w0 = Lc.floors[fc].rooms[CA.principale(Lc, fc)].wall, ink = w0 === 'blu' ? 'rosa' : 'oltremare', stile = CA.INK[ink].stile;   // com'è adesso (su una copia: la vera non si fa)
    CA.fai(st, n, bi, 'dipingi', { stile, ink }); const op = C.ops[C.ops.length - 1];
    const prima = !op.r; G.enterBuilding(st, bi); const L = I.layout(G.BUILDINGS[bi]), q = L.floors[op.f] && L.floors[op.f].rooms[CA.principale(L, op.f)];
    ok(prima && op.r && op.r.ok && q && q.wall === stile, `una casa lontana: la riga aspetta (${prima}), il giocatore entra e la parete è già ${stile} (era ${w0}, ora ${q && q.wall})`); G.exitBuilding(st);
  }
}

// 5) le scene e le battute: tutte col loro fatto
{
  const fid = new Set(Cs.fatti.map(f => f.id)), senza = Cs.righe.filter(r => !fid.has(r.fatto));
  ok(SS.scene >= 3 && SS.sceneFinite >= 1, `scene in casa col giocatore dentro: ${SS.scene} (finite ${SS.sceneFinite})`);
  ok(SS.senzaFatto === 0 && !senza.length, `battute senza un fatto: ${SS.senzaFatto + senza.length} (in fila ${Cs.righe.length}, dette ${SS.dette}, tolte ${SS.righeTolte})`);
  ok(Cs.righe.every(r => r.text.length <= 70 && !/\{/.test(r.text)), 'battute ≤ 70 caratteri, senza buchi');
  console.log('      sentite: ' + Cs.viste.slice(0, 8).map(v => `«${v.text}»`).join(' '));
  if (!Cs.viste.length) console.log('      in fila: ' + Cs.righe.slice(0, 6).map(v => `«${v.text}»`).join(' '));
}

// 6) le visite che notano (in partita) e il furto riconosciuto (una scena fatta apposta, con i passi veri)
console.log(`      visite in case d'altri: ${SS.visite}, cambi notati ${SS.notati}, roba rubata riconosciuta ${SS.riconosciuti}`);
ok(SS.notati >= 1, `in partita, qualcuno in visita nota un cambio: ${SS.notati}`);
{
  const adulti = st.npcs.filter(n => CA._.libero(st, n) && homeBi(n) != null && !G.BUILDINGS[homeBi(n)].playerHome && n.pop.age > 20);
  const T = adulti[3], V = adulti.find(n => homeBi(n) !== homeBi(T) && n.pop.hh !== T.pop.hh && I.layout(G.BUILDINGS[homeBi(n)]).floors.length === 1);
  const hv = homeBi(V), Lv = CA.layoutDi(hv); CA.mettiInOpera(st, hv);
  const ru = Lv.floors[0].furn.filter(o => !o.taken && /^(ia_radiolina|ia_lampada_tavolo|ia_abatjour|ia_lampada_piede|ia_sveglia|ia_quadro|ia_orologio|ia_telefono)$/.test(o.id));
  if (!ru.length) { const e = CA.fai(st, V, hv, 'posa', { id: 'ia_lampada_piede', g: 'lampada', f: 0 }); }   // se in casa non c'è niente da rubare, una lampada comprata prima
  const r0 = SS.rubati, inv0 = Object.assign({}, T.pop.inv || {});
  st.events.unshift({ id: st.nextId++, type: 'scasso', actor: T.id, target: V.id, owner: V.id, x: V.pop.homeT.x, y: V.pop.homeT.y, t: st.t, npcCrime: true });
  for (let i = 0; i < 200 && SS.rubati === r0; i++) G.step(st, DT, { x: 0, y: 0 });
  const g = Object.keys(T.pop.inv || {}).find(x => CA._.G2F[x] && (T.pop.inv[x] || 0) > (inv0[x] || 0));
  ok(SS.rubati > r0 && g, `lo scasso porta via una cosa vera dalla pianta di ${V.first}: ${g} nelle tasche di ${T.first}`);
  const ht = homeBi(T), res = CA.portaACasa(st, T, g), op = res && CA.fai(st, T, ht, res[0], res[1]);
  CA.mettiInOpera(st, ht);
  ok(op && op.prov && op.prov.come === 'furto' && op.prov.da === V.id && op.r && op.r.ok, `${T.first} la mette in casa sua (provenienza: furto da ${V.first})`);
  // la visita: V entra in casa di T (com'è fatta una visita: dentro, all'edificio dell'altro), il giocatore c'è
  const Lt = I.layout(G.BUILDINGS[ht]), f = op.f; G.enterBuilding(st, ht); p.indoor.f = f; if (f > 0) { p.x = Lt.stairs.landing[0]; p.y = Lt.stairs.landing[1]; }
  const tB = Popolo._.tB(ht); V.pop.at = tB; V.inside = true; V.x = p.x + 1; V.y = p.y; T.inside = true; T.pop.at = Popolo._.tB(ht); T.x = p.x - 1; T.y = p.y;
  const ri0 = SS.riconosciuti; CA.visite(st);
  const f1 = Cs.fatti.find(x => x.tipo === 'riconosce' && x.chi[0] === V.id), nota = (V.pop.diary || []).find(e => e.tag === 'furto' && e.who === T.id);
  ok(SS.riconosciuti > ri0 && f1 && f1.causa === op.fid, `${V.first} in visita riconosce la sua roba: un fatto (a valle del furto) ${f1 ? f1.d : ''}`);
  ok(!!nota, `e se lo segna (il conto aperto di vita.js: «${nota ? nota.text : ''}»)`);
  for (let i = 0; i < 200; i++) G.step(st, DT, { x: 0, y: 0 });
  const r = Cs.righe.filter(x => x.fatto === (f1 && f1.id)); console.log('      la scena: ' + r.map(x => `«${x.text}»`).join(' ') + (r.length ? '' : '(nessuna battuta: la regia ha tenuto il posto)'));
  if (Vita.catena && f1 && f1.vid) console.log('      la catena (Vita): ' + Vita.catena(f1.vid).map(x => x.tipo).join(' → '));
  G.exitBuilding(st);
}

// 7) la casa del giocatore e le basi: nessun abitante ci mette mano (se non ci abita ed è della banda)
{
  const bh = G.BUILDINGS.findIndex(b => b.playerHome), C = Cs.case[bh];
  const intrusi = C ? C.ops.filter(o => o.chi !== 'player' && !(G.byId(st, o.chi) && G.byId(st, o.chi).ris && G.byId(st, o.chi).ris.member && homeBi(G.byId(st, o.chi)) === bh)) : [];
  const n = st.npcs.find(k => CA._.libero(st, k) && homeBi(k) != null && homeBi(k) !== bh), v0 = SS.vietate;
  const r = bh >= 0 ? CA.fai(st, n, bh, 'scambia', {}) : null;
  ok(bh >= 0 && !intrusi.length && r === null && SS.vietate > v0, `casa del giocatore (${bh}): nessun abitante ci ha messo mano (${intrusi.length}); chi ci prova non può`);
  // ci abita uno della banda: allora sì, la casa è di tutti e due
  const m = st.npcs.find(k => CA._.libero(st, k) && homeBi(k) != null && homeBi(k) !== bh && k.pop.age > 18 && !k.cop);
  const h0 = m.pop.homeT; m.pop.homeT = Popolo._.tB(bh); const vietato = !CA.puo(st, m, bh);
  Risacca.join(st, m, 'prova'); const permesso = CA.puo(st, m, bh); m.pop.homeT = h0;
  ok(vietato && permesso, `chi abita nella casa del giocatore ci mette mano solo se è della banda (prima ${!vietato}, dopo ${permesso})`);
  Risacca.leave(st, m, 'prova');
}

// 8) la banda: chi entra diventa giocabile; la sua casa resta sua; quello che fa il giocatore e quello che fa lui stanno nello stesso registro
{
  const m = st.npcs.find(k => CA._.libero(st, k) && homeBi(k) != null && !G.BUILDINGS[homeBi(k)].playerHome && k.pop.age > 18 && !k.cop && (Cs.case[homeBi(k)] || { ops: [] }).ops.some(o => o.chi === k.id && o.r && o.r.ok));
  const bi = homeBi(m), C = CA.casaDi(st, bi), g0 = JSON.stringify(CA.stile(st, m)), ops0 = C.ops.length, sn0 = JSON.stringify(CA.istantanea(st, bi));
  Risacca.join(st, m, 'prova'); m.ris.auto = false;   // il giocatore lo guida
  for (let i = 0; i < 600; i++) G.step(st, DT, { x: 0, y: 0 });
  const suoi = C.ops.slice(ops0).filter(o => o.chi === m.id).length;
  ok(CA.puo(st, 'player', bi) && suoi === 0, `${m.first} è della banda e lo guida il giocatore: da solo non tocca più niente (${suoi}); il giocatore in casa sua può`);
  const f = CA.pianoDi(I.layout(G.BUILDINGS[bi]), m.pop.hh); G.enterBuilding(st, bi); p.indoor.f = f; const L = I.layout(G.BUILDINGS[bi]); if (f > 0) { p.x = L.stairs.landing[0]; p.y = L.stairs.landing[1]; }
  p.inv = p.inv || {}; p.inv.vernice = 1; p.inv.radiolina = 1; st.casa.gioc.ink = Object.keys(CA.INK).indexOf('salvia');
  const acts = Azioni.playerActions(st), aD = acts.find(a => a.id === 'casa_dipingi'), aP = acts.find(a => a.id === 'casa_posa');
  const msg = [aD && aD.run(), aP && aP.run()];
  const dal = C.ops.slice(ops0).filter(o => o.chi === 'player' && o.r && o.r.ok);
  ok(aD && aP && dal.length === 2, `il giocatore, in casa di ${m.first}, con il menu: «${msg.join(' ')}» (${dal.length} righe nel registro della casa)`);
  G.exitBuilding(st);
  m.ris.auto = true; const n0 = C.ops.length; CA.fai(st, m, bi, 'scambia', {}); CA.fai(st, m, bi, 'finestra', {}); CA.mettiInOpera(st, bi);
  const sn = CA.istantanea(st, bi), Lf = I.layout(Object.assign({}, G.BUILDINGS[bi], { i: 'banda' + bi })); CA.rifai(Lf, C.ops);
  const rif = JSON.stringify(Lf.floors.map(F => ({ furn: F.furn.map(o => [o.__ck || o.id, o.id, +o.x.toFixed(2), +o.y.toFixed(2), +(o.ry || 0).toFixed(2), !!o.taken]), muri: F.rooms.map(q => q.wall), pav: F.rooms.map(q => q.floor), sporco: F.rooms.map(q => +(q.dirt || 0).toFixed(2)) })));
  const tuttiQui = C.ops.slice(n0).every(o => o.chi === m.id) && C.ops.some(o => o.chi === 'player') && C.ops.some(o => o.chi === m.id);
  ok(tuttiQui && JSON.stringify(sn) === rif && sn0 !== JSON.stringify(sn), `torna a fare da sé: le sue righe e quelle del giocatore nello stesso registro, la pianta le tiene tutte (rifatta da zero: identica)`);
  console.log(`      il gusto di ${m.first}: prima ${g0}, dopo ${JSON.stringify(CA.stile(st, m))} (entrare nella banda lo sposta: ${JSON.stringify((st.casa.gusti[m.id] || {}).drift)})`);
  Risacca.leave(st, m, 'prova');
}

// 9) il costo
{
  const avg = SS.ms / Math.max(1, SS.passi);
  tempi.sort((a, b) => a - b);
  ok(avg < .1, `costo di casa.js: ${avg.toFixed(4)} ms a passo in media (massimo ${SS.msMax.toFixed(2)} ms; passi ${SS.passi})`);
  console.log(`      i pezzi, al massimo: giro ${(SS.msGiro || 0).toFixed(2)} ms, scene e battute ${(SS.msScene || 0).toFixed(2)} ms, entrare ${(SS.msEntra || 0).toFixed(2)} ms; ${JSON.stringify(SS.mx)}; passi oltre 1 ms: ${SS.oltre1 || 0}; scene senza strada (fatte e basta) ${SS.senzaStrada || 0}; passo del gioco intero p50 ${tempi[tempi.length >> 1].toFixed(2)} ms`);
}
console.log(fail ? `\n${fail} prove fallite.` : '\ntutto bene.');
process.exitCode = fail ? 1 : 0;
