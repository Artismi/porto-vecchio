  window.__scene = (E) => {
    const { add, house } = E, r = rng(5);
    const T = (o) => { const t = tetto1(o); add(t.grp); return t; };
    // fila 1: capanna coppi, padiglione ardesia, capanna lamiera, falda
    house(-30, -20, 10, 8, 6, '#d8d2c4'); T({ x0: -30, z0: -20, w: 10, d: 8, y: 6, base: 0, kind: 'coppi', shape: 'capanna', pitch: .38, ov: .5, wallHex: '#d8d2c4', r: rng(1), chim: 2, rafters: true, sky: true, dormer: true });
    house(-14, -20, 9, 9, 8.4, '#c29a5c'); { const t = T({ x0: -14, z0: -20, w: 9, d: 9, y: 8.4, base: 0, kind: 'ardesia', shape: 'padiglione', pitch: .5, ov: .5, wallHex: '#c29a5c', r: rng(2), chim: 1, dormer: true }); const a = oAntenna(2.6, .5, rng(3)); a.position.copy(t.slots[1]); add(a); }
    house(2, -20, 12, 8, 4, '#7f8a8c'); T({ x0: 2, z0: -20, w: 12, d: 8, y: 4, base: 0, kind: 'lamiera', shape: 'capanna', pitch: .2, ov: .35, wallHex: '#7f8a8c', r: rng(4), chim: 0 });
    house(18, -20, 6, 5, 3.6, '#b26a4c'); T({ x0: 18, z0: -20, w: 6, d: 5, y: 3.6, base: 0, kind: 'eternit', shape: 'falda', pitch: .22, ov: .35, wallHex: '#b26a4c', r: rng(5), chim: 1 });
    // fila 2: padiglione coppi grande, capanna coppi stretta lunga ruotata, tetto piano col torrino
    house(-30, -4, 12, 12, 10.8, '#e0d4b8'); T({ x0: -30, z0: -4, w: 12, d: 12, y: 10.8, base: 0, kind: 'coppi', shape: 'padiglione', pitch: .38, ov: .55, wallHex: '#e0d4b8', r: rng(6), chim: 2, rafters: true, gutter: 'rame' });
    house(-12, -4, 6, 14, 6, '#8e9a76'); T({ x0: -12, z0: -4, w: 6, d: 14, y: 6, base: 0, kind: 'coppi', shape: 'capanna', pitch: .42, ov: .5, wallHex: '#8e9a76', r: rng(7), chim: 2, rafters: true, kindV: 1, dormer: true });
    house(0, -4, 12, 10, 8.4, '#cfccc2'); { const g = new THREE.Group(); const dm = deckMat1('guaina', 12, 10); const dk = new THREE.Mesh(new THREE.BoxGeometry(12, .12, 10), dm); dk.position.set(6, 8.42, -4 + 5); g.add(dk);
      [[6, -4, 12.3, .3], [6, 6, 12.3, .3], [0, 1, .3, 10], [12, 1, .3, 10]].forEach(([x, z, w, d]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, .6, d), plasterMat1('#cfccc2')); p.position.set(x, 8.7, z); g.add(p); });
      copertina1(g, 0, -4, 12, 10, 9.0, .3); bocchettone1(g, 12.1, 8.6, 3, 1, 0, 8.4); bocchettone1(g, 4, 8.6, 6.1, 0, 1, 8.4);
      torrino1(g, 2.2, 8.48, -1.6, 0, '#cfccc2', rng(9)); const ac = oAC(rng(10)); ac.position.set(9, 8.48, -2.6); g.add(ac); const ac2 = oAC(rng(11)); ac2.position.set(10.3, 8.48, -2.6); g.add(ac2); const tk = oTank(0, rng(12)); tk.position.set(6.5, 8.48, -2.4); g.add(tk); add(g); }
    house(16, -4, 8, 8, 8.4, '#c49282'); { const g = new THREE.Group(); const dk = new THREE.Mesh(new THREE.BoxGeometry(8, .12, 8), deckMat1('pianelle', 8, 8)); dk.position.set(20, 8.42, 0); g.add(dk); copertina1(g, 16, -4, 8, 8, 8.9, .3, '#e2ddd2');
      [[20, -4, 8.3, .3], [20, 4, 8.3, .3], [16, 0, .3, 8], [24, 0, .3, 8]].forEach(([x, z, w, d]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, .5, d), plasterMat1('#c49282')); p.position.set(x, 8.65, z); g.add(p); }); torrino1(g, 17.6, 8.48, -2.2, Math.PI / 2, '#c49282', rng(13)); add(g); }
  };
