// [compressi] I modelli del gioco più leggeri da scaricare, con lo stesso aspetto: per ogni assets/**/X.glb si scrive X.glb.gz =
//   gltfpack (meshopt, EXT_meshopt_compression: vertici e indici riordinati per la cache e codificati, animazioni senza chiavi doppie)
//   con i valori dei vertici IDENTICI (posizioni, normali, uv in float come prima, colori a 16 bit, attributi tutti tenuti), i nodi coi
//   nomi tenuti (-kn: ossa, pezzi dei kit, armi), i materiali coi nomi tenuti (-km), le animazioni ricampionate alla LORO frequenza
//   (le stesse chiavi) con la precisione massima; poi tutto in gzip (Vercel non comprime i .glb: model/gltf-binary non è nella sua lista).
// Il gioco (src/kit.js) chiede X.glb.gz, lo apre con DecompressionStream e lo legge con src/meshopt_decoder.js; se qualcosa manca
// ripiega su X.glb e poi su X.json come prima. I .glb e i .json restano com'erano (sono le sorgenti).
// Ogni modello convertito si confronta con l'originale (strumenti/prova_glb.js: geometria, nodi, pose delle animazioni); se gltfpack
// non guadagna almeno il 10% sul gzip semplice, X.glb.gz è il .glb di prima in gzip (sempre senza perdita).
//   node strumenti/comprimi_glb.js [assets/.../X.glb ...]   (da v7/; senza argomenti: tutti) — gltfpack con npx, versione fissa
//   --prova: non scrive
const fs = require('fs'), path = require('path'), zlib = require('zlib'), os = require('os');
const { execFileSync } = require('child_process');
const GLTFPACK = 'gltfpack@0.22.0';   // la stessa versione di src/meshopt_decoder.js (meshoptimizer 0.22)
const V7 = path.resolve(__dirname, '..');

function leggi(b) {
  const jl = b.readUInt32LE(12); return { j: JSON.parse(b.slice(20, 20 + jl).toString('utf8')), bin: b.slice(28 + jl) };
}
// la frequenza delle animazioni: il passo più comune tra le chiavi (le animazioni del kit sono a 24 o 30 al secondo)
function frequenza(b) {
  const { j, bin } = leggi(b); const conta = {};
  (j.animations || []).forEach(a => a.samplers.forEach(s => {
    const acc = j.accessors[s.input], v = j.bufferViews[acc.bufferView]; if (acc.count < 2) return;
    const o = (v.byteOffset || 0) + (acc.byteOffset || 0), t = new Float32Array(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + acc.count * 4));
    for (let i = 1; i < t.length; i++) { const f = Math.round(1 / (t[i] - t[i - 1])); if (f > 0 && f <= 240) conta[f] = (conta[f] || 0) + 1; }
  }));
  const e = Object.entries(conta).sort((a, b) => b[1] - a[1]); return e.length ? +e[0][0] : 30;
}
function gltfpack(src, out, fps) {
  const args = ['--yes', GLTFPACK, '-i', src, '-o', out, '-cc', '-kn', '-km', '-ke', '-kv', '-vpf', '-vtf', '-vnf', '-vc', '16', '-af', String(fps), '-at', '24', '-ar', '16', '-as', '24', '-ac'];
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { stdio: 'pipe', cwd: os.tmpdir() });
}
const gz = b => zlib.gzipSync(b, { level: 9 });
// gltfpack non tiene i nomi delle mesh (three li dà agli oggetti: «Casual_Body_1»...): si rimettono dal nodo con lo stesso nome
function nomiMesh(orig, out) {
  const A = leggi(orig).j, b = fs.readFileSync(out), jl = b.readUInt32LE(12), B = JSON.parse(b.slice(20, 20 + jl).toString('utf8'));
  const da = new Map(); (A.nodes || []).forEach(n => { if (n.name && n.mesh !== undefined) da.set(n.name, A.meshes[n.mesh]); });
  (B.nodes || []).forEach(n => { const m = n.name && n.mesh !== undefined && da.get(n.name); if (m && m.name !== undefined) B.meshes[n.mesh].name = m.name; });
  const jb = Buffer.from(JSON.stringify(B)), l = (jb.length + 3) & ~3, head = Buffer.alloc(20 + l, 0x20);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(l, 12); head.writeUInt32LE(0x4E4F534A, 16); jb.copy(head, 20);
  const res = Buffer.concat([head, b.slice(20 + jl)]); res.writeUInt32LE(res.length, 8); fs.writeFileSync(out, res);
}

async function main() {
  const args = process.argv.slice(2), prova = args.includes('--prova');
  let files = args.filter(a => !a.startsWith('--')).map(f => path.resolve(f));
  if (!files.length) (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (f.endsWith('.glb')) files.push(p); } })(path.join(V7, 'assets'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pvglb-')), righe = [];
  files.sort().forEach((f, i) => {
    const src = fs.readFileSync(f), z0 = gz(src), out = path.join(tmp, i + '_' + path.basename(f));
    let z1 = null;
    try { gltfpack(f, out, process.env.PV_AF !== undefined ? +process.env.PV_AF : frequenza(src)); nomiMesh(src, out); z1 = gz(fs.readFileSync(out)); } catch (e) { console.log('gltfpack no:', path.relative(V7, f), String(e.stderr || e.message).split('\n')[0]); }
    righe.push({ f, rel: path.relative(V7, f).split(path.sep).join('/'), out, n: src.length, z0, z1, usa: !!z1 && z1.length < z0.length * .9 });
  });
  // la prova «stesso modello» su quelli convertiti: chi non torna resta in gzip semplice
  const cand = righe.filter(r => r.usa), cj = path.join(tmp, 'coppie.json');
  fs.writeFileSync(cj, JSON.stringify(cand.map(r => [r.rel, r.out])));
  let rep = ''; try { rep = execFileSync(process.execPath, [path.join(__dirname, 'prova_glb.js'), cj], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { rep = String(e.stdout || ''); if (!/\[prova_glb\]/.test(rep)) { console.log('[compressi] prova_glb non partita: niente meshopt', String(e.stderr || e.message).split('\n')[0]); cand.forEach(r => r.usa = false); } }
  rep.split('\n').filter(l => l.startsWith('NO ')).forEach(l => { const r = cand.find(q => l.startsWith('NO  ' + q.rel + ' ')); if (r) { r.usa = false; console.log('[compressi] diverso, resta in gzip semplice:', l.slice(4, 300)); } });
  if (cand.length && !/\[prova_glb\]/.test(rep)) cand.forEach(r => r.usa = false);
  let a = 0, g0 = 0, b = 0, np = 0;
  for (const r of righe) {
    const z = r.usa ? r.z1 : r.z0; a += r.n; g0 += r.z0.length; b += z.length; if (r.usa) np++;
    if (process.env.PV_DETTAGLI) console.log(r.rel, (r.n / 1024).toFixed(0), 'KB; gzip', (r.z0.length / 1024).toFixed(0), '; gltfpack+gzip', r.z1 ? (r.z1.length / 1024).toFixed(0) : '-', r.usa ? '← questo' : '');
    if (!prova) fs.writeFileSync(r.f + '.gz', z);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`[compressi] ${righe.length} .glb: ${(a / 1048576).toFixed(2)} MB → ${(b / 1048576).toFixed(2)} MB in .glb.gz (solo gzip sarebbe ${(g0 / 1048576).toFixed(2)}; meshopt in ${np}, provati uguali)` + (prova ? ' — prova, niente scritto' : ''));
}
main();
