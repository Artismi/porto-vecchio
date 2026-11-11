# Il sistema unico degli NPC: un corpo, un catalogo, una mente, una memoria (11 novembre)

La direzione approvata: **un solo sistema NPC** al posto del rattoppo. È fatto di quattro pezzi.
1. **Un corpo (`Attore`)**, uguale per il giocatore e per l'NPC: stesse tasche, soldi, casa, capacità. Un membro della banda preso dal
   giocatore resta lo stesso personaggio: cambia solo chi decide.
2. **Un catalogo d'azioni**, che sono i verbi del giocatore. Ogni verbo dichiara come dati le condizioni e gli effetti, e lo esegue la
   stessa funzione per chiunque.
3. **Una mente per NPC**: bisogni, carattere, gusti, abilità, lavoro e orario, memorie, relazioni. Sceglie gli obiettivi (utilità) e
   mette in fila le azioni (HTN alla `procura`), con un livello di dettaglio vicino e lontano.
4. **Una memoria del mondo**: ogni azione lascia un fatto vero (alla `Vita.fatto`). Da lì vengono dicerie, battute, cronaca e
   rancori. Tutto si salva.

Tutti hanno gli stessi attrezzi, ma ognuno vive una vita diversa. I sistemi vecchi non si riscrivono: diventano **fornitori** e
**adattatori** del sistema unico.

Questo è un progetto: non c'è codice. Nessun file è stato toccato, salvo questo documento. Si basa su `STRUMENTI_NPC.md` (inventario
e lacune), `DEBOLEZZE.md` (19 debolezze), `reports/NPC vivi senza IA strumenti.md`, `banco/RISULTATI.md` e i sorgenti citati con la
riga.

**In una riga.** Due righe `<script>` nuove e otto file nuovi `unico_*.js`. I cinque `step` di commedia, parola, vita, iniziative e
casa diventano **fasi** di un solo passo, con l'ordine dichiarato. `Attore.di(st, chi)` è la sola vista del corpo. `Verbo.fai` è la
sola porta per agire. `Mente` sceglie per tutti tranne chi siede al posto del giocatore. `Fatto` è il solo registro, salvato con una
versione e senza cicli, con un caso a seme che si può salvare. Ogni fatto ha un segno che si vede.

---

## 0. Vincoli rispettati, e i due punti che chiedono una decisione

| vincolo | come lo rispetta il progetto |
|---|---|
| non toccare i file di `v7/src` | Si aggiungono solo file nuovi, che lavorano per monkeypatch al caricamento. Le uniche righe toccate sono quelle d'innesto che tutti i moduli di commedia hanno già: **2 righe** in `index.src.html` e **9 nomi** in `TASS_FUORI` di `build.py` |
| dietro `?commedia` | Ogni file comincia con `const ON = /[?&]commedia\b/.test(location.search)`. Spento il flag: `Unico = { ON: false }`, nessun aggancio e nessuna trappola |
| `IMPRONTA_TASS` resta `48196fd63f899c14` | I file nuovi stanno in `TASS_FUORI`. L'impronta si calcola solo sui `/*x.js*/` che non ci stanno (`build.py:39-46`), quindi la riga nuova non la cambia. Prova: `python3 build.py --senza-cotto` stampa l'impronta, ed è un passo della CI (§9) |
| graffiti, `urbanistica2.js`, vegetazione, modelli dei personaggi, camera | Non si toccano. Il verbo «dipingi il muro» scrive in `st.pop.walls` e in `Writing.npcWork/addWork`, come oggi, e non tocca la disposizione dei graffiti. Al posto di «la camera si gira verso il fatto» (`DEBOLEZZE` §1) c'è una **freccia a bordo schermo** nel DOM |
| fluido su Iris Xe e telefoni | Bilancio per fase e budget a **conteggio** (deterministico), non a millisecondi (§2.4). I livelli di dettaglio sono quelli di `casa.js` e `azioni.js runPlan` |

**Decisione A, la figura nella presa di corpo (§8.3).** I dati passano senza toccare niente. Per far *vedere* il membro al posto di Nino,
la figura del giocatore deve usare il look del membro. La proposta è `unico_figura.js`: avvolge `Models.person(look, 'player')` e forza
la rivestizione (`personaggi.js:1683-1707`). Non cambia nessun modello: sceglie quale look usare. Però sfiora i «modelli dei
personaggi», quindi serve l'ok della direzione. Senza ok, la presa resta «di dati»: il giocatore ha i soldi, le tasche, la casa e i
piani del membro, e la figura resta quella di Nino.

**Decisione B, l'IA in partita.** Con `?commedia` il sistema unico mette `Parola.CFG.ia = async () => null` (`parola.js:1140`), a meno
che non ci sia `&ia`. Così `chiamaIA` non fa più `fetch('/api/mente')` (`parola.js:1151`) e si ricade sulle battute già scritte. È il
rimedio a `DEBOLEZZE` §10, ma è reversibile.

---

## 1. Disposizione dei moduli

### 1.1 I file e l'ordine di caricamento

```
index.src.html
  …  sviluppo.js
  <script data-m="unico_porta">/*unico_porta.js*/</script>          ← NUOVA riga 470½: PRIMA di commedia.js
  commedia.js · parola.js · vita.js · iniziative.js · casa.js        (invariati)
  <script data-m="unico">/*unico_attore.js*/                         ← NUOVA riga 476: un tag solo, come writer_vita+eventi
  /*unico_catalogo.js*/
  /*unico_verbi.js*/
  /*unico_memoria.js*/
  /*unico_mente.js*/
  /*unico_segni.js*/
  /*unico_salva.js*/</script>
  (opzionale, solo ?commedia&ispettore: /*unico_ispettore.js*/ nello stesso tag)
build.py  TASS_FUORI |= {'unico_porta.js','unico_attore.js','unico_catalogo.js','unico_verbi.js','unico_memoria.js',
                         'unico_mente.js','unico_segni.js','unico_salva.js','unico_ispettore.js'}
```

| file | cosa contiene | righe stimate | dipende da |
|---|---|---|---|
| `unico_porta.js` | Il namespace `Unico`. Il caso a seme (`Unico.rng`, i flussi, `Math.random` instradato). La **trappola** su `G.HOOKS.step`/`create` (§1.2). Il registro delle fasi `Unico.fase()`. Il contatore degli errori. `Unico.passo` | 250 | `Game` |
| `unico_attore.js` | `Attore.di(st, chi)` (la vista), la tabella unica della roba `Roba` (i quattro cataloghi in uno), il posto di guida (`Unico.sedile`), `Attore.travasa` | 400 | Popolo, Oggetti, Azioni, Risacca, Protagonista |
| `unico_catalogo.js` | **Solo dati**: le schede dei verbi (§3.2), il lessico (genere, articolo, nome corto, plurale) per ogni chiave di `Roba`, le pose e i segni per verbo (§7), gli obiettivi e i metodi HTN (§3.3) | 900 (dati) | — |
| `unico_verbi.js` | Il motore dei verbi: i termini di `pre`/`eff`, `Verbo.puo/fai/qui/passi`, l'esecutore unico (scena, vicino, lontano, dormiente), le strategie A/B/C (§4), le prenotazioni, il menu QUI, ADESSO | 700 | attore, catalogo, Azioni (S.go/S.do) |
| `unico_memoria.js` | `Fatto` (il registro unico), gli indici per attore, tipo e luogo, le derivazioni (dicerie, rancori, cronaca, battute), il **reindirizzamento di `Vita.fatto`** e di `fatto` di casa | 450 | Vita (facoltativo) |
| `unico_mente.js` | `Mente` per NPC: l'utilità degli obiettivi, il pianificatore HTN con `procura` generalizzata, il livello di dettaglio, il «non si può» (NOPE), i limiti del pilota automatico | 800 | verbi, memoria, Popolo (orario) |
| `unico_segni.js` | Il canale della leggibilità: la bolla d'intento (pittogrammi in canvas 2D, nessun asset), la posa e l'oggetto in mano, la freccia a bordo schermo, la Cronaca (la Gazzetta del Porto), il Taccuino, il realizzatore italiano (`Lingua.art/part/concorda`) | 650 | commedia (stile D delle strisce), anim_vita (`BY_LABEL`) |
| `unico_salva.js` | Salvataggio e caricamento con versione: seme + delta, nessun riferimento a oggetti, IndexedDB A/B, gzip con `CompressionStream`, migrazioni | 400 | tutti |
| `unico_ispettore.js` | `?commedia&ispettore`: tocchi un NPC e vedi Attore, Mente (obiettivo e perché), gli ultimi 5 fatti con la catena, gli errori e i ms per fase | 250 | tutti |

Le prove (`src/test_unico_*.js`) non stanno in `index.src.html` e quindi non pesano sull'impronta.

### 1.2 Un solo aggancio al passo (al posto di cinque avvolgimenti)

**Il problema** (`DEBOLEZZE` §9). Oggi commedia (645), parola (1342), vita (936), iniziative (968) e casa (873) avvolgono uno dopo
l'altro `G.HOOKS.step`. L'ordine viene dai tag `<script>` e gli errori si tacciono dopo il primo.

**La soluzione.** `unico_porta.js` viene caricato prima di loro e mette una **trappola** sulla proprietà:

