import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const { json, resources } = await io.writeJSON(doc, { format: 'gltf' });
  const mime = n => n.endsWith('.png') ? 'image/png' : n.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
  (json.buffers || []).forEach(b => { b.uri = 'data:application/octet-stream;base64,' + Buffer.from(resources[b.uri]).toString('base64'); });
  (json.images || []).forEach(im => { if (im.uri && resources[im.uri]) im.uri = 'data:' + mime(im.uri) + ';base64,' + Buffer.from(resources[im.uri]).toString('base64'); });
  const out = f.replace(/\.glb$/, '.json'); fs.writeFileSync(out, JSON.stringify(json)); console.log(out, fs.statSync(out).size);
}
