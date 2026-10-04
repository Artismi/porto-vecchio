// Kit "natura" dal Stylized Nature MegaKit (Quaternius, CC0): un nodo per modello, texture piccole, poligoni alleggeriti.
// Uso: node pack_natura.mjs <cartella glTF del kit> <uscita.json>
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, weld, simplify, quantize, unpartition, textureCompress } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
const [SRC, OUT] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// nome -> quanto alleggerire (frazione dei triangoli da tenere)
const PICK = {
  Pine_1: .25, Pine_2: .25, Pine_3: .2, Pine_4: .25, Pine_5: .4,
  CommonTree_1: .18, CommonTree_2: .18, CommonTree_3: .25, CommonTree_4: .25, CommonTree_5: .3,
  TwistedTree_1: .1, TwistedTree_2: .1, TwistedTree_3: .1, TwistedTree_4: .1, TwistedTree_5: .1,
  DeadTree_1: .15, DeadTree_2: .15, DeadTree_3: .15, DeadTree_4: .15, DeadTree_5: .15,
  Bush_Common: 1, Fern_1: 1, Plant_1_Big: 1, Plant_1: 1, Plant_7_Big: 1,
  Grass_Wispy_Short: 1, Grass_Wispy_Tall: 1, Grass_Common_Tall: 1,
  Rock_Medium_1: 1, Rock_Medium_2: 1, Rock_Medium_3: 1,
  RockPath_Round_Small_1: .5, RockPath_Round_Small_2: .5, RockPath_Square_Small_1: .6, RockPath_Square_Small_3: .6, RockPath_Round_Wide: .35,
  Pebble_Round_1: 1, Pebble_Round_3: 1, Pebble_Square_2: 1, Pebble_Square_4: 1,
  Mushroom_Common: 1, Mushroom_Laetiporus: .4,
};
await MeshoptSimplifier.ready;
// alleggerire: le foglie sono carte separate -> se ne tiene una parte e si allargano un po'; il legno -> semplificazione "sloppy"
function thin(prim, keep) {
  const mat = prim.getMaterial(), leafy = mat && mat.getAlphaMode() === 'MASK' && /Lea|Leaf/i.test(mat.getName());
  const P = prim.getAttribute('POSITION'), I = prim.getIndices(); if (!I) return;
  const idx = Array.from(I.getArray()), pos = P.getArray(), nv = P.getCount();
  if (leafy) {
    // componenti connesse (vertici saldati per posizione)
    const key = v => Math.round(pos[v * 3] * 1e3) + ',' + Math.round(pos[v * 3 + 1] * 1e3) + ',' + Math.round(pos[v * 3 + 2] * 1e3);
    const par = new Int32Array(nv).map((_, i) => i), f = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }, u = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    const seen = new Map(); for (let v = 0; v < nv; v++) { const k = key(v); if (seen.has(k)) u(v, seen.get(k)); else seen.set(k, v); }
    for (let t = 0; t < idx.length; t += 3) { u(idx[t], idx[t + 1]); u(idx[t], idx[t + 2]); }
    const comps = new Map(); for (let t = 0; t < idx.length; t += 3) { const c = f(idx[t]); if (!comps.has(c)) comps.set(c, []); comps.get(c).push(t); }
    let h = 12345; const rnd = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
    const fr = Math.min(1, keep * 1.6), grow = 1 + (1 - fr) * .7, out = [], moved = new Set();
    for (const [c, tris] of comps) {
      if (rnd() > fr) continue;
      const vs = new Set(); tris.forEach(t => { vs.add(idx[t]); vs.add(idx[t + 1]); vs.add(idx[t + 2]); out.push(idx[t], idx[t + 1], idx[t + 2]); });
      let cx = 0, cy = 0, cz = 0; vs.forEach(v => { cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2]; }); cx /= vs.size; cy /= vs.size; cz /= vs.size;
      vs.forEach(v => { if (moved.has(v)) return; moved.add(v); pos[v * 3] = cx + (pos[v * 3] - cx) * grow; pos[v * 3 + 1] = cy + (pos[v * 3 + 1] - cy) * grow; pos[v * 3 + 2] = cz + (pos[v * 3 + 2] - cz) * grow; });
    }
    P.setArray(pos); I.setArray(new Uint32Array(out));
  } else {
    const target = Math.max(36, Math.floor(idx.length * keep / 3) * 3);
    const res = MeshoptSimplifier.simplifySloppy(new Uint32Array(idx), new Float32Array(pos), 3, null, target, .05);
    const arr = res[0] || res; I.setArray(new Uint32Array(arr));
  }
}
const out = new Document(); out.createBuffer(); const scene = out.createScene('kit');
for (const [key, keep] of Object.entries(PICK)) {
  const src = await io.read(`${SRC}/${key}.gltf`);
  // via le normal map: non servono e pesano
  for (const m of src.getRoot().listMaterials()) m.setNormalTexture(null);
  if (keep < 1) for (const mesh of src.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) thin(prim, keep);
  const map = mergeDocuments(out, src);
  const sc = src.getRoot().getDefaultScene() || src.getRoot().listScenes()[0];
  const holder = out.createNode(key);
  for (const n of sc.listChildren()) holder.addChild(map.get(n));
  scene.addChild(holder);
  for (const s of out.getRoot().listScenes()) if (s !== scene) s.dispose();
  for (const b of out.getRoot().listBuffers().slice(1)) b.dispose();
}
for (const a of out.getRoot().listAccessors()) a.setBuffer(out.getRoot().listBuffers()[0]);
await out.transform(dedup(), prune());
// texture: foglie 512, corteccia e rocce 256, in PNG (le foglie hanno l'alfa)
for (const t of out.getRoot().listTextures()) {
  const name = t.getURI() || t.getName(), leafy = /Leaf|Leaves|Flowers|Grass/i.test(name), size = leafy ? 512 : 256;
  let img = sharp(Buffer.from(t.getImage())).resize(size, size, { fit: 'fill' });
  // inverno in Calabria: lecci e ulivi verde-grigio scuro (la chioma rossa del kit diventa verde), latifoglie spente, pini più cupi
  if (/TwistedTree/.test(name) && leafy) img = img.modulate({ hue: 100, saturation: .5, brightness: 1.0 });
  else if (/NormalTree/.test(name) && leafy) img = img.modulate({ hue: -12, saturation: .62, brightness: .95 });
  else if (/Pine/.test(name)) img = img.modulate({ saturation: .85, brightness: 1.12 });
  else if (/Grass|Leaves\.png/.test(name)) img = img.modulate({ hue: -25, saturation: .5, brightness: .85 });
  if (/Rocks|PathRocks/.test(name)) img = img.modulate({ brightness: 1.45, saturation: .6 });
  console.log('tex', name, size);
  const buf = await img.png({ compressionLevel: 9, palette: !leafy }).toBuffer();
  t.setImage(new Uint8Array(buf)).setMimeType('image/png');
}
await out.transform(quantize({ quantizePosition: 14 }), unpartition());
const { json, resources } = await io.writeJSON(out, { format: 'gltf' });
(json.buffers || []).forEach(b => { b.uri = 'data:application/octet-stream;base64,' + Buffer.from(resources[b.uri]).toString('base64'); });
(json.images || []).forEach(im => { if (im.uri && resources[im.uri]) im.uri = 'data:image/png;base64,' + Buffer.from(resources[im.uri]).toString('base64'); });
fs.writeFileSync(OUT, JSON.stringify(json));
let tris = {}; for (const m of out.getRoot().listMeshes()) { let t = 0; for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : 0) / 3; tris[m.getName()] = t; }
console.log(OUT, fs.statSync(OUT).size, out.getRoot().listTextures().length + ' texture');
console.log(Object.entries(tris).map(([k, v]) => k + ':' + v).join(' '));