```js
// unico_porta.js — dopo che i moduli del gioco (risacca … writing, sottosuolo, tetti) hanno già composto la loro catena
const H = G.HOOKS, BASE = H.step;                  // la catena del gioco: non si tocca, è «la base»
const PRESI = [];                                  // [{ nome, fn }] nell'ordine di caricamento
let attesa = null;                                 // la «porta» che riceve chi legge H.step per avvolgerlo
Object.defineProperty(H, 'step', { configurable: true,
  get() { const k = PRESI.length; return attesa = (st, dt) => Unico._dentro(k, st, dt); },   // s0 del modulo k = «il prossimo nell'ordine»
  set(fn) { const nome = (document.currentScript && document.currentScript.dataset.m) || Unico._nomeProva || 'anon' + PRESI.length;
            PRESI.push({ nome, fn }); } });
// alla fine del caricamento (unico_attore.js, ultimo tag) la proprietà torna normale:
//   Object.defineProperty(H, 'step', { value: Unico.passo, writable: true, configurable: true });
```

- **Cosa riceve un modulo.** Ogni modulo, quando legge `s0`, riceve una porta. Quando la chiama non va alla catena vecchia: va alla
  **fase dichiarata come interna** a lui. Così ogni avvolgimento diventa una fase isolata, che si misura da sola.
- **L'ordine che si riproduce.** All'inizio l'ordine dichiarato è quello di oggi:
  `casa ⊃ iniziative ⊃ vita ⊃ parola ⊃ commedia ⊃ BASE`. In pratica gira così: vita.prima, commedia.prima, BASE, parola.tick,
  vita.dopo, iniziative, casa. Il comportamento resta identico. Conta soprattutto il saldo delle 19 di vita (`tieniDebiti`), che deve
  stare a cavallo della BASE.
- **Le fasi nuove.** Si registrano con `Unico.fase(nome, { dopo: 'casa', budget: {...} }, fn)` e nessuna avvolge più niente.
- **`Unico.passo(st, dt)`** è l'**unico** `G.HOOKS.step` che resta. Per ogni fase fa:
  - `performance.mark`;
  - `try/catch` con un **contatore che non si tace**: `Unico.err[fase]++`, l'ultimo stack, mostrati con `?perf` e nell'ispettore;
  - la misura in ms, in un istogramma per fase (p50/p95/p99/max).
- **Gli errori presi dentro dai moduli vecchi** (`Vita.err`, `step.err` di casa) si leggono dopo ogni fase e si contano. La prova
  `test_unico_errori.js` fallisce con un errore solo.
- **Il passo esterno.** `Game.step` si avvolge **una volta**, per ultimo (come fa già `parola.js:2784`): `Unico.inSim = true` durante
  il passo, per il caso instradato (§6.1), e una **guardia di rientro** (`if (Unico.inSim) return` più un contatore). Serve contro
  `Oggetti.passTime` (`oggetti.js:1152`), che chiama `G.step` fino a 4.000 volte.
- **`HOOKS.create`.** Stessa trappola, stesse regole: una fase `create` per modulo e una `Unico.nasce(st)` finale, che crea `st.u`.
- **Gli altri agganci** (`indoor`, `think`, `move`, `verb`) restano in catena: sono pochi e non pesano.
- **In Node.** Non c'è `document.currentScript`: le prove mettono `Unico._nomeProva = 'vita'` prima di ogni `require`.
  `test_unico_porta.js` controlla che con e senza trappola lo stesso seme dia la stessa sequenza di fatti, per 6 ore di gioco.

### 1.3 Le fasi e il loro bilancio (filo principale, per fotogramma)

| ordine | fase | ritmo | budget p95 (Iris Xe) | note |
|---|---|---|---|---|
| 1 | `vita.prima`, `commedia.prima` | ogni passo | 0,10 ms | compatibilità, finché non sono assorbite |
| 2 | **BASE** (la catena del gioco) | ogni passo | — | non è nostra |
| 3 | `parola`, `vita.dopo`, `iniziative`, `casa` | come oggi | 0,30 ms | da assorbire (§5) |
| 4 | `unico.verbi` (esegue i passi) | ogni passo | 0,15 ms | i passi in scena, al più 24 attori; i lontani sono una coda di eventi a tempo |
| 5 | `unico.mente` (sceglie e pianifica) | a quote | 0,25 ms | **≤ 4 scelte d'obiettivo e ≤ 2 piani HTN per passo**, a rotazione |
| 6 | `unico.memoria` (indici, dicerie, rancori) | 2 Hz | 0,05 ms | |
| 7 | `unico.segni` (bolle, freccia, cronaca) | ogni passo | 0,10 ms | il DOM solo quando cambia |
| 8 | `unico.salva` (a fette) | nel tempo libero | 0 nel passo | `requestIdleCallback`, ≤ 4 ms a fetta |
| | **in tutto le fasi nostre** | | **≤ 1,0 ms p95, ≤ 2 ms p99, ≤ 4 ms max** | il criterio di §9 |

---

## 2. Le forme dei dati

Tutto lo stato del sistema sta in **`st.u`**. Contiene solo numeri, stringhe, array e oggetti semplici: **mai riferimenti a NPC,
edifici o funzioni**. Un riferimento è sempre un id: `'player'`, `n.id`, `'b:123'` per un edificio, `'v:45'` per un mezzo.

```js
st.u = {
  v: 1,                        // versione dello schema (§6.3)
  seme: 1986, rng: { mente: [a,b,c,d], verbi: [...], mondo: [...], vecchi: [...] },   // stati sfc32 (4 × uint32)
  sedile: 'nino',              // l'attore che il giocatore guida adesso (§8.3)
  corpi: { nino: {...} },      // solo i corpi che oggi non hanno un posto (Nino quando non è guidato; i campi in più degli NPC)
  menti: { [id]: Mente },      // §2.3
  fatti: { n: 0, anello: [...], notevoli: [...], conti: {...} },   // §2.4
  pren: { [chiave]: [attoreId, scade] },                          // prenotazioni (RimWorld)
  coda: [[t, attoreId, verbo, argsId, fid]],                       // gli esecutori lontani: eventi a tempo, ordinati
  cronaca: [...], taccuino: {...}, stats: {...}, classe: 'xe'|'tel'|'alto'   // la classe del dispositivo, salvata (§2.5)
}
```

### 2.1 `Attore`: il corpo

`Attore.di(st, chi)` restituisce una **vista**: non copia niente e legge e scrive con getter e setter sullo stato vero. Le viste sono
in cache in un `WeakMap` sull'NPC e non si salvano mai. Si salvano i dati sotto (§6).

| campo | tipo | giocatore (`sedile`) | abitante o membro | note |
|---|---|---|---|---|
| `id` | string | l'id dell'attore seduto (`'nino'` o `n.id`) | `n.id` | **l'identità non cambia con la presa** |
| `nome`, `sesso` | string, `'m'\|'f'` | `G.PLAYER_NAME`, `'m'` | `n.first`, `n.pop.sex` | `sesso` serve al realizzatore (§7.4) |
| `tipo` | `'nino'\|'abitante'\|'membro'\|'cast'\|'guardia'` | | | i `cast`, le guardie e i capi hanno `eccezioni` (tag) |
| `x, y, face` | number | `st.player.*` | `n.*` | |
| `dove` | `{k:'fuori'}\|{k:'dentro',b,f}\|{k:'sotto',lv}` | `p.indoor`, `p.lv` | `n.inside`/`n.room` più `n.__u.dove`, scritto solo da `Verbo` | la quota dell'NPC nasce qui |
| `borsa` | `Map<chiaveRoba, q>` (vista) | `st.player.inv` | `n.pop.inv` | le chiavi sono quelle di `Roba` (§2.1.1) |
| `casa` | `{bi, dispensa: Map}` | `st.me.home`, `st.me.stash` | `n.pop.homeT`, `n.pop.casa` | |
| `soldi` | number (get/set) | `st.player.money` | `n.pop.money` | |
| `mano` | chiaveRoba\|null | `p.hand`/`p.cur` | `n.hand` | |
| `bisogni` | `{fame,sonno,igiene,svago,compagnia,rabbia,paura}` 0..1 | `st.me.need` | `n.pop.need` | stessi nomi (`popolo.js:450`, `protagonista.js:61`) |
| `mezzo` | id mezzo\|null | `p.vehicle` | `n.inVeh` | |
| `lavoro` | `{posto, inizio, fine, notte, mestiere}` | `st.me.job` | `n.pop.job` | |
| `abilita` | `{manualita, cucina, pesca, vendere, forza, furtivita, pittura, …}` 0..1 | `st.me` più i mestieri | dai tratti, dal mestiere e da `n.ris` | cambiano la riuscita e la durata, mai l'accesso a un verbo |
| `banda` | `{membro, auto, lealta}` | `true` | `n.ris` | |
| `decisore` | `'giocatore'\|'mente'\|'ordini'` | `'giocatore'` | `'mente'`, o `'ordini'` se `n.ris.auto === false` | **l'unica cosa che cambia nella presa** |
| `lod` | `'scena'\|'vicino'\|'lontano'\|'dormiente'` | `'scena'` | §3.4 | |
| `eccezioni` | `Set` | | | `nonGuidabile`, `nonDerubabile`, `trama` (Garante, capi dei Grigi) |

#### 2.1.1 `Roba`: un catalogo solo

