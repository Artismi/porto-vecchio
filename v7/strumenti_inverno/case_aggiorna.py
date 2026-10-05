# [case] Aggiorna il pass case in un render.js che ne contiene già una versione precedente (es. quello di main dopo «Tutto insieme»):
# sostituisce il blocco dei frammenti (forme.js + case_carattere.js + case_pienezza.js, inserito prima di buildCity) con la versione attuale
# e applica le modifiche arrivate dopo, ognuna una volta sola. Per un render.js senza il pass case si usa case_render1.py.
import sys, os, re
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
D = os.path.dirname(os.path.abspath(__file__))
frag = ''.join(open(os.path.join(D, n), encoding='utf-8').read() for n in ('forme.js', 'case_carattere.js', 'case_pienezza.js'))
a = s.find("  // ================= [case] FORME: ogni oggetto su tre livelli di dettaglio"); b = s.find("  function buildCity() {")
assert a >= 0 and b > a, 'nessun pass case da aggiornare: usa case_render1.py'
s = s[:a] + frag + s[b:]
def once(old, new, mark):
    global s
    if mark in s: return
    assert s.count(old) == 1, (old[:90], s.count(old)); s = s.replace(old, new)
# grigio latte
m = re.search(r"\n    borgo: \[\[.*?\]\],   // \[case\][^\n]*\n", s, re.S); assert m, 'PALS.borgo [case]'
if 'grigio latte' not in m.group(0):
    s = s[:m.start()] + """
    borgo: [['#d6d4cc', '#eeece6'], ['#cfccc2', '#e8e6de'], ['#c8c6be', '#e2e0d8'], ['#dcd8ce', '#f0ece4'], ['#bebcb6', '#dcdad4'], ['#d0cdc4', '#ebe8e0'], ['#b8b6ae', '#d8d6ce'], ['#c4c2bc', '#e6e4dc'],
      ['#d8d2c4', '#efeae0'], ['#cac6ba', '#e4e0d6'], ['#c29a5c', '#e0d4b8'], ['#b26a4c', '#dccbb0'], ['#8e9a76', '#d8d4c0'], ['#c49282', '#e4d8cc']],   // [case] grigio latte: la città è calma, il colore sta nei murali, nelle insegne, nelle luci
""" + s[m.end():]
once("      const slots = Math.min(13, 3 + Math.floor(w * d / 13));", "      const slots = Math.min(5, 1 + Math.floor(w * d / 36));   // [case] pulizia: meno roba sparsa sui tetti", "[case] pulizia: meno roba sparsa")
once("      if (!(((b.shop || b.sign) && r() < .9) || r() < .5)) return;", "      if (b.__pent) return;   // [case] c'è già la tettoia in coppi\n      if (!(((b.shop || b.sign) && r() < .9) || r() < .5)) return;", "[case] c'è già la tettoia in coppi")
once("    const r = rng(i * 733 + 101), civic = kind === 'civic' || kind === 'mil'; if (r() > (civic ? .8 : .34)) return null;",
     "    const r = rng(i * 733 + 101), civic = kind === 'civic' || kind === 'mil'; if (r() > (civic ? .85 : .55)) return null;   // [case] più murali", "[case] più murali")
once("        if (bi % 3 === 0) addLight(PP.x + Math.sin(PP.yaw) * 2, PP.yc - PP.ph / 2 + .4, PP.z + Math.cos(PP.yaw) * 2, '#e0a050', 1.8, 10, .02);   // faretto da sotto",
     "        { const lg = new THREE.Group(); muralLights(PP, lg); lg.traverse(o => { if (o.isMesh) o.castShadow = false; }); g.add(lg); }   // [case] due fari veri sul murale", "[case] due fari veri sul murale")
open(p, 'w', encoding='utf-8').write(s); print('aggiornato')
