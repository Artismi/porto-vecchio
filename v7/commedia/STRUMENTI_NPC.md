# Gli strumenti degli NPC: tutto quello che fa il giocatore, lo può fare chiunque (11 novembre)

La richiesta della direzione artistica:
«gli NPC devono avere la stessa libertà d'azione del giocatore dentro le funzioni del gioco: tutto quello che il giocatore può fare
(e tutto quello che un agente potrebbe voler fare), un NPC deve avere lo strumento per farlo. Ogni NPC può diventare giocabile
quando entra nella banda».

Questo è un **inventario con l'analisi delle lacune, più un progetto**. Non c'è codice: nessun file di `src/`, né `build.py`, né
`index.html` è stato toccato. L'impronta dei tasselli l'ho ricalcolata in sola lettura, con le righe di `build.py` fino al calcolo:
è `48196fd63f899c14`.

**In una riga.** Il gioco ha già **quattro cataloghi di verbi**, **quattro cataloghi di roba**, **tre esecutori di piani** e **due
«corpi»** (quello del giocatore e quello dell'abitante). Il giocatore agisce con delle chiusure scritte apposta per lui, che leggono
`st.player`. Gli NPC agiscono con piani a passi più stretti, che spesso **rifanno a mano** la stessa cosa (le ricette e il cantiere di
`iniziative.js`). Per unificare non serve un sistema nuovo: serve una **facciata dell'attore** (la stessa forma per il giocatore e per
l'abitante) e un **registro dei verbi** che metta in fila, come dati, quello che c'è già. `Casa.fai` è il modello: un solo stato, una
sola funzione per tutti, un registro delle operazioni, la messa in opera solo quando c'è qualcuno a guardare.

---

## 0. Il quadro (perché oggi i due mondi non si toccano)

| cosa | dal lato del giocatore | dal lato dell'NPC |
|---|---|---|
| **il corpo** | `st.player` (x, y, face, inv, arms, cur, hand, money, vehicle, indoor, lv, carrying, task) + `st.me` (`protagonista.js:61`: need, home, job, pantry, stash) | `n` (x, y, face, hand, inVeh, inside, room) + `n.pop` (inv, casa, money, need, homeT, emer, near/lod) + `n.ris` (member, auto, task, carry) |
| **i verbi** | `Azioni.playerActions(st)` (`azioni.js:1106`): una lista di `{id, label, run, off}` con chiusure senza attore, **estesa per catena da 15 moduli** (attivita:189, cassaforti:178, mestieri:266, soldi:773, oggetti:1781, protagonista:363, livelli:418, paesaggio:31, sottosuolo:756, tetti:1075, writer_vita:440, writing:594, scontri:631, casa:842 e la base); più i tasti di `main.js:192-235` → `Game.act` (`game.js:878`), `Game.fire` (:957), `Oggetti.act` (`oggetti.js:1742`), `Cantiere`, `Writing.apri` | (1) `Azioni.VERBS` (`azioni.js:443-479`, 34 verbi con `can`/`plan`, entrata `intend` :484); (2) `Risacca.VERBS` (`risacca.js:128-185`, ~55 verbi per la banda, `plan` :409, `order` :870 con la volontà `will` :358); (3) `Iniziative` `V` (`iniziative.js:218-330`, 19 atomi con `prova`/`fine`); (4) `Casa.fai` (`casa.js:503`, 12 verbi) |
| **la roba** | `st.player.inv` con le chiavi di `Oggetti.CAT` (`oggetti.js:42`); `p.arms` (le armi di `Game.WEAPONS`); `st.ris.inv` (le risorse `Risacca.RES`, `risacca.js:19`, tradotte da `RIS2ITEM` :1083) | `n.pop.inv` / `n.pop.casa` (chiavi `Oggetti.CAT` tramite `Scambi.take/put`, `scambi.js:34-40`, e chiavi `Azioni.ITEMS`, `azioni.js:55`); `Economia.MERCI` (`economia.js:23`) per le botteghe; `n.ris.carry` |
| **l'esecuzione** | immediata (la chiusura `run` cambia lo stato e torna con il messaggio) o `p.task` a tempo (`playerTick`, `azioni.js:1149`: scava, dipingi) | `Azioni.startPlan/runPlan` (`azioni.js:184/208`: passi `S.go/S.do/S.home/S.drive`, :272); `Risacca.runTask` (`risacca.js:1051`: passi `go/hold/meet/inside/sleep/work/do`); le scene di `Casa` (`casa.js:576 inScena`) |
| **«giocabile»** | — | **non esiste un cambio di corpo.** Giocabile oggi vuol dire `n.ris.auto === false` (`casa.js:320`, `risacca.js:889`): il membro non decide da solo e aspetta gli **ordini** (pannello, chat, Parola). È un burattino a parole, non un corpo con i tasti |

Le conseguenze:
- un verbo nuovo del giocatore (per esempio «Ridipingi la stanza») **non esiste** per gli NPC finché qualcuno non lo riscrive come passo
  di piano (`casa.js` l'ha fatto al contrario: prima i verbi per tutti, poi il menu);
- le funzioni ricche (`Oggetti.craft`, `Oggetti.buy`, `Cantiere.place`, `Guardaroba.wear`, `Livelli.dig*`) leggono `st.player` o
  `O.inv(st)` dentro una chiusura (`oggetti.js:912 inv`, `:940 p_`, `cantiere.js:192 lvOf`, `guardaroba.js:281 bag`): da fuori non
  si possono far chiamare da un abitante senza toccarle;
- `iniziative.js` per far fare le ricette e la capanna nel bosco agli NPC **le ha riscritte** (`passiRoba` :388 rifà `craft`,
  `apriCantiere` :463 rifà `Cantiere.place`): funzionano, ma il codice è doppio e diverge (niente usura degli attrezzi, niente
  postazioni a pagamento, niente sgombero degli alberi).

---

## 1. Inventario: tutto quello che fa il giocatore

Legenda della colonna **legato**: **S** = legge direttamente il giocatore, la camera o l'input (`st.player`, `st.me`, `O.inv(st)`,
`R.screenToGround`, la tavoletta); **p** = la logica accetta già un attore, ma l'ingresso è del giocatore; **N** = non legato.

### 1.1 Muoversi, entrare, i livelli

| verbo | ingresso (file:riga) | input | cosa cambia nel mondo | legato |
|---|---|---|---|---|
| camminare, correre, girarsi | `main.js:309 input0` → `game.js:1870 movePlayer` | tasti/levetta/clic, la base della camera (`R.camBasis`) | `p.x/y/face/vx/vy` | **S** (la direzione è relativa alla camera) |
| andare dove clicchi | `main.js:514 clickRun`, `clickInput` | il punto a terra sotto il cursore | `p.path` | **S** |
| saltare (tenuto: carica) | `main.js:202` → `game.js:1828 jumpHold` | spazio | `p.jcharge`, la quota | **S** |
| entrare da una porta / uscire | `main.js:377 ctxE` → `game.js:878 act('porta')` → `:273 enterBuilding` / `:280 exitBuilding` | la porta davanti (`doorFront`, `:817 actionKey`) | `p.indoor = {b, f}`, `p.x/y`, `HOOKS.indoor` | **S** (`enterBuilding` lavora su `st.player`) |
| scale, botole, sali/scendi | `main.js:214` → `livelli.js:382 key`, `:351 climb` | V, J, K, N | `p.lv`, la mappa del sottosuolo | **S** |
| scavare (botola, cunicolo, stanza, avanti, a clic) | `livelli.js:395 actions`, `:158 digHatch`, `:171 digWall`, `:183 digAhead`, `:286 digRoom`, `:251 digTo` | la posizione del giocatore | `Livelli.S(st).ug`, i portali | **S** |
| prendere il treno della miniera | `sottosuolo.js:585 board`, `:756` (menu) | essere sotto, alla banchina | `p.lv`, la posizione | **S** |
| sedersi al belvedere, salire sui tetti | `tetti.js:1075` (menu `belvedere`, `tetto`) | il posto vicino | la posizione, il tempo | **S** |

### 1.2 I mezzi

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| salire sul proprio mezzo / scendere | `main.js:226 F` → `game.js:878 act('veicolo')`, `:848 exitVehicle` | il mezzo più vicino (`nearestVehicle`, :819) | `v.rider = 'player'`, `p.vehicle` | **S** |
| rubare un mezzo parcheggiato | `game.js:878` (ramo `!v.lent && !v.mine`) | F (con `GUIDA2`: tenuto, `isTheft`) | `v.mine/stolen`, evento `furto_auto/vespa`, il timer `discoverVehicle` | **S** |
| tirare giù l'automobilista | `game.js:878` (ramo `v.traffic`) | F davanti all'auto lenta | crea l'NPC automobilista (`makeNpc`), `furto_auto`, panico | **S** |
| guidare (gas, sterzo, freno a mano, spinta) | `main.js:309 input0` → `game.js:2182 driveVehicle` | tasti/levetta/pad, il cursore | `v.x/y/ang/speed` | **S** |
| BMX dalla tasca, i trick | `main.js:434 doBmx` → `game.js:864 bmx`, `:1852 bmxTricks` | P, C/Q/E | crea il mezzo `bmx` | **S** |
| clacson, radio | `main.js:206-208` | H, R | `st.sfx`, `A.radio` | **S** |
| officina del covo (motore, assetto, nitro, corazza) | `cantiere.js:606 autoUp` | il mezzo parcheggiato accanto | `v` potenziato, materiali dalle tasche | **S** |
| rivernicia l'auto e cambia la targa | `attivita.js:180 actions` (`ar_vernice`) | essere all'officina | `v.color`, la targa | **S** |

### 1.3 Combattere

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| sparare, lanciare (molotov) | `main.js` (clic/destro/pad) → `game.js:957 fire` → `:1008 shoot(st, s, wid, ang, spread, who)` | la mira (`aimAngle`, `aggancio7`) | proiettili, danni, `emit` | **S** all'ingresso, **p** in `shoot` (accetta `s`/`who`: lo usa anche l'NPC a :1777) |
| pugno (G), ricarica (R), cambia arma (Q, 1-5) | `main.js:231-233` → `game.js:951 reload`, `:942 switchWeapon` | tasti | `p.cur`, `p.arms` | **S** |
| impugnare / mani libere | `tasche_ui.js:148 equip` → `azioni.js:1096 playerEquip` | la scheda Tasche | `p.hand`, `p.cur` | **S** |

