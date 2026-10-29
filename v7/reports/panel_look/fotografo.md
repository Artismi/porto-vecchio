# Fotografo / color grading: l'immagine finale

## 1. Diagnosi (misure su 1280×800, ore 10:30, senza le bande nere)

| | marina prima → dopo | corso prima → dopo | rua dopo |
|---|---|---|---|
| canale R ≥ .98 (bruciato) | 26,7% → **16,5%** | 39,5% → **20,2%** | 13,1% |
| pixel arancio+giallo (15–65°, S>.15) | 68% → **64%** | 80% → **78%** | 49% |
| S media degli aranci | .79 → .64 | .76 → .61 | .77 |
| pixel neutri (S<.15) | 20% → 24% | 11% → 11% | 18% |
| luci (Y>.8): RGB medio | — → (.99,.85,.56) | — → (1.0,.85,.54) | (1.0,.89,.44) |
| nitidezza ai bordi / al centro (p95 del gradiente) | .66 → **.59** | .80 → .84 | — |

Cosa dicono i numeri:
- **Non esiste il bianco.** Il 2% più chiaro ha B/R = .55: l'intonaco crema esce ocra. Il rosso arriva a 1 prima degli altri canali e la tinta scivola verso l'arancio. È questo il «tutto arancio», più dei materiali.
- **La causa sta nella catena, non in un solo valore.** In `sguPasso` si moltiplicano: `luce` [1.04,1.01,.94] × `proLuce` [1.04,1,.94] (il rosso sale dell'8%, il blu scende del 12%), `contrasto` 1.1 × `proContrasto` 1.07 applicato come rapporto di luma su tutti e tre i canali (il rosso esce dal tetto), poi `sv = sat·(1+pieno·…)` con `proPieno` .75: **sui toni già colorati la saturazione arriva a ≈1,95×**. A questo si aggiunge `pro.vivo` .7, che spinge i marroni verso il cotto con `c*vec3(1.1,.98,.8)` e scalda anche i grigi. Sono cinque spinte, tutte verso l'arancio.
- **I complementari sono entrambi al massimo.** Il blu delle ombre ha S .51–.60 (`proTinta` #7080c4 × .22 più `ombra` B 1.1×1.1). L'arancio ha S .61–.64. Insieme danno il «poster», non il cinema.
- **La «bassa qualità» viene in buona parte dalle sfocature.** Ai bordi la nitidezza è il 40–50% di quella al centro (fuoco .85, vicino .55, `nTet*.55` sui tetti, calma del suolo). Sui tetti si aggiungono un terzo del colore e valori compressi, e il risultato è impastato. Le sfocature allo schermo si leggono come risoluzione bassa, non come profondità di campo. Il rumore fine in piano sale (std dei blocchi p25 da 2,5 a 3,9 sulla marina): ne è responsabile la micro-normale `pro.grana` .45.

## 2. Proposte, in ordine di impatto

**A. Un solo grading, senza moltiplicatori doppi.** Mettere `proOmbra`, `proLuce` = [1,1,1], `proSat`, `proContrasto` = 1 e lasciare i valori solo nel set base (sotto). `SGU.pieno` .35 → .15 e `proPieno` → .15. `pro.vivo` .7 → .2, e nel ramo dei marroni sostituire `c*vec3(1.1,.98,.8)+vec3(.012,.004,0)` con `c*vec3(1.02,1.,.96)`.

**B. Una spalla che conserva la tinta** (`CustomToneMapping`). Il piede resta com'è; la spalla si calcola sul canale massimo e si scala l'intero colore:
```glsl
vec3 x = max(color*toneMappingExposure,0.); x = x*(x+.011)/(x+.022);
float m = max(x.r,max(x.g,x.b)), e = max(m-.55,0.), mm = min(m,.55) + .41*(1.-exp(-e/.41));
vec3 y = x*(mm/max(m,1e-4)); return mix(y, vec3(mm), .25*smoothstep(.7,.96,mm)); // le luci piene virano al bianco
```
Bersaglio: canale R ≥ .98 sotto l'1%; il 2% più chiaro con B/R ≥ .88 (intonaco chiaro ≈ #F4EDE0).

**C. Saturazione per tinta** nel passo, al posto di `sv`: tinta h da `c` (rgb→hsv, una decina di operazioni, va bene in mediump), poi `sv = gK.x * f(h)` con
- rosso 345–15°: ×0,95
- arancio/cotto 15–45°: **×0,78**, e con l>.55 croma massimo S ≤ .55
- giallo/ocra 45–65°: ×0,82
- verdi 65–170°: ×0,85
- ciano/blu 170–250°: ×0,95, ma nelle ombre (l<.35) S ≤ .35
- viola/rosa 250–345°: **×1,08** (insegne, tramonto, Vice City)

Interpolare con smoothstep di 8° ai confini. Bersagli a 10:30: arancio+giallo ≤ 45% dei pixel, S media degli aranci ≤ .48, neutri ≥ 30%.

**D. La look-up dei quattro momenti** (valori finali da scrivere in `SGU.momenti`, con i pro* neutri):

| | esp | contrasto | sat | ombra | luce | proTinta / K | neri | vign | NIT.spalla |
|---|---|---|---|---|---|---|---|---|---|
| mattino | .92 | 1.06 | .98 | [.95,.98,1.06] | [1.03,1.0,.96] | #7488a8 / .12 | .02 | .16 | .45 |
| pomeriggio | .88 | 1.08 | .96 | [.96,.98,1.05] | [1.02,1.0,.97] | #7a8aa6 / .10 | .018 | .14 | .5 |
| sera | 1.0 | 1.10 | 1.04 | [.90,.92,1.12] | [1.08,.99,.88] | #5e5490 / .20 | .03 | .26 | .35 |
| notte | 1.0 (proEsp 1.2) | 1.10 | .95 | [.90,.95,1.15] | [1.10,1.0,.85] | #3c4a86 / .30 | .025 | .32 | .3 |

Il pivot del contrasto passa da .42 a .45. Il viraggio caldo/freddo si riserva alla sera; di giorno i complementari sono un accento, non la base.

**E. Nitidezza.** NIT: `fuoco` .85 → .35, `vicino` .55 → .2, `raggio` 2.6 → 1.6, in `sguInit` `nTet*.55` → `nTet*.2`, `calma` .7 → .45 (la calma resta, la sfocatura no), `chiarezza` .35 → .22. Lo sharpen va fatto solo sulla luma, con un tetto: `d = clamp(dot(c - n4*.25, vec3(.299,.587,.114))*shp, -.05, .05); c += d;`. Così niente aloni colorati e `SGU.nitido` può salire da .32 a .5, e a .3 con RES < .99. `pro.grana` .45 → .12, perché in movimento sfarfalla. Niente grana di pellicola: il dither 1/255 basta. Sul computer `setRes` minimo da .8 a .85. Sul telefono il passo è già senza MSAA: lasciare `nitido` a .25, perché lì lo sharpen amplifica le scalette.

## 3. Cosa chiedo agli altri

- **Scenografo:** i tetti escono dal solo cotto. 55% cotto spento (#A8664A, S ≤ .5), 25% ardesia (#6E747C), 20% coppi chiari o terrazze (#CDBBA6). Gli intonaci comprendono anche bianchi e freddi (#EDEBE4, #D3E2E4, #E8CBD0). Tra suolo e facciate serve una differenza di luma ≥ .15: strada #5E6066, lastricato #B7AE9E.
- **Tecnico luci:** il freddo delle ombre deve venire dalla luce, non dal grading. Pomeriggio: `sole` #fff0da → #fff5ea, `cieloK` .54 → .62, `terra` #b29470 → #9a9282 (il rimbalzo oggi è arancio). Esposizione regolata su un intonaco bianco a Y ≈ .9.
- **Cineasta:** un solo fuoco, quello del personaggio, e niente tilt-shift (la miniatura resta a 0). Le vignette sommate (fissa più quella che segue il personaggio) non devono superare un calo del 18% agli angoli.
- **Illustratore:** la tavolozza va contata in tinte: il rosa/teal saturo si riserva alle cose interattive e ai neon, al massimo il 5% dello schermo. Nessun materiale base sopra S .6.
- **Animatore:** niente che sfarfalli sotto il pixel (micro-normale, fili, ringhiere sottili più sottili di 1,5 px a 1080 righe). Il personaggio stacca per valore (contorno chiaro), non per saturazione.
