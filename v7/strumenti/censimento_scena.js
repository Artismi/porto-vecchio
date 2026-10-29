// [qa_visivo] IL CENSIMENTO DELLA SCENA: il gioco vero in Chromium senza testa (?cittanuova), e per ogni oggetto statico posato
// (tutto quello che passa da addStatic: render.js lo dà a Pavimenti.oggetto con il suo nome, qui lo si ascolta senza cambiarlo) si misura:
//   nero        parti di colore quasi nero (luminanza < 0,05, opache) larghe più di 0,3 m²: le macchie e i buchi neri (tombini, botole, pannelli)
//   lowpoly     cilindri e coni con 6 lati o meno e raggio oltre 20 cm, sfere con 6 spicchi o meno: le sagome a spigoli fuori stile
//   doppio      due oggetti con lo stesso nome e la stessa scatola (entro 5 cm): il doppione posato due volte
//   filo        parti piatte (alte meno di 1 cm) appoggiate a meno di 1,5 cm dal suolo, opache e senza polygonOffset: lo sfarfallio col suolo
//   scatole     oggetti fatti solo di parallelepipedi (BoxGeometry) con più di 6 pezzi: il low poly a mattoncini
//   misure      per nome: quanti, altezza e lato minimi, mediani e massimi (la scala sbagliata si vede dai fuori-scala)
// In più la misura di chi galleggia e chi affonda (Pavimenti.misura, dopo la posa) e, se FOTO=n, n foto dall'alto della città.
//   node strumenti/censimento_scena.js [uscita.json]        (da v7; FOTO=4 per le foto, FOTO_DIR=cartella)
// Sotto SwiftShader il caricamento dura 4-6 minuti; una foto da 1 a 4 minuti.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), outJ = path.resolve(process.argv[2] || path.join(root, 'reports', 'censimento_scena.json'));
const FOTO = +(process.env.FOTO || 0), FOTO_DIR = process.env.FOTO_DIR || path.join(path.dirname(outJ), 'foto');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
// le foto dall'alto: punti della città (metri), zoom alto = vicino
const PUNTI = [
  { nome: 'vittoria_cordoli', x: 1300, y: 300, zoom: 1.6 }, { nome: 'rua_borgo', x: 1420, y: 300, zoom: 1.6 },
  { nome: 'marina', x: 1400, y: 395, zoom: 1.4 }, { nome: 'ottagono', x: 1265, y: 340, zoom: 1.4 },
  { nome: 'mercato', x: 1340, y: 360, zoom: 1.6 }, { nome: 'mezzo', x: 1445, y: 390, zoom: 1.6 } ];
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const t0 = Date.now(), b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: FOTO ? 760 : 480, height: FOTO ? 480 : 300 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.addInitScript(() => {
    window.__pulita = true; const REC = window.__cens = { ogg: [], nero: [], low: [], filo: [], scat: [], n: 0 };
    const chi = () => { const L = (new Error().stack || '').split('\n'); let seen = false;
      for (const l of L) { const m = /at (?:Object\.)?([\w$]+) /.exec(l); if (!m) continue; if (m[1] === 'addStatic') { seen = true; continue; } if (seen && !/^(place|placeYS1|at1|at|put|G0|add|settle|forEach|map)$/.test(m[1])) return m[1]; } return '?'; };
    const hook = () => { const P = window.Pavimenti; if (!P || !P.oggetto || P.__cens) return false; const orig = P.oggetto; P.__cens = true;
      P.oggetto = function (obj, nome) { const dy = orig.apply(this, arguments);
        try { if (typeof THREE === 'undefined' || !obj) return dy; const bx = new THREE.Box3().setFromObject(obj); if (bx.isEmpty()) return dy;
          const s = bx.getSize(new THREE.Vector3()), c = bx.getCenter(new THREE.Vector3()), nm = nome || obj.name || '?'; REC.n++;
          let nb = 0, nm2 = 0, who = null; const W = () => who || (who = chi());
          REC.ogg.push([nm, +c.x.toFixed(2), +(bx.min.y - (dy || 0)).toFixed(3), +c.z.toFixed(2), +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)]);
          obj.traverse(o => { if (!o.isMesh || !o.geometry) return; nm2++; const g = o.geometry, p = g.parameters || {}, t = g.type, mt = Array.isArray(o.material) ? o.material[0] : o.material; if (t === 'BoxGeometry') nb++;
            const ob = new THREE.Box3().setFromObject(o), os = ob.getSize(new THREE.Vector3()), oc = ob.getCenter(new THREE.Vector3());
            if (mt && mt.color && !mt.transparent && !mt.vertexColors && !(mt.emissive && mt.emissive.r + mt.emissive.g + mt.emissive.b > .3)) { const C = mt.color, L = .2126 * C.r + .7152 * C.g + .0722 * C.b, area = Math.max(os.x * os.z, os.x * os.y, os.y * os.z);
              if (L < .05 && area > .3) REC.nero.push([nm, W(), +oc.x.toFixed(1), +oc.z.toFixed(1), +area.toFixed(2), '#' + C.getHexString(), +os.y.toFixed(2)]); }
            if ((t === 'CylinderGeometry' || t === 'ConeGeometry') && p.radialSegments <= 6 && Math.max(p.radiusTop || 0, p.radiusBottom || 0, p.radius || 0) * (o.scale ? Math.max(o.scale.x, o.scale.z) : 1) > .2) REC.low.push([nm, W(), 'cil' + p.radialSegments, +oc.x.toFixed(1), +oc.z.toFixed(1), +Math.max(os.x, os.z).toFixed(2)]);
            if (t === 'SphereGeometry' && p.widthSegments <= 6 && p.radius > .2) REC.low.push([nm, W(), 'sfera' + p.widthSegments, +oc.x.toFixed(1), +oc.z.toFixed(1), +Math.max(os.x, os.z).toFixed(2)]);
            if (os.y < .01 && os.x * os.z > .02 && mt && !mt.transparent && !mt.polygonOffset) REC.filo.push([nm, W(), +oc.x.toFixed(2), +(ob.min.y - (dy || 0)).toFixed(3), +oc.z.toFixed(2), +(os.x * os.z).toFixed(2)]);
          });
          if (nb === nm2 && nb > 6) REC.scat.push([nm, W(), nb, +c.x.toFixed(1), +c.z.toFixed(1)]);
        } catch (e) { }
        return dy; };
      return true; };
    const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 5);
  });
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`);
  await pg.waitForFunction(() => window.__pulizia2 && window.__pv && window.__pv.st, null, { timeout: 1500000, polling: 3000 });
  console.log('caricato in', Math.round((Date.now() - t0) / 1000), 's');
  const R = await pg.evaluate(() => {
    const C = window.__cens, R = window.__pv.R, gh = (x, z) => R.groundH(x, z);
    // il filo: quanto sta sopra il suolo (dopo la città costruita: groundH definitivo)
    const filo = C.filo.map(q => [...q, +(q[3] - gh(q[2], q[4])).toFixed(3)]).filter(q => Math.abs(q[6]) < .015);
    // i doppioni: stesso nome, stessa scatola entro 5 cm
    const M = new Map(), dop = []; C.ogg.forEach(q => { const k = [q[0], Math.round(q[1] * 20), Math.round(q[2] * 20), Math.round(q[3] * 20), Math.round(q[4] * 20), Math.round(q[5] * 20), Math.round(q[6] * 20)].join('|'); if (M.has(k)) dop.push(q); else M.set(k, 1); });
    // le misure per nome
    const per = {}; C.ogg.forEach(q => { (per[q[0]] = per[q[0]] || []).push(q); });
    const med = a => { a = a.slice().sort((x, y) => x - y); return [a[0], a[a.length >> 1], a[a.length - 1]].map(v => +v.toFixed(2)); };
    const misure = Object.entries(per).map(([k, L]) => ({ nome: k, n: L.length, alto: med(L.map(q => q[5])), lato: med(L.map(q => Math.max(q[4], q[6]))) })).sort((a, b) => b.n - a.n);
    const pv = window.Pavimenti && Pavimenti.misura ? Pavimenti.misura() : null; if (pv) delete pv.tutti;
    return { oggetti: C.n, nero: C.nero, low: C.low, filo, doppi: dop, scatole: C.scat, misure, posa: pv, pulizia2: { prima: window.__pulizia2.prima.per, dopo: window.__pulizia2.dopo.per, azioni: window.__pulizia2.azioni } };
  });
  const conta = (L, i) => { const o = {}; L.forEach(q => { const k = Array.isArray(i) ? i.map(j => q[j]).join(' @ ') : q[i]; o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const stampa = (tit, L, i, n) => { console.log(`\n${tit}: ${L.length}`); conta(L, i).slice(0, n || 15).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`)); };
  console.log('oggetti statici ascoltati', R.oggetti);
  stampa('NERO (parti quasi nere > 0,3 m², per nome @ chi)', R.nero, [0, 1, 5]);
  stampa('LOW POLY (per nome @ chi @ forma)', R.low, [0, 1, 2], 25);
  stampa('A FILO DEL SUOLO senza polygonOffset (per nome @ chi)', R.filo, [0, 1]);
  stampa('DOPPIONI (stesso nome, stessa scatola)', R.doppi, 0);
  stampa('SOLO SCATOLE, più di 6 pezzi (per nome @ chi)', R.scatole, [0, 1], 25);
  if (R.posa) console.log('\nPOSA (Pavimenti.misura)', JSON.stringify({ prima: R.posa.primaDellaPosa, posati: R.posa.posati, oggetti: R.posa.oggetti, galleggiano: R.posa.galleggiano, affondano: R.posa.affondano }), '\n  su:', JSON.stringify(R.posa.perNomeSu), '\n  giu:', JSON.stringify(R.posa.perNomeGiu));
  console.log('\nMISURE (i 40 nomi più frequenti: n, altezza min/med/max, lato min/med/max)'); R.misure.slice(0, 40).forEach(m => console.log(`  ${m.nome.padEnd(22)} ${String(m.n).padStart(5)}  h ${m.alto.join('/')}  l ${m.lato.join('/')}`));
  fs.mkdirSync(path.dirname(outJ), { recursive: true }); fs.writeFileSync(outJ, JSON.stringify(R, null, 1)); console.log('\nsalvato', outJ);
  // le foto dall'alto, se chieste
  if (FOTO) { fs.mkdirSync(FOTO_DIR, { recursive: true });
    await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
    await pg.evaluate(() => { const pv = window.__pv; setInterval(() => { const u = pv.ui; u.dialog = null; u.book = false; u.menu = false; pv.st.over = null; }, 100); });
    for (const s of PUNTI.slice(0, FOTO)) { const ts = Date.now();
      try {
        await pg.evaluate(s => { const pv = window.__pv, R = pv.R, ui = pv.ui, p = pv.st.player; p.x = s.x; p.y = s.y; p.path = []; ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = s.zoom; let t = Math.floor(pv.st.t / 1440) * 1440 + 660; if (t < pv.st.t) t += 1440; pv.st.t = t; }, s);
        for (let q = 0, tb = Date.now(); Date.now() - tb < 90000 && q < 2;) { await pg.waitForTimeout(1500); q = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? q + 1 : 0; }
        const url = await Promise.race([pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(document.getElementById('cv').toDataURL('image/png')))))), new Promise(r => setTimeout(() => r(null), 300000))]);
        if (url) { fs.writeFileSync(path.join(FOTO_DIR, s.nome + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('foto', s.nome, Math.round((Date.now() - ts) / 1000), 's'); } else console.log('foto', s.nome, 'scaduta');
      } catch (e) { console.log('foto', s.nome, 'errore', e.message); } } }
  await b.close(); srv.close();
});
