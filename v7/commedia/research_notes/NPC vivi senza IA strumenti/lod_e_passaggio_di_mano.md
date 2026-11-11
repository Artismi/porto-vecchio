# Mille NPC con tutti gli strumenti: risoluzione astratta fuori schermo, ECS, e il passaggio di mano al giocatore

> Etichette: **[letto]**, **[estratto]**, **[non verificato]**, **[stima]**.
> La seconda tornata ha già: quattro livelli di LOD (Zubek, Graham, LOD Trader, Census), il Worker senza SharedArrayBuffer nella WebView, la coda di eventi su array tipizzati, la reidratazione al tocco. Qui solo quello che cambia quando **ogni NPC può usare ogni verbo e ogni oggetto**, e quando può diventare il personaggio del giocatore.

---

## 1. Due esecutori per ogni verbo

### Reperti
- STALKER: online entro ~150 m, offline più grezzo; offline un esito può essere tirato a sorte e mostrato solo come risultato — [Game Developer, Iassenev](https://www.gamedeveloper.com/game-platforms/interview-inside-the-ai-of-i-s-t-a-l-k-e-r-i-) **[estratto]**. In STALKER 2 l'offline è stato percepito come mancante — [GamingBolt](https://gamingbolt.com/s-t-a-l-k-e-r-2-heart-of-chornobyls-a-life-2-0-isnt-working-heres-why) **[estratto]**
- UE5 Mass: un LOD per entità per tre clienti distinti (visivo, simulazione, replica) — [Epic, Mass Gameplay](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-gameplay-in-unreal-engine?lang=de) **[estratto]**
- Bellwright: più di mille NPC simulati comunque, LOD degli NPC e streaming dei livelli, memoria come vincolo — [80.lv](https://80.lv/articles/how-bellwright-simulates-a-living-medieval-world-with-thousands-of-npcs) **[letto]**
- `azioni.js` lo fa già per le liti: «da vicino si vede (si avvicinano, pugni…); da lontano si decide subito come va a finire» (commento in `fightTick`). `iniziative.js` fa lo stesso per le iniziative («da lontano si arriva col tempo di strada»).

### Proposta
Ogni voce del registro dichiara:
- `vicino`: i passi (vai, gesto con oggetto, verifica), animati ai livelli A-C di `animazione_senza_script.md`;
- `lontano`: una **funzione chiusa** `(seme, chi, args, t0) → { durata, esito, effetti, fatto }`, senza percorsi né frame, con le stesse probabilità del vicino (così chi gioca lì vicino e chi no vedono la stessa città);
- `consuma` / `produce`: le risorse, uguali nei due esecutori (il conto di UO);
- `prenota`: cosa blocca durante l'esecuzione (l'attrezzo, la postazione, il punto del muro).

Il passaggio lontano → vicino durante l'esecuzione (il giocatore arriva a metà del ponte) usa la frazione `(t − t0) / durata` per mettere il cantiere al punto giusto e riprendere dai passi vicini. È la reidratazione della seconda tornata applicata al singolo verbo.

**Test di parità** (da scrivere in fase 0): lo stesso piano eseguito 1.000 volte vicino e 1.000 lontano dà la stessa distribuzione di esiti e di consumi (scarto ≤ 5%). Senza questo test, "stesse regole per tutti" non è vero.

## 2. Indici e memoria per un registro aperto

- La sostituzione per proprietà (`oggetti_affordance_chimica.md` §8) vuole un **indice per proprietà**: per ogni proprietà, una maschera di bit sugli oggetti del catalogo. Con ~16-32 proprietà, una parola a 32 bit per tipo d'oggetto; la domanda «cosa ho in tasca che sia rigido e pesante» è un AND su ~10 voci d'inventario. **[stima]** Trascurabile.
- Le **prenotazioni** stanno in una mappa `oggetto → (chi, fino a)`, come la `SmartObjectSubsystem` di UE5 o le reservation di RimWorld.
- Le seconda tornata ha già notato (EliCS) che **creare e distruggere componenti costa più che iterarli**: gli stati di esecuzione di un verbo restano enum in array tipizzati; i piani sono tuple preallocate (verbo, args, passo, t0), non oggetti con chiusure. Oggi `azioni.js` costruisce i passi con chiusure (`S.go(label, () => ...)`): **va bene per i vicini, non per i mille lontani**, che devono usare solo l'esecutore chiuso.

## 3. Bilancio per mille NPC [stima]

| voce | quanti | costo |
|---|---|---|
| NPC vicini con esecutore a passi | ≤ 40 | come oggi |
| NPC nel Worker con utilità + HTN | ~300 attivi | ≤ 2 ms/tick a 4 Hz con tetto di 8 piani nuovi per tick |
| NPC lontani | ~700 | un evento in coda per verbo in corso; ~0 tra un evento e l'altro |
| stato in più per NPC | verbo corrente, args (4 interi), t0, durata, prenotazione | ~24 B → 24 KB per 1.000 |
| registro dei verbi | 150-300 voci di dati | 30-80 KB di JSON, una volta |
| indice proprietà | ~500 tipi d'oggetto × 4 B | 2 KB |

## 4. Il passaggio di mano: ogni NPC giocabile quando entra in banda

### Reperti
- **Qud**: il controllo passa al bersaglio; il corpo originale resta fermo; si può restare intrappolati — [wiki, Domination](https://wiki.cavesofqud.com/wiki/Domination) **[estratto]**
- **Dwarf Fortress**: gruppo di avventurieri, si passa da uno all'altro al volo; gli altri seguono e ricevono ordini semplici — [PC Gamer](https://pcgamer.com/dwarf-fortresss-next-big-update-will-let-you-play-its-adventure-mode-with-a-proper-rpg-party) **[estratto]**
- **Kenshi**: i pacchetti IA della squadra (soccorso, guardia del corpo, segui, medico; "proteggi la squadra" di default) — [Steam, mod](https://steamcommunity.com/sharedfiles/filedetails/comments/2747581577) **[estratto]**
- **Watch Dogs: Legion**: ogni recluta porta abilità, gadget e vantaggi propri — [GamesRadar](https://www.gamesradar.com/watch-dogs-legions-ability-to-play-as-anyone-puts-you-in-control-more-than-eve) **[estratto]**
- **The Sims**: il Sim sotto controllo diretto è lo stesso oggetto senza selettore automatico; il rischio è il pilota automatico che gioca meglio — [Forbus & Wright](https://qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf) **[letto]**; [PC Gamer](https://www.pcgamer.com/games/the-sims/will-wright-says-the-original-sims-ai-was-actually-too-good-almost-anything-the-player-did-was-worse-than-the-sims-running-on-autopilot) **[estratto]**
- **RimWorld**: l'ordine del giocatore e il lavoro autonomo producono lo stesso Job — [RimWorld wiki](https://rimworldwiki.com/wiki/Modding_Tutorials/Code_MendingJob) **[letto]**

### Cosa c'è nel codice
- `protagonista.js`: «una vita come quella degli altri» (casa, amici, lavoro, bisogni, vizi); le azioni del giocatore compaiono nel menu QUI, ADESSO (`Azioni.playerActions`), scritte **a parte** rispetto a `VERBS`.
- `risacca.js`: la banda, la volontà dei membri, i compiti; `mestieri.js`: le stesse azioni di mestiere per abitanti, membri della Risacca e protagonista.
- `casa.js` (dalla direzione artistica): «tutti gli NPC se entrano nella banda diventano giocabili, quindi tutti possono fare tutto».

### Proposta: il cervello è un componente
Ogni persona ha `cervello ∈ { auto, banda, giocatore }`:
- `auto`: utilità + HTN come tutti.
- `banda`: utilità con pesi spostati verso gli ordini (pacchetti alla Kenshi: segui, guarda le spalle, lavora al progetto, procura) e verso i progetti della banda.
- `giocatore`: il selettore è il controller e il menu; **il menu QUI, ADESSO si genera dal registro** filtrando i verbi per cui `può()` è vero adesso, con i sostituti in fondo ("pianta con la padella").

Il passaggio di mano:
1. **Cosa passa**: corpo, tasche, mano, casa (con le chiavi del mestiere), relazioni e impressioni, reputazione, i suoi piani aperti e i suoi progetti. **Cosa non passa**: la memoria del giocatore (resta nel taccuino, non nella testa dell'NPC).
2. **I piani aperti diventano compiti**: quello che l'NPC stava facendo (la mensola a metà, il debito con lo Squalo, la serenata promessa) compare nel taccuino come lista di cose da fare. Un intento dell'NPC è già un piano verificato (`intend`), quindi è anche una quest.
3. **Il corpo lasciato** (il protagonista o il membro precedente) torna a `auto` o `banda` e continua la sua vita con gli stessi verbi. Per evitare il paradosso di Wright, `auto` non prende decisioni irreversibili per conto del giocatore (vendere la roba della banda, spendere oltre una soglia, uccidere) senza un ordine.
4. **Le differenze che si sentono** (alla WDL, ma dal sistema che c'è): il mestiere apre verbi (`mestieri.js`), il carattere sposta i costi (il timido paga di più "chiedere"), le relazioni aprono porte, le abilità cambiano la riuscita e la durata. Niente albero di abilità nuovo.
5. **Le eccezioni dichiarate**: poche figure non entrano in banda (capi dei Grigi, il Garante) e il registro lo dice con un tag, non con un controllo sparso.

### Test di accettazione
- Per ogni verbo del registro, il test esegue il verbo una volta come `auto`, una come `banda` (con ordine) e una come `giocatore` (dal menu): stesso piano, stessi consumi, stesso fatto nel registro.
- Su 100 NPC scelti a caso, il menu del giocatore dopo il passaggio contiene almeno i verbi che l'NPC ha usato da solo nell'ultima settimana di gioco simulato.