### 1.4 I crimini

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| scippo, rapina al negoziante | `main.js:397 eDown` (E tenuto 0,8 s) → `game.js:878 act('scippo')` | l'NPC entro 1,8 m, il negoziante (`shopkeeperHere`) | `p.money`, `tg.robbedAt`, `st.robbed`, evento | **S** |
| borseggio (da dietro) | `oggetti.js:1730 here` → `:1471 pickpocket(st, id)` | l'NPC entro 1,4 m | la roba passa dalle tasche dell'NPC a quelle del giocatore, testimoni | **S** (`p_(st)`) |
| forzare la cassa, rapinare la cassa | `attivita.js:180` (`cassa_forza`, `cassa_rapina`) | essere in bottega | la cassa della bottega, `p.money` | **S** |
| cassaforte (cerca la combinazione, stetoscopio, trapano, dinamite, minaccia) | `cassaforti.js:89 actions` | essere vicino alla cassaforte, l'attrezzo | `safeCash`, `p.money` | **S** |
| bancomat, caveau, portavalori, rapina allo sportello | `soldi.js:605 act`, menu :773 | il posto, l'attrezzo | `st.soldi`, `p.money` | **S** |
| i colpi (armi, serre, la Famiglia), la barricata | `scontri.js:599 actions`, :631 | il posto | `st.sc`, `st.ris.cassa` | **S** |

### 1.5 I corpi (azioni.js, il menu QUI, ADESSO)

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| sollevare, posare | `azioni.js:1121`, `:1114` → `:178 pickUp(st, n, c, mode)` / `:179 putDown` | il corpo entro 1,9 m, le mani libere | `c.corpse.leader/mode/carriers` | **p** (`pickUp` accetta `'player'` o `n`) |
| nel bagagliaio, in mare, nel cassonetto, nella fossa, bruciarlo | `azioni.js:1115-1119` → `vanish` (:825), `bury` (:817) | il posto vicino (`WATER`, `BINS`, `BURN`, la fossa) | il corpo sparisce, i testimoni (`watchPlayer` :1145), il timer di riemersione | **p** (`vanish`/`bury` accettano un attore) |
| frugare un morto, tirare fuori dal bagagliaio | `azioni.js:1123`, `:1125` | il corpo | `p.money`, `c.corpse.robbed` | **S** |

### 1.6 La roba

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| raccogliere da terra (armi, soldi lasciati) | `game.js:1373 updatePickups` (automatico, passandoci sopra) | la distanza | `st.pickups[k].takenAt`, `p.arms`, `p.money` | **S** |
| prendere la pala / la carriola dove sta | `azioni.js:1139-1140` | il posto (`ITEMS.pala.take`) | `p.inv` | **S** |
| comprare (catalogo di Azioni: coltello, pala, benzina…) | `azioni.js:1141` | il negozio vicino | `p.inv`, `p.money`, la scorta (`ECO.has`) | **S** |
| comprare, vendere al banco | `oggetti.js:1742 act('compra'/'vendi')` → `:1504 buy(st, k, g, q, mode)`, `:1523 sell` | la bottega, la merce, la quantità | la scorta, la cassa (`tillMove`), `p.money`, `p.inv`, il peso | **S** |
| usare (mangiare, bere, medicarsi) | `oggetti.js:1168 consume(st, id)` | l'oggetto | `st.me.need`, `p.hp`, `p.inv` | **S** (`st.me`) |
| buttare, depositare, prelevare (base) | `oggetti.js:1742` (`butta`, `deposita`, `preleva`) | la base vicina | `p.inv` ↔ `b.stock` | **S** |
| aprire un contenitore, prendere, prendere tutto, posare dentro | `bottino.js:269 pick` → `oggetti.js:1284 openC`, `:1296 takeFrom`, `:1487 putInto`, `:1765 pickGone` | il contenitore cliccato (`contByRef`) | il contenitore, `o.taken` della pianta, chi ti vede (`caught`) | **S** |
| cercare in giro | `oggetti.js:1408 search` | il posto | `p.inv` | **S** |
| scambiare, barattare con un NPC | `oggetti.js:1543 barter(st, id, offer)` | l'NPC entro 2,6 m, l'offerta | le tasche di tutti e due (`npcBag` :1535, `valueOf` :1536) | **S** (il giocatore è sempre uno dei due) |
| il baule del covo | `cantiere.js:623 baulePut`, `:624 bauleTake`, `:625 bauleAll` | essere al baule | baule ↔ `p.inv` | **S** |
| vestirsi, svestirsi, cambiare ordine, tenere in mano | `guardaroba.js:285 wear(st, id, at)`, `:295 unwear`, `:303 move`, `:308 strip`, `:315 hold` | la scheda del guardaroba | `Oggetti.S(st).worn` (uno solo per tutta la partita), `p.inv` | **S** |

