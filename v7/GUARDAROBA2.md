# GUARDAROBA2 — le spalle a pallone si sgonfiano

Ramo `guardaroba2` (da `origin/claude/shader-styling-performance-wbvqfy`). Segue `GUARDAROBA1.md`.
Tavola: `_immagini/guardaroba/guardaroba2.jpg` (le cause, la tabella degli eccessi, i 10 capi peggiori prima/dopo sulla stessa figura:
di fronte, di tre quarti e col passo). Toccato solo `src/personaggi.js` (più `index.html`/`editor.html` rifatti da `build.py`).
Vita, veicoli, città di `render.js`, `unico_*.js`, `guardaroba.js`, `vestiario.js`: non toccati.

## Il problema
Il committente su `guardaroba1.jpg`: la felpa «old school» (felpa larga, `felpa_college`) e la maglietta rossa con lo stemma tondo e la stella
(`maglietta_oversize`, tessera «stampa») hanno spalle larghissime e gonfie; il passamontagna va spesso con questi capi, quindi si vede tanto.
Non erano i modelli: era il modo di vestire di `personaggi.js`, uguale per tutti i capi, che faceva il pallone sui capi larghi e sugli strati.

## Le cause (e il rimedio, tutto in `catenaStrati` / `strati` / `costruisci`)
1. **Gli strati si sommavano.** `strati()` sommava lo spessore di ogni capo che copre un punto: maglia + felpa + piumino = tre agi uno
   sull'altro (felpa + piumino: 6,1 cm più i sacchi). Lo spessore del catalogo è un agio (quanto il capo sta lontano dal corpo da solo),
   non lo spessore della stoffa. Ora sono **annidati**: un capo sopra un altro ne esce solo dello spessore della sua stoffa
   (`TELA(sp) = min(sp, 4 mm + 15% sp)`) se il suo agio non basta già. Restano annidati per costruzione (niente compenetrazioni tra capi).
2. **L'agio era uguale dappertutto.** Sulla cima della spalla, dove il capo è appeso, come sulla pancia; e sul braccio come sul busto, ma il
   braccio ha un terzo del raggio: la manica di una maglietta larga raddoppiava il raggio del braccio. Ora l'agio oltre la stoffa si distribuisce
   per zona (`AGIO`): pieno su petto e vita, scende al 30% in cima alla spalla; sulla manica il 50%, il 25% sulla testa della manica.
   Lungo la catena l'agio è ricalcolato anello per anello (prima era fisso per tratto). Colletti, cappucci, collane, cinture usano lo stesso
   `strati()` e restano posati sulla stoffa.
3. **I moltiplicatori dei capi larghi** (con `facce3`, cioè sempre): `maglietta_larga`, `felpa_larga`, `jersey` avevano ×1,2 sull'agio del busto e
   ×1,15 sulle maniche, sopra uno spessore del catalogo già largo (felpa larga 3 cm contro 1,6 della felpa). Tolti (i pantaloni larghi restano).
4. **Le forme**: la «spalla scesa» (`FORMA.drop`) spingeva il busto 3 cm in fuori proprio sopra il braccio → ora 0,4 (1,4 cm), ammorbidisce;
   la manica che si apre (`FORMA.manica`) fino a 3,5 cm → al massimo 1,2; i sacchi del piumino sul braccio a ½ (erano a ¾) e più bassi sulla spalla.
5. **I muscoli col capo.** Deltoide, pettorali e scapole (`deltoide`, `scolpisciBusto`) sono un fattore sul raggio: col capo largo il raggio
   cresce e la spalla si gonfiava con lui. Ora il rilievo resta della misura del corpo (`modC`: il fattore × raggio del corpo / raggio col capo).
6. **Il deltoide destro stava nell'ascella**: sul braccio destro l'asse va verso −x e il lato del loft è girato; `deltoide()` usava lo stesso angolo
   dei due lati. Ora a specchio (nudo: la spalla destra era più bassa di 7 mm sopra e più gonfia sotto, verso il busto).
