# [luci 1] Regia della luce: la città col coprifuoco prende posizione.
#  - lampioni da strada = sodio arancio cupo (non più bianchi a caso); vetrine e finestre = incandescenza calda;
#  - luce bianca e dura SOLO nei luoghi del regime (caserma, Rocca, Muro, varco, Base, Palazzo della Cultura), che a tratti sfarfalla;
#  - attorno ai bar luce bassa rosso-ambra; al porto sodio più cupo;
#  - il post-processing non spegne più il colore delle pozze calde (prima diventavano bianco-grigie);
#  - fra un cono e l'altro buio vero: meno cielo e meno luna di notte;
#  - i globi del Lungomare non sono più rosa/ciano (luci di Natale).
# Dopo inverno_render30 (luce cotta). Non dipende dagli script della mappa (inverno_render31+).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

# 1) i toni delle luci: decide la regia, non il caso
rep("""  function tone(hex, x, z) { const q = nq(hex); if (q === '#' + NQ[1].getHexString()) return q; const c = new THREE.Color(hex), h = {}; c.getHSL(h); if (h.s < .2 && h.l > .85) return hex;
    let k = Math.imul((Math.round(x * 2) * 73856093) ^ (Math.round(z * 2) * 19349663), 2654435761) >>> 0; return LTONES[k % LTONES.length]; }""",
"""  // [luci1] REGIA: sodio per le strade, incandescenza per la gente, bianco duro solo per il regime, rosso-ambra ai bar
  const LSOD = ['#ff9a3c', '#ffa246', '#ff9034', '#ffaa50', '#ff983a'], LPORTO = ['#ff8a2c', '#ff9234', '#ff8428'];
  const LINC = ['#ffc274', '#ffb562', '#ffcf8a', '#ffa850', '#ffbd6a'], LBAR = ['#ff7040', '#ff8248', '#ff6a3a', '#ff7a3c'], LREG = '#dde6e2';
  const LAMPS = ['#ffb35c', '#ffa84a', '#ffb85c'];   // chi chiama addLight/glow con questi colori è un lampione da strada
  let ZONES = null;
  function zoneAt(x, z) {
    if (!ZONES) { ZONES = []; const P = G.PLACES || {};
      const put = (ids, k, r) => ids.forEach(id => { const q = P[id]; if (q) ZONES.push({ x: q.x, z: q.y, k, r2: r * r }); });
      put(['commissariato', 'caserma_p', 'rocca', 'varco', 'muro', 'cultura', 'hangar1', 'hangar2', 'deposito_n', 'deposito_s', 'eliporto', 'poligono', 'governo', 'garante', 'ministero', 'pietra', 'archivio'], 'regime', 14);
      put(['piazza_gov'], 'regime', 22);   // quartiere del governo (mappa nuova)
      put(['sirena', 'bar', 'osteria', 'miramare', 'stella', 'aurora', 'gabbiano', 'flamingo', 'paradiso', 'oceano', 'disco', 'flipper', 'chiosco', 'osteria_sg'], 'bar', 9);
      put(['molo', 'calata', 'pontile', 'marina', 'molo_cargo', 'cantiere'], 'porto', 16); }
    let best = null, bd = 1e9; for (const Z of ZONES) { const d = (Z.x - x) * (Z.x - x) + (Z.z - z) * (Z.z - z); if (d < Z.r2 && d < bd) { bd = d; best = Z.k; } }
    return best; }
  function tone(hex, x, z) { const q = nq(hex); if (q === '#' + NQ[1].getHexString()) return q; const c = new THREE.Color(hex), h = {}; c.getHSL(h);
    const zo = zoneAt(x, z), lamp = LAMPS.includes(hex), k = Math.imul((Math.round(x * 2) * 73856093) ^ (Math.round(z * 2) * 19349663), 2654435761) >>> 0;
    if (h.s >= .5 && h.h * 360 < 26) return hex;                  // fuochi e rossi: restano come sono
    if (zo === 'regime') return LREG;                              // la luce del potere è bianca e dura
    if (h.s < .2 && h.l > .85) return hex;                         // riflettori, fari: già bianchi
    if (lamp) return zo === 'porto' ? LPORTO[k % LPORTO.length] : LSOD[k % LSOD.length];
    if (zo === 'bar') return LBAR[k % LBAR.length];
    return LINC[k % LINC.length]; }""")

