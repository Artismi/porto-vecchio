# Fotografo e color grading: la pellicola di strada, finita

Le misure sono state fatte con PIL sulle sei foto (1024×640, bande escluse). Lo script è in `scratchpad/panel2/misura.py`.

| | rua | corso | vittoria | vicolo | sera | notte |
|---|---|---|---|---|---|---|
| tinte dei pixel saturi: arancio / blu / rosso+giallo+verde | 59/34/6 | 56/17/25 | 81/10/9 | 81/13/5 | 74/1/25 | 3/90/2 |
| Y p2 (il nero) | .025 | .099 | .089 | .075 | .154 | .015 |
| luci: rapporto B/R | .71 | .74 | .71 | .66 | .46 | .65 |
| nitidezza al centro / ai bordi | .21/.42 | .32/.32 | .38/.51 | .25/.32 | .23/.19 | .24/.27 |

## 1. Cosa va protetto
- **Le ombre colorate di giorno.** Nella rua l'ombra misura (.14,.14,.17): ha un colore, non è grigia. Va tenuta così.
- **Le alte luci.** I pixel bruciati stanno fra lo 0,4% e il 4% e la spalla sul canale massimo funziona. Non va toccata.
- **Il colore sulle cose di strada.** Il bus giallo, le persiane verdi e le tende a righe hanno già il carattere di Shabazz.
- **La grana di base.** Il dither a 1/255 fa il suo lavoro: non si vedono bande negli 8 bit.

## 2. I difetti
1. **Tutto è arancio, mancano i colori hip hop.** Fra i pixel saturi l'arancio pesa dal 56 all'81%, il giallo puro sta allo 0–1% e il rosso al 2–5%. Ne esce un teal-orange da poster, non un block party.
2. **Le luci sono ocra, non crema.** Il rapporto B/R delle luci va da .66 a .74: l'intonaco chiaro esce color sabbia.
3. **La sera è una sola tinta.** Il 72% dei pixel ha S>.6, il rosso brucia per il 9,8%, il nero sta a .154 e i neutri sono a zero. Sembra un viraggio seppia, non un tramonto.
4. **La notte è cobalto e cemento.** Il blu è il 90% dei pixel saturi, i tetti sono grigio-ardesia e le pozze dei lampioni sono ellissi grigie dal bordo netto. Si leggono come fari: è Grande Fratello puro. Sui tetti ci sono macchie nere che sembrano buchi.
5. **Di giorno i neri non sono pieni.** Nel corso, nella vittoria e nel vicolo Y p2 sta fra .075 e .099: il brief chiede neri pieni.
6. **Il centro è più morbido dei bordi** (5 foto su 6). Il gonfio ingrandisce il centro di 1/(1−.055), cioè del 5,8%, con il bilineare. La sfocatura cade proprio sul personaggio.
7. **Le bande nere sono curve** (rua, in alto). Vengono lette con la `vUv` deformata invece che con `vUv0`.
8. **Le lastre vuote.** Nel vicolo, alla sera e nella rua il 25–40% del quadro è un tetto piatto vicino alla camera, schiarito e spianato dalle regole tetti e calma di `NIT`. È un vuoto ordinato.
9. **Il rumore dei coppi.** Nella vittoria e nella notte il p25 della deviazione standard dei blocchi vale .020, contro .002 delle altre foto: in movimento i coppi sfarfallano.

## 3. Le proposte, in ordine di impatto
**A. La tavolozza hip hop come accenti.** Questi colori vanno nei materiali, non nel grading:
- rosso `#D7262E`: saracinesche, insegne, giacche;
- giallo `#F5C518`: taxi, cartelli, riempimenti dei writing;
- blu reale `#2148B8`: tute, portoni, saracinesche;
- verde `#1E8A4A`: chioschi, persiane;
- nero `#141414` e bianco `#F2EFE8`: scarpe, tute, strisce;
- oro `#C9A13A`: catene, insegne dei bar;
- mattone `#B5553A`;
- fluo, solo nei contorni dei writing e nei lacci e ≤1% del quadro: magenta `#FF2E88`, verde acido `#9BEA2A`, arancio `#FF7A1A`.

La regola si può misurare: di giorno l'arancio sta sotto il 55% dei pixel saturi, rosso+giallo+blu+verde sopra il 20%, e i pixel con S>.6 restano sotto il 12%. Gli accenti sono pochi e messi al posto giusto.

**B. Le luci crema.** In PELL `luce` passa da [1.03,1,.96] a [1.02,1,.985]. Nel ramo SG_STR la riga delle luci crema passa da `vec3(1.02,1.,.95)` a `vec3(1.015,1.,.98)`. Il bersaglio è B/R ≥ .84, con l'intonaco chiaro vicino a `#F2E8D6`. Costo zero.

**C. La sera a due colori.** I valori:
- `sole` `#ffb47a`, `soleK` 1.0;
- `sat` .98;
- `ombra` [.86,.9,1.18];
- `proNeri` .05.

