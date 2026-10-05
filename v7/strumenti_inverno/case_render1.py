# [case] Case col carattere: intonaci caldi e diversi per piano, persiane, fioriere, tende, bovindi a sbalzo, tettoie in coppi,
# lanterne, intonaco scrostato coi mattoni, umidità, colature, edera, giardini pensili, bucato. Frammento: case_carattere.js.
# Si applica per ultimo, dopo tutta la catena inverno_render*, monte_render, interni_render e luci_regia* (guardia «già applicato»).
import sys, os, re
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[case]' in s: print('già applicato'); sys.exit()
D = os.path.dirname(os.path.abspath(__file__))
frag = ''.join(open(os.path.join(D, n), encoding='utf-8').read() for n in ('forme.js', 'case_carattere.js', 'case_pienezza.js'))
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
# intonaci: tinte calde e scolorite (ocra, cotto, sangue di bue, senape, rosa antico, salvia, verderame), qualche bianco
m = re.search(r"\n    borgo: \[\[.*\n", s); assert m, 'PALS.borgo'
s = s[:m.start()] + """
    borgo: [['#d6d4cc', '#eeece6'], ['#cfccc2', '#e8e6de'], ['#c8c6be', '#e2e0d8'], ['#dcd8ce', '#f0ece4'], ['#bebcb6', '#dcdad4'], ['#d0cdc4', '#ebe8e0'], ['#b8b6ae', '#d8d6ce'], ['#c4c2bc', '#e6e4dc'],
      ['#d8d2c4', '#efeae0'], ['#cac6ba', '#e4e0d6'], ['#c29a5c', '#e0d4b8'], ['#b26a4c', '#dccbb0'], ['#8e9a76', '#d8d4c0'], ['#c49282', '#e4d8cc']],   // [case] grigio latte: la città è calma, il colore sta nei murali, nelle insegne, nelle luci
""" + s[m.end():]
# buildModular: tinta per piano (basamento, ultimo piano rifatto) e registro delle finestre per le persiane
rep("    const mat = palMat([pal[0], pal[1], roofKind === 'flat' ? '#a8a29a' : '#5a5560', kind === 'port' ? '#7a7f88' : '#3a3a44']);",
    "    const PA = [pal[0], pal[1], roofKind === 'flat' ? '#a8a29a' : '#5a5560', kind === 'port' ? '#7a7f88' : '#3a3a44'], mat = palMat(PA);\n"
    "    const CS = caseScheme(b, i, kind, PA, Math.max(1, b.fl)), matG = CS.g || mat, matF = f => CS.split && f >= CS.split ? CS.u : mat; let LW = null; b.__win = [];   // [case]")
rep("        const pc = modPiece(grp, name, mat, ...xyz(span === 2 ? sd.at(k + .5) : sd.at(k), base), sd.rot, isWin ? gm : null);",
    "        const pc = modPiece(grp, name, matG, ...xyz(span === 2 ? sd.at(k + .5) : sd.at(k), base), sd.rot, isWin ? gm : null);\n"
    "        b.__win.push({ f: sd.f, k, u: (span === 2 ? k + .5 : k) * TS + 1, y: base, name, g: true, lit: !!(isWin && gm), shop });   // [case]")
rep("        for (let s = 0; s < span; s++) modPiece(grp, 'wall-low', mat, ...xyz(sd.at(k + s), base + MF), sd.rot);",
    "        for (let s = 0; s < span; s++) modPiece(grp, 'wall-low', matG, ...xyz(sd.at(k + s), base + MF), sd.rot);")
rep("          if (sd.n % 2 === 1) { modPiece(grp, 'wall', mat, ...xyz(sd.at(0), y), sd.rot); k = 1; }",
    "          if (sd.n % 2 === 1) { modPiece(grp, 'wall', matF(f), ...xyz(sd.at(0), y), sd.rot); k = 1; }")
rep("{ modPiece(grp, 'wall', mat, ...xyz(sd.at(k), y), sd.rot); modPiece(grp, 'wall', mat, ...xyz(sd.at(k + 1), y), sd.rot); continue; } modPiece(grp, upper, mat, ...xyz(sd.at(k + .5), y), sd.rot, r() < .35 ? lit : null); }",
    "{ modPiece(grp, 'wall', matF(f), ...xyz(sd.at(k), y), sd.rot); modPiece(grp, 'wall', matF(f), ...xyz(sd.at(k + 1), y), sd.rot); continue; } modPiece(grp, upper, matF(f), ...xyz(sd.at(k + .5), y), sd.rot, LW = r() < .35 ? lit : null); b.__win.push({ f: sd.f, k, u: (k + .5) * TS + 1, y, name: upper, lit: !!LW }); }")