### 1.7 Fare e costruire

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| **fare una ricetta** (142 ricette, 18 postazioni) | `menu_ui.js` scheda Crafting → `oggetti.js:1742 act('fai')` → `:1123 craft(st, id, times)` | la ricetta, le volte | `pools` (:1079: tasche + base + baule), l'usura degli attrezzi (`wearTools`), il pagamento della postazione, **`passTime` (:1152): fa girare il mondo per i minuti della ricetta**, la soffiata (`suspicious`) | **S** |
| piantare il campo | `cantiere.js:186 claim` | la posizione | `st.covo.covi` | **S** |
| **piazzare, spostare, togliere una costruzione** (114 voci del catalogo `B`, `cantiere.js:36`) | `cantiere.js:1178 onClick` → `:390 canPlace`, `:414 place`, `:433 lift`, `:438 remove` | il pezzo, il punto (il fantasma sotto il cursore), la rotazione | `st.covo.obj`, le caselle (`G.setTile` → BLD), i materiali (`pay` :203, `refund` :208), lo sgombero (`terrainDo` :228), i lavori della banda (`addJob` :550) | **S** (`lvOf` :192, `covoOf`, `hasTool` leggono `st.player`) |
| terreno: disbosca, cava, spiana, sterra | `cantiere.js:228 terrainDo` | la casella | `G.setTile`, la legna/la pietra nella borsa | **p** (accetta `bag`) |
| orto: zappa, semina, annaffia, raccogli | `cantiere.js:455 cropDo`, `:445 cropCheck` | la casella | `S(st).crops` | **S** |
| scavo «da edificio» sotto terra | `cantiere.js:515 placeDig`, `:505 canDig` | la sagoma | il sottosuolo | **S** |
| arredare casa (ridipingi, sedia alla finestra, metti in casa, butta) | `casa.js:822 azioniGiocatore` → `:503 Casa.fai(st, 'player', bi, v, dati)` | essere in casa propria | la pianta `Interior.layout(b).floors[f]`, `st.casa.case[bi].ops` | **N** (lo stesso verbo di tutti) |
| abbattere un albero (paesaggio) | `paesaggio.js:25 actions` | l'albero vicino, l'ascia | la vegetazione | **S** |

### 1.8 I muri

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| col gesso / col pennello | `azioni.js:1135` → `p.task` → `:1149 playerTick` | il muro entro 14 m (`WALLS`) | `st.pop.walls` (lo stesso registro dei muri degli abitanti) | **S** all'ingresso, stato **condiviso** |
| la bomboletta: la tavoletta (tag, throw-up, pezzo, burner) | `azioni.js:1135` → `writing.js:2101 apri`, `tavola_ui.js`, `writing.js:2471 release`, `:506 finish` | il disegno a mano, la rotella (la misura), il colore | `Writing.S(st).works` | **S** (UI) |
| le missioni da writer (il segno, la famiglia, la città) | `writer_vita.js:440` (menu), `writing.js:594` (la crew) | il posto | `Writing.S(st)`, i rank | **S** |
| attaccare i manifesti | `azioni.js:1136` | manifesti + colla | `st.pop.walls`, `p.inv` | **S** |

### 1.9 Parlare, la banda, la vita

| verbo | ingresso | input | cosa cambia | legato |
|---|---|---|---|---|
| parlare (la chat della Risacca) | `main.js:376 talkNear` / `:375 talkTo` → `risacca_ui.js:226 openChat`, `:170 doHere` | l'NPC vicino, il testo | con `?commedia`: `Parola.rispondi` (`parola.js:908`) → l'ordine | **S** (la UI) |
| il dialogo classico, i lavoretti | `main.js:688 openTalk` → `game.js:1226 talk`, `:1251 talkChoice` | la scelta | `st.job`, `n.op` | **S** |
| ordinare a un membro, la linea, l'autonomia | `risacca_ui.js` pannello → `risacca.js:870 order(st, n, verb, args)` | il verbo e gli argomenti | `n.ris.task` (`assign` :858) | **p** (`order` è dell'NPC, chi ordina è il giocatore) |
| reclutare | chat «unisciti» → `risacca.js:826 join`; con `?commedia` il costo di `parola.js` (fiducia, promessa mantenuta) | — | `n.ris.member` | **p** |
| telefonare (Guardia, ambulanza, alla banda) | `azioni.js:1130-1133` | il telefono in mano | `callGuard` (:623), il feed | **S** |
| fotografare | `azioni.js:1137` | la fotocamera in mano | `emitSeen('foto')` | **S** |
| scavare una fossa | `azioni.js:1128` → `p.task` | la pala in mano, la terra morbida | `st.pop.holes` | **S** |
| la vita di Nino: lavora, mangia, bevi, fuma, lavati, dormi, la spesa, la TV, il flipper, offri, ascolta, nascondi la roba | `protagonista.js:235 myActions` | il posto (casa, bar, lavoro) | `st.me` (need, job, pantry, stash), `p.money`, il tempo (`warp`) | **S** |
| il mestiere di Nino (le abilità del lavoro) | `mestieri.js:266` (menu) → `:198 perform(st, a, id, side)` | l'abilità | dipende dall'abilità | **N** (`perform` è «uguale per tutti», `isP(a)`) |
| jukebox, freccette, poligono, camerino, sedersi in auto | `attivita.js:180 actions` | il posto | `p.money`, lo svago | **S** |
| banco, cassa comune, lotto, macchinette, bisca | `soldi.js:605 act`, :773 | il posto | `st.soldi`, `p.money`, `st.ris.cassa` | **S** |
| comprare e vendere sotto, aprire le casse | `sottosuolo.js:671 buy`, `:680 sell`, `:661 openCrate` | essere sotto, al banco | le scorte del sotto, `p.inv` | **S** |

In tutto: **circa 120 verbi** per il giocatore (contando le varianti del menu), di cui **5 già senza attore fisso** (`Casa.fai`,
`Mestieri.perform`, `pickUp/putDown/vanish/bury`, `Game.shoot`, `Cantiere.terrainDo`).

---

## 2. Inventario: cosa fanno già gli NPC, e da dove passa

