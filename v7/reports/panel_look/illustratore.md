# Illustratore / concept artist: la leggibilità come illustrazione

## 1. Diagnosi

Dalle foto (p1_marina, p5_corso, p7_rua, dopo) il quadro non ha una **struttura dei valori**: ha tre masse che si danno fastidio.

- **I tetti** occupano metà dell'inquadratura e sono la massa più vicina all'occhio. Restano medio-chiari, arancioni e **pieni di dettaglio**: in `roofTex1('coppi')` il labbro della tegola è a `shade .62` e la testa a `1.18`, cioè circa ±15% di valore ogni 37 cm. In più ci sono 340 licheni e 40 colature. A distanza di camera quel dettaglio diventa una retina vibrante, cioè rumore. Lo shader NIT li desatura (`tetti .85`), ma la **calma li esclude** (`pl … * (1. - nTet)`): il rumore che si toglie al suolo resta proprio dove pesa di più.
- **Il suolo** in ombra è un blu saturo e molto scuro (L ≈ 0,22, `proTinta #6878c0`): sembra un buco più che una strada. Al sole la piazza è il bianco più alto del quadro e compete coi tetti. Il percorso non ha un valore suo.
- **Il personaggio** non si trova. In p1 l'occhio va prima al ciclista e agli ombrelloni: non c'è un accento riservato.
- **Il sale e pepe**: cartacce bianche e rosse sull'asfalto blu (p5, p7), oggetti di scena con contrasti pieni e la `grana .45`. Ogni pezzo ha lo stesso peso visivo, quindi niente ha peso.

Riferimenti utili: **Untitled Goose Game** (House House, campiture piatte, l'oca bianca unico accento), **Townscaper** (Stålberg: tetti come tinta, ombra al piede, niente texture), **GTA 2** (strada chiara e leggibile, tetti calmi), **Hades** (Jen Zee: ambiente compresso nei medi, personaggi col contorno e la saturazione), **Disco Elysium** (Rostov: pittura sì, ma l'interattivo si accende), **eBoy** (città isometriche: un colore per massa, dettaglio solo dove serve).

## 2. Proposte, in ordine di impatto

**Lo schema dei valori** (luminanza Rec.601 dopo il grading, di giorno):

| Massa | Valore | Saturazione (croma/max) | Rumore ammesso |
|---|---|---|---|
| Tetti | 0,45–0,55 (medio) | ≤ 0,30 | ±0,03 |
| Suolo percorribile al sole | 0,62–0,72 (chiaro) | ≤ 0,25 | ±0,04 |
| Suolo in ombra | 0,34–0,42 | ≤ 0,30 (lilla, mai blu pieno) | ±0,02 |
| Facciate (la fetta visibile) | 0,55–0,75 | pastelli ≤ 0,40 | ±0,05 |
| Personaggio | nucleo ≤ 0,20 oppure accento ≥ 0,6 di croma | — | — |
| Oggetti interattivi | accento riservato | ≥ 0,6 | — |
| Arredo non interattivo | ±0,08 dal suolo su cui sta | ≤ 0,30 | — |

**A. Tetti calmi (il guadagno più grande).**
- In `roofTex1`: labbro `.62 → .86`, testa `1.18 → 1.06`, licheni `340 → 60` con alfa `.25`, colature `40 → 10`. Rappezzi `pz < .13 → < .05`; le zone vecchie `pz > .88 → > .95`.
- Stessa cura per `tegole` (labbro `.55 → .82`) e `ardesia` (`.6/1.22 → .85/1.08`).
- Shader NIT: nella riga della calma sostituire `(1. - nTet)` con `mix(1., 1.3, nTet)` e portare la soglia del segno netto a `smoothstep(.08, .20, dl)` sui tetti. Così il tetto diventa una campitura e il suo ciglio resta.
- `NIT.tetti .85 → 1`, e nella riga dei tetti il valore `lt*.9+.08 → lt*.75+.12` (il tetto va nei medi, stretto).
- Per la scena: tre famiglie al massimo, cotto spento `#B08470`, ardesia `#8C8A88`, lastrico `#C9BCA6`, con uno scarto massimo di ±0,06 L fra tetti vicini.

**B. Il suolo come percorso.**
- `proTintaK .24 → .14` e `proTinta #6878c0 → #7a80b0` (mattino e pomeriggio), così l'ombra sale a circa 0,38: si legge come ombra.
- `NIT.calma .7 → .85`, `NIT.piede .55 → .75` (la casa si stacca dal suolo), `polvere .6 → .35`.
- La strada principale un gradino più chiara (+0,05 L) dei vicoli laterali, con la tinta della pietra e non con oggetti. È la «strada che invita».

**C. Il personaggio e l'interattivo.**
- Un contorno solo sul personaggio: guscio rovesciato, 1,5 px, in `#2a2238`, con un filo di luce `#fff1d8` sopra. Ai piedi un'ellisse di contatto da 1,1 m al 35%.
- `NIT.luce .1 → .14`, `cerchio .62 → .45`.
- Fuori da `rr > 1` la croma ×0,85: un fuoco fatto col colore, che costa zero.
- Gli oggetti interattivi entro 6 m prendono un'unica tinta d'accento riservata (magenta Vice City `#ff4f9a`, a impulso lento 0,8 s). Nessun'altra superficie della scena oltre 0,5 di croma in quel tono.
- Il contorno non va su muri, suolo, arredo e tetti: lì basta `ciglio .7` (linea di 1 px nella tinta d'ombra, già giusta).

**D. Togliere il sale e pepe.**
- `grana .45 → .2`, `varia .6 → .4`, `pittura .55 → .45`, `vivo .7 → .5` (meno arancio nei medi).
- Cartacce: al massimo una ogni 25 m², ±0,05 L dal suolo, mai bianche né rosse pure.
- Arredo (bidoni, cabine, panchine) solo in gruppi appoggiati ai muri, con lo stesso valore del muro; nessun pezzo isolato in mezzo al percorso.
- Inchiostro globale resta `0`.

## 3. Cosa chiedo agli altri cinque

- **Cineasta**: un solo punto d'attenzione per inquadratura, il personaggio nel terzo inferiore. `NIT.vicino .55 → .35`: i tetti sfocati in primo piano oggi si leggono come «bassa qualità», non come profondità.
- **Scenografo**: rispettare la tabella dei valori nei materiali di base, con le tre famiglie di tetti. L'arredo va in grappoli lungo i muri e la diagonale del percorso resta libera e chiara. L'accento magenta è riservato agli oggetti interattivi.
- **Tecnico luci**: le ombre fra 0,34 e 0,42 di L, lilla e non blu cobalto; le luci piene che non superano 0,85 sui tetti; il sole che illumina di traverso (40–55°) così i cigli danno volume.
- **Fotografo**: grading con contrasto sui medi (`proContrasto ≤ 1.06`) e spalla `NIT.spalla .4 → .5`. Nessuna saturazione globale oltre 1,06: il colore pieno resta dell'accento.
- **Animatore**: il personaggio deve leggersi anche come sagoma ferma (pose aperte, braccia staccate dal busto). Gli oggetti interattivi si muovono appena (respiro, bilico); l'arredo resta immobile e i passanti hanno toni spenti (croma ≤ 0,35).
