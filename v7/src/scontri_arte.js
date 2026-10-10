/* Porto Vecchio — Gli scontri: la grafica (legge st.sc e le proteste di st.ord, non cambia mai lo stato del gioco).
   - Gli scudi della celere: alluminio bugnato, rettangolari, davanti a ogni agente del reparto antisommossa.
   - I candelotti in volo (col filo di fumo) e le nubi dei lacrimogeni: sbuffi bianco-verdastri che si gonfiano e si sfilacciano.
   - L'idrante del Blindato: il getto che si apre a ventaglio, gli spruzzi dove batte.
   - La barricata: cassonetti, la carcassa di un'auto, pancali, gomme, transenne, una rete da letto, un bidone che brucia;
     sale man mano che la tirano su, e quando cade resta sparpagliata a terra.
   - Sullo schermo: il bruciore del gas (bordi lattiginosi) e il gelo dei vestiti bagnati (brina ai bordi).
   Si aggancia a ordine_arte.js (attach e tick), senza toccare render.js. */
var ScontriArte = (function () {
  'use strict';
  let scene = null, G = null, groundH = null, ready = false, built = false;
  const MAXSH = 24, MAXPUFF = 120, MAXJET = 60, MAXCAN = 8;
  let SHIELDS = null, PUFFS = [], JETS = [], CANS = [], OVER = null;
  const BARR = {};   // id → { g, parts }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const rndS = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  // una pennellata morbida per il fumo e gli spruzzi
  function softTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${.05 + Math.random() * .1})`; x.beginPath(); x.arc(14 + Math.random() * 36, 14 + Math.random() * 36, 3 + Math.random() * 7, 0, 6.28); x.fill(); }
    const t = new THREE.CanvasTexture(c); return t;
  }
  // l'alluminio bugnato: le bugne a rombo
  function bugnatoTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#9aa2aa'; x.fillRect(0, 0, 64, 64);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const ox = i * 8 + (j % 2) * 4, oy = j * 8; x.fillStyle = '#c4cbd2'; x.fillRect(ox + 1, oy + 2, 4, 1); x.fillStyle = '#6e767e'; x.fillRect(ox + 1, oy + 3, 4, 1); }
    x.fillStyle = 'rgba(40,44,50,.5)'; x.fillRect(0, 0, 64, 2); x.fillRect(0, 62, 64, 2);
    x.fillStyle = '#f2f2ea'; x.font = 'bold 9px sans-serif'; x.fillText('GRIGI', 18, 36);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
  }

  function attach(api) { scene = api.scene; G = api.G; groundH = api.groundH; ready = !!(scene && G && groundH); }
  function build() {
    built = true;
    const shG = new THREE.BoxGeometry(.62, 1.02, .05), shM = new THREE.MeshStandardMaterial({ map: bugnatoTex(), metalness: .55, roughness: .45 });
    SHIELDS = new THREE.InstancedMesh(shG, shM, MAXSH); SHIELDS.count = 0; SHIELDS.frustumCulled = false; scene.add(SHIELDS);
    const soft = softTex();
    for (let i = 0; i < MAXPUFF; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: '#e4e8e0', transparent: true, depthWrite: false, opacity: 0, fog: true })); s.visible = false; scene.add(s); PUFFS.push(s); }
    for (let i = 0; i < MAXJET; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: '#d8ecf6', transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); JETS.push(s); }
    const cg = new THREE.CylinderGeometry(.05, .05, .22, 8), cm = new THREE.MeshStandardMaterial({ color: '#4a5a3a', metalness: .5, roughness: .5 });
    for (let i = 0; i < MAXCAN; i++) { const m = new THREE.Mesh(cg, cm); m.visible = false; scene.add(m); CANS.push(m); }
    // gli effetti sullo schermo
    OVER = document.createElement('div');
    OVER.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .25s;mix-blend-mode:normal';
    document.body.appendChild(OVER);
  }

  // ---------------- LA BARRICATA ----------------
  function barricade(b) {
    const g = new THREE.Group(), r = rndS(b.seed || 7), parts = [];
    const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: 0 });
    const MT = c => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .45 });
    const put = (mesh, x, y, z, ry, rz, rx) => { mesh.position.set(x, y, z); mesh.rotation.set(rx || 0, ry || 0, rz || 0); mesh.castShadow = true; g.add(mesh); parts.push({ m: mesh, y, rz: rz || 0, rx: rx || 0, x, z }); return mesh; };
    const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    const hw = b.w / 2;
    // la carcassa d'auto, di traverso, ruggine e lamiera bruciata
    const car = new THREE.Group(); { const body = box(3.9, .7, 1.7, MT('#5a3a2a')); body.position.y = .55; car.add(body); const roof = box(2.1, .55, 1.5, MT('#3a2a22')); roof.position.set(-.2, 1.15, 0); car.add(roof); const gl = box(2.05, .4, 1.52, new THREE.MeshStandardMaterial({ color: '#1a1e22', roughness: .2 })); gl.position.set(-.2, 1.12, 0); car.add(gl);
      [[-1.3, .78], [1.3, .78], [-1.3, -.78], [1.3, -.78]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .22, 10), M('#141414')); w.rotation.x = Math.PI / 2; w.position.set(x, .2, z); car.add(w); }); }
    car.traverse(o => { o.castShadow = true; }); put(car, -hw + 2.4, 0, .1, .12 + r() * .1, .18);
    // due cassonetti
    [[hw - 2.6, '#2e5a34'], [.7, '#3a3a3a']].forEach(([x, c]) => { const k = new THREE.Group(), bo = box(1.6, 1.25, 1.05, M(c)); bo.position.y = .62; k.add(bo); const lid = box(1.62, .08, 1.08, M('#22261e')); lid.position.set(0, 1.27, -.1); lid.rotation.x = -.5; k.add(lid); put(k, x, 0, (r() - .5) * .5, (r() - .5) * .5, (r() - .5) * .15); });
    // pancali appoggiati e accatastati
    for (let i = 0; i < 4; i++) { const p = new THREE.Group(); for (let k = 0; k < 5; k++) { const t = box(1.2, .03, .14, M('#a08058')); t.position.set(0, 0, -.42 + k * .21); p.add(t); } [-0.5, 0, .5].forEach(x => { const t = box(.1, .1, 1.0, M('#8a6a44')); t.position.set(x, -.06, 0); p.add(t); }); put(p, -hw + 4.6 + i * 1.1 + r() * .3, .5 + r() * .3, -.6 + r() * .3, r() * .6, 0, -1.1 - r() * .3); }
    // le gomme impilate
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.32, .13, 6, 12), M('#151515')); put(t, hw - .8 + (i % 2) * .5, .13 + Math.floor(i / 2) * .24, .5 - (i % 3) * .3, 0, 0, Math.PI / 2); }
    // una transenna dei Grigi rubata, una rete da letto, assi
    const tr = new THREE.Group(); { const bar = box(2.2, .22, .05, M('#c8c8c0')); bar.position.y = .9; tr.add(bar); for (let k = 0; k < 4; k++) { const s = box(.26, .2, .055, M('#b02a20')); s.position.set(-.8 + k * .55, .9, .001); tr.add(s); } [-1, 1].forEach(x => { const l = box(.05, 1, .05, MT('#777')); l.position.set(x, .5, 0); tr.add(l); }); }
    put(tr, -.6, 0, -.9, .2, .2);
    const net = box(1.9, .9, .04, MT('#5a5a5a')); put(net, 2.3, .6, -.5, .4, .35);
    for (let i = 0; i < 6; i++) put(box(2.4 + r(), .06, .2, M(['#6a4a2a', '#7a5a3a', '#5a3a22'][i % 3])), -hw + r() * b.w, .2 + r() * .9, (r() - .5) * 1.2, r() * 3, (r() - .5) * .8);
    // il bidone che brucia, dietro
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .85, 12), MT('#3a3028')); put(drum, 1.8, .42, 1.6);
    const fire = new THREE.PointLight('#ff8a3a', 0, 9, 2); fire.position.set(1.8, 1.2, 1.6); g.add(fire);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.26, .7, 8), new THREE.MeshBasicMaterial({ color: '#ffb050', transparent: true, opacity: .85, fog: true })); flame.position.set(1.8, 1.15, 1.6); g.add(flame);
    scene.add(g);
    return { g, parts, fire, flame };
  }

  // ---------------- IL PASSO ----------------
  function tick(st, time, night, dt) {
    if (!ready) return;
    if (!built) { try { build(); } catch (e) { console.warn('[scontri_arte] build', e); ready = false; return; } }
    const Sc = st.sc, O = st.ord; dt = Math.min(.1, dt || .016);
    // gli scudi
    let k = 0;
    if (O && O.proteste) O.proteste.forEach(Pr => { if (Pr.phase === 'fine') return; Pr.police.forEach(id => {
      const n = G.byId(st, id); if (!n || n.dead || n.inside || k >= MAXSH) return;
      const f = n.face, x = n.x + Math.cos(f) * .42, z = n.y + Math.sin(f) * .42, y = groundH(n.x, n.y) + .78;
      _e.set(0, Math.PI / 2 - f, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(1, 1, 1); _m.compose(_p, _q, _s); SHIELDS.setMatrixAt(k++, _m);
    }); });
    SHIELDS.count = k; SHIELDS.instanceMatrix.needsUpdate = true;
    if (!Sc) return;
    // i candelotti in volo, col filo di fumo
    CANS.forEach((m, i) => { const pr = Sc.proj[i]; m.visible = !!pr; if (pr) { m.position.set(pr.x, groundH(pr.x, pr.y) + pr.z, pr.y); m.rotation.set(time * 9, 0, time * 7); } });
    // le nubi: sbuffi che si gonfiano e si sfilacciano
    let pi = 0;
    Sc.gas.forEach((g, gi) => {
      const age = st.clock - g.t0, life = g.until - g.t0, fade = Math.min(1, age * 2) * Math.min(1, (g.until - st.clock) / 6);
      const N = Math.min(22, MAXPUFF - pi), gy = groundH(g.x, g.y);
      for (let j = 0; j < N; j++) {
        const s = PUFFS[pi++], a = j * 2.399 + gi, rr = g.r * Math.sqrt((j + .5) / N), drift = age * .25;
        const rise = ((time * .35 + j * .137) % 1);   // gli sbuffi salgono, si allargano e svaniscono, uno dopo l'altro
        s.visible = true; s.position.set(g.x + Math.cos(a + age * .1) * rr + drift, gy + .4 + (j % 3) * .35 + rise * 1.6, g.y + Math.sin(a + age * .1) * rr + drift * .4);
        const sz = 1.6 + (j % 3) * .7 + rise * 1.4 + Math.min(age, 6) * .2; s.scale.set(sz, sz, 1);
        s.material.opacity = .7 * fade * Math.sin(rise * Math.PI) * (.75 + .25 * Math.sin(time * .7 + j)); s.material.color.set(night > .5 ? '#8e988c' : j % 3 ? '#d6dccb' : '#c4ccb8');
      }
      // il fumo del candelotto, denso alla sorgente
      if (pi < MAXPUFF && age < life - 4) { const s = PUFFS[pi++]; s.visible = true; s.position.set(g.x, gy + .3 + (time * 1.3 % 1) * .8, g.y); s.scale.set(1.1, 1.1, 1); s.material.opacity = .7 * fade; s.material.color.set('#f2f4ee'); }
    });
    for (; pi < MAXPUFF; pi++) { PUFFS[pi].visible = false; }
    // l'idrante: il getto che si apre e cade
    let ji = 0;
    Sc.jets.forEach(J => {
      const v = st.vehicles.find(q => q.id === J.vid); if (!v) return; const by = groundH(v.x, v.y) + 2.3, R = 15;
      for (let j = 0; j < 30 && ji < MAXJET; j++) {
        const s = JETS[ji++], u = ((j / 30) + time * 1.6) % 1, d = u * R, spread = (Math.sin(j * 12.9) * .5) * u * .25;
        const a = J.a + spread, x = J.x + Math.cos(a) * d, z = J.y + Math.sin(a) * d, y = by + u * 1.2 - u * u * 3.2;
        s.visible = true; s.position.set(x, Math.max(groundH(x, z) + .1, y), z); const sz = .35 + u * 1.3; s.scale.set(sz, sz, 1); s.material.opacity = .65 * (1 - u * .6);
      }
    });
    for (; ji < MAXJET; ji++) JETS[ji].visible = false;
    // le barricate
    const seen = {};
    Sc.barr.forEach(b => {
      seen[b.id] = 1; const B = BARR[b.id] || (BARR[b.id] = barricade(b));
      B.g.visible = true; B.g.position.set(b.x, groundH(b.x, b.y), b.y); B.g.rotation.y = -b.a;
      const up = b.phase === 'su' ? Math.min(1, b.prog * 1.1) : 1, down = b.phase === 'giu';
      B.parts.forEach((P, i) => {
        const on = b.phase !== 'su' || i / B.parts.length < up + .05; P.m.visible = on;
        if (down) { P.m.position.y = Math.max(.05, P.y * .25); P.m.rotation.z = P.rz + (i % 2 ? .6 : -.5); P.m.position.x = P.x + Math.sin(i * 7.1) * 1.5; P.m.position.z = P.z + Math.cos(i * 3.3) * 1.8; }
      });
      const burn = !down && b.phase !== 'su'; B.flame.visible = burn; B.fire.intensity = burn ? (1.4 + Math.sin(time * 13) * .3 + Math.sin(time * 7.3) * .2) * (.4 + night) : 0;
      B.flame.scale.set(1, .8 + Math.sin(time * 11) * .2, 1);
    });
    for (const id in BARR) if (!seen[id]) { scene.remove(BARR[id].g); delete BARR[id]; }
    // sullo schermo: il gas brucia gli occhi, il bagnato gela
    if (OVER) {
      const gp = Sc.gasP || 0, wp = Sc.wet || 0;
      if (gp < .02 && wp < .02) OVER.style.opacity = 0;
      else {   // solo ai bordi: il centro (dove sei tu) resta leggibile
        OVER.style.background = gp >= wp ? `radial-gradient(ellipse at center, rgba(226,232,214,0) 38%, rgba(214,226,196,${(.18 + gp * .32).toFixed(2)}) 100%)`
          : `radial-gradient(ellipse at center, rgba(200,225,245,0) 50%, rgba(196,224,246,${(.15 + wp * .3).toFixed(2)}) 100%)`;
        OVER.style.opacity = '1';
      }
    }
  }

  // ---------------- AGGANCIO a ordine_arte.js ----------------
  (function hook() {
    if (typeof OrdineArte === 'undefined' || OrdineArte.__scontri) return;
    const a0 = OrdineArte.attach, t0 = OrdineArte.tick; OrdineArte.__scontri = true;
    OrdineArte.attach = api => { a0(api); try { attach(api); } catch (e) { console.warn('[scontri_arte] attach', e); } };
    OrdineArte.tick = (st, time, night, dt, cam) => { t0(st, time, night, dt, cam); try { tick(st, time, night, dt); } catch (e) { if (!tick.err) { tick.err = 1; console.warn('[scontri_arte]', e); } } };
  })();
  return { attach, tick };
})();
