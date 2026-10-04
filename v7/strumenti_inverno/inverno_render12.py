import sys
p=sys.argv[1]; s=open(p).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:70],s.count(old)); s=s.replace(old,new)
# cielo di piombo: meno luce diffusa e meno sole, più contrasto tra luci e ombre (il neon si stacca)
rep("hemi.intensity = .3 + (1 - night) * .3;","hemi.intensity = .26 + (1 - night) * .16;")
rep("moon.intensity = .45 + (1 - night) * .85;","moon.intensity = .42 + (1 - night) * .5;")
open(p,'w').write(s); print('ok')
