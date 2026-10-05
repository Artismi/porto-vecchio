# [unione10] Rete di sicurezza per le schede video che non reggono (Andrea: mondo tutto bianco e anteprime dell'inventario vuote:
# il browser ha perso il contesto grafico, cioè la scheda video è andata in crisi e ha spento tutti i disegni 3D).
# Se il contesto si perde, la pagina si ricarica da sola in qualità ridotta (lowQuality: niente ombre, risoluzione più bassa)
# e se lo ricorda nel browser. Per tornare alla qualità piena: aprire il gioco con ?alta in fondo all'indirizzo.
# Dopo unione9.py. Guardia [unione10].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione10]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("    renderer.setPixelRatio(1);\n", """    renderer.setPixelRatio(1);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); try { localStorage.setItem('pvLow', '1'); } catch (x) {} console.warn('[grafica] contesto perso: ricarico in qualità ridotta'); setTimeout(() => location.reload(), 400); });   /* [unione10] */
""")
rep("    TT('flush', flushStatic);", """    TT('flush', flushStatic);
    try { if (/[?&]alta\\b/.test(location.search)) localStorage.removeItem('pvLow'); else if (localStorage.getItem('pvLow') === '1') lowQuality(); } catch (e) {}   /* [unione10] la scheda video non reggeva: si parte leggeri */""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
