# Tecnico luci: la pellicola di strada portata alla perfezione

Ho guardato tutte e sei le foto. I valori sono campionati su 7×7 px.

## 1. Cosa va protetto
- **Il sole caldo e direzionale con l'ombra che ha un colore** (`proTinta`, il riempimento `sgP3*(1-sgOmbra)`). Al Corso (10) e sulla Vittoria (07) l'ombra si legge come forma grafica e non come buco. Il lastricato al sole resta crema (`#c9b79b`) e non diventa bianco.
- **La curva sul canale più alto** (`CustomToneMapping` con `LOOK`). Il rosso non brucia: zero bianchi pieni in quasi tutte le foto.
- **Le pozze calde della sera** in 18 (la via a destra, `#a56442`), cioè la luce cotta del terreno con le porte che si accendono.
- **Le celle** (`celle .6`): tre gradini morbidi. È già metà della firma.

## 2. I difetti
1. **L'ombra di giorno è blu-acciaio e morta**: `#273149` nella Rua (21) e `#283245` nel vicolo (02). I quasi-neri sono all'11% in 21. È un cobalto da istituzione, senza nessun rimbalzo del sole dentro. Il caruggio intero è una lastra d'ombra perché il sole delle 10:30 corre quasi parallelo alle vie: l'azimut passa per gli assi della griglia (`soleLato [-35,-125]` attorno a π/4).
2. **La sera è una seppia piatta** (18): saturazione .669, contrasto .152, tetti `#662c17` e `#8f301c`. Sole, terra (`#a8826a`), bordo (`#ffbc88`) e nebbia sono tutti caldi, e nulla di freddo li fa cantare. Alle 20:27 la regia dice notte .82 (le lampade sono accese), ma `SGU.ore` tiene la sera fino alle 20.4: lampioni accesi dentro un tramonto pieno.
3. **La notte è grigio-viola uniforme** (19): luminosità .217, contrasto .131. Tetti `#353850` e strada `#131f47` hanno lo stesso peso. Le pozze dei lampioni e dei fari sono grigio-bianche e sfaccettate (`#43495e`): sembrano riflettori da piazzale. È il fotogramma più «Grande Fratello» del set.
4. **La pozza sul personaggio** (`NIT.luce`, `cerchio`) al Corso spinge il lastricato a `#ffedc2`, al limite del bianco. In 07 il disco chiaro sotto i piedi si legge come occhio di bue.
5. **Il fish-eye si vede come effetto**: le bande del letterbox sono calcolate su `vUv` deformato, quindi si curvano (21, sopra e sotto). La mira non è corretta. Ho calcolato lo scarto: `q0·gonfio·(1−r²)` arriva a **~13 px a 1024 di larghezza e ~24 px a 1920**, più dei 10 px stimati.
6. Di notte le macchie scure sui tetti diventano buchi neri (19, sui terrazzi a sinistra).