Il bersaglio è il rosso bruciato sotto il 2%, S>.6 sotto il 35%, almeno il 10% dei pixel saturi nel blu e p2 ≤ .06. Così il tramonto è arancio sui muri e lilla-cobalto nelle ombre.

**D. La notte al sodio e al neon.** `proTintaK` passa da .26 a .18 e `cielo` da `#2c3a62` a `#2a3360`. Le pozze dei lampioni diventano `#FFB45A`. Il bersaglio è il blu sotto il 65% dei pixel saturi e il sodio sopra il 20%.

**E. I neri pieni di giorno.** `proNeri` del mattino e del pomeriggio passa da .03 a .045. Il bersaglio è p2 ≤ .05. Il nero caldo `+vec3(.012,.005,0)` resta.

**F. Il fish-eye.** `PELL.gonfio` passa da .055 a .04. Lo scarto massimo, calcolato, scende da 12,8 a 9,3 px su 1024. Poi va corretta la mira: il pixel che si vede in s viene da f(s). In `screenToGround` e alla riga 4388, prima di `setFromCamera`, si applica a (nx,ny) la stessa f dello shader (3 righe di JS) e lo scarto diventa zero. Per le icone proiettate dal mondo serve f⁻¹, con 2 passi di Newton. Per il centro morbido: `shp *= 1. + 2.5*gS.x*(1.-r2)`. Le bande e la vignetta si leggono con `vUv0`. Costo nullo.

**G. La firma dello shader: la grana d'emulsione** (in `sguInit`, dopo i neri):
```glsl
vec2 gp = floor(gl_FragCoord.xy / max(1., src.y/720.));   // il granello sta fermo alla risoluzione
float gh = fract(sin(dot(gp + floor(tm*12.)*vec2(7.,13.), vec2(12.9898,78.233)))*43758.5453) - .5;
float lg = dot(c, vec3(.299,.587,.114)), ga = gS.z * 4. * lg * (1. - lg);   // la grana sta nei medi, quasi niente nei neri e nei bianchi
c += ga * gh * vec3(1.06, 1., .92);
```
`gS.z` vale .022 sul computer e .014 sul telefono. Il granello cambia 12 volte al secondo, come la pellicola: niente sfarfallio a 60 Hz. Il costo è di circa 8 operazioni per pixel.

**H. Le lastre.** Nella riga dei tetti di `SG_NIT`, `lt*.9+.08` diventa `lt*.95+.03` e il colore passa da `.38` a `.6`. `mix(1.,1.3,nTet)` della calma diventa `1.`. I tetti tengono la loro trama e il loro colore.

**Le quattro leve.**
- **Fish-eye**: come in F.
- **Sbieco**: le bande e la vignetta in spazio schermo, così una camera inclinata di ±0,6° non le fa ruotare.
- **Rigonfiamento**: protegge il piede scuro dei muri (`NIT.piede` .6).
- **Tratto**: in `sgInk` la linea diventa `c*.32` con la saturazione ×1.25 al posto del viola fisso. Il pennarello prende il colore della cosa che contorna.

Il regime: i suoi materiali prendono S ≤ .12 e il valore `#B8B4AA`. Grigio solo lì, mai nel filtro.

## 4. Cosa chiedo agli altri
- **Luci**: pozze al sodio dal bordo morbido (smoothstep su ≥40% del raggio) e un riempimento cobalto alla sera.
- **Illustratore**: la tavolozza A nei materiali; lo sporco dei tetti non sotto ×.75; i coppi con meno contrasto fine.
- **Scenografo**: gli accenti primari ogni 15–20 m di strada (saracinesche, chioschi, writing); il fluo solo nei pezzi dipinti.
- **Cineasta**: una camera che non metta un tetto vicino oltre il 25% del quadro; l'inclinazione rara e ≤ .6°.
- **Animatore**: giacche e tute nei primari A, le scarpe bianche `#F2EFE8`, l'oro solo sulle catene.

## Riassunto
1. Il look regge (ombre colorate, alte luci tenute), ma è tutto arancio: fra il 56 e l'81% dei pixel saturi, con il giallo e il rosso quasi assenti.
2. La tavolozza hip hop va nei materiali come accenti misurati: rosso `#D7262E`, giallo `#F5C518`, blu `#2148B8`, verde `#1E8A4A`, fluo ≤1%.
3. Luci crema (B/R ≥ .84), neri pieni di giorno (p2 ≤ .05), una sera a due colori, una notte al sodio invece che al cobalto.
4. Fish-eye a .04 con la mira corretta dalla stessa f (scarto zero), bande e vignetta in `vUv0`, il centro di nuovo nitido.
5. La firma: una grana d'emulsione a 12 fps nei medi, quasi gratis. In più tetti con trama e una linea a pennarello del colore della cosa.
