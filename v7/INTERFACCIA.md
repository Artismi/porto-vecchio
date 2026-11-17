# INTERFACCIA — lo strato delle informazioni, minimo

> «Non serve vedere tutti i nomi delle case… tra quello e i messaggi lo schermo è pieno: punti esclamativi, punti di domanda,
> frecce. Non si capisce niente. Deve essere il più chiaro possibile.»

Tavola: `_immagini/interfaccia/interfaccia.jpg` (prima | dopo; telefono e computer; piazza affollata e via di case).
Codice: `src/interfaccia.js` (nuovo, fuori dall'impronta dei tasselli) e agganci piccoli in `src/main.js` e `src/risacca_ui.js`.
Interruttore: `?nointerfaccia` (o `Interfaccia.on = false` in corsa) rimette tutto com'era. Le soglie stanno in `Interfaccia.CFG`.

## Cosa c'era sullo schermo (l'inventario)

| Segno | Da dove | Prima | Adesso |
|---|---|---|---|
| «▸ Casa Caruso» su ogni porta entro 9 m | `risacca_ui.js` labels() | sempre, tutte le porte vicine (6-10 in una via) | **via**; il nome compare solo come sotto |
| Riquadro «dentro» in alto al centro (casa · piano · stanza — esci dalla porta arancione…) | `risacca_ui.js` #rs-indoor | sempre, per tutto il tempo dentro | **via**; il nome entrando, piccolo in alto a sinistra, 2,6 s (le prime 3 volte con come si esce) |
| Basi ≋, spazi □, cantieri ⚒, «lotto libero», ripetitore, onde ≋, murali ✺, telecamere ◉, membri ≋ | `risacca_ui.js` labels() | raggi 22-70 m, senza tetto | raggi 8-30 m per tipo, **al più 4**, le più vicine; il nome del membro non si ripete se c'è già il cartellino |
| Icone sulla gente: ✚ !! ! ? € + | `main.js` drawBubbles | entro 30 m, tutte | pericolo (✚ !!) entro 22 m, ! ? € entro 14 m, **al più 3**; il «+» degli amici **via** (lo dice il colore sulla minimappa) |
| Cartellino nome + umore | `main.js` drawBubbles | tutti entro 5,5 m | entro 4,5 m, **al più 2**; chi ha il cartellino non ha anche l'icona sopra |
| Fumetti di chi parla | `main.js` drawBubbles (+ la regia di `commedia.js`) | entro 26 m, senza tetto qui | entro 22 m, **al più 3** (telefono 2), prima chi litiga, poi i più vicini |
| Cronaca (#feed) | `main.js` feedDom | 3 righe, 4-6 s, la nuova spinge via la vecchia | **coda corta**: 2 alla volta (telefono 1), 2,6-6,5 s secondo la lunghezza, coda di 3 (si scarta prima quello che non conta), niente doppioni, niente ripetizioni della riga dell'obiettivo |
| Obiettivo: riga in alto a sinistra, diamante nel mondo, freccia a bordo schermo, segnaposto sulla minimappa | `orienta.js`, `main.js`, `render.js` | — | invariato: è **l'unico segno sempre acceso** |
| Chip d'azione (E/T/F) | `main.js` G.context | solo a portata | invariato |
| Puntatore (#hover) | `main.js` tickClick | gente, roba, mezzi | anche **il nome della casa** sotto il puntatore (porta o muro), piccolo, con dissolvenza |

## I nomi dei posti

1. **Entrando**: il nome (e il piano se ce n'è più di uno), piccolo, in alto a sinistra in cima alla colonna della cronaca, 2,6 s; le
   prime tre volte una riga sotto con «esci dalla porta arancione · scala: tappeto giallo sali, azzurro scendi» (era il riquadro fisso).
   Cambiando piano: il piano, 1,8 s.
2. **Al computer**: col puntatore sulla porta (lo stesso rettangolo del clic, `pickAt`) o sul muro della casa (il punto a terra dietro
   la facciata cade nella sua impronta: un indice casella → edificio fatto una volta).
3. **Al telefono** (e anche al computer, con la tastiera): fermo alla porta, entro 1,6 m, guardandola (`G.doorFront`, coseno > 0,5):
   «▸ Casa Caruso» nello stesso posto in alto a sinistra, finché ci stai davanti (+0,4 s).

Sempre nello stesso posto, sempre lo stesso corpo (Pixelify 12,5 px, filetto ambra, fondo scuro), dissolvenza 0,25 s. Mai nel mondo:
non copre il protagonista né la porta.

## Il protagonista libero

I cartellini, le icone e i fumetti che cadrebbero sulla scatola del protagonista (dai piedi a sopra la testa, proiettata) salgono sopra
la sua testa.

## Fuori dal mio perimetro (i segni da `unico_*.js`, non toccati)

- `unico_segni.js` disegna(): i **pittogrammi sopra la gente** (`.us-b`, modo «picto»/«piena»/«accanto»), entro `CFG.picto` = **60 m**,
  al più 4 (telefono 2). Proposta: raggio 20 m, al telefono 1, e niente pittogramma su chi ha già un'icona di main.js.
  La sua freccia (`.us-f`) è già spenta (`freccia.schermo: false`).
- `unico_cose.js`: le onomatopee (`.uc-o`) e le cose in volo/a terra (fino a 14 + 14) e i segni sul corpo (fino a 6).
- `unico_parti_vivo.js`: le etichette entro 30 m (riga ~537).

## La prova e la tavola

`scratchpad/iface/foto.js`: un caricamento, la stessa scena fotografata con `Interfaccia.on` spento e acceso (4 avvisi, 5 fumetti,
9 persone con un ricordo di te, uguali prima e dopo). Sulla tavola solo il telefono (412×870, tocco): piazza davanti alla Baracca
della Tutela; via di case davanti a Casa Caruso (14 porte di case entro 12 m), fermo alla porta; entrando.
- Piazza: prima il nome della porta, cinque cartellini e i fumetti sopra il protagonista; dopo, 2 fumetti sopra la sua testa, niente nome
  della porta. La foto «dopo» è di prima dell'ultima correzione (chi parla non ha più anche il cartellino): lì si vede ancora il
  cartellino «Soldato» sotto il primo fumetto.
- Via: prima «▸ Casa Caruso» sulla porta nel mondo, dopo lo stesso nome piccolo in alto a sinistra.
- Entrando: «Casa Caruso · esci dalla porta arancione» in alto a sinistra, al posto del riquadro fisso al centro.
- **Computer: foto non fatte** (la corsa è stata interrotta); il nome al passaggio del puntatore è da verificare a mano.
- La camera di queste foto è vicina (la vista di partenza al telefono); la cronaca al telefono è quella di `unico_schermo.js` (una riga
  che si spegne in 3,2 s), per questo non si vede.
