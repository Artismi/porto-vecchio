# Animatore: come si muove l'immagine

## 1. Diagnosi

Nelle tre foto il protagonista non si trova. Con `VIEW = 44` m di inquadratura verticale e una pendenza che nelle vie strette sale fino a `CAMERA4.max = 1.22` rad (70°), una figura di 1,75 m occupa sullo schermo 15-18 px di altezza (1,75·cos 1,0 / 44 · 800). Della figura si vede la testa e poco altro. Il centro dello schermo resta fermo, ma lì non c'è niente da guardare.

Tutto lo schermo si muove allo stesso modo, e la causa è la gerarchia del movimento più che la quantità:
- **Sguardo avanti troppo nervoso.** Con la levetta o con i tasti (`leadOf`), `kl` usa `dt*16`: tutta l'inquadratura si sposta fino al 30% della mezza larghezza in circa 0,06 s. A ogni cambio di direzione la città dà una frustata.
- **Scossa a rumore bianco.** `sx = (Math.random()-.5)*sh*1.4` cambia a ogni fotogramma e dipende dal ritmo dei fotogrammi. Con `shake = .7` sono ±0,5 m, cioè circa 12 px di sfarfallio, non una botta.
- **Camminata che frulla.** `ts = clamp(sp/1.6, .55, 2.2)`: a 3,5 m/s la clip Walk va a 2,2×. Dall'alto la sola cosa che si legge del personaggio è la frequenza delle gambe, e a quella velocità diventa tremolio.
- **Gabbiani bianchi `#f4f4f0` che battono le ali a 6-10 Hz.** Dall'alto sono 1-2 px che si accendono e si spengono e producono aliasing puro.
- **Sfocature che nuotano.** Nel passo `NIT.vicino = .55` e `fuoco = .85`. Nella foto del Corso le chiome vicine diventano macchie verdi impastate: in movimento scivolano sopra il suolo e fanno rumore.
- **Nessun contatto sotto la folla.** Le persone lontane hanno solo la macchia allungata del sole (`blobA` .18-.38). Senza un'ombra stretta sotto i piedi, dall'alto la gente sembra galleggiare e si confonde con gli oggetti.
- **Positivo.** La camera è ormai solidale col personaggio ([fluido]) e l'aggancio ai pixel si spegne mentre la camera trasla ([cadenza]). La base è sana: va dosata, non rifatta.

## 2. Proposte, in ordine di impatto

