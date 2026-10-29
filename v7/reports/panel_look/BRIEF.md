# Brief per il panel: il look di Porto Vecchio

## Il gioco
Gioco nel browser (Three.js r149, WebGL), isola italiana nel 1986, città ligure + Vice City (pastelli, neon, palme, tramonti rosa, caruggi, ardesia, bucato). Camera **quasi dall'alto** (vedi foto: pendenza alta, fov 30°), personaggio piccolo al centro. Gira su computer e telefono; deve restare leggero.

Codice: `/home/user/porto-vecchio/v7/src/` (repo: `/home/user/porto-vecchio`, cartella attiva `v7`). Build: `python3 build.py` in `v7`. **Non modificare nessun file del repo**: questo è un giro di consulenza; scrivi solo il tuo rapporto.

## Cosa chiede il committente (le sue parole, tradotte fedelmente)
- «Il videogioco si vede in bassa qualità: serve uno shader leggero che ridia leggibilità, oltre all'effetto cinematografico non ancora raggiunto.»
- «La mappa è pienissima ma piena di imperfezioni: muri che continuano fuori dalle case, bidoni, cabine telefoniche e panchine che affollano le vie, disposti un po' a caso. C'è un po' di tutto e alla fine si perde la leggibilità. La strada non sembra un percorso invitante che ti spinge a proseguire: è rumorosa in modo uniforme, non sai dove guardare, non si percepisce una profondità naturale. Meglio un po' meno, ma ultraleggibile.»
- Dopo il primo giro: «I tetti sono tutti rossi e arancioni e pesano troppo; il suolo non si stacca bene dalle case; non si capiscono volumi e divisioni; è ancora rumoroso.»
- Ora: «Consultiamo un cineasta, uno scenografo, un tecnico luci, un esperto di fotografia, un illustratore e un animatore, e facciamo in modo che collaborino per ottenere il look coerente, pulito, completo e cinematografico che cerchiamo.»

## Stato attuale
- Foto prima/dopo dell'ultimo giro (1280×800, ore 10:30, sereno). Guardale con lo strumento Read:
  - `/tmp/claude-0/-home-user/9ba989a5-c62e-5a30-b5ec-f8aefa50a0b0/scratchpad/nit4/prima/p1_marina.png` e `.../nit4/dopo/p1_marina.png`
  - `/tmp/claude-0/-home-user/9ba989a5-c62e-5a30-b5ec-f8aefa50a0b0/scratchpad/nit4/prima/p5_corso.png` e `.../nit4/dopo/p5_corso.png`
  - altre: `.../nit1/prima/p7_rua.png`, `.../nit1/dopo/p7_rua.png`
- Il passo finale (post-processing) sta in `src/render.js`. Cerca:
  - `const SGU = {`: i quattro momenti del giorno (sole, cielo, controluce, nebbia, esposizione, ombre fredde/luci calde, saturazione, contrasto, vignetta) e `ore`;
  - `SGU.pro = {`: «la proposta» nei materiali (pittura, varia, grana, chiome, ombre, celle, suolo, polvere…) e nel passo;
  - `const NIT = {`: lo shader «nitida» appena aggiunto (prospettiva aerea, fuoco per profondità, quinta, luce che segue il personaggio, sagome, chiarezza, tetti calmi sopra il piano del personaggio, ciglio dei volumi, ombra al piede dei muri, calma del suolo, spalla delle luci);
  - `function sguInit` (il fragment shader del passo unico) e `function sguPasso` (gli uniform a ogni fotogramma);
  - `const AAA =`: tre varianti di look mai scelte (`?look=v1|v2|v3`: golden hour cinematografica ecc.);
  - la curva tonale `CustomToneMapping`.
- La camera: `src/render.js`, cerca `let pitch = lerp(c4p()` e `src/visuale.js`, `src/inquadratura.js`, `src/regia.js`.
- La pulizia della mappa (oggetti di scena, densità) la sta facendo un altro agente in `src/pulizia_rumore.js` e nei posatori: puoi proporre regole, ma non è il tuo cantiere principale.
- Altri documenti utili: `v7/src/HANDOFF_regia.md`, `HANDOFF_ambiente.md`, `HANDOFF_pulizia.md`, `HANDOFF_ispirazione.md`, `HANDOFF_animazioni.md`, `HANDOFF_personaggi.md`, `../HANDOFF.md`.

## Vincoli
- Leggero: un solo passo finale a schermo intero (già c'è), niente nuovi bersagli di rendering pesanti; sul telefono niente letture della profondità.
- Proposte **concrete e attuabili**: valori di manopole esistenti (con nome e valore), colori esadecimali, regole misurabili, pezzi di shader descritti con precisione. Niente generiche.
- Coerenza: un solo look, non tre varianti.
