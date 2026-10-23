# Porto Vecchio — Telefono e icone a schermo (10-11 ottobre)

Semplificazione per il telefono: tutto quello che si può è punta e clicca; gli attrezzi diventano icone a schermo.

## Le icone (`src/comandi.js`, uguali su computer e telefono)
Tre icone in basso; ognuna, a ogni tocco, passa allo stato dopo:
- **Graffiti**: mani libere → bomboletta → tavoletta → mani libere (col pennarello se non hai bombolette). Sotto, una lineetta del colore in uso.
- **Ruote**: a piedi → BMX → skate → a piedi (lo skate solo se hai la tavola).
- **Zaino**: il menu, col numero delle cose da fare qui (prende il posto del pulsante ZAINO e del riquadro «Qui»). **La mappa si apre toccando la minimappa.**
- **La mano** compare solo quando impugni un'arma o un oggetto (non la bomboletta), con i colpi. Arma: sul telefono **si spara dove tocchi**, toccare la mano ricarica; molotov: si lancia dove tocchi; cibo: si mangia; pala, fotocamera, telefono…: l'azione dell'attrezzo qui. La ✕ lo rimette via.
- Il riquadro dell'arma in basso a sinistra (`#weapon`) è nascosto: arma e colpi stanno sulla mano.

## Il telefono (`main.js`, sezione Touch)
- La levetta resta per camminare e guidare; il resto è punta e clicca (persone, macchine, porte, posti).
- Un pulsante solo, o due, secondo cosa fai (`touchSet`): a piedi **Salta**; con la bomboletta **Colore** e **Modo** (con la tavoletta solo Colore); in auto **Freno** e **Scendi**; in BMX **Salta** e **Impenna**; in skate **Ollie** (tieni e lascia; trascinando il dito sul pulsante scegli il trick).
- Il taccuino: tocca i soldi e l'ora in alto a sinistra.
- Nascosti sul telefono: i bisogni (stanno nel menu, Chi è), il pulsante dell'audio, Risacca/Chatta e Cammina (si fa toccando le persone); le notizie sono al massimo due.
- Il dito tenuto sullo schermo (`tp` in main.js) segue lo spostamento: spruzza, spara, spinge la tavola.

## Lo skate (`skate.js`, `PAD`, `padCrouch`, `swipe`)
- **Tieni premuto sullo schermo (o il sinistro sul computer): la tavola spinge verso quel punto.** La levetta curva (e in su spinge).
- Su computer restano W, A/D, Spazio e il gesto del mouse.

## Prove
- `node test_skate.js`, `node test_bmx.js`: passano.
- Provato in Chromium in vista telefono (844×390, touch): icone, pulsanti dello skate, il tocco che spara (caricatore 12 → 11), nessun errore in console.

## Aperto
- Su computer il sinistro con l'arma in mano cammina ancora (si spara col destro): il tocco che spara è solo per il telefono.
- Lo zoom sul telefono (pizzico) non c'è ancora.