Le chiavi di `Roba` sono quelle di `Oggetti.CAT` (`oggetti.js:42`), cioè la verità. Le altre si traducono con una tabella sola:
- `Azioni.ITEMS` (`azioni.js:55`);
- `Risacca.RES` (`risacca.js:19`, oggi `RIS2ITEM` :1083);
- `Economia.MERCI` (`economia.js:23`);
- i nomi di `casa.js:94-113`.

Ogni voce ha `{ g: 'm'|'f', art: 'il'|'lo'|'la'|"l'", pl, corto, prezzo, peso, prop: [...], rubabile, commestibile, attrezzo }`. Il
lessico sta in `unico_catalogo.js`. Le proprietà vengono da un vocabolario chiuso di 24 parole (rigido, pesante, lungo, appuntito,
contenitore, legno, metallo, stoffa, commestibile, infiammabile, …): sono quelle del rapporto strumenti §2.1, che però qui servono solo
ai ruoli dei verbi (le sostituzioni restano fase successiva). Questo chiude `DEBOLEZZE` §13: i due `genere()` (`parola.js:78`,
`iniziative.js:107`) si sostituiscono per avvolgimento con `Lingua.art`.

### 2.2 `Verbo`: una scheda di dati

```js
Verbo.registra('compra', {
  fam: 'scambia',                                   // famiglia: la posa di ripiego e la bolla (§7)
  args: { cosa: 'roba', q: 'n?', dove: 'bottega?' },
  ruoli: {},                                        // (fase 2) i ruoli per proprietà: percussore, perno…
  pre: [['vicino', 'bottega_che_vende', '$cosa', 2.5], ['aperta', '$dove'], ['soldi>=', '$prezzo*$q'], ['scorta>=', '$dove', '$cosa', '$q']],
  eff: [['-soldi', '$prezzo*$q'], ['+borsa', '$cosa', '$q'], ['-scorta', '$dove', '$cosa', '$q'], ['+cassa', '$dove', '$prezzo*$q']],
  costo: { min: 3, soldi: '$prezzo*$q', rischio: 0, fatica: .01 },
  dove: ['bottega_che_vende', '$cosa'],             // la meta del passo «vai» (la cerca il pianificatore)
  prenota: ['scorta:$dove:$cosa'],
  posa: 'porge', oggetto: '$cosa', dur: 4,          // la messa in scena (secondi veri, solo in scena)
  segno: { bolla: ['moneta', '$cosa'], cambia: 'scorta', cronaca: { soglia: 40, riga: '{A} compra {cosa} {da}' } },   // §7
  testimoni: null, illegale: false,
  fornitore: { A: 'Economia.buy', B: 'Oggetti.buy', C: 'eff' },   // §4: chi lo esegue davvero, per livello
  pubblicizza: ['procura:$cosa', 'fame?', 'arredare?'],          // a quali obiettivi serve (l'advertisement dei Sims)
  etichetta: a => `Compra ${Lingua.art(a.cosa)}`,                // il menu QUI, ADESSO
});
```

**I termini** sono una trentina e si valutano sui dati, senza effetti:
- condizioni: `ha`, `ha_n`, `soldi>=`, `mani_libere`, `vicino(tipo, …, r)`, `dentro(b)`, `casa_mia`, `ora(da, a)`, `notte`,
  `non_visto`, `banda`, `rel>=(chi, campo, v)`, `aperta`, `scorta>=`, `postazione`, `abilita>=`, `libero(pren)`, `non(termine)`;
- effetti: `±borsa`, `±soldi`, `±bisogno`, `±scorta`, `±cassa`, `muovi`, `piazza`, `togli`, `muro`, `casa(op)`, `rel(chi, campo, d)`,
  `nota`, `emit`.

Ogni effetto **scrive un fatto** da solo (§2.4). Nessun verbo scrive fatti a mano.

**Le entrate**, le stesse per tutti:

| funzione | ritorna | chi la chiama |
|---|---|---|
| `Verbo.puo(st, chi, v, a)` | `''` oppure il perché, in italiano | il menu, la Mente, `Parola.verifica` |
| `Verbo.fai(st, chi, v, a, {causa})` | `{ok, msg, fid, compito}` | il menu del giocatore, gli ordini alla banda, la Mente |
| `Verbo.qui(st, chi)` | `[{v, a, etichetta, perche?}]` (i possibili adesso, più i «quasi» con il perché in grigio) | **il menu QUI, ADESSO** del sedile e quello del membro guidato |
| `Verbo.passi(st, chi, v, a)` | i passi `S.go/S.do` di `Azioni` | l'esecutore in scena e vicino |
| `Verbo.applica(st, chi, v, a)` | applica `eff` (strategia C) | l'esecutore lontano, i macroverbi |

**Il menu del giocatore.** `Azioni.playerActions` si avvolge così: `st => vecchi(st).filter(x => !Verbo.copre(x.id)).concat(
Verbo.qui(st, Unico.sedile).map(…))`. I verbi non ancora migrati restano dove sono (strangolatore).

### 2.3 `Mente`

```js
st.u.menti[id] = {
  id, v: 1,
  carattere: { cor, loq, avid, legge,               // n.tr (game.js), già al seme
               pigro, orgoglio, teatrale, generoso, rancore },   // derivati deterministici da hash(id, seme): 0..1
  gusti: { stile: 'liberty', colori: [...], ints: ['carte','pesca'] },   // casa.js §3 + n.pop.ints
  abilita: {...},                                   // la stessa dell'Attore (copia corta, si rilegge)
  orario: { blocco: 'lavoro', fino: t, src: 'popolo' },   // Popolo.blockNow (popolo.js:691): il lavoro e l'orario restano di popolo
  memorie: [[fid, forza, fonte]],                   // ≤ 32: fonte 'f' l'ha fatto, 'v' l'ha visto, 's' l'ha sentito (da chi: fid della chiacchiera)
  rel: { [altroId]: [aff, fid, debito, rancore, tVisto] },   // ≤ 24; aff/fid -1..1, debito in lire (+ mi deve), rancore 0..1
  ob: { g: 'riscuotere', a: { chi: 'p12' }, u: .62, perche: fid, t0 },   // l'obiettivo corrente
  piano: { passi: [[v, aId]], i: 0, t0, metodo: 'compra' },   // gli argomenti sono id
  nope: { 'compra:vernice': tFino },                // il «non si può» (4 ore, come NOPE di iniziative.js)
  prossima: t,                                      // quando si rivaluta
  limiti: null | { spesaMax, niente: ['vendi_banda','violenza'] }   // il pilota automatico del corpo lasciato (§8.3)
}
```

### 2.4 `Fatto`

```js
// un fatto: tupla corta nell'anello (2.000), e i «notevoli» (≤ 600, per peso × pubblico × novità) tenuti per sempre
{ id: 4812,               // intero progressivo (st.u.fatti.n)
  t: 3021.5,              // minuti di gioco
  v: 'compra',            // il verbo (o 'esito:<tipo>' per gli esiti composti: 'vinto_oggetto', 'appuntamento_buca')
  chi: 'p12', con: ['bottega:7'],   // attori e controparti (id)
  cosa: 'vernice', q: 1, soldi: -6,
  dove: [x, y, 'b:123'|'mercato'],
  esito: 'ok'|'no'|'meta'|'colto',  // colto = visto mentre faceva una cosa illecita
  causa: 4790, peso: .6, hop: 1,    // la catena di Vita.fatto (×0,6, si ferma sotto 0,15)
  test: ['p3','p40'],               // testimoni entro 18 m, non al chiuso (la stessa regola di emitSeen)
  vis: 1,                           // il giocatore l'ha visto (entro 26 m) o sentito (entro 60 m): 2 / 1 / 0
  segno: 'bolla+posa',              // il segno dato davvero (§7), per la prova di leggibilità
  pub: .4 }                         // quanto è pubblico (0..1): decide cronaca e dicerie
```

**Cosa si ricava dal fatto.** Sono funzioni pure su `fatti` più `menti`, mai stato a parte:

| derivato | regola | dove si vede |
|---|---|---|
| **diceria** | Il testimone, alla prossima `chiacchiera`, passa un fatto con `pub ≥ .3` o con lui dentro. Va nelle `memorie` dell'altro come `'s'` e con forza ×0,7. Muta solo nei dettagli (`cosa`, `q`), mai in `chi` | la battuta «Hai sentito? …», il Taccuino |
| **battuta** | Si sceglie dopo il fatto: `(v, esito, rel, carattere)` → banco, con la memoria per frase alla Ruskin (nessuna riga due volte in 2 ore sentite) | la bolla |
| **cronaca** | Ogni giorno alle 7:00, i 5 fatti con `pub × peso × novità` più alti del giorno prima. La novità è 1 se il verbo e il luogo non sono usciti negli ultimi 3 giorni | la Gazzetta |
| **rancore** | Furto, buca, debito scaduto o sfottò: `rel.rancore += k(v)`, che decade del 10% al giorno. Sopra .5 nascono gli obiettivi `rinfacciare` e `vendicarsi` | la bolla di muso, la battuta |
| **debito** | Prestito o regalo: `rel.debito` (sostituisce `n.pop.debiti` di vita, che resta come vista) | il Taccuino, il rinfaccio |

### 2.5 La classe del dispositivo

