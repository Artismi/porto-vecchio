# [commissioni] Le scritte e i disegni degli abitanti si vedono: ogni muro dipinto (st.pop.walls, popolo.js) diventa un
# riquadro sulla facciata dove stava chi dipingeva (wx, wy, wface): le scritte in stampatello con le colature, la satira
# e l'arte come un disegno a pennellate. Quando il regime le cancella (erased) resta una macchia di vernice grigia.
# Dopo scopo1.py. Guardia [muri_gente2].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[muri_gente2]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("""    tickMondo(st, time, night, dt);   // [animazioni-mondo] vento, fumo, scintille, carte, piccioni, porte""",
"""    tickMondo(st, time, night, dt);   // [animazioni-mondo] vento, fumo, scintille, carte, piccioni, porte
    muriGente(st);   /* [muri_gente2] */""")
rep("""  function indoorPass(st) {""", """  // [muri_gente2] i muri dipinti dalla gente
  const MGV = { meshes: {}, n: -1 };
  function mgTexture(w) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    const red = /rosso/.test(w.style || ''), col = w.erased ? '#7a7a74' : w.kind === 'scritta' ? (red ? '#d42a2a' : '#1c1c22') : w.kind === 'satira' ? '#2a2a2a' : '#c8402a';
    if (w.erased) { x.fillStyle = 'rgba(130,128,120,.85)'; for (let i = 0; i < 14; i++) x.fillRect(10 + Math.random() * 30, 14 + i * 7, 200 + Math.random() * 30, 8); return c; }
    if (w.kind === 'scritta') {
      const t = String(w.text || '').toUpperCase().replace(/[«»]/g, '').slice(0, 26), size = t.length > 16 ? 26 : 34;
      x.font = `bold ${size}px Impact, Arial Black, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col;
      const words = t.split(' '), lines = []; let cur = ''; words.forEach(wd => { if ((cur + ' ' + wd).trim().length > 14 && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }); if (cur) lines.push(cur);
      lines.slice(0, 2).forEach((ln, i) => { const y = 64 + (i - (Math.min(2, lines.length) - 1) / 2) * size * 1.05; x.save(); x.translate(128, y); x.rotate((Math.random() - .5) * .08); x.fillText(ln, 0, 0); x.restore();
        for (let k = 0; k < 6; k++) { const dx = 20 + Math.random() * 216; x.fillRect(dx, y + size * .35, 2, 6 + Math.random() * 18); } });   // colature
    } else {
      // un disegno: pennellate e una faccia storta (satira) o forme colorate (arte)
      x.lineCap = 'round'; for (let i = 0; i < 9; i++) { x.strokeStyle = w.kind === 'arte' ? ['#c8402a', '#2a6ac8', '#e8c040', '#3a9a5a'][i % 4] : col; x.lineWidth = 4 + Math.random() * 6; x.beginPath(); x.moveTo(30 + Math.random() * 196, 20 + Math.random() * 88); x.quadraticCurveTo(128, 64, 30 + Math.random() * 196, 20 + Math.random() * 88); x.stroke(); }
      if (w.kind === 'satira') { x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); x.arc(128, 60, 34, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(98, 34); x.lineTo(84, 4); x.moveTo(158, 34); x.lineTo(172, 4); x.stroke(); }
    }
    return c;
  }
  function muriGente(st) {
    window.__muriGente = MGV;   // per le prove
    const L = (st.pop && st.pop.walls) || [], sig = L.length + ':' + L.filter(w => w.erased).length; if (sig === MGV.n) return; MGV.n = sig;
    const keep = {};
    L.forEach((w, i) => { if (w.wx == null) return; const k = w.ev + (w.erased ? 'x' : ''); keep[k] = 1; if (MGV.meshes[k]) return;
      const old = MGV.meshes[w.ev + (w.erased ? '' : 'x')]; if (old) { scene.remove(old); delete MGV.meshes[w.ev + (w.erased ? '' : 'x')]; }
      const tex = new THREE.CanvasTexture(mgTexture(w)); tex.encoding = THREE.sRGBEncoding;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .95), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(w.wx, groundH(w.wx - Math.cos(w.wface) * .6, w.wy - Math.sin(w.wface) * .6) + 1.25, w.wy); m.rotation.y = Math.PI / 2 - (w.wface + Math.PI); m.renderOrder = 3;
      scene.add(m); MGV.meshes[k] = m; });
    Object.keys(MGV.meshes).forEach(k => { if (!keep[k]) { scene.remove(MGV.meshes[k]); delete MGV.meshes[k]; } });
  }
  function indoorPass(st) {""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
