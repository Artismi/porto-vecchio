# Il regista e il vocabolario: la piccola «IA» fatta in casa di Porto Vecchio (13 novembre)

La direzione approvata da Andrea: costruire **la nostra IA, piccola e su misura**, senza modelli linguistici in partita e senza costi
per token. Ha tre pezzi:
1. **un regista** (come i narratori di RimWorld o l'AI Director di Left 4 Dead): guarda i fatti del mondo, dosa il ritmo, semina le
   storie di più giorni, le fa incrociare e le chiude;
2. **un motore decisionale leggero**: un piccolo valutatore imparato (20-50 KB di numeri in JS), allenato **fuori dal gioco** su
   migliaia di giornate simulate. Dà un voto alle scelte che il sistema offre già e non inventa mai azioni fuori dal registro dei verbi;
3. **soprattutto, un vocabolario molto più grande.** Le parole di Andrea: «è come un vocabolario: senza parole non puoi parlare; se le
   parole non ci sono, quelle cose non succedono mai. Prima il vocabolario deve esistere, poi vediamo quando succedono».

Questo documento è un progetto: **non tocca il codice**. Si basa su `SISTEMA_UNICO.md` (Attore, Verbo, Mente, Fatto, Segni),
`STRUMENTI_NPC.md`, `DEBOLEZZE.md`, `COSTRUIRE_IN_CITTA.md`, `mondo/BIBBIA_MONDO.md` e `../BIBBIA_STILE.md`. I numeri dell'inventario
vengono dal codice di oggi (`src/unico_*.js` e i cataloghi vecchi), contati caricando il gioco in Node come fanno le prove. La tavola
illustrata è `_immagini/commedia/regista_tavola.jpg`.

**In una riga.** Il vocabolario passa da 32 verbi registrati a **250 verbi** e da zero a **142 storie a più passi** (storylet), scritti
come dati che si combinano. Si combinano per **proprietà degli oggetti** (si siede su qualunque cosa sia rigida e portante), per **modi**
(lo stesso regalo fatto di nascosto, in pubblico o per finta) e per **ganci** (l'esito di una storia accende le altre). Il **regista**
guarda la tensione per quartiere, per persona e per gruppo, e la muove solo con le leve che il mondo ha già: spinte alla Mente,
istituzioni (meteo, ordinanze, la nave), scelta degli interpreti. Il **motore decisionale** è una correzione limitata (da ×½ a ×2) sopra
le curve di utilità di oggi: alberi di decisione quantizzati, circa 30 KB, allenati di notte sul simulatore senza grafica.

---

## 0. Per Andrea, in una pagina

**Le tre scelte che contano.**
1. **Il vocabolario è una grammatica, non un elenco.** Un verbo non dice «picchia con il bastone»: dice «picchia con *una cosa rigida e
   pesante*». Il bastone, la padella, la baguette dura e il secchio vanno tutti bene, e il gioco racconta quello che è stato usato davvero.
   Verbo × oggetto × modo × luogo × esito dà **decine di migliaia di fatti diversi** da 250 schede. Le cose inattese vengono da qui:
   barricare la via col frigorifero, sedersi sulla cassetta del pesce di un'altra, lanciare la scarpa al Grigio.
2. **Il regista non muove i burattini.** Non teletrasporta nessuno e non fa fare azioni a comando. Può solo:
   - **spingere** un obiettivo nella Mente di un personaggio («oggi Franco ha più voglia di rinfacciare»);
   - **far accadere una cosa delle istituzioni** (il maestrale, un'ordinanza, la nave in ritardo, il mare che restituisce);
   - **scegliere chi recita** in una storia.

   Così quello che succede resta credibile: ognuno fa le cose per i suoi motivi, con i verbi di tutti. E tutto si può rifare uguale
   (seme) e salvare.
3. **Il «cervello imparato» è un gusto, non un padrone.** Dopo migliaia di giornate simulate, valutate dalle misure del regista, dalle
   regole e dai tuoi voti sulle giornate, il motore impara che cosa fa nascere storie migliori: per esempio che il pescatore arrabbiato
   con la piazza piena rinfaccia meglio in pubblico che a casa. Può al massimo raddoppiare o dimezzare la voglia calcolata dalle curve di
   oggi. Se manca o sbaglia, si spegne e restano le curve.

**Il giro** (la tavola lo disegna):

```
 VOCABOLARIO ──► REGISTA ──► MOTORE DECISIONALE ──► FATTI ──► SEGNI ──► il giocatore
 (verbi, storie,  (tensione,   (quale obiettivo,      (memoria   (bolla, Si dice,    │
  proprietà,       semina,      quale metodo,          del        Gazzetta,          │
  modi, ganci)     incrocia,    quale ramo)            mondo)     Taccuino «Storie») │
      ▲            chiude)                                │                          │
      └──────────── i ganci dei fatti riaccendono le storie ◄── l'attenzione del giocatore
```

**I numeri, oggi e domani.**

| | oggi (codice) | domani (questo progetto) |
|---|---|---|
| verbi del registro unico | **32** | **250** (32 ci sono, 74 si migrano dai cataloghi vecchi, 144 nuovi) |
| storie a più passi, con ruoli e rami | **0** nel gioco (19 situazioni-tipo e 5 faide nel prototipo `giornata.js`, fuori dal gioco) | **142**, in 13 famiglie |
| ganci (le etichette che intrecciano le storie) | 0 | **51** |
| obiettivi della Mente | 19 | **44** |
| proprietà degli oggetti | 24 (usate solo per etichettare) | **40**, usate dai ruoli dei verbi |
| modi (declinazioni di un verbo) | 0 | **8** |
| dimensioni di relazione per coppia | 4 (affetto, fiducia, debito, rancore) | **9** (+ stima, paura, attrazione, rivalità, complicità) |
| emozioni brevi | 2 (rabbia, paura, nei bisogni) | **7** |
| reputazione pubblica | 0 | **8 assi** per persona, saputi per quartiere |
| animazioni nuove richieste | — | **13** (più 8 modelli o effetti); il 93% dei verbi si vede con le pose di oggi, i pittogrammi e le onomatopee |
| costo nel passo (mente + regista + motore) | mente p95 ≈ 0,32-0,36 ms (misurato oggi in Node) | **≤ 0,5 ms p95** su telefono di fascia media (obiettivo, da misurare: oggi non è mai stato misurato su un telefono) |

**Cosa vedrai per primo.** Il molo e la calata per tre giorni di gioco, con 40 verbi nuovi e 12 storie intrecciate, senza il motore
imparato (§F, passi 0-3): è la prova che il vocabolario da solo cambia la città. Il motore decisionale arriva dopo, quando ci sono
abbastanza parole fra cui scegliere.

---

## A. Il vocabolario di oggi, in numeri

### A.1 Cosa c'è (contato nel codice, 13 novembre)

| cosa | quanti | dove |
|---|---|---|
| **verbi del registro unico** (scheda con `pre`/`eff` come dati, eseguiti da `Verbo.fai` per chiunque) | **32** | `unico_verbi.js` (23), `unico_sociali.js` (5), `unico_costruire.js` (4) |
| — i verbi | `vai entra esci prendi posa dai regala presta chiedi_prestito salda compra vendi baratta mangia bevi fai_ricetta costruisci smonta arreda ridipingi dipingi_muro dormi pesca rendi chiacchiera proponi_appuntamento rinfaccia lavora raccatta barrica tira_su_baracca presidia` | |
| termini di condizione / di effetto | 57 / 32 | `Verbo.COND`, `Verbo.EFF` |
| **obiettivi della Mente** (utilità a curve) | **19** | `unico_mente.js` (18) + `rivendicare` (`unico_costruire.js`) |
| metodi HTN | 30 | `unico_mente.js` (29) + `rivendica` |
| fonti delle considerazioni / curve / blocchi d'orario | 33 / 7 / 13 | `Mente.FONTI`, `CURVE`, `ORARIO` |
| **tipi di fatto con un segno** (bolla, Gazzetta, Si dice) | **46** | `Segni.TIPI` |
| pittogrammi della bolla | 26 | `unico_segni.js` `PITTO` |
| tipi di fatto con un peso / offese che fanno rancore | 39 / 11 | `Fatto.GRAV`, `Fatto.OFFESE` |
| **roba** (il catalogo unico) / proprietà | **435** / 24 | `Roba` (`unico_attore.js`), `UnicoCatalogo.PROP` |
| ricette | 142 | `Oggetti.RECIPES` |
| **posti con nome** / edifici | **211** / 291 | `Game.PLACES` (di cui 31 case, 34 punti di pesca, bagni e scogli), `Game.BUILDINGS` |
| oggetti intelligenti / interessi / progetti di popolo / ricorrenze | 38 / 19 / 34 / 11 | `Popolo.OGG`, `INTERESSI`, `PROJ`, `RECURRING` |
| **cataloghi vecchi** (ancora fuori dal registro) | `Azioni.VERBS` 36 · `Risacca.VERBS` 71 · `Iniziative.VERBI` 20 + 25 estri · `Casa.VERBI` 11 · `Vita.INTENTI` 3 (+ 47 banchi di battute) · `eventi.js` circa 70 scene scritte | |
| pose e animazioni | 32 pose di vita (`anim_vita.js`) + 49 clip (gesti, lotta, mezzi, cadute, `lancia`, `nuota`, `salto`, `scavalca`, `ammanetta`, `perquisisce`…) | `anim_*.js`, `animazioni.js` |

**Misure di oggi** (Node, seme 1, un giorno, `test_unico_mente.js --giro=1`): 24.532 passi, **un giorno di gioco in circa 97 s**
reali senza grafica; fase della mente p50 0,06-0,07 ms, **p95 0,32-0,36 ms**, p99 0,48-0,61 ms, max 2,3 ms; 826 fatti visti o sentiti
dal giocatore, il 96% con un segno subito. Sono misure su un server, non su Iris Xe né su un telefono.

### A.2 Dove è stretto: le cose che oggi non possono succedere

Il sistema unico ha le fondamenta giuste (un corpo, un catalogo, una mente, una memoria), ma le parole sono quelle della «mattina sul
molo»: comprare, vendere, prestare, lavorare, mangiare. Mancano intere zone della vita.

| che vita manca | perché non può succedere oggi |
|---|---|
| **Il corpo comico**: inciampare, scivolare, cadere in acqua, dormire sulla panchina, nascondersi, sbirciare | nessun verbo del corpo oltre `vai` e `dormi`. Le cadute esistono solo come animazioni del giocatore o come scene scritte di `eventi.js`, mai come conseguenza |
| **Gli oggetti usati per altro**: la cassetta come sedia, il frigo nella barricata, la padella come arma, le pentole come tamburo | le 24 proprietà etichettano la roba, ma nessun verbo chiede un **ruolo** («una cosa rigida e pesante»): ogni verbo vuole una cosa precisa |
| **L'amore, la gelosia, l'alleanza, il tradimento, le scuse, il perdono, il segreto, l'invito e l'esclusione** (Gavino) | i verbi sociali sono 7 e tutti di scambio o di conto (presta, rinfaccia, salda, appuntamento). Le relazioni hanno 4 numeri: niente stima, attrazione, rivalità, complicità |
| **Il conflitto degli NPC**: spinte, schiaffi, risse, inseguimenti, lanci, incendi, denunce | i verbi di conflitto stanno in `azioni.js` e `risacca.js` per il giocatore e la banda. La Mente ha solo `rinfaccia` e la `scritta`. Lite e rissa sono **tipi di fatto** senza un verbo che li produca |
| **Le istituzioni che agiscono**: l'ordinanza, la multa a metà, lo sgombero, la fila, il certificato, il Garante | vivono nella Bibbia del mondo e nel prototipo `giornata.js`, non nel gioco. Lo sgombero è previsto da `COSTRUIRE_IN_CITTA.md` |
| **Gli automobilisti veri** | il traffico corre su corsie (`game.js:600`): nessuno suona, aggira, scende a spostare l'auto vuota o si riprende la propria |
| **Lo spazio verticale e il mare**: tetti, grondaie, funi, tuffi, nuotare, remare | i tetti, le scale e le passerelle esistono per il giocatore (`tetti.js`), ma nessun NPC ci sale. Il mare restituisce solo i cadaveri (`azioni.js:972`) |
| **I gruppi**: amici o sconosciuti messi insieme dal caso | c'è un solo obiettivo di gruppo (`rivendicare`). Gli altri obiettivi sono di una persona sola |
| **Le storie di più giorni**: un inizio, una svolta, una fine, un seguito | i fatti si legano per causa (×0,6 a ogni passaggio), ma senza ruoli, rami né chiusura. La catena più lunga misurata nel gioco è di 2 anelli («movente → furto», `DEBOLEZZE` §15); il prototipo fuori dal gioco arriva a 7-9 |
| **La vergogna, l'orgoglio, la fama** | non c'è reputazione: chi fa una figuraccia in piazza il giorno dopo è uguale a prima |
| **Le regole strane del paese** (il mare restituisce, il campanile conta le liti, la statua guarda, la nebbia ripete) | sono solo nel prototipo |
| **Il circo e il surreale**: monociclo, giocolieri, il cappello per le monete, la residenza al polpo | nessun verbo, nessun mestiere |

**La diagnosi in una frase.** Oggi la città ha **un verbo ogni 13 posti** e **nessuna storia**. Si vede una vita ordinata e un po'
burocratica: tutti comprano, vendono e si prestano soldi. Le commedie di Porto Vecchio (la faida, la figuraccia, l'equivoco,
l'occupazione, la fuga sui tetti) non hanno le parole per accadere.

---

## B. Il vocabolario nuovo, come dati

### B.1 La grammatica: come si fa grande senza scriverlo a mano

Un fatto di Porto Vecchio è una frase con cinque pezzi:

> **chi** · **verbo** · **con che cosa** (ruoli per proprietà) · **come** (modo) · **dove e davanti a chi** · → **esito**

- **Il verbo** è una scheda di dati (come oggi: `pre`, `eff`, `costo`, `posa`, `segno`), con in più i **ruoli**. Un ruolo è una cosa
  che il verbo usa, descritta per proprietà: `strumento: [rigido, pesante]`, `sedile: [rigido, portante, piano]`,
  `proiettile: [lanciabile]`, `riparo: [grande, rigido]`. Qualunque roba della borsa, della casa o del posto che ha quelle proprietà va
  bene. Per scegliere, il verbo dà un punteggio di **plausibilità** a ogni candidato (quante proprietà in più o in meno ha, il prezzo,
  il proprietario). La cosa più adatta vince quasi sempre, ma non sempre: è da qui che viene la commedia.
- **Il modo** declina il verbo in 8 maniere (§B.3). Cambia chi guarda, quanto è pubblico, che cosa succede alle relazioni, la parola
  della bolla e la velocità della posa.
- **Il luogo** conta: in piazza un fatto è pubblico, nel vicolo no. Al bar ci sono testimoni, sul tetto c'è il pubblico dalla strada.
- **L'esito** è `ok`, `meta`, `no` o `colto` (come oggi), più `comico` (§B.4: il verbo riesce in un modo storto, per esempio la
  sedia di fortuna che si rompe).

**Il conto.** 250 verbi × in media 2,6 modi possibili × in media 6 oggetti plausibili per ruolo × 5 esiti fa circa **19.000 fatti
diversi**, prima ancora di contare chi e dove. Nessuno li scrive: le righe della Gazzetta e del Si dice si compongono da modelli per
famiglia, con `Lingua` (articoli, accordi, nomi) e le parole della scheda.

### B.2 Le proprietà e i ruoli (da 24 a 40 proprietà)

Le 24 di oggi restano. Se ne aggiungono 16, assegnate con le stesse regole a espressioni regolari e categorie (`PROP_RE`,
`PROP_CAT`) e corrette a mano dove serve.

| proprietà nuove | a cosa servono (esempi) |
|---|---|
| `portante`, `piano`, `grande` | sedersi, salire sopra, fare da tavolo, barricare, riparare dalla pioggia |
| `lanciabile`, `fragile`, `molle` | lanciare (sasso, bottiglia, uovo, pomodoro, scarpa); chi è colpito da una cosa `molle` si sporca e non si fa male |
| `rumoroso`, `cavo` | battere le pentole, fare da tamburo, chiamare la gente |
| `galleggia`, `impermeabile` | il mare la restituisce; fa da tettoia |
| `tagliente`, `appiccicoso` | tagliare la fune, affiggere |
| `prezioso`, `ricordo` | il furto fa più male; un regalo che vale doppio; il mare che lo riporta diventa una storia |
| `di_qualcuno` (proprietario), `intestato` | il conteso, il riconosciuto, il binomio fantastico (il polpo con la residenza) |
| `vistoso` | la facciata, il cappello, il vestito: fa fama, nel bene o nel male |

**I ruoli** sono una ventina, riusati da tutti i verbi:

| ruolo | proprietà richieste | chi lo riempie, in ordine di plausibilità |
|---|---|---|
| `sedile` | rigido · portante · piano | sedia > panchina > cassetta > secchio capovolto > motorino fermo > gradino |
| `colpo` | rigido · pesante | bastone > padella > secchio > baguette dura > ombrello |
| `proiettile` | lanciabile | sasso > bottiglia > uovo > pomodoro > scarpa > cappello |
| `incendiario` | infiammabile · liquido · contenitore (ricetta `molotov`) | bottiglia + benzina + straccio |
| `botto` | ricetta `bomba_carta` | (contenuto per adulti, §B.9) |
| `riparo` | grande · rigido · impermeabile | lamiera > porta di recupero > ombrellone > cartone (che cede: esito `comico`) |
| `barriera` | grande · pesante | frigo > bancale > cassonetto > auto ferma (vedi `sposta_auto`) |
| `fune` | lungo · stoffa o fune | fune > lenzuola annodate > rete da pesca > filo del bucato |
| `scala` | lungo · rigido · portante | scala > bancale in piedi > impalcatura > le spalle di un amico (verbo `fai_scaletta`) |
| `tamburo` | rumoroso · cavo | pentola > secchio > bidone > cassetta |
| `dono` | il gusto dell'altro (`Scambi.wants`) | come oggi, più `ricordo` e `prezioso` |
| `contenitore`, `travestimento`, `cartello`, `esca`, `attrezzo`, `cibo`, `bevanda`, `veicolo`, `appiglio` | come dice il nome | |

**La regola della plausibilità.** `p = Σ proprietà richieste presenti − 0,5 × proprietà «vietate» presenti (es. `fragile` per
`sedile`) − prezzo/1000 − 0,8 se è di un altro`. Si prende il primo, tranne in un caso: con probabilità `.12 × (1 − plausibilità)`,
dal flusso del caso a seme, si prende il secondo. Le «sostituzioni» sono il primo motore di commedia e non si scrivono.

### B.3 I modi: le declinazioni

| modo | cosa cambia | parola della bolla | esempi |
|---|---|---|---|
| `normale` | niente | — | |
| `di_nascosto` | testimoni solo entro 6 m; `pub` ×0,3; se è colto, vergogna e rancore ×2 | «zitto zitto» | regala di nascosto, mangia di nascosto il cannolo del '71 |
| `in_pubblico` (teatrale) | `pub` ×2; fama; la posa più lenta e più grande | «guardate!» | regala in pubblico (ostentazione), rinfaccia in piazza |
| `con_rabbia` | effetto sulle relazioni ×1,5; possibile esito `comico` (rompe qualcosa) | «basta!» | chiudi la porta con rabbia (SBAM), butta il mobile |
| `con_tenerezza` | affetto +; pubblico basso | «piano…» | consola, rammenda, lega la barca del vecchio |
| `per_finta` | lo scherzo: se l'altro ci casca, ride chi guarda e l'altro si vergogna; se no, rancore piccolo | «hihi» | regala per finta, sviene per finta, il falso biglietto vincente |
| `per_sbaglio` | lo sceglie il caso dentro gli esiti; l'intenzione era un'altra | «ops» | prende la borsa sbagliata, entra nella casa sbagliata |
| `in_gruppo` | ruoli A, B, C…; il fatto è di tutti; la forza si somma | «tutti!» | spingi l'auto, barrica, porta il divano, batti le pentole |
| `per_conto_di` | l'atto è di uno, il merito o la colpa di un altro (Colombina, il garzone) | «da parte di…» | consegna il biglietto, paga il debito di un altro |

Ogni verbo dichiara i modi che ammette e le loro condizioni. In media sono 2,6 per verbo: `di_nascosto` vuole `non_visto`,
`in_gruppo` vuole ≥ 2 attori con lo stesso obiettivo, `per_finta` vuole carattere `teatrale` > .5.

### B.4 Le famiglie di verbi (250)

Legenda. **Stato**: ✓ nel registro oggi · **L** esiste in un catalogo vecchio (si migra) · **N** nuovo. **Si vede con**:
**P** una posa che c'è già (`anim_vita`, `anim_gesti`, `anim_lotta`, mezzi, tetti) · **O** solo bolla, pittogramma e onomatopea
(nessun lavoro d'animazione) · **N** animazione nuova · **M** modello, oggetto 3D o effetto nuovo. I ruoli usano le proprietà del §B.2.

#### 1. Corpo (19)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| vai | meta | muovi | P camminata | ✓ |
| corri | meta · non stanco | muovi veloce; fatica | P `fuga` | L (azioni `scappa`) |
| aspetta | — (qualcuno o qualcosa) | tempo; noia | P `aspetta` | L (risacca) |
| siediti | `sedile` | riposo; occupa il posto | P `siede` | N |
| siediti_per_terra | fuori | riposo; status più basso | P `siede_terra` | N |
| sdraiati | `sedile` lungo o terra · stanco | sonno lento; comico se in piazza | **N** (posa distesa) | N |
| nasconditi | `riparo` o angolo · non visto | sparisce dagli sguardi | P `rannicchiato` | L (azioni, risacca) |
| sbircia | finestra, angolo o buco | memoria «visto» di un fatto altrui | P `guarda_lontano` + O «…» | N |
| origlia | ≤ 4 m da due che parlano · non visto | ruba una diceria | P `aspetta` + O «…» | N |
| inciampa | esito `comico` di vai/corri/porta | cade la roba; vergogna | P `barcolla`/`cade` + O TUMP | N |
| scivola | lastrico bagnato, pesce, buccia | cade; testimoni ridono; vergogna | P `cade` + O SPLAF | N |
| dormi | casa o `sedile` | sonno | P | ✓ |
| lavati | casa, fontana, mare | igiene | O (dentro) / P `lavora` alla fontana | N |
| fuma | sigarette | svago; i Grigi guardano | P `fuma_su` | N |
| balla | musica vicino | svago; attrazione | P `balla` | L (eventi `ballano`) |
| canta | — | svago; fama; disturba chi dorme | P `discute` + O ♪ | N |
| piangi | tristezza alta | affetto di chi guarda; consolabile | O + P `freddo` | N |
| ridi | un fatto `comico` visto | l'altro si vergogna; umore + | O AH AH | N |
| prega | chiesa o statua | fede; pace | P `prega` | N (popolo) |

#### 2. Oggetti e mani (28)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| prendi | da casa, base o contenitore | +borsa | P | ✓ |
| posa | in casa o base | −borsa | P | ✓ |
| porta | cosa pesante o lunga | sposta la cosa; fatica | P `porta_su`, carriola | L (azioni `trasporta`, risacca `porta`) |
| trascina | cosa `pesante` · in_gruppo aiuta | sposta piano; rumore | P `forza` + O SCRIIC | N |
| dai | persona vicina | passa la cosa | P | ✓ |
| butta | cassonetto, mare, strada | −borsa; se in mare, il mare non la restituisce | P `lancia` (piano) | L (azioni `sbarazzati`) |
| nascondi | cosa · nascondiglio (contenitore, buco, baracca) | la cosa sparisce dagli sguardi | P `fruga` | L (risacca `deposita`) |
| fruga | contenitore, cassonetto, tasche (se svenuto) | trova roba | P `fruga` | L (azioni, risacca `rovista`) |
| cerca | cosa persa · posto | la trova (o trova altro) | P `fruga`/`raccoglie` | N |
| apri | porta, cassa, bottiglia, lucchetto (con chiave o `attrezzo`) | aperta | P `lavora`/`forza` | N |
| chiudi_a_chiave | porta, cassa · chiave | chiusa; CLIC | P `lavora` + O CLIC | N |
| rompi | cosa `fragile` o `rigido` + `colpo` | rotta; rumore; rancore del proprietario | P `forza` + O CRAC | N |
| ripara | cosa rotta · `attrezzo` | intera; stima | P `martella` | L (risacca `ripara`) |
| usa_come | un ruolo di un altro verbo con un sostituto | il verbo «ospite» con l'oggetto strano | dalla famiglia del verbo ospite | N (il verbo delle sostituzioni esplicite, per il giocatore) |
| pulisci | sporco, muro, auto | pulito | P `spazza` | L (azioni `pulisci`) |
| spazza | strada, bottega | pulito; fa il mestiere | P `spazza` | N |
| lancia | `proiettile` · bersaglio a ≤ 15 m | traiettoria; colpisce o no (abilità); dipende dalla cosa | P `lancia` + O | L (risacca `lancia`) |
| appendi | `cartello`, bucato, festone · muro o fune | si vede appeso | P `attacchina` | N |
| lega | `fune` · due cose | legate | P `lavora` | N |
| accendi | fuoco, lampada, radio · fiammifero | luce, calore, rumore | P `scalda` + O FSST | N |
| riempi | `contenitore` · fontana, mare, botte | pieno | P `lavora` | N |
| versa | `contenitore` pieno · su cosa o persona | bagnato (il secchio dalla finestra!) | P `lavora` + O SPLASH | N |
| indossa | vestito, `travestimento` | look (`Guardaroba.wear`); riconoscibile o no | O (cambio di look) | N |
| leggi | giornale, lettera, cartolina, bollettino | sa una cosa; diceria | P `legge_su` | N |
| fotografa | macchina foto · soggetto | prova di un fatto (ricatto, Gazzetta) | P `foto` | L (azioni, risacca) |
| mangia | `cibo` | fame | P | ✓ |
| bevi | `bevanda` | sete, ebbrezza (ubriaco) | P | ✓ |
| fai_ricetta | ricetta · ingredienti, `attrezzo`, postazione (142 ricette, anche `molotov`) | le uscite della ricetta; l'attrezzo si usura | P `lavora`/`martella` | ✓ |

#### 3. Luoghi, casa e verticale (23)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| entra / esci | porta | dentro / fuori | P | ✓ ✓ |
| bussa | porta chiusa o campanello | chi è dentro sa; può aprire; per scherzo (`per_finta`) si scappa | O TOC TOC, DRIIN | N |
| affacciati | finestra o balcone di casa | vede la strada; parla dall'alto; versa | **N** (figura alla finestra) | N |
| occupa_posto | panca, tavolo, posto auto | posto mio (prenotazione visibile) | P `siede` | N |
| tieni_posto | cosa posata sul posto · per qualcuno | il posto resta | O (l'oggetto sul posto) | N |
| sali_scala / scendi | scala di `tetti.js` | sul tetto / in strada | P `gradini` | N (per gli NPC) |
| arrampica | `appiglio` (grondaia, balcone, impalcatura) · abilità | su di un piano; caduta possibile | **N** | N |
| salta_tetto | tetto vicino ≤ 2,5 m | sull'altro tetto; caduta comica possibile | P `salto`/`atterra` | N (per gli NPC) |
| scavalca | muretto, recinto, barricata bassa | dall'altra parte | P `scavalca` | N |
| fai_scaletta | in_gruppo · uno fa da `scala` all'altro | l'altro sale | P `tiene` + `gradini` | N |
| ospita | casa · persona | dorme da te; debito d'affetto; prima o poi lite | O | N |
| sfratta | proprietario · inquilino moroso | inquilino senza casa (gancio `#sfratto`) | P `discute` | N |
| arreda / ridipingi | come oggi (`Casa.fai`) | | P | ✓ ✓ |
| pavimento, butta_mobile, riordina, sporca, pianta, finestra, tv | `Casa.VERBI` | | P / O | L ×7 |

#### 4. Sociali (33)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| saluta | persona vicina | affetto piccolo; chi non saluta offende (Delegato) | P `indica` + O | N |
| ignora | persona che saluta o chiede | rancore piccolo; orgoglio | O «…» | N |
| chiacchiera | persona vicina | diceria passa | P `discute` | ✓ |
| racconta | un fatto (diceria) · a qualcuno | diceria, con l'errore creativo (§C.6) | P `discute` | L (risacca `racconta`) |
| confida | segreto · persona di fiducia | complicità +; il segreto ora è di due | P `discute` + O «psst» | N |
| mente | fatto · persona | l'altro crede il falso; se scoperto, fiducia −− | O | N |
| prometti | cosa o ora · persona | promemoria; parola mantenuta o rotta (c'è già il fatto) | P `stretta` | N |
| proponi_appuntamento | persona | | P | ✓ |
| invita | festa, tavolata, casa · persona | l'invitato viene o no; chi non è invitato se ne accorge | P `discute` | N |
| escludi | festa · persona | l'escluso: vergogna e rancore (Gavino) | O | N |
| presenta | A a B | relazione nuova fra A e B | P `indica` | N |
| consola | persona triste | affetto +; tristezza − | P `pacca` | N |
| complimenta | persona · cosa sua | stima +; orgoglio | P `discute` | L (azioni `apprezza`) |
| sfotti | persona | ridono gli altri; vergogna e rancore | P `discute` + O | L (azioni) |
| insulta | persona | rancore +; può scaldare la lite | P `rabbia` | N |
| rinfaccia | torto, debito | | P | ✓ |
| scusati | torto fatto | rancore −; vera o falsa (c'è già `scusa_falsa`) | P `discute` | N |
| perdona | scusa ricevuta | rancore a zero; affetto + | P `stretta` | N |
| chiedi_favore | persona · cosa da fare | obbligo; il favore negato pesa (`favore_negato` c'è già) | P `discute` | L (risacca `chiedi_aiuto`) |
| fai_favore | favore chiesto | obbligo dell'altro | dalla famiglia del verbo fatto | N |
| corteggia | attrazione > .4 · persona | attrazione dell'altro ±; gelosia di terzi | P `discute` + O ♥ | L (eventi `corteggia`) |
| abbraccia | affetto alto | affetto +; visto in pubblico, diceria | **N** (coppia) | N |
| bacia | attrazione reciproca | amore; segreto o scandalo | **N** (coppia) | N |
| litiga | rancore o torto · persona | la lite (fatto che c'è già); il campanile la conta | P `rabbia`/`discute` | L (azioni `litiga`) |
| fai_pace | lite · persona | rivalità −1 gradino | P `stretta` | N |
| giura | promessa solenne · sul santo, sulla madre | parola più pesante (rotta = scandalo) | P `mani_alzate` | N |
| minaccia | persona · forza o `colpo` | paura dell'altro; rancore | P `indica`/`rabbia` | L (azioni) |
| ricatta | segreto dell'altro, foto | soldi o favore; rancore enorme | P `discute` | L (risacca) |
| fai_da_paciere | due che litigano | la lite si ferma o il paciere le prende | P `alt` | N |
| prendi_le_parti | una lite · un lato | alleanza +; rivalità con l'altro lato | P `indica` | N |
| avvisa | pericolo (Grigi, ordinanza) · persona | l'altro scappa o si prepara | P `indica` | L (risacca) |
| raccomanda | persona · a chi ha un posto | il posto in Comune, il lavoro | P `discute` | N |
| aspetta_qualcuno | appuntamento | incontro o buca (c'è già) | P `aspetta` | N (oggi dentro la mente) |

#### 5. Economia (26)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| compra, vendi, baratta, presta, chiedi_prestito, salda, rendi, regala | come oggi | | P | ✓ ×8 |
| mercanteggia | bottega o bancarella | prezzo −; pazienza del venditore − | P `discute` | N |
| fai_credito | bottegaio · cliente | il conto (debito scritto sul quaderno) | O (il quaderno) | N |
| offri_da_bere | bar · persona | affetto +; obbligo | P `bancone` | L (azioni `offri`) |
| chiedi_elemosina | posto pieno · `cappello` | monete; vergogna; ordinanza possibile | P `aspetta` + O | L (eventi `mendicante`) |
| colletta | causa · gente | cassa comune | P `porge` | L (iniziative, risacca) |
| scommetti | un fatto incerto · persona | debito o vincita alla scadenza | P `discute` | L (eventi `scommessa`) |
| gioca_a_carte | tavolo, mazzo, 2-4 persone | vince o perde soldi; lite possibile | P `carte` | L (azioni `gioca`) |
| gioca_al_lotto | ricevitoria · numeri (Smorfia) | vincita al giovedì | P `porge` | N |
| affitta | casa, posto, barca | rendita; inquilino | O | N |
| ricetta | refurtiva · ricettatore | soldi; segreto | P `porge` | L (azioni `spaccia`, `ricettato`) |
| contrabbanda | merce · porto di notte | soldi; i Grigi | P `porta_su` | L (risacca) |
| assumi / licenzia | bottegaio · persona | lavoro dato o tolto (gancio `#lavoro_perso`) | P `stretta` / `discute` | N |
| sciopera | lavoro · in_gruppo | la bottega o le barche ferme | P `aspetta` + `cartello` | N |
| apri_bottega / chiudi_bottega | bottega mia | serranda (SRRRA), clienti | P `lavora` + O | N (popolo lo fa senza verbo) |
| decima | soldi che passano davanti · Sciabica | «il dieci per cento»: credito | P `discute` | N |
| paga | multa, tassa, conto | −soldi; il conto chiuso | P `porge` | N |

#### 6. Lavoro e mare (18)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| lavora, pesca | come oggi | | P | ✓ ✓ |
| rammenda_rete | rete · molo | rete buona | P `lavora` | N |
| scarica_cassette | barca ormeggiata | cassette sul molo | P `porta_su` | N |
| consegna | cosa · a qualcuno, per conto di | arriva (o al posto sbagliato: il lazzo) | P `porta_su` | L (eventi `fattorino`) |
| servi | bar, osteria · cliente | cliente servito | P `bancone` | N |
| taglia_capelli | barbiere · cliente seduto | capelli; chiacchiere | P `lavora` | N |
| timbra | sportello · foglio | il foglio vale; il paese aspetta | P `lavora` + O TUMP | N |
| rema | barca a remi | si sposta in mare | **N** | N |
| ormeggia / salpa | barca | in porto / in mare | P (barche di oggi) | N (per gli NPC) |
| tuffati | molo, scoglio, tetto basso sull'acqua | in acqua; pubblico; sfida | P `salto` + `nuota` + O SPLASH | L (iniziative `tuffo`) |
| nuota | acqua | si sposta; freddo d'inverno | P `nuota` | N (per gli NPC) |
| cerca_sulla_spiaggia | alba · spiaggia | trova le cose restituite dal mare | P `raccoglie` | N |
| raccogli_ricci | scogli | cibo | P `raccoglie` | N |
| salva | persona in acqua o in pericolo | onore; debito di vita | P `nuota` + `tiene` | L (azioni `soccorri`) |
| getta_in_mare | cosa | il mare non la restituisce (regola 1) | P `lancia` | N |
| restituisci | cosa trovata · proprietario | incontro forzato (anche fra rivali) | P `porge` | N |

#### 7. Conflitto (24)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| spingi | persona vicina | l'altro barcolla; lite | P `spinta` | N |
| schiaffo | persona · rabbia | vergogna dell'altro; lite pubblica | P `spinta` (veloce) + O SCIAFF | N |
| picchia | persona · mani o `colpo` | ferito; rissa possibile | P (`anim_lotta`) | L (azioni, risacca) |
| separa | due che si picchiano | li ferma o le prende | P `alt` + `spinta` | N |
| scappa | pericolo | via | P `fuga` | L |
| insegui | persona che scappa | la prende o la perde | P `fuga` | N |
| pedina | persona · non visto | sa dove va | P camminata | L (risacca) |
| ruba / borseggia / scippa | cosa o persona · non visto (scippa: no) | +borsa; furto; inseguimento | P `fruga` / `fuga` | L ×3 |
| scassina | porta, auto, cassa · `attrezzo` | aperta; reato | P `forza` | L (risacca) |
| sabota | cosa di un altro (rete, motorino, baracca) | rotta di nascosto; rancore se si scopre | P `forza` | L (risacca) |
| minaccia_con | `colpo` o arma · persona | paura; resa o reazione | P `mira`/`indica` | L (azioni `minaccia`) |
| lancia_sasso | `proiettile` sasso · bersaglio (vetro, telecamera, Grigio) | rotto o colpito; TONF/CRASH | P `lancia` + O | L (risacca) |
| lancia_bottiglia | bottiglia · bersaglio | CRASH; vetri a terra per un giorno | P `lancia` + O | N |
| lancia_uova | `molle` · persona o facciata | sporco, vergogna; SPLAT | P `lancia` + O | N |
| lancia_molotov | `incendiario` · bersaglio | fuoco per 30-90 s; bruciatura che resta 3 giorni | P `lancia` + **M** (fuoco, bruciatura) | N |
| lancia_bomba_carta | `botto` | BUM; paura nel raggio; fumo | P `lancia` + **M** (fumo) | N |
| incendia | cosa `infiammabile` | fuoco; ferito possibile | P `scalda` + **M** | L (eventi `fuoco_baracche`) |
| spegni_fuoco | fuoco · secchio o coperta | spento; onore | P `porta_su` + `lavora` | N |
| difendi | posto o persona · in_gruppo | i Grigi o i rivali si fermano o no | P `guardia` | L (risacca `proteggi`) |
| arrenditi | pericolo · dalla parte perdente | fermato; vergogna o pace | P `mani_alzate` | L (azioni `costituisciti`) |
| denuncia | fatto · commissariato | i Grigi indagano; rancore enorme se si sa | P `discute` | N (il fatto c'è già) |
| testimonia | fatto visto · Grigi o paese | colpa a qualcuno (anche sbagliata) | P `discute` | N |

#### 8. Costruire e occupare (16)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| raccatta, barrica, tira_su_baracca, presidia, costruisci, smonta | come oggi | | P | ✓ ×6 |
| rinforza | pezzo di baracca · assi, lamiera | pezzo più duro allo sgombero | P `martella` | N |
| dipingi_baracca | baracca · vernice | colore; nome della zona | P `vernicia` | N |
| appendi_cartello | `cartello` · baracca, via | «Zona libera», «Vietato ai Grigi» | P `attacchina` | N |
| monta_tettoia | `riparo` · sopra un posto | si sta all'asciutto (gancio per la pioggia) | P `martella` | N |
| monta_fune | `fune` · due ancore su tetti vicini (≤ 18 m) | la fune (highline) | **N** + **M** (fune tesa) | N |
| smonta_fune | fune · `tagliente` o mani | via la fune (chi è sopra cade!) | P `forza` | N |
| allaccia_corrente | filo · lampione vicino | luce rubata; il lampione sfarfalla | P `lavora` + **M** (il filo) | N |
| pianta_orto | terra, vaso, aiuola pubblica | orto; si annaffia ogni giorno | P `zappa` | L (cantiere `cropDo`) |
| scava | terra · pala | buco, nascondiglio | P `scava` | L |
| accendi_falò | legna · posto aperto | calore, gente attorno; ordinanza possibile | P `scalda` + M (il falò c'è nelle feste) | N |

#### 9. Mezzi e strada (17)

Gli automobilisti di `COSTRUIRE_IN_CITTA.md`: davanti a un blocco **scelgono**, e la scelta la fa la Mente come per tutti.

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| guida | `veicolo` mio o prestato · meta | si va; obiettivo «arrivare» | P `in_auto`, `in_vespa`… | L (azioni) |
| monta_mezzo / smonta_mezzo | mezzo | | P | L |
| parcheggia | posto auto libero | il posto è mio (si litiga) | P | N |
| suona_clacson | in coda o bloccato | PAAAP; rabbia di chi è davanti | O + audio (c'è già) | N |
| aspetta_in_coda | strada bloccata | pazienza − (curva) | P `in_auto` | N |
| aggira | percorso alternativo | si arriva più tardi | P `in_auto` | N |
| sposta_auto | auto vuota in mezzo · scendi, guida 10 m, risali | la via si libera; se è di un altro, lite | P (scendi, sali) | N |
| riprendi_auto | la mia auto rubata e abbandonata | auto ripresa; accusa | P | N |
| ruba_auto | auto · `attrezzo` o chiavi | auto rubata (gancio `#auto_rubata`) | P `forza` | L (game, azioni) |
| spingi_auto | auto in panne · in_gruppo | parte; gruppo di sconosciuti (gancio `#gruppo`) | P `spinta` (tenuta) | N |
| dai_passaggio / chiedi_passaggio | auto · persona | si va insieme; due che si conoscono | P `indica` (pollice: O) | N |
| ripara_auto | auto rotta · `attrezzo` | parte; meccanico | P `fruga` | N |
| lava_auto | auto · secchio | pulita (i gemelli ne lavano metà) | P `spazza` | N |
| insulta_dal_finestrino | in auto · persona | rancore; lite di strada | P `in_auto` + O | N |
| tampona | guida distratta (esito `comico` di guida) | SDENG; danni; lite o accordo | O SDENG | N |

#### 10. Città e istituzioni (20)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| fai_la_fila | sportello, forno, ricevitoria | il turno; chiacchiere; chi salta la fila | P `aspetta` | L (iniziative `fila`) |
| chiedi_certificato | Comune · pratica | il foglio, o «manca il certificato» | P `discute` | N |
| emetti_ordinanza | Delegato · un fatto che disturba | una regola nuova (gancio `#ordinanza`) | P `legge_su` | N |
| affiggi | `cartello`, manifesto, ordinanza · muro | si legge; si strappa | P `attacchina` | L (eventi `attacchino`) |
| multa | Grigio o brigadiere · infrazione vista | −soldi (mezza multa a testa) | P `legge_su` | N |
| sgombera | Grigi · baracca o posto occupato | pezzi rimossi uno a uno (gancio `#sgombero`) | P `forza` | N (previsto) |
| perquisisci | Grigio · persona | trova o no; vergogna | P `perquisisce` | N (per gli NPC) |
| arresta / rilascia | Grigio · persona | fermato / libero | P `ammanetta` | L (game) |
| protesta | sotto un palazzo · in_gruppo | i Grigi arrivano; Gazzetta | P `indica` + `cartello` | L (iniziative) |
| corteo | percorso · in_gruppo ≥ 5 | la via bloccata; si vede da lontano | P camminata + `cartello` | L (iniziative) |
| firma_petizione | foglio · persona | conta firme | P `disegna` | N |
| batti_pentole | `tamburo` · in_gruppo | rumore di protesta; si sente a 80 m | P `martella` + O DANG | L (estro `pentole`) |
| vota | seggio, assemblea | esito per maggioranza (il gabbiano vota se pareggio) | O | N |
| denuncia_sogno | Ufficio Sogni entro le 10 | il numero del sogno nel Lotto | P `discute` | N |
| ritira_razione | sportello annonario | razione | P `prende` | N |
| guarda_il_garante | bar alle 20 | reazione allo schermo (coro) | P `aspetta` | N |
| suona_campane | campanile · corda | DONG; chiama la gente | O DONG | N |
| benedici | prete · persona, animale, barca, soldi | fede; il binomio fantastico | P `prega` | N |
| fai_comizio | piazza · cassetta come pulpito (`sedile` in piedi) | gente; lite o applausi | P `indica` | L (eventi `comizio`) |

#### 11. Circo, tetti e surreale (18)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| giocola | palline, clave, arance (sostituto) · abilità | pubblico, monete; cade una pallina (esito `comico`) | **N** + **M** (palline) | N |
| monociclo | monociclo | si gira per la piazza; pubblico | **N** + **M** | N |
| trampoli | trampoli | alto due metri; vede oltre la folla | **N** + **M** | N |
| sputa_fuoco | torcia, liquido | pubblico; ordinanza; scotta il tendone | **N** + **M** (fiammata) | N |
| fai_il_mimo | piazza | pubblico; il Grigio non capisce | **N** | N |
| statua_vivente | posto pieno, `travestimento` | ferma per ore; monete; i bambini la toccano | P (fermo) + O | N |
| passa_il_cappello | pubblico ≥ 3 · `cappello` | monete (secondo la fama) | P `porge` | L (iniziative `esibisci`) |
| attraversa_fune | fune montata · equilibrio | dall'altra parte, o caduta (nel tendone, nel bucato, in strada) | **N** (equilibrio) + P `cade` | N |
| fai_le_carte | mazzo · cliente | il futuro (si avvera per caso: diceria) | P `carte` | N |
| intesta | Comune · una cosa o un animale (il polpo, il cane dello zio) | la residenza, la casa, la tessera: il binomio fantastico | P `discute` + O TUMP | N |
| pesa | bilancia · cosa o animale (il gatto) | il peso scritto; la faida della bilancia | P `lavora` | N |
| parla_al_gabbiano | il Comandante | niente (non parla); il paese guarda | P `discute` | N |
| conta_i_colpi | mezzanotte · campanile | la scommessa si paga | O DONG ×n | N |
| osserva_dal_tetto | sul tetto | vede lontano; memorie «visto» | P `guarda_lontano` | N |
| grida_dal_tetto | sul tetto | si sente a 80 m; proclama, insulto, serenata | P `rabbia` + O | N |
| fai_la_serenata | sotto un balcone · chitarra o radiolina | attrazione; il padre e il secchio | P `discute` + O ♪ | L (estro `serenata`) |
| lancia_un_estro | uno dei 25 estri (lotteria della capra, la fila per niente, la gara…) | l'estro come storia piccola | dagli atomi | L (iniziative, 25 varianti) |
| fai_un_voto | santo, statua · promessa | se la grazia arriva, si deve pagare (storia) | P `prega` | N |

#### 12. Muri e arte (8)

| verbo | ruoli · condizioni | effetti principali | si vede | stato |
|---|---|---|---|---|
| dipingi_muro | come oggi | | P | ✓ |
| scritta | muro · bomboletta o gesso | il messaggio (insulto, amore, proclama) | P `vernicia` | L (metodo della mente) |
| crossa | pezzo di un altro writer | rancore; faida di muri | P `vernicia` | L (iniziative) |
| ripassa | pezzo sbiadito | vivo | P `vernicia` | L (iniziative) |
| attacchina | manifesti · muro | si legge | P `attacchina` | L (eventi) |
| cancella | scritta · secchio o vernice | pulito; il writer lo sa | P `spazza` | N |
| disegna_col_gesso | lastrico | il disegno per un giorno; bambini | P `gesso` | L (eventi `gessetti`) |
| ritratto | persona seduta · carta | il ritratto (somiglia o no) | P `disegna` | L (estro `ritratti`) |

**Il totale.** 19 + 28 + 23 + 33 + 26 + 18 + 24 + 16 + 17 + 20 + 18 + 8 = **250 verbi** (le righe con due nomi, come
`entra / esci`, ne contano due): **32 ci sono** (✓), **74 si migrano** dai cataloghi vecchi (L), **144 sono nuovi** (N).

**Come si vedono** (contati sulle tabelle qui sopra):

| canale | verbi | quota | cosa serve |
|---|---|---|---|
| posa che c'è già (P), con l'oggetto in mano di `vprop` o il generico per famiglia | 186 | 74% | niente di nuovo: la cascata di `STRUMENTI_NPC` §4.6 |
| posa che c'è già più un'onomatopea (P + O) | 30 | 12% | solo la parola disegnata |
| solo bolla, pittogramma e onomatopea (O) | 17 | 7% | pittogrammi nuovi in canvas 2D (sotto) |
| posa che c'è già più un modello o un effetto nuovo (P + M) | 4 | 2% | fuoco e bruciatura (molotov, incendio), fumo (bomba carta), il filo della corrente |
| **animazione nuova** (N, di cui 5 anche con un modello) | 13 | 5% | `sdraiati`, `affacciati`, `arrampica`, `abbraccia`, `bacia`, `rema`, `fai_il_mimo`, `attraversa_fune` (equilibrio); con un modello: `monta_fune` (fune tesa), `giocola` (palline), `monociclo`, `trampoli`, `sputa_fuoco` (fiammata) |

In tutto: **13 animazioni nuove e 8 modelli o effetti nuovi**. Il **93%** dei verbi si vede con le pose di oggi, i pittogrammi e le
onomatopee.

**I pittogrammi nuovi della bolla** (oggi 26, disegnati in canvas 2D, nessun asset): se ne aggiungono 22. Sono: sedia, occhio
(sbircia), orecchio (origlia), lacrima, risata, cuore spezzato, bacio, pugno, stella dell'urto, sasso, bottiglia, fiamma, botto,
cartello, megafono, timbro, fune, monociclo, palline, volante, clacson, gabbiano. Le **onomatopee** sono parole disegnate nella
striscia dello stile D, in nero su carta: TOC TOC, DRIIN, SBAM, CRAC, CRASH, TONF, SPLAT, SPLASH, BUM, PAAAP, SDENG, DONG, DANG,
FSST, SCIAFF, TUMP, CLIC, SRRRA, SCRIIC, BOING, PLIC.

### B.5 Le dimensioni: relazioni, emozioni, reputazione

**Le relazioni (per coppia, ≤ 24 per persona, come oggi).** `rel[altro]` passa da 5 a 10 numeri, quantizzati a un byte:

| dimensione | da dove viene | cosa apre |
|---|---|---|
| affetto, fiducia, debito, rancore | come oggi | presta, regala, rinfaccia, vendicarsi |
| **stima** | lavoro ben fatto, coraggio, complimenti | raccomanda, prendi_le_parti, chiedi consiglio |
| **paura** | minacce, botte, divisa | obbedisce, scappa, denuncia (o non denuncia) |
| **attrazione** | corteggia, balla, fama di bello o di coraggioso | serenata, bacio, gelosia dei terzi |
| **rivalità** (gradino 0-4 della faida) | la scala della Bibbia del mondo §4.4 | dispetti, sfide, tregua dal 3° gradino |
| **complicità** | segreti condivisi (lista di id di fatti) | ricatto, copertura, confessione |
| **obbligo** | favori, ospitalità, vita salvata | chiedi_favore riesce; il favore negato pesa doppio |

**Le emozioni (stati brevi, decadono in ore).** `umore`, `rabbia` e `paura` (ci sono già nei bisogni), più `vergogna`, `orgoglio`,
`euforia` e `noia`. Le scrivono gli effetti dei verbi (termine nuovo `emo`). Spostano gli obiettivi (la vergogna vuole sparire, la
noia vuole storie) e **scelgono il modo** (con la rabbia, «con_rabbia»).

**La reputazione (la fama pubblica).** Otto assi per persona: onesto, generoso, violento, ridicolo, coraggioso, matto, ricco, pio. Si
ricavano dai fatti notevoli pubblici (`pub × peso`) e **si sanno per quartiere**: la fama viaggia con le dicerie, quindi alla calata
sanno della figuraccia di stamattina e in collina no. È un dato sparso: 8 quartieri × solo le persone con fama diversa da zero.
Anche i **gruppi** (la banda, la zona autonoma, i pescatori) e i **quartieri** hanno una nomea: tranquillo, pericoloso, allegro,
dei Grigi.

**I quartieri** (per la tensione e la fama), dai 211 posti: Porto (molo, calata, pontili, scalo, molo cargo), Centro (piazza, fontana,
chiesa, bar, mercato), Caruggi (vico, caruggio, piazzetta, fiori), Lungomare (spiagge, bagni, passeggiata, giardini), Governo
(governo, ministero, Garante, commissariato, caserma), Margine (stazioni, benzina, officina, discarica, baracche delle palme),
Campagna (collina, vigne, masseria, cave, bosco), Isole.

### B.6 Le storie a più passi (storylet)

**Che cos'è.** Una storylet è una **situazione con dei ruoli**, non un copione. Ha:
- un **innesco**: uno schema sui fatti, come una domanda al registro, per esempio «due persone con rivalità ≥ 2 e una cosa contesa
  persa da meno di un giorno»;
- dei **ruoli** con le loro condizioni (chi può fare A, B, il coro);
- da 2 a 5 **passi**. Ogni passo dice **che cosa vuole che succeda**, non come: spinge un obiettivo nella Mente di un ruolo e aspetta
  un fatto di un certo tipo. I verbi li sceglie la Mente, quindi la stessa storia viene diversa ogni volta;
- dei **rami** sugli esiti («se B si scusa… se B ride…»);
- una **scadenza**, e una chiusura di ripiego («non se n'è fatto niente»);
- gli **esiti**, che sono fatti con dei **ganci**: etichette che altre storie sanno leggere. Così una storia ne accende un'altra,
  anche giorni dopo;
- i **segni minimi**: all'inizio, alla svolta, alla fine (§C.5).

**Il registro.** Ogni storylet porta la lettera della Bibbia del mondo: **R** realistica, **A** assurda (vera ma un gradino più in
là), **S** surreale (una delle regole del paese). Il bersaglio resta 55 / 25 / 20.

**Il catalogo: 142 storylet in 13 famiglie.** Le persone fra parentesi sono un esempio di chi il regista può scegliere: i ruoli sono
generici e si riempiono con chiunque soddisfi le condizioni. I ganci in uscita (→) sono quelli del §B.7.

##### 1. Vicinato e casa (12)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| il bucato conteso (R) | sole dopo la pioggia · stenditoio di due case | A stende · B sposta · lite o patto dei turni | `#lite` `#tregua` |
| il rumore di notte (R) | A canta, festeggia o martella dopo le 23 · B dorme di giorno (Michele) | B bussa · A ignora · secchio dalla finestra o ordinanza | `#lite` `#ordinanza` |
| la scala prestata (R) | A ha bisogno di salire (gatto, antenna, fune) | presta · non torna · rinfaccia, o la scala diventa un ponte | `#debito` `#oggetto_conteso` `#tetto` |
| il gatto sul tetto (A) | un gatto sul tetto · una vecchia sotto | chiede aiuto · qualcuno sale · salva o cade nel bucato | `#tetto` `#onore` `#ferito` |
| la porta sbagliata (A) | un ubriaco · notte | entra nella casa sbagliata · spavento · caffè o Grigi | `#grigi` `#amicizia` |
| il mobile in strada (R) | qualcuno butta un mobile | un altro lo prende · il primo lo riconosce in casa sua | `#oggetto_conteso` `#voce` |
| la facciata vistosa (A) | qualcuno ridipinge con un colore `vistoso` | sfottò · imitazione: tutta la via dello stesso colore | `#moda` `#vergogna` |
| la legna che non basta (R) | freddo · legna scarsa | furto di legna dalla catasta del falò | `#furto` `#festa` |
| l'ospite che non va via (R) | `ospita` da più di 3 giorni | piccoli segni · lite · partenza offesa | `#lite` `#partenza` |
| il trasloco (R) | `#sfratto` | gli amici portano i mobili · dove li mettono? | `#baracca` `#gruppo` |
| la chiave persa (S) | qualcuno perde la chiave in mare | il mare la restituisce · la trova il rivale · «con due dita» | `#mare_restituisce` `#faida` |
| l'orto sul marciapiede (A) | qualcuno pianta in un'aiuola pubblica | il Comune multa · tutta la via annaffia di nascosto | `#ordinanza` `#zona` |

##### 2. Amore e famiglia (12)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| i biglietti (R) | attrazione reciproca · padri in faida (Marco e Rita) | biglietti per conto di Colombina · scoperti · i padri uniti contro | `#amore` `#segreto` `#tregua` |
| la serenata (A) | attrazione > .6 · balcone | canta · il padre si affaccia · secchio o applauso del vicolo | `#amore` `#vergogna` |
| la fuga in Vespa (R) | amore impedito · un mezzo | partono di notte · tornano all'alba senza benzina | `#amore` `#partenza` |
| la gelosia (R) | A vede B ridere con C | sbircia · rinfaccia · scenata pubblica o riappacificazione | `#lite` `#voce` |
| il matrimonio annunciato (R) | due innamorati senza ostacoli | colletta · chi è invitato e chi no · festa | `#festa` `#esclusione` |
| il figlio che parte (R) | qualcuno vuole partire (Dario) | il consiglio del reduce · il ragù di lunedì · parte o resta | `#partenza` |
| il ritorno dell'emigrato (R) | `#ritorno` dal calendario (il Belga) | si vanta · il forestiero chiede · la terza volta smette | `#ritorno` `#voce` |
| la cartolina del 1962 (R) | la posta · un segreto vecchio | il postino la legge · il paese sa · una riga triste | `#segreto` `#tristezza` |
| i soldi della nonna (R) | nipote povero · nonna generosa | regala di nascosto · il padre scopre · orgoglio | `#segreto` `#debito` |
| il padrino conteso (R) | un battesimo · due rivali | ciascuno si propone · il prete sceglie il terzo | `#faida` |
| la cena dei suoceri (A) | invito a cena importante | cucina · rompe · corre a comprare · il dolce del bar spacciato per suo | `#vergogna` `#segreto` |
| l'eredità (R) | un funerale · una casa | due eredi · serrature, fotografie, il cane · faida a gradini | `#faida` `#oggetto_conteso` |

##### 3. Debiti, soldi e scommesse (12)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| il debito che gira (R) | A deve a B, B deve a C | C pressa B · B pressa A · tre rinfacci in un giorno · uno paga per tutti o lite | `#debito` `#lite` |
| la scommessa sul campanile (S) | ≥ 2 liti oggi | scommettono sui colpi · mezzanotte · si paga al mattino | `#vincita` `#perdita` |
| la bisca nel retro (R) | carte · soldi · un retrobottega | vincite · debiti · i Grigi bussano | `#grigi` `#debito` |
| la colletta (R) | un bisogno pubblico (la barca affondata, il funerale) | colletta · chi dà poco · chi tiene la cassa | `#festa` `#voce` |
| la lotteria della capra (A) | estro `capra` | biglietti · estrazione · il vincitore non sa dove mettere la capra | `#vincita` `#oggetto_strano` |
| il conto al bar (R) | fa_credito da troppo · il barista in difficoltà | il quaderno letto ad alta voce | `#debito` `#vergogna` |
| il pizzo (R, adulti) | la «Famiglia» · una bottega | paga o no · vetrina rotta · la via si ribella | `#paura` `#rivolta` |
| il biglietto vincente falso (A) | `per_finta` · un credulone | festeggia · offre da bere a tutti · scopre | `#vergogna` `#debito` |
| il dieci per cento (A) | soldi che passano davanti a Sciabica | «mi spetta» · credito segnato · il santo in debito | `#debito` |
| il portafoglio ritrovato (R) | una cosa `prezioso` persa per strada | chi la trova: restituisce, tiene o divide | `#onore` `#furto` |
| il prestito d'onore (R) | orgoglioso povero · un amico | l'amico paga di nascosto · si scopre · offesa o abbraccio | `#segreto` `#amicizia` |
| l'affitto arretrato (R) | inquilino povero da 2 settimane | avvisi · sfratto · gli amici | `#sfratto` |

##### 4. Faide e rivalità (10)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| la faida a gradini (R) | rivalità fra due ≥ 1 · un fatto che la riaccende | frecciata → dispetto → dispetto pubblico → sfida; ≤ 2 gradini al giorno | `#faida` `#lite` |
| la prima panca (R) | due devote · messa | arrivano prima ogni giorno · il termos · la notte sotto la panca | `#faida` |
| la bilancia (A) | due pescivendole | il sale timbrato · il gatto pesato · il brigadiere sulla bilancia | `#faida` `#grigi` |
| la tregua (R) | faida ≥ 3° gradino + `#nemico_comune` della categoria giusta | si alleano · litigano su chi ha firmato per primo | `#tregua` |
| la ricaduta (R) | `#tregua` da ≥ 1 fascia · una sciocchezza | si ricomincia dal 2° gradino | `#faida` |
| il dispetto al motorino (R) | rivalità · un mezzo | sgonfia le gomme · il proprietario indaga · accusa il sbagliato | `#faida` `#voce` |
| la sfida del tuffo (A) | due che si vantano · inverno | sfida pubblica · i gemelli vendono i posti · tuffa il terzo | `#onore` `#vergogna` `#pubblico` |
| la partita truccata (R) | carte · un baro | il settebello nella calza · scoperto · rissa o risata | `#lite` |
| il soprannome (A) | una figuraccia pubblica | qualcuno lo battezza · lo dicono tutti · resta per sempre | `#vergogna` `#fama` |
| la squadra contro (R) | due gruppi rivali · un pallone | partita · fallo · rissa o pareggio | `#festa` `#lite` |

##### 5. Lavoro, mercato e porto (12)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| la pesca grossa (R) | pescato > 2 × media | il pesce in piazza · il prezzo cala · invidia | `#pesca_grossa` `#prezzo_basso` |
| il prezzo crollato (R) | `#prezzo_basso` · un solo grossista | i pescatori al bar · rabbia · nemico comune | `#nemico_comune` |
| il garzone di tre padroni (A) | tre ordini a uno (Ciccio) | consegna sbagliata · la seconda · la terza volta cade in porto | `#vergogna` `#mare` |
| lo sciopero delle barche (R) | `#nemico_comune` del porto · ≥ 4 pescatori | barche ferme · il bar pieno · trattativa | `#grigi` `#tregua` |
| la cassetta che manca (R) | una cassetta sparita dal molo | sospetto · cerca · si trova (sedile del barbiere!) | `#furto` `#oggetto_conteso` |
| la bottega chiusa (R) | il bottegaio malato | un amico apre al suo posto · sbaglia i prezzi | `#favore` |
| il nuovo concorrente (R) | una bancarella nuova vicino a una vecchia | prezzi · dispetti · faida | `#faida` |
| il licenziamento (R) | bottegaio · garzone pigro o ladro | licenzia · il garzone si vendica o trova un altro lavoro | `#lavoro_perso` `#rancore` |
| il frigo della Cooperativa (R) | il frigo arriva sul molo | il grossista denuncia · la tassa · il lampione si spegne · il molo al buio dei fidanzati | `#nemico_comune` `#ordinanza` `#amore` |
| la rete strappata (R) | rete rotta · un rivale | sabotaggio o scoglio? · la voce · rammenda in gruppo | `#rancore` `#voce` |
| il carico di notte (R) | contrabbando al porto | chi vede tace o parla | `#segreto` `#grigi` |
| la mareggiata (R) | maltempo · barche in mare | chi esce a salvare · eroe o ferito | `#maltempo` `#onore` `#ferito` |

##### 6. Istituzioni, Comune e Grigi (14)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| l'ordinanza assurda (A) | un fatto che disturba il potere | regola precisa e assurda · la maestra la corregge · nemico comune | `#ordinanza` `#nemico_comune` |
| la fila per niente (A) | estro `fila` | la gente si mette in fila · nessuno sa per cosa · arriva qualcosa | `#pubblico` |
| il certificato che manca (A) | qualcuno ha bisogno di un foglio | «manca il certificato» · tre sportelli · il timbro di patata | `#ordinanza` `#vergogna` |
| la multa a metà (A) | infrazione · il brigadiere stanco | mezza multa a testa · arbitra guardando l'orologio | `#grigi` |
| il posto di blocco (R) | i Grigi chiudono una via | coda · clacson · chi aggira · chi scappa | `#grigi` `#ingorgo` |
| la perquisizione sbagliata (R) | i Grigi cercano · un innocente | perquisito in piazza · vergogna · rancore della via | `#grigi` `#rancore` `#vergogna` |
| il bollettino del lunedì (R) | lunedì alle 9 | la regola della settimana · chi la rompe subito | `#ordinanza` |
| il Garante alle 20 (R) | sera, i bar | il paese reagisce · una frase gridata diventa diceria | `#voce` `#pubblico` |
| la petizione (R) | `#nemico_comune` | firme · chi non firma · consegna al Comune | `#tregua` `#esclusione` |
| il comizio interrotto (R) | qualcuno sale sulla cassetta in piazza | applausi o pomodori · i Grigi | `#lite` `#grigi` |
| la residenza al polpo (A) | una cosa nuova e grande (il polpo di sei chili) + il Comune | «il gabbiano ce l'ha» · la pratica · il polpo residente | `#surreale` `#ordinanza` |
| l'Ufficio Sogni e il Lotto (S) | sogni denunciati · giovedì | il più sognato esce · nessuno l'ha giocato | `#vincita` `#voce` |
| l'arresto ingiusto (R) | i Grigi arrestano il sbagliato | il corteo · il rilascio o lo scontro | `#grigi` `#rivolta` |
| la razione del gabbiano (S) | lo sportello annonario | il Comandante ritira la sua · uno si lamenta · la tessera 41 | `#surreale` |

##### 7. Strada e mezzi (10)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| l'auto in mezzo all'incrocio (A) | `#auto_rubata` abbandonata in un incrocio | coda · clacson · uno scende e la sposta · arriva il proprietario | `#ingorgo` `#lite` |
| il parcheggio conteso (R) | un posto libero · due auto | chi arriva prima · `tieni_posto` con la sedia · lite | `#lite` `#faida` |
| la Vespa prestata (R) | presta un mezzo | torna rotta, o non torna, o torna con un'altra persona sopra | `#debito` `#amore` |
| il tamponamento (A) | esito `comico` di guida | SDENG · accordo · lite · testimoni che non hanno visto niente | `#lite` `#debito` |
| l'autostoppista (R) | qualcuno chiede passaggio | chi si ferma · cosa si dicono · un segreto in macchina | `#amicizia` `#segreto` |
| l'auto in panne (R) | un'auto ferma in salita | sconosciuti spingono insieme · diventano un gruppo | `#gruppo` |
| la bici rubata (R) | furto di una bici | la cerca · la vede sotto un altro · è sua? | `#furto` `#oggetto_conteso` |
| la via chiusa (R) | `#baracca` o barricata su una strada | gli automobilisti: aspettano, suonano, aggirano, scendono | `#ingorgo` `#lite` |
| i motorini di notte (R) | ragazzi · rettilineo · notte | gare · rumore · ordinanza | `#ordinanza` `#ferito` |
| il camion del mercato bloccato (A) | `#ingorgo` all'alba | il pesce non arriva · il prezzo sale · il mercato si sposta nella via | `#prezzo_basso` `#pubblico` |

##### 8. Costruire e occupare (12)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| la tettoia della fermata (R) | pioggia · ≥ 3 persone ferme allo stesso posto | uno propone · gli altri raccattano · tettoia · restano amici | `#gruppo` `#baracca` |
| la casetta sul corso (A) | un gruppo senza casa (o per scherzo) | «ci facciamo una casa qui» · baracca in mezzo alla via | `#baracca` `#ingorgo` |
| la barricata (R) | `#nemico_comune` o una via pericolosa | «questa via la chiudiamo noi» · resta un varco | `#baracca` `#ingorgo` |
| lo sgombero (R) | `#baracca` da ≥ 1 giorno · ordinanza | i Grigi arrivano · difendi, tratta o lascia | `#sgombero` `#grigi` |
| la resistenza (R, adulti) | sgombero · occupanti con rabbia alta | pietre, bottiglie, uova dai tetti · i Grigi arretrano o caricano | `#fuoco` `#ferito` `#rivolta` |
| la trattativa (R) | sgombero · un paciere con stima | patto: un giorno in più, il varco più largo | `#tregua` |
| la zona autonoma (A) | baracca che resiste ≥ 3 giorni | un nome, un cartello, regole sue · i Grigi non entrano | `#zona` |
| la festa della zona (R) | `#zona` · sabato | baratti, musica, falò · il paese viene a guardare | `#festa` `#zona` |
| la corrente rubata (R) | baracca al buio · un lampione | il filo · il lampione sfarfalla · la via al buio | `#ordinanza` `#segreto` |
| il crollo (A) | baracca senza manutenzione da 10 giorni (entropia) | crolla di notte · chi c'era dentro | `#vergogna` `#ferito` |
| la baracca del solitario (A) | un matto o un poeta | si costruisce una cosa assurda · il paese la adotta | `#surreale` `#zona` |
| il cartello (A) | `#zona` | il nome scritto sbagliato · la maestra lo corregge | `#zona` `#voce` |

##### 9. Conflitto e scontri (10)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| la rissa al bar (R) | lite · alcol · ≥ 4 persone | spinta · rissa · il paciere · i Grigi | `#lite` `#ferito` `#grigi` |
| lo scippo e l'inseguimento (R) | scippo in un posto pieno | qualcuno insegue · lo prende o cade | `#furto` `#onore` |
| le uova dalle finestre (A) | i Grigi in una via ostile | uova e pomodori · chi è stato? · perquisizione | `#grigi` `#rivolta` |
| la molotov (R, adulti) | `#sgombero` o `#arresto` · rabbia alta | fuoco · la camionetta brucia · indagine | `#fuoco` `#grigi` |
| le bombe carta (R, adulti) | protesta o capodanno | BUM · paura · festa o fuga | `#pubblico` |
| il vetro rotto (R) | un sasso in una vetrina | chi è stato · accusa il sbagliato · rimborso | `#rancore` `#voce` |
| il testimone reticente (R) | un fatto grave visto da uno con paura | tace · lo minacciano · parla o no | `#segreto` `#paura` |
| la vendetta fredda (R) | rancore > .7 da ≥ 3 giorni | sabota di nascosto · si scopre o no | `#rancore` `#faida` |
| il paciere (R) | lite pubblica · uno con stima alta | si mette in mezzo · le prende o fa pace | `#tregua` `#onore` |
| la denuncia anonima (R) | rancore · un segreto dell'altro | lettera ai Grigi · perquisizione · chi è stato? | `#grigi` `#rancore` |

##### 10. Tetti, funi e circo (10)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| la fune fra i palazzi (A) | un motivo per passare dall'alto (amore, fuga, scommessa) | monta · si forma il pubblico · attraversa · arriva o cade | `#fune` `#pubblico` |
| la fuga sui tetti (R) | qualcuno inseguito dai Grigi | sale · salta · fune · i Grigi non lo seguono | `#tetto` `#grigi` `#onore` |
| il concerto sul tetto (A) | un musicista · una sera tiepida | la via si ferma a guardare · ordinanza | `#festa` `#ordinanza` |
| il monociclo in piazza (A) | un artista di strada | pubblico · il cappello · il Grigio · scappa in monociclo | `#circo` `#pubblico` |
| arriva il circo (A) | calendario o nave | carovana · tendone · i bambini · il domatore senza animali | `#circo` `#festa` |
| il giocoliere e il vigile (A) | `#circo` · ordinanza sull'accattonaggio | multa · il giocoliere giocola con il blocchetto | `#ordinanza` `#circo` |
| la scommessa sull'equilibrista (A) | fune montata · pubblico | si scommette · il traballo | `#vincita` `#fune` |
| il cappello rubato (R) | cappello pieno di monete | scippo · il pubblico insegue | `#furto` `#circo` |
| l'apprendista (R) | un ragazzino guarda l'artista ogni giorno | gli insegna · il primo numero · cade | `#circo` `#amicizia` |
| la caduta nel tendone (A) | esito `comico` di attraversa_fune o salta_tetto | BOING nel tendone del mercato · il pesce per aria | `#vergogna` `#pubblico` |

##### 11. Mare e regole del paese (12)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| il mare restituisce (S) | una cosa persa (non buttata, non rubata) | all'alba sulla spiaggia · chi la trova la riporta | `#mare_restituisce` |
| il mare non restituisce (S) | una cosa buttata | «allora non la volevi» · una riga triste | `#tristezza` |
| il campanile (S) | mezzanotte · liti del giorno | colpi in più · le scommesse · l'ordinanza contro le liti | `#vincita` `#ordinanza` |
| la statua guarda (S) | all'alba · chi ha fatto più chiasso ieri | il segnato: servito per primo, gli danno ragione | `#onore` `#fama` |
| la nebbia ripete (S) | nebbia al molo | la frase di ieri torna davanti alla persona sbagliata | `#voce` `#vergogna` `#lite` |
| i sogni (S) | i fatti del giorno · notte | il sogno denunciato · il numero | `#vincita` |
| il forestiero chiede (A) | uno nuovo vede una regola strana | risposta secca · la terza volta non chiede | `#ritorno` |
| il gabbiano ruba (S) | qualcuno grida al mercato | il Comandante ruba · lascia cadere in mare → il mare restituisce | `#oggetto_perso` |
| il polpo gigante (A) | `#pesca_grossa` straordinaria | lo pesano · lo benedicono · la residenza | `#surreale` |
| la balena spiaggiata (A) | calendario raro | tutto il paese · i gemelli vendono i posti · il Comune | `#pubblico` `#festa` |
| il bagno di mezzanotte (A) | una scommessa · inverno | si tuffano · i vestiti spariscono (gabbiano) | `#vergogna` `#amore` |
| il tesoro (A) | estro `tesoro` · una mappa | scavano di notte in tre posti · trovano un'altra cosa | `#oggetto_strano` |

##### 12. Feste e calendario (8)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| il falò di Sant'Antonio (R) | 17 gennaio | la legna che manca · chi porta la sedia contesa · il falò più alto o più basso | `#festa` |
| la partita di recupero (R) | calendario | squadre, arbitro (il brigadiere), rissa o festa | `#festa` `#lite` |
| la processione a mare (R) | estate | le barche · chi porta la statua | `#festa` `#faida` |
| la tavolata (R) | estro `tavolata` | chi cucina · chi non è invitato | `#festa` `#esclusione` |
| il funerale (R) | un anziano muore (fuori scena) | il paese · l'eredità · le pettegole | `#tristezza` `#eredita` |
| il carnevale (A) | febbraio | maschere: scambi d'identità, scherzi, il Grigio travestito | `#surreale` `#voce` |
| la nave che arriva domani (S) | ogni giorno | chi aspetta · chi parte · la nave non arriva | `#partenza` |
| capodanno (R) | 31 dicembre | botti · cose dalle finestre · il primo che si fa male | `#pubblico` `#ferito` |

##### 13. Piccolo crimine e segreti (10)

| storylet | si accende quando | passi e rami | → ganci |
|---|---|---|---|
| il ricettatore (R) | refurtiva in borsa | a chi venderla · il prezzo · i Grigi | `#furto` `#segreto` |
| la refurtiva riconosciuta (R) | il derubato vede la sua cosa | in mano a un altro · chi gliel'ha venduta | `#furto` `#lite` |
| il ricatto (R) | foto o segreto | soldi · il ricattato si ribella o paga | `#segreto` `#paura` |
| la lettera anonima (R) | rancore · un segreto | la lettera · il paese indaga sulla grafia | `#voce` `#rancore` |
| la finta raccolta (A) | un furbo · una causa inventata | colletta per «la barca di Tonino» · Tonino non ha una barca | `#truffa` `#vergogna` |
| il nascondiglio (R) | refurtiva · una baracca | la nasconde nella zona · la zona non lo sa | `#segreto` `#baracca` |
| il Grigio che si fa pagare (R) | un Grigio avido · un'infrazione | chiude un occhio · lo sanno tutti | `#grigi` `#segreto` |
| la confessione (R) | complicità · rimorso | confessa al prete, all'amico o al bar · la cosa si sa | `#segreto` `#tregua` |
| lo scambio di borse (A) | due borse uguali · `per_sbaglio` | ognuno ha la roba dell'altro · si cercano | `#oggetto_conteso` `#amicizia` |
| la caccia al ladro (R) | furto · il quartiere arrabbiato | ronde · accusano il forestiero · il ladro era un gabbiano | `#furto` `#voce` `#surreale` |

**Il totale.** 12 + 12 + 12 + 10 + 12 + 14 + 10 + 12 + 10 + 10 + 12 + 8 + 10 = **144 voci**, cioè **142 storylet** (la faida a
gradini e la ricaduta sono la stessa macchina con due ingressi; il funerale e l'eredità condividono il primo passo). Per registro:
R 90 (63%), A 42 (29%), S 12 (8%). Nel catalogo le surreali sono poche, ma sono **istituzioni quotidiane** (il campanile ogni notte, la
statua ogni alba, il mare, la nebbia, i sogni): contate sulle **uscite** di una settimana arrivano al 15-20% del bersaglio. Per
alzarle si scrivono varianti surreali delle realistiche (il gabbiano nella caccia al ladro), non storie a parte.

### B.7 Gli intrecci: i ganci

Un gancio è un'**etichetta su un fatto d'esito**. Una storylet che finisce scrive i suoi ganci; il regista e le altre storylet li
leggono. Anche i verbi ne scrivono (`ruba_auto` → `#auto_rubata`, `sfratta` → `#sfratto`, `sgombera` → `#sgombero`). Le storylet
del catalogo ne usano **51**: 39 hanno già almeno 2 storylet che li producono, gli altri 12 li producono soprattutto i verbi. La prova
chiede a ogni gancio **almeno 2 produttori** (verbi o storie) **e almeno 2 consumatori**. I principali:

| gancio | chi lo produce (esempi) | chi lo legge (esempi) |
|---|---|---|
| `#lite` | rumore di notte, gelosia, rissa, parcheggio | campanile, faida, rissa, ordinanza, scommessa |
| `#faida` | eredità, chiave persa, dispetto al motorino | faida a gradini, tregua, padrino conteso, processione |
| `#tregua` | petizione, trattativa, paciere, i padri contro i figli | ricaduta, festa, matrimonio |
| `#nemico_comune` | ordinanza, prezzo crollato, frigo | tregua, sciopero, barricata, petizione |
| `#debito` | debito che gira, Vespa prestata, bisca | rinfaccia, affitto, ricatto, vendetta |
| `#furto` | scippo, ricettatore, legna | refurtiva, caccia al ladro, Grigi |
| `#oggetto_perso` / `#oggetto_conteso` | gabbiano, chiave, scambio di borse, cassetta | mare restituisce, refurtiva, faida |
| `#mare_restituisce` | il mare | incontro forzato, faida, amore |
| `#segreto` | biglietti, carico di notte, prestito d'onore | ricatto, confessione, lettera anonima, nebbia |
| `#amore` | biglietti, serenata, frigo (il molo al buio) | gelosia, fuga, matrimonio, fune |
| `#vergogna` / `#fama` | scivola, soprannome, tuffo, perquisizione | soprannome, statua, nebbia, vendetta |
| `#onore` | salva, paciere, mareggiata, inseguimento | statua, invito, raccomanda |
| `#ordinanza` | Delegato, rumore, circo, orto | nemico comune, maestra, multa, protesta |
| `#grigi` | posto di blocco, perquisizione, bisca | uova, fuga sui tetti, denuncia, corteo |
| `#sgombero` / `#rivolta` | sgombero, arresto ingiusto, pizzo | resistenza, molotov, trattativa, corteo |
| `#baracca` / `#zona` | tettoia, casetta, barricata | sgombero, via chiusa, festa della zona, nascondiglio |
| `#ingorgo` / `#auto_rubata` | barricata, auto all'incrocio, posto di blocco | automobilisti, camion del mercato, tamponamento |
| `#fuoco` / `#ferito` | molotov, falò, mareggiata, crollo | ambulatorio, vendetta, colletta, ordinanza |
| `#festa` / `#pubblico` | falò, circo, balena, tuffo | gemelli che vendono i posti, scippo, ladro, esclusione |
| `#esclusione` | matrimonio, tavolata, petizione | Gavino, rancore, la terza volta (regola del tre) |
| `#vincita` / `#perdita` | Lotto, scommessa, capra | debito, offri da bere, finto biglietto |
| `#pesca_grossa` / `#prezzo_basso` | pesca, camion bloccato | prezzo crollato, polpo, sciopero |
| `#partenza` / `#ritorno` | figlio che parte, ospite, nave | forestiero, cartolina, festa |
| `#gruppo` | auto in panne, tettoia, trasloco | casetta sul corso, barricata, squadra |
| `#circo` / `#fune` / `#tetto` | monociclo, fune, gatto | equilibrista, apprendista, fuga sui tetti |
| `#voce` / `#surreale` / `#tristezza` / `#lavoro_perso` / `#maltempo` / `#truffa` / `#moda` / `#amicizia` | | |

**Perché nascono gli incroci.** Gli incroci non si scrivono: nascono perché **due storie condividono una persona, un oggetto o un
posto**, e il regista se ne accorge (§C.4). È l'«interferenza delle serie» di Bergson che la Bibbia del mondo chiede almeno una volta
al giorno: la sedia contesa che finisce nel falò, il cane dello zio che diventa una pratica in Comune.

### B.8 Quanto si scrive (onesto)

I verbi non chiedono battute: chiedono **1-4 parole di bolla, un pittogramma e da 1 a 3 modelli di Gazzetta per famiglia e per modo**.
Le storylet sì. Ognuna chiede circa 6 righe: il titolo breve («la guerra delle serrature»), 1-2 righe di Gazzetta, 1-2 di Si dice e
2-3 battute ai passi. In tutto, **142 × 6 ≈ 850 righe**, più circa 300 modelli per i verbi (12 famiglie × 8 modi × ~3). Si scrivono
**fuori dal codice**, in TSV, con chiave, condizioni, voce e peso (`DEBOLEZZE` §14), e si provano in una pagina di studio. Sono circa
10-12 giorni di scrittura, che si possono fare in parallelo al codice.

### B.9 Contenuti per adulti e classificazione

Andrea accetta PEGI 18 («è la real life»): molotov, bombe carta, pizzo, rissa. Il tono resta a fumetto, senza censure. Però:
- ogni verbo e ogni storylet porta un'**etichetta di contenuto** (`violenza_reale`, `fuoco`, `droga`, `azzardo`, `crimine_organizzato`);
- c'è un **interruttore per famiglia di contenuto** (`?commedia&pegi=12|16|18`, e in partita nelle opzioni). Quando un'etichetta è
  spenta, i verbi spariscono dal registro e le storylet non si accendono. Al loro posto entrano le varianti **di fumetto**: pomodori
  invece di sassi, la bomba carta che fa solo PUFF e coriandoli, la «banana nel sacchetto» di `DEBOLEZZE` §17;
- serve per il questionario IARC del Play Store, che va compilato sul contenuto vero.

---

## C. Il regista

### C.1 Che cosa guarda (gli ingressi)

| ingresso | da dove | come si aggiorna |
|---|---|---|
| **i fatti nuovi** | l'anello di `Fatto` (dall'ultimo battito) e i notevoli | per indice di tipo e di gancio: si leggono solo i nuovi |
| **la tensione per quartiere** `Tq` (0..1) | Σ peso × gravità dei fatti nel quartiere (lite .3, rissa .6, sgombero .8, festa −.2, tregua −.3) | decade del 25% l'ora |
| **la tensione per persona** `Tp` | rabbia, vergogna, rancore massimo, debito scaduto, noia | dalle menti, ogni battito per le persone «in storia», ogni ora per le altre |
| **la tensione per gruppo** `Tg` | banda, zona, pescatori, gruppi di `vita` | media dei membri più i fatti del gruppo |
| **dove sta il giocatore e cosa guarda** | `st.player`, il quartiere, i fatti con `vis ≥ 1`, le voci aperte del Taccuino, le persone con cui ha parlato | l'**attenzione** per persona e per storia: +1 se visto, +.5 se sentito, +.3 se letto in Gazzetta, +1 se aperto nel Taccuino, +2 se ci ha interagito; −20% al giorno |
| **la noia del giocatore** | minuti senza un fatto nuovo visto o sentito | sopra 4 minuti reali, il regista semina vicino |
| **il carico del giocatore** | missione in corso (`BIBBIA_MISSIONI`), inseguimento, combattimento | con il giocatore occupato, niente semi grossi vicino a lui |
| **il calendario e il meteo** | `popolo` (settimana, ricorrenze), meteo | radici delle storie |

### C.2 Che cosa fa: sei operazioni

| operazione | quando | come, senza muovere i burattini |
|---|---|---|
| **SEMINA** | la tensione voluta è sopra quella vera, o una storia è finita | sceglie una storylet il cui innesco è vero, sceglie gli interpreti, scrive il **fatto radice** se serve (meteo, ordinanza, nave, ritrovamento) e mette le **spinte** al primo passo |
| **SPINGI** (fai salire) | una storia attiva è ferma e la curva vuole salire | spinta più forte al passo dopo (fino a ×1,6 sull'obiettivo), oppure apre il ramo più vivace |
| **INCROCIA** | due storie attive condividono una persona, un oggetto o un posto | sposta il passo di una nel posto e nell'ora dell'altra (la tavolata e la lite nella stessa piazza), o fa passare l'oggetto da una all'altra |
| **RAFFREDDA** | la tensione è oltre il voluto (quartiere in fiamme, giocatore in missione) | toglie le spinte, rimanda i passi, semina una storia calma o comica (la tavolata, il circo), fa piovere |
| **CHIUDI** | una storia scade, o il suo esito è arrivato | scrive l'esito con i ganci; se è scaduta, la chiusura di ripiego («alla fine non se n'è fatto niente») |
| **RIPAGA** (il richiamo) | 1-5 giorni dopo una chiusura con il giocatore dentro | un segno che ricorda: la nebbia ripete la frase, zia Bonaria la cita, la Gazzetta corregge, l'oggetto torna dal mare |

**La regola d'oro.** Il regista ha tre leve e nessun'altra:
1. **le spinte** nella Mente, cioè una considerazione `regia` limitata (da ×0,6 a ×1,6) su un obiettivo di una persona per un tempo;
2. **le radici** che il mondo ha già: le istituzioni, il calendario, il meteo, le regole del paese;
3. **la scelta degli interpreti** fra chi soddisfa i ruoli.

Non scrive fatti a nome di nessuno, non sposta nessuno, non salta la Mente. Se la Mente non vuole (il pigro non va), la storia rallenta
o prende il ramo dell'«ignora». Anche quello è un esito.

### C.3 La curva: tre caratteri di regista

Come i narratori di RimWorld, il regista ha un carattere. Si sceglie a inizio partita (di serie, Goldoni):

| carattere | la curva della tensione voluta | semi al giorno | registro R/A/S | per chi |
|---|---|---|---|---|
| **Goldoni** | onde basse e regolari: mattina 0,2, pomeriggio 0,4, sera 0,5 | 8-12 | 60 / 25 / 15 | chi vuole il paese che vive |
| **Fellini** | feste e ondate: due picchi a settimana (0,7), il resto quieto | 6-10 | 45 / 25 / 30 | il surreale e le feste |
| **Monicelli** | crescendo comico: sale per 3-4 giorni fino al disastro (0,85), poi calma piatta | 10-14 | 55 / 35 / 10 | conflitti, sgomberi, scontri |

Sopra la curva del giorno c'è quella del giocatore (Left 4 Dead): **costruzione → picco → respiro** nel quartiere in cui è. Dopo un
picco visto (rissa, sgombero, fune) seguono almeno 20 minuti di gioco di respiro, nel suo quartiere.

### C.4 Come sceglie (l'algoritmo, a battiti)

Il regista **batte ogni 10 minuti di gioco** (circa 25 secondi reali), in una fase sua (`unico.regia`), dopo la memoria e prima della
mente. Ogni battito:
1. **legge** i fatti nuovi e aggiorna `Tq`, `Tp`, `Tg` e l'attenzione;
2. **avanza** le storie attive: per ognuna guarda se il fatto atteso dal passo è arrivato (per tipo, attori e luogo, su indici). Se sì,
   passa al passo dopo o al ramo; se è scaduta, la chiude;
3. **misura lo scarto** fra la tensione voluta (carattere × ora × giocatore) e quella vera, in città e nel quartiere del giocatore;
4. **decide una sola operazione** (due nei picchi):
   - con scarto > +0,15: SEMINA o SPINGI;
   - con scarto < −0,15: RAFFREDDA;
   - sempre, se c'è: INCROCIA (probabilità del carattere) e RIPAGA (quando è il momento);
5. **scrive le spinte** in `st.u.regia.spinte`, che la Mente legge come considerazione.

**Il punteggio di un seme.** `s = adatto × novità × attenzione × registro × peso_carattere`, dove:
- **adatto**: quanto bene gli interpreti soddisfano i ruoli (rel, tratti, posto);
- **novità**: 0 se la storylet è uscita negli ultimi 3 giorni, 0,5 negli ultimi 7;
- **attenzione**: +50% se un ruolo è una persona che il giocatore conosce, o se succede nel suo quartiere; ma il 30% delle storie va
  **lontano dal giocatore** e si saprà dalla Gazzetta (la città vive anche senza di lui);
- **registro**: tiene la quota R/A/S del carattere sulla settimana.

Vince il massimo; a parità decide il flusso `regia`, a seme.

**Il costo.** Le storylet sono indicizzate per tipo di fatto e per gancio dell'innesco: a ogni battito si guardano solo quelle toccate
dai fatti nuovi (una decina, non 142). Il bilancio è **≤ 6 inneschi provati e ≤ 1 casting per battito, ≤ 0,05 ms p95**.

### C.5 I budget

| budget | telefono | Iris Xe | perché |
|---|---|---|---|
| storie attive in città | 8 | 12 | memoria e leggibilità |
| storie attive con la stessa persona protagonista | 2 | 2 | nessuno è il protagonista di tutto |
| semi per ora di gioco | ≤ 2 | ≤ 2 | non si inonda |
| fatti grossi (rissa, sgombero, fuoco, scontro) | 1 al giorno per quartiere, 2 in città | uguale | il grosso resta raro e vale |
| gradini di faida | ≤ 2 al giorno per faida, mai in due fasce di fila | uguale | regola della Bibbia del mondo |
| stessa storylet | ≥ 3 giorni fra due uscite; ≤ 2 volte a settimana in città | uguale | la farinata |
| segni del regista vicino al giocatore | ≤ 1 freccia ogni 90 s; ≤ 1 «Storie» nuova ogni 5 minuti reali | uguale | non stancare |
| richiami | ≤ 2 al giorno; lo stesso fatto al più 2 volte | uguale | regola del richiamo |
| tempo nel passo | ≤ 0,05 ms p95 | ≤ 0,05 ms p95 | §D.6 |

### C.6 La leggibilità: ogni storia lascia segni

Si usano i canali che ci sono (`SISTEMA_UNICO` §7) e se ne aggiunge uno, la sezione **«Storie»** del Taccuino.

| momento | segno minimo (sempre) | in più se il giocatore è vicino |
|---|---|---|
| **seme** | una riga nel **Si dice** del quartiere (se il giocatore ci passa entro 1 giorno, o se un NPC che conosce glielo racconta) | la bolla del primo passo |
| **svolta** (ogni ramo) | una voce in **«Storie»** se il giocatore sa della storia; una riga di Gazzetta se `pub ≥ .5` | bolle, pose, onomatopee; la freccia a bordo schermo se è fuori vista |
| **chiusura** | la **Gazzetta** delle 7:00 (se `pub × peso ≥ soglia`) oppure il Si dice; la storia passa fra le «chiuse» con l'esito in una riga | la battuta finale |
| **richiamo** | la nebbia, Bonaria, la Gazzetta che corregge, l'oggetto che torna | |

**La regola della prova.** Ogni storia chiusa deve avere lasciato **almeno 2 segni** (anche lontani: Gazzetta e Si dice). Le storie
con il giocatore dentro ne lasciano almeno 3, di cui uno visto. **L'errore creativo** (la voce che cambia una lettera, Rodari) vive nei
segni: la diceria si storpia, e una storylet sa agire sulla versione sbagliata (casa → cassa, panca → banca).

**Il giocatore dentro le storie.** Molte storylet hanno un **ruolo libero per il giocatore**: testimone, paciere, giudice della gara,
compratore della refurtiva, chi tiene la scala. Quando il giocatore è vicino, `Verbo.qui` gli offre il verbo del ruolo («Fai da
paciere», «Tieni la scala», «Scommetti sul tuffo»). È il giro di gioco che mancava (`DEBOLEZZE` §2): la città viva chiede qualcosa a te.

### C.7 Determinismo e salvataggio

- **Lo stato** è dati puri in `st.u.regia`:
  `{ v, carattere, tens: {q, p, g}, att: {}, attive: [{k, id, ruoli: {A: 'p12'}, passo, ramo, t0, scad, q, segni}], chiuse: anello di 200, cool: {k: t}, spinte: {id: [g, x, fino]}, budget: {…}, richiami: [[t, fid]] }`.
  Gli interpreti sono id. `Salva.puro` lo accetta senza adattatori.
- **Il caso** viene dal flusso `regia` (sfc32, `st.u.rng.regia`, seme `hash(seme, 'regia')`). Niente `Math.random`, niente tempo
  reale nelle scelte: i budget sono a conteggio, i battiti a tempo di gioco. Stesso seme e stessi ingressi danno le stesse storie.
- **Le versioni.** Il catalogo delle storylet ha un'impronta. Se un salvataggio la trova cambiata, le storie attive che non esistono
  più si chiudono come «sfumate» (con il loro segno), e le altre continuano.
- **La prova di verità** si allarga: 72 ore, si salva, si carica, 6 ore; l'hash dei fatti **e delle storie** deve essere identico.

---

## D. Il motore decisionale

### D.1 Che cosa decide (e che cosa no)

Il regista decide **che cosa** vorrebbe che succedesse (le spinte). La Mente decide **che cosa fa ognuno**. Il motore decisionale
aiuta la Mente in tre punti, sempre **fra le opzioni che il sistema offre già**:
1. **quale obiettivo** fra quelli con utilità > 0, cioè i primi K per curve (K = 6 su Iris Xe, 4 sul telefono);
2. **quale metodo** HTN fra quelli che riescono (comprare o farsi prestare, rinfacciare in piazza o a casa);
3. **quale ramo** quando un ruolo di una storylet deve scegliere (difendere, trattare o lasciar perdere).

Non genera verbi, non genera argomenti, non tocca `pre`: un'opzione che `Verbo.puo` rifiuta non arriva mai al motore.

### D.2 Come si innesta: una correzione limitata

Oggi: `u(g) = Π curva_i(x_i) × (1 + .3·carattere) × (1 − nope) × inerzia × orario`.

Domani: `u'(g) = u(g) × spinta_regia(g) × 2^clamp(f(x, g), −1, +1)`.

- `f` è l'uscita del modello: **al massimo raddoppia, al minimo dimezza**. Le curve restano il corpo della decisione; il modello è un
  gusto sopra.
- Il modello si chiama **solo sui primi K** (per curve) e solo nelle scelte piene (≤ 4 per passo, come oggi): mai più di 24 valutazioni
  per passo.
- **Il ripiego**: senza file del modello, con lo schema delle caratteristiche diverso (impronta), con `?commedia&curve`, o se la
  misura del tempo sfora per più di 1 passo su 100, si ha `f = 0` e il gioco torna esattamente quello delle curve.

### D.3 Le caratteristiche (40, tutte già calcolate dalla Mente o dal regista)

| gruppo | caratteristiche |
|---|---|
| il corpo (8) | fame, sonno, igiene, svago, compagnia, rabbia, paura, soldi rispetto all'affitto |
| il carattere (9) | cor, loq, avid, legge, pigro, orgoglio, teatrale, generoso, rancore |
| le emozioni nuove (4) | vergogna, orgoglio, euforia, noia |
| il momento (5) | ora (seno e coseno), blocco d'orario, giorno della settimana, meteo |
| il posto (4) | quanta gente entro 18 m, posto pubblico o no, tensione del quartiere, distanza dal giocatore (a fasce) |
| le relazioni vicine (4) | la persona più rilevante entro 30 m: affetto, rancore, debito, rivalità |
| la storia (3) | ha un ruolo in una storia attiva? quale passo? la spinta del regista |
| l'abitudine (3) | quante volte lo stesso obiettivo nelle ultime 6 ore, ore dall'ultimo fatto «notevole» proprio, fama ridicolo/coraggioso nel quartiere |
| **l'opzione** (descrittori, non l'id) | famiglia (corpo, sociale, conflitto…), quanto è pubblica, rischio, costo in minuti, quanti attori servono |

L'opzione si descrive **per proprietà, non per nome**. Così un obiettivo nuovo eredita quello che il modello ha imparato sui suoi
simili, e il vocabolario può crescere senza riallenare tutto.

### D.4 Il modello: alberi di decisione quantizzati

- **Tipo**: un insieme di alberi a gradiente (gradient boosted trees), profondità 4. Tre teste: obiettivo, metodo, ramo.
- **Perché alberi e non una rete**: si leggono (per ogni scelta si può stampare «perché»: le 3 soglie che hanno pesato di più, per
  l'ispettore); sono veloci (4 confronti per albero); con soglie intere danno **lo stesso risultato su ogni macchina**, mentre una rete
  in virgola mobile può differire fra telefono e PC e rompere il seme.
- **Il formato**: le caratteristiche si quantizzano a interi a 16 bit (`q = round(x × 1024)`); ogni nodo è `[caratteristica (8 bit),
  soglia (16 bit)]`, ogni foglia un intero a 8 bit; la somma delle foglie dà `f`. È un file `unico_modello.js` che contiene solo array
  (`Int16Array`, `Int8Array`) e l'impronta dello schema.
- **La misura**: 3 teste × 128 alberi × (15 nodi × 3 byte + 16 foglie) ≈ **23 KB**, più ~3 KB di codice d'inferenza. Si sta sotto i
  50 KB anche raddoppiando gli alberi.
- **Il costo**: 128 alberi × 4 confronti ≈ 520 operazioni intere per valutazione; × 24 valutazioni al più per passo ≈ 12.500
  operazioni, cioè **~0,02-0,04 ms su Iris Xe** (stima: va misurata, §D.6).

### D.5 L'allenamento, fuori dal gioco

**Il banco** (`banco/regista/`, solo per lo sviluppo, non nel gioco): carica il gioco in Node **come le prove**
(`test_unico_mente.js`, funzione `carica`: i moduli, la porta, i cinque di commedia, il tag «unico»), senza grafica.

| pezzo | cosa fa |
|---|---|
| `sim.js` | gira giornate per seme (`--semi=1..400 --giorni=3`), in processi paralleli; registra i punti di decisione (caratteristiche, opzioni, scelta, utilità a curve) in JSONL compresso |
| `ramifica.js` | in un punto di decisione su 20, **fotografa lo stato** (`unico_salva`, che c'è già e salva e ricarica in modo identico) e fa partire 3 rami: la scelta delle curve e 2 alternative fra le prime K. Ogni ramo gira 3 ore di gioco e restituisce le misure |
| `premio.js` | le misure diventano un **premio** (sotto) |
| `allena.js` | un allenatore di alberi a gradiente **scritto da noi** in Node (~400 righe: istogrammi, profondità 4, passo .1, L2, arresto anticipato su semi tenuti da parte). Esporta `unico_modello.js` |
| `studio_giornate.html` | la pagina per i **voti di Andrea** |
| `guardia.js` | le prove di non-peggioramento (§D.7) su 20 semi mai visti × 3 giorni |

**Il premio di un tratto di 3 ore** (pesi iniziali; li tarano i voti):

| voce | misura | peso |
|---|---|---|
| storie | passi di storylet avanzati + 3 × storie chiuse con un esito (non «sfumate») | + |
| incroci | storie che si sono toccate | + |
| varietà | entropia dei verbi e dei modi usati; novità rispetto agli ultimi 3 giorni | + |
| leggibilità | quota dei fatti visti o sentiti con un segno; storie chiuse con ≥ 2 segni | + |
| vita sana | bisogni soddisfatti (nessuno con fame > .9 per più di 2 ore), turni coperti, economia che si conserva | + (vincolo) |
| coerenza | violazioni delle regole della Bibbia del mondo §7 (chi non c'è che agisce, regole surreali rotte, soldi dal nulla) | − forte |
| ripetizione | stessa sequenza di obiettivi per la stessa persona in giorni diversi; stessa riga sentita | − |
| degenerazione | oscillazioni (A-B-A-B in 30 minuti), monomania (un obiettivo > 40% delle ore di veglia, fuori dal lavoro), spirale di conflitto | − forte |

I conteggi grezzi entrano con il **logaritmo**: dieci chiacchiere in più non valgono una storia chiusa (difesa contro l'imbroglio del
premio).

**Il metodo: miglioramento per rami** (approximate policy iteration). È semplice e onesto:
- **giro 0**: la politica sono le curve. Si raccolgono le decisioni e i rami;
- il modello impara a predire il **vantaggio** di ogni opzione (premio del suo ramo meno la media dei rami);
- **giro 1**: la politica è curve × 2^f. Si raccoglie di nuovo, si riallena; 3-4 giri in tutto.

Durante la raccolta, con il 15% delle scelte si esplora fra le prime 3 (a seme) e si registra la probabilità, per correggere lo
squilibrio con l'importanza dei campioni.

**I voti di Andrea.** La pagina `studio_giornate.html` mostra **due giornate simulate affiancate**: la Gazzetta, le storie del giorno
con i passi e, quando c'è, un minuto di registrazione Playwright della piazza. Andrea sceglie la migliore e può mettere un'etichetta:
«bella storia», «noioso», «troppo assurdo», «incoerente», «troppa violenza». Circa 150 confronti a giro, un'ora di tempo. Dai
confronti si stimano i **pesi del premio** (modello di Bradley-Terry sulle misure della giornata). Le etichette «incoerente» diventano
**regole** scritte, non pesi.

**Il tempo di calcolo (onesto).** Oggi un giorno di gioco in Node costa **circa 97 s** (misurato: seme 1, `test_unico_mente.js`).
- 2.000 giornate fanno ~54 ore di CPU, cioè ~3,5 ore su una macchina da 16 core.
- I rami costano 2-3 volte tanto.
- Un giro di allenamento è quindi **una notte su 16 core**, e 3-4 giri sono una settimana di notti.

Se il vocabolario rende la simulazione più lenta, questi tempi crescono: va misurato al passo 0 del piano.

### D.6 Il bilancio di tempo

| fase | oggi (Node, server) | obiettivo telefono medio | come |
|---|---|---|---|
| mente (scelte, piani) | p95 0,32-0,36 ms | ≤ 0,40 ms | il vocabolario passa da 19 a 44 obiettivi: si mette un **cancello** (le considerazioni a zero tagliano subito, come già fa `CARE`) e si valutano per intero solo i primi K |
| motore (inferenza) | — | ≤ 0,05 ms | K = 4 sul telefono, solo nelle scelte piene |
| regista | — | ≤ 0,05 ms | un battito ogni 10 minuti di gioco, a fette |
| **in tutto** | | **≤ 0,5 ms p95 per passo** | |

Attenzione: non c'è **nessuna misura su un telefono vero** (`DEBOLEZZE` §3). Un telefono di fascia media può essere 2-4 volte più lento
di questo server, quindi la mente di oggi potrebbe già stare vicino a 1 ms. Il passo 0 del piano misura prima di tutto; se serve, la
classe `tel` ha meno menti in scena (16 invece di 24) e K = 3.

### D.7 Come si evitano i comportamenti degeneri

- **La correzione è limitata** (×½…×2), e i filtri duri restano: `pre`, NOPE, budget, prenotazioni, limiti del pilota automatico.
- **L'abitudine è una caratteristica**: il modello vede quante volte ha già scelto la stessa cosa, e il premio punisce la monomania.
- **Le guardie** (`guardia.js`), che bloccano un modello nuovo se una sola misura peggiora rispetto alle curve sui 20 semi mai visti:
  - nessuno resta senza mangiare;
  - l'economia si conserva;
  - nessuna oscillazione;
  - la quota di conflitto resta nel budget del regista;
  - leggibilità ≥ 95%;
  - varietà non inferiore;
  - le 4 prove di vita verdi.
- **L'imbroglio del premio**: i conteggi sono logaritmici, le storie contano solo se chiuse con un esito e ≥ 2 segni, e le etichette di
  Andrea correggono i pesi.
- **Il determinismo**: modello puro, interi, nessun caso dentro. Un salvataggio ricaricato con lo stesso modello rifà lo stesso
  futuro. Con un modello diverso, da lì in poi la storia cambia, e l'ispettore lo segnala.
- **La trasparenza**: `?commedia&ispettore` mostra, per la persona toccata, l'utilità a curve, la spinta del regista, `f` del modello e
  le 3 soglie che hanno pesato. Se una scelta è strana, si sa da dove viene.

---

## E. Cinque storie, passo per passo

Le storie qui sotto sono tracce **di progetto**: mostrano come i pezzi si passano la palla. I numeri sono plausibili, non misurati. Le
colonne: **V** vocabolario (verbo, storylet), **R** regista, **M** motore e Mente, **F** fatto, **S** segno visto dal giocatore.

### E.1 «La tettoia della fermata» (4 giorni: costruire, gruppi per caso, Grigi, automobilisti)

| quando | che cosa succede | V · R · M · F · S |
|---|---|---|
| G1 08:10 | Piove (radice: il meteo). Alla fermata della calata aspettano in quattro: Lella (va a Cagliari), Ciccio, il Belga e una comparsa | **R**: `Tq` della calata è 0,15 e il voluto (Goldoni, mattina) 0,2. Prova l'innesco della *tettoia della fermata* (pioggia, ≥ 3 fermi da 10 minuti): vero. **SEMINA**; ruolo A, chi propone, al Belga (teatrale .8, attenzione .4: il giocatore l'ha visto ieri) |
| 08:12 | Il Belga: «In Belgio la tettoia c'è.» Raccatta un bancale dietro il mercato; Ciccio porta una lamiera | **V**: `raccatta`, `porta` (ruolo `riparo`: lamiera, impermeabile), `monta_tettoia` `in_gruppo`. **M**: spinta `costruire` ×1,4 al Belga; per Ciccio il motore dà +0,4 (garzone, piove, gente vicino: «aiutare in gruppo» ha fatto storie in allenamento) contro `lavorare` (è in ritardo dal padrone) e vince. **F**: `raccatta` ×3, `monta_tettoia` (esito `meta`). **S**: bolle «la lamiera», «tutti!»; onomatopea TUMP TUMP |
| 08:40 | La tettoia regge; il bus arriva e nessuno sale. Restano sotto a chiacchierare | **R**: passo 2 riuscito → gancio `#gruppo` (i quattro). **S**: Si dice della calata: «Alla fermata si sono fatti la tettoia da soli» |
| G2 | Due del gruppo (Ciccio e la comparsa, senza casa) dormono sotto la tettoia. Il giorno dopo c'è una parete: è una baracca | **V**: `tira_su_baracca`, `appendi_cartello` («Fermata libera»), `allaccia_corrente` al lampione. **R**: il gancio `#gruppo` più l'obiettivo `rivendicare` (c'è già) aprono la *casetta sul corso*. **F**: `baracca`, `corrente_rubata`. **S**: Gazzetta delle 7:00: «Calata: la fermata ha una porta. Il bus ferma lo stesso.» |
| G3 10:00 | Il Delegato emette l'ordinanza; i Grigi sgomberano. Gli occupanti: il Belga tratta, Ciccio difende, Lella lancia uova dal balcone | **R**: `#baracca` da ≥ 1 giorno + `#ordinanza` → *lo sgombero*; il carattere Goldoni tiene sotto 0,6, quindi niente *resistenza* con le molotov. **M**: ramo di ognuno. Il Belga (stima .6, orgoglio) sceglie `tratta`, +0,3 dal motore; Ciccio `difendi`; Lella (rabbia .7, sul balcone) `lancia_uova` (ruolo `proiettile` molle: uova, in casa). **F**: `sgombera` ×2 pezzi, `lancia_uova` (esito `colto`: il brigadiere sporco). **S**: SPLAT, il brigadiere che guarda l'orologio. Taccuino «Storie»: *La fermata della calata: sgombero in corso* |
| G3 10:20 | La baracca chiude mezza strada; la coda delle auto | **V**: *la via chiusa* (consuma `#baracca`): automobilisti con Mente. Uno `aspetta_in_coda`, due `suona_clacson`, uno `aggira`; un camion scende e `sposta_auto` (l'auto vuota del Belga, lasciata male). **F**: `ingorgo`, `sposta_auto` → gancio `#lite` (il Belga torna e non trova l'auto). **S**: PAAAP PAAAP; bolla «la sposto io» |
| G3 11:00 | La trattativa riesce: un giorno in più e il varco più largo | **R**: **CHIUDE** lo sgombero con il ramo `trattativa` → `#tregua`. **F**: `patto`. **S**: Gazzetta del G4: «Sgombero a metà alla calata: un giorno in più e un metro di varco. Il brigadiere ha accettato perché erano le undici.» |
| G6 | La baracca resiste: è il terzo giorno → *zona autonoma* («Repubblica della Fermata», il nome scritto sbagliato, la maestra corregge) | **R**: RIPAGA il giorno 8 con la *festa della zona*. **S**: il cartello resta nel mondo; il Taccuino ha la zona fra i luoghi |

### E.2 «La fune dei Pinna» (3 giorni: amore, tetti, fune, faida, pubblico, caduta comica)

| quando | che cosa succede | V · R · M · F · S |
|---|---|---|
| G1 sera | Marco e Rita si scrivono biglietti; i padri (i cugini Franco e Bruno) sono al 3° gradino della faida dell'eredità | **R**: *i biglietti* attivi da 2 giorni; il passo «scoperti» non arriva. **SPINGI** con un'opzione più viva: l'innesco della *fune fra i palazzi* è vero (amore impedito, case affacciate a 14 m, una scala prestata in giro: `#tetto`) |
| G2 notte | Marco sale sul tetto con la scala, tende le lenzuola annodate fra i due tetti | **V**: `sali_scala`, `monta_fune` (ruolo `fune`: lenzuola annodate, plausibilità .55, perché la corda vera è in ferramenta chiusa). **M**: spinta `corteggiare` ×1,5; il motore +0,5 al metodo «dall'alto» invece di «al portone» (notte, teatrale .7, rivalità dei padri: in allenamento questi rami hanno fatto le storie più lunghe). **F**: `monta_fune` |
| G2 notte | Dalla strada qualcuno vede; si forma un pubblico. I gemelli Cossu vendono i posti a 50 lire | **V**: *la scommessa sull'equilibrista* si accende sul pubblico (≥ 3); `scommetti`, `vendi` (posti: roba astratta «posto in prima fila»). **R**: INCROCIA le due storie, stesso posto. **S**: frecce a bordo schermo, bolle «guardate!», pittogramma fune |
| G2 23:40 | Marco attraversa; a metà le lenzuola cedono (esito `comico`, che la plausibilità .55 rendeva possibile): cade nel tendone del mercato | **V**: `attraversa_fune` → *la caduta nel tendone*. **F**: `cade`, `#vergogna` (Marco), `#pubblico`. **S**: BOING; il pesce del giorno dopo è già sotto il tendone; la folla AH AH |
| G3 07:00 | Franco e Bruno, entrambi in canottiera, si trovano sotto lo stesso tendone a riprendersi il figlio e la figlia | **R**: la *tregua* chiede `#nemico_comune` della categoria giusta: i figli innamorati (Bibbia del mondo §4.4). **CHIUDE** *i biglietti* con il ramo «i padri uniti contro i figli» → `#tregua` della faida dell'eredità. **S**: Gazzetta: «Mercato: il tendone del pesce ha ceduto alle 23:40 sotto 61 chili. I cugini Pinna e Porcu ne discutono insieme per la prima volta dal testamento.» |
| G5 | La nebbia al molo ripete la frase di Marco: «Rita, arrivo!» | **R**: RIPAGA (richiamo, regola 5). Il **soprannome** si accende: da oggi Marco è «il Funambolo». Fama `ridicolo` +, ma anche `coraggioso` + |

### E.3 «La Ritmo del Belga» (2 giorni: auto rubata, automobilisti, errore creativo, campanile)

| quando | che cosa succede | V · R · M · F · S |
|---|---|---|
| G1 02:00 | Due ragazzi rubano la Ritmo del Belga per un giro e la lasciano in mezzo all'incrocio della fontana, senza benzina | **V**: `ruba_auto`, `guida`; l'esito «a secco» lascia l'auto dov'è. **F**: `#auto_rubata` |
| G1 07:30 | L'ora di punta: la coda. Gli automobilisti scelgono | **V**: *l'auto in mezzo all'incrocio*. Ognuno decide con la Mente: Pina (pazienza bassa) `suona_clacson`; Lino il brigadiere `aspetta_in_coda` («non è il mio turno»); un camionista **scende** e `spingi_auto` `in_gruppo` con due passanti → `#gruppo`. **M**: per il camionista il motore dà +0,6 a «sposta» contro «aggira» (strada stretta, folla, tensione .3). **S**: PAAAP; bolle «tutti!», «spingi!» |
| G1 08:10 | Arriva il Belga, vede la sua auto spinta da tre sconosciuti e grida «ladri!» | **V**: `riprendi_auto` (pre: è sua, è libera) e `insulta` con rabbia. **F**: `lite` con il camionista → gancio `#lite`, contata dal campanile. **S**: Si dice: «Il Belga ha dato del ladro a quello che gli spingeva la macchina» |
| G1 sera | La voce cambia una lettera: «la Ritmo» → «la ritmica». Si dice che il Belga abbia rubato la ritmica della banda | **R**: l'**errore creativo** sul Si dice. La storylet *la caccia al ladro* agisce sulla versione sbagliata: il maestro della banda cerca la grancassa |
| G1 24:00 | Il campanile batte 4 colpi in più (le liti del giorno). Al bar si paga la scommessa | **V**: `conta_i_colpi`, `salda`. **S**: DONG ×16; Gazzetta del G2: «Liti di ieri: 4 (il campanile). Una era per una macchina, le altre per la macchina.» |

### E.4 «Il monociclo di Gavino» (5 giorni: debito, circo, ordinanza, protesta, regola del tre)

| quando | che cosa succede | V · R · M · F · S |
|---|---|---|
| G1 | Gavino deve 3.000 lire a Sciabica («il dieci per cento» di una cosa che non ricorda) | **V**: `decima` → `#debito`. **R**: il *debito che gira* non si accende (Gavino non ha debitori). Gavino ha `noia` alta e l'interesse `giochi` |
| G2 | Gavino trova un monociclo restituito dal mare (regola 1: lo aveva perso un turista d'estate) | **R**: SEMINA *il mare restituisce* puntando un oggetto «straordinario» sulla sua spiaggia (radice); ruolo «chi trova» a Gavino (attenzione alta: il giocatore l'ha visto 3 volte). **V**: `cerca_sulla_spiaggia`. **F**: `#mare_restituisce` |
| G2-G3 | Impara: cade, cade, va. Poi in piazza con il cappello | **V**: `monociclo` (N+M), `passa_il_cappello`; l'esito `comico` le prime volte. **M**: il motore spinge `esibirsi` sopra `guadagnare→vendi` (povero, teatrale .6, piazza piena). **S**: pittogramma monociclo; Si dice: «Gavino ha imparato una cosa» |
| G4 | Il Delegato emette un'ordinanza contro l'accattonaggio con ruote | **R**: la *giocoliere e il vigile* consuma `#circo` + ordinanza. **V**: `multa` (mezza: il brigadiere). **F**: `#ordinanza` → `#nemico_comune` (artisti, bambini, la maestra che corregge «accatonaggio») |
| G4 sera | La piazza batte le pentole sotto il Comune | **V**: *la petizione* e `batti_pentole` `in_gruppo` (ruolo `tamburo`: pentole, secchi, una cassetta). **S**: DANG DANG a 80 m; freccia; Gazzetta: «47 pentole e un secchio» |
| G5 | Gavino è **invitato** alla tavolata della piazza (prima volta). È la terza occorrenza della sua gag: non ci va, è in piazza col monociclo | **R**: la **regola del tre** (Bibbia §6) chiude la sua gag ricorrente; RIPAGA: salda il debito con il cappello. **S**: Taccuino «Storie»: *Gavino e il monociclo: chiusa. Ha pagato Sciabica in monete da 50* |

### E.5 «La sedia del barbiere» (1 giorno: la sostituzione per proprietà)

| quando | che cosa succede | V · R · M · F · S |
|---|---|---|
| 09:00 | La sedia del barbiere si rompe (esito `comico` di `siediti` su una sedia vecchia: usura) | **V**: `rompi` → l'arredo manca. Claudio deve `servi`/`taglia_capelli`: il ruolo `sedile` cerca una cosa rigida, portante e piana. In bottega niente; fuori, una cassetta di pesce di Assunta (plausibilità .7, ma è di un'altra: −0,8) |
| 09:05 | La prende lo stesso (il cliente aspetta) | **M**: nessuna storia, nessuna spinta: decide la Mente (fretta). **F**: `prende` una cosa `di_qualcuno` senza permesso → fatto `furto` piccolo (peso .2) |
| 11:00 | Assunta cerca la cassetta; Carmela la vede dal barbiere e glielo dice, con piacere | **R**: *la cassetta che manca* si accende da sola sul fatto. Ruolo «chi sa» a Carmela (rivalità con Assunta al 2° gradino: ha un motivo). **V**: `racconta` con modo `in_pubblico` |
| 11:20 | Assunta entra dal barbiere e ritrova la cassetta con un cliente sopra, a metà barba | **V**: `rinfaccia`, il cliente si alza a metà barba (il `siediti` interrotto). **S**: la bolla «la mia cassetta!»; Si dice: «Dal barbiere si siedono sul pesce» |

Nessuno ha scritto questa storia. Esiste perché: `sedile` è un ruolo, la cassetta ha le proprietà giuste, la proprietà altrui pesa ma
non vieta, la faida della bilancia dà a Carmela un motivo per parlare, e la *cassetta che manca* sa leggere quel fatto.

---

## F. Il piano

Ogni passo sta dietro `?commedia`, chiude con le sue prove verdi in Node (stesso schema di `test_unico_*.js`) e non cambia l'impronta
(`48196fd63f899c14`: i file nuovi stanno in `TASS_FUORI`). I giorni sono giorni-persona.

| # | passo | consegna | prove | giorni |
|---|---|---|---|---|
| **0** | **Le misure e il banco** | `unico_setaccio.js`: il setacciatore notturno conta le storie compiute (≥ 3 anelli, il giocatore in almeno uno), la varietà, la ripetizione e la leggibilità per giorno e per seme (`DEBOLEZZE` §15). `banco/regista/sim.js` senza grafica, in parallelo. **La misura su un telefono vero** della mente di oggi | `test_regista_misure.js`: i numeri di partenza su 5 semi; il tempo per giornata simulata | 4 |
| **1** | **La scheda verbo v2** | i ruoli per proprietà, la plausibilità, le 16 proprietà nuove, gli 8 modi, l'esito `comico`, le etichette di contenuto e l'interruttore PEGI; il termine `emo`. Il **controllore del vocabolario**: ogni verbo ha segno, tipo di fatto, modello di Gazzetta, posa risolvibile, solo termini noti. Una pagina `studio_vocabolario.html` (che cosa c'è, che cosa manca, quante volte esce in 3 giorni simulati) | `test_vocabolario.js`; parità giocatore/NPC per i 32 di oggi con la scheda nuova | 5 |
| **2** | **La prima ondata di parole** (solo pose esistenti) | 40 verbi: corpo, oggetti e sociali (siediti, scivola, origlia, butta, rompi, versa, lancia, saluta, confida, invita, escludi, scusati, perdona, sfotti, consola, mercanteggia, offri_da_bere, scommetti, gioca_a_carte…); le relazioni a 10 numeri; le emozioni; la reputazione per quartiere | parità per verbo; sostituzioni: 1.000 prove del ruolo `sedile` e `colpo` → distribuzione sensata; leggibilità ≥ 95% | 8 |
| **3** | **Le storylet** (senza regista: si accendono solo dai fatti) | il motore delle storylet (innesco sugli indici, ruoli, passi come spinte, rami, scadenze, esiti con ganci); **12 storylet intrecciate al molo e alla calata** (cassetta che manca, pesca grossa, prezzo crollato, sciopero, gelosia, debito che gira, scommessa sul campanile, mare restituisce, nebbia, tettoia della fermata, rissa al bar, paciere); la sezione «Storie» del Taccuino | `test_storylet.js`: per seme, storie aperte e chiuse, ≥ 2 segni per storia, nessuna orfana; salva e carica a metà storia | 8 |
| | **→ Primo punto di guardia con Andrea** | una registrazione di 3 giorni al molo, con il conteggio delle storie | | |
| **4** | **Il regista** | `unico_regia.js`: tensione, attenzione, noia, budget, le 6 operazioni, i 3 caratteri, la curva del giocatore, le spinte nella Mente, salvataggio; l'ispettore mostra le storie e le spinte | `test_regista.js`: budget mai sforati; storie compiute ≥ 3 al giorno sui semi 1-5; determinismo; ≤ 0,05 ms p95 | 7 |
| **5** | **La seconda ondata** | 70 verbi: conflitto, mezzi (gli automobilisti), città e istituzioni, costruzione estesa (sgombero, rinforza, cartello, corrente); 50 storylet; le varianti di fumetto per PEGI 12/16 | parità; le prove di `test_unico_costruire.js` allargate; il traffico che non si blocca mai del tutto (sempre un varco) | 12 |
| **6** | **Il motore decisionale** | caratteristiche, inferenza intera, `unico_modello.js`; il banco (`ramifica`, `premio`, `allena`, `guardia`); `studio_giornate.html`; il primo giro di allenamento e i voti di Andrea | `guardia.js` verde; determinismo con e senza modello; `?commedia&curve` identico a prima; inferenza ≤ 0,05 ms | 10 |
| **7** | **La terza ondata** (con animazioni nuove) | tetti per gli NPC, funi, circo, mare (rema, tuffo, nuota); le 13 animazioni e gli 8 modelli o effetti (con l'animatore); 60 storylet | parità; cadute e funi provate a seme; nessun NPC bloccato su un tetto | 15 (+ animazioni) |
| **8** | **Playtest e taratura** | playtest a 5 (`SISTEMA_UNICO` §9.4) con e senza regista; 2-3 giri di allenamento con i voti; misure su Iris Xe e su un Android medio | ≥ 2 aneddoti a testa dalle storie; ≥ 70% dei «perché» giusti; i budget di tempo | 5 |
| | **In tutto** | | | **≈ 74 giorni** di codice (circa 15 settimane per una persona), più ~11 giorni di scrittura in parallelo e il lavoro dell'animatore al passo 7 |

**Che cosa fare per primo.** I passi **0, 1, 2 e 3** insieme (circa 25 giorni): la misura, la scheda nuova, 40 verbi e 12 storylet al
molo, **senza regista e senza motore imparato**. È quello che chiede Andrea («prima il vocabolario deve esistere, poi vediamo quando
succede») e ha anche una ragione tecnica: il regista e il motore hanno bisogno di parole fra cui scegliere, e di misure per sapere se
migliorano. Il passo 0 comincia dalla misura sul telefono, perché tutto il resto dipende da quel numero.

---

## G. Rischi (onesti)

| rischio | quanto | che cosa si fa |
|---|---|---|
| **La scrittura** non regge: 850 righe di storie e 300 modelli | alto | le righe fuori dal codice in TSV; i segni sono pittogrammi e onomatopee, non frasi; i modelli per famiglia con `Lingua`; la scrittura comincia al passo 1, in parallelo |
| **Il tempo nel passo** cresce con 44 obiettivi e 250 verbi | alto | il cancello delle considerazioni, i primi K, le storylet indicizzate, i budget a conteggio; la misura sul telefono **prima** (passo 0). Se non basta, la classe `tel` ha meno menti in scena |
| **Il nonsenso combinatorio**: sostituzioni assurde che non fanno ridere (sedersi sul gatto) | medio | le proprietà «vietate» per ruolo, la plausibilità, un elenco di coppie vietate scritto da noi, la pagina di studio che mostra le 50 sostituzioni più frequenti |
| **Il regista si vede troppo**: coincidenze sospette | medio | tre leve sole, la Mente che può dire di no, il 30% delle storie lontano dal giocatore, i semi sempre con una radice credibile |
| **Il modello impara male** (imbroglia il premio, si fissa) | medio | la correzione limitata, le guardie, i conteggi logaritmici, i voti di Andrea, il ripiego alle curve in un parametro |
| **L'allenamento costa** (una notte su 16 core a giro) | medio | si allena solo dal passo 6; giri da 500 giornate per le prove, 2.000 per il rilascio. Se la macchina non c'è, il motore aspetta: il gioco funziona con le curve |
| **Il determinismo fra dispositivi** | basso | soglie e caratteristiche intere; nessun `Math.random` né tempo reale nelle scelte |
| **Le animazioni** delle famiglie nuove (circo, funi, arrampicata, bacio) | medio | la terza ondata è l'ultima; fino ad allora quei verbi non entrano nel registro (la regola: niente verbo senza segno) |
| **La classificazione** (molotov, pizzo, rissa) | medio | etichette di contenuto, l'interruttore PEGI, il questionario IARC fatto sul contenuto vero (`DEBOLEZZE` §17) |
| **L'entropia**: baracche, funi, bruciature, vetri a terra | medio | ogni cosa creata ha una durata (vetri 1 giorno, bruciatura 3, fune 5, baracca senza cura 10); tetto per quartiere; la prova dei 20 giorni |
| **La leggibilità affogata** da troppi segni | medio | i budget dei segni del regista, il telefono con solo pittogrammi (`unico_segni`, come oggi) |
| **Il salvataggio** con storie a metà | basso | stato puro; storie che non esistono più chiuse come «sfumate»; la prova dei 72 + 6 ore allargata |
| **La portata**: 250 verbi sono tanti da provare uno per uno | alto | la parità e il controllore del vocabolario sono automatici. Si entra a ondate e ogni ondata è utile da sola: con 40 verbi e 12 storie la città è già diversa |

---

## Appendice tecnica

### T.1 La scheda del verbo v2

```js
Verbo.registra('siediti', {
  fam: 'corpo',
  args: { su: 'roba|posto?' },
  ruoli: { sedile: { prop: ['rigido', 'portante', 'piano'], vietate: ['fragile', 'vivo'], da: ['borsa', 'posto', 'casa'], q: 1 } },
  modi: { normale: {}, di_nascosto: { pre: [['non_visto']] }, in_pubblico: { pre: [['car>=', 'teatrale', .5]] } },
  pre: [['vivo'], ['fuori|dentro'], ['ruolo', 'sedile']],
  eff: [['bisogno', 'sonno', -.02], ['occupa', '$sedile', '$min'], ['emo', 'noia', -.05]],
  esiti: { comico: { p: '.03 + usura($sedile) * .3', eff: [['rompi', '$sedile'], ['cade'], ['emo', 'vergogna', .3]] } },
  costo: { min: '15..90', fatica: -.02 },
  posa: 'siede', oggetto: '$sedile',
  segno: { bolla: ['sedia', '$sedile'], onom: { comico: 'CRAC' }, cronaca: { soglia: 60, riga: 'gz.corpo.siede' } },
  contenuto: [],
  fatto: 'siede',
  etichetta: a => `Siediti ${Lingua.art(a.su, 'a')}`,
});
```

**I termini nuovi.**
- Condizioni: `ruolo(nome)`, che riempie `$nome` con il candidato più plausibile (§B.2); `car>=(tratto, v)`; `emo>=(emozione, v)`;
  `fama>=(asse, v, quartiere)`; `rel>=(chi, dim, v)`; `in_storia(k, passo)`; `sul_tetto`; `in_acqua`; `in_mezzo`; `pubblico>=(n)`;
  `meteo(tipo)`; `pegi>=(n)`.
- Effetti: `emo`, `fama`, `rel(chi, dim, d)`, `occupa`, `rompi`, `cade`, `bagna`, `sporca`, `fuoco(durata)`, `gancio(nome)`,
  `ordinanza(regola)`.

Restano dati: il pianificatore li legge senza eseguire niente.

### T.2 La storylet

```js
Storie.registra('cassetta_che_manca', {
  fam: 'lavoro', reg: 'R', contenuto: [],
  innesco: { tipo: ['prende'], dove: { cosa: { prop: 'di_qualcuno', cat: 'contenitore' } }, entro: 120 },   // un fatto «prende» di una cosa altrui
  ruoli: {
    padrone: { e: '$f.cosa.di' },                                           // il proprietario della cosa
    preso:   { e: '$f.chi' },
    chi_sa:  { q: [['vide', '$f'], ['rel>=', 'padrone', 'rivalita', 1]], opz: true, meglio: ['loq', 'rivalita'] },
  },
  passi: [
    { id: 'cerca', spinte: { padrone: ['ritrovare', 1.4, '$f.cosa'] }, attende: { tipo: ['cerca', 'chiacchiera'], chi: 'padrone' }, scad: 180 },
    { id: 'sa',    spinte: { chi_sa: ['raccontare', 1.5, '$f'] }, attende: { tipo: ['racconta'], chi: 'chi_sa', con: 'padrone' }, scad: 240,
      senza: 'trova_da_sola' },
    { id: 'faccia', spinte: { padrone: ['riscuotere', 1.6, 'preso'] }, attende: { tipo: ['rinfaccia', 'prendi', 'baratta'], chi: 'padrone' },
      rami: { rinfaccia: 'lite', baratta: 'patto', prendi: 'ripresa' } },
  ],
  esiti: { lite: ['#lite', '#oggetto_conteso'], patto: ['#tregua'], ripresa: ['#oggetto_conteso'], sfumata: [] },
  segni: { seme: 'sd.cassetta.seme', svolta: 'tc.cassetta.$ramo', fine: { gz: 'gz.cassetta.$ramo', sd: 'sd.cassetta.$ramo' } },
  ritorno: { giorni: 3, max: 2 },
});
```

- **L'innesco** è una domanda agli indici di `Fatto` (per tipo, gancio, attore e quartiere) più condizioni sui dati. Si valuta solo
  quando arriva un fatto del tipo giusto: è un **setaccio** alla Felt o Winnow, ma piccolo e senza motore logico.
- **I passi** non dicono verbi: dicono obiettivi (spinte) e quali fatti li compiono.
- **Gli obiettivi nuovi della Mente** (25: da 19 a 44) sono quelli che le storylet chiedono: ritrovare, raccontare, corteggiare,
  esibirsi, imparare, difendere, trattare, proteggere, nascondersi, scappare, arrivare (gli automobilisti), festeggiare, ospitare,
  consolare, scusarsi, sfidare, curiosare, scommettere, protestare, sgomberare (i Grigi), multare, curare (la baracca), organizzare
  (gli estri), aiutare, salvare. Quelli di oggi (vendicarsi, rivendicare, riscuotere…) restano.

### T.3 Il regista, in breve

```js
// fase 'unico.regia': dopo 'unico.memoria', prima di 'unico.mente'; un battito ogni 10 minuti di gioco
function battito(st) {
  const R = st.u.regia, nuovi = Fatto._.dopo(st, R.ultimo);           // i fatti dall'ultimo battito (indice per id)
  tensioni(R, nuovi); attenzione(R, st, nuovi);                       // Tq, Tp, Tg, att (decadimenti a tempo di gioco)
  for (const s of R.attive) avanza(st, R, s, nuovi);                  // passi, rami, scadenze → chiusure con ganci
  const voluta = curva(R.carattere, ora(st)) * giocatore(st, R);      // carico, noia, respiro dopo un picco
  const scarto = voluta - misura(R, st);
  let op = null;
  if (scarto > .15) op = semina(st, R, candidati(R, nuovi)) || spingi(st, R);
  else if (scarto < -.15) op = raffredda(st, R);
  incrocia(st, R); ripaga(st, R);                                     // sempre, nei budget
  R.ultimo = Fatto._.n(st); return op;
}
// le spinte, lette dalla Mente come una considerazione:  u(g) × clamp(spinta[id][g], .6, 1.6)
```

### T.4 Il modello, in breve

```js
// unico_modello.js (generato da banco/regista/allena.js: non si scrive a mano)
var UnicoModello = { v: 1, schema: 'f40-3f9a', alberi: { ob: 128, met: 128, ramo: 128 },
  N: new Int16Array([/* per nodo: caratteristica, soglia, sinistra, destra */]), L: new Int8Array([/* foglie */]), k: 1 / 512 };
function f(testa, q) {                                                // q: Int16Array delle 40 caratteristiche quantizzate
  let s = 0; const T = UnicoModello.radici[testa];
  for (let t = 0; t < T.length; t++) { let i = T[t]; while (i >= 0) i = q[N[i * 4]] <= N[i * 4 + 1] ? N[i * 4 + 2] : N[i * 4 + 3]; s += L[~i]; }
  s *= UnicoModello.k; return s > 1 ? 1 : s < -1 ? -1 : s;            // la correzione: × 2^s
}
```

### T.5 Le prove nuove

| prova | criterio |
|---|---|
| `test_vocabolario.js` | ogni verbo: segno, tipo di fatto, modello di Gazzetta, posa risolvibile, termini noti, etichetta di contenuto; ogni gancio con ≥ 2 produttori e ≥ 2 consumatori |
| `test_sostituzioni.js` | per ogni ruolo, 1.000 casi a seme: la prima scelta è la più plausibile nell'88% ± 3%; nessuna coppia vietata |
| `test_storylet.js` | storie aperte e chiuse per giorno; nessuna storia senza segni; scadenze rispettate; salva e carica a metà storia con lo stesso hash |
| `test_regista.js` | budget mai sforati; ≥ 3 storie compiute al giorno sui semi 1-5; quota R/A/S nel ±10% del carattere; ≤ 0,05 ms p95 |
| `test_modello.js` | inferenza identica in Node e in Chromium (1.000 vettori); `f = 0` senza modello; ≤ 0,05 ms per 24 valutazioni |
| `guardia.js` (banco) | il modello nuovo non peggiora nessuna misura delle guardie rispetto alle curve |
| prove di sempre | `test_unico_*`, le 4 di vita, l'impronta `48196fd63f899c14` |

### T.6 Da dove vengono i numeri di questo documento

- I conteggi di §A.1 sono presi caricando il gioco in Node con il caricatore di `test_unico_mente.js` e contando `Verbo.SCHEDE`,
  `Verbo.COND/EFF`, `Mente.OBIETTIVI/METODI/FONTI/CURVE/ORARIO`, `Segni.TIPI`, `Fatto.GRAV/OFFESE`, `Roba`, `UnicoCatalogo.PROP`,
  `Oggetti.CAT/RECIPES`, `Game.PLACES/BUILDINGS`, `Azioni.VERBS`, `Risacca.VERBS`, `Iniziative.VERBI/ESTRI`, `Casa.VERBI`,
  `Vita.INTENTI/BANCHE`, `Popolo.OGG/INTERESSI/PROJ`. Le scene di `eventi.js` e le pose sono contate con `grep`.
- I tempi sono di `node test_unico_mente.js --giro=1 --giorni=1` su questo server (13 novembre): 96,7 s per un giorno di gioco, 24.532
  passi, fase della mente p95 0,363 ms e 0,323 ms (due misure nello stesso giro).
- I numeri del capitolo E sono di progetto, non misurati.
