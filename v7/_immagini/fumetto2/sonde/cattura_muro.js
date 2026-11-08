// [fumetto2] la prova del muro vicino: la camera a 1,3 m da una facciata della piazza (la sera), colore della scena, distanza, categoria.
// Serve a provare che nessuna trama diventa «pois grossi» quando un muro riempie il quadro. node cattura_muro.js
const { avvia, OUT } = require('./lib'); const { corsa } = require('./passo7'); const fs = require('fs'), path = require('path');
const L = JSON.parse(fs.readFileSync(path.join(OUT, 'luoghi.json'))); const pz = L.piazza;
(async () => {
  const H = await avvia({ vp: { width: 960, height: 540 }, query: 'leggera&tassellivecchi&stile=A' });
  const P = { ora: 16, start: [pz[0] + 10, pz[1]], verso: [pz[0] - 10, pz[1]], foto: 0, segs: [{ sec: 3, percorso: [[pz[0] - 10, pz[1]]], mag: .5 }, { sec: .6 }], varianti: ['D1', 'A'], tempi: 1 };
  await corsa(H.pg, P);
  for (const [nome, W, Nn] of [['muro_vicino', [1381.58, 3.68, 302.29], [.89, .05, -.45]]]) {
    const r = await H.pg.evaluate(([W, Nn]) => {
      const pv = window.__pv, R = pv.R, rd = R.__models.renderer, gl = rd.getContext(), sc = R.__models.scene, cam = R.getCamera(), rt = R.__rt;
      R.stile('D1'); const pl = pv.st.player, gh = R.groundH(pl.x, pl.y), o0 = new THREE.Vector3(pl.x, gh + 1.6, pl.y), rc = new THREE.Raycaster(); rc.camera = cam; let best = null;
      // il muro più vicino al personaggio: raggi orizzontali in 24 direzioni, la prima faccia quasi verticale fra 2 e 25 m
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); rc.set(o0, dir); rc.far = 25;
        const h = rc.intersectObjects(sc.children, true).find(x => x.face && x.distance > 2 && x.object.visible && !x.object.isSprite);
        if (h) { const nw = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (Math.abs(nw.y) < .2 && (!best || h.distance < best.d)) best = { d: h.distance, p: h.point.clone(), n: nw.setY(0).normalize() }; } }
      if (!best) throw new Error('nessun muro');
      const n = best.n.dot(new THREE.Vector3().subVectors(o0, best.p)) < 0 ? best.n.negate() : best.n, p = best.p;
      cam.position.copy(p).addScaledVector(n, 1.3).add(new THREE.Vector3(0, .2, 0)); cam.lookAt(p.clone().add(new THREE.Vector3(0, -.2, 0)).addScaledVector(n.clone().cross(new THREE.Vector3(0, 1, 0)), .6)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      rd.setRenderTarget(rt); rd.render(sc, cam);
      const m = new THREE.ShaderMaterial({ uniforms: { t: { value: rt.texture }, d: { value: rt.depthTexture }, nf: { value: new THREE.Vector2(cam.near, cam.far) }, mode: { value: 0 } },
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0., 1.); }',
        fragmentShader: 'precision highp float; uniform sampler2D t; uniform sampler2D d; uniform vec2 nf; uniform float mode; varying vec2 vU; void main(){ vec4 c = texture2D(t, vU); if (mode < .5) { gl_FragColor = vec4(c.rgb, 1.); return; } float z = texture2D(d, vU).r * 2. - 1.; float dist = 2. * nf.x * nf.y / (nf.y + nf.x - z * (nf.y - nf.x)); float cm = clamp(floor(dist * 100. + .5), 0., 65535.); gl_FragColor = vec4(floor(cm / 256.) / 255., mod(cm, 256.) / 255., c.a, 1.); }',
        depthTest: false, depthWrite: false, toneMapped: false });
      const s2 = new THREE.Scene(); s2.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); const o = {};
      for (const md of [0, 1]) { m.uniforms.mode.value = md; rd.setRenderTarget(null); rd.render(s2, oc); gl.finish(); o[md ? 'dep' : 'col'] = rd.domElement.toDataURL('image/png'); }
      o.cam = { near: cam.near, far: cam.far, fov: cam.fov, aspect: cam.aspect, mw: cam.matrixWorld.elements.slice(), rtW: rt.width, rtH: rt.height };
      const p0 = pv.st.player; o.player = { piedi: [-1, -1], testa: [-1, -1.2], w: [p0.x, R.groundH(p0.x, p0.y), p0.y] }; o.ora = pv.st.t / 60; o.muro = { d: best.d, p: best.p.toArray() }; return o;
    }, [W, Nn]);
    fs.writeFileSync(path.join(OUT, 'g', nome + '_col.png'), Buffer.from(r.col.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, 'g', nome + '_dep.png'), Buffer.from(r.dep.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, 'g', nome + '.json'), JSON.stringify({ cam: r.cam, player: r.player, ora: r.ora }));
    H.log(nome, 'ok', JSON.stringify(r.muro));
  }
  await H.close();
})();
