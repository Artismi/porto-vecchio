# Porto Vecchio — BIBBIA DELLO STILE E «fumetto graffiti» (progetto, da approvare)

Per chi lo deve scrivere senza indovinare. **Il riferimento eseguibile è il prototipo** `_immagini/fumetto2/progetto/prototipo.py` (con
`tavolozza.py`): ogni numero qui sotto è lì, nello stesso ordine. Le tavole (catture vere del gioco, il prototipo applicato fuori dal gioco):

- `_immagini/fumetto2/progetto/tavola_posti.jpg` — 5 posti: oggi (A) | D2 | **E bersaglio**
- `_immagini/fumetto2/progetto/tavola_ore.jpg` — 6 momenti, stesso posto (piazza): oggi | **E bersaglio**
- `_immagini/fumetto2/progetto/ritagli_1a1.jpg` — le trame a pixel veri (×2 senza filtro); `bersagli/*.png` a piena risoluzione
- `_immagini/fumetto2/progetto/tavolozza.jpg` — la tavolozza; `leggibilita.json` — le prove del §7

**Il principio.** Un solo look, `?stile=E`: l'immagine come una tavola stampata a mano (serigrafia/riso) di un fumetto graffiti.
**Una tavolozza unica** (20 inchiostri + 3 del gioco) ricca abbastanza da tenere i gradini di valore e le famiglie di tinta; **trame vere**
(tratteggio mosso, spray a macchie, grana) solo sulle cuciture fra due inchiostri e nelle ombre, mai puntini dappertutto; **inchiostro nero**
spesso e irregolare ma fermo; **un fondo disegnato** dietro ogni inquadratura; **sei momenti** come regia, non come fisica. Tutto in **un
passo unico** (quello che c'è) più piccoli ritocchi nei materiali. Le misure in px sono **a 540 righe** (la tela interna del profilo
leggero è 540–640 righe): si scalano con `altezza/540`.

---

## 1. La tavolozza unica

Un pixel sceglie **solo fra gli inchiostri della sua famiglia** (così un grigio non diventa mai ocra, un tetto mai viola). Carta e nero
stanno in tutte. Famiglie: **N** neutri, **C** caldi, **F** freddi, **V** verdi, **M** rosa-viola.

| nome | hex | L (Oklab) | famiglie | ruolo |
|---|---|---|---|---|
| carta | `#F2E7CF` | .93 | tutte | le luci, l'intonaco chiaro al sole, il bollino del personaggio, il fondale chiaro |
| osso | `#D2C2A6` | .82 | N C | pietra e lastrico al sole, intonaco neutro |
| sasso | `#A89C92` | .70 | N | pietra a mezza luce, lastrico in ombra chiara |
| lilla | `#A68FB6` | .68 | N M | il lastrico e le ombre della sera, l'ombra chiara |
| piombo | `#7C7186` | .57 | N | pietra in ombra, asfalto, ardesia |
| lavagna | `#3D3548` | .35 | N M | l'ombra fonda prima del nero |
| nero | `#16121B` | .19 | tutte | l'inchiostro: contorni, ombre piene, tratteggio |
| pesca | `#F0BE8C` | .83 | C | intonaco caldo al sole, pelle chiara |
| ocra | `#DC9A34` | .73 | C | muri ocra, la luce dorata, le finestre di notte |
| cotto | `#C25B36` | .59 | C | tetti, mattoni, muri rossi; la giacca del personaggio in ombra |
| mattone | `#6F2B2E` | .39 | C M | il cotto in ombra, l'ombra calda |
| cielo | `#A3D4D8` | .84 | F | cielo, acqua chiara, il fondale di giorno |
| acqua | `#2A8A8A` | .58 | F V | il mare vicino, il rame, la notte verde acqua |
| oltremare | `#2F60B5` | .50 | F | il mare, le persiane blu, l'ombra di mezzogiorno |
| notte | `#202D5E` | .31 | F V M | la notte, l'ombra fredda fonda |
| salvia | `#93B27C` | .73 | V | chiome al sole, insegne chiare |
| persiana | `#3F8A50` | .57 | V | persiane, chiome, insegne verdi |
| bosco | `#34532F` | .41 | V | chiome in ombra, il verde scuro |
| rosa | `#E04B8C` | .64 | M | graffiti, l'accento della sera |
| viola | `#6B3D9B` | .46 | M | graffiti, l'ombra del crepuscolo |

