/* Porto Vecchio — [cinema] LA REGIA DEL GIOCO: PLACIDO QUANDO È PACE, UN FILM D'AZIONE QUANDO SI SCALDA (v7/DA_FUORI.md).
   Il committente, guardando la 1.6.1 «da fuori»: «più scenografico, più dinamico; adesso è rallentato e poco comprensibile», «cinematografico,
   dinamico come un film d'azione quando le cose si scaldano, veloce; quando si vuole la pace, placido», «fluido sul telefono, senza scatti»,
   «evitare che il personaggio si incastri». Questo modulo tiene insieme le parti che prima erano sparse o mancavano:
   - IL TEMPO (main.js loop0): sotto i 20 fotogrammi al secondo il mondo andava più piano del tempo vero (un passo solo, al più 50 ms: a 8 fps
     il gioco correva al 40%). Ora il fotogramma lungo si divide in passi da al più 50 ms (fino a Cinema.K.passiMax): il mondo va col tempo
     vero fino a ~7 fps, sotto rallenta ma molto meno. Se il motore costa troppo (Cinema.K.passoCaro ms) si fa un passo in meno.
   - LA TENSIONE (tick): un numero solo, da 0 (passeggiata) a 1 (sparatoria, inseguimento), letto dallo stato del gioco a ogni fotogramma:
     polizia che insegue, gente che ti combatte vicino, colpi sparati o presi, la salute che scende, la velocità del mezzo, la corsa. Sale
     svelta (K.sale s), resta un poco (K.tiene s) e scende piano (K.scende s): la pace torna da sola, senza scatti.
   - LA CAMERA A PIEDI (k7): i numeri di camera7 (camera7.js K) mescolati fra due «mani»: CALMA (il braccio un poco più lungo e basso, il
     ricentro lento, la lente più stretta: si guarda il paese) e AZIONE (il braccio corto, la camera più bassa che vede l'orizzonte e chi
     arriva, la lente larga, il ricentro svelto, lo sguardo avanti lungo). Il raggio contro i muri resta quello di camera7: niente case tagliate.
   - IL CORPO DELLA CAMERA (dopo): il trauma (colpi, urti, esplosioni, ferite) scuote la camera in rotazione, non in traslazione (la scossa di
     prima, 4 mm per la pistola, non si vedeva); la lente che pompa a ogni colpo; il rollio negli urti forti; LE TRANSIZIONI: salire e scendere
     da un mezzo, entrare in una vista nuova, prima erano un taglio o un salto a 54° per un fotogramma: ora la camera passa dalla posa di prima
     alla nuova in K.passaggio s (posizione, rotazione e lente, con una curva morbida).
   - LA CORNICE (pilastri): guidando lo schermo diventava 4:3 con due bande nere: sul telefono in orizzontale (2,16:1) il 38% dello schermo
     nero proprio quando serve vedere la strada. Ora niente bande (?nocinema_cornice com'era).
   Interruttori: ?nocinema spegne tutto; uno alla volta ?nocinema_tempo, _camera, _scossa, _passaggi, _cornice, _colpi, _passo, _scivola, _giri, _momenti, _schermo
   (in Node le variabili NOCINEMA, NOCINEMA_TEMPO, …). Dal vivo: window.__cinema (lo stato), Cinema.K (i numeri). */
