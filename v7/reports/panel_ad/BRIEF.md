# Brief dell'art director: Porto Vecchio, il look raffinato e cinematografico

## Chi parla
Sono l'art director. Il committente mi ha detto: «il progetto e il livello si sono alzati tantissimo; voglio l'estetica più raffinata e
cinematografica. Ripetiamo l'analisi: tu sei l'art director, consapevole. Non dare troppo peso al vecchio lavoro: quello attuale regna,
ma deve diventare perfetto e curato.»

Quindi: **non si torna indietro e non si rifà da capo**. Si parte da quello che c'è oggi e lo si porta alla perfezione: ogni proposta deve
migliorare il look attuale, non sostituirlo con un altro.

## Il gioco
Gioco nel browser (Three.js r149), un'isola italiana nel 1986: città ligure (caruggi, ardesia, bucato, intonaci pastello) con lo spirito di
Vice City e della strada anni '80 (hip hop, writing, skate). Camera alta a tre quarti (fov 30°), personaggio al centro. Gira su computer e
telefono e deve restare leggero. Codice in `/home/user/porto-vecchio/v7/src/` (soprattutto `render.js`), build `python3 build.py` in `v7`.
**Non modificare nessun file del repository**: è un giro di consulenza, scrivi solo il tuo rapporto.

## Il look che regna oggi (da conoscere bene prima di proporre)
- **La pellicola di strada** (`render.js`, cerca `[strada] LA PELLICOLA` e `PELL`, `SG_STR`): una sola emulsione anni '80 (Martha Cooper,
  Jamel Shabazz, Do the Right Thing) a tutte le ore. Sole caldo e direzionale, ombre colorate cobalto, neri pieni e caldi, colore pieno
  sulle cose di strada, luci crema, giornate lunghe, e un leggero **rigonfiamento a fish-eye** di tutto il quadro (`PELL.gonfio` .055).
  Il committente l'ha accolta: «il mood torna».
- **La leggibilità** (`const NIT = {`, `SG_NIT`): dalla profondità e dalla quota di ogni pixel. Fuoco sul personaggio, aria sul lontano,
  linea sul ciglio dei volumi, ombra al piede dei muri, calma del suolo, luce che segue il personaggio un passo avanti nella marcia.
- **La tavolozza dei tetti e la camera** (`LOOK`, `HANDOFF_look.md`): coppi sbiaditi, ardesia su una falda su tre, metà dei terrazzi a
  lastrico chiaro, camera meno dall'alto (`CAMERA4.max` 1.08) e più vicina (`VIEW` 38), scossa morbida.
- Il passo finale è uno solo (`sguInit` / `sguPasso`), la curva tonale in `CustomToneMapping`, i momenti del giorno in `SGU.momenti`.
- Il primo panel (rapporti in `v7/reports/panel_look/`) aveva spinto verso un grading neutro: il committente l'ha bocciato
  («troppo notturno e grigio», «hai ammazzato il mood»). **Niente grigio, niente desaturazione come soluzione.**

## Le foto del look attuale (guardale con Read; 1024×640)
`/tmp/claude-0/-home-user/9ba989a5-c62e-5a30-b5ec-f8aefa50a0b0/scratchpad/ad/` — `21_varco_rua.png` (in gioco), `10_corso.png` (giorno),
`07_vittoria.png` (piazza a mezzogiorno), `02_vicolo.png`, `18_sera_bar.png` (sera), `19_notte_vittoria.png` (notte). Se una manca, è
ancora in cottura: lavora con quelle che ci sono e riguarda la cartella prima di chiudere.

## Il principio dell'art director: l'attitudine
Il difetto non è la forma ma la sua **esattezza da catalogo**: i modelli sono giusti e precisi, ma non hanno attitudine. Quattro leve
grafiche da valutare con valori e costi (il committente le ha accolte):
1. **Fish-eye**: la botte leggera dell'obiettivo, come le riprese di skate con la VX1000; si vede ai bordi, quasi niente al centro.
   C'è già (`PELL.gonfio`): va tarata, e va risolto lo scarto della mira sotto il cursore (fino a ~10 px).
2. **Sbieco**: niente perfettamente a piombo. Case che pendono di un grado, pali storti, cartelli girati, ogni tanto la camera appena
   inclinata.