7. **Braccia nel busto.** Col braccio che pende o va col passo, busto largo + manica larga si toccavano: il busto perde di lato parte dell'agio
   (dall'ascella alla vita) e la manica lo perde dalla parte del corpo (il centro si sposta in fuori), tenendolo fuori.

I disegni non cambiano: tessere, stampe (lo stemma con la stella, OLD SCHOOL, il logo, le bande), colori, sacchi del piumino, cappucci e
colletti sono gli stessi; cambia solo il raggio degli anelli. I capi sottili (camicie, magliette, canottiere, polo) restano uguali (tabella).

## Come si è misurato
- `studio_anim.html?facce3` con il modello e le clip del gioco; ogni capo del catalogo che copre busto o braccia (86 capi, 54 forme) sopra jeans e
  sneakers, più 10 strati tipici (felpa sotto il piumino, sotto la cerata, sotto la giacca da lavoro, maglietta oversize + varsity…) e tre capi
  sulla donna; fermo e 4 fasi della camminata; la pelle calcolata sulla CPU (`boneTransform`).
- **spalle**: mezza sagoma da davanti all'altezza delle spalle, cm per lato oltre la stessa figura nuda; **cupola**: quanto la spalla sale sopra
  l'attaccatura del braccio (negativo: la stoffa poggia più bassa del deltoide nudo, che sotto i capi si ammorbidisce); **manica**, **avambr.**:
  raggio a metà dell'osso / raggio del braccio nudo; **braccia nel busto**: vertici del braccio (dal 30% del braccio in giù) dentro la sezione
  del busto di più di 6 mm, nel peggiore dei 5 fotogrammi, e il più profondo; **vertici**: della figura (testa, mani, scarpe comprese).
- `agio busto petto/spalla` e `agio manica` in cm, singolo capo (prima uniforme, ×1,2/×1,15 per i larghi).

## I numeri (prima → dopo, dal peggiore)
| capo (forma) | agio busto petto/spalla cm | agio manica cm | spalle cm/lato | cupola cm | manica × | avambr. × | braccia nel busto (vertici/max cm) | vertici |
|---|---|---|---|---|---|---|---|---|
| D: puffer_corto | 5/5 → 5/2.9 | 4.5 → 2.8 | 9.6 → 6.7 | 5.9 → 3.1 | 2.7 → 2.13 | 3.07 → 2.34 | 41/14 → 20/5.2 | 4172 → 4156 |
| felpa_college+piumino_oca | strati |  | 8.2 → 3.6 | 5.4 → 3.1 | 3 → 1.9 | 3.7 → 2.3 | 107/19.4 → 5/4.3 | 4682 → 4614 |
| felpa+piumino | strati |  | 7.7 → 3.3 | 4.2 → 3.1 | 2.66 → 1.84 | 3.22 → 2.23 | 38/14 → 4/4.9 | 4526 → 4492 |
| puffer_corto | 5/5 → 5/2.9 | 4.5 → 2.8 | 7.4 → 5.2 | 2.2 → 0.8 | 2.53 → 2.01 | 3.03 → 2.17 | 72/14.7 → 6/4.9 | 4382 → 4366 |
| D: maglietta_oversize (maglietta_larga) | 2.9/2.9 → 2.4/1.5 | 3 → 1.7 | 7.3 → 4.5 | 3 → 1.9 | 2.28 → 1.65 | 1 → 1 | 10/7.5 → 5/4 | 3979 → 3911 |
| D: felpa_college (felpa_larga) | 3.6/3.6 → 3/1.8 | 3 → 1.7 | 4.9 → 3.1 | 7.2 → 7.1 | 1.9 → 1.52 | 2.69 → 2.06 | 82/9 → 20/4.6 | 4250 → 4182 |
| piumino_sacchi (guscio_gonfio) | 4.6/4.6 → 4.6/2.7 | 4 → 2.5 | 5.8 → 3.4 | 2 → -1.1 | 2.49 → 1.92 | 2.9 → 2.31 | 45/15.2 → 3/4 | 4434 → 4348 |
| piumino | 4.5/4.5 → 4.5/2.6 | 4 → 2.5 | 5.3 → 3.5 | 2.7 → 0.9 | 2.37 → 1.84 | 2.79 → 2.23 | 49/14.8 → 4/5 | 4434 → 4400 |
| felpa_skate+coach_jacket | strati |  | 5.6 → 3.6 | 3.5 → 0.2 | 2.09 → 1.62 | 2.85 → 2.19 | 56/11 → 4/3.8 | 4712 → 4678 |
| maglietta_oversize+varsity | strati |  | 6.5 → 3.3 | 0.8 → 0.2 | 2.27 → 1.61 | 1.85 → 1.62 | 47/13.3 → 7/3 | 4760 → 4692 |
| maglietta_oversize (maglietta_larga) | 2.9/2.9 → 2.4/1.5 | 3 → 1.7 | 6.1 → 2.9 | 1.4 → 0.6 | 2.17 → 1.6 | 1 → 1 | 14/6.8 → 4/2.3 | 4189 → 4121 |
| maglia_lunga+felpa_college | strati |  | 4.8 → 2.9 | 3.4 → 0.7 | 1.89 → 1.47 | 2.7 → 1.99 | 35/9.6 → 9/3.7 | 4820 → 4632 |
| felpa_skate (felpa_larga) | 3.6/3.6 → 3/1.8 | 3 → 1.7 | 4.4 → 3 | 3.5 → 0.8 | 1.81 → 1.47 | 2.58 → 1.99 | 29/8.6 → 7/3.8 | 4460 → 4392 |
| felpa+impermeabile | strati |  | 4 → 2.6 | 3.5 → 3 | 1.75 → 1.39 | 2.16 → 1.66 | 19/8.8 → 5/3 | 4960 → 4926 |
| felpa+giacca_lavoro | strati |  | 3.9 → 2.5 | 3.4 → -1.5 | 1.71 → 1.38 | 2.09 → 1.65 | 15/9 → 5/2.5 | 4814 → 4780 |
| anorak | 2.8/2.8 → 2.8/1.7 | 2.6 → 1.7 | 4 → 2.4 | 3 → 3 | 1.7 → 1.47 | 2.35 → 1.99 | 12/7.4 → 4/2.8 | 4339 → 4271 |
| camicia_bowling (bowling) | 1/1 → 1/0.8 | 1.4 → 1 | 5.1 → 2.7 | 0 → 0 | 1.97 → 1.48 | 1 → 1 | 6/5 → 2/2 | 4308 → 4274 |
| parka | 3/3 → 3/1.8 | 2.6 → 1.7 | 3.2 → 2.3 | 3.5 → 0.2 | 1.58 → 1.38 | 1.92 → 1.66 | 11/7.3 → 2/3.3 | 4515 → 4481 |
| pelliccia | 4/4 → 4/2.4 | 3.5 → 2.2 | 3.7 → 2.2 | 1.8 → 0.6 | 1.75 → 1.47 | 2.23 → 1.69 | 10/5.8 → 2/2.5 | 4361 → 4327 |
| giacca_guscio (guscio) | 2/2 → 2/1.3 | 1.8 → 1.2 | 2.8 → 2.5 | 3.3 → 0.1 | 1.51 → 1.37 | 2.06 → 1.85 | 6/6.1 → 3/2.4 | 4356 → 4288 |
| camicia+maglione+giacca | strati |  | 3.9 → 2.1 | 1.2 → -0.5 | 1.7 → 1.38 | 2.07 → 1.65 | 16/8.9 → 4/3.1 | 5066 → 5014 |
| montone | 3.5/3.5 → 3.5/2.1 | 3 → 1.9 | 2.9 → 1.9 | 1.8 → 1.1 | 1.64 → 1.41 | 2.01 → 1.6 | 9/5.1 → 2/2.5 | 4151 → 4083 |
| maglione+cappotto | strati |  | 3.7 → 2.1 | 0.8 → -1.6 | 1.66 → 1.34 | 2.01 → 1.59 | 16/8.4 → 5/3.2 | 4864 → 4864 |
| giacca_raso (raso) | 2.8/2.8 → 2.8/1.7 | 2.6 → 1.7 | 3.4 → 2.3 | 1 → -1.4 | 1.58 → 1.38 | 1.92 → 1.66 | 13/5.7 → 5/3.1 | 4400 → 4366 |
| felpa | 1.6/1.6 → 1.6/1.1 | 1.4 → 1 | 2.2 → 1.7 | 3 → -1.3 | 1.32 → 1.23 | 1.55 → 1.43 | 6/3.6 → 3/2.6 | 4494 → 4460 |
| varsity | 2.6/2.6 → 2.6/1.6 | 2.4 → 1.6 | 3 → 2.1 | 1 → -1.3 | 1.53 → 1.35 | 1.85 → 1.62 | 11/7 → 4/3.1 | 4366 → 4332 |
| pile | 3/3 → 3/1.8 | 2.8 → 1.8 | 3.3 → 2.6 | -0.9 → -1.3 | 1.62 → 1.4 | 1.97 → 1.69 | 13/7.4 → 6/2.8 | 4434 → 4400 |
| camicia_hawaii (camicia_corta) | 0.6/0.6 → 0.6/0.5 | 0.6 → 0.5 | 2.5 → 1.6 | -0.1 → 0 | 1.57 → 1.37 | 1 → 1 | 4/1.7 → 4/1.4 | 4308 → 4308 |
| giacca_militare | 2.2/2.2 → 2.2/1.4 | 2 → 1.4 | 2.8 → 2 | 0 → -0.1 | 1.45 → 1.31 | 1.72 → 1.54 | 6/6.2 → 3/2.4 | 4315 → 4247 |
| chiodo_spille (chiodo) | 2.2/2.2 → 2.2/1.4 | 2 → 1.4 | 2.3 → 1.3 | 0.5 → 0.4 | 1.45 → 1.31 | 1.72 → 1.54 | 5/5.2 → 3/2.5 | 4281 → 4247 |
| coach_jacket (coach) | 1.6/1.6 → 1.6/1.1 | 1.6 → 1.1 | 2.5 → 2.4 | 0.2 → -0.1 | 1.45 → 1.34 | 1.93 → 1.8 | 4/3.5 → 3/3 | 4247 → 4213 |
| giacca_lavoro | 2/2 → 2/1.3 | 1.8 → 1.2 | 2.5 → 2.1 | 0.4 → 0.2 | 1.41 → 1.28 | 1.66 → 1.5 | 4/4.2 → 2/2.3 | 4315 → 4281 |
| tuta_nylon | 2.2/2.2 → 2.2/1.4 | 2 → 1.4 | 2.5 → 1.5 | 0.1 → -0.1 | 1.45 → 1.31 | 1.74 → 1.55 | 6/5.7 → 4/3.1 | 4315 → 4281 |
| giacca_pelle | 2/2 → 2/1.3 | 1.8 → 1.2 | 2.6 → 1.8 | 0.2 → 0.2 | 1.41 → 1.28 | 1.66 → 1.5 | 6/5.2 → 3/2.3 | 4315 → 4281 |
| impermeabile (cerata) | 2/2 → 2/1.3 | 2 → 1.4 | 2.2 → 1.5 | 0.2 → 0.2 | 1.45 → 1.31 | 1.73 → 1.55 | 5/5.6 → 4/2.8 | 4525 → 4491 |
| felpa_zip (tuta_giacca) | 2/2 → 2/1.3 | 1.8 → 1.2 | 2.5 → 2.1 | 0.1 → -0.1 | 1.4 → 1.28 | 1.67 → 1.51 | 4/5.3 → 3/2.3 | 4315 → 4281 |
| maglietta+felpa | strati |  | 1.7 → 1.5 | 0.3 → 0.1 | 1.43 → 1.24 | 1.55 → 1.43 | 36/5.7 → 9/2.8 | 5079 → 4925 |
| divisa | 1.8/1.8 → 1.8/1.2 | 1.5 → 1.1 | 1.4 → 1.4 | 1.1 → 1.2 | 1.32 → 1.22 | 1.45 → 1.33 | 2/2.5 → 2/1.2 | 4245 → 4211 |
| cappotto | 2/2 → 2/1.3 | 1.8 → 1.2 | 2 → 1.2 | 0.1 → 0.1 | 1.38 → 1.26 | 1.54 → 1.38 | 3/3.4 → 2/1.6 | 4361 → 4327 |
| cardigan | 1.6/1.6 → 1.6/1.1 | 1.4 → 1 | 2.2 → 1.7 | 0.1 → 0 | 1.32 → 1.23 | 1.54 → 1.43 | 4/4.9 → 3/2.1 | 4251 → 4217 |
| giacca_toppe | 1.8/1.8 → 1.8/1.2 | 1.6 → 1.1 | 1.5 → 1.2 | 0.4 → 0.1 | 1.34 → 1.24 | 1.48 → 1.35 | 3/1.9 → 1/0.6 | 4185 → 4151 |
| track_retro | 1.6/1.6 → 1.6/1.1 | 1.4 → 1 | 2.2 → 1.8 | -0.2 → -0.2 | 1.32 → 1.23 | 1.54 → 1.43 | 4/3 → 3/1.9 | 4315 → 4281 |
| giacca | 1.6/1.6 → 1.6/1.1 | 1.4 → 1 | 1.3 → 1.2 | 0.5 → 0.3 | 1.3 → 1.21 | 1.42 → 1.31 | 3/2.4 → 2/0.8 | 4134 → 4100 |
| tuta | 1.2/1.2 → 1.2/0.9 | 1.2 → 0.9 | 1.4 → 1.2 | 0.1 → 0 | 1.28 → 1.21 | 1.48 → 1.39 | 4/3.7 → 2/2.5 | 4383 → 4331 |
| maglione_v | 1.4/1.4 → 1.4/1 | 1.2 → 0.9 | 1.2 → 0.9 | 0.3 → 0.2 | 1.26 → 1.18 | 1.36 → 1.27 | 2/1.3 → 1/0.7 | 4087 → 4087 |
| giubbotto_jeans | 1.8/1.8 → 1.8/1.2 | 1.6 → 1.1 | 1.9 → 1 | -1.1 → -1 | 1.36 → 1.26 | 1.6 → 1.47 | 8/4.1 → 3/2.8 | 4434 → 4400 |
| camicia_quadri | 0.8/0.8 → 0.8/0.6 | 0.8 → 0.7 | 1.3 → 1.3 | 0.1 → 0 | 1.19 → 1.15 | 1.36 → 1.32 | 3/2.9 → 1/2.3 | 4383 → 4383 |
| camicia | 0.6/0.6 → 0.6/0.5 | 0.6 → 0.5 | 1.4 → 1.4 | 0.1 → 0 | 1.15 → 1.13 | 1.3 → 1.28 | 2/2.7 → 3/1.4 | 4438 → 4438 |
| smanicato | 4/4 → 4/2.4 | 0 → 0 | 0.2 → 0.4 | 2 → -1.2 | 1 → 1 | 1 → 1 | 9/7 → 2/2.2 | 4044 → 3976 |
| maglione_fairisle | 1.6/1.6 → 1.6/1.1 | 1.4 → 1 | 1.7 → 0.9 | -1.1 → -1.1 | 1.32 → 1.23 | 1.54 → 1.43 | 7/4.5 → 2/2.5 | 4366 → 4332 |
| dolcevita | 1/1 → 1/0.8 | 1 → 0.8 | 1 → 0.8 | 0.1 → 0.1 | 1.21 → 1.16 | 1.3 → 1.24 | 2/1.5 → 2/0.7 | 4121 → 4121 |
| maglione | 1.4/1.4 → 1.4/1 | 1.2 → 0.9 | 1.9 → 1.7 | -1.2 → -1.4 | 1.28 → 1.2 | 1.48 → 1.39 | 6/3.3 → 3/2.6 | 4366 → 4366 |
| gilet_piuma | 3.6/3.6 → 3.6/2.1 | 0 → 0 | -0.1 → 0.1 | 2 → -1.1 | 1 → 1 | 1 → 1 | 7/4.5 → 2/1.5 | 4044 → 3976 |
| maglietta_righe | 0.5/0.5 → 0.5/0.5 | 0.5 → 0.5 | 0.8 → 1 | 0.2 → 0.2 | 1.18 → 1.16 | 1.39 → 1.39 | 2/0.7 → 0/0 | 4244 → 4210 |
| camicia_70 | 0.7/0.7 → 0.7/0.6 | 0.7 → 0.6 | 0.9 → 0.6 | -0.1 → 0 | 1.15 → 1.12 | 1.21 → 1.18 | 3/1.2 → 0/0 | 4253 → 4253 |
| vestiti (vestito_lungo) | 0.6/0.6 → 0.6/0.5 | 0.6 → 0.5 | 0.6 → 0.9 | 0.3 → 0.2 | 1.13 → 1.11 | 1.18 → 1.16 | 1/0.7 → 0/0 | 3983 → 3983 |
| polo | 0.6/0.6 → 0.6/0.5 | 0.6 → 0.5 | 0.3 → 0.4 | 0.3 → 0.2 | 1.13 → 1.11 | 1 → 1 | 5/1.7 → 11/1.5 | 4253 → 4253 |
| maglietta | 0.5/0.5 → 0.5/0.5 | 0.5 → 0.5 | 0.4 → 0.2 | 0 → 0 | 1.12 → 1.1 | 1 → 1 | 8/1.1 → 11/2 | 4244 → 4210 |
| maglia_basket (jersey) | 2.4/2.4 → 2/1.3 | 0 → 0 | 0.2 → 0 | 0.7 → 0.6 | 1 → 1 | 1 → 1 | 2/2.8 → 2/1.5 | 3725 → 3691 |
| maglia_lunga (sotto_lunga) | 0.3/0.3 → 0.3/0.3 | 0.4 → 0.4 | 0.3 → 0.7 | 0.1 → -0.1 | 1.08 → 1.08 | 1.12 → 1.12 | 0/0 → 0/0 | 4244 → 4210 |
| giubbotto | 3.5/3.5 → 3.5/2.1 | 0 → 0 | 0 → 0.2 | 0.7 → 0.4 | 1 → 1 | 1 → 1 | 5/3.8 → 2/1.5 | 3929 → 3895 |
| canotta (canottiera) | 0.4/0.4 → 0.4/0.4 | 0 → 0 | 0 → 0.2 | 0.5 → 0.5 | 1 → 1 | 1 → 1 | 1/0.7 → 0/0 | 3882 → 3848 |
| vestito_corto | 0.6/0.6 → 0.6/0.5 | 0 → 0 | 0.2 → 0.2 | 0.2 → 0.2 | 1 → 1 | 1 → 1 | 2/0.8 → 0/0 | 3957 → 3957 |
| gilet_toppe | 1.6/1.6 → 1.6/1.1 | 0 → 0 | 0.2 → 0.4 | 0.1 → 0 | 1 → 1 | 1 → 1 | 2/1.8 → 2/1.1 | 3912 → 3878 |
| gilet | 1.2/1.2 → 1.2/0.9 | 0 → 0 | 0 → 0.2 | 0.1 → 0.1 | 1 → 1 | 1 → 1 | 3/1.6 → 2/1 | 3912 → 3912 |
| nudo | strati |  | 0 → 0.3 | 0 → -0.1 | 1 → 1 | 1 → 1 | 0/0 → 0/0 | 3746 → 3746 |
| salopette | 1.2/1.2 → 1.2/0.9 | 0 → 0 | 0 → 0.4 | 0 → -0.1 | 1 → 1 | 1 → 1 | 2/1 → 0/0 | 3929 → 3929 |
| vestito_fiori (abito) | 0.6/0.6 → 0.6/0.5 | 0.6 → 0.5 | -0.1 → 0.3 | 0.1 → 0 | 1 → 1 | 1 → 1 | 1/1.1 → 2/1 | 4113 → 4113 |
| D: nudo | strati |  | 0 → 0.2 | 0 → 0 | 1 → 1 | 1 → 1 | 0/0 → 0/0 | 3536 → 3536 |

**In breve**: la felpa larga sopra la maglia lunga (l'uscita hip hop) da +4,8 a +2,9 cm per lato sulle spalle, manica da 1,89 a 1,47 volte il
braccio, cupola da +3,4 a +0,7; la maglietta oversize con lo stemma da +6,1 a +2,9, manica da 2,17 a 1,6; il piumino corto da +7,4 a +5,2 e
manica da 2,53 a 2,0 (resta gonfio: è un piumino); felpa + piumino da +7,7 a +3,3. Braccia nel busto: da 35-107 vertici e 10-19 cm di
profondità a 3-9 vertici e 2-5 cm (le pieghe dell'ascella; i piumini schiacciati dal braccio, 4-5 cm). Sulla donna restano i casi più stretti
(piumino corto 20 vertici / 5 cm; la felpa larga col cappuccio: la cupola +7 cm è il cappuccio abbassato sulle spalle, non la spalla).

**Vertici**: sempre uguali o meno (fino a −190 per figura con la felpa larga, per qualche gradino in meno tra strati che ora coincidono);
nessun anello o segmento in più. Nella tavola, figura intera: felpa college 29 918 → 29 764, maglietta oversize 29 270 → 29 236,
piumino corto 29 806 → 29 670.

Prova di fumo (`fumo6.js`): `errori []`.

## Strumenti (nello scratchpad, non nel gioco: `g2/`)
`jdump.js` (le giunture dei due modelli), `carica.js` + `misura.js` (in Node: il catalogo in posa a T), `posa.js` (nel browser: fermo e passo,
sagoma, manica, braccia nel busto), `confronta.js` (la tabella), `foto.js` (le foto di studio, stesse persone e stesso passo), `tavola.py`.

## Rischi
- La cupola e le spalle dei capi strutturati (giacche, cappotti) scendono di 1-1,5 cm: la spalla ora poggia. Le spalline delle divise
  (pezzi a parte) non cambiano.
- Chi porta tre strati (camicia + maglione + giacca) è più snello di prima (+2,1 invece di +3,9 cm per lato): è voluto.
- I piumini sono ancora larghi (+3,5/+5 cm per lato): se servono più sgonfi, il punto è `FORMA.*.gonfio` e lo spessore in `CAPI`.
