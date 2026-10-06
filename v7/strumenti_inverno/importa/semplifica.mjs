// node semplifica.mjs entrata.glb uscita.glb triangoli_voluti
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, join, flatten } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const [inp, out, target] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const tri = () => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; } return t | 0; };
const t0 = tri();
await doc.transform(dedup(), flatten(), join(), weld({ tolerance: 0.0001 }));
await MeshoptSimplifier.ready;
const ratio = Math.min(1, (+target) / Math.max(1, tri()));
if (ratio < 1) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: +(process.env.ERR || 0.02), lockBorder: false }));
await doc.transform(prune());
await io.write(out, doc); console.log(inp.split('/').pop(), t0, '->', tri());
