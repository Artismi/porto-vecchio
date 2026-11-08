// [graffitipool] IL CATALOGO DEI GRAFFITI: i pezzi veri, disegnati col codice del gioco (writer_arte.js + pennelli.js, come il disegnatore a
// parte), con lo stile E di serie (la tavolozza lutE, il bordo netto, la finitura dei pennelli: w.sdPal). Ogni stile per le crew della scena
// (strada_dipinta.js CREW) e le crew sciolte sbiadite, i manifesti, gli adesivi, la toppa grigia. Etichetta: stile · crew · writer · font.
//   node strumenti/graffiti_catalogo.js <cartella uscita> [conti.json]      → catalogo_1.jpg … catalogo_N.jpg (2400 px di largo)
// conti.json (strumenti/graffiti_pool.js): i numeri della città di serie nelle intestazioni. Chromium senza testa (canvas 2D, niente WebGL).
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const SRC = path.join(__dirname, '..', 'src'), OUT = path.resolve(process.argv[2] || '.'), CONTI = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
fs.mkdirSync(OUT, { recursive: true });
// la scena di qui: le crew, i manifesti, i loghi (gli stessi dati del gioco)
global.PV_STRADA_DIPINTA = true;
const rq = f => require(path.join(SRC, f));
global.World = rq('world_cittanuova.js'); global.Interior = rq('interiors.js'); global.Game = rq('game.js');
const SD = rq('strada_dipinta.js'), CREW = SD.CREW, MAN = SD.MAN, LOGHI = SD.LOGHI;
const VECCHI = [['RENZ', 'OGS'], ['MASK', 'OGS'], ['KAOS', 'FLM'], ['DOGE', 'FLM'], ['NEVA', 'SPK'], ['RUGA', 'SPK']];
const CR = ['BDS', 'TNT', 'PVK', 'RSC', 'KML', 'TOY'];
const king = c => CREW[c].scrittori[0], wr = (c, i) => CREW[c].scrittori[i % 4];
const S = { tag: [1.1, .55], mtag: [.6, .32], throw: [2.7, 1.3], pezzo: [4.8, 2.05], burner: [6.6, 2.5], gotico: [1.4, 3.2], mostro: [3, 2.6], wholecar: [16, 2.9], rullo: [9, 2.4], verticale: [2, 7], estintore: [3, 4], stencil: [1, 1.1], scritta: [4.5, .75], manifesto: [1.2, 1.4], adesivi: [.6, .5], murale: [6.5, 4], calli: [4.2, 2.2], buff: [2.2, 1.3] };
let SEED = 41000;
// un lavoro come lo fa strada_dipinta.js lavoro(): crew viva fresca (età .1-.3) o crew sciolta sbiadita (.7-.9)
function L(style, aka, crew, o) { o = o || {}; const old = !CREW[crew]; return Object.assign({ style, aka, crew, seed: SEED += 977, old: true, sdPal: 1, sdEta: old ? .78 : .12 + (SEED % 7) * .03, W: S[style][0], H: S[style][1], sup: o.sup || 'intonaco' }, o); }
const fogli = [
  { t: 'Tag a spruzzo (tag) e tag a pennarello (mtag)', k: ['tag', 'mtag'], w: 560, L: [...CR.map((c, i) => L('tag', wr(c, i), c, { tagK: 1 })), L('tag', 'RENZ', 'OGS'), L('tag', 'NEVA', 'SPK'), ...CR.map((c, i) => L('mtag', wr(c, i + 1), c)), L('mtag', 'KAOS', 'FLM'), L('mtag', 'RUGA', 'SPK')] },
  { t: 'Throw-up', k: ['throw'], w: 760, L: [...CR.map((c, i) => L('throw', wr(c, i), c)), L('throw', 'MASK', 'OGS'), L('throw', 'DOGE', 'FLM'), L('throw', king('BDS'), 'BDS', { sup: 'mattoni' })] },
  { t: 'Pezzi', k: ['pezzo'], w: 1160, L: [...CR.map(c => L('pezzo', king(c), c)), L('pezzo', 'RENZ', 'OGS'), L('pezzo', 'NEVA', 'SPK', { sdToppa: [.15, .12, .6, .86, '#A89C92'] })] },
  { t: 'Burner e murali (i fondali e il porto)', k: ['burner', 'murale'], w: 1160, L: [L('burner', king('TNT'), 'TNT', { bgk: 'rullo' }), L('burner', king('RSC'), 'RSC', { bgk: 'rullo' }), L('burner', king('PVK'), 'PVK', { words: 'PVK' }), L('burner', 'KAOS', 'FLM'), L('murale', 'MAREA', 'RSC'), L('murale', 'ORZO', 'KML'), L('murale', 'GOZO', 'BDS'), L('murale', 'ZENA', 'PVK')] },
  { t: 'Rulli, verticali, estintore, gotico (i palazzi e i muri lunghi)', k: ['rullo', 'verticale', 'estintore', 'gotico'], w: 560, L: [L('rullo', king('KML'), 'KML', { _w: 1160 }), L('rullo', 'BDS', 'BDS', { words: 'BDS', _w: 1160 }), L('verticale', king('TNT'), 'TNT', { H: 6 }), L('verticale', 'RSC', 'RSC', { words: 'RSC', H: 6 }), L('verticale', 'VERA', 'PVK', { H: 6 }), L('verticale', 'ASMA', 'OGS', { H: 6 }), L('estintore', 'FUMO', 'TNT'), L('estintore', 'ZULU', 'KML'), L('estintore', 'MOLO', 'PVK'), L('gotico', 'NAPO', 'TNT'), L('gotico', 'SALE', 'BDS'), L('gotico', 'ZENA', 'PVK')] },
  { t: 'Stencil, scritte, calligraffiti', k: ['stencil', 'scritta', 'calli'], w: 560, L: [...['TNT', 'PVK', 'RSC', 'BDS', 'TOY', 'KML'].map((c, i) => L('stencil', wr(c, i), c, { motifSeed: (SEED * 13) ^ 0x5a5a })), L('scritta', 'KILO', 'RSC', { kind: 'politica', _w: 1160 }), L('scritta', 'GEKO', 'TOY', { kind: 'amore', _w: 1160 }), L('scritta', 'TREK', 'TNT', { kind: 'strada', words: 'TNT IN CASA', _w: 1160 }), L('scritta', 'MURE', 'BDS', { kind: 'ultras', _w: 1160 }), L('calli', 'SUBA', 'RSC', { _w: 760 }), L('calli', 'CIAPA', 'PVK', { _w: 760 }), L('calli', 'NEMO', 'OGS', { _w: 760 })] },
  { t: 'Personaggio (mostro) e whole car (non nella città di partenza: il mostro solo a mano, il whole car sui treni)', k: ['mostro', 'wholecar'], w: 760, L: [L('mostro', 'PIX', 'TOY'), L('mostro', 'NAPO', 'TNT'), L('mostro', 'MOLO', 'PVK'), L('wholecar', king('TNT'), 'TNT', { _w: 2350, surf: 'treno' }), L('wholecar', 'RIVA', 'TNT', { _w: 2350, surf: 'treno' })] },
  { t: 'Manifesti (i fogli del posto, per zona; a strati dove si sta)', k: ['manifesto'], w: 440, man: true, L: [] },
  { t: 'Adesivi (sul muro, accanto alle porte, sui pali, dietro i cartelli) e la toppa grigia di chi ripulisce', k: ['adesivi', 'buff'], w: 440, L: [] },
];
// i manifesti: ogni foglio di MAN da solo (nuovo), più tre pile a strati
{ const f = fogli[7]; let c = 0; for (const cat in MAN) MAN[cat].forEach(m => { f.L.push(L('manifesto', 'X', '', { aka: '', sdEta: .1, sdFresco: cat === 'piazza', sdManifesti: [Object.assign({ c: c++ % 10 }, m)], _cat: cat, _tit: m.t.replace('\n', ' ') })); });
  [['porto', 'serate', 'porto'], ['vicolo', 'serate', 'vicolo'], ['strada', 'serate', 'strada']].forEach((cs, j) => f.L.push(L('manifesto', 'X', '', { aka: '', sdEta: .1, W: 1.9, H: 1.5, sdManifesti: cs.map((k, i) => Object.assign({ c: (j * 3 + i * 4) % 10 }, MAN[k][(j + i) % MAN[k].length])), _cat: 'a strati', _tit: 'pila di ' + cs.length + ' fogli', _w: 640 }))); }
{ const f = fogli[8], ade = (crs, n) => ({ n, nomi: crs.flatMap(c => (CREW[c] || CREW.PVK).scrittori.slice(0, 3)), crew: crs, loghi: LOGHI });
  [['porto', ['BDS', 'KML', 'PVK']], ['ferrovia', ['TNT', 'KML', 'PVK']], ['vicolo', ['PVK', 'TOY', 'PVK']], ['Muro', ['RSC', 'PVK']], ['ritrovo', ['PVK', 'BDS', 'TOY']], ['lungomare', ['BDS', 'TOY', 'PVK']]].forEach(([z, crs], i) => f.L.push(L('adesivi', CREW[crs[0]].scrittori[0], crs[0], { sdEta: .2, sdAdesivi: ade(crs, 9 + i % 3), _cat: 'muro, ' + z })));
  f.L.push(L('adesivi', 'CIAPA', 'PVK', { W: .42, H: .5, sdEta: .1, sdAdesivi: ade(['PVK', 'TOY'], 6), _cat: 'accanto alla porta' }));
  f.L.push(L('adesivi', 'TREK', 'TNT', { W: .42, H: .32, sdEta: .3, sup: 'metallo', sdAdesivi: ade(['TNT', 'PVK'], 7), _cat: 'dietro il cartello' }));
  f.L.push(L('adesivi', 'GOZO', 'BDS', { W: .1, H: .45, sdEta: .1, sup: 'metallo', sdAdesivi: ade(['BDS', 'PVK'], 5), _cat: 'striscia sul palo', _w: 160 }));
  f.L.push(L('adesivi', 'ZULU', 'KML', { W: .1, H: .45, sdEta: .3, sup: 'metallo', sdAdesivi: ade(['KML', 'TNT'], 5), _cat: 'striscia sul palo', _w: 160 }));
  ['GOZO', 'TREK', 'ZENA'].forEach((s, i) => f.L.push(L('buff', 'X', '', { aka: '', sdEta: .2, sdSotto: s, _cat: 'toppa sopra una tag di ' + s, _w: 560 })));
  f.L.push(L('pezzo', 'RENZ', 'OGS', { sdEta: .82, sdToppa: [.1, .1, .62, .9, '#B4ABA0'], _cat: 'pezzo vecchio con la toppa (muro vissuto)', _w: 900 })); }

