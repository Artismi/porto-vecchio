# [distributore1] Il distributore di benzina rifatto dov'è davvero. Prima: il chiosco era una scatola bianca di 3 m e la
# pensilina, le pompe, il totem dei prezzi, la scatola di dissolvenza e gli oggetti avevano le coordinate della vecchia
# mappa (16*TS, 18*TS...), quindi finivano lontano. Ora tutto è relativo all'edificio (b.x, b.y, la strada a nord, la porta
# a ovest, il piazzale libero a est): chiosco con vetrine, porta, fascia gialla, parapetto, condizionatore, cartelli;
# pensilina sul piazzale a est con due isole di pompe; totem dei prezzi sul ciglio della strada; olio, gomme e fusti.
# Uso: python3 strumenti_inverno/distributore1.py src/render.js   (dopo bombolette1.py). Guardia [distributore1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[distributore1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# il chiosco e la pensilina
i0 = s.index("    if (b.id === 'benzina') {\n      const k = box(w - .4, 3, d - .4, sm('#f4f0e6'));")
i1 = s.index("    } else {\n      // bar della spiaggia")
s = s[:i0] + """    if (b.id === 'benzina') {   // [distributore1] tutto attorno all'edificio vero
      const y0 = base, H = 3.2, white = sm('#ece6d8'), glass = std({ color: '#9fb8c0', roughness: .15, metalness: .3, emissive: '#ffd890', emissiveIntensity: .25 }), dark = sm('#2a2c30'), yel = sm('#e8c030'), red = sm('#c8282a');
      const at = (m, x, y, z) => { m.position.set(x, y0 + y, z); g.add(m); return m; };
      at(box(w - .4, .3, d - .4, sm('#9a948a')), cx, .15, cz);                        // zoccolo
      at(box(w - .6, H, d - .6, white), cx, .3 + H / 2, cz);                          // il chiosco
      const ring = (h, y, m, e) => { at(box(w - .2 + e, h, .16, m), cx, y, z0 + .1 - e / 2); at(box(w - .2 + e, h, .16, m), cx, y, z0 + d - .1 + e / 2); at(box(.16, h, d - .2 + e, m), x0 + .1 - e / 2, y, cz); at(box(.16, h, d - .2 + e, m), x0 + w - .1 + e / 2, y, cz); };
      ring(.7, .3 + H + .35, yel, 0); ring(.14, .3 + H + .05, red, .05);               // fascia gialla col marchio, filo rosso
      at(box(w - .5, .12, d - .5, sm('#6a6660')), cx, .3 + H + .1, cz);                // il tetto piano, catramato
      at(box(w - .2, .25, .12, white), cx, .3 + H + .82, z0 + .14); at(box(w - .2, .25, .12, white), cx, .3 + H + .82, z0 + d - .14);   // parapetto
      at(box(.12, .25, d - .2, white), x0 + .14, .3 + H + .82, cz); at(box(.12, .25, d - .2, white), x0 + w - .14, .3 + H + .82, cz);
      at(box(1.1, .6, .8, sm('#b8b8b0')), x0 + w - 1.6, .3 + H + 1, z0 + 1.4);           // condizionatore sul tetto
      // vetrina verso le pompe (est) e verso la strada (nord), con i montanti
      at(box(.08, 1.7, d - 1.6, glass), x0 + w - .28, 1.55, cz);
      for (let k = 0; k <= 3; k++) at(box(.12, 1.8, .1, dark), x0 + w - .26, 1.55, z0 + .8 + k * (d - 1.6) / 3);
      at(box(w - 2.2, 1.3, .08, glass), cx + .4, 1.75, z0 + .28);
      for (let k = 0; k <= 2; k++) at(box(.1, 1.4, .12, dark), x0 + 1.5 + k * (w - 2.2) / 2, 1.75, z0 + .26);
      at(box(w - 2.2, .55, .1, sm('#7a7a78')), cx + .4, 2.6, z0 + .25);                 // la saracinesca mezza abbassata
      // la porta a ovest (dove dice la mappa), con la tettoia e il campanello
      const dz = (b.door ? (b.door[1] + .5) * TS : cz); at(box(.1, 2.2, 1.1, dark), x0 + .26, 1.4, dz); at(box(.06, 1.9, .8, glass), x0 + .22, 1.4, dz);
      at(box(.9, .1, 1.6, red), x0 - .1, 2.75, dz);
      // cartelli e cose contro i muri
      const ad = at(box(1.4, 1, .05, sm('#2a5ab8')), x0 + 1.4, 1.6, z0 + d - .28); at(box(1.2, .2, .06, yel), ad.position.x, 1.85, z0 + d - .26);
      at(box(1.2, .9, .7, sm('#e8e8f0')), x0 - .5, .75, dz + 1.4);                      // la cassa del ghiaccio
      at(box(1.6, .1, .45, sm('#8a6440')), x0 - .45, .5, dz - 1.6); at(box(.1, .45, .4, dark), x0 - .45 - .7, .25, dz - 1.6); at(box(.1, .45, .4, dark), x0 - .45 + .7, .25, dz - 1.6);   // la panca
      // pensilina sul piazzale a est
      const px0 = x0 + w + 1, px1 = x0 + w + 11, pz0 = z0 - 1, pz1 = z0 + d + 1, pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2;
      at(box(px1 - px0, .5, pz1 - pz0, sm('#f4f0e6')), pcx, 4.75, pcz);
      at(box(px1 - px0 + .1, .3, pz1 - pz0 + .1, red), pcx, 4.4, pcz);
      at(box(px1 - px0 + .12, .12, pz1 - pz0 + .12, yel), pcx, 4.22, pcz);
      [[px0 + 1.2, pz0 + 1.2], [px1 - 1.2, pz0 + 1.2], [px0 + 1.2, pz1 - 1.2], [px1 - 1.2, pz1 - 1.2]].forEach(([x, z]) => at(box(.35, 4.2, .35, sm('#d8d4cc')), x, 2.1, z));
      [pz0 + 2.6, pz1 - 2.6].forEach(z => at(box(px1 - px0 - 3, .25, 1.2, sm('#b8b2a6')), pcx, .12, z));   // le isole delle pompe
      neonTube(px0, 4.12, pz1 + .07, px1, 4.12, pz1 + .07, neon, g); neonTube(px0, 4.12, pz0 - .07, px1, 4.12, pz0 - .07, '#ff4a4a', g);
      for (let k = 0; k < 3; k++) addLight(px0 + 2 + k * 3, y0 + 4, pcz, '#f4f8ff', 2.4, 9, 0).always = true;
      b.__fuel = { px0, px1, pz0, pz1, y0 };
""" + s[i1:]

