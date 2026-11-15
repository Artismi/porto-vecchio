# VITA1 — chi è in macchina, chi guida (fasi F0-F3 di AUDIT_VITA)

Ramo `vita1` da `claude/shader-styling-performance-wbvqfy`. Tavola: `_immagini/vita/vita1.jpg`.

## Cosa è cambiato

**F0 · la sonda senza browser.** `strumenti/sonda_vita.js` (e `node src/test_vita.js sonde [secondi] [seme]`, che esce con 1 se un
conto della vita in macchina non torna). Carica la logica come il gioco, fa girare `G.step` a 0,05 s per 600 s di gioco a 8:30,
13, 19 e 22:30 (una partita per processo: `G.create` si fa una volta sola per processo) e conta ogni 0,2 s: `inVeh && !inside`,
`car && !inside` (a meno di 1,2 m dal centro del mezzo), `n.dove` che non torna col mezzo, coppie ferme a meno di 0,4 m, angoli
dell'autobus fuori da `T.VIA` (e su acqua o edificio), deriva laterale del traffico oltre 8°, inversioni sul posto, cani fuori dalle
assi, autisti col pupazzo a scatole, mezzi degli abitanti senza autista. Ogni 15 s due abitanti vicini prendono il loro mezzo per
un posto lontano (il piano `guida`): da soli, in dieci minuti, quasi nessuno lo fa, e la vita in macchina non si misurerebbe.
`PV_SONDA_PROVOCA=1` aggiunge, ogni 4 s, a chi è in un mezzo quello che fanno gli altri moduli: l'azione che torna `routine`
(decidono popolo, convivenza, ordine...) o la scrittura nuda `n.inside = false`.

**F1 · pulizia.** Via `_backup_mente/`, `pushOutOfVehiclesOld`, `cityTraffic`/`ctr*` e `trafficHour` (il traffico della città
nuova è solo di vievive); `test_mente.mjs` in `strumenti/`; `scansano` legge `seated(n)`. `test_citta_viva` ora carica Chiarezza e
Vievive come il gioco (prima il suo traffico era quello di `cityTraffic`).

**F2 · C2, dove sta una persona** (`game.js`). `n.dove ∈ {fuori, casa, mezzo, scena_fuori}`, `n.dentro = {id}`; `n.inside` è un
getter (`dove !== 'fuori'`) con un setter di compatibilità; si scrive con `G.entra(n, dove, id)` e `G.esci(n, punto)`.
`G.esci` da un mezzo: la portiera del suo lato (sinistra per chi guida, `{lato: 1}` per chi siede accanto), un punto libero
(`walkM`, fuori da ogni mezzo, nessuno a 45 cm), poi una spirale fino a 8 m e fino a 20 m; mai il centro dell'auto. Il setter:
`n.inside = false` su chi è a bordo passa da `G.esci` (e avvisa una volta in console); se un modulo l'ha già portato a più di 3 m
dal mezzo, scende lì. Chi è a bordo va col mezzo a ogni passo; il mezzo sparito lo lascia dove era. Corretti a mano: azioni
(`leaveVehicle`, `enterVehicle`, il ritorno «dalla porta», `driveStep` che rimette a bordo chi guida), popolo (`nearMove` non fa
uscire dalla porta chi è in un mezzo, `wakeNear` non mette «fuori» chi guida, `snapFar`), convivenza, parola (la pedina), ordine
(equipaggi delle volanti: salire, scendere a sinistra e a destra, coda, fermo, fine servizio), scontri (le guardie del
portavalori), eventi; `render.js` disegna solo chi è `fuori`.

