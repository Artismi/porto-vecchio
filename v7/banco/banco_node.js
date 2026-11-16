#!/usr/bin/env node
/* Porto Vecchio — banco/banco_node.js
   Lo stesso lavoratore di banco.html (sim_worker.js) senza browser, in un worker_threads di Node: numeri in fretta.
     node banco_node.js                         1000 NPC, 60 s in tempo reale a 5 Hz, poi 6000 tick di fila, poi salva/ripristina
     node banco_node.js --n 2000 --sec 120
     node banco_node.js --scala                 500, 1000, 2000 NPC (+ una prova "sotto sforzo")
     node banco_node.js --near 150 --far 300 --hzNear 5 --decideSec 0.5   (qualsiasi chiave di cfg: vedi creaSim)
   Uscita: una riga di riepilogo per prova, e con --json il resoconto completo. */
'use strict';
const path = require('path');
const { Worker } = require('worker_threads');
const zlib = require('zlib');

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v == null || v.startsWith('--')) opt[k] = true; else { opt[k] = isNaN(+v) ? v : +v; i++; } } }
const SEC = opt.sec != null ? +opt.sec : 60, VELOCI = opt.veloci != null ? +opt.veloci : 6000;

function lavoratore() {
  const w = new Worker(path.join(__dirname, 'sim_worker.js'));
  let nid = 0; const att = new Map();
  w.on('message', m => {
    if (m.op === 'snap') { w.postMessage({ op: 'snapR', buf: m.buf }, [m.buf]); return; }   // come la pagina: il buffer torna indietro
    const h = att.get(m.id != null ? m.id : m.op); if (h) { att.delete(m.id != null ? m.id : m.op); h(m); }
  });
  const chiedi = (msg, chiave) => new Promise(ok => { const id = chiave || ++nid; att.set(id, ok); if (!chiave) msg.id = id; w.postMessage(msg); });
  return { w, chiedi };
}
const dorm = ms => new Promise(r => setTimeout(r, ms));

async function prova(cfg, nome) {
  const L = lavoratore();
  const pronto = await L.chiedi({ op: 'avvia', cfg, gc: true }, 'pronto');
  const pre = pronto.pre;
  if (SEC > 0) { await dorm(SEC * 1000); }
  const rt = (await L.chiedi({ op: 'stats' })).r;
  L.w.postMessage({ op: 'ferma' });
  const ve = VELOCI > 0 ? (await L.chiedi({ op: 'veloce', tick: VELOCI })).r : null;
  // salvataggio: serializza + gzip nel lavoratore, torna qui; ripristino in un lavoratore nuovo e controllo
  const sv = await L.chiedi({ op: 'salva', ritorna: true });
  const ctl = (await L.chiedi({ op: 'controllo' })).controllo;
  const L2 = lavoratore(); await L2.chiedi({ op: 'avvia', cfg: Object.assign({}, cfg, { ripristina: 1 }), fermo: true }, 'pronto');
  const ca = await L2.chiedi({ op: 'carica', z: sv.z, cfg });
  const gz9 = zlib.gzipSync(Buffer.from(zlib.gunzipSync(Buffer.from(sv.z))), { level: 9 }).length;
  await L.w.terminate(); await L2.w.terminate();
  const r = { nome, cfg, preriscaldo: pre, tempoReale: rt, veloce: ve, salva: Object.assign({}, sv, { z: undefined, gzip9: gz9 }), ripristino: ca, controlloVivo: ctl };
  const t = rt.tick, v = ve && ve.tick, g = rt.gcLavoratore || {};
  console.log(`${nome.padEnd(22)} N=${String(rt.n).padStart(4)} livelli=${rt.livelli.join('/')}  tempo reale ${SEC}s: p50 ${t.p50} p95 ${t.p95} p99 ${t.p99} max ${t.max} ms (n=${t.n})` +
    (v ? ` | di fila: media ${v.media} p95 ${v.p95} p99 ${v.p99} max ${v.max}` : '') +
    ` | GC nel lavoratore: ${g.n || 0} (max ${(g.max || 0).toFixed(2)} ms, >4ms: ${g.sopra4 || 0})` +
    ` | stato ${(rt.memoria.stato / 1048576).toFixed(2)} MB, salva ${(sv.grezzo / 1048576).toFixed(2)}→${(sv.compresso / 1024).toFixed(0)} KB in ${sv.msTotale} ms, ripristino ${ca.ok ? 'OK' : 'FALLITO ' + ca.err} (${ca.msGunzip}+${ca.msRipristina} ms)`);
  if (opt.json) console.log(JSON.stringify(r, null, 1));
  return r;
}

(async () => {
  const base = {}; for (const k in opt) if (!['sec', 'veloci', 'scala', 'json', 'out'].includes(k)) base[k] = opt[k];
  const out = [];
  console.log(`node ${process.version}, ${require('os').cpus()[0].model} ×${require('os').cpus().length}`);
  if (opt.scala) {
    out.push(await prova(Object.assign({}, base, { n: 500 }), 'N=500'));
    out.push(await prova(Object.assign({}, base, { n: 1000 }), 'N=1000'));
    out.push(await prova(Object.assign({}, base, { n: 2000 }), 'N=2000'));
    out.push(await prova(Object.assign({}, base, { n: 1000, near: 150, far: 300, hzNear: 5, hzFar: 1, decideSec: .5 }), 'N=1000 sotto sforzo'));
  } else out.push(await prova(Object.assign({ n: 1000 }, base), 'N=' + (base.n || 1000)));
  if (opt.out) require('fs').writeFileSync(opt.out, JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
