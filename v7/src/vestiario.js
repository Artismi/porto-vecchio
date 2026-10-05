/* Porto Vecchio — I vestiti che si vedono: ogni capo del Guardaroba diventa un guscio ricavato dal corpo del personaggio
   (i triangoli delle ossa che copre: busto, braccia, bacino, cosce…), un po' più largo a ogni strato, legato allo stesso scheletro.
   Così l'ordine si vede davvero: le mutande sopra i pantaloni stanno sopra, il cappotto lungo spunta sotto la giacca corta.
   Cappelli, caschi, sciarpe, paraspalle, ginocchiere e zaino sono pezzi agganciati alle ossa.
   Avvolge Models.person: Nino si veste con quello che ha addosso (anche in strada), gli abitanti secondo chi sono (Guardaroba.outfitOf). */
var Vesti3D = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  // i nomi delle ossa arrivano senza punti (three toglie '.': Shoulder.L → ShoulderL)
  const PARTI = { torso: /^(Chest|Torso|Abdomen|Shoulder[LR])$/, braccia: /^UpperArm[LR]$/, avambracci: /^LowerArm[LR]$/, bacino: /^Hips$/, cosce: /^UpperLeg[LR]$/, polpacci: /^LowerLeg[LR]$/,
    piedi: /^(Foot[LR]|PT[LR])$/, mani: /^(Wrist[LR]|Index\d[LR]|Middle\d[LR]|Ring\d[LR]|Pinky\d[LR]|Thumb\d[LR])$/, collo: /^Neck$/ };
  const KEEP = /Skin|Eye|Hair|Moustache|Brow/i;   // i materiali del corpo che restano (pelle, occhi, capelli)
  const players = new Set();
  const AN = new Map();   // analisi della geometria, per uuid
  const GC = ['getX', 'getY', 'getZ', 'getW'], comp = (a, i, k) => a[GC[k]](i);   // three r149: niente getComponent

  // ---------------- ANALISI DI UNA MESH: per ogni vertice la parte del corpo, e la normale liscia ----------------
  function analyze(mesh) {
    const geo = mesh.geometry; if (AN.has(geo.uuid)) return AN.get(geo.uuid);
    const pos = geo.attributes.position, nor = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; if (!pos || !si || !sw) return null;
    const n = pos.count, part = new Array(n), bones = mesh.skeleton.bones, legs = /Legs/i.test(mesh.name);
    const names = Object.keys(PARTI);
    for (let i = 0; i < n; i++) {
      let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = comp(sw, i, k); if (w > bw) { bw = w; best = comp(si, i, k); } }
      const bn = bones[best] ? bones[best].name : ''; let pt = names.find(p => PARTI[p].test(bn)) || null;
      if (bn === 'Body' || (legs && pt === 'torso')) pt = legs ? 'bacino' : 'torso';   // la vita: nella mesh delle gambe è bacino, nel busto è torso
      part[i] = pt;
    }
    // normali lisce: la media delle normali nello stesso punto (il modello è a facce piatte, sennò il guscio si apre)
    const key = i => `${Math.round(pos.getX(i) * 1e3)},${Math.round(pos.getY(i) * 1e3)},${Math.round(pos.getZ(i) * 1e3)}`, acc = new Map(), sm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); if (nor) { a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); } }
    for (let i = 0; i < n; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; sm[i * 3] = a[0] / l; sm[i * 3 + 1] = a[1] / l; sm[i * 3 + 2] = a[2] / l; }
    const idx = geo.index ? geo.index.array : Array.from({ length: n }, (_, i) => i);
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = comp(pos, i, k); if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const A = { part, sm, idx, pos, si, sw, lo, hi, ymin: lo[1], ymax: hi[1] }; AN.set(geo.uuid, A); return A;
  }

  // ---------------- I GUSCI ----------------
  const tmpC = new THREE.Color();
  const pat = (g, c, cx, cy, cz, out) => {   // motivi per triangolo: righe, quadri
    tmpC.set(c);
    if (g.id === 'maglietta_righe' && Math.floor(cy * 9) % 2) tmpC.set('#ece8dc');
    if (g.id === 'camicia_quadri' && (Math.floor(cy * 7) + Math.floor((cx + cz) * 7)) % 2) tmpC.multiplyScalar(.6);
    if (g.id === 'velluto' && Math.floor((cx + cz) * 24) % 2) tmpC.multiplyScalar(.85);
    out[0] = tmpC.r; out[1] = tmpC.g; out[2] = tmpC.b;
  };
  function shells(g, outfit, unit) {
    const meshes = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) meshes.push(o); });
    const out = [];
    meshes.forEach(src => {
      const A = analyze(src); if (!A) return;
      const P = [], N = [], SI = [], SW = [], CO = [], th = {}, col = [0, 0, 0];
      // spessore di ogni capo: cresce con gli strati sotto, nelle parti che copre
      const L = outfit.filter(c => c.parti && c.parti.length).map(c => { const set = new Set(c.parti); let base = 0; c.parti.forEach(p => { base = Math.max(base, th[p] || 0); }); const t = base + .0025 + c.sp * .32; c.parti.forEach(p => { th[p] = t; }); return { c, set, off: t / unit }; });
      // ogni triangolo prende solo il capo più esterno che lo copre: niente strati che bucano quelli sopra
      for (let t = 0; t < A.idx.length; t += 3) {
        const a = A.idx[t], b = A.idx[t + 1], d = A.idx[t + 2];
        let G0 = null; for (let k = L.length - 1; k >= 0; k--) { const S0 = L[k].set; if ((S0.has(A.part[a]) + S0.has(A.part[b]) + S0.has(A.part[d])) >= 2) { G0 = L[k]; break; } }
        if (!G0) continue; const c = G0.c;
        const cx = (A.pos.getX(a) + A.pos.getX(b) + A.pos.getX(d)) / 3, cy = ((A.pos.getY(a) + A.pos.getY(b) + A.pos.getY(d)) / 3 - A.ymin) / ((A.ymax - A.ymin) || 1), cz = (A.pos.getZ(a) + A.pos.getZ(b) + A.pos.getZ(d)) / 3;
        pat(c, c.col, cx * unit, cy, cz * unit, col);
        const lift = c.id === 'gonna' ? 2.2 : c.id === 'cappotto' || c.id === 'impermeabile' ? 1.3 : 1;
        for (const v of [a, b, d]) {
          const k = (A.part[v] === 'cosce' || A.part[v] === 'bacino') ? G0.off * lift : G0.off;
          P.push(A.pos.getX(v) + A.sm[v * 3] * k, A.pos.getY(v) + A.sm[v * 3 + 1] * k, A.pos.getZ(v) + A.sm[v * 3 + 2] * k);
          N.push(A.sm[v * 3], A.sm[v * 3 + 1], A.sm[v * 3 + 2]);
          for (let q = 0; q < 4; q++) { SI.push(comp(A.si, v, q)); SW.push(comp(A.sw, v, q)); }
          CO.push(col[0], col[1], col[2]);
        }
      }
      if (!P.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); geo.setAttribute('color', new THREE.Float32BufferAttribute(CO, 3));
      geo.computeVertexNormals();
      const m = new THREE.SkinnedMesh(geo, MAT()); m.userData.vesti = true; m.castShadow = true; m.frustumCulled = false;
      m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale);
      src.parent.add(m); m.bind(src.skeleton, src.bindMatrix); out.push(m);
    });
    return out;
  }
  let _mat = null; const MAT = () => _mat || (_mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#181614') }));

  // ---------------- I PEZZI AGGANCIATI ----------------
  const sh = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const LM = {}; const lm = c => LM[c] || (LM[c] = new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.25) }));
  const Bx = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const Cy = (rt, rb, h, c, x, y, z, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const Sp = (r, c, x, y, z, half) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  function pin(g, bone, obj, x, y, z) {
    g.updateMatrixWorld(true); bone.getWorldQuaternion(_q); bone.getWorldScale(_v); const sc = _v.x;
    const p = new THREE.Vector3(x, y, z); g.localToWorld(p); bone.worldToLocal(p); obj.position.copy(p);
    g.getWorldQuaternion(_q2); obj.quaternion.copy(_q.invert().multiply(_q2)); obj.scale.setScalar(1 / sc * (obj.userData.k || 1)); bone.add(obj);
    obj.userData.vesti = true; obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return obj;
  }
  const wpos = (g, b) => { g.updateMatrixWorld(true); const v = new THREE.Vector3(); b.getWorldPosition(v); return g.worldToLocal(v); };
  function headAcc(kind, c, k) {
    const h = new THREE.Group(), s = 1 + k * .09;
    switch (kind) {
      case 'beanie': h.add(Cy(.128, .14, .08, c, 0, -.01, -.01), Sp(.128, c, 0, .03, -.01, true), Cy(.142, .142, .03, sh(c, .8), 0, -.04, -.01)); break;
      case 'flat': h.add(Cy(.145, .14, .05, c, 0, 0, .01, 14), Bx(.17, .02, .08, c, 0, -.02, .13)); break;
      case 'fedora': h.add(Cy(.11, .125, .13, c, 0, .04, 0, 14), Cy(.23, .23, .015, c, 0, -.02, 0, 18), Cy(.127, .127, .028, '#1a1418', 0, 0, 0, 14)); break;
      case 'scarf': h.add(Sp(.15, c, 0, -.02, -.01, true), Bx(.2, .16, .04, c, 0, -.12, -.1)); break;
      case 'ushanka': h.add(Cy(.15, .155, .14, c, 0, .03, 0, 14), Bx(.06, .16, .14, c, -.15, -.07, 0), Bx(.06, .16, .14, c, .15, -.07, 0), Bx(.24, .07, .03, c, 0, .04, .15)); break;
      case 'casco': h.add(Sp(.175, c, 0, -.04, 0), Bx(.24, .1, .03, '#1a1a22', 0, -.06, .16)); h.children[0].scale.set(1, 1.05, 1.08); break;
      case 'elmetto': h.add(Sp(.16, c, 0, -.02, 0, true), Cy(.2, .2, .02, c, 0, -.02, 0, 16)); break;
      case 'passamontagna': h.add(Sp(.15, c, 0, -.06, 0), Bx(.17, .04, .03, '#d8b090', 0, -.08, .135)); h.children[0].scale.set(1, 1.25, 1.05); break;
      case 'antigas': h.add(Bx(.2, .16, .08, c, 0, -.12, .12), Cy(.05, .06, .09, '#202420', 0, -.18, .2, 10), Cy(.035, .035, .02, '#8ab0b0', -.05, -.07, .165, 10), Cy(.035, .035, .02, '#8ab0b0', .05, -.07, .165, 10)); h.children[1].rotation.x = Math.PI / 2; h.children[2].rotation.x = Math.PI / 2; h.children[3].rotation.x = Math.PI / 2; break;
    }
    h.scale.setScalar(s); return h;
  }
  function accessories(g, outfit, held) {
    const m = g.children.find(o => o.userData && o.userData.body) || g; const root = g;
    const bone = n => { let b = null; root.traverse(o => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
    const head = bone('Head'), neck = bone('Neck'), chest = bone('Chest'), shL = bone('UpperArmL'), shR = bone('UpperArmR'), knL = bone('LowerLegL'), knR = bone('LowerLegR'), wL = bone('WristL');
    let kh = 0;
    outfit.forEach(c => {
      if (!c.acc) return;
      if (/beanie|flat|fedora|scarf|ushanka|casco|elmetto|passamontagna|antigas/.test(c.acc) && head) { const hp = wpos(g, head); pin(g, head, headAcc(c.acc, c.col, kh++), hp.x, hp.y + .19, hp.z + .01); }
      if (c.acc === 'sciarpa' && (neck || chest)) { const b = neck || chest, p = wpos(g, b), s = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(.1, .045, 8, 14), lm(c.col)); t.rotation.x = Math.PI / 2; s.add(t, Bx(.08, .26, .03, c.col, .05, -.14, .1)); pin(g, b, s, p.x, p.y + (neck ? .02 : .22), p.z); }
      if (c.acc === 'paraspalle') [shL, shR].forEach((b, i) => { if (!b) return; const p = wpos(g, b), s = new THREE.Group(); const sp = Sp(.1, c.col, 0, 0, 0, true); sp.scale.set(1.1, .7, 1.1); s.add(sp); pin(g, b, s, p.x + (i ? -.03 : .03) * 0, p.y + .03, p.z); });
      if (c.acc === 'paraginocchia') [knL, knR].forEach(b => { if (!b) return; const p = wpos(g, b); pin(g, b, Bx(.11, .13, .05, c.col), p.x, p.y + .02, p.z + .08); });
      if (c.acc === 'zaino' && chest) { const p = wpos(g, chest), s = new THREE.Group(); s.add(Bx(.32, .4, .16, c.col), Bx(.26, .12, .05, '#2a2a22', 0, -.08, -.1), Bx(.3, .08, .17, '#3a3a2e', 0, .18, 0)); pin(g, chest, s, p.x, p.y - .05, p.z - .2); }
    });
    // nella sinistra
    if (held && wL) { const p = wpos(g, wL), s = new THREE.Group(); const C0 = typeof Oggetti !== 'undefined' && Oggetti.CAT[held]; const big = C0 && C0.peso > 1;
      if (/torcia/.test(held)) { s.add(Cy(.025, .03, .2, '#2a2a2e')); s.add(Cy(.032, .032, .03, '#f0e8a0', 0, .1, 0)); s.children.forEach(o => { o.rotation.x = Math.PI / 2; }); }
      else if (C0 && /bevande/.test(C0.cat)) s.add(Cy(.03, .03, .2, '#3a6a3a'));
      else s.add(Bx(big ? .12 : .08, big ? .14 : .08, big ? .1 : .05, '#' + ((Math.abs([...held].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) % 0xaaaaaa) + 0x333333).toString(16).slice(0, 6)));
      pin(g, wL, s, p.x, p.y - .08, p.z + .05); }
  }

  // ---------------- VESTIRE UNA PERSONA ----------------
  function strip(g) { const rm = []; g.traverse(o => { if (o.userData && o.userData.vesti) rm.push(o); }); rm.forEach(o => { if (o.parent) o.parent.remove(o); if (o.geometry && o.isSkinnedMesh) o.geometry.dispose(); }); }
  function bare(g, look) {
    // i vestiti del modello diventano pelle: da qui in su si veste coi gusci
    const skin = (look && look.skin) || '#dcae88';
    g.traverse(o => {
      if (!o.isSkinnedMesh || o.userData.vesti || o.userData.bared) return; o.userData.bared = true;
      const head = /Head/i.test(o.name);
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const nm = ms.map(x => { if (KEEP.test(x.name) || (head && !/^(White|Grey|Black|Purple|LightBlue|Orange|Brown2|LimeGreen|Worker_Vest|Red_Dark|LightBrown)$/.test(x.name))) return x; const c = x.clone(); c.color.set(skin); if (c.emissive) c.emissive.set(skin).multiplyScalar(.3); return c; });
      o.material = Array.isArray(o.material) ? nm : nm[0];
    });
  }
  function dress(g, outfit, look, held) {
    strip(g); bare(g, look);
    // unità: quanti metri vale un'unità della geometria (il personaggio è alto 1,8 m)
    let unit = g.userData.vUnit;
    if (!unit) { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; g.traverse(o => { if (!o.isSkinnedMesh || o.userData.vesti) return; const A = analyze(o); if (A) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], A.lo[k]); hi[k] = Math.max(hi[k], A.hi[k]); } });
      const R = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); unit = g.userData.vUnit = R > 0 && R < 1e8 ? 1.75 / R : .01; }
    try { shells(g, outfit, unit); } catch (e) { console.error('[Vesti3D] gusci', e); }
    try { accessories(g, outfit, held); } catch (e) { console.error('[Vesti3D] pezzi', e); }
  }
  const npcByLook = new WeakMap(); let npcSt = null;
  function npcOf(look) {
    const st = ST(); if (!st || !look) return null;
    if (npcSt !== st) { npcSt = st; st.npcs.forEach(n => { if (n.look) npcByLook.set(n.look, n); }); }
    let n = npcByLook.get(look); if (!n) { n = st.npcs.find(k => k.look === look); if (n) npcByLook.set(look, n); }
    return n;
  }
  const wsig = st => { const p = st.player, W = p.worn || {}; return JSON.stringify([Guardaroba.ZORD.map(z => W[z]), W.sx]); };
  function hook() {
    if (!window.Models || !Models.person || Models.person.__vesti || typeof Guardaroba === 'undefined') return false;
    const p0 = Models.person;
    Models.person = function (look, who) {
      const g = p0.apply(this, arguments); if (!g) return g;
      try {
        const st = ST(), fem = /^(Casual|Formal)$/.test(g.userData.model || '');
        if (who === 'player' && st) { Guardaroba.worn(st); dress(g, Guardaroba.outfitOfPlayer(st), look, st.player.worn && st.player.worn.sx); g.userData.wsig = wsig(st); players.add(g); }
        else { const n = npcOf(look) || { id: JSON.stringify(look || {}).length + (look && look.top || ''), look: look || {} }; if (who === 'cop' && !n.cop) n.cop = true; dress(g, Guardaroba.outfitOf(n, fem), look); }
      } catch (e) { console.error('[Vesti3D]', e); }
      return g;
    };
    Models.person.__vesti = true;
    return true;
  }
  // quando Nino si cambia, si ricambia anche il modello (in strada e nei ritratti)
  function loop() {
    try {
      const st = ST();
      if (st && players.size) { const s = wsig(st); players.forEach(g => { if (!g.parent && !g.userData.keep) { players.delete(g); return; } if (g.userData.wsig !== s) { g.userData.wsig = s; dress(g, Guardaroba.outfitOfPlayer(st), null, st.player.worn && st.player.worn.sx); } }); }
    } catch (e) { }
    requestAnimationFrame(loop);
  }
  const iv = setInterval(() => { if (hook()) { clearInterval(iv); requestAnimationFrame(loop); } }, 50);
  return { dress, strip, players, analyze, PARTI };
})();
