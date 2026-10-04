# [inverno 24] Le cose si incastrano: niente scritte sopra le finestre. Più caldo, qualche palazzo bianco. Dopo inverno_render23.
# 1) Il ritratto del Garante si decide quando si costruisce l'edificio (propPlan): quel tratto di facciata nasce MURO CIECO
#    (niente finestre né cornici) e il ritratto ci sta dentro, a filo. Niente più teloni sopra le finestre.
# 2) Gli slogan non sono più dipinti sulle facciate: sono insegne a lettere sul tetto (telaio di ferro, lettere rosse), come in URSS.
# 3) Manifesti piccoli e oggetti a muro (contatori, lampade, tubi) solo sui moduli di muro pieno del piano terra, mai sulle finestre.
# 4) Qualche intonaco bianco; luci ambra più calde e più presenti; il grigio generale meno spinto.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno24]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

# ---- 1) piano del ritratto, deciso alla costruzione ----
rep("  function buildModular(b, i, base, low, plinth) {", """  // [inverno24] dove va il volto del Garante: un tratto di facciata (lato S o E, non quello della porta) che nasce cieco
  function propPlan(b, i, kind, fl, base, x0, z0, w, d) {
    if (fl < 2) return null;
    const dd = M.world && M.world.districtAt ? M.world.districtAt(x0 + w / 2) : 'centro'; if (dd === 'prateria' || dd === 'foresta') return null;
    const r = rng(i * 733 + 101), civic = kind === 'civic' || kind === 'mil'; if (r() > (civic ? .8 : .34)) return null;
    const T = G.T, open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
    const face = faceOf(b), cand = [];
    if (face !== 'S' && b.w >= 3 && open(b.x + Math.floor(b.w / 2), b.y + b.h + 1)) cand.push({ f: 'S', n: b.w });
    if (face !== 'E' && b.h >= 3 && open(b.x + b.w + 1, b.y + Math.floor(b.h / 2))) cand.push({ f: 'E', n: b.h });
    if (!cand.length) return null;
    const sd = pick(r, cand), H = MG + (fl - 1) * MF, span = Math.max(2, Math.min(sd.n, Math.round((H - .8) * .7 / TS))), k0 = Math.floor((sd.n - span) / 2);
    const mid = (k0 + span / 2) * TS, pw = span * TS - .5, ph = Math.min(H - .8, pw / .7);
    const pos = sd.f === 'S' ? { x: x0 + mid, z: z0 + d, yaw: 0 } : { x: x0 + w, z: z0 + d - mid, yaw: Math.PI / 2 };
    return { f: sd.f, k0, k1: k0 + span, pw, ph, yc: base + .3 + H / 2, ...pos, defaced: r() < .22, top: base + H };
  }
  function buildModular(b, i, base, low, plinth) {""")
rep("    const face0 = faceOf(b);\n    const sides = [\n      { f: 'S', n: b.w, rot: -Math.PI / 2",
    "    const face0 = faceOf(b);\n    const PP = b.__prop !== undefined ? b.__prop : (b.__prop = propPlan(b, i, kind, fl, base, x0, z0, w, d)); b.__top = top; b.__gwall = {};   // [inverno24]\n    const inMural = (sd, k, y) => PP && PP.f === sd.f && k >= PP.k0 && k < PP.k1;   // tutta l'altezza: piano terra compreso\n    const sides = [\n      { f: 'S', n: b.w, rot: -Math.PI / 2")
rep("    const row = (name, sd, y) => { for (let k = 0; k < sd.n; k++) modPiece(grp, name, mat, ...xyz(sd.at(k), y), sd.rot); };",
    "    const row = (name, sd, y) => { for (let k = 0; k < sd.n; k++) { if (inMural(sd, k, y)) continue; modPiece(grp, name, mat, ...xyz(sd.at(k), y), sd.rot); } };")
rep("        const isWin = name.includes('window'), gm = shop ? litShop : (r() < .3 ? lit : null);",
    "        const isWin = name.includes('window'), gm = shop ? litShop : (r() < .3 ? lit : null); if (name === 'wall') for (let s2 = 0; s2 < span; s2++) if (!inMural(sd, k + s2, base)) (b.__gwall[sd.f] = b.__gwall[sd.f] || []).push(k + s2);")
