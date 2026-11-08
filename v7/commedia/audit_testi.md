# Audit dei testi: comicità, NPC e dialoghi (Porto Vecchio v7)

Solo lettura: nessun file del progetto è stato modificato. I percorsi sono relativi a `/home/user/porto-vecchio/v7/`.
I conteggi vengono dal caricamento dei moduli in Node (script nello scratchpad, `lens.js`).

---

## 1. Inventario

### Cosa c'è e dove sta
| Sistema | File | Contenuto | Frequenza |
|---|---|---|---|
| Scene di strada | `src/eventi.js:386-698` (SCENE), più `vievive.js:601+`, `scorci.js:488+` | **74** scene base (3 vengono verso il giocatore: `chiede_sigaretta`, `provoca`, `complimento`) | una ogni 50-120 s (`eventi.js:34`), al massimo 2 insieme; quelle verso il giocatore al massimo 1 ogni 600 s |
| Scene strane | `src/matti.js:317-447` | **26** scene aggiunte a `Eventi.SCENE` (5 dei matti, 12 "vita degli altri", 2 fra ragazzi, 7 verso il giocatore) | come sopra; il totale arriva a **100 scene, 10 verso il giocatore** |
| Battute delle scene | tutti i SAY | **905** varianti (in tutto 1.259 righe, contando FRAM e matti) | — |
| Frammenti | `matti.js:107-150` FRAM | **42** dialoghi brevi (146 battute) | ogni 35-75 s, se due persone vicine (2,5-11 m) stanno a meno di 3,6 m fra loro; mazzo mescolato, nessuna ripetizione finché non li hai sentiti tutti |
| Frammenti dei ragazzi | `matti.js:153-180` FRAM_G | **26** dialoghi (94 battute) | stesso ritmo, se tutti e due hanno ≤ 26 anni |
| Voci su fatti veri | `matti.js:198-216` `voce()` | generate dal motore | il 60% dei frammenti, se uno dei due sa un fatto recente |
| Matti di quartiere | `matti.js:29-86` MATTI | 5 matti × (passa 6, ritorno 3, solo 3-4, chiavi di scena 3) = 114 battute | parlano entro 5,5 m; pausa di 45 s per matto, 18 s fra un matto e l'altro |
| Manie e sedia con le rotelle | `matti.js:93-103` | 7 manie con 3-4 frasi neutre; ROTELLE 5 | una frase quando passi, poi 90 s per persona |
| Scrocco | `matti.js:182-184` | 10 frasi | ogni 70-150 s, 25% di probabilità, una volta per ragazzo |
| Chiacchiere fra NPC | `azioni.js:718-731` LINES / LINES_G | 7 tipi × 2-6 frasi | a ogni `social` |
| Frasi di ripiego e interessi | `popolo.js:1866-1897` TALK_INT, chatLine | 19 interessi × 2; ripiego da 6-7 | `chatter`: probabilità 0,004 per passo, pausa 14-30 s |
| Vengono da te | `convivenza.js:184-212` reasonFor/approachPick | avviso, favore, invito, richiesta, minaccia, notizia, offerta, presenta, saluto | **un tentativo ogni 14-32 s** (`convivenza.js:210`) entro 20 m |
| Ti ricordano un fatto | `game.js:1534-1555` maybeBark + `tono()` (1198) | "Ti ho visto: …" + seguito secondo il tono | quando vedi chi ti ha visto |
| Frasi di combattimento | `game.js:1454-1460` COMBAT_BARKS | cop 7, squalo 6, marsiglia 5, tribù 4, tutela_isola 4 | all'inizio del combattimento e col 15% di probabilità durante |
| Polizia e controlli | `ordine.js:453-595, 885, 891, 964` | frasi da controllo (seri) | ai controlli |
| Coro (IA di notte) | `coro.js:200-230` | 3-4 battute per gruppo, tagliate a 90 caratteri | 6 gruppi per notte, solo con la chiave |
| Chat | `risacca_ui.js:283-325`, `risacca.js:1503-1570` (ripiego) | IA, oppure parole chiave | quando il giocatore la apre |

