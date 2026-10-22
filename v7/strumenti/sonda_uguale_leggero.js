// [leggero] La prova «stessa immagine» degli alleggerimenti (node strumenti/sonda_uguale_leggero.js), sul modello di sonda_uguale.js di
// [leggera], ma fra due pagine: il gioco com'è (?cittanuova) e lo stesso con gli alleggerimenti spenti (?cittanuova&noleggero, render.js
// LEGGERO). In ogni scorcio della città compatta le due pagine vanno nello stesso posto alla stessa ora, poi si fermano (niente logica e
// niente fotogrammi), prendono la stessa camera, la stessa luce del sole e lo stesso vento, nascondono chi si muove (persone, mezzi,
// particelle, bagliori: nelle due pagine non sono gli stessi) e disegnano la sola scena; si confrontano i pixel e si contano i disegni.
// Il giudizio è sui pixel delle case fuse (la maschera); il resto si riporta (le cose sparse a caso cambiano da pagina a pagina).
// SOLO=borgo,vittoria  VW=480 VH=300  SOGLIA=0 (scarto ammesso per canale)  ATTESA=6000  SALVA=cartella (le due immagini e la differenza ×16)
// SEME=n: Math.random col seme in tutte e due le pagine (attenzione: con il seme il caricamento della città compatta oggi non finisce). PV_QUERY (predefinito ?cittanuova) e SPENTO (predefinito &noleggero). Esce con 1 se un'immagine cambia.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const NOMI = { c3_borgo_incroci: 'borgo', c4_vittoria: 'vittoria', c5_mercato: 'mercato', c6_marina: 'marina', c7_citta: 'citta' };
const SC = JSON.parse(fs.readFileSync(path.join(__dirname, 'scorci_compatta.json'), 'utf8')).scorci.filter(s => NOMI[s.nome]).map(s => Object.assign({}, s, { nome: NOMI[s.nome] }))
  .filter(s => !process.env.SOLO || process.env.SOLO.split(',').includes(s.nome));
