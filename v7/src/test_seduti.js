// [seduti] prova: nessun abitante si muove in posa seduta, chi è seduto ha un sedile sotto, la figura ripresa dalla cache torna
// neutra; l'unica eccezione è la sedia da ufficio con le rotelle, e solo se la figura ha la sedia.
//   1. lo stato (Anim.npcState, dopo tutte le mappe): passo dichiarato o spostamento vero oltre 0,2 m/s → niente pose sedute;
//   2. all'aperto «siede» vale solo con un sedile del registro a meno di 0,8 m (o col mobile garantito dalla mappa, s.sedile);
//   3. la figura (Anim.apply): appena va oltre 0,2 m/s lo strato seduto si spegne nello stesso fotogramma, anche se la posa è
//      chiesta lo stesso (una mappa sbagliata, un evento); il contatore delle violazioni resta a zero;
//   4. Anim.reset: la figura messa da parte e ripresa non porta con sé la posa di prima;
//   5. la sedia con le rotelle: si muove seduto solo con la sedia visibile; i due modi (avanti/indietro) si alternano, le piroette ci sono.
// cd v7/src && node test_seduti.js
const path = require('path'), fs = require('fs'), vm = require('vm');
global.THREE = require(path.join(__dirname, 'three.min.js'));
global.window = global; global.document = { createElement: () => ({ getContext: () => null }) };
const warn = console.warn; console.warn = () => {};
for (const f of ['animazioni.js', 'anim_vita.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), { filename: f });
console.warn = warn;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// una mappa che chiede di sedersi sempre (come il posto o la routine «panchina» rimasti accesi)
let forza = null; Anim.npcMap((st, n, s) => { if (forza && n.forza) s.act = forza; });
const st = { clock: 0, t: 0, npcs: [], player: { x: 999, y: 999 } };
const npc = (id, x, y) => { const n = { id, x, y, face: 0, speedNow: 0, action: { name: 'routine' }, forza: true }; st.npcs.push(n); return n; };
const tick = (dt, f) => { st.clock += dt; st.t += dt / 60; if (f) f(); };

// 1) chi si muove non è seduto
forza = 'siede';
const a = npc('a', 0, 0); Anim.npcState(st, a);
tick(.1); ok(Anim.npcState(st, a).act === 'siede', 'fermo (nessun registro dei sedili): seduto');
a.speedNow = 1.3; tick(.1); ok(Anim.npcState(st, a).act === null, 'passo dichiarato 1,3 m/s: in piedi');
a.speedNow = 0; tick(.1, () => { a.x += .13; }); ok(Anim.npcState(st, a).act === null, 'spostamento vero 1,3 m/s col passo a zero: in piedi');
tick(.1); ok(Anim.npcState(st, a).act === 'siede', 'di nuovo fermo: seduto');
tick(.1, () => { a.x += 40; }); ok(Anim.npcState(st, a).act === 'siede', 'un teletrasporto non conta come passo');
tick(.1, () => { a.x += .015; }); ok(Anim.npcState(st, a).act === 'siede', 'a 0,15 m/s (sotto la soglia) resta seduto');

// 2) un sedile sotto
Anim.sedileAdd(10, 10, 0, .55);
const b = npc('b', 0, 0); tick(.1);
ok(Anim.npcState(st, b).act === null, 'all\'aperto, nessun sedile vicino: in piedi (niente sedute nel vuoto)');
b.x = 10.3; b.y = 10.1; tick(.1); Anim.npcState(st, b); tick(.1);
ok(Anim.npcState(st, b).act === 'siede', 'sulla panchina (0,3 m dal centro, dentro la lunghezza): seduto');
b.room = { pose: 'siede' }; b.x = 50; tick(.1); Anim.npcState(st, b); tick(.1);
ok(Anim.npcState(st, b).act === 'siede', 'dentro casa il mobile lo garantisce la mappa: seduto');
b.room = null; forza = 'siede_terra'; tick(.1);
ok(Anim.npcState(st, b).act === 'siede_terra', 'seduto per terra non chiede un sedile');
b.speedNow = 1; tick(.1); ok(Anim.npcState(st, b).act === null, '…ma camminando no');
const sn = Anim.sedileNear(9.5, 10.4, 2, true, 'x'); ok(sn && Math.abs(sn.x - 9.5) < .01 && Math.abs(sn.z - 10) < .01, 'sedileNear: il punto lungo la panca');
sn.q.by = 'y'; ok(!Anim.sedileNear(9.5, 10.4, 2, true, 'x'), 'un sedile preso da un altro non è libero');
sn.q.by = null;

// 3) la figura: uno scheletro minimo con le ossa del kit
function figura() {
  const g = new THREE.Group(), body = new THREE.Group(), m = new THREE.Group(); body.add(m); g.add(body);
  const B = (name, parent, y, x) => { const o = new THREE.Bone(); o.name = name; o.position.set(x || 0, y, 0); parent.add(o); return o; };
  const root = new THREE.Bone(); root.name = 'Root'; m.add(root);
  const hips = B('Hips', root, .95), ab = B('Abdomen', hips, .1), to = B('Torso', ab, .1), ch = B('Chest', to, .12), ne = B('Neck', ch, .15); B('Head', ne, .1);
  for (const [sd, s] of [['L', 1], ['R', -1]]) {
    const sh = B('Shoulder' + sd, ch, .1, .08 * s), ua = B('UpperArm' + sd, sh, 0, .1 * s), la = B('LowerArm' + sd, ua, -.28), wr = B('Wrist' + sd, la, -.25); B('Middle2' + sd, wr, -.08);
    const ul = B('UpperLeg' + sd, hips, -.05, .1 * s), ll = B('LowerLeg' + sd, ul, -.43); B('Foot' + sd, root, .08, .1 * s);
  }
  g.userData = { body, model: 'prova' }; g.updateMatrixWorld(true); return g;
}
const g = figura(), u = g.userData;
const frame = (o) => { Anim.restore(g); Anim.apply(g, o, 1 / 30, st.clock); st.clock += 1 / 30; };
for (let i = 0; i < 30; i++) frame({ speed: 0, anim: { act: 'siede', mood: [] } });
ok(u.rig && u.rig.layers.siede && u.rig.layers.siede.w > .9, 'fermo, posa seduta piena (strato siede ' + (u.rig && u.rig.layers.siede ? u.rig.layers.siede.w.toFixed(2) : '-') + ')');
const v0 = Anim.sedutiReport().viol;
frame({ speed: 1.3, anim: { act: 'siede', mood: [] } });
ok(!u.rig.layers.siede, 'appena si muove (anche se la posa è chiesta lo stesso): lo strato seduto è spento nello stesso fotogramma');
for (let i = 0; i < 20; i++) frame({ speed: 1.3, anim: { act: 'siede', mood: [] } });
ok(Anim.sedutiReport().viol === v0, 'nessuna violazione registrata camminando');
frame({ speed: 0, anim: { act: 'tavola', mood: [], velo: .9 } });
ok(!u.rig.layers.tavola, 'il passo vero (velo dallo stato) basta anche col passo dichiarato a zero');

// 4) dalla cache: la figura torna neutra
for (let i = 0; i < 30; i++) frame({ speed: 0, anim: { act: 'siede', mood: [] } });
u.body.position.y = -.4; Anim.reset(g);
ok(Object.keys(u.rig.layers).length === 0 && u.body.position.y === 0, 'Anim.reset: niente strati, il corpo al suo posto');
frame({ speed: 1.3, anim: { act: null, mood: [] } });
ok(!u.rig.layers.siede && u.body.position.y === 0, 'ripresa e subito in cammino: in piedi dal primo fotogramma');

// 5) la sedia con le rotelle
const r = npc('r', 30, 30); r.forza = false; r.rotelle = true; r.pop = { age: 40 }; r.speedNow = 1.2;
tick(.1); const sr = Anim.npcState(st, r);
ok(sr.act === 'rotelle' && sr.rotelle, 'chi ha la sedia con le rotelle va seduto anche camminando');
const gr = figura(), ur = gr.userData; ur.sediaR = Anim.sediaRotelle(); gr.add(ur.sediaR); ur.sediaR.visible = true;
const v1 = Anim.sedutiReport().viol;
for (let i = 0; i < 40; i++) { Anim.restore(gr); Anim.apply(gr, { speed: 1.2, anim: { act: 'rotelle', rotelle: { back: false }, mood: [] } }, 1 / 30, st.clock); }
ok(ur.rig.layers.rotelle && ur.rig.layers.rotelle.w > .9 && Anim.sedutiReport().viol === v1, 'con la sedia: posa seduta in movimento, nessuna violazione');
ur.sediaR.visible = false; Anim.restore(gr); Anim.apply(gr, { speed: 1.2, anim: { act: 'rotelle', mood: [] } }, 1 / 30, st.clock);
ok(!ur.rig.layers.rotelle, 'senza la sedia: in piedi');
const sg = ur.sediaR.geometry; sg.computeBoundingBox();
ok(sg.attributes.position.count < 1200 && sg.boundingBox.max.y > .9 && sg.boundingBox.max.y < 1.05 && Math.abs(sg.boundingBox.min.y) < .01, `la sedia: ${sg.attributes.position.count / 3} triangoli, alta ${sg.boundingBox.max.y.toFixed(2)} m, a terra`);
ok(Anim.sediaRotelle().geometry === sg, 'la geometria è condivisa');
let modi = new Set(), piro = 0; const r2 = { id: 'r2' };
for (let t = 0; t < 1200; t += .25) { st.clock = t; const y = Anim.rotelleYaw(st, r2); modi.add(Math.abs(y - Math.PI) < 1e-9 ? 'indietro' : y === 0 ? 'avanti' : 'giro'); if (y !== 0 && Math.abs(y - Math.PI) > 1e-9) piro++; }
ok(modi.has('avanti') && modi.has('indietro') && piro > 0, 'in 20 minuti: avanti, all\'indietro e qualche piroetta (' + [...modi].join(', ') + ')');
// la scelta: pochi in tutta la città
const S2 = { clock: 0, npcs: [], player: { x: 0, y: 0 } };
for (let i = 0; i < 1500; i++) S2.npcs.push({ id: 'p' + i, x: 0, y: 0, pop: { age: 20 + (i % 50) }, action: { name: 'routine' } });
Anim.npcState(S2, S2.npcs[0]); const nr = S2.npcs.filter(n => n.rotelle).length;
ok(nr >= 1 && nr <= 3, `in sedia con le rotelle: ${nr} su ${S2.npcs.length}`);

console.log(fail ? `\n${fail} PROVE FALLITE` : '\ntutto bene'); process.exit(fail ? 1 : 0);