`src/regia.js` **non ha testi**: è la regia della camera. La "regia" testuale è solo il kind `regia` nel server (vedi §6), che **nessun client chiama**.

### Sistemi che si sovrappongono
- L'unico coordinamento fra sistemi è `sayEv` (`eventi.js:376-378`): chi recita in una scena fa tacere i `G.say` degli altri moduli. Il resto (frammenti, matti, manie, scrocco, convivenza, chatter, social, maybeBark, ordine) **non ha un'agenda comune**. `matti.js` ha la sua pausa interna (`M.cd`, 18 s), che vale solo per i suoi sistemi.
- **Convivenza e eventi si contraddicono sul ritmo.** Eventi fa venire qualcuno verso di te al massimo ogni 10 minuti. Convivenza ci prova ogni 14-32 s (`convivenza.js:210`). All'inizio quasi ogni NPC chiacchierone ha un motivo valido (`presenta`, una volta a testa), quindi qualcuno ti viene incontro ogni mezzo minuto circa.
- Convivenza **ignora il tono**: `reasonFor` non guarda né `G.tono` né `__tonoT`. Eventi (`eventi.js:61`) e matti (`matti.js:223`) invece sì, quindi resta possibile il difetto della "sigaretta dopo lo sparo" segnalato nel handoff.
- `approachPick` non esclude chi ha `n.__ev`. Se sceglie un attore che è dentro una scena, blocca tutte le visite (`some(n=>n.__ap)`) fino a 25 s.
- `mente.js:192` (talk) sovrascrive subito la battuta che `azioni.social` ha appena messo (`azioni.js:735`): la prima frase non si vede.
- In una piazza piena, nello stesso momento: 2 scene, 1 frammento, 1 matto, 1 visita, chatter, multe, frasi di combattimento. Nessun limite al numero di fumetti visibili (§ display).

---

## 2. Righe riuscite e righe deboli

### Riuscite (deadpan, specifiche, nel tono)
1. `matti.js:141` «Ho chiamato il bambino come il Garante.» «Sei matto?» «Così quando lo sgrido mi sento meglio.» Sfotte il regime di lato, alla perfezione.
2. `eventi.js:406` «E questa cassetta? «Battiato»? Chi è, un sovversivo?» / «È di mia nonna. Lei è sovversiva. Io no.» Comico e dentro il mondo.
3. `matti.js:47` Contessa: «Nel '62 ho ballato col Garante. Pestava i piedi come governa.»
4. `eventi.js:589` (vecchi_panchina) «Il Garante? Ne ho visti passare tre.»
5. `eventi.js:475` «Fufi! Lo so che lavori per gli Orecchi. Lo so.» Paranoia di regime dentro una cosa banale.
6. `matti.js:36` Generale: «Sergente Bocca, a rapporto. Ah già, Bocca è morto. A rapporto lo stesso.»
7. `matti.js:58` Profeta: «Pagina quattrocentododici. Rossi, Rossi, Rossi... troppi Rossi. È un segno.»
8. `matti.js:81` Venditore: «Rate da cinquecento lire per diciotto anni. Il niente non si svaluta.» (aggancio perfetto al "consumismo a rate" del manifesto)
9. `matti.js:373` lettera_garante: «Il gallo canta alle quattro. Chiedo che venga rettificato. Il gallo, non il vicino. Per ora.»
10. `matti.js:399` saluto_autobus: «Trent'anni che lo saluto. Non sono mai salito.»
11. `matti.js:171` FRAM_G: «Zio, ho visto un cavallo sul motorino.» «Guidava lui?» «No, dietro. Col casco.» (anticlimax senza battuta finale, il modello giusto)
12. `matti.js:179` «Andiamo al mare?» «È dicembre.» «Lo so. Andiamo a guardarlo.» «Ok.»
13. `matti.js:401` «Se un Grigio cade nel bosco e nessuno lo sente...» «...è una bella notizia lo stesso.» (con la Battuta dei boschi sullo sfondo pesa davvero)
14. `eventi.js:517` corteggia: «Sono tua cugina, scemo.»
15. `eventi.js:665` parata: «Applaudi, che ti guardano.» / «L'anno scorso pioveva, almeno.»

