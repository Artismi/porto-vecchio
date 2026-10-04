  // ================= [inverno22] PROPAGANDA: il volto del Garante e le scritte rosse =================
  // Ritratti enormi incollati o dipinti sui muri ciechi, teloni rossi appesi alle facciate, slogan rossi a pennello
  // sotto il cornicione. Il Garante è un volto inventato: berretto, occhiali tondi scuri, mascella quadrata, colletto alto.
  // Qualche ritratto è già stato sfregiato dalla Risacca (l'onda nera, gli occhi cancellati).
  const PROP_SLOGAN = ["L'ORDINE È UNA CAREZZA", 'IL GARANTE VEGLIA SU DI TE', 'OBBEDIRE È ESSERE LIBERI', 'LA TUTELA TI PROTEGGE', 'LAVORO · ORDINE · SILENZIO',
    'IL GARANTE TI ASCOLTA', 'DENUNCIA IL DISORDINE', 'UN POPOLO · UNA VOCE', 'CHI TACE AMA LA PATRIA', 'ПОРЯДОК · ТРУД · ТИШИНА', 'IL DUBBIO È UN NEMICO', 'GRAZIE, GARANTE'];
  const PROP = {};
  function garanteFace(x, W, H, ox, oy, s, ink, paper, accent, defaced) {
    // tutto in unità di una griglia 32x40, scalata di s: stampo a tre colori (carta, rosso, nero)
    const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(ox + Math.round(a * s), oy + Math.round(b * s), Math.ceil(w * s), Math.ceil(h * s)); };
    const P = (pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(ox + a * s, oy + b * s) : x.moveTo(ox + a * s, oy + b * s)); x.closePath(); x.fill(); };
    P([[2, 40], [6, 31], [12, 28], [20, 28], [26, 31], [30, 40]], ink);                         // cappotto e spalle
    P([[11, 28], [16, 33], [21, 28], [20, 26], [12, 26]], accent);                               // colletto alto
    R(13, 22, 6, 6, ink);                                                                        // collo in ombra
    P([[9, 12], [23, 12], [23, 20], [20, 25], [16, 26.5], [12, 25], [9, 20]], paper);              // volto
    P([[16, 12], [23, 12], [23, 20], [20, 25], [16, 26.5]], ink);                                // metà in ombra: stampo
    R(17, 21.5, 4, 1, paper); R(11, 21.5, 4, 1, ink);                                            // bocca stretta
    R(10, 24, 3, 1, ink);                                                                        // mascella
    P([[7, 12], [25, 12], [24, 9], [8, 9]], ink);                                                // visiera
    P([[8, 9], [24, 9], [26, 4], [21, 1.5], [11, 1.5], [6, 4]], ink);                            // berretto
    R(9, 7, 14, 2, accent);                                                                      // fascia del berretto
    R(14.5, 3.5, 3, 3, paper); R(15.5, 4.5, 1, 1, ink);                                          // stemma: un occhio
    if (!defaced) { x.fillStyle = ink; [[12.5, 15.5], [19.5, 15.5]].forEach(([a, b]) => { x.beginPath(); x.arc(ox + a * s, oy + b * s, 2.6 * s, 0, 6.3); x.fill(); }); R(14.5, 15, 3, 1, ink); R(11.5, 14.5, 1, 1, paper); }
    else { x.strokeStyle = '#121014'; x.lineWidth = 2.2 * s; x.beginPath(); x.moveTo(ox + 9 * s, oy + 13 * s); x.lineTo(ox + 23 * s, oy + 18 * s); x.moveTo(ox + 9 * s, oy + 18 * s); x.lineTo(ox + 23 * s, oy + 13 * s); x.stroke(); }
  }
  function propTex(kind, k) {
    const key = kind + k; if (PROP[key]) return PROP[key];
    const r = rng(k * 977 + 13), red = '#9e1f1a', ink = '#16110f', paper = '#d6ccb8';
    let W, H, c, x;
    if (kind === 'ritratto' || kind === 'telone') {
      W = 96; H = 136; c = mk(W, H); x = c.getContext('2d');
      const bg = kind === 'telone' ? red : paper, defaced = kind === 'ritratto' && r() < .22;
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      if (kind === 'ritratto') { x.fillStyle = red; for (let a = 0; a < 18; a++) { if (a % 2) continue; const a0 = a / 18 * 6.283, a1 = (a + 1) / 18 * 6.283; x.beginPath(); x.moveTo(48, 52); x.lineTo(48 + Math.cos(a0) * 120, 52 + Math.sin(a0) * 120); x.lineTo(48 + Math.cos(a1) * 120, 52 + Math.sin(a1) * 120); x.fill(); } }   // raggi rossi
      garanteFace(x, W, H, 8, 10, 2.5, ink, kind === 'telone' ? '#d8c8b0' : paper, kind === 'telone' ? '#16110f' : red, defaced);
      // didascalia
      const txt = pick(r, ['IL GARANTE', 'IL GARANTE VEGLIA', 'ГАРАНТ', 'ORDINE', 'TI ASCOLTA']);
      x.fillStyle = kind === 'telone' ? ink : red; x.fillRect(0, H - 26, W, 26);
      x.fillStyle = kind === 'telone' ? '#d8c8b0' : paper; x.textAlign = 'center'; x.textBaseline = 'middle';
      let fs = 15; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; while (x.measureText(txt).width > W - 8 && fs > 8) { fs--; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; } x.fillText(txt, W / 2, H - 13);
      if (defaced) { x.strokeStyle = '#121014'; x.lineWidth = 4; x.beginPath(); x.moveTo(6, 100); for (let q = 0; q <= 6; q++) x.quadraticCurveTo(10 + q * 13, 88 - (q % 2) * 16, 16 + q * 13, 100); x.stroke(); }   // l'onda della Risacca
      // tempo: macchie, colature, carta strappata
      for (let i = 0; i < 260; i++) { x.fillStyle = r() < .5 ? 'rgba(40,30,26,.12)' : 'rgba(230,220,200,.1)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
      for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(30,24,20,.22)'; const cx = Math.floor(r() * W); x.fillRect(cx, Math.floor(r() * 20), 1, 20 + Math.floor(r() * 50)); }
      if (kind === 'ritratto') { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 16; i++) { const ex = r() < .5 ? (r() < .5 ? 0 : W) : r() * W, ey = r() < .5 ? r() * H : (r() < .5 ? 0 : H); x.beginPath(); x.ellipse(ex, ey, 3 + r() * 9, 2 + r() * 7, r() * 3, 0, 6.3); x.fill(); } x.globalCompositeOperation = 'source-over'; }
    } else {   // slogan a pennello: rosso, consumato, con le colature
      const txt = PROP_SLOGAN[k % PROP_SLOGAN.length]; W = 512; H = 56; c = mk(W, H); x = c.getContext('2d');
      x.fillStyle = red; x.textAlign = 'center'; x.textBaseline = 'middle';
      let fs = 40; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; while (x.measureText(txt).width > W - 16 && fs > 14) { fs--; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; }
      x.fillText(txt, W / 2, H / 2 - 2);
      const tw = x.measureText(txt).width; for (let i = 0; i < 18; i++) { const dx = W / 2 - tw / 2 + r() * tw; x.fillRect(Math.floor(dx), H / 2 + fs * .3, 2, 4 + Math.floor(r() * 12)); }   // colature
      x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,' + (.3 + r() * .7) + ')'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + Math.floor(r() * 3), 1); } x.globalCompositeOperation = 'source-over';
    }
    const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return PROP[key] = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: .35, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .34, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  function buildPropaganda() {
    const T = G.T, WD = M.world && M.world.districtAt, g = new THREE.Group(); let nR = 0, nS = 0;
    const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || !rec.box3) return;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1, top = bb.max.y - 2.5;
      const dd = WD ? WD((x0 + w / 2)) : 'centro'; if (dd === 'prateria' || dd === 'foresta') return;
      const hgt = top - base; if (hgt < 4.5) return;
      const r = rng(bi * 733 + 101), face = b.door ? faceOf(b) : null;
      const sides = [
        { f: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { f: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { f: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { f: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok && s2.len >= 4.5 && (s2.f === 'S' || s2.f === 'E'));   // solo i lati che la camera vede
      if (!sides.length) return;
      const put = (sd, u, mat, pw, ph, y, off) => { const p = sd.at(u), m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat); m.position.set(p[0] + Math.sin(sd.yaw) * off, y, p[1] + Math.cos(sd.yaw) * off); m.rotation.y = sd.yaw; g.add(m); return m; };
      const mk0 = modKind(b), civic = mk0 === 'civic' || mk0 === 'mil';
      // 1) il volto: sul lato senza porta (muro cieco), o un telone rosso appeso sulla facciata
      const q = r();
      if (q < (civic ? .75 : .38) && nR < 90) {
        const blind = sides.filter(s2 => s2.f !== face), sd = blind.length ? pick(r, blind) : pick(r, sides), kind = blind.length && r() < .65 ? 'ritratto' : 'telone';
        const ph = Math.min(hgt - 1.2, kind === 'ritratto' ? 8 : 9), pw = ph * (96 / 136); if (pw < sd.len - .6 && ph > 3) {
          const m = put(sd, sd.len / 2, propTex(kind, nR % 9), pw, ph, base + hgt - ph / 2 - .3, kind === 'telone' ? .55 : .38); nR++; (window.__propPos = window.__propPos || []).push([Math.round(m.position.x), Math.round(m.position.z), kind]);
          if (kind === 'telone') { const bar = new THREE.Mesh(new THREE.BoxGeometry(pw + .4, .08, .08), PM.iron()); bar.position.copy(m.position); bar.position.y += ph / 2 + .05; bar.rotation.y = sd.yaw; g.add(bar); }
          if (r() < .35) { const p = sd.at(sd.len / 2); addLight(p[0] + Math.sin(sd.yaw) * 1.5, base + 1, p[1] + Math.cos(sd.yaw) * 1.5, '#d8904a', 1.6, 9, .02); }   // un faretto da sotto, di notte
        }
      }
      // 2) lo slogan rosso a pennello, sotto il cornicione
      if (r() < (civic ? .85 : .5) && nS < 140) {
        const sd = pick(r, sides), sw = Math.min(sd.len - .8, 14), sh = sw * (56 / 512);
        put(sd, sd.len / 2, propTex('slogan', Math.floor(r() * 997)), sw, sh, base + hgt - .55 - sh / 2, .36); nS++;
      }
    });
    scene.add(g); window.__propaganda = { ritratti: nR, slogan: nS };
  }
