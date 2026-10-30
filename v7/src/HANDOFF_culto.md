# Porto Vecchio — La voce del regime: il culto della Calma (24 ottobre)

Richiesta: il regime non perde la sua violenza, ma è caricaturale, stupido e grottesco. Il Garante parla come un tribuno populista gonfio di sé, venerato da una religione tutta sua (niente cristianesimo), e l'apparato è pieno di supercazzole. La follia si legge nelle sue espressioni e nelle reazioni della gente.

## `src/culto.js` (nuovo, si carica dopo `matti.js`)
- **Il discorso delle 20** (`GARANTE`, 32 pezzi, uno diverso ogni sera): `Culto.garante(st)`, usato da `risacca.js`. Superlativi, folle record, nemici coi soprannomi (Lupo il Lento, Rita la Radiolina, Malanotte Malaconcia), il Garante che parla col mare.
- **La TV di casa** (`TV`): `Culto.tv()`, usato da `protagonista.js` 7 volte su 10.
- **Gli altoparlanti** (`ANNUNCI`, 34 comunicati, metà sui temi di oggi (Aria Più, Lira Serena, Calcolatore, Ufficio Umori, il carbone verde, il Muro color pastello), più ordinanze a supercazzola una volta su cinque): ogni 190-360 s, se sei all'aperto, nel riquadro delle notizie. Poco dopo, la persona più vicina (entro 13 m) commenta (`REAZIONI`): ripete la formula, ci crede a metà, ha paura.
- **La supercazzola** (`Culto.supercazzola()`): comma + numero + scappellamento, a caso. La usano le multe dei Grigi in `ordine.js` (una volta su due).
- **11 scene** per `eventi.js`: `lira_serena`, `ufficio_umori`, `delatore_anno`, `preghiera_schermo`, `reliquia`, `convertito`, `sportello`, `nuvola_garante`, `lunga_calma` (viene da te), `controllo_calma` (coi Grigi: parte solo se una pattuglia è vicina), `segnalazione_amore`.

## La religione della Calma
Saluto: «Lunga Calma». Il Garante è il Padre della Calma, non dorme ma «ricarica». I Sette Doveri: Calma, Calma, Rata, Calma, Applauso, Silenzio, e quello segreto (nessuno li sa tutti). Reliquie false (capelli biondi di un Garante calvo), miracoli banali (la fontana che ha toccato), la delazione come gesto d'amore («Ama il tuo vicino: segnalalo»). Nessun riferimento cristiano.

## Righe toccate fuori da culto.js
| File | Cosa |
| --- | --- |
| `risacca.js` | il discorso delle 20 da `Culto.garante`. |
| `protagonista.js` | la TV da `Culto.tv`. |
| `vievive.js` | `TITOLI`: titoli nuovi per il Corriere del Gelo e il Disgelo. |
| `eventi.js` | posto di blocco, parata, pattuglia di notte, Bollettino, arresto: varianti del culto. |
| `ordine.js` | controlli, arresti e multe dei Grigi; slogan delle proteste. |
| `game.js` | frasi dei Grigi negli scontri. |
| `api/_mente.js`, `server.js` | la voce del regime nel prompt. |
| `index.src.html`, `test_eventi.js` | caricano `culto.js`. |

## Prove
`cd src && node test_culto.js [seme]`; `node test_eventi.js [seme]` prova anche le scene nuove.