All'avvio si sceglie `classe` (`'tel'` se `Peso` dice telefono, `'xe'`, `'alto'`). La classe decide i raggi dei livelli e le quote della
Mente:

| classe | raggio scena | massimo in scena | piani HTN per passo |
|---|---|---|---|
| tel | 30 m | 16 | 1 |
| xe | 45 m | 24 | 2 |
| alto | 45 m | 32 | 3 |

La classe **si salva**: una partita ricaricata sullo stesso dispositivo si rifà uguale. Le prove fissano la classe.

---

## 3. Le parti del sistema

### 3.1 Il corpo: tutti uguali, ognuno il suo

`Attore.di` è l'unica cosa che i verbi conoscono. Le differenze fra le vite **non stanno nei verbi**:
- la **borsa** e la **casa** dicono cosa si può fare senza procurarsi niente;
- il **lavoro e l'orario** dicono quando;
- l'**abilità** dice quanto viene bene e quanto dura;
- il **carattere** sposta i costi dei metodi (il pigro preferisce comprare, l'orgoglioso non chiede in prestito, il teatrale fa le cose
  in piazza);
- le **relazioni** aprono il prestito, il baratto e l'aiuto.

### 3.2 I verbi del primo giro (il catalogo, ventidue schede)

Si migrano per primi i verbi che servono alla mattina sul molo (§8) e i dieci di `STRUMENTI_NPC.md` §5:

`vai`, `entra`, `esci`, `prendi` (da casa, da un contenitore), `posa`, `dai`, `regala`, `presta`, `chiedi_prestito`, `rendi`, `compra`,
`vendi`, `baratta`, `mangia`, `bevi`, `fai_ricetta`, `costruisci`, `smonta`, `arreda` (`Casa.fai` posa/scambia/butta), `ridipingi`
(`Casa.fai` dipingi), `dipingi_muro`, `pesca`, `lavora` (il turno), `chiacchiera`, `proponi_appuntamento`, `rinfaccia`, `salda`,
`monta`/`smonta_mezzo`, `dormi`.

### 3.3 La mente: l'utilità per l'obiettivo, l'HTN per i mezzi

**Gli obiettivi** sono 18 e stanno nel catalogo come dati: `{ g, considera: [[curva, fonte, peso]], metodi: [...] }`.