# 2) nei luoghi del regime qualche tubo sfarfalla
rep("""  function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(tone(color, x, z)), base: intensity, dist: distance, flick: flick || 0, phase: Math.random() * 10 }; LSRC.push(rec); return rec; }""",
"""  function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(tone(color, x, z)), base: intensity, dist: distance, flick: flick || 0, phase: Math.random() * 10 }; LSRC.push(rec);
    if (zoneAt(x, z) === 'regime' && rec.flick < .25 && (Math.floor(x * 3 + z * 5) & 3) === 0) rec.flick = .6;   // [luci1] neon della caserma che sfarfalla
    return rec; }""")

# 3) Lungomare: globi color latte caldo, non più rosa e ciano
rep("""      const globe = add(g, new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8), sb('#ffe0f0')), 0, 5.35, 0); globe.userData.keep = true;
      ly = 5.35; col = pick(rng(Math.floor(x * 7 + z)), ['#ff7ac0', '#6ae8ff', '#ffb0e0']); lcol = '#ffe0f0';""",
"""      const globe = add(g, new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8), sb('#ffe2b8')), 0, 5.35, 0); globe.userData.keep = true;
      ly = 5.35; col = '#ffb85c'; lcol = '#ffe2b8';   // [luci1] niente globi rosa/ciano""")

#    il faretto sta dentro la testa del lampione: il lampione non deve fare ombra alla sua stessa luce
#    (prima disegnava un ottagono scuro sotto i lampioni della piazza)
rep("    g.position.set(x, y0, z); g.rotation.y = rot || 0; const tag = kind === 'wall' ? null : newTag(); curTag = tag; addStatic(g); curTag = null;",
    "    g.position.set(x, y0, z); g.rotation.y = rot || 0; const tag = kind === 'wall' ? null : newTag(); curTag = tag; addStatic(g, true); curTag = null;   // [luci1] niente ombra propria")

# 4) luce cotta: i coni al sodio un po' più pieni (il colore è più cupo di prima)
rep("I = L.base * (L.spill ? .55 : .38) * (L.flick > .5 ? .7 : 1);",
    "I = L.base * (L.spill ? .55 : .46) * (L.flick > .5 ? .7 : 1);   // [luci1]")

# 5) buio vero fra un cono e l'altro
rep("    hemi.intensity = .22 + (1 - night) * .3 + night * .08;",
    "    hemi.intensity = .22 + (1 - night) * .3 - night * .03;   // [luci1] di notte meno cielo")
rep("    moon.intensity = .34 + (1 - night) * .68;",
    "    moon.intensity = .25 + (1 - night) * .77; /* [luci1] di notte meno luna */")

# 6) post: le pozze calde tengono il loro colore (prima il grading le portava al bianco-grigio)
rep("""          float hot = smoothstep(.5,.9,chroma*max(max(c.r,c.g),c.b)*2.);
""", """          float hot = smoothstep(.5,.9,chroma*max(max(c.r,c.g),c.b)*2.);
          float warmL = smoothstep(.06,.16, c.r-c.b) * smoothstep(.08,.28, max(max(c.r,c.g),c.b)) * smoothstep(.55,.95, night);   // [luci1] luce calda di notte
""")
rep("          c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6, (1.-smoothstep(.0,.62,l))*.9);",
    "          c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6, (1.-smoothstep(.0,.62,l))*.9*(1.-warmL*.75));")
rep("          c = mix(vec3(l), c, mix(.66, 1.3, hot)*sat);",
    "          c = mix(vec3(l), c, mix(.66, 1.3, max(hot, warmL*.85))*sat);")
rep("            float keep = max(REG_SAT, max(rosso*1.05, hot*1.0));",
    "            float keep = max(max(REG_SAT, warmL), max(rosso*1.05, hot*1.0));")

open(p, 'w', encoding='utf-8').write(s); print('ok')
