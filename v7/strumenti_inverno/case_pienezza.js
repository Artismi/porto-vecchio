  // ================= [case] PIENEZZA: manifesti a strati, murali del governo, botteghe piene, luci, la storia dei muri =================
  // «Più dettaglio e pienezza, non cose asciutte»: ogni muro che dà sulla strada racconta qualcosa. Manifesti incollati uno sull'altro
  // (il Garante, slogan, concerti, scomparsi, la Risacca, ordinanze, pubblicità), strappati, sbiaditi, coi tag a spray; murali dipinti
  // del regime che si scrostano; botteghe con la merce fuori; applique e festoni di lampadine; fuliggine, ruggine, muffa, rappezzi; cavi.
  const PA = { W: 64, H: 96, C: 16, R: 5 };
  const PSLOG = ['ORDINE', 'LAVORO', 'SILENZIO', 'ПОРЯДОК', 'ТРУД', 'OBBEDIRE', 'VIGILANZA', 'UNITÀ', 'DISCIPLINA', 'ДИСЦИПЛИНА'];
  const PEV = ['CONCERTO', 'BALLO', 'CIRCO', 'CINEMA', 'ТАНЦЫ', 'КИНО', 'TEATRO', 'LOTTERIA', 'ОРКЕСТР', 'FESTA'];
  const PAD = ['SAPONE', 'ВОДКА', 'SIGARETTE', 'TONNO', 'RADIO', 'CAFFÈ', 'ЧАЙ', 'ПИВО', 'SARDINE', 'LUX'];
  function posterAtlas() {
    if (PA.mat) return;
    const { W, H, C, R } = PA, c = mk(W * C, H * R), x = c.getContext('2d'), r = rng(4041);
    const red = '#9e1f1a', ink = '#16110f', paper = '#d8cdb6';
    const txt = (s, cx, cy, size, col, maxW, font) => { font = font || 'Impact, "Arial Black", sans-serif'; let sz = size; x.font = `bold ${sz}px ${font}`; while (x.measureText(s).width > (maxW || W - 6) && sz > 6) { sz--; x.font = `bold ${sz}px ${font}`; } x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, cx, cy); };
    const lines = (x0, y0, n, w, col, gap) => { for (let k = 0; k < n; k++) { x.fillStyle = col; x.fillRect(x0, y0 + k * (gap || 4), Math.max(6, w - Math.floor(r() * w * .4)), 2); } };
    for (let i = 0; i < C * R; i++) {
      const ox = (i % C) * W, oy = Math.floor(i / C) * H, kind = i % 10;
      x.save(); x.beginPath(); x.rect(ox, oy, W, H); x.clip(); x.translate(ox, oy);
      if (kind === 0) {   // il Garante: raggi rossi, il volto a stampo, la didascalia
        x.fillStyle = paper; x.fillRect(0, 0, W, H); x.fillStyle = red; for (let a = 0; a < 16; a += 2) { const a0 = a / 16 * 6.283, a1 = (a + 1) / 16 * 6.283; x.beginPath(); x.moveTo(32, 36); x.lineTo(32 + Math.cos(a0) * 90, 36 + Math.sin(a0) * 90); x.lineTo(32 + Math.cos(a1) * 90, 36 + Math.sin(a1) * 90); x.fill(); }
        garanteFace(x, W, H, 8, 6, 1.5, ink, paper, red, r() < .2); x.fillStyle = red; x.fillRect(0, H - 22, W, 22); txt(pick(r, ['IL GARANTE', 'TI ASCOLTA', 'VEGLIA', 'ГАРАНТ']), 32, H - 11, 14, paper);
      } else if (kind === 1) {   // slogan: rosso, una parola, l'occhio dentro la stella
        x.fillStyle = red; x.fillRect(0, 0, W, H); x.fillStyle = ink; x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 9 : 20; x.lineTo(32 + Math.cos(a) * rr, 30 + Math.sin(a) * rr); } x.fill();
        x.fillStyle = paper; x.beginPath(); x.ellipse(32, 31, 7, 4, 0, 0, 7); x.fill(); x.fillStyle = red; x.beginPath(); x.arc(32, 31, 2.5, 0, 7); x.fill();
        txt(pick(r, PSLOG), 32, 66, 20, paper); x.fillStyle = paper; x.fillRect(6, 80, 52, 2); txt(pick(r, ['IL GARANTE VEGLIA', 'LA TUTELA', 'ОРДЕН', 'POPOLO UNITO']), 32, 88, 8, paper);
      } else if (kind === 2) {   // concerto, ballo, cinema: bande colorate, titolo, data
        x.fillStyle = pick(r, ['#14101e', '#1e2a3a', '#2a1a14']); x.fillRect(0, 0, W, H); const cs = [pick(r, ['#e85a3a', '#d8a030', '#c84a8a']), pick(r, ['#3a9ac8', '#4ac08a', '#e8d040'])];
        for (let k = 0; k < 3; k++) { x.fillStyle = cs[k % 2]; x.beginPath(); x.moveTo(0, 18 + k * 12); x.lineTo(W, 6 + k * 12); x.lineTo(W, 12 + k * 12); x.lineTo(0, 24 + k * 12); x.fill(); }
        txt(pick(r, PEV), 32, 62, 15, '#f0e6d0'); txt(pick(r, ['SAB 12·XI', 'DOM 3·XII', 'ORE 21', 'ВС 20:00']), 32, 76, 9, cs[0]); lines(10, 84, 2, 44, 'rgba(240,230,208,.6)');
      } else if (kind === 3) {   // persona scomparsa: foto, testo, linguette strappate
        x.fillStyle = '#e8e2d0'; x.fillRect(0, 0, W, H); txt(pick(r, ['SCOMPARSO', 'SCOMPARSA', 'ПРОПАЛ', 'AIUTATECI']), 32, 9, 12, red);
        x.fillStyle = '#6a6460'; x.fillRect(14, 16, 36, 30); x.fillStyle = '#2a2624'; x.beginPath(); x.arc(32, 28, 7, 0, 7); x.fill(); x.fillRect(22, 36, 20, 10); lines(8, 52, 5, 48, '#4a4650');
        for (let k = 0; k < 7; k++) { if (r() < .35) continue; x.fillStyle = '#e8e2d0'; x.fillRect(3 + k * 8.5, 76, 7, 20); x.fillStyle = '#4a4650'; x.fillRect(6 + k * 8.5, 79, 1, 14); }
      } else if (kind === 4) {   // la Risacca: fotocopia, l'onda, scritto a mano
        x.fillStyle = '#e4e0d6'; x.fillRect(0, 0, W, H); x.strokeStyle = '#141414'; x.lineWidth = 3; for (let q = 0; q < 3; q++) { x.beginPath(); for (let k = 0; k <= W; k += 2) x.lineTo(k, 26 + q * 9 + Math.sin(k * .25 + q) * 5); x.stroke(); }
        txt('LA RISACCA', 32, 60, 13, '#141414', W - 6, '"Comic Sans MS", cursive'); lines(8, 70, 4, 48, '#3a3a3a', 5); for (let k = 0; k < 300; k++) { x.fillStyle = 'rgba(20,20,20,.25)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      } else if (kind === 5) {   // ordinanza: testo fitto, timbro rosso
        x.fillStyle = '#ece6d4'; x.fillRect(0, 0, W, H); txt(pick(r, ['ORDINANZA', 'AVVISO', 'ПРИКАЗ', 'COPRIFUOCO']), 32, 9, 11, ink); x.fillStyle = ink; x.fillRect(6, 16, 52, 1);
        lines(6, 20, 13, 52, '#5a5650', 4); x.strokeStyle = 'rgba(170,30,30,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(46, 80, 9, 0, 7); x.stroke(); x.beginPath(); x.arc(46, 80, 5, 0, 7); x.stroke();
      } else if (kind === 6) {   // pubblicità: fondo pieno, il prodotto, il marchio
        const bg = pick(r, ['#d8b030', '#3a7a5a', '#2a4a7a', '#c85a30', '#e0d8c0']); x.fillStyle = bg; x.fillRect(0, 0, W, H);
        x.fillStyle = shade(bg, .5); x.fillRect(22, 18, 20, 40); x.fillStyle = '#f0e8d8'; x.fillRect(24, 28, 16, 14); x.fillStyle = shade(bg, .5); x.fillRect(28, 10, 8, 10);
        txt(pick(r, PAD), 32, 70, 16, '#f8f0e0'); txt(pick(r, ['IL MIGLIORE', 'DAL 1951', 'ЛУЧШИЙ', 'DI STATO']), 32, 84, 8, shade(bg, .45));
      } else if (kind === 7) {   // lavoratori: due figure col martello, scritta rossa
        x.fillStyle = '#c8a060'; x.fillRect(0, 0, W, H); x.fillStyle = '#2a2018'; [[18, 1], [42, -1]].forEach(([cx, s]) => { x.beginPath(); x.arc(cx, 22, 6, 0, 7); x.fill(); x.fillRect(cx - 8, 28, 16, 30); x.fillRect(cx - 4, 58, 3, 14); x.fillRect(cx + 1, 58, 3, 14); x.save(); x.translate(cx + s * 8, 30); x.rotate(-s * .6); x.fillRect(-1, -14, 3, 16); x.fillRect(-4, -16, 9, 4); x.restore(); });
        txt(pick(r, ['LAVORO', 'ТРУД', 'PRODUCI', 'IL PORTO LAVORA']), 32, 84, 13, red);
      } else if (kind === 8) {   // tag a spray su fondo trasparente
        const col = pick(r, ['#e83a8a', '#141414', '#e8e4dc', '#c82a2a', '#38a8d8']); x.strokeStyle = col; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
        if (r() < .4) { for (let q = 0; q < 2; q++) { x.beginPath(); for (let k = 4; k <= W - 4; k += 2) x.lineTo(k, 40 + q * 12 + Math.sin(k * .22 + q) * 7); x.stroke(); } }
        else { x.beginPath(); let px = 6, py = 50; x.moveTo(px, py); for (let k = 0; k < 14; k++) { px = Math.min(W - 4, px + 2 + r() * 6); py = 30 + r() * 36; x.lineTo(px, py); } x.stroke(); x.lineWidth = 1.5; x.strokeStyle = shade(col, .5); x.stroke(); }
        if (r() < .5) { x.fillStyle = col; for (let k = 0; k < 5; k++) { const dx = 8 + r() * 48; x.fillRect(dx, 56 + r() * 10, 1, 6 + r() * 12); } }
      } else {   // resto strappato: si vede solo il fondo di un manifesto vecchio
        x.fillStyle = pick(r, ['#d8cdb6', '#c8b8a0', '#a8a090']); x.fillRect(0, 44, W, 52); lines(8, 56, 5, 48, 'rgba(60,50,40,.45)', 6); x.fillStyle = 'rgba(158,31,26,.5)'; x.fillRect(0, 84, W, 12);
      }
      if (kind !== 8) {   // il tempo: grana della carta, sole che sbiadisce, colle, macchie d'acqua, strappi
        for (let k = 0; k < 140; k++) { x.fillStyle = r() < .5 ? 'rgba(40,30,24,.12)' : 'rgba(240,232,214,.12)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + Math.floor(r() * 2), 1); }
        x.fillStyle = `rgba(214,206,190,${(r() * .38).toFixed(2)})`; x.fillRect(0, 0, W, H);
        for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(240,236,224,.18)'; x.fillRect(0, 10 + Math.floor(r() * 76), W, 1); }
        for (let k = 0; k < 4; k++) { const sx = Math.floor(r() * W), L = 10 + Math.floor(r() * 40), gr = x.createLinearGradient(0, 0, 0, L); gr.addColorStop(0, 'rgba(60,46,30,.28)'); gr.addColorStop(1, 'rgba(60,46,30,0)'); x.fillStyle = gr; x.fillRect(sx, Math.floor(r() * 20), 2 + Math.floor(r() * 3), L); }
        x.globalCompositeOperation = 'destination-out';
        for (let k = 0; k < 3 + Math.floor(r() * 5); k++) { const ex = r() < .5 ? (r() < .5 ? 0 : W) : r() * W, ey = r() < .5 ? r() * H : (r() < .5 ? 0 : H); x.beginPath(); for (let a = 0; a < 7; a++) { const t = a / 7 * 6.283, rr = 4 + r() * 13; x.lineTo(ex + Math.cos(t) * rr, ey + Math.sin(t) * rr * 1.3); } x.fill(); }
        if (kind === 9) x.fillRect(0, 0, W, 44 - Math.floor(r() * 8));
        x.globalCompositeOperation = 'source-over';
      }
      x.restore();
    }
    const t = canvasTex(c); PA.tex = t;
    PA.mat = std({ map: t, alphaTest: .5, roughness: .95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }
  function poster(w, h, i) {   // un manifesto della tavola, i = 0..79
    posterAtlas(); const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, u0 = (i % PA.C) / PA.C, v0 = 1 - (Math.floor(i / PA.C) + 1) / PA.R;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / PA.C, v0 + uv.getY(k) / PA.R);
    return new THREE.Mesh(g, PA.mat);
  }

  // ---- il murale del governo, dipinto sul muro cieco: raggi, il Garante, la folla con le bandiere, le ciminiere, lo slogan ----
  function muralMat(k) {
    const r = rng(k * 613 + 7), W = 160, H = 230, c = mk(W, H), x = c.getContext('2d'), defaced = k >= 100;
    const red = '#a8241c', ink = '#1a1412', cream = '#e0d2b4', ochre = '#c89a4a', sky = pick(r, ['#c8783a', '#b8463a', '#d8a050']);
    // cielo a raggi
    const gr = x.createLinearGradient(0, 0, 0, H * .7); gr.addColorStop(0, shade(sky, 1.1)); gr.addColorStop(1, shade(sky, .7)); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,220,150,.28)'; for (let a = 0; a < 24; a += 2) { const a0 = a / 24 * 6.283, a1 = (a + 1) / 24 * 6.283; x.beginPath(); x.moveTo(W / 2, 70); x.lineTo(W / 2 + Math.cos(a0) * 300, 70 + Math.sin(a0) * 300); x.lineTo(W / 2 + Math.cos(a1) * 300, 70 + Math.sin(a1) * 300); x.fill(); }
    // ciminiere e gru della fabbrica sullo sfondo
    x.fillStyle = shade(sky, .45); for (let q = 0; q < 5; q++) { const cx = 8 + q * 34 + r() * 10, h = 40 + r() * 40; x.fillRect(cx, 150 - h, 8, h); x.fillStyle = 'rgba(60,40,40,.35)'; x.beginPath(); x.ellipse(cx + 10, 150 - h - 8, 12, 6, 0, 0, 7); x.fill(); x.fillStyle = shade(sky, .45); }
    x.fillRect(0, 130, W, 30);
    // il Garante, grande, a mezzo busto
    garanteFace(x, W, H, 32, 12, 3, ink, cream, red, false);
    // la folla: teste e spalle a file, bandiere rosse, martelli e spighe
    for (let row = 0; row < 3; row++) for (let q = 0; q < 9; q++) {
      const cx = q * 19 + (row % 2) * 9 + r() * 4, cy = 160 + row * 18, col = pick(r, ['#3a2c26', '#4a3a2e', '#5a4636', '#2e2a2e', '#6a3a2a']);
      x.fillStyle = col; x.fillRect(cx - 8, cy + 4, 16, 18); x.fillStyle = shade(col, 1.6); x.beginPath(); x.arc(cx, cy, 5, 0, 7); x.fill();
      if (row === 0 && q % 3 === 1) { x.fillStyle = '#2a2018'; x.fillRect(cx + 5, cy - 34, 2, 40); x.fillStyle = red; x.beginPath(); x.moveTo(cx + 7, cy - 34); x.quadraticCurveTo(cx + 18, cy - 30, cx + 27, cy - 34); x.lineTo(cx + 27, cy - 20); x.quadraticCurveTo(cx + 18, cy - 16, cx + 7, cy - 20); x.fill(); }
      if (row === 0 && q % 3 === 2) { x.fillStyle = '#2a2018'; x.fillRect(cx - 9, cy - 12, 2, 14); x.fillRect(cx - 12, cy - 14, 8, 3); }
    }
    // nastro con lo slogan
    x.fillStyle = red; x.fillRect(0, H - 26, W, 26); x.fillStyle = ochre; x.fillRect(0, H - 27, W, 2); x.fillRect(0, H - 2, W, 2);
    const s = PROP_SLOGAN[k % PROP_SLOGAN.length]; let fs = 16; x.font = `bold ${fs}px Impact, "Arial Black", sans-serif`; while (x.measureText(s).width > W - 10 && fs > 7) { fs--; x.font = `bold ${fs}px Impact, "Arial Black", sans-serif`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = cream; x.fillText(s, W / 2, H - 13);
    // cornice dipinta
    x.strokeStyle = ochre; x.lineWidth = 3; x.strokeRect(2, 2, W - 4, H - 4);
    // la Risacca è passata: l'onda nera, gli occhi cancellati, «NO»
    if (defaced) { x.strokeStyle = '#121014'; x.lineWidth = 6; x.beginPath(); x.moveTo(30, 50); x.lineTo(130, 62); x.stroke(); x.lineWidth = 5; x.beginPath(); for (let q = 0; q <= 160; q += 4) x.lineTo(q, 120 + Math.sin(q * .12) * 10); x.stroke();
      x.fillStyle = '#e8e4dc'; x.font = 'bold 28px Impact, sans-serif'; x.fillText('NO', 120, 140); for (let q = 0; q < 8; q++) x.fillRect(110 + q * 4, 152, 2, 6 + r() * 10); }
    // il tempo: pittura sbiadita, scaglie che cadono e lasciano l'intonaco, colature, umidità alla base
    x.fillStyle = 'rgba(200,190,170,.22)'; x.fillRect(0, 0, W, H);
    for (let q = 0; q < 26; q++) { const ex = r() * W, ey = r() * H, R0 = 2 + r() * 9; x.fillStyle = pick(r, ['#bcb4a4', '#a89e8c', '#c8c0b0']); x.beginPath(); for (let a = 0; a < 8; a++) { const t = a / 8 * 6.283; x.lineTo(ex + Math.cos(t) * R0 * (.6 + r() * .6), ey + Math.sin(t) * R0 * (.6 + r() * .6)); } x.fill(); x.fillStyle = 'rgba(30,20,16,.35)'; x.fillRect(ex - 1, ey + R0 * .6, 2, 1); }
    for (let q = 0; q < 14; q++) { const sx = r() * W, L = 20 + r() * 80, g2 = x.createLinearGradient(0, 0, 0, L); g2.addColorStop(0, 'rgba(40,30,24,.3)'); g2.addColorStop(1, 'rgba(40,30,24,0)'); x.fillStyle = g2; x.fillRect(sx, r() * 60, 2, L); }
    const gb = x.createLinearGradient(0, H - 50, 0, H); gb.addColorStop(0, 'rgba(30,26,22,0)'); gb.addColorStop(1, 'rgba(30,26,22,.45)'); x.fillStyle = gb; x.fillRect(0, H - 50, W, 50);
    for (let q = 0; q < 900; q++) { x.fillStyle = r() < .5 ? 'rgba(20,14,10,.14)' : 'rgba(250,240,220,.1)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
    x.globalCompositeOperation = 'destination-out'; for (let q = 0; q < 10; q++) { const ex = r() < .5 ? (r() < .5 ? 0 : W) : r() * W, ey = r() < .5 ? r() * H : (r() < .5 ? 0 : H); x.beginPath(); x.ellipse(ex, ey, 3 + r() * 10, 2 + r() * 8, r() * 3, 0, 7); x.fill(); } x.globalCompositeOperation = 'source-over';
    const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: .35, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .22, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }

  // ---- seconda tavola di decalcomanie: fuliggine, ruggine che cola, muffa, rappezzi d'intonaco ----
  function decal2() {
    if (CT.dec2M) return; const c = mk(256, 256), x = c.getContext('2d'), r = rng(2626);
    for (let v = 0; v < 16; v++) {
      const cx = (v % 4) * 64, cy = Math.floor(v / 4) * 64;
      if (v < 4) { for (let k = 0; k < 18; k++) { const gx = cx + 32 + (r() - .5) * 20, gy = cy + 50 - k * 2.6 - r() * 4, R0 = 8 + k * 1.1, g2 = x.createRadialGradient(gx, gy, 0, gx, gy, R0); g2.addColorStop(0, 'rgba(18,16,16,.2)'); g2.addColorStop(1, 'rgba(18,16,16,0)'); x.fillStyle = g2; x.fillRect(gx - R0, gy - R0, R0 * 2, R0 * 2); } }   // fuliggine
      else if (v < 8) { for (let k = 0; k < 7; k++) { const sx = cx + 8 + r() * 48, L = 18 + r() * 44, g2 = x.createLinearGradient(0, cy, 0, cy + L); g2.addColorStop(0, 'rgba(126,60,28,.7)'); g2.addColorStop(1, 'rgba(126,60,28,0)'); x.fillStyle = g2; x.fillRect(sx, cy, 1 + Math.floor(r() * 3), L); } x.fillStyle = 'rgba(110,50,24,.6)'; x.fillRect(cx + 4, cy, 56, 3); }   // ruggine che cola
      else if (v < 12) { for (let k = 0; k < 40; k++) { const gx = cx + r() * 64, gy = cy + 64 - r() * r() * 64, R0 = 2 + r() * 7; x.fillStyle = `rgba(${r() < .5 ? '40,52,30' : '24,24,22'},${(.15 + r() * .25).toFixed(2)})`; x.beginPath(); x.arc(gx, gy, R0, 0, 7); x.fill(); } }   // muffa negli angoli in basso
      else { x.fillStyle = pick(r, ['rgba(226,220,206,.75)', 'rgba(206,200,186,.7)', 'rgba(196,182,160,.7)']); x.beginPath(); x.moveTo(cx + 6 + r() * 6, cy + 8 + r() * 6); x.lineTo(cx + 54 + r() * 6, cy + 6 + r() * 8); x.lineTo(cx + 58 - r() * 6, cy + 54 + r() * 6); x.lineTo(cx + 8 + r() * 6, cy + 58 - r() * 6); x.fill(); x.strokeStyle = 'rgba(60,50,40,.35)'; x.lineWidth = 1; x.stroke(); for (let k = 0; k < 60; k++) { x.fillStyle = 'rgba(120,110,96,.2)'; x.fillRect(cx + 10 + r() * 44, cy + 10 + r() * 44, 1, 1); } }   // rappezzo d'intonaco nuovo
    }
    const t = canvasTex(c); CT.dec2M = std({ map: t, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); CT.dec2M.userData.keepTr = true;
  }

  // ---- tutto quello che riempie una casa: chiamato da buildCase per ogni edificio, con il suo contesto ----
  function pienezza(C) {
    const { b, rec, r, FACES, at, fr, inMural, showF, face0, base, top, fl, kitHouse, wins, doorsU, borgo, g } = C;
    posterAtlas(); decal2();
    const IRON = '#26262c', WOODD = '#4a3626';
    const dU = f => { const d = doorsU.find(q => q[0] === f); return d ? d[1] : -9; };
    // 1) manifesti a strati sui muri pieni del piano terra (sulle case del kit: gli spigoli, che sono sempre ciechi)
    showF.forEach(f => {
      const F = FACES[f], pq = F.open ? (borgo ? .75 : .5) : .4;
      const spots = kitHouse ? [1, F.L - 1].filter(u => u > .5 && u < F.L - .5) : ((b.__gwall && b.__gwall[f]) || []).map(k => k * TS + 1);
      spots.forEach(u0 => {
        if (inMural(f, u0) || Math.abs(u0 - dU(f)) < 1.3 || r() > pq) return;
        const n = 2 + Math.floor(r() * 7), yc = base + 1.45 + (r() - .5) * .3;
        for (let q = 0; q < n; q++) {
          const big = r() < .35, w = big ? .85 : .55 + r() * .1, h = w * 1.5, i = (() => { let k; do k = Math.floor(r() * 80); while (k % 10 === 8); return k; })();
          const p = poster(w, h, i); p.rotation.z = (r() - .5) * .14; at(f, p, u0 + (r() - .5) * 1.35, yc + (r() - .5) * .7, .074 + q * .003);
        }
        if (r() < .5) { const p = poster(.5, .75, Math.floor(r() * 8) * 10 + 9); at(f, p, u0 + (r() - .5), yc + .5, .072); }   // il fondo di uno vecchio
      });
      // tabellone delle affissioni del Comune: telaio di ferro, manifesti in fila, quelli vecchi sotto
      if (!kitHouse && r() < .32) { const ks = ((b.__gwall && b.__gwall[f]) || []).filter(k => !inMural(f, k * TS + 1) && Math.abs(k * TS + 1 - dU(f)) > 1.6); if (ks.length) { const u = pick(r, ks) * TS + 1, y = base + 1.55;
        at(f, fB(1.9, 1.3, .05, '#3a3c40', 'paint', .01), u, y, .1); at(f, fB(2.02, .07, .09, '#2a2a2e', 'rust', .01), u, y + .68, .11); at(f, fB(2.02, .06, .09, '#2a2a2e', 'rust', .01), u, y - .68, .11);
        [-1, 1].forEach(s2 => { at(f, fB(.06, 1.8, .06, '#2a2a2e', 'rust', .01), u + s2 * .98, base + .9, .12); });
        const hdr = poster(1.8, .18, 5 * 10 + 5); hdr.scale.y = .5; at(f, hdr, u, y + .55, .135);
        for (let q = 0; q < 6; q++) { const p = poster(.56, .8, (() => { let k; do k = Math.floor(r() * 80); while (k % 10 === 8 || k % 10 === 4); return k; })()); p.rotation.z = (r() - .5) * .05; at(f, p, u - .62 + (q % 3) * .62, y + (q < 3 ? .05 : -.05) - (q >= 3 ? 0 : 0), .13 + q * .002); if (q >= 3) p.position.y = y - .2; else p.position.y = y + .12; } } }
      // tag a spray, bassi, anche sulle serrande
      for (let q = 0, nt = r() < .6 ? 1 + Math.floor(r() * 3) : 0; q < nt; q++) { const u = .6 + r() * (F.L - 1.2); if (inMural(f, u)) continue; const p = poster(1 + r() * .6, 1.1 + r() * .4, Math.floor(r() * 8) * 10 + 8); at(f, p, u, base + .75 + r() * .5, .085 + q * .002); }
    });
    // 2) la storia dei muri: rappezzi, fuliggine sopra qualche finestra, ruggine sotto i davanzali, muffa negli angoli bassi
    if (!kitHouse) showF.forEach(f => { const F = FACES[f];
      for (let q = 0, nr = Math.floor(r() * 3); q < nr; q++) { const u = .8 + r() * (F.L - 1.6); if (inMural(f, u)) continue; at(f, decal(.8 + r() * 1.1, .6 + r() * .8, 12 + Math.floor(r() * 4), CT.dec2M), u, base + 1 + r() * Math.max(.2, top - base - 2), .066); }
      [.35, F.L - .35].forEach(u => { if (r() < .5 && !inMural(f, u)) at(f, decal(.9, .9, 8 + Math.floor(r() * 4), CT.dec2M), u, base + .95, .069); });
    });
    wins.forEach(W0 => { if (W0.g || !W0.name.includes('window')) return; const D = WIN[W0.name]; if (!D) return; const yc = W0.y + D[2];
      if (r() < .12) at(W0.f, decal(D[0] + .5, 1.1, Math.floor(r() * 4), CT.dec2M), W0.u, yc + D[1] / 2 + .55, .073);       // fuliggine: stufa, incendio vecchio
      else if (r() < .15) at(W0.f, decal(D[0] + .2, .7, 4 + Math.floor(r() * 4), CT.dec2M), W0.u, yc - D[1] / 2 - .45, .073); });   // ruggine dalla grata
    // 3) cavi elettrici lungo la facciata, sulle staffe, con la discesa al contatore
    if (r() < (borgo ? .55 : .3)) { const cand = showF.filter(f => FACES[f].cam); if (cand.length) { const f = pick(r, cand), F = FACES[f], y = top - .38;
      for (let u = .3; u < F.L - .2; u += 1.9) at(f, fB(.04, .14, .12, '#3a3a3e', 'paint', 0), u, y, .06);
      [.13, .2].forEach((z, q) => { for (let u = .3; u < F.L - 1.9; u += 1.9) fRod(fr(f), [u, y - q * .05, z], [Math.min(F.L - .3, u + 1.9), y - q * .05, z], .012, '#141416', 'rubber'); });
      const ud = r() < .5 ? .3 : F.L - .3; fRod(fr(f), [ud, y, .16], [ud, base + 2.2, .16], .014, '#141416', 'rubber'); at(f, fB(.28, .36, .12, '#6a6a64', 'paint', .02), ud, base + 2.05, .1); } }
    // 4) applique accanto alle porte che danno sulla strada; festone di lampadine sulle botteghe
    doorsU.forEach(([f, du]) => { const F = FACES[f]; if (!F || !F.open || r() > .75) return;
      const s = r() < .5 ? -1 : 1, u = Math.min(F.L - .2, Math.max(.2, du + s * 1.18)), y = base + 2.35, lit = caseLit(pick(r, ['#ffc070', '#ffb050', '#ffd890']));
      at(f, fB(.16, .22, .06, '#2a2a2e', 'paint', .01), u, y, .07); fRod(fr(f), [u, y, .08], [u, y - .05, .3], .015, '#2a2a2e'); at(f, fC(.09, .12, .1, 8, '#2a2a2e', 'paint'), u, y + .02, .32);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), lit); at(f, gl, u, y - .07, .32);
      if (r() < .45) { const N = [Math.sin(F.yaw), Math.cos(F.yaw)], T2 = [Math.cos(F.yaw), -Math.sin(F.yaw)]; addLight(F.p[0] + T2[0] * u + N[0] * .6, y - .2, F.p[1] + T2[1] * u + N[1] * .6, '#ffb868', 1.3, 5.5, .03); } });
    if ((b.shop || b.sign) && FACES[face0] && FACES[face0].open && r() < .55) {
      const F = FACES[face0], du = dU(face0), u0 = Math.max(.3, du - 3), u1 = Math.min(F.L - .3, du + 3), y0 = base + 3.25, lit = caseLit('#ffd27a');
      let prev = null; for (let q = 0; q <= 12; q++) { const t = q / 12, u = u0 + (u1 - u0) * t, y = y0 - Math.sin(t * Math.PI) * .45, z = .55 + Math.sin(t * Math.PI) * .25, p = [u, y, z]; if (prev) fRod(fr(face0), prev, p, .008, '#141416', 'rubber'); prev = p;
        if (q % 2 === 1) { at(face0, fC(.02, .02, .05, 6, '#2a2a2e', 'solid'), u, y - .05, z); at(face0, new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 5), r() < .12 ? caseLit('#5a4a3a') : lit), u, y - .11, z); } }
      const N = [Math.sin(F.yaw), Math.cos(F.yaw)], T2 = [Math.cos(F.yaw), -Math.sin(F.yaw)], um = (u0 + u1) / 2; addLight(F.p[0] + T2[0] * um + N[0] * 1.2, y0 - .6, F.p[1] + T2[1] * um + N[1] * 1.2, '#ffcc70', 1.6, 7, .02);
    }
    // 5) le botteghe piene: la merce fuori, a seconda del mestiere
    if ((b.shop || b.sign || b.use === 'bar') && FACES[face0] && FACES[face0].open) {
      const F = FACES[face0], du = dU(face0), id = (b.id || '') + ' ' + (b.use || ''), side = r() < .5 ? -1 : 1, us = Math.min(F.L - .8, Math.max(.8, du + side * 2.1));
      const food = /panett|pesch|macell|frutt|alimentar|mercat|forno|wu|emporio/.test(id), bar = /bar|osteria|trattor|circolo|caff|sirena|stella/.test(id), hard = /ferrament|bazar|lavand|tipograf|sartor/.test(id);
      if (food) {   // banco su cavalletti con le cassette piene, la bilancia, la lavagnetta
        const tb = new THREE.Group(); [[-.75, -1], [.75, -1], [-.75, 1], [.75, 1]].forEach(([a, c2]) => fRod(tb, [a, 0, c2 * .25], [a * .9, .8, c2 * .2], .025, WOODD, 'wood')); fAt(tb, fB(1.8, .05, .7, '#7a5e40', 'wood', .01), 0, .82, 0);
        const fish = /pesch/.test(id), bread = /panett|forno/.test(id);
        for (let q = 0; q < 3; q++) { const cr = oCrate(.52, .2, .4, r); fAt(tb, cr, -.58 + q * .58, .85, 0); cr.rotation.x = -.18;
          const col = fish ? pick(r, ['#a8b0b8', '#8a96a0', '#c8c4b8']) : bread ? pick(r, ['#c89050', '#b07a3a', '#d8a868']) : pick(r, ['#c03a2a', '#e08a2a', '#6a8a3a', '#d8c040', '#8a2a4a']);
          for (let k = 0; k < 9; k++) { const it = fish ? fB(.18, .04, .06, col, 'galv', .01) : fI(bread ? .07 : .055, 1, col, bread ? 'clay' : 'plastic'); if (bread) it.scale.set(1.6, .7, .9); it.position.set(-.58 + q * .58 + (r() - .5) * .38, 1.07 + r() * .04, (r() - .5) * .26); it.rotation.y = r() * 3; tb.add(it); } }
        fAt(tb, fB(.22, .06, .18, '#c8c4b8', 'paint', .01), .78, .88, .2); fAt(tb, fC(.1, .1, .01, 10, '#c8c4b8', 'paint'), .78, 1.0, .2);   // bilancia
        at(face0, tb, us, base, .75);
        const bd = new THREE.Group(); fAt(bd, fB(.5, .7, .03, '#1e2420', 'paint', .01), 0, .5, 0).rotation.x = .2; fAt(bd, poster(.38, .5, 5 * 10 + 5), 0, .52, .03).rotation.x = .2; [-1, 1].forEach(s => fRod(bd, [s * .24, 0, .14], [s * .24, .9, -.04], .015, WOODD, 'wood'));   // lavagnetta
        at(face0, bd, Math.min(F.L - .4, Math.max(.4, du - side * 1.6)), base, .9);
      } else if (bar) {   // dehors: tavolini, sedie, posacenere, il menù
        for (let q = 0; q < 2; q++) { const tg = new THREE.Group(), tu = Math.min(F.L - .7, Math.max(.7, du + side * (1.7 + q * 1.5)));
          fAt(tg, fC(.32, .32, .03, 12, '#c8c4b8', 'paint'), 0, .74, 0); fAt(tg, fC(.03, .03, .72, 6, IRON, 'paint'), 0, .37, 0); fAt(tg, fC(.2, .22, .03, 10, IRON, 'paint'), 0, .015, 0);
          fAt(tg, fC(.04, .05, .02, 8, '#8a8a86', 'galv'), .08, .77, 0); fAt(tg, fC(.03, .025, .09, 8, '#c8a050', 'glass'), -.1, .8, .05);
          [-1, 1].forEach(s2 => { const ch = new THREE.Group(); fAt(ch, fB(.4, .04, .38, pick(r, ['#8a3a2e', '#3a4a5a', '#c8c0a8']), 'paint', .01), 0, .45, 0); [[-.17, -.16], [.17, -.16], [-.17, .16], [.17, .16]].forEach(([a, c2]) => fRod(ch, [a, 0, c2], [a, .45, c2], .012, IRON)); fAt(ch, fB(.4, .36, .03, shade('#8a3a2e', .9), 'paint', .008), 0, .66, -.18); ch.position.set(s2 * .55, 0, (r() - .5) * .2); ch.rotation.y = -s2 * Math.PI / 2 + (r() - .5) * .5; tg.add(ch); });
          at(face0, tg, tu, base, 1.05); }
      } else if (hard) {   // bazar: secchi impilati, scope, rotoli di tubo, il pannello con gli attrezzi
        for (let q = 0; q < 3; q++) at(face0, fL([[.13, 0], [.17, .26], [.155, .26], [.12, .02]], 10, pick(r, ['#c03a2a', '#3a6aa8', '#d0b040', '#8a8a86']), q === 2 ? 'galv' : 'plastic'), us + (q - 1) * .36, base + (q % 2) * .02, .45);
        for (let q = 0; q < 4; q++) { const br = new THREE.Group(); fRod(br, [0, 0, 0], [0, 1.3, 0], .015, '#9a7a4a', 'wood'); fAt(br, fB(.22, .18, .06, pick(r, ['#c8a050', '#3a3a3a', '#a83a2a']), 'cloth', .01), 0, .05, 0); br.rotation.z = (q - 1.5) * .06; at(face0, br, us + .7 + q * .1, base, .2); }
        at(face0, fT(.25, .05, 14, '#2a2a2c', 'rubber'), us - .7, base + .05, .4); at(face0, fB(1.1, .8, .04, '#7a5e40', 'wood', .01), us, base + 1.75, .08);
        for (let q = 0; q < 6; q++) at(face0, fB(.06, .3 + r() * .2, .03, pick(r, ['#5a5a5e', '#8a6a46', '#a83a2a']), 'paint', .005), us - .4 + q * .16, base + 1.7, .12);
      } else {   // le altre botteghe: due vasi grandi ai lati della porta e lo zerbino
        [-1, 1].forEach(s2 => at(face0, oPot(r, 1.4, 'cespo'), Math.min(F.L - .3, Math.max(.3, du + s2 * 1.25)), base, .4)); at(face0, fB(.9, .02, .5, '#5a4a3a', 'cloth', 0), du, base + .01, .3);
      }
    }
  }
