/* Porto Vecchio — [regia] LA CAMERA CHE TENDE ALLO SCORCIO MIGLIORE (le regole, senza grafica: le usa render.js, le prova test_regia.js).
   Il committente (29 ottobre): due levette, una per camminare e una per la visuale (gira attorno al personaggio e fa lo zoom); la camera
   resta dove la metti, ma quando non la tocchi tende all'inquadratura che mostra lo scorcio migliore e combacia con la direzione del
   personaggio, senza correggere in continuazione, in modo equilibrato, favorendo le inquadrature cinematografiche.
   Come:
   - SI ASPETTA: niente regia mentre il giocatore tocca la visuale e per K.mano secondi dopo, da fermi, e finché la direzione di marcia non
     è stabile da K.stabile secondi (una svolta breve non sposta la camera).
   - SI SCEGLIE di rado (ogni K.ogni s): poche inquadrature attorno al «dietro» della marcia (dritto, tre quarti a destra e a sinistra, più
     di lato), ognuna col suo voto: quanto si vede del personaggio e della strada davanti (raggi verso la camera che non devono passare
     dentro le case), quanto si allontana dal dietro, un premio al tre quarti (più cinematografico del dritto alle spalle) e la continuità
     con la scelta di adesso. Il bersaglio cambia solo se il nuovo è oltre K.banda dal vecchio (niente ritocchi piccoli).
   - SI VA PIANO: verso il bersaglio con un tempo lungo (K.tau) e una velocità massima (K.vmax), così non si sente la mano della regia.
   Gli angoli sono nello stesso spazio di cam.uy in render.js (la visuale meno YAW). ?noregia: la camera resta sempre dove la metti.  */
var Regia = (function () {
  'use strict';
  const K = {
    mano: 3,          // s: dopo che il giocatore ha toccato la visuale, la regia aspetta tanto
    vel: .5,          // m/s: sotto questa velocità si è fermi (niente regia)
    stabile: .7,      // s: la direzione di marcia deve restare dentro K.svolta per tanto prima di scegliere
    svolta: .35,      // rad
    ogni: .6,         // s: una scelta ogni tanto, non a ogni fotogramma
    banda: .3,        // rad: un bersaglio nuovo solo se diverso di tanto dal vecchio
    tau: 1.4,         // s: il tempo con cui la camera va verso il bersaglio
    vmax: .8,         // rad/s
    vmin: .08,        // rad/s: la velocità minima nell'ultimo tratto
    piedi: [0, .4, -.4, .75, -.75],   // rad: le inquadrature candidate a piedi, attorno al dietro (tre quarti, poi più di lato)
    mezzo: [0, .22, -.22],            // e su un mezzo: quasi dietro (si guida)
    pesi: { copreMe: 3, copreAvanti: 2, copreLontano: 1, lato: 1.1, dritto: .45, salto: .7 },
  };
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  // il «dietro» della direzione hd (angolo del gioco: x = cos, y = sin) nello spazio della visuale: la camera sta dalla parte opposta
  const dietro = (hd, YAW) => ang(Math.atan2(-Math.cos(hd), -Math.sin(hd)) - YAW);
  // il voto di un'inquadratura (più basso è meglio). copre(o, q): il numero di raggi bloccati fra il punto o (in metri, {x, y, z} con y in
  // alto) e la camera q. q.cam(yaw): la posizione della camera per quella visuale
  function voto(off, base, cur, q) {
    const P = K.pesi, yaw = base + off, C = q.cam(yaw), a = q.avanti, f = q.fy;
    let v = 0;
    v += P.copreMe * (q.copre({ x: q.x, y: f + .4, z: q.z }, C) + q.copre({ x: q.x, y: f + 1.6, z: q.z }, C));
    v += P.copreAvanti * q.copre({ x: q.x + a.x * 6, y: f + 1, z: q.z + a.z * 6 }, C);
    v += P.copreLontano * q.copre({ x: q.x + a.x * 13, y: f + 1.5, z: q.z + a.z * 13 }, C);
    v += P.lato * Math.abs(off) + (Math.abs(off) < .2 ? P.dritto : 0) + P.salto * Math.abs(ang(yaw - cur));
    return v;
  }
  // un passo. S: lo stato (dura fra un fotogramma e l'altro). q: { uy (la visuale automatica di adesso), YAW, hd (direzione di marcia o
  // null), vel, mano (true se il giocatore tocca la visuale), mezzo, x, z, fy, copre, cam } . Ritorna la nuova uy.
  function passo(S, q, dt) {
    if (S.t === undefined) Object.assign(S, { t: 0, tMano: 99, hd0: null, tHd: 0, tSc: 99, tgt: null, n: 0, perche: '' });
    S.t += dt; S.tSc += dt;
    if (q.mano) { S.tMano = 0; S.tgt = null; S.perche = 'mano'; return q.uy; }
    S.tMano += dt;
    if (S.tMano < K.mano) { S.perche = 'aspetta'; return q.uy; }
    if (q.hd === null || q.hd === undefined || q.vel < K.vel) { S.hd0 = null; S.tHd = 0; S.perche = 'fermo'; return q.uy; }
    if (S.hd0 === null || Math.abs(ang(q.hd - S.hd0)) > K.svolta) { S.hd0 = q.hd; S.tHd = 0; }
    S.tHd += dt;
    if (S.tHd >= K.stabile && S.tSc >= K.ogni) {
      S.tSc = 0; const base = dietro(S.hd0, q.YAW), cur = S.tgt === null ? q.uy : S.tgt;
      q.avanti = { x: Math.cos(S.hd0), z: Math.sin(S.hd0) };
      let best = null, bv = Infinity; for (const off of (q.mezzo ? K.mezzo : K.piedi)) { const v = voto(off, base, cur, q); if (v < bv) { bv = v; best = base + off; } }
      if (best !== null && (S.tgt === null || Math.abs(ang(best - S.tgt)) > K.banda)) { S.tgt = ang(best); S.n++; S.perche = 'scelta'; }
    }
    if (S.tgt === null) return q.uy;
    const d = ang(S.tgt - q.uy); if (Math.abs(d) < .005) return q.uy;
    // morbida all'inizio (il tempo K.tau), ma con una velocità minima (K.vmin): arriva e si ferma, senza la coda lunga dei millimetri
    const m = K.vmax * dt, mn = K.vmin * dt; let step = d * (1 - Math.exp(-dt / K.tau));
    if (Math.abs(step) < mn) step = Math.sign(d) * Math.min(mn, Math.abs(d)); if (step > m) step = m; if (step < -m) step = -m;
    return q.uy + step;
  }
  // il raggio dal punto o alla camera c passa dentro la scatola b ({min, max})? (il tratto, non la semiretta)
  function taglia(o, c, b) {
    let t0 = 0, t1 = 1;
    for (const k of ['x', 'y', 'z']) { const d = c[k] - o[k], lo = b.min[k], hi = b.max[k];
      if (Math.abs(d) < 1e-9) { if (o[k] < lo || o[k] > hi) return false; continue; }
      let a = (lo - o[k]) / d, e = (hi - o[k]) / d; if (a > e) { const t = a; a = e; e = t; }
      if (a > t0) t0 = a; if (e < t1) t1 = e; if (t0 > t1) return false; }
    return true;
  }
  return { K, passo, voto, dietro, taglia, ang };
})();
if (typeof window !== 'undefined') window.__REGIA = Regia.K;
if (typeof module !== 'undefined') module.exports = Regia;
