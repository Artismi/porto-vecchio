# Diagnosi dei vestiti 3D — stato al 19 ottobre 2026

Fatta su 43 completi (13 gruppi dello studio `strumenti/studio_vesti.js`), ognuno visto davanti, di tre quarti, di lato e dietro, più primi piani di collo, vita e piedi. Le foto di riferimento sono in `reports/diagnosi_vestiti/`.

Giudizio d'insieme: i problemi non sono di un capo o due. Si ripetono gli stessi **sette difetti di fondo** su tutto il guardaroba, e quasi tutti nascono da tre cause:

1. **il corpo del kit**, che ha già addosso vestiti suoi (scarpe, colletto, risvolti), resta sotto la pelle e sporge;
2. **la pittura**, che disegna i capi sul corpo a bassa risoluzione: bordi a scalini e stampe a pixel;
3. **pezzi agganciati costruiti a primitive** (tubi, lastre, anelli) senza una forma sartoriale: salamelle, fogli spiegazzati, scatole.

Le correzioni vanno fatte su queste tre cause, trasversalmente, non capo per capo.

---

## A. Compenetrazioni e buchi (gravità massima)

| # | Dove | Cosa si vede | Causa probabile | Foto |
|---|------|--------------|-----------------|------|
| A1 | Busto femminile, ogni maglia e camicia | **Triangoli neri sotto il seno**: buchi nel tessuto da cui si vede il dentro | la forma da sartoria (seno, vita) sposta i vertici e alcune facce si capovolgono o si staccano dal guscio | 01, 02, 09 |
| A2 | Collo nudo | **Collarino bianco a maglia** attorno al collo anche sotto una maglietta scollata | il colletto della felpa del kit non viene sgonfiato né nascosto (`slim` tocca solo braccia, busto, gambe) | 01 |
| A3 | Caviglie e polpacci nudi (bermuda, gonne, vestiti) | **Rotoli e gradini di pelle** alla caviglia: sono i risvolti dei pantaloni del kit dipinti color pelle | `slim` stringe i polpacci ma non toglie gli orli del kit | 04, 08 |
| A4 | Piede nudo nei sandali | **Piede a mattone**, gonfio e sfaccettato, con le dita a coni | il piede nudo è la scarpa del kit dipinta di rosa | 04 |
| A5 | Tallone di tutte le scarpe basse | **Spicchio di pelle bianca** tra scarpa e orlo | la scarpa non sale fino all'orlo del pantalone o del calzino | 03, 07 |
| A6 | Polso | macchie chiare e uno spicchio tra polsino e mano | resti della correzione del polso, migliorata ma non chiusa | 06 |

## B. Punti di non contatto (staccati, galleggianti)

| # | Dove | Cosa si vede | Foto |
|---|------|--------------|------|
| B1 | Scarpe da ginnastica | **la tomaia è un foglio spiegazzato** che si stacca dalla suola, con i bordi strappati; i lacci sono rettangoli bianchi sospesi | 03 |
| B2 | Sciarpa | i giri **poggiano sulle spalle come un salvagente**, larghi oltre le spalle; fra sciarpa e collo resta aria | 05 |
| B3 | Foulard | **un foglio giallo accartocciato** appoggiato sul petto, non annodato al collo | (gruppo collo) |
| B4 | Orli delle maniche corte | bordo bianco **sfrangiato e staccato** dal braccio | 01 |

## C. Scala e proporzioni sbagliate

| # | Dove | Cosa si vede | Foto |
|---|------|--------------|------|
| C1 | Tutti i pantaloni lunghi | **risvolto alto su tutto** (jeans, completo gessato, tuta, cargo): il completo e la tuta non lo hanno mai | 03, 06, 10 |
| C2 | Cargo | **attillati come leggings**, senza tasche laterali: devono essere larghi e cadere sulla scarpa | 10 |
| C3 | Gessato | righe **larghe 2 cm e distanti 6**: è un rigato da pigiama, non un gessato (1 mm ogni 1,5 cm) | 06 |
| C4 | Stampe (vestito a fiori, camicia hawaii, fazzoletto) | motivi **enormi o a pixel**; il corpetto e la gonna hanno due stampe di scala diversa | 08 |
| C5 | Scarpe | tutte **piatte e lunghe come un sapone**, la stessa forma per sneaker, mocassini e ballerine; troppo lunghe rispetto al piede | 03, 07 |

