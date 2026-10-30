# Scenografo: il set della strada

Foto viste: `21_varco_rua`, `10_corso`, `07_vittoria`, `02_vicolo` (le due di sera e di notte non c'erano ancora).

## 1. Cosa c'è di buono e va protetto
- **Gli accenti primari sulle cose di strada.** L'autobus giallo e la casa verde-rosa da Vice City (10), le sdraio blu e rosse e il bucato sui terrazzi (07).
- **Gli intonaci liguri pastello e le persiane verde Genova** (`EPOCHE.E0`/`E2`): sono il fondo caldo su cui il colore si accende.
- **Il suolo freddo sotto i muri caldi**: le ombre cobalto staccano il suolo.
- **Il regista delle pagine** (`scena.js`, `CATALOGO`): è già lo strumento per dire dove va il colore.

## 2. I difetti
- **Nelle quattro foto non c'è nessun segno di mano**: né tag, né throw-up, né manifesti leggibili, né saracinesche dipinte. La città sembra appena consegnata.
  - La voce `tag` è dominante solo in `cemento_taggato` (E6) e nel borgo non compare.
  - I manifesti escono con probabilità `pq` da .08 a .3; le tag con `nt` ≤ 1 a .25.
- **I segni dicono Grande Fratello.**
  - In `mvPoster` 4 manifesti su 6 sono del regime (BANDO, SCOMPARSO, RAZIONI, TI ASCOLTA).
  - Le bandiere portano l'occhio.
  - C'è una telecamera su ogni incrocio con semaforo (`camPts` + `J.signal`).
  - I murales sono in terre seppia (`#b8643a #2f4a3a`) con il velo del sale a .18: sembrano un memoriale, non una jam.
- **La saracinesca abbassata non esiste.** Di ogni serranda ci sono solo il rullo e le guide (`K2 = 'serranda'`), mai il telo. Eppure nel 1986 è la tela del writing.
- **Tetti piani grandi e muti.**
  - Prendono il 35-40% del quadro (10, la lamiera grigia; 02, il lastrico chiaro) e coprono il personaggio, che diventa una sagoma arancio (21, 02).
  - Le macchie tonde AAA (`sgP6.x`) sembrano muffe (07); i terrazzi in mattoni sembrano assiti di legno (21, 02).
- **Una strada da catalogo.**
  - La Vittoria (07) è una lastra grigia vuota.
  - Il vicolo e la Rua in ombra sono un blu uniforme senza segni (21, 02).
  - Le cartacce cadono uniformi su tutta la piazza (10).
  - Agli angoli del quadro la botte mostra il nero (21).

## 3. Le proposte, in ordine di impatto

**A. Le saracinesche dipinte.**
- Nel blocco `K2 = 'serranda'` si aggiunge il telo `box(e.w, 2.37, .02)` con un atlante 1024×512 (512×256 sul telefono): 8 teli in lamiera ondulata.
- Di giorno una bottega su quattro è chiusa; di sera tutte (`sgP5.y > .5`).
- I teli sono:
  - 55% tag e throw-up;
  - 20% un pezzo intero (contorno `#111` di 3 px);
  - 25% nudi, verdi `#3c6a4a` o zinco `#9a9890`.
- Costo: un materiale fuso nel secchio delle botteghe, nessuna chiamata di disegno in più, 2 MB di memoria video (0,5 sul telefono).

**B. Ribaltare i segni.**
- **Manifesti**: restano 2 famiglie del regime e se ne aggiungono 4 di strada:
  - JAM, giallo `#ffd21f` su nero;
  - rap, rosso `#e2231a` su `#f4efe4`;
  - SKATE, blu reale `#1f4fd8` e arancio `#ff7a1a`;
  - discoteca, magenta `#e6007e` (l'unico fluo).
- **Murales** (`mvMural`): `#e2231a #ffd21f #1f4fd8 #1e9e4a #111 #f4efe4`, lettere a blocchi con un personaggio; il sale scende a .08.
- **Occhio e telecamere** solo nei luoghi del regime (`piazza_gov`, `varco`, `governo`, `caserma`).
- Costo: zero.

**C. Le regole di densità** (`scena.js`, `render.js`).
- In ogni quadro (38 m) almeno 3 segni di mano leggibili, e almeno 1 entro 8 m davanti al personaggio.
- `tag` diventa secondario in `casa_del_borgo`, `lampada_e_targa` e `casa_del_pescatore`.
- `pq` sale a .4 sui lati aperti e a .5 nel borgo; le tag arrivano a 3, con probabilità .6.
- Le crew di `writing.js` partono con lavori `old`: uno ogni 12 m di facciata in E0, E2 ed E6.
- Il colore saturo resta al più il 12% dei pixel, solo su segni, saracinesche, portoncini (`#c8241e`, `#1f4fd8`, `#1e7a4a`), tende e insegne. Mai due accenti uguali entro 15 m.

**D. Il conflitto nel set.**
- Le pagine E4 restano pulite, con il **buff**: rettangoli `#8c8a84` sopra le tag cancellate. Il regime si riconosce perché cancella.
- I muri E6 escono dal grigio cemento: da `#9a968e` a `#b4a68e` / `#c2b298`.

**E. Tetti e suolo.**
- **Heaven spot**: un tetto piano su otto riceve una scritta a rullo di 6-10 m, in bianco o rosso, con una tela 512² condivisa. È la superficie che la camera alta vede di più.
- **Nessun tetto piano oltre 60 m² senza almeno 2 oggetti**: stendino, sedia di plastica, tanica, antenna storta.
- `sgP6.x` ×.5, e la chiazza scura scende da .55 a .25.
- Il 70% delle cartacce entro 0,8 m dal muro o dal cordolo; gesso e tombini nei vicoli.

**Le quattro leve nel set.**
- **Sbieco**:
  - pali e lampioni ±1,5° per hash, cartelli girati ±8°, bandiere ±2°;
  - le case E0/E2 inclinate di ±0,6° nella geometria fusa (costo 0);
  - E4 a 0°.
- **Rigonfiamento**:
  - bidoni, cassonetti e paracarri con la base più larga dell'8% e gli spigoli smussati di 4 cm;
  - uno zoccolo di 40 cm sporgente 4 cm (`#7a6a5a`), come il pantalone sulla scarpa;
  - il regime a spigolo vivo.
- **Tratto**: il contorno nero già dipinto nelle tele dei segni di strada.
- **Fish-eye**: mai il nero oltre il set.

**Per lo shader proprio: `SG_VERNICE`.** È un define in `sguProPezzi` per i materiali dei segni:
- la vernice smaltata prende il sole con una lucentezza stretta (roughness .5 contro .9);
- entro 15 m dal personaggio è esente da `NIT.tetti` e `NIT.aria`, così il colore vive vicino a chi gioca.
- Costo: un ramo, trascurabile anche sul telefono.

## 4. Cosa chiedo agli altri cinque
- **Fotografo e illustratore**: una sola tavolozza (gli esadecimali sopra); il pennarello più spesso al piede delle forme.
- **Tecnico luci**: un tetto di croma sui fluo dentro `proPieno`; il cobalto delle ombre non deve spegnere le saracinesche.
- **Cineasta**: un muro segnato nel terzo del quadro; il tetto che copre il personaggio va aperto o sfumato, non mostrato come sagoma.
- **Animatore**: ragazzi davanti alle saracinesche (stereo, skate), writer anche di giorno, gente sui marciapiedi della Vittoria.

## Riassunto
1. Nelle foto non c'è un solo segno di mano: si comincia dalle saracinesche abbassate e dipinte, che oggi non esistono.
2. I segni parlano di regime (4 manifesti su 6, l'occhio, una telecamera a ogni semaforo): si ribaltano verso jam, rap e skate.
3. La tavolozza hip hop (`#e2231a #ffd21f #1f4fd8 #1e9e4a`, magenta raro) va solo su segni e porte, al più il 12% dei pixel; i pastello restano.
4. Tetti piani vivi (heaven spot, oggetti), macchie AAA dimezzate, cartacce al piede dei muri.
5. Sbieco e rigonfiamento a costo zero nella strada; il regime resta a piombo e cancella col buff.
