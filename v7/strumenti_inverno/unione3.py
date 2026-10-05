# [unione3] Dopo unione2.py. Guardia [unione3].
#  - strade: via le «macchie di asfalto consumato coi sampietrini sotto» di [strade1] (Andrea: «la strada che diventa sampietrini
#    a caso»). Una via è d'asfalto o di sampietrini da un capo all'altro (Via del Porto e Via Alta restano di sampietrini);
#    caditoie e tombini restano;
#  - muri vivi, seconda passata della sessione [muri1] (commit 4e47301 sul ramo confident-heisenberg): sui muri ciechi delle case
#    comuni metà dei grandi dipinti è un murale della gente (mvMural alto), gli altri e gli edifici del governo tengono il murale
#    del Partito di [case] (muralMat, coi fari). luci_regia7.py della stessa sessione NON si applica: il sole lo fa girare [amb1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione3]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("    S.patch.forEach(([px, py, len, wid, ang, seed]) => {", "    (false ? S.patch : []).forEach(([px, py, len, wid, ang, seed]) => {   /* [unione3] niente toppe di sampietrini nell'asfalto */")
rep("""  function mvMural(k) {
    const key = 'm' + k; if (MV.tex[key]) return MV.tex[key];
    const r = rng(k * 271 + 3);
    return MV.tex[key] = mvCanvas(192, 64, (x, W, H) => {""", """  function mvMural(k, tall) {   /* [unione3] tall: il murale alto al posto di un ritratto */
    const key = 'm' + k + (tall ? 't' : ''); if (MV.tex[key]) return MV.tex[key];
    const r = rng(k * 271 + 3);
    return MV.tex[key] = mvCanvas(tall ? 96 : 192, tall ? 136 : 64, (x, W, H) => {""")
rep("  function mvPaintMat(t) {", "  function mvMuralMat(k, tall) { const key = 'mm' + k + (tall ? 't' : ''); return MV.mats[key] || (MV.mats[key] = mvPaintMat(mvMural(k, tall))); }   /* [unione3] */\n  function mvPaintMat(t) {")
rep("defaced: r() < .22, top: base + H };", "defaced: r() < .22, top: base + H, mural: !civic && r() < .5 };   /* [unione3] [muri1] metà delle case comuni: il murale della gente */")
rep("const m = new THREE.Mesh(new THREE.PlaneGeometry(PP.pw, PP.ph), propTex('ritratto', (bi % 7) + (PP.defaced ? 100 : 0)));",
    "const m = new THREE.Mesh(new THREE.PlaneGeometry(PP.pw, PP.ph), PP.mural ? mvMuralMat(bi % 8, true) : propTex('ritratto', (bi % 7) + (PP.defaced ? 100 : 0)));   /* [unione3] murale della gente o del Partito */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
