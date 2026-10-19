// Da glTF in testo (buffer e immagini in base64) a GLB binario, accanto all'originale (non si cancella niente):
//   node strumenti/pack_glb.js            (da v7/: tutti gli assets/**/*.json)
// Il gioco prova prima il .glb (un terzo più piccolo, niente atob nel thread principale) e ripiega sul .json se manca.
// Stessa impacchettatura di src/kit.js toGLB: tutti i buffer in un blocco BIN; le immagini data: diventano bufferView.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', 'assets');
const b64 = s => Buffer.from(s, 'base64');
const isData = u => typeof u === 'string' && u.startsWith('data:');
function toGLB(json) {
  const parts = [], offs = []; let total = 0;
  const push = bytes => { const o = total; parts.push(bytes); total += bytes.length; const pad = (4 - total % 4) % 4; if (pad) { parts.push(Buffer.alloc(pad)); total += pad; } return o; };
  (json.buffers || []).forEach((bf, i) => { offs[i] = push(isData(bf.uri) ? b64(bf.uri.slice(bf.uri.indexOf(',') + 1)) : Buffer.alloc(bf.byteLength || 0)); });
  (json.bufferViews || []).forEach(v => { v.byteOffset = (v.byteOffset || 0) + (offs[v.buffer] || 0); v.buffer = 0; });
  (json.images || []).forEach(im => { if (!isData(im.uri)) return; const mime = im.uri.slice(5, im.uri.indexOf(';')) || 'image/png', bytes = b64(im.uri.slice(im.uri.indexOf(',') + 1)); const o = push(bytes); json.bufferViews = json.bufferViews || []; json.bufferViews.push({ buffer: 0, byteOffset: o, byteLength: bytes.length }); im.bufferView = json.bufferViews.length - 1; im.mimeType = mime; delete im.uri; });
  json.buffers = total ? [{ byteLength: total }] : [];
  const jb = Buffer.from(JSON.stringify(json)), jl = Math.ceil(jb.length / 4) * 4, out = Buffer.alloc(12 + 8 + jl + (total ? 8 + total : 0));
  out.writeUInt32LE(0x46546C67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jl, 12); out.writeUInt32LE(0x4E4F534A, 16); jb.copy(out, 20); out.fill(0x20, 20 + jb.length, 20 + jl);
  if (total) { const o = 20 + jl; out.writeUInt32LE(total, o); out.writeUInt32LE(0x004E4942, o + 4); let p = o + 8; parts.forEach(x => { x.copy(out, p); p += x.length; }); }
  return out;
}
let a = 0, b = 0, n = 0;
for (const dir of fs.readdirSync(root)) {
  const d = path.join(root, dir); if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.json')) continue;
    const src = path.join(d, f), txt = fs.readFileSync(src, 'utf8'); let j; try { j = JSON.parse(txt); } catch (e) { console.log('salto', f, e.message); continue; }
    if (!j.asset) continue;   // non è un glTF
    const glb = toGLB(j); fs.writeFileSync(src.replace(/\.json$/, '.glb'), glb); a += txt.length; b += glb.length; n++;
  }
}
console.log(`${n} modelli: ${(a / 1048576).toFixed(1)} MB in testo → ${(b / 1048576).toFixed(1)} MB in GLB`);
