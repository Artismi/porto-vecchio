# Porto Vecchio — BIBBIA DELLO STILE E «fumetto graffiti» (progetto, seconda versione, da approvare)

Per chi lo deve scrivere senza indovinare. **Il riferimento eseguibile è** `_immagini/fumetto2/progetto/prototipo2.py` (con `tavolozza.py` e i
momenti di `prototipo.py`): ogni numero qui sotto è lì. La prima versione (`prototipo.py`) è stata respinta: «si brucia, si sgrana, si
sgretola e perde di qualità», e sui muri vicini il retino diventava «pois grossi». Questa versione toglie le cause (§0).

Le tavole (catture vere del gioco, il prototipo applicato fuori dal gioco; il bersaglio è disegnato a 1080 righe):
- `_immagini/fumetto2/progetto/tavola_posti.jpg` — 5 posti: oggi (A) | E prima (respinto) | **E nuovo**
- `_immagini/fumetto2/progetto/tavola_ore.jpg` — 6 momenti, stesso posto (piazza): oggi | **E nuovo**
- `_immagini/fumetto2/progetto/ritagli_1a1.png` — ritagli a 1:1 VERI a 1080 (con la prova del muro a 1,3 m dalla camera)
- `_immagini/fumetto2/progetto/intero_1080_piazza.png`, `intero_1080_sera.png` — due fotogrammi interi a 1080
- `bersagli2/*.png|jpg` — tutti i bersagli a 1080; `misure2.json` — alte frequenze contro A, quota della luce più alta

## 0. La qualità prima di tutto (le regole che vincono su tutto il resto)

1. **Niente sotto i 3 px che sia casuale.** Fuori: la fibra della carta, l'inchiostro che non prende, il fuori registro, lo spray a puntini,
   il retino a punti. Nessuna trama a punti tondi, a nessuna distanza.
2. **Ogni bordo è antialiasato** e liscio: il confine fra due inchiostri (§1.1), la riga del tratteggio (§3), l'inchiostro (§4), il nero pieno.
   Nel passo: `fwidth` della grandezza che fa il bordo, larghezza di transizione ~1 px. Niente gradini, niente bordi masticati.
3. **Campiture grandi e calme.** L'inchiostro si sceglie sul colore della superficie **lisciato** (§1.1), mai sul pixel: niente mimetica.
4. **Le luci respirano.** La scala sopra .70 di valore si comprime (×.70): le luci tengono 2–3 inchiostri (osso, pesca, carta); la carta solo
   per le luci vere. Misura: la quota dell'inchiostro più chiaro ≤ 15% del quadro (sui bersagli §7: ≤ 0,6% in 9 su 11, crepuscolo 10,6%, ora d'oro 28,5%).
5. **Le trame hanno una misura sullo schermo limitata nei due versi**: ancorate al mondo per stare ferme, ma con le ottave (si aggiungono
   righe in mezzo quando si allargano, svaniscono quando si stringono) il passo resta fra 16 e 32 px, la riga 2–5 px, a qualunque
   distanza, anche con un muro a 1,3 m dalla camera.
6. **Non più rumoroso di oggi.** Le alte frequenze (varianza del laplaciano a 960×540) di E nuovo stanno nella forchetta di A (§7).

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
1. **La superficie calma** (nei materiali, non nel passo): niente velature (`varia` 0), niente micro-normale, la tela di facciate e lastrico
   con `bias` +1,5 di mipmap (le macchie larghe della tela spariscono, i giunti restano), le celle a tre toni di D. Il prototipo lo imita sulla
   cattura con una diffusione a più scale (2–32 px) che resta sulla stessa superficie (normale entro 14°, profondità continua, ΔOklab < .035).
