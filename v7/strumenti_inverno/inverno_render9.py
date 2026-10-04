import sys
p=sys.argv[1]; s=open(p).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:60],s.count(old)); s=s.replace(old,new)
# 1) rimbalzo della neve: il suolo restituisce luce alle pareti (prima nere sul lato sud)
rep("hemi.groundColor.set(night > .5 ? '#14161e' : '#4a4e58');","hemi.groundColor.set(night > .5 ? '#2c3650' : '#7a8296');")
# 2) luce di riempimento fredda dal lato camera, senza ombre: le facciate a sud/est si leggono
rep("dyn.rim = new THREE.DirectionalLight('#b8c8e8', .4); scene.add(dyn.rim); scene.add(dyn.rim.target);",
    "dyn.rim = new THREE.DirectionalLight('#b8c8e8', .4); scene.add(dyn.rim); scene.add(dyn.rim.target);\n    dyn.fill = new THREE.DirectionalLight('#6f8fb0', .3); scene.add(dyn.fill); scene.add(dyn.fill.target);   // [inverno] riempimento sud: pareti in ombra leggibili")
rep("if (dyn.rim) {","if (dyn.fill) { dyn.fill.position.set(cam.x + 8, 14, cam.y + 40); dyn.fill.target.position.set(cam.x, 0, cam.y); dyn.fill.intensity = .38 + (1 - night) * .12; dyn.fill.color.set(night > .5 ? '#5f86b4' : '#a8bcd0'); }\n    if (dyn.rim) {")
# 3) nebbia più verde-acqua e un filo più vicina: profondità senza lavare i colori
rep("scene.background.copy(tmpC); scene.fog.color.copy(tmpC);","tmpC.lerp(FOGTEAL, .22 + night * .12); scene.background.copy(tmpC); scene.fog.color.copy(tmpC);")
rep("let hemi, moon, fillAmb;","let hemi, moon, fillAmb;\n  const FOGTEAL = new THREE.Color('#2c5a62');")
open(p,'w').write(s); print('ok')
