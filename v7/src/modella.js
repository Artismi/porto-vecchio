/* Porto Vecchio — Modella: il kit di forme per i modelli fatti a mano (pezzi.js, postazioni st_*).
   Stessa regola di forme.js in render.js: niente scatole, sfere e cilindri nudi. Ogni oggetto ha
     1. VOLUME     — la sagoma vera: gusci estrusi coi bordi arrotondati, profili torniti, tubi piegati col loro raggio;
     2. STRUTTURA  — bordi, bulloni, cerniere, staffe, nervature, alette, griglie, prese, manopole, ruote con battistrada;
     3. SUPERFICIE — la mette superfici.js (texture per materiale, smussi, ombre di contatto) e le targhette disegnate qui.
   Tutte le misure in metri, il davanti verso +z. Ogni funzione aggiunge al gruppo p e restituisce la mesh (o il gruppo). */
var Modella = (function () {
  'use strict';
  const M = {};
  const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .8, metalness: 0 }, o || {}))); };
  const MET = { metalness: .3, roughness: .42 };   // senza mappa d'ambiente il metallo pieno viene nero: si tiene basso
  const V = a => new THREE.Vector3(a[0], a[1], a[2]);
  function put(p, geo, c, o, x, y, z) { const m = new THREE.Mesh(geo, typeof c === 'string' ? mat(c, o) : c); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; p.add(m); return m; }
  function grp(p, x, y, z, ry, rx, rz) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); g.rotation.set(rx || 0, ry || 0, rz || 0); p.add(g); return g; }

  // ---------------- VOLUME ----------------
  // rettangolo con gli angoli arrotondati (per estrusi)
  function rett(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2 - .001, h / 2 - .001);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
  // guscio: blocco w×h×d con gli angoli in pianta arrotondati (r) e il bordo smussato (b). Base a y=0.
  function guscio(p, w, h, d, c, o, r, b, x, y, z) {
    b = b === undefined ? Math.min(.02, h * .15) : b; r = r === undefined ? Math.min(w, d) * .15 : r;
    const geo = new THREE.ExtrudeGeometry(rett(w - 2 * b, d - 2 * b, Math.max(.002, r - b)), { depth: Math.max(.001, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 5 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0); geo.computeVertexNormals();
    return put(p, geo, c, o, x, y, z);
  }
  // pannello verticale w×h spesso t, angoli arrotondati (il fronte di un quadro, uno sportello, una targa in rilievo). Centro in (x,y), fronte a z+t.
  function lastra(p, w, h, t, c, o, r, x, y, z) {
    const b = Math.min(t * .4, .006), geo = new THREE.ExtrudeGeometry(rett(w - 2 * b, h - 2 * b, Math.max(.002, (r || .01) - b)), { depth: Math.max(.001, t - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 4 });
    geo.translate(0, 0, b); geo.computeVertexNormals(); return put(p, geo, c, o, x, y, z);
  }
  // tornito: profilo [[raggio, quota], ...] attorno a y
  function tornito(p, pts, c, o, x, y, z, n) { const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(0, a), b)), n || 20); return put(p, g, c, o, x, y, z); }
  // serbatoio sdraiato lungo x, sezione a capsula schiacciata: lungo L, largo d, alto h
  function serbatoio(p, L, h, d, c, o, x, y, z) {
    const s = rett(L, h, h * .45), geo = new THREE.ExtrudeGeometry(s, { depth: d - h * .3, bevelEnabled: true, bevelThickness: h * .15, bevelSize: h * .12, bevelSegments: 4, curveSegments: 8 });
    geo.translate(0, 0, -(d - h * .3) / 2); geo.computeVertexNormals(); return put(p, geo, c, o, x, y, z);
  }
  // tubo che passa per i punti, con le curve arrotondate (raggio rc) agli angoli: telai, maniglie, scarichi
  function tuboPiegato(p, pts, r, c, o, rc) {
    const P = pts.map(V), path = new THREE.CurvePath(); rc = rc || r * 3;
    let prev = P[0];
    for (let i = 1; i < P.length; i++) {
      const a = P[i], next = P[i + 1];
      if (!next) { path.add(new THREE.LineCurve3(prev, a)); break; }
      const d1 = a.clone().sub(prev), d2 = next.clone().sub(a), k = Math.min(rc, d1.length() / 2, d2.length() / 2);
      const s = a.clone().sub(d1.normalize().multiplyScalar(k)), e = a.clone().add(d2.normalize().multiplyScalar(k));
      path.add(new THREE.LineCurve3(prev, s)); path.add(new THREE.QuadraticBezierCurve3(s, a, e)); prev = e;
    }
    const geo = new THREE.TubeGeometry(path, Math.max(8, P.length * 10), r, 8, false); return put(p, geo, c, o || MET);
  }
  function asta(p, a, b, r, c, o, n) { const A = V(a), B = V(b), d = B.clone().sub(A), m = put(p, new THREE.CylinderGeometry(r, r, d.length(), n || 8), c, o); m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; }
  function cavo(p, pts, r, c) { const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)), pts.length * 8, r, 6); return put(p, geo, c, { roughness: .9 }); }

  // schermo a tubo catodico: rettangolo con gli angoli arrotondati, bombato al centro (b = quanto sporge), davanti a +z
  function schermo(p, w, h, b, c, x, y, z) {
    const geo = new THREE.PlaneGeometry(w, h, 10, 8), P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const u = P.getX(i) / (w / 2), v = P.getY(i) / (h / 2); P.setZ(i, b * (1 - u * u * .85) * (1 - v * v * .85)); }
    geo.computeVertexNormals(); const m = put(p, geo, c, {}, x, y, z); m.material = m.material.clone(); return m;
  }
  // ---------------- STRUTTURA ----------------
  // bullone a testa esagonale con la rondella; asse lungo la normale (ax: 'x' | 'y' | 'z')
  function bullone(p, x, y, z, ax, s, c) { s = s || .012; const g = grp(p, x, y, z); if (ax === 'z') g.rotation.x = Math.PI / 2; else if (ax === 'x') g.rotation.z = -Math.PI / 2;
    put(g, new THREE.CylinderGeometry(s * 1.3, s * 1.3, s * .25, 10), c || '#5a5c60', MET, 0, s * .12, 0); put(g, new THREE.CylinderGeometry(s, s, s * .7, 6), c || '#6a6c70', MET, 0, s * .55, 0); return g; }
  // fila di bulloni da a a b
  function bulloni(p, a, b, n, ax, s, c) { for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1); bullone(p, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, ax, s, c); } }
  // alette di raffreddamento (testata del motore): n lamelle sottili impilate lungo y, sezione w×d
  function alette(p, n, w, d, passo, c, x, y, z) { const g = grp(p, x, y, z); for (let i = 0; i < n; i++) guscio(g, w * (1 - (i % 2) * .06), .006, d * (1 - (i % 2) * .06), c, MET, Math.min(w, d) * .3, .002, 0, i * passo, 0); return g; }
  // griglia di feritoie su un pannello verticale (fronte a z): righe di asole scure incassate
  function griglia(p, w, h, righe, colonne, x, y, z, c) { const g = grp(p, x, y, z), aw = w / colonne * .78, ah = h / righe * .45;
    for (let r = 0; r < righe; r++) for (let k = 0; k < colonne; k++) lastra(g, aw, ah, .004, c || '#141414', { roughness: 1 }, ah * .5, -w / 2 + (k + .5) * w / colonne, -h / 2 + (r + .5) * h / righe, -.002);
    return g; }
  // manopola zigrinata col segno bianco, sporge dal pannello verso +z
  function manopola(p, x, y, z, r, c) { const g = grp(p, x, y, z, 0, Math.PI / 2); put(g, new THREE.CylinderGeometry(r, r * 1.1, r * .9, 14), c || '#1a1a1a', { roughness: .6 }, 0, r * .45, 0); put(g, new THREE.CylinderGeometry(r * .7, r * .9, r * .3, 14), c || '#2a2a2a', { roughness: .5 }, 0, r * 1.0, 0); put(g, new THREE.BoxGeometry(r * .18, r * .1, r * .7), '#e8e8e0', {}, 0, r * 1.16, -r * .3); return g; }
  // presa di corrente schuko nel suo bicchiere col coperchio a molla
  function presa(p, x, y, z, s, c) { s = s || .045; const g = grp(p, x, y, z, 0, Math.PI / 2); put(g, new THREE.CylinderGeometry(s, s * 1.08, s * .4, 16), c || '#2a2a2a', { roughness: .7 }, 0, s * .2, 0); put(g, new THREE.CylinderGeometry(s * .72, s * .72, s * .05, 16), '#151515', {}, 0, s * .42, 0);
    for (const k of [-1, 1]) put(g, new THREE.CylinderGeometry(s * .1, s * .1, s * .06, 6), '#050505', {}, k * s * .35, s * .44, 0); return g; }
  // interruttore a levetta in una piastrina
  function levetta(p, x, y, z, s) { s = s || .02; const g = grp(p, x, y, z); lastra(g, s * 1.6, s * 2.2, s * .3, '#202020', {}, s * .3, 0, 0, 0); const l = asta(g, [0, 0, s * .3], [0, s * .6, s * 1.4], s * .18, '#c8c8c8', MET); return g; }
  // strumento a lancetta (voltmetro): cassa tonda, quadrante, vetro, lancetta rossa
  function quadrante(p, x, y, z, r, testo) { const g = grp(p, x, y, z, 0, Math.PI / 2); put(g, new THREE.CylinderGeometry(r * 1.15, r * 1.2, r * .35, 20), '#1a1a1a', { roughness: .5 }, 0, r * .17, 0);
    const f = put(g, new THREE.CircleGeometry(r, 20), targaMat(testo || 'V', '#f0ead8', '#1a1a1a', 'quadrante'), {}, 0, r * .36, 0); f.rotation.x = -Math.PI / 2;
    const l = put(g, new THREE.BoxGeometry(r * .06, r * .02, r * .8), '#c8201a', {}, r * .15, r * .38, -r * .15); l.rotation.y = .7; return g; }
  // ruota: copertone col battistrada a tasselli, cerchio stampato, mozzo coi bulloni. Asse lungo x.
  function ruota(p, R, L, x, y, z, cerchio) {
    const g = grp(p, x, y, z, 0, 0, Math.PI / 2), t = R * .32;
    tornito(g, [[R * .62, -L / 2], [R - t * .35, -L / 2], [R, -L / 2 + t * .4], [R, L / 2 - t * .4], [R - t * .35, L / 2], [R * .62, L / 2]], '#1c1c1e', { roughness: .95 }, 0, 0, 0, 24);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = put(g, new THREE.BoxGeometry(R * .14, L * .7, t * .25), '#151517', { roughness: 1 }, Math.cos(a) * (R + t * .05), (i % 2 ? .12 : -.12) * L, Math.sin(a) * (R + t * .05)); b.rotation.y = -a; }
    tornito(g, [[0, -L * .32], [R * .62, -L * .34], [R * .64, -L * .2], [R * .3, -L * .1], [R * .3, L * .1], [R * .64, L * .2], [R * .62, L * .34], [0, L * .32]], cerchio || '#b8bcc4', MET, 0, 0, 0, 20);
    put(g, new THREE.CylinderGeometry(R * .16, R * .2, L * .8, 12), '#3a3c40', MET);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; put(g, new THREE.CylinderGeometry(R * .035, R * .035, L * .86, 6), '#8a8e96', MET, Math.cos(a) * R * .24, 0, Math.sin(a) * R * .24); }
    return g;
  }
  // cerniera a nastro su uno spigolo verticale
  function cerniera(p, x, y, z, h, c) { const g = grp(p, x, y, z); put(g, new THREE.CylinderGeometry(.008, .008, h, 8), c || '#6a6c70', MET); put(g, new THREE.BoxGeometry(.02, h * .9, .004), c || '#6a6c70', MET, .012, 0, 0); return g; }
  // maniglia ad arco (tubo piegato) fra due attacchi, su un piano: a,b estremi, alt = di quanto sporge
  function maniglia(p, a, b, alt, r, c, dir) { dir = dir || [0, 1, 0]; const A = V(a), B = V(b), D = V(dir).multiplyScalar(alt);
    tuboPiegato(p, [a, A.clone().add(D).toArray(), B.clone().add(D).toArray(), b], r, c || '#1a1a1a', { roughness: .6 }, alt * .5);
    for (const q of [a, b]) put(p, new THREE.SphereGeometry(r * 1.6, 8, 6), c || '#1a1a1a', {}, q[0], q[1], q[2]); }

  // ---------------- TARGHETTE (SUPERFICIE) ----------------
  // una targhetta disegnata su tela: testo su fondo, con bordino; tipi: 'targa' (testo centrato), 'pericolo' (triangolo giallo), 'strisce' (bande gialle e nere), 'quadrante'
  const TM = {};
  function targaMat(testo, fondo, inchiostro, tipo) {
    const k = [testo, fondo, inchiostro, tipo].join('|'); if (TM[k]) return TM[k];
    const W = tipo === 'quadrante' ? 64 : 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    if (tipo === 'strisce') { x.fillStyle = inchiostro; for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(i * 20, 0); x.lineTo(i * 20 + 10, 0); x.lineTo(i * 20 + 10 - 64, 64); x.lineTo(i * 20 - 64, 64); x.fill(); } }
    else if (tipo === 'pericolo') { x.fillStyle = inchiostro; x.beginPath(); x.moveTo(W / 2, 6); x.lineTo(W / 2 + 34, 58); x.lineTo(W / 2 - 34, 58); x.closePath(); x.fill(); x.fillStyle = fondo; x.beginPath(); x.moveTo(W / 2, 16); x.lineTo(W / 2 + 26, 53); x.lineTo(W / 2 - 26, 53); x.closePath(); x.fill(); x.fillStyle = inchiostro; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText(testo || '!', W / 2, 50); }
    else if (tipo === 'quadrante') { x.strokeStyle = inchiostro; x.lineWidth = 2; for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.15 - i * .13); x.beginPath(); x.moveTo(32 + Math.cos(a) * 26, 36 - Math.sin(a) * 26); x.lineTo(32 + Math.cos(a) * (i % 5 ? 22 : 18), 36 - Math.sin(a) * (i % 5 ? 22 : 18)); x.stroke(); } x.fillStyle = inchiostro; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText(testo || 'V', 32, 52); }
    else { x.strokeStyle = inchiostro; x.lineWidth = 3; x.strokeRect(4, 4, W - 8, H - 8); x.fillStyle = inchiostro; const righe = String(testo).split('\n'); let fs = 30; x.font = `bold ${fs}px sans-serif`; while (righe.some(r => x.measureText(r).width > W - 16) && fs > 9) { fs--; x.font = `bold ${fs}px sans-serif`; } x.textAlign = 'center'; x.textBaseline = 'middle'; righe.forEach((r, i) => x.fillText(r, W / 2, H / 2 + (i - (righe.length - 1) / 2) * fs * 1.05)); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .6 }); m.userData.sup = 'nessuno'; return (TM[k] = m);
  }
  // incolla una targhetta w×h sul piano di normale +z (ry per girarla), appena sopra la superficie
  function targa(p, testo, w, h, x, y, z, ry, fondo, inchiostro, tipo) { const m = put(p, new THREE.PlaneGeometry(w, h), targaMat(testo, fondo || '#e8e0c8', inchiostro || '#1a1a1a', tipo || 'targa'), null, x, y, z); m.rotation.y = ry || 0; m.userData.noVeste = true; return m; }

  return { mat, MET, put, grp, rett, schermo, guscio, lastra, tornito, serbatoio, tuboPiegato, asta, cavo, bullone, bulloni, alette, griglia, manopola, presa, levetta, quadrante, ruota, cerniera, maniglia, targa, targaMat };
})();
