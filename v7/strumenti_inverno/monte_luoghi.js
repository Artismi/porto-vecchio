      // [monte] i posti del Monte Scuro
      else if (q.camp === 'croce') {
        const g = G0(), iron = sm('#2a2a2e', { roughness: .6, metalness: .5 }), st2 = sm('#7a7670', { roughness: 1, flatShading: true });
        for (let k = 0; k < 14; k++) { const a = k * 2.4, d = .4 + (k % 4) * .35; add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.32 + (k % 3) * .08, 0), st2), Math.cos(a) * d, .2 + Math.floor(k / 5) * .3, Math.sin(a) * d); }
        add(g, box(.22, 5.4, .22, iron), 0, 3.4, 0); add(g, box(2.4, .2, .2, iron), 0, 4.6, 0); add(g, box(.5, .4, .3, sm('#7a1a1a')), 0, 1.6, .2);
        add(g, box(.04, .04, 1.6, sm('#c83a3a')), .6, 4.4, 0, .3, 0, 0); add(g, box(.04, .04, 1.4, sm('#3a6ac8')), -.6, 4.3, 0, -.2, 0, 0);
        place(g, q.x, q.y, .5); const L = addLight(q.x, groundH(q.x, q.y) + 1.8, q.y + .3, '#ff6a3a', .5, 4, .05); L.always = true;
      }
      else if (q.camp === 'neviera') {
        const g = G0(), st2 = sm('#6e6a64', { roughness: 1, flatShading: true });
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; add(g, box(1.1, .7 + (k % 3) * .25, .5, st2), Math.cos(a) * 2.6, .35, Math.sin(a) * 2.6, 0, -a, 0); }
        add(g, new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), sb('#0a0a0c')), 0, .05, 0, -Math.PI / 2, 0, 0); add(g, new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), sm('#e8ecf2')), .3, .08, .2, -Math.PI / 2, 0, 0);
        [[-1.6, .4], [1.6, -.2]].forEach(([x, z]) => add(g, box(.16, 2, .16, PM.woodD()), x, 1, z)); add(g, box(3.6, .14, .16, PM.woodD()), 0, 2, .1, 0, 0, .12);
        place(g, q.x, q.y, 0);
      }
      else if (q.camp === 'cascata') {
        // la cascata gelata: canne di ghiaccio che pendono dal ciglio fino al fondo della gola
        const g = G0(), ice = sm('#cfe4f0', { roughness: .15, metalness: .1, emissive: '#2a4a5a', emissiveIntensity: .25 }), ice2 = sm('#a8cce0', { roughness: .2 });
        const top = 9.5;
        for (let k = 0; k < 14; k++) { const x = (k - 7) * .42 + (k % 2) * .1, len = 3 + (k * 7 % 5) * 1.3, r2 = .18 + (k % 3) * .08; add(g, new THREE.Mesh(new THREE.ConeGeometry(r2, len, 6), k % 2 ? ice : ice2), x, top - len / 2, (k % 3) * .2, Math.PI, 0, 0); }
        for (let k = 0; k < 7; k++) add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.7, 0), ice2), (k - 3) * .9, top + .1, -.3).scale.set(1, .5, .8); add(g, new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, .25, 14), ice2), 0, .12, 1.4);
        for (let k = 0; k < 6; k++) add(g, new THREE.Mesh(new THREE.ConeGeometry(.3, 1 + k % 3, 5), ice), -1.6 + k * .65, .6, 1.2 + (k % 2) * .5);
        place(g, q.x, q.y + 1.2, Math.PI);
      }
      else if (q.camp === 'fiumara') {
        // il ponte rotto sulla fiumara: due piloni e mezzo arco, la strada passa a guado
        const g = G0(), st2 = sm('#8a8276', { roughness: 1 }), st3 = sm('#7a7266', { roughness: 1 });
        add(g, box(2.2, 6.5, 3, st2), -8, 3.2, 0); add(g, box(2.2, 6.5, 3, st2), 8, 3.2, 0); add(g, box(5.5, 1.1, 3, st3), -5.2, 6.2, 0, 0, 0, -.12); add(g, box(3.5, 1.1, 3, st3), 6.4, 6.3, 0, 0, 0, .2);
        for (let k = 0; k < 6; k++) add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.6 + (k % 3) * .3, 0), st3), -2 + k * .9, .3, (k % 2) - .5);
        add(g, box(2.4, .25, 3.2, sm('#e2e6ec')), -8, 6.55, 0); add(g, box(2.4, .25, 3.2, sm('#e2e6ec')), 8, 6.55, 0);
        place(g, q.x, q.y, .25);
        for (let k = 0; k < 9; k++) { const sx = q.x - 6 + k * 1.5, sz = q.y + 5 + Math.sin(k) * .6, s2 = new THREE.Mesh(new THREE.DodecahedronGeometry(.42, 0), st2); s2.position.set(sx, groundH(sx, sz) + .1, sz); s2.scale.y = .5; addStatic(s2); }
      }
      else if (q.camp === 'eremo') {
        // sulla cengia: la facciata dell'eremo scavata nella roccia, una campanella, una croce, un lume
        const g = G0(), st2 = sm('#a89e8e', { roughness: 1 }), wd = PM.woodD();
        add(g, box(3.6, 3.4, .5, st2), 0, 1.7, 0); add(g, box(4, .3, .8, sm('#e2e6ec')), 0, 3.5, .1);
        add(g, box(1.1, 2, .1, sb('#0a0806')), 0, 1, .26); add(g, box(.12, .7, .08, wd), 0, 2.85, .3); add(g, box(.45, .1, .08, wd), 0, 3, .3);
        add(g, box(.08, 1.2, .08, wd), 1.4, 3.9, 0); add(g, box(.08, 1.2, .08, wd), 2, 3.9, 0); add(g, box(.75, .08, .08, wd), 1.7, 4.5, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(.18, .3, 8, 1, true), sm('#8a6a2a', { metalness: .6 })), 1.7, 4.25, 0);
        place(g, q.x + 1.7, q.y - .6, -Math.PI / 2); const L = addLight(q.x + .8, groundH(q.x, q.y) + 1.4, q.y, '#ffb060', .7, 5, .05); L.always = true;
      }
