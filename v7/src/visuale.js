/* Porto Vecchio — [visuale3] LA VISUALE SUL PERSONAGGIO E L'INQUADRATURA (le regole, senza grafica: le usa render.js, le prova test_visuale3.js).
   Tre modi di vedere il personaggio quando una casa lo copre, scelti all'avvio con ?visuale= (in gioco non si cambia):
   - 'taglio' (il modo di difetto): la SEZIONE ARCHITETTONICA. Le case fra la camera e il personaggio si tagliano con un piano orizzontale
     poco sopra i suoi piedi, come una pianta d'architetto o il taglio dei Sims: tutto quello che appartiene alla casa (muri, facciate,
     balconi, tetto e roba sul tetto) sopra il piano non si disegna, e la faccia tagliata è un poché pieno, bruno caldo, col filo chiaro.
     Spigoli dritti, niente trasparenze; il taglio scende e risale in un attimo (il piano scivola dal tetto alla quota) e ha l'isteresi
     (si chiude solo dopo un po' che la casa non copre più), così camminando lungo un muro non lampeggia. Sul tetto non si taglia niente.
     La sagoma arancione resta solo come riserva, dove una cosa piccola (un palo, un cavo, un'insegna) copre ancora il personaggio.
   - 'ellisse' ([varco2]): il buco ellittico attorno al personaggio, in ogni materiale.
   - 'sezione' ([visuale]): la casa davanti sbiadisce intera e il personaggio si vede come sagoma.
   La quota del taglio di ogni casa è la più alta che lascia vedere il personaggio e il suolo attorno a lui: il raggio da ogni punto di
   prova (i piedi, il busto, la testa e un anello di suolo attorno) verso la camera entra nella scatola della casa a una certa quota; il
   piano sta un filo sotto la più bassa. Con la camera a 41° il raggio sale di 0,88 m per metro: il muro sul lato camera di un vicolo di
   2,5 m resta alto un metro o poco più, quanto basta a leggere la pianta della strada. */
