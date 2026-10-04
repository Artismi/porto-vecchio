# Porto Vecchio — Isola: edifici a moduli, persone, fusti (3 ottobre)

Sorgenti in `src/`, build con `python3 build.py` (ricompone `index.html` da `src/index.src.html`). I modelli restano in `assets/`.

## Cosa è cambiato
- **Edifici a moduli** (`render.js`, sezione `EDIFICI A MODULI`): case, negozi, palazzi civici, magazzini, caserme e masserie sono montati coi moduli del **Kenney Building Kit** (`assets/mk/kit_bkit.glb`) sulla griglia di 2 m. Un modulo di muro = un lato di casella.
  - Misure vere del kit, nessuna deformazione: piano terra 3,6 m (2,4 + fascia delle insegne), piani sopra 2,4 m. Persone 1,8 m.
  - Ordine: un solo tipo di finestra per edificio, ripetuto su tutti i piani e allineato in colonne. Piano terra a ritmo porta/finestra/muro. Retro (nord e ovest) più semplice.
  - Varietà: la tavolozza del kit è ridipinta per edificio (`PALS`: borgo, campagna, porto, militare, civico). Tetti: coppi, ardesia, terrazzi piani con parapetto, lamiera per i magazzini.
  - I vetri del kit sono mesh a parte: diventano finestre accese o spente (di notte si accendono con gli altri emissivi). Persiane liguri, balconi, lesene, pluviale.
  - Restano dipinti come prima: hotel déco del Lungomare, chiese, faro, chioschi, Rocca.
  - Le crepe dipinte sulle facciate funzionano solo sugli edifici dipinti; su quelli a moduli restano schegge, polvere, brecce e stanze sfondate.
- **Persone**: Guardia e Tutela non usano più i soldatini del Toon Shooter. Sono persone del Race kit in divisa (`Models.person`, `who === 'cop'` / `'hazmat'`). Le armi del kit sono agganciate all'osso `Index1R` di tutti (prima i civili e il giocatore armati non mostravano l'arma). Corretto un bug: `visible = undefined` lasciava visibili tutte le armi.
- **Fusti e bombole** (`game.js`, sezione `BARILI E BOMBOLE`): 24 tra fusti di benzina, bombole del gas e bombole da cucina al distributore, al cantiere, al porto, in discarica, al poligono, alla cava, all'officina, all'osteria e alla masseria. Si colpiscono coi proiettili, col fuoco e con l'auto: miccia, scoppio, reazione a catena, evento `esplosione` che la città ricorda. La grafica è in `Models.tick`.
- **Avvio**: `Kit.load()` carica i moduli prima della scena (`main.js`, funzione `boot`).

## Strumenti
- `src/pack_kit.mjs`: rigenera i kit GLB da Kenney (`OUT=assets/mk node pack_kit.mjs bkit rurban`, poi `node glb2json.mjs assets/mk/*.glb` (gli artifact servono solo .json)`). Servono i pacchetti originali.
