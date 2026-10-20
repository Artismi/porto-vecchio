/* Porto Vecchio — Il taglio: i vestiti come pezzi modellati (come in San Andreas), non calcolati sopra il corpo.
   Ogni personaggio del kit (Quaternius Ultimate Modular Men/Women, CC0) è fatto di 4 pezzi sullo stesso scheletro:
   testa, busto, gambe, piedi. Un capo dell'inventario sceglie il pezzo (il taglio) e gli dà la stoffa:
   il pezzo prende il posto della parte del corpo, quindi sotto non c'è niente da bucare.
   - I tagli che il kit non ha si ricavano dai suoi pezzi, restando nello stesso stile: via il cappuccio (maglione, giacca),
     via le maniche (canotta), più largo (jeans larghi, cargo, piumino, maglietta oversize).
   - La stoffa è dipinta sul pezzo (come le texture dei giochi PS2): righe, gessato, quadri, fasce, bande della tuta, zip,
     scollo a V con lo strato sotto, colletto, revers, bottoni, numero. Le coordinate sono in metri sul corpo:
     u attorno (busto, braccio, gamba), v lungo.
   - Gli strati: per ogni zona comanda il capo più esterno (l'ultimo indossato); quello subito sotto si vede dove il capo
     di fuori lo lascia vedere (lo scollo, il gilet).
   I pezzi veri che mancano (completo, giacca, cappotto…) si aggiungono nella tabella PEZZI quando arrivano i pacchetti completi. */
