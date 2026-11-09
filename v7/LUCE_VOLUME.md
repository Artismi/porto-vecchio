# Porto Vecchio — LUCE IN VOLUME E TRATTEGGIO DA ILLUSTRATORE (`?luce3`, proposta: il difetto non cambia)

Il direttore su `_immagini/ombre_strada/luce_globale.jpg`: «adesso ombre e luci sono estremi, quindi appiattiscono e i muri sembrano arancione
scuro o giallo chiaro, e poi ha tutto la stessa campitura a righe che è bella ma risulta uniforme e piatta, un po' semplificata, non segue bene
la superficie».

Tavola: `_immagini/luce_volume/proposta.jpg` (8 posti × oggi | LUCE2 | `?luce3=a` | `?luce3=b`, sotto ogni foto la striscia del valore dei
muri; computer 8 posti, telefono 4; i ritagli da vicino: falda e colonne, pilastri, facciata, muro del vicolo). Codice: `src/luce3.js` (solo shader, fuori dall'impronta dei tasselli). Misure:
`reports/luce_volume.json`.

## 1. Come sono fatte oggi la luce e il tratteggio (main, stile E 55)

**La luce sta nei materiali** (render.js `sguProPezzi`, pezzi di `THREE.ShaderChunk`, quindi anche nei tasselli cotti):

| pezzo | dove | che cosa fa | effetto |
|---|---|---|---|
| la luce a bande | `lights_physical_pars_fragment`, dopo `dotNL` | il coseno del sole va a 0 / .38 / 1 (gradini a .08 e .3–.4), all'80% (`SGU.pro.celle` .8 → `sgP4.x`) | ogni faccia da un coseno di .4 in su è «piena»: muri di facciate diverse allo stesso valore; quella di sbieco cade a .38. **Due valori** |
| l'ombra portata | `lights_fragment_begin` (al posto di `getShadow`) | PCFSoft di three (mappa 2048, 1024 al telefono, su ±28–64 m: texel 3–6 cm), poi **indurita due volte**: smoothstep .05–.95 × `ombre` .82, smoothstep .2–.8 × `celle`·.6 | bordo netto ovunque, a contatto come a 10 m dal lanciatore |
| il riempimento | `lights_fragment_end` | `albedo × sgP3` (il cielo dell'ora, `proTinta`) × (1 − ombra) × .82; LUCE2 lo mette anche nell'ombra propria | uguale al piede della via e a 10 m d'altezza, sotto la gronda e in piazza: **nessuna occlusione, nessun rimbalzo** |
| emisfero e ambiente | three | costanti | idem |
| la curva | `CustomToneMapping` (render.js `sguPezzi`) | la spalla sul canale più alto da .72 (la tinta resta) | un muro saturo al sole arriva al tetto del canale: **tutti i suoi pixel allo stesso valore** (Vittoria: muri al sole L .68, scarto interquartile .010) |
| il passo | render.js `sguInit` | via i neri (`gN.x`), contrasto ×1,15 attorno a .45, la tavolozza di E in Oklab (valore di A, contrasto ×1,12, spalla .85), i piani per categoria | LUCE2 dimezza neri e contrasto in più |

**Il tratteggio sta nel passo finale** (render.js, stile E, punto 3; `eRig`): righe di 12 cm sul piano dell'asse dominante della normale
ricavata dalla profondità (xz, zy o xy), un **angolo fisso per categoria** (suolo 30°, muri 68°, tetti −40°, il resto 45°), passo sullo schermo
6–12 px a 540 righe con le ottave, riga 1,4 px; acceso dal **valore del pixel finito** (< .70 suolo e tetti, < .55 il resto), peso .22–.52,
l'incrocio sotto .32; mai su persone, cielo, oltre 12–14 m. Per questo «non segue la superficie»: la falda prende le righe del piano
orizzontale, un muro le prende diagonali, e il peso non sa cos'è la luce (un muro scuro al sole si tratteggia, un intonaco chiaro in ombra quasi
no). Stesso passo, peso e direzione ovunque.

**Le misure di oggi** (valore Oklab L dei muri al sole e in ombra in 8 posti; la maschera dalla prova della scena: il sole e la categoria
scritti dai materiali): §3, colonna «oggi».

## 2. Che cosa cambia `?luce3` e perché

Tutto dietro `?luce3` (`?luce3=a` è lo stesso, `?luce3=b` la seconda variante); dal vivo `window.__LUCE3.imposta('a'|'b'|0)`. Poggia su LUCE2
(che accende). Senza `?luce3` il modulo non entra negli shader: il gioco di serie è identico.

**La luce (nei materiali)**
1. **La forma che gira**: il coseno del sole continuo con la spalla, `1 − (1 − x)^1,6`, e solo un'eco delle bande (12%). Il muro di sbieco è
   un medio, quello di fronte al sole pieno, la falda e le cose tonde girano.
2. **La luce scende sul muro**: il sole sui muri ×.74 al piede, ×1,05 a 10 m (dalla quota della camera); un muro piano al sole non è più un
   valore solo.
3. **Il cielo che si vede**: sui muri ×.86 al piede della via, ×1,12 in alto; sotto gronde, balconi e archi (le facce girate in basso) −25%.
4. **Il rimbalzo del suolo**: di giorno i primi 6 m dei muri prendono la luce calda del suolo al sole (il colore del sole × la pietra calda ×.2).
5. **L'ombra**: niente indurimento doppio; netta a contatto, aperta (il filtro di three) quando chi la fa è lontano (fino a 6 m): una lettura in
   più della mappa (4, in croce, solo nei pixel di penombra).
6. **La spalla larga**: sopra .78 i chiari si stringono piano (da 1 a 3 restano distinti invece di finire tutti sul tetto del canale).
7. **L'occlusione** (nel passo, prima della tavolozza): le pieghe dalla profondità (piede dei muri, angoli, sotto gronde e balconi), 4 coppie
   di letture a ~0,9 m nel mondo (2 al telefono), verso il lilla della tavolozza, mai grigia.
8. La temperatura resta quella di LUCE2: sole caldo dell'ora, ombra col cielo dell'ora (blu-lilla), un quinto più piena.

**Il tratteggio (nei materiali, non più nel passo)**
- **Il tono della luce lo accende, non il colore**: tono = sole × ombra × .8 + cielo che si vede × .2 (meno al piede dei muri). In luce
  niente; nell'ombra aperta (piazza, muro alto) righe sottili e chiare; nell'ombra chiusa (piede dei muri, vicolo, sotto le gronde) piene;
  l'incrocio solo nell'ombra fonda.
- **La direzione segue la superficie**: muri verticali (a) o lungo i corsi (b); falde giù per la pendenza (le file dei coppi); suolo lungo la luce
  (la direzione delle ombre portate; col sole alto 30°). La direzione viene dalla normale dei vertici (liscia: quella dei materiali porta la
  micro-normale e dalle derivate tremava, ×30 m di leva = grana).
- **La riga porta il tono**: sotto le righe il fondo è un filo più chiaro (+12% a, +17% b dove le righe ci sono), così il valore medio
  dell'ombra resta quello di LUCE2 e la differenza la fa il disegno, non un'ombra più nera.
- **La materia**: metalli ×.25, lucidi ×.5; foglie, vetri, acqua, vani neri, persone e mezzi niente (tinte piatte, BIBBIA §2).
- **Ferme sullo schermo**: righe ancorate al mondo (origine locale multipla del passo), ottave (6–12 px a 540 righe, le righe di mezzo
  entrano sfumando, niente scatti), antialiasate (1 px), spente sotto il passo minimo e oltre 28–42 m: niente moiré né grana. Telefono: una
  famiglia sola (niente incrocio).

| | `?luce3=a` «matita» | `?luce3=b` «china» |
|---|---|---|
| forza della riga | .42 | .56 |
| muri | verticali | lungo i corsi (orizzontali) |
| incrocio | tono < .07 (solo il piede dei muri in ombra) | tono < .085 |
| occlusione | .5 | .62 |

## 3. Le misure

Valore Oklab L dei muri del quadro (computer, 1280 × 720; la maschera dalla prova della scena: categoria muro, sole > .6 o < .08). In ogni
cella: mediana al sole / mediana in ombra (scarto interquartile al sole · in ombra) e la quota dei muri nei medi (L .45–.72). Tutto in
`reports/luce_volume.json` (anche il telefono). **Le catture sono del giro di taratura appena prima del commit** (spalla da .70, cielo al
piede .78, senza il fondo più chiaro sotto le righe): nel codice committato le ombre di luce3 sono un filo più chiare di queste.

| posto | oggi | LUCE2 | ?luce3=a |
|---|---|---|---|
| Vittoria 12 | 0.68 / 0.43 (0.009 · 0.194) 62% | 0.69 / 0.51 (0.008 · 0.178) 71% | 0.65 / 0.46 (0.030 · 0.156) 68% |
| Rua 15 | 0.59 / 0.31 (0.249 · 0.210) 25% | 0.61 / 0.37 (0.220 · 0.181) 35% | 0.55 / 0.34 (0.160 · 0.169) 28% |
| vicolo 17:30 | 0.50 / 0.42 (0.228 · 0.203) 45% | 0.53 / 0.49 (0.181 · 0.155) 60% | 0.44 / 0.41 (0.202 · 0.125) 34% |
| porto 9:30 | 0.60 / 0.40 (0.296 · 0.284) 42% | 0.61 / 0.46 (0.264 · 0.276) 47% | 0.57 / 0.42 (0.247 · 0.267) 48% |
| Piazza 17:30 | 0.84 / 0.54 (0.149 · 0.151) 27% | 0.84 / 0.65 (0.146 · 0.176) 42% | 0.77 / 0.57 (0.169 · 0.170) 38% |
| Piazza sera | 0.48 / 0.71 (0.217 · 0.133) 45% | 0.49 / 0.71 (0.208 · 0.116) 50% | 0.47 / 0.62 (0.247 · 0.133) 59% |
| Glacis 15 | 0.67 / 0.58 (0.252 · 0.377) 38% | 0.68 / 0.61 (0.230 · 0.350) 57% | 0.63 / 0.57 (0.176 · 0.373) 60% |
| corte 15 | 0.63 / 0.24 (0.096 · 0.082) 92% | 0.66 / 0.29 (0.082 · 0.075) 91% | 0.65 / 0.24 (0.071 · 0.081) 92% |

Che cosa dicono:
- **Il muro al sole era un valore solo**: Vittoria, scarto interquartile .009 (oggi) e .008 (LUCE2): il muro arancio è fermo sul tetto del
  canale. Con luce3 .030 (×3): la luce scende verso la via e la spalla lascia i gradini. Nella corte e nella Rua lo scarto al sole scende
  (la spalla stringe i chiari): da guardare nella tavola, è una delle decisioni (§6.3).
- **Il salto luce/ombra**: LUCE2 lo aveva già ridotto (Vittoria .26 → .18, Piazza .31 → .19, Rua .28 → .24); luce3 lo tiene lì (.19, .20,
  .20). I chiari scendono di .02–.07 (la spalla), le ombre aperte restano vicine a LUCE2.
- **Nei vicoli chiusi** luce3 (in questo giro) era più scuro di LUCE2 (ombra .41 contro .49, medi 34% contro 60%): il tratteggio pieno e il
  cielo al piede. Per questo nel commit il cielo al piede è .86 e sotto le righe il fondo è più chiaro (+12% a, +17% b): il tono medio resta
  quello di LUCE2, la differenza la fa il disegno.
- **Il tratteggio di oggi** è la stessa rete su tutto quello che sta sotto .55–.70 di valore: sulla falda blu della Rua (in luce!) diagonale,
  sul suolo diagonale, sui pilastri della piazza diagonale. Con luce3 nella stessa inquadratura: la falda al sole pulita, quella in ombra
  giù per la pendenza, le colonne verticali (a) o ad anelli (b), i pilastri faccia per faccia, il suolo lungo la luce (ritagli in fondo alla
  tavola).

## 4. Il costo

Nessuna passata, nessun bersaglio, nessuna mesh in più: **i disegni sono gli stessi** (Vittoria, camera7: 793 con oggi, LUCE2, luce3=a,
luce3=b nella stessa sessione). I programmi: 218 contro 205 senza `?luce3` (le persone e i mezzi col loro define `SG_L3NO`, compilati una volta).

| dove | computer | telefono (`?leggera`) |
|---|---|---|
| materiali STANDARD, per frammento | ~+150 operazioni (la forma ~0: sostituisce le bande; cielo, rimbalzo, tono, spalla ~45; il tratteggio ~105: due famiglie di righe con le ottave, la direzione, la mano) | ~+125 (una famiglia sola) |
| materiali, letture | +4 della mappa d'ombra **solo nei pixel di penombra** (una striscia di 1-2 px lungo i bordi delle ombre) | idem |
| passo finale | +8 letture di profondità (l'occlusione) e ~50 operazioni; il tratteggio del passo E (~50 operazioni) salta con un ramo uniforme | +4 letture |

Stima sull'Iris Xe (0,73 Mpx interni, ~1,4 frammenti per pixel): ~0,15–0,25 ms nei materiali e ~0,1 ms nel passo, **~0,3 ms a fotogramma
(~2% di 16,7 ms)**; al telefono la risoluzione interna è la metà e il tratteggio ha una famiglia sola: stessa proporzione. Le misure di tempo in
questa macchina (SwiftShader, CPU condivisa con altre sonde) oscillano da 20 a 12 000 ms a fotogramma fra due giri identici: non dicono niente
e non le riporto come misura. Va provato sull'Iris Xe vero (il contatore `R.gpuTimes`) prima di farlo di serie.

## 5. L'impronta dei tasselli

`luce3.js` sta in `TASS_FUORI` (build.py) e entra nella pagina dopo render.js: **l'impronta dei tasselli non cambia** (`5a59502fb7f69218`,
quella del ramo dopo l'unione di main: LUCE2 aveva già toccato render.js; main è `d4baafed84d73da1`). I pezzi dei materiali entrano in
`THREE.ShaderChunk` (gli shader cotti nei tasselli portano gli `#include`, quindi li prendono senza ricuocere), il passo si ritocca alla
compilazione (`ShaderMaterial.prototype.onBeforeCompile`, solo per chi non ne ha uno suo). Se diventa di serie, i pezzi vanno in render.js
(`sguProPezzi`, `sguInit`) e il tratteggio del passo E si toglie: l'impronta cambia e i tasselli si ricuociono una volta.

## 6. Da decidere (il direttore)

1. **La mano: `a` «matita» o `b` «china».** a: righe leggere, verticali sui muri, l'incrocio solo al piede dei muri in ombra; b: righe più
   piene, i muri lungo i corsi (si leggono come pietra o intonaco a fasce, le colonne ad anelli), l'incrocio un poco prima. Si può anche
   tenere la luce di luce3 e scegliere la forza della riga a parte (`Luce3.V.a.tratto`).
2. **Il suolo: lungo la luce o lungo la posa.** Oggi luce3 tratteggia il suolo lungo la direzione delle ombre portate (si legge come luce).
   «Lungo la posa» vuol dire seguire le file dei basoli: la direzione della via la conosce solo lo shader dei pavimenti (pavimenti.js, cotto nei
   tasselli): serve una riga lì che la passi ai pezzi comuni, e i tasselli vanno ricotti.
3. **Quanto si sposta il valore.** La spalla dei chiari (i muri al sole −3…−7 di L, ma con dentro i gradini) e la luce che scende sul muro (×.74
   al piede) sono le due scelte più «di regia»: tenerle, o tenere solo la forma, il cielo che si vede, l'occlusione e il tratteggio. E il
   telefono: con il tratteggio (~+125 operazioni per pixel nei materiali) o senza (~+45).
