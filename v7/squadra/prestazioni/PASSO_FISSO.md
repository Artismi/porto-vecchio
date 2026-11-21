# Il passo fisso con l'interpolazione (F3): il progetto

## Perché non l'ho fatto in questo giro
Il ciclo (main.js loop0) chiama `G.step` con un dt variabile (il PACE smussato, al più 50 ms; `Cinema.passi` fino a due passi) e subito
dopo `R.frame`, che legge lo stato del gioco **direttamente** in centinaia di punti: render.js (persone, mezzi, camera7 che deriva le
velocità da `p.x - CAM7.ppx` su `dtG`, l'anello ai piedi, le ombre di contatto), writing.js, vita, commedia, interfaccia (le etichette sopra
le teste), i 23 agganci di `G.HOOKS.step`, i ~20 cicli rAF dei moduli. Un passo fisso con l'interpolazione richiede che il disegno veda una
posizione **fra due passi**: o tutti questi lettori leggono una copia interpolata, o si scrive l'interpolato nello stato e lo si rimette dopo.
Nessuna delle due è un affinamento piccolo e sicuro: tocca il contratto fra logica e disegno di tutto il gioco. Quindi il progetto, a fasi.

## Il disegno
- **Passo fisso a 30 Hz** (1/30 s) col cumulo: `acc += min(0,25, raw)`; `while (acc >= h) { step(h); acc -= h }`; `alpha = acc / h`.
  A 30 fps un passo a fotogramma; a 15 fps due; a 60 fps uno ogni due fotogrammi (interpolato). Tetto ai passi per fotogramma: 3 (oltre si
  rallenta, come ora sotto i 10 fps). Sostituisce PACE, `Cinema.passi` e l'isteresi.
- **Lo stato disegnato**: dopo ogni passo si copiano in un buffer (array tipizzati, niente oggetti nuovi) i campi che il disegno anima:
  giocatore e mezzi (x, y, ang, face, jz, speed), persone visibili (x, y, face, speedNow). Prima di `R.frame` si scrive nello stato
  `prev + (cur - prev) × alpha` per questi campi soltanto, dopo `R.frame` si rimette `cur`. È la variante meno invasiva: i lettori non
  cambiano. Le eccezioni (chi in `R.frame` scrive lo stato: `R.hits → G.propHit`, l'anello, i colpi) si spostano fuori dalla finestra
  interpolata (dopo il ripristino).
- **La camera** va col tempo del disegno (raw), il suo bersaglio è il giocatore interpolato: niente più tremolio fra camera (tempo vero) e
  personaggio (tempo smussato). camera7 deriva la velocità dai passi (`p.vx, p.vy`, già usati con `CINE`), non dalle posizioni.
- **Animazioni**: `Models.animPerson`, mixer e molle di render.js col dt del disegno (raw); le persone lontane (oggi a 1/2 e 1/3 dei
  fotogrammi senza interpolazione) seguono l'anello della logica ma la posa si interpola sul dt vero.
- **Comandi**: la levetta campionata una volta a fotogramma e data a tutti i passi del fotogramma; i colpi (`G.fire`) al primo passo
  (com'è ora).

## Le fasi (ognuna con la sonda del ritmo e le prove node)
1. **Misura**: la sonda `sonda_ritmo.js` più un registro per fotogramma di posizione del giocatore e della camera (lo scarto sullo schermo):
   oggi il tremolio fra 33 e 50 ms. Le prove di riferimento: `test_cinema`, `test_controlli8`, `test_guida2`, `test_camera7`, `test_bmx`.
2. **Il cumulo senza interpolazione** (alpha ignorato): stesso comportamento a 30 fps, nessun cambio di vista; via PACE e passi variabili.
3. **Il buffer e l'interpolazione del giocatore e del suo mezzo** (la cosa che si vede di più), con la camera sul giocatore interpolato.
4. **Persone e mezzi in vista**; le persone dell'anello lontano interpolate fra i loro passi radi.
5. **Pulizia**: via `Cinema.passi`, PACE, `dtG`, i casi speciali del rallentatore (che diventa un fattore sul passo).

Rischi: i 23 agganci che si aspettano un passo per fotogramma (contatori «ogni N passi»: con due passi per fotogramma vanno al doppio,
oggi già succede con `Cinema.passi`); il determinismo delle prove (il passo fisso lo migliora); il rallentatore e il colpo fermo (`hitstop`)
che lavorano sul dt.
