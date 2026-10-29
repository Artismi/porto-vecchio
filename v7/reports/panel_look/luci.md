# Rapporto luci (gaffer / lighting artist)

## 1. Diagnosi

**Perché alle 10:30 l'immagine sembra un tramonto.** Il colore caldo viene sommato cinque volte, in cinque punti diversi del codice:
- `SGU.momenti.mattino` (render.js 12950): il sole è `#ffd6a2`, già color pesca. La terra dell'emisferica è `#b89c74`, un marrone che rimbalza sui muri. Il bordo è `#ffe2c0`.
- Il passo finale moltiplica le luci per `luce [1.06,1,.9]` e poi ancora per `proLuce [1.05,1,.93]` (13113, applicato in `sguPasso`). Sui chiari il rosso sale di 1,11 e il blu scende a 0,84.
- `SGU.pro.vivo = .7` (13110): nel passo, il ramo «marroni» (13477) spinge tutto ciò che ha rosso > verde > blu verso `c*(1.1,.98,.8)`, quindi verso l'arancio. Poi il ramo «più colore nei medi» (13481) aggiunge un ×1,22 di saturazione.
- Il «colore pieno» `proPieno .75` (13493) satura fino a 1,75× i toni di croma media (0,12–0,45). In più ci sono `proSat 1.06` e `sat 1.05`.
- Il suolo color crema e i tetti in cotto partono già caldi. Contro questo blocco unico l'ombra blu-viola (`proTinta #6878c0`) costruisce la coppia complementare del tramonto.

