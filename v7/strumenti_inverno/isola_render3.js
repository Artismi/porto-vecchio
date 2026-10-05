  // ================= [isola34] LE CASE COI PEZZI VERI: kit Retro Urban (blocchi di mattone e di pannelli, porte, finestre, serrande,
  // scale antincendio, balconi, tettoie, lampade, mattoni scrostati, ponteggi). Città bassa, case diverse una dall'altra. =================
  const K34 = { mats: new Map() };
  const FH = 2.5;   // altezza di un piano fatto coi blocchi
  // tinta di un materiale del kit (mattoni più chiari o più scuri, pannelli sbiaditi), con la cache
  function tintMat(m, tint) { const k = m.uuid + tint; if (K34.mats.has(k)) return K34.mats.get(k); const n = m.clone(); n.color = new THREE.Color(tint); K34.mats.set(k, n); return n; }
  function piece34(grp, name, x, y, z, ry, sx, sy, sz, tint) {
    const o = Kit.get('urbano/' + name); if (!o.children.length) return null;
    if (tint) o.traverse(m => { if (m.isMesh) m.material = tintMat(m.material, tint); });
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.set(sx, sy, sz); grp.add(o); return o;
  }
  const TINT = { a: ['#ffffff', '#f2e6dc', '#e0d0c4', '#d8c8bc', '#f8f0e8', '#cdbfb2'], b: ['#ffffff', '#d8e0d0', '#e4dccc', '#c8d0cc', '#d0c8b8'] };
  // quale casa fare coi pezzi: case di città senza gradoni, una parte (le altre restano d'intonaco col Building Kit: i tipi si mescolano)
  function usaKit34(b) {
    if (!Kit.has || !Kit.has('urbano/wall-a') || !b.house || b.shack || b.fisher || b.farm || b.block || b.tiers || b.name) return false;
    const z = zoneT(b.x, b.y); if (z !== ZN.CITTA) return false;
    return th(b.x, b.y, 341) < .58;
  }
  function casaKit(b, i, base, low, plinth) {
    const r = rng(i * 131 + 17), w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group();
    const fl = Math.max(1, b.fl), dd = M.world && M.world.districtAt ? M.world.districtAt(cx) : 'centro';
    // il carattere: mattoni (casa popolare, scale antincendio), pannelli (lamiera verde del porto e delle periferie), misto (botteghe di mattoni, sopra i pannelli)
    const q = r(), fam = dd === 'centro' ? (q < .6 ? 'a' : q < .85 ? 'mix' : 'b') : dd === 'perif_e' || dd === 'porto' ? (q < .3 ? 'a' : q < .55 ? 'mix' : 'b') : (q < .45 ? 'a' : q < .7 ? 'mix' : 'b');
    const tintA = pick(r, TINT.a), tintB = pick(r, TINT.b), painted = r() < .45;
    const kindAt = f => fam === 'mix' ? (f === 0 ? 'a' : 'b') : fam;
    const T = G.T, open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY || v === T.DIRT; };
    const face = faceOf(b), dk = b.door ? b.door : null;
    // i quattro lati: per ogni casella del perimetro la normale verso fuori
    const sides = [
      { f: 'S', n: [0, 1], cells: k => [b.x + k, b.y + b.h - 1], count: b.w, out: k => [b.x + k, b.y + b.h] },
      { f: 'N', n: [0, -1], cells: k => [b.x + k, b.y], count: b.w, out: k => [b.x + k, b.y - 1] },
      { f: 'E', n: [1, 0], cells: k => [b.x + b.w - 1, b.y + k], count: b.h, out: k => [b.x + b.w, b.y + k] },
      { f: 'W', n: [-1, 0], cells: k => [b.x, b.y + k], count: b.h, out: k => [b.x - 1, b.y + k] },
    ];
    const winCol = new Map();   // finestre in colonna: la stessa colonna ha la finestra a tutti i piani (quasi)
    const SX = TS, SZ = TS;
    sides.forEach(sd => {
      const ry = Math.atan2(-sd.n[0], -sd.n[1]), street = Array.from({ length: sd.count }, (_, k) => open(...sd.out(k)));
      for (let k = 0; k < sd.count; k++) {
        const [tx, ty] = sd.cells(k), corner = (k === 0 || k === sd.count - 1) && sd.count > 1;
        // il blocco sta al centro della casella; la faccia con la porta/finestra (−Z del pezzo) guarda fuori
        const px = tx * TS + 1, pz = ty * TS + 1, colKey = sd.f + k, isWinCol = winCol.has(colKey) ? winCol.get(colKey) : (winCol.set(colKey, !corner && r() < (street[k] ? .72 : .4)), winCol.get(colKey));
        for (let f = 0; f < fl; f++) {
          const kk = kindAt(f), tint = kk === 'a' ? tintA : tintB, y = base + f * FH;
          let nm;
          if (f === 0) {
            const isDoor = dk && sd.f === face && sd.out(k)[0] === dk[0] && sd.out(k)[1] === dk[1];
            if (isDoor) nm = `wall-${kk}-door`;
            else if (street[k] && (b.shop || r() < .22) && !corner) nm = `wall-${kk}-garage`;   // le serrande delle botteghe
            else nm = isWinCol && r() < .8 ? `wall-${kk}-window` : kk === 'a' && painted ? 'wall-a-painted' : `wall-${kk}`;
          } else nm = isWinCol && r() < .9 ? `wall-${kk}-window` : (kk === 'a' && painted && f === fl - 1 ? 'wall-a-painted' : `wall-${kk}`);
          // i blocchi degli angoli girano in modo che il loro lato liscio non mostri una finestra sul fianco
          piece34(grp, nm, px, y, pz, ry, SX, FH, SZ, tint);
          // finestra accesa: un pannello caldo appena dietro il vetro, a caso
          if (nm.includes('window') && r() < .32) { const lp = new THREE.Mesh(new THREE.PlaneGeometry(TS * .42, FH * .36), litMat(pick(r, LIT))); lp.position.set(px + sd.n[0] * (TS / 2 + .015), y + FH * .5, pz + sd.n[1] * (TS / 2 + .015)); lp.rotation.y = Math.atan2(sd.n[0], sd.n[1]); grp.add(lp); }
        }
      }
      // tettoie sopra le botteghe e le finestre del piano terra sulla strada, lampada vicino alla porta
      for (let k = 0; k < sd.count; k++) if (street[k] && r() < .3) { const [tx, ty] = sd.cells(k); piece34(grp, 'detail-awning-wide', tx * TS + 1 + sd.n[0] * (TS / 2 + .3), base + FH * .78, ty * TS + 1 + sd.n[1] * (TS / 2 + .3), Math.atan2(sd.n[0], sd.n[1]), SX, FH, SZ * 1.3, pick(r, ['#ffffff', '#c8b8a0', '#a8b0b8'])); }
      if (sd.f === face && dk) { const [tx, ty] = sd.cells(Math.max(0, Math.min(sd.count - 1, (sd.f === 'S' || sd.f === 'N' ? dk[0] - b.x : dk[1] - b.y) + 1))); const lx = tx * TS + 1 + sd.n[0] * (TS / 2 + .05), lz = ty * TS + 1 + sd.n[1] * (TS / 2 + .05); piece34(grp, 'detail-light-single', lx, base + FH * .55, lz, Math.atan2(-sd.n[0], -sd.n[1]) + Math.PI / 2, 1.6, 1.6, 1.6); addLight(lx + sd.n[0] * .6, base + 2.1, lz + sd.n[1] * .6, '#ffc070', 1.1, 5, .05); }
    });
    // la scala antincendio: sulle case di mattoni a due o più piani, su un lato che dà sulla strada
    const fire = fl >= 2 && fam !== 'b' && r() < .62 && sides.filter(sd => sd.count >= 3 && Array.from({ length: sd.count }, (_, k) => open(...sd.out(k))).filter(Boolean).length >= 2);
    if (fire && fire.length) { const sd = pick(r, fire), k = 1 + Math.floor(r() * (sd.count - 2)), [tx, ty] = sd.cells(k), ry = Math.atan2(-sd.n[0], -sd.n[1]), off = TS / 2 + .28;
      for (let f = 1; f < fl; f++) piece34(grp, f === 1 ? 'balcony-ladder-bottom' : 'balcony-ladder-top', tx * TS + 1 + sd.n[0] * off, base + f * FH - (f === 1 ? FH * .72 * 0 : 0), ty * TS + 1 + sd.n[1] * off, ry + Math.PI, SX, FH, 2.2); }
    // balconi qua e là ai piani alti
    sides.forEach(sd => { for (let f = 1; f < fl; f++) if (r() < .16) { const k = Math.floor(r() * sd.count), [tx, ty] = sd.cells(k); if (!open(...sd.out(k))) continue; piece34(grp, 'balcony-type-a', tx * TS + 1 + sd.n[0] * (TS / 2 + .28), base + f * FH, ty * TS + 1 + sd.n[1] * (TS / 2 + .28), Math.atan2(-sd.n[0], -sd.n[1]) + Math.PI, SX, FH, 2.2); } });
    // mattoni scrostati ai piedi, a volte un ponteggio
    for (let k = 0; k < 2; k++) if (r() < .35) { const sd = pick(r, sides), kk = Math.floor(r() * sd.count), [tx, ty] = sd.cells(kk); piece34(grp, r() < .5 ? 'detail-bricks-type-a' : 'detail-bricks-type-b', tx * TS + 1 + sd.n[0] * (TS / 2 + .5), base, ty * TS + 1 + sd.n[1] * (TS / 2 + .5), r() * 6, 2, 2, 2); }
    if (r() < .07 && fl >= 2) { const sd = pick(r, sides), [tx, ty] = sd.cells(Math.floor(sd.count / 2)); for (let f = 0; f < fl; f++) piece34(grp, 'scaffolding-structure', tx * TS + 1 + sd.n[0] * (TS + .2), base + f * FH, ty * TS + 1 + sd.n[1] * (TS + .2), 0, SX, FH, SZ); }
    // il tetto: piatto col parapetto basso, a falde di lamiera, o il telaio di ferro con le cose stese sopra
    const top = base + fl * FH, rq = r();
    const slab = box(w - .05, .2, d - .05, sm('#6e6a64', { roughness: 1 })); slab.position.set(cx, top - .1, cz); grp.add(slab);
    let flat = true;
    if (rq < .5) sides.forEach(sd => { for (let k = 0; k < sd.count; k++) { const [tx, ty] = sd.cells(k); piece34(grp, kindAt(fl - 1) === 'a' ? 'wall-a-low' : 'wall-b-low', tx * TS + 1, top, ty * TS + 1, Math.atan2(-sd.n[0], -sd.n[1]), SX, FH * .7, SZ, kindAt(fl - 1) === 'a' ? tintA : tintB); } });
    else if (rq < .82) { flat = false; const along = w >= d, rh = Math.min(2.4, (along ? d : w) * .3), rm = std({ map: tinTex.clone(), color: pick(r, ['#8a8290', '#7a6e64', '#6e7470', '#8a7a6a']), emissive: '#0c0e14' }); rm.map.needsUpdate = true; rm.map.repeat.set((along ? w : d) / 4, 2);
      const roof = new THREE.Mesh(roofGeo(along ? w + .6 : d + .6, along ? d + .6 : w + .6, rh), rm); if (!along) roof.rotation.y = Math.PI / 2; roof.position.set(cx, top, cz); roof.userData.keep = true; grp.add(roof); }
    else { for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) if (r() < .45) piece34(grp, 'roof-metal-poles', tx * TS + 1, top, ty * TS + 1, 0, SX, 1.6, SZ); }
    // lo zoccolo dove il terreno scende
    if (plinth > 0) { const pl = box(w + .2, plinth + .1, d + .2, std({ map: stoneTexture() })); pl.position.set(cx, low + plinth / 2, cz); grp.add(pl); }
    const core = box(w - .4, fl * FH - .1, d - .4, std({ color: '#100c16', roughness: 1 })); core.position.set(cx, base + fl * FH / 2, cz); grp.add(core);
    shadowed(grp); const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);
    const rec = { b, flat, grp: merged, fade: 0, box3: new THREE.Box3(new THREE.Vector3(x0 + .3, low, z0 + .3), new THREE.Vector3(x0 + w - .3, top + 2.5, z0 + d - .3)), mats: [] };
    ownMats(merged, rec); dyn.buildings.push(rec); rec.geo = { x0, z0, w, d, y0: base, H: top - base }; DZ.bRec[i] = rec; b.__top = top;
    if (b.sign) addSign(b, base, w, d, x0, z0, top, base + 3.0, base + 2.55);
  }
