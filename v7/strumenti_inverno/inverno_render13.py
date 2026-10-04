import sys,os
p=sys.argv[1]; s=open(p).read()
frag=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'inverno_citta.js')).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:70],s.count(old)); s=s.replace(old,new)
rep("  function buildVolumes() {", frag+"  function buildVolumes() {")
rep("TT('tetti', buildRoofs);","TT('tetti', buildRoofs); TT('citta', buildCity);")
rep("const LIT = ['#b8e6d4', '#9fd8cc', '#d8f0e0', '#e0a458', '#8fc8f0'];","const LIT = ['#ffb050', '#ffc470', '#ffb050', '#9fe8dc', '#ff6fb0', '#8fc8f0'];")
rep("['#7e8c90', '#c8c6c0']],\n    farm:","['#7e8c90', '#c8c6c0'], ['#5a9aa4', '#a8b4b0'], ['#a05c48', '#b8a890'], ['#6e8696', '#9aa4aa'], ['#c8b04c', '#d8d0b0'], ['#7a6a90', '#a8a0b0'], ['#5a8270', '#a8b4a4']],\n    farm:")
open(p,'w').write(s); print('ok')
