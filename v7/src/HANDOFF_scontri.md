# Porto Vecchio — Gli scontri: la scala della violenza di strada (10 ottobre)

Base: v7. Moduli nuovi: `src/scontri.js` (logica, dopo `ordine.js`) e `src/scontri_arte.js` (grafica, dopo `ordine_arte.js`).
Prova: `node test_scontri.js [seme]` dalla cartella `src` (tutto), `node test_scontri.js 1 furgone` (solo il portavalori).

## La regola di ferro
«Finché tiri una bottiglia rischi una carica di manganelli. Se alzi una barricata devi essere pronto a sparare, perché loro
verranno con i caricatori pieni.» Il regime non vuole martiri per il disordine civile; la barricata blocca il flusso del
capitale (camion del carbone, furgoni, traffico) ed è un atto di guerra.

## Livello 1 — L'attrito (sopra le proteste di `ordine.js`)
- **I lanci**: i più decisi del corteo (resolve alto, giovani o ideologia alta, circa un terzo) tirano sanpietrini e bottiglie
  sul cordone; con la piazza calda e l'ideologia alta, ogni tanto una molotov (`G.npcThrow`).
- **Il calore della piazza** (`Pr.sc.heat`): ogni lancio lo alza, le molotov e le aggressioni del giocatore di più.
  - 1,6: **lacrimogeni** al fosforo. Un candelotto a parabola, una nube che cresce fino a 5,5 m e dura 26 s. Chi è dentro
    scappa piangendo (lascia la protesta); il giocatore perde vita, si stordisce, vede i bordi lattiginosi.
  - 3,5: **idrante** del Blindato (se è arrivato con la celere). Liquido antighiaccio: butta a terra, spinge via, bagna.
    Bagnato col gelo: finché non ti asciughi al chiuso o vicino a un fuoco, il freddo morde (vita, brividi, brina ai bordi).
  - 6: niente più avvisi, si **carica** subito.
- **Gli scudi** di alluminio bugnato: un sasso che arriva sul fronte di un agente della celere si ferma lì (alle spalle no).
- **Niente piombo per le bottiglie** (`HOOKS.wantedCap`, una riga in `game.js`): vicino a una piazza calda, senza armi da
  fuoco, l'allerta dei Grigi si ferma al livello dell'arresto. Rischi manganellate, fermo, tre ore in camera di sicurezza,
  multa. Se spari, ferisci con un'arma o hai già ucciso un Grigio, la regola salta.
- I ricordi nuovi nel diario (`ordine.js`, `leaveProtest`): gas, idrante, spari.

## Livello 3 — La barricata
- **Alzarla**: azione «Alza una barricata (poi si spara)» nel menu Qui, in mezzo alla strada, con una piazza di almeno 6
  persone vicino. La tirano su in circa 22 s (la gente aiuta, «dai una mano» la accelera). Di traverso alla strada (dalla
  corsia più vicina). Anche **da sola**: in una manifestazione organizzata della Risacca con morale ≥ 60, repressione ≥ 55
  e calore ≥ 6, una volta su tre.
- **Su**: la celere si ritira («Lasciate fare all'esercito!»), i mezzi non passano (il traffico si ferma, chi sfonda si
  danneggia). Fino a 5 dei più decisi tirano fuori le pistole e restano dietro (`difensori`); la piazza resta.
- **Dopo 38 s il reparto d'assalto**: 8 soldati (2 tiratori scelti) con lo Skorpion arrivano dal lato opposto a 40-48 m,
  il Blindato punta la barricata e la sfonda. Nessun avviso: sparano a chi sta dietro, ai difensori e al giocatore. Al
  primo sparo la piazza disarmata scappa. I difensori sparano ai soldati; feriti o senza colpi, scappano.
- **La fine**: la barricata cade sempre, prima o poi (Blindato, o nessuno più a difenderla). Se il reparto finisce a terra,
  «la barricata tiene»: morale +10, repressione +15, e torna un reparto più tardi. Quando cade: repressione su, morale giù
  (su, se sono caduti almeno due soldati), il ricordo in città per chi era vicino. I caduti del reparto si rimpiazzano.
- I movimenti usano il percorso del motore (`G.goTo`, `G.stepAlong`) quando la linea diretta è chiusa.

## Livello 2 — Il portavalori (sopra `soldi.js`)
- Due **guardie giurate del Banco** (`gb_0` con la pistola, `gb_1` con la lupara) viaggiano a bordo del furgone.
- **Il blocco**: un mezzo fermo o una barricata di traverso davanti al muso (entro 11 m) fermano il furgone per 45 s; le
  guardie scendono in **allerta**. Se ti avvicini entro 12 m con un'arma da fuoco in pugno, o assalti, passano al **fuoco**.
- **L'assalto** (l'azione «Assalta il portavalori» di `soldi.js` passa da `Scontri.assaltoFurgone`): con le guardie in piedi
  non alzano più le mani, escono sparando. Si arrendono solo se sono messe male (lupara o mitra, e loro in uno o tu con due
  complici: 55%) o quando sono ferite. A guardie giù, l'autista consegna i sacchi.
- **Le armi della Famiglia**: vicino a un suo uomo, «Chiedi le armi per il portavalori»: lupara e Skorpion, ma il 40% è loro.
- **Il bottino**, una volta in tasca: «Porta la parte alla Famiglia», «Finanzia le serre» (nella cassa comune della
  Risacca, morale +8), «Tieni il bottino per le cambiali». Armati dalla Famiglia e niente parte entro 6 ore: Sandro e i
  suoi ti danno la caccia.

