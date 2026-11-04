# Porto Vecchio — Lo stile, con la camera7: tre varianti da scegliere guardando (ramo `stile`, 4 novembre)

Il committente: «e la grafica, lo stile?» (due volte). Vuole chiarezza assoluta, un'immagine pulita e definita, niente impasto né rumore,
e il carattere dipinto, ligure e hip hop. Sceglie guardando le foto affiancate, come per la camera.

**Il foglio da guardare:** `_immagini/stile/confronto_5x3.jpg` (5 inquadrature × 3 stili, stesso istante). A risoluzione piena:
`_immagini/stile/scatti/<posto>_<A|B|C>.jpg`. Ritagli 1:1: `_immagini/stile/ritaglio_1a1_vicolo.jpg`, `ritaglio_1a1_piazza.jpg`.

**Gli indirizzi** (stesso posto, una scheda per indirizzo):

- A, oggi: `https://<host>/porto-vecchio/` (oppure `?stile=A`)
- B, illustrato pulito: `https://<host>/porto-vecchio/?stile=B`
- C, pittorico caldo: `https://<host>/porto-vecchio/?stile=C`
- dal vivo, nella console: `__pv.R.stile('B')`, poi `'C'`, poi `'A'`. Le manopole stanno in `window.__STILE.V`. Questo funziona solo se la
  pagina è stata aperta con `?stile=` (anche `?stile=A`): così il passo unico ha già i rami compilati.

**Senza `?stile` non cambia niente.** Il passo unico è lo stesso programma di prima. Nei materiali i rami nuovi esistono già, ma sono
spenti da una uniform a zero (`sgP10`): l'immagine è identica. È verificato contro la build di partenza (§5). I rami vivono già nei
materiali perché i tasselli cotti portano lo shader già scritto: così, dopo la prossima cottura, B e C arrivano anche sulle case dei tasselli.

---

## 1. La diagnosi: cosa si legge oggi (A) con la camera7

Le cinque inquadrature fisse, prese con le sonde della camera7 (`_immagini/stile/sonde/scatti.js`) a 960×540 nel profilo leggero, col
tempo sereno fissato e l'ora fissata: vicolo alle 11 (vicolo dei Pescatori), sbocco alle 16 (dal vicolo dei Lanternini sulla piazza),
lungomare alle 11, piazza alle 13, sera in piazza alle 19:20.

Prima, la geometria della vista. Nelle vie la camera7 sale a 50° e il braccio è di 10 m. In piazza e sul lungomare la pendenza è di 34°
con un campo verticale di 46°: il bordo alto dello schermo guarda 11° sotto l'orizzonte. **L'orizzonte e il mare lontano non entrano
mai nel quadro**: il suolo si vede fino a ~26 m davanti al personaggio. Quello che si vede «lontano» sono le facciate e i tetti
dall'altra parte della piazza, a 20-60 m. Qui lavora l'aria (nebbia e prospettiva aerea), non sul cielo.

