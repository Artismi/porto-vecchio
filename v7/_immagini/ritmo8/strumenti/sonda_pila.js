// [ritmo8] la pila a fette è uguale a quella mandata in un colpo da three? (ogni strato, il livello 0 e il livello 1 delle mipmap)
const { avvia } = require('./lib.js'); const fs = require('fs'), path = require('path');
(async () => {
  const H = await avvia({ q: process.argv[2] || '' }); const { pg, log } = H; let r = null;
  try {
    await pg.evaluate(() => { window.__R8.muto = true; window.PV_ATTESA.on = () => true; });
    r = await pg.evaluate(() => {
      const R = window.__pv.R, rd = R.__models.renderer, gl = rd.getContext(), T = window.THREE, X = Tasselli.__r8; if (!X) return { err: 'niente __r8' };
      const out = [];
      for (const [W, Hh, D, mip] of [[512, 512, 10, true], [256, 128, 40, true], [512, 281, 12, false]]) {
        let s = 12345 + W + D; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s >>> 24; };
        const data = new Uint8Array(W * Hh * D * 4); for (let i = 0; i < data.length; i++) data[i] = (i % 4 === 3) ? 255 : rnd();
        const mk = d => { const t = new T.DataArrayTexture(d, W, Hh, D); t.format = T.RGBAFormat; t.type = T.UnsignedByteType; t.generateMipmaps = mip; t.minFilter = mip ? T.LinearMipmapLinearFilter : T.LinearFilter; t.magFilter = T.LinearFilter; t.flipY = false; t.premultiplyAlpha = false; t.unpackAlignment = 4; t.needsUpdate = true; t.onUpdate = () => { t.image.data = null; }; return t; };
        const tA = mk(data.slice()), tB = mk(data.slice());
        const ok = X.pilaOk(tA); let n = 0, q; const t0 = performance.now(); do { q = X.pila(rd, tA); n++; } while (!q.fatta && n < 200); const msA = performance.now() - t0;
        const t1 = performance.now(); rd.initTexture(tB); const msB = performance.now() - t1;
        const fb = gl.createFramebuffer(), leggi = (t, layer, lv, w, h) => { const tex = rd.properties.get(t).__webglTexture; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, lv, layer); const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
        let diversi = 0, diversiMip = 0, dati = 0;
        for (let l = 0; l < D; l++) { const a = leggi(tA, l, 0, W, Hh), b = leggi(tB, l, 0, W, Hh); for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) diversi++; if (a[i] !== data[l * W * Hh * 4 + i]) dati++; }
          if (mip) { const w1 = W >> 1, h1 = Hh >> 1, a1 = leggi(tA, l, 1, w1, h1), b1 = leggi(tB, l, 1, w1, h1); for (let i = 0; i < a1.length; i++) if (a1[i] !== b1[i]) diversiMip++; } }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); rd.resetState();
        out.push({ W, H: Hh, D, mip, pilaOk: ok, chiamate: n, fatta: q.fatta, datiLiberati: tA.image.data === null, pixelDiversi: diversi, pixelDiversiDaiDati: dati, mipDiversi: diversiMip, msPila: +msA.toFixed(1), msTutta: +msB.toFixed(1), err: gl.getError() });
        tA.dispose(); tB.dispose();
      }
      return out;
    });
    log(JSON.stringify(r, null, 1));
  } catch (e) { log('ERR', e.stack); }
  fs.writeFileSync(path.join(__dirname, 'sonda_pila.json'), JSON.stringify(r, null, 1));
  await H.close();
})();
