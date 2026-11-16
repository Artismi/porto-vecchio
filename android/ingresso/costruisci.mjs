// Compila l'ingresso dell'APK (entry.tsx: il Game Boy della pagina /porto-vecchio del sito) in HTML/JS/CSS statici, in app/src/main/ingresso/.
//   SITO=/percorso/aertismione ESBUILD=/percorso/node_modules/esbuild node costruisci.mjs
// SITO: il repo del sito (ramo con GameBoy.tsx, GameBoyPad.tsx, GameBoy.module.css, gameLoad.ts), con i suoi node_modules (react,
// react-dom, zustand, framer-motion). Il risultato sta in git (piccolo): la build dell'APK non ha bisogno del sito.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const QUI = path.dirname(fileURLToPath(import.meta.url))
const SITO = process.env.SITO || '/home/user/aertismione'
const require = createRequire(import.meta.url)
const esbuild = require(process.env.ESBUILD || 'esbuild')
const OUT = path.join(QUI, '..', 'app', 'src', 'main', 'ingresso')

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true })
const r = await esbuild.build({
  entryPoints: [path.join(QUI, 'entry.tsx')],
  bundle: true, minify: true, format: 'iife', target: ['chrome80'], outdir: OUT, entryNames: 'ingresso',
  jsx: 'automatic', legalComments: 'none', metafile: true, logLevel: 'warning',
  alias: { '@': path.join(SITO, 'src') },
  nodePaths: [path.join(SITO, 'node_modules')],
  loader: { '.module.css': 'local-css', '.css': 'css', '.woff2': 'file', '.png': 'file' },
  assetNames: 'font/[name]',
  define: { 'process.env.NODE_ENV': '"production"' },
  external: ['/artismi-logo.png'],
  // [apk_finale] nell'APK il caricamento del Game Boy resta finché il gioco non dice 'pronto' (sul sito, 20 s dopo il caricamento della
  // pagina del gioco si mostrava comunque il riquadro: sul telefono compariva il caricamento vecchio, quello del gioco, sopra il nuovo)
  plugins: [{ name: 'apk', setup(b) { b.onLoad({ filter: /GameBoy\.tsx$/ }, async a => { let t = fs.readFileSync(a.path, 'utf8'); const k = 'talks.current ? 20000 : 300';
    if (!t.includes(k)) throw new Error('GameBoy.tsx: il ripiego dei 20 s non c\'è più (' + k + ')'); t = t.replace(k, 'talks.current ? 600000 : 300'); return { contents: t, loader: 'tsx' }; }); } }],
})
fs.copyFileSync(path.join(SITO, 'public', 'artismi-logo.png'), path.join(OUT, 'artismi-logo.png'))
fs.copyFileSync(path.join(QUI, 'attesa.html'), path.join(OUT, 'attesa.html'))   // [tasselli] la pagina d'attesa dello scarico
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#12081C">
<title>Porto Vecchio — Artismi</title>
<link rel="stylesheet" href="ingresso.css">
</head><body><div id="pv"></div><script src="ingresso.js"></script></body></html>
`)
const peso = Object.entries(r.metafile.outputs).map(([f, o]) => `${path.relative(OUT, f)} ${(o.bytes / 1024).toFixed(0)} KB`).join(', ')
console.log('[ingresso]', peso)
