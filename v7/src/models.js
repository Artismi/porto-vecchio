
/* Modelli esterni (Kenney, Quaternius, Poly Pizza — vedi Crediti) caricati da assets/m e messi nel mondo:
   porto con barche e container, Rocca con elicottero e forca, poligono, discarica, accampamenti, luna park,
   auto anni '70-'80. Si carica in sottofondo: il gioco parte subito, i pezzi compaiono quando arrivano. */
var Models = (function () {
  'use strict';
  // id: [file, misura da adattare ('l' lunghezza, 'h' altezza), metri]
  const CAT = {
    pesca: ['k_boat-fishing-small.json', 'l', 7], rimorchiatore: ['k_boat-tug-a.json', 'l', 8], vela: ['k_boat-sail-a.json', 'l', 8], vela2: ['k_boat-sail-b.json', 'l', 8.5],
    motoscafo: ['k_boat-speed-a.json', 'l', 6.5], motoscafo2: ['k_boat-speed-c.json', 'l', 6], barchino: ['k_boat-row-small.json', 'l', 3.6], cargo: ['k_ship-cargo-a.json', 'l', 34],
    containerA: ['k_cargo-container-a.json', 'l', 6], containerB: ['k_cargo-container-b.json', 'l', 6], containerC: ['k_cargo-container-c.json', 'l', 6], merce: ['k_cargo-pile-a.json', 'l', 4],
    elicottero: ['r_Helicopter.json', 'l', 12], ruota: ['r_SM_FerrisWheel_02.json', 'h', 24], newjersey: ['r_ConcreteBarrier.json', 'l', 2.6], transenna: ['r_Barrier_Large.json', 'l', 3.8],
    rx7: ['r_RX_7_3_v2.json', 'l', 4.3], gtr: ['r_GTR.json', 'l', 4.5], bursley: ['r_1972-bursley-defiance.json', 'l', 4.9],
    tenda: ['s_Tent.json', 'l', 3.2], falo: ['s_Bonfire_Fire.json', 'l', 1.3], tronco: ['s_WoodLog.json', 'l', 2.2], gommone: ['s_Raft.json', 'l', 3.6], bombola: ['s_PropaneTank.json', 'h', 1.1],
    forca: ['x_Gallows.json', 'h', 4.6],
    contLungo: ['t_Container_Long.json', 'l', 6.2], contCorto: ['t_Container_Small.json', 'l', 3.2], cassa: ['t_Crate.json', 'h', .9], scatole: ['t_CardboardBoxes_1.json', 'l', 1.2], scatole3: ['t_CardboardBoxes_3.json', 'h', 1.9],
    pallet: ['t_Pallet.json', 'l', 1.2], sacchi: ['t_SackTrench.json', 'l', 3.4], sacchi2: ['t_SackTrench_Small.json', 'l', 2.4], barriera: ['t_Barrier_Fixed.json', 'l', 3.6], cavalletto: ['t_Barrier_Single.json', 'l', 1.9],
    carro: ['t_Tank.json', 'l', 6.5], baracca: ['t_Structure_1.json', 'l', 8], torretta: ['t_Structure_3.json', 'h', 8], cisterna: ['t_WaterTank_Platform.json', 'h', 5],
    barile: ['t_ExplodingBarrel.json', 'h', 1], gas: ['t_GasTank.json', 'h', 1.4], rottame: ['t_Debris_BrokenCar.json', 'l', 4.3], gomme: ['t_Debris_Tires.json', 'l', 1.6], macerie: ['t_Debris_Pile.json', 'l', 2.6],
    cassonetto: ['t_TrashContainer.json', 'l', 2], cassonetto2: ['t_TrashContainer_Open.json', 'l', 2.2], cono: ['t_TrafficCone.json', 'h', .7], rete: ['t_MetalFence.json', 'l', 3.5], divano: ['t_Sofa.json', 'l', 2.2], tubi: ['t_Pipes.json', 'l', 4],
  };
  const LIB = {}, waiting = {}, placed = [];
  // tinte: i carri e le baracche del poligono color oliva, l'elicottero grigio Tutela
  const TINT = { carro: { c: '#5c6650' }, baracca: { c: '#6a7058' }, torretta: { c: '#6a7058' }, elicottero: { c: '#4a4f58' } };
  let base = 'assets/mj/', loader = null, R = null, scene = null, G = null;
  function load(id) {
    if (LIB[id]) return Promise.resolve(LIB[id]);
    if (waiting[id]) return waiting[id];
    const c = CAT[id]; if (!c) return Promise.resolve(null);
    loader = loader || new THREE.GLTFLoader();
    return (waiting[id] = new Promise(res => loader.load(base + c[0], gl => {
      const root = gl.scene; const drop = []; root.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); }); drop.forEach(o => o.parent && o.parent.remove(o)); root.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(root), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
      const L = c[1] === 'h' ? sz.y : Math.max(sz.x, sz.z), k = c[2] / (L || 1);
      const lenAxis = sz.x > sz.z ? 'x' : 'z';
      // la base va a terra e al centro; tutto in un gruppo normalizzato
      const g = new THREE.Group(); root.position.set(-ctr.x, -bb.min.y, -ctr.z); g.add(root); g.scale.setScalar(k);
      const box = new THREE.Group(); box.add(g);
      // il lato lungo lungo z (avanti), come i nostri veicoli
      if (lenAxis === 'x') g.rotation.y = Math.PI / 2;
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map) { m.map.magFilter = THREE.NearestFilter; } if (m.metalness > .5) m.metalness = .3; }); } });
      if (TINT[id]) root.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { const l = m.color.getHSL({}).l; if (m.color.r > m.color.b * 1.3 || TINT[id].all) m.color.set(TINT[id].c).multiplyScalar(.6 + l * .8); }); } });
      LIB[id] = { obj: box, size: new THREE.Vector3(sz.x * k, sz.y * k, sz.z * k), lenAxis };
      res(LIB[id]);
    }, undefined, e => { console.warn('Models: non carico', id); LIB[id] = null; res(null); })));
  }
  const has = id => !!LIB[id];
  function make(id) { const M = LIB[id]; return M ? M.obj.clone(true) : null; }
  function put(id, x, z, ry, y, sc) {
    const o = make(id); if (!o) return null;
    const gh = R && R.groundH ? R.groundH(x, z) : .4;
    o.position.set(x, (y === undefined ? 0 : y) + (y === undefined ? gh : 0), z); o.rotation.y = ry || 0; if (sc) o.scale.setScalar(sc);
    scene.add(o); placed.push([id, Math.round(x), Math.round(z)]); return o;
  }
  // un veicolo dal modello: stessa interfaccia minima dei nostri (luci, vernice), niente ammaccature
  function vehicle(id, K, color) {
    const o = make(id); if (!o) return null;
    const M = LIB[id], g = new THREE.Group(); const s = K.len / Math.max(M.size.z, .1); o.scale.multiplyScalar(s); g.add(o);
    const paint = [];
    o.traverse(m => { if (m.isMesh) { m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => paint.push(x)); } });
    const L = K.len / 2, h = M.size.y * s;
    const tail = new THREE.Object3D(); tail.position.set(0, h * .45, -L + .05); g.add(tail);
    const tail2 = new THREE.Object3D(); tail2.position.set(.5, h * .45, -L + .05); g.add(tail2); tail.position.x = -.5;
    g.userData = { paint, glass: null, lamps: [[-.55, h * .42, L - .1], [.55, h * .42, L - .1]], tails: [tail, tail2], wheels: [], front: [], dents: 0, parts: {}, len: K.len, seat: [-.3, h * .35, .1], seat2: [.3, h * .35, .1], glb: id };
    return g;
  }

  // mobili (Kenney Furniture Kit): scala unica ×2, il davanti verso +z
  const FURN = {}, FWAIT = {};
  const FSCALE = n => /^ar_/.test(n) ? 2.5 : /^fd_barrel/.test(n) ? 1.1 : /^fd_/.test(n) ? .6 : n === 'rc_seat' ? 2.8 : n === 'rc_screen' ? 1.5 : n === 'rc_cinecamera' ? 1 : n === 'rc_glove' ? .5 : 2;
  // mobili fatti a mano (banchi da lavoro e di vendita, officina): il davanti verso +z, la schiena al muro
  const PM = {}; const pmat = c => PM[c] || (PM[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: .05 }));
  function procFurn(name) {
    const g = new THREE.Group(); const B = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pmat(c)); m.position.set(x, y, z); g.add(m); return m; };
    const C = (r, h, x, y, z, c, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 10), pmat(c)); m.position.set(x, y, z); g.add(m); return m; };
    const S = (r, x, y, z, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), pmat(c)); m.position.set(x, y, z); g.add(m); return m; };
    if (name === 'pv_banco_lavoro') {
      [[-.82, -.28], [.82, -.28], [-.82, .28], [.82, .28]].forEach(([x, z]) => B(.08, .86, .08, x, .43, z, '#5a4430'));
      B(1.8, .07, .7, 0, .9, 0, '#8a6a44'); B(1.7, .05, .6, 0, .28, 0, '#6a5036'); B(1.7, .22, .04, 0, .74, .3, '#4a3828');
      B(.22, .12, .16, -.68, .995, .12, '#4a4e56'); B(.04, .04, .22, -.68, 1.05, .26, '#2a2c30');                 // morsa
      B(.5, .03, .12, .1, .955, .15, '#c8a878'); B(.4, .03, .1, .12, .985, .08, '#b89868');                         // assi
      B(.3, .04, .04, .55, .96, .2, '#8a8a90'); B(.1, .05, .05, .7, .98, .2, '#5a3a22');                             // martello
      B(1.7, .9, .04, 0, 1.45, -.32, '#6a5238');                                                                  // pannello dei ferri
      [[-.7, '#c04030'], [-.45, '#3a6ab0'], [-.2, '#d0a030'], [.05, '#7a8088'], [.3, '#c04030'], [.55, '#3a8a50']].forEach(([x, c], i) => B(.07, .28 - (i % 2) * .08, .04, x, 1.5 - (i % 2) * .05, -.29, c));
      B(.26, .05, .26, .45, 1.04, -.12, '#2a2a30'); C(.02, .25, .45, 1.17, -.12, '#2a2a30', 6);                       // lampada da banco
    } else if (name === 'pv_banco_vendita') {
      B(1.9, .94, .6, 0, .47, 0, '#7a4a30'); B(1.98, .06, .68, 0, .97, 0, '#d8c8a8'); B(1.7, .5, .02, 0, .5, .31, '#5a3220'); B(1.5, .08, .02, 0, .85, .31, '#e0b040');   // bancone, piano, fronte, fascia
      [[-.6, '#e06a2a'], [-.1, '#c03030'], [.4, '#7ab040']].forEach(([x, c], k) => { B(.42, .16, .34, x, 1.08, -.02, '#a8804a'); for (let i = 0; i < 5; i++) S(.07, x - .14 + (i % 3) * .14, 1.2, -.1 + (i > 2 ? .14 : 0), c); });
      B(.34, .2, .3, .8, 1.1, -.1, '#3a3e46'); B(.26, .12, .02, .8, 1.26, -.05, '#35e6ff'); B(.2, .04, .14, .8, 1.0, .12, '#8a8e96');   // registratore
      B(.5, .5, .04, -.1, 1.55, -.28, '#1e1a24'); B(.42, .42, .02, -.1, 1.55, -.26, '#ff4fa3');                                         // cartello sul retro
    } else if (name === 'pv_ponte') {
      [-.75, .75].forEach(x => { B(.5, .14, 3.8, x, .07, 0, '#3c4048'); B(.34, .03, 3.5, x, .15, 0, '#8a8e96'); B(.16, 2.2, .16, x, 1.1, -1.6, '#d0a030'); B(.16, 2.2, .16, x, 1.1, 1.6, '#d0a030'); });
      B(1.8, .14, .2, 0, 2.2, -1.6, '#3c4048'); B(1.8, .14, .2, 0, 2.2, 1.6, '#3c4048'); B(.3, .06, .3, 0, 2.28, 0, '#c04030');
    } else if (name === 'pv_attrezzi') {
      B(.6, .86, .5, 0, .43, 0, '#b02820'); for (let i = 0; i < 4; i++) { B(.52, .17, .02, 0, .14 + i * .2, .26, '#7a1c16'); B(.2, .03, .03, 0, .16 + i * .2, .285, '#c8c8cc'); } B(.64, .05, .54, 0, .88, 0, '#5a5e66');
    } else if (name === 'pv_pneumatici') {
      for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(.26, .12, 8, 14), pmat('#1c1c20')); m.rotation.x = Math.PI / 2; m.position.set(0, .12 + i * .24, 0); g.add(m); }
    } else return null;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function furniture(name) {
    if (/^pv_/.test(name)) { const g = procFurn(name); return Promise.resolve(g); }
    if (FURN[name]) return Promise.resolve(FURN[name].clone(true));
    if (!FWAIT[name]) { loader = loader || new THREE.GLTFLoader(); FWAIT[name] = new Promise(res => loader.load('assets/mf/' + name + '.json', gl => { const g = new THREE.Group(), root = gl.scene; const drop = []; root.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); drop.forEach(o => o.parent && o.parent.remove(o)); const bb = new THREE.Box3().setFromObject(root), c = bb.getCenter(new THREE.Vector3()); root.position.set(-c.x, -bb.min.y, -c.z); g.add(root); g.scale.setScalar(FSCALE(name)); FURN[name] = g; res(g); }, undefined, () => res(null))); }
    return FWAIT[name].then(g => g ? g.clone(true) : null);
  }
  // ---------------- PERSONAGGI ANIMATI ----------------
  // Quaternius (Toon Shooter: soldati della Tutela) e Race kit (civili). Ogni persona ha la sua copia con scheletro e mixer.
  const CHARS = { soldato: 'Soldier', hazmat: 'Hazmat', teppista: 'Enemy', casual: 'Casual', uomo: 'Casual_2', felpa: 'Casual_Hoodie', elegante: 'Formal', operaio: 'Worker' };
  // materiali da tingere con il look della persona: [maglia, pantaloni, capelli]
  const PAINT = { Casual: ['White', 'Orange', 'Hair_Brown'], Casual_2: ['White', 'LightBlue', 'Hair'], Casual_Hoodie: ['Purple', 'LightBlue', 'Hair'], Formal: ['LimeGreen', null, 'Red'], Worker: [null, 'Brown', null], Soldier: ['Character_Main', 'Pants', null], Hazmat: [null, null, null], Enemy: [null, null, null] };
  const CH = {}, CHW = {};
  function loadChar(file) {
    if (CH[file]) return Promise.resolve(CH[file]);
    if (!CHW[file]) { loader = loader || new THREE.GLTFLoader(); CHW[file] = new Promise(res => loader.load('assets/mc/' + file + '.json', gl => {
      const root = gl.scene; const drop = []; root.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); }); drop.forEach(o => o.parent && o.parent.remove(o));
      root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(root), h = bb.max.y - bb.min.y;
      const clips = {}; (gl.animations || []).forEach(a => { clips[a.name.split('|').pop()] = a; });
      CH[file] = { root, clips, k: 1.8 / (h || 1.8), y0: -bb.min.y }; res(CH[file]);
    }, undefined, () => res(null))); }
    return CHW[file];
  }
  // armi: modelli presi dal soldato del kit, con la scala dell'osso a cui erano attaccate
  let GUNTPL = null;
  function boneScaleOf(C, name) { C.root.updateMatrixWorld(true); const b = C.root.getObjectByName(name); if (!b) return 1; const v = new THREE.Vector3(); b.getWorldScale(v); return v.x * C.k; }
  function prepGuns() {
    const S = CH.Soldier; if (!S || GUNTPL) return;
    const guns = {}; let parent = null; S.root.traverse(o => { if (/^(AK|Pistol|Shotgun|SMG|Knife_1|Revolver)$/.test(o.name)) { guns[o.name] = o; parent = o.parent; } });
    GUNTPL = { guns, boneScale: parent ? (() => { S.root.updateMatrixWorld(true); const v = new THREE.Vector3(); parent.getWorldScale(v); return v.x * S.k; })() : 1 };
  }
  function parallel(a, b, cb) { cb(a, b); for (let i = 0; i < a.children.length; i++) parallel(a.children[i], b.children[i], cb); }
  function cloneSkinned(src) {
    const sl = new Map(), cl = new Map(), c = src.clone(true);
    parallel(src, c, (a, b) => { sl.set(b, a); cl.set(a, b); });
    c.traverse(n => { if (!n.isSkinnedMesh) return; const s0 = sl.get(n); n.skeleton = s0.skeleton.clone(); n.bindMatrix.copy(s0.bindMatrix); n.skeleton.bones = s0.skeleton.bones.map(b => cl.get(b)); n.bind(n.skeleton, n.bindMatrix); });
    return c;
  }
  const charsReady = () => CH.Casual_2 && CH.Casual && CH.Casual_Hoodie && CH.Worker && CH.Formal;
  function pickFor(look, who) {
    if (look && look.model && CH[look.model]) return look.model;   // [vestiti] modello chiesto per nome (studio, prove)
    if (who === 'player') return 'Casual_Hoodie';
    // niente soldatini del Toon Shooter (stile diverso, teste enormi): la Guardia e la Tutela sono persone vere in divisa
    if (who === 'cop') return 'Casual_2';
    if (who === 'hazmat') return 'Worker';
    const fem = look && (look.hat === 'long' || look.hat === 'bun' || /fem|donna/.test(look.extra || ''));
    const h = ((look && (look.top || '') + (look.skin || '')) || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    if (fem) return h % 3 === 0 ? 'Formal' : 'Casual';
    if (/cap|flat|beanie/.test((look && look.hat) || '') && h % 2) return 'Worker';
    return h % 3 === 0 ? 'Casual_Hoodie' : 'Casual_2';
  }
  // una persona: gruppo con modello animato; userData compatibile col resto del renderer
  function person(look, who) {
    const file = pickFor(look, who), CM = CH[file]; if (!CM) return null;   // [personaggi] CM, non C: C è l'aiutante dei cilindri
    const g = new THREE.Group(), body = new THREE.Group(), m = cloneSkinned(CM.root);
    m.scale.setScalar(CM.k); m.position.y = CM.y0 * CM.k; body.add(m); g.add(body);
    const P = PAINT[file] || [];
    m.traverse(o => {
      if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const nm = ms.map(x => {
        const n = x.name; let col = null;
        if (look) { if (n === P[0] && look.top) col = look.top; else if (n === P[1] && look.bottom) col = look.bottom; else if (n === P[2] && look.hair) col = look.hair; else if (/^Skin/.test(n) && look.skin && file !== 'Soldier') col = look.skin; }
        if (who === 'cop') { if (n === P[0]) col = look && look.uniform || '#34405a'; else if (n === P[1]) col = '#232836'; else if (n === 'Red_Dark') col = '#141218'; else if (n === 'Hair') col = '#1a1410'; }
        if (who === 'hazmat') { if (n === 'Worker_Vest') col = '#c8d23a'; else if (n === 'Worker_Yellow') col = '#d8dcd0'; else if (n === 'LightBrown' || /^Brown/.test(n)) col = '#5a6050'; }
        if (!col) return x; const c2 = x.clone(); c2.color.set(col); return c2;
      });
      o.material = Array.isArray(o.material) ? nm : nm[0];
    });
    // armi del soldato: sono già nella mano, si accende solo quella giusta
    const guns = {}; m.traverse(o => { if (/^(AK|Pistol|Revolver|Revolver_Small|Shotgun|SMG|Sniper|Sniper_2|Knife_1|Knife_2|GrenadeLauncher|RocketLauncher|ShortCannon|Shovel)$/.test(o.name)) { guns[o.name] = o; o.visible = false; } });
    // i civili non hanno armi nel modello: si prendono quelle del kit (stesse ossa Quaternius) e si agganciano all'indice destro
    if (!Object.keys(guns).length && GUNTPL) { const bone = m.getObjectByName('Index1R'); if (bone) { const f = GUNTPL.boneScale / boneScaleOf(CM, 'Index1R'); for (const k in GUNTPL.guns) { const t = GUNTPL.guns[k], gn = t.clone(true); gn.position.copy(t.position).multiplyScalar(f); gn.quaternion.copy(t.quaternion); gn.scale.copy(t.scale).multiplyScalar(f); gn.visible = false; gn.traverse(o => { if (o.isMesh) o.castShadow = true; }); bone.add(gn); guns[k] = gn; } } }
    const mixer = new THREE.AnimationMixer(m), acts = {};
    for (const k in CM.clips) acts[k] = mixer.clipAction(CM.clips[k]);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(.42, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .02; g.add(sh);
    const dummy = () => new THREE.Object3D();
    g.userData = { model: file, mixer, acts, cur: null, body, armL: dummy(), armR: dummy(), legL: dummy(), legR: dummy(), shadowC: sh, guns: {}, mguns: guns, gunsByWeapon: { pistola: 'Pistol', mitra: 'SMG', lupara: 'Shotgun', fucile: 'AK', coltello: 'Knife_1', pala: 'Shovel' } };
    dressUp(g, m, look, who, file);
    // [inverno] i personaggi si staccano dallo sfondo: un po' di luce propria, dello stesso colore
    m.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => { if (x && x.emissive && x.color) x.emissive.copy(x.color).multiplyScalar(.3); }); });
    // [azioni] gli attrezzi in mano: piccoli oggetti agganciati al polso destro, accesi da animPerson({ held })
    g.userData.props = {};
    const wr = m.getObjectByName('WristR');
    if (wr) {
      g.updateMatrixWorld(true); const hp = new THREE.Vector3(); wr.getWorldPosition(hp);
      const mk = (k, obj) => { obj.visible = false; g.userData.props[k] = pin(g, wr, obj, hp.x, hp.y - .07, hp.z + .05); };
      mk('bomboletta', C(.035, .035, .17, '#c8302a', 0, 0, 0, 10)); mk('telefono', B(.05, .11, .025, '#151518')); mk('fotocamera', B(.13, .08, .06, '#202024'));
      mk('piede', B(.03, .55, .03, '#4a4a54')); mk('gesso', B(.02, .07, .02, '#f4f4ee'));
    }
    play(g, 'Idle'); return g;
  }
  // ---------------- CORREDO: cappelli, occhiali, baffi, zaini, borse, corporatura ----------------
  // Ogni persona si veste dal suo aspetto (look.hat, look.extra, look.build); chi non ne ha uno lo pesca a caso ma
  // sempre uguale (dal colore della maglia). Gli accessori sono agganciati alle ossa (testa, petto, mano) e le seguono.
  const H3 = (a) => { let h = 2166136261; for (const ch of a) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };
  const LM = {}; const lm = c => LM[c] || (LM[c] = new THREE.MeshLambertMaterial({ color: c }));
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  // aggancia un gruppo all'osso tenendolo fermo dov'è adesso nello spazio del personaggio (posa di riposo)
  function pin(g, bone, obj, x, y, z) {
    g.updateMatrixWorld(true); obj.position.set(x, y, z); obj.updateMatrixWorld(true);
    bone.getWorldQuaternion(_q); bone.getWorldScale(_v); const sc = _v.x;
    const p = new THREE.Vector3(x, y, z); bone.worldToLocal(p); obj.position.copy(p);
    g.getWorldQuaternion(_q2); obj.quaternion.copy(_q.invert().multiply(_q2)); obj.scale.setScalar(1 / sc); bone.add(obj);
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return obj;
  }
  const B = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const C = (rt, rb, h, c, x, y, z, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  function dressUp(g, m, look, who, file) {
    if (who === 'player') return;
    const r = H3((look && (look.top || '') + (look.skin || '') + (look.hair || '')) || String(Math.random()));
    const L = Object.assign({}, look || {});
    const fem = file === 'Casual' || file === 'Formal';
    // chi non ha un aspetto dato (comparse) riceve un corredo casuale ma stabile
    if (!look || L.hat === undefined) L.hat = fem ? ['none', 'none', 'scarf', 'sunhat'][Math.floor(r() * 4)] : ['none', 'none', 'flat', 'cap', 'fedora', 'beanie'][Math.floor(r() * 6)];
    if (!look || L.extra === undefined) L.extra = [r() < .25 ? 'shades' : '', !fem && r() < .3 ? 'moustache' : '', r() < .25 ? (fem ? 'bag' : 'paper') : '', r() < .15 ? 'backpack' : ''].join(',');
    if (who === 'cop') { L.hat = 'police'; L.extra = 'belt'; }
    // corporatura: più alti, più bassi, più robusti
    const build = L.build || (.92 + r() * .2), hgt = .94 + r() * .1;
    g.userData.body.scale.set(.9 + (build - 1) * .6 + .1, hgt, .9 + (build - 1) * .6 + .1);
    // la testa del modello è alta ~1,56 m (base del cranio); gli accessori stanno in metri nello spazio del personaggio
    const head = m.getObjectByName('Head'), chest = m.getObjectByName('Chest') || m.getObjectByName('Torso'), hand = m.getObjectByName('WristR'), handL = m.getObjectByName('WristL');
    if (!head) return;
    g.updateMatrixWorld(true); const hp = new THREE.Vector3(); head.getWorldPosition(hp);
    const top = hp.y + .23, fz = hp.z, hc = L.hatCol || ['#3a3a44', '#2a2420', '#8a1f1f', '#1f4a6a', '#5a4a3a', '#e8e2d4'][Math.floor(r() * 6)];
    const hat = new THREE.Group();
    switch (L.hat) {
      case 'cap': hat.add(C(.13, .135, .09, hc, 0, 0, 0), B(.17, .02, .12, hc, 0, -.035, .12)); break;
      case 'capback': hat.add(C(.13, .135, .09, hc, 0, 0, 0), B(.17, .02, .12, hc, 0, -.035, -.12)); break;
      case 'flat': hat.add(C(.145, .14, .05, hc, 0, -.01, .02, 14), B(.16, .02, .07, hc, 0, -.03, .13)); break;
      case 'fedora': hat.add(C(.11, .125, .12, hc, 0, .02, 0, 14), C(.22, .22, .015, hc, 0, -.04, 0, 16), C(.126, .126, .025, '#1a1418', 0, -.02, 0, 14)); break;
      case 'beanie': hat.add(C(.12, .14, .13, hc, 0, 0, -.01, 12)); break;
      case 'police': hat.add(C(.15, .135, .09, '#232a3e', 0, .01, 0, 14), C(.138, .138, .025, '#d8d0b0', 0, -.03, 0, 14), B(.17, .015, .1, '#111', 0, -.045, .12)); break;
      case 'scarf': hat.add(C(.135, .145, .13, hc, 0, -.03, -.01, 12)); break;
      case 'sunhat': hat.add(C(.12, .13, .09, '#e8d8b0', 0, 0, 0, 14), C(.25, .25, .015, '#e8d8b0', 0, -.04, 0, 16), C(.131, .131, .03, hc, 0, -.025, 0, 14)); break;
      case 'hard': hat.add(C(.13, .145, .1, '#f2c14e', 0, 0, 0, 12), C(.17, .17, .015, '#f2c14e', 0, -.045, .02, 14)); break;
    }
    if (hat.children.length) pin(g, head, hat, hp.x, top - .02, fz);
    const ex = (L.extra || '').split(',');
    if (ex.includes('shades') || ex.includes('glasses')) { const gl = new THREE.Group(); const c = ex.includes('shades') ? '#08080c' : '#2a2a2a'; gl.add(B(.075, .04, .015, c, -.045, 0, 0), B(.075, .04, .015, c, .045, 0, 0), B(.19, .012, .012, c, 0, .015, 0)); pin(g, head, gl, hp.x, hp.y + .085, fz + .125); }
    if (ex.includes('moustache')) pin(g, head, B(.09, .022, .02, L.hair || '#2a1a12'), hp.x, hp.y + .005, fz + .135);
    if (chest) {
      const cp = new THREE.Vector3(); chest.getWorldPosition(cp);
      if (ex.includes('backpack')) { const bp = new THREE.Group(); bp.add(B(.3, .36, .14, ['#2f5a6a', '#8a3a2a', '#3a4a2a', '#c8862a'][Math.floor(r() * 4)]), B(.24, .1, .03, '#1a1a1a', 0, .08, -.08)); pin(g, chest, bp, cp.x, cp.y + .05, cp.z - .2); }
      if (ex.includes('apron')) pin(g, chest, B(.3, .5, .02, '#f4f1ea'), cp.x, cp.y - .25, cp.z + .13);
      if (ex.includes('collar')) pin(g, chest, B(.06, .04, .02, '#f4f4f4'), cp.x, cp.y + .2, cp.z + .12);
      if (ex.includes('gold')) pin(g, chest, B(.1, .015, .015, '#e8c040'), cp.x, cp.y + .15, cp.z + .13);
      if (ex.includes('belt')) pin(g, chest, B(.36, .05, .26, '#e8e8e8'), cp.x, cp.y - .38, cp.z);
      if (ex.includes('shawl')) pin(g, chest, B(.42, .16, .28, '#8a6aa0'), cp.x, cp.y + .14, cp.z);
    }
    if (handL && (ex.includes('bag') || ex.includes('paper'))) { const hp2 = new THREE.Vector3(); handL.getWorldPosition(hp2); const bag = ex.includes('bag') ? B(.22, .26, .1, ['#c43c52', '#e8d8b0', '#2a3b66', '#f4f1ea'][Math.floor(r() * 4)]) : B(.04, .3, .2, '#e8e2d0'); pin(g, handL, bag, hp2.x, hp2.y - .18, hp2.z); g.userData.carryBag = bag; }
  }
  function play(g, name, once) {
    const u = g.userData, a = u.acts[name] || u.acts.Idle; if (!a || u.cur === a) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = !!once; a.play();
    if (u.cur) u.cur.crossFadeTo(a, .18, false); u.cur = a;
  }
  // stato → animazione
  function animPerson(g, o, dt) {
    const u = g.userData, sp = Math.abs(o.speed || 0);
    const gunName = (o.weapon && u.gunsByWeapon[o.weapon]) || (o.held && u.gunsByWeapon[o.held]);
    for (const k in (u.props || {})) u.props[k].visible = o.held === k;   // [azioni]
    for (const k in u.mguns) u.mguns[k].visible = !!(k === gunName || (o.gun && k === o.gun));
    let clip = 'Idle';
    if (o.down) clip = 'Death';
    else if (o.punch > 0) clip = u.acts.Punch ? 'Punch' : 'Punch_Right';
    else if (o.hit > .5) clip = u.acts.HitReact ? 'HitReact' : 'HitRecieve';
    else if (sp > 4.5) clip = o.weapon ? (u.acts.Run_Gun ? 'Run_Gun' : 'Run_Shoot') : 'Run';
    else if (sp > .25) clip = o.weapon && u.acts.Walk_Shoot ? 'Walk_Shoot' : 'Walk';
    else if (o.handsUp) clip = u.acts.Wave ? 'Wave' : 'Idle';
    else if (o.weapon) clip = u.acts.Idle_Shoot ? 'Idle_Shoot' : u.acts.Idle_Gun ? 'Idle_Gun' : 'Idle';
    else if (o.idle && u.acts[o.idle]) clip = o.idle;
    // [animazioni] una posa di tutto il corpo può chiedere la sua clip di base (es. Idle per sedersi)
    const wb = window.Anim && Anim.want(g, o); if (wb && !o.down && !(o.punch > 0) && !(o.hit > .5) && u.acts[wb]) clip = wb;
    play(g, clip, clip === 'Death');
    if (u.cur && (clip === 'Walk' || clip === 'Run' || clip === 'Walk_Shoot' || clip === 'Run_Gun' || clip === 'Run_Shoot')) u.cur.timeScale = clip.startsWith('Walk') ? Math.max(.5, sp / 1.6) : Math.max(.6, sp / 5);
    else if (u.cur) u.cur.timeScale = 1;
    if (window.Anim) Anim.restore(g);   // [animazioni]
    u.mixer.update(dt);
    if (window.Anim) Anim.apply(g, o, dt, performance.now() / 1000);   // [animazioni] lo strato procedurale sopra la clip
  }
  // ---------------- IL MONDO ----------------
  function tileFree(x, z) { const T = G.T, v = G.tileAt(Math.floor(x / G.TS), Math.floor(z / G.TS)); return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE; }
  // un posto libero (niente edifici, acqua, alberi) di w×d metri vicino a (x,z)
  function openSpot(x, z, w, d, maxR) {
    for (let r = 0; r <= (maxR || 40); r += 2) for (let a = 0; a < 16; a++) {
      const px = x + Math.cos(a / 16 * 6.283) * r, pz = z + Math.sin(a / 16 * 6.283) * r; let ok = true;
      for (let dx = -w / 2; dx <= w / 2 && ok; dx += 2) for (let dz = -d / 2; dz <= d / 2 && ok; dz += 2) { const v = G.tileAt(Math.floor((px + dx) / G.TS), Math.floor((pz + dz) / G.TS)); if (v === G.T.BLD || v === G.T.WATER || v === G.T.TREE || v === G.T.VIA || v === G.T.FOUNT) ok = false; }
      if (ok) return [px, pz];
      if (!r) break;
    }
    return null;
  }
  const dyn = { guards: [], heli: null, wheel: null, fires: [], boats: [] };
  async function dress() {
    const P = G.PLACES, all = Object.keys(CAT).filter(k => !['rx7', 'gtr', 'bursley'].includes(k));
    await Promise.all(all.map(load));
    // ---- porto: barche ai pontili, una nave fuori dai moli, container e merce in banchina ----
    const B = [['pesca', 201.6, 384, 0], ['pesca', 201.6, 393, .05], ['motoscafo', 216.6, 386, 0], ['vela', 223.6, 392, Math.PI], ['rimorchiatore', 238.2, 385, 0], ['motoscafo2', 245.8, 391, Math.PI],
      ['barchino', 205, 380, 1.4], ['barchino', 236, 380, 1.7], ['vela2', 210, 404, .4], ['motoscafo', 232, 406, -.5]];
    B.forEach(([id, x, z, ry]) => { const o = put(id, x, z, ry, -.35); if (o) dyn.boats.push({ o, ph: x * .37 + z }); });
    const ship = put('cargo', 220, 440, Math.PI / 2, -.5); if (ship) dyn.boats.push({ o: ship, ph: 1, slow: true });
    // container: sul molo est, verso il magazzino
    const quay = []; for (let x = 252; x < 290; x += 2) for (let z = 366; z < 384; z += 2) { const v = G.tileAt(x >> 1, z >> 1); if (v === G.T.QUAY) quay.push([x, z]); }
    // piazzale dei container: file ordinate decise dal motore (Game.layout), impilati a scacchiera
    if (G.layout) G.layout().items.filter(it => it.kind === 'container').forEach(it => {
      const id = ['containerA', 'containerB', 'containerC'][it.col]; put(id, it.x, it.y, it.rot);
      if (it.up) { const gh = R.groundH ? R.groundH(it.x, it.y) : .4, h = LIB[id] ? LIB[id].size.y : 2.6; const o = put(['containerB', 'containerC', 'containerA'][it.col], it.x, it.y, it.rot); if (o) o.position.y = gh + h; }
    });
    // ---- luna park sulla spiaggia del Lido ----
    if (P.spiaggia) { const q = openSpot(P.spiaggia.x, P.spiaggia.y + 14, 10, 4, 70); if (q) dyn.wheel = put('ruota', q[0], q[1], Math.PI / 2); }
    // ---- la Rocca: elicottero sullo spiazzo, forca, sbarramenti sulla strada ----
    if (P.rocca) {
      const rx = P.rocca.x, rz = P.rocca.y;
      put('elicottero', rx - 14, rz + 4, .6); put('forca', rx + 12, rz + 2, Math.PI / 2);
      for (let i = -2; i <= 2; i++) put('newjersey', rx + i * 2.8, rz + 16, 0);
      put('transenna', rx - 9, rz + 12, 0); put('transenna', rx + 9, rz + 12, 0); put('sacchi', rx - 5, rz + 9, 0); put('sacchi', rx + 5, rz + 9, 0);
    }
    // l'elicottero di pattuglia: gira sull'isola di notte col faro
    dyn.heli = make('elicottero'); if (dyn.heli) { scene.add(dyn.heli); dyn.heli.visible = false; }
    // ---- caserma della Guardia in città: barriere ----
    if (P.commissariato) { const c = P.commissariato; for (let i = -1; i <= 1; i++) if (tileFree(c.x + i * 2.8, c.y + 2.5)) put('newjersey', c.x + i * 2.8, c.y + 2.5, 0); }
    // ---- poligono: carri, trincee, baracche, torretta, cisterna, barili ----
    if (P.poligono) {
      const x = P.poligono.x, z = P.poligono.y;
      put('carro', x - 8, z - 6, .4); put('carro', x + 6, z - 9, -.3); put('baracca', x - 14, z + 8, 0); put('torretta', x + 14, z + 8, 0); put('cisterna', x + 2, z + 12, 0);
      put('sacchi', x - 2, z - 2, 0); put('sacchi2', x + 2, z - 2, .2); put('barriera', x - 18, z - 4, Math.PI / 2);
    }
    // ---- discarica ----
    if (P.discarica) { const x = P.discarica.x, z = P.discarica.y; put('rottame', x - 3, z + 2, .7); put('rottame', x + 4, z - 3, 2.2); put('gomme', x + 1, z + 4, 0); put('macerie', x - 5, z - 3, 0); put('divano', x - 1, z - 5, 1.1); put('cassonetto2', x + 7, z + 5, .3); }
    // ---- accampamenti: radura del pastore, ovile, caletta ----
    [['radura', 1], ['ovile', 0], ['caletta', 1]].forEach(([id, tent]) => {
      const q0 = P[id]; if (!q0) return; const sp = openSpot(q0.x + 4, q0.y + 4, 8, 8, 30); if (!sp) return; const x = sp[0], z = sp[1];
      if (tent) put('tenda', x + 3, z - 2, .8); const f = put('falo', x, z, 0); put('tronco', x - 2, z + 1.5, .3); put('tronco', x + 1.8, z + 1.6, -.6);
      if (f) dyn.fires.push({ x, z, o: f });
    });
    if (P.caletta) put('gommone', P.caletta.x + 6, P.caletta.y + 4, 1.2);
    // ---- città: cassonetti nei vicoli, coni al cantiere, scatole davanti agli alimentari ----
    let n = 0;
    for (let tz = 150; tz < 205 && n < 18; tz += 3) for (let tx = 50; tx < 175 && n < 18; tx += 5) {
      const v = G.tileAt(tx, tz); if (v !== G.T.WALK) continue;
      let wall = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.tileAt(tx + dx, tz + dy) === G.T.BLD) wall = true;
      if (!wall || ((tx * 7 + tz * 13) % 5)) continue;
      put(n % 3 ? 'cassonetto' : 'scatole', tx * 2 + 1, tz * 2 + 1, ((tx + tz) % 4) * Math.PI / 2); n++;
    }
    if (P.cantiere) for (let i = 0; i < 5; i++) put('cono', P.cantiere.x - 4 + i * 1.6, P.cantiere.y + 2.5, 0);
    if (P.wu) { put('scatole', P.wu.x + 1.5, P.wu.y + .5, .3); put('cassa', P.wu.x - 1.5, P.wu.y + .6, 0); }
    if (P.cava) { put('contCorto', P.cava.x + 6, P.cava.y + 4, .5); }
    // guardie della Tutela ai posti di blocco: sentinelle armate, ferme
    await Promise.all(['Soldier', 'Casual_2', 'Worker'].map(loadChar)); prepGuns();
    const guard = (x, z, ry, gun, who) => { const g = person(null, who || 'cop'); if (!g) return; g.position.set(x, (R.groundH ? R.groundH(x, z) : .4), z); g.rotation.y = ry; scene.add(g); dyn.guards.push({ g, gun }); };
    if (P.rocca) { const rx = P.rocca.x, rz = P.rocca.y; guard(rx - 3, rz + 13, 0, 'AK'); guard(rx + 3, rz + 13, 0, 'AK'); guard(rx - 12, rz + 6, .8, 'SMG'); guard(rx + 10, rz + 4, -.6, 'AK', 'hazmat'); }
    if (P.poligono) { const x = P.poligono.x, z = P.poligono.y; guard(x - 1, z - 4, 0, 'AK'); guard(x + 3, z - 4, .3, 'AK'); guard(x - 10, z - 4, .5, 'AK'); guard(x + 12, z + 6, -.8, 'SMG', 'hazmat'); }
    if (P.commissariato) { const c = P.commissariato; guard(c.x - 3, c.y + 4.5, 0, 'SMG'); guard(c.x + 3, c.y + 4.5, 0, 'AK'); }
    if (P.caserma_p) guard(P.caserma_p.x, P.caserma_p.y + 3, 0, 'AK');
    ['Casual', 'Casual_2', 'Casual_Hoodie', 'Formal', 'Worker'].forEach(loadChar);
    // auto anni '70-'80: si caricano dopo, i veicoli si rifanno da soli
    ['rx7', 'gtr', 'bursley'].forEach(load);
    ready = true;
  }
  let ready = false;
  // ---------------- OGNI FOTOGRAMMA ----------------
  function tick(st, time, night) {
    if (!ready) return;
    const gdt = Math.min(.1, Math.max(0, time - (dyn.lastT || time))); dyn.lastT = time;
    // fusti e bombole del motore (st.hazards): spariscono quando saltano, tremano con la miccia accesa
    if (st.hazards) {
      dyn.hz = dyn.hz || {};
      st.hazards.forEach(h => {
        let o = dyn.hz[h.id];
        if (!o) { o = make(h.kind); if (!o) return; o.position.set(h.x, R.groundH ? R.groundH(h.x, h.y) : .4, h.y); o.rotation.y = (h.x * 7.3 + h.y) % 6.28; scene.add(o); dyn.hz[h.id] = o; }
        o.visible = !h.gone;
        if (h.fuse > 0) { const k = 1 + Math.sin(time * 40) * .04; o.scale.set(k, 1 / k, k); } else o.scale.set(1, 1, 1);
      });
    }
    dyn.guards.forEach(q => animPerson(q.g, { speed: 0, gun: q.gun, weapon: 'guardia' }, gdt));
    dyn.boats.forEach(b => { b.o.position.y = -.35 + Math.sin(time * (b.slow ? .5 : 1.2) + b.ph) * (b.slow ? .08 : .12); b.o.rotation.z = Math.sin(time * .9 + b.ph) * (b.slow ? .01 : .04); b.o.rotation.x = Math.sin(time * .67 + b.ph * 1.9) * (b.slow ? .006 : .025); });   // [animazioni-mondo] anche il beccheggio
    // elicottero: di notte gira sull'isola, più basso e più vicino quando c'è allarme
    if (dyn.heli) {
      const alarm = (st.ris && st.ris.repr > 40) || (G.wantedLevel ? G.wantedLevel(st) >= 2 : false);
      const on = night > .35 || alarm; dyn.heli.visible = on;
      if (on) {
        let cx = G.GW * G.TS / 2, cz = G.GH * G.TS / 2, rr = 120, a = time * .07;
        if (alarm && st.player) { cx = st.player.x; cz = st.player.y; rr = 30; a = time * .25; }
        const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; dyn.heli.position.set(x, alarm ? 26 : 38, z); dyn.heli.rotation.y = -a; dyn.heli.rotation.z = .12;
        if (!dyn.beam) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#e8f0ff', transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
          cone.position.y = -20; dyn.beam = new THREE.Group(); dyn.beam.add(cone); scene.add(dyn.beam);
          const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 20), new THREE.MeshBasicMaterial({ color: '#e8f0ff', transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); pool.rotation.x = -Math.PI / 2; scene.add(pool); dyn.pool = pool;
        }
        // il faro sweeps sotto l'elicottero, sul giocatore quando c'è allarme
        const tx = alarm && st.player ? st.player.x : x + Math.cos(time * .6) * 12, tz = alarm && st.player ? st.player.y : z + Math.sin(time * .6) * 12;
        dyn.beam.position.set((x + tx) / 2, (dyn.heli.position.y) / 2, (z + tz) / 2);
        dyn.beam.lookAt(x, dyn.heli.position.y, z); dyn.beam.rotateX(Math.PI / 2);
        dyn.beam.children[0].scale.set(1, Math.hypot(x - tx, dyn.heli.position.y, z - tz) / 40, 1);
        dyn.pool.position.set(tx, .45, tz);
      }
      if (dyn.beam) { dyn.beam.visible = on; dyn.pool.visible = on; }
    }
    // ruota panoramica: gira piano
    if (dyn.wheel) { /* il modello è un pezzo unico: la ruota resta ferma, si accende la notte */ }
  }
  function attach(api) {
    R = api; scene = api.scene; G = api.G;
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return;
    dress().catch(e => console.warn('Models:', e));
  }
  return { prepGuns, person, animPerson, charsReady, loadChar, furniture, placed, CAT, LIB, load, has, make, vehicle, attach, tick, setBase: b => { base = b; } };
})();
