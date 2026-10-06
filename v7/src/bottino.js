/* Porto Vecchio — Il bottino in scena.
   Quello che si fruga non è più un pulsante: è un oggetto vero, appoggiato per terra, che si clicca.
   Cestino, scatolina di cartone nel vicolo, mucchio di rottami, fascina nel bosco, cassa portata dal mare, sacco nell'erba,
   cassetta militare, casse di carico al porto. Dentro casa si clicca il mobile, per strada il corpo o il bagagliaio (dietro l'auto).
   Clic: il protagonista ci va. Arrivato, la roba sparsa la raccoglie tutta; il resto (mobili, casse chiuse, tasche, bagagliai) apre il pannello Frugare.
   Legge e scrive solo attraverso Oggetti; la grafica sta in un gruppo suo nella scena. */
var Bottino = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  const U = { list: [], at: 0, scene: null, grp: null, meshes: {}, stRef: null, hot: null, hotT: 0, mats: {} };
  const R_ = { k: 1.4, p: 1.6, g: 1.8, c: 1.5, v: 1.3, f: 1.9 };   // a che distanza si arriva, per tipo di riferimento

  // ---------------- I MODELLI ----------------
  const T = () => window.THREE;
  // [oggetti] materiali disegnati (una texture per tipo, condivisa): venature, cartone ondulato, ruggine, juta, stampini
  function mat(c, tex) { const k = c + (tex || ''); if (!U.mats[k]) U.mats[k] = new (T().MeshLambertMaterial)(tex ? { color: c, map: TX(tex) } : { color: c }); return U.mats[k]; }
  const TXC = {};
  function TX(name) {
    if (TXC[name]) return TXC[name];
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); let h = 7;
    const r = () => { h = (h * 16807) % 2147483647; return h / 2147483647; };
    const px = (col, X, Y, w, hh) => { x.fillStyle = col; x.fillRect(X, Y, w, hh); };
    if (name === 'legno') {   // assi chiare con venature, nodi, chiodi a capo, fughe scure
      px('#c8a070', 0, 0, 64, 64);
      for (let y = 0; y < 64; y++) for (let k = 0; k < 3; k++) if (r() < .5) px(r() < .5 ? '#a8804e' : '#d8b484', Math.floor(r() * 64), y, 4 + Math.floor(r() * 12), 1);
      [0, 21, 42, 63].forEach(y => px('#5a3e22', 0, y, 64, 2)); for (let k = 0; k < 3; k++) { const X = 6 + r() * 50, Y = 4 + Math.floor(r() * 3) * 21 + r() * 12; px('#7a5430', X, Y, 3, 2); }
      for (const y of [5, 26, 47]) for (const X of [4, 58]) px('#4a4a4e', X, y, 2, 2);
    } else if (name === 'cartone') {   // kraft ondulato, nastro adesivo, una scritta stampata
      px('#b8915a', 0, 0, 64, 64); for (let X = 0; X < 64; X += 3) px('#a8824e', X, 0, 1, 64);
      px('#d8c9a0', 26, 0, 12, 64); px('#c8b88c', 26, 0, 1, 64); px('#8a5a2a', 6, 40, 16, 3); px('#8a5a2a', 6, 45, 12, 2); px('#8a5a2a', 44, 12, 12, 8);
      x.fillStyle = '#6a4220'; x.font = 'bold 7px sans-serif'; x.fillText('ADRIA', 4, 56); x.fillText('↑↑', 46, 34);
    } else if (name === 'ruggine') {   // lamiera verniciata che si scrosta
      px('#5e6266', 0, 0, 64, 64); for (let k = 0; k < 60; k++) px(['#7a4226', '#8a4b2a', '#5a301a', '#6a6e72'][Math.floor(r() * 4)], Math.floor(r() * 64), Math.floor(r() * 64), 2 + Math.floor(r() * 6), 2 + Math.floor(r() * 4));
      for (let k = 0; k < 6; k++) px('#7a3e1e', Math.floor(r() * 60), Math.floor(r() * 30), 2, 14 + Math.floor(r() * 20));
    } else if (name === 'juta') {   // trama della juta
      px('#b39b6a', 0, 0, 64, 64); for (let y = 0; y < 64; y += 2) for (let X = (y / 2) % 2; X < 64; X += 2) px('#9a8256', X, y, 1, 1); for (let k = 0; k < 30; k++) px('#c8b47e', Math.floor(r() * 64), Math.floor(r() * 64), 3, 1);
      x.fillStyle = '#5a3a1a'; x.font = 'bold 9px serif'; x.fillText('GRANO', 14, 38);
    } else if (name === 'militare') {   // verde oliva, stampino giallo, graffi
      px('#4b5433', 0, 0, 64, 64); for (let k = 0; k < 40; k++) px('#5c6640', Math.floor(r() * 64), Math.floor(r() * 64), 1 + Math.floor(r() * 6), 1);
      x.fillStyle = '#d8c060'; x.font = 'bold 9px monospace'; x.fillText('7.62', 6, 26); x.font = '7px monospace'; x.fillText('440 CART', 6, 40); px('#d8b830', 4, 46, 30, 3);
    } else if (name === 'cassone') {   // cassa da carico: assi scure, stampini, FRAGILE
      px('#7a5a34', 0, 0, 64, 64); for (let y = 0; y < 64; y++) if (r() < .6) px('#6a4c2a', Math.floor(r() * 64), y, 6 + Math.floor(r() * 14), 1);
      [0, 16, 32, 48].forEach(y => px('#3e2a16', 0, y, 64, 1)); x.fillStyle = '#e0dccc'; x.font = 'bold 8px monospace'; x.fillText('FRAGILE', 6, 28); x.font = '6px monospace'; x.fillText('MARSIGLIA', 8, 42);
      x.strokeStyle = '#e0dccc'; x.strokeRect(4, 19, 52, 12);
    } else if (name === 'gomma') {   // battistrada
      px('#232326', 0, 0, 64, 64); for (let X = 0; X < 64; X += 6) { px('#151517', X, 0, 3, 64); px('#2e2e32', X + 3, 0, 1, 64); }
    }
    const t = new (T().CanvasTexture)(c); t.magFilter = T().NearestFilter; t.wrapS = t.wrapT = T().RepeatWrapping; return (TXC[name] = t);
  }
  function add(g, geo, c, x, y, z, rx, ry, rz, tex) { const m = new (T().Mesh)(geo, mat(c, tex)); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
  const B = (w, h, d) => new (T().BoxGeometry)(w, h, d);
  const C = (r0, r1, h, n) => new (T().CylinderGeometry)(r0, r1, h, n || 10);
  // cassa di legno vera: quattro montanti agli spigoli, le facce di assi (texture), coperchio con due traverse
  function crate(g, s, x, z, ry, col, y0) {
    const y = (y0 || 0) + s / 2, q = new (T().Group)(); q.position.set(x, y, z); q.rotation.y = ry || 0; g.add(q);
    add(q, B(s * .96, s * .96, s * .96), col || '#ffffff', 0, 0, 0, 0, 0, 0, 'legno');
    for (const a of [-1, 1]) for (const b of [-1, 1]) add(q, B(s * .09, s, s * .09), '#6b4e2c', a * s * .46, 0, b * s * .46);
    for (const a of [-1, 1]) add(q, B(s, s * .07, s * .09), '#7a5a34', 0, s * .47, a * s * .3);
    add(q, B(s * .09, s * .07, s), '#6b4e2c', 0, s * .47, 0, 0, .0);
    return q;
  }
  // copertone: toro schiacciato col battistrada, il cerchione dentro
  function tire(g, x, y, z, rx, ry, R) { const R0 = R || .3, t = add(g, new (T().TorusGeometry)(R0, R0 * .36, 8, 18), '#ffffff', x, y, z, rx, ry, 0, 'gomma'); t.scale.z = 1.5; add(g, C(R0 * .62, R0 * .62, R0 * .45, 14), '#7d8288', x, y, z, (rx || 0) + Math.PI / 2, ry || 0); return t; }
  // [modelli] un modello scaricato (scaricati.js), o null se non c'è: allora resta quello fatto a mano
  function dl(g, id, x, y, z, ry, s) { if (typeof Scaricati === 'undefined') return null; return Scaricati.put(g, id, x, y, z, ry, s); }
  const MODEL = {
    // scatola di cartone coi lembi aperti, nastro, scritta; dentro spuntano bottiglie e giornali
    vicolo(g) {
      add(g, B(.55, .38, .44), '#ffffff', 0, .19, 0, 0, 0, 0, 'cartone');
      add(g, B(.53, .02, .42), '#5a4024', 0, .3, 0);
      add(g, B(.55, .015, .22), '#c8a070', 0, .44, .3, -1.15, 0, 0, 'cartone'); add(g, B(.55, .015, .22), '#c8a070', 0, .46, -.3, 1.25, 0, 0, 'cartone');
      add(g, B(.2, .015, .42), '#c8a070', .34, .43, 0, 0, 0, .9, 'cartone');
      add(g, C(.035, .035, .26, 8), '#2e5a2a', -.12, .44, .06, .2, 0, .15); add(g, C(.014, .03, .07, 8), '#2e5a2a', -.1, .59, .09, .2, 0, .15);
      add(g, B(.22, .03, .3), '#e8e2cf', .1, .37, -.04, 0, .3, .08);
    },
    // [modelli] cestino comunale anni '80: bidone tornito a doghe con l'orlo arrotolato, appeso al palo con due fascette, piede del palo, sacco e giornale che spuntano
    cestino(g) {
      const Mo = window.Modella; if (!Mo) return;
      Mo.tornito(g, [[0, 0], [.03, 0], [.03, 1.0], [.026, 1.02], [0, 1.02]], '#3a4038', { metalness: .3, roughness: .5 }, -.27, 0, 0, 10); Mo.tornito(g, [[0, 0], [.07, 0], [.06, .03], [0, .03]], '#2c3029', { metalness: .3 }, -.27, 0, 0, 12);
      for (const y of [.32, .64]) Mo.tuboPiegato(g, [[-.27, y, -.04], [-.22, y, -.06], [-.22, y, .06], [-.27, y, .04]], .008, '#2c3029', { metalness: .3 }, .02);
      Mo.tornito(g, [[0, .12], [.19, .12], [.215, .16], [.23, .72], [0, .72]], '#3e5a3c', { roughness: .55 }, 0, 0, 0, 20);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; Mo.guscio(g, .028, .56, .012, '#2c4029', { roughness: .55 }, .004, .003, Math.cos(a) * .222, .15, Math.sin(a) * .222).rotation.y = -a + Math.PI / 2; }
      const orlo = new (T().Mesh)(new (T().TorusGeometry)(.235, .016, 8, 24), mat('#2c4029')); orlo.rotation.x = Math.PI / 2; orlo.position.y = .73; g.add(orlo);
      Mo.tornito(g, [[0, 0], [.2, 0], [.18, .1], [.1, .14], [0, .12]], '#2a2a2c', { roughness: .4 }, 0, .64, 0, 14);
      add(g, B(.22, .28, .02), '#e8e2d0', .06, .8, 0, 0, .4, .3); add(g, B(.12, .14, .1), '#e8e8e8', -.08, .74, .08, .2, .4, -.2);
      Mo.targa(g, 'COMUNE', .1, .05, 0, .5, .236, 0, '#e8c040', '#1a1a1a');
    },

    // copertone, lamiera ondulata arrugginita piegata, tubi, mattoni, un cerchione
    rottami(g) {
      if (!dl(g, 'gomme', -.15, 0, .05, .4, .8)) tire(g, -.18, .16, .06, Math.PI / 2);
      const wav = new (T().PlaneGeometry)(.75, .5, 10, 1), P0 = wav.attributes.position; for (let i = 0; i < P0.count; i++) P0.setZ(i, Math.sin(P0.getX(i) * 40) * .02 + P0.getX(i) * P0.getX(i) * .3); wav.computeVertexNormals();
      const sh = add(g, wav, '#ffffff', .18, .24, -.05, -1.2, .5, .25, 'ruggine'); sh.material.side = T().DoubleSide;
      add(g, C(.05, .05, .9, 8), '#7d8288', .05, .07, .3, 0, .4, Math.PI / 2, 'ruggine'); add(g, C(.035, .035, .6, 8), '#5a5e62', .2, .17, .28, .3, -.3, Math.PI / 2);
      for (const [x, z, ry] of [[.42, .05, .3], [.38, -.25, 1.1], [-.45, -.25, .7]]) add(g, B(.22, .07, .11), '#9a4a32', x, .035, z, 0, ry);
    },
    // fascina: rami di spessore diverso, legati con due giri di corda; un'accetta piantata in un ceppo accanto
    bosco(g) {
      let h = 3; const r = () => { h = (h * 16807) % 2147483647; return h / 2147483647; };
      for (let k = 0; k < 11; k++) { const a = r() * Math.PI * 2, d = r() * .14, rr = .025 + r() * .035; add(g, C(rr, rr * 1.1, .85 + r() * .25, 6), ['#6d4a2c', '#5a3e24', '#7a5634'][k % 3], Math.cos(a) * d * .8, .13 + Math.sin(a) * d * .7, (r() - .5) * .08, Math.PI / 2, (r() - .5) * .15); }
      for (const z of [-.22, .22]) { const t = add(g, new (T().TorusGeometry)(.13, .013, 5, 14), '#c9b27a', 0, .13, z, 0, 0, 0); t.scale.y = .92; }
      add(g, C(.17, .19, .3, 10), '#7a5634', .55, .15, .1); add(g, C(.16, .16, .01, 10), '#c8a070', .55, .305, .1);
      add(g, C(.015, .015, .4, 6), '#8a6a42', .55, .48, .1, 0, 0, .3); add(g, B(.03, .1, .14), '#6a6e72', .5, .33, .1, 0, 0, .3);
    },
    // cassa portata dal mare: legno scurito e storto, alghe, una cima avvolta
    spiaggia(g) {
      const q = new (T().Group)(); crate(q, .5, 0, 0, 0, '#8a9088'); q.rotation.set(.12, .5, -.18); q.position.y = -.04; g.add(q);
      for (let k = 0; k < 5; k++) add(g, B(.02, .01, .25), '#3a5a2a', -.2 + k * .1, .06 + k * .02, .2, 0, k * .7, .3);
      for (let k = 0; k < 3; k++) add(g, new (T().TorusGeometry)(.13 - k * .025, .022, 5, 14), '#b8a77a', .45, .022 + k * .035, .15, Math.PI / 2);
    },
    // sacco di juta (profilo tornito), il collo arricciato e legato con lo spago
    prateria(g) {
      const prof = [[0, 0], [.22, .02], [.3, .12], [.31, .3], [.26, .44], [.12, .52], [.07, .56], [.09, .66], [.05, .7], [0, .7]].map(([a, b]) => new (T().Vector2)(a, b));
      const s = add(g, new (T().LatheGeometry)(prof, 14), '#ffffff', 0, 0, 0, 0, 0, 0, 'juta'); s.scale.set(1, .9, .82);
      add(g, new (T().TorusGeometry)(.07, .012, 5, 12), '#5e4a2c', 0, .52, 0, Math.PI / 2);
    },
    // [modelli] cassetta delle munizioni: corpo stampato con le nervature, coperchio con la guarnizione, maniglia ribaltabile, leva di chiusura, stampigliatura
    militare(g) {
      const Mo = window.Modella; if (!Mo) return;
      Mo.guscio(g, .6, .26, .28, '#4b5433', { roughness: .6 }, .02, .01); for (const x of [-.2, .2]) Mo.guscio(g, .02, .24, .285, '#3a4127', {}, .005, .003, x, .01, 0);
      Mo.guscio(g, .62, .05, .3, '#3a4127', { roughness: .6 }, .02, .01, 0, .26, 0); Mo.guscio(g, .6, .01, .28, '#1a1a1a', {}, .02, .003, 0, .255, 0);
      Mo.maniglia(g, [-.08, .31, 0], [.08, .31, 0], .035, .007, '#2a2e1c');
      const lv = Mo.guscio(g, .05, .12, .025, '#2a2e1c', { metalness: .3 }, .01, .005, .315, .15, 0); lv.rotation.z = .25; lv.rotation.y = Math.PI / 2;
      Mo.targa(g, '7.62 NATO\n440 CART', .3, .12, 0, .13, .141, 0, '#4b5433', '#d8c060');
    },

    // sul tetto: una cassa sotto un telo legato
    tetto(g) { crate(g, .5, 0, 0, .3); const t = add(g, B(.58, .03, .58), '#5a6a5a', 0, .52, 0, .05, .3, .04); add(g, B(.58, .22, .02), '#4e5e4e', .02, .4, .29, .1, .3); },
    // [modelli] posto da frugare: casse una sull'altra e un fusto da 200 litri con le nervature, il tappo, la ruggine
    posto(g) {
      const Mo = window.Modella; crate(g, .6, -.25, 0, .2); crate(g, .45, -.2, .05, .7, '#c8b8a0', .6); if (!Mo) return;
      Mo.tornito(g, [[0, 0], [.22, 0], [.24, .02], [.24, .68], [.22, .7], [0, .7]], mat('#ffffff', 'ruggine'), null, .45, 0, .2, 22);   // materiale suo (con la texture della ruggine), non quello condiviso
      for (const y of [.02, .23, .47, .68]) { const t = new (T().Mesh)(new (T().TorusGeometry)(.243, y > .1 && y < .6 ? .012 : .016, 6, 24), mat('#4a5a6a')); t.rotation.x = Math.PI / 2; t.position.set(.45, y, .2); g.add(t); }
      Mo.tornito(g, [[0, 0], [.03, 0], [.03, .015], [0, .02]], '#222', {}, .52, .7, .26, 10); Mo.tornito(g, [[0, 0], [.018, 0], [.018, .012], [0, .015]], '#222', {}, .36, .7, .14, 8);
    },

    // casse di carico al porto: assi, cerchiature di ferro, pallet sotto, stampini; il lucchetto vero se sono chiuse
    carico(g, L) {
      for (const [x, z, s] of [[-.6, 0, 1], [.5, .1, .9]]) {
        for (let k = 0; k < 4; k++) add(g, B(s * .22, .1, s), '#8a6a42', x - s * .36 + k * s * .24, .05, z);
        add(g, B(s, s * .8, s), '#ffffff', x, .1 + s * .4, z, 0, 0, 0, 'cassone');
        for (const k of [-.33, .33]) add(g, B(.05, s * .82, s + .02), '#5a5f66', x + k * s, .1 + s * .4, z);
      }
      add(g, B(.9, .7, .9), '#ffffff', -.1, 1.25, .05, 0, .3, 0, 'cassone');
      if (L && L.locked) { add(g, B(.1, .12, .05), '#b88a2a', -.6, .55, .52); add(g, new (T().TorusGeometry)(.035, .01, 5, 10, Math.PI), '#9a9ea2', -.6, .61, .52); }
    },
  };
  function build(L) {
    const g = new (T().Group)(), f = MODEL[L.kind] || MODEL.vicolo; f(g, L);
    let h = 0; for (const ch of (L.ref || '')) h = (h * 31 + ch.charCodeAt(0)) | 0;
    g.rotation.y = (h % 628) / 100; g.userData.kind = L.kind;
    return typeof Superfici !== 'undefined' ? Superfici.vesti(g) : g;
  }

  // ---------------- L'ELENCO ----------------
  function refresh(st, force) {
    const now = performance.now(); if (!force && now - U.at < 250) return U.list; U.at = now;
    try { U.list = Oggetti.lootables(st, 45); } catch (e) { U.list = []; }
    return U.list;
  }
  const find = (st, ref) => refresh(st).find(L => L.ref === ref) || refresh(st, true).find(L => L.ref === ref) || null;

  // ---------------- IL CLIC ----------------
  // Restituisce l'oggetto sotto il puntatore: fuori per proiezione (sono piccoli, si prende il punto sullo schermo), dentro e per i bagagliai col punto a terra.
  function pick(st, nx, ny, o) {
    const R = PV().R, p = st.player; if (p.vehicle || !R) return null;
    const list = refresh(st); if (!list.length) return null;
    let best = null, bd = Math.max(20, o.h * .035);
    list.forEach(L => {
      if (L.kind === 'mobile' || L.kind === 'bagagliaio') return;
      if (L.kind === 'corpo') { const n = PV().G.byId(st, L.npc); if (!n || !n.dead) return; }   // chi è solo a terra si clicca come persona (menu)
      for (const hh of L.kind === 'carico' ? [.4, 1.1] : L.kind === 'corpo' ? [.15] : [.15, .4]) {
        const pr = R.project(L.x, hh, L.y); if (pr.behind) continue;
        const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h) - (L.kind === 'carico' ? 18 : 0);
        if (d < bd) { bd = d; best = L; }
      }
    });
    if (!best) {
      const g = R.screenToGround(nx, ny);
      if (g) { let gd = 1e9; list.forEach(L => { if (L.kind !== 'mobile' && L.kind !== 'bagagliaio') return; const d = Math.hypot(L.x - g.x, L.y - g.y), lim = L.kind === 'mobile' ? 1.1 : 1.0; if (d < lim && d < gd) { gd = d; best = L; } }); }
    }
    if (!best) return null;
    U.hot = best.ref; U.hotT = performance.now();
    return { kind: 'loot', ref: best.ref, x: best.x, y: best.y, label: verb(best) };
  }
  function verb(L) {
    if (L.locked) return `Forza: ${L.label}`;
    if (L.take) return `Raccogli: ${L.label}`;
    if (L.kind === 'bagagliaio') return `Apri il ${L.label}`;
    return L.kind === 'corpo' ? L.label : `Fruga: ${L.label}`;
  }
  // dove mettersi per arrivarci
  function goal(st, ref) {
    const L = find(st, ref); if (!L) return null; const p = st.player, G = PV().G;
    if (L.kind === 'mobile' && p.indoor && G.INT.nearFree) { const q = G.INT.nearFree(G.INT.layout(G.BUILDINGS[p.indoor.b]), p.indoor.f, L.x, L.y); if (q) return q; }
    if (L.kind === 'bagagliaio') { const v = st.vehicles.find(k => k.id === L.veh); if (v) return { x: L.x - Math.cos(v.ang) * .7, y: L.y - Math.sin(v.ang) * .7 }; }
    return { x: L.x, y: L.y };
  }
  const reach = ref => R_[ref[0]] || 1.5;
  // arrivato: la roba sparsa si raccoglie, il resto si apre
  function arrive(st, ref) {
    const L = find(st, ref); if (!L) return;
    const G = PV().G;
    if (L.take && !L.locked) {
      const r = Oggetti.act(st, 'prendi_tutto', ref);
      if (r && r.ok) { G.feed(st, r.msg, /ti ha visto/.test(r.msg) ? 'bad' : 'good'); const R = PV().R; if (R && R.sfx) R.sfx.push({ k: 'pickup', x: L.x, y: L.y }); refresh(st, true); return; }
    }
    if (typeof OggettiUI !== 'undefined') OggettiUI.open('fruga', ref);
  }
  // chi è a terra stordito: nel menu attorno alla persona
  function ringOptions(n, close) {
    const st = ST(); if (!st || n.dead || !(n.stun > 0) || !n.pop) return [];
    return [{ label: 'Tasche', bad: true, run: () => { close(); arrive(st, 'c:' + n.id); } }];
  }

  // ---------------- IN SCENA ----------------
  function sync(st) {
    const R = PV().R, scene = R && R.__models && R.__models.scene; if (!scene || !T()) return;
    if (U.scene !== scene) { U.scene = scene; U.grp = new (T().Group)(); U.grp.name = 'bottino'; scene.add(U.grp); U.meshes = {}; }
    if (U.stRef !== st) { for (const k in U.meshes) U.grp.remove(U.meshes[k]); U.meshes = {}; U.stRef = st; }
    const ui = PV().ui, p = st.player, on = !(ui && (ui.intro || ui.over)) && !p.indoor;
    U.grp.visible = on;
    const want = {};
    if (on) refresh(st).forEach(L => { if (MODEL[L.kind]) want[L.ref] = L; });
    for (const k in U.meshes) if (!want[k]) { U.grp.remove(U.meshes[k]); delete U.meshes[k]; }
    const hot = performance.now() - U.hotT < 150 ? U.hot : null, t = performance.now() / 1000, dlv = typeof Scaricati !== 'undefined' ? Scaricati.ver : 0;
    for (const [k, L] of Object.entries(want)) {
      let m = U.meshes[k];
      if (!m || m.userData.locked !== !!L.locked || m.userData.dlv !== dlv) { if (m) U.grp.remove(m); m = build(L); m.userData.locked = !!L.locked; m.userData.dlv = dlv; U.grp.add(m); U.meshes[k] = m; }
      const y = L.kind === 'tetto' && R.groundH ? (PV().st.player.lv && typeof Livelli !== 'undefined' && Livelli.heightOf ? Livelli.heightOf(st, p) : R.groundH(L.x, L.y)) : R.groundH(L.x, L.y);
      m.position.set(L.x, y, L.y);
      // sotto il puntatore si solleva appena e respira: si capisce che si prende
      const s = k === hot ? 1.12 + Math.sin(t * 8) * .03 : 1; m.scale.set(s, s, s); m.position.y += k === hot ? .05 : 0;
    }
  }
  function loop() {
    try { const st = ST(); if (st && st.player && typeof Oggetti !== 'undefined' && Oggetti.lootables) sync(st); }
    catch (e) { if (!U.err) { U.err = true; console.error('[Bottino]', e); } }
    requestAnimationFrame(loop);
  }
  function init() { if (!window.__pv) { setTimeout(init, 100); return; } requestAnimationFrame(loop); }
  if (typeof window !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0); }
  return { pick, goal, reach, find, arrive, ringOptions, refresh, MODEL, state: U };
})();