rep("""          for (; k + 1 < sd.n; k += 2) modPiece(grp, upper, mat, ...xyz(sd.at(k + .5), y), sd.rot, r() < .35 ? lit : null);""",
    """          for (; k + 1 < sd.n; k += 2) { if (inMural(sd, k, y) || inMural(sd, k + 1, y)) { modPiece(grp, 'wall', mat, ...xyz(sd.at(k), y), sd.rot); modPiece(grp, 'wall', mat, ...xyz(sd.at(k + 1), y), sd.rot); continue; } modPiece(grp, upper, mat, ...xyz(sd.at(k + .5), y), sd.rot, r() < .35 ? lit : null); }""")
rep("const back = sd.f === 'N' || sd.f === 'W', nm = back ? (k % 2 ? 'wall' : 'wall-window-square') : upper;",
    "const back = sd.f === 'N' || sd.f === 'W', nm = inMural(sd, k, y) ? 'wall' : back ? (k % 2 ? 'wall' : 'wall-window-square') : upper;")

rep("for (let k = 0; k < sd.n; k++) if (!used.has(k)) ground.push([k, (front ||", "for (let k = 0; k < sd.n; k++) if (!used.has(k)) ground.push([k, inMural(sd, k, base) ? 'wall' : (front ||")

# ---- propaganda: ritratti dal piano, slogan sui tetti ----
i0 = s.index("  function buildPropaganda() {"); i1 = s.index("  function buildDetails() {")
s = s[:i0] + """  function buildPropaganda() {   // [inverno24] ritratti nei muri ciechi decisi alla costruzione, slogan a lettere sui tetti
    const T = G.T, WD = M.world && M.world.districtAt, g = new THREE.Group(); let nR = 0, nS = 0;
    const iron = sm('#1e1c20', { roughness: .7, metalness: .5 });
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b) return;
      const PP = b.__prop;
      if (PP) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(PP.pw, PP.ph), propTex('ritratto', (bi % 7) + (PP.defaced ? 100 : 0)));
        m.position.set(PP.x + Math.sin(PP.yaw) * .14, PP.yc, PP.z + Math.cos(PP.yaw) * .14); m.rotation.y = PP.yaw; g.add(m); nR++;
        (window.__propPos = window.__propPos || []).push([Math.round(PP.x), Math.round(PP.z), 'ritratto']);
        if (bi % 3 === 0) addLight(PP.x + Math.sin(PP.yaw) * 2, PP.yc - PP.ph / 2 + .4, PP.z + Math.cos(PP.yaw) * 2, '#e0a050', 1.8, 10, .02);   // faretto da sotto
      }
      // slogan sul tetto: telaio di ferro sul bordo verso la strada, lettere rosse
      if (!b.__top || !rec.box3) return;
      const dd = WD ? WD(b.x * TS) : 'centro'; if (dd === 'prateria' || dd === 'foresta') return;
      const r = rng(bi * 557 + 31), kind = modKind(b), civic = kind === 'civic' || kind === 'mil';
      if (r() > (civic ? .75 : .2) || nS > 70 || (b.fl || 1) < 2) return;
      const f = (PP && PP.f === 'S') || b.w >= b.h ? 'S' : 'E', len = (f === 'S' ? b.w : b.h) * TS, sw = Math.min(len - 1.2, 11), sh = sw * (56 / 512) * 1.15;
      if (sw < 4) return;
      const x0 = b.x * TS, z0 = b.y * TS, inset = .9, yb = b.__top + .55;
      const cx = f === 'S' ? x0 + b.w * TS / 2 : x0 + b.w * TS - inset, cz = f === 'S' ? z0 + b.h * TS - inset : z0 + b.h * TS / 2, yaw = f === 'S' ? 0 : Math.PI / 2;
      const grp = new THREE.Group(); grp.position.set(cx, yb, cz); grp.rotation.y = yaw; g.add(grp);
      const L = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), propTex('slogan', Math.floor(r() * 997))); L.position.set(0, .35 + sh / 2, .05); grp.add(L);
      [-sw / 2 + .2, 0, sw / 2 - .2].forEach(px => { const post = new THREE.Mesh(new THREE.BoxGeometry(.07, .35 + sh, .07), iron); post.position.set(px, (.35 + sh) / 2 - .55, -.05); grp.add(post); });
      [.35, .35 + sh].forEach(py => { const rail = new THREE.Mesh(new THREE.BoxGeometry(sw, .05, .05), iron); rail.position.set(0, py, -.05); grp.add(rail); });
      nS++;
    });
    scene.add(g); window.__propaganda = { ritratti: nR, slogan: nS };
  }
""" + s[i1:]
# sui tetti, lo spazio delle lettere resta libero: niente condizionatori nella fascia del bordo verso la strada (si fa scorrere la roba indietro)

