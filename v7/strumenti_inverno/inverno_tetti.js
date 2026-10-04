  // ================= [inverno] TETTI VISSUTI =================
  // I tetti piatti sono il posto dove la gente vive di più: condizionatori, parabole, antenne con la spia, tende cerate,
  // casse, abbaino d'accesso con la porta, bucato, un'insegna al neon rimasta mezza spenta. Tutto fa parte dell'edificio
  // (sfuma con lui quando copre il giocatore).
  function buildRoofs() {
    const rr = rng(9091);
    const snowM = sm('#c4c8ce', { roughness: 1 }), metal = sm('#5a5e66', { roughness: .6, metalness: .4 }), dark = sm('#1c1c22', { roughness: 1 }),
      wood = sm('#6a5238', { roughness: 1 }), rust = sm('#7a4a34', { roughness: 1 });
    const tarps = ['#3e6272', '#7a3c3c', '#4c6a4c', '#8a7438', '#5a4a6a'].map(c => sm(c, { roughness: 1 }));
    const neon = ['#ff3fa4', '#38e8ff', '#ffe03a'].map(c => new THREE.MeshBasicMaterial({ color: c }));
    const cloth = ['#d8d0b8', '#b04a4a', '#4a6aa0', '#caa83a'].map(c => sm(c, { roughness: 1 }));
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!rec.flat || !b || rec.roofDone) return;
      const bb = rec.box3, top = bb.max.y - 2.5, x0 = bb.min.x, z0 = bb.min.z, w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z;
      if (w < 3.6 || d < 3.6) return;
      const r = rng(bi * 131 + 7), g = new THREE.Group(), put = (o, x, y, z, ry) => { o.position.set(x, top + y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
      const px = () => x0 + 1 + r() * (w - 2), pz = () => z0 + 1 + r() * (d - 2);
      const slots = Math.min(13, 3 + Math.floor(w * d / 13));
      let access = false;
      for (let k = 0; k < slots; k++) {
        const t = r(), x = px(), z = pz();
        if (t < .17) { // condizionatore
          put(box(.9, .6, .7, metal), x, .3, z, r() * 3); const f = cyl(.22, .22, .04, 10, dark); put(f, x, .62, z);
          const sn = box(.95, .1, .75, snowM); put(sn, x, .64, z, 0).position.y = top + .66 - top + 0;
        } else if (t < .29) { // parabola su un palo
          put(cyl(.04, .04, 1.1, 5, metal), x, .55, z); const dish = cyl(.5, .06, .18, 12, sm('#c8ccd0', { roughness: .5 })); put(dish, x, 1.2, z).rotation.set(.9, r() * 6, 0);
        } else if (t < .4) { // antenna con la spia
          put(cyl(.03, .035, 3.4, 5, metal), x, 1.7, z); const ry0 = r() * 3; for (let q = 0; q < 5; q++) put(box(1.3 - q * .22, .035, .035, metal), x, 1.4 + q * .45, z, ry0);
          put(new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), new THREE.MeshBasicMaterial({ color: r() < .5 ? '#ff3030' : '#38e8ff' })), x, 3.45, z);
        } else if (t < .55) { // telo cerato sopra qualcosa
          const tw = 1.6 + r() * 1.4, td = 1.2 + r() * 1.2; put(box(tw, .35, td, tarps[Math.floor(r() * tarps.length)]), x, .18, z, r() * 3);
          put(box(tw * .8, .08, td * .8, snowM), x, .4, z, 0).rotation.y = g.children[g.children.length - 2].rotation.y;
        } else if (t < .68) { // casse impilate
          put(box(.8, .6, .8, wood), x, .3, z, r() * 1.5); if (r() < .6) put(box(.6, .5, .6, wood), x + .1, .85, z, r());
        } else if (t < .78) { // bidone arrugginito + tubo
          put(cyl(.38, .38, .9, 10, rust), x, .45, z); put(cyl(.05, .05, 1.4, 6, dark), x + .5, .7, z);
        } else if (t < .9) { // filo del bucato
          const L = 2.4 + r() * 1.4, ry = r() < .5 ? 0 : Math.PI / 2;
          const a = new THREE.Group(); a.position.set(x, top, z); a.rotation.y = ry; g.add(a);
          [-L / 2, L / 2].forEach(o => { const p = cyl(.025, .025, 1.7, 5, metal); p.position.set(o, .85, 0); a.add(p); });
          const ln = box(L, .015, .015, dark); ln.position.set(0, 1.6, 0); a.add(ln);
          for (let q = -L / 2 + .3; q < L / 2 - .2; q += .5) { const c = box(.32, .5 + r() * .25, .03, cloth[Math.floor(r() * cloth.length)]); c.position.set(q, 1.33, 0); a.add(c); }
        } else { // mucchietto di neve contro il parapetto
          const s = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), snowM); s.scale.set(1 + r(), .3 + r() * .2, .8 + r() * .6); put(s, x, 0, z, r() * 3);
        }
      }
      // abbaino d'accesso: una scala interna, la porta guarda la camera
      if (w >= 5 && d >= 5 && r() < .75) {
        const hx = x0 + w * (.25 + r() * .5), hz = z0 + d * (.25 + r() * .5); put(box(1.7, 2.1, 1.9, sm('#8a8680', { roughness: 1 })), hx, 1.05, hz);
        put(box(1.9, .12, 2.1, snowM), hx, 2.14, hz); put(box(.7, 1.5, .06, dark), hx, .75, hz + .97);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(.22, .1, .1), new THREE.MeshBasicMaterial({ color: '#ffd890' })); put(lamp, hx, 1.75, hz + 1); rec.roofHatch = [hx, hz + 1.6];
      }
      // insegna al neon sul parapetto: spesso con una lettera spenta
      if (b.use && r() < .4) {
        const sx = x0 + w * (.2 + r() * .6), sz = z0 + d - .5, col = neon[Math.floor(r() * 3)], L = 2.4 + r() * 1.6;
        put(box(L, .7, .08, dark), sx, 1.4, sz); for (let q = 0; q < 4; q++) { if (r() < .22) continue; put(box(L / 4 - .15, .38, .05, col), sx - L / 2 + L / 8 + q * L / 4, 1.4, sz + .06); }
        [-L / 2 + .1, L / 2 - .1].forEach(o => put(box(.06, 1.1, .06, metal), sx + o, .55, sz));
      }
      if (!g.children.length) return;
      const gm = shadowed(mergeGroup(g)); ownMats(gm, rec); scene.add(gm); rec.roofDone = true; rec.roofGrp = gm; n++;
    });
    return n;
  }
