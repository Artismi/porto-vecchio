// [camera6] le prove dei comandi della camera (src/visuale.js levetta6, vista6, relativa6): node src/test_comandi6.js
// [camera7] queste regole ora valgono solo con ?nofixcamera7 (la camera di prima, a piedi); nel gioco di difetto la camera a piedi è la vista unica: la prova test_camera7.js
const V = require('./visuale.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const K = V.COMANDI6;
// 1. a piedi la levetta della visuale gira e inclina, non fa mai zoom
{ const a = V.levetta6(1, 0, false), b = V.levetta6(0, -1, false), c = V.levetta6(.7, .7, false);
  ok(a.giro < 0 && a.pend === 0 && a.zoom === 0, `di lato gira (${a.giro.toFixed(2)} rad/s), non inclina, niente zoom`);
  ok(b.giro === 0 && b.pend > 0 && b.zoom === 0, `in su inclina verso l'orizzonte (${b.pend.toFixed(2)}), niente zoom`);
  ok(V.levetta6(0, 1, false).pend < 0, 'in giù inclina dall\'alto');
  ok(c.zoom === 0 && c.giro !== 0 && c.pend !== 0, 'in diagonale gira e inclina insieme, mai zoom');
  ok(V.levetta6(.08, .05, false).giro === 0, 'nella zona morta niente'); }
// 2. la curva: poco inclinata gira piano, a fondo corsa alla velocità piena
{ const p = Math.abs(V.levetta6(.3, 0, false).giro), f = Math.abs(V.levetta6(1, 0, false).giro); ok(p < f * .2 && Math.abs(f - K.giro) < 1e-9, `a un terzo ${p.toFixed(2)} rad/s, a fondo ${f.toFixed(2)}`); }
// 3. in bici: indietro impenna, di lato gira; impennando di lato il piede; la pendenza non si tocca
{ const a = V.levetta6(0, 1, true), b = V.levetta6(1, 0, true), c = V.levetta6(-.8, .7, true), d = V.levetta6(0, -1, true);
  ok(a.impenna && a.giro === 0 && a.pend === 0, 'in bici: indietro impenna');
  ok(!b.impenna && b.giro < 0 && b.pend === 0, 'in bici: di lato gira la camera');
  ok(c.impenna && c.piede === 1 && c.giro === 0, 'in bici: indietro e di lato, impenna col piede (niente giro)');
  ok(!d.impenna && d.pend === 0 && d.zoom === 0, 'in bici: in avanti niente (la pendenza è della camera da inseguimento)'); }
// 4. le tre viste in giro
{ const [vi, me, al] = K.viste; ok(V.vista6(me) === al && V.vista6(al) === vi && V.vista6(vi) === me, `media → alta → vicina → media (${K.viste.join(', ')})`);
  ok(V.vista6(.7) === vi && V.vista6(.4) === al, 'da uno zoom libero si va alla vista dopo quella più vicina'); }
// 5. la camminata relativa alla camera: in su è il davanti della camera, a destra la sua destra, per ogni orientamento
{ let peggio = 0; for (let yaw = 0; yaw < 6.28; yaw += .5) { const fx = -Math.sin(yaw), fz = -Math.cos(yaw), B = { fx, fz, rx: -fz, rz: fx };
    const su = V.relativa6(B, 0, -1), dx = V.relativa6(B, 1, 0); peggio = Math.max(peggio, Math.hypot(su.x - fx, su.y - fz), Math.hypot(dx.x - B.rx, dx.y - B.rz)); }
  ok(peggio < 1e-9, 'in su = il davanti della camera, a destra = la sua destra (a ogni yaw)');
  ok(V.relativa6({ fx: 0, fz: -1, rx: 1, rz: 0 }, 0, 0) === null, 'ferma: niente direzione'); }
console.log(fail ? `\n${fail} prove non passano` : '\ntutto a posto'); process.exit(fail ? 1 : 0);