2. **Il colore che sceglie**, nel passo: la media del pixel e di **12 letture filtrate** a 2 e 4 px (a 540 righe), ognuna scartata se è
   un'altra cosa (profondità oltre il 3%, un'altra categoria); dove il pixel stacca forte dalla media (|Δvalore| > .22, largo almeno 2 px: una
   lettera, un'insegna) vale il pixel, se largo almeno 3×3 px a 540 (i rivetti di una saracinesca no: diventerebbero pois). Il valore
   sopra .70 compresso (§0.4).
3. **Famiglia** dalla tinta Oklab h: C 15°–100°, V 100°–172°, F 172°–285°, M 285°–15°; soglia di croma caldi .075, freddi .050, gli altri .030
   (−.025 nel fondo). Sotto: i neutri. Il passaggio neutro/colore è un bordo antialiasato (come al punto 5), non una cucitura a trama.
4. **I due inchiostri più vicini** A, B con **Δ = 2·ΔL² + .4·(Δa² + Δb²) + bias(inchiostro, momento)**: il valore conta 5 volte la tinta (la
   tinta l'ha già scelta la famiglia; così una superficie di un colore solo resta di un inchiostro solo). Bias fissi in più: carta +.006 (solo
   luci vere), rosa +.005 e vietato sotto croma .11, oltremare vietato sotto croma .07, ocra mai sotto −.0015.
5. **Il confine A/B**: r = √ΔA/(√ΔA + √ΔB) va a .5 sul confine da tutte e due le parti; la distanza in px dal confine è (.5 − r)/fwidth(r);
   il peso di B sale da 0 a .5 nell'ultimo 1,2 px. **Netto, liscio, mai a puntini.** Nessuna trama sulle cuciture.
6. Con famiglie da 6–8 inchiostri: ≤ 16 distanze per pixel.


## 2. La gerarchia di valore (ogni inquadratura una vignetta)

| piano | dove | valori | contrasto | trama | inchiostro |
|---|---|---|---|---|---|
| **soggetto** | il personaggio | vermiglio (cotto sotto .10); **il bollino**: anello di carta fino a 5 px fuori dal contorno | il bordo carta/nero = 15:1; il vermiglio è unico nel quadro | nessuna | 3,2 px (§4) |
| **obiettivo** | anello, fascio, rombo, tessera | limone pieno (+ nero) | unico nel quadro | nessuna | 2,2 px |
| **pericolo** | ostili, armi | allarme + nero | unico | nessuna | 3,2 px |
| **primo e medio piano** | fino a 6 m oltre il personaggio | tutta la tavolozza; **il nero solo qui** | pieno | tratteggio solo in ombra (§3) | 1,8–5 px (§4) |
| **fondo** | 6 → 12 m oltre il personaggio, e oltre | verso il fondale del momento, a 3 fasce | valore al 45%, colore al 50% | nessuna | sottile, del colore del fondale ×.45 |
| **fondale** | cielo e oltre 140 m | i colori del fondale e del cielo del momento | piatto | nessuna | nessuno |

- **I bordi del quadro più quieti**: valore × (1 − .12·smoothstep(.50, 1.05, r)), r = distanza dal personaggio in altezze di schermo. (La luce
  aggiunta al centro della prima versione è tolta: bruciava.)
- **Il margine nelle luci** (§0.4): sopra .70 il valore si comprime ×.70 e la tinta resta (si comprime il valore, non il colore).
- **Il personaggio**: contrasto ×1.15 attorno a .45, poi la giacca forzata al vermiglio.
- **Le comparse**: tinte piatte, niente trama, contorno 3,2 px; mai i riservati.

## 3. Le trame (solo in ombra, solo righe)

**Una trama sola: il tratteggio**, ancorato al piano della faccia come il retino di D: l'asse dominante della normale (lisciata sulla stessa
superficie) sceglie le coordinate (x,z), (z,y) o (x,y) del punto `fp0`, meno l'origine del blocco (niente numeri grandi). Mai una tangente
calcolata dalla normale: col rumore della normale le righe girerebbero. Righe di **10 cm** nel mondo, mosse appena a mano (rumore di 60 cm, ±.12
del passo), **antialiasate**: la riga è la distanza in px dal suo centro (|x − round(x)| / fwidth(x)), bordo di 1 px.

| dove | angolo nel piano | da valore | larghezza della riga (px a 1080) | incrocio |
|---|---|---|---|---|
| suolo | 30° | < .42 (pieno da .30) | da 2 (a .42) a 2 + .13·passo (a .20) | +90°, sotto .24 (pieno da .14) |
| muri | 68° | idem | idem | idem |
| tetti | −40° | idem | idem | idem |
| il resto | 45° | idem | idem | idem |
| luci (valore > .42), persone, mezzi, obiettivo, fondo (oltre 6–12 m), il retino della camera | **nessuna** | | | |

