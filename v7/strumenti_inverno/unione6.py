# [unione6] Dopo unione5.py. Guardia [unione6].
#  - mare: l'acqua bassa turchese lungo la riva si allargava per metri anche sotto le banchine (muro a picco) e, calcolata da una
#    maschera a caselle, disegnava una fascia azzurra a spigoli attorno a moli e calate. Ora è stretta e sfumata;
#  - asfalto: i rattoppi rettangolari dei motivi di [strade1] erano quasi neri o chiari a metà opacità: da lontano sembravano
#    un'altra pavimentazione. Restano, ma appena più scuri o più chiari del bitume intorno.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione6]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("vec3 c = mix(deep, shal, smoothstep(.04,.55,m));", "vec3 c = mix(deep, shal, smoothstep(.3,.8,m) * .7);   /* [unione6] acqua bassa stretta e sfumata */")
rep("x.fillStyle = t ? 'rgba(20,19,20,.55)' : 'rgba(70,66,62,.32)'; x.fillRect(px, py, w, h); x.strokeStyle = t ? 'rgba(80,76,72,.5)' : 'rgba(16,15,16,.55)';",
    "x.fillStyle = t ? 'rgba(20,19,20,.18)' : 'rgba(70,66,62,.12)'; x.fillRect(px, py, w, h); x.strokeStyle = t ? 'rgba(80,76,72,.2)' : 'rgba(16,15,16,.22)'; /* [unione6] */")
rep("x.fillStyle = r() < .5 ? 'rgba(22,20,20,.55)' : 'rgba(64,60,56,.35)'; const w = 6 + r() * 22, h = 4 + r() * 12;",
    "x.fillStyle = r() < .5 ? 'rgba(22,20,20,.18)' : 'rgba(64,60,56,.12)'; const w = 6 + r() * 22, h = 4 + r() * 12; /* [unione6] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
