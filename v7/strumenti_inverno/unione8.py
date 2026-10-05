# [unione8] Dopo unione7.py. Guardia [unione8]. Andrea, giocando la build unita su Vercel: «pesante, lagga», «hai tolto la
# spazzatura, quella ci stava», «segnaletica orizzontale che si ripete all'infinito a caso», «frecce a terra disallineate o
# immotivate: tieni solo quelle che servono», «piante ripetute sui tetti», «piove ed è sempre notte, dovrebbe iniziare col sole».
#  - risoluzione: [amb3] disegnava a risoluzione piena (su 1080p HDR, bloom, profondità di campo e palette su 2 milioni di pixel);
#    ora al massimo 720 righe, ancora più nitido del gioco di prima ma circa metà del costo;
#  - le carte al vento tornano 44 (come in [animazioni-mondo]);
#  - strisce pedonali: un attraversamento solo per posto (i nodi di incrocio vicini ne mettevano due o tre sovrapposti);
#  - frecce a terra solo sulle corsie dei 4 incroci col semaforo;
#  - giardini e pergolati sui tetti meno spesso (erano su quasi metà dei tetti piani del borgo);
#  - il primo giorno è sereno fino alle 16 (la partenza la sposta game.js alle 9 del mattino).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione8]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("PX = LOWQ.on ? Math.max(2, Math.round(dpr) * 2) : Math.max(1, Math.round(dpr));",
    "PX = LOWQ.on ? Math.max(2, Math.round(dpr) * 2) : Math.max(1, ch * dpr / 720);   /* [unione8] al massimo 720 righe */")
rep("const N = 12, geo = new THREE.PlaneGeometry(.3, .4);", "const N = 44, geo = new THREE.PlaneGeometry(.3, .4);   /* [unione8] la spazzatura ci sta */")
rep("AR.forEach(a => { if (a.w < 6) return; CW35.push(",
    "AR.forEach(a => { if (a.w < 6) return; { const qx = jx + a.ux * (jr + 1.4), qy = jy + a.uy * (jr + 1.4); if (CW35.some(c => Math.hypot(c.x - qx, c.y - qy) < 7)) return; }   /* [unione8] un attraversamento solo */ CW35.push(")
rep("const fx = sx + ux * 7 + rx * lane / 2, fy = sy + uy * 7 + ry * lane / 2;",
    "if (!J.signal) return; /* [unione8] frecce solo agli incroci col semaforo */ const fx = sx + ux * 7 + rx * lane / 2, fy = sy + uy * 7 + ry * lane / 2;")
rep("return q < .3 ? 'giardino' : q < .42 ? 'pergola' : '';", "return q < .12 ? 'giardino' : q < .18 ? 'pergola' : '';   /* [unione8] */")
rep("let a = 0, k = 'sereno'; for (const [n, p] of WXORD) { a += p; if (h < a) { k = n; break; } }",
    "let a = 0, k = 'sereno'; for (const [n, p] of WXORD) { a += p; if (h < a) { k = n; break; } } if (slot < 4) k = 'sereno';   /* [unione8] il primo giorno comincia col sole */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