- **La misura sullo schermo è limitata nei due versi** (la regola contro i «pois grossi»): il passo in px si misura con `fwidth` della
  coordinata della riga; se supera **32 px** il passo nel mondo si dimezza (fino a 4 volte, le righe vecchie restano e se ne aggiungono in
  mezzo); se scende sotto **16 px** le righe svaniscono (pieno a 16, zero a 12): mai moiré, mai zebra, mai bolle. Prova: `muro_vicino` (camera
  a 1,3 m da un muro in ombra, ritagli).
- **La riga è sovrastampa**: nero al 50% sopra l'inchiostro dell'ombra (l'ombra resta blu, viola, cotto: più fonda sulla riga).
- **Niente spray, niente grana, niente fibra, niente fuori registro** (§0.1). La «mano» del graffito la portano i graffiti veri del gioco
  (writing, insegne), l'inchiostro e il tratteggio.

## 4. L'inchiostro

Un **campo di distanza** (non una maschera): per ogni pixel di bordo il suo semispessore R; un pixel è inchiostro se la sua distanza vera
(sotto-pixel) dal centro di un pixel di bordo vicino è < R, soglia antialiasata ±.6 px. Spessore costante, contorno liscio, niente vuoti.
Il passo gira alla risoluzione interna: la posizione del bordo a sotto-pixel la dà il peso di copertura MSAA di [hd] (come il filo di D).

| tratto | dove | semispessore R (px a 1080) | colore |
|---|---|---|---|
| **sagoma** | salto relativo di profondità > .032 a 1 px o > .06 a 2 px (verso la cosa davanti) | **1,8 + 2,2·(1 − smoothstep(6, 30, m)) + 1,2·smoothstep(.1, .4, salto)**, × (1 + .15·onda) | nero; da 12 m verso il fondale ×.45 (pieno a 45 m) |
| **persone** | il bordo della maschera | 3,2 | nero |
| **mezzi, obiettivo** | il bordo della maschera | 2,2 | nero |
| **piega** | (fuori in questa versione: sulla distanza al cm della cattura faceva trattini; da riprovare nel passo vero, 1,1 px al 70%) | — | — |
| **nero pieno** | valore del colore lisciato < .10 (bordo antialiasato .085–.115) | — | nero |

- **L'onda** (la mano): sin(1,3x + .9y − 1,1z)·sin(−.8x + 1,5y + 1,2z + 1,3) sul punto nel mondo, periodo ~3 m, ±15%: un'assottigliatura lenta,
  **mai un vuoto**, ferma nel mondo.
- **Mai inchiostro** sul retino della camera (un pixel col fondo da due parti opposte a 1 o 2 px; più di metà dei pixel 5×5 con un salto),
  sui trattini corti (meno di 5 px di bordo in un 7×7), sul cielo e oltre 140 m.
- **Il bollino** del personaggio: un anello di carta fino a 5 px fuori dalla sua sagoma, antialiasato, sotto il contorno nero.

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
  entrano. Separa i piani: primo pieno e contornato, fondo piatto, chiaro e colorato. **Nessun quadro finisce in grigio.**
- **Il fondale disegnato** (cielo e oltre 140 m): fasce per **elevazione** del raggio (> 14° alto, 5°–14° mezzo, < 5° orizzonte), **colline**
  come sagoma piatta per **azimut**: elevazione < 1,2° + 1,6°·sin(3az + .7)·sin(5az + 2,1) + .8°·sin(11az). Il mare lontano prende la fascia
  dell'orizzonte. Con la camera7 il cielo entra raramente (sul lungomare il mare lontano fa da fondale): il lavoro vero lo fanno le fasce del fondo.
- **Ogni inquadratura contiene**: il personaggio col bollino; il piano su cui sta; almeno un piano verticale (muro) per la scala; un fondo
  (facciate lontane, mare) in fasce. Le grandi cose davanti alla camera (chiome, ombrelloni, tetti a 3 m) sono **quinte**: campiture scure e
  contornate (le chiome aperte dalla camera: un velo piatto, §9).

## 7. Le misure e le prove (sui bersagli, `misure2.json`, `leggibilita.json` della prima versione per il personaggio)

**Alte frequenze** (varianza del laplaciano della luminanza a 960×540: quanto «frigge» l'immagine) e **rumore** (mediana su blocchi di 16 px
del dettaglio sotto 1,2 px):

| scena | A (oggi) | E prima (respinto) | **E nuovo** | rumore A → E nuovo | luce più alta (quota) |
|---|---:|---:|---:|---|---|
| vicolo | 862 | 6704 | **1044** | 5.50 → 6.48 | carta 0.5% |
| sbocco | 883 | 6054 | **797** | 2.21 → 3.80 | carta 0.6% |
| lungomare | 3608 | 15938 | **932** | 4.00 → 2.79 | carta 0.4% |
| piazza | 409 | 4106 | **822** | 0.86 → 0.00 | cielo 0.0% |
| sera | 411 | 4619 | **647** | 2.27 → 3.03 | pesca 4.7% |
| ora: mattino | 807 | — | **1074** | 4.71 → 4.91 | carta 0.0% |
| ora: mezzogiorno | 602 | — | **902** | 3.21 → 1.88 | carta 0.4% |
| ora: pomeriggio | 618 | — | **866** | 3.56 → 2.90 | carta 0.1% |
| ora: oro | 542 | — | **922** | 3.03 → 3.85 | pesca 28.5% |
| ora: crepuscolo | 452 | — | **638** | 3.02 → 2.26 | pesca 10.6% |
| ora: notte | 575 | — | **616** | 3.65 → 3.18 | carta 0.1% |

- E nuovo ha **5–17 volte meno alte frequenze di E prima** e sta **nella forchetta di A**: sotto A sul lungomare (−74%: la chioma a
  retino diventa un velo) e nello sbocco (−10%), sopra fino a ×1,2–2 negli altri (piazza 13h ×2: sono i contorni neri spessi su un quadro
  che in A è quasi senza bordi; bordi veri, non grana). Il «rumore» sotto 1,2 px resta quello di A (da −2,1 a +1,6 punti).
- **La luce più alta in uso** (la quota dell'inchiostro più chiaro presente): ≤ 0,6% in 9 bersagli su 11 (la carta solo per le luci vere);
  crepuscolo pesca 10,6%; ora d'oro pesca 28,5% (il momento è tutto arancio: pesca non è l'inchiostro più chiaro della tavolozza, la carta
  resta libera per le luci, ma la regola del 15% lì è superata: da decidere guardando).
- Il personaggio: bordo carta/nero 15:1, vermiglio unico (come la prima versione). Obiettivo e mezzi: nessuno nelle catture, da provare in gioco.
- **Prova del muro vicino** (`muro_vicino`, `muro_vicino_ombra`: camera a 1,3 m da una facciata della piazza): al sole campitura piena coi
  giunti; in ombra il tratteggio a ~16–32 px di passo e 2–4 px di riga, nessun punto né bolla.

## 8. Dove sta nel passo unico, e quanto costa (Iris Xe, 1137×640 = 0,73 Mpx)

| pezzo | serve | letture in più | calcolo/pixel | stima |
|---|---|---|---|---|
| la superficie calma | **nei materiali**: `varia` 0, tela con bias di mipmap +1,5 (facciate, lastrico), celle di D | 0 | ≈ 0 (meno di oggi) | — |
| bilanciamento, viraggio, margine nelle luci | colore | 0 | ~30 | — |
| il colore che sceglie (§1.1.2) | **12 letture filtrate del colore** a 2 e 4 px; le profondità a 1 e 2 px ci sono già (le 8 di D2), quelle a 4 px **+4** | **+12 colore, +4 profondità** (in cache: vicine) | ~60 | ~0,15 ms |
| fondo a fasce, fondale | profondità, raggio | 0 | ~20 (~40 sul fondale) | — |
| tavolozza a famiglie + confine antialiasato | 40 uniform vec4 (5 famiglie × 8: Oklab + bias) | 0 | ~170 (Oklab, ≤ 16 distanze, 2 minimi, `fwidth(r)`) | ~0,1 ms |
| tratteggio in ombra | `fp0`, normale da `dFdx/dFdy` (lisciata: le 4 letture a 2 px), 2 famiglie di righe con ottave | 0 | ~50 | ~0,03 ms |
| nero pieno | valore | 0 | ~5 | — |
| inchiostro | le 8 letture di D2; il semispessore variabile; copertura MSAA di [hd] per il sotto-pixel | 0 | ~25 | — |
| bollino, contorno persone/mezzi/obiettivo | le 8 letture della categoria di `CAT` | 0 | ~15 | — |
| **la categoria** | **ritocco nei materiali**: l'alfa scrive 4 per il pupazzo senza scheletro (oggi le persone finiscono «muro»), mezzi, obiettivo, personaggio | 0 | 0 | — |
| **tolti** rispetto alla prima versione | fuori registro (1 lettura), spray, grana, fibra, inchiostro che non prende, retino | −1 | −60 | — |
| **totale** | | **+16 letture** (12 colore + 4 profondità, tutte entro 4 px) | **~380 operazioni** | **~0,35–0,45 ms su Iris Xe** |

**E-lite** (telefoni, profilo leggero): il colore che sceglie con 4 letture invece di 12 (solo a 2 px), il tratteggio solo da valore < .30:
+4 letture, ~250 operazioni. Senza `?stile` niente cambia (tutto dentro `#ifdef SG_STILE`; nei materiali i rami restano spenti da `sgP10`).

**Il passo gira alla risoluzione interna** (540–640 righe nel leggero, poi ingrandito): i bordi devono essere continui per non fare gradini da
2 px sullo schermo. Il prototipo lo mostra: il colore che sceglie è filtrato (letture bilineari), il confine A/B e l'inchiostro sono soglie
antialiasate su grandezze continue (`fwidth`), l'inchiostro usa il peso di copertura MSAA di [hd]. Niente maschere binarie.

## 9. Cosa resta aperto (da decidere guardando)

- **La superficie calma va nei materiali**: il prototipo la imita con una diffusione sulla cattura (non fattibile nel passo). Se i materiali
  restano come oggi, la scelta dell'inchiostro (anche lisciata a 4 px) farà macchie dove la tela ha macchie grandi: è il primo pezzo da fare.
- **Il retino della camera7** (le chiome che si aprono a scacchi): E lo disegna come velo piatto senza inchiostro; la cura vera è una
  dissolvenza della camera (codice della camera).
- **Le pieghe** (spigoli interni) sono fuori in questa versione: sulla distanza al cm della cattura facevano trattini. Da riprovare nel passo vero.
- **Le catture hanno la luce di D1**: il bilanciamento wb corregge; nel gioco la leva è la luce dei momenti nei materiali (§5).
- **L'ora d'oro** è quasi tutta pesca e ocra: voluta, ma è il momento meno vario.
- **Il tremolio** va misurato in gioco (sonda del mezzo pixel di D): le righe sono nel mondo con ottave, l'inchiostro ha l'onda nel mondo.
- **La tavolozza** resta di 20 inchiostri: con le regole nuove (campiture grandi) si può asciugare a 16 (via sasso, bosco, lilla, salvia) se
  il committente la vuole più grafica.

## 10. Come si rifà

```
cd v7 && python3 build.py                                   # (le sonde usano R.__rt e R.__dyn, esportati solo per le sonde)
cd _immagini/fumetto2/sonde && node cattura.js tutto        # ~70 min in SwiftShader: f/ (A, D2, D1 finiti), g/ (colore, distanza, categoria, maschere)
node cattura_muro.js                                        # la prova del muro a 1,3 m
cd ../progetto && python3 tavole2.py                        # le tavole, i ritagli 1:1, i due interi a 1080, misure2.json (~10 min)
python3 prototipo2.py posto_piazza 18.6 /tmp/x.png          # un posto a un'ora qualsiasi
```
Le catture (f/, g/, ~55 MB) non sono nel repo: si rifanno con `cattura.js` e `cattura_muro.js`.