rep("          const pc = modPiece(grp, nm, mat, ...xyz(sd.at(k), y), sd.rot, r() < .3 ? lit : null);",
    "          const pc = modPiece(grp, nm, matF(f), ...xyz(sd.at(k), y), sd.rot, LW = r() < .3 ? lit : null); b.__win.push({ f: sd.f, k, u: k * TS + 1, y, name: nm, lit: !!LW });   // [case]")
# intonaco vero sui moduli (shader), e le copie per edificio lo tengono
rep("  function palMat(p) { const k = p.join(); return palMatCache[k] || (palMatCache[k] = std({ map: palTex(p[0], p[1], p[2], p[3]), roughness: .9 })); }",
    "  function palMat(p) { const k = p.join(); return palMatCache[k] || (palMatCache[k] = plasterize(std({ map: palTex(p[0], p[1], p[2], p[3]), roughness: .9 }))); }   // [case] intonaco")
rep("if (!cache.has(o.material)) cache.set(o.material, o.material.clone());",
    "if (!cache.has(o.material)) { const cl = o.material.clone(); cache.set(o.material, o.material.userData.plaster ? plasterize(cl) : cl); }")
# FORME: le primitive nude degli altri pass diventano oggetti veri (stesso numero di chiamate a r(): la città resta uguale)
rep("const tank = cyl(.7, .7, 1.4, 10, sm('#9a948a')); tank.position.set(cx + (r() - .5) * w * .4, top + .8, cz + (r() - .5) * d * .4); grp.add(tank);",
    "const tank = oTank(i % 3 === 0 ? 1 : 0, rng(i * 17 + 3)); tank.position.set(cx + (r() - .5) * w * .4, top + .08, cz + (r() - .5) * d * .4); grp.add(tank);   // [case] forme")
rep("ad(a, box(.8, .5, .45, acM), 0, base + MG + (f - 1) * MF + .2, .25); ad(a, cyl(.17, .17, .03, 8, pipeM), 0, base + MG + (f - 1) * MF + .2, .5).rotation.x = Math.PI / 2;",
    "ad(a, oAC(rng(bi * 79 + k), true), 0, base + MG + (f - 1) * MF - .05, .2);")
rep("put(box(.9, .6, .7, metal), x, .3, z, r() * 3); const f = cyl(.22, .22, .04, 10, dark); put(f, x, .62, z);",
    "put(oAC(rng(bi * 31 + k * 7)), x, 0, z, r() * 3);")
rep("put(cyl(.04, .04, 1.1, 5, metal), x, .55, z); const dish = cyl(.5, .06, .18, 12, sm('#c8ccd0', { roughness: .5 })); put(dish, x, 1.2, z).rotation.set(.9, r() * 6, 0);",
    "put(oDish(r() * 6, rng(bi * 37 + k)), x, 0, z);")
rep("put(cyl(.03, .035, 3.4, 5, metal), x, 1.7, z); const ry0 = r() * 3; for (let q = 0; q < 5; q++) put(box(1.3 - q * .22, .035, .035, metal), x, 1.4 + q * .45, z, ry0);",
    "const ry0 = r() * 3; put(oAntenna(3.4, ry0, rng(bi * 53 + k)), x, 0, z);")
rep("put(box(.8, .6, .8, wood), x, .3, z, r() * 1.5); if (r() < .6) put(box(.6, .5, .6, wood), x + .1, .85, z, r());",
    "put(oCrate(.8, .6, .8, rng(bi * 41 + k)), x, 0, z, r() * 1.5); if (r() < .6) put(oCrate(.6, .5, .6, rng(bi * 43 + k)), x + .1, .6, z, r());")
rep("put(cyl(.38, .38, .9, 10, rust), x, .45, z);", "put(oDrum(rng(bi * 47 + k)), x, 0, z);")
rep("const dsh = new THREE.Mesh(dishG, dishM); dsh.scale.setScalar(.8 + r() * .8); dsh.rotation.set(.9, r() * 6, 0); put(dsh, cx + (r() - .5) * pw, top + H + .6, cz + (r() - .5) * pd);",
    "const dsh = oDish(r() * 6, rng(bi * 59), .8 + r() * .8); put(dsh, cx + (r() - .5) * pw, top + H, cz + (r() - .5) * pd);")
