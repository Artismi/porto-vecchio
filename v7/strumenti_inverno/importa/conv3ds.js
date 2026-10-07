// node conv3ds.js modello.3ds cartella_texture uscita.glb
const fs = require('fs'), path = require('path'), assimpjs = require('assimpjs');
const [src, texDir, out] = process.argv.slice(2);
assimpjs().then(ajs => {
  const fl = new ajs.FileList();
  fl.AddFile(path.basename(src), new Uint8Array(fs.readFileSync(src)));
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jpe?g|png|bmp|tga|mtl)$/i.test(e.name)) fl.AddFile(e.name, new Uint8Array(fs.readFileSync(p))); });
  walk(texDir);
  const r = ajs.ConvertFileList(fl, 'glb2');
  if (!r.IsSuccess() || r.FileCount() === 0) { console.log('ERRORE', r.GetErrorCode()); return; }
  fs.writeFileSync(out, Buffer.from(r.GetFile(0).GetContent())); console.log('ok', out, fs.statSync(out).size);
});
