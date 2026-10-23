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
    resta: .3,            // l'opacità che resta al tetto sbiadito del tutto: si legge ancora la sua forma, mai un buco
    copertina: .82,       // sotto il tetto sbiadito la copertina alla gronda, nel tono del muro scurito a tanto (non il buio della casa)
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
    bordo: .5,            // [visuale5] era .72: in prospettiva il lato vicino alla camera è più stretto; lo scarto della camera (a mano più lo sguardo avanti) resta entro tanto della mezza inquadratura: il personaggio
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
  // lo scarto della camera resta nell'inquadratura: (lx, lz) lo sguardo avanti, yaw la visuale, hu e hv le mezze inquadrature in metri
  // (di lato e in profondità sul suolo). Se lo scarto a mano più lo sguardo esce dal bordo, si tira dentro la sola parte a mano
  function limita(S, lx, lz, yaw, hu, hv, K) {
    K = K || MANO; const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx, B = K.bordo, tx = S.px + lx, tz = S.pz + lz;
    const sr = tx * rx + tz * rz, sf = tx * fx + tz * fz, cr = Math.max(-B * hu, Math.min(B * hu, sr)), cf = Math.max(-B * hv, Math.min(B * hv, sf));
    if (cr !== sr || cf !== sf) { S.px += (cr - sr) * rx + (cf - sf) * fx; S.pz += (cr - sr) * rz + (cf - sf) * fz; }
    return S;
  }
  const api = { MODI, modo, TAGLIO, passo, quota, liscio, entra, CAMERA4, mappa, misura, camPasso, TETTO4, tetti, sbiadito, MURETTO, muretto, MANO, mano, limita };   // [visuale4] [visuale5]
  if (typeof window !== 'undefined') { window.__TAGLIO = TAGLIO; window.__CAMERA4 = CAMERA4; window.__TETTO4 = TETTO4; window.__MURETTO = MURETTO; window.__MANO = MANO; }   // [visuale4] [visuale5]
  return api;
})();
if (typeof module !== 'undefined') module.exports = Visuale;
