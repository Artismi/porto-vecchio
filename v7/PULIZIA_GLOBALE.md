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

## Da fare

- rifare il conto (prima/dopo), poi le categorie rimaste in ordine di casi: vasi (b_muro, a_sospeso, f_porta), f_carreggiata,
  g_colore/g_quota, h_ruotato.
- la tavola `_immagini/pulizia/globale.jpg` (porto con barche e corde + 3-5 punti).
- impronta nuova dei tasselli; l'APK (android/, versionCode +1, stessa firma).