| obiettivo | considerazioni principali (a curva tabulata, moltiplicate) | metodi (in ordine di costo per carattere) |
|---|---|---|
| mangiare | fame, ora del pasto, soldi | mangia(dispensa) → compra(cibo)+mangia → fai_ricetta(cibo) → chiedi_prestito → pesca+fai_ricetta |
| lavorare | blocco `lavoro` di popolo, puntualità | vai(posto) → lavora (fornitore `Oggetti.workHour/produceHour`, `Mestieri.perform`) |
| guadagnare | soldi < affitto, debito | vendi(surplus) → lavora(extra) → pesca+vendi → baratta |
| fare scorta (bottegai) | scorta < soglia | compra(all'ingrosso) → fai_ricetta |
| arredare / ridipingere | gusto contro casa, soldi, voglia (`casa.js voglie`) | procura(vernice)+ridipingi · compra(mobile)+arreda · baratta |
| costruire (progetto) | bisogno del posto (bancarella, tettoia, capanna), legname | procura(assi)+costruisci · chiedi aiuto |
| socializzare | compagnia, amici vicini | chiacchiera · proponi_appuntamento · offri |
| regalare | generoso, rel.aff > .25, surplus che l'altro vuole (`Scambi.wants/surplus`) | regala |
| prestare / chiedere | soldi dell'altro, fiducia, debito | presta · chiedi_prestito |
| riscuotere / rinfacciare | rel.debito scaduto, rancore | vai(da lui) → rinfaccia → salda (se l'altro ha soldi) |
| vendicarsi | rancore > .7, legge bassa | sfotti · dipingi_muro(scritta) · (fase 2: ruba) |
| dipingere il muro | writer, muro libero vicino | procura(bomboletta)+dipingi_muro |
| pescare, divertirsi, dormire, igiene, pregare | i bisogni e gli interessi (`ints`) | i verbi omonimi, sugli oggetti intelligenti di `popolo.js:164` |

**La scelta.** `u(g) = Π curva_i(x_i) × (1 + .3·carattere_g) × (1 − nope) × inerzia`. L'inerzia vale +15% all'obiettivo in corso. Vince
il massimo; a parità decide `rng.mente`, seminato. Le reazioni di `Azioni.react` (`azioni.js:911`: scappa, aiuta) e le scene di
`eventi.js` **hanno sempre la precedenza**: la Mente si mette in pausa se `n.action.name !== 'routine'` o se `n.__ev`.

**L'HTN** è la `procura` di `iniziative.js:350` generalizzata.
- `procura(cosa, q)` è un compito composto. I metodi sono, in ordine: ce l'ho → prendi da casa → compra → `fai_ricetta` (ricorsiva,
  profondità 3, sulle `RECIPES`) → raccogli → chiedi_prestito (`prestatore`, :347) → baratta.
- Il piano si ferma al **primo `vai`** (piano parziale): il resto si espande all'arrivo.
- Prima di partire **prenota** la scorta, la postazione o il muro.
- Un piano fallito mette `nope[verbo:cosa] = t + 240`.
- Le catene riuscite più spesso (raccogli legna → fai assi → costruisci) diventano **macroverbi**, con `pre`/`eff` sommati e la durata
  sommata, per il livello lontano.

### 3.4 I livelli di dettaglio (gli stessi per il verbo e per la mente)

| livello | chi | la mente | il verbo | costo |
|---|---|---|---|---|
| **scena** | entro il raggio di classe (`Azioni.CFG.sceneR` = 45 m) e `n.pop.near`, più il sedile | si rivaluta ogni 2-10 s di gioco o a un fatto vicino; HTN pieno | passi veri (`S.go/S.do`), posa, oggetto in mano, bolla; poi il fornitore A o B | come un piano di `Azioni` |
| **vicino** | `n.pop.near` (≤ 84) fuori dal raggio | ogni 30 minuti di gioco, o al cambio di blocco | `runPlan` senza camminare (arriva dopo il tempo di strada, `azioni.js:226`) | µs a passo |
| **lontano** | gli altri | al cambio di blocco di popolo (circa 6 al giorno), solo fra macroverbi | **un evento** in `st.u.coda` a `t0 + costo.min`, che poi applica `eff` (C) | un confronto in coda a passo |
| **dormiente** | dentro case chiuse, campi lontani | niente | le righe si accodano (come `st.casa.case[bi].ops`) e si mettono in opera all'arrivo | zero |

**Il cambio di livello a metà.** Si passa dall'uno all'altro con la frazione di tempo trascorsa. Il fornitore non si chiama due volte:
il verbo ha un `fatto` di apertura e uno di chiusura, e la chiusura avviene una volta sola.

**Il test di parità.** Lo stesso verbo, 1.000 volte vicino e 1.000 lontano, deve dare la distribuzione degli esiti entro il 5% e la
durata media entro il 10%.

---

## 4. Come i sistemi vecchi entrano come adattatori

Le strategie per chiamare il codice vecchio (da `STRUMENTI_NPC.md` §4.4):
- **A, diretta**: la funzione accetta già l'attore;
- **B, cambio di persona**: `Unico.come(st, attore, fn)`. È sincrona, con `try/finally`. Mette una vista dell'NPC al posto di
  `st.player`/`st.me`, zittisce `G.feed`, `st.sfx` e `Game.step`, e funziona **solo in scena**;
- **C, dai dati**: applica `eff`, derivato dalle tabelle del modulo (`RECIPES`, `B` del cantiere), mai da una copia del codice.

| sistema vecchio | ruolo nel sistema unico | adattatore (file `unico_catalogo.js` / `unico_verbi.js`) | strategia | cosa si perde o resta |
|---|---|---|---|---|
| `Azioni.VERBS` (`azioni.js:443`, 34 verbi) | fornitore di verbi e di passi | `Verbo.daAzioni(nome)`: `can` diventa un termine `['azioni_can', nome]`; `plan` diventa i passi; gli effetti si dichiarano a mano per i 12 verbi del primo giro | A | resta tutto; `intend` (:484) diventa una scorciatoia per `Verbo.fai` |
| `Azioni.startPlan/runPlan` (:184/208) | **l'esecutore in scena e vicino**, per tutti | `Verbo.passi` produce `S.go/S.do`; il `do` finale chiama `Verbo.compi` | A | resta: è l'unico esecutore a passi |
| `Risacca.VERBS` (:128) e `runTask` (:1051) | gli ordini alla banda | `RS.EXT.plan.verbo` e `RS.EXT.do.verbo` (come `mestieri.js:249-260`): un ordine diventa `Verbo.fai(st, n, …)`. I ~55 verbi di Risacca restano per quello che il catalogo non copre | A | `runTask` resta per `seguimi`/`aspetta`; il resto passa a `runPlan` |
| `Risacca.will` (:358), `autonomy` (:1230) | la volontà del membro | diventa una considerazione della Mente: lealtà, rischio, linea della banda | — | si spegne `autonomy` per i membri con Mente (`st.ris.autoOff` per membro) |
| `Iniziative V` (`iniziative.js:218`, 19 atomi) | i **metodi HTN** «estri» (lotteria, gara, colletta…) | ogni atomo è un compito composto `estro:<nome>`: `prova` diventa un termine, `fine` diventa un fornitore A che scrive l'esito come fatto `esito:*` | A | restano i testi e le forme; il motore delle iniziative viene assorbito (§5) |
| `iniziative.procura`, `passiRoba` (:350/388) | il **pianificatore** | generalizzato in `unico_mente.js`; `passiRoba` viene sostituito da `fai_ricetta` (B/C) | — | si cancella `passiRoba` (era una copia di `craft`) |
| `iniziative.apriCantiere` (:463) | — | sostituito da `costruisci` (B `Cantiere.place`) | B | si cancella |
| `Casa.fai` (`casa.js:503`) | i verbi `arreda`, `ridipingi`, `pavimento`, `butta`, `riordina` | registrazione diretta; `fattoCerto` (:520) si devia su `Fatto` | A | resta tutto, è il modello |
| `Oggetti.craft` (:1123) | `fai_ricetta` | in scena B con `Game.step` zittito (contro `passTime` :1152) e il tempo contato dal passo; vicino e lontano C da `RECIPES` (ingredienti, uscite, `min`, usura) | B/C | `suspicious` funziona da solo con la vista dell'NPC |
| `Oggetti.buy/sell` (:1504/1523) | `compra`/`vendi` in bottega | B in scena; altrove A con `Economia.buy` (:109) più `+borsa` (oggi `Economia.buy` non dà la roba) | A/B | |
| `Oggetti.consume` (:1168) | `mangia`/`bevi`/`usa` | A sui bisogni dell'Attore; B per il sedile | A/B | |
| `Oggetti.pickpocket/takeFrom/putInto/barter` | `ruba`, `prendi`, `posa`, `baratta` | B in scena, C altrove | B/C | |
| `Cantiere.canPlace/place/remove` (`cantiere.js:390/414/438`) | `costruisci`/`smonta` | B (`lvOf`, `covoOf`, `pay` leggono il giocatore); i covi per attore stanno in `st.u.corpi[id].covo` | B | `jobsStep` (:553) resta per la banda |
| `Cantiere.terrainDo` (:228), `cropDo` (:455) | `disbosca`, `zappa`, `semina` | A (`bag`) / B | A/B | |
| `Economia` (scorte, prezzi) | il **mondo delle botteghe** | si legge e si scrive con i termini `scorta`, `cassa`, `prezzo` | A | resta |
| `Scambi.take/put/deal/wants/surplus` (`scambi.js`) | le primitive della borsa e dei bisogni di roba | `Attore.borsa` le usa | A | resta |
| `Mestieri.perform` (:198) | `lavora:<abilità>` | registrazione diretta | A | resta |
| `Writing.npcWork/addWork`, `Popolo.paintWall` (:1509) | `dipingi_muro` | A; il posto e lo stile li sceglie `WA.conceive` come oggi | A | la disposizione dei graffiti non si tocca |
| `Popolo.planDay/blockNow` (:581/691), `PROJ` (:1311) | **il lavoro e l'orario** (fornitore della Mente) | la Mente legge il blocco; i `PROJ` diventano obiettivi con i loro passi come metodi | — | `planDay` resta (è la giornata); i `PROJ` si assorbono pian piano |
| `Azioni.react` (:911) | le reazioni immediate | precedenza assoluta; la Mente aspetta | — | resta |
| `Vita.scambio` / `registraIntento` (`vita.js:836/318`) | la **parola** dei verbi sociali | `regala`, `presta`, `rinfaccia`, `proponi_appuntamento` chiamano `Vita.scambio` come fornitore delle battute | A | §5 |
| `Parola.capisci/verifica/rispondi` (`parola.js:345/441/908`) | il giocatore che parla e ordina | `DEF` (:374) mappato sul registro: l'intento diventa `Verbo.puo` e poi `Verbo.fai` | A | §5 |
| `Commedia.filtra` (`commedia.js:580`) | la regia delle battute *vecchie* | resta come filtro dei banchi di `popolo`/`matti`; le battute dei fatti passano da `Segni` | — | §5 |
| `Protagonista.myActions` (:235) | i verbi della vita di Nino | diventano verbi comuni (`lavora`, `dormi`, `lavati`, `spesa`) sul sedile | A | il menu passa da `Verbo.qui` |
| `Game.shoot`, `pickUp/vanish/bury` | combattimento e corpi | registrazione diretta (fase 2: la Mente non li usa nella mattina) | A | |
| `Guardaroba.wear`, `Livelli.dig*`, `Sottosuolo`, `Soldi`, cassaforti | fase 2 | B, oppure aspettano la quota `dove` | B | non entrano nella prima tappa |

---

## 5. Come si assorbono vita, iniziative, casa, parola e commedia

L'ordine è sempre lo stesso: (1) il sistema unico c'è e il modulo vecchio gira come fase; (2) il modulo diventa fornitore e la sua
decisione si spegne; (3) dopo che il flag diventa di serie e le prove passano per due settimane, **si cancella il codice morto in
un commit dichiarato**, con l'ok della direzione.

| modulo | resta (fornitore) | si spegne subito, per monkeypatch | si cancella più avanti |
|---|---|---|---|
| **vita.js** | `Vita.scambio` e le banche delle battute degli intenti; il Taccuino «Sentito dire», che diventa una sezione del Taccuino unico | `Vita.fatto` → `Fatto.scrivi` (stessa firma, `chi/dati/causa`, peso ×0,6). Il `giro` decisionale (le coppie vicine al giocatore): `Vita.CFG.R = 0` per gli intenti che la Mente copre. `T.CFG.voce = 0` di matti si toglie (DEBOLEZZE §5) | il `giro` (le scelte), `tieniDebiti` (i debiti vanno in `rel.debito`), `contoDebito`/`contoBuca`/`contoFurto` come decisori; il MutationObserver (:1005) |
| **iniziative.js** | gli atomi `V` come metodi HTN e i loro testi; i muri (`crossa`, `ripassa`) come fornitori di `dipingi_muro` | `proponi` e `componi` (la scelta) passano alla Mente, che chiama `estro:*`; `Math.random` di :42 passa al flusso instradato (§6.1) | `procura`/`passiRoba`/`apriCantiere` (copie), i bisogni (:866), `NOPE`, che va in `Mente.nope` |
| **casa.js** | tutto il registro (`fai`, `mettiInOpera`, `inScena`, `M`, `VERBI`): è il modello | `decidi`/`voglie` (chi vuole arredare) diventano considerazioni della Mente; `fattoCerto` passa a `Fatto` | la scelta interna (`giro` delle voglie), quando la Mente la copre al 100% (prova: stesse operazioni per giorno ±15%) |
| **parola.js** | `capisci`, `verifica`, `rispondi`, le promesse (`P._.chiudi`), i banchi | `DEF` sui verbi; `chiamaIA` spenta (decisione B); `G.step` rallentato con la UI aperta: lo tiene la fase | il motore `task`/`piano` di `DEF` (va a `Verbo.fai`); il secondo MutationObserver (:2925) passa a un Taccuino unico |
| **commedia.js** | `filtra` sulle fonti vecchie, lo stile D delle strisce (`CSS_D`), le regole di contesto §9 | l'accessor `bark` (`defineProperty`, :640) resta, ma le battute dei fatti passano da `Segni.dire`, che chiama `filtra` una volta e scrive `n.bark` già filtrato | le correzioni a regex (§5-§9) quando migrano nei banchi d'origine (`DEBOLEZZE` §4, lavoro a parte) |

---

## 6. Il caso a seme, il salvataggio, il caricamento

### 6.1 Il caso a seme

1. **`st.rng` diventa salvabile.** In `HOOKS.create` (la fase della porta, prima di tutti) `st.rng` si sostituisce con lo **stesso
   algoritmo** di `game.js:11` (xorshift32), lo stesso seme e lo stato esposto: `st.rng = Unico.xs32(seme)`, `st.rng.s` si legge e si
   scrive. Una partita nuova ha **la stessa sequenza** di prima, quindi il comportamento di serie non cambia (lo verifica una prova).
   Lo stato si salva.
2. **I flussi nostri**: `sfc32`, stato `[a,b,c,d]` in `st.u.rng[nome]`, seme `hash(seme, nome)`. I flussi sono `mente`, `verbi`,
   `segni` e `vecchi`. Un flusso per sottosistema fa sì che cambiare un banco di battute non cambi le decisioni.
3. **`Math.random` instradato.** I moduli vecchi lo chiamano senza seme (`vita:52`, `iniziative:42`, `casa:39`, `commedia:261`,
   `popolo:450`). `unico_porta.js` mette `Math.random = () => Unico.inSim ? flusso('vecchi') : orig()`. `inSim` vale `true` solo
   dentro `Game.step` e `create`. Il disegno, three.js e la UI continuano a usare il caso vero, che non tocca la simulazione. È lo
   stesso trucco di `seme.js`, ma solo dentro il passo.
4. **Niente tempo reale nelle decisioni.** I budget sono a **conteggio** (§1.3). `performance.now()` serve solo a misurare. Quando si
   sfora il tempo **non si rimanda** niente: si segna e basta, e se capita più di 1 volta su 100 la classe scende al salvataggio dopo.
   `requestIdleCallback` si usa solo per cose senza effetti sulla storia: le piante di casa (con `op.s` a seme) e la compressione del
   salvataggio.
5. **Fuori da `inSim`** (gli ascoltatori della UI, i `setTimeout`) **non si scrive mai** `st`. Il menu e la chat mettono la richiesta
   in `st.u.ingressi` e il passo la applica: così si registra un replay (seme + ingressi).

### 6.2 Il salvataggio: seme più delta, senza cicli

- **Dove.** IndexedDB `pv-unico`, due slot A e B più un puntatore (come il banco), gzip con `CompressionStream`. Se non c'è,
  `localStorage` con l'ultimo slot sotto i 4 MB. Si chiede `navigator.storage.persist()`.
- **Quando.** A `visibilitychange → hidden` (la WebView Android chiude la pagina in background), ogni 3 minuti reali, al sonno di
  Nino e all'uscita.
- **Il costo.** La serializzazione si fa **a fette nel tempo libero**, ≤ 4 ms a fetta. Gzip è nativo e asincrono, quindi è fuori dal
  passo. Il banco dava 4-9 ms per serializzare 1.000 NPC: qui lo stato è più piccolo, ~150-300 KB compressi stimati.
- **Cosa si salva.** Il formato è un JSON con `v`:

  ```js
  { v: 1, gioco: PV_VER_hash, seme, t, clock, classe,
    rng: { st: s, unico: {...} },
    player: { x, y, face, money, inv, arms, cur, hand, indoor, lv, worn },  me: {...st.me},
    npcs: { [id]: { x, y, face, inside, money, inv, casa, need, debiti?, ris?: {member, auto, loyalty, carry}, dead, jailedUntil } },   // solo i campi che cambiano
    nuovi: [ { id, look, sched, ... } ],      // gli NPC nati in partita (automobilisti, Nino lasciato): il loro makeNpc
    u: st.u,                                  // già puro per costruzione
    casa: { case: { [bi]: { ops } } },        // il registro di casa.js: si rimette in opera all'arrivo (rifai, casa.js:885)
    ini: adattatore(st.ini), vita: adattatore(st.vita), parola: adattatore(st.parola),
    muri: st.pop.walls, opere: Writing.S(st).works, covo: st.covo, scorte: Economia.S(st), mezzi: [...] }
  ```

- **I cicli.** A 72 ore oggi la serializzazione fallisce. L'origine probabile, da confermare col cercatore di cicli nella prova:
  - i riferimenti a NPC in `st.ini` (`E.L`, `E.arr`, `E.cast`, `E.benef`, `iniziative.js:519`);
  - `st.casa.scene` (`n`, `P0` con chiusure, `casa.js:593`);
  - `st.vita.gruppi` (`sub.a/b`).

  Ogni modulo ha un **adattatore** `{ via(x) → puro, torna(puro, st) → x }`, che mette gli NPC come `{$n: id}` e toglie le scene in
  corso (si chiudono come «fatte», come fa già `casa.js` quando entra il giocatore). `Salva.puro(x)` visita con un `WeakSet` e
  **lancia un errore** se trova una funzione, un NPC (`.pop` o `.look`) o un ciclo. La prova lo usa ogni 6 ore di gioco.
- **Il caricamento.**
  1. `G.create(seme)`: la città di serie, identica.
  2. `st.t`, `clock` e `rng` dal salvataggio.
  3. Il delta sui giocatori e sugli NPC; quelli nati in partita con `makeNpc`.
  4. `torna` per ogni modulo.
  5. Gli NPC lontani con `snapFar`.
  6. `HOOKS.indoor` se il giocatore è dentro.
- **Le versioni.** `MIGRA = { 1: s => s, 2: s => {...} }` applicate in fila. Se l'impronta del gioco (`gioco`) cambia, si carica lo
  stesso e si scrive un avviso nell'ispettore. Un salvataggio di versione futura non si carica e non si sovrascrive.
- **La prova di verità** (`test_unico_salva.js`). Seme 3: 72 ore, si salva, si carica in un processo nuovo e si gioca 6 ore. Si
  confronta con lo stesso giro senza salvataggio. L'hash dei fatti delle 6 ore deve essere **identico**, e così soldi, borse e
  operazioni di casa.

---

## 7. La leggibilità: ogni fatto ha un segno che si vede

**La regola.** Non si registra un verbo senza `segno`, e la prova lo rifiuta. Ogni fatto con `vis ≥ 1` deve avere almeno un segno
**entro 5 s**. Se un sistema non riesce a dare il segno, il verbo non entra nel catalogo.

### 7.1 I canali

| sigla | canale | quando | dove sta |
|---|---|---|---|
| **B** | la **bolla d'intento**: un pittogramma (12 forme disegnate in canvas 2D, nessun asset) più 1-4 parole, nella striscia dello stile D di commedia; dura per tutto il verbo | in scena, ≤ 26 m: bolla piena; 26-60 m: solo il pittogramma, più grande | `unico_segni.js` |
| **P** | la **posa e l'oggetto in mano** (`anim_vita.js`: la posa dichiarata → `BY_LABEL` → la famiglia → la parte alta `_su`; `vprop` per l'oggetto) | in scena | l'etichetta del passo di `Verbo.passi` |
| **O** | il **cambio nel mondo**, che resta: la roba sul banco, la parete ridipinta, la tettoia, il muro dipinto, la scorta vuota, la cassetta di pesce | sempre (la cosa resta); si vede quando ci si passa | il fornitore stesso |
| **D** | la **battuta** dopo il fatto (dai banchi, filtrata da commedia) | ≤ 12 m, al più 1 ogni 10-15 s nei posti pieni | `Segni.dire` |
| **F** | la **freccia a bordo schermo** verso un fatto con `pub ≥ .5` fuori vista, al più una ogni 90 s (al posto della camera, che non si tocca) | 26-60 m | DOM |
| **C** | la **Cronaca**: una riga nella Gazzetta del Porto (scheda del Taccuino), con l'edizione delle 7:00 che la notifica (`G.feed`, una riga) | fatti con `pub × peso ≥ soglia` del verbo, o con `hop ≥ 2` (le catene) | Taccuino |
| **T** | il **Taccuino**: «Sentito dire» (le dicerie che ti arrivano), «Conti aperti» (debiti, rancori, appuntamenti), «Cose di …» (i piani aperti di chi guidi) | sempre | Taccuino unico, un solo MutationObserver |

