# [look] La bibbia del look: un solo look, pulito, leggibile, cinematografico

Il committente: «si vede in bassa qualità», «non sai dove guardare, non si percepisce una profondità naturale», «i tetti sono tutti
rossi e arancioni e pesano troppo, il suolo non si stacca dalle case, non si capiscono volumi e divisioni, è ancora rumoroso». Poi:
«consultiamo un cineasta, uno scenografo, un tecnico luci, un esperto di fotografia, un illustratore e un animatore, e facciamo in
modo che collaborino».

I sei rapporti (con il brief comune) stanno in `reports/panel_look/`. Qui sotto le decisioni: dove i rapporti si contraddicevano
è scritto chi ha vinto e perché. `?vecchiolook` torna a prima (tavolozza dei tetti, grading, camera, scossa); `?nonitida` spegne lo
shader della leggibilità (vedi sotto); dal vivo `window.__NIT`, `window.__SGU`, `window.__CAMERA4`.

## Le diagnosi su cui tutti e sei concordano
1. **Il caldo è sommato cinque volte** (luci, fotografo): sole pesca × `luce` × `proLuce` × `pro.vivo` (i marroni portati al cotto)
   × `pieno`/`proPieno` (saturazione fino a ~1,95× sui toni già colorati). Alle 10:30 l'immagine sembrava un tramonto, il rosso
   bruciava sul 13-40% dei pixel, aranci e gialli erano il 64-80% del quadro, non esisteva un bianco (B/R delle luci .55).
2. **Era una pianta, non un'inquadratura** (cineasta, animatore): nelle vie la pendenza saliva a 70° (`CAMERA4.max` 1.22), con
   44 m di quadro il personaggio era 15-18 px e non si trovava; tetti al 55-65% del quadro.
3. **La «bassa qualità» era soprattutto sfocatura** (fotografo, luci, illustratore, cineasta): ai bordi la nitidezza era il 40-50%
   di quella al centro (fuoco .85, primo piano .55, velo sui tetti). Una sfocatura a schermo si legge come risoluzione bassa.
4. **Il tappeto di cotto** (scenografo, illustratore): coppi, tegole e anche i terrazzi (pianelle) tutti arancio, con micro-dettaglio
   forte (labbro .62, testa 1.18, 340 licheni per tela).
5. **Gli aloni arancioni sui bordi delle ombre** (luci): non la mappa d'ombra, ma la penombra (sole caldo + riempimento blu, croma
   media) che `vivo` e `pieno` saturavano, più la chiarezza che moltiplicava l'RGB.

