# [pulitore2] Oggetti storti. Andrea: «roba orientata male secondo la griglia», «cose disallineate tipo queste transenne».
#  - i new jersey a imbuto dei cantieri in città erano ruotati sulla strada con +0,22 rad fissi, mentre la fila scende di lato:
#    ogni barriera sporgeva dalla precedente e la fila sembrava una scaletta. Ora ognuna segue la linea dell'imbuto, testa a testa;
#  - la seconda transenna dei lavori fuori città non è più storta di 0,2 rad;
#  - ogni oggetto messo con place() più largo di 45 cm ruota (non si sposta mai) per stare parallelo a quello che ha accanto:
#    il muro della casa se è entro 3 m, altrimenti il ciglio della strada se è entro 6 m. Tiene il suo verso (quale lato guarda
#    dove), perde solo l'angolo a caso. Senza muri né strade vicini resta com'era. Le cose minute (cicche, bottiglie, sassi)
#    restano libere. Un oggetto con userData.free2 non si tocca.
# Dopo pulitore1.py. Guardia [pulitore2].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[pulitore2]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

rep("jersey1(p[0], p[1], Math.atan2(ux, uy) + .22, true, col);",
    "const p2 = c(-L - 2 - (q + 1) * 2, -W + (q + 1) * .45 - .9); jersey1(p[0], p[1], Math.atan2(p[0] - p2[0], p[1] - p2[1]), true, col);   /* [pulitore2] lungo la fila */")
rep("    return place(g, x, z, rot);\n  }\n  // rete arancione da cantiere fra due paletti",
    "    g.userData.free2 = true;   /* [pulitore2] il verso lo decide chi la mette in fila */\n    return place(g, x, z, rot);\n  }\n  // rete arancione da cantiere fra due paletti")
rep("transenna(x + nx * sd * (off + .2) + ux * 1.6, z + nz * sd * (off + .2) + uz * 1.6, Math.atan2(ux, uz) + .2);",
    "transenna(x + nx * sd * (off + .2) + ux * 1.6, z + nz * sd * (off + .2) + uz * 1.6, Math.atan2(ux, uz));   /* [pulitore2] */")

rep("  function place(o, x, z, rot, live) { o.position.set(x, groundH(x, z), z); o.rotation.y = rot || 0;",
r"""  // [pulitore2] il verso delle cose: allineate alla strada vicina o alla griglia, mai a un angolo a caso
  const RS2 = { h: null, box: new THREE.Box3(), v: new THREE.Vector3() };
  function roadDir2(x, z) {
    if (!RS2.h) { RS2.h = new Map(); (M.roads || []).forEach(rd => { if (rd.rect || !rd.pts) return; const P = rd.pts;
      for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], az = P[k][1], bx = P[k + 1][0], bz = P[k + 1][1];
        for (let i = Math.floor(Math.min(ax, bx) / 16) - 1; i <= Math.floor(Math.max(ax, bx) / 16) + 1; i++) for (let j = Math.floor(Math.min(az, bz) / 16) - 1; j <= Math.floor(Math.max(az, bz) / 16) + 1; j++) {
          const kk = i * 4096 + j; let a = RS2.h.get(kk); if (!a) RS2.h.set(kk, a = []); a.push([ax, az, bx, bz, rd.w || 6]); } } }); }
    let best = null, bd = 1e9; for (const sg of RS2.h.get(Math.floor(x / 16) * 4096 + Math.floor(z / 16)) || []) {
      const dx = sg[2] - sg[0], dz = sg[3] - sg[1], L2 = dx * dx + dz * dz; if (L2 < .01) continue; const t = Math.max(0, Math.min(1, ((x - sg[0]) * dx + (z - sg[1]) * dz) / L2));
      const d = Math.hypot(sg[0] + dx * t - x, sg[1] + dz * t - z) - sg[4] / 2; if (d < bd) { bd = d; best = Math.atan2(dx, dz); } }
    return { a: best, d: bd }; }
  function wallDist2(x, z) {   // distanza dal muro di casa più vicino (le case stanno sulla griglia)
    if (!RS2.b) { RS2.b = new Map(); (G.BUILDINGS || []).forEach(b => { const q = [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS];
      for (let i = Math.floor(q[0] / 16) - 1; i <= Math.floor(q[2] / 16) + 1; i++) for (let j = Math.floor(q[1] / 16) - 1; j <= Math.floor(q[3] / 16) + 1; j++) { const kk = i * 4096 + j; let a = RS2.b.get(kk); if (!a) RS2.b.set(kk, a = []); a.push(q); } }); }
    let bd = 1e9; for (const q of RS2.b.get(Math.floor(x / 16) * 4096 + Math.floor(z / 16)) || []) { const dx = Math.max(q[0] - x, 0, x - q[2]), dz = Math.max(q[1] - z, 0, z - q[3]); bd = Math.min(bd, Math.hypot(dx, dz)); }
    return bd; }
  function snapRot2(o, x, z, rot) {
    if (!rot || o.userData.free2) return rot || 0;
    o.rotation.y = 0; o.position.set(0, 0, 0); o.updateMatrixWorld(true); RS2.box.setFromObject(o); RS2.box.getSize(RS2.v);
    if (!isFinite(RS2.v.x) || Math.max(RS2.v.x, RS2.v.z) < .45) return rot;
    const wd = wallDist2(x, z), rd = roadDir2(x, z); let a0;
    if (wd < 3 && !(rd.d < wd)) a0 = 0; else if (rd.a !== null && rd.d < 6) a0 = rd.a; else return rot;
    const q = Math.PI / 2; return a0 + Math.round((rot - a0) / q) * q; }
  function place(o, x, z, rot, live) { rot = snapRot2(o, x, z, rot);   /* [pulitore2] */ o.position.set(x, groundH(x, z), z); o.rotation.y = rot || 0;""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