**Aloni arancioni sfocati sui bordi delle ombre.** La catena è questa:
1. Nella penombra (`lights_fragment_begin`, 13234–13238) il sole caldo (pesato `sgS`) si mescola al riempimento blu (`sgP3*(1-sgOmbra)`, 13247). Il risultato è un crema spento di croma media.
2. Quella fascia è proprio il bersaglio di `vivo` (i marroni portati verso l'ocra) e di `pieno` (croma 0,12–0,45). Così la penombra diventa la parte più satura dell'immagine: è un arancio che nella scena non esiste.
3. `NIT.chiarezza .35` (13406) usa una croce di 5 px: sul lato in luce del bordo alza il valore fino a 0,12 e moltiplica l'RGB, quindi la croma sale con il valore. Ne esce un alone chiaro di 5–10 px.
4. Il fuoco per profondità (`NIT.fuoco .85`, `raggio 2.6`, 8 campioni) e il velo dei tetti (`nTet*.55`) spalmano quell'alone, che diventa «sporco».

La mappa d'ombra non c'entra: `PCFSoftShadowMap` (16698) con il texel di circa 6 cm dà un bordo netto. Lo aggrava di poco `sgS` portato a celle (`smoothstep(.35,.65)` con `celle .75`).

**Volumi poco leggibili, suolo che non si stacca.** Le cause sono tre:
- Il rapporto luce/ombra è circa 1,08 : (0,58 cielo + 0,24 tinta). È basso, e tutto sta sulla stessa temperatura calda.
- La luce di bordo (13338: `frS³·2.4·ambientLightColor`, con `fillAmb = bordoK .1`) dall'alto vale circa 0,05 dell'albedo, ed è calda come tutto il resto. Non stacca niente.
- La spalla della curva (`CustomToneMapping`, 13319) piega già da 0,6. Il suolo crema (circa 0,8) e i tetti finiscono schiacciati sullo stesso valore chiaro.

## 2. Proposte, in ordine di impatto

**A. Spegnere il doppio caldo e la saturazione della penombra:**
- `SGU.pro.vivo` da .7 a **.3**.
- Nel ramo «marroni» (13477) la soglia di croma va da `smoothstep(.04,.12,ch)` a **`smoothstep(.10,.20,ch)`**, così la penombra resta fuori.
- `proPieno` a **.4** in tutti i momenti; `SGU.pieno` a .3.
- `proLuce` a **[1.0, 1.0, .98]** di giorno, così il caldo vive solo nel colore del sole.

**B. Aloni:**
- `NIT.chiarezza` a **.18**. Nello shader: croce `e*3.` al posto di `e*5.`, clamp `±.06`, e applicarla solo alla luminanza (`c += (lc'-lc)`, non `c *=`).
- `NIT.fuoco` a **.6**, `NIT.raggio` a **1.8**.
- `SGU.pro.celle` a **.5**.

**C. I quattro momenti.** Il giorno resta neutro e luminoso; il rosa resta alla sera.

| momento | sole / K | cielo / terra / K | bordo / K | nebbia | esp | ombra · luce | sat · contr · vign | proTinta / K |
|---|---|---|---|---|---|---|---|---|
| mattino | `#fff1de` 1.15 | `#a9c6ec` / `#8f8a80` .64 | `#cfe0f4` .22 | `#d4dde6` | .93 | [.94,.98,1.08] · [1.02,1,.97] | 1.0 · 1.1 · .16 | `#7d90c8` .30 |
| pomeriggio | `#fff6ea` 1.18 | `#b6cdea` / `#948c80` .60 | `#d8e6f6` .22 | `#d8e0e8` | .92 | [.95,.98,1.07] · [1.02,1,.97] | 1.02 · 1.1 · .16 | `#8090c4` .28 |
| sera | `#ffa070` 1.0 | `#8c8cc8` / `#a07a70` .62 | `#ff9ec0` .24 | `#c8909c` | 1.0 | [.88,.9,1.16] · [1.08,.99,.9] | 1.08 · 1.1 · .26 | `#6a4aa8` .30 |
| notte | `#9ab0f0` .30 | `#26346a` / `#1a1a2e` .34 | `#5ec8e8` .22 | `#0e1630` | 1.0 | [.86,.92,1.18] · [1.06,1,.9] | 1.08 · 1.12 · .30 | `#4a46a0` .40 |

- `ore`: il pomeriggio deve tenere fino a 17,2. Il piano diventa `[16.4,'pomeriggio']` → **`[17.2,'pomeriggio']`**, la sera parte da **18.6**. Così il caldo arriva solo all'ora giusta.
- Di notte i lampioni restano al sodio (`#ffb35c`). Il bordo ciano della luna e i neon magenta-ciano fanno il contrasto Vice City. `proEsp` da 1.3 a **1.2**, perché il nero tra le pozze di luce serve.

**D. Il bordo che stacca i volumi.** Il bordo diventa freddo (colori sopra) e a **K .22**. Dall'alto il suolo ha `frS≈0` e non lo prende, mentre i muri sì: il muro si separa dal suolo. `SGU.bordo` resta 2.4. Il riempimento (`ombre` della proposta) va da .7 a **.85**: le ombre si leggono come cielo, non come buco.

**E. Il sole.** `PROF.soleAlto` da [18,36] a **[22,42]**: ombre più corte, che non coprono metà via, e tetti più leggibili. `soleLato` resta com'è. `PROF.rimbalzoTinta` va a **[1,.95,.86]**, se è attivo nel look nuovo.

**F. Esposizione e curva.**
- La spalla di `CustomToneMapping` passa da `.6/.4/2.5` a **`.7/.3/3.3`**, cioè `min(x,.7)+.3*(1-exp(-e*3.3))`, per tenere separati il suolo chiaro e i tetti.
- Valori di riferimento a mezzogiorno: suolo in luce L ≈ 0,62, muri in ombra ≈ 0,28, tetti ≈ 0,55 (desaturati da `NIT.tetti`).

## 3. Cosa chiedo agli altri cinque

- **Cineasta:** tenere `NIT.fuoco` basso. Il fuoco deve guidare lo sguardo con il valore (la luce sul personaggio, `NIT.luce .1`), non con la sfocatura, che sporca i bordi. Pitch e fov fissi per momento: niente salti mentre cambia la luce.
- **Scenografo:** suolo in pietra grigio-fredda (ardesia, `#a8a49c`), muri pastello caldi, tetti meno arancio (cotto spento `#b07a5c`). È la separazione di temperatura su cui si appoggia il bordo freddo.
- **Fotografo:** un solo grading. Il caldo sta nel sole, non in `luce`, `proLuce` e `vivo` messi insieme. Tenere `proPieno` e `vivo` bassi, misurare la croma della penombra (deve restare sotto 0,12) e controllare istogrammi ed esposizioni con i riferimenti sopra.
- **Illustratore:** niente ombre né arancio dipinti nelle texture; albedo a valore medio (0,45–0,7). Le chiazze `Ombra4` sotto gli alberi tinte con `proTinta`, non verdi né nere.
- **Animatore:** il personaggio stacca con il bordo freddo e l'ombra a disco `#1a1020` opacità .55. Le transizioni dell'ora restano morbide (rampe da almeno 1,5 h). Lampioni e neon con uno sfarfallio leggero e raro, mai sincronizzato.