## Le decisioni (tutte in render.js tranne la camera)
- **Grading unico** (`if (LOOK.on)` dopo i `momenti`): i pro* neutri (`proOmbra`/`proLuce` [1,1,1], `proSat`/`proContrasto` 1), i
  quattro momenti nuovi (tabella del tecnico luci per sole, cielo, terra, bordo, nebbia; del fotografo per esposizione, contrasto,
  saturazione, ombre e luci), `proPieno` .2 di giorno e .3 la sera, `SGU.pieno` .15, `pro.vivo` .2, la tinta delle ombre di giorno
  `#7a8cb8` a .16 (era `#6878c0` a .24: il blu saturo contro l'arancio faceva il poster). Bordo freddo a .22: i muri lo prendono, il
  suolo visto dall'alto no, quindi il suolo si stacca. Ore: il pomeriggio tiene fino alle 17,2, la sera parte alle 18,6.
- **La curva** (`CustomToneMapping`): la spalla si calcola sul canale più alto e scala tutto il colore (la tinta resta, il rosso
  non brucia prima degli altri), e le luci piene virano un poco al bianco.
- **Saturazione per tinta** nel passo (`SG_LOOK`): arancio ×.78, giallo ×.82, verdi ×.85, blu ×.95, viola e rosa ×1.08 (neon e
  tramonti, Vice City); tetti di saturazione: l'arancio nelle luci ≤ .55, il blu nelle ombre ≤ .35.
- **Nitidezza**: solo sul valore e con un tetto (±.05), `SGU.nitido` .45; sfocature ridotte (`NIT.fuoco` .4, `vicino` .22,
  `raggio` 1.6, velo dei tetti .2); `pro.grana` .12 (in movimento sfarfallava), grana di pellicola `AMB.film` .018.
- **Tetti** (`roofTex1`, `flatKind1`, la falda): coppi sbiaditi (`#a87f68`…`#b8957c`, saturazione ≤ 35%), tegole meno accese,
  il cotto dei terrazzi spento, **metà dei terrazzi a lastrico chiaro** (`#d6cfc2`…), **l'ardesia su una falda su tre**; il
  micro-dettaglio dei coppi più morbido (labbro .86, testa 1.06, 60 licheni, 10 colature). Con lo shader (`NIT.tetti`): sopra il
  piano del personaggio un terzo del colore, valore chiaro e stretto, la calma estesa ai tetti.
- **Volumi** (`NIT`, dalla quota vera di ogni pixel): linea sul ciglio, ombra al piede dei muri, suolo spianato.
- **Dove guardare**: la luce segue il personaggio e sta **un passo avanti nella direzione di marcia** (`NIT.avanti`, l'animatore):
  la via davanti è più chiara, invita.
- **Camera** (`visuale.js` `CAMERA4`): `stretta` 1.08 → .98, `max` 1.22 → 1.08; `VIEW` 44 → 38 m (il personaggio più grande).
  Vinto dal cineasta e dall'animatore contro il «quasi dall'alto» di prima; i valori più spinti (zoom .62, `max` 1.05) non presi:
  meno visuale nei vicoli stretti, da provare in gioco.
- **Scossa**: due seni a 13 e 19 Hz, ampiezza `sh² × .9` (al più .35 m), non più un salto casuale a ogni fotogramma.

## Rimandati (proposti dal panel, non ancora fatti)
- Le regole del set (muretti che finiscono sugli spigoli, marciapiede ≥ 1,5 m, niente case nella via, arredo a isole, una cartaccia
  ogni 25 m², cabine solo in piazza a 80 m, panchine solo in piazza e lungomare): le sta facendo il filone della pulizia della mappa.
- La tavolozza degli intonaci (al più tre per quartiere) e del suolo (carreggiata `#55575c`, marciapiede `#8a8780`, piazze
  `#9e978b`), le persiane solo verdi: scenografo, da fare nei materiali.
- Un colore riservato al personaggio e un accento unico per le cose con cui si interagisce (illustratore `#ff4f9a`, animatore
  `#E8A8BF`: da scegliere uno).
- Lo sguardo avanti della camera più lento (costante 16 → 3), la camminata entro 0,7-1,6×, gabbiani a 3-4 Hz (animatore).
- Bande 2:1 solo nelle scene e nei dialoghi (cineasta).

## Come si prova
`GALLERIA_VARIANTI=strumenti/manopole_nitida.json node strumenti/galleria.js <cartella> strumenti/pulizia_scene.json` (lo shader
acceso e spento sulla stessa scena); il prima intero con `PV_QUERY='?cittanuova&vecchiolook&nonitida'`.

## [firma] Lo shader di Porto Vecchio: una pellicola sola, la lente che respira, meno programmi (31 ottobre)

Il committente (la bibbia «Lo shader di Porto Vecchio»): un video di skate in VX1000 dentro una rivoluzione; la pellicola calda della foto
di strada anni '80 ridisegnata a pennarello, spray e retino da fanzine; il regime grigio e stampato a macchina, la strada colorata, storta,
verde e viva. E: «deve girare fluido, ci mette ancora molto ad aprirsi, lagga in gioco (12 fps), è smorto e stinto; lo shader ha buoni
presupposti ma è pasticciato, troppe cose lo rendono piatto». Si riparte dal ramo `claude/compassionate-knuth-l81uc8` ([strada], [ad],
[segni]), unito qui.

**Gli strati piegati in uno.** Prima il look era quattro strati in fila, ognuno che correggeva il precedente con `Object.assign` e
`#ifdef` ([look] del panel → [strada] PELL → [ad] AD, più le manopole di [nitida] riassegnate tre volte). Ora in `render.js`:
- `if (LOOK.on)`: UNA tabella dei quattro momenti (sole, cielo, bordo, nebbia, esposizione, viraggio ombra/luce, saturazione, contrasto,
  vignetta, colore pieno, neri, la tinta che riempie l'ombra del sole) coi valori finali rivisti sulla bibbia, e un set solo di manopole
  `NIT`. `PELL.on` e `AD.on` valgono `LOOK.on`: `?grigio` e `?noad` non esistono più (`?vecchiolook` resta l'unico «prima»).
- Nel passo unico (`SGP`, `SG_STR` e `SG_AD` sempre definiti col look) sono spariti i rami morti: la saturazione per tinta del panel (era la
  desaturazione a tappeto di aranci, gialli e verdi), i tetti di saturazione, la «calma» (4 letture e una sfocatura delle superfici piane:
  a schermo era bassa qualità), i `#else` del pennarello, del ciglio, dei tetti e delle luci crema.
- Le dosi: ombra di giorno oltremare chiaro e lilla (`proTinta #5060cc` a .32, `ombra [.93, .94, 1.12]`), mai grigia; sera rosa-magenta-arancio
  (cielo `#9a88c8`, nebbia `#d8a0ac`, bordo rosa `#ff9ec0`, ombre `#7a46a8`); notte blu profondo col bordo ciano dei neon; saturazione 1.08-1.09
  di giorno (era 1.06-1.07), colore pieno `proPieno` .38-.42; l'aria del lontano ai due terzi di contrasto (era 55%); i tetti tengono il 70%
  del loro colore (era 60%); il retino nelle ombre `AD.retino` .14 (era .1: non si leggeva).
- **La lente respira** (`PELL.gonfioOra`, in `sguPasso`): da fermi .035, a piedi .045, di corsa .058, sui mezzi fino a .075 con la velocità,
  nel regime .03 (la sua immagine è dritta come una telecamera). `gonfiaK` (la mira, le etichette) legge lo stesso valore del fotogramma.
- **Il confine delle bande trema** (`sguProPezzi`, le celle): le soglie della luce a bande si spostano con un rumore largo nel mondo (±.07),
  come una campitura a pennarello, non una retta.

**I programmi della scheda video (l'avvio e gli scatti).** Misurato con `strumenti/sonda_programmi.js` (nuovo: elenca i programmi per tipo e
per chiave, il sorgente del più grosso, e a regime disegni, ms e profilo con i disegni a vuoto): 194 programmi, 13,8 MB di GLSL, i
`physical` 92 da ~100 KB l'uno; nel caricamento l'attesa della compilazione (`gl.getProgramParameter`) era l'84% del processore senza
tasselli e il 68% coi tasselli, e **a regime ancora il 26%**: programmi compilati mentre si gioca, cioè gli scatti. La causa più grossa: le
vesti dei pezzi della città (`pezzi_citta.js`, `veste`) scrivevano i parametri (genere, usura, corso, giunto, tono…) come costanti nel GLSL e
nella chiave del programma (`pz2|{json}`): 23 programmi diversi per lo stesso shader. Ora i parametri sono due uniform (`pzA`, `pzB`), il
genere sceglie il ramo con un `if` su uniform, la chiave è `pz2` per tutti: un programma. I tasselli ereditano il testo unico quando si
ricuociono (il workflow `tasselli` al push su `main`); finché la cottura nuova non c'è, la città a tasselli porta ancora i 23 di prima.

**L'avvio**, misurato alla pari (`strumenti/analisi_avvio.js` su due cartelle con la pagina di prima e quella nuova, ognuna col suo mondo
cotto, a turno due volte; SwiftShader, quindi contano i rapporti):

| | prima | dopo |
|---|---:|---:|
| `buildWater` | 9,3-11,1 s | 7,2-8,0 s |
| costruzione finita (`__tl.compilato`) | 20,7-23,3 s | 18,3-20,2 s |
| programmi della scheda video (coi tasselli di ognuna) | 194-195 | 177 |
| si gioca (`__tl.vivo`, coi tasselli di ognuna) | 63,8-64,5 s | 49,4-50,3 s (un giro su quattro 96 s) |

- `buildWater`: la profondità del mare a 1 px per metro anche sul computer (era 2: una tela 2600×800 sfocata col filtro 2D).
- `c2Dist` (`world_cittanuova.js`): la finestra stretta da una griglia di 2 m ha reso poco (2,2 → 2,0 s): quasi tutti i punti chiesti
  stanno lontani dalla riva e la finestra resta larga. La potatura dei tratti ora guarda l'estremità più vicina (prima poteva saltare il
  tratto migliore): cambia l'impronta del mondo cotto e dei tasselli.
- Le ultime due righe sono coi tasselli cotti per ogni build (`python3 build.py --tasselli`, 4 minuti qui). Coi tasselli vecchi la pagina
  nuova è più lenta ai primi fotogrammi (le 23 vesti vecchie restano e il programma unico si aggiunge): in produzione il workflow
  `tasselli` li ricuoce al push su `main`, e finché la release nuova non c'è il gioco costruisce la città nel browser come prima.
- `?tassellivecchi` (solo per le sonde in locale): i tasselli di un'altra impronta vanno bene lo stesso.
- Gli scatti mentre si gioca: `sonda_programmi.js` fa camminare il personaggio in otto posti; nascono 4 programmi in tutto (66 ms di
  attesa). La compilazione non è più la causa degli scatti. Negli shader entrano 9 luci puntiformi, 4 faretti con ombra e il sole; le
  luci del cantiere e del sottosuolo escono già con `visible = false` quando non servono.

**Da fare ancora** (dalla bibbia e dalle misure): il bagliore caldo dei neon (il passo unico non ha bagliore); fotocopia e serigrafia
fuori registro sui segni; i 32 `physical` e 23 `lambert` «puri» (le combinazioni di parametri di three: mappa, colore ai vertici,
istanze, doppia faccia…) si riducono solo uniformando i materiali; il campo dei marciapiedi (`swField`, 1,2 s anche coi tasselli) andrebbe
nei dati dei tasselli; le forme (case che pendono, pali storti, personaggi chunky) sono geometria, non shader.

## [cat] [riv] La gerarchia per categoria e lo stato della rivoluzione (1 novembre)

Il piano è `ANALISI_STILE.md` (la diagnosi misurata, il piano di valori per categoria, i passi). Fatto in questo giro:

- **La categoria nell'alfa** (`render.js`, `sguProPezzi`, `C.output_fragment`): ogni materiale opaco scrive nell'alfa del bersaglio della
  scena che cosa è: .2 suolo, .4 muro, .6 tetto, .8 persona (chi ha lo scheletro), 1 il resto. Suolo, muro e tetto dal punto nel mondo e
  dalla normale (in piano e basso: suolo; in piano e alto: tetto; in piedi: muro), anche per lambert, phong, toon e basic (`SG_TAGLIO2`).
  Niente profondità da leggere: vale nel profilo leggero delle schede integrate. `#define SG_NOCAT` in un materiale lo esclude.
  **I tasselli cotti prima non la portano** (210 shader su 315 erano cotti col testo già espanso): vanno ricotti (il workflow lo fa al
  push su `main`; in locale `PW=playwright python3 build.py --tasselli`, 4 minuti).
- **Il passo per categoria** (`SG_CAT`, `window.__CAT`, `?nocat` spegne): muri pastello (un tetto di saturazione, più basso in luce; gli
  accenti già saturi, scritte e saracinesche, restano), tetti col valore stretto e sempre sotto i muri, il cotto caldo fino a .46, suolo
  un filo più scuro al sole, persone con più colore e contrasto. **Le linee dove la categoria cambia**, del colore della cosa: attorno
  alle persone, sul ciglio fra tetto e muro, al piede fra muro e suolo (4 letture dell'alfa, anche nel profilo leggero).
- **Il bordo di luce delle persone** (nel materiale, `STANDARD` con `USE_SKINNING`): la luce di bordo nel colore dell'ora (l'ambiente:
  crema, rosa, ciano), a radente; la forza è `CAT.bordoPersone` (uniform `sgP8`). Attenzione: un commento `//` a metà di una riga del
  GLSL scritto su una riga sola chiude il resto della riga e il programma non compila (schermo nero, «program not valid»): i commenti
  dentro il testo degli shader vanno in fondo alla riga o fra `/* */`.
- **Lo stato della rivoluzione** (`RIV`, `window.__RIV`, `?noriv`): 1 la strada che resiste, 0 il regime. Base `RIV.base` più la scena dei
  graffiti (`Writing.sceneLevel`: lavori vivi, fama, crescita), più i lavori vivi entro 40 m dalla camera; zero nei luoghi del regime.
  Guida la lente (`gonfioRegime` → la lente del momento), la saturazione e il colore pieno, il retino delle ombre e il tratto (nel regime
  la linea tecnica grigia `#4a4e58`), in tutti e due i profili. La tabella del regime per quartiere (`REGD`: centro .8, porto .85) non si
  usa qui: spegnerebbe la città intera.
- **La luce del giorno**: sole più caldo (`#ffe2b8`, `#ffe6c0`) e più forte, meno cielo (`cieloK` .38-.4), meno riempimento dell'ombra
  (`proTintaK` .26, `pro.ombre` .7), il sole più basso (`soleAlto` [18, 33]); la saturazione del passo di nuovo vicina a 1 (`sat` 1.1,
  `pieno` .28): il colore lo portano le categorie e i materiali. La sera rosa-magenta (`sat` 1.0, `proPieno` .3).
- **La camera** (`visuale.js` `CAMERA4`): nelle strette sale meno (`stretta` .88, `max` .98 invece di .98 e 1.08), il quadro è più vicino
  (`VIEW` 35 invece di 38). Col taglio in ogni visuale non serve più salire tanto. **Da provare giocando.**
- **La misura** (`strumenti/galleria.js`): per ogni foto la categoria di ogni pixel (riportata sullo schermo con la piega della lente),
  la quota del quadro, luminanza e saturazione per categoria, luce/ombra del suolo, persone/suolo; `<scena>_cat.json` e la mappa a colori
  `<scena>_cat.png` (suolo grigio, muri sabbia, tetti rosso, persone ciano, altro magenta). Si fa **anche con `?leggera`** (il profilo del
  committente: lì il passo non legge la profondità).

## [tratto] [vettore] [calma] Struttura, linee lisce, calma (1 novembre, seguito)

- **La faccia nell'alfa**: il codice è (categoria × 6 + faccia) / 35 (faccia: 0 sopra, 1-4 i quattro lati nel mondo, 5 sotto). Il passo
  disegna il pennarello dove cambia la categoria o la faccia: sagome, ciglio, piede, spigoli (le facce della stessa cosa più leggere).
- **Linee lisce**: il bordo è un campo continuo (l'alfa letta interpolata su otto punti, Sobel), disegnato alla risoluzione dello schermo
  col bordo sfumato: niente scaletta anche col profilo leggero a metà risoluzione. Dove gli spigoli sono fitti (cornicioni, modanature,
  ringhiere: otto letture a 2,5 texel) la linea quasi si spegne. Lontano dal personaggio la linea si alleggerisce (l'occhio ha un centro).
- **FXAA** nel passo quando non c'è multicampionamento (profilo leggero, grafica ridotta); la nitidezza e il contrasto locale (`CAT.trama`)
  non toccano gli spigoli.
- **Le ombre e il retino**: ombre del giorno più chiare e meno sature (più cielo, meno viraggio blu); il retino fine (22 cm) e quasi tono su
  tono solo nell'ombra piena, quasi niente sul suolo (sulla piazza faceva i pois).
- **I pavimenti** con le pietre leggibili (`pavimenti.js`: giunti .32, variazione .15; erano .22 e .11).

**L'anteprima di un ramo e i tasselli.** L'anteprima di Vercel scarica i tasselli solo se esiste la release `tasselli-<impronta>` della sua
pagina; ogni cambio a un modulo del gioco cambia l'impronta, e senza release la città si costruisce nel browser (lentissimo, i pavimenti
arrivano a pezzi). Per un ramo: lanciare a mano il workflow `tasselli` sul ramo (workflow_dispatch, ~5 minuti), poi un push qualunque
(rifà l'anteprima, che scarica la release). Ultima cotta per questo ramo: `tasselli-a4d37afc65c533fd` ([camera3], 5017713).

## [direzione] La direzione artistica: si toglie, si dosa, ogni segno ha una causa (2-3 novembre)

La regola è `DIREZIONE_ARTISTICA.md` (diagnosi, dieci regole, piano dei valori, tavolozze per ora e quartiere, bordi, dosi, budget del
passo, identità hip hop, misure). In `render.js` tutto sta dietro `DIR` (`window.__DIR`); `?lookvecchio` riporta il look di prima,
identico. Il passo finale col `#define SG_DIR` (via nitidezza, pellicola, tavolozza per tinta, densità e contrasto locale, linee fra le
facce: resta solo la sagoma delle persone; il piano dei valori per categoria nelle uniform `dV`, `dW`; il fuoco `dF`). I materiali: via
retino, nuvole, rumore del suolo, colature; il dettaglio dosato (`DIR.pittura`, `varia`, `vissuto`, `tremolio`, `microNormale`), il
muschio solo sulle falde a nord. Corretto: `gN.z` (il giorno) era azzerato dalle manopole dell'ora. Il varco del primo piano pulito.
**I tasselli vanno ricotti** perché i cambi ai materiali arrivino sulle case (gli shader delle case sono scritti espansi nei tasselli).