const SOGLIA = +(process.env.SOGLIA || 0), SALVA = process.env.SALVA, W = +(process.env.VW || 480), H = +(process.env.VH || 300);
const Q = process.env.PV_QUERY !== undefined ? process.env.PV_QUERY : '?cittanuova', SPENTO = process.env.SPENTO || '&noleggero';
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let fail = 0;
  const apri = async (q, nome) => {
    const pg = await b.newPage({ viewport: { width: W, height: H } });
    pg.on('pageerror', e => { fail++; console.log('[errore ' + nome + ']', e.message); });
    pg.on('console', m => { if ((m.type() === 'error' && !/404/.test(m.text())) || /\[leggero\]/.test(m.text())) console.log('[console ' + nome + ']', m.text().slice(0, 300)); });
    await pg.addInitScript(() => { window.__pulita = true; });
    // lo stesso caso nelle due pagine (come src/seme.js): le cose sparse, le tende, la merce vengono uguali dove l'ordine delle chiamate è lo stesso
    if (process.env.SEME) await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, +process.env.SEME);
    await pg.goto(`http://localhost:${port}/index.html${q}`, { timeout: 600000 });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000 });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
    await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log(nome, 'ancora nella schermata iniziale'));
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
    return pg;
  };
  const A = await apri(Q, 'ora'), B = await apri(Q + SPENTO, 'spento');   // una dopo l'altra: insieme, il caricamento scadeva
  log('pagine pronte', JSON.stringify(await A.evaluate(() => window.__fusione1 || null)), JSON.stringify(await B.evaluate(() => window.__fusione1 || null)));
  for (const s of SC) {
    // il posto e l'ora, uguali nelle due pagine (giorno di partenza: le pagine nuove partono dallo stesso orologio)
    const vai = pg => pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; st.t = window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + s.ora; window.__meteo = s.meteo || 'sereno';
      ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom || 1; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = ui.zoom; R.cam.uy = 0; }, s);
    await Promise.all([vai(A), vai(B)]);
    const quiete = async pg => { for (let k = 0, q = 0, tb = Date.now(); Date.now() - tb < 60000 && q < 2; k++) { await pg.waitForTimeout(1000); q = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? q + 1 : 0; } };
    await Promise.all([quiete(A), quiete(B)]); await A.waitForTimeout(+(process.env.ATTESA || 6000));
    // ferme: niente logica e niente fotogrammi (il ciclo continua a girare a vuoto)
    const ferma = pg => pg.evaluate(t => { const pv = window.__pv; window.__f0 = [pv.R.frame, pv.G.step]; pv.R.frame = () => { }; pv.G.step = () => { }; pv.st.t = t; }, s.ora);
    await Promise.all([ferma(A), ferma(B)]);
    // la camera, le luci direzionali e la nebbia di A, il vento fisso, chi si muove nascosto
    const stato = await A.evaluate(() => { const R = window.__pv.R, S = R.__models.scene, c = R.getCamera(), L = [];
      S.traverse(o => { if (o.isLight) { const sc = o.shadow && o.shadow.camera; L.push([o.position.toArray(), o.target ? o.target.position.toArray() : null, o.intensity, o.color.getHex(), o.visible, o.distance, o.angle, o.penumbra, o.type, sc && sc.isOrthographicCamera ? [sc.left, sc.right, sc.top, sc.bottom, sc.near, sc.far, o.shadow.bias, o.shadow.normalBias] : null, o.castShadow]); } });
      return { cam: [c.position.toArray(), c.quaternion.toArray(), c.fov, c.near, c.far, c.aspect, c.zoom], L, fog: S.fog ? [S.fog.near, S.fog.far, S.fog.color.getHex()] : null, bg: S.background && S.background.isColor ? S.background.getHex() : null }; });
    const foto = pg => pg.evaluate(([z, W, H]) => {
      const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, c = R.getCamera(), M = R.__mondo;
      c.position.fromArray(z.cam[0]); c.quaternion.fromArray(z.cam[1]); c.fov = z.cam[2]; c.near = z.cam[3]; c.far = z.cam[4]; c.aspect = z.cam[5]; c.zoom = z.cam[6]; c.updateProjectionMatrix(); c.updateMatrixWorld(true);
      // tutte le luci come in A (faretti e punti dei lampioni compresi), se sono le stesse per numero e tipo
      const LL = []; S.traverse(o => { if (o.isLight) LL.push(o); }); const same = LL.length === z.L.length && LL.every((o, k) => o.type === z.L[k][8]);
      LL.forEach((o, k) => { const q = z.L[k]; if (!q || (!same && !(o.isDirectionalLight || o.isHemisphereLight || o.isAmbientLight))) return; o.position.fromArray(q[0]); if (q[1] && o.target) { o.target.position.fromArray(q[1]); o.target.updateMatrixWorld(); } o.intensity = q[2]; o.color.setHex(q[3]); o.visible = q[4]; if (q[5] !== undefined) o.distance = q[5]; if (q[6] !== undefined) o.angle = q[6]; if (q[7] !== undefined) o.penumbra = q[7]; if (q[9] && o.shadow) { const sc = o.shadow.camera; [sc.left, sc.right, sc.top, sc.bottom, sc.near, sc.far, o.shadow.bias, o.shadow.normalBias] = q[9]; sc.updateProjectionMatrix(); } if (q[10] !== undefined) o.castShadow = q[10]; o.updateMatrixWorld(); if (o.shadow) o.shadow.needsUpdate = true; });
      if (z.fog && S.fog) { S.fog.near = z.fog[0]; S.fog.far = z.fog[1]; S.fog.color.setHex(z.fog[2]); } if (z.bg !== null && S.background && S.background.isColor) S.background.setHex(z.bg);
      if (M && M.V) { M.V.t.value = 10; M.V.g.value = .4; }
      const vh = new Set(Object.values(R.__vehicles || {})), hid = [];
      S.traverse(o => { if (!o.visible) return; let mob = o.isSkinnedMesh || o.isSprite || o.isPoints || o.isLine || vh.has(o); if (mob) { o.visible = false; hid.push(o); } });
      const T = new THREE.WebGLRenderTarget(W, H), a = new Uint8Array(W * H * 4), a2 = new Uint8Array(W * H * 4);
      const au = rd.shadowMap.autoUpdate; rd.shadowMap.autoUpdate = false;
      rd.shadowMap.needsUpdate = true; rd.setRenderTarget(T); rd.render(S, c); const calls = rd.info.render.calls; rd.readRenderTargetPixels(T, 0, 0, W, H, a);
      rd.shadowMap.needsUpdate = true; rd.render(S, c); rd.readRenderTargetPixels(T, 0, 0, W, H, a2); rd.setRenderTarget(null); T.dispose(); rd.shadowMap.autoUpdate = au;
      // la maschera delle case fuse e delle statiche alleggerite (userData.leggero) (bianco) davanti al resto (nero), con gli stessi oggetti davanti
      let mask = null; if (z.mask) { const wb = new THREE.MeshBasicMaterial({ color: 0xffffff }), bk = new THREE.MeshBasicMaterial({ color: 0x000000 }), sv = [];
        S.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible) { sv.push([o, o.material]); o.material = o.userData.fusione1 || o.userData.leggero ? wb : bk; } });
        const T2 = new THREE.WebGLRenderTarget(W, H), mk = new Uint8Array(W * H * 4); rd.setRenderTarget(T2); rd.render(S, c); rd.readRenderTargetPixels(T2, 0, 0, W, H, mk); rd.setRenderTarget(null); T2.dispose();
        sv.forEach(([o, m]) => o.material = m); mask = []; for (let k = 0; k < W * H; k++) mask.push(mk[k * 4] > 127 ? 1 : 0); }
      hid.forEach(o => o.visible = true);
      let rip = 0; for (let k = 0; k < a.length; k++) if (a[k] !== a2[k]) rip++;
      return { px: Array.from(a), calls, rip, progs: rd.info.programs.length, mask };
    }, [stato, W, H]);
    stato.mask = true; const fa = await foto(A); stato.mask = false; const fb = await foto(B);
    await Promise.all([A, B].map(pg => pg.evaluate(() => { const pv = window.__pv; [pv.R.frame, pv.G.step] = window.__f0; })));
    // tutta l'immagine e, a parte, i soli pixel delle case fuse (la maschera di A): le cose sparse a caso (bottino, merce, luci accese)
    // non sono le stesse nelle due pagine, le case sì
    let diff = 0, max = 0, casa = 0, casaD = 0, casaMax = 0; const dd = new Uint8Array(fa.px.length);
    for (let i = 0; i < fa.px.length; i++) { const d = Math.abs(fa.px[i] - fb.px[i]), mk = fa.mask && fa.mask[i >> 2] && (i & 3) !== 3; if (mk) casa++; if (d) { diff++; if (d > max) max = d; if (mk) { casaD++; if (d > casaMax) casaMax = d; } } dd[i] = (i & 3) === 3 ? 255 : Math.min(255, d * 16); }
    const ok = casaMax <= SOGLIA && !fa.rip && !fb.rip; if (!ok) fail++;
    log(s.nome, ok ? 'CASE UGUALI' : 'CASE DIVERSE', JSON.stringify({ disegni_ora: fa.calls, disegni_spento: fb.calls, programmi: [fa.progs, fb.progs], case_canali: casa, case_diversi: casaD, case_scarto_max: casaMax, tutto_diversi_pct: +(diff / (W * H * 3) * 100).toFixed(3), tutto_scarto_max: max, instabile: [fa.rip, fb.rip] }));
    if (SALVA) { fs.mkdirSync(SALVA, { recursive: true });
      const png = await A.evaluate(([L, W, H]) => L.map(arr => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), im = x.createImageData(W, H); for (let y = 0; y < H; y++) for (let k = 0; k < W * 4; k++) im.data[y * W * 4 + k] = arr[(H - 1 - y) * W * 4 + k]; x.putImageData(im, 0, 0); return c.toDataURL('image/png').split(',')[1]; }), [[fa.px, fb.px, Array.from(dd)], W, H]);
      ['ora', 'spento', 'diff'].forEach((k, i) => fs.writeFileSync(path.join(SALVA, `${s.nome}_${k}.png`), Buffer.from(png[i], 'base64'))); }
  }
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
