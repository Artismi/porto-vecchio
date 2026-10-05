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
  function mat(c) { if (!U.mats[c]) U.mats[c] = new (T().MeshLambertMaterial)({ color: c }); return U.mats[c]; }
  function add(g, geo, c, x, y, z, rx, ry, rz) { const m = new (T().Mesh)(geo, mat(c)); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
  const B = (w, h, d) => new (T().BoxGeometry)(w, h, d);
  const C = (r0, r1, h, n) => new (T().CylinderGeometry)(r0, r1, h, n || 10);
  function crate(g, s, x, z, ry, col, y0) {   // cassa di legno con le assi
    const y = (y0 || 0) + s / 2;
    add(g, B(s, s, s), col || '#8b6a40', x, y, z, 0, ry);
    for (const k of [-.3, .3]) add(g, B(s + .02, s * .12, s + .02), '#6b4e2c', x, y + k * s, z, 0, ry);
  }
  const MODEL = {
    // scatolina di cartone coi lembi aperti
    vicolo(g) {
      add(g, B(.55, .38, .44), '#b08955', 0, .19, 0);
      add(g, B(.56, .04, .1), '#d8c9a0', 0, .38, 0);
      add(g, B(.55, .02, .2), '#a07a48', 0, .45, .27, -1.0);
      add(g, B(.55, .02, .2), '#a07a48', 0, .45, -.27, 1.0);
    },
    // cestino verde col giornale che spunta
    cestino(g) {
      add(g, C(.24, .2, .72, 12), '#3e5a3c', 0, .36, 0);
      add(g, C(.27, .27, .06, 12), '#2c4029', 0, .72, 0);
      add(g, B(.22, .26, .04), '#e8e2d0', .05, .82, 0, 0, .4, .25);
    },
    // gomma, lamiera arrugginita e un tubo
    rottami(g) {
      add(g, new (T().TorusGeometry)(.3, .11, 6, 12), '#222225', -.15, .11, .05, Math.PI / 2);
      add(g, B(.7, .04, .45), '#8a4b2a', .15, .18, -.05, .1, .5, .35);
      add(g, C(.06, .06, .8, 6), '#7d8288', .1, .08, .25, 0, .3, Math.PI / 2);
    },
    // fascina di legna legata
    bosco(g) {
      for (const [x, y] of [[-.12, .11], [.12, .11], [0, .3]]) add(g, C(.1, .1, .8, 7), '#6d4a2c', x, y, 0, Math.PI / 2);
      for (const z of [-.2, .2]) add(g, C(.22, .22, .05, 10), '#c9b27a', 0, .19, z, Math.PI / 2);
    },
    // cassa portata dal mare, storta, con la cima
    spiaggia(g) {
      const q = new (T().Group)(); crate(q, .5, 0, 0, 0, '#9a8060'); q.rotation.set(.12, .5, -.18); q.position.y = -.04; g.add(q);
      add(g, new (T().TorusGeometry)(.16, .03, 5, 10), '#d8cfa8', .38, .04, .1, Math.PI / 2);
    },
    // sacco di juta legato in cima
    prateria(g) {
      const s = add(g, new (T().SphereGeometry)(.3, 9, 7), '#b39b6a', 0, .24, 0); s.scale.set(1, .85, .9);
      add(g, C(.06, .1, .14, 7), '#9a8256', 0, .5, 0);
      add(g, C(.08, .08, .04, 7), '#5e4a2c', 0, .46, 0);
    },
    // cassetta delle munizioni, verde oliva con la striscia gialla
    militare(g) {
      add(g, B(.62, .3, .3), '#4b5433', 0, .15, 0);
      add(g, B(.64, .05, .32), '#3a4127', 0, .31, 0);
      add(g, B(.2, .04, .31), '#d8b830', -.12, .17, 0);
      add(g, B(.18, .03, .06), '#2a2e1c', 0, .35, 0);
    },
    // roba sul tetto: una cassa
    tetto(g) { crate(g, .5, 0, 0, .3); },
    // posti da frugare (discarica, cantiere, molo…): casse una sull'altra e un barile
    posto(g) {
      crate(g, .6, -.25, 0, .2); crate(g, .45, -.2, .05, .7, '#7d5f3a', .6);
      add(g, C(.24, .24, .7, 12), '#4a5a6a', .45, .35, .2);
      add(g, C(.25, .25, .04, 12), '#38444f', .45, .7, .2);
    },
    // casse di carico al porto: grandi, cerchiate, col lucchetto rosso se sono chiuse
    carico(g, L) {
      for (const [x, z, s] of [[-.6, 0, 1], [.5, .1, .9]]) {
        add(g, B(s, s * .8, s), '#7a5a34', x, s * .4, z);
        for (const k of [-.33, .33]) add(g, B(.06, s * .82, s + .02), '#5a5f66', x + k * s, s * .4, z);
      }
      add(g, B(.9, .7, .9), '#6e5230', -.1, 1.15, .05, 0, .3);
      if (L.locked) add(g, B(.12, .14, .06), '#c0302a', -.6, .5, .52);
    },
  };
  function build(L) {
    const g = new (T().Group)(), f = MODEL[L.kind] || MODEL.vicolo; f(g, L);
    let h = 0; for (const ch of L.ref) h = (h * 31 + ch.charCodeAt(0)) | 0;
    g.rotation.y = (h % 628) / 100; g.userData.kind = L.kind;
    return g;
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
    const hot = performance.now() - U.hotT < 150 ? U.hot : null, t = performance.now() / 1000;
    for (const [k, L] of Object.entries(want)) {
      let m = U.meshes[k];
      if (!m || m.userData.locked !== !!L.locked) { if (m) U.grp.remove(m); m = build(L); m.userData.locked = !!L.locked; U.grp.add(m); U.meshes[k] = m; }
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
