# Porto Vecchio: menu Zaino e Personaggio

Lavoro del 2 ottobre 2026 sulla build in `Documenti\porto-vecchio`: inventario, esperienza, abilità e un menu a tutto schermo per gestirli.

## Come si usa (giocando)

| Comando | Cosa fa |
| --- | --- |
| **I** oppure il pulsante **MENU** (in basso a destra, sopra la minimappa) | apre e chiude il menu. Il gioco va in pausa. |
| **1** / **2** | scheda Zaino / Personaggio |
| **Esc** | torna al gioco |
| **H** (anche a menu chiuso) | cura rapida: usa bende o pronto soccorso |
| clic | seleziona |
| doppio clic | usa l'oggetto, impugna l'arma, potenzia l'abilità |

Quando hai un punto abilità da spendere, sul pulsante MENU compare un puntino giallo e sulla scheda Personaggio un numero. Dal menu si salta anche al Taccuino.

### Scheda Zaino
- **Borsa** (sinistra): armi e oggetti. Le armi lunghe occupano due caselle, la refurtiva ha il segno rosso e l'arma impugnata il segno giallo.
- **Dettaglio** (centro): nome, descrizione e barre delle statistiche. Il grigio è il valore base, il verde il bonus delle abilità. Sotto c'è il pulsante Impugna o Usa.
- **Nino** a figura intera, con l'arma in mano.
- **Tasca** (destra): le armi rapide 1-5 e i consumabili.

### Scheda Personaggio
- Lista delle 6 abilità. Ognuna ha 5 livelli.
- Dettaglio: cosa fa l'abilità, il valore attuale e quello del livello successivo, e il pulsante Potenzia.
- Livello, barra dell'esperienza, punti da spendere, salute, arresti, abbattuti, debito.

## Regole di gioco

**Esperienza** (il livello successivo richiede 60 + 40 × livello attuale):

| Azione | Esperienza |
| --- | --- |
| Lavoro completato | 40 |
| Mezzo venduto allo Squalo | 30 |
| Rapina a un negozio | 25 |
| Nemico abbattuto (fazioni, polizia, chi ti attacca) | 15 |
| Scippo | 8 |
| Refurtiva venduta | 5 |

Ogni livello dà 1 punto.

**Abilità** (effetto per livello, massimo 5):

| Abilità | Effetto |
| --- | --- |
| Fisico | +15 salute massima, ti riprendi prima |
| Mira | −10% dispersione e rinculo |
| Mani veloci | −10% tempo di ricarica, cambi arma prima |
| Rissa | +20% danno dei pugni, stordiscono di più |
| Volante | +6% spunto e tenuta di strada (solo il tuo mezzo) |
| Parlantina | −8% sui prezzi dello Squalo, +10% sulla refurtiva |

**Oggetti:**

| Oggetto | Cosa fa | Come si trova |
| --- | --- | --- |
| Pronto soccorso | salute piena | la cassetta raccolta quando sei già in salute va nello zaino |
| Bende | +35 salute | 1 all'inizio; scippi e rapine |
| Nazionali (sigarette) | mira ferma per 40 secondi | scippi e rapine |
| Orologio, catenina, radiolina | refurtiva, si vende allo Squalo | scippi (35%) e rapine (50%) |

Per vendere la refurtiva: parla con lo Squalo e scegli «Ti vendo la roba».

## File toccati

- **`game.js`**: nuova sezione `INVENTARIO E POTENZIAMENTI`, con i dati iniziali del giocatore e piccoli agganci in mira, ricarica, pugni, guida, salute, raccolta, scippi, rapine, lavori e dialogo dello Squalo.
  - Funzioni nuove esportate: `ITEMS`, `SKILLS`, `skill`, `maxHp`, `xpNext`, `gainXp`, `upgrade`, `addItem`, `useItem`, `lootValue`, `discount`.
- **`index.src.html`**:
  - CSS `Menu` e pulsante `#menuBtn`.
  - Sezione JS `Menu a tutto schermo`: `toggleMenu`, `renderMenu`, `figure`, `itemIcon`, `quickHeal`.
  - Tasti I/H/1/2.
  - La barra della salute ora segue la salute massima.
- **`porto-vecchio.html`**: build rigenerata, apribile direttamente nel browser.
- **`render.js`**: non toccato.
- Originali in `_backup/` (`*.prima-del-menu.*`). Dettagli tecnici anche in fondo a `HANDOFF.md`.

## Per unirlo a un'altra build (es. Risacca)

1. In `game.js` copia la sezione `INVENTARIO E POTENZIAMENTI`, aggiungi i campi `inv`, `xp`, `lvl`, `pts`, `skills`, `calmUntil` al giocatore in `create()` e le funzioni all'`export` finale.
2. I punti dove le abilità agiscono sono quelli che usano `skill(st, '…')`: cercali nel `game.js` di questa cartella e riporta le stesse righe.
3. In `index.src.html` copia il blocco CSS che inizia con `/* ===== Menu`, il pulsante `#menuBtn`, il contenitore `#menu` e la sezione JS del menu. Poi aggiungi `ui.menu` alle condizioni di pausa e di input, dove compare già `ui.book`.
4. Ricostruisci con `npm i three@0.149.0 && python3 build.py`.

Prove: tutti i `test_*.js` passano come prima. Nel browser nessun errore. Da mobile il menu va in una colonna sola.

## Cosa manca

- La scheda **Banda** non c'è: in questa build la banda non esiste, sta nella build Risacca dell'altra chat. Lo stile è pronto per riusarlo lì.
- La figura di Nino è disegnata a mano. Si può sostituire con il personaggio 3D vero che ruota.