### Deboli
1. `game.js:1455-1457` le frasi comiche di combattimento («Arrenditi! Ho la suocera a cena», «Esci, che mia madre mi aspetta per pranzo!», «Mais qui a pris ma baguette?!») **non escono mai**: `barksOf(n)[Math.floor(st.rng()*4)]` (`game.js:1529`, `1782`) pesca solo le prime 4. Tutto il lavoro del handoff su COMBAT_BARKS è codice che non gira.
2. `game.js:1459` tribù: «Uuh-ah! Uuh-ah!», «Carne fresca!»: stereotipo del selvaggio cannibale, fuori dal mondo e offensivo. Queste sono fra le prime 4, quindi escono davvero.
3. `game.js:1457` «Mais qui a pris ma baguette?!»: stereotipo da cartolina (per fortuna non esce mai, vedi punto 1).
4. `matti.js:137` «Mio marito… va a comprare le sigarette… Nel '79… Dice che c'è la fila.» È una barzelletta classica con la battuta finale: proprio quello che il brief vieta.
5. `matti.js:112` dentista: «Gli ho detto di ridarglieli.» e `matti.js:138` «Ho perso tre chili e un amico.» Sono strutture domanda e battuta, giochi di parole. Più in generale **FRAM è quasi tutto domanda, "E?" e battuta**, cioè barzellette in piccolo. FRAM_G invece segue la regola giusta.
6. `azioni.js:720` «Tua madre era bellissima. Cos'è successo?» Insulto da cortile, va oltre il confine fra cattiveria e crudeltà.
7. `eventi.js:533` «Ai suoi tempi lei era un dinosauro.» Battuta scolastica.
8. `eventi.js:481` «Accendini che non accendono! Per chi vuole smettere!» e `eventi.js:439` «Io questo lampione lo sposerei. È l'unico che mi aspetta.» Sono battute spiegate.
9. `azioni.js:719` e `popolo.js:1896` «Che freddo, eh?», «Hai visto chi è tornato?» come ripieghi generici. Il prompt dell'IA vieta esplicitamente «Che freddo» (`api/_mente.js:295`).
10. `popolo.js:1892` `` `Al lavoro (${P.job.title}) oggi non finiva più.` `` produce «Al lavoro (Commessa al Mercato) oggi non finiva più.»: una parentesi da database.
11. `eventi.js:614` «Tre birre! E un'amaro per Peppe.»: errore di grammatica, va «un amaro».
12. `convivenza.js:183, 191` «Hai sentito? Hanno scippato una a Piazza San Rocco.»: la preposizione non si accorda, mentre `matti.js:191` aLuogo risolve già il problema.
13. `convivenza.js:196` «Tu sei nuovo da queste parti, vero?», «Non sei di qui, si vede.», più `eventi.js:469, 620` «Tu non sei di qui.» Nino invece è del posto: ha casa e «amici del quartiere» (`protagonista.js:82`) ed è «fuori da ieri» (`game.js:618`).
14. `eventi.js:494` «Pronto, Radio Scirocco? Volevo dedicare una canzone…»: Radio Scirocco è la radio clandestina della Risacca (`risacca_ui.js`, «Trasmetti Radio Scirocco»). Uno qualunque che telefona per una dedica stona.
15. `eventi.js:481` «Occhiali da sole, come quelli di Vasco!»: nel gioco Vasco è il Colonnello della Guardia (`risacca.js:222`). Il giocatore lo legge come il cattivo, non come il cantante.
16. `matti.js:35, 57, 80` le battute "ritorno" fanno riferimento a una battuta precisa che forse non hai mai sentito («Ah, il disertore», «Le acciughe. Le hai comprate?», «Com'è andato il buco?»). La battuta "passa" è pescata a caso fra 6, quindi circa 5 volte su 6 il richiamo arriva dal nulla.

---

## 3. Rischio di ripetizione
- **Scene**: 100 schede con 2-5 varianti per battuta, una ogni 50-120 s, senza ripetizioni nello stesso posto e giorno. In 10 minuti se ne vedono circa 6-8 e il rischio è basso. Le scene con peso 3 (scippo, polizia_insegue, scala, bici, reti, vecchi_panchina, dehors_pieni…) tornano di più.
- **FRAM e FRAM_G**: il mazzo garantisce che non ci siano ripetizioni (42 e 26). Il problema non è il pool ma il tema.
- **Gag consumate**, contate in matti, eventi, azioni e popolo: «da accendere» ×11, «Bella» ×17, «Fottiti» ×14, «drum» ×9, «siga» ×6. Si sentono in FRAM_G (5 su 26), in SCROCCO (10), nelle scene `drum_condiviso`, `hai_da_accendere`, `chiede_sigaretta` e in chatLine per i giovani. Un giocatore che gira fra i ragazzi sente "hai da accendere" più volte in 10 minuti.
- **Matti**: il primo abita vicino a casa di Nino (`matti.js:238`), quindi lo incroci spesso. Ha 6 battute "passa" pescate con reinserimento e una pausa di 45 s: alla quarta-quinta volta la ripetizione è probabile.
- **Convivenza**: le visite ogni 14-32 s portano all'inizio una serie di «Piacere, X, …» (6 varianti) e «Sai mica dove trovo …?». È la ripetizione più probabile nei primi 10 minuti.
- **chatLine** (fondo): 6-7 frasi per età, usate da chatter, social e saluto («Ciao Nino! …»).
- **Gag duplicate**: le ceneri (`eventi.js:392` del suocero, `489` dello zio Nando); «è dicembre» (`matti.js:179` e `eventi.js:444`); «la figlia del farmacista» (`popolo.js:1871`, `eventi.js:696`).
- **Nomi in collisione**: "Don Ciccio" è il boss (`eventi.js:634`) e anche un vecchio qualunque (`eventi.js:675`). Il parroco ha tre nomi: Don Peppino (`eventi.js:680`), don Piero (`popolo.js:1869`), Don Pietro (`game.js:1211`). "Peppino" è il matto ma anche un vecchio a caso (`eventi.js:590`).

---

## 4. Coerenza di tono
- **Tre cornici diverse per lo stesso mondo**: il manifesto (Impero, Battuta dei boschi, 20%, Miracolo del Gelo, miniera); il prompt del server (`api/_mente.js:286` «anno 1986… regime (la Tutela, i Grigi, il Garante)… ritratti del dittatore»); il prompt della chat Claude (`risacca.js:1393` «regime orwelliano retro-futurista (il 2019 come lo immaginavano nel 1984)»). I testi di strada seguono la seconda. Nessuna battuta parla della **Battuta dei boschi** (0 occorrenze), della **miniera** (0) o del **Disgelo** come cultura (2 righe, tutte e due in `vievive.js:622`).
- **Il debito**: 500.000 nel codice (`game.js:8`, `618`) contro 480.000 nel manifesto.
- **La comicità sta col manifesto?** Sì, per la parte "regime sfottuto di lato" (Garante, Bollettino, Orecchi, parata). No per il peso del trauma: i vecchi ricordano Coppi, il '43 e i Savoia (`matti.js:32, 50, 71`), non la Battuta, che 27 anni fa avrebbe segnato proprio loro. «Tutti morti, i miei amici. Che maleducati.» (`matti.js:70`) in quel mondo è o la riga migliore del gioco o una crudeltà: va deciso apposta.
- **Le fazioni non hanno una voce comica propria**:
  - *Grigi*: hanno una voce burocratica (`ordine.js`), piatta e credibile. Le uniche righe comiche sono in eventi (`402`, `406`); quelle di combattimento non escono mai.
  - *Famiglia/Squalo*: pizzo e capo_tavolino sono seri e funzionano. Squalo, Famiglia, "il principale" e "Don Ciccio" sono quattro nomi senza un legame chiaro fra loro. Non c'è registro né dialetto.
  - *Risacca (reduci)*: assenti dalle strade. Il Generale è la parodia di un reduce, ma della seconda guerra mondiale.
  - *Disgelo*: è il gergo dei ragazzi di oggi («fra», «zio», «bella», «drum»), voluto dal handoff ma anacronistico nel 1986. Mancano skate, writing e hip-hop, tranne `cypher` (`eventi.js:647`), che è serio e riuscito.
  - *Marsigliesi*: solo 4 frasi di combattimento in francese, nient'altro.
  - Risultato: tutti i civili parlano con la stessa voce surreale e impassibile, che si tratti di pescatori, madri, vecchi o ragazzi.
- **Personaggi ricorrenti**: i 5 matti ti riconoscono, ma non hanno un arco, nessuna progressione né memoria di cosa ti hanno detto. Nel fumetto compare il loro nome vero (`main.js:906` usa `n.first`), non "il Generale": il giocatore non scopre mai che è un personaggio fisso. Ci sono fili nati da soli: «il figlio della Pina» preso dai Grigi (`eventi.js:594, 696`), la Debora e Davide (FRAM_G, SCROCCO), Ninetto (il nonno che chiama Nino "Ninetto": bello).

---

## 5. Leggibilità per chi comincia
- **Gergo senza introduzione**: Tutela (10 occorrenze), Garante (18), Grigi (18), Squalo (18), Rocca (9), Vittoria (8), Bollettino (7), Zia (6), Ora Quieta (3), Orecchi (2), «rettificato» (1). Ci sono anche troppi nomi per la polizia: Grigi, Tutela, Guardia Insulare, Polizia di Stato (`game.js:517`), la pula, i vigili, la Celere.
- **Lunghezza contro durata**: mediana 27 caratteri. **116 battute superano i 55 caratteri** e 17 superano gli 80. Le durate vanno da 3,2 a 4 s (`eventi.js:378` 3,2; matti 3,4-4; `game.js:1453` 3,4 di base), cioè 20-30 caratteri al secondo contro i 15-17 consigliati. Le più lunghe: `matti.js:421` (96 car.) «Grazie. Ora mi credono. Se qualcuno chiede, sei allergico ai gatti e hai una moglie in Svizzera.», `matti.js:60` (95), `matti.js:68` (95), `matti.js:373` (94).
- **Dialetto**: quasi niente (caruggi, «va'», «Madonna»). Va bene per la comprensione, ma rende il posto anonimo.

### Il fumetto (`main.js:883-910`, CSS `index.src.html:76-80`)
- `.bub`: 13,5 px, interlinea 1,25, larghezza massima 210 px, sfondo carta. Il nome di chi parla è in Silkscreen a **9 px**, illeggibile sul telefono.
- Il colore distingue `hot` (lite, inseguimento) e `rumor` (solo se il testo comincia con "Hai sentito": le voci di matti.js, «Fra, hai sentito?», restano bianche).
- Si vede fino a 26 m. **Nessun limite al numero di fumetti, nessuna regola contro le sovrapposizioni**: un fumetto per NPC, ancorato alla testa (2,35 m).
- **Nessun registro** delle frasi sentite: una battuta persa è persa. Solo il feed di `protagonista.js` tiene una storia.
- **Telefono**: nessuna media query per `.bub`, `#bubbles` o `.who`. Su uno schermo largo 360 px un fumetto occupa il 58% della larghezza, e 3-4 fumetti si coprono a vicenda.
- La chat (`risacca_ui`) è un pannello HTML a parte, a tempo fermo: lì la leggibilità va bene.

---

## 6. Le menti IA (`api/_mente.js` = `server.js`, prompt identici)
- **Prompt di base** (`_mente.js:285-299`): 1986, frasi corte, «comicità asciutta». Le regole: le persone parlano delle **loro** cose, a metà; dettagli assurdi detti seri; mai spiegare, mai barzellette o giochi di parole; risposte storte; il regime si sfotte di lato; cattiveria sì, crudeltà no (niente battute su rettificati, morti, malati); niente frasi fatte, niente risate scritte, niente emoji; non inventare cose che il contesto non dà; sempre nel personaggio; solo JSON. Il prompt non nomina Famiglia, Squalo, Risacca come banda, Disgelo, Marsigliesi, la Battuta, il debito: l'IA non può dare alle fazioni voci diverse.
- **I kind**:
  - `dialogo`: la chat, 1-3 frasi; se c'è una `stranezza` resta nella fissazione. Lo chiama `risacca_ui.js:306`.
  - `riflessione`: **nessun client lo chiama più**, l'ha sostituito `gruppo`.
  - `gruppo`: il Coro di notte (clima, voce, battute 3-4 di massimo 12 parole, pensieri). Lo chiama `mente.js:113`.
  - `chiacchiera`: due battute di massimo 12 parole. Parte **solo se esiste una chiave dedicata `eventi`** (`mente.js:187` `!state.canali.eventi`), quindi con la sola chiave generale non gira mai.
  - `regia`: azioni per gli NPC. **Nessun client lo chiama.**
  - `graffito`: la scritta e i tratti sul muro (`graffiti.js:86`).
- **Senza chiave**:
  - la notte fa solo il lavoro del codice (`Coro.notte`): voci passate e caselle aggiornate, nessuna battuta;
  - chiacchiera spenta;
  - graffiti con il disegno locale;
  - la chat usa il ripiego a parole chiave (`risacca.js:1503`). Le battute sono 4 generiche («Parla piano: qui anche i muri hanno gli Orecchi.», «Sì? Ti ascolto.»…, `risacca.js:1565`), più 3 per gli antagonisti. **I matti perdono la loro fissazione in chat**: il Generale risponde «Sì? Ti ascolto.».
- **Rischi**:
  - le battute dell'IA vanno in strada (`Game.say`) senza filtri, solo tagliate a 90 caratteri (`coro.js:200`, `mente.js:197`), quindi possono uscire frasi fatte, cose inventate o volgari;
  - la scritta del graffito (40 caratteri) finisce **dipinta sul muro** senza moderazione;
  - le battute del Coro si scrivono senza sapere chi le dirà né quando, e poi vengono dette a caso il giorno dopo, fuori contesto;
  - la chat Claude (`risacca.js:1390+`) **non ha le regole della comicità** del server e presenta un mondo diverso;
  - limite di 40 richieste al minuto per IP (`_mente.js:458`), 1,2 s fra le chiamate di sfondo, 16 s fra i gruppi.

---

## Correzioni prioritarie (in breve)
1. `game.js:1529, 1782`: `*4` → `*barksOf(n).length` (oppure le prime 4 con alta probabilità e il resto raro), e togliere o rifare le frasi della tribù.
2. Un'agenda unica delle battute rivolte al giocatore (al massimo una ogni N s), che valga anche per convivenza; in `reasonFor` controllare `G.tono` e `__tonoT`; abbassare la frequenza delle visite.
3. Durata del fumetto ≈ max(2,5, caratteri/15) s; un limite di 3 fumetti; `.bub` e `.who` più grandi con `pointer: coarse`; un piccolo registro delle frasi sentite.
4. Il soprannome del matto nel fumetto («il Generale»); "ritorno" legato alla battuta "passa" che il giocatore ha sentito davvero.
5. Il ripiego della chat: per i matti, una riga dalle loro battute.
6. Una cornice unica (manifesto, server, chat), con la Battuta, la Famiglia e il Disgelo nel prompt; il debito a 480; togliere "nuovo da queste parti".
7. Grammatica e nomi: "un amaro", la preposizione davanti ai posti in convivenza, la parentesi del mestiere, i nomi del parroco e di Don Ciccio, Vasco, Radio Scirocco.