1. **Scala del personaggio.** Sul computer `VIEW = 44 → 36` (lo zoom indietro resta, `ZOOM_MAX = 2`). Nella stretta il tetto della pendenza scende: `CAMERA4.max 1.22 → 1.08`, `stretta 1.08 → 0.98`. Regola misurabile: il protagonista è alto almeno 26 px a 800 righe (circa 3,3% dell'altezza) a zoom 1. Il cambio di pendenza non supera 0,15 rad/s (oggi `tau .26` permette salti di 0,3 rad in 0,8 s).
2. **Sguardo avanti che invita, non che frusta.** In `kl` passare `leadOn ? 16` a `leadOn ? 3` (τ ≈ 0,33 s) e `k = .3*ui.lead.m` a `.24`. Quando il personaggio si ferma lo sguardo torna in 0,8 s (k 1,25), non subito. Il risultato è che davanti al personaggio c'è sempre circa il 60% di strada in più che dietro: la via «tira».
3. **La luce segue lo sguardo avanti.** In `sguPasso`, `nB.xy` = posizione del personaggio sullo schermo + 0,45 × lo sguardo avanti proiettato (`cam.lx/ly`). La pozza di luce sta un passo davanti a lui. Valori: `NIT.cerchio .62 → .55`, `ombraBordo .2 → .26`, `luce .1` invariato.
4. **Scossa da rifare.** Al posto di `Math.random` usare due seni sfasati per asse (13 e 19 Hz, fase per evento). Ampiezza = `sh² * 0.9` m (trauma al quadrato), tetto 0,35 m, decadimento invariato. Nessuna rotazione. Per piccoli colpi resta solo il `kick`, che è già ben fatto.
5. **Ritmo del passo.** Walk `clamp(sp/1.6, .7, 1.6)`, corsa da 2,6 m/s (scendendo da 2,3) invece che da 3,5/3,1. Corsa `clamp(sp/5, .8, 1.4)`. Le gambe non superano circa 2,2 passi/s.
6. **Contatto per tutti.** Ogni persona inquadrata, oltre alla macchia del sole, ha un ovale `blobT2` di 0,7 m sotto i piedi, colore `#1a1020`, opacità .32 di giorno e .2 di notte, senza dipendere da `moon.intensity`. Il protagonista mantiene il suo (1,3 m, .55), con un bordo chiaro `ALONE3.forza .5 → .6`.
7. **Vita dosata come guida.**
   - Gabbiani: battito 3-4 Hz (`f: 3 + r()*1`), colore `#e6e1d6`, al massimo 4 per stormo e solo sopra acqua o tetti del porto. A terra la loro ombra (`#1a1020` a .18) scorre lungo la costa.
   - Bucato e tende si muovono per raffiche che percorrono la via nel senso di `VENTO.dx/dz`: fase = proiezione della posizione sul vento / 6 m − t·1,2. Si vede un'onda che corre, non cento sventolii scollegati. Ampiezza a riposo ×0,4.
   - Folla: oltre i 25 m dal protagonista i gesti da fermi (`habit`, `discute`) con ampiezza ×0,5. Velocità di marcia degli abitanti 1,1-1,5 m/s, mai più veloce del protagonista che cammina. Il passante più veloce dello schermo deve essere lui.
8. **Passo finale stabile.**
   - `AMB.film .028 → .018`, sul telefono `STRADA.granaTel` resta a .35.
   - `NIT.vicino .55 → .25`, `fuoco .85 → .55`, `fuocoDa .16 → .22`.
   - `SGU.nuvole .16 → .10`, `nuvoleVento [.55,.22] → [.9,.35]`: meno macchie, più lente da leggere, una nuvola ogni tanto invece di un velo maculato.
9. **Passaggio a piedi/guida.** `fov lerp(30, 40)` diventa `lerp(30, 36)`. Mentre cambia il fov, `cam.cd` compensa in modo che il mezzo resti alla stessa dimensione sullo schermo: niente «respiro» di zoom all'ingresso. Allo sbocco dei vicoli il giro lungo l'asse (`tauAsse .55`) ha una velocità massima di 0,6 rad/s.

## 3. Cosa chiedo agli altri cinque

- **Cineasta:** una sola regola di pendenza e scala (punto 1). Niente varianti `?inquadratura`. Lo sguardo avanti come regola di composizione: lo spazio sta davanti, mai dietro.
- **Scenografo:** lungo la direzione di marcia, entro 12 m, niente oggetti alti più di 1 m al centro della via. Gli elementi che si muovono (bucato, tende, gente seduta) stanno ai lati e soprattutto agli sbocchi, dove l'occhio deve andare.
- **Tecnico luci:** la pozza di luce spostata in avanti (punto 3) e la luce di bordo sul protagonista sempre accesa. Nessuna luce che sfarfalla o pulsa dove passa la camera, salvo neon voluti a meno di 1 Hz.
- **Fotografo:** grana, fuoco e vicino come al punto 8. Tutta la sfocatura deve essere stabile in movimento, quindi niente effetti in spazio schermo che seguono la camera, e contrasto locale massimo sul piano dove si cammina.
- **Illustratore:** sagome delle persone con un valore distinto dal suolo (almeno 25% di luminanza di scarto) e il protagonista con un colore che nessun abitante porta (proposta `#E8A8BF` blush). Una figura leggibile in 26 px vale più del dettaglio dei vestiti.
