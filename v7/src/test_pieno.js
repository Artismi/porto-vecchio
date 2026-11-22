// [pieno] le prove dello strato del pieno senza browser (la posa vera si misura nel gioco: strumenti/pieno_censimento.js e pieno_tavola.js)
//   node src/test_pieno.js   (da v7)
'use strict';
const fs = require('fs'), path = require('path'), V7 = path.join(__dirname, '..');
let male = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) male++; };
const src = fs.readFileSync(path.join(__dirname, 'pieno.js'), 'utf8');
// 1. fuori dal browser è spento e non rompe niente
const P = require('./pieno.js'); ok(P && P.attivo === false && Array.isArray(P.elenco()), 'in Node il modulo è spento (NOOP) e risponde');
// 2. l'atlante: le celle dentro 2048×2048, senza sovrapporsi
const CELLE = {}, cellaSrc = src.slice(src.indexOf('  const CELLE = {};'), src.indexOf('  const N_TAG'));
new Function('CELLE', cellaSrc.replace('const CELLE = {};', '') + '; return CELLE;')(CELLE);
const L = Object.entries(CELLE); let fuori = 0, sovra = 0;
L.forEach(([k, [x, y, w, h]]) => { if (x < 0 || y < 0 || x + w > 2048 || y + h > 2048) fuori++; });
for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i][1], b = L[j][1]; if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) sovra++; }
ok(L.length >= 70 && !fuori && !sovra, `l'atlante: ${L.length} celle, ${fuori} fuori, ${sovra} sovrapposte`);
// 3. ogni nome usato nella posa ha la sua cella (le famiglie con l'indice: tag0..15, throw0..7...)
const N = { N_TAG: 24, N_THROW: 12, N_PEZ: 4, N_ADE: 8, N_MAN: 6, N_SER: 6 }, fam = { tag: 'N_TAG', throw: 'N_THROW', pezzo: 'N_PEZ', adesivo: 'N_ADE', manifesto: 'N_MAN', serranda: 'N_SER' };
const mancano = Object.entries(fam).filter(([f, n]) => { for (let i = 0; i < N[n]; i++) if (!CELLE[f + i]) return true; return false; }).map(q => q[0]);
['funebre0', 'funebre1', 'colatura0', 'colatura1', 'vernice0', 'vernice3', 'campana', 'gesso0', 'gesso2', 'mozziconi0', 'mozziconi1', 'macchia0', 'macchia1', 'civico15', 'burner1', 'calli1', 'stencil3', 'volantini1', 'freccia1', 'gessone', 'pozza', 'spruzzo'].forEach(k => { if (!CELLE[k]) mancano.push(k); });
ok(!mancano.length, 'ogni famiglia usata ha le sue celle' + (mancano.length ? ': mancano ' + mancano.join(', ') : ''));
// 4. i file: l'atlante disegnato (pieno e del telefono), la pagina lo carica, fuori dall'impronta dei tasselli
const png = f => { try { const b = fs.readFileSync(path.join(V7, f)); return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); } catch (e) { return null; } };
ok(png('assets/pieno/atlante.png') === '2048x2048' && png('assets/pieno/atlante_tel.png') === '1024x1024', `gli atlanti: ${png('assets/pieno/atlante.png')} e ${png('assets/pieno/atlante_tel.png')} (telefono)`);
const html = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8'), build = fs.readFileSync(path.join(V7, 'build.py'), 'utf8');
ok(/\/\*pieno\.js\*\//.test(html) && html.indexOf('/*pieno.js*/') > html.indexOf('/*render.js*/'), 'la pagina carica pieno.js dopo render.js');
ok(/TASS_FUORI = \{[^}]*'pieno\.js'/.test(build) && /startswith\('assets\/pieno\/'\)/.test(build), 'pieno.js e assets/pieno/ stanno fuori dall\'impronta dei tasselli (build.py)');
// 5. il costo: due disegni (un InstancedMesh, una Mesh), un materiale per ciascuno, nessuna tessitura oltre l'atlante
const nIM = (src.match(/new THREE\.InstancedMesh\(/g) || []).length, nM = (src.match(/new THREE\.Mesh\(/g) || []).length, nMat = (src.match(/new THREE\.Mesh\w*Material\(/g) || []).length, nTex = (src.match(/new THREE\.(CanvasTexture|TextureLoader|DataTexture)\(/g) || []).length;
ok(nIM === 1 && nM === 1 && nMat === 2 && nTex === 2, `il costo: ${nIM} InstancedMesh, ${nM} Mesh, ${nMat} materiali, ${nTex} vie per l'atlante (il file o, se manca, la tela)`);
ok(/\?nopieno|nopieno\|/.test(src) && /cottae/.test(src), 'si spegne con ?nopieno, e la cottura dei tasselli non lo vede (?cottae)');
// [pieno4] i tavolini dei bar: render.js ne tiene la posa (lo stesso giro del caso: le cose dopo non si spostano) e li lascia a pieno.js,
// che li cuoce in pieno.json (bar) e li disegna nella geometria delle cose (niente materiali nuovi: il costo sopra non cambia)
const rnd = fs.readFileSync(path.join(__dirname, 'render.js'), 'utf8');
ok(/const DEH35 = [^;]*nopienodehors/.test(rnd) && (rnd.match(/if \(DEH35\)/g) || []).length >= 2 && /pick\(rb, \[0, 0, 0\]\); rb\(\); rb\(\); rb\(\); rb\(\); if \(put\(null/.test(rnd) && /else \{ table\(-1\.6, 1\.8\); table\(1\.8, 2\.0\); \}/.test(rnd), 'i tavolini dei bar: render.js tiene la posa e lo stesso caso, ?nopienodehors com\'erano');
ok(/function barRoba\(\)/.test(src) && /bar: typeof window !== 'undefined' && Array\.isArray\(window\.__pienoBar35\)/.test(src) && /COTTA\.dati \? COTTA\.dati\.bar/.test(src), 'i tavolini dei bar: dalla posa di render.js o da pieno.json (bar), mai tutti e due');
console.log(male ? `\n${male} prove NON passate` : '\ntutte le prove passate'); process.exit(male ? 1 : 0);