rep("for (let k = 0; k < 2; k++) put(box(.8, .55, .6, acM), cx + (r() - .5) * pw * .7, top + H + .36, cz + (r() - .5) * pd * .7, r() * 3);",
    "for (let k = 0; k < 2; k++) put(oAC(rng(bi * 61 + k)), cx + (r() - .5) * pw * .7, top + H + .02, cz + (r() - .5) * pd * .7, r() * 3);")
rep("if (r() < .5) { put(cyl(.04, .04, 1.1, 5, iron), ax, top + .55, az); const ds = new THREE.Mesh(dishG, dishM); ds.scale.setScalar(.6 + r() * .7); ds.rotation.set(.9, r() * 6, 0); put(ds, ax, top + 1.2, az); } else { const hh = 2 + r() * 3; put(cyl(.03, .035, hh, 5, iron), ax, top + hh / 2, az); const ry0 = r() * 3; for (let c2 = 0; c2 < 5; c2++) put(box(1.3 - c2 * .22, .03, .03, iron), ax, top + hh * .45 + c2 * hh * .12, az, ry0); }",
    "if (r() < .5) { put(oDish(r() * 6, rng(bi * 67 + k), .6 + r() * .7), ax, top, az); } else { const hh = 2 + r() * 3, ry0 = r() * 3; put(oAntenna(hh, ry0, rng(bi * 71 + k)), ax, top, az); }")
rep("if (r() < .6) ad(a, box(.8, .55, .5, acM), -bw / 2 + .6, y + .4, .55);", "if (r() < .6) ad(a, oAC(rng(bi * 73 + k)), -bw / 2 + .6, y + .06, .5);")
# il murale del governo dipinto al posto del ritratto incollato
rep("  function propTex(kind, k) {\n    const key = kind + k; if (PROP[key]) return PROP[key];",
    "  function propTex(kind, k) {\n    const key = kind + k; if (PROP[key]) return PROP[key];\n    if (kind === 'ritratto') return PROP[key] = muralMat(k);   // [case] murale dipinto")
# la dissolvenza degli edifici non deve rendere opache le decalcomanie (sempre trasparenti: userData.keepTr)
rep("      B.mats.forEach(m => { const tr = op < .99; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; m.depthWrite = !tr; if (m.emissiveMap) m.emissiveIntensity *= op; });",
    "      B.mats.forEach(m => { const kt = m.userData.keepTr, tr = op < .99 || !!kt; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; m.depthWrite = !tr; if (m.emissiveMap) m.emissiveIntensity *= op; });   // [case] keepTr")
# [pulizia] tetti meno affollati; niente tendone delle soglie dove c'è già la tettoia in coppi
rep("      const slots = Math.min(13, 3 + Math.floor(w * d / 13));", "      const slots = Math.min(5, 1 + Math.floor(w * d / 36));   // [case] pulizia: meno roba sparsa sui tetti")
rep("      if (!(((b.shop || b.sign) && r() < .9) || r() < .5)) return;", "      if (b.__pent) return;   // [case] c'è già la tettoia in coppi\n      if (!(((b.shop || b.sign) && r() < .9) || r() < .5)) return;")
# più murali del Partito (muri ciechi), illuminati dai loro fari
rep("    const r = rng(i * 733 + 101), civic = kind === 'civic' || kind === 'mil'; if (r() > (civic ? .8 : .34)) return null;",
    "    const r = rng(i * 733 + 101), civic = kind === 'civic' || kind === 'mil'; if (r() > (civic ? .85 : .55)) return null;   // [case] più murali")
rep("        if (bi % 3 === 0) addLight(PP.x + Math.sin(PP.yaw) * 2, PP.yc - PP.ph / 2 + .4, PP.z + Math.cos(PP.yaw) * 2, '#e0a050', 1.8, 10, .02);   // faretto da sotto",
    "        { const lg = new THREE.Group(); muralLights(PP, lg); lg.traverse(o => { if (o.isMesh) o.castShadow = false; }); g.add(lg); }   // [case] due fari veri sul murale")
# il pass nuovo, dopo la città (che ha già messo torrette, balconi e insegne)
rep("  function buildCity() {", frag + "  function buildCity() {")
rep("TT('citta', buildCity);", "TT('citta', buildCity); TT('case', buildCase);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
