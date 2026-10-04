import sys
p=sys.argv[1]; s=open(p).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:70],s.count(old)); s=s.replace(old,new)
# ---- 1) tono: freddo, verde-acqua, spento. Niente colori da giocattolo ----
rep("  function stripeTex(a, b) {","""  // smorza un colore: meno saturo e più scuro (tende, merce, cartelli: roba vecchia, scolorita dal sale e dal gelo)
  function mute(hex, k) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s * k, h.l * .78); return '#' + c.getHexString(); }
  function stripeTex(a, b) { a = mute(a, .4); b = mute(b, .4);""")
rep("const LIT = ['#ffcf80', '#ffd9a0', '#fff0c8', '#ffb870', '#a8d8ff'];","const LIT = ['#b8e6d4', '#9fd8cc', '#d8f0e0', '#e0a458', '#8fc8f0'];   // [inverno] fluorescenti malati, ogni tanto un sodio")
# post: ombre verde-acqua, alte luci fredde, desaturazione, righe di scansione
rep("c = mix(c, c*.78 + vec3(.04,.1,.11)*.4, (1.-smoothstep(.0,.5,l))*.7);","c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6, (1.-smoothstep(.0,.62,l))*.9);\n          c *= mix(vec3(1.), vec3(.93,1.,1.05), smoothstep(.28,.8,l)*(1.-hot));")
rep("c = mix(vec3(l), c, mix(.82, 1.25, hot)*sat);","c = mix(vec3(l), c, mix(.66, 1.3, hot)*sat);")
rep("float bd = bayer(floor(vUv*res)) - .5;","c *= 1. - .05*mod(floor(vUv.y*res.y), 2.);   // [inverno] righe di schermo: tutto è visto attraverso i monitor del regime\n          float bd = bayer(floor(vUv*res)) - .5;")
# ---- 2) bancarelle: lamiera, assi, luce fredda, tessera annonaria ----
rep("const top = add(g, new THREE.Mesh(new THREE.BoxGeometry(2.9, .08, 1.9), stripeMat(ca, cb)), 0, 2.45, .1, .22, 0, 0);\n    add(g, box(2.9, .3, .03, stripeMat(cb, ca)), 0, 2.2, 1.05);",
    "const top = add(g, box(2.9, .07, 1.9, sm('#4a524e', { roughness: .65, metalness: .45 })), 0, 2.45, .1, .22, 0, 0);\n    add(g, box(1.1, .075, 1.0, sm(mute(ca, .5), { roughness: 1 })), -.7, 2.47, .15, .22, 0, 0);   // toppa di telo\n    add(g, box(2.9, .3, .03, sm('#26292a', { roughness: .9 })), 0, 2.2, 1.05); add(g, box(.7, .26, .02, sm('#7a1218', { roughness: .9 })), .9, 2.2, 1.07);   // tessera annonaria")
