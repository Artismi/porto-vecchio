import sys
p=sys.argv[1]; s=open(p).read()
old="const tex = canvasTex(c), rtex = canvasTex(rc);"
assert s.count(old)==1, s.count(old)
s=s.replace(old, old+" tex.magFilter = THREE.LinearFilter; // [inverno] bordi della neve e dei marciapiedi senza scalini di texel")
open(p,'w').write(s); print('ok')
s=open(p).read()
old="cam.yaw = angLerp(YAW + cam.uy, cam.dyaw, ease);"
assert s.count(old)==1
s=s.replace(old,"cam.yaw = YAW + cam.uy; // [inverno] la vista NON gira con l'auto: guida precisa, retro compresa")
old="let lead = 5 + Math.max(0, pveh.speed > -1 ? vsp : 0) * .75;"
assert s.count(old)==1
s=s.replace(old,"let lead = pveh.speed < -1 ? 3 : 5 + Math.max(0, vsp) * .75;")
open(p,'w').write(s); print('ok cam')
s=open(p).read()
old="const l = Math.hypot(...n) || 1; n = n.map(v => v / l); for (let k = 0; k < 6; k++) N.push(...n); };"
assert s.count(old)==1
new="""const l = Math.hypot(...n) || 1; n = n.map(v => v / l);
      // [inverno] sul terreno le normali sono per vertice (dolci), non per casella: niente facce a spigolo vivo sui pendii
      if (P === pos) [a, b, c2, a, c2, d].forEach(q => { const i = Math.round(q[0] / TS), j = Math.round(q[2] / TS); if (Math.abs(q[1] - VH(i, j)) > .02) { N.push(...n); return; } const gx = (VH(i + 1, j) - VH(i - 1, j)) / (2 * TS), gz = (VH(i, j + 1) - VH(i, j - 1)) / (2 * TS), m = Math.hypot(gx, 1, gz); N.push(-gx / m, 1 / m, -gz / m); });
      else for (let k = 0; k < 6; k++) N.push(...n); };"""
s=s.replace(old,new); open(p,'w').write(s); print('ok normals')
s=open(p).read()
old="ripostiglio: 'cotto' };"
assert s.count(old)==1
s=s.replace(old,"ripostiglio: 'cotto', officina: 'cemento' };")
old="deposito: '#9a948a' };"
assert s.count(old)==1
s=s.replace(old,"deposito: '#9a948a', officina: '#8e8c86' };")
open(p,'w').write(s); print('ok maps')
