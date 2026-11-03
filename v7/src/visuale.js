/* Porto Vecchio — LA VISUALE SUL PERSONAGGIO (le regole, senza grafica: le usa render.js, le prova test_visuale4.js).
   [visuale5] Il committente ha scelto (23 ottobre): restano due modi, scelti all'avvio con ?visuale= (gli strumenti li cambiano dal vivo):
   - 'camera' (il modo di difetto, era il prototipo A di [visuale4]): la camera si adatta. Nei vicoli, sotto archi e portici e nelle corti
     strette sale verso l'alto (la pendenza da 0,78 fino a 1,22 rad), nelle vie e nelle piazze torna quella di sempre; la stretta si misura
     dai dati (la larghezza libera attorno al personaggio, i muri e i tetti sul lato camera, i vicoli della rete, le volte). Solo il tetto
     della casa che copre sbiadisce, intero (mai un buco); se un muro copre ancora, c'è la sagoma.
   - 'muretto' (?visuale=muretto, era il prototipo B, come The Sims): le case fra il personaggio e la camera, entro un raggio sullo schermo,
     scendono tutte insieme a un muretto di un metro con la copertina scura e il filo chiaro. Sul tetto non scende niente.
   Via l'ellisse ([varco2]), il taglio ([visuale3]) e la sezione ([visuale]): bucavano l'immagine. Del taglio resta la macchina che usa il
   muretto: passo() (l'isteresi e lo scivolare del piano), la quota per casa (R.casaVisibile, la tessitura FD1 delle case fuse) e il registro.
   E la camera non è più una forza assoluta: il giocatore la gira e la sposta a mano, e lei torna da sola quando serve (mano(), sotto). */
