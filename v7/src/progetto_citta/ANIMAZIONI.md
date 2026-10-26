# Le animazioni: cosa c'è, cosa manca, cosa non va (26 ottobre)

Il committente: «facciamo un check delle animazioni, quali mancano, quali non vanno bene. La bici quando gira, e quando va in impennata
ad esempio, il personaggio perde le mani dal manubrio, non la segue.» Ramo `animazioni`, righe segnate `[animazioni]`.

## Come è fatto il sistema (per chi ci mette le mani)
- **Clip del kit** (`models.js animPerson`): Idle, Walk, Run (con e senza arma), Punch, HitReact, Death, Wave. La camminata va a
  `velocità / 1,6` (0,55-2,2×), la corsa a `velocità / 5` (0,6-1,6×), soglia corsa 3,5 m/s (3,1 scendendo), dissolvenze graduali.
- **Pose procedurali** sopra la clip (`animazioni.js`, il motore): ossa piegate nello spazio del personaggio, IK a due ossa per braccia
  (`P.reach`, `P.grab`) e gambe (`P.legTo`), strati con dissolvenza (si entra in 0,1 s, si esce in 0,18), limiti delle articolazioni.
- **Le pose**: `anim_vita.js` (~55 pose di vita quotidiana), `anim_lotta.js` (lotta, ferite, stati d'animo, in sella, salto, skate),
  `anim_gesti.js` (gesti da fermi, stretta di mano, pacca), `anim_mano.js` (l'oggetto in mano), `writer_vita.js` (la scala, la tag).
- **Le mappe** (`Anim.npcMap`, `Anim.playerMap`) scelgono la posa dallo stato del gioco, a ogni fotogramma.
- **I mezzi** (`veicoli3d.js`, `render.js`): ruote che girano e sterzano, sospensioni (rollio, beccheggio), pedivelle della BMX.

## La tabella
Legenda: **c'è** ✓ sì · ◐ in parte · ✗ no. **Priorità**: A = si vede subito e rompe l'illusione · B = si nota · C = rifinitura.
«Sistemato» = corretto in questo ramo.

| azione | c'è | come va | problema | priorità |
| --- | --- | --- | --- | --- |
| **Idle** (fermo) | ✓ | clip Idle + respiro, peso che si sposta, sguardo; gesti dopo 8 s (giocatore) e a caso (abitanti) | — | — |
| **Camminata** | ✓ | clip Walk a velocità/1,6, parte da un punto a caso del ciclo, svolte smorzate | sopra 2,2× (3,5 m/s) i piedi scivolano un poco prima della corsa | C |
| **Corsa / scatto** | ✓ | clip Run a velocità/5 (6,4 m/s → 1,28×; 7,8 → 1,56×) | il limite 1,6× lascia scivolare un filo a 8+ m/s (non ci si arriva a piedi) | C |
| **Sincronia passo-velocità** | ✓ | soglie con margine, ritmo che cambia per gradi | — | — |
| **Gradini e scalinate** (a piedi) | ◐ | il corpo sale con la quota del suolo, la clip resta la camminata in piano | niente IK dei piedi sui gradini: i piedi entrano nello scalino o restano sospesi; nessun passo «in salita» | B |
| **Scale per il sottosuolo** (Livelli `scala`) | ◐ | si cambia livello con V, istantaneo | nessuna animazione di discesa | C |
| **Scala a pioli** (tetti) | ◐ → sistemato in parte | posa `scala`: mani e ginocchia a turno | **sistemato**: mani e piedi andavano a tempo fisso (5,2 rad/s) e il corpo saliva 3 volte più veloce dei pioli (scivolava su); ora passano un piolo ogni mezzo ciclo, legati alla quota. Resta: le mani non stringono i pioli veri (niente IK sui pioli) | B |
| **Scavalcare il bordo del tetto** (mantle) | ✗ | in cima alla scala si è teletrasportati sul tetto | nessun passaggio: scatto di 0,5-1 m | B |
| **Salto** (carica, aria) | ✓ | `carica` (accucciato, braccia indietro), `salto` (ginocchia su, braccia) | — | — |
| **Caduta dall'alto / atterraggio** | ◐ | in aria la posa del salto; atterraggio duro = a terra (clip Death) e poi `rialza`, `stordito` | nessuna posa di caduta (braccia che cercano equilibrio); l'atterraggio morbido non piega le ginocchia | C |
| **Seduto** | ◐ | abitanti: `siede`, `siede_terra`, `bancone`, `tavola`; giocatore solo nel tempo che passa (`warp`) | il giocatore non si siede sulle panchine né al belvedere (il belvedere passa il tempo da in piedi) | C |
| **Salire / scendere dall'auto** | ✗ | istantaneo; la portiera si apre | nessuna animazione di entrata/uscita | B |
| **Guida dell'auto** (mani, volante) | ◐ | dentro c'è un guidatore a scatole (`driverMesh`), un solo braccio | il volante non gira, il guidatore non è il personaggio vero; dall'alto si vede poco | B |
| **BMX: pedalata** | ✓ | piedi sui pedali con IK, pedivelle legate alla velocità (rapporto 2,6), ruota libera senza pedalare | — | — |
| **BMX: curva (piega)** | ✗ → **sistemato** | la bici si piegava fino a 0,5 rad (29°) col rollio, il ciclista restava dritto | **le mani uscivano dalle manopole** (misura sotto) e il corpo non seguiva la bici. Ora il corpo è nel telaio, il busto contrappesa un poco | A |
| **BMX: sterzo** | ✗ → **sistemato** | girava solo la ruota davanti; manubrio e forcella fermi | ora forcella, manubrio e tabella girano col cannotto, le mani girano con le manopole; in velocità lo sterzo si vede meno | A |
| **BMX: impennata** | ◐ → **sistemato** | il corpo ruotava con la bici solo per l'impennata | in aria (bunny hop) la bici beccheggiava e il corpo no; sospensioni e pendenza idem. Ora segue tutto | A |
| **BMX: bunny hop, peg** | ✓ | carica, aria (manubrio al petto), piede sul peg | **sistemato**: sul peg il corpo ruotava dopo l'IK (`rz`) e le mani si scostavano; ora la sporgenza è nel bacino | C |
| **Vespa** | ◐ → **sistemato** | `in_vespa`: mani alle manopole, piedi sulla pedana | stessa cosa della BMX in curva (rollio fino a 29°, corpo dritto), manubrio fermo; ora corpo nel mezzo, manubrio che gira | A |
| **Ciao (motorino)** | ✗ → **sistemato** | in sella non si vedeva nessuno (render metteva in sella solo Vespa, BMX, chiatta) | ora la posa `in_vespa` con le misure del Ciao, piedi sui pedali | A |
| **Vespe e Ciao del traffico** | ✗ → **sistemato** | andavano da sole: nessun guidatore (i modelli a due ruote non hanno `ud.seat`) | ora un abitante vero in sella, con la stessa posa, vicino alla camera | A |
| **Chiatta a pedali** | ✓ | posa della BMX, il corpo segue la chiatta | — | — |
| **Skate** | ◐ → **sistemato in parte** | tavola sotto, corpo di traverso alzato di 12 cm | stava in piedi a piedi uniti al centro e spingendo **camminava sul posto** (clip Walk); ora `in_skate`: piedi sui truck, ginocchia piegate, braccia larghe, piede dietro che spinge a terra. Resta: niente pose per grind e grab (il corpo è fermo nei trick) | B |
| **Bomboletta** (graffiti) | ✓ | `vernicia`: braccio verso la punta, nebbia di vernice, testa che segue | — | — |
| **Pennarello** (tag) | ✓ | `tagga`: polso veloce, sguardo alle spalle | — | — |
| **Pugni, guardia** | ✓ | clip Punch + `guardia` coi pugni alternati, `calcio`, `schivata`, `spinta` | — | — |
| **Colpito** | ✓ | clip HitReact + `colpito`, `barcolla` dopo lo spintone | — | — |
| **A terra / morte** | ◐ | clip Death, poi `rialza` e `stordito` | stordito e morto usano la stessa clip; nessuna variante | C |
| **Armi** (mira, ricarica, molotov) | ✓ | `mira` per arma, `ricarica`, `lancia` | — | — |
| **Portare oggetti** | ◐ | `porta` → `tiene` (casse a due mani); `anim_mano.js` per ogni famiglia | qualunque cosa si porti per un lavoro è una cassa | C |
| **Telefono** | ◐ | abitanti: `telefona` | il giocatore non ha un telefono in mano (non c'è nel gioco) | C |
| **Parlare** | ◐ → **sistemato** | abitanti: `parla` (gesti), sguardo a chi parla | il giocatore in dialogo restava impalato e guardava avanti: ora gesticola e guarda l'altro | B |
| **Abitanti: varietà da fermi** | ✓ | ~55 pose con attrezzi, portamento per età e animo, abitudini (fuma, tasche, orologio), gesti casuali, saluti, strette di mano | — | — |
| **Abitanti: fuga, paura** | ✓ | `fuga` (braccia), `rannicchiato`, mani alzate, `paura` | — | — |
| **Polizia** | ✓ | `alt`, `mira`, `ammanetta`, `perquisisce`, `indica` | — | — |
| **Arresto del giocatore** | ✓ | `ammanettato` | — | — |
| **Stati del corpo** | ✓ | `ubriaco`, `postumi`, `freddo`, `ferito`, `stanco`, `rabbia` | — | — |
| **Nuoto** | ◐ | il corpo si corica e affonda fino alle spalle | nessuna bracciata (clip ferma) | B |

**Conti**: 38 voci. Mancavano del tutto **6** (sterzo della BMX, guidatori del traffico a due ruote, giocatore sul Ciao, scavalcare il bordo
del tetto, salire/scendere dall'auto, il corpo che segue la piega sulle due ruote). Andavano male **14** (curva e impennata in BMX, Vespa
in curva, scala a pioli, skate, gradini, guida dell'auto, caduta, seduto, morte, portare, parlare, nuoto, peg).

## La bici, misurata
Misure nel gioco vero (Chromium, `?scorcio=ottagono`, BMX con W tenuto, poi W+A in curva, poi freccia giù): la distanza fra la
manopola (nel mondo) e il pugno (il segmento polso → dito medio) della mano più lontana, e fra il pedale e la caviglia.

| situazione | prima: mani dalle manopole | prima: bacino fuori sella | dopo: mani | dopo: bacino |
| --- | --- | --- | --- | --- |
| BMX dritta, 9 m/s | 3 cm | 1 cm | 3 cm | 1 cm |
| BMX in curva (piega 0,5 rad, sterzo 0,55) | **51-56 cm** | **41-43 cm** | 3 cm | 1 cm |
| BMX in impennata dritta | 3-5 cm | 1 cm | 3-5 cm | 1 cm |
| BMX in impennata in curva | **57 cm** | **41 cm** | 4 cm | 1 cm |
| Vespa in curva | **66 cm** | **49 cm** | 2-3 cm | 1 cm |
| Ciao | nessuno in sella | — | in sella, mani sul manubrio | — |

(3 cm è la manopola dentro il pugno: il centro del pugno sta 2 cm verso il palmo.) Il busto, rispetto alla verticale del mondo,
in curva passa da 26° (dritto mentre la bici era piegata) a 28-35°: si piega con la bici, un po' meno di lei.
Le caviglie stanno a 14-19 cm dal centro del pedale prima e dopo (la caviglia è voluta 3,5 cm sopra e 7 dietro il perno: il
piede ci poggia con l'avampiede); le pedivelle girano con la velocità (rapporto 2,6) solo quando si pedala.

Le foto: `prima_*.png`, `dopo_*.png` e i fogli affiancati `foglio_curva.png`, `foglio_impennata.png`, `foglio_auto.png`,
`foglio_vespa.png`, `foglio_ciao.png` (cartella degli strumenti di chi ha lavorato, non nel repository); lo strumento che le fa
è `anim_foto.js` (avanza il gioco a passi di 1/30 s con G.step, misura nel mondo, scatta).

## Cosa è cambiato (ramo `animazioni`)
- `render.js`: chi è in sella a BMX, Vespa e Ciao è messo **dentro il telaio** del mezzo a ogni fotogramma (posizione e rotazione del
  gruppo del mezzo, più 35 cm): piega, impennata, beccheggio in aria, sospensioni, pendenza. Scendendo la piega si azzera.
  Lo sterzo delle due ruote si vede meno in velocità; manubrio e forcella girano con la ruota (`u.ster`); `v.barA`, `v.rollA` per la posa.
  Le Vespe e i Ciao del traffico hanno un guidatore vero (figlio del mezzo, posa `in_vespa`, entro 70 m dalla camera).
- `veicoli3d.js`: `sterzo()`, il gruppo che gira attorno all'asse del cannotto, per BMX, Vespa e Ciao (fuso in un pezzo solo in `lod3d`).
- `anim_lotta.js`: `grips()` gira le manopole attorno al cannotto con lo sterzo; `in_bmx` e `in_vespa` contrappesano la piega col
  busto, collo e testa (la testa resta più dritta); il Ciao; la posa `in_skate`.
- `anim_lotta.js`: sul peg la sporgenza va nel bacino, prima dell'IK.
- `writer_vita.js`: la scala a pioli legata alla quota. `anim_vita.js`: il giocatore in dialogo. `anim_gesti.js`: niente gesti in skate.
- `test_bmx.js`: la prova della camminata partiva contro un muro (la mappa è cambiata): ora sceglie una direzione libera.

## Cosa resta (stime)
| cosa | stima |
| --- | --- |
| Guidatore dell'auto vero (il personaggio seduto, mani sul volante che gira), al posto delle scatole | 3-4 h (pose sedute ci sono; il volante va tenuto a parte nella fusione dei pezzi, costa una chiamata di disegno per auto) |
| Salire e scendere dall'auto (portiera, gamba fuori, 0,6 s) | 3 h (serve un tempo di salita nella logica di `game.js`) |
| IK dei piedi su gradini e scalinate | 3-4 h (raggio sul suolo sotto ogni piede, `legTo` col bacino abbassato) |
| Scavalcare il bordo del tetto in cima alla scala | 2 h (una fase in `tetti.js climbStep` + posa) |
| Mani sui pioli veri della scala | 1 h |
| Skate: pose per grind, grab e flip | 2-3 h |
| Bracciata a nuoto | 1-2 h |
| Posa di caduta, atterraggio morbido a ginocchia piegate | 1-2 h |
| Il giocatore si siede su panchine e belvedere | 2 h |
| Telefono in mano al giocatore (se il gioco lo vuole) | 1 h |