# ---- 3) manifesti e oggetti a muro solo sui moduli di muro pieno (solo dentro buildDetails) ----
d0 = s.index("  function buildDetails() {"); d1 = s.index("  function buildDetails2() {"); D = s[d0:d1]
def rd(old, new):
    global D
    assert D.count(old) == 1, (old[:80], D.count(old)); D = D.replace(old, new)
rd("{ len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok:", "{ f: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok:")
rd("{ len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok:", "{ f: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok:")
rd("{ len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok:", "{ f: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok:")
rd("{ len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok:", "{ f: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok:")
rd("      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u);",
   """      // [inverno24] solo dove il piano terra è muro pieno: niente manifesti sui vetri
      const wallU = (sd, u) => { if (!b.__gwall) return u; const L = b.__gwall[sd.f] || []; if (!L.length) return null; const k = L[Math.floor((u * 7.3) % L.length)]; return k * TS + .3 + ((u * 13.7) % 1) * 1.4; };
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u);""")
rd("          const u = .7 + r() * Math.max(.1, sd.len - 1.4), a = mkA(sd, u), kind = Math.floor(r() * 24) % 16,",
   "          const u0 = .7 + r() * Math.max(.1, sd.len - 1.4), u = wallU(sd, u0); if (u === null || u > sd.len - .4) continue; const a = mkA(sd, u), kind = Math.floor(r() * 24) % 16,")
rd("          const a = mkA(sd, .6 + r() * Math.max(.1, sd.len - 1.2)), t = r();",
   "          const u1 = wallU(sd, .6 + r() * Math.max(.1, sd.len - 1.2)); if (u1 === null || u1 > sd.len - .4) continue; const a = mkA(sd, u1), t = r();")
s = s[:d0] + D + s[d1:]

# ---- 4) colori: qualche bianco, luci più calde, meno grigio ----
rep("['#7a6a90', '#a8a0b0'], ['#5a8270', '#a8b4a4']],", "['#7a6a90', '#a8a0b0'], ['#5a8270', '#a8b4a4'], ['#d8d4ca', '#eeeae2'], ['#cfc9bd', '#e6e0d4'], ['#e0dcd2', '#c8c2b6']],   // [inverno24] qualche intonaco bianco")
rep("const LIT = ['#ffb050', '#ffc470', '#ffb050', '#8fe0d4', '#ffb050', '#6fb8d8'];", "const LIT = ['#ffb050', '#ffc470', '#ffb050', '#ffa040', '#ffc880', '#f0d0a0'];   // [inverno24] finestre calde")
rep("const NQ = ['#d4d0c6', '#b84a3c', '#d8904a']", "const NQ = ['#e8d8bc', '#b84a3c', '#f0a048']")
s = s.replace("'#d8904a'", "'#f0a048'")
rep("float REG_SAT = .38, REG_BIANCO = .16;", "float REG_SAT = .62, REG_BIANCO = .1;")
rep("float keep = max(REG_SAT, max(rosso*.95, hot*.85));", "float keep = max(REG_SAT, max(rosso*1.05, hot*1.0));")
rep("c *= mix(vec3(1.), vec3(.93,1.,1.05), smoothstep(.28,.8,l)*(1.-hot));", "c *= mix(vec3(1.), vec3(1.02,1.,.96), smoothstep(.28,.8,l)*(1.-hot));   // [inverno24] alte luci appena calde, non azzurrine")
rep("l.intensity = L.base * k * fadeD * .62;", "l.intensity = L.base * k * fadeD * .8;")
open(p, 'w', encoding='utf-8').write(s); print('ok')