| tema | cosa si vede | perché |
| --- | --- | --- |
| **gerarchia di valore** | Nel vicolo i tetti a 3-5 m dalla camera prendono il 55-60% del quadro e sono la cosa più chiara (l'ardesia grigia a L .55-.65). Il vicolo, dove sta il personaggio, è una striscia del 15%: l'occhio va sui tetti. In piazza l'ordine regge (facciate chiare, suolo medio, persone scure), ma il fondo a 25-40 m ha lo stesso contrasto del primo piano: non c'è un piano di fondo. La sera è tutta rosa-viola: suolo e muri hanno lo stesso valore (L50 .34). | la camera a 50° nelle strette; l'aria di `PFD` parte solo oltre il personaggio, con una curva continua (non un gradino) |
| **colore** | Le facciate sono pastello e la piazza è calda: buono. Le ombre sono colorate (blu-lilla di giorno, viola la sera), ma di giorno, sulla piazza grigia, si leggono come grigio-lilla e il suolo resta spento. La sera tutto vira al magenta: un monocromo. | la tavolozza dell'ora va bene; manca un salto netto fra sole e ombra sul suolo |
| **materiali** | *Intonaco*: pulito, con le riprese larghe; si legge come plastica liscia, senza mano. *Pietra delle facciate* (piazza): a blocchi, buona. *Tetti*: nel vicolo il manto delle case del kit (la pila di tele `arr1`, 16 px/m nel leggero) è ingrandito 6-10 volte a 3-5 m dalla camera e diventa una **pappa sfocata**: è l'impasto più grande del quadro. I coppi in geometria hanno l'ombra del sole a strisce morbide (la mappa d'ombra a quella distanza). *Lastrico*: i giunti si leggono e sono puliti. *Mare*: turchese con una sfumatura chiara, pulito; la riva ha il bordo morbido. | le tele ingrandite da vicino; la mappa d'ombra del sole |
| **rumore** | Il più forte del quadro è **il retino delle chiome che si aprono** davanti alla camera (lungomare: l'albero diventa una griglia di puntini Bayer). Poi il varco del primo piano. Sui tetti, i licheni a punti e il muschio a 19 cm del manto (`tetti_vissuti.js`) friggono camminando. | `fade7` della camera7 (il retino), il manto vissuto |
| **lontano e orizzonte** | Il fondo della piazza è nitido quanto il primo piano. La nebbia del giorno, grigio-latte, è giusta ma timida. Il mare si vede solo vicino alla riva. | `PFD.aria` .7 a 38 m; la camera non inquadra l'orizzonte |
| **persone** | Si leggono (personaggio/intorno 1,4-3,2:1 di valore): sagoma scura, il rosso del personaggio. In piazza, alle 13 e vestito chiaro, il personaggio si stacca col colore, non col valore (1,4:1). | — |
| **graffiti** | La «M» e le lettere scure sul muro di pietra della piazza si leggono. Lo spray sul muro di mattoni della sera è basso di contrasto: scuro su scuro. Il writing a terra («CHUKA») si legge di sera. | il tetto di saturazione dei muri tiene gli accenti oltre .7, ma il valore no |

Cosa vuol dire: l'impasto non viene più dal filtro finale (ripulito da [direzione], [profondita2] e [hd]). Viene da tre cose:
1. le **tele ingrandite da vicino** (i tetti delle case nel vicolo);
2. **il retino delle chiome**;
3. **la mancanza di un piano di fondo**: tutto ha lo stesso peso, dal primo piano alla facciata in fondo.

Il carattere c'è nella luce e nel colore. Manca la mano: le superfici sono lisce come plastica.

## 2. Le tre varianti

Sono tutte sulle manopole che c'erano già (`DIR`, `PFD`, `CAT`, `SGU.pro`, i quattro momenti), più tre pezzi di shader piccoli.
Nessuno strato nuovo, nessuna passata nuova, nessun programma nuovo. Il codice sta in `src/render.js` (blocco `[stile]`, dopo `PFD`) e
in `src/tetti_vissuti.js` (il manto).

### A — oggi
Il look di [direzione] + [profondita2/3] + [hd], identico.

### B — «illustrato pulito»
| cosa | come | manopola |
| --- | --- | --- |
| campiture piatte, 3-4 toni per materiale | la luce a tre toni col bordo netto pieno (`celle` 1, prima .8); il confine dritto (`tremolio` 0); l'intonaco quasi senza velature (`varia` .25, `pittura` .45); niente micro-normale | `SGU.pro.celle`, `DIR.*` |
| **il manto disegnato nello shader** (l'aperto di [hd]) | coppi (cella 6 × 8 px della tela: coperta chiara, fianco medio, canale scuro, labbro in ombra, testa al sole) e marsigliesi (4 × 7: canaletti chiaro e scuro, labbro). Ogni cella ha uno di 4 toni. Tutti i bordi sono antialiasati con `fwidth`. Il colore è la media della tela (la mipmap a +4,5), così la tavolozza resta quella. Dove la cella scende sotto 2-5 pixel torna la tela filtrata: niente moiré. Via i licheni a punti; il muschio da una macchia di 1,8 m invece che a 19 cm | `sgP10.x`, `tetti_vissuti.js` |
| ombre colorate | l'ombra presa dal cielo più piena (`proTintaK` .5, prima .38), blu-viola `#5060d0`; le ombre del grading più fredde (×[.86 .9 1.26]) | i momenti |
| **il piano di fondo** | oltre 6 m dietro il personaggio, su 6 m, il fondo diventa un fondale: un gradino di valore verso l'aria (+22%), contrasto e colore al 55%. La via del personaggio resta piena. Zero letture in più: la profondità c'è già | `sV` nel passo unico |
| l'inchiostro | il filo dove una cosa passa davanti a un'altra: più forte (1,5), più sagome (il fondo deve durare 3 px invece di 4), fino a 150 m, blu-viola scuro invece di bruno. La sagoma delle persone piena (1), il loro bordo di luce .28 | `PFD.linea*`, `sW.x`, `CAT` |
| la chiave | più alta e pulita: esposizione ×1,13, contrasto 1,12, luci quasi bianche (×[1,03 1 ,95]), l'aria azzurra `#dde6ee`, la vignetta quasi via | i momenti |
| accenti | persiane, tende, insegne, writing: +20% di colore sul set (prima +16%) | `sW.y` |

### C — «pittorico caldo»
| cosa | come | manopola |
| --- | --- | --- |
| **la pennellata, solo larga** | lo stesso rumore della velatura (nessun rumore in più), allungato in pennellate di ~2 × 0,6 m nel mondo e messo a due toni, col bordo antialiasato (`fwidth`). Svanisce dove una pennellata coprirebbe pochi pixel (da ~50 m), quindi non diventa mai grana. Sopra, la ripresa calda e fredda a 14 m | `sgP10.y`, `render.js` (la mano di colore) |
| intonaco a gradiente morbido | la scala del muro piena (`pittura` 1: chiaro in alto, scuro al piede); la luce a bande quasi sciolta (`celle` .35) | `DIR`, `SGU.pro` |
| la luce ligure calda | il sole dorato `#ffd09a`/`#ffca90` ×1,42, la terra che rimbalza calda `#c49c70`, le luci ×[1,07 1 ,88]; l'ombra resta fredda, viola `#6650b4` (il caldo contro il freddo, non tutto arancio) | i momenti |
| l'aria più forte e calda verso il mare e il fondo | `aria` 1 a 22 m (prima .7 a 38), quasi senza freddo; l'aria virata al dorato (la foschia della costa, `#eed6ba`) | `PFD`, `sW.z` |
| la sera | sole `#ff8a48`, cielo `#8c70c4`, aria rosa `#e8949a`, bordo `#ffa0a8`, ombre `#7a3a9c` | il momento della sera |
| il tratto | il filo leggero (.45), le persone a .7 con più controluce (.34): il volume lo fanno la luce e l'aria | `PFD`, `CAT` |

Tutte e due restano **senza rumore e ferme in movimento**. Ogni segno nuovo sta nel mondo (non sullo schermo), sopra il metro, e si
spegne prima di arrivare al pixel. I bordi disegnati sono antialiasati con `fwidth`. Le misure del tremolio sono al §4.

## 3. Il costo (profilo leggero: Iris Xe, telefoni)

Come in `ANALISI_HD.md`: letture di tessitura e lavoro per pixel. I millisecondi di SwiftShader non valgono per le schede vere (sotto,
solo come spia).

| pezzo | A | B | C |
| --- | --- | --- | --- |
| programmi | — | 0 nuovi (gli stessi `#define`; il manto ha già il suo programma per tipo) | 0 nuovi |
| passo unico, letture per pixel | — | **+0** (il piano di fondo usa la profondità già letta, `fd0`) | **+0** |
| passo unico, calcolo | — | ~14 operazioni (piano di fondo, inchiostro, accenti) | ~5 (l'aria calda) |
| materiali: muri e suolo | — | +0 (solo manopole) | **+0 rumori** (lo stesso `sgN3` con un altro argomento), +2 `fwidth`, ~12 operazioni |
| materiali: tetti a coppi e marsigliesi | — | +1 lettura (la media della tela, in mipmap: coerente in cache), +2 `fwidth`, ~30 operazioni, solo entro la distanza dove la cella si vede (un `if` a monte); **−1 rumore 2D** (il muschio a 19 cm → 1,8 m) e −1 hash (i licheni) | +0 |
| senza `?stile` | identico | — | — |
| memoria, banda | 0 | 0 | 0 |

Le uniform in più sono `sgP10` nei materiali e `sV`, `sW` nel passo. I rami dei materiali dipendono da una uniform (stesso valore per
tutto il disegno), quindi la scheda video ne esegue uno solo. Stima: sulla Iris Xe B e C costano quanto A, entro ±2-3% del passo dei
materiali (il manto di B tocca solo i pixel dei tetti vicini).

Spia di SwiftShader (ms per fotogramma, media di 4, lo stesso istante, stessa pagina; è rumorosa, uno su cinque salta per il raccoglitore):
vicolo 118 · 157 · 130, sbocco 157 · 246 · 145, lungomare 363 · 211 · 69, piazza 111 · 127 · 108, sera 196 · 184 · 158 (A · B · C).
La mediana è 157 · 184 · 130: nessuna variante ha un costo fuori scala. Sul portatile vero va misurato con `?perf` / F3 (la riga
`scheda video`), A contro B contro C, nello stesso posto.

## 4. Le misure (stesso istante, 960×540, profilo leggero; `_immagini/stile/misure.json`, `tremolio.json`)

L = luminanza (10°/50°/90° percentile); sat = saturazione media; *nitidezza* = varianza del laplaciano (più alto, più netto); *rumore*
= mediana, su blocchi da 16 px, della deviazione del dettaglio sotto 1,2 px (quanto «frigge» una superficie piatta); *tremolio* = la
camera spostata di mezzo pixel (`setViewOffset`): differenza media / % di pixel oltre 24 livelli (più basso, più stabile).

| scena | | L 10/50/90 | sat | nitidezza | rumore | tremolio |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| vicolo | A | .11/.41/.63 | .32 | 818 | 5,63 | 4,88 / 5,75% |
| | B | .11/.45/.62 | .29 | 1381 | 6,23 | 4,34 / 4,77% |
| | C | .12/.36/.57 | .33 | 440 | 4,73 | 3,49 / 3,29% |
| sbocco | A | .07/.32/.67 | .34 | 677 | 3,80 | 4,02 / 4,10% |
| | B | .10/.36/.64 | .32 | 1085 | 4,16 | 4,31 / 4,61% |
| | C | .09/.32/.57 | .35 | 369 | 2,83 | 3,40 / 2,87% |
| lungomare | A | .19/.46/.74 | .36 | 2734 | 3,49 | 3,49 / 3,66% |
| | B | .21/.49/.67 | .30 | 5098 | 2,79 | 3,42 / 3,60% |
| | C | .23/.46/.73 | .32 | 1396 | 2,73 | 2,71 / 2,32% |
| piazza | A | .26/.60/.75 | .40 | 818 | 4,07 | 4,07 / 4,12% |
| | B | .28/.60/.73 | .36 | 1345 | 3,25 | 3,92 / 4,04% |
| | C | .27/.52/.70 | .41 | 433 | 3,93 | 3,38 / 2,71% |
| sera | A | .12/.34/.57 | .46 | 610 | 5,47 | 4,79 / 5,07% |
| | B | .14/.35/.55 | .45 | 976 | 5,49 | 4,51 / 4,81% |
| | C | .12/.31/.54 | .54 | 401 | 4,62 | 3,87 / 3,62% |

Cosa dicono:
- **B è il più netto**: +60-90% di nitidezza in ogni scena. La nitidezza viene dai bordi (il filo, la luce a bande netta, il manto
  disegnato), non dalla grana: il rumore delle superfici resta come A (piazza e lungomare meno: il piano di fondo calma il lontano). Il
  tremolio è uguale o più basso di A, tranne lo sbocco (+0,5 punti: più fili sulle cose sottili delle bancarelle).
- **C è il più fermo e il più morbido**: tremolio −25-35% e rumore −15-25% in ogni scena; metà della nitidezza di A (l'aria e il filo
  leggero). Se il committente vuole «definito», C è il meno definito dei tre.
- Lo stacco del personaggio dall'intorno resta fra 1,3 e 3,2:1 in tutte e tre: lo stile non lo peggiora; in B il filo lo segna.

## 5. A senza `?stile` è identica

La build di partenza (1345b99, estratta a parte) e questa build senza `?stile`, in due pagine una dopo l'altra, sulla piazza e sul
lungomare: `sonde/identita.sh`. Risultato al §5.1.

### 5.1 Risultato

Foglio: `_immagini/stile/identita_A.jpg` (partenza · nuova senza `?stile` · differenza ×4). Il set fermo è uguale al livello: muri,
suolo, tetti, mare, luce e ombre delle case. Lungomare: 0,8% dei pixel diversi di più di 2 livelli. Piazza: 16,7%. Le differenze stanno
tutte nelle cose che il gioco decide a caso o col tempo: le persone, il writing assegnato ai muri («Fano» contro «BOSS»), i rifiuti, il
fascio della guida e il suo anello. Non sono il look.

## 6. Cosa resta aperto

- **I tetti delle case del kit nel vicolo** (la pila `arr1`, 16 px/m nel leggero): ingranditi a 3-5 m dalla camera, sono l'impasto più
  grande del quadro, e il manto disegnato di B non li tocca (non passano da `TettiVissuti.manto`). Serve lo stesso disegno analitico nello
  shader della pila (le celle del kit) o tele più fini per i tetti vicini.
- **L'ardesia** non passa dal manto (`CELLE` non la ha): resta tela anche in B.
- **Il retino delle chiome** della camera7 (`fade7`) è il rumore più forte del lungomare. È codice della camera: non l'ho toccato. Da fare con
  il blocco camera: un'apertura con l'alfa vera, o un retino a 2 px con dissolvenza temporale.
- **I tasselli**: i rami di B e C nei materiali delle case cotte arrivano solo dopo la prossima cottura (il workflow `tasselli` al push su
  `main`). Le foto qui sono con la città costruita dal vivo (in locale non ci sono tasselli), quindi mostrano già tutto. Il passo unico e
  le manopole valgono anche sui tasselli vecchi.
- **L'orizzonte**: a 34° la camera non lo inquadra mai. L'aria di C lavora sul fondo della piazza e dei tetti, non sul mare lontano.
- **I graffiti scuri su muro scuro** (sera, mattoni): nessuna delle varianti alza il valore degli accenti, solo il colore. Un tetto
  minimo di contrasto per il writing andrebbe in `writing.js`.
- Le differenze fra A e B sono nette ai bordi e nel lontano, ma meno di quanto mostri una foto rimpicciolita. **Vanno guardati i ritagli 1:1
  e il gioco vero.** Le dosi si tarano dal vivo in `window.__STILE.V.B` / `.C` (poi `__pv.R.stile('B')` di nuovo).
- Il costo misurato su Iris Xe e sul telefono (qui solo stimato).

## 7. Come si rifà

```
cd v7 && python3 build.py
cd _immagini/stile/sonde
TREMOLIO=1 TEMPI=4 node scatti.js 'leggera&tassellivecchi&stile=A' 'A,B,C' v3     # ~18 min in SwiftShader
python3 fogli.py v3 ..                                                            # il foglio, i ritagli, misure.json
./identita.sh                                                                     # A senza ?stile contro la build di partenza
```
`scatti.js` usa il pilota a passi della camera7 (`passo7.js`, con il tempo e il meteo fissati e le varianti allo stesso istante in fondo
alla corsa) e i posti di `luoghi.json`.
