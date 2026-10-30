# L'animatore: il look in movimento

Foto viste: `21_varco_rua`, `10_corso` (le altre in cottura). Codice: camera (`render.js` 18060-18200), `sguInit`, `screenToGround`/`project`.

## 1. Cosa c'è di buono e va protetto
- **La camera sta addosso al personaggio** nello stesso fotogramma, e da ferma si aggancia ai texel: niente tremolio e niente scivolamento.
- **La scossa a due seni** (13 e 19 Hz, `shA` ≤ .35) è morbida.
- **Il barile con gli angoli fermi** (`gS.x`) non lascia mai bordi neri, costo zero.
- **Le sospensioni dei mezzi** (rollio e beccheggio a molla, riga 17949) e il **portamento** (i Grigi dritti con le mani dietro la schiena) raccontano già il conflitto col movimento.

## 2. I difetti da curare
- **Le bande curve** (`21_varco_rua`): il letterbox e le bande laterali della guida (`b = step(vUv.y, lb.x*.11)…`) e la vignetta (`q = vUv - .5`) leggono le coordinate *già piegate*. Bande incurvate, triangolo nero in basso a destra: l'effetto si dichiara.
- **La mira**: `screenToGround` e `project` ignorano il barile. Scarto calcolato: fino a **12,8 px** a 1024 px di larghezza, ~24 px a 1920; anche anelli ed etichette (`main.js` 464, 652) si staccano dai passanti ai bordi.
- **Il centro ingrandito del 5,8 %** (1/(1−.055)): l'immagine intera viene ricampionata in bilineare e la nitidezza (`gK.w`) ci ripassa sopra. In marcia, con l'aggancio ai texel spento, fili, ringhiere e coppi (`21`, a sinistra) **strisciano**.
- **La pozza di luce che segue** (`10_corso`): il lastrico attorno al personaggio è sbiancato a ovale. In marcia la pozza scivola su suolo e muri come un occhio di bue: questo è **Grande Fratello**.
- **Il personaggio coperto dal tetto** in `21`: si vede solo come sagoma arancione e la camera non lo scopre. In `10_corso` è alto ~20 px.
- **I cartelli**: il 15 % è girato fino a ±10° (riga 6756). È troppo, da cartone, mentre le case sono perfettamente a piombo.

## 3. Le proposte, in ordine di impatto
1. **Il barile senza scarti** (costo ~0):
   - Il mouse passa per la formula del passo, `f(n) = .5 + q·(1 − g·(1 − r²))`, prima di `setFromCamera`.
   - Per `project` serve l'inversa: due iterazioni di punto fisso `q ← q_s / (1 − g·(1 − r²(q)))`, con errore < 0,3 px.
   - Letterbox, bande e vignetta passano su `vUv0`.
   - La taratura: `PELL.gonfio` .045 sul computer, .035 sul telefono in verticale.
   - Sui mezzi e sullo skate il gonfio sale fino a .065 con la velocità, insieme al fov che già si apre: è la VX1000. Va smorzato in 0,5 s.
   - Mentre la camera si muove (`cam.movN` recente), il tetto della nitidezza scende da ±.05 a ±.03: è la cura contro i bordi che strisciano.
2. **La pozza onesta**: `NIT.luce` .1 → .06, `NIT.avanti` .45 → .25, smorzamento `dt*2.5` → `dt*1.2`. La luce deve venire dal sole sui muri, non da un faro.
3. **Lo sbieco in movimento: il rollio della camera** (costo 0):
   - Si applica `camera.rotateZ(roll)` dopo `lookAt`.
   - A piedi: `roll` ∝ velocità angolare della marcia × velocità, con tetto 0,7° (.012 rad).
   - Sui mezzi: `u.roll × .15`, con tetto 1,5°.
   - Molla smorzata (k 6), a zero in 0,6 s da fermi. L'aggancio ai texel riparte solo con |roll| < 1e-4.
   - Niente camera a mano da fermi: il raffinato è fermo.
   - Nel regime (caserme, uffici, i suoi piazzali) roll 0 e scossa ×.5: lui resta a piombo.
4. **Lo sbieco delle case senza crepe** (in `sguPezzi`, nel vertice):
   - Le case si inclinano con un campo di rumore lento, lungo 40 m: `pos.xz += dir·h·tan(0,9°)·n(xz/40)`, ancorato al piede.
   - Le facciate attaccate si piegano insieme: niente fessure; a 1,8 m sono 2,8 cm, collisioni intatte.
   - Lo stesso pezzo va nel materiale di profondità delle ombre, altrimenti le ombre si staccano.
   - Zero sugli edifici del regime.
   - I cartelli: 8 % a ±5°, gli altri a ±1,5°.
5. **Il rigonfiamento vivo**:
   - Allo sbarco dal salto, schiacciamento y .94 / xz 1,04 per 0,12 s.
   - Il molleggio dell'anca in marcia +30 %.
   - Le scarpe ×1,15, ma con la scala del passo (`ts` clamp .55-2,2) ricontrollata, perché un piede più grande che scivola si vede il doppio.
   - Si riprende la patch `strumenti_inverno/animazioni_mondo.patch` (vento, bandiere, cavi): bucato e tende ondeggiano nel vertice con la fase dal mondo.
6. **Il tratto e la trama dello shader proprio**: la regola del movimento.
   - Retino, carta e spray ancorati al mondo, oppure allo schermo traslato con la camera. Mai fissi sullo schermo, altrimenti la città ci scorre sotto come dietro un vetro.
   - Lo spessore del pennarello si prende da un hash della posizione nel mondo, non dei pixel.
   - Niente tratto che «bolle» nel tempo: è sfarfallio.

## 4. Cosa chiedo agli altri cinque
- **Tecnico luci**: ombre cobalto agganciate ai texel della mappa (niente ombre che nuotano in marcia) e la pozza ridotta come sopra.
- **Scenografo**: dove il campo dello sbieco vale zero (il regime) e dove spinge (mercato, caruggi, il Disgelo).
- **Modellatore/illustratore**: personaggi più massicci ma col piede che tocca terra; giacche larghe entro `P.bulk` .12, per non bucare i gomiti.
- **Fotografo**: grana e retino ancorati come al punto 6; il gonfio tarato insieme a me.
- **Tutti**: ogni proposta va provata con 5 s di marcia, una curva e un giro della levetta, non su una foto ferma.

## Riassunto
Il look in movimento è già solido: camera agganciata, scossa morbida, barile con gli angoli fermi; va protetto.
Il barile va ripulito: mira e anelli corretti con la stessa formula (scarto oggi fino a 13 px a 1024), bande e vignetta su `vUv0`, gonfio .045 / .035 telefono, che sale coi mezzi.
Lo sbieco va messo in movimento: rollio della camera ≤0,7° a piedi, ≤1,5° sui mezzi, a zero da fermi e nel regime; case inclinate da un campo lento senza crepe, cartelli meno storti.
Contro il Grande Fratello, la pozza che segue scende a `luce` .06 / `avanti` .25; contro lo sfarfallio, nitidezza più bassa in marcia e trame dello shader ancorate al mondo.
Il rigonfiamento è vivo: schiacciamento allo sbarco, anca più morbida, scarpe ×1,15 col piede che non scivola, bucato e tende al vento.
