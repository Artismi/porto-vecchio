# Scenografo / production designer: il set

## 1. Diagnosi
- **Un solo materiale dall'alto.** Coppi (`roofTex1` 'coppi', toni `#a0603f`–`#b47852`, rappezzi `#c47a4e`–`#d08c5c` nel 13% delle zone), tegole `#b65a3e`, **e anche i terrazzi del borgo sono cotto**: `pianoCasa3` (tetti.js) dà 'pianelle' (`#86584a`–`#946652`) a tutti i piani E0/E2/E3. In più il passo finale scalda tutto. Con la camera quasi zenitale il tetto occupa il 50-60% dell'inquadratura: la città diventa un tappeto arancione. Le uniche pause sono le guaine e le lamiere, grigio-scure e sparse a caso (p1_marina).
- **Il suolo ha lo stesso valore dei muri.** Piazza `[184,172,152]` (render.js:3067), cioè `#b8ac98`, contro intonaci crema: dopo la gradazione calda sono la stessa sabbia (p5_corso). La carreggiata vive solo grazie alle ombre blu. Nessun salto di tinta tra caldo verticale e freddo orizzontale.
- **L'arredo è uniforme.** `CFG.marciapiede.max: 3` ogni 6 m vuol dire fino a mezzo oggetto al metro su tutte le vie: nessun vuoto, nessun nodo. Per questo la via non ha una direzione.
- **Gli errori di set** (muri orfani, case sul marciapiede, casetta in carreggiata) si leggono come bug: dall'alto ogni linea che non chiude un volume è rumore.

## 2. Proposte, in ordine di impatto

**A. Palette dei tetti (per superficie, città nuova)**
| famiglia | quota | colori base (sRGB) |
|---|---|---|
| ardesia di Lavagna | 30% | `#5e6572` `#666e7a` `#575e6a` `#6c7480`, spigolo `#7a828e` |
| coppi sbiaditi | 30% | `#a87f68` `#b08a72` `#9c7662` `#b8957c`; vecchi (v1) `#8e6e60` `#967a6a` `#84665a` |
| lastrici chiari (astrico, quadrotti) | 30% | `#d6cfc2` `#cbc4b6` `#c2bbae`, fughe `#a8a196` |
| tegole marsigliesi | 7% | `#a8664c` `#b0705a` `#9e5e48` |
| lamiera e guaina (porto, annessi) | 3% | `#8a8c88`, guaina alluminio `#8e8e8a` |

Dove:
- `MANTO3` diventa una scelta pesata con `h3`. E0: coppi 55%, ardesia 45%. E3: ardesia 65%, tegole 35%.
- In `pianoCasa3`, il manto 'pianelle' resta solo sul 25% dei terrazzi del borgo. Gli altri vanno in un nuovo 'astrico' (la tela 'cemento' con i colori sopra).
- `roofTex1`: i rappezzi vivi passano da `pz < .13` a `pz < .04`, col tono `#b9805c`.
- Tetto di saturazione per i manti: HSL S ≤ 35%. Cotto con L tra 45% e 58%.
- Regola di distribuzione: in ogni finestra di 40×40 m il cotto non supera il 55%. Le ardesie vanno a gruppi di 2-4 case (un isolato), non a macchie singole.

**B. Il suolo si stacca dai muri: salto di valore e di tinta**
- Regola: ΔL* ≥ 25 tra il muro e il suolo vicino. Il suolo resta più freddo e meno saturo (C* ≤ 8); il caldo sta in verticale.
- Carreggiata: `#55575c`. In `ASF` di pavimenti.js, misurato a schermo dopo la curva.
- Marciapiede: `colMarc35` da `#7c756a` a `#8a8780`. Cordolo `#d8d3c8`, la linea chiara che disegna il bordo.
- Piazze e lastricato: `T.PIAZZA` da `#b8ac98` a `#9e978b`, con giunti `#857e73`.
- Vicoli e basoli: `#76736d`, più scuri delle vie, per scendere nella gerarchia.
- Zoccolo di 40 cm al piede di ogni muro, `#6b655c`: separa il volume dal piano.
- Strisce e zebre: un solo bianco consumato, `#e6e2d8`.

