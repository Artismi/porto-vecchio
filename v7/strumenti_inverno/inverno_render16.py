# [inverno 16] Neon meno «natalizi» e solchi delle gomme veri. Si applica dopo inverno_render15 (e monte_render).
# 1) palette delle luci: niente ciano/magenta da albero di Natale. Sodio ambrato, tubo freddo spento, un rosso cupo raro (il regime).
# 2) aloni più stretti e deboli, insegne che illuminano meno lontano, lampadine del filo tutte uguali (calde).
# 3) agli incroci niente archi a caso: solo le curve vere tra le strade che si incontrano, e non tutte.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno16]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("const NQ = ['#38e8ff', '#ff3fa4', '#ffb050'].map(h => new THREE.Color(h));",
    "const NQ = ['#9cc8c0', '#b84a3c', '#d8904a'].map(h => new THREE.Color(h));   // [inverno16] tubo freddo spento, rosso cupo, sodio")
rep("[185, 330, 32].forEach((t, i) =>", "[185, 355, 32].forEach((t, i) =>")
rep("if (h.s < .25 || hu < 12 || hu > 348) return hex;", "if (h.s < .25) return hex;")
rep("const NEON = ['#ff3fa4', '#38e8ff', '#38e8ff', '#ffb050', '#ff3fa4', '#38e8ff'];", "const NEON = ['#d8904a', '#9cc8c0', '#d8904a', '#9cc8c0', '#d8904a', '#b84a3c'];")
rep("const NEONS = ['#38e8ff', '#ff3fa4', '#38e8ff', '#ffb050', '#ff3fa4']", "const NEONS = ['#d8904a', '#9cc8c0', '#d8904a', '#b84a3c', '#9cc8c0']")
rep("const CCOL = ['#38e8ff', '#ff3fa4'];", "const CCOL = ['#9cc8c0', '#d8904a'];")
rep("const cols = ['#ff5a8a', '#ffd24a', '#5ae8ff', '#8aff7a', '#ff9a3a'];", "const cols = ['#f0c890'];   // [inverno16] filo di lampadine: tutte calde, non colorate")
rep("function glow(x, y, z, color, size, add) { color = nq(color);", "function glow(x, y, z, color, size, add) { color = nq(color); size *= .65;")
rep("const lr = addLight(lx, sy - .3, lz, b.sign.c, 5, 14,", "const lr = addLight(lx, sy - .3, lz, b.sign.c, 2.2, 8,")
rep("float rr = j==0 ? 3. : (j==1 ? 8. : 17.);", "float rr = j==0 ? 2. : (j==1 ? 5. : 9.);")
rep("c += bl*(.1 + night*.14);", "c += bl*(.05 + night*.06);")
# 3) incroci: curve di svolta solo fra bracci reali
old_j = s[s.index("    junctions().forEach(([jx, jy, jr]) => {\n      if (jx < X0m - 12"):]
old_j = old_j[:old_j.index("  }\n  // rumore di valore liscio")]
new_j = """    junctions().forEach(([jx, jy, jr]) => {   // [inverno16] le svolte vere: da un braccio della strada a quello accanto
      if (jx < X0m - 14 || jx > X1 + 14 || jy < Y0m - 14 || jy > Y1 + 14) return;
      const r = rng((Math.round(jx) * 31 + Math.round(jy) * 17) >>> 0), arms = armsAt(jx, jy, jr);
      x.globalAlpha = .18; x.fillStyle = '#4a4644'; x.beginPath(); x.ellipse((jx - X0m) * PPM, (jy - Y0m) * PPM, jr * .7 * PPM, jr * .7 * PPM, 0, 0, 6.3); x.fill(); x.globalAlpha = 1;
      let drawn = 0;
      for (let i = 0; i < arms.length && drawn < 3; i++) for (let j = i + 1; j < arms.length && drawn < 3; j++) {
        const a = arms[i], b = arms[j], dot = a.ux * b.ux + a.uy * b.uy; if (dot < -.6 || dot > .6 || r() < .35) continue;
        // verso l'interno della curva
        let pax = b.ux - a.ux * dot, pay = b.uy - a.uy * dot, pl = Math.hypot(pax, pay) || 1; pax /= pl; pay /= pl;
        let pbx = a.ux - b.ux * dot, pby = a.uy - b.uy * dot, ql = Math.hypot(pbx, pby) || 1; pbx /= ql; pby /= ql;
        const R = jr + 1.5, lane = Math.min(a.w, b.w) * .25;
        [-.55, .55].forEach(wo => { const lo = lane + wo;
          const sx = jx + a.ux * R + pax * lo, sy = jy + a.uy * R + pay * lo, ex = jx + b.ux * R + pbx * lo, ey = jy + b.uy * R + pby * lo, cx = jx + (pax + pbx) * lo, cy = jy + (pay + pby) * lo;
          x.beginPath(); x.moveTo((sx - X0m) * PPM, (sy - Y0m) * PPM); x.quadraticCurveTo((cx - X0m) * PPM, (cy - Y0m) * PPM, (ex - X0m) * PPM, (ey - Y0m) * PPM);
          x.lineWidth = 1.4; x.strokeStyle = 'rgba(38,36,36,.34)'; x.stroke(); });
        drawn++;
      }
    });
"""
s = s.replace(old_j, new_j)
# i bracci di un incrocio: da ogni strada che ci passa, i due versi che proseguono oltre il raggio
rep("  const nearJ = (x, y, extra) =>", """  function armsAt(jx, jy, jr) {   // [inverno16]
    const arms = [];
    (M.roads || []).forEach(rd => {
      if (rd.kind === 'vicolo' || rd.kind === 'sterrato') return; const P = rd.pts; if (!P || P.length < 2) return;
      let best = 1e9, bs = 0, acc = 0; const cum = [0];
      for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L = Math.hypot(dx, dy) || 1e-6;
        const t = Math.max(0, Math.min(1, ((jx - ax) * dx + (jy - ay) * dy) / (L * L))), d = Math.hypot(ax + dx * t - jx, ay + dy * t - jy);
        if (d < best) { best = d; bs = acc + t * L; } acc += L; cum.push(acc); }
      if (best > rd.w / 2 + 2) return;
      const at = s0 => { for (let k = 0; k < P.length - 1; k++) if (s0 <= cum[k + 1]) { const t = (s0 - cum[k]) / ((cum[k + 1] - cum[k]) || 1); return [P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t]; } return null; };
      [-1, 1].forEach(sg => { const s1 = bs + sg * (jr + 4); if (s1 < 0 || s1 > acc) return; const q = at(s1); if (!q) return; const dx = q[0] - jx, dy = q[1] - jy, L = Math.hypot(dx, dy); if (L < jr * .6) return;
        const ux = dx / L, uy = dy / L; if (arms.some(o => o.ux * ux + o.uy * uy > .94)) return; arms.push({ ux, uy, w: rd.w }); });
    });
    return arms;
  }
  const nearJ = (x, y, extra) =>""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
