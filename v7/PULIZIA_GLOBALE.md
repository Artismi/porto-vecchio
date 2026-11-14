# PULIZIA GLOBALE — la città che combacia

Ramo `pulizia_globale` (da `origin/main`). Regola del committente: non si corregge ogni modello; nel dubbio si TOGLIE.
Si corregge alla fonte, nel generatore, con regole: se la regola di posizione è facile (agganciare, allineare) si corregge,
altrimenti il generatore non emette il pezzo quando manca il contesto.

## Lo strumento

`node strumenti/pulizia_globale.js [uscita.json]` (dentro `browser_slot.sh`; ~7 min). Carica la città nuova costruita nel browser con
`?sondadisp&pulglob`: render.js annota ogni cosa posata (tipo, chi l'ha posata, scatola), le corde coi due capi (`rope()` segna
`userData.corda`), i pezzi staccati dal corpo (`pgParti`: le mesh di una cosa in gruppi che si toccano entro 5 cm; un gruppo che
non tocca il corpo e non sta sul suolo è staccato) e le barche; game.js dà la fisica del passo (`window.__PG_walk`). Spento non costa niente.
Categorie: a_sospeso, b_urto / b_muro / b_barca, c_corda, d_staccato, e_verde, f_passaggio / f_carreggiata / f_porta / f_scala,
g_quota / g_colore, h_ruotato. Conta per categoria e per generatore (file:funzione, con la riga del file).
Il «prima»: `python3 <scratch>/pg/mk_prima.py <v7>` fa `prima.html` dai sorgenti di origin/main con la sola misura; poi
`PV_PAGINA=prima.html node strumenti/pulizia_globale.js`.

## Fatto

- tappa 1: lo strumento; le correzioni alla fonte:
  - barca a vela (render.js BOATS.barca_vela): il pulpito era due barre dritte a 90 cm, fuori dallo scafo: ora candelieri sul capodibanda e barra a 45 cm.
  - pedalò: il parapale posato sul pianale.
  - cime delle barche (render.js buildCosta, `cimaA`): ogni cima va su una bitta (quella entro 1,5 m o una nuova sul bordo), il bordo
    più vicino è il punto proiettato sul lato (non il mezzo del lato); oltre 6 m o in carreggiata non si mette; la trappa a prua verso
    un corpo morto che non c'è: tolta.
  - controventi del pontile: sono assi fra due pali, non corde (escluse dal conto).
  - gradini dei sentieri (buildUrbano1): il tronco era messo per il lungo, i picchetti ai capi restavano nel vuoto: ora di traverso.

- tappa 2:
  - cantieri stradali senza cantiere (render.js buildStrade31): nella città nuova niente coni e transenne su mezza carreggiata senza scavo.
  - bitte di banchina (buildQuayWalls) sul ciglio a 45 cm, non a 70 (sui moli stretti chiudevano il passaggio).
  - la roba alla base dei muri (buildCase): non sulle caselle d'angolo, non a meno di 2,2 m da una porta qualsiasi, non su caselle non
    libere, non sul suolo in pendenza.
  - oggetti35 (bici, vasi, tavolini accanto alle porte): sul muro vero (muroVero1) e girati come lui; casa girata oltre 25°: niente.
  - antenne del colmo (buildModular): senza coppi sotto il piede non si mettono.
  - fioriere dei tetti: il fondo sul lastrico (stavano 11 cm sopra).
  - barche (boatAt): lo scafo con due punti sulla terra non si mette (né le sue cime).
  - lavagne dei bar e dei forni accanto alla porta, contro il muro.
  - lo strumento: le cose appese devono toccare un muro o avere qualcosa sopra (trave, balcone); i pezzi staccati che poggiano sul suolo (o ci
    entrano) non contano.

- tappa 3:
  - barche: prima la regola facile, la barca scivola lungo il suo asse (fino a 4 m) finché lo scafo sta tutto in acqua; se no non si mette.
  - roba alla base dei muri: anche i vani porta del kit contano come porte.
  - oggetti35: casa girata senza il muro vero: niente roba (era storta di 12° e dentro il muro).
  - lo strumento: il controllo «appeso al muro» solo per le cose che stanno solo su un muro (vaso appeso, insegna, tenda, targa, contatore...);
    il contesto WebGL perso non ricarica la pagina durante la misura.