var Cinema = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ENV = typeof process !== 'undefined' && process.env ? process.env : {};
  const TUTTO = !/[?&]nocinema\b/.test(Q) && !ENV.NOCINEMA;
  const on = n => TUTTO && !new RegExp('[?&]nocinema_' + n + '\\b').test(Q) && !ENV['NOCINEMA_' + n.toUpperCase()];
  const F = { tempo: on('tempo'), camera: on('camera'), scossa: on('scossa'), passaggi: on('passaggi'), cornice: on('cornice'), colpi: on('colpi'), passo: on('passo'), scivola: on('scivola'), giri: on('giri'), momenti: on('momenti'), schermo: on('schermo') };
  const D = Math.PI / 180;
  const K = {
    // il tempo
    passo: .05,          // s: il passo più lungo del motore (come prima)
    passiMax: 3,         // passi al più per fotogramma (0,15 s di gioco: pari al tempo vero fino a ~7 fps)
    passoCaro: 14,       // ms: se l'ultimo passo del motore è costato più di tanto, un passo in meno (il telefono non si siede)
    // la tensione
    sale: .35, tiene: 2.5, scende: 3.5,   // s: le molle della tensione
    // la camera a piedi: CALMA → AZIONE (camera7.js K: arm, pitch, vfov, ahead, recent*, yawT)
    calma: { arm: 10.6, pitch: 31 * D, vfov: 44, recentAfter: 2.4, recentMax: 70 * D, yawT: .16, ahead: 1.5 },
    azione: { arm: 7.6, pitch: 24 * D, vfov: 55, recentAfter: .9, recentMax: 160 * D, yawT: .08, ahead: 2.6 },
    // IL MURO: con la bomboletta (o il pennarello) in mano la camera scende e guarda la parete davanti (la cornice gialla al centro dello
    // schermo cade sul muro, non sul selciato); il ricentro svelto: girandoti verso un altro muro la camera ti viene dietro
    muro: { arm: 6.2, pitch: 13 * D, vfov: 50, recentAfter: .5, recentMax: 150 * D, yawT: .1, ahead: 1.2 }, muroT: .5,
    // LO SCHERMO IN VERTICALE (il Game Boy dell'APK: ~0,6 di larghezza per altezza). camera7 tiene almeno 62° di orizzontale: in verticale
    // la lente arrivava al tetto di 80° (la strada stirata ai bordi, il personaggio piccolo, metà schermo di selciato sotto). Qui
    // l'orizzontale minimo scende a 50°, il tetto a 72°, e la camera si abbassa di 7°: la deformazione cala e in alto entrano i tetti, il
    // mare, l'orizzonte (la prima prova, col braccio più lungo e la stessa pendenza, perdeva proprio il paese sullo sfondo)
    verticale: { hfovMin: 50, vfovMax: 72, arm: 1, pitch: -7 * D },
    // il corpo della camera
    scossaMax: [2.6 * D, 2.0 * D, 3.2 * D],   // yaw, pitch, rollio a trauma pieno (la scossa è trauma²)
    scossaHz: 11,        // la frequenza della scossa
    traumaGiu: 1.25,     // trauma perso al secondo (tempo vero)
    pompaGiu: 9,         // 1/s: la lente torna
    passaggio: .75,      // s: salire, scendere, cambiare vista
    mezzoSu: 3.5,
    fuocoMax: 3, fuocoT: .6,   // m, s: il nemico nel quadro        // 1/s: la vista da inseguimento arriva (render.js cam.drive; prima 1,6: ~2 s col salto a 54° all'inizio)
  };
  const S = { v: 0, meta: 0, tenuto: 0, trauma: 0, pompa: 0, rollio: 0, ultimoShake: 0, kickT: null, hitT: null, hp: null, modo: null, prev: null, blend: null, costoPasso: 0, tempo: 0, motivo: '' };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const liscia = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // ---- IL TEMPO: quanti passi e di quanto, per un fotogramma lungo dtv secondi (main.js loop0) ----
  function passi(dtv) {
    if (!F.tempo || !(dtv > K.passo)) return { n: 1, dt: Math.min(K.passo, Math.max(0, dtv || 0)) };
    let n = Math.min(K.passiMax, Math.ceil(dtv / K.passo - 1e-6));
    if (S.costoPasso > K.passoCaro && n > 1) n--;   // il motore è caro: un passo in meno (meglio rallentare un poco che scendere ancora di fotogrammi)
    const tot = Math.min(dtv, n * K.passo);
    return { n, dt: tot / n };
  }
  function costo(ms) { S.costoPasso += (ms - S.costoPasso) * .2; }

  // ---- LA TENSIONE (e il trauma dagli eventi), a ogni fotogramma col tempo vero ----
  function tick(st, dt, G) {
    if (!st || !st.player) return S.v;
    S.tempo += dt; const p = st.player; let m = 0, why = 'calma';
    const su = (x, w) => { if (x > m) { m = x; why = w; } };
    if (st.chase) su(.85, 'inseguimento');
    if (S.tempo - (S.wlT === undefined ? -9 : S.wlT) > .5) { S.wlT = S.tempo; try { S.wl = G && G.wantedLevel ? G.wantedLevel(st) : 0; } catch (e) { S.wl = 0; } }   // ricercato: ogni mezzo secondo (wantedLevel rifà le opinioni di ogni poliziotto)
    if (S.wl > 0) su(.35 + .15 * S.wl, 'ricercato');
    let nemici = 0, nx = 0, ny = 0, nd = 1e9; const px = p.x, py = p.y;
    for (const n of st.npcs || []) { if (n.dead || n.inside) continue; const a = n.action && n.action.name; if (a !== 'combatte' && a !== 'insegue') continue; const dx = n.x - px, dy = n.y - py, d2 = dx * dx + dy * dy; if (d2 < 625) { nemici++; if (d2 < nd) { nd = d2; nx = dx; ny = dy; } } }
    // IL NEMICO NEL QUADRO: il punto guardato si sposta verso chi ti minaccia più vicino (un quarto della distanza, al più K.fuocoMax m),
    // con la tensione; a piedi e senza mirare (mirando decide la spalla). La molla K.fuocoT
    { const w = nemici && !p.vehicle ? liscia(S.v) : 0, d = Math.sqrt(nd), f = w && d > 1 ? Math.min(K.fuocoMax, d * .25) / d * w : 0, a = 1 - Math.exp(-dt * 3 / K.fuocoT);
      S.fx = (S.fx || 0) + (nx * f - (S.fx || 0)) * a; S.fy = (S.fy || 0) + (ny * f - (S.fy || 0)) * a; }
    if (nemici) su(Math.min(1, .62 + .12 * nemici), 'scontro');
    // i colpi sparati (st.kick) e quelli andati a segno (st.hitMark): eventi nuovi → trauma, lente, tensione
    const kick = st.kick;
    if (kick && kick.t !== S.kickT) { S.kickT = kick.t; const a = kick.amt || .1; if (F.scossa) { S.trauma = Math.min(1, S.trauma + .18 + a * .9); S.pompa += 1.2 + a * 9; } }
    if (kick && st.clock - kick.t < 3) su(.72, 'spari');
    const hm = st.hitMark;
    if (hm && hm.t !== S.hitT) { S.hitT = hm.t; if (F.scossa) { S.trauma = Math.min(1, S.trauma + (hm.kill ? .38 : .16)); S.pompa -= hm.kill ? 3 : 1.2; } }
    if (hm && st.clock - hm.t < 3) su(.7, 'colpi');
    // la salute che scende: ferite
    const hp = p.hp; if (S.hp !== null && hp < S.hp - .5) { const d = S.hp - hp; if (F.scossa) { S.trauma = Math.min(1, S.trauma + Math.min(.55, .12 + d / 35)); S.pompa -= Math.min(4, 1 + d / 10); S.rollio += (Math.random() < .5 ? -1 : 1) * Math.min(4, 1 + d / 12) * D; } S.ferito = S.tempo; }
    S.hp = hp; if (S.ferito !== undefined && S.tempo - S.ferito < 4) su(.8, 'ferito');
    // gli urti e le esplosioni: st.shake che sale
    const sh = st.shake || 0; if (sh > S.ultimoShake + .02 && F.scossa) { const d = sh - S.ultimoShake; S.trauma = Math.min(1, S.trauma + d * .9); if (d > .3) S.rollio += (Math.random() < .5 ? -1 : 1) * d * 5 * D; } S.ultimoShake = sh;
    // la velocità: il mezzo lanciato, la corsa
    const v = p.vehicle; if (v) { const sp = Math.abs(v.speed || 0); su(clamp((sp - 11) / 20, 0, .6), 'velocità'); }
    else { const sp = Math.hypot(p.vx || 0, p.vy || 0); if (sp > 5.5) su(.18, 'corsa'); }
    // la molla: sale svelta, tiene, scende piano
    if (m >= S.meta) { S.meta = m; S.tenuto = 0; } else { S.tenuto += dt; if (S.tenuto > K.tiene) S.meta = m; }
    const T = S.meta > S.v ? K.sale : K.scende; S.v += (S.meta - S.v) * (1 - Math.exp(-dt * 3 / T)); S.motivo = why;
    S.trauma = Math.max(0, S.trauma - K.traumaGiu * dt); S.pompa *= Math.exp(-K.pompaGiu * dt); S.rollio *= Math.exp(-3.5 * dt);
    return S.v;
  }

  // ---- LA CAMERA A PIEDI: i numeri di camera7 per questa tensione (un oggetto solo, riusato) ----
  const K7 = { base: null, k: null };
  function k7(base, K8, p, aspect) {
    if (!F.camera || !base) return base;
    const spray = !!(p && !p.vehicle && (p.hand === 'bomboletta' || p.hand === 'pennarello')), now = S.tempo;
    S.muro = S.muro === undefined ? 0 : S.muro; const dm = Math.min(.25, Math.max(0, now - (S.muroT0 || now))); S.muroT0 = now; S.muro += ((spray ? 1 : 0) - S.muro) * (1 - Math.exp(-dm * 3 / K.muroT));
    if (K8) { if (K8.__ahead0 === undefined) K8.__ahead0 = K8.ahead; K8.ahead = lerp(K8.__ahead0, K.azione.ahead, liscia(S.v)); }   // [controlli8] lo sguardo avanti di camera7 sta in K8
    if (K7.base !== base) { K7.base = base; K7.k = Object.assign({}, base); }
    const k = K7.k, t = liscia(S.v), C = K.calma, A = K.azione;
    for (const n in C) k[n] = lerp(C[n], A[n], t);
    const m = liscia(S.muro); if (m > .001) for (const n in K.muro) k[n] = lerp(k[n], K.muro[n], m);   // [cinema] la parete per dipingere
    if (aspect > 0 && aspect < 1) { const v = liscia((1 - aspect) / .4), Vt = K.verticale; k.hfovMin = lerp(base.hfovMin, Vt.hfovMin, v); k.vfovMax = lerp(base.vfovMax, Vt.vfovMax, v); k.arm *= lerp(1, Vt.arm, v); k.pitch += Vt.pitch * v * (1 - m); }   // [cinema] lo schermo in verticale
    else { k.hfovMin = base.hfovMin; k.vfovMax = base.vfovMax; }
    // la camera bassa (camera9) ha già i suoi numeri bassi: lì la tensione accorcia e allarga soltanto
    if (base.compY !== undefined) { k.pitch = lerp(base.pitch, base.pitch - 4 * D, t); k.arm = lerp(base.arm, base.arm * .82, t); k.vfov = lerp(base.vfov, base.vfov + 6, t); }
    return k;
  }

  // ---- IL CORPO DELLA CAMERA, a camera finita (render.js, dopo i due rami): passaggi, lente, scossa, rollio ----
  let V = null;
  function dopo(camera, c) {
    if (!camera || !TUTTO || typeof THREE === 'undefined') return;
    if (!V) V = { p: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ') };
    const dt = c.dt > 0 ? Math.min(.25, c.dt) : 0;
    // 1. i passaggi: il modo cambia (a piedi, mezzo, dentro, sotto) senza un salto voluto (porte, teletrasporti: c.scatta)
    const modo = c.modo;
    if (F.passaggi) {
      if (S.modo !== null && modo !== S.modo && S.prev && !c.scatta && !c.intro) S.blend = { p: S.prev.p.clone(), q: S.prev.q.clone(), fov: S.prev.fov, t: 0, dur: K.passaggio };
      if (c.scatta || c.intro) S.blend = null;
      if (S.blend) { const B = S.blend; B.t += dt; const s = liscia(B.t / B.dur);
        if (s >= 1) S.blend = null; else { camera.position.lerpVectors(B.p, camera.position, s); V.q.copy(B.q).slerp(camera.quaternion, s); camera.quaternion.copy(V.q); camera.fov = lerp(B.fov, camera.fov, s); } }
    }
    S.modo = modo;
    // 2. la lente che pompa (colpi sparati: si apre; colpi presi: si stringe) e il rollio degli urti
    if (F.scossa && !c.intro) {
      camera.fov = clamp(camera.fov + clamp(S.pompa, -6, 6), 10, 100);
      const tr = S.trauma * S.trauma, t = S.tempo * K.scossaHz, M = K.scossaMax;
      const n1 = Math.sin(t * 1.0) * .55 + Math.sin(t * 2.31 + 1.7) * .3 + Math.sin(t * 4.17 + .3) * .15,
        n2 = Math.sin(t * 1.13 + 2.2) * .55 + Math.sin(t * 2.71 + .4) * .3 + Math.sin(t * 3.93 + 2.9) * .15,
        n3 = Math.sin(t * .87 + 4.1) * .6 + Math.sin(t * 2.07 + 3.3) * .4;
      const ry = n1 * M[0] * tr, rx = n2 * M[1] * tr, rz = n3 * M[2] * tr + S.rollio;
      if (Math.abs(ry) + Math.abs(rx) + Math.abs(rz) > 1e-5) { camera.rotateY(ry); camera.rotateX(rx); camera.rotateZ(rz); }
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // la posa finale di questo fotogramma: il punto di partenza del prossimo passaggio
    if (!S.prev) S.prev = { p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 46 };
    S.prev.p.copy(camera.position); S.prev.q.copy(camera.quaternion); S.prev.fov = camera.fov;
  }
  // la cornice 4:3 guidando (render.js U.pillar): niente bande
  // [cinema] I GIRI SALTATI: col tetto a 30 su uno schermo a 60 un giro su due non si disegna, ma i cicli dei moduli (graffiti2, tetti,
  // sottosuolo, unico_*) lavoravano lo stesso: il doppio del lavoro per fotogramma. Chi anima col tempo vero salta quei giri (PesoRitmo)
  const saltato = ts => F.giri && typeof PesoRitmo !== 'undefined' && !!PesoRitmo.giroSaltato && PesoRitmo.giroSaltato(ts);
  const fuoco = () => F.camera ? { x: S.fx || 0, y: S.fy || 0 } : { x: 0, y: 0 };
  const pilastri = ease => F.cornice ? 0 : ease;
  const stato = () => ({ tensione: +S.v.toFixed(2), meta: +S.meta.toFixed(2), motivo: S.motivo, trauma: +S.trauma.toFixed(2), pompa: +S.pompa.toFixed(2), modo: S.modo, passaggio: !!S.blend, costoPasso: +S.costoPasso.toFixed(1) });
  // [cinema] LO SCHERMO LIBERO AL CENTRO: la scheda dei comandi di guida (#card2, main.js) stava al 22% dall'alto, sopra il mezzo appena preso;
  // ora in basso, più piccola, e nel Game Boy solo la riga della levetta (A e B sono già scritti sulla pulsantiera). ?nocinema_schermo com'era
  if (F.schermo && typeof document !== 'undefined' && document.head) { const css = document.createElement('style'); css.id = 'cinema-schermo';
    css.textContent = '#card2{top:auto!important;bottom:14px;font-size:12px;padding:6px 10px;opacity:.92}#card2 b{display:none}#app.console #card2 span:not(:first-of-type){display:none}';
    document.head.appendChild(css); }
  const api = { F, K, S, passi, costo, tick, k7, dopo, pilastri, saltato, fuoco, stato, tutto: TUTTO };
  if (typeof window !== 'undefined') Object.defineProperty(window, '__cinema', { get: stato, configurable: true });
  return api;
})();
if (typeof module !== 'undefined') module.exports = Cinema;
