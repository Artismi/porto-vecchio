# Il cineasta — inquadratura, sguardo, profondità

## 1. Diagnosi (dalle foto nit4/dopo p1, p5 e nit1/dopo p7)

1. **È una pianta, non un'inquadratura.** Nelle strade la camera che si adatta sale verso `CAMERA4.max = 1.22` rad (70°) e la stretta va a `1.08`; con `fov 30` e `dist ≈ 59 m` (VIEW 44 × ui.zoom .72 ≈ 32 m di altezza) l'immagine è quasi zenitale. Non c'è orizzonte, non ci sono facciate, non c'è un asse di fuga: la profondità esiste solo come altezza dei tetti. Per questo «il suolo non si stacca dalle case»: dall'alto le case *sono* tetti, cioè macchie piatte.
2. **I tetti fanno da protagonista.** In p1 e p5 i tetti occupano il 55-65% del quadro, la strada è lo spazio che avanza. Il percorso non si legge come una linea che guida lo sguardo (p5: la via è un grigio informe in basso; p7: l'ombra blu della corte è la forma più grande del quadro e si legge come acqua).
3. **Il personaggio non si trova.** A 32 m di altezza inquadrata una persona di 1,7 m misura circa 40 px su 800, in mezzo a cose della stessa taglia (bidoni, sedie, cartacce rosse e bianche). Nessuna delle tre foto mi dice in 1 secondo dove sono. Manca il primo principio del cinema: dove guardare.
4. **La sfocatura per profondità legge come bassa qualità.** Dall'alto lo scarto di profondità è piccolo e irregolare: `NIT.fuoco .85` + `vicino .55` + il velo sui tetti (`nTet * .55` nel coc) producono chiazze (p5: le macchie verdi sfocate sulla piazza, i bordi impastati a destra), non un piano di fuoco. Il tilt-shift sotto i 1080p sembra un'immagine ingrandita, cioè proprio il difetto che il committente lamenta.
5. **Nessun ritmo verso l'avanti.** Il personaggio è il perno al centro (`[camera3]`, niente sguardo avanti): davanti a sé ha lo stesso spazio che ha dietro. La strada non «tira».

## 2. Proposte, in ordine di impatto

**A. Abbassare la pendenza (camera, non passo finale).**
- `PITCH` 0.78 resta per il largo; `CAMERA4.stretta` 1.08 → **0.98**, `CAMERA4.max` 1.22 → **1.05** (60°), `margine` .08 → .05. Nei vicoli stretti, invece di salire, lavora il taglio `via_muretto` che c'è già (le case davanti scendono a 1 m).
- Regola misurabile: a piedi su strada larga ≥ 5,6 m la pendenza sta fra **0.80 e 0.92**; il bordo alto del quadro deve mostrare il piede di almeno una facciata lontana. In un quadro tipo i tetti ≤ **40%** dell'area, il suolo percorribile ≥ **30%**.
- `fov` resta **30** (teleobiettivo: schiaccia e compatta, è giusto per la miniatura cinematografica). Non salire a 40 a piedi.

**B. Il personaggio più grande e non al centro esatto.**
- `ui.zoom` .72 → **.62** (altezza inquadrata ≈ 27 m, personaggio ≈ 50 px su 800). Telefono verticale: tenere `.78` sul `viewH`.
- Spazio davanti: punto guardato = personaggio + **0,12 × viewH** nella direzione di marcia, solo dopo **0,6 s** di cammino continuo, smorzato con τ **0,8 s**, che torna a zero in 1,2 s da fermo. Il personaggio finisce al **38-42%** dal basso, con il percorso davanti a lui. Non è lo «sguardo avanti dalla velocità» che è stato tolto: è lento e non pompa.
- Con `asse` attivo (via_muretto), non allineare la via perfettamente in verticale: scostamento di **0,25 rad** (≈14°) verso il lato del sole, così la via è una diagonale che entra dal basso e sale: linea guida, non colonna.

**C. Il fuoco: meno sfocatura, più valore (passo finale, `NIT`).**
- `fuoco` .85 → **.35**, `vicino` .55 → **.25**, `raggio` 2.6 → **1.6**, `fuocoDa` .16 → **.22**; nel coc il velo dei tetti `nTet * .55` → **nTet * .15**. Il disco di sfocatura non deve mai superare 1,6 px a 540 righe dentro il cerchio `cerchio .62`.
- La separazione dei piani la fa il valore: `tetti .85` resta, ma nel suo ramo i tetti sopra `tettiDa` vanno verso una sola tinta calma: mix al **30%** verso `#C9B8A6` (luminanza ≈ 0,72), saturazione × **0,7**. Il suolo del piano del personaggio resta pieno. Regola: in scala di grigi, il suolo entro 8 m dal personaggio sta nel terzo più chiaro del quadro; nessuna ombra sotto luminanza **0,22**.
- Luce che segue il personaggio: `luce` .1 → **.16**, `ombraBordo` .2 → **.28**, `cerchio` .62 → **.55**, centro spostato con lo spazio davanti (B), non sul personaggio: l'occhio va dove si cammina.
- `quinta` .16 → **.22** (il primo piano in basso più scuro), `aria` .5 resta: con la pendenza di A la parte alta è ~1,5 volte più lontana e la prospettiva aerea comincia a lavorare.

**D. Bande e formato.** Niente bande nel gioco libero. Nelle scene, nei dialoghi e in apertura (`ui.letterbox`) bande per **2,0:1** (altezza banda = (H − W/2)/2, mai sul telefono verticale), entrata in 0,4 s. Vignetta del giorno (`SGU vign .18-.2`) va bene: non aggiungerne altra.

**E. Movimento.** Nessun cambio di pendenza più veloce di 0,8 s (τ .26 già lo garantisce: lasciarlo); `resta` 2.05 s bene. Il ritorno dopo la mano del giocatore: 1,5 s, curva dolce, mai a scatto.

## 3. Cosa chiedo agli altri cinque

- **Scenografo:** la via come corridoio. Lungo il bordo della carreggiata una linea continua (cordolo, marciapiede chiaro) mai interrotta da oggetti; gli arredi solo in nicchie, a ritmo regolare (una panchina o un lampione ogni 12-15 m, sullo stesso lato); niente oggetti di taglia-personaggio nei 4 m attorno al percorso. Tetti in 3 famiglie di colore, non dieci.
- **Tecnico luci:** ombre più corte e meno sature a metà mattina (la corte di p7 non deve diventare un lago blu): ombra mai più scura di 0,22 e con saturazione ≤ 0,35; il sole di lato rispetto all'asse della via, così i muri disegnano il bordo della strada.
- **Fotografo:** una sola curva e una sola tinta; sfocatura come la descrivo in C, non di più; grana zero sotto i 900 px di altezza.
- **Illustratore:** il personaggio con un colore di contrasto riservato (nessun oggetto di scena lo usa) e un filo chiaro di sagoma; tetti a campitura semplice, senza macchie di sporco sopra i 2 m dal piano.
- **Animatore:** la camera non deve ballare col passo; i passanti si muovono lungo la via, non di traverso; tre o quattro figure in movimento nel quadro, non venti ferme.

Riassunto in 5 righe:
1. Oggi è una pianta: la pendenza sale fino a 1.22 rad, i tetti riempiono il 60% e non c'è un asse di fuga.
2. Va prima di tutto nella camera: `stretta` 0.98, `max` 1.05, fov 30, `ui.zoom` .62, uno spazio davanti di 0,12 × viewH e la via tenuta in diagonale di 14°.
3. Nel passo finale meno sfocatura (`fuoco` .35, `vicino` .25, `raggio` 1.6, tetti `nTet*.15`): i piani si separano col valore, non col blur.
4. Lo sguardo va al personaggio: luce a pozza davanti a lui, un colore che usa solo lui, il suolo vicino nel terzo più chiaro.
5. Bande a 2,0:1 solo nelle scene; gli altri fanno della via un corridoio pulito.
