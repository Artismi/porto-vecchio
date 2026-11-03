# Il cineasta: inquadratura, camera, profondità, sguardo, movimento

## 1. Cosa c'è già di buono (da proteggere)
- **La luce che disegna lo spazio.** In 10_corso e 21_varco_rua il sole radente e le ombre cobalto lunghe danno la profondità da sole: la diagonale d'ombra sulla piazza del 10 è già una linea guida. Non toccare la direzione del sole.
- **La lente con un carattere.** Il `PELL.gonfio` .055 al centro non si nota e ai bordi dà il respiro del grandangolo. È la base giusta.
- **La camera è calma.** `CAMERA4.tau` .26, `resta` 2.05 e la scossa a due seni (13 e 19 Hz) non si notano. Il movimento è già da film.
- **La sera (18).** La luce calda è un'unica emulsione con il giorno: lo stesso film.

## 2. I difetti, foto per foto
1. **Il personaggio è coperto o perso.** Nel 21, nel 02 e nel 18 è nascosto sotto un tetto vicino e si vede la sagoma arancio in trasparenza. È il linguaggio della telecamera termica, cioè Grande Fratello puro. Nel 10, nel 07 e nel 19, quando si vede, è alto 12-16 px su 640.
2. **Il primo piano è una lastra.** Nel 02 (45% del quadro), nel 18 (70%) e nel 10 (35%) i tetti sotto la camera sono campiture piatte color beige o grigio, sfocate e senza segni. La vita (il bar, la gente e il bucato del 18) finisce schiacciata in una striscia sul bordo destro.
3. **L'asse da telecamera di controllo.** Nel 07 e nel 19 la via è una colonna perfettamente verticale e simmetrica, con il personaggio al centro esatto e un'auto della polizia sull'asse. È l'inquadratura di una telecamera di sorveglianza. Di notte i coni dei lampioni sono poligoni chiari con il bordo duro, come fari di perlustrazione.
4. **La lente sbaglia due volte.** Nel 21 le bande nere si curvano, perché sono disegnate con `vUv` deformato e non con `vUv0`. La mira è spostata: con la formula attuale lo scarto vale `g·q·(1−r²)` e ha il massimo a q≈.34. Fa **0,0125 × larghezza**, cioè 13 px a 1024 e 24 px a 1920. Oggi né `screenToGround` (render.js:18309), né `project` (18306), né il raggio di `BMB` (4388) lo compensano.
5. **La notte (19) è grigia.** Tetti color piombo e macchie scure sui lastrici che si leggono come buchi. Su questo l'intervento spetta agli altri, ma l'inquadratura lo peggiora, perché il 65% del quadro è tetto.

## 3. Proposte, in ordine di impatto
**A. Il taglio del primo piano invece della sagoma in trasparenza** (in `sguPezzi`, su tutti i materiali STANDARD dei tetti e dei muri alti).
Funziona così: se un frammento sta più vicino alla camera del personaggio (`zView < zPers − 1.5 m`), sopra la sua quota più 2,2 m e dentro un'ellisse a schermo attorno al personaggio, viene scartato con un retino Bayer 4×4. Le misure: semiasse 0,16·H, bordo morbido di 0,05·H, apertura in 0,3 s con la curva di `TETTO4.apri`. Non usa trasparenza, quindi non c'è ordinamento e non ci sono aloni. In più servono un uniform vec4 (centro, raggio, quota) e 6-8 operazioni per pixel: costo trascurabile anche sul telefono. La sagoma arancio resta solo come riserva, per coperture sotto 0,3 s. Regola: **personaggio mai coperto per più di 0,3 s**.

**B. La pendenza e la scala.** `CAMERA4.max` passa da 1.08 a **1.00** e `stretta` da .98 a **.92**. La camera più bassa copre di più, quindi va attivata solo insieme ad A. `CAMERA4.zoom` passa da .9 a **.85** nei vicoli. Regole: tetti al massimo il **45%** del quadro, facciate più suolo percorribile almeno il **30%**, personaggio alto almeno **24 px su 640 righe**, a piedi al **40% dal basso**, con lo spazio davanti nella direzione di marcia.