var Taglio = (function () {
  'use strict';
  // ---------------- I PEZZI ----------------
  // f: file del kit, re: mesh, r: ruolo di ogni materiale (A = stoffa del capo, B = secondo colore, S = capo sotto, P = pelle),
  // op: come si ricava (cappuccio: via il cappuccio; maniche: via le maniche; largo: quanto si allarga, in metri)
  const PEZZI = {
    uomo: {
      busto: {
        maglietta: { f: 'Casual_2', re: /Body/, r: { LightBrown: 'A', Skin: 'P' } },
        oversize: { f: 'Casual_2', re: /Body/, r: { LightBrown: 'A', Skin: 'P' }, op: { largo: .022, lungo: .06 } },
        canotta: { f: 'Casual_2', re: /Body/, r: { LightBrown: 'A', Skin: 'P' }, op: { maniche: 1 } },
        felpa: { f: 'Casual_Hoodie', re: /Body/, r: { Purple: 'A', Skin: 'P' } },
        maniche_lunghe: { f: 'Casual_2', re: /Body/, r: { LightBrown: 'A', Skin: 'AP' }, op: { largo: .006 } },   // la maglietta con la manica dipinta fino al polso (lo scollo resta pulito)
        piumino: { f: 'Casual_2', re: /Body/, r: { LightBrown: 'A', Skin: 'AP' }, op: { largo: .03 } },
        cappotto: { f: 'Casual_2', re: /Body/, r: { LightBrown: 'A', Skin: 'AP' }, op: { largo: .014, falda: { len: .44, svasa: .32, agio: .03, davanti: .08 } } },
        gilet: { f: 'Worker', re: /Body/, r: { Worker_Vest: 'A', Worker_Yellow: 'B', LightBrown: 'S', Skin: 'P' } },
      },
      gambe: {
        pantaloni: { f: 'Casual_2', re: /Legs/, r: { LightBlue: 'A' } },
        larghi: { f: 'Casual_2', re: /Legs/, r: { LightBlue: 'A' }, op: { gambe_larghe: .028 } },
        corti: { f: 'Casual_Hoodie', re: /Legs/, r: { LightBlue: 'A', Skin: 'P' } },
        lavoro: { f: 'Worker', re: /Legs/, r: { Brown2: 'A', Brown: 'B' } },
      },
      piedi: {
        scarpe: { f: 'Casual_2', re: /Feet/, r: { Red_Dark: 'A', White: 'B' } },
        scarpe_basse: { f: 'Casual_Hoodie', re: /Feet/, r: { Purple: 'A', White: 'B' } },
        scarponi: { f: 'Worker', re: /Feet/, r: { Black: 'A', Grey: 'B' } },
      },
    },
    donna: {
      busto: {
        maglietta: { f: 'Casual', re: /Body/, r: { White: 'A', Skin: 'P' } },
        oversize: { f: 'Casual', re: /Body/, r: { White: 'A', Skin: 'P' }, op: { largo: .02, lungo: .05 } },
        canotta: { f: 'Casual', re: /Body/, r: { White: 'A', Skin: 'P' }, op: { maniche: 1 } },
        maniche_lunghe: { f: 'Casual', re: /Body/, r: { White: 'A', Skin: 'AP' }, op: { largo: .006 } },
        piumino: { f: 'Casual', re: /Body/, r: { White: 'A', Skin: 'AP' }, op: { largo: .03 } },
        cappotto: { f: 'Casual', re: /Body/, r: { White: 'A', Skin: 'AP' }, op: { largo: .012, falda: { len: .42, svasa: .34, agio: .035, davanti: .08 } } },
        vestito: { f: 'Formal', re: /Body/, r: { LimeGreen: 'A', Gold: 'B', Skin: 'P' } },
      },
      gambe: {
        pantaloni: { f: 'Casual', re: /Legs/, r: { Orange: 'A' } },
        larghi: { f: 'Casual', re: /Legs/, r: { Orange: 'A' }, op: { gambe_larghe: .025 } },
        vestito: { f: 'Formal', re: /Legs/, r: { LimeGreen: 'A', Skin: 'P' } },
      },
      piedi: {
        scarpe: { f: 'Casual', re: /Feet/, r: { Grey: 'A', Skin: 'P' } },
        ballerine: { f: 'Formal', re: /Feet/, r: { Red: 'A', Skin: 'P' } },
      },
    },
  };
  // ---------------- DAL CAPO AL TAGLIO E ALLA STOFFA ----------------
  const BUSTO = [
    [/^(canotta|canotta_basket)$/, 'canotta'],
    [/^(maglietta_oversize)$/, 'oversize'],
    [/^(cappotto|impermeabile|camice|pelliccia_lunga)$/, 'cappotto'],
    [/^(piumino|piumino_oca|smanicato|montone|pelliccia|pelliccia_volpe|giaccone)$/, 'piumino'],
    [/^(felpa|felpa_skate)$/, 'felpa'],
    [/^(gilet|grembiule|panciotto)$/, 'gilet'],
    [/^vestit/, 'vestito'],
    [/^(felpa_zip|maglione|maglione_v|maglione_collo_alto|dolcevita|giacca|giacca_completo|giacca_galles|giacca_pied|giacca_pelle|giubbotto|giubbotto_jeans|divisa|divisa_postino|cappotto|impermeabile|camice|giacca_tuta|giacca_tuta_fascia|tuta_ginnastica|tuta|camicia|camicia_quadri|camicia_righe|camicia_vichy|camicia_jeans|camicia_fiori|poncho|scialle)$/, 'maniche_lunghe'],
    [/./, 'maglietta'] ];
  const GAMBE = [[/^(bermuda|pantaloncini|minigonna)$/, 'corti'], [/^(pantaloni_lavoro)$/, 'lavoro'], [/^(gonna)$/, 'vestito'], [/^(jeans_larghi|cargo|pantaloni_tuta|velluto)$/, 'larghi'], [/./, 'pantaloni']];
  const PIEDI = [[/^(stivali|stivali_pelle|scarpe|stivali_cowboy)$/, 'scarponi'], [/^(scarpe_tela|ciabatte|sandali)$/, 'scarpe_basse'], [/^(tacchi|mocassini|scarpe_eleganti)$/, 'ballerine'], [/./, 'scarpe']];
  const NON_VESTE = /^(mutande|calzini|calze_sport|calze_nylon|calzamaglia)$/;   // stanno sotto: non danno il taglio
  const taglioDi = (tab, id, lib) => { for (const [re, t] of tab) if (re.test(id) && lib[t]) return t; return Object.keys(lib)[0]; };
  // la stoffa di un capo: motivo e dettagli dipinti (dal tessuto della Sartoria e da quello che il capo è)
  function stoffaDi(C, sotto) {
    const CUT = (typeof Sartoria !== 'undefined' && Sartoria.CUT_()[C.id]) || {}, V = Object.assign({}, CUT, C.var && typeof C.var === 'object' ? C.var : {});
    const fab = V.fab || '', id = C.id, s = { motivo: 0, dett: {} };
    s.motivo = /fiori|hawaii|liberty/.test(fab + id) ? 8 : /gessato/.test(fab) || /completo/.test(id) ? 2 : /tartan|quadri|madras|vichy|galles|pied/.test(fab + id) ? 3 : /righe_v/.test(fab) ? 1 : /righe|marinara/.test(fab + id) ? 4 : /velluto/.test(fab + id) ? 5 : /piumino/.test(fab + id) || /piumino|smanicato/.test(id) ? 6 : /denim|jeans/.test(fab + id) ? 7 : 0;
    const d = s.dett, collo = V.collo || '';
    if (/revers/.test(collo)) { d.revers = 1; d.vScollo = .2; d.bottoni = 1; }
    else if (collo === 'v') d.vScollo = .1;
    else if (collo === 'camicia_aperta') d.vScollo = .11;
    if (/^(camicia|polo|camicia_aperta)$/.test(collo)) d.colletto = 1;
    if (collo === 'polo') d.listino = 1;
    if (/zip/.test(V.fronte || '') || /zip|tuta/.test(id)) d.zip = 1;
    if (/bottoni/.test(V.fronte || '') && !d.revers) d.bottoni = 1;
    if (/tuta|giacca_tuta/.test(id) || V.bande) d.bande = 1;
    if (V.fascia || /fascia/.test(id)) d.fascia = 1;
    if (/alto/.test(collo)) d.collo_alto = 1;
    if (V.numero || /basket|calcio/.test(id)) d.numero = 1;
    if (V.costine || /maglione|felpa|dolcevita/.test(id)) d.costine = 1;
    s.A = C.col || '#808080'; s.B = C.col2 || V.c2 || (s.motivo === 2 ? '#ece8e0' : '#ece8e0'); s.C = V.c3 || s.B;
    s.S = sotto ? (sotto.col || '#ece8e0') : null; s.T = null; s.SB = sotto && /quadri|righe|vichy/.test(sotto.id) ? 1 : 0;
    return s;
  }
  // ---------------- LE MISURE DEL KIT ----------------
  // nello spazio del kit (posa a T, metri): y in alto, z davanti
  // le ossa nella posa del modello (posa a T), non in quella in cui il kit è fermo adesso: dalle matrici di legatura del pezzo
  const MIS = {};
  function misure(file, src) {
    if (MIS[file]) return MIS[file]; Models.chars[file].root.updateMatrixWorld(true); const b = {}, m = new THREE.Matrix4(), Bi = src.bindMatrix.clone().invert(), W = src.matrixWorld;
    src.skeleton.bones.forEach((o, i) => { m.copy(src.skeleton.boneInverses[i]).invert().premultiply(Bi).premultiply(W); b[o.name] = new THREE.Vector3().setFromMatrixPosition(m); });
    const pick = (...n) => { for (const k of n) if (b[k]) return b[k]; return new THREE.Vector3(); };
    const hips = pick('Hips'), neck = pick('Neck'), chest = pick('Chest'), ua = pick('UpperArmL', 'UpperArm.L'), ul = pick('UpperLegL', 'UpperLeg.L'), ll = pick('LowerLegL', 'LowerLeg.L');
    const wr = pick('WristL', 'Wrist.L'), la = pick('LowerArmL', 'LowerArm.L');
    return (MIS[file] = { ua: ua.clone(), wr: wr.clone(), wrX: Math.abs(wr.x), elX: Math.abs(la.x), hipsY: hips.y, neckY: neck.y, chestY: chest.y, zc: hips.z, shX: Math.abs(ua.x), armY: ua.y, armZ: ua.z, legX: Math.abs(ul.x), legZ: ul.z, kneeY: ll.y, footY: pick('FootL', 'Foot.L').y });
  }
  // ---------------- I PEZZI RICAVATI E LE COORDINATE DI STOFFA ----------------
  const GEO = new Map();
  function geometria(src, file, zona, op, ap) {
    const key = src.uuid + '|' + JSON.stringify(op || {}) + (ap ? '|ap' : ''); if (GEO.has(key)) return GEO.get(key);
    const M = misure(file, src), W = src.matrixWorld.clone(), Wi = W.clone().invert(), g0 = src.geometry.index ? src.geometry.toNonIndexed() : src.geometry.clone();
    let P = g0.attributes.position, n = P.count, Bp = new Float32Array(n * 3); const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i).applyMatrix4(W); Bp[i * 3] = v.x; Bp[i * 3 + 1] = v.y; Bp[i * 3 + 2] = v.z; }
    const reg = (x, y) => zona === 'gambe' ? (x >= 0 ? 3 : 4) : zona === 'piedi' ? 5 : (Math.abs(x) > M.shX * .85 && y > M.chestY - .14 ? (x > 0 ? 1 : 2) : 0);
    // via le parti (per triangolo, dal baricentro)
    let keep = new Uint8Array(n / 3).fill(1);
    if (op) for (let t = 0; t < n / 3; t++) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { x += Bp[(t * 3 + k) * 3] / 3; y += Bp[(t * 3 + k) * 3 + 1] / 3; z += Bp[(t * 3 + k) * 3 + 2] / 3; }
      if (op.cappuccio && y > M.neckY - .06 && z < M.zc - .02 && Math.abs(x) < .17) keep[t] = 0;   // il cappuccio: sopra le spalle, dietro il collo
      if (op.cappuccio && y > M.neckY + .02) keep[t] = 0;
      if (op.maniche && Math.abs(x) > M.shX * .95 && y > M.chestY - .12) keep[t] = 0; }
    // le forme: più largo (dall'asse del busto, del braccio o della gamba), più lungo, la tasca a marsupio appiattita
    if (op) for (let i = 0; i < n; i++) { const x = Bp[i * 3], y = Bp[i * 3 + 1], z = Bp[i * 3 + 2], r = reg(x, y);
      if (op.largo && zona === 'busto') {
        if (r === 0) { const dx = x, dz = z - M.zc, d = Math.hypot(dx, dz) || 1; Bp[i * 3] += dx / d * op.largo; Bp[i * 3 + 2] += dz / d * op.largo; }
        else { const dy = y - M.armY, dz = z - M.armZ, d = Math.hypot(dy, dz) || 1, k = Math.min(1, (Math.abs(x) - M.shX * .85) / .08) * Math.min(1, Math.max(0, (M.wrX - .04 - Math.abs(x)) / .03));   /* la mano no */ Bp[i * 3 + 1] += dy / d * op.largo * k; Bp[i * 3 + 2] += dz / d * op.largo * k; } }
      if (op.lungo && zona === 'busto' && r === 0 && y < M.hipsY + .08) Bp[i * 3 + 1] -= op.lungo * Math.min(1, (M.hipsY + .08 - y) / .08);
      if (op.tasca && zona === 'busto' && r === 0 && z > M.zc + .06 && y < M.chestY - .02) Bp[i * 3 + 2] = Math.min(z, M.zc + .1 + (y - M.hipsY) * .05);   // il marsupio della felpa: via
      if (op.gambe_larghe && zona === 'gambe') { const cx = Math.sign(x || 1) * M.legX, dx = x - cx, dz = z - M.legZ, d = Math.hypot(dx, dz) || 1, k = Math.min(1, Math.max(0, (M.hipsY - .05 - y) / .25)); const rr = d + op.gambe_larghe * k; Bp[i * 3] = cx + dx / d * rr; Bp[i * 3 + 2] = M.legZ + dz / d * rr; }   // [stile] dritto dalla coscia, largo fino in fondo
    }
    // la falda (cappotto, pelliccia lunga): l'orlo del pezzo prolungato fino al ginocchio, svasato, metà sui fianchi e metà sulle cosce
    if (op && op.falda && !ap) { const F = falda(g0, Bp, n, M, op.falda, src); if (F) { const k0 = keep; ({ n, Bp } = F); P = g0.attributes.position; keep = new Uint8Array(n / 3).fill(1); keep.set(k0); } }
    // la manica dipinta sulla pelle del braccio: spessa quanto la manica del pezzo, così non c'è lo scalino all'orlo; al polsino rientra
    if (ap) { const a = M.ua, w = M.wr, ax = new THREE.Vector3(), q = new THREE.Vector3(), d = new THREE.Vector3();
      const lungo = (x, y, z) => { const sg = Math.sign(x); ax.set(w.x * sg - a.x * sg, w.y - a.y, w.z - a.z).normalize(); return q.set(x - a.x * sg, y - a.y, z - a.z).dot(ax); };
      // dove finisce la manica del pezzo (i pezzi fratelli: la stoffa del busto)
      let orlo = 0; for (const o of src.parent.children) if (o.isSkinnedMesh && o !== src) { const Po = o.geometry.attributes.position; o.updateMatrixWorld(true);
        for (let i = 0; i < Po.count; i++) { v.fromBufferAttribute(Po, i).applyMatrix4(o.matrixWorld); if (reg(v.x, v.y)) orlo = Math.max(orlo, lungo(v.x, v.y, v.z)); } }
      for (let i = 0; i < n; i++) { const x = Bp[i * 3], y = Bp[i * 3 + 1], z = Bp[i * 3 + 2]; if (reg(x, y) === 0) continue; const sg = Math.sign(x);
        ax.set(w.x * sg - a.x * sg, w.y - a.y, w.z - a.z); const L = ax.length(); ax.divideScalar(L); q.set(x - a.x * sg, y - a.y, z - a.z); const t = q.dot(ax);
        const k = Math.min(1, Math.max(0, (L - .012 - t) / .012)) * Math.min(1, Math.max(0, (t - orlo + .004) / .02)); if (k <= 0) continue; d.copy(q).addScaledVector(ax, -t); const r = d.length() || 1;
        const sp = .011 * k; Bp[i * 3] += d.x / r * sp; Bp[i * 3 + 1] += d.y / r * sp; Bp[i * 3 + 2] += d.z / r * sp; } }
    // le coordinate di stoffa (metri): u attorno, v lungo; regione (0 busto, 1-2 braccia, 3-4 gambe, 5 piedi)
    const T = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const x = Bp[i * 3], y = Bp[i * 3 + 1], z = Bp[i * 3 + 2], r = reg(x, y); let u, w;
      if (r === 0) { u = Math.atan2(x, z - M.zc) * .15; w = y; }
      else if (r === 1 || r === 2) { u = Math.atan2(z - M.armZ, y - M.armY) * .05; w = Math.abs(x); }
      else if (r === 3 || r === 4) { const cx = (r === 3 ? 1 : -1) * M.legX; u = Math.atan2((x - cx) * (r === 3 ? 1 : -1), z - M.legZ) * .065; w = y; }
      else { u = x; w = z; }
      T[i * 4] = u; T[i * 4 + 1] = w; T[i * 4 + 2] = r; T[i * 4 + 3] = 0; }
    for (let t = 0; t < n / 3; t++) { const a = t * 3, us = [T[a * 4], T[(a + 1) * 4], T[(a + 2) * 4]], R = T[a * 4 + 2], C = R === 0 ? .15 * Math.PI * 2 : R < 3 ? .05 * Math.PI * 2 : .065 * Math.PI * 2;   // il taglio dietro: niente triangoli stirati attorno
      if (Math.max(...us) - Math.min(...us) > C / 2) for (let k = 0; k < 3; k++) if (us[k] < 0) T[(a + k) * 4] += C; }
    // di nuovo nello spazio del pezzo
    for (let i = 0; i < n; i++) { v.set(Bp[i * 3], Bp[i * 3 + 1], Bp[i * 3 + 2]).applyMatrix4(Wi); P.setXYZ(i, v.x, v.y, v.z); }
    const g = new THREE.BufferGeometry(); for (const k in g0.attributes) g.setAttribute(k, g0.attributes[k]); g.setAttribute('aStoffa', new THREE.Float32BufferAttribute(T, 4));
    const idx = []; for (let t = 0; t < n / 3; t++) if (keep[t]) idx.push(t * 3, t * 3 + 1, t * 3 + 2); g.setIndex(idx);
    if (ap || (op && (op.largo || op.gambe_larghe || op.lungo || op.falda))) g.computeVertexNormals();
    g.computeBoundingSphere(); g.userData.misure = M;
    GEO.set(key, g); return g;
  }
  // la falda: anelli sotto l'orlo, ogni vertice dell'orlo scende dritto (svasando) fino a una riga piana; i pesi passano dal bacino alle cosce
  function falda(g0, Bp, n, M, F, src) {
    // l'orlo del pezzo è chiuso (ha spessore): si prende l'anello più basso, il vertice più esterno per ogni spicchio
    let yb = 9; for (let i = 0; i < n; i++) if (Math.abs(Bp[i * 3]) < M.shX + .08) yb = Math.min(yb, Bp[i * 3 + 1]);
    const NB = F.spicchi || 36, best = new Array(NB).fill(-1), rad = i => Math.hypot(Bp[i * 3], Bp[i * 3 + 2] - M.zc), ang = i => Math.atan2(Bp[i * 3], Bp[i * 3 + 2] - M.zc);
    for (let i = 0; i < n; i++) { if (Bp[i * 3 + 1] > yb + .03) continue; const k = Math.min(NB - 1, Math.floor((ang(i) + Math.PI) / (Math.PI * 2) * NB)); if (best[k] < 0 || rad(i) > rad(best[k])) best[k] = i; }
    const L = best.filter(i => i >= 0), m = L.length; if (m < 8) return null;
    let y0 = 9; for (const i of L) y0 = Math.min(y0, Bp[i * 3 + 1]); const yF = y0 - F.len, N = F.anelli || 7;
    const bi = nm => src.skeleton.bones.findIndex(b => b.name === nm), gL = bi('UpperLegL'), gR = bi('UpperLegR');
    const SI = g0.attributes.skinIndex, SW = g0.attributes.skinWeight;
    // un punto della falda: anello k (0 = orlo), vertice j dell'orlo
    const pt = (j, k) => { const i = L[j % m], t = k / N, x = Bp[i * 3], y = Bp[i * 3 + 1], z = Bp[i * 3 + 2] - M.zc, d = Math.hypot(x, z) || 1, a = Math.atan2(x, z);
      const fr = Math.cos(a) > 0 ? 1 - (F.davanti || 0) * Math.cos(a) * t : 1;   // davanti scende un poco meno (si apre al passo)
      const s = 1 + F.svasa * t, ag = F.agio * Math.min(1, t * 2.5);
      return { i, t, x: x * s + x / d * ag, y: y + (yF - y) * t * fr, z: M.zc + z * s + z / d * ag, a }; };
    const tris = []; for (let k = 0; k < N; k++) for (let j = 0; j < m; j++) { const a = pt(j, k), b = pt(j + 1, k), c = pt(j, k + 1), d = pt(j + 1, k + 1); if (j === m - 1 && false) continue; tris.push(a, c, b, b, c, d); }
    // il verso dei triangoli: la faccia guarda fuori
    const flip = (() => { const [a, c, b] = tris; const ux = c.x - a.x, uy = c.y - a.y, uz = c.z - a.z, vx = b.x - a.x, vy = b.y - a.y, vz = b.z - a.z; const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx; return nx * a.x + nz * (a.z - M.zc) < 0; })();
    if (flip) for (let q = 0; q < tris.length; q += 3) { const t = tris[q + 1]; tris[q + 1] = tris[q + 2]; tris[q + 2] = t; }
    const n2 = n + tris.length, B2 = new Float32Array(n2 * 3); B2.set(Bp);
    for (const nm in g0.attributes) { const A = g0.attributes[nm], is = A.itemSize, arr = new A.array.constructor(n2 * is); for (let i = 0; i < n; i++) for (let c = 0; c < is; c++) arr[i * is + c] = A.getComponent ? A.getComponent(i, c) : A.array[i * is + c];
      tris.forEach((p, q) => { const o = (n + q) * is; for (let c = 0; c < is; c++) arr[o + c] = A.array[p.i * is + c]; });
      if (nm === 'skinIndex' || nm === 'skinWeight') tris.forEach((p, q) => { const o = (n + q) * 4, gb = (F.gamba || .6) * p.t, bL = gb * Math.min(1, Math.max(0, .5 + p.x / .16)), bR = gb - bL, w = [];
        for (let c = 0; c < 4; c++) w.push([SI.array[p.i * 4 + c], SW.array[p.i * 4 + c] * (1 - gb)]); w.push([gL, bL], [gR, bR]);
        const ws = {}; for (const [b, x] of w) ws[b] = (ws[b] || 0) + x; const top = Object.entries(ws).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, e) => s + e[1], 0) || 1;
        for (let c = 0; c < 4; c++) arr[o + c] = nm === 'skinIndex' ? (top[c] ? +top[c][0] : 0) : (top[c] ? top[c][1] / sum : 0); });
      g0.setAttribute(nm, new THREE.BufferAttribute(arr, is, A.normalized)); }
    tris.forEach((p, q) => { B2[(n + q) * 3] = p.x; B2[(n + q) * 3 + 1] = p.y; B2[(n + q) * 3 + 2] = p.z; });
    return { n: n2, Bp: B2 };
  }
  // ---------------- LA STOFFA DIPINTA ----------------
  const MAT = new Map();
  // la stoffa è opaca: niente lucido da plastica (il piumino un poco lucido, il resto quasi niente)
  function opaco(m, mot) { if (m.specular) m.specular.setScalar(mot === 6 ? .12 : .035); if (m.shininess !== undefined) m.shininess = mot === 6 ? 30 : 8; if (m.roughness !== undefined) m.roughness = mot === 6 ? .55 : .9; }
  const col3 = c => new THREE.Color(c || '#808080');
  function stoffaMat(m0, s, M) {
    const key = m0.uuid + '|' + JSON.stringify(s); if (MAT.has(key)) return MAT.get(key);
    const m = m0.clone(); m.color.set('#ffffff'); if (m.emissive) m.emissive.set('#000000'); opaco(m, s.motivo);
    const U = { uA: { value: col3(s.A) }, uB: { value: col3(s.B) }, uS: { value: col3(s.S || s.A) }, uMot: { value: s.motivo }, uNeck: { value: M.neckY }, uChest: { value: M.chestY }, uHips: { value: M.hipsY },
      uD: { value: new THREE.Vector4(s.dett.vScollo || 0, s.dett.revers ? 1 : 0, s.dett.zip ? 1 : 0, s.dett.bande ? 1 : 0) },
      uE: { value: new THREE.Vector4(s.dett.colletto ? 1 : 0, s.dett.bottoni ? 1 : 0, s.dett.fascia ? 1 : 0, s.dett.costine ? 1 : 0) },
      uT: { value: col3(s.T || '#000') }, uP: { value: col3(s.P || '#000') }, uWr: { value: s.P ? M.wrX - .018 : 9. }, uF: { value: new THREE.Vector4(s.T ? 1 : 0, s.dett.listino ? 1 : 0, s.Mu ? 1 : 0, 0) }, uMu: { value: col3(s.Mu || '#000') } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aStoffa; varying vec4 vSt;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSt = aStoffa;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec4 vSt; uniform vec3 uA, uB, uS, uT, uP, uMu; uniform float uWr; uniform float uMot, uNeck, uChest, uHips; uniform vec4 uD, uE, uF;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ln(float x, float w) { return step(abs(x), w); }
vec3 stoffa() {
  float u = vSt.x, v = vSt.y, R = floor(vSt.z + .5); vec3 c = uA;
  // il motivo, in metri
  if (uMot == 1.) c = mix(uA, uB, step(.5, fract(u / .03)));                                   // righe verticali
  if (uMot == 2.) c = mix(uA, uB, ln(fract(u / .016) - .5, .045) * .85);                        // gessato: filo ogni 1,6 cm
  if (uMot == 3.) { float a = step(.5, fract(u / .05)), b = step(.5, fract(v / .05)); c = mix(uA, mix(uA, uB, .5), a + b - a * b); c = mix(c, uB * .8, a * b); c = mix(c, uB, ln(fract(u / .05) - .5, .03) * .6); }   // quadri
  if (uMot == 4.) { float s = R > .5 && R < 2.5 ? v : v; c = mix(uA, uB, step(.5, fract(s / .06))); }   // righe orizzontali (marinara); sulle braccia in giro
  if (uMot == 5.) c = uA * (.88 + .16 * step(.5, fract(u / .006)));                             // velluto a coste
  if (uMot == 6.) c = uA * (1. - .22 * smoothstep(.0, .012, abs(fract(v / .09) - .5) - .45 + .012));   // piumino: le trapuntature
  if (uMot == 7.) c = uA * (.92 + .1 * step(.5, fract((u + v) / .004)));                        // denim: diagonale
  if (uMot == 8.) { vec2 q = vec2(u, v) / .07, cl = floor(q), f = fract(q) - .5; vec2 o = vec2(h21(cl), h21(cl + 7.)) - .5; vec2 d = f - o * .5; float a = atan(d.y, d.x), r = length(d), pet = .2 + .1 * cos(a * 5. + h21(cl) * 6.);   // fiori grandi a cinque petali
    if (r < pet) c = mix(uB, vec3(.95, .85, .3), step(r, .06)); if (r < .07 && r > .055) c *= .6; float lf = abs(dot(d - vec2(.2, -.2), normalize(vec2(1., 1.)))); if (r > pet && r < .42 && lf < .05 && d.x > 0. && d.y < 0.) c = mix(uA, vec3(.15, .4, .2), .7); }
  float front = R < .5 ? 1. - step(.55 * .15 * 3.1416, abs(u)) : 0.;
  // lo scollo a V: dentro si vede lo strato sotto (camicia, maglia)
  if (R < .5 && uD.x > 0.) { float dv = uNeck - v, w = dv < 0. ? 0. : (1. - dv / uD.x) * .065; if (dv >= 0. && dv < uD.x && abs(u) < w) c = uS; if (dv >= 0. && dv < uD.x && abs(abs(u) - w) < .004) c *= .45; }
  // la cravatta: nodo grosso e pala larga nella V
  if (R < .5 && uF.x > 0. && uD.x > 0.) { float dv = uNeck - v, w = dv < .035 ? .022 - dv * .25 : .016 + (dv - .035) * .12; if (dv > -.005 && dv < uD.x + .02 && abs(u) < w) { c = uT; if (abs(abs(u) - w) < .003 || abs(dv - .035) < .002) c = uT * .55; } }
  // il listino della polo: due bottoni sotto il colletto
  if (R < .5 && uF.y > 0. && abs(u) < .016 && v < uNeck - .01 && v > uNeck - .1) { c = abs(abs(u) - .016) < .003 ? uA * .5 : uA * 1.05; if (abs(u) < .005 && (abs(v - (uNeck - .04)) < .005 || abs(v - (uNeck - .075)) < .005)) c = uB; }
  // i revers: le ali ai lati della V, contorno scuro
  if (R < .5 && uD.y > 0.) { float dv = uNeck - v; if (dv > -.01 && dv < uD.x) { float w = (1. - max(dv, 0.) / uD.x) * .065, lw = .055 * smoothstep(uD.x, uD.x * .35, dv); float e = abs(u) - w; if (e > 0. && e < lw) { c = uA * 1.12; if (e > lw - .005 || e < .004) c = uA * .5; } } }
  // l'abbottonatura, la zip
  if (R < .5 && (uE.y > 0. || uD.z > 0.) && v < uNeck - uD.x - .01 && v > uHips - .12) { if (uD.z > 0. && abs(u) < .006) c = mix(vec3(.75), vec3(.15), step(.5, fract(v / .006))); if (uE.y > 0. && abs(u) < .009 && abs(fract(v / .085) - .5) < .07) c = uA * .35; }
  // le bande della tuta: lungo il fianco della gamba e sopra il braccio, due righe
  if (uD.w > 0. && R > 2.5 && R < 4.5) { float e = abs(abs(u) - .065 * 1.5708); if (e < .014) c = uB; if (abs(e - .007) < .0015) c = uA; }
  if (uD.w > 0. && R > .5 && R < 2.5) { float e = abs(u - .05 * 1.5708); if (e < .012) c = uB; if (abs(e - .006) < .0015) c = uA; }
  // le mutande sopra i pantaloni: lo slip con l'elastico, la gamba che sale sul fianco, il bordo che stringe
  if (uF.z > 0. && R > 2.5 && R < 4.5) { float a = u / .065, yo = uHips - .1 + .1 * max(0., sin(a)), top = uHips + .1;
    if (v > yo && v < top) { c = uMu; if (v > top - .028) c = mix(uMu, vec3(1.), .25) * (.9 + .1 * step(.5, fract(u / .01))); if (v - yo < .007 || abs(v - (top - .028)) < .003) c = uMu * .55; }
    else if (v < yo && v > yo - .006) c *= .55; }   // l'ombra dell'orlo che strizza la stoffa sotto
  // la fascia sul petto
  if (uE.z > 0. && R < .5 && abs(v - (uChest + .02)) < .045) c = abs(v - (uChest + .02)) < .03 ? uB : uS;
  // il colletto (camicia, polo): la fascia in cima allo scollo, piegata
  if (uE.x > 0. && R < .5 && v > uNeck - .045 && v < uNeck + .03 && abs(u) > .012) { c = uA * 1.08; if (v < uNeck - .04) c = uA * .5; }
  // le costine: orlo e polsi
  if (uE.w > 0. && ((R < .5 && v < uHips - .02 && v > uHips - .2) || false)) c *= .9 + .12 * step(.5, fract(u / .006));
  // la manica lunga sulla pelle del braccio: fino al polso, il polsino scuro, poi la mano
  if (R > .5 && R < 2.5) { if (v > uWr) c = uP; else if (v > uWr - .012) c *= .7; }
  if (uWr < 8. && R < .5 && v > uNeck - .03) c = uP;   // la pelle del collo resta pelle
  return c;
}`).replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= stoffa();');
    };
    m.customProgramCacheKey = () => 'stoffa'; MAT.set(key, m); return m;
  }
  function tinta(m0, col) { const k = m0.uuid + '|' + col; if (!MAT.has(k)) { const m = m0.clone(); m.color.set(col); if (m.emissive) m.emissive.copy(m.color).multiplyScalar(.3); if (!/^Skin/.test(m0.name)) opaco(m, 0); MAT.set(k, m); } return MAT.get(k); }
  // ---------------- IL MONTAGGIO ----------------
  // un pezzo con più materiali, nel glTF, è un gruppo di mesh (una per materiale): si prendono tutte
  const nomeDi = o => o.name + ' ' + (o.parent ? o.parent.name : '');
  function sorgenti(file, re) { const C = Models.chars && Models.chars[file]; if (!C) return []; const L = []; C.root.updateMatrixWorld(true); C.root.traverse(o => { if (o.isSkinnedMesh && re.test(nomeDi(o))) L.push(o); }); return L; }
  function dress(g, outfit, look) {
    const root = g.userData.body && g.userData.body.children[0]; if (!root || !Models.chars) return false;
    const file = g.userData.model, sesso = /^(Casual|Formal)$/.test(file) ? 'donna' : 'uomo', LIB = PEZZI[sesso];
    // via i pezzi di prima; i pezzi della persona tornano (si rinascondono sotto)
    const old = []; root.traverse(o => { if (o.userData.taglio) old.push(o); if (o.userData.taglioHid) { o.visible = true; o.userData.taglioHid = false; } }); old.forEach(o => o.parent && o.parent.remove(o));
    const ossa = {}; root.traverse(o => { if (o.isBone) ossa[o.name] = o; });
    const ord = outfit.map((c, k) => ({ c, k })).sort((a, b) => ((a.c.when || 0) - (b.c.when || 0)) || (a.k - b.k)).map(x => x.c);
    const skin = (look && look.skin) || '#d8a888', fuori = zona => ord.filter(c => c.zona === zona && !NON_VESTE.test(c.id));
    const monta = (zona, tab, reCorpo) => {
      const L = fuori(zona), C = L[L.length - 1], sotto = L[L.length - 2]; if (!C) return;
      const t = taglioDi(tab, C.id, LIB[zona]), Pz = LIB[zona][t], srcs = sorgenti(Pz.f, Pz.re); if (!srcs.length) return;
      // la parte del corpo della persona si nasconde: il pezzo ne prende il posto
      root.traverse(o => { if (o.isSkinnedMesh && reCorpo.test(nomeDi(o)) && !o.userData.taglio) { o.visible = false; o.userData.taglioHid = true; } });
      const s = stoffaDi(C, sotto), mu = zona === 'gambe' && ord.find((c, k) => c.zona === 'gambe' && /^mutande/.test(c.id) && k > ord.indexOf(C)); if (mu) s.Mu = mu.col || '#e8e2d4'; const col = { A: s.A, B: s.B, S: s.S, P: skin }; const tie = zona === 'busto' && ord.find(c => /^cravatta/.test(c.acc || '')); if (tie && s.dett.vScollo) s.T = tie.col || '#a01c28';
      for (const src of srcs) {
        const ap = (Array.isArray(src.material) ? src.material : [src.material]).some(m => Pz.r[m.name] === 'AP'), geo = geometria(src, Pz.f, zona, Pz.op, ap), M = geo.userData.misure;
        const ms = (Array.isArray(src.material) ? src.material : [src.material]).map(m => { const r = Pz.r[m.name]; return r === 'A' ? stoffaMat(m, s, M) : r === 'AP' ? stoffaMat(m, Object.assign({}, s, { P: skin }), M) : r && col[r] ? tinta(m, col[r]) : m; });
        const sm = new THREE.SkinnedMesh(geo, Array.isArray(src.material) ? ms : ms[0]);
        sm.name = 'Taglio_' + zona; sm.userData.taglio = t; sm.userData.vesti = true; sm.userData.zona = zona; sm.castShadow = true; sm.frustumCulled = false;
        const bones = src.skeleton.bones.map(b => ossa[b.name]); if (bones.some(b => !b)) { console.warn('[Taglio] ossa diverse', Pz.f); return; }
        // stesso posto nella gerarchia del pezzo originale (il gruppo del pezzo porta la scala e la rotazione del kit)
        const host = src.parent && src.parent !== Models.chars[Pz.f].root ? src.parent : null, hp = host && root.getObjectByName(host.name);
        if (hp) { const grp = new THREE.Group(); grp.userData.taglio = t; grp.position.copy(host.position); grp.quaternion.copy(host.quaternion); grp.scale.copy(host.scale); hp.parent.add(grp); sm.position.copy(src.position); sm.quaternion.copy(src.quaternion); sm.scale.copy(src.scale); grp.add(sm); }
        else { sm.position.copy(src.position); sm.quaternion.copy(src.quaternion); sm.scale.copy(src.scale); (src.parent && root.getObjectByName(src.parent.name) || root).add(sm); }
        sm.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses), src.bindMatrix);
      }
    };
    monta('busto', BUSTO, /Body/); monta('gambe', GAMBE, /Legs/); monta('piedi', PIEDI, /Feet/);
    // senza niente sopra: la pelle (busto nudo e gambe nude restano i pezzi della persona, tinti di pelle)
    root.traverse(o => { if (!o.isSkinnedMesh || o.userData.taglio || o.userData.taglioHid || /Head/i.test(nomeDi(o))) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; const nm = ms.map(m => /^Skin/.test(m.name) ? m : tinta(m, skin)); o.material = Array.isArray(o.material) ? nm : nm[0]; });
    return true;
  }
  // i punti del busto vestito (posa di riposo, nello spazio della persona): catene, sciarpe e collane ci si posano sopra
  function punti(g) {
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), v = new THREE.Vector3(), out = [];
    g.traverse(o => { if (!o.isSkinnedMesh || o.userData.zona !== 'busto') return; const P = o.geometry.attributes.position, I = o.geometry.index, M = new THREE.Matrix4().multiplyMatrices(gi, o.matrixWorld);
      const n = I ? I.count : P.count; for (let k = 0; k < n; k++) { v.fromBufferAttribute(P, I ? I.getX(k) : k).applyMatrix4(M); out.push(v.x, v.y, v.z); } });
    return out; }
  return { dress, punti, PEZZI, attivo: true };   // [via di mezzo] la base sono i pezzi modellati del kit (scelta dopo il confronto: più vicina allo stile voluto)
})();
if (typeof module !== 'undefined') module.exports = Taglio;