var Visuale = (function () {
  'use strict';
  const MODI = ['taglio', 'ellisse', 'sezione'];
  function modo(search) { const m = /[?&]visuale=([a-z]+)/.exec(search || ''); return m && MODI.includes(m[1]) ? m[1] : 'taglio'; }
  // le manopole del taglio (window.__TAGLIO per le prove dal vivo)
  const TAGLIO = {
    margine: .1,          // m: il piano sta tanto sotto il punto dove il raggio più basso entra nella casa
    passo: .25,           // m: la quota si arrotonda in giù a questo passo (niente piano che trema di centimetri)
    moncone: .55,         // m sopra i piedi: il taglio più basso che l'anello di suolo può chiedere (il muro resta un moncone che disegna la pianta)
    minimo: .15,          // m sopra i piedi: il taglio più basso in assoluto (il personaggio a ridosso del muro)
    massimo: 3.2,         // m sopra i piedi: fin qui la quota va a passi di `passo`; più su a piani interi (la casa lontana perde solo i piani alti)
    piano: 3.2,           // m: l'altezza di un piano
    dentro: 2.3,          // m sopra i piedi: la casa che ha il personaggio dentro la sua pianta (portico, sottopasso): taglio sopra la testa, senza poché
    anello: 1.35,         // m: il raggio dell'anello di suolo attorno ai piedi che deve restare visibile
    allarga: .7,          // m: la scatola della casa si allarga di tanto per la prova (balconi, gronde e insegne sporgono)
    tieni: .55,           // s: la casa resta tagliata tanto dopo che ha smesso di coprire (l'isteresi)
    alza: .45,            // s: il taglio risale (di almeno `salto`) solo se la quota più alta resta buona per tanto
    salto: .75,           // m
    apri: .22, chiudi: .32, // s: quanto dura lo scivolare del piano in giù e in su
    poche: '#47342a',     // il poché: bruno caldo scuro, la sezione piena del muro (non nero: si legge come materia, non come buco)
    filo: '#eadcc2',      // il filo chiaro sul bordo della sezione
    filoLargo: .07,       // m
  };
  // un passo dell'isteresi. S: Map(id -> stato) che dura fra un fotogramma e l'altro; vuole: Map(id -> { y: quota chiesta, top: cima }) di
  // questo fotogramma (le case che coprono adesso). Ogni stato: on (tagliata), y (quota del piano), a (quanto è aperto, 0-1), top,
  // lost (s da quando non copre), up (s da quando potrebbe risalire). Ritorna il numero di case che hanno cambiato on/off.
  function passo(S, vuole, dt, K) {
    K = K || TAGLIO; let cambi = 0;
    vuole.forEach((v, id) => { let s = S.get(id);
      if (!s) { s = { on: false, y: v.y, a: 0, top: v.top, lost: 0, up: 0, nodisc: !!v.nodisc }; S.set(id, s); }
      if (!s.on) { cambi++; s.on = true; s.y = v.y; s.up = 0; }
      s.lost = 0; s.top = v.top; s.nodisc = !!v.nodisc;
      if (v.y < s.y - .01) { s.y = v.y; s.up = 0; }   // giù subito: serve a vedere
      else if (v.y > s.y + K.salto) { s.up += dt; if (s.up >= K.alza) { s.y = v.y; s.up = 0; } }
      else s.up = 0; });
    S.forEach((s, id) => {
      if (!vuole.has(id)) { s.lost += dt; if (s.on && s.lost >= K.tieni) { s.on = false; cambi++; } }
      s.a = s.on ? Math.min(1, s.a + dt / K.apri) : Math.max(0, s.a - dt / K.chiudi);
      if (!s.on && s.a <= 0) S.delete(id); });
    return cambi;
  }
  const liscio = a => a * a * (3 - 2 * a);
  // la quota del piano che si disegna adesso: scivola dalla cima della casa alla quota del taglio
  const quota = s => s.top + (s.y - s.top) * liscio(s.a);
  // la quota chiesta a una casa dai suoi raggi: entrate = [{ y: quota d'ingresso del raggio, suolo: è un punto dell'anello }]; piedi
  // (sopra K.massimo dai piedi la quota scende a piani interi, K.piano: la casa lontana perde i suoi piani alti, non si affetta a caso)
  function chiesta(entrate, piedi, K) {
    K = K || TAGLIO; let y = Infinity, ylo = Infinity;
    entrate.forEach(e => { const lo = piedi + (e.suolo ? K.moncone : K.minimo); ylo = Math.min(ylo, lo); y = Math.min(y, Math.max(lo, e.y - K.margine)); });
    if (y - piedi > K.massimo) return piedi + Math.max(K.massimo, Math.floor((y - piedi) / K.piano) * K.piano);
    // [mappa_compatta] l'arrotondamento al passo non scende sotto il pavimento del taglio: prima, a ridosso del muro (nei vicoli da 2-3 m
    // della città compatta succede spesso) la quota tenuta a 0,15 m dai piedi finiva arrotondata in giù a 0 (un taglio raso terra)
    return Math.max(ylo, Math.floor(y / K.passo) * K.passo);
  }
  // dove un raggio (o: origine, d: direzione unitaria) entra in una scatola { min: {x,y,z}, max: {x,y,z} }: la quota y del punto d'ingresso
  // (l'origine stessa se ci sta dentro), o null se la manca
  function entra(o, d, b) {
    let t0 = 0, t1 = Infinity;
    for (const k of ['x', 'y', 'z']) { const lo = b.min[k], hi = b.max[k];
      if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo || o[k] > hi) return null; continue; }
      let a = (lo - o[k]) / d[k], c = (hi - o[k]) / d[k]; if (a > c) { const q = a; a = c; c = q; }
      if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return null; }
    return o.y + d.y * t0;
  }
  const dentro = (p, b, m) => p.x > b.min.x - m && p.x < b.max.x + m && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z - m && p.z < b.max.z + m;
  // quali case tagliare e a che quota, in questo fotogramma: il personaggio (px, pz, piedi fy), la camera (cam: x, y, z), le case (ognuna
  // con box3: min e max). Ritorna Map(casa -> { y, top, nodisc }). tetto: il personaggio sta su un tetto o sulle sue scale (niente taglio)
  function scegli(px, pz, fy, cam, case_, K, tetto, out) {
    K = K || TAGLIO; out = out || new Map(); out.clear(); if (tetto) return out;
    const P = [[px, fy + .15, pz, false], [px, fy + .95, pz, false], [px, fy + 1.75, pz, false]];
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.push([px + Math.cos(a) * K.anello, fy + .05, pz + Math.sin(a) * K.anello, true]); }
    const R = P.map(([x, y, z, suolo]) => { const dx = cam.x - x, dy = cam.y - y, dz = cam.z - z, l = Math.hypot(dx, dy, dz) || 1; return { o: { x, y, z }, d: { x: dx / l, y: dy / l, z: dz / l }, suolo }; });
    const sdx = cam.x - px, sdz = cam.z - pz, sl2 = sdx * sdx + sdz * sdz || 1, A = K.allarga, E = [];
    for (const B of case_) {
      const b3 = B.box3; if (!b3 || b3.max.y < fy + K.minimo + .4) continue;
      const bx = (b3.min.x + b3.max.x) / 2, bz = (b3.min.z + b3.max.z) / 2, br = Math.hypot(b3.max.x - b3.min.x, b3.max.z - b3.min.z) / 2 + 4;
      const t = Math.max(0, Math.min(1, ((bx - px) * sdx + (bz - pz) * sdz) / sl2)), ex = px + sdx * t - bx, ez = pz + sdz * t - bz; if (ex * ex + ez * ez > br * br) continue;
      if (px > b3.min.x - .3 && px < b3.max.x + .3 && pz > b3.min.z - .3 && pz < b3.max.z + .3 && fy > b3.min.y - 1 && fy < b3.max.y - 1.5) {   // dentro la pianta (portico, sottopasso): sopra la testa, senza poché
        if (b3.max.y > fy + K.dentro + .3) out.set(B, { y: fy + K.dentro, top: b3.max.y, nodisc: true }); continue; }
      const bx3 = { min: { x: b3.min.x - A, y: b3.min.y, z: b3.min.z - A }, max: { x: b3.max.x + A, y: b3.max.y, z: b3.max.z + A } }; E.length = 0;
      for (const q of R) { const inX = dentro(q.o, bx3, 0); if (inX && q.suolo) continue;   // un punto di suolo sotto la gronda di questa casa non conta
        const y = entra(q.o, q.d, inX ? b3 : bx3); if (y !== null) E.push({ y, suolo: q.suolo }); }   // il busto sotto un balcone: conta la casa vera, non quella allargata
      if (!E.length) continue;
      const y = chiesta(E, fy, K); if (b3.max.y <= y + .05) continue;
      out.set(B, { y, top: b3.max.y }); }
    return out;
  }
  const api = { MODI, modo, TAGLIO, passo, quota, chiesta, liscio, entra, scegli };
  if (typeof window !== 'undefined') { window.__TAGLIO = TAGLIO; }
  return api;
})();
if (typeof module !== 'undefined') module.exports = Visuale;
