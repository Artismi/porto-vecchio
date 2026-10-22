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
   [visuale4] Il committente non è convinto dal buco (ellisse e taglio lasciano monconi, anelli e sezioni che nessun fotografo terrebbe):
   due prototipi da mettere a confronto sulle stesse inquadrature, entrambi con la sagoma del personaggio attraverso i muri.
   - 'camera' (prototipo A): la camera si adatta. Nei vicoli, sotto archi e portici e nelle corti strette sale verso l'alto (la pendenza
     da 0,78 fino a 1,22 rad), nelle vie e nelle piazze torna quella di sempre; la stretta si misura dai dati (la larghezza libera attorno
     al personaggio, i muri e i tetti sul lato camera, i vicoli della rete, le volte). Solo il tetto della casa che copre sbiadisce, intero
     (mai un buco); se un muro copre ancora, c'è la sagoma.
   - 'muretto' (prototipo B, come The Sims): le case fra il personaggio e la camera, entro un raggio sullo schermo, scendono tutte insieme
     a un muretto di un metro con la copertina scura e il filo chiaro. Sul tetto non scende niente.
   La quota del taglio di ogni casa è la più alta che lascia vedere il personaggio e il suolo attorno a lui: il raggio da ogni punto di
   prova (i piedi, il busto, la testa e un anello di suolo attorno) verso la camera entra nella scatola della casa a una certa quota; il
   piano sta un filo sotto la più bassa. Con la camera a 41° il raggio sale di 0,88 m per metro: il muro sul lato camera di un vicolo di
   2,5 m resta alto un metro o poco più, quanto basta a leggere la pianta della strada. */