### 7.2 I segni per verbo

| verbo | bolla (pittogramma · parole) | posa · oggetto | cambio nel mondo | cronaca (se sopra soglia) |
|---|---|---|---|---|
| vai (con uno scopo) | freccia · «al mercato» (solo se lo scopo è un altro verbo) | camminata | — | — |
| entra / esci | — | la porta si apre (`HOOKS.indoor` per il sedile) | la luce della finestra | — |
| compra | moneta · «la vernice» | `porge` → `prende` · l'oggetto | la scorta della bottega scende, si vede sul banco (`roba3d`) | «{A} compra tutta la vernice blu da {bottega}» (scorta a zero) |
| vendi | moneta+ · «pesce fresco» | `porge` · cassetta | la cassetta sul banco del mercato | «Al mercato {A} ha venduto {q} cassette» (≥ 3) |
| dai / regala | cuore · «per te» | `porge`/`prende` | l'oggetto passa di mano (si vede in mano all'altro per 20 s) | «{A} regala {cosa} a {B}» (se `pub ≥ .4`) |
| presta / chiedi_prestito | stretta · «te li rendo» | `porge` · banconote | — (sta nel Taccuino, «Conti aperti») | — |
| rinfaccia | muso · «e i miei soldi?» | `discute` | — | «Lite al molo fra {A} e {B}» (se dura ≥ 2 battute e con testimoni) |
| salda / rendi | moneta · «pari» | `porge` | — | — |
| baratta | frecce incrociate · «pesce per pane» | `porge` × 2 | gli oggetti si scambiano di mano | «Baratto: {A} e {B}» (rara) |
| prendi (da casa, da un contenitore) | mano · «la pala» | `raccoglie`/`fruga` | il contenitore si svuota | — |
| posa | mano giù | `raccoglie` (all'inverso) | l'oggetto a terra o nel baule | — |
| mangia / bevi | forchetta / bicchiere | `mangia_su` / `beve_su` | la dispensa scende | — |
| fai_ricetta | martello · «assi» | `lavora`/`martella` · l'attrezzo | l'uscita si vede in mano o sul banco; l'attrezzo si usura | «{A} ha fatto {q} {cosa}» (solo per le cose rare o illegali scoperte) |
| costruisci | martello · «la tettoia» | `martella`/`porta` · assi | il pezzo del cantiere compare a tappe (impalcatura → pezzo) | «Sul molo è spuntata una tettoia: l'ha messa {A}» |
| smonta | piede di porco | `forza` | il pezzo sparisce, il materiale torna | (se non era suo) «Qualcuno ha smontato…» |
| arreda (posa, scambia, butta) | casetta · «la poltrona» | `porta` (fuori), `inScena` di casa (dentro) | la pianta della casa (lazy) e la roba buttata al cassonetto per un giorno | «{A} butta il divano» (solo se al cassonetto) |
| ridipingi | pennello · «blu» | `vernicia` · rullo | le pareti; fuori, una latta vuota davanti alla porta per un giorno | «Casa {A}: tutta blu» (se il giocatore la conosce) |
| dipingi_muro | bomboletta | `vernicia`/`gesso` | il muro (`st.pop.walls`, `Writing`) | «Nuovo pezzo in via {x} firmato {tag}» |
| pesca | amo | `pesca` · canna | la cassetta piena accanto | «Pesca grossa per {A}» (sopra la media ×2) |
| lavora (turno) | ingranaggio · il mestiere | la posa del mestiere (`BY_LABEL`) | la bottega aperta (l'insegna accesa) e la scorta che sale | — |
| chiacchiera (passa una diceria) | fumetto · «hai sentito?» | `discute` | — | — (va nel Taccuino se la ascolti) |
| proponi_appuntamento | orologio · «alle cinque?» | `discute` | — | Taccuino («Conti aperti») |
| andare all'appuntamento / buca | orologio · «lo aspetto» | `aspetta` | — | «{B} ha dato buca a {A}» |
| monta / smonta il mezzo | chiave | salire e scendere (l'esistente) | il mezzo si sposta | — |
| dormi | Z | `dorme` (a casa, la luce si spegne) | la finestra spenta | — |
| ruba (fase 2) | nessuna bolla (non si annuncia) · solo `!` sui testimoni | `fruga` | la roba sparisce | «Furto a {luogo}» |

### 7.3 La densità, non il silenzio

Il segno non è la battuta: la bolla d'intento **non è una frase**, quindi non ripete e non stanca. La misura è doppia:
- **leggibilità**: ≥ 95% dei fatti con `vis ≥ 1` ha un segno entro 5 s;
- **densità percepita**: nei posti pieni, una battuta comprensibile ogni 10-15 s, contro il −82% di oggi (`DEBOLEZZE` §5).

La regia di commedia continua a tagliare il rumore delle fonti vecchie, ma i segni dei fatti hanno il loro posto.

### 7.4 L'italiano

`Lingua` è uno solo e legge il lessico di `Roba`:
- `art(cosa, 'det'|'ind'|'di'|'a')`;
- `part(verbo, sesso, numero)`, così «Sandra è entrata» (oggi `parola.js:2176` dice «è entrato»);
- `nome(attoreId)`, preso sempre dall'attore, mai scritto nella battuta (`parola.js:708`, «Nino»).

Avvolge i due `genere()` vecchi. Una prova genera 2.000 frasi dai segni e dalla cronaca e controlla accordi, maiuscole iniziali e le
frasi vietate («attacco alle 0»).

---

## 8. Prima tappa: «una mattina sul molo»

### 8.1 La scena

- **Quando e dove.** Seme 3, giorno 2, dalle **6:30 alle 12:30** di gioco, fra molo, calata e mercato (`G.PLACES.molo/calata/mercato`)
  e le case vicine.
- **Chi.** Venti NPC con Mente attiva, scelti per mestiere fra gli abitanti di `popolo` (tutti gli altri restano come oggi):

| quanti | ruolo (dal lavoro di popolo) | la loro mattina con i soli verbi del catalogo |
|---|---|---|
| 4 | pescatori | `pesca` all'alba → `vendi` al mercato → `compra` (esche, pane) → uno `fai_ricetta` (ripara la rete) |
| 2 | bottegai (alimentari, ferramenta) | `lavora` (apre) → `vendi` ai clienti → a scorta bassa `compra` all'ingrosso |
| 3 | clienti | `compra` (pane, pesce) → `mangia` → uno `baratta` il pesce col pane |
| 1 | falegname | `fai_ricetta` (assi) → `vendi` assi alla banda |
| 2 | coppia di casa | `compra` vernice → `ridipingi` · `compra` sedia → `arreda` |
| 2 | vicini | `chiacchiera` (passa la diceria della tettoia) → `proponi_appuntamento` per le 17 |
| 2 | debitore e creditore | `rinfaccia` → `salda` a metà → `presta` a un terzo |
| 2 | membri della banda | `procura(assi)` (compra dal falegname) → `costruisci` la tettoia sul molo (pezzo del cantiere, `B`) → `porta`/`posa` nel baule |
| 1 | writer | `procura(bomboletta)` → `dipingi_muro` sulla calata |
| 1 | anziano | `vai` alla panchina → `chiacchiera` con chi passa (diffonde le dicerie) |

- **Verbi usati:** 19. **Codice nuovo per ruolo:** zero; i ruoli sono dati (obiettivi pesati dal lavoro e dal carattere).

### 8.2 Cosa vede il giocatore (Nino, a piedi sul molo dalle 7)

- Le bolle d'intento.
- La tettoia che cresce a tappe.
- Il banco del pesce che si vuota.
- La lite del debito.
- La Gazzetta delle 7:00 con i fatti del giorno 1, e quella del giorno 3 che racconta la mattina.

### 8.3 La presa di corpo (alle 10:30)

Il giocatore sceglie «Prendi il posto di …» su un membro della banda. Il comando sta nel Taccuino della banda e nel menu QUI, ADESSO,
vicino al membro.

1. `Attore.travasa('nino' → corpo vacante)`. Nino diventa un NPC: `G.makeNpc` con il look di Nino e i suoi dati (`st.me` →
   `st.u.corpi.nino`). Prende una Mente con **limiti** (il limite di Wright): niente vendita della roba della banda, spesa ≤ 20% dei
   soldi, niente violenza, niente decisioni irreversibili. Fa la sua routine (`popolo`).
2. `Unico.sedile = membro.id`. `st.player` prende i dati del membro: posizione, borsa, soldi, mano, casa, lavoro. L'NPC del membro
   si nasconde (`n.inside = true`, `n.__u.guidato = true`; il disegno lo salta come chi è al chiuso). La camera segue `st.player`
   come sempre e **non si tocca**.
3. La Mente del membro va in **pausa**, e i suoi piani aperti diventano il Taccuino «Cose di …»: «finire la tettoia: mancano 2 assi»,
   «riportare la carriola». Il menu QUI, ADESSO è `Verbo.qui(st, membro.id)`, cioè gli **stessi verbi** che la Mente stava usando.
4. Ogni fatto dopo la presa porta `chi = membro.id`: la città se lo ricorda come fatto da lui. Le relazioni, i debiti e la
   reputazione sono le sue.
5. Lasciare il posto (il comando opposto, o la morte o l'arresto del corpo) fa il travaso al contrario: la Mente del membro riprende
   dai piani rimasti.
6. La figura: decisione A (§0).

### 8.4 I criteri di riuscita della tappa

Si misurano con `test_unico_mattina.js` (Node, seme 3 e semi 1-5), più una registrazione nel gioco vero:

| criterio | soglia |
|---|---|
| fatti nella mattina dei 20 | ≥ 120, con ≥ 15 verbi diversi |
| catene | ≥ 3 con `hop ≥ 2` (compra vernice → ridipingi → diceria; procura assi → costruisci → cronaca) |
| verbi eseguiti dalla Mente con la stessa funzione del giocatore | 100% (la prova registra che ogni `fai` passa da `Verbo.fai`; 0 chiamate a `passiRoba` e `apriCantiere`) |
| tettoia | finita entro le 12:30 in ≥ 4 semi su 5, con ≥ 2 autori |
| leggibilità | ≥ 95% dei fatti con `vis ≥ 1` hanno un segno entro 5 s; 0 verbi senza `segno` |
| economia | la somma di soldi e roba si conserva (Δ = solo prezzi e produzione dichiarata); nessuna scorta negativa |
| presa | dopo la presa il giocatore completa la tettoia con `Verbo.qui`. Il membro, lasciato, riprende in ≤ 30 minuti di gioco. Nino-NPC fa ≥ 3 verbi della sua routine e 0 verbi vietati dai limiti |
| parità giocatore/NPC | per 10 verbi, `fai('player', v, a)` e `fai(npc, v, a)` sullo stesso stato danno lo stesso cambiamento sulla vista Attore |
| determinismo | due giri con lo stesso seme: hash dei fatti identico |
| prestazioni | quelle di §9.3, nel gioco vero |

---

## 9. Il piano di prova

### 9.1 Le prove in Node (in CI con seme fisso; una prova rossa blocca e **non si accetta**)

| prova | cosa | criterio |
|---|---|---|
| `test_unico_porta.js` | la trappola ricompone l'ordine di oggi | stessi fatti e stesse battute per 6 ore con e senza `unico_porta` (seme 1, 3) |
| `test_unico_errori.js` | errori presi dentro le fasi | `Σ Unico.err = 0` in 3 giorni; `Vita.err`, `step.err` di casa e `filtra.err` tutti nulli |
| `test_unico_seme.js` | `st.rng` salvabile e uguale a prima | 10⁶ numeri identici a `makeRng` di `game.js:11`; due giri di 3 giorni con lo stesso seme danno lo stesso hash dei fatti; `test_parola.js` 5 volte di fila con lo stesso esito (oggi cambia) |
| `test_unico_verbi.js` | parità giocatore/NPC per verbo; `puo` coerente con `fai` | 22 verbi: stessa variazione; `puo === ''` ⇒ `fai.ok` nel ≥ 98% dei casi (il resto per corse, con il perché) |
| `test_unico_parita.js` | vicino contro lontano | 1.000 + 1.000 per verbo: esiti entro il 5%, durata media entro il 10% |
| `test_unico_mattina.js` | la tappa (§8.4) | tutte le soglie |
| `test_unico_segni.js` | la leggibilità | ≥ 95% entro 5 s; 0 verbi senza segno; ≤ 1 freccia ogni 90 s |
| `test_unico_lingua.js` | 2.000 frasi | 0 errori d'accordo sul lessico, 0 minuscole iniziali, 0 frasi vietate |
| `test_unico_ripeti.js` | 10 giorni simulati, il giocatore in giro | nessuna battuta sentita più di 1 volta ogni 2 ore; nessuno stampo «Hai sentito? X …» oltre 6 volte al giorno |
| `test_unico_salva.js` | 72 h → salva → carica → 6 h | `Salva.puro` senza errori a ogni 6 h; hash identico (§6.2); dimensione compressa ≤ 400 KB |
| `test_unico_entropia.js` | 20 giorni | cose create dagli NPC ≤ tetto per quartiere (le capanne crollano, le latte spariscono); memoria di Node ≤ +60 MB |
| **`test_vita_npc.js`** (le 4 prove rosse), con unico acceso | appuntamenti presi e sentiti, incontri visti all'ora giusta, regali o prestiti, conti detti in faccia | **≥ 1 al giorno ciascuno** su semi 1, 2, 3 (§9.2) |
| prove di sempre | `test_commedia`, `test_parola`, `test_iniziative`, `test_casa`, `test_azioni`, `test_oggetti`, `test_cantiere`, `test_economia`, `test_eventi` | verdi come prima, con il flag acceso e spento |
| impronta | `python3 build.py --senza-cotto` | stampa `48196fd63f899c14` |

### 9.2 Perché le 4 prove di vita oggi falliscono, e come le aggiusta il sistema unico

Oggi vita prova gli intenti solo **fra coppie entro 26 m dal giocatore** che passano `ok()`: fuori, sveglie, in routine, non al chiuso,
`n.pop.near` (`vita.js:120`). Ci sono poi i tetti al giorno (`appGiorno: 3`, `regaliGiorno: 1`). Le condizioni insieme lasciano quasi
zero occasioni nel giro della prova. Questa è un'ipotesi: va confermata con `VDBG`, contando i rifiuti per motivo.

Nel sistema unico:
1. **Gli obiettivi nascono per tutti**, a ogni livello: `socializzare → proponi_appuntamento`, `regalare`, `prestare`, `riscuotere →
   rinfaccia` si valutano su menti e relazioni, non sulla vicinanza al giocatore.
2. **I verbi sociali chiedono la co-presenza.** Il piano va da l'altro (`vai` → `chiacchiera`), quindi l'incontro succede in un posto
   vero, spesso uno di quelli pieni del giro della prova.
3. **Le battute.** Quando succede in scena, `Vita.scambio` dà le battute (si sentono). Quando succede lontano resta il fatto, con il
   segno C/T. La prova conta `appPresi` come «sentiti»: si apre il Taccuino «Conti aperti» se la proposta è stata **sentita o raccontata**
   (diceria). Va scritto nel commit, come cambio dichiarato del criterio, solo se la prima versione non basta.
4. **Il rinfaccio** nasce dalla memoria (`rel.debito` scaduto, `rancore`), non solo dai conti di vita.
5. **Le soglie** (≥ 1 al giorno) restano quelle di oggi.

### 9.3 Nel gioco vero (`DEBOLEZZE` §3)

- **Dove.**
  - Playwright su una macchina **con Iris Xe vera** (non SwiftShader), `index.html?commedia&perf`, 20 minuti di cui 10 sul molo
    nella mattina;
  - lo stesso a `?` senza flag, come riferimento;
  - un **Android di fascia media** con `chrome://inspect`, sia in Chrome sia nella WebView dell'APK, che va caricata con il parametro
    (`Main.java:5` usa un URL fisso: per la prova va fatta una build con `?commedia`).
- **Cosa si misura.** `performance.mark/measure` per fase (§1.3), la Long Tasks API, `dt` dei fotogrammi, la memoria JS.

| criterio | Iris Xe | Android medio |
|---|---|---|
| fasi unico, p95 / p99 / max | ≤ 1,0 / 2,0 / 4 ms | ≤ 2,5 / 4 / 8 ms |
| `dt` p95 dei fotogrammi rispetto al flag spento | +≤ 0,5 ms | +≤ 1 ms |
| fotogrammi > 33 ms attribuibili a unico (traccia) | 0 in 20 min | ≤ 3 in 20 min |
| long task > 50 ms attribuibili | 0 | 0 |
| salvataggio sul filo principale | ≤ 4 ms a fetta, 0 fotogrammi persi | ≤ 6 ms a fetta |
| memoria JS in 20 minuti | +≤ 20 MB | +≤ 20 MB |
| caricamento di un salvataggio | ≤ 300 ms in più rispetto al «Nuova partita» | ≤ 800 ms |

### 9.4 Il giudizio dei giocatori (dopo la tappa)

Si fa un playtest con 5 persone a `?commedia`, contro il gioco senza flag, 30 minuti a testa. Le domande sono due: «raccontami una cosa
che è successa» e «perché il pescatore ha fatto X?».

**Il criterio**: ≥ 2 aneddoti a testa che vengono da fatti del sistema unico, e ≥ 70% dei «perché» risposti giusti.

---

## 10. I passi, in ordine, con lo sforzo

I tempi sono in giorni-persona. Ogni passo chiude con le sue prove verdi, prima di passare al successivo. Tutto sta dietro `?commedia`.

| # | passo | consegna | prove | giorni |
|---|---|---|---|---|
| 0 | **La porta** | `unico_porta.js`: trappola, fasi, errori che non si tacciono, `st.rng` salvabile, flussi, `Math.random` instradato, guardia di rientro, `?perf` per fase. Le 2 righe in `index.src.html`, `TASS_FUORI` | porta, errori, seme, impronta | 3 |
| 1 | **Il corpo** | `Attore.di`, `Roba` con il lessico, `Lingua` (art, part, nome), avvolgimento dei due `genere()` | lingua; parità sulle viste | 4 |
| 2 | **La memoria** | `Fatto` con anello, notevoli e indici; `Vita.fatto` e `fattoCerto` deviati; derivati (rancore, debito) | catena ×0,6 uguale a oggi | 2 |
| 3 | **I verbi** | il motore (termini, puo/fai/qui/passi/applica, prenotazioni, A/B/C, `Unico.come` con `Game.step` zittito); i 22 verbi del §3.2; il menu QUI, ADESSO dal registro | verbi, parità | 8 |
| 4 | **I segni** | bolla con i pittogrammi, posa per verbo, freccia, Cronaca e Gazzetta, Taccuino unico (un solo observer) | segni, ripeti | 5 |
| 5 | **La mente** | 18 obiettivi a curve, HTN con `procura`, piano parziale, NOPE, macroverbi, livelli, classe del dispositivo; spegnimento di `Risacca.autonomy` e del `giro` di vita per gli obiettivi coperti | mattina (prima metà: senza presa), le 4 di vita | 8 |
| 6 | **Il salvataggio** | adattatori via/torna per ini, vita, parola e casa; `Salva.puro`; IndexedDB A/B; migrazioni | salva, entropia | 4 |
| 7 | **La tappa nel gioco vero** | i 20 della mattina; Playwright su Iris Xe; Android | §9.3 | 4 |
| 8 | **La presa di corpo** | travaso, sedile, limiti del pilota, Taccuino «Cose di …»; la figura (decisione A) | mattina completa | 3 (+1 con la figura) |
| 9 | **L'assorbimento** | iniziative `V` come metodi; `DEF` di parola sul registro; `chiamaIA` spenta; casa `voglie` nella Mente | prove di sempre verdi | 4 |
| 10 | **Il playtest e la pulizia** | playtest a 5; elenco del codice da cancellare (§5) da approvare | §9.4 | 3 |
| | **In tutto** | | | **≈ 48-49 giorni** (circa 10 settimane per una persona; i passi 4 e 6 si possono fare in parallelo dopo il 3) |

**Il primo passo che si vede** è il 4 (i segni sui verbi già migrati, dopo il 3). È il punto in cui chiedere alla direzione di guardare
una registrazione, prima di scrivere la Mente.

---

## 11. Rischi

- **La trappola su `HOOKS.step`.** Se un modulo dopo quelli di commedia avvolge il passo, la trappola lo prende come fase senza
  posto. Va dichiarato, e la prova di porta fallisce.
- **Il cambio di persona (B).** Solo in scena, sincrono, con una prova per funzione. `Oggetti.craft` gira sempre con `Game.step`
  zittito e la guardia di rientro.
- **`Math.random` instradato.** Se un modulo del disegno chiamasse la simulazione dentro un `requestAnimationFrame`, userebbe il caso
  vero. La prova di seme lo trova come differenza di hash.
- **Il pilota automatico troppo bravo.** Il corpo lasciato ha i limiti, e la Mente di Nino segue la routine invece di ottimizzare.
- **L'entropia.** Ogni cosa creata dagli NPC ha una durata (la tettoia senza uso crolla in 10 giorni, la latta sparisce in 1, il muro
  sbiadisce come oggi) e c'è un tetto per quartiere.
- **La scrittura.** I segni sono pittogrammi e non frasi, quindi non aumentano il collo di bottiglia dei banchi. Le righe della cronaca
  sono modelli corti con `Lingua`, ~60 per i 22 verbi.