**C. Gerarchia e ritmo dell'arredo**
- Tre ranghi:
  1. **asse**: Corso e Vittoria, il più chiaro e il più ordinato;
  2. **vie**;
  3. **vicoli**: scuri, stretti, vuoti.
- Le **mete** (piazze, chiesa, mercato, porto) sono le uniche zone dense.
- Arredo a **isole**: agli incroci, alle fermate, davanti alle botteghe aperte, nelle piazze. Tra un'isola e l'altra almeno il 70% della lunghezza di marciapiede resta libero.
- In `pulizia_rumore.js` `CFG`:
  - `marciapiede.max` = 1 sull'asse e sulle vie, 0 nei vicoli (eccetto i bidoni alla bocca);
  - `facciata.ogni` da 3.2 a 5.
- Limiti per tipo:
  - cabine telefoniche: solo in piazza o alla fermata, al più 1 per piazza, a ≥ 80 m l'una dall'altra;
  - panchine: solo in piazza e sul lungomare, a coppie, rivolte a una vista;
  - bidoni e cassonetti: a coppie, alla bocca dei vicoli, sul lato lontano dalla camera, a ≥ 40 m l'uno dall'altro.
- Lampioni a passo fisso (18 m) su un lato solo: è il ritmo che tira avanti.
- Ogni via finisce su una meta visibile: una facciata chiara, un albero, un'insegna. Nel campo del suolo l'asse è il più chiaro, la meta il punto più luminoso.

**D. Errori di set: regole misurabili e nuove voci del censimento**
- **Muro orfano.** Ogni muretto o recinto chiude su uno spigolo di casa, su un pilastro o su un cancello (estremi entro 0,3 m). Altrimenti lo si taglia al filo del lotto (`lotto4` contro `b.w`). In città è alto al più 1,2 m, con la copertina `#cfc8bc`.
- **Marciapiede-striscia.** Se tra la casa e il cordolo restano meno di 1,5 m, la casa arretra (world_cittanuova.js ~3223, il minimo passa da 1,25 a 1,5). Se non può arretrare, su quel lato il marciapiede si toglie (casa a filo con due paracarri). Mai una striscia sotto 1,2 m.
- **Casetta in via.** Nessun BLD, annesso, edicola o cabina dentro il corridoio carreggiata + marciapiede. Nessuno riduce un vicolo sotto i 2,4 m liberi. La verifica va in `test_strade_integre.js`.

## 3. Cosa chiedo agli altri cinque
- **Cineasta**: inquadratura con la via principale sulla diagonale e la meta nel terzo alto. Il personaggio guarda verso la parte vuota della via, non verso un muro.
- **Tecnico luci**: il sole caldo deve toccare soprattutto i muri. Il suolo prende il cielo freddo (hemi ground più neutro, verso `#8a8a86` invece di `#a08a60`). Le «ombre fredde» non devono diventare blu saturo (oggi il blu delle ombre è il colore dominante del suolo). Rinforzare l'ombra al piede dei muri.
- **Fotografo**: la curva non deve schiacciare i bianchi. I lastrici chiari e i cordoli sono le luci alte della scena: devono restare sotto il clip ma sopra i muri crema. La saturazione globale non deve riportare in arancio i coppi lavati.
- **Illustratore**: tre famiglie di intonaco ligure al massimo per quartiere (giallo Genova `#e3c58e`, rosa `#e3b3a0`, ocra `#d6a26c`, più il bianco delle cornici). Persiane solo verde `#3f5e46`. Il neon solo sulle mete.
- **Animatore**: la vita segue le isole. Gente, auto in sosta e scene stanno sui nodi e sulle mete; i tratti tra un nodo e l'altro restano percorsi, non palcoscenici.