var Visuale = (function () {
  'use strict';
  const MODI = ['taglio', 'ellisse', 'sezione', 'camera', 'muretto'];   // [visuale4] i due prototipi
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
  // ================= [visuale4] A: LA CAMERA CHE SI ADATTA =================
  // le manopole (window.__CAMERA4 per le prove dal vivo)
  const CAMERA4 = {
    base: .78,            // rad: la pendenza a piedi di sempre (render.js la riscrive con quella vera, anche ?pendenza=)
    stretta: 1.08,        // rad: la pendenza più bassa quando si è nella stretta
    max: 1.22,            // rad: la più alta (quasi dall'alto: si legge ancora il piede della facciata lontana)
    margine: .08,         // rad sopra la pendenza che libera il busto dal muro sul lato camera
    larga: 5.6,           // m: da questa larghezza libera in su la strada è larga (niente stretta)
    strettaL: 3.2,        // m: da qui in giù è stretta piena (vicolo, corte, sottoportico)
    copre0: .62,          // rad: la pendenza chiesta dal muro sul lato camera; sotto questa il lato camera è aperto
    copre1: .9,           // rad: da qui in su il lato camera chiude
    entra: .6, esce: .32, // le due soglie della stretta (l'isteresi sul valore)
    tEntra: .2,           // s sopra la soglia d'entrata prima di salire
    tEsce: .8,            // s sotto la soglia d'uscita prima di tornare giù (gli sbocchi dei vicoli di lato non la fanno pompare)
    resta: 2.05,          // s: dopo un cambio la stretta non cambia di nuovo prima di tanto (al più un cambio ogni 2 s, a ogni costo)
    tau: .26,             // s: lo smorzamento esponenziale (95% in 3τ ≈ 0,8 s), uguale a ogni frequenza di fotogrammi
    banda: .07,           // rad: nella stretta la pendenza bersaglio si sposta solo oltre questo scarto
    zoom: .9,             // la visuale si stringe un poco nella stretta
    giro: 0,              // rad: quanto può girare la visuale per guardare lungo il vicolo (al più .44, 25°); 0 = spento, non disorienta
    raggio: 12,           // m: fin dove si cercano i muri
    passo: .3,            // m: il passo dei raggi in pianta
  };
  const cl4 = (v, a, b) => Math.max(a, Math.min(b, v));
  // la città in pianta per le misure: l'altezza del pieno in ogni punto (le case fino al colmo, come tetti.js), i vicoli della rete
  // (W.roads da ≤ 3,6 m e i vic_), le volte (archi sopra i vicoli, sottopassi, portici: si passa sotto, coprono sopra i 3-4 m).
  // W è il mondo (world_cittanuova.js): lo stesso dato in Node e nel gioco
  function mappa(W) {
    const TS = W.TS || 2, GW = W.GW, GH = W.GH, T = W.T, B = W.BUILDINGS, EL = W.elev, BI = W.bIndex, grid = W.grid;
    const gronda = b => (b.base || 0) + (b.lighthouse ? 12 : b.kiosk ? 2.8 : b.fl >= 1 ? 3.6 + (b.fl - 1) * 2.4 : 3);   // come Tetti.roofRule
    const colmo = b => gronda(b) + ((b.era === 'E0' || b.era === 'E3') && !b.torre && !b.annesso ? Math.min(b.w, b.h) * TS / 2 * Math.tan(b.era === 'E3' ? .42 : .3) + .2 : .6);
    const H = new Float32Array(GW * GH).fill(-1e9);
    for (let i = 0; i < GW * GH; i++) if (grid[i] === T.BLD) { const bi = BI ? BI[i] : -1; H[i] = bi >= 0 && B[bi] ? colmo(B[bi]) : (EL ? EL[i] : 0) + 6; }
    const alto = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1e9 : H[ty * GW + tx]; };
    const casa = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH || !BI) return -1; return BI[ty * GW + tx]; };
    // le volte, girate come i pezzi (percorsi.js VOLTE)
    const V = []; (W.pezzi || []).forEach(p => { const q = p.q || 0;
      if (p.tipo === 'arco_sottopasso') V.push({ p, x0: -1, x1: 8.4, z0: -6, z1: 6, y0: q + 3.2 });
      if (p.tipo === 'arco_contrasto') V.push({ p, x0: -2, x1: 2, z0: -.6, z1: .6, y0: q + 3.6 });
      if (p.tipo === 'portico') V.push({ p, x0: 0, x1: ((p.opz && p.opz.campate) || 2) * ((p.opz && p.opz.campata) || 4) + .5, z0: -4.2, z1: .2, y0: q + 4.6 }); });
    const volta = (x, z, fy) => V.some(v => { const c = Math.cos(v.p.rot || 0), s = Math.sin(v.p.rot || 0), dx = x - v.p.x, dy = z - v.p.y, l = dx * c - dy * s, m = dx * s + dy * c;
      return l >= v.x0 && l <= v.x1 && m >= v.z0 && m <= v.z1 && v.y0 > fy + 1.8; });
    // i vicoli: i segmenti in celle di 8 m
    const VC = new Map(), cella = (x, z) => Math.floor(x / 8) * 8192 + Math.floor(z / 8);
    (W.roads || []).filter(r => r.pts && r.pts.length > 1 && (r.w <= 3.6 || /^vic_/.test(r.id || ''))).forEach(r => {
      for (let k = 1; k < r.pts.length; k++) { const a = r.pts[k - 1], b = r.pts[k], sg = [a[0], a[1], b[0], b[1], (r.w || 3) / 2 + .8];
        for (let x = Math.min(a[0], b[0]) - 4; x <= Math.max(a[0], b[0]) + 4; x += 8) for (let z = Math.min(a[1], b[1]) - 4; z <= Math.max(a[1], b[1]) + 4; z += 8) { const kk = cella(x, z); const L = VC.get(kk) || VC.set(kk, []).get(kk); if (L[L.length - 1] !== sg) L.push(sg); } } });
    const vicolo = (x, z) => (VC.get(cella(x, z)) || []).some(([ax, az, bx, bz, r]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = cl4(((x - ax) * dx + (z - az) * dz) / l2, 0, 1); return Math.hypot(ax + dx * t - x, az + dz * t - z) <= r; });
    return { alto, casa, volta, vicolo, gronda, colmo, TS, V };
  }
  // la misura della stretta nel punto (x, z) coi piedi a fy; (cdx, cdz): verso la camera in pianta. Ritorna la larghezza libera (la più
  // stretta delle quattro coppie di direzioni opposte), la pendenza che chiede il pieno sul lato camera per liberare il busto, i flag
  // (vicolo, volta), l'asse del vicolo (rad, in pianta) e il punteggio s (0 = largo, 1 = stretto)
  function misura(M, x, z, fy, cdx, cdz, K) {
    K = K || CAMERA4; const st = K.passo, R = K.raggio, D = [];
    for (let k = 0; k < 8; k++) { const ux = Math.cos(k * Math.PI / 4), uz = Math.sin(k * Math.PI / 4); let d = R; for (let s = st; s <= R; s += st) if (M.alto(x + ux * s, z + uz * s) > fy + 2.2) { d = s; break; } D.push(d); }
    let larg = Infinity, asse = 0, lung = -1;
    for (let k = 0; k < 4; k++) { const w = (D[k] + D[k + 4]) * (k % 2 ? Math.SQRT1_2 : 1); if (w < larg) larg = w; if (D[k] + D[k + 4] > lung) { lung = D[k] + D[k + 4]; asse = k * Math.PI / 4; } }
    const cl = Math.hypot(cdx, cdz) || 1, ux = cdx / cl, uz = cdz / cl, lx = -uz, lz = ux; let pNeed = 0;
    for (const off of [-.6, 0, .6]) for (let s = .4; s <= R; s += st) { const h = M.alto(x + ux * s + lx * off, z + uz * s + lz * off); if (h <= fy + 1.1) continue; const p = Math.atan2(h - fy - 1.1, s); if (p > pNeed) pNeed = p; }
    const vic = M.vicolo(x, z), vol = M.volta(x, z, fy);
    const sW = cl4((K.larga - larg) / (K.larga - K.strettaL), 0, 1), sC = cl4((pNeed - K.copre0) / (K.copre1 - K.copre0), 0, 1);
    let s = sW * (.4 + .6 * sC) + (vic && sW > 0 ? .12 : 0); if (vol) s = Math.max(s, .85);   // il vicolo della rete conta solo dove la strada è già stretta (non allo sbocco su una via)
    return { larg, pNeed, vicolo: vic, volta: vol, asse, s: cl4(s, 0, 1) };
  }
  // un passo della camera: S dura fra i fotogrammi ({ on, t, p, pT, z, g, cambi }); m la misura di questo fotogramma (null: niente stretta,
  // sul tetto, al chiuso, alla guida: la pendenza torna quella di sempre). yaw: l'angolo della visuale (per il giro lungo il vicolo)
  function camPasso(S, m, dt, K, yaw) {
    K = K || CAMERA4; if (!S.p) Object.assign(S, { on: false, t: 0, p: K.base, pT: K.base, z: 1, g: 0, cambi: 0, dw: 99 }); S.dw += dt; const pronto = S.dw >= K.resta;
    const bersaglio = () => cl4(Math.max(K.stretta, m.pNeed + K.margine), K.stretta, K.max);
    if (!m) { if (S.on) { S.on = false; S.cambi++; S.dw = 0; } S.t = 0; }   // sul tetto, al chiuso, alla guida: subito
    else if (!S.on) { S.t = m.s >= K.entra ? S.t + dt : 0; if (S.t >= K.tEntra && pronto) { S.on = true; S.t = 0; S.cambi++; S.dw = 0; S.pT = bersaglio(); } }
    else { S.t = m.s <= K.esce ? S.t + dt : 0; if (S.t >= K.tEsce && pronto) { S.on = false; S.t = 0; S.cambi++; S.dw = 0; } else { const b = bersaglio(); if (Math.abs(b - S.pT) > K.banda) S.pT = b; } }
    const k = 1 - Math.exp(-dt / K.tau);
    S.p += ((S.on ? S.pT : K.base) - S.p) * k; S.z += ((S.on ? K.zoom : 1) - S.z) * k;
    let g = 0; if (S.on && K.giro > 0 && m && yaw !== undefined) {   // la visuale guarda lungo l'asse del vicolo (in un verso o nell'altro), solo se basta girare poco
      const vista = Math.atan2(-Math.cos(yaw), -Math.sin(yaw)); let d = m.asse - vista; d = Math.atan2(Math.sin(2 * d), Math.cos(2 * d)) / 2; if (Math.abs(d) <= Math.min(K.giro, .44)) g = -d; }
    S.g += (g - S.g) * k;
    return S;
  }
  // ================= [visuale4] IL TETTO CHE SBIADISCE (A) =================
  const TETTO4 = {
    resta: .16,           // l'opacità che resta al tetto sbiadito del tutto: si legge ancora la sua forma, mai un buco
    allarga: .35,         // m: la scatola della casa si allarga di tanto per la prova (gronde, balconi)
    tieni: .6,            // s: la casa resta col tetto sbiadito tanto dopo che ha smesso di coprire (l'isteresi)
    alza: 9, salto: 99,   // (il tetto non ha quota: la parte di passo() che la segue resta ferma)
    apri: .35, chiudi: .55,  // s: quanto dura lo sbiadire e il tornare
  };
  // i raggi del corpo (piedi, busto, testa) verso la camera
  function raggi4(px, pz, fy, cam) { return [.15, .95, 1.75].map(h => { const x = px, y = fy + h, z = pz, dx = cam.x - x, dy = cam.y - y, dz = cam.z - z, l = Math.hypot(dx, dy, dz) || 1; return { o: { x, y, z }, d: { x: dx / l, y: dy / l, z: dz / l } }; }); }
  // quali case coprono il personaggio (i raggi del corpo entrano nella loro scatola): solo il loro tetto sbiadisce. Map(casa -> { y, top })
  function tetti(px, pz, fy, cam, case_, K, tetto, out) {
    K = K || TETTO4; out = out || new Map(); out.clear(); if (tetto) return out;
    const R = raggi4(px, pz, fy, cam), A = K.allarga, sdx = cam.x - px, sdz = cam.z - pz, sl2 = sdx * sdx + sdz * sdz || 1;
    for (const B of case_) { const b3 = B.box3; if (!b3 || b3.max.y < fy + .5) continue;
      const bx = (b3.min.x + b3.max.x) / 2, bz = (b3.min.z + b3.max.z) / 2, br = Math.hypot(b3.max.x - b3.min.x, b3.max.z - b3.min.z) / 2 + 3;
      const t = cl4(((bx - px) * sdx + (bz - pz) * sdz) / sl2, 0, 1), ex = px + sdx * t - bx, ez = pz + sdz * t - bz; if (ex * ex + ez * ez > br * br) continue;
      const bb = { min: { x: b3.min.x - A, y: b3.min.y, z: b3.min.z - A }, max: { x: b3.max.x + A, y: b3.max.y, z: b3.max.z + A } };
      if (R.some(q => entra(q.o, q.d, bb) !== null)) out.set(B, { y: 0, top: 0 }); }
    return out;
  }
  // quanto è sbiadito il tetto (0-1) dallo stato di passo()
  const sbiadito = s => liscio(s.a);
  // ================= [visuale4] B: IL MURETTO =================
  const MURETTO = {
    alto: 1,              // m sopra la base della casa: il muretto che resta (si legge la pianta della strada, non copre il corpo)
    raggio: 8,            // m: il raggio sullo schermo (in metri alla distanza del personaggio) entro cui le case davanti scendono
    esce: 11,             // m: la casa già scesa risale solo fuori da questo raggio (l'isteresi in spazio)
    davanti: .5,          // m: la casa sta sul lato camera se il suo centro è davanti al personaggio di tanto (verso la camera)
    sopra: .4,            // m: una casa più bassa del muretto più questo non si tocca
    tieni: .8,            // s: la casa resta giù tanto dopo che è uscita (l'isteresi in tempo)
    alza: 9, salto: 99,   // il muretto ha una quota sola: passo() non la sposta
    apri: .5, chiudi: .65,// s: scendere e risalire, animati (tutte insieme: entrano nello stesso fotogramma)
    tono: .52,            // la copertina: il colore del muro scurito a tanto
    filo: '#f2e6cc',      // il filo chiaro sul bordo della copertina
  };
  // le case da abbassare: fra il personaggio e la camera (il centro davanti, verso la camera), dentro il raggio sullo schermo: la
  // scatola proiettata (in pianta di lato, in alto sullo schermo con la sua altezza) tocca il disco attorno al personaggio.
  // S: lo stato di passo() (le case già giù usano il raggio d'uscita). Map(casa -> { y: base + alto, top })
  function muretto(px, pz, fy, cam, pitch, case_, K, tetto, S, out) {
    K = K || MURETTO; out = out || new Map(); out.clear(); if (tetto) return out;
    const dx = cam.x - px, dz = cam.z - pz, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, lx = -uz, lz = ux, sp = Math.sin(pitch), cp = Math.cos(pitch);
    for (const B of case_) { const b3 = B.box3; if (!b3) continue;
      const base = B.geo && B.geo.y0 !== undefined ? B.geo.y0 : b3.min.y, y = base + K.alto; if (b3.max.y < y + K.sopra || b3.max.y < fy + .9) continue;
      const giu = S && S.get(B) && S.get(B).on, R = giu ? K.esce : K.raggio;
      let a0 = Infinity, a1 = -Infinity, l0 = Infinity, l1 = -Infinity;
      for (const cx of [b3.min.x, b3.max.x]) for (const cz of [b3.min.z, b3.max.z]) { const a = (cx - px) * ux + (cz - pz) * uz, q = (cx - px) * lx + (cz - pz) * lz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); l0 = Math.min(l0, q); l1 = Math.max(l1, q); }
      if ((a0 + a1) / 2 < K.davanti) continue;                         // dietro o di fianco: resta
      if (l0 > R || l1 < -R) continue;                                  // fuori di lato
      const v0 = -a1 * sp + (b3.min.y - fy) * cp, v1 = -Math.max(0, a0) * sp + (b3.max.y - fy) * cp;   // sullo schermo, in verticale (in su = lontano)
      if (v1 < -R || v0 > R) continue;
      out.set(B, { y, top: b3.max.y }); }
    return out;
  }
  const api = { MODI, modo, TAGLIO, passo, quota, chiesta, liscio, entra, scegli, CAMERA4, mappa, misura, camPasso, TETTO4, tetti, sbiadito, MURETTO, muretto };   // [visuale4]
  if (typeof window !== 'undefined') { window.__TAGLIO = TAGLIO; window.__CAMERA4 = CAMERA4; window.__TETTO4 = TETTO4; window.__MURETTO = MURETTO; }   // [visuale4]
  return api;
})();
if (typeof module !== 'undefined') module.exports = Visuale;