- tappa 4 (chi li posa: `sdK(o, 'caseVaso:...')` segna per la sonda i vasi che si fondono nella casa):
  - i vasi di buildCase erano i due vasi grandi ai lati della porta delle botteghe (pienezza): 103 difetti da soli (zona porta,
    dentro il muro, sospesi). Tolti (il seme resta, il resto della città non cambia).
  - vasi dei balconi (epBalcone) contro la ringhiera, non nel muro; i vasi dei gruppi e dei davanzali in squadra col muro.
  - oggetti35: senza il muro vero niente roba (il bordo delle caselle non è il muro del kit); mai oltre lo spigolo della facciata;
    mai dentro una casa (`casaSotto1`, le case come le vede la sonda); niente davanti alle case girate; girata come il muro (snapRot2
    la rimetteva sulla griglia). Il gruppo di vasi e la bici accanto alla porta restavano 9° fuori asse e nel muro anche sulle case
    dritte: tolti. La bici di B35 era impennata di 18°: ora dritta.
  - pot(): il vaso (con le foglie) dentro un muro non si mette.
  - d_staccato: impalcature (la campata senza un montante non si mette, il traverso sotto le tavole, niente correnti sopra i montanti,
    il cartello sui correnti); orti solo in piano; tronchi e picchetti dei sentieri sul suolo vero; la scala della torretta del bagnino
    (saliva al contrario, i pioli nel vuoto: ora sale alla pedana, con gli staggi); la piroga (bilanciere e pagaia sullo scafo).
  - g_quota: non toccato. Le 12/12 da 30-33 cm sono il prato in collina (pendenza ~16% su una casella), non scalini; i salti
    da 1-3 m (11/20, 20/20) sono terrazze del suolo senza muro: vanno fatte nel generatore del suolo (muretto o scarpata), non è semplice.

## I conti (lo stesso strumento sulle due pagine: prima.html = origin/main con la sola misura; dopo = questo ramo)

| categoria | prima | tappa 3 | dopo | |
|---|---:|---:|---:|---|
| a_sospeso (anche appesi al nulla) | 72 | 58 | 42 | i vasi delle botteghe; restano antenne di buildModular (17), torrette dei tetti (9) |
| b_barca | 16 | 0 | 0 | le barche scivolano in acqua o non si mettono |
| b_muro | 102 | 94 | 10 | vasi delle botteghe tolti, balconi, oggetti35 sul muro vero, pot() |
| b_urto | 31 | 31 | 26 | |
| c_corda | 30 | 0 | 0 | ogni cima su una bitta |
| d_staccato | 400 | 59 | 16 | impalcature, orti, sentieri, torretta del bagnino, piroga |
| e_verde | 1 | 1 | 1 | |
| f_carreggiata | 48 | 3 | 3 | |
| f_passaggio | 73 | 60 | 33 | restano bitte delle banchine strette (17) e l'arredo d'inverno (10) |
| f_porta | 62 | 54 | 6 | i due vasi ai lati delle porte delle botteghe tolti |
| g_colore | 106 | 90 | 73 | rumore della misura (fra 25 e 104 da un giro all'altro sullo stesso codice): il suolo non è stato toccato |
| g_quota | 70 | 70 | 70 | non toccato (vedi tappa 4) |
| h_ruotato | 44 | 43 | 3 | roba di oggetti35 girata come il muro, o tolta |
| totale | 1055 | 563 | 283 | senza g_colore: 949 → 210 |

La tavola: `_immagini/pulizia/globale.jpg` (prima/dopo: il porto, il pontile, il sentiero, i vasi, la porta, la quota).

## Da fare

- a_sospeso: antenne di buildModular sul colmo (17) e torrette dei tetti (tetti3Gruppi, 9: il raggio non trova il lastrico sotto, da verificare).
- f_passaggio: bitte di buildQuayWalls sui moli stretti (17), arredo di buildWinter (10).
- g_quota: le terrazze del suolo da 1-3 m senza muro (nel generatore del suolo). g_colore: la misura va resa stabile prima di correggere.
- d_staccato rimasti: banchi del mercato (banco3, 3: la mantovana), i cantieri fermi (3), buildCosta2 (4), le navi (2).