rep("const gc = pick(r, goods);","const gc = mute(pick(r, goods), .5);")
rep("add(g, new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 4), sb('#ffe0a0')), 0, 2.2, 0);","add(g, new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 4), sb('#d6f2ea')), 0, 2.2, 0);")
rep("glow(x, groundH(x, z) + 2.2, z, '#ffd090', 1.6);","glow(x, groundH(x, z) + 2.2, z, '#8fe0d0', 1.6);")
# ---- 3) cavi: via le lucine natalizie, ora striscioni del regime e lampade fredde ----
rep("lampM = ['#ffb35c', '#ff3fa4', '#38e8ff']","lampM = ['#9fe8dc', '#d8f0e8', '#38e8ff']")
rep("lg.add(m); if (rc() < .6) addLight(mx, my, mz, '#ffb35c', 1.4, 9, .05); }","lg.add(m); if (rc() < .5) { const bn = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), eyeMat('banner')); bn.position.set(mx, my - 1.3, mz); bn.rotation.y = Math.atan2(ux, uz); lg.add(bn); } if (rc() < .6) addLight(mx, my, mz, '#8fd8d0', 1.4, 9, .05); }")
rep("    scene.add(lg);\n    return nn;","""    // ---- il regime sui tetti: torri di altoparlanti, schermi del Garante, telecamere con il led rosso ----
    anchors.forEach(A => {
      const q = rc(), sx = rc() < .5 ? -1 : 1, sz = rc() < .5 ? -1 : 1, ex = A.cx + sx * A.hx * .7, ez = A.cz + sz * A.hz * .7, ry = A.y - .5, iron = sm('#23262a', { roughness: .8, metalness: .3 });
      if (q < .26) {
        const pole = cyl(.06, .08, 3.4, 6, iron); pole.position.set(ex, ry + 1.7, ez); lg.add(pole);
        for (let k = 0; k < 3; k++) { const h = new THREE.Group(); h.position.set(ex, ry + 2.5 + (k % 2) * .6, ez); h.rotation.y = k * 2.09 + rc() * 1.2; const horn = new THREE.Mesh(new THREE.ConeGeometry(.4, .75, 10, 1, true), sm('#8a8d90', { roughness: .6, metalness: .3, side: THREE.DoubleSide })); horn.rotation.z = Math.PI / 2; horn.position.x = .4; h.add(horn); lg.add(h); }
        const led = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), sb('#ff2a2a')); led.position.set(ex, ry + 3.5, ez); lg.add(led); glow(ex, ry + 3.5, ez, '#ff2a2a', 1.3);
      } else if (q < .44) {
        const m = eyeMat('screen'), sc = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.5), m); sc.position.set(ex, ry + 3.4, ez); sc.rotation.y = .5; sc.material.side = THREE.DoubleSide; lg.add(sc);
        const fr = box(4.6, 2.7, .12, iron); fr.position.copy(sc.position); fr.rotation.y = .5; fr.translateZ(-.09); lg.add(fr);
        [-1.6, 1.6].forEach(o => { const lgp = box(.1, 2.2, .1, iron); lgp.position.set(ex + Math.cos(.5) * o, ry + 1.1, ez - Math.sin(.5) * o); lg.add(lgp); });
        const gl2 = glow(sc.position.x, sc.position.y, sc.position.z, '#7ff0e0', 6); gl2.material.opacity = .35; dyn.signs.push({ m, gl: gl2, flick: rc() < .35 });
      } else if (q < .6) {
        const pole = cyl(.05, .05, 1.8, 6, iron); pole.position.set(ex, ry + .9, ez); lg.add(pole);
        const cam = box(.5, .22, .22, sm('#3a3e42', { roughness: .6 })); cam.position.set(ex, ry + 1.9, ez); cam.rotation.y = rc() * 6.28; lg.add(cam);
        const led = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), sb('#ff2a2a')); led.position.set(ex, ry + 1.9, ez); lg.add(led); glow(ex, ry + 1.9, ez, '#ff2a2a', .9);
      }
    });
    scene.add(lg);
    return nn;""")
rep("  // ================= [inverno] DETTAGLI:","""  // occhio del Garante: striscione rosso e schermo verde-acqua
  const EYEC = {};
  function eyeMat(kind) {
    if (EYEC[kind]) return EYEC[kind];
    const ban = kind === 'banner', W = ban ? 48 : 128, H = ban ? 72 : 72, c = mk(W, H), x = c.getContext('2d');
    x.fillStyle = ban ? '#7e1118' : '#06161a'; x.fillRect(0, 0, W, H);
    const cx = W / 2, cy = ban ? 30 : 34, R = ban ? 15 : 22;
    x.fillStyle = ban ? '#150a0b' : '#0c2a30'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    x.fillStyle = ban ? '#e8e0d0' : '#9ff6ea'; x.beginPath(); x.moveTo(cx - R * .85, cy); x.quadraticCurveTo(cx, cy - R * .8, cx + R * .85, cy); x.quadraticCurveTo(cx, cy + R * .8, cx - R * .85, cy); x.fill();
    x.fillStyle = ban ? '#b4141c' : '#0a2024'; x.beginPath(); x.arc(cx, cy, R * .3, 0, 7); x.fill(); x.fillStyle = '#000'; x.fillRect(cx - 1, cy - R * .22, 2, R * .44);
    x.fillStyle = ban ? '#150a0b' : '#9ff6ea'; if (ban) { x.fillRect(5, 54, 38, 3); x.fillRect(9, 60, 30, 2); x.fillRect(0, 0, W, 3); } else { x.globalAlpha = .7; x.fillRect(8, 62, 70, 3); x.fillRect(8, 67, 44, 2); x.globalAlpha = 1; for (let k = 0; k < H; k += 3) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, k, W, 1); } }
    const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return EYEC[kind] = ban ? new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, emissive: '#3a0508', emissiveMap: t }) : new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  }
  // ================= [inverno] DETTAGLI:""")
open(p,'w').write(s); print('ok')
