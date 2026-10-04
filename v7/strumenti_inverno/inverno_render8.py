import sys
p=sys.argv[1]; s=open(p).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:60],s.count(old)); s=s.replace(old,new)
# 1) esposizione: aloni solo dalle vere fonti, spalla morbida sulle alte luci, neve meno bianca
rep("bl += max(s-.72, 0.); }","bl += max(s-.92, 0.); }")
rep("c += bl*.22;","c += bl*.11;")
rep("c = c*1.32/(1.+c*.5);","c = c*1.32/(1.+c*.5);\n          { vec3 hi = max(c-.6, 0.); c = min(c, vec3(.6)) + hi/(1.+hi*2.8); }   // [inverno] spalla: le alte luci si comprimono invece di bruciare")
rep("const SNOW = '#e6eaf0', SNOW2 = '#d6dce6';","const SNOW = '#cdd3dc', SNOW2 = '#bfc6d2';")
# 2) occlusione ambientale dalla profondità: pieghe, spigoli e contatti si scuriscono
rep("c = mix(c, c*.55 + vec3(.02,.025,.04), ol*.42);","""c = mix(c, c*.55 + vec3(.02,.025,.04), ol*.42);
          { float ao = 0.; for (int k=0;k<8;k++){ float a = float(k)*.785 + .39; vec2 o = vec2(cos(a),sin(a))*px*(k<4?2.:4.); float dn = lin(texture2D(tD, uv+o).r); ao += smoothstep(.0, 1., (d-dn)/(d*.035+.35)); } c *= 1. - ao/8.*.42; }   // [inverno] occlusione ambientale""")
open(p,'w').write(s); print('ok')