**Riservati al gioco** (il mondo non li prende mai: vietati per set, insegne, writing, vestiti delle comparse):

| nome | hex | solo per |
|---|---|---|
| vermiglio | `#F04A23` | il personaggio: la giacca alla luce (in ombra, valore < .10: cotto) |
| limone | `#FFE03A` | obiettivo, guida, cose da prendere (anello, fascio, rombo, tessera) |
| allarme | `#FF2E5E` | pericolo: ostili, armi puntate, danno, sirene |

### 1.1 La scelta dell'inchiostro (il cuore del passo)
1. Il colore finito del pixel (dopo luce, fondo, momento: §5–6) va in **Oklab** (sRGB linearizzato → LMS → radice cubica).
2. **Famiglia** dalla tinta h: C 15°–100°, V 100°–172°, F 172°–285°, M 285°–15°. **Soglia di colore** sul croma C: caldi .062, freddi .050,
   gli altri .030; nel fondo (6 → 12 m oltre il personaggio) la soglia scende di .025 (il fondale tiene la sua tinta). Sotto la soglia →
   neutri; fra soglia e soglia + .025 il pixel è «di colore» se smoothstep > .5 (il lastrico beige resta pietra, l'ardesia resta grigia).
3. Dentro la famiglia, i **due inchiostri più vicini** A e B con **Δ = 2·ΔL² + Δa² + Δb² + bias(inchiostro, momento)** (il valore pesa il
   doppio: i gradini di valore restano).
4. **r = √ΔA / (√ΔA + √ΔB)** ∈ [0, .5]. Il pixel è A, salvo dove la trama dice B: **B se T < base + guadagno · .5 · smoothstep(.30, .50, r)**
   (T = la soglia della trama del materiale, §3). Grandi campiture piene; la trama vive sulle cuciture fra due inchiostri.
5. **La cucitura neutro/colore**: dove il croma è a metà fra le due famiglie (peso w = .5 − |s − .5| > .3), l'inchiostro dell'altra famiglia
   passa con la stessa trama, copertura (w − .3)·2,5 · guadagno.
6. Famiglie da 6–8 inchiostri: il passo fa **≤ 16 distanze** per pixel (i neutri + la famiglia di tinta), non 20.

## 2. La gerarchia di valore (ogni inquadratura una vignetta)

| piano | dove | valori | contrasto | trama | inchiostro |
|---|---|---|---|---|---|
| **soggetto** | il personaggio | vermiglio (cotto sotto .10); **il bollino**: 3 px di carta attorno, fuori dal contorno (l'adesivo sul muro) | il bordo carta/nero = 15:1 sempre; il vermiglio è unico nel quadro | nessuna | pieno, 2 px (§4) |
| **obiettivo** | anello, fascio, rombo, tessera | limone pieno (+ nero) | unico nel quadro | nessuna | 1 px |
| **pericolo** | ostili, armi | allarme + nero | unico | nessuna | 2 px |
| **primo e medio piano** | fino a 6 m oltre il personaggio | tutta la tavolozza; **il nero solo qui** | pieno | sì (§3) | spesso (§4) |
| **fondo** | 6 → 12 m oltre il personaggio, e oltre | verso il fondale del momento, a 3 fasce | valore al 45%, colore al 50% | nessuna (campiture piatte) | sottile, del colore del fondale ×.45 |
| **fondale** | cielo e oltre 140 m | i colori del fondale e del cielo del momento | piatto | guadagno .4 | nessuno |

- **La luce sul soggetto**: valore × (1 + .07·(1 − smoothstep(.08, .40, r))) − .12·smoothstep(.50, 1.05, r), r = distanza dal personaggio
  in altezze di schermo: l'occhio entra dal centro, i bordi del quadro più quieti.
- **Il personaggio**: contrasto ×1.15 attorno a .45, +.05 (prima della tavolozza), poi la giacca forzata al vermiglio.
- **Le comparse**: tinte piatte dalla tavolozza, niente trama, contorno nero di 2 px; mai i riservati.
- **I mezzi e l'obiettivo**: campiture piatte, contorno di 1 px dal bordo della loro maschera.

## 3. Le trame (non puntini)

Ancorate al **mondo** sul piano della faccia (il punto `fp0` dalla profondità; la normale da `dFdx/dFdy(fp0)`; il piano: orizzontale se
|n.y| > .7 → (x, z), altrimenti (tangente orizzontale, y)): ferme camminando, niente «vetro sporco». T è uniforme in [0, 1].

| materiale | trama | misura nel mondo | sullo schermo | base | guadagno |
|---|---|---|---|---|---|
| **muri** | **spray**: T = .6·hash(cella) + .4·rumore di valore a macchie | puntini 3 cm (1,5 cm se il puntino supera 5 px), macchie 20 cm | 2–5 px | .03, + .04 nelle mezze luci (valore .75 → .45) | 1 |
| **suolo** | **tratteggio** a 30°, righe mosse a mano (rumore di 45 cm, ±.28 del passo) | passo 12 cm | 7–14 px (ottave) | 0 | .5 |
| **tetti** | **tratteggio** a −40° | passo 14 cm | 7–14 px (ottave) | .02 | 1 |
| **persone, mezzi, obiettivo** | nessuna | — | — | 0 | 0 |
| **il resto** e sotto la misura minima | righe a 45° sullo schermo, spostate col mondo | — | passo 6 px | 0 | 1 |
| **cielo e fondale** | grana di 1 px | — | — | 0 | .4 |
| **fondo** (6 → 12 m oltre il personaggio) | sparisce (base e guadagno × (1 − smoothstep(6, 12, m))) | — | — | — | — |

- **Le ottave del tratteggio**: se la riga supera 14 px il passo si dimezza (fino a 3 volte); le righe vecchie restano, se ne aggiungono in
  mezzo (la riga è la distanza dall'intero più vicino: le ottave si annidano). Il tratteggio non diventa mai una zebra vicino alla camera.
- **Lo spray** sotto 0,9 px di puntino ripiega sulle righe a 45° di schermo.
- **La carta**: fibra ±3% su tutto (hash di 1 px, fermo col mondo); l'inchiostro che non prende: 0,4% dei pixel di inchiostro chiaro (L > .4),
  mai sul nero né sulle persone, diventa carta.
- **Fuori registro**: la lastra del colore (tutto tranne il nero) spostata di **1 px a 540 righe in basso a destra**, costante; il nero a
  registro. Si vede come un orlo colorato fuori dal contorno.
- **Lo spostamento col mondo delle trame di schermo** (righe a 45°, grana, fibra): un punto del suolo vicino al personaggio, la sua
  posizione sullo schermo da un fotogramma all'altro sposta il retino (le fasi in [0,1) calcolate in JS: già scritto nel ramo, `stileE`).

## 4. L'inchiostro

| tratto | dove | spessore (px a 540 righe) | colore | note |
|---|---|---|---|---|
| **sagoma** | salto relativo di profondità > .032 verso un vicino | **R = 1,6 + 1,8·(1 − smoothstep(6, 30, m)) + 1,3·smoothstep(.1, .4, salto)**, al massimo 3,2 (m = metri oltre il personaggio) | nero; da 12 m verso il fondale ×.45 (pieno a 45 m) | si stende verso la cosa davanti; restano le regole di D (il fondo dura 3 px, i buchi del retino della camera) |
| **la mano** | lungo ogni sagoma | R × (1 + .38·onda), onda = sin(3,1x + 2,3y − 2,7z)·sin(−2,2x + 3,7y + 2,9z + 1,3) sul punto nel mondo (~1–1,5 m) | — | ferma nel mondo: **niente «boil»** |
| **la pennellata che scarica** | sagome del set fra 3 m davanti e 12 m dietro il personaggio | dove l'onda < −.82 (≈10% della lunghezza) il tratto al 20% | — | mai sulle persone |
| **piega** | normale che gira oltre ~44° (cos < .72), superficie continua (salto < .02), non fra due facce orizzontali | 1 | nero al 70% | fino a 25 m oltre il personaggio, oltre 4 m dalla camera |
| **persone** | il bordo della loro maschera (categoria 4) | 2 | nero pieno | |
| **nero pieno** | valore del colore finito < **.10** | — | nero | solo primo/medio piano, mai sulle persone |
| **tratteggio nero** | valore fra **.20 e .10** | righe di 5 cm nel piano (suolo 30° + incrocio −50°; muri 68° + incrocio 158°; il resto righe a 45° di schermo, passo 4,5 px), copertura .45·smoothstep(.20, .10, valore) | nero | l'ombra fonda disegnata |

## 5. I sei momenti (regia, non fisica)

La tavolozza è sempre quella. Ogni momento sceglie un **bilanciamento** (wb, moltiplica il colore della scena: è la luce dei materiali, vedi
l'ultima colonna), un **viraggio** (ombre × sh, luci × hi, interpolati sul valore .30 → .78, **pieno sui grigi e al 25% sulle cose colorate**:
la tinta delle cose resta), saturazione e contrasto, **quanto pesa ogni inchiostro** (bias), il **fondale** (vicino → lontano) e il **cielo**.
Fra due momenti tutto si fonde (smoothstep) sull'ora: notte 0–5, mattino 8:10, mezzogiorno 12:30, pomeriggio 16, oro 18:35, crepuscolo
19:55, notte 22:30–24.

| momento | umore | wb | sh / hi | sat / contr. | bias (Oklab², negativo = vince) | fondale (forza) | cielo: alto, mezzo, orizzonte; colline | luce nei materiali (proposta) |
|---|---|---|---|---|---|---|---|---|
| **mattino** | fresco e acquoso, ombre verde acqua | .98 1 1.03 | .88 1 1.03 / 1.04 1 .95 | 1.08 / 1.06 | acqua −.004, cielo −.002, pesca −.0015, lilla +.003, mattone +.002, viola +.004, rosa +.003 | cielo → carta (.60) | oltremare, cielo, carta; acqua | sole `#ffe0b0` ×1.4, cielo `#9ccfe0` |
| **mezzogiorno** | luce piena e dura, ombre blu oltremare taglienti | .95 .98 1.07 | .86 .92 1.2 / 1.03 1.01 .95 | 1.10 / 1.16 | oltremare −.004, carta −.003, osso −.002, lilla +.003, lavagna +.002, viola +.004, rosa +.002 | osso → carta (.55) | oltremare, cielo, carta; acqua | `#fff0d8` ×1.5, `#b4cdea` |
| **pomeriggio** | caldo ocra, ombre lunghe e blu | .97 .99 1.04 | .88 .9 1.15 / 1.04 1 .93 | 1.10 / 1.12 | ocra −.004, cotto −.003, oltremare −.003, lilla +.003, viola +.003 | pesca → carta (.55) | oltremare, cielo, pesca; acqua | `#ffcc86` ×1.46, `#b0c4ea` |
| **oro** | tutto arancio, ombre viola (non realistico, voluto) | 1.02 .99 .95 | .96 .9 1.08 / 1.1 1 .84 | 1.00 / 1.10 | ocra −.006, cotto −.004, lilla −.003, mattone −.003, viola −.001, rosa +.003, cielo +.006, acqua +.004 | ocra → pesca (.50) | viola, rosa, ocra; mattone | `#ff9a50` ×1.3, `#a86ac0` |
| **crepuscolo** | magenta e viola, le finestre arancio | 1 .97 1.02 | .95 .84 1.14 / 1.06 .98 .9 | 1.00 / 1.10 | lilla −.004, viola −.003, notte −.003, ocra −.002, rosa +.002, cielo +.008, osso +.004, acqua +.004 | viola → rosa (.55) | notte, viola, rosa; lavagna | `#ff7a5a` ×1.1, `#8a52c0` |
| **notte** | verde acqua e nero, pozze calde dei lampioni | 1 1 1 | .78 1 1.04 / 1.12 1 .8 | 1.25 / 1.06 | notte −.005, acqua −.003, lavagna −.003, ocra −.003, cielo +.004, pesca +.003, osso +.004, rosa +.002 | notte → acqua (.40) | nero, notte, acqua; nero | luna `#6ad0d0` ×.34, `#1e5a6e`; finestre e lampioni restano caldi |

Libertà: i momenti **non devono essere coerenti fra loro** né realistici; devono passare il §7.

## 6. Composizione, fondo e fondale

- **Il fondo**: oltre 4 m dietro il personaggio q = 1 − e^(−(m − 4)/10); **3 fasce piatte** (floor(3q)/3, bordo di 1 px con `fwidth`) che
  pesano **.56, .89, 1** × la forza del momento; il colore va dal fondale vicino al lontano: valore al 45%, colore al 50%. Le persone non
  entrano. Separa i piani: primo pieno e tratteggiato, fondo piatto, chiaro e colorato. **Nessun quadro finisce in grigio.**
- **Il fondale disegnato** (cielo e oltre 140 m): fasce per **elevazione** del raggio (> 14° alto, 5°–14° mezzo, < 5° orizzonte), **colline**
  come sagoma piatta per **azimut**: elevazione < 1,2° + 1,6°·sin(3az + .7)·sin(5az + 2,1) + .8°·sin(11az). Il mare lontano prende la fascia
  dell'orizzonte. Con la camera7 il cielo entra raramente (sul lungomare il mare lontano fa da fondale): il lavoro vero lo fanno le fasce del fondo.
- **Ogni inquadratura contiene**: il personaggio col bollino; il piano su cui sta; almeno un piano verticale (muro) per la scala; un fondo
  (facciate lontane, mare) in fasce. Le grandi cose davanti alla camera (chiome, ombrelloni, tetti a 3 m) sono **quinte**: scure, tratteggiate,
  contornate (il prototipo le lascia così; vedi §9).

## 7. Le prove di leggibilità (ogni momento)

| cosa | prova | soglia | sui bersagli (`leggibilita.json`) |
|---|---|---|---|
| personaggio | bordo carta/nero | ≥ 4,5:1 | 15:1 in tutti e 11 |
| personaggio | vermiglio fuori dalla sua sagoma | 0 pixel | 0 in tutti |
| personaggio | riempimento contro la corona (mediane) | ≥ 1,5:1 o il bollino | 3,9–14,5:1; piazza 13h ravvicinata 1,1:1 (lì lo stacca solo il bollino) |
| obiettivo | limone solo sull'obiettivo | unico | (nessun obiettivo acceso nelle catture: la prova va rifatta in gioco) |
| mezzi | contorno continuo | ≥ 1 px | — (nessun mezzo nelle catture) |
| fondo | niente nero né trama oltre 12 m | — | sì per costruzione |

## 8. Dove sta nel passo unico, e quanto costa (Iris Xe, 1137×640 = 0,73 Mpx)

| pezzo | serve | letture in più | calcolo/pixel | stima |
|---|---|---|---|---|
| bilanciamento, viraggio sui grigi, luce sul soggetto | colore, `fP` | 0 | ~30 (un Oklab per il croma) | — |
| fondo a fasce, fondale | profondità e raggio (`fp0` c'è) | 0 | ~20; ~40 solo sul fondale | — |
| tavolozza a famiglie | colore; **40 uniform vec4** (5 famiglie × 8: Oklab + bias, dal JS a ogni cambio di momento) | 0 | ~170 (Oklab, ≤ 16 distanze, 2 minimi, ritorno in sRGB di A e B) | ~0,10–0,15 ms |
| trame nel mondo | `fp0`, normale da `dFdx/dFdy` | 0 | ~90 (hash, rumore di valore a 4 hash, 2 tratteggi con ottave) | ~0,05 ms |
| nero pieno e tratteggio nero | valore, piano | 0 | ~25 | — |
| inchiostro a mano | le 4 + 4 letture di D2 (ci sono), raggio variabile | 0 | ~15 | — |
| fuori registro | **1 lettura del colore** a 1 px (in cache) | **+1** | ~5 | ~0,03 ms |
| bollino del personaggio, contorno persone/mezzi | le 8 letture della categoria del Sobel di `CAT` (ci sono), raggio 3 px | 0 | ~15 | — |
| **la categoria** | **ritocco nei materiali**: l'alfa scrive 4 anche per il pupazzo senza scheletro (oggi le persone finiscono «muro»), 5·1 i mezzi, 5·2 l'obiettivo, 5·3 il personaggio (una uniform per gruppo, `sgCat`) | 0 | 0 | — |
| **totale** | | **+1 lettura** | **~400 operazioni** | **~0,3 ms su Iris Xe**; ~1–1,5 ms su un telefono medio |

**E-lite per i telefoni** (lo stesso `?stile=E` col profilo leggero o `PHONE`): trame solo di schermo (righe a 45° e grana, niente piano nel
mondo), niente fuori registro, tratteggio nero a righe di schermo: ~200 operazioni, 0 letture in più. Senza `?stile` niente cambia (tutto
dentro `#ifdef SG_STILE`; nei materiali i rami restano spenti da `sgP10` a zero, come D).

**Nei materiali** (già nel ramo `fumetto2`): le celle a tre toni col bordo a `fwidth` (`sgP10.z`); la luce a spray solo sulle cose curve
(`sgP10.w < 0`); niente retino di D nei materiali; la categoria estesa (sopra); la luce dei momenti (§5, ultima colonna).

## 9. Cosa resta aperto (da decidere guardando)

- **Le catture hanno la luce di D1** (sole caldo, celle): il prototipo corregge col bilanciamento wb. Nel gioco la leva vera è la luce dei
  momenti nei materiali (§5): va regolata insieme al passo, non solo con wb.
- **Le quinte vicine alla camera** (la chioma sul lungomare, gli ombrelloni, i tetti del kit nel vicolo) restano masse scure tratteggiate: è
  una scelta di inquadratura (cinema), ma la chioma «a retino» della camera7 sporca l'inchiostro come in D.
- **La notte** è la più rischiosa: le pozze dei lampioni diventano grandi campiture ocra/pesca, il resto verde acqua e nero; leggibile, ma
  più «rumorosa» degli altri momenti. Si può calmare con meno peso sull'acqua.
- **Il tremolio** non è misurabile sul prototipo (un fotogramma): le trame sono nel mondo, l'inchiostro ha l'onda nel mondo, niente nel tempo;
  va misurato in gioco con la sonda del mezzo pixel di D.
- **La tavolozza** ha 20 inchiostri del mondo (il committente: «con 2-3 tinte si appiattisce tutto»): si può asciugare a 16 togliendo sasso,
  bosco, lilla, salvia, a costo di più cuciture a trama sui grigi e sulle chiome.

## 10. Come si rifà

```
cd v7 && python3 build.py                                   # (la sonda usa R.__rt e R.__dyn, esportati solo per le sonde)
cd _immagini/fumetto2/sonde && node cattura.js tutto        # ~70 min in SwiftShader: f/ (A, D2, D1 finiti), g/ (colore, distanza, categoria, maschere)
cd ../progetto && python3 tavole.py && python3 leggibilita.py   # le tavole, i ritagli, i bersagli, le prove
python3 prototipo.py posto_piazza 18.6 /tmp/x.png           # un posto a un'ora qualsiasi (le manopole: MOMENTI e i numeri in stile())
```
Le catture (f/, g/, ~50 MB) non sono nel repo: si rifanno con `cattura.js`.