**C. Lo sbieco della camera, che racconta il conflitto.** Dopo `camera.lookAt` (render.js ~18178) e prima dell'aggancio ai pixel si aggiunge `camera.rotateZ(roll)`. Il raycast lo eredita da solo e il costo è zero.
- **Strada e caruggi:** il rollio deriva fra ±0,9° con un periodo di 25 s e τ = 2 s.
- **Skate e BMX:** fino a 2,5° nelle curve, proporzionale all'accelerazione laterale.
- **Zone del regime** (Via della Vittoria, piazze di regime) e dialoghi con le autorità: rollio esattamente **0** e asse dritto. Qui la simmetria del 07 è voluta e diventa la sua firma.
- **Altrove:** quando la camera segue la via (`IQ5`), la via non va tenuta a piombo. Serve uno scarto di **0,2 rad** verso il lato del sole, così la via diventa una diagonale che entra dal basso.

**D. La lente: tarata e precisa.**
- Una funzione `gonfiaUV(nx, ny)` replica in JS la mappatura dello shader: `s = 1 − g·(1 − r²)` con lo stesso r² normalizzato sull'aspetto. Si usa in `screenToGround` e nel raggio di `BMB`. In `project()` serve l'inversa, con due iterazioni a punto fisso (`u = p / s(u)`). Lo scarto della mira scende sotto 0,5 px.
- Bande e vignetta rossa calcolate su `vUv0`.
- Valori di `gonfio`: **.055 a piedi**, fino a **.085 su skate e BMX** al crescere della velocità da 0 a 8 m/s (τ .5 s, è l'effetto VX1000), **.035 nelle zone del regime e nei dialoghi**, **.04 sul telefono in verticale**.

**E. La profondità per piani.**
- `NIT.vicino` .22 pesa troppo sulle lastre: passa a **.12**. Nel coc il velo dei tetti (`nTet`) scende a un terzo.
- `NIT.quinta` .05 passa a **.1**, ma solo per ciò che sta davanti al personaggio: il bordo del tetto tagliato incornicia la via come una porta, con la quinta scura di Spike Lee.
- La pozza `NIT.luce` .1 resta, però calda (`#FFE6C0`) e senza bordo, mai un occhio di bue.
- Di notte i coni dei lampioni vanno sfumati con un `smoothstep` di 0,6 m sul bordo, non con poligoni netti.

**F. Le quattro leve, nel mio campo.** Fish-eye: punto D. Sbieco: punto C. Rigonfiamento: la camera più bassa del punto B mette in vista il piede dei volumi, dove il gonfio si legge. Tratto: il bordo del taglio del punto A riceve il pennarello più spesso.

**Lo shader proprio, la parte della lente.** Sul computer, una frangia cromatica laterale **solo agli angoli**, pesata da r², al massimo 0,5 px (due letture in più, `aK2.x`); sul telefono resta spenta. Insieme al barile, alla quinta scura e al taglio a retino forma l'«obiettivo VX» del gioco: la camera di chi sta nella strada, non quella che la sorveglia.

## 4. Cosa chiedo agli altri cinque
- **Scenografo:** i tetti che restano in quadro devono essere vissuti, non lastre: bucato, antenne, sdraio, writing sui parapetti, un colore pieno per terrazzo. Gli edifici del regime a piombo e simmetrici, il resto storto di 1°.
- **Tecnico luci:** il sole di traverso rispetto all'asse delle vie principali. Di notte meno blu-piombo, finestre e insegne calde a tenere il quadro, coni dei lampioni morbidi.
- **Fotografo:** i primi piani non color fango, una sola emulsione, i neri caldi anche sul bordo del taglio.
- **Illustratore:** il personaggio con un colore riservato e un filo di sagoma che regga a 24 px. Sul taglio il contorno a pennarello più spesso. Basta con le macchie scure sui lastrici.
- **Animatore:** il rollio e il gonfio dello skate legati alla velocità e alle curve. La gente nella via, in movimento lungo l'asse.

## Riassunto
1. Il difetto più grave è d'inquadratura: in 3 foto su 6 il personaggio è sotto un tetto e lo vediamo in trasparenza, come da una telecamera termica.
2. La soluzione è il taglio a retino del primo piano in `sguPezzi`, poi `CAMERA4.max` 1.00, `stretta` .92, `zoom` .85, personaggio ≥24 px, tetti ≤45%.
3. Lo sbieco in camera (`rotateZ`): ±0,9° in strada, fino a 2,5° sullo skate, 0 esatto nelle zone del regime, che restano simmetriche.
4. La lente si corregge così: mira compensata con `gonfiaUV` e la sua inversa (oggi fino a 24 px), bande su `vUv0`, gonfio da .035 a .085 secondo il contesto.
5. Profondità per piani (`vicino` .12, quinta solo davanti), pozza calda senza bordo, frangia agli angoli solo sul computer: l'«obiettivo VX» della strada.