## Prestazioni senza perdere qualità (11 ottobre)
Misure (fotogramma vista PC 1280×720, stesso istante): **da 3.103 a 2.113 disegni, da 5,4 a 4,4 milioni di triangoli** (ombre da 2,4 a 1,9). L'immagine non cambia.
- **Il colpevole non era la logica degli abitanti** (in Node: 3 ms per passo con 569 abitanti, 41 fuori), ma il disegno.
- **Gruppi di istanze col controllo d'inquadratura spento** (bosco `nat`, `verde`, alberi lontani, scale dei tetti, traversine): three r149 non sa dove stanno le istanze, quindi si disegnavano anche fuori schermo e in ogni mappa d'ombra. `render.js`, sezione `[prestazioni]` (`instCull`): un gruppo fermo da 1,5 s riceve l'ingombro vero (`icSphere`, dalle istanze, ignorando quelle spente; la forma misurata dai vertici, perché c'è chi riscrive `boundingSphere`); se è più grande di 70 m si spezza in celle da 40 m (`icSplit`, figlie dell'originale, con la loro fetta degli attributi per istanza). Se le istanze cambiano, si torna com'era. `Frustum.intersectsObject` è esteso per usare questi ingombri.
- **I personaggi** (circa 40 mesh l'uno) avevano `frustumCulled = false`: ognuno finiva in ogni mappa d'ombra dei lampioni, anche lontanissimo. Ora hanno una sfera di 2,6 m attorno al gruppo (`userData.model && mixer`); provato: nessun pezzo oltre 1,4 m.
- Per le misure: `R.__ic.off = true` spegne la correzione.

## Il contatore (F3, o `?perf` nell'indirizzo)
fps, fotogramma peggiore, ms della logica e della grafica lato processore, ms veri della scheda video per fase (scena con ombre, bagliore, pittura, post: query del timer WebGL2, se il browser le concede), disegni, triangoli, shader, risoluzione interna, abitanti fuori.

## Prossimi candidati (sempre senza perdere qualità)
- Le mesh lunghe e statiche (binari `ferrovia/wr`, settori fusi da 80 m) finiscono intere in ogni mappa d'ombra: spezzarle in celle più piccole.
- Compilare in anticipo gli shader che oggi nascono durante il gioco (una decina di scatti nei primi minuti).

## Il Game Boy del sito: schermo pulito, comandi sulla pulsantiera (23 ottobre)
Sul sito di Artismi (repository `Aertismione`, `src/components/ui/GameBoy.tsx` e `GameBoyPad.tsx`) il gioco sta dentro un Game Boy rosa, lo stesso del banco 3D visto di fronte. Lì **sullo schermo c'è solo il gioco**: i comandi sono tasti veri nella pulsantiera della console, tutto il resto sta nel menu. `main.js`, sezione `[console]`.
- **Aggancio**: la pagina ospite manda `{pvc:'ciao'}` all'iframe; il gioco mette `#app.console` (e `body.pv-console`) e risponde `{pv:'console', v:2}`. Aperto da solo, il gioco resta com'era.
- **Schermo pulito** (CSS in `index.src.html`): via levetta, pulsanti, icone, soldi e ora, minimappa, suggerimenti, Cantiere, Risacca, DEV. Restano le scritte dei posti, le stelle solo quando ti cercano, **un avviso alla volta** in basso e, in casa, il piano in una riga.
- **Il menu, in ordine** (`menu_ui.js`): sul telefono le schede stanno **in una fila sola che entra sempre** (da 320 px, niente scorrimento; Equip. sta dentro l'Inventario, che mostra già addosso e mani; nomi corti: Zaino, Crea). Nel Game Boy in più: la scheda **Taccuino**, **giorno, ora, scadenza e debito** in fondo, il **Cantiere del covo** tra le cose da fare Qui. In **Chi è**, in fondo: **Ricomincia da capo**, con la conferma (non sta su un tasto).
- **Dalla console al gioco**: `{pvc:'levetta', x, y}` (da −1 a 1, come la levetta a schermo, anche sul computer); `{pvc:'tasto', k, giu}` con `k` tra `a b bomboletta bici zaino su giu sx dx audio`; `{pvc:'lascia'}` rilascia tutto.
- **Dal gioco alla console**, solo quando cambiano: `{pv:'tasti', t:{a, b, croce, bomboletta, bici, zaino}, on:{bomboletta, bici, zaino}, mano, n, audio}` (la scritta di ogni tasto, `null` = ora non fa niente; per la croce cosa fanno le frecce; le lucine; il nome di quello che hai in mano, che B usa; le cose da fare qui, il numero sullo zaino) e `{pv:'stato', giorno, ora, soldi, debito, scade, ricercato}` per il display della console.
- **I tasti**: levetta cammina e guida; **croce** a piedi e in auto la visuale (◄ ► la gira, ▲ ▼ zoom), in BMX i trick come le frecce della tastiera (▼ impenna, ◄ ► un piede sulla pedalina); **A** il pulsante principale di adesso (Salta, Freno, Ollie, Colore), nei dialoghi conferma, all'inizio Gioca; **B** il secondo (Scendi, Impenna, Modo), a piedi con l'arma Spara (mira da sola, la scritta porta i colpi; nel Game Boy il tocco sullo schermo non spara, resta per andare e parlare), con un oggetto la sua azione (Scava, Mangia, Bevi, Scatta… da `Comandi.mano()`; sotto B il nome dell'oggetto), a mani libere Corri finché lo tieni; nei menu, nel taccuino e nei dialoghi B è Indietro; **bomboletta** la tavoletta dei graffiti; **bici** a piedi → BMX → skate (al chiuso niente); **zaino** il menu (col menu aperto lo chiude); la rotella l'audio.
- Uscendo con il mouse dai lati dello schermo la visuale non gira più (ai lati ci sono i tasti).
- Prove: una pagina ospite che comanda il gioco con `postMessage`, e il sito vero col gioco dentro: levetta, croce, zaino, taccuino, Ricomincia con conferma, arma e colpo, audio, «lascia», schermo pulito, schede che entrano. In vista telefono e computer, nessun errore.
