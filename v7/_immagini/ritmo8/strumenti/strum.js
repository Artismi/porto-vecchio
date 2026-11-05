// [ritmo8] strumenti nella pagina (addInitScript): i giri del browser (ogni callback di requestAnimationFrame, raggruppati per giro),
// le chiamate WebGL che costano al processore (caricamenti di tessiture, buffer, programmi, letture sincrone), i long task.
// Tutto in window.__R8; reset con __R8.reset().
function strum() {
  const R8 = window.__R8 = { giri: [], cb: {}, gl: {}, glLog: [], lt: [], t0: performance.now(), nome: new WeakMap(), on: true, mem: { tex: 0, buf: 0, rb: 0 }, texMap: new Map() };
  const now = () => performance.now();
  // --- requestAnimationFrame: chi gira e quanto ---
  const raf0 = window.requestAnimationFrame.bind(window);
  let giro = null;
  const etichetta = fn => {
    let n = R8.nome.get(fn); if (n) return n;
    n = fn.name || '';
    if (!n || n === 'w') { const L = (new Error().stack || '').split('\n').slice(2, 6).join(' '); const m = /index\.html[^:]*:(\d+)/.exec(L); n = (fn.name || 'anon') + '@' + (m ? m[1] : '?'); }
    else { const L = (new Error().stack || '').split('\n').slice(2, 6).join(' '); const m = /index\.html[^:]*:(\d+)/.exec(L); n = n + '@' + (m ? m[1] : '?'); }
    R8.nome.set(fn, n); return n;
  };
  window.requestAnimationFrame = function (fn) {
    if (typeof fn !== 'function') return raf0(fn);
    const lab = etichetta(fn);
    return raf0(function (ts) {
      if (!giro || giro.ts !== ts) { if (giro) { giro.dr = R8.dr.n - giro.dr0; giro.prim = R8.dr.prim - giro.p0; R8.giri.push(giro); } giro = { ts, a: now(), js: 0, n: 0, top: null, topMs: 0, dr0: R8.dr.n, p0: R8.dr.prim }; }
      const a = now();
      try { return fn(ts); } finally {
        const d = now() - a; giro.js += d; giro.n++; giro.b = now(); if (d > giro.topMs) { giro.topMs = d; giro.top = lab; }
        const c = R8.cb[lab] || (R8.cb[lab] = { n: 0, ms: 0, max: 0 }); c.n++; c.ms += d; if (d > c.max) c.max = d;
        if (lab.startsWith('loop')) giro.main = (giro.main || 0) + d;
      }
    });
  };
  // --- long task ---
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) R8.lt.push([+e.startTime.toFixed(1), +e.duration.toFixed(1)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { }
  // --- WebGL: le chiamate col costo per il processore ---
  const conta = (k, d, extra) => { const g = R8.gl[k] || (R8.gl[k] = { n: 0, ms: 0, max: 0, byte: 0 }); g.n++; g.ms += d; if (d > g.max) g.max = d; if (extra) g.byte += extra;
    if (d > 4 && R8.glLog.length < 400) R8.glLog.push({ k, t: +now().toFixed(1), ms: +d.toFixed(1), byte: extra || 0, st: d > 8 ? (new Error().stack || '').split('\n').slice(2, 7).map(s => s.trim().replace(/https?:\/\/[^/]+\//, '')).join(' < ') : '' }); };
  // chi chiama (un campione ogni 8 chiamate): la prima riga del gioco fuori dagli involucri
  R8.siti = {}; let ns = 0;
  const sito = (k, d) => { if ((++ns & 63) !== 0) return; const L = (new Error().stack || '').split('\n'); let w = ''; for (let i = 3; i < L.length && i < 12; i++) { const m = /at (\S+) \(.*index\.html[^:]*:(\d+)/.exec(L[i]); if (m && !/^(Object\.|ks\.|Js\.|Q$|\$r|proto)/.test(m[1])) { w = m[1] + '@' + m[2]; break; } } const key = k + ' ' + w, e = R8.siti[key] || (R8.siti[key] = { n: 0, ms: 0 }); e.n += 64; e.ms += d * 64; };
  const SITI = new Set(['texSubImage2D', 'texImage2D', 'bufferData', 'bufferSubData', 'drawImage', 'getImageData', 'putImageData', 'texSubImage3D', 'getProgramParameter']);
  const misura = (proto, k, byteF) => { const f = proto[k]; if (!f) return; const S = SITI.has(k); proto[k] = function () { const a = now(); try { return f.apply(this, arguments); } finally { if (R8.on) { const d = now() - a; conta(k, d, byteF ? byteF(arguments, this) : 0); if (S) sito(k, d); } } }; };
  const dimTex = (a) => { // texImage2D(target, level, internalformat, width, height, border, format, type, src) o (target, level, internalformat, format, type, source)
    if (a.length >= 9 || (a.length >= 6 && typeof a[3] === 'number' && typeof a[4] === 'number' && typeof a[5] === 'number' && a.length !== 6)) return (a[3] * a[4] * 4) | 0;
    const s = a[a.length - 1]; if (s && s.width) return (s.width * s.height * 4) | 0; return 0; };
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue; const P = C.prototype;
    misura(P, 'texImage2D', dimTex); misura(P, 'texSubImage2D', dimTex); misura(P, 'texImage3D'); misura(P, 'texSubImage3D');
    misura(P, 'texStorage2D', a => (a[2] * a[3] * 4 * (a[1] > 1 ? 1.33 : 1)) | 0); misura(P, 'compressedTexImage2D', a => a[6] ? a[6].byteLength : 0);
    misura(P, 'bufferData', a => a[1] && a[1].byteLength ? a[1].byteLength : (typeof a[1] === 'number' ? a[1] : 0)); misura(P, 'bufferSubData', a => a[2] && a[2].byteLength ? a[2].byteLength : 0);
    misura(P, 'linkProgram'); misura(P, 'compileShader'); misura(P, 'getProgramParameter'); misura(P, 'getShaderParameter'); misura(P, 'getProgramInfoLog');
    misura(P, 'readPixels'); misura(P, 'getError'); misura(P, 'clientWaitSync'); misura(P, 'getQueryParameter'); misura(P, 'generateMipmap'); misura(P, 'blitFramebuffer');
    misura(P, 'renderbufferStorageMultisample', a => (a[3] * a[4] * 4 * a[1]) | 0); misura(P, 'renderbufferStorage', a => (a[2] * a[3] * 4) | 0);
    misura(P, 'getParameter'); misura(P, 'finish'); misura(P, 'flush');
  }
  // canvas 2D: drawImage/getImageData/putImageData (HUD, minimappa, tele dei tetti)
  const C2 = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2) { misura(C2, 'getImageData'); misura(C2, 'putImageData'); misura(C2, 'drawImage'); misura(C2, 'fillText'); }
  // i disegni: contati per giro; spenti (R8.muto) per non far lavorare SwiftShader (i costi del processore restano tutti)
  R8.dr = { n: 0, prim: 0 }; R8.muto = false;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue;
      P[k] = function () { const el = k.startsWith('drawElements') || k === 'drawRangeElements', cnt = k === 'drawRangeElements' ? arguments[4] : el ? arguments[1] : arguments[2], inst = k.endsWith('Instanced') ? arguments[el ? 4 : 3] : 1;
        R8.dr.n++; R8.dr.prim += (cnt * inst / 3) | 0; if (R8.muto) return; return f.apply(this, arguments); }; } }
  R8.reset = () => { if (giro) { R8.giri.push(giro); giro = null; } R8.giri = []; R8.cb = {}; R8.gl = {}; R8.glLog = []; R8.lt = []; R8.siti = {}; R8.t0 = now(); };
  R8.prendi = () => { if (giro) { R8.giri.push(giro); giro = null; } return { giri: R8.giri, cb: R8.cb, gl: R8.gl, glLog: R8.glLog, lt: R8.lt, t0: R8.t0, t1: now(), siti: Object.entries(R8.siti).sort((a, b) => b[1].ms - a[1].ms).slice(0, 30).map(([k, v]) => [k, v.n, +v.ms.toFixed(1)]) }; };
}
module.exports = { strum };