## D. Forme strane, gonfie, plasticose, spigolose

| # | Dove | Cosa si vede | Foto |
|---|------|--------------|------|
| D1 | Giacca e cappotto sotto la vita | **una gonna a sacco** che si allarga dalla cintura, con l'orlo davanti a dente di sega | 06 |
| D2 | Pelliccia e capi lunghi da donna | **peplo a campana** sui fianchi invece di cadere dritto | 09 |
| D3 | Gonna | **cono liscio di plastica**: nessuna piega, orlo dritto, nessun peso | 02 |
| D4 | Vestito corto | **un grembiule**: corpetto a rettangolo con lo scollo seghettato, senza spalline | 07 |
| D5 | Sciarpa | **salamelle sovrapposte**; il capo che pende è una tavola dritta con gli scalini | 05 |
| D6 | Fazzoletto in testa | **una cuffia da doccia a scatola** | 08 |
| D7 | Passamontagna nero | **un blocco nero** senza volume, perché la maglia nera non prende luce | 10 |
| D8 | Colletto della camicia | **gorgiera bianca arricciata** invece di un collo inamidato, sia aperto sia sotto la giacca | (gruppo colletti) |
| D9 | Gambali degli stivali | **cilindri a tubo** con la bocca dentellata | (gruppo piedi) |

## E. Dettagli e finiture brutti

| # | Dove | Cosa si vede | Causa | Foto |
|---|------|--------------|-------|------|
| E1 | Revers, aperture, scolli dipinti | **bordi a scalini di pixel** | la pittura dei capi è una texture a bassa risoluzione con il taglio netto | 05, 06 |
| E2 | Pelliccia, tweed, stampe | **rumore a quadretti** invece di pelo o trama | texture piccole senza filtro, ingrandite | 09 |
| E3 | Taschino della camicia | **un rettangolo bianco piatto** incollato | (gruppo corpo) | 02 |
| E4 | Cuciture di spalla e gomito | **righe nere** su braccia nude e maniche | cuciture del kit che restano | 01, 07 |
| E5 | Bottoni | dischi scuri senza bordo né fori, troppo grandi | | 06 |
| E6 | Cintura | fibbia piccola e piatta, passanti assenti | | 01 |

## F. Fuori dai vestiti, ma pesa sull'effetto "goffo"

- Viso, mani e capelli del modello base sono a facce piatte e molto spigolosi: anche un capo perfetto addosso sembrerà grezzo. Va valutato a parte (cambio di modello base o una levigatura).
- Le armi e gli oggetti non li ho ancora fotografati in questa diagnosi: serve uno studio a parte (`studio_oggetti.html`).

---

## Ordine di intervento proposto

Dal difetto più diffuso e più visibile al più circoscritto. Ogni passo si verifica con le stesse foto prima/dopo.

1. **Corpo pulito sotto i vestiti** (A2, A3, A4, E4): via colletto, risvolti e scarpe del kit; piede nudo e caviglia ricostruiti.
2. **Buchi del busto femminile** (A1): rifare la forma del seno senza capovolgere le facce, con un controllo automatico sulle facce capovolte.
3. **Pittura nitida** (E1, E2, C3, C4): più risoluzione, bordi sfumati, scala delle stampe e del gessato in centimetri veri.
4. **Scarpe rifatte** (A5, B1, C5, D9): una forma per tipo (sneaker, skate, mocassino, ballerina, stivale), suola e tomaia saldate, lacci veri, collo alto fino all'orlo.
5. **Orli e risvolti** (C1, B4): risvolto solo dove serve, orli puliti e senza sfrangiature.
6. **Sotto la vita** (D1, D2, D3, D4): giacca e cappotto che scendono dritti, gonna con le pieghe, vestito con le spalline.
7. **Collo** (B2, B3, D5, D8): sciarpa avvolta stretta al collo, foulard annodato, colletto inamidato.
8. **Capi mancanti** (C2, D6, D7): cargo larghi, fazzoletto, passamontagna, bucket hat, durag.
9. **Oggetti e armi**: diagnosi e rifacimento con lo stesso metodo.