## La grafica (`scontri_arte.js`)
Scudi bugnati con la scritta GRIGI davanti agli agenti della celere; candelotti in volo; nubi a sbuffi che si gonfiano e si
sfilacciano; il getto dell'idrante a ventaglio; la barricata (carcassa d'auto, due cassonetti, pancali, gomme, transenna
rubata, rete da letto, assi, un bidone che brucia con la luce) che sale man mano e quando cade resta sparpagliata; sullo
schermo i bordi lattiginosi del gas e la brina del bagnato. Si aggancia avvolgendo `OrdineArte.attach/tick`.

## Righe toccate fuori dai moduli (segnate `[scontri]`)
| File | Cosa |
| --- | --- |
| `game.js` | `wantedLevel`: `HOOKS.wantedCap` |
| `ordine.js` | esporta `leaveProtest` e `fermo`; ricordi di gas, idrante, spari |
| `soldi.js` | il messaggio dell'assalto: l'autista, se le guardie sono a terra |
| `index.src.html` | `scontri.js` dopo `ordine.js`, `scontri_arte.js` dopo `ordine_arte.js` |

## Da fare
- **La nube dei lacrimogeni** da vicino è ancora un alone pallido e uniforme (gli sbuffi morbidi si fondono): serve una
  texture di fumo con più contrasto, o particelle più piccole e più scure ai bordi. Gli scudi e la barricata si leggono bene.
- Le prove con le foto: `strumenti_inverno/shot_gioco.js` ora accetta `"meteo"` e `"js"` per scena (vedi l'intestazione).
- **Convogli ferroviari** (vagoni deviati su un binario morto dalla Famiglia, casellanti corrotti): non c'è ancora la ferrovia.
- **Le staffette** in bici e snow-skate con le radioline: vedette che segnalano le volanti durante la fuga.
- **Sabotaggi degli Spilli di Ferro** (bombe carta di notte su sportelli, uffici di collocamento, concessionarie; cavi tagliati;
  chiodi a quattro punte sulle arterie): come imprese notturne delle cellule autonome di `fazioni.js`.
- **Tiratori sui tetti**: oggi i tiratori stanno a terra, più lontani e più precisi.
- **Il caos come copertura**: durante una carica i Grigi vicini sono impegnati: svaligiare un magazzino alle loro spalle.
- Il **debito**: nel codice è `DEBT = 500` (migliaia di lire) con Sandro; il manifesto parla di 480.000 lire di cambiali col
  Banco e la Famiglia, e di pignoramento, sfratto e turni in miniera alla scadenza.

## Le culture dell'isola (dal manifesto di Andrea, da portare nel gioco)
Il testo intero è `v7/MANIFESTO_NARRATIVO.md` sul ramo `claude/nifty-gauss-8lb4a9`, con `v7/BIBBIA_MISSIONI.md`: quando quel ramo
entra, nella bibbia (capitolo 6, «Cosa sa fare il motore») vanno aggiunti gli scontri di questo modulo.
Ventisette anni dopo la Battuta dei boschi (l'Impero ha sterminato il 20% dell'isola e messo l'altro 80% a libro paga della
miniera), Porto Vecchio è una frattura di costumi, linguaggi, odori, suoni e modi di muoversi.
1. **Il Miracolo del Gelo** (la cultura egemone): l'auto a rate come feticcio, viali e parcheggi al posto dei vicoli, il grande
   magazzino e la finta scelta, il notiziario federale in coda; «lavora, consuma, paga la rata e non fare domande».
   Chi protesta è un pazzo che rovina la tranquillità di tutti.
2. **Il Disgelo** (la controcultura street, 15-26 anni): skate, snow-skate e bici chiodate sulle rampe e i corrimano
   ghiacciati (sport, stile di vita, tattica di fuga); serre idroponiche clandestine nei sotterranei, pannelli rubati,
   scambiatori pirata sui tubi del teleriscaldamento; ciclo-officine; boombox a doppia piastra, boom-bap campionato dai
   frantoi e dalle caldaie, cypher attorno alle grate del vapore della centrale; wildstyle cromo, arancio, verde acido e
   fucsia sul cemento, con le tag che sono mappe (una presa calda, un tombino aperto, una rampa pulita).
3. **La gente di rispetto** (la Famiglia): la Pax Mafiosa con l'amministrazione; bische, contrabbando di lusso (sigarette
   bionde, liquori, pellicce comprate dagli ufficiali dei Grigi); disprezzo per skater e writer, che attirano i blindati;
   taglieggiano le serre, usano i ragazzi in bici come corrieri.
4. **I fantasmi del bosco** (i vecchi reduci): chi 27 anni fa posò i fucili; alcol nei bar del porto, tosse di carbone,
   tenerezza e rabbia verso i giovani («noi avevamo le mitragliatrici e ci hanno seppellito nei boschi; voi pensate di
   batterli con una cassetta e una tavola con le rotelle?»).
Prossimi passi possibili: i cypher alle grate (gente in cerchio, boombox, rime che sfottono i manager), le serre nei
sotterranei (`sottosuolo.js`) come luoghi della Risacca da difendere e da taglieggiare, le battute dei reduci nei bar
(`coro.js`), la pubblicità delle rate e delle auto (`render.js`), le tag-mappa (`graffiti.js`).