const js = ['fonts_graffiti.js', 'writer_mano.js', 'writer_arte.js', 'pennelli.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 2400, height: 1200 } });
  const err = []; pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => { if (m.type() === 'error') err.push(m.text()); });
  await pg.setContent('<html><head><style>body{margin:0;background:#2b2724;color:#efe6d4;font:15px/1.3 "DejaVu Sans",sans-serif}h1{font:600 30px "DejaVu Sans";margin:0 0 4px}#h{padding:22px 24px 10px}#h p{margin:2px 0;color:#cbbfa8;font-size:16px}#g{display:flex;flex-wrap:wrap;gap:18px;padding:12px 24px 28px;align-items:flex-start;width:2352px}.b{background:#3a3430;padding:10px;border-radius:6px}.b canvas{display:block}.l{margin-top:7px;font-size:15px}.l b{color:#fff}.l i{color:#bfb39c;font-style:normal}</style></head><body><div id="h"></div><div id="g"></div></body></html>');
  await pg.addScriptTag({ content: js });
  await pg.evaluate(() => WriterArte.fontsReady());
  // il font: si guarda quali famiglie il disegno mette nel contesto 2D (tutti gli stili, non solo throw-up e pezzi che lo dicono in A.font)
  await pg.evaluate(() => { const P = [CanvasRenderingContext2D.prototype]; if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') P.push(OffscreenCanvasRenderingContext2D.prototype);
    P.forEach(pr => { const d = Object.getOwnPropertyDescriptor(pr, 'font'); Object.defineProperty(pr, 'font', { configurable: true, get() { return d.get.call(this); }, set(v) { const m = /px\s+(.+)$/.exec(v); if (m && window.__F) { const f = m[1].replace(/["']/g, '').split(',')[0].trim(); if (!/^(Arial|sans-serif|serif|monospace|DejaVu Sans)$/i.test(f)) window.__F[f] = (window.__F[f] || 0) + 1; } d.set.call(this, v); } }); }); });
  const NOME = { tag: 'tag', mtag: 'tag a pennarello', throw: 'throw-up', pezzo: 'pezzo', burner: 'burner', gotico: 'gotico', mostro: 'personaggio', wholecar: 'whole car', rullo: 'rullo', verticale: 'verticale', estintore: 'tag a estintore', stencil: 'stencil', scritta: 'scritta', manifesto: 'manifesto', adesivi: 'adesivi', murale: 'murale', calli: 'calligraffiti', buff: 'toppa grigia' };
  const files = [];
  for (let i = 0; i < fogli.length; i++) {
    const F = fogli[i];
    const conti = CONTI ? F.k.map(k => `${NOME[k]}: ${CONTI.serie.stili[k] || 0} nella città di serie (stile E coi tasselli), ${CONTI.senza.stili[k] || 0} senza tasselli, ${CONTI.vecchia.stili[k] || 0} nella storia di prima`).join(' · ') : '';
    await pg.evaluate(([t, conti, n, N]) => { document.getElementById('h').innerHTML = `<h1>${n}/${N} · ${t}</h1><p>Disegnati col codice del gioco (writer_arte.js + pennelli.js, come il disegnatore a parte), stile E di serie: tavolozza unica (lutE), bordo netto, finitura dei pennelli. Crew vive fresche, crew sciolte sbiadite.</p>` + (conti ? `<p>${conti}</p>` : ''); document.getElementById('g').innerHTML = ''; }, [F.t, conti, i + 1, fogli.length]);
    for (const w of F.L) {
      await pg.evaluate(([w, Wd, NOME]) => {
        window.__F = {}; let A, e = null;
        try { A = Pennelli.art(Object.assign({ surf: 'muro', done: true, prog: 1, id: 1, by: 'old', hand: w.seed * 13 }, w.aka ? WriterArte.conceive({ aka: w.aka, crew: w.crew, style: w.style, seed: w.seed, dna: WriterArte.dnaOf(w.seed, .8, w.seed % 14) }) : {}, w)); } catch (x) { e = x; }
        const box = document.createElement('div'); box.className = 'b';
        const fonts = Object.entries(window.__F).sort((a, b) => b[1] - a[1]).map(a => a[0].replace(/([a-z])([A-Z])/g, '$1 $2')).slice(0, 2).join(', ');
        const fnt = A && A.font ? String(A.font).replace(/([a-z])([A-Z])/g, '$1 $2') : fonts || 'a mano (tratti)';
        const lab = document.createElement('div'); lab.className = 'l';
        if (A && A.stages) { const st = A.stages[A.stages.length - 1], dw = w._w || Wd, k0 = dw / st.width, dh0 = st.height * k0, k = dh0 > 640 ? 640 / st.height : k0, c = document.createElement('canvas'); c.width = Math.round(st.width * k); c.height = Math.round(st.height * k);
          const x = c.getContext('2d'); x.fillStyle = '#d7cbb5'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(st, 0, 0, c.width, c.height); box.appendChild(c); box.style.width = Math.max(c.width, 150) + 'px'; }
        else { lab.style.color = '#f88'; lab.textContent = 'ERRORE ' + (e && e.message); }
        const who = w.style === 'manifesto' ? `<i>${w._cat}</i> · <b>${w._tit}</b>` : w.style === 'buff' || w._cat ? `<i>${w._cat}</i>${w.aka ? ' · ' + w.crew + ' · ' + w.aka : ''}` : `${w.crew} · <b>${w.aka}</b>${w.sdEta > .5 ? ' <i>(crew sciolta, sbiadito)</i>' : ''}`;
        lab.innerHTML += `<b>${NOME[w.style]}</b> · ${who} · <i>${fnt}</i> · ${w.W} × ${w.H} m`; box.appendChild(lab); document.getElementById('g').appendChild(box);
      }, [w, F.w, NOME]);
    }
    const h = await pg.evaluate(() => document.body.scrollHeight); await pg.setViewportSize({ width: 2400, height: h });
    const png = path.join(OUT, `catalogo_${i + 1}.png`), jpg = path.join(OUT, `catalogo_${i + 1}.jpg`); await pg.screenshot({ path: png, fullPage: true });
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],quality=88)', png, jpg]); fs.unlinkSync(png); files.push(jpg); console.log('foglio', jpg, h);
    await pg.setViewportSize({ width: 2400, height: 1200 });
  }
  console.log('errori', JSON.stringify(err.slice(0, 5))); await b.close();
})();
