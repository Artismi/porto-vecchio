# [inverno 18] Macchie a terra morbide: fanghiglia, rattoppi e chiazze bagnate erano rettangoli (a terra in isometria: rombi). Ora sono ovali sfumati.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno18]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
# un ovale sfumato al posto di un rettangolo
rep("    const blot = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };",
    """    const blot = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
    const smear = (cx, cy, rw, rh, col, rot) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, 1); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\\d.]+\\)$/, '0)'));   // [inverno18]
      x.save(); x.translate(cx, cy); x.rotate(rot || 0); x.scale(rw, rh); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.3); x.translate(-cx, -cy); x.fill(); x.restore(); };""")
rep("if (r() < .18) blot(px + Math.floor(r() * 8), py + Math.floor(r() * 8), 5 + Math.floor(r() * 5), 3, 'rgba(40,44,52,.4)'); }",
    "if (r() < .18) smear(px + r() * P, py + r() * P, 5 + r() * 6, 2.5 + r() * 2, 'rgba(40,44,52,.38)', r() * 3); }")
rep("if (q.paved && r() < .2) blot(px + Math.floor(r() * 9), py + Math.floor(r() * 9), 4 + Math.floor(r() * 5), 2 + Math.floor(r() * 3), 'rgba(38,42,50,.36)');",
    "if (q.paved && r() < .2) smear(px + r() * P, py + r() * P, 4 + r() * 5, 2 + r() * 3, 'rgba(38,42,50,.34)', r() * 3);")
rep("if (q.sooty && r() < .4) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 2 + Math.floor(r() * 4), 2, 'rgba(26,24,26,.4)');",
    "if (q.sooty && r() < .4) smear(px + r() * P, py + r() * P, 3 + r() * 4, 2 + r() * 2, 'rgba(26,24,26,.38)', r() * 3);")
# rattoppo dell'asfalto: ovale irregolare, non rettangolo
rep("if (r() < .25) { x.fillStyle = 'rgba(60,56,58,.35)'; x.fillRect(px + Math.floor(r() * P), py + Math.floor(r() * P), 3 + Math.floor(r() * 5), 2 + Math.floor(r() * 3)); }   // rattoppo",
    "if (r() < .25) { x.fillStyle = 'rgba(60,56,58,.3)'; x.beginPath(); x.ellipse(px + r() * P, py + r() * P, 2 + r() * 4, 1.5 + r() * 2.5, r() * 3, 0, 6.3); x.fill(); }   // rattoppo [inverno18]")
open(p, 'w', encoding='utf-8').write(s); print('ok')