3. **Rigonfiamento**: volumi più morbidi e pesanti al piede, come il pantalone che si accumula sulla scarpa: spigoli arrotondati,
   oggetti di strada con più massa in basso, personaggi più «chunky» (scarpe grandi, pantaloni e giacche larghi).
4. **Tratto**: un contorno da pennarello invece della linea tecnica uniforme, più spesso dove la forma pesa.
In più, da discutere: **lo stile racconta il conflitto del gioco**. Il regime resta dritto, rigido, a piombo; la strada e il Disgelo
si gonfiano e si storcono.

## Il mood: meno Grande Fratello, più strada
Il committente, testuale: «sì, il mood: meno Grande Fratello, più street». Il gioco racconta un regime, ma l'immagine non deve sembrare
una distopia di sorveglianza: niente luce fredda da istituzione, niente grigio-cemento, niente vuoto ordinato e oppressivo, niente
inquadrature da telecamera di controllo. Deve sembrare la strada vissuta da chi ci sta: calore, sole sui muri, colore delle cose,
segni di mani (writing, manifesti, bucato, saracinesche dipinte), gente, musica, il caos buono e leggibile del quartiere. Il regime si
vede come intruso nel set (le sue architetture dritte e rigide), non come il filtro di tutta l'immagine. Ogni proposta va giudicata
anche su questo: spinge verso la strada o verso il Grande Fratello?

**Colori più hip hop** (il committente, testuale: «colori più hip hop»). La tavolozza dell'hip hop anni '80 e primi '90: i colori
primari e secondari pieni dei writing e delle giacche (rosso, giallo, blu reale, verde), i fluo dosati come accenti (magenta, verde
acido, arancio), il nero e il bianco pieni delle scarpe e delle tute, l'oro delle catene, il caldo dei mattoni e dei block party al sole.
Il fotografo e l'illustratore propongono una tavolozza concreta (colori esadecimali e dove vivono: muri, saracinesche, insegne, vestiti,
auto, graffiti), il tecnico luci e il fotografo come la pellicola la porta senza diventare un poster né un cartone, lo scenografo dove
metterla nel set. Raffinata: accenti saturi pochi e nei posti giusti, non tutto saturo.

## Uno shader proprio
Il committente, testuale: «e shader proprio». Il gioco deve avere **uno shader suo, riconoscibile**: una firma visiva (come Borderlands,
Jet Set Radio, Hi-Fi Rush, Sable, Into the Spider-Verse, Disco Elysium hanno la loro), non un grading generico appoggiato sopra. Pensa
alla resa delle superfici e della luce nei materiali (le bande della luce, come prende il sole un muro, l'ombra colorata, il bordo), al
tratto, alla trama (retino, spray, carta, pellicola), e a come il passo unico finale lega tutto. Ogni esperto, nel suo campo, propone gli
ingredienti di questo shader con precisione (pezzi di GLSL descritti, dove agganciarli: `sguPezzi`/`sguProPezzi` nei materiali o
`sguInit` nel passo finale) e il costo. Il risultato deve essere uno solo, coerente con la pellicola di strada che c'è, e leggero.

## Raffinato e cinematografico, curato
Raffinato vuol dire: niente effetti che si notano come effetti, ogni ora dello stesso film, transizioni morbide, nessun difetto visibile
(aloni, sfarfallii, macchie verdi sulla piazza, scalette, bordi che strisciano), la gerarchia dello sguardo chiara (il personaggio e la
strada davanti prima di tutto), la profondità naturale, la città che invita ad andare avanti.

## Cosa ti chiedo
Rapporto in italiano, 500-800 parole, nel file indicato nel tuo incarico:
1. **Cosa c'è già di buono** nel look attuale e va protetto (2-4 punti).
2. **I difetti da curare**, guardando le foto: concreti, con dove si vedono.
3. **Le proposte per portarlo alla perfezione**, in ordine di impatto, attuabili: manopole esistenti con nome e valore, colori esadecimali,
   regole misurabili, pezzi di shader descritti con precisione, con il costo (computer e telefono). Dì cosa fare delle quattro leve nel
   tuo campo.
4. **Cosa chiedi agli altri cinque** perché il look resti uno solo.
Chiudi con un riassunto di 5 righe.
