# HANDOFF — Bottino in scena e Menu a valigetta (5 ottobre 2026)

## Bottino in scena (`src/bottino.js`)
- Frugare non è più un pulsante. Ogni posto da frugare è un oggetto 3D semplice appoggiato a terra:
  cestino, scatolina di cartone (vicolo), rottami, fascina (bosco), cassa portata dal mare, sacco (prateria), cassetta militare, casse dei posti (discarica, cantiere…), casse di carico al porto (lucchetto rosso se chiuse).
- Clic sull'oggetto: il protagonista ci va. La roba sparsa si raccoglie tutta da sola; mobili, casse chiuse, corpi e bagagliai aprono la scheda Frugare.
- Dentro casa si clicca il mobile; il bagagliaio si clicca dietro l'auto; chi è a terra stordito ha «Tasche» nel menu attorno alla persona; i morti si cliccano.
- Dati: `Oggetti.lootables(st, r)` (oggetti.js) dà tutto il frugabile con la posizione. Tolti dalla barra «Fruga: …» e «Cerca qui intorno».
- main.js: `pickAt` chiede prima a `Bottino.pick`; nuovo tipo di clic `loot`.

## Il Menu (`src/menu_ui.js`)
- Una valigetta sola, colonna di schede a sinistra: **Zaino** (griglia: la roba grande occupa più caselle, dettaglio, Nino con le armi e le barre), **Nino** (bisogni, conti, quello che sai fare dal mestiere, amici), **Banco** di lavoro (ricette a tessere, ingredienti con icone), **Lavori** (il tuo, chi cerca gente con distanza e direzione, «Vai lì»), **Qui** (le cose da fare sul posto).
- Compaiono quando servono: **Bottega** (il commerciante disegnato al banco con l'insegna, la merce in vetrina, Compra/Vendi) e **Frugare**.
- Icone pixel 16×16 per tutti i 374 oggetti: una sagoma per famiglia (`SHAPE`, `FAM` in menu_ui.js), il colore dall'oggetto. Le armi usano le icone di tasche_ui.
- Tasti: I o Z zaino, K banco, 1-5 schede (a menu aperto), doppio clic usa/impugna/compra/fai, Esc chiude. Il gioco va in pausa.
- Collegamenti: `OggettiUI.open('zaino'|'lavora'|'banco'|'fruga')` e `TascheUI.toggle` passano al Menu; lo Scambio resta il pannello vecchio.
- In scena la fila di pulsanti di `#rs-here` è diventata un riquadro solo, «Qui · N cose da fare», che apre la scheda Qui. `RisaccaUI.doHere` è esportato.

## Da fare
- Abilità vere del personaggio (in v7 non c'è un sistema di esperienza: la scheda Nino mostra quello che il mestiere permette di fare).
- Scambio nello stile nuovo.
- Provare a schermo vero la grandezza degli oggetti del bottino con la camera del gioco.

## Rifatto sul resoconto «UI madreperla» (5 ottobre, sera)
- Palette Salmastro (madreperla scura, verderame, vetro, ottone per la selezione, crema per il testo, rosa Aurora solo per link e pericolo), Instrument Serif per i titoli, Instrument Sans per i testi, Saira Condensed per etichette e tasti. Tasti a pillola e moneta, iridescenza al passaggio, anello d'ottone per il selezionato.
- Vocabolario della banda: Roba, Chi è, Banco (con il Quaderno delle ricette), Covo, Mestieri. Verbi brevi: Prendi, Butta, Indossa, Tieni, Al covo.
- La Roba è rovesciata su un piano: il marciapiede in strada, il tavolo nel covo o a casa.
- **Il mondo non si ferma**: col menu aperto in strada il gioco va a un quarto della velocità (`ui.menuSlow`, main.js); nel covo e a casa si ferma.
- **Personaggi veri** (`Models.person`, ritratti 3D in menu_ui.js, sezione RITRATTI): Nino nella Roba e in Chi è (si gira trascinando), il commerciante di turno dietro il banco della bottega (`counter().clerkId`), gli amici del quartiere a mezzo busto. Il nome di un amico si clicca: ci vai.
- **Vestiti indossabili** (oggetti.js, sezione ADDOSSO): posti testa, collo, maglia, giacca, mani, gambe, piedi, spalle; mano destra (arma o attrezzo, quella del motore) e mano sinistra (un oggetto fino a 2 kg). Quello che indossi non pesa nella borsa, scalda (`Oggetti.warmth`), lo zaino sulle spalle dà 20 kg in più. Azioni `indossa`, `togli`, `tieni`. Il ritratto di Nino prende i colori di giacca/maglia e pantaloni.
- Manca: il Nino in strada non cambia ancora vestiti (il modello del giocatore è in render.js, che si modifica solo con gli script); cappelli e zaino non si vedono sul ritratto (dressUp salta il giocatore); i tasti del resoconto (Tab Roba, C Chi è) sono già usati dal taccuino e dalla chat, per ora restano I e K.
