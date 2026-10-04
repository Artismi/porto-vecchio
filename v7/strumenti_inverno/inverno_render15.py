import sys,os
p=sys.argv[1]; s=open(p).read()
frag=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'inverno_soglie.js')).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:70],s.count(old)); s=s.replace(old,new)
rep("  function buildVolumes() {", frag+"  function buildVolumes() {")
rep("TT('citta', buildCity);","TT('citta', buildCity); TT('soglie', buildThresholds);")
# lampioni modesti: niente coni, pozze piccole e tenui, luce bassa. La luce vera sta sotto le tettoie e nei vicoli
rep("if (!L.always && hh > 2.5 && hh < 9 && VX.cones.length < 220) {","if (false) {")
rep("const sz = Math.min(9, (L.dist || 8) * .7)","const sz = L.always ? Math.min(9, (L.dist || 8) * .7) : Math.min(4.5, (L.dist || 8) * .36)")
rep("(d.always ? .25 + night * .3 : night * .42)","(d.always ? .25 + night * .3 : night * .2)")
rep("kind === 'sodium' ? 3.6 : 3.0, kind === 'sodium' ? 14 : 10, .03);","kind === 'sodium' ? 2.0 : 1.6, kind === 'sodium' ? 10 : 7.5, .03);")
rep("const gl = glow(wx, y0 + ly, wz, col, kind === 'deco' ? 3.6 : 3.2);","const gl = glow(wx, y0 + ly, wz, col, kind === 'deco' ? 2.4 : 2.0);")
open(p,'w').write(s); print('ok')