| strada | dove | cosa sa fare | forma | lontano dal giocatore |
|---|---|---|---|---|
| **la giornata** | `popolo.js:581 planDay`, `:691 blockNow`, gli oggetti intelligenti `OGG` (:164), i giri della malavita `GIRI` (:145) | casa, lavoro, bar, chiesa, spesa, sport, panchina: il blocco della giornata | blocchi orari | sì: `P.near/P.lod` (`:736-773`, tetto `CFG.maxNear = 84`), lontano `snapFar` |
| **i progetti** | `popolo.js:1311 PROJ` (lavoro, debito, affitto, compagnia, notizie, tutela, cero, vendetta, pesca, carte, lettura, politica, musica, foto, ballo, fede, sport, cinema, motori, cucina, campagna, mare, eleganza, arte, chiacchiere), `:1398 startProject` | i passi di una passione o di un bisogno | piano di `Azioni` | sì |
| **gli appuntamenti** | `popolo.js:873 appoint` | prendere e mantenere un appuntamento | `P.appt` | sì (`apptArrived`) |
| **dipingere un muro** | `popolo.js:1509 paintWall`, `:1488 sketchFor` | il muro dipinto, la voce, il fermo | diretto | sì |
| **gli imprevisti (il catalogo)** | `azioni.js:443 VERBS` + `:483 can` + `:484 intend` | vai, guida (il proprio mezzo), prendi, impugna, riponi, compra, uccidi, picchia, minaccia, trasporta, sbarazzati, scava, telefona, pulisci, barrica, attacca, scrivi_muro, fotografa, ruba (scippo, borseggio, taccheggio, scasso, auto), vendi, spaccia, mangia, fruga, scappa, nasconditi, costituisciti, soccorri + sociali (chiacchiera, sfotti, apprezza, offri, regala, gioca, litiga: `social` :732) | `can` → `plan` → passi `S.*` → `startPlan` (:184) / `runPlan` (:208) | **sì, già a livelli**: `watched` (:206) cammina davvero entro `CFG.sceneR`, se no arriva dopo il tempo di strada (:226) e i `do` durano il tempo di gioco (`elapsed` :207) |
| **le reazioni** | `azioni.js:911 react` | davanti a un fatto: scappa, chiama, aiuta, piange, fruga, affronta, nasconde | **utilità**: `add(label, punteggio, fn)` e si sceglie | sì |
| **la banda** | `risacca.js:128 VERBS`, `:409 plan`, `:858 assign`, `:1051 runTask`, `:1230 autonomy`, `:1183 candidates`, `:358 will` | ~55 verbi (vai, seguimi, porta, deposita, ruba, sorveglia, lavora, contrabbando, produci, scrivi_onda, volantina, sabota, occupa, costruisci, allestisci, scassina, scasso, lancia, fotografa, ricatta, scava, inchioda, dipingi, picchia, arreda, ripara, pesca, rovista, bisca…); estesi con `EXT.plan` / `EXT.do` (`covoLavoro` cantiere:1301, `mestiere` mestieri:260, `arruola` fazioni:365, `pa_colpo/pa_carica/pa_recluta` parola:1556-2191) | passi `go/hold/meet/inside/sleep/work/do` in `n.ris.task` | in parte: `walkTo` sempre, nessun salto a tempo |
| **lo scambio** | `scambi.js:104 deal`, `:196 promise`, `:231 askHelp`, `:153 sellOff`; `economia.js:109 buy(st, n, t, g, q)` | comprare, vendere, promettere, chiedere aiuto, la bottega | diretto | sì |
| **il mestiere** | `mestieri.js:198 perform(st, a, id, side)` | le abilità del lavoro (stampa, tessere false, ripara…) | **lo stesso del giocatore** | sì |
| **il lavoro delle botteghe** | `oggetti.js:1569 produceHour`, `:1578 workHour` | le ricette di chi lavora (`JOBPROD`), le scorte | astratto, ogni ora | sì |
| **i writer** | `writing.js:358 npcWork`, `:388 addWork`; `writer_vita.js:193 mission`, `:244 bombing`, `:362 planNight`, `:378 runNight` | tag, throw-up, pezzi, il treno | il pezzo nasce già fatto (`prog: 1, done: true`) o in cammino | sì (la notte si pianifica in blocco) |
| **il cantiere del covo** | `cantiere.js:553 jobsStep`, `:573 jobDone` | la banda tira su quello che **il giocatore** ha piazzato, sgombra, livella | `n.ris.task` con `do: covoLavoro` | sì |
| **combattere** | `game.js:1777` (l'NPC spara con `shoot`), `:2664 npcThrow`; `azioni.js:572 brawl`, `:514 fightTick` | sparare, lanciare, la rissa | diretto | `resolveFar` (:553) |
| **le scene** | `eventi.js` (`run`, `SCENE`), `matti.js` | i quadretti scritti | scene | no (solo vicino) |
| **la vita fra loro** (`?commedia`) | `vita.js:836 scambio(a, b, intento, dati)`, `:318 registraIntento`, `:70 fatto` | regali, prestiti, furti, debiti, appuntamenti, racconti fra due NPC, con le battute dopo il fatto | intento → `esito` col motore → battute | sì (il fatto resta, le battute no) |
| **le iniziative** (`?commedia`) | `iniziative.js:218 V` (lotteria, vendi, gara, gioca, fila, esibisci, protesta, corteo, dipingi, colletta, pesca, raccogli, fabbrica, costruisci, tavolata, tesoro, baratto, tuffo, offri, regala), `:489 componi`, `:517 prova`, `:536 proponi`; la roba: `:350 procura` (ricerca all'indietro, profondità 2: raccogli → fai → compra → fatti prestare), `:388 passiRoba`; il cantiere: `:463 apriCantiere`; i muri: `:783 crossa`, `:793 ripassa`; i bisogni `:866` | atomo verbo × oggetto × posto, **prova a secco**, poi `Azioni.startPlan` | sì (`NOPE`: la prova fallita non si rifà per 4 ore) |
| **la casa** (`?commedia`) | `casa.js:503 fai`, primitive `Casa.M` (:350), `:527 mettiInOpera`, `:576 inScena`, `:322 puo` | finestra, tv, scambia, posa, pianta, butta, dipingi, pavimento, sporca, riordina, ospiti, prendi | **lo stesso verbo per giocatore, abitante e membro**; registro `ops` | **sì, il migliore**: lontano le righe si accumulano, la pianta si fa solo quando serve |
| **la parola** (`?commedia`) | `parola.js:345 capisci`, `:441 verifica`, `:908 rispondi`, `DEF` (:374) con i «motori» `task` / `piano` / `appt` / `impresa` / `subito` / `veglia` / `niente` | dalla frase all'intento, la verifica a secco, poi la battuta dall'esito | un **dispatcher** verso le strade di sopra | — |
| **la regia delle battute** (`?commedia`) | `commedia.js:640` (il setter di `n.bark`), `:580 filtra` | non agisce: filtra quello che si dice | — | — |

---

## 3. Le lacune, verbo per verbo

**Strada NPC oggi**: **nessuna** = l'NPC non lo fa mai; **parziale** = lo fa per un'altra strada, più povera o diversa; **uguale** =
stessa funzione e stesso stato del giocatore.

| verbo | strada del giocatore | strada NPC oggi | cosa impedisce di unificare |
|---|---|---|---|
| camminare, andare in un posto | `movePlayer` (input) | **parziale**: `G.goTo/stepAlong` (Azioni), `walkTo` (Risacca), salto a tempo lontano | l'input del giocatore è relativo alla camera; manca un `vai(attore, punto)` unico per i due esecutori (Azioni e Risacca camminano in modo diverso) |
| entrare, uscire da una porta | `enterBuilding` (`game.js:273`) | **parziale**: `n.inside = true` (nessuna porta, nessun piano); dentro casa solo con il giocatore allo stesso piano (`popolo.js:2000 roomStep`) | `enterBuilding/exitBuilding` scrivono su `st.player`; per l'NPC manca `n.indoor = {b, f}` (c'è solo `n.inside` booleano e `n.room`) |
| scale, botole, sottosuolo, scavare | `Livelli.key/dig*` | **nessuna** (i membri «scava» di Risacca fanno una buca astratta per le scorte) | `Livelli` legge `st.player` dappertutto; manca la posizione verticale `lv` per l'NPC |
| salire / scendere dal proprio mezzo | `act('veicolo')`, `exitVehicle` | **parziale**: `Azioni` `guida` (:445, `enterVehicle` :204, `leaveVehicle` :203) solo col proprio mezzo e solo dentro un piano | due funzioni diverse; l'NPC al volante non usa `driveVehicle` (si teletrasporta lungo il percorso in `driveStep` :244) |
| rubare un mezzo | `act('veicolo')` (furto, automobilista tirato giù) | **parziale**: `ruba` modo `auto` (`azioni.js:659`) | effetti diversi (il giocatore emette `furto_auto` col timer del padrone, l'NPC no); manca un `ruba_mezzo(attore, v)` comune |
| BMX, trick, clacson, radio | `bmx`, `bmxTricks` | **nessuna** | puramente da input; per un NPC servirebbe solo l'effetto (il suono, il passaggio) |
| sparare, lanciare | `fire` → `shoot(who)` | **uguale nella fisica** (`shoot` :1008), **parziale** nella scelta (l'IA del combattimento è solo dei nemici e delle guardie) | la mira legge camera e cursore; i colpi sì, la decisione no |
| impugnare, mani libere | `playerEquip` | **uguale** nella sostanza (`Azioni.equip` :112, `S.equip/S.free`) | due funzioni (`p.cur`+`p.hand` contro `n.hand`) |
| scippo, rapina al negoziante | `act('scippo')` | **parziale**: `ruba` scippo/borseggio (`stealSteps` :656) con soldi astratti, `scasso` notturno (`popolo.js:832`) | `act` legge `st.player`; i premi sono diversi (il giocatore prende 15-45, l'NPC `5+…`); nessun `rapina` del negoziante per l'NPC |
| borseggio (la roba vera) | `Oggetti.pickpocket` | **parziale**: `ruba` borseggio solo soldi | `pickpocket` legge `p_(st)`; la roba dell'NPC c'è (`npcBag`) ma non passa |
| cassa, cassaforte, bancomat, caveau, portavalori | `attivita`, `cassaforti`, `soldi`, `scontri` | **nessuna** (la banda ha `scasso` e `bisca` astratti) | tutto a menu, tutto su `p.money`; manca la versione senza UI |
| corpi: solleva, posa, sbarazzati | menu di `azioni.js:1110-1125` | **uguale** (`pickUp/putDown/vanish/bury`, verbi `trasporta`/`sbarazzati`) | niente: è il pezzo più unificato del gioco; manca solo che il menu passi dal catalogo |
| raccogliere da terra | `updatePickups` (automatico) | **nessuna** (l'NPC non raccoglie le armi lasciate) | automatico su `st.player`; serve un `raccogli(attore, pickup)` |
| comprare | `Oggetti.buy` (`:1504`) e il catalogo di `Azioni` (:1141) | **parziale**: `Economia.buy(st, n, t, g, q)` (`economia.js:109`) **toglie i soldi e la scorta ma non dà la roba** (ci pensa chi chiama: `metti`, `Scambi.put`); `Azioni.getItem` (:281) | tre funzioni; due cataloghi (`Azioni.ITEMS` / `Oggetti.CAT`); `Oggetti.buy` legge `p_(st)` e il peso del giocatore |
| vendere | `Oggetti.sell` | **parziale**: `vendi` (`sellSteps` :689: ricettatore), `Scambi.deal/sellOff` | come sopra |
| usare (mangiare, bere, medicarsi) | `Oggetti.consume` → `st.me.need` | **parziale**: `mangia` (`eatSteps` :701), i bisogni di `popolo` (`n.pop.need`) | `consume` legge `st.me`; i nomi dei bisogni coincidono quasi (fame, sonno, igiene, svago, compagnia) |
| butta, deposita, preleva | `Oggetti.act` | **parziale**: `deposita`/`porta` (Risacca, `st.ris.inv`) | `inv(st)`; le basi hanno due depositi (`b.stock` e il baule del cantiere) |
| contenitori: apri, prendi, posa | `openC/takeFrom/putInto/pickGone` | **parziale**: `Casa` verbo `prendi` (il ladro), lo scasso | `takeFrom` legge `p_(st)` e lancia `caught` contro il giocatore |
| scambio, baratto | `Oggetti.barter` | **parziale**: `Iniziative` `baratto`, `Scambi.deal` | il giocatore è sempre una delle due parti |
| vestirsi | `Guardaroba.wear` | **nessuna** | un solo guardaroba per partita (`Oggetti.S(st).worn`); il vestito dell'NPC è il suo `look` (`personaggi.js`, da non toccare): servirebbe un `n.pop.worn` che il disegno legge solo se c'è |
| **fare una ricetta** | `Oggetti.craft` | **parziale** (rifatta): `iniziative.js:388 passiRoba` (`fai`, `raccogli`), `produceHour` di chi lavora | `craft` legge `st.player`, **chiama `passTime` (fa girare il mondo)**, paga col denaro del giocatore, `suspicious` cerca chi sta vicino al giocatore; la copia di `iniziative` non usura gli attrezzi e non conosce le postazioni |
| **costruire** | `Cantiere.place` | **parziale** (rifatta): `iniziative.js:463 apriCantiere` (solo fuori città, rotazione 0, niente sgombero); la banda esegue i lavori (`jobsStep`) | `canPlace/place` leggono `st.player` (`lvOf`, `covoOf`, `hasTool`); `pay` usa `O().inv(st)`; i covi sono solo del giocatore o della Risacca |
| togliere, spostare una costruzione | `Cantiere.lift/remove`, `grabMove` | **nessuna** | `refund` restituisce al giocatore |
| terreno, orto | `terrainDo`, `cropDo` | **parziale**: la banda (`jobDone` :573 → `terrainDo` con il baule) | `cropDo` legge il giocatore; `terrainDo` va già bene (`bag` come argomento) |
| **arredare, ridipingere casa** | `Casa.fai(st, 'player', …)` | **uguale** | niente: è il modello |
| scrivere sul muro (gesso, pennello, manifesti) | `p.task` → `st.pop.walls` | **uguale nello stato** (`scrivi_muro` `wallSteps` :635, `attacca`, `paintWall`) | solo l'ingresso: due codici che scrivono la stessa voce |
| graffito con la bomboletta | `Writing.apri` (la tavoletta) | **parziale**: `npcWork/addWork` (il bozzetto pensato da `WA.conceive`) | il giocatore disegna a mano: la versione senza UI esiste già (`npcWork`), manca che il giocatore-NPC della banda la usi |
| telefonare, fotografare | menu (mano) | **uguale nella sostanza** (`telefona` → `phoneSteps` :598, `fotografa`) | due ingressi, `emitSeen` contro `watchPlayer` |
| scavare una fossa | `p.task` (`scava`) | **uguale nella sostanza** (`scava` :456) | due ingressi |
| parlare a qualcuno | la chat (UI) / `talk` | **parziale**: `social` (:732), `Vita.scambio` (frasi fra due NPC), la Mente | la chat è del giocatore verso un NPC; NPC → NPC c'è, NPC → giocatore solo nelle battute (`convivenza.reasonFor`) |
| ordinare, reclutare | `Risacca.order`, `join` | **parziale**: `recluta` (un membro porta dentro un altro), `Fazioni.enlist`, `Iniziative` (chiedere agli altri di venire) | `order` presume che chi ordina sia il giocatore (`st.player.money` in `ricevi_soldi` :894, `follow` segue `st.player` :1061) |
| la vita di Nino (lavora, dormi, lavati, la spesa…) | `Protagonista.myActions` su `st.me` | **parziale**: la giornata di `popolo` (stesse azioni, altri numeri) | `st.me` è una copia di `n.pop` con nomi simili; nessuna funzione comune |
| il mestiere | `Mestieri.perform` | **uguale** | niente |
| jukebox, freccette, poligono, flipper | `attivita.js` | **parziale**: gli oggetti intelligenti di `popolo` (flipper, carte) solo come posa | menu su `p.money` |
| banca, lotto, slot | `soldi.js` | **parziale**: `Soldi.versa/preleva/xfer` (:106-114) sono per conto (`acct(st, id)`) | l'ingresso `act` è del giocatore; le funzioni di conto vanno già bene |
| sotto: banco, casse, treno | `sottosuolo.js` | **nessuna** | tutto sul giocatore |
| tetti, belvedere | `tetti.js` | **nessuna** (`tetti_vissuti.js` mette gente sui tetti come scenografia) | manca la quota per l'NPC |
| abbattere un albero | `paesaggio.js` | **parziale**: la banda `disbosca` col cantiere | menu |

**Riassunto della tabella**: 7 verbi **uguali**, 26 **parziali**, 9 **senza strada NPC**. I blocchi si ripetono, sono cinque:
1. **il corpo**: `st.player`/`st.me` contro `n`/`n.pop`/`n.ris`: posizione verticale (`indoor`, `lv`), soldi, borsa, bisogni hanno
   nomi e posti diversi;
2. **le chiusure senza attore** di `playerActions` (il verbo e la sua condizione sono la stessa riga di codice, e la condizione
   legge il giocatore);
3. **gli effetti collaterali del giocatore** dentro la logica: `G.feed`, `st.sfx`, `passTime`, `caught`/`suspicious` (chi ti vede),
   la scorta della Risacca come borsa del giocatore;
4. **due esecutori di piani** (`Azioni.runPlan` e `Risacca.runTask`) più le scene di `Casa`: un verbo va scritto due volte per
   essere fatto da un abitante e da un membro;
5. **quattro cataloghi di roba** (`Oggetti.CAT`, `Azioni.ITEMS`, `Economia.MERCI`, `Risacca.RES`), con traduttori sparsi
   (`RIS2ITEM`, il risolutore di `Parola`).

Le animazioni **non** sono un blocco vero: c'è già la posa scelta dal testo del passo (`anim_vita.js:638 BY_LABEL`, 50 pose) e
gli oggetti in mano (`anim_vita.js:86 vprop`). Manca solo che il verbo la dichiari.

---

## 4. Il progetto: il registro dei verbi (`Verbo`)

### 4.1 Le regole del progetto, rispettate

- Un file nuovo, **`src/verbo.js`** (e, se diventa lungo, `src/verbo_catalogo.js` per i dati), dietro **`?commedia`**, caricato
  **dopo `casa.js`** (`index.src.html:475`, una riga `<script data-m="verbo">/*verbo.js*/</script>`). Spento il flag:
  `Verbo = { ON: false }` e nessun aggancio.
- Nessun file del gioco è toccato: tutto per **monkeypatch** a caricamento (come fanno già 15 moduli con `Azioni.playerActions`):
  `Azioni.playerActions`, `Azioni.VERBS` (se ne aggiungono), `Risacca.EXT.plan/do`, `Risacca.VERBS`, `Parola` (`DEF`), `Iniziative.VERBI`.
- In `build.py` il nome va in **`TASS_FUORI`**. L'impronta dei tasselli resta **`48196fd63f899c14`**: si calcola solo sui file
  elencati in `index.src.html` che *non* stanno in `TASS_FUORI` (`build.py:41-46`), quindi la riga nuova in `index.src.html` non la
  cambia (ricalcolata in sola lettura oggi: torna).
- La prova: `src/test_verbo.js` (come `test_casa.js`): la stessa chiamata per `'player'` e per un abitante dà lo stesso stato.

### 4.2 La facciata dell'attore (la base di tutto)

`Attore.di(st, chi)`: `chi` è `'player'`, un id o un NPC; torna un oggetto **piccolo e senza copie**, con dei getter sullo stato vero.
È l'unica cosa che i verbi conoscono.

| campo | giocatore | abitante |
|---|---|---|
| `id`, `nome` | `'player'`, `G.PLAYER_NAME` | `n.id`, `n.first` |
| `x, y, face` | `st.player.x/y/face` | `n.x/y/face` |
| `dove` (`{fuori} / {b, f} / {lv}`) | `p.indoor`, `p.lv` | `n.inside` + `n.pop.at`/`n.room` (da arricchire con `n.indoor` scritto solo da `Verbo`) |
| `borsa()` (chiavi `Oggetti.CAT`) | `st.player.inv` (`oggetti.js:912`) | `n.pop.inv` (`oggetti.js:1535 npcBag`) |
| `casa()` (la dispensa, la roba di casa) | `st.me.stash` / `st.me.home` | `n.pop.casa` / `n.pop.homeT` |
| `soldi` (get/set) | `st.player.money` | `n.pop.money` |
| `mano` | `p.hand` / `p.cur` | `n.hand` |
| `bisogni` | `st.me.need` | `n.pop.need` |
| `mezzo` | `p.vehicle` | `n.inVeh` |
| `banda` | `true` | `n.ris && n.ris.member` |
| `guidato` (lo comanda il giocatore) | `true` | `n.ris && n.ris.member && n.ris.auto === false` (`casa.js:320`) |
| `livello` (LOD) | `'scena'` | da `n.pop.near` + distanza dal giocatore (§4.5) |
| `dire(testo)`, `annota(testo)` | `G.feed` | `n.bark` (passa per la regia di `commedia.js`), `Popolo.note` |

La facciata risolve anche i **cataloghi**: `Attore.ha(a, 'pala')` guarda `Oggetti.CAT`, poi traduce `Azioni.ITEMS` e
`Risacca.RES` con una tabella sola (quella che oggi è sparsa fra `RIS2ITEM`, `Parola` e `iniziative.js bagsOf`).

### 4.3 Il verbo come dato

Un verbo è una scheda. **Le condizioni e gli effetti sono dati** (liste di termini), così un pianificatore li legge senza eseguire
niente; il codice sta solo in `fai` (l'effetto vero) e nei rari termini che non si dicono come dato.

```js
Verbo.registra('fai_ricetta', {
  args:  { rec: 'ricetta', volte: 'numero?' },
  pre:   [['ricetta_ok', '$rec'], ['ha_ingredienti', '$rec', '$volte'], ['ha_attrezzi', '$rec'], ['postazione', '$rec']],
  eff:   [['-borsa', '$rec.in*$volte'], ['+borsa', '$rec.out*$volte'], ['usura', '$rec.tools'], ['fatto', 'fatto_a_mano']],
  costo: { min: '$rec.min*$volte', rischio: '$rec.ill ? .15 : 0', fatica: .05 },
  dove:  ['postazione', '$rec'],                      // dove si va prima (il passo «go»)
  posa:  'lavora', oggetto: '$rec.tools[0]',          // l'animazione e la cosa in mano (§4.6)
  testimoni: { tipo: 'fatto_a_mano', se: '$rec.ill' },// chi vede cosa (emit, SEV)
  fai:   (st, A, t, a) => ...,                        // l'effetto vero, sull'attore A (una volta sola, per tutti)
  etichetta: (st, A, t, a) => `Fai ${nome(a.rec)}`,   // il menu del giocatore e la posa del passo
});
```

I termini di base (una trentina bastano): `ha`, `ha_n`, `soldi>=`, `mani_libere`, `vicino(tipo, r)` (muro, acqua, cassonetto, porta,
mezzo, persona, bottega aperta, postazione), `dentro(b)`, `casa_mia`, `ora(da, a)`, `notte`, `non_visto`, `banda`, `relazione>=`,
`stato(corpo)`. Gli effetti: `±borsa`, `±soldi`, `±bisogno`, `muovi`, `piazza`, `togli`, `muro`, `fatto`, `nota`, `rel`, `emit`.

**L'entrata è una sola**, per tutti:

| funzione | cosa fa | chi la chiama |
|---|---|---|
| `Verbo.puo(st, chi, v, t, a)` | `''` o il perché (la prova a secco, sui dati) | il menu, il pianificatore, `Parola.verifica` |
| `Verbo.fai(st, chi, v, t, a, opt)` | prova, poi esegue al livello giusto (§4.5); torna `{ok, msg, piano, fid}` | il menu del giocatore, l'ordine alla banda, il pianificatore |
| `Verbo.qui(st, chi)` | i verbi possibili adesso, con le etichette | **il menu QUI, ADESSO del giocatore** (sostituisce la catena di `playerActions` per i verbi registrati) e **lo stesso elenco per l'NPC guidato** |
| `Verbo.passi(st, chi, v, t, a)` | i passi del piano (`go`, `do`), per `Azioni.startPlan` **e** per `Risacca` | gli esecutori |

Il menu del giocatore si fa così: `Azioni.playerActions = st => vecchi(st).filter(non registrati).concat(Verbo.qui(st,
'player').map(v => ({ id, label, run: () => Verbo.fai(st, 'player', …).msg })))`. I verbi non ancora migrati restano dov'erano.

**Un solo esecutore.** `Verbo.passi` produce i passi di `Azioni` (`S.go/S.do`, `azioni.js:272`), che hanno già i livelli lontano/vicino.
Per la banda si aggiunge un `RS.EXT.do.verbo` e un `RS.EXT.plan` che avvolge i passi `go/do` di `Risacca` (la stessa cosa che fa oggi
`mestieri.js:249-260`). Così un verbo scritto una volta lo fanno l'abitante (piano), il membro (compito) e il giocatore (subito o con
`p.task`).

### 4.4 Come si usano le funzioni legate al giocatore senza toccarle

| strategia | come | per chi | rischi |
|---|---|---|---|
| **A. diretta** | la funzione accetta già l'attore | `Casa.fai`, `Mestieri.perform`, `Azioni.intend/VERBS`, `pickUp/putDown/vanish/bury`, `Game.shoot`, `Cantiere.terrainDo(bag)`, `Economia.buy(st, n, …)`, `Soldi.versa/preleva/xfer`, `Scambi.take/put/deal`, `Writing.npcWork/addWork`, `Popolo.paintWall` | nessuno |
| **B. il cambio di persona** (`Verbo.come(st, n, fn)`) | per una chiamata **sincrona**: si salvano `st.player`/`st.me`, si mette al loro posto una vista dell'NPC (con `inv = n.pop.inv`, `money` collegato, `x/y`, `indoor`), si **zittiscono** `G.feed`, `st.sfx`, `Oggetti.passTime` (con `HOOK`/sostituzione temporanea della proprietà esportata, se c'è; altrimenti si scarta la ricetta), si chiama, si rimette tutto (`try/finally`) | `Oggetti.craft/buy/sell/consume/takeFrom/putInto/barter`, `Cantiere.canPlace/place/remove`, `Guardaroba.wear`, `Livelli.dig*` | **alto**: `passTime` dentro `craft` gira il mondo (`G.step`) e va bloccato (`oggetti.js:1155` usa `G.step` solo se `window` c'è: da fuori si può sostituire `Game.step` per la durata della chiamata); `caught/suspicious` cercano i testimoni attorno al «giocatore»: con la vista dell'NPC diventano giusti; la camera e il disegno non girano durante la chiamata. **Solo per il livello `scena` e `vicino`** e con una prova (`test_verbo.js`) per ogni funzione |
| **C. rifatta sui dati** | per il livello lontano: l'effetto è la lista `eff`, applicata senza la funzione del gioco | tutte (è quello che fa oggi `iniziative.js passiRoba`) | la divergenza: si tiene piccola perché gli effetti sono i dati della ricetta/del catalogo (`RECIPES`, `B`), non una copia del codice |

La B è la sola via per avere *subito* i 142 mestieri del crafting e i 114 pezzi del cantiere per gli NPC senza toccare file
dell'impronta. Quando un giorno quei file potranno cambiare, la pezza giusta è piccola: `p_`/`inv` con un attore in più (`oggetti.js:912/940`,
`cantiere.js:192/196/209`), e la B sparisce.

### 4.5 Quanto costa: i livelli (Iris Xe, telefoni, 1.000 NPC)

Il principio è quello di `casa.js` e di `azioni.js runPlan`: **l'effetto è uno solo, la messa in scena dipende da chi guarda.**

| livello | chi | come si esegue | costo |
|---|---|---|---|
| **scena** | entro `Azioni.CFG.sceneR` e `n.pop.near`, o guidato dal giocatore | passi veri: cammina (`G.goTo/stepAlong`), la posa e l'oggetto in mano per la durata vera, poi `fai` (strategia A o B) | come oggi un piano di `Azioni`; il percorso A\* solo dentro casa |
| **vicino** | `n.pop.near` (al massimo 84, `popolo.js:28`) ma fuori vista | i passi di `runPlan` senza camminare (arriva dopo il tempo di strada, `azioni.js:226`), niente posa | microsecondi a passo |
| **lontano** | gli altri | **nessun passo**: al momento `t0 + costo.min` si applica `eff` (strategia C) in un giro a turno (un sesto della città ogni 10 minuti di gioco, come `casa.js` §7) | la valutazione di `pre` sui dati; obiettivo < 0,05 ms a passo in media (Casa misura 0,02-0,03) |
| **dormiente** | la cosa non si vede da nessuna parte (la casa chiusa, il campo nel bosco lontano) | si scrive solo la riga nel registro (`st.verbo.ops`, come `st.casa.case[bi].ops`); la messa in opera quando qualcuno ci arriva | zero fino all'arrivo |

Le regole che tengono il conto basso:
- **niente piani nel passo**: il pianificatore gira nel tempo libero del browser (`requestIdleCallback`, come le piante di Casa), con un
  tetto di millisecondi per fotogramma (`Anelli`, `anelli.js:45`, ha già il generatore che cede il passo);
- **la prova fallita si ricorda** (come `NOPE` di `iniziative.js`: 4 ore per persona e cosa);
- **le catene si compilano**: le catene buone trovate dal pianificatore (raccogli legna → fai il falò) diventano «macroverbi» con
  `pre` ed `eff` sommati, e lontano si applicano in un colpo;
- **chi decide**: il pianificatore costoso solo per scena e vicino; lontano la scelta è per utilità (la forma di `react`,
  `azioni.js:911`: `add(etichetta, punteggio, fn)`) fra macroverbi già pronti.

### 4.6 Le animazioni per le combinazioni non previste

Un verbo nuovo, o un verbo vecchio con un oggetto nuovo, deve sempre avere un corpo che fa qualcosa di plausibile. La scelta è a
cascata, **solo al livello scena**:
1. `posa` dichiarata dal verbo (una delle 50 di `anim_vita.js`: `martella`, `vernicia`, `spazza`, `raccoglie`, `prende`, `porge`,
   `porta`, `carriola`, `scava`, `zappa`, `forza`, `fruga`, `lavora`, `pesca`, `aspetta`, …);
2. altrimenti il **testo del passo** (`BY_LABEL`, `anim_vita.js:638`: è già il ripiego di oggi per i piani di `Azioni`);
3. altrimenti la **famiglia del verbo** (un campo `fam` della scheda): manipolare → `lavora`; da terra → `raccoglie`; dare/ricevere →
   `porge`/`prende`; portare → `porta` (o `carriola` se pesa); sul muro → `vernicia`; guardare/aspettare → `aspetta`; parlare →
   `discute`; forzare → `forza`;
4. **la parte alta da sola** (le pose `_su`: `mangia_su`, `beve_su`, `telefona_su`, `fuma_su`, `legge_su`) quando il verbo si fa
   camminando;
5. **l'oggetto in mano**: `vprop` (`anim_vita.js:86`) se c'è il modello di quella cosa; se no un oggetto generico per famiglia (il
   pacco, l'attrezzo lungo, la bottiglia, il foglio), scelto dal peso e dalla categoria di `Oggetti.CAT`.

Il modello dei personaggi non si tocca: si scelgono solo la posa e l'oggetto che `anim_vita.js` sa già mettere.

### 4.7 Il pianificatore: comporre comportamenti nuovi

- **GOAP**: l'obiettivo è uno stato (`['ha', 'legna', 4]`, `['muro', posto, 'mio']`, `['casa', 'colore', 'blu']`); la ricerca
  all'indietro sui `pre`/`eff` dei verbi registrati trova la catena. `iniziative.js:350 procura` è già un GOAP piccolo (profondità 2,
  quattro modi: raccogli, fai, compra, fatti prestare): si generalizza a tutti i verbi, profondità 3, con il costo (`min`, `rischio`,
  `soldi`) come peso.
- **HTN** per le cose scritte: i 25 estri di `iniziative.js` (la lotteria, la fila per niente) sono «metodi» che si scompongono in
  verbi registrati; la Mente (`iniziative.js:937 atomi`, `/api/mente kind:'iniziativa'`) riceve l'elenco dei verbi con i loro `pre`
  e propone catene in JSON, che si provano a secco come oggi.
- **Utilità** per scegliere l'obiettivo: i bisogni (`n.pop.need`), il gusto (`casa.js` §3), la linea della banda, la volontà della
  Risacca (`risacca.js:358 will`: oggi è un punteggio a mano, domani può leggere `costo.rischio` e `pol` dalla scheda).
- **Prima il fatto, poi la parola** (`PAROLA_AZIONE.md`): ogni `Verbo.fai` riuscito scrive `Vita.fatto` con la causa; le battute le
  sceglie chi ha fatto, dopo.

### 4.8 La banda: da burattino a corpo giocabile

1. **Subito** (con questo progetto): per il membro guidato (`n.ris.auto === false`) il menu QUI, ADESSO mostra `Verbo.qui(st, n)`
   «per conto di» lui quando gli stai accanto; scegliere un verbo diventa `Verbo.fai(st, n, …)` (al livello scena: lo vedi farlo).
   La chat e il pannello ordinano con gli stessi nomi di verbo (`Parola` mappa `DEF` sul registro).
2. **Dopo** (fuori da questo progetto, tocca camera e disegno): il cambio di corpo vero. Con la facciata dell'attore e i verbi
   unificati diventa *solo* un problema di ingresso: l'input di `main.js` si manda a `Verbo` per l'attore scelto invece che a
   `st.player`. Finché non c'è, il giocatore resta Nino.

---

## 5. I dieci verbi da unificare per primi

Prima di tutto la **fondamenta**: `Attore.di`, `Verbo.registra/puo/fai/qui/passi`, l'aggancio al menu e a `Risacca.EXT`,
`test_verbo.js`. **3-4 giorni.**

| # | verbo | perché vale | strada | sforzo |
|---|---|---|---|---|
| 1 | **prendi / posa / dai** (la roba fra tasche, contenitori, persone, casa) | è il mattone di tutto il resto (ricette, regali, furti, basi); oggi tre borse e quattro cataloghi | A (`Scambi.take/put`) + B (`takeFrom/putInto`) + la tabella dei cataloghi | **M** (3 g) |
| 2 | **compra / vendi** | `Economia.buy` per gli NPC non dà la roba; `Oggetti.buy` del giocatore sì: un verbo solo chiude la differenza | A (`Economia.buy` + `Attore.borsa`), B per `Oggetti.buy/sell` vicino | **S** (1-2 g) |
| 3 | **fai una ricetta** | 142 ricette: il crafting è la risposta ai bisogni (freddo, fame, riparo); toglie il doppio di `iniziative.js passiRoba` | B vicino (con `passTime` zittito), C lontano dai dati di `RECIPES` | **M** (3 g) |
| 4 | **costruisci / smonta** (il catalogo del cantiere) | la base nel bosco, le baracche, gli orti degli altri; toglie il doppio di `apriCantiere` | B per `canPlace/place/remove`, `covi` per attore (il campo dell'NPC), la banda che lavora resta `jobsStep` | **L** (5-6 g) |
| 5 | **dipingi il muro** (gesso, pennello, bomboletta, manifesti) | i muri che brulicano; oggi tre ingressi che scrivono lo stesso stato | A (`st.pop.walls`, `Writing.npcWork/addWork`); per il giocatore resta la tavoletta, per il membro guidato `npcWork` | **S** (1-2 g) |
| 6 | **sali / scendi / ruba un mezzo** | i membri della banda che portano la roba col furgone, i furti d'auto fra abitanti con il padrone che se ne accorge | un `monta(attore, v)` che fa per il giocatore quello che fa `act('veicolo')` e per l'NPC `enterVehicle` + l'evento | **M** (2-3 g) |
| 7 | **entra / esci** (porte e piani) | condizione di quasi tutti i verbi al chiuso (arredare, rubare in casa, la bottega) | `n.indoor = {b, f}` scritto solo da `Verbo`; `enterBuilding` per il giocatore, per l'NPC la porta di `Interior.layout(b).ent` | **M** (2 g) |
| 8 | **scippa / borseggia / rapina** | i furti veri (la roba, non solo i soldi), le vittime che riconoscono | A (`stealSteps`) + B (`pickpocket`) | **S** (1-2 g) |
| 9 | **usa / mangia / bevi** | i bisogni di `st.me` e di `n.pop` sono quasi gli stessi: un verbo solo per il cibo, le medicine, il bere | A per l'NPC (`n.pop.need`), B per `consume` | **S** (1 g) |
| 10 | **arreda / ridipingi** (Casa) | è già uguale: va solo registrato, e diventa il primo verbo che il pianificatore compone con gli altri (compra la vernice → dipingi) | A (`Casa.fai`) | **XS** (½ g) |

Subito dopo, nell'ordine: vestirsi (`Guardaroba`, **M**: serve `n.pop.worn` e la lettura nel disegno solo se c'è), il baule e le basi
(**S**), cassa e cassaforte senza UI (**M**), scavare e il sottosuolo per gli NPC (**L**: serve la quota `lv` dell'attore).

**In tutto**: fondamenta + i dieci ≈ **4 settimane** di lavoro, a pezzi che si possono provare uno per uno, tutto dietro `?commedia`.

---

## 6. Rischi e cose da sapere

- **Il cambio di persona (B) è l'unico punto delicato.** Va fatto solo in chiamate sincrone, con `try/finally`, e con una prova per ogni
  funzione che ci passa. Una funzione che apre la UI (la tavoletta, le schede) non ci passa mai.
- **`passTime` dentro `Oggetti.craft`** (`oggetti.js:1152`) fa avanzare il mondo per la durata della ricetta: per un NPC va
  sempre spento (il tempo lo conta il passo del piano).
- **I cataloghi**: finché non c'è una tabella unica, un verbo che usa `Azioni.ITEMS` (la pistola, la pala) e uno che usa `Oggetti.CAT`
  (le stesse cose con altre chiavi) non si vedono a vicenda. La tabella va fatta per prima (verbo 1).
- **Il salvataggio non c'è** (`audit_sistemi.md` §2): il registro dei verbi vive con `st` come quello di Casa.
- **La quota dell'NPC** (`indoor`, `lv`) oggi non esiste: i verbi del sottosuolo e dei tetti aspettano quella.
- **Lo Studio** (F2) che rifà i mobili cancella i cambi delle case (`CASA.md` §8): vale anche per i verbi che toccano le piante.