# insegna, totem dei prezzi, scatola di dissolvenza
rep("""    if (b.id === 'benzina') { sg.position.set(20 * TS, 4.6, 21 * TS + 1.47); const tot = box(.4, 5, .4, sm('#d8d4cc')); tot.position.set(15.5 * TS, 2.5, 22 * TS); addStatic(tot); const tsg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ map: priceTexture(), toneMapped: false, side: THREE.DoubleSide })); tsg.position.set(15.5 * TS, 5.2, 22 * TS + .22); scene.add(tsg); }""",
"""    if (b.id === 'benzina') {   // [distributore1] l'insegna sulla fascia verso la strada, il totem dei prezzi sul ciglio
      const F = b.__fuel; sg.position.set(cx, F.y0 + 3.85, z0 - .12); sg.rotation.y = Math.PI;
      const tx = F.px1 - .6, tz = F.pz0 - 1.2, tot = box(.4, 5, .4, sm('#d8d4cc')); tot.position.set(tx, F.y0 + 2.5, tz); addStatic(tot);
      const tsg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ map: priceTexture(), toneMapped: false, side: THREE.DoubleSide })); tsg.position.set(tx, F.y0 + 5.2, tz - .22); scene.add(tsg);
    }""")
rep("""box3: b.id === 'benzina' ? new THREE.Box3(new THREE.Vector3(32, 0, 36.4), new THREE.Vector3(56, 5, 43.4)) :""",
    """box3: b.id === 'benzina' ? new THREE.Box3(new THREE.Vector3(x0, 0, z0 - 1), new THREE.Vector3(x0 + w + 11, 5, z0 + d + 1)) :   /* [distributore1] chiosco e pensilina */""")

# pompe, olio, gomme, fusti: sotto la pensilina e attorno
rep("""    fuelPump(17 * TS + 1, 19.2 * TS, Math.PI / 2, '#d8282a'); fuelPump(17 * TS + 1, 20.8 * TS, Math.PI / 2, '#e8c030');
    oilRack(26 * TS, 21.3 * TS, 0, r); tireStack(28.6 * TS, 20.4 * TS, 5); drumGroup(22.4 * TS, 18.2 * TS, r, ['#c8302a', '#e8c030', '#2a5ab8']);""",
"""    { const bz = G.BUILDINGS.find(q => q.id === 'benzina');   // [distributore1] attorno al distributore vero
      if (bz) { const x0 = bz.x * TS, z0 = bz.y * TS, w = bz.w * TS, d = bz.h * TS, px0 = x0 + w + 1, px1 = x0 + w + 11, pz0 = z0 - 1, pz1 = z0 + d + 1;
        [pz0 + 2.6, pz1 - 2.6].forEach((z, j) => [px0 + 3, (px0 + px1) / 2, px1 - 3].forEach((x, k) => fuelPump(x, z, 0, ['#d8282a', '#e8c030', '#2a8a4a'][(k + j) % 3])));
        oilRack(x0 + w - 1.4, z0 + d + .55, 0, r); tireStack(px1 + .8, pz1 - .6, 5); tireStack(px1 + .8, pz1 - 1.5, 3); drumGroup(x0 + .6, z0 + d + 1.1, r, ['#c8302a', '#e8c030', '#2a5ab8']); } }""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