var Visuale = (function () {
  'use strict';
  const MODI = ['camera', 'muretto'];   // [visuale5] solo i due scelti; 'camera' di difetto
  function modo(search) { const m = /[?&]visuale=([a-z]+)/.exec(search || ''); return m && MODI.includes(m[1]) ? m[1] : 'camera'; }
  // [visuale5] le manopole condivise col muretto (window.__TAGLIO per le prove dal vivo): il passo di difetto di passo(), quanto si allarga
  // la casa per il registro delle cose sulla sua pianta, la copertina
  const TAGLIO = {
    allarga: .7,          // m: la scatola della casa si allarga di tanto per le cose del registro (balconi, gronde e insegne sporgono)
    tieni: .55,           // s: la casa resta giù tanto dopo che ha smesso di servire (l'isteresi; il muretto ha la sua)
    alza: .45,            // s: la quota risale (di almeno `salto`) solo se la quota più alta resta buona per tanto
    salto: .75,           // m
    apri: .22, chiudi: .32, // s: quanto dura lo scivolare del piano in giù e in su
    poche: '#47342a',     // la copertina di riserva (prima del colore del muro): bruno caldo scuro
    filo: '#eadcc2',      // il filo chiaro sul bordo della copertina
    filoLargo: .07,       // m
  };
  // un passo dell'isteresi. S: Map(id -> stato) che dura fra un fotogramma e l'altro; vuole: Map(id -> { y: quota chiesta, top: cima }) di
  // questo fotogramma (le case che servono adesso). Ogni stato: on (giù), y (quota del piano), a (quanto è aperto, 0-1), top,
  // lost (s da quando non serve), up (s da quando potrebbe risalire). Ritorna il numero di case che hanno cambiato on/off.
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
  // la quota del piano che si disegna adesso: scivola dalla cima della casa alla quota del muretto
  const quota = s => s.top + (s.y - s.top) * liscio(s.a);
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
  // ================= [visuale4] A: LA CAMERA CHE SI ADATTA =================
  // le manopole (window.__CAMERA4 per le prove dal vivo)
  const CAMERA4 = {
    base: .78,            // rad: la pendenza a piedi di sempre (render.js la riscrive con quella vera, anche ?pendenza=)
    stretta: .88,         // rad: la pendenza più bassa quando si è nella stretta   // [cat] era .98: col taglio in ogni visuale ([sempre]) la camera non deve più salire tanto per vedere il personaggio; i tetti erano il 40-53% del quadro (ANALISI_STILE.md passo 7)   // [look] era 1.08: il panel (cineasta, animatore) vuole facciate e un asse di fuga, non la pianta
    max: .98,             // rad: la più alta   // [cat] era 1.08 (era 1.22, 70°: dall'alto era una pianta e il personaggio spariva)
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
  // ================= [camera2] LA MOLLA =================
  // Lo smorzamento al punto critico (SmoothDamp, Game Programming Gems 4, 1.10): S = { x, v } dura fra i fotogrammi; va verso `meta` in
  // circa `tempo` secondi, senza oltrepassarla, con la velocità che parte e arriva a zero (niente strappi), uguale a ogni dt (anche 250 ms).
  // vmax (facoltativa): la velocità più alta, in unità al secondo
  function molla(S, meta, tempo, dt, vmax) {
    if (!(dt > 0)) return S.x; if (!isFinite(S.x)) { S.x = meta; S.v = 0; return S.x; } if (!isFinite(S.v)) S.v = 0;
    const om = 2 / Math.max(1e-4, tempo), x = om * dt, ex = 1 / (1 + x + .48 * x * x + .235 * x * x * x), m0 = meta;
    let ch = S.x - meta; if (vmax) { const lim = vmax * tempo; ch = cl4(ch, -lim, lim); } meta = S.x - ch;
    const t = (S.v + om * ch) * dt; S.v = (S.v - om * t) * ex; let o = meta + (ch + t) * ex;
    if ((m0 - S.x > 0) === (o > m0)) { o = m0; S.v = 0; }   // non oltrepassa
    if (vmax) S.v = cl4(S.v, -vmax, vmax);
    return S.x = o;
  }
  // la stessa per un angolo (rad): per la via più corta
  const mollaAng = (S, meta, tempo, dt, vmax) => molla(S, S.x + Math.atan2(Math.sin(meta - S.x), Math.cos(meta - S.x)), tempo, dt, vmax);
  // [camera2] LA CAMERA CALMA (il committente: «la visuale si riallinea e si riaggiusta in continuazione, a scatti, senza focalizzare bene»).
  // Le manopole (window.__CAMERA2 per le prove dal vivo); render.js le usa tutte insieme, ?camvecchia torna a com'era
  const CAMERA2 = {
    // la pendenza che si adatta (sopra CAMERA4): entra e esce con più calma, cambia di rado, la molla al posto dell'esponenziale
    stretta: { tEntra: .5, tEsce: 1.4, resta: 4, banda: .12, zoom: .95, molla: .75 },
    // la regia (sopra Regia.K): sceglie quando la marcia è stabile da tanto, si muove solo se lo scorcio è lontano (zona morta), una mossa
    // decisa e intera (la molla), poi riposa; a piedi solo con la levetta (col puntatore la visuale non gira mai da sola)
    regia: { mano: 4, vel: .8, stabile: 2, svolta: .3, ogni: 1, soglia: .5, resta: 5, molla: .8, vmax: .65 },
    sguardo: .22,         // lo sguardo avanti della levetta: la parte della mezza inquadratura (era .3)
    sguardoBanda: .3,     // rad: la direzione dello sguardo cambia solo oltre tanto (il pollice che trema non sposta la visuale)
    sguardoMolla: .55,    // s: lo sguardo va dove spingi in circa tanto
    sguardoTieni: .6,     // s: lasciata la levetta lo sguardo resta tanto...
    sguardoTorna: 1.1,    // s: ...poi torna al centro in circa tanto
    sguardoVmax: 9,       // m/s: la velocità più alta dello sguardo (l'inversione non è un salto)
    scarto: .45, scartoMezzo: .35,   // s: lo scarto voluto (mira, dialogo, momenti; sui mezzi lo sguardo avanti) con la molla
    momentoEntra: 16, momentoEsce: 21,   // m: chi conta nella scena entra nell'inquadratura sotto tanto ed esce oltre tanto (l'isteresi)
    zoomAuto: .7,         // s: lo zoom che decide il gioco (mira, dialogo, momenti, al chiuso); quello del giocatore resta pronto
    quota: .3,            // s: la quota del punto guardato (scalini, scalinate)
    lenteVel: 1.2,        // s: la velocità che fa respirare la lente, smussata tanto (il passo incerto non la tocca)
    lente: 2.5,           // s: la lente cambia in circa tanto
    lenteAmpia: .5,       // la lente respira la metà di prima attorno al gonfio di sempre
    rollio: 2, rollioAmpio: .65,   // s, e quanto del rollio di prima
    campo: .8, distanza: .6,       // s: il campo e la distanza sui mezzi (non scattano con la velocità)
  };
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
    if (K.molla) {   // [camera2] la molla smorzata al punto critico: parte e arriva senza strappi (l'esponenziale parte di colpo), uguale a ogni dt
      const P = S.mp || (S.mp = { x: S.p, v: 0 }), Z = S.mz || (S.mz = { x: S.z, v: 0 }); P.x = S.p; Z.x = S.z;
      S.p = molla(P, S.on ? S.pT : K.base, K.molla, dt); S.z = molla(Z, S.on ? K.zoom : 1, K.molla, dt); }
    else { S.p += ((S.on ? S.pT : K.base) - S.p) * k; S.z += ((S.on ? K.zoom : 1) - S.z) * k; }
    let g = 0; if (S.on && K.giro > 0 && m && yaw !== undefined) {   // la visuale guarda lungo l'asse del vicolo (in un verso o nell'altro), solo se basta girare poco
      const vista = Math.atan2(-Math.cos(yaw), -Math.sin(yaw)); let d = m.asse - vista; d = Math.atan2(Math.sin(2 * d), Math.cos(2 * d)) / 2; if (Math.abs(d) <= Math.min(K.giro, .44)) g = -d; }
    S.g += (g - S.g) * k;
    return S;
  }
  // ================= [camera4] LA GERARCHIA DELL'INQUADRATURA =================
  // Il committente: «il taglio delle case solo quando è inevitabile; meglio inquadrature dall'alto, o abbastanza vicine da anticipare gli
  // ostacoli, ma senza correzioni continue, innaturali o contro quello che il giocatore vuole». L'ordine:
  //   1. anticipare, non reagire: il bisogno si legge sulla mappa (Visuale.mappa: l'altezza del pieno sul lato camera, le volte), nel punto
  //      dove si è e dove si sarà fra 0,6-1,8 s, in una cache per cella di 1 m e per ottavo di giro della visuale;
  //   2. prima scelta, la pendenza più alta (più dall'alto) quanto basta perché il busto si veda sopra il pieno sul lato camera;
  //   3. se non basta neanche la pendenza più alta: un poco più vicini;
  //   4. il taglio delle case (render.js, vis3Tick) solo se, con la camera dove sta andando, il personaggio resta coperto;
  //   5. lo yaw non si tocca mai; lo zoom e la pendenza del giocatore vincono: per K.mano s dopo il suo ultimo tocco l'automatica cede;
  //   6. al più un cambio ogni K.restaSale s salendo e ogni K.resta s scendendo, con l'isteresi; tutto su Visuale.molla.
  // Sotto le volte (archi, sottopassi, portici) la pendenza non serve: si resta come si è (ci pensano il taglio morbido [ad] e la sagoma).
  const INQUADRA4 = {
    base: .78,            // rad: la pendenza di sempre (render.js la riscrive con quella vera)
    max: 1.1,             // rad (63°): la più alta che la gerarchia chiede prima di avvicinarsi
    passo: .06,           // rad: la pendenza chiesta si arrotonda in su a passi di tanto (niente ritocchi piccoli)
    margine: .06,         // rad sopra il bisogno
    zoom: .86,            // il secondo gradino: un poco più vicini
    avanti: [.6, 1.2, 1.8], // s: dove sarà il personaggio, con la sua marcia (anticipare)
    avantiMax: 7,         // m: non più avanti di tanto
    raggio: 14,           // m: fin dove si cerca il pieno sul lato camera
    lato: .7,             // m: i raggi a destra e a sinistra del busto
    busto: 1.1,           // m sopra i piedi: il punto che deve vedersi
    sale: .2,             // s di bisogno più alto prima di salire
    scende: 3,            // s di bisogno più basso prima di scendere
    banda: .1,            // rad: si scende solo se il bisogno è più basso di tanto (l'isteresi)
    restaSale: 2.5,       // s: dopo un cambio, il prossimo in su non prima di tanto
    resta: 6,             // s: e in giù non prima di tanto
    molla: 1,             // s: la pendenza e lo zoom vanno al bersaglio in circa tanto
    mano: 6,              // s: dopo che il giocatore ha toccato lo zoom o la pendenza l'automatica cede tanto
    cede: .6,             // s: il cedere e il riprendere, con la molla
  };
  // il bisogno nel punto (x, z), coi piedi a fy, per la visuale yaw (la camera sta in (sin yaw, cos yaw)): la pendenza che libera il busto
  // dal pieno sul lato camera (rad) e se si sta sotto una volta. cache: Map (la mappa non cambia)
  function bisogno4(M, x, z, fy, yaw, K, cache) {
    K = K || INQUADRA4; const ox = Math.round(yaw * 8 / Math.PI), key = Math.floor(x) * 65536 + Math.floor(z) + ox * 4294967296;
    if (cache) { const c = cache.get(key); if (c && Math.abs(c.fy - fy) < .5) return c; }
    const y8 = ox * Math.PI / 8, ux = Math.sin(y8), uz = Math.cos(y8), lx = -uz, lz = ux, cx = Math.floor(x) + .5, cz = Math.floor(z) + .5, f = fy + K.busto;
    let p = 0; for (const o of [-K.lato, 0, K.lato]) for (let s = .4; s <= K.raggio; s += .3) { const h = M.alto(cx + ux * s + lx * o, cz + uz * s + lz * o); if (h > f) { const a = Math.atan2(h - f, s); if (a > p) p = a; } }
    const r = { p, volta: !!(M.volta && M.volta(cx, cz, fy)), fy };
    if (cache) { if (cache.size > 30000) cache.clear(); cache.set(key, r); }
    return r;
  }
  // un passo. S dura fra i fotogrammi; q: { M, x, z, fy, gh(x, z) (la quota del suolo), vx, vz (la marcia, m/s), yaw, base, ok (in strada,
  // a piedi), mano (il giocatore ha toccato lo zoom o la pendenza in questo fotogramma), cache }. Ritorna S: p, z (pendenza e zoom di
  // adesso), pT, zT (il gradino scelto), liv (0 di sempre, 1 più dall'alto, 2 più vicini), w (quanto conta l'automatica), cambi, bis
  function inquadra4(S, q, dt, K) {
    K = K || INQUADRA4; const base = q.base !== undefined ? q.base : K.base;
    if (S.pT === undefined) Object.assign(S, { pT: base, zT: 1, liv: 0, tC: 99, tSu: 0, tGiu: 0, tMano: 99, cambi: 0, bis: 0, volta: false, sp: { x: base, v: 0 }, sz: { x: 1, v: 0 }, sw: { x: 1, v: 0 } });
    S.tC += dt; S.tMano += dt; if (q.mano) S.tMano = 0;
    let pD = base, zD = 1, liv = 0, tieni = false;
    if (q.ok) {
      const pts = [[q.x, q.z, q.fy]], v = Math.hypot(q.vx || 0, q.vz || 0);
      if (v > .4) for (const t of K.avanti) { const k = Math.min(t, K.avantiMax / v), x = q.x + q.vx * k, z = q.z + q.vz * k; pts.push([x, z, q.gh ? q.gh(x, z) : q.fy]); }
      let need = 0, volta = false; pts.forEach(([x, z, fy], i) => { const b = bisogno4(q.M, x, z, fy, q.yaw, K, q.cache); if (i === 0) volta = b.volta; else if (b.volta) return; if (b.p > need) need = b.p; });
      S.bis = need; S.volta = volta;
      if (volta) tieni = true;   // sotto la volta la pendenza non serve: si resta come si è
      else { const pn = need + K.margine;
        if (pn <= base) { pD = base; liv = 0; }
        else if (pn <= K.max) { pD = Math.min(K.max, base + Math.ceil((pn - base) / K.passo - 1e-6) * K.passo); liv = 1; }
        else { pD = K.max; zD = K.zoom; liv = 2; } } }
    if (!tieni) {
      const sev = (S.pT - base) + (1 - S.zT) * 2, sevD = (pD - base) + (1 - zD) * 2;
      if (sevD > sev + 1e-4) S.tSu += dt; else S.tSu = 0;
      if (sevD < sev - K.banda || (!q.ok && sevD < sev - 1e-4)) S.tGiu += dt; else S.tGiu = 0;
      const su = S.tSu >= K.sale && S.tC >= K.restaSale, giu = S.tGiu >= (q.ok ? K.scende : 0) && S.tC >= (q.ok ? K.resta : 0);
      if (su || giu) { S.pT = pD; S.zT = zD; S.liv = liv; S.tC = 0; S.tSu = S.tGiu = 0; S.cambi++; } }
    const w = molla(S.sw, S.tMano < K.mano ? 0 : 1, K.cede, dt);   // il giocatore vince
    S.p = molla(S.sp, base + (S.pT - base) * w, K.molla, dt); S.z = molla(S.sz, 1 + (S.zT - 1) * w, K.molla, dt); S.w = w;
    return S;
  }
  // ================= [camera6] I COMANDI DELLA CAMERA (come la terza persona di GTA V, adattata alla nostra visuale alta) =================
  // Il committente: «una levetta fa zoom E rotazione, ma non controlla davvero dove guarda il personaggio; camminata e camera devono essere
  // separate, lo zoom a parte; in bici la camera non si controlla». Le regole, senza grafica (main.js le usa, test_comandi6.js le prova):
  //   la levetta della visuale (destra del controller, quella a schermo, la levetta2 del Game Boy, le frecce) GIRA (x) e INCLINA (y):
  //   niente zoom. Lo zoom sta a parte: pizzico, rotella, croce ▲▼, il tasto delle tre viste (V, R3, «vista» del Game Boy).
  //   In bici la stessa levetta: indietro (y > K.impenna) è l'impennata, e mentre impenni di lato è il piede sulla pedalina; se no di lato
  //   gira la camera. La pendenza in bici non si tocca (la camera da inseguimento ha la sua).
  const COMANDI6 = {
    zona: .12,            // la zona morta della levetta
    esp: 1.8,             // la curva (poco inclinata: piano e preciso)
    giro: 1.9,            // rad/s a fondo corsa
    pend: .9,             // l'inclinazione (ui.tilt) al secondo a fondo corsa
    impenna: .5,          // in bici: indietro oltre tanto si impenna
    piede: .45,           // in bici, impennando: di lato oltre tanto il piede sulla pedalina
    viste: [.25, .5, .85], // le tre viste: vicina, media, alta (ui.zoom; render.js CAM6.K.z)
  };
  const curva6 = (v, K) => { const a = Math.abs(v); if (a <= K.zona) return 0; return Math.sign(v) * Math.pow(Math.min(1, (a - K.zona) / (1 - K.zona)), K.esp); };
  // la levetta della visuale (x, y in -1..1, y in giù positivo). Ritorna { giro (rad/s, + a sinistra come ui.drag), pend (ui.tilt al
  // secondo, + verso l'orizzonte), zoom: 0 (mai), impenna, piede (-1, 0, 1) }
  function levetta6(x, y, bici, K) {
    K = K || COMANDI6; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    if (bici) { const imp = y > K.impenna; return { giro: imp ? 0 : -curva6(x, K) * K.giro, pend: 0, zoom: 0, impenna: imp, piede: imp && Math.abs(x) > K.piede ? (x < 0 ? 1 : -1) : 0 }; }
    return { giro: -curva6(x, K) * K.giro, pend: -curva6(y, K) * K.pend, zoom: 0, impenna: false, piede: 0 };
  }
  // la vista dopo: dalla vista più vicina a quella di adesso, la prossima (in giro)
  function vista6(z, K) { K = K || COMANDI6; const V = K.viste; let i = 0, d = Infinity; V.forEach((v, j) => { const q = Math.abs(Math.log(v / (z || 1))); if (q < d) { d = q; i = j; } }); return V[(i + 1) % V.length]; }
  // la camminata relativa alla camera: B = camBasis() ({fx, fz, rx, rz}: davanti e destra in pianta), (sx, sy) la levetta o i tasti
  // (y in su negativo). Ritorna la direzione nel mondo (x, y del gioco) non normalizzata, o null se ferma
  function relativa6(B, sx, sy) { if (!sx && !sy) return null; return { x: B.rx * sx - B.fx * sy, y: B.rz * sx - B.fz * sy }; }
  // ================= [visuale4] IL TETTO CHE SBIADISCE (A) =================
  const TETTO4 = {
    resta: .3,            // l'opacità che resta al tetto sbiadito del tutto: si legge ancora la sua forma, mai un buco
    copertina: .82,       // sotto il tetto sbiadito la copertina alla gronda, nel tono del muro scurito a tanto (non il buio della casa)
    allarga: .35,         // m: la scatola della casa si allarga di tanto per la prova (gronde, balconi)
    tieni: .6,            // s: la casa resta col tetto sbiadito tanto dopo che ha smesso di coprire (l'isteresi)
    alza: 9, salto: 99,   // (il tetto non ha quota: la parte di passo() che la segue resta ferma)
    apri: .35, chiudi: .55,  // s: quanto dura lo sbiadire e il tornare
  };
  // i raggi del corpo (piedi, busto, testa) verso la camera
  function raggi4(px, pz, fy, cam, corpo) { return (corpo ? [1.1, 1.65] : [.15, .95, 1.75]).map(h => { const x = px, y = fy + h, z = pz, dx = cam.x - x, dy = cam.y - y, dz = cam.z - z, l = Math.hypot(dx, dy, dz) || 1; return { o: { x, y, z }, d: { x: dx / l, y: dy / l, z: dz / l } }; }); }   // [camera6] corpo: solo il busto e la testa (i piedi dietro un muretto non fanno sbiadire un tetto)
  // quali case coprono il personaggio (i raggi del corpo entrano nella loro scatola): solo il loro tetto sbiadisce. Map(casa -> { y, top })
  function tetti(px, pz, fy, cam, case_, K, tetto, out) {
    K = K || TETTO4; out = out || new Map(); out.clear(); if (tetto) return out;
    const R = raggi4(px, pz, fy, cam, K.corpo), A = K.allarga, sdx = cam.x - px, sdz = cam.z - pz, sl2 = sdx * sdx + sdz * sdz || 1;
    for (const B of case_) { const b3 = B.box3; if (!b3 || b3.max.y < fy + .5 || B.flat) continue;   // il tetto piano (terrazzo, parapetto basso) non copre: resta com'è
      const bx = (b3.min.x + b3.max.x) / 2, bz = (b3.min.z + b3.max.z) / 2, br = Math.hypot(b3.max.x - b3.min.x, b3.max.z - b3.min.z) / 2 + 3;
      const t = cl4(((bx - px) * sdx + (bz - pz) * sdz) / sl2, 0, 1), ex = px + sdx * t - bx, ez = pz + sdz * t - bz; if (ex * ex + ez * ez > br * br) continue;
      const bb = { min: { x: b3.min.x - A, y: b3.min.y, z: b3.min.z - A }, max: { x: b3.max.x + A, y: b3.max.y, z: b3.max.z + A } };
      if (R.some(q => entra(q.o, q.d, bb) !== null)) out.set(B, { y: 0, top: 0, nodisc: px > b3.min.x && px < b3.max.x && pz > b3.min.z && pz < b3.max.z }); }   // nodisc: il personaggio sta sotto la casa (androne, sottopasso): niente copertina sopra di lui
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
  // ================= [visuale5] LA CAMERA A MANO E IL RICENTRO =================
  // Il committente: «la camera non è una forza assoluta, il giocatore la deve poter spostare». Con la levetta destra, trascinando col mouse
  // (rotella premuta) o con due dita il giocatore gira la visuale attorno al personaggio e la sposta: la camera va fuori centro. Poi torna:
  //   - spostata da fermo: quando il personaggio parte, la camera si ricentra (piano);
  //   - spostata camminando: resta dov'è finché il personaggio cammina; quando si ferma e riparte, si ricentra;
  //   - contro la visuale: se il personaggio va per più di un secondo in aperto contrasto con quello che la visuale gli mostra davanti
  //     (verso la camera, o a più di 110° dal suo davanti), si ricentra nella direzione nuova; sotto gli 80° il conto si azzera (in mezzo
  //     resta: l'isteresi) e dopo un ricentro così non ne scatta un altro prima di 1,5 s: non oscilla mai;
  //   - il ricentro è uno smorzamento esponenziale (uguale a ogni frequenza di fotogrammi) e non lotta mai col giocatore: appena lui tocca
  //     la camera il ricentro si ferma lì.
  // Centro vuol dire la visuale automatica di sempre: sul computer l'orientamento fisso dell'isola (YAW), sul telefono quella che segue
  // la marcia ([camera3]); la pendenza che si adatta e il tetto che sbiadisce ([visuale4]) lavorano sopra la visuale a mano.
  // Le manopole (window.__MANO per le prove dal vivo)
  const MANO = {
    mosso: .6,            // m/s: sopra questa velocità il personaggio cammina
    fermo: .25,           // m/s: sotto questa sta fermo...
    tFermo: .3,           // s: ...ma solo dopo tanto (un passo incerto, una curva stretta non sono una sosta)
    grazia: .3,           // s: una partenza entro tanto dall'ultimo tocco della camera vale come «spostata camminando» (resta)
    contro: 1.92,         // rad (110°): fra la direzione di marcia e il davanti della visuale, oltre questo si va contro la visuale
    controEsce: 1.4,      // rad (80°): sotto questo il conto si azzera
    tContro: 1,           // s contro la visuale prima di ricentrare
    resta: 1.5,           // s: dopo un ricentro per contromarcia, un altro non scatta prima di tanto
    tau: .22,             // s: lo smorzamento del ricentro (95% in 3τ ≈ 0,66 s)
    giro: 1.2,            // s: dopo la contromarcia la visuale che segue la marcia (telefono) può fare anche il mezzo giro
    bordo: .7,            // lo scarto della camera (a mano più lo sguardo avanti) resta entro tanto della mezza inquadratura: il personaggio
                          // non esce mai dallo schermo
    giraK: 1.7,           // rad/s: la levetta destra e i tasti , . girano di tanto a corsa piena
    spostaK: .9,          // la levetta destra in verticale sposta la visuale di tanto (mezze inquadrature al secondo)
  };
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  // un passo della camera a mano. S dura fra i fotogrammi; q è questo fotogramma:
  //   dyaw (rad), dpx, dpz (m, nel mondo): quanto il giocatore ha girato e spostato adesso; attivo: la sta toccando (anche se ferma);
  //   vel (m/s) e dir (rad, atan2(vz, vx) in pianta): la marcia del personaggio (o del mezzo); avanti (rad): il davanti della visuale in
  //   pianta; segue: la visuale automatica segue la marcia (telefono); forza: si ricentra adesso (si sale su un mezzo, un dialogo, l'intro).
  // S.yaw, S.px, S.pz: la parte a mano, da sommare alla visuale automatica; S.off: fuori centro; S.ric: si sta ricentrando; S.perche:
  // l'ultima ragione ('partenza', 'contro', 'forza'); S.n: quanti ricentri; S.giro: s dall'ultima contromarcia
  function mano(S, q, dt, K) {
    K = K || MANO; if (S.yaw === undefined) Object.assign(S, { yaw: 0, px: 0, pz: 0, off: false, ric: false, mosso: false, sotto: 0, tAtt: 99, tc: 0, tr: 99, giro: 99, perche: '', n: 0 });
    S.tAtt += dt; S.tr += dt; S.giro += dt;
    if (q.attivo) { S.tAtt = 0; S.ric = false;   // il ricentro non lotta mai col giocatore
      if (q.dyaw || q.dpx || q.dpz) { S.yaw += q.dyaw || 0; S.px += q.dpx || 0; S.pz += q.dpz || 0; S.off = true; } }
    const prima = S.mosso, v = q.vel || 0;   // fermo e in marcia, con l'isteresi
    if (v > K.mosso) { S.mosso = true; S.sotto = 0; } else if (v < K.fermo) { S.sotto += dt; if (S.sotto >= K.tFermo) S.mosso = false; } else S.sotto = 0;
    const via = c => { S.perche = c; if (!S.off) return; if (!S.ric) S.n++; S.ric = true; S.yaw = ang(S.yaw); };   // per la via più corta
    if (q.forza) via('forza');
    else if (!prima && S.mosso && !q.attivo && S.tAtt > K.grazia) via('partenza');
    if (S.mosso && !q.attivo && q.dir !== undefined && q.avanti !== undefined) {   // contro la visuale
      const a = Math.abs(ang(q.dir - q.avanti));
      if (a > K.contro) S.tc += dt; else if (a < K.controEsce) S.tc = 0;
      if (S.tc >= K.tContro && S.tr >= K.resta) { S.tc = 0; S.tr = 0; if (S.off || q.segue) { S.giro = 0; via('contro'); } } }
    else S.tc = 0;
    if (S.ric) { const k = 1 - Math.exp(-dt / K.tau); S.yaw -= S.yaw * k; S.px -= S.px * k; S.pz -= S.pz * k;
      if (Math.abs(S.yaw) < 1e-3 && Math.hypot(S.px, S.pz) < .01) { S.yaw = S.px = S.pz = 0; S.ric = false; S.off = false; } }
    return S;
  }
  // lo scarto della camera resta nell'inquadratura: (lx, lz) lo sguardo avanti, yaw la visuale, hu la mezza inquadratura di lato, hv e hvL
  // quanto suolo c'è fra il centro e il bordo basso (verso la camera: lì finisce il personaggio quando la camera va avanti) e il bordo alto
  // (in prospettiva il basso è più corto; hvL di difetto uguale). Se lo scarto a mano più lo sguardo esce, si tira dentro la sola parte a mano
  function limita(S, lx, lz, yaw, hu, hv, K, hvL) {
    K = K || MANO; if (hvL === undefined) hvL = hv; const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx, B = K.bordo, tx = S.px + lx, tz = S.pz + lz;
    const sr = tx * rx + tz * rz, sf = tx * fx + tz * fz, cr = Math.max(-B * hu, Math.min(B * hu, sr)), cf = Math.max(-B * hvL, Math.min(B * hv, sf));
    if (cr !== sr || cf !== sf) { S.px += (cr - sr) * rx + (cf - sf) * fx; S.pz += (cr - sr) * rz + (cf - sf) * fz; }
    return S;
  }
  const api = { MODI, modo, TAGLIO, passo, quota, liscio, entra, CAMERA4, mappa, misura, camPasso, TETTO4, tetti, sbiadito, MURETTO, muretto, MANO, mano, limita, molla, mollaAng, CAMERA2, INQUADRA4, bisogno4, inquadra4, COMANDI6, levetta6, vista6, relativa6 };   // [visuale4] [visuale5] [camera2]
  if (typeof window !== 'undefined') { window.__TAGLIO = TAGLIO; window.__CAMERA4 = CAMERA4; window.__TETTO4 = TETTO4; window.__MURETTO = MURETTO; window.__MANO = MANO; window.__CAMERA2 = CAMERA2; window.__INQUADRA4 = INQUADRA4; window.__COMANDI6 = COMANDI6; }   // [visuale4] [visuale5] [camera2]
  return api;
})();
if (typeof module !== 'undefined') module.exports = Visuale;