## 3. Le proposte, per impatto
**A. Ombra ricca (giorno), costo zero.** Mattino e pomeriggio: `proTinta '#4b4fc4'`, `proTintaK .24` (oltremare-viola Kodachrome al posto dell'acciaio). Obiettivo misurabile: il suolo in ombra a mezzogiorno attorno a `#3c4068` (luma ≥ .24) e i quasi-neri sotto il 3%.

**B. Lo sbieco della luce.** `PROF.soleLato [-68,-112]` e `soleAlto [22,40]`: il sole resta sempre a 25–65° dalla griglia, quindi le ombre tagliano le vie in diagonale e non le riempiono mai per intero. Il muro al sole c'è sempre. Costo zero.

**C. I pezzi di shader (la firma della luce)**, in `sguProPezzi`, solo `STANDARD`:
- *Il bordo dell'ombra a pennarello*: in `lights_fragment_begin`, dopo `sgS`, `sgEd = max(sgEd, 4.*sgS*(1.-sgS))`. In `lights_fragment_end`: `directDiffuse *= 1.-.18*sgEd; indirectDiffuse += diffuseColor.rgb*sgP3.rgb*sgEd*.8`. La penombra diventa un filo di cobalto più saturo, la «linea» dell'ombra portata, come nei fumetti. Sta nello spazio della mappa d'ombra, quindi non striscia sullo schermo. Va tenuto spento finché il riquadro dell'ombra non è agganciato al texel. Costo ~6 ALU/pixel, uguale sul telefono.
- *Il sole dentro l'ombra*: `indirectDiffuse += diffuseColor.rgb*directionalLights[0].color*(1.-sgOmbra)*.09*(1.-.5*abs(sgNw.y))`, un rimbalzo caldo sotto il cobalto. Le facce in piedi lo prendono di più. Con A, l'ombra diventa blu con il caldo dentro, mai grigia. Costo ~4 ALU.
- *Il bordo dell'ora sulle figure*, con le manopole che esistono già: giorno `bordo '#fff0dc' .12`, sera `'#ff7eb0' .22`, notte `'#3fb8e0' .22`. Il rosa e il ciano alla Vice City staccano la gente. Costo zero.

**D. Sera da *Do the Right Thing*.** Nel `PELL.sera`: `sole '#ff9a50' soleK 1.12, cielo '#7a7ed0' cieloK .7, terra '#7a5a78', nebbia '#c08ca8', ombra [.86,.88,1.16], sat 1.0, contrasto 1.18, proTinta '#5a3ab0' K .3`. Arancio sui muri, magenta-viola nelle ombre. Ore: `[19,'sera'],[20,'sera'],[21.2,'notte']`, così le lampade e il set di luce si accendono insieme. Obiettivo: saturazione media ≤ .5, contrasto ≥ .2.

**E. Notte di neon, non di sorveglianza.** `notte: soleK .24, cielo '#283070' cieloK .3, terra '#3a2028'` (rimbalzo vinaccia dei lampioni), `contrasto 1.18, proEsp 1.15`. Lampioni al sodio `LAMPS '#ff9a3c'`, intensità ×1.3. Pozza dei fari `'#ffe2a8'` (non `#fff0c0`). Ombre delle luci puntiformi `shadow.radius 2.5` per togliere le sfaccettature. Neon dalla tavolozza hip hop: magenta `#ff2fa0`, verde acido `#9bff2e`, ciano `#2fe6ff`, arancio `#ff7a1a`, giallo `#ffd21a`. Le luci emissive vanno escluse dalla spalla (`nS`), perché tengano il colore. `NIT.tetti` va da .35 di giorno a .6 di notte: i tetti scendono e la gerarchia la fanno le luci. Obiettivo: contrasto ≥ .2 e pozze con croma ≥ .4.

**F. Fish-eye pulito.** Nel passo: `b` e la vignetta su `vUv0`, non su `vUv`. Per la mira basta la stessa formula in avanti sul cursore: `u = .5 + q0*(1.-g*(1.-r2))` prima di `setFromCamera` (render.js 4388, writing.js 1487/1668/1729), con lo stesso aspetto. Non serve invertire nulla e il costo è zero. `gonfio` può restare .055.

**G. La pozza sul personaggio:** `NIT.luce .06` di giorno e `cerchio .8`, moltiplicata per `1.-smoothstep(.6,.9,l)` così non apre i chiari. Il disco chiaro sotto i piedi diventa scuro e caldo (`#2a1820`).

**Le quattro leve, nel mio campo:**
- **Fish-eye**: si può tenere com'è, con il fix F.
- **Sbieco**: il sole in diagonale (B) e le teste dei lampioni inclinate di 3–6°, così le pozze diventano ellissi fuori asse.
- **Rigonfiamento**: l'ombra al piede più pesante e calda (`NIT.piede .6→.75`, tinta `#3a2a30`).
- **Tratto**: il bordo dell'ombra a pennarello (C).

**Conflitto**: la luce del regime è bianca-fredda e dura (riflettori e neon della caserma `#e8f0ff`, ombre nette). Quella della strada è sodio e neon colorati, morbida. Di giorno il sole è uguale per tutti: un solo film.

## 4. Cosa chiedo agli altri cinque
- **Fotografo**: niente desaturazione globale per correggere la sera (D basta). Accordiamo insieme i valori obiettivo.
- **Illustratore**: un tratto più spesso sul lato in ombra (peso × (1+.8·(1−luma))), coerente con il bordo dell'ombra.
- **Scenografo**: insegne al neon e saracinesche dipinte dove cadono le pozze; le macchie sui tetti più chiare di notte.
- **Cineasta**: il letterbox su `vUv0` e la camera inclinata solo nella strada, mai nel regime.
- **Animatore**: il bordo dell'ora sui personaggi (skinned) va verificato e non spento.

## Riassunto
1. Da proteggere: sole caldo, ombra colorata, curva sul canale più alto, celle, pozze calde della sera.
2. Ombra di giorno: da blu-acciaio `#273149` a oltremare-viola `#4b4fc4` con rimbalzo caldo dentro, e il sole sempre in diagonale alle vie (`soleLato [-68,-112]`).
3. Firma della luce: il bordo dell'ombra a pennarello cobalto, il sole dentro l'ombra e il bordo dell'ora (crema, rosa, ciano); ~10 ALU a pixel.
4. Sera magenta e arancio sincronizzata con le lampade; notte di sodio e neon hip hop (non di riflettori grigi), contrasto ≥ .2.
5. Fish-eye: letterbox su `vUv0` e mira corretta applicando la stessa formula al cursore (scarto oggi fino a ~24 px a 1920).