**F3 · l'autista.** `render.js` `sedutoMesh`: il pupazzo dritto (alto 0,88 m sopra il punto del sedile, che nei modelli di
veicoli3d è la linea di cintura) diventa una figura seduta fatta sull'abitacolo: bacino giù quanto serve, busto allo schienale,
cosce in avanti, braccia al volante (o mani sulle ginocchia accanto), la cima (capelli o berretto) 4 cm sotto il cielo:
`porta.yw` nei veicoli3d, `u.tetto` nel carMesh e nei GLB (`models.js`), il sedile + 0,5 m se non si sa. Pochi pezzi, geometrie e
materiali in comune. È il ripiego per tutti i mezzi quando la figura vera non c'è (`G.AUTISTA.veroR` = 45 m dalla messa a fuoco,
budget, personaggi non pronti). Al volante ora c'è anche l'abitante che guida il suo mezzo (`rider 'npc:<id>'`, coi suoi
vestiti: prima l'auto andava da sola), l'equipaggio a bordo e l'autobus; accanto il secondo dell'equipaggio. La figura vera
conosce la propria cima (`altoDi`, cappelli compresi) e `in_auto` la usa; il bacino scende subito, senza la sfumata della posa.
`animazioni.js`: una posa che lancia un errore non si spegne più per sempre, si salta il fotogramma e si avvisa una volta.

## I numeri

Sonda F0, seme 1, 600 s di gioco a ognuna delle quattro ore (somme): vedi la tavola e i JSON in `_immagini/vita/`.

| conto | prima | dopo F2 | dopo F3 |
|---|---|---|---|
| `inVeh && !inside` (campioni) | 82 | 0 | 0 |
| `car && !inside` | 0 | 0 | 0 |
| `n.dove` che non torna | — | 0 | 0 |
| autisti col pupazzo a scatole (campioni) | 175 905 / 214 126 | — | 0 / 239 696 |
| mezzi di un abitante senza autista | 2 432 | 126 | 0 |
| coppie ferme a < 0,4 m (campioni / coppie) | 12 944 / 62 | 76 / 42 | 313 / 44 |
| autobus: un angolo fuori da `T.VIA` / su acqua o edificio | 55 % / 8,4 % | 55 % / 8 % | 55 % / 8 % |
| traffico: deriva > 8° | 12,1 % | 12,1 % | 12,2 % |
| traffico: inversioni sul posto | 1 580 | 1 535 | 1 500 |
| cani fuori dalle assi | 0 % (nessun cane entro 200 m) | 0 % | 0 % |

Provocata (300 s per ora, `PV_SONDA_PROVOCA=1`): `inVeh && !inside` 717 → 0, `car && !inside` 3 841 → 21 (dopo F3; vedi i rischi).

Le coppie ferme, l'autobus, il traffico e i cani sono le fasi F4-F10: qui servono da riferimento. Le coppie cambiano molto fra un
giro e l'altro (la simulazione diverge appena cambia qualcosa: 22:30 da sola ne faceva 11 100 prima), non è un risultato di F2.

Le foto (`strumenti/autisti_foto.js`, venti mezzi: tutti i quattordici modelli a quattro ruote più sei dei più comuni, a turno
traffico, abitante col suo mezzo e volante con l'agente accanto; la camera dal lato del guidatore a 10 e 45 m, a 80 m dalla vista
libera più vicina; la sonda prende la cima della figura dai vertici della pelle animata e la confronta con `porta.yw` + 5 cm nei
veicoli3d e col tetto vero, un raggio dall'alto sul sedile, negli altri):

| | prima | dopo |
|---|---|---|
| figure (al volante o accanto) con la cima sopra il tetto | 44 in 39 foto misurate | 0 in 60 |
| foto senza nessuno al volante (rider `npc:<id>`) | 21 | 0 |
| margine minimo (tetto − cima) | −0,53 m (il pupazzo) | +0,094 m |
| la figura vera a 10 m | −0,15 m nella 126 (il berretto) | almeno +0,11 m (l’autobus +1,06) |

A 80 m il gioco disegna il mezzo col suo modello lontano (vetri pieni): la figura non si vede comunque, la sonda la misura lo stesso.
I JSON sono in `_immagini/vita/vita1_*.json`.

## Le prove

`test_vievive`, `test_azioni`, `test_ordine`, `test_scontri`, `test_eventi`, `test_posti`, `test_seduti`, `test_guida2`,
`test_commedia`, `test_parola`: verdi (giro finale su F3). `test_citta_viva`: le stesse due righe rosse di prima (il posto
«mercato» vuoto e nessuna scena al mercato), già rosse sul ramo di partenza. `test_scontri` (Math.random senza seme) e
`test_eventi` cadono a caso già sul ramo di partenza: su tre semi, prima scontri 1/4/0 righe rosse ed eventi 0/0/0; dopo scontri
3/0/0 ed eventi 2/0/0 (seme 1: due scene «finite in 0 s, b: entrato», lo stesso guasto che il ramo di partenza mostra con altri
semi; la simulazione diverge da F1, che toglie il traffico di `cityTraffic` dalle prove senza vievive). `test_popolo` non esiste: la giornata del popolo la provano
`test_citta_viva`, `test_azioni` e `test_vita`. Fumo (`fumo6.js`): `errori []`; le sonde delle foto sulla build finale (80 m e GLB) non hanno errori in pagina.

## Rischi

- Il setter di `inside` è su ogni NPC (`Object.defineProperty`, installato in `makeNpc` e a ogni passo per chi nasce altrove):
  un modulo che copia un NPC con `Object.assign` ottiene il valore, non il getter (va bene); chi scrive `n.dove` a mano salta il
  contratto. Un avviso `[vita1] n.inside = false su chi è in un mezzo` in console vuol dire una scrittura vecchia ancora da passare
  da `G.esci` (il setter la corregge).
- `car && !inside` provocata: restano 21 campioni in 20 minuti (equipaggi delle volanti che tornano verso l'auto e passano a meno
  di 1,2 m dal centro); nel gioco normale 0.
- `index.html`, `editor.html` e `mondo_cotto.js` sono rifatti a ogni commit (game.js, popolo.js, ordine.js... sono nelle fonti del
  mondo cotto e nell'impronta dei tasselli): all'unione vanno rifatti con `python3 build.py`.
- `render.js`: toccati solo il blocco di chi guida (vehicleMesh, carDriver, sedutoMesh, il ciclo dei mezzi) e la riga che decide
  chi si disegna nel ciclo della gente; `models.js` solo `tetto` dei GLB.
