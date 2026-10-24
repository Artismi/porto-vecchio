# Porto Vecchio — Il Popolo: abitanti, giornate, bisogni (3 ottobre, notte)

Tutto il lavoro sui personaggi sta in un file nuovo, `src/popolo.js`. Gli altri file cambiano di poche righe, segnate con `[popolo]`.

## Righe toccate fuori da popolo.js (da riportare se l'altra versione le ha cambiate)

| File | Cosa |
| --- | --- |
| `index.src.html` | `<script>/*popolo.js*/</script>` subito dopo `risacca.js` (deve caricarsi dopo la Risacca). |
| `render.js` | Nel ciclo delle persone (`st.npcs.forEach`, sezione persone del fotogramma), prima di creare il modello: chi è dentro non riceve un modello; gli abitanti lontani lo liberano. Una riga. |
| `main.js` | Taccuino, scheda Fatti, e conto dei crimini a fine partita: si escludono gli eventi con `npcCrime` (furti tra abitanti). Due righe. |

`game.js`, `world.js`, `risacca.js` non sono toccati. `popolo.js` sostituisce solo `Game.dayName` (giorni della settimana oltre il venerdì) e concatena gli agganci di `Game.HOOKS` dopo quelli della Risacca.

## Come funziona

- **Popolazione dalla mappa**: le case (`use: 'casa'`, `'cascina'`, condomini con `home: true`) si riempiono di famiglie in base a superficie × piani; i posti di lavoro si leggono da `b.use` e dagli id dei luoghi (tabella `JOBS_BY`, più `OUTDOOR` per molo, calata, vigne, saline, cava). Una città più grande dà più gente da sola. Tetto in `Popolo.CFG.max` (420). Con la mappa attuale: 173 abitanti in 90 famiglie.
- **Due livelli di simulazione**: entro `CFG.near` (52 m) dal giocatore si vive per intero nel motore (percorsi, fughe, denunce, passaparola); oltre `CFG.far` (66 m) si segue il programma saltando da un posto all'altro, invisibili e senza percorsi. Al massimo `CFG.maxNear` (70) a pieno. Logica: circa 0,9 ms per fotogramma in Node, contro 10 ms con 400 personaggi a pieno.
- **Giornata**: ogni notte a mezzanotte `planDay` scrive i blocchi del giorno (sonno, lavoro con orario d'ingresso, pranzo, spesa, mercato, svago, messa, appuntamenti, giro, rientro prima dell'Ora Quieta). Turni di notte e giri oltre la mezzanotte continuano il giorno dopo (`carry`). Chi è vicino parte prima in base alla strada da fare (a piedi il tempo corre: 100 m ≈ 3 ore di orologio).
- **Puntualità**: chi esce tardi arriva tardi; la paga scende, dopo 4 ritardi si rischia il licenziamento. I disoccupati cercano lavoro.
- **Calendario** (`RECURRING`): asta del pesce ogni mattina, Bollettino della Tutela il lunedì (presenza obbligatoria), mercato mercoledì e sabato, tombola al circolo il giovedì, paga il venerdì, affitto il lunedì, discoteca il sabato, messa e passeggiata la domenica, vespro ogni sera. Ora Quieta dalle 24 alle 5, dalle 22 con repressione ≥ 4.
- **Appuntamenti**: tra amici (anche dal giocatore o dalla Risacca con `Popolo.appoint`); chi non si presenta "dà buca" e finisce nel diario di entrambi.
- **Bisogni**: fame, sonno, igiene, compagnia, svago crescono con le ore e calano facendo le cose; rabbia e paura nascono dai fatti (arresti in famiglia, furti subiti, uomini dello Squalo, Bollettino, repressione). Un bisogno urgente scavalca il programma, salvo i blocchi a orario fisso. La rabbia avvicina alla Risacca, la paura chiude in casa.
- **Soldi**: paga maturata e ritirata il venerdì, spese di ogni giorno, affitto, debiti con lo Squalo con interessi il mercoledì. Chi resta al verde scivola verso un giro o gli Orecchi.
- **Malavita** (`GIRI`): borsaioli, ladri d'appartamento, ricettatori, spacciatori, trafficanti d'armi, informatori della Zia. I furti diventano ricordi delle vittime (con o senza il colpevole), passano di bocca in bocca, arrivano ai Grigi; i Grigi fermano gente in base alla repressione.
- **Diario e tempo**: ognuno tiene gli ultimi fatti con l'ora; la biografia (`Popolo.bioOf`) li racconta come "stamattina", "ieri sera", "mercoledì". La chat della Risacca la legge in diretta (scheda in `Risacca.CARDS`, con voce, ideologia, segreto, mestiere).

## Prove

Le prove girano in Node dalla cartella `src` caricando `world.js`, `interiors.js` (come `Interior`), `game.js`, `risacca.js`, `popolo.js` e chiamando `Game.step`. `Popolo.report(st)` riassume stato, giri, soldi e contatori (furti, arresti, ritardi, licenziati, appuntamenti, bidoni).

# Le figure nuove: corpo, teste e vestiti (23 ottobre)

Tutto in `src/personaggi.js` (caricato subito dopo `vestiario.js`). Fuori da lì: una riga in `index.src.html`, la sentinella di `models.js` (`guard`) che passa da `Models.person` quando le figure nuove sono accese, `studio_anim.html` (voce `pg`, opzioni `stile` e `facce`).

- **Cosa fa**: `Models.person` costruisce le figure da un descrittore. Lo scheletro, le clip e le pose restano quelli del kit Quaternius, e cambia solo la pelle: una `SkinnedMesh` sola con un materiale solo. Il materiale usa colori per vertice e un atlante di disegni (facce, cuciture, tasche, lacci, loghi, bande, motivi).
- **Le teste**: facce e capelli dei cinque modelli del kit, mescolati (la faccia di uno coi capelli di un altro) e ricolorati. Sopra ci vanno la bocca, la barba, gli occhiali e i cappelli, che si posano sugli occhi della testa misurata. Con `?teste=mie` si usano invece le teste costruite qui.
- **API**:
  - `Personaggi.descrittore(look, who, npc, outfit)` dà il descrittore, sempre uguale per la stessa persona.
  - `Personaggi.daGuardaroba(capi, D)` porta i capi del Guardaroba nel descrittore. Tutti i 131 capi hanno il loro pezzo (`DA_CAPO`).
  - `Personaggi.figura(D, who, raw, aRate)` dà il gruppo, compatibile con quello di `Models.person`.
  - `Personaggi.geometria(D, mesh, rel, J)` dà la geometria skinned, per le versioni a distanza.
  - `Personaggi.veste(g, D)` riveste una figura. Nino si riveste da solo quando cambia quello che ha addosso.
- **Nel gioco**: in strada le figure si vestono a rate, con lo stesso `userData.dressing` che usava Vesti3D. La geometria della stessa persona si riusa (`GEO`, 260 voci), e il profilo della testa si misura una volta per combinazione (`PROF`).
- **Interruttori**: `?vecchiagente` torna a Vesti3D come prima. `?stile=k|a|b|c` sceglie lo stile: `k` è quello del kit ed è il predefinito, `b` è la linea chiara. `?facce=scolpite|pulite` vale per le teste costruite qui.
- **Peso**: `node strumenti/sonda_gente.js uscita.json` (con `MODI=nuova,vecchia`, `POSTI=`) misura fotogramma, disegni e triangoli, e quanto pesano le sole persone.
- **Tavole**: `_immagini/personaggi/` (stili, catalogo dei capi, accessori).
